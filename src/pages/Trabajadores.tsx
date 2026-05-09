import React, { useState, useEffect } from 'react';
import { obtenerTrabajadores, crearTrabajador } from '../api/trabajadores'; // Importamos las funciones de la API
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Phone, FileText, DollarSign } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import RegistrarTrabajadorForm from "@/components/trabajador/RegistrarTrabajadorForm"; // Importamos el formulario
import { useToast } from "@/hooks/use-toast"; // Asegúrate de importar el toast

export default function Trabajadores() {
  const [trabajadores, setTrabajadores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);  // Controlar el estado del modal
  const { toast } = useToast();  // Usamos el toast

  useEffect(() => {
    obtenerTrabajadores(true)  // Obtener trabajadores activos
      .then((response) => {
        setTrabajadores(response.data);  // Asignar los datos obtenidos
        setLoading(false);  // Dejar de mostrar el loader
      })
      .catch((error) => {
        console.error('Error al obtener trabajadores:', error);
        setLoading(false);  // Dejar de mostrar el loader en caso de error
      });
  }, []);

  // Función para agregar un nuevo trabajador a la lista y enviarlo al backend
  const agregarTrabajador = (data) => {
    // Llamada a la API para registrar el trabajador
    crearTrabajador(data)
      .then((response) => {
        setTrabajadores([response.data, ...trabajadores]); // Asegúrate de usar la respuesta del servidor
        toast({
          title: "Trabajador registrado",
          description: "El trabajador ha sido registrado exitosamente.",
        });
      })
      .catch((error) => {
        console.error('Error al registrar trabajador:', error);
        toast({
          title: "Error",
          description: "Hubo un problema al registrar al trabajador.",
          variant: 'destructive',
        });
      });
  };

  if (loading) {
    return <div>Cargando...</div>; // Muestra un mensaje de carga mientras se obtienen los datos
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            Trabajadores
          </h1>
          <p className="text-muted-foreground mt-2">
            Gestiona tu equipo de terapeutas y especialistas
          </p>
        </div>
        <Button className="bg-primary hover:bg-primary/90" onClick={() => setOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Nuevo Trabajador
        </Button>
      </div>

      {/* Workers Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {trabajadores.map((worker) => (
          <Card key={worker.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12 border-2 border-primary/20">
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {worker.nombreCompleto
                        ? worker.nombreCompleto.split(" ").map((n) => n[0]).join("")
                        : "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">{worker.nombreCompleto}</CardTitle>
                  </div>
                </div>
                <Badge
                  variant={worker.activo ? "default" : "secondary"}
                  className={worker.activo ? "bg-green-100 text-green-800 hover:bg-green-100" : ""}
                >
                  {worker.activo ? "Activo" : "Inactivo"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Teléfono</span>
                  <span className="font-medium text-foreground">{worker.telefono}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Fecha Ingreso</span>
                  <span className="font-medium text-foreground">{worker.fechaIngreso}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Tipo Documento</span>
                  <span className="font-medium text-foreground">{worker.tipoDocumento}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Número Documento</span>
                  <span className="font-medium text-foreground">{worker.numeroDocumento}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-border space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span>{worker.email}</span>
                </div>
              </div>

              
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Formulario para agregar trabajador */}
      <RegistrarTrabajadorForm open={open} setOpen={setOpen} onSubmit={agregarTrabajador} />
    </div>
  );
}
