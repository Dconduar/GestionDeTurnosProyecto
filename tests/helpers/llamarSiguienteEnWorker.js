const { parentPort, workerData } = require('worker_threads');

process.env.DB_PATH = workerData.rutaDb;
process.env.IGNORAR_HORARIO = '1';

const request = require('supertest');
const app = require('../../src/server/app');
const db = require('../../src/server/db');

const barrera = new Int32Array(workerData.barrera);
parentPort.postMessage({ tipo: 'listo' });
Atomics.wait(barrera, 0, 0);

request(app)
  .post('/api/recepcion/llamar-siguiente')
  .send({ mostrador_id: workerData.mostradorId })
  .then((res) => {
    db.close();
    parentPort.postMessage({ tipo: 'resultado', status: res.status, id: res.body.id, codigo: res.body.codigo });
  });
