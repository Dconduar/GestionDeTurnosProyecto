const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const RUTA_SCHEMA = path.join(__dirname, '..', '..', 'database', 'schema.sql');
const RUTA_DB = process.env.DB_PATH || path.join(__dirname, '..', '..', 'database', 'turnos.db');

const db = new Database(RUTA_DB);
db.pragma('foreign_keys = ON');
if (RUTA_DB !== ':memory:') {
  db.pragma('journal_mode = WAL'); 
}

db.exec(fs.readFileSync(RUTA_SCHEMA, 'utf8'));
// Migración para bases de datos existentes
const columnasTurnos = db.prepare('PRAGMA table_info(turnos)').all();

const existeTokenCancelacion = columnasTurnos.some(
  (columna) => columna.name === 'token_cancelacion_hash'
);

if (!existeTokenCancelacion) {
  db.exec('ALTER TABLE turnos ADD COLUMN token_cancelacion_hash TEXT');
}

module.exports = db;
