import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Equipment, ServiceRecord, ServicePhoto, Booking, ServiceCategory } from "@/types";
import { useBillingStore } from "./useBillingStore";
import seedData from "@/data/seed-data.json";

interface OperationsState {
  equipment: Equipment[];
  serviceRecords: ServiceRecord[];
  servicePhotos: ServicePhoto[];
  bookings: Booking[];
  
  // Actions
  addEquipment: (eq: Omit<Equipment, "id" | "createdAt">) => void;
  updateEquipment: (id: number, data: Partial<Equipment>) => void;
  addServiceRecord: (record: Omit<ServiceRecord, "id" | "createdAt" | "invoiceId">) => void;
  updateServiceRecord: (id: number, data: Partial<ServiceRecord>) => void;
  addServicePhoto: (photo: Omit<ServicePhoto, "id" | "uploadedAt">) => void;
  addBooking: (booking: Omit<Booking, "id" | "createdAt">) => void;
  updateBooking: (id: number, data: Partial<Booking>) => void;
  
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

const clientIdMap: Record<string, number> = {};
seedData.clients.forEach((c, index) => {
  clientIdMap[c.id] = index + 1;
});

const mockEquipment: Equipment[] = seedData.equipment.map((eq, index) => ({
  id: index + 1,
  clientId: clientIdMap[eq.clientId] || 1,
  unitId: eq.id,
  type: eq.name,
  equipmentType: eq.equipmentType as any,
  serialNumber: eq.serialNumber,
  manufacturer: "Unknown",
  model: "Generic",
  installDate: lastMonth,
  warrantyExpiry: nextWeek,
  status: "active",
  location: eq.location || "Main Site",
  notes: "Seeded from seed-data.json",
  currentHours: parseInt(eq.hoursTotal?.split("h")[0] || "0"),
  lastPMSHours: 0,
  pmsInterval: eq.pmsConfiguration?.serviceIntervalHours || 1000,
  nextPMSHours: eq.pmsConfiguration?.serviceIntervalHours || 1000,
  lastCalibrationDate: null,
  calibrationFrequency: 12,
  nextCalibrationDate: sixMonthsFromNow,
  createdAt: lastMonth,
}));

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

      addEquipment: (eq) => {
        const newEq = { ...eq, id: Date.now(), createdAt: new Date().toISOString() };
        set((state) => ({ equipment: [...state.equipment, newEq] }));
      },

      updateEquipment: (id, data) => {
        set((state) => ({
          equipment: state.equipment.map((e) => (e.id === id ? { ...e, ...data } : e)),
        }));
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
              const updates: Partial<Equipment> = {};
              
              if (record.serviceCategory === "Heavy Equipment PMS") {
                updates.lastPMSHours = record.hoursAtService || eq.currentHours;
                updates.nextPMSHours = updates.lastPMSHours + eq.pmsInterval;
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
      },
    }),
    {
      name: "nexvision-operations-v4",
      version: 5,
    }
  )
);
