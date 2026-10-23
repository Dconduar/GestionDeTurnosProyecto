const request = require('supertest');
const app = require('../src/server/app');

describe('Pruebas de Integración - NFR-06 / RF-09', () => {
  test('GET /api/reportes debe responder con estado 200 y la lista de servicios', async () => {
    const res = await request(app).get('/api/reportes');

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('ok', true);
    expect(res.body).toHaveProperty('reportes');
    expect(Array.isArray(res.body.reportes)).toBe(true);
    expect(res.body.reportes.length).toBeGreaterThan(0);
    
    // Verificar estructura del primer servicio reportado
    const primerServicio = res.body.reportes[0];
    expect(primerServicio).toHaveProperty('servicio');
    expect(primerServicio).toHaveProperty('total_turnos');
    expect(primerServicio).toHaveProperty('espera_promedio_min');
    expect(primerServicio).toHaveProperty('duracion_promedio_min');
  });
});