// Aplicación Express. Se exporta sin arrancar el servidor para poder probarla
// con Supertest. El servidor se inicia en server.js.

const path = require('path');
const express = require('express');
const db = require('./db');

const turnos = require('./routes/turnos');
const recepcion = require('./routes/recepcion');
const admin = require('./routes/admin');
const reportes = require('./routes/reportes');

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// Comprobación rápida de que el servidor y la base de datos responden
app.get('/api/salud', (req, res) => {
  const { total } = db.prepare("SELECT COUNT(*) AS total FROM sqlite_master WHERE type = 'table'").get();
  res.json({ estado: 'ok', tablas: total });
});

// Cada módulo vive en su propio archivo para evitar conflictos al juntar el trabajo
app.use('/api/turnos', turnos);
app.use('/api/recepcion', recepcion);
app.use('/api/admin', admin);
app.use('/api/reportes', reportes);

// Rutas /api que no existen
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Errores no controlados
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

module.exports = app;
