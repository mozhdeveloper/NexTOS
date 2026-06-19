import { useAuthStore } from "@/stores/useAuthStore";
import { TechnicianRatingsSection } from "@/components/TechnicianRatingsSection";
import { UserCircle, Mail, MapPin, Phone } from "lucide-react";

export default function TechnicianProfile() {
  const { user } = useAuthStore();

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header Profile Section */}
      <div className="data-card p-6 flex flex-col md:flex-row items-center md:items-start gap-6 border border-gray-200">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#66B2B2] to-[#3a7575] flex items-center justify-center text-white text-3xl font-black shadow-lg shadow-[#66B2B2]/20 shrink-0">
          {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
        </div>
        
        <div className="flex-1 text-center md:text-left space-y-2">
          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
            <h1 className="text-2xl font-black text-gray-900">{user.name}</h1>
            <span className="px-2.5 py-0.5 bg-[#66B2B2]/10 text-[#66B2B2] rounded-full text-[10px] font-black uppercase tracking-widest border border-[#66B2B2]/20">
              Senior Technician
            </span>
          </div>
          
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs font-semibold text-gray-500">
            <div className="flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" />
              {user.email}
            </div>
            <div className="flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" />
              +63 917 XXX XXXX
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              Metro Manila Base
            </div>
          </div>
          
          <p className="text-xs text-gray-500 max-w-2xl leading-relaxed pt-2">
            Dedicated service technician specializing in heavy equipment and calibration services. 
            Maintains a strong track record of safety compliance and efficient issue resolution across all client sites.
          </p>
        </div>
      </div>

      {/* Profile Statistics / Ratings */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-gray-900 tracking-tight flex items-center gap-2">
          <UserCircle className="w-5 h-5 text-[#66B2B2]" />
          Performance & Client Feedback
        </h2>
        <TechnicianRatingsSection technicianName={user.name} />
      </div>
    </div>
  );
}
