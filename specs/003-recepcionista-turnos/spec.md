# Feature Specification: Gestión de turnos por recepcionista

**Feature:** RF-04, RF-05 y RF-06  
**Created:** 2026-10-22  
**Status:** Draft (pendiente de revisión)  
**Input:** Especificación basada en `docs/casos-de-uso.md`, casos CU-04, CU-05 y CU-06. Incluye la dependencia con RF-07.

## User Scenarios & Testing

### User Story 1 - Llamar al siguiente turno (Priority: P1)

Como recepcionista, quiero llamar al siguiente turno disponible para atender a los clientes en el orden correspondiente.

**Why this priority:** Es una operación esencial para avanzar la fila y comenzar la atención.

**Independent Test:** Se puede probar creando varios turnos con diferentes prioridades y servicios, y verificando que se seleccione el primer turno elegible para el mostrador.

**Acceptance Scenarios:**

1. **Given** que existen turnos en estado `esperando`, **When** la recepcionista solicita llamar al siguiente, **Then** el sistema selecciona el primer turno compatible con su mostrador, priorizando `preferencial` y después el número de turno.
2. **Given** que existe un turno elegible, **When** se realiza el llamado, **Then** el turno cambia a `en_atencion` y queda asociado al mostrador y a la recepcionista.
3. **Given** que se llama correctamente un turno, **When** termina la operación, **Then** el sistema registra el llamado y muestra el número de turno y mostrador.
4. **Given** que no existen turnos elegibles, **When** se solicita llamar al siguiente, **Then** el sistema informa la situación sin modificar registros.
5. **Given** que dos recepcionistas solicitan el siguiente turno simultáneamente, **When** se procesan las solicitudes, **Then** el sistema impide asignar el mismo turno a dos mostradores.

### User Story 2 - Marcar turno como atendido (Priority: P2)

Como recepcionista, quiero marcar un turno como atendido para registrar que la atención terminó y conservar su duración.

**Independent Test:** Se puede probar con un turno `en_atencion` y verificar que cambie a `atendido`, registrando el tiempo correspondiente.

**Acceptance Scenarios:**

1. **Given** que un turno está `en_atencion` en el mostrador de la recepcionista, **When** selecciona "Marcar atendido", **Then** el sistema registra `fin_atencion`, calcula `duracion_seg` y cambia el estado a `atendido`.
2. **Given** que el turno ya está finalizado o tiene otro estado, **When** se intenta marcar como atendido, **Then** se rechaza la operación sin modificar su estado.
3. **Given** que falta una marca de inicio válida, **When** se intenta finalizar la atención, **Then** el sistema evita almacenar una duración inválida.
4. **Given** que ocurre un error de persistencia, **When** se procesa la finalización, **Then** se conserva el estado anterior y se informa el error.

### User Story 3 - Marcar que el cliente no asistió (Priority: P3)

Como recepcionista, quiero registrar que un cliente no se presentó después de los llamados permitidos para poder continuar con la atención de otros turnos.

**Independent Test:** Se puede probar con un turno `en_atencion` y verificar que únicamente se marque `no_asistio` cuando se haya alcanzado el máximo de llamados configurado.

**Acceptance Scenarios:**

1. **Given** que un turno está `en_atencion`, **When** la recepcionista realiza un nuevo llamado, **Then** el sistema registra el intento en el historial de `llamados`.
2. **Given** que el turno alcanzó `max_llamados`, **When** la recepcionista confirma la ausencia, **Then** el sistema cambia su estado a `no_asistio`.
3. **Given** que todavía no se alcanza el máximo de llamados, **When** se intenta marcar ausencia, **Then** el sistema rechaza la operación.
4. **Given** que el cliente responde antes del máximo permitido, **When** continúa la atención, **Then** el turno no se marca como ausente.
5. **Given** que el turno ya fue finalizado, **When** se intenta marcar ausencia, **Then** se rechaza la transición.

## Edge Cases

- No existen turnos pendientes compatibles con el mostrador.
- El mostrador está inactivo o no tiene servicios habilitados.
- La recepcionista no tiene una sesión autorizada.
- Dos recepcionistas intentan llamar simultáneamente al mismo turno.
- Ocurre un error mientras se registra el llamado o se asigna el mostrador.
- Se intenta finalizar un turno que no está `en_atencion`.
- Falta una fecha válida de inicio de atención.
- Se intenta registrar ausencia antes de alcanzar el máximo de llamados.
- El cliente se presenta antes de completar los llamados.
- Un turno ya finalizado recibe una solicitud de cambio de estado.

## Requirements

### Functional Requirements

- **FR-001:** El sistema MUST permitir llamar al siguiente turno elegible desde una sesión autorizada de recepcionista.
- **FR-002:** El sistema MUST seleccionar únicamente turnos `esperando` compatibles con el mostrador activo.
- **FR-003:** El sistema MUST priorizar los turnos `preferencial` y después el número de turno.
- **FR-004:** El sistema MUST asociar el turno llamado al mostrador y a la recepcionista conforme a RF-07.
- **FR-005:** El sistema MUST cambiar el turno llamado a `en_atencion` y registrar el llamado.
- **FR-006:** El sistema MUST impedir asignaciones duplicadas durante llamadas concurrentes.
- **FR-007:** El sistema MUST permitir finalizar únicamente turnos válidos en estado `en_atencion`.
- **FR-008:** Al finalizar la atención, el sistema MUST registrar `fin_atencion`, calcular `duracion_seg` y cambiar el estado a `atendido`.
- **FR-009:** El sistema MUST evitar duraciones inválidas y cierres duplicados.
- **FR-010:** El sistema MUST conservar el historial de llamados.
- **FR-011:** El sistema MUST permitir marcar `no_asistio` únicamente después de alcanzar `max_llamados`.
- **FR-012:** El sistema MUST permitir configurar el máximo de llamados, cuyo valor inicial previsto es 3.
- **FR-013:** El sistema MUST validar los permisos y las transiciones de estado desde el servidor.
- **FR-014:** El sistema MUST evitar cambios parciales ante errores de persistencia.

### Key Entities

- **Recepcionista:** Usuario autorizado para realizar operaciones de atención.
- **Turno:** Solicitud con número, servicio, prioridad y estado.
- **Mostrador:** Punto de atención asignado a una recepcionista y compatible con determinados servicios.
- **Llamado:** Registro de un intento de llamar a un turno.
- **Configuración:** Parámetros operativos, incluido `max_llamados`.

## Success Criteria

### Measurable Outcomes

- **SC-001:** En las pruebas de selección, todos los turnos llamados respetan la prioridad y compatibilidad del mostrador.
- **SC-002:** En las pruebas de concurrencia, ningún turno queda asignado simultáneamente a dos mostradores.
- **SC-003:** Los turnos finalizados correctamente registran su duración y el estado `atendido`.
- **SC-004:** Los intentos de marcar ausencia antes del máximo de llamados son rechazados.
- **SC-005:** Las operaciones no autorizadas o las transiciones inválidas no modifican los turnos.

## Assumptions

- La recepcionista utiliza una sesión autorizada y está vinculada con un mostrador activo.
- Los estados válidos son `esperando`, `en_atencion`, `atendido`, `no_asistio` y `cancelado`.
- `inicio_atencion` se registra cuando se llama al turno, según el modelo descrito en CU-05.
- El máximo inicial de llamados es 3 y debe poder configurarse.
- El intervalo entre llamados todavía requiere una decisión del equipo.
- RF-07 es una dependencia de RF-04 y se documentará con mayor detalle en la especificación de mostradores.
- Este documento expresa el comportamiento esperado y no confirma que todas las funciones estén implementadas.

## Validation Notes

Antes de aprobar esta especificación, el equipo debe revisar su correspondencia con el modelo de datos, los módulos implementados y las pruebas disponibles. También debe confirmar las reglas pendientes relacionadas con los intervalos entre llamados.