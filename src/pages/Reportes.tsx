"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LabelList,
} from "recharts";
import { listarVentas } from "@/api/ventas";

// shadcn UI
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

// PDF (vertical, import correcto)
import { jsPDF } from "jspdf";

// ===== Utils =====
const fmtMoney = (n: number) =>
  (n ?? 0).toLocaleString("es-PE", {
    style: "currency",
    currency: "PEN",
    maximumFractionDigits: 2,
  });

const toLocalYearMonthKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

const monthShortEs = (mIndex0: number) =>
  ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"][mIndex0];

type MetodoPago = "EFECTIVO" | "TARJETA" | "TRANSFERENCIA" | "YAPE" | "PLIN";

interface VentaAPI {
  id: number;
  fechaHora: string;
  anulada: boolean;
  totalCobrado: number;
  servicioNombre: string;
  medioPago: MetodoPago;

  // extras (para el PDF si existen)
  codigo?: string;
  cantidad?: number; // Se mantiene, pero se ignora en el cálculo de "Cantidad total" si es 0/null
  clienteNombre?: string;
  trabajadorNombre?: string;
  descuentoMonto?: number;
  montoComision?: number;
  recargoTarjeta?: number;
  gananciaNeta?: number;
}

// === Helpers para backend (últimos 6 meses completos hasta hoy) ===
const startOfDayISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}T00:00:00-05:00`;
const endOfDayISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}T23:59:59-05:00`;

const getLast6MonthsRange = () => {
  const end = new Date();
  const start = new Date(end.getFullYear(), end.getMonth() - 5, 1);
  const startISO = startOfDayISO(start);
  const endISO = endOfDayISO(end);
  return { start, end, startISO, endISO };
};

// === Paleta para el pie ===
const PIE_COLORS = [
  "hsl(265 60% 60%)",
  "hsl(160 45% 55%)",
  "hsl(35 75% 60%)",
  "hsl(270 30% 70%)",
  "hsl(200 60% 60%)",
  "hsl(0 60% 60%)",
  "hsl(120 35% 55%)",
];

export default function Reportes() {
  const [ventas, setVentas] = useState<VentaAPI[]>([]);
  const [loading, setLoading] = useState(false);

  // 1) Fetch de ventas (últimos 6 meses)
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const { startISO, endISO } = getLast6MonthsRange();
        const data = await listarVentas({ desde: startISO, hasta: endISO });
        setVentas(Array.isArray(data) ? data : []);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // 2) Filtrar anuladas para gráficos/KPIs
  const ventasValidas = useMemo(
    () => ventas.filter(v => !v.anulada && v.totalCobrado != null && v.fechaHora),
    [ventas]
  );

  // 3) Base de meses (siempre 6)
  const monthsBase = useMemo(() => {
    const { start, end } = getLast6MonthsRange();
    const list: { key: string; label: string; year: number; month0: number }[] = [];
    const cur = new Date(start);
    while (cur <= end) {
      list.push({
        key: toLocalYearMonthKey(cur),
        label: monthShortEs(cur.getMonth()),
        year: cur.getFullYear(),
        month0: cur.getMonth(),
      });
      cur.setMonth(cur.getMonth() + 1);
    }
    return list;
  }, []);

  // 4) Agregación mensual
  const monthlyRevenue = useMemo(() => {
    const acc = new Map<string, number>();
    for (const v of ventasValidas) {
      const d = new Date(v.fechaHora);
      const key = toLocalYearMonthKey(d);
      acc.set(key, (acc.get(key) ?? 0) + (v.totalCobrado ?? 0));
    }
    return monthsBase.map(m => ({
      month: m.label,
      revenue: Math.round(acc.get(m.key) ?? 0),
    }));
  }, [ventasValidas, monthsBase]);

  // 5) KPIs
  const { total6m, avgMensual, mejorMesNombre, mejorMesMonto } = useMemo(() => {
    const total = monthlyRevenue.reduce((s, r) => s + r.revenue, 0);
    const avg = monthlyRevenue.length ? total / monthlyRevenue.length : 0;
    const best = monthlyRevenue.reduce(
      (best, cur) => (cur.revenue > best.revenue ? cur : best),
      { month: "-", revenue: 0 }
    );
    return {
      total6m: total,
      avgMensual: avg,
      mejorMesNombre: best.month,
      mejorMesMonto: best.revenue,
    };
  }, [monthlyRevenue]);

  // 6) Distribución por servicio
  const serviceDistribution = useMemo(() => {
    const acc = new Map<string, number>();
    for (const v of ventasValidas) {
      const key = v.servicioNombre || "Sin nombre";
      acc.set(key, (acc.get(key) ?? 0) + (v.totalCobrado ?? 0));
    }
    const sorted = Array.from(acc.entries()).sort((a, b) => b[1] - a[1]);
    const TOP = 5;
    const top = sorted.slice(0, TOP);
    const rest = sorted.slice(TOP);
    const otrosTotal = rest.reduce((s, [, val]) => s + val, 0);
    const final = [
      ...top.map(([name, value]) => ({ name, value })),
      ...(otrosTotal > 0 ? [{ name: "Otros", value: otrosTotal }] : []),
    ];
    return final;
  }, [ventasValidas]);

  const pieWithColors = useMemo(
    () => serviceDistribution.map((it, idx) => ({
      ...it,
      color: PIE_COLORS[idx % PIE_COLORS.length],
    })),
    [serviceDistribution]
  );

  // ========= DETALLE MENSUAL (solo front, SIN TABLA) =========
  // Aseguramos que el valor inicial del mes sea uno que existe si es posible
  const hoyYYYYMM = new Date().toISOString().slice(0, 7);
  const [mesSeleccionado, setMesSeleccionado] = useState<string>(hoyYYYYMM);
  const [incluirAnuladas, setIncluirAnuladas] = useState<boolean>(false);

  const mesesDisponibles = useMemo(() => {
    const set = new Set<string>();
    ventas.forEach(v => { const key = v.fechaHora?.slice(0, 7); if (key) set.add(key); });
    return Array.from(set).sort((a, b) => (a > b ? -1 : 1));
  }, [ventas]);

  const ventasMes = useMemo(() => {
    return ventas.filter(v =>
      v.fechaHora?.slice(0, 7) === mesSeleccionado &&
      (incluirAnuladas ? true : !v.anulada)
    );
  }, [ventas, mesSeleccionado, incluirAnuladas]);

  // Agregaciones “bonitas” (chips/cards) para mostrar SIN tabla
  const aggMetodoPago = useMemo(() => {
    const acc = new Map<MetodoPago, number>();
    ventasMes.forEach(v => acc.set(v.medioPago, (acc.get(v.medioPago) ?? 0) + (v.totalCobrado ?? 0)));
    return Array.from(acc.entries())
      .map(([medio, total]) => ({ medio, total }))
      .sort((a, b) => b.total - a.total);
  }, [ventasMes]);

  const aggServiciosTop = useMemo(() => {
    const acc = new Map<string, number>();
    ventasMes.forEach(v => {
      const k = v.servicioNombre || "Sin nombre";
      acc.set(k, (acc.get(k) ?? 0) + (v.totalCobrado ?? 0));
    });
    return Array.from(acc.entries())
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  }, [ventasMes]);

  const aggTrabajadoresTop = useMemo(() => {
    const acc = new Map<string, number>();
    ventasMes.forEach(v => {
      const k = v.trabajadorNombre || "—";
      acc.set(k, (acc.get(k) ?? 0) + (v.totalCobrado ?? 0));
    });
    return Array.from(acc.entries())
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  }, [ventasMes]);

  const aggPorDia = useMemo(() => {
    const acc = new Map<string, { count: number; cobrado: number; ganancia: number }>();
    ventasMes.forEach(v => {
      const day = v.fechaHora?.slice(0, 10) || "";
      const prev = acc.get(day) ?? { count: 0, cobrado: 0, ganancia: 0 };
      acc.set(day, {
        count: prev.count + 1,
        cobrado: prev.cobrado + (v.totalCobrado ?? 0),
        ganancia: prev.ganancia + (v.gananciaNeta ?? 0),
      });
    });
    return Array.from(acc.entries())
      .map(([day, vals]) => ({ day, ...vals }))
      .sort((a, b) => (a.day < b.day ? -1 : 1));
  }, [ventasMes]);

  const totalesMes = useMemo(() => {
    const acc = {
      // 🟢 CORRECCIÓN: Cantidad total es ahora el número de transacciones
      cantidad: ventasMes.length, 
      descuento: 0,
      recargo: 0,
      comision: 0,
      cobrado: 0,
      ganancia: 0,
    };
    
    // Solo iteramos para sumar los montos
    for (const v of ventasMes) {
      // acc.cantidad no se suma aquí
      acc.descuento += v.descuentoMonto ?? 0;
      acc.recargo += v.recargoTarjeta ?? 0;
      acc.comision += v.montoComision ?? 0;
      acc.cobrado += v.totalCobrado ?? 0;
      acc.ganancia += v.gananciaNeta ?? 0;
    }
    return acc;
  }, [ventasMes]);

  // ========= PDF (VERTICAL) SIN TABLAS =========
  const descargarPDF = () => {
    const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
    const margin = 40;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const lineHeight = 16;

    let y = margin;

    const addTitle = (text: string) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text(text, margin, y);
      y += 22;
    };

    const addSubtitle = (text: string) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.text(text, margin, y);
      y += 18;
    };

    const addKeyValue = (label: string, value: string) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(`${label}:`, margin, y);
      doc.setFont("helvetica", "normal");
      doc.text(value, margin + 110, y);
      y += lineHeight;
    };

    const addDivider = () => {
      doc.setDrawColor(200);
      doc.line(margin, y, pageWidth - margin, y);
      y += 12;
    };

    const ensureSpace = (need = 80) => {
      if (y + need > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
    };

    // Header
    addTitle(`Detalle de Ventas — ${mesSeleccionado}`);
    addSubtitle(`Incluye anuladas: ${incluirAnuladas ? "Sí" : "No"}   •   Filas: ${ventasMes.length}`);
    addDivider();

    // Resumen
    addTitle("Resumen");
    addKeyValue("Cantidad total", String(totalesMes.cantidad));
    addKeyValue("Descuentos", fmtMoney(totalesMes.descuento));
    addKeyValue("Recargos", fmtMoney(totalesMes.recargo));
    addKeyValue("Comisiones", fmtMoney(totalesMes.comision));
    addKeyValue("Total cobrado", fmtMoney(totalesMes.cobrado));
    addKeyValue("Ganancia neta", fmtMoney(totalesMes.ganancia));
    addDivider();

    // Por método de pago
    ensureSpace();
    addTitle("Por método de pago");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    aggMetodoPago.forEach(it => {
      ensureSpace(20);
      doc.circle(margin + 4, y - 4, 2, "F");
      doc.text(`${it.medio}: ${fmtMoney(it.total)}`, margin + 12, y);
      y += lineHeight;
    });
    addDivider();

    // Top servicios
    ensureSpace();
    addTitle("Top servicios");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    aggServiciosTop.forEach((it, idx) => {
      ensureSpace(20);
      doc.text(`${idx + 1}. ${it.name}: ${fmtMoney(it.total)}`, margin, y);
      y += lineHeight;
    });
    addDivider();

    // Top terapeutas
    ensureSpace();
    addTitle("Top terapeutas");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    aggTrabajadoresTop.forEach((it, idx) => {
      ensureSpace(20);
      doc.text(`${idx + 1}. ${it.name}: ${fmtMoney(it.total)}`, margin, y);
      y += lineHeight;
    });
    addDivider();

    // Ventas por día (conteo + cobrado + ganancia)
    ensureSpace();
    addTitle("Ventas por día");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    aggPorDia.forEach(d => {
      ensureSpace(20);
      doc.text(
        `${d.day}: ${d.count} ventas — Cobrado ${fmtMoney(d.cobrado)} — Ganancia ${fmtMoney(d.ganancia)}`,
        margin, y
      );
      y += lineHeight;
    });

    // Footer paginación
    const pages = (doc as any).getNumberOfPages?.() ?? 1;
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setFontSize(9);
      doc.setTextColor(130);
      doc.text(
        `Página ${i} de ${pages}`,
        pageWidth - margin - 70,
        pageHeight - 16
      );
    }

    doc.save(`ventas_${mesSeleccionado}${incluirAnuladas ? "_con_anuladas" : ""}.pdf`);
  };

  // === RENDER ===
  return (
    <div className="space-y-8">
      {/* Header con estilo igual a Ventas */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            Reportes
          </h1>
          <p className="text-muted-foreground mt-2">
            Análisis y estadísticas de tu negocio.
          </p>
        </div>
        <div className="flex gap-2" />
      </div>
      
      {/* --- */}

      {/* KPIs */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Ingresos (6 meses)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{fmtMoney(total6m)}</div>
            <p className="text-sm text-green-600 mt-1">
              {loading ? "Cargando…" : "Comparado internamente con meses previos"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Promedio Mensual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">
              {fmtMoney(Math.round(avgMensual))}
            </div>
            <p className="text-sm text-muted-foreground mt-1">Últimos 6 meses</p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Mejor Mes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{mejorMesNombre}</div>
            <p className="text-sm text-muted-foreground mt-1">
              {fmtMoney(mejorMesMonto)} en ingresos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* --- */}

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-7">
        {/* Ingresos Mensuales */}
        <Card className="lg:col-span-4 border-border/50">
          <CardHeader>
            <CardTitle>Ingresos Mensuales</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickFormatter={(value: number) => `S/ ${(value / 1000).toFixed(1)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number) => [fmtMoney(Number(value)), "Ingresos"]}
                />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

       {/* Distribución de Servicios */}
        <Card className="lg:col-span-3 border-border/50">
          <CardHeader>
            <CardTitle>Distribución de Servicios</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={pieWithColors}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieWithColors.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number, name: string) => [fmtMoney(Number(value)), name]}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      
      {/* --- */}

      {/* ===== Detalle mensual (SIN TABLA) + PDF ===== */}
      <Card>
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Detalle mensual y PDF</CardTitle>
            <br />
            <p className="text-sm text-muted-foreground">
              Selecciona un mes para ver el detalle y descargar el reporte con <strong>ganancia neta</strong>.
            </p>
          </div>

          <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
            {/* Selector de mes */}
            <div className="flex items-center gap-2">
              <Label htmlFor="mes" className="text-sm">Mes</Label>
              <input
                id="mes"
                type="month"
                className="border rounded px-2 py-1 h-9"
                value={mesSeleccionado}
                onChange={(e) => setMesSeleccionado(e.target.value)}
                list="meses-data"
              />
              <datalist id="meses-data">
                {mesesDisponibles.map(m => <option key={m} value={m} />)}
              </datalist>
            </div>

            {/* Switch incluir anuladas */}
            <div className="flex items-center gap-2">
              <Label htmlFor="inc-anuladas" className="text-sm">Incluir anuladas</Label>
              <Switch
                id="inc-anuladas"
                checked={incluirAnuladas}
                onCheckedChange={(checked: boolean) => setIncluirAnuladas(checked)}
              />
            </div>

            {/* Botón PDF */}
            <Button onClick={descargarPDF}>Descargar PDF</Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Resumen en cards */}
          <div className="grid gap-4 md:grid-cols-6">
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Cantidad total</div>
              {/* 🟢 El valor correcto se usa aquí */}
              <div className="text-lg font-semibold">{totalesMes.cantidad}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Descuentos</div>
              <div className="text-lg font-semibold">{fmtMoney(totalesMes.descuento)}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Recargos</div>
              <div className="text-lg font-semibold">{fmtMoney(totalesMes.recargo)}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Comisiones</div>
              <div className="text-lg font-semibold">{fmtMoney(totalesMes.comision)}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Total cobrado</div>
              <div className="text-lg font-semibold">{fmtMoney(totalesMes.cobrado)}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Ganancia neta</div>
              <div className="text-lg font-semibold">{fmtMoney(totalesMes.ganancia)}</div>
            </div>
          </div>

          {/* Chips por método de pago */}
          <div>
            <div className="text-sm text-muted-foreground mb-2">Por método de pago</div>
            <div className="flex flex-wrap gap-2">
              {aggMetodoPago.map(it => (
                <span key={it.medio} className="rounded-full border px-3 py-1 text-sm">
                  {it.medio}: <span className="font-semibold">{fmtMoney(it.total)}</span>
                </span>
              ))}
              {!aggMetodoPago.length && <span className="text-sm text-muted-foreground">Sin datos</span>}
            </div>
          </div>

          {/* Grids top servicios / top terapeutas */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border p-3">
              <div className="text-sm font-medium mb-2">Top servicios</div>
              <div className="space-y-1">
                {aggServiciosTop.map((it, idx) => (
                  <div key={it.name} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{idx + 1}. {it.name}</span>
                    <span className="font-semibold">{fmtMoney(it.total)}</span>
                  </div>
                ))}
                {!aggServiciosTop.length && <div className="text-sm text-muted-foreground">Sin datos</div>}
              </div>
            </div>

            <div className="rounded-lg border p-3">
              <div className="text-sm font-medium mb-2">Top terapeutas</div>
              <div className="space-y-1">
                {aggTrabajadoresTop.map((it, idx) => (
                  <div key={it.name} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{idx + 1}. {it.name}</span>
                    <span className="font-semibold">{fmtMoney(it.total)}</span>
                  </div>
                ))}
                {!aggTrabajadoresTop.length && <div className="text-sm text-muted-foreground">Sin datos</div>}
              </div>
            </div>
          </div>

          {/* Línea de tiempo por día */}
          <div>
            <div className="text-sm font-medium mb-2">Ventas por día</div>
            <div className="space-y-2">
              {aggPorDia.map(d => (
                <div key={d.day} className="rounded-lg border p-3 text-sm flex flex-wrap gap-x-4 gap-y-1">
                  <span className="font-medium">{d.day}</span>
                  <span className="text-muted-foreground">• {d.count} ventas</span>
                  <span className="text-muted-foreground">• Cobrado {fmtMoney(d.cobrado)}</span>
                  <span className="text-muted-foreground">• Ganancia {fmtMoney(d.ganancia)}</span>
                </div>
              ))}
              {!aggPorDia.length && <div className="text-sm text-muted-foreground">Sin datos</div>}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}