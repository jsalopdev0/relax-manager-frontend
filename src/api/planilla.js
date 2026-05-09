import axiosInstance from './axiosInstance';

/**
 * Módulo de servicios para Liquidaciones y Nómina.
 */
const PlanillaService = {

    // ===================================================
    // 💰 Endpoints de Liquidaciones (LiquidacionSemanalController)
    // ===================================================

    /**
     * Genera o actualiza una liquidación semanal para un trabajador.
     * @param {number} trabajadorId ID del trabajador.
     * @param {string} desde Fecha de inicio (ISO format: YYYY-MM-DD).
     * @param {string} hasta Fecha de fin (ISO format: YYYY-MM-DD).
     * @returns {Promise<Object>} LiquidacionSemanalDTO.
     */
    generarLiquidacionSemanal: async (trabajadorId, desde, hasta) => {
        try {
            const response = await axiosInstance.post(
                `/liquidaciones/generar`,
                null,
                {
                    params: { trabajadorId, desde, hasta }
                }
            );
            return response.data;
        } catch (error) {
            console.error("Error al generar liquidación semanal:", error);
            throw error;
        }
    },

    /**
     * Marca una liquidación como pagada.
     */
    pagarLiquidacion: async (id, req) => {
        try {
            const response = await axiosInstance.patch(`/liquidaciones/${id}/pagar`, req);
            return response.data;
        } catch (error) {
            console.error(`Error al pagar liquidación ${id}:`, error);
            throw error;
        }
    },

    /**
     * Obtiene una liquidación por su ID.
     */
    obtenerLiquidacion: async (id) => {
        try {
            const response = await axiosInstance.get(`/liquidaciones/${id}`);
            return response.data;
        } catch (error) {
            console.error(`Error al obtener liquidación ${id}:`, error);
            throw error;
        }
    },
    
    /**
     * ✅ CORREGIDO: Se usa este nombre para coincidir con la llamada en Planilla.tsx.
     */
    obtenerHistorialLiquidaciones: async (trabajadorId) => {
        try {
            const response = await axiosInstance.get(`/liquidaciones/trabajador/${trabajadorId}`);
            return response.data;
        } catch (error) {
            console.error(`Error al obtener historial de liquidaciones para trabajador ${trabajadorId}:`, error);
            throw error;
        }
    },

    /**
     * Obtiene el historial de liquidaciones de un trabajador en un rango de fechas.
     */
    historialLiquidacionesRango: async (trabajadorId, desde, hasta) => {
        try {
            const response = await axiosInstance.get(`/liquidaciones/trabajador/${trabajadorId}/rango`, {
                params: { desde, hasta }
            });
            return response.data;
        } catch (error) {
            console.error(`Error al obtener historial en rango para trabajador ${trabajadorId}:`, error);
            throw error;
        }
    },

    /**
     * Obtiene el resumen mensual de liquidaciones de un trabajador.
     */
    resumenMensualLiquidaciones: async (trabajadorId, anio, mes) => {
        try {
            const response = await axiosInstance.get(`/liquidaciones/resumen-mensual`, {
                params: { trabajadorId, anio, mes }
            });
            return response.data.data;
        } catch (error) {
            console.error(`Error al obtener resumen mensual para trabajador ${trabajadorId}:`, error);
            throw error;
        }
    },


    // =============================================
    // 💵 Endpoints de Nómina (NominaController - Estructura Original)
    // =============================================

    /**
     * ✅ ORIGINAL: Calcula la nómina semanal para todos. Recibe 'desde' y 'hasta' directamente.
     */
    calcularNominaSemanal: async (desde, hasta) => {
        try {
            const response = await axiosInstance.get(`/nomina/semanal`, {
                params: { desde, hasta }
            });
            return response.data;
        } catch (error) {
            console.error("Error al calcular nómina semanal:", error);
            throw error;
        }
    },
    
    /**
     * Calcula la nómina semanal de un trabajador específico.
     */
    calcularNominaSemanalDeTrabajador: async (trabajadorId, desde, hasta) => {
        try {
            const response = await axiosInstance.get(`/nomina/semanal/trabajador/${trabajadorId}`, {
                params: { desde, hasta }
            });
            return response.data;
        } catch (error) {
            console.error(`Error al calcular nómina semanal para trabajador ${trabajadorId}:`, error);
            throw error;
        }
    },
};

export default PlanillaService;