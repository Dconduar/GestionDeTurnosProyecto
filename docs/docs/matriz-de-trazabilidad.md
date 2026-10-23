Matriz de Trazabilidad (Requerimiento ↔ Prueba)

Proyecto: Gestion de Turnos para Atencion al Cliente
 ISSUES: (GES-31)
 Ciclo: Ciclo 2

Esta matriz relaciona cada requerimiento funcional (RF) y no funcional (NFR) con su especificacion, su issue correspondiente en Linear, los archivos de codigo que lo implementan, la prueba automatizada o manual que lo valida y su resultado final de verificacion.

Requerimiento	Especificacion	Issue de Linear	Archivo(s) de codigo	Prueba	ResultadoRF-01: Tomar turno sin cuenta	specs/rf-01.md	GES-15	src/server/routes/turnos.js, src/public/cliente.html	tests/turno.test.js	Aprobado (201 Created y codigo asignado)
RF-02: Consultar la fila en tiempo real	specs/rf-02.md	GES-16	src/server/fila.js, src/public/js/cliente.js	tests/fila.test.js	Aprobado (polling de 2 s y lista activa)
RF-03: Cancelar turno y actualizar fila	specs/rf-03.md	GES-27	src/server/routes/turnos.js	tests/turno.test.js	Aprobado (estado cancelado y calculo de cola)
RF-04: Llamar al siguiente turno	specs/rf-04.md	GES-19	src/server/routes/recepcion.js, src/public/recepcion.html	tests/recepcion.test.js	Aprobado (pasa a en_atencion y ventanilla)
RF-05: Marcar atendido y duracion	specs/rf-05.md	GES-24	src/server/routes/recepcion.js, database/schema.sql	tests/marcarAtendido.test.js	Aprobado (calcula duracion_seg y fin)
RF-06: No asistio tras 3 llamados	specs/rf-06.md	GES-20	src/server/routes/recepcion.js, database/schema.sql	tests/recepcion.test.js	Aprobado (conteo de llamados y no_asistio)
RF-07: Servicios y mostradores vinculados	specs/rf-07.md	GES-23	database/schema.sql, src/server/db.js	tests/serviciosMostradores.test.js	Aprobado (integridad referencial FK)
RF-08: Panel de administracion	specs/rf-08.md	GES-7	src/server/routes/admin.js, src/public/admin.html	tests/auth.test.js	Aprobado (bloqueo y gestion por rol)
RF-09: Reportes analiticos	specs/rf-09.md	GES-32	src/server/routes/reportes.js, src/public/admin.html	tests/reportes.test.js	Aprobado (GROUP BY espera, saturacion y duracion)
RF-10: Estimacion de tiempo de espera	specs/rf-10.md	GES-28	src/server/estimacion.js	tests/estimacion.test.js	Aprobado (algoritmo predictivo verificado)
NFR-01: Tomar turno en menos de 30 s	specs/nfr-01.md	GES-17	src/public/cliente.html, src/public/css/	Manual / UX	Aprobado (flujo directo sin registro)
NFR-02: Rendimiento (2 s y 100 clientes)	specs/nfr-02.md	GES-33	src/server/app.js, src/server/db.js	autocannon (HTTP 200)	Aprobado (18.17 ms avg / p99: 35 ms)
NFR-03: Disponibilidad y responsive	specs/nfr-03.md	GES-22	src/public/css/	Manual (Chrome DevTools)	Aprobado (adaptable a movil y desktop)
NFR-04: Login, roles y privacidad	specs/nfr-04.md	GES-8	src/server/auth.js, src/server/usuarios-iniciales.js	tests/auth.test.js	Aprobado (bcryptjs y express-session)
NFR-05: Persistencia y fallos	specs/nfr-05.md	GES-25	database/schema.sql, src/server/db.js	tests/persistencia.test.js	Aprobado (transacciones SQLite seguras)
NFR-06: Pruebas de integracion y suite	specs/nfr-06.md	GES-34	tests/*.test.js	npm test (Jest + Supertest)	Aprobado (119 pruebas pasando en verde)
NFR-07: Compatibilidad de navegadores	specs/nfr-07.md	GES-18	src/public/	Manual (Chrome, Firefox, Edge)	Aprobado (estandar HTML5/CSS3)
NFR-08: Documento de IA responsable	specs/nfr-08.md	GES-29	docs/ia-responsable.md	Revision documental	Aprobado (documentacion y etica)