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


function fallo(res, estado, mensaje) {
  return res.status(estado).json({ error: mensaje });
}

function textoValido(valor, maximo) {
  return typeof valor === 'string' && valor.trim().length > 0 && valor.trim().length <= maximo;
}

function prefijoValido(valor) {
  return typeof valor === 'string' && /^[A-Za-z0-9]{1,3}$/.test(valor.trim());
}

function duracionValida(valor) {
  return Number.isInteger(valor) && valor > 0 && valor <= 600;
}

function aBit(valor) {
  if (valor === true || valor === 1) return 1;
  if (valor === false || valor === 0) return 0;
  return null;
}

function horaValida(valor) {
  return typeof valor === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(valor);
}

function idsDeServicios(valor) {
  if (!Array.isArray(valor)) return null;
  const ids = valor.map(Number);
  if (ids.some((id) => !Number.isInteger(id) || id <= 0)) return null;
  return [...new Set(ids)];
}

function existenServicios(ids) {
  if (ids.length === 0) return true;
  const marcas = ids.map(() => '?').join(',');
  const { total } = db.prepare(`SELECT COUNT(*) AS total FROM tipos_servicio WHERE id IN (${marcas})`).get(...ids);
  return total === ids.length;
}

function esDuplicado(error) {
  return error && typeof error.code === 'string' && error.code.startsWith('SQLITE_CONSTRAINT');
}


function servicioPorId(id) {
  const fila = db
    .prepare('SELECT id, nombre, prefijo, descripcion, duracion_estimada_min, activo FROM tipos_servicio WHERE id = ?')
    .get(id);
  return fila ? { ...fila, activo: !!fila.activo } : null;
}

router.get('/servicios', (req, res) => {
  const filas = db
    .prepare('SELECT id, nombre, prefijo, descripcion, duracion_estimada_min, activo FROM tipos_servicio ORDER BY id')
    .all();
  res.json(filas.map((f) => ({ ...f, activo: !!f.activo })));
});

router.post('/servicios', (req, res) => {
  const { nombre, prefijo, descripcion = null, duracion_estimada_min = 10 } = req.body || {};

  if (!textoValido(nombre, 100)) return fallo(res, 400, 'El nombre del servicio es obligatorio (máximo 100 caracteres).');
  if (!prefijoValido(prefijo)) return fallo(res, 400, 'El prefijo debe tener de 1 a 3 letras o números.');
  if (!duracionValida(duracion_estimada_min)) return fallo(res, 400, 'La duración estimada debe ser un número entero de minutos mayor que 0.');
  if (descripcion !== null && !textoValido(descripcion, 255)) return fallo(res, 400, 'La descripción no puede pasar de 255 caracteres.');

  try {
    const info = db
      .prepare('INSERT INTO tipos_servicio (nombre, prefijo, descripcion, duracion_estimada_min) VALUES (?, ?, ?, ?)')
      .run(nombre.trim(), prefijo.trim().toUpperCase(), descripcion && descripcion.trim(), duracion_estimada_min);
    res.status(201).json(servicioPorId(Number(info.lastInsertRowid)));
  } catch (error) {
    if (esDuplicado(error)) return fallo(res, 409, 'Ya existe un servicio con ese nombre o con ese prefijo.');
    throw error;
  }
});

router.patch('/servicios/:id(\\d+)', (req, res) => {
  const id = Number(req.params.id);
  const actual = servicioPorId(id);
  if (!actual) return fallo(res, 404, 'El servicio no existe.');

  const cambios = req.body || {};
  const nuevo = { ...actual };

  if ('nombre' in cambios) {
    if (!textoValido(cambios.nombre, 100)) return fallo(res, 400, 'El nombre del servicio no es válido.');
    nuevo.nombre = cambios.nombre.trim();
  }
  if ('prefijo' in cambios) {
    if (!prefijoValido(cambios.prefijo)) return fallo(res, 400, 'El prefijo debe tener de 1 a 3 letras o números.');
    nuevo.prefijo = cambios.prefijo.trim().toUpperCase();
  }
  if ('descripcion' in cambios) {
    if (cambios.descripcion !== null && !textoValido(cambios.descripcion, 255)) return fallo(res, 400, 'La descripción no es válida.');
    nuevo.descripcion = cambios.descripcion && cambios.descripcion.trim();
  }
  if ('duracion_estimada_min' in cambios) {
    if (!duracionValida(cambios.duracion_estimada_min)) return fallo(res, 400, 'La duración estimada debe ser un entero mayor que 0.');
    nuevo.duracion_estimada_min = cambios.duracion_estimada_min;
  }
  if ('activo' in cambios) {
    const bit = aBit(cambios.activo);
    if (bit === null) return fallo(res, 400, 'El campo activo debe ser verdadero o falso.');
    if (bit === 0 && actual.activo) {
      const { total } = db
        .prepare(
          `SELECT COUNT(*) AS total FROM turnos
            WHERE tipo_servicio_id = ? AND fecha = date('now', 'localtime')
              AND estado IN ('esperando', 'en_atencion')`
        )
        .get(id);
      if (total > 0) return fallo(res, 409, 'No se puede desactivar: hay turnos de este servicio en espera o en atención.');
    }
    nuevo.activo = !!bit;
  }

  try {
    db.prepare(
      'UPDATE tipos_servicio SET nombre = ?, prefijo = ?, descripcion = ?, duracion_estimada_min = ?, activo = ? WHERE id = ?'
    ).run(nuevo.nombre, nuevo.prefijo, nuevo.descripcion, nuevo.duracion_estimada_min, nuevo.activo ? 1 : 0, id);
  } catch (error) {
    if (esDuplicado(error)) return fallo(res, 409, 'Ya existe un servicio con ese nombre o con ese prefijo.');
    throw error;
  }
  res.json(servicioPorId(id));
});


function mostradorPorId(id) {
  const fila = db
    .prepare(
      `SELECT m.id, m.nombre, m.activo,
              (SELECT group_concat(tipo_servicio_id) FROM mostrador_servicio WHERE mostrador_id = m.id) AS servicios
         FROM mostradores m WHERE m.id = ?`
    )
    .get(id);
  if (!fila) return null;
  return {
    id: fila.id,
    nombre: fila.nombre,
    activo: !!fila.activo,
    servicios: fila.servicios ? fila.servicios.split(',').map(Number).sort((a, b) => a - b) : [],
  };
}

const guardarServicios = db.transaction((mostradorId, ids) => {
  db.prepare('DELETE FROM mostrador_servicio WHERE mostrador_id = ?').run(mostradorId);
  const insertar = db.prepare('INSERT INTO mostrador_servicio (mostrador_id, tipo_servicio_id) VALUES (?, ?)');
  ids.forEach((servicioId) => insertar.run(mostradorId, servicioId));
});

router.get('/mostradores', (req, res) => {
  const ids = db.prepare('SELECT id FROM mostradores ORDER BY id').all();
  res.json(ids.map(({ id }) => mostradorPorId(id)));
});

router.post('/mostradores', (req, res) => {
  const { nombre, servicios } = req.body || {};
  if (!textoValido(nombre, 100)) return fallo(res, 400, 'El nombre del mostrador es obligatorio (máximo 100 caracteres).');

  const ids = idsDeServicios(servicios);
  if (!ids || ids.length === 0) return fallo(res, 400, 'Elige al menos un servicio para el mostrador.');
  if (!existenServicios(ids)) return fallo(res, 400, 'Alguno de los servicios elegidos no existe.');

  try {
    const crear = db.transaction(() => {
      const info = db.prepare('INSERT INTO mostradores (nombre) VALUES (?)').run(nombre.trim());
      const id = Number(info.lastInsertRowid);
      guardarServicios(id, ids);
      return id;
    });
    res.status(201).json(mostradorPorId(crear()));
  } catch (error) {
    if (esDuplicado(error)) return fallo(res, 409, 'Ya existe un mostrador con ese nombre.');
    throw error;
  }
});

router.patch('/mostradores/:id(\\d+)', (req, res) => {
  const id = Number(req.params.id);
  const actual = mostradorPorId(id);
  if (!actual) return fallo(res, 404, 'El mostrador no existe.');

  const cambios = req.body || {};
  let nombre = actual.nombre;
  let activo = actual.activo;
  let ids = null;

  if ('nombre' in cambios) {
    if (!textoValido(cambios.nombre, 100)) return fallo(res, 400, 'El nombre del mostrador no es válido.');
    nombre = cambios.nombre.trim();
  }
  if ('servicios' in cambios) {
    ids = idsDeServicios(cambios.servicios);
    if (!ids || ids.length === 0) return fallo(res, 400, 'Elige al menos un servicio para el mostrador.');
    if (!existenServicios(ids)) return fallo(res, 400, 'Alguno de los servicios elegidos no existe.');
  }
  if ('activo' in cambios) {
    const bit = aBit(cambios.activo);
    if (bit === null) return fallo(res, 400, 'El campo activo debe ser verdadero o falso.');
    if (bit === 0 && actual.activo) {
      const { total } = db
        .prepare("SELECT COUNT(*) AS total FROM turnos WHERE mostrador_id = ? AND estado = 'en_atencion'")
        .get(id);
      if (total > 0) return fallo(res, 409, 'No se puede desactivar: el mostrador está atendiendo un turno.');
    }
    activo = !!bit;
  }

  try {
    db.transaction(() => {
      db.prepare('UPDATE mostradores SET nombre = ?, activo = ? WHERE id = ?').run(nombre, activo ? 1 : 0, id);
      if (ids) guardarServicios(id, ids);
    })();
  } catch (error) {
    if (esDuplicado(error)) return fallo(res, 409, 'Ya existe un mostrador con ese nombre.');
    throw error;
  }
  res.json(mostradorPorId(id));
});


function listarHorarios() {
  return db
    .prepare('SELECT id, dia_semana, hora_inicio, hora_fin, activo FROM horarios_atencion ORDER BY dia_semana, hora_inicio')
    .all()
    .map((f) => ({ ...f, activo: !!f.activo }));
}

router.get('/horarios', (req, res) => {
  res.json(listarHorarios());
});

router.put('/horarios', (req, res) => {
  const { horarios } = req.body || {};
  if (!Array.isArray(horarios)) return fallo(res, 400, 'Envía la lista de horarios.');

  for (const h of horarios) {
    if (!h || !Number.isInteger(h.dia_semana) || h.dia_semana < 0 || h.dia_semana > 6) {
      return fallo(res, 400, 'El día de la semana debe ir de 0 (domingo) a 6 (sábado).');
    }
    if (!horaValida(h.hora_inicio) || !horaValida(h.hora_fin)) {
      return fallo(res, 400, 'Las horas deben tener el formato HH:MM, por ejemplo 08:00.');
    }
    if (h.hora_inicio >= h.hora_fin) {
      return fallo(res, 400, 'La hora de inicio debe ser anterior a la hora de fin.');
    }
    if (h.activo !== undefined && aBit(h.activo) === null) {
      return fallo(res, 400, 'El campo activo debe ser verdadero o falso.');
    }
  }

  const activos = horarios.filter((h) => h.activo === undefined || aBit(h.activo) === 1);
  for (let dia = 0; dia <= 6; dia += 1) {
    const tramos = activos.filter((h) => h.dia_semana === dia).sort((a, b) => (a.hora_inicio < b.hora_inicio ? -1 : 1));
    for (let i = 1; i < tramos.length; i += 1) {
      if (tramos[i].hora_inicio < tramos[i - 1].hora_fin) {
        return fallo(res, 400, 'Hay horarios que se solapan en el mismo día.');
      }
    }
  }

  db.transaction(() => {
    db.prepare('DELETE FROM horarios_atencion').run();
    const insertar = db.prepare(
      'INSERT INTO horarios_atencion (dia_semana, hora_inicio, hora_fin, activo) VALUES (?, ?, ?, ?)'
    );
    horarios.forEach((h) => insertar.run(h.dia_semana, h.hora_inicio, h.hora_fin, h.activo === undefined ? 1 : aBit(h.activo)));
  })();

  res.json(listarHorarios());
});

module.exports = router;