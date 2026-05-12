import { useState } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import type { UserRole } from "@/types";
import { Button } from "@/components/ui/button";
import { Shield, TrendingUp, Wrench, Radio } from "lucide-react";

export default function Login() {
  const { login } = useAuthStore();
  const [selectedRole, setSelectedRole] = useState<UserRole>("admin");

  const roles: { value: UserRole; label: string; icon: React.ElementType; desc: string }[] = [
    { value: "admin", label: "Administrator", icon: Shield, desc: "Full system access" },
    { value: "sales", label: "Sales Manager", icon: TrendingUp, desc: "CRM & pipeline" },
    { value: "tech", label: "Technician", icon: Wrench, desc: "Services & fleet" },
    { value: "client", label: "Client", icon: Radio, desc: "Portal & billing" },
  ];

  return (
    <div className="min-h-screen w-full bg-gray-50 flex items-center justify-center relative overflow-hidden">
      {/* Subtle background pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage: `
            repeating-linear-gradient(0deg, transparent, transparent 49px, rgba(102,178,178,0.04) 49px, rgba(102,178,178,0.04) 50px),
            repeating-linear-gradient(90deg, transparent, transparent 49px, rgba(102,178,178,0.04) 49px, rgba(102,178,178,0.04) 50px)
          `,
        }}
      />
      {/* Radial gradient */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at 30% 50%, rgba(102,178,178,0.06) 0%, transparent 60%)",
        }}
      />

      <div className="relative z-10 w-full max-w-md mx-4">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <img src="/NEXTOS%20NAME.png" alt="NexTOS" className="h-20 object-contain" />
          </div>
          <p className="text-sm text-gray-500 mt-1 font-mono-tech">Security & Management Intelligence Platform</p>
        </div>

        {/* Login Card */}
        <div className="void-glass rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Select Role</h2>
          <p className="text-xs text-gray-500 mb-4">Choose your role to access the platform</p>

          <div className="space-y-2 mb-6">
            {roles.map((role) => {
              const isSelected = selectedRole === role.value;
              return (
                <button
                  key={role.value}
                  onClick={() => setSelectedRole(role.value)}
                  className={`w-full flex items-center gap-3 p-3 rounded border transition-all duration-200 ${isSelected
                    ? "border-[#66B2B2] bg-[#66B2B2]/10 shadow-md shadow-[#66B2B2]/10"
                    : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                    }`}
                >
                  <div
                    className={`w-9 h-9 rounded flex items-center justify-center ${isSelected ? "bg-[#66B2B2]" : "bg-gray-100"
                      }`}
                  >
                    <role.icon
                      className={`w-4 h-4 ${isSelected ? "text-white" : "text-gray-500"}`}
                    />
                  </div>
                  <div className="text-left">
                    <div
                      className={`text-sm font-medium ${isSelected ? "text-[#66B2B2]" : "text-gray-900"}`}
                    >
                      {role.label}
                    </div>
                    <div className="text-[11px] text-gray-500">{role.desc}</div>
                  </div>
                  {isSelected && (
                    <div className="ml-auto w-2 h-2 rounded-full bg-[#66B2B2] shadow-sm shadow-[#66B2B2]/50" />
                  )}
                </button>
              );
            })}
          </div>

          <Button
            onClick={() => login(selectedRole)}
            className="w-full h-10 bg-[#66B2B2] hover:bg-[#66B2B2]/80 text-white font-bold text-sm"
          >
            Access Platform
          </Button>

          <div className="mt-4 text-center">
            <p className="text-[10px] text-gray-500 font-mono-tech">
              Demo Mode — No credentials required
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
