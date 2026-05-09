import axiosInstance from './axiosInstance';  // Importamos la instancia de Axios

// Listar trabajadores con el filtro opcional de "activo" o "todos"
export const obtenerTrabajadores = (mostrarTodos = false) => {
  const url = mostrarTodos ? '/trabajadores' : '/trabajadores?activo=true';  // Si mostrarTodos es true, obtenemos todos los trabajadores
  return axiosInstance.get(url);  // Usamos la instancia de Axios para hacer la solicitud GET
};

// Obtener trabajador por ID
export const obtenerTrabajadorPorId = (id) => {
  return axiosInstance.get(`/trabajadores/${id}`);  // Obtener un trabajador específico por su ID
};

// Crear un nuevo trabajador
export const crearTrabajador = (data) => {
  return axiosInstance.post('/trabajadores', data);  // Enviar datos a la API para crear un trabajador
};

// Función para editar un trabajador
export const editarTrabajador = (data) => {
  return axiosInstance.put(`/trabajadores/${data.id}`, data); // Aquí debes pasar el id y los nuevos datos del trabajador
};


// Eliminar trabajador (borrado lógico)
export const eliminarTrabajador = (id) => {
  return axiosInstance.delete(`/trabajadores/${id}`);  // Eliminar un trabajador de la base de datos (borrado lógico)
};
