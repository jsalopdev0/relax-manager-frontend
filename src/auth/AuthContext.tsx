import { createContext, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import axiosInstance from "@/api/axiosInstance";
import { clearAuth, getToken, getUser, saveAuth } from "./authStorage";
import type { Role } from "./roles";

type User = {
  username: string;
  rol: Role;
};

type LoginRequest = {
  username: string;
  password: string;
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (data: LoginRequest) => Promise<void>;
  logout: () => void;
  hasRole: (...roles: Role[]) => boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(getUser());
  const [token, setToken] = useState<string | null>(getToken());

  const login = async (data: LoginRequest) => {
    const response = await axiosInstance.post("/auth/login", data);

    const { token, username, rol } = response.data;

    saveAuth(token, { username, rol });
    setToken(token);
    setUser({ username, rol });
  };

  const logout = () => {
    clearAuth();
    setToken(null);
    setUser(null);
  };

  const hasRole = (...roles: Role[]) => {
    if (!user) return false;
    return roles.includes(user.rol);
  };

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: !!token,
      login,
      logout,
      hasRole,
    }),
    [user, token]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }

  return context;
}