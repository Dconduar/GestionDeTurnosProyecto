# Feature Specification: Flujo del cliente en la fila

**Feature Branch**: `001-client-queue-flow`

**Created**: 2026-10-16

**Status**: Draft (revisada)

**Input**: User description: "Flujo del cliente de un sistema de gestión de turnos para atención al cliente: RF-01 tomar turno sin cuenta, RF-02 consultar la fila en tiempo real y RF-03 cancelar turno y actualizar la fila. El cliente no tiene cuenta y no se guardan datos personales (nombre, teléfono ni correo). El cliente elige un tipo de servicio y recibe un número de turno con prefijo del servicio, secuencial por día (por ejemplo T-012). La fila se actualiza con fetch cada 2 segundos. Un turno solo se puede cancelar mientras está en espera. Usa como base docs/modelo-de-datos.md y database/schema.sql (estados: esperando, en_atencion, atendido, no_asistio, cancelado). Incluye historias de usuario, criterios de aceptación y casos límite."

## User Scenarios & Testing

### User Story 1 - Tomar un turno para un servicio (Priority: P1)

Como cliente sin cuenta, quiero elegir un tipo de servicio y tomar un turno para obtener un lugar en la fila sin entregar datos personales.

**Why this priority**: Tomar turno es el flujo principal que permite al cliente solicitar atención.

**Independent Test**: Se puede probar seleccionando un servicio activo y verificando que se entrega un número visible, único para el día y asociado a una fila en espera.

**Acceptance Scenarios**:

1. **Given** que existe al menos un tipo de servicio activo, **When** el cliente selecciona el servicio y solicita un turno, **Then** el sistema crea un turno en estado `esperando` y muestra el número con el prefijo del servicio y el consecutivo del día, por ejemplo `T-012`.
2. **Given** que ya existen turnos numerados para el servicio o para otros servicios durante el día, **When** el cliente solicita un nuevo turno, **Then** recibe el siguiente número consecutivo diario sin duplicar ningún número.
3. **Given** que el cliente solicita un turno, **When** la solicitud termina correctamente, **Then** el sistema no solicita ni almacena nombre, teléfono, correo ni una cuenta del cliente.
4. **Given** que no se puede crear el turno, **When** el cliente intenta solicitarlo, **Then** el sistema informa que no fue posible tomar el turno y no muestra un número que no haya sido creado.
5. **Given** que la hora actual está fuera del horario de atención, **When** el cliente abre la pantalla o intenta tomar un turno, **Then** el sistema informa que la atención está cerrada, muestra el horario y no crea ningún turno.
6. **Given** que el cliente tomó un turno, **When** recarga la página o vuelve a abrirla en el mismo navegador el mismo día, **Then** ve su turno activo y no se le ofrece tomar otro por accidente.

---

### User Story 2 - Consultar el estado de la fila (Priority: P2)

Como cliente con un número de turno, quiero consultar la fila y su estado actual para saber cómo avanza la atención.

**Why this priority**: La visibilidad de la fila permite al cliente decidir si debe permanecer cerca y reduce la incertidumbre durante la espera.

**Independent Test**: Se puede probar con turnos en distintos estados y observar que la vista refleja los datos actuales de la fila sin requerir una cuenta.

**Acceptance Scenarios**:

1. **Given** que existen turnos en espera, **When** el cliente consulta la fila, **Then** observa los turnos que están esperando en el orden en que serán llamados (primero los `preferencial`, luego por orden de llegada) y cuántos turnos hay delante del suyo.
2. **Given** que cambia el estado de uno o más turnos, **When** transcurren como máximo 2 segundos desde la última actualización correcta, **Then** la vista intenta obtener nuevamente el estado de la fila y refleja los cambios disponibles.
3. **Given** que el turno del cliente está en `esperando`, `en_atencion`, `atendido`, `no_asistio` o `cancelado`, **When** el cliente consulta su estado, **Then** el sistema muestra el estado correspondiente y no lo presenta como esperando si ya cambió.
4. **Given** que una actualización de la fila no está disponible temporalmente, **When** vence el intervalo de actualización, **Then** el sistema conserva la última información válida y comunica que los datos podrían estar desactualizados.
5. **Given** que el turno del cliente pasó a `en_atencion`, **When** la vista se actualiza, **Then** el cliente ve un aviso destacado con el mostrador al que debe presentarse, por ejemplo "Pase al Mostrador 1".
6. **Given** que no hay turnos esperando, **When** el cliente consulta la fila, **Then** ve un mensaje claro de que no hay turnos en espera.
7. **Given** que el cliente consulta la fila, **When** se muestran los turnos de otras personas, **Then** solo aparecen números de turno, servicio y estado, sin datos personales.

---

### User Story 3 - Cancelar un turno en espera (Priority: P3)

Como cliente, quiero cancelar mi turno mientras todavía está esperando para liberar mi lugar y evitar que sea llamado.

**Why this priority**: La cancelación mantiene la fila confiable, aunque depende de que el cliente ya haya tomado un turno.

**Independent Test**: Se puede probar con un turno en estado `esperando` y confirmar que cambia a `cancelado` y deja de formar parte de la fila.

**Acceptance Scenarios**:

1. **Given** que el turno del cliente está en `esperando`, **When** el cliente confirma la cancelación, **Then** el sistema cambia el estado a `cancelado`, actualiza la fila y deja de contarlo como turno pendiente.
2. **Given** que el turno del cliente está en `en_atencion`, `atendido`, `no_asistio` o `cancelado`, **When** el cliente intenta cancelarlo, **Then** el sistema rechaza la operación, conserva el estado actual y explica que solo se pueden cancelar turnos en espera.
3. **Given** que dos acciones intentan cancelar o avanzar el mismo turno al mismo tiempo, **When** se procesa la primera transición válida, **Then** la segunda no revierte ni sobrescribe el estado final del turno.
4. **Given** que el cliente presiona "Cancelar turno", **When** se muestra la confirmación, **Then** puede confirmar o volver atrás, y el turno no se cancela hasta que confirme.
5. **Given** que el cliente conoce el número de un turno que no es suyo, **When** intenta cancelarlo, **Then** el sistema lo rechaza: solo puede cancelar el turno que tomó desde su propio navegador.
6. **Given** que el cliente canceló su turno, **When** termina la cancelación, **Then** puede tomar un turno nuevo.

### Edge Cases

- Si no existen tipos de servicio activos, el sistema informa que no hay servicios disponibles y no permite crear un turno.
- Si el servicio seleccionado deja de estar activo antes de confirmar la solicitud, el sistema rechaza la creación y solicita seleccionar otro servicio.
- Si se generan solicitudes simultáneas para tomar turno, cada turno recibe un número diferente y consecutivo, sin duplicados.
- Si el cliente presiona varias veces seguidas "Tomar turno", se crea un solo turno.
- Al cambiar la fecha local del sistema, la numeración comienza nuevamente en 1 para el nuevo día y no reutiliza números del día anterior.
- Si el navegador guardó un turno de un día anterior, no se muestra como activo y el cliente puede tomar un turno nuevo.
- Si se pierde la conexión durante la creación, el cliente no debe recibir una confirmación ambigua; puede consultar la fila para verificar si el turno fue creado antes de reintentar.
- Si la conexión falla durante una cancelación, el cliente debe poder consultar el estado real antes de repetir la acción.
- Un turno cancelado no vuelve a `esperando`, no aparece en la fila pendiente y nunca es elegido al llamar al siguiente turno.
- La fila general lista solo los turnos `esperando` y los que están `en_atencion`. Los estados finales (`atendido`, `no_asistio`, `cancelado`) se muestran únicamente en el turno del propio cliente.
- La actualización periódica no debe crear turnos, cancelar turnos ni modificar estados por sí sola.

## Requirements

### Functional Requirements

- **FR-001**: El sistema MUST permitir que un cliente seleccione un tipo de servicio activo y solicite un turno sin crear una cuenta.
- **FR-002**: El sistema MUST crear el turno inicialmente en estado `esperando`.
- **FR-003**: El sistema MUST asignar a cada turno un número entero secuencial por día, sin repetir la combinación de fecha y número.
- **FR-004**: El sistema MUST mostrar el número del turno combinando el prefijo del servicio y su consecutivo con un formato legible, como `T-012`.
- **FR-005**: El sistema MUST impedir que la toma de turno almacene nombre, teléfono, correo electrónico u otros datos personales del cliente.
- **FR-006**: El sistema MUST permitir consultar la fila y el estado del turno sin una cuenta del cliente, mostrando únicamente números de turno, servicio y estado, sin datos personales.
- **FR-007**: El sistema MUST intentar actualizar la información visible de la fila cada 2 segundos mientras la consulta esté activa.
- **FR-008**: El sistema MUST mostrar en la fila los turnos en `esperando`, en el orden en que serán llamados (primero `preferencial`, luego por número), y los turnos en `en_atencion` con su mostrador. Además MUST mostrar al cliente el estado actual de su propio turno, sea cual sea (`esperando`, `en_atencion`, `atendido`, `no_asistio` o `cancelado`).
- **FR-009**: El sistema MUST reflejar los cambios de la fila después de una actualización correcta y no debe tratar los datos de una actualización fallida como datos actuales.
- **FR-010**: El sistema MUST permitir cancelar un turno únicamente cuando su estado sea `esperando`.
- **FR-011**: Al cancelar un turno válido, el sistema MUST cambiarlo a `cancelado` y excluirlo de la fila de turnos pendientes.
- **FR-012**: El sistema MUST rechazar una cancelación cuando el turno no esté en `esperando`, conservar su estado y comunicar el motivo.
- **FR-013**: El sistema MUST manejar las solicitudes concurrentes de toma y cancelación sin duplicar números ni permitir transiciones de estado inválidas.
- **FR-014**: El sistema MUST informar errores de creación, consulta o cancelación de forma comprensible y sin presentar una operación fallida como exitosa.
- **FR-015**: El sistema MUST impedir la toma de turnos para tipos de servicio inactivos o inexistentes.
- **FR-016**: El sistema MUST permitir que el cliente cancele únicamente el turno que tomó desde su propio navegador, y rechazar la cancelación de turnos ajenos.
- **FR-017**: El sistema MUST impedir la toma de turnos fuera del horario de atención configurado, e informar al cliente el horario.
- **FR-018**: El sistema MUST evitar que varias solicitudes repetidas de un mismo clic o doble clic generen más de un turno.

### Key Entities

- **Tipo de servicio**: Servicio que el cliente puede seleccionar; tiene nombre, prefijo y disponibilidad.
- **Turno**: Solicitud de atención identificada por fecha, número, tipo de servicio, prioridad, estado y momento de registro; no contiene datos personales del cliente.
- **Fila**: Conjunto de turnos del día en estado `esperando`, ordenados con los `preferencial` primero y luego por número de llegada, junto con los turnos `en_atencion` y el mostrador que los atiende.
- **Mostrador**: Punto de atención al que se dirige el cliente cuando su turno es llamado.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Al menos el 95% de las solicitudes válidas de toma de turno muestran un número confirmado al cliente en un máximo de 2 segundos, con hasta 100 clientes simultáneos.
- **SC-002**: En pruebas con solicitudes simultáneas, el 100% de los turnos creados conserva un número único y secuencial dentro de su día.
- **SC-003**: En condiciones normales de conexión, al menos el 95% de los cambios de fila visibles para el cliente se reflejan en un máximo de 2 segundos.
- **SC-004**: El 100% de los intentos de cancelar turnos que ya no están en espera son rechazados sin cambiar el estado del turno.
- **SC-005**: El 100% de los registros de turnos creados por este flujo carece de nombre, teléfono y correo electrónico del cliente.
- **SC-006**: Al menos el 90% de los clientes de prueba puede tomar un turno, consultar su estado y cancelar un turno en espera sin asistencia.
- **SC-007**: Un cliente que usa el sistema por primera vez completa la toma de turno en menos de 30 segundos.

## Assumptions

- El sistema tiene tipos de servicio configurados con un nombre, un prefijo único y un indicador de disponibilidad.
- La fecha usada para la numeración corresponde a la fecha local de atención.
- El horario de atención está configurado en el sistema (`horarios_atencion`) y fuera de él no se toman turnos.
- La prioridad predeterminada de los turnos tomados por el cliente es `normal`; quién marca un turno como `preferencial` se define en otros flujos y no cambia este flujo.
- Como el cliente no tiene cuenta, el navegador recuerda el turno que tomó ese día; con eso lo muestra como turno propio y permite cancelarlo.
- La consulta de fila muestra los turnos de todos los servicios, indicando claramente el turno del cliente.
- La actualización cada 2 segundos es un intervalo de consulta mientras la vista esté activa; no implica tiempo real garantizado ni modifica datos.
- La autenticación, operación de mostradores y transición de `esperando` a `en_atencion` pertenecen a otros flujos y son dependencias de esta funcionalidad.
- La espera estimada (RF-10) queda fuera de esta especificación y se define en su propio issue.
- La letra grande, el alto contraste, el diseño responsive y la compatibilidad con Chrome, Firefox y Edge (NFR-01, NFR-03, NFR-07) se especifican en sus propios issues; esta versión no define una aplicación nativa.