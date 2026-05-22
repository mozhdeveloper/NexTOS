import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useLocation } from "react-router";
import { useOperationsStore, type DraftExecution } from "@/stores/useOperationsStore";
import { useCRMStore } from "@/stores/useCRMStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { useBillingStore } from "@/stores/useBillingStore";
import seedData from "@/data/seed-data.json";
import type { ServiceType, Equipment, ServiceRecord, Client } from "@/types";
import { trpc } from "@/providers/trpc";
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
  Plus,
  CalendarClock,
  Pencil,
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
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogDescription,
} from "@/components/ui/dialog";

import { useInventoryStore } from "@/stores/useInventoryStore";
import { ServiceReportView } from "@/components/ServiceReportView";

type TabType = "tasks" | "equipment" | "reports" | "new" | "scheduled-maintenance";

type ScheduledMaintenanceEntry = {
  id: string;
  equipmentId: string;
  scheduleIndex?: number;
  equipmentName: string;
  clientId: string;
  clientName: string;
  serialNumber: string;
  serviceType: string;
  serviceInterval: number;
  serviceIntervalUnit: string;
  estimatedCost: number;
  status: "OK" | "Near Service" | "Overdue" | "—";
};

const SCHEDULED_MAINTENANCE_KEY = "nextos-user-scheduled-maintenance";
const PM_INTERVAL_UNITS = ["Hours", "KM", "Weeks", "Months", "Years"] as const;

const serviceTypeOptions = [
  { value: "Heavy Equipment PMS", label: "Heavy Equipment PMS" },
  { value: "Calibration PMS", label: "Calibration PMS" },
  { value: "Repair", label: "General Repair" },
  { value: "Inspection", label: "Standard Inspection" },
  { value: "Installation", label: "Installation" },
];

function getPmsMetricLabel(unit: string): string {
  switch (unit.toLowerCase()) {
    case "km": return "KM Logged";
    case "weeks": return "Weeks Logged";
    case "months": return "Months Logged";
    case "years": return "Years Logged";
    default: return "Hours Logged";
  }
}

function getPmsMetricValue(seedEq: any, unit: string, gps001CacheMs: number): string {
  const u = unit.toLowerCase();
  if (u === "hours") {
    if (seedEq?.id === "EQ-001" && gps001CacheMs > 0) {
      const totalMin = Math.floor(gps001CacheMs / (1000 * 60));
      return `${Math.floor(totalMin / 60)}h ${totalMin % 60}m`;
    }
    return seedEq?.hoursTotal ?? "—";
  }
  if (u === "km") {
    const km = seedEq?.kmTotal;
    return (km !== undefined && km !== null) ? `${km} km` : "—";
  }
  const raw = seedEq?.days;
  const d = typeof raw === "number" ? raw : parseFloat(String(raw ?? ""));
  if (!Number.isFinite(d) || d < 0) return "—";
  if (u === "weeks") return `${(d / 7).toFixed(1)} wk`;
  if (u === "months") return `${(d / 30.44).toFixed(1)} mo`;
  if (u === "years") return `${(d / 365.25).toFixed(2)} yr`;
  return "—";
}

function mapPmsServiceCategory(serviceType?: string, equipmentType?: string): string {
  const st = (serviceType ?? "").toLowerCase();
  if (st.includes("calibration")) return "Calibration PMS";
  if (st.includes("repair")) return "Repair";
  if (st.includes("inspection")) return "Inspection";
  if (st.includes("installation")) return "Installation";
  if (st.includes("pms") || st.includes("preventative") || st.includes("preventive")) return "Heavy Equipment PMS";
  const et = (equipmentType ?? "").toLowerCase();
  if (et.includes("lab") || et.includes("testing")) return "Calibration PMS";
  return "Heavy Equipment PMS";
}

function readUserScheduledMaintenance(): ScheduledMaintenanceEntry[] {
  try {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(SCHEDULED_MAINTENANCE_KEY) : null;
    return raw ? (JSON.parse(raw) as ScheduledMaintenanceEntry[]) : [];
  } catch {
    return [];
  }
}

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
    clearSimulationData: storeClearSimulationData
  } = useOperationsStore();

  const { packages } = useBillingStore();

  const [activeTab, setActiveTabRaw] = useState<TabType>(() => {
    try { return (sessionStorage.getItem("nextos-services-tab") as TabType) ?? "tasks"; }
    catch { return "tasks"; }
  });
  const setActiveTab = (tab: TabType) => {
    try { sessionStorage.setItem("nextos-services-tab", tab); } catch {}
    setActiveTabRaw(tab);
  };
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEquipment, setSelectedEquipment] = useState<number | null>(null);
  // Tracks which seed equipment ID ("EQ-001" etc.) is visually selected in the Equipment table.
  const [selectedSeedId, setSelectedSeedId] = useState<string | null>(null);

  const clearSimulationData = useCallback(() => {
    storeClearSimulationData();
    // Reset selected equipment if it was a simulation unit
    if (selectedEquipment) {
      const eq = equipment.find(e => e.id === selectedEquipment);
      if (eq && (eq.notes?.includes("TEST DATA") || eq.unitId?.startsWith("SIM-"))) {
        setSelectedEquipment(null);
      }
    }
  }, [storeClearSimulationData, selectedEquipment, equipment]);

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

  // Scheduled maintenance state
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduleEquipmentId, setScheduleEquipmentId] = useState("");
  const [scheduleServiceType, setScheduleServiceType] = useState("");
  const [scheduleInterval, setScheduleInterval] = useState("");
  const [scheduleIntervalUnit, setScheduleIntervalUnit] = useState("Hours");
  const [scheduleEstimatedCost, setScheduleEstimatedCost] = useState("");
  const [scheduleMissingFields, setScheduleMissingFields] = useState<string[]>([]);
  const [userScheduledMaintenance, setUserScheduledMaintenance] = useState<ScheduledMaintenanceEntry[]>(readUserScheduledMaintenance);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ScheduledMaintenanceEntry | null>(null);
  const [editEquipmentId, setEditEquipmentId] = useState("");
  const [editServiceType, setEditServiceType] = useState("");
  const [editInterval, setEditInterval] = useState("");
  const [editIntervalUnit, setEditIntervalUnit] = useState("Hours");
  const [editEstimatedCost, setEditEstimatedCost] = useState("");
  const [editMissingFields, setEditMissingFields] = useState<string[]>([]);
  const updateSeedEquipmentMutation = trpc.seedEquipment.update.useMutation();
  const addPmsConfigurationMutation = trpc.seedEquipment.addPmsConfiguration.useMutation();
  const updatePmsConfigurationMutation = trpc.seedEquipment.updatePmsConfiguration.useMutation();
  const deletePmsConfigurationMutation = trpc.seedEquipment.deletePmsConfiguration.useMutation();
  const upsertSeedServiceRecord = trpc.seedServiceRecords.upsert.useMutation();
  const completeSeedServiceRecord = trpc.seedServiceRecords.complete.useMutation();
  const { data: seedServiceRecordsData } = trpc.seedServiceRecords.list.useQuery(undefined, {
    staleTime: 60_000,
  });
  // processingPmsRef removed — deterministic task IDs are used for dedup instead.
  const seedRecordsInjectedRef = useRef(false);

  // Reactive GPS cache for Excavator CAT 320 status — mirrors what Fleet.tsx writes
  const [gps001CacheMs, setGps001CacheMs] = useState<number>(() => {
    try { return Number(window.localStorage.getItem("nextos-gps001-total-hours-ms") ?? "0") || 0; }
    catch { return 0; }
  });
  useEffect(() => {
    const refresh = () => {
      try {
        const ms = Number(window.localStorage.getItem("nextos-gps001-total-hours-ms") ?? "0") || 0;
        setGps001CacheMs((prev) => (prev !== ms ? ms : prev));
      } catch {}
    };
    const id = setInterval(refresh, 30_000);
    window.addEventListener("storage", refresh);
    return () => { clearInterval(id); window.removeEventListener("storage", refresh); };
  }, []);

  // EQ-001: total km — same localStorage key Fleet writes to (nextos-gps001-total-km)
  const [gps001KmTotal, setGps001KmTotal] = useState<number>(() => {
    try { return Number(window.localStorage.getItem("nextos-gps001-total-km") ?? "0") || 0; }
    catch { return 0; }
  });
  // EQ-001: working days — Fleet stores this in fleet:gps001WorkingDaysByDay:v2 as {ymd: count}
  const [gps001WorkingDays, setGps001WorkingDays] = useState<number>(() => {
    try {
      const raw = window.localStorage.getItem("fleet:gps001WorkingDaysByDay:v2");
      if (!raw) return 0;
      const parsed = JSON.parse(raw) as Record<string, number>;
      const entries = Object.entries(parsed).sort((a, b) => b[0].localeCompare(a[0]));
      return entries[0]?.[1] ?? 0;
    } catch { return 0; }
  });
  useEffect(() => {
    const refresh = () => {
      try {
        const km = Number(window.localStorage.getItem("nextos-gps001-total-km") ?? "0") || 0;
        setGps001KmTotal((prev) => (prev !== km ? km : prev));
        const raw = window.localStorage.getItem("fleet:gps001WorkingDaysByDay:v2");
        if (raw) {
          const parsed = JSON.parse(raw) as Record<string, number>;
          const days = Object.entries(parsed).sort((a, b) => b[0].localeCompare(a[0]))[0]?.[1] ?? 0;
          setGps001WorkingDays((prev) => (prev !== days ? days : prev));
        }
      } catch {}
    };
    const id = setInterval(refresh, 30_000);
    window.addEventListener("storage", refresh);
    return () => { clearInterval(id); window.removeEventListener("storage", refresh); };
  }, []);

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

  const filteredSeedEquipment = (seedData.equipment as any[]).filter((s) =>
    searchQuery === "" ||
    (s.name ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.serialNumber ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.equipmentType ?? "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Compute the status for a single pmsConfiguration entry given an equipment's usage metrics.
  const computeEntryStatus = (
    pms: any,
    eq: any
  ): ScheduledMaintenanceEntry["status"] => {
    const interval = Number(pms?.serviceInterval ?? 0);
    if (!Number.isFinite(interval) || interval <= 0) return "—";

    const unit = String(pms?.serviceIntervalUnit ?? "Hours").toLowerCase();
    let usage: number | null = null;

    if (unit === "hours") {
      if (eq.id === "EQ-001" && gps001CacheMs > 0) {
        usage = gps001CacheMs / (1000 * 60 * 60);
      } else {
        const match = String(eq.hoursTotal ?? "").match(/(\d+)\s*h\s*(\d+)\s*m/i);
        if (match) usage = Number(match[1]) + Number(match[2]) / 60;
      }
    } else if (unit === "km") {
      const raw = eq.kmTotal;
      const parsed = typeof raw === "number" ? raw : parseFloat(String(raw ?? "").replace(/[^\d.]/g, ""));
      usage = Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
    } else {
      const raw = eq.days;
      const days = typeof raw === "number" ? raw : parseFloat(String(raw ?? ""));
      if (Number.isFinite(days) && days >= 0) {
        if (unit === "weeks") usage = days / 7;
        else if (unit === "months") usage = days / 30.44;
        else if (unit === "years") usage = days / 365.25;
      }
    }

    if (usage === null || !Number.isFinite(usage) || usage < 0) return "—";
    const progress = (usage / interval) * 100;
    if (progress >= 100) return "Overdue";
    if (progress >= 80) return "Near Service";
    return "OK";
  };

  const computeNextService = (
    pms: { serviceInterval: number; serviceIntervalUnit: string },
    eq: any
  ): string => {
    const interval = Number(pms?.serviceInterval ?? 0);
    if (!Number.isFinite(interval) || interval <= 0) return "—";

    const unit = String(pms?.serviceIntervalUnit ?? "Hours").toLowerCase();
    let usage: number | null = null;

    if (unit === "hours") {
      if (eq.id === "EQ-001" && gps001CacheMs > 0) {
        usage = gps001CacheMs / (1000 * 60 * 60);
      } else {
        const match = String(eq.hoursTotal ?? "").match(/(\d+)\s*h\s*(\d+)\s*m/i);
        if (match) usage = Number(match[1]) + Number(match[2]) / 60;
      }
    } else if (unit === "km") {
      const raw = eq.kmTotal;
      const parsed = typeof raw === "number" ? raw : parseFloat(String(raw ?? "").replace(/[^\d.]/g, ""));
      usage = Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
    } else {
      const raw = eq.days;
      const days = typeof raw === "number" ? raw : parseFloat(String(raw ?? ""));
      if (Number.isFinite(days) && days >= 0) {
        if (unit === "weeks") usage = days / 7;
        else if (unit === "months") usage = days / 30.44;
        else if (unit === "years") usage = days / 365.25;
      }
    }

    if (usage === null || !Number.isFinite(usage) || usage < 0) return "—";
    const remaining = interval - usage;
    if (remaining <= 0) return "Past due";
    if (unit === "hours") return `${Math.round(remaining)}h`;
    if (unit === "km") return `${Math.round(remaining)} km`;
    if (unit === "weeks") return `${remaining.toFixed(1)} wk`;
    if (unit === "months") return `${remaining.toFixed(1)} mo`;
    if (unit === "years") return `${remaining.toFixed(2)} yr`;
    return "—";
  };

  // Returns the worst status across ALL pmsConfiguration entries for a seed equipment object.
  const computeEquipmentWorstStatus = (seedEq: any): "OK" | "Near Service" | "Overdue" | null => {
    if (!seedEq) return null;
    const configs: any[] = Array.isArray(seedEq.pmsConfiguration) ? seedEq.pmsConfiguration : [];
    if (configs.length === 0) return null;
    const statuses = configs.map((pms) => computeEntryStatus(pms, seedEq));
    if (statuses.includes("Overdue")) return "Overdue";
    if (statuses.includes("Near Service")) return "Near Service";
    if (statuses.includes("OK")) return "OK";
    return null;
  };

  // Format gps001CacheMs to a readable hours string for display.
  const formatGps001Hours = (): string => {
    if (!gps001CacheMs || gps001CacheMs <= 0) return "—";
    const totalMin = Math.floor(gps001CacheMs / (1000 * 60));
    return `${Math.floor(totalMin / 60)}h ${totalMin % 60}m`;
  };

  // One row per pmsConfiguration array entry — status computed independently per entry.
  // Reactive to gps001CacheMs so EQ-001 updates live.
  const seedScheduledMaintenance = useMemo((): ScheduledMaintenanceEntry[] => {
    const entries: ScheduledMaintenanceEntry[] = [];

    (seedData.equipment as any[]).forEach((eq) => {
      const configs: any[] = Array.isArray(eq.pmsConfiguration) ? eq.pmsConfiguration : [];
      if (configs.length === 0) return;

      const client = (seedData.clients as any[]).find((c) => c.id === eq.clientId);
      const clientName = client?.companyName ?? "—";

      configs.forEach((pms: any, index: number) => {
        entries.push({
          id: index === 0 ? `seed-pms-${eq.id}` : `seed-sched-${eq.id}-${index}`,
          equipmentId: eq.id,
          scheduleIndex: index,
          equipmentName: eq.name ?? "—",
          clientId: eq.clientId,
          clientName,
          serialNumber: eq.serialNumber ?? "—",
          serviceType: pms.serviceType ?? "PMS (Preventative Maintenance)",
          serviceInterval: Number(pms.serviceInterval ?? 0),
          serviceIntervalUnit: pms.serviceIntervalUnit ?? "Hours",
          estimatedCost: Number(pms.estimatedCost ?? 0),
          status: computeEntryStatus(pms, eq),
        });
      });
    });

    return entries;
  }, [gps001CacheMs]);

  // Merge seed entries (overridden by user edits) with any optimistic entries not yet in seed.
  const allScheduledMaintenance = useMemo(() => {
    const userById = new Map(userScheduledMaintenance.map((e) => [e.id, e]));
    const merged = seedScheduledMaintenance.map((e) => userById.get(e.id) ?? e);
    const seedIds = new Set(seedScheduledMaintenance.map((e) => e.id));
    const extraUserEntries = userScheduledMaintenance.filter((e) => !seedIds.has(e.id));
    return [...merged, ...extraUserEntries];
  }, [seedScheduledMaintenance, userScheduledMaintenance]);

  // Purge stale localStorage overrides whenever seed changes — seed-data.json is ground truth.
  useEffect(() => {
    const seedIds = new Set(seedScheduledMaintenance.map((e) => e.id));
    setUserScheduledMaintenance((prev) => {
      const cleaned = prev.filter((e) => !seedIds.has(e.id));
      if (cleaned.length !== prev.length) {
        window.localStorage.setItem(SCHEDULED_MAINTENANCE_KEY, JSON.stringify(cleaned));
        return cleaned;
      }
      return prev;
    });
  }, [seedScheduledMaintenance]);

  // Sync seed-persisted PMS records with the store on mount.
  // 1. Remove stale PMS tasks that were deleted from seed-data.json (e.g. after data resets).
  // 2. Inject any open PMS tasks from seed-data.json that aren't in the store yet.
  useEffect(() => {
    if (!seedServiceRecordsData?.records || seedRecordsInjectedRef.current) return;
    seedRecordsInjectedRef.current = true;

    const seedIds = new Set(seedServiceRecordsData.records.map((r) => r.id));

    // Step 1: purge stale PMS tasks from the store.
    // A record is a PMS task if its ID is in the deterministic range 9_000_000–9_999_999
    // OR its description carries the _src:"pms" marker (legacy random-ID tasks).
    useOperationsStore.setState((state) => ({
      serviceRecords: state.serviceRecords.filter((r) => {
        const isPms =
          (r.id >= 9_000_000 && r.id < 10_000_000) ||
          (() => { try { return JSON.parse(r.description ?? "{}")._src === "pms"; } catch { return false; } })();
        if (isPms) return seedIds.has(r.id);
        return true;
      }),
    }));

    // Step 2: inject open records from seed-data.json that aren't in the store yet.
    for (const record of seedServiceRecordsData.records) {
      if (record.status === "completed") continue;
      useOperationsStore.setState((state) => {
        if (state.serviceRecords.some((r) => r.id === record.id)) return state;
        return {
          serviceRecords: [
            ...state.serviceRecords,
            { ...record, invoiceId: null, createdAt: new Date().toISOString() },
          ],
        };
      });
    }
  }, [seedServiceRecordsData]);

  // Auto-create a scheduled task for every Overdue PMS entry.
  // Uses a DETERMINISTIC task ID so the store itself is the dedup source —
  // no ref needed, safe across remounts / React Strict Mode double-invocation.
  useEffect(() => {
    if (!equipment.length) return;
    const overdueEntries = allScheduledMaintenance.filter((e) => e.status === "Overdue");

    for (const entry of overdueEntries) {
      const pmsIdx = entry.scheduleIndex ?? 0;
      const seedEqId = entry.equipmentId;

      // Stable ID: 9_0XX_YZZ where XX = equipment number, Y = LAB vs EQ prefix, ZZ = pmsIdx
      const isLab = seedEqId.startsWith("LAB");
      const eqNum = parseInt(seedEqId.replace(/\D/g, "") || "0");
      const taskId = 9_000_000 + (isLab ? 100_000 : 0) + eqNum * 100 + pmsIdx;

      // Skip if an open (non-completed) task already exists with this exact ID.
      if (serviceRecords.some((r) => r.id === taskId && r.status !== "completed")) continue;

      const seedEq = (seedData.equipment as any[]).find((s) => s.id === seedEqId);
      if (!seedEq) continue;

      const storeEq =
        equipment.find((e) => (e.equipmentType ?? "").toLowerCase() === (seedEq.equipmentType ?? "").toLowerCase()) ??
        equipment.find((e) => (e.type ?? "").toLowerCase().includes((seedEq.name ?? "").split(" ")[0].toLowerCase())) ??
        equipment[0];
      if (!storeEq) continue;

      const clientId = Number(String(seedEq.clientId).replace(/\D/g, "")) || 1;
      const serviceCategory = mapPmsServiceCategory(entry.serviceType, seedEq.equipmentType);

      const description = JSON.stringify({
        _src: "pms",
        _seedEqId: seedEqId,
        _pmsIdx: pmsIdx,
        label: `${entry.serviceType} for ${entry.equipmentName}`,
      });

      // Replace any stale completed record with the same ID before inserting the new task.
      useOperationsStore.setState((state) => ({
        serviceRecords: [
          ...state.serviceRecords.filter((r) => r.id !== taskId),
          {
            id: taskId,
            equipmentId: storeEq.id,
            clientId,
            technician: "Pending Assignment",
            serviceCategory,
            description,
            partsUsed: "Pending Inspection",
            status: "scheduled" as const,
            scheduledDate: new Date().toISOString(),
            completedDate: null,
            cost: entry.estimatedCost || 0,
            findings: "",
            workDone: "",
            recommendation: "",
            hoursAtService: storeEq.currentHours || 0,
            invoiceId: null,
            createdAt: new Date().toISOString(),
          },
        ],
      }));

      upsertSeedServiceRecord.mutate({
        id: taskId,
        seedEquipmentId: seedEqId,
        pmsConfigIndex: pmsIdx,
        equipmentId: storeEq.id,
        clientId,
        serviceCategory,
        status: "scheduled",
        scheduledDate: new Date().toISOString(),
        technician: "Pending Assignment",
        description,
        findings: "",
        workDone: "",
        recommendation: "",
        partsUsed: "Pending Inspection",
        cost: entry.estimatedCost || 0,
        hoursAtService: storeEq.currentHours || 0,
      });

      toast.info("PMS Task Auto-Created", {
        description: `${entry.equipmentName} — ${entry.serviceType} is overdue.`,
      });
    }
  }, [allScheduledMaintenance, serviceRecords]);

  const handleDeleteEntry = async (entry: ScheduledMaintenanceEntry) => {
    const seedEq = (seedData.equipment as any[]).find((e) => e.id === entry.equipmentId);
    if (seedEq && entry.scheduleIndex !== undefined) {
      try {
        await deletePmsConfigurationMutation.mutateAsync({
          equipmentId: seedEq.id,
          configIndex: entry.scheduleIndex,
        });
        toast.success(`Deleted "${entry.serviceType}" schedule for ${entry.equipmentName}.`);
      } catch {
        toast.error("Failed to delete schedule. Please try again.");
        return;
      }
    }
    // Also remove from localStorage optimistic state
    setUserScheduledMaintenance((prev) => {
      const next = prev.filter((e) => e.id !== entry.id);
      window.localStorage.setItem(SCHEDULED_MAINTENANCE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const handleScheduleSubmit = async () => {
    const missing: string[] = [];
    if (!scheduleEquipmentId) missing.push("equipment");
    if (!scheduleServiceType) missing.push("serviceType");
    if (!scheduleInterval || Number(scheduleInterval) <= 0) missing.push("serviceInterval");
    if (missing.length > 0) {
      setScheduleMissingFields(missing);
      return;
    }

    const seedEq = (seedData.equipment as any[]).find((e) => e.id === scheduleEquipmentId);
    if (!seedEq) return;
    const client = (seedData.clients as any[]).find((c) => c.id === seedEq.clientId);

    const serviceTypeLabel =
      serviceTypeOptions.find((opt) => opt.value === scheduleServiceType)?.label ?? scheduleServiceType;
    const numericInterval = Number(scheduleInterval);
    const intervalUnit = scheduleIntervalUnit as "Hours" | "KM" | "Weeks" | "Months" | "Years";
    const numericCost = Number(scheduleEstimatedCost) || 0;

    // Duplicate check — same equipment + same interval + unit + service type
    const isDuplicate = allScheduledMaintenance.some(
      (e) =>
        e.equipmentId === scheduleEquipmentId &&
        e.serviceInterval === numericInterval &&
        e.serviceIntervalUnit.toLowerCase() === intervalUnit.toLowerCase() &&
        e.serviceType.toLowerCase() === serviceTypeLabel.toLowerCase()
    );
    if (isDuplicate) {
      toast.error(
        "A schedule with the same interval, unit, and service type already exists for this equipment."
      );
      return;
    }

    // Always append to the pmsConfiguration array — there is no "primary vs additional" distinction
    let optimisticConfigIndex = Array.isArray(seedEq.pmsConfiguration) ? seedEq.pmsConfiguration.length : 0;

    try {
      const result = await addPmsConfigurationMutation.mutateAsync({
        equipmentId: seedEq.id,
        serviceInterval: numericInterval,
        serviceIntervalUnit: intervalUnit,
        serviceType: serviceTypeLabel,
        ...(numericCost > 0 ? { estimatedCost: numericCost } : {}),
      });
      optimisticConfigIndex = result.configIndex ?? optimisticConfigIndex;
    } catch {
      toast.error("Failed to write to seed data. Changes are saved locally only.");
    }

    const optimisticId =
      optimisticConfigIndex === 0
        ? `seed-pms-${seedEq.id}`
        : `seed-sched-${seedEq.id}-${optimisticConfigIndex}`;

    const optimisticEntry: ScheduledMaintenanceEntry = {
      id: optimisticId,
      equipmentId: seedEq.id,
      scheduleIndex: optimisticConfigIndex,
      equipmentName: seedEq.name ?? "—",
      clientId: seedEq.clientId,
      clientName: client?.companyName ?? "—",
      serialNumber: seedEq.serialNumber ?? "—",
      serviceType: serviceTypeLabel,
      serviceInterval: numericInterval,
      serviceIntervalUnit: scheduleIntervalUnit,
      estimatedCost: numericCost,
      status: (seedEq.status ?? "—") as ScheduledMaintenanceEntry["status"],
    };

    const existingIdx = userScheduledMaintenance.findIndex((e) => e.id === optimisticId);
    const next =
      existingIdx >= 0
        ? userScheduledMaintenance.map((e, i) => (i === existingIdx ? optimisticEntry : e))
        : [...userScheduledMaintenance, optimisticEntry];

    setUserScheduledMaintenance(next);
    window.localStorage.setItem(SCHEDULED_MAINTENANCE_KEY, JSON.stringify(next));
    resetScheduleModal();
    setScheduleModalOpen(false);
    toast.success("Maintenance scheduled successfully");
  };

  const resetScheduleModal = () => {
    setScheduleEquipmentId("");
    setScheduleServiceType("");
    setScheduleInterval("");
    setScheduleIntervalUnit("Hours");
    setScheduleEstimatedCost("");
    setScheduleMissingFields([]);
  };

  const openEditModal = (entry: ScheduledMaintenanceEntry) => {
    setEditingEntry(entry);
    setEditEquipmentId(entry.equipmentId);
    // entry.serviceType may be stored as a label ("Installation") or a value ("installation") —
    // find the matching option by value first, then by label, so the Select pre-selects correctly.
    const matchingOption = serviceTypeOptions.find(
      (opt) => opt.value === entry.serviceType || opt.label === entry.serviceType
    );
    setEditServiceType(matchingOption?.value ?? entry.serviceType);
    setEditInterval(String(entry.serviceInterval));
    setEditIntervalUnit(entry.serviceIntervalUnit);
    setEditEstimatedCost(entry.estimatedCost > 0 ? String(entry.estimatedCost) : "");
    setEditMissingFields([]);
    setEditModalOpen(true);
  };

  const resetEditModal = () => {
    setEditingEntry(null);
    setEditEquipmentId("");
    setEditServiceType("");
    setEditInterval("");
    setEditIntervalUnit("Hours");
    setEditEstimatedCost("");
    setEditMissingFields([]);
  };

  const handleEditSubmit = async () => {
    if (!editingEntry) return;
    const missing: string[] = [];
    if (!editEquipmentId) missing.push("equipment");
    if (!editServiceType) missing.push("serviceType");
    if (!editInterval || Number(editInterval) <= 0) missing.push("serviceInterval");
    if (missing.length > 0) {
      setEditMissingFields(missing);
      return;
    }

    const seedEq = (seedData.equipment as any[]).find((e) => e.id === editEquipmentId);
    if (!seedEq) return;
    const client = (seedData.clients as any[]).find((c) => c.id === seedEq.clientId);

    // Convert dropdown value ("pms") → label ("PMS (Preventative Maintenance)") for seed-data.json
    const serviceTypeLabel =
      serviceTypeOptions.find((opt) => opt.value === editServiceType)?.label ?? editServiceType;
    const numericInterval = Number(editInterval);
    const intervalUnit = editIntervalUnit as "Hours" | "KM" | "Weeks" | "Months" | "Years";

    // All entries now have scheduleIndex (even index 0) — always use updatePmsConfigurationMutation
    try {
      await updatePmsConfigurationMutation.mutateAsync({
        equipmentId: seedEq.id,
        configIndex: editingEntry.scheduleIndex ?? 0,
        serviceInterval: numericInterval,
        serviceIntervalUnit: intervalUnit,
        serviceType: serviceTypeLabel,
        ...(Number(editEstimatedCost) > 0 ? { estimatedCost: Number(editEstimatedCost) } : {}),
      });
    } catch {
      toast.error("Failed to write to seed data. Changes are saved locally only.");
    }

    const updatedEntry: ScheduledMaintenanceEntry = {
      ...editingEntry,
      equipmentId: seedEq.id,
      equipmentName: seedEq.name ?? "—",
      clientId: seedEq.clientId,
      clientName: client?.companyName ?? "—",
      serialNumber: seedEq.serialNumber ?? "—",
      serviceType: serviceTypeLabel,
      serviceInterval: numericInterval,
      serviceIntervalUnit: editIntervalUnit,
      estimatedCost: Number(editEstimatedCost) || 0,
    };

    const existingIdx = userScheduledMaintenance.findIndex((e) => e.id === editingEntry.id);
    const next =
      existingIdx >= 0
        ? userScheduledMaintenance.map((e, i) => (i === existingIdx ? updatedEntry : e))
        : [...userScheduledMaintenance, updatedEntry];

    setUserScheduledMaintenance(next);
    window.localStorage.setItem(SCHEDULED_MAINTENANCE_KEY, JSON.stringify(next));
    resetEditModal();
    setEditModalOpen(false);
    toast.success("Maintenance updated successfully");
  };

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
          { id: "scheduled-maintenance" as TabType, label: "Scheduled Maintenance", icon: CalendarClock },
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

                // Resolve display data from seed for PMS auto-tasks, store for manual/sim tasks
                let pmsMeta: any = {};
                try { pmsMeta = JSON.parse(task.description ?? "{}"); } catch {}
                const isPmsTask = pmsMeta._src === "pms";
                const pmsSeedEq = isPmsTask
                  ? (seedData.equipment as any[]).find((s) => s.id === pmsMeta._seedEqId) ?? null
                  : null;
                const pmsCfg = pmsSeedEq && pmsMeta._pmsIdx !== undefined
                  ? (Array.isArray(pmsSeedEq.pmsConfiguration) ? pmsSeedEq.pmsConfiguration[pmsMeta._pmsIdx] : null)
                  : null;
                const pmsSeedClient = pmsSeedEq
                  ? (seedData.clients as any[]).find((c) => c.id === pmsSeedEq.clientId) ?? null
                  : null;

                const displayName = isPmsTask
                  ? (pmsSeedEq?.name ?? eq?.unitId ?? "Unknown Equipment")
                  : (eq?.unitId ?? "No unit selected");
                const displaySub = isPmsTask
                  ? null
                  : (eq ? `${eq.manufacturer} ${eq.model}` : null);
                const displayClient = isPmsTask
                  ? (pmsSeedClient?.companyName ?? client?.companyName ?? "Unknown Client")
                  : (client?.companyName ?? "Unknown Client");
                const metricUnit = pmsCfg?.serviceIntervalUnit ?? "Hours";
                const metricLabel = isPmsTask ? getPmsMetricLabel(metricUnit) : "Hours Logged";
                const metricValue = isPmsTask
                  ? getPmsMetricValue(pmsSeedEq, metricUnit, gps001CacheMs)
                  : `${eq?.currentHours || 0}h`;

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
                        <h4 className="text-sm font-bold text-gray-900 group-hover:text-[#66B2B2] transition-colors">{displayName}</h4>
                        {displaySub && <p className="text-[10px] text-gray-500 mb-2">{displaySub}</p>}

                        <div className="space-y-1 mt-3">
                          <div className="flex justify-between text-[11px]">
                            <span className="text-gray-500">Service:</span>
                            <span className="text-gray-900 font-bold">{task.serviceCategory}</span>
                          </div>
                          <div className="flex justify-between text-[11px]">
                            <span className="text-gray-500">Client:</span>
                            <span className="text-gray-900">{displayClient}</span>
                          </div>
                          <div className="flex justify-between text-[11px]">
                            <span className="text-gray-500">{metricLabel}:</span>
                            <span className="text-gray-900 font-mono-tech">{metricValue}</span>
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
                  if (selectedSeedId) {
                    const seedEqForQr = (seedData.equipment as any[]).find(s => s.id === selectedSeedId);
                    if (seedEqForQr?.serialNumber) {
                      setQrSerial(seedEqForQr.serialNumber);
                      setShowQR(true);
                    }
                  }
                }}
                className="h-8 border-gray-200 bg-white text-gray-700 hover:bg-[#66B2B2] hover:text-white"
                disabled={!selectedSeedId}
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
                    <th className="text-left py-2.5 px-3 text-gray-600 font-bold uppercase tracking-wider">Equipment</th>
                    <th className="text-left py-2.5 px-3 text-gray-600 font-bold uppercase tracking-wider">Client</th>
                    <th className="text-left py-2.5 px-3 text-gray-600 font-bold uppercase tracking-wider">Serial Number</th>
                    <th className="text-left py-2.5 px-3 text-gray-600 font-bold uppercase tracking-wider">Total Hours</th>
                    <th className="text-left py-2.5 px-3 text-gray-600 font-bold uppercase tracking-wider">Total Km</th>
                    <th className="text-left py-2.5 px-3 text-gray-600 font-bold uppercase tracking-wider">Days</th>
                    <th className="text-left py-2.5 px-3 text-gray-600 font-bold uppercase tracking-wider">Weeks</th>
                    <th className="text-left py-2.5 px-3 text-gray-600 font-bold uppercase tracking-wider">Months</th>
                    <th className="text-left py-2.5 px-3 text-gray-600 font-bold uppercase tracking-wider">Years</th>
                    <th className="text-left py-2.5 px-3 text-gray-600 font-bold uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSeedEquipment.map((seedEq) => {
                    const seedClient = (seedData.clients as any[]).find((c) => c.id === seedEq.clientId);
                    const storeEq = equipment.find((e) => e.serialNumber === seedEq.serialNumber);
                    const storeId = storeEq?.id ?? null;

                    // EQ-001: pull hours/km/days from Fleet's localStorage caches
                    const isExcavator = seedEq.id === "EQ-001";
                    const hoursDisplay = isExcavator
                      ? formatGps001Hours()
                      : (seedEq.hoursTotal ?? "—");

                    const rawKm = isExcavator ? gps001KmTotal : seedEq.kmTotal;
                    const kmNum = rawKm !== undefined && rawKm !== null
                      ? (typeof rawKm === "number" ? rawKm : parseFloat(String(rawKm).replace(/[^\d.]/g, "")))
                      : null;
                    const kmDisplay = kmNum !== null && Number.isFinite(kmNum) ? `${kmNum.toFixed(2)} km` : "—";

                    const rawDays = isExcavator ? gps001WorkingDays : seedEq.days;
                    const daysNum = rawDays !== undefined && rawDays !== null
                      ? (typeof rawDays === "number" ? rawDays : parseFloat(String(rawDays).replace(/[^\d.]/g, "")))
                      : null;
                    const validDays = daysNum !== null && Number.isFinite(daysNum) && daysNum >= 0;
                    const daysDisplay = validDays ? `${Math.floor(daysNum!)}` : "—";
                    const weeksDisplay = validDays ? `${(daysNum! / 7).toFixed(1)}` : "—";
                    const monthsDisplay = validDays ? `${(daysNum! / 30.44).toFixed(1)}` : "—";
                    const yearsDisplay = validDays ? `${(daysNum! / 365.25).toFixed(1)}` : "—";

                    const worstStatus = computeEquipmentWorstStatus(seedEq);
                    const isSelected = selectedSeedId === seedEq.id;
                    const isHighlighted = storeId !== null && highlightedEquipment === storeId;

                    return (
                      <tr
                        key={seedEq.id}
                        ref={(el) => {
                          if (storeId !== null) {
                            if (el) equipmentRefs.current.set(storeId, el);
                            else equipmentRefs.current.delete(storeId);
                          }
                        }}
                        className={`grid-table-row border-b border-gray-100 cursor-pointer hover:bg-[#66B2B2]/5 transition-all ${
                          isSelected || isHighlighted ? 'bg-[#66B2B2]/10 border-[#66B2B2]/30' : ''
                        }`}
                        onClick={() => {
                          if (selectedSeedId === seedEq.id) {
                            setSelectedSeedId(null);
                            setSelectedEquipment(null);
                          } else {
                            setSelectedSeedId(seedEq.id);
                            setSelectedEquipment(storeId);
                          }
                        }}
                      >
                        <td className="py-3 px-3 text-black font-medium">{seedEq.name ?? "—"}</td>
                        <td className="py-3 px-3 text-black">{seedClient?.companyName ?? "—"}</td>
                        <td className="py-3 px-3 text-gray-600 font-mono-tech">{seedEq.serialNumber ?? "—"}</td>
                        <td className="py-3 px-3 font-mono-tech text-gray-800">{hoursDisplay}</td>
                        <td className="py-3 px-3 font-mono-tech text-gray-800">{kmDisplay}</td>
                        <td className="py-3 px-3 font-mono-tech text-gray-800">{daysDisplay}</td>
                        <td className="py-3 px-3 font-mono-tech text-gray-800">{weeksDisplay}</td>
                        <td className="py-3 px-3 font-mono-tech text-gray-800">{monthsDisplay}</td>
                        <td className="py-3 px-3 font-mono-tech text-gray-800">{yearsDisplay}</td>
                        <td className="py-3 px-3">
                          {worstStatus === "Overdue" ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#EF4444]/20 text-[#EF4444] uppercase">Overdue</span>
                          ) : worstStatus === "Near Service" ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#F2A900]/20 text-[#F2A900] uppercase">Near Service</span>
                          ) : worstStatus === "OK" ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#10B981]/20 text-[#10B981] uppercase">OK</span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {selectedSeedId && (() => {
              // Find matching store equipment; fall back to first available for display purposes
              const detailStoreEq = equipment.find((e) => e.id === selectedEquipment) ?? equipment[0];
              if (!detailStoreEq) return null;
              // Service history: prefer records for this equipment, fall back to any completed records
              const ownHistory = serviceRecords.filter(r => r.equipmentId === detailStoreEq.id);
              const serviceHistory = ownHistory.length > 0
                ? ownHistory
                : serviceRecords.filter(r => r.status === 'completed').slice(0, 5);
              return (
                <EquipmentDetail
                  equipment={detailStoreEq}
                  client={clients.find((c) => c.id === detailStoreEq.clientId)}
                  serviceHistory={serviceHistory}
                  onViewReport={(record) => setShowReport(record)}
                />
              );
            })()}
          </div>
        )}

        {/* Scheduled Maintenance Tab */}
        {activeTab === "scheduled-maintenance" && (
          <div className="space-y-3 animate-in fade-in duration-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-[#66B2B2]" />
                <span className="text-sm font-bold text-black">Scheduled Maintenance (PMS)</span>
              </div>
              <Button
                size="sm"
                onClick={() => setScheduleModalOpen(true)}
                className="h-8 bg-[#F2A900] text-black hover:bg-[#F2A900]/90 font-semibold text-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Schedule Service
              </Button>
            </div>

            <div className="data-card overflow-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left py-2.5 px-3 text-gray-600 font-medium">Equipment</th>
                    <th className="text-left py-2.5 px-3 text-gray-600 font-medium">Client</th>
                    <th className="text-left py-2.5 px-3 text-gray-600 font-medium">Serial Number</th>
                    <th className="text-left py-2.5 px-3 text-gray-600 font-medium">Service Type</th>
                    <th className="text-left py-2.5 px-3 text-gray-600 font-medium">Interval</th>
                    <th className="text-left py-2.5 px-3 text-gray-600 font-medium">Unit</th>
                    <th className="text-left py-2.5 px-3 text-gray-600 font-medium">Est. Cost</th>
                    <th className="text-left py-2.5 px-3 text-gray-600 font-medium">Status</th>
                    <th className="text-left py-2.5 px-3 text-gray-600 font-medium">Next Service</th>
                    <th className="text-left py-2.5 px-3 text-gray-600 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {allScheduledMaintenance.map((entry) => {
                    const _seedEq = (seedData.equipment as any[]).find((e) => e.id === entry.equipmentId);
                    const nextService = _seedEq
                      ? computeNextService({ serviceInterval: entry.serviceInterval, serviceIntervalUnit: entry.serviceIntervalUnit }, _seedEq)
                      : "—";
                    return (
                    <tr key={entry.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="py-2.5 px-3 text-black font-medium">{entry.equipmentName}</td>
                      <td className="py-2.5 px-3 text-gray-700">{entry.clientName}</td>
                      <td className="py-2.5 px-3 text-gray-600 font-mono">{entry.serialNumber}</td>
                      <td className="py-2.5 px-3 text-black">{entry.serviceType}</td>
                      <td className="py-2.5 px-3 text-black font-mono">{entry.serviceInterval}</td>
                      <td className="py-2.5 px-3 text-gray-600">{entry.serviceIntervalUnit}</td>
                      <td className="py-2.5 px-3 text-black">
                        {entry.estimatedCost > 0
                          ? `₱${entry.estimatedCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          : "—"}
                      </td>
                      <td className="py-2.5 px-3">
                        {entry.status === "Overdue" ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#EF4444]/20 text-[#EF4444] uppercase">Overdue</span>
                        ) : entry.status === "Near Service" ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#F2A900]/20 text-[#F2A900] uppercase">Near Service</span>
                        ) : entry.status === "OK" ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#10B981]/20 text-[#10B981] uppercase">OK</span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-500 uppercase">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-mono-tech text-xs text-gray-700">{nextService}</td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEditModal(entry)} className="h-6 w-6 p-0 text-gray-500 hover:text-[#66B2B2] hover:bg-[#66B2B2]/10">
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteEntry(entry)} disabled={deletePmsConfigurationMutation.isPending} className="h-6 w-6 p-0 text-gray-500 hover:text-[#EF4444] hover:bg-[#EF4444]/10">
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                  })}
                  {allScheduledMaintenance.length === 0 && (
                    <tr>
                      <td colSpan={10} className="py-10 text-center text-gray-400">
                        No scheduled maintenance entries. Click "+ Schedule Service" to add one.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Schedule Service Modal */}
            <Dialog open={scheduleModalOpen} onOpenChange={(open) => { if (!open) resetScheduleModal(); setScheduleModalOpen(open); }}>
              <DialogContent className="bg-white border border-gray-200 max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-black flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-[#66B2B2]" /> Schedule Maintenance
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  {scheduleMissingFields.length > 0 && (
                    <div className="rounded border border-[#EF4444]/40 bg-[#EF4444]/10 px-3 py-2 text-xs text-[#EF4444]">Please fill in all required fields.</div>
                  )}
                  <div className="space-y-1.5">
                    <Label className="text-sm text-black font-medium">Equipment</Label>
                    <Select value={scheduleEquipmentId} onValueChange={(v) => { setScheduleEquipmentId(v); setScheduleMissingFields((p) => p.filter((f) => f !== "equipment")); }}>
                      <SelectTrigger className={`w-full bg-white text-black ${scheduleMissingFields.includes("equipment") ? "border-[#EF4444]" : "border-gray-200"}`}><SelectValue placeholder="Select equipment" /></SelectTrigger>
                      <SelectContent className="bg-white border-gray-200">
                        {(seedData.equipment as any[]).map((eq) => <SelectItem key={eq.id} value={eq.id}>{eq.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm text-black font-medium">Service Type</Label>
                    <Select value={scheduleServiceType} onValueChange={(v) => { setScheduleServiceType(v); setScheduleMissingFields((p) => p.filter((f) => f !== "serviceType")); }}>
                      <SelectTrigger className={`w-full bg-white text-black ${scheduleMissingFields.includes("serviceType") ? "border-[#EF4444]" : "border-gray-200"}`}><SelectValue placeholder="Select service type" /></SelectTrigger>
                      <SelectContent className="bg-white border-gray-200">
                        {serviceTypeOptions.map((opt) => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-[1fr_130px] gap-2">
                    <div className="space-y-1.5">
                      <Label className="text-sm text-black font-medium">Service Interval</Label>
                      <Input type="number" min="1" step="any" value={scheduleInterval} onChange={(e) => { setScheduleInterval(e.target.value); setScheduleMissingFields((p) => p.filter((f) => f !== "serviceInterval")); }} placeholder="e.g. 500" className={`bg-white text-black placeholder:text-gray-400 ${scheduleMissingFields.includes("serviceInterval") ? "border-[#EF4444]" : "border-gray-200"}`} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm text-black font-medium">Unit</Label>
                      <Select value={scheduleIntervalUnit} onValueChange={setScheduleIntervalUnit}>
                        <SelectTrigger className="w-full bg-white border-gray-200 text-black"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-white border-gray-200">{PM_INTERVAL_UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm text-black font-medium">Estimated Cost</Label>
                    <Input type="number" min="0" step="0.01" value={scheduleEstimatedCost} onChange={(e) => setScheduleEstimatedCost(e.target.value)} placeholder="$0.00" className="bg-white border-gray-200 text-black placeholder:text-gray-400" />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => { resetScheduleModal(); setScheduleModalOpen(false); }} className="border-gray-200 text-gray-600 hover:bg-gray-50" disabled={addPmsConfigurationMutation.isPending}>Cancel</Button>
                  <Button onClick={handleScheduleSubmit} className="bg-[#F2A900] text-black hover:bg-[#F2A900]/90 font-semibold" disabled={addPmsConfigurationMutation.isPending}>{addPmsConfigurationMutation.isPending ? "Saving…" : "Schedule →"}</Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Edit Maintenance Modal */}
            <Dialog open={editModalOpen} onOpenChange={(open) => { if (!open) resetEditModal(); setEditModalOpen(open); }}>
              <DialogContent className="bg-white border border-gray-200 max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-black flex items-center gap-2">
                    <Pencil className="w-4 h-4 text-[#66B2B2]" /> Edit Maintenance
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  {editMissingFields.length > 0 && (
                    <div className="rounded border border-[#EF4444]/40 bg-[#EF4444]/10 px-3 py-2 text-xs text-[#EF4444]">Please fill in all required fields.</div>
                  )}
                  <div className="space-y-1.5">
                    <Label className="text-sm text-black font-medium">Equipment</Label>
                    <Select value={editEquipmentId} onValueChange={(v) => { setEditEquipmentId(v); setEditMissingFields((p) => p.filter((f) => f !== "equipment")); }}>
                      <SelectTrigger className={`w-full bg-white text-black ${editMissingFields.includes("equipment") ? "border-[#EF4444]" : "border-gray-200"}`}><SelectValue placeholder="Select equipment" /></SelectTrigger>
                      <SelectContent className="bg-white border-gray-200">
                        {(seedData.equipment as any[]).map((eq) => <SelectItem key={eq.id} value={eq.id}>{eq.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm text-black font-medium">Service Type</Label>
                    <Select value={editServiceType} onValueChange={(v) => { setEditServiceType(v); setEditMissingFields((p) => p.filter((f) => f !== "serviceType")); }}>
                      <SelectTrigger className={`w-full bg-white text-black ${editMissingFields.includes("serviceType") ? "border-[#EF4444]" : "border-gray-200"}`}><SelectValue placeholder="Select service type" /></SelectTrigger>
                      <SelectContent className="bg-white border-gray-200">
                        {serviceTypeOptions.map((opt) => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-[1fr_130px] gap-2">
                    <div className="space-y-1.5">
                      <Label className="text-sm text-black font-medium">Service Interval</Label>
                      <Input type="number" min="1" step="any" value={editInterval} onChange={(e) => { setEditInterval(e.target.value); setEditMissingFields((p) => p.filter((f) => f !== "serviceInterval")); }} placeholder="e.g. 500" className={`bg-white text-black placeholder:text-gray-400 ${editMissingFields.includes("serviceInterval") ? "border-[#EF4444]" : "border-gray-200"}`} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm text-black font-medium">Unit</Label>
                      <Select value={editIntervalUnit} onValueChange={setEditIntervalUnit}>
                        <SelectTrigger className="w-full bg-white border-gray-200 text-black"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-white border-gray-200">{PM_INTERVAL_UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm text-black font-medium">Estimated Cost</Label>
                    <Input type="number" min="0" step="0.01" value={editEstimatedCost} onChange={(e) => setEditEstimatedCost(e.target.value)} placeholder="$0.00" className="bg-white border-gray-200 text-black placeholder:text-gray-400" />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => { resetEditModal(); setEditModalOpen(false); }} className="border-gray-200 text-gray-600 hover:bg-gray-50" disabled={updatePmsConfigurationMutation.isPending}>Cancel</Button>
                  <Button onClick={handleEditSubmit} className="bg-[#66B2B2] text-white hover:bg-[#66B2B2]/90 font-semibold" disabled={updatePmsConfigurationMutation.isPending}>{updatePmsConfigurationMutation.isPending ? "Saving…" : "Save Changes"}</Button>
                </div>
              </DialogContent>
            </Dialog>
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
                    const reportSeedEq = eq
                      ? (seedData.equipment as any[]).find((s) => s.serialNumber === eq.serialNumber)
                      : null;
                    const reportEquipmentName = reportSeedEq?.name ?? eq?.unitId ?? "—";
                    return (
                      <tr key={record.id} className="grid-table-row border-b border-gray-100 hover:bg-gray-50 transition-all">
                        <td className="py-3 px-3 text-gray-500 font-mono-tech">#{record.id}</td>
                        <td className="py-3 px-3 text-black font-bold">{reportEquipmentName}</td>
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
          <DialogHeader className="sr-only">
            <DialogTitle>Service Report Detail</DialogTitle>
            <DialogDescription>Detailed documentation of the maintenance service performed.</DialogDescription>
          </DialogHeader>
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
            <DialogDescription className="text-xs text-gray-500">
              Scan equipment QR code to identify and manage the asset in the field.
            </DialogDescription>
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
            <DialogDescription className="text-xs text-gray-500">
              Unique QR code for physical asset tracking and field identification.
            </DialogDescription>
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
    const { logPartUsage } = useInventoryStore();
    const { packages } = useBillingStore();
    const { clients } = useCRMStore();
    const completeSeedServiceRecordMutation = trpc.seedServiceRecords.complete.useMutation();
    
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
        // Use the seed serial for PMS tasks; fall back to store serial for sim/manual tasks
        let _scanMeta: any = {};
        try { _scanMeta = JSON.parse(task?.description ?? "{}"); } catch {}
        const _scanSeedEq = _scanMeta._src === "pms"
          ? (seedData.equipment as any[]).find((s) => s.id === _scanMeta._seedEqId) ?? null
          : null;
        const expectedSerial = _scanSeedEq?.serialNumber ?? currentEq?.serialNumber ?? "";
        if (decodedText.trim() === expectedSerial) {
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

        // Log Part Usage and Deduct Stock
        if (draft.selectedParts && draft.selectedParts.length > 0) {
            draft.selectedParts.forEach(part => {
                logPartUsage({
                    serviceRecordId: task.id,
                    inventoryItemId: part.inventoryItemId,
                    quantityUsed: part.quantity
                });
            });
        }

        updateServiceRecord(task.id, {
            status: "completed",
            findings: draft.findings,
            workDone: draft.workDone,
            recommendation: draft.recommendations,
            partsUsed: draft.selectedParts?.map(p => `${p.name} (x${p.quantity})`).join(", ") || "None",
            techSignature: draft.techSignature,
            clientSignature: draft.clientSignature,
            safetyChecklist: draft.safetyChecklist,
            completedDate: new Date().toISOString(),
            equipmentId: draft.equipmentId || task.equipmentId,
            hoursAtService: draft.hoursAtService || equipment.find(e => e.id === (draft.equipmentId || task.equipmentId))?.currentHours || 0
        });

        if (draft.beforePhoto) {
            addServicePhoto({ serviceRecordId: task.id, type: "before", url: draft.beforePhoto, caption: "Before Service" });
        }
        if (draft.afterPhoto) {
            addServicePhoto({ serviceRecordId: task.id, type: "after", url: draft.afterPhoto, caption: "After Service" });
        }

        // If this task originated from an overdue PMS entry, persist completion to seed-data.json.
        try {
          const meta = JSON.parse(task.description ?? "{}");
          if (meta._src === "pms") {
            completeSeedServiceRecordMutation.mutate({
              id: task.id,
              completedDate: new Date().toISOString(),
              technician: draft.techSignature ? "Technician (Signed)" : "Pending",
              findings: draft.findings ?? "",
              workDone: draft.workDone ?? "",
              recommendation: draft.recommendations ?? "",
              partsUsed: draft.selectedParts?.map((p) => `${p.name} (x${p.quantity})`).join(", ") || "",
              cost: 0,
              hoursAtService: draft.hoursAtService ?? 0,
            });
          }
        } catch { /* non-PMS task — skip */ }

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

    // For PMS auto-tasks, resolve display values from seed data so they match the real equipment.
    let _pmsMeta: any = {};
    try { _pmsMeta = JSON.parse(task?.description ?? "{}"); } catch {}
    const _isPmsTask = _pmsMeta._src === "pms";
    const _pmsSeedEq = _isPmsTask
      ? (seedData.equipment as any[]).find((s) => s.id === _pmsMeta._seedEqId) ?? null
      : null;

    // Serial number used for QR verification and display
    const displaySerial = _pmsSeedEq?.serialNumber ?? currentEq?.serialNumber ?? "";
    // Equipment name shown in the header and Step 1 card
    const displayName = _pmsSeedEq?.name ?? currentEq?.unitId ?? `SIM-UNIT-${task?.id}`;
    const displaySubtitle = _pmsSeedEq?.equipmentType ?? (currentEq ? `${currentEq.manufacturer} ${currentEq.model}` : "");
    const displayClient = _pmsSeedEq?.clientId
      ? ((seedData.clients as any[]).find((c) => c.id === _pmsSeedEq.clientId)?.companyName ?? null)
      : null;
    const _pmsCfg = _pmsSeedEq?.pmsConfiguration?.[_pmsMeta._pmsIdx] ?? null;
    // Operating time: GPS cache for EQ-001, seed hoursTotal otherwise
    const displayOperatingTime = (() => {
      if (_pmsSeedEq?.id === "EQ-001") {
        try {
          const ms = Number(window.localStorage.getItem("nextos-gps001-total-hours-ms") ?? "0") || 0;
          if (ms > 0) {
            const totalMin = Math.floor(ms / (1000 * 60));
            return `${Math.floor(totalMin / 60)}h ${totalMin % 60}m`;
          }
        } catch { /* fall through */ }
      }
      return _pmsSeedEq?.hoursTotal ?? `${currentEq?.currentHours ?? 0}h`;
    })();

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
                                Service Execution: <span className="font-mono-tech">{displayName}</span>
                            </DialogTitle>
                            <DialogDescription className="text-xs text-gray-500 mt-1">
                                Complete the following steps to document and finalize the service execution for this asset.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="px-10 py-6 border-b border-gray-50">
                            <div className="flex items-center justify-between relative">
                                {[1, 2, 3, 4, 5, 6].map((step, i) => (
                                    <div key={step} className="flex items-center flex-1 last:flex-none">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold z-10 transition-all ${
                                            currentStep === step ? 'bg-[#66B2B2] text-white ring-4 ring-[#66B2B2]/10 scale-110' :
                                            currentStep > step ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'
                                        }`}>
                                            {currentStep > step ? <Check className="w-4 h-4" /> : step}
                                        </div>
                                        {i < 5 && (
                                            <div className={`h-1 flex-1 mx-2 rounded-full ${currentStep > step ? 'bg-green-500' : 'bg-gray-100'}`} />
                                        )}
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-between mt-3 px-1">
                                {["Scan", "Safety", "Before", "Findings", "After", "Sign"].map((label, i) => (
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
                                                            <div className="text-2xl font-black tracking-tight">{displayName}</div>
                                                            {displayClient && <div className="text-xs text-[#66B2B2] font-semibold mt-0.5">{displayClient}</div>}
                                                            <div className="text-sm text-gray-400 font-bold">{displaySubtitle}</div>
                                                        </div>
                                                        <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                                                            <Package className="w-6 h-6 text-[#66B2B2]" />
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-6 py-6 border-y border-white/5">
                                                        <div className="space-y-1">
                                                            <div className="text-[9px] text-gray-400 uppercase font-black tracking-widest">Serial Number</div>
                                                            <div className="text-sm font-mono-tech font-bold text-[#66B2B2]">{displaySerial}</div>
                                                        </div>
                                                        <div className="space-y-1 text-right">
                                                            <div className="text-[9px] text-gray-400 uppercase font-black tracking-widest">Operating Time</div>
                                                            <div className="text-sm font-bold text-white">{displayOperatingTime}</div>
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

                            {/* STEP 2: SAFETY PROTOCOL */}
                            {currentStep === 2 && (
                                <SafetyProtocol 
                                    checklist={draft.safetyChecklist || { ppeChecked: false, engineOff: false, areaSecured: false, lotoApplied: false }}
                                    onSave={(checklist) => handleNext({ safetyChecklist: checklist })}
                                    onBack={handleBack}
                                />
                            )}

                            {/* STEP 3: BEFORE PHOTO */}
                            {currentStep === 3 && (
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

                            {currentStep === 4 && (
                                <TechnicalWorkForm
                                    draft={draft}
                                    equipment={currentEq}
                                    client={clients.find(c => c.id === task.clientId)}
                                    packages={packages}
                                    seedEquipment={_pmsSeedEq}
                                    pmsConfig={_pmsCfg}
                                    onSave={(data) => handleNext(data)}
                                    onBack={handleBack}
                                />
                            )}

                            {currentStep === 5 && (
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

                            {currentStep === 6 && (
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

function SafetyProtocol({ checklist, onSave, onBack }: { checklist: any, onSave: (c: any) => void, onBack: () => void }) {
    const [localChecklist, setLocalChecklist] = useState(checklist);

    const items = [
        { id: 'ppeChecked', label: 'PPE Verified', desc: 'Helmet, Gloves, and High-Vis vest are worn.', icon: UserCheck },
        { id: 'engineOff', label: 'Engine Isolated', desc: 'Engine is OFF and key is removed from ignition.', icon: Clock },
        { id: 'areaSecured', label: 'Work Area Secured', desc: 'Area is cordoned off and bystanders are clear.', icon: AlertTriangle },
        { id: 'lotoApplied', label: 'LOTO Applied', desc: 'Lockout/Tagout procedures are physically applied.', icon: Settings },
    ];

    const allChecked = Object.values(localChecklist).every(v => v === true);

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-3">
                    <AlertTriangle className="w-8 h-8 text-amber-600" />
                </div>
                <h4 className="text-lg font-bold text-gray-900">Safety First Protocol</h4>
                <p className="text-sm text-gray-500 px-10">Perform these mandatory checks before touching the machine.</p>
            </div>

            <div className="space-y-3">
                {items.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setLocalChecklist({ ...localChecklist, [item.id]: !localChecklist[item.id] })}
                        className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${
                            localChecklist[item.id] 
                                ? 'bg-green-50 border-green-500 shadow-sm' 
                                : 'bg-white border-gray-100 hover:border-gray-200'
                        }`}
                    >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                            localChecklist[item.id] ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'
                        }`}>
                            <item.icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                            <div className={`text-sm font-bold ${localChecklist[item.id] ? 'text-green-700' : 'text-gray-900'}`}>{item.label}</div>
                            <div className="text-[10px] text-gray-400 font-medium uppercase tracking-tighter">{item.desc}</div>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                            localChecklist[item.id] ? 'bg-green-500 border-green-500' : 'bg-white border-gray-200'
                        }`}>
                            {localChecklist[item.id] && <Check className="w-4 h-4 text-white" />}
                        </div>
                    </button>
                ))}
            </div>

            <div className="flex gap-3 pt-2">
                <Button variant="ghost" className="flex-1 h-12 rounded-xl text-gray-400 font-bold" onClick={onBack}>Previous</Button>
                <Button 
                    className={`flex-[2] h-12 font-bold rounded-xl transition-all ${
                        allChecked 
                            ? 'bg-[#66B2B2] text-white hover:bg-[#5A9E9E] shadow-lg shadow-[#66B2B2]/20' 
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                    disabled={!allChecked}
                    onClick={() => onSave(localChecklist)}
                >
                    {allChecked ? 'Proceed to Documentation' : 'Complete Checklist to Unlock'}
                </Button>
            </div>
        </div>
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

function TechnicalWorkForm({ draft, equipment, client, packages, seedEquipment, pmsConfig, onSave, onBack }: { draft: DraftExecution, equipment?: Equipment, client?: Client, packages: any[], seedEquipment?: any, pmsConfig?: any, onSave: (d: Partial<DraftExecution>) => void, onBack: () => void }) {
    const [fields, setFields] = useState({
        findings: draft.findings || "",
        workDone: draft.workDone || "",
        selectedParts: draft.selectedParts || [],
        recommendations: draft.recommendations || "",
        hoursAtService: draft.hoursAtService || equipment?.currentHours || 0
    });

    // Current metric value for the service context card
    const currentMetric = useMemo(() => {
        if (!pmsConfig) return null;
        const unit: string = pmsConfig.serviceIntervalUnit ?? "Hours";
        let gps001CacheMs = 0;
        try { gps001CacheMs = Number(window.localStorage.getItem("nextos-gps001-total-hours-ms") ?? "0") || 0; } catch {}
        return getPmsMetricValue(seedEquipment, unit, gps001CacheMs);
    }, [seedEquipment, pmsConfig]);

    // PMS interval display e.g. "200h" or "2w"
    const intervalDisplay = useMemo(() => {
        if (!pmsConfig) return null;
        const n = pmsConfig.serviceInterval;
        const u: string = (pmsConfig.serviceIntervalUnit ?? "").toLowerCase();
        const suffix = u === "hours" ? "h" : u === "km" ? "km" : u === "weeks" ? "w" : u === "days" ? "d" : u === "months" ? "mo" : u;
        return `${n}${suffix}`;
    }, [pmsConfig]);

    // Client name: prefer seed client lookup, fall back to CRM client
    const clientName = useMemo(() => {
        if (seedEquipment?.clientId) {
            const sc = (seedData.clients as any[]).find((c) => c.id === seedEquipment.clientId);
            if (sc?.companyName) return sc.companyName;
        }
        return client?.companyName ?? "—";
    }, [seedEquipment, client]);

    const eqName = seedEquipment?.name ?? equipment?.unitId ?? "—";
    const eqType = seedEquipment?.equipmentType ?? (equipment ? `${equipment.manufacturer} ${equipment.model}` : "—");

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 gap-4">
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-100"> 
                    <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-2">Equipment Unit</div>
                    <div className="text-xs text-gray-500 mt-1"><span className="font-semibold text-gray-600">Equipment Name:</span> {eqName}</div>
                    <div className="text-xs text-gray-500 mt-1"><span className="font-semibold text-gray-600">Equipment Type:</span> {eqType}</div>
                    <div className="text-xs text-gray-500 mt-0.5"><span className="font-semibold text-gray-600">Client:</span> {clientName}</div>
                </div>
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                    <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-2">Service Context</div>
                    {pmsConfig ? (
                        <div className="space-y-1">
                            <div className="text-xs text-gray-500"><span className="font-semibold text-gray-600">Service Type:</span> {pmsConfig.serviceType}</div>
                            {intervalDisplay && <div className="text-xs text-gray-500"><span className="font-semibold text-gray-600">Scheduled Maintenance:</span> {intervalDisplay}</div>}
                            {currentMetric && <div className="text-xs text-gray-500"><span className="font-semibold text-gray-600">{getPmsMetricLabel(pmsConfig.serviceIntervalUnit ?? "Hours")}:</span> {currentMetric}</div>}
                        </div>
                    ) : (
                        <div className="text-sm font-bold text-gray-900 truncate">{client?.companyName ?? "—"}</div>
                    )}
                </div>
            </div>

            <div className="grid gap-4">
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1">Initial Findings / Faults</label>
                    <textarea
                        className="w-full p-4 rounded-xl border border-gray-200 text-sm focus:border-[#66B2B2] focus:ring-2 focus:ring-[#66B2B2]/10 outline-none resize-none"
                        rows={2}
                        value={fields.findings}
                        onChange={(e) => setFields({...fields, findings: e.target.value})}
                        placeholder="Detail any damage or leaks..."
                    />
                </div>

                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1">Technical Work Performed</label>
                    <textarea
                        className="w-full p-4 rounded-xl border border-gray-200 text-sm focus:border-[#66B2B2] focus:ring-2 focus:ring-[#66B2B2]/10 outline-none resize-none"
                        rows={2}
                        value={fields.workDone}
                        onChange={(e) => setFields({...fields, workDone: e.target.value})}
                        placeholder="Describe services completed..."
                    />
                </div>

                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1">Strategic Recommendations</label>
                    <Input
                        className="h-10 rounded-xl text-xs"
                        placeholder="e.g. Belt change in 500h"
                        value={fields.recommendations}
                        onChange={(e) => setFields({...fields, recommendations: e.target.value})}
                    />
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
