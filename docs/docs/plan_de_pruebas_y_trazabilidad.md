Plan de Pruebas y Matriz de Trazabilidad

Proyecto: Gestion de Turnos para Atencion al Cliente
 Responsable: Lucia Sandoval
 Herramientas: Jest (pruebas unitarias), Supertest (pruebas de integracion) y Autocannon (pruebas de rendimiento)

1. ¿Como se probara el sistema?

Para garantizar el correcto funcionamiento del sistema se utilizaran tres tipos de pruebas:

Pruebas Unitarias (Jest)

Permiten validar funciones y componentes de manera aislada. Estas pruebas se enfocan en la logica del sistema, por ejemplo, el calculo del tiempo estimado de espera.

Pruebas de Integracion (Supertest + Express)

Verifican que las rutas de la API, la logica de negocio y la base de datos funcionen correctamente en conjunto. Se utilizan para probar procesos como la creacion de turnos, la gestion de atencion y la generacion de reportes.

Pruebas de Rendimiento (Autocannon)

Permiten medir el comportamiento del sistema bajo carga, comprobando que el servidor sea capaz de atender multiples solicitudes simultaneas sin degradar su funcionamiento.

2. Matriz de Trazabilidad

Esta matriz relaciona los requerimientos funcionales y no funcionales con las pruebas que validan su cumplimiento.

Requerimiento	Evaluacion	Herramienta	Archivo de prueba	EstadoRF-01: Tomar turno	El cliente obtiene un turno sin necesidad de crear una cuenta y recibe un codigo de identificacion.	Supertest	tests/turnos.test.js	Listo
RF-02: Ver fila en vivo	La lista de espera puede consultarse en tiempo real.	Supertest	tests/turnos.test.js	Listo
RF-03: Cancelar turno	Un turno puede eliminarse de la fila cuando el cliente lo cancela.	Supertest	tests/turnos.test.js	Listo
RF-04: Llamar siguiente	El recepcionista puede llamar al siguiente turno pendiente.	Supertest	tests/atencion.test.js	Listo
RF-05: Marcar atendido	El sistema registra la finalizacion de la atencion y su duracion.	Supertest	tests/atencion.test.js	Listo
RF-06: No asistio	Un turno se marca como no asistido despues de tres llamados sin respuesta.	Supertest	tests/atencion.test.js	Listo
RF-07: Servicios y mostradores	Los turnos son asignados correctamente al servicio o mostrador correspondiente.	Supertest	tests/servicios.test.js	Listo
RF-08: Panel administrativo	Solo usuarios con rol de administrador pueden acceder al panel.	Supertest	tests/admin.test.js	Listo
RF-09: Reportes	Se generan metricas como tiempo promedio de espera, saturacion y duracion de atencion.	Supertest	tests/reportes.test.js	Listo
RF-10: Estimacion de espera	Se calcula correctamente el tiempo estimado de espera segun la cantidad de turnos en fila.	Jest	tests/estimacion.test.js	Listo
NFR-01: Toma rapida	El proceso de obtencion de turno es sencillo y puede realizarse en menos de 30 segundos.	Pruebas manuales	Pruebas de usuario	Listo
NFR-02: Rendimiento	El sistema soporta 100 usuarios concurrentes manteniendo tiempos de respuesta menores a 2 segundos.	Autocannon	tests/carga.js	Listo
NFR-04: Login y roles	Las contrasenas estan protegidas mediante bcryptjs y las sesiones se gestionan correctamente.	Supertest	tests/auth.test.js	Listo
NFR-05: Persistencia	La base de datos conserva la informacion ante errores o reinicios inesperados.	SQLite / Jest	tests/turnos.test.js	Listo
NFR-06: Cobertura de pruebas	Todas las pruebas automatizadas se ejecutan correctamente sin errores.	Jest CLI	npm test	Listo
3. Ejemplos de Pruebas
3.1 Prueba Unitaria: Calculo de Tiempo de Espera

Esta prueba valida la formula utilizada para estimar el tiempo de espera de un cliente.

Formula utilizada:

Tiempo estimado = Turnos delante × Promedio por turno

// tests/estimacion.test.js

const { calcularEspera } = require('../src/services/estimacion');

test('calcula el tiempo de espera multiplicando turnos por promedio', () => {
  const minutos = calcularEspera(3, 5);

  expect(minutos).toBe(15);
});

3.2 Prueba de Integracion: Creacion de Turno

Esta prueba verifica que la API permita crear un turno correctamente y devuelva la informacion esperada.

// tests/turnos.test.js

const request = require('supertest');
const app = require('../src/app');

test('POST /api/turnos crea un nuevo turno correctamente', async () => {
  const respuesta = await request(app)
    .post('/api/turnos')
    .send({ servicio_id: 1 });

  expect(respuesta.statusCode).toBe(201);
  expect(respuesta.body).toHaveProperty('id');
  expect(respuesta.body.estado).toBe('en_espera');
});

4. Criterio de Exito

El plan de pruebas se considerara completado satisfactoriamente cuando se cumplan las siguientes condiciones:

Todas las pruebas automatizadas se ejecutan correctamente mediante npm test sin presentar errores.
Las pruebas de rendimiento realizadas con Autocannon demuestran que el sistema puede atender al menos 100 usuarios concurrentes manteniendo tiempos de respuesta inferiores a 2 segundos.
Los requerimientos funcionales y no funcionales definidos en la matriz de trazabilidad se encuentran validados y marcados como completados.