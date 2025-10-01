const { estadisticasQueries } = require('../models/queries');

// Obtener estadísticas de ventas
const getEstadisticasVentas = async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin } = req.query;
    
    const filtros = {};
    if (fecha_inicio) filtros.fecha_inicio = fecha_inicio;
    if (fecha_fin) filtros.fecha_fin = fecha_fin;

    const estadisticas = await estadisticasQueries.getVentas(filtros);
    
    // Calcular totales
    const totales = {
      total_ventas: estadisticas.reduce((sum, stat) => sum + parseInt(stat.total_ventas), 0),
      total_ingresos: estadisticas.reduce((sum, stat) => sum + parseFloat(stat.total_ingresos), 0),
      promedio_general: estadisticas.length > 0 ? 
        estadisticas.reduce((sum, stat) => sum + parseFloat(stat.total_ingresos), 0) / 
        estadisticas.reduce((sum, stat) => sum + parseInt(stat.total_ventas), 0) : 0
    };

    res.json({
      success: true,
      data: estadisticas,
      totales,
      filtros
    });
  } catch (error) {
    console.error('Error al obtener estadísticas de ventas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Obtener estadísticas de productos
const getEstadisticasProductos = async (req, res) => {
  try {
    const estadisticas = await estadisticasQueries.getProductos();
    
    // Agrupar por categorías
    const porCategoria = estadisticas.reduce((acc, producto) => {
      const categoria = producto.categoria;
      if (!acc[categoria]) {
        acc[categoria] = {
          categoria,
          total_productos: 0,
          total_vendido: 0,
          ingresos_generados: 0,
          productos_stock_bajo: 0
        };
      }
      
      acc[categoria].total_productos++;
      acc[categoria].total_vendido += parseInt(producto.total_vendido);
      acc[categoria].ingresos_generados += parseFloat(producto.ingresos_generados);
      if (producto.nivel_stock === 'Bajo') {
        acc[categoria].productos_stock_bajo++;
      }
      
      return acc;
    }, {});

    // Productos más vendidos (top 10)
    const masVendidos = estadisticas
      .sort((a, b) => parseInt(b.total_vendido) - parseInt(a.total_vendido))
      .slice(0, 10);

    // Productos con stock bajo
    const stockBajo = estadisticas.filter(p => p.nivel_stock === 'Bajo');

    res.json({
      success: true,
      data: {
        productos: estadisticas,
        por_categoria: Object.values(porCategoria),
        mas_vendidos: masVendidos,
        stock_bajo: stockBajo
      }
    });
  } catch (error) {
    console.error('Error al obtener estadísticas de productos:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Obtener métricas del dashboard
const getDashboard = async (req, res) => {
  try {
    const dashboard = await estadisticasQueries.getDashboard();
    
    // Agregar métricas adicionales calculadas
    const metricas = {
      ...dashboard,
      // Calcular porcentaje de productos con stock bajo
      porcentaje_stock_bajo: dashboard.totalProductos.total_productos > 0 ? 
        (dashboard.stockBajo.productos_stock_bajo / dashboard.totalProductos.total_productos * 100).toFixed(2) : 0,
      
      // Estado general del inventario
      estado_inventario: dashboard.stockBajo.productos_stock_bajo === 0 ? 'Excelente' :
                        dashboard.stockBajo.productos_stock_bajo <= 5 ? 'Bueno' :
                        dashboard.stockBajo.productos_stock_bajo <= 10 ? 'Regular' : 'Crítico'
    };

    res.json({
      success: true,
      data: metricas
    });
  } catch (error) {
    console.error('Error al obtener métricas del dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Obtener resumen general
const getResumenGeneral = async (req, res) => {
  try {
    const { periodo = '30' } = req.query; // Días por defecto
    
    const fechaInicio = new Date();
    fechaInicio.setDate(fechaInicio.getDate() - parseInt(periodo));
    const fechaInicioStr = fechaInicio.toISOString().split('T')[0];
    
    const fechaFin = new Date().toISOString().split('T')[0];

    // Obtener datos del período
    const [ventasPeriodo, dashboard, estadisticasProductos] = await Promise.all([
      estadisticasQueries.getVentas({ fecha_inicio: fechaInicioStr, fecha_fin: fechaFin }),
      estadisticasQueries.getDashboard(),
      estadisticasQueries.getProductos()
    ]);

    // Calcular tendencias
    const totalVentasPeriodo = ventasPeriodo.reduce((sum, v) => sum + parseInt(v.total_ventas), 0);
    const totalIngresosPeriodo = ventasPeriodo.reduce((sum, v) => sum + parseFloat(v.total_ingresos), 0);
    
    const promedioVentasDiarias = totalVentasPeriodo / parseInt(periodo);
    const promedioIngresosDiarios = totalIngresosPeriodo / parseInt(periodo);

    // Top productos por ingresos
    const topProductos = estadisticasProductos
      .sort((a, b) => parseFloat(b.ingresos_generados) - parseFloat(a.ingresos_generados))
      .slice(0, 5);

    const resumen = {
      periodo: `${periodo} días`,
      fecha_inicio: fechaInicioStr,
      fecha_fin: fechaFin,
      ventas: {
        hoy: dashboard.ventasHoy,
        periodo: {
          total_ventas: totalVentasPeriodo,
          total_ingresos: totalIngresosPeriodo,
          promedio_diario_ventas: promedioVentasDiarias.toFixed(2),
          promedio_diario_ingresos: promedioIngresosDiarios.toFixed(2)
        }
      },
      inventario: {
        total_productos: dashboard.totalProductos.total_productos,
        productos_stock_bajo: dashboard.stockBajo.productos_stock_bajo,
        mermas_mes: dashboard.mermasMes
      },
      top_productos: topProductos
    };

    res.json({
      success: true,
      data: resumen
    });
  } catch (error) {
    console.error('Error al obtener resumen general:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

module.exports = {
  getEstadisticasVentas,
  getEstadisticasProductos,
  getDashboard,
  getResumenGeneral
};