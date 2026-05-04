import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Equipment, ServiceRecord, ServicePhoto, Booking } from "@/types";
import { useBillingStore } from "./useBillingStore";

interface OperationsState {
  equipment: Equipment[];
  serviceRecords: ServiceRecord[];
  servicePhotos: ServicePhoto[];
  bookings: Booking[];
  addEquipment: (eq: Omit<Equipment, "id" | "createdAt">) => void;
  updateEquipment: (id: number, data: Partial<Equipment>) => void;
  addServiceRecord: (record: Omit<ServiceRecord, "id" | "createdAt" | "invoiceId">) => void;
  updateServiceRecord: (id: number, data: Partial<ServiceRecord>) => void;
  addServicePhoto: (photo: Omit<ServicePhoto, "id" | "uploadedAt">) => void;
  addBooking: (booking: Omit<Booking, "id" | "createdAt">) => void;
  updateBooking: (id: number, data: Partial<Booking>) => void;
  getEquipmentByClient: (clientId: number) => Equipment[];
  getServiceHistory: (equipmentId: number) => ServiceRecord[];
  getClientServiceHistory: (clientId: number) => ServiceRecord[];
  generateQRData: (serialNumber: string) => string;
}

const now = new Date().toISOString();
const lastWeek = new Date(Date.now() - 7 * 86400000).toISOString();
const lastMonth = new Date(Date.now() - 30 * 86400000).toISOString();
const twoMonthsAgo = new Date(Date.now() - 60 * 86400000).toISOString();
const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString();

const mockEquipment: Equipment[] = [
  { id: 1, clientId: 1, unitId: "GPS-001", type: "GPS Tracker", serialNumber: "SN-2024-001", manufacturer: "Trimble", model: "R12", installDate: twoMonthsAgo, warrantyExpiry: nextWeek, status: "active", lastService: lastWeek, nextServiceDue: 5000, currentHours: 4532, location: "Austin HQ", notes: "Primary tracking unit", createdAt: twoMonthsAgo },
  { id: 2, clientId: 1, unitId: "CAM-002", type: "Security Camera", serialNumber: "SN-2024-002", manufacturer: "Axis", model: "Q6075", installDate: lastMonth, warrantyExpiry: nextWeek, status: "active", lastService: lastWeek, nextServiceDue: 3000, currentHours: 2890, location: "Austin Warehouse", notes: "PTZ dome camera", createdAt: lastMonth },
  { id: 3, clientId: 2, unitId: "GPS-003", type: "GPS Tracker", serialNumber: "SN-2024-003", manufacturer: "Garmin", model: "Fleet 790", installDate: twoMonthsAgo, warrantyExpiry: nextWeek, status: "active", lastService: lastMonth, nextServiceDue: 5000, currentHours: 3890, location: "San Jose Office", notes: "Fleet management", createdAt: twoMonthsAgo },
  { id: 4, clientId: 4, unitId: "GPS-004", type: "GPS Tracker", serialNumber: "SN-2024-004", manufacturer: "CalAmp", model: "TTU-2830", installDate: lastMonth, warrantyExpiry: nextWeek, status: "active", lastService: lastWeek, nextServiceDue: 5000, currentHours: 2100, location: "Chicago Depot", notes: "Needs calibration", createdAt: lastMonth },
  { id: 5, clientId: 5, unitId: "SEC-005", type: "Access Control", serialNumber: "SN-2024-005", manufacturer: "HID Global", model: "iCLASS SE", installDate: twoMonthsAgo, warrantyExpiry: nextWeek, status: "active", lastService: lastMonth, nextServiceDue: 2000, currentHours: 1560, location: "Seattle Campus", notes: "Badge reader system", createdAt: twoMonthsAgo },
  { id: 6, clientId: 5, unitId: "CAM-006", type: "Security Camera", serialNumber: "SN-2024-006", manufacturer: "Hikvision", model: "DS-2CD2T46", installDate: lastMonth, warrantyExpiry: nextWeek, status: "active", lastService: lastWeek, nextServiceDue: 3000, currentHours: 890, location: "Seattle Data Center", notes: "Thermal imaging", createdAt: lastMonth },
  { id: 7, clientId: 8, unitId: "GPS-007", type: "GPS Tracker", serialNumber: "SN-2024-007", manufacturer: "Samsara", model: "VG34", installDate: twoMonthsAgo, warrantyExpiry: nextWeek, status: "maintenance", lastService: lastWeek, nextServiceDue: 5000, currentHours: 5200, location: "Denver Site A", notes: "Service due soon", createdAt: twoMonthsAgo },
  { id: 8, clientId: 8, unitId: "CAM-008", type: "Security Camera", serialNumber: "SN-2024-008", manufacturer: "Bosch", model: "FLEXIDOME", installDate: lastMonth, warrantyExpiry: nextWeek, status: "active", lastService: lastWeek, nextServiceDue: 3000, currentHours: 1340, location: "Denver Site B", notes: "Wide-angle coverage", createdAt: lastMonth },
  { id: 9, clientId: 2, unitId: "SEC-009", type: "Access Control", serialNumber: "SN-2024-009", manufacturer: "Suprema", model: "BioStation 3", installDate: lastMonth, warrantyExpiry: nextWeek, status: "active", lastService: lastWeek, nextServiceDue: 2000, currentHours: 760, location: "San Jose Lab", notes: "Biometric scanner", createdAt: lastMonth },
  { id: 10, clientId: 4, unitId: "GPS-010", type: "GPS Tracker", serialNumber: "SN-2024-010", manufacturer: "Geotab", model: "GO9", installDate: twoMonthsAgo, warrantyExpiry: nextWeek, status: "active", lastService: lastMonth, nextServiceDue: 5000, currentHours: 3450, location: "Chicago Hub", notes: "Real-time tracking", createdAt: twoMonthsAgo },
];

const mockServiceRecords: ServiceRecord[] = [
  { id: 1, equipmentId: 1, clientId: 1, technician: "James Rodriguez", serviceType: "pms", description: "Quarterly preventative maintenance. Replaced GPS antenna, updated firmware to v3.2.1.", hoursAtService: 4500, partsUsed: "GPS Antenna AX-200, Firmware Update", status: "completed", scheduledDate: lastWeek, completedDate: lastWeek, cost: 450.00, invoiceId: 1, createdAt: lastWeek },
  { id: 2, equipmentId: 2, clientId: 1, technician: "James Rodriguez", serviceType: "installation", description: "Installed PTZ dome camera at warehouse loading dock. Configured motion detection zones.", hoursAtService: 0, partsUsed: "Mounting Bracket, Power Cable 50ft", status: "completed", scheduledDate: lastMonth, completedDate: lastMonth, cost: 1200.00, invoiceId: 2, createdAt: lastMonth },
  { id: 3, equipmentId: 3, clientId: 2, technician: "James Rodriguez", serviceType: "pms", description: "Firmware update and battery check. All systems nominal.", hoursAtService: 3800, partsUsed: "Battery Pack BP-100", status: "completed", scheduledDate: lastMonth, completedDate: lastMonth, cost: 320.00, invoiceId: 3, createdAt: lastMonth },
  { id: 4, equipmentId: 4, clientId: 4, technician: "James Rodriguez", serviceType: "repair", description: "Replaced faulty GPS module. Signal strength restored to 98%.", hoursAtService: 2000, partsUsed: "GPS Module GM-500", status: "completed", scheduledDate: lastWeek, completedDate: lastWeek, cost: 680.00, invoiceId: 4, createdAt: lastWeek },
  { id: 5, equipmentId: 5, clientId: 5, technician: "James Rodriguez", serviceType: "inspection", description: "Annual compliance inspection. All access points verified operational.", hoursAtService: 1500, partsUsed: "None", status: "completed", scheduledDate: lastMonth, completedDate: lastMonth, cost: 250.00, invoiceId: 5, createdAt: lastMonth },
  { id: 6, equipmentId: 7, clientId: 8, technician: "James Rodriguez", serviceType: "pms", description: "Scheduled maintenance. Engine hours approaching service limit. Oil change and filter replacement.", hoursAtService: 5200, partsUsed: "Oil Filter OF-300, Air Filter AF-200", status: "in_progress", scheduledDate: now, completedDate: null, cost: 380.00, invoiceId: null, createdAt: now },
  { id: 7, equipmentId: 6, clientId: 5, technician: "James Rodriguez", serviceType: "pms", description: "Thermal imaging calibration and lens cleaning.", hoursAtService: 850, partsUsed: "Lens Cleaning Kit", status: "completed", scheduledDate: lastWeek, completedDate: lastWeek, cost: 180.00, invoiceId: 6, createdAt: lastWeek },
  { id: 8, equipmentId: 9, clientId: 2, technician: "James Rodriguez", serviceType: "installation", description: "Biometric scanner installation at San Jose Lab. Enrolled 45 users.", hoursAtService: 0, partsUsed: "BioStation 3 Unit, Network Cable", status: "completed", scheduledDate: lastMonth, completedDate: lastMonth, cost: 950.00, invoiceId: 7, createdAt: lastMonth },
  { id: 9, equipmentId: 10, clientId: 4, technician: "James Rodriguez", serviceType: "pms", description: "Standard maintenance. Updated tracking interval to 30 seconds.", hoursAtService: 3400, partsUsed: "SIM Card Replacement", status: "completed", scheduledDate: lastMonth, completedDate: lastMonth, cost: 290.00, invoiceId: 8, createdAt: lastMonth },
  { id: 10, equipmentId: 1, clientId: 1, technician: "James Rodriguez", serviceType: "inspection", description: "Post-storm damage assessment. No issues found.", hoursAtService: 4200, partsUsed: "None", status: "completed", scheduledDate: twoMonthsAgo, completedDate: twoMonthsAgo, cost: 150.00, invoiceId: null, createdAt: twoMonthsAgo },
  { id: 11, equipmentId: 3, clientId: 2, technician: "James Rodriguez", serviceType: "repair", description: "Screen replacement on fleet management unit. Touch functionality restored.", hoursAtService: 3500, partsUsed: "Display Panel DP-700", status: "completed", scheduledDate: twoMonthsAgo, completedDate: twoMonthsAgo, cost: 520.00, invoiceId: null, createdAt: twoMonthsAgo },
  { id: 12, equipmentId: 8, clientId: 8, technician: "James Rodriguez", serviceType: "installation", description: "Wide-angle camera installation at Site B entrance. Night vision enabled.", hoursAtService: 0, partsUsed: "Bosch FLEXIDOME Unit, Conduit 30ft", status: "completed", scheduledDate: lastMonth, completedDate: lastMonth, cost: 1350.00, invoiceId: null, createdAt: lastMonth },
  { id: 13, equipmentId: 5, clientId: 5, technician: "James Rodriguez", serviceType: "pms", description: "Card reader deep clean and firmware update to v2.5.", hoursAtService: 1200, partsUsed: "Cleaning Solution", status: "completed", scheduledDate: twoMonthsAgo, completedDate: twoMonthsAgo, cost: 200.00, invoiceId: null, createdAt: twoMonthsAgo },
  { id: 14, equipmentId: 2, clientId: 1, technician: "James Rodriguez", serviceType: "pms", description: "Dome camera auto-focus recalibration and lens inspection.", hoursAtService: 2700, partsUsed: "None", status: "completed", scheduledDate: twoMonthsAgo, completedDate: twoMonthsAgo, cost: 175.00, invoiceId: null, createdAt: twoMonthsAgo },
  { id: 15, equipmentId: 4, clientId: 4, technician: "James Rodriguez", serviceType: "pms", description: "Standard GPS tracker maintenance. Signal verification complete.", hoursAtService: 1800, partsUsed: "Antenna Cable", status: "completed", scheduledDate: twoMonthsAgo, completedDate: twoMonthsAgo, cost: 220.00, invoiceId: null, createdAt: twoMonthsAgo },
];

const mockServicePhotos: ServicePhoto[] = [
  { id: 1, serviceRecordId: 1, type: "before", url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='200'%3E%3Crect fill='%23222' width='300' height='200'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23F2A900' font-family='monospace' font-size='14'%3EBEFORE: GPS-001%3C/text%3E%3C/svg%3E", caption: "GPS antenna before replacement", uploadedAt: lastWeek },
  { id: 2, serviceRecordId: 1, type: "after", url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='200'%3E%3Crect fill='%23222' width='300' height='200'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%2310B981' font-family='monospace' font-size='14'%3EAFTER: GPS-001%3C/text%3E%3C/svg%3E", caption: "New GPS antenna installed", uploadedAt: lastWeek },
  { id: 3, serviceRecordId: 4, type: "before", url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='200'%3E%3Crect fill='%23222' width='300' height='200'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23EF4444' font-family='monospace' font-size='14'%3EBEFORE: GPS-004%3C/text%3E%3C/svg%3E", caption: "Faulty GPS module", uploadedAt: lastWeek },
  { id: 4, serviceRecordId: 4, type: "after", url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='200'%3E%3Crect fill='%23222' width='300' height='200'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%2310B981' font-family='monospace' font-size='14'%3EAFTER: GPS-004%3C/text%3E%3C/svg%3E", caption: "New module installed, 98% signal", uploadedAt: lastWeek },
  { id: 5, serviceRecordId: 7, type: "before", url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='200'%3E%3Crect fill='%23222' width='300' height='200'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23F2A900' font-family='monospace' font-size='14'%3EBEFORE: CAM-006%3C/text%3E%3C/svg%3E", caption: "Thermal camera lens condition", uploadedAt: lastWeek },
  { id: 6, serviceRecordId: 7, type: "after", url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='200'%3E%3Crect fill='%23222' width='300' height='200'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%2310B981' font-family='monospace' font-size='14'%3EAFTER: CAM-006%3C/text%3E%3C/svg%3E", caption: "Calibrated and cleaned", uploadedAt: lastWeek },
];

const mockBookings: Booking[] = [
  { id: 1, clientId: 1, equipmentId: 1, serviceType: "pms", requestedDate: nextWeek, preferredTime: "09:00-12:00", status: "confirmed", notes: "Regular quarterly maintenance", createdAt: lastWeek },
  { id: 2, clientId: 2, equipmentId: 3, serviceType: "pms", requestedDate: nextWeek, preferredTime: "13:00-17:00", status: "pending", notes: "Annual service due", createdAt: lastWeek },
  { id: 3, clientId: 4, equipmentId: 10, serviceType: "pms", requestedDate: nextWeek, preferredTime: "08:00-12:00", status: "confirmed", notes: "Standard maintenance window", createdAt: lastWeek },
  { id: 4, clientId: 5, equipmentId: 5, serviceType: "inspection", requestedDate: nextWeek, preferredTime: "10:00-14:00", status: "pending", notes: "Compliance inspection required", createdAt: lastWeek },
  { id: 5, clientId: 8, equipmentId: 7, serviceType: "pms", requestedDate: nextWeek, preferredTime: "07:00-11:00", status: "confirmed", notes: "Overdue service, urgent", createdAt: lastWeek },
];

export const useOperationsStore = create<OperationsState>()(
  persist(
    (set, get) => ({
      equipment: mockEquipment,
      serviceRecords: mockServiceRecords,
      servicePhotos: mockServicePhotos,
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
          if (record && data.status === "completed" && !record.invoiceId) {
            const invoiceNumber = `INV-${2024}-${String(state.serviceRecords.length + 1).padStart(4, "0")}`;
            const tax = record.cost * 0.1;
            const newInvoice = {
              id: Date.now() + 1,
              clientId: record.clientId,
              packageId: null as number | null,
              serviceRecordId: record.id,
              invoiceNumber,
              amount: record.cost,
              tax,
              total: record.cost + tax,
              status: "sent" as const,
              dueDate: new Date(Date.now() + 30 * 86400000).toISOString(),
              paidDate: null as string | null,
              createdAt: new Date().toISOString(),
            };
            const updatedRecord = { ...record, invoiceId: newInvoice.id };
            const finalRecords = updatedRecords.map((r) =>
              r.id === id ? updatedRecord : r
            );
            useBillingStore.getState()._addInvoice(newInvoice);
            return { serviceRecords: finalRecords };
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

      getEquipmentByClient: (clientId) => {
        return get().equipment.filter((e) => e.clientId === clientId);
      },

      getServiceHistory: (equipmentId) => {
        return get().serviceRecords.filter((r) => r.equipmentId === equipmentId);
      },

      getClientServiceHistory: (clientId) => {
        return get().serviceRecords.filter((r) => r.clientId === clientId);
      },

      generateQRData: (serialNumber) => {
        return JSON.stringify({
          serial: serialNumber,
          company: "NexTOS",
          scannedAt: new Date().toISOString(),
        });
      },
    }),
    {
      name: "nextos-operations",
    }
  )
);
