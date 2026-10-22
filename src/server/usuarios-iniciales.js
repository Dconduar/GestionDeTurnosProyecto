const db = require('./db');
const { hashContrasena } = require('./auth');

function crearUsuariosIniciales() {
  const { total } = db.prepare('SELECT COUNT(*) AS total FROM usuarios').get();
  if (total > 0) return;

  const insertar = db.prepare(
    'INSERT INTO usuarios (nombre_usuario, contrasena_hash, rol, mostrador_id) VALUES (?, ?, ?, ?)'
  );
  insertar.run('admin', hashContrasena('admin123'), 'administrador', null);
  insertar.run('recepcion1', hashContrasena('recepcion123'), 'recepcionista', 1);
  insertar.run('recepcion2', hashContrasena('recepcion123'), 'recepcionista', 2);
}

module.exports = { crearUsuariosIniciales };