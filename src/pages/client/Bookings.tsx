import { useEffect, useMemo, useState } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import { useOperationsStore } from "@/stores/useOperationsStore";
import type { Booking, ServiceType } from "@/types";
import {
  Calendar,
  CalendarDays,
  Clock,
  Package,
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
  Check,
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

type ExtendedBookingStatus =
  | "pending"
  | "confirmed"
  | "scheduled"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "rescheduled";

type BookingTab = "all" | "upcoming" | "today" | "this_week" | "past";
type PackageOption = "pms_1000" | "repair_6" | "one_time";

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
  pending: "bg-[#F2A900]/20 text-[#F2A900]",
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

const PACKAGE_LABELS: Record<PackageOption, string> = {
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

function formatServiceType(serviceType: ServiceType) {
  if (serviceType === "pms") return "PMS";
  return serviceType.charAt(0).toUpperCase() + serviceType.slice(1);
}

function formatBookingId(id: number, requestedDate: string) {
  const year = new Date(requestedDate).getFullYear();
  return `BK-${year}-${String(id).padStart(4, "0")}`;
}

function getTechnicianFromEquipmentId(equipmentId: number) {
  const mod = equipmentId % 3;
  if (mod === 0) return "James Rodriguez";
  if (mod === 1) return "Alex Smith";
  return "Mike Thompson";
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
  const meta = getTag(booking.notes, "status") as ExtendedBookingStatus | null;
  if (meta && STATUS_ORDER.includes(meta)) return meta;
  return booking.status;
}

function getPackageOption(booking: Booking): PackageOption {
  const meta = getTag(booking.notes, "package") as PackageOption | null;
  if (meta && Object.prototype.hasOwnProperty.call(PACKAGE_LABELS, meta)) return meta;
  return booking.serviceType === "pms" ? "pms_1000" : "one_time";
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

function getDisplayTime(timeRange: string) {
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
  const clientId = user?.clientId || 1;

  const clientEquipment = useMemo(() => equipment.filter((e) => e.clientId === clientId), [equipment, clientId]);
  const equipmentById = useMemo(() => new Map(clientEquipment.map((eq) => [eq.id, eq])), [clientEquipment]);

  const clientBookings = useMemo(
    () => bookings
      .filter((b) => b.clientId === clientId)
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
  const [openActionMenuFor, setOpenActionMenuFor] = useState<number | null>(null);

  const [bookingStep, setBookingStep] = useState(0);
  const [bookingEquipment, setBookingEquipment] = useState("");
  const [bookingType, setBookingType] = useState<ServiceType>("pms");
  const [bookingPackage, setBookingPackage] = useState<PackageOption>("pms_1000");
  const [bookingDate, setBookingDate] = useState("");
  const [bookingTime, setBookingTime] = useState("");
  const [bookingTechnician, setBookingTechnician] = useState("No preference");
  const [bookingNotes, setBookingNotes] = useState("");
  const [bookingComplete, setBookingComplete] = useState(false);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [editBookingId, setEditBookingId] = useState<number | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  const seedKey = `nextos-bookings-seeded-client-${clientId}`;

  const resetModalState = () => {
    setBookingStep(0);
    setBookingEquipment("");
    setBookingType("pms");
    setBookingPackage("pms_1000");
    setBookingDate("");
    setBookingTime("");
    setBookingTechnician("No preference");
    setBookingNotes("");
    setBookingComplete(false);
    setEditBookingId(null);
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
        clientId,
        equipmentId: eq.id,
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
    const notes = setTag(booking.notes, "status", status);
    updateBooking(booking.id, { status: toBaseStatus(status), notes });
  };

  const openReschedule = (booking: Booking) => {
    const pkg = getPackageOption(booking);
    const tech = getTag(booking.notes, "tech") ?? getTechnicianFromEquipmentId(booking.equipmentId);
    setEditBookingId(booking.id);
    setBookingEquipment(String(booking.equipmentId));
    setBookingType(booking.serviceType);
    setBookingPackage(pkg);
    setBookingDate(booking.requestedDate.slice(0, 10));
    setBookingTime(booking.preferredTime);
    setBookingTechnician(tech);
    setBookingNotes(stripMetaTags(booking.notes));
    setBookingStep(1);
    setBookingModalOpen(true);
    setOpenActionMenuFor(null);
  };

  const handleBookingSubmit = () => {
    if (!bookingEquipment || !bookingDate || !bookingTime) return;

    const normalizedDate = new Date(bookingDate);
    normalizedDate.setHours(0, 0, 0, 0);
    const noteWithPackage = setTag(bookingNotes.trim(), "package", bookingPackage);
    const noteWithTech = setTag(noteWithPackage, "tech", bookingTechnician);

    if (editBookingId) {
      const noteWithStatus = setTag(noteWithTech, "status", "rescheduled");
      updateBooking(editBookingId, {
        equipmentId: parseInt(bookingEquipment, 10),
        serviceType: bookingType,
        requestedDate: normalizedDate.toISOString(),
        preferredTime: bookingTime,
        status: "pending",
        notes: noteWithStatus,
      });
    } else {
      const noteWithStatus = setTag(noteWithTech, "status", "pending");
      addBooking({
        clientId,
        equipmentId: parseInt(bookingEquipment, 10),
        serviceType: bookingType,
        requestedDate: normalizedDate.toISOString(),
        preferredTime: bookingTime,
        status: "pending",
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
      const pkg = getPackageOption(booking);
      const tech = getTag(booking.notes, "tech") ?? getTechnicianFromEquipmentId(booking.equipmentId);
      const currentHours = eq ? ((eq.id * 137) % 2000) + 500 : 0;
      const nextPms = Math.ceil(currentHours / 1000) * 1000;
      const bookingDate = getBookingDateWithStartTime(booking);

      return {
        booking,
        equipment: eq,
        status,
        packageType: pkg,
        technician: tech,
        currentHours,
        nextPms,
        bookingDate,
        isPast: isBookingPast(booking),
        isToday: bookingDate >= dayStart && bookingDate <= dayEnd,
        isThisWeek: bookingDate >= dayStart && bookingDate <= weekEnd,
      };
    }),
    [clientBookings, dayEnd, dayStart, equipmentById, weekEnd]
  );

  const filteredBookings = useMemo(
    () => enrichedBookings.filter((item) => {
      const searchMatch =
        !search ||
        item.equipment?.unitId.toLowerCase().includes(search.toLowerCase()) ||
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
      { status: "cancelled", color: "#88888C", value: statusBreakdown.cancelled },
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
    const seenIds = new Set<number>();
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

  const actionTransitions: Record<ExtendedBookingStatus, ExtendedBookingStatus[]> = {
    pending: ["confirmed", "cancelled"],
    confirmed: ["scheduled", "cancelled", "in_progress"],
    scheduled: ["in_progress", "cancelled", "rescheduled"],
    in_progress: ["completed", "cancelled"],
    completed: [],
    cancelled: [],
    rescheduled: ["scheduled", "cancelled"],
  };

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
    pending: { icon: <Clock className="w-4 h-4" />, bg: "rgba(242,169,0,0.15)", color: "#F2A900", getMessage: (id, t) => `Booking ${id} for ${t} was submitted.` },
    cancelled: { icon: <XCircle className="w-4 h-4" />, bg: "rgba(239,68,68,0.15)", color: "#EF4444", getMessage: (id) => `Booking ${id} was cancelled.` },
    rescheduled: { icon: <RotateCcw className="w-4 h-4" />, bg: "rgba(6,182,212,0.15)", color: "#06B6D4", getMessage: (id, t) => `Booking ${id} for ${t} was rescheduled.` },
  };

  return (
    <div className="space-y-4 px-8 pt-8 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#EAEAEA] tracking-tight">Bookings</h1>
          <p className="text-sm text-[#88888C] mt-0.5">View, manage and track all your service bookings</p>
        </div>
        <Button onClick={() => setBookingModalOpen(true)} className="h-9 bg-[#F2A900] hover:bg-[#F2A900]/80 text-[#050505] font-bold">
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
            <div className="bg-[#0A0A0C] rounded p-5 border border-white/10">
              <button
                onClick={() => {
                  setBookingModalOpen(false);
                  resetModalState();
                }}
                className="absolute top-3 right-3 text-[#88888C]"
              >
                <X className="w-4 h-4" />
              </button>

              {bookingComplete ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded bg-[#10B981]/20 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 className="w-8 h-8 text-[#10B981]" />
                  </div>
                  <h3 className="text-lg font-semibold text-[#EAEAEA] mb-1">
                    {editBookingId ? "Booking Updated!" : "Booking Confirmed!"}
                  </h3>
                  <p className="text-sm text-[#88888C]">Your service appointment has been scheduled.</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-5">
                    {[0, 1, 2].map((step) => (
                      <div key={step} className="flex items-center gap-2 flex-1">
                        <div
                          className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold ${
                            bookingStep >= step ? "bg-[#F2A900] text-[#050505]" : "bg-[#2A2A30] text-[#88888C]"
                          }`}
                        >
                          {step + 1}
                        </div>
                        {step < 2 && (
                          <div className={`flex-1 h-0.5 ${bookingStep > step ? "bg-[#F2A900]" : "bg-[#2A2A30]"}`} />
                        )}
                      </div>
                    ))}
                  </div>

                  {bookingStep === 0 && (
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-[#EAEAEA]">Select Equipment &amp; Service</h3>
                      <div>
                        <label className="text-[10px] uppercase tracking-wider text-[#88888C] mb-1 block">Equipment</label>
                        <Select value={bookingEquipment} onValueChange={setBookingEquipment}>
                          <SelectTrigger className="h-9 bg-[#1A1A20] border-white/10 text-[#EAEAEA] text-xs">
                            <SelectValue placeholder="Choose unit" />
                          </SelectTrigger>
                          <SelectContent className="bg-[#1A1A20] border-white/10">
                            {clientEquipment.map((eq) => (
                              <SelectItem key={eq.id} value={String(eq.id)} className="text-xs text-[#EAEAEA]">
                                {eq.unitId} - {eq.type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-[10px] uppercase tracking-wider text-[#88888C] mb-1 block">Service Type</label>
                        <Select
                          value={bookingType}
                          onValueChange={(v) => {
                            const nextType = v as ServiceType;
                            setBookingType(nextType);
                            if (nextType === "pms") {
                              setBookingPackage("pms_1000");
                            }
                          }}
                        >
                          <SelectTrigger className="h-9 bg-[#1A1A20] border-white/10 text-[#EAEAEA] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[#1A1A20] border-white/10">
                            <SelectItem value="pms" className="text-xs text-[#EAEAEA]">Preventative Maintenance</SelectItem>
                            <SelectItem value="repair" className="text-xs text-[#EAEAEA]">Repair</SelectItem>
                            <SelectItem value="inspection" className="text-xs text-[#EAEAEA]">Inspection</SelectItem>
                            <SelectItem value="installation" className="text-xs text-[#EAEAEA]">Installation</SelectItem>
                            <SelectItem value="calibration" className="text-xs text-[#EAEAEA]">Calibration</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-[10px] uppercase tracking-wider text-[#88888C] mb-1 block">Package</label>
                        <Select value={bookingPackage} onValueChange={(v) => setBookingPackage(v as PackageOption)}>
                          <SelectTrigger className="h-9 bg-[#1A1A20] border-white/10 text-[#EAEAEA] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[#1A1A20] border-white/10">
                            <SelectItem value="pms_1000" className="text-xs text-[#EAEAEA]">PMS Package (1000 hrs)</SelectItem>
                            <SelectItem value="repair_6" className="text-xs text-[#EAEAEA]">Repair Package (6 visits)</SelectItem>
                            <SelectItem value="one_time" className="text-xs text-[#EAEAEA]">One-time Service</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <Button
                        onClick={() => setBookingStep(1)}
                        disabled={!bookingEquipment}
                        className="w-full h-9 bg-[#F2A900] hover:bg-[#F2A900]/80 text-[#050505] font-bold disabled:opacity-50"
                      >
                        Continue <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  )}

                  {bookingStep === 1 && (
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-[#EAEAEA]">Schedule Appointment</h3>
                      <div>
                        <label className="text-[10px] uppercase tracking-wider text-[#88888C] mb-1 block">Preferred Date</label>
                        <Input
                          type="date"
                          value={bookingDate}
                          onChange={(e) => setBookingDate(e.target.value)}
                          className="h-9 bg-[#1A1A20] border-white/10 text-[#EAEAEA] text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-wider text-[#88888C] mb-1 block">Preferred Time</label>
                        <Select value={bookingTime} onValueChange={setBookingTime}>
                          <SelectTrigger className="h-9 bg-[#1A1A20] border-white/10 text-[#EAEAEA] text-xs">
                            <SelectValue placeholder="Select time window" />
                          </SelectTrigger>
                          <SelectContent className="bg-[#1A1A20] border-white/10">
                            <SelectItem value="08:00-12:00" className="text-xs text-[#EAEAEA]">Morning (8:00 - 12:00)</SelectItem>
                            <SelectItem value="12:00-16:00" className="text-xs text-[#EAEAEA]">Afternoon (12:00 - 16:00)</SelectItem>
                            <SelectItem value="16:00-20:00" className="text-xs text-[#EAEAEA]">Evening (16:00 - 20:00)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-[10px] uppercase tracking-wider text-[#88888C] mb-1 block">Technician Preference</label>
                        <Select value={bookingTechnician} onValueChange={setBookingTechnician}>
                          <SelectTrigger className="h-9 bg-[#1A1A20] border-white/10 text-[#EAEAEA] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[#1A1A20] border-white/10">
                            {TECHNICIAN_OPTIONS.map((tech) => (
                              <SelectItem key={tech} value={tech} className="text-xs text-[#EAEAEA]">{tech}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setBookingStep(0)} className="flex-1 h-9 border-white/10 text-[#88888C] text-xs">
                          Back
                        </Button>
                        <Button
                          onClick={() => setBookingStep(2)}
                          disabled={!bookingDate || !bookingTime}
                          className="flex-1 h-9 bg-[#F2A900] hover:bg-[#F2A900]/80 text-[#050505] font-bold disabled:opacity-50"
                        >
                          Continue <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {bookingStep === 2 && (
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-[#EAEAEA]">Confirm Booking</h3>
                      <div className="p-3 rounded bg-[#0A0A0C] border border-white/10 space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-[#88888C]">Equipment</span>
                          <span className="text-[#EAEAEA] font-mono">{clientEquipment.find((e) => e.id === parseInt(bookingEquipment, 10))?.unitId}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#88888C]">Service Type</span>
                          <span className="text-[#EAEAEA]">{formatServiceType(bookingType)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#88888C]">Package</span>
                          <span className="text-[#EAEAEA]">{PACKAGE_LABELS[bookingPackage]}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#88888C]">Date</span>
                          <span className="text-[#EAEAEA]">{bookingDate}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#88888C]">Time</span>
                          <span className="text-[#EAEAEA]">{bookingTime}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#88888C]">Technician</span>
                          <span className="text-[#EAEAEA]">{bookingTechnician}</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-wider text-[#88888C] mb-1 block">Additional Notes</label>
                        <textarea
                          value={bookingNotes}
                          onChange={(e) => setBookingNotes(e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 rounded bg-[#1A1A20] border border-white/10 text-[#EAEAEA] text-xs focus:outline-none focus:border-[#F2A900]/50 resize-none"
                          placeholder="Any special instructions..."
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setBookingStep(1)} className="flex-1 h-9 border-white/10 text-[#88888C] text-xs">
                          Back
                        </Button>
                        <Button onClick={handleBookingSubmit} className="flex-1 h-9 bg-[#F2A900] hover:bg-[#F2A900]/80 text-[#050505] font-bold">
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

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch">
        <div className="xl:col-span-9 flex flex-col gap-3">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
            <StatCard title="Upcoming" value={upcomingCount} subtitle="Next 7 days" icon={<Calendar className="w-4 h-4 text-[#3B82F6]" />} iconBg="bg-[#3B82F6]/20" />
            <StatCard title="Today" value={todayCount} subtitle="Scheduled for today" icon={<Clock className="w-4 h-4 text-[#F2A900]" />} iconBg="bg-[#F2A900]/20" />
            <StatCard title="Completed" value={completedCount} subtitle="This month" icon={<CheckCircle2 className="w-4 h-4 text-[#10B981]" />} iconBg="bg-[#10B981]/20" />
            <StatCard title="Overdue" value={overdueCount} subtitle="Requires attention" icon={<Ban className="w-4 h-4 text-[#EF4444]" />} iconBg="bg-[#EF4444]/20" />
            <StatCard title="Total Spent" value={formatMoneyPeso(24850)} subtitle="This month" icon={<DollarSign className="w-4 h-4 text-[#8B5CF6]" />} iconBg="bg-[#8B5CF6]/20" />
          </div>

          <div className="data-card p-3">
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.7fr)_repeat(3,minmax(0,1fr))_minmax(0,1.2fr)_auto] gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#88888C]" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by equipment, service type..."
                  className="h-9 pl-8 bg-[#1A1A20] border-white/10 text-xs text-[#EAEAEA]"
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 bg-[#1A1A20] border-white/10 text-xs text-[#EAEAEA]">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent className="bg-[#1A1A20] border-white/10">
                  <SelectItem value="all">All Status</SelectItem>
                  {STATUS_ORDER.map((status) => (
                    <SelectItem key={status} value={status}>{status.replace("_", " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={equipmentFilter} onValueChange={setEquipmentFilter}>
                <SelectTrigger className="h-9 bg-[#1A1A20] border-white/10 text-xs text-[#EAEAEA]">
                  <SelectValue placeholder="All Equipment" />
                </SelectTrigger>
                <SelectContent className="bg-[#1A1A20] border-white/10">
                  <SelectItem value="all">All Equipment</SelectItem>
                  {clientEquipment.map((eq) => (
                    <SelectItem key={eq.id} value={String(eq.id)}>{eq.unitId}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={serviceTypeFilter} onValueChange={setServiceTypeFilter}>
                <SelectTrigger className="h-9 bg-[#1A1A20] border-white/10 text-xs text-[#EAEAEA]">
                  <SelectValue placeholder="All Service Types" />
                </SelectTrigger>
                <SelectContent className="bg-[#1A1A20] border-white/10">
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
                  className="h-9 bg-[#1A1A20] border border-white/10 rounded px-3 flex items-center gap-2 text-xs text-[#EAEAEA] whitespace-nowrap w-full justify-between hover:bg-white/5"
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
                    <div className="absolute right-0 top-11 z-50 bg-[#0A0A0C] border border-white/10 rounded p-3 space-y-2 shadow-xl w-[260px]">
                      <div>
                        <label className="text-[10px] uppercase tracking-wider text-[#88888C] mb-1 block">From</label>
                        <Input
                          type="date"
                          value={fromDate}
                          onChange={(e) => setFromDate(e.target.value)}
                          className="h-9 bg-[#1A1A20] border-white/10 text-xs text-[#EAEAEA]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-wider text-[#88888C] mb-1 block">To</label>
                        <Input
                          type="date"
                          value={toDate}
                          onChange={(e) => setToDate(e.target.value)}
                          className="h-9 bg-[#1A1A20] border-white/10 text-xs text-[#EAEAEA]"
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
                          className="flex-1 h-9 border-white/10 text-[#88888C]"
                        >
                          Clear
                        </Button>
                        <Button
                          type="button"
                          onClick={() => setDatePickerOpen(false)}
                          className="flex-1 h-9 bg-[#F2A900] hover:bg-[#F2A900]/80 text-[#050505] font-bold"
                        >
                          Apply
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <Button className="h-9 bg-white/5 hover:bg-white/10 text-[#EAEAEA]">
                <Filter className="w-3.5 h-3.5 mr-1" />
                Filters
              </Button>
            </div>
          </div>

          <div className="data-card p-3 xl:h-[433px] flex flex-col">
            <div className="flex flex-wrap gap-3 border-b border-white/10 pb-2 mb-2">
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
                    activeTab === key ? "text-[#F2A900] border-[#F2A900]" : "text-[#88888C] border-transparent hover:text-[#EAEAEA]"
                  }`}
                >
                  {label} <span className="ml-1 text-[10px]">{tabCounts[key]}</span>
                </button>
              ))}
            </div>

            <div className="flex-1 min-h-0 overflow-auto">
              <table className="w-full min-w-[1100px] text-xs">
                <thead className="sticky top-0 z-10 bg-[#0A0A0C]">
                  <tr className="border-b border-white/10">
                    <th className="text-left py-2 px-2 text-[10px] uppercase tracking-wider text-[#88888C]">Booking ID</th>
                    <th className="text-left py-2 px-2 text-[10px] uppercase tracking-wider text-[#88888C]">Equipment</th>
                    <th className="text-left py-2 px-2 text-[10px] uppercase tracking-wider text-[#88888C]">Service Type</th>
                    <th className="text-left py-2 px-2 text-[10px] uppercase tracking-wider text-[#88888C]">Date &amp; Time</th>
                    <th className="text-left py-2 px-2 text-[10px] uppercase tracking-wider text-[#88888C]">Technician</th>
                    <th className="text-left py-2 px-2 text-[10px] uppercase tracking-wider text-[#88888C]">Status</th>
                    <th className="text-left py-2 px-2 text-[10px] uppercase tracking-wider text-[#88888C]">Package / Type</th>
                    <th className="text-left py-2 px-2 text-[10px] uppercase tracking-wider text-[#88888C]">Current / Next PMS</th>
                    <th className="text-left py-2 px-2 text-[10px] uppercase tracking-wider text-[#88888C]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBookings.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-10 text-center text-[#88888C]">
                        <Package className="w-6 h-6 mx-auto mb-2" />
                        No bookings found
                      </td>
                    </tr>
                  )}

                  {filteredBookings.map((item) => {
                    const transitions = actionTransitions[item.status];
                    const isStartVisible = item.status === "in_progress" || item.status === "confirmed" || item.status === "scheduled";
                    return (
                      <tr key={item.booking.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors duration-150">
                        <td className="py-2 px-2">
                          <div className="font-mono text-[#EAEAEA] font-semibold">{formatBookingId(item.booking.id, item.booking.requestedDate)}</div>
                          <div className="text-[10px] text-[#88888C]">{formatDate(item.booking.createdAt)}</div>
                        </td>

                        <td className="py-2 px-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded bg-[#1A1A20] border border-white/10 flex items-center justify-center">
                              <Wrench className="w-3.5 h-3.5 text-[#005F73]" />
                            </div>
                            <div>
                              <div className="text-[#EAEAEA] font-mono font-semibold">{item.equipment?.unitId ?? "—"}</div>
                              <div className="text-[10px] text-[#88888C]">SN: {item.equipment?.serialNumber ?? "—"}</div>
                              <div className="text-[10px] text-[#88888C]">Client: {user?.name ?? "Client"}</div>
                            </div>
                          </div>
                        </td>

                        <td className="py-2 px-2">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${SERVICE_COLORS[item.booking.serviceType]}`}>
                            {formatServiceType(item.booking.serviceType)}
                          </span>
                          <div className="text-[10px] text-[#88888C] mt-1">{item.booking.serviceType === "pms" ? "(1000 hrs)" : "One-time"}</div>
                        </td>

                        <td className="py-2 px-2">
                          <div className="flex items-center gap-1 text-[#EAEAEA]"><Calendar className="w-3 h-3" />{formatDate(item.booking.requestedDate)}</div>
                          <div className="flex items-center gap-1 text-[10px] text-[#88888C] mt-1"><Clock className="w-3 h-3" />{getDisplayTime(item.booking.preferredTime)}</div>
                        </td>

                        <td className="py-2 px-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-semibold ${getTechColor(item.technician)}`}>
                              {getInitials(item.technician)}
                            </div>
                            <span className="text-[#EAEAEA]">{item.technician}</span>
                          </div>
                        </td>

                        <td className="py-2 px-2">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold capitalize ${STATUS_COLORS[item.status]}`}>
                            {item.status.replace("_", " ")}
                          </span>
                        </td>

                        <td className="py-2 px-2">
                          <div className="flex items-center gap-1 text-[#EAEAEA]"><Package className="w-3.5 h-3.5 text-[#8B5CF6]" />{PACKAGE_LABELS[item.packageType]}</div>
                          <div className="text-[10px] text-[#88888C] mt-1">{item.packageType === "repair_6" ? "(6 visits)" : item.packageType === "pms_1000" ? "(1000 hrs)" : "One-time"}</div>
                        </td>

                        <td className="py-2 px-2">
                          <div className={`font-semibold ${getHoursState(item.currentHours, item.nextPms)}`}>{item.currentHours.toLocaleString()} hrs</div>
                          <div className="text-[10px] text-[#88888C]">Next: {item.nextPms.toLocaleString()} hrs</div>
                        </td>

                        <td className="py-2 px-2">
                          <div className="flex items-center gap-1 relative">
                            <Button size="icon-sm" variant="outline" className="h-7 w-7 border-white/10 text-[#88888C] hover:text-[#EAEAEA]">
                              <Eye className="w-3.5 h-3.5" />
                            </Button>

                            {isStartVisible && (
                              <Button
                                size="sm"
                                className="h-7 px-2 bg-[#005F73] hover:bg-[#005F73]/80 text-[#EAEAEA]"
                                onClick={() => setBookingStatus(item.booking, item.status === "in_progress" ? "completed" : "in_progress")}
                              >
                                {item.status === "in_progress" ? <Check className="w-3 h-3 mr-1" /> : <Play className="w-3 h-3 mr-1" />}
                                {item.status === "in_progress" ? "Complete" : "Start"}
                              </Button>
                            )}

                            <Button
                              size="icon-sm"
                              variant="outline"
                              className="h-7 w-7 border-white/10 text-[#88888C] hover:text-[#EAEAEA]"
                              onClick={() => setOpenActionMenuFor(openActionMenuFor === item.booking.id ? null : item.booking.id)}
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </Button>

                            {openActionMenuFor === item.booking.id && (
                              <div className="absolute right-0 top-8 w-40 rounded border border-white/10 bg-[#0A0A0C] p-1 z-20">
                                <button className="w-full text-left px-2 py-1 text-xs text-[#EAEAEA] hover:bg-white/5 rounded">View Details</button>
                                <button
                                  className="w-full text-left px-2 py-1 text-xs text-[#EAEAEA] hover:bg-white/5 rounded"
                                  onClick={() => openReschedule(item.booking)}
                                >
                                  Reschedule
                                </button>
                                <button
                                  className="w-full text-left px-2 py-1 text-xs text-[#EAEAEA] hover:bg-white/5 rounded"
                                  onClick={() => {
                                    setBookingStatus(item.booking, "cancelled");
                                    setOpenActionMenuFor(null);
                                  }}
                                >
                                  Cancel Booking
                                </button>
                                {transitions.map((nextStatus) => (
                                  <button
                                    key={nextStatus}
                                    className="w-full text-left px-2 py-1 text-xs text-[#EAEAEA] hover:bg-white/5 rounded capitalize"
                                    onClick={() => {
                                      setBookingStatus(item.booking, nextStatus);
                                      setOpenActionMenuFor(null);
                                    }}
                                  >
                                    Mark {nextStatus.replace("_", " ")}
                                  </button>
                                ))}
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
            <div className="text-sm font-semibold text-[#EAEAEA]">Schedule Calendar</div>
            <div className="mt-2 flex items-center justify-between text-xs text-[#88888C]">
              <button onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}>
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span>{calendarMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</span>
              <button onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-7 mt-2 text-[10px] text-[#88888C]">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d} className="text-center py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1 mt-1">
              {calendarDays.map((cell, index) => (
                <div key={`day-${index}`} className="h-8 rounded border border-white/5 flex flex-col items-center justify-center text-[10px]">
                  {cell.day && (
                    <>
                      <span className={cell.isToday ? "text-[#050505] bg-[#F2A900] px-1 rounded" : "text-[#EAEAEA]"}>{cell.day}</span>
                      <span className="flex gap-0.5 mt-0.5">
                        {cell.hasUpcoming && <span className="w-1 h-1 rounded bg-[#3B82F6]" />}
                        {cell.hasOverdue && <span className="w-1 h-1 rounded bg-[#EF4444]" />}
                      </span>
                    </>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-2 flex items-center gap-3 text-[10px] text-[#88888C]">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-[#F2A900]" />Today</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-[#3B82F6]" />{upcoming.length} Upcoming</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-[#EF4444]" />{overdueCount} Overdue</span>
            </div>
          </div>

          <div className="data-card p-3 flex flex-col flex-0.5">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-[#EAEAEA]">Upcoming Bookings</div>
              <button className="text-xs text-[#3B82F6] hover:text-[#EAEAEA] transition-colors duration-150">View all</button>
            </div>
            <div className="mt-2 space-y-2 flex flex-col flex-1">
              {miniUpcoming.map((item) => (
                <div key={`mini-${item.booking.id}`} className="p-2 rounded border border-white/10 bg-[#1A1A20]">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-xs text-[#EAEAEA] font-semibold">{item.equipment?.unitId}</div>
                      <div className="text-[10px] text-[#88888C]">{formatServiceType(item.booking.serviceType)}</div>
                      <div className="text-[10px] text-[#88888C]">{formatDate(item.booking.requestedDate)} · {getDisplayTime(item.booking.preferredTime)}</div>
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
          <div className="text-sm font-semibold text-[#EAEAEA]">Booking Status Overview</div>
          <div className="text-[10px] text-[#88888C]">This month</div>
          <div className="mt-4 flex items-center justify-center gap-8">
            <svg width="160" height="160" viewBox="0 0 144 144" className="flex-shrink-0">
              <circle cx="72" cy="72" r="46" fill="none" stroke="#1A1A20" strokeWidth="16" />
              {donutSegments.map((segment) => (
                <path key={segment.status} d={segment.path} stroke={segment.color} strokeWidth="16" fill="none" strokeLinecap="butt" />
              ))}
              <text
                x="72" y="65"
                textAnchor="middle"
                fill="#88888C"
                fontSize="11"
                fontFamily="inherit"
              >Total</text>
              <text
                x="72" y="85"
                textAnchor="middle"
                fill="#EAEAEA"
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
                ["Cancelled", statusBreakdown.cancelled, "#88888C"],
              ].map(([label, count, color]) => {
                const pct = enrichedBookings.length > 0 ? Math.round((Number(count) / enrichedBookings.length) * 100) : 0;
                return (
                  <div key={String(label)} className="flex items-center justify-between gap-4 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: String(color) }} />
                      <span className="text-[#EAEAEA]">{label}</span>
                    </div>
                    <span className="text-[#88888C] font-medium">{count} ({pct}%)</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="data-card p-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-[#EAEAEA]">Recent Activity</div>
            <button className="text-xs text-[#3B82F6] hover:text-[#EAEAEA] transition-colors duration-150">View all</button>
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
                    <div className="text-xs text-[#EAEAEA]">{cfg.getMessage(bookingId, equipType)}</div>
                    <div className="text-[10px] text-[#88888C] mt-0.5">
                      {formatDate(item.bookingDate.toISOString())} · {getDisplayTime(item.booking.preferredTime)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="data-card p-3">
          <div className="text-sm font-semibold text-[#EAEAEA]">Quick Actions</div>
          <div className="mt-3 space-y-2">
            <button onClick={() => setBookingModalOpen(true)} className="w-full text-left p-2 rounded border border-white/10 hover:bg-white/5 transition-colors duration-150">
              <div className="flex items-center gap-2"><PenSquare className="w-4 h-4 text-[#F2A900]" /><span className="text-xs text-[#EAEAEA] font-semibold">Book New Service</span></div>
              <div className="text-[10px] text-[#88888C] mt-1">Schedule a service for your equipment</div>
            </button>
            <button onClick={() => setBookingModalOpen(true)} className="w-full text-left p-2 rounded border border-white/10 hover:bg-white/5 transition-colors duration-150">
              <div className="flex items-center gap-2"><Ban className="w-4 h-4 text-[#EF4444]" /><span className="text-xs text-[#EAEAEA] font-semibold">Request Emergency Service</span></div>
              <div className="text-[10px] text-[#88888C] mt-1">Need urgent assistance? Let us know</div>
            </button>
            <button className="w-full text-left p-2 rounded border border-white/10 hover:bg-white/5 transition-colors duration-150">
              <div className="flex items-center gap-2"><Download className="w-4 h-4 text-[#10B981]" /><span className="text-xs text-[#EAEAEA] font-semibold">Download Service Report</span></div>
              <div className="text-[10px] text-[#88888C] mt-1">Access your service reports and records</div>
            </button>
            <button className="w-full text-left p-2 rounded border border-white/10 hover:bg-white/5 transition-colors duration-150">
              <div className="flex items-center gap-2"><Headset className="w-4 h-4 text-[#3B82F6]" /><span className="text-xs text-[#EAEAEA] font-semibold">Contact Support</span></div>
              <div className="text-[10px] text-[#88888C] mt-1">Get help from our support team</div>
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
          <div className="text-[10px] text-[#88888C] uppercase tracking-wider">{title}</div>
          <div className="text-2xl font-bold text-[#EAEAEA] mt-1">{value}</div>
          <div className="text-[10px] text-[#88888C] mt-1">{subtitle}</div>
        </div>
        <div className={`w-8 h-8 rounded flex items-center justify-center ${iconBg}`}>{icon}</div>
      </div>
    </div>
  );
}
