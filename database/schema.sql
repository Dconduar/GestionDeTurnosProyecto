PRAGMA foreign_keys = ON;


CREATE TABLE IF NOT EXISTS mostradores (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre  TEXT    NOT NULL UNIQUE,
    activo  INTEGER NOT NULL DEFAULT 1 CHECK (activo IN (0, 1))
);


CREATE TABLE IF NOT EXISTS usuarios (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre_usuario    TEXT    NOT NULL UNIQUE,
    contrasena_hash   TEXT    NOT NULL,              
    rol               TEXT    NOT NULL
                      CHECK (rol IN ('recepcionista', 'administrador')),
    mostrador_id      INTEGER REFERENCES mostradores(id),
    activo            INTEGER NOT NULL DEFAULT 1 CHECK (activo IN (0, 1)),
    creado_en         TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
);


CREATE TABLE IF NOT EXISTS tipos_servicio (
    id                     INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre                 TEXT    NOT NULL UNIQUE,
    prefijo                TEXT    NOT NULL UNIQUE CHECK (length(prefijo) BETWEEN 1 AND 3),
    descripcion            TEXT,
    duracion_estimada_min  INTEGER NOT NULL DEFAULT 10 CHECK (duracion_estimada_min > 0),
    activo                 INTEGER NOT NULL DEFAULT 1 CHECK (activo IN (0, 1))
);


CREATE TABLE IF NOT EXISTS mostrador_servicio (
    mostrador_id      INTEGER NOT NULL REFERENCES mostradores(id)    ON DELETE CASCADE,
    tipo_servicio_id  INTEGER NOT NULL REFERENCES tipos_servicio(id) ON DELETE CASCADE,
    PRIMARY KEY (mostrador_id, tipo_servicio_id)
);


CREATE TABLE IF NOT EXISTS horarios_atencion (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    dia_semana   INTEGER NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
    hora_inicio  TEXT    NOT NULL,                   
    hora_fin     TEXT    NOT NULL,                   
    activo       INTEGER NOT NULL DEFAULT 1 CHECK (activo IN (0, 1)),
    CHECK (hora_inicio < hora_fin)
);


CREATE TABLE IF NOT EXISTS configuracion (
    clave        TEXT PRIMARY KEY,
    valor        TEXT NOT NULL,
    descripcion  TEXT
);


CREATE TABLE IF NOT EXISTS turnos (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha                 TEXT    NOT NULL DEFAULT (date('now', 'localtime')),
    numero                INTEGER NOT NULL CHECK (numero > 0),
    tipo_servicio_id      INTEGER NOT NULL REFERENCES tipos_servicio(id),
    prioridad             TEXT    NOT NULL DEFAULT 'normal'
                          CHECK (prioridad IN ('normal', 'preferencial')),
    mostrador_id          INTEGER REFERENCES mostradores(id),   
    atendido_por          INTEGER REFERENCES usuarios(id),      
    estado                TEXT    NOT NULL DEFAULT 'esperando'
                          CHECK (estado IN ('esperando', 'en_atencion', 'atendido', 'no_asistio', 'cancelado')),
    registrado_en         TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
    espera_estimada_seg   INTEGER CHECK (espera_estimada_seg IS NULL OR espera_estimada_seg >= 0),
    inicio_atencion       TEXT,                                 
    fin_atencion          TEXT,                                 
    duracion_seg          INTEGER CHECK (duracion_seg IS NULL OR duracion_seg >= 0),
    token_cancelacion_hash TEXT,
    UNIQUE (fecha, numero)
);

CREATE INDEX IF NOT EXISTS idx_turnos_fecha_estado ON turnos (fecha, estado, prioridad, numero);
CREATE INDEX IF NOT EXISTS idx_turnos_servicio     ON turnos (tipo_servicio_id);


CREATE TABLE IF NOT EXISTS llamados (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    turno_id      INTEGER NOT NULL REFERENCES turnos(id)      ON DELETE CASCADE,
    mostrador_id  INTEGER NOT NULL REFERENCES mostradores(id),
    usuario_id    INTEGER REFERENCES usuarios(id),
    llamado_en    TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE INDEX IF NOT EXISTS idx_llamados_turno ON llamados (turno_id);


INSERT OR IGNORE INTO tipos_servicio (id, nombre, prefijo, descripcion, duracion_estimada_min) VALUES
    (1, 'Consulta general', 'C', 'Información y consultas rápidas', 5),
    (2, 'Trámite',          'T', 'Trámites y gestiones',            10),
    (3, 'Pagos',            'P', 'Pagos y cobros',                   7);

INSERT OR IGNORE INTO mostradores (id, nombre) VALUES
    (1, 'Mostrador 1'),
    (2, 'Mostrador 2');

INSERT OR IGNORE INTO mostrador_servicio (mostrador_id, tipo_servicio_id) VALUES
    (1, 1), (1, 2),
    (2, 2), (2, 3);

INSERT OR IGNORE INTO horarios_atencion (id, dia_semana, hora_inicio, hora_fin) VALUES
    (1, 1, '08:00', '17:00'),
    (2, 2, '08:00', '17:00'),
    (3, 3, '08:00', '17:00'),
    (4, 4, '08:00', '17:00'),
    (5, 5, '08:00', '17:00');

INSERT OR IGNORE INTO configuracion (clave, valor, descripcion) VALUES
    ('max_llamados',            '3', 'Llamados sin respuesta antes de marcar el turno como no asistió (RF-06)'),
    ('estimacion_muestras_min', '5', 'Turnos atendidos mínimos para estimar con datos reales; si hay menos se usa duracion_estimada_min (RF-10)'),
    ('estimacion_ventana_dias', '7', 'Días hacia atrás que se consideran para calcular el promedio de duración (RF-10)');
