// Punto de entrada: inicia el servidor.  Ejecutar con:  npm start  (o  npm run dev)

const app = require('./app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor listo en http://localhost:${PORT}`);
});
