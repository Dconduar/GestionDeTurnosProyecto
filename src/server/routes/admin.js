const express = require('express');
const db = require('../db');
const { verificarContrasena, requiereLogin, requiereRol } = require('../auth');

const router = express.Router();

router.post('/login', (req, res) => {
  const { usuario, contrasena } = req.body || {};
  if (!usuario || !contrasena) {
    return res.status(400).json({ error: 'Escribe tu usuario y tu contraseña' });
  }

  const fila = db
    .prepare('SELECT id, nombre_usuario, contrasena_hash, rol, mostrador_id, activo FROM usuarios WHERE nombre_usuario = ?')
    .get(String(usuario));

  if (!fila || !fila.activo || !verificarContrasena(String(contrasena), fila.contrasena_hash)) {
    return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
  }

  req.session.usuario = {
    id: fila.id,
    nombre: fila.nombre_usuario,
    rol: fila.rol,
    mostrador_id: fila.mostrador_id,
  };
  res.json(req.session.usuario);
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ ok: true });
  });
});

router.get('/sesion', requiereLogin, (req, res) => {
  res.json(req.session.usuario);
});

router.use(requiereRol('administrador'));

module.exports = router;