(function () {
  'use strict';

  var formulario = document.getElementById('formulario');
  var mensaje = document.getElementById('mensaje');

  function mostrarError(texto) {
    mensaje.textContent = texto;
    mensaje.hidden = false;
  }

  formulario.addEventListener('submit', function (evento) {
    evento.preventDefault();
    mensaje.hidden = true;

    fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usuario: document.getElementById('usuario').value.trim(),
        contrasena: document.getElementById('contrasena').value
      })
    })
      .then(function (respuesta) {
        return respuesta.json().then(function (datos) {
          return { ok: respuesta.ok, datos: datos };
        });
      })
      .then(function (resultado) {
        if (!resultado.ok) {
          mostrarError(resultado.datos.error || 'No se pudo iniciar sesión.');
          return;
        }
        window.location.href = resultado.datos.rol === 'administrador' ? '/admin.html' : '/recepcion.html';
      })
      .catch(function () {
        mostrarError('No hay conexión con el servidor. Inténtalo de nuevo.');
      });
  });
})();