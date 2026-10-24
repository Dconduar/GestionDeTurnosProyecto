# Constitución de Gestión de Turnos

## Principios fundamentales

### I. Arquitectura sencilla y organizada

El sistema es una aplicación web cliente-servidor en capas: pantallas en HTML, CSS y JavaScript, API con Node.js y Express, y SQLite para guardar la información. Se mantiene la estructura existente del repositorio y no se agregan tecnologías ni componentes que no hagan falta.

### II. Seguridad y privacidad

El sistema no pide datos personales al cliente para darle un turno. Las operaciones del personal (recepción y administración) deben protegerse con inicio de sesión y roles. Las contraseñas y los tokens privados se guardan de forma segura, con hash, y las validaciones importantes se hacen en el servidor.

### III. Integridad y confiabilidad de los datos

Las operaciones que modifican turnos usan transacciones cuando es necesario, para evitar registros duplicados o cambios incompletos. Se respetan las transiciones válidas de estado de los turnos y la información se conserva al reiniciar el servidor.

### IV. Calidad, pruebas y trazabilidad

Cada requisito tiene una especificación clara con criterios de aceptación verificables. El código está documentado y se valida con pruebas unitarias y de integración, y cada requisito debe poder relacionarse con al menos una prueba. No se afirma que una funcionalidad está implementada o probada sin evidencia.

### V. Usabilidad y accesibilidad

La interfaz usa mensajes claros en español y un diseño adaptable a distintos dispositivos. Se respetan los criterios de accesibilidad documentados en `docs/Ux.md`: contraste, legibilidad, navegación por teclado y retroalimentación al usuario.

## Restricciones técnicas

- **Frontend:** HTML, CSS y JavaScript.
- **Backend:** Node.js y Express.
- **Base de datos:** SQLite mediante `better-sqlite3`.
- **Comunicación:** API REST con JSON.
- **Actualización de la fila:** consultas periódicas cada 2 segundos.
- **Acceso del cliente:** sin cuenta, desde el navegador del celular, también mediante un código QR.
- **Alcance:** un establecimiento, con una meta de hasta 100 clientes simultáneos, pendiente de validación con pruebas de carga.

## Flujo de desarrollo

1. Revisar los requisitos y la documentación existente.
2. Redactar la especificación con reglas y criterios de aceptación.
3. Elaborar el plan técnico acorde con la arquitectura.
4. Registrar cada tarea como issue en Linear.
5. Implementar y ejecutar las pruebas correspondientes.
6. Abrir un Pull Request con el ID del issue en el título y pedir revisión antes de integrar.
