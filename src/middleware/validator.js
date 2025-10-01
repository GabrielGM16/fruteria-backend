const Joi = require('joi');

// Esquemas de validación para productos
const productoSchema = Joi.object({
  nombre: Joi.string().min(2).max(100).required().messages({
    'string.empty': 'El nombre del producto es requerido',
    'string.min': 'El nombre debe tener al menos 2 caracteres',
    'string.max': 'El nombre no puede exceder 100 caracteres'
  }),
  categoria: Joi.string().min(2).max(50).required().messages({
    'string.empty': 'La categoría es requerida',
    'string.min': 'La categoría debe tener al menos 2 caracteres'
  }),
  precio_venta: Joi.number().positive().precision(2).required().messages({
    'number.base': 'El precio de venta debe ser un número',
    'number.positive': 'El precio de venta debe ser positivo'
  }),
  precio_compra: Joi.number().positive().precision(2).required().messages({
    'number.base': 'El precio de compra debe ser un número',
    'number.positive': 'El precio de compra debe ser positivo'
  }),
  stock_actual: Joi.number().integer().min(0).default(0),
  stock_minimo: Joi.number().integer().min(0).default(5),
  unidad_medida: Joi.string().valid('kg', 'pza', 'lt', 'caja').default('pza'),
  descripcion: Joi.string().max(500).allow('').optional()
});

// Esquemas de validación para entradas
const entradaSchema = Joi.object({
  producto_id: Joi.number().integer().positive().required().messages({
    'number.base': 'El ID del producto debe ser un número',
    'number.positive': 'El ID del producto debe ser positivo'
  }),
  cantidad: Joi.number().positive().required().messages({
    'number.base': 'La cantidad debe ser un número',
    'number.positive': 'La cantidad debe ser positiva'
  }),
  precio_compra: Joi.number().positive().precision(2).required().messages({
    'number.base': 'El precio de compra debe ser un número',
    'number.positive': 'El precio de compra debe ser positivo'
  }),
  proveedor: Joi.string().min(2).max(100).required().messages({
    'string.empty': 'El proveedor es requerido',
    'string.min': 'El proveedor debe tener al menos 2 caracteres'
  }),
  fecha_entrada: Joi.date().default(Date.now),
  observaciones: Joi.string().max(500).allow('').optional()
});

// Esquemas de validación para ventas
const ventaSchema = Joi.object({
  total: Joi.number().positive().precision(2).required().messages({
    'number.base': 'El total debe ser un número',
    'number.positive': 'El total debe ser positivo'
  }),
  metodo_pago: Joi.string().valid('efectivo', 'tarjeta_credito', 'tarjeta_debito', 'transferencia').required().messages({
    'any.only': 'Método de pago inválido'
  }),
  detalles: Joi.array().items(
    Joi.object({
      producto_id: Joi.number().integer().positive().required(),
      cantidad: Joi.number().positive().required(),
      precio_unitario: Joi.number().positive().precision(2).required(),
      subtotal: Joi.number().positive().precision(2).required()
    })
  ).min(1).required().messages({
    'array.min': 'Debe incluir al menos un producto en la venta'
  }),
  fecha_venta: Joi.date().default(Date.now)
});

// Esquemas de validación para mermas
const mermaSchema = Joi.object({
  producto_id: Joi.number().integer().positive().required().messages({
    'number.base': 'El ID del producto debe ser un número',
    'number.positive': 'El ID del producto debe ser positivo'
  }),
  cantidad: Joi.number().positive().required().messages({
    'number.base': 'La cantidad debe ser un número',
    'number.positive': 'La cantidad debe ser positiva'
  }),
  motivo: Joi.string().valid('vencimiento', 'daño', 'robo', 'otro').required().messages({
    'any.only': 'Motivo de merma inválido'
  }),
  descripcion: Joi.string().max(500).allow('').optional(),
  fecha_merma: Joi.date().default(Date.now)
});

// Esquemas de validación para pagos
const pagoTarjetaSchema = Joi.object({
  numero_tarjeta: Joi.string().creditCard().required().messages({
    'string.creditCard': 'Número de tarjeta inválido'
  }),
  fecha_expiracion: Joi.string().pattern(/^(0[1-9]|1[0-2])\/\d{2}$/).required().messages({
    'string.pattern.base': 'Fecha de expiración inválida. Formato: MM/YY'
  }),
  cvv: Joi.string().pattern(/^\d{3,4}$/).required().messages({
    'string.pattern.base': 'CVV inválido'
  }),
  nombre_titular: Joi.string().min(2).max(100).required().messages({
    'string.empty': 'El nombre del titular es requerido'
  }),
  monto: Joi.number().positive().precision(2).required().messages({
    'number.positive': 'El monto debe ser positivo'
  }),
  tipo_tarjeta: Joi.string().valid('credito', 'debito').default('credito')
});

// Middleware de validación genérico
const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        success: false,
        message: 'Errores de validación',
        errors
      });
    }

    req.body = value;
    next();
  };
};

// Validación de parámetros de ID
const validateId = (req, res, next) => {
  const id = parseInt(req.params.id);
  
  if (isNaN(id) || id <= 0) {
    return res.status(400).json({
      success: false,
      message: 'ID inválido'
    });
  }
  
  req.params.id = id;
  next();
};

// Validación de parámetros de consulta para fechas
const validateDateParams = (req, res, next) => {
  const { fecha_inicio, fecha_fin } = req.query;
  
  if (fecha_inicio && !Date.parse(fecha_inicio)) {
    return res.status(400).json({
      success: false,
      message: 'Fecha de inicio inválida'
    });
  }
  
  if (fecha_fin && !Date.parse(fecha_fin)) {
    return res.status(400).json({
      success: false,
      message: 'Fecha de fin inválida'
    });
  }
  
  if (fecha_inicio && fecha_fin && new Date(fecha_inicio) > new Date(fecha_fin)) {
    return res.status(400).json({
      success: false,
      message: 'La fecha de inicio no puede ser mayor a la fecha de fin'
    });
  }
  
  next();
};

// Validación de stock
const validateStock = (req, res, next) => {
  const { stock } = req.body;
  
  if (stock === undefined || stock === null) {
    return res.status(400).json({
      success: false,
      message: 'El stock es requerido'
    });
  }
  
  if (!Number.isInteger(stock) || stock < 0) {
    return res.status(400).json({
      success: false,
      message: 'El stock debe ser un número entero no negativo'
    });
  }
  
  next();
};

module.exports = {
  validateProducto: validate(productoSchema),
  validateEntrada: validate(entradaSchema),
  validateVenta: validate(ventaSchema),
  validateMerma: validate(mermaSchema),
  validatePagoTarjeta: validate(pagoTarjetaSchema),
  validateId,
  validateDateParams,
  validateStock
};