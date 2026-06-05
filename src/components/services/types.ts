export type TabType = "dashboard" | "tasks" | "equipment" | "reports" | "new" | "scheduled-maintenance";

export type ScheduledMaintenanceEntry = {
  id: string;
  equipmentId: string;
  scheduleIndex?: number;
  equipmentName: string;
  clientId: string;
  clientName: string;
  serialNumber: string;
  serviceType: string;
  serviceInterval: number;
  serviceIntervalUnit: string;
  estimatedCost: number;
  status: "OK" | "Near Service" | "Overdue" | "—";
};
