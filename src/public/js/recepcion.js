(function () {
  'use strict';

  var CLAVE_MOSTRADOR = 'mostradorRecepcion';
  var INTERVALO_MS = 2000;

  var el = {
    cargando: document.getElementById('cargando'),
    aviso: document.getElementById('aviso'),
    avisoConexion: document.getElementById('aviso-conexion'),
    panel: document.getElementById('panel'),
    mostrador: document.getElementById('mostrador'),
    resumen: document.getElementById('resumen'),
    atencionVacia: document.getElementById('atencion-vacia'),
    atencion: document.getElementById('atencion'),
    codigo: document.getElementById('atencion-codigo'),
    servicio: document.getElementById('atencion-servicio'),
    llamados: document.getElementById('atencion-llamados'),
    nota: document.getElementById('atencion-nota'),
    resultado: document.getElementById('atencion-resultado'),
    btnLlamar: document.getElementById('btn-llamar'),
    btnNoAsistio: document.getElementById('btn-no-asistio'),
    btnAtendido: document.getElementById('btn-atendido'),
    btnSiguiente: document.getElementById('btn-siguiente'),
    filaVacia: document.getElementById('fila-vacia'),
    filaContenedor: document.getElementById('fila-contenedor'),
    filaCuerpo: document.getElementById('fila-cuerpo'),
    otrosVacio: document.getElementById('otros-vacio'),
    otrosLista: document.getElementById('otros-lista')
  };

  var mostradorId = leerMostrador();
  var estado = null;
  var consultando = false;
  var enviando = false;

  function leerMostrador() {
    try { return localStorage.getItem(CLAVE_MOSTRADOR) || ''; } catch (e) { return ''; }
  }
  function guardarMostrador(id) {
    try { localStorage.setItem(CLAVE_MOSTRADOR, String(id)); } catch (e) { return; }
  }

  function textoHorario(horario) {
    if (!horario || horario.length === 0) return 'Hoy no hay atención.';
    var rangos = horario.map(function (h) { return h.inicio + ' a ' + h.fin; });
    return 'Horario de hoy: ' + rangos.join(' y ') + '.';
  }

  function textoEspera(segundos) {
    var minutos = Math.floor(segundos / 60);
    if (minutos < 1) return 'Menos de 1 min';
    if (minutos < 60) return minutos + ' min';
    return Math.floor(minutos / 60) + ' h ' + (minutos % 60) + ' min';
  }

  function textoDuracion(segundos) {
    var minutos = Math.floor(segundos / 60);
    if (minutos < 1) return segundos + ' s';
    return minutos + ' min ' + (segundos % 60) + ' s';
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

  function pedirJson(url, opciones) {
    return fetch(url, opciones).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (cuerpo) {
        if (!res.ok) {
          var error = new Error(cuerpo.error || 'Ocurrió un error.');
          error.codigo = cuerpo.codigo;
          error.cuerpo = cuerpo;
          error.http = true;
          throw error;
        }
        return cuerpo;
      });
    });
  }

  function enviarJson(url, metodo) {
    return pedirJson(url, {
      method: metodo,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mostrador_id: Number(mostradorId) })
    });
  }

  function celda(texto) {
    var td = document.createElement('td');
    td.textContent = texto;
    return td;
  }

  function dibujarMostradores(datos) {
    var actual = String(datos.mostrador.id);
    var ids = datos.mostradores.map(function (m) { return String(m.id); }).join(',');
    if (el.mostrador.getAttribute('data-ids') !== ids) {
      el.mostrador.textContent = '';
      datos.mostradores.forEach(function (m) {
        var opcion = document.createElement('option');
        opcion.value = String(m.id);
        opcion.textContent = m.nombre;
        el.mostrador.appendChild(opcion);
      });
      el.mostrador.setAttribute('data-ids', ids);
    }
    el.mostrador.value = actual;
    mostradorId = actual;
  }

  function dibujarAtencion(datos) {
    var turno = datos.en_atencion;
    el.atencionVacia.hidden = Boolean(turno);
    el.atencion.hidden = !turno;
    if (!turno) return;

    el.codigo.textContent = turno.codigo;
    el.servicio.textContent = 'Servicio: ' + turno.servicio.nombre +
      (turno.prioridad === 'preferencial' ? ' · Preferencial' : '');
    el.llamados.textContent = 'Llamados: ' + turno.llamados + ' de ' + turno.max_llamados;

    var sinLlamadosPorHacer = turno.llamados >= turno.max_llamados;
    el.btnLlamar.disabled = enviando || !datos.abierto || sinLlamadosPorHacer;
    el.btnNoAsistio.disabled = enviando || !turno.puede_marcar_no_asistio;
    el.btnAtendido.disabled = enviando;

    if (turno.puede_marcar_no_asistio) {
      el.nota.textContent = 'Se hicieron todos los llamados. Si no responde, márcalo como "no asistió".';
    } else {
      var faltan = turno.max_llamados - turno.llamados;
      el.nota.textContent = 'Si no responde, vuelve a llamar. Faltan ' + faltan +
        (faltan === 1 ? ' llamado' : ' llamados') + ' para poder marcarlo como "no asistió".';
    }
  }

  function dibujarFila(datos) {
    el.filaCuerpo.textContent = '';
    var hay = datos.fila.length > 0;
    el.filaVacia.hidden = hay;
    el.filaContenedor.hidden = !hay;
    datos.fila.forEach(function (turno) {
      var tr = document.createElement('tr');
      var codigo = celda(turno.codigo);
      codigo.className = 'celda-codigo';
      if (turno.prioridad === 'preferencial') {
        var marca = document.createElement('span');
        marca.className = 'etiqueta etiqueta-acento';
        marca.textContent = 'Preferencial';
        codigo.appendChild(document.createTextNode(' '));
        codigo.appendChild(marca);
      }
      tr.appendChild(codigo);
      tr.appendChild(celda(turno.servicio.nombre));
      tr.appendChild(celda(textoEspera(turno.espera_seg)));
      el.filaCuerpo.appendChild(tr);
    });
  }

  function dibujarOtros(datos) {
    el.otrosLista.textContent = '';
    var hay = datos.otros_mostradores.length > 0;
    el.otrosVacio.hidden = hay;
    datos.otros_mostradores.forEach(function (turno) {
      var li = document.createElement('li');
      var codigo = document.createElement('strong');
      codigo.textContent = turno.codigo;
      li.appendChild(codigo);
      li.appendChild(document.createTextNode(' en ' + (turno.mostrador || 'otro mostrador') +
        ' · ' + turno.servicio.nombre));
      el.otrosLista.appendChild(li);
    });
  }

  function dibujar(datos) {
    estado = datos;
    dibujarMostradores(datos);
    dibujarAtencion(datos);
    dibujarFila(datos);
    dibujarOtros(datos);

    el.resumen.textContent = datos.esperando_total === 1
      ? '1 turno esperando en total'
      : datos.esperando_total + ' turnos esperando en total';

    if (!datos.abierto) {
      mostrarAviso('La atención está cerrada en este momento. ' + textoHorario(datos.horario_hoy), true);
    } else if (el.aviso.classList.contains('info')) {
      limpiarAviso();
    }

    el.btnSiguiente.disabled = enviando || !datos.puede_llamar;
    el.cargando.hidden = true;
    el.panel.hidden = false;
  }

  function consultar() {
    if (consultando) return Promise.resolve();
    consultando = true;
    var url = '/api/recepcion/fila' + (mostradorId ? '?mostrador_id=' + encodeURIComponent(mostradorId) : '');
    return pedirJson(url)
      .then(function (datos) {
        el.avisoConexion.hidden = true;
        dibujar(datos);
      })
      .catch(function (error) {
        if (error.http && error.codigo === 'MOSTRADOR_INVALIDO' && mostradorId) {
          mostradorId = '';
          return;
        }
        el.avisoConexion.hidden = false;
        if (!estado) el.cargando.hidden = true;
      })
      .then(function () { consultando = false; });
  }

  function ejecutar(promesa, alCompletar) {
    if (enviando) return;
    enviando = true;
    el.btnSiguiente.disabled = true;
    el.btnLlamar.disabled = true;
    el.btnNoAsistio.disabled = true;
    el.btnAtendido.disabled = true;
    el.resultado.hidden = true;
    limpiarAviso();

    promesa()
      .then(function (respuesta) {
        limpiarAviso();
        if (alCompletar) alCompletar(respuesta);
      })
      .catch(function (error) {
        if (error.http) {
          mostrarAviso(error.message, error.codigo === 'FUERA_DE_HORARIO');
        } else {
          mostrarAviso('No se pudo completar la acción. Revisa tu conexión e intenta de nuevo.');
        }
      })
      .then(function () {
        enviando = false;
        el.btnAtendido.textContent = 'Atendido';
        return consultar();
      });
  }

  el.btnSiguiente.addEventListener('click', function () {
    ejecutar(function () { return enviarJson('/api/recepcion/llamar-siguiente', 'POST'); });
  });

  el.btnLlamar.addEventListener('click', function () {
    if (!estado || !estado.en_atencion) return;
    var id = estado.en_atencion.id;
    ejecutar(function () { return enviarJson('/api/recepcion/turnos/' + id + '/llamar', 'POST'); });
  });

  el.btnNoAsistio.addEventListener('click', function () {
    if (!estado || !estado.en_atencion) return;
    var id = estado.en_atencion.id;
    ejecutar(function () { return enviarJson('/api/recepcion/turnos/' + id + '/no-asistio', 'PATCH'); });
  });

  el.btnAtendido.addEventListener('click', function () {
    if (enviando || !estado || !estado.en_atencion) return;
    var id = estado.en_atencion.id;
    el.btnAtendido.textContent = 'Guardando…';
    ejecutar(
      function () { return enviarJson('/api/recepcion/turnos/' + id + '/atendido', 'PATCH'); },
      function (turno) {
        el.resultado.textContent = 'Turno ' + turno.codigo + ' atendido. Duración: ' +
          textoDuracion(turno.duracion_seg) + '.';
        el.resultado.hidden = false;
      }
    );
  });

  el.mostrador.addEventListener('change', function () {
    mostradorId = el.mostrador.value;
    guardarMostrador(mostradorId);
    el.resultado.hidden = true;
    limpiarAviso();
    consultar();
  });

  consultar();
  setInterval(consultar, INTERVALO_MS);
})();
