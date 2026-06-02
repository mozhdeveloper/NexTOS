import { useEffect, useMemo, useState } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import { useOperationsStore } from "@/stores/useOperationsStore";
import { useBillingStore } from "@/stores/useBillingStore";
import { useClientPortalStore } from "@/stores/useClientPortalStore";
import seedData from "@/data/seed-data.json";
import type { Booking, Package, ServiceType } from "@/types";
import {
  Calendar,
  CalendarDays,
  Clock,
  Package as PackageIcon,
  ArrowRight,
  X,
  CheckCircle2,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Eye,
  MoreVertical,
  Play,
  Ban,
  RotateCcw,
  Download,
  Headset,
  PenSquare,
  Wrench,
  DollarSign,
  XCircle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ExtendedBookingStatus =
  | "pending"
  | "confirmed"
  | "scheduled"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "rescheduled";

type BookingTab = "all" | "upcoming" | "today" | "this_week" | "past";
type LegacyPackageOption = "pms_1000" | "repair_6" | "one_time";
type PackageSelection = { value: string; label: string; package?: Package };

const STATUS_ORDER: ExtendedBookingStatus[] = [
  "pending",
  "confirmed",
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
  "rescheduled",
];

const STATUS_COLORS: Record<ExtendedBookingStatus, string> = {
  pending: "bg-[#66B2B2]/20 text-[#66B2B2]",
  confirmed: "bg-[#3B82F6]/20 text-[#3B82F6]",
  scheduled: "bg-[#8B5CF6]/20 text-[#8B5CF6]",
  in_progress: "bg-[#F59E0B]/20 text-[#F59E0B]",
  completed: "bg-[#10B981]/20 text-[#10B981]",
  cancelled: "bg-[#EF4444]/20 text-[#EF4444]",
  rescheduled: "bg-[#06B6D4]/20 text-[#06B6D4]",
};

const SERVICE_COLORS: Record<ServiceType, string> = {
  pms: "bg-[#3B82F6]/20 text-[#3B82F6]",
  repair: "bg-[#EF4444]/20 text-[#EF4444]",
  inspection: "bg-[#8B5CF6]/20 text-[#8B5CF6]",
  installation: "bg-[#10B981]/20 text-[#10B981]",
  calibration: "bg-[#F59E0B]/20 text-[#F59E0B]",
};

const LEGACY_PACKAGE_LABELS: Record<LegacyPackageOption, string> = {
  pms_1000: "PMS Package (1000 hrs)",
  repair_6: "Repair Package (6 visits)",
  one_time: "One-time Service",
};

const TECHNICIAN_OPTIONS = ["No preference", "James Rodriguez", "Alex Smith", "Mike Thompson"];

function formatMoneyPeso(amount: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatServiceType(serviceType?: ServiceType | string | null) {
  const normalized = typeof serviceType === "string" ? serviceType.trim().toLowerCase() : "";
  if (!normalized) return "Unknown";
  if (normalized === "pms") return "PMS";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function parseHoursText(text: string | undefined) {
  const match = String(text ?? "").match(/(\d+)\s*h\s*(\d+)\s*m/i);
  return match ? Number(match[1]) + Number(match[2]) / 60 : 0;
}

function isPackageCompatible(pkg: Package, serviceType: ServiceType) {
  if (serviceType === "pms") return pkg.packageType === "Heavy Equipment PMS Package";
  if (serviceType === "calibration") return pkg.packageType === "Calibration Package";
  if (serviceType === "repair" || serviceType === "inspection" || serviceType === "installation") return false;
  return true;
}

function toServiceCategory(serviceType: ServiceType): Booking["serviceCategory"] {
  if (serviceType === "pms") return "Heavy Equipment PMS";
  if (serviceType === "calibration") return "Calibration PMS";
  if (serviceType === "repair") return "Repair";
  if (serviceType === "inspection") return "Inspection";
  return "Installation";
}

function formatBookingId(id: string | number, requestedDate: string) {
  if (typeof id === "string" && id.startsWith("BK-")) return id;
  const year = new Date(requestedDate).getFullYear();
  return `BK-${year}-${String(id).padStart(4, "0")}`;
}

function getTechnicianFromEquipmentId(equipmentId: string) {
  const techs = ["James Rodriguez", "Alex Smith", "Mike Thompson"];
  const hash = equipmentId.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return techs[hash % 3];
}

function getTechColor(tech: string) {
  if (tech === "James Rodriguez") return "bg-[#3B82F6]/30 text-[#3B82F6]";
  if (tech === "Alex Smith") return "bg-[#8B5CF6]/30 text-[#8B5CF6]";
  return "bg-[#10B981]/30 text-[#10B981]";
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");
}

function getTag(notes: string, tag: string) {
  const match = notes.match(new RegExp(`\\[${tag}:([^\\]]+)\\]`));
  return match?.[1] ?? null;
}

function setTag(notes: string, tag: string, value: string) {
  const withoutTag = notes.replace(new RegExp(`\\s*\\[${tag}:[^\\]]+\\]`, "g"), "").trim();
  return `${withoutTag} [${tag}:${value}]`.trim();
}

function stripMetaTags(notes: string) {
  return notes.replace(/\s*\[(status|package|tech):[^\]]+\]/g, "").trim();
}

function toBaseStatus(status: ExtendedBookingStatus): Booking["status"] {
  if (status === "completed") return "completed";
  if (status === "cancelled") return "cancelled";
  if (status === "pending" || status === "rescheduled") return "pending";
  return "confirmed";
}

function getExtendedStatus(booking: Booking): ExtendedBookingStatus {
  const normalized = String(booking.status ?? "pending").toLowerCase() as ExtendedBookingStatus;
  if (normalized === "scheduled" || normalized === "in_progress" || normalized === "confirmed") return normalized;
  if (normalized === "completed" || normalized === "cancelled") return normalized;
  if (booking.rescheduledFrom) return "rescheduled";
  const meta = getTag(booking.notes ?? "", "status") as ExtendedBookingStatus | null;
  if (meta && STATUS_ORDER.includes(meta)) return meta;
  return "pending";
}

function getLegacyPackageOption(booking: Booking): LegacyPackageOption {
  const meta = getTag(booking.notes ?? "", "package") as LegacyPackageOption | null;
  if (meta && Object.prototype.hasOwnProperty.call(LEGACY_PACKAGE_LABELS, meta)) return meta;
  return booking.serviceType === "pms" ? "pms_1000" : "one_time";
}

function getBookingPackageLabel(booking: Booking, packages: Package[]) {
  if (booking.packageName) return booking.packageName;
  if (booking.packageId) return packages.find((pkg) => pkg.id === booking.packageId)?.name ?? "Package";
  return LEGACY_PACKAGE_LABELS[getLegacyPackageOption(booking)];
}

function getBookingPackageValue(booking: Booking) {
  if (booking.packageId) return String(booking.packageId);
  return getLegacyPackageOption(booking) === "one_time" ? "one_time" : getLegacyPackageOption(booking);
}

function getBookingDateWithStartTime(booking: Booking) {
  const date = new Date(booking.requestedDate);
  const startTime = booking.preferredTime?.split("-")[0];
  if (startTime) {
    const [hours, minutes] = startTime.split(":").map(Number);
    date.setHours(hours, minutes, 0, 0);
  }
  return date;
}

function getHoursState(currentHours: number, nextPms: number) {
  const ratio = nextPms > 0 ? currentHours / nextPms : 0;
  if (ratio >= 1) return "text-[#EF4444]";
  if (ratio >= 0.95) return "text-[#F59E0B]";
  return "text-[#10B981]";
}

function getPmsMetric(eq: { hoursTotal?: string; pmsConfiguration?: Array<{ serviceInterval: number; serviceIntervalUnit: string }> } | undefined) {
  const currentHours = parseHoursText(eq?.hoursTotal);
  const config = eq?.pmsConfiguration?.find((item) => item.serviceIntervalUnit?.toLowerCase() === "hours");
  if (!config || config.serviceInterval <= 0) return { currentHours, nextPms: 0 };
  const nextPms = (Math.floor(currentHours / config.serviceInterval) + 1) * config.serviceInterval;
  return { currentHours, nextPms };
}

function arcPath(cx: number, cy: number, radius: number, startAngle: number, endAngle: number) {
  const x1 = cx + radius * Math.cos(startAngle);
  const y1 = cy + radius * Math.sin(startAngle);
  const x2 = cx + radius * Math.cos(endAngle);
  const y2 = cy + radius * Math.sin(endAngle);
  const largeArcFlag = endAngle - startAngle > Math.PI ? 1 : 0;
  return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`;
}

function formatDate(dateISO: string) {
  return new Date(dateISO).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getDisplayTime(timeRange?: string) {
  if (!timeRange) return "—";
  const [start] = timeRange.split("-");
  const [h, m] = start.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function formatDateRangeLabel(from: string, to: string): string {
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  if (from && to) return `${fmt(from)} – ${fmt(to)}`;
  if (from) return `From ${fmt(from)}`;
  if (to) return `Until ${fmt(to)}`;
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return `${fmt(first.toISOString())} – ${fmt(last.toISOString())}`;
}

export default function ClientBookings() {
  const { user } = useAuthStore();
  const { bookings, equipment, addBooking, updateBooking } = useOperationsStore();
  const { packages, invoices } = useBillingStore();
  const { selectedCompanyId } = useClientPortalStore();
  
  // Map seedData company ID to numeric clientId
  const selectedCompanyIndex = seedData.clients.findIndex(c => c.id === selectedCompanyId);
  const clientId = selectedCompanyIndex !== -1 ? selectedCompanyIndex + 1 : (user?.clientId || 1);

  const eqClientNum = (id: string) => Number(String(id).replace(/\D/g, ""));
  const clientEquipment = useMemo(() => equipment.filter((e) => eqClientNum(e.clientId) === clientId), [equipment, clientId]);
  const equipmentById = useMemo(() => new Map(clientEquipment.map((eq) => [eq.id, eq])), [clientEquipment]);
  const clientPackages = useMemo(
    () => packages.filter((pkg) => pkg.clientId === clientId && pkg.status === "active"),
    [packages, clientId]
  );
  const clientInvoices = useMemo(
    () => invoices.filter((invoice) => invoice.clientId === clientId),
    [invoices, clientId]
  );

  const clientBookings = useMemo(
    () => bookings
      .filter((b) => eqClientNum(b.clientId) === clientId)
      .sort((a, b) => getBookingDateWithStartTime(a).getTime() - getBookingDateWithStartTime(b).getTime()),
    [bookings, clientId]
  );

  const isBookingPast = (b: { requestedDate: string; preferredTime?: string }) => {
    const date = new Date(b.requestedDate);
    const endTime = b.preferredTime?.split("-")[1];
    if (endTime) {
      const [hours, minutes] = endTime.split(":").map(Number);
      date.setHours(hours, minutes, 0, 0);
    } else {
      date.setHours(23, 59, 59, 999);
    }
    return date < new Date();
  };

  const upcoming = useMemo(() => clientBookings.filter((b) => !isBookingPast(b)), [clientBookings]);
  const past = useMemo(() => clientBookings.filter((b) => isBookingPast(b)), [clientBookings]);

  const [activeTab, setActiveTab] = useState<BookingTab>("all");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [equipmentFilter, setEquipmentFilter] = useState("all");
  const [serviceTypeFilter, setServiceTypeFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [openActionMenuFor, setOpenActionMenuFor] = useState<string | null>(null);

  const [bookingStep, setBookingStep] = useState(0);
  const [bookingEquipment, setBookingEquipment] = useState("");
  const [bookingType, setBookingType] = useState<ServiceType>("pms");
  const [bookingPackageId, setBookingPackageId] = useState("one_time");
  const [bookingDate, setBookingDate] = useState("");
  const [bookingTime, setBookingTime] = useState("");
  const [bookingTechnician, setBookingTechnician] = useState("No preference");
  const [bookingNotes, setBookingNotes] = useState("");
  const [bookingComplete, setBookingComplete] = useState(false);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [editBookingId, setEditBookingId] = useState<string | null>(null);
  const [rescheduleFrom, setRescheduleFrom] = useState<string | null>(null);
  const [detailsBookingId, setDetailsBookingId] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  const seedKey = `nextos-bookings-seeded-client-${clientId}-v2`;
  const todayISO = new Date().toISOString().slice(0, 10);
  const selectedPackage = clientPackages.find((pkg) => String(pkg.id) === bookingPackageId);
  const selectedEquipment = equipmentById.get(bookingEquipment);
  const compatiblePackages = clientPackages
    .filter((pkg) => isPackageCompatible(pkg, bookingType))
    .sort((a, b) => {
      const aLinked = a.linkedEquipmentId === bookingEquipment ? 0 : 1;
      const bLinked = b.linkedEquipmentId === bookingEquipment ? 0 : 1;
      return aLinked - bLinked;
    });
  const legacySelectedPackage =
    !selectedPackage && bookingPackageId !== "one_time" && LEGACY_PACKAGE_LABELS[bookingPackageId as LegacyPackageOption]
      ? { value: bookingPackageId, label: LEGACY_PACKAGE_LABELS[bookingPackageId as LegacyPackageOption] }
      : null;
  const packageOptions: PackageSelection[] = [
    ...compatiblePackages.map((pkg) => ({
      value: String(pkg.id),
      label: `${pkg.name}${pkg.linkedEquipmentId === bookingEquipment ? " - linked" : ""}`,
      package: pkg,
    })),
    ...(legacySelectedPackage ? [legacySelectedPackage] : []),
    { value: "one_time", label: "One-time Service" },
  ];
  const selectedPackageLabel =
    selectedPackage?.name ?? LEGACY_PACKAGE_LABELS[bookingPackageId as LegacyPackageOption] ?? "One-time Service";
  const isBookingDatePast = Boolean(bookingDate) && bookingDate < todayISO;
  const totalSpent = clientInvoices
    .filter((invoice) => invoice.status === "paid")
    .reduce((sum, invoice) => sum + invoice.total, 0);

  const resetModalState = () => {
    setBookingStep(0);
    setBookingEquipment("");
    setBookingType("pms");
    setBookingPackageId("one_time");
    setBookingDate("");
    setBookingTime("");
    setBookingTechnician("No preference");
    setBookingNotes("");
    setBookingComplete(false);
    setEditBookingId(null);
    setRescheduleFrom(null);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (clientBookings.length >= 5) return;
    if (!clientEquipment.length) return;
    if (window.localStorage.getItem(seedKey) === "1") return;

    const seeded = [
      { days: 1, time: "09:00-12:00", status: "confirmed", type: "pms", pkg: "pms_1000" },
      { days: 2, time: "14:00-17:00", status: "scheduled", type: "inspection", pkg: "one_time" },
      { days: 0, time: "11:00-14:00", status: "in_progress", type: "repair", pkg: "repair_6" },
      { days: -1, time: "08:00-12:00", status: "completed", type: "pms", pkg: "pms_1000" },
      { days: -2, time: "13:00-16:00", status: "cancelled", type: "repair", pkg: "one_time" },
      { days: 4, time: "10:00-13:00", status: "pending", type: "installation", pkg: "one_time" },
      { days: 6, time: "15:00-18:00", status: "rescheduled", type: "calibration", pkg: "one_time" },
      { days: 3, time: "07:00-10:00", status: "scheduled", type: "pms", pkg: "pms_1000" },
      { days: -4, time: "09:00-12:00", status: "completed", type: "inspection", pkg: "one_time" },
      { days: 8, time: "12:00-16:00", status: "confirmed", type: "repair", pkg: "repair_6" },
    ] as const;

    seeded.forEach((seed, index) => {
      const eq = clientEquipment[index % clientEquipment.length];
      const date = new Date();
      date.setDate(date.getDate() + seed.days);
      const requestedDate = date.toISOString();
      const tech = getTechnicianFromEquipmentId(eq.id);
      const notes = `[package:${seed.pkg}] [tech:${tech}] [status:${seed.status}]`;
      addBooking({
        clientId: String(clientId),
        equipmentId: eq.id,
        serviceCategory: toServiceCategory(seed.type),
        serviceType: seed.type,
        requestedDate,
        preferredTime: seed.time,
        status: toBaseStatus(seed.status),
        notes,
      });
    });

    window.localStorage.setItem(seedKey, "1");
  }, [addBooking, clientBookings.length, clientEquipment, clientId, seedKey]);

  const setBookingStatus = (booking: Booking, status: ExtendedBookingStatus) => {
    const notes = setTag(booking.notes ?? "", "status", status);
    updateBooking(booking.id, { status: toBaseStatus(status), notes });
  };

  const openReschedule = (booking: Booking) => {
    const packageValue = getBookingPackageValue(booking);
    const tech = booking.preferredTechnician ?? getTag(booking.notes ?? "", "tech") ?? "No preference";
    setEditBookingId(booking.id);
    setBookingEquipment(String(booking.equipmentId));
    setBookingType(booking.serviceType ?? "pms");
    setBookingPackageId(packageValue);
    setBookingDate(booking.requestedDate.slice(0, 10));
    setBookingTime(booking.preferredTime ?? "");
    setBookingTechnician(tech);
    setBookingNotes(stripMetaTags(booking.notes ?? ""));
    setRescheduleFrom(booking.requestedDate);
    setBookingStep(1);
    setBookingModalOpen(true);
    setOpenActionMenuFor(null);
  };

  const handleBookingSubmit = () => {
    if (!bookingEquipment || !bookingDate || !bookingTime || isBookingDatePast) return;

    const normalizedDate = new Date(bookingDate);
    normalizedDate.setHours(0, 0, 0, 0);
    const legacyPackageTag: LegacyPackageOption =
      bookingPackageId === "repair_6" ? "repair_6" : bookingPackageId === "one_time" ? "one_time" : bookingType === "pms" ? "pms_1000" : "one_time";
    const noteWithPackage = setTag(bookingNotes.trim(), "package", legacyPackageTag);
    const noteWithTech = setTag(noteWithPackage, "tech", bookingTechnician);
    const packageId = selectedPackage?.id;
    const packageName = selectedPackage?.name ?? selectedPackageLabel;

    if (editBookingId) {
      const noteWithStatus = setTag(noteWithTech, "status", "rescheduled");
      updateBooking(editBookingId, {
        equipmentId: bookingEquipment,
        serviceCategory: toServiceCategory(bookingType),
        serviceType: bookingType,
        requestedDate: normalizedDate.toISOString(),
        preferredTime: bookingTime,
        status: "pending",
        packageId,
        packageName,
        preferredTechnician: bookingTechnician,
        rescheduledFrom: rescheduleFrom ?? undefined,
        notes: noteWithStatus,
      });
    } else {
      const noteWithStatus = setTag(noteWithTech, "status", "pending");
      addBooking({
        clientId: String(clientId),
        equipmentId: bookingEquipment,
        serviceCategory: toServiceCategory(bookingType),
        serviceType: bookingType,
        requestedDate: normalizedDate.toISOString(),
        preferredTime: bookingTime,
        status: "pending",
        packageId,
        packageName,
        preferredTechnician: bookingTechnician,
        notes: noteWithStatus,
      });
    }

    setBookingComplete(true);
    setTimeout(() => {
      setBookingModalOpen(false);
      resetModalState();
    }, 3000);
  };

  const now = useMemo(() => new Date(), []);
  const dayStart = useMemo(() => new Date(now.getFullYear(), now.getMonth(), now.getDate()), [now]);
  const dayEnd = useMemo(() => new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999), [now]);
  const weekEnd = useMemo(() => {
    const value = new Date(dayStart);
    value.setDate(dayStart.getDate() + 7);
    return value;
  }, [dayStart]);

  const enrichedBookings = useMemo(
    () => clientBookings.map((booking) => {
      const eq = equipmentById.get(booking.equipmentId);
      const status = getExtendedStatus(booking);
      const legacyPackage = getLegacyPackageOption(booking);
      const packageLabel = getBookingPackageLabel(booking, clientPackages);
      const tech = booking.preferredTechnician ?? getTag(booking.notes ?? "", "tech") ?? getTechnicianFromEquipmentId(booking.equipmentId);
      const { currentHours, nextPms } = getPmsMetric(eq);
      const bookingDate = getBookingDateWithStartTime(booking);

      return {
        booking,
        equipment: eq,
        status,
        packageType: legacyPackage,
        packageLabel,
        technician: tech,
        currentHours,
        nextPms,
        bookingDate,
        isPast: isBookingPast(booking),
        isToday: bookingDate >= dayStart && bookingDate <= dayEnd,
        isThisWeek: bookingDate >= dayStart && bookingDate <= weekEnd,
      };
    }),
    [clientBookings, clientPackages, dayEnd, dayStart, equipmentById, weekEnd]
  );
  const selectedDetails = enrichedBookings.find((item) => item.booking.id === detailsBookingId);

  const filteredBookings = useMemo(
    () => enrichedBookings.filter((item) => {
      const searchMatch =
        !search ||
        item.equipment?.name?.toLowerCase().includes(search.toLowerCase()) ||
        item.equipment?.serialNumber.toLowerCase().includes(search.toLowerCase()) ||
        formatServiceType(item.booking.serviceType).toLowerCase().includes(search.toLowerCase());

      if (!searchMatch) return false;
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (equipmentFilter !== "all" && String(item.booking.equipmentId) !== equipmentFilter) return false;
      if (serviceTypeFilter !== "all" && item.booking.serviceType !== serviceTypeFilter) return false;
      if (fromDate && item.booking.requestedDate.slice(0, 10) < fromDate) return false;
      if (toDate && item.booking.requestedDate.slice(0, 10) > toDate) return false;

      if (activeTab === "upcoming") return !item.isPast;
      if (activeTab === "today") return item.isToday;
      if (activeTab === "this_week") return item.isThisWeek;
      if (activeTab === "past") return item.isPast;
      return true;
    }),
    [activeTab, enrichedBookings, equipmentFilter, fromDate, search, serviceTypeFilter, statusFilter, toDate]
  );

  const upcomingCount = enrichedBookings.filter((b) => !b.isPast).length;
  const todayCount = enrichedBookings.filter((b) => b.isToday).length;
  const completedCount = enrichedBookings.filter((b) => b.status === "completed").length;
  const overdueCount = enrichedBookings.filter((b) => b.isPast && b.status !== "completed" && b.status !== "cancelled").length;

  const tabCounts: Record<BookingTab, number> = {
    all: enrichedBookings.length,
    upcoming: enrichedBookings.filter((b) => !b.isPast).length,
    today: enrichedBookings.filter((b) => b.isToday).length,
    this_week: enrichedBookings.filter((b) => b.isThisWeek).length,
    past: past.length,
  };

  const statusBreakdown = STATUS_ORDER.reduce<Record<ExtendedBookingStatus, number>>(
    (acc, status) => {
      acc[status] = enrichedBookings.filter((b) => b.status === status).length;
      return acc;
    },
    {
      pending: 0,
      confirmed: 0,
      scheduled: 0,
      in_progress: 0,
      completed: 0,
      cancelled: 0,
      rescheduled: 0,
    }
  );

  const donutSegments = useMemo(() => {
    const total = enrichedBookings.length || 1;
    const segments = [
      { status: "completed", color: "#10B981", value: statusBreakdown.completed },
      { status: "scheduled", color: "#3B82F6", value: statusBreakdown.scheduled },
      { status: "in_progress", color: "#F59E0B", value: statusBreakdown.in_progress },
      { status: "pending", color: "#8B5CF6", value: statusBreakdown.pending },
      { status: "cancelled", color: "#6B7280", value: statusBreakdown.cancelled },
    ];

    let start = -Math.PI / 2;
    return segments.map((segment) => {
      const angle = (segment.value / total) * Math.PI * 2;
      const end = start + angle;
      const path = arcPath(72, 72, 46, start, end);
      start = end;
      return { ...segment, path };
    });
  }, [enrichedBookings.length, statusBreakdown]);

  const recentActivity = useMemo(() => {
    const sorted = [...enrichedBookings].sort((a, b) => b.bookingDate.getTime() - a.bookingDate.getTime());
    const seenStatus = new Set<ExtendedBookingStatus>();
    const seenIds = new Set<string>();
    const varied: typeof enrichedBookings = [];
    // First pass: one per status, no duplicate IDs
    for (const item of sorted) {
      if (!seenStatus.has(item.status) && !seenIds.has(item.booking.id)) {
        seenStatus.add(item.status);
        seenIds.add(item.booking.id);
        varied.push(item);
      }
      if (varied.length >= 5) break;
    }
    // Second pass: fill to 5 with unique IDs only
    if (varied.length < 5) {
      for (const item of sorted) {
        if (!seenIds.has(item.booking.id)) {
          seenIds.add(item.booking.id);
          varied.push(item);
          if (varied.length >= 5) break;
        }
      }
    }
    return varied;
  }, [enrichedBookings]);

  const miniUpcoming = [...enrichedBookings]
    .filter((b) => !b.isPast)
    .sort((a, b) => a.bookingDate.getTime() - b.bookingDate.getTime())
    .slice(0, 3);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
    const lastDay = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0);
    const startOffset = firstDay.getDay();
    const total = lastDay.getDate();
    const cells: Array<{ day: number | null; hasUpcoming: boolean; hasOverdue: boolean; isToday: boolean }> = [];

    for (let i = 0; i < startOffset; i += 1) {
      cells.push({ day: null, hasUpcoming: false, hasOverdue: false, isToday: false });
    }

    for (let day = 1; day <= total; day += 1) {
      const date = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day);
      const hasUpcoming = enrichedBookings.some(
        (b) =>
          b.bookingDate.getFullYear() === date.getFullYear() &&
          b.bookingDate.getMonth() === date.getMonth() &&
          b.bookingDate.getDate() === date.getDate() &&
          !b.isPast
      );
      const hasOverdue = enrichedBookings.some(
        (b) =>
          b.bookingDate.getFullYear() === date.getFullYear() &&
          b.bookingDate.getMonth() === date.getMonth() &&
          b.bookingDate.getDate() === date.getDate() &&
          b.isPast &&
          b.status !== "completed" &&
          b.status !== "cancelled"
      );
      const isToday =
        date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth() &&
        date.getDate() === now.getDate();
      cells.push({ day, hasUpcoming, hasOverdue, isToday });
    }

    return cells;
  }, [calendarMonth, enrichedBookings, now]);

  const ACTIVITY_CONFIG: Record<ExtendedBookingStatus, {
    icon: React.ReactNode;
    bg: string;
    color: string;
    getMessage: (id: string, type: string) => string;
  }> = {
    completed: { icon: <CheckCircle2 className="w-4 h-4" />, bg: "rgba(16,185,129,0.15)", color: "#10B981", getMessage: (id, t) => `Booking ${id} for ${t} has been completed.` },
    confirmed: { icon: <Calendar className="w-4 h-4" />, bg: "rgba(59,130,246,0.15)", color: "#3B82F6", getMessage: (id, t) => `New booking ${id} for ${t} confirmed.` },
    scheduled: { icon: <Clock className="w-4 h-4" />, bg: "rgba(139,92,246,0.15)", color: "#8B5CF6", getMessage: (id, t) => `Booking ${id} for ${t} has been scheduled.` },
    in_progress: { icon: <Play className="w-4 h-4" />, bg: "rgba(245,158,11,0.15)", color: "#F59E0B", getMessage: (id, t) => `Booking ${id} for ${t} is now in progress.` },
    pending: { icon: <Clock className="w-4 h-4" />, bg: "rgba(242,169,0,0.15)", color: "#66B2B2", getMessage: (id, t) => `Booking ${id} for ${t} was submitted.` },
    cancelled: { icon: <XCircle className="w-4 h-4" />, bg: "rgba(239,68,68,0.15)", color: "#EF4444", getMessage: (id) => `Booking ${id} was cancelled.` },
    rescheduled: { icon: <RotateCcw className="w-4 h-4" />, bg: "rgba(6,182,212,0.15)", color: "#06B6D4", getMessage: (id, t) => `Booking ${id} for ${t} was rescheduled.` },
  };

  return (
    <div className="space-y-4 px-8 pt-8 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Bookings</h1>
          <p className="text-sm text-gray-500 mt-0.5">View, manage and track all your service bookings</p>
        </div>
        <Button onClick={() => setBookingModalOpen(true)} className="h-9 bg-[#66B2B2] hover:bg-[#66B2B2]/80 text-white font-bold">
          + Book New Service
        </Button>
      </div>

      {bookingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => {
              setBookingModalOpen(false);
              resetModalState();
            }}
          />
          <div className="relative z-10 w-full max-w-lg mx-4">
            <div className="bg-gray-50 rounded p-5 border border-gray-200">
              <button
                onClick={() => {
                  setBookingModalOpen(false);
                  resetModalState();
                }}
                className="absolute top-3 right-3 text-gray-500"
              >
                <X className="w-4 h-4" />
              </button>

              {bookingComplete ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded bg-[#10B981]/20 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 className="w-8 h-8 text-[#10B981]" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {editBookingId ? "Booking Updated!" : "Booking Confirmed!"}
                  </h3>
                  <p className="text-sm text-gray-500">Your service appointment has been scheduled.</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-5">
                    {[0, 1, 2].map((step) => (
                      <div key={step} className="flex items-center gap-2 flex-1">
                        <div
                          className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold ${
                            bookingStep >= step ? "bg-[#66B2B2] text-white" : "bg-[#E5E7EB] text-gray-500"
                          }`}
                        >
                          {step + 1}
                        </div>
                        {step < 2 && (
                          <div className={`flex-1 h-0.5 ${bookingStep > step ? "bg-[#66B2B2]" : "bg-[#E5E7EB]"}`} />
                        )}
                      </div>
                    ))}
                  </div>

                  {bookingStep === 0 && (
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-gray-900">Select Equipment &amp; Service</h3>
                      <div>
                        <label className="text-[10px] uppercase tracking-wider text-gray-500 mb-1 block">Equipment</label>
                        <Select value={bookingEquipment} onValueChange={setBookingEquipment}>
                          <SelectTrigger className="h-9 bg-white border-gray-200 text-gray-900 text-xs">
                            <SelectValue placeholder="Choose unit" />
                          </SelectTrigger>
                          <SelectContent className="bg-white border-gray-200">
                            {clientEquipment.map((eq) => (
                              <SelectItem key={eq.id} value={String(eq.id)} className="text-xs text-gray-900">
                                {eq.name ?? eq.id} - {eq.type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-[10px] uppercase tracking-wider text-gray-500 mb-1 block">Service Type</label>
                        <Select
                          value={bookingType}
                          onValueChange={(v) => {
                            const nextType = v as ServiceType;
                            setBookingType(nextType);
                            setBookingPackageId("one_time");
                          }}
                        >
                          <SelectTrigger className="h-9 bg-white border-gray-200 text-gray-900 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-white border-gray-200">
                            <SelectItem value="pms" className="text-xs text-gray-900">Preventative Maintenance</SelectItem>
                            <SelectItem value="repair" className="text-xs text-gray-900">Repair</SelectItem>
                            <SelectItem value="inspection" className="text-xs text-gray-900">Inspection</SelectItem>
                            <SelectItem value="installation" className="text-xs text-gray-900">Installation</SelectItem>
                            <SelectItem value="calibration" className="text-xs text-gray-900">Calibration</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-[10px] uppercase tracking-wider text-gray-500 mb-1 block">Package</label>
                        <Select value={bookingPackageId} onValueChange={setBookingPackageId}>
                          <SelectTrigger className="h-9 bg-white border-gray-200 text-gray-900 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-white border-gray-200">
                            {packageOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value} className="text-xs text-gray-900">
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {compatiblePackages.length === 0 && (
                          <div className="mt-1 text-[10px] text-gray-500">No active package matches this service. You can continue as one-time service.</div>
                        )}
                      </div>

                      <Button
                        onClick={() => setBookingStep(1)}
                        disabled={!bookingEquipment || !bookingPackageId}
                        className="w-full h-9 bg-[#66B2B2] hover:bg-[#66B2B2]/80 text-white font-bold disabled:opacity-50"
                      >
                        Continue <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  )}

                  {bookingStep === 1 && (
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-gray-900">Schedule Appointment</h3>
                      <div>
                        <label className="text-[10px] uppercase tracking-wider text-gray-500 mb-1 block">Preferred Date</label>
                        <Input
                          type="date"
                          value={bookingDate}
                          min={todayISO}
                          onChange={(e) => setBookingDate(e.target.value)}
                          className="h-9 bg-white border-gray-200 text-gray-900 text-xs"
                        />
                        {isBookingDatePast && (
                          <div className="mt-1 text-[10px] text-[#EF4444]">Choose today or a future date.</div>
                        )}
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-wider text-gray-500 mb-1 block">Preferred Time</label>
                        <Select value={bookingTime} onValueChange={setBookingTime}>
                          <SelectTrigger className="h-9 bg-white border-gray-200 text-gray-900 text-xs">
                            <SelectValue placeholder="Select time window" />
                          </SelectTrigger>
                          <SelectContent className="bg-white border-gray-200">
                            <SelectItem value="08:00-12:00" className="text-xs text-gray-900">Morning (8:00 - 12:00)</SelectItem>
                            <SelectItem value="12:00-16:00" className="text-xs text-gray-900">Afternoon (12:00 - 16:00)</SelectItem>
                            <SelectItem value="16:00-20:00" className="text-xs text-gray-900">Evening (16:00 - 20:00)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-[10px] uppercase tracking-wider text-gray-500 mb-1 block">Technician Preference</label>
                        <Select value={bookingTechnician} onValueChange={setBookingTechnician}>
                          <SelectTrigger className="h-9 bg-white border-gray-200 text-gray-900 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-white border-gray-200">
                            {TECHNICIAN_OPTIONS.map((tech) => (
                              <SelectItem key={tech} value={tech} className="text-xs text-gray-900">{tech}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setBookingStep(0)} className="flex-1 h-9 border-gray-200 text-gray-500 text-xs">
                          Back
                        </Button>
                        <Button
                          onClick={() => setBookingStep(2)}
                          disabled={!bookingDate || !bookingTime || isBookingDatePast}
                          className="flex-1 h-9 bg-[#66B2B2] hover:bg-[#66B2B2]/80 text-white font-bold disabled:opacity-50"
                        >
                          Continue <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {bookingStep === 2 && (
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-gray-900">Confirm Booking</h3>
                      <div className="p-3 rounded bg-gray-50 border border-gray-200 space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Equipment</span>
                          <span className="text-gray-900 font-mono">{selectedEquipment?.name ?? bookingEquipment}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Service Type</span>
                          <span className="text-gray-900">{formatServiceType(bookingType)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Package</span>
                          <span className="text-gray-900">{selectedPackageLabel}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Date</span>
                          <span className="text-gray-900">{bookingDate}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Time</span>
                          <span className="text-gray-900">{bookingTime}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Technician</span>
                          <span className="text-gray-900">{bookingTechnician}</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-wider text-gray-500 mb-1 block">Additional Notes</label>
                        <textarea
                          value={bookingNotes}
                          onChange={(e) => setBookingNotes(e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 rounded bg-white border border-gray-200 text-gray-900 text-xs focus:outline-none focus:border-[#66B2B2]/50 resize-none"
                          placeholder="Any special instructions..."
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setBookingStep(1)} className="flex-1 h-9 border-gray-200 text-gray-500 text-xs">
                          Back
                        </Button>
                        <Button onClick={handleBookingSubmit} className="flex-1 h-9 bg-[#66B2B2] hover:bg-[#66B2B2]/80 text-white font-bold">
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          {editBookingId ? "Save Reschedule" : "Confirm Booking"}
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <Dialog open={Boolean(selectedDetails)} onOpenChange={(open) => !open && setDetailsBookingId(null)}>
        <DialogContent className="max-w-2xl bg-white border-gray-200">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gray-900">
              <Eye className="h-5 w-5 text-[#66B2B2]" />
              Booking Details
            </DialogTitle>
          </DialogHeader>

          {selectedDetails && (
            <div className="space-y-4 text-xs">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-mono text-sm font-semibold text-gray-900">
                      {formatBookingId(selectedDetails.booking.id, selectedDetails.booking.requestedDate)}
                    </div>
                    <div className="mt-1 text-[11px] text-gray-500">
                      {formatServiceType(selectedDetails.booking.serviceType)} for {selectedDetails.equipment?.name ?? "Selected equipment"}
                    </div>
                  </div>
                  <span className={`rounded px-2 py-1 text-[10px] font-semibold capitalize ${STATUS_COLORS[selectedDetails.status]}`}>
                    {selectedDetails.status.replace("_", " ")}
                  </span>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <DetailItem label="Equipment" value={selectedDetails.equipment?.name ?? selectedDetails.booking.equipmentId} />
                <DetailItem label="Serial Number" value={selectedDetails.equipment?.serialNumber ?? "Not available"} />
                <DetailItem label="Service Type" value={formatServiceType(selectedDetails.booking.serviceType)} />
                <DetailItem label="Package" value={selectedDetails.packageLabel} />
                <DetailItem label="Requested Date" value={formatDate(selectedDetails.booking.requestedDate)} />
                <DetailItem label="Time Window" value={selectedDetails.booking.preferredTime ?? "Not selected"} />
                <DetailItem label="Technician Preference" value={selectedDetails.technician} />
                <DetailItem label="PMS Metric" value={selectedDetails.nextPms > 0 ? `${selectedDetails.currentHours.toLocaleString()} / ${selectedDetails.nextPms.toLocaleString()} hrs` : "Not applicable"} />
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Notes</div>
                <div className="mt-1 text-gray-900">{stripMetaTags(selectedDetails.booking.notes ?? "") || "No additional notes."}</div>
              </div>

              <div className="rounded-lg border border-[#66B2B2]/30 bg-[#66B2B2]/5 p-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#0F766E]">Timeline</div>
                <div className="mt-2 space-y-2">
                  <TimelineRow label="Submitted" value={formatDate(selectedDetails.booking.createdAt ?? selectedDetails.booking.requestedDate)} />
                  {selectedDetails.booking.rescheduledFrom && (
                    <TimelineRow label="Rescheduled From" value={formatDate(selectedDetails.booking.rescheduledFrom)} />
                  )}
                  <TimelineRow label="Requested Schedule" value={`${formatDate(selectedDetails.booking.requestedDate)} - ${getDisplayTime(selectedDetails.booking.preferredTime ?? "")}`} />
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch">
        <div className="xl:col-span-9 flex flex-col gap-3">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
            <StatCard title="Upcoming" value={upcomingCount} subtitle="Next 7 days" icon={<Calendar className="w-4 h-4 text-[#3B82F6]" />} iconBg="bg-[#3B82F6]/20" />
            <StatCard title="Today" value={todayCount} subtitle="Scheduled for today" icon={<Clock className="w-4 h-4 text-[#66B2B2]" />} iconBg="bg-[#66B2B2]/20" />
            <StatCard title="Completed" value={completedCount} subtitle="This month" icon={<CheckCircle2 className="w-4 h-4 text-[#10B981]" />} iconBg="bg-[#10B981]/20" />
            <StatCard title="Overdue" value={overdueCount} subtitle="Requires attention" icon={<Ban className="w-4 h-4 text-[#EF4444]" />} iconBg="bg-[#EF4444]/20" />
            <StatCard title="Total Spent" value={formatMoneyPeso(totalSpent)} subtitle="Paid invoices" icon={<DollarSign className="w-4 h-4 text-[#8B5CF6]" />} iconBg="bg-[#8B5CF6]/20" />
          </div>

          <div className="data-card p-3">
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.7fr)_repeat(3,minmax(0,1fr))_minmax(0,1.2fr)_auto] gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by equipment, service type..."
                  className="h-9 pl-8 bg-white border-gray-200 text-xs text-gray-900"
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 bg-white border-gray-200 text-xs text-gray-900">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  <SelectItem value="all">All Status</SelectItem>
                  {STATUS_ORDER.map((status) => (
                    <SelectItem key={status} value={status}>{status.replace("_", " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={equipmentFilter} onValueChange={setEquipmentFilter}>
                <SelectTrigger className="h-9 bg-white border-gray-200 text-xs text-gray-900">
                  <SelectValue placeholder="All Equipment" />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  <SelectItem value="all">All Equipment</SelectItem>
                  {clientEquipment.map((eq) => (
                    <SelectItem key={eq.id} value={String(eq.id)}>{eq.name ?? eq.id}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={serviceTypeFilter} onValueChange={setServiceTypeFilter}>
                <SelectTrigger className="h-9 bg-white border-gray-200 text-xs text-gray-900">
                  <SelectValue placeholder="All Service Types" />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  <SelectItem value="all">All Service Types</SelectItem>
                  <SelectItem value="pms">PMS</SelectItem>
                  <SelectItem value="repair">Repair</SelectItem>
                  <SelectItem value="inspection">Inspection</SelectItem>
                  <SelectItem value="installation">Installation</SelectItem>
                  <SelectItem value="calibration">Calibration</SelectItem>
                </SelectContent>
              </Select>

              <div className="relative">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDatePickerOpen((prev) => !prev)}
                  className="h-9 bg-white border border-gray-200 rounded px-3 flex items-center gap-2 text-xs text-gray-900 whitespace-nowrap w-full justify-between hover:bg-gray-50"
                >
                  <span className="flex items-center gap-2 overflow-hidden">
                    <CalendarDays className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{formatDateRangeLabel(fromDate, toDate)}</span>
                  </span>
                  <CalendarDays className="w-3.5 h-3.5 flex-shrink-0" />
                </Button>

                {datePickerOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setDatePickerOpen(false)} />
                    <div className="absolute right-0 top-11 z-50 bg-gray-50 border border-gray-200 rounded p-3 space-y-2 shadow-xl w-[260px]">
                      <div>
                        <label className="text-[10px] uppercase tracking-wider text-gray-500 mb-1 block">From</label>
                        <Input
                          type="date"
                          value={fromDate}
                          onChange={(e) => setFromDate(e.target.value)}
                          className="h-9 bg-white border-gray-200 text-xs text-gray-900"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-wider text-gray-500 mb-1 block">To</label>
                        <Input
                          type="date"
                          value={toDate}
                          onChange={(e) => setToDate(e.target.value)}
                          className="h-9 bg-white border-gray-200 text-xs text-gray-900"
                        />
                      </div>
                      <div className="flex gap-2 pt-1">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setFromDate("");
                            setToDate("");
                          }}
                          className="flex-1 h-9 border-gray-200 text-gray-500"
                        >
                          Clear
                        </Button>
                        <Button
                          type="button"
                          onClick={() => setDatePickerOpen(false)}
                          className="flex-1 h-9 bg-[#66B2B2] hover:bg-[#66B2B2]/80 text-white font-bold"
                        >
                          Apply
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <Button className="h-9 bg-gray-50 hover:bg-gray-100 text-gray-900">
                <Filter className="w-3.5 h-3.5 mr-1" />
                Filters
              </Button>
            </div>
          </div>

          <div className="data-card p-3 xl:h-[433px] flex flex-col">
            <div className="flex flex-wrap gap-3 border-b border-gray-200 pb-2 mb-2">
              {([
                ["all", "All Bookings"],
                ["upcoming", "Upcoming"],
                ["today", "Today"],
                ["this_week", "This Week"],
                ["past", "Past"],
              ] as Array<[BookingTab, string]>).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`text-xs pb-1 border-b transition-colors duration-150 ${
                    activeTab === key ? "text-[#66B2B2] border-[#66B2B2]" : "text-gray-500 border-transparent hover:text-gray-900"
                  }`}
                >
                  {label} <span className="ml-1 text-[10px]">{tabCounts[key]}</span>
                </button>
              ))}
            </div>

            <div className="flex-1 min-h-0 overflow-auto">
              <table className="w-full min-w-[1100px] text-xs">
                <thead className="sticky top-0 z-10 bg-gray-50">
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-2 text-[10px] uppercase tracking-wider text-gray-500">Booking ID</th>
                    <th className="text-left py-2 px-2 text-[10px] uppercase tracking-wider text-gray-500">Equipment</th>
                    <th className="text-left py-2 px-2 text-[10px] uppercase tracking-wider text-gray-500">Service Type</th>
                    <th className="text-left py-2 px-2 text-[10px] uppercase tracking-wider text-gray-500">Date &amp; Time</th>
                    <th className="text-left py-2 px-2 text-[10px] uppercase tracking-wider text-gray-500">Technician</th>
                    <th className="text-left py-2 px-2 text-[10px] uppercase tracking-wider text-gray-500">Status</th>
                    <th className="text-left py-2 px-2 text-[10px] uppercase tracking-wider text-gray-500">Package / Type</th>
                    <th className="text-left py-2 px-2 text-[10px] uppercase tracking-wider text-gray-500">Current / Next PMS</th>
                    <th className="text-left py-2 px-2 text-[10px] uppercase tracking-wider text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBookings.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-10 text-center text-gray-500">
                        <PackageIcon className="w-6 h-6 mx-auto mb-2" />
                        No bookings found
                      </td>
                    </tr>
                  )}

                  {filteredBookings.map((item) => {
                    const serviceTypeKey = typeof item.booking.serviceType === "string"
                      ? item.booking.serviceType.toLowerCase()
                      : "";
                    const canClientChange = item.status !== "completed" && item.status !== "cancelled" && item.status !== "in_progress";
                    return (
                      <tr key={item.booking.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors duration-150">
                        <td className="py-2 px-2">
                          <div className="font-mono text-gray-900 font-semibold">{formatBookingId(item.booking.id, item.booking.requestedDate)}</div>
                          <div className="text-[10px] text-gray-500">{formatDate(item.booking.createdAt ?? item.booking.requestedDate)}</div>
                        </td>

                        <td className="py-2 px-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded bg-white border border-gray-200 flex items-center justify-center">
                              <Wrench className="w-3.5 h-3.5 text-[#66B2B2]" />
                            </div>
                            <div>
                              <div className="text-gray-900 font-mono font-semibold">{item.equipment?.unitId ?? "—"}</div>
                              <div className="text-[10px] text-gray-500">SN: {item.equipment?.serialNumber ?? "—"}</div>
                              <div className="text-[10px] text-gray-500">Client: {user?.name ?? "Client"}</div>
                            </div>
                          </div>
                        </td>

                        <td className="py-2 px-2">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${SERVICE_COLORS[serviceTypeKey as ServiceType] ?? "bg-[#6B7280]/20 text-gray-500"}`}>
                            {formatServiceType(item.booking.serviceType)}
                          </span>
                          <div className="text-[10px] text-gray-500 mt-1">{item.booking.serviceType === "pms" ? "(1000 hrs)" : "One-time"}</div>
                        </td>

                        <td className="py-2 px-2">
                          <div className="flex items-center gap-1 text-gray-900"><Calendar className="w-3 h-3" />{formatDate(item.booking.requestedDate)}</div>
                          <div className="flex items-center gap-1 text-[10px] text-gray-500 mt-1"><Clock className="w-3 h-3" />{getDisplayTime(item.booking.preferredTime)}</div>
                        </td>

                        <td className="py-2 px-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-semibold ${getTechColor(item.technician)}`}>
                              {getInitials(item.technician)}
                            </div>
                            <span className="text-gray-900">{item.technician}</span>
                          </div>
                        </td>

                        <td className="py-2 px-2">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold capitalize ${STATUS_COLORS[item.status]}`}>
                            {item.status.replace("_", " ")}
                          </span>
                        </td>

                        <td className="py-2 px-2">
                          <div className="flex items-center gap-1 text-gray-900"><PackageIcon className="w-3.5 h-3.5 text-[#8B5CF6]" />{item.packageLabel}</div>
                          <div className="text-[10px] text-gray-500 mt-1">{item.packageType === "repair_6" ? "(6 visits)" : item.packageType === "pms_1000" ? "(1000 hrs)" : "One-time"}</div>
                        </td>

                        <td className="py-2 px-2">
                          <div className={`font-semibold ${getHoursState(item.currentHours, item.nextPms)}`}>{item.currentHours.toLocaleString()} hrs</div>
                          <div className="text-[10px] text-gray-500">Next: {item.nextPms.toLocaleString()} hrs</div>
                        </td>

                        <td className="py-2 px-2">
                          <div className="flex items-center gap-1 relative">
                            <Button
                              size="icon-sm"
                              variant="outline"
                              className="h-7 w-7 border-gray-200 text-gray-500 hover:text-gray-900"
                              onClick={() => setDetailsBookingId(item.booking.id)}
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Button>

                            <Button
                              size="icon-sm"
                              variant="outline"
                              className="h-7 w-7 border-gray-200 text-gray-500 hover:text-gray-900"
                              onClick={() => setOpenActionMenuFor(openActionMenuFor === item.booking.id ? null : item.booking.id)}
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </Button>

                            {openActionMenuFor === item.booking.id && (
                              <div className="absolute right-0 top-8 w-40 rounded border border-gray-200 bg-white p-1 z-20 shadow-lg">
                                <button
                                  className="w-full text-left px-2 py-1 text-xs text-gray-900 hover:bg-gray-50 rounded"
                                  onClick={() => {
                                    setDetailsBookingId(item.booking.id);
                                    setOpenActionMenuFor(null);
                                  }}
                                >
                                  View Details
                                </button>
                                <button
                                  disabled={!canClientChange}
                                  className="w-full text-left px-2 py-1 text-xs text-gray-900 hover:bg-gray-50 rounded disabled:text-gray-400 disabled:cursor-not-allowed"
                                  onClick={() => openReschedule(item.booking)}
                                >
                                  Reschedule
                                </button>
                                <button
                                  disabled={!canClientChange}
                                  className="w-full text-left px-2 py-1 text-xs text-[#EF4444] hover:bg-red-50 rounded disabled:text-gray-400 disabled:cursor-not-allowed"
                                  onClick={() => {
                                    setBookingStatus(item.booking, "cancelled");
                                    setOpenActionMenuFor(null);
                                  }}
                                >
                                  Cancel Booking
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <aside className="xl:col-span-3 flex flex-col gap-3">
          <div className="data-card p-3">
            <div className="text-sm font-semibold text-gray-900">Schedule Calendar</div>
            <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
              <button onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}>
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span>{calendarMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</span>
              <button onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-7 mt-2 text-[10px] text-gray-500">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d} className="text-center py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1 mt-1">
              {calendarDays.map((cell, index) => (
                <div key={`day-${index}`} className="h-8 rounded border border-gray-200 flex flex-col items-center justify-center text-[10px]">
                  {cell.day && (
                    <>
                      <span className={cell.isToday ? "text-white bg-[#66B2B2] px-1 rounded" : "text-gray-900"}>{cell.day}</span>
                      <span className="flex gap-0.5 mt-0.5">
                        {cell.hasUpcoming && <span className="w-1 h-1 rounded bg-[#3B82F6]" />}
                        {cell.hasOverdue && <span className="w-1 h-1 rounded bg-[#EF4444]" />}
                      </span>
                    </>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-2 flex items-center gap-3 text-[10px] text-gray-500">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-[#66B2B2]" />Today</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-[#3B82F6]" />{upcoming.length} Upcoming</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-[#EF4444]" />{overdueCount} Overdue</span>
            </div>
          </div>

          <div className="data-card p-3 flex flex-col flex-0.5">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-gray-900">Upcoming Bookings</div>
              <button className="text-xs text-[#3B82F6] hover:text-gray-900 transition-colors duration-150">View all</button>
            </div>
            <div className="mt-2 space-y-2 flex flex-col flex-1">
              {miniUpcoming.map((item) => (
                <div key={`mini-${item.booking.id}`} className="p-2 rounded border border-gray-200 bg-white">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-xs text-gray-900 font-semibold">{item.equipment?.unitId}</div>
                      <div className="text-[10px] text-gray-500">{formatServiceType(item.booking.serviceType)}</div>
                      <div className="text-[10px] text-gray-500">{formatDate(item.booking.requestedDate)} · {getDisplayTime(item.booking.preferredTime)}</div>
                    </div>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${STATUS_COLORS[item.status]}`}>
                      {item.status.replace("_", " ")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </aside>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
        <div className="data-card p-3">
          <div className="text-sm font-semibold text-gray-900">Booking Status Overview</div>
          <div className="text-[10px] text-gray-500">This month</div>
          <div className="mt-4 flex items-center justify-center gap-8">
            <svg width="160" height="160" viewBox="0 0 144 144" className="flex-shrink-0">
              <circle cx="72" cy="72" r="46" fill="none" stroke="#FFFFFF" strokeWidth="16" />
              {donutSegments.map((segment) => (
                <path key={segment.status} d={segment.path} stroke={segment.color} strokeWidth="16" fill="none" strokeLinecap="butt" />
              ))}
              <text
                x="72" y="65"
                textAnchor="middle"
                fill="#6B7280"
                fontSize="11"
                fontFamily="inherit"
              >Total</text>
              <text
                x="72" y="85"
                textAnchor="middle"
                fill="#F3F4F6"
                fontSize="22"
                fontWeight="bold"
                fontFamily="inherit"
              >{enrichedBookings.length}</text>
            </svg>
            <div className="space-y-2.5 min-w-[150px]">
              {[
                ["Completed", statusBreakdown.completed, "#10B981"],
                ["Scheduled", statusBreakdown.scheduled, "#3B82F6"],
                ["In Progress", statusBreakdown.in_progress, "#F59E0B"],
                ["Pending", statusBreakdown.pending, "#8B5CF6"],
                ["Cancelled", statusBreakdown.cancelled, "#6B7280"],
              ].map(([label, count, color]) => {
                const pct = enrichedBookings.length > 0 ? Math.round((Number(count) / enrichedBookings.length) * 100) : 0;
                return (
                  <div key={String(label)} className="flex items-center justify-between gap-4 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: String(color) }} />
                      <span className="text-gray-900">{label}</span>
                    </div>
                    <span className="text-gray-500 font-medium">{count} ({pct}%)</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="data-card p-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-gray-900">Recent Activity</div>
            <button className="text-xs text-[#3B82F6] hover:text-gray-900 transition-colors duration-150">View all</button>
          </div>
          <div className="mt-3 space-y-2">
            {recentActivity.map((item) => {
              const cfg = ACTIVITY_CONFIG[item.status];
              const bookingId = formatBookingId(item.booking.id, item.booking.requestedDate);
              const equipType = item.equipment?.type ?? "Equipment";
              return (
                <div key={`activity-${item.booking.id}`} className="flex items-start gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: cfg.bg, color: cfg.color }}
                  >
                    {cfg.icon}
                  </div>
                  <div>
                    <div className="text-xs text-gray-900">{cfg.getMessage(bookingId, equipType)}</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">
                      {formatDate(item.bookingDate.toISOString())} · {getDisplayTime(item.booking.preferredTime)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="data-card p-3">
          <div className="text-sm font-semibold text-gray-900">Quick Actions</div>
          <div className="mt-3 space-y-2">
            <button onClick={() => setBookingModalOpen(true)} className="w-full text-left p-2 rounded border border-gray-200 hover:bg-gray-50 transition-colors duration-150">
              <div className="flex items-center gap-2"><PenSquare className="w-4 h-4 text-[#66B2B2]" /><span className="text-xs text-gray-900 font-semibold">Book New Service</span></div>
              <div className="text-[10px] text-gray-500 mt-1">Schedule a service for your equipment</div>
            </button>
            <button onClick={() => setBookingModalOpen(true)} className="w-full text-left p-2 rounded border border-gray-200 hover:bg-gray-50 transition-colors duration-150">
              <div className="flex items-center gap-2"><Ban className="w-4 h-4 text-[#EF4444]" /><span className="text-xs text-gray-900 font-semibold">Request Emergency Service</span></div>
              <div className="text-[10px] text-gray-500 mt-1">Need urgent assistance? Let us know</div>
            </button>
            <button className="w-full text-left p-2 rounded border border-gray-200 hover:bg-gray-50 transition-colors duration-150">
              <div className="flex items-center gap-2"><Download className="w-4 h-4 text-[#10B981]" /><span className="text-xs text-gray-900 font-semibold">Download Service Report</span></div>
              <div className="text-[10px] text-gray-500 mt-1">Access your service reports and records</div>
            </button>
            <button className="w-full text-left p-2 rounded border border-gray-200 hover:bg-gray-50 transition-colors duration-150">
              <div className="flex items-center gap-2"><Headset className="w-4 h-4 text-[#3B82F6]" /><span className="text-xs text-gray-900 font-semibold">Contact Support</span></div>
              <div className="text-[10px] text-gray-500 mt-1">Get help from our support team</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
  iconBg,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  iconBg: string;
}) {
  return (
    <div className="data-card p-3">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[10px] text-gray-500 uppercase tracking-wider">{title}</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{value}</div>
          <div className="text-[10px] text-gray-500 mt-1">{subtitle}</div>
        </div>
        <div className={`w-8 h-8 rounded flex items-center justify-center ${iconBg}`}>{icon}</div>
      </div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3">
      <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{label}</div>
      <div className="mt-1 font-semibold text-gray-900">{value}</div>
    </div>
  );
}

function TimelineRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-[11px]">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  );
}
