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
  image?: string;
  lat?: number;
  lng?: number;
  hoursToday?: string;
  hoursTotal?: string;
  pmsConfiguration?: {
    serviceIntervalHours: number;
    serviceIntervalUnit: "Hours" | "KM" | "Weeks" | "Months" | "Years";
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
          image: z.string().optional(),
          pmsConfiguration: z
            .object({
              serviceIntervalHours: z.number().min(0),
              serviceIntervalUnit: z.enum(["Hours", "KM", "Weeks", "Months", "Years"]),
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
          ...(input.image && input.image.trim().length > 0
            ? { image: input.image.trim() }
            : {}),
          ...(input.pmsConfiguration ? { pmsConfiguration: input.pmsConfiguration } : {}),
        };

        parsed.equipment = [...equipment, newEntry];
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
          image: z.string().optional(),
          pmsConfiguration: z
            .object({
              serviceIntervalHours: z.number().min(0),
              serviceIntervalUnit: z.enum(["Hours", "KM", "Weeks", "Months", "Years"]),
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
          ...(input.image && input.image.trim().length > 0
            ? { image: input.image.trim() }
            : {}),
          ...(input.pmsConfiguration ? { pmsConfiguration: input.pmsConfiguration } : {}),
        };

        if (!input.serialNumber || input.serialNumber.trim().length === 0) {
          delete updatedEntry.serialNumber;
        }

        if (!input.image || input.image.trim().length === 0) {
          delete updatedEntry.image;
        }

        if (!input.pmsConfiguration) {
          delete updatedEntry.pmsConfiguration;
        }

        equipment[existingIndex] = updatedEntry;
        parsed.equipment = equipment;
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
        await fs.writeFile(seedDataPath, `${JSON.stringify(parsed, null, 4)}\n`, "utf-8");

        return { ok: true };
      }),
  }),

    seedPms: createRouter({
      add: publicQuery
        .input(
          z.object({
            equipmentType: z.string().min(1),
            serviceIntervalHours: z.number().min(0),
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
            serviceIntervalHours: input.serviceIntervalHours,
            serviceIntervalUnit: input.serviceIntervalUnit || "Hours",
          };

          parsed.pmsConfigurations = [...list, newEntry];
          await fs.writeFile(seedDataPath, `${JSON.stringify(parsed, null, 4)}\n`, "utf-8");

          return { ok: true, entry: newEntry };
        }),

      update: publicQuery
        .input(
          z.object({
            id: z.string().min(1),
            equipmentType: z.string().min(1),
            serviceIntervalHours: z.number().min(0),
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
            serviceIntervalHours: input.serviceIntervalHours,
            serviceIntervalUnit: input.serviceIntervalUnit || "Hours",
          };

          list[idx] = updated;
          parsed.pmsConfigurations = list;
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
