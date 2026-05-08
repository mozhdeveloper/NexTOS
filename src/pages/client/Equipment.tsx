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
  QrCode, 
  Printer 
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function ClientEquipment() {
  const { user } = useAuthStore();
  const { equipment, serviceRecords, servicePhotos } = useOperationsStore();
  const clientId = user?.clientId || 1;

  const [searchQuery, setSearchQuery] = useState("");
  const [qrSerial, setQrSerial] = useState("");
  const [showQR, setShowQR] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);

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
        return "px-2 py-0.5 rounded text-sm bg-[#F2A900]/20 text-[#F2A900] font-medium";
      case "inactive":
        return "px-2 py-0.5 rounded text-sm bg-[#88888C]/20 text-[#88888C] font-medium";
      case "retired":
        return "px-2 py-0.5 rounded text-sm bg-[#EF4444]/20 text-[#EF4444] font-medium";
      default:
        return "px-2 py-0.5 rounded text-sm bg-[#88888C]/20 text-[#88888C] font-medium";
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
    <div className="space-y-4 px-8 pt-8 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[32px] font-bold text-[#EAEAEA] tracking-[-0.02em]" >My Equipment</h1>
          <p className="text-sm text-[#88888C] mt-0.5">{clientEquipment.length} units under management</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#88888C]" />
            <Input
              placeholder="Search equipment..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9 bg-[#1A1A20] border-white/10 text-[#EAEAEA] text-xs"
            />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {clientEquipment.map((eq) => {
          const eqRecords = serviceRecords.filter((r) => r.equipmentId === eq.id && r.clientId === clientId);
          const eqPhotos = servicePhotos.filter((p) => eqRecords.some((r) => r.id === p.serviceRecordId));
          const isExpanded = expanded === eq.id;
          const serviceDue = isServiceDue(eq);

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
                      <span className="text-xs text-[#88888C]">{eq.equipmentType}</span>
                      <span className={statusBadge(eq.status)}>{eq.status}</span>
                    </div>
                    <div className="text-[10px] text-[#88888C]">{eq.manufacturer} {eq.model} — {eq.location}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setQrSerial(eq.serialNumber);
                      setShowQR(true);
                    }}
                    className="h-8 w-8 p-0 text-[#88888C] hover:text-[#F2A900] hover:bg-[#F2A900]/10"
                  >
                    <QrCode className="w-4 h-4" />
                  </Button>
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
                    {eq.equipmentType === "Heavy Equipment" ? (
                      <>
                        <div className="col-span-2">
                          <div className="flex justify-between items-center mb-1">
                            <div className="text-[10px] text-[#88888C]">Usage Progress</div>
                            <div className="text-[10px] text-[#EAEAEA] font-mono-tech">{eq.currentHours} / {eq.nextPMSHours}h</div>
                          </div>
                          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${serviceDue ? "bg-[#EF4444]" : "bg-[#F2A900]"}`} 
                              style={{ width: `${Math.min(100, (eq.currentHours / eq.nextPMSHours) * 100)}%` }}
                            />
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-[#88888C]">Last PMS</div>
                          <div className="text-[#EAEAEA] font-mono-tech">{eq.lastPMSHours}h</div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <div className="text-[10px] text-[#88888C]">Last Calibration</div>
                          <div className="text-[#EAEAEA]">{eq.lastCalibrationDate ? new Date(eq.lastCalibrationDate).toLocaleDateString() : "—"}</div>
                        </div>
                        <div className="col-span-2">
                           <div className="text-[10px] text-[#88888C]">Next Calibration</div>
                           <div className="flex items-center gap-2">
                              <div className={`text-sm font-bold font-mono-tech ${serviceDue ? "text-[#EF4444]" : "text-[#EAEAEA]"}`}>
                                {eq.nextCalibrationDate ? new Date(eq.nextCalibrationDate).toLocaleDateString() : "—"}
                              </div>
                              {eq.nextCalibrationDate && (
                                <span className={`text-[9px] px-1 py-0.5 rounded ${serviceDue ? "bg-[#EF4444]/20 text-[#EF4444]" : "bg-[#005F73]/20 text-[#005F73]"}`}>
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
                      <div className="text-[10px] text-[#88888C] uppercase tracking-wider mb-1">Service Records</div>
                      <div className="space-y-1">
                        {eqRecords.map((record) => (
                          <div key={record.id} className="p-2 rounded bg-[#121214] space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Wrench className="w-3 h-3 text-[#005F73]" />
                                <span className="text-xs text-[#EAEAEA]">{record.serviceCategory}</span>
                                <span className="text-[10px] text-[#88888C]">{record.technician}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-[#F2A900] font-mono-tech">${record.cost.toFixed(2)}</span>
                                <span className="text-[10px] text-[#88888C]">{record.completedDate ? new Date(record.completedDate).toLocaleDateString() : "—"}</span>
                              </div>
                            </div>
                            {record.serviceCategory === "Lab Testing Service" && (
                              <div className="grid grid-cols-3 gap-2 px-5 py-1 border-t border-white/5">
                                <div>
                                  <div className="text-[8px] text-[#88888C] uppercase">Test Type</div>
                                  <div className="text-[10px] text-[#EAEAEA]">{record.testType}</div>
                                </div>
                                <div>
                                  <div className="text-[8px] text-[#88888C] uppercase">Project</div>
                                  <div className="text-[10px] text-[#EAEAEA]">{record.projectName}</div>
                                </div>
                                <div>
                                  <div className="text-[8px] text-[#88888C] uppercase">Status</div>
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
                      <div className="text-[10px] text-[#88888C] uppercase tracking-wider mb-1">Documentation</div>
                      <div className="grid grid-cols-4 gap-1.5">
                        {eqPhotos.map((photo, idx) => (
                          <div key={idx} className="relative">
                            <img src={photo.url} alt={photo.caption} className="w-full h-16 object-cover rounded" />
                            <span className={`absolute top-0.5 left-0.5 text-[8px] px-1 py-0.5 rounded font-medium ${photo.type === "before" ? "bg-[#F2A900]/80 text-[#050505]" : "bg-[#10B981]/80 text-[#050505]"}`}>{photo.type}</span>
                          </div>
                        ))}
                        {eqRecords.some(r => r.reportAttachment) && (
                           <div className="w-full h-16 rounded bg-[#005F73]/10 border border-[#005F73]/20 flex flex-col items-center justify-center gap-1 cursor-pointer hover:bg-[#005F73]/20 transition-colors">
                              <FileText className="w-4 h-4 text-[#005F73]" />
                              <span className="text-[8px] text-[#EAEAEA] font-medium">View Report</span>
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

      {/* QR Code Dialog */}
      <Dialog open={showQR} onOpenChange={setShowQR}>
        <DialogContent className="bg-[#0A0A0C] border-white/10 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#EAEAEA] flex items-center gap-2">
              <QrCode className="w-5 h-5 text-[#F2A900]" />
              Equipment QR Code
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center p-6 bg-white rounded-lg mt-4">
            <QRCodeSVG value={qrSerial} size={200} level="H" includeMargin={true} />
            <div className="mt-4 text-center">
              <p className="text-sm font-bold text-[#050505] font-mono-tech">{qrSerial}</p>
              <p className="text-xs text-[#88888C] mt-1 uppercase font-bold">
                {equipment.find((e) => e.serialNumber === qrSerial)?.unitId}
              </p>
            </div>
          </div>
          <div className="flex justify-center mt-4">
            <Button
              onClick={() => window.print()}
              className="bg-[#F2A900] text-[#050505] hover:bg-[#F2A900]/80 font-bold"
            >
              <Printer className="w-4 h-4 mr-2" />
              Print QR Code
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
