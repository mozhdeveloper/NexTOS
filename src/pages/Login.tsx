import { useState } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import type { UserRole } from "@/types";
import { Button } from "@/components/ui/button";
import { Zap, Shield, TrendingUp, Wrench, Radio } from "lucide-react";

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
    <div className="min-h-screen w-full bg-[#050505] flex items-center justify-center relative overflow-hidden">
      {/* Background grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            repeating-linear-gradient(0deg, transparent, transparent 49px, rgba(255,255,255,0.015) 49px, rgba(255,255,255,0.015) 50px),
            repeating-linear-gradient(90deg, transparent, transparent 49px, rgba(255,255,255,0.015) 49px, rgba(255,255,255,0.015) 50px)
          `,
        }}
      />
      {/* Radial gradient */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at 30% 50%, rgba(242,169,0,0.03) 0%, transparent 60%)",
        }}
      />

      <div className="relative z-10 w-full max-w-md mx-4">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-lg bg-[#F2A900] mb-4 shadow-lg shadow-[#F2A900]/20">
            <Zap className="w-9 h-9 text-[#050505]" />
          </div>
          <h1 className="text-3xl font-bold text-[#EAEAEA] tracking-tight">NexTOS</h1>
          <p className="text-sm text-[#88888C] mt-1 font-mono-tech">Security & Management Intelligence</p>
        </div>

        {/* Login Card */}
        <div className="void-glass rounded-lg p-6">
          <h2 className="text-lg font-semibold text-[#EAEAEA] mb-1">Select Role</h2>
          <p className="text-xs text-[#88888C] mb-4">Choose your role to access the platform</p>

          <div className="space-y-2 mb-6">
            {roles.map((role) => {
              const isSelected = selectedRole === role.value;
              return (
                <button
                  key={role.value}
                  onClick={() => setSelectedRole(role.value)}
                  className={`w-full flex items-center gap-3 p-3 rounded border transition-all duration-200 ${
                    isSelected
                      ? "border-[#F2A900] bg-[#F2A900]/10 shadow-md shadow-[#F2A900]/5"
                      : "border-white/5 bg-[#1A1A20]/50 hover:border-white/10 hover:bg-[#1A1A20]"
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded flex items-center justify-center ${
                      isSelected ? "bg-[#F2A900]" : "bg-[#2A2A30]"
                    }`}
                  >
                    <role.icon
                      className={`w-4 h-4 ${isSelected ? "text-[#050505]" : "text-[#88888C]"}`}
                    />
                  </div>
                  <div className="text-left">
                    <div
                      className={`text-sm font-medium ${isSelected ? "text-[#F2A900]" : "text-[#EAEAEA]"}`}
                    >
                      {role.label}
                    </div>
                    <div className="text-[11px] text-[#88888C]">{role.desc}</div>
                  </div>
                  {isSelected && (
                    <div className="ml-auto w-2 h-2 rounded-full bg-[#F2A900] shadow-sm shadow-[#F2A900]/50" />
                  )}
                </button>
              );
            })}
          </div>

          <Button
            onClick={() => login(selectedRole, selectedRole === "client" ? 1 : undefined)}
            className="w-full h-10 bg-[#F2A900] hover:bg-[#F2A900]/80 text-[#050505] font-bold text-sm"
          >
            Access Platform
          </Button>

          <div className="mt-4 text-center">
            <p className="text-[10px] text-[#88888C] font-mono-tech">
              Demo Mode — No credentials required
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
