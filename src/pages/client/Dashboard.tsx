import { useMemo } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import { useCRMStore } from "@/stores/useCRMStore";
import { useOperationsStore } from "@/stores/useOperationsStore";
import { useBillingStore } from "@/stores/useBillingStore";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Monitor,
  Calendar,
  DollarSign,
  ShieldCheck,
  Clock3,
  Wrench,
  AlertTriangle,
} from "lucide-react";

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

function monthKey(dateISO: string) {
  const d = new Date(dateISO);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabelFromKey(key: string) {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, {
    month: "short",
  });
}

export default function ClientDashboard() {
  const { user } = useAuthStore();
  const { clients } = useCRMStore();
  const { equipment, serviceRecords, bookings } = useOperationsStore();
  const { invoices } = useBillingStore();

  const clientId = user?.clientId || 1;
  const client = clients.find((c) => c.id === clientId);

  const clientEquipment = equipment.filter((e) => e.clientId === clientId);
  const clientBookings = bookings.filter((b) => b.clientId === clientId);
  const clientServices = serviceRecords.filter((s) => s.clientId === clientId);
  const clientInvoices = invoices.filter((i) => i.clientId === clientId);

  const now = new Date();

  const upcomingBookings = clientBookings
    .filter((b) => getBookingEndDate(b) >= now)
    .sort((a, b) => new Date(a.requestedDate).getTime() - new Date(b.requestedDate).getTime());

  const overdueBookings = clientBookings.filter((b) => getBookingEndDate(b) < now && b.status !== "completed").length;

  const serviceDueCount = clientEquipment.filter((e) => {
    const hoursDue = e.equipmentType === "Heavy Equipment" && e.nextPMSHours > 0 && e.currentHours >= e.nextPMSHours;
    const calibrationDue = (e.equipmentType === "Lab Equipment" || e.equipmentType === "Testing Equipment") && 
                          e.nextCalibrationDate && new Date(e.nextCalibrationDate) <= now;
    return hoursDue || calibrationDue;
  }).length;

  const alerts = useMemo(() => {
    const heavy: string[] = [];
    const calibration: string[] = [];
    
    clientEquipment.forEach(e => {
      if (e.equipmentType === "Heavy Equipment" && e.nextPMSHours > 0) {
        const remaining = e.nextPMSHours - e.currentHours;
        if (remaining <= 50 && remaining > 0) {
          heavy.push(`${e.unitId} (${e.model}) has ${remaining} hours left before PMS`);
        } else if (remaining <= 0) {
          heavy.push(`${e.unitId} (${e.model}) is OVERDUE for PMS by ${Math.abs(remaining)} hours`);
        }
      }
      if ((e.equipmentType === "Lab Equipment" || e.equipmentType === "Testing Equipment") && e.nextCalibrationDate) {
        const nextDate = new Date(e.nextCalibrationDate);
        const diffTime = nextDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays <= 15 && diffDays > 0) {
          calibration.push(`${e.unitId} calibration due in ${diffDays} days`);
        } else if (diffDays <= 0) {
          calibration.push(`${e.unitId} calibration is OVERDUE by ${Math.abs(diffDays)} days`);
        }
      }
    });
    return { heavy, calibration };
  }, [clientEquipment, now]);

  const activeLabTests = useMemo(() => {
    return clientServices.filter(s => s.serviceCategory === "Lab Testing Service" && s.status !== "completed");
  }, [clientServices]);

  const unpaidInvoices = clientInvoices.filter((i) => i.status !== "paid");
  const outstandingBalance = unpaidInvoices.reduce((sum, i) => sum + i.total, 0);

  const serviceTrendData = useMemo(() => {
    const months = Array.from({ length: 6 }).map((_, index) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - index));
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      return { key, label: monthLabelFromKey(key), completed: 0, booked: 0 };
    });

    const monthMap = new Map(months.map((m) => [m.key, m]));

    clientServices.forEach((record) => {
      const sourceDate = record.completedDate || record.scheduledDate;
      const key = monthKey(sourceDate);
      const month = monthMap.get(key);
      if (month) {
        month.completed += 1;
      }
    });

    clientBookings.forEach((booking) => {
      const key = monthKey(booking.requestedDate);
      const month = monthMap.get(key);
      if (month) {
        month.booked += 1;
      }
    });

    return months.map((m) => ({ month: m.label, completed: m.completed, booked: m.booked }));
  }, [clientBookings, clientServices]);

  const serviceTypeData = useMemo(() => {
    const counts = new Map<string, number>();

    [...clientBookings, ...clientServices].forEach((item) => {
      const key = item.serviceCategory;
      counts.set(key, (counts.get(key) || 0) + 1);
    });

    return Array.from(counts.entries()).map(([name, value]) => ({
      name: name,
      value,
    }));
  }, [clientBookings, clientServices]);

  const invoiceStatusData = useMemo(() => {
    const paid = clientInvoices.filter((i) => i.status === "paid").length;
    const sent = clientInvoices.filter((i) => i.status === "sent").length;
    const overdue = clientInvoices.filter((i) => i.status === "overdue").length;

    return [
      { name: "Paid", value: paid, color: "#10B981" },
      { name: "Sent", value: sent, color: "#F2A900" },
      { name: "Overdue", value: overdue, color: "#EF4444" },
    ];
  }, [clientInvoices]);

  return (
    <div className="space-y-4 px-8 pt-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[32px] font-bold text-[#EAEAEA] tracking-[-0.02em]">Dashboard</h1>
          <p className="text-sm text-[#88888C] mt-0.5">
            {client?.companyName || "Your account"} overview and operational health
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#005F73]/10 border border-[#005F73]/20">
          <ShieldCheck className="w-3.5 h-3.5 text-[#005F73]" />
          <span className="text-xs text-[#005F73] font-medium">Client Command View</span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Active Equipment" value={`${clientEquipment.length}`} hint="Units under coverage" icon={Monitor} accent="text-[#EAEAEA]" />
        <KpiCard label="Upcoming Bookings" value={`${upcomingBookings.length}`} hint={`${overdueBookings} past due`} icon={Calendar} accent="text-[#F2A900]" />
        <KpiCard label="Outstanding" value={`$${outstandingBalance.toFixed(2)}`} hint={`${unpaidInvoices.length} unpaid invoices`} icon={DollarSign} accent="text-[#F2A900]" />
        <KpiCard label="Service Due" value={`${serviceDueCount}`} hint="Assets requiring attention" icon={Wrench} accent={serviceDueCount > 0 ? "text-[#EF4444]" : "text-[#10B981]"} />
      </div>

      {(alerts.heavy.length > 0 || alerts.calibration.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {alerts.heavy.length > 0 && (
            <div className="data-card p-3 border-l-4 border-[#EF4444] bg-[#EF4444]/5">
              <div className="flex items-center gap-2 mb-2">
                <Wrench className="w-4 h-4 text-[#EF4444]" />
                <h3 className="text-sm font-bold text-[#EF4444] uppercase tracking-wider">Heavy Equipment Alerts</h3>
              </div>
              <ul className="space-y-1">
                {alerts.heavy.map((alert, idx) => (
                  <li key={idx} className="text-[10px] text-[#EAEAEA] flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-[#EF4444]" />
                    {alert}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {alerts.calibration.length > 0 && (
            <div className="data-card p-3 border-l-4 border-[#F2A900] bg-[#F2A900]/5">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-[#F2A900]" />
                <h3 className="text-sm font-bold text-[#F2A900] uppercase tracking-wider">Calibration Alerts</h3>
              </div>
              <ul className="space-y-1">
                {alerts.calibration.map((alert, idx) => (
                  <li key={idx} className="text-[10px] text-[#EAEAEA] flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-[#F2A900]" />
                    {alert}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2 data-card p-4">
          <h3 className="text-base font-semibold text-[#EAEAEA] mb-1">Service Trend</h3>
          <p className="text-xs text-[#88888C] mb-3">Booked vs completed over the last 6 months</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={serviceTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A2A30" />
              <XAxis dataKey="month" stroke="#88888C" fontSize={11} />
              <YAxis stroke="#88888C" fontSize={11} />
              <Tooltip
                contentStyle={{
                  background: "#1E1E22",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 4,
                  fontSize: 12,
                }}
              />
              <Line type="monotone" dataKey="booked" stroke="#F2A900" strokeWidth={2} dot={{ fill: "#F2A900", r: 3 }} />
              <Line type="monotone" dataKey="completed" stroke="#10B981" strokeWidth={2} dot={{ fill: "#10B981", r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="data-card p-4 flex flex-col">
          <h3 className="text-base font-semibold text-[#EAEAEA] mb-1">Active Lab Tests</h3>
          <p className="text-xs text-[#88888C] mb-3">Live testing queue status</p>
          <div className="space-y-2 overflow-y-auto max-h-[180px] pr-1">
            {activeLabTests.map((test) => (
              <div key={test.id} className="p-2 rounded bg-[#1A1A20] border border-white/5">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-[10px] font-bold text-[#EAEAEA] truncate max-w-[120px]">{test.testType}</span>
                  <span className="text-[9px] px-1 py-0.5 rounded bg-[#005F73]/20 text-[#005F73] font-bold uppercase">{test.labStatus}</span>
                </div>
                <div className="text-[9px] text-[#88888C]">Proj: {test.projectName}</div>
              </div>
            ))}
            {activeLabTests.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center py-8 opacity-50">
                <Monitor className="w-8 h-8 text-[#2A2A30] mb-2" />
                <span className="text-[10px] text-[#88888C]">No active tests in queue</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2 data-card p-4">
          <h3 className="text-base font-semibold text-[#EAEAEA] mb-1">Service Mix</h3>
          <p className="text-xs text-[#88888C] mb-3">Most frequent requested/performed services</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={serviceTypeData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A2A30" />
              <XAxis dataKey="name" stroke="#88888C" fontSize={11} tick={{ fontSize: 9 }} />
              <YAxis stroke="#88888C" fontSize={11} />
              <Tooltip
                contentStyle={{
                  background: "#1E1E22",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 4,
                  fontSize: 12,
                }}
              />
              <Bar dataKey="value" fill="#005F73" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="data-card p-4">
          <h3 className="text-base font-semibold text-[#EAEAEA] mb-1">Next Up</h3>
          <p className="text-xs text-[#88888C] mb-3">Upcoming booking windows</p>
          <div className="space-y-2">
            {upcomingBookings.slice(0, 5).map((booking) => {
              const eq = clientEquipment.find((e) => e.id === booking.equipmentId);
              return (
                <div key={booking.id} className="rounded border border-white/10 bg-[#0A0A0C] p-2.5">
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] font-semibold text-[#EAEAEA]">{eq?.unitId || "—"}</div>
                    <span className="text-[9px] text-[#005F73] uppercase font-bold">{booking.serviceCategory}</span>
                  </div>
                  <div className="mt-1 text-[10px] text-[#88888C] flex items-center gap-1">
                    <Clock3 className="w-3 h-3" />
                    {new Date(booking.requestedDate).toLocaleDateString()} · {booking.preferredTime}
                  </div>
                </div>
              );
            })}
            {upcomingBookings.length === 0 && (
              <div className="text-xs text-[#88888C]">No upcoming bookings scheduled.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  hint: string;
  icon: React.ElementType;
  accent: string;
}) {
  return (
    <div className="data-card p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-[#88888C] uppercase tracking-wider">{label}</span>
        <Icon className="w-4 h-4 text-[#88888C]" />
      </div>
      <div className={`text-3xl font-bold ${accent}`}>{value}</div>
      <div className="text-[10px] text-[#88888C] mt-1">{hint}</div>
    </div>
  );
}
