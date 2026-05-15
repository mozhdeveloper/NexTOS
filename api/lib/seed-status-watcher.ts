import { promises as fs } from "node:fs";
import path from "node:path";
import { watch } from "node:fs";

interface SeedEquipmentEntry {
  id: string;
  name: string;
  clientId: string;
  equipmentType: string;
  hoursToday?: string;
  hoursTotal?: string;
  kmToday?: number | string;
  kmTotal?: number | string;
  days?: number | string;
  status?: "OK" | "Near Service" | "Overdue";
  pmsConfiguration?: {
    serviceInterval: number;
    serviceIntervalUnit: "Hours" | "KM" | "Km" | "Weeks" | "Months" | "Years";
    serviceType?: string;
  };
}

interface SeedDataShape {
  equipment?: SeedEquipmentEntry[];
  [key: string]: unknown;
}

function getSeedDataPath(): string {
  return path.resolve(process.cwd(), "src/data/seed-data.json");
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

function parseNumericMetric(value: number | string | undefined): number | null {
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

function convertDaysToPeriods(days: number): { weeks: number; months: number; years: number } {
  return {
    weeks: days / 7,
    months: days / 30.44,
    years: days / 365.25,
  };
}

function calculateServiceStatus(entry: SeedEquipmentEntry): "OK" | "Near Service" | "Overdue" | null {
  if (entry.id === "EQ-001") {
    return null;
  }

  const pms = entry.pmsConfiguration;
  if (!pms) {
    return null;
  }

  const interval = Number(pms.serviceInterval ?? 0);
  if (!Number.isFinite(interval) || interval <= 0) {
    return null;
  }

  const unit = String(pms.serviceIntervalUnit ?? "Hours").toLowerCase();

  let usage: number | null = null;
  if (unit === "hours") {
    usage = parseHoursTextToHours(entry.hoursTotal);
  } else if (unit === "km") {
    usage = parseNumericMetric(entry.kmTotal);
  } else {
    const days = parseNumericMetric(entry.days);
    if (days !== null) {
      const periods = convertDaysToPeriods(days);
      if (unit === "weeks") usage = periods.weeks;
      if (unit === "months") usage = periods.months;
      if (unit === "years") usage = periods.years;
    }
  }

  if (usage === null || !Number.isFinite(usage) || usage < 0) {
    return null;
  }

  const progress = (usage / interval) * 100;
  if (progress >= 100) return "Overdue";
  if (progress >= 80) return "Near Service";
  return "OK";
}

async function recalculateAndPersistStatuses(): Promise<void> {
  try {
    const seedDataPath = getSeedDataPath();
    const raw = await fs.readFile(seedDataPath, "utf-8");
    const parsed = JSON.parse(raw) as SeedDataShape;

    if (!Array.isArray(parsed.equipment)) {
      return;
    }

    let hasChanges = false;
    const updated = parsed.equipment.map((entry) => {
      if (entry.id === "EQ-001") {
        return entry;
      }

      const newStatus = calculateServiceStatus(entry);
      const oldStatus = entry.status;

      // Only mark as changed if status actually differs
      if (newStatus !== oldStatus) {
        hasChanges = true;
        if (!newStatus) {
          const { status: _status, ...rest } = entry;
          return rest;
        }
        return {
          ...entry,
          status: newStatus,
        };
      }

      return entry;
    });

    if (hasChanges) {
      parsed.equipment = updated;
      await fs.writeFile(seedDataPath, `${JSON.stringify(parsed, null, 4)}\n`, "utf-8");
      console.log("[SeedStatusWatcher] Status values updated in seed-data.json");
    }
  } catch (error) {
    console.error("[SeedStatusWatcher] Error recalculating statuses:", error);
  }
}

let watcherInitialized = false;
let lastWriteTime = 0;
let recalculationTimeout: NodeJS.Timeout | null = null;

export function initializeSeedStatusWatcher(): void {
  if (watcherInitialized) {
    return;
  }

  const seedDataPath = getSeedDataPath();

  try {
    watch(seedDataPath, { persistent: true }, async (eventType, filename) => {
      if (!filename || eventType !== "change") {
        return;
      }

      const now = Date.now();
      // Debounce: only process if at least 1 second has passed since last write
      if (now - lastWriteTime < 1000) {
        return;
      }

      // Clear any pending recalculation
      if (recalculationTimeout) {
        clearTimeout(recalculationTimeout);
      }

      // Debounce by 500ms to capture multiple rapid edits
      recalculationTimeout = setTimeout(async () => {
        lastWriteTime = Date.now();
        await recalculateAndPersistStatuses();
      }, 500);
    });

    watcherInitialized = true;
    console.log("[SeedStatusWatcher] Initialized and watching seed-data.json for changes");
  } catch (error) {
    console.error("[SeedStatusWatcher] Failed to initialize:", error);
  }
}
