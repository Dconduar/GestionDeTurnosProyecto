(function () {
  'use strict';

  const DIAS = [
    { numero: 1, nombre: 'Lunes' }, { numero: 2, nombre: 'Martes' }, { numero: 3, nombre: 'Miércoles' },
    { numero: 4, nombre: 'Jueves' }, { numero: 5, nombre: 'Viernes' }, { numero: 6, nombre: 'Sábado' },
    { numero: 0, nombre: 'Domingo' }
  ];

  const $ = (id) => document.getElementById(id);
  let servicios = [];
  let mostradores = [];


  function escapar(texto) {
    return String(texto == null ? '' : texto).replace(/[&<>"']/g, (c) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  }

  function mostrarMensaje(texto, tipo) {
    const aviso = $('mensaje');
    aviso.textContent = texto;
    aviso.className = 'aviso' + (tipo === 'info' ? ' info' : '');
    aviso.hidden = false;
  }

  function ocultarMensaje() { $('mensaje').hidden = true; }

  async function api(url, opciones) {
    const config = Object.assign({ headers: { 'Content-Type': 'application/json' } }, opciones);
    if (config.body && typeof config.body !== 'string') config.body = JSON.stringify(config.body);
    let respuesta;
    try {
      respuesta = await fetch(url, config);
    } catch (error) {
      return { ok: false, datos: { error: 'No hay conexión con el servidor. Inténtalo de nuevo.' } };
    }
    if (respuesta.status === 401) { window.location.href = '/login.html'; return { ok: false, datos: {} }; }
    let datos = {};
    try { datos = await respuesta.json(); } catch (error) { /* sin cuerpo */ }
    return { ok: respuesta.ok, datos: datos };
  }

  function etiquetaEstado(activo) {
    return activo ? '<span class="etiqueta etiqueta-acento">Activo</span>' : '<span class="etiqueta">Desactivado</span>';
  }


  function pintarServicios() {
    $('tabla-servicios').innerHTML = servicios.map((s) => `
      <tr>
        <td><strong>${escapar(s.prefijo)}</strong></td>
        <td>${escapar(s.nombre)}${s.descripcion ? `<br><span class="texto-suave">${escapar(s.descripcion)}</span>` : ''}</td>
        <td>${s.duracion_estimada_min}</td>
        <td>${etiquetaEstado(s.activo)}</td>
        <td><div class="botones">
          <button class="boton boton-compacto" type="button" data-accion="editar-servicio" data-id="${s.id}">Editar</button>
          <button class="boton boton-compacto" type="button" data-accion="estado-servicio" data-id="${s.id}">${s.activo ? 'Desactivar' : 'Activar'}</button>
        </div></td>
      </tr>`).join('');
  }

  function limpiarFormServicio() {
    $('form-servicio').reset();
    $('servicio-id').value = '';
    $('servicio-duracion').value = 10;
    $('titulo-servicio').textContent = 'Nuevo servicio';
    $('cancelar-servicio').hidden = true;
  }

  async function cargarServicios() {
    const r = await api('/api/admin/servicios');
    if (r.ok) { servicios = r.datos; pintarServicios(); pintarCasillasServicios(); pintarMostradores(); }
  }


  function nombresServicios(ids) {
    return ids.map((id) => {
      const s = servicios.find((x) => x.id === id);
      return s ? escapar(s.nombre) : '';
    }).filter(Boolean).join(', ') || '—';
  }

  function pintarMostradores() {
    $('tabla-mostradores').innerHTML = mostradores.map((m) => `
      <tr>
        <td><strong>${escapar(m.nombre)}</strong></td>
        <td>${nombresServicios(m.servicios)}</td>
        <td>${etiquetaEstado(m.activo)}</td>
        <td><div class="botones">
          <button class="boton boton-compacto" type="button" data-accion="editar-mostrador" data-id="${m.id}">Editar</button>
          <button class="boton boton-compacto" type="button" data-accion="estado-mostrador" data-id="${m.id}">${m.activo ? 'Desactivar' : 'Activar'}</button>
        </div></td>
      </tr>`).join('');
  }

  function pintarCasillasServicios(marcados) {
    const elegidos = marcados || serviciosMarcados();
    $('mostrador-servicios').innerHTML = servicios.filter((s) => s.activo).map((s) => `
      <label class="casilla">
        <input type="checkbox" value="${s.id}" ${elegidos.indexOf(s.id) !== -1 ? 'checked' : ''}>
        ${escapar(s.prefijo)} · ${escapar(s.nombre)}
      </label>`).join('');
  }

  function serviciosMarcados() {
    return Array.prototype.map.call(
      $('mostrador-servicios').querySelectorAll('input:checked'), (c) => Number(c.value)
    );
  }

  function limpiarFormMostrador() {
    $('form-mostrador').reset();
    $('mostrador-id').value = '';
    $('titulo-mostrador').textContent = 'Nuevo mostrador';
    $('cancelar-mostrador').hidden = true;
    pintarCasillasServicios([]);
  }

  async function cargarMostradores() {
    const r = await api('/api/admin/mostradores');
    if (r.ok) { mostradores = r.datos; pintarMostradores(); }
  }


  function pintarHorarios(horarios) {
    let variosTramos = false;
    $('horarios-dias').innerHTML = DIAS.map((dia) => {
      const tramos = horarios.filter((h) => h.dia_semana === dia.numero && h.activo);
      if (tramos.length > 1) variosTramos = true;
      const t = tramos[0];
      return `
        <div class="horario-dia" data-dia="${dia.numero}">
          <strong>${dia.nombre}</strong>
          <label class="casilla"><input type="checkbox" class="dia-abierto" ${t ? 'checked' : ''}> Abierto</label>
          <label class="casilla">Desde <input type="time" class="dia-inicio" value="${t ? t.hora_inicio : '08:00'}"></label>
          <label class="casilla">Hasta <input type="time" class="dia-fin" value="${t ? t.hora_fin : '17:00'}"></label>
        </div>`;
    }).join('');
    const nota = $('nota-horarios');
    nota.hidden = !variosTramos;
    nota.textContent = 'Algunos días tienen más de un tramo; el panel muestra el primero y al guardar solo se conserva ese.';
  }

  async function cargarHorarios() {
    const r = await api('/api/admin/horarios');
    if (r.ok) pintarHorarios(r.datos);
  }


  $('form-servicio').addEventListener('submit', async (e) => {
    e.preventDefault();
    ocultarMensaje();
    const id = $('servicio-id').value;
    const cuerpo = {
      nombre: $('servicio-nombre').value.trim(),
      prefijo: $('servicio-prefijo').value.trim(),
      duracion_estimada_min: Number($('servicio-duracion').value),
      descripcion: $('servicio-descripcion').value.trim() || null
    };
    const r = await api(id ? `/api/admin/servicios/${id}` : '/api/admin/servicios', { method: id ? 'PATCH' : 'POST', body: cuerpo });
    if (!r.ok) return mostrarMensaje(r.datos.error || 'No se pudo guardar el servicio.');
    mostrarMensaje(id ? 'Servicio actualizado.' : 'Servicio creado.', 'info');
    limpiarFormServicio();
    await cargarServicios();
  });

  $('cancelar-servicio').addEventListener('click', limpiarFormServicio);

  $('tabla-servicios').addEventListener('click', async (e) => {
    const boton = e.target.closest('button[data-accion]');
    if (!boton) return;
    const servicio = servicios.find((s) => s.id === Number(boton.dataset.id));
    if (!servicio) return;
    ocultarMensaje();
    if (boton.dataset.accion === 'editar-servicio') {
      $('servicio-id').value = servicio.id;
      $('servicio-nombre').value = servicio.nombre;
      $('servicio-prefijo').value = servicio.prefijo;
      $('servicio-duracion').value = servicio.duracion_estimada_min;
      $('servicio-descripcion').value = servicio.descripcion || '';
      $('titulo-servicio').textContent = 'Editar servicio';
      $('cancelar-servicio').hidden = false;
      $('servicio-nombre').focus();
    } else {
      const r = await api(`/api/admin/servicios/${servicio.id}`, { method: 'PATCH', body: { activo: !servicio.activo } });
      if (!r.ok) return mostrarMensaje(r.datos.error || 'No se pudo cambiar el estado.');
      mostrarMensaje(servicio.activo ? 'Servicio desactivado.' : 'Servicio activado.', 'info');
      await cargarServicios();
    }
  });

  $('form-mostrador').addEventListener('submit', async (e) => {
    e.preventDefault();
    ocultarMensaje();
    const id = $('mostrador-id').value;
    const cuerpo = { nombre: $('mostrador-nombre').value.trim(), servicios: serviciosMarcados() };
    const r = await api(id ? `/api/admin/mostradores/${id}` : '/api/admin/mostradores', { method: id ? 'PATCH' : 'POST', body: cuerpo });
    if (!r.ok) return mostrarMensaje(r.datos.error || 'No se pudo guardar el mostrador.');
    mostrarMensaje(id ? 'Mostrador actualizado.' : 'Mostrador creado.', 'info');
    limpiarFormMostrador();
    await cargarMostradores();
  });

  $('cancelar-mostrador').addEventListener('click', limpiarFormMostrador);

  $('tabla-mostradores').addEventListener('click', async (e) => {
    const boton = e.target.closest('button[data-accion]');
    if (!boton) return;
    const mostrador = mostradores.find((m) => m.id === Number(boton.dataset.id));
    if (!mostrador) return;
    ocultarMensaje();
    if (boton.dataset.accion === 'editar-mostrador') {
      $('mostrador-id').value = mostrador.id;
      $('mostrador-nombre').value = mostrador.nombre;
      pintarCasillasServicios(mostrador.servicios);
      $('titulo-mostrador').textContent = 'Editar mostrador';
      $('cancelar-mostrador').hidden = false;
      $('mostrador-nombre').focus();
    } else {
      const r = await api(`/api/admin/mostradores/${mostrador.id}`, { method: 'PATCH', body: { activo: !mostrador.activo } });
      if (!r.ok) return mostrarMensaje(r.datos.error || 'No se pudo cambiar el estado.');
      mostrarMensaje(mostrador.activo ? 'Mostrador desactivado.' : 'Mostrador activado.', 'info');
      await cargarMostradores();
    }
  });

  $('form-horarios').addEventListener('submit', async (e) => {
    e.preventDefault();
    ocultarMensaje();
    const horarios = [];
    document.querySelectorAll('.horario-dia').forEach((fila) => {
      if (!fila.querySelector('.dia-abierto').checked) return;
      horarios.push({
        dia_semana: Number(fila.dataset.dia),
        hora_inicio: fila.querySelector('.dia-inicio').value,
        hora_fin: fila.querySelector('.dia-fin').value,
        activo: true
      });
    });
    const r = await api('/api/admin/horarios', { method: 'PUT', body: { horarios: horarios } });
    if (!r.ok) return mostrarMensaje(r.datos.error || 'No se pudieron guardar los horarios.');
    mostrarMensaje('Horarios guardados.', 'info');
    pintarHorarios(r.datos);
  });

  $('cerrar-sesion').addEventListener('click', async () => {
    await api('/api/admin/logout', { method: 'POST' });
    window.location.href = '/login.html';
  });


  async function iniciar() {
    const sesion = await api('/api/admin/sesion');
    if (!sesion.ok) return;
    $('usuario-actual').textContent = sesion.datos.nombre;
    $('usuario-actual').hidden = false;
    $('cerrar-sesion').hidden = false;

    if (sesion.datos.rol !== 'administrador') { $('sin-permiso').hidden = false; return; }

    $('contenido').hidden = false;
    await cargarServicios();
    await cargarMostradores();
    await cargarHorarios();
  }

  iniciar();
})();