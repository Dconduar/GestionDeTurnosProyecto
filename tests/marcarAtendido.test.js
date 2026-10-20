const fs = require('fs');
const os = require('os');
const path = require('path');

const RUTA_DB = path.join(os.tmpdir(), `turnos-rf05-${process.pid}-${Date.now()}.db`);
process.env.DB_PATH = RUTA_DB;

const Database = require('better-sqlite3');
const request = require('supertest');
const app = require('../src/server/app');
const db = require('../src/server/db');
const solicitudesSimultaneas = require('./helpers/solicitudesSimultaneas');

const FECHA_HORA = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;

function crearTurno(servicioId) {
  const { siguiente } = db
    .prepare("SELECT COALESCE(MAX(numero), 0) + 1 AS siguiente FROM turnos WHERE fecha = date('now', 'localtime')")
    .get();
  const info = db.prepare('INSERT INTO turnos (numero, tipo_servicio_id) VALUES (?, ?)').run(siguiente, servicioId);
  return Number(info.lastInsertRowid);
}

function llamarSiguiente(mostradorId = 1) {
  return request(app).post('/api/recepcion/llamar-siguiente').send({ mostrador_id: mostradorId });
}

function atender(id, mostradorId = 1) {
  return request(app).patch(`/api/recepcion/turnos/${id}/atendido`).send({ mostrador_id: mostradorId });
}

async function turnoEnAtencion(mostradorId = 1) {
  const id = crearTurno(1);
  const res = await llamarSiguiente(mostradorId);
  expect(res.body.id).toBe(id);
  return id;
}

function iniciarHace(id, segundos) {
  db.prepare("UPDATE turnos SET inicio_atencion = datetime('now', 'localtime', ?) WHERE id = ?").run(
    `-${segundos} seconds`,
    id
  );
}

function leerTurno(id) {
  return db
    .prepare('SELECT estado, mostrador_id, inicio_atencion, fin_atencion, duracion_seg FROM turnos WHERE id = ?')
    .get(id);
}

function segundos(fechaHora) {
  return Date.parse(fechaHora.replace(' ', 'T')) / 1000;
}

beforeEach(() => {
  process.env.IGNORAR_HORARIO = '1';
  db.exec('DELETE FROM llamados; DELETE FROM turnos;');
  db.exec("DELETE FROM sqlite_sequence WHERE name IN ('turnos', 'llamados')");
  db.exec("UPDATE configuracion SET valor = '3' WHERE clave = 'max_llamados'");
});

afterAll(() => {
  delete process.env.IGNORAR_HORARIO;
  db.close();
  for (const sufijo of ['', '-wal', '-shm']) fs.rmSync(RUTA_DB + sufijo, { force: true });
});

describe('PATCH /api/recepcion/turnos/:id/atendido (RF-05)', () => {
  test('marca como atendido un turno en atención', async () => {
    const id = await turnoEnAtencion();
    const res = await atender(id);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(id);
    expect(res.body.estado).toBe('atendido');
    expect(res.body.duracion_seg).toBeGreaterThanOrEqual(0);
    expect(leerTurno(id).estado).toBe('atendido');
  });

  test('registra la hora de fin de atención', async () => {
    const id = await turnoEnAtencion();
    const res = await atender(id);
    const turno = leerTurno(id);
    expect(turno.fin_atencion).toMatch(FECHA_HORA);
    expect(turno.fin_atencion >= turno.inicio_atencion).toBe(true);
    expect(res.body.fin_atencion).toBe(turno.fin_atencion);
  });

  test('calcula la duración en segundos entre el inicio y el fin', async () => {
    const id = await turnoEnAtencion();
    iniciarHace(id, 330);
    const res = await atender(id);
    const turno = leerTurno(id);
    expect(turno.duracion_seg).toBe(segundos(turno.fin_atencion) - segundos(turno.inicio_atencion));
    expect(turno.duracion_seg).toBeGreaterThanOrEqual(330);
    expect(turno.duracion_seg).toBeLessThanOrEqual(331);
    expect(res.body.duracion_seg).toBe(turno.duracion_seg);
  });

  test('no finaliza un turno que todavía está esperando', async () => {
    const id = crearTurno(1);
    const antes = leerTurno(id);
    const res = await atender(id);
    expect(res.status).toBe(409);
    expect(res.body.codigo).toBe('TURNO_NO_LLAMABLE');
    expect(leerTurno(id)).toEqual(antes);
  });

  test('rechaza una segunda finalización sin cambiar la hora ni la duración', async () => {
    const id = await turnoEnAtencion();
    iniciarHace(id, 60);
    await atender(id);
    const finalizado = leerTurno(id);

    const repetida = await atender(id);
    expect(repetida.status).toBe(409);
    expect(repetida.body.codigo).toBe('TURNO_NO_LLAMABLE');
    expect(leerTurno(id)).toEqual(finalizado);
  });

  test('no finaliza un turno cancelado', async () => {
    const id = crearTurno(1);
    db.prepare("UPDATE turnos SET estado = 'cancelado' WHERE id = ?").run(id);
    const res = await atender(id);
    expect(res.status).toBe(409);
    expect(leerTurno(id)).toEqual(expect.objectContaining({ estado: 'cancelado', fin_atencion: null, duracion_seg: null }));
  });

  test('no finaliza un turno marcado como no asistió', async () => {
    const id = await turnoEnAtencion();
    await request(app).post(`/api/recepcion/turnos/${id}/llamar`).send({ mostrador_id: 1 });
    await request(app).post(`/api/recepcion/turnos/${id}/llamar`).send({ mostrador_id: 1 });
    const ausencia = await request(app).patch(`/api/recepcion/turnos/${id}/no-asistio`).send({ mostrador_id: 1 });
    expect(ausencia.body.estado).toBe('no_asistio');

    const res = await atender(id);
    expect(res.status).toBe(409);
    expect(leerTurno(id)).toEqual(expect.objectContaining({ estado: 'no_asistio', fin_atencion: null, duracion_seg: null }));
  });

  test('responde 404 si el turno no existe', async () => {
    const res = await atender(9999);
    expect(res.status).toBe(404);
    expect(res.body.codigo).toBe('TURNO_NO_ENCONTRADO');
  });

  test('rechaza identificadores inválidos sin errores internos ni cambios', async () => {
    const id = await turnoEnAtencion();
    const antes = leerTurno(id);
    for (const ruta of ['abc', '-1', '1.5']) {
      const res = await request(app).patch(`/api/recepcion/turnos/${ruta}/atendido`).send({ mostrador_id: 1 });
      expect(res.status).toBe(404);
      expect(res.body.error).toBeDefined();
    }
    const mostradorInvalido = await atender(id, 'abc');
    expect(mostradorInvalido.status).toBe(400);
    expect(mostradorInvalido.body.codigo).toBe('MOSTRADOR_INVALIDO');
    expect(leerTurno(id)).toEqual(antes);
  });

  test('un mostrador no puede finalizar el turno que atiende otro', async () => {
    const id = await turnoEnAtencion(1);
    const antes = leerTurno(id);
    const res = await atender(id, 2);
    expect(res.status).toBe(409);
    expect(res.body.codigo).toBe('TURNO_NO_LLAMABLE');
    expect(leerTurno(id)).toEqual(antes);
  });

  test('el estado, la hora de fin y la duración persisten en SQLite', async () => {
    const id = await turnoEnAtencion();
    iniciarHace(id, 90);
    const res = await atender(id);

    const otraConexion = new Database(RUTA_DB, { readonly: true });
    const guardado = otraConexion
      .prepare('SELECT estado, fin_atencion, duracion_seg FROM turnos WHERE id = ?')
      .get(id);
    otraConexion.close();
    expect(guardado).toEqual({
      estado: 'atendido',
      fin_atencion: res.body.fin_atencion,
      duracion_seg: res.body.duracion_seg,
    });
  });

  test('solicitudes simultáneas desde conexiones distintas finalizan el turno una sola vez', async () => {
    const id = await turnoEnAtencion();
    iniciarHace(id, 120);

    const respuestas = await solicitudesSimultaneas(
      RUTA_DB,
      Array.from({ length: 8 }, () => ({
        metodo: 'patch',
        url: `/api/recepcion/turnos/${id}/atendido`,
        cuerpo: { mostrador_id: 1 },
      }))
    );

    const exitosas = respuestas.filter((r) => r.status === 200);
    const rechazadas = respuestas.filter((r) => r.status === 409);
    expect(exitosas).toHaveLength(1);
    expect(rechazadas).toHaveLength(7);
    expect(rechazadas.every((r) => r.cuerpo.codigo === 'TURNO_NO_LLAMABLE')).toBe(true);
    const turno = leerTurno(id);
    expect(turno.estado).toBe('atendido');
    expect(turno.fin_atencion).toBe(exitosas[0].cuerpo.fin_atencion);
    expect(turno.duracion_seg).toBe(exitosas[0].cuerpo.duracion_seg);
  }, 30000);

  test('al finalizar, el mostrador queda libre para llamar al siguiente turno compatible', async () => {
    const actual = await turnoEnAtencion();
    const siguiente = crearTurno(2);
    expect((await llamarSiguiente()).body.codigo).toBe('YA_HAY_TURNO_EN_ATENCION');

    await atender(actual);
    const fila = await request(app).get('/api/recepcion/fila?mostrador_id=1');
    expect(fila.body.en_atencion).toBeNull();
    expect(fila.body.puede_llamar).toBe(true);

    const llamada = await llamarSiguiente();
    expect(llamada.status).toBe(201);
    expect(llamada.body.id).toBe(siguiente);
  });

  test('no guarda una duración si el inicio de atención falta, es inválido o es posterior al fin', async () => {
    const id = await turnoEnAtencion();
    const inicios = [
      null,
      'no-es-fecha',
      db.prepare("SELECT datetime('now', 'localtime', '+1 hour') AS futuro").get().futuro,
    ];
    for (const inicio of inicios) {
      db.prepare('UPDATE turnos SET inicio_atencion = ? WHERE id = ?').run(inicio, id);
      const res = await atender(id);
      expect(res.status).toBe(409);
      expect(res.body.codigo).toBe('INICIO_INVALIDO');
      expect(leerTurno(id)).toEqual(
        expect.objectContaining({ estado: 'en_atencion', fin_atencion: null, duracion_seg: null })
      );
    }
  });

  test('el flujo de GES-19 sigue funcionando con la finalización integrada', async () => {
    const primero = crearTurno(1);
    const segundo = crearTurno(1);

    expect((await llamarSiguiente()).body.id).toBe(primero);
    const rellamado = await request(app).post(`/api/recepcion/turnos/${primero}/llamar`).send({ mostrador_id: 1 });
    expect(rellamado.body.llamados).toBe(2);
    expect((await atender(primero)).body.estado).toBe('atendido');

    const llamada = await llamarSiguiente();
    expect(llamada.body.id).toBe(segundo);
    expect(llamada.body.llamados).toBe(1);

    const finalizado = db.prepare('SELECT mostrador_id FROM turnos WHERE id = ?').get(primero);
    const { total } = db.prepare('SELECT COUNT(*) AS total FROM llamados WHERE turno_id = ?').get(primero);
    expect(finalizado.mostrador_id).toBe(1);
    expect(total).toBe(2);
  });
});
