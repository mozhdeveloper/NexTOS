import { Fragment, useMemo, useState } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import { useOperationsStore } from "@/stores/useOperationsStore";
import { useClientPortalStore } from "@/stores/useClientPortalStore";
import seedData from "@/data/seed-data.json";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { History, ChevronDown, ChevronUp, Wrench, Search, Camera, FileText, FilterX, CheckCircle2, Clock3, AlertCircle, Wallet } from "lucide-react";

const serviceTypeColors: Record<string, string> = {
  pms:          "bg-[#66B2B2]/20 text-[#66B2B2]",
  repair:       "bg-[#EF4444]/20 text-[#EF4444]",
  inspection:   "bg-[#8B5CF6]/20 text-[#8B5CF6]",
  installation: "bg-[#66B2B2]/20 text-[#66B2B2]",
  calibration:  "bg-[#10B981]/20 text-[#10B981]",
};

const statusColors: Record<string, string> = {
  completed:   "bg-[#10B981]/20 text-[#10B981]",
  in_progress: "bg-[#66B2B2]/20 text-[#66B2B2]",
  pending:     "bg-[#6B7280]/20 text-gray-500",
  cancelled:   "bg-[#EF4444]/20 text-[#EF4444]",
  scheduled:   "bg-[#66B2B2]/20 text-[#66B2B2]",
};

const nextServiceStateColors = {
  ok: "bg-[#10B981]/20 text-[#10B981]",
  near: "bg-[#66B2B2]/20 text-[#66B2B2]",
  overdue: "bg-[#EF4444]/20 text-[#EF4444]",
} as const;

function getServiceDate(record: { completedDate: string | null; scheduledDate: string }) {
  return record.completedDate ?? record.scheduledDate;
}

function formatServiceType(serviceType?: string | null) {
  const normalized = typeof serviceType === "string" ? serviceType.trim().toLowerCase() : "";

  if (!normalized) {
    return "Unknown";
  }

  if (normalized === "pms") {
    return "PMS";
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function formatStatusLabel(status?: string | null) {
  const normalized = typeof status === "string" ? status.trim() : "";
  return normalized ? normalized.replace(/_/g, " ") : "unknown";
}

function formatHours(hours: number) {
  return `${hours.toLocaleString()} hrs`;
}

function formatDate(dateISO: string) {
  return new Date(dateISO).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatMoneyPeso(amount: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "--";
}

function splitDetailText(value?: string) {
  if (!value) {
    return [];
  }

  return value
    .split(/\.|,|;/)
    .map((item) => item.trim())
    .filter((item) => item.length > 2);
}

function buildWorkDone(record: {
  workDone?: string;
  description: string;
  partsUsed: string;
}) {
  const explicitItems = splitDetailText(record.workDone);
  if (explicitItems.length > 0) {
    return explicitItems;
  }

  const descriptionItems = splitDetailText(record.description);
  const partsItems = record.partsUsed && record.partsUsed !== "None"
    ? [`Parts used: ${record.partsUsed}`]
    : [];

  return [...descriptionItems.slice(0, 3), ...partsItems].slice(0, 4);
}

function buildFindings(record: {
  findings?: string;
  description: string;
  status: string;
}) {
  if (record.findings?.trim()) {
    return record.findings;
  }

  const [firstSentence, secondSentence] = splitDetailText(record.description);

  if (secondSentence) {
    return secondSentence;
  }

  if (firstSentence) {
    return firstSentence;
  }

  return record.status === "completed"
    ? "Service completed and recorded."
    : "Service activity is still in progress.";
}

function getNextServiceState(currentHours: number, nextServiceDue: number) {
  const remainingHours = nextServiceDue - currentHours;

  if (remainingHours <= 0) {
    return { label: "Overdue", tone: "overdue" as const, remainingHours };
  }

  if (remainingHours <= 100) {
    return { label: "Near Service", tone: "near" as const, remainingHours };
  }

  return { label: "OK", tone: "ok" as const, remainingHours };
}

export default function ClientServiceHistory() {
  const { user } = useAuthStore();
  const { equipment, serviceRecords, servicePhotos } = useOperationsStore();
  const { selectedCompanyId } = useClientPortalStore();
  
  // Map seedData company ID to numeric clientId
  const selectedCompanyIndex = seedData.clients.findIndex(c => c.id === selectedCompanyId);
  const clientId = selectedCompanyIndex !== -1 ? selectedCompanyIndex + 1 : (user?.clientId || 1);

  const [expanded, setExpanded] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [equipmentFilter, setEquipmentFilter] = useState("all");
  const [serviceTypeFilter, setServiceTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const eqClientNum = (id: string) => Number(String(id).replace(/\D/g, ""));
  const clientEquipment = useMemo(
    () => equipment.filter((item) => eqClientNum(item.clientId) === clientId),
    [equipment, clientId]
  );

  const equipmentById = useMemo(
    () => new Map(clientEquipment.map((item) => [item.id, item])),
    [clientEquipment]
  );

  const filteredRecords = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const clientEquipmentIds = new Set(clientEquipment.map(e => e.id));

    return serviceRecords
      .filter((record) => clientEquipmentIds.has(record.equipmentId))
      .filter((record) => {
        const asset = equipmentById.get(record.equipmentId);
        const serviceDate = getServiceDate(record).slice(0, 10);

        if (equipmentFilter !== "all" && record.equipmentId !== equipmentFilter) {
          return false;
        }

        if (serviceTypeFilter !== "all" && record.serviceType !== serviceTypeFilter) {
          return false;
        }

        if (statusFilter !== "all" && record.status !== statusFilter) {
          return false;
        }

        if (dateFrom && serviceDate < dateFrom) {
          return false;
        }

        if (dateTo && serviceDate > dateTo) {
          return false;
        }

        if (!normalizedSearch) {
          return true;
        }

        return [
          asset?.name ?? asset?.id,
          asset?.type,
          asset?.serialNumber,
          record.technician,
          record.serviceType,
          record.description,
          record.partsUsed,
        ]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(normalizedSearch));
      })
      .sort((a, b) => new Date(getServiceDate(b)).getTime() - new Date(getServiceDate(a)).getTime());
  }, [
    clientId,
    dateFrom,
    dateTo,
    equipmentById,
    equipmentFilter,
    search,
    serviceRecords,
    serviceTypeFilter,
    statusFilter,
  ]);

  const serviceTypes = useMemo(
    () => Array.from(new Set(clientEquipment.flatMap((asset) =>
      serviceRecords
        .filter((record) => record.clientId === clientId && record.equipmentId === asset.id)
        .map((record) => record.serviceType)
        .filter((serviceType) => typeof serviceType === "string" && serviceType.trim().length > 0)
    ))),
    [clientEquipment, clientId, serviceRecords]
  );

  const allClientRecords = useMemo(
    () => serviceRecords.filter((record) => record.clientId === clientId),
    [serviceRecords, clientId]
  );

  const totalServices = allClientRecords.length;
  const completedServices = allClientRecords.filter((record) => record.status === "completed").length;
  const inProgressServices = allClientRecords.filter((record) => record.status === "in_progress").length;
  const cancelledServices = allClientRecords.filter((record) => record.status === "cancelled").length;
  const totalSpent = allClientRecords.reduce((sum, record) => sum + record.cost, 0);

  const resetFilters = () => {
    setSearch("");
    setEquipmentFilter("all");
    setServiceTypeFilter("all");
    setStatusFilter("all");
    setDateFrom("");
    setDateTo("");
  };

  return (
    <div className="space-y-4 px-8 pt-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[32px] font-bold text-gray-900 tracking-[-0.02em]">Service History</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {clientEquipment.length} equipment units · {filteredRecords.length} matching service records
          </p>
        </div>
      </div>

      <div className="data-card p-4">
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))_minmax(0,0.9fr)_minmax(0,0.9fr)_auto] gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
            <Input
              placeholder="Search by equipment, technician, or work done"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 bg-white border-gray-200 text-gray-900 text-xs placeholder:text-gray-500/50"
            />
          </div>

          <Select value={equipmentFilter} onValueChange={setEquipmentFilter}>
            <SelectTrigger className="w-full h-9 border-gray-200 bg-white text-gray-900 text-xs">
              <SelectValue placeholder="All Equipment" />
            </SelectTrigger>
            <SelectContent className="border-gray-200 bg-white text-gray-900">
              <SelectItem value="all">All Equipment</SelectItem>
              {clientEquipment.map((asset) => (
                <SelectItem key={asset.id} value={String(asset.id)}>
                  {asset.name ?? asset.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={serviceTypeFilter} onValueChange={setServiceTypeFilter}>
            <SelectTrigger className="w-full h-9 border-gray-200 bg-white text-gray-900 text-xs">
              <SelectValue placeholder="All Service Types" />
            </SelectTrigger>
            <SelectContent className="border-gray-200 bg-white text-gray-900">
              <SelectItem value="all">All Service Types</SelectItem>
              {serviceTypes
                .filter((serviceType) => typeof serviceType === "string" && serviceType.trim().length > 0)
                .map((serviceType) => {
                  const normalizedServiceType = serviceType as string;
                  return (
                    <SelectItem key={normalizedServiceType} value={normalizedServiceType}>
                      {formatServiceType(normalizedServiceType)}
                    </SelectItem>
                  );
                })}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full h-9 border-gray-200 bg-white text-gray-900 text-xs">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent className="border-gray-200 bg-white text-gray-900">
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-9 bg-white border-gray-200 text-gray-900 text-xs"
          />

          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-9 bg-white border-gray-200 text-gray-900 text-xs"
          />

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={resetFilters}
            className="h-9 border-gray-200 bg-white text-gray-900 hover:bg-white"
          >
            <FilterX className="w-3.5 h-3.5" />
            Reset
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
        <div className="data-card p-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs text-gray-500">Total Services</div>
              <div className="text-3xl font-bold text-gray-900 mt-1 font-mono-tech">{totalServices}</div>
              <div className="text-[11px] text-gray-500 mt-1">All time</div>
            </div>
            <div className="w-9 h-9 rounded-full bg-white shadow-sm flex items-center justify-center">
              <Wrench className="w-4 h-4 text-[#2563EB]" />
            </div>
          </div>
        </div>

        <div className="data-card p-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs text-gray-500">Completed</div>
              <div className="text-3xl font-bold text-gray-900 mt-1 font-mono-tech">{completedServices}</div>
              <div className="text-[11px] text-gray-500 mt-1">
                {totalServices > 0 ? `${Math.round((completedServices / totalServices) * 100)}%` : "0%"}
              </div>
            </div>
            <div className="w-9 h-9 rounded-full bg-white shadow-sm flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-[#059669]" />
            </div>
          </div>
        </div>

        <div className="data-card p-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs text-gray-500">In Progress</div>
              <div className="text-3xl font-bold text-gray-900 mt-1 font-mono-tech">{inProgressServices}</div>
              <div className="text-[11px] text-gray-500 mt-1">
                {totalServices > 0 ? `${Math.round((inProgressServices / totalServices) * 100)}%` : "0%"}
              </div>
            </div>
            <div className="w-9 h-9 rounded-full bg-white shadow-sm flex items-center justify-center">
              <Clock3 className="w-4 h-4 text-[#66B2B2]" />
            </div>
          </div>
        </div>

        <div className="data-card p-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs text-gray-500">Cancelled</div>
              <div className="text-3xl font-bold text-gray-900 mt-1 font-mono-tech">{cancelledServices}</div>
              <div className="text-[11px] text-gray-500 mt-1">
                {totalServices > 0 ? `${Math.round((cancelledServices / totalServices) * 100)}%` : "0%"}
              </div>
            </div>
            <div className="w-9 h-9 rounded-full bg-white shadow-sm flex items-center justify-center">
              <AlertCircle className="w-4 h-4 text-[#DC2626]" />
            </div>
          </div>
        </div>

        <div className="data-card p-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs text-gray-500">Total Spent</div>
              <div className="text-3xl font-bold text-gray-900 mt-1 font-mono-tech">{formatMoneyPeso(totalSpent)}</div>
              <div className="text-[11px] text-gray-500 mt-1">All time</div>
            </div>
            <div className="w-9 h-9 rounded-full bg-white shadow-sm flex items-center justify-center">
              <Wallet className="w-4 h-4 text-[#7C3AED]" />
            </div>
          </div>
        </div>
      </div>

      <div className="data-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left py-3 px-3 text-gray-500 font-medium">Equipment</th>
                <th className="text-left py-3 px-3 text-gray-500 font-medium">Service Type</th>
                <th className="text-left py-3 px-3 text-gray-500 font-medium">Date</th>
                <th className="text-left py-3 px-3 text-gray-500 font-medium">Technician</th>
                <th className="text-left py-3 px-3 text-gray-500 font-medium">Current Hours</th>
                <th className="text-left py-3 px-3 text-gray-500 font-medium">Next Service At</th>
                <th className="text-left py-3 px-3 text-gray-500 font-medium">Status</th>
                <th className="text-left py-3 px-3 text-gray-500 font-medium">Amount</th>
                <th className="text-left py-3 px-3 text-gray-500 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-10 px-3">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <History className="w-8 h-8 text-gray-500" />
                      <p className="text-sm text-gray-500">No service records match the current filters</p>
                    </div>
                  </td>
                </tr>
              )}

              {filteredRecords.map((record) => {
                const asset = equipmentById.get(record.equipmentId);
                const photos = servicePhotos.filter((photo) => photo.serviceRecordId === record.id);
                const beforePhotos = photos.filter((photo) => photo.type === "before");
                const afterPhotos = photos.filter((photo) => photo.type === "after");
                const workDoneItems = buildWorkDone(record);
                const findingsSummary = buildFindings(record);
                const isExpanded = expanded === record.id;
                const parseH = (t?: string) => { const m = String(t ?? "").match(/(\d+)\s*h/i); return m ? Number(m[1]) : 0; };
                const config = asset?.pmsConfiguration?.find((c: any) => c.serviceIntervalUnit?.toLowerCase() === "hours");
                const currentH = parseH(asset?.hoursTotal);
                const nextMilestone = config ? (Math.floor(currentH / config.serviceInterval) + 1) * config.serviceInterval : 0;
                const nextService = getNextServiceState(currentH, nextMilestone);
                const serviceTypeKey = typeof record.serviceType === "string" ? record.serviceType.toLowerCase() : "";
                const statusKey = typeof record.status === "string" ? record.status.toLowerCase() : "";
                const serviceTypeLabel = formatServiceType(record.serviceType);
                const statusLabel = formatStatusLabel(record.status);

                return (
                  <Fragment key={record.id}>
                    <tr className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-11 h-11 rounded-md bg-white shadow-sm border border-gray-200 flex items-center justify-center shrink-0">
                            <Wrench className="w-4 h-4 text-[#2563EB]" />
                          </div>
                          <div>
                            <div className="text-base font-semibold text-gray-900 leading-tight">{asset?.name ?? asset?.id ?? "Unknown Unit"}</div>
                            <div className="text-sm text-gray-400">SN: {asset?.serialNumber ?? "—"}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="text-gray-900 font-semibold">{serviceTypeLabel}</div>
                        <div className={`inline-flex mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${serviceTypeColors[serviceTypeKey] ?? "bg-[#6B7280]/20 text-gray-500"}`}>
                          {serviceTypeKey ? serviceTypeKey.toUpperCase() : "UNKNOWN"}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="text-gray-900 font-semibold">{formatDate(getServiceDate(record))}</div>
                        <div className="text-gray-400 mt-0.5">
                          {new Date(getServiceDate(record)).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-[#66B2B2] text-white flex items-center justify-center text-[10px] font-semibold">
                            {getInitials(record.technician)}
                          </div>
                          <span className="text-gray-900">{record.technician}</span>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="text-[#059669] font-semibold font-mono-tech">{asset?.hoursTotal ?? "—"}</div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="text-gray-900 font-semibold font-mono-tech">{config ? `${nextMilestone}h` : "—"}</div>
                        <div className={`mt-0.5 ${nextService.remainingHours <= 0 ? "text-[#EF4444]" : "text-[#059669]"}`}>
                          {nextService.remainingHours > 0
                            ? `${nextService.remainingHours.toLocaleString()} hrs remaining`
                            : `${Math.abs(nextService.remainingHours).toLocaleString()} hrs overdue`}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-medium capitalize ${statusColors[statusKey] ?? "bg-[#6B7280]/20 text-gray-500"}`}>
                          {statusLabel}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-gray-900 font-semibold">{formatMoneyPeso(record.cost)}</td>

                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setExpanded(isExpanded ? null : record.id)}
                            className="h-8 border-[#66B2B2] bg-gray-50 text-gray-900 hover:bg-gray-100"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            View
                          </Button>
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="outline"
                            onClick={() => setExpanded(isExpanded ? null : record.id)}
                            className="h-8 w-8 border-gray-200 bg-gray-50 text-gray-500 hover:text-gray-900"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </Button>
                        </div>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr className="border-b border-gray-100">
                        <td colSpan={9} className="p-3 bg-gray-50">
                          <div className="rounded-xl border border-[#66B2B2]/40 bg-white">
                            <div className="p-4 grid grid-cols-1 xl:grid-cols-[minmax(0,1.4fr)_repeat(5,minmax(0,0.8fr))_auto] gap-4 border-b border-gray-200">
                              <div className="flex items-center gap-3">
                                <div className="w-20 h-14 rounded-md bg-white shadow-sm border border-gray-200 flex items-center justify-center shrink-0">
                                  <Wrench className="w-5 h-5 text-[#2563EB]" />
                                </div>
                                <div>
                                  <div className="text-2xl font-semibold text-gray-900 leading-tight">{asset?.name ?? asset?.id ?? "Unknown Unit"}</div>
                                  <div className="text-sm text-gray-400 mt-0.5">SN: {asset?.serialNumber ?? "—"}</div>
                                  <span className={`inline-flex mt-2 px-2 py-0.5 rounded text-[11px] font-medium capitalize ${statusColors[statusKey] ?? "bg-[#6B7280]/20 text-gray-500"}`}>
                                    {statusLabel}
                                  </span>
                                </div>
                              </div>

                              <div>
                                <div className="text-[10px] text-gray-400 uppercase">Service Date</div>
                                <div className="text-2xl text-gray-900 mt-0.5">{formatDate(getServiceDate(record))}</div>
                                <div className="text-sm text-gray-400 mt-0.5">
                                  {new Date(getServiceDate(record)).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                                </div>
                              </div>

                              <div>
                                <div className="text-[10px] text-gray-400 uppercase">Technician</div>
                                <div className="text-2xl text-gray-900 mt-0.5">{record.technician}</div>
                              </div>

                              <div>
                                <div className="text-[10px] text-gray-400 uppercase">Current Hours</div>
                                <div className="text-2xl text-[#059669] mt-0.5 font-mono-tech">{asset?.hoursTotal ?? "—"}</div>
                              </div>

                              <div>
                                <div className="text-[10px] text-gray-400 uppercase">Next Service At</div>
                                <div className="text-2xl text-gray-900 mt-0.5 font-mono-tech">{config ? `${nextMilestone}h` : "—"}</div>
                                <div className="text-sm text-[#059669] mt-0.5">
                                  {nextService.remainingHours > 0
                                    ? `${nextService.remainingHours.toLocaleString()} hrs remaining`
                                    : `${Math.abs(nextService.remainingHours).toLocaleString()} hrs overdue`}
                                </div>
                              </div>

                              <div>
                                <div className="text-[10px] text-gray-400 uppercase">Amount</div>
                                <div className="text-2xl text-gray-900 mt-0.5">{formatMoneyPeso(record.cost)}</div>
                              </div>

                              <div className="flex flex-col gap-2 items-stretch xl:items-end">
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="h-9 border-[#66B2B2] bg-gray-50 text-gray-900 hover:bg-gray-100"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                  View Report
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  disabled={photos.length === 0}
                                  className="h-9 border-gray-200 bg-gray-50 text-gray-900 hover:bg-gray-100 disabled:opacity-40"
                                >
                                  <Camera className="w-3.5 h-3.5" />
                                  View Photos ({photos.length})
                                </Button>
                              </div>
                            </div>

                            <div className="p-4 grid grid-cols-1 lg:grid-cols-4 gap-4 text-xs">
                              <div className="space-y-2">
                                <div className="text-[11px] text-gray-400 uppercase">Service Details</div>
                                <RowDetail label="Service Type" value={formatServiceType(record.serviceType)} />
                                <RowDetail label="Service Category" value={record.serviceType === "pms" ? "Preventive Maintenance" : formatServiceType(record.serviceType)} />
                                <RowDetail label="Priority" value={record.status === "in_progress" ? "High" : "Normal"} />
                                <RowDetail label="Work Order" value={`WO-${new Date(getServiceDate(record)).getFullYear()}-${String(record.id).padStart(4, "0")}`} />
                                <RowDetail label="Location" value={asset?.location ?? "—"} />
                              </div>

                              <div>
                                <div className="text-[11px] text-gray-400 uppercase mb-2">Work Performed</div>
                                <div className="space-y-2">
                                  {workDoneItems.length > 0 ? workDoneItems.map((item) => (
                                    <div key={item} className="flex items-start gap-2 text-gray-900">
                                      <span className="mt-1 w-1.5 h-1.5 rounded-full bg-[#10B981] shrink-0" />
                                      <span>{item}</span>
                                    </div>
                                  )) : (
                                    <div className="text-gray-400">No detailed work log attached.</div>
                                  )}
                                </div>
                              </div>

                              <div>
                                <div className="text-[11px] text-gray-400 uppercase mb-2">Findings / Notes</div>
                                <p className="text-gray-900 leading-relaxed">{findingsSummary}</p>
                                <div className="text-gray-400 mt-3">{record.description}</div>
                              </div>

                              <div className="space-y-2">
                                <div className="text-[11px] text-gray-400 uppercase">Next Service Information</div>
                                <RowDetail label="Next Service Type" value={serviceTypeLabel} />
                                <RowDetail label="Next Service At" value={config ? `${nextMilestone}h` : "—"} />
                                <RowDetail label="Before / After" value={`${beforePhotos.length} / ${afterPhotos.length}`} />
                                <RowDetail label="Reminder" value="30 days before" />
                                <div className="mt-3 p-2 rounded-md bg-gray-50 border border-gray-200 flex items-center justify-between">
                                  <span className="text-gray-400">Status</span>
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${nextServiceStateColors[nextService.tone]}`}>
                                    {nextService.label}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function RowDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-gray-400">{label}</span>
      <span className="text-gray-900 text-right">{value}</span>
    </div>
  );
}
