# NFR-08 — Uso responsable de IA y estimación del tiempo de espera

**Proyecto:** Gestión de Turnos para Atención al Cliente  
**Issue:** GES-29

## 1. Datos utilizados en la estimación

El sistema calcula el tiempo aproximado de espera utilizando información operativa de los turnos, como el tipo de servicio solicitado, la cantidad de turnos pendientes, su prioridad, los mostradores activos y los servicios que puede atender cada mostrador.

También considera la duración estimada de cada servicio y, cuando existe suficiente información histórica, el promedio de duración de las atenciones anteriores.

Para realizar este cálculo no se utilizan nombres, documentos de identificación, direcciones ni otros datos personales de los clientes.

## 2. Limitaciones de la estimación

El tiempo de espera es una aproximación y no representa una hora exacta de atención.

El resultado puede variar cuando hay pocos datos históricos, cuando una atención dura más o menos de lo habitual, cuando cambia la cantidad de mostradores disponibles o cuando ingresan turnos con prioridad.

Por estas razones, la estimación debe interpretarse como una referencia para el cliente y no como una garantía.

## 3. Supervisión humana y configuración

El equipo responsable del sistema puede revisar el comportamiento del algoritmo y modificar los parámetros de estimación almacenados en la tabla `configuracion`.

Entre estos parámetros se encuentran:

- `estimacion_muestras_min`: cantidad mínima de atenciones históricas necesarias para utilizar un promedio.
- `estimacion_ventana_dias`: cantidad de días de historial que se consideran en el cálculo.

Cuando no existen suficientes datos históricos, el sistema utiliza la duración estimada configurada para cada tipo de servicio.

Los cambios en estos parámetros deben realizarse de manera controlada y verificarse mediante pruebas.

## 4. Presentación de la estimación al cliente

Cuando el cliente obtiene un turno, el sistema puede mostrar un mensaje como:

**Tiempo de espera aproximado: 5 minutos.**

El mensaje identifica el tiempo como aproximado para evitar que se interprete como una promesa de atención en un momento exacto.

La estimación se calcula al crear el turno y se almacena en la base de datos. Por lo tanto, el valor mostrado no debe interpretarse como una actualización en tiempo real.

Si no es posible calcular una estimación, el sistema puede conservar el turno sin mostrar un tiempo.

## 5. Uso responsable de IA durante el desarrollo

Durante el desarrollo del proyecto se utilizó asistencia de inteligencia artificial como apoyo para comprender requisitos, proponer soluciones, explicar código y preparar pruebas y documentación.

La IA se utilizó como herramienta de apoyo y no como sustituto de las decisiones del equipo.

El código propuesto se integró en el proyecto y se verificó mediante pruebas automatizadas. Para la funcionalidad de estimación del tiempo de espera se ejecutaron 92 pruebas, distribuidas en 7 suites, todas aprobadas. También se realizó una comprobación visual del funcionamiento en la página del cliente.

Es importante aclarar que el cálculo de espera implementado utiliza reglas, consultas a la base de datos y promedios históricos. No depende de un modelo de inteligencia artificial generativa para producir cada estimación.

## 6. Conclusión

El sistema busca ofrecer información útil sobre los tiempos de espera sin presentar los resultados como certezas. Para ello utiliza datos operativos, permite ajustar parámetros y mantiene la posibilidad de supervisión humana.

La inteligencia artificial empleada durante el desarrollo se considera una herramienta de apoyo, mientras que la revisión, las pruebas y las decisiones finales corresponden al equipo responsable del proyecto.

## 7. Documentación relacionada

- **GES-26:** borrador del algoritmo de estimación del tiempo de espera.
- **GES-28:** implementación y pruebas del cálculo de espera por servicio y mostrador.
- **GES-45:** evidencia de uso de inteligencia artificial, incluyendo interacciones, decisiones y modificaciones realizadas durante el desarrollo.

La evidencia de GES-45 complementará este documento y permitirá identificar con mayor detalle qué aportó la IA y qué decisiones tomó el equipo.