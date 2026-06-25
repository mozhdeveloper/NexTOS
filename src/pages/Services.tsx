import { useState, useCallback, useEffect, useRef, useMemo, Fragment } from "react";
import { useLocation } from "react-router";
import { useOperationsStore, type DraftExecution } from "@/stores/useOperationsStore";
import { seedStaff } from "@/stores/useCRMStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { useBillingStore } from "@/stores/useBillingStore";
import seedData from "@/data/seed-data.json";
import { computePmsStatus } from "@/lib/pms-status";
import type { Equipment, ServiceRecord, Client } from "@/types";
import { trpc } from "@/providers/trpc";
import { QRCodeSVG } from "qrcode.react";
import {
  Search,
  QrCode,
  Upload,
  Camera,
  Wrench,
  FileText,
  LayoutDashboard,
  Printer,
  X,
  CheckCircle2,
  AlertTriangle,
  Package,
  Box,
  ChevronDown,
  PenTool,
  Plus,
  CalendarClock,
  Pencil,
  Play,
  Check,
  History,
  ClipboardList,
  ChevronRight,
  UserCheck,
  Trash2,
  MapPin,
  Clock,
  Settings,
  Car,
  Navigation,
  MoreVertical,
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
import { DashboardTab } from "@/components/services/DashboardTab";
import InventoryPage from "@/pages/Inventory";

type TabType = "dashboard" | "tasks" | "equipment" | "reports" | "new" | "scheduled-maintenance" | "inventory";

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
  status: string;
};

const SCHEDULED_MAINTENANCE_KEY = "nextos-user-scheduled-maintenance";
const RESET_ON_COMPLETION_KEY = "nextos-reset-on-completion";
const GPS001_HOURS_OFFSET_KEY = "nextos-gps001-hours-offset-ms";
const METRICS_OVERRIDES_KEY = "nextos-metrics-overrides-v1";
const PM_INTERVAL_UNITS = ["Hours", "KM", "Weeks", "Months", "Years"] as const;

const serviceTypeOptions = [
  { value: "PMS (Preventative Maintenance)", label: "PMS (Preventative Maintenance)" },
  { value: "Calibration PMS", label: "Calibration PMS" },
  { value: "Repair", label: "General Repair" },
  { value: "Inspection", label: "Standard Inspection" },
  { value: "Installation", label: "Installation" },
];


function getPmsMetricValue(seedEq: any, unit: string, gps001CacheMs: number, gps001HoursOffsetMs = 0): string {
  const u = unit.toLowerCase();
  if (u === "hours") {
    if (seedEq?.id === "EQ-001" && gps001CacheMs > 0) {
      const effectiveMs = Math.max(0, gps001CacheMs - gps001HoursOffsetMs);
      const totalMin = Math.floor(effectiveMs / (1000 * 60));
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
  if (u === "weeks") return `${(d / 7).toFixed(1)} wk (${Math.round(d)}d)`;
  if (u === "months") return `${(d / 30.44).toFixed(1)} mo (${Math.round(d)}d)`;
  if (u === "years") return `${(d / 365.25).toFixed(2)} yr (${Math.round(d)}d)`;
  return "—";
}

function formatServiceInterval(interval: number, unit: string): string {
  const u = unit.toLowerCase();
  if (u === "hours") return `${interval}h`;
  if (u === "km") return `${interval} km`;
  const totalDays = Math.round(
    u === "weeks" ? interval * 7 :
      u === "months" ? interval * 30.44 :
        u === "years" ? interval * 365.25 : 0
  );
  const abbr = u === "weeks" ? "w" : u === "months" ? "mo" : "yr";
  return `${interval}${abbr} (${totalDays}d)`;
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
  const {
    equipment,
    serviceRecords,
    servicePhotos,
    draftExecutions,
    updateDraftExecution,
    pendingSubmissions,
    addServiceRecord,
    addServicePhoto,
    removePendingSubmission,
  } = useOperationsStore();

  useBillingStore();

  const [activeTab, setActiveTabRaw] = useState<TabType>(() => {
    try { return (sessionStorage.getItem("nextos-services-tab") as TabType) ?? "dashboard"; }
    catch { return "dashboard"; }
  });
  const setActiveTab = (tab: TabType) => {
    try { sessionStorage.setItem("nextos-services-tab", tab); } catch { }
    setActiveTabRaw(tab);
  };
  useEffect(() => {
    const onStorage = () => {
      try { setAutoAssignTask(window.localStorage.getItem("nextos-auto-assign-task") !== "false"); } catch { }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const isTech = user?.role === "tech";
  const allowedTabs = isTech
    ? (["dashboard", "tasks", "equipment", "scheduled-maintenance", "reports", "new", "inventory"] as TabType[])
    : (["dashboard", "tasks", "equipment", "scheduled-maintenance", "reports", "inventory"] as TabType[]);
  useEffect(() => {
    if (!allowedTabs.includes(activeTab)) {
      setActiveTab("dashboard");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEquipment, setSelectedEquipment] = useState<string | null>(null);
  void selectedEquipment;
  // Tracks which seed equipment ID ("EQ-001" etc.) is visually selected in the Equipment table.
  const [selectedSeedId, setSelectedSeedId] = useState<string | null>(null);


  const [qrSerial, setQrSerial] = useState("");
  const [showQR, setShowQR] = useState(false);

  // Scanning states
  const [showScanner, setShowScanner] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [manualSerial, setManualSerial] = useState("");
  const [highlightedEquipment, setHighlightedEquipment] = useState<string | null>(null);
  const [scannerError, setScannerError] = useState<string | null>(null);

  // Refs
  const equipmentRefs = useRef<Map<string, HTMLTableRowElement>>(new Map());
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const initTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Modal State
  const [executionTask, setExecutionTask] = useState<ServiceRecord | null>(null);
  const [confirmTask, setConfirmTask] = useState<ServiceRecord | null>(null);
  const [viewTaskDetails, setViewTaskDetails] = useState<ServiceRecord | null>(null);
  const [svcTaskModalOpen, setSvcTaskModalOpen] = useState(false);
  const [svcTaskEquipmentId, setSvcTaskEquipmentId] = useState<string>("");
  const [svcTaskDueDate, setSvcTaskDueDate] = useState("");
  const [svcTaskPriority, setSvcTaskPriority] = useState<"low" | "medium" | "high">("medium");
  const [svcTaskServiceType, setSvcTaskServiceType] = useState("");
  const [svcTaskClientId, setSvcTaskClientId] = useState<string>("");
  const [svcTaskAssignedTo, setSvcTaskAssignedTo] = useState("");
  const [svcTaskTargetsPms, setSvcTaskTargetsPms] = useState(false);
  const [svcTaskMetricUnit, setSvcTaskMetricUnit] = useState<string>("");
  const [autoAssignTask, setAutoAssignTask] = useState<boolean>(() => {
    try { return window.localStorage.getItem("nextos-auto-assign-task") !== "false"; }
    catch { return true; }
  });
  const [showReport, setShowReport] = useState<(ServiceRecord & Record<string, any>) | null>(null);
  // Form state (for Manual Log)
  const [formClientId, setFormClientId] = useState("");
  const [formEquipmentId, setFormEquipmentId] = useState("");
  const [formType, setFormType] = useState<string>("Heavy Equipment PMS");
  const [formTechnician, setFormTechnician] = useState(user?.name || "");
  const [formDescription, setFormDescription] = useState("");
  void formDescription;
  const [formFindings, setFormFindings] = useState("");
  const [formWorkDone, setFormWorkDone] = useState("");
  const [formRecommendation, setFormRecommendation] = useState("");
  const [formBeforePhoto, setFormBeforePhoto] = useState<string | null>(null);
  const [formAfterPhoto, setFormAfterPhoto] = useState<string | null>(null);
  const [formTechSign, setFormTechSign] = useState("");
  const [formClientSign, setFormClientSign] = useState("");

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
  const [scheduleActionMenuOpenFor, setScheduleActionMenuOpenFor] = useState<string | null>(null);
  const [editServiceType, setEditServiceType] = useState("");
  const [editInterval, setEditInterval] = useState("");
  const [editIntervalUnit, setEditIntervalUnit] = useState("Hours");
  const [editEstimatedCost, setEditEstimatedCost] = useState("");
  const [editMissingFields, setEditMissingFields] = useState<string[]>([]);
  const updateSeedEquipmentMutation = trpc.seedEquipment.update.useMutation();
  void updateSeedEquipmentMutation;
  const addPmsConfigurationMutation = trpc.seedEquipment.addPmsConfiguration.useMutation();
  const updatePmsConfigurationMutation = trpc.seedEquipment.updatePmsConfiguration.useMutation();
  const deletePmsConfigurationMutation = trpc.seedEquipment.deletePmsConfiguration.useMutation();
  const upsertSeedServiceRecord = trpc.seedServiceRecords.upsert.useMutation();
  // Retry mutation: replays any submission that failed to persist on a previous attempt.
  const retryCompleteMutation = trpc.seedServiceRecords.complete.useMutation();

  const { data: seedServiceRecordsData } = trpc.seedServiceRecords.list.useQuery(undefined, {
    staleTime: 60_000,
  });

  // Live equipment + clients — refetches every 15 s so the UI picks up seed-status-watcher
  // changes (status, metrics) without requiring a page reload.
  // Falls back to the static import until the first response arrives.
  const trpcUtils = trpc.useUtils();
  const { data: seedEquipmentQueryData } = trpc.seedEquipment.list.useQuery(undefined, {
    staleTime: 10_000,
    refetchInterval: 15_000,
  });
  const liveEquipment: any[] = seedEquipmentQueryData?.equipment ?? (seedData.equipment as any[]);
  const liveClients: any[] = seedEquipmentQueryData?.clients ?? (seedData.clients as any[]);

  // HMR bridge: Vite hot-reloads the JSON module the instant seed-data.json is saved,
  // but liveEquipment uses the tRPC cache (not the module), so HMR changes are invisible
  // to Services while Fleet (which reads seedData directly) updates immediately.
  // Detect the new module reference and force an immediate tRPC refetch so both pages
  // stay in sync — no more waiting 15 s for the polling interval.
  const prevSeedEquipmentRef = useRef(seedData.equipment);
  useEffect(() => {
    if (prevSeedEquipmentRef.current !== seedData.equipment) {
      prevSeedEquipmentRef.current = seedData.equipment;
      void trpcUtils.seedEquipment.list.invalidate();
    }
    // seedData.equipment is a module-level reference; it changes identity on HMR reload
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedData.equipment]);

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
      } catch { }
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
  const [gps001WorkingDays, setGps001WorkingDays] = useState<number | null>(() => {
    try {
      const raw = window.localStorage.getItem("fleet:gps001WorkingDaysByDay:v2");
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Record<string, number>;
      const entries = Object.entries(parsed).sort((a, b) => b[0].localeCompare(a[0]));
      return entries[0]?.[1] || null;
    } catch { return null; }
  });
  useEffect(() => {
    const refresh = () => {
      try {
        const km = Number(window.localStorage.getItem("nextos-gps001-total-km") ?? "0") || 0;
        setGps001KmTotal((prev) => (prev !== km ? km : prev));
        const raw = window.localStorage.getItem("fleet:gps001WorkingDaysByDay:v2");
        if (raw) {
          const parsed = JSON.parse(raw) as Record<string, number>;
          const days = Object.entries(parsed).sort((a, b) => b[0].localeCompare(a[0]))[0]?.[1] || null;
          setGps001WorkingDays((prev) => (prev !== days ? days : prev));
        }
      } catch { }
    };
    const id = setInterval(refresh, 30_000);
    window.addEventListener("storage", refresh);
    return () => { clearInterval(id); window.removeEventListener("storage", refresh); };
  }, []);

  // ── Reset-on-Completion toggle (EQ-001 / Excavator CAT 320 only) ─────────────
  // Default ON: if no persisted value, the toggle starts enabled.
  const [resetOnCompletion, setResetOnCompletion] = useState<boolean>(() => {
    try { return window.localStorage.getItem(RESET_ON_COMPLETION_KEY) !== "false"; } catch { return true; }
  });
  const toggleResetOnCompletion = () => {
    setResetOnCompletion((prev) => {
      const next = !prev;
      try { window.localStorage.setItem(RESET_ON_COMPLETION_KEY, String(next)); } catch { }
      // Turning OFF: immediately clear the GPS hours offset so EQ-001 shows real accumulated hours.
      if (!next) {
        setGps001HoursOffsetMs(0);
        try { window.localStorage.removeItem(GPS001_HOURS_OFFSET_KEY); } catch { }
      }
      return next;
    });
  };

  // Hours offset for EQ-001 (GPS): effective hours = gps001CacheMs − offset
  const [gps001HoursOffsetMs, setGps001HoursOffsetMs] = useState<number>(() => {
    try { return Number(window.localStorage.getItem(GPS001_HOURS_OFFSET_KEY) ?? "0") || 0; } catch { return 0; }
  });

  // Per-equipment metrics overrides (for non-GPS equipment after hours-reset)
  // Persisted to localStorage so they survive page reloads.
  // At init time, immediately discard any override whose value is LOWER than the current
  // seed-data.json metric — this handles the case where the user manually edited the JSON
  // to a higher value while the app was closed (stale override would otherwise hide the update).
  type MetricsOverride = { hoursTotal?: string; kmTotal?: number };
  const [metricsOverrides, setMetricsOverrides] = useState<Map<string, MetricsOverride>>(() => {
    try {
      const raw = window.localStorage.getItem(METRICS_OVERRIDES_KEY);
      if (!raw) return new Map();
      const stored = new Map(JSON.parse(raw) as [string, MetricsOverride][]);
      const parseH = (s: string): number => {
        const m = String(s ?? "").match(/(\d+)\s*h\s*(\d+)\s*m/i);
        return m ? Number(m[1]) + Number(m[2]) / 60 : 0;
      };
      let changed = false;
      for (const eq of seedData.equipment as any[]) {
        const ov = stored.get(eq.id);
        if (!ov) continue;
        if (ov.hoursTotal !== undefined && parseH(eq.hoursTotal ?? "0h 0m") > parseH(ov.hoursTotal) + 0.5) {
          stored.delete(eq.id); changed = true; continue;
        }
        if (ov.kmTotal !== undefined) {
          const liveKm = typeof eq.kmTotal === "number" ? eq.kmTotal : parseFloat(String(eq.kmTotal ?? "0").replace(/[^\d.]/g, ""));
          if (Number.isFinite(liveKm) && liveKm > (ov.kmTotal ?? 0) + 1) {
            stored.delete(eq.id); changed = true;
          }
        }
      }
      if (changed) window.localStorage.setItem(METRICS_OVERRIDES_KEY, JSON.stringify(Array.from(stored.entries())));
      return stored;
    } catch { return new Map(); }
  });

  // Called by ExecutionModal's onSuccess after completing a task.
  // • EQ-001 (GPS): stores an hours offset in localStorage so the displayed hours appear as 0.
  //   Called only when the "Reset Hours on Completion" toggle is ON.
  // • All other seed equipment: sets an in-memory metricsOverrides entry so computeEntryStatus
  //   sees 0 immediately — before the tRPC refetch returns the updated file from disk.
  //   The actual JSON update was already done atomically inside completeSeedServiceRecordMutation.
  const handleMetricsReset = useCallback((seedEqId: string, unit: string) => {
    const u = unit.toLowerCase();
    if (u !== "hours" && u !== "km") return; // days metric: never reset

    if (seedEqId === "EQ-001") {
      if (u === "hours") {
        // Set offset = current GPS ms so effective displayed hours become 0.
        const offsetMs = gps001CacheMs;
        setGps001HoursOffsetMs(offsetMs);
        try { window.localStorage.setItem(GPS001_HOURS_OFFSET_KEY, String(offsetMs)); } catch { }
      }
      // KM for EQ-001 is tracked separately via GPS; skip for now
    } else {
      // Non-GPS equipment: immediately apply in-memory override so the UI reflects 0
      // without waiting for the server refetch.
      const newOverride: MetricsOverride = u === "hours"
        ? { hoursTotal: "0h 0m" }
        : { kmTotal: 0 };

      setMetricsOverrides((prev) => {
        const next = new Map(prev);
        next.set(seedEqId, { ...(next.get(seedEqId) ?? {}), ...newOverride });
        try {
          window.localStorage.setItem(METRICS_OVERRIDES_KEY, JSON.stringify(Array.from(next.entries())));
        } catch { }
        return next;
      });
      // No separate server mutation needed — the complete mutation already reset the
      // seed-data.json entry atomically via resetMetricsOnComplete: true.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gps001CacheMs]);

  // Auto-clear stale metricsOverrides when live data diverges upward.
  // When a service is completed with "Reset on Completion" ON, an override of { hoursTotal: "0h 0m" }
  // (or kmTotal: 0) is stored in localStorage. This is intentional — it makes the display show
  // "hours since last service" rather than lifetime hours. But if the user later manually increases
  // the metric in seed-data.json (or the watcher updates it after usage accumulates), the override
  // should be discarded so the live value takes effect again.
  // Rule: if the live metric is HIGHER than the override by more than a small tolerance, the user
  // has explicitly updated the JSON → drop the override and let the real value show.
  useEffect(() => {
    if (!seedEquipmentQueryData?.equipment || metricsOverrides.size === 0) return;
    const parseH = (s: string): number => {
      const m = String(s ?? "").match(/(\d+)\s*h\s*(\d+)\s*m/i);
      return m ? Number(m[1]) + Number(m[2]) / 60 : 0;
    };
    let anyCleared = false;
    const next = new Map(metricsOverrides);
    for (const eq of seedEquipmentQueryData.equipment) {
      const ov = next.get(eq.id);
      if (!ov) continue;
      if (ov.hoursTotal !== undefined) {
        const liveH = parseH(eq.hoursTotal ?? "0h 0m");
        const ovH = parseH(ov.hoursTotal);
        if (liveH > ovH + 0.5) { next.delete(eq.id); anyCleared = true; continue; }
      }
      if (ov.kmTotal !== undefined) {
        const liveKm = typeof eq.kmTotal === "number"
          ? eq.kmTotal
          : parseFloat(String(eq.kmTotal ?? "0").replace(/[^\d.]/g, ""));
        if (Number.isFinite(liveKm) && liveKm > (ov.kmTotal ?? 0) + 1) {
          next.delete(eq.id); anyCleared = true;
        }
      }
    }
    if (anyCleared) {
      setMetricsOverrides(next);
      try { window.localStorage.setItem(METRICS_OVERRIDES_KEY, JSON.stringify(Array.from(next.entries()))); } catch { }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedEquipmentQueryData]);

  const location = useLocation();

  useEffect(() => {
    const state = location.state as { selectedUnitId?: number };
    if (state?.selectedUnitId) {
      setSelectedEquipment(String(state.selectedUnitId));
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
        try {
          // stop/clear may be sync or async depending on runtime; call safely
          // without relying on Promise chaining to satisfy TS types.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (scannerRef.current as any).stop?.();
          (scannerRef.current as any).clear?.();
        } catch (e) { }
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
              () => { }
            );
          } catch (envCameraError) {
            await scannerRef.current.start(
              {},
              { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
              (decodedText) => handleScanSuccess(decodedText),
              () => { }
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
      } catch (error) { }
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

  const findAndHighlightEquipment = (scannedValue: string) => {
    let serialToFind = scannedValue.trim();

    // Check if scanned value is JSON (from Client Portal tags)
    try {
      const parsed = JSON.parse(scannedValue);
      if (parsed.serialNumber) {
        serialToFind = parsed.serialNumber;
      }
    } catch (e) {
      // Not JSON, use raw value
    }

    // Find in liveEquipment (the ones displayed in the table)
    const seedEq = liveEquipment.find(eq => eq.serialNumber === serialToFind);

    if (seedEq) {
      // Also find corresponding store equipment for highlighting/selection
      const storeEq = equipment.find(eq => eq.serialNumber === serialToFind);

      // Expand the row in the table
      setSelectedSeedId(seedEq.id);

      if (storeEq) {
        setSelectedEquipment(storeEq.id);
        setHighlightedEquipment(storeEq.id);

        // Scroll to the element
        const element = equipmentRefs.current.get(storeEq.id);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }

      setActiveTab("equipment");
      setTimeout(() => setHighlightedEquipment(null), 3000);
      toast.success(`Found asset: ${seedEq.name || seedEq.unitId}`);
    } else {
      toast.error(`Equipment not found with serial: ${serialToFind}`);
    }
  };

  const activeTasks = serviceRecords.filter(r => r.status === "scheduled" || r.status === "in_progress");

  // Merge session store records with database records for comprehensive dashboard statistics
  const allServiceRecords = useMemo(() => {
    const seedRecords = seedServiceRecordsData?.records ?? [];
    const recordMap = new Map();
    // Start with database records
    seedRecords.forEach(r => recordMap.set(r.id, r));
    // Overwrite/add with current session records (higher priority for live status)
    serviceRecords.forEach(r => recordMap.set(r.id, r));
    return Array.from(recordMap.values()) as ServiceRecord[];
  }, [serviceRecords, seedServiceRecordsData]);

  const filteredSeedEquipment = liveEquipment.filter((s) =>
    searchQuery === "" ||
    (s.name ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.serialNumber ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.equipmentType ?? "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Compute the status for a single pmsConfiguration entry given an equipment's usage metrics.
  const computeEntryStatus = (
    pms: any,
    eq: any,
    completedRecords?: { equipmentId: number | string; completedDate: string | null }[]
  ): ScheduledMaintenanceEntry["status"] => {
    const interval = Number(pms?.serviceInterval ?? 0);
    if (!Number.isFinite(interval) || interval <= 0) return "—";

    const unit = String(pms?.serviceIntervalUnit ?? "Hours").toLowerCase();
    let usage: number | null = null;

    // Apply per-equipment overrides set by the Reset-on-Completion feature
    const override = metricsOverrides.get(eq.id);
    const effectiveEq = override ? { ...eq, ...override } : eq;

    if (unit === "hours") {
      if (eq.id === "EQ-001" && gps001CacheMs > 0) {
        // Apply the service-reset offset for EQ-001 so hours-since-last-service is shown
        const effectiveMs = Math.max(0, gps001CacheMs - gps001HoursOffsetMs);
        usage = effectiveMs / (1000 * 60 * 60);
      } else {
        const match = String(effectiveEq.hoursTotal ?? "").match(/(\d+)\s*h\s*(\d+)\s*m/i);
        if (match) usage = Number(match[1]) + Number(match[2]) / 60;
      }
    } else if (unit === "km") {
      if (eq.id === "EQ-001" && gps001KmTotal > 0) {
        usage = gps001KmTotal;
      } else {
        const raw = effectiveEq.kmTotal;
        const parsed = typeof raw === "number" ? raw : parseFloat(String(raw ?? "").replace(/[^\d.]/g, ""));
        usage = Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
      }
    } else {
      let days: number | null = null;
      if (completedRecords && completedRecords.length > 0) {
        const relevant = completedRecords
          .filter(r => String(r.equipmentId) === String(eq.id) && r.completedDate)
          .sort((a, b) => new Date(b.completedDate!).getTime() - new Date(a.completedDate!).getTime());
        if (relevant.length > 0) {
          days = (Date.now() - new Date(relevant[0].completedDate!).getTime()) / (1000 * 60 * 60 * 24);
        }
      }
      if (days === null) {
        const base = eq.installDate ?? eq.createdAt;
        days = base ? (Date.now() - new Date(base).getTime()) / (1000 * 60 * 60 * 24) : 0;
      }
      if (unit === "weeks") usage = days / 7;
      else if (unit === "months") usage = days / 30.44;
      else if (unit === "years") usage = days / 365.25;
    }

    if (usage === null || !Number.isFinite(usage) || usage < 0) return "—";
    const progress = (usage / interval) * 100;
    return computePmsStatus(progress, seedData.pmsStatuses) ?? "OK";
  };

  const computeNextService = (
    pms: { serviceInterval: number; serviceIntervalUnit: string },
    eq: any,
    completedRecords?: { equipmentId: number | string; completedDate: string | null }[]
  ): string => {
    const interval = Number(pms?.serviceInterval ?? 0);
    if (!Number.isFinite(interval) || interval <= 0) return "—";

    const unit = String(pms?.serviceIntervalUnit ?? "Hours").toLowerCase();
    let usage: number | null = null;

    const override = metricsOverrides.get(eq.id);
    const effectiveEq = override ? { ...eq, ...override } : eq;

    if (unit === "hours") {
      if (eq.id === "EQ-001" && gps001CacheMs > 0) {
        const effectiveMs = Math.max(0, gps001CacheMs - gps001HoursOffsetMs);
        usage = effectiveMs / (1000 * 60 * 60);
      } else {
        const match = String(effectiveEq.hoursTotal ?? "").match(/(\d+)\s*h\s*(\d+)\s*m/i);
        if (match) usage = Number(match[1]) + Number(match[2]) / 60;
      }
    } else if (unit === "km") {
      if (eq.id === "EQ-001" && gps001KmTotal > 0) {
        usage = gps001KmTotal;
      } else {
        const raw = effectiveEq.kmTotal;
        const parsed = typeof raw === "number" ? raw : parseFloat(String(raw ?? "").replace(/[^\d.]/g, ""));
        usage = Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
      }
    } else {
      let days: number | null = null;
      if (completedRecords && completedRecords.length > 0) {
        const relevant = completedRecords
          .filter(r => (String(r.equipmentId) === String(eq.id)) && r.completedDate)
          .sort((a, b) => new Date(b.completedDate!).getTime() - new Date(a.completedDate!).getTime());
        if (relevant.length > 0) {
          days = (Date.now() - new Date(relevant[0].completedDate!).getTime()) / (1000 * 60 * 60 * 24);
        }
      }
      if (days === null) {
        const base = eq.installDate ?? eq.createdAt;
        days = base ? (Date.now() - new Date(base).getTime()) / (1000 * 60 * 60 * 24) : 0;
      }
      if (unit === "weeks") usage = days / 7;
      else if (unit === "months") usage = days / 30.44;
      else if (unit === "years") usage = days / 365.25;
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
  const computeEquipmentWorstStatus = (seedEq: any, completedRecords?: { equipmentId: number | string; completedDate: string | null }[]): string | null => {
    if (!seedEq) return null;
    const configs: any[] = Array.isArray(seedEq.pmsConfiguration) ? seedEq.pmsConfiguration : [];
    if (configs.length === 0) return null;
    const valid = configs
      .map((pms) => computeEntryStatus(pms, seedEq, completedRecords))
      .filter((s) => s !== "—" && s !== null);
    if (valid.length === 0) return null;
    return valid.reduce((worst, current) => {
      const curPct = seedData.pmsStatuses.find(s => s.value === current)?.minProgressPercent ?? 0;
      const wrstPct = seedData.pmsStatuses.find(s => s.value === worst)?.minProgressPercent ?? 0;
      return curPct > wrstPct ? current : worst;
    });
  };

  // Format EQ-001 GPS hours for display, applying the service-reset offset so "0h 0m" is shown
  // immediately after a PMS reset (offset = GPS ms at reset time; effective = GPS ms - offset).
  const formatGps001Hours = (): string => {
    if (!gps001CacheMs || gps001CacheMs <= 0) return "—";
    const effectiveMs = Math.max(0, gps001CacheMs - gps001HoursOffsetMs);
    if (effectiveMs <= 0) return "0h 0m";
    const totalMin = Math.floor(effectiveMs / (1000 * 60));
    return `${Math.floor(totalMin / 60)}h ${totalMin % 60}m`;
  };

  // One row per pmsConfiguration array entry — status computed independently per entry.
  // Reactive to gps001CacheMs so EQ-001 updates live.
  const seedScheduledMaintenance = useMemo((): ScheduledMaintenanceEntry[] => {
    const entries: ScheduledMaintenanceEntry[] = [];

    liveEquipment.forEach((eq) => {
      const configs: any[] = Array.isArray(eq.pmsConfiguration) ? eq.pmsConfiguration : [];
      if (configs.length === 0) return;

      const client = liveClients.find((c) => c.id === eq.clientId);
      const clientName = client?.companyName ?? "—";

      const completedRecords = (seedServiceRecordsData?.records ?? []).filter(r => r.status === "completed");
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
          status: computeEntryStatus(pms, eq, completedRecords),
        });
      });
    });

    return entries;
    // seedEquipmentQueryData in deps so the memo recomputes whenever live equipment refreshes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gps001CacheMs, gps001HoursOffsetMs, metricsOverrides, seedEquipmentQueryData, seedServiceRecordsData]);

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
    // IDs whose canonical seed record is already completed — any Zustand copy of these
    // is superseded (could be a stale in_progress/scheduled leftover from a failed mutation).
    const seedCompletedIds = new Set(
      seedServiceRecordsData.records.filter((r) => r.status === "completed").map((r) => r.id)
    );

    // Step 1: purge stale records from the store.
    // • Any record whose seed version is "completed" is superseded — remove from store so it
    //   doesn't re-appear as an open task (handles manually-added or retried records).
    // • PMS tasks (deterministic ID range OR _src:"pms" description) must exist in seed-data.json.
    // • Any completed Zustand record that is NOT a live task must also exist in seed-data.json.
    //   This removes leftover test/manual records that were never persisted to the JSON file.
    useOperationsStore.setState((state) => ({
      serviceRecords: state.serviceRecords.filter((r) => {
        // Seed says this task is done — remove any non-completed Zustand copy
        if (seedCompletedIds.has(r.id)) return false;
        const isPms =
          (r.id >= 9_000_000 && r.id < 10_000_000) ||
          (() => { try { return JSON.parse(r.description ?? "{}")._src === "pms"; } catch { return false; } })();
        if (isPms) return seedIds.has(r.id);
        // Completed non-PMS records: keep only if they're tracked in seed-data.json
        if (r.status === "completed") return seedIds.has(r.id);
        // Scheduled/in-progress manual-origin records not in seed are orphans (ID mismatch from
        // a pre-fix creation path where addServiceRecord generated a different ID than the upsert).
        const isManualOrigin = (() => { try { return JSON.parse(r.description ?? "{}")._origin === "manual"; } catch { return false; } })();
        if (isManualOrigin && !seedIds.has(r.id)) return false;
        return true; // Keep all other scheduled / in-progress records (bookings, etc.)
      }),
    } as Partial<any>));

    // Step 2: inject open records from seed-data.json that aren't in the store yet.
    for (const record of seedServiceRecordsData.records) {
      if (record.status === "completed") continue;
      useOperationsStore.setState((state) => {
        if (state.serviceRecords.some((r) => r.id === record.id)) return state;
        const seeded: ServiceRecord = {
          id: record.id,
          equipmentId: String(record.equipmentId),
          clientId: record.clientId ?? record.clientId,
          technician: record.technician ?? "Pending Assignment",
          serviceCategory: (record as any).serviceCategory ?? (record as any).serviceType ?? "Heavy Equipment PMS",
          description: record.description ?? "",
          partsUsed: record.partsUsed ?? "Pending",
          status: record.status ?? "scheduled",
          scheduledDate: record.scheduledDate ?? new Date().toISOString(),
          completedDate: record.completedDate ?? null,
          cost: record.cost ?? 0,
          invoiceId: null,
          findings: record.findings ?? "",
          workDone: record.workDone ?? "",
          recommendation: record.recommendation ?? "",
          hoursAtService: record.hoursAtService ?? 0,
          createdAt: new Date().toISOString(),
        };
        return {
          serviceRecords: [
            ...state.serviceRecords,
            seeded,
          ],
        } as Partial<any>;
      });
    }
  }, [seedServiceRecordsData]);

  // Auto-retry any submissions that failed to persist to seed-data.json on a previous attempt.
  // Runs whenever seedServiceRecordsData loads/refreshes. Processes one item per cycle so each
  // retry gets its own invalidation + refetch, naturally draining the queue without collisions.
  useEffect(() => {
    if (!seedServiceRecordsData || pendingSubmissions.length === 0) return;

    const persistedIds = new Set(seedServiceRecordsData.records.map((r) => r.id));

    // Remove any that already made it to JSON (persisted despite the earlier error)
    pendingSubmissions.forEach((sub) => {
      if (persistedIds.has(sub.id)) removePendingSubmission(sub.id);
    });

    // Retry the first submission that still isn't in JSON
    const toRetry = pendingSubmissions.find((s) => !persistedIds.has(s.id));
    if (!toRetry || retryCompleteMutation.status === 'pending') return;

    retryCompleteMutation.mutate(toRetry.payload, {
      onSuccess: () => {
        removePendingSubmission(toRetry.id);
        trpcUtils.seedServiceRecords.list.invalidate();
        trpcUtils.seedEquipment.list.invalidate();
      },
      // onError: leave in queue — will retry next session
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedServiceRecordsData]);

  // Tracks which PMS task IDs have already triggered a toast — persisted across sessions.
  const TOASTED_PMS_KEY = "nextos-toasted-pms-tasks";
  const toastedPmsTasksRef = useRef(new Set<number>());
  useEffect(() => {
    try {
      const stored: number[] = JSON.parse(window.localStorage.getItem(TOASTED_PMS_KEY) ?? "[]");
      toastedPmsTasksRef.current = new Set(stored);
    } catch { }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-create a scheduled task for every Overdue PMS entry.
  // Deps: allScheduledMaintenance + seedServiceRecordsData.
  // serviceRecords intentionally omitted — the effect must not re-run because it wrote
  // to the store itself (cascading re-trigger). seedServiceRecordsData is included so
  // the effect re-runs once after the injection effect purges stale records on first load,
  // giving alreadyCompletedInSeed a real value instead of the undefined-fallback false.
  useEffect(() => {
    if (!equipment.length) return;
    // Wait for seed records to load before acting — without this guard the upsert fires
    // before alreadyCompletedInSeed can be evaluated and would overwrite a completed record.
    if (!seedServiceRecordsData) return;
    const taskTriggerStatuses = new Set(
      seedData.pmsStatuses
        .filter(s => s.minProgressPercent >= 100)
        .map(s => s.value)
    );
    const overdueEntries = allScheduledMaintenance.filter((e) => taskTriggerStatuses.has(e.status ?? ""));

    for (const entry of overdueEntries) {
      const pmsIdx = entry.scheduleIndex ?? 0;
      const seedEqId = entry.equipmentId;

      // Stable ID: 9_0XX_YZZ where XX = equipment number, Y = LAB vs EQ prefix, ZZ = pmsIdx
      const isLab = seedEqId.startsWith("LAB");
      const eqNum = parseInt(seedEqId.replace(/\D/g, "") || "0");
      const taskId = 9_000_000 + (isLab ? 100_000 : 0) + eqNum * 100 + pmsIdx;

      // If seed already has a completed record for this taskId, still create the Zustand
      // task so the next service cycle is actionable in My Tasks — but skip the upsert.
      // Upsert would overwrite the completed record and erase the service report.
      const alreadyCompletedInSeed = seedServiceRecordsData.records.some(
        (r) => r.id === taskId && r.status === "completed"
      );

      // Read live store state (not the stale hook snapshot) so the check is always current
      // even when the effect re-runs before the component has re-rendered.
      const liveRecords = useOperationsStore.getState().serviceRecords;
      if (liveRecords.some((r) => r.id === taskId && r.status !== "completed")) continue;

      const seedEq = liveEquipment.find((s) => s.id === seedEqId);
      if (!seedEq) continue;

      const storeEq =
        equipment.find((e) => (e.equipmentType ?? "").toLowerCase() === (seedEq.equipmentType ?? "").toLowerCase()) ??
        equipment.find((e) => (e.equipmentType ?? "").toLowerCase().includes((seedEq.name ?? "").split(" ")[0].toLowerCase())) ??
        equipment[0];
      if (!storeEq) continue;

      const clientId = Number(String(seedEq.clientId).replace(/\D/g, "")) || 1;
      const serviceCategory = mapPmsServiceCategory(entry.serviceType, seedEq.equipmentType);

      const entryPriority = entry.status === "Overdue" ? "high" : "medium";

      const description = JSON.stringify({
        _src: "pms",
        _origin: "auto",
        _priority: entryPriority,
        _seedEqId: seedEqId,
        _pmsIdx: pmsIdx,
        label: `${entry.serviceType} for ${entry.equipmentName}`,
        // Snapshot the PMS config values at task-creation time so that if the user later
        // edits the config (e.g. 200 h → 2000 h), completed records still show the interval
        // that was actually in effect when the overdue task was triggered.
        _serviceInterval: entry.serviceInterval,
        _serviceIntervalUnit: entry.serviceIntervalUnit,
        _serviceType: entry.serviceType,
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
            serviceCategory: serviceCategory as any,
            description,
            partsUsed: "Pending Inspection",
            status: "scheduled" as const,
            scheduledDate: new Date().toISOString(),
            completedDate: null,
            cost: entry.estimatedCost || 0,
            findings: "",
            workDone: "",
            recommendation: "",
            hoursAtService: parseFloat(String(storeEq.hoursTotal)) || 0,
            invoiceId: null,
            createdAt: new Date().toISOString(),
          },
        ],
      }));

      if (!alreadyCompletedInSeed) {
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
          hoursAtService: parseFloat(String(storeEq.hoursTotal)) || 0,
          priority: entryPriority,
          taskOrigin: "auto",
        });
      }

      // Only notify once per task ID, persisted across sessions.
      if (!toastedPmsTasksRef.current.has(taskId)) {
        toastedPmsTasksRef.current.add(taskId);
        try {
          window.localStorage.setItem(TOASTED_PMS_KEY, JSON.stringify([...toastedPmsTasksRef.current]));
        } catch { }
        toast.info("PMS Task Auto-Created", {
          description: `${entry.equipmentName} — ${entry.serviceType} is overdue.`,
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allScheduledMaintenance, seedServiceRecordsData]);

  const handleDeleteEntry = async (entry: ScheduledMaintenanceEntry) => {
    const seedEq = liveEquipment.find((e) => e.id === entry.equipmentId);
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

    const seedEq = liveEquipment.find((e) => e.id === scheduleEquipmentId);
    if (!seedEq) return;
    const client = liveClients.find((c) => c.id === seedEq.clientId);

    const serviceTypeLabel =
      serviceTypeOptions.find((opt) => opt.value === scheduleServiceType)?.label ?? scheduleServiceType;
    const numericInterval = Number(scheduleInterval);
    const intervalUnit = scheduleIntervalUnit as "Hours" | "KM" | "Weeks" | "Months" | "Years";
    const numericCost = Number(scheduleEstimatedCost) || 0;

    // Unit-uniqueness check — each equipment may only have one config per interval unit
    const unitTaken = allScheduledMaintenance.some(
      (e) =>
        e.equipmentId === scheduleEquipmentId &&
        e.serviceIntervalUnit.toLowerCase() === intervalUnit.toLowerCase()
    );
    if (unitTaken) {
      toast.error(`This equipment already has a ${intervalUnit} schedule. Delete the existing one first to add a new one.`);
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
      serviceIntervalUnit: intervalUnit,
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
    const matchingOption =
      serviceTypeOptions.find((opt) => opt.value === entry.serviceType || opt.label === entry.serviceType) ??
      (entry.serviceType === "Heavy Equipment PMS" ? serviceTypeOptions[0] : undefined);
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

    const seedEq = liveEquipment.find((e) => e.id === editEquipmentId);
    if (!seedEq) return;
    const client = liveClients.find((c) => c.id === seedEq.clientId);

    // Convert dropdown value ("pms") → label ("PMS (Preventative Maintenance)") for seed-data.json
    const serviceTypeLabel =
      serviceTypeOptions.find((opt) => opt.value === editServiceType)?.label ?? editServiceType;
    const numericInterval = Number(editInterval);
    const intervalUnit = editIntervalUnit as "Hours" | "KM" | "Weeks" | "Months" | "Years";

    // Unit-uniqueness check — exclude the entry being edited (it owns its own unit)
    const unitTakenByOther = allScheduledMaintenance.some(
      (e) =>
        e.equipmentId === editEquipmentId &&
        e.id !== editingEntry.id &&
        e.serviceIntervalUnit.toLowerCase() === intervalUnit.toLowerCase()
    );
    if (unitTakenByOther) {
      toast.error(`This equipment already has a ${intervalUnit} schedule. Change or delete that entry first.`);
      return;
    }

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
      void trpcUtils.seedEquipment.list.invalidate();
    } catch {
      toast.error("Failed to write to seed data. Changes are saved locally only.");
    }

    const recomputedStatus = computeEntryStatus(
      { serviceInterval: numericInterval, serviceIntervalUnit: editIntervalUnit },
      seedEq,
      (seedServiceRecordsData?.records ?? []).filter(r => r.status === "completed")
    );
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
      status: recomputedStatus as ScheduledMaintenanceEntry["status"],
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
        <button
          onClick={toggleResetOnCompletion}
          className="flex items-center gap-2.5 px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-all group"
          title={resetOnCompletion ? "Reset Hours on Completion: ON" : "Reset Hours on Completion: OFF"}
        >
          {/* Toggle pill */}
          <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 ${resetOnCompletion ? "bg-[#66B2B2]" : "bg-gray-300"
            }`}>
            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200 ${resetOnCompletion ? "translate-x-4" : "translate-x-0.5"
              }`} />
          </div>
          <span className="text-[11px] font-bold text-gray-700 whitespace-nowrap">
            Reset Hours on Completion
          </span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {[
          { id: "dashboard" as TabType, label: "Dashboard", icon: LayoutDashboard },
          { id: "tasks" as TabType, label: isTech ? "My Tasks" : "Tasks", icon: ClipboardList, count: activeTasks.length },
          { id: "equipment" as TabType, label: "Equipment", icon: Package },
          { id: "scheduled-maintenance" as TabType, label: "Scheduled Maintenance", icon: CalendarClock },
          { id: "reports" as TabType, label: "Service Reports", icon: FileText },
          { id: "new" as TabType, label: "Manual Log", icon: PenTool },
          { id: "inventory" as TabType, label: "Inventory", icon: Box },
        ].filter((tab) => allowedTabs.includes(tab.id)).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-all border-b-2 ${activeTab === tab.id
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
        {/* Dashboard Tab */}
        {activeTab === "dashboard" && (
          <DashboardTab
            activeTasks={activeTasks}
            allScheduledMaintenance={allScheduledMaintenance as any}
            serviceRecords={allServiceRecords}
            onViewReport={(r) => setShowReport(r as any)}
            onSetActiveTab={setActiveTab}
          />
        )}

        {/* Tasks Tab */}
        {activeTab === "tasks" && (
          <>
            {!isTech && (
              <div className="flex justify-end mb-3">
                <Button
                  onClick={() => setSvcTaskModalOpen(true)}
                  className="h-8 bg-[#66B2B2] hover:bg-[#66B2B2]/80 text-white text-xs font-bold"
                >
                  <Plus className="w-3 h-3 mr-2" />
                  Add Task
                </Button>
              </div>
            )}
            {activeTasks.length === 0 ? (
              <div className="data-card py-20 text-center bg-gray-50/50 animate-in fade-in duration-300">
                <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-gray-900 font-bold">No Active Tasks</h3>
                <p className="text-xs text-gray-500 mt-1">New tasks will appear here automatically when equipment reaches service thresholds.</p>
              </div>
            ) : (
              <div className="data-card animate-in fade-in duration-300 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      {["Status", "ID", "Equipment", "Client", "Service", "Priority", "Metric at Service", "Service Interval", "Origin", "Origin", "Action"].map((col) => (
                        <th key={col} className="px-3 py-2.5 text-left text-[9px] font-bold uppercase tracking-wider text-gray-400 whitespace-nowrap">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {activeTasks.map(task => {
                      const eq = equipment.find(e => e.id === task.equipmentId);
                      const client = liveClients.find(c => c.id === task.clientId);
                      const isDraft = !!draftExecutions[task.id];

                      let pmsMeta: any = {};
                      try { pmsMeta = JSON.parse(task.description ?? "{}"); } catch { }
                      const isPmsTask = pmsMeta._src === "pms";
                      const isBookingTask = pmsMeta._origin === "booking";
                      const pmsSeedEq = isPmsTask
                        ? liveEquipment.find((s) => s.id === pmsMeta._seedEqId) ?? null
                        : null;
                      const pmsCfg = pmsSeedEq && pmsMeta._pmsIdx !== undefined
                        ? (Array.isArray(pmsSeedEq.pmsConfiguration) ? pmsSeedEq.pmsConfiguration[pmsMeta._pmsIdx] : null)
                        : null;
                      const pmsSeedClient = pmsSeedEq
                        ? liveClients.find((c) => c.id === pmsSeedEq.clientId) ?? null
                        : null;

                      const displayName = isPmsTask
                        ? (pmsSeedEq?.name ?? eq?.name ?? "Unknown Equipment")
                        : (eq?.name ?? "No unit selected");
                      const displaySub = isPmsTask ? null : (eq ? eq.equipmentType : null);
                      const displayClient = isPmsTask
                        ? (pmsSeedClient?.companyName ?? client?.companyName ?? "Unknown Client")
                        : (client?.companyName ?? "Unknown Client");
                      const metricUnit = pmsCfg?.serviceIntervalUnit ?? "Hours";
                      const manualMetricUnit: string | null = !isPmsTask ? (pmsMeta._serviceIntervalUnit ?? null) : null;
                      const metricValue = isPmsTask
                        ? getPmsMetricValue(pmsSeedEq, metricUnit, gps001CacheMs, gps001HoursOffsetMs)
                        : isBookingTask
                          ? (pmsSeedEq ? getPmsMetricValue(pmsSeedEq, "Hours", gps001CacheMs, gps001HoursOffsetMs) : "—")
                          : (manualMetricUnit && pmsSeedEq
                            ? getPmsMetricValue(pmsSeedEq, manualMetricUnit, gps001CacheMs, gps001HoursOffsetMs)
                            : "—");
                      const serviceIntervalDisplay = isPmsTask && pmsCfg
                        ? formatServiceInterval(pmsCfg.serviceInterval, pmsCfg.serviceIntervalUnit)
                        : (manualMetricUnit ?? null);

                      const taskPriority: string = pmsMeta._priority ?? (isPmsTask ? "medium" : "");
                      const taskOrigin = pmsMeta._origin === "manual" ? "manual" : (pmsMeta._origin === "booking" ? "booking" : "auto");

                      const handleRowClick = () => draftExecutions[task.id]?.travelStartTime ? setExecutionTask(task) : setConfirmTask(task);

                      return (
                        <tr
                          key={task.id}
                          className="border-b border-gray-50 last:border-0 transition-colors hover:bg-gray-50/60 cursor-pointer"
                          onClick={isTech ? handleRowClick : () => setViewTaskDetails(task)}
                        >
                          <td className="px-3 py-3 whitespace-nowrap">
                            {task.status === "scheduled" && !isDraft ? (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-gray-100 text-gray-500">Scheduled</span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-amber-100 text-amber-700">Pending</span>
                            )}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            <span className="font-mono-tech text-[10px] text-gray-500">#{task.id}</span>
                          </td>
                          <td className="px-3 py-3">
                            <div className="text-xs font-bold text-gray-900">{displayName}</div>
                          </td>
                          <td className="px-3 py-3 text-xs text-gray-700 whitespace-nowrap">{displayClient}</td>
                          <td className="px-3 py-3 text-xs text-gray-700 whitespace-nowrap">{task.serviceCategory}</td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            {taskPriority === "high" ? (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-red-100 text-red-700">High</span>
                            ) : taskPriority === "medium" ? (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-amber-100 text-amber-700">Medium</span>
                            ) : taskPriority === "low" ? (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-gray-100 text-gray-500">Low</span>
                            ) : (
                              <span className="text-gray-400 text-xs">—</span>
                            )}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            <span className="font-mono-tech text-xs text-gray-700">{metricValue}</span>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            <span className="font-mono-tech text-xs text-gray-700">{serviceIntervalDisplay ?? "—"}</span>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            {isTech ? (
                              <Button
                                className="h-8 px-3 text-xs bg-gray-900 hover:bg-[#66B2B2] text-white font-bold transition-all"
                                onClick={handleRowClick}
                              >
                                {task.status === "scheduled" && !isDraft ? (
                                  <><Play className="w-3 h-3 mr-1.5" /> Start Service</>
                                ) : (
                                  <><CheckCircle2 className="w-3 h-3 mr-1.5" /> Continue Execution</>
                                )}
                              </Button>
                            ) : (
                              <Button
                                className="h-8 px-3 text-xs bg-[#66B2B2] hover:bg-[#5A9E9E] text-white font-bold transition-all"
                                onClick={() => setViewTaskDetails(task)}
                              >
                                View Details
                              </Button>
                            )}
                          </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
            }
          </>
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
                onClick={startScanning}
                className="bg-[#66B2B2] text-white hover:bg-[#10B981]/90 font-bold h-8 text-xs"
              >
                <Camera className="w-3.5 h-3.5 mr-1.5" />
                Scan QR
              </Button>
            </div>

            <div className="data-card overflow-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left py-2.5 px-3 text-gray-600 font-bold uppercase tracking-wider">Image</th>
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
                    <th className="text-left py-2.5 px-3 text-gray-600 font-bold uppercase tracking-wider">QR Code</th>
                    <th className="py-2.5 px-3 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSeedEquipment.map((seedEq) => {
                    const seedClient = liveClients.find((c) => c.id === seedEq.clientId);
                    const storeEq = equipment.find((e) => e.serialNumber === seedEq.serialNumber);
                    const storeId = storeEq?.id ?? null;

                    // EQ-001: pull hours/km/days from Fleet's localStorage caches
                    const isExcavator = seedEq.id === "EQ-001";
                    const hoursDisplay = isExcavator
                      ? formatGps001Hours()
                      : (seedEq.hoursTotal ?? "—");
                    const hoursTodayDisplay = isExcavator ? "—" : (seedEq.hoursToday ?? "—");

                    const rawKm = isExcavator ? gps001KmTotal : seedEq.kmTotal;
                    const kmNum = rawKm !== undefined && rawKm !== null
                      ? (typeof rawKm === "number" ? rawKm : parseFloat(String(rawKm).replace(/[^\d.]/g, "")))
                      : null;
                    const kmDisplay = kmNum !== null && Number.isFinite(kmNum) ? `${kmNum.toFixed(2)} km` : "—";

                    const rawKmToday = isExcavator ? null : seedEq.kmToday;
                    const kmTodayNum = rawKmToday !== undefined && rawKmToday !== null
                      ? (typeof rawKmToday === "number" ? rawKmToday : parseFloat(String(rawKmToday).replace(/[^\d.]/g, "")))
                      : null;
                    const kmTodayDisplay = kmTodayNum !== null && Number.isFinite(kmTodayNum) ? `${kmTodayNum.toFixed(2)} km` : "—";

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
                    const worstStatusDef = seedData.pmsStatuses.find(s => s.value === worstStatus);
                    const isSelected = selectedSeedId === seedEq.id;
                    const isHighlighted = storeId !== null && highlightedEquipment === storeId;

                    // Service history for this equipment (used in expanded panel)
                    const rowSeedHistory = (seedServiceRecordsData?.records ?? [])
                      .filter((r: any) => r.status === "completed" && r.seedEquipmentId === seedEq.id);

                    return (
                      <Fragment key={seedEq.id}>
                        {/* ── Main table row ── */}
                        <tr
                          ref={(el) => {
                            if (storeId !== null) {
                              if (el) equipmentRefs.current.set(storeId, el);
                              else equipmentRefs.current.delete(storeId);
                            }
                          }}
                          className={`grid-table-row border-b border-gray-100 cursor-pointer hover:bg-[#66B2B2]/5 transition-all ${isSelected || isHighlighted ? 'bg-[#66B2B2]/10 border-[#66B2B2]/30' : ''
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
                          <td className="py-3 px-3">
                            <div className="h-11 w-11 shrink-0 overflow-hidden rounded-md border bg-gray-100 flex items-center justify-center">
                              {seedEq.image ? (
                                <img src={seedEq.image} alt={seedEq.name ?? ""} className="h-full w-full object-cover" />
                              ) : (
                                <Wrench className="w-4 h-4 text-gray-400" />
                              )}
                            </div>
                          </td>

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
                            {worstStatusDef ? (
                              <span
                                className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase"
                                style={{ backgroundColor: `${worstStatusDef.color}33`, color: worstStatusDef.color }}
                              >
                                {worstStatusDef.label}
                              </span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setQrSerial(seedEq.serialNumber ?? "");
                                setShowQR(true);
                              }}
                              className="p-1 rounded bg-white border border-gray-100 hover:border-[#66B2B2] transition-all shadow-sm active:scale-95 group/qr"
                              title="View QR Tag"
                            >
                              <QrCode className="w-5 h-5 text-gray-500 group-hover/qr:text-[#66B2B2] transition-colors" />
                            </button>
                          </td>
                          <td className="py-3 px-3 w-8 text-center">
                            <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${isSelected ? 'rotate-180 text-[#66B2B2]' : ''}`} />
                          </td>
                        </tr>

                        {/* ── Expanded detail panel ── */}
                        {isSelected && (
                          <tr>
                            <td
                              colSpan={11}
                              className="p-0 border-b-2 border-[#66B2B2]/25 bg-gradient-to-b from-[#66B2B2]/5 to-white"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="px-5 py-5 space-y-5 animate-in slide-in-from-top-1 duration-200">

                                {/* ── Identity header ── */}
                                <div className="flex items-start justify-between">
                                  <div>
                                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#66B2B2]/10 text-[#66B2B2] text-[9px] font-black uppercase tracking-[0.1em] mb-1.5">
                                      <Package className="w-2.5 h-2.5" /> Managed Asset
                                    </div>
                                    <h3 className="text-lg font-black text-gray-900 tracking-tight">{seedEq.name ?? "—"}</h3>
                                    <p className="text-[11px] text-gray-500 font-medium mt-0.5">{seedEq.equipmentType ?? "—"}</p>
                                  </div>
                                  <div className="flex flex-col items-end gap-1.5">
                                    {worstStatusDef && (
                                      <span
                                        className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide"
                                        style={{ backgroundColor: `${worstStatusDef.color}20`, color: worstStatusDef.color, border: `1px solid ${worstStatusDef.color}40` }}
                                      >
                                        {worstStatusDef.label}
                                      </span>
                                    )}
                                    {seedEq.id && (
                                      <span className="text-[9px] text-gray-400 font-mono-tech font-bold">{seedEq.id}</span>
                                    )}
                                  </div>
                                </div>

                                {/* ── Info grid ── */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                  <div className="p-3 rounded-xl bg-white border border-gray-100 space-y-0.5">
                                    <div className="text-[9px] text-gray-400 uppercase font-black tracking-widest">Client</div>
                                    <div className="text-xs font-bold text-gray-900">{seedClient?.companyName ?? "—"}</div>
                                  </div>
                                  <div className="p-3 rounded-xl bg-white border border-gray-100 space-y-0.5">
                                    <div className="text-[9px] text-gray-400 uppercase font-black tracking-widest">Serial Number</div>
                                    <div className="text-xs font-bold font-mono-tech text-gray-900">{seedEq.serialNumber ?? "—"}</div>
                                  </div>
                                  <div className="p-3 rounded-xl bg-white border border-gray-100 space-y-0.5">
                                    <div className="text-[9px] text-gray-400 uppercase font-black tracking-widest">Equipment Type</div>
                                    <div className="text-xs font-bold text-gray-900">{seedEq.equipmentType ?? "—"}</div>
                                  </div>
                                  <div className="p-3 rounded-xl bg-white border border-gray-100 space-y-0.5">
                                    <div className="text-[9px] text-gray-400 uppercase font-black tracking-widest">GPS Location</div>
                                    <div className="text-xs font-bold font-mono-tech text-gray-900">
                                      {(seedEq as any).lat != null && (seedEq as any).lng != null
                                        ? `${Number((seedEq as any).lat).toFixed(5)}°N, ${Number((seedEq as any).lng).toFixed(5)}°E`
                                        : "—"}
                                    </div>
                                  </div>
                                </div>

                                {/* ── Usage metrics ── */}
                                <div>
                                  <div className="text-[9px] text-gray-400 uppercase font-black tracking-widest mb-2">Usage Metrics</div>
                                  <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                                    {[
                                      { label: "Hours Today", value: hoursTodayDisplay },
                                      { label: "Total Hours", value: hoursDisplay },
                                      { label: "KM Today", value: kmTodayDisplay },
                                      { label: "Total KM", value: kmDisplay },
                                      { label: "Days Active", value: daysDisplay },
                                      { label: "Weeks", value: weeksDisplay },
                                    ].map(({ label, value }) => (
                                      <div key={label} className="p-2.5 rounded-lg bg-white border border-gray-100 text-center space-y-0.5">
                                        <div className="text-[9px] text-gray-400 uppercase font-black tracking-widest leading-tight">{label}</div>
                                        <div className={`text-xs font-black font-mono-tech ${value === "—" ? "text-gray-300" : "text-gray-900"}`}>{value}</div>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {/* ── PMS Schedules ── */}
                                {Array.isArray((seedEq as any).pmsConfiguration) && (seedEq as any).pmsConfiguration.length > 0 && (
                                  <div>
                                    <div className="text-[9px] text-gray-400 uppercase font-black tracking-widest mb-2">PMS Schedules</div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                      {(seedEq as any).pmsConfiguration.map((cfg: any, i: number) => (
                                        <div key={i} className="p-3 rounded-xl bg-white border border-gray-100 flex items-start justify-between gap-2">
                                          <div className="space-y-0.5 min-w-0">
                                            <div className="text-xs font-bold text-gray-900 truncate">{cfg.serviceType || `Schedule ${i + 1}`}</div>
                                            <div className="text-[10px] text-gray-500 font-mono-tech">{cfg.serviceInterval} {cfg.serviceIntervalUnit}</div>
                                          </div>
                                          {cfg.estimatedCost > 0 && (
                                            <div className="text-[10px] font-black text-[#66B2B2] whitespace-nowrap shrink-0">
                                              ₱{Number(cfg.estimatedCost).toLocaleString("en-PH")}
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* ── Notes ── */}
                                {(seedEq as any).notes && (
                                  <div>
                                    <div className="text-[9px] text-gray-400 uppercase font-black tracking-widest mb-1.5">Notes</div>
                                    <p className="text-xs text-gray-700 leading-relaxed p-3 rounded-xl bg-white border border-gray-100">{(seedEq as any).notes}</p>
                                  </div>
                                )}

                                {/* ── Maintenance History Timeline ── */}
                                <div className="space-y-2.5">
                                  <div className="text-[10px] text-gray-400 uppercase font-black tracking-[0.2em] flex items-center gap-2">
                                    <History className="w-3.5 h-3.5" /> Maintenance History Timeline
                                  </div>
                                  {rowSeedHistory.length > 0 ? (
                                    rowSeedHistory.slice(0, 5).map((record: any) => (
                                      <div
                                        key={record.id}
                                        className="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-white hover:border-[#66B2B2]/30 hover:bg-[#66B2B2]/5 transition-all cursor-pointer group"
                                        onClick={(e) => { e.stopPropagation(); setShowReport(record as any); }}
                                      >
                                        <div className="flex items-center gap-4">
                                          <div className="w-9 h-9 rounded-full bg-green-50 border border-green-100 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                            <Check className="w-4 h-4 text-green-500" />
                                          </div>
                                          <div>
                                            <div className="text-xs font-bold text-gray-900 group-hover:text-[#66B2B2] transition-colors">
                                              {record.serviceType || record.serviceCategory}
                                            </div>
                                            <div className="text-[10px] text-gray-400 font-medium uppercase mt-0.5">
                                              {record.completedDate
                                                ? new Date(record.completedDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                                                : "—"}
                                              <span className="mx-1">•</span>Tech: {record.technician}
                                            </div>
                                          </div>
                                        </div>
                                        <div className="w-7 h-7 rounded-full flex items-center justify-center bg-gray-50 border border-gray-100 text-gray-300 group-hover:text-[#66B2B2] transition-all shrink-0">
                                          <ChevronRight className="w-3.5 h-3.5" />
                                        </div>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="text-center py-8 bg-white rounded-xl border border-dashed border-gray-200">
                                      <div className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.1em]">No prior service history</div>
                                    </div>
                                  )}
                                </div>

                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
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
                className="h-8 bg-[#66B2B2] text-white hover:bg-[#F2A900]/90 font-semibold text-xs"
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
                  {(() => {
                    const completedRecs = (seedServiceRecordsData?.records ?? []).filter(r => r.status === "completed");
                    return allScheduledMaintenance.map((entry) => {
                      const _seedEq = liveEquipment.find((e) => e.id === entry.equipmentId);
                      const pmsCfgArg = { serviceInterval: entry.serviceInterval, serviceIntervalUnit: entry.serviceIntervalUnit };
                      const nextService = _seedEq ? computeNextService(pmsCfgArg, _seedEq, completedRecs) : "—";
                      const liveStatus = _seedEq ? computeEntryStatus(pmsCfgArg, _seedEq, completedRecs) : "—";
                      const statusDef = seedData.pmsStatuses.find(s => s.value === liveStatus);
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
                            {statusDef ? (
                              <span
                                className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase"
                                style={{ backgroundColor: `${statusDef.color}33`, color: statusDef.color }}
                              >
                                {statusDef.label}
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-500 uppercase">—</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-mono-tech text-xs text-gray-700">{nextService}</td>
                          <td className="py-2.5 px-3">
                            <div className="relative inline-flex items-center">
                              <button
                                type="button"
                                className="p-2 text-gray-400 hover:text-[#66B2B2] transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setScheduleActionMenuOpenFor((current) => (current === entry.id ? null : entry.id));
                                }}
                                aria-label="Open action menu"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>

                              {scheduleActionMenuOpenFor === entry.id && (
                                <div className="absolute right-0 top-10 z-50 min-w-[130px] rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
                                  <button
                                    type="button"
                                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-100 transition-colors"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setScheduleActionMenuOpenFor(null);
                                      openEditModal(entry);
                                    }}
                                  >
                                    <Pencil className="w-3 h-3" />
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setScheduleActionMenuOpenFor(null);
                                      handleDeleteEntry(entry);
                                    }}
                                    disabled={deletePmsConfigurationMutation.status === 'pending'}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                    Delete
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    });
                  })()}
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
                    <Select value={scheduleEquipmentId} onValueChange={(v) => {
                      setScheduleEquipmentId(v);
                      setScheduleMissingFields((p) => p.filter((f) => f !== "equipment"));
                      const taken = new Set(
                        allScheduledMaintenance
                          .filter((e) => e.equipmentId === v)
                          .map((e) => e.serviceIntervalUnit.toLowerCase())
                      );
                      const firstAvailable = PM_INTERVAL_UNITS.find((u) => !taken.has(u.toLowerCase()));
                      if (firstAvailable) setScheduleIntervalUnit(firstAvailable);
                    }}>
                      <SelectTrigger className={`w-full bg-white text-black ${scheduleMissingFields.includes("equipment") ? "border-[#EF4444]" : "border-gray-200"}`}><SelectValue placeholder="Select equipment" /></SelectTrigger>
                      <SelectContent className="bg-white border-gray-200">
                        {liveEquipment.map((eq) => <SelectItem key={eq.id} value={eq.id}>{eq.name}</SelectItem>)}
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
                        <SelectContent className="bg-white border-gray-200">
                          {(() => {
                            const takenUnitsForAdd = new Set(
                              allScheduledMaintenance
                                .filter((e) => e.equipmentId === scheduleEquipmentId)
                                .map((e) => e.serviceIntervalUnit.toLowerCase())
                            );
                            return PM_INTERVAL_UNITS.map((u) => (
                              <SelectItem key={u} value={u} disabled={takenUnitsForAdd.has(u.toLowerCase())}>
                                {u}
                              </SelectItem>
                            ));
                          })()}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm text-black font-medium">Estimated Cost</Label>
                    <Input type="number" min="0" step="0.01" value={scheduleEstimatedCost} onChange={(e) => setScheduleEstimatedCost(e.target.value)} placeholder="$0.00" className="bg-white border-gray-200 text-black placeholder:text-gray-400" />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => { resetScheduleModal(); setScheduleModalOpen(false); }} className="border-gray-200 text-gray-600 hover:bg-gray-50" disabled={addPmsConfigurationMutation.status === 'pending'}>Cancel</Button>
                  <Button onClick={handleScheduleSubmit} className="bg-[#66B2B2] text-black hover:bg-[#66B2B2]/90 font-semibold" disabled={addPmsConfigurationMutation.status === 'pending'}>{addPmsConfigurationMutation.status === 'pending' ? "Saving…" : "Schedule →"}</Button>
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
                        {liveEquipment.map((eq) => <SelectItem key={eq.id} value={eq.id}>{eq.name}</SelectItem>)}
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
                        <SelectContent className="bg-white border-gray-200">
                          {(() => {
                            const takenUnitsForEdit = new Set(
                              allScheduledMaintenance
                                .filter((e) => e.equipmentId === editEquipmentId && e.id !== editingEntry?.id)
                                .map((e) => e.serviceIntervalUnit.toLowerCase())
                            );
                            return PM_INTERVAL_UNITS.map((u) => (
                              <SelectItem key={u} value={u} disabled={takenUnitsForEdit.has(u.toLowerCase())}>
                                {u}
                              </SelectItem>
                            ));
                          })()}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm text-black font-medium">Estimated Cost</Label>
                    <Input type="number" min="0" step="0.01" value={editEstimatedCost} onChange={(e) => setEditEstimatedCost(e.target.value)} placeholder="$0.00" className="bg-white border-gray-200 text-black placeholder:text-gray-400" />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => { resetEditModal(); setEditModalOpen(false); }} className="border-gray-200 text-gray-600 hover:bg-gray-50" disabled={updatePmsConfigurationMutation.status === 'pending'}>Cancel</Button>
                  <Button onClick={handleEditSubmit} className="bg-[#66B2B2] text-white hover:bg-[#66B2B2]/90 font-semibold" disabled={updatePmsConfigurationMutation.status === 'pending'}>{updatePmsConfigurationMutation.status === 'pending' ? "Saving…" : "Save Changes"}</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {/* Service Reports Tab */}
        {activeTab === "reports" && (() => {
          // Seed-data.json is the single source of truth for completed records.
          // All rich fields (metricAtService, equipmentStatusAtService, addresses, timestamps)
          // only exist on persisted records. Failed submissions are queued in Zustand and
          // retried automatically via the pendingSubmissions effect above — they never
          // appear here as sparse phantom rows.
          const allCompleted = (seedServiceRecordsData?.records ?? [])
            .filter((r) => r.status === "completed")
            .sort((a, b) => new Date(a.completedDate ?? 0).getTime() - new Date(b.completedDate ?? 0).getTime());

          return (
            <div className="space-y-3 animate-in fade-in duration-300">
              <div className="data-card overflow-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left py-2.5 px-3 text-gray-600 font-bold uppercase tracking-wider whitespace-nowrap">Equipment</th>
                      <th className="text-left py-2.5 px-3 text-gray-600 font-bold uppercase tracking-wider whitespace-nowrap">Client</th>
                      <th className="text-left py-2.5 px-3 text-gray-600 font-bold uppercase tracking-wider whitespace-nowrap">Serial Number</th>
                      <th className="text-left py-2.5 px-3 text-gray-600 font-bold uppercase tracking-wider whitespace-nowrap">Equipment Type</th>
                      <th className="text-left py-2.5 px-3 text-gray-600 font-bold uppercase tracking-wider whitespace-nowrap">Service Type</th>
                      <th className="text-left py-2.5 px-3 text-gray-600 font-bold uppercase tracking-wider whitespace-nowrap">Cost</th>
                      <th className="text-left py-2.5 px-3 text-gray-600 font-bold uppercase tracking-wider whitespace-nowrap">Technician</th>
                      <th className="text-left py-2.5 px-3 text-gray-600 font-bold uppercase tracking-wider whitespace-nowrap">Completed Date</th>
                      <th className="text-left py-2.5 px-3 text-gray-600 font-bold uppercase tracking-wider whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allCompleted.map((record) => {
                      // Resolve display values: rich fields on seed records first, then seed JSON lookups,
                      // then store lookups as a last resort.
                      const r = record as any;
                      const storeEq = equipment.find(e => String(e.id) === String(record.equipmentId));

                      // Parse PMS meta from the task description — store-completed records don't
                      // carry seedEquipmentId directly, but it's always in the description JSON.
                      const descMeta = (() => { try { return JSON.parse(r.description ?? "{}"); } catch { return {}; } })();

                      // Priority: explicit seedEquipmentId field → _seedEqId in description → serial match
                      const seedEqRow: any = r.seedEquipmentId
                        ? liveEquipment.find(s => s.id === r.seedEquipmentId)
                        : descMeta._seedEqId
                          ? liveEquipment.find(s => s.id === descMeta._seedEqId)
                          : storeEq
                            ? liveEquipment.find(s => s.serialNumber === storeEq.serialNumber)
                            : null;

                      // PMS config for interval / service type fallback
                      const seedPmsCfg: any = seedEqRow && descMeta._pmsIdx !== undefined
                        ? (Array.isArray(seedEqRow.pmsConfiguration) ? seedEqRow.pmsConfiguration[descMeta._pmsIdx] : null) ?? null
                        : null;

                      const storeClient = liveClients?.find((c: any) => String(c.id) === String(record.clientId));
                      const seedClientRow: any = seedEqRow?.clientId
                        ? liveClients.find(c => c.id === seedEqRow.clientId)
                        : null;

                      const rowEqName = r.equipmentName || seedEqRow?.name || storeEq?.name || "—";
                      const rowClientName = r.clientName || seedClientRow?.companyName || storeClient?.companyName || "—";
                      const rowSerial = r.serialNumber || seedEqRow?.serialNumber || storeEq?.serialNumber || "—";
                      const rowEqType = r.equipmentType || seedEqRow?.equipmentType || "—";
                      const rowSvcType = r.serviceType || seedPmsCfg?.serviceType || record.serviceCategory || "—";
                      const recordCost = r.finalCost ?? record.cost ?? 0;
                      const rowCost = recordCost > 0
                        ? `₱${Number(recordCost).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : "—";

                      return (
                        <tr key={record.id} className="grid-table-row border-b border-gray-100 hover:bg-gray-50 transition-all">
                          <td className="py-3 px-3 font-bold text-gray-900 whitespace-nowrap">{rowEqName}</td>
                          <td className="py-3 px-3 text-gray-700 whitespace-nowrap">{rowClientName}</td>
                          <td className="py-3 px-3 text-gray-500 font-mono-tech whitespace-nowrap">{rowSerial}</td>
                          <td className="py-3 px-3 text-gray-600 whitespace-nowrap">{rowEqType}</td>
                          <td className="py-3 px-3 text-gray-700 whitespace-nowrap">{rowSvcType}</td>
                          <td className="py-3 px-3 text-gray-700 font-mono-tech whitespace-nowrap">{rowCost}</td>
                          <td className="py-3 px-3 text-gray-700 whitespace-nowrap">{record.technician}</td>
                          <td className="py-3 px-3 text-gray-500 font-mono-tech whitespace-nowrap">
                            {record.completedDate ? new Date(record.completedDate).toLocaleDateString() : "—"}
                          </td>
                          <td className="py-3 px-3">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setShowReport({
                                ...record,
                                equipmentName: rowEqName,
                                clientName: rowClientName,
                                serialNumber: rowSerial,
                                equipmentType: rowEqType,
                                serviceType: rowSvcType,
                                invoiceId: (record as any).invoiceId ?? null,
                                createdAt: (record as any).createdAt ?? new Date().toISOString(),
                              } as any)}
                              className="h-7 text-[10px] border-gray-200 hover:bg-[#66B2B2] hover:text-white transition-all whitespace-nowrap"
                            >
                              <FileText className="w-3 h-3 mr-1" />
                              View Report
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                    {allCompleted.length === 0 && (
                      <tr>
                        <td colSpan={11} className="py-12 text-center text-gray-400 text-xs font-bold uppercase tracking-widest">
                          No completed service records found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}

        {/* Manual Log Tab */}
        {activeTab === "new" && isTech && (
          <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300 pb-10">
            <div className="data-card p-8 space-y-8 bg-white shadow-xl border border-gray-200 rounded-2xl">
              {/* Header */}
              <div className="flex items-center gap-4 mb-2">
                <div className="w-12 h-12 rounded-2xl bg-[#66B2B2]/10 flex items-center justify-center shadow-inner">
                  <PenTool className="w-6 h-6 text-[#66B2B2]" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900 tracking-tight">Manual Service Documentation</h3>
                  <p className="text-sm text-gray-500 font-medium">Generate a comprehensive service report for ad-hoc maintenance.</p>
                </div>
              </div>

              {/* Step 1: Core Info */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                  <Package className="w-4 h-4 text-[#66B2B2]" />
                  <span className="text-xs font-black uppercase tracking-widest text-gray-400">Asset & Assignment</span>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] text-gray-500 uppercase font-black mb-1.5 block tracking-widest">Client Company</label>
                      <Select value={formClientId} onValueChange={(v) => { setFormClientId(v); setFormEquipmentId(""); }}>
                        <SelectTrigger className="h-12 bg-gray-50 border-gray-100 text-gray-900 focus:ring-[#66B2B2]/30 rounded-xl font-bold">
                          <SelectValue placeholder="Select client..." />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-gray-200 z-50">
                          {liveClients.length > 0 ? liveClients.map(c => (
                            <SelectItem key={c.id} value={String(c.id)} className="text-gray-900">
                              {c.companyName}
                            </SelectItem>
                          )) : <div className="p-2 text-xs text-gray-400">No clients found</div>}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 uppercase font-black mb-1.5 block tracking-widest">Equipment Unit</label>
                      <Select value={formEquipmentId} onValueChange={setFormEquipmentId} disabled={!formClientId}>
                        <SelectTrigger className="h-12 bg-gray-50 border-gray-100 text-gray-900 focus:ring-[#66B2B2]/30 disabled:bg-gray-50 rounded-xl font-bold">
                          <SelectValue placeholder={formClientId ? "Select unit ID..." : "Select client first"} />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-gray-200 z-50">
                          {liveEquipment.filter(e => String(e.clientId) === formClientId).map(e => (
                            <SelectItem key={e.id} value={String(e.id)} className="text-gray-900 font-mono-tech">{e.name ?? e.id} — {e.equipmentType}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] text-gray-500 uppercase font-black mb-1.5 block tracking-widest">Service Category</label>
                      <Select value={formType} onValueChange={setFormType}>
                        <SelectTrigger className="h-12 bg-gray-50 border-gray-100 text-gray-900 focus:ring-[#66B2B2]/30 rounded-xl font-bold">
                          <SelectValue placeholder="Select type..." />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-gray-200 z-50">
                          {seedData.serviceTypes.map((option) => (
                            <SelectItem key={option.value} value={option.value} className="text-gray-900">
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 uppercase font-black mb-1.5 block tracking-widest">Performing Technician</label>
                      <Input value={formTechnician} onChange={(e) => setFormTechnician(e.target.value)} className="h-12 bg-gray-50 border-gray-100 text-gray-900 focus:ring-[#66B2B2]/30 rounded-xl font-bold" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 2: Visual Evidence */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                  <Camera className="w-4 h-4 text-[#66B2B2]" />
                  <span className="text-xs font-black uppercase tracking-widest text-gray-400">Visual Evidence Documentation</span>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-[10px] text-gray-500 uppercase font-black block tracking-widest ml-1">Pre-Service State (Before)</label>
                    <div className="relative aspect-video rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 overflow-hidden group hover:border-[#66B2B2]/50 transition-colors">
                      {formBeforePhoto ? (
                        <>
                          <img src={formBeforePhoto} className="w-full h-full object-cover" alt="Before" />
                          <button onClick={() => setFormBeforePhoto(null)} className="absolute top-2 right-2 bg-red-500 p-1.5 rounded-full text-white shadow-xl opacity-0 group-hover:opacity-100 transition-opacity">
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-[#66B2B2]/5 transition-colors">
                          <Upload className="w-8 h-8 text-gray-300 mb-2" />
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Upload Photo</span>
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (ev) => setFormBeforePhoto(ev.target?.result as string);
                              reader.readAsDataURL(file);
                            }
                          }} />
                        </label>
                      )}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] text-gray-500 uppercase font-black block tracking-widest ml-1">Post-Service State (After)</label>
                    <div className="relative aspect-video rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 overflow-hidden group hover:border-[#66B2B2]/50 transition-colors">
                      {formAfterPhoto ? (
                        <>
                          <img src={formAfterPhoto} className="w-full h-full object-cover" alt="After" />
                          <button onClick={() => setFormAfterPhoto(null)} className="absolute top-2 right-2 bg-red-500 p-1.5 rounded-full text-white shadow-xl opacity-0 group-hover:opacity-100 transition-opacity">
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-[#66B2B2]/5 transition-colors">
                          <Upload className="w-8 h-8 text-gray-300 mb-2" />
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Upload Photo</span>
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (ev) => setFormAfterPhoto(ev.target?.result as string);
                              reader.readAsDataURL(file);
                            }
                          }} />
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 3: Technical Details */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                  <FileText className="w-4 h-4 text-[#66B2B2]" />
                  <span className="text-xs font-black uppercase tracking-widest text-gray-400">Technical Report Details</span>
                </div>
                <div className="grid gap-6">
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase font-black mb-1.5 block tracking-widest ml-1">Initial Findings & Diagnosed Faults</label>
                    <textarea
                      className="w-full p-4 rounded-xl border border-gray-200 text-sm text-gray-900 focus:border-[#66B2B2] focus:ring-2 focus:ring-[#66B2B2]/10 outline-none transition-all resize-none bg-gray-50/50"
                      rows={2}
                      value={formFindings}
                      onChange={(e) => setFormFindings(e.target.value)}
                      placeholder="Detail any damage, leaks, or identified issues before work started..."
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase font-black mb-1.5 block tracking-widest ml-1">Technical Work & Operations Performed</label>
                    <textarea
                      className="w-full p-4 rounded-xl border border-gray-200 text-sm text-gray-900 focus:border-[#66B2B2] focus:ring-2 focus:ring-[#66B2B2]/10 outline-none transition-all resize-none bg-gray-50/50"
                      rows={3}
                      value={formWorkDone}
                      onChange={(e) => setFormWorkDone(e.target.value)}
                      placeholder="Detail all repairs, parts replaced, adjustments, and testing performed..."
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase font-black mb-1.5 block tracking-widest ml-1">Strategic Maintenance Recommendations</label>
                    <textarea
                      className="w-full p-4 rounded-xl border border-gray-200 text-sm text-gray-900 focus:border-[#66B2B2] focus:ring-2 focus:ring-[#66B2B2]/10 outline-none transition-all resize-none bg-gray-50/50"
                      rows={2}
                      value={formRecommendation}
                      onChange={(e) => setFormRecommendation(e.target.value)}
                      placeholder="Next suggested service, preventative actions, or pending parts..."
                    />
                  </div>
                </div>
              </div>

              {/* Step 4: Verification */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                  <UserCheck className="w-4 h-4 text-[#66B2B2]" />
                  <span className="text-xs font-black uppercase tracking-widest text-gray-400">Digital Seal & Verification</span>
                </div>
                <div className="grid grid-cols-2 gap-8">
                  <SignaturePad
                    label="Technician Verification"
                    value={formTechSign}
                    onChange={setFormTechSign}
                    caption="Technician's digital seal of work completion."
                  />
                  <SignaturePad
                    label="Client Representative Acceptance"
                    value={formClientSign}
                    onChange={setFormClientSign}
                    caption="Customer's acknowledgment of service delivery."
                  />
                </div>
              </div>

              <div className="bg-[#66B2B2]/5 border border-[#66B2B2]/20 p-5 rounded-2xl flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#66B2B2]/10 flex items-center justify-center flex-shrink-0 shadow-sm border border-[#66B2B2]/20">
                  <AlertTriangle className="w-5 h-5 text-[#66B2B2]" />
                </div>
                <p className="text-[11px] text-gray-700 leading-relaxed font-medium">
                  <strong className="text-gray-900">Legal Compliance Notice:</strong> By submitting this manual log, you certify that all technical work listed was performed to NexTOS safety standards and has been visually verified. This record will be permanently sealed into the asset's maintenance history and available for client review.
                </p>
              </div>

              <Button
                className="w-full h-14 bg-[#66B2B2] text-white font-black hover:bg-[#5A9E9E] rounded-2xl shadow-xl shadow-[#66B2B2]/20 transition-all active:scale-[0.98] text-base uppercase tracking-widest"
                onClick={() => {
                  if (!formClientId || !formEquipmentId || !formWorkDone) {
                    toast.error("Required documentation missing", { description: "Please ensure Client, Equipment, and Technical Work sections are filled." });
                    return;
                  }
                  if (!formTechSign || !formClientSign) {
                    toast.error("Signatures Required", { description: "Both Technician and Client signatures must be captured." });
                    return;
                  }

                  const recordId = 8_000_000 + Date.now() % 1_000_000;
                  const completedDate = new Date().toISOString();
                  const targetEq = equipment.find(e => String(e.id) === formEquipmentId);

                  addServiceRecord({
                    equipmentId: String(formEquipmentId),
                    clientId: formClientId as any, // Bypass number type issue temporarily
                    technician: formTechnician,
                    serviceCategory: formType as any,
                    description: formWorkDone,
                    partsUsed: "Manually Logged",
                    status: "completed",
                    scheduledDate: completedDate,
                    completedDate,
                    cost: 0,
                    findings: formFindings || "Manually Logged Entry",
                    workDone: formWorkDone,
                    recommendation: formRecommendation || "Regular monitoring advised",
                    hoursAtService: parseFloat(String(targetEq?.hoursTotal)) || 0,
                    techSignature: formTechSign,
                    clientSignature: formClientSign
                  });

                  if (formBeforePhoto) {
                    addServicePhoto({ serviceRecordId: recordId, type: "before", url: formBeforePhoto, caption: "Manual Log: Before" });
                  }
                  if (formAfterPhoto) {
                    addServicePhoto({ serviceRecordId: recordId, type: "after", url: formAfterPhoto, caption: "Manual Log: After" });
                  }

                  // Persist to seed data
                  try {
                    const seedEq = liveEquipment.find(s => s.serialNumber === targetEq?.serialNumber);
                    const seedClient = liveClients.find(c => String(c.id) === formClientId);

                    upsertSeedServiceRecord.mutate({
                      id: recordId,
                      seedEquipmentId: seedEq?.id || "",
                      equipmentId: formEquipmentId as any,
                      clientId: formClientId as any,
                      serviceCategory: formType,
                      status: "completed",
                      scheduledDate: completedDate,
                      completedDate,
                      technician: formTechnician,
                      description: formWorkDone,
                      findings: formFindings,
                      workDone: formWorkDone,
                      recommendation: formRecommendation,
                      partsUsed: "Manually Logged",
                      cost: 0,
                      hoursAtService: parseFloat(String(targetEq?.hoursTotal)) || 0,
                      // Rich fields for PDF/View
                      equipmentName: seedEq?.name || targetEq?.name || "",
                      clientName: seedClient?.companyName || "",
                      equipmentType: seedEq?.equipmentType || "",
                      serialNumber: targetEq?.serialNumber || "",
                      serviceType: formType,
                      beforePhoto: formBeforePhoto,
                      afterPhoto: formAfterPhoto,
                      techSignature: formTechSign,
                      clientSignature: formClientSign,
                      completionTime: completedDate
                    } as any);
                  } catch (e) { }

                  toast.success("Manual Report Sealed", { description: "Service record has been officially added to history." });

                  // Reset form
                  setFormClientId("");
                  setFormEquipmentId("");
                  setFormDescription("");
                  setFormFindings("");
                  setFormWorkDone("");
                  setFormRecommendation("");
                  setFormBeforePhoto(null);
                  setFormAfterPhoto(null);
                  setFormTechSign("");
                  setFormClientSign("");
                  setActiveTab("reports");
                }}
              >
                <CheckCircle2 className="w-5 h-5 mr-3" />
                Seal & Submit Service Report
              </Button>
            </div>
          </div>
        )}

        {/* Inventory Tab */}
        {activeTab === "inventory" && (
          <InventoryPage />
        )}
      </div>

      {/* ADD TASK MODAL */}
      {svcTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSvcTaskModalOpen(false)} />
          <div className="relative z-10 w-full max-w-md mx-4">
            <div className="bg-white border border-gray-200 rounded p-5">
              <button
                onClick={() => setSvcTaskModalOpen(false)}
                className="absolute top-3 right-3 text-gray-500"
              >
                <X className="w-4 h-4" />
              </button>
              <h3 className="text-sm font-semibold text-black mb-3">Add Task</h3>
              <div className="space-y-3">
                {/* Client — first */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">Client</label>
                  <Select value={svcTaskClientId} onValueChange={(v) => { setSvcTaskClientId(v); setSvcTaskEquipmentId(""); }}>
                    <SelectTrigger className="h-8 bg-white border-gray-200 text-black text-xs"><SelectValue placeholder="Select client" /></SelectTrigger>
                    <SelectContent className="bg-white border-gray-200">
                      {liveClients.map((c: any) => (
                        <SelectItem key={c.id} value={String(c.id)} className="text-xs text-black">{c.companyName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* Equipment — locked until client is selected */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">Equipment</label>
                  <Select
                    value={svcTaskEquipmentId}
                    onValueChange={setSvcTaskEquipmentId}
                    disabled={!svcTaskClientId}
                  >
                    <SelectTrigger className="h-8 bg-white border-gray-200 text-black text-xs disabled:opacity-50">
                      <SelectValue placeholder={svcTaskClientId ? "Select equipment" : "Select a client first"} />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200">
                      {liveEquipment
                        .filter((eq: any) => String(eq.clientId) === String(svcTaskClientId))
                        .map((eq: any) => (
                          <SelectItem key={eq.id} value={eq.id} className="text-xs text-black">{eq.name}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* Optional metric tracking */}
                {svcTaskEquipmentId && (
                  <div className="space-y-2 p-3 rounded-lg bg-gray-50 border border-gray-100">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-gray-700">Track a service metric?</label>
                      <button
                        type="button"
                        onClick={() => { setSvcTaskTargetsPms(v => !v); setSvcTaskMetricUnit(""); }}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${svcTaskTargetsPms ? "bg-[#66B2B2]" : "bg-gray-300"}`}
                      >
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${svcTaskTargetsPms ? "translate-x-4" : "translate-x-0.5"}`} />
                      </button>
                    </div>
                    {svcTaskTargetsPms && (
                      <Select value={svcTaskMetricUnit} onValueChange={setSvcTaskMetricUnit}>
                        <SelectTrigger className="h-8 bg-white border-gray-200 text-black text-xs">
                          <SelectValue placeholder="Select unit…" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-gray-200">
                          {((seedData as any).serviceIntervalUnits as string[]).map((unit: string) => (
                            <SelectItem key={unit} value={unit} className="text-xs text-black">{unit}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                )}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">Service Type</label>
                  <Select value={svcTaskServiceType} onValueChange={setSvcTaskServiceType}>
                    <SelectTrigger className="h-8 bg-white border-gray-200 text-black text-xs"><SelectValue placeholder="Select service type" /></SelectTrigger>
                    <SelectContent className="bg-white border-gray-200">
                      {(seedData as any).serviceTypes.map((opt: { value: string; label: string }) => (
                        <SelectItem key={opt.value} value={opt.value} className="text-xs text-black">{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">Due Date</label>
                  <Input type="date" value={svcTaskDueDate} onChange={(e) => setSvcTaskDueDate(e.target.value)} className="bg-white border-gray-200 text-black" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">Priority</label>
                  <Select value={svcTaskPriority} onValueChange={(v) => setSvcTaskPriority(v as any)}>
                    <SelectTrigger className="h-8 bg-white border-gray-200 text-black text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-white border-gray-200">
                      <SelectItem value="low" className="text-xs text-black">Low</SelectItem>
                      <SelectItem value="medium" className="text-xs text-black">Medium</SelectItem>
                      <SelectItem value="high" className="text-xs text-black">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {!autoAssignTask && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-600">Assigned To</label>
                    <Select value={svcTaskAssignedTo} onValueChange={setSvcTaskAssignedTo}>
                      <SelectTrigger className="h-8 bg-white border-gray-200 text-black text-xs"><SelectValue placeholder="Select person" /></SelectTrigger>
                      <SelectContent className="bg-white border-gray-200">
                        {seedStaff.filter((s) => s.role === "technician").map((s) => (
                          <SelectItem key={s.id} value={s.name} className="text-xs text-black">{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setSvcTaskModalOpen(false)} className="flex-1">Cancel</Button>
                  <Button
                    className="flex-1 bg-[#66B2B2] text-white"
                    onClick={() => {
                      if (!svcTaskEquipmentId || !svcTaskClientId || !svcTaskServiceType) return;

                      // Duplicate check for metric-tracking tasks
                      if (svcTaskTargetsPms && svcTaskMetricUnit) {
                        const liveRecs = useOperationsStore.getState().serviceRecords;
                        const hasDuplicate = liveRecs.some(r => {
                          if (r.status === "completed") return false;
                          try {
                            const m = JSON.parse(r.description ?? "{}");
                            return m._seedEqId === svcTaskEquipmentId &&
                              m._serviceIntervalUnit?.toLowerCase() === svcTaskMetricUnit.toLowerCase() &&
                              m._resetOnComplete === true;
                          } catch { return false; }
                        });
                        if (hasDuplicate) {
                          toast.error(`A task already tracks ${svcTaskMetricUnit} for this equipment.`);
                          return;
                        }
                      }

                      const selectedSeedEq = liveEquipment.find((e: any) => e.id === svcTaskEquipmentId);
                      const clientNum = Number(String(svcTaskClientId).replace(/\D/g, "")) || 0;
                      const storeEq = equipment.find((e) => e.serialNumber === selectedSeedEq?.serialNumber) ?? equipment[0];
                      if (!storeEq) return;

                      const newTaskId = Date.now();
                      const taskDescription = JSON.stringify({
                        _src: "manual",
                        _origin: "manual",
                        _priority: svcTaskPriority,
                        _seedEqId: svcTaskEquipmentId,
                        label: `${svcTaskServiceType} for ${selectedSeedEq?.name ?? ""}`,
                        _serviceType: svcTaskServiceType,
                        _dueDate: svcTaskDueDate || null,
                        ...(svcTaskTargetsPms && svcTaskMetricUnit ? {
                          _serviceIntervalUnit: svcTaskMetricUnit,
                          _resetOnComplete: true,
                        } : {}),
                      });

                      // Use setState directly so the store record shares the exact same ID
                      // as the seed upsert — prevents the injection effect from adding a duplicate
                      // when seedServiceRecordsData is re-fetched after the upsert.
                      useOperationsStore.setState((state) => ({
                        serviceRecords: [
                          ...state.serviceRecords,
                          {
                            id: newTaskId,
                            equipmentId: storeEq.id,
                            clientId: clientNum,
                            technician: autoAssignTask ? "Pending Assignment" : (svcTaskAssignedTo || "Pending Assignment"),
                            serviceCategory: svcTaskServiceType as any,
                            description: taskDescription,
                            partsUsed: "Pending",
                            status: "scheduled" as const,
                            scheduledDate: new Date().toISOString(),
                            completedDate: null,
                            cost: 0,
                            findings: "",
                            workDone: "",
                            recommendation: "",
                            hoursAtService: 0,
                            invoiceId: null,
                            createdAt: new Date().toISOString(),
                          },
                        ],
                      }));

                      upsertSeedServiceRecord.mutate({
                        id: newTaskId,
                        seedEquipmentId: svcTaskEquipmentId,
                        pmsConfigIndex: 0,
                        equipmentId: storeEq.id,
                        clientId: clientNum,
                        serviceCategory: svcTaskServiceType,
                        status: "scheduled",
                        scheduledDate: svcTaskDueDate || new Date().toISOString(),
                        technician: autoAssignTask ? "Pending Assignment" : (svcTaskAssignedTo || "Pending Assignment"),
                        description: taskDescription,
                        findings: "",
                        workDone: "",
                        recommendation: "",
                        partsUsed: "Pending",
                        cost: 0,
                        hoursAtService: 0,
                        priority: svcTaskPriority,
                        taskOrigin: "manual",
                      });

                      setSvcTaskModalOpen(false);
                      setSvcTaskEquipmentId("");
                      setSvcTaskDueDate("");
                      setSvcTaskPriority("medium");
                      setSvcTaskServiceType("");
                      setSvcTaskClientId("");
                      setSvcTaskAssignedTo("");
                      setSvcTaskTargetsPms(false);
                      setSvcTaskMetricUnit("");
                    }}
                  >
                    Create
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PRE-SERVICE CONFIRMATION MODAL */}
      <PreServiceConfirmModal
        task={confirmTask}
        seedEquipment={liveEquipment}
        onReady={(travelStartTime, techAddress, eqAddress) => {
          if (confirmTask) {
            updateDraftExecution(confirmTask.id, {
              travelStartTime,
              technicianAddress: techAddress || undefined,
              equipmentSiteAddress: eqAddress || undefined,
            });
            const pending = confirmTask;
            setConfirmTask(null);
            setExecutionTask(pending);
          }
        }}
        onCancel={() => setConfirmTask(null)}
      />

      {/* NEW PERSISTENT EXECUTION MODAL */}
      <ExecutionModal
        task={executionTask}
        seedEquipment={liveEquipment}
        seedClients={liveClients}
        onClose={() => setExecutionTask(null)}
        onFinish={() => { setExecutionTask(null); setActiveTab("reports"); }}
        resetOnCompletion={resetOnCompletion}
        onMetricsReset={handleMetricsReset}
      />

      {/* Task Details Modal */}
      <Dialog open={!!viewTaskDetails} onOpenChange={(open) => !open && setViewTaskDetails(null)}>
        <DialogContent className="max-w-xl bg-white border border-gray-200 rounded-2xl shadow-2xl p-0 overflow-hidden text-gray-900">
          {viewTaskDetails && (() => {
            const task = viewTaskDetails;
            let meta: any = {};
            try { meta = JSON.parse(task.description ?? "{}"); } catch { }

            const isBooking = meta._src === "booking";
            const isPms = meta._src === "pms";

            const seedEq = (isPms || isBooking) && meta._seedEqId
              ? liveEquipment.find((s) => s.id === meta._seedEqId) ?? null
              : (liveEquipment.find((e) => e.id === task.equipmentId) ?? null);

            const seedClient = liveClients.find((c) => String(c.id) === String(task.clientId) || String(c.id) === String(seedEq?.clientId));
            const metricUnit = isPms && seedEq && seedEq.pmsConfiguration?.[meta._pmsIdx]?.serviceIntervalUnit || "Hours";
            const metricValue = isPms
              ? getPmsMetricValue(seedEq, metricUnit, gps001CacheMs, gps001HoursOffsetMs)
              : isBooking
                ? (seedEq ? getPmsMetricValue(seedEq, "Hours", gps001CacheMs, gps001HoursOffsetMs) : "—")
                : (equipment.find(e => e.id === task.equipmentId)?.hoursTotal ?? "—");

            const taskOrigin = meta._origin === "manual" ? "manual" : (meta._origin === "booking" ? "booking" : "auto");

            return (
              <>
                <DialogHeader className="p-6 border-b border-gray-100 bg-gradient-to-br from-[#66B2B2]/5 to-transparent">
                  <DialogTitle className="flex items-center justify-between text-gray-900 text-lg font-bold">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-[#66B2B2]/10 flex items-center justify-center">
                        <Wrench className="w-4.5 h-4.5 text-[#66B2B2]" />
                      </div>
                      <span>Task Details #{task.id}</span>
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${task.status === "scheduled"
                        ? "bg-gray-100 text-gray-500"
                        : "bg-amber-100 text-amber-700"
                      }`}>
                      {task.status}
                    </span>
                  </DialogTitle>
                  <DialogDescription className="text-xs text-gray-500 mt-1">
                    Complete information for this maintenance and service task.
                  </DialogDescription>
                </DialogHeader>

                <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
                  {/* Client Info Card */}
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Client Information</h4>
                    <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/55 space-y-2">
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-gray-400 block text-[10px] uppercase">Company Name</span>
                          <span className="font-bold text-gray-800">{seedClient?.companyName ?? "N/A"}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[10px] uppercase">Industry</span>
                          <span className="font-semibold text-gray-700">{seedClient?.industry ?? "N/A"}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[10px] uppercase">Main Contact</span>
                          <span className="font-semibold text-gray-700">{seedClient?.mainContact ?? seedClient?.contactName ?? "N/A"}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[10px] uppercase">Phone</span>
                          <span className="font-semibold text-gray-700">{seedClient?.phone ?? "N/A"}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-gray-400 block text-[10px] uppercase">Email</span>
                          <span className="font-semibold text-gray-700">{seedClient?.email ?? "N/A"}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-gray-400 block text-[10px] uppercase">Address</span>
                          <span className="font-semibold text-gray-700">{seedClient?.address ?? "N/A"}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Equipment Info Card */}
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Equipment Details</h4>
                    <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/55 space-y-2">
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-gray-400 block text-[10px] uppercase">Unit ID / Name</span>
                          <span className="font-bold text-gray-800">{seedEq?.name ?? seedEq?.unitId ?? "N/A"}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[10px] uppercase">Serial Number</span>
                          <span className="font-mono text-gray-800">{seedEq?.serialNumber ?? "N/A"}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[10px] uppercase">Manufacturer / Model</span>
                          <span className="font-semibold text-gray-700">
                            {seedEq?.manufacturer && seedEq?.model ? `${seedEq.manufacturer} ${seedEq.model}` : (seedEq?.manufacturer ?? seedEq?.model ?? "N/A")}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[10px] uppercase">Current Reading</span>
                          <span className="font-mono text-gray-800 font-semibold">{metricValue}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Service & Schedule Card */}
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Service &amp; Schedule</h4>
                    <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/55 space-y-2">
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-gray-400 block text-[10px] uppercase">Service Type</span>
                          <span className="font-semibold text-gray-800">{task.serviceCategory}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[10px] uppercase">Origin</span>
                          <span className="capitalize font-semibold text-gray-800">{taskOrigin}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[10px] uppercase">Assigned Technician</span>
                          <span className="font-bold text-gray-800">{task.technician || "Pending Assignment"}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[10px] uppercase">Schedule Date</span>
                          <span className="font-semibold text-gray-800">
                            {task.scheduledDate ? new Date(task.scheduledDate).toLocaleDateString(undefined, {
                              weekday: "short",
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            }) : "N/A"}
                          </span>
                        </div>
                        {isBooking && (
                          <>
                            <div>
                              <span className="text-gray-400 block text-[10px] uppercase">Time Slot</span>
                              <span className="font-semibold text-gray-800">{meta.preferredTime ?? "N/A"}</span>
                            </div>
                            <div>
                              <span className="text-gray-400 block text-[10px] uppercase">Booking ID</span>
                              <span className="font-mono font-semibold text-gray-800">{meta._bookingId ?? "N/A"}</span>
                            </div>
                            {meta.packageName && (
                              <div className="col-span-2">
                                <span className="text-gray-400 block text-[10px] uppercase">Associated Package</span>
                                <span className="font-semibold text-[#66B2B2]">{meta.packageName}</span>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Notes / Remarks Card */}
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Additional Notes / Remarks</h4>
                    <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/55 text-xs">
                      <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                        {isBooking ? (meta.notes || "No additional notes from client.") : (task.description && !task.description.startsWith("{") ? task.description : "No description provided.")}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-end">
                  <Button
                    onClick={() => setViewTaskDetails(null)}
                    className="h-10 px-5 bg-gray-900 hover:bg-[#66B2B2] text-white font-bold text-xs rounded-xl transition-all"
                  >
                    Close Details
                  </Button>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

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
              client={liveClients.find((c) => c.id === showReport.clientId)}
              photos={servicePhotos.filter((p) => p.serviceRecordId === showReport.id)}
              viewerRole="admin"
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
                UNIT: {equipment.find((e) => e.serialNumber === qrSerial)?.name}
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

// ---------------------------------------------------------------------------
// Pre-Service Confirmation Modal
// ---------------------------------------------------------------------------
function PreServiceConfirmModal({
  task,
  seedEquipment,
  onReady,
  onCancel,
}: {
  task: ServiceRecord | null;
  seedEquipment: any[];
  onReady: (travelStartTime: string, techAddress: string, eqAddress: string) => void;
  onCancel: () => void;
}) {
  const [userLocation, setUserLocation] = useState<string>("Fetching your location…");
  const [isAnimating, setIsAnimating] = useState(false);
  const travelStartRef = useRef<string>("");

  // Reset & fetch geolocation whenever a new task opens
  useEffect(() => {
    if (!task) {
      setUserLocation("Fetching your location…");
      setIsAnimating(false);
      return;
    }
    if (!navigator.geolocation) {
      setUserLocation("Location unavailable");
      return;
    }
    setUserLocation("Fetching your location…");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
            { headers: { "Accept-Language": "en" } }
          );
          const data = await res.json();
          setUserLocation(data.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        } catch {
          setUserLocation(`${lat.toFixed(5)}°N, ${lng.toFixed(5)}°E`);
        }
      },
      () => setUserLocation("Location unavailable"),
      { timeout: 10_000, enableHighAccuracy: false }
    );
  }, [task?.id]);

  // Derive equipment address from seed data (lat/lng coords)
  let equipmentAddress = "Not specified";
  if (task) {
    let meta: any = {};
    try { meta = JSON.parse(task.description ?? "{}"); } catch { }
    if (meta._src === "pms") {
      const seedEq = seedEquipment.find((s: any) => s.id === meta._seedEqId);
      if (seedEq?.lat != null && seedEq?.lng != null) {
        equipmentAddress = `${Number(seedEq.lat).toFixed(5)}°N, ${Number(seedEq.lng).toFixed(5)}°E`;
      }
    }
  }

  const handleConfirm = () => {
    travelStartRef.current = new Date().toISOString();
    setIsAnimating(true);
    setTimeout(() => {
      onReady(travelStartRef.current, userLocation, equipmentAddress);
    }, 2600);
  };

  return (
    <>
      <Dialog open={!!task} onOpenChange={(open) => { if (!open && !isAnimating) onCancel(); }}>
        <DialogContent className="max-w-md bg-white border-gray-200 rounded-2xl shadow-2xl p-0 overflow-hidden">
          {isAnimating ? (
            /* ── Car Animation Screen ── */
            <div className="p-6 space-y-4 text-center">
              <div className="rounded-2xl overflow-hidden">
                <video
                  src="/05f1ab3a-2610-4b4c-ae2e-45cbcb01e443.mp4"
                  autoPlay
                  muted
                  playsInline
                  className="w-full block"
                />
              </div>
              <div>
                <p className="text-base font-bold text-gray-800 mb-1">On your way! 🎯</p>
                <p className="text-xs text-gray-500">Travel started — opening service checklist…</p>
              </div>
            </div>
          ) : (
            /* ── Confirmation Screen ── */
            <>
              <DialogHeader className="p-6 border-b border-gray-50 bg-gradient-to-br from-[#66B2B2]/5 to-transparent rounded-t-2xl">
                <DialogTitle className="flex items-center gap-2.5 text-gray-900 text-base font-bold">
                  <div className="w-9 h-9 rounded-xl bg-[#66B2B2]/10 flex items-center justify-center">
                    <Navigation className="w-4.5 h-4.5 text-[#66B2B2]" />
                  </div>
                  Pre-Service Confirmation
                </DialogTitle>
                <DialogDescription className="text-xs text-gray-500 mt-1">
                  Confirm your readiness before starting the service execution.
                </DialogDescription>
              </DialogHeader>

              <div className="p-6 space-y-4">
                {/* Location row */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3 h-3 text-blue-500 shrink-0" />
                      <p className="text-[9px] font-black uppercase tracking-widest text-blue-600">Your Location</p>
                    </div>
                    <p className="text-[11px] text-blue-900 font-medium leading-snug break-words">{userLocation}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3 h-3 text-amber-500 shrink-0" />
                      <p className="text-[9px] font-black uppercase tracking-widest text-amber-600">Equipment Site</p>
                    </div>
                    <p className="text-[11px] text-amber-900 font-medium leading-snug break-words">{equipmentAddress}</p>
                  </div>
                </div>

                {/* Prompt */}
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 text-center">
                  <p className="text-sm font-bold text-gray-800 leading-relaxed">
                    Are you ready to travel to the equipment location and begin the service?
                  </p>
                </div>

                {/* Action buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    onClick={onCancel}
                    className="h-11 border-gray-200 text-gray-600 font-bold text-xs hover:bg-gray-50 rounded-xl"
                  >
                    <X className="w-3.5 h-3.5 mr-1.5" />
                    No, Cancel
                  </Button>
                  <Button
                    onClick={handleConfirm}
                    className="h-11 bg-[#66B2B2] text-white hover:bg-[#5A9E9E] font-bold text-xs shadow-lg shadow-[#66B2B2]/20 rounded-xl"
                  >
                    <Car className="w-3.5 h-3.5 mr-1.5" />
                    Yes, Ready to Go
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// ---------------------------------------------------------------------------
// Execution Modal
// ---------------------------------------------------------------------------
function ExecutionModal({
  task,
  seedEquipment,
  seedClients,
  onClose,
  onFinish,
  resetOnCompletion = false,
  onMetricsReset,
}: {
  task: ServiceRecord | null;
  seedEquipment: any[];
  seedClients: any[];
  onClose: () => void;
  onFinish: () => void;
  resetOnCompletion?: boolean;
  onMetricsReset?: (seedEqId: string, unit: string) => void;
}) {
  const {
    equipment,
    draftExecutions,
    updateDraftExecution,
    clearDraftExecution,
    updateServiceRecord,
    addServicePhoto,
    queuePendingSubmission,
  } = useOperationsStore();
  const { user: execUser } = useAuthStore();
  const { logPartUsage, items: inventoryItems } = useInventoryStore();
  const { packages } = useBillingStore();
  // const { clients } = useCRMStore();
  const completeSeedServiceRecordMutation = trpc.seedServiceRecords.complete.useMutation();
  const deductStockMutation = trpc.inventory.deductStock.useMutation();
  const logUsageMutation = trpc.inventory.logUsage.useMutation();
  const trpcUtils = trpc.useUtils();

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
          () => { }
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
      } catch (err) { }
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  const handleScanSuccess = async (decodedText: string) => {
    const currentEq = equipment.find(e => e.id === (draft?.equipmentId || task?.equipmentId));
    // Use the seed serial for PMS tasks; fall back to store serial for sim/manual tasks
    let _scanMeta: any = {};
    try { _scanMeta = JSON.parse(task?.description ?? "{}"); } catch { }
    const _scanSeedEq = _scanMeta._seedEqId
      ? seedEquipment.find((s: any) => s.id === _scanMeta._seedEqId) ?? null
      : null;
    const expectedSerial = _scanSeedEq?.serialNumber ?? currentEq?.serialNumber ?? "";
    if (decodedText.trim() === expectedSerial) {
      await stopScanning();
      setIsVerified(true);
      toast.success("Asset Verified Successfully!");
      // Capture arrival time when QR scan succeeds
      if (task) {
        updateDraftExecution(task.id, { arrivalTime: new Date().toISOString() });
      }
      // Auto-advance after a brief delay to show success state
      setTimeout(() => {
        if (currentEq) handleNext({ equipmentId: currentEq.id });
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

    const completionTime = new Date().toISOString();
    const completedDate = completionTime;
    const effectiveEquipId = draft.equipmentId || task.equipmentId;
    const storeEq = equipment.find(e => e.id === effectiveEquipId);

    // Log Part Usage and Deduct Stock
    if (draft.selectedParts && draft.selectedParts.length > 0) {
      draft.selectedParts.forEach(part => {
        logPartUsage({
          serviceRecordId: task.id,
          inventoryItemId: part.inventoryItemId,
          quantityUsed: part.quantity
        });
        const seedPartId = inventoryItems.find(i => i.id === part.inventoryItemId)?.partNumber ?? String(part.inventoryItemId);
        deductStockMutation.mutate(
          { partId: seedPartId, quantityUsed: part.quantity },
          { onError: (err) => console.error("inventory.deductStock failed", err) }
        );
        logUsageMutation.mutate({
          inventoryItemId: part.inventoryItemId,
          serviceRecordId: task.id,
          quantityUsed: part.quantity,
          unitPriceAtTime: part.pricePerUnit,
          createdAt: new Date().toISOString(),
        }, { onError: (err) => console.error("inventory.logUsage failed", err) });
      });
    }

    updateServiceRecord(task.id, {
      status: "completed",
      technician: execUser?.name || "Technician",
      findings: draft.findings,
      workDone: draft.workDone,
      recommendation: draft.recommendations,
      partsUsed: draft.selectedParts?.map(p => `${p.name} (x${p.quantity})`).join(", ") || "None",
      cost: draft.cost ?? task.cost ?? 0,
      hoursAtService: (draft.hoursAtService ?? parseFloat(String(storeEq?.hoursTotal))) || 0,
      techSignature: draft.techSignature,
      clientSignature: draft.clientSignature,
      clientRepresentativeName: draft.clientRepresentativeName ?? "",
      safetyChecklist: draft.safetyChecklist,
      completedDate,
      equipmentId: effectiveEquipId,
    });

    if (draft.beforePhoto) {
      addServicePhoto({ serviceRecordId: task.id, type: "before", url: draft.beforePhoto, caption: "Before Service" });
    }
    if (draft.afterPhoto) {
      addServicePhoto({ serviceRecordId: task.id, type: "after", url: draft.afterPhoto, caption: "After Service" });
    }

    // Persist completed service record to seed-data.json (all tasks, not just PMS)
    try {
      let meta: any = {};
      try { meta = JSON.parse(task.description ?? "{}"); } catch { }
      const seedEq = meta._seedEqId
        ? seedEquipment.find((s: any) => s.id === meta._seedEqId) ?? null
        : null;
      const pmsCfg = seedEq?.pmsConfiguration?.[meta._pmsIdx] ?? null;
      const seedClient = seedEq?.clientId
        ? seedClients.find((c: any) => c.id === seedEq.clientId) ?? null
        : null;

      // Prefer values snapshotted at task-creation time (embedded in description) over the
      // current static import. This ensures that if the PMS config was edited after the
      // task was triggered (e.g. 200 h → 2000 h), the completed record still shows the
      // interval that was actually in effect when the equipment went Overdue.
      const snapshotInterval: number | undefined =
        meta._serviceInterval !== undefined ? Number(meta._serviceInterval) : pmsCfg?.serviceInterval;
      const snapshotIntervalUnit: string | undefined =
        meta._serviceIntervalUnit ?? pmsCfg?.serviceIntervalUnit;
      const snapshotServiceType: string | undefined =
        meta._serviceType ?? pmsCfg?.serviceType;

      let metricAtService = "";
      if (pmsCfg || (snapshotIntervalUnit !== undefined)) {
        const unit: string = snapshotIntervalUnit ?? "Hours";
        let gps001Ms = 0;
        try { gps001Ms = Number(window.localStorage.getItem("nextos-gps001-total-hours-ms") ?? "0") || 0; } catch { }
        metricAtService = getPmsMetricValue(seedEq, unit, gps001Ms);
      }

      // Decide whether the server should atomically reset this equipment's metrics.
      // • Non-EQ-001 seed equipment: ALWAYS reset (hours/km only, not days).
      //   These are static-JSON values, so the server must zero them so status = OK.
      // • EQ-001 (Excavator CAT 320): only if the "Reset Hours on Completion" toggle is ON.
      //   Its live hours come from GPS (localStorage), not seed-data.json; the server
      //   resets the seed field so applyComputedServiceStatuses writes status = OK to disk.
      const isEq001Task = meta._seedEqId === "EQ-001";
      // Use snapshotted unit so a config change doesn't affect the reset decision either.
      const pmsUnit = (snapshotIntervalUnit ?? "").toLowerCase();
      const isHoursOrKmTask = pmsUnit === "hours" || pmsUnit === "km" || pmsUnit === "weeks" || pmsUnit === "months" || pmsUnit === "years";
      const hasPmsConfig = !!pmsCfg
        || (snapshotInterval !== undefined && snapshotIntervalUnit !== undefined)
        || (meta._resetOnComplete === true && snapshotIntervalUnit !== undefined);
      const shouldResetMetrics =
        (meta._src === "pms" || meta._resetOnComplete === true) &&
        !!meta._seedEqId &&
        hasPmsConfig &&
        isHoursOrKmTask &&
        (!isEq001Task || resetOnCompletion); // non-EQ-001: always; EQ-001: only if toggle ON

      // Compute equipment status fresh from live metrics so the service report
      // reflects the true state at submission time, not a potentially stale cached value.
      let computedEquipmentStatus: string | null = seedEq?.status ?? null;
      if (seedEq && snapshotInterval && snapshotIntervalUnit) {
        const _unit = snapshotIntervalUnit.toLowerCase();
        let _usage: number | null = null;
        if (_unit === "hours") {
          if (seedEq?.id === "EQ-001") {
            // EQ-001 hours live in GPS localStorage, not seedEq.hoursTotal.
            // Apply the same offset used everywhere else so the snapshot reflects
            // hours-since-last-service, not raw GPS lifetime hours.
            let _rawMs = 0;
            let _offsetMs = 0;
            try { _rawMs = Number(window.localStorage.getItem("nextos-gps001-total-hours-ms") ?? "0") || 0; } catch { }
            try { _offsetMs = Number(window.localStorage.getItem(GPS001_HOURS_OFFSET_KEY) ?? "0") || 0; } catch { }
            const _effectiveMs = Math.max(0, _rawMs - _offsetMs);
            _usage = _effectiveMs / (1000 * 60 * 60);
          } else {
            const _m = String(seedEq.hoursTotal ?? "").match(/(\d+)\s*h\s*(\d+)\s*m/i);
            if (_m) _usage = Number(_m[1]) + Number(_m[2]) / 60;
          }
        } else if (_unit === "km") {
          const _raw = seedEq.kmTotal;
          const _p = typeof _raw === "number" ? _raw : parseFloat(String(_raw ?? "").replace(/[^\d.]/g, ""));
          if (Number.isFinite(_p) && _p >= 0) _usage = _p;
        } else {
          const _days = typeof seedEq.days === "number" ? seedEq.days : parseFloat(String(seedEq.days ?? ""));
          if (Number.isFinite(_days) && _days >= 0) {
            if (_unit === "weeks") _usage = _days / 7;
            else if (_unit === "months") _usage = _days / 30.44;
            else if (_unit === "years") _usage = _days / 365.25;
          }
        }
        if (_usage !== null && Number.isFinite(_usage) && _usage >= 0) {
          const _pct = (_usage / snapshotInterval) * 100;
          computedEquipmentStatus = computePmsStatus(_pct, seedData.pmsStatuses) ?? "OK";
        }
      }

      // Build the full payload object before calling mutate so we can
      // save it verbatim to the retry queue if the write fails.
      const submissionPayload = {
        id: task.id,
        completedDate,
        technician: execUser?.name || "Technician",
        // Core record fields (for upsert)
        seedEquipmentId: meta._seedEqId ?? "",
        pmsConfigIndex: meta._pmsIdx ?? 0,
        equipmentId: effectiveEquipId,
        clientId: task.clientId,
        serviceCategory: task.serviceCategory,
        scheduledDate: task.scheduledDate ?? completedDate,
        description: task.description ?? "",
        // Service work
        findings: draft.findings ?? "",
        workDone: draft.workDone ?? "",
        recommendation: draft.recommendations ?? "",
        partsUsed: draft.selectedParts?.map((p) => `${p.name} (x${p.quantity})`).join(", ") || "",
        selectedParts: draft.selectedParts ?? [],
        partsUsedDetails: (draft.selectedParts ?? []).map(p => ({ name: p.name, quantity: p.quantity, pricePerUnit: p.pricePerUnit })),
        cost: draft.cost ?? pmsCfg?.estimatedCost ?? task.cost ?? 0,
        hoursAtService: (draft.hoursAtService ?? parseFloat(String(storeEq?.hoursTotal))) || 0,
        // Rich completion fields
        equipmentName: seedEq?.name ?? storeEq?.name ?? "",
        clientName: seedClient?.companyName ?? seedClients?.find(c => String(c.id) === String(task.clientId))?.companyName ?? "",
        equipmentType: seedEq?.equipmentType ?? "",
        serialNumber: seedEq?.serialNumber ?? storeEq?.serialNumber ?? "",
        serviceType: snapshotServiceType ?? task.serviceCategory,
        serviceInterval: snapshotInterval,
        serviceIntervalUnit: snapshotIntervalUnit,
        metricAtService,
        safetyChecklist: draft.safetyChecklist,
        beforePhoto: draft.beforePhoto,
        beforeNotes: draft.beforeNotes,
        afterPhoto: draft.afterPhoto,
        afterNotes: draft.afterNotes,
        techSignature: draft.techSignature,
        clientSignature: draft.clientSignature,
        clientRepresentativeName: draft.clientRepresentativeName ?? "",
        startTime: draft.travelStartTime ?? null,
        endTime: completionTime,
        duration: null,
        finalCost: draft.cost ?? null,
        travelStartTime: draft.travelStartTime ?? null,
        arrivalTime: draft.arrivalTime ?? null,
        completionTime,
        technicianAddress: draft.technicianAddress ?? null,
        equipmentSiteAddress: draft.equipmentSiteAddress ?? null,
        equipmentStatusAtService: computedEquipmentStatus,
        // Tell the server to atomically zero out this equipment's metrics in the same
        // file write (avoids the race condition of a separate chained mutation).
        resetMetricsOnComplete: shouldResetMetrics,
      } as any;

      completeSeedServiceRecordMutation.mutate(submissionPayload, {
        onSuccess: () => {
          trpcUtils.seedServiceRecords.list.invalidate();
          setTimeout(() => {
            trpcUtils.seedEquipment.list.invalidate();
          }, 400);
          if (shouldResetMetrics) {
            onMetricsReset?.(meta._seedEqId as string, snapshotIntervalUnit ?? "Hours");
          }
        },
        onError: () => {
          queuePendingSubmission({
            id: task.id,
            queuedAt: new Date().toISOString(),
            payload: submissionPayload,
          });
          toast.error("Couldn't write report to records — will retry automatically.");
        },
      });
    } catch { /* silently skip — in-memory update already done */ }

    clearDraftExecution(task.id);
    toast.success("Final report sealed and submitted!");
    setTimeout(() => onFinish(), 80);
  };

  // Cleanup scanner on unmount or close
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        try { const s = scannerRef.current.stop(); if (s && typeof (s as any).catch === "function") (s as any).catch(() => { }); } catch { }
        try { const c = (scannerRef.current.clear as any)(); if (c && typeof c.catch === "function") c.catch(() => { }); } catch { }
      }
    };
  }, []);

  const currentEq = equipment.find(e => e.id === (draft?.equipmentId || task?.equipmentId));

  // Resolve display values from seed data for any task with a _seedEqId (PMS or manual).
  let _pmsMeta: any = {};
  try { _pmsMeta = JSON.parse(task?.description ?? "{}"); } catch { }
  const _isPmsTask = _pmsMeta._src === "pms";
  const _pmsSeedEq = _pmsMeta._seedEqId
    ? seedEquipment.find((s: any) => s.id === _pmsMeta._seedEqId) ?? null
    : (currentEq?.serialNumber
      ? seedEquipment.find((s: any) => s.serialNumber === currentEq.serialNumber) ?? null
      : null);

  // Serial number used for QR verification and display
  const displaySerial = _pmsSeedEq?.serialNumber ?? currentEq?.serialNumber ?? "";
  // Equipment name shown in the header and Step 1 card
  const displayName = _pmsSeedEq?.name ?? currentEq?.name ?? `SIM-UNIT-${task?.id}`;
  const displaySubtitle = _pmsSeedEq?.equipmentType ?? (currentEq ? `${currentEq.equipmentType} - ${currentEq.serialNumber}` : "");
  const displayClient = _pmsSeedEq?.clientId
    ? (seedClients.find((c: any) => c.id === _pmsSeedEq.clientId)?.companyName ?? null)
    : null;
  const _pmsCfg = _pmsSeedEq?.pmsConfiguration?.[_pmsMeta._pmsIdx] ?? null;
  const _taskPriority: string | null = _pmsMeta._priority ?? null;
  const _taskMetricUnit: string | null = _pmsMeta._serviceIntervalUnit ?? null;
  const _taskServiceType: string | null = _pmsMeta._serviceType ?? null;
  const _eqPmsStatus: string | null = _pmsSeedEq?.status ?? null;
  // Operating time: GPS cache for EQ-001, seed hoursTotal otherwise
  const displayOperatingTime = (() => {
    if (_pmsSeedEq?.id === "EQ-001") {
      try {
        const ms = Number(window.localStorage.getItem("nextos-gps001-total-hours-ms") ?? "0") || 0;
        const offsetMs = Number(window.localStorage.getItem(GPS001_HOURS_OFFSET_KEY) ?? "0") || 0;
        const effectiveMs = Math.max(0, ms - offsetMs);
        if (ms > 0) {
          const totalMin = Math.floor(effectiveMs / (1000 * 60));
          return `${Math.floor(totalMin / 60)}h ${totalMin % 60}m`;
        }
      } catch { /* fall through */ }
    }
    return _pmsSeedEq?.hoursTotal ?? `${currentEq?.hoursTotal ?? 0}`;
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
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold z-10 transition-all ${currentStep === step ? 'bg-[#66B2B2] text-white ring-4 ring-[#66B2B2]/10 scale-110' :
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
                              className="w-full h-14 bg-[#66B2B2] hover:bg-[#5A9E9E] text-white font-black rounded-xl shadow-xl transition-all active:scale-[0.98] text-sm uppercase tracking-widest"
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
                  client={seedClients?.find((c: any) => String(c.id) === String(task.clientId))}
                  packages={packages}
                  seedEquipment={_pmsSeedEq}
                  seedClients={seedClients}
                  pmsConfig={_pmsCfg}
                  taskPriority={_taskPriority}
                  taskMetricUnit={_taskMetricUnit}
                  taskServiceType={_taskServiceType}
                  eqPmsStatus={_isPmsTask ? _eqPmsStatus : null}
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
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">
                      Client Representative Name
                    </label>
                    <input
                      type="text"
                      placeholder="Name of person signing on behalf of client"
                      value={draft.clientRepresentativeName ?? ""}
                      onChange={(e) => updateDraftExecution(task.id, { clientRepresentativeName: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm focus:border-[#66B2B2] focus:ring-2 focus:ring-[#66B2B2]/10 outline-none"
                    />
                  </div>
                  <SignaturePad
                    label="Client Acceptance"
                    value={draft.clientSignature}
                    onChange={(sig) => updateDraftExecution(task.id, { clientSignature: sig })}
                    caption="Client representative acknowledgment of work completion."
                  />
                  <div className="flex gap-3">
                    <Button variant="outline" className="flex-1 h-12 rounded-xl font-bold" onClick={handleBack}>Previous</Button>
                    <Button
                      className="flex-[2] h-12 bg-gray-900 text-white font-bold rounded-xl shadow-xl hover:bg-black"
                      onClick={submitFinalReport}
                    >
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
            className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${localChecklist[item.id]
                ? 'bg-green-50 border-green-500 shadow-sm'
                : 'bg-white border-gray-100 hover:border-gray-200'
              }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${localChecklist[item.id] ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'
              }`}>
              <item.icon className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className={`text-sm font-bold ${localChecklist[item.id] ? 'text-green-700' : 'text-gray-900'}`}>{item.label}</div>
              <div className="text-[10px] text-gray-400 font-medium uppercase tracking-tighter">{item.desc}</div>
            </div>
            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${localChecklist[item.id] ? 'bg-green-500 border-green-500' : 'bg-white border-gray-200'
              }`}>
              {localChecklist[item.id] && <Check className="w-4 h-4 text-white" />}
            </div>
          </button>
        ))}
      </div>

      <div className="flex gap-3 pt-2">
        <Button variant="ghost" className="flex-1 h-12 rounded-xl text-gray-400 font-bold" onClick={onBack}>Previous</Button>
        <Button
          className={`flex-[2] h-12 font-bold rounded-xl transition-all ${allChecked
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
        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Condition Notes</label>
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

function TechnicalWorkForm({ draft, equipment, client, packages, seedEquipment, seedClients, pmsConfig, taskPriority, taskMetricUnit, taskServiceType, eqPmsStatus, onSave, onBack }: { draft: DraftExecution, equipment?: Equipment, client?: Client, packages: any[], seedEquipment?: any, seedClients?: any[], pmsConfig?: any, taskPriority?: string | null, taskMetricUnit?: string | null, taskServiceType?: string | null, eqPmsStatus?: string | null, onSave: (d: Partial<DraftExecution>) => void, onBack: () => void }) {
  void packages;
  const { items: inventoryItems } = useInventoryStore();
  const [fields, setFields] = useState({
    findings: draft.findings || "",
    workDone: draft.workDone || "",
    selectedParts: draft.selectedParts || [],
    recommendations: draft.recommendations || "",
    hoursAtService: draft.hoursAtService || parseFloat(String(equipment?.hoursTotal)) || 0,
    cost: draft.cost ?? 0,
  });
  const [selectedPartId, setSelectedPartId] = useState<number | "">("");
  const [partQty, setPartQty] = useState<string>("1");
  const partsTotal = (fields.selectedParts ?? []).reduce(
    (sum, p) => sum + p.quantity * p.pricePerUnit,
    0
  );

  // Current metric value for the service context card
  const currentMetric = useMemo(() => {
    if (!seedEquipment) return null;
    const unit: string | null = pmsConfig?.serviceIntervalUnit ?? taskMetricUnit ?? null;
    if (!unit) return null;
    let gps001CacheMs = 0;
    try { gps001CacheMs = Number(window.localStorage.getItem("nextos-gps001-total-hours-ms") ?? "0") || 0; } catch { }
    return getPmsMetricValue(seedEquipment, unit, gps001CacheMs);
  }, [seedEquipment, pmsConfig, taskMetricUnit]);

  // PMS interval display; for manual metric-tracking tasks just show the unit name
  const intervalDisplay = useMemo(() => {
    if (pmsConfig) {
      const n = pmsConfig.serviceInterval;
      const u: string = (pmsConfig.serviceIntervalUnit ?? "").toLowerCase();
      const suffix = u === "hours" ? "h" : u === "km" ? "km" : u === "weeks" ? "w" : u === "days" ? "d" : u === "months" ? "mo" : u;
      return `${n}${suffix}`;
    }
    return taskMetricUnit ?? null;
  }, [pmsConfig, taskMetricUnit]);

  // Client name: prefer seed client lookup, fall back to CRM client
  const clientName = useMemo(() => {
    if (seedEquipment?.clientId) {
      const sc = (seedClients ?? []).find((c: any) => c.id === seedEquipment.clientId);
      if (sc?.companyName) return sc.companyName;
    }
    return client?.companyName ?? "—";
  }, [seedEquipment, seedClients, client]);

  const eqName = seedEquipment?.name ?? equipment?.name ?? "—";
  const rawEqType = seedEquipment?.equipmentType ?? equipment?.equipmentType ?? "—";
  const eqType = String(rawEqType).split(" - ")[0].trim();

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="grid grid-cols-1 gap-4">
        <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
          <div className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-2">Equipment Unit</div>
          <div className="text-xs text-gray-500 mt-1"><span className="font-semibold text-gray-600">Equipment Name:</span> {eqName}</div>
          <div className="text-xs text-gray-500 mt-1"><span className="font-semibold text-gray-600">Equipment Type:</span> {eqType}</div>
          <div className="text-xs text-gray-500 mt-0.5"><span className="font-semibold text-gray-600">Client:</span> {clientName}</div>
          <div className="text-xs text-gray-500 mt-0.5">
            <span className="font-semibold text-gray-600">Status:</span>{" "}
            {eqPmsStatus ? (
              <span className={`font-bold ${eqPmsStatus === "Overdue" ? "text-red-500"
                  : eqPmsStatus === "Due" ? "text-amber-500"
                    : eqPmsStatus === "Due Soon" ? "text-[#66B2B2]"
                      : "text-green-600"
                }`}>{eqPmsStatus}</span>
            ) : (
              <span className="text-gray-400">—</span>
            )}
          </div>
        </div>
        <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
          <div className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-2">Service Context</div>
          <div className="space-y-1">
            {(pmsConfig?.serviceType || taskServiceType) && (
              <div className="text-xs text-gray-500">
                <span className="font-semibold text-gray-600">Service Type:</span>{" "}
                {pmsConfig?.serviceType ?? taskServiceType ?? "—"}
              </div>
            )}
            <div className="text-xs text-gray-500">
              <span className="font-semibold text-gray-600">Scheduled Maintenance:</span>{" "}
              {intervalDisplay ?? "—"}
            </div>
            <div className="text-xs text-gray-500">
              <span className="font-semibold text-gray-600">Metric at Service:</span>{" "}
              {currentMetric ?? "—"}
            </div>
            {taskPriority && (
              <div className="text-xs text-gray-500 flex items-center gap-1.5">
                <span className="font-semibold text-gray-600">Priority:</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase ${taskPriority === "high" ? "bg-red-100 text-red-700"
                    : taskPriority === "medium" ? "bg-amber-100 text-amber-700"
                      : "bg-gray-100 text-gray-500"
                  }`}>{taskPriority}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Initial Findings / Faults</label>
          <textarea
            className="w-full p-4 rounded-xl border border-gray-200 text-sm focus:border-[#66B2B2] focus:ring-2 focus:ring-[#66B2B2]/10 outline-none resize-none"
            rows={2}
            value={fields.findings}
            onChange={(e) => setFields({ ...fields, findings: e.target.value })}
            placeholder="Detail any damage or leaks..."
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Technical Work Performed</label>
          <textarea
            className="w-full p-4 rounded-xl border border-gray-200 text-sm focus:border-[#66B2B2] focus:ring-2 focus:ring-[#66B2B2]/10 outline-none resize-none"
            rows={2}
            value={fields.workDone}
            onChange={(e) => setFields({ ...fields, workDone: e.target.value })}
            placeholder="Describe services completed..."
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Strategic Recommendations</label>
          <Input
            className="h-10 rounded-xl text-xs"
            placeholder="e.g. Belt change in 500h"
            value={fields.recommendations}
            onChange={(e) => setFields({ ...fields, recommendations: e.target.value })}
          />
        </div>

        <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-3">
          <div className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Parts Used</div>
          {/* Part selector row */}
          <div className="flex gap-2 items-end">
            <div className="flex-1 space-y-1">
              <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Part</label>
              <Select
                value={selectedPartId === "" ? "" : String(selectedPartId)}
                onValueChange={(v) => setSelectedPartId(Number(v))}
              >
                <SelectTrigger className="h-9 bg-white border-gray-200 text-xs">
                  <SelectValue placeholder="Select part…" />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  {inventoryItems.map((item) => (
                    <SelectItem key={item.id} value={String(item.id)} className="text-xs">
                      {item.name}
                      <span className="text-gray-400 ml-1">— ₱{item.pricePerUnit}/{item.unit}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-24 space-y-1">
              <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                Qty {selectedPartId !== "" ? `(${inventoryItems.find(i => i.id === selectedPartId)?.unit ?? ""})` : ""}
              </label>
              <Input
                type="number"
                min="1"
                step="1"
                className="h-9 bg-white border-gray-200 text-xs text-center"
                value={partQty}
                onChange={(e) => setPartQty(e.target.value)}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              className="h-9 px-3 border-gray-200 text-[#66B2B2] hover:bg-[#66B2B2]/10 text-xs font-bold shrink-0"
              disabled={selectedPartId === "" || !partQty || Number(partQty) <= 0}
              onClick={() => {
                const item = inventoryItems.find(i => i.id === selectedPartId);
                if (!item) return;
                const qty = Math.max(1, Math.floor(Number(partQty)));
                const already = fields.selectedParts ?? [];
                const existing = already.find(p => p.inventoryItemId === item.id);
                const updated = existing
                  ? already.map(p => p.inventoryItemId === item.id ? { ...p, quantity: p.quantity + qty } : p)
                  : [...already, { inventoryItemId: item.id, name: item.name, quantity: qty, pricePerUnit: item.pricePerUnit }];
                setFields({ ...fields, selectedParts: updated });
                setSelectedPartId("");
                setPartQty("1");
              }}
            >
              + Add
            </Button>
          </div>
          {/* Selected parts list */}
          {(fields.selectedParts ?? []).length > 0 && (
            <div className="space-y-1.5 mt-1">
              {(fields.selectedParts ?? []).map((part) => (
                <div key={part.inventoryItemId} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-gray-100">
                  <div className="text-xs font-semibold text-gray-700 flex-1 min-w-0 truncate">{part.name}</div>
                  <div className="text-[10px] text-gray-400 mx-3 shrink-0">
                    {part.quantity} × ₱{part.pricePerUnit.toLocaleString("en-PH")}
                  </div>
                  <div className="text-xs font-bold text-[#66B2B2] shrink-0 mr-2">
                    ₱{(part.quantity * part.pricePerUnit).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                  </div>
                  <button
                    type="button"
                    className="text-gray-300 hover:text-[#EF4444] transition-colors shrink-0"
                    onClick={() => setFields({ ...fields, selectedParts: (fields.selectedParts ?? []).filter(p => p.inventoryItemId !== part.inventoryItemId) })}
                  >
                    ✕
                  </button>
                </div>
              ))}
              <div className="flex justify-between items-center pt-1 border-t border-gray-200 mt-1">
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Total</span>
                <span className="text-sm font-black text-gray-900 font-mono-tech">
                  ₱{partsTotal.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <Button variant="ghost" className="flex-1 h-12 rounded-xl text-gray-400 font-bold" onClick={onBack}>Previous</Button>
        <Button
          className="flex-[2] h-12 bg-[#66B2B2] text-white font-bold rounded-xl hover:bg-[#5A9E9E]"
          onClick={() => onSave({ ...fields, cost: partsTotal })}
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

export function EquipmentDetail({
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
          <h3 className="text-2xl font-bold text-gray-900 tracking-tight">{equipment.name}</h3>
          <p className="text-sm text-gray-500 font-medium">{equipment.equipmentType} <span className="text-gray-300 mx-1">|</span> {equipment.serialNumber}</p>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mb-1">Total Operating Time</div>
          <div className="text-3xl font-bold text-gray-900 font-mono-tech">{parseFloat(String(equipment.hoursTotal)) || 0}<span className="text-sm ml-1 text-gray-400">H</span></div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 border-y border-gray-50 py-5">
        <div className="space-y-1">
          <div className="text-[9px] text-gray-400 uppercase font-black tracking-widest">Serial Number</div>
          <div className="text-xs font-mono-tech font-bold text-gray-900">{equipment.serialNumber}</div>
        </div>
        <div className="space-y-1">
          <div className="text-[9px] text-gray-400 uppercase font-black tracking-widest">Global Positioning</div>
          <div className="text-xs font-bold text-gray-900">{(equipment.lat !== undefined && equipment.lng !== undefined) ? `${equipment.lat}, ${equipment.lng}` : "Not specified"}</div>
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
                    <div className="text-sm font-bold text-gray-900 group-hover:text-[#66B2B2] transition-colors">{(record as any).serviceType || record.serviceCategory}</div>
                    <div className="text-[10px] text-gray-400 font-medium uppercase mt-0.5">{record.completedDate ? new Date(record.completedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'} <span className="mx-1">•</span> Tech: {record.technician}</div>
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
