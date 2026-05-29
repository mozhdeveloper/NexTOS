import { authRouter } from "./auth-router";
import { createRouter, publicQuery } from "./middleware";
import { z } from "zod";
import { promises as fs } from "node:fs";
import { getSeedDataPath, writeSeedData } from "./lib/seed-writer";

type PmsConfigEntry = {
  serviceInterval: number;
  serviceIntervalUnit: "Hours" | "KM" | "Km" | "Weeks" | "Months" | "Years";
  serviceType?: string;
  estimatedCost?: number;
};

type SeedEquipmentEntry = {
  id: string;
  name: string;
  clientId: string;
  equipmentType: string;
  serialNumber?: string;
  notes?: string;
  image?: string;
  lat?: number;
  lng?: number;
  hoursToday?: string;
  hoursTotal?: string;
  kmToday?: number | string;
  kmTotal?: number | string;
  days?: number | string;
  status?: "OK" | "Near Service" | "Overdue";
  pmsConfiguration?: PmsConfigEntry[]; // array â€” each entry is an independent schedule
};

type SeedServiceRecord = {
  id: number;
  seedEquipmentId: string;
  pmsConfigIndex: number;
  equipmentId: number;
  clientId: number;
  serviceCategory: string;
  status: "scheduled" | "in_progress" | "completed";
  scheduledDate: string;
  completedDate?: string | null;
  technician: string;
  description: string;
  findings?: string;
  workDone?: string;
  recommendation?: string;
  partsUsed?: string;
  partsUsedDetails?: { name: string; quantity: number; pricePerUnit: number }[];
  cost?: number;
  hoursAtService?: number;
  // Rich completion fields
  equipmentName?: string;
  clientName?: string;
  equipmentType?: string;
  serialNumber?: string;
  serviceType?: string;
  serviceInterval?: number;
  serviceIntervalUnit?: string;
  metricAtService?: string;
  safetyChecklist?: { ppeChecked: boolean; engineOff: boolean; areaSecured: boolean; lotoApplied: boolean };
  beforePhoto?: string;
  beforeNotes?: string;
  afterPhoto?: string;
  afterNotes?: string;
  techSignature?: string;
  clientSignature?: string;
  // Timing & financials
  startTime?: string | null;
  endTime?: string | null;
  duration?: string | null;
  finalCost?: number | null;
  // Journey timestamps
  travelStartTime?: string | null;
  arrivalTime?: string | null;
  completionTime?: string | null;
  // Location context captured at dispatch time
  technicianAddress?: string | null;
  equipmentSiteAddress?: string | null;
  // Equipment status snapshotted at the moment the task was submitted
  equipmentStatusAtService?: string | null;
};

type SeedDataShape = {
  clients?: Array<{ id: string }>;
  equipment?: SeedEquipmentEntry[];
  serviceRecords?: SeedServiceRecord[];
  [key: string]: unknown;
};

/** Read and parse seed-data.json, stripping any UTF-8 BOM that editors like VS Code may add. */
async function readSeedData(): Promise<SeedDataShape> {
  const raw = await fs.readFile(getSeedDataPath(), "utf-8");
  // U+FEFF (BOM) at position 0 causes JSON.parse to throw - strip it defensively.
  const stripped = raw.charCodeAt(0) === 0xFEFF ? raw.slice(1) : raw;
  return JSON.parse(stripped) as SeedDataShape;
}

function getNextEquipmentId(equipment: SeedEquipmentEntry[], prefix: "EQ" | "LAB"): string {
  const maxNumber = equipment
    .filter((item) => item.id.startsWith(`${prefix}-`))
    .map((item) => Number(item.id.split("-")[1]))
    .filter((value) => Number.isFinite(value))
    .reduce((max, value) => Math.max(max, value), 0);

  return `${prefix}-${String(maxNumber + 1).padStart(3, "0")}`;
}

function buildSimulatedTelemetry(): Pick<SeedEquipmentEntry, "lat" | "lng" | "hoursToday" | "hoursTotal"> {
  // Metro Manila-ish demo bounds.
  const lat = Number((14.45 + Math.random() * 0.22).toFixed(5));
  const lng = Number((120.97 + Math.random() * 0.16).toFixed(5));
  const todayHours = Math.floor(Math.random() * 9);
  const todayMinutes = Math.floor(Math.random() * 60);
  const totalHours = 500 + Math.floor(Math.random() * 4500);
  const totalMinutes = Math.floor(Math.random() * 60);

  return {
    lat,
    lng,
    hoursToday: `${todayHours}h ${String(todayMinutes).padStart(2, "0")}m`,
    hoursTotal: `${totalHours}h ${String(totalMinutes).padStart(2, "0")}m`,
  };
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

function calculateSinglePmsStatus(
  pms: PmsConfigEntry,
  entry: SeedEquipmentEntry
): "OK" | "Near Service" | "Overdue" | null {
  const interval = Number(pms.serviceInterval ?? 0);
  if (!Number.isFinite(interval) || interval <= 0) return null;

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

  if (usage === null || !Number.isFinite(usage) || usage < 0) return null;
  const progress = (usage / interval) * 100;
  if (progress >= 100) return "Overdue";
  if (progress >= 80) return "Near Service";
  return "OK";
}

// Returns the worst status across all pmsConfiguration entries (Overdue > Near Service > OK).
function calculateServiceStatus(entry: SeedEquipmentEntry): "OK" | "Near Service" | "Overdue" | null {
  if (entry.id === "EQ-001") return null;

  const configs = Array.isArray(entry.pmsConfiguration) ? entry.pmsConfiguration : [];
  if (configs.length === 0) return null;

  const statuses = configs.map((pms) => calculateSinglePmsStatus(pms, entry));
  if (statuses.includes("Overdue")) return "Overdue";
  if (statuses.includes("Near Service")) return "Near Service";
  if (statuses.includes("OK")) return "OK";
  return null;
}

function applyComputedServiceStatuses(parsed: SeedDataShape): void {
  if (!Array.isArray(parsed.equipment)) return;

  parsed.equipment = parsed.equipment.map((entry) => {
    if (entry.id === "EQ-001") return entry;

    const status = calculateServiceStatus(entry);
    if (!status) {
      const { status: _status, ...rest } = entry;
      return rest as SeedEquipmentEntry;
    }
    return { ...entry, status };
  });
}

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  seedEquipment: createRouter({
    // Live read â€” returns the latest equipment + clients arrays from disk so the
    // frontend doesn't depend on the module-level static JSON import for status-sensitive data.
    list: publicQuery.query(async () => {
      const parsed = await readSeedData();
      return {
        equipment: Array.isArray(parsed.equipment) ? parsed.equipment : [],
        clients: Array.isArray(parsed.clients) ? parsed.clients : [],
      };
    }),

    add: publicQuery
      .input(
        z.object({
          name: z.string().min(1),
          equipmentType: z.string().min(1),
          clientId: z.string().regex(/^CL-\d{3}$/),
          serialNumber: z.string().optional(),
          notes: z.string().optional(),
          image: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const parsed = await readSeedData();

        const equipment = Array.isArray(parsed.equipment) ? parsed.equipment : [];
        const prefix: "EQ" | "LAB" = input.equipmentType.toLowerCase().includes("lab") ? "LAB" : "EQ";
        const nextId = getNextEquipmentId(equipment, prefix);
        const simulatedTelemetry = buildSimulatedTelemetry();

        const newEntry: SeedEquipmentEntry = {
          id: nextId,
          name: input.name,
          clientId: input.clientId,
          equipmentType: input.equipmentType,
          ...simulatedTelemetry,
          ...(input.serialNumber?.trim() ? { serialNumber: input.serialNumber.trim() } : {}),
          ...(input.notes?.trim() ? { notes: input.notes.trim() } : {}),
          ...(input.image?.trim() ? { image: input.image.trim() } : {}),
        };

        parsed.equipment = [...equipment, newEntry];
        applyComputedServiceStatuses(parsed);
        await writeSeedData(parsed);

        return { ok: true, entry: newEntry };
      }),

    update: publicQuery
      .input(
        z.object({
          id: z.string().regex(/^(EQ|LAB)-\d{3}$/),
          name: z.string().min(1),
          equipmentType: z.string().min(1),
          clientId: z.string().regex(/^CL-\d{3}$/),
          serialNumber: z.string().optional(),
          notes: z.string().optional(),
          image: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const parsed = await readSeedData();

        const equipment = Array.isArray(parsed.equipment) ? parsed.equipment : [];
        const existingIndex = equipment.findIndex((item) => item.id === input.id);
        if (existingIndex === -1) throw new Error("Seed equipment not found");

        const updatedEntry: SeedEquipmentEntry = {
          ...equipment[existingIndex],
          id: input.id,
          name: input.name,
          clientId: input.clientId,
          equipmentType: input.equipmentType,
        };

        if (input.serialNumber?.trim()) updatedEntry.serialNumber = input.serialNumber.trim();
        else delete updatedEntry.serialNumber;

        if (input.notes?.trim()) updatedEntry.notes = input.notes.trim();
        else delete updatedEntry.notes;

        if (input.image?.trim()) updatedEntry.image = input.image.trim();
        else delete updatedEntry.image;

        equipment[existingIndex] = updatedEntry;
        parsed.equipment = equipment;
        applyComputedServiceStatuses(parsed);
        await writeSeedData(parsed);

        return { ok: true, entry: updatedEntry };
      }),

    delete: publicQuery
      .input(z.object({ id: z.string().regex(/^(EQ|LAB)-\d{3}$/) }))
      .mutation(async ({ input }) => {
        const parsed = await readSeedData();

        const equipment = Array.isArray(parsed.equipment) ? parsed.equipment : [];
        const existing = equipment.find((item) => item.id === input.id);
        if (!existing) throw new Error("Seed equipment not found");

        if (existing.id === "EQ-001" || existing.name.trim().toLowerCase() === "excavator cat 320") {
          throw new Error("Excavator CAT 320 is protected and cannot be deleted");
        }

        parsed.equipment = equipment.filter((item) => item.id !== input.id);
        applyComputedServiceStatuses(parsed);
        await writeSeedData(parsed);

        return { ok: true };
      }),

    // Append a new entry to an equipment's pmsConfiguration array
    addPmsConfiguration: publicQuery
      .input(
        z.object({
          equipmentId: z.string().regex(/^(EQ|LAB)-\d{3}$/),
          serviceInterval: z.number().min(0),
          serviceIntervalUnit: z.enum(["Hours", "KM", "Weeks", "Months", "Years"]),
          serviceType: z.string().min(1).optional(),
          estimatedCost: z.number().min(0).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const parsed = await readSeedData();

        const equipment = Array.isArray(parsed.equipment) ? parsed.equipment : [];
        const idx = equipment.findIndex((item) => item.id === input.equipmentId);
        if (idx === -1) throw new Error("Equipment not found");

        const entry = equipment[idx];
        const existing: PmsConfigEntry[] = Array.isArray(entry.pmsConfiguration) ? [...entry.pmsConfiguration] : [];

        const newConfig: PmsConfigEntry = {
          serviceInterval: input.serviceInterval,
          serviceIntervalUnit: input.serviceIntervalUnit,
          ...(input.serviceType ? { serviceType: input.serviceType } : {}),
          ...(input.estimatedCost && input.estimatedCost > 0 ? { estimatedCost: input.estimatedCost } : {}),
        };

        equipment[idx] = { ...entry, pmsConfiguration: [...existing, newConfig] };
        parsed.equipment = equipment;
        applyComputedServiceStatuses(parsed);
        await writeSeedData(parsed);

        return { ok: true, configIndex: existing.length };
      }),

    // Update a specific entry (by index) in an equipment's pmsConfiguration array
    updatePmsConfiguration: publicQuery
      .input(
        z.object({
          equipmentId: z.string().regex(/^(EQ|LAB)-\d{3}$/),
          configIndex: z.number().int().min(0),
          serviceInterval: z.number().min(0),
          serviceIntervalUnit: z.enum(["Hours", "KM", "Weeks", "Months", "Years"]),
          serviceType: z.string().min(1).optional(),
          estimatedCost: z.number().min(0).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const parsed = await readSeedData();

        const equipment = Array.isArray(parsed.equipment) ? parsed.equipment : [];
        const idx = equipment.findIndex((item) => item.id === input.equipmentId);
        if (idx === -1) throw new Error("Equipment not found");

        const entry = equipment[idx];
        const configs: PmsConfigEntry[] = Array.isArray(entry.pmsConfiguration) ? [...entry.pmsConfiguration] : [];
        if (input.configIndex >= configs.length) throw new Error("Config index out of range");

        configs[input.configIndex] = {
          serviceInterval: input.serviceInterval,
          serviceIntervalUnit: input.serviceIntervalUnit,
          ...(input.serviceType ? { serviceType: input.serviceType } : {}),
          ...(input.estimatedCost && input.estimatedCost > 0 ? { estimatedCost: input.estimatedCost } : {}),
        };

        equipment[idx] = { ...entry, pmsConfiguration: configs };
        parsed.equipment = equipment;
        applyComputedServiceStatuses(parsed);
        await writeSeedData(parsed);

        return { ok: true };
      }),

    // Delete a specific entry (by index) from an equipment's pmsConfiguration array
    deletePmsConfiguration: publicQuery
      .input(
        z.object({
          equipmentId: z.string().regex(/^(EQ|LAB)-\d{3}$/),
          configIndex: z.number().int().min(0),
        })
      )
      .mutation(async ({ input }) => {
        const parsed = await readSeedData();

        const equipment = Array.isArray(parsed.equipment) ? parsed.equipment : [];
        const idx = equipment.findIndex((item) => item.id === input.equipmentId);
        if (idx === -1) throw new Error("Equipment not found");

        const entry = equipment[idx];
        const configs: PmsConfigEntry[] = Array.isArray(entry.pmsConfiguration) ? [...entry.pmsConfiguration] : [];
        if (input.configIndex >= configs.length) throw new Error("Config index out of range");

        configs.splice(input.configIndex, 1);

        equipment[idx] = { ...entry, pmsConfiguration: configs };
        parsed.equipment = equipment;
        applyComputedServiceStatuses(parsed);
        await writeSeedData(parsed);

        return { ok: true };
      }),

    // Reset hoursTotal or kmTotal to 0 after a completed service (used by Reset-on-Completion toggle)
    resetMetrics: publicQuery
      .input(
        z.object({
          id: z.string().regex(/^(EQ|LAB)-\d{3}$/),
          unit: z.enum(["Hours", "KM"]),
        })
      )
      .mutation(async ({ input }) => {
        const parsed = await readSeedData();

        const equipment = Array.isArray(parsed.equipment) ? parsed.equipment : [];
        const idx = equipment.findIndex((item) => item.id === input.id);
        if (idx === -1) throw new Error("Equipment not found");

        const entry = { ...equipment[idx] };
        if (input.unit === "Hours") {
          entry.hoursTotal = "0h 0m";
          entry.hoursToday = "0h 0m";
        } else {
          entry.kmTotal = 0;
          entry.kmToday = 0;
        }
        equipment[idx] = entry;
        parsed.equipment = equipment;
        applyComputedServiceStatuses(parsed);
        await writeSeedData(parsed);

        return { ok: true };
      }),
  }),

    seedPms: createRouter({
      add: publicQuery
        .input(
          z.object({
            equipmentType: z.string().min(1),
            serviceInterval: z.number().min(0),
            serviceIntervalUnit: z.enum(["Hours", "KM"]).optional(),
          })
        )
        .mutation(async ({ input }) => {
          const parsed = await readSeedData();

          const list = Array.isArray(parsed.pmsConfigurations) ? parsed.pmsConfigurations : [];

          // Determine next PMS id
          const maxNumber = list
            .filter((it: any) => typeof it.id === "string" && it.id.startsWith("PMS-"))
            .map((it: any) => Number(String(it.id).split("-")[1]))
            .filter((n: number) => Number.isFinite(n))
            .reduce((max: number, v: number) => Math.max(max, v), 0);
          const nextId = `PMS-${String(maxNumber + 1).padStart(3, "0")}`;

          const newEntry = {
            id: nextId,
            equipmentType: input.equipmentType,
            serviceInterval: input.serviceInterval,
            serviceIntervalUnit: input.serviceIntervalUnit || "Hours",
          };

          parsed.pmsConfigurations = [...list, newEntry];
          applyComputedServiceStatuses(parsed);
          await writeSeedData(parsed);

          return { ok: true, entry: newEntry };
        }),

      update: publicQuery
        .input(
          z.object({
            id: z.string().min(1),
            equipmentType: z.string().min(1),
            serviceInterval: z.number().min(0),
            serviceIntervalUnit: z.enum(["Hours", "KM"]).optional(),
          })
        )
        .mutation(async ({ input }) => {
          const parsed = await readSeedData();

          const list = Array.isArray(parsed.pmsConfigurations) ? parsed.pmsConfigurations : [];
          const idx = list.findIndex((it: any) => it.id === input.id);
          if (idx === -1) {
            throw new Error("PMS configuration not found");
          }

          const updated = {
            id: input.id,
            equipmentType: input.equipmentType,
            serviceInterval: input.serviceInterval,
            serviceIntervalUnit: input.serviceIntervalUnit || "Hours",
          };

          list[idx] = updated;
          parsed.pmsConfigurations = list;
          applyComputedServiceStatuses(parsed);
          await writeSeedData(parsed);

          return { ok: true, entry: updated };
        }),

      delete: publicQuery
        .input(z.object({ id: z.string().min(1) }))
        .mutation(async ({ input }) => {
          const parsed = await readSeedData();

          const list = Array.isArray(parsed.pmsConfigurations) ? parsed.pmsConfigurations : [];
          const filtered = list.filter((it: any) => it.id !== input.id);

          if (filtered.length === list.length) {
            // nothing removed
            return { ok: false, message: "Not found" };
          }

          parsed.pmsConfigurations = filtered;
          applyComputedServiceStatuses(parsed);
          await writeSeedData(parsed);

          return { ok: true };
        }),
    }),

  seedServiceRecords: createRouter({
    list: publicQuery.query(async () => {
      const parsed = await readSeedData();
      return { records: Array.isArray(parsed.serviceRecords) ? parsed.serviceRecords : [] };
    }),

    upsert: publicQuery
      .input(
        z.object({
          id: z.number(),
          seedEquipmentId: z.string(),
          pmsConfigIndex: z.number(),
          equipmentId: z.number(),
          clientId: z.number(),
          serviceCategory: z.string(),
          status: z.enum(["scheduled", "in_progress", "completed"]),
          scheduledDate: z.string(),
          completedDate: z.string().nullable().optional(),
          technician: z.string(),
          description: z.string(),
          findings: z.string().optional(),
          workDone: z.string().optional(),
          recommendation: z.string().optional(),
          partsUsed: z.string().optional(),
          partsUsedDetails: z.array(z.object({
            name: z.string(),
            quantity: z.number(),
            pricePerUnit: z.number(),
          })).optional(),
          cost: z.number().optional(),
          hoursAtService: z.number().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const parsed = await readSeedData();

        const records: SeedServiceRecord[] = Array.isArray(parsed.serviceRecords)
          ? [...parsed.serviceRecords]
          : [];
        const existingIdx = records.findIndex((r) => r.id === input.id);

        if (existingIdx >= 0) {
          records[existingIdx] = { ...records[existingIdx], ...input };
        } else {
          records.push(input as SeedServiceRecord);
        }

        parsed.serviceRecords = records;
        await writeSeedData(parsed);
        return { ok: true };
      }),

    complete: publicQuery
      .input(
        z.object({
          id: z.number(),
          completedDate: z.string(),
          technician: z.string(),
          // Core record fields (used when creating a new record)

          seedEquipmentId: z.string().optional(),
          pmsConfigIndex: z.number().optional(),
          equipmentId: z.number().optional(),
          clientId: z.number().optional(),
          serviceCategory: z.string().optional(),
          scheduledDate: z.string().optional(),
          description: z.string().optional(),
          // Service details
          findings: z.string().optional(),
          workDone: z.string().optional(),
          recommendation: z.string().optional(),
          partsUsed: z.string().optional(),
          partsUsedDetails: z.array(z.object({
            name: z.string(),
            quantity: z.number(),
            pricePerUnit: z.number(),
          })).optional(),
          cost: z.number().optional(),
          hoursAtService: z.number().optional(),
          // Rich completion fields
          equipmentName: z.string().optional(),
          clientName: z.string().optional(),
          equipmentType: z.string().optional(),
          serialNumber: z.string().optional(),
          serviceType: z.string().optional(),
          serviceInterval: z.number().optional(),
          serviceIntervalUnit: z.string().optional(),
          metricAtService: z.string().optional(),
          safetyChecklist: z.object({
            ppeChecked: z.boolean(),
            engineOff: z.boolean(),
            areaSecured: z.boolean(),
            lotoApplied: z.boolean(),
          }).optional(),
          beforePhoto: z.string().optional(),
          beforeNotes: z.string().optional(),
          afterPhoto: z.string().optional(),
          afterNotes: z.string().optional(),
          techSignature: z.string().optional(),
          clientSignature: z.string().optional(),
          // Timing & financials
          startTime: z.string().nullable().optional(),
          endTime: z.string().nullable().optional(),
          duration: z.string().nullable().optional(),
          finalCost: z.number().nullable().optional(),
          // Journey timestamps
          travelStartTime: z.string().nullable().optional(),
          arrivalTime: z.string().nullable().optional(),
          completionTime: z.string().nullable().optional(),
          // Location context
          technicianAddress: z.string().nullable().optional(),
          equipmentSiteAddress: z.string().nullable().optional(),
          // Equipment PMS status at the moment of submission
          equipmentStatusAtService: z.string().nullable().optional(),
          // When true, atomically reset the equipment's usage metric to 0 in the same file write.
          // Non-EQ-001 seed equipment always passes true; EQ-001 (GPS) passes true only when the
          // "Reset Hours on Completion" toggle is ON (its hours come from GPS, handled client-side,
          // but we still zero out the seed-data field so server status = OK).
          resetMetricsOnComplete: z.boolean().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const parsed = await readSeedData();

        const records: SeedServiceRecord[] = Array.isArray(parsed.serviceRecords)
          ? [...parsed.serviceRecords]
          : [];
        const existingIdx = records.findIndex((r) => r.id === input.id);

        // Helper that builds a full SeedServiceRecord from the input, with a given id.
        const buildRecord = (id: number, base?: SeedServiceRecord): SeedServiceRecord => ({
          ...(base ?? {}),
          ...input,
          id,
          status: "completed",
          seedEquipmentId: input.seedEquipmentId ?? base?.seedEquipmentId ?? "",
          pmsConfigIndex: input.pmsConfigIndex ?? base?.pmsConfigIndex ?? 0,
          equipmentId: input.equipmentId ?? base?.equipmentId ?? 0,
          clientId: input.clientId ?? base?.clientId ?? 0,
          serviceCategory: input.serviceCategory ?? base?.serviceCategory ?? "",
          scheduledDate: input.scheduledDate ?? base?.scheduledDate ?? input.completedDate,
          description: input.description ?? base?.description ?? "",
          startTime: input.startTime ?? null,
          endTime: input.endTime ?? null,
          duration: input.duration ?? null,
          finalCost: input.finalCost ?? null,
          travelStartTime: input.travelStartTime ?? null,
          arrivalTime: input.arrivalTime ?? null,
          completionTime: input.completionTime ?? null,
          technicianAddress: input.technicianAddress ?? null,
          equipmentSiteAddress: input.equipmentSiteAddress ?? null,
          equipmentStatusAtService: input.equipmentStatusAtService ?? null,
        } as SeedServiceRecord);

        if (existingIdx >= 0 && records[existingIdx].status !== "completed") {
          // Task existed in scheduled/in_progress state â†’ mark it completed in-place.
          records[existingIdx] = buildRecord(input.id, records[existingIdx]);
        } else if (existingIdx >= 0 && records[existingIdx].status === "completed") {
          // Task was ALREADY completed (a repeat service cycle) â†’ create a fresh history entry
          // with a unique timestamp-based id so the original record is preserved.
          const newId = Date.now();
          records.push(buildRecord(newId, records[existingIdx]));
        } else {
          // No existing record at all â†’ create new.
          records.push({
            // No existing record â€” buildRecord handles all field defaults.
            ...buildRecord(input.id),
          } as SeedServiceRecord);
        }

        parsed.serviceRecords = records;

        // â”€â”€ Atomic metrics reset â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        // Reset the equipment's usage metric to 0 in the same file write.
        // Doing this atomically avoids the race condition where two separate mutations
        // both read/write seed-data.json and the second one overwrites the first.
        if (input.resetMetricsOnComplete && input.seedEquipmentId && input.serviceIntervalUnit) {
          const equipment = Array.isArray(parsed.equipment) ? parsed.equipment : [];
          const eqIdx = equipment.findIndex((e) => e.id === input.seedEquipmentId);
          if (eqIdx !== -1) {
            const unit = input.serviceIntervalUnit.toLowerCase();
            const entry = { ...equipment[eqIdx] };
            if (unit === "hours") {
              entry.hoursTotal = "0h 0m";
              entry.hoursToday = "0h 0m";
            } else if (unit === "km") {
              entry.kmTotal = 0;
              entry.kmToday = 0;
            } else if (unit === "weeks" || unit === "months" || unit === "years") {
              entry.days = 0;
            }
            equipment[eqIdx] = entry;
            parsed.equipment = equipment;
          }
        }

        // Always recompute service statuses so the JSON reflects the latest state
        // (especially important when metrics were just reset above).
        applyComputedServiceStatuses(parsed);
        await writeSeedData(parsed);
        return { ok: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
