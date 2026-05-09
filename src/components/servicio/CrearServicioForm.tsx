import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import axiosInstance from "@/api/axiosInstance";
import { useAuth } from "@/auth/AuthContext";
import { ROLES } from "@/auth/roles";

const servicioSchema = z.object({
  nombre: z.string().min(1, "Nombre del servicio es obligatorio"),
  descripcion: z.string().min(1, "Descripción es obligatoria"),
  precio: z.coerce.number({
    invalid_type_error: "El precio debe ser un número válido",
  }).min(0, "Precio debe ser mayor o igual a 0"),
  duracionMin: z.coerce.number({
    invalid_type_error: "La duración debe ser un número válido",
  }).min(1, "La duración mínima debe ser al menos 1 minuto"),
  costoInterno: z.coerce.number({
    invalid_type_error: "El costo interno debe ser un número válido",
  }).min(0, "Costo interno debe ser mayor o igual a 0"),
  categoriaId: z.string().min(1, "Categoría es obligatoria"),
});

type ServicioForm = z.infer<typeof servicioSchema>;

interface ServicioResponse {
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

interface Props {
  open: boolean;
  setOpen: (open: boolean) => void;
  onSubmit: (data: ServicioResponse) => void;
}

const CrearServicioForm: React.FC<Props> = ({ open, setOpen, onSubmit }) => {
  const { toast } = useToast();
  const { hasRole } = useAuth();

  const isAdmin = hasRole(ROLES.ADMIN);

  const form = useForm<ServicioForm>({
    resolver: zodResolver(servicioSchema),
    defaultValues: {
      nombre: "",
      descripcion: "",
      precio: 0,
      duracionMin: 30,
      costoInterno: 0,
      categoriaId: "",
    },
  });

  const [categorias, setCategorias] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!open || !isAdmin) return;

    setIsLoading(true);

    axiosInstance
      .get("/categorias")
      .then((response) => {
        if (Array.isArray(response.data)) {
          setCategorias(response.data);

          if (response.data.length > 0) {
            form.setValue("categoriaId", response.data[0].id.toString());
          }
        } else {
          toast({
            title: "Error",
            description: "Hubo un problema al cargar las categorías.",
            variant: "destructive",
          });
        }
      })
      .catch((error) => {
        console.error("Error al obtener categorías:", error);
        toast({
          title: "Error",
          description: "No se pudieron obtener las categorías.",
          variant: "destructive",
        });
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [open, isAdmin, toast, form]);

  const handleFormSubmit = async (data: ServicioForm) => {
    if (!isAdmin) {
      toast({
        title: "No autorizado",
        description: "No tienes permisos para crear servicios.",
        variant: "destructive",
      });
      return;
    }

    try {
      const payload = {
        ...data,
        categoriaId: Number(data.categoriaId),
      };

      const response = await axiosInstance.post<ServicioResponse>("/servicios", payload);

      if (response.status === 201 || response.status === 200) {
        onSubmit(response.data);

        toast({
          title: "Servicio creado",
          description: "El servicio ha sido creado exitosamente.",
        });

        setOpen(false);
        form.reset();
      }
    } catch (error) {
      console.error("Error al crear el servicio:", error);
      toast({
        title: "Error",
        description: "Hubo un problema al crear el servicio.",
        variant: "destructive",
      });
    }
  };

  if (!isAdmin) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold">
            Crear Nuevo Servicio
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nombre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del Servicio</FormLabel>
                  <FormControl>
                    <Input placeholder="Nombre del servicio" {...field} className="px-4 py-2 mt-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="descripcion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Input placeholder="Descripción del servicio" {...field} className="px-4 py-2 mt-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="precio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Precio</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="Precio del servicio" {...field} className="px-4 py-2 mt-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="duracionMin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duración Mínima (minutos)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="Duración mínima" {...field} className="px-4 py-2 mt-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="costoInterno"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Costo Interno</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="Costo interno" {...field} className="px-4 py-2 mt-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="categoriaId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoría</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className="w-full mt-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
                        <SelectValue placeholder="Seleccionar categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        {isLoading ? (
                          <SelectItem value="loading" disabled>
                            Cargando categorías...
                          </SelectItem>
                        ) : (
                          categorias.map((categoria) => (
                            <SelectItem key={categoria.id} value={categoria.id.toString()}>
                              {categoria.nombre}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-4">
              <Button type="submit" className="flex-1 bg-primary text-white hover:bg-primary/90">
                Crear Servicio
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default CrearServicioForm;