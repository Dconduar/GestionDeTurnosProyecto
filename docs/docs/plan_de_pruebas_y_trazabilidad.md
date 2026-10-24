# Plan de pruebas

**Proyecto:** Gestión de Turnos para Atención al Cliente  
**Responsable:** Lucía Sandoval  
**Issues:** GES-30, GES-31, GES-34  
**Actualizado:** 24 de octubre de 2026, a partir de las pruebas actuales

## 1. Cómo se prueba el sistema

| Tipo | Herramienta | Qué valida |
|---|---|---|
| **Unitarias** | Jest | Funciones aisladas, por ejemplo el cálculo de la duración de un servicio y de la espera estimada (`src/server/estimacion.js`). |
| **Integración** | Jest y Supertest | Rutas de la API, reglas del negocio y base de datos juntas: creación y cancelación de turnos, fila, llamados, atención, administración, reportes, login y QR. |
| **Rendimiento** | Autocannon | Comportamiento con muchas peticiones simultáneas (NFR-02). |
| **Manuales** | Navegador | Flujo del cliente en menos de 30 s (NFR-01), diseño responsive (NFR-03) y compatibilidad de navegadores (NFR-07). |

Las pruebas automatizadas usan una base SQLite en memoria (`DB_PATH=':memory:'`), así que no tocan la base real. La variable `IGNORAR_HORARIO=1` permite probar fuera del horario de atención, y `tests/helpers/sesionPersonal.js` inicia sesión con un usuario del personal para las rutas protegidas.

Para ejecutarlas:

```bash
npm test
```

## 2. Matriz de trazabilidad

La relación de cada requerimiento con su especificación, su código, su prueba y su resultado está en [`matriz-de-trazabilidad.md`](matriz-de-trazabilidad.md). Se mantiene en un solo lugar para que no haya dos versiones distintas.

## 3. Archivos de prueba

| Archivo | Suites | Requerimientos |
|---|---|---|
| `tests/turno.test.js` | Servicios, crear turno, consultar turno, cancelar | RF-01, RF-03, NFR-03 |
| `tests/fila.test.js` | `GET /api/turnos/fila` | RF-02 |
| `tests/recepcion.test.js` | Llamar al siguiente, llamados y no asistió, fila de recepción, acceso | RF-04, RF-06, NFR-04 |
| `tests/preferencial.test.js` | Cambiar la prioridad de un turno | RF-04 |
| `tests/marcarAtendido.test.js` | Marcar atendido | RF-05 |
| `tests/serviciosMostradores.test.js` | Servicios y mostradores vinculados | RF-07 |
| `tests/admin.test.js` | Permisos, servicios, mostradores, horarios | RF-08, NFR-04 |
| `tests/auth.test.js` | Login y roles | RF-08, NFR-04 |
| `tests/reportes.test.js` | Reporte general | RF-09, NFR-06 |
| `tests/Reportesfiltro.test.js` | Filtro de fechas y CSV | RF-09 |
| `tests/estimacion.test.js` | Configuración, duración del servicio, espera del turno | RF-10 |
| `tests/persistencia.test.js` | Persistencia entre reinicios, recuperación ante errores | NFR-05 |
| `tests/qr.test.js` | Acceso por QR | GES-49 |
| `tests/salud.test.js` | Esqueleto del proyecto | GES-48 |

## 4. Ejemplos de pruebas

### 4.1. Prueba unitaria: duración estimada de un servicio

Sin historial suficiente, la estimación usa la duración configurada de cada servicio (5, 10 y 7 minutos en los datos de ejemplo).

```js
// tests/estimacion.test.js
const { calcularDuracionServicio } = require('../src/server/estimacion');

test('usa la duración configurada cuando no hay historial', () => {
  expect(calcularDuracionServicio(1)).toBe(300);
  expect(calcularDuracionServicio(2)).toBe(600);
  expect(calcularDuracionServicio(3)).toBe(420);
});
```

### 4.2. Prueba de integración: creación de turno

Verifica que la API cree el turno con su estado, su prioridad y el código con el prefijo del servicio.

```js
// tests/turno.test.js
const request = require('supertest');
const app = require('../src/server/app');

test('crea un turno en estado esperando con prioridad normal y código con prefijo', async () => {
  const res = await request(app).post('/api/turnos').send({ tipo_servicio_id: 2 });
  expect(res.status).toBe(201);
  expect(res.body.estado).toBe('esperando');
  expect(res.body.prioridad).toBe('normal');
  expect(res.body.codigo).toBe('T-001');
});
```

### 4.3. Prueba de integración: números únicos con solicitudes simultáneas

```js
// tests/turno.test.js
test('solicitudes simultáneas reciben números distintos', async () => {
  const respuestas = await Promise.all(
    Array.from({ length: 20 }, () => request(app).post('/api/turnos').send({ tipo_servicio_id: 3 }))
  );
  const numeros = respuestas.map((r) => r.body.numero).sort((x, y) => x - y);
  expect(numeros).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
});
```

## 5. Resultados

| Fecha | Resultado |
|---|---|
| 22 de octubre de 2026 | 10 suites y 119 pruebas aprobadas. |
| 24 de octubre de 2026 | 14 suites y 175 pruebas aprobadas, 0 fallidas. |

## 6. Criterio de éxito

El plan de pruebas se considera completado cuando:

- Todas las pruebas automatizadas se ejecutan con `npm test` sin errores. **Cumplido.**
- Cada requerimiento de la matriz tiene al menos una prueba o una verificación manual documentada. **Cumplido**, salvo lo indicado abajo.
- Las pruebas de rendimiento demuestran que el sistema atiende al menos 100 usuarios simultáneos con respuestas de menos de 2 segundos. **Pendiente de respaldar:** el resultado se reportó, pero el script y su salida no están en el repositorio.

## 7. Limitaciones conocidas

- Las pruebas automatizadas cubren la API, no las pantallas. Los errores de la interfaz se detectan con pruebas manuales en el navegador.
- La compatibilidad con Firefox y Edge (NFR-07) sigue pendiente.
- Las rutas de reportes todavía no exigen sesión de administrador; cuando se protejan habrá que ajustar `tests/reportes.test.js` y `tests/Reportesfiltro.test.js`.
