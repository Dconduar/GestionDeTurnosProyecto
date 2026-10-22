# Implementation Plan: Estimación del tiempo de espera

**Branch:** `celeste/analisisproyecto`  
**Date:** 2026-10-22  
**Spec:** `specs/002-estimacion-tiempo-espera/spec.md`  
**Status:** Plan documentado; pendiente de revisión del equipo

## Summary

Documentar y validar el mecanismo de estimación del tiempo de espera de los turnos, correspondiente a RF-10.

El sistema calcula una espera aproximada utilizando información de la fila, mostradores disponibles, prioridades y datos históricos o valores predeterminados cuando corresponde.

La estimación es orientativa y no garantiza un tiempo exacto de atención.

## Technical Context

- **Language/Version:** JavaScript con Node.js; versión exacta pendiente de confirmar.
- **Primary Dependencies:** Express y `better-sqlite3`.
- **Storage:** SQLite.
- **Testing:** Jest.
- **Target Platform:** Navegadores web conectados al servidor local.
- **Project Type:** Aplicación web cliente-servidor.
- **Performance Goals:** Mantener la consulta de la fila cada 2 segundos.
- **Constraints:** No solicitar datos personales ni utilizar IA generativa para calcular las estimaciones.
- **Scale/Scope:** Un establecimiento; meta de hasta 100 clientes simultáneos, pendiente de pruebas de carga.

## Constitution Check

La revisión se realiza provisionalmente contra `docs/propuesta-constitucion.md`, ya que la constitución oficial de Spec Kit todavía no está ratificada.

| Principio | Evaluación |
|---|---|
| Arquitectura sencilla | El cálculo se integra al backend existente, sin incorporar otro servicio. |
| Seguridad y privacidad | La estimación utiliza información operativa, no datos personales. |
| Integridad de datos | El cálculo debe respetar el estado y orden de los turnos. |
| Calidad y pruebas | Se ejecutaron 10 pruebas automatizadas de estimación satisfactoriamente. |
| Usabilidad | La interfaz debe indicar que la espera es aproximada. |

**Resultado:** Sin contradicciones identificadas en esta revisión documental. Pendiente de aprobación del equipo.

## Project Structure

### Documentation

```text
specs/002-estimacion-tiempo-espera/
├── spec.md
├── plan.md
├── tasks.md
└── checklists/
    └── requirements.md
```

### Source Code

```text
src/
├── public/
└── server/
    ├── estimacion.js
    ├── app.js
    └── routes/

tests/
└── estimacion.test.js

database/
└── schema.sql
```

## Implementation Approach

1. Revisar las reglas de RF-10 y las fuentes de datos disponibles.
2. Obtener la información operativa necesaria para calcular la estimación.
3. Aplicar el cálculo considerando prioridad, servicio y mostradores compatibles.
4. Utilizar datos históricos o valores de respaldo cuando corresponda.
5. Devolver una estimación aproximada o indicar que no está disponible.
6. Mostrar el resultado en la interfaz del cliente.
7. Ejecutar pruebas automatizadas y revisar los casos límite.

## Validation

Se ejecutó el siguiente comando:

`npm test -- --runInBand tests/estimacion.test.js`

**Resultado registrado:** 10 pruebas aprobadas y 0 fallidas.

Este resultado corresponde únicamente a las pruebas de estimación ejecutadas. No confirma que todos los requisitos no funcionales estén validados.

## Complexity Tracking

No se identifican excepciones que requieran agregar tecnologías o componentes ajenos a la arquitectura acordada.

## Pending Decisions

- Confirmar la aprobación de la constitución del proyecto.
- Revisar la integración con los demás módulos.
- Validar los requisitos no funcionales que todavía no cuentan con pruebas.