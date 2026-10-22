process.env.DB_PATH = ':memory:';

const request = require('supertest');
const app = require('../src/server/app');
const db = require('../src/server/db');

describe('Login y roles', () => {
  test('rechaza un inicio de sesión sin datos', async () => {
    const res = await request(app).post('/api/admin/login').send({});
    expect(res.status).toBe(400);
  });

  test('rechaza contraseña incorrecta y usuario inexistente con el mismo mensaje', async () => {
    const mala = await request(app).post('/api/admin/login').send({ usuario: 'admin', contrasena: 'mala' });
    const nadie = await request(app).post('/api/admin/login').send({ usuario: 'nadie', contrasena: 'x' });
    expect(mala.status).toBe(401);
    expect(nadie.status).toBe(401);
    expect(mala.body.error).toBe(nadie.body.error);
  });

  test('el administrador inicia sesión y consulta su sesión', async () => {
    const agente = request.agent(app);
    const login = await agente.post('/api/admin/login').send({ usuario: 'admin', contrasena: 'admin123' });
    expect(login.status).toBe(200);
    expect(login.body.rol).toBe('administrador');

    const sesion = await agente.get('/api/admin/sesion');
    expect(sesion.status).toBe(200);
    expect(sesion.body.nombre).toBe('admin');
  });

  test('sin iniciar sesión no se accede a la sesión ni a las rutas de administración', async () => {
    expect((await request(app).get('/api/admin/sesion')).status).toBe(401);
    expect((await request(app).get('/api/admin/servicios')).status).toBe(401);
  });

  test('un recepcionista entra con su mostrador pero no a administración', async () => {
    const agente = request.agent(app);
    const login = await agente.post('/api/admin/login').send({ usuario: 'recepcion1', contrasena: 'recepcion123' });
    expect(login.status).toBe(200);
    expect(login.body.rol).toBe('recepcionista');
    expect(login.body.mostrador_id).toBe(1);
    expect((await agente.get('/api/admin/servicios')).status).toBe(403);
  });

  test('el administrador sí pasa la protección de rol', async () => {
    const agente = request.agent(app);
    await agente.post('/api/admin/login').send({ usuario: 'admin', contrasena: 'admin123' });
    const res = await agente.get('/api/admin/servicios');
    expect([401, 403]).not.toContain(res.status);
  });

  test('cerrar sesión quita el acceso', async () => {
    const agente = request.agent(app);
    await agente.post('/api/admin/login').send({ usuario: 'admin', contrasena: 'admin123' });
    await agente.post('/api/admin/logout');
    expect((await agente.get('/api/admin/sesion')).status).toBe(401);
  });

  test('un usuario desactivado no puede entrar', async () => {
    db.prepare("UPDATE usuarios SET activo = 0 WHERE nombre_usuario = 'recepcion2'").run();
    const res = await request(app).post('/api/admin/login').send({ usuario: 'recepcion2', contrasena: 'recepcion123' });
    expect(res.status).toBe(401);
  });

  test('las contraseñas se guardan con hash, no en texto plano', () => {
    const { contrasena_hash } = db.prepare("SELECT contrasena_hash FROM usuarios WHERE nombre_usuario = 'admin'").get();
    expect(contrasena_hash).not.toBe('admin123');
    expect(contrasena_hash.startsWith('$2')).toBe(true);
  });
});