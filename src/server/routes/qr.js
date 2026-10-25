const os = require('os');
const express = require('express');
const QRCode = require('qrcode');
const { requiereRol } = require('../auth');

const router = express.Router();

router.use(requiereRol('recepcionista', 'administrador'));

function sinBarraFinal(texto) {
  return String(texto).replace(/\/+$/, '');
}

function esLocal(host) {
  const nombre = String(host || '').split(':')[0].toLowerCase();
  return nombre === 'localhost' || nombre === '127.0.0.1' || nombre === '::1' || nombre === '[::1]';
}

const NOMBRE_WIFI = /wi-?fi|wlan|wireless|inal[aá]mbric/i;
const NOMBRE_VIRTUAL = /vmware|virtualbox|vbox|vethernet|hyper-v|wsl|docker|loopback/i;


function redesLocales() {
  const interfaces = os.networkInterfaces();
  const redes = [];
  Object.keys(interfaces).forEach((nombre) => {
    (interfaces[nombre] || []).forEach((dato) => {
      const esIPv4 = dato.family === 'IPv4' || dato.family === 4;
      if (esIPv4 && !dato.internal && !dato.address.startsWith('169.254.')) {
        redes.push({ nombre, direccion: dato.address });
      }
    });
  });

  const wifi = redes.filter((r) => NOMBRE_WIFI.test(r.nombre));
  return wifi.length > 0 ? wifi : redes.filter((r) => !NOMBRE_VIRTUAL.test(r.nombre));
}

function listarDirecciones(req) {
  const puerto = req.socket.localPort;
  const direcciones = [];

  if (process.env.PUBLIC_URL) {
    direcciones.push({ etiqueta: 'Dirección pública (PUBLIC_URL)', url: `${sinBarraFinal(process.env.PUBLIC_URL)}/cliente.html` });
  }

  const host = req.get('host');
  if (host && !esLocal(host)) {
    const protocolo = req.headers['x-forwarded-proto'] || req.protocol;
    direcciones.push({ etiqueta: 'Dirección que estás usando ahora', url: `${protocolo}://${host}/cliente.html` });
  }

  redesLocales().forEach((red) => {
    direcciones.push({ etiqueta: `Red local · ${red.nombre}`, url: `http://${red.direccion}:${puerto}/cliente.html` });
  });

  return direcciones;
}

router.get('/direcciones', (req, res) => {
  res.json({ direcciones: listarDirecciones(req) });
});

router.get('/imagen', async (req, res, next) => {
  const indice = Number(req.query.i);
  if (!Number.isInteger(indice) || indice < 0) {
    return res.status(400).json({ error: 'Indica el número de dirección (i).' });
  }

  try {
    const direccion = listarDirecciones(req)[indice];
    if (!direccion) {
      return res.status(404).json({ error: 'Esa dirección no existe.' });
    }

    const svg = await QRCode.toString(direccion.url, { type: 'svg', errorCorrectionLevel: 'M', margin: 2 });
    res.type('image/svg+xml').send(svg);
  } catch (error) {
    next(error);
  }
});

module.exports = router;