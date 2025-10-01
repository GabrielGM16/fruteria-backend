const { productosQueries } = require('../models/queries');

// Obtener todos los productos
const getProductos = async (req, res) => {
  try {
    const productos = await productosQueries.getAll();
    res.json({
      success: true,
      data: productos
    });
  } catch (error) {
    console.error('Error al obtener productos:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Obtener producto por ID
const getProductoById = async (req, res) => {
  try {
    const { id } = req.params;
    const producto = await productosQueries.getById(id);
    
    if (!producto) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }

    res.json({
      success: true,
      data: producto
    });
  } catch (error) {
    console.error('Error al obtener producto:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Crear nuevo producto
const createProducto = async (req, res) => {
  try {
    const { nombre, categoria, unidad_medida, precio_compra, precio_venta, stock_actual, stock_minimo, imagen_url } = req.body;

    // Validaciones básicas
    if (!nombre || !categoria || !unidad_medida || !precio_compra || !precio_venta) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos obligatorios: nombre, categoria, unidad_medida, precio_compra, precio_venta'
      });
    }

    if (precio_compra < 0 || precio_venta < 0) {
      return res.status(400).json({
        success: false,
        message: 'Los precios no pueden ser negativos'
      });
    }

    const productoId = await productosQueries.create({
      nombre,
      categoria,
      unidad_medida,
      precio_compra: parseFloat(precio_compra),
      precio_venta: parseFloat(precio_venta),
      stock_actual: parseInt(stock_actual) || 0,
      stock_minimo: parseInt(stock_minimo) || 5,
      imagen_url
    });

    const nuevoProducto = await productosQueries.getById(productoId);

    res.status(201).json({
      success: true,
      message: 'Producto creado exitosamente',
      data: nuevoProducto
    });
  } catch (error) {
    console.error('Error al crear producto:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Actualizar producto
const updateProducto = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, categoria, unidad_medida, precio_compra, precio_venta, stock_actual, stock_minimo, imagen_url } = req.body;

    // Verificar que el producto existe
    const productoExistente = await productosQueries.getById(id);
    if (!productoExistente) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }

    // Validaciones básicas
    if (precio_compra && precio_compra < 0) {
      return res.status(400).json({
        success: false,
        message: 'El precio de compra no puede ser negativo'
      });
    }

    if (precio_venta && precio_venta < 0) {
      return res.status(400).json({
        success: false,
        message: 'El precio de venta no puede ser negativo'
      });
    }

    const actualizado = await productosQueries.update(id, {
      nombre: nombre || productoExistente.nombre,
      categoria: categoria || productoExistente.categoria,
      unidad_medida: unidad_medida || productoExistente.unidad_medida,
      precio_compra: precio_compra ? parseFloat(precio_compra) : productoExistente.precio_compra,
      precio_venta: precio_venta ? parseFloat(precio_venta) : productoExistente.precio_venta,
      stock_actual: stock_actual !== undefined ? parseInt(stock_actual) : productoExistente.stock_actual,
      stock_minimo: stock_minimo !== undefined ? parseInt(stock_minimo) : productoExistente.stock_minimo,
      imagen_url: imagen_url !== undefined ? imagen_url : productoExistente.imagen_url
    });

    if (!actualizado) {
      return res.status(400).json({
        success: false,
        message: 'No se pudo actualizar el producto'
      });
    }

    const productoActualizado = await productosQueries.getById(id);

    res.json({
      success: true,
      message: 'Producto actualizado exitosamente',
      data: productoActualizado
    });
  } catch (error) {
    console.error('Error al actualizar producto:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Eliminar producto (soft delete)
const deleteProducto = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que el producto existe
    const productoExistente = await productosQueries.getById(id);
    if (!productoExistente) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }

    const eliminado = await productosQueries.delete(id);

    if (!eliminado) {
      return res.status(400).json({
        success: false,
        message: 'No se pudo eliminar el producto'
      });
    }

    res.json({
      success: true,
      message: 'Producto eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar producto:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Actualizar stock de producto
const updateStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { stock } = req.body;

    if (stock === undefined || stock < 0) {
      return res.status(400).json({
        success: false,
        message: 'El stock debe ser un número mayor o igual a 0'
      });
    }

    // Verificar que el producto existe
    const productoExistente = await productosQueries.getById(id);
    if (!productoExistente) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }

    const actualizado = await productosQueries.updateStock(id, parseInt(stock));

    if (!actualizado) {
      return res.status(400).json({
        success: false,
        message: 'No se pudo actualizar el stock'
      });
    }

    const productoActualizado = await productosQueries.getById(id);

    res.json({
      success: true,
      message: 'Stock actualizado exitosamente',
      data: productoActualizado
    });
  } catch (error) {
    console.error('Error al actualizar stock:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Obtener alertas de stock bajo
const getAlertas = async (req, res) => {
  try {
    const alertas = await productosQueries.getAlertas();
    res.json({
      success: true,
      data: alertas,
      count: alertas.length
    });
  } catch (error) {
    console.error('Error al obtener alertas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

module.exports = {
  getProductos,
  getProductoById,
  createProducto,
  updateProducto,
  deleteProducto,
  updateStock,
  getAlertas
};