import React, { useState } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import { useOperationsStore } from "@/stores/useOperationsStore";
import { 
  Package, 
  ChevronDown, 
  ChevronUp, 
  Wrench, 
  FileText, 
  Search, 
  CheckCircle2,
  Activity,
  Wallet 
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function KPICard({ title, value, subtext, icon: Icon, colorClass, iconBgClass }: {
  title: string;
  value: string | number;
  subtext: string;
  icon: any;
  colorClass: string;
  iconBgClass: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-xl bg-white border border-gray-200 p-4 shadow-sm transition-all duration-300 hover:border-[#66B2B2]/40 hover:-translate-y-1 hover:shadow-md">
      <div className="flex items-center justify-between relative z-10">
        <div>
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{title}</p>
          <h3 className="text-2xl font-bold text-gray-900 mt-1 font-mono-tech">{value}</h3>
          <p className="text-[10px] text-gray-500 mt-0.5">{subtext}</p>
        </div>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${iconBgClass}`}>
          <Icon className={`w-5 h-5 ${colorClass}`} />
        </div>
      </div>
      <div className="absolute inset-0 bg-gradient-to-br from-[#66B2B2]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    </div>
  );
}

export default function ClientEquipment() {
  const { user } = useAuthStore();
  const { equipment, serviceRecords, servicePhotos } = useOperationsStore();
  const clientId = user?.clientId || 1;

  const [searchQuery, setSearchQuery] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);
  
  // Metrics calculation
  const allEqRecords = serviceRecords.filter((r) => r.clientId === clientId);
  const totalServices = allEqRecords.length;
  const completedServices = allEqRecords.filter(r => r.status === 'completed').length;
  const inProgressServices = allEqRecords.filter(r => r.status === 'in_progress' || r.status === 'scheduled').length;
  const totalSpent = allEqRecords.reduce((sum, r) => sum + Number(r.cost), 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const clientEquipment = equipment.filter(
    (e) => e.clientId === clientId && 
    (searchQuery === "" || 
     e.unitId.toLowerCase().includes(searchQuery.toLowerCase()) || 
     e.serialNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
     e.model.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const statusBadge = (status: string) => {
    switch (status) {
      case "active":
        return "px-2 py-0.5 rounded text-sm bg-[#10B981]/20 text-[#10B981] font-medium";
      case "maintenance":
        return "px-2 py-0.5 rounded text-sm bg-[#66B2B2]/20 text-[#66B2B2] font-medium";
      case "inactive":
        return "px-2 py-0.5 rounded text-sm bg-[#6B7280]/20 text-gray-500 font-medium";
      case "retired":
        return "px-2 py-0.5 rounded text-sm bg-[#EF4444]/20 text-[#EF4444] font-medium";
      default:
        return "px-2 py-0.5 rounded text-sm bg-[#6B7280]/20 text-gray-500 font-medium";
    }
  };

  const isServiceDue = (eq: any) => {
    if (eq.equipmentType === "Heavy Equipment") {
      return eq.nextPMSHours > 0 && eq.currentHours >= eq.nextPMSHours;
    }
    if (eq.equipmentType === "Lab Equipment" || eq.equipmentType === "Testing Equipment") {
      return eq.nextCalibrationDate && new Date(eq.nextCalibrationDate) <= new Date();
    }
    return false;
  };

  return (
    <div className="space-y-6 px-8 pt-8 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[32px] font-bold text-gray-900 tracking-[-0.02em]" >My Equipment</h1>
          <p className="text-sm text-gray-500 mt-0.5">{clientEquipment.length} units under management</p>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard 
          title="Total Services" 
          value={totalServices} 
          subtext="Lifetime fleet records" 
          icon={Wrench} 
          colorClass="text-[#66B2B2]" 
          iconBgClass="bg-white shadow-sm" 
        />
        <KPICard 
          title="Completed" 
          value={completedServices} 
          subtext="Successful operations" 
          icon={CheckCircle2} 
          colorClass="text-[#059669]" 
          iconBgClass="bg-white shadow-sm" 
        />
        <KPICard 
          title="In Progress" 
          value={inProgressServices} 
          subtext="Active service tickets" 
          icon={Activity} 
          colorClass="text-[#66B2B2]" 
          iconBgClass="bg-white shadow-sm" 
        />
        <KPICard 
          title="Total Spent" 
          value={formatCurrency(totalSpent)} 
          subtext="Maintenance investment" 
          icon={Wallet} 
          colorClass="text-[#DC2626]" 
          iconBgClass="bg-white shadow-sm" 
        />
      </div>

      {/* Filter Bar */}
      <div className="flex items-center justify-between pt-2">
        <div className=" flex items-center gap-3 relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input
            placeholder="Search serial, model, or unit ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10 bg-white border-gray-200 text-gray-900 text-sm focus:border-[#10B981]/50 transition-colors"
          />
        </div>
      </div>

      <div className="space-y-3">
        {clientEquipment.map((eq) => {
          const eqRecords = serviceRecords.filter((r) => r.equipmentId === eq.id && r.clientId === clientId);
          const eqPhotos = servicePhotos.filter((p) => eqRecords.some((r) => r.id === p.serviceRecordId));
          const isExpanded = expanded === eq.id;
          const serviceDue = isServiceDue(eq);

          return (
            <div 
              key={eq.id} 
              className={`data-card transition-all duration-300 hover:border-[#10B981]/30`}
            >
              <button
                onClick={() => setExpanded(isExpanded ? null : eq.id)}
                className="w-full flex items-center justify-between p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded bg-white shadow-sm flex items-center justify-center">
                    <Package className="w-4 h-4 text-[#66B2B2]" />
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <span className="text-base lg:text-lg font-semibold text-gray-900 font-mono-tech">{eq.unitId}</span>
                      <span className="text-xs text-gray-500">{eq.equipmentType}</span>
                      <span className={statusBadge(eq.status)}>{eq.status}</span>
                    </div>
                    <div className="text-[10px] text-gray-500">{eq.manufacturer} {eq.model} — {eq.location}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {serviceDue && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#EF4444]/20 text-[#EF4444] font-medium">Service Due</span>
                  )}
                  <span className="text-[10px] text-gray-500">{eqRecords.length} services</span>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  )}
                </div>
              </button>

              {isExpanded && (
                <div className="px-6 pb-4 border-t border-gray-200 pt-3">
                  <div className="grid grid-cols-4 gap-2 mb-3 text-xs">
                    <div>
                      <div className="text-[10px] text-gray-500">Serial</div>
                      <div className="text-gray-900 font-mono-tech">{eq.serialNumber}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-gray-500">Install Date</div>
                      <div className="text-gray-900">{new Date(eq.installDate).toLocaleDateString()}</div>
                    </div>
                    {eq.equipmentType === "Heavy Equipment" ? (
                      <>
                        <div className="col-span-2">
                          <div className="flex justify-between items-center mb-1">
                            <div className="text-[10px] text-gray-500">Usage Progress</div>
                            <div className="text-[10px] text-gray-900 font-mono-tech">{eq.currentHours} / {eq.nextPMSHours}h</div>
                          </div>
                          <div className="h-1.5 bg-gray-50 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${serviceDue ? "bg-[#EF4444]" : "bg-[#66B2B2]"}`} 
                              style={{ width: `${Math.min(100, (eq.currentHours / eq.nextPMSHours) * 100)}%` }}
                            />
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-gray-500">Last PMS</div>
                          <div className="text-gray-900 font-mono-tech">{eq.lastPMSHours}h</div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <div className="text-[10px] text-gray-500">Last Calibration</div>
                          <div className="text-gray-900">{eq.lastCalibrationDate ? new Date(eq.lastCalibrationDate).toLocaleDateString() : "—"}</div>
                        </div>
                        <div className="col-span-2">
                           <div className="text-[10px] text-gray-500">Next Calibration</div>
                           <div className="flex items-center gap-2">
                              <div className={`text-sm font-bold font-mono-tech ${serviceDue ? "text-[#EF4444]" : "text-gray-900"}`}>
                                {eq.nextCalibrationDate ? new Date(eq.nextCalibrationDate).toLocaleDateString() : "—"}
                              </div>
                              {eq.nextCalibrationDate && (
                                <span className={`text-[9px] px-1 py-0.5 rounded ${serviceDue ? "bg-[#EF4444]/20 text-[#EF4444]" : "bg-[#66B2B2]/20 text-[#66B2B2]"}`}>
                                  {Math.ceil((new Date(eq.nextCalibrationDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))}d left
                                </span>
                              )}
                           </div>
                        </div>
                      </>
                    )}
                  </div>

                  {eqRecords.length > 0 && (
                    <div className="mb-3">
                      <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Service Records</div>
                      <div className="space-y-1">
                        {eqRecords.map((record) => (
                          <div key={record.id} className="p-2 rounded bg-gray-100 space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Wrench className="w-3 h-3 text-[#66B2B2]" />
                                <span className="text-xs text-gray-900">{record.serviceCategory}</span>
                                <span className="text-[10px] text-gray-500">{record.technician}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-[#66B2B2] font-mono-tech">₱{record.cost.toFixed(2)}</span>
                                <span className="text-[10px] text-gray-500">{record.completedDate ? new Date(record.completedDate).toLocaleDateString() : "—"}</span>
                              </div>
                            </div>
                            {record.serviceCategory === "Lab Testing Service" && (
                              <div className="grid grid-cols-3 gap-2 px-5 py-1 border-t border-gray-200">
                                <div>
                                  <div className="text-[8px] text-gray-500 uppercase">Test Type</div>
                                  <div className="text-[10px] text-gray-900">{record.testType}</div>
                                </div>
                                <div>
                                  <div className="text-[8px] text-gray-500 uppercase">Project</div>
                                  <div className="text-[10px] text-gray-900">{record.projectName}</div>
                                </div>
                                <div>
                                  <div className="text-[8px] text-gray-500 uppercase">Status</div>
                                  <div className="text-[10px] text-[#10B981] font-bold uppercase">{record.labStatus}</div>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {eqPhotos.length > 0 && (
                    <div>
                      <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Documentation</div>
                      <div className="grid grid-cols-4 gap-1.5">
                        {eqPhotos.map((photo, idx) => (
                          <div key={idx} className="relative">
                            <img src={photo.url} alt={photo.caption} className="w-full h-16 object-cover rounded" />
                            <span className={`absolute top-0.5 left-0.5 text-[8px] px-1 py-0.5 rounded font-medium ${photo.type === "before" ? "bg-[#66B2B2]/80 text-white" : "bg-[#10B981]/80 text-white"}`}>{photo.type}</span>
                          </div>
                        ))}
                        {eqRecords.some(r => r.reportAttachment) && (
                           <div className="w-full h-16 rounded bg-[#66B2B2]/10 border border-[#66B2B2]/20 flex flex-col items-center justify-center gap-1 cursor-pointer hover:bg-[#66B2B2]/20 transition-colors">
                              <FileText className="w-4 h-4 text-[#66B2B2]" />
                              <span className="text-[8px] text-gray-900 font-medium">View Report</span>
                           </div>
                        )}
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
