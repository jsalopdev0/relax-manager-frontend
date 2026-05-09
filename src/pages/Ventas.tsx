import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Plus,
  DollarSign,
  TrendingUp,
  Users,
  RefreshCcw,
  Ban,
  Filter,
  X,
  Search,
  CreditCard, // Nuevo ícono para Tarjeta
  Smartphone, // Nuevo ícono para Yape/Plin
  Repeat, // Nuevo ícono para Transferencia
  Wallet, // ¡Nuevo ícono para Efectivo!
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { StatCard } from "@/components/StatCard";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

// === API ===
import { listarVentas, anularVenta } from "@/api/ventas";

// ===== Utils =====
const fmtMoney = (n: number) =>
  (n ?? 0).toLocaleString("es-PE", {
    style: "currency",
    currency: "PEN",
    maximumFractionDigits: 2,
  });

const fmtFecha = (iso: string) => {
  try {
    const d = new Date(iso);
    const f = d.toLocaleDateString("es-PE");
    const t = d.toLocaleTimeString("es-PE", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    return `${f} ${t}`;
  } catch {
    return iso;
  }
};

const startOfMonth = (date = new Date()) =>
  new Date(date.getFullYear(), date.getMonth(), 1);
const endOfMonth = (date = new Date()) =>
  new Date(date.getFullYear(), date.getMonth() + 1, 0);
const toISODate = (d: Date) => d.toISOString().slice(0, 10);

// ====== Tipos backend ======
interface VentaAPI {
  id: number;
  codigo: string;
  fechaHora: string;
  servicioId: number;
  servicioNombre: string;
  trabajadorId: number;
  trabajadorNombre: string;
  // EL MEDIO DE PAGO EFECTIVO YA ESTABA INCLUIDO AQUÍ
  medioPago: "EFECTIVO" | "TARJETA" | "TRANSFERENCIA" | "YAPE" | "PLIN"; 
  clienteNombre: string;
  costoInterno: number;
  porcentajeComisionAplicado: number;
  montoComision: number;
  descuentoPct: number | null;
  descuentoMonto: number;
  recargoTarjeta: number;
  totalCobrado: number;
  gananciaNeta: number;
  anulada: boolean;
  motivoAnulacion: string | null;
}

// ====== Filtros ======
type EstadoFiltro = "TODOS" | "COMPLETADA" | "ANULADA";
type MesPreset = "TODOS" | "HOY" | "ESTE_MES" | "MES_PASADO" | "PERSONALIZADO";
// EL MÉTODO DE PAGO EFECTIVO YA ESTABA INCLUIDO AQUÍ
type MetodoPago = "EFECTIVO" | "TARJETA" | "TRANSFERENCIA" | "YAPE" | "PLIN";

type Filtros = {
  mes: MesPreset;
  desde?: string | null; // YYYY-MM-DD
  hasta?: string | null; // YYYY-MM-DD
  estado: EstadoFiltro;
  trabajadorId?: string | null;
  servicioId?: string | null;
  metodoPago?: MetodoPago | null;
  q?: string;
};

// === Helpers para armar params del backend ===
const toApiDateTime = (
  yyyyMMdd: string | null | undefined,
  endOfDay = false
) => {
  if (!yyyyMMdd) return undefined;
  // Asume zona horaria -05:00 (Lima) para rangos de fecha/hora
  return endOfDay ? `${yyyyMMdd}T23:59:59-05:00` : `${yyyyMMdd}T00:00:00-05:00`;
};

const buildApiParams = (f: Filtros) => {
  const p: Record<string, any> = {};
  const desde = toApiDateTime(f.desde ?? null, false);
  const hasta = toApiDateTime(f.hasta ?? null, true);
  if (desde) p.desde = desde;
  if (hasta) p.hasta = hasta;
  if (f.trabajadorId) p.trabajadorId = f.trabajadorId;
  if (f.metodoPago) p.medioPago = f.metodoPago;

  // Si el filtro de estado es "ANULADA" o "COMPLETADA", se puede pasar al backend
  // para optimizar, aunque el filtrado final se hace client-side por seguridad.
  if (f.estado === "COMPLETADA") p.anulada = false;
  if (f.estado === "ANULADA") p.anulada = true;

  return p;
};

const Ventas = () => {
  const { toast } = useToast();

  const [ventas, setVentas] = useState<VentaAPI[]>([]);
  const [loading, setLoading] = useState(false);

  // ANULAR
  const [openAnular, setOpenAnular] = useState(false);
  const [ventaSeleccionada, setVentaSeleccionada] = useState<VentaAPI | null>(
    null
  );
  const [motivoAnulacion, setMotivoAnulacion] = useState("");
  const [anulando, setAnulando] = useState(false);

  // FILTROS
  const [filtros, setFiltros] = useState<Filtros>(() => {
    const ini = startOfMonth();
    const fin = endOfMonth();
    return {
      mes: "ESTE_MES",
      desde: toISODate(ini),
      hasta: toISODate(fin),
      estado: "TODOS",
      trabajadorId: null,
      servicioId: null,
      metodoPago: null,
      q: "",
    };
  });

  const setMesPreset = (preset: MesPreset) => {
    if (preset === "TODOS") {
      setFiltros((f) => ({ ...f, mes: preset, desde: null, hasta: null }));
      return;
    }
    if (preset === "HOY") {
      const hoy = toISODate(new Date());
      setFiltros((f) => ({ ...f, mes: preset, desde: hoy, hasta: hoy }));
      return;
    }
    if (preset === "ESTE_MES") {
      setFiltros((f) => ({
        ...f,
        mes: preset,
        desde: toISODate(startOfMonth()),
        hasta: toISODate(endOfMonth()),
      }));
      return;
    }
    if (preset === "MES_PASADO") {
      const now = new Date();
      const inicio = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const fin = new Date(now.getFullYear(), now.getMonth(), 0);
      setFiltros((f) => ({
        ...f,
        mes: preset,
        desde: toISODate(inicio),
        hasta: toISODate(fin),
      }));
      return;
    }
    setFiltros((f) => ({ ...f, mes: preset }));
  };

  const limpiarFiltros = () => {
    setFiltros({
      mes: "ESTE_MES",
      desde: toISODate(startOfMonth()),
      hasta: toISODate(endOfMonth()),
      estado: "TODOS",
      trabajadorId: null,
      servicioId: null,
      metodoPago: null,
      q: "",
    });
  };

  // Cargar ventas (con filtros hacia backend)
  const fetchVentas = async () => {
    try {
      setLoading(true);
      const params = buildApiParams(filtros);
      // Nota: Aquí solo enviamos los filtros de fecha y trabajador,
      // el resto se filtra en el frontend para mayor flexibilidad.
      const data = await listarVentas(params); 
      setVentas(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      toast({
        title: "Error al listar ventas",
        description: "No se pudo obtener el historial.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVentas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Derivar opciones dinámicas desde data
  const trabajadores = useMemo(() => {
    const map = new Map<string, { id: string; nombre: string }>();
    ventas.forEach((v) =>
      map.set(String(v.trabajadorId), {
        id: String(v.trabajadorId),
        nombre: v.trabajadorNombre,
      })
    );
    return Array.from(map.values()).sort((a, b) =>
      a.nombre.localeCompare(b.nombre)
    );
  }, [ventas]);

  const servicios = useMemo(() => {
    const map = new Map<string, { id: string; nombre: string }>();
    ventas.forEach((v) =>
      map.set(String(v.servicioId), {
        id: String(v.servicioId),
        nombre: v.servicioNombre,
      })
    );
    return Array.from(map.values()).sort((a, b) =>
      a.nombre.localeCompare(b.nombre)
    );
  }, [ventas]);

  // ANULAR
  const abrirModalAnular = (venta: VentaAPI) => {
    setVentaSeleccionada(venta);
    setMotivoAnulacion("");
    setOpenAnular(true);
  };

  const confirmarAnulacion = async () => {
    if (!ventaSeleccionada) return;
    if (!motivoAnulacion.trim()) {
      toast({
        title: "Ingrese un motivo",
        description: "El motivo de anulación es obligatorio.",
        variant: "destructive",
      });
      return;
    }
    try {
      setAnulando(true);
      await anularVenta(ventaSeleccionada.id, motivoAnulacion.trim());
      setVentas((prev) =>
        prev.map((v) =>
          v.id === ventaSeleccionada.id
            ? { ...v, anulada: true, motivoAnulacion: motivoAnulacion.trim() }
            : v
        )
      );
      toast({
        title: "Venta anulada",
        description: `#${ventaSeleccionada.codigo} — ${motivoAnulacion.trim()}`,
      });
      setOpenAnular(false);
      setVentaSeleccionada(null);
    } catch (err: any) {
      console.error(err);
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "No se pudo anular la venta.";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setAnulando(false);
    }
  };

  // FILTRADO client-side complementario (Aplica todos los filtros)
  const ventasFiltradas = useMemo(() => {
    const f = filtros;
    return ventas.filter((v) => {
      // Filtrado por fecha (ya debería estar optimizado por backend, pero se comprueba)
      const fecha = v.fechaHora.slice(0, 10);
      if (f.desde && fecha < f.desde) return false;
      if (f.hasta && fecha > f.hasta) return false;
      
      // Filtros de estado (client-side)
      if (f.estado === "ANULADA" && !v.anulada) return false;
      if (f.estado === "COMPLETADA" && v.anulada) return false;
      
      // Filtros de IDs (client-side)
      if (f.trabajadorId && String(v.trabajadorId) !== f.trabajadorId)
        return false;
      if (f.servicioId && String(v.servicioId) !== f.servicioId) return false;
      
      // Filtro de Método de Pago (client-side)
      if (f.metodoPago && v.medioPago !== f.metodoPago) return false;
      
      // Filtro de búsqueda por cliente
      if (
        f.q &&
        !v.clienteNombre.toLowerCase().includes((f.q || "").toLowerCase())
      )
        return false;
        
      return true;
    });
  }, [ventas, filtros]);

  // ===== KPIs DINÁMICOS (Calculados sobre ventasFiltradas) =====
  const {
    totalVentasPeriodo,
    ventasPeriodoCount,
    promedioVentaPeriodo,
    totalesPorPago,
  } = useMemo(() => {
    // Solo consideramos ventas NO anuladas para los KPIs financieros
    const ventasValidas = ventasFiltradas.filter((v) => !v.anulada);

    // Métrica 1: Total Ventas del Período
    const totalVentasPeriodo = ventasValidas.reduce(
      (sum, v) => sum + (v.totalCobrado ?? 0),
      0
    );

    // Métrica 2: Conteo de Ventas
    const ventasPeriodoCount = ventasValidas.length;

    // Métrica 3: Promedio por Venta
    const promedioVentaPeriodo =
      ventasPeriodoCount > 0 ? totalVentasPeriodo / ventasPeriodoCount : 0;

    // Métrica 4-8: Totales por Método de Pago
    const metodosDeseados: MetodoPago[] = [
      "EFECTIVO", // <--- AGREGADO
      "YAPE",
      "PLIN",
      "TRANSFERENCIA",
      "TARJETA",
    ];
    // Inicializar los totales en 0
    const iniciales = metodosDeseados.reduce(
      (acc, metodo) => ({ ...acc, [metodo]: 0 }),
      {} as Record<MetodoPago, number>
    );

    const totalesPorPago = ventasValidas.reduce((acc, venta) => {
      const metodo = venta.medioPago.toUpperCase() as MetodoPago;
      if (metodosDeseados.includes(metodo)) {
        // Asegurar que el monto se sume al método correcto
        acc[metodo] += venta.totalCobrado ?? 0;
      }
      return acc;
    }, iniciales);

    return {
      totalVentasPeriodo,
      ventasPeriodoCount,
      promedioVentaPeriodo,
      totalesPorPago,
    };
  }, [ventasFiltradas]);


  // ===== PAGINACIÓN (DENTRO del componente) =====
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    // Resetear página a 1 cuando los filtros cambian
    setPage(1);
  }, [JSON.stringify(filtros), ventas.length]);

  const totalItems = ventasFiltradas.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  const ventasPaginadas = useMemo(() => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return ventasFiltradas.slice(start, end);
  }, [ventasFiltradas, page, pageSize]);

  const fromItem = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const toItem = Math.min(page * pageSize, totalItems);

  const getPageNumbers = () => {
    const maxShown = 5;
    if (totalPages <= maxShown) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | "...")[] = [];
    const left = Math.max(1, page - 1);
    const right = Math.min(totalPages, page + 1);

    pages.push(1);
    if (left > 2) pages.push("...");
    for (let p = left; p <= right; p++) pages.push(p);
    if (right < totalPages - 1) pages.push("...");
    if (totalPages > 1) pages.push(totalPages);
    return pages.filter((p, i, self) => self.indexOf(p) === i); // Eliminar duplicados
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            Ventas
          </h1>
          <p className="text-muted-foreground mt-2">
            Gestiona y registra todas las ventas.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={fetchVentas}
            disabled={loading}
            className="gap-2"
            aria-label="Actualizar ventas"
            title="Actualizar ventas"
          >
            <RefreshCcw
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
            {loading ? "Actualizando..." : "Actualizar"}
          </Button>
        </div>
      </div>

      {/* --- BLOQUE 1: KPIs GENERALES (Basados en Filtros) --- */}
      <Card>
        <CardHeader>
          <CardTitle>
            Resumen Financiero{" "}
            <span className="text-lg text-muted-foreground font-normal">
              (Periodo Filtrado)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard
              title="Total Ventas (Periodo)"
              value={fmtMoney(totalVentasPeriodo)}
              trend="Sin anuladas"
              icon={DollarSign}
            />
            <StatCard
              title="Ventas (Cantidad)"
              value={ventasPeriodoCount.toString()}
              trend="Servicios vendidos"
              icon={TrendingUp}
            />
            <StatCard
              title="Promedio por Venta"
              value={fmtMoney(Math.round(promedioVentaPeriodo))}
              trend="Ticket promedio sin anuladas"
              icon={Users}
            />
          </div>
        </CardContent>
      </Card>
      
      {/* --- BLOQUE 2: KPIs de Métodos de Pago (NUEVOS - Basados en Filtros) --- */}
      <Card>
        <CardHeader>
          <CardTitle>
            Totales por Método de Pago{" "}
            <span className="text-lg text-muted-foreground font-normal">
              (Para Cierre de Caja)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Se ajustó el grid a md:grid-cols-5 para el total de métodos de pago */}
          <div className="grid gap-4 md:grid-cols-5"> 
            <StatCard
              title="Total EFECTIVO" // <--- NUEVA TARJETA
              value={fmtMoney(totalesPorPago['EFECTIVO'])}
              trend="Fondo de caja"
              icon={Wallet} // <--- NUEVO ÍCONO
            />
            <StatCard
              title="Total YAPE"
              value={fmtMoney(totalesPorPago['YAPE'])}
              trend="Conciliar con Yape"
              icon={Smartphone}
            />
            <StatCard
              title="Total PLIN"
              value={fmtMoney(totalesPorPago['PLIN'])}
              trend="Conciliar con Plin"
              icon={Smartphone}
            />
            <StatCard
              title="Total TRANSFERENCIA"
              value={fmtMoney(totalesPorPago['TRANSFERENCIA'])}
              trend="Conciliar con Banca"
              icon={Repeat}
            />
            <StatCard
              title="Total TARJETA"
              value={fmtMoney(totalesPorPago['TARJETA'])}
              trend="Conciliar con POS"
              icon={CreditCard}
            />
          </div>
        </CardContent>
      </Card>

      {/* Filtros */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
          <CardDescription>
            Refina la búsqueda por fecha, estado, trabajador, servicio y más.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-12">
          {/* Mes preset */}
          <div className="md:col-span-2">
            <Label>Mes</Label>
            <Select
              value={filtros.mes}
              onValueChange={(val: MesPreset) => setMesPreset(val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos</SelectItem>
                <SelectItem value="HOY">Hoy</SelectItem>
                <SelectItem value="ESTE_MES">Este mes</SelectItem>
                <SelectItem value="MES_PASADO">Mes pasado</SelectItem>
                <SelectItem value="PERSONALIZADO">Personalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Desde / Hasta */}
          <div className="md:col-span-2">
            <Label>Desde</Label>
            <Input
              type="date"
              value={filtros.desde ?? ""}
              onChange={(e) =>
                setFiltros((f) => ({
                  ...f,
                  desde: e.target.value || null,
                  mes: "PERSONALIZADO",
                }))
              }
              disabled={filtros.mes !== "PERSONALIZADO"}
            />
          </div>
          <div className="md:col-span-2">
            <Label>Hasta</Label>
            <Input
              type="date"
              value={filtros.hasta ?? ""}
              onChange={(e) =>
                setFiltros((f) => ({
                  ...f,
                  hasta: e.target.value || null,
                  mes: "PERSONALIZADO",
                }))
              }
              disabled={filtros.mes !== "PERSONALIZADO"}
            />
          </div>

          {/* Estado */}
          <div className="md:col-span-2">
            <Label>Estado</Label>
            <Select
              value={filtros.estado}
              onValueChange={(v: EstadoFiltro) =>
                setFiltros((f) => ({ ...f, estado: v }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos</SelectItem>
                <SelectItem value="COMPLETADA">Completada</SelectItem>
                <SelectItem value="ANULADA">Anulada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Trabajador */}
          <div className="md:col-span-2">
            <Label>Trabajador</Label>
            <Select
              value={filtros.trabajadorId ?? "ALL"}
              onValueChange={(v) =>
                setFiltros((f) => ({
                  ...f,
                  trabajadorId: v === "ALL" ? null : v,
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos</SelectItem>
                {trabajadores.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Servicio */}
          <div className="md:col-span-2">
            <Label>Servicio</Label>
            <Select
              value={filtros.servicioId ?? "ALL"}
              onValueChange={(v) =>
                setFiltros((f) => ({
                  ...f,
                  servicioId: v === "ALL" ? null : v,
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos</SelectItem>
                {servicios.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Método de pago */}
          <div className="md:col-span-2">
            <Label>Método de pago</Label>
            <Select
              value={filtros.metodoPago ?? "ALL"}
              onValueChange={(v) =>
                setFiltros((f) => ({
                  ...f,
                  metodoPago: v === "ALL" ? null : (v as MetodoPago),
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                {[
                  "ALL",
                  "EFECTIVO", // <--- INCLUIDO EN LA LISTA DEL FILTRO
                  "TARJETA",
                  "TRANSFERENCIA",
                  "YAPE",
                  "PLIN",
                ].map((m) =>
                  m === "ALL" ? (
                    <SelectItem key="ALL" value="ALL">
                      Todos
                    </SelectItem>
                  ) : (
                    <SelectItem key={m} value={m}>
                      {m[0] + m.slice(1).toLowerCase()}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Búsqueda cliente */}
          <div className="md:col-span-4">
            <Label>Buscar cliente</Label>
            <div className="flex items-center gap-2">
              <div className="relative w-full">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder="Nombre del cliente..."
                  value={filtros.q ?? ""}
                  onChange={(e) =>
                    setFiltros((f) => ({ ...f, q: e.target.value }))
                  }
                />
              </div>
              <Button
                variant="outline"
                onClick={limpiarFiltros}
                title="Limpiar filtros"
              >
                <X className="h-4 w-4 mr-2" />
                Limpiar
              </Button>
              <Button onClick={fetchVentas} title="Aplicar filtros">
                Aplicar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Historial de Ventas</CardTitle>
              <CardDescription>
                Mostrando {totalItems} transacciones en el periodo
              </CardDescription>
            </div>

            {/* Selector tamaño de página */}
            <div className="flex items-center gap-2">
              <Label
                htmlFor="page-size"
                className="text-sm text-muted-foreground"
              >
                Filas por página
              </Label>
              <Select
                value={String(pageSize)}
                onValueChange={(v) => {
                  const newSize = parseInt(v, 10);
                  setPageSize(newSize);
                  setPage(1);
                }}
              >
                <SelectTrigger id="page-size" className="w-[110px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Servicio</TableHead>
                <TableHead>Trabajador</TableHead>
                <TableHead>Método</TableHead>
                <TableHead className="text-right">Desc.</TableHead>
                <TableHead className="text-right">Recargo</TableHead>
                <TableHead className="text-right">Comisión</TableHead>
                <TableHead className="text-right">Total Cobrado</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ventasPaginadas.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-mono text-xs">
                    {v.codigo}
                  </TableCell>
                  <TableCell>{fmtFecha(v.fechaHora)}</TableCell>
                  <TableCell className="font-medium">
                    {v.clienteNombre}
                  </TableCell>
                  <TableCell>{v.servicioNombre}</TableCell>
                  <TableCell>{v.trabajadorNombre}</TableCell>
                  <TableCell>{v.medioPago}</TableCell>
                  <TableCell className="text-right">
                    {v.descuentoPct
                      ? `${Math.round(v.descuentoPct * 100)}%`
                      : fmtMoney(v.descuentoMonto ?? 0)}
                  </TableCell>
                  <TableCell className="text-right">
                    {fmtMoney(v.recargoTarjeta)}
                  </TableCell>
                  <TableCell className="text-right">
                    {fmtMoney(v.montoComision)}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {fmtMoney(v.totalCobrado)}
                  </TableCell>
                  <TableCell>
                    {v.anulada ? (
                      <Badge
                        variant="destructive"
                        title={v.motivoAnulacion ?? undefined}
                      >
                        Anulada
                      </Badge>
                    ) : (
                      <Badge variant="default">Completada</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="destructive"
                      className="gap-1"
                      onClick={() => abrirModalAnular(v)}
                      disabled={v.anulada || anulando}
                      title={
                        v.anulada
                          ? v.motivoAnulacion ?? "Venta ya anulada"
                          : "Anular venta"
                      }
                    >
                      <Ban className="h-4 w-4" />
                      Anular
                    </Button>
                  </TableCell>
                </TableRow>
              ))}

              {!ventasPaginadas.length && !loading && (
                <TableRow>
                  <TableCell
                    colSpan={13}
                    className="text-center text-muted-foreground py-10"
                  >
                    No hay ventas que coincidan con los filtros.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Footer de paginación */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 mt-4">
            <div className="text-sm text-muted-foreground">
              Mostrando{" "}
              <span className="font-medium text-foreground">{fromItem}</span>–
              <span className="font-medium text-foreground">{toItem}</span> de
              <span className="font-medium text-foreground"> {totalItems}</span>
            </div>

            <Pagination>
              <PaginationContent>
                {/* Ir a la primera */}
                <PaginationItem>
                  <PaginationLink
                    href="#"
                    aria-label="Primera página"
                    onClick={(e) => {
                      e.preventDefault();
                      setPage(1);
                    }}
                    className={
                      page === 1 ? "pointer-events-none opacity-50" : ""
                    }
                  >
                    «
                  </PaginationLink>
                </PaginationItem>

                {/* Anterior (localizado y sin duplicados) */}
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setPage((p) => Math.max(1, p - 1));
                    }}
                    aria-disabled={page === 1}
                    className={
                      page === 1 ? "pointer-events-none opacity-50" : ""
                    }
                  >
                    Anterior
                  </PaginationPrevious>
                </PaginationItem>

                {/* Números + elipsis */}
                {getPageNumbers().map((p, idx) =>
                  p === "..." ? (
                    <PaginationItem key={`ellipsis-${idx}`}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  ) : (
                    <PaginationItem key={p}>
                      <PaginationLink
                        href="#"
                        isActive={p === page}
                        onClick={(e) => {
                          e.preventDefault();
                          setPage(p as number);
                        }}
                        aria-label={`Página ${p}`}
                      >
                        {p}
                      </PaginationLink>
                    </PaginationItem>
                  )
                )}

                {/* Siguiente (localizado y sin duplicados) */}
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setPage((p) => Math.min(totalPages, p + 1));
                    }}
                    aria-disabled={page === totalPages}
                    className={
                      page === totalPages
                        ? "pointer-events-none opacity-50"
                        : ""
                    }
                  >
                    Siguiente
                  </PaginationNext>
                </PaginationItem>

                {/* Ir a la última */}
                <PaginationItem>
                  <PaginationLink
                    href="#"
                    aria-label="Última página"
                    onClick={(e) => {
                      e.preventDefault();
                      setPage(totalPages);
                    }}
                    className={
                      page === totalPages
                        ? "pointer-events-none opacity-50"
                        : ""
                    }
                  >
                    »
                  </PaginationLink>
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </CardContent>
      </Card>

      {/* Modal de Anulación */}
      <Dialog open={openAnular} onOpenChange={setOpenAnular}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Anular Venta #{ventaSeleccionada?.codigo}</DialogTitle>
            <DialogDescription>
              Confirme la anulación de esta venta. Esta acción es irreversible.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="motivo" className="text-right">
                Motivo
              </Label>
              <Input
                id="motivo"
                placeholder="Ej: Error al registrar servicio"
                value={motivoAnulacion}
                onChange={(e) => setMotivoAnulacion(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="text-right">
              <Button
                variant="destructive"
                onClick={confirmarAnulacion}
                disabled={anulando || !motivoAnulacion.trim()}
              >
                {anulando ? "Anulando..." : "Confirmar Anulación"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Ventas;