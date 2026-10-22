const db = require('./db');
const { calcularEsperaEstimada } = require('./estimacion');

const RANGO_PRIORIDAD = "CASE %T.prioridad WHEN 'preferencial' THEN 0 ELSE 1 END";

function codigoTurno(prefijo, numero) {
  return `${prefijo}-${String(numero).padStart(3, '0')}`;
}

const SQL_ATENDIENDO = `
  SELECT t.numero, s.prefijo, s.nombre AS servicio, m.nombre AS mostrador
    FROM turnos t
    JOIN tipos_servicio s ON s.id = t.tipo_servicio_id
    LEFT JOIN mostradores m ON m.id = t.mostrador_id
   WHERE t.fecha = @hoy AND t.estado = 'en_atencion'
   ORDER BY t.numero`;

const SQL_ESPERANDO_POR_SERVICIO = `
  SELECT s.id, s.nombre, s.prefijo, COUNT(*) AS esperando
    FROM turnos t
    JOIN tipos_servicio s ON s.id = t.tipo_servicio_id
   WHERE t.fecha = @hoy AND t.estado = 'esperando'
   GROUP BY s.id
   ORDER BY s.id`;

const SQL_MI_TURNO = `
  SELECT t.*, s.nombre AS servicio_nombre, s.prefijo AS servicio_prefijo,
         m.nombre AS mostrador_nombre
    FROM turnos t
    JOIN tipos_servicio s ON s.id = t.tipo_servicio_id
    LEFT JOIN mostradores m ON m.id = t.mostrador_id
   WHERE t.id = @id AND t.fecha = @hoy`;

const SQL_DELANTE = `
  SELECT t2.id
    FROM turnos t2
    JOIN tipos_servicio s2 ON s2.id = t2.tipo_servicio_id
   WHERE t2.fecha = @hoy
     AND t2.estado = 'esperando'
     AND t2.id <> @id
     AND ( ${RANGO_PRIORIDAD.replace('%T', 't2')} < @rango
        OR ( ${RANGO_PRIORIDAD.replace('%T', 't2')} = @rango AND t2.numero < @numero ) )
     AND ( t2.tipo_servicio_id = @servicio
        OR EXISTS (
             SELECT 1
               FROM mostrador_servicio a
               JOIN mostrador_servicio b ON b.mostrador_id = a.mostrador_id
              WHERE a.tipo_servicio_id = t2.tipo_servicio_id
                AND b.tipo_servicio_id = @servicio ) )`;

function miTurno(id, hoy) {
  const t = db.prepare(SQL_MI_TURNO).get({ id, hoy });
  if (!t) return null;

  let delante = null;
  let espera = null;
  if (t.estado === 'esperando') {
    const rango = t.prioridad === 'preferencial' ? 0 : 1;
    const anteriores = db
      .prepare(SQL_DELANTE)
      .all({ hoy, id: t.id, rango, numero: t.numero, servicio: t.tipo_servicio_id });
    delante = anteriores.length;
    // Estimación de GES-28 (RF-1): simula mostradores y respeta la prioridad.
    espera = calcularEsperaEstimada(t.id);
  }

  return {
    id: t.id,
    codigo: codigoTurno(t.servicio_prefijo, t.numero),
    estado: t.estado,
    prioridad: t.prioridad,
    servicio: { id: t.tipo_servicio_id, nombre: t.servicio_nombre, prefijo: t.servicio_prefijo },
    mostrador: t.mostrador_nombre || null,
    delante,
    espera_estimada_seg: espera,
  };
}

function estadoDeLaFila(turnoId) {
  const { hoy } = db.prepare("SELECT date('now', 'localtime') AS hoy").get();

  const atendiendo = db.prepare(SQL_ATENDIENDO).all({ hoy }).map((f) => ({
    codigo: codigoTurno(f.prefijo, f.numero),
    servicio: f.servicio,
    mostrador: f.mostrador || null,
  }));

  const porServicio = db.prepare(SQL_ESPERANDO_POR_SERVICIO).all({ hoy });

  return {
    en_atencion: atendiendo,
    esperando_total: porServicio.reduce((suma, s) => suma + s.esperando, 0),
    por_servicio: porServicio,
    mi_turno: turnoId ? miTurno(turnoId, hoy) : null,
  };
}

module.exports = { estadoDeLaFila };