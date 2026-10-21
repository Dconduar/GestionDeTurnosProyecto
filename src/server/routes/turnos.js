const express = require('express');
const crypto = require('crypto');
const db = require('../db');
const { calcularEsperaEstimada } = require('../estimacion');
const { horarioDeHoy, atencionAbierta } = require('../horario');

const router = express.Router();

function codigoTurno(prefijo, numero) {
  return `${prefijo}-${String(numero).padStart(3, '0')}`;
}

const SQL_TURNO = `
  SELECT t.*,
         s.nombre AS servicio_nombre,
         s.prefijo AS servicio_prefijo,
         m.nombre AS mostrador_nombre,
         (t.fecha = date('now', 'localtime')) AS es_de_hoy
    FROM turnos t
    JOIN tipos_servicio s ON s.id = t.tipo_servicio_id
    LEFT JOIN mostradores m ON m.id = t.mostrador_id
`;

function turnoPublico(fila) {
  return {
    id: fila.id,
    codigo: codigoTurno(fila.servicio_prefijo, fila.numero),
    numero: fila.numero,
    fecha: fila.fecha,
    es_de_hoy: Boolean(fila.es_de_hoy),
    estado: fila.estado,
    prioridad: fila.prioridad,
    servicio: {
      id: fila.tipo_servicio_id,
      nombre: fila.servicio_nombre,
      prefijo: fila.servicio_prefijo,
    },
    mostrador: fila.mostrador_nombre || null,
    registrado_en: fila.registrado_en,
    espera_estimada_seg: fila.espera_estimada_seg,
  };
}

// Generar un token privado de cancelación
function generarTokenCancelacion() {
  return crypto.randomBytes(32).toString('hex');
}

// Guardar y verificar únicamente el hash del token
function hashTokenCancelacion(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// Crear turno conservando la numeración original
const crearTurno = db.transaction((tipoServicioId, tokenHash) => {
  const { hoy, siguiente } = db
    .prepare(`
      SELECT date('now', 'localtime') AS hoy,
             COALESCE(MAX(numero), 0) + 1 AS siguiente
        FROM turnos
       WHERE fecha = date('now', 'localtime')
    `)
    .get();

  const info = db
    .prepare(`
      INSERT INTO turnos (
        fecha,
        numero,
        tipo_servicio_id,
        token_cancelacion_hash
      )
      VALUES (?, ?, ?, ?)
    `)
    .run(hoy, siguiente, tipoServicioId, tokenHash);

  // Calcular la espera del turno recién creado.
  const esperaEstimada = calcularEsperaEstimada(
    Number(info.lastInsertRowid)
  );

  // Guardar la estimación en la base de datos.
  db.prepare(`
    UPDATE turnos
    SET espera_estimada_seg = ?
    WHERE id = ?
  `).run(esperaEstimada, info.lastInsertRowid);

  return info.lastInsertRowid;
});

// Obtener servicios disponibles
router.get('/servicios', (req, res) => {
  const servicios = db
    .prepare(`
      SELECT id, nombre, prefijo, descripcion
        FROM tipos_servicio
       WHERE activo = 1
       ORDER BY id
    `)
    .all();

  res.json({
    abierto: atencionAbierta(),
    horario_hoy: horarioDeHoy().map((h) => ({
      inicio: h.hora_inicio,
      fin: h.hora_fin,
    })),
    servicios,
  });
});

// Crear un nuevo turno
router.post('/', (req, res) => {
  const tipoServicioId = Number(
    req.body && req.body.tipo_servicio_id
  );

  if (!Number.isInteger(tipoServicioId) || tipoServicioId <= 0) {
    return res.status(400).json({
      error: 'Elige un tipo de servicio.',
      codigo: 'SERVICIO_INVALIDO',
    });
  }

  if (!atencionAbierta()) {
    return res.status(409).json({
      error: 'La atención está cerrada en este momento.',
      codigo: 'FUERA_DE_HORARIO',
      horario_hoy: horarioDeHoy().map((h) => ({
        inicio: h.hora_inicio,
        fin: h.hora_fin,
      })),
    });
  }

  const servicio = db
    .prepare(`
      SELECT id
        FROM tipos_servicio
       WHERE id = ?
         AND activo = 1
    `)
    .get(tipoServicioId);

  if (!servicio) {
    return res.status(400).json({
      error: 'Ese servicio no está disponible. Elige otro.',
      codigo: 'SERVICIO_INVALIDO',
    });
  }

  // Crear token privado para este turno
  const tokenCancelacion = generarTokenCancelacion();
  const tokenHash = hashTokenCancelacion(tokenCancelacion);

  // Guardar el turno junto con el hash
  const id = crearTurno.immediate(tipoServicioId, tokenHash);

  const turno = db
    .prepare(`${SQL_TURNO} WHERE t.id = ?`)
    .get(id);

  // Entregar el token solo al crear el turno
  res.status(201).json({
    ...turnoPublico(turno),
    token_cancelacion: tokenCancelacion,
  });
});

// Consultar un turno por su ID
router.get('/:id(\\d+)', (req, res) => {
  const id = Number(req.params.id);

  const turno = db
    .prepare(`${SQL_TURNO} WHERE t.id = ?`)
    .get(id);

  if (!turno) {
    return res.status(404).json({
      error: 'No se encontró el turno.',
      codigo: 'TURNO_NO_ENCONTRADO',
    });
  }

  res.json(turnoPublico(turno));
});

// Cancelar un turno con autorización
router.patch('/:id(\\d+)/cancelar', (req, res) => {
  const id = Number(req.params.id);
  const token = req.body && req.body.token_cancelacion;

  // Comprobar que se envió un token válido
  if (
    typeof token !== 'string' ||
    !/^[a-f0-9]{64}$/.test(token)
  ) {
    return res.status(403).json({
      error: 'No tienes autorización para cancelar este turno.',
      codigo: 'TOKEN_CANCELACION_INVALIDO',
    });
  }

  const tokenHash = hashTokenCancelacion(token);

  // Actualización condicional y atómica:
  // solo cancela si coinciden ID, token, fecha y estado
  const resultado = db
    .prepare(`
      UPDATE turnos
         SET estado = 'cancelado'
       WHERE id = ?
         AND token_cancelacion_hash = ?
         AND fecha = date('now', 'localtime')
         AND estado = 'esperando'
    `)
    .run(id, tokenHash);

  if (resultado.changes === 0) {
    const turno = db
      .prepare(`
        SELECT estado, fecha, token_cancelacion_hash
          FROM turnos
         WHERE id = ?
      `)
      .get(id);

    if (!turno) {
      return res.status(404).json({
        error: 'No se encontró el turno.',
        codigo: 'TURNO_NO_ENCONTRADO',
      });
    }

    // Verificar si el token pertenece a este turno
    if (
      !turno.token_cancelacion_hash ||
      turno.token_cancelacion_hash !== tokenHash
    ) {
      return res.status(403).json({
        error: 'No tienes autorización para cancelar este turno.',
        codigo: 'TOKEN_CANCELACION_INVALIDO',
      });
    }

    return res.status(409).json({
      error:
        'Este turno no se puede cancelar porque ya no está esperando o no corresponde a hoy.',
      codigo: 'CANCELACION_NO_PERMITIDA',
    });
  }

  const turnoActualizado = db
    .prepare(`${SQL_TURNO} WHERE t.id = ?`)
    .get(id);

  return res.json({
    mensaje: 'Tu turno fue cancelado correctamente.',
    turno: turnoPublico(turnoActualizado),
  });
});

module.exports = router;
