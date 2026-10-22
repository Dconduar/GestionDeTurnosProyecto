# Plan de implementación — Requisitos restantes

**Proyecto:** Gestión de Turnos para Atención al Cliente  
**Referencia:** GES-44  
**Rama:** `celeste/analisisproyecto`  
**Estado:** Plan documental pendiente de revisión del equipo

## 1. Alcance

Este plan cubre los requisitos asignados a GES-44 que no corresponden a la estimación del tiempo de espera:

| Especificación | Requisitos |
|---|---|
| `003-recepcionista-turnos/spec.md` | RF-04, RF-05 y RF-06 |
| `004-asignacion-mostradores/spec.md` | RF-07 |
| `005-administracion/spec.md` | RF-08 |
| `006-reportes/spec.md` | RF-09 |
| `007-requisitos-no-funcionales/spec.md` | Requisitos no funcionales |

El flujo del cliente RF-01 a RF-03 pertenece a la especificación elaborada por Daniel y no se modifica en este trabajo.

## 2. Contexto técnico

El proyecto utiliza HTML, CSS y JavaScript en el frontend, Node.js con Express en el backend y SQLite para la persistencia de información.

Se conservará la arquitectura existente y se evitará introducir nuevas tecnologías sin aprobación del equipo.

## 3. Estrategia por módulo

### Recepcionista — RF-04 a RF-06

Revisar los flujos de consulta, gestión y atención de turnos definidos en la especificación.

La implementación deberá validar las operaciones en el servidor y respetar las reglas de estado y prioridad de los turnos.

### Asignación de mostradores — RF-07

La asignación del mostrador se realizará al momento de llamar un turno, considerando los mostradores activos y compatibles con el servicio.

Se deberán revisar los casos en que no exista un mostrador disponible y evitar asignaciones inconsistentes.

### Administración — RF-08

Las operaciones de administración deberán permitir gestionar los elementos definidos en la especificación, respetando las restricciones de integridad y seguridad.

Se priorizará la desactivación lógica cuando corresponda, para conservar la información histórica.

### Reportes — RF-09

Los reportes utilizarán información persistida en SQLite y tendrán carácter de consulta.

Los filtros, indicadores y formatos definitivos deberán confirmarse con el equipo antes de validar completamente el requisito.

### Requisitos no funcionales

Se revisarán seguridad, privacidad, persistencia, compatibilidad con navegadores, accesibilidad, diseño adaptable y actualización periódica de la fila.

La meta de 100 clientes simultáneos requiere pruebas de carga antes de considerarse cumplida.

## 4. Estrategia de validación

1. Comparar cada implementación con su `spec.md`.
2. Verificar los criterios de aceptación de cada requisito.
3. Ejecutar las pruebas disponibles.
4. Registrar los casos que no puedan comprobarse.
5. Solicitar revisión del equipo antes de aprobar los resultados.

## 5. Revisión de principios

Este plan se basa provisionalmente en `docs/propuesta-constitucion.md`.

La constitución oficial de Spec Kit todavía está pendiente de ratificación, por lo que esta revisión no representa su aprobación formal.

## 6. Dependencias y pendientes

- Confirmar las decisiones abiertas de RF-09.
- Confirmar la definición de NFR-06.
- Revisar el estado de la autenticación y autorización del personal.
- Validar mediante pruebas los requisitos no funcionales que aún no cuentan con evidencia.
- Obtener revisión del equipo.

## 7. Resultado esperado

Contar con especificaciones, planificación y tareas trazables para RF-04 a RF-09 y los requisitos no funcionales, sin modificar la especificación del flujo del cliente elaborada por otro integrante.

**Nota:** Este plan fue redactado manualmente y no debe presentarse como generado mediante el comando `speckit-plan`.