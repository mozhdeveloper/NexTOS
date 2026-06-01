import { useState, useCallback, useEffect, useRef, useMemo, Fragment } from "react";
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
  Camera,
  Wrench,
  FileText,
  Printer,
  X,
  CheckCircle2,
  AlertTriangle,
  Package,
  ChevronDown,
  Plus,
  Pencil,
  Play,
  Check,
  History,
  ChevronRight,
  Trash2,
  MapPin,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { ServiceReportsTab } from "@/components/services/ServiceReportsTab";
import { TasksTab } from "@/components/services/TasksTab";
import { ManualLogTab } from "@/components/services/ManualLogTab";
import { EquipmentTab } from "@/components/services/EquipmentTab";
import { ScheduledMaintenanceTab } from "@/components/services/ScheduledMaintenanceTab";
import { ServiceReportModal } from "@/components/services/ServiceReportModal";
import { QrScannerModal } from "@/components/services/QrScannerModal";
import { QrTagModal } from "@/components/services/QrTagModal";
import { PreServiceConfirmModal } from "@/components/services/PreServiceConfirmModal";
import { ExecutionModal } from "@/components/services/ExecutionModal";
import { SignaturePad } from "@/components/services/SignaturePad";
import { getPmsMetricValue } from "@/components/services/utils";
import { ServicesHeader } from "@/components/services/ServicesHeader";
import { useGps001Cache } from "@/hooks/useGps001Cache";
import { useMetricsOverrides } from "@/hooks/useMetricsOverrides";

import type { ScheduledMaintenanceEntry, TabType } from "@/components/services/types";

const SCHEDULED_MAINTENANCE_KEY = "nextos-user-scheduled-maintenance";
const RESET_ON_COMPLETION_KEY = "nextos-reset-on-completion";
const GPS001_HOURS_OFFSET_KEY = "nextos-gps001-hours-offset-ms";
const METRICS_OVERRIDES_KEY = "nextos-metrics-overrides-v1";
const PM_INTERVAL_UNITS = seedData.serviceIntervalUnits;
const _toastedPmsMessages = new Set<string>();

const serviceTypeOptions = seedData.serviceTypes;



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
  const { clients } = useCRMStore();
  const {
    equipment,
    serviceRecords,
    servicePhotos,
    draftExecutions,
    pendingSubmissions,
    addServiceRecord,
    updateServiceRecord,
    addServicePhoto,
    updateDraftExecution,
    clearDraftExecution,
    queuePendingSubmission,
    removePendingSubmission,
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


  const [qrSerial, setQrSerial] = useState("");
  const [showQR, setShowQR] = useState(false);

  const [showScanner, setShowScanner] = useState(false);
  const [highlightedEquipment, setHighlightedEquipment] = useState<number | null>(null);
  const equipmentRefs = useRef<Map<number, HTMLTableRowElement>>(new Map());

  // Modal State
  const [executionTask, setExecutionTask] = useState<ServiceRecord | null>(null);
  const [confirmTask, setConfirmTask] = useState<ServiceRecord | null>(null);
  const [showReport, setShowReport] = useState<(ServiceRecord & Record<string, any>) | null>(null);
  // Form state (for Manual Log)
  const [formClientId, setFormClientId] = useState("");
  const [formEquipmentId, setFormEquipmentId] = useState("");
  const [formType, setFormType] = useState<string>("Heavy Equipment PMS");
  const [formTechnician, setFormTechnician] = useState(user?.name || "");
  const [formDescription, setFormDescription] = useState("");
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

  const {
    gps001CacheMs,
    gps001KmTotal,
    gps001WorkingDays,
    gps001HoursOffsetMs,
    setGps001HoursOffsetMs,
    resetOnCompletion,
    toggleResetOnCompletion,
  } = useGps001Cache();

  const { metricsOverrides, handleMetricsReset } = useMetricsOverrides({
    gps001CacheMs,
    setGps001HoursOffsetMs,
    seedEquipmentQueryData,
  });

  const location = useLocation();

  useEffect(() => {
    const state = location.state as { selectedUnitId?: number };
    if (state?.selectedUnitId) {
      setSelectedEquipment(state.selectedUnitId);
      setActiveTab("equipment");
      window.history.replaceState({}, document.title);
    }
  }, [location]);

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
      toast.success(`Found asset: ${seedEq.name || seedEq.id}`);
    } else {
      toast.error(`Equipment not found with serial: ${serialToFind}`);
    }
  };

  const activeTasks = serviceRecords.filter(r => r.status === "scheduled" || r.status === "in_progress");

  const filteredSeedEquipment = liveEquipment.filter((s) =>
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
      const raw = effectiveEq.kmTotal;
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
    const match = seedData.pmsStatuses.find(s => progress >= s.minProgressPercent);
    return (match?.value ?? "—") as ScheduledMaintenanceEntry["status"];
  };

  const computeNextService = (
    pms: { serviceInterval: number; serviceIntervalUnit: string },
    eq: any
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
      const raw = effectiveEq.kmTotal;
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
  // seedEquipmentQueryData in deps so the memo recomputes whenever live equipment refreshes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gps001CacheMs, gps001HoursOffsetMs, metricsOverrides, seedEquipmentQueryData]);

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
        return true; // Keep scheduled / in-progress non-PMS records (manual tasks, bookings)
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
            { ...record, equipmentId: record.seedEquipmentId ?? String(record.equipmentId), invoiceId: null, createdAt: new Date().toISOString(), serviceCategory: record.serviceCategory as any },
          ],
        };
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
    if (!toRetry || retryCompleteMutation.isPending) return;

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

  // Tracks which PMS task IDs have already triggered a toast this session.
  // Prevents repeat notifications when allScheduledMaintenance re-references due to GPS cache ticks.

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
    const overdueEntries = allScheduledMaintenance.filter((e) => e.status === "Overdue");

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

      const storeEq = equipment.find((e) => e.id === seedEqId) ?? equipment[0];
      if (!storeEq) continue;

      const clientId = Number(String(seedEq.clientId).replace(/\D/g, "")) || 1;
      const serviceCategory = mapPmsServiceCategory(entry.serviceType, seedEq.equipmentType);

      const description = JSON.stringify({
        _src: "pms",
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
            hoursAtService: Math.floor(parseFloat((storeEq.hoursTotal ?? "0").match(/(\d+)/)?.[1] ?? "0")) || 0,
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
          hoursAtService: Math.floor(parseFloat((storeEq.hoursTotal ?? "0").match(/(\d+)/)?.[1] ?? "0")) || 0,
        });
      }

      const toastKey = `${entry.equipmentName}|||${entry.serviceType}|||${entry.serviceIntervalUnit}`;
      if (!_toastedPmsMessages.has(toastKey)) {
        _toastedPmsMessages.add(toastKey);
        toast.info("PMS Task Auto-Created", {
          id: `pms-overdue-${taskId}`,
          description: `${entry.equipmentName} — ${entry.serviceType} (${entry.serviceIntervalUnit}) is overdue.`,
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
      seedEq
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

  const handleManualLogSubmit = () => {
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
    const targetEq = equipment.find(e => e.id === parseInt(formEquipmentId));

    addServiceRecord({
      id: recordId,
      equipmentId: parseInt(formEquipmentId),
      clientId: parseInt(formClientId),
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
      hoursAtService: Math.floor(parseFloat((targetEq?.hoursTotal ?? "0").match(/(\d+)/)?.[1] ?? "0")) || 0,
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
       const seedEq = liveEquipment.find((s: any) => s.serialNumber === targetEq?.serialNumber);
       const seedClient = liveClients.find((c: any) => c.id === parseInt(formClientId));

       upsertSeedServiceRecord.mutate({
          id: recordId,
          seedEquipmentId: seedEq?.id || "",
          equipmentId: parseInt(formEquipmentId),
          clientId: parseInt(formClientId),
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
          hoursAtService: Math.floor(parseFloat((targetEq?.hoursTotal ?? "0").match(/(\d+)/)?.[1] ?? "0")) || 0,
          equipmentName: seedEq?.name || targetEq?.name || targetEq?.id || "",
          clientName: seedClient?.companyName || "",
          equipmentType: seedEq?.equipmentType || "",
          serialNumber: targetEq?.serialNumber || "",
          serviceType: formType,
          beforePhoto: formBeforePhoto,
          afterPhoto: formAfterPhoto,
          techSignature: formTechSign,
          clientSignature: formClientSign,
          completionTime: completedDate,
       } as any);
    } catch (e) {}

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
  };

  return (
    <div className="space-y-4">
      <ServicesHeader
        activeTab={activeTab}
        onTabChange={setActiveTab}
        taskCount={activeTasks.length}
        resetOnCompletion={resetOnCompletion}
        onToggleReset={toggleResetOnCompletion}
      />

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {/* Tasks Tab */}
        {activeTab === "tasks" && (
          <TasksTab
            activeTasks={activeTasks}
            equipment={equipment}
            clients={clients}
            draftExecutions={draftExecutions}
            liveEquipment={liveEquipment}
            liveClients={liveClients}
            gps001CacheMs={gps001CacheMs}
            gps001HoursOffsetMs={gps001HoursOffsetMs}
            onStartTask={setConfirmTask}
            onContinueTask={setExecutionTask}
          />
        )}

        {/* Equipment Tab */}
        {activeTab === "equipment" && (
          <EquipmentTab
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            filteredSeedEquipment={filteredSeedEquipment}
            liveClients={liveClients}
            equipment={equipment}
            selectedSeedId={selectedSeedId}
            setSelectedSeedId={setSelectedSeedId}
            setSelectedEquipment={setSelectedEquipment}
            highlightedEquipment={highlightedEquipment}
            equipmentRefs={equipmentRefs}
            gps001KmTotal={gps001KmTotal}
            gps001WorkingDays={gps001WorkingDays}
            seedServiceRecordsData={seedServiceRecordsData}
            startScanning={() => setShowScanner(true)}
            setQrSerial={setQrSerial}
            setShowQR={setShowQR}
            onShowReport={setShowReport}
            formatGps001Hours={formatGps001Hours}
            computeEquipmentWorstStatus={computeEquipmentWorstStatus}
          />
        )}

        {/* Scheduled Maintenance Tab */}
        {activeTab === "scheduled-maintenance" && (
          <ScheduledMaintenanceTab
            allScheduledMaintenance={allScheduledMaintenance}
            liveEquipment={liveEquipment}
            computeNextService={computeNextService}
            scheduleModalOpen={scheduleModalOpen}
            setScheduleModalOpen={setScheduleModalOpen}
            resetScheduleModal={resetScheduleModal}
            scheduleMissingFields={scheduleMissingFields}
            setScheduleMissingFields={setScheduleMissingFields}
            scheduleEquipmentId={scheduleEquipmentId}
            setScheduleEquipmentId={setScheduleEquipmentId}
            scheduleServiceType={scheduleServiceType}
            setScheduleServiceType={setScheduleServiceType}
            scheduleInterval={scheduleInterval}
            setScheduleInterval={setScheduleInterval}
            scheduleIntervalUnit={scheduleIntervalUnit}
            setScheduleIntervalUnit={setScheduleIntervalUnit}
            scheduleEstimatedCost={scheduleEstimatedCost}
            setScheduleEstimatedCost={setScheduleEstimatedCost}
            handleScheduleSubmit={handleScheduleSubmit}
            addPmsPending={addPmsConfigurationMutation.isPending}
            editModalOpen={editModalOpen}
            setEditModalOpen={setEditModalOpen}
            resetEditModal={resetEditModal}
            editMissingFields={editMissingFields}
            setEditMissingFields={setEditMissingFields}
            editEquipmentId={editEquipmentId}
            setEditEquipmentId={setEditEquipmentId}
            editServiceType={editServiceType}
            setEditServiceType={setEditServiceType}
            editInterval={editInterval}
            setEditInterval={setEditInterval}
            editIntervalUnit={editIntervalUnit}
            setEditIntervalUnit={setEditIntervalUnit}
            editEstimatedCost={editEstimatedCost}
            setEditEstimatedCost={setEditEstimatedCost}
            editingEntry={editingEntry}
            handleEditSubmit={handleEditSubmit}
            updatePmsPending={updatePmsConfigurationMutation.isPending}
            openEditModal={openEditModal}
            handleDeleteEntry={handleDeleteEntry}
            deletePmsPending={deletePmsConfigurationMutation.isPending}
          />
        )}

        {/* Service Reports Tab */}
        {activeTab === "reports" && (
          <ServiceReportsTab
            seedServiceRecordsData={seedServiceRecordsData}
            equipment={equipment}
            clients={clients}
            liveEquipment={liveEquipment}
            liveClients={liveClients}
            onShowReport={setShowReport}
          />
        )}

        {/* Manual Log Tab */}
        {activeTab === "new" && (
          <ManualLogTab
            clients={clients}
            equipment={equipment}
            formClientId={formClientId}
            setFormClientId={setFormClientId}
            formEquipmentId={formEquipmentId}
            setFormEquipmentId={setFormEquipmentId}
            formType={formType}
            setFormType={setFormType}
            formTechnician={formTechnician}
            setFormTechnician={setFormTechnician}
            formFindings={formFindings}
            setFormFindings={setFormFindings}
            formWorkDone={formWorkDone}
            setFormWorkDone={setFormWorkDone}
            formRecommendation={formRecommendation}
            setFormRecommendation={setFormRecommendation}
            formBeforePhoto={formBeforePhoto}
            setFormBeforePhoto={setFormBeforePhoto}
            formAfterPhoto={formAfterPhoto}
            setFormAfterPhoto={setFormAfterPhoto}
            formTechSign={formTechSign}
            setFormTechSign={setFormTechSign}
            formClientSign={formClientSign}
            setFormClientSign={setFormClientSign}
            onSubmit={handleManualLogSubmit}
          />
        )}
      </div>

      {/* PRE-SERVICE CONFIRMATION MODAL */}
      <PreServiceConfirmModal
        task={confirmTask}
        seedEquipment={liveEquipment}
        onReady={(travelStartTime, techAddress, eqAddress, estimatedArrival) => {
          if (confirmTask) {
            updateDraftExecution(confirmTask.id, {
              travelStartTime,
              technicianAddress: techAddress || undefined,
              equipmentSiteAddress: eqAddress || undefined,
              estimatedArrival: estimatedArrival || undefined,
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

      {/* Service Report View Modal */}
      <ServiceReportModal
        showReport={showReport}
        onClose={() => setShowReport(null)}
        equipment={equipment}
        clients={clients}
        servicePhotos={servicePhotos}
      />

      {/* QR Scanner Modal */}
      <QrScannerModal
        open={showScanner}
        onClose={() => setShowScanner(false)}
        onScanSuccess={findAndHighlightEquipment}
      />

      {/* QR Tag Modal */}
      <QrTagModal
        open={showQR}
        onOpenChange={setShowQR}
        qrSerial={qrSerial}
        unitName={equipment.find((e) => e.serialNumber === qrSerial)?.name ?? equipment.find((e) => e.serialNumber === qrSerial)?.id ?? ""}
      />

    </div>
  );
}


// ---------------------------------------------------------------------------
// Execution Modal