# Matriz de trazabilidad (requerimiento → especificación → código → prueba)

**Proyecto:** Gestión de Turnos para Atención al Cliente  
**Issue:** GES-31  
**Actualizada:** 24 de octubre de 2026, a partir del código y las pruebas actuales

Esta matriz relaciona cada requerimiento funcional (RF) y no funcional (NFR) con su especificación SDD, su issue en Linear, los archivos que lo implementan, la prueba que lo valida y el resultado obtenido. Es la única matriz del proyecto; el [plan de pruebas](plan_de_pruebas_y_trazabilidad.md) explica cómo se prueba y remite aquí.

**Resultado de la suite automatizada:** `npm test` → **14 suites y 175 pruebas aprobadas**, 0 fallidas (24 de octubre de 2026).

## Requerimientos funcionales

| Requerimiento | Especificación | Issue | Código | Prueba | Resultado |
|---|---|---|---|---|---|
| RF-01 Tomar turno sin cuenta | `specs/001-client-queue-flow/spec.md` | GES-15 | `src/server/routes/turnos.js`, `src/public/cliente.html`, `src/public/js/cliente.js` | `tests/turno.test.js` | Aprobado: 201 con código de turno; consecutivo único aun con solicitudes simultáneas. |
| RF-02 Consultar la fila en tiempo real | `specs/001-client-queue-flow/spec.md` | GES-16 | `src/server/fila.js`, `src/server/routes/turnos.js`, `src/public/js/cliente.js` | `tests/fila.test.js` | Aprobado: turnos en atención, turnos delante y espera; la pantalla consulta cada 2 s. |
| RF-03 Cancelar turno | `specs/001-client-queue-flow/spec.md` | GES-27 | `src/server/routes/turnos.js` | `tests/turno.test.js` | Aprobado: pasa a `cancelado` solo con el token correcto y si sigue esperando. |
| RF-04 Llamar al siguiente turno | `specs/003-recepcionista-turnos/spec.md` | GES-19 | `src/server/routes/recepcion.js`, `src/public/js/recepcion.js` | `tests/recepcion.test.js`, `tests/preferencial.test.js` | Aprobado: pasa a `en_atencion` respetando prioridad, orden y servicios del mostrador. |
| RF-05 Marcar atendido y duración | `specs/003-recepcionista-turnos/spec.md` | GES-24 | `src/server/routes/recepcion.js` | `tests/marcarAtendido.test.js` | Aprobado: guarda `fin_atencion` y `duracion_seg`. |
| RF-06 No asistió tras los llamados | `specs/003-recepcionista-turnos/spec.md` | GES-20 | `src/server/routes/recepcion.js` | `tests/recepcion.test.js` | Aprobado: solo permite `no_asistio` al completar el máximo de llamados configurado. |
| RF-07 Servicios y mostradores vinculados | `specs/004-asignacion-mostradores/spec.md` | GES-23 | `database/schema.sql`, `src/server/routes/recepcion.js` | `tests/serviciosMostradores.test.js` | Aprobado: cada mostrador solo llama turnos de sus servicios; integridad referencial. |
| RF-08 Panel de administración | `specs/005-administracion/spec.md` | GES-7 | `src/server/routes/admin.js`, `src/public/admin.html`, `src/public/js/admin.js` | `tests/admin.test.js`, `tests/auth.test.js` | Aprobado: alta, edición y desactivación de servicios y mostradores, horarios y bloqueo por rol. |
| RF-09 Reportes | `specs/006-reportes/spec.md` | GES-32 | `src/server/routes/reportes.js`, `src/public/js/admin.js` | `tests/reportes.test.js`, `tests/Reportesfiltro.test.js` | Aprobado: totales, espera y duración promedio por servicio, filtro de fechas y CSV. Pendiente: exigir sesión de administrador. |
| RF-10 Estimación de espera | `specs/002-estimacion-tiempo-espera/spec.md` | GES-28 | `src/server/estimacion.js` | `tests/estimacion.test.js` | Aprobado: usa la duración configurada o el promedio histórico y reparte la fila entre mostradores compatibles. |

## Requerimientos no funcionales

Todas las especificaciones de esta tabla están en `specs/007-requisitos-no-funcionales/spec.md`, salvo la de acceso por QR, que es una restricción de `.specify/memory/constitution.md`.

| Requerimiento | Issue | Código | Prueba | Resultado |
|---|---|---|---|---|
| NFR-01 Tomar turno en menos de 30 s | GES-17 | `src/public/cliente.html`, `src/public/js/cliente.js` | Manual (flujo de dos acciones) | Aprobado en revisión manual. La prueba con 3 usuarios de `docs/Ux.md` (sección 9) no tiene registro en el repositorio. |
| NFR-02 Rendimiento (2 s y 100 clientes) | GES-33 | `src/server/app.js`, `src/server/db.js` | Autocannon | Resultado reportado: 18.17 ms de promedio y 35 ms en p99. **Sin evidencia en el repositorio:** no hay script de carga ni Autocannon en `package.json`. |
| NFR-03 Disponibilidad y diseño responsive | GES-22 | `src/server/horario.js`, `src/public/css/` | `tests/turno.test.js` (fuera de horario), manual en Chromium | Aprobado: rechazo fuera de horario; capturas a 320, 360, 768 y 1366 px en `docs/EvidenciaDeDiferentesDisposivosYNavegadores/`. |
| NFR-04 Login, roles y privacidad | GES-8 | `src/server/auth.js`, `src/server/usuarios-iniciales.js`, `src/server/routes/admin.js` | `tests/auth.test.js`, `tests/recepcion.test.js` (acceso), `tests/admin.test.js` (permisos) | Aprobado: contraseñas con `bcryptjs`, sesión con `express-session`, rutas del personal protegidas por rol. |
| NFR-05 Persistencia y recuperación | GES-25 | `database/schema.sql`, `src/server/db.js` | `tests/persistencia.test.js` | Aprobado: los turnos sobreviven al reinicio y los errores no dejan datos a medias. |
| NFR-06 Suite de pruebas automatizadas | GES-34 | `tests/*.test.js` | `npm test` (Jest y Supertest) | Aprobado: 14 suites y 175 pruebas. |
| NFR-07 Compatibilidad de navegadores | GES-18 | `src/public/` | Manual | Parcial: comprobado en Chromium; Firefox y Edge pendientes (`docs/Ux.md`, sección 7). |
| NFR-08 Uso responsable de IA | GES-29 | `docs/ia-responsable.md`, `docs/evidencia/` | Revisión documental | Aprobado. |
| Acceso del cliente por QR | GES-49 | `src/server/routes/qr.js`, `src/public/qr.html`, `src/public/js/qr.js` | `tests/qr.test.js` | Aprobado: genera el QR de la pantalla del cliente y solo lo muestra al personal. |
