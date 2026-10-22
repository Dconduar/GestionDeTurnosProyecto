# Feature Specification: Consulta de reportes

**Feature:** RF-09 – Reportes administrativos  
**Created:** 2026-10-22  
**Status:** Draft (pendiente de revisión)  
**Input:** Especificación basada en `docs/casos-de-uso.md`, caso CU-09.

## User Scenarios & Testing

### User Story 1 - Consultar reportes de atención (Priority: P1)

Como administrador, quiero consultar reportes sobre la atención de turnos para conocer el funcionamiento del sistema y apoyar la toma de decisiones.

**Why this priority:** Los reportes permiten analizar la operación del establecimiento utilizando información registrada por el sistema.

**Independent Test:** Se puede probar consultando un reporte con registros existentes y verificando que los resultados correspondan a la información almacenada.

**Acceptance Scenarios:**

1. **Given** que un administrador tiene una sesión autorizada y existen registros de atención, **When** solicita un reporte, **Then** el sistema consulta la información almacenada y presenta los resultados.
2. **Given** que existen turnos con diferentes estados, **When** el administrador consulta un reporte que utiliza dichos estados, **Then** los resultados se calculan a partir de los registros correspondientes.
3. **Given** que el administrador consulta un reporte, **When** el sistema obtiene los datos, **Then** la operación no modifica los turnos ni su historial.

### User Story 2 - Consultar reportes sin información disponible (Priority: P2)

Como administrador, quiero recibir un mensaje claro cuando no existan registros para un reporte, en lugar de obtener resultados confusos.

**Independent Test:** Se puede probar realizando una consulta sin registros coincidentes.

**Acceptance Scenarios:**

1. **Given** que no existen datos para el reporte solicitado, **When** el administrador realiza la consulta, **Then** el sistema muestra un resultado vacío o un mensaje indicando que no hay información disponible.
2. **Given** que ocurre un error al consultar la base de datos, **When** se solicita el reporte, **Then** el sistema informa que no fue posible obtener los resultados.
3. **Given** que la consulta falla, **When** se produce el error, **Then** los registros existentes permanecen sin modificaciones.

### User Story 3 - Restringir el acceso a los reportes (Priority: P1)

Como administrador, quiero que los reportes estén protegidos para evitar que usuarios no autorizados consulten información administrativa.

**Independent Test:** Se puede probar solicitando un reporte con una sesión sin permisos administrativos.

**Acceptance Scenarios:**

1. **Given** que un usuario no tiene permisos de administrador, **When** intenta consultar un reporte administrativo, **Then** el sistema rechaza la solicitud.
2. **Given** que no existe una sesión válida, **When** se solicita un reporte protegido, **Then** el sistema impide el acceso.
3. **Given** que un administrador autorizado solicita un reporte, **When** se validan sus permisos, **Then** el sistema permite continuar con la consulta.

## Edge Cases

- No existen registros para el reporte solicitado.
- Un usuario sin permisos intenta consultar información administrativa.
- La sesión del administrador no es válida.
- Existen turnos con diferentes estados.
- Algunos registros carecen de valores necesarios para calcular un indicador.
- La consulta SQL produce un error.
- La base de datos no está disponible.
- Los parámetros de filtrado, cuando se definan, contienen valores inválidos.

## Requirements

### Functional Requirements

- **FR-001:** El sistema MUST permitir que los administradores autorizados consulten reportes de atención.
- **FR-002:** El sistema MUST obtener la información de los registros almacenados en la base de datos.
- **FR-003:** El sistema MUST calcular los indicadores definidos por el equipo a partir de los datos correspondientes.
- **FR-004:** El sistema MUST impedir que usuarios sin autorización accedan a los reportes administrativos.
- **FR-005:** El sistema MUST manejar las consultas sin resultados de forma comprensible.
- **FR-006:** El sistema MUST manejar los errores de consulta sin modificar la información almacenada.
- **FR-007:** El sistema MUST realizar las consultas de reportes sin alterar el estado de los turnos.
- **FR-008:** El sistema MUST validar los parámetros de consulta que se establezcan para los reportes.

## Key Entities

- **Administrador:** Usuario autorizado para consultar reportes.
- **Turno:** Registro de atención utilizado como fuente de información.
- **Servicio:** Tipo de atención asociado a un turno.
- **Mostrador:** Punto de atención relacionado con los registros operativos.
- **Reporte:** Resultado de una consulta que presenta información de la operación.

## Success Criteria

### Measurable Outcomes

- **SC-001:** Las consultas autorizadas con datos disponibles devuelven resultados consistentes con los registros almacenados.
- **SC-002:** El 100% de los intentos de acceso sin autorización incluidos en las pruebas son rechazados.
- **SC-003:** Las consultas sin registros se manejan sin errores inesperados.
- **SC-004:** Las pruebas confirman que consultar reportes no modifica los turnos ni su historial.
- **SC-005:** Los errores de base de datos se manejan sin cambios parciales en la información.

## Assumptions

- Los reportes administrativos se consultan únicamente con permisos de administrador.
- La información proviene de registros operativos almacenados en la base de datos.
- Las consultas de reportes son de solo lectura.
- Los indicadores y filtros específicos todavía requieren confirmación del equipo.
- Esta especificación describe el comportamiento esperado y no confirma que todas las funciones estén implementadas.

## Open Questions

Las siguientes decisiones deben confirmarse con el equipo y coordinarse con la tarea GES-32:

1. ¿Qué indicadores específicos incluirán los reportes?
2. ¿Qué filtros estarán disponibles para el administrador?
3. ¿Cómo se presentarán los resultados?
4. ¿Se permitirá exportar reportes o únicamente consultarlos en el sistema?

Estas preguntas no deben considerarse requisitos aprobados hasta que el equipo tome una decisión.

## Validation Notes

Antes de aprobar esta especificación, se debe verificar su correspondencia con:

- `docs/casos-de-uso.md`
- `docs/modelo-de-datos.md`
- `database/schema.sql`
- Los módulos de reportes existentes
- Las pruebas automatizadas disponibles
- Las decisiones tomadas en GES-32

Los criterios de aceptación deberán actualizarse cuando se definan los indicadores y filtros exactos.