const fs = require('fs');
const os = require('os');
const path = require('path');
const { Worker } = require('worker_threads');

const RUTA_DB = path.join(os.tmpdir(), `turnos-rf07-${process.pid}-${Date.now()}.db`);
process.env.DB_PATH = RUTA_DB;

const Database = require('better-sqlite3');
const request = require('supertest');
const app = require('../src/server/app');
const db = require('../src/server/db');

function crearTurno(servicioId, { prioridad = 'normal', numero } = {}) {
  const { siguiente } = db
    .prepare("SELECT COALESCE(MAX(numero), 0) + 1 AS siguiente FROM turnos WHERE fecha = date('now', 'localtime')")
    .get();
  const info = db
    .prepare('INSERT INTO turnos (numero, tipo_servicio_id, prioridad) VALUES (?, ?, ?)')
    .run(numero || siguiente, servicioId, prioridad);
  return Number(info.lastInsertRowid);
}

function crearMostrador(nombre, servicios) {
  const id = Number(db.prepare('INSERT INTO mostradores (nombre) VALUES (?)').run(nombre).lastInsertRowid);
  const vincular = db.prepare('INSERT INTO mostrador_servicio (mostrador_id, tipo_servicio_id) VALUES (?, ?)');
  for (const servicioId of servicios) vincular.run(id, servicioId);
  return id;
}

function llamar(mostradorId) {
  return request(app).post('/api/recepcion/llamar-siguiente').send({ mostrador_id: mostradorId });
}

function turnos() {
  return db.prepare('SELECT id, estado, mostrador_id, inicio_atencion FROM turnos ORDER BY id').all();
}

function turno(id) {
  return db.prepare('SELECT estado, mostrador_id FROM turnos WHERE id = ?').get(id);
}

function totalLlamados() {
  return db.prepare('SELECT COUNT(*) AS total FROM llamados').get().total;
}

function terminarAtencion(id) {
  db.prepare("UPDATE turnos SET estado = 'atendido' WHERE id = ?").run(id);
}

beforeEach(() => {
  process.env.IGNORAR_HORARIO = '1';
  db.exec('DELETE FROM llamados; DELETE FROM turnos; DELETE FROM mostradores WHERE id > 2;');
  db.exec('UPDATE mostradores SET activo = 1');
  db.exec("DELETE FROM sqlite_sequence WHERE name IN ('turnos', 'llamados', 'mostradores')");
});

afterAll(() => {
  delete process.env.IGNORAR_HORARIO;
  db.close();
  for (const sufijo of ['', '-wal', '-shm']) fs.rmSync(RUTA_DB + sufijo, { force: true });
});

describe('RF-07 servicios y mostradores vinculados a cada turno', () => {
  test('la base reconoce varios servicios, mostradores y sus vínculos', () => {
    const servicios = db.prepare('SELECT id FROM tipos_servicio WHERE activo = 1').all();
    const mostradores = db.prepare('SELECT id FROM mostradores WHERE activo = 1').all();
    const vinculos = db
      .prepare('SELECT mostrador_id, tipo_servicio_id FROM mostrador_servicio ORDER BY mostrador_id, tipo_servicio_id')
      .all();
    expect(servicios.length).toBeGreaterThan(1);
    expect(mostradores.length).toBeGreaterThan(1);
    expect(vinculos).toEqual([
      { mostrador_id: 1, tipo_servicio_id: 1 },
      { mostrador_id: 1, tipo_servicio_id: 2 },
      { mostrador_id: 2, tipo_servicio_id: 2 },
      { mostrador_id: 2, tipo_servicio_id: 3 },
    ]);
  });

  test('un mostrador toma un turno de un servicio que tiene vinculado', async () => {
    const pago = crearTurno(3);
    const res = await llamar(2);
    expect(res.status).toBe(201);
    expect(res.body.id).toBe(pago);
    expect(res.body.servicio.id).toBe(3);
    expect(res.body.mostrador_id).toBe(2);
  });

  test('un mostrador no toma turnos de servicios que no tiene vinculados', async () => {
    crearTurno(3);
    crearTurno(3, { prioridad: 'preferencial' });
    const antes = turnos();
    const res = await llamar(1);
    expect(res.status).toBe(409);
    expect(res.body.codigo).toBe('FILA_VACIA');
    expect(turnos()).toEqual(antes);
    expect(totalLlamados()).toBe(0);
  });

  test('entre los turnos compatibles va primero el preferencial', async () => {
    crearTurno(1);
    const preferencialAjeno = crearTurno(3, { prioridad: 'preferencial' });
    const preferencial = crearTurno(2, { prioridad: 'preferencial' });
    const res = await llamar(1);
    expect(res.body.id).toBe(preferencial);
    expect(res.body.prioridad).toBe('preferencial');
    expect(turno(preferencialAjeno)).toEqual({ estado: 'esperando', mostrador_id: null });
  });

  test('con la misma prioridad respeta el orden de llegada por número', async () => {
    const tercero = crearTurno(2, { numero: 3 });
    const primero = crearTurno(1, { numero: 1 });
    const segundo = crearTurno(2, { numero: 2 });

    const orden = [];
    for (let i = 0; i < 3; i += 1) {
      const res = await llamar(1);
      expect(res.status).toBe(201);
      orden.push(res.body.id);
      terminarAtencion(res.body.id);
    }
    expect(orden).toEqual([primero, segundo, tercero]);
  });

  test('al llamar guarda en el turno el mostrador que lo atiende', async () => {
    const llamado = crearTurno(2);
    const enEspera = crearTurno(2);
    const res = await llamar(2);
    expect(res.body.mostrador_id).toBe(2);
    expect(res.body.mostrador).toBe('Mostrador 2');
    expect(turno(llamado)).toEqual({ estado: 'en_atencion', mostrador_id: 2 });
    expect(turno(enEspera)).toEqual({ estado: 'esperando', mostrador_id: null });
    const llamados = db.prepare('SELECT turno_id, mostrador_id FROM llamados').all();
    expect(llamados).toEqual([{ turno_id: llamado, mostrador_id: 2 }]);
  });

  test('rechaza mostradores inexistentes o identificadores inválidos sin tocar los turnos', async () => {
    crearTurno(1);
    crearTurno(3);
    const antes = turnos();
    for (const mostradorId of [99, 'abc', -1, 0, 1.5]) {
      const res = await llamar(mostradorId);
      expect(res.status).toBe(400);
      expect(res.body.codigo).toBe('MOSTRADOR_INVALIDO');
    }
    expect(turnos()).toEqual(antes);
    expect(totalLlamados()).toBe(0);
  });

  test('no asigna turnos a un mostrador desactivado', async () => {
    const pago = crearTurno(3);
    db.prepare('UPDATE mostradores SET activo = 0 WHERE id = 2').run();
    const res = await llamar(2);
    expect(res.status).toBe(400);
    expect(res.body.codigo).toBe('MOSTRADOR_INVALIDO');
    expect(turno(pago)).toEqual({ estado: 'esperando', mostrador_id: null });
    expect(totalLlamados()).toBe(0);
  });

  test('un mostrador sin servicios vinculados no recibe turnos ni altera la fila', async () => {
    const sinServicios = crearMostrador('Mostrador sin servicios', []);
    crearTurno(1);
    crearTurno(2, { prioridad: 'preferencial' });
    crearTurno(3);
    const antes = turnos();
    const res = await llamar(sinServicios);
    expect(res.status).toBe(409);
    expect(res.body.codigo).toBe('FILA_VACIA');
    expect(turnos()).toEqual(antes);
    expect(totalLlamados()).toBe(0);
  });

  test('la asignación persiste en SQLite y respeta mostrador_servicio', async () => {
    const pago = crearTurno(3);
    await llamar(2);

    const otraConexion = new Database(RUTA_DB, { readonly: true });
    const guardado = otraConexion
      .prepare(
        `SELECT t.estado, t.mostrador_id, ms.tipo_servicio_id AS servicio_vinculado
           FROM turnos t
           JOIN mostrador_servicio ms
             ON ms.mostrador_id = t.mostrador_id AND ms.tipo_servicio_id = t.tipo_servicio_id
          WHERE t.id = ?`
      )
      .get(pago);
    otraConexion.close();
    expect(guardado).toEqual({ estado: 'en_atencion', mostrador_id: 2, servicio_vinculado: 3 });
  });

  test('una segunda solicitud no sobrescribe una asignación ya hecha', async () => {
    const a = crearTurno(2);
    const b = crearTurno(2);
    expect((await llamar(1)).body.id).toBe(a);

    const repetida = await llamar(1);
    expect(repetida.status).toBe(409);
    expect(repetida.body.codigo).toBe('YA_HAY_TURNO_EN_ATENCION');

    expect((await llamar(2)).body.id).toBe(b);
    expect(turno(a)).toEqual({ estado: 'en_atencion', mostrador_id: 1 });
    expect(turno(b)).toEqual({ estado: 'en_atencion', mostrador_id: 2 });
    expect(db.prepare('SELECT COUNT(*) AS total FROM llamados WHERE turno_id = ?').get(a).total).toBe(1);
  });

  test('llamadas simultáneas desde conexiones distintas no asignan dos veces el mismo turno', async () => {
    const mostradores = [1, 2];
    for (let i = 3; i <= 10; i += 1) mostradores.push(crearMostrador(`Mostrador ${i}`, [2]));
    const esperados = Array.from({ length: 6 }, () => crearTurno(2));

    // Cada worker abre su propia conexión a SQLite; con Promise.all sobre la conexión síncrona
    // de better-sqlite3 las escrituras nunca coincidirían.
    const barrera = new SharedArrayBuffer(4);
    const workers = mostradores.map(
      (mostradorId) =>
        new Worker(path.join(__dirname, 'helpers', 'llamarSiguienteEnWorker.js'), {
          workerData: { rutaDb: RUTA_DB, mostradorId, barrera },
        })
    );
    const listos = workers.map((w) => new Promise((resolve) => w.once('message', resolve)));
    const resultados = workers.map(
      (w) =>
        new Promise((resolve, reject) => {
          w.on('message', (m) => m.tipo === 'resultado' && resolve(m));
          w.once('error', reject);
        })
    );
    const terminados = workers.map((w) => new Promise((resolve) => w.once('exit', resolve)));

    await Promise.all(listos);
    // Mientras otra conexión retiene el bloqueo de escritura, todas las solicitudes quedan
    // esperando a la vez y compiten por la fila cuando se libera.
    const bloqueo = new Database(RUTA_DB);
    bloqueo.exec('BEGIN IMMEDIATE');
    Atomics.store(new Int32Array(barrera), 0, 1);
    Atomics.notify(new Int32Array(barrera), 0);
    await new Promise((resolve) => setTimeout(resolve, 500));
    bloqueo.exec('ROLLBACK');
    bloqueo.close();
    const respuestas = await Promise.all(resultados);
    await Promise.all(terminados);

    const exitosas = respuestas.filter((r) => r.status === 201);
    const sinTurno = respuestas.filter((r) => r.status === 409);
    expect(exitosas).toHaveLength(esperados.length);
    expect(sinTurno).toHaveLength(mostradores.length - esperados.length);
    expect(sinTurno.every((r) => r.codigo === 'FILA_VACIA')).toBe(true);
    expect(exitosas.map((r) => r.id).sort((x, y) => x - y)).toEqual(esperados);

    const asignaciones = db
      .prepare(
        `SELECT t.id, t.estado, t.mostrador_id, COUNT(l.id) AS llamados, MIN(l.mostrador_id) AS mostrador_llamado
           FROM turnos t
           LEFT JOIN llamados l ON l.turno_id = t.id
          GROUP BY t.id
          ORDER BY t.id`
      )
      .all();
    for (const a of asignaciones) {
      expect(a.estado).toBe('en_atencion');
      expect(a.llamados).toBe(1);
      expect(a.mostrador_llamado).toBe(a.mostrador_id);
    }
    expect(new Set(asignaciones.map((a) => a.mostrador_id)).size).toBe(esperados.length);
  }, 30000);
});
