import { useEffect, useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  DollarSign,
  Users,
  Calendar,
  Clock,
  Loader2,
  ArrowRight,
  History,
} from "lucide-react";

// shadcn
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

// Importamos el servicio (ASUMIMOS la ruta correcta)
import PlanillaService from "../api/planilla";

// === HELPERS ===
const fmtMoney = (n: number) =>
  (n ?? 0).toLocaleString("es-PE", {
    style: "currency",
    currency: "PEN",
    maximumFractionDigits: 2,
  });

const formatDate = (dateString: string | null) => {
  if (!dateString) return "N/A";
  try {
    return new Date(dateString).toLocaleDateString("es-PE", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (e) {
    return dateString.slice(0, 10);
  }
};

// ======================================
// === Lógica de Fechas Semanales ===
// ======================================

// Helper para obtener el Lunes anterior o el día actual si ya es Lunes
const getPreviousMonday = (d: Date) => {
  d = new Date(d);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
};

// Genera un listado de semanas (Lunes-Domingo) dentro de un mes/año
const getWeeksInMonth = (year: number, monthIndex0: number) => {
  const weeks = [];
  const startOfMonth = new Date(year, monthIndex0, 1);
  const endOfMonth = new Date(year, monthIndex0 + 1, 0);

  let currentDay = getPreviousMonday(startOfMonth);

  let safetyBreak = 0;

  while (
    currentDay.getTime() <= endOfMonth.getTime() + 7 * 24 * 60 * 60 * 1000 &&
    safetyBreak < 8
  ) {
    const startWeek = new Date(currentDay);
    const endWeek = new Date(currentDay);
    endWeek.setDate(currentDay.getDate() + 6);

    if (
      startWeek.getMonth() === monthIndex0 ||
      endWeek.getMonth() === monthIndex0 ||
      (startWeek.getTime() < startOfMonth.getTime() &&
        endWeek.getTime() > endOfMonth.getTime())
    ) {
      weeks.push({
        label: `${startWeek.getDate()} - ${endWeek.getDate()} ${endWeek.toLocaleString(
          "es-PE",
          { month: "short" }
        )}`,
        desde: startWeek.toISOString().slice(0, 10),
        hasta: endWeek.toISOString().slice(0, 10),
        desdeISO: startWeek.toISOString().slice(0, 10) + "T00:00:00Z",
        hastaISO: endWeek.toISOString().slice(0, 10) + "T23:59:59Z",
      });
    }

    currentDay.setDate(currentDay.getDate() + 7);
    safetyBreak++;

    if (
      safetyBreak > 7 &&
      startWeek.getMonth() !== monthIndex0 &&
      endWeek.getMonth() !== monthIndex0
    ) {
      break;
    }
  }
  return weeks;
};

// Función Helper para encontrar la semana actual al inicio de la carga
const getCurrentWeekRange = () => {
  const today = new Date();
  const startWeek = getPreviousMonday(today);
  const endWeek = new Date(startWeek);
  endWeek.setDate(startWeek.getDate() + 6);

  return {
    year: startWeek.getFullYear(),
    monthIndex0: startWeek.getMonth(),
    week: {
      label: `${startWeek.getDate()} - ${endWeek.getDate()} ${endWeek.toLocaleString(
        "es-PE",
        { month: "short" }
      )}`,
      desde: startWeek.toISOString().slice(0, 10), // YYYY-MM-DD
      hasta: endWeek.toISOString().slice(0, 10), // YYYY-MM-DD
      desdeISO: startWeek.toISOString().slice(0, 10) + "T00:00:00Z",
      hastaISO: endWeek.toISOString().slice(0, 10) + "T23:59:59Z",
    },
  };
};

const INITIAL_WEEK_DATA = getCurrentWeekRange();

// ===================================================

const MONTHS = [
  { value: 0, label: "Enero" },
  { value: 1, label: "Febrero" },
  { value: 2, label: "Marzo" },
  { value: 3, label: "Abril" },
  { value: 4, label: "Mayo" },
  { value: 5, label: "Junio" },
  { value: 6, label: "Julio" },
  { value: 7, label: "Agosto" },
  { value: 8, label: "Septiembre" },
  { value: 9, label: "Octubre" },
  { value: 10, label: "Noviembre" },
  { value: 11, label: "Diciembre" },
];
// Tipos de datos
type MedioPago = "EFECTIVO" | "TARJETA" | "TRANSFERENCIA" | "YAPE" | "PLIN";

interface LiquidacionDTO {
  id: number;
  trabajadorNombre: string;
  desde: string;
  hasta: string;
  
  // Estos son los campos usados en el Modal de Pago
  comisionTotal: number; 
  retencionTotal: number;
  pagoNetoCalculado: number;

  // 1. AÑADIDOS para tipar correctamente la data que llega del backend para Historial
  comisionSemanal?: number;
  retencionSemana?: number;
  pagoSemana?: number;
  
  pagado: boolean;
  fechaPago: string | null;
  medioPago: MedioPago | null;
  montoPagado: number | null;
  observacion: string | null;
}

interface NominaItem {
  trabajadorId: number;
  trabajadorNombre: string;
  sueldoMinimoSemanal: number;
  comisionSemanal: number;
  retencionSemana: number;
  pagoSemana: number;

  liquidacionId: number | null;
  liquidacionEstado: "PENDIENTE" | "PAGADO" | "NO_GENERADA";
  liquidacionMontoPagado: number;
  isLoading: boolean;
}

// ===================================================

export default function Planilla() {
  const [loading, setLoading] = useState(false);
  const [nominaSemanal, setNominaSemanal] = useState<NominaItem[]>([]);

  // Estado para el Modal de Liquidación
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLiquidacion, setSelectedLiquidacion] =
    useState<LiquidacionDTO | null>(null);
  const [isPagarLoading, setIsPagarLoading] = useState(false);

  // Estado para el Modal de Historial
  const [isHistoryModalOpen, setIsHistoryModal] = useState(false);
  // Usamos LiquidacionDTO[] pero sabemos que la data de historial tendrá los campos Semanal
  const [historyData, setHistoryData] = useState<LiquidacionDTO[]>([]); 
  const [selectedTrabajadorHistory, setSelectedTrabajadorHistory] = useState({
    id: 0,
    nombre: "",
  });
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  // **NUEVO ESTADO DE FILTRO**: ID del trabajador seleccionado para ver historial
  const [trabajadorFiltroId, setTrabajadorFiltroId] = useState<number | "all">(
    "all"
  );

  // Controles de Fecha: Inicializados con la SEMANA ACTUAL
  const [currentYear, setCurrentYear] = useState(INITIAL_WEEK_DATA.year);
  const [currentMonthIndex0, setCurrentMonthIndex0] = useState(
    INITIAL_WEEK_DATA.monthIndex0
  );

  // Ajuste inicial (por si la semana actual cae en un mes no listado en MONTHS)
  useEffect(() => {
    if (!MONTHS.some((m) => m.value === currentMonthIndex0)) {
      setCurrentMonthIndex0(MONTHS[0].value);
    }
  }, []);

  // Calcular semanas disponibles para el mes/año actual
  const availableWeeks = useMemo(() => {
    return getWeeksInMonth(currentYear, currentMonthIndex0);
  }, [currentYear, currentMonthIndex0]);

  // Estado para la semana seleccionada
  const [selectedWeek, setSelectedWeek] = useState<any>(INITIAL_WEEK_DATA.week);

  // Manejar cambio de mes
  useEffect(() => {
    if (
      availableWeeks.length > 0 &&
      (!selectedWeek ||
        !availableWeeks.some((w) => w.desde === selectedWeek.desde))
    ) {
      setSelectedWeek(availableWeeks[0]);
    } else if (availableWeeks.length > 0 && !selectedWeek) {
      setSelectedWeek(availableWeeks[0]);
    }
  }, [currentMonthIndex0, currentYear, availableWeeks, selectedWeek]);

  // 1. FUNCIONES PARA OBTENER DATOS (Nómina y Liquidación)

  // Obtiene el estado de Liquidación para un ítem de nómina
  const fetchLiquidacionEstado = async (
    item: NominaItem,
    selectedWeek: any
  ) => {
    try {
      const liqDTO = await PlanillaService.generarLiquidacionSemanal(
        item.trabajadorId,
        selectedWeek.desde,
        selectedWeek.hasta
      );

      if (liqDTO && liqDTO.id) {
        return {
          liquidacionId: liqDTO.id,
          liquidacionEstado: liqDTO.pagado ? "PAGADO" : "PENDIENTE",
          liquidacionMontoPagado: liqDTO.montoPagado ?? 0,
        };
      }
    } catch (error) {
      console.warn(
        `Liquidación para ${item.trabajadorNombre} no existe o no pudo ser generada/consultada.`,
        error
      );
    }
    return {
      liquidacionId: null,
      liquidacionEstado: "NO_GENERADA",
      liquidacionMontoPagado: 0,
    };
  };

  const fetchNomina = useCallback(async () => {
    if (!selectedWeek) {
      setNominaSemanal([]);
      return;
    }
    setLoading(true);
    setNominaSemanal([]);

    try {
      // A. Cargar Nómina Semanal (Calcula el pago potencial)
      const nomina = await PlanillaService.calcularNominaSemanal(
        selectedWeek.desdeISO,
        selectedWeek.hastaISO
      );

      // B. Mapear y obtener el estado de Liquidación en paralelo
      const itemsConEstado = await Promise.all(
        nomina.map(async (item) => {
          const estado = await fetchLiquidacionEstado(item, selectedWeek);
          return {
            ...item,
            ...estado,
            isLoading: false,
          };
        })
      );

      setNominaSemanal(itemsConEstado);
    } catch (error) {
      console.error("Error al cargar la nómina semanal:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedWeek]);

  // 2. EFECTO DE CARGA INICIAL Y CAMBIO DE SEMANA
  useEffect(() => {
    fetchNomina();
  }, [fetchNomina]);

  // Obtener lista única de trabajadores para el filtro de historial
  const trabajadoresList = useMemo(() => {
    // Si la nómina está vacía, no hay lista
    if (nominaSemanal.length === 0) return [];

    // Mapear a un array de { id, nombre }
    const uniqueWorkers = nominaSemanal.map((item) => ({
      id: item.trabajadorId,
      nombre: item.trabajadorNombre,
    }));

    // Eliminar duplicados si el backend devolvió el mismo trabajador varias veces (debería ser único)
    const workerMap = new Map();
    uniqueWorkers.forEach((w) => workerMap.set(w.id, w));

    // Convertir de nuevo a array y ordenar
    return Array.from(workerMap.values()).sort((a, b) =>
      a.nombre.localeCompare(b.nombre)
    );
  }, [nominaSemanal]);

  // 3. HANDLERS DE ACCIÓN (Generar/Ver/Pagar/Historial)

  // **NUEVO HANDLER:** Abre el modal y carga el historial del trabajador seleccionado en el filtro
  const handleVerHistorial = async () => {
    if (trabajadorFiltroId === "all") {
      // Usar alert temporalmente hasta que se implemente un Toast o Modal de advertencia
      console.error("Por favor, selecciona un trabajador para ver su historial.");
      return;
    }

    const worker = trabajadoresList.find((w) => w.id === trabajadorFiltroId);
    if (!worker) {
      console.error("Trabajador no encontrado en la nómina actual.");
      return;
    }

    setSelectedTrabajadorHistory({ id: worker.id, nombre: worker.nombre });
    setIsHistoryModal(true);
    setHistoryData([]);
    setIsHistoryLoading(true);

    try {
      const data = await PlanillaService.obtenerHistorialLiquidaciones(
        worker.id
      );
      setHistoryData(data);
    } catch (error) {
      console.error("Error al cargar historial:", error);
      // Usar alert temporalmente
      console.error(
        "No se pudo cargar el historial de pagos. Revisa la consola y tu PlanillaService."
      );
      setHistoryData([]);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const handleGenerarOVerLiquidacion = async (item: NominaItem) => {
    if (!selectedWeek) return;

    // A. Si la liquidación NO ha sido generada, la forzamos y recargamos la nómina.
    if (item.liquidacionEstado === "NO_GENERADA" || !item.liquidacionId) {
      setNominaSemanal((prev) =>
        prev.map((p) =>
          p.trabajadorId === item.trabajadorId ? { ...p, isLoading: true } : p
        )
      );
      try {
        await PlanillaService.generarLiquidacionSemanal(
          item.trabajadorId,
          selectedWeek.desde,
          selectedWeek.hasta
        );
        await fetchNomina();
        // Usar alert temporalmente
        console.log(`Liquidación generada para ${item.trabajadorNombre}.`);
      } catch (error) {
        console.error("Error al generar liquidación:", error);
        // Usar alert temporalmente
        console.error("Hubo un error al generar la liquidación. Revisa la consola.");
      } finally {
        setNominaSemanal((prev) =>
          prev.map((p) =>
            p.trabajadorId === item.trabajadorId
              ? { ...p, isLoading: false }
              : p
          )
        );
      }
      return;
    }

    // B. Si la liquidación EXISTE (PENDIENTE o PAGADO), la consultamos para el modal.
    try {
      setNominaSemanal((prev) =>
        prev.map((p) =>
          p.trabajadorId === item.trabajadorId ? { ...p, isLoading: true } : p
        )
      );

      const liqDTO = await PlanillaService.obtenerLiquidacion(
        item.liquidacionId
      );

      // 💥 CORRECCIÓN CRÍTICA: Asegurar que los campos Total sean poblados,
      // usando los campos Semanal como fallback si el DTO no los trae.
      setSelectedLiquidacion({
        id: liqDTO.id,
        trabajadorNombre: item.trabajadorNombre,
        desde: selectedWeek.desde,
        hasta: selectedWeek.hasta,
        comisionTotal: liqDTO.comisionTotal ?? item.comisionSemanal,
        retencionTotal: liqDTO.retencionTotal ?? item.retencionSemana,
        pagoNetoCalculado: item.pagoSemana,

        pagado: liqDTO.pagado,
        fechaPago: liqDTO.fechaPago,
        medioPago: liqDTO.medioPago,
        montoPagado: liqDTO.montoPagado,
        observacion: liqDTO.observacion,
      });
      setIsModalOpen(true);
    } catch (error) {
      console.error("Error al obtener liquidación:", error);
      // Usar alert temporalmente
      console.error("No se pudo cargar el detalle de la liquidación.");
    } finally {
      setNominaSemanal((prev) =>
        prev.map((p) =>
          p.trabajadorId === item.trabajadorId ? { ...p, isLoading: false } : p
        )
      );
    }
  };

  const handlePagarLiquidacion = async (
    liq: LiquidacionDTO,
    montoPagado: number,
    medioPago: MedioPago,
    observacion: string
  ) => {
    if (!liq.id) return;
    if (liq.pagado) return;

    setIsPagarLoading(true);
    try {
      const req = {
        montoPagado: montoPagado,
        medioPago: medioPago,
        fechaPago: new Date().toISOString(),
        observacion: observacion,
      };

      await PlanillaService.pagarLiquidacion(liq.id, req);

      await fetchNomina();

      // Usar alert temporalmente
      console.log(`Liquidación ${liq.id} pagada exitosamente!`);
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error al pagar liquidación:", error);
      // Usar alert temporalmente
      console.error("Hubo un error al procesar el pago. Revisa la consola.");
    } finally {
      setIsPagarLoading(false);
    }
  };

  // 4. CÁLCULO DE KPIs
  const totalPayroll = useMemo(() => {
    return nominaSemanal.reduce((sum, p) => sum + (p.pagoSemana ?? 0), 0);
  }, [nominaSemanal]);

  const totalTrabajadores = nominaSemanal.length;

  // 5. RENDERIZADO PRINCIPAL

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            Planilla Semanal
          </h1>
          <p className="text-muted-foreground mt-2">
            Cálculo de nómina y gestión de pagos al personal por semana.
          </p>
        </div>
      </div>

      {/* Controles de Período y Filtro de Historial */}
      <Card className="p-4 border-border/50">
        <div className="flex flex-col gap-4">
          <div className="flex gap-4 items-center flex-wrap">
            <Label htmlFor="month-select" className="text-sm">
              Seleccionar Período
            </Label>

            {/* Selector de Mes */}
            <Select
              value={String(currentMonthIndex0)}
              onValueChange={(val) => setCurrentMonthIndex0(Number(val))}
            >
              <SelectTrigger id="month-select" className="w-[150px]">
                <SelectValue placeholder="Mes" />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((m) => (
                  <SelectItem key={m.value} value={String(m.value)}>
                    {m.label} {currentYear}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <ArrowRight className="h-4 w-4 text-muted-foreground" />

            {/* Selector de Semana */}
            <Select
              value={selectedWeek?.desde}
              onValueChange={(val) => {
                const week = availableWeeks.find((w) => w.desde === val);
                setSelectedWeek(week);
              }}
              disabled={availableWeeks.length === 0}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Semana (Lunes a Domingo)" />
              </SelectTrigger>
              <SelectContent>
                {availableWeeks.map((w) => (
                  <SelectItem key={w.desde} value={w.desde}>
                    {w.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedWeek && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                <Clock className="h-3 w-3 mr-1" />
                {selectedWeek.desde} a {selectedWeek.hasta}
              </Badge>
            )}

            <Button onClick={fetchNomina} disabled={loading || !selectedWeek}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {loading ? "Cargando..." : "Cargar Nómina"}
            </Button>
          </div>

          {/* --- SEPARADOR DE CONTROL --- */}
          <div className="border-t border-border/50 pt-3 mt-1 flex gap-4 items-center flex-wrap">
            <Label
              htmlFor="worker-history-select"
              className="text-sm font-bold text-primary"
            >
              Ver Historial de Pago
            </Label>

            {/* Selector de Trabajador para Historial */}
            <Select
              value={String(trabajadorFiltroId)}
              onValueChange={(val) =>
                setTrabajadorFiltroId(val === "all" ? "all" : Number(val))
              }
              disabled={loading || trabajadoresList.length === 0}
            >
              <SelectTrigger id="worker-history-select" className="w-[250px]">
                <SelectValue placeholder="Selecciona Trabajador" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" disabled>
                  Selecciona un trabajador...
                </SelectItem>
                {trabajadoresList.map((w) => (
                  <SelectItem key={w.id} value={String(w.id)}>
                    {w.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              onClick={handleVerHistorial}
              disabled={trabajadorFiltroId === "all" || isHistoryLoading}
              variant="outline"
              className="border-primary text-primary hover:bg-primary/10"
            >
              {isHistoryLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <History className="h-4 w-4 mr-2" />
              )}
              {isHistoryLoading ? "Cargando..." : "Ver Historial"}
            </Button>
          </div>
        </div>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pago Neto Semanal
            </CardTitle>
            <DollarSign className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">
              {loading ? "Cargando..." : fmtMoney(totalPayroll)}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {selectedWeek?.label || "Selecciona una semana"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Trabajadores Calculados
            </CardTitle>
            <Users className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {totalTrabajadores}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Nómina generada
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Liquidaciones Pendientes
            </CardTitle>
            <Calendar className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {
                nominaSemanal.filter((n) => n.liquidacionEstado === "PENDIENTE")
                  .length
              }
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Para el período seleccionado
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Payroll Table */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>
            Detalle de Nómina Semanal -{" "}
            {selectedWeek?.label || "Sin seleccionar"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="p-4 text-center text-muted-foreground flex justify-center items-center">
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Calculando nómina...
            </div>
          ) : nominaSemanal.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              No hay datos de nómina disponibles para este período.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">
                      Trabajador
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-muted-foreground">
                      Sueldo Mín.
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-muted-foreground">
                      Comisiones
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-muted-foreground">
                      Retenciones
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-muted-foreground">
                      Pago Neto
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-muted-foreground">
                      Estado Pago
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-muted-foreground">
                      Acción
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {nominaSemanal.map((item) => (
                    <tr
                      key={item.trabajadorId}
                      className="border-b border-border hover:bg-muted/30 transition-colors"
                    >
                      <td className="py-4 px-4 font-medium text-foreground">
                        {item.trabajadorNombre}
                      </td>
                      <td className="py-4 px-4 text-right font-medium text-foreground">
                        {fmtMoney(item.sueldoMinimoSemanal)}
                      </td>
                      <td className="py-4 px-4 text-right text-green-600 font-medium">
                        +{fmtMoney(item.comisionSemanal)}
                      </td>
                      <td className="py-4 px-4 text-right text-destructive font-medium">
                        -{fmtMoney(item.retencionSemana)}
                      </td>
                      <td className="py-4 px-4 text-right font-bold text-primary text-lg">
                        {fmtMoney(item.pagoSemana)}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <Badge
                          variant="secondary"
                          className={
                            item.liquidacionEstado === "PAGADO"
                              ? "bg-green-100 text-green-800"
                              : item.liquidacionEstado === "PENDIENTE"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-gray-100 text-gray-800"
                          }
                        >
                          {item.liquidacionEstado === "PAGADO"
                            ? `PAGADO (${fmtMoney(
                                item.liquidacionMontoPagado
                              )})`
                            : item.liquidacionEstado}
                        </Badge>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={item.isLoading}
                          onClick={() => handleGenerarOVerLiquidacion(item)}
                        >
                          {item.isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : item.liquidacionEstado === "PAGADO" ? (
                            "Ver Pago"
                          ) : item.liquidacionEstado === "PENDIENTE" ? (
                            "Ver / Pagar"
                          ) : (
                            "Generar"
                          )}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* MODAL DE VER / PAGAR LIQUIDACIÓN */}
      <LiquidacionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        liquidacion={selectedLiquidacion}
        onPagar={handlePagarLiquidacion}
        isLoading={isPagarLoading}
      />

      {/* MODAL DE HISTORIAL DE PAGOS */}
      <HistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModal(false)}
        trabajador={selectedTrabajadorHistory}
        data={historyData}
        isLoading={isHistoryLoading}
      />
    </div>
  );
}

// ===================================================
// === MODAL DE LIQUIDACIÓN (Ver/Pagar) ===
// ===================================================

interface LiquidacionModalProps {
  isOpen: boolean;
  onClose: () => void;
  liquidacion: LiquidacionDTO | null;
  onPagar: (
    liq: LiquidacionDTO,
    monto: number,
    medio: MedioPago,
    obs: string
  ) => void;
  isLoading: boolean;
}

const LiquidacionModal: React.FC<LiquidacionModalProps> = ({
  isOpen,
  onClose,
  liquidacion,
  onPagar,
  isLoading,
}) => {
  // Estados del formulario de pago
  const [montoPago, setMontoPago] = useState(
    liquidacion?.pagoNetoCalculado ?? 0
  );
  const [medioPago, setMedioPago] = useState<MedioPago>("TRANSFERENCIA");
  const [observacion, setObservacion] = useState("");

  // Sincronizar estados cuando cambia la liquidación
  useEffect(() => {
    if (liquidacion) {
      // Si ya está pagada, usamos los datos guardados. Si no, usamos el cálculo.
      setMontoPago(
        liquidacion.montoPagado ?? liquidacion.pagoNetoCalculado ?? 0
      );
      setMedioPago(liquidacion.medioPago ?? "TRANSFERENCIA");
      setObservacion(liquidacion.observacion ?? "");
    }
  }, [liquidacion]);

  if (!liquidacion) return null;

  // Si liquidacion.pagado es true, el modal cambia a modo "Sólo Lectura"
  const isPagada = liquidacion.pagado;
  const pagoCalculado = liquidacion.pagoNetoCalculado ?? 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>
            {isPagada ? "Detalle de Pago" : "Pagar Liquidación"}
          </DialogTitle>
          <DialogDescription>
            {liquidacion.trabajadorNombre} — {liquidacion.desde} a{" "}
            {liquidacion.hasta}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 items-center">
            <Label>Comisión Total:</Label>
            <div className="text-right font-medium text-green-600">
              +{fmtMoney(liquidacion.comisionTotal)}
            </div>
          </div>
          <div className="grid grid-cols-2 items-center">
            <Label>Retención Total:</Label>
            <div className="text-right font-medium text-destructive">
              -{fmtMoney(liquidacion.retencionTotal)}
            </div>
          </div>
          <div className="grid grid-cols-2 items-center border-t pt-2 mt-2">
            <Label className="font-bold">Pago Neto Calculado:</Label>
            <div className="text-right font-bold text-primary text-xl">
              {fmtMoney(pagoCalculado)}
            </div>
          </div>
        </div>

        <h3 className="text-lg font-semibold border-b pb-1 mt-4">
          Detalle de Pago Real
        </h3>

        {isPagada ? (
          <div className="grid gap-2">
            <div className="grid grid-cols-2 items-center">
              <Label>Monto Pagado:</Label>
              <div className="text-right font-bold">
                {fmtMoney(liquidacion.montoPagado ?? 0)}
              </div>
            </div>
            <div className="grid grid-cols-2 items-center">
              <Label>Medio:</Label>
              <div className="text-right">{liquidacion.medioPago}</div>
            </div>
            <div className="grid grid-cols-2 items-center">
              <Label>Fecha:</Label>
              <div className="text-right">
                {/* Aseguramos que la fecha se muestre en formato local amigable */}
                {liquidacion.fechaPago
                  ? formatDate(liquidacion.fechaPago)
                  : "N/A"}
              </div>
            </div>
            <div className="space-y-1">
              <Label>Observación:</Label>
              <Textarea
                value={liquidacion.observacion ?? "Sin observación."}
                readOnly
                rows={2}
              />
            </div>
          </div>
        ) : (
          <div className="grid gap-3">
            <div className="space-y-1">
              <Label htmlFor="monto">Monto a Pagar</Label>
              <Input
                id="monto"
                type="number"
                value={montoPago}
                onChange={(e) => setMontoPago(Number(e.target.value))}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="medio-pago">Medio de Pago</Label>
              <Select
                value={medioPago}
                onValueChange={(val) => setMedioPago(val as MedioPago)}
              >
                <SelectTrigger id="medio-pago">
                  <SelectValue placeholder="Selecciona..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TRANSFERENCIA">Transferencia</SelectItem>
                  <SelectItem value="YAPE">Yape</SelectItem>
                  <SelectItem value="PLIN">Plin</SelectItem>
                  <SelectItem value="EFECTIVO">Efectivo</SelectItem>
                  <SelectItem value="TARJETA">Tarjeta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="observacion">Observación (Opcional)</Label>
              <Textarea
                id="observacion"
                value={observacion}
                onChange={(e) => setObservacion(e.target.value)}
                rows={2}
              />
            </div>
          </div>
        )}
        
        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cerrar
          </Button>
          {!isPagada && (
            <Button
              onClick={() =>
                onPagar(liquidacion, montoPago, medioPago, observacion)
              }
              disabled={isLoading || montoPago <= 0}
            >
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmar Pago
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ===================================================
// === MODAL DE HISTORIAL DE PAGOS ===
// ===================================================

interface HistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    trabajador: { id: number, nombre: string };
    // Usamos LiquidacionDTO, sabiendo que los campos Semanal existen en la data
    data: LiquidacionDTO[]; 
    isLoading: boolean;
}

const HistoryModal: React.FC<HistoryModalProps> = ({ isOpen, onClose, trabajador, data, isLoading }) => {
    
    // Función auxiliar para mostrar el estado de carga
    const isModalLoading = data.length === 0 && isOpen && trabajador.id !== 0 && isLoading;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
          <DialogContent className="sm:max-w-[880px] max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Historial de Pagos</DialogTitle>
              <DialogDescription className="text-primary font-semibold">
                {trabajador.nombre}
              </DialogDescription>
            </DialogHeader>
    
            <div className="overflow-y-auto flex-grow -mx-6 px-6">
              {isModalLoading ? (
                <div className="p-8 text-center text-muted-foreground flex justify-center items-center">
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Cargando historial...
                </div>
              ) : data.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  No hay historial de pagos disponible para este trabajador.
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="sticky top-0 bg-background border-b border-border shadow-sm">
                      <th className="text-left py-2 px-4 font-semibold text-muted-foreground">
                        Período
                      </th>
                      <th className="text-right py-2 px-4 font-semibold text-muted-foreground">
                        Comisión
                      </th>
                      <th className="text-right py-2 px-4 font-semibold text-muted-foreground">
                        Retención
                      </th>
                      <th className="text-right py-2 px-4 font-semibold text-muted-foreground">
                        Monto Pagado
                      </th>
                      <th className="text-center py-2 px-4 font-semibold text-muted-foreground">
                        Medio
                      </th>
                      <th className="text-center py-2 px-4 font-semibold text-muted-foreground">
                        Fecha Pago
                      </th>
                      <th className="text-center py-2 px-4 font-semibold text-muted-foreground">
                        Estado
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Ordenar por fecha de inicio (desde) descendente */}
                    {data
                      .sort(
                        (a, b) =>
                          new Date(b.desde).getTime() - new Date(a.desde).getTime()
                      )
                      .map((liq) => (
                        <tr
                          key={liq.id}
                          className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                        >
                          <td className="py-2 px-4 text-left">
                            {/* Formato DD-MM a DD-MM */}
                            {liq.desde.slice(8) + "-" + liq.desde.slice(5, 7)} a{" "}
                            {liq.hasta.slice(8) + "-" + liq.hasta.slice(5, 7)}
                          </td>
                          <td className="py-2 px-4 text-right font-medium text-green-600">
                            {/* ✅ CORREGIDO: Usando comisionSemanal */}
                            +{fmtMoney(liq.comisionSemanal ?? 0)} 
                          </td>
                          <td className="py-2 px-4 text-right font-medium text-destructive">
                            {/* ✅ CORREGIDO: Usando retencionSemana */}
                            -{fmtMoney(liq.retencionSemana ?? 0)}
                          </td>
                          <td className="py-2 px-4 text-right font-bold text-lg">
                            {liq.pagado ? fmtMoney(liq.montoPagado ?? 0) : "-"}
                          </td>
                          <td className="py-2 px-4 text-center">
                            <Badge variant="secondary">
                              {liq.medioPago || "N/A"}
                            </Badge>
                          </td>
                          <td className="py-2 px-4 text-center">
                            {liq.fechaPago
                              ? formatDate(liq.fechaPago).split(", ")[0]
                              : "Pendiente"}
                          </td>
                          <td className="py-2 px-4 text-center">
                            <Badge
                              variant="secondary"
                              className={
                                liq.pagado
                                  ? "bg-green-100 text-green-800"
                                  : "bg-yellow-100 text-yellow-800"
                              }
                            >
                              {liq.pagado ? "PAGADO" : "PENDIENTE"}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
            </div>
    
            <DialogFooter className="mt-4">
              <Button variant="secondary" onClick={onClose}>
                Cerrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );
    };