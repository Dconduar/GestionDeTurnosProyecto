const db = require('./db');

function horarioDeHoy() {
  return db
    .prepare(
      `SELECT hora_inicio, hora_fin
         FROM horarios_atencion
        WHERE activo = 1
          AND dia_semana = CAST(strftime('%w', 'now', 'localtime') AS INTEGER)
        ORDER BY hora_inicio`
    )
    .all();
}

function atencionAbierta() {
  if (process.env.IGNORAR_HORARIO === '1') return true;
  const { ahora } = db.prepare("SELECT strftime('%H:%M', 'now', 'localtime') AS ahora").get();
  return horarioDeHoy().some((h) => h.hora_inicio <= ahora && ahora < h.hora_fin);
}

function horarioPublico() {
  return horarioDeHoy().map((h) => ({ inicio: h.hora_inicio, fin: h.hora_fin }));
}

module.exports = { horarioDeHoy, atencionAbierta, horarioPublico };
