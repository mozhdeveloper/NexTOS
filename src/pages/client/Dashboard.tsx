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

  const serviceDueCount = clientEquipment.filter((e) => e.currentHours >= e.nextServiceDue).length;

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
      const key = item.serviceType;
      counts.set(key, (counts.get(key) || 0) + 1);
    });

    return Array.from(counts.entries()).map(([name, value]) => ({
      name: name.toUpperCase(),
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

        <div className="data-card p-4">
          <h3 className="text-base font-semibold text-[#EAEAEA] mb-1">Invoice Status</h3>
          <p className="text-xs text-[#88888C] mb-3">Payment distribution</p>
          <ResponsiveContainer width="100%" height={170}>
            <PieChart>
              <Pie data={invoiceStatusData} dataKey="value" cx="50%" cy="50%" innerRadius={36} outerRadius={65} paddingAngle={3}>
                {invoiceStatusData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "#1E1E22",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 4,
                  fontSize: 12,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-3 mt-2">
            {invoiceStatusData.map((item) => (
              <div key={item.name} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                <span className="text-[10px] text-[#88888C]">{item.name}</span>
              </div>
            ))}
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
              <XAxis dataKey="name" stroke="#88888C" fontSize={11} />
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
                    <span className="text-[10px] text-[#005F73] uppercase">{booking.serviceType}</span>
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
