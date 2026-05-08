import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import { useFleetStore } from "@/stores/useFleetStore";
import { useOperationsStore } from "@/stores/useOperationsStore";
import { useCRMStore } from "@/stores/useCRMStore";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  fetchAllTimeWorkingMs,
  fetchDailyHistorySummary,
  type GPS51DailyHistorySummary,
} from "@/services/gps51";
import { AddEquipmentModal, type Equipment as ModalEquipment } from "@/components/AddEquipmentModal";
import { PMSConfigurationModal, type PMSConfiguration } from "@/components/PMSConfigurationModal";
import { Button } from "@/components/ui/button";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Radio,
  AlertTriangle,
  ChevronRight,
  Wifi,
  WifiOff,
  Plus,
  Settings,
} from "lucide-react";

// Fix Leaflet default markers
const defaultIcon = L.icon({
  iconUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='25' height='41' viewBox='0 0 25 41'%3E%3Cpath fill='%23F2A900' stroke='%23050505' stroke-width='2' d='M12.5 0C5.6 0 0 5.6 0 12.5c0 9.4 12.5 28.5 12.5 28.5S25 21.9 25 12.5C25 5.6 19.4 0 12.5 0z'/%3E%3Ccircle fill='%23050505' cx='12.5' cy='12.5' r='5'/%3E%3C/svg%3E",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const onlineIcon = L.icon({
  iconUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='25' height='41' viewBox='0 0 25 41'%3E%3Cpath fill='%2310B981' stroke='%23050505' stroke-width='2' d='M12.5 0C5.6 0 0 5.6 0 12.5c0 9.4 12.5 28.5 12.5 28.5S25 21.9 25 12.5C25 5.6 19.4 0 12.5 0z'/%3E%3Ccircle fill='%23050505' cx='12.5' cy='12.5' r='5'/%3E%3C/svg%3E",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const idleIcon = L.icon({
  iconUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='25' height='41' viewBox='0 0 25 41'%3E%3Cpath fill='%233B82F6' stroke='%23050505' stroke-width='2' d='M12.5 0C5.6 0 0 5.6 0 12.5c0 9.4 12.5 28.5 12.5 28.5S25 21.9 25 12.5C25 5.6 19.4 0 12.5 0z'/%3E%3Ccircle fill='%23050505' cx='12.5' cy='12.5' r='5'/%3E%3C/svg%3E",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const offlineIcon = L.icon({
  iconUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='25' height='41' viewBox='0 0 25 41'%3E%3Cpath fill='%23EF4444' stroke='%23050505' stroke-width='2' d='M12.5 0C5.6 0 0 5.6 0 12.5c0 9.4 12.5 28.5 12.5 28.5S25 21.9 25 12.5C25 5.6 19.4 0 12.5 0z'/%3E%3Ccircle fill='%23050505' cx='12.5' cy='12.5' r='5'/%3E%3C/svg%3E",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

function MapCenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    // Recenter on live updates without overriding user-selected zoom level.
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

function formatHoursMinutes(telemetry: { hours: number; stateStartTime?: number }): string {
  const rawHours = telemetry.stateStartTime
    ? (Date.now() - telemetry.stateStartTime) / (1000 * 60 * 60)
    : (telemetry.hours ?? 0);
  const totalMinutes = Math.max(0, Math.floor(rawHours * 60));
  const wholeHours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${wholeHours}h ${minutes}m`;
}

type FleetViewMode = "gps" | "history";
type UnitDisplayStatus = "driving" | "idle" | "parking" | "offline";

interface HistoryRow {
  name: string;
  mileage: string;
  maxSpeed: string;
  avgSpeed: string;
  driving: string;
  parkingDuration: string;
  working: string;
  idle: string;
  startAddress: string;
  startTime: string;
  endAddress: string;
  endTime: string;
}

const GPS51_USERNAME = import.meta.env.VITE_GPS51_USERNAME ?? "";
const GPS51_PASSWORD = import.meta.env.VITE_GPS51_PASSWORD ?? "";
const FLEET_HISTORY_DEBUG = true;
const GPS001_TOTAL_HOURS_CACHE_KEY = "nextos-gps001-total-hours-ms";

function readCachedGps001TotalHoursMs(): number {
  if (typeof window === "undefined") return 0;
  const rawValue = window.localStorage.getItem(GPS001_TOTAL_HOURS_CACHE_KEY);
  const parsed = Number(rawValue ?? "0");
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function writeCachedGps001TotalHoursMs(totalMs: number): void {
  if (typeof window === "undefined") return;
  if (!Number.isFinite(totalMs) || totalMs <= 0) return;
  window.localStorage.setItem(GPS001_TOTAL_HOURS_CACHE_KEY, String(totalMs));
}

function logFleetHistory(label: string, payload: unknown): void {
  if (!FLEET_HISTORY_DEBUG) return;
  console.log(`[FleetHistory] ${label}:`, payload);
}

function formatDayValue(value: number): string {
  return `${value}`.padStart(2, "0");
}

function toYmd(date: Date): string {
  const year = date.getFullYear();
  const month = formatDayValue(date.getMonth() + 1);
  const day = formatDayValue(date.getDate());
  return `${year}-${month}-${day}`;
}

function isSameDate(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatDateTime(value: number): string {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(totalMinutes: number): string {
  const safeMinutes = Math.max(0, Math.floor(totalMinutes));
  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;
  return `${hours}h ${minutes}m`;
}

function formatDurationFromMs(totalMs: number): string {
  return formatDuration(totalMs / (1000 * 60));
}

function formatHoursFromMsForSidebar(totalMs: number): string {
  if (!Number.isFinite(totalMs) || totalMs <= 0) {
    return "0";
  }
  return formatDurationFromMs(totalMs);
}

function toDisplayStatus(status: string): UnitDisplayStatus {
  if (status === "driving" || status === "idle" || status === "parking" || status === "offline") {
    return status;
  }
  if (status === "online") {
    return "driving";
  }
  return "offline";
}

function statusTextClass(status: UnitDisplayStatus): string {
  switch (status) {
    case "driving":
      return "text-[#10B981]";
    case "idle":
      return "text-[#3B82F6]";
    case "parking":
      return "text-[#F2A900]";
    default:
      return "text-[#EF4444]";
  }
}

function statusDotClass(status: UnitDisplayStatus): string {
  switch (status) {
    case "driving":
      return "bg-[#10B981]";
    case "idle":
      return "bg-[#3B82F6]";
    case "parking":
      return "bg-[#F2A900]";
    default:
      return "bg-[#EF4444]";
  }
}

function buildHistoryRowFromSummary(name: string, summary: GPS51DailyHistorySummary): HistoryRow {
  const metersToKm = (value: number) => value / 1000;
  const normalizeSpeedToKph = (value: number) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 0;
    return Math.abs(numeric) > 1000 ? numeric / 1000 : numeric;
  };
  const parkingDuration =
    (summary.parkingText ?? "").trim() || formatDurationFromMs(summary.parkingMs);

  return {
    name,
    mileage: `${metersToKm(summary.mileageMeters).toFixed(2)} km`,
    maxSpeed: `${Math.round(normalizeSpeedToKph(summary.maxSpeedMps))} km/h`,
    avgSpeed: `${Math.round(normalizeSpeedToKph(summary.avgSpeedMps))} km/h`,
    driving: summary.drivingMs > 0 ? formatDurationFromMs(summary.drivingMs) : "-",
    parkingDuration,
    working: formatDurationFromMs(summary.workingMs),
    idle: formatDurationFromMs(summary.idleMs),
    startAddress: (summary.startAddress ?? "").trim() ||
      (summary.startLat !== undefined && summary.startLng !== undefined
        ? `${summary.startLat.toFixed(4)}, ${summary.startLng.toFixed(4)}`
        : "No address data"),
    startTime: Number.isFinite(Number(summary.startTime)) ? formatDateTime(Number(summary.startTime)) : "-",
    endAddress: (summary.endAddress ?? "").trim() ||
      (summary.endLat !== undefined && summary.endLng !== undefined
        ? `${summary.endLat.toFixed(4)}, ${summary.endLng.toFixed(4)}`
        : "No address data"),
    endTime: Number.isFinite(Number(summary.endTime)) ? formatDateTime(Number(summary.endTime)) : "-",
  };
}

function buildMockHistoryRow(name: string, date: Date, unitSeed: number): HistoryRow {
  const base = date.getDate() + date.getMonth() * 7 + unitSeed * 11;
  const mileage = 25 + (base % 80);
  const maxSpeed = 35 + (base % 28);
  const avgSpeed = 18 + (base % 16);
  const drivingMinutes = 90 + (base % 230);
  const workingMinutes = drivingMinutes + 20 + (base % 80);
  const idleMinutes = 40 + (base % 120);
  const dateText = toYmd(date);

  return {
    name,
    mileage: `${mileage.toFixed(1)} mi`,
    maxSpeed: `${maxSpeed} mph`,
    avgSpeed: `${avgSpeed} mph`,
    driving: formatDuration(drivingMinutes),
    parkingDuration: formatDuration(idleMinutes),
    working: formatDuration(workingMinutes),
    idle: formatDuration(idleMinutes),
    startAddress: `Depot A, ${dateText}`,
    startTime: `${dateText} 08:15`,
    endAddress: `Client Site ${1 + (base % 5)}, ${dateText}`,
    endTime: `${dateText} 17:40`,
  };
}

export default function Fleet() {
  useAuthStore();
  const { units, selectedUnitId, selectUnit, startLiveTracking, stopLiveTracking } = useFleetStore();
  const { equipment } = useOperationsStore();
  const { clients } = useCRMStore();
  const [mapCenter, setMapCenter] = useState<[number, number]>([41.4036, 2.1741]);
  const [viewMode, setViewMode] = useState<FleetViewMode>("gps");
  const [historyMonth, setHistoryMonth] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedHistoryDate, setSelectedHistoryDate] = useState<Date>(() => new Date());
  const [historyRows, setHistoryRows] = useState<HistoryRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyDateStatus, setHistoryDateStatus] = useState<"parking" | "offline" | null>(null);
  const [gps001HoursTodayMs, setGps001HoursTodayMs] = useState(0);
  const [gps001HoursTotalMs, setGps001HoursTotalMs] = useState(() => readCachedGps001TotalHoursMs());
  
  // Modal states
  const [addEquipmentOpen, setAddEquipmentOpen] = useState(false);
  const [pmsConfigOpen, setPmsConfigOpen] = useState(false);
  
  // Equipment added through modal (in-memory)
  const [addedEquipment, setAddedEquipment] = useState<ModalEquipment[]>([]);
  
  // PMS Configurations (in-memory)
  const [pmsConfigurations, setPmsConfigurations] = useState<PMSConfiguration[]>([]);

  const selectedUnit = units.find((u) => u.id === selectedUnitId);
  const selectedEquipment = equipment.find((e) => e.id === selectedUnit?.equipmentId);
  const selectedUnitLabel = selectedEquipment?.unitId || selectedUnit?.unitName || "Unit";
  const isGps51UnitSelected = selectedUnit?.id === 1 || selectedUnitLabel.toUpperCase() === "GPS-001";
  const isGps001Unit = (unit: { id: number; unitName?: string }) =>
    unit.id === 1 || (unit.unitName ?? "").toUpperCase() === "GPS-001";
  const selectedHistoryDay = toYmd(selectedHistoryDate);
  // In history view, GPS-001 status reflects whether the selected date had activity
  const getEffectiveStatus = (unitId: number, rawStatus: string): UnitDisplayStatus => {
    const unit = units.find((u) => u.id === unitId);
    if (unit && isGps001Unit(unit) && historyDateStatus !== null) {
      return historyDateStatus;
    }
    return toDisplayStatus(rawStatus);
  };
  const drivingCount = units.filter((u) => getEffectiveStatus(u.id, u.telemetry.status) === "driving").length;
  const idleCount = units.filter((u) => getEffectiveStatus(u.id, u.telemetry.status) === "idle").length;
  const parkingCount = units.filter((u) => getEffectiveStatus(u.id, u.telemetry.status) === "parking").length;
  const offlineCount = units.filter((u) => getEffectiveStatus(u.id, u.telemetry.status) === "offline").length;
  const gps001Unit = units.find((u) => u.id === 1);
  const gps001LiveStatus = gps001Unit ? toDisplayStatus(gps001Unit.telemetry.status) : "offline";
  const workingCount = gps001LiveStatus === "driving" || gps001LiveStatus === "idle" ? 1 : 0;
  const today = new Date();
  const isDateToday = isSameDate(selectedHistoryDate, today);
  const hideGps001Pin = !isDateToday && historyDateStatus === "offline" && historyRows.length === 0;
  const sidebarDateWithPrefix = isDateToday
    ? `Today: ${today.toLocaleDateString(undefined, {
        month: "long",
        day: "numeric",
        year: "numeric",
      })}`
    : `Past Date: ${selectedHistoryDate.toLocaleDateString(undefined, {
        month: "long",
        day: "numeric",
        year: "numeric",
      })}`;
  const isCurrentMonthView =
    historyMonth.getFullYear() === today.getFullYear() && historyMonth.getMonth() === today.getMonth();

  const firstDayOfMonth = new Date(historyMonth.getFullYear(), historyMonth.getMonth(), 1);
  const daysInMonth = new Date(historyMonth.getFullYear(), historyMonth.getMonth() + 1, 0).getDate();
  const leadingBlankDays = firstDayOfMonth.getDay();
  const calendarCells: Array<Date | null> = [
    ...Array.from({ length: leadingBlankDays }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => new Date(historyMonth.getFullYear(), historyMonth.getMonth(), index + 1)),
  ];

  useEffect(() => {
    startLiveTracking();
    return () => stopLiveTracking();
  }, []);

  useEffect(() => {
    if (selectedUnit && typeof selectedUnit.telemetry.lat === "number" && typeof selectedUnit.telemetry.lng === "number") {
      setMapCenter([selectedUnit.telemetry.lat, selectedUnit.telemetry.lng]);
    }
  }, [selectedUnit]);

  useEffect(() => {
    let ignore = false;
    let refreshInterval: ReturnType<typeof setInterval> | null = null;

    const loadGps001HoursToday = async () => {
      if (!GPS51_USERNAME || !GPS51_PASSWORD) {
        if (!ignore) setGps001HoursTodayMs(0);
        return;
      }
      try {
        const summary = await fetchDailyHistorySummary(GPS51_USERNAME, GPS51_PASSWORD, selectedHistoryDay);
        if (!ignore) {
          setGps001HoursTodayMs(summary ? summary.workingMs : 0);
        }
      } catch {
        if (!ignore) {
          setGps001HoursTodayMs(0);
        }
      }
    };

    void loadGps001HoursToday();

    const isTodaySelection = selectedHistoryDay === toYmd(new Date());
    if (isTodaySelection) {
      refreshInterval = setInterval(() => {
        void loadGps001HoursToday();
      }, 30000);
    }

    return () => {
      ignore = true;
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [selectedHistoryDay]);

  useEffect(() => {
    let ignore = false;
    let refreshInterval: ReturnType<typeof setInterval> | null = null;

    const loadGps001HoursTotal = async () => {
      if (!GPS51_USERNAME || !GPS51_PASSWORD) {
        return;
      }
      try {
        const totalMs = await fetchAllTimeWorkingMs(
          GPS51_USERNAME,
          GPS51_PASSWORD,
          "2000-01-01",
          toYmd(new Date())
        );
        if (!ignore && Number.isFinite(totalMs) && totalMs > 0) {
          setGps001HoursTotalMs(totalMs);
          writeCachedGps001TotalHoursMs(totalMs);
        }
      } catch {
        // Keep the last known-good total; transient API failures should not reset the sidebar to 0.
      }
    };

    void loadGps001HoursTotal();

    refreshInterval = setInterval(() => {
      void loadGps001HoursTotal();
    }, 120000);

    return () => {
      ignore = true;
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, []);

  useEffect(() => {
    if (viewMode !== "history" || !selectedUnitId) return;

    let ignore = false;
    let refreshInterval: ReturnType<typeof setInterval> | null = null;

    const loadHistory = async () => {
      setHistoryLoading(true);
      setHistoryError(null);
      try {
        if (isGps51UnitSelected) {
          if (!GPS51_USERNAME || !GPS51_PASSWORD) {
            throw new Error("GPS51 credentials are missing");
          }
          const summary = await fetchDailyHistorySummary(GPS51_USERNAME, GPS51_PASSWORD, selectedHistoryDay);
          if (!ignore) {
            if (summary) {
              const isTodaySelection = selectedHistoryDay === toYmd(new Date());
              if (isTodaySelection) {
                if (
                  typeof selectedUnit?.telemetry.lat === "number" &&
                  typeof selectedUnit?.telemetry.lng === "number"
                ) {
                  setMapCenter([selectedUnit.telemetry.lat, selectedUnit.telemetry.lng]);
                }
              } else {
                const historyLat = summary.endLat ?? summary.startLat;
                const historyLng = summary.endLng ?? summary.startLng;
                if (typeof historyLat === "number" && typeof historyLng === "number") {
                  setMapCenter([historyLat, historyLng]);
                }
              }
              setHistoryDateStatus("parking");
              setHistoryRows([buildHistoryRowFromSummary(selectedUnitLabel, summary)]);
            } else {
              logFleetHistory("gps001.history.no-activity", {
                selectedHistoryDay,
                reason: "fetchDailyHistorySummary returned null",
              });
              setHistoryDateStatus("offline");
              setHistoryRows([]);
            }
          }
          return;
        }

        if (!ignore) {
          setHistoryRows([buildMockHistoryRow(selectedUnitLabel, selectedHistoryDate, selectedUnitId)]);
        }
      } catch (error: any) {
        if (!ignore) {
          setHistoryRows([]);
          setHistoryError(error?.message ?? "Failed to load history data");
        }
      } finally {
        if (!ignore) {
          setHistoryLoading(false);
        }
      }
    };

    loadHistory();

    const isTodaySelection = selectedHistoryDay === toYmd(new Date());
    if (isGps51UnitSelected && isTodaySelection) {
      refreshInterval = setInterval(() => {
        void loadHistory();
      }, 30000);
    }

    return () => {
      ignore = true;
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [viewMode, selectedUnitId, selectedHistoryDay, isGps51UnitSelected, selectedUnitLabel, selectedHistoryDate]);

  const statusIcon = (displayStatus: UnitDisplayStatus) => {
    switch (displayStatus) {
      case "driving":
        return onlineIcon;
      case "idle":
        return idleIcon;
      case "parking":
        return defaultIcon;
      default:
        return offlineIcon;
    }
  };

  // Handlers for equipment modal
  const handleAddEquipment = (equipment: ModalEquipment) => {
    setAddedEquipment([...addedEquipment, equipment]);
  };

  // Handlers for PMS configuration modal
  const handleAddPMSConfiguration = (config: PMSConfiguration) => {
    setPmsConfigurations([...pmsConfigurations, config]);
  };

  const handleUpdatePMSConfiguration = (id: string, config: PMSConfiguration) => {
    setPmsConfigurations(
      pmsConfigurations.map((c) => (c.id === id ? config : c))
    );
  };

  const handleDeletePMSConfiguration = (id: string) => {
    setPmsConfigurations(pmsConfigurations.filter((c) => c.id !== id));
  };

  return (
    <div className="space-y-4 h-[calc(100vh-40px)]">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-[32px] font-bold text-[#EAEAEA] tracking-[-0.02em]">Fleet Intelligence</h1>
          <p className="text-sm text-[#88888C] mt-0.5">Real-time GPS tracking and telemetry</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-[#10B981]/10 border border-[#10B981]/20">
            <Wifi className="w-3 h-3 text-[#10B981]" />
            <span className="text-xs text-[#10B981] font-medium">
              {drivingCount} driving
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-[#3B82F6]/10 border border-[#3B82F6]/20">
            <Radio className="w-3 h-3 text-[#3B82F6]" />
            <span className="text-xs text-[#3B82F6] font-medium">
              {idleCount} idle
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-[#F2A900]/10 border border-[#F2A900]/20">
            <WifiOff className="w-3 h-3 text-[#F2A900]" />
            <span className="text-xs text-[#F2A900] font-medium">
              {parkingCount} parking
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-[#EF4444]/10 border border-[#EF4444]/20">
            <WifiOff className="w-3 h-3 text-[#EF4444]" />
            <span className="text-xs text-[#EF4444] font-medium">
              {offlineCount} offline
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-[#14B8A6]/10 border border-[#14B8A6]/20">
            <Radio className="w-3 h-3 text-[#14B8A6]" />
            <span className="text-xs text-[#14B8A6] font-medium">
              {workingCount} working
            </span>
          </div>
        </div>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Map */}
        <div className="flex-1 data-card overflow-hidden relative">
          <div className="absolute top-3 left-3 z-[1000] flex items-center rounded border border-white/10 bg-[#050505]/70 p-1 backdrop-blur">
            <button
              type="button"
              onClick={() => setViewMode("gps")}
              className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
                viewMode === "gps"
                  ? "bg-[#F2A900] text-[#050505]"
                  : "text-[#EAEAEA] hover:bg-white/10"
              }`}
            >
              GPS
            </button>
            <button
              type="button"
              onClick={() => setViewMode("history")}
              className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
                viewMode === "history"
                  ? "bg-[#F2A900] text-[#050505]"
                  : "text-[#EAEAEA] hover:bg-white/10"
              }`}
            >
              History
            </button>
          </div>

          {viewMode === "gps" ? (
            <>
              <MapContainer
                center={mapCenter}
                zoom={13}
                style={{ height: "100%", width: "100%", background: "#1A1A20" }}
                zoomControl={false}
              >
                <TileLayer
                  attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />
                <MapCenter center={mapCenter} />
                {units.filter((unit) => {
                  const hasCoordinates = typeof unit.telemetry.lat === "number" && typeof unit.telemetry.lng === "number";
                  if (!hasCoordinates) return false;
                  if (isGps001Unit(unit) && hideGps001Pin) return false;
                  return true;
                }).map((unit) => (
                  <Marker
                    key={unit.id}
                    position={[unit.telemetry.lat, unit.telemetry.lng]}
                    icon={statusIcon(getEffectiveStatus(unit.id, unit.telemetry.status))}
                    eventHandlers={{
                      click: () => selectUnit(unit.id),
                    }}
                  >
                    <Popup className="dark-popup">
                      <div className="bg-[#121214] p-2 min-w-[180px]">
                        <div className="text-xs font-bold text-[#EAEAEA] mb-1">{unit.unitName}</div>
                        <div className="text-[10px] text-[#88888C] space-y-0.5">
                          <div>Status: <span className={statusTextClass(getEffectiveStatus(unit.id, unit.telemetry.status))}>{getEffectiveStatus(unit.id, unit.telemetry.status)}</span></div>
                          <div>Speed: {unit.telemetry.speed} mph</div>
                          <div>Hours: {formatHoursMinutes(unit.telemetry)}</div>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                ))}
                {/* Pulse effect for selected unit */}
                {selectedUnit &&
                  typeof selectedUnit.telemetry.lat === "number" &&
                  typeof selectedUnit.telemetry.lng === "number" &&
                  !(isGps001Unit(selectedUnit) && hideGps001Pin) && (
                  <Circle
                    center={[selectedUnit.telemetry.lat, selectedUnit.telemetry.lng]}
                    radius={500}
                    pathOptions={{
                      color: "#F2A900",
                      fillColor: "#F2A900",
                      fillOpacity: 0.1,
                      weight: 1,
                    }}
                  />
                )}
              </MapContainer>

              {/* Telemetry overlay */}
              {selectedUnit && (
                <div className="absolute bottom-4 left-4 void-glass rounded p-3 min-w-[200px]">
                  <div className="flex items-center gap-2 mb-2">
                    <Radio className={`w-3.5 h-3.5 ${statusTextClass(getEffectiveStatus(selectedUnit.id, selectedUnit.telemetry.status))}`} />
                    <span className="text-xs font-semibold text-[#EAEAEA]">{selectedUnit.unitName}</span>
                  </div>
                  <div className="space-y-1 font-mono-tech text-[10px]">
                    <div className="flex justify-between">
                      <span className="text-[#88888C]">Coordinates</span>
                      <span className="text-[#EAEAEA]">
                        {(selectedUnit.telemetry.lat ?? 0).toFixed(4)}, {(selectedUnit.telemetry.lng ?? 0).toFixed(4)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#88888C]">Speed</span>
                      <span className="text-[#EAEAEA]">{selectedUnit.telemetry.speed} mph</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#88888C]">Heading</span>
                      <span className="text-[#EAEAEA]">{Math.floor(selectedUnit.telemetry.heading ?? 0)}°</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#88888C]">Engine Hours</span>
                      <span className="text-[#F2A900]">{formatHoursMinutes(selectedUnit.telemetry)}</span>
                    </div>
                    {selectedUnit.serviceDue && (
                      <div className="flex items-center gap-1 mt-1 pt-1 border-t border-white/5">
                        <AlertTriangle className="w-3 h-3 text-[#EF4444]" />
                        <span className="text-[#EF4444]">Service Due</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="h-full overflow-auto p-4 pt-16 bg-[#121214]">
              <div className="rounded border border-white/10 bg-[#1A1A20] p-3 mb-3">
                <div className="flex items-center justify-between mb-3">
                  <button
                    type="button"
                    onClick={() => {
                      const prevMonth = new Date(historyMonth.getFullYear(), historyMonth.getMonth() - 1, 1);
                      setHistoryMonth(prevMonth);
                      setSelectedHistoryDate(prevMonth);
                    }}
                    className="px-3 py-1.5 text-xs font-medium rounded border border-white/10 text-[#EAEAEA] hover:bg-white/10"
                  >
                    Last Month
                  </button>
                  <div className="text-sm font-semibold text-[#F2A900]">
                    {historyMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const nextMonth = new Date(historyMonth.getFullYear(), historyMonth.getMonth() + 1, 1);
                      setHistoryMonth(nextMonth);
                      setSelectedHistoryDate(nextMonth);
                    }}
                    className="px-3 py-1.5 text-xs font-medium rounded border border-white/10 text-[#EAEAEA] hover:bg-white/10"
                  >
                    Next Month
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-[#88888C] mb-1">
                  {[
                    "Sun",
                    "Mon",
                    "Tue",
                    "Wed",
                    "Thu",
                    "Fri",
                    "Sat",
                  ].map((day) => (
                    <div key={day} className="py-1">{day}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {calendarCells.map((dateValue, index) => {
                    if (!dateValue) {
                      return <div key={`empty-${index}`} className="h-8" />;
                    }

                    const isSelected = isSameDate(dateValue, selectedHistoryDate);
                    const isToday = isCurrentMonthView && isSameDate(dateValue, today);

                    return (
                      <button
                        key={toYmd(dateValue)}
                        type="button"
                        onClick={() => setSelectedHistoryDate(dateValue)}
                        className={`h-8 rounded text-xs border transition-colors ${
                          isSelected
                            ? "bg-[#F2A900] border-[#F2A900] text-[#050505] font-semibold"
                            : isToday
                            ? "border-[#10B981] text-[#10B981]"
                            : "border-white/10 text-[#EAEAEA] hover:bg-white/10"
                        }`}
                      >
                        {dateValue.getDate()}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded border border-white/10 bg-[#1A1A20] overflow-auto">
                <table className="min-w-full text-[11px]">
                  <thead className="bg-[#050505]/70 text-[#F2A900]">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold">Name</th>
                      <th className="px-3 py-2 text-left font-semibold">Mileage</th>
                      <th className="px-3 py-2 text-left font-semibold">Max Speed</th>
                      <th className="px-3 py-2 text-left font-semibold">Avg Speed</th>
                      <th className="px-3 py-2 text-left font-semibold">Driving</th>
                      <th className="px-3 py-2 text-left font-semibold">Parking Duration</th>
                      <th className="px-3 py-2 text-left font-semibold">Working</th>
                      <th className="px-3 py-2 text-left font-semibold">Idle</th>
                      <th className="px-3 py-2 text-left font-semibold">Start Address (Time)</th>
                      <th className="px-3 py-2 text-left font-semibold">End Address (Time)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyLoading && (
                      <tr>
                        <td colSpan={10} className="px-3 py-6 text-center text-[#88888C]">
                          Loading history data...
                        </td>
                      </tr>
                    )}
                    {!historyLoading && historyError && (
                      <tr>
                        <td colSpan={10} className="px-3 py-6 text-center text-[#EF4444]">
                          {historyError}
                        </td>
                      </tr>
                    )}
                    {!historyLoading && !historyError && historyRows.map((row, index) => (
                      <tr key={`${row.name}-${index}`} className="border-t border-white/5 text-[#EAEAEA]">
                        <td className="px-3 py-2">{row.name}</td>
                        <td className="px-3 py-2">{row.mileage}</td>
                        <td className="px-3 py-2">{row.maxSpeed}</td>
                        <td className="px-3 py-2">{row.avgSpeed}</td>
                        <td className="px-3 py-2">{row.driving}</td>
                        <td className="px-3 py-2">{row.parkingDuration}</td>
                        <td className="px-3 py-2">{row.working}</td>
                        <td className="px-3 py-2">{row.idle}</td>
                        <td className="px-3 py-2">
                          <div>{row.startAddress}</div>
                          <div className="text-[#88888C]">{row.startTime}</div>
                        </td>
                        <td className="px-3 py-2">
                          <div>{row.endAddress}</div>
                          <div className="text-[#88888C]">{row.endTime}</div>
                        </td>
                      </tr>
                    ))}
                    {!historyLoading && !historyError && historyRows.length === 0 && (
                      <tr>
                        <td colSpan={10} className="px-3 py-6 text-center text-[#88888C]">
                          No data for {toYmd(selectedHistoryDate)}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Asset List Sidebar */}
        <div className="w-[280px] data-card overflow-auto">
          <div className="p-3 border-b border-white/5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-[#EAEAEA]">Fleet Units</h3>
              <span className="text-[10px] text-[#88888C]">{sidebarDateWithPrefix}</span>
            </div>
            <p className="text-[10px] text-[#88888C]">{units.length} units tracked</p>
          </div>

          {/* Action Buttons */}
          <div className="p-3 border-b border-white/5 flex gap-2">
            <Button
              onClick={() => setAddEquipmentOpen(true)}
              className="flex-1 bg-[#F2A900] text-[#050505] hover:bg-[#F2A900]/90 font-semibold text-xs h-8"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add Equipment
            </Button>
            <Button
              onClick={() => setPmsConfigOpen(true)}
              className="flex-1 bg-[#3B82F6] text-white hover:bg-[#3B82F6]/90 font-semibold text-xs h-8"
            >
              <Settings className="w-3.5 h-3.5 mr-1" />
              PMS Config
            </Button>
          </div>

          {/* Added Equipment Section */}
          {addedEquipment.length > 0 && (
            <div className="border-b border-white/5">
              {addedEquipment.map((eq) => {
                const client = clients.find((c) => c.id === eq.clientId);
                return (
                  <button
                    key={eq.id}
                    className="w-full p-3 text-left transition-colors hover:bg-white/5 border-b border-white/5 last:border-b-0"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-[#F2A900]" />
                        <span className="text-xs font-medium text-[#EAEAEA]">{eq.name}</span>
                      </div>
                      <ChevronRight className="w-3 h-3 text-[#88888C]" />
                    </div>
                    <div className="text-[10px] text-[#88888C] ml-3.5 space-y-0.5">
                      <div>{client?.companyName || "—"}</div>
                      <div className="flex items-center gap-2">
                        <span>Hours Today: {eq.hoursToday}</span>
                        <span>Hours in Total: {eq.hoursTotal}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <div className="divide-y divide-white/5">
            {units.map((unit) => {
              const eq = equipment.find((e) => e.id === unit.equipmentId);
              const client = clients.find((c) => c.id === eq?.clientId);
              const isSelected = selectedUnitId === unit.id;
              const unitLabel = (eq?.unitId || unit.unitName || "").toUpperCase();
              const isGps001 = unit.id === 1 || unitLabel === "GPS-001";

              const staticHoursByUnit: Record<string, { today: string; total: string }> = {
                "GPS-003": { today: "4h 20m", total: "3890h 40m" },
                "GPS-004": { today: "6h 15m", total: "2100h 40m" },
                "GPS-010": { today: "3h 50m", total: "3450h 40m" },
                "GPS-007": { today: "7h 10m", total: "5200h 40m" },
                "EXC-CAT-20": { today: "5h 05m", total: "2780h 30m" },
                "LAB-STS-01": { today: "2h 40m", total: "1120h 20m" },
                "TST-BEAM-02": { today: "3h 25m", total: "1655h 15m" },
              };

              const fallbackStaticHours = { today: "4h 20m", total: "3890h 40m" };

              const hoursTodayText = isGps001
                ? formatHoursFromMsForSidebar(gps001HoursTodayMs)
                : (staticHoursByUnit[unitLabel]?.today ?? fallbackStaticHours.today);

              const hoursTotalText = isGps001
                ? formatHoursFromMsForSidebar(gps001HoursTotalMs)
                : (staticHoursByUnit[unitLabel]?.total ?? fallbackStaticHours.total);

              return (
                <button
                  key={unit.id}
                  onClick={() => selectUnit(unit.id)}
                  className={`w-full p-3 text-left transition-colors ${
                    isSelected ? "bg-[#F2A900]/10" : "hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${statusDotClass(getEffectiveStatus(unit.id, unit.telemetry.status))}`} />
                      <span className="text-xs font-medium text-[#EAEAEA]">{eq?.unitId || unit.unitName}</span>
                    </div>
                    <ChevronRight className={`w-3 h-3 ${isSelected ? "text-[#F2A900]" : "text-[#88888C]"}`} />
                  </div>
                  <div className="text-[10px] text-[#88888C] ml-3.5 space-y-0.5">
                    <div>{client?.companyName || "—"}</div>
                    <div className="flex items-center gap-2">
                      <span>Hours Today: {hoursTodayText}</span>
                      <span>Hours in Total: {hoursTotalText}</span>
                    </div>
                    {unit.serviceDue && (
                      <div className="flex items-center gap-1 text-[#EF4444]">
                        <AlertTriangle className="w-2.5 h-2.5" />
                        <span>Service due</span>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modals */}
      <AddEquipmentModal
        open={addEquipmentOpen}
        onOpenChange={setAddEquipmentOpen}
        clients={clients}
        onAddEquipment={handleAddEquipment}
      />

      <PMSConfigurationModal
        open={pmsConfigOpen}
        onOpenChange={setPmsConfigOpen}
        configurations={pmsConfigurations}
        onAddConfiguration={handleAddPMSConfiguration}
        onUpdateConfiguration={handleUpdatePMSConfiguration}
        onDeleteConfiguration={handleDeletePMSConfiguration}
      />
    </div>
  );
}
