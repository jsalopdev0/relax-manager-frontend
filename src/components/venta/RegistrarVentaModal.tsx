import React, { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// --- CONSTANTES DE COLOR ACTUALIZADAS A VERDE ---
const RECARGO_TARJETA_PCT = 0.05; // 5% de recargo sobre el subtotal
const DEFAULT_COMISION_PCT = 0.40; // 40% de comisión por defecto (0.40 como decimal)
const PRIMARY_COLOR_CLASS = 'text-green-600'; // CAMBIO A COLOR VERDE
const PRIMARY_BUTTON_CLASS = 'bg-green-600 hover:bg-green-700'; // CAMBIO A COLOR VERDE

// --- INTERFACES ---
interface Servicio {
  id: number;
  nombre: string;
  precio: number;
  duracionMin: number;
  costoInterno: number; 
}

interface Trabajador {
  id: number;
  nombreCompleto: string;
}

const MEDIOS_PAGO = ["EFECTIVO", "TARJETA", "TRANSFERENCIA", "YAPE", "PLIN"] as const;

type MedioPago = typeof MEDIOS_PAGO[number];

interface VentaReq {
  servicioId: number;
  trabajadorId: number;
  medioPago: MedioPago;
  clienteNombre: string;
  porcentajeComision?: number; 
  descuentoPct?: number;       
  descuentoMonto?: number;
}

interface Props {
  open: boolean;
  setOpen: (open: boolean) => void;
  servicio: Servicio | null;
  trabajadores: Trabajador[];
  onVentaSubmit: (data: VentaReq) => Promise<void> | void;
}
// -----------------------------------------------------------------------

/**
 * Componente helper para mostrar estadísticas (Monto y S/ en la misma línea).
 */
const Stat = ({ label, value, isFinal = false, textClass = 'text-gray-900', isNegative = false }: {
    label: string,
    value: number,
    isFinal?: boolean,
    textClass?: string,
    isNegative?: boolean, 
}) => {
    const valueClasses = isFinal ? 'text-2xl font-bold' : 'text-base font-medium';
    const labelClasses = isFinal ? 'text-lg font-bold' : 'text-sm text-gray-600';

    let finalValueClass = textClass;
    if (isFinal) {
        finalValueClass = PRIMARY_COLOR_CLASS; // Aplica el nuevo color primario
    } else if (isNegative) {
        finalValueClass = 'text-red-600'; 
    }

    return (
        <div className="flex justify-between items-center py-1">
            <span className={`${labelClasses}`}>
                {label}
            </span>
            <span className={`flex items-baseline ${valueClasses} ${finalValueClass}`}>
                <span className={`mr-1 ${isFinal ? 'text-lg' : 'text-sm'}`}>S/</span>
                <span className="tabular-nums">{value.toFixed(2)}</span>
            </span>
        </div>
    );
};


export default function RegistrarVentaModal({
  open,
  setOpen,
  servicio,
  trabajadores,
  onVentaSubmit,
}: Props) {
  const CANTIDAD_FIJA = 1; 

  const [trabajadorId, setTrabajadorId] = useState('');
  const [clienteNombre, setClienteNombre] = useState('GENÉRICO');
  const [medioPago, setMedioPago] = useState<MedioPago>('EFECTIVO');

  const [descuentoTipo, setDescuentoTipo] = useState<'ninguno' | 'monto' | 'porcentaje'>('ninguno');
  const [descuentoValor, setDescuentoValor] = useState<string>('0');
  
  const [comisionPct, setComisionPct] = useState<number | undefined>(undefined); 

  const precioTotal = servicio?.precio ?? 0;
  const costoTotalInterno = servicio?.costoInterno ?? 0; 

  const { 
    totalBase, 
    descuentoAplicado, 
    totalTrasDescuento, 
    recargoCalculado, 
    comisionCalculada, 
    totalFinal,
  } = useMemo(() => {
    
    const descValue = parseFloat(descuentoValor) || 0;
    const totalBase = precioTotal;
    
    let totalTrasDescuento = totalBase;
    let descuentoAplicado = 0;
    
    if (descuentoTipo === 'monto' && descValue > 0) {
      descuentoAplicado = Math.min(descValue, totalBase); 
      totalTrasDescuento = Math.max(0, totalBase - descuentoAplicado);
    } else if (descuentoTipo === 'porcentaje' && descValue > 0) {
      const pct = Math.min(descValue, 100) / 100;
      descuentoAplicado = totalBase * pct;
      totalTrasDescuento = Math.max(0, totalBase - descuentoAplicado);
    }

    const recargo = medioPago === 'TARJETA' ? totalTrasDescuento * RECARGO_TARJETA_PCT : 0;
    
    const comisionPctDecimal = (comisionPct !== undefined && comisionPct !== null) 
      ? Math.min(comisionPct, 100) / 100 
      : DEFAULT_COMISION_PCT;
      
    const comisionCalculada = totalTrasDescuento * comisionPctDecimal;

    const totalFinal = totalTrasDescuento + recargo;
    
    return {
      totalBase: parseFloat(totalBase.toFixed(2)),
      descuentoAplicado: parseFloat(descuentoAplicado.toFixed(2)),
      totalTrasDescuento: parseFloat(totalTrasDescuento.toFixed(2)),
      recargoCalculado: parseFloat(recargo.toFixed(2)),
      comisionCalculada: parseFloat(comisionCalculada.toFixed(2)),
      totalFinal: parseFloat(totalFinal.toFixed(2)),
    };
  }, [precioTotal, descuentoTipo, descuentoValor, medioPago, comisionPct]);

  const handleVentaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!servicio || !trabajadorId) {
      alert("Completa los campos requeridos (*).");
      return;
    }

    const numDescuentoValor = parseFloat(descuentoValor) || 0;

    const req: VentaReq = {
      servicioId: servicio.id,
      trabajadorId: Number(trabajadorId),
      clienteNombre,
      medioPago,
    };

    if (descuentoTipo === 'monto' && numDescuentoValor > 0) req.descuentoMonto = Number(numDescuentoValor.toFixed(2));
    if (descuentoTipo === 'porcentaje' && numDescuentoValor > 0) req.descuentoPct = Number((numDescuentoValor / 100).toFixed(4));
    
    const finalComisionPct = comisionPct !== undefined ? comisionPct : DEFAULT_COMISION_PCT * 100;
    req.porcentajeComision = Number((finalComisionPct / 100).toFixed(4));
    
    await onVentaSubmit(req); 
    setOpen(false);
    // reset de estados
    setTrabajadorId('');
    setClienteNombre('GENÉRICO');
    setMedioPago('EFECTIVO');
    setDescuentoTipo('ninguno');
    setDescuentoValor('0'); 
    setComisionPct(undefined);
  };

  if (!servicio) return null;
  
  const displayComisionPct = comisionPct !== undefined ? comisionPct : DEFAULT_COMISION_PCT * 100;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-4xl p-0"> 
        
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="text-xl font-bold">Registrar Venta de Servicio</DialogTitle>
          <DialogDescription className="text-base text-gray-700">
            Servicio: <span className={`font-semibold ${PRIMARY_COLOR_CLASS}`}>{servicio.nombre}</span>. Por favor, complete los detalles de la transacción.
          </DialogDescription>
        </DialogHeader>

        {/* CONTENEDOR PRINCIPAL */}
        <div className="grid grid-cols-5 p-0">
          
          {/* COLUMNA 1: FORMULARIO DE REGISTRO */}
          <form onSubmit={handleVentaSubmit} className="col-span-3 p-6 space-y-4">
             
            {/* Detalles del Servicio */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Precio Total (S/)</Label>
                <Input value={`${precioTotal.toFixed(2)}`} readOnly className="font-semibold text-base border-gray-300" />
              </div>

              <div className="space-y-1">
                <Label>Duración (min)</Label>
                <Input value={`${servicio.duracionMin} min`} readOnly className="font-semibold text-base border-gray-300" />
              </div>
            </div>

            {/* Datos de la Transacción */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Nombre del Cliente (*)</Label>
                <Input value={clienteNombre} onChange={(e) => setClienteNombre(e.target.value)} required />
              </div>

              <div className="space-y-1">
                <Label>Empleado que Atiende (*)</Label>
                <Select value={trabajadorId} onValueChange={setTrabajadorId} required>
                  <SelectTrigger disabled={trabajadores.length === 0}>
                    <SelectValue placeholder={trabajadores.length ? "Selecciona el empleado" : "Cargando..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {trabajadores.map(t => (
                      <SelectItem key={t.id} value={String(t.id)}>
                        {t.nombreCompleto}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Método de Pago (*)</Label>
                <Select value={medioPago} onValueChange={(v) => setMedioPago(v as MedioPago)} required>
                  <SelectTrigger><SelectValue placeholder="Selecciona el método" /></SelectTrigger>
                  <SelectContent>
                    {MEDIOS_PAGO.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Comisión Trabajador (%)</Label>
                <Input
                  type="number" min="0" max="100" placeholder={`${DEFAULT_COMISION_PCT * 100}`}
                  value={comisionPct ?? ''}
                  onChange={(e) => setComisionPct(e.target.value ? parseFloat(e.target.value) : undefined)}
                />
                <p className="text-xs text-muted-foreground">
                  Valor por defecto: {DEFAULT_COMISION_PCT * 100}%.
                </p>
              </div>
            </div>

            {/* Descuento */}
            <div className="pt-4 space-y-4">
              <h3 className={`text-base font-bold ${PRIMARY_COLOR_CLASS}`}>Aplicar Descuento (Opcional)</h3>
              <div className="grid grid-cols-2 gap-3 items-end">
                <div className="space-y-1">
                  <Label>Tipo de Descuento</Label>
                  <Select
                    value={descuentoTipo}
                    onValueChange={(v: 'ninguno' | 'monto' | 'porcentaje') => {
                      setDescuentoTipo(v);
                      setDescuentoValor('0'); 
                    }}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ninguno">Sin Descuento</SelectItem>
                      <SelectItem value="monto">Monto Fijo (S/)</SelectItem>
                      <SelectItem value="porcentaje">Porcentaje (%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label>Valor de Descuento</Label>
                  <Input
                    type="number" min="0" step="0.01" disabled={descuentoTipo === 'ninguno'}
                    value={descuentoValor}
                    onChange={(e) => setDescuentoValor(e.target.value)} 
                    placeholder={descuentoTipo === 'monto' ? 'Ej: 5.00' : 'Ej: 10'}
                  />
                </div>
              </div>
            </div>

            {/* Botones de Acción */}
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" className={PRIMARY_BUTTON_CLASS}>
                Confirmar Venta
              </Button>
            </div>
          </form>


          {/* COLUMNA 2: RESUMEN Y CÁLCULOS */}
          <div className="col-span-2 p-6 bg-gray-50 border-l border-gray-200">
            
            <h3 className={`text-xl font-bold ${PRIMARY_COLOR_CLASS} mb-4`}>Desglose Financiero</h3>
            <div className="space-y-1.5">
              
              {/* --- LÍNEAS DE MONTO --- */}
              <Stat label="Precio Total Base" value={totalBase} textClass="font-bold" />
              <Stat label="Costo Interno Total" value={costoTotalInterno} textClass="text-gray-500" />
              
              <hr className="my-2 border-gray-200" />
              
              <Stat label="Descuento Aplicado" value={descuentoAplicado} isNegative={descuentoAplicado > 0} />
              <Stat label="Subtotal Neto Ingreso" value={totalTrasDescuento} textClass="font-bold" />
              
              {/* Recargo Tarjeta (si aplica) */}
              {medioPago === 'TARJETA' && (
                <Stat 
                  label={`Recargo Tarjeta (${RECARGO_TARJETA_PCT * 100}%)`} 
                  value={recargoCalculado} 
                  textClass="text-orange-600"
                />
              )}
              
              {/* Comisión */}
              <Stat 
                label={`Comisión (${displayComisionPct}%)`} 
                value={comisionCalculada} 
                isNegative={comisionCalculada > 0} 
              />
              
              <hr className={`my-2 border-2 border-green-200`} /> {/* Borde de color verde claro */}
              
              {/* TOTAL COBRADO (Cliente) */}
              <Stat 
                label="TOTAL COBRADO (Cliente)" 
                value={totalFinal} 
                isFinal 
                textClass={PRIMARY_COLOR_CLASS}
              />

            </div>
          </div>
        </div>

      </DialogContent>
    </Dialog>
  );
}