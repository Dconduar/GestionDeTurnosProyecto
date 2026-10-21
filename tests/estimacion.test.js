process.env.DB_PATH = ':memory:';
process.env.IGNORAR_HORARIO = '1';

const request = require('supertest');
const app = require('../src/server/app');
const db = require('../src/server/db');

const {
  leerConfiguracion,
  calcularDuracionServicio,
  calcularEsperaEstimada,
} = require('../src/server/estimacion');

beforeEach(() => {
  db.exec('DELETE FROM llamados; DELETE FROM turnos;');
  db.exec("DELETE FROM sqlite_sequence WHERE name = 'turnos'");

  db.exec('UPDATE mostradores SET activo = 1');
  db.exec('UPDATE tipos_servicio SET activo = 1');

  db.prepare(`
    UPDATE configuracion
    SET valor = '5'
    WHERE clave = 'estimacion_muestras_min'
  `).run();

  db.prepare(`
    UPDATE configuracion
    SET valor = '7'
    WHERE clave = 'estimacion_ventana_dias'
  `).run();
});

afterAll(() => {
  delete process.env.IGNORAR_HORARIO;
});

describe('Configuración de estimación', () => {
  test('lee los parámetros configurados', () => {
    expect(leerConfiguracion('estimacion_muestras_min', 5)).toBe(5);
    expect(leerConfiguracion('estimacion_ventana_dias', 7)).toBe(7);
  });

  test('utiliza el valor por defecto si la configuración es inválida', () => {
    db.prepare(`
      UPDATE configuracion
      SET valor = 'invalido'
      WHERE clave = 'estimacion_muestras_min'
    `).run();

    expect(leerConfiguracion('estimacion_muestras_min', 5)).toBe(5);
  });
});

describe('Duración estimada del servicio', () => {
  test('usa la duración configurada cuando no hay historial', () => {
    expect(calcularDuracionServicio(1)).toBe(300);
    expect(calcularDuracionServicio(2)).toBe(600);
    expect(calcularDuracionServicio(3)).toBe(420);
  });

  test('usa el promedio histórico cuando existen suficientes muestras', () => {
    for (let i = 1; i <= 5; i++) {
      db.prepare(`
        INSERT INTO turnos (
          numero,
          tipo_servicio_id,
          estado,
          duracion_seg,
          fin_atencion
        )
        VALUES (?, 1, 'atendido', ?, datetime('now', 'localtime'))
      `).run(i, i * 60);
    }

    expect(calcularDuracionServicio(1)).toBe(180);
  });

  test('permite cambiar el mínimo de muestras desde SQLite', () => {
    db.prepare(`
      UPDATE configuracion
      SET valor = '1'
      WHERE clave = 'estimacion_muestras_min'
    `).run();

    db.prepare(`
      INSERT INTO turnos (
        numero,
        tipo_servicio_id,
        estado,
        duracion_seg,
        fin_atencion
      )
      VALUES (1, 1, 'atendido', 120, datetime('now', 'localtime'))
    `).run();

    expect(calcularDuracionServicio(1)).toBe(120);
  });
});

describe('Estimación de espera del turno', () => {
  test('guarda la estimación al crear un turno', async () => {
    const respuesta = await request(app)
      .post('/api/turnos')
      .send({ tipo_servicio_id: 1 });

    expect(respuesta.status).toBe(201);
    expect(respuesta.body.espera_estimada_seg).toBe(0);

    const guardado = db.prepare(`
      SELECT espera_estimada_seg
      FROM turnos
      WHERE id = ?
    `).get(respuesta.body.id);

    expect(guardado.espera_estimada_seg).toBe(0);
  });

  test('considera los turnos anteriores del mismo servicio', async () => {
    const primero = await request(app)
      .post('/api/turnos')
      .send({ tipo_servicio_id: 1 });

    const segundo = await request(app)
      .post('/api/turnos')
      .send({ tipo_servicio_id: 1 });

    expect(primero.status).toBe(201);
    expect(segundo.status).toBe(201);

    // Consulta general solo se atiende en el mostrador 1.
    expect(segundo.body.espera_estimada_seg).toBe(300);
  });

  test('no cuenta los turnos cancelados', async () => {
    const primero = await request(app)
      .post('/api/turnos')
      .send({ tipo_servicio_id: 1 });

    const cancelacion = await request(app)
      .patch(`/api/turnos/${primero.body.id}/cancelar`)
      .send({ token_cancelacion: primero.body.token_cancelacion });

    expect(cancelacion.status).toBe(200);

    const segundo = await request(app)
      .post('/api/turnos')
      .send({ tipo_servicio_id: 1 });

    expect(segundo.body.espera_estimada_seg).toBe(0);
  });

  test('devuelve null si no hay mostradores activos compatibles', async () => {
    db.prepare('UPDATE mostradores SET activo = 0 WHERE id = 1').run();

    const respuesta = await request(app)
      .post('/api/turnos')
      .send({ tipo_servicio_id: 1 });

    expect(respuesta.status).toBe(201);
    expect(respuesta.body.espera_estimada_seg).toBeNull();
  });

  test('la función rechaza turnos inexistentes', () => {
    expect(() => calcularEsperaEstimada(9999)).toThrow(
      'El turno no existe o no está esperando.'
    );
  });
});
