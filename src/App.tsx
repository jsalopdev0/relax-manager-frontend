import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { BrowserRouter, Routes, Route } from "react-router-dom";

import { DashboardLayout } from "./components/DashboardLayout";

import { ProtectedRoute } from "@/auth/ProtectedRoute";
import { ROLES } from "@/auth/roles";

import Dashboard from "./pages/Dashboard";
import Trabajadores from "./pages/Trabajadores";
import Servicios from "./pages/Servicios";
import Ventas from "./pages/Ventas";
import Reportes from "./pages/Reportes";
import Inventario from "./pages/Inventario";
import Comisiones from "./pages/Comisiones";
import Planilla from "./pages/Planilla";
import Login from "./pages/Login";

import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>

        <Toaster />
        <Sonner />

        <BrowserRouter>

          <Routes>

            {/* LOGIN */}
            <Route path="/login" element={<Login />} />

            {/* DASHBOARD LAYOUT */}
            <Route
              element={
                <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.RECEPCIONISTA]}>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >

              {/* DASHBOARD */}
              <Route
                path="/"
                element={
                  <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.RECEPCIONISTA]}>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />

              {/* SERVICIOS */}
              <Route
                path="/servicios"
                element={
                  <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.RECEPCIONISTA]}>
                    <Servicios />
                  </ProtectedRoute>
                }
              />

              {/* VENTAS */}
              <Route
                path="/ventas"
                element={
                  <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.RECEPCIONISTA]}>
                    <Ventas />
                  </ProtectedRoute>
                }
              />

              {/* TRABAJADORES */}
              <Route
                path="/trabajadores"
                element={
                  <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                    <Trabajadores />
                  </ProtectedRoute>
                }
              />

              {/* REPORTES */}
              <Route
                path="/reportes"
                element={
                  <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                    <Reportes />
                  </ProtectedRoute>
                }
              />

              {/* INVENTARIO */}
              <Route
                path="/inventario"
                element={
                  <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                    <Inventario />
                  </ProtectedRoute>
                }
              />

              {/* COMISIONES */}
              <Route
                path="/comisiones"
                element={
                  <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                    <Comisiones />
                  </ProtectedRoute>
                }
              />

              {/* PLANILLA */}
              <Route
                path="/planilla"
                element={
                  <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                    <Planilla />
                  </ProtectedRoute>
                }
              />

            </Route>

            {/* NOT FOUND */}
            <Route path="*" element={<NotFound />} />

          </Routes>

        </BrowserRouter>

      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;