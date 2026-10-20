const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');

if (!isMainThread) {
  process.env.DB_PATH = workerData.rutaDb;
  process.env.IGNORAR_HORARIO = '1';

  const request = require('supertest');
  const app = require('../../src/server/app');
  const db = require('../../src/server/db');

  const barrera = new Int32Array(workerData.barrera);
  parentPort.postMessage({ tipo: 'listo' });
  Atomics.wait(barrera, 0, 0);

  const { metodo, url, cuerpo } = workerData.solicitud;
  request(app)
    [metodo](url)
    .send(cuerpo)
    .then((res) => {
      db.close();
      parentPort.postMessage({ tipo: 'resultado', status: res.status, cuerpo: res.body });
    });
}

// Cada worker abre su propia conexión a SQLite; con Promise.all sobre la conexión síncrona
// de better-sqlite3 las escrituras nunca coincidirían. Mientras otra conexión retiene el
// bloqueo de escritura, todas las solicitudes quedan esperando a la vez y compiten al liberarse.
async function solicitudesSimultaneas(rutaDb, solicitudes) {
  const Database = require('better-sqlite3');
  const barrera = new SharedArrayBuffer(4);
  const workers = solicitudes.map(
    (solicitud) => new Worker(__filename, { workerData: { rutaDb, solicitud, barrera } })
  );
  const listos = workers.map((w) => new Promise((resolve) => w.once('message', resolve)));
  const resultados = workers.map(
    (w) =>
      new Promise((resolve, reject) => {
        w.on('message', (m) => m.tipo === 'resultado' && resolve({ status: m.status, cuerpo: m.cuerpo }));
        w.once('error', reject);
      })
  );
  const terminados = workers.map((w) => new Promise((resolve) => w.once('exit', resolve)));

  await Promise.all(listos);
  const bloqueo = new Database(rutaDb);
  bloqueo.exec('BEGIN IMMEDIATE');
  const senal = new Int32Array(barrera);
  Atomics.store(senal, 0, 1);
  Atomics.notify(senal, 0);
  await new Promise((resolve) => setTimeout(resolve, 500));
  bloqueo.exec('ROLLBACK');
  bloqueo.close();

  const respuestas = await Promise.all(resultados);
  await Promise.all(terminados);
  return respuestas;
}

module.exports = solicitudesSimultaneas;
