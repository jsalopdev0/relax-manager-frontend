"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign,
  TrendingUp,
  Calendar,
  Filter,
  Search,
  Loader2,
  Users, // Importar Users para el ícono
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { listarVentas } from "@/api/ventas";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Importamos la lógica de servicio para trabajadores
import { obtenerTrabajadores } from '@/api/trabajadores'; 


// ====================== UTILS ======================
const fmtMoney = (n: number) =>
  (n ?? 0).toLocaleString("es-PE", {
    style: "currency",
    currency: "PEN",
    maximumFractionDigits: 2,
  });

const defaultDesde = () => {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString().slice(0, 10);
};

const defaultHasta = () => new Date().toISOString().slice(0, 10);

const dateToISO = (dateStr: string, isStart: boolean) => {
    return isStart
        ? `${dateStr}T00:00:00-05:00`
        : `${dateStr}T23:59:59-05:00`;
};


// ====================== TIPOS DE DATOS ======================
type MetodoPago = "EFECTIVO" | "TARJETA" | "TRANSFERENCIA" | "YAPE" | "PLIN";

interface TrabajadorOption {
    id: string; 
    nombre: string;
}

interface VentaAPI {
  id: number;
  fechaHora: string;
  anulada: boolean;
  totalCobrado: number;
  servicioNombre: string;
  medioPago: MetodoPago;

  codigo?: string;
  cantidad?: number;
  clienteNombre?: string;
  trabajadorNombre?: string; 
  trabajadorId?: number;     
  montoComision?: number;
}


// 🎣 Custom Hook: Carga dinámica de trabajadores (¡EL REAL!)
const useTrabajadoresDinamico = () => {
    const [trabajadores, setTrabajadores] = useState<TrabajadorOption[]>([]);
    const [loadingTrabajadores, setLoadingTrabajadores] = useState(false);

    useEffect(() => {
        const fetchTrabajadores = async () => {
            setLoadingTrabajadores(true);
            try {
                // LLAMADA REAL A LA API
                const response = await obtenerTrabajadores(); 
                
                // Mapeo crucial: se asume que 'response.data' contiene el array de trabajadores
                const dataMapeada: TrabajadorOption[] = response.data.map((t: any) => ({
                    id: String(t.id), // Convertimos el Long a String para el Select
                    nombre: t.nombreCompleto || t.nombre // Asegúrate de usar la propiedad correcta de tu backend
                }));
                
                setTrabajadores(dataMapeada);
            } catch (error) {
                console.error("Error al cargar la lista de trabajadores:", error);
            } finally {
                setLoadingTrabajadores(false);
            }
        };

        fetchTrabajadores();
    }, []);

    return { trabajadores, loadingTrabajadores };
}


// ========= Componente Principal =========
export default function HistorialComisiones() {
  // 💡 USAMOS el hook DINÁMICO
  const { trabajadores, loadingTrabajadores } = useTrabajadoresDinamico();
  
  // Estados de Filtro
  const [desde, setDesde] = useState<string>(defaultDesde());
  const [hasta, setHasta] = useState<string>(defaultHasta());
  const [selectedTrabajadorId, setSelectedTrabajadorId] = useState<string>("TODOS"); 

  const [ventas, setVentas] = useState<VentaAPI[]>([]);
  const [loading, setLoading] = useState(false);

  // Lógica principal de carga de datos
  const fetchVentas = async () => {
    setLoading(true);
    setVentas([]);
    try {
        const desdeISO = dateToISO(desde, true);
        const hastaISO = dateToISO(hasta, false);
        
        const params: any = { desde: desdeISO, hasta: hastaISO };

        // 💡 CLAVE: listarVentas debe devolver el objeto AxiosResponse o solo el array de ventas.
        const response = await listarVentas(params);
        
        // Manejo de la data. Si listarVentas devuelve solo el array, se usa 'response'. 
        // Si devuelve el objeto AxiosResponse, se usa 'response.data'.
        // Asumimos el patrón Axios:
        let data = Array.isArray(response.data) ? response.data : 
                   Array.isArray(response) ? response : []; 


        // 💡 Filtro en el Frontend: Aquí es donde fallaba si trabajadorId era nulo.
        if (selectedTrabajadorId !== "TODOS") {
            data = data.filter(v => 
                // Aseguramos que el ID exista y que el tipo (Number vs String) no cause conflicto
                v.trabajadorId && String(v.trabajadorId) === selectedTrabajadorId
            );
        }
        
        setVentas(data);

    } catch (error) {
      console.error("Error al cargar el historial de ventas:", error);
      alert("Error al cargar datos. Revise la consola.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Primera carga al montar el componente con las fechas por defecto
    fetchVentas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Solo se ejecuta al montar

  // Ventas Válidas
  const ventasValidas = useMemo(
    () => ventas.filter((v) => !v.anulada && v.trabajadorNombre),
    [ventas]
  );

  // Agregaciones de KPIs
  const totalIngresos = useMemo(
    () => ventasValidas.reduce((s, v) => s + (v.totalCobrado ?? 0), 0),
    [ventasValidas]
  );
  const totalComisiones = useMemo(
    () => ventasValidas.reduce((s, v) => s + (v.montoComision ?? 0), 0),
    [ventasValidas]
  );
  const tasaPromedio = useMemo(
    () => (totalIngresos > 0 ? (totalComisiones / totalIngresos) * 100 : 0),
    [totalIngresos, totalComisiones]
  );


  // Renderizado
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            Historial de Comisiones
          </h1>
          <p className="text-muted-foreground mt-2">
            Detalle de ventas y cálculo de comisiones por rango de fechas.
          </p>
        </div>
      </div>

      <hr className="my-6" />
      
      {/* Controles de Filtro */}
      <Card className="p-4 border-border/50">
        <div className="flex flex-wrap items-end gap-4">
          <Filter className="h-6 w-6 text-muted-foreground mr-2" />

         {/* Filtro de Trabajador */}
          <div className="flex flex-col gap-1">
            <Label htmlFor="trabajador-select" className="text-sm">
              Trabajador
            </Label>
            <Select
              value={selectedTrabajadorId}
              onValueChange={setSelectedTrabajadorId}
              // Comentario movido FUERA de las llaves de la prop 'disabled'
              disabled={loadingTrabajadores} 
            >
              <SelectTrigger id="trabajador-select" className="w-[180px]">
                <SelectValue placeholder="Seleccionar trabajador" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">TODOS</SelectItem>
                {loadingTrabajadores ? (
                     <SelectItem value="cargando" disabled>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin inline" /> Cargando...
                    </SelectItem>
                ) : (
                    trabajadores.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                        {t.nombre}
                    </SelectItem>
                    ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Filtro Desde */}
          <div className="flex flex-col gap-1">
            <Label htmlFor="desde-input" className="text-sm">
              Desde
            </Label>
            <Input
              id="desde-input"
              type="date"
              className="w-[150px]"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
            />
          </div>
          
          {/* Filtro Hasta */}
          <div className="flex flex-col gap-1">
            <Label htmlFor="hasta-input" className="text-sm">
              Hasta
            </Label>
            <Input
              id="hasta-input"
              type="date"
              className="w-[150px]"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
            />
          </div>

          <Button onClick={fetchVentas} disabled={loading || !desde || !hasta}>
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Search className="h-4 w-4 mr-2" />
            )}
            {loading ? "Buscando..." : "Buscar"}
          </Button>
        </div>
      </Card>
      
      <hr className="my-6" />

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Comisiones
            </CardTitle>
            <DollarSign className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {loading ? "..." : fmtMoney(totalComisiones)}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {ventasValidas.length} ventas válidas
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Ingresos
            </CardTitle>
            <Calendar className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">
              {loading ? "..." : fmtMoney(totalIngresos)}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Rango: **{desde}** a **{hasta}**
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tasa Promedio
            </CardTitle>
            <TrendingUp className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">
              {loading ? "..." : tasaPromedio.toFixed(1)}%
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Ponderada por ingresos
            </p>
          </CardContent>
        </Card>
      </div>
      
      <hr className="my-6" />

      {/* Tabla de Detalle de Ventas */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>Detalle de Ventas ({ventas.length} registros)</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="p-4 text-center text-muted-foreground flex justify-center items-center">
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Buscando ventas...
            </div>
          ) : ventas.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              No se encontraron ventas en el rango y/o filtros seleccionados.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID / Código
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Trabajador
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Servicio
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Cobrado
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Comisión
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {ventas.map((v) => (
                    <tr key={v.id} className={v.anulada ? "bg-red-50/50" : ""}>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {v.id} {v.codigo && `(${v.codigo})`}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(v.fechaHora).toLocaleString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {v.trabajadorNombre || "N/A"}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {v.servicioNombre} ({v.cantidad || 1})
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-right font-semibold">
                        {fmtMoney(v.totalCobrado)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-right text-green-600 font-bold">
                        {fmtMoney(v.montoComision || 0)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-center">
                        <Badge variant={v.anulada ? "destructive" : "default"}>
                          {v.anulada ? "ANULADA" : "VÁLIDA"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}