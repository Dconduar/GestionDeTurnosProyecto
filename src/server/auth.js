const session = require('express-session');
const bcrypt = require('bcryptjs');

const sesion = session({
  secret: process.env.SESSION_SECRET || 'clave-solo-para-desarrollo',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', maxAge: 8 * 60 * 60 * 1000 },
});

function hashContrasena(contrasena) {
  return bcrypt.hashSync(contrasena, 10);
}

function verificarContrasena(contrasena, hash) {
  return bcrypt.compareSync(contrasena, hash);
}

function requiereLogin(req, res, next) {
  if (!req.session || !req.session.usuario) {
    return res.status(401).json({ error: 'Debes iniciar sesión' });
  }
  next();
}

function requiereRol(...roles) {
  return (req, res, next) => {
    if (!req.session || !req.session.usuario) {
      return res.status(401).json({ error: 'Debes iniciar sesión' });
    }
    if (!roles.includes(req.session.usuario.rol)) {
      return res.status(403).json({ error: 'No tienes permiso para esta acción' });
    }
    next();
  };
}

module.exports = { sesion, hashContrasena, verificarContrasena, requiereLogin, requiereRol };