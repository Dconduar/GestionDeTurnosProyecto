const express = require('express');
const router = express.Router();
const dbModule = require('../db');

// Obtener la instancia de better-sqlite3 según cómo la exporte db.js
const db = dbModule.prepare ? dbModule : (dbModule.db || dbModule);

// GET /api/reportes
// RF-09: Espera promedio, saturación y duración por servicio
router.get('/', (req, res) => {
  try {
    const query = `
      SELECT 
        ts.id AS servicio_id,
        ts.nombre AS servicio,
        ts.prefijo AS prefijo,
        COUNT(t.id) AS total_turnos,

        -- 1. Espera promedio (minutos): registrado_en hasta inicio_atencion
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

        -- 2. Duración promedio (minutos): usa duracion_seg o la resta fin - inicio
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
      LEFT JOIN turnos t ON t.tipo_servicio_id = ts.id
      WHERE ts.activo = 1
      GROUP BY ts.id, ts.nombre, ts.prefijo
      ORDER BY total_turnos DESC;
    `;

    const reportes = db.prepare(query).all();

    res.json({
      ok: true,
      reportes
    });
  } catch (error) {
    console.error('Error al generar reportes:', error);
    res.status(500).json({
      ok: false,
      mensaje: 'Error interno al consultar métricas',
      error: error.message
    });
  }
});

module.exports = router;