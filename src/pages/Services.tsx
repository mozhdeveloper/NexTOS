import { useState, useCallback, useEffect, useRef } from "react";
import { useLocation } from "react-router";
import { useOperationsStore, type DraftExecution } from "@/stores/useOperationsStore";
import { useCRMStore } from "@/stores/useCRMStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { useBillingStore } from "@/stores/useBillingStore";
import seedData from "@/data/seed-data.json";
import type { ServiceType, Equipment, ServiceRecord, Client } from "@/types";
import { QRCodeSVG } from "qrcode.react";
import {
  Search,
  QrCode,
  Upload,
  Camera,
  Wrench,
  FileText,
  Printer,
  X,
  CheckCircle2,
  AlertTriangle,
  Package,
  ChevronDown,
  ChevronUp,
  PenTool,
  Loader2,
  Play,
  Check,
  History,
  ClipboardList,
  ChevronRight,
  UserCheck,
  TestTube,
  Trash2,
  MapPin,
  Clock,
  Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Html5Qrcode } from "html5-qrcode";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type TabType = "tasks" | "equipment" | "reports" | "new";

export default function Services() {
  const { user } = useAuthStore();
  const { clients } = useCRMStore();
  const {
    equipment,
    serviceRecords,
    servicePhotos,
    draftExecutions,
    addServiceRecord,
    updateServiceRecord,
    addServicePhoto,
    updateDraftExecution,
    clearDraftExecution,
    injectSimulationTask,
    clearSimulationData
  } = useOperationsStore();
  const { packages } = useBillingStore();
  
  const [activeTab, setActiveTab] = useState<TabType>("tasks");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEquipment, setSelectedEquipment] = useState<number | null>(null);
  const [qrSerial, setQrSerial] = useState("");
  const [showQR, setShowQR] = useState(false);

  // Scanning states
  const [showScanner, setShowScanner] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [manualSerial, setManualSerial] = useState("");
  const [highlightedEquipment, setHighlightedEquipment] = useState<number | null>(null);
  const [scannerError, setScannerError] = useState<string | null>(null);
  
  // Refs
  const equipmentRefs = useRef<Map<number, HTMLTableRowElement>>(new Map());
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const initTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Modal State
  const [executionTask, setExecutionTask] = useState<ServiceRecord | null>(null);
  const [showReport, setShowReport] = useState<ServiceRecord | null>(null);

  // Form state (for Manual Log)
  const [formClientId, setFormClientId] = useState("");
  const [formEquipmentId, setFormEquipmentId] = useState("");
  const [formType, setFormType] = useState<string>("Heavy Equipment PMS");
  const [formTechnician, setFormTechnician] = useState(user?.name || "");
  const [formDescription, setFormDescription] = useState("");

  const location = useLocation();

  useEffect(() => {
    const state = location.state as { selectedUnitId?: number };
    if (state?.selectedUnitId) {
      setSelectedEquipment(state.selectedUnitId);
      setActiveTab("equipment");
      window.history.replaceState({}, document.title);
    }
  }, [location]);

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
        const readerElement = document.getElementById('qr-reader-admin');
        if (!readerElement) return;

        if (!scannerRef.current) {
          scannerRef.current = new Html5Qrcode("qr-reader-admin");
          try {
            await scannerRef.current.start(
              { facingMode: "environment" },
              { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
              (decodedText) => handleScanSuccess(decodedText),
              () => {}
            );
          } catch (envCameraError) {
            await scannerRef.current.start(
              {},
              { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
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
    const foundEquipment = equipment.find(eq => eq.serialNumber === serialNumber);
    if (foundEquipment) {
      const element = equipmentRefs.current.get(foundEquipment.id);
      if (element) element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setSelectedEquipment(foundEquipment.id);
      setHighlightedEquipment(foundEquipment.id);
      setActiveTab("equipment");
      setTimeout(() => setHighlightedEquipment(null), 3000);
      toast.success(`Found equipment: ${foundEquipment.unitId}`);
    } else {
      toast.error(`Equipment not found`);
    }
  };

  const activeTasks = serviceRecords.filter(r => r.status === "scheduled" || r.status === "in_progress");

  const filteredEquipment = equipment.filter(
    (eq: Equipment) =>
      searchQuery === "" ||
      eq.unitId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      eq.manufacturer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      eq.serialNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[32px] font-bold text-black tracking-[-0.02em]">Services</h1>
          <p className="text-sm text-gray-600 mt-0.5">Automated PMS, Task Management & Documentation</p>
        </div>
        <div className="flex items-center gap-2">
            <Button 
                onClick={clearSimulationData} 
                variant="ghost" 
                className="text-red-500 hover:text-red-600 hover:bg-red-50 text-xs font-bold"
            >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                Clear Test Data
            </Button>
            <Button 
                onClick={injectSimulationTask} 
                className="bg-[#66B2B2] text-white hover:bg-[#5A9E9E] font-bold shadow-lg shadow-[#66B2B2]/20"
            >
                <TestTube className="w-4 h-4 mr-2" />
                Start Simulation Task
            </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {[
          { id: "tasks" as TabType, label: "My Tasks", icon: ClipboardList, count: activeTasks.length },
          { id: "equipment" as TabType, label: "Equipment", icon: Package },
          { id: "reports" as TabType, label: "Service Reports", icon: FileText },
          { id: "new" as TabType, label: "Manual Log", icon: PenTool },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-all border-b-2 ${
              activeTab === tab.id
                ? "border-[#66B2B2] text-[#66B2B2] bg-[#66B2B2]/5"
                : "border-transparent text-gray-600 hover:text-black"
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-[#EF4444] text-white text-[9px] font-bold">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {/* Tasks Tab */}
        {activeTab === "tasks" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in duration-300">
            {activeTasks.length > 0 ? (
              activeTasks.map(task => {
                const eq = equipment.find(e => e.id === task.equipmentId);
                const client = clients.find(c => c.id === task.clientId);
                const isDraft = !!draftExecutions[task.id];
                
                return (
                  <div key={task.id} className="data-card p-4 flex flex-col justify-between hover:border-[#66B2B2]/40 transition-all cursor-pointer group" onClick={() => setExecutionTask(task)}>
                     <div>
                        <div className="flex items-center justify-between mb-2">
                          {task.status === 'scheduled' && !isDraft ? (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-gray-100 text-gray-500">Not Started</span>
                          ) : (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-amber-100 text-amber-700">Repairing / Pending</span>
                          )}
                          <span className="text-[10px] text-gray-500 font-mono-tech">ID: {task.id}</span>
                        </div>
                        <h4 className="text-sm font-bold text-gray-900 group-hover:text-[#66B2B2] transition-colors">{eq?.unitId || "No unit selected"}</h4>
                        <p className="text-[10px] text-gray-500 mb-2">{eq?.manufacturer} {eq?.model}</p>
                        
                        <div className="space-y-1 mt-3">
                          <div className="flex justify-between text-[11px]">
                            <span className="text-gray-500">Service:</span>
                            <span className="text-gray-900 font-bold">{task.serviceCategory}</span>
                          </div>
                          <div className="flex justify-between text-[11px]">
                            <span className="text-gray-500">Client:</span>
                            <span className="text-gray-900">{client?.companyName || "Unknown Client"}</span>
                          </div>
                          <div className="flex justify-between text-[11px]">
                            <span className="text-gray-500">Hours Logged:</span>
                            <span className="text-gray-900 font-mono-tech">{eq?.currentHours || 0}h</span>
                          </div>
                        </div>
                     </div>

                     <Button className="w-full mt-4 h-9 bg-gray-900 hover:bg-[#66B2B2] text-white text-xs font-bold transition-all">
                        {task.status === 'scheduled' && !isDraft ? (
                          <><Play className="w-3 h-3 mr-2" /> Start Service</>
                        ) : (
                          <><CheckCircle2 className="w-3 h-3 mr-2" /> Continue Execution</>
                        )}
                     </Button>
                  </div>
                );
              })
            ) : (
              <div className="col-span-full py-20 text-center data-card bg-gray-50/50">
                <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-gray-900 font-bold">No Active Tasks</h3>
                <p className="text-xs text-gray-500 mt-1">New tasks will appear here automatically when equipment reaches service thresholds.</p>
              </div>
            )}
          </div>
        )}

        {/* Equipment Tab */}
        {activeTab === "equipment" && (
          <div className="space-y-3 animate-in fade-in duration-300">
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                <Input
                  placeholder="Search unit ID or serial..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 bg-white border-gray-200 text-black text-xs"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (selectedEquipment) {
                    const eq = equipment.find(e => e.id === selectedEquipment);
                    if (eq) {
                      setQrSerial(eq.serialNumber);
                      setShowQR(true);
                    }
                  }
                }}
                className="h-8 border-gray-200 bg-white text-gray-700 hover:bg-[#66B2B2] hover:text-white"
                disabled={!selectedEquipment}
              >
                <QrCode className="w-3.5 h-3.5 mr-1.5" />
                Generate QR
              </Button>
              <Button
                onClick={startScanning}
                className="bg-[#10B981] text-white hover:bg-[#10B981]/90 font-bold h-8 text-xs"
              >
                <Camera className="w-3.5 h-3.5 mr-1.5" />
                Scan QR
              </Button>
            </div>

            <div className="data-card overflow-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left py-2.5 px-3 text-gray-600 font-bold uppercase tracking-wider">Unit ID</th>
                    <th className="text-left py-2.5 px-3 text-gray-600 font-bold uppercase tracking-wider">Manufacturer/Model</th>
                    <th className="text-left py-2.5 px-3 text-gray-600 font-bold uppercase tracking-wider">Client</th>
                    <th className="text-left py-2.5 px-3 text-gray-600 font-bold uppercase tracking-wider">Status</th>
                    <th className="text-left py-2.5 px-3 text-gray-600 font-bold uppercase tracking-wider text-right">Hours</th>
                    <th className="text-left py-2.5 px-3 text-gray-600 font-bold uppercase tracking-wider text-right">Next PMS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEquipment.map((eq) => {
                    const client = clients.find((c) => c.id === eq.clientId);
                    const serviceDue = eq.currentHours >= eq.nextPMSHours && eq.nextPMSHours > 0;
                    return (
                      <tr
                        key={eq.id}
                        ref={(el) => {
                          if (el) equipmentRefs.current.set(eq.id, el);
                          else equipmentRefs.current.delete(eq.id);
                        }}
                        className={`grid-table-row border-b border-gray-100 cursor-pointer hover:bg-[#66B2B2]/5 transition-all ${
                          selectedEquipment === eq.id || highlightedEquipment === eq.id ? 'bg-[#66B2B2]/10 border-[#66B2B2]/30' : ''
                        }`}
                        onClick={() => setSelectedEquipment(selectedEquipment === eq.id ? null : eq.id)}
                      >
                        <td className="py-3 px-3 text-black font-mono-tech font-bold text-sm">{eq.unitId}</td>
                        <td className="py-3 px-3 text-gray-700">
                           <div className="font-medium">{eq.manufacturer}</div>
                           <div className="text-[10px] text-gray-500">{eq.model}</div>
                        </td>
                        <td className="py-3 px-3 text-black">{client?.companyName || "—"}</td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            serviceDue ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-green-100 text-green-700'
                          }`}>
                            {serviceDue ? 'PMS Due' : eq.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono-tech font-bold text-gray-900">{eq.currentHours}h</td>
                        <td className="py-3 px-3 text-right font-mono-tech text-gray-500">{eq.nextPMSHours > 0 ? `${eq.nextPMSHours}h` : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {selectedEquipment && (
              <EquipmentDetail
                equipment={equipment.find((eqItem) => eqItem.id === selectedEquipment)!}
                client={clients.find((c) => c.id === equipment.find((eqItem) => eqItem.id === selectedEquipment)?.clientId)}
                serviceHistory={serviceRecords.filter(r => r.equipmentId === selectedEquipment)}
                onViewReport={(record) => setShowReport(record)}
              />
            )}
          </div>
        )}

        {/* Service Reports Tab */}
        {activeTab === "reports" && (
          <div className="space-y-3 animate-in fade-in duration-300">
            <div className="data-card overflow-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left py-2.5 px-3 text-gray-600 font-bold uppercase tracking-wider">Ref ID</th>
                    <th className="text-left py-2.5 px-3 text-gray-600 font-bold uppercase tracking-wider">Equipment</th>
                    <th className="text-left py-2.5 px-3 text-gray-600 font-bold uppercase tracking-wider">Service Category</th>
                    <th className="text-left py-2.5 px-3 text-gray-600 font-bold uppercase tracking-wider">Technician</th>
                    <th className="text-left py-2.5 px-3 text-gray-600 font-bold uppercase tracking-wider">Completed</th>
                    <th className="text-left py-2.5 px-3 text-gray-600 font-bold uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {serviceRecords.filter(r => r.status === 'completed').map((record) => {
                    const eq = equipment.find(e => e.id === record.equipmentId);
                    return (
                      <tr key={record.id} className="grid-table-row border-b border-gray-100 hover:bg-gray-50 transition-all">
                        <td className="py-3 px-3 text-gray-500 font-mono-tech">#{record.id}</td>
                        <td className="py-3 px-3 text-black font-bold">{eq?.unitId}</td>
                        <td className="py-3 px-3">
                          <span className="text-gray-900 font-medium">{record.serviceCategory}</span>
                        </td>
                        <td className="py-3 px-3 text-gray-700">{record.technician}</td>
                        <td className="py-3 px-3 text-gray-500 font-mono-tech">
                          {record.completedDate ? new Date(record.completedDate).toLocaleDateString() : "—"}
                        </td>
                        <td className="py-3 px-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowReport(record)}
                            className="h-7 text-[10px] border-gray-200 hover:bg-[#66B2B2] hover:text-white transition-all"
                          >
                            <FileText className="w-3 h-3 mr-1" />
                            View Report
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Manual Log Tab */}
        {activeTab === "new" && (
          <div className="max-w-4xl space-y-4 animate-in fade-in duration-300">
            <div className="data-card p-6 space-y-6 bg-white shadow-sm border border-gray-200 rounded-xl">
              <div className="flex items-center gap-3 mb-2">
                 <div className="w-10 h-10 rounded-full bg-[#66B2B2]/10 flex items-center justify-center">
                    <PenTool className="w-5 h-5 text-[#66B2B2]" />
                 </div>
                 <div>
                    <h3 className="text-lg font-bold text-gray-900">Manual Service Entry</h3>
                    <p className="text-xs text-gray-500">Record ad-hoc repairs and inspections directly</p>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-6 pt-4 border-t border-gray-50">
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase font-bold mb-1.5 block tracking-wider">Client Company</label>
                    <Select value={formClientId} onValueChange={(v) => { setFormClientId(v); setFormEquipmentId(""); }}>
                      <SelectTrigger className="h-11 bg-white border-gray-200 text-gray-900 focus:ring-[#66B2B2]/30">
                        <SelectValue placeholder="Select client..." />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-200 z-50">
                        {clients.length > 0 ? clients.map(c => (
                          <SelectItem key={c.id} value={c.id.toString()} className="text-gray-900">{c.companyName}</SelectItem>
                        )) : <div className="p-2 text-xs text-gray-400">No clients found</div>}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase font-bold mb-1.5 block tracking-wider">Equipment Unit</label>
                    <Select value={formEquipmentId} onValueChange={setFormEquipmentId} disabled={!formClientId}>
                      <SelectTrigger className="h-11 bg-white border-gray-200 text-gray-900 focus:ring-[#66B2B2]/30 disabled:bg-gray-50">
                        <SelectValue placeholder={formClientId ? "Select unit ID..." : "Select client first"} />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-200 z-50">
                        {equipment.filter(e => e.clientId === parseInt(formClientId)).map(e => (
                          <SelectItem key={e.id} value={e.id.toString()} className="text-gray-900">{e.unitId} — {e.manufacturer} {e.model}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase font-bold mb-1.5 block tracking-wider">Service Category</label>
                    <Select value={formType} onValueChange={setFormType}>
                      <SelectTrigger className="h-11 bg-white border-gray-200 text-gray-900 focus:ring-[#66B2B2]/30">
                        <SelectValue placeholder="Select type..." />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-200 z-50">
                        <SelectItem value="Heavy Equipment PMS" className="text-gray-900">Heavy Equipment PMS</SelectItem>
                        <SelectItem value="Calibration PMS" className="text-gray-900">Calibration PMS</SelectItem>
                        <SelectItem value="Repair" className="text-gray-900">General Repair</SelectItem>
                        <SelectItem value="Inspection" className="text-gray-900">Standard Inspection</SelectItem>
                        <SelectItem value="Installation" className="text-gray-900">New Installation</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase font-bold mb-1.5 block tracking-wider">Performing Technician</label>
                    <Input value={formTechnician} onChange={(e) => setFormTechnician(e.target.value)} className="h-11 bg-white border-gray-200 text-gray-900 focus:ring-[#66B2B2]/30" />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                 <div>
                    <label className="text-[10px] text-gray-500 uppercase font-bold mb-1.5 block tracking-wider">Work Description & Notes</label>
                    <textarea 
                      className="w-full p-4 rounded-xl border border-gray-200 text-sm text-gray-900 focus:border-[#66B2B2] focus:ring-2 focus:ring-[#66B2B2]/10 outline-none transition-all resize-none" 
                      rows={5}
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      placeholder="Detail the work performed, findings, and any parts replaced..."
                    />
                 </div>
              </div>

              <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex gap-3">
                 <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                 </div>
                 <p className="text-[11px] text-amber-800 leading-relaxed">
                   <strong>Technician Protocol:</strong> Manual logs are intended for recording work that was not pre-scheduled via automated triggers. Note that manual entries bypass the mandatory "Before/After" photo and digital signature verification flow. Use <strong>"My Tasks"</strong> for automated compliance jobs.
                 </p>
              </div>

              <Button 
                className="w-full h-12 bg-[#66B2B2] text-white font-bold hover:bg-[#5A9E9E] rounded-xl shadow-lg shadow-[#66B2B2]/20 transition-all active:scale-[0.98]"
                onClick={() => {
                  if (!formClientId || !formEquipmentId || !formDescription) {
                    toast.error("Required fields missing", { description: "Please ensure Client, Equipment and Description are filled." });
                    return;
                  }
                  addServiceRecord({
                    equipmentId: parseInt(formEquipmentId),
                    clientId: parseInt(formClientId),
                    technician: formTechnician,
                    serviceCategory: formType as any,
                    description: formDescription,
                    partsUsed: "",
                    status: "completed",
                    scheduledDate: new Date().toISOString(),
                    completedDate: new Date().toISOString(),
                    cost: 0,
                    findings: "Manually Logged Entry",
                    workDone: formDescription,
                    recommendation: "Regular monitoring advised",
                    hoursAtService: equipment.find(e => e.id === parseInt(formEquipmentId))?.currentHours || 0
                  });
                  toast.success("Service Logged Successfully", { description: "Manual entry has been added to service history." });
                  
                  // Reset form
                  setFormClientId("");
                  setFormEquipmentId("");
                  setFormDescription("");
                  setActiveTab("reports");
                }}
              >
                 <CheckCircle2 className="w-4 h-4 mr-2" />
                 Complete & Save Manual Entry
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* NEW PERSISTENT EXECUTION MODAL */}
      <ExecutionModal 
        task={executionTask} 
        onClose={() => setExecutionTask(null)} 
        onFinish={() => { setExecutionTask(null); setActiveTab("reports"); }}
      />

      {/* Service Report View Modal */}
      <Dialog open={!!showReport} onOpenChange={() => setShowReport(null)}>
        <DialogContent className="bg-white border-gray-200 max-w-4xl max-h-[95vh] overflow-auto scrollbar-hide rounded-2xl">
          {showReport && (
            <ServiceReportView
              record={showReport}
              equipment={equipment.find((eqItem) => eqItem.id === showReport.equipmentId)}
              client={clients.find((c) => c.id === showReport.clientId)}
              photos={servicePhotos.filter((p) => p.serviceRecordId === showReport.id)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* QR Scanner Modal */}
      <Dialog open={showScanner} onOpenChange={(open) => !open && stopScanning()}>
        <DialogContent className="bg-white border-gray-200 sm:max-w-lg rounded-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-gray-900 flex items-center gap-2 text-lg">
              <Camera className="w-5 h-5 text-[#10B981]" />
              Field Asset Recognition
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 pt-2">
            {scannerError && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-100 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <p className="text-xs text-red-700 leading-relaxed font-medium">{scannerError}</p>
              </div>
            )}

            <div className="relative group">
              <div 
                id="qr-reader-admin" 
                className="w-full max-w-sm mx-auto rounded-2xl overflow-hidden bg-gray-900 border-4 border-gray-100 shadow-inner"
              ></div>
              {scanning && !scannerError && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-2xl backdrop-blur-[2px]">
                  <div className="text-center">
                    <div className="w-12 h-12 border-4 border-white/20 border-t-[#10B981] rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-sm text-white font-bold tracking-widest uppercase">Targeting...</p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4 pt-4 border-t border-gray-50">
              <p className="text-[10px] text-center text-gray-400 uppercase font-bold tracking-[0.2em]">Manual Input Alternative</p>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter equipment serial..."
                  value={manualSerial}
                  onChange={(e) => setManualSerial(e.target.value)}
                  className="bg-white border-gray-200 text-gray-900 text-sm h-11 rounded-xl focus:ring-[#10B981]/20 font-mono-tech"
                />
                <Button onClick={handleManualEntry} className="bg-gray-900 text-white hover:bg-black font-bold px-6 h-11 rounded-xl shadow-lg">Recognize</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={showQR} onOpenChange={setShowQR}>
        <DialogContent className="bg-white border-gray-200 sm:max-w-md rounded-2xl shadow-2xl">
          <DialogHeader className="border-b border-gray-50 pb-4">
            <DialogTitle className="text-gray-900 flex items-center gap-2">
              <QrCode className="w-5 h-5 text-[#66B2B2]" />
              Asset Identification Label
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center p-8 bg-white rounded-xl mt-4 border border-gray-50 shadow-inner">
            <div className="bg-white p-4 rounded-xl border-2 border-gray-900 shadow-xl">
               <QRCodeSVG value={qrSerial} size={220} level="H" includeMargin={true} />
            </div>
            <div className="mt-6 text-center space-y-1">
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Serial Number</p>
              <p className="text-lg font-bold text-gray-900 font-mono-tech">{qrSerial}</p>
              <div className="inline-flex items-center px-3 py-1 bg-[#66B2B2]/10 text-[#66B2B2] rounded-full text-[10px] font-bold mt-2">
                 UNIT: {equipment.find((e) => e.serialNumber === qrSerial)?.unitId}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-6">
            <Button variant="outline" onClick={() => setShowQR(false)} className="rounded-xl h-11 text-xs font-bold border-gray-200">Cancel</Button>
            <Button onClick={() => window.print()} className="bg-[#66B2B2] text-white hover:bg-[#5A9E9E] font-bold rounded-xl h-11 shadow-lg shadow-[#66B2B2]/20">
              <Printer className="w-4 h-4 mr-2" /> Print Tag
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ExecutionModal({ task, onClose, onFinish }: { task: ServiceRecord | null, onClose: () => void, onFinish: () => void }) {
    const { 
        equipment, 
        draftExecutions, 
        updateDraftExecution, 
        clearDraftExecution,
        updateServiceRecord,
        addServicePhoto
    } = useOperationsStore();
    const { packages } = useBillingStore();
    const { clients } = useCRMStore();
    
    const draft = task ? draftExecutions[task.id] || { currentStep: 1, partsUsed: "Pending" } : null;
    const currentStep = draft?.currentStep || 1;

    // QR Scanning states
    const [isScanning, setIsScanning] = useState(false);
    const [scannerError, setScannerError] = useState<string | null>(null);
    const [isVerified, setIsVerified] = useState(false);
    const scannerRef = useRef<Html5Qrcode | null>(null);

    const startScanning = async () => {
        setIsScanning(true);
        setScannerError(null);
        
        // Wait for DOM to update so element is available
        setTimeout(async () => {
            try {
                const element = document.getElementById("qr-reader-modal");
                if (!element) return;
                
                if (!scannerRef.current) {
                    scannerRef.current = new Html5Qrcode("qr-reader-modal");
                }
                
                await scannerRef.current.start(
                    { facingMode: "environment" },
                    { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
                    (decodedText) => handleScanSuccess(decodedText),
                    () => {}
                );
            } catch (err) {
                console.error("Scanner error:", err);
                setScannerError("Failed to access camera. Please check permissions.");
                setIsScanning(false);
            }
        }, 100);
    };

    const stopScanning = async () => {
        if (scannerRef.current) {
            try {
                await scannerRef.current.stop();
                await scannerRef.current.clear();
            } catch (err) {}
            scannerRef.current = null;
        }
        setIsScanning(false);
    };

    const handleScanSuccess = async (decodedText: string) => {
        const currentEq = equipment.find(e => e.id === (draft?.equipmentId || task?.equipmentId));
        if (decodedText.trim() === currentEq?.serialNumber) {
            await stopScanning();
            setIsVerified(true);
            toast.success("Asset Verified Successfully!");
            
            // Auto-advance after a brief delay to show success state
            setTimeout(() => {
                handleNext({ equipmentId: currentEq.id });
                setIsVerified(false);
            }, 1500);
        } else {
            toast.error("Serial Mismatch: " + decodedText);
        }
    };

    const handleNext = (data: Partial<DraftExecution>) => {
        if (!task) return;
        updateDraftExecution(task.id, { ...data, currentStep: currentStep + 1 });
    };

    const handleBack = () => {
        if (!task) return;
        updateDraftExecution(task.id, { currentStep: Math.max(1, currentStep - 1) });
    };

    const submitFinalReport = () => {
        if (!task || !draft) return;
        if (!draft.techSignature || !draft.clientSignature) {
            toast.error("Both signatures required");
            return;
        }

        updateServiceRecord(task.id, {
            status: "completed",
            findings: draft.findings,
            workDone: draft.workDone,
            recommendation: draft.recommendations,
            partsUsed: draft.partsUsed,
            techSignature: draft.techSignature,
            clientSignature: draft.clientSignature,
            completedDate: new Date().toISOString(),
            equipmentId: draft.equipmentId || task.equipmentId,
            hoursAtService: equipment.find(e => e.id === (draft.equipmentId || task.equipmentId))?.currentHours || 0
        });

        if (draft.beforePhoto) {
            addServicePhoto({ serviceRecordId: task.id, type: "before", url: draft.beforePhoto, caption: "Before Service" });
        }
        if (draft.afterPhoto) {
            addServicePhoto({ serviceRecordId: task.id, type: "after", url: draft.afterPhoto, caption: "After Service" });
        }

        clearDraftExecution(task.id);
        toast.success("Final report sealed and submitted!");
        onFinish();
    };

    // Cleanup scanner on unmount or close
    useEffect(() => {
        return () => {
            if (scannerRef.current) {
                scannerRef.current.stop().catch(() => {});
                scannerRef.current.clear().catch(() => {});
            }
        };
    }, []);

    const currentEq = equipment.find(e => e.id === (draft?.equipmentId || task?.equipmentId));

    return (
        <Dialog open={!!task} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-2xl bg-white border-gray-200 max-h-[90vh] overflow-auto scrollbar-hide rounded-2xl shadow-2xl p-0">
                {task && draft && (
                    <div className="flex flex-col h-full">
                        <DialogHeader className="p-6 border-b border-gray-50 bg-gray-50/30 rounded-t-2xl">
                            <DialogTitle className="flex items-center gap-2 text-gray-900 text-lg font-bold">
                                <div className="w-8 h-8 rounded bg-[#66B2B2]/10 flex items-center justify-center">
                                    <ClipboardList className="w-4 h-4 text-[#66B2B2]" />
                                </div>
                                Service Execution: <span className="font-mono-tech">{currentEq?.unitId || `SIM-UNIT-${task.id}`}</span>
                            </DialogTitle>
                        </DialogHeader>

                        <div className="px-10 py-6 border-b border-gray-50">
                            <div className="flex items-center justify-between relative">
                                {[1, 2, 3, 4, 5].map((step, i) => (
                                    <div key={step} className="flex items-center flex-1 last:flex-none">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold z-10 transition-all ${
                                            currentStep === step ? 'bg-[#66B2B2] text-white ring-4 ring-[#66B2B2]/10 scale-110' :
                                            currentStep > step ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'
                                        }`}>
                                            {currentStep > step ? <Check className="w-4 h-4" /> : step}
                                        </div>
                                        {i < 4 && (
                                            <div className={`h-1 flex-1 mx-2 rounded-full ${currentStep > step ? 'bg-green-500' : 'bg-gray-100'}`} />
                                        )}
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-between mt-3 px-1">
                                {["Selection", "Before Photo", "Findings", "After Photo", "Signatures"].map((label, i) => (
                                    <span key={label} className={`text-[9px] font-bold uppercase tracking-wider ${currentStep === i + 1 ? 'text-[#66B2B2]' : 'text-gray-400'}`}>
                                        {label}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className="p-8 flex-1">
                            {/* STEP 1: ASSET VERIFICATION */}
                            {currentStep === 1 && (
                                <div className="space-y-6 animate-in fade-in duration-300">
                                    <div className="text-center pb-2">
                                        <h4 className="text-lg font-bold text-gray-900">Asset Verification</h4>
                                        <p className="text-sm text-gray-500">Confirm you are at the correct unit before beginning documentation.</p>
                                    </div>
                                    
                                    {currentEq ? (
                                        <div className="p-6 rounded-2xl bg-gray-900 text-white shadow-2xl space-y-6 border border-gray-800">
                                            {isScanning ? (
                                                <div className="space-y-4">
                                                    <div className="text-center">
                                                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#66B2B2]/20 text-[#66B2B2] rounded-full text-[10px] font-black uppercase tracking-[0.1em] mb-4">
                                                            <div className="w-2 h-2 rounded-full bg-[#66B2B2] animate-ping" /> Scanning Mode Active
                                                        </div>
                                                    </div>
                                                    <div className="relative aspect-square max-w-[280px] mx-auto rounded-2xl overflow-hidden border-4 border-white/10 bg-black">
                                                        <div id="qr-reader-modal" className="w-full h-full"></div>
                                                        <div className="absolute inset-0 border-[40px] border-black/40 pointer-events-none">
                                                            <div className="w-full h-full border-2 border-[#66B2B2]/50 rounded-lg relative">
                                                                <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-[#66B2B2]" />
                                                                <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-[#66B2B2]" />
                                                                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-[#66B2B2]" />
                                                                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-[#66B2B2]" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <Button 
                                                        variant="ghost" 
                                                        className="w-full text-gray-400 hover:text-white"
                                                        onClick={stopScanning}
                                                    >
                                                        Cancel Scanning
                                                    </Button>
                                                </div>
                                            ) : isVerified ? (
                                                <div className="py-12 text-center space-y-4 animate-in zoom-in-95 duration-500">
                                                    <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto border-2 border-green-500/50">
                                                        <Check className="w-10 h-10 text-green-500" />
                                                    </div>
                                                    <div>
                                                        <h5 className="text-xl font-bold text-white">Asset Verified!</h5>
                                                        <p className="text-sm text-gray-400">Lock-on confirmed. Initializing service report...</p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="flex items-start justify-between">
                                                        <div>
                                                            <div className="text-[10px] text-[#66B2B2] font-black uppercase tracking-[0.2em] mb-1">Target Asset</div>
                                                            <div className="text-2xl font-black tracking-tight">{currentEq.unitId}</div>
                                                            <div className="text-sm text-gray-400 font-bold">{currentEq.manufacturer} {currentEq.model}</div>
                                                        </div>
                                                        <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                                                            <Package className="w-6 h-6 text-[#66B2B2]" />
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-6 py-6 border-y border-white/5">
                                                        <div className="space-y-1">
                                                            <div className="text-[9px] text-gray-400 uppercase font-black tracking-widest">Serial Number</div>
                                                            <div className="text-sm font-mono-tech font-bold text-[#66B2B2]">{currentEq.serialNumber}</div>
                                                        </div>
                                                        <div className="space-y-1 text-right">
                                                            <div className="text-[9px] text-gray-400 uppercase font-black tracking-widest">Operating Time</div>
                                                            <div className="text-sm font-bold text-white">{currentEq.currentHours} Hours</div>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-4">
                                                        <Button 
                                                            className="w-full h-14 bg-[#66B2B2] hover:bg-[#5A9E9E] text-white font-black rounded-xl shadow-xl transition-all active:scale-[0.98] text-sm uppercase tracking-wider"
                                                            onClick={startScanning}
                                                        >
                                                            <QrCode className="w-5 h-5 mr-3" />
                                                            Scan QR to Unlock Service
                                                        </Button>

                                                        {scannerError && (
                                                            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-center">
                                                                <p className="text-[10px] text-red-400 font-bold uppercase tracking-tight">{scannerError}</p>
                                                            </div>
                                                        )}

                                                        <div className="text-center">
                                                            <button 
                                                                onClick={() => handleNext({ equipmentId: currentEq.id })}
                                                                className="text-[10px] font-black text-gray-500 hover:text-gray-300 uppercase tracking-widest transition-colors"
                                                            >
                                                                Tag Damaged? Verify Manually
                                                            </button>
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="p-10 text-center bg-gray-50 rounded-2xl border border-dashed">
                                            <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
                                            <p className="text-sm text-gray-500 font-bold">Error: Asset data not found for this task.</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* STEP 2: BEFORE PHOTO */}
                            {currentStep === 2 && (
                                <div className="space-y-6 animate-in fade-in duration-300">
                                    <div className="text-center">
                                        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                                            <Camera className="w-8 h-8 text-gray-400" />
                                        </div>
                                        <h4 className="text-lg font-bold text-gray-900">Pre-Service Documentation</h4>
                                        <p className="text-sm text-gray-500">Capture the initial condition of the asset.</p>
                                    </div>
                                    <VisualEvidence 
                                        label="BEFORE" 
                                        photo={draft.beforePhoto} 
                                        notes={draft.beforeNotes}
                                        onSave={(photo, notes) => handleNext({ beforePhoto: photo, beforeNotes: notes })}
                                        onBack={handleBack}
                                    />
                                </div>
                            )}

                            {currentStep === 3 && (
                                <TechnicalWorkForm 
                                    draft={draft}
                                    equipment={currentEq}
                                    client={clients.find(c => c.id === task.clientId)}
                                    packages={packages}
                                    onSave={(data) => handleNext(data)}
                                    onBack={handleBack}
                                />
                            )}

                            {currentStep === 4 && (
                                <div className="space-y-6 animate-in fade-in duration-300">
                                    <div className="text-center">
                                        <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-3">
                                            <CheckCircle2 className="w-8 h-8 text-[#10B981]" />
                                        </div>
                                        <h4 className="text-lg font-bold text-gray-900">Post-Service Documentation</h4>
                                        <p className="text-sm text-gray-500">Capture the asset state after service completion.</p>
                                    </div>
                                    <VisualEvidence 
                                        label="AFTER" 
                                        photo={draft.afterPhoto} 
                                        notes={draft.afterNotes}
                                        onSave={(photo, notes) => handleNext({ afterPhoto: photo, afterNotes: notes })}
                                        onBack={handleBack}
                                    />
                                </div>
                            )}

                            {currentStep === 5 && (
                                <div className="space-y-8 animate-in fade-in duration-300">
                                    <SignaturePad 
                                        label="Technician Verification"
                                        value={draft.techSignature}
                                        onChange={(sig) => updateDraftExecution(task.id, { techSignature: sig })}
                                        caption="I certify that the listed work has been completed to specification."
                                    />
                                    <SignaturePad 
                                        label="Client Acceptance"
                                        value={draft.clientSignature}
                                        onChange={(sig) => updateDraftExecution(task.id, { clientSignature: sig })}
                                        caption="Client representative acknowledgment of work completion."
                                    />
                                    <div className="flex gap-3">
                                        <Button variant="outline" className="flex-1 h-12 rounded-xl font-bold" onClick={handleBack}>Previous</Button>
                                        <Button className="flex-[2] h-12 bg-gray-900 text-white font-bold rounded-xl shadow-xl hover:bg-black" onClick={submitFinalReport}>
                                            Seal & Submit Final Report
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

function VisualEvidence({ label, photo, notes, onSave, onBack }: { label: string, photo?: string, notes?: string, onSave: (p: string, n: string) => void, onBack: () => void }) {
    const [localPhoto, setLocalPhoto] = useState(photo || "");
    const [localNotes, setLocalNotes] = useState(notes || "");

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => setLocalPhoto(ev.target?.result as string);
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="space-y-5">
            <div className="relative aspect-video rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 overflow-hidden group">
                {localPhoto ? (
                    <>
                        <img src={localPhoto} className="w-full h-full object-cover" alt="Evidence" />
                        <button onClick={() => setLocalPhoto("")} className="absolute top-2 right-2 bg-red-500 p-1.5 rounded-full text-white shadow-xl opacity-0 group-hover:opacity-100 transition-opacity">
                            <X className="w-4 h-4" />
                        </button>
                    </>
                ) : (
                    <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors">
                        <Camera className="w-10 h-10 text-gray-300 mb-2" />
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Capture {label} State</span>
                        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
                    </label>
                )}
            </div>
            <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1">Condition Notes</label>
                <textarea 
                    className="w-full p-4 rounded-xl border border-gray-200 text-sm focus:border-[#66B2B2] focus:ring-2 focus:ring-[#66B2B2]/10 outline-none transition-all resize-none"
                    placeholder={`Describe ${label.toLowerCase()} condition...`}
                    rows={2}
                    value={localNotes}
                    onChange={(e) => setLocalNotes(e.target.value)}
                />
            </div>
            <div className="flex gap-3">
                <Button variant="ghost" className="flex-1 h-12 rounded-xl text-gray-400 font-bold" onClick={onBack}>Previous</Button>
                <Button 
                    className="flex-[2] h-12 bg-[#66B2B2] text-white font-bold rounded-xl hover:bg-[#5A9E9E]"
                    disabled={!localPhoto}
                    onClick={() => onSave(localPhoto, localNotes)}
                >
                    Save & Proceed
                </Button>
            </div>
        </div>
    );
}

function TechnicalWorkForm({ draft, equipment, client, packages, onSave, onBack }: { draft: DraftExecution, equipment?: Equipment, client?: Client, packages: any[], onSave: (d: Partial<DraftExecution>) => void, onBack: () => void }) {
    const [fields, setFields] = useState({
        findings: draft.findings || "",
        workDone: draft.workDone || "",
        partsUsed: draft.partsUsed || "Pending",
        recommendations: draft.recommendations || ""
    });

    const activePackage = packages.find(p => p.id === equipment?.packageId);

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                  <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">Equipment Unit</div>
                  <div className="text-sm font-bold text-gray-900">{equipment?.unitId}</div>
                  <div className="text-xs text-[#66B2B2] font-bold mt-1">Runtime: {equipment?.currentHours}h</div>
                </div>
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                  <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">Service Context</div>
                  <div className="text-sm font-bold text-gray-900 truncate">{client?.companyName}</div>
                  {activePackage && <div className="text-[9px] px-1.5 py-0.5 rounded-full bg-gray-200 text-gray-700 font-bold uppercase inline-block mt-1">{activePackage.name}</div>}
                </div>
            </div>

            <div className="grid gap-4">
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1">Initial Findings / Faults</label>
                    <textarea 
                        className="w-full p-4 rounded-xl border border-gray-200 text-sm focus:border-[#66B2B2] focus:ring-2 focus:ring-[#66B2B2]/10 outline-none resize-none"
                        rows={3}
                        value={fields.findings}
                        onChange={(e) => setFields({...fields, findings: e.target.value})}
                        placeholder="Detail any damage or leaks..."
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1">Technical Work Performed</label>
                    <textarea 
                        className="w-full p-4 rounded-xl border border-gray-200 text-sm focus:border-[#66B2B2] focus:ring-2 focus:ring-[#66B2B2]/10 outline-none resize-none"
                        rows={3}
                        value={fields.workDone}
                        onChange={(e) => setFields({...fields, workDone: e.target.value})}
                        placeholder="Describe services completed..."
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1">Parts/Consumables Used</label>
                        <Input 
                            className="h-11 rounded-xl"
                            value={fields.partsUsed}
                            onChange={(e) => setFields({...fields, partsUsed: e.target.value})}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1">Recommendations</label>
                        <Input 
                            className="h-11 rounded-xl"
                            placeholder="e.g. Belt change in 500h"
                            value={fields.recommendations}
                            onChange={(e) => setFields({...fields, recommendations: e.target.value})}
                        />
                    </div>
                </div>
            </div>
            <div className="flex gap-3 pt-2">
                <Button variant="ghost" className="flex-1 h-12 rounded-xl text-gray-400 font-bold" onClick={onBack}>Previous</Button>
                <Button 
                    className="flex-[2] h-12 bg-[#66B2B2] text-white font-bold rounded-xl hover:bg-[#5A9E9E]"
                    onClick={() => onSave(fields)}
                >
                    Save Progress & Proceed
                </Button>
            </div>
        </div>
    );
}

function SignaturePad({ label, value, onChange, caption }: { label: string, value?: string, onChange: (v: string) => void, caption: string }) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const isDrawing = useRef(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext("2d");
            if (ctx) {
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.strokeStyle = "#111827";
                ctx.lineWidth = 2.5;
                ctx.lineCap = "round";
            }
        }
    }, []);

    const start = (e: React.PointerEvent) => {
        isDrawing.current = true;
        const rect = canvasRef.current!.getBoundingClientRect();
        const ctx = canvasRef.current!.getContext("2d")!;
        ctx.beginPath();
        ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
        canvasRef.current!.setPointerCapture(e.pointerId);
    };

    const move = (e: React.PointerEvent) => {
        if (!isDrawing.current) return;
        const rect = canvasRef.current!.getBoundingClientRect();
        const ctx = canvasRef.current!.getContext("2d")!;
        ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
        ctx.stroke();
    };

    const end = () => {
        if (!isDrawing.current) return;
        isDrawing.current = false;
        onChange(canvasRef.current!.toDataURL());
    };

    const reset = () => {
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext("2d")!;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        onChange("");
    };

    return (
        <div className="space-y-2">
            <div className="flex justify-between items-center px-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{label}</label>
                <button onClick={reset} className="text-[9px] font-black text-[#66B2B2] hover:underline underline-offset-2">Reset Pad</button>
            </div>
            <div className="relative group">
                <canvas 
                    ref={canvasRef} 
                    width={600} 
                    height={150} 
                    onPointerDown={start} 
                    onPointerMove={move} 
                    onPointerUp={end}
                    className="w-full h-28 border border-gray-200 rounded-xl bg-white touch-none cursor-crosshair shadow-inner"
                />
                {value && <div className="absolute top-2 right-2 px-2 py-0.5 bg-green-100 text-green-700 text-[8px] font-bold rounded-full uppercase">Captured</div>}
            </div>
            <p className="text-[10px] text-gray-400 italic ml-1">{caption}</p>
        </div>
    );
}

function ServiceReportView({ record, equipment, client, photos }: any) {
  return (
    <div className="p-2 animate-in fade-in zoom-in-95 duration-300">
      <div className="flex items-center justify-between border-b-2 border-gray-900 pb-6 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-black text-white rounded-full text-[9px] font-black uppercase tracking-[0.2em] mb-3">
             <div className="w-2 h-2 rounded-full bg-[#66B2B2] animate-pulse" /> Official Document
          </div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tighter">TECHNICAL SERVICE REPORT</h2>
          <p className="text-xs text-gray-400 font-bold tracking-widest mt-1 font-mono-tech">NEXVISION OPS SYSTEM RECORD <span className="text-gray-900 font-black">#SR-{record.id}</span></p>
        </div>
        <Button onClick={() => window.print()} className="bg-gray-100 hover:bg-gray-200 text-gray-900 h-12 px-6 border border-gray-200 text-xs font-black rounded-xl transition-all active:scale-95 shadow-sm">
          <Printer className="w-5 h-5 mr-3" />
          EXPORT SYSTEM COPY
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-12 mb-10">
        <div className="space-y-8">
          <section>
            <h4 className="text-[11px] font-black text-gray-900 uppercase tracking-[0.25em] mb-4 flex items-center gap-2">
               <div className="w-1.5 h-4 bg-[#66B2B2]" /> ASSET SPECIFICATIONS
            </h4>
            <div className="space-y-3 px-3">
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-[11px] text-gray-400 font-bold uppercase">Identification ID:</span>
                <span className="text-[11px] text-gray-900 font-black font-mono-tech tracking-wider">{equipment?.unitId}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-[11px] text-gray-400 font-bold uppercase">Manufacturer:</span>
                <span className="text-[11px] text-gray-900 font-bold">{equipment?.manufacturer}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-[11px] text-gray-400 font-bold uppercase">Model Descriptor:</span>
                <span className="text-[11px] text-gray-900 font-bold">{equipment?.model}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-[11px] text-gray-400 font-bold uppercase">Runtime Meter:</span>
                <span className="text-sm text-[#66B2B2] font-black font-mono-tech">{record.hoursAtService} HOURS</span>
              </div>
            </div>
          </section>

          <section>
             <h4 className="text-[11px] font-black text-gray-900 uppercase tracking-[0.25em] mb-4 flex items-center gap-2">
               <div className="w-1.5 h-4 bg-[#66B2B2]" /> LOGISTICAL CONTEXT
            </h4>
            <div className="space-y-3 px-3">
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-[11px] text-gray-400 font-bold uppercase">Service Category:</span>
                <span className="text-[11px] text-gray-900 font-black uppercase tracking-tighter">{record.serviceCategory}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-[11px] text-gray-400 font-bold uppercase">Primary Technician:</span>
                <span className="text-[11px] text-gray-900 font-bold">{record.technician}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-[11px] text-gray-400 font-bold uppercase">Completion Date:</span>
                <span className="text-[11px] text-gray-900 font-bold">{record.completedDate ? new Date(record.completedDate).toLocaleDateString('en-PH', {year:'numeric', month:'long', day:'numeric'}) : "PENDING"}</span>
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-8">
          <section className="h-full">
             <h4 className="text-[11px] font-black text-gray-900 uppercase tracking-[0.25em] mb-4 flex items-center gap-2">
               <div className="w-1.5 h-4 bg-[#66B2B2]" /> EXECUTIVE SUMMARY
            </h4>
            <div className="p-6 rounded-2xl bg-gray-50 border border-gray-100 space-y-6 shadow-inner h-[calc(100%-2.5rem)]">
              <div>
                <span className="text-[10px] text-[#66B2B2] font-black uppercase tracking-widest mb-2 block">Fault Diagnosis / Findings:</span>
                <p className="text-[12px] text-gray-900 font-medium leading-relaxed bg-white p-3 rounded-lg border border-gray-100">{record.findings || "Operational state nominal. No significant faults detected during primary inspection."}</p>
              </div>
              <div>
                <span className="text-[10px] text-[#66B2B2] font-black uppercase tracking-widest mb-2 block">Technical Work Documentation:</span>
                <p className="text-[12px] text-gray-900 font-medium leading-relaxed bg-white p-3 rounded-lg border border-gray-100">{record.workDone}</p>
              </div>
              <div>
                <span className="text-[10px] text-[#66B2B2] font-black uppercase tracking-widest mb-2 block">Strategic Recommendations:</span>
                <p className="text-[12px] text-gray-900 font-bold leading-relaxed italic bg-[#66B2B2]/5 p-3 rounded-lg border border-[#66B2B2]/10">{record.recommendation || "No immediate action required. Maintain standard PMS intervals."}</p>
              </div>
            </div>
          </section>
        </div>
      </div>

      <section className="mb-10">
        <h4 className="text-[11px] font-black text-gray-900 uppercase tracking-[0.25em] mb-6 flex items-center gap-2">
            <div className="w-1.5 h-4 bg-[#66B2B2]" /> FIELD DOCUMENTATION
        </h4>
        <div className="grid grid-cols-2 gap-10">
          <div className="space-y-3">
            <div className="flex items-center justify-between px-2">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Initial State Proof</span>
                <span className="text-[8px] font-bold text-[#66B2B2] uppercase">Before Service</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {photos.filter((p: any) => p.type === 'before').map((p: any, i: number) => (
                <div key={i} className="aspect-video rounded-xl overflow-hidden border-2 border-gray-100 shadow-md">
                   <img src={p.url} className="w-full h-full object-cover" alt="Before" />
                </div>
              ))}
              {photos.filter((p: any) => p.type === 'before').length === 0 && <div className="col-span-2 py-8 text-center bg-gray-50 rounded-xl border border-dashed text-[10px] text-gray-400 font-bold uppercase tracking-widest">No Before Documentation</div>}
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between px-2">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Completion Proof</span>
                <span className="text-[8px] font-bold text-green-500 uppercase">After Service</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {photos.filter((p: any) => p.type === 'after').map((p: any, i: number) => (
                <div key={i} className="aspect-video rounded-xl overflow-hidden border-2 border-gray-100 shadow-md">
                   <img src={p.url} className="w-full h-full object-cover" alt="After" />
                </div>
              ))}
              {photos.filter((p: any) => p.type === 'after').length === 0 && <div className="col-span-2 py-8 text-center bg-gray-50 rounded-xl border border-dashed text-[10px] text-gray-400 font-bold uppercase tracking-widest">No After Documentation</div>}
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-12 border-t-2 border-gray-100 pt-10 mb-6">
        <div className="space-y-4">
          <span className="text-[10px] text-gray-400 font-black uppercase tracking-[0.3em] block ml-1">Technician Certification</span>
          <div className="p-8 bg-gray-50/50 rounded-3xl border border-gray-100 flex items-center justify-center shadow-inner relative overflow-hidden">
            {record.techSignature ? (
               <img src={record.techSignature} className="h-24 object-contain contrast-125 mix-blend-multiply transition-all hover:scale-105 duration-500" alt="Tech Sig" />
            ) : <div className="h-24 flex items-center justify-center text-gray-300 italic text-[11px] font-bold uppercase tracking-widest">Digital Stamp Missing</div>}
            <div className="absolute bottom-4 left-0 right-0 text-center">
                <div className="h-[1px] w-2/3 mx-auto bg-gray-200 mb-2" />
                <span className="text-[9px] text-gray-500 font-black uppercase tracking-tighter">{record.technician} <span className="text-gray-300 mx-1">•</span> SENIOR TECHNICIAN</span>
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <span className="text-[10px] text-gray-400 font-black uppercase tracking-[0.3em] block ml-1">Client Acknowledgment</span>
          <div className="p-8 bg-gray-50/50 rounded-3xl border border-gray-100 flex items-center justify-center shadow-inner relative overflow-hidden">
            {record.clientSignature ? (
               <img src={record.clientSignature} className="h-24 object-contain contrast-125 mix-blend-multiply transition-all hover:scale-105 duration-500" alt="Client Sig" />
            ) : <div className="h-24 flex items-center justify-center text-gray-300 italic text-[11px] font-bold uppercase tracking-widest">Acknowledgment Missing</div>}
            <div className="absolute bottom-4 left-0 right-0 text-center">
                <div className="h-[1px] w-2/3 mx-auto bg-gray-200 mb-2" />
                <span className="text-[9px] text-gray-500 font-black uppercase tracking-tighter">{client?.companyName} <span className="text-gray-300 mx-1">•</span> AUTHORIZED REP</span>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center pt-8 opacity-20 hover:opacity-100 transition-opacity font-mono-tech uppercase tracking-[0.5em] text-[8px]">
         Security Verified System Record • NexVision Operations OS • Built by NexTOS
      </div>
    </div>
  );
}

function EquipmentDetail({
  equipment,
  client,
  serviceHistory,
  onViewReport,
}: {
  equipment: Equipment;
  client?: Client;
  serviceHistory: ServiceRecord[];
  onViewReport: (record: ServiceRecord) => void;
}) {
  return (
    <div className="data-card p-6 space-y-6 animate-in slide-in-from-top duration-400 bg-white border border-gray-100 rounded-2xl shadow-xl shadow-gray-100/50">
      <div className="flex items-start justify-between">
        <div>
           <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#66B2B2]/10 text-[#66B2B2] text-[9px] font-black uppercase tracking-[0.1em] mb-2">
              <Package className="w-2.5 h-2.5" /> Managed Asset
           </div>
           <h3 className="text-2xl font-bold text-gray-900 tracking-tight">{equipment.unitId}</h3>
           <p className="text-sm text-gray-500 font-medium">{equipment.manufacturer} <span className="text-gray-300 mx-1">|</span> {equipment.model}</p>
        </div>
        <div className="text-right">
           <div className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mb-1">Total Operating Time</div>
           <div className="text-3xl font-bold text-gray-900 font-mono-tech">{equipment.currentHours}<span className="text-sm ml-1 text-gray-400">H</span></div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 border-y border-gray-50 py-5">
         <div className="space-y-1">
            <div className="text-[9px] text-gray-400 uppercase font-black tracking-widest">Serial Number</div>
            <div className="text-xs font-mono-tech font-bold text-gray-900">{equipment.serialNumber}</div>
         </div>
         <div className="space-y-1">
            <div className="text-[9px] text-gray-400 uppercase font-black tracking-widest">Global Positioning</div>
            <div className="text-xs font-bold text-gray-900">{equipment.location}</div>
         </div>
         <div className="space-y-1">
            <div className="text-[9px] text-gray-400 uppercase font-black tracking-widest">Client Assignment</div>
            <div className="text-xs font-bold text-gray-900 truncate">{client?.companyName}</div>
         </div>
      </div>

      <div className="space-y-4">
        <div className="text-[10px] text-gray-400 uppercase font-black tracking-[0.2em] flex items-center gap-2">
           <History className="w-3.5 h-3.5" /> Maintenance History Timeline
        </div>
        <div className="space-y-2.5">
          {serviceHistory.filter(r => r.status === 'completed').length > 0 ? (
            serviceHistory.filter(r => r.status === 'completed').slice(0, 5).map((record) => (
              <div
                key={record.id}
                className="flex items-center justify-between p-4 rounded-xl border border-gray-50 bg-gray-50/30 hover:border-[#66B2B2]/30 hover:bg-white transition-all cursor-pointer group"
                onClick={() => onViewReport(record)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                    <Check className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-900 group-hover:text-[#66B2B2] transition-colors">{record.serviceCategory}</div>
                    <div className="text-[10px] text-gray-400 font-medium uppercase mt-0.5">{new Date(record.completedDate!).toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'})} <span className="mx-1">•</span> Tech: {record.technician}</div>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white border border-gray-100 text-gray-300 group-hover:text-[#66B2B2] transition-all">
                    <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-10 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
               <div className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.1em]">Initial State: No prior history</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
