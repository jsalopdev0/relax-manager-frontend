import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import type { Role } from "./roles";

type Props = {
  children: React.ReactNode;
  allowedRoles?: Role[];
};

export function ProtectedRoute({ children, allowedRoles }: Props) {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.rol)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}