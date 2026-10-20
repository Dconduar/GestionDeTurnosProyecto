const fs = require('fs');
const net = require('net');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const prefijoTemporal = `turnos-nfr05-${process.pid}-${Date.now()}`;
const RUTA_DB = path.join(os.tmpdir(), `${prefijoTemporal}.db`);
process.env.DB_PATH = RUTA_DB;

const Database = require('better-sqlite3');
const request = require('supertest');
const app = require('../src/server/app');
const db = require('../src/server/db');
const solicitudesSimultaneas = require('./helpers/solicitudesSimultaneas');

const RUTA_SERVIDOR = path.join(__dirname, '..', 'src', 'server', 'server.js');
const RESPUESTA_INTERNA = { error: 'Error interno del servidor' };
const archivosTemporales = [RUTA_DB];

function borrarBase(ruta) {
  for (const sufijo of ['', '-wal', '-shm']) fs.rmSync(ruta + sufijo, { force: true });
}

afterAll(() => {
  delete process.env.IGNORAR_HORARIO;
  db.close();
  archivosTemporales.forEach(borrarBase);
});

describe('NFR-05 persistencia entre reinicios del servidor', () => {
  function nuevaBase() {
    const ruta = path.join(os.tmpdir(), `${prefijoTemporal}-${archivosTemporales.length}.db`);
    archivosTemporales.push(ruta);
    return ruta;
  }

  function puertoLibre() {
    return new Promise((resolve) => {
      const servidor = net.createServer();
      servidor.listen(0, '127.0.0.1', () => {
        const { port } = servidor.address();
        servidor.close(() => resolve(port));
      });
    });
  }

  async function iniciarServidor(rutaDb) {
    const puerto = await puertoLibre();
    const proceso = spawn(process.execPath, [RUTA_SERVIDOR], {
      env: { ...process.env, DB_PATH: rutaDb, PORT: String(puerto), IGNORAR_HORARIO: '1' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    await new Promise((resolve, reject) => {
      proceso.stdout.on('data', (datos) => String(datos).includes('Servidor listo') && resolve());
      proceso.once('exit', (codigo) => reject(new Error(`El servidor terminó al iniciar (código ${codigo})`)));
    });
    return { proceso, api: request(`http://127.0.0.1:${puerto}`) };
  }

  // kill() termina el proceso de golpe, sin cierre ordenado: la base debe conservar
  // lo confirmado igual que ante una caída real.
  function detenerServidor({ proceso }) {
    return new Promise((resolve) => {
      proceso.once('exit', resolve);
      proceso.kill();
    });
  }

  function leerBase(rutaDb, sql, ...parametros) {
    const conexion = new Database(rutaDb, { readonly: true });
    try {
      return conexion.prepare(sql).all(...parametros);
    } finally {
      conexion.close();
    }
  }

  function sinEspera(turno) {
    const { espera_seg, ...resto } = turno;
    return resto;
  }

  test('un turno creado sigue registrado después de reiniciar', async () => {
    const rutaDb = nuevaBase();
    const primero = await iniciarServidor(rutaDb);
    const creado = (await primero.api.post('/api/turnos').send({ tipo_servicio_id: 2 })).body;
    await detenerServidor(primero);

    const segundo = await iniciarServidor(rutaDb);
    const consultado = await segundo.api.get(`/api/turnos/${creado.id}`);
    const fila = await segundo.api.get('/api/recepcion/fila?mostrador_id=1');
    await detenerServidor(segundo);

    expect(consultado.status).toBe(200);
    expect(consultado.body).toEqual(creado);
    expect(fila.body.fila.map((t) => t.id)).toEqual([creado.id]);
  }, 30000);

  test('un turno llamado conserva su estado, mostrador y llamado después de reiniciar', async () => {
    const rutaDb = nuevaBase();
    const primero = await iniciarServidor(rutaDb);
    await primero.api.post('/api/turnos').send({ tipo_servicio_id: 3 });
    const llamado = (await primero.api.post('/api/recepcion/llamar-siguiente').send({ mostrador_id: 2 })).body;
    await detenerServidor(primero);

    const segundo = await iniciarServidor(rutaDb);
    const fila = await segundo.api.get('/api/recepcion/fila?mostrador_id=2');
    await detenerServidor(segundo);

    expect(llamado.estado).toBe('en_atencion');
    expect(sinEspera(fila.body.en_atencion)).toEqual(sinEspera(llamado));
    expect(leerBase(rutaDb, 'SELECT turno_id, mostrador_id FROM llamados')).toEqual([
      { turno_id: llamado.id, mostrador_id: 2 },
    ]);
  }, 30000);

  test('un turno atendido conserva estado, fin y duración, y la fila sigue operando tras reiniciar', async () => {
    const rutaDb = nuevaBase();
    const primero = await iniciarServidor(rutaDb);
    await primero.api.post('/api/turnos').send({ tipo_servicio_id: 1 });
    const enEspera = (await primero.api.post('/api/turnos').send({ tipo_servicio_id: 1 })).body;
    const llamado = (await primero.api.post('/api/recepcion/llamar-siguiente').send({ mostrador_id: 1 })).body;
    const atendido = (await primero.api.patch(`/api/recepcion/turnos/${llamado.id}/atendido`).send({ mostrador_id: 1 })).body;
    await detenerServidor(primero);

    const segundo = await iniciarServidor(rutaDb);
    const consultado = await segundo.api.get(`/api/turnos/${atendido.id}`);
    const siguiente = await segundo.api.post('/api/recepcion/llamar-siguiente').send({ mostrador_id: 1 });
    await detenerServidor(segundo);

    expect(atendido.estado).toBe('atendido');
    expect(consultado.body.estado).toBe('atendido');
    expect(leerBase(rutaDb, 'SELECT estado, fin_atencion, duracion_seg FROM turnos WHERE id = ?', atendido.id)).toEqual([
      { estado: 'atendido', fin_atencion: atendido.fin_atencion, duracion_seg: atendido.duracion_seg },
    ]);
    expect(siguiente.status).toBe(201);
    expect(siguiente.body.id).toBe(enEspera.id);
  }, 30000);
});

describe('NFR-05 recuperación ante errores', () => {
  let consolaError;

  function crearTurno(servicioId) {
    return request(app).post('/api/turnos').send({ tipo_servicio_id: servicioId });
  }

  function llamar(mostradorId) {
    return request(app).post('/api/recepcion/llamar-siguiente').send({ mostrador_id: mostradorId });
  }

  function atender(id, mostradorId = 1) {
    return request(app).patch(`/api/recepcion/turnos/${id}/atendido`).send({ mostrador_id: mostradorId });
  }

  function estadoCompleto() {
    return {
      turnos: db.prepare('SELECT * FROM turnos ORDER BY id').all(),
      llamados: db.prepare('SELECT * FROM llamados ORDER BY id').all(),
    };
  }

  // Trigger temporal: solo existe en la conexión de esta prueba y aborta la sentencia
  // después de que la operación ya escribió dentro de su transacción.
  function fallarDespuesDe(evento, tabla, condicion = '') {
    db.exec(
      `CREATE TEMP TRIGGER fallo_simulado AFTER ${evento} ON ${tabla} ${condicion}
       BEGIN SELECT RAISE(ABORT, 'fallo simulado'); END`
    );
  }

  function quitarFallo() {
    db.exec('DROP TRIGGER IF EXISTS temp.fallo_simulado');
  }

  function expectErrorInterno(res) {
    expect(res.status).toBe(500);
    expect(res.body).toEqual(RESPUESTA_INTERNA);
    expect(JSON.stringify(res.body)).not.toMatch(/fallo simulado|SQLITE|INSERT|UPDATE|turnos|llamados/i);
    expect(consolaError).toHaveBeenCalledWith(expect.objectContaining({ message: 'fallo simulado' }));
  }

  beforeEach(() => {
    process.env.IGNORAR_HORARIO = '1';
    quitarFallo();
    db.exec('DELETE FROM llamados; DELETE FROM turnos;');
    db.exec("DELETE FROM sqlite_sequence WHERE name IN ('turnos', 'llamados')");
    consolaError = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    quitarFallo();
    consolaError.mockRestore();
  });

  test('si falla la creación de un turno no queda ningún registro parcial', async () => {
    await crearTurno(1);
    const antes = estadoCompleto();

    fallarDespuesDe('INSERT', 'turnos');
    expectErrorInterno(await crearTurno(2));
    expect(estadoCompleto()).toEqual(antes);

    quitarFallo();
    const nuevo = await crearTurno(2);
    expect(nuevo.status).toBe(201);
    expect(nuevo.body.numero).toBe(2);
  });

  test('si falla el registro del llamado se revierte también el cambio del turno', async () => {
    const id = (await crearTurno(1)).body.id;
    const antes = estadoCompleto();

    fallarDespuesDe('INSERT', 'llamados');
    expectErrorInterno(await llamar(1));
    expect(estadoCompleto()).toEqual(antes);
    expect(db.prepare('SELECT estado, mostrador_id, inicio_atencion FROM turnos WHERE id = ?').get(id)).toEqual({
      estado: 'esperando',
      mostrador_id: null,
      inicio_atencion: null,
    });
  });

  test('si falla la finalización el turno sigue en atención sin fin ni duración', async () => {
    await crearTurno(1);
    const id = (await llamar(1)).body.id;
    const antes = estadoCompleto();

    fallarDespuesDe('UPDATE', 'turnos', "WHEN NEW.estado = 'atendido'");
    expectErrorInterno(await atender(id));
    expect(estadoCompleto()).toEqual(antes);
    expect(db.prepare('SELECT estado, fin_atencion, duracion_seg FROM turnos WHERE id = ?').get(id)).toEqual({
      estado: 'en_atencion',
      fin_atencion: null,
      duracion_seg: null,
    });
  });

  test('la fila conserva su último estado confirmado después de un error', async () => {
    await crearTurno(1);
    await crearTurno(3);
    await crearTurno(2);
    const atendido = (await llamar(1)).body.id;
    await atender(atendido);
    await llamar(1);
    const filaAntes = (await request(app).get('/api/recepcion/fila?mostrador_id=2')).body;
    const antes = estadoCompleto();

    fallarDespuesDe('INSERT', 'llamados');
    expectErrorInterno(await llamar(2));

    const filaDespues = (await request(app).get('/api/recepcion/fila?mostrador_id=2')).body;
    expect(estadoCompleto()).toEqual(antes);
    expect(filaDespues.fila.map((t) => t.id)).toEqual(filaAntes.fila.map((t) => t.id));
    expect(filaDespues.otros_mostradores.map((t) => t.id)).toEqual(filaAntes.otros_mostradores.map((t) => t.id));
    expect(filaDespues.esperando_total).toBe(filaAntes.esperando_total);
  });

  test('las relaciones y la integridad de SQLite siguen válidas tras operaciones fallidas', async () => {
    await crearTurno(1);
    await crearTurno(1);
    const id = (await llamar(1)).body.id;

    fallarDespuesDe('INSERT', 'turnos');
    await crearTurno(2);
    quitarFallo();
    fallarDespuesDe('UPDATE', 'turnos', "WHEN NEW.estado = 'atendido'");
    await atender(id);
    quitarFallo();

    expect(db.pragma('foreign_key_check')).toEqual([]);
    expect(db.pragma('integrity_check', { simple: true })).toBe('ok');
    const huerfanos = db
      .prepare('SELECT COUNT(*) AS total FROM llamados l LEFT JOIN turnos t ON t.id = l.turno_id WHERE t.id IS NULL')
      .get();
    expect(huerfanos.total).toBe(0);
  });

  test('tras un error recuperable no quedan bloqueos y la siguiente operación válida funciona', async () => {
    const id = (await crearTurno(1)).body.id;
    fallarDespuesDe('INSERT', 'llamados');
    await llamar(1);
    quitarFallo();

    expect(db.inTransaction).toBe(false);
    const otraConexion = new Database(RUTA_DB, { timeout: 0 });
    otraConexion.exec('BEGIN IMMEDIATE; ROLLBACK;');
    otraConexion.close();

    const reintento = await llamar(1);
    expect(reintento.status).toBe(201);
    expect(reintento.body.id).toBe(id);
    expect(reintento.body.llamados).toBe(1);
    expect((await atender(id)).body.estado).toBe('atendido');
  });

  test('un cuerpo JSON mal formado se rechaza como solicitud inválida sin tocar la base', async () => {
    const antes = estadoCompleto();
    const rutas = [
      ['post', '/api/turnos'],
      ['post', '/api/recepcion/llamar-siguiente'],
      ['patch', '/api/recepcion/turnos/1/atendido'],
    ];
    for (const [metodo, ruta] of rutas) {
      const res = await request(app)[metodo](ruta).set('Content-Type', 'application/json').send('{tipo_servicio_id: 1,');
      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        error: 'La solicitud no es válida. Revisa los datos enviados.',
        codigo: 'SOLICITUD_INVALIDA',
      });
    }
    expect(estadoCompleto()).toEqual(antes);
    expect(consolaError).not.toHaveBeenCalled();
  });

  test('turnos creados a la vez desde conexiones distintas reciben números únicos y completos', async () => {
    const respuestas = await solicitudesSimultaneas(
      RUTA_DB,
      Array.from({ length: 10 }, () => ({ metodo: 'post', url: '/api/turnos', cuerpo: { tipo_servicio_id: 1 } }))
    );
    expect(respuestas.every((r) => r.status === 201)).toBe(true);
    const numeros = respuestas.map((r) => r.cuerpo.numero).sort((a, b) => a - b);
    expect(numeros).toEqual(Array.from({ length: 10 }, (_, i) => i + 1));
    expect(db.prepare('SELECT COUNT(*) AS total FROM turnos').get().total).toBe(10);
  }, 30000);
});
