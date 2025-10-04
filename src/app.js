const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Importar rutas
const productosRoutes = require('./routes/productos.routes');
const ventasRoutes = require('./routes/ventas.routes');
const entradasRoutes = require('./routes/entradas.routes');
const mermasRoutes = require('./routes/mermas.routes');
const estadisticasRoutes = require('./routes/estadisticas.routes');
const pagosRoutes = require('./routes/pagos.routes');

// Importar nuevas rutas de autenticación
const authRoutes = require('./routes/auth.routes');
const usersRoutes = require('./routes/users.routes');

// Importar middleware
const errorHandler = require('./middleware/errorHandler');
const { optionalAuth } = require('./middleware/auth');

const app = express();

// Configuración de CORS
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'], // Permitir frontend
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware para parsear JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware de logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Rutas públicas de autenticación
app.use('/api/auth', authRoutes);

// Middleware de autenticación opcional para rutas que pueden funcionar sin auth
app.use('/api', optionalAuth);

// Rutas protegidas
app.use('/api/users', usersRoutes);
app.use('/api/productos', productosRoutes);
app.use('/api/ventas', ventasRoutes);
app.use('/api/entradas', entradasRoutes);
app.use('/api/mermas', mermasRoutes);
app.use('/api/estadisticas', estadisticasRoutes);
app.use('/api/pagos', pagosRoutes);

// Ruta de salud del servidor
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Servidor funcionando correctamente',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Ruta raíz
app.get('/', (req, res) => {
  res.json({
    message: 'API Frutería - Sistema de Inventario',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      productos: '/api/productos',
      ventas: '/api/ventas',
      entradas: '/api/entradas',
      mermas: '/api/mermas',
      estadisticas: '/api/estadisticas',
      pagos: '/api/pagos',
      health: '/api/health'
    }
  });
});

// Manejo de rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada'
  });
});

// Middleware de manejo de errores (debe ir al final)
app.use(errorHandler);

module.exports = app;