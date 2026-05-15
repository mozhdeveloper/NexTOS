import { authRouter } from "./auth-router";
import { createRouter, publicQuery } from "./middleware";
import { z } from "zod";
import { promises as fs } from "node:fs";
import path from "node:path";

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
  pmsConfiguration?: {
    serviceInterval: number;
    serviceIntervalUnit: "Hours" | "KM" | "Km" | "Weeks" | "Months" | "Years";
    serviceType?: string;
  };
};

type SeedDataShape = {
  clients?: Array<{ id: string }>;
  equipment?: SeedEquipmentEntry[];
  [key: string]: unknown;
};

function getSeedDataPath(): string {
  return path.resolve(process.cwd(), "src/data/seed-data.json");
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

function applyComputedServiceStatuses(parsed: SeedDataShape): void {
  if (!Array.isArray(parsed.equipment)) {
    return;
  }

  parsed.equipment = parsed.equipment.map((entry) => {
    if (entry.id === "EQ-001") {
      return entry;
    }

    const status = calculateServiceStatus(entry);
    if (!status) {
      const { status: _status, ...rest } = entry;
      return rest;
    }

    return {
      ...entry,
      status,
    };
  });
}

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  seedEquipment: createRouter({
    add: publicQuery
      .input(
        z.object({
          name: z.string().min(1),
          equipmentType: z.string().min(1),
          clientId: z.string().regex(/^CL-\d{3}$/),
          serialNumber: z.string().optional(),
          notes: z.string().optional(),
          image: z.string().optional(),
          pmsConfiguration: z
            .object({
              serviceInterval: z.number().min(0),
              serviceIntervalUnit: z.enum(["Hours", "KM", "Weeks", "Months", "Years"]),
              serviceType: z.string().min(1).optional(),
            })
            .optional(),
        })
      )
      .mutation(async ({ input }) => {
        const seedDataPath = getSeedDataPath();
        const raw = await fs.readFile(seedDataPath, "utf-8");
        const parsed = JSON.parse(raw) as SeedDataShape;

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
          ...(input.serialNumber && input.serialNumber.trim().length > 0
            ? { serialNumber: input.serialNumber.trim() }
            : {}),
          ...(input.notes && input.notes.trim().length > 0
            ? { notes: input.notes.trim() }
            : {}),
          ...(input.image && input.image.trim().length > 0
            ? { image: input.image.trim() }
            : {}),
          ...(input.pmsConfiguration ? { pmsConfiguration: input.pmsConfiguration } : {}),
        };

        parsed.equipment = [...equipment, newEntry];
        applyComputedServiceStatuses(parsed);
        await fs.writeFile(seedDataPath, `${JSON.stringify(parsed, null, 4)}\n`, "utf-8");

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
          pmsConfiguration: z
            .object({
              serviceInterval: z.number().min(0),
              serviceIntervalUnit: z.enum(["Hours", "KM", "Weeks", "Months", "Years"]),
              serviceType: z.string().min(1).optional(),
            })
            .optional(),
        })
      )
      .mutation(async ({ input }) => {
        const seedDataPath = getSeedDataPath();
        const raw = await fs.readFile(seedDataPath, "utf-8");
        const parsed = JSON.parse(raw) as SeedDataShape;

        const equipment = Array.isArray(parsed.equipment) ? parsed.equipment : [];
        const existingIndex = equipment.findIndex((item) => item.id === input.id);
        if (existingIndex === -1) {
          throw new Error("Seed equipment not found");
        }

        const updatedEntry: SeedEquipmentEntry = {
          ...equipment[existingIndex],
          id: input.id,
          name: input.name,
          clientId: input.clientId,
          equipmentType: input.equipmentType,
          ...(input.serialNumber && input.serialNumber.trim().length > 0
            ? { serialNumber: input.serialNumber.trim() }
            : {}),
          ...(input.notes && input.notes.trim().length > 0
            ? { notes: input.notes.trim() }
            : {}),
          ...(input.image && input.image.trim().length > 0
            ? { image: input.image.trim() }
            : {}),
          ...(input.pmsConfiguration ? { pmsConfiguration: input.pmsConfiguration } : {}),
        };

        if (!input.serialNumber || input.serialNumber.trim().length === 0) {
          delete updatedEntry.serialNumber;
        }

        if (!input.notes || input.notes.trim().length === 0) {
          delete updatedEntry.notes;
        }

        if (!input.image || input.image.trim().length === 0) {
          delete updatedEntry.image;
        }

        if (!input.pmsConfiguration) {
          delete updatedEntry.pmsConfiguration;
        }

        equipment[existingIndex] = updatedEntry;
        parsed.equipment = equipment;
        applyComputedServiceStatuses(parsed);
        await fs.writeFile(seedDataPath, `${JSON.stringify(parsed, null, 4)}\n`, "utf-8");

        return { ok: true, entry: updatedEntry };
      }),
    delete: publicQuery
      .input(
        z.object({
          id: z.string().regex(/^(EQ|LAB)-\d{3}$/),
        })
      )
      .mutation(async ({ input }) => {
        const seedDataPath = getSeedDataPath();
        const raw = await fs.readFile(seedDataPath, "utf-8");
        const parsed = JSON.parse(raw) as SeedDataShape;

        const equipment = Array.isArray(parsed.equipment) ? parsed.equipment : [];
        const existing = equipment.find((item) => item.id === input.id);
        if (!existing) {
          throw new Error("Seed equipment not found");
        }

        const isProtectedExcavator =
          existing.id === "EQ-001" || existing.name.trim().toLowerCase() === "excavator cat 320";

        if (isProtectedExcavator) {
          throw new Error("Excavator CAT 320 is protected and cannot be deleted");
        }

        parsed.equipment = equipment.filter((item) => item.id !== input.id);
        applyComputedServiceStatuses(parsed);
        await fs.writeFile(seedDataPath, `${JSON.stringify(parsed, null, 4)}\n`, "utf-8");

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
          const seedDataPath = getSeedDataPath();
          const raw = await fs.readFile(seedDataPath, "utf-8");
          const parsed = JSON.parse(raw) as SeedDataShape;

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
          await fs.writeFile(seedDataPath, `${JSON.stringify(parsed, null, 4)}\n`, "utf-8");

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
          const seedDataPath = getSeedDataPath();
          const raw = await fs.readFile(seedDataPath, "utf-8");
          const parsed = JSON.parse(raw) as SeedDataShape;

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
          await fs.writeFile(seedDataPath, `${JSON.stringify(parsed, null, 4)}\n`, "utf-8");

          return { ok: true, entry: updated };
        }),

      delete: publicQuery
        .input(z.object({ id: z.string().min(1) }))
        .mutation(async ({ input }) => {
          const seedDataPath = getSeedDataPath();
          const raw = await fs.readFile(seedDataPath, "utf-8");
          const parsed = JSON.parse(raw) as SeedDataShape;

          const list = Array.isArray(parsed.pmsConfigurations) ? parsed.pmsConfigurations : [];
          const filtered = list.filter((it: any) => it.id !== input.id);

          if (filtered.length === list.length) {
            // nothing removed
            return { ok: false, message: "Not found" };
          }

          parsed.pmsConfigurations = filtered;
          applyComputedServiceStatuses(parsed);
          await fs.writeFile(seedDataPath, `${JSON.stringify(parsed, null, 4)}\n`, "utf-8");

          return { ok: true };
        }),
    }),

  // TODO: add feature routers here, e.g.
  // todo: createRouter({
  //   list: publicQuery.query(() => findTodos()),
  // }),
});

export type AppRouter = typeof appRouter;
