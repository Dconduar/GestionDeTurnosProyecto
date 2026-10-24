const request = require('supertest');

async function iniciarSesion(app, usuario = 'admin', contrasena = 'admin123') {
  const agente = request.agent(app);
  await agente.post('/api/admin/login').send({ usuario, contrasena });
  return agente;
}

module.exports = { iniciarSesion };
