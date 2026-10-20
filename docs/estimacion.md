## 1. Objetivo

Definir un algoritmo que permita calcular el tiempo aproximado que un cliente deberá esperar antes de recibir atención.

La estimación se realizará considerando la duración de los servicios, los turnos pendientes, el orden de atención y los mostradores disponibles.

El resultado será orientativo, ya que el tiempo real puede variar dependiendo de la duración de cada atención, la llegada de nuevos clientes y la disponibilidad de los mostradores.

## 2. Datos utilizados

Para realizar el cálculo se utilizará la información que ya se encuentra definida en la base de datos del sistema.

| Dato | Tabla o campo | Descripción |
|---|---|---|
| Tipo de servicio | `tipos_servicio` | Identifica el servicio solicitado por el cliente. |
| Duración inicial | `tipos_servicio.duracion_estimada_min` | Tiempo estimado de cada servicio cuando no existen suficientes datos reales. |
| Duración real | `turnos.duracion_seg` | Duración registrada de los turnos que ya fueron atendidos. |
| Estado del turno | `turnos.estado` | Permite identificar turnos esperando, en atención o finalizados. |
| Prioridad | `turnos.prioridad` | Permite respetar el orden de atención normal y preferencial. |
| Número del turno | `turnos.numero` | Se utiliza para ordenar turnos con la misma prioridad. |
| Mostradores disponibles | `mostradores` | Identifica los mostradores activos. |
| Servicios por mostrador | `mostrador_servicio` | Indica qué servicios puede atender cada mostrador. |
| Configuración | `configuracion` | Define la cantidad mínima de muestras y el período de análisis. |

## 3. Configuración del algoritmo

El sistema cuenta con dos parámetros que permiten controlar el uso de los datos históricos:

- **`estimacion_muestras_min`:** cantidad mínima de turnos atendidos que deben existir para calcular un promedio real. Su valor inicial es 5.
- **`estimacion_ventana_dias`:** cantidad de días anteriores que se tomarán en cuenta para obtener las duraciones reales. Su valor inicial es 7.

Estos parámetros se consultarán desde la tabla `configuracion`, por lo que podrán modificarse sin cambiar directamente el algoritmo.

Las duraciones iniciales de los servicios son:

| Servicio | Duración estimada inicial |
|---|---:|
| Consulta general | 5 minutos |
| Trámite | 10 minutos |
| Pagos | 7 minutos |

Estos valores corresponden a los datos iniciales definidos en `database/schema.sql`.

## 4. Cálculo de la duración promedio

El algoritmo buscará los turnos finalizados con estado `atendido`, correspondientes al mismo tipo de servicio, dentro del período configurado.

Solo se utilizarán registros que tengan una duración válida en `duracion_seg`.

Si la cantidad de registros es igual o mayor que `estimacion_muestras_min`, se calculará el promedio de duración real:

**Duración promedio (minutos) = Suma de duraciones reales (segundos) / Cantidad de turnos / 60**

Si no existen suficientes registros, se utilizará el valor de `duracion_estimada_min` del tipo de servicio.

De esta manera, el sistema podrá comenzar a mostrar estimaciones desde el inicio y utilizar información real cuando disponga de suficientes datos.

## 5. Orden de atención

El cálculo debe respetar las reglas que utiliza el sistema de recepción:

1. Primero se consideran los turnos con prioridad `preferencial`.
2. Después se consideran los turnos con prioridad `normal`.
3. Entre turnos de la misma prioridad, se respeta el número de turno de menor a mayor.
4. Se consideran únicamente los turnos del día que estén en estado `esperando`.
5. Los turnos `cancelado`, `no_asistio` y `atendido` no forman parte de la fila pendiente.

Un turno solo puede asignarse a un mostrador que esté habilitado para atender su tipo de servicio.

Por lo tanto, la cantidad de turnos anteriores no debe calcularse únicamente contando números menores, sino considerando también su prioridad y los servicios que pueden atender los mostradores.

## 6. Consideración de los mostradores

El sistema permite que un mostrador atienda uno o varios tipos de servicio.

Por ejemplo:

- El Mostrador 1 puede atender consultas generales y trámites.
- El Mostrador 2 puede atender trámites y pagos.

Para realizar una estimación más adecuada, se propone simular la disponibilidad de cada mostrador:

1. Identificar los mostradores activos y sus servicios habilitados.
2. Identificar si cada mostrador tiene un turno en atención.
3. Estimar el tiempo restante de los turnos que ya están siendo atendidos.
4. Ordenar los turnos pendientes según las reglas de prioridad.
5. Simular la asignación de cada turno al siguiente mostrador disponible que pueda atender su servicio.
6. Obtener el tiempo estimado en que el mostrador comenzaría a atender al cliente consultado.

Para un turno que ya está en atención, el tiempo restante puede estimarse como:

**Tiempo restante = Máximo(0, duración promedio del servicio − tiempo transcurrido desde el inicio de atención)**

Esta operación es aproximada, ya que una atención puede durar más o menos que el promedio.

Si no hay mostradores activos compatibles con el servicio, el sistema no deberá presentar una estimación numérica confiable y deberá indicar que no hay capacidad de atención disponible.

## 7. Pseudocódigo propuesto

```text
FUNCIÓN calcularDuracionServicio(servicio):

    muestrasMinimas = leerConfiguracion("estimacion_muestras_min")
    ventanaDias = leerConfiguracion("estimacion_ventana_dias")

    registros = buscarTurnosAtendidos(
        servicio,
        ventanaDias,
        duracionValida = VERDADERO
    )

    SI cantidad(registros) >= muestrasMinimas:
        duracion = promedio(registros.duracion_seg)
    SINO:
        duracion = servicio.duracion_estimada_min * 60

    RETORNAR duracion


FUNCIÓN estimarEspera(turno):

    SI turno.estado != "esperando":
        RETORNAR "No aplica"

    mostradores = buscarMostradoresActivos()

    mostradoresCompatibles = filtrarMostradoresQueAtienden(
        mostradores,
        turno.tipo_servicio_id
    )

    SI cantidad(mostradoresCompatibles) == 0:
        RETORNAR "Estimación no disponible"

    PARA CADA mostrador EN mostradores:
        SI mostrador tiene turno en atención:
            duracion = calcularDuracionServicio(
                servicio del turno en atención
            )
            transcurrido = tiempoDesdeInicioAtencion(mostrador)
            disponibleEn = MAXIMO(0, duracion - transcurrido)
        SINO:
            disponibleEn = 0

    pendientes = buscarTurnosEsperandoDelDia()

    MIENTRAS el turno consultado no haya sido asignado:

        seleccionar el mostrador que pueda atender
        al siguiente turno compatible según prioridad
        y número, considerando su disponibilidad

        siguienteTurno = obtenerSiguienteTurnoCompatible(
            pendientes,
            mostrador
        )

        SI siguienteTurno es el turno consultado:
            RETORNAR tiempoDisponibleDelMostrador

        duracion = calcularDuracionServicio(
            siguienteTurno.tipo_servicio
        )

        actualizarDisponibilidadDelMostrador(
            tiempoDisponibleDelMostrador + duracion
        )

        retirar siguienteTurno de pendientes

    FIN MIENTRAS
```

Este pseudocódigo representa una propuesta conceptual. En GES-28 se deberá definir con precisión cómo se selecciona el próximo mostrador disponible, evitando asignar dos turnos al mismo mostrador al mismo tiempo y respetando las reglas de recepción.

## 8. Ejemplo numérico

Supongamos que un cliente solicita un trámite y existen las siguientes condiciones:

- Duración estimada del trámite: 10 minutos.
- Cantidad de turnos anteriores: 4.
- Mostradores disponibles para trámites: 2.
- Ambos mostradores están libres al comenzar el cálculo.
- Todos los turnos anteriores son trámites de la misma prioridad.
- No ingresan nuevos turnos preferenciales durante la estimación.

En este caso, cada mostrador puede atender un turno durante los primeros 10 minutos y otro durante los siguientes 10 minutos.

| Tiempo | Mostrador 1 | Mostrador 2 |
|---|---|---|
| 0–10 minutos | Turno anterior 1 | Turno anterior 2 |
| 10–20 minutos | Turno anterior 3 | Turno anterior 4 |
| Minuto 20 | Cliente consultado puede iniciar atención | Disponible |

Por lo tanto, el tiempo estimado de espera del cliente es de **20 minutos**.

En este ejemplo simplificado también puede utilizarse la siguiente expresión:

**Espera estimada = (Turnos anteriores × Duración promedio) / Mostradores disponibles**

**Espera estimada = (4 × 10) / 2 = 20 minutos**

Esta fórmula simplificada funciona bajo los supuestos indicados. Para el sistema completo se propone utilizar la simulación de disponibilidad de mostradores, debido a que existen servicios compartidos y distintas prioridades.

## 9. Situaciones especiales

**Pocos datos históricos:** si no se alcanza la cantidad mínima de muestras, se utiliza la duración inicial del servicio.

**Turnos preferenciales:** se consideran antes que los normales, respetando el comportamiento de recepción.

**Turnos cancelados:** se excluyen de la fila pendiente y no generan tiempo adicional de espera.

**Turnos en atención:** se considera su tiempo restante estimado para determinar cuándo estará disponible el mostrador.

**Mostradores inactivos:** no se consideran como capacidad disponible.

**Sin mostradores compatibles:** se informa que la estimación no está disponible.

**Cambios en la fila:** cuando un turno se cancela, finaliza o cambia la disponibilidad de un mostrador, la estimación podrá calcularse nuevamente.

## 10. Advertencia al usuario

El sistema deberá mostrar un mensaje similar al siguiente:

> **Tiempo de espera aproximado:** 20 minutos. Este tiempo es una estimación y puede variar según la duración de las atenciones, la prioridad de otros turnos y la disponibilidad de los mostradores.

La estimación no representa una garantía ni una hora exacta de atención.

## 11. Alcance de esta tarea

GES-26 corresponde al diseño y documentación inicial del algoritmo.

La implementación del cálculo, su integración con el sistema y las pruebas funcionales se realizarán posteriormente en GES-28.

La propuesta deberá revisarse durante la implementación para garantizar que los resultados sean coherentes con las reglas de atención del sistema.