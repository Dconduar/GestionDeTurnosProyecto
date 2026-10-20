const express = require('express');
const db = require('../db');

const router = express.Router();

function horarioDeHoy() {
  return db
    .prepare(
      `SELECT hora_inicio, hora_fin
         FROM horarios_atencion
        WHERE activo = 1
          AND dia_semana = CAST(strftime('%w', 'now', 'localtime') AS INTEGER)
        ORDER BY hora_inicio`
    )
    .all();
}

function atencionAbierta() {
  if (process.env.IGNORAR_HORARIO === '1') return true;
  const { ahora } = db.prepare("SELECT strftime('%H:%M', 'now', 'localtime') AS ahora").get();
  return horarioDeHoy().some((h) => h.hora_inicio <= ahora && ahora < h.hora_fin);
}

function codigoTurno(prefijo, numero) {
  return `${prefijo}-${String(numero).padStart(3, '0')}`;
}

const SQL_TURNO = `
  SELECT t.*,
         s.nombre  AS servicio_nombre,
         s.prefijo AS servicio_prefijo,
         m.nombre  AS mostrador_nombre,
         (t.fecha = date('now', 'localtime')) AS es_de_hoy
    FROM turnos t
    JOIN tipos_servicio s ON s.id = t.tipo_servicio_id
    LEFT JOIN mostradores m ON m.id = t.mostrador_id`;

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

const crearTurno = db.transaction((tipoServicioId) => {
  const { hoy, siguiente } = db
    .prepare(
      `SELECT date('now', 'localtime') AS hoy,
              COALESCE(MAX(numero), 0) + 1 AS siguiente
         FROM turnos
        WHERE fecha = date('now', 'localtime')`
    )
    .get();
  const info = db
    .prepare('INSERT INTO turnos (fecha, numero, tipo_servicio_id) VALUES (?, ?, ?)')
    .run(hoy, siguiente, tipoServicioId);
  return info.lastInsertRowid;
});

router.get('/servicios', (req, res) => {
  const servicios = db
    .prepare('SELECT id, nombre, prefijo, descripcion FROM tipos_servicio WHERE activo = 1 ORDER BY id')
    .all();
  res.json({
    abierto: atencionAbierta(),
    horario_hoy: horarioDeHoy().map((h) => ({ inicio: h.hora_inicio, fin: h.hora_fin })),
    servicios,
  });
});

router.post('/', (req, res) => {
  const tipoServicioId = Number(req.body && req.body.tipo_servicio_id);
  if (!Number.isInteger(tipoServicioId) || tipoServicioId <= 0) {
    return res.status(400).json({ error: 'Elige un tipo de servicio.', codigo: 'SERVICIO_INVALIDO' });
  }

  if (!atencionAbierta()) {
    return res.status(409).json({
      error: 'La atención está cerrada en este momento.',
      codigo: 'FUERA_DE_HORARIO',
      horario_hoy: horarioDeHoy().map((h) => ({ inicio: h.hora_inicio, fin: h.hora_fin })),
    });
  }

  const servicio = db
    .prepare('SELECT id FROM tipos_servicio WHERE id = ? AND activo = 1')
    .get(tipoServicioId);
  if (!servicio) {
    return res.status(400).json({
      error: 'Ese servicio no está disponible. Elige otro.',
      codigo: 'SERVICIO_INVALIDO',
    });
  }

  const id = crearTurno.immediate(tipoServicioId);
  const turno = db.prepare(`${SQL_TURNO} WHERE t.id = ?`).get(id);
  res.status(201).json(turnoPublico(turno));
});

router.get('/:id(\\d+)', (req, res) => {
  const turno = db.prepare(`${SQL_TURNO} WHERE t.id = ?`).get(Number(req.params.id));
  if (!turno) {
    return res.status(404).json({ error: 'No se encontró el turno.', codigo: 'TURNO_NO_ENCONTRADO' });
  }
  res.json(turnoPublico(turno));
});

module.exports = router;