(function () {
  'use strict';

  const imagen = document.getElementById('imagen-qr');
  const mensaje = document.getElementById('mensaje');

  function mostrarMensaje(contenido) {
    mensaje.textContent = contenido;
    mensaje.hidden = false;
  }

  async function iniciar() {
    let respuesta;
    try {
      respuesta = await fetch('/api/qr/direcciones');
    } catch (error) {
      return mostrarMensaje('No hay conexión con el servidor. Inténtalo de nuevo.');
    }

    if (respuesta.status === 401 || respuesta.status === 403) {
      window.location.href = '/login.html';
      return;
    }
    if (!respuesta.ok) return mostrarMensaje('No se pudieron obtener las direcciones.');

    const datos = await respuesta.json();
    if (!datos.direcciones.length) {
      return mostrarMensaje('No se detectó ninguna red. Conecta la computadora a una red WiFi y recarga la página.');
    }

    document.getElementById('imprimir').addEventListener('click', function () { window.print(); });

    document.getElementById('contenido').hidden = false;
    imagen.src = '/api/qr/imagen?i=0&t=' + Date.now();
  }

  iniciar();
})();