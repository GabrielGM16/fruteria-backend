const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Importar middleware
const { globalErrorHandler, logError, validateJSON, notFound } = require('./src/middleware/errorHandler');

// Importar rutas
const productosRoutes = require('./src/routes/productos.routes');
const entradasRoutes = require('./src/routes/entradas.routes');
const ventasRoutes = require('./src/routes/ventas.routes');
const mermasRoutes = require('./src/routes/mermas.routes');
const estadisticasRoutes = require('./src/routes/estadisticas.routes');
const pagosRoutes = require('./src/routes/pagos.routes');

const app = express();

// Middleware básico
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware de validación JSON
app.use(validateJSON);

// Rutas principales
app.use('/api/productos', productosRoutes);
app.use('/api/entradas', entradasRoutes);
app.use('/api/ventas', ventasRoutes);
app.use('/api/mermas', mermasRoutes);
app.use('/api/estadisticas', estadisticasRoutes);
app.use('/api/pagos', pagosRoutes);

// Rutas adicionales para compatibilidad con frontend
app.use('/api/inventario/:id/stock', productosRoutes);
app.use('/api/inventario/alertas', productosRoutes);
app.use('/api/proveedores', entradasRoutes);

// Ruta raíz
app.get('/', (req, res) => {
  res.json({ 
    message: 'API Frutería Inventory',
    version: '1.0.0',
    status: 'active',
    timestamp: new Date().toISOString(),
    endpoints: {
      productos: '/api/productos',
      entradas: '/api/entradas',
      ventas: '/api/ventas',
      mermas: '/api/mermas',
      estadisticas: '/api/estadisticas',
      pagos: '/api/pagos'
    }
  });
});

// Ruta de health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Middleware de manejo de errores (debe ir al final)
app.use(notFound);
app.use(logError);
app.use(globalErrorHandler);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  console.log(`📋 Documentación disponible en http://localhost:${PORT}`);
  console.log(`🏥 Health check en http://localhost:${PORT}/health`);
  console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
});