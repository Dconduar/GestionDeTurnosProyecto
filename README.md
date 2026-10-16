# Gestión de Turnos para Atención al Cliente

Proyecto final de Análisis de Sistemas II. Aplicación web para que los clientes tomen su turno y consulten la fila en tiempo real, y para que el personal llame y atienda los turnos y genere reportes.

## Requisitos

- [Node.js](https://nodejs.org) 20 o más nuevo
- Git

## Cómo ejecutar

```bash
git clone https://github.com/Dconduar/GestionDeTurnosProyecto.git
cd GestionDeTurnosProyecto
npm install
npm start
```

Luego abre <http://localhost:3000> en el navegador. Para desarrollo, `npm run dev` reinicia el servidor al guardar cambios.

La base de datos (`database/turnos.db`) se crea sola la primera vez que arranca el servidor, a partir de `database/schema.sql`. Si quieres empezar de cero, borra ese archivo y vuelve a iniciar.

## Pruebas

```bash
npm test
```

## Estructura del proyecto

```
database/schema.sql      Esquema de la base de datos (SQLite)
docs/                    Documentación: modelo de datos, casos de uso, arquitectura, C4, UX
src/server/              Servidor Express
  app.js                 Configuración de la aplicación
  server.js              Punto de entrada
  db.js                  Conexión a la base de datos
  routes/                Una ruta por módulo (turnos, recepcion, admin, reportes)
src/public/              Pantallas (HTML, CSS y JavaScript del navegador)
tests/                   Pruebas con Jest y Supertest
```

Cada módulo del servidor vive en su propio archivo dentro de `src/server/routes/`, para que el equipo trabaje sin pisarse. Los comentarios al inicio de cada archivo indican quién es responsable y qué issue lo cubre.

## Cómo trabajamos

- Cada tarea es un issue en Linear (equipo GES). Usa el nombre de rama que Linear sugiere en el issue, o que al menos incluya el ID (por ejemplo `ges-19`).
- Todo entra a `main` por Pull Request, con el ID en el título, por ejemplo `GES-19 Llamar al siguiente turno`.
- Antes de empezar un issue: `git checkout main` y `git pull`.

## Equipo

Sinthia Celeste Orellana Galeano · Derek Leonel Mármol Salguero · Ana Laura de María Oliva Cruz · Daniel Alexander Ortiz Cabrera · Aura Lucía Sandoval Pivaral · Diego Alexander Contreras Duarte
