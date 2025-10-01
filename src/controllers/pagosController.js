// Simulador de procesamiento de pagos con tarjeta
// En un entorno real, aquí se integraría con un procesador de pagos como Stripe, PayPal, etc.

// Procesar pago con tarjeta
const procesarPagoTarjeta = async (req, res) => {
  try {
    const { 
      numero_tarjeta, 
      fecha_expiracion, 
      cvv, 
      nombre_titular, 
      monto, 
      tipo_tarjeta = 'credito' 
    } = req.body;

    // Validaciones básicas
    if (!numero_tarjeta || !fecha_expiracion || !cvv || !nombre_titular || !monto) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos obligatorios: numero_tarjeta, fecha_expiracion, cvv, nombre_titular, monto'
      });
    }

    if (monto <= 0) {
      return res.status(400).json({
        success: false,
        message: 'El monto debe ser mayor a 0'
      });
    }

    // Validar formato de tarjeta (simulado)
    if (numero_tarjeta.length < 13 || numero_tarjeta.length > 19) {
      return res.status(400).json({
        success: false,
        message: 'Número de tarjeta inválido'
      });
    }

    // Validar CVV
    if (cvv.length < 3 || cvv.length > 4) {
      return res.status(400).json({
        success: false,
        message: 'CVV inválido'
      });
    }

    // Validar fecha de expiración (formato MM/YY)
    const fechaRegex = /^(0[1-9]|1[0-2])\/\d{2}$/;
    if (!fechaRegex.test(fecha_expiracion)) {
      return res.status(400).json({
        success: false,
        message: 'Fecha de expiración inválida. Formato esperado: MM/YY'
      });
    }

    // Verificar que la tarjeta no esté vencida
    const [mes, año] = fecha_expiracion.split('/');
    const fechaExpiracion = new Date(2000 + parseInt(año), parseInt(mes) - 1);
    const fechaActual = new Date();
    
    if (fechaExpiracion < fechaActual) {
      return res.status(400).json({
        success: false,
        message: 'La tarjeta está vencida'
      });
    }

    // Simular procesamiento del pago
    // En un entorno real, aquí se haría la llamada al procesador de pagos
    const simulacionExitosa = Math.random() > 0.1; // 90% de éxito

    if (!simulacionExitosa) {
      return res.status(400).json({
        success: false,
        message: 'Pago rechazado por el banco. Verifique los datos de la tarjeta.',
        codigo_error: 'PAYMENT_DECLINED'
      });
    }

    // Generar referencia de transacción
    const referencia = `TXN${Date.now()}${Math.floor(Math.random() * 1000)}`;
    
    // Determinar tipo de tarjeta por el número (simulado)
    const primerDigito = numero_tarjeta.charAt(0);
    let marca_tarjeta = 'Desconocida';
    
    if (primerDigito === '4') {
      marca_tarjeta = 'Visa';
    } else if (primerDigito === '5') {
      marca_tarjeta = 'Mastercard';
    } else if (primerDigito === '3') {
      marca_tarjeta = 'American Express';
    }

    // Respuesta exitosa
    const respuestaPago = {
      success: true,
      message: 'Pago procesado exitosamente',
      data: {
        referencia_transaccion: referencia,
        monto: parseFloat(monto),
        moneda: 'MXN',
        marca_tarjeta,
        tipo_tarjeta,
        ultimos_digitos: numero_tarjeta.slice(-4),
        nombre_titular,
        fecha_procesamiento: new Date().toISOString(),
        estado: 'aprobado',
        codigo_autorizacion: `AUTH${Math.floor(Math.random() * 1000000)}`
      }
    };

    res.json(respuestaPago);
  } catch (error) {
    console.error('Error al procesar pago:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al procesar el pago',
      error: error.message
    });
  }
};

// Verificar estado de transacción
const verificarTransaccion = async (req, res) => {
  try {
    const { referencia } = req.params;

    if (!referencia) {
      return res.status(400).json({
        success: false,
        message: 'Referencia de transacción requerida'
      });
    }

    // Simular consulta de transacción
    // En un entorno real, se consultaría la base de datos o el procesador de pagos
    const transaccionExiste = referencia.startsWith('TXN');
    
    if (!transaccionExiste) {
      return res.status(404).json({
        success: false,
        message: 'Transacción no encontrada'
      });
    }

    // Simular datos de la transacción
    const transaccion = {
      referencia_transaccion: referencia,
      estado: 'aprobado',
      monto: 150.00, // Monto simulado
      moneda: 'MXN',
      fecha_procesamiento: new Date().toISOString(),
      marca_tarjeta: 'Visa',
      ultimos_digitos: '1234'
    };

    res.json({
      success: true,
      data: transaccion
    });
  } catch (error) {
    console.error('Error al verificar transacción:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Procesar reembolso (simulado)
const procesarReembolso = async (req, res) => {
  try {
    const { referencia_original, monto_reembolso, motivo } = req.body;

    if (!referencia_original || !monto_reembolso) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos obligatorios: referencia_original, monto_reembolso'
      });
    }

    if (monto_reembolso <= 0) {
      return res.status(400).json({
        success: false,
        message: 'El monto del reembolso debe ser mayor a 0'
      });
    }

    // Simular procesamiento del reembolso
    const reembolsoExitoso = Math.random() > 0.05; // 95% de éxito

    if (!reembolsoExitoso) {
      return res.status(400).json({
        success: false,
        message: 'No se pudo procesar el reembolso. Intente más tarde.',
        codigo_error: 'REFUND_FAILED'
      });
    }

    const referenciaReembolso = `REF${Date.now()}${Math.floor(Math.random() * 1000)}`;

    res.json({
      success: true,
      message: 'Reembolso procesado exitosamente',
      data: {
        referencia_reembolso: referenciaReembolso,
        referencia_original,
        monto_reembolso: parseFloat(monto_reembolso),
        motivo: motivo || 'Reembolso solicitado',
        fecha_procesamiento: new Date().toISOString(),
        estado: 'procesado',
        tiempo_estimado_acreditacion: '3-5 días hábiles'
      }
    });
  } catch (error) {
    console.error('Error al procesar reembolso:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Obtener métodos de pago disponibles
const getMetodosPago = async (req, res) => {
  try {
    const metodos = [
      {
        id: 'efectivo',
        nombre: 'Efectivo',
        descripcion: 'Pago en efectivo',
        activo: true,
        comision: 0
      },
      {
        id: 'tarjeta_credito',
        nombre: 'Tarjeta de Crédito',
        descripcion: 'Visa, Mastercard, American Express',
        activo: true,
        comision: 3.5
      },
      {
        id: 'tarjeta_debito',
        nombre: 'Tarjeta de Débito',
        descripcion: 'Tarjetas de débito bancarias',
        activo: true,
        comision: 2.0
      },
      {
        id: 'transferencia',
        nombre: 'Transferencia Bancaria',
        descripcion: 'Transferencia electrónica',
        activo: true,
        comision: 1.0
      }
    ];

    res.json({
      success: true,
      data: metodos
    });
  } catch (error) {
    console.error('Error al obtener métodos de pago:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

module.exports = {
  procesarPagoTarjeta,
  verificarTransaccion,
  procesarReembolso,
  getMetodosPago
};