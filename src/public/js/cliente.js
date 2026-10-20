(function () {
  'use strict';

  var CLAVE = 'turnoActual';
  var ESTADOS_FINALES = ['atendido', 'no_asistio', 'cancelado'];

  var TEXTO_ESTADO = {
    esperando: 'Esperando tu turno',
    en_atencion: 'Te están llamando',
    atendido: 'Tu turno ya fue atendido',
    no_asistio: 'Tu turno se marcó como "no asistió"',
    cancelado: 'Tu turno fue cancelado',
  };

  var el = {
    cargando: document.getElementById('cargando'),
    aviso: document.getElementById('aviso'),
    vistaServicios: document.getElementById('vista-servicios'),
    lista: document.getElementById('lista-servicios'),
    btnTomar: document.getElementById('btn-tomar'),
    vistaTurno: document.getElementById('vista-turno'),
    codigo: document.getElementById('turno-codigo'),
    servicio: document.getElementById('turno-servicio'),
    estado: document.getElementById('turno-estado'),
    nota: document.getElementById('turno-nota'),
    btnCancelar: document.getElementById('btn-cancelar'),
    btnNuevo: document.getElementById('btn-nuevo'),
  };

  var servicioElegido = null;
  var enviando = false;
  var cancelando = false;

  function guardarTurno(turno) {
    try {
      localStorage.setItem(CLAVE, JSON.stringify({
        id: turno.id,
        token_cancelacion: turno.token_cancelacion,
      }));
    } catch (e) {
      /* sin almacenamiento */
    }
  }

  function leerTurnoGuardado() {
    try {
      var texto = localStorage.getItem(CLAVE);
      return texto ? JSON.parse(texto) : null;
    } catch (e) {
      return null;
    }
  }

  function olvidarTurno() {
    try {
      localStorage.removeItem(CLAVE);
    } catch (e) {
      /* sin almacenamiento */
    }
  }

  function mostrarAviso(texto, esInfo) {
    el.aviso.textContent = texto;
    el.aviso.className = esInfo ? 'aviso info' : 'aviso';
    el.aviso.hidden = false;
  }

  function limpiarAviso() {
    el.aviso.hidden = true;
    el.aviso.textContent = '';
  }

  function mostrarVista(nombre) {
    el.cargando.hidden = true;
    el.vistaServicios.hidden = nombre !== 'servicios';
    el.vistaTurno.hidden = nombre !== 'turno';
  }

  function textoHorario(horario) {
    if (!horario || horario.length === 0) {
      return 'Hoy no hay atención.';
    }

    var rangos = horario.map(function (h) {
      return h.inicio + ' a ' + h.fin;
    });

    return 'Horario de hoy: ' + rangos.join(' y ') + '.';
  }

  function pedirJson(url, opciones) {
    return fetch(url, opciones).then(function (res) {
      return res.json().catch(function () {
        return {};
      }).then(function (cuerpo) {
        if (!res.ok) {
          var error = new Error(cuerpo.error || 'Ocurrió un error.');
          error.codigo = cuerpo.codigo;
          error.cuerpo = cuerpo;
          throw error;
        }
        return cuerpo;
      });
    });
  }

  function elegirServicio(servicio, boton) {
    servicioElegido = servicio.id;

    Array.prototype.forEach.call(el.lista.children, function (b) {
      b.setAttribute('aria-checked', b === boton ? 'true' : 'false');
    });

    el.btnTomar.disabled = enviando;
  }

  function dibujarServicios(servicios) {
    el.lista.textContent = '';
    servicioElegido = null;
    el.btnTomar.disabled = true;

    servicios.forEach(function (s) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'servicio';
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', 'false');

      var nombre = document.createElement('span');
      nombre.className = 'servicio-nombre';
      nombre.textContent = s.nombre;
      b.appendChild(nombre);

      if (s.descripcion) {
        var desc = document.createElement('span');
        desc.className = 'servicio-desc';
        desc.textContent = s.descripcion;
        b.appendChild(desc);
      }

      b.addEventListener('click', function () {
        elegirServicio(s, b);
      });

      el.lista.appendChild(b);
    });
  }

  function cargarServicios() {
    limpiarAviso();
    el.cargando.hidden = false;
    el.vistaServicios.hidden = true;
    el.vistaTurno.hidden = true;

    return pedirJson('/api/turnos/servicios')
      .then(function (datos) {
        if (!datos.abierto) {
          mostrarVista('ninguna');
          mostrarAviso(
            'La atención está cerrada en este momento. ' +
            textoHorario(datos.horario_hoy),
            true
          );
          return;
        }

        if (datos.servicios.length === 0) {
          mostrarVista('ninguna');
          mostrarAviso(
            'No hay servicios disponibles por ahora.',
            true
          );
          return;
        }

        dibujarServicios(datos.servicios);
        mostrarVista('servicios');
      })
      .catch(function () {
        mostrarVista('ninguna');
        mostrarAviso(
          'No pudimos cargar los servicios. Revisa tu conexión e intenta de nuevo.'
        );
      });
  }

  function tomarTurno() {
    if (enviando || servicioElegido === null) return;

    enviando = true;
    el.btnTomar.disabled = true;
    limpiarAviso();

    pedirJson('/api/turnos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tipo_servicio_id: servicioElegido,
      }),
    })
      .then(function (turno) {
        guardarTurno(turno);
        dibujarTurno(turno);
      })
      .catch(function (error) {
        if (error.codigo === 'FUERA_DE_HORARIO') {
          mostrarVista('ninguna');
          mostrarAviso(
            'La atención está cerrada en este momento. ' +
            textoHorario(error.cuerpo.horario_hoy),
            true
          );
        } else if (error.codigo === 'SERVICIO_INVALIDO') {
          mostrarAviso(error.message);
          cargarServicios();
        } else {
          mostrarAviso(
            'No fue posible tomar el turno. Intenta de nuevo.'
          );
        }
      })
      .then(function () {
        enviando = false;
        el.btnTomar.disabled = servicioElegido === null;
      });
  }

  function dibujarTurno(turno) {
    var final = ESTADOS_FINALES.indexOf(turno.estado) !== -1;
    var guardado = leerTurnoGuardado();

    el.codigo.textContent = turno.codigo;
    el.servicio.textContent =
      'Servicio: ' + turno.servicio.nombre;

    el.estado.textContent =
      TEXTO_ESTADO[turno.estado] || turno.estado;

    el.estado.className =
      turno.estado === 'en_atencion'
        ? 'turno-estado llamado'
        : 'turno-estado';

    if (turno.estado === 'en_atencion' && turno.mostrador) {
      el.estado.textContent = 'Pase al ' + turno.mostrador;
    }

    if (final) {
      el.nota.textContent = '';
    } else {
      el.nota.textContent =
        'Guarda este número. Si recargas la página, aquí seguirá tu turno.';
    }

    // Solo mostrar cancelar cuando existe un token
    // y el turno está esperando
    el.btnCancelar.hidden = !(
      turno.estado === 'esperando' &&
      guardado &&
      guardado.id === turno.id &&
      guardado.token_cancelacion
    );

    el.btnCancelar.disabled = cancelando;
    el.btnNuevo.hidden = !final;

    limpiarAviso();
    mostrarVista('turno');
  }

  // Cancelar el turno del cliente
  function cancelarTurno() {
    if (cancelando) return;

    var guardado = leerTurnoGuardado();

    if (!guardado || !guardado.id || !guardado.token_cancelacion) {
      mostrarAviso(
        'No encontramos la autorización para cancelar este turno.'
      );
      return;
    }

    var confirmado = window.confirm(
      '¿Estás segura de que deseas cancelar tu turno?'
    );

    if (!confirmado) return;

    cancelando = true;
    el.btnCancelar.disabled = true;
    limpiarAviso();

    pedirJson(
      '/api/turnos/' +
      encodeURIComponent(guardado.id) +
      '/cancelar',
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token_cancelacion: guardado.token_cancelacion,
        }),
      }
    )
      .then(function (respuesta) {
        dibujarTurno(respuesta.turno);
        mostrarAviso(
          'Tu turno fue cancelado correctamente.',
          true
        );
      })
      .catch(function (error) {
        if (error.codigo === 'CANCELACION_NO_PERMITIDA') {
          mostrarAviso(
            'Este turno ya no se puede cancelar. Actualiza la página para consultar su estado.'
          );
        } else if (error.codigo === 'TOKEN_CANCELACION_INVALIDO') {
          mostrarAviso(
            'No tienes autorización para cancelar este turno.'
          );
        } else {
          mostrarAviso(
            'No pudimos cancelar el turno. Intenta de nuevo.'
          );
        }
      })
      .then(function () {
        cancelando = false;
        el.btnCancelar.disabled = false;
      });
  }

  function iniciar() {
    var guardado = leerTurnoGuardado();

    if (!guardado || !guardado.id) {
      cargarServicios();
      return;
    }

    pedirJson(
      '/api/turnos/' + encodeURIComponent(guardado.id)
    )
      .then(function (turno) {
        if (!turno.es_de_hoy) {
          olvidarTurno();
          cargarServicios();
          return;
        }

        dibujarTurno(turno);
      })
      .catch(function (error) {
        if (error.codigo === 'TURNO_NO_ENCONTRADO') {
          olvidarTurno();
          cargarServicios();
        } else {
          mostrarVista('ninguna');
          mostrarAviso(
            'No pudimos consultar tu turno. Revisa tu conexión e intenta de nuevo.'
          );
        }
      });
  }

  el.btnTomar.addEventListener('click', tomarTurno);
  el.btnCancelar.addEventListener('click', cancelarTurno);

  el.btnNuevo.addEventListener('click', function () {
    olvidarTurno();
    cargarServicios();
  });

  iniciar();
})();
