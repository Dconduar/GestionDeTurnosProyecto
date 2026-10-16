// Rutas del CLIENTE: /api/turnos
// Dueños: Daniel (GES-15 RF-01 tomar turno, GES-16 RF-02 consultar la fila)
//         Celeste (GES-27 RF-03 cancelar turno, GES-28 RF-10 estimación)
//
// Ejemplos de lo que irá aquí:
//   POST   /api/turnos            -> tomar turno (RF-01)
//   GET    /api/turnos/fila       -> estado de la fila (RF-02)
//   PATCH  /api/turnos/:id/cancelar -> cancelar turno (RF-03)

const express = require('express');
// const db = require('../db');

const router = express.Router();

// TODO: agregar las rutas del cliente

module.exports = router;
