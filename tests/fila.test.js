process.env.DB_PATH = ':memory:';

const request = require('supertest');
const app = require('../src/server/app');
const db = require('../src/server/db');

function insertar({ numero, servicio, prioridad = 'normal', estado = 'esperando', mostrador = null, fecha }) {
  const info = db
    .prepare(
      `INSERT INTO turnos (numero, tipo_servicio_id, prioridad, estado, mostrador_id, fecha)
       VALUES (?, ?, ?, ?, ?, COALESCE(?, date('now', 'localtime')))`
    )
    .run(numero, servicio, prioridad, estado, mostrador, fecha || null);
  return Number(info.lastInsertRowid);
}

const fila = (turno) => request(app).get('/api/turnos/fila' + (turno ? `?turno=${turno}` : ''));

beforeEach(() => {
  db.exec('DELETE FROM llamados; DELETE FROM turnos;');
  db.exec("DELETE FROM sqlite_sequence WHERE name = 'turnos'");
  db.exec('UPDATE mostradores SET activo = 1');
});

describe('GET /api/turnos/fila', () => {
  test('sin turnos devuelve la fila vacía y no usa caché', async () => {
    const res = await fila();
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.body).toEqual({ en_atencion: [], esperando_total: 0, por_servicio: [], mi_turno: null });
  });

  test('muestra los turnos en atención con su mostrador y cuenta los que esperan', async () => {
    const m1 = db.prepare('SELECT id, nombre FROM mostradores ORDER BY id').get();
    insertar({ numero: 1, servicio: 1, estado: 'en_atencion', mostrador: m1.id });
    insertar({ numero: 2, servicio: 1 });
    insertar({ numero: 3, servicio: 2 });
    insertar({ numero: 4, servicio: 1, estado: 'atendido', mostrador: m1.id });

    const res = await fila();
    expect(res.body.en_atencion).toEqual([
      { codigo: 'C-001', servicio: expect.any(String), mostrador: m1.nombre },
    ]);
    expect(res.body.esperando_total).toBe(2);
  });

  test('no expone datos personales ni ids internos de otros turnos', async () => {
    insertar({ numero: 1, servicio: 1, estado: 'en_atencion', mostrador: 1 });
    const res = await fila();
    expect(Object.keys(res.body.en_atencion[0]).sort()).toEqual(['codigo', 'mostrador', 'servicio']);
  });

  test('cuántos turnos van antes: por orden de llegada', async () => {
    insertar({ numero: 1, servicio: 1 });
    insertar({ numero: 2, servicio: 1 });
    const mio = insertar({ numero: 3, servicio: 1 });
    const res = await fila(mio);
    expect(res.body.mi_turno).toEqual(
      expect.objectContaining({ id: mio, codigo: 'C-003', estado: 'esperando', delante: 2 })
    );
  });

  test('los preferenciales pasan antes que los normales aunque lleguen después', async () => {
    const normal = insertar({ numero: 1, servicio: 1 });
    const pref = insertar({ numero: 2, servicio: 1, prioridad: 'preferencial' });
    expect((await fila(pref)).body.mi_turno.delante).toBe(0);
    expect((await fila(normal)).body.mi_turno.delante).toBe(1);
  });

  test('un preferencial no pasa delante de otro preferencial que llegó antes', async () => {
    insertar({ numero: 1, servicio: 1, prioridad: 'preferencial' });
    const segundo = insertar({ numero: 2, servicio: 1, prioridad: 'preferencial' });
    expect((await fila(segundo)).body.mi_turno.delante).toBe(1);
  });

  test('solo cuentan los turnos que un mismo mostrador puede atender', async () => {
    insertar({ numero: 1, servicio: 3 });
    const mio = insertar({ numero: 2, servicio: 1 });
    expect((await fila(mio)).body.mi_turno.delante).toBe(0);
  });

  test('el servicio compartido (2) sí cuenta para ambos lados', async () => {
    insertar({ numero: 1, servicio: 2 });
    const mio = insertar({ numero: 2, servicio: 1 });
    expect((await fila(mio)).body.mi_turno.delante).toBe(1);
  });

  test('los turnos atendidos, cancelados o en atención no cuentan como "antes"', async () => {
    insertar({ numero: 1, servicio: 1, estado: 'atendido' });
    insertar({ numero: 2, servicio: 1, estado: 'cancelado' });
    insertar({ numero: 3, servicio: 1, estado: 'en_atencion', mostrador: 1 });
    const mio = insertar({ numero: 4, servicio: 1 });
    expect((await fila(mio)).body.mi_turno.delante).toBe(0);
  });

  test('un turno de otro día no cuenta en la fila de hoy', async () => {
    insertar({ numero: 1, servicio: 1, fecha: '2020-01-01' });
    const mio = insertar({ numero: 1, servicio: 1 });
    const res = await fila(mio);
    expect(res.body.esperando_total).toBe(1);
    expect(res.body.mi_turno.delante).toBe(0);
  });

  test('la espera estimada suma la duración de los turnos de adelante (aproximada)', async () => {
    insertar({ numero: 1, servicio: 1 });
    insertar({ numero: 2, servicio: 1 });
    const mio = insertar({ numero: 3, servicio: 1 });
    expect((await fila(mio)).body.mi_turno.espera_estimada_seg).toBe(600);
  });

  test('si no hay nadie delante, la espera es 0 (atención próxima)', async () => {
    const mio = insertar({ numero: 1, servicio: 1 });
    const { mi_turno } = (await fila(mio)).body;
    expect(mi_turno.delante).toBe(0);
    expect(mi_turno.espera_estimada_seg).toBe(0);
  });

  test('la espera usa la estimación de GES-28: descuenta lo que ya lleva el turno en atención', async () => {
    insertar({ numero: 1, servicio: 1, estado: 'en_atencion', mostrador: 1 });
    const mio = insertar({ numero: 2, servicio: 1 });
    const { espera_estimada_seg } = (await fila(mio)).body.mi_turno;
    expect(espera_estimada_seg).toBeGreaterThan(0);
    expect(espera_estimada_seg).toBeLessThanOrEqual(300);
  });

  test('cuando lo llaman devuelve el mostrador y deja de dar posición', async () => {
    const m1 = db.prepare('SELECT id, nombre FROM mostradores ORDER BY id').get();
    const mio = insertar({ numero: 1, servicio: 1, estado: 'en_atencion', mostrador: m1.id });
    const { mi_turno } = (await fila(mio)).body;
    expect(mi_turno.estado).toBe('en_atencion');
    expect(mi_turno.mostrador).toBe(m1.nombre);
    expect(mi_turno.delante).toBeNull();
    expect(mi_turno.espera_estimada_seg).toBeNull();
  });

  test('un turno inexistente o de otro día devuelve mi_turno null', async () => {
    const viejo = insertar({ numero: 1, servicio: 1, fecha: '2020-01-01' });
    expect((await fila(99999)).body.mi_turno).toBeNull();
    expect((await fila(viejo)).body.mi_turno).toBeNull();
  });

  test('un parámetro turno inválido se ignora y no rompe la consulta', async () => {
    for (const valor of ['abc', '-3', '0', '1.5']) {
      const res = await request(app).get('/api/turnos/fila').query({ turno: valor });
      expect(res.status).toBe(200);
      expect(res.body.mi_turno).toBeNull();
    }
  });

  test('la ruta /fila no se confunde con /:id', async () => {
    const res = await request(app).get('/api/turnos/fila');
    expect(res.body).toHaveProperty('esperando_total');
  });
});