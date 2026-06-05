import { Fragment, useMemo, useState } from "react";
import type { ElementType } from "react";
import {
  Activity,
  Check,
  CheckCircle2,
  ChevronDown,
  FileText,
  History,
  MapPin,
  Package,
  Printer,
  QrCode,
  Search,
  Wallet,
  Wrench,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import seedData from "@/data/seed-data.json";
import { useClientPortalStore } from "@/stores/useClientPortalStore";
import { useOperationsStore } from "@/stores/useOperationsStore";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { Equipment, ServiceRecord } from "@/types";

type PmsStatus = "Overdue" | "Due" | "Due Soon" | "OK";

type PmsProgress = {
  serviceType: string;
  serviceInterval: number;
  serviceIntervalUnit: string;
  estimatedCost?: number;
  currentUsage: number;
  progressPercent: number;
  progressBarWidth: number;
  status: PmsStatus;
};

const statusRank: Record<PmsStatus, number> = {
  Overdue: 4,
  Due: 3,
  "Due Soon": 2,
  OK: 1,
};

function parseNumber(value: unknown): number {
  if (value === undefined || value === null || value === "") return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  const parsed = Number(String(value).replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseHours(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value !== "string") return 0;

  const hoursMatch = value.match(/(\d+(?:\.\d+)?)\s*h/i);
  const minutesMatch = value.match(/(\d+(?:\.\d+)?)\s*m/i);
  const hours = hoursMatch ? Number(hoursMatch[1]) : 0;
  const minutes = minutesMatch ? Number(minutesMatch[1]) : 0;

  return hours + minutes / 60;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatKm(value: unknown): string {
  const km = parseNumber(value);
  return km > 0 ? `${km.toFixed(2)} km` : "0.00 km";
}

function formatHours(value: unknown): string {
  if (typeof value === "string" && value.trim()) return value;
  const hours = parseHours(value);
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  return `${wholeHours}h ${minutes}m`;
}

function formatDate(value: unknown): string {
  if (!value) return "—";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getDaysBreakdown(value: unknown) {
  const days = parseNumber(value);
  const valid = days >= 0;

  return {
    daysDisplay: valid ? `${Math.floor(days)}` : "—",
    weeksDisplay: valid ? `${(days / 7).toFixed(1)}` : "—",
    monthsDisplay: valid ? `${(days / 30.44).toFixed(1)}` : "—",
    yearsDisplay: valid ? `${(days / 365.25).toFixed(1)}` : "—",
  };
}

function computePmsStatus(progressPercent: number): PmsStatus {
  if (progressPercent > 100) return "Overdue";
  if (progressPercent >= 100) return "Due";
  if (progressPercent >= 80) return "Due Soon";
  return "OK";
}

function getCurrentUsage(equipment: Equipment, unit: string): number {
  const normalizedUnit = unit.toLowerCase();

  if (normalizedUnit.includes("hour")) return parseHours(equipment.hoursTotal);
  if (normalizedUnit === "km" || normalizedUnit.includes("kilometer")) return parseNumber(equipment.kmTotal);
  if (normalizedUnit.includes("week")) return parseNumber(equipment.days) / 7;
  if (normalizedUnit.includes("month")) return parseNumber(equipment.days) / 30.44;
  if (normalizedUnit.includes("year")) return parseNumber(equipment.days) / 365.25;
  return parseNumber(equipment.days);
}

function getPmsProgress(equipment: Equipment): PmsProgress[] {
  if (!Array.isArray(equipment.pmsConfiguration)) return [];

  return equipment.pmsConfiguration
    .map((config) => {
      const serviceInterval = parseNumber(config.serviceInterval);
      const serviceIntervalUnit = config.serviceIntervalUnit ?? "";
      const currentUsage = getCurrentUsage(equipment, serviceIntervalUnit);
      const progressPercent = serviceInterval > 0 ? (currentUsage / serviceInterval) * 100 : 0;

      return {
        serviceType: config.serviceType || "PMS Schedule",
        serviceInterval,
        serviceIntervalUnit,
        estimatedCost: config.estimatedCost,
        currentUsage,
        progressPercent,
        progressBarWidth: Math.min(Math.max(progressPercent, 0), 100),
        status: computePmsStatus(progressPercent),
      };
    })
    .filter((entry) => entry.serviceInterval > 0);
}

function getWorstPmsProgress(equipment: Equipment): PmsProgress | null {
  const progress = getPmsProgress(equipment);
  if (!progress.length) return null;

  return progress.reduce((worst, current) => {
    if (statusRank[current.status] > statusRank[worst.status]) return current;
    if (statusRank[current.status] === statusRank[worst.status] && current.progressPercent > worst.progressPercent) {
      return current;
    }
    return worst;
  });
}

function getQrPayload(equipment: Equipment): string {
  const source = equipment as Equipment & { qrCode?: string; qr?: string };
  return source.qrCode ?? source.qr ?? `equipment:${equipment.id}|serial:${equipment.serialNumber ?? "N/A"}`;
}

function normalizeStatus(status: unknown): string {
  return String(status ?? "").toLowerCase();
}

function serviceMatchesEquipment(
  record: Partial<ServiceRecord> & Record<string, any>,
  equipment: Equipment,
  selectedClientName: string,
  allowClientNameFallback = true
): boolean {
  if (record.seedEquipmentId && String(record.seedEquipmentId) === String(equipment.id)) return true;
  if (record.equipmentId && String(record.equipmentId) === String(equipment.id)) return true;
  if (record.serialNumber && equipment.serialNumber && String(record.serialNumber) === String(equipment.serialNumber)) return true;
  if (record.equipmentName && equipment.name && String(record.equipmentName) === String(equipment.name)) return true;
  if (allowClientNameFallback && record.clientName && String(record.clientName) === selectedClientName) return true;
  return false;
}

function getStatusBadgeClasses(status: string): string {
  switch (status) {
    case "Overdue":
      return "bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/25";
    case "Due":
      return "bg-[#F2A900]/15 text-[#B77900] border-[#F2A900]/30";
    case "Due Soon":
      return "bg-[#66B2B2]/15 text-[#4F9C9C] border-[#66B2B2]/30";
    case "OK":
    case "active":
      return "bg-[#10B981]/15 text-[#059669] border-[#10B981]/25";
    case "maintenance":
    case "service_due":
      return "bg-[#66B2B2]/15 text-[#4F9C9C] border-[#66B2B2]/30";
    case "inactive":
    case "retired":
      return "bg-gray-100 text-gray-500 border-gray-200";
    default:
      return "bg-gray-100 text-gray-500 border-gray-200";
  }
}

function getDisplayStatus(equipment: Equipment): string {
  return getWorstPmsProgress(equipment)?.status ?? equipment.status ?? "OK";
}

function QRModal({
  equipment,
  isOpen,
  onClose,
}: {
  equipment: Equipment;
  isOpen: boolean;
  onClose: () => void;
}) {
  const qrPayload = getQrPayload(equipment);

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const qrSvg = document.getElementById(`client-qr-${equipment.id}`)?.outerHTML ?? "";

    printWindow.document.write(`
      <html>
        <head>
          <title>Print QR Tag - ${equipment.name ?? equipment.serialNumber}</title>
          <style>
            @page { size: auto; margin: 0; }
            body {
              font-family: Inter, Arial, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              text-align: center;
            }
            .tag-container {
              width: 300px;
              border: 2px solid #111827;
              border-radius: 20px;
              padding: 28px;
            }
            .brand { color: #66B2B2; font-size: 24px; font-weight: 900; }
            .unit { color: #111827; font-size: 18px; font-weight: 800; margin: 8px 0 18px; }
            .meta { color: #4B5563; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
            svg { width: 200px; height: 200px; }
          </style>
        </head>
        <body>
          <div class="tag-container">
            <div class="brand">NexTOS</div>
            <div class="unit">${equipment.name ?? equipment.id}</div>
            ${qrSvg}
            <div class="meta" style="margin-top: 18px;">${equipment.equipmentType ?? "Equipment"}</div>
            <div class="meta">SN: ${equipment.serialNumber ?? "N/A"}</div>
          </div>
          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => window.close(), 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-white border-gray-200 sm:max-w-md rounded-2xl shadow-2xl p-7">
        <DialogHeader className="items-center pb-3">
          <DialogTitle className="text-xl font-black tracking-tight text-gray-900">Equipment QR Tag</DialogTitle>
          <p className="text-sm text-gray-500 font-medium">{equipment.name ?? equipment.id}</p>
        </DialogHeader>

        <div className="flex flex-col items-center gap-6 py-2">
          <div className="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <QRCodeSVG
              id={`client-qr-${equipment.id}`}
              value={qrPayload}
              size={220}
              level="H"
              includeMargin={false}
            />
          </div>

          <div className="text-center space-y-1">
            <h3 className="text-sm font-black text-gray-900 font-mono-tech">{equipment.serialNumber ?? "N/A"}</h3>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{equipment.equipmentType ?? "Equipment"}</p>
          </div>

          <div className="w-full grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="h-11 rounded-xl font-bold border-gray-200 text-gray-600 hover:bg-gray-50"
            >
              Close
            </Button>
            <Button
              onClick={handlePrint}
              className="h-11 rounded-xl font-bold bg-[#66B2B2] text-white hover:bg-[#5A9E9E] shadow-lg shadow-[#66B2B2]/20"
            >
              <Printer className="w-4 h-4 mr-2" />
              Print Tag
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function KPICard({
  title,
  value,
  subtext,
  icon: Icon,
  colorClass,
}: {
  title: string;
  value: string | number;
  subtext: string;
  icon: ElementType;
  colorClass: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl bg-white border border-gray-200 p-4 shadow-sm transition-all duration-300 hover:border-[#66B2B2]/40 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{title}</p>
          <h3 className="text-2xl font-bold text-gray-900 mt-1 font-mono-tech truncate">{value}</h3>
          <p className="text-[10px] text-gray-500 mt-0.5">{subtext}</p>
        </div>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#66B2B2]/10 shrink-0">
          <Icon className={`w-5 h-5 ${colorClass}`} />
        </div>
      </div>
    </div>
  );
}

export default function ClientEquipment() {
  const { equipment, serviceRecords } = useOperationsStore();
  const { selectedCompanyId } = useClientPortalStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [qrModalItem, setQrModalItem] = useState<Equipment | null>(null);

  const selectedClient = useMemo(
    () => seedData.clients.find((client) => client.id === selectedCompanyId) ?? seedData.clients[0],
    [selectedCompanyId]
  );

  const selectedClientEquipment = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return equipment
      .filter((item) => item.clientId === selectedClient.id)
      .filter((item) => {
        if (!normalizedQuery) return true;

        return [
          item.name,
          item.serialNumber,
          item.id,
          item.unitId,
          item.equipmentType,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedQuery));
      });
  }, [equipment, searchQuery, selectedClient.id]);

  const clientServiceRecords = useMemo(() => {
    const records = [
      ...(seedData.serviceRecords as Array<Partial<ServiceRecord> & Record<string, any>>),
      ...(serviceRecords as Array<Partial<ServiceRecord> & Record<string, any>>),
    ];
    const selectedClientName = selectedClient.companyName;
    const selectedEquipment = equipment.filter((item) => item.clientId === selectedClient.id);
    const seen = new Set<string>();

    return records.filter((record) => {
      const matchedEquipment = selectedEquipment.find((item) => serviceMatchesEquipment(record, item, selectedClientName));
      if (!matchedEquipment) return false;

      const key = `${record.id ?? "record"}-${record.seedEquipmentId ?? record.equipmentId ?? matchedEquipment.id}-${record.completedDate ?? record.scheduledDate ?? ""}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [equipment, selectedClient.companyName, selectedClient.id, serviceRecords]);

  const dashboardMetrics = useMemo(() => {
    const completedRecords = clientServiceRecords.filter((record) => normalizeStatus(record.status) === "completed");
    const inProgressRecords = clientServiceRecords.filter((record) => {
      const status = normalizeStatus(record.status);
      return status && status !== "completed" && status !== "cancelled";
    });
    const totalSpent = completedRecords.reduce((sum, record) => sum + Number(record.finalCost ?? record.cost ?? 0), 0);

    return {
      units: selectedClientEquipment.length,
      totalServices: clientServiceRecords.length,
      completed: completedRecords.length,
      inProgress: inProgressRecords.length,
      totalSpent,
    };
  }, [clientServiceRecords, selectedClientEquipment.length]);

  const getEquipmentRecords = (item: Equipment) =>
    clientServiceRecords.filter((record) => serviceMatchesEquipment(record, item, selectedClient.companyName, false));

  return (
    <div className="space-y-6 px-8 pt-8 pb-12 overflow-x-hidden">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-[32px] font-bold text-gray-900 tracking-[-0.02em]">My Equipment</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {selectedClient.companyName} · {dashboardMetrics.units} units under management
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        <KPICard
          title="Units Under Management"
          value={dashboardMetrics.units}
          subtext="Selected company assets"
          icon={Package}
          colorClass="text-[#66B2B2]"
        />
        <KPICard
          title="Total Services"
          value={dashboardMetrics.totalServices}
          subtext="Matched service records"
          icon={Wrench}
          colorClass="text-[#66B2B2]"
        />
        <KPICard
          title="Completed"
          value={dashboardMetrics.completed}
          subtext="Finished services"
          icon={CheckCircle2}
          colorClass="text-[#059669]"
        />
        <KPICard
          title="In Progress"
          value={dashboardMetrics.inProgress}
          subtext="Active service records"
          icon={Activity}
          colorClass="text-[#B77900]"
        />
        <KPICard
          title="Total Spent"
          value={formatCurrency(dashboardMetrics.totalSpent)}
          subtext="Completed services only"
          icon={Wallet}
          colorClass="text-[#DC2626]"
        />
      </div>

      <div className="space-y-3 animate-in fade-in duration-300">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
            <Input
              placeholder="Search name, serial, unit ID, or type..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="pl-9 h-10 bg-white border-gray-200 text-gray-900 text-sm rounded-xl"
            />
          </div>
        </div>

        <div className="data-card overflow-auto rounded-xl">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left py-2.5 px-3 text-gray-600 font-bold uppercase tracking-wider">Image</th>
                <th className="text-left py-2.5 px-3 text-gray-600 font-bold uppercase tracking-wider">Equipment</th>
                <th className="text-left py-2.5 px-3 text-gray-600 font-bold uppercase tracking-wider">Serial Number</th>
                <th className="text-left py-2.5 px-3 text-gray-600 font-bold uppercase tracking-wider">Total Hours</th>
                <th className="text-left py-2.5 px-3 text-gray-600 font-bold uppercase tracking-wider">Total KM</th>
                <th className="text-left py-2.5 px-3 text-gray-600 font-bold uppercase tracking-wider">Days</th>
                <th className="text-left py-2.5 px-3 text-gray-600 font-bold uppercase tracking-wider">Weeks</th>
                <th className="text-left py-2.5 px-3 text-gray-600 font-bold uppercase tracking-wider">Months</th>
                <th className="text-left py-2.5 px-3 text-gray-600 font-bold uppercase tracking-wider">Years</th>
                <th className="text-left py-2.5 px-3 text-gray-600 font-bold uppercase tracking-wider">Status</th>
                <th className="text-left py-2.5 px-3 text-gray-600 font-bold uppercase tracking-wider">Services</th>
                <th className="text-left py-2.5 px-3 text-gray-600 font-bold uppercase tracking-wider">QR Code</th>
                <th className="py-2.5 px-3 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {selectedClientEquipment.map((item) => {
                const isExpanded = expandedId === item.id;
                const equipmentRecords = getEquipmentRecords(item);
                const pmsProgress = getPmsProgress(item);
                const worstProgress = getWorstPmsProgress(item);
                const displayStatus = getDisplayStatus(item);
                const days = getDaysBreakdown(item.days);
                const location =
                  item.lat != null && item.lng != null
                    ? `${Number(item.lat).toFixed(5)}°N, ${Number(item.lng).toFixed(5)}°E`
                    : "—";

                return (
                  <Fragment key={item.id}>
                    <tr
                      className={`grid-table-row border-b border-gray-100 cursor-pointer hover:bg-[#66B2B2]/5 transition-all ${
                        isExpanded ? "bg-[#66B2B2]/10 border-[#66B2B2]/30" : ""
                      }`}
                      onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    >
                      <td className="py-3 px-3">
                        <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg border bg-gray-100 flex items-center justify-center">
                          {item.image ? (
                            <img src={item.image} alt={item.name ?? ""} className="h-full w-full object-cover" />
                          ) : (
                            <Wrench className="w-4 h-4 text-gray-400" />
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-gray-900">{item.name ?? "—"}</div>
                        <div className="text-[10px] text-gray-500 mt-0.5">{item.equipmentType ?? "—"}</div>
                      </td>
                      <td className="py-3 px-3 text-gray-600 font-mono-tech">{item.serialNumber || "—"}</td>
                      <td className="py-3 px-3 font-mono-tech text-gray-800">{formatHours(item.hoursTotal)}</td>
                      <td className="py-3 px-3 font-mono-tech text-gray-800">{formatKm(item.kmTotal)}</td>
                      <td className="py-3 px-3 font-mono-tech text-gray-800">{days.daysDisplay}</td>
                      <td className="py-3 px-3 font-mono-tech text-gray-800">{days.weeksDisplay}</td>
                      <td className="py-3 px-3 font-mono-tech text-gray-800">{days.monthsDisplay}</td>
                      <td className="py-3 px-3 font-mono-tech text-gray-800">{days.yearsDisplay}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full border text-[10px] font-black uppercase whitespace-nowrap ${getStatusBadgeClasses(displayStatus)}`}>
                          {displayStatus}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-gray-600 font-mono-tech">{equipmentRecords.length}</td>
                      <td className="py-3 px-3">
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            setQrModalItem(item);
                          }}
                          className="p-1.5 rounded-lg bg-white border border-gray-100 hover:border-[#66B2B2] transition-all shadow-sm active:scale-95 group/qr"
                          title="View QR Tag"
                        >
                          <QrCode className="w-5 h-5 text-gray-500 group-hover/qr:text-[#66B2B2] transition-colors" />
                        </button>
                      </td>
                      <td className="py-3 px-3 w-8 text-center">
                        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${isExpanded ? "rotate-180 text-[#66B2B2]" : ""}`} />
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr>
                        <td
                          colSpan={13}
                          className="p-0 border-b-2 border-[#66B2B2]/25 bg-gradient-to-b from-[#66B2B2]/5 to-white"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <div className="px-5 py-5 space-y-5 animate-in slide-in-from-top-1 duration-200">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#66B2B2]/10 text-[#66B2B2] text-[9px] font-black uppercase tracking-[0.1em] mb-1.5">
                                  <Package className="w-2.5 h-2.5" /> Managed Asset
                                </div>
                                <h3 className="text-lg font-black text-gray-900 tracking-tight">{item.name ?? "—"}</h3>
                                <p className="text-[11px] text-gray-500 font-medium mt-0.5">{item.equipmentType ?? "—"}</p>
                              </div>
                              <div className="flex flex-col items-end gap-1.5">
                                <span className={`px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-wide ${getStatusBadgeClasses(displayStatus)}`}>
                                  {displayStatus}
                                </span>
                                <span className="text-[9px] text-gray-400 font-mono-tech font-bold">{item.id}</span>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              {[
                                { label: "Client", value: selectedClient.companyName },
                                { label: "Serial Number", value: item.serialNumber || "—" },
                                { label: "Equipment Type", value: item.equipmentType || "—" },
                                { label: "GPS Location", value: location, icon: MapPin },
                              ].map(({ label, value, icon: Icon }) => (
                                <div key={label} className="p-3 rounded-xl bg-white border border-gray-100 space-y-0.5">
                                  <div className="flex items-center gap-1.5 text-[9px] text-gray-400 uppercase font-black tracking-widest">
                                    {Icon && <Icon className="w-3 h-3" />}
                                    {label}
                                  </div>
                                  <div className="text-xs font-bold text-gray-900">{value}</div>
                                </div>
                              ))}
                            </div>

                            <div>
                              <div className="text-[9px] text-gray-400 uppercase font-black tracking-widest mb-2">Usage Metrics</div>
                              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                                {[
                                  { label: "Hours Today", value: item.hoursToday || "—" },
                                  { label: "Total Hours", value: formatHours(item.hoursTotal) },
                                  { label: "KM Today", value: formatKm(item.kmToday) },
                                  { label: "Total KM", value: formatKm(item.kmTotal) },
                                  { label: "Days Active", value: days.daysDisplay },
                                  { label: "Years", value: days.yearsDisplay },
                                ].map(({ label, value }) => (
                                  <div key={label} className="p-2.5 rounded-lg bg-white border border-gray-100 text-center space-y-0.5">
                                    <div className="text-[9px] text-gray-400 uppercase font-black tracking-widest leading-tight">{label}</div>
                                    <div className={`text-xs font-black font-mono-tech ${value === "—" ? "text-gray-300" : "text-gray-900"}`}>{value}</div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div>
                              <div className="text-[9px] text-gray-400 uppercase font-black tracking-widest mb-2">Usage Progress</div>
                              {worstProgress ? (
                                <div className="p-4 rounded-xl bg-white border border-gray-100">
                                  <div className="flex items-center justify-between gap-4 mb-2">
                                    <div>
                                      <div className="text-xs font-bold text-gray-900">{worstProgress.serviceType}</div>
                                      <div className="text-[10px] text-gray-500 font-mono-tech">
                                        {worstProgress.currentUsage.toFixed(1)} / {worstProgress.serviceInterval} {worstProgress.serviceIntervalUnit}
                                      </div>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded-full border text-[10px] font-black uppercase ${getStatusBadgeClasses(worstProgress.status)}`}>
                                      {worstProgress.status}
                                    </span>
                                  </div>
                                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${worstProgress.status === "Overdue" ? "bg-[#EF4444]" : worstProgress.status === "Due" ? "bg-[#F2A900]" : "bg-[#66B2B2]"}`}
                                      style={{ width: `${worstProgress.progressBarWidth}%` }}
                                    />
                                  </div>
                                </div>
                              ) : (
                                <div className="text-center py-6 bg-white rounded-xl border border-dashed border-gray-200">
                                  <div className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.1em]">No PMS schedule</div>
                                </div>
                              )}
                            </div>

                            <div>
                              <div className="text-[9px] text-gray-400 uppercase font-black tracking-widest mb-2">PMS Schedules</div>
                              {pmsProgress.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                  {pmsProgress.map((entry, index) => (
                                    <div key={`${entry.serviceType}-${index}`} className="p-3 rounded-xl bg-white border border-gray-100 space-y-2">
                                      <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                          <div className="text-xs font-bold text-gray-900 truncate">{entry.serviceType}</div>
                                          <div className="text-[10px] text-gray-500 font-mono-tech">
                                            Every {entry.serviceInterval} {entry.serviceIntervalUnit}
                                          </div>
                                        </div>
                                        <span className={`px-2 py-0.5 rounded-full border text-[9px] font-black uppercase whitespace-nowrap ${getStatusBadgeClasses(entry.status)}`}>
                                          {entry.status}
                                        </span>
                                      </div>
                                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                        <div className="h-full rounded-full bg-[#66B2B2]" style={{ width: `${entry.progressBarWidth}%` }} />
                                      </div>
                                      {entry.estimatedCost != null && (
                                        <div className="text-[10px] font-black text-[#66B2B2]">
                                          Est. {formatCurrency(Number(entry.estimatedCost))}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-center py-6 bg-white rounded-xl border border-dashed border-gray-200">
                                  <div className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.1em]">No PMS schedule</div>
                                </div>
                              )}
                            </div>

                            <div className="space-y-2.5">
                              <div className="text-[10px] text-gray-400 uppercase font-black tracking-[0.2em] flex items-center gap-2">
                                <History className="w-3.5 h-3.5" /> Maintenance History
                              </div>
                              {equipmentRecords.length > 0 ? (
                                equipmentRecords.slice(0, 6).map((record) => {
                                  const status = normalizeStatus(record.status);
                                  const isCompleted = status === "completed";
                                  const cost = Number(record.finalCost ?? record.cost ?? 0);

                                  return (
                                    <div
                                      key={`${record.id}-${record.completedDate ?? record.scheduledDate ?? item.id}`}
                                      className="flex items-center justify-between gap-4 p-4 rounded-xl border border-gray-100 bg-white hover:border-[#66B2B2]/30 hover:bg-[#66B2B2]/5 transition-all"
                                    >
                                      <div className="flex items-center gap-4 min-w-0">
                                        <div className={`w-9 h-9 rounded-full border flex items-center justify-center shrink-0 ${isCompleted ? "bg-green-50 border-green-100" : "bg-[#66B2B2]/10 border-[#66B2B2]/20"}`}>
                                          {isCompleted ? <Check className="w-4 h-4 text-green-500" /> : <Wrench className="w-4 h-4 text-[#66B2B2]" />}
                                        </div>
                                        <div className="min-w-0">
                                          <div className="text-xs font-bold text-gray-900 truncate">
                                            {record.serviceType || record.serviceCategory || "Service Record"}
                                          </div>
                                          <div className="text-[10px] text-gray-400 font-medium uppercase mt-0.5">
                                            {formatDate(record.completedDate ?? record.scheduledDate)}
                                            <span className="mx-1">•</span>Tech: {record.technician || "—"}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="text-right shrink-0">
                                        <div className={`text-[10px] font-black uppercase ${isCompleted ? "text-[#059669]" : "text-[#66B2B2]"}`}>
                                          {record.status || "—"}
                                        </div>
                                        {cost > 0 && <div className="text-[10px] font-mono-tech text-gray-500">{formatCurrency(cost)}</div>}
                                      </div>
                                    </div>
                                  );
                                })
                              ) : (
                                <div className="text-center py-8 bg-white rounded-xl border border-dashed border-gray-200">
                                  <FileText className="w-5 h-5 text-gray-300 mx-auto mb-2" />
                                  <div className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.1em]">No prior service history</div>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}

              {selectedClientEquipment.length === 0 && (
                <tr>
                  <td colSpan={13} className="py-12 px-4 text-center">
                    <Package className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                    <div className="text-sm font-bold text-gray-700">No equipment found</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {searchQuery ? "Try a different search term." : "This selected company has no equipment yet."}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {qrModalItem && (
        <QRModal
          equipment={qrModalItem}
          isOpen={Boolean(qrModalItem)}
          onClose={() => setQrModalItem(null)}
        />
      )}
    </div>
  );
}
