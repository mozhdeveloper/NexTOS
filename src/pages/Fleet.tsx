import { useEffect, useMemo, useState } from "react";
import type { Client } from "@/types";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import { useFleetStore } from "@/stores/useFleetStore";
import { useOperationsStore } from "@/stores/useOperationsStore";
import { useCRMStore } from "@/stores/useCRMStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { trpc } from "@/providers/trpc";
import seedData from "@/data/seed-data.json";
import {
  fetchAllTimeWorkingDays,
  fetchAllTimeWorkingMs,
  fetchAllTimeMileageKm,
  fetchDailyHistorySummary,
  type GPS51DailyHistorySummary,
} from "@/services/gps51";
import { AddEquipmentModal, type Equipment as ModalEquipment } from "@/components/AddEquipmentModal";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Radio,
  AlertTriangle,
  Pencil,
  Trash2,
  Wifi,
  WifiOff,
  Plus,
  MoreVertical,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";

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

type SeedEquipmentDisplay = {
  equipmentName: string;
  equipmentType: string;
  clientName: string | null;
};

type ServiceStatus = "OK" | "Near Service" | "Overdue";

interface HistoryRow {
  id: string;
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

type HistoryDateStatus = "has-data" | "no-data" | "unknown";

const GPS51_USERNAME = import.meta.env.VITE_GPS51_USERNAME ?? "";
const GPS51_PASSWORD = import.meta.env.VITE_GPS51_PASSWORD ?? "";
const FLEET_HISTORY_DEBUG = true;
const GPS001_TOTAL_HOURS_CACHE_KEY = "nextos-gps001-total-hours-ms";
const GPS001_HOURS_TODAY_CACHE_KEY = "nextos-gps001-hours-today-ms";
const GPS001_HOURS_TODAY_TIMESTAMP_KEY = "nextos-gps001-hours-today-timestamps";
const GPS001_KM_TODAY_CACHE_KEY = "nextos-gps001-km-today";
const GPS001_TOTAL_KM_CACHE_KEY = "nextos-gps001-total-km";
const GPS001_WORKING_DAYS_BY_DAY_CACHE_KEY = "fleet:gps001WorkingDaysByDay:v2";
const ADDED_EQUIPMENT_STORAGE_KEY = "nextos-fleet-added-equipment";
const HISTORY_DOT_STATUS_CACHE_KEY = "nextos-fleet-history-dot-statuses";
const HISTORY_TABLE_DATA_CACHE_KEY = "nextos-fleet-history-table-data";
const HISTORY_TABLE_TODAY_TIMESTAMP_KEY = "nextos-fleet-history-table-today-timestamps";
const PROTECTED_EQUIPMENT_NAME = "Excavator CAT 320";
const DEFAULT_SERVICE_TYPE = "PMS (Preventative Maintenance)";
const SERVICE_INTERVAL_TOAST_MILESTONES_KEY = "nextos-fleet-service-interval-toast-milestones";

const STATIC_HOURS_BY_UNIT: Record<string, { today: string; total: string }> = {
  "GPS-003": { today: "4h 20m", total: "3890h 40m" },
  "GPS-004": { today: "6h 15m", total: "2100h 40m" },
  "GPS-010": { today: "3h 50m", total: "3450h 40m" },
  "GPS-007": { today: "7h 10m", total: "2100h 40m" },
  "EXC-CAT-20": { today: "5h 05m", total: "2780h 30m" },
  "LAB-STS-01": { today: "2h 40m", total: "1120h 20m" },
  "TST-BEAM-02": { today: "3h 25m", total: "1655h 15m" },
};

const FALLBACK_STATIC_HOURS = { today: "4h 20m", total: "3890h 40m" };

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

function readCachedGps001HoursTodayByDay(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const rawValue = window.localStorage.getItem(GPS001_HOURS_TODAY_CACHE_KEY);
    return rawValue ? (JSON.parse(rawValue) as Record<string, number>) : {};
  } catch {
    return {};
  }
}

function writeCachedGps001HoursTodayByDay(data: Record<string, number>): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(GPS001_HOURS_TODAY_CACHE_KEY, JSON.stringify(data));
}

function readCachedGps001HoursTodayTimestamps(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const rawValue = window.localStorage.getItem(GPS001_HOURS_TODAY_TIMESTAMP_KEY);
    return rawValue ? (JSON.parse(rawValue) as Record<string, number>) : {};
  } catch {
    return {};
  }
}

function writeCachedGps001HoursTodayTimestamps(data: Record<string, number>): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(GPS001_HOURS_TODAY_TIMESTAMP_KEY, JSON.stringify(data));
}

function readCachedGps001KmTodayByDay(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const rawValue = window.localStorage.getItem(GPS001_KM_TODAY_CACHE_KEY);
    return rawValue ? (JSON.parse(rawValue) as Record<string, number>) : {};
  } catch {
    return {};
  }
}

function writeCachedGps001KmTodayByDay(data: Record<string, number>): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(GPS001_KM_TODAY_CACHE_KEY, JSON.stringify(data));
}

function readCachedGps001TotalKm(): number {
  if (typeof window === "undefined") return 0;
  const rawValue = window.localStorage.getItem(GPS001_TOTAL_KM_CACHE_KEY);
  const parsed = Number(rawValue ?? "0");
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function writeCachedGps001TotalKm(totalKm: number): void {
  if (typeof window === "undefined") return;
  if (!Number.isFinite(totalKm) || totalKm <= 0) return;
  window.localStorage.setItem(GPS001_TOTAL_KM_CACHE_KEY, String(totalKm));
}

function readCachedGps001WorkingDaysByDay(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const rawValue = window.localStorage.getItem(GPS001_WORKING_DAYS_BY_DAY_CACHE_KEY);
    return rawValue ? (JSON.parse(rawValue) as Record<string, number>) : {};
  } catch {
    return {};
  }
}

function writeCachedGps001WorkingDaysByDay(data: Record<string, number>): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(GPS001_WORKING_DAYS_BY_DAY_CACHE_KEY, JSON.stringify(data));
}

function readCachedAddedEquipment(): ModalEquipment[] {
  if (typeof window === "undefined") return [];
  try {
    const rawValue = window.localStorage.getItem(ADDED_EQUIPMENT_STORAGE_KEY);
    if (!rawValue) return [];
    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function isPastYmd(ymd: string): boolean {
  const [yearText, monthText, dayText] = ymd.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return false;
  }

  const candidate = new Date(year, month - 1, day);
  candidate.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return candidate.getTime() < today.getTime();
}

function isHistoryKeyPastDate(key: string): boolean {
  const separatorIndex = key.indexOf(":");
  if (separatorIndex === -1) return false;
  const ymd = key.slice(separatorIndex + 1);
  return isPastYmd(ymd);
}

function readCachedHistoryDotStatuses(): Record<string, HistoryDateStatus> {
  if (typeof window === "undefined") return {};

  try {
    const rawValue = window.localStorage.getItem(HISTORY_DOT_STATUS_CACHE_KEY);
    if (!rawValue) return {};

    const parsed = JSON.parse(rawValue) as Record<string, unknown>;
    const sanitized: Record<string, HistoryDateStatus> = {};

    for (const [key, value] of Object.entries(parsed)) {
      if ((value === "has-data" || value === "no-data") && isHistoryKeyPastDate(key)) {
        sanitized[key] = value;
      }
    }

    return sanitized;
  } catch {
    return {};
  }
}

function writeCachedHistoryDotStatuses(data: Record<string, HistoryDateStatus>): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(HISTORY_DOT_STATUS_CACHE_KEY, JSON.stringify(data));
}

function readCachedHistoryTableData(): Record<string, HistoryRow[]> {
  if (typeof window === "undefined") return {};
  try {
    const rawValue = window.localStorage.getItem(HISTORY_TABLE_DATA_CACHE_KEY);
    return rawValue ? (JSON.parse(rawValue) as Record<string, HistoryRow[]>) : {};
  } catch {
    return {};
  }
}

function writeCachedHistoryTableData(data: Record<string, HistoryRow[]>): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(HISTORY_TABLE_DATA_CACHE_KEY, JSON.stringify(data));
}

function readCachedHistoryTableTodayTimestamps(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const rawValue = window.localStorage.getItem(HISTORY_TABLE_TODAY_TIMESTAMP_KEY);
    return rawValue ? (JSON.parse(rawValue) as Record<string, number>) : {};
  } catch {
    return {};
  }
}

function writeCachedHistoryTableTodayTimestamps(data: Record<string, number>): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(HISTORY_TABLE_TODAY_TIMESTAMP_KEY, JSON.stringify(data));


}

function isLiveMappedSeedEquipmentEntry(entry: ModalEquipment): boolean {
  const seedEntry = seedData.equipment.find((seed) => {
    const seedClientNumericId = Number(String(seed.clientId).replace(/\D/g, ""));
    const entryMatchesSeedId = entry.id === `seed-${seed.id}` || entry.id === seed.id;
    const entryMatchesFields =
      seed.name.trim().toLowerCase() === entry.name.trim().toLowerCase() &&
      seedClientNumericId === entry.clientId &&
      seed.equipmentType.trim().toLowerCase() === entry.type.trim().toLowerCase() &&
      (seed.serialNumber ?? "").trim().toLowerCase() === entry.serialNumber.trim().toLowerCase();

    return entryMatchesSeedId || entryMatchesFields;
  });

  return Boolean(seedEntry && LIVE_SEED_EQUIPMENT_IDS.has(seedEntry.id));
}

function readCachedAddedEquipmentWithoutSeedDuplicates(): ModalEquipment[] {
  return readCachedAddedEquipment().filter((entry) => !isLiveMappedSeedEquipmentEntry(entry));
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

function isFutureDate(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const candidate = new Date(date);
  candidate.setHours(0, 0, 0, 0);

  return candidate.getTime() > today.getTime();
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

function formatSidebarKm(value: number): string {
  if (!Number.isFinite(value) || value < 0) return "0km";
  return `${Math.round(value)}km`;
}

function formatHistoryKm(value: number): string {
  if (!Number.isFinite(value) || value < 0) return "0.00km";
  return `${value.toFixed(2)}km`;
}

function parseHistoryMileageKm(value: string | undefined): number | null {
  if (!value) return null;
  const normalized = value.replace(/[^\d.]/g, "");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function parseSeedKm(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) && value >= 0 ? value : null;
  }

  if (typeof value === "string") {
    const normalized = value.replace(/[^\d.]/g, "");
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
  }

  return null;
}

function parseSeedDays(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) && value >= 0 ? Math.floor(value) : null;
  }

  if (typeof value === "string") {
    const normalized = value.replace(/[^\d.]/g, "");
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : null;
  }

  return null;
}

function parseServiceMetricFromSeedEntry(entry: any): number | null {
  const pmsConfig = entry?.pmsConfiguration;
  const interval = Number(pmsConfig?.serviceInterval ?? 0);
  if (!Number.isFinite(interval) || interval <= 0) {
    return null;
  }

  const unit = String(pmsConfig?.serviceIntervalUnit ?? "Hours").toLowerCase();

  if (unit === "hours") {
    return parseHoursTextToHours(entry?.hoursTotal);
  }

  if (unit === "km" || unit === "kms") {
    return parseSeedKm(entry?.kmTotal);
  }

  const days = parseSeedDays(entry?.days);
  if (days === null) {
    return null;
  }

  const periods = convertDaysToPeriods(days);
  if (unit === "weeks") {
    return periods.weeks;
  }
  if (unit === "months") {
    return periods.months;
  }
  if (unit === "years") {
    return periods.years;
  }

  return null;
}

function computeServiceStatusFromSeedEntry(entry: any): ServiceStatus | null {
  if (!entry || entry.id === "EQ-001") {
    return null;
  }

  const interval = Number(entry?.pmsConfiguration?.serviceInterval ?? 0);
  if (!Number.isFinite(interval) || interval <= 0) {
    return null;
  }

  const metric = parseServiceMetricFromSeedEntry(entry);
  if (metric === null || !Number.isFinite(metric) || metric < 0) {
    return null;
  }

  const progress = (metric / interval) * 100;
  if (progress >= 100) return "Overdue";
  if (progress >= 80) return "Near Service";
  return "OK";
}

function computeServiceStatusFromAddedEntry(entry: ModalEquipment, seedEntry?: any | null): ServiceStatus | null {
  const sourceEntry = seedEntry ?? entry;

  if (!sourceEntry) {
    return null;
  }

  if (
    sourceEntry.id === "EQ-001" ||
    sourceEntry.id === "seed-EQ-001" ||
    sourceEntry.name === PROTECTED_EQUIPMENT_NAME
  ) {
    return null;
  }

  const interval = Number(sourceEntry?.pmsConfiguration?.serviceInterval ?? 0);
  if (!Number.isFinite(interval) || interval <= 0) {
    return null;
  }

  const unit = String(sourceEntry?.pmsConfiguration?.serviceIntervalUnit ?? "Hours").toLowerCase();

  let metric: number | null = null;
  if (unit === "hours") {
    metric = parseHoursTextToHours(sourceEntry?.hoursTotal);
  } else if (unit === "km" || unit === "kms") {
    metric = parseSeedKm(sourceEntry?.kmTotal);
  } else {
    const days = parseSeedDays(sourceEntry?.days);
    if (days !== null) {
      const periods = convertDaysToPeriods(days);
      if (unit === "weeks") metric = periods.weeks;
      if (unit === "months") metric = periods.months;
      if (unit === "years") metric = periods.years;
    }
  }

  if (metric === null || !Number.isFinite(metric) || metric < 0) {
    return null;
  }

  const progress = (metric / interval) * 100;
  if (progress >= 100) return "Overdue";
  if (progress >= 80) return "Near Service";
  return "OK";
}

function serviceStatusTextClass(status: ServiceStatus): string {
  if (status === "Overdue") return "text-[#EF4444]";
  if (status === "Near Service") return "text-[#F2A900]";
  return "text-[#10B981]";
}

function serviceStatusDotClass(status: ServiceStatus): string {
  if (status === "Overdue") return "bg-[#EF4444]";
  if (status === "Near Service") return "bg-[#F2A900]";
  return "bg-[#10B981]";
}

function parseHoursTextToHours(value: string | undefined): number | null {
  if (!value) return null;
  const match = value.match(/(\d+)\s*h\s*(\d+)\s*m/i);
  if (!match) return null;
  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2] ?? 0);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes) || hours < 0 || minutes < 0) {
    return null;
  }
  return hours + minutes / 60;
}

type MilestoneEntry = { count: number; hoursText: string; sessionId?: string };

function readServiceIntervalToastMilestones(): Record<string, MilestoneEntry | number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(SERVICE_INTERVAL_TOAST_MILESTONES_KEY);
    return raw ? (JSON.parse(raw) as Record<string, MilestoneEntry | number>) : {};
  } catch {
    return {};
  }
}

function writeServiceIntervalToastMilestones(data: Record<string, MilestoneEntry | number>): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SERVICE_INTERVAL_TOAST_MILESTONES_KEY, JSON.stringify(data));
}

function convertDaysToPeriods(days: number): { weeks: number; months: number; years: number } {
  const safeDays = Number.isFinite(days) && days >= 0 ? days : 0;
  return {
    weeks: safeDays / 7,
    months: safeDays / 30.44,
    years: safeDays / 365.25,
  };
}

function formatDaysForSidebar(days: number | null): string {
  if (days === null || !Number.isFinite(days) || days < 0) {
    return "—";
  }
  const wholeDays = Math.floor(days);
  return `${wholeDays} day${wholeDays === 1 ? "" : "s"}`;
}

function formatDayPeriodsForSidebar(days: number | null): string {
  if (days === null || !Number.isFinite(days) || days < 0) {
    return "";
  }
  const { weeks, months, years } = convertDaysToPeriods(days);
  return `${weeks.toFixed(1)}w / ${months.toFixed(1)}mo / ${years.toFixed(2)}yr`;
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

function buildHistoryRowFromSummary(id: string, name: string, summary: GPS51DailyHistorySummary): HistoryRow {
  const metersToKm = (value: number) => value / 1000;
  const normalizeSpeedToKph = (value: number) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 0;
    return Math.abs(numeric) > 1000 ? numeric / 1000 : numeric;
  };
  const parkingDuration =
    (summary.parkingText ?? "").trim() || formatDurationFromMs(summary.parkingMs);

  return {
    id,
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

function buildMockHistoryRow(id: string, name: string, date: Date, unitSeed: number): HistoryRow {
  const base = date.getDate() + date.getMonth() * 7 + unitSeed * 11;
  const mileage = 25 + (base % 80);
  const maxSpeed = 35 + (base % 28);
  const avgSpeed = 18 + (base % 16);
  const drivingMinutes = 90 + (base % 230);
  const workingMinutes = drivingMinutes + 20 + (base % 80);
  const idleMinutes = 40 + (base % 120);
  const dateText = toYmd(date);

  return {
    id,
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

const unitIdToSeedEquipmentId: Record<string, string> = {
  // GPS-001 — Excavator CAT 320 (EQ-001) — MetroBuild Construction Corp.
  "EXC-320": "EQ-001",
  "EXC-CAT-20": "EQ-003",
  "KS199D-4G TRACKER": "EQ-001",
  // GPS-002 — Boom Truck X500 (EQ-002) — Prime Infra Solutions
  "TST-BEAM-02": "EQ-002",
  // GPS-003 — Generator 500KVA (EQ-003) — GreenBuild Developers
  "GPS-003": "EQ-003",
  // GPS-004 — Concrete Strength Tester (LAB-001) — Delta Testing Laboratories
  "GPS-007": "LAB-001",
  "GPS-004": "LAB-001",
  // GPS-005 — Steel Beam Tester (LAB-002) — MetroBuild Construction Corp.
  "GPS-005": "LAB-002",
  "GPS-010": "LAB-002",
  "LAB-STS-01": "LAB-002",
  // GPS-006 — Soil Compaction Machine (LAB-003) — Prime Infra Solutions
  "GPS-006": "LAB-003",
};

// Temporary GPS name mapping
const gpsNameMapping: Record<string, string> = {
  "EXC-320": "GPS-001",
  "TST-BEAM-02": "GPS-002",
  "EXC-CAT-20": "GPS-003",
  "GPS-007": "GPS-004",
  "GPS-010": "GPS-005",
  "GPS-003": "GPS-003",
  "GPS-004": "GPS-004",
};

const LIVE_SEED_EQUIPMENT_IDS = new Set(Object.values(unitIdToSeedEquipmentId));

function getSeedEquipmentForUnit(unitId: string): any | null {
  const normalizedUnitId = unitId.trim().toUpperCase();
  const seedEquipmentId = unitIdToSeedEquipmentId[normalizedUnitId];
  if (!seedEquipmentId) return null;

  const equipment = seedData.equipment.find((entry) => entry.id === seedEquipmentId);
  return equipment ?? null;
}

function getSeedDisplayForUnit(unitId: string): SeedEquipmentDisplay | null {
  const equipment = getSeedEquipmentForUnit(unitId);
  if (!equipment) return null;

  const client = seedData.clients.find((entry) => entry.id === equipment.clientId);

  return {
    equipmentName: equipment.name,
    equipmentType: equipment.equipmentType,
    clientName: client?.companyName ?? null,
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
  const [historyDataByDate, setHistoryDataByDate] = useState<Record<string, HistoryDateStatus>>(() =>
    readCachedHistoryDotStatuses()
  );
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyDateStatus, setHistoryDateStatus] = useState<"parking" | "offline" | null>(null);
  const [gps001HoursTodayMs, setGps001HoursTodayMs] = useState(0);
  const [gps001KmToday, setGps001KmToday] = useState(0);
  const [gps001HoursTotalMs, setGps001HoursTotalMs] = useState(() => readCachedGps001TotalHoursMs());
  const [gps001KmTotal, setGps001KmTotal] = useState(() => readCachedGps001TotalKm());
  const [gps001WorkingDays, setGps001WorkingDays] = useState(0);

  // Unique ID for this page load — resets on every full reload, preventing stale localStorage milestones
  // from blocking the toast when the same threshold is crossed again after editing seed data.
  const [pmsToastSessionId] = useState<string>(() => Math.random().toString(36).slice(2));

  // Modal states
  const [addEquipmentOpen, setAddEquipmentOpen] = useState(false);
  
  // Equipment added through modal (in-memory)
  const [addedEquipment, setAddedEquipment] = useState<ModalEquipment[]>(() => readCachedAddedEquipmentWithoutSeedDuplicates());
  const [selectedAddedEquipmentId, setSelectedAddedEquipmentId] = useState<string | null>(null);
  const [openCardMenuId, setOpenCardMenuId] = useState<string | null>(null);
  const [seedImageOverrides, setSeedImageOverrides] = useState<Record<string, string | undefined>>({});
  const [editingEquipment, setEditingEquipment] = useState<ModalEquipment | null>(null);
  const [pendingDeleteEquipmentId, setPendingDeleteEquipmentId] = useState<string | null>(null);
  // Demo stages per unit (0 = normal, 1 = zeroed display, 2 = intermediate)
  const [demoStages, setDemoStages] = useState<Record<number, number>>({});
  const addSeedEquipmentMutation = trpc.seedEquipment.add.useMutation();
  const updateSeedEquipmentMutation = trpc.seedEquipment.update.useMutation();
  const deleteSeedEquipmentMutation = trpc.seedEquipment.delete.useMutation();

  const selectedUnit = units.find((u) => u.id === selectedUnitId);
  const selectedEquipment = equipment.find((e) => e.id === selectedUnit?.equipmentId);
  const selectedUnitLabel = selectedEquipment?.unitId || selectedUnit?.unitName || "Unit";
  const selectedSeedDisplay = getSeedDisplayForUnit(selectedUnitLabel);
  const selectedSeedEquipment = getSeedEquipmentForUnit(selectedUnitLabel);
  const selectedServiceStatus = computeServiceStatusFromSeedEntry(selectedSeedEquipment);

  const seedEquipmentTypeOptions = useMemo(
    () =>
      Array.from(new Set(seedData.equipment.map((entry) => entry.equipmentType)))
        .filter((type) => type.trim().length > 0)
        .map((type) => ({ value: type, label: type })),
    []
  );
  const seedServiceTypeOptions = useMemo(() => {
    const rawOptions = Array.isArray((seedData as any).serviceTypes) ? (seedData as any).serviceTypes : [];
    const mapped = rawOptions
      .map((entry: any) => ({
        value: typeof entry?.label === "string" ? entry.label : "",
        label: typeof entry?.label === "string" ? entry.label : "",
      }))
      .filter((entry: { value: string; label: string }) => entry.value.trim().length > 0);

    if (mapped.length === 0) {
      return [{ value: DEFAULT_SERVICE_TYPE, label: DEFAULT_SERVICE_TYPE }];
    }

    const hasDefault = mapped.some((entry: { value: string; label: string }) => entry.value === DEFAULT_SERVICE_TYPE);
    return hasDefault ? mapped : [{ value: DEFAULT_SERVICE_TYPE, label: DEFAULT_SERVICE_TYPE }, ...mapped];
  }, []);
  const seedClientsForModal: Client[] = useMemo(() =>
    seedData.clients.map((c, idx) => ({
      id: Number(String(c.id).replace(/\D/g, "")) || idx + 1,
      companyName: c.companyName,
      industry: c.industry ?? "",
      contactName: (c as any).mainContact ?? "",
      email: "",
      phone: "",
      status: "active",
      address: "",
      city: c.location ?? "",
      country: "",
      contractValue: 0,
      lastContact: new Date().toISOString(),
      notes: "",
      createdAt: new Date().toISOString(),
    })),
    []
  );
  // Display-only backfill units (do not modify seed-data.json)
  const seedBackfillUnits: any[] = [
    {
      id: 9006,
      unitName: "GPS-006",
      telemetry: { lat: undefined, lng: undefined, status: "offline", speed: 0, heading: 0, hours: 0 },
      equipmentId: undefined,
    },
  ];
  // Build display list including display-only backfill units, then sort so GPS-IDs appear in numeric order
  const sortedUnits = useMemo(() => {
    const displayUnits = units.slice();

    // Append backfill units if not already present (match by unit label)
    for (const bu of seedBackfillUnits) {
      const bLabel = (bu.unitName || "").toUpperCase().split(" ")[0];
      const exists = displayUnits.some((u) => {
        const uEq = equipment.find((e) => e.id === u.equipmentId);
        const rawLabel = (uEq?.unitId || u.unitName || "") as string;
        const lookup = rawLabel.toUpperCase().split(" ")[0];
        const displayName = (gpsNameMapping[lookup] || gpsNameMapping[rawLabel.toUpperCase()] || uEq?.unitId || u.unitName || "") as string;
        const displayLabel = (displayName || "").toUpperCase().split(" ")[0];
        return displayLabel === bLabel;
      });
      if (!exists) displayUnits.push(bu as any);
    }

    const getMappedGpsNumber = (u: typeof displayUnits[0]) => {
      const eq = equipment.find((e) => e.id === u.equipmentId);
      const unitLabelText = (eq?.unitId || u.unitName || "").toUpperCase();
      const lookup = unitLabelText.split(" ")[0].trim();
      const mapped = gpsNameMapping[lookup] || gpsNameMapping[unitLabelText] || null;
      if (mapped && mapped.startsWith("GPS-")) {
        const num = Number(mapped.replace(/\D/g, ""));
        return Number.isFinite(num) ? num : Number.POSITIVE_INFINITY;
      }
      // Fallback: parse the unit label itself if it looks like GPS-###
      if (unitLabelText.startsWith("GPS-")) {
        const num = Number(unitLabelText.replace(/\D/g, ""));
        return Number.isFinite(num) ? num : Number.POSITIVE_INFINITY;
      }
      return Number.POSITIVE_INFINITY;
    };

    const sorted = displayUnits.slice().sort((a, b) => {
      const na = getMappedGpsNumber(a);
      const nb = getMappedGpsNumber(b);
      if (na !== nb) return na - nb;
      return displayUnits.indexOf(a) - displayUnits.indexOf(b);
    });

    // Deduplicate: when two units resolve to the same display name, keep the one with seed data
    const seenDisplayNames = new Set<string>();
    return sorted.filter((u) => {
      const uEq = equipment.find((e) => e.id === u.equipmentId);
      const rawLabel = (uEq?.unitId || u.unitName || "").toUpperCase();
      const lookup = rawLabel.split(" ")[0].trim();
      const displayName = (gpsNameMapping[lookup] || gpsNameMapping[rawLabel] || uEq?.unitId || u.unitName || "").toUpperCase().split(" ")[0];
      if (seenDisplayNames.has(displayName)) {
        return false; // drop duplicate
      }
      // If not yet seen, prefer this entry (sorted order already puts seed-backed ones first via numeric order)
      seenDisplayNames.add(displayName);
      return true;
    });
  }, [units, equipment]);
  const selectedSeedEquipmentId = unitIdToSeedEquipmentId[selectedUnitLabel.trim().toUpperCase()];
  const selectedSeedEntry = useMemo(
    () => (selectedSeedEquipmentId
      ? seedData.equipment.find((entry) => entry.id === selectedSeedEquipmentId) ?? null
      : null),
    [selectedSeedEquipmentId, seedData.equipment]
  );
  const selectedSeedHoursTotalText = (selectedSeedEntry as any)?.hoursTotal;
  const selectedSeedServiceInterval =
    (selectedSeedEntry as any)?.pmsConfiguration?.serviceInterval
    ?? (selectedSeedEntry as any)?.pmsConfiguration?.serviceIntervalHours;
  const selectedSeedServiceIntervalUnit = (selectedSeedEntry as any)?.pmsConfiguration?.serviceIntervalUnit;

  // For PMS toast when an added-equipment sidebar item is selected (not a GPS unit)
  const selectedAddedEquipmentBackingSeedId = selectedAddedEquipmentId?.startsWith("seed-")
    ? selectedAddedEquipmentId.slice(5)
    : null;
  const selectedAddedEquipmentEntry = useMemo(
    () => addedEquipment.find((e) => e.id === selectedAddedEquipmentId) ?? null,
    [addedEquipment, selectedAddedEquipmentId]
  );
  const selectedAddedEquipmentSeedEntry = useMemo(
    () =>
      selectedAddedEquipmentBackingSeedId
        ? (seedData.equipment.find((e) => e.id === selectedAddedEquipmentBackingSeedId) ?? null)
        : null,
    [selectedAddedEquipmentBackingSeedId, seedData.equipment]
  );
  const selectedAddedEquipmentHoursTotalText =
    (selectedAddedEquipmentSeedEntry as any)?.hoursTotal
    ?? selectedAddedEquipmentEntry?.hoursTotal;
  const selectedAddedEquipmentInterval =
    (selectedAddedEquipmentSeedEntry as any)?.pmsConfiguration?.serviceInterval
    ?? (selectedAddedEquipmentSeedEntry as any)?.pmsConfiguration?.serviceIntervalHours
    ?? selectedAddedEquipmentEntry?.pmsConfiguration?.serviceInterval
    ?? (selectedAddedEquipmentEntry as any)?.pmsConfiguration?.serviceIntervalHours;
  const selectedAddedEquipmentIntervalUnit =
    (selectedAddedEquipmentSeedEntry as any)?.pmsConfiguration?.serviceIntervalUnit
    ?? selectedAddedEquipmentEntry?.pmsConfiguration?.serviceIntervalUnit;

  const isGps51UnitSelected =
    selectedSeedEquipmentId === "EQ-001" ||
    selectedUnit?.id === 1 ||
    selectedUnitLabel.toUpperCase() === "GPS-001";
  const isGps001Unit = (unit: { id: number; unitName?: string }) =>
    unit.id === 1 || (unit.unitName ?? "").toUpperCase() === "GPS-001";
  const selectedHistoryDay = toYmd(selectedHistoryDate);
  const selectedHistoryKey = `${selectedUnitId ?? "none"}:${selectedHistoryDay}`;
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
  const isFutureHistoryDate = isFutureDate(selectedHistoryDate);
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
    if (!openCardMenuId) return;
    const handler = () => setOpenCardMenuId(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [openCardMenuId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sanitizedEquipment = addedEquipment.filter((entry) => !isLiveMappedSeedEquipmentEntry(entry));
    window.localStorage.setItem(ADDED_EQUIPMENT_STORAGE_KEY, JSON.stringify(sanitizedEquipment));
  }, [addedEquipment]);

  useEffect(() => {
    const persisted: Record<string, HistoryDateStatus> = {};

    for (const [key, status] of Object.entries(historyDataByDate)) {
      if ((status === "has-data" || status === "no-data") && isHistoryKeyPastDate(key)) {
        persisted[key] = status;
      }
    }

    writeCachedHistoryDotStatuses(persisted);
  }, [historyDataByDate]);

  useEffect(() => {
    setAddedEquipment((prev) => {
      // Normalize legacy "eq-{timestamp}" IDs to "seed-EQ-XXX" by matching on name.
      // Entries added before the seed-prefix fix had no "seed-" prefix, which caused
      // handleSubmitEquipment to skip updateSeedEquipmentMutation silently.
      let changed = false;
      const next = prev.map((entry) => {
        if (entry.id.startsWith("seed-") || entry.id.startsWith("unit-")) return entry;
        const sn = entry.serialNumber?.trim();
        const matchingSeed = seedData.equipment.find((s) =>
          s.name === entry.name ||
          (sn && (s as any).serialNumber?.trim() === sn)
        );
        if (matchingSeed) {
          changed = true;
          return { ...entry, id: `seed-${matchingSeed.id}` };
        }
        return entry;
      });
      const sanitized = next.filter((entry) => !isLiveMappedSeedEquipmentEntry(entry));
      if (!changed && sanitized.length === prev.length) return prev;
      return sanitized;
    });
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
      const isTodaySelection = selectedHistoryDay === toYmd(new Date());
      const isPastSelection = isPastYmd(selectedHistoryDay);
      const cachedHoursByDay = readCachedGps001HoursTodayByDay();
      const cachedKmByDay = readCachedGps001KmTodayByDay();
      const cachedTimestamps = readCachedGps001HoursTodayTimestamps();
      const cachedHours = cachedHoursByDay[selectedHistoryDay];
      const cachedKm = cachedKmByDay[selectedHistoryDay];
      const cachedTimestamp = cachedTimestamps[selectedHistoryDay];
      const now = Date.now();
      const isFreshTodayCache =
        isTodaySelection &&
        Number.isFinite(cachedTimestamp) &&
        now - Number(cachedTimestamp) < 5 * 60 * 1000;

      // Past-date values are immutable and reused forever. Today is reused for 5 minutes.
      if (Number.isFinite(cachedHours) && (isPastSelection || isFreshTodayCache)) {
        if (!ignore) {
          setGps001HoursTodayMs(Number(cachedHours));
          setGps001KmToday(Number.isFinite(cachedKm) ? Number(cachedKm) : 0);
        }
        return;
      }

      // Show stale today cache immediately, then refresh in background.
      if (isTodaySelection && Number.isFinite(cachedHours) && !isFreshTodayCache && !ignore) {
        setGps001HoursTodayMs(Number(cachedHours));
        setGps001KmToday(Number.isFinite(cachedKm) ? Number(cachedKm) : 0);
      }

      if (!GPS51_USERNAME || !GPS51_PASSWORD) {
        if (!ignore) {
          setGps001HoursTodayMs(0);
          setGps001KmToday(0);
        }
        return;
      }

      try {
        const summary = await fetchDailyHistorySummary(GPS51_USERNAME, GPS51_PASSWORD, selectedHistoryDay);
        if (!ignore) {
          const resolvedWorkingMs = summary ? summary.workingMs : 0;
          const resolvedMileageKm = summary ? Number((summary.mileageMeters / 1000).toFixed(2)) : 0;
          setGps001HoursTodayMs(resolvedWorkingMs);
          setGps001KmToday(resolvedMileageKm);

          const nextCache = {
            ...cachedHoursByDay,
            [selectedHistoryDay]: resolvedWorkingMs,
          };
          writeCachedGps001HoursTodayByDay(nextCache);

          const nextKmCache = {
            ...cachedKmByDay,
            [selectedHistoryDay]: resolvedMileageKm,
          };
          writeCachedGps001KmTodayByDay(nextKmCache);

          if (isTodaySelection) {
            const nextTimestamps = {
              ...cachedTimestamps,
              [selectedHistoryDay]: Date.now(),
            };
            writeCachedGps001HoursTodayTimestamps(nextTimestamps);
          }
        }
      } catch {
        if (!ignore && !Number.isFinite(cachedHours)) {
          setGps001HoursTodayMs(0);
          setGps001KmToday(0);
        }
      }
    };

    void loadGps001HoursToday();

    const isTodaySelection = selectedHistoryDay === toYmd(new Date());
    if (isTodaySelection) {
      refreshInterval = setInterval(() => {
        void loadGps001HoursToday();
      }, 5 * 60 * 1000);
    }

    return () => {
      ignore = true;
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [selectedHistoryDay]);

  useEffect(() => {
    // Fire for either a GPS unit or an added-equipment sidebar item
    if (!selectedUnit && !selectedAddedEquipmentId) return;

    let pmsConfig: { serviceInterval?: unknown; serviceIntervalHours?: unknown; serviceIntervalUnit?: unknown; serviceType?: unknown } | undefined;
    let metricValueForCalc = 0;
    let currentMetricText = "";
    let milestoneEntityId: string;
    let equipmentNameForToast = "Equipment";

    if (selectedUnit) {
      // Do not involve Excavator CAT 320 (live GPS data path) in this interval-to-toast pass.
      if ((selectedSeedEntry as any)?.id === "EQ-001") return;

      const selectedUnitKey = selectedUnitLabel.toUpperCase();
      pmsConfig = (selectedSeedEntry as any)?.pmsConfiguration;
      equipmentNameForToast = (selectedSeedEntry as any)?.name ?? selectedUnitLabel;
      milestoneEntityId = selectedSeedEntry?.id ?? `unit-${selectedUnit.id}`;

      const intervalUnitRaw = String(pmsConfig?.serviceIntervalUnit ?? "Hours").toLowerCase();
      if (intervalUnitRaw === "hours") {
        const seedHoursText = (selectedSeedEntry as any)?.hoursTotal as string | undefined;
        currentMetricText = seedHoursText
          ?? STATIC_HOURS_BY_UNIT[selectedUnitKey]?.total
          ?? FALLBACK_STATIC_HOURS.total;
        metricValueForCalc = parseHoursTextToHours(currentMetricText) ?? 0;
      } else if (intervalUnitRaw === "km") {
        const seedKmTotal = Number((selectedSeedEntry as any)?.kmTotal ?? 0);
        metricValueForCalc = Number.isFinite(seedKmTotal) ? seedKmTotal : 0;
        currentMetricText = String(metricValueForCalc);
      } else {
        const days = parseSeedDays((selectedSeedEntry as any)?.days);
        if (!Number.isFinite(days) || days === null) return;
        const periods = convertDaysToPeriods(days);
        if (intervalUnitRaw === "weeks") metricValueForCalc = periods.weeks;
        else if (intervalUnitRaw === "months") metricValueForCalc = periods.months;
        else if (intervalUnitRaw === "years") metricValueForCalc = periods.years;
        else return;
        currentMetricText = String(metricValueForCalc);
      }
    } else {
      // Added-equipment path
      pmsConfig =
        (selectedAddedEquipmentSeedEntry as any)?.pmsConfiguration
        ?? (selectedAddedEquipmentEntry as any)?.pmsConfiguration;
      equipmentNameForToast =
        (selectedAddedEquipmentSeedEntry as any)?.name
        ?? selectedAddedEquipmentEntry?.name
        ?? "Equipment";
      milestoneEntityId = selectedAddedEquipmentId!;

      const intervalUnitRaw = String(pmsConfig?.serviceIntervalUnit ?? "Hours").toLowerCase();
      if (intervalUnitRaw === "hours") {
        currentMetricText = selectedAddedEquipmentHoursTotalText ?? "";
        metricValueForCalc = parseHoursTextToHours(currentMetricText) ?? 0;
      } else if (intervalUnitRaw === "km") {
        const kmFromSeed = Number((selectedAddedEquipmentSeedEntry as any)?.kmTotal ?? Number.NaN);
        const kmFromEntry = Number((selectedAddedEquipmentEntry as any)?.kmTotal ?? Number.NaN);
        metricValueForCalc = Number.isFinite(kmFromSeed) ? kmFromSeed : (Number.isFinite(kmFromEntry) ? kmFromEntry : 0);
        currentMetricText = String(metricValueForCalc);
      } else {
        const days = parseSeedDays(
          (selectedAddedEquipmentSeedEntry as any)?.days
            ?? (selectedAddedEquipmentEntry as any)?.days
        );
        if (!Number.isFinite(days) || days === null) return;
        const periods = convertDaysToPeriods(days);
        if (intervalUnitRaw === "weeks") metricValueForCalc = periods.weeks;
        else if (intervalUnitRaw === "months") metricValueForCalc = periods.months;
        else if (intervalUnitRaw === "years") metricValueForCalc = periods.years;
        else return;
        currentMetricText = String(metricValueForCalc);
      }
    }

    const interval = Number(pmsConfig?.serviceInterval ?? pmsConfig?.serviceIntervalHours);
    const intervalUnit = typeof pmsConfig?.serviceIntervalUnit === "string"
      ? pmsConfig.serviceIntervalUnit
      : "Hours";
    const intervalUnitDisplay = intervalUnit.toLowerCase() === "km" ? "Km" : intervalUnit;
    const serviceType = typeof pmsConfig?.serviceType === "string" && pmsConfig.serviceType.trim().length > 0
      ? pmsConfig.serviceType
      : "Service";

    if (!Number.isFinite(interval) || interval <= 0) return;
    if (!Number.isFinite(metricValueForCalc) || metricValueForCalc <= 0) return;

    const achievedMilestone = Math.floor(metricValueForCalc / interval);
    const milestoneStore = readServiceIntervalToastMilestones();
    const milestoneKey = `${milestoneEntityId}:${interval}:${String(intervalUnit).toLowerCase()}`;
    const stored = milestoneStore[milestoneKey];

    const storedCount = typeof stored === "number" ? stored : (stored?.count ?? 0);
    const storedHoursText = typeof stored === "object" && stored !== null ? stored.hoursText : undefined;
    const storedSessionId = typeof stored === "object" && stored !== null ? stored.sessionId : undefined;
    const previousMilestone =
      storedSessionId === pmsToastSessionId && storedHoursText === currentMetricText
        ? storedCount
        : 0;

    if (achievedMilestone <= 0) {
      writeServiceIntervalToastMilestones({
        ...milestoneStore,
        [milestoneKey]: { count: 0, hoursText: currentMetricText, sessionId: pmsToastSessionId },
      });
      return;
    }

    if (achievedMilestone <= previousMilestone) return;

    toast(
      `${interval} ${intervalUnitDisplay} achieved with ${equipmentNameForToast} – ${serviceType} needed`,
      { style: { color: "#FFFFFF" } }
    );

    writeServiceIntervalToastMilestones({
      ...milestoneStore,
      [milestoneKey]: { count: achievedMilestone, hoursText: currentMetricText, sessionId: pmsToastSessionId },
    });
  }, [
    selectedUnit,
    selectedUnitLabel,
    selectedSeedEquipmentId,
    selectedSeedEntry,
    selectedSeedHoursTotalText,
    selectedSeedServiceInterval,
    selectedSeedServiceIntervalUnit,
    isGps51UnitSelected,
    gps001HoursTotalMs,
    selectedAddedEquipmentId,
    selectedAddedEquipmentEntry,
    selectedAddedEquipmentSeedEntry,
    selectedAddedEquipmentHoursTotalText,
    selectedAddedEquipmentInterval,
    selectedAddedEquipmentIntervalUnit,
    pmsToastSessionId,
  ]);

  // Global seed data watcher: fire toasts for milestone crossings in ANY equipment, regardless of selection
  useEffect(() => {
    if (!Array.isArray(seedData?.equipment)) return;

    const milestoneStore = readServiceIntervalToastMilestones();

    seedData.equipment.forEach((equipment: any) => {
      // Skip if no PMS config or protected Excavator
      if (!equipment.pmsConfiguration || equipment.id === "EQ-001") return;

      const pmsConfig = equipment.pmsConfiguration;
      const equipmentName = equipment.name ?? "Equipment";
      const interval = Number(pmsConfig?.serviceInterval ?? pmsConfig?.serviceIntervalHours);
      const intervalUnit = String(pmsConfig?.serviceIntervalUnit ?? "Hours");
      const serviceType = String(pmsConfig?.serviceType ?? "Service");

      if (!Number.isFinite(interval) || interval <= 0) return;

      const intervalUnitDisplay = intervalUnit.toLowerCase() === "km" ? "Km" : intervalUnit;

      // Determine metric value based on unit
      let metricValueForCalc = 0;
      let currentMetricText = "";

      if (intervalUnit.toLowerCase() === "hours") {
        const hoursText = equipment.hoursTotal ?? "";
        currentMetricText = hoursText;
        metricValueForCalc = parseHoursTextToHours(hoursText) ?? 0;
      } else if (intervalUnit.toLowerCase() === "km") {
        metricValueForCalc = Number(equipment.kmTotal ?? 0);
        currentMetricText = String(metricValueForCalc);
      } else {
        const days = parseSeedDays(equipment.days);
        if (!Number.isFinite(days) || days === null) return;
        const periods = convertDaysToPeriods(days);
        if (intervalUnit.toLowerCase() === "weeks") metricValueForCalc = periods.weeks;
        else if (intervalUnit.toLowerCase() === "months") metricValueForCalc = periods.months;
        else if (intervalUnit.toLowerCase() === "years") metricValueForCalc = periods.years;
        else return;
        currentMetricText = String(metricValueForCalc);
      }

      if (!Number.isFinite(metricValueForCalc) || metricValueForCalc <= 0) return;

      const achievedMilestone = Math.floor(metricValueForCalc / interval);
      const milestoneKey = `${equipment.id}:${interval}:${intervalUnit.toLowerCase()}`;
      const stored = milestoneStore[milestoneKey];

      const storedCount = typeof stored === "number" ? stored : (stored?.count ?? 0);
      const storedHoursText = typeof stored === "object" && stored !== null ? stored.hoursText : undefined;
      const storedSessionId = typeof stored === "object" && stored !== null ? stored.sessionId : undefined;

      // Only fire if this is a new session OR the metric text changed (fresh start)
      const previousMilestone =
        storedSessionId === pmsToastSessionId && storedHoursText === currentMetricText
          ? storedCount
          : 0;

      if (achievedMilestone <= 0 || achievedMilestone <= previousMilestone) {
        // Just update storage without toasting
        milestoneStore[milestoneKey] = {
          count: achievedMilestone,
          hoursText: currentMetricText,
          sessionId: pmsToastSessionId,
        };
        return;
      }

      // Fire toast on milestone crossing
      toast(
        `${interval} ${intervalUnitDisplay} achieved with ${equipmentName} – ${serviceType} needed`,
        { style: { color: "#FFFFFF" } }
      );

      // Update milestone store
      milestoneStore[milestoneKey] = {
        count: achievedMilestone,
        hoursText: currentMetricText,
        sessionId: pmsToastSessionId,
      };
    });

    writeServiceIntervalToastMilestones(milestoneStore);
  }, [seedData?.equipment, pmsToastSessionId]);

  useEffect(() => {
    let ignore = false;
    let refreshInterval: ReturnType<typeof setInterval> | null = null;

    const loadGps001HoursTotal = async () => {
      if (!GPS51_USERNAME || !GPS51_PASSWORD) {
        return;
      }
      try {
        const [totalMs, totalKm] = await Promise.all([
          fetchAllTimeWorkingMs(
            GPS51_USERNAME,
            GPS51_PASSWORD,
            "2000-01-01",
            toYmd(new Date())
          ),
          fetchAllTimeMileageKm(
            GPS51_USERNAME,
            GPS51_PASSWORD,
            "2000-01-01",
            toYmd(new Date())
          ),
        ]);
        if (!ignore && Number.isFinite(totalMs) && totalMs > 0) {
          setGps001HoursTotalMs(totalMs);
          writeCachedGps001TotalHoursMs(totalMs);
        }
        if (!ignore && Number.isFinite(totalKm) && totalKm > 0) {
          setGps001KmTotal(totalKm);
          writeCachedGps001TotalKm(totalKm);
        }
      } catch {
        // Keep the last known-good totals; transient API failures should not reset the sidebar to 0.
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
    let ignore = false;

    const loadGps001WorkingDays = async () => {
      const todayYmd = toYmd(new Date());
      const targetDay = selectedHistoryDay > todayYmd ? todayYmd : selectedHistoryDay;
      const targetDate = new Date(`${targetDay}T00:00:00`);
      const monthStart = Number.isNaN(targetDate.getTime())
        ? targetDay
        : toYmd(new Date(targetDate.getFullYear(), targetDate.getMonth(), 1));
      const cachedByDay = readCachedGps001WorkingDaysByDay();
      const cachedDays = cachedByDay[targetDay];

      console.log("[Fleet] Excavator days fetch start:", {
        selectedHistoryDay,
        targetDay,
        monthStart,
        hasCredentials: Boolean(GPS51_USERNAME && GPS51_PASSWORD),
        hasCachedDays: Number.isFinite(cachedDays),
      });

      if (Number.isFinite(cachedDays) && !ignore) {
        setGps001WorkingDays(Number(cachedDays));
        console.log("[Fleet] Excavator days cache hit:", {
          targetDay,
          totalDays: Number(cachedDays),
        });
      }

      if (!GPS51_USERNAME || !GPS51_PASSWORD) {
        console.warn("[Fleet] Excavator days fetch skipped: missing GPS51 credentials");
        if (!ignore && !Number.isFinite(cachedDays)) {
          setGps001WorkingDays(0);
        }
        return;
      }

      // Past-day counts are immutable, so no need to re-fetch if already cached.
      if (Number.isFinite(cachedDays) && targetDay !== todayYmd) {
        console.log("[Fleet] Excavator days fetch skipped: cached immutable past day", {
          targetDay,
          totalDays: Number(cachedDays),
        });
        return;
      }

      try {
        const totalDays = await fetchAllTimeWorkingDays(
          GPS51_USERNAME,
          GPS51_PASSWORD,
          monthStart,
          targetDay
        );

        if (!ignore) {
          setGps001WorkingDays(totalDays);
          writeCachedGps001WorkingDaysByDay({
            ...cachedByDay,
            [targetDay]: totalDays,
          });
          console.log("[Fleet] Excavator CAT 320 days fetched:", {
            targetDay,
            totalDays,
          });
        }
      } catch {
        console.error("[Fleet] Excavator days fetch failed", { targetDay });
        if (!ignore && !Number.isFinite(cachedDays)) {
          setGps001WorkingDays(0);
        }
      }
    };

    void loadGps001WorkingDays();

    return () => {
      ignore = true;
    };
  }, [selectedHistoryDay]);

  useEffect(() => {
    if (viewMode !== "history" || !selectedUnitId) return;

    let ignore = false;

    const visibleDates = Array.from(
      { length: new Date(historyMonth.getFullYear(), historyMonth.getMonth() + 1, 0).getDate() },
      (_, index) => new Date(historyMonth.getFullYear(), historyMonth.getMonth(), index + 1)
    );

    const datesToCheck = visibleDates.filter((dateValue) => {
      if (isFutureDate(dateValue)) return false;
      const dayKey = `${selectedUnitId}:${toYmd(dateValue)}`;
      return historyDataByDate[dayKey] === undefined;
    });

    if (!datesToCheck.length) {
      return;
    }

    const preloadVisibleMonthDateStatus = async () => {
      if (!isGps51UnitSelected) {
        if (ignore) return;
        setHistoryDataByDate((prev) => {
          const next = { ...prev };
          for (const dateValue of datesToCheck) {
            next[`${selectedUnitId}:${toYmd(dateValue)}`] = "has-data";
          }
          return next;
        });
        return;
      }

      if (!GPS51_USERNAME || !GPS51_PASSWORD) {
        if (ignore) return;
        setHistoryDataByDate((prev) => {
          const next = { ...prev };
          for (const dateValue of datesToCheck) {
            next[`${selectedUnitId}:${toYmd(dateValue)}`] = "unknown";
          }
          return next;
        });
        return;
      }

      const resolvedStatuses = await Promise.all(
        datesToCheck.map(async (dateValue) => {
          const ymd = toYmd(dateValue);
          try {
            const summary = await fetchDailyHistorySummary(GPS51_USERNAME, GPS51_PASSWORD, ymd);
            return {
              key: `${selectedUnitId}:${ymd}`,
              status: summary ? "has-data" : "no-data",
            } as const;
          } catch {
            return {
              key: `${selectedUnitId}:${ymd}`,
              status: "unknown",
            } as const;
          }
        })
      );

      if (ignore) return;

      setHistoryDataByDate((prev) => {
        const next = { ...prev };
        for (const status of resolvedStatuses) {
          next[status.key] = status.status;
        }
        return next;
      });
    };

    void preloadVisibleMonthDateStatus();

    return () => {
      ignore = true;
    };
  }, [
    viewMode,
    selectedUnitId,
    historyMonth,
    isGps51UnitSelected,
    historyDataByDate,
  ]);

  useEffect(() => {
    if (viewMode !== "history" || !selectedUnitId) return;

    let ignore = false;
    let refreshInterval: ReturnType<typeof setInterval> | null = null;

    const loadHistory = async () => {
      if (isFutureHistoryDate) {
        setHistoryLoading(false);
        setHistoryError(null);
        setHistoryRows([]);
        setHistoryDateStatus("offline");
        setHistoryDataByDate((prev) => ({
          ...prev,
          [selectedHistoryKey]: "no-data",
        }));
        return;
      }

      const isTodaySelection = selectedHistoryDay === toYmd(new Date());
      const allCachedTableData = readCachedHistoryTableData();
      const allCachedTimestamps = readCachedHistoryTableTodayTimestamps();

      // Check if we can use cached data (past dates: always, today: within 5 minutes)
      const cachedRows = allCachedTableData[selectedHistoryKey];
      const cachedTimestamp = allCachedTimestamps[selectedHistoryKey];
      const now = Date.now();
      const isPastDate = isHistoryKeyPastDate(selectedHistoryKey);
      const isCacheValid = cachedRows && (
        isPastDate || 
        (isTodaySelection && cachedTimestamp && (now - cachedTimestamp) < 5 * 60 * 1000)
      );

      // Use cached data if available and valid
      if (isCacheValid && cachedRows) {
        setHistoryLoading(false);
        setHistoryError(null);
        setHistoryRows(cachedRows);
        setHistoryDateStatus("parking");
        setHistoryDataByDate((prev) => ({
          ...prev,
          [selectedHistoryKey]: "has-data",
        }));
        return;
      }

      // For today, if cache is expired, still show cached data while fetching in background
      if (isTodaySelection && cachedRows && cachedTimestamp && !isPastDate) {
        // Show cached data immediately while refreshing in background
        setHistoryLoading(false);
        setHistoryError(null);
        setHistoryRows(cachedRows);
        setHistoryDateStatus("parking");
      } else {
        setHistoryLoading(true);
      }
      setHistoryError(null);
      try {
        if (isGps51UnitSelected) {
          if (!GPS51_USERNAME || !GPS51_PASSWORD) {
            throw new Error("GPS51 credentials are missing");
          }
          const summary = await fetchDailyHistorySummary(GPS51_USERNAME, GPS51_PASSWORD, selectedHistoryDay);
          if (!ignore) {
            if (summary) {
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
              const equipmentId = unitIdToSeedEquipmentId[selectedUnitLabel.trim().toUpperCase()] || selectedUnitLabel;
              setHistoryRows([buildHistoryRowFromSummary(equipmentId, selectedUnitLabel, summary)]);
              // Cache the table data
              const historyRow = buildHistoryRowFromSummary(equipmentId, selectedUnitLabel, summary);
              const newTableCache = { ...allCachedTableData, [selectedHistoryKey]: [historyRow] };
              writeCachedHistoryTableData(newTableCache);
              // Update today's timestamp if this is today
              if (isTodaySelection) {
                const newTimestamps = { ...allCachedTimestamps, [selectedHistoryKey]: Date.now() };
                writeCachedHistoryTableTodayTimestamps(newTimestamps);
              }
              setHistoryDataByDate((prev) => ({
                ...prev,
                [selectedHistoryKey]: "has-data",
              }));
            } else {
              logFleetHistory("gps001.history.no-activity", {
                selectedHistoryDay,
                reason: "fetchDailyHistorySummary returned null",
              });
              setHistoryDateStatus("offline");
              setHistoryRows([]);
              setHistoryDataByDate((prev) => ({
                ...prev,
                [selectedHistoryKey]: "no-data",
              }));
            }
          }
          return;
        }

        if (!ignore) {
          const equipmentId = unitIdToSeedEquipmentId[selectedUnitLabel.trim().toUpperCase()] || selectedUnitLabel;
          setHistoryRows([buildMockHistoryRow(equipmentId, selectedUnitLabel, selectedHistoryDate, selectedUnitId)]);
          // Cache the table data
          const mockRow = buildMockHistoryRow(equipmentId, selectedUnitLabel, selectedHistoryDate, selectedUnitId);
          const newTableCache = { ...allCachedTableData, [selectedHistoryKey]: [mockRow] };
          writeCachedHistoryTableData(newTableCache);
          // Update today's timestamp if this is today
          if (isTodaySelection) {
            const newTimestamps = { ...allCachedTimestamps, [selectedHistoryKey]: Date.now() };
            writeCachedHistoryTableTodayTimestamps(newTimestamps);
          }
          setHistoryDataByDate((prev) => ({
            ...prev,
            [selectedHistoryKey]: "has-data",
          }));
        }
      } catch (error: any) {
        if (!ignore) {
          setHistoryRows([]);
          setHistoryError(error?.message ?? "Failed to load history data");
          setHistoryDataByDate((prev) => ({
            ...prev,
            [selectedHistoryKey]: "unknown",
          }));
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
          }, 5 * 60 * 1000); // 5-minute refresh window matching cache expiration
    }

    return () => {
      ignore = true;
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [
    viewMode,
    selectedUnitId,
    selectedHistoryDay,
    isGps51UnitSelected,
    selectedUnitLabel,
    selectedHistoryDate,
    isFutureHistoryDate,
    selectedHistoryKey,
  ]);

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
  const handleSubmitEquipment = async (equipment: ModalEquipment) => {
    const hasExisting = addedEquipment.some((entry) => entry.id === equipment.id);
    const editingId = editingEquipment?.id ?? equipment.id;
    const isEditFlow = editingEquipment !== null;
    const isSeedEquipmentEdit = editingId.startsWith("seed-");
    const seedEquipmentId = isSeedEquipmentEdit ? editingId.replace(/^seed-/, "") : null;
    const isLiveMappedSeedEquipmentEdit = Boolean(seedEquipmentId && LIVE_SEED_EQUIPMENT_IDS.has(seedEquipmentId));
    const pmsConfiguration = equipment.pmsConfiguration
      ? {
          serviceInterval: equipment.pmsConfiguration.serviceInterval,
          // Keep legacy alias for older tRPC input typing during transition.
          serviceIntervalHours: equipment.pmsConfiguration.serviceInterval,
          serviceIntervalUnit: equipment.pmsConfiguration.serviceIntervalUnit,
          ...(equipment.pmsConfiguration.serviceType
            ? { serviceType: equipment.pmsConfiguration.serviceType }
            : {}),
        }
      : undefined;

    const seedClient = seedData.clients.find((entry) =>
      Number(String(entry.id).replace(/\D/g, "")) === equipment.clientId
    );

    if (!seedClient) {
      throw new Error("Unable to map selected client to seed data.");
    }

    if (isSeedEquipmentEdit && seedEquipmentId) {
      const updateResult = await updateSeedEquipmentMutation.mutateAsync({
        id: seedEquipmentId,
        name: equipment.name,
        equipmentType: equipment.type,
        clientId: seedClient.id,
        serialNumber: equipment.serialNumber?.trim() || undefined,
        notes: equipment.notes?.trim() || undefined,
        image: equipment.image,
        ...(pmsConfiguration ? { pmsConfiguration } : {}),
      });

      if ((updateResult.entry as any)?.id) {
        const updatedId = String((updateResult.entry as any).id);
        setSeedImageOverrides((prev) => ({
          ...prev,
          [updatedId]: (updateResult.entry as any).image,
        }));
      }

      // Live-mapped seed-backed cards are rendered from the fleet store, so avoid creating local duplicates.
      if (isLiveMappedSeedEquipmentEdit) {
        setEditingEquipment(null);
        return;
      }

      // Non-live seed entries should still flow through the local sidebar list.
      setEditingEquipment(null);
    }

    let createdSeedEntry: {
      id?: string;
      lat?: number;
      lng?: number;
      hoursToday?: string;
      hoursTotal?: string;
    } | null = null;

    if (!isEditFlow && !hasExisting) {
      const addResult = await addSeedEquipmentMutation.mutateAsync({
        name: equipment.name,
        equipmentType: equipment.type,
        clientId: seedClient.id,
        serialNumber: equipment.serialNumber?.trim() || undefined,
        notes: equipment.notes?.trim() || undefined,
        image: equipment.image,
        ...(pmsConfiguration ? { pmsConfiguration } : {}),
      });
      createdSeedEntry = {
        id: (addResult.entry as any).id,
        lat: (addResult.entry as any).lat,
        lng: (addResult.entry as any).lng,
        hoursToday: (addResult.entry as any).hoursToday,
        hoursTotal: (addResult.entry as any).hoursTotal,
      };

      if ((addResult.entry as any)?.id) {
        const createdId = String((addResult.entry as any).id);
        setSeedImageOverrides((prev) => ({
          ...prev,
          [createdId]: (addResult.entry as any).image,
        }));
      }
    }

    setAddedEquipment((prev) => {
      const existingIndex = prev.findIndex((entry) =>
        entry.id === equipment.id || (isEditFlow && editingEquipment ? entry.id === editingEquipment.id : false)
      );

      if (existingIndex === -1) {
        if (isEditFlow) {
          return prev;
        }
        return [
          ...prev,
          {
            ...equipment,
            ...(createdSeedEntry?.id ? { id: `seed-${createdSeedEntry.id}` } : {}),
            ...(createdSeedEntry?.lat !== undefined
              ? {
                  lat: createdSeedEntry.lat,
                  lng: createdSeedEntry.lng,
                  hoursToday: createdSeedEntry.hoursToday ?? equipment.hoursToday,
                  hoursTotal: createdSeedEntry.hoursTotal ?? equipment.hoursTotal,
                }
              : {}),
          },
        ];
      }

      return prev.map((entry) =>
        entry.id === prev[existingIndex].id
          ? { ...equipment, id: prev[existingIndex].id }
          : entry
      );
    });
    setEditingEquipment(null);
  };

  const handleEquipmentModalOpenChange = (open: boolean) => {
    setAddEquipmentOpen(open);
    if (!open) {
      setEditingEquipment(null);
    }
  };

  const handleConfirmDeleteEquipment = async () => {
    if (!pendingDeleteEquipmentId) return;

    const seedIdFromPending = pendingDeleteEquipmentId.startsWith("seed-")
      ? pendingDeleteEquipmentId.replace(/^seed-/, "")
      : null;

    if (seedIdFromPending === "EQ-001") {
      toast.error("Excavator CAT 320 cannot be deleted.");
      setPendingDeleteEquipmentId(null);
      return;
    }

    if (seedIdFromPending) {
      try {
        await deleteSeedEquipmentMutation.mutateAsync({ id: seedIdFromPending });
      } catch (error: any) {
        toast.error(error?.message ?? "Failed to delete equipment from seed data.");
        setPendingDeleteEquipmentId(null);
        return;
      }
    }

    setAddedEquipment((prev) => prev.filter((entry) => entry.id !== pendingDeleteEquipmentId));
    setPendingDeleteEquipmentId(null);
  };

  return (
    <div className="flex h-[calc(100vh-40px)] min-h-0 flex-col gap-4 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-[32px] font-bold text-gray-900  tracking-[-0.02em]">Fleet Intelligence</h1>
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

      <div className="flex gap-4 flex-1 min-h-0 overflow-hidden">
        {/* Map */}
        <div className="flex-1 data-card overflow-hidden relative min-h-0">
          <div className="absolute top-3 left-3 right-3 z-[1000] flex items-start justify-between gap-3 pointer-events-none">
            <div className="flex items-center rounded border border-white/10 bg-[#050505]/70 p-1 backdrop-blur pointer-events-auto">
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
            <div className="rounded border border-white/10 bg-[#050505]/70 px-2.5 py-1.5 backdrop-blur pointer-events-auto">
              <div className="flex items-center gap-3 text-[10px] text-[#B5B5B8]">
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
                  Has data
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#F2A900]" />
                  Future
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#EF4444]" />
                  No data
                </span>
              </div>
            </div>
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
                }).map((unit) => {
                  const eq = equipment.find((entry) => entry.id === unit.equipmentId);
                  const unitLabelText = eq?.unitId || unit.unitName || "";
                  const seedDisplay = getSeedDisplayForUnit(unitLabelText);

                  return (
                    <Marker
                      key={unit.id}
                      position={[unit.telemetry.lat, unit.telemetry.lng]}
                      icon={statusIcon(getEffectiveStatus(unit.id, unit.telemetry.status))}
                      eventHandlers={{
                        click: () => {
                          selectUnit(unit.id);
                          setSelectedAddedEquipmentId(null);
                        },
                      }}
                    >
                      <Popup className="dark-popup">
                        <div className="bg-[#121214] p-2 min-w-[180px]">
                          <div className="text-xs font-bold text-[#EAEAEA] mb-1">{unit.unitName}</div>
                          <div className="text-[10px] text-[#88888C] space-y-0.5">
                            <div>Status: <span className={statusTextClass(getEffectiveStatus(unit.id, unit.telemetry.status))}>{getEffectiveStatus(unit.id, unit.telemetry.status)}</span></div>
                            {seedDisplay?.equipmentType && <div>Type: {seedDisplay.equipmentType}</div>}
                            <div>Speed: {unit.telemetry.speed} mph</div>
                            <div>Hours: {formatHoursMinutes(unit.telemetry)}</div>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
                {/* Pulse effect for selected unit */}
                {/* Simulated equipment markers */}
                {addedEquipment
                  .filter((eq) => typeof eq.lat === "number" && typeof eq.lng === "number")
                  .map((eq) => {
                    const addedSeedEntry = eq.id.startsWith("seed-")
                      ? seedData.equipment.find((entry) => `seed-${entry.id}` === eq.id) ?? null
                      : null;
                    const addedServiceStatus = computeServiceStatusFromAddedEntry(eq, addedSeedEntry);

                    return (
                      <Marker
                        key={`sim-${eq.id}`}
                        position={[eq.lat!, eq.lng!]}
                        icon={defaultIcon}
                      >
                        <Popup className="dark-popup">
                          <div className="bg-[#121214] p-2 min-w-[180px]">
                            <div className="text-xs font-bold text-[#EAEAEA] mb-1">{eq.name}</div>
                            <div className="text-[10px] text-[#88888C] space-y-0.5">
                              {addedServiceStatus && (
                                <div>
                                  Status: <span className={serviceStatusTextClass(addedServiceStatus)}>{addedServiceStatus}</span>
                                </div>
                              )}
                              {eq.type && <div>Type: {eq.type}</div>}
                              <div>Hours: {(addedSeedEntry as any)?.hoursTotal ?? eq.hoursTotal}</div>
                            </div>
                          </div>
                        </Popup>
                      </Marker>
                    );
                  })}
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
                    {selectedSeedDisplay?.equipmentType && (
                      <div className="flex justify-between">
                        <span className="text-[#88888C]">Type</span>
                        <span className="text-[#EAEAEA]">{selectedSeedDisplay.equipmentType}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-[#88888C]">Engine Hours</span>
                      <span className="text-[#F2A900]">{formatHoursMinutes(selectedUnit.telemetry)}</span>
                    </div>
                    {selectedServiceStatus && (
                      <div className="flex items-center gap-1 mt-1 pt-1 border-t border-white/5">
                        {selectedServiceStatus === "OK" ? (
                          <span className={`h-2 w-2 rounded-full ${serviceStatusDotClass(selectedServiceStatus)}`} />
                        ) : (
                          <AlertTriangle className={`w-3 h-3 ${serviceStatusTextClass(selectedServiceStatus)}`} />
                        )}
                        <span className={serviceStatusTextClass(selectedServiceStatus)}>{selectedServiceStatus}</span>
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
                    const dayKey = `${selectedUnitId ?? "none"}:${toYmd(dateValue)}`;
                    const isFutureCalendarDate = isFutureDate(dateValue);
                    const dateStatus = historyDataByDate[dayKey] ?? "unknown";
                    const dotClass = isFutureCalendarDate
                      ? "bg-[#F2A900]"
                      : dateStatus === "has-data"
                      ? "bg-[#10B981]"
                      : dateStatus === "no-data"
                      ? "bg-[#EF4444]"
                      : "bg-[#6B7280]";

                    return (
                      <button
                        key={toYmd(dateValue)}
                        type="button"
                        onClick={() => setSelectedHistoryDate(dateValue)}
                        className={`h-8 rounded text-xs border transition-colors flex flex-col items-center justify-center gap-0.5 ${
                          isSelected
                            ? "bg-[#F2A900] border-[#F2A900] text-[#050505] font-semibold"
                            : isToday
                            ? "border-[#10B981] text-[#10B981]"
                            : "border-white/10 text-[#EAEAEA] hover:bg-white/10"
                        }`}
                      >
                        <span>{dateValue.getDate()}</span>
                        <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded border border-white/10 bg-[#1A1A20] overflow-auto">
                <table className="min-w-full text-[11px]">
                  <thead className="bg-[#050505]/70 text-[#F2A900]">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold">ID</th>
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
                      <tr key={`${row.id}-${index}`} className="border-t border-white/5 text-[#EAEAEA]">
                        <td className="px-3 py-2">{row.id}</td>
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
        <div className="w-[280px] data-card flex h-full min-h-0 flex-col overflow-hidden">
          <div className="p-3 border-b border-white/5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-gray-900">Fleet Units</h3>
              <span className="text-[10px] text-[#88888C]">{sidebarDateWithPrefix}</span>
            </div>
            <p className="text-[10px] text-[#88888C]">{seedData.equipment.length} units tracked</p>
          </div>

          {/* Action Buttons */}
          <div className="p-3 border-b border-white/5 flex gap-2">
            <Button
              onClick={() => {
                setEditingEquipment(null);
                setAddEquipmentOpen(true);
              }}
              className="flex-1 bg-[#F2A900] text-[#050505] hover:bg-[#F2A900]/90 font-semibold text-xs h-8"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add Equipment
            </Button>
          </div>

          <div className="flex flex-1 min-h-0 flex-col overflow-y-auto overscroll-contain divide-y divide-white/5">

            <div className="divide-y divide-white/5">
                {sortedUnits.map((unit) => {
                const eq = equipment.find((e) => e.id === unit.equipmentId);
                const client = clients.find((c) => c.id === eq?.clientId);
                const isSelected = selectedUnitId === unit.id;
                const unitLabelText = eq?.unitId || unit.unitName || "";
                const unitLabel = unitLabelText.toUpperCase();
                const isGps001 = unit.id === 1 || unitLabel === "GPS-001";
                const lookupKey = unitLabel.split(" ")[0];
                const mappedGps = (gpsNameMapping[lookupKey] || gpsNameMapping[unitLabel]) || null;
                const seedDisplay =
                  getSeedDisplayForUnit(unitLabelText) ||
                  ((mappedGps === "GPS-004" || mappedGps === "GPS-005")
                    ? getSeedDisplayForUnit(mappedGps)
                    : null);
                const clientName = seedDisplay?.clientName || client?.companyName || "—";
                const displayEquipmentName = seedDisplay?.equipmentName;
                const displayEquipmentType = seedDisplay?.equipmentType;
                const seedEntry = displayEquipmentName
                  ? seedData.equipment.find((s) => s.name === displayEquipmentName)
                  : null;
                const serviceStatus = computeServiceStatusFromSeedEntry(seedEntry);
                const seedEntryImage = seedEntry?.id
                  ? seedImageOverrides[seedEntry.id] ?? (seedEntry as any)?.image
                  : undefined;
                const isProtectedEquipment =
                  seedEntry?.id === "EQ-001" || displayEquipmentName === PROTECTED_EQUIPMENT_NAME;
                const useSeedAsTitle =
                  mappedGps === "GPS-001" ||
                  mappedGps === "GPS-002" ||
                  mappedGps === "GPS-003" ||
                  mappedGps === "GPS-004" ||
                  mappedGps === "GPS-005" ||
                  unitLabel === "GPS-006";
                const displayHeader = useSeedAsTitle && seedDisplay?.equipmentName ? seedDisplay.equipmentName : (mappedGps || eq?.unitId || unit.unitName);

                const isDemoZero = (demoStages[unit.id] ?? 0) === 1;
                const selectedHistoryWorkingText =
                  viewMode === "history" &&
                  isSelected &&
                  isGps001 &&
                  !historyLoading &&
                  !historyError &&
                  historyRows.length > 0
                    ? (historyRows[0]?.working ?? "")
                    : "";

                const hoursTodayText = isDemoZero
                  ? "0h 0m"
                  : selectedHistoryWorkingText
                  ? selectedHistoryWorkingText
                  : isGps001
                  ? formatHoursFromMsForSidebar(gps001HoursTodayMs)
                  : ((seedEntry as any)?.hoursToday ?? STATIC_HOURS_BY_UNIT[unitLabel]?.today ?? FALLBACK_STATIC_HOURS.today);

                const hoursTotalText = isDemoZero
                  ? "0h 0m"
                  : isGps001
                  ? formatHoursFromMsForSidebar(gps001HoursTotalMs)
                  : ((seedEntry as any)?.hoursTotal ?? STATIC_HOURS_BY_UNIT[unitLabel]?.total ?? FALLBACK_STATIC_HOURS.total);

                const historyRowKmToday =
                  viewMode === "history" &&
                  isSelected &&
                  isGps001 &&
                  !historyLoading &&
                  !historyError &&
                  historyRows.length > 0
                    ? parseHistoryMileageKm(historyRows[0]?.mileage)
                    : null;

                const seedKmTodayValue = parseSeedKm((seedEntry as any)?.kmToday);
                const seedKmTotalValue = parseSeedKm((seedEntry as any)?.kmTotal);
                const seedDaysValue = parseSeedDays((seedEntry as any)?.days);
                const resolvedDays = isGps001 ? gps001WorkingDays : seedDaysValue;
                const daysText = formatDaysForSidebar(resolvedDays);
                const dayPeriodsText = formatDayPeriodsForSidebar(resolvedDays);

                const kmTodayText = isGps001
                  ? formatHistoryKm(historyRowKmToday ?? gps001KmToday)
                  : (seedKmTodayValue !== null ? formatSidebarKm(seedKmTodayValue) : "—km");
                const kmTotalText = isGps001
                  ? formatHistoryKm(gps001KmTotal)
                  : (seedKmTotalValue !== null ? formatSidebarKm(seedKmTotalValue) : "—km");

                return (
                  <button
                    key={unit.id}
                    onClick={() => {
                      selectUnit(unit.id);
                      setSelectedAddedEquipmentId(null);
                    }}
                    className={`w-full p-3 text-left transition-colors ${
                      isSelected ? "bg-[#F2A900]/10" : "hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-11 w-11 shrink-0 overflow-hidden rounded-md border border-white/10 bg-[#121214]">
                        {seedEntryImage ? (
                          <img
                            src={seedEntryImage}
                            alt={`${displayHeader} image`}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[#6B7280]">
                            <Wrench className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-start justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-1.5">
                            <div
                              className={`w-2 h-2 rounded-full ${statusDotClass(getEffectiveStatus(unit.id, unit.telemetry.status))}`}
                              onDoubleClick={(e) => {
                                // Three-stage demo cycle for Concrete Strength Tester only (visual-only)
                                try {
                                  const name = displayEquipmentName || "";
                                  if (name === "Concrete Strength Tester") {
                                    e.stopPropagation();
                                    const current = demoStages[unit.id] ?? 0;
                                    const next = (current + 1) % 3;
                                    // Keep the original toast exactly on the first double-click only
                                    if (current === 0) {
                                      const pmsList = (seedData as any).pmsConfigurations || [];
                                      const labCfg = pmsList.find((c: any) => typeof c.equipmentType === "string" && c.equipmentType.toLowerCase().includes("lab"));
                                      const interval = labCfg?.serviceInterval ?? 4000;
                                      const unitText = labCfg?.serviceIntervalUnit ?? "Hours";
                                      const unitDisplay = String(unitText).toLowerCase() === "km" ? "Km" : unitText;
                                      const serviceType = labCfg?.serviceType ?? "PMS (Preventative Maintenance)";
                                      toast(
                                        `${interval} ${unitDisplay} achieved with Concrete Strength Tester – ${serviceType} needed`,
                                        { style: { color: "#FFFFFF" } }
                                      );
                                    }
                                    setDemoStages((prev) => ({ ...prev, [unit.id]: next }));
                                  }
                                } catch (err) {
                                  // swallow errors to avoid affecting UI
                                }
                              }}
                            />
                            <span className="truncate text-xs font-medium text-gray-900">{displayHeader}</span>
                          </div>
                          <div className="relative" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          aria-label="Equipment options"
                          onClick={(e) => {
                            e.stopPropagation();
                            const menuId = `unit-${unit.id}`;
                            setOpenCardMenuId((prev) => (prev === menuId ? null : menuId));
                          }}
                          className="flex h-6 w-6 items-center justify-center rounded text-[#88888C] hover:bg-white/10 hover:text-[#EAEAEA] transition-colors"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>
                        {openCardMenuId === `unit-${unit.id}` && (
                          <div className="absolute right-0 top-7 z-50 min-w-[120px] rounded border border-white/10 bg-[#1A1A20] py-1 shadow-lg">
                            <button
                              type="button"
                              className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-[#EAEAEA] hover:bg-white/10 transition-colors"
                              onClick={() => {
                                setOpenCardMenuId(null);
                                const eqEntry = equipment.find((e) => e.id === unit.equipmentId);
                                let modalEq: ModalEquipment | null = null;
                                if (displayEquipmentName) {
                                  const seedEntry = seedData.equipment.find((s) => s.name === displayEquipmentName);
                                  const clientNum = seedClientsForModal.find((c) => c.companyName === seedEntry?.clientId || c.companyName === seedDisplay?.clientName)?.id;
                                  modalEq = {
                                    id: seedEntry?.id ? `seed-${seedEntry.id}` : `unit-${unit.id}`,
                                    name: seedEntry?.name || displayHeader || unit.unitName || "",
                                    type: seedEntry?.equipmentType || displayEquipmentType || eqEntry?.equipmentType || "",
                                    clientId: clientNum || (client?.id ?? 0),
                                    serialNumber: (seedEntry as any)?.serialNumber || "",
                                    image: (seedEntry as any)?.image,
                                    notes: (seedEntry as any)?.notes ?? "",
                                    hoursToday: "",
                                    hoursTotal: "",
                                    pmsConfiguration: (seedEntry as any)?.pmsConfiguration,
                                  };
                                } else if (eqEntry) {
                                  modalEq = {
                                    id: String(eqEntry.id),
                                    name: eqEntry.type || eqEntry.unitId || unit.unitName || "",
                                    type: eqEntry.equipmentType || "",
                                    clientId: eqEntry.clientId || 0,
                                    serialNumber: eqEntry.serialNumber || "",
                                    image: (eqEntry as any)?.image,
                                    notes: "",
                                    hoursToday: "",
                                    hoursTotal: "",
                                    pmsConfiguration: (eqEntry as any)?.pmsConfiguration,
                                  };
                                }
                                if (modalEq) {
                                  setEditingEquipment(modalEq);
                                  setAddEquipmentOpen(true);
                                }
                              }}
                            >
                              <Pencil className="w-3 h-3 text-[#88888C]" />
                              Edit
                            </button>
                            <button
                              type="button"
                              disabled={isProtectedEquipment}
                              className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                              onClick={() => {
                                setOpenCardMenuId(null);
                                if (isProtectedEquipment) {
                                  toast.error("Excavator CAT 320 cannot be deleted.");
                                  return;
                                }
                                const delId = seedEntry?.id ? `seed-${seedEntry.id}` : String(unit.id);
                                setPendingDeleteEquipmentId(delId);
                              }}
                            >
                              <Trash2 className="w-3 h-3" />
                              Delete
                            </button>
                          </div>
                        )}
                          </div>
                        </div>
                        <div className="text-[10px] text-[#88888C] space-y-0.5">
                          <div>{clientName}</div>
                          {displayEquipmentName && !useSeedAsTitle && <div>{displayEquipmentName}</div>}
                          {displayEquipmentType && <div>Type: {displayEquipmentType}</div>}
                          <div className="space-y-0.5 pt-0.5">
                            <div>Today: {hoursTodayText} / {kmTodayText}</div>
                            <div>Total: {hoursTotalText} / {kmTotalText}</div>
                            <div>Days: {daysText}</div>
                            {dayPeriodsText && <div>Approx: {dayPeriodsText}</div>}
                          </div>
                          {serviceStatus && (
                            <div className={`flex items-center gap-1 ${serviceStatusTextClass(serviceStatus)}`}>
                              {serviceStatus === "OK" ? (
                                <span className={`h-2 w-2 rounded-full ${serviceStatusDotClass(serviceStatus)}`} />
                              ) : (
                                <AlertTriangle className="w-2.5 h-2.5" />
                              )}
                              <span>{serviceStatus}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
              {addedEquipment.map((eq) => {
                const eqClient = seedClientsForModal.find((c) => c.id === eq.clientId) || clients.find((c) => c.id === eq.clientId);
                const addedSeedEntry = eq.id.startsWith("seed-")
                  ? seedData.equipment.find((entry) => `seed-${entry.id}` === eq.id) ?? null
                  : null;
                const addedServiceStatus = computeServiceStatusFromAddedEntry(eq, addedSeedEntry);
                const addedKmTodayValue = parseSeedKm((addedSeedEntry as any)?.kmToday ?? (eq as any)?.kmToday);
                const addedKmTotalValue = parseSeedKm((addedSeedEntry as any)?.kmTotal ?? (eq as any)?.kmTotal);
                const addedDaysValue = parseSeedDays((addedSeedEntry as any)?.days ?? (eq as any)?.days);
                const addedDayPeriodsText = formatDayPeriodsForSidebar(addedDaysValue);
                const isProtectedEquipment =
                  eq.name === PROTECTED_EQUIPMENT_NAME || eq.id === "seed-EQ-001" || eq.id === "EQ-001";
                const isSelectedAddedEquipment = selectedAddedEquipmentId === eq.id;
                return (
                  <button
                    key={eq.id}
                    type="button"
                    onClick={() => {
                      setSelectedAddedEquipmentId(eq.id);
                      selectUnit(null);
                      if (typeof eq.lat === "number" && typeof eq.lng === "number") {
                        setMapCenter([eq.lat, eq.lng]);
                      }
                    }}
                    className={`w-full p-3 text-left transition-colors ${
                      isSelectedAddedEquipment ? "bg-[#F2A900]/10" : "hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-11 w-11 shrink-0 overflow-hidden rounded-md border border-white/10 bg-[#121214]">
                        {eq.image ? (
                          <img
                            src={eq.image}
                            alt={`${eq.name} image`}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[#6B7280]">
                            <Wrench className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-start justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-1.5">
                            <div
                              className={`w-2 h-2 rounded-full ${
                                addedServiceStatus
                                  ? serviceStatusDotClass(addedServiceStatus)
                                  : "bg-[#F2A900]"
                              }`}
                            />
                            <span className="truncate text-xs font-medium text-[#EAEAEA]">{eq.name}</span>
                          </div>
                          <div className="relative" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          aria-label="Equipment options"
                          onClick={(e) => {
                            e.stopPropagation();
                            const menuId = `added-${eq.id}`;
                            setOpenCardMenuId((prev) => (prev === menuId ? null : menuId));
                          }}
                          className="flex h-6 w-6 items-center justify-center rounded text-[#88888C] hover:bg-white/10 hover:text-[#EAEAEA] transition-colors"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>
                        {openCardMenuId === `added-${eq.id}` && (
                          <div className="absolute right-0 top-7 z-50 min-w-[120px] rounded border border-white/10 bg-[#1A1A20] py-1 shadow-lg">
                            <button
                              type="button"
                              className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-[#EAEAEA] hover:bg-white/10 transition-colors"
                              onClick={() => {
                                setOpenCardMenuId(null);
                                setEditingEquipment(eq);
                                setAddEquipmentOpen(true);
                              }}
                            >
                              <Pencil className="w-3 h-3 text-[#88888C]" />
                              Edit
                            </button>
                            <button
                              type="button"
                              disabled={isProtectedEquipment}
                              className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                              onClick={() => {
                                setOpenCardMenuId(null);
                                if (isProtectedEquipment) {
                                  toast.error("Excavator CAT 320 cannot be deleted.");
                                  return;
                                }
                                setPendingDeleteEquipmentId(eq.id);
                              }}
                            >
                              <Trash2 className="w-3 h-3" />
                              Delete
                            </button>
                          </div>
                        )}
                          </div>
                        </div>
                        <div className="text-[10px] text-[#88888C] space-y-0.5">
                          <div>{eqClient?.companyName || "—"}</div>
                          <div>Type: {eq.type}</div>
                          <div className="space-y-0.5 pt-0.5">
                            <div>Today: {((addedSeedEntry as any)?.hoursToday ?? eq.hoursToday) || "—"} / {addedKmTodayValue !== null ? formatSidebarKm(addedKmTodayValue) : "—km"}</div>
                            <div>Total: {((addedSeedEntry as any)?.hoursTotal ?? eq.hoursTotal) || "—"} / {addedKmTotalValue !== null ? formatSidebarKm(addedKmTotalValue) : "—km"}</div>
                            <div>Days: {formatDaysForSidebar(addedDaysValue)}</div>
                            {addedDayPeriodsText && <div>Approx: {addedDayPeriodsText}</div>}
                          </div>
                          {addedServiceStatus && (
                            <div className={`flex items-center gap-1 ${serviceStatusTextClass(addedServiceStatus)}`}>
                              {addedServiceStatus === "OK" ? (
                                <span className={`h-2 w-2 rounded-full ${serviceStatusDotClass(addedServiceStatus)}`} />
                              ) : (
                                <AlertTriangle className="w-2.5 h-2.5" />
                              )}
                              <span>{addedServiceStatus}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <AddEquipmentModal
        open={addEquipmentOpen}
        onOpenChange={handleEquipmentModalOpenChange}
        clients={seedClientsForModal}
        onSubmitEquipment={handleSubmitEquipment}
        initialEquipment={editingEquipment}
        equipmentTypeOptions={seedEquipmentTypeOptions}
        serviceTypeOptions={seedServiceTypeOptions}
      />

      <AlertDialog
        open={pendingDeleteEquipmentId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDeleteEquipmentId(null);
          }
        }}
      >
        <AlertDialogContent className="bg-[#1A1A20] border border-white/10 text-[#EAEAEA]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#EAEAEA]">Delete Equipment</AlertDialogTitle>
            <AlertDialogDescription className="text-[#88888C]">
              This action is permanent and cannot be undone. Are you sure you want to delete this equipment entry?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 text-[#EAEAEA] hover:bg-white/10">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteEquipment}
              className="bg-[#EF4444] text-white hover:bg-[#EF4444]/90"
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
