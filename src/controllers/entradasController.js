const { entradasQueries } = require('../models/queries');

// Obtener todas las entradas
const getEntradas = async (req, res) => {
  try {
    const entradas = await entradasQueries.getAll();
    res.json({
      success: true,
      data: entradas
    });
  } catch (error) {
    console.error('Error al obtener entradas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Obtener entrada por ID
const getEntradaById = async (req, res) => {
  try {
    const { id } = req.params;
    const entrada = await entradasQueries.getById(id);
    
    if (!entrada) {
      return res.status(404).json({
        success: false,
        message: 'Entrada no encontrada'
      });
    }

    res.json({
      success: true,
      data: entrada
    });
  } catch (error) {
    console.error('Error al obtener entrada:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Crear nueva entrada
const createEntrada = async (req, res) => {
  try {
    const { producto_id, cantidad, precio_compra, proveedor, nota } = req.body;

    // Validaciones básicas
    if (!producto_id || !cantidad || !precio_compra) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos obligatorios: producto_id, cantidad, precio_compra'
      });
    }

    if (cantidad <= 0) {
      return res.status(400).json({
        success: false,
        message: 'La cantidad debe ser mayor a 0'
      });
    }

    if (precio_compra < 0) {
      return res.status(400).json({
        success: false,
        message: 'El precio de compra no puede ser negativo'
      });
    }

    const entradaId = await entradasQueries.create({
      producto_id: parseInt(producto_id),
      cantidad: parseFloat(cantidad),
      precio_compra: parseFloat(precio_compra),
      proveedor: proveedor || null,
      nota: nota || null
    });

    const nuevaEntrada = await entradasQueries.getById(entradaId);

    res.status(201).json({
      success: true,
      message: 'Entrada registrada exitosamente',
      data: nuevaEntrada
    });
  } catch (error) {
    console.error('Error al crear entrada:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Actualizar entrada
const updateEntrada = async (req, res) => {
  try {
    const { id } = req.params;
    const { producto_id, cantidad, precio_compra, proveedor, nota } = req.body;

    // Verificar que la entrada existe
    const entradaExistente = await entradasQueries.getById(id);
    if (!entradaExistente) {
      return res.status(404).json({
        success: false,
        message: 'Entrada no encontrada'
      });
    }

    // Validaciones básicas
    if (cantidad && cantidad <= 0) {
      return res.status(400).json({
        success: false,
        message: 'La cantidad debe ser mayor a 0'
      });
    }

    if (precio_compra && precio_compra < 0) {
      return res.status(400).json({
        success: false,
        message: 'El precio de compra no puede ser negativo'
      });
    }

    const actualizado = await entradasQueries.update(id, {
      producto_id: producto_id ? parseInt(producto_id) : entradaExistente.producto_id,
      cantidad: cantidad ? parseFloat(cantidad) : entradaExistente.cantidad,
      precio_compra: precio_compra ? parseFloat(precio_compra) : entradaExistente.precio_compra,
      proveedor: proveedor !== undefined ? proveedor : entradaExistente.proveedor,
      nota: nota !== undefined ? nota : entradaExistente.nota
    });

    if (!actualizado) {
      return res.status(400).json({
        success: false,
        message: 'No se pudo actualizar la entrada'
      });
    }

    const entradaActualizada = await entradasQueries.getById(id);

    res.json({
      success: true,
      message: 'Entrada actualizada exitosamente',
      data: entradaActualizada
    });
  } catch (error) {
    console.error('Error al actualizar entrada:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Eliminar entrada
const deleteEntrada = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que la entrada existe
    const entradaExistente = await entradasQueries.getById(id);
    if (!entradaExistente) {
      return res.status(404).json({
        success: false,
        message: 'Entrada no encontrada'
      });
    }

    const eliminado = await entradasQueries.delete(id);

    if (!eliminado) {
      return res.status(400).json({
        success: false,
        message: 'No se pudo eliminar la entrada'
      });
    }

    res.json({
      success: true,
      message: 'Entrada eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar entrada:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Obtener lista de proveedores únicos
const getProveedores = async (req, res) => {
  try {
    const proveedores = await entradasQueries.getProveedores();
    res.json({
      success: true,
      data: proveedores
    });
  } catch (error) {
    console.error('Error al obtener proveedores:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

module.exports = {
  getEntradas,
  getEntradaById,
  createEntrada,
  updateEntrada,
  deleteEntrada,
  getProveedores
};