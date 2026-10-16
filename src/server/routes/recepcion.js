// Rutas del RECEPCIONISTA: /api/recepcion
// Dueños: Derek (GES-19 RF-04 llamar siguiente, GES-20 RF-06 no asistió)
//         Ana Laura (GES-23 RF-07 mostradores, GES-24 RF-05 marcar atendido)
//
// Ejemplos de lo que irá aquí:
//   POST   /api/recepcion/llamar-siguiente -> llamar al siguiente turno (RF-04)
//   PATCH  /api/recepcion/turnos/:id/atendido    -> marcar atendido (RF-05)
//   PATCH  /api/recepcion/turnos/:id/no-asistio  -> marcar no asistió (RF-06)

const express = require('express');
// const db = require('../db');

const router = express.Router();

// TODO: agregar las rutas del recepcionista

module.exports = router;
