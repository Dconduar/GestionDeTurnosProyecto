const express = require('express');
const db = require('../db');
const { atencionAbierta, horarioPublico } = require('../horario');
const { requiereRol } = require('../auth');

const router = express.Router();

router.use(requiereRol('recepcionista', 'administrador'));

const MOSTRADOR_POR_DEFECTO = 1;
const MAX_LLAMADOS_POR_DEFECTO = 3;

function maxLlamados() {
  const fila = db.prepare("SELECT valor FROM configuracion WHERE clave = 'max_llamados'").get();
  const valor = fila ? Number.parseInt(fila.valor, 10) : NaN;
  return Number.isInteger(valor) && valor > 0 ? valor : MAX_LLAMADOS_POR_DEFECTO;
}

const SQL_TURNO = `
  SELECT t.id,
         t.numero,
         t.estado,
         t.prioridad,
         t.mostrador_id,
         t.registrado_en,
         t.inicio_atencion,
         t.fin_atencion,
         t.duracion_seg,
         s.id      AS servicio_id,
         s.nombre  AS servicio_nombre,
         s.prefijo AS servicio_prefijo,
         m.nombre  AS mostrador_nombre,
         (SELECT COUNT(*) FROM llamados l WHERE l.turno_id = t.id) AS llamados,
         CAST((julianday('now', 'localtime') - julianday(t.registrado_en)) * 86400 AS INTEGER) AS espera_seg
    FROM turnos t
    JOIN tipos_servicio s ON s.id = t.tipo_servicio_id
    LEFT JOIN mostradores m ON m.id = t.mostrador_id`;

function turnoRecepcion(fila, maximo) {
  return {
    id: fila.id,
    codigo: `${fila.servicio_prefijo}-${String(fila.numero).padStart(3, '0')}`,
    numero: fila.numero,
    estado: fila.estado,
    prioridad: fila.prioridad,
    servicio: { id: fila.servicio_id, nombre: fila.servicio_nombre, prefijo: fila.servicio_prefijo },
    mostrador: fila.mostrador_nombre || null,
    mostrador_id: fila.mostrador_id,
    llamados: fila.llamados,
    max_llamados: maximo,
    puede_marcar_no_asistio: fila.estado === 'en_atencion' && fila.llamados >= maximo,
    registrado_en: fila.registrado_en,
    inicio_atencion: fila.inicio_atencion,
    fin_atencion: fila.fin_atencion,
    duracion_seg: fila.duracion_seg,
    espera_seg: Math.max(0, fila.espera_seg || 0),
  };
}

function leerMostrador(valor) {
  const id = valor === undefined || valor === null || valor === '' ? MOSTRADOR_POR_DEFECTO : Number(valor);
  if (!Number.isInteger(id) || id <= 0) return null;
  return db.prepare('SELECT id, nombre FROM mostradores WHERE id = ? AND activo = 1').get(id) || null;
}

function mostradorSolicitado(req, valor) {
  const usuario = req.session && req.session.usuario;
  if (usuario && usuario.rol === 'recepcionista' && usuario.mostrador_id) return usuario.mostrador_id;
  return valor;
}

function mostradorOError(valor, res) {
  const mostrador = leerMostrador(valor);
  if (!mostrador) {
    res.status(400).json({ error: 'Ese mostrador no existe o no está activo.', codigo: 'MOSTRADOR_INVALIDO' });
    return null;
  }
  return mostrador;
}

function cerradoError(res) {
  res.status(409).json({
    error: 'La atención está cerrada en este momento.',
    codigo: 'FUERA_DE_HORARIO',
    horario_hoy: horarioPublico(),
  });
}

function turnoPorId(id) {
  return db.prepare(`${SQL_TURNO} WHERE t.id = ?`).get(id);
}

const llamarSiguiente = db.transaction((mostradorId, usuarioId) => {
  const enAtencion = db
    .prepare("SELECT id FROM turnos WHERE mostrador_id = ? AND estado = 'en_atencion' LIMIT 1")
    .get(mostradorId);
  if (enAtencion) return { error: 'YA_HAY_TURNO_EN_ATENCION' };

  const siguiente = db
    .prepare(
      `SELECT t.id
         FROM turnos t
        WHERE t.fecha = date('now', 'localtime')
          AND t.estado = 'esperando'
          AND t.tipo_servicio_id IN (
                SELECT tipo_servicio_id FROM mostrador_servicio WHERE mostrador_id = ?
              )
        ORDER BY (t.prioridad = 'preferencial') DESC, t.numero ASC
        LIMIT 1`
    )
    .get(mostradorId);
  if (!siguiente) return { error: 'FILA_VACIA' };

  db.prepare(
    `UPDATE turnos
        SET estado = 'en_atencion',
            mostrador_id = ?,
            atendido_por = ?,
            inicio_atencion = datetime('now', 'localtime')
      WHERE id = ?`
  ).run(mostradorId, usuarioId, siguiente.id);
  db.prepare('INSERT INTO llamados (turno_id, mostrador_id, usuario_id) VALUES (?, ?, ?)').run(
    siguiente.id,
    mostradorId,
    usuarioId
  );
  return { id: siguiente.id };
});

const volverALlamar = db.transaction((turnoId, mostradorId, usuarioId) => {
  const turno = db.prepare('SELECT id, estado, mostrador_id FROM turnos WHERE id = ?').get(turnoId);
  if (!turno) return { error: 'TURNO_NO_ENCONTRADO' };
  if (turno.estado !== 'en_atencion' || turno.mostrador_id !== mostradorId) {
    return { error: 'TURNO_NO_LLAMABLE' };
  }
  const { total } = db.prepare('SELECT COUNT(*) AS total FROM llamados WHERE turno_id = ?').get(turnoId);
  if (total >= maxLlamados()) return { error: 'MAXIMO_LLAMADOS' };
  db.prepare('INSERT INTO llamados (turno_id, mostrador_id, usuario_id) VALUES (?, ?, ?)').run(
    turnoId,
    mostradorId,
    usuarioId
  );
  return { id: turnoId };
});

const marcarNoAsistio = db.transaction((turnoId, mostradorId) => {
  const turno = db.prepare('SELECT id, estado, mostrador_id FROM turnos WHERE id = ?').get(turnoId);
  if (!turno) return { error: 'TURNO_NO_ENCONTRADO' };
  if (turno.estado !== 'en_atencion' || turno.mostrador_id !== mostradorId) {
    return { error: 'TURNO_NO_LLAMABLE' };
  }
  const { total } = db.prepare('SELECT COUNT(*) AS total FROM llamados WHERE turno_id = ?').get(turnoId);
  if (total < maxLlamados()) return { error: 'LLAMADOS_INSUFICIENTES' };
  db.prepare("UPDATE turnos SET estado = 'no_asistio' WHERE id = ?").run(turnoId);
  return { id: turnoId };
});

const marcarAtendido = db.transaction((turnoId, mostradorId) => {
  const turno = db
    .prepare('SELECT id, estado, mostrador_id, inicio_atencion FROM turnos WHERE id = ?')
    .get(turnoId);
  if (!turno) return { error: 'TURNO_NO_ENCONTRADO' };
  if (turno.estado !== 'en_atencion' || turno.mostrador_id !== mostradorId) {
    return { error: 'TURNO_NO_LLAMABLE' };
  }
  const { fin, duracion } = db
    .prepare(
      `SELECT fin,
              CAST(strftime('%s', fin) AS INTEGER) - CAST(strftime('%s', ?) AS INTEGER) AS duracion
         FROM (SELECT datetime('now', 'localtime') AS fin)`
    )
    .get(turno.inicio_atencion);
  if (!Number.isInteger(duracion) || duracion < 0) return { error: 'INICIO_INVALIDO' };
  db.prepare(
    "UPDATE turnos SET estado = 'atendido', fin_atencion = ?, duracion_seg = ? WHERE id = ?"
  ).run(fin, duracion, turnoId);
  return { id: turnoId };
});

const ERRORES = {
  YA_HAY_TURNO_EN_ATENCION: [409, 'Ya tienes un turno en atención. Termínalo antes de llamar al siguiente.'],
  FILA_VACIA: [409, 'No hay turnos esperando para este mostrador.'],
  TURNO_NO_ENCONTRADO: [404, 'No se encontró el turno.'],
  TURNO_NO_LLAMABLE: [409, 'Ese turno no está en atención en este mostrador.'],
  MAXIMO_LLAMADOS: [409, 'Ya se hicieron todos los llamados permitidos. Marca el turno como "no asistió".'],
  LLAMADOS_INSUFICIENTES: [409, 'Aún no se completan los llamados necesarios para marcar "no asistió".'],
  INICIO_INVALIDO: [409, 'El turno no tiene una hora de inicio válida; no se puede calcular la duración.'],
};

function responderError(res, codigo) {
  const [estado, mensaje] = ERRORES[codigo];
  return res.status(estado).json({ error: mensaje, codigo });
}

router.get('/fila', (req, res) => {
  const mostrador = mostradorOError(mostradorSolicitado(req, req.query.mostrador_id), res);
  if (!mostrador) return;
  const maximo = maxLlamados();

  const mostradores = db.prepare('SELECT id, nombre FROM mostradores WHERE activo = 1 ORDER BY id').all();

  const enAtencion = db
    .prepare(`${SQL_TURNO} WHERE t.estado = 'en_atencion' ORDER BY t.inicio_atencion, t.numero`)
    .all()
    .map((fila) => turnoRecepcion(fila, maximo));

  const fila = db
    .prepare(
      `${SQL_TURNO}
        WHERE t.fecha = date('now', 'localtime')
          AND t.estado = 'esperando'
          AND t.tipo_servicio_id IN (
                SELECT tipo_servicio_id FROM mostrador_servicio WHERE mostrador_id = ?
              )
        ORDER BY (t.prioridad = 'preferencial') DESC, t.numero ASC`
    )
    .all(mostrador.id)
    .map((f) => turnoRecepcion(f, maximo));

  const { total: esperandoTotal } = db
    .prepare("SELECT COUNT(*) AS total FROM turnos WHERE fecha = date('now', 'localtime') AND estado = 'esperando'")
    .get();

  const abierto = atencionAbierta();
  const actual = enAtencion.find((t) => t.mostrador_id === mostrador.id) || null;

  res.json({
    abierto,
    horario_hoy: horarioPublico(),
    max_llamados: maximo,
    mostrador,
    mostradores,
    en_atencion: actual,
    otros_mostradores: enAtencion.filter((t) => t.mostrador_id !== mostrador.id),
    fila,
    esperando_total: esperandoTotal,
    puede_llamar: abierto && !actual && fila.length > 0,
  });
});

router.post('/llamar-siguiente', (req, res) => {
  const mostrador = mostradorOError(mostradorSolicitado(req, req.body && req.body.mostrador_id), res);
  if (!mostrador) return;
  if (!atencionAbierta()) return cerradoError(res);

  const resultado = llamarSiguiente.immediate(mostrador.id, null);
  if (resultado.error) return responderError(res, resultado.error);
  res.status(201).json(turnoRecepcion(turnoPorId(resultado.id), maxLlamados()));
});

router.post('/turnos/:id(\\d+)/llamar', (req, res) => {
  const mostrador = mostradorOError(mostradorSolicitado(req, req.body && req.body.mostrador_id), res);
  if (!mostrador) return;
  if (!atencionAbierta()) return cerradoError(res);

  const resultado = volverALlamar.immediate(Number(req.params.id), mostrador.id, null);
  if (resultado.error) return responderError(res, resultado.error);
  res.json(turnoRecepcion(turnoPorId(resultado.id), maxLlamados()));
});

router.patch('/turnos/:id(\\d+)/no-asistio', (req, res) => {
  const mostrador = mostradorOError(mostradorSolicitado(req, req.body && req.body.mostrador_id), res);
  if (!mostrador) return;

  const resultado = marcarNoAsistio.immediate(Number(req.params.id), mostrador.id);
  if (resultado.error) return responderError(res, resultado.error);
  res.json(turnoRecepcion(turnoPorId(resultado.id), maxLlamados()));
});

router.patch('/turnos/:id(\\d+)/atendido', (req, res) => {
  const mostrador = mostradorOError(mostradorSolicitado(req, req.body && req.body.mostrador_id), res);
  if (!mostrador) return;

  const resultado = marcarAtendido.immediate(Number(req.params.id), mostrador.id);
  if (resultado.error) return responderError(res, resultado.error);
  res.json(turnoRecepcion(turnoPorId(resultado.id), maxLlamados()));
});

module.exports = router;
