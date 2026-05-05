import React from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import { useOperationsStore } from "@/stores/useOperationsStore";
import { Package, ChevronDown, ChevronUp, Wrench } from "lucide-react";

export default function ClientEquipment() {
  const { user } = useAuthStore();
  const { equipment, serviceRecords, servicePhotos } = useOperationsStore();
  const clientId = user?.clientId || 1;

  const clientEquipment = equipment.filter((e) => e.clientId === clientId);
  const clientRecords = serviceRecords.filter((r) => r.clientId === clientId);
  const { useState } = React;
  const [expanded, setExpanded] = useState<number | null>(null);

  const statusBadge = (status: string) => {
    switch (status) {
      case "active":
        return "px-2 py-0.5 rounded text-sm bg-[#10B981]/20 text-[#10B981] font-medium";
      case "maintenance":
        return "px-2 py-0.5 rounded text-sm bg-[#F2A900]/20 text-[#F2A900] font-medium";
      case "inactive":
        return "px-2 py-0.5 rounded text-sm bg-[#88888C]/20 text-[#88888C] font-medium";
      case "retired":
        return "px-2 py-0.5 rounded text-sm bg-[#EF4444]/20 text-[#EF4444] font-medium";
      default:
        return "px-2 py-0.5 rounded text-sm bg-[#88888C]/20 text-[#88888C] font-medium";
    }
  };

  return (
    <div className="space-y-4 px-8 pt-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[32px] font-bold text-[#EAEAEA] tracking-[-0.02em]" >My Equipment</h1>
          <p className="text-sm text-[#88888C] mt-0.5">{clientEquipment.length} units under management</p>
        </div>
      </div>

      <div className="space-y-3">
        {clientEquipment.map((eq) => {
          const eqRecords = clientRecords.filter((r) => r.equipmentId === eq.id);
          const eqPhotos = servicePhotos.filter((p) => eqRecords.some((r) => r.id === p.serviceRecordId));
          const isExpanded = expanded === eq.id;
          const serviceDue = eq.currentHours >= eq.nextServiceDue;

          return (
            <div key={eq.id} className="data-card">
              <button
                onClick={() => setExpanded(isExpanded ? null : eq.id)}
                className="w-full flex items-center justify-between p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded bg-[#005F73]/20 flex items-center justify-center">
                    <Package className="w-4 h-4 text-[#005F73]" />
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <span className="text-base lg:text-lg font-semibold text-[#EAEAEA] font-mono-tech">{eq.unitId}</span>
                      <span className="text-xs text-[#88888C]">{eq.type}</span>
                      <span className={statusBadge(eq.status)}>{eq.status}</span>
                    </div>
                    <div className="text-[10px] text-[#88888C]">{eq.manufacturer} {eq.model} — {eq.location}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {serviceDue && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#EF4444]/20 text-[#EF4444] font-medium">Service Due</span>
                  )}
                  <span className="text-[10px] text-[#88888C]">{eqRecords.length} services</span>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-[#88888C]" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-[#88888C]" />
                  )}
                </div>
              </button>

              {isExpanded && (
                <div className="px-6 pb-4 border-t border-white/5 pt-3">
                  <div className="grid grid-cols-4 gap-2 mb-3 text-xs">
                    <div>
                      <div className="text-[10px] text-[#88888C]">Serial</div>
                      <div className="text-[#EAEAEA] font-mono-tech">{eq.serialNumber}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#88888C]">Install Date</div>
                      <div className="text-[#EAEAEA]">{new Date(eq.installDate).toLocaleDateString()}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#88888C]">Current Hours</div>
                      <div className={`font-mono-tech ${serviceDue ? "text-[#EF4444]" : "text-[#EAEAEA]"}`}>{eq.currentHours}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#88888C]">Next Service</div>
                      <div className={`font-mono-tech ${serviceDue ? "text-[#EF4444]" : "text-[#EAEAEA]"}`}>{eq.nextServiceDue}h</div>
                    </div>
                  </div>

                  {eqRecords.length > 0 && (
                    <div className="mb-3">
                      <div className="text-[10px] text-[#88888C] uppercase tracking-wider mb-1">Service Records</div>
                      <div className="space-y-1">
                        {eqRecords.map((record) => (
                          <div key={record.id} className="flex items-center justify-between p-2 rounded bg-[#121214]">
                            <div className="flex items-center gap-2">
                              <Wrench className="w-3 h-3 text-[#005F73]" />
                              <span className="text-xs text-[#EAEAEA] capitalize">{record.serviceType}</span>
                              <span className="text-[10px] text-[#88888C]">{record.technician}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-[#F2A900] font-mono-tech">${record.cost.toFixed(2)}</span>
                              <span className="text-[10px] text-[#88888C]">{record.completedDate ? new Date(record.completedDate).toLocaleDateString() : "—"}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {eqPhotos.length > 0 && (
                    <div>
                      <div className="text-[10px] text-[#88888C] uppercase tracking-wider mb-1">Documentation</div>
                      <div className="grid grid-cols-4 gap-1.5">
                        {eqPhotos.map((photo, idx) => (
                          <div key={idx} className="relative">
                            <img src={photo.url} alt={photo.caption} className="w-full h-16 object-cover rounded" />
                            <span className={`absolute top-0.5 left-0.5 text-[8px] px-1 py-0.5 rounded font-medium ${photo.type === "before" ? "bg-[#F2A900]/80 text-[#050505]" : "bg-[#10B981]/80 text-[#050505]"}`}>{photo.type}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
