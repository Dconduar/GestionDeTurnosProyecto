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

## Uso de IA

Este proyecto se desarrolló con apoyo de herramientas de inteligencia artificial. Ninguna propuesta se aceptó sin revisión: cada integrante la revisó, la modificó cuando hizo falta y la comprobó con pruebas automáticas y en el navegador.

| Herramienta | Para qué se usó |
|---|---|
| GitHub Copilot con Spec Kit | Especificación del flujo del cliente (RF-01 a RF-03) |
| ChatGPT | Redacción y organización de las especificaciones, el plan y las tareas de los demás requisitos |
| Claude | Modelo de datos, esqueleto del proyecto, login, panel de administración, acceso por QR y pruebas| 

### Cómo se usó Spec Kit

Spec Kit está configurado en el repositorio (`.specify/` y `.github/skills/`) y se usó para especificar el flujo del cliente (`specs/001-client-queue-flow`). Las especificaciones de los demás requisitos (`specs/002` a `007`) se redactaron con apoyo de ChatGPT, sin ejecutar los comandos de generación de Spec Kit. Algunas se escribieron cuando el módulo ya estaba programado y sirvieron para formalizar y verificar lo construido. Las tareas se gestionaron en Linear y no con los comandos de planificación de Spec Kit.

### Trazabilidad y verificación

- Cada requisito se relaciona con su especificación, su issue en Linear, el código y su prueba en [`docs/docs/matriz-de-trazabilidad.md`](docs/docs/matriz-de-trazabilidad.md).
- Las pruebas (Jest y Supertest) se ejecutan con `npm test`. Varias se escribieron con ayuda de IA y se revisaron ejecutándolas; se corrigieron cuando al ejecutarlas se vio que no comprobaban lo esperado.

### Evidencia y uso responsable

- Interacciones, decisiones y modificaciones por integrante: [`docs/evidencia/evidencia-ia.md`](docs/evidencia/evidencia-ia.md)
- Uso responsable de la IA y de la estimación de espera (NFR-08): [`docs/ia-responsable.md`](docs/ia-responsable.md)
- Principios del proyecto: [`.specify/memory/constitution.md`](.specify/memory/constitution.md)


## Equipo

Sinthia Celeste Orellana Galeano · Derek Leonel Mármol Salguero · Ana Laura de María Oliva Cruz · Daniel Alexander Ortiz Cabrera · Aura Lucía Sandoval Pivaral · Diego Alexander Contreras Duarte
