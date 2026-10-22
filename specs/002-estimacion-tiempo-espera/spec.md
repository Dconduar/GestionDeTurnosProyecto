# Feature Specification: Estimación del tiempo de espera (RF-10)

**Feature:** RF-10 – Estimación del tiempo de espera  
**Created:** 2026-10-22  
**Status:** Draft (pendiente de revisión)  
**Input:** Especificación retrospectiva de la funcionalidad implementada en GES-28. Se documentan las reglas de estimación y los criterios de aceptación para facilitar su validación y mantenimiento.

## User Scenarios & Testing

### User Story 1 - Consultar el tiempo estimado de espera (Priority: P1)

Como cliente que solicita un turno, quiero conocer aproximadamente cuánto tiempo debo esperar para tener una idea de cuándo podría recibir atención.

**Why this priority:** Permite informar al cliente y reducir la incertidumbre mientras espera.

**Independent Test:** Se puede probar creando un turno válido y verificando que el sistema calcula y devuelve una estimación basada en la información disponible.

**Acceptance Scenarios:**

1. **Given** que el cliente solicita un turno válido, **When** el sistema crea el turno, **Then** calcula una estimación de espera y la asocia al turno.

2. **Given** que existen turnos pendientes delante del cliente, **When** se calcula la estimación, **Then** el sistema considera el orden de atención y la prioridad de los turnos.

3. **Given** que existen mostradores configurados para atender determinados servicios, **When** se calcula la estimación, **Then** el sistema considera la compatibilidad de los mostradores con el servicio solicitado.

4. **Given** que el sistema dispone de registros históricos suficientes, **When** calcula la duración aproximada de una atención, **Then** utiliza la información histórica correspondiente.

5. **Given** que no existen suficientes registros históricos, **When** se calcula la estimación, **Then** el sistema utiliza la duración predeterminada configurada para el servicio.

### User Story 2 - Mostrar una estimación comprensible (Priority: P2)

Como cliente, quiero visualizar el tiempo estimado de espera de forma clara para comprender que se trata de un valor aproximado.

**Independent Test:** Se puede probar consultando un turno creado y verificando que la interfaz presenta la estimación sin garantizar una hora exacta de atención.

**Acceptance Scenarios:**

1. **Given** que el sistema ha calculado una estimación, **When** el cliente visualiza la información de su turno, **Then** muestra el tiempo estimado de manera comprensible.

2. **Given** que el tiempo real de atención puede variar, **When** el sistema presenta la estimación, **Then** la comunica como aproximada y no como una garantía.

## Edge Cases

- Si no existen suficientes atenciones históricas, se utiliza la duración predeterminada del servicio.
- Si hay turnos preferenciales, su prioridad debe considerarse en el cálculo.
- Si los mostradores no atienden todos los tipos de servicio, se deben respetar sus compatibilidades.
- Si cambia la cantidad de turnos pendientes, una estimación anterior puede dejar de representar la situación actual.
- La estimación no debe modificar el orden de la fila ni el estado de los turnos.
- La estimación no representa una promesa de atención en un momento exacto.

## Requirements

### Functional Requirements

- **FR-001:** El sistema MUST calcular una estimación de espera al crear un turno válido.
- **FR-002:** El sistema MUST considerar los turnos pendientes y su prioridad.
- **FR-003:** El sistema MUST considerar la disponibilidad operativa y la compatibilidad de los mostradores.
- **FR-004:** El sistema MUST utilizar duraciones históricas de atención cuando existan datos suficientes.
- **FR-005:** El sistema MUST utilizar una duración predeterminada por servicio cuando los datos históricos sean insuficientes.
- **FR-006:** El sistema MUST permitir configurar el mínimo de muestras históricas y la ventana de días utilizados.
- **FR-007:** El sistema MUST devolver la estimación en segundos mediante el campo `espera_estimada_seg`.
- **FR-008:** El sistema MUST presentar la estimación como aproximada.
- **FR-009:** El cálculo MUST mantener intactos el estado y el orden operativo de los turnos.

### Key Entities

- **Turno:** Solicitud de atención con servicio, prioridad, estado y estimación asociada.
- **Servicio:** Tipo de atención que puede tener una duración predeterminada.
- **Mostrador:** Punto de atención con compatibilidad para determinados servicios.
- **Historial de atención:** Registros utilizados para calcular duraciones promedio.
- **Configuración:** Parámetros que determinan la cantidad mínima de muestras y la ventana histórica.

## Success Criteria

### Measurable Outcomes

- **SC-001:** El 100% de las estimaciones calculadas para turnos válidos se expresa en segundos mediante `espera_estimada_seg`.
- **SC-002:** Las pruebas verifican que el cálculo utiliza valores predeterminados cuando no existen suficientes muestras históricas.
- **SC-003:** Las pruebas verifican que se considera la prioridad de los turnos y la compatibilidad de los mostradores.
- **SC-004:** La interfaz identifica la espera como una estimación aproximada.
- **SC-005:** El cálculo no modifica estados ni altera el orden de atención de los turnos.

## Assumptions

- Los turnos y mostradores tienen información operativa disponible para realizar el cálculo.
- La configuración inicial contempla un mínimo de 5 muestras históricas y una ventana de 7 días.
- El resultado es aproximado y puede diferir del tiempo real de atención.
- La estimación utiliza datos operativos y reglas de cálculo; no depende de un modelo de IA generativa.
- Esta especificación documenta una funcionalidad previamente implementada en GES-28 y no debe presentarse como una especificación creada antes de su desarrollo.

## Validation Notes

Esta especificación debe contrastarse con `src/server/estimacion.js`, la integración de creación de turnos y `tests/estimacion.test.js` antes de marcarse como aprobada. Los criterios de aceptación describen el comportamiento esperado, pero no constituyen por sí solos evidencia de que todas las pruebas hayan pasado.