import type { ServiceHistoryFilters, ServiceHistoryRecord, ServiceHistorySummary } from "./types";
import { getServiceDate } from "./formatters";

type SeedClient = {
  id: string;
  companyName: string;
};

type SeedEquipment = {
  id: string;
  name?: string;
  clientId?: string;
  serialNumber?: string;
  equipmentType?: string;
  hoursTotal?: string;
  kmTotal?: number;
  pmsConfiguration?: {
    serviceInterval: number;
    serviceIntervalUnit: string;
    serviceType: string;
    estimatedCost?: number;
  }[];
};

type SeedServiceRecord = Record<string, unknown> & {
  id: number;
  seedEquipmentId?: string;
  equipmentId?: string | number;
  clientId?: string | number;
  clientName?: string;
  equipmentName?: string;
  equipmentType?: string;
  serialNumber?: string;
  serviceType?: string;
  serviceCategory?: string;
  status?: string;
  scheduledDate?: string;
  completedDate?: string | null;
  technician?: string;
  description?: string;
  findings?: string;
  workDone?: string;
  recommendation?: string;
  partsUsed?: string;
  partsUsedDetails?: { name: string; quantity: number; pricePerUnit: number }[];
  selectedParts?: { name: string; quantity: number; pricePerUnit: number }[];
  cost?: number;
  finalCost?: number | null;
};

export type ServiceHistorySeedSource = {
  clients: SeedClient[];
  equipment: SeedEquipment[];
  serviceRecords: SeedServiceRecord[];
};

function numericClientIdToSeedId(value: string | number | undefined) {
  const numeric = Number(String(value ?? "").replace(/\D/g, ""));
  return Number.isFinite(numeric) && numeric > 0 ? `CL-${String(numeric).padStart(3, "0")}` : "";
}

function resolveEquipment(record: SeedServiceRecord, equipment: SeedEquipment[]) {
  const directId = typeof record.seedEquipmentId === "string" ? record.seedEquipmentId : "";
  const legacyId = typeof record.equipmentId === "string" ? record.equipmentId : "";

  return equipment.find((item) => item.id === directId)
    ?? equipment.find((item) => item.id === legacyId)
    ?? equipment.find((item) => item.name === record.equipmentName && item.serialNumber === record.serialNumber);
}

function resolveClientId(record: SeedServiceRecord, equipment: SeedEquipment | undefined, clients: SeedClient[]) {
  if (equipment?.clientId) return equipment.clientId;

  const matchedClient = clients.find((client) => client.companyName === record.clientName);
  if (matchedClient) return matchedClient.id;

  return numericClientIdToSeedId(record.clientId);
}

export function mapServiceRecordsToClientAccounts(source: ServiceHistorySeedSource): ServiceHistoryRecord[] {
  return (source.serviceRecords ?? []).map((record) => {
    const equipment = resolveEquipment(record, source.equipment ?? []);
    const clientId = resolveClientId(record, equipment, source.clients ?? []);
    const client = source.clients.find((item) => item.id === clientId);
    const partsUsedDetails = record.partsUsedDetails ?? record.selectedParts ?? [];

    return {
      id: record.id,
      equipmentId: equipment?.id ?? String(record.seedEquipmentId ?? record.equipmentId ?? ""),
      clientId,
      clientName: client?.companyName ?? record.clientName ?? "Unknown Client",
      equipmentName: equipment?.name ?? record.equipmentName ?? "Unknown Unit",
      equipmentType: equipment?.equipmentType ?? record.equipmentType ?? "-",
      serialNumber: equipment?.serialNumber ?? record.serialNumber ?? "-",
      serviceType: record.serviceType ?? record.serviceCategory ?? "Unknown",
      serviceCategory: record.serviceCategory ?? record.serviceType ?? "Unknown",
      status: record.status ?? "scheduled",
      scheduledDate: record.scheduledDate ?? new Date().toISOString(),
      completedDate: record.completedDate ?? null,
      technician: record.technician ?? "Unassigned",
      description: record.description ?? "",
      findings: record.findings ?? "",
      workDone: record.workDone ?? "",
      recommendation: record.recommendation ?? "",
      partsUsed: record.partsUsed ?? "",
      partsUsedDetails,
      cost: record.finalCost ?? record.cost ?? 0,
      hoursAtService: typeof record.hoursAtService === "number" ? record.hoursAtService : undefined,
      metricAtService: typeof record.metricAtService === "string" ? record.metricAtService : undefined,
      serviceInterval: typeof record.serviceInterval === "number" ? record.serviceInterval : undefined,
      serviceIntervalUnit: typeof record.serviceIntervalUnit === "string" ? record.serviceIntervalUnit : undefined,
      equipmentStatusAtService: typeof record.equipmentStatusAtService === "string" ? record.equipmentStatusAtService : undefined,
      equipmentSiteAddress: typeof record.equipmentSiteAddress === "string" ? record.equipmentSiteAddress : undefined,
      technicianAddress: typeof record.technicianAddress === "string" ? record.technicianAddress : undefined,
      travelStartTime: typeof record.travelStartTime === "string" ? record.travelStartTime : null,
      arrivalTime: typeof record.arrivalTime === "string" ? record.arrivalTime : null,
      startTime: typeof record.startTime === "string" ? record.startTime : null,
      completionTime: typeof record.completionTime === "string" ? record.completionTime : null,
      endTime: typeof record.endTime === "string" ? record.endTime : null,
      duration: typeof record.duration === "string" ? record.duration : null,
      beforePhoto: typeof record.beforePhoto === "string" ? record.beforePhoto : undefined,
      beforeNotes: typeof record.beforeNotes === "string" ? record.beforeNotes : undefined,
      afterPhoto: typeof record.afterPhoto === "string" ? record.afterPhoto : undefined,
      afterNotes: typeof record.afterNotes === "string" ? record.afterNotes : undefined,
      techSignature: typeof record.techSignature === "string" ? record.techSignature : undefined,
      clientSignature: typeof record.clientSignature === "string" ? record.clientSignature : undefined,
    };
  });
}

export function filterServiceHistoryRecords(records: ServiceHistoryRecord[], filters: ServiceHistoryFilters) {
  const normalizedSearch = filters.search.trim().toLowerCase();

  return records
    .filter((record) => {
      const serviceDate = getServiceDate(record).slice(0, 10);

      if (filters.equipmentId !== "all" && record.equipmentId !== filters.equipmentId) return false;
      if (filters.serviceType !== "all" && record.serviceType !== filters.serviceType) return false;
      if (filters.status !== "all" && record.status !== filters.status) return false;
      if (filters.dateFrom && serviceDate < filters.dateFrom) return false;
      if (filters.dateTo && serviceDate > filters.dateTo) return false;
      if (!normalizedSearch) return true;

      return [
        record.equipmentName,
        record.equipmentType,
        record.serialNumber,
        record.technician,
        record.serviceType,
        record.description,
        record.findings,
        record.workDone,
        record.partsUsed,
      ]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedSearch));
    })
    .sort((a, b) => new Date(getServiceDate(b)).getTime() - new Date(getServiceDate(a)).getTime());
}

export function summarizeServiceHistory(records: ServiceHistoryRecord[]): ServiceHistorySummary {
  return {
    totalServices: records.length,
    completedServices: records.filter((record) => record.status === "completed").length,
    inProgressServices: records.filter((record) => record.status === "in_progress").length,
    cancelledServices: records.filter((record) => record.status === "cancelled").length,
    totalSpent: records.reduce((sum, record) => sum + record.cost, 0),
  };
}
