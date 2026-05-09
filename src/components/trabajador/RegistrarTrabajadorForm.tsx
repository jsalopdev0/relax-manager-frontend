import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Definir el esquema de validación con Zod
const trabajadorSchema = z.object({
  nombreCompleto: z.string().min(1, "Nombre completo es obligatorio"),
  telefono: z.string().min(1, "Teléfono es obligatorio"),
  email: z.string().email("Formato de correo inválido"),
  tipoDocumento: z.string().min(1, "Tipo de documento es obligatorio"),
  numeroDocumento: z.string().min(1, "Número de documento es obligatorio"),

  fechaIngreso: z.string().min(1, "Fecha de ingreso es obligatoria"),
});

type TrabajadorForm = z.infer<typeof trabajadorSchema>;

interface Props {
  open: boolean;
  setOpen: (open: boolean) => void;
  onSubmit: (data: TrabajadorForm) => void;
}

const RegistrarTrabajadorForm: React.FC<Props> = ({
  open,
  setOpen,
  onSubmit,
}) => {
  const form = useForm<TrabajadorForm>({
    resolver: zodResolver(trabajadorSchema),
    defaultValues: {
      nombreCompleto: "",
      telefono: "",
      email: "",
      tipoDocumento: "DNI", // Valor por defecto
      numeroDocumento: "",
      fechaIngreso: new Date().toLocaleDateString("en-CA"), // Obtiene la fecha actual en formato 'YYYY-MM-DD'
    },
  });
  const { toast } = useToast();

  const handleFormSubmit = (data: TrabajadorForm) => {
    onSubmit(data);
    toast({
      title: "Trabajador registrado",
      description: "El trabajador ha sido registrado exitosamente.",
    });
    setOpen(false); // Cerrar el diálogo
    form.reset(); // Limpiar el formulario
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold">
            Registrar Nuevo Trabajador
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleFormSubmit)}
            className="space-y-4"
          >
            {/* Nombre Completo */}
            <FormField
              control={form.control}
              name="nombreCompleto"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre Completo</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ingrese el nombre completo"
                      {...field}
                      className="px-4 py-2 mt-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Teléfono */}
            <FormField
              control={form.control}
              name="telefono"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teléfono</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ingrese el teléfono"
                      {...field}
                      className="px-4 py-2 mt-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Email */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ingrese el email"
                      {...field}
                      className="px-4 py-2 mt-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Tipo de Documento (Dropdown estilizado) */}
            <FormField
              control={form.control}
              name="tipoDocumento"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Documento</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className="w-full mt-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
                        <SelectValue placeholder="Seleccione un tipo de documento" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DNI">DNI</SelectItem>
                        <SelectItem value="CE">
                          Carnet de Extranjería
                        </SelectItem>
                        <SelectItem value="PASAPORTE">Pasaporte</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Número de Documento */}
            <FormField
              control={form.control}
              name="numeroDocumento"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número de Documento</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Número de documento"
                      {...field}
                      className="px-4 py-2 mt-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Fecha de Ingreso */}
            <FormField
              control={form.control}
              name="fechaIngreso"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha de Ingreso</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      placeholder="YYYY-MM-DD"
                      {...field}
                      className="px-4 py-2 mt-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                className="flex-1 bg-primary text-white hover:bg-primary/90"
              >
                Registrar Trabajador
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default RegistrarTrabajadorForm;
