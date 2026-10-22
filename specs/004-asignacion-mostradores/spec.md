# Feature Specification: Asignación de turnos a mostradores

**Feature:** RF-07 – Asociar turno a mostrador  
**Created:** 2026-10-22  
**Status:** Draft (pendiente de revisión)  
**Input:** Especificación basada en `docs/casos-de-uso.md`, caso CU-07, y su dependencia con RF-04.

## User Scenarios & Testing

### User Story 1 - Asociar un turno a un mostrador compatible (Priority: P1)

Como recepcionista, quiero que el sistema asigne el turno que llamo a mi mostrador, siempre que esté habilitado para atender el servicio solicitado.

**Why this priority:** Garantiza que los clientes sean dirigidos al mostrador correspondiente y evita asignaciones incompatibles.

**Independent Test:** Se puede probar creando un turno en espera, configurando un mostrador compatible y verificando que la asignación se realice al llamar el turno.

**Acceptance Scenarios:**

1. **Given** que existe un turno `esperando` y un mostrador activo compatible con su servicio, **When** la recepcionista llama al siguiente turno, **Then** el sistema asocia el turno con ese mostrador.
2. **Given** que la recepcionista está vinculada a un mostrador mediante `usuarios.mostrador_id`, **When** realiza un llamado válido, **Then** el sistema registra el mostrador en `turnos.mostrador_id` y la recepcionista en `turnos.atendido_por`.
3. **Given** que un turno acaba de crearse y permanece `esperando`, **When** se consulta su información, **Then** todavía no tiene un mostrador asignado.
4. **Given** que el turno fue llamado correctamente, **When** se consulta la información del llamado, **Then** el mostrador y la recepcionista coinciden con la asignación registrada.

### User Story 2 - Evitar asignaciones incompatibles (Priority: P2)

Como recepcionista, quiero que el sistema impida asignar turnos a mostradores que no atienden el servicio correspondiente.

**Independent Test:** Se puede probar intentando llamar un turno cuyo servicio no está habilitado para el mostrador.

**Acceptance Scenarios:**

1. **Given** que un mostrador no tiene habilitado el servicio del turno, **When** se intenta realizar la asignación, **Then** el sistema no asigna ese turno al mostrador.
2. **Given** que un mostrador está inactivo, **When** se intenta llamar un turno desde él, **Then** el sistema rechaza la operación.
3. **Given** que la recepcionista no tiene un mostrador asignado, **When** solicita llamar al siguiente turno, **Then** el sistema impide el llamado.
4. **Given** que ocurre un error durante la asignación, **When** la operación falla, **Then** no quedan modificaciones parciales en el turno ni en el registro del llamado.

## Edge Cases

- El turno solicitado ya no está `esperando`.
- El mostrador está inactivo.
- El servicio del turno no está habilitado para el mostrador.
- La recepcionista no tiene mostrador asignado.
- No existen turnos compatibles pendientes.
- Dos recepcionistas intentan llamar al mismo turno simultáneamente.
- Se produce un error al registrar el mostrador o la recepcionista.
- Se intenta asignar un mostrador antes de llamar al turno.

## Requirements

### Functional Requirements

- **FR-001:** El sistema MUST identificar el servicio asociado al turno mediante `tipo_servicio_id`.
- **FR-002:** El sistema MUST identificar el mostrador de la recepcionista mediante `usuarios.mostrador_id`.
- **FR-003:** El sistema MUST comprobar la compatibilidad entre servicio y mostrador mediante `mostrador_servicio`.
- **FR-004:** El sistema MUST permitir asignaciones únicamente a mostradores activos y compatibles.
- **FR-005:** El sistema MUST asignar `turnos.mostrador_id` y `turnos.atendido_por` cuando se realiza un llamado válido.
- **FR-006:** El sistema MUST impedir que un turno `esperando` tenga un mostrador asignado antes de ser llamado.
- **FR-007:** El sistema MUST mantener consistente la asignación del turno y la información del llamado.
- **FR-008:** El sistema MUST impedir asignaciones duplicadas o inconsistentes durante operaciones concurrentes.
- **FR-009:** El sistema MUST evitar cambios parciales cuando falla una operación.
- **FR-010:** El sistema MUST validar permisos y compatibilidad desde el servidor.

## Key Entities

- **Turno:** Solicitud de atención con un servicio, estado y mostrador asignado cuando corresponde.
- **Servicio:** Tipo de atención solicitado por el cliente.
- **Mostrador:** Punto de atención que ofrece determinados servicios.
- **Recepcionista:** Usuario vinculado a un mostrador.
- **Mostrador-servicio:** Relación que establece qué servicios puede atender cada mostrador.
- **Llamado:** Registro de la operación mediante la cual se solicita la presencia del cliente.

## Success Criteria

### Measurable Outcomes

- **SC-001:** El 100% de las asignaciones válidas en las pruebas corresponde a mostradores compatibles con el servicio.
- **SC-002:** Ningún turno recién creado recibe un mostrador antes de ser llamado.
- **SC-003:** Las pruebas de concurrencia verifican que un turno no pueda asignarse simultáneamente a dos mostradores.
- **SC-004:** Los intentos de asignación desde mostradores inactivos o incompatibles son rechazados.
- **SC-005:** Ante errores de persistencia, no quedan asignaciones parciales.

## Assumptions

- RF-07 forma parte del proceso de llamado definido en RF-04.
- Los turnos se crean inicialmente en estado `esperando` y sin mostrador asignado.
- La relación `mostrador_servicio` determina los servicios compatibles.
- La recepcionista está vinculada a un mostrador mediante `usuarios.mostrador_id`.
- La asignación ocurre al llamar el turno, no cuando el cliente lo solicita.
- Los permisos deben comprobarse desde el servidor.
- La especificación describe el comportamiento esperado; su implementación y pruebas requieren validación.

## Validation Notes

Antes de aprobar esta especificación, se debe comprobar su correspondencia con `docs/modelo-de-datos.md`, `database/schema.sql`, el código de llamado de turnos y las pruebas disponibles.

También debe verificarse que RF-07 sea consistente con la especificación de recepcionista (RF-04 a RF-06).