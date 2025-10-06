const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Importar middleware
const { globalErrorHandler, logError, validateJSON, notFound } = require('./src/middleware/errorHandler');

// Importar rutas
const authRoutes = require('./src/routes/auth.routes');
const usersRoutes = require('./src/routes/users.routes');
const productosRoutes = require('./src/routes/productos.routes');
const entradasRoutes = require('./src/routes/entradas.routes');
const ventasRoutes = require('./src/routes/ventas.routes');
const mermasRoutes = require('./src/routes/mermas.routes');
const estadisticasRoutes = require('./src/routes/estadisticas.routes');
const pagosRoutes = require('./src/routes/pagos.routes');

// Importar middleware de autenticación
const { optionalAuth } = require('./src/middleware/auth');

const app = express();

// Configuración de CORS
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware básico
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware de validación JSON
app.use(validateJSON);

// Middleware de logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ⭐ RUTAS PÚBLICAS DE AUTENTICACIÓN (sin protección)
app.use('/api/auth', authRoutes);

// Middleware de autenticación opcional para otras rutas
app.use('/api', optionalAuth);

// ⭐ RUTAS PROTEGIDAS
app.use('/api/users', usersRoutes);
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
      auth: '/api/auth',
      users: '/api/users',
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
  console.log(`🔐 Auth endpoint en http://localhost:${PORT}/api/auth/login`);
  console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
});