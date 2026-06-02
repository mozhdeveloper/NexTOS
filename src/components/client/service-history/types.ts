export type ServiceHistoryStatus = "scheduled" | "in_progress" | "completed" | "cancelled" | string;

export type ServiceHistoryRecord = {
  id: number;
  equipmentId: string;
  clientId: string;
  clientName: string;
  equipmentName: string;
  equipmentType: string;
  serialNumber: string;
  serviceType: string;
  serviceCategory: string;
  status: ServiceHistoryStatus;
  scheduledDate: string;
  completedDate: string | null;
  technician: string;
  description: string;
  findings: string;
  workDone: string;
  recommendation: string;
  partsUsed: string;
  partsUsedDetails: { name: string; quantity: number; pricePerUnit: number }[];
  cost: number;
  hoursAtService?: number;
  metricAtService?: string;
  serviceInterval?: number;
  serviceIntervalUnit?: string;
  equipmentStatusAtService?: string;
  equipmentSiteAddress?: string;
  technicianAddress?: string;
  travelStartTime?: string | null;
  arrivalTime?: string | null;
  startTime?: string | null;
  completionTime?: string | null;
  endTime?: string | null;
  duration?: string | null;
  beforePhoto?: string;
  beforeNotes?: string;
  afterPhoto?: string;
  afterNotes?: string;
  techSignature?: string;
  clientSignature?: string;
};

export type ServiceHistoryFilters = {
  search: string;
  equipmentId: string;
  serviceType: string;
  status: string;
  dateFrom: string;
  dateTo: string;
};

export type ServiceHistorySummary = {
  totalServices: number;
  completedServices: number;
  inProgressServices: number;
  cancelledServices: number;
  totalSpent: number;
};
