import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Sparkles,
  FileText,
  DollarSign,
  Receipt,
  ShoppingCart,
  Menu,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/auth/AuthContext";
import { ROLES } from "@/auth/roles";

const useSidebar = () => {
  const [state, setState] = React.useState("expanded");
  const toggle = () =>
    setState((prev) => (prev === "expanded" ? "collapsed" : "expanded"));
  return { state, toggle };
};

const Sidebar = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <nav
    className={`h-screen flex flex-col bg-sidebar-background transition-all duration-300 ${className}`}
  >
    {children}
  </nav>
);

const SidebarContent = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`flex flex-col flex-grow overflow-y-auto ${className}`}>
    {children}
  </div>
);

const SidebarGroup = ({ children }: { children: React.ReactNode }) => <div className="p-2">{children}</div>;

const SidebarGroupLabel = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <h3 className={`text-xs uppercase tracking-wider px-3 mt-4 mb-2 text-muted-foreground ${className}`}>
    {children}
  </h3>
);

const SidebarGroupContent = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;

const SidebarMenu = ({ children }: { children: React.ReactNode }) => (
  <ul className="space-y-1 p-2">{children}</ul>
);

const SidebarMenuItem = ({ children }: { children: React.ReactNode }) => (
  <li className="w-full">{children}</li>
);

const SidebarMenuButton = ({
  children,
  asChild,
  tooltip,
}: {
  children: React.ReactNode;
  asChild?: boolean;
  tooltip?: string;
}) => {
  if (asChild) return <>{children}</>;
  return (
    <button title={tooltip} className="w-full text-left p-2 rounded-lg">
      {children}
    </button>
  );
};

const SidebarTrigger = ({
  className = "",
  onClick,
}: {
  className?: string;
  onClick?: () => void;
}) => (
  <button
    onClick={onClick}
    className={`p-2 rounded-full hover:bg-sidebar-accent/50 transition-colors ${className}`}
  >
    <Menu className="h-5 w-5 text-sidebar-foreground" />
  </button>
);

type MenuItem = {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: string[];
};

const menuItems: MenuItem[] = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
    roles: [ROLES.ADMIN, ROLES.RECEPCIONISTA],
  },
  {
    title: "Trabajadores",
    url: "/trabajadores",
    icon: Users,
    roles: [ROLES.ADMIN],
  },
  {
    title: "Servicios",
    url: "/servicios",
    icon: Sparkles,
    roles: [ROLES.ADMIN, ROLES.RECEPCIONISTA],
  },
  {
    title: "Ventas",
    url: "/ventas",
    icon: ShoppingCart,
    roles: [ROLES.ADMIN, ROLES.RECEPCIONISTA],
  },
  {
    title: "Reportes",
    url: "/reportes",
    icon: FileText,
    roles: [ROLES.ADMIN],
  },
  {
    title: "Comisiones",
    url: "/comisiones",
    icon: DollarSign,
    roles: [ROLES.ADMIN],
  },
  {
    title: "Planilla",
    url: "/planilla",
    icon: Receipt,
    roles: [ROLES.ADMIN],
  },
];

export function AppSidebar() {
  const { state, toggle } = useSidebar();
  const isCollapsed = state === "collapsed";
  const sidebarWidthClass = isCollapsed ? "w-20" : "w-64";

  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const filteredMenuItems = menuItems.filter((item) =>
    user ? item.roles.includes(user.rol) : false
  );

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <Sidebar className={`${sidebarWidthClass} border-r border-sidebar-border`}>
      <SidebarContent>
        <SidebarGroup>
          <div className="flex items-center justify-between px-3 py-4">
            {!isCollapsed && (
              <div className="flex items-center gap-2">
                <div>
                  <h2 className="text-2xl font-bold text-sidebar-foreground">
                    Spa Manager
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Gestión integral
                  </p>
                  {user && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {user.username} · {user.rol}
                    </p>
                  )}
                </div>
              </div>
            )}
            <SidebarTrigger onClick={toggle} className="ml-auto" />
          </div>

          <SidebarGroupLabel className={isCollapsed ? "sr-only" : ""}>
            Menú Principal
          </SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu>
              {filteredMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className={({ isActive }) =>
                        `flex items-center gap-3 p-3 rounded-lg transition-colors w-full
                        ${isCollapsed ? "justify-center" : "justify-start"}
                        ${
                          isActive
                            ? "bg-sidebar-accent text-sidebar-primary font-medium"
                            : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                        }`
                      }
                    >
                      <item.icon className="h-5 w-5" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="mt-auto p-2">
          <button
            onClick={handleLogout}
            className={`flex items-center gap-3 p-3 rounded-lg transition-colors w-full text-sidebar-foreground hover:bg-sidebar-accent/50
            ${isCollapsed ? "justify-center" : "justify-start"}`}
          >
            <LogOut className="h-5 w-5" />
            {!isCollapsed && <span>Cerrar sesión</span>}
          </button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}