# Feature Specification: Administración de servicios, mostradores y horarios

**Feature:** RF-08 – Configuración administrativa  
**Created:** 2026-10-22  
**Status:** Draft (pendiente de revisión)  
**Input:** Especificación basada en `docs/casos-de-uso.md`, caso CU-08, y las reglas compartidas del proyecto.

## User Scenarios & Testing

### User Story 1 - Administrar tipos de servicio (Priority: P1)

Como administrador, quiero consultar y modificar los servicios disponibles para mantener actualizadas las opciones de atención que ofrece el establecimiento.

**Why this priority:** Los servicios determinan qué turnos pueden solicitar los clientes y qué atención ofrece cada mostrador.

**Independent Test:** Se puede probar registrando o modificando un servicio válido y verificando que los cambios se guarden correctamente.

**Acceptance Scenarios:**

1. **Given** que el administrador tiene una sesión autorizada, **When** ingresa a la configuración de servicios, **Then** el sistema muestra los servicios registrados.
2. **Given** que el administrador proporciona datos válidos para un servicio, **When** confirma su registro o modificación, **Then** el sistema guarda los cambios y muestra la información actualizada.
3. **Given** que los datos son inválidos o duplicados, **When** intenta guardar el servicio, **Then** el sistema rechaza la operación e informa el motivo.
4. **Given** que un servicio debe dejar de ofrecerse, **When** el administrador lo desactiva, **Then** el sistema conserva su historial y registra `activo=0`.

### User Story 2 - Administrar mostradores (Priority: P1)

Como administrador, quiero configurar los mostradores para organizar los puntos de atención disponibles.

**Independent Test:** Se puede probar modificando la configuración de un mostrador y verificando que los cambios persistan en la base de datos.

**Acceptance Scenarios:**

1. **Given** que el administrador ingresa a la configuración de mostradores, **When** consulta los registros, **Then** el sistema muestra la configuración existente.
2. **Given** que proporciona datos válidos, **When** registra o modifica un mostrador, **Then** el sistema guarda la configuración correctamente.
3. **Given** que un mostrador debe desactivarse, **When** el administrador confirma la operación, **Then** el sistema conserva sus referencias históricas mediante `activo=0`.
4. **Given** que ocurre un error al guardar los cambios, **When** falla la operación, **Then** el sistema mantiene la configuración anterior.

### User Story 3 - Administrar horarios de atención (Priority: P2)

Como administrador, quiero configurar los horarios de atención para que el sistema conozca cuándo se pueden solicitar turnos.

**Independent Test:** Se puede probar registrando o modificando un horario y verificando que se almacene correctamente.

**Acceptance Scenarios:**

1. **Given** que el administrador tiene una sesión autorizada, **When** consulta los horarios, **Then** el sistema muestra la configuración existente.
2. **Given** que introduce un horario válido, **When** guarda la configuración, **Then** el sistema registra los cambios.
3. **Given** que introduce datos inválidos, **When** intenta guardar, **Then** el sistema rechaza la operación sin alterar la configuración anterior.
4. **Given** que se actualizó correctamente un horario, **When** se consulta nuevamente, **Then** el sistema muestra los valores guardados.

## Edge Cases

- Un usuario sin permisos intenta acceder a la configuración administrativa.
- Se intenta registrar un servicio con datos inválidos o duplicados.
- Se intenta modificar un servicio inexistente.
- Se intenta configurar un mostrador con datos incorrectos.
- Se desactiva un servicio o mostrador que tiene registros históricos.
- Se introduce un horario inválido.
- Ocurre un error de base de datos durante una modificación.
- Se intenta guardar información que incumple las restricciones del modelo de datos.

## Requirements

### Functional Requirements

- **FR-001:** El sistema MUST permitir consultar la configuración de servicios, mostradores y horarios a usuarios administradores autorizados.
- **FR-002:** El sistema MUST permitir registrar y modificar tipos de servicio con datos válidos.
- **FR-003:** El sistema MUST permitir registrar y modificar mostradores con datos válidos.
- **FR-004:** El sistema MUST permitir registrar y modificar horarios de atención con datos válidos.
- **FR-005:** El sistema MUST validar las restricciones de los datos antes de guardar cambios.
- **FR-006:** El sistema MUST rechazar registros inválidos o duplicados cuando corresponda.
- **FR-007:** El sistema MUST impedir modificaciones administrativas realizadas por usuarios sin autorización.
- **FR-008:** El sistema MUST conservar las referencias históricas al desactivar servicios o mostradores mediante borrado lógico (`activo=0`).
- **FR-009:** El sistema MUST conservar la configuración anterior cuando una operación de persistencia falla.
- **FR-010:** El sistema MUST mostrar la información actualizada después de una modificación exitosa.

### Key Entities

- **Administrador:** Usuario autorizado para configurar el sistema.
- **Tipo de servicio:** Servicio que puede solicitar un cliente.
- **Mostrador:** Punto de atención del establecimiento.
- **Horario de atención:** Configuración de los períodos durante los cuales se ofrece atención.
- **Configuración administrativa:** Conjunto de parámetros utilizados para organizar la operación.

## Success Criteria

### Measurable Outcomes

- **SC-001:** En las pruebas funcionales, las modificaciones válidas se guardan y pueden consultarse posteriormente.
- **SC-002:** Los intentos de modificación sin autorización son rechazados.
- **SC-003:** Los datos inválidos o duplicados no generan registros incorrectos.
- **SC-004:** La desactivación de servicios y mostradores conserva sus referencias históricas.
- **SC-005:** Los errores de persistencia no producen modificaciones parciales.

## Assumptions

- Las operaciones administrativas requieren una sesión con rol administrador.
- Los servicios y mostradores pueden desactivarse mediante el campo `activo`.
- La configuración de horarios se almacena conforme al modelo de datos del proyecto.
- Las restricciones exactas de cada campo deben comprobarse con `database/schema.sql`.
- Esta especificación describe el comportamiento esperado y no confirma que todas las funciones estén implementadas.

## Validation Notes

Antes de aprobar esta especificación, se debe verificar su correspondencia con:

- `docs/modelo-de-datos.md`
- `database/schema.sql`
- Los módulos de administración existentes
- Las pruebas automatizadas disponibles

Los criterios de aceptación deben revisarse con el equipo antes de marcar la especificación como aprobada.