import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Equipment, ServiceRecord, ServicePhoto, Booking, ServiceCategory, Package } from "@/types";
import { useBillingStore } from "./useBillingStore";
import { toast } from "sonner";

export interface DraftExecution {
  currentStep: number;
  equipmentId?: number;
  beforePhoto?: string;
  beforeNotes?: string;
  afterPhoto?: string;
  afterNotes?: string;
  findings?: string;
  workDone?: string;
  partsUsed: string;
  recommendations?: string;
  techSignature?: string;
  clientSignature?: string;
}

interface OperationsState {
  equipment: Equipment[];
  serviceRecords: ServiceRecord[];
  servicePhotos: ServicePhoto[];
  bookings: Booking[];
  draftExecutions: Record<number, DraftExecution>;
  
  // Actions
  addEquipment: (eq: Omit<Equipment, "id" | "createdAt">) => void;
  updateEquipment: (id: number, data: Partial<Equipment>) => void;
  addServiceRecord: (record: Omit<ServiceRecord, "id" | "createdAt" | "invoiceId">) => void;
  updateServiceRecord: (id: number, data: Partial<ServiceRecord>) => void;
  addServicePhoto: (photo: Omit<ServicePhoto, "id" | "uploadedAt">) => void;
  addBooking: (booking: Omit<Booking, "id" | "createdAt">) => void;
  updateBooking: (id: number, data: Partial<Booking>) => void;
  
  // Draft Persistence
  updateDraftExecution: (id: number, data: Partial<DraftExecution>) => void;
  clearDraftExecution: (id: number) => void;
  
  // Package & Task Flow Logic
  registerEquipmentToPackage: (equipmentId: number, pkg: Package) => void;
  checkServiceThresholds: () => void;
  
  // Simulation Actions
  injectSimulationTask: () => void;
  clearSimulationData: () => void;

  // Logic Helpers
  getHoursRemaining: (equipmentId: number) => number | null;
  getDaysUntilCalibration: (equipmentId: number) => number | null;
  getEquipmentStatus: (equipmentId: number) => "OK" | "Near Service" | "Service Due" | "Overdue" | "Due Soon" | "Due";
  
  // Selectors
  getEquipmentByClient: (clientId: number) => Equipment[];
  getServiceHistory: (equipmentId: number) => ServiceRecord[];
  getClientServiceHistory: (clientId: number) => ServiceRecord[];
  generateQRData: (serialNumber: string) => string;
  syncWithFleet: (fleetUnits: any[]) => void;
}

const now = new Date().toISOString();
const lastWeek = new Date(Date.now() - 7 * 86400000).toISOString();
const lastMonth = new Date(Date.now() - 30 * 86400000).toISOString();
const twoMonthsAgo = new Date(Date.now() - 60 * 86400000).toISOString();
const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString();
const sixMonthsFromNow = new Date(Date.now() + 180 * 86400000).toISOString();

const mockEquipment: Equipment[] = [
  { 
    id: 1, clientId: 1, unitId: "EXC-320", type: "Excavator", equipmentType: "Heavy Equipment", 
    serialNumber: "CAT-320-001", manufacturer: "Caterpillar", model: "320 GC", installDate: twoMonthsAgo, 
    warrantyExpiry: nextWeek, status: "active", location: "Denver Site A", notes: "Main excavator", 
    currentHours: 4980, lastPMSHours: 4000, pmsInterval: 1000, nextPMSHours: 5000,
    lastCalibrationDate: null, calibrationFrequency: 0, nextCalibrationDate: null,
    createdAt: twoMonthsAgo 
  },
  { 
    id: 2, clientId: 1, unitId: "LAB-STS-01", type: "Concrete Tester", equipmentType: "Lab Equipment", 
    serialNumber: "SN-LAB-2024", manufacturer: "Controls Group", model: "Automax E", installDate: lastMonth, 
    warrantyExpiry: nextWeek, status: "active", location: "Main Lab", notes: "Concrete strength tester", 
    currentHours: 0, lastPMSHours: 0, pmsInterval: 0, nextPMSHours: 0,
    lastCalibrationDate: lastMonth, calibrationFrequency: 12, nextCalibrationDate: sixMonthsFromNow,
    createdAt: lastMonth 
  },
  { 
    id: 3, clientId: 1, unitId: "TST-BEAM-02", type: "Beam Tester", equipmentType: "Testing Equipment", 
    serialNumber: "SN-BEAM-500", manufacturer: "Tinius Olsen", model: "Super L", installDate: lastMonth, 
    warrantyExpiry: nextWeek, status: "active", location: "Chicago Depot", notes: "Steel beam strength testing", 
    currentHours: 0, lastPMSHours: 0, pmsInterval: 0, nextPMSHours: 0,
    lastCalibrationDate: lastWeek, calibrationFrequency: 6, nextCalibrationDate: nextWeek,
    createdAt: lastMonth 
  },
  { 
    id: 4, clientId: 1, unitId: "EXC-CAT-20", type: "Excavator", equipmentType: "Heavy Equipment", 
    serialNumber: "SN-CAT-20", manufacturer: "Caterpillar", model: "320D", installDate: twoMonthsAgo, 
    warrantyExpiry: nextWeek, status: "active", location: "Site B", notes: "Near service unit", 
    currentHours: 5150, lastPMSHours: 4200, pmsInterval: 1000, nextPMSHours: 5200,
    lastCalibrationDate: null, calibrationFrequency: 0, nextCalibrationDate: null,
    createdAt: twoMonthsAgo 
  },
];

const mockServiceRecords: ServiceRecord[] = [
  { 
    id: 1, equipmentId: 1, clientId: 1, technician: "James Rodriguez", serviceCategory: "Heavy Equipment PMS", 
    description: "1000-hour PMS complete.", 
    hoursAtService: 4000, partsUsed: "Engine Oil, Filters", status: "completed", 
    scheduledDate: lastWeek, completedDate: lastWeek, cost: 850.00, invoiceId: 1, createdAt: lastWeek 
  },
  { 
    id: 2, equipmentId: 2, clientId: 1, technician: "James Rodriguez", serviceCategory: "Calibration PMS", 
    description: "Annual calibration.", 
    lastCalibrationDate: lastMonth, nextCalibrationDate: sixMonthsFromNow,
    partsUsed: "Cert Sticker", status: "completed", 
    scheduledDate: lastMonth, completedDate: lastMonth, cost: 450.00, invoiceId: 2, createdAt: lastMonth 
  },
  { 
    id: 3, equipmentId: 2, clientId: 1, technician: "James Rodriguez", serviceCategory: "Lab Testing Service", 
    description: "Concrete strength test.", 
    testType: "Concrete Compression", sampleName: "SK-B1", projectName: "Skyline", labStatus: "Released",
    reportAttachment: "report-sk-b1.pdf",
    partsUsed: "None", status: "completed", 
    scheduledDate: lastWeek, completedDate: lastWeek, cost: 150.00, invoiceId: 3, createdAt: lastWeek 
  },
];

const mockBookings: Booking[] = [
  { id: 1, clientId: 1, equipmentId: 1, serviceCategory: "Heavy Equipment PMS", requestedDate: nextWeek, preferredTime: "09:00-12:00", status: "confirmed", notes: "Standard PMS", createdAt: lastWeek },
];

export const useOperationsStore = create<OperationsState>()(
  persist(
    (set, get) => ({
      equipment: mockEquipment,
      serviceRecords: mockServiceRecords,
      servicePhotos: [],
      bookings: mockBookings,
      draftExecutions: {},

      addEquipment: (eq) => {
        const newEq = { ...eq, id: Date.now(), createdAt: new Date().toISOString() };
        set((state) => ({ equipment: [...state.equipment, newEq] }));
      },

      updateEquipment: (id, data) => {
        set((state) => ({
          equipment: state.equipment.map((e) => (e.id === id ? { ...e, ...data } : e)),
        }));
        
        if (data.currentHours !== undefined) {
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
            if (eq) {
              const updates: Partial<Equipment> = {
                status: "active"
              };
              
              if (record.serviceCategory === "Heavy Equipment PMS") {
                updates.lastPMSHours = record.hoursAtService || eq.currentHours;
                updates.nextPMSHours = updates.lastPMSHours + (eq.pmsInterval || 500);
              } else if (record.serviceCategory === "Calibration PMS") {
                const completedDate = record.completedDate || new Date().toISOString();
                updates.lastCalibrationDate = completedDate;
                if (eq.calibrationFrequency > 0) {
                  const nextDate = new Date(completedDate);
                  nextDate.setMonth(nextDate.getMonth() + eq.calibrationFrequency);
                  updates.nextCalibrationDate = nextDate.toISOString();
                }
              }
              
              if (Object.keys(updates).length > 0) {
                setTimeout(() => get().updateEquipment(eq.id, updates), 0);
              }
            }

            if (!record.invoiceId) {
              const invoiceNumber = `INV-${Date.now().toString().slice(-4)}`;
              useBillingStore.getState()._addInvoice({
                id: Date.now() + 1,
                clientId: record.clientId,
                packageId: null,
                serviceRecordId: record.id,
                invoiceNumber,
                amount: record.cost,
                tax: record.cost * 0.1,
                total: record.cost * 1.1,
                status: "sent",
                dueDate: new Date(Date.now() + 30 * 86400000).toISOString(),
                paidDate: null,
                createdAt: new Date().toISOString(),
              });
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
        const newBooking = { ...booking, id: Date.now(), createdAt: new Date().toISOString() };
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
              [id]: { ...currentDraft, ...data }
            }
          };
        });
        
        // If moving past step 0, ensure record is in_progress
        if (data.currentStep && data.currentStep > 0) {
            const record = get().serviceRecords.find(r => r.id === id);
            if (record && record.status === "scheduled") {
                get().updateServiceRecord(id, { status: "in_progress" });
            }
        }
      },

      clearDraftExecution: (id) => {
        set((state) => {
          const { [id]: removed, ...rest } = state.draftExecutions;
          return { draftExecutions: rest };
        });
      },

      // Simulation Logic
      injectSimulationTask: () => {
        const simId = Date.now();
        const simUnit: Equipment = {
          id: simId,
          clientId: 1,
          unitId: `SIM-UNIT-${simId.toString().slice(-4)}`,
          type: "Demo Unit",
          equipmentType: "Heavy Equipment",
          serialNumber: `SN-SIM-${simId}`,
          manufacturer: "NexVision",
          model: "SIM-PRO-X",
          installDate: new Date().toISOString(),
          warrantyExpiry: new Date().toISOString(),
          status: "service_due",
          location: "Simulation Site",
          notes: "AUTO-GENERATED TEST DATA",
          currentHours: 1005,
          lastPMSHours: 0,
          pmsInterval: 1000,
          nextPMSHours: 1000,
          lastCalibrationDate: null,
          calibrationFrequency: 0,
          nextCalibrationDate: null,
          packageId: 1001,
          createdAt: new Date().toISOString()
        };

        const simTask: ServiceRecord = {
          id: simId + 1,
          equipmentId: simId,
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
          createdAt: new Date().toISOString()
        };

        set((state) => ({
          equipment: [...state.equipment, simUnit],
          serviceRecords: [...state.serviceRecords, simTask]
        }));
        
        toast.success("Simulation task created!", { description: `Unit ${simUnit.unitId} is ready in 'My Tasks'.` });
      },

      clearSimulationData: () => {
        set((state) => ({
          equipment: state.equipment.filter(e => !e.notes.includes("TEST DATA") && !e.unitId.startsWith("SIM-")),
          serviceRecords: state.serviceRecords.filter(r => !r.description.includes("SIMULATION")),
          servicePhotos: state.servicePhotos.filter(p => !p.caption.includes("Simulation"))
        }));
        toast.info("Simulation data cleared.");
      },

      // Package & Task Flow Logic
      registerEquipmentToPackage: (equipmentId, pkg) => {
        const threshold = pkg.tier === "enterprise" ? 1000 : 500;
        const eq = get().equipment.find(e => e.id === equipmentId);
        if (!eq) return;

        get().updateEquipment(equipmentId, {
          packageId: pkg.id,
          pmsInterval: threshold,
          nextPMSHours: eq.currentHours + threshold
        });
        toast.success(`Equipment Registered`, { description: `Registered under ${pkg.name}. PMS threshold: ${threshold}h.` });
      },

      checkServiceThresholds: () => {
        const { equipment, serviceRecords, addServiceRecord, updateEquipment } = get();
        
        equipment.forEach(eq => {
          if (eq.equipmentType === "Heavy Equipment" && eq.nextPMSHours > 0 && eq.currentHours >= eq.nextPMSHours) {
            const activeTask = serviceRecords.find(r => r.equipmentId === eq.id && r.status !== "completed" && r.status !== "cancelled");
            
            if (!activeTask) {
              addServiceRecord({
                equipmentId: eq.id,
                clientId: eq.clientId,
                technician: "Unassigned",
                serviceCategory: "Heavy Equipment PMS",
                description: `AUTOMATED: PMS threshold reached (${eq.currentHours}h). Unit requires standard preventive maintenance.`,
                partsUsed: "Pending Inspection",
                status: "scheduled",
                scheduledDate: new Date().toISOString(),
                completedDate: null,
                cost: 0,
                findings: "",
                workDone: "",
                recommendation: "",
                hoursAtService: eq.currentHours
              });
              
              set((state) => ({
                equipment: state.equipment.map((e) => (e.id === eq.id ? { ...e, status: "service_due" } : e)),
              }));
              
              toast.info(`Maintenance Triggered`, {
                description: `Unit ${eq.unitId} has reached its service threshold. Task generated.`
              });
            }
          }
        });
      },

      // Logic Helpers
      getHoursRemaining: (equipmentId) => {
        const eq = get().equipment.find(e => e.id === equipmentId);
        if (!eq || eq.equipmentType !== "Heavy Equipment" || !eq.nextPMSHours) return null;
        return eq.nextPMSHours - eq.currentHours;
      },

      getDaysUntilCalibration: (equipmentId) => {
        const eq = get().equipment.find(e => e.id === equipmentId);
        if (!eq || (eq.equipmentType !== "Lab Equipment" && eq.equipmentType !== "Testing Equipment") || !eq.nextCalibrationDate) return null;
        const diff = new Date(eq.nextCalibrationDate).getTime() - new Date().getTime();
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
      },

      getEquipmentStatus: (equipmentId) => {
        const eq = get().equipment.find(e => e.id === equipmentId);
        if (!eq) return "OK";

        if (eq.equipmentType === "Heavy Equipment") {
          const remaining = get().getHoursRemaining(equipmentId);
          if (remaining === null) return "OK";
          if (remaining <= 0) return "Overdue";
          if (remaining <= 50) return "Service Due";
          if (remaining <= 100) return "Near Service";
          return "OK";
        }

        if (eq.equipmentType === "Lab Equipment" || eq.equipmentType === "Testing Equipment") {
          const days = get().getDaysUntilCalibration(equipmentId);
          if (days === null) return "OK";
          if (days <= 0) return "Overdue";
          if (days <= 7) return "Due";
          if (days <= 30) return "Due Soon";
          return "OK";
        }

        return "OK";
      },

      getEquipmentByClient: (clientId) => get().equipment.filter((e) => e.clientId === clientId),
      getServiceHistory: (equipmentId) => get().serviceRecords.filter((r) => r.equipmentId === equipmentId),
      getClientServiceHistory: (clientId) => get().serviceRecords.filter((r) => r.clientId === clientId),
      generateQRData: (serialNumber) => JSON.stringify({ serial: serialNumber, company: "NexVision", scannedAt: new Date().toISOString() }),
      
      syncWithFleet: (fleetUnits) => {
        set((state) => ({
          equipment: state.equipment.map((eq) => {
            const fleetUnit = fleetUnits.find((u) => u.equipmentId === eq.id);
            if (fleetUnit) {
              return {
                ...eq,
                currentHours: fleetUnit.telemetry.hours,
                location: `${fleetUnit.telemetry.lat.toFixed(4)}, ${fleetUnit.telemetry.lng.toFixed(4)}`,
              };
            }
            return eq;
          }),
        }));
        
        get().checkServiceThresholds();
      },
    }),
    {
      name: "nexvision-operations-v4",
    }
  )
);
