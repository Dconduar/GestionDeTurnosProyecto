process.env.DB_PATH = ':memory:';

const request = require('supertest');
const app = require('../src/server/app');
const db = require('../src/server/db');

async function entrarComo(usuario, contrasena) {
  const agente = request.agent(app);
  await agente.post('/api/admin/login').send({ usuario, contrasena });
  return agente;
}

let admin;
beforeAll(async () => {
  admin = await entrarComo('admin', 'admin123');
});

describe('Permisos', () => {
  test('sin sesión no se puede configurar nada', async () => {
    expect((await request(app).get('/api/admin/servicios')).status).toBe(401);
    expect((await request(app).get('/api/admin/mostradores')).status).toBe(401);
    expect((await request(app).get('/api/admin/horarios')).status).toBe(401);
  });

  test('un recepcionista no puede configurar', async () => {
    const recepcion = await entrarComo('recepcion1', 'recepcion123');
    expect((await recepcion.get('/api/admin/servicios')).status).toBe(403);
    expect((await recepcion.post('/api/admin/mostradores').send({ nombre: 'X', servicios: [1] })).status).toBe(403);
    expect((await recepcion.put('/api/admin/horarios').send({ horarios: [] })).status).toBe(403);
  });
});

describe('Servicios', () => {
  test('lista los servicios de ejemplo', async () => {
    const res = await admin.get('/api/admin/servicios');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(3);
    expect(res.body[0]).toHaveProperty('prefijo');
  });

  test('crea un servicio y el prefijo se guarda en mayúsculas', async () => {
    const res = await admin.post('/api/admin/servicios').send({ nombre: 'Atención preferencial', prefijo: 'ap', duracion_estimada_min: 12 });
    expect(res.status).toBe(201);
    expect(res.body.prefijo).toBe('AP');
    expect(res.body.activo).toBe(true);
  });

  test('rechaza datos inválidos', async () => {
    const sinNombre = await admin.post('/api/admin/servicios').send({ prefijo: 'Z' });
    const prefijoLargo = await admin.post('/api/admin/servicios').send({ nombre: 'Otro', prefijo: 'ABCD' });
    const duracionMala = await admin.post('/api/admin/servicios').send({ nombre: 'Otro', prefijo: 'O', duracion_estimada_min: 0 });
    expect(sinNombre.status).toBe(400);
    expect(prefijoLargo.status).toBe(400);
    expect(duracionMala.status).toBe(400);
  });

  test('rechaza un prefijo o nombre repetido', async () => {
    const res = await admin.post('/api/admin/servicios').send({ nombre: 'Distinto', prefijo: 'T' });
    expect(res.status).toBe(409);
  });

  test('edita un servicio', async () => {
    const creado = await admin.post('/api/admin/servicios').send({ nombre: 'Para editar', prefijo: 'PE' });
    const res = await admin.patch(`/api/admin/servicios/${creado.body.id}`).send({ nombre: 'Ya editado', duracion_estimada_min: 20 });
    expect(res.status).toBe(200);
    expect(res.body.nombre).toBe('Ya editado');
    expect(res.body.duracion_estimada_min).toBe(20);
  });

  test('un servicio inexistente da 404', async () => {
    expect((await admin.patch('/api/admin/servicios/9999').send({ nombre: 'X' })).status).toBe(404);
  });

  test('un servicio desactivado deja de ofrecerse al cliente', async () => {
    const creado = await admin.post('/api/admin/servicios').send({ nombre: 'Temporal', prefijo: 'TM' });
    const antes = await request(app).get('/api/turnos/servicios');
    expect(antes.body.servicios.map((s) => s.id)).toContain(creado.body.id);

    const res = await admin.patch(`/api/admin/servicios/${creado.body.id}`).send({ activo: false });
    expect(res.body.activo).toBe(false);

    const despues = await request(app).get('/api/turnos/servicios');
    expect(despues.body.servicios.map((s) => s.id)).not.toContain(creado.body.id);
  });

  test('no se desactiva un servicio con turnos de hoy en espera', async () => {
    const creado = await admin.post('/api/admin/servicios').send({ nombre: 'Con fila', prefijo: 'CF' });
    db.prepare('INSERT INTO turnos (numero, tipo_servicio_id) VALUES (900, ?)').run(creado.body.id);
    const res = await admin.patch(`/api/admin/servicios/${creado.body.id}`).send({ activo: false });
    expect(res.status).toBe(409);
  });
});

describe('Mostradores', () => {
  test('lista los mostradores con sus servicios', async () => {
    const res = await admin.get('/api/admin/mostradores');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body[0].servicios)).toBe(true);
  });

  test('crea un mostrador con sus servicios', async () => {
    const res = await admin.post('/api/admin/mostradores').send({ nombre: 'Mostrador 3', servicios: [1, 3] });
    expect(res.status).toBe(201);
    expect(res.body.servicios).toEqual([1, 3]);
  });

  test('exige al menos un servicio y que existan', async () => {
    expect((await admin.post('/api/admin/mostradores').send({ nombre: 'Sin servicios', servicios: [] })).status).toBe(400);
    expect((await admin.post('/api/admin/mostradores').send({ nombre: 'Servicio falso', servicios: [9999] })).status).toBe(400);
  });

  test('rechaza un nombre repetido', async () => {
    expect((await admin.post('/api/admin/mostradores').send({ nombre: 'Mostrador 1', servicios: [1] })).status).toBe(409);
  });

  test('cambia los servicios que atiende un mostrador', async () => {
    const creado = await admin.post('/api/admin/mostradores').send({ nombre: 'Para cambiar', servicios: [1] });
    const res = await admin.patch(`/api/admin/mostradores/${creado.body.id}`).send({ servicios: [2, 3] });
    expect(res.status).toBe(200);
    expect(res.body.servicios).toEqual([2, 3]);
  });

  test('un mostrador desactivado deja de aparecer en el panel del recepcionista', async () => {
    const creado = await admin.post('/api/admin/mostradores').send({ nombre: 'Se apaga', servicios: [1] });
    await admin.patch(`/api/admin/mostradores/${creado.body.id}`).send({ activo: false });
    const fila = await admin.get('/api/recepcion/fila?mostrador_id=1');
    expect(fila.status).toBe(200);
    expect(fila.body.mostradores.map((m) => m.id)).not.toContain(creado.body.id);
  });

  test('no se desactiva un mostrador que está atendiendo un turno', async () => {
    const creado = await admin.post('/api/admin/mostradores').send({ nombre: 'Ocupado', servicios: [1] });
    db.prepare("INSERT INTO turnos (numero, tipo_servicio_id, estado, mostrador_id) VALUES (901, 1, 'en_atencion', ?)").run(creado.body.id);
    const res = await admin.patch(`/api/admin/mostradores/${creado.body.id}`).send({ activo: false });
    expect(res.status).toBe(409);
  });
});

describe('Horarios', () => {
  const hoy = new Date().getDay();

  test('lista los horarios', async () => {
    const res = await admin.get('/api/admin/horarios');
    expect(res.status).toBe(200);
    expect(res.body[0]).toHaveProperty('hora_inicio');
  });

  test('guarda un horario nuevo y reemplaza el anterior', async () => {
    const nuevo = [
      { dia_semana: 1, hora_inicio: '07:30', hora_fin: '12:00', activo: true },
      { dia_semana: 1, hora_inicio: '13:00', hora_fin: '16:30', activo: true },
    ];
    const res = await admin.put('/api/admin/horarios').send({ horarios: nuevo });
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].hora_inicio).toBe('07:30');
  });

  test('rechaza horas mal escritas, invertidas, días fuera de rango y solapes, sin cambiar lo guardado', async () => {
    const antes = (await admin.get('/api/admin/horarios')).body;
    const malas = [
      [{ dia_semana: 1, hora_inicio: '8:00', hora_fin: '17:00' }],
      [{ dia_semana: 1, hora_inicio: '17:00', hora_fin: '08:00' }],
      [{ dia_semana: 9, hora_inicio: '08:00', hora_fin: '17:00' }],
      [
        { dia_semana: 2, hora_inicio: '08:00', hora_fin: '12:00' },
        { dia_semana: 2, hora_inicio: '11:00', hora_fin: '15:00' },
      ],
    ];
    for (const horarios of malas) {
      expect((await admin.put('/api/admin/horarios').send({ horarios })).status).toBe(400);
    }
    expect((await admin.get('/api/admin/horarios')).body).toEqual(antes);
  });

  test('el horario guardado decide si hay atención abierta', async () => {
    delete process.env.IGNORAR_HORARIO;
    await admin.put('/api/admin/horarios').send({ horarios: [{ dia_semana: hoy, hora_inicio: '00:00', hora_fin: '23:59', activo: true }] });
    expect((await request(app).get('/api/turnos/servicios')).body.abierto).toBe(true);

    await admin.put('/api/admin/horarios').send({ horarios: [] });
    expect((await request(app).get('/api/turnos/servicios')).body.abierto).toBe(false);
  });
});