import axiosInstance from './axiosInstance';  // Asegúrate de importar la instancia de Axios

// Listar todas las categorías (puedes filtrar por activas/inactivas)
export const obtenerCategorias = (activo = null) => {
  const url = activo !== null ? `/categorias?activo=${activo}` : '/categorias';
  return axiosInstance.get(url);  // Usamos la instancia de Axios para hacer la solicitud GET
};

// Obtener una categoría específica por ID
export const obtenerCategoriaPorId = (id) => {
  return axiosInstance.get(`/categorias/${id}`);
};

// Crear una nueva categoría
export const crearCategoria = (data) => {
  return axiosInstance.post('/categorias', data);  // Enviar datos para crear una nueva categoría
};

// Actualizar una categoría
export const actualizarCategoria = (id, data) => {
  return axiosInstance.put(`/categorias/${id}`, data);  // Enviar datos para actualizar una categoría existente
};

// Eliminar una categoría (borrado lógico)
export const eliminarCategoria = (id) => {
  return axiosInstance.delete(`/categorias/${id}`);  // Eliminar una categoría (borrado lógico)
};

// Activar una categoría
export const activarCategoria = (id) => {
  return axiosInstance.patch(`/categorias/${id}/activar`);
};

// Desactivar una categoría
export const desactivarCategoria = (id) => {
  return axiosInstance.patch(`/categorias/${id}/desactivar`);
};
