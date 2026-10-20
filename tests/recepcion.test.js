process.env.DB_PATH = ':memory:';

const request = require('supertest');
const app = require('../src/server/app');
const db = require('../src/server/db');

function crearTurno(servicioId, prioridad = 'normal') {
  const { siguiente } = db
    .prepare("SELECT COALESCE(MAX(numero), 0) + 1 AS siguiente FROM turnos WHERE fecha = date('now', 'localtime')")
    .get();
  const info = db
    .prepare('INSERT INTO turnos (numero, tipo_servicio_id, prioridad) VALUES (?, ?, ?)')
    .run(siguiente, servicioId, prioridad);
  return Number(info.lastInsertRowid);
}

beforeEach(() => {
  process.env.IGNORAR_HORARIO = '1';
  db.exec('DELETE FROM llamados; DELETE FROM turnos;');
  db.exec("DELETE FROM sqlite_sequence WHERE name IN ('turnos', 'llamados')");
  db.exec("UPDATE configuracion SET valor = '3' WHERE clave = 'max_llamados'");
});

afterAll(() => {
  delete process.env.IGNORAR_HORARIO;
});

describe('POST /api/recepcion/llamar-siguiente', () => {
  test('llama primero al preferencial y luego por orden de llegada', async () => {
    crearTurno(1);
    const preferencial = crearTurno(2, 'preferencial');
    crearTurno(1);

    const primero = await request(app).post('/api/recepcion/llamar-siguiente').send({ mostrador_id: 1 });
    expect(primero.status).toBe(201);
    expect(primero.body.id).toBe(preferencial);
    expect(primero.body.estado).toBe('en_atencion');
    expect(primero.body.mostrador).toBe('Mostrador 1');
    expect(primero.body.llamados).toBe(1);
    expect(primero.body.inicio_atencion).toEqual(expect.any(String));
  });

  test('toma el primer turno en espera por número cuando no hay preferenciales', async () => {
    const a = crearTurno(1);
    crearTurno(2);
    const res = await request(app).post('/api/recepcion/llamar-siguiente').send({ mostrador_id: 1 });
    expect(res.body.id).toBe(a);
    expect(res.body.codigo).toBe('C-001');
  });

  test('solo toma turnos de los servicios que atiende el mostrador', async () => {
    crearTurno(1);
    const pago = crearTurno(3);
    const res = await request(app).post('/api/recepcion/llamar-siguiente').send({ mostrador_id: 2 });
    expect(res.status).toBe(201);
    expect(res.body.id).toBe(pago);
  });

  test('registra el llamado y guarda el mostrador en el turno', async () => {
    const id = crearTurno(1);
    await request(app).post('/api/recepcion/llamar-siguiente').send({ mostrador_id: 1 });
    const turno = db.prepare('SELECT estado, mostrador_id, inicio_atencion FROM turnos WHERE id = ?').get(id);
    expect(turno.estado).toBe('en_atencion');
    expect(turno.mostrador_id).toBe(1);
    expect(turno.inicio_atencion).not.toBeNull();
    const llamados = db.prepare('SELECT mostrador_id FROM llamados WHERE turno_id = ?').all(id);
    expect(llamados).toEqual([{ mostrador_id: 1 }]);
  });

  test('usa el mostrador 1 si no se indica uno', async () => {
    crearTurno(1);
    const res = await request(app).post('/api/recepcion/llamar-siguiente').send({});
    expect(res.status).toBe(201);
    expect(res.body.mostrador).toBe('Mostrador 1');
  });

  test('responde 409 si la fila está vacía', async () => {
    const res = await request(app).post('/api/recepcion/llamar-siguiente').send({ mostrador_id: 1 });
    expect(res.status).toBe(409);
    expect(res.body.codigo).toBe('FILA_VACIA');
  });

  test('no permite llamar a otro mientras haya uno en atención en el mismo mostrador', async () => {
    crearTurno(1);
    crearTurno(1);
    await request(app).post('/api/recepcion/llamar-siguiente').send({ mostrador_id: 1 });
    const res = await request(app).post('/api/recepcion/llamar-siguiente').send({ mostrador_id: 1 });
    expect(res.status).toBe(409);
    expect(res.body.codigo).toBe('YA_HAY_TURNO_EN_ATENCION');
  });

  test('dos mostradores no se llevan el mismo turno', async () => {
    crearTurno(2);
    crearTurno(2);
    const a = await request(app).post('/api/recepcion/llamar-siguiente').send({ mostrador_id: 1 });
    const b = await request(app).post('/api/recepcion/llamar-siguiente').send({ mostrador_id: 2 });
    expect(a.body.id).not.toBe(b.body.id);
  });

  test('rechaza un mostrador inexistente', async () => {
    const res = await request(app).post('/api/recepcion/llamar-siguiente').send({ mostrador_id: 99 });
    expect(res.status).toBe(400);
    expect(res.body.codigo).toBe('MOSTRADOR_INVALIDO');
  });

  test('fuera del horario de atención no llama a nadie', async () => {
    delete process.env.IGNORAR_HORARIO;
    db.exec('UPDATE horarios_atencion SET activo = 0');
    const id = crearTurno(1);
    const res = await request(app).post('/api/recepcion/llamar-siguiente').send({ mostrador_id: 1 });
    db.exec('UPDATE horarios_atencion SET activo = 1');
    expect(res.status).toBe(409);
    expect(res.body.codigo).toBe('FUERA_DE_HORARIO');
    expect(db.prepare('SELECT estado FROM turnos WHERE id = ?').get(id).estado).toBe('esperando');
  });
});

describe('llamados y no asistió', () => {
  async function turnoLlamado() {
    const id = crearTurno(1);
    await request(app).post('/api/recepcion/llamar-siguiente').send({ mostrador_id: 1 });
    return id;
  }

  test('volver a llamar suma un llamado', async () => {
    const id = await turnoLlamado();
    const res = await request(app).post(`/api/recepcion/turnos/${id}/llamar`).send({ mostrador_id: 1 });
    expect(res.status).toBe(200);
    expect(res.body.llamados).toBe(2);
    expect(res.body.puede_marcar_no_asistio).toBe(false);
  });

  test('no se puede llamar más veces que el máximo configurado', async () => {
    const id = await turnoLlamado();
    await request(app).post(`/api/recepcion/turnos/${id}/llamar`).send({ mostrador_id: 1 });
    const tercero = await request(app).post(`/api/recepcion/turnos/${id}/llamar`).send({ mostrador_id: 1 });
    expect(tercero.body.llamados).toBe(3);
    expect(tercero.body.puede_marcar_no_asistio).toBe(true);
    const cuarto = await request(app).post(`/api/recepcion/turnos/${id}/llamar`).send({ mostrador_id: 1 });
    expect(cuarto.status).toBe(409);
    expect(cuarto.body.codigo).toBe('MAXIMO_LLAMADOS');
    const { total } = db.prepare('SELECT COUNT(*) AS total FROM llamados WHERE turno_id = ?').get(id);
    expect(total).toBe(3);
  });

  test('no se puede marcar no asistió antes de completar los llamados', async () => {
    const id = await turnoLlamado();
    const res = await request(app).patch(`/api/recepcion/turnos/${id}/no-asistio`).send({ mostrador_id: 1 });
    expect(res.status).toBe(409);
    expect(res.body.codigo).toBe('LLAMADOS_INSUFICIENTES');
    expect(db.prepare('SELECT estado FROM turnos WHERE id = ?').get(id).estado).toBe('en_atencion');
  });

  test('tras los llamados máximos el turno pasa a no_asistio y la fila sigue', async () => {
    const id = await turnoLlamado();
    const siguiente = crearTurno(1);
    await request(app).post(`/api/recepcion/turnos/${id}/llamar`).send({ mostrador_id: 1 });
    await request(app).post(`/api/recepcion/turnos/${id}/llamar`).send({ mostrador_id: 1 });

    const res = await request(app).patch(`/api/recepcion/turnos/${id}/no-asistio`).send({ mostrador_id: 1 });
    expect(res.status).toBe(200);
    expect(res.body.estado).toBe('no_asistio');

    const llamada = await request(app).post('/api/recepcion/llamar-siguiente').send({ mostrador_id: 1 });
    expect(llamada.status).toBe(201);
    expect(llamada.body.id).toBe(siguiente);
  });

  test('el máximo de llamados sale de la configuración', async () => {
    db.exec("UPDATE configuracion SET valor = '2' WHERE clave = 'max_llamados'");
    const id = await turnoLlamado();
    const segundo = await request(app).post(`/api/recepcion/turnos/${id}/llamar`).send({ mostrador_id: 1 });
    expect(segundo.body.max_llamados).toBe(2);
    expect(segundo.body.puede_marcar_no_asistio).toBe(true);
    const res = await request(app).patch(`/api/recepcion/turnos/${id}/no-asistio`).send({ mostrador_id: 1 });
    expect(res.status).toBe(200);
  });

  test('no se puede operar un turno de otro mostrador ni uno que no está en atención', async () => {
    const id = await turnoLlamado();
    const otro = await request(app).post(`/api/recepcion/turnos/${id}/llamar`).send({ mostrador_id: 2 });
    expect(otro.status).toBe(409);
    expect(otro.body.codigo).toBe('TURNO_NO_LLAMABLE');

    const enEspera = crearTurno(1);
    const res = await request(app).patch(`/api/recepcion/turnos/${enEspera}/no-asistio`).send({ mostrador_id: 1 });
    expect(res.status).toBe(409);
    expect(res.body.codigo).toBe('TURNO_NO_LLAMABLE');
  });

  test('responde 404 si el turno no existe', async () => {
    const res = await request(app).post('/api/recepcion/turnos/9999/llamar').send({ mostrador_id: 1 });
    expect(res.status).toBe(404);
    expect(res.body.codigo).toBe('TURNO_NO_ENCONTRADO');
  });
});

describe('GET /api/recepcion/fila', () => {
  test('muestra la fila ordenada, el turno en atención y los otros mostradores', async () => {
    crearTurno(2);
    crearTurno(2, 'preferencial');
    crearTurno(1);
    crearTurno(3);
    await request(app).post('/api/recepcion/llamar-siguiente').send({ mostrador_id: 2 });

    const res = await request(app).get('/api/recepcion/fila?mostrador_id=1');
    expect(res.status).toBe(200);
    expect(res.body.abierto).toBe(true);
    expect(res.body.mostrador).toEqual({ id: 1, nombre: 'Mostrador 1' });
    expect(res.body.mostradores).toHaveLength(2);
    expect(res.body.en_atencion).toBeNull();
    expect(res.body.fila.map((t) => t.codigo)).toEqual(['T-001', 'C-003']);
    expect(res.body.otros_mostradores.map((t) => t.codigo)).toEqual(['T-002']);
    expect(res.body.otros_mostradores[0].mostrador).toBe('Mostrador 2');
    expect(res.body.puede_llamar).toBe(true);
  });

  test('indica el turno en atención del mostrador y no permite llamar otro', async () => {
    crearTurno(1);
    crearTurno(1);
    await request(app).post('/api/recepcion/llamar-siguiente').send({ mostrador_id: 1 });
    const res = await request(app).get('/api/recepcion/fila?mostrador_id=1');
    expect(res.body.en_atencion.codigo).toBe('C-001');
    expect(res.body.en_atencion.llamados).toBe(1);
    expect(res.body.fila).toHaveLength(1);
    expect(res.body.puede_llamar).toBe(false);
  });

  test('sigue respondiendo fuera de horario e indica que está cerrado', async () => {
    delete process.env.IGNORAR_HORARIO;
    db.exec('UPDATE horarios_atencion SET activo = 0');
    crearTurno(1);
    const res = await request(app).get('/api/recepcion/fila');
    db.exec('UPDATE horarios_atencion SET activo = 1');
    expect(res.status).toBe(200);
    expect(res.body.abierto).toBe(false);
    expect(res.body.puede_llamar).toBe(false);
  });

  test('rechaza un mostrador inválido', async () => {
    const res = await request(app).get('/api/recepcion/fila?mostrador_id=abc');
    expect(res.status).toBe(400);
    expect(res.body.codigo).toBe('MOSTRADOR_INVALIDO');
  });
});
