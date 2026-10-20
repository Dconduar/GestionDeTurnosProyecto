process.env.DB_PATH = ':memory:';

const request = require('supertest');
const app = require('../src/server/app');
const db = require('../src/server/db');

beforeEach(() => {
  process.env.IGNORAR_HORARIO = '1'; 
  db.exec('DELETE FROM llamados; DELETE FROM turnos;');
  db.exec("DELETE FROM sqlite_sequence WHERE name = 'turnos'");
  db.exec('UPDATE tipos_servicio SET activo = 1');
});

afterAll(() => {
  delete process.env.IGNORAR_HORARIO;
});

describe('GET /api/turnos/servicios', () => {
  test('lista solo los servicios activos', async () => {
    db.prepare('UPDATE tipos_servicio SET activo = 0 WHERE id = 3').run();
    const res = await request(app).get('/api/turnos/servicios');
    expect(res.status).toBe(200);
    expect(res.body.servicios.map((s) => s.id)).toEqual([1, 2]);
    expect(res.body.servicios[0]).toEqual(
      expect.objectContaining({ nombre: expect.any(String), prefijo: expect.any(String) })
    );
  });
});

describe('POST /api/turnos', () => {
  test('crea un turno en estado esperando con prioridad normal y código con prefijo', async () => {
    const res = await request(app).post('/api/turnos').send({ tipo_servicio_id: 2 });
    expect(res.status).toBe(201);
    expect(res.body.estado).toBe('esperando');
    expect(res.body.prioridad).toBe('normal');
    expect(res.body.codigo).toBe('T-001');
    expect(res.body.servicio.nombre).toBe('Trámite');
    expect(res.body.mostrador).toBeNull();
  });

  test('el consecutivo del día es compartido entre servicios y no se repite', async () => {
    const a = await request(app).post('/api/turnos').send({ tipo_servicio_id: 1 });
    const b = await request(app).post('/api/turnos').send({ tipo_servicio_id: 2 });
    const c = await request(app).post('/api/turnos').send({ tipo_servicio_id: 1 });
    expect([a.body.codigo, b.body.codigo, c.body.codigo]).toEqual(['C-001', 'T-002', 'C-003']);
  });

  test('solicitudes simultáneas reciben números distintos', async () => {
    const respuestas = await Promise.all(
      Array.from({ length: 20 }, () => request(app).post('/api/turnos').send({ tipo_servicio_id: 3 }))
    );
    const numeros = respuestas.map((r) => r.body.numero).sort((x, y) => x - y);
    expect(numeros).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
  });

  test('no guarda datos personales ni acepta cambiar prioridad o estado', async () => {
    const res = await request(app).post('/api/turnos').send({
      tipo_servicio_id: 1,
      nombre: 'Juan Pérez',
      telefono: '5555-5555',
      correo: 'juan@correo.com',
      prioridad: 'preferencial',
      estado: 'atendido',
    });
    expect(res.status).toBe(201);
    expect(res.body.prioridad).toBe('normal');
    expect(res.body.estado).toBe('esperando');
    expect(JSON.stringify(res.body)).not.toMatch(/Juan|5555|correo/);

    const columnas = db.prepare('PRAGMA table_info(turnos)').all().map((c) => c.name);
    expect(columnas).not.toEqual(expect.arrayContaining(['nombre']));
    expect(columnas).not.toEqual(expect.arrayContaining(['telefono']));
    expect(columnas).not.toEqual(expect.arrayContaining(['correo']));
  });

  test('rechaza servicio ausente, inexistente o inactivo sin crear turno', async () => {
    db.prepare('UPDATE tipos_servicio SET activo = 0 WHERE id = 3').run();
    const casos = [{}, { tipo_servicio_id: 'abc' }, { tipo_servicio_id: 999 }, { tipo_servicio_id: 3 }];
    for (const cuerpo of casos) {
      const res = await request(app).post('/api/turnos').send(cuerpo);
      expect(res.status).toBe(400);
      expect(res.body.codigo).toBe('SERVICIO_INVALIDO');
    }
    const { total } = db.prepare('SELECT COUNT(*) AS total FROM turnos').get();
    expect(total).toBe(0);
  });

  test('fuera del horario de atención no crea turno', async () => {
    delete process.env.IGNORAR_HORARIO;
    db.exec('UPDATE horarios_atencion SET activo = 0');
    const res = await request(app).post('/api/turnos').send({ tipo_servicio_id: 1 });
    expect(res.status).toBe(409);
    expect(res.body.codigo).toBe('FUERA_DE_HORARIO');
    const { total } = db.prepare('SELECT COUNT(*) AS total FROM turnos').get();
    expect(total).toBe(0);
    db.exec('UPDATE horarios_atencion SET activo = 1');
  });
});

describe('GET /api/turnos/:id', () => {
  test('devuelve el turno creado', async () => {
    const creado = await request(app).post('/api/turnos').send({ tipo_servicio_id: 1 });
    const res = await request(app).get(`/api/turnos/${creado.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.codigo).toBe('C-001');
    expect(res.body.es_de_hoy).toBe(true);
  });

  test('devuelve 404 si el turno no existe', async () => {
    const res = await request(app).get('/api/turnos/9999');
    expect(res.status).toBe(404);
    expect(res.body.codigo).toBe('TURNO_NO_ENCONTRADO');
  });
});

describe('Cancelar turno y actualizar la fila', () => {

  async function crearTurnoDePrueba() {
    const respuesta = await request(app)
      .post('/api/turnos')
      .send({ tipo_servicio_id: 1 });

    expect(respuesta.status).toBe(201);
    return respuesta.body;
  }

  test('genera un token privado al crear el turno', async () => {
    const turno = await crearTurnoDePrueba();

    expect(turno.token_cancelacion).toMatch(/^[a-f0-9]{64}$/);

    const registro = db.prepare(
      'SELECT token_cancelacion_hash FROM turnos WHERE id = ?'
    ).get(turno.id);

    expect(registro.token_cancelacion_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(registro.token_cancelacion_hash).not.toBe(
      turno.token_cancelacion
    );
  });

  test('no expone el token al consultar un turno', async () => {
    const turno = await crearTurnoDePrueba();

    const respuesta = await request(app)
      .get(`/api/turnos/${turno.id}`);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).not.toHaveProperty('token_cancelacion');
    expect(respuesta.body).not.toHaveProperty('token_cancelacion_hash');
  });

  test('cancela un turno en espera con el token correcto', async () => {
    const turno = await crearTurnoDePrueba();

    const respuesta = await request(app)
      .patch(`/api/turnos/${turno.id}/cancelar`)
      .send({
        token_cancelacion: turno.token_cancelacion,
      });

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.turno.estado).toBe('cancelado');

    const registro = db.prepare(
      'SELECT estado FROM turnos WHERE id = ?'
    ).get(turno.id);

    expect(registro.estado).toBe('cancelado');
  });

  test('rechaza la cancelación sin token', async () => {
    const turno = await crearTurnoDePrueba();

    const respuesta = await request(app)
      .patch(`/api/turnos/${turno.id}/cancelar`)
      .send({});

    expect(respuesta.status).toBe(403);
    expect(respuesta.body.codigo).toBe(
      'TOKEN_CANCELACION_INVALIDO'
    );

    const registro = db.prepare(
      'SELECT estado FROM turnos WHERE id = ?'
    ).get(turno.id);

    expect(registro.estado).toBe('esperando');
  });

  test('rechaza la cancelación con un token incorrecto', async () => {
    const turno = await crearTurnoDePrueba();

    const respuesta = await request(app)
      .patch(`/api/turnos/${turno.id}/cancelar`)
      .send({
        token_cancelacion: 'a'.repeat(64),
      });

    expect(respuesta.status).toBe(403);
    expect(respuesta.body.codigo).toBe(
      'TOKEN_CANCELACION_INVALIDO'
    );

    const registro = db.prepare(
      'SELECT estado FROM turnos WHERE id = ?'
    ).get(turno.id);

    expect(registro.estado).toBe('esperando');
  });

  test('no permite cancelar dos veces el mismo turno', async () => {
    const turno = await crearTurnoDePrueba();

    const url = `/api/turnos/${turno.id}/cancelar`;
    const datos = {
      token_cancelacion: turno.token_cancelacion,
    };

    const primera = await request(app)
      .patch(url)
      .send(datos);

    const segunda = await request(app)
      .patch(url)
      .send(datos);

    expect(primera.status).toBe(200);
    expect(segunda.status).toBe(409);
    expect(segunda.body.codigo).toBe(
      'CANCELACION_NO_PERMITIDA'
    );
  });

  test('no permite cancelar un turno atendido', async () => {
    const turno = await crearTurnoDePrueba();

    db.prepare(
      "UPDATE turnos SET estado = 'atendido' WHERE id = ?"
    ).run(turno.id);

    const respuesta = await request(app)
      .patch(`/api/turnos/${turno.id}/cancelar`)
      .send({
        token_cancelacion: turno.token_cancelacion,
      });

    expect(respuesta.status).toBe(409);
    expect(respuesta.body.codigo).toBe(
      'CANCELACION_NO_PERMITIDA'
    );

    const registro = db.prepare(
      'SELECT estado FROM turnos WHERE id = ?'
    ).get(turno.id);

    expect(registro.estado).toBe('atendido');
  });

  test('devuelve 404 cuando el turno no existe', async () => {
    const respuesta = await request(app)
      .patch('/api/turnos/9999/cancelar')
      .send({
        token_cancelacion: 'a'.repeat(64),
      });

    expect(respuesta.status).toBe(404);
    expect(respuesta.body.codigo).toBe(
      'TURNO_NO_ENCONTRADO'
    );
  });

  test('excluye los turnos cancelados de la fila de recepción', async () => {
    const turnoCancelado = await crearTurnoDePrueba();
    const turnoEnEspera = await crearTurnoDePrueba();

    const cancelacion = await request(app)
      .patch(`/api/turnos/${turnoCancelado.id}/cancelar`)
      .send({
        token_cancelacion: turnoCancelado.token_cancelacion,
      });

    expect(cancelacion.status).toBe(200);

    const respuesta = await request(app)
      .get('/api/recepcion/fila')
      .query({ mostrador_id: 1 });

    expect(respuesta.status).toBe(200);

    const ids = respuesta.body.fila.map((turno) => turno.id);

    expect(ids).not.toContain(turnoCancelado.id);
    expect(ids).toContain(turnoEnEspera.id);
  });

  test('no reutiliza el número de un turno cancelado', async () => {
    const primero = await crearTurnoDePrueba();

    const cancelacion = await request(app)
      .patch(`/api/turnos/${primero.id}/cancelar`)
      .send({
        token_cancelacion: primero.token_cancelacion,
      });

    expect(cancelacion.status).toBe(200);

    const segundo = await crearTurnoDePrueba();

    expect(primero.numero).toBe(1);
    expect(segundo.numero).toBe(2);
  });

});