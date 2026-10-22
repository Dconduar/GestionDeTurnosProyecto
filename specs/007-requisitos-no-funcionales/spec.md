# Feature Specification: Requisitos no funcionales

**Feature:** Requisitos no funcionales (NFR) – Sistema de Gestión de Turnos  
**Created:** 2026-10-22  
**Status:** Draft (pendiente de revisión)  
**Input:** Especificación basada en `docs/arquitectura.md` y `docs/UX.md`.

## User Scenarios & Testing

### User Story 1 - Tomar un turno de forma rápida y sencilla (Priority: P1)

Como cliente, quiero solicitar un turno mediante una interfaz sencilla para completar el proceso rápidamente y sin ayuda.

**Acceptance Scenarios:**

1. **Given** que el cliente abre la pantalla y hay atención disponible, **When** selecciona un servicio y solicita su turno, **Then** puede completar el proceso en menos de 30 segundos y sin ayuda (NFR-01).
2. **Given** que el cliente utiliza la pantalla, **When** necesita realizar una acción, **Then** encuentra instrucciones claras y mensajes en español sencillo.
3. **Given** que ocurre un error, **When** el sistema muestra el aviso, **Then** explica qué ocurrió y cómo continuar.

### User Story 2 - Consultar información actualizada (Priority: P1)

Como cliente o recepcionista, quiero consultar una fila que se actualice automáticamente para conocer el estado de los turnos.

**Acceptance Scenarios:**

1. **Given** que la pantalla de la fila está abierta, **When** transcurren 2 segundos, **Then** se realiza una nueva consulta de actualización (NFR-02).
2. **Given** que se pierde la conexión, **When** falla una actualización, **Then** la interfaz informa que los datos pueden estar desactualizados.
3. **Given** que la conexión vuelve a estar disponible, **When** se realiza una nueva consulta exitosa, **Then** se muestra la información actualizada.

### User Story 3 - Utilizar el sistema desde diferentes dispositivos (Priority: P2)

Como usuario, quiero acceder al sistema desde un celular, tablet o computadora para utilizarlo sin instalar una aplicación.

**Acceptance Scenarios:**

1. **Given** que un usuario abre la aplicación desde un celular, **When** consulta la interfaz, **Then** los elementos se adaptan al tamaño de pantalla (NFR-03).
2. **Given** que un usuario utiliza Chrome, Firefox o Edge, **When** abre la aplicación, **Then** puede utilizar las funciones correspondientes (NFR-07).
3. **Given** que un usuario interactúa con los controles, **When** utiliza el teclado, **Then** puede identificar y activar los elementos interactivos.

### User Story 4 - Proteger la información (Priority: P1)

Como usuario, quiero que el sistema proteja la información para evitar accesos indebidos y exposición de datos personales.

**Acceptance Scenarios:**

1. **Given** que un cliente solicita un turno, **When** completa el proceso, **Then** no necesita proporcionar nombre, teléfono ni correo (NFR-04).
2. **Given** que se registra una contraseña del personal, **When** se almacena, **Then** se conserva mediante un hash y no en texto plano.
3. **Given** que un usuario intenta acceder a una función administrativa protegida, **When** no tiene los permisos correspondientes, **Then** el servidor rechaza la operación.
4. **Given** que un cliente recibe un token de cancelación, **When** se almacena su referencia, **Then** se guarda el hash del token y no el token original.

### User Story 5 - Conservar la información ante errores (Priority: P1)

Como usuario, quiero que los turnos permanezcan registrados cuando ocurra un error o se reinicie el servidor.

**Acceptance Scenarios:**

1. **Given** que existen turnos almacenados, **When** se reinicia el servidor, **Then** los registros persisten en SQLite (NFR-05).
2. **Given** que ocurre un error durante una operación, **When** falla la transacción, **Then** no quedan cambios parciales.
3. **Given** que ocurre un error interno, **When** el servidor responde, **Then** devuelve un mensaje controlado sin exponer información técnica sensible.

### User Story 6 - Utilizar parámetros configurables (Priority: P2)

Como administrador, quiero que los parámetros operativos se almacenen en la configuración para evitar depender de valores fijos en el código.

**Acceptance Scenarios:**

1. **Given** que existe un parámetro configurable, **When** el sistema lo necesita, **Then** utiliza el valor correspondiente de la tabla `configuracion` (NFR-08).
2. **Given** que se presenta una espera estimada, **When** el cliente consulta su turno, **Then** el sistema la identifica como aproximada y no como un tiempo garantizado.
3. **Given** que se utilizan reglas como el máximo de llamados, **When** se aplica la operación, **Then** se considera el parámetro configurado.

## Requirements

### Non-Functional Requirements

- **NFR-01 – Usabilidad:** El cliente debe poder solicitar un turno en menos de 30 segundos y sin ayuda.
- **NFR-02 – Actualización:** Las pantallas que muestran la fila deben realizar consultas de actualización cada 2 segundos y manejar las fallas de conexión.
- **NFR-03 – Interfaz adaptable:** La aplicación debe permitir su uso desde celulares, tablets y computadoras mediante un diseño responsive.
- **NFR-04 – Seguridad y privacidad:** El sistema no debe solicitar datos personales al cliente; debe proteger credenciales, tokens y funciones restringidas.
- **NFR-05 – Persistencia y confiabilidad:** Los turnos deben persistir en SQLite y las operaciones deben conservar la consistencia de los datos ante errores.
- **NFR-06 – Pendiente:** No se encontró su definición en los documentos revisados. Requiere confirmación del equipo.
- **NFR-07 – Compatibilidad y accesibilidad:** La aplicación debe ser compatible con Chrome, Firefox y Edge y seguir los criterios de accesibilidad documentados en `docs/UX.md`.
- **NFR-08 – Configuración:** Los parámetros operativos deben almacenarse en la tabla `configuracion`. Las estimaciones deben presentarse como aproximadas.

## Accessibility Criteria

Según `docs/UX.md`, se establecen los siguientes criterios para la interfaz:

- Contraste mínimo de 4.5:1 para texto.
- Tamaño base de letra de al menos 18 px.
- Botones de al menos 44 px de alto.
- Información comprensible sin depender únicamente del color.
- Mensajes claros en español.
- Controles utilizables mediante teclado.
- Etiquetas y avisos adecuados para lectores de pantalla.
- Diseño adaptable a pantallas pequeñas sin desplazamiento horizontal.

## Performance and Capacity

La arquitectura contempla una meta de **hasta 100 clientes simultáneos**.

El documento estima aproximadamente 50 peticiones por segundo cuando 100 pantallas consultan cada 2 segundos.

Esta capacidad es una **estimación de diseño**, no un resultado comprobado. Debe validarse mediante pruebas de carga.

## Edge Cases

- El usuario pierde la conexión mientras consulta la fila.
- La base de datos no está disponible.
- Se reinicia el servidor durante la operación.
- Un usuario intenta acceder a una función sin autorización.
- El usuario utiliza una pantalla pequeña.
- El usuario navega únicamente mediante teclado.
- Un parámetro configurable no está disponible.
- Una operación de escritura falla antes de completarse.

## Success Criteria

- **SC-001:** En una prueba de usabilidad con tres personas que no conocen el sistema, se comprueba si pueden solicitar un turno en menos de 30 segundos y sin ayuda.
- **SC-002:** Se verifica mediante pruebas que las consultas de actualización se realizan cada 2 segundos.
- **SC-003:** Se comprueba que los turnos permanecen almacenados después de reiniciar el servidor.
- **SC-004:** Se comprueba que los usuarios sin autorización no pueden ejecutar funciones protegidas.
- **SC-005:** Se realizan pruebas de compatibilidad en Chrome, Firefox y Edge.
- **SC-006:** Se verifican los criterios de accesibilidad definidos en `docs/UX.md`.
- **SC-007:** Se realizan pruebas de carga para evaluar la meta de 100 clientes simultáneos.

## Assumptions

- El sistema funciona para un solo establecimiento.
- La arquitectura utiliza HTML, CSS y JavaScript en el navegador, Node.js con Express en el servidor y SQLite como base de datos.
- Las consultas periódicas se utilizan para actualizar la fila.
- Los parámetros operativos se almacenan en la tabla `configuracion`.
- Los requisitos de autenticación y autorización deben validarse contra su implementación real.
- Esta especificación no demuestra que todos los requisitos estén implementados o probados.

## Open Questions

1. ¿Cuál es la definición oficial de NFR-06?
2. ¿Se ha validado la meta de 100 clientes simultáneos mediante pruebas de carga?
3. ¿Ya se realizaron las pruebas de compatibilidad en Firefox y Edge?
4. ¿Cuál es el estado actual de la autenticación y autorización del personal?

## Validation Notes

Antes de aprobar esta especificación, se debe revisar su correspondencia con:

- `docs/arquitectura.md`
- `docs/UX.md`
- `specs/001-client-queue-flow/spec.md`
- `database/schema.sql`
- Las pruebas automatizadas y de carga disponibles

Los requisitos pendientes deberán confirmarse con el equipo antes de marcar la especificación como aprobada.