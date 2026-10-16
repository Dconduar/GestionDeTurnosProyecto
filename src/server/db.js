// Conexión a la base de datos SQLite.
// Al iniciar, ejecuta database/schema.sql para crear las tablas si no existen
// (el script usa CREATE TABLE IF NOT EXISTS e INSERT OR IGNORE, así que se puede
// ejecutar muchas veces sin duplicar nada).
//
// Uso en cualquier archivo del servidor:
//   const db = require('./db');          // o require('../db') desde routes/
//   const turnos = db.prepare('SELECT * FROM turnos WHERE fecha = ?').all(hoy);

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const RUTA_SCHEMA = path.join(__dirname, '..', '..', 'database', 'schema.sql');
const RUTA_DB = process.env.DB_PATH || path.join(__dirname, '..', '..', 'database', 'turnos.db');

const db = new Database(RUTA_DB);
db.pragma('foreign_keys = ON');
if (RUTA_DB !== ':memory:') {
  db.pragma('journal_mode = WAL'); // mejor comportamiento con varias lecturas a la vez
}

db.exec(fs.readFileSync(RUTA_SCHEMA, 'utf8'));

module.exports = db;
