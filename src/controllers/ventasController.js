// src/controllers/ventasController.js
const { ventasQueries } = require('../models/queries');

// Obtener todas las ventas
const getVentas = async (req, res) => {
  try {
    const ventas = await ventasQueries.getAll();
    res.json({
      success: true,
      data: ventas,
      count: ventas.length
    });
  } catch (error) {
    console.error('Error al obtener ventas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Obtener venta por ID con detalles
const getVentaById = async (req, res) => {
  try {
    const { id } = req.params;
    const venta = await ventasQueries.getById(id);
    
    if (!venta) {
      return res.status(404).json({
        success: false,
        message: 'Venta no encontrada'
      });
    }

    res.json({
      success: true,
      data: venta
    });
  } catch (error) {
    console.error('Error al obtener venta:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Crear nueva venta
const createVenta = async (req, res) => {
  try {
    const { 
      cliente_nombre,
      cliente_telefono,
      cliente_email,
      total, 
      metodo_pago, 
      referencia_pago, 
      detalles 
    } = req.body;

    // Validaciones básicas
    if (!total || !metodo_pago || !detalles || !Array.isArray(detalles) || detalles.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos obligatorios: total, metodo_pago, detalles (array no vacío)'
      });
    }

    if (total <= 0) {
      return res.status(400).json({
        success: false,
        message: 'El total debe ser mayor a 0'
      });
    }

    // Validar método de pago
    const metodosValidos = ['efectivo', 'tarjeta', 'transferencia'];
    if (!metodosValidos.includes(metodo_pago)) {
      return res.status(400).json({
        success: false,
        message: 'Método de pago inválido. Debe ser: efectivo, tarjeta o transferencia'
      });
    }

    // Validar detalles
    for (const detalle of detalles) {
      if (!detalle.producto_id || !detalle.cantidad || !detalle.precio_unitario || !detalle.subtotal) {
        return res.status(400).json({
          success: false,
          message: 'Cada detalle debe tener: producto_id, cantidad, precio_unitario, subtotal'
        });
      }

      if (detalle.cantidad <= 0 || detalle.precio_unitario <= 0 || detalle.subtotal <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Los valores de cantidad, precio_unitario y subtotal deben ser mayores a 0'
        });
      }
    }

    const ventaId = await ventasQueries.create({
      cliente_nombre: cliente_nombre || 'Cliente General',
      cliente_telefono: cliente_telefono || null,
      cliente_email: cliente_email || null,
      total: parseFloat(total),
      metodo_pago,
      referencia_pago: referencia_pago || null,
      detalles: detalles.map(detalle => ({
        producto_id: parseInt(detalle.producto_id),
        cantidad: parseFloat(detalle.cantidad),
        precio_unitario: parseFloat(detalle.precio_unitario),
        subtotal: parseFloat(detalle.subtotal)
      }))
    });

    const nuevaVenta = await ventasQueries.getById(ventaId);

    res.status(201).json({
      success: true,
      message: 'Venta registrada exitosamente',
      data: nuevaVenta
    });
  } catch (error) {
    console.error('Error al crear venta:', error);
    
    // Errores específicos de stock
    if (error.message.includes('Stock insuficiente')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Obtener historial de ventas con filtros
const getHistorial = async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin, metodo_pago, cliente, limit } = req.query;
    
    const filtros = {};
    if (fecha_inicio) filtros.fecha_inicio = fecha_inicio;
    if (fecha_fin) filtros.fecha_fin = fecha_fin;
    if (metodo_pago) filtros.metodo_pago = metodo_pago;
    if (cliente) filtros.cliente = cliente;
    if (limit) filtros.limit = limit;

    const historial = await ventasQueries.getHistorial(filtros);
    
    res.json({
      success: true,
      data: historial,
      count: historial.length,
      filtros: filtros
    });
  } catch (error) {
    console.error('Error al obtener historial:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Obtener resumen de ventas del día
const getResumenDia = async (req, res) => {
  try {
    const hoy = new Date().toISOString().split('T')[0];
    const ventasHoy = await ventasQueries.getHistorial({ 
      fecha_inicio: hoy, 
      fecha_fin: hoy 
    });

    // Agrupar por método de pago
    const porMetodoPago = ventasHoy.reduce((acc, venta) => {
      const metodo = venta.metodo_pago;
      if (!acc[metodo]) {
        acc[metodo] = { cantidad: 0, monto: 0 };
      }
      acc[metodo].cantidad++;
      acc[metodo].monto += parseFloat(venta.total);
      return acc;
    }, {});

    const resumen = {
      fecha: hoy,
      total_ventas: ventasHoy.length,
      total_ingresos: ventasHoy.reduce((sum, venta) => sum + parseFloat(venta.total), 0),
      total_productos: ventasHoy.reduce((sum, venta) => sum + parseInt(venta.total_productos || 0), 0),
      promedio_venta: ventasHoy.length > 0 ? 
        ventasHoy.reduce((sum, venta) => sum + parseFloat(venta.total), 0) / ventasHoy.length : 0,
      por_metodo_pago: porMetodoPago,
      venta_minima: ventasHoy.length > 0 ? Math.min(...ventasHoy.map(v => parseFloat(v.total))) : 0,
      venta_maxima: ventasHoy.length > 0 ? Math.max(...ventasHoy.map(v => parseFloat(v.total))) : 0
    };

    res.json({
      success: true,
      data: resumen
    });
  } catch (error) {
    console.error('Error al obtener resumen del día:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Anular venta
const anularVenta = async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo } = req.body;

    if (!motivo) {
      return res.status(400).json({
        success: false,
        message: 'El motivo de anulación es requerido'
      });
    }

    // Verificar que la venta existe
    const venta = await ventasQueries.getById(id);
    if (!venta) {
      return res.status(404).json({
        success: false,
        message: 'Venta no encontrada'
      });
    }

    if (venta.estado === 'anulada') {
      return res.status(400).json({
        success: false,
        message: 'La venta ya está anulada'
      });
    }

    await ventasQueries.anular(id, motivo);

    res.json({
      success: true,
      message: 'Venta anulada exitosamente'
    });
  } catch (error) {
    console.error('Error al anular venta:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

module.exports = {
  getVentas,
  getVentaById,
  createVenta,
  getHistorial,
  getResumenDia,
  anularVenta
};