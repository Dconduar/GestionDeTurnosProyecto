process.env.DB_PATH = ':memory:';

const request = require('supertest');
const app = require('../src/server/app');
const db = require('../src/server/db');
const { iniciarSesion } = require('./helpers/sesionPersonal');

let personal;
beforeAll(async () => {
  personal = await iniciarSesion(app);
});

beforeEach(() => {
  process.env.IGNORAR_HORARIO = '1';
  db.exec('DELETE FROM llamados; DELETE FROM turnos;');
  db.exec("DELETE FROM sqlite_sequence WHERE name IN ('turnos', 'llamados')");
});

afterAll(() => {
  delete process.env.IGNORAR_HORARIO;
});

async function nuevoTurno(servicio = 2) {
  const res = await request(app).post('/api/turnos').send({ tipo_servicio_id: servicio });
  return res.body;
}

describe('PATCH /api/recepcion/turnos/:id/preferencial', () => {
  test('exige iniciar sesión', async () => {
    const turno = await nuevoTurno();
    const res = await request(app)
      .patch(`/api/recepcion/turnos/${turno.id}/preferencial`)
      .send({ preferencial: true });
    expect(res.status).toBe(401);
  });

  test('marca un turno en espera como preferencial', async () => {
    const turno = await nuevoTurno();
    const res = await personal
      .patch(`/api/recepcion/turnos/${turno.id}/preferencial`)
      .send({ preferencial: true });
    expect(res.status).toBe(200);
    expect(res.body.prioridad).toBe('preferencial');
    expect(res.body.estado).toBe('esperando');
  });

  test('puede volver a normal', async () => {
    const turno = await nuevoTurno();
    await personal.patch(`/api/recepcion/turnos/${turno.id}/preferencial`).send({ preferencial: true });
    const res = await personal
      .patch(`/api/recepcion/turnos/${turno.id}/preferencial`)
      .send({ preferencial: false });
    expect(res.status).toBe(200);
    expect(res.body.prioridad).toBe('normal');
  });

  test('rechaza un valor que no sea booleano', async () => {
    const turno = await nuevoTurno();
    const res = await personal
      .patch(`/api/recepcion/turnos/${turno.id}/preferencial`)
      .send({ preferencial: 'si' });
    expect(res.status).toBe(400);
    expect(res.body.codigo).toBe('PRIORIDAD_INVALIDA');
  });

  test('responde 404 si el turno no existe', async () => {
    const res = await personal.patch('/api/recepcion/turnos/9999/preferencial').send({ preferencial: true });
    expect(res.status).toBe(404);
  });

  test('responde 409 si el turno ya no está esperando', async () => {
    const turno = await nuevoTurno();
    await personal.post('/api/recepcion/llamar-siguiente').send({ mostrador_id: 1 });
    const res = await personal
      .patch(`/api/recepcion/turnos/${turno.id}/preferencial`)
      .send({ preferencial: true });
    expect(res.status).toBe(409);
    expect(res.body.codigo).toBe('TURNO_NO_ESPERANDO');
  });

  test('el cliente sigue sin poder elegir su propia prioridad', async () => {
    const res = await request(app)
      .post('/api/turnos')
      .send({ tipo_servicio_id: 2, prioridad: 'preferencial' });
    expect(res.body.prioridad).toBe('normal');
  });

  test('el preferencial se llama antes aunque haya llegado después', async () => {
    await nuevoTurno();
    const segundo = await nuevoTurno();
    await personal.patch(`/api/recepcion/turnos/${segundo.id}/preferencial`).send({ preferencial: true });

    const llamado = await personal.post('/api/recepcion/llamar-siguiente').send({ mostrador_id: 1 });
    expect(llamado.status).toBe(201);
    expect(llamado.body.id).toBe(segundo.id);
  });

  test('la fila del cliente refleja la nueva prioridad y los turnos delante', async () => {
    const primero = await nuevoTurno();
    const segundo = await nuevoTurno();
    await personal.patch(`/api/recepcion/turnos/${segundo.id}/preferencial`).send({ preferencial: true });

    const filaSegundo = await request(app).get(`/api/turnos/fila?turno=${segundo.id}`);
    const filaPrimero = await request(app).get(`/api/turnos/fila?turno=${primero.id}`);
    expect(filaSegundo.body.mi_turno.prioridad).toBe('preferencial');
    expect(filaSegundo.body.mi_turno.delante).toBe(0);
    expect(filaPrimero.body.mi_turno.delante).toBe(1);
  });
});