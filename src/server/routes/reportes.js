const express = require('express');
const db = require('../db');

const router = express.Router();

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

function fechaValida(valor) {
  if (!FECHA.test(valor)) return false;
  const fecha = new Date(`${valor}T00:00:00Z`);
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor;
}

function leerRango(query) {
  const desde = typeof query.desde === 'string' && query.desde !== '' ? query.desde : null;
  const hasta = typeof query.hasta === 'string' && query.hasta !== '' ? query.hasta : null;

  if ((desde && !fechaValida(desde)) || (hasta && !fechaValida(hasta))) {
    return { error: 'Las fechas deben tener el formato AAAA-MM-DD.' };
  }
  if (desde && hasta && desde > hasta) {
    return { error: 'La fecha inicial no puede ser posterior a la fecha final.' };
  }
  return { desde, hasta };
}

function consultarReportes(desde, hasta) {
  return db
    .prepare(`
      SELECT
        ts.id AS servicio_id,
        ts.nombre AS servicio,
        ts.prefijo AS prefijo,
        COUNT(t.id) AS total_turnos,
        COALESCE(
          ROUND(AVG(
            CASE
              WHEN t.inicio_atencion IS NOT NULL
              THEN (strftime('%s', t.inicio_atencion) - strftime('%s', t.registrado_en)) / 60.0
              ELSE NULL
            END
          ), 1),
          0
        ) AS espera_promedio_min,
        COALESCE(
          ROUND(AVG(
            CASE
              WHEN t.duracion_seg IS NOT NULL
              THEN t.duracion_seg / 60.0
              WHEN t.fin_atencion IS NOT NULL AND t.inicio_atencion IS NOT NULL
              THEN (strftime('%s', t.fin_atencion) - strftime('%s', t.inicio_atencion)) / 60.0
              ELSE NULL
            END
          ), 1),
          0
        ) AS duracion_promedio_min
      FROM tipos_servicio ts
      LEFT JOIN turnos t
             ON t.tipo_servicio_id = ts.id
            AND (@desde IS NULL OR t.fecha >= @desde)
            AND (@hasta IS NULL OR t.fecha <= @hasta)
      WHERE ts.activo = 1
      GROUP BY ts.id, ts.nombre, ts.prefijo
      ORDER BY total_turnos DESC, ts.id
    `)
    .all({ desde, hasta });
}

function celdaCsv(valor) {
  let texto = String(valor == null ? '' : valor);
  if (/^[=+\-@\t\r]/.test(texto)) texto = `'${texto}`;
  return /[",\r\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

function generarCsv(filas) {
  const encabezado = ['Servicio', 'Prefijo', 'Total de turnos', 'Espera promedio (min)', 'Duración promedio (min)'];
  const lineas = filas.map((f) =>
    [f.servicio, f.prefijo, f.total_turnos, f.espera_promedio_min, f.duracion_promedio_min]
      .map(celdaCsv)
      .join(',')
  );
  return `\uFEFF${[encabezado.map(celdaCsv).join(','), ...lineas].join('\r\n')}\r\n`;
}

router.get('/', (req, res) => {
  const rango = leerRango(req.query);
  if (rango.error) {
    return res.status(400).json({ ok: false, mensaje: rango.error });
  }

  try {
    res.json({
      ok: true,
      desde: rango.desde,
      hasta: rango.hasta,
      reportes: consultarReportes(rango.desde, rango.hasta),
    });
  } catch (error) {
    console.error('Error al generar reportes:', error);
    res.status(500).json({
      ok: false,
      mensaje: 'Error interno al consultar métricas',
    });
  }
});

router.get('/csv', (req, res) => {
  const rango = leerRango(req.query);
  if (rango.error) {
    return res.status(400).json({ ok: false, mensaje: rango.error });
  }

  try {
    const filas = consultarReportes(rango.desde, rango.hasta);
    const sufijo = rango.desde || rango.hasta
      ? `_${rango.desde || 'inicio'}_a_${rango.hasta || 'hoy'}`
      : '_todo';

    res.set('Content-Type', 'text/csv; charset=utf-8');
    res.set('Content-Disposition', `attachment; filename="reporte_turnos${sufijo}.csv"`);
    res.send(generarCsv(filas));
  } catch (error) {
    console.error('Error al exportar reportes:', error);
    res.status(500).json({ ok: false, mensaje: 'Error interno al exportar el reporte' });
  }
});

module.exports = router;