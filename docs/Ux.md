# Propuesta de experiencia de usuario (UX)

Issue: GES-42 · Responsable: Daniel Ortiz · Última actualización: 2026-10-20

Este documento propone cómo debe sentirse y comportarse el sistema para quienes lo usan: el cliente que toma turno y el recepcionista que lo atiende. Cubre los cinco aspectos que pide el curso: **claridad del flujo, facilidad de uso, consistencia, accesibilidad y retroalimentación al usuario**.

Documentos relacionados: [historias de usuario y criterios de aceptación](../specs/001-client-queue-flow/spec.md) · [guía de estilo](guia-de-estilo.md) · [modelo de datos](modelo-de-datos.md).

## 1. Usuarios y qué necesitan

| Usuario | Contexto de uso | Qué necesita | Principio de diseño |
|---|---|---|---|
| **Cliente** | Llega sin cuenta, normalmente desde su celular o una pantalla del local. Puede tener poca experiencia con tecnología. | Tomar turno rápido (menos de 30 s, NFR-01), saber cuándo le toca y poder cancelar. | Pocas decisiones, textos claros, nada que aprender. |
| **Recepcionista** | Computadora en su mostrador, uso continuo durante horas. | Llamar al siguiente, ver la fila y cerrar cada atención sin errores. | Una acción principal visible, información de la fila siempre a la vista. |
| **Administrador** | Computadora, uso ocasional. | Configurar servicios, mostradores y horarios, y ver reportes. | Formularios simples y tablas legibles (ver [guía de estilo](guia-de-estilo.md)). |

Este documento detalla al cliente y al recepcionista, que son los flujos principales. La pantalla del administrador (GES-7) usa los mismos componentes.

## 2. Principios

1. **Una cosa a la vez.** Cada pantalla tiene una sola acción principal (el único botón morado).
2. **El sistema siempre responde.** Toda acción termina en un mensaje que dice qué pasó y qué hacer después.
3. **Sin sorpresas.** Las acciones que no se pueden deshacer (cancelar un turno) piden confirmación.
4. **Sin datos personales.** El cliente nunca escribe su nombre, teléfono ni correo (NFR-04), y la pantalla lo dice.
5. **Que funcione para todos.** Letra grande, alto contraste, botones grandes y mensajes en español sencillo (NFR-01, NFR-03, NFR-07).

## 3. Flujo del cliente

Del momento en que abre la pantalla hasta que ve su turno y es atendido:

```mermaid
flowchart TD
    A([Abre la pantalla del cliente]) --> B{¿Tiene un turno de hoy guardado?}
    B -- Sí --> G[Ve su turno y su estado]
    B -- No --> C{¿Hay atención ahora?}
    C -- No --> C1[/Aviso: atención cerrada y horario/]
    C -- Sí --> D[Elige un servicio]
    D --> E[Presiona Tomar turno]
    E --> F{¿Se creó el turno?}
    F -- No --> F1[/Aviso de error/] --> D
    F -- Sí --> G
    G --> H{Estado del turno}
    H -- esperando --> I[Espera y ve cómo avanza la fila]
    I --> J{¿Quiere cancelar?}
    J -- Sí --> K[Confirma la cancelación] --> L[Turno cancelado]
    J -- No --> H
    H -- en_atencion --> N[/Pase al Mostrador indicado/]
    N --> O[Es atendido]
    H -- atendido o no_asistio --> M[Puede tomar otro turno]
    L --> M
    O --> M
```

**Decisiones de diseño del flujo**

- **Dos acciones para tomar turno:** elegir el servicio y presionar "Tomar turno". No hay registro, ni formularios, ni más pantallas.
- **El turno se recuerda.** El navegador guarda el turno del día, así que si el cliente recarga o cierra la pestaña lo vuelve a ver. Al día siguiente empieza limpio.
- **El estado se entiende de un vistazo.** Cada estado del turno tiene un texto propio y un mismo lugar en la pantalla: "Esperando tu turno", "Pase al Mostrador 1", "Tu turno fue cancelado".
- **Siempre hay salida.** Cuando el turno termina (atendido, cancelado o no asistió) aparece "Tomar otro turno".

## 4. Flujo del recepcionista

```mermaid
flowchart TD
    A([Abre el panel del recepcionista]) --> B{¿Tiene sesión iniciada?}
    B -- No --> C[Inicia sesión]
    C --> D{¿Datos correctos?}
    D -- No --> D1[/Usuario o contraseña incorrectos/] --> C
    D -- Sí --> E[Ve su mostrador y la fila de espera]
    B -- Sí --> E
    E --> F[Presiona Llamar siguiente]
    F --> G{¿Hay turnos en espera para su mostrador?}
    G -- No --> G1[/No hay turnos en espera/] --> E
    G -- Sí --> H[El turno pasa a en_atencion con su mostrador]
    H --> I{¿El cliente se presenta?}
    I -- Sí --> J[Marca atendido y se guarda la duración] --> E
    I -- No --> L[Llama de nuevo]
    L --> M{¿Llegó a 3 llamados?}
    M -- No --> I
    M -- Sí --> N[El turno pasa a no_asistio] --> E
```

**Decisiones de diseño del flujo**

- **El panel tiene dos zonas fijas:** a la izquierda "Atendiendo ahora" (lo que está haciendo) y a la derecha "Fila de espera" (lo que viene). No cambian de lugar.
- **Un solo botón principal a la vez.** Sin turno en atención, el botón es "Llamar siguiente". Con turno en atención, pasa a ser "Marcar atendido" y "Llamar siguiente" queda desactivado con una explicación, para evitar llamar a otro sin cerrar el actual.
- **El orden de la fila lo decide el sistema**, no la persona: primero los turnos preferenciales, luego por orden de llegada, y solo los servicios que atiende ese mostrador (ver [modelo de datos](modelo-de-datos.md)).
- **La fila se actualiza sola** cada 2 segundos y lo dice en pantalla ("Se actualiza cada 2 s").
- **El contador de llamados es visible** ("Llamado 1 de 3") junto con la regla de qué pasa al llegar al máximo.

## 5. Wireframes

Los wireframes están en baja fidelidad (estructura y mensajes, no color final). El archivo editable con todas las pantallas está en [`ux-wireframes.drawio`](ux-wireframes.drawio) y se abre en [draw.io](https://app.diagrams.net) (una página por pantalla). El número morado de cada imagen se explica en las leyendas de abajo.

### 5.1 Cliente (celular)

<p>
<img src="ux-cliente-1-servicios.png" alt="Cliente: elegir servicio" width="230">
<img src="ux-cliente-2-turno.png" alt="Cliente: turno creado" width="230">
<img src="ux-cliente-3-llamado.png" alt="Cliente: te están llamando" width="230">
</p>

**C1 · Elegir servicio** (implementado)
1. Título y subtítulo que explican la pantalla: "Toma tu turno. Sin cuenta y sin dar tus datos."
2. Servicios como tarjetas grandes. El elegido se marca con color, borde y ✓ (no solo con color).
3. Único botón principal. Está desactivado hasta que se elige un servicio.
4. Recordatorio de privacidad: "Tu turno no guarda nombre, teléfono ni correo."

**C2 · Turno creado** (número y estado implementados; fila y cancelar en GES-16, GES-27 y GES-28)
1. Número de turno en grande, con el prefijo del servicio (T-012).
2. Estado en texto: "Esperando tu turno".
3. Posición y espera aproximada, con la aclaración "es una referencia, puede variar" (NFR-08).
4. "Cancelar turno" como botón secundario, para que no compita con la acción principal.

**C3 · Te están llamando** (implementado)
1. El estado cambia a "Pase al Mostrador 1", resaltado con el color de acento y en letra más grande. Desaparece el botón de cancelar.

<p>
<img src="ux-cliente-4-cancelar.png" alt="Cliente: confirmar cancelación" width="230">
<img src="ux-cliente-5-cancelado.png" alt="Cliente: turno cancelado" width="230">
<img src="ux-cliente-6-avisos.png" alt="Cliente: avisos y errores" width="230">
</p>

**C4 · Confirmar cancelación** (propuesto, GES-27)
1. Pregunta con el número del turno: "¿Cancelar tu turno T-012?", y qué pasa si confirma.
2. "No, volver" (secundario): es la opción más segura.
3. "Sí, cancelar" (oscuro): la acción destructiva se distingue, pero no usa un color nuevo.

**C5 · Turno cancelado** (propuesto, GES-27)
1. El número pierde el color de acento (gris) para que se note que ya no está activo.
2. Estado en texto: "Tu turno fue cancelado".
3. Salida clara: "Tomar otro turno".

**C6 · Avisos y errores** (A y B implementados, C propuesto en GES-16)
1. **A, informativo:** atención cerrada, con el horario.
2. **B, error:** no se pudo tomar el turno, con qué hacer ("Intenta de nuevo") y el botón a la vista para reintentar.
3. **C, informativo:** se perdió la conexión con la fila; se conservan los últimos datos y se avisa que pueden estar desactualizados.

### 5.2 Recepcionista (computadora)

<p>
<img src="ux-recepcion-1-login.png" alt="Recepcionista: inicio de sesión" width="440">
<img src="ux-recepcion-2-panel.png" alt="Recepcionista: panel sin turno en atención" width="440">
</p>
<p>
<img src="ux-recepcion-3-atendiendo.png" alt="Recepcionista: panel con turno en atención" width="440">
</p>

**R1 · Inicio de sesión** (propuesto, GES-8)
1. Tarjeta centrada con un solo propósito.
2. Campos con etiqueta visible (no solo texto de ejemplo).
3. Error en un aviso, sin decir cuál de los dos datos falló: "Usuario o contraseña incorrectos."
4. Botón principal "Entrar".

**R2 · Panel sin turno en atención** (propuesto, GES-19)
1. Zona "Atendiendo ahora".
2. Estado vacío explícito: "Ningún turno en atención".
3. Único botón principal: "Llamar siguiente".
4. Fila de espera con cuántos turnos hay, la espera de cada uno y una etiqueta de "Preferencial". Se actualiza cada 2 s (GES-21).

**R3 · Panel con turno en atención** (propuesto, GES-19, GES-20 y GES-24)
1. El turno actual con su número en grande.
2. Servicio del turno.
3. Contador "Llamado 1 de 3" y la regla del "No asistió" en una línea.
4. "Marcar atendido" (principal): cierra la atención y guarda la duración.
5. "Llamar de nuevo" (secundario): registra otro llamado.

## 6. Facilidad de uso y consistencia

**Facilidad de uso**

| Qué | Cómo se cuida |
|---|---|
| Rapidez | El cliente toma turno en 2 acciones. Meta medible: menos de 30 s (NFR-01). |
| Errores evitables | El botón "Tomar turno" está desactivado hasta elegir servicio; el doble clic crea un solo turno; cancelar pide confirmación. |
| Recuperación | Cada error dice qué hacer y deja el botón a la vista para reintentar. |
| Memoria | Nada que recordar: el turno se guarda en el navegador y la pantalla explica "Guarda este número". |
| Pantalla vacía | Los estados vacíos tienen texto ("No hay turnos en espera", "Ningún turno en atención"). |

**Consistencia**

- Todas las pantallas comparten la misma estructura: barra superior con el logo, título de la pantalla, contenido y pie. Está en [`estilos.css`](../src/public/css/estilos.css) y se describe en la [guía de estilo](guia-de-estilo.md).
- Un solo color de acento (morado) con un solo significado: lo principal o lo seleccionado.
- Los mismos componentes en todas partes: botones (principal, secundario, oscuro), tarjetas, etiquetas de estado y avisos.
- Los mismos nombres de estado en toda la interfaz, tomados del modelo de datos: `esperando`, `en_atencion`, `atendido`, `no_asistio`, `cancelado`.
- Mismo tono de voz: tuteo, frases cortas y sin términos técnicos.

## 7. Accesibilidad

Se cuida lo que pide el curso (contraste, tamaño de letra y textos claros) y algunos aspectos más. La columna "Estado" indica si ya está comprobado en el código actual de la pantalla del cliente.

| Aspecto | Criterio | Cómo se cumple | Estado |
|---|---|---|---|
| **Contraste** | Mínimo 4.5:1 en texto (WCAG AA). | Texto principal sobre blanco: 17.7:1. Texto secundario: 7.0 a 7.7:1. Blanco sobre morado (botón y número de turno): 7.1:1. Morado oscuro sobre morado suave: 10.0:1. | Calculado |
| **Tamaño de letra** | Base de 18 px o más. | El texto base mide 18 px. Los títulos miden entre 32 y 60 px y el número de turno entre 56 y 96 px, según el ancho de la pantalla. | Implementado |
| **Botones** | Al menos 44 px de alto. | Botones normales de 44 px; el principal de 56 px. Las tarjetas de servicio miden al menos 80 px. | Implementado |
| **No depender del color** | La información no se transmite solo con color. | El servicio elegido lleva ✓ y borde; cada estado tiene su texto; los avisos tienen texto, no solo color. | Implementado |
| **Textos claros** | Español sencillo, sin códigos técnicos. | Frases cortas, tuteo, y qué hacer en cada error. Ver sección 8. | Implementado |
| **Teclado** | Todo se puede usar sin mouse. | Botones y tarjetas son elementos nativos, y el foco se ve con un contorno morado de 3 px. | Implementado |
| **Lectores de pantalla** | Roles y avisos correctos. | La lista de servicios es un grupo de opciones con estado (`role="radiogroup"`, `aria-checked`); los avisos usan `role="alert"`; el número de turno se anuncia al cambiar (`aria-live`). | Implementado |
| **Pantallas pequeñas** | Funciona en celular sin desplazamiento horizontal. | Diseño responsive. Se comprobó en 390 px y 1280 px, sin desplazamiento horizontal. | Comprobado en Chromium |
| **Navegadores** | Chrome, Firefox y Edge (NFR-07). | Solo HTML, CSS y JavaScript estándar. | Pendiente de probar en Firefox y Edge (GES-18) |
| **Movimiento** | Nada depende de animaciones. | La interfaz no usa animaciones necesarias para entenderla. | Implementado |

Pendiente: el texto de los botones desactivados (gris sobre gris claro, 4.4:1) queda un poco por debajo de 4.5:1. WCAG exime a los controles desactivados, pero conviene oscurecerlo al ajustar la interfaz.

## 8. Mensajes al usuario (retroalimentación)

Todo lo que el usuario hace recibe una respuesta visible. Los mensajes de la columna "Texto" son los que usa la interfaz; los marcados como *propuesto* aún no están implementados.

### Cliente

| Situación | Texto | Tipo | Estado |
|---|---|---|---|
| **Turno creado** | Número grande (por ejemplo `T-012`), "Esperando tu turno" y "Guarda este número. Si recargas la página, aquí seguirá tu turno." | Resultado en la tarjeta del turno | Implementado |
| **Te están llamando** | "Pase al Mostrador 1" (si no se sabe el mostrador: "Te están llamando") | Resaltado con el acento | Implementado |
| **Turno atendido** | "Tu turno ya fue atendido" + botón "Tomar otro turno" | Estado final | Implementado |
| **No asististe** | "Tu turno se marcó como "no asistió"" + botón "Tomar otro turno" | Estado final | Implementado |
| **Turno cancelado** | "Tu turno fue cancelado. Tu lugar en la fila quedó libre." + botón "Tomar otro turno" | Estado final | Propuesto (GES-27) |
| **Confirmar cancelación** | "¿Cancelar tu turno T-012? Perderás tu lugar en la fila. Podrás tomar un turno nuevo." | Diálogo | Propuesto (GES-27) |
| **No se puede cancelar** | "Solo se pueden cancelar turnos que están en espera." | Error | Propuesto (GES-27) |
| **Atención cerrada** | "La atención está cerrada en este momento. Horario de hoy: 08:00 a 17:00." (o "Hoy no hay atención.") | Informativo | Implementado |
| **Sin servicios** | "No hay servicios disponibles por ahora." | Informativo | Implementado |
| **Error al tomar turno** | "No fue posible tomar el turno. Intenta de nuevo." | Error | Implementado |
| **Servicio no disponible** | "Ese servicio no está disponible. Elige otro." | Error | Implementado |
| **Falla al cargar servicios** | "No pudimos cargar los servicios. Revisa tu conexión e intenta de nuevo." | Error | Implementado |
| **Falla al consultar el turno** | "No pudimos consultar tu turno. Revisa tu conexión e intenta de nuevo." | Error | Implementado |
| **Sin conexión con la fila** | "Sin conexión, reintentando… Los datos pueden estar desactualizados." | Informativo | Propuesto (GES-16) |
| **Fila vacía** | "No hay turnos en espera." | Informativo | Propuesto (GES-16) |
| **Espera estimada** | "Espera aproximada: 15 min. Es una referencia, puede variar." Si no hay datos: "Espera estimada no disponible." | Informativo | Propuesto (GES-28) |

### Recepcionista (propuestos)

| Situación | Texto | Tipo |
|---|---|---|
| Datos de acceso incorrectos | "Usuario o contraseña incorrectos." | Error |
| Sin turno en atención | "Ningún turno en atención." | Estado vacío |
| Fila vacía al llamar | "No hay turnos en espera." | Informativo |
| Turno llamado | "Llamaste al turno T-012. Llamado 1 de 3." | Confirmación |
| Turno atendido | "Turno T-012 atendido." | Confirmación |
| Tres llamados sin respuesta | "El turno T-012 se marcó como "No asistió". Puedes llamar al siguiente." | Informativo |
| Falla del servidor | "No se pudo completar la acción. Intenta de nuevo." | Error |

**Reglas de redacción**

- Decir qué pasó y qué hacer después, en una o dos frases.
- Nunca mostrar códigos, nombres de tabla ni textos técnicos del servidor.
- Un error nunca se presenta como éxito: si no se creó el turno, no se muestra ningún número.
- La estimación de espera siempre se presenta como aproximada, nunca como promesa (NFR-08).

## 9. Cómo se validará

Prueba de usabilidad rápida con 3 personas que no conozcan el sistema, usando el celular:

| Tarea | Éxito |
|---|---|
| Tomar un turno de "Trámite". | Lo logran en menos de 30 s y sin ayuda (NFR-01). |
| Recargar la página y decir cuál es su turno. | Encuentran su número sin dudar. |
| Cancelar el turno y tomar uno nuevo. | Lo logran sin ayuda y entienden el mensaje de confirmación. |

Se anota el tiempo, los errores y las frases que no entendieron, y se ajustan los textos.

## 10. Decisiones pendientes

1. **Pantalla de inicio de sesión del recepcionista (R1):** se propone que `recepcion.html` la muestre cuando no hay sesión. Falta confirmarlo con Diego (GES-8) y Derek (GES-19).
2. **"No asistió" automático o manual (R3):** se propone que al llegar a 3 llamados sin respuesta el sistema marque el turno como `no_asistio` (GES-20). Falta confirmar con Derek si es automático al tercer llamado o si el recepcionista lo confirma.
3. **Turnos preferenciales:** la fila muestra la etiqueta "Preferencial", pero falta definir quién marca un turno como preferencial.
4. **Aviso de llamada en la sala de espera:** esta propuesta cubre solo la pantalla del cliente. Una pantalla grande para la sala de espera no está en el alcance.