import React, { useState, useRef, useEffect } from "react";
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
  Printer,
  Camera,
  X,
  Loader2,
  CheckCircle2,
  Activity,
  Wallet 
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import { Html5Qrcode } from "html5-qrcode";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function KPICard({ title, value, subtext, icon: Icon, colorClass, iconBgClass }: {
  title: string;
  value: string | number;
  subtext: string;
  icon: any;
  colorClass: string;
  iconBgClass: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-xl bg-[#1A1A1A]/80 backdrop-blur-md border border-white/10 p-4 transition-all duration-300 hover:border-[#10B981]/50 hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(16,185,129,0.1)]">
      <div className="flex items-center justify-between relative z-10">
        <div>
          <p className="text-[10px] font-bold text-[#88888C] uppercase tracking-wider">{title}</p>
          <h3 className="text-2xl font-bold text-[#EAEAEA] mt-1 font-mono-tech">{value}</h3>
          <p className="text-[10px] text-[#88888C] mt-0.5">{subtext}</p>
        </div>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${iconBgClass}`}>
          <Icon className={`w-5 h-5 ${colorClass}`} />
        </div>
      </div>
      <div className="absolute inset-0 bg-gradient-to-br from-[#10B981]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    </div>
  );
}

export default function ClientEquipment() {
  const { user } = useAuthStore();
  const { equipment, serviceRecords, servicePhotos } = useOperationsStore();
  const clientId = user?.clientId || 1;

  const [searchQuery, setSearchQuery] = useState("");
  const [qrSerial, setQrSerial] = useState("");
  const [showQR, setShowQR] = useState(false);
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

  // Scanning states
  const [showScanner, setShowScanner] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [manualSerial, setManualSerial] = useState("");
  const [highlightedEquipment, setHighlightedEquipment] = useState<number | null>(null);
  const [scannerError, setScannerError] = useState<string | null>(null);
  
  // Refs for equipment cards
  const equipmentRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const initTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clientEquipment = equipment.filter(
    (e) => e.clientId === clientId && 
    (searchQuery === "" || 
     e.unitId.toLowerCase().includes(searchQuery.toLowerCase()) || 
     e.serialNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
     e.model.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Scanning functions
  const checkCameraPermission = async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      setScannerError("Camera permission denied. Please allow camera access and try again.");
      return false;
    }
  };

  const startScanning = async () => {
    setShowScanner(true);
    setScanning(true);
    setManualSerial("");
    setScannerError(null);

    const hasPermission = await checkCameraPermission();
    if (!hasPermission) {
      setScanning(false);
      return;
    }

    initTimeoutRef.current = setTimeout(() => {
      setScannerError("Camera failed to start. Please try again or use manual entry.");
      setScanning(false);
      if (scannerRef.current) {
        scannerRef.current.stop().catch(console.error);
        scannerRef.current.clear().catch(console.error);
        scannerRef.current = null;
      }
    }, 5000);

    setTimeout(async () => {
      try {
        const readerElement = document.getElementById('qr-reader');
        if (!readerElement) return;

        if (!scannerRef.current) {
          scannerRef.current = new Html5Qrcode("qr-reader");
          try {
            await scannerRef.current.start(
              { facingMode: "environment" },
              {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0,
              },
              (decodedText) => handleScanSuccess(decodedText),
              () => {}
            );
          } catch (envCameraError) {
            await scannerRef.current.start(
              {},
              {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0,
              },
              (decodedText) => handleScanSuccess(decodedText),
              () => {}
            );
          }
          
          if (initTimeoutRef.current) {
            clearTimeout(initTimeoutRef.current);
            initTimeoutRef.current = null;
          }
          setScanning(false);
        }
      } catch (error) {
        setScannerError("Failed to start camera. Please check camera permissions and try again.");
        setScanning(false);
      }
    }, 500);
  };

  const stopScanning = async () => {
    if (initTimeoutRef.current) {
      clearTimeout(initTimeoutRef.current);
      initTimeoutRef.current = null;
    }

    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        await scannerRef.current.clear();
      } catch (error) {}
      scannerRef.current = null;
    }
    
    setScanning(false);
    setShowScanner(false);
    setScannerError(null);
  };

  const handleScanSuccess = async (scannedText: string) => {
    await stopScanning();
    setTimeout(() => {
      findAndHighlightEquipment(scannedText.trim());
    }, 100);
  };

  const handleManualEntry = async () => {
    if (manualSerial.trim()) {
      if (scanning) await stopScanning();
      setTimeout(() => {
        findAndHighlightEquipment(manualSerial.trim());
        setShowScanner(false);
      }, 100);
    }
  };

  const findAndHighlightEquipment = (serialNumber: string) => {
    const foundEquipment = equipment.find(eq => eq.clientId === clientId && eq.serialNumber === serialNumber);
    if (foundEquipment) {
      const element = equipmentRefs.current.get(foundEquipment.id);
      if (element) element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedEquipment(foundEquipment.id);
      setExpanded(foundEquipment.id);
      setTimeout(() => setHighlightedEquipment(null), 3000);
      toast.success(`Found equipment: ${foundEquipment.unitId}`);
    } else {
      toast.error(`Equipment not found`);
    }
  };

  useEffect(() => {
    return () => {
      if (initTimeoutRef.current) clearTimeout(initTimeoutRef.current);
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current.clear().catch(() => {});
      }
    };
  }, []);

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
    <div className="space-y-6 px-8 pt-8 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[32px] font-bold text-[#EAEAEA] tracking-[-0.02em]" >My Equipment</h1>
          <p className="text-sm text-[#88888C] mt-0.5">{clientEquipment.length} units under management</p>
        </div>
        
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard 
          title="Total Services" 
          value={totalServices} 
          subtext="Lifetime fleet records" 
          icon={Wrench} 
          colorClass="text-[#005F73]" 
          iconBgClass="bg-[#005F73]/20" 
        />
        <KPICard 
          title="Completed" 
          value={completedServices} 
          subtext="Successful operations" 
          icon={CheckCircle2} 
          colorClass="text-[#10B981]" 
          iconBgClass="bg-[#10B981]/20" 
        />
        <KPICard 
          title="In Progress" 
          value={inProgressServices} 
          subtext="Active service tickets" 
          icon={Activity} 
          colorClass="text-[#F2A900]" 
          iconBgClass="bg-[#F2A900]/20" 
        />
        <KPICard 
          title="Total Spent" 
          value={formatCurrency(totalSpent)} 
          subtext="Maintenance investment" 
          icon={Wallet} 
          colorClass="text-[#EF4444]" 
          iconBgClass="bg-[#EF4444]/20" 
        />
      </div>

      {/* Filter Bar */}
      <div className="flex items-center justify-between pt-2">
        <div className=" flex items-center gap-3 relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#88888C]" />
          <Input
            placeholder="Search serial, model, or unit ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10 bg-[#1A1A20] border-white/10 text-[#EAEAEA] text-sm focus:border-[#10B981]/50 transition-colors"
          />
         
          <Button
            onClick={startScanning}
            className="bg-[#10B981] text-[#050505] hover:bg-[#10B981]/90 font-bold h-9"
          >
            <Camera className="w-4 h-4 mr-2" />
            Scan QR
          </Button>
        
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
              ref={(el) => {
                if (el) {
                  equipmentRefs.current.set(eq.id, el);
                } else {
                  equipmentRefs.current.delete(eq.id);
                }
              }}
              className={`data-card transition-all duration-300 hover:border-[#10B981]/30 ${
                highlightedEquipment === eq.id 
                  ? 'equipment-highlight ring-2 ring-[#10B981] shadow-lg shadow-[#10B981]/20' 
                  : ''
              }`}
            >
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
                                <span className="text-[10px] text-[#F2A900] font-mono-tech">₱{record.cost.toFixed(2)}</span>
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

      {/* QR Scanner Modal */}
      <Dialog open={showScanner} onOpenChange={(open) => {
        if (!open) stopScanning();
      }}>
        <DialogContent className="bg-[#0A0A0C] border-white/10 sm:max-w-lg void-glass">
          <DialogHeader>
            <DialogTitle className="text-[#EAEAEA] flex items-center gap-2">
              <Camera className="w-5 h-5 text-[#10B981]" />
              Scan Equipment QR Code
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Error Message */}
            {scannerError && (
              <div className="p-3 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/20">
                <div className="flex items-center gap-2">
                  <X className="w-4 h-4 text-[#EF4444] flex-shrink-0" />
                  <p className="text-sm text-[#EF4444]">{scannerError}</p>
                </div>
              </div>
            )}

            {/* Scanner Container */}
            <div className="relative">
              <div 
                id="qr-reader" 
                className="w-full max-w-sm mx-auto rounded-lg overflow-hidden bg-[#121214] border border-white/5"
              ></div>
              {scanning && !scannerError && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg backdrop-blur-sm">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 text-[#10B981] animate-spin mx-auto mb-2" />
                    <p className="text-sm text-[#EAEAEA] font-medium">Scanning...</p>
                    <p className="text-xs text-[#88888C] mt-1">Position QR code within the frame</p>
                  </div>
                </div>
              )}
            </div>

            {/* Manual Entry Fallback */}
            <div className="space-y-3 pt-2 border-t border-white/5">
              <div className="text-sm text-[#88888C] text-center">
                Can't scan? Enter serial number manually:
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter serial number..."
                  value={manualSerial}
                  onChange={(e) => setManualSerial(e.target.value)}
                  className="bg-[#1A1A20] border-white/10 text-[#EAEAEA] text-sm focus:border-[#10B981]"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleManualEntry();
                    }
                  }}
                />
                <Button
                  onClick={handleManualEntry}
                  disabled={!manualSerial.trim() || scanning}
                  className="bg-[#10B981] text-white hover:bg-[#10B981]/80 font-semibold px-4 disabled:opacity-50"
                >
                  Find
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
