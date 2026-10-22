# Propuesta de constitución del proyecto

**Proyecto:** Sistema de Gestión de Turnos para Atención al Cliente  
**Estado:** Propuesta pendiente de aprobación del equipo  
**Fecha:** 2026-10-22  
**Referencia:** GES-44 – Especificaciones SDD por requerimiento

## Principios fundamentales

### I. Arquitectura sencilla y organizada

El sistema seguirá una arquitectura web cliente-servidor en capas, utilizando HTML, CSS y JavaScript para las pantallas, Node.js con Express para la API y SQLite para almacenar la información.

Se mantendrá la estructura existente del repositorio, evitando agregar tecnologías o componentes innecesarios.

### II. Seguridad y privacidad

El sistema no solicitará datos personales a los clientes para obtener un turno.

Las operaciones administrativas y de recepción deberán contar con controles de autorización. Las contraseñas y los tokens privados deberán almacenarse de forma segura.

Las validaciones importantes se realizarán en el servidor.

### III. Integridad y confiabilidad de los datos

Las operaciones que modifican turnos deberán utilizar transacciones cuando sea necesario para evitar registros duplicados o cambios incompletos.

El sistema deberá respetar las transiciones válidas de los estados de los turnos y conservar la información almacenada ante reinicios.

### IV. Calidad y pruebas

Cada requisito deberá contar con una especificación clara y criterios de aceptación verificables.

Las funciones deberán revisarse mediante pruebas apropiadas antes de considerarse validadas. No se afirmará que una funcionalidad está implementada o probada sin evidencia.

### V. Usabilidad y accesibilidad

La interfaz utilizará mensajes claros en español y un diseño adaptable a diferentes dispositivos.

Se respetarán los criterios de accesibilidad documentados en `docs/UX.md`, incluyendo contraste, legibilidad, navegación por teclado y retroalimentación al usuario.

## Restricciones técnicas

- **Frontend:** HTML, CSS y JavaScript.
- **Backend:** Node.js y Express.
- **Base de datos:** SQLite mediante `better-sqlite3`.
- **Comunicación:** API REST con JSON.
- **Actualización de la fila:** consultas periódicas cada 2 segundos.
- **Alcance:** un establecimiento, con una meta de hasta 100 clientes simultáneos, pendiente de validación mediante pruebas de carga.

## Flujo de desarrollo

1. Revisar los requisitos y la documentación existente.
2. Redactar especificaciones con reglas y criterios de aceptación.
3. Elaborar planes técnicos consistentes con la arquitectura.
4. Organizar las tareas de implementación y validación.
5. Revisar el código y ejecutar las pruebas correspondientes.
6. Solicitar revisión antes de aprobar cambios compartidos.

## Gobernanza

Esta propuesta deberá ser revisada por el equipo antes de adoptarse como constitución oficial.

Cualquier modificación de los principios acordados deberá documentarse y comunicarse al equipo.

Las especificaciones, los planes y las tareas deberán mantenerse consistentes con la versión aprobada.

**Versión propuesta:** 0.1.0  
**Ratificación:** Pendiente  
**Última modificación:** 2026-10-22

## Observaciones pendientes

- Confirmar la definición oficial de NFR-06.
- Confirmar las decisiones pendientes de RF-09.
- Verificar el estado actual de la autenticación del personal.
- Validar la meta de 100 clientes simultáneos mediante pruebas de carga.