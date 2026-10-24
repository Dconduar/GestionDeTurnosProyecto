# Uso de Claude dentro del flujo SDD con Spec Kit

**Proyecto:** Sistema de Gestión de Turnos para Atención al Cliente  
**Complementa a:** `docs/evidencia/evidencia-ia.md` (GES-45) y `docs/ia-responsable.md` (GES-29)  
**Integrante:** Diego Contreras (rama `diego`)  
**Fecha:** 24 de octubre de 2026  
**Estado:** Borrador. Faltan las capturas de las sesiones hechas en otros dispositivos (ver sección 7).

## 1. Propósito y alcance

El enunciado del proyecto (sección 4) pide conservar evidencia de las especificaciones utilizadas, las interacciones relevantes con la IA, las propuestas generadas, las decisiones del equipo, las modificaciones realizadas y la validación de los resultados.

Este documento reúne esa evidencia para el trabajo en el que se usó **Claude** como asistente. Claude se utilizó en varias sesiones y desde más de un dispositivo y cuenta, por lo que la evidencia proviene de tres fuentes:

| Fuente | Qué permite comprobar |
|---|---|
| Historial de Git y Pull Requests | Qué se integró, cuándo, en qué issue y con qué pruebas. |
| Artefactos de Spec Kit en el repositorio | Qué especificación guió cada parte del trabajo. |
| Conversaciones con Claude | Qué se pidió, qué propuso la IA y qué se decidió. La sesión del 24 de octubre está documentada completa (sección 5). Las sesiones anteriores deben respaldarse con capturas (sección 7). |

Criterio aplicado: **solo se registra como hecho lo que puede comprobarse** en el repositorio o en una conversación real. Lo que todavía no tiene respaldo se marca como *por completar*.

## 2. Herramientas utilizadas

| Herramienta | Uso en el proyecto |
|---|---|
| **GitHub Spec Kit 1.2.2** (integración con Copilot) | Herramienta SDD del proyecto. Configurada en GES-43: `.specify/` (constitución, plantillas, scripts) y comandos `speckit-*` en `.github/skills/`. |
| **Claude** (claude.ai y Claude Code) | Apoyo para proponer el modelo de datos, la estructura del servidor, la autenticación, el panel de administración, el QR y el aviso al cliente, y para revisar la integridad del código. |
| **GitHub Copilot** | Generación de la especificación del flujo del cliente con `/speckit.specify` (GES-14). |
| **ChatGPT** | Redacción de las especificaciones de RF-04 a RF-10 y de los requisitos no funcionales (GES-44). |

## 3. Flujo SDD aplicado

El proyecto siguió la cadena que pide el enunciado:

**Problema → Requerimiento → Especificación → Diseño → Tarea → Implementación → Prueba**

| Etapa | Artefacto en el repositorio |
|---|---|
| Problema y requerimientos | `README.md`, `docs/casos-de-uso.md` |
| Principios y restricciones | `.specify/memory/constitution.md` |
| Especificaciones | `specs/001` a `specs/007` (`spec.md` y `checklists/requirements.md`) |
| Diseño | `docs/arquitectura.md`, `docs/componentes.md`, `docs/c4.md`, `docs/modelo-de-datos.md`, `docs/Ux.md` |
| Plan y tareas | `specs/002-estimacion-tiempo-espera/plan.md` y `tasks.md`, `specs/plan-requisitos-restantes.md`, `specs/tasks-requisitos-restantes.md`, issues GES-xx en Linear |
| Implementación | `src/server/` y `src/public/` |
| Pruebas | `tests/*.test.js` (Jest y Supertest) |

### Trazabilidad especificación → código → prueba

| Requisito | Especificación | Código principal | Pruebas |
|---|---|---|---|
| RF-01 Tomar turno sin cuenta | `specs/001-client-queue-flow` | `routes/turnos.js` | `turno.test.js` |
| RF-02 Consultar la fila | `specs/001-client-queue-flow` | `fila.js`, `js/cliente.js` | `fila.test.js` |
| RF-03 Cancelar turno | `specs/001-client-queue-flow` | `routes/turnos.js` | `turno.test.js` |
| RF-04 Llamar al siguiente | `specs/003-recepcionista-turnos` | `routes/recepcion.js` | `recepcion.test.js`, `preferencial.test.js` |
| RF-05 Marcar atendido | `specs/003-recepcionista-turnos` | `routes/recepcion.js` | `marcarAtendido.test.js` |
| RF-06 No asistió | `specs/003-recepcionista-turnos` | `routes/recepcion.js` | `recepcion.test.js` |
| RF-07 Servicios y mostradores | `specs/004-asignacion-mostradores` | `database/schema.sql` | `serviciosMostradores.test.js` |
| RF-08 Administración | `specs/005-administracion` | `routes/admin.js`, `js/admin.js` | `admin.test.js`, `auth.test.js` |
| RF-09 Reportes | `specs/006-reportes` | `routes/reportes.js` | `reportes.test.js`, `Reportesfiltro.test.js` |
| RF-10 Estimación de espera | `specs/002-estimacion-tiempo-espera` | `estimacion.js` | `estimacion.test.js` |
| NFR | `specs/007-requisitos-no-funcionales` | varios | `persistencia.test.js`, `salud.test.js`, `qr.test.js` |

## 4. Registro de trabajo con Claude por issue

En cada fila, **Resultado integrado** y **Validación** salen del historial de Git. Los campos **Interacción** y **Decisiones del equipo** se completan con lo que muestran las capturas de cada conversación.

### 4.1. GES-6 — Modelo de datos (commit `c0e1ad6`)

| Aspecto | Registro |
|---|---|
| Especificación de partida | Requisitos RF-01 a RF-10 y casos de uso. |
| Interacción | Se pidió a la IA un modelo de datos a partir de los requisitos. Propuso un esquema inicial de seis tablas (ya registrado en `evidencia-ia.md`, 2.2). |
| Decisiones del equipo | Se agregaron el mostrador del recepcionista, la tabla `configuracion`, la tabla `llamados`, el prefijo por servicio, la prioridad y la espera estimada. |
| Resultado integrado | `database/schema.sql` y diagrama ER en `docs/modelo-de-datos.md`. |
| Validación | Script ejecutado en una base de prueba; rechazo de estados inválidos, números duplicados y relaciones inexistentes. |
| Captura | *Por completar.* |

### 4.2. GES-48 — Esqueleto del proyecto (commit `2ab0fb3`)

| Aspecto | Registro |
|---|---|
| Especificación de partida | Restricciones técnicas de la constitución: Node.js, Express, SQLite y HTML/CSS/JS. |
| Interacción | Se pidió una estructura inicial. La IA propuso un servidor Express con SQLite, rutas separadas por módulo, pantallas base y una prueba. |
| Decisiones del equipo | *Por completar:* qué partes se aceptaron y cuáles se cambiaron. |
| Resultado integrado | `src/server/app.js`, `db.js`, `routes/*`, pantallas base y `tests/salud.test.js`. |
| Validación | `tests/salud.test.js` comprueba que la API responde y que la base tiene sus tablas. |
| Captura | *Por completar.* |

### 4.3. GES-43 — Configuración de Spec Kit (commit `9a623e1`)

| Aspecto | Registro |
|---|---|
| Objetivo | Dejar el repositorio listo para trabajar con SDD. |
| Interacción | *Por completar:* indicar si se usó la IA para elegir la herramienta o resolver la instalación. |
| Resultado integrado | `.specify/` con la constitución, las plantillas y los scripts de PowerShell, y los comandos `speckit-specify`, `plan`, `tasks`, `clarify`, `analyze`, `checklist`, `implement`, etc., en `.github/skills/`. |
| Validación | Daniel usó `/speckit.specify` sobre esta configuración en GES-14 (captura disponible en `GES-14-copilot-speckit.png`). |

### 4.4. GES-8 — Inicio de sesión y roles (commit `c34e8d7`)

| Aspecto | Registro |
|---|---|
| Especificación de partida | NFR-04 y el principio II de la constitución (operaciones del personal protegidas con sesión y roles, contraseñas con hash). |
| Interacción | La IA propuso sesiones, roles y contraseñas con hash. |
| Decisiones del equipo | *Por completar.* |
| Resultado integrado | `src/server/auth.js` (`express-session` y `bcryptjs`), `usuarios-iniciales.js`, `login.html` y `js/login.js`. |
| Validación | `tests/auth.test.js` y prueba en el navegador. |
| Captura | *Por completar.* |

### 4.5. GES-7 — Panel de administración (commit `1371155`)

| Aspecto | Registro |
|---|---|
| Especificación de partida | `specs/005-administracion/spec.md` (RF-08). |
| Interacción | *Por completar.* |
| Resultado integrado | CRUD de servicios y mostradores y edición de horarios en `routes/admin.js`, con su pantalla en `admin.html` y `js/admin.js`. Los servicios se desactivan en lugar de borrarse, y no se puede desactivar un servicio o mostrador con turnos activos. |
| Validación | `tests/admin.test.js` (184 líneas de pruebas nuevas en este commit). |
| Captura | *Por completar.* |

### 4.6. GES-49, GES-50 y GES-51 — QR, login en recepción y aviso al cliente (commit `feed2ad`)

| Aspecto | Registro |
|---|---|
| Especificación de partida | Constitución: acceso del cliente sin cuenta, también mediante código QR. `specs/003-recepcionista-turnos` para el acceso protegido del recepcionista. |
| Interacción | *Por completar.* |
| Resultado integrado | Página `qr.html` con el endpoint `routes/qr.js`. Recepción protegida por rol, con el mostrador fijado al usuario. Aviso sonoro, vibración y título parpadeante cuando llaman al cliente (`js/cliente.js`). |
| Validación | `tests/qr.test.js`; pruebas de recepción adaptadas a la sesión (`tests/helpers/sesionPersonal.js`). |
| Captura | *Por completar.* |

## 5. Sesión de revisión de integridad con Claude Code (24 de octubre de 2026)

Esta sesión está documentada completa porque se realizó en el repositorio y su resultado puede verificarse en el diff de la rama `diego`.

### 5.1. Qué se pidió

Verificar la integridad del proyecto: que todo funcione, que no haya funciones sueltas y que no haya código redundante.

### 5.2. Qué hizo y propuso la IA

1. Ejecutó la suite completa: **14 suites y 175 pruebas aprobadas**.
2. Leyó el backend, el frontend y los cambios sin commit, y reportó:

| Hallazgo | Gravedad |
|---|---|
| `js/recepcion.js`: una fusión incompleta dejó el botón "Marcar preferencial" solo en los turnos que ya eran preferenciales. Las columnas quedaban desordenadas y la fila se agregaba dos veces. | Rompía RF-04 (prioridad). |
| `recepcion.html`: una fila de encabezado suelta reemplazaba el título "Fila de espera". | Rompía la estructura y la accesibilidad. |
| `admin.html`: la sección Reportes no tenía código que la hiciera funcionar. | RF-09 sin interfaz. |
| `/api/reportes` no exige sesión de administrador. | Seguridad (NFR-04). |
| Recepción no guarda qué usuario llamó o atendió (`atendido_por` siempre vacío). | Dato incompleto. |
| `codigoTurno()` repetida 3 veces, el error "fuera de horario" repetido 2 veces, `maxLlamados()` duplicando `leerConfiguracion()`, y `horarioPublico()` no reutilizada. | Código redundante. |

3. Señaló que las pruebas no detectaban los errores del frontend porque solo cubren la API.

### 5.3. Decisiones del equipo

| Propuesta | Decisión |
|---|---|
| Corregir `recepcion.js` y `recepcion.html` | Aceptada. |
| Conectar la sección de Reportes | Aceptada. |
| Unificar las funciones duplicadas del backend | Aceptada. |
| Trabajar en una rama nueva | Rechazada: se trabajó en la rama `diego`. |
| Proteger `/api/reportes` con el rol de administrador | Pendiente (requiere ajustar las pruebas). |
| Guardar el usuario que atiende cada turno | Pendiente. |
| Crear un archivo JS compartido para `cliente.js` y `recepcion.js` | No aplicada: las funciones no son idénticas (recepción redirige al login si la sesión vence). |
| Quitar el botón "Probar sonido" de la pantalla de espera | Pedido por el equipo después de la revisión; la IA lo implementó. |

### 5.4. Modificaciones realizadas

- `js/recepcion.js`: cada fila se arma en el orden Turno, Servicio, Espera y Prioridad, y todos los turnos tienen el botón para marcar o quitar la prioridad.
- `recepcion.html`: se restauró el título y se agregó la columna "Prioridad".
- `js/admin.js`: consulta de reportes con filtro de fechas, validación del rango, botón "Todo el historial" y descarga del CSV.
- `fila.js` exporta `codigoTurno()`; `horario.js` agrega `responderFueraDeHorario()`; `turnos.js` y `recepcion.js` reutilizan ambas funciones; `maxLlamados()` usa `leerConfiguracion()`.
- `cliente.html` y `js/cliente.js`: se eliminó el botón "Probar sonido" y su código.

### 5.5. Validación

- `npm test`: **175 de 175 pruebas aprobadas** después de los cambios.
- `node --check` sobre todos los archivos JS del servidor y del frontend, sin errores.
- Prueba en el navegador con una base de datos temporal en memoria:
  - Se crearon tres turnos, se marcó C-003 como preferencial y pasó al primer lugar de la fila con el botón "Quitar preferencial".
  - Los reportes cargaron con los totales correctos, el filtro con fechas futuras devolvió cero, el rango inválido mostró el aviso y el CSV se descargó con los mismos datos.
  - En la pantalla de espera del cliente solo queda el botón "Cancelar mi turno".

### 5.6. Lo que esta sesión no demuestra

- Las pruebas manuales en Firefox y Edge siguen pendientes (`docs/Ux.md`).
- Las correcciones del frontend no tienen pruebas automatizadas, porque la suite solo cubre la API.

## 6. Control humano sobre la IA

- Ninguna propuesta se integró sin ejecutar las pruebas del proyecto.
- El equipo eligió qué propuestas aplicar y cuáles dejar pendientes (tabla 5.3).
- La IA detectó un error introducido por una fusión manual, y una persona del equipo decidió cómo corregirlo.
- El cálculo de espera (RF-10) usa reglas y promedios históricos, no un modelo de IA (`docs/ia-responsable.md`).

## 7. Pendientes para cerrar esta evidencia

- [ ] Agregar en `docs/evidencia/` capturas reales de las conversaciones con Claude de GES-6, GES-48, GES-8, GES-7 y GES-49 a GES-51.
- [ ] Completar los campos *Por completar* de la sección 4 con lo que muestran esas capturas.
- [ ] Corregir `docs/docs/matriz-de-trazabilidad.md`: cita archivos `specs/rf-01.md`… `specs/nfr-08.md` que no existen en el repositorio. Las especificaciones reales están en `specs/001` a `specs/007` (ver la tabla de la sección 3).
- [ ] Actualizar la cifra de pruebas en la matriz (dice 119; hoy son 175).
- [ ] Revisar este documento con el equipo.
