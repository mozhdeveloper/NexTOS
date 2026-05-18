import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useAuthStore } from "@/stores/useAuthStore";
import { useOperationsStore } from "@/stores/useOperationsStore";
import { useBillingStore } from "@/stores/useBillingStore";
import { useCRMStore } from "@/stores/useCRMStore";
import type { Booking, Equipment, ServiceCategory, ServiceRecord } from "@/types";
import { ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import {
  ArrowRight,
  Bell,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Eye,
  FileText,
  FlaskConical,
  HardHat,
  PackageCheck,
  Plus,
  Receipt,
  Siren,
  Wrench,
  Printer
} from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type DashboardServiceTab = "upcoming" | "calibration" | "testing";

type HeavyStatus = "OK" | "Near Service" | "Due Soon" | "Overdue";
type CalibrationStatus = "OK" | "Due Soon" | "Due" | "Overdue";

type OverviewRow = {
  id: string;
  equipmentName: string;
  equipmentMeta: string;
  category: ServiceCategory;
  typeLabel: string;
  scheduleLabel: string;
  scheduleMeta: string;
  statusLabel: string;
  technician: string;
  icon: React.ElementType;
  iconBg: string;
};

type AlertItem = {
  id: string;
  title: string;
  subtitle: string;
  tone: "danger" | "warning" | "info";
};

type ActivityItem = {
  id: string;
  title: string;
  subtitle: string;
  timestamp: string;
  icon: React.ElementType;
  tone: string;
};

type DonutDatum = {
  name: string;
  value: number;
  color: string;
};

const HEAVY_COLORS: Record<HeavyStatus, string> = {
  OK: "#10B981",
  "Near Service": "#66B2B2",
  "Due Soon": "#3B82F6",
  Overdue: "#EF4444",
};

const CALIBRATION_COLORS: Record<CalibrationStatus | "Due This Month", string> = {
  OK: "#10B981",
  "Due Soon": "#66B2B2",
  Due: "#3B82F6",
  Overdue: "#EF4444",
  "Due This Month": "#3B82F6",
};

const LAB_COLORS = {
  "In Progress": "#2563EB",
  Scheduled: "#66B2B2",
  Completed: "#10B981",
};

const CATEGORY_BADGE: Record<ServiceCategory, string> = {
  "Heavy Equipment PMS": "bg-blue-50 text-[#66B2B2] border border-[#60A5FA]/20",
  "Calibration PMS": "bg-emerald-50 text-[#059669] border border-[#4ADE80]/20",
  "Lab Testing Service": "bg-purple-50 text-[#7C3AED] border border-[#C084FC]/20",
  Repair: "bg-red-50 text-[#DC2626] border border-[#F87171]/20",
  Inspection: "bg-amber-50 text-[#D97706] border border-[#FBBF24]/20",
  Installation: "bg-cyan-50 text-[#0891B2] border border-[#22D3EE]/20",
};

const STATUS_BADGE: Record<string, string> = {
  OK: "bg-emerald-50/50 text-[#059669] border border-[#4ADE80]/20",
  "Near Service": "bg-amber-50/50 text-[#D97706] border border-[#FBBF24]/20",
  "Due Soon": "bg-blue-50/60 text-[#66B2B2] border border-[#60A5FA]/20",
  Due: "bg-blue-50/60 text-[#66B2B2] border border-[#60A5FA]/20",
  Overdue: "bg-red-50/50 text-[#DC2626] border border-[#F87171]/20",
  Scheduled: "bg-blue-50/60 text-[#66B2B2] border border-[#60A5FA]/20",
  Requested: "bg-amber-50/60 text-[#D97706] border border-[#FBBF24]/20",
  Completed: "bg-emerald-50/50 text-[#059669] border border-[#4ADE80]/20",
  Released: "bg-cyan-50/50 text-[#0891B2] border border-[#22D3EE]/20",
  "In Progress": "bg-blue-50/50 text-[#66B2B2] border border-[#60A5FA]/20",
};

function formatPeso(amount: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatShortDate(dateISO: string) {
  return new Date(dateISO).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTimeLabel(dateISO: string) {
  return new Date(dateISO).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTimeRange(timeRange?: string) {
  if (!timeRange) return "Time not set";
  const [start] = timeRange.split("-");
  const [hours, minutes] = start.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function getBookingEndDate(booking: { requestedDate: string; preferredTime?: string }) {
  const date = new Date(booking.requestedDate);
  const endTime = booking.preferredTime?.split("-")[1];

  if (endTime) {
    const [hours, minutes] = endTime.split(":").map(Number);
    date.setHours(hours, minutes, 0, 0);
  } else {
    date.setHours(23, 59, 59, 999);
  }

  return date;
}

function getTag(notes: string, tag: string) {
  const match = notes.match(new RegExp(`\\[${tag}:([^\\]]+)\\]`));
  return match?.[1] ?? null;
}

function getTechnicianFromBooking(booking: Booking) {
  return getTag(booking.notes, "tech") ?? "Unassigned";
}

function getHeavyStatus(equipment: Equipment): HeavyStatus {
  const remaining = equipment.nextPMSHours - equipment.currentHours;
  if (remaining <= 0) return "Overdue";
  if (remaining <= 50) return "Due Soon";
  if (remaining <= 100) return "Near Service";
  return "OK";
}

function getCalibrationStatus(nextCalibrationDate: string | null, now: Date): CalibrationStatus {
  if (!nextCalibrationDate) return "OK";
  const diffDays = Math.ceil((new Date(nextCalibrationDate).getTime() - now.getTime()) / 86400000);
  if (diffDays <= 0) return "Overdue";
  if (diffDays <= 7) return "Due";
  if (diffDays <= 30) return "Due Soon";
  return "OK";
}

function getDaysUntil(dateISO: string, now: Date) {
  return Math.ceil((new Date(dateISO).getTime() - now.getTime()) / 86400000);
}

function getEquipmentLabel(equipment?: Equipment) {
  if (!equipment) return "Unknown equipment";
  return `${equipment.type} ${equipment.model}`;
}

function getEquipmentSubLabel(equipment?: Equipment) {
  if (!equipment) return "No asset linked";
  return `SN: ${equipment.serialNumber}`;
}

function createServiceId(prefix: string, id: number) {
  return `${prefix}-${new Date().getFullYear()}-${String(id).padStart(4, "0")}`;
}

function donutCenterLabel(total: number, label: string) {
  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
      <div className="text-[22px] font-bold text-gray-900 leading-none">{total}</div>
      <div className="mt-1 text-[9px] uppercase tracking-[0.18em] text-gray-500">{label}</div>
    </div>
  );
}

export default function ClientDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { equipment, serviceRecords, servicePhotos, bookings } = useOperationsStore();
  const { invoices } = useBillingStore();
  const { clients } = useCRMStore();

  const clientId = user?.clientId || 1;
  const clientObj = useMemo(() => clients.find(c => c.id === clientId), [clients, clientId]);
  const [serviceTab, setServiceTab] = useState<DashboardServiceTab>("upcoming");
  const [showReport, setShowReport] = useState<ServiceRecord | null>(null);

  const clientEquipment = useMemo(() => equipment.filter((entry) => entry.clientId === clientId), [equipment, clientId]);
  const clientServices = useMemo(() => serviceRecords.filter((entry) => entry.clientId === clientId), [serviceRecords, clientId]);
  const clientBookings = useMemo(() => bookings.filter((entry) => entry.clientId === clientId), [bookings, clientId]);
  const clientInvoices = useMemo(() => invoices.filter((entry) => entry.clientId === clientId), [invoices, clientId]);

  const equipmentById = useMemo(() => new Map(clientEquipment.map((entry) => [entry.id, entry])), [clientEquipment]);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const heavyEquipment = clientEquipment.filter((entry) => entry.equipmentType === "Heavy Equipment");
  const calibrationEquipment = clientEquipment.filter(
    (entry) => entry.equipmentType !== "Heavy Equipment" && !!entry.nextCalibrationDate
  );
  const labTestingServices = clientServices.filter((entry) => entry.serviceCategory === "Lab Testing Service");

  const openInvoices = clientInvoices.filter((entry) => entry.status !== "paid");
  const outstandingBalance = openInvoices.reduce((sum, entry) => sum + entry.total, 0);

  const heavyCounts = useMemo(() => {
    const counts: Record<HeavyStatus, number> = {
      OK: 0,
      "Near Service": 0,
      "Due Soon": 0,
      Overdue: 0,
    };

    heavyEquipment.forEach((entry) => {
      counts[getHeavyStatus(entry)] += 1;
    });

    return counts;
  }, [heavyEquipment]);

  const calibrationCounts = useMemo(() => {
    const counts = {
      OK: 0,
      "Due Soon": 0,
      Overdue: 0,
      "Due This Month": 0,
    };

    calibrationEquipment.forEach((entry) => {
      const status = getCalibrationStatus(entry.nextCalibrationDate, now);
      if (status === "OK") counts.OK += 1;
      if (status === "Due Soon" || status === "Due") counts["Due Soon"] += 1;
      if (status === "Overdue") counts.Overdue += 1;

      if (entry.nextCalibrationDate) {
        const date = new Date(entry.nextCalibrationDate);
        if (date >= monthStart && date <= monthEnd) {
          counts["Due This Month"] += 1;
        }
      }
    });

    return counts;
  }, [calibrationEquipment, monthEnd, monthStart, now]);

  const labCounts = useMemo(() => {
    const counts = {
      "In Progress": 0,
      Scheduled: 0,
      Completed: 0,
    };

    labTestingServices.forEach((entry) => {
      const label = entry.labStatus ?? (entry.status === "in_progress" ? "In Progress" : entry.status === "completed" ? "Completed" : "Scheduled");
      if (label === "In Progress") counts["In Progress"] += 1;
      if (label === "Scheduled" || label === "Requested") counts.Scheduled += 1;
      if (label === "Completed" || label === "Released") counts.Completed += 1;
    });

    return counts;
  }, [labTestingServices]);

  const heavyDonutData: DonutDatum[] = [
    { name: "OK", value: heavyCounts.OK, color: HEAVY_COLORS.OK },
    { name: "Near Service", value: heavyCounts["Near Service"], color: HEAVY_COLORS["Near Service"] },
    { name: "Overdue", value: heavyCounts.Overdue, color: HEAVY_COLORS.Overdue },
    { name: "Due Soon", value: heavyCounts["Due Soon"], color: HEAVY_COLORS["Due Soon"] },
  ].filter((entry) => entry.value > 0);

  const calibrationDonutData: DonutDatum[] = [
    { name: "OK", value: calibrationCounts.OK, color: CALIBRATION_COLORS.OK },
    { name: "Due Soon", value: calibrationCounts["Due Soon"], color: CALIBRATION_COLORS["Due Soon"] },
    { name: "Overdue", value: calibrationCounts.Overdue, color: CALIBRATION_COLORS.Overdue },
    { name: "Due This Month", value: calibrationCounts["Due This Month"], color: CALIBRATION_COLORS["Due This Month"] },
  ].filter((entry) => entry.value > 0);

  const labDonutData: DonutDatum[] = [
    { name: "In Progress", value: labCounts["In Progress"], color: LAB_COLORS["In Progress"] },
    { name: "Scheduled", value: labCounts.Scheduled, color: LAB_COLORS.Scheduled },
    { name: "Completed", value: labCounts.Completed, color: LAB_COLORS.Completed },
  ].filter((entry) => entry.value > 0);

  const upcomingRows = useMemo<OverviewRow[]>(() => {
    return clientBookings
      .filter((entry) => getBookingEndDate(entry) >= now)
      .sort((left, right) => new Date(left.requestedDate).getTime() - new Date(right.requestedDate).getTime())
      .slice(0, 4)
      .map((entry) => {
        const linkedEquipment = equipmentById.get(entry.equipmentId);
        const technician = getTechnicianFromBooking(entry);
        const heavyStatus = linkedEquipment?.equipmentType === "Heavy Equipment" ? getHeavyStatus(linkedEquipment) : null;

        return {
          id: createServiceId("SRV", entry.id),
          equipmentName: getEquipmentLabel(linkedEquipment),
          equipmentMeta: getEquipmentSubLabel(linkedEquipment),
          category: entry.serviceCategory,
          typeLabel: entry.serviceCategory === "Heavy Equipment PMS" ? "PMS (1000 hrs)" : entry.serviceCategory,
          scheduleLabel:
            linkedEquipment?.equipmentType === "Heavy Equipment" && linkedEquipment.nextPMSHours > 0
              ? `In ${Math.max(linkedEquipment.nextPMSHours - linkedEquipment.currentHours, 0)} hrs`
              : formatDateTimeLabel(entry.requestedDate),
          scheduleMeta: `${formatDateTimeLabel(entry.requestedDate)}${entry.preferredTime ? `, ${formatTimeRange(entry.preferredTime)}` : ""}`,
          statusLabel: heavyStatus ?? (entry.status === "confirmed" ? "Scheduled" : entry.status === "completed" ? "Completed" : "Requested"),
          technician,
          icon: entry.serviceCategory === "Calibration PMS" ? FlaskConical : entry.serviceCategory === "Lab Testing Service" ? ClipboardList : HardHat,
          iconBg: "bg-white",
        };
      });
  }, [clientBookings, equipmentById, now]);

  const calibrationRows = useMemo<OverviewRow[]>(() => {
    return calibrationEquipment
      .slice()
      .sort((left, right) => new Date(left.nextCalibrationDate || 0).getTime() - new Date(right.nextCalibrationDate || 0).getTime())
      .slice(0, 4)
      .map((entry) => {
        const daysUntil = entry.nextCalibrationDate ? getDaysUntil(entry.nextCalibrationDate, now) : 0;
        const status = getCalibrationStatus(entry.nextCalibrationDate, now);

        return {
          id: createServiceId("CAL", entry.id),
          equipmentName: getEquipmentLabel(entry),
          equipmentMeta: getEquipmentSubLabel(entry),
          category: "Calibration PMS",
          typeLabel: "Calibration",
          scheduleLabel:
            daysUntil > 0 ? `Due in ${daysUntil} day${daysUntil === 1 ? "" : "s"}` : `Overdue by ${Math.abs(daysUntil)} day${Math.abs(daysUntil) === 1 ? "" : "s"}`,
          scheduleMeta: entry.nextCalibrationDate ? formatShortDate(entry.nextCalibrationDate) : "No date set",
          statusLabel: status,
          technician: "Mike Thompson",
          icon: FlaskConical,
          iconBg: "bg-white",
        };
      });
  }, [calibrationEquipment, now]);

  const testingRows = useMemo<OverviewRow[]>(() => {
    return labTestingServices
      .slice()
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
      .slice(0, 4)
      .map((entry) => {
        const linkedEquipment = equipmentById.get(entry.equipmentId);
        const status = entry.labStatus ?? (entry.status === "completed" ? "Completed" : entry.status === "in_progress" ? "In Progress" : "Scheduled");

        return {
          id: createServiceId("LAB", entry.id),
          equipmentName: entry.testType || getEquipmentLabel(linkedEquipment),
          equipmentMeta: entry.projectName ? `Project: ${entry.projectName}` : entry.sampleName ? `Sample: ${entry.sampleName}` : getEquipmentSubLabel(linkedEquipment),
          category: "Lab Testing Service",
          typeLabel: entry.testType || "Lab Test",
          scheduleLabel: formatShortDate(entry.completedDate || entry.scheduledDate),
          scheduleMeta: entry.completedDate ? "Report available" : "Queue active",
          statusLabel: status,
          technician: entry.technician,
          icon: ClipboardList,
          iconBg: "bg-white",
        };
      });
  }, [equipmentById, labTestingServices]);

  const activeRows = serviceTab === "upcoming" ? upcomingRows : serviceTab === "calibration" ? calibrationRows : testingRows;

  const alertItems = useMemo<AlertItem[]>(() => {
    const alerts: AlertItem[] = [];

    calibrationEquipment.forEach((entry) => {
      if (!entry.nextCalibrationDate) return;
      const daysUntil = getDaysUntil(entry.nextCalibrationDate, now);
      if (daysUntil <= 15) {
        alerts.push({
          id: `cal-${entry.id}`,
          title: `${getEquipmentLabel(entry)} calibration ${daysUntil <= 0 ? "is overdue" : `is due in ${daysUntil} day${daysUntil === 1 ? "" : "s"}`}`,
          subtitle: `Due: ${formatShortDate(entry.nextCalibrationDate)}`,
          tone: daysUntil <= 0 ? "danger" : "warning",
        });
      }
    });

    heavyEquipment.forEach((entry) => {
      const remaining = entry.nextPMSHours - entry.currentHours;
      if (remaining <= 50) {
        alerts.push({
          id: `heavy-${entry.id}`,
          title: `${getEquipmentLabel(entry)} PMS ${remaining <= 0 ? "is overdue" : `is due in ${remaining} hrs`}`,
          subtitle: `Current Hours: ${entry.currentHours} hrs`,
          tone: remaining <= 0 ? "danger" : "warning",
        });
      }
    });

    const releasableReports = labTestingServices.filter((entry) => entry.labStatus === "Released" || entry.labStatus === "Completed");
    if (releasableReports.length > 0) {
      alerts.push({
        id: "reports-ready",
        title: `${releasableReports.length} test report${releasableReports.length === 1 ? "" : "s"} ready for release`,
        subtitle: "View reports",
        tone: "info",
      });
    }

    return alerts.slice(0, 4);
  }, [calibrationEquipment, heavyEquipment, labTestingServices, now]);

  const quickSummary = useMemo(() => {
    const completedThisMonth = clientServices.filter(
      (entry) => entry.completedDate && new Date(entry.completedDate) >= monthStart
    );

    return {
      servicesCompleted: completedThisMonth.filter((entry) => entry.serviceCategory !== "Calibration PMS" && entry.serviceCategory !== "Lab Testing Service").length,
      calibrationsCompleted: completedThisMonth.filter((entry) => entry.serviceCategory === "Calibration PMS").length,
      testsCompleted: completedThisMonth.filter((entry) => entry.serviceCategory === "Lab Testing Service").length,
      totalSpent: clientInvoices
        .filter((entry) => new Date(entry.createdAt) >= monthStart)
        .reduce((sum, entry) => sum + entry.total, 0),
    };
  }, [clientInvoices, clientServices, monthStart]);

  const latestReports = useMemo(() => {
    return clientServices
      .filter((entry) => entry.completedDate)
      .slice()
      .sort((left, right) => new Date(right.completedDate || right.createdAt).getTime() - new Date(left.completedDate || left.createdAt).getTime())
      .slice(0, 3)
      .map((entry) => ({
        record: entry,
        id: entry.id,
        title:
          entry.serviceCategory === "Lab Testing Service"
            ? `${entry.testType || "Test"} - Report`
            : `${getEquipmentLabel(equipmentById.get(entry.equipmentId))} - ${entry.serviceCategory === "Heavy Equipment PMS" ? "PMS Report" : "Service Report"}`,
        date: formatShortDate(entry.completedDate || entry.createdAt),
      }));
  }, [clientServices, equipmentById]);

  const recentActivity = useMemo<ActivityItem[]>(() => {
    const serviceActivity = clientServices.slice(0, 4).map((entry) => ({
      id: `svc-${entry.id}`,
      title:
        entry.serviceCategory === "Heavy Equipment PMS"
          ? `PMS completed for ${getEquipmentLabel(equipmentById.get(entry.equipmentId))}`
          : entry.serviceCategory === "Calibration PMS"
            ? `Calibration done for ${getEquipmentLabel(equipmentById.get(entry.equipmentId))}`
            : `${entry.testType || "Lab test"} report ${entry.labStatus === "Released" ? "released" : "updated"}`,
      subtitle: entry.projectName ? entry.projectName : entry.description,
      timestamp: formatShortDate(entry.completedDate || entry.createdAt),
      icon: entry.serviceCategory === "Lab Testing Service" ? FlaskConical : entry.serviceCategory === "Calibration PMS" ? CheckCircle2 : Wrench,
      tone: entry.serviceCategory === "Lab Testing Service" ? "bg-white text-[#7C3AED]" : entry.serviceCategory === "Calibration PMS" ? "bg-white text-[#059669]" : "bg-white text-[#059669]",
    }));

    const invoiceActivity = clientInvoices.slice(0, 2).map((entry) => ({
      id: `inv-${entry.id}`,
      title: `Invoice ${entry.invoiceNumber} ${entry.status === "paid" ? "has been paid" : "has been issued"}`,
      subtitle: formatPeso(entry.total),
      timestamp: formatShortDate(entry.createdAt),
      icon: Receipt,
      tone: "bg-white text-[#D97706]",
    }));

    return [...serviceActivity, ...invoiceActivity]
      .sort((left, right) => right.timestamp.localeCompare(left.timestamp))
      .slice(0, 5);
  }, [clientInvoices, clientServices, equipmentById]);

  const topHeavyRisk = heavyEquipment
    .slice()
    .sort((left, right) => (left.nextPMSHours - left.currentHours) - (right.nextPMSHours - right.currentHours))[0];

  const topCalibrationRisk = calibrationEquipment
    .slice()
    .sort((left, right) => new Date(left.nextCalibrationDate || 0).getTime() - new Date(right.nextCalibrationDate || 0).getTime())[0];

  const topLabItem = testingRows[0];

  return (
    <div className="min-h-full bg-gray-100 px-6 py-5 text-gray-900 xl:px-8">
      <div className="mx-auto max-w-[1500px] space-y-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h1 className="text-[34px] font-bold tracking-[-0.03em] text-gray-900">Dashboard</h1>
            <p className="mt-1 text-sm text-gray-500">
              Overview of your equipment, calibration &amp; testing services
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button className="flex h-11 items-center gap-2 rounded-md border border-gray-200 bg-white px-4 text-sm text-gray-600 shadow-sm">
              <Calendar className="h-4 w-4 text-gray-500" />
              {now.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
            </button>
            <button className="flex h-11 w-11 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-400">
              <Bell className="h-4 w-4" />
            </button>
            <button
              onClick={() => navigate("/client/bookings")}
              className="flex h-11 items-center gap-2 rounded-md bg-[#66B2B2] px-5 text-sm font-semibold text-gray-900 transition-colors hover:bg-[#5A9E9E]"
            >
              <Plus className="h-4 w-4" />
              Book a Service
            </button>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.1fr_1.1fr_1.1fr_1.25fr]">
          <SummaryCard
            title="Heavy Equipment PMS"
            value={heavyEquipment.length}
            subtitle="Total Equipment"
            icon={HardHat}
            tint="from-blue-50 to-blue-100"
            stats={[
              { label: "OK", value: heavyCounts.OK, color: "text-[#059669]" },
              { label: "Near Service", value: heavyCounts["Near Service"], color: "text-[#D97706]" },
              { label: "Overdue", value: heavyCounts.Overdue, color: "text-[#DC2626]" },
              { label: "Due Soon", value: heavyCounts["Due Soon"], color: "text-[#66B2B2]" },
            ]}
          />

          <SummaryCard
            title="Calibration PMS"
            value={calibrationEquipment.length}
            subtitle="Lab Equipment"
            icon={PackageCheck}
            tint="from-emerald-50 to-emerald-100"
            stats={[
              { label: "OK", value: calibrationCounts.OK, color: "text-[#059669]" },
              { label: "Due Soon", value: calibrationCounts["Due Soon"], color: "text-[#D97706]" },
              { label: "Overdue", value: calibrationCounts.Overdue, color: "text-[#DC2626]" },
              { label: "Due This Month", value: calibrationCounts["Due This Month"], color: "text-[#66B2B2]" },
            ]}
          />

          <SummaryCard
            title="Lab Testing Services"
            value={labTestingServices.length}
            subtitle="Active Jobs"
            icon={ClipboardList}
            tint="from-purple-50 to-purple-100"
            stats={[
              { label: "In Progress", value: labCounts["In Progress"], color: "text-[#66B2B2]" },
              { label: "Scheduled", value: labCounts.Scheduled, color: "text-[#D97706]" },
              { label: "Completed", value: labCounts.Completed, color: "text-[#059669]" },
            ]}
          />

          <div className="data-card rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#66B2B2]/30 text-[#66B2B2]">
                    <Receipt className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">Open Invoices</div>
                    <div className="mt-1 text-[13px] text-gray-500">{openInvoices.length} Unpaid</div>
                  </div>
                </div>
              </div>
              <span className="rounded-full bg-[#66B2B2]/15 px-2.5 py-1 text-[11px] font-medium text-[#D97706]">
                Total Outstanding
              </span>
            </div>
            <div className="mt-5 text-[34px] font-bold tracking-[-0.03em] text-[#66B2B2]">{formatPeso(outstandingBalance)}</div>
            <button
              onClick={() => navigate("/client/billing")}
              className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-[#66B2B2] transition-colors hover:text-[#5A9E9E]"
            >
              View Invoices
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,2.3fr)_minmax(320px,1fr)]">
          <div className="space-y-4">
            <section className="data-card overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-200 px-5 pt-4">
                <div className="flex flex-wrap items-center gap-6 text-sm">
                  <button
                    onClick={() => setServiceTab("upcoming")}
                    className={`border-b-2 pb-3 font-medium transition-colors ${
                      serviceTab === "upcoming" ? "border-[#66B2B2] text-[#66B2B2]" : "border-transparent text-gray-500 hover:text-gray-900"
                    }`}
                  >
                    Upcoming Services
                  </button>
                  <button
                    onClick={() => setServiceTab("calibration")}
                    className={`border-b-2 pb-3 font-medium transition-colors ${
                      serviceTab === "calibration" ? "border-[#66B2B2] text-[#66B2B2]" : "border-transparent text-gray-500 hover:text-gray-900"
                    }`}
                  >
                    Calibration Due
                  </button>
                  <button
                    onClick={() => setServiceTab("testing")}
                    className={`border-b-2 pb-3 font-medium transition-colors ${
                      serviceTab === "testing" ? "border-[#66B2B2] text-[#66B2B2]" : "border-transparent text-gray-500 hover:text-gray-900"
                    }`}
                  >
                    Testing Schedules
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto px-3 pb-2 pt-3">
                <table className="w-full min-w-[900px] text-left">
                  <thead>
                    <tr className="text-[11px] uppercase tracking-[0.14em] text-gray-500">
                      <th className="px-3 py-2 font-medium">Service ID</th>
                      <th className="px-3 py-2 font-medium">Equipment / Service</th>
                      <th className="px-3 py-2 font-medium">Category</th>
                      <th className="px-3 py-2 font-medium">Type</th>
                      <th className="px-3 py-2 font-medium">Schedule</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                      <th className="px-3 py-2 font-medium">Technician</th>
                      <th className="px-3 py-2 text-right font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeRows.map((row) => {
                      const Icon = row.icon;
                      return (
                        <tr key={row.id} className="border-t border-gray-200 text-sm text-gray-700">
                          <td className="px-3 py-3 text-[12px] font-semibold text-gray-900">{row.id}</td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-3">
                              <div className={`flex h-11 w-11 items-center justify-center rounded-lg border border-gray-200 ${row.iconBg}`}>
                                <Icon className="h-5 w-5 text-gray-900" />
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">{row.equipmentName}</div>
                                <div className="mt-1 text-[11px] text-gray-500">{row.equipmentMeta}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${CATEGORY_BADGE[row.category]}`}>
                              {row.category}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-[13px] text-gray-500">{row.typeLabel}</td>
                          <td className="px-3 py-3">
                            <div className={`text-[13px] font-medium ${row.statusLabel === "Overdue" ? "text-[#DC2626]" : row.statusLabel === "Due Soon" || row.statusLabel === "Near Service" ? "text-[#D97706]" : "text-[#059669]"}`}>
                              {row.scheduleLabel}
                            </div>
                            <div className="mt-1 text-[11px] text-gray-500">{row.scheduleMeta}</div>
                          </td>
                          <td className="px-3 py-3">
                            <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${STATUS_BADGE[row.statusLabel] ?? STATUS_BADGE.Scheduled}`}>
                              {row.statusLabel}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#66B2B2] text-[11px] font-semibold text-gray-900">
                                {row.technician
                                  .split(" ")
                                  .map((part) => part[0])
                                  .join("")
                                  .slice(0, 2)
                                  .toUpperCase()}
                              </div>
                              <span className="text-[13px] text-gray-500">{row.technician}</span>
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex justify-end gap-2">
                              <button className="flex h-8 w-8 items-center justify-center rounded-md border border-[#66B2B2]/30 bg-blue-50/50 text-[#66B2B2]">
                                <Eye className="h-4 w-4" />
                              </button>
                              <button className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-400">
                                <Calendar className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {activeRows.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-3 py-10 text-center text-sm text-gray-500">
                          No service items available for this section.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-center border-t border-gray-200 px-5 py-3">
                <button 
                  onClick={() => navigate("/client/history")}
                  className="inline-flex items-center gap-2 text-sm font-medium text-[#66B2B2] transition-colors hover:text-[#5A9E9E]"
                >
                  View all service reports
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </section>

            <div className="grid gap-4 xl:grid-cols-3">
              <OverviewCard
                title="Heavy Equipment PMS Overview"
                linkLabel="View all"
                total={heavyEquipment.length}
                centerLabel="Total"
                data={heavyDonutData}
                footerIcon={Siren}
                footerTitle={topHeavyRisk ? `${getEquipmentLabel(topHeavyRisk)}` : "No critical unit"}
                footerSubtitle={
                  topHeavyRisk
                    ? `${topHeavyRisk.nextPMSHours - topHeavyRisk.currentHours <= 0 ? "Overdue" : "Due in"} ${Math.abs(topHeavyRisk.nextPMSHours - topHeavyRisk.currentHours)} hrs`
                    : "All units within target"
                }
              />

              <OverviewCard
                title="Calibration PMS Overview"
                linkLabel="View all"
                total={calibrationEquipment.length}
                centerLabel="Total"
                data={calibrationDonutData}
                footerIcon={PackageCheck}
                footerTitle={topCalibrationRisk ? `${getEquipmentLabel(topCalibrationRisk)}` : "No calibration risk"}
                footerSubtitle={
                  topCalibrationRisk?.nextCalibrationDate
                    ? `Due ${formatShortDate(topCalibrationRisk.nextCalibrationDate)}`
                    : "No upcoming calibration"
                }
              />

              <OverviewCard
                title="Lab Testing Overview"
                linkLabel="View all"
                total={labTestingServices.length}
                centerLabel="Total"
                data={labDonutData}
                footerIcon={ClipboardList}
                footerTitle={topLabItem ? topLabItem.equipmentName : "No active tests"}
                footerSubtitle={topLabItem ? topLabItem.equipmentMeta : "Testing queue is clear"}
              />
            </div>

            <section className="data-card rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
                <button className="text-sm font-medium text-[#66B2B2]" onClick={() => navigate("/client/history")}>View all</button>
              </div>
              <div className="flex gap-2.5 overflow-x-auto pb-0.5">
                {recentActivity.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.id}
                      className="flex min-w-[170px] flex-1 items-start gap-2.5 rounded-xl border border-gray-200 bg-white p-3"
                    >
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full shadow-sm border border-gray-100 ${item.tone}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[11px] font-medium leading-4 text-gray-900">{item.title}</div>
                        <div className="mt-0.5 text-[10px] text-gray-400">{item.timestamp}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          <div className="space-y-4">
            <section className="data-card rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Alerts &amp; Reminders</h3>
                <button className="text-sm font-medium text-[#66B2B2]">View all</button>
              </div>
              <div className="space-y-3">
                {alertItems.map((item) => (
                  <div key={item.id} className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4">
                    <div
                      className={`mt-0.5 flex h-9 w-9 items-center justify-center rounded-full shadow-sm border border-gray-100 ${
                        item.tone === "danger"
                          ? "bg-white text-[#DC2626]"
                          : item.tone === "warning"
                            ? "bg-white text-[#D97706]"
                            : "bg-white text-[#66B2B2]"
                      }`}
                    >
                      {item.tone === "danger" ? <Siren className="h-4 w-4" /> : item.tone === "warning" ? <Bell className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium leading-6 text-gray-900">{item.title}</div>
                      <div className="mt-1 text-xs text-gray-500">{item.subtitle}</div>
                    </div>
                    <ChevronRight className="mt-1 h-4 w-4 text-gray-400" />
                  </div>
                ))}
                {alertItems.length === 0 && (
                  <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-500">
                    No active alerts right now.
                  </div>
                )}
              </div>
            </section>

            <section className="data-card rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Quick Summary</h3>
                <span className="rounded-md border border-gray-200 bg-gray-100 px-3 py-1.5 text-xs text-gray-500">This Month</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <QuickSummaryCard label="Services Completed" value={quickSummary.servicesCompleted} icon={Wrench} tint="bg-emerald-50 text-[#059669]" />
                <QuickSummaryCard label="Calibrations Completed" value={quickSummary.calibrationsCompleted} icon={PackageCheck} tint="bg-emerald-50 text-[#059669]" />
                <QuickSummaryCard label="Tests Completed" value={quickSummary.testsCompleted} icon={ClipboardList} tint="bg-purple-50 text-[#7C3AED]" />
                <QuickSummaryCard label="Total Spent" value={formatPeso(quickSummary.totalSpent)} icon={Receipt} tint="bg-blue-50 text-[#66B2B2]" />
              </div>
            </section>

            <section className="data-card rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Latest Service Reports</h3>
                <button className="text-sm font-medium text-[#66B2B2]" onClick={() => navigate("/client/history")}>View all</button>
              </div>
              <div className="space-y-3">
                {latestReports.map((report) => (
                  <div key={report.id} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 hover:border-[#66B2B2]/40 transition-colors cursor-pointer group" onClick={() => setShowReport(report.record)}>
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-[#DC2626] group-hover:bg-[#66B2B2] group-hover:text-white transition-colors">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-gray-900 group-hover:text-[#66B2B2] transition-colors">{report.title}</div>
                      <div className="mt-1 text-xs text-gray-500">{report.date}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#66B2B2] transition-colors" />
                  </div>
                ))}
                {latestReports.length === 0 && (
                  <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-500">
                    No recent reports available.
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>

      <Dialog open={!!showReport} onOpenChange={() => setShowReport(null)}>
        <DialogContent className="max-w-4xl bg-white border-gray-200 max-h-[95vh] overflow-auto scrollbar-hide rounded-2xl">
          {showReport && (
            <ServiceReportView
              record={showReport}
              equipment={equipment.find(e => e.id === showReport.equipmentId)}
              client={clientObj}
              photos={servicePhotos.filter(p => p.serviceRecordId === showReport.id)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  subtitle,
  icon: Icon,
  tint,
  stats,
}: {
  title: string;
  value: number;
  subtitle: string;
  icon: React.ElementType;
  tint: string;
  stats: Array<{ label: string; value: number; color: string }>;
}) {
  return (
    <div className={`data-card rounded-xl border border-gray-200 bg-gradient-to-br ${tint} p-5 shadow-sm`}>
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-gray-900 shadow-sm">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-gray-900">{title}</div>
          <div className="mt-1 flex items-end gap-2">
            <span className="text-[36px] font-bold leading-none tracking-[-0.04em] text-gray-900">{value}</span>
            <span className="pb-1 text-[13px] text-gray-600">{subtitle}</span>
          </div>
        </div>
      </div>

      <div className={`mt-5 grid gap-3 text-sm ${stats.length === 3 ? "grid-cols-3" : "grid-cols-4"}`}>
        {stats.map((stat) => (
          <div key={stat.label}>
            <div className={`text-base font-semibold ${stat.color}`}>{stat.value}</div>
            <div className="mt-1 text-[11px] text-gray-600">{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function OverviewCard({
  title,
  linkLabel,
  total,
  centerLabel,
  data,
  footerIcon: FooterIcon,
  footerTitle,
  footerSubtitle,
}: {
  title: string;
  linkLabel: string;
  total: number;
  centerLabel: string;
  data: DonutDatum[];
  footerIcon: React.ElementType;
  footerTitle: string;
  footerSubtitle: string;
}) {
  return (
    <section className="data-card rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        <button className="text-sm font-medium text-[#66B2B2]">{linkLabel}</button>
      </div>

      <div className="grid grid-cols-[140px_minmax(0,1fr)] items-center gap-3">
        <div className="relative h-[140px] w-[140px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" cx="50%" cy="50%" innerRadius={42} outerRadius={64} stroke="none" paddingAngle={3}>
                {data.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          {donutCenterLabel(total, centerLabel)}
        </div>

        <div className="space-y-2">
          {data.map((entry) => {
            const percentage = total > 0 ? Math.round((entry.value / total) * 100) : 0;
            return (
              <div key={entry.name} className="flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-gray-500">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
                  {entry.name}
                </div>
                <div className="text-right text-gray-500">
                  <span className="mr-1.5 text-gray-900">{entry.value}</span>
                  ({percentage}%)
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-50 text-[#D97706]">
          <FooterIcon className="h-4 w-4" />
        </div>
        <div>
          <div className="text-sm font-medium text-gray-900">{footerTitle}</div>
          <div className="mt-1 text-xs text-gray-500">{footerSubtitle}</div>
        </div>
      </div>
    </section>
  );
}

function QuickSummaryCard({
  label,
  value,
  icon: Icon,
  tint,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  tint: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.14em] text-gray-400">{label}</div>
          <div className="mt-2 text-[24px] font-semibold tracking-[-0.03em] text-gray-900">{value}</div>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm border border-gray-100 ${tint.split(' ')[1]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

function ServiceReportView({ record, equipment, client, photos }: any) {
  return (
    <div className="p-2 animate-in fade-in zoom-in-95 duration-300">
      <div className="flex items-center justify-between border-b-2 border-gray-900 pb-6 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-black text-white rounded-full text-[9px] font-black uppercase tracking-[0.2em] mb-3">
             <div className="w-2 h-2 rounded-full bg-[#66B2B2] animate-pulse" /> Official Document
          </div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tighter">TECHNICAL SERVICE REPORT</h2>
          <p className="text-xs text-gray-400 font-bold tracking-widest mt-1 font-mono-tech">NEXVISION OPS SYSTEM RECORD <span className="text-gray-900 font-black">#SR-{record.id}</span></p>
        </div>
        <Button onClick={() => window.print()} className="bg-gray-100 hover:bg-gray-200 text-gray-900 h-12 px-6 border border-gray-200 text-xs font-black rounded-xl transition-all active:scale-95 shadow-sm">
          <Printer className="w-5 h-5 mr-3" />
          EXPORT SYSTEM COPY
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-12 mb-10">
        <div className="space-y-8">
          <section>
            <h4 className="text-[11px] font-black text-gray-900 uppercase tracking-[0.25em] mb-4 flex items-center gap-2">
               <div className="w-1.5 h-4 bg-[#66B2B2]" /> ASSET SPECIFICATIONS
            </h4>
            <div className="space-y-3 px-3">
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-[11px] text-gray-400 font-bold uppercase">Identification ID:</span>
                <span className="text-[11px] text-gray-900 font-black font-mono-tech tracking-wider">{equipment?.unitId}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-[11px] text-gray-400 font-bold uppercase">Manufacturer:</span>
                <span className="text-[11px] text-gray-900 font-bold">{equipment?.manufacturer}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-[11px] text-gray-400 font-bold uppercase">Model Descriptor:</span>
                <span className="text-[11px] text-gray-900 font-bold">{equipment?.model}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-[11px] text-gray-400 font-bold uppercase">Runtime Meter:</span>
                <span className="text-sm text-[#66B2B2] font-black font-mono-tech">{record.hoursAtService} HOURS</span>
              </div>
            </div>
          </section>

          <section>
             <h4 className="text-[11px] font-black text-gray-900 uppercase tracking-[0.25em] mb-4 flex items-center gap-2">
               <div className="w-1.5 h-4 bg-[#66B2B2]" /> LOGISTICAL CONTEXT
            </h4>
            <div className="space-y-3 px-3">
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-[11px] text-gray-400 font-bold uppercase">Service Category:</span>
                <span className="text-[11px] text-gray-900 font-black uppercase tracking-tighter">{record.serviceCategory}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-[11px] text-gray-400 font-bold uppercase">Primary Technician:</span>
                <span className="text-[11px] text-gray-900 font-bold">{record.technician}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-[11px] text-gray-400 font-bold uppercase">Completion Date:</span>
                <span className="text-[11px] text-gray-900 font-bold">{record.completedDate ? new Date(record.completedDate).toLocaleDateString('en-PH', {year:'numeric', month:'long', day:'numeric'}) : "PENDING"}</span>
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-8">
          <section className="h-full">
             <h4 className="text-[11px] font-black text-gray-900 uppercase tracking-[0.25em] mb-4 flex items-center gap-2">
               <div className="w-1.5 h-4 bg-[#66B2B2]" /> EXECUTIVE SUMMARY
            </h4>
            <div className="p-6 rounded-2xl bg-gray-50 border border-gray-100 space-y-6 shadow-inner h-[calc(100%-2.5rem)]">
              <div>
                <span className="text-[10px] text-[#66B2B2] font-black uppercase tracking-widest mb-2 block">Fault Diagnosis / Findings:</span>
                <p className="text-[12px] text-gray-900 font-medium leading-relaxed bg-white p-3 rounded-lg border border-gray-100">{record.findings || "Operational state nominal. No significant faults detected during primary inspection."}</p>
              </div>
              <div>
                <span className="text-[10px] text-[#66B2B2] font-black uppercase tracking-widest mb-2 block">Technical Work Documentation:</span>
                <p className="text-[12px] text-gray-900 font-medium leading-relaxed bg-white p-3 rounded-lg border border-gray-100">{record.workDone}</p>
              </div>
              <div>
                <span className="text-[10px] text-[#66B2B2] font-black uppercase tracking-widest mb-2 block">Strategic Recommendations:</span>
                <p className="text-[12px] text-gray-900 font-bold leading-relaxed italic bg-[#66B2B2]/5 p-3 rounded-lg border border-[#66B2B2]/10">{record.recommendation || "No immediate action required. Maintain standard PMS intervals."}</p>
              </div>
            </div>
          </section>
        </div>
      </div>

      <section className="mb-10">
        <h4 className="text-[11px] font-black text-gray-900 uppercase tracking-[0.25em] mb-6 flex items-center gap-2">
            <div className="w-1.5 h-4 bg-[#66B2B2]" /> FIELD DOCUMENTATION
        </h4>
        <div className="grid grid-cols-2 gap-10">
          <div className="space-y-3">
            <div className="flex items-center justify-between px-2">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Initial State Proof</span>
                <span className="text-[8px] font-bold text-[#66B2B2] uppercase">Before Service</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {photos.filter((p: any) => p.type === 'before').map((p: any, i: number) => (
                <div key={i} className="aspect-video rounded-xl overflow-hidden border-2 border-gray-100 shadow-md">
                   <img src={p.url} className="w-full h-full object-cover" alt="Before" />
                </div>
              ))}
              {photos.filter((p: any) => p.type === 'before').length === 0 && <div className="col-span-2 py-8 text-center bg-gray-50 rounded-xl border border-dashed text-[10px] text-gray-400 font-bold uppercase tracking-widest">No Before Documentation</div>}
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between px-2">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Completion Proof</span>
                <span className="text-[8px] font-bold text-green-500 uppercase">After Service</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {photos.filter((p: any) => p.type === 'after').map((p: any, i: number) => (
                <div key={i} className="aspect-video rounded-xl overflow-hidden border-2 border-gray-100 shadow-md">
                   <img src={p.url} className="w-full h-full object-cover" alt="After" />
                </div>
              ))}
              {photos.filter((p: any) => p.type === 'after').length === 0 && <div className="col-span-2 py-8 text-center bg-gray-50 rounded-xl border border-dashed text-[10px] text-gray-400 font-bold uppercase tracking-widest">No After Documentation</div>}
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-12 border-t-2 border-gray-100 pt-10 mb-6">
        <div className="space-y-4">
          <span className="text-[10px] text-gray-400 font-black uppercase tracking-[0.3em] block ml-1">Technician Certification</span>
          <div className="p-8 bg-gray-50/50 rounded-3xl border border-gray-100 flex items-center justify-center shadow-inner relative overflow-hidden">
            {record.techSignature ? (
               <img src={record.techSignature} className="h-24 object-contain contrast-125 mix-blend-multiply transition-all hover:scale-105 duration-500" alt="Tech Sig" />
            ) : <div className="h-24 flex items-center justify-center text-gray-300 italic text-[11px] font-bold uppercase tracking-widest">Digital Stamp Missing</div>}
            <div className="absolute bottom-4 left-0 right-0 text-center">
                <div className="h-[1px] w-2/3 mx-auto bg-gray-200 mb-2" />
                <span className="text-[9px] text-gray-500 font-black uppercase tracking-tighter">{record.technician} <span className="text-gray-300 mx-1">•</span> SENIOR TECHNICIAN</span>
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <span className="text-[10px] text-gray-400 font-black uppercase tracking-[0.3em] block ml-1">Client Acknowledgment</span>
          <div className="p-8 bg-gray-50/50 rounded-3xl border border-gray-100 flex items-center justify-center shadow-inner relative overflow-hidden">
            {record.clientSignature ? (
               <img src={record.clientSignature} className="h-24 object-contain contrast-125 mix-blend-multiply transition-all hover:scale-105 duration-500" alt="Client Sig" />
            ) : <div className="h-24 flex items-center justify-center text-gray-300 italic text-[11px] font-bold uppercase tracking-widest">Acknowledgment Missing</div>}
            <div className="absolute bottom-4 left-0 right-0 text-center">
                <div className="h-[1px] w-2/3 mx-auto bg-gray-200 mb-2" />
                <span className="text-[9px] text-gray-500 font-black uppercase tracking-tighter">{client?.companyName} <span className="text-gray-300 mx-1">•</span> AUTHORIZED REP</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
