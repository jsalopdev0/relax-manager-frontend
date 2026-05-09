import axiosInstance from "./axiosInstance";

// Listar servicios
// - obtenerServicios() => solo activos
// - obtenerServicios(true) => todos
export const obtenerServicios = (mostrarTodos = false) => {
  const url = mostrarTodos ? "/servicios" : "/servicios?activo=true";
  return axiosInstance.get(url);
};

// Obtener servicio por ID
export const obtenerServicioPorId = (id) => {
  return axiosInstance.get(`/servicios/${id}`);
};

// Crear un nuevo servicio
export const crearServicio = (data) => {
  return axiosInstance.post("/servicios", data);
};

// Editar servicio
export const editarServicio = (id, data) => {
  return axiosInstance.put(`/servicios/${id}`, data);
};

// Eliminar servicio
export const eliminarServicio = (id) => {
  return axiosInstance.delete(`/servicios/${id}`);
};

// Activar servicio
export const activarServicio = (id) => {
  return axiosInstance.patch(`/servicios/${id}/activar`);
};

// Desactivar servicio
export const desactivarServicio = (id) => {
  return axiosInstance.patch(`/servicios/${id}/desactivar`);
};