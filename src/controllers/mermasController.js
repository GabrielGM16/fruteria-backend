const { mermasQueries } = require('../models/queries');

// Obtener todas las mermas
const getMermas = async (req, res) => {
  try {
    const mermas = await mermasQueries.getAll();
    res.json({
      success: true,
      data: mermas
    });
  } catch (error) {
    console.error('Error al obtener mermas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Obtener merma por ID
const getMermaById = async (req, res) => {
  try {
    const { id } = req.params;
    const merma = await mermasQueries.getById(id);
    
    if (!merma) {
      return res.status(404).json({
        success: false,
        message: 'Merma no encontrada'
      });
    }

    res.json({
      success: true,
      data: merma
    });
  } catch (error) {
    console.error('Error al obtener merma:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Crear nueva merma
const createMerma = async (req, res) => {
  try {
    const { producto_id, cantidad, motivo, descripcion } = req.body;

    // Validaciones básicas
    if (!producto_id || !cantidad || !motivo) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos obligatorios: producto_id, cantidad, motivo'
      });
    }

    if (cantidad <= 0) {
      return res.status(400).json({
        success: false,
        message: 'La cantidad debe ser mayor a 0'
      });
    }

    // Validar motivo
    const motivosValidos = ['vencimiento', 'daño', 'robo', 'otro'];
    if (!motivosValidos.includes(motivo)) {
      return res.status(400).json({
        success: false,
        message: 'Motivo inválido. Debe ser: vencimiento, daño, robo u otro'
      });
    }

    const mermaId = await mermasQueries.create({
      producto_id: parseInt(producto_id),
      cantidad: parseFloat(cantidad),
      motivo,
      descripcion: descripcion || null
    });

    const nuevaMerma = await mermasQueries.getById(mermaId);

    res.status(201).json({
      success: true,
      message: 'Merma registrada exitosamente',
      data: nuevaMerma
    });
  } catch (error) {
    console.error('Error al crear merma:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Actualizar merma
const updateMerma = async (req, res) => {
  try {
    const { id } = req.params;
    const { producto_id, cantidad, motivo, descripcion } = req.body;

    // Verificar que la merma existe
    const mermaExistente = await mermasQueries.getById(id);
    if (!mermaExistente) {
      return res.status(404).json({
        success: false,
        message: 'Merma no encontrada'
      });
    }

    // Validaciones básicas
    if (cantidad && cantidad <= 0) {
      return res.status(400).json({
        success: false,
        message: 'La cantidad debe ser mayor a 0'
      });
    }

    if (motivo) {
      const motivosValidos = ['vencimiento', 'daño', 'robo', 'otro'];
      if (!motivosValidos.includes(motivo)) {
        return res.status(400).json({
          success: false,
          message: 'Motivo inválido. Debe ser: vencimiento, daño, robo u otro'
        });
      }
    }

    const actualizado = await mermasQueries.update(id, {
      producto_id: producto_id ? parseInt(producto_id) : mermaExistente.producto_id,
      cantidad: cantidad ? parseFloat(cantidad) : mermaExistente.cantidad,
      motivo: motivo || mermaExistente.motivo,
      descripcion: descripcion !== undefined ? descripcion : mermaExistente.descripcion
    });

    if (!actualizado) {
      return res.status(400).json({
        success: false,
        message: 'No se pudo actualizar la merma'
      });
    }

    const mermaActualizada = await mermasQueries.getById(id);

    res.json({
      success: true,
      message: 'Merma actualizada exitosamente',
      data: mermaActualizada
    });
  } catch (error) {
    console.error('Error al actualizar merma:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Eliminar merma
const deleteMerma = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que la merma existe
    const mermaExistente = await mermasQueries.getById(id);
    if (!mermaExistente) {
      return res.status(404).json({
        success: false,
        message: 'Merma no encontrada'
      });
    }

    const eliminado = await mermasQueries.delete(id);

    if (!eliminado) {
      return res.status(400).json({
        success: false,
        message: 'No se pudo eliminar la merma'
      });
    }

    res.json({
      success: true,
      message: 'Merma eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar merma:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Obtener reportes de mermas
const getReportes = async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin } = req.query;
    
    const filtros = {};
    if (fecha_inicio) filtros.fecha_inicio = fecha_inicio;
    if (fecha_fin) filtros.fecha_fin = fecha_fin;

    const reportes = await mermasQueries.getReportes(filtros);
    
    // Calcular totales
    const totales = {
      total_casos: reportes.reduce((sum, reporte) => sum + parseInt(reporte.total_casos), 0),
      total_cantidad: reportes.reduce((sum, reporte) => sum + parseFloat(reporte.total_cantidad), 0),
      valor_perdido: reportes.reduce((sum, reporte) => sum + parseFloat(reporte.valor_perdido), 0)
    };

    res.json({
      success: true,
      data: reportes,
      totales,
      filtros
    });
  } catch (error) {
    console.error('Error al obtener reportes:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

module.exports = {
  getMermas,
  getMermaById,
  createMerma,
  updateMerma,
  deleteMerma,
  getReportes
};