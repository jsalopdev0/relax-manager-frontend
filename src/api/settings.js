// src/api/settings.js
import axiosInstance from "./axiosInstance";

// GET actual (si no existe, el back lo inicializa)
export const getSettings = () => {
  return axiosInstance.get("/settings");
};

// PUT actualizar por id
// payload: { sueldoMinimoMensual: number, recargoTarjetaPct: number }  // fracción: 0.045 = 4.5%
export const updateSettings = (id, data) => {
  return axiosInstance.put(`/settings/${id}`, data);
};
