import React, { useState, useEffect, useMemo } from "react";
import { obtenerServicios } from "../api/servicios";
import { obtenerTrabajadores } from "../api/trabajadores";
import { crearVenta } from "../api/ventas";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/auth/AuthContext";
import { ROLES } from "@/auth/roles";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Clock, Coins, Edit } from "lucide-react";
import CrearServicioForm from "@/components/servicio/CrearServicioForm";
import RegistrarVentaModal from "@/components/venta/RegistrarVentaModal";

interface Servicio {
  id: number;
  nombre: string;
  descripcion: string;
  precio: number;
  duracionMin: number;
  costoInterno: number;
  categoriaId: number;
  categoriaNombre: string;
  activo: boolean;
}

interface Trabajador {
  id: number;
  nombreCompleto: string;
  activo: boolean;
}

const groupServicesByCategory = (
  services: Servicio[]
): Record<string, Servicio[]> => {
  return services.reduce((acc, service) => {
    const category = service.categoriaNombre;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(service);
    return acc;
  }, {} as Record<string, Servicio[]>);
};

interface VentaReq {
  servicioId: number;
  trabajadorId: number;
  medioPago: string;
  clienteNombre: string;
  porcentajeComision?: number;
  descuentoPct?: number;
  descuentoMonto?: number;
}

export default function Servicios() {
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);
  const [loading, setLoading] = useState(true);

  const [isCrearModalOpen, setIsCrearModalOpen] = useState(false);
  const [isVentaModalOpen, setIsVentaModalOpen] = useState(false);
  const [servicioSeleccionado, setServicioSeleccionado] =
    useState<Servicio | null>(null);

  const { toast } = useToast();
  const { hasRole } = useAuth();

  const isAdmin = hasRole(ROLES.ADMIN);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true);

        const [serviciosRes, trabajadoresRes] = await Promise.all([
          obtenerServicios(false),     // solo activos
          obtenerTrabajadores(false),  // solo activos
        ]);

        setServicios(serviciosRes.data as Servicio[]);
        setTrabajadores(trabajadoresRes.data as Trabajador[]);
      } catch (error: any) {
        console.error("Error al cargar datos:", error.response || error);

        toast({
          title: "Error de conexión",
          description:
            error.response?.status === 403
              ? "No tienes permisos para cargar servicios o trabajadores."
              : "No se pudieron cargar los datos iniciales (servicios/trabajadores).",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [toast]);

  const serviciosAgrupados = useMemo(() => {
    return groupServicesByCategory(servicios);
  }, [servicios]);

  const handleOpenCrearModal = () => {
    if (!isAdmin) return;
    setIsCrearModalOpen(true);
  };

  const handleReservar = (service: Servicio) => {
    setServicioSeleccionado(service);
    setIsVentaModalOpen(true);
  };

  const handleEditar = (service: Servicio) => {
    if (!isAdmin) return;
    console.log("Editando servicio:", service.nombre);
  };

  const agregarServicio = (servicioDesdeApi: Servicio) => {
    setServicios((prev) => [servicioDesdeApi, ...prev]);
  };

  const handleVentaSubmit = async (ventaData: VentaReq) => {
    try {
      await crearVenta(ventaData);

      toast({
        title: "Venta Registrada 🎉",
        description: `Venta de ${
          servicioSeleccionado?.nombre || "servicio"
        } completada.`,
      });
    } catch (error: any) {
      console.error("Error al registrar la venta:", error.response || error);

      toast({
        title: "Error al registrar la Venta",
        description:
          error.response?.data?.message ||
          "Hubo un error al conectar con el servidor.",
        variant: "destructive",
      });

      throw error;
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-xl text-muted-foreground">
        Cargando catálogo y personal...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            Catálogo de Servicios
          </h1>
          <p className="text-muted-foreground mt-2">
            Gestiona los servicios de masajes y terapias disponibles.
          </p>
        </div>

        {isAdmin && (
          <Button
            className="bg-primary hover:bg-primary/90"
            onClick={handleOpenCrearModal}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Servicio
          </Button>
        )}
      </div>

      <div className="space-y-10">
        {Object.entries(serviciosAgrupados).map(
          ([categoria, serviciosDeCategoria]) => (
            <div key={categoria} className="space-y-6">
              <h2 className="text-2xl font-semibold border-b pb-2 text-foreground/80">
                {categoria}
              </h2>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {serviciosDeCategoria.map((service) => (
                  <Card key={service.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-xl font-bold text-primary-dark">
                          {service.nombre}
                        </CardTitle>

                        <Badge
                          variant={service.activo ? "default" : "secondary"}
                          className={
                            service.activo
                              ? "bg-green-100 text-green-800 hover:bg-green-100"
                              : ""
                          }
                        >
                          {service.activo ? "Activo" : "Inactivo"}
                        </Badge>
                      </div>

                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {service.descripcion || "Servicio sin descripción."}
                      </p>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      <div className="flex justify-between items-center border-t pt-4">
                        <div className="flex items-center gap-1 text-lg font-semibold text-green-600">
                          <Coins className="h-5 w-5 mr-1" />
                          S/ {parseFloat(String(service.precio)).toFixed(2)}
                        </div>

                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          {service.duracionMin} min
                        </div>
                      </div>

                      <div className="pt-2 flex gap-2">

                        <Button
                          className={`${
                            isAdmin ? "flex-1" : "w-full"
                          } bg-primary hover:bg-primary/90`}
                          onClick={() => handleReservar(service)}
                          disabled={!service.activo}
                        >
                          Reservar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )
        )}
      </div>

      {isAdmin && (
        <CrearServicioForm
          open={isCrearModalOpen}
          setOpen={setIsCrearModalOpen}
          onSubmit={agregarServicio}
        />
      )}

      <RegistrarVentaModal
        open={isVentaModalOpen}
        setOpen={setIsVentaModalOpen}
        servicio={servicioSeleccionado}
        trabajadores={trabajadores}
        onVentaSubmit={handleVentaSubmit}
      />
    </div>
  );
}