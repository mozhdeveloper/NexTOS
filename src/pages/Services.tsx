import { useState, useCallback, useEffect, useRef } from "react";
import { useLocation } from "react-router";
import { useOperationsStore } from "@/stores/useOperationsStore";
import { useCRMStore } from "@/stores/useCRMStore";
import { useAuthStore } from "@/stores/useAuthStore";
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
  DialogTrigger,
} from "@/components/ui/dialog";

type TabType = "equipment" | "reports" | "new";

type ServiceTypeOption = {
  value: string;
  label: string;
};

type SeedClientOption = {
  id: string;
  companyName: string;
};

type SeedEquipmentOption = {
  id: string;
  name: string;
  clientId: string;
  equipmentType: string;
};

type ReportClientOption = {
  id: string;
  companyName: string;
  numericId: number;
};

const fallbackServiceTypeOptions: ServiceTypeOption[] = [
  { value: "pms", label: "PMS (Preventative Maintenance)" },
  { value: "calibration", label: "Calibration" },
  { value: "repair", label: "Repair" },
  { value: "inspection", label: "Inspection" },
  { value: "installation", label: "Installation" },
];

const serviceTypeOptions: ServiceTypeOption[] = Array.isArray(seedData.serviceTypes)
  ? seedData.serviceTypes
      .filter((option): option is ServiceTypeOption => {
        return Boolean(
          option &&
            typeof option === "object" &&
            typeof (option as ServiceTypeOption).value === "string" &&
            typeof (option as ServiceTypeOption).label === "string"
        );
      })
  : fallbackServiceTypeOptions;

const seedClientOptions: SeedClientOption[] = Array.isArray(seedData.clients)
  ? (seedData.clients as unknown[])
      .filter((client) => {
        return Boolean(
          client &&
            typeof client === "object" &&
            typeof (client as SeedClientOption).id === "string" &&
            typeof (client as SeedClientOption).companyName === "string"
        );
      })
      .map((client) => ({
        id: (client as SeedClientOption).id,
        companyName: (client as SeedClientOption).companyName,
      }))
  : [];

const seedEquipmentOptions: SeedEquipmentOption[] = Array.isArray(seedData.equipment)
  ? (seedData.equipment as unknown[])
      .filter((eq) => {
        return Boolean(
          eq &&
            typeof eq === "object" &&
            typeof (eq as SeedEquipmentOption).id === "string" &&
            typeof (eq as SeedEquipmentOption).name === "string" &&
            typeof (eq as SeedEquipmentOption).clientId === "string" &&
            typeof (eq as SeedEquipmentOption).equipmentType === "string"
        );
      })
      .map((eq) => ({
        id: (eq as SeedEquipmentOption).id,
        name: (eq as SeedEquipmentOption).name,
        clientId: (eq as SeedEquipmentOption).clientId,
        equipmentType: (eq as SeedEquipmentOption).equipmentType,
      }))
  : [];

export default function Services() {
  const { user } = useAuthStore();
  const { clients } = useCRMStore();
  const {
    equipment,
    serviceRecords,
    servicePhotos,
    addServiceRecord,
    getServiceHistory,
  } = useOperationsStore();
  const [activeTab, setActiveTab] = useState<TabType>("equipment");
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
  
  // Refs for equipment cards/rows
  const equipmentRefs = useRef<Map<number, HTMLTableRowElement>>(new Map());
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const initTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Form state
  const [formClientId, setFormClientId] = useState("");
  const [formEquipmentId, setFormEquipmentId] = useState("");
  const [formType, setFormType] = useState<ServiceType>("pms");
  const [formTechnician, setFormTechnician] = useState(user?.name || "");
  const [formDescription, setFormDescription] = useState("");
  const [formFindings, setFormFindings] = useState("");
  const [formWorkDone, setFormWorkDone] = useState("");
  const [formRecommendation, setFormRecommendation] = useState("");
  const [formParts, setFormParts] = useState("");
  const [formClientSign, setFormClientSign] = useState("");
  const [formTechSign, setFormTechSign] = useState("");
  const [beforePhotos, setBeforePhotos] = useState<string[]>([]);
  const [afterPhotos, setAfterPhotos] = useState<string[]>([]);
  const [showReport, setShowReport] = useState<ServiceRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const techSignatureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingTechSignatureRef = useRef(false);
  const hasTechSignatureRef = useRef(false);
  const clientSignatureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingClientSignatureRef = useRef(false);
  const hasClientSignatureRef = useRef(false);

  const location = useLocation();

  useEffect(() => {
    const state = location.state as { selectedUnitId?: number };
    if (state?.selectedUnitId) {
      setSelectedEquipment(state.selectedUnitId);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const initCanvas = (canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#111827";
  };

  useEffect(() => {
    if (techSignatureCanvasRef.current) initCanvas(techSignatureCanvasRef.current);
  }, []);

  useEffect(() => {
    if (clientSignatureCanvasRef.current) initCanvas(clientSignatureCanvasRef.current);
  }, []);

  const getCanvasPoint = (event: React.PointerEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement | null) => {
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  const handleTechSignatureStart = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = techSignatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const point = getCanvasPoint(event, canvas);
    if (!point) return;
    isDrawingTechSignatureRef.current = true;
    hasTechSignatureRef.current = true;
    canvas.setPointerCapture(event.pointerId);
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
  };

  const handleTechSignatureMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingTechSignatureRef.current) return;
    const canvas = techSignatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const point = getCanvasPoint(event, canvas);
    if (!point) return;
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
  };

  const handleTechSignatureEnd = () => {
    if (!isDrawingTechSignatureRef.current) return;
    isDrawingTechSignatureRef.current = false;
    const canvas = techSignatureCanvasRef.current;
    if (canvas) setFormTechSign(hasTechSignatureRef.current ? canvas.toDataURL("image/png") : "");
  };

  const clearTechSignature = () => {
    const canvas = techSignatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    hasTechSignatureRef.current = false;
    setFormTechSign("");
  };

  const handleClientSignatureStart = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = clientSignatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const point = getCanvasPoint(event, canvas);
    if (!point) return;
    isDrawingClientSignatureRef.current = true;
    hasClientSignatureRef.current = true;
    canvas.setPointerCapture(event.pointerId);
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
  };

  const handleClientSignatureMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingClientSignatureRef.current) return;
    const canvas = clientSignatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const point = getCanvasPoint(event, canvas);
    if (!point) return;
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
  };

  const handleClientSignatureEnd = () => {
    if (!isDrawingClientSignatureRef.current) return;
    isDrawingClientSignatureRef.current = false;
    const canvas = clientSignatureCanvasRef.current;
    if (canvas) setFormClientSign(hasClientSignatureRef.current ? canvas.toDataURL("image/png") : "");
  };

  const clearClientSignature = () => {
    const canvas = clientSignatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    hasClientSignatureRef.current = false;
    setFormClientSign("");
  };

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

  const filteredEquipment = equipment.filter(
    (eq: Equipment) =>
      searchQuery === "" ||
      eq.unitId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      eq.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      eq.serialNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const reportClientOptions: ReportClientOption[] =
    seedClientOptions.length > 0
      ? seedClientOptions.map((clientOption, index) => ({
          id: clientOption.id,
          companyName: clientOption.companyName,
          numericId: index + 1,
        }))
      : clients.map((client) => ({
          id: client.id.toString(),
          companyName: client.companyName,
          numericId: client.id,
        }));

  const seedReportEquipmentOptions: SeedEquipmentOption[] =
    seedClientOptions.length > 0 && formClientId
      ? seedEquipmentOptions.filter((eqItem) => eqItem.clientId === formClientId)
      : [];

  const fallbackReportEquipmentOptions: Equipment[] =
    seedClientOptions.length === 0 && formClientId
      ? equipment.filter((eqItem: Equipment) => eqItem.clientId === parseInt(formClientId, 10))
      : [];

  const handlePhotoUpload = useCallback(
    (type: "before" | "after", event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files) return;
      Array.from(files).forEach((file: File) => {
        const reader = new FileReader();
        reader.onload = (e: ProgressEvent<FileReader>) => {
          const url = e.target?.result as string;
          if (type === "before") {
            setBeforePhotos((prev) => [...prev, url]);
          } else {
            setAfterPhotos((prev) => [...prev, url]);
          }
        };
        reader.readAsDataURL(file);
      });
    },
    []
  );

  const handleSubmitReport = () => {
    setError(null);
    
    // Rule: Must have before and after photos to complete
    if (beforePhotos.length === 0 || afterPhotos.length === 0) {
      setError("Technician Rule: You must upload at least one BEFORE and one AFTER photo to complete this service.");
      return;
    }

    if (!formClientId || !formEquipmentId || !formDescription || !formClientSign || !formTechSign) {
      setError("Please fill all required fields, including signatures.");
      return;
    }

    const resolvedClientId =
      reportClientOptions.find((c) => c.id === formClientId)?.numericId ??
      parseInt(formClientId, 10);

    const resolvedEquipmentId =
      seedClientOptions.length > 0
        ? (() => {
            const index = seedEquipmentOptions.findIndex((eqItem) => eqItem.id === formEquipmentId);
            return index >= 0 ? index + 1 : parseInt(formEquipmentId, 10);
          })()
        : parseInt(formEquipmentId, 10);

    const newRecordId = Date.now();
    const record = {
      equipmentId: resolvedEquipmentId,
      clientId: resolvedClientId,
      technician: formTechnician,
      serviceType: formType,
      description: formDescription,
      findings: formFindings,
      workDone: formWorkDone,
      recommendation: formRecommendation,
      hoursAtService: equipment.find((e) => e.id === resolvedEquipmentId)?.currentHours || 0,
      partsUsed: formParts,
      status: "completed" as const,
      scheduledDate: new Date().toISOString(),
      completedDate: new Date().toISOString(),
      cost: Math.floor(Math.random() * 800) + 150,
      clientSignature: formClientSign,
      techSignature: formTechSign,
    };
    
    // 1. Add the record
    addServiceRecord({ ...record });
    
    // 2. Add the photos associated with this record
    beforePhotos.forEach(url => {
      useOperationsStore.getState().addServicePhoto({
        serviceRecordId: newRecordId,
        type: "before",
        url,
        caption: "Before service photo",
      });
    });

    afterPhotos.forEach(url => {
      useOperationsStore.getState().addServicePhoto({
        serviceRecordId: newRecordId,
        type: "after",
        url,
        caption: "After service photo",
      });
    });

    // 3. Automated Visit Tracking (Module 8 Connection)
    // Decrement the visits remaining for the client's package
    useBillingStore.getState().decrementPackageVisits(resolvedClientId, formType);
    
    // Reset form
    setFormClientId("");
    setFormEquipmentId("");
    setFormDescription("");
    setFormFindings("");
    setFormWorkDone("");
    setFormRecommendation("");
    setFormParts("");
    setFormClientSign("");
    setFormTechSign("");
    setBeforePhotos([]);
    setAfterPhotos([]);
    setError(null);
    setActiveTab("reports");
  };

  const handlePrintReport = () => {
    window.print();
  };

  const statusColors: Record<string, string> = {
    active: "bg-[#10B981]/20 text-[#10B981]",
    inactive: "bg-[#EF4444]/20 text-[#EF4444]",
    maintenance: "bg-[#66B2B2]/20 text-[#66B2B2]",
    retired: "bg-gray-100 text-gray-600",
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[32px] font-bold text-black tracking-[-0.02em]">Services</h1>
          <p className="text-sm text-gray-600 mt-0.5">Equipment, service records &amp; PMS</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {[
          { id: "equipment" as TabType, label: "Equipment", icon: Package },
          { id: "reports" as TabType, label: "Service Reports", icon: FileText },
          { id: "new" as TabType, label: "New Report", icon: Wrench },
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
          </button>
        ))}
      </div>

      {/* Equipment Tab */}
      {activeTab === "equipment" && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
              <Input
                placeholder="Search equipment..."
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
          </div>

          <div className="data-card overflow-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left py-2.5 px-3 text-gray-600 font-medium">Unit ID</th>
                  <th className="text-left py-2.5 px-3 text-gray-600 font-medium">Type</th>
                  <th className="text-left py-2.5 px-3 text-gray-600 font-medium">Serial</th>
                  <th className="text-left py-2.5 px-3 text-gray-600 font-medium">Client</th>
                  <th className="text-left py-2.5 px-3 text-gray-600 font-medium">Status</th>
                  <th className="text-left py-2.5 px-3 text-gray-600 font-medium">Hours</th>
                  <th className="text-left py-2.5 px-3 text-gray-600 font-medium">Next Service</th>
                  <th className="text-left py-2.5 px-3 text-gray-600 font-medium">QR</th>
                </tr>
              </thead>
              <tbody>
                {filteredEquipment.map((eq) => {
                  const client = clients.find((c) => c.id === eq.clientId);
                  const serviceDue = eq.currentHours >= eq.nextServiceDue;
                  return (
                    <tr
                      key={eq.id}
                      className="grid-table-row border-b border-gray-200 cursor-pointer hover:bg-gray-50"
                      onClick={() => setSelectedEquipment(selectedEquipment === eq.id ? null : eq.id)}
                    >
                      <td className="py-2.5 px-3 text-black font-mono-tech font-bold">{eq.unitId}</td>
                      <td className="py-2.5 px-3 text-black">{eq.type}</td>
                      <td className="py-2.5 px-3 text-gray-600 font-mono-tech">{eq.serialNumber}</td>
                      <td className="py-2.5 px-3 text-black">{client?.companyName || "—"}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${statusColors[eq.status]}`}>
                          {eq.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`font-mono-tech ${serviceDue ? "text-[#EF4444]" : "text-black"}`}>
                          {eq.currentHours}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`font-mono-tech ${serviceDue ? "text-[#EF4444]" : "text-gray-600"}`}>
                          {eq.nextServiceDue}h
                          {serviceDue && <AlertTriangle className="w-3 h-3 inline ml-1 text-[#EF4444]" />}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setQrSerial(eq.serialNumber);
                            setShowQR(true);
                          }}
                          className="h-7 w-7 p-0 text-gray-500 hover:text-[#66B2B2] hover:bg-[#66B2B2]/10"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {selectedEquipment && (
            <EquipmentDetail
              equipment={equipment.find((eqItem: Equipment) => eqItem.id === selectedEquipment)!}
              client={clients.find((c: Client) => c.id === equipment.find((eqItem: Equipment) => eqItem.id === selectedEquipment)?.clientId)}
              serviceHistory={getServiceHistory(selectedEquipment)}
              photos={servicePhotos}
              onViewReport={(record) => setShowReport(record)}
            />
          )}
        </div>
      )}

      {/* Reports Tab */}
      {activeTab === "reports" && (
        <div className="space-y-3">
          <div className="data-card overflow-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left py-2.5 px-3 text-gray-600 font-medium">ID</th>
                  <th className="text-left py-2.5 px-3 text-gray-600 font-medium">Equipment</th>
                  <th className="text-left py-2.5 px-3 text-gray-600 font-medium">Type</th>
                  <th className="text-left py-2.5 px-3 text-gray-600 font-medium">Technician</th>
                  <th className="text-left py-2.5 px-3 text-gray-600 font-medium">Date</th>
                  <th className="text-left py-2.5 px-3 text-gray-600 font-medium">Status</th>
                  <th className="text-left py-2.5 px-3 text-gray-600 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {serviceRecords.map((record: ServiceRecord) => {
                  const eq = equipment.find((eqItem: Equipment) => eqItem.id === record.equipmentId);
                  return (
                    <tr key={record.id} className="grid-table-row border-b border-gray-200">
                      <td className="py-2.5 px-3 text-gray-600 font-mono-tech">#{record.id}</td>
                      <td className="py-2.5 px-3 text-black font-mono-tech">{eq?.unitId || "—"}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#66B2B2]/20 text-[#66B2B2] uppercase">
                          {record.serviceType}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-black">{record.technician}</td>
                      <td className="py-2.5 px-3 text-gray-600 font-mono-tech">
                        {record.completedDate ? new Date(record.completedDate).toLocaleDateString() : "—"}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="bg-[#10B981]/20 text-[#10B981] px-1.5 py-0.5 rounded text-[10px] font-medium uppercase">
                          {record.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowReport(record)}
                          className="h-6 text-[10px] text-gray-600 hover:text-[#66B2B2]"
                        >
                          <FileText className="w-3 h-3 mr-1" />
                          View
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

      {/* New Report Tab */}
      {activeTab === "new" && (
        <div className="max-w-4xl space-y-4">
          {error && (
            <div className="p-3 rounded bg-[#EF4444]/10 border border-[#EF4444]/20 flex items-center gap-2 text-[#EF4444] text-xs font-bold">
              <AlertTriangle className="w-4 h-4" />
              {error}
            </div>
          )}

          <div className="data-card p-5 space-y-6">
            <h3 className="text-base font-bold text-black flex items-center gap-2">
              <Wrench className="w-4 h-4 text-[#66B2B2]" />
              Technician Service Logging
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] text-gray-600 uppercase tracking-wider mb-1 block font-bold">Client</label>
                  <Select
                    value={formClientId}
                    onValueChange={(value) => {
                      setFormClientId(value);
                      setFormEquipmentId("");
                    }}
                  >
                    <SelectTrigger className="h-9 bg-white border-gray-200 text-black text-xs">
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200 text-black">
                      {reportClientOptions.map((c) => (
                        <SelectItem key={c.id} value={c.id} className="text-xs text-black">
                          {c.companyName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-[10px] text-gray-600 uppercase tracking-wider mb-1 block font-bold">Equipment</label>
                  <Select
                    value={formEquipmentId}
                    onValueChange={setFormEquipmentId}
                    disabled={!formClientId}
                  >
                    <SelectTrigger
                      className={`h-9 border-gray-200 text-xs ${
                        formClientId
                          ? "bg-white text-black"
                          : "bg-gray-100 text-gray-400 cursor-not-allowed"
                      }`}
                    >
                      <SelectValue placeholder={formClientId ? "Select unit" : "Select client first"} />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200 text-black">
                      {seedClientOptions.length > 0
                        ? seedReportEquipmentOptions.map((eqItem) => (
                            <SelectItem key={eqItem.id} value={eqItem.id} className="text-xs text-black">
                              {eqItem.id} — {eqItem.name}
                            </SelectItem>
                          ))
                        : fallbackReportEquipmentOptions.map((eqItem: Equipment) => (
                            <SelectItem key={eqItem.id} value={eqItem.id.toString()} className="text-xs text-black">
                              {eqItem.unitId} — {eqItem.type}
                            </SelectItem>
                          ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] text-gray-600 uppercase tracking-wider mb-1 block font-bold">Service Type</label>
                  <Select value={formType} onValueChange={(v) => setFormType(v as ServiceType)}>
                    <SelectTrigger className="h-9 bg-white border-gray-200 text-black text-xs">
                      <SelectValue placeholder="Select service type" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200 text-black">
                      {serviceTypeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value} className="text-xs text-black">
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-[10px] text-gray-600 uppercase tracking-wider mb-1 block font-bold">Technician</label>
                  <Input
                    value={formTechnician}
                    onChange={(e) => setFormTechnician(e.target.value)}
                    className="h-9 bg-white border-gray-200 text-black text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-1 space-y-4">
                <div>
                  <label className="text-[10px] text-gray-600 uppercase tracking-wider mb-1 block font-bold">Findings</label>
                  <textarea
                    value={formFindings}
                    onChange={(e) => setFormFindings(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 rounded bg-white border border-gray-200 text-black text-xs focus:outline-none focus:border-[#66B2B2]/50 resize-none"
                    placeholder="Describe initial state & faults..."
                  />
                </div>
              </div>
              <div className="col-span-1 space-y-4">
                <div>
                  <label className="text-[10px] text-gray-600 uppercase tracking-wider mb-1 block font-bold">Work Performed</label>
                  <textarea
                    value={formWorkDone}
                    onChange={(e) => setFormWorkDone(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 rounded bg-white border border-gray-200 text-black text-xs focus:outline-none focus:border-[#66B2B2]/50 resize-none"
                    placeholder="List all actions taken..."
                  />
                </div>
              </div>
              <div className="col-span-1 space-y-4">
                <div>
                  <label className="text-[10px] text-gray-600 uppercase tracking-wider mb-1 block font-bold">Recommendation</label>
                  <textarea
                    value={formRecommendation}
                    onChange={(e) => setFormRecommendation(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 rounded bg-white border border-gray-200 text-black text-xs focus:outline-none focus:border-[#66B2B2]/50 resize-none"
                    placeholder="Advise on future maintenance..."
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] text-gray-600 uppercase tracking-wider mb-1 block font-bold">Overall Summary</label>
                <Input
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="General summary of the service visit"
                  className="h-9 bg-white border-gray-200 text-black text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-600 uppercase tracking-wider mb-1 block font-bold">Parts Used</label>
                <Input
                  value={formParts}
                  onChange={(e) => setFormParts(e.target.value)}
                  placeholder="Serial numbers or names of replaced parts"
                  className="h-9 bg-white border-gray-200 text-black text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <PhotoDropzone
                label="BEFORE"
                photos={beforePhotos}
                onUpload={(e) => handlePhotoUpload("before", e)}
                onRemove={(idx) => setBeforePhotos((prev) => prev.filter((_, i) => i !== idx))}
              />
              <PhotoDropzone
                label="AFTER"
                photos={afterPhotos}
                onUpload={(e) => handlePhotoUpload("after", e)}
                onRemove={(idx) => setBeforePhotos((prev) => prev.filter((_, i) => i !== idx))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-gray-200 pt-6">
              <div className="space-y-2">
                <label className="text-[10px] text-gray-600 uppercase tracking-wider block font-bold">Technician Signature</label>
                <div className="space-y-2">
                  <canvas
                    ref={techSignatureCanvasRef}
                    width={560}
                    height={160}
                    onPointerDown={handleTechSignatureStart}
                    onPointerMove={handleTechSignatureMove}
                    onPointerUp={handleTechSignatureEnd}
                    onPointerLeave={handleTechSignatureEnd}
                    className="w-full h-24 rounded border border-gray-200 bg-white touch-none"
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-gray-500">Draw technician signature above</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={clearTechSignature}
                      className="h-7 px-2 text-[10px] text-gray-600"
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] text-gray-600 uppercase tracking-wider block font-bold">Client Confirmation Signature</label>
                <div className="space-y-2">
                  <canvas
                    ref={clientSignatureCanvasRef}
                    width={560}
                    height={160}
                    onPointerDown={handleClientSignatureStart}
                    onPointerMove={handleClientSignatureMove}
                    onPointerUp={handleClientSignatureEnd}
                    onPointerLeave={handleClientSignatureEnd}
                    className="w-full h-24 rounded border border-gray-200 bg-white touch-none"
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-gray-500">Draw client signature above</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={clearClientSignature}
                      className="h-7 px-2 text-[10px] text-gray-600"
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <Button
              onClick={handleSubmitReport}
              className="w-full h-12 bg-[#66B2B2] hover:bg-[#66B2B2]/80 text-white font-bold text-base shadow-[0_4px_20px_-5px_rgba(102,178,178,0.3)] transition-all"
            >
              <CheckCircle2 className="w-5 h-5 mr-2" />
              Finalize & Complete Service
            </Button>
          </div>
        </div>
      )}

      {/* Service Report Dialog */}
      <Dialog open={!!showReport} onOpenChange={() => setShowReport(null)}>
        <DialogContent className="bg-white border-gray-200 max-w-4xl max-h-[95vh] overflow-auto scrollbar-hide">
          {showReport && (
            <ServiceReportView
              record={showReport}
              equipment={equipment.find((eqItem: Equipment) => eqItem.id === showReport.equipmentId)}
              client={clients.find((c: Client) => c.id === showReport.clientId)}
              photos={servicePhotos.filter((p: { serviceRecordId: number }) => p.serviceRecordId === showReport.id)}
              onPrint={handlePrintReport}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={showQR} onOpenChange={setShowQR}>
        <DialogContent className="bg-white border-gray-200 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-black flex items-center gap-2">
              <QrCode className="w-5 h-5 text-[#66B2B2]" />
              Equipment QR Code
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center p-6 bg-white rounded-lg mt-4">
            <QRCodeSVG value={qrSerial} size={200} level="H" includeMargin={true} />
            <div className="mt-4 text-center">
              <p className="text-sm font-bold text-black font-mono-tech">{qrSerial}</p>
              <p className="text-xs text-gray-600 mt-1 uppercase font-bold">
                {equipment.find((e) => e.serialNumber === qrSerial)?.unitId}
              </p>
            </div>
          </div>
          <div className="flex justify-center mt-4">
            <Button
              onClick={() => window.print()}
              className="bg-[#66B2B2] text-white hover:bg-[#66B2B2]/80 font-bold"
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

function PhotoDropzone({
  label,
  photos,
  onUpload,
  onRemove,
}: {
  label: string;
  photos: string[];
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: (idx: number) => void;
}) {
  const color = label === "BEFORE" ? "#66B2B2" : "#10B981";
  return (
    <div
      className="border-2 border-dashed rounded p-3 bg-gray-50"
      style={{ borderColor: photos.length > 0 ? `${color}40` : "#E5E7EB" }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold tracking-wider" style={{ color }}>
          {label} PHOTOS
        </span>
        <span className="text-[10px] text-gray-600 font-mono-tech">{photos.length} uploaded</span>
      </div>
      {photos.length === 0 ? (
        <label className="flex flex-col items-center justify-center py-8 cursor-pointer hover:bg-gray-100 rounded transition-colors group">
          <Camera className="w-8 h-8 text-gray-500 mb-2 group-hover:text-black transition-colors" />
          <span className="text-[10px] text-gray-600 group-hover:text-black">Required: Tap to upload</span>
          <input type="file" accept="image/*" multiple className="hidden" onChange={onUpload} />
        </label>
      ) : (
        <div className="space-y-1.5">
          <div className="grid grid-cols-3 gap-1.5">
            {photos.map((photo, idx) => (
              <div key={idx} className="relative group aspect-square">
                <img src={photo} alt={`${label} ${idx}`} className="w-full h-full object-cover rounded" />
                <button
                  onClick={() => onRemove(idx)}
                  className="absolute top-1 right-1 w-5 h-5 bg-[#EF4444] rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ))}
          </div>
          <label className="flex items-center justify-center py-2 cursor-pointer hover:bg-gray-100 rounded transition-colors">
            <Upload className="w-3 h-3 text-gray-600 mr-1" />
            <span className="text-[10px] text-gray-600">Add more</span>
            <input type="file" accept="image/*" multiple className="hidden" onChange={onUpload} />
          </label>
        </div>
      )}
    </div>
  );
}

function EquipmentDetail({
  equipment,
  client,
  serviceHistory,
  photos,
  onViewReport,
}: {
  equipment: Equipment;
  client?: Client;
  serviceHistory: ServiceRecord[];
  photos: Array<{ serviceRecordId: number; type: string; url: string }>;
  onViewReport: (record: ServiceRecord) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const eqPhotos = photos.filter((p) => serviceHistory.some((s) => s.id === p.serviceRecordId));

  return (
    <div className="data-card p-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-black">{equipment.unitId}</span>
          <span className="text-xs text-gray-600">{equipment.type}</span>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-gray-600" /> : <ChevronDown className="w-4 h-4 text-gray-600" />}
      </button>

      {expanded && (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-4 gap-4 text-xs">
            <div>
              <div className="text-[10px] text-gray-600 uppercase font-bold mb-0.5">Manufacturer</div>
              <div className="text-black">{equipment.manufacturer}</div>
            </div>
            <div>
              <div className="text-[10px] text-gray-600 uppercase font-bold mb-0.5">Model</div>
              <div className="text-black">{equipment.model}</div>
            </div>
            <div>
              <div className="text-[10px] text-gray-600 uppercase font-bold mb-0.5">Serial</div>
              <div className="text-black font-mono-tech">{equipment.serialNumber}</div>
            </div>
            <div>
              <div className="text-[10px] text-gray-600 uppercase font-bold mb-0.5">Status</div>
              <span className="px-1.5 py-0.5 rounded bg-[#10B981]/20 text-[#10B981] text-[9px] font-bold uppercase">
                {equipment.status}
              </span>
            </div>
          </div>

          <div>
            <div className="text-[10px] text-gray-600 uppercase font-bold mb-2">Service History ({serviceHistory.length})</div>
            <div className="space-y-1.5">
              {serviceHistory.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between p-2.5 rounded bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors border border-gray-200"
                  onClick={() => onViewReport(record)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-[#66B2B2]/10 flex items-center justify-center">
                      <Wrench className="w-4 h-4 text-[#66B2B2]" />
                    </div>
                    <div>
                      <div className="text-xs text-black font-bold capitalize">{record.serviceType}</div>
                      <div className="text-[10px] text-gray-600">{record.technician} • {record.completedDate ? new Date(record.completedDate).toLocaleDateString() : "—"}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-[#66B2B2] font-mono-tech font-bold">₱{record.cost.toFixed(2)}</div>
                    <span className="text-[9px] text-[#10B981] font-bold uppercase tracking-wider">Completed</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ServiceReportView({
  record,
  equipment,
  client,
  photos,
  onPrint,
}: {
  record: ServiceRecord;
  equipment?: Equipment;
  client?: Client;
  photos: Array<{ type: string; url: string; caption: string }>;
  onPrint: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-gray-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-black">Digital Service Report</h2>
          <p className="text-xs text-gray-600 mt-1">Generated by NexTOS</p>
        </div>
        <Button
          onClick={onPrint}
          className="bg-white hover:bg-gray-50 text-gray-700 h-9 px-4 border border-gray-200"
        >
          <Printer className="w-4 h-4 mr-2" />
          Print Report
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-8">
        <div className="space-y-4">
          <section>
            <h4 className="text-[10px] font-bold text-[#66B2B2] uppercase tracking-widest mb-2">Customer & Asset</h4>
            <div className="data-card p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-[11px] text-gray-600">Client:</span>
                <span className="text-[11px] text-black font-bold">{client?.companyName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[11px] text-gray-600">Equipment:</span>
                <span className="text-[11px] text-black">{equipment?.unitId} ({equipment?.type})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[11px] text-gray-600">Serial:</span>
                <span className="text-[11px] text-black font-mono-tech">{equipment?.serialNumber}</span>
              </div>
            </div>
          </section>

          <section>
            <h4 className="text-[10px] font-bold text-[#66B2B2] uppercase tracking-widest mb-2">Service Details</h4>
            <div className="data-card p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-[11px] text-gray-600">Type:</span>
                <span className="text-[11px] text-black font-bold uppercase">{record.serviceType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[11px] text-gray-600">Technician:</span>
                <span className="text-[11px] text-black">{record.technician}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[11px] text-gray-600">Date:</span>
                <span className="text-[11px] text-black">{record.completedDate ? new Date(record.completedDate).toLocaleDateString() : "—"}</span>
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-4">
          <section>
            <h4 className="text-[10px] font-bold text-[#66B2B2] uppercase tracking-widest mb-2">Technical Summary</h4>
            <div className="data-card p-4 space-y-4">
              <div>
                <span className="text-[10px] text-gray-600 uppercase font-bold mb-1 block">Findings:</span>
                <p className="text-xs text-black leading-relaxed">{record.findings || "No findings recorded."}</p>
              </div>
              <div>
                <span className="text-[10px] text-gray-600 uppercase font-bold mb-1 block">Work Performed:</span>
                <p className="text-xs text-black leading-relaxed">{record.workDone || record.description}</p>
              </div>
              <div>
                <span className="text-[10px] text-gray-600 uppercase font-bold mb-1 block">Recommendation:</span>
                <p className="text-xs text-black leading-relaxed italic">{record.recommendation || "Maintain regular schedule."}</p>
              </div>
            </div>
          </section>
        </div>
      </div>

      <section>
        <h4 className="text-[10px] font-bold text-[#66B2B2] uppercase tracking-widest mb-3">Documentation Photos</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <span className="text-[9px] font-bold text-[#66B2B2] tracking-widest">BEFORE PHOTOS</span>
            <div className="grid grid-cols-2 gap-2">
              {photos.filter(p => p.type === 'before').map((p, i) => (
                <img key={i} src={p.url} className="w-full h-32 object-cover rounded border border-gray-200" alt="Before" />
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <span className="text-[9px] font-bold text-[#10B981] tracking-widest">AFTER PHOTOS</span>
            <div className="grid grid-cols-2 gap-2">
              {photos.filter(p => p.type === 'after').map((p, i) => (
                <img key={i} src={p.url} className="w-full h-32 object-cover rounded border border-gray-200" alt="After" />
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-8 border-t border-gray-200 pt-6">
        <div className="space-y-2">
          <span className="text-[10px] text-gray-600 uppercase font-bold block">Technician E-Signature</span>
          <div className="p-4 bg-gray-50 rounded border border-gray-200">
            <div className="text-xl font-mono-tech italic text-black tracking-wide">{record.techSignature}</div>
            <div className="text-[9px] text-gray-600 mt-2 border-t border-gray-200 pt-1 uppercase">Digitally Verified Technician</div>
          </div>
        </div>
        <div className="space-y-2">
          <span className="text-[10px] text-gray-600 uppercase font-bold block">Client Approval Signature</span>
          <div className="p-4 bg-gray-50 rounded border border-gray-200">
            <div className="text-xl font-mono-tech italic text-black tracking-wide">{record.clientSignature}</div>
            <div className="text-[9px] text-gray-600 mt-2 border-t border-gray-200 pt-1 uppercase">Confirmed by Client Representative</div>
          </div>
        </div>
      </div>
    </div>
  );
}
