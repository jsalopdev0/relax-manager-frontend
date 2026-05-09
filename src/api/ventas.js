import axiosInstance from './axiosInstance';

// Crear una nueva venta
export const crearVenta = async (data) => {
  const response = await axiosInstance.post('/ventas', data);
  return response.data; // devolvemos directamente los datos
};

// Obtener una venta por su ID
export const obtenerVenta = async (id) => {
  const response = await axiosInstance.get(`/ventas/${id}`);
  return response.data;
};

// Listar ventas con filtros opcionales (por fecha, trabajador, medio de pago, etc.)
export const listarVentas = async (params = {}) => {
  const response = await axiosInstance.get('/ventas', { params });
  return response.data;
};

// Anular una venta por ID con motivo
export const anularVenta = async (id, motivo) => {
  const response = await axiosInstance.patch(`/ventas/${id}/anular`, null, { params: { motivo } });
  return response.data;
};

// Función práctica para crear venta desde el frontend
export const handleCrearVenta = async (ventaData) => {
  try {
    const nuevaVenta = await crearVenta(ventaData);

    console.log('✅ Venta creada exitosamente:');
    console.table({
      ID: nuevaVenta.id,
      Código: nuevaVenta.codigo, // ← 👈 Muestra el nuevo campo
      Servicio: nuevaVenta.servicioNombre,
      Trabajador: nuevaVenta.trabajadorNombre,
      Total: nuevaVenta.totalCobrado,
      Fecha: nuevaVenta.fechaHora,
    });

    return nuevaVenta;
  } catch (error) {
    if (error.response) {
      console.error('❌ Error al crear la venta:', error.response.data);
    } else {
      console.error('❌ Error de conexión:', error.message);
    }
    throw error;
  }
};
