import { useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { useOperationsStore } from "@/stores/useOperationsStore";
import { Loader2 } from "lucide-react";

export default function AssetScanner() {
  const { serial } = useParams();
  const navigate = useNavigate();
  const { equipment } = useOperationsStore();

  useEffect(() => {
    if (serial) {
      // Find the equipment with this serial number
      const unit = equipment.find((e) => e.serialNumber === serial);
      
      if (unit) {
        // Redirec t to services page with this unit selected
        // We pass the state so the Services page knows to select it
        navigate("/services", { state: { selectedUnitId: unit.id } });
      } else {
        // If not found, show 404 or go to services
        navigate("/not-found");
      }
    }
  }, [serial, equipment, navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#050505] text-[#EAEAEA]">
      <div className="relative">
        <div className="absolute inset-0 bg-[#F2A900]/20 blur-xl rounded-full animate-pulse" />
        <Loader2 className="w-12 h-12 text-[#F2A900] animate-spin relative z-10" />
      </div>
      <h2 className="mt-6 text-xl font-bold tracking-tight">Syncing Asset...</h2>
      <p className="mt-2 text-sm text-[#88888C] font-mono-tech">Serial: {serial}</p>
    </div>
  );
}
