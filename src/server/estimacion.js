'use strict';

const db = require('./db');

// Leer un parámetro configurable de la base de datos.
function leerConfiguracion(clave, valorPorDefecto) {
  const fila = db.prepare(
    'SELECT valor FROM configuracion WHERE clave = ?'
  ).get(clave);

  const valor = fila ? Number(fila.valor) : NaN;

  if (!Number.isSafeInteger(valor) || valor <= 0) {
    return valorPorDefecto;
  }

  return valor;
}

// Calcular la duración de un servicio en segundos.
function calcularDuracionServicio(tipoServicioId) {
  const servicio = db.prepare(`
    SELECT id, duracion_estimada_min
    FROM tipos_servicio
    WHERE id = ?
  `).get(tipoServicioId);

  if (!servicio) {
    throw new Error('El tipo de servicio no existe.');
  }

  const muestrasMinimas = leerConfiguracion(
    'estimacion_muestras_min', 5
  );

  const ventanaDias = leerConfiguracion(
    'estimacion_ventana_dias', 7
  );

  const estadisticas = db.prepare(`
    SELECT
      COUNT(*) AS cantidad,
      AVG(duracion_seg) AS promedio
    FROM turnos
    WHERE tipo_servicio_id = ?
      AND estado = 'atendido'
      AND duracion_seg IS NOT NULL
      AND duracion_seg > 0
      AND fin_atencion >= datetime(
        'now', 'localtime', ? || ' days'
      )
      AND fin_atencion <= datetime('now', 'localtime')
  `).get(tipoServicioId, `-${ventanaDias}`);

  if (
    estadisticas.cantidad >= muestrasMinimas &&
    estadisticas.promedio > 0
  ) {
    return Math.ceil(estadisticas.promedio);
  }

  return servicio.duracion_estimada_min * 60;
}


function calcularEsperaEstimada(turnoId) {
  const turno = db.prepare(`
    SELECT id, tipo_servicio_id
    FROM turnos
    WHERE id = ?
      AND estado = 'esperando'
      AND fecha = date('now', 'localtime')
  `).get(turnoId);

  if (!turno) {
    throw new Error('El turno no existe o no está esperando.');
  }

  const mostradores = db.prepare(`
    SELECT id
    FROM mostradores
    WHERE activo = 1
    ORDER BY id
  `).all();

  const compatibilidades = db.prepare(`
    SELECT mostrador_id, tipo_servicio_id
    FROM mostrador_servicio
  `).all();

  const disponibles = mostradores.map((mostrador) => ({
    id: mostrador.id,
    libreEn: 0,
    servicios: compatibilidades
      .filter((relacion) => relacion.mostrador_id === mostrador.id)
      .map((relacion) => relacion.tipo_servicio_id),
  }));

  const duraciones = new Map();

  function duracion(tipoServicioId) {
    if (!duraciones.has(tipoServicioId)) {
      duraciones.set(
        tipoServicioId,
        calcularDuracionServicio(tipoServicioId)
      );
    }

    return duraciones.get(tipoServicioId);
  }

  const ocupados = db.prepare(`
    SELECT mostrador_id, tipo_servicio_id, inicio_atencion
    FROM turnos
    WHERE estado = 'en_atencion'
      AND fecha = date('now', 'localtime')
  `).all();

  const ahora = db.prepare(`SELECT CAST(strftime('%s', 'now') AS INTEGER) AS segundos`).get().segundos;

  for (const ocupado of ocupados) {
    const mostrador = disponibles.find(
      (m) => m.id === ocupado.mostrador_id
    );

    if (!mostrador) continue;

    const inicio = db.prepare(`SELECT CAST(strftime('%s', ?, 'utc') AS INTEGER) AS segundos`).get(ocupado.inicio_atencion);

    const transcurrido = inicio.segundos === null
      ? 0
      : Math.max(0, ahora - inicio.segundos);

    mostrador.libreEn = Math.max(
      mostrador.libreEn,
      Math.max(0, duracion(ocupado.tipo_servicio_id) - transcurrido)
    );
  }

  const pendientes = db.prepare(`
    SELECT id, tipo_servicio_id, prioridad, numero
    FROM turnos
    WHERE fecha = date('now', 'localtime')
      AND estado = 'esperando'
    ORDER BY (prioridad = 'preferencial') DESC, numero ASC
  `).all();

  while (pendientes.length > 0) {
    let mejor = null;

    for (const mostrador of disponibles) {
      const indice = pendientes.findIndex(
        (pendiente) =>
          mostrador.servicios.includes(pendiente.tipo_servicio_id)
      );

      if (indice === -1) continue;

      if (
        !mejor ||
        mostrador.libreEn < mejor.mostrador.libreEn ||
        (
          mostrador.libreEn === mejor.mostrador.libreEn &&
          mostrador.id < mejor.mostrador.id
        )
      ) {
        mejor = { mostrador, indice };
      }
    }

    if (!mejor) break;

    const pendiente = pendientes.splice(mejor.indice, 1)[0];
    const inicioEstimado = mejor.mostrador.libreEn;

    if (pendiente.id === turnoId) {
      return Math.ceil(inicioEstimado);
    }

    mejor.mostrador.libreEn += duracion(
      pendiente.tipo_servicio_id
    );
  }

  // No hay mostradores activos compatibles.
  return null;
}

module.exports = {
  leerConfiguracion,
  calcularDuracionServicio,
  calcularEsperaEstimada,
};
