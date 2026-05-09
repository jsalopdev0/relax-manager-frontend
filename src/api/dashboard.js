// src/api/dashboard.js
import axiosInstance from './axiosInstance';
import { listarVentas } from './ventas';      
import { obtenerTrabajadores } from './trabajadores'; 

// --- Funciones de Reporte (Simulan la existencia de endpoints optimizados en el backend) ---
// Estos endpoints son NECESARIOS para las gráficas y rankings

const obtenerIngresosSemanaAPI = async () => {
    // 💡 Backend real debería implementar este endpoint para la agrupación
    try {
        const response = await axiosInstance.get('/reportes/ingresos-semanales');
        return response.data;
    } catch (e) {
        // Fallback (Mock Data) si el endpoint aún no está implementado
        return [
            { name: "Lun", ingresos: 1200 },
            { name: "Mar", ingresos: 1800 },
            { name: "Mié", ingresos: 1600 },
            { name: "Jue", ingresos: 2200 },
            { name: "Vie", ingresos: 2800 },
            { name: "Sáb", ingresos: 3200 },
            { name: "Dom", ingresos: 2600 },
        ];
    }
};

const obtenerServiciosTopAPI = async () => {
    // 💡 Backend real debería implementar este endpoint para el ranking
    try {
        const response = await axiosInstance.get('/reportes/servicios-top', { params: { limit: 4 } });
        return response.data;
    } catch (e) {
        // Fallback (Mock Data) si el endpoint aún no está implementado
        return [
            { name: "Masaje Relajante", sessions: 45, revenue: 2250 },
            { name: "Aromaterapia", sessions: 32, revenue: 1920 },
            { name: "Masaje Deportivo", sessions: 28, revenue: 1680 },
            { name: "Reflexología", sessions: 24, revenue: 1440 },
        ];
    }
};

// --- Función Principal del Dashboard (Usa tus APIs y los reportes) ---
export const obtenerDatosDashboard = async () => {
  try {
    // 1. Peticiones concurrentes para eficiencia
    const [
        ventasResponse, 
        trabajadoresResponse,
        ingresosSemana,
        serviciosTop,
    ] = await Promise.all([
        // Usa tu listarVentas para obtener datos del día (asumo que se puede filtrar por fecha)
        listarVentas({ fechaDesde: new Date().toISOString().split('T')[0] }), 
        // Usa tu obtenerTrabajadores para activos
        obtenerTrabajadores(false), 
        obtenerIngresosSemanaAPI(),
        obtenerServiciosTopAPI(),
    ]);

    const ventasHoy = ventasResponse.data || [];
    const trabajadoresActivos = trabajadoresResponse.data || [];

    // 2. Procesamiento de Métricas de Tarjetas (Calculado en el frontend con los datos de hoy)
    let ingresosDia = 0;
    let ventasCanceladas = 0;
    let serviciosRealizados = 0;

    ventasHoy.forEach(venta => {
        // Asegúrate de que tu objeto venta tenga 'anulada' y 'totalCobrado'
        if (venta.anulada) {
            ventasCanceladas += 1;
        } else {
            ingresosDia += venta.totalCobrado || 0;
            serviciosRealizados += 1;
        }
    });
    
    const terapeutasActivosCount = trabajadoresActivos.length;

    // 3. Retorno de datos consolidados
    return {
      ingresosDia: ingresosDia,
      ventasCanceladas: ventasCanceladas,
      terapeutasActivos: terapeutasActivosCount,
      serviciosRealizados: serviciosRealizados,
      ingresosSemana: ingresosSemana,
      serviciosTop: serviciosTop,
    };

  } catch (error) {
    console.error('Error al obtener datos consolidados del dashboard:', error);
    // Relanzamos el error para que el componente Dashboard lo maneje
    throw new Error('Fallo la conexión con la API o el procesamiento de datos.');
  }
};