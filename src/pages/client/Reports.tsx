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
  Cell,
} from "recharts";
import { 
  Calendar, 
  FileText, 
  Wrench, 
  DollarSign, 
  Activity, 
  FlaskConical, 
  ClipboardList, 
  CheckCircle2, 
  AlertTriangle, 
  Package 
} from "lucide-react";

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
  const { invoices, packages } = useBillingStore();

  const clientId = user?.clientId || 1;

  const clientEquipment = equipment.filter((e) => e.clientId === clientId);
  const clientServices = serviceRecords.filter((r) => r.clientId === clientId);
  const clientBookings = bookings.filter((b) => b.clientId === clientId);
  const clientInvoices = invoices.filter((i) => i.clientId === clientId);
  const clientPackages = packages.filter((p) => p.clientId === clientId);

  const now = new Date();

  // High Value KPIs
  const completedServices = clientServices.filter(s => s.status === "completed").length;
  
  const serviceDue = clientEquipment.filter(e => {
    if (e.equipmentType === "Heavy Equipment") {
        const remaining = e.nextPMSHours - e.currentHours;
        return remaining > 0 && remaining <= 50;
    }
    if (e.equipmentType === "Lab Equipment" || e.equipmentType === "Testing Equipment") {
        const nextDate = e.nextCalibrationDate ? new Date(e.nextCalibrationDate) : null;
        if (!nextDate) return false;
        const diffDays = Math.ceil((nextDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays > 0 && diffDays <= 15;
    }
    return false;
  }).length;

  const overdue = clientEquipment.filter(e => {
    if (e.equipmentType === "Heavy Equipment") {
        return e.nextPMSHours - e.currentHours <= 0;
    }
    if (e.equipmentType === "Lab Equipment" || e.equipmentType === "Testing Equipment") {
        const nextDate = e.nextCalibrationDate ? new Date(e.nextCalibrationDate) : null;
        if (!nextDate) return false;
        return nextDate <= now;
    }
    return false;
  }).length;

  const totalRevenue = clientInvoices.reduce((sum, i) => sum + i.total, 0);
  const activeSubs = clientPackages.filter(p => p.status === "active").length;

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

  const serviceStatusData = [
    { name: "Completed", value: completedServices, color: "#10B981" },
    { name: "Due Soon", value: serviceDue, color: "#F2A900" },
    { name: "Overdue", value: overdue, color: "#EF4444" },
  ];

  const serviceTypeData = useMemo(() => {
    const counts = new Map<string, number>();
    clientServices.forEach(s => {
      counts.set(s.serviceCategory, (counts.get(s.serviceCategory) || 0) + 1);
    });
    return Array.from(counts.entries()).map(([name, value]) => ({ name, value }));
  }, [clientServices]);

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
        const diffDays = nextDate ? Math.ceil((nextDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
        return {
            unit: e.unitId,
            last: e.lastCalibrationDate ? new Date(e.lastCalibrationDate).toLocaleDateString() : "—",
            next: e.nextCalibrationDate ? new Date(e.nextCalibrationDate).toLocaleDateString() : "—",
            remaining: diffDays,
            status: diffDays === null ? "—" : diffDays <= 0 ? "Overdue" : diffDays <= 15 ? "Due Soon" : "OK"
        };
    });
  }, [clientEquipment, now]);

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
          <h1 className="text-[32px] font-bold text-[#EAEAEA] tracking-[-0.02em]">Executive Reports</h1>
          <p className="text-sm text-[#88888C] mt-0.5">Fleet health, risk analysis, and service investment</p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-[#005F73]/10 border border-[#005F73]/20">
          <Calendar className="w-3 h-3 text-[#005F73]" />
          <span className="text-xs text-[#005F73] font-medium">Last 6 Months</span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <MetricCard label="Services Completed" value={`${completedServices}`} hint="Success rate: 100%" icon={CheckCircle2} accent="text-[#10B981]" />
        <MetricCard label="Services Due" value={`${serviceDue}`} hint="Action required soon" icon={Wrench} accent="text-[#F2A900]" />
        <MetricCard label="Services Overdue" value={`${overdue}`} hint="Critical risk assets" icon={AlertTriangle} accent="text-[#EF4444]" />
        <MetricCard label="Service Investment" value={`₱${totalRevenue.toLocaleString()}`} hint="Total billed to date" icon={DollarSign} accent="text-[#EAEAEA]" />
        <MetricCard label="Active Packages" value={`${activeSubs}`} hint={`${clientPackages.length} total assigned`} icon={Package} accent="text-[#005F73]" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="data-card p-4">
          <h3 className="text-base font-semibold text-[#EAEAEA] mb-1">Service Status Mix</h3>
          <p className="text-xs text-[#88888C] mb-3">Health distribution of your fleet</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={serviceStatusData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A2A30" />
              <XAxis dataKey="name" stroke="#88888C" fontSize={11} />
              <YAxis stroke="#88888C" fontSize={11} />
              <Tooltip
                contentStyle={{ background: "#1E1E22", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 4, fontSize: 12 }}
              />
              <Bar dataKey="value" radius={[2, 2, 0, 0]}>
                {serviceStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="data-card p-4">
          <h3 className="text-base font-semibold text-[#EAEAEA] mb-1">Service Breakdown</h3>
          <p className="text-xs text-[#88888C] mb-3">Services performed by category</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={serviceTypeData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#2A2A30" />
              <XAxis type="number" stroke="#88888C" fontSize={11} />
              <YAxis dataKey="name" type="category" stroke="#88888C" fontSize={10} width={80} />
              <Tooltip
                contentStyle={{ background: "#1E1E22", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 4, fontSize: 12 }}
              />
              <Bar dataKey="value" fill="#005F73" radius={[0, 2, 2, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="data-card p-4">
          <h3 className="text-base font-semibold text-[#EAEAEA] mb-1">Spend Analysis</h3>
          <p className="text-xs text-[#88888C] mb-3">Billed vs Paid (Last 6 Months)</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={monthlyFinanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A2A30" />
              <XAxis dataKey="month" stroke="#88888C" fontSize={11} />
              <YAxis stroke="#88888C" fontSize={11} />
              <Tooltip
                contentStyle={{ background: "#1E1E22", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 4, fontSize: 12 }}
              />
              <Line type="monotone" dataKey="billed" stroke="#F2A900" strokeWidth={2} dot={{ fill: "#F2A900", r: 3 }} />
              <Line type="monotone" dataKey="paid" stroke="#10B981" strokeWidth={2} dot={{ fill: "#10B981", r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Equipment Service Status Report (PMS Hours) */}
      <div className="data-card overflow-auto">
        <div className="p-3 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#005F73]" />
            <h3 className="text-sm font-semibold text-[#EAEAEA]">Equipment Service Status Report (PMS Hours)</h3>
          </div>
          <span className="text-[10px] text-[#88888C] uppercase font-bold tracking-widest">Core Fleet Metric</span>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-[#0A0A0C]">
              <th className="text-left py-2.5 px-3 text-[#88888C] font-medium">Equipment</th>
              <th className="text-left py-2.5 px-3 text-[#88888C] font-medium">Current Hours</th>
              <th className="text-left py-2.5 px-3 text-[#88888C] font-medium">Next PMS</th>
              <th className="text-left py-2.5 px-3 text-[#88888C] font-medium">Hours Remaining</th>
              <th className="text-left py-2.5 px-3 text-[#88888C] font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {pmsReport.map((row, idx) => (
                <tr key={idx} className="border-b border-[#2A2A30] hover:bg-white/5 transition-colors">
                  <td className="py-2.5 px-3 text-[#EAEAEA] font-mono-tech">{row.unit}</td>
                  <td className="py-2.5 px-3 text-[#88888C] font-mono-tech">{row.current}h</td>
                  <td className="py-2.5 px-3 text-[#88888C] font-mono-tech">{row.next}h</td>
                  <td className={`py-2.5 px-3 font-mono-tech ${row.remaining <= 0 ? "text-[#EF4444]" : row.remaining <= 50 ? "text-[#F2A900]" : "text-[#88888C]"}`}>
                    {row.remaining <= 0 ? `OVERDUE (${Math.abs(row.remaining)}h)` : `${row.remaining}h left`}
                  </td>
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

      {/* Package / Subscription Report */}
      <div className="data-card overflow-auto">
        <div className="p-3 border-b border-white/5 flex items-center gap-2">
          <Package className="w-4 h-4 text-[#8B5CF6]" />
          <h3 className="text-sm font-semibold text-[#EAEAEA]">Package & Subscription Usage Report</h3>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-[#0A0A0C]">
              <th className="text-left py-2.5 px-3 text-[#88888C] font-medium">Package Name</th>
              <th className="text-left py-2.5 px-3 text-[#88888C] font-medium">Type</th>
              <th className="text-left py-2.5 px-3 text-[#88888C] font-medium">Visits Used</th>
              <th className="text-left py-2.5 px-3 text-[#88888C] font-medium">Remaining</th>
              <th className="text-left py-2.5 px-3 text-[#88888C] font-medium">Expiry</th>
              <th className="text-left py-2.5 px-3 text-[#88888C] font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {clientPackages.map((pkg) => (
              <tr key={pkg.id} className="border-b border-[#2A2A30]">
                <td className="py-2.5 px-3 text-[#EAEAEA] font-bold">{pkg.name}</td>
                <td className="py-2.5 px-3 text-[#88888C] text-[10px]">{pkg.packageType}</td>
                <td className="py-2.5 px-3 text-[#88888C]">{pkg.usageCount}</td>
                <td className="py-2.5 px-3 text-[#EAEAEA] font-mono-tech font-bold">{pkg.visitsRemaining}</td>
                <td className="py-2.5 px-3 text-[#88888C]">{new Date(pkg.endDate).toLocaleDateString()}</td>
                <td className="py-2.5 px-3">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${pkg.status === "active" ? "bg-[#10B981]/20 text-[#10B981]" : "bg-[#88888C]/20 text-[#88888C]"}`}>
                    {pkg.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Calibration PMS Report */}
        <div className="data-card overflow-auto">
          <div className="p-3 border-b border-white/5 flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-[#F2A900]" />
            <h3 className="text-sm font-semibold text-[#EAEAEA]">Calibration Report</h3>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[#0A0A0C]">
                <th className="text-left py-2.5 px-3 text-[#88888C] font-medium">Unit</th>
                <th className="text-left py-2.5 px-3 text-[#88888C] font-medium">Next Date</th>
                <th className="text-left py-2.5 px-3 text-[#88888C] font-medium">Days</th>
                <th className="text-left py-2.5 px-3 text-[#88888C] font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {calibrationReport.map((row, idx) => (
                  <tr key={idx} className="border-b border-[#2A2A30]">
                    <td className="py-2.5 px-3 text-[#EAEAEA] font-mono-tech">{row.unit}</td>
                    <td className="py-2.5 px-3 text-[#88888C]">{row.next}</td>
                    <td className={`py-2.5 px-3 font-mono-tech ${(row.remaining ?? 1) <= 0 ? "text-[#EF4444]" : "text-[#88888C]"}`}>{row.remaining ?? "—"}d</td>
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
                <th className="text-left py-2.5 px-3 text-[#88888C] font-medium">Test / Project</th>
                <th className="text-left py-2.5 px-3 text-[#88888C] font-medium">Status</th>
                <th className="text-left py-2.5 px-3 text-[#88888C] font-medium">Result</th>
              </tr>
            </thead>
            <tbody>
              {testingReport.map((row, idx) => (
                  <tr key={idx} className="border-b border-[#2A2A30]">
                    <td className="py-2.5 px-3">
                      <div className="text-[#EAEAEA] font-bold">{row.type}</div>
                      <div className="text-[9px] text-[#88888C]">{row.project}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${row.status === "Released" ? "bg-[#10B981]/20 text-[#10B981]" : "bg-[#F2A900]/20 text-[#F2A900]"}`}>
                          {row.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      {row.result === "View Report" ? (
                          <button className="flex items-center gap-1 text-[#005F73] hover:underline font-bold">
                              <FileText className="w-3 h-3" /> Report
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
    </div>
  );
}

function MetricCard({
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
