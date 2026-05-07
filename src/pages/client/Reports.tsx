import { useMemo } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import { useOperationsStore } from "@/stores/useOperationsStore";
import { useBillingStore } from "@/stores/useBillingStore";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
} from "recharts";
import { Calendar, FileText, Wrench, DollarSign, Activity, FlaskConical, ClipboardList } from "lucide-react";

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

export default function ClientReports() {
  const { user } = useAuthStore();
  const { equipment, serviceRecords, bookings } = useOperationsStore();
  const { invoices } = useBillingStore();

  const clientId = user?.clientId || 1;

  const clientEquipment = equipment.filter((e) => e.clientId === clientId);
  const clientServices = serviceRecords.filter((r) => r.clientId === clientId);
  const clientBookings = bookings.filter((b) => b.clientId === clientId);
  const clientInvoices = invoices.filter((i) => i.clientId === clientId);

  const openInvoices = clientInvoices.filter((i) => i.status !== "paid");
  const paidInvoices = clientInvoices.filter((i) => i.status === "paid");

  const monthlyFinanceData = useMemo(() => {
    const months = Array.from({ length: 6 }).map((_, index) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - index));
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      return { key, label: monthLabelFromKey(key), billed: 0, paid: 0 };
    });

    const monthMap = new Map(months.map((m) => [m.key, m]));

    clientInvoices.forEach((invoice) => {
      const billedMonth = monthMap.get(monthKey(invoice.createdAt));
      if (billedMonth) {
        billedMonth.billed += invoice.total;
      }

      if (invoice.paidDate) {
        const paidMonth = monthMap.get(monthKey(invoice.paidDate));
        if (paidMonth) {
          paidMonth.paid += invoice.total;
        }
      }
    });

    return months.map((m) => ({ month: m.label, billed: m.billed, paid: m.paid }));
  }, [clientInvoices]);

  const monthlyOpsData = useMemo(() => {
    const months = Array.from({ length: 6 }).map((_, index) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - index));
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      return { key, label: monthLabelFromKey(key), bookings: 0, services: 0 };
    });

    const monthMap = new Map(months.map((m) => [m.key, m]));

    clientBookings.forEach((b) => {
      const month = monthMap.get(monthKey(b.requestedDate));
      if (month) {
        month.bookings += 1;
      }
    });

    clientServices.forEach((s) => {
      const sourceDate = s.completedDate || s.scheduledDate;
      const month = monthMap.get(monthKey(sourceDate));
      if (month) {
        month.services += 1;
      }
    });

    return months.map((m) => ({ month: m.label, bookings: m.bookings, services: m.services }));
  }, [clientBookings, clientServices]);

  const pmsReport = useMemo(() => {
    return clientEquipment.filter(e => e.equipmentType === "Heavy Equipment").map(e => {
        const remaining = e.nextPMSHours - e.currentHours;
        return {
            unit: e.unitId,
            current: e.currentHours,
            next: e.nextPMSHours,
            remaining: remaining,
            status: remaining <= 0 ? "Overdue" : remaining <= 50 ? "Near Service" : "OK"
        };
    });
  }, [clientEquipment]);

  const calibrationReport = useMemo(() => {
    return clientEquipment.filter(e => e.equipmentType === "Lab Equipment" || e.equipmentType === "Testing Equipment").map(e => {
        const nextDate = e.nextCalibrationDate ? new Date(e.nextCalibrationDate) : null;
        const diffDays = nextDate ? Math.ceil((nextDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null;
        return {
            unit: e.unitId,
            last: e.lastCalibrationDate ? new Date(e.lastCalibrationDate).toLocaleDateString() : "—",
            next: e.nextCalibrationDate ? new Date(e.nextCalibrationDate).toLocaleDateString() : "—",
            remaining: diffDays,
            status: diffDays === null ? "—" : diffDays <= 0 ? "Overdue" : diffDays <= 15 ? "Due Soon" : "OK"
        };
    });
  }, [clientEquipment]);

  const testingReport = useMemo(() => {
    return clientServices.filter(s => s.serviceCategory === "Lab Testing Service").map(s => {
        return {
            type: s.testType || "—",
            project: s.projectName || "—",
            sample: s.sampleName || "—",
            requested: new Date(s.scheduledDate).toLocaleDateString(),
            status: s.labStatus || "—",
            result: s.reportAttachment ? "View Report" : "Pending"
        };
    });
  }, [clientServices]);

  return (
    <div className="space-y-4 px-8 pt-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[32px] font-bold text-[#EAEAEA] tracking-[-0.02em]">Reports</h1>
          <p className="text-sm text-[#88888C] mt-0.5">Operational and billing insights for your account</p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-[#005F73]/10 border border-[#005F73]/20">
          <Calendar className="w-3 h-3 text-[#005F73]" />
          <span className="text-xs text-[#005F73] font-medium">Last 6 Months</span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard label="Total Invoices" value={`${clientInvoices.length}`} hint={`${paidInvoices.length} paid`} icon={FileText} />
        <MetricCard label="Outstanding" value={`$${openInvoices.reduce((s, i) => s + i.total, 0).toFixed(2)}`} hint={`${openInvoices.length} unpaid`} icon={DollarSign} />
        <MetricCard label="Service Records" value={`${clientServices.length}`} hint="Completed + in progress" icon={Wrench} />
        <MetricCard label="Managed Equipment" value={`${clientEquipment.length}`} hint="Tracked assets" icon={Calendar} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="data-card p-4">
          <h3 className="text-base font-semibold text-[#EAEAEA] mb-1">Billing Trend</h3>
          <p className="text-xs text-[#88888C] mb-3">Billed vs paid amounts by month</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyFinanceData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A2A30" />
              <XAxis dataKey="month" stroke="#88888C" fontSize={11} />
              <YAxis stroke="#88888C" fontSize={11} />
              <Tooltip
                formatter={(value: number) => [`$${value.toFixed(2)}`, "Amount"]}
                contentStyle={{
                  background: "#1E1E22",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 4,
                  fontSize: 12,
                }}
              />
              <Bar dataKey="billed" fill="#F2A900" radius={[2, 2, 0, 0]} />
              <Bar dataKey="paid" fill="#10B981" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="data-card p-4">
          <h3 className="text-base font-semibold text-[#EAEAEA] mb-1">Operational Trend</h3>
          <p className="text-xs text-[#88888C] mb-3">Booking requests vs services completed</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={monthlyOpsData}>
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
              <Line type="monotone" dataKey="bookings" stroke="#F2A900" strokeWidth={2} dot={{ fill: "#F2A900", r: 3 }} />
              <Line type="monotone" dataKey="services" stroke="#005F73" strokeWidth={2} dot={{ fill: "#005F73", r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Equipment PMS Hours Report */}
      <div className="data-card overflow-auto">
        <div className="p-3 border-b border-white/5 flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#005F73]" />
          <h3 className="text-sm font-semibold text-[#EAEAEA]">Equipment PMS Hours Report</h3>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-[#0A0A0C]">
              <th className="text-left py-2.5 px-3 text-[#88888C] font-medium">Equipment</th>
              <th className="text-left py-2.5 px-3 text-[#88888C] font-medium">Current Hours</th>
              <th className="text-left py-2.5 px-3 text-[#88888C] font-medium">Next PMS</th>
              <th className="text-left py-2.5 px-3 text-[#88888C] font-medium">Remaining</th>
              <th className="text-left py-2.5 px-3 text-[#88888C] font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {pmsReport.map((row, idx) => (
                <tr key={idx} className="border-b border-[#2A2A30]">
                  <td className="py-2.5 px-3 text-[#EAEAEA] font-mono-tech">{row.unit}</td>
                  <td className="py-2.5 px-3 text-[#88888C]">{row.current}h</td>
                  <td className="py-2.5 px-3 text-[#88888C]">{row.next}h</td>
                  <td className={`py-2.5 px-3 font-mono-tech ${row.remaining <= 0 ? "text-[#EF4444]" : "text-[#88888C]"}`}>{row.remaining}h</td>
                  <td className="py-2.5 px-3">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${row.status === "OK" ? "bg-[#10B981]/20 text-[#10B981]" : row.status === "Near Service" ? "bg-[#F2A900]/20 text-[#F2A900]" : "bg-[#EF4444]/20 text-[#EF4444]"}`}>
                        {row.status}
                    </span>
                  </td>
                </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Calibration PMS Report */}
      <div className="data-card overflow-auto">
        <div className="p-3 border-b border-white/5 flex items-center gap-2">
          <FlaskConical className="w-4 h-4 text-[#F2A900]" />
          <h3 className="text-sm font-semibold text-[#EAEAEA]">Calibration PMS Report</h3>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-[#0A0A0C]">
              <th className="text-left py-2.5 px-3 text-[#88888C] font-medium">Lab Equipment</th>
              <th className="text-left py-2.5 px-3 text-[#88888C] font-medium">Last Calibration</th>
              <th className="text-left py-2.5 px-3 text-[#88888C] font-medium">Next Calibration</th>
              <th className="text-left py-2.5 px-3 text-[#88888C] font-medium">Days Remaining</th>
              <th className="text-left py-2.5 px-3 text-[#88888C] font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {calibrationReport.map((row, idx) => (
                <tr key={idx} className="border-b border-[#2A2A30]">
                  <td className="py-2.5 px-3 text-[#EAEAEA] font-mono-tech">{row.unit}</td>
                  <td className="py-2.5 px-3 text-[#88888C]">{row.last}</td>
                  <td className="py-2.5 px-3 text-[#88888C]">{row.next}</td>
                  <td className={`py-2.5 px-3 font-mono-tech ${(row.remaining ?? 1) <= 0 ? "text-[#EF4444]" : "text-[#88888C]"}`}>{row.remaining ?? "—"}</td>
                  <td className="py-2.5 px-3">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${row.status === "OK" ? "bg-[#10B981]/20 text-[#10B981]" : row.status === "Due Soon" ? "bg-[#F2A900]/20 text-[#F2A900]" : "bg-[#EF4444]/20 text-[#EF4444]"}`}>
                        {row.status}
                    </span>
                  </td>
                </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Lab Testing Report */}
      <div className="data-card overflow-auto">
        <div className="p-3 border-b border-white/5 flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-[#005F73]" />
          <h3 className="text-sm font-semibold text-[#EAEAEA]">Lab Testing Report</h3>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-[#0A0A0C]">
              <th className="text-left py-2.5 px-3 text-[#88888C] font-medium">Test Type</th>
              <th className="text-left py-2.5 px-3 text-[#88888C] font-medium">Project / Sample</th>
              <th className="text-left py-2.5 px-3 text-[#88888C] font-medium">Date Requested</th>
              <th className="text-left py-2.5 px-3 text-[#88888C] font-medium">Status</th>
              <th className="text-left py-2.5 px-3 text-[#88888C] font-medium">Result / Report</th>
            </tr>
          </thead>
          <tbody>
            {testingReport.map((row, idx) => (
                <tr key={idx} className="border-b border-[#2A2A30]">
                  <td className="py-2.5 px-3 text-[#EAEAEA] font-bold">{row.type}</td>
                  <td className="py-2.5 px-3">
                    <div className="text-[#EAEAEA]">{row.project}</div>
                    <div className="text-[10px] text-[#88888C]">Sample: {row.sample}</div>
                  </td>
                  <td className="py-2.5 px-3 text-[#88888C]">{row.requested}</td>
                  <td className="py-2.5 px-3">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${row.status === "Released" ? "bg-[#10B981]/20 text-[#10B981]" : "bg-[#F2A900]/20 text-[#F2A900]"}`}>
                        {row.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    {row.result === "View Report" ? (
                        <button className="flex items-center gap-1 text-[#005F73] hover:underline font-bold">
                            <FileText className="w-3 h-3" /> View Report
                        </button>
                    ) : (
                        <span className="text-[#88888C] italic">{row.result}</span>
                    )}
                  </td>
                </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint: string;
  icon: React.ElementType;
}) {
  return (
    <div className="data-card p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-[#88888C] uppercase tracking-wider">{label}</span>
        <Icon className="w-4 h-4 text-[#88888C]" />
      </div>
      <div className="text-3xl font-bold text-[#EAEAEA]">{value}</div>
      <div className="text-[10px] text-[#88888C] mt-1">{hint}</div>
    </div>
  );
}
