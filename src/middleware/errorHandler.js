// Middleware de manejo de errores centralizado

// Clase personalizada para errores de la aplicación
class AppError extends Error {
  constructor(message, statusCode, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';

    Error.captureStackTrace(this, this.constructor);
  }
}

// Manejo de errores de base de datos MySQL
const handleDatabaseError = (error) => {
  let message = 'Error de base de datos';
  let statusCode = 500;

  switch (error.code) {
    case 'ER_DUP_ENTRY':
      message = 'Ya existe un registro con estos datos';
      statusCode = 409;
      break;
    case 'ER_NO_REFERENCED_ROW_2':
      message = 'Referencia inválida - el registro relacionado no existe';
      statusCode = 400;
      break;
    case 'ER_ROW_IS_REFERENCED_2':
      message = 'No se puede eliminar - el registro está siendo utilizado';
      statusCode = 409;
      break;
    case 'ER_BAD_FIELD_ERROR':
      message = 'Campo de base de datos inválido';
      statusCode = 400;
      break;
    case 'ER_PARSE_ERROR':
      message = 'Error de sintaxis en consulta SQL';
      statusCode = 500;
      break;
    case 'ECONNREFUSED':
      message = 'No se puede conectar a la base de datos';
      statusCode = 503;
      break;
    case 'ER_ACCESS_DENIED_ERROR':
      message = 'Acceso denegado a la base de datos';
      statusCode = 503;
      break;
    case 'ER_BAD_DB_ERROR':
      message = 'Base de datos no encontrada';
      statusCode = 503;
      break;
    default:
      message = error.sqlMessage || 'Error interno de base de datos';
      statusCode = 500;
  }

  return new AppError(message, statusCode);
};

// Manejo de errores de validación de Joi
const handleValidationError = (error) => {
  const errors = error.details.map(detail => ({
    field: detail.path.join('.'),
    message: detail.message
  }));

  return {
    success: false,
    message: 'Errores de validación',
    errors,
    statusCode: 400
  };
};

// Manejo de errores de JSON malformado
const handleJSONError = (error) => {
  return new AppError('JSON malformado en la petición', 400);
};

// Manejo de errores de timeout
const handleTimeoutError = (error) => {
  return new AppError('Tiempo de espera agotado', 408);
};

// Envío de errores en desarrollo
const sendErrorDev = (err, res) => {
  res.status(err.statusCode || 500).json({
    success: false,
    error: err,
    message: err.message,
    stack: err.stack,
    timestamp: new Date().toISOString()
  });
};

// Envío de errores en producción
const sendErrorProd = (err, res) => {
  // Errores operacionales: enviar mensaje al cliente
  if (err.isOperational) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      timestamp: new Date().toISOString()
    });
  } else {
    // Errores de programación: no filtrar detalles al cliente
    console.error('ERROR:', err);
    
    res.status(500).json({
      success: false,
      message: 'Algo salió mal en el servidor',
      timestamp: new Date().toISOString()
    });
  }
};

// Middleware principal de manejo de errores
const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else {
    let error = { ...err };
    error.message = err.message;

    // Manejo específico de diferentes tipos de errores
    if (err.code && err.code.startsWith('ER_')) {
      error = handleDatabaseError(err);
    } else if (err.name === 'ValidationError') {
      return res.status(400).json(handleValidationError(err));
    } else if (err.type === 'entity.parse.failed') {
      error = handleJSONError(err);
    } else if (err.code === 'ETIMEDOUT') {
      error = handleTimeoutError(err);
    }

    sendErrorProd(error, res);
  }
};

// Middleware para capturar errores asíncronos
const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

// Middleware para rutas no encontradas
const notFound = (req, res, next) => {
  const err = new AppError(`No se encontró la ruta ${req.originalUrl}`, 404);
  next(err);
};

// Middleware de logging de errores
const logError = (err, req, res, next) => {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.originalUrl;
  const ip = req.ip || req.connection.remoteAddress;
  
  console.error(`[${timestamp}] ${method} ${url} - IP: ${ip}`);
  console.error(`Error: ${err.message}`);
  
  if (process.env.NODE_ENV === 'development') {
    console.error(`Stack: ${err.stack}`);
  }
  
  next(err);
};

// Middleware para validar que el contenido sea JSON
const validateJSON = (err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      message: 'JSON inválido en el cuerpo de la petición',
      timestamp: new Date().toISOString()
    });
  }
  next(err);
};

module.exports = {
  AppError,
  globalErrorHandler,
  catchAsync,
  notFound,
  logError,
  validateJSON,
  handleDatabaseError,
  handleValidationError
};