(function () {
  'use strict';

  const selector = document.getElementById('direccion');
  const imagen = document.getElementById('imagen-qr');
  const texto = document.getElementById('texto-direccion');
  const mensaje = document.getElementById('mensaje');

  function mostrarMensaje(contenido) {
    mensaje.textContent = contenido;
    mensaje.hidden = false;
  }

  function mostrarQr(indice) {
    imagen.src = '/api/qr/imagen?i=' + indice + '&t=' + Date.now();
    texto.textContent = selector.options[indice].dataset.url;
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

    datos.direcciones.forEach(function (d, i) {
      const opcion = document.createElement('option');
      opcion.value = i;
      opcion.textContent = d.etiqueta + ' — ' + d.url;
      opcion.dataset.url = d.url;
      selector.appendChild(opcion);
    });

    selector.addEventListener('change', function () { mostrarQr(Number(selector.value)); });
    document.getElementById('imprimir').addEventListener('click', function () { window.print(); });

    document.getElementById('contenido').hidden = false;
    mostrarQr(0);
  }

  iniciar();
})();