import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Equipment, ServiceRecord, ServicePhoto, Booking, ServiceCategory, Package } from "@/types";
import { toast } from "sonner";
import seedData from "@/data/seed-data.json";

type SeedEquipmentRecord = Partial<Equipment> & {
  id: string | number;
  clientId?: string | number;
};

type SeedBookingRecord = {
  id: string | number;
  clientId?: string | number;
  equipmentId?: string | number;
  type?: string;
  requestedDate?: string;
  date?: string;
  status?: string;
  projectName?: string;
  package?: string;
};

type FleetSyncUnit = {
  equipmentId: string | number;
  telemetry: {
    hours?: number;
    lat?: number;
    lng?: number;
  };
};

const parseHoursText = (text: string): number => {
  const m = String(text ?? "").match(/(\d+)\s*h\s*(\d+)\s*m/i);
  return m ? Number(m[1]) + Number(m[2]) / 60 : 0;
};

export interface DraftExecution {
  currentStep: number;
  equipmentId?: string;
  hoursAtService?: number;
  cost?: number;
  safetyChecklist?: {
    ppeChecked: boolean;
    engineOff: boolean;
    areaSecured: boolean;
    lotoApplied: boolean;
  };
  beforePhoto?: string;
  beforeNotes?: string;
  afterPhoto?: string;
  afterNotes?: string;
  findings?: string;
  workDone?: string;
  partsUsed: string; // Legacy
  selectedParts?: {
    inventoryItemId: number;
    quantity: number;
    name: string;
    pricePerUnit: number;
  }[];
  recommendations?: string;
  techSignature?: string;
  clientSignature?: string;
  clientRepresentativeName?: string;
  // Timestamps
  travelStartTime?: string;
  arrivalTime?: string;
  completionTime?: string;
  // Captured addresses (technician at departure, equipment at site)
  technicianAddress?: string;
  equipmentSiteAddress?: string;
  estimatedArrival?: string;
}

// Full payload shape that mirrors the tRPC seedServiceRecords.complete input.
// Stored in Zustand when the mutation fails so it can be retried automatically.
export interface PendingSubmission {
  id: number;        // task ID — used for dedup
  queuedAt: string;  // ISO timestamp — for diagnostics
  payload: {
    id: number;
    completedDate: string;
    technician: string;
    seedEquipmentId?: string;
    pmsConfigIndex?: number;
    equipmentId?: number;
    clientId?: number;
    serviceCategory?: string;
    scheduledDate?: string;
    description?: string;
    findings?: string;
    workDone?: string;
    recommendation?: string;
    partsUsed?: string;
    cost?: number;
    hoursAtService?: number;
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
    startTime?: string | null;
    endTime?: string | null;
    duration?: string | null;
    finalCost?: number | null;
    travelStartTime?: string | null;
    arrivalTime?: string | null;
    completionTime?: string | null;
    technicianAddress?: string | null;
    equipmentSiteAddress?: string | null;
    estimatedArrival?: string | null;
    equipmentStatusAtService?: string | null;
    resetMetricsOnComplete?: boolean;
  };
}

interface OperationsState {
  equipment: Equipment[];
  serviceRecords: ServiceRecord[];
  servicePhotos: ServicePhoto[];
  bookings: Booking[];
  draftExecutions: Record<number, DraftExecution>;
  // Submissions that failed to persist to seed-data.json — retried automatically on next load
  pendingSubmissions: PendingSubmission[];

  // Actions
  addEquipment: (eq: Omit<Equipment, "id">) => void;
  updateEquipment: (id: string, data: Partial<Equipment>) => void;
  addServiceRecord: (record: Omit<ServiceRecord, "id" | "createdAt" | "invoiceId">) => void;
  updateServiceRecord: (id: number, data: Partial<ServiceRecord>) => void;
  addServicePhoto: (photo: Omit<ServicePhoto, "id" | "uploadedAt">) => void;
  addBooking: (booking: Omit<Booking, "id">) => void;
  updateBooking: (id: string, data: Partial<Booking>) => void;

  // Draft Persistence
  updateDraftExecution: (id: number, data: Partial<DraftExecution>) => void;
  clearDraftExecution: (id: number) => void;

  // Failed-submission retry queue
  queuePendingSubmission: (sub: PendingSubmission) => void;
  removePendingSubmission: (id: number) => void;

  // Package & Task Flow Logic
  registerEquipmentToPackage: (equipmentId: string, pkg: Package) => void;
  checkServiceThresholds: () => void;

  // Simulation Actions
  injectSimulationTask: () => void;
  clearSimulationData: () => void;
  pruneStaleEquipment: () => void;

  // Logic Helpers
  getHoursRemaining: (equipmentId: string) => number | null;
  getDaysUntilCalibration: (equipmentId: string) => number | null;
  getEquipmentStatus: (equipmentId: string) => "OK" | "Near Service" | "Service Due" | "Overdue" | "Due Soon" | "Due";

  // Selectors
  getEquipmentByClient: (clientId: string) => Equipment[];
  getServiceHistory: (equipmentId: string) => ServiceRecord[];
  getClientServiceHistory: (clientId: number) => ServiceRecord[];
  generateQRData: (serialNumber: string) => string;
  syncWithFleet: (fleetUnits: FleetSyncUnit[]) => void;
}

const seedEquipment: Equipment[] = (seedData.equipment as SeedEquipmentRecord[]).map((e) => ({
  id: String(e.id),
  name: e.name ?? "",
  clientId: String(e.clientId ?? ""),
  serialNumber: e.serialNumber ?? "",
  equipmentType: e.equipmentType as Equipment["equipmentType"],
  status: e.status,
  unitId: e.unitId,
  type: e.type,
  manufacturer: e.manufacturer,
  model: e.model,
  location: e.location,
  installDate: e.installDate,
  warrantyExpiry: e.warrantyExpiry,
  currentHours: e.currentHours,
  lastPMSHours: e.lastPMSHours,
  nextPMSHours: e.nextPMSHours,
  lastCalibrationDate: e.lastCalibrationDate,
  nextCalibrationDate: e.nextCalibrationDate,
  calibrationFrequency: e.calibrationFrequency,
  notes: e.notes,
  hoursTotal: e.hoursTotal,
  hoursToday: e.hoursToday,
  kmTotal: e.kmTotal,
  kmToday: e.kmToday,
  lat: e.lat,
  lng: e.lng,
  pmsConfiguration: e.pmsConfiguration,
  image: e.image,
  days: e.days,
}));

const seedBookings: Booking[] = (seedData.bookings as SeedBookingRecord[]).map((b) => ({
  id: String(b.id),
  clientId: String(b.clientId ?? ""),
  equipmentId: String(b.equipmentId ?? ""),
  type: b.type,
  requestedDate: b.requestedDate ?? b.date ?? new Date().toISOString(),
  status: (b.status?.toLowerCase() ?? "pending") as Booking["status"],
  notes: "",
  projectName: b.projectName,
  package: b.package,
}));

export const useOperationsStore = create<OperationsState>()(
  persist(
    (set, get) => ({
      equipment: seedEquipment,
      serviceRecords: [],
      servicePhotos: [],
      bookings: seedBookings,
      draftExecutions: {},
      pendingSubmissions: [],

      queuePendingSubmission: (sub) => {
        set((state) => ({
          pendingSubmissions: [
            ...state.pendingSubmissions.filter((s) => s.id !== sub.id),
            sub,
          ],
        }));
      },

      removePendingSubmission: (id) => {
        set((state) => ({
          pendingSubmissions: state.pendingSubmissions.filter((s) => s.id !== id),
        }));
      },

      addEquipment: (eq) => {
        const newEq: Equipment = { ...eq, id: `EQ-${Date.now()}` };
        set((state) => ({ equipment: [...state.equipment, newEq] }));
      },

      updateEquipment: (id, data) => {
        set((state) => ({
          equipment: state.equipment.map((e) => (e.id === id ? { ...e, ...data } : e)),
        }));
        if (data.hoursTotal !== undefined) {
          get().checkServiceThresholds();
        }
      },

      addServiceRecord: (record) => {
        const newRecord = {
          ...record,
          id: Date.now(),
          invoiceId: null,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ serviceRecords: [...state.serviceRecords, newRecord] }));
      },

      updateServiceRecord: (id, data) => {
        set((state) => {
          const updatedRecords = state.serviceRecords.map((r) =>
            r.id === id ? { ...r, ...data } : r
          );
          const record = updatedRecords.find((r) => r.id === id);

          if (record && data.status === "completed") {
            const eq = state.equipment.find(e => e.id === record.equipmentId);
            if (eq && record.hoursAtService !== undefined) {
              const h = Math.floor(record.hoursAtService);
              const m = Math.round((record.hoursAtService - h) * 60);
              setTimeout(() => get().updateEquipment(eq.id, {
                status: "active",
                hoursTotal: `${h}h ${m}m`,
              }), 0);
            }

          }
          return { serviceRecords: updatedRecords };
        });
      },

      addServicePhoto: (photo) => {
        const newPhoto = { ...photo, id: Date.now(), uploadedAt: new Date().toISOString() };
        set((state) => ({ servicePhotos: [...state.servicePhotos, newPhoto] }));
      },

      addBooking: (booking) => {
        const newBooking: Booking = { ...booking, id: booking.id || `BK-${Date.now()}` };
        set((state) => ({ bookings: [...state.bookings, newBooking] }));
      },

      updateBooking: (id, data) => {
        set((state) => ({
          bookings: state.bookings.map((b) => (b.id === id ? { ...b, ...data } : b)),
        }));
      },

      updateDraftExecution: (id, data) => {
        set((state) => {
          const currentDraft = state.draftExecutions[id] || { currentStep: 0, partsUsed: "Pending" };
          return {
            draftExecutions: {
              ...state.draftExecutions,
              [id]: { ...currentDraft, ...data },
            },
          };
        });
        if (data.currentStep && data.currentStep > 0) {
          const record = get().serviceRecords.find(r => r.id === id);
          if (record && record.status === "scheduled") {
            get().updateServiceRecord(id, { status: "in_progress" });
          }
        }
      },

      clearDraftExecution: (id) => {
        set((state) => {
          const nextDraftExecutions = { ...state.draftExecutions };
          delete nextDraftExecutions[id];
          return { draftExecutions: nextDraftExecutions };
        });
      },

      // Simulation Logic
      injectSimulationTask: () => {
        const simId = String(Date.now());
        const simUnit: Equipment = {
          id: `SIM-${simId.slice(-4)}`,
          name: `Simulation Unit ${simId.slice(-4)}`,
          clientId: "CL-001",
          serialNumber: `SN-SIM-${simId}`,
          equipmentType: "Heavy Equipment",
          status: "service_due",
          hoursTotal: "1005h 0m",
          pmsConfiguration: [{ serviceInterval: 1000, serviceIntervalUnit: "Hours", serviceType: "Heavy Equipment PMS" }],
        };

        const simTask: ServiceRecord = {
          id: Date.now() + 1,
          equipmentId: simUnit.id,
          clientId: 1,
          technician: "Unassigned",
          serviceCategory: "Heavy Equipment PMS",
          description: "SIMULATION TASK: Complete the guided flow (Photos & Signatures) to test automation.",
          partsUsed: "Pending",
          status: "scheduled",
          scheduledDate: new Date().toISOString(),
          completedDate: null,
          cost: 0,
          findings: "",
          workDone: "",
          recommendation: "",
          hoursAtService: 1005,
          invoiceId: null,
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          equipment: [...state.equipment, simUnit],
          serviceRecords: [...state.serviceRecords, simTask],
        }));

        toast.success("Simulation task created!", { description: `Unit ${simUnit.name} is ready in 'My Tasks'.` });
      },

      clearSimulationData: () => {
        set((state) => ({
          equipment: state.equipment.filter(e => !e.id.startsWith("SIM-")),
          serviceRecords: state.serviceRecords.filter(r => !r.description.includes("SIMULATION")),
          servicePhotos: state.servicePhotos.filter(p => !p.caption.includes("Simulation")),
        }));
        toast.info("Simulation data cleared.");
      },

      // Package & Task Flow Logic
      registerEquipmentToPackage: (equipmentId, pkg) => {
        const eq = get().equipment.find(e => e.id === equipmentId);
        if (!eq) return;
        const isCalibration = pkg.packageType === "Calibration Package";
        const isLabTesting = pkg.packageType === "Lab Testing Package";
        const threshold = pkg.tier === "enterprise" ? 1000 : 500;
        const serviceInterval = isCalibration ? 12 : isLabTesting ? 6 : threshold;
        const serviceIntervalUnit = isCalibration || isLabTesting ? "Months" : "Hours";
        const serviceType = isCalibration
          ? "Calibration"
          : isLabTesting
            ? "Lab Testing Service"
            : "Heavy Equipment PMS";
        const currentH = parseHoursText(eq.hoursTotal ?? "0h 0m");
        get().updateEquipment(equipmentId, {
          pmsConfiguration: [{ serviceInterval, serviceIntervalUnit, serviceType }],
          hoursTotal: `${Math.floor(currentH)}h ${Math.round((currentH - Math.floor(currentH)) * 60)}m`,
        });
        toast.success("PMS tracking configured", {
          description: serviceIntervalUnit === "Hours"
            ? `${eq.name} is set for ${serviceType} every ${serviceInterval}h.`
            : `${eq.name} is set for ${serviceType} every ${serviceInterval} months.`,
        });
      },

      checkServiceThresholds: () => {
        const { equipment, serviceRecords, addServiceRecord } = get();

        equipment.forEach(eq => {
          if (!Array.isArray(eq.pmsConfiguration)) return;
          const currentHours = parseHoursText(eq.hoursTotal ?? "0h 0m");
          if (currentHours <= 0) return;

          eq.pmsConfiguration.forEach(config => {
            if ((config.serviceIntervalUnit ?? "").toLowerCase() !== "hours") return;
            if (config.serviceInterval <= 0) return;

            const milestone = Math.floor(currentHours / config.serviceInterval);
            if (milestone <= 0) return;

            const hasOpenTask = serviceRecords.some(r =>
              r.equipmentId === eq.id &&
              r.status !== "completed" &&
              r.status !== "cancelled"
            );
            if (hasOpenTask) return;

            addServiceRecord({
              equipmentId: eq.id,
              clientId: Number(String(eq.clientId).replace(/\D/g, "")) || 0,
              technician: "Unassigned",
              serviceCategory: config.serviceType as ServiceCategory ?? "Heavy Equipment PMS",
              description: `AUTOMATED: ${config.serviceType} threshold reached (${Math.floor(currentHours)}h).`,
              partsUsed: "Pending Inspection",
              status: "scheduled",
              scheduledDate: new Date().toISOString(),
              completedDate: null,
              cost: config.estimatedCost ?? 0,
              findings: "",
              workDone: "",
              recommendation: "",
              hoursAtService: Math.floor(currentHours),
            });

            toast.info(`Maintenance Triggered`, {
              description: `${eq.name} reached its ${config.serviceInterval}h service threshold. Task generated.`,
            });
          });
        });
      },

      // Logic Helpers
      getHoursRemaining: (equipmentId) => {
        const eq = get().equipment.find(e => e.id === equipmentId);
        if (!eq || eq.equipmentType !== "Heavy Equipment") return null;
        const config = eq.pmsConfiguration?.find(c => c.serviceIntervalUnit?.toLowerCase() === "hours");
        if (!config) return null;
        const currentH = parseHoursText(eq.hoursTotal ?? "0h 0m");
        const nextMilestone = (Math.floor(currentH / config.serviceInterval) + 1) * config.serviceInterval;
        return nextMilestone - currentH;
      },

      getDaysUntilCalibration: () => null,

      getEquipmentStatus: (equipmentId) => {
        const remaining = get().getHoursRemaining(equipmentId);
        if (remaining === null) return "OK";
        if (remaining <= 0) return "Overdue";
        if (remaining <= 50) return "Service Due";
        if (remaining <= 100) return "Near Service";
        return "OK";
      },

      getEquipmentByClient: (clientId) =>
        get().equipment.filter((e) => e.clientId === clientId),
      getServiceHistory: (equipmentId) =>
        get().serviceRecords.filter((r) => r.equipmentId === equipmentId),
      getClientServiceHistory: (clientId) =>
        get().serviceRecords.filter((r) => r.clientId === clientId),
      generateQRData: (serialNumber) =>
        JSON.stringify({ serial: serialNumber, company: "NexVision", scannedAt: new Date().toISOString() }),

      pruneStaleEquipment: () => {
        const validIds = new Set(seedEquipment.map((e) => e.id));
        set((state) => ({
          equipment: state.equipment.filter((e) => validIds.has(e.id)),
        }));
      },

      syncWithFleet: (fleetUnits: FleetSyncUnit[]) => {
        set((state) => ({
          equipment: state.equipment.map((eq) => {
            const unit = fleetUnits.find((u) => u.equipmentId === eq.id);
            if (!unit) return eq;
            const h = Math.floor(unit.telemetry.hours ?? 0);
            const m = Math.round(((unit.telemetry.hours ?? 0) - h) * 60);
            return {
              ...eq,
              hoursTotal: `${h}h ${m}m`,
              lat: unit.telemetry.lat,
              lng: unit.telemetry.lng,
            };
          }),
        }));
        get().checkServiceThresholds();
      },
    }),
    {
      name: "nexvision-operations-v5",
    }
  )
);
