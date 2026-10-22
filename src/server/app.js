const path = require('path');
const express = require('express');
const db = require('./db');

const { sesion } = require('./auth');
const { crearUsuariosIniciales } = require('./usuarios-iniciales');
const turnos = require('./routes/turnos');
const recepcion = require('./routes/recepcion');
const admin = require('./routes/admin');
const reportes = require('./routes/reportes');
  crearUsuariosIniciales();
const app = express();

app.use(express.json());
app.use(sesion);
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/api/salud', (req, res) => {
  const { total } = db.prepare("SELECT COUNT(*) AS total FROM sqlite_master WHERE type = 'table'").get();
  res.json({ estado: 'ok', tablas: total });
});

app.use('/api/turnos', turnos);
app.use('/api/recepcion', recepcion);
app.use('/api/admin', admin);
app.use('/api/reportes', reportes);

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

app.use((err, req, res, next) => {
  if (err.expose && err.status >= 400 && err.status < 500) {
    return res.status(err.status).json({
      error: 'La solicitud no es válida. Revisa los datos enviados.',
      codigo: 'SOLICITUD_INVALIDA',
    });
  }
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

module.exports = app;
