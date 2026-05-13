import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { useAuthStore } from "@/stores/useAuthStore";
import { useFleetStore } from "@/stores/useFleetStore";
import type { UserRole } from "@/types";
import {
  LayoutDashboard,
  Users,
  Wrench,
  MapPin,
  Shield,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  ClipboardList,
  CreditCard,
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
  roles: UserRole[];
}

const navItems: NavItem[] = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard, roles: ["admin", "sales", "tech", "client"] },
  { label: "CRM", path: "/crm", icon: Users, roles: ["admin", "sales"] },
  { label: "Services", path: "/services", icon: Wrench, roles: ["admin", "tech"] },
  { label: "Fleet", path: "/fleet", icon: MapPin, roles: ["admin", "tech", "client"] },
  { label: "Client Portal", path: "/portal", icon: Shield, roles: ["admin", "client"] },
  { label: "Billing", path: "/billing", icon: CreditCard, roles: ["admin", "client"] },
  { label: "Reports", path: "/reports", icon: ClipboardList, roles: ["admin", "sales", "tech"] },
  { label: "Settings", path: "/settings", icon: Settings, roles: ["admin", "sales", "tech", "client"] },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, login, switchRole, logout, isAuthenticated } = useAuthStore();
  const { startSimulation, stopSimulation } = useFleetStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [magicLinkEmail, setMagicLinkEmail] = useState("");
  const [magicLinkGenerated, setMagicLinkGenerated] = useState("");

  useEffect(() => {
    if (isAuthenticated) {
      startSimulation();
    }
    return () => stopSimulation();
  }, [isAuthenticated, startSimulation, stopSimulation]);

  const handleRoleChange = (role: UserRole) => {
    switchRole(role);
    navigate("/");
  };

  const handleMagicLink = () => {
    if (magicLinkEmail) {
      const link = useAuthStore.getState().generateMagicLink(magicLinkEmail);
      setMagicLinkGenerated(link);
      setTimeout(() => setMagicLinkGenerated(""), 5000);
    }
  };

  const filteredNav = navItems.filter((item) =>
    user ? item.roles.includes(user.role) : false
  );

  if (!isAuthenticated || !user) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`flex flex-col border-r border-gray-200 bg-white transition-all duration-300 ${collapsed ? "w-[60px]" : "w-[200px]"
          }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 px-3 py-4 border-b border-gray-200">
          <div className="flex items-center justify-center w-8 h-8 rounded shrink-0">
            <img src="/NEXTOS%20LOGO.png" alt="NexTOS" className="w-8 h-8 object-contain" />
          </div>
          {!collapsed && (
            <div>
              <div className="text-gray-900 font-bold text-sm tracking-tight">NexTOS</div>
              <div className="text-gray-500 text-[10px] tracking-[0.1em] uppercase font-mono-tech">
                SMI Platform
              </div>
            </div>
          )}
        </div>

        {/* Role Selector */}
        {!collapsed && (
          <div className="px-3 py-3 border-b border-gray-200">
            <label className="text-[10px] text-gray-500 uppercase tracking-[0.1em] font-medium mb-1 block">
              Role
            </label>
            <Select value={user.role} onValueChange={(v) => handleRoleChange(v as UserRole)}>
              <SelectTrigger className="h-8 bg-gray-50 border-gray-200 text-gray-900 text-xs">
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

        {/* Navigation */}
        <nav className="flex-1 py-2 overflow-y-auto">
          {filteredNav.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-all duration-200 ${isActive
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

        {/* Magic Link Section */}
        {!collapsed && (
          <div className="px-3 py-3 border-t border-gray-200">
            <label className="text-[10px] text-gray-500 uppercase tracking-[0.1em] font-medium mb-1 block">
              Magic Link
            </label>
            <input
              type="email"
              value={magicLinkEmail}
              onChange={(e) => setMagicLinkEmail(e.target.value)}
              placeholder="client@email.com"
              className="w-full h-7 px-2 text-[11px] bg-gray-50 border border-gray-200 rounded text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#66B2B2]/50"
            />
            <Button
              onClick={handleMagicLink}
              size="sm"
              className="w-full mt-1.5 h-6 text-[10px] bg-[#66B2B2] hover:bg-[#66B2B2]/80 text-white font-semibold"
            >
              Generate Link
            </Button>
            {magicLinkGenerated && (
              <div className="mt-1.5 text-[9px] text-[#10B981] font-mono-tech break-all">
                Link copied!
              </div>
            )}
          </div>
        )}

        {/* User Profile */}
        <div className="px-3 py-3 border-t border-gray-200">
          <div className={`flex items-center gap-2 ${collapsed ? "justify-center" : ""}`}>
            <div className="w-7 h-7 rounded-full bg-[#66B2B2] flex items-center justify-center text-white text-[10px] font-bold shrink-0">
              {user.avatar}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <div className="text-[11px] text-gray-900 font-medium truncate">{user.name}</div>
                <div className="text-[9px] text-gray-500 truncate">{user.email}</div>
              </div>
            )}
          </div>
          {!collapsed && (
            <Button
              onClick={logout}
              variant="ghost"
              size="sm"
              className="w-full mt-2 h-6 text-[10px] text-gray-500 hover:text-[#EF4444] hover:bg-[#EF4444]/10"
            >
              <LogOut className="w-3 h-3 mr-1" />
              Logout
            </Button>
          )}
        </div>

        {/* Collapse Toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute top-1/2 -right-3 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center text-[#66B2B2] hover:bg-[#66B2B2]/10 transition-colors shadow-sm"
        >
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-gray-100 relative">
        <div className="relative z-10 p-5">{children}</div>
      </main>
    </div>
  );
}
