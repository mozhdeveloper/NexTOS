import { useMemo } from "react";
import { useCRMStore } from "@/stores/useCRMStore";
import { useOperationsStore } from "@/stores/useOperationsStore";
import { useBillingStore } from "@/stores/useBillingStore";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import {
  TrendingUp,
  Users,
  Wrench,
  DollarSign,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Package,
  Activity,
  UserCheck,
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

export default function Reports() {
  const { clients } = useCRMStore();
  const { equipment, serviceRecords } = useOperationsStore();
  const { invoices, packages } = useBillingStore();

  const now = new Date();

  // High-Level KPIs (All Clients)
  const totalServices = serviceRecords.filter(s => s.status === "completed").length;
  
  const totalDue = equipment.filter(e => {
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

  const totalOverdue = equipment.filter(e => {
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

  const totalRevenue = invoices.reduce((sum, i) => sum + i.total, 0);
  const totalActivePackages = packages.filter(p => p.status === "active").length;

  // Charts Data
  const serviceStatusData = [
    { name: "Completed", value: totalServices, color: "#10B981" },
    { name: "Due Soon", value: totalDue, color: "#66B2B2" },
    { name: "Overdue", value: totalOverdue, color: "#EF4444" },
  ];

  const serviceMixData = useMemo(() => {
    const counts = new Map<string, number>();
    serviceRecords.forEach(s => {
      counts.set(s.serviceCategory, (counts.get(s.serviceCategory) || 0) + 1);
    });
    return Array.from(counts.entries()).map(([name, value]) => ({ name, value }));
  }, [serviceRecords]);

  const monthlyRevenueData = useMemo(() => {
    const months = Array.from({ length: 6 }).map((_, index) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - index));
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      return { key, label: monthLabelFromKey(key), value: 0 };
    });

    const monthMap = new Map(months.map((m) => [m.key, m]));

    invoices.forEach((invoice) => {
      const month = monthMap.get(monthKey(invoice.createdAt));
      if (month) {
        month.value += invoice.total;
      }
    });

    return months.map((m) => ({ month: m.label, revenue: m.value }));
  }, [invoices]);

  // Client Insights
  const clientInsights = useMemo(() => {
    return clients.map(client => {
        const clientInvoices = invoices.filter(i => i.clientId === client.id);
        const clientServices = serviceRecords.filter(s => s.clientId === client.id);
        const clientEq = equipment.filter(e => e.clientId === client.id);
        const overdueCount = clientEq.filter(e => {
            if (e.equipmentType === "Heavy Equipment") return e.nextPMSHours - e.currentHours <= 0;
            const nextDate = e.nextCalibrationDate ? new Date(e.nextCalibrationDate) : null;
            return nextDate && nextDate <= now;
        }).length;

        return {
            id: client.id,
            name: client.companyName,
            revenue: clientInvoices.reduce((s, i) => s + i.total, 0),
            services: clientServices.length,
            overdue: overdueCount
        };
    }).sort((a, b) => b.revenue - a.revenue);
  }, [clients, invoices, serviceRecords, equipment, now]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[32px] font-bold text-gray-900 tracking-[-0.02em]">Operations Analytics</h1>
          <p className="text-sm text-gray-500 mt-0.5">Global performance, revenue distribution, and service risk</p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-[#66B2B2]/10 border border-[#66B2B2]/20">
          <Calendar className="w-3 h-3 text-[#66B2B2]" />
          <span className="text-xs text-[#66B2B2] font-medium">Last 6 Months</span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <MetricCard label="Total Services" value={`${totalServices}`} hint="Completed to date" icon={CheckCircle2} accent="text-[#10B981]" />
        <MetricCard label="Global Due" value={`${totalDue}`} hint="Scheduled soon" icon={Wrench} accent="text-[#66B2B2]" />
        <MetricCard label="Global Overdue" value={`${totalOverdue}`} hint="Critical service risk" icon={AlertTriangle} accent="text-[#EF4444]" />
        <MetricCard label="Total Revenue" value={`₱${(totalRevenue / 1000).toFixed(1)}k`} hint="Lifetime value" icon={DollarSign} accent="text-gray-900" />
        <MetricCard label="Active Packages" value={`${totalActivePackages}`} hint="Managed subscriptions" icon={Package} accent="text-[#66B2B2]" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2 data-card p-4">
          <h3 className="text-base font-semibold text-gray-900 mb-1">Global Revenue Trend</h3>
          <p className="text-xs text-gray-500 mb-3">Revenue growth over the last 6 months</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyRevenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="month" stroke="#6B7280" fontSize={11} />
              <YAxis stroke="#6B7280" fontSize={11} />
              <Tooltip
                contentStyle={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 6, fontSize: 12 }}
                formatter={(value: number) => [`₱${value.toLocaleString()}`, "Revenue"]}
              />
              <Bar dataKey="revenue" fill="#66B2B2" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="data-card p-4">
          <h3 className="text-base font-semibold text-gray-900 mb-1">Service Status Mix</h3>
          <p className="text-xs text-gray-500 mb-3">Overall fleet health (all clients)</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={serviceStatusData}
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {serviceStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                 contentStyle={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 6, fontSize: 12 }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-2">
            {serviceStatusData.map((s) => (
              <div key={s.name} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-[10px] text-gray-500">{s.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Client Performance Table */}
        <div className="data-card overflow-auto">
          <div className="p-3 border-b border-gray-200 flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-[#66B2B2]" />
            <h3 className="text-sm font-semibold text-gray-900">Client Value Report</h3>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left py-2.5 px-3 text-gray-500 font-medium">Client</th>
                <th className="text-left py-2.5 px-3 text-gray-500 font-medium">Revenue</th>
                <th className="text-left py-2.5 px-3 text-gray-500 font-medium">Services</th>
                <th className="text-left py-2.5 px-3 text-gray-500 font-medium">Risk (Overdue)</th>
              </tr>
            </thead>
            <tbody>
              {clientInsights.slice(0, 10).map((client) => (
                <tr key={client.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="py-2.5 px-3 text-gray-900 font-bold">{client.name}</td>
                  <td className="py-2.5 px-3 text-[#66B2B2] font-mono-tech font-bold">₱{client.revenue.toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-gray-500">{client.services}</td>
                  <td className="py-2.5 px-3">
                    {client.overdue > 0 ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#EF4444]/10 text-[#EF4444] font-bold">
                            {client.overdue} OVERDUE
                        </span>
                    ) : (
                        <span className="text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Global Service Breakdown */}
        <div className="data-card p-4">
          <h3 className="text-base font-semibold text-gray-900 mb-1">Global Service Performance</h3>
          <p className="text-xs text-gray-500 mb-3">Service volume by category</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={serviceMixData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis type="number" stroke="#6B7280" fontSize={11} />
              <YAxis dataKey="name" type="category" stroke="#6B7280" fontSize={10} width={100} />
              <Tooltip
                contentStyle={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 6, fontSize: 12 }}
              />
              <Bar dataKey="value" fill="#66B2B2" radius={[0, 2, 2, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Package Performance Report */}
      <div className="data-card overflow-auto">
        <div className="p-3 border-b border-gray-200 flex items-center gap-2">
          <Package className="w-4 h-4 text-[#8B5CF6]" />
          <h3 className="text-sm font-semibold text-gray-900">Package & Subscription Performance</h3>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left py-2.5 px-3 text-gray-500 font-medium">Package Type</th>
              <th className="text-left py-2.5 px-3 text-gray-500 font-medium">Active Count</th>
              <th className="text-left py-2.5 px-3 text-gray-500 font-medium">Total Revenue</th>
              <th className="text-left py-2.5 px-3 text-gray-500 font-medium">Usage Level</th>
            </tr>
          </thead>
          <tbody>
            {["Heavy Equipment PMS Package", "Calibration Package", "Lab Testing Package"].map((type) => {
                const typePackages = packages.filter(p => p.packageType === type && p.status === "active");
                const typeRevenue = packages.filter(p => p.packageType === type).reduce((s, p) => s + p.price, 0);
                const avgUsage = typePackages.length > 0 
                    ? typePackages.reduce((s, p) => s + (p.usageCount / p.totalVisits), 0) / typePackages.length 
                    : 0;

                return (
                    <tr key={type} className="border-b border-gray-100">
                        <td className="py-2.5 px-3 text-gray-900 font-bold">{type}</td>
                        <td className="py-2.5 px-3 text-gray-500">{typePackages.length}</td>
                        <td className="py-2.5 px-3 text-[#66B2B2] font-mono-tech font-bold">₱{typeRevenue.toLocaleString()}</td>
                        <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2">
                                <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden max-w-[100px]">
                                    <div className="h-full bg-[#66B2B2] rounded-full" style={{ width: `${avgUsage * 100}%` }} />
                                </div>
                                <span className="text-[10px] text-gray-500">{(avgUsage * 100).toFixed(0)}% avg usage</span>
                            </div>
                        </td>
                    </tr>
                );
            })}
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
        <span className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</span>
        <Icon className="w-4 h-4 text-gray-400" />
      </div>
      <div className={`text-3xl font-bold ${accent}`}>{value}</div>
      <div className="text-[10px] text-gray-500 mt-1">{hint}</div>
    </div>
  );
}