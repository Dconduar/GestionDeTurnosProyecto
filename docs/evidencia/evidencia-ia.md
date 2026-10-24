# Evidencia de uso de Inteligencia Artificial

**Proyecto:** Sistema de Gestión de Turnos para Atención al Cliente  
**Referencia:** GES-45 — Evidencia de uso de IA: interacciones, decisiones y modificaciones  
**Fecha:** 22 de octubre de 2026  
**Estado:** Documentación recopilada, pendiente de revisión del equipo

## 1. Introducción

Durante el desarrollo del proyecto se utilizaron herramientas de inteligencia artificial como apoyo para analizar requisitos, proponer soluciones técnicas, elaborar especificaciones y revisar implementaciones.

Las propuestas generadas por IA no se consideraron automáticamente correctas. Los integrantes del equipo revisaron las recomendaciones, realizaron modificaciones y utilizaron pruebas y documentación del proyecto para validar los resultados.

Este documento reúne las interacciones, decisiones, modificaciones y evidencias disponibles.

## 2. Registro de interacciones y decisiones

### 2.1. Daniel — GES-14: Especificación del flujo del cliente

**Herramienta:** GitHub Copilot en VS Code, utilizando Spec Kit con `/speckit.specify`.

| Aspecto | Evidencia |
|---|---|
| ¿Qué se pidió? | Especificar RF-01, RF-02 y RF-03: tomar turno sin cuenta, consultar la fila y cancelar el turno propio, utilizando el modelo de datos existente. |
| ¿Qué propuso la IA? | Una especificación con tres historias de usuario, escenarios de aceptación, requisitos funcionales, criterios de éxito y una lista de verificación. |
| ¿Qué decidió y modificó el integrante? | Daniel revisó la propuesta y realizó 15 ajustes, incluyendo horarios de atención, prevención de turnos duplicados, prioridad de atención, privacidad, cancelación segura y mensajes al cliente. |
| ¿Cómo se validó? | Comparó la especificación con el esquema de la base de datos, los requisitos del proyecto y la lista de calidad. También documentó verificaciones mediante pruebas automatizadas y en navegador. |
| Evidencia | Documento `Evidencia IA GES-14.docx`, proporcionado por Daniel, con captura de Copilot en el anexo. |

**Resultado:** La especificación revisada pasó de 13 a 19 escenarios de aceptación, de 15 a 18 requisitos funcionales y de 6 a 7 criterios de éxito.

### 2.2. Diego — GES-6: Modelo de datos

| Aspecto | Evidencia |
|---|---|
| ¿Qué se pidió? | Proponer un modelo de datos a partir de los requisitos del sistema. |
| ¿Qué propuso la IA? | Un esquema inicial de seis tablas. |
| ¿Qué decidió y modificó el integrante? | Diego decidió incorporar seis mejoras: mostrador asignado al recepcionista, tabla de configuración, tabla de llamados, prefijo por servicio, prioridad y almacenamiento de la espera estimada. También se consideró una tabla de auditoría opcional. |
| ¿Cómo se validó? | Según el registro proporcionado por Diego, se ejecutó el script en una base de datos de prueba, se agregaron turnos de ejemplo y se verificó el rechazo de estados inválidos, números duplicados y relaciones inexistentes. |
| Evidencia | Explicación escrita proporcionada por Diego. Capturas de la interacción pendientes de recopilar. |

### 2.3. Diego — GES-48: Esqueleto del proyecto

| Aspecto | Evidencia |
|---|---|
| ¿Qué se pidió? | Proponer una estructura inicial para la aplicación. |
| ¿Qué propuso la IA? | Un servidor Express con SQLite, archivos de rutas separados por módulo, pantallas base y una prueba. |
| ¿Qué decidió y modificó el integrante? | Pendiente de precisar qué partes de la propuesta fueron aceptadas o modificadas. |
| ¿Cómo se validó? | Pendiente de documentar una validación específica de GES-48. |
| Evidencia | Explicación escrita proporcionada por Diego. |

### 2.4. Diego — GES-8: Inicio de sesión

| Aspecto | Evidencia |
|---|---|
| ¿Qué se pidió? | Proponer una solución para el inicio de sesión del personal. |
| ¿Qué propuso la IA? | Manejo de sesiones, roles y contraseñas almacenadas mediante hash. |
| ¿Qué decidió y modificó el integrante? | La propuesta se contrastó con el repositorio actual antes de incorporarla. No se han detallado modificaciones específicas. |
| ¿Cómo se validó? | Diego indicó que probó la pantalla en el navegador y ejecutó las pruebas del proyecto. |
| Evidencia | Explicación escrita de Diego y resultado general de las pruebas automatizadas. |

### 2.5. GES-44: Especificaciones SDD de los requisitos restantes

**Herramienta:** ChatGPT, utilizado como apoyo para redactar y organizar documentación.

| Aspecto | Evidencia |
|---|---|
| ¿Qué se pidió? | Ayuda para documentar RF-04 a RF-10 y los requisitos no funcionales, incluyendo reglas, criterios de aceptación, planes y tareas. |
| ¿Qué propuso la IA? | Borradores de especificaciones, listas de verificación, una propuesta de constitución y documentos de planificación y tareas. |
| ¿Qué decidió y modificó la integrante? | Se decidió trabajar sobre la arquitectura existente, mantener intacta la especificación de Daniel y separar los requisitos por módulo. Se corrigió la ubicación de archivos y se documentaron los puntos que todavía necesitan aprobación. |
| ¿Cómo se validó? | Se revisó la estructura de archivos, se integraron los cambios de `main` sin conflictos y se ejecutaron las pruebas automatizadas del proyecto. |
| Evidencia | Commit `e8da1ad`, Pull Request #23 y conversaciones de apoyo con ChatGPT. |

**Aclaración:** Los documentos de GES-44 se prepararon manualmente con apoyo de ChatGPT. No se ejecutaron los comandos de generación de Spec Kit para esta parte del trabajo.

### 2.6. Diego — Uso de Claude en GES-6, GES-48, GES-43, GES-8, GES-7, GES-49 a GES-51 y revisión de integridad

**Herramienta:** Claude (claude.ai y Claude Code).

El detalle por issue, la trazabilidad con Spec Kit y el registro completo de la revisión de integridad del 24 de octubre de 2026 están en [`uso-de-claude-sdd.md`](uso-de-claude-sdd.md).

## 3. Validación general del proyecto

Después de integrar los cambios recientes de la rama `main`, se ejecutó:

`npm test -- --runInBand`

**Resultado:**

- 9 suites de pruebas aprobadas.
- 118 pruebas aprobadas.
- 0 pruebas fallidas.

Este resultado confirma el éxito de las pruebas automatizadas disponibles en ese momento, pero no demuestra por sí solo el cumplimiento de todos los requisitos ni sustituye las pruebas manuales y de carga.

## 4. Evidencias visuales

Las capturas de las interacciones con herramientas de IA se organizarán en la carpeta `docs/evidencia/`.

| Evidencia | Estado |
|---|---|
| Captura de Copilot y Spec Kit de Daniel, GES-14 | Disponible en el anexo del documento proporcionado |
| Capturas de las interacciones de Diego | Pendientes de recopilar |
| Capturas de las interacciones de ChatGPT utilizadas en GES-44 | Pendientes de seleccionar y guardar |

Las capturas deberán corresponder a conversaciones reales. No se utilizarán imágenes simuladas como evidencia.

## 5. Conclusiones

La inteligencia artificial sirvió como herramienta de apoyo para elaborar propuestas y organizar el trabajo, pero las decisiones finales correspondieron a los integrantes del equipo.

Las revisiones permitieron identificar reglas que inicialmente no estaban contempladas, adaptar las propuestas a la arquitectura existente y comprobar parte del funcionamiento mediante pruebas.

La evidencia también muestra la importancia de distinguir entre una propuesta generada por IA, una decisión humana y un resultado efectivamente validado.

### Evidencia de GES-44 — Uso de ChatGPT

![Resumen de las interacciones con ChatGPT para GES-44](evidencia/GES-44-chatgpt-resumen.png)

Esta imagen corresponde a un resumen elaborado posteriormente a partir
de las interacciones reales utilizadas durante GES-44. No representa
una captura de la conversación original.

### Evidencia de GES-14 — GitHub Copilot y Spec Kit

![Interacción de Daniel con Copilot y Spec Kit](evidencia/GES-14-copilot-speckit.png)

Captura original proporcionada por Daniel, correspondiente
al uso de GitHub Copilot con Spec Kit para elaborar la
especificación del flujo del cliente (RF-01 a RF-03).

## 6. Pendientes

- Confirmar las modificaciones y validaciones específicas de GES-48.
- Revisar el documento con el equipo antes de dar por concluida GES-45.