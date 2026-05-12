import { useState } from "react";
import { useNavigate, useLocation } from "react-router";
import { useAuthStore } from "@/stores/useAuthStore";
import { useCRMStore } from "@/stores/useCRMStore";
import type { UserRole } from "@/types";
import {
  LayoutDashboard,
  Monitor,
  History,
  Calendar,
  Package,
  CreditCard,
  FileText,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { label: "Dashboard",       path: "/client",           icon: LayoutDashboard },
  { label: "My Equipment",    path: "/client/equipment", icon: Monitor         },
  { label: "Service History", path: "/client/history",   icon: History         },
  { label: "Bookings",        path: "/client/bookings",  icon: Calendar        },
  { label: "Packages",        path: "/client/packages",  icon: Package         },
  { label: "Billing",         path: "/client/billing",   icon: CreditCard      },
  { label: "Reports",         path: "/client/reports",   icon: FileText        },
];

export default function ClientPortalShell({ children }: { children: React.ReactNode }) {
  const { user, switchRole, logout } = useAuthStore();
  const { clients } = useCRMStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const client = clients.find((c) => c.id === user?.clientId);
  const companyName = client?.companyName ?? "Client Portal";

  const handleRoleChange = (role: UserRole) => {
    switchRole(role);
    navigate("/");
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`flex flex-col border-r-2 border-gray-200 bg-white transition-all duration-300 ${
          collapsed ? "w-[60px]" : "w-[220px]"
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 px-3 py-4 border-b border-gray-200">
          <img
            src="/NEXTOS%20LOGO.png"
            alt="NexTOS Logo"
            className="w-8 h-8 object-contain shrink-0"
          />
          {!collapsed && (
            <div>
              <div className="text-gray-900 font-bold text-sm tracking-tight">NexTOS</div>
              <div className="text-gray-500 text-[10px] tracking-[0.1em] uppercase font-mono-tech">
                Client Portal
              </div>
            </div>
          )}
        </div>

        {/* Role Selector */}
        {!collapsed && (
          <div className="px-3 py-3 border-b border-gray-200">
            <label className="text-[10px] text-gray-500 uppercase tracking-[0.1em] font-medium mb-1 block">
              Switch Role
            </label>
            <Select value={user?.role} onValueChange={(v) => handleRoleChange(v as UserRole)}>
              <SelectTrigger className="h-8 bg-white border-gray-200 text-gray-900 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white border-gray-200">
                <SelectItem value="admin" className="text-xs text-gray-900">
                  Administrator
                </SelectItem>
                <SelectItem value="sales" className="text-xs text-gray-900">
                  Sales
                </SelectItem>
                <SelectItem value="tech" className="text-xs text-gray-900">
                  Technician
                </SelectItem>
                <SelectItem value="client" className="text-xs text-gray-900">
                  Client
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Client Company Badge */}
        {!collapsed && (
          <div className="px-3 py-3 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#66B2B2] shrink-0" />
              <div className="min-w-0">
                <div className="text-[11px] text-gray-900 font-semibold leading-tight truncate">
                  {companyName}
                </div>
                <div className="text-[9px] text-[#10B981] uppercase tracking-[0.1em] font-mono-tech">
                  Active Account
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 py-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-all duration-200 ${
                  isActive
                    ? "bg-[#66B2B2]/10 text-[#66B2B2] border-l-2 border-[#66B2B2]"
                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-50 border-l-2 border-transparent"
                } ${collapsed ? "justify-center" : ""}`}
              >
                <item.icon className={`w-4 h-4 shrink-0 ${isActive ? "text-[#66B2B2]" : ""}`} />
                {!collapsed && <span className="text-xs font-medium">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Collapse Toggle */}
        <div className="px-3 py-2 border-t border-gray-200">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center h-7 rounded text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* User Profile */}
        <div className="px-3 py-3 border-t border-gray-200">
          <div className={`flex items-center gap-2 ${collapsed ? "justify-center" : ""}`}>
            <div className="w-7 h-7 rounded-full bg-[#66B2B2] flex items-center justify-center text-white text-[10px] font-bold shrink-0">
              {user?.avatar}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <div className="text-[11px] text-gray-900 font-medium truncate">{user?.name}</div>
                <div className="text-[9px] text-gray-500 truncate">{user?.email}</div>
              </div>
            )}
          </div>
          {!collapsed && (
            <Button
              onClick={handleLogout}
              variant="ghost"
              size="sm"
              className="w-full mt-2 h-6 text-[10px] text-gray-500 hover:text-[#EF4444] hover:bg-[#EF4444]/10"
            >
              <LogOut className="w-3 h-3 mr-1" />
              Logout
            </Button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-gray-50">
        {children}
      </main>
    </div>
  );
}
