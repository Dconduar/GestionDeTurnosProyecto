process.env.DB_PATH = ':memory:';

const request = require('supertest');
const app = require('../src/server/app');
const db = require('../src/server/db');

function insertarTurno(fecha, numero, servicioId, extra = {}) {
  db.prepare(`
    INSERT INTO turnos (fecha, numero, tipo_servicio_id, registrado_en, inicio_atencion, fin_atencion, duracion_seg, estado)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    fecha,
    numero,
    servicioId,
    extra.registrado || `${fecha} 09:00:00`,
    extra.inicio || null,
    extra.fin || null,
    extra.duracion || null,
    extra.estado || 'esperando'
  );
}

beforeEach(() => {
  db.exec('DELETE FROM llamados; DELETE FROM turnos;');
  db.exec('UPDATE tipos_servicio SET activo = 1');
  insertarTurno('2026-01-10', 1, 1, { inicio: '2026-01-10 09:10:00', fin: '2026-01-10 09:15:00', duracion: 300, estado: 'atendido' });
  insertarTurno('2026-01-10', 2, 2);
  insertarTurno('2026-02-20', 1, 1, { inicio: '2026-02-20 09:20:00', fin: '2026-02-20 09:30:00', duracion: 600, estado: 'atendido' });
});

function turnosDe(body, prefijo) {
  return body.reportes.find((r) => r.prefijo === prefijo).total_turnos;
}

describe('GET /api/reportes con filtro de fechas', () => {
  test('sin fechas cuenta todo el historial', async () => {
    const res = await request(app).get('/api/reportes');
    expect(res.status).toBe(200);
    expect(res.body.desde).toBeNull();
    expect(turnosDe(res.body, 'C')).toBe(2);
    expect(turnosDe(res.body, 'T')).toBe(1);
  });

  test('desde y hasta limitan los turnos contados', async () => {
    const res = await request(app).get('/api/reportes?desde=2026-02-01&hasta=2026-02-28');
    expect(turnosDe(res.body, 'C')).toBe(1);
    expect(turnosDe(res.body, 'T')).toBe(0);
  });

  test('los servicios sin turnos en el rango siguen apareciendo en cero', async () => {
    const res = await request(app).get('/api/reportes?desde=2030-01-01');
    expect(res.body.reportes).toHaveLength(3);
    expect(res.body.reportes.every((r) => r.total_turnos === 0)).toBe(true);
  });

  test('calcula los promedios dentro del rango', async () => {
    const res = await request(app).get('/api/reportes?desde=2026-02-01');
    const consulta = res.body.reportes.find((r) => r.prefijo === 'C');
    expect(consulta.espera_promedio_min).toBe(20);
    expect(consulta.duracion_promedio_min).toBe(10);
  });

  test('rechaza fechas con formato inválido', async () => {
    const res = await request(app).get('/api/reportes?desde=10-01-2026');
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  test('rechaza fechas imposibles', async () => {
    const res = await request(app).get('/api/reportes?desde=2026-02-31');
    expect(res.status).toBe(400);
  });

  test('rechaza un rango invertido', async () => {
    const res = await request(app).get('/api/reportes?desde=2026-03-01&hasta=2026-01-01');
    expect(res.status).toBe(400);
  });
});

describe('GET /api/reportes/csv', () => {
  test('descarga un CSV con encabezado y una fila por servicio', async () => {
    const res = await request(app).get('/api/reportes/csv');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    expect(res.headers['content-disposition']).toMatch(/attachment; filename="reporte_turnos_todo\.csv"/);

    const lineas = res.text.replace(/^\uFEFF/, '').trim().split('\r\n');
    expect(lineas[0]).toBe('Servicio,Prefijo,Total de turnos,Espera promedio (min),Duración promedio (min)');
    expect(lineas).toHaveLength(4);
  });

  test('respeta el rango y lo refleja en el nombre del archivo', async () => {
    const res = await request(app).get('/api/reportes/csv?desde=2026-02-01&hasta=2026-02-28');
    expect(res.headers['content-disposition']).toContain('reporte_turnos_2026-02-01_a_2026-02-28.csv');
    expect(res.text).toContain('Consulta general,C,1,20,10');
  });

  test('neutraliza nombres que empiezan como fórmula', async () => {
    db.prepare("UPDATE tipos_servicio SET nombre = '=SUMA(1)' WHERE id = 3").run();
    const res = await request(app).get('/api/reportes/csv');
    expect(res.text).toContain("'=SUMA(1)");
    db.prepare("UPDATE tipos_servicio SET nombre = 'Pagos' WHERE id = 3").run();
  });

  test('rechaza fechas inválidas', async () => {
    const res = await request(app).get('/api/reportes/csv?hasta=ayer');
    expect(res.status).toBe(400);
  });
});