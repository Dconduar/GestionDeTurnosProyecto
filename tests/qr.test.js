process.env.DB_PATH = ':memory:';

const request = require('supertest');
const app = require('../src/server/app');

async function entrarComo(usuario, contrasena) {
  const agente = request.agent(app);
  await agente.post('/api/admin/login').send({ usuario, contrasena });
  return agente;
}

function pedirSvg(agente, url) {
  return agente.get(url).buffer(true).parse((res, terminar) => {
    let datos = '';
    res.setEncoding('utf8');
    res.on('data', (trozo) => { datos += trozo; });
    res.on('end', () => terminar(null, datos));
  });
}

describe('Acceso por QR', () => {
  let admin;
  beforeAll(async () => {
    admin = await entrarComo('admin', 'admin123');
  });
  afterEach(() => {
    delete process.env.PUBLIC_URL;
  });

  test('sin sesión no entrega direcciones ni imagen', async () => {
    expect((await request(app).get('/api/qr/direcciones')).status).toBe(401);
    expect((await request(app).get('/api/qr/imagen?i=0')).status).toBe(401);
  });

  test('un recepcionista también puede ver las direcciones', async () => {
    const recepcion = await entrarComo('recepcion1', 'recepcion123');
    expect((await recepcion.get('/api/qr/direcciones')).status).toBe(200);
  });

  test('PUBLIC_URL es la primera dirección y no deja barras repetidas', async () => {
    process.env.PUBLIC_URL = 'https://demo.ejemplo.com//';
    const res = await admin.get('/api/qr/direcciones');
    expect(res.status).toBe(200);
    expect(res.body.direcciones[0].url).toBe('https://demo.ejemplo.com/cliente.html');
  });

  test('si se entra por un nombre que no es localhost, ofrece esa dirección', async () => {
    const res = await admin.get('/api/qr/direcciones').set('Host', 'turnos.ejemplo.com');
    expect(res.body.direcciones.map((d) => d.url)).toContain('http://turnos.ejemplo.com/cliente.html');
  });

  test('con localhost no se ofrece una dirección que el celular no podría abrir', async () => {
    const res = await admin.get('/api/qr/direcciones');
    const urls = res.body.direcciones.map((d) => d.url);
    expect(urls.some((u) => u.includes('localhost') || u.includes('127.0.0.1'))).toBe(false);
  });

  test('todas las direcciones llevan a la pantalla del cliente', async () => {
    process.env.PUBLIC_URL = 'https://demo.ejemplo.com';
    const res = await admin.get('/api/qr/direcciones');
    res.body.direcciones.forEach((d) => expect(d.url.endsWith('/cliente.html')).toBe(true));
  });

  test('devuelve un QR en formato SVG', async () => {
    process.env.PUBLIC_URL = 'https://demo.ejemplo.com';
    const res = await pedirSvg(admin, '/api/qr/imagen?i=0');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/image\/svg\+xml/);
    expect(res.body).toContain('<svg');
  });

  test('cada dirección genera un QR distinto', async () => {
    process.env.PUBLIC_URL = 'https://uno.ejemplo.com';
    const uno = await pedirSvg(admin, '/api/qr/imagen?i=0');
    process.env.PUBLIC_URL = 'https://dos.ejemplo.com';
    const dos = await pedirSvg(admin, '/api/qr/imagen?i=0');
    expect(uno.body).toContain('<svg');
    expect(dos.body).toContain('<svg');
    expect(uno.body).not.toBe(dos.body);
  });

  test('no genera QR de textos que mande el usuario', async () => {
    process.env.PUBLIC_URL = 'https://demo.ejemplo.com';
    const normal = await pedirSvg(admin, '/api/qr/imagen?i=0');
    const intento = await pedirSvg(admin, '/api/qr/imagen?i=0&url=http://sitio-malo.com');
    expect(normal.body).toContain('<svg');
    expect(intento.body).toBe(normal.body);
  });

  describe('redes locales', () => {
    const os = require('os');
    const red = (address) => [{ address, family: 'IPv4', internal: false }];

    afterEach(() => jest.restoreAllMocks());

    test('si hay Wi-Fi, solo ofrece el Wi-Fi', async () => {
      jest.spyOn(os, 'networkInterfaces').mockReturnValue({
        Ethernet: red('192.168.56.1'),
        'VMware Network Adapter VMnet1': red('192.168.148.1'),
        'VMware Network Adapter VMnet8': red('192.168.79.1'),
        'Wi-Fi': red('172.20.10.3'),
      });
      const res = await admin.get('/api/qr/direcciones');
      expect(res.body.direcciones).toEqual([
        { etiqueta: 'Red local · Wi-Fi', url: expect.stringMatching(/^http:\/\/172\.20\.10\.3:\d+\/cliente\.html$/) },
      ]);
    });

    test('sin Wi-Fi, ofrece las redes que no son virtuales', async () => {
      jest.spyOn(os, 'networkInterfaces').mockReturnValue({
        Ethernet: red('10.0.0.5'),
        'VMware Network Adapter VMnet8': red('192.168.79.1'),
        'vEthernet (WSL)': red('172.28.0.1'),
      });
      const res = await admin.get('/api/qr/direcciones');
      expect(res.body.direcciones.map((d) => d.etiqueta)).toEqual(['Red local · Ethernet']);
    });
  });

  test('rechaza índices inválidos o inexistentes', async () => {
    process.env.PUBLIC_URL = 'https://demo.ejemplo.com';
    expect((await admin.get('/api/qr/imagen')).status).toBe(400);
    expect((await admin.get('/api/qr/imagen?i=abc')).status).toBe(400);
    expect((await admin.get('/api/qr/imagen?i=-1')).status).toBe(400);
    expect((await admin.get('/api/qr/imagen?i=99')).status).toBe(404);
  });
});