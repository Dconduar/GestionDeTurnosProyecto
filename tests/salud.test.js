process.env.DB_PATH = ':memory:';

const request = require('supertest');
const app = require('../src/server/app');
const db = require('../src/server/db');

describe('Esqueleto del proyecto', () => {
  test('GET /api/salud responde ok', async () => {
    const res = await request(app).get('/api/salud');
    expect(res.status).toBe(200);
    expect(res.body.estado).toBe('ok');
  });

  test('el esquema crea las tablas del modelo de datos', () => {
    const nombres = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all()
      .map((t) => t.name);
    for (const tabla of ['usuarios', 'tipos_servicio', 'mostradores', 'mostrador_servicio',
                         'horarios_atencion', 'configuracion', 'turnos', 'llamados']) {
      expect(nombres).toContain(tabla);
    }
  });

  test('se cargan los datos de ejemplo y la configuración', () => {
    const { total } = db.prepare('SELECT COUNT(*) AS total FROM tipos_servicio').get();
    expect(total).toBeGreaterThan(0);
    const max = db.prepare("SELECT valor FROM configuracion WHERE clave = 'max_llamados'").get();
    expect(max.valor).toBe('3');
  });

  test('una ruta /api inexistente devuelve 404 en JSON', async () => {
    const res = await request(app).get('/api/no-existe');
    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });
});
