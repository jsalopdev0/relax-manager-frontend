// Dashboard.tsx
import { useEffect, useState } from "react";
import { StatCard } from "@/components/StatCard"; 
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast"; 
import { DollarSign, Calendar, TrendingUp, Users, Save, Loader2 } from "lucide-react";
// Asume que useSettings, listarVentas, y obtenerTrabajadores están correctamente importados
import { useSettings } from "@/hooks/useSettings";
import { listarVentas } from "@/api/ventas";
import { obtenerTrabajadores } from "@/api/trabajadores";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

// =================================================================
// 💰 TIPOS Y UTILS
// =================================================================

interface VentaAPI {
  id: number;
  anulada: boolean;
  totalCobrado: number;
  servicioNombre: string;
  montoComision?: number;
}
interface Trabajador {
  id: number;
  activo: boolean;
}
interface TopService {
  name: string;
  sessions: number;
  revenue: string;
}
interface RevenueDataPoint {
  name: string;
  ingresos: number;
}

// Helper para obtener fechas ISO para el rango 'Hoy'
const getTodayRange = () => {
  const today = new Date().toISOString().slice(0, 10);
  return {
    desde: `${today}T00:00:00-05:00`,
    hasta: `${today}T23:59:59-05:00`,
  };
};

// Helper para obtener fechas ISO para el rango 'Ayer'
const getYesterdayRange = () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1); 
  const yesterdayISO = yesterday.toISOString().slice(0, 10);
  return {
    desde: `${yesterdayISO}T00:00:00-05:00`,
    hasta: `${yesterdayISO}T23:59:59-05:00`,
  };
};

// Helper para obtener el rango de fechas del Mes Actual
const getCurrentMonthRange = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth(); 

  const startOfMonth = new Date(year, month, 1);
  const endOfMonth = new Date(year, month + 1, 0); 

  return {
    desde: startOfMonth.toISOString().slice(0, 10) + "T00:00:00-05:00",
    hasta: endOfMonth.toISOString().slice(0, 10) + "T23:59:59-05:00",
  };
};

// Helper necesario para encontrar el lunes anterior o el día actual si es lunes.
const getPreviousMonday = (date: Date) => {
  const day = date.getDay(); // 0 = Domingo, 1 = Lunes
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); 
  const monday = new Date(date.setDate(diff));
  monday.setHours(0, 0, 0, 0); 
  return monday;
};

// Función Helper para encontrar la semana actual (Lunes a Domingo)
const getCurrentWeekRange = () => {
  const today = new Date();
  const startWeek = getPreviousMonday(today);
  const endWeek = new Date(startWeek);
  endWeek.setDate(startWeek.getDate() + 6);

  return {
    desde: startWeek.toISOString().slice(0, 10) + "T00:00:00-05:00", 
    hasta: endWeek.toISOString().slice(0, 10) + "T23:59:59-05:00",
    label: `${startWeek.getDate()} - ${endWeek.getDate()} ${endWeek.toLocaleString(
        "es-PE",
        { month: "short" }
    )}`,
  };
};

// Helper para calcular los ingresos totales de una lista de ventas
const calculateTotalRevenue = (ventas: VentaAPI[]): number => {
  const ventasValidas = ventas.filter(v => !v.anulada);
  return ventasValidas.reduce((sum, v) => sum + v.totalCobrado, 0);
};


// =================================================================
// 🎣 CUSTOM HOOKS DE DATOS DINÁMICOS
// =================================================================

// Hook principal de KPIs diarios y semanales
const useDashboardData = () => {
  const [stats, setStats] = useState({
    ingresosDia: 0,
    terapeutasActivos: 0, 
    serviciosRealizados: 0, 
    serviciosCanceladosHoy: 0, 
    serviciosSemana: 0, 
    serviciosSemanaLabel: "", 
    ingresosTrend: "0.0% vs ayer",
    ingresosTrendUp: true,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const todayRange = getTodayRange();
        const yesterdayRange = getYesterdayRange();
        const currentWeekRange = getCurrentWeekRange();

        // Cargas de datos en paralelo (Optimización)
        const [ventasHoyResponse, ventasAyerResponse, trabajadoresResponse, ventasSemanaResponse] = await Promise.all([
          listarVentas(todayRange), 
          listarVentas(yesterdayRange), 
          obtenerTrabajadores(false), 
          listarVentas({ desde: currentWeekRange.desde, hasta: currentWeekRange.hasta }), 
        ]);

        // --- Procesamiento de Hoy ---
        const ventasDelDia: VentaAPI[] = Array.isArray(ventasHoyResponse) ? ventasHoyResponse : (ventasHoyResponse.data || []);
        const totalIngresosDia = calculateTotalRevenue(ventasDelDia);
        const serviciosRealizados = ventasDelDia.filter(v => !v.anulada).length; 
        const serviciosCanceladosHoy = ventasDelDia.filter(v => v.anulada).length;

        // --- Procesamiento Semanal ---
        const ventasDeLaSemana: VentaAPI[] = Array.isArray(ventasSemanaResponse) ? ventasSemanaResponse : (ventasSemanaResponse.data || []);
        const totalServiciosSemana = ventasDeLaSemana.length; 

        // --- Procesamiento Trend de Ingresos ---
        const ventasDeAyer: VentaAPI[] = Array.isArray(ventasAyerResponse) ? ventasAyerResponse : (ventasAyerResponse.data || []);
        const totalIngresosAyer = calculateTotalRevenue(ventasDeAyer);
        let ingresosTrend = "0.0% vs ayer";
        let ingresosTrendUp = true; 
        
        if (totalIngresosAyer > 0 || totalIngresosDia > 0) {
          if (totalIngresosAyer === 0 && totalIngresosDia > 0) {
            ingresosTrend = "100% (desde S/ 0)";
            ingresosTrendUp = true;
          } else if (totalIngresosAyer > 0) {
            const diferencia = totalIngresosDia - totalIngresosAyer;
            const porcentaje = (diferencia / totalIngresosAyer) * 100;
            ingresosTrend = `${diferencia >= 0 ? "+" : ""}${porcentaje.toFixed(1)}% vs ayer`;
            ingresosTrendUp = diferencia >= 0;
          }
        }
        
        // --- Procesamiento Terapeutas ---
        const trabajadoresActivos: Trabajador[] = Array.isArray(trabajadoresResponse) ? trabajadoresResponse : (trabajadoresResponse.data || []);
        const terapeutasActivosCount = trabajadoresActivos.length;

        setStats(prev => ({
          ...prev,
          ingresosDia: totalIngresosDia,
          terapeutasActivos: terapeutasActivosCount,
          serviciosRealizados: serviciosRealizados, 
          serviciosCanceladosHoy: serviciosCanceladosHoy,
          serviciosSemana: totalServiciosSemana,
          serviciosSemanaLabel: currentWeekRange.label,
          ingresosTrend: ingresosTrend,
          ingresosTrendUp: ingresosTrendUp,
        }));

      } catch (error) {
        console.error("Error al cargar KPIs del dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  return { stats, loading };
};

// Hook para Ingresos Semanales (Mantiene datos estáticos para la gráfica)
const useWeeklyRevenue = (): { revenueData: RevenueDataPoint[], loading: boolean } => {
  const revenueData: RevenueDataPoint[] = [
    { name: "Lun", ingresos: 1200 },
    { name: "Mar", ingresos: 1800 },
    { name: "Mié", ingresos: 1600 },
    { name: "Jue", ingresos: 2200 },
    { name: "Vie", ingresos: 2800 },
    { name: "Sáb", ingresos: 3200 },
    { name: "Dom", ingresos: 2600 },
  ];
  return { revenueData, loading: false }; 
}

// Hook para Top Servicios (Dinámico: Top 5 del Mes)
const useTopServices = (): { topServices: TopService[], loading: boolean } => {
  const [topServicesList, setTopServicesList] = useState<TopService[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadTopServices = async () => {
      setLoading(true);
      try {
        const monthRange = getCurrentMonthRange();
        
        const ventasResponse = await listarVentas({ 
            desde: monthRange.desde, 
            hasta: monthRange.hasta 
        });

        const ventasDelMes: VentaAPI[] = Array.isArray(ventasResponse) ? ventasResponse : (ventasResponse.data || []);
        const ventasValidas = ventasDelMes.filter(v => !v.anulada);

        // Agrupar y sumar por servicio
        const serviceMap = ventasValidas.reduce((acc, venta) => {
            const name = venta.servicioNombre || "Servicio Desconocido";
            if (!acc[name]) { acc[name] = { name, sessions: 0, revenue: 0 }; }
            acc[name].sessions += 1;
            acc[name].revenue += venta.totalCobrado;
            return acc;
        }, {} as Record<string, { name: string, sessions: number, revenue: number }>);

        // Convertir a array, ordenar y formatear
        const dynamicTopServices: TopService[] = Object.values(serviceMap)
            .sort((a, b) => b.sessions - a.sessions) 
            .slice(0, 5) 
            .map(service => ({
                name: service.name,
                sessions: service.sessions,
                revenue: `S/ ${service.revenue.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`,
            }));

        setTopServicesList(dynamicTopServices);
        
      } catch (error) {
        console.error("Error al cargar los servicios más solicitados:", error);
      } finally {
        setLoading(false);
      }
    };

    loadTopServices();
  }, []);

  return { topServices: topServicesList, loading };
};


// =================================================================
// 🖥️ COMPONENTE DASHBOARD
// =================================================================

export default function Dashboard() {
  const { toast } = useToast();

  const { stats, loading: loadingStats } = useDashboardData();
  const { revenueData, loading: loadingRevenue } = useWeeklyRevenue();
  const { topServices, loading: loadingTopServices } = useTopServices();

  const { data: settings, isLoading, isError, update } = useSettings();
  const [open, setOpen] = useState(false);
  const [sueldoLocal, setSueldoLocal] = useState<string>("");
  const [recargoLocalPct, setRecargoLocalPct] = useState<string>("");

  const openEditar = () => {
    if (settings) {
      setSueldoLocal(settings.sueldoMinimoMensual?.toString() ?? "");
      setRecargoLocalPct(((settings.recargoTarjetaPct ?? 0) * 100).toString());
    }
    setOpen(true);
  };

  const handleGuardar = async () => {
    try {
      if (!settings?.id) throw new Error("No hay settings cargados");
      const sueldo = Number(sueldoLocal || 0);
      const recargoPctNumber = Number(recargoLocalPct || 0);

      if (sueldo < 0) throw new Error("El sueldo mínimo no puede ser negativo");
      if (recargoPctNumber < 0 || recargoPctNumber > 100) {
        throw new Error("El recargo debe estar entre 0% y 100%");
      }

      await update({
        id: settings.id,
        payload: {
          sueldoMinimoMensual: sueldo,                    
          recargoTarjetaPct: recargoPctNumber / 100,     
        },
      });

      toast({ title: "Parámetros actualizados", description: "Se aplicaron los nuevos valores." });
      setOpen(false);
    } catch (e: any) {
      toast({ title: "Error al guardar", description: e?.message || "Intenta nuevamente.", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            Resumen general de tu negocio de spa y terapias
          </p>
        </div>

        <Button onClick={openEditar} disabled={isLoading || isError}>
          <Save className="h-4 w-4 mr-2" />
          Editar Parámetros
        </Button>
      </div>
      
      {/* --- STATS GRID DINÁMICO --- */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* 1. INGRESO DEL DÍA */}
        <StatCard
          title="Ingresos del Día"
          value={`S/ ${stats.ingresosDia.toFixed(2)}`}
          icon={DollarSign}
          trend={stats.ingresosTrend} 
          trendUp={stats.ingresosTrendUp} 
          loading={loadingStats}
        />
        
        {/* 2. SERVICIOS REALIZADOS HOY */}
        <StatCard
          title="Servicios Realizados Hoy" 
          value={stats.serviciosRealizados.toString()} 
          icon={Calendar}
          trend={`${stats.serviciosCanceladosHoy} cancelados hoy`} 
          trendUp={false} 
          loading={loadingStats}
        />
        
        {/* 3. TERAPEUTAS ACTIVOS */}
        <StatCard
          title="Terapeutas Activos"
          value={stats.terapeutasActivos.toString()}
          icon={Users}
          trend="12 disponibles ahora"
          trendUp={true}
          loading={loadingStats}
        />
        
        {/* 4. SERVICIOS TOTALES SEMANALES */}
        <StatCard
          title="Servicios Totales (Semana)" 
          value={stats.serviciosSemana.toString()} 
          icon={TrendingUp}
          trend={stats.serviciosSemanaLabel} 
          trendUp={true} 
          loading={loadingStats}
        />
      </div>

      {/* --- CHARTS SECTION --- */}
      <div className="grid gap-6 lg:grid-cols-7">
        {/* Revenue Chart */}
        <Card className="lg:col-span-4 border-border/50">
          <CardHeader>
            <CardTitle className="text-foreground">Ingresos de la Semana</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingRevenue ? (
              <div className="flex justify-center items-center h-[300px]">
                <Loader2 className="h-6 w-6 animate-spin mr-2 text-primary" /> <span className="text-muted-foreground">Cargando gráfico...</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `S/ ${v}`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    formatter={(v: any) => [`S/ ${v}`, "Ingresos"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="ingresos"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorIngresos)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* 5. Top Services (Dinámico del Mes) */}
        <Card className="lg:col-span-3 border-border/50">
          <CardHeader>
            <CardTitle className="text-foreground">Servicios Más Solicitados del Mes</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingTopServices ? (
              <div className="flex justify-center items-center h-[180px] text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2 text-primary" /> Cargando servicios del mes...
              </div>
            ) : (
              <div className="space-y-4">
                {topServices.length > 0 ? (
                    topServices.map((service, index) => (
                      <div
                        key={service.name}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{service.name}</p>
                            <p className="text-sm text-muted-foreground">{service.sessions} sesiones</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-primary">{service.revenue}</p>
                        </div>
                      </div>
                    ))
                ) : (
                    <div className="text-center py-6 text-muted-foreground">
                        No hay ventas de servicios registradas este mes.
                    </div>
                )}
              </div>
            )}

            {/* Mini-panel de parámetros actuales */}
            <div className="mt-6 rounded-lg border p-3 text-sm">
              <p className="font-semibold mb-2">Parámetros del sistema</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="text-muted-foreground">Sueldo mínimo</div>
                <div className="text-right">
                  {isLoading ? "Cargando..." : `S/ ${Number(settings?.sueldoMinimoMensual ?? 0).toFixed(2)}`}
                </div>
                <div className="text-muted-foreground">Recargo tarjeta</div>
                <div className="text-right">
                  {isLoading ? "Cargando..." : `${((settings?.recargoTarjetaPct ?? 0) * 100).toFixed(2)}%`}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal Editar Parámetros */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Editar Parámetros Globales</DialogTitle>
            <DialogDescription>
              Estos valores impactan en el cálculo de ventas (p. ej. recargo por tarjeta).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sueldo">Sueldo mínimo mensual (S/)</Label>
              <Input
                id="sueldo"
                type="number"
                step="0.01"
                min="0"
                value={sueldoLocal}
                onChange={(e) => setSueldoLocal(e.target.value)}
                placeholder="Ej: 1130.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="recargo">Recargo por tarjeta (%)</Label>
              <Input
                id="recargo"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={recargoLocalPct}
                onChange={(e) => setRecargoLocalPct(e.target.value)}
                placeholder="Ej: 4.50"
              />
              <p className="text-xs text-muted-foreground">
                Se guarda el valor decimal (ej. 4.5% → 0.045).
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={handleGuardar} disabled={isLoading}>
                <Save className="h-4 w-4 mr-2" />
                Guardar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}