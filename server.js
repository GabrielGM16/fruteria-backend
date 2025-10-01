const express = require('express');
const cors = require('cors');
require('dotenv').config();

const productosRoutes = require('./src/routes/productos.routes');
const entradasRoutes = require('./src/routes/entradas.routes');
const ventasRoutes = require('./src/routes/ventas.routes');
const mermasRoutes = require('./src/routes/mermas.routes');
const estadisticasRoutes = require('./src/routes/estadisticas.routes');
const pagosRoutes = require('./src/routes/pagos.routes');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/productos', productosRoutes);
app.use('/api/entradas', entradasRoutes);
app.use('/api/ventas', ventasRoutes);
app.use('/api/mermas', mermasRoutes);
app.use('/api/estadisticas', estadisticasRoutes);
app.use('/api/pagos', pagosRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'API Frutería Inventory' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});