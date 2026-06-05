import { useMemo } from "react";
import type { ElementType } from "react";
import { useInventoryStore } from "@/stores/useInventoryStore";
import { useOperationsStore } from "@/stores/useOperationsStore";
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
} from "recharts";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Package,
  ShieldCheck,
  Wrench,
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

function getLastSixMonths() {
  return Array.from({ length: 6 }).map((_, index) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - index));
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    return { key, month: monthLabelFromKey(key) };
  });
}

function parseDurationHours(duration: string | null | undefined) {
  const value = String(duration ?? "").trim();
  if (!value) return null;

  const hours = value.match(/(\d+(?:\.\d+)?)\s*h/i);
  const minutes = value.match(/(\d+(?:\.\d+)?)\s*m/i);

  if (hours || minutes) {
    return (hours ? Number(hours[1]) : 0) + (minutes ? Number(minutes[1]) / 60 : 0);
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function getServiceDurationHours(record: {
  scheduledDate?: string;
  completedDate?: string | null;
  createdAt?: string;
  duration?: string | null;
}) {
  const durationHours = parseDurationHours(record.duration);
  if (durationHours !== null) return durationHours;

  const start = new Date(record.scheduledDate || record.createdAt || "").getTime();
  const end = record.completedDate ? new Date(record.completedDate).getTime() : NaN;
  return Number.isFinite(start) && Number.isFinite(end) && end > start
    ? (end - start) / (1000 * 60 * 60)
    : null;
}

function formatDate(dateISO: string | null | undefined) {
  if (!dateISO) return "-";
  const date = new Date(dateISO);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString();
}

function getMaintenanceType(record: { serviceCategory?: string; description?: string; findings?: string }) {
  const text = `${record.serviceCategory ?? ""} ${record.description ?? ""} ${record.findings ?? ""}`;
  if (/emergency|breakdown|failure|failed/i.test(text)) return "Emergency Services";
  if (/repair/i.test(text)) return "Repairs";
  if (/inspection/i.test(text)) return "Inspection";
  return "PM";
}

export default function TechnicianReports() {
  const { equipment, serviceRecords } = useOperationsStore();
  const { items: inventoryItems, usageHistory } = useInventoryStore();

  const completedServices = serviceRecords.filter((service) => service.status === "completed");
  const repairServices = serviceRecords.filter((service) => getMaintenanceType(service) === "Repairs");
  const repairDurations = repairServices
    .map((service) => getServiceDurationHours(service as typeof service & { duration?: string | null }))
    .filter((hours): hours is number => hours !== null);
  const averageRepairTime = repairDurations.length
    ? repairDurations.reduce((sum, hours) => sum + hours, 0) / repairDurations.length
    : 0;

  const maintenanceRecords = serviceRecords.filter((service) =>
    /pms|maintenance|calibration|inspection/i.test(`${service.serviceCategory} ${service.description ?? ""}`) &&
    service.status !== "cancelled",
  );
  const compliantMaintenance = maintenanceRecords.filter((service) => {
    if (service.status !== "completed" || !service.completedDate) return false;
    return new Date(service.completedDate).getTime() <= new Date(service.scheduledDate).getTime();
  }).length;
  const maintenanceCompliance = maintenanceRecords.length
    ? (compliantMaintenance / maintenanceRecords.length) * 100
    : 100;

  const breakdownRecords = serviceRecords.filter((service) =>
    /breakdown|failure|failed|emergency/i.test(`${service.serviceCategory} ${service.description ?? ""} ${service.findings ?? ""}`),
  );
  const breakdownRate = serviceRecords.length ? (breakdownRecords.length / serviceRecords.length) * 100 : 0;

  const workOrderCompletionData = useMemo(() => {
    const monthMap = new Map(getLastSixMonths().map((month) => [month.key, { ...month, completed: 0 }]));

    completedServices.forEach((service) => {
      const completedDate = service.completedDate || service.createdAt;
      const month = monthMap.get(monthKey(completedDate));
      if (month) month.completed += 1;
    });

    return Array.from(monthMap.values());
  }, [completedServices]);

  const maintenanceTypeData = useMemo(() => {
    const counts = new Map([
      ["PM", 0],
      ["Repairs", 0],
      ["Inspection", 0],
      ["Emergency Services", 0],
    ]);

    serviceRecords.forEach((service) => {
      const type = getMaintenanceType(service);
      counts.set(type, (counts.get(type) ?? 0) + 1);
    });

    return Array.from(counts.entries()).map(([name, value]) => ({ name, value }));
  }, [serviceRecords]);

  const maintenanceHistory = useMemo(() => {
    return [...serviceRecords]
      .sort((a, b) => {
        const dateA = new Date(a.completedDate || a.scheduledDate || a.createdAt).getTime();
        const dateB = new Date(b.completedDate || b.scheduledDate || b.createdAt).getTime();
        return dateB - dateA;
      })
      .slice(0, 8)
      .map((service) => {
        const unit = equipment.find((item) => item.id === service.equipmentId);
        const duration = getServiceDurationHours(service as typeof service & { duration?: string | null });
        return {
          id: service.id,
          equipment: unit?.name || service.equipmentId,
          type: getMaintenanceType(service),
          technician: service.technician || "Unassigned",
          completed: formatDate(service.completedDate || service.scheduledDate),
          duration: duration === null ? "-" : `${duration.toFixed(1)}h`,
          status: service.status.replace("_", " "),
        };
      });
  }, [equipment, serviceRecords]);

  const partsConsumptionData = useMemo(() => {
    const usageByItem = new Map(inventoryItems.map((item) => [item.id, 0]));

    usageHistory.forEach((usage) => {
      usageByItem.set(usage.inventoryItemId, (usageByItem.get(usage.inventoryItemId) ?? 0) + usage.quantityUsed);
    });

    return inventoryItems
      .map((item) => ({
        name: item.name,
        consumed: usageByItem.get(item.id) ?? 0,
        stock: item.stockLevel,
      }))
      .sort((a, b) => b.consumed - a.consumed)
      .slice(0, 10);
  }, [inventoryItems, usageHistory]);

  const averageRepairTimeTrend = useMemo(() => {
    const monthMap = new Map(getLastSixMonths().map((month) => [month.key, { ...month, total: 0, count: 0 }]));

    repairServices.forEach((service) => {
      const completedDate = service.completedDate || service.createdAt;
      const duration = getServiceDurationHours(service as typeof service & { duration?: string | null });
      const month = monthMap.get(monthKey(completedDate));
      if (month && duration !== null) {
        month.total += duration;
        month.count += 1;
      }
    });

    return Array.from(monthMap.values()).map((month) => ({
      month: month.month,
      hours: month.count ? Number((month.total / month.count).toFixed(1)) : 0,
    }));
  }, [repairServices]);

  const equipmentBreakdownData = useMemo(() => {
    return equipment
      .map((item) => {
        const history = serviceRecords.filter((service) => service.equipmentId === item.id);
        const breakdowns = history.filter((service) =>
          /breakdown|failure|failed|emergency/i.test(`${service.serviceCategory} ${service.description ?? ""} ${service.findings ?? ""}`),
        );
        const lastService = history
          .filter((service) => service.completedDate || service.scheduledDate || service.createdAt)
          .sort((a, b) => {
            const dateA = new Date(a.completedDate || a.scheduledDate || a.createdAt).getTime();
            const dateB = new Date(b.completedDate || b.scheduledDate || b.createdAt).getTime();
            return dateB - dateA;
          })[0];

        return {
          id: item.id,
          equipment: item.name || item.id,
          breakdowns: breakdowns.length,
          lastService: formatDate(lastService?.completedDate || lastService?.scheduledDate || lastService?.createdAt),
          status: breakdowns.length >= 2 ? "High Risk" : item.status || "Active",
        };
      })
      .sort((a, b) => b.breakdowns - a.breakdowns)
      .slice(0, 8);
  }, [equipment, serviceRecords]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[32px] font-bold text-gray-900 tracking-[-0.02em]">Technician Analytics</h1>
          <p className="text-sm text-gray-500 mt-0.5">Work order trends, maintenance history, parts usage, and equipment risk</p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-[#66B2B2]/10 border border-[#66B2B2]/20">
          <Calendar className="w-3 h-3 text-[#66B2B2]" />
          <span className="text-xs text-[#66B2B2] font-medium">Last 6 Months</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <MetricCard label="Services Completed" value={`${completedServices.length}`} hint="Completed work orders" icon={CheckCircle2} accent="text-[#10B981]" />
        <MetricCard label="Average Repair Time" value={`${averageRepairTime.toFixed(1)}h`} hint={`${repairDurations.length} repair jobs tracked`} icon={Clock} accent="text-[#66B2B2]" />
        <MetricCard label="Maintenance Compliance" value={`${maintenanceCompliance.toFixed(0)}%`} hint={`${compliantMaintenance}/${maintenanceRecords.length} completed on schedule`} icon={ShieldCheck} accent="text-amber-500" />
        <MetricCard label="Breakdown Rate" value={`${breakdownRate.toFixed(1)}%`} hint={`${breakdownRecords.length} breakdown-related records`} icon={AlertTriangle} accent="text-[#EF4444]" />
      </div>

      <ChartCard
        title="Work Order Completion Time"
        subtitle="Completed jobs by month"
        icon={CheckCircle2}
        className="p-4"
      >
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={workOrderCompletionData} margin={{ top: 8, right: 20, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="month" stroke="#6B7280" fontSize={11} />
            <YAxis stroke="#6B7280" fontSize={11} allowDecimals={false} />
            <Tooltip
              contentStyle={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 6, fontSize: 12 }}
              formatter={(value: number) => [`${value} jobs`, "Completed"]}
            />
            <Line type="monotone" dataKey="completed" stroke="#10B981" strokeWidth={2.5} dot={{ r: 4, fill: "#10B981" }} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        <ChartCard
          title="Maintenance Type Distribution"
          subtitle="PM, repairs, inspections, and emergency services"
          icon={Wrench}
          className="p-4"
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={maintenanceTypeData} layout="vertical" margin={{ top: 8, right: 20, left: 24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
              <XAxis type="number" stroke="#6B7280" fontSize={11} allowDecimals={false} />
              <YAxis dataKey="name" type="category" stroke="#6B7280" fontSize={11} width={120} />
              <Tooltip contentStyle={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 6, fontSize: 12 }} />
              <Bar dataKey="value" fill="#66B2B2" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <TableCard title="Maintenance History" icon={Clock}>
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left py-2.5 px-3 text-gray-500 font-medium">Equipment</th>
                <th className="text-left py-2.5 px-3 text-gray-500 font-medium">Type</th>
                <th className="text-left py-2.5 px-3 text-gray-500 font-medium">Technician</th>
                <th className="text-left py-2.5 px-3 text-gray-500 font-medium">Completed</th>
                <th className="text-left py-2.5 px-3 text-gray-500 font-medium">Time</th>
              </tr>
            </thead>
            <tbody>
              {maintenanceHistory.map((row) => (
                <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="py-2.5 px-3 text-gray-900 font-bold">{row.equipment}</td>
                  <td className="py-2.5 px-3 text-gray-500">{row.type}</td>
                  <td className="py-2.5 px-3 text-gray-500">{row.technician}</td>
                  <td className="py-2.5 px-3 text-gray-500">{row.completed}</td>
                  <td className="py-2.5 px-3 text-[#66B2B2] font-mono-tech font-bold">{row.duration}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>
      </div>

      <ChartCard
        title="Parts Consumption Analysis"
        subtitle="Connected to Inventory"
        icon={Package}
        className="p-4"
      >
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={partsConsumptionData} margin={{ top: 8, right: 20, left: -10, bottom: 24 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="name" stroke="#6B7280" fontSize={10} angle={-15} textAnchor="end" interval={0} height={60} />
            <YAxis stroke="#6B7280" fontSize={11} allowDecimals={false} />
            <Tooltip
              contentStyle={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 6, fontSize: 12 }}
              formatter={(value: number, name: string) => [value, name === "consumed" ? "Consumed" : "Current Stock"]}
            />
            <Bar dataKey="consumed" fill="#66B2B2" radius={[3, 3, 0, 0]} />
            <Bar dataKey="stock" fill="#CBD5E1" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
        <TableCard title="Equipment Breakdown Analysis" icon={AlertTriangle} className="xl:col-span-2">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left py-2.5 px-3 text-gray-500 font-medium">Equipment</th>
                <th className="text-left py-2.5 px-3 text-gray-500 font-medium">Breakdown Count</th>
                <th className="text-left py-2.5 px-3 text-gray-500 font-medium">Last Service</th>
                <th className="text-left py-2.5 px-3 text-gray-500 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {equipmentBreakdownData.map((row) => (
                <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="py-2.5 px-3 text-gray-900 font-bold">{row.equipment}</td>
                  <td className="py-2.5 px-3 text-gray-500 font-mono-tech">{row.breakdowns}</td>
                  <td className="py-2.5 px-3 text-gray-500">{row.lastService}</td>
                  <td className="py-2.5 px-3">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                      row.status === "High Risk"
                        ? "bg-[#EF4444]/10 text-[#EF4444]"
                        : "bg-[#10B981]/10 text-[#059669]"
                    }`}>
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>

        <ChartCard
          title="Average Repair Time Trend"
          subtitle="Monthly repair duration"
          icon={Clock}
          className="p-4"
        >
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={averageRepairTimeTrend} margin={{ top: 8, right: 16, left: -14, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="month" stroke="#6B7280" fontSize={11} />
              <YAxis stroke="#6B7280" fontSize={11} tickFormatter={(value) => `${value}h`} />
              <Tooltip
                contentStyle={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 6, fontSize: 12 }}
                formatter={(value: number) => [`${value.toFixed(1)} hrs`, "Avg repair time"]}
              />
              <Line type="monotone" dataKey="hours" stroke="#F59E0B" strokeWidth={2.5} dot={{ r: 4, fill: "#F59E0B" }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  icon: Icon,
  className = "",
  children,
}: {
  title: string;
  subtitle: string;
  icon: ElementType;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`data-card ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          <p className="text-xs text-gray-500">{subtitle}</p>
        </div>
        <Icon className="w-4 h-4 text-[#66B2B2]" />
      </div>
      {children}
    </div>
  );
}

function TableCard({
  title,
  icon: Icon,
  className = "",
  children,
}: {
  title: string;
  icon: ElementType;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`data-card overflow-auto ${className}`}>
      <div className="p-3 border-b border-gray-200 flex items-center gap-2">
        <Icon className="w-4 h-4 text-[#66B2B2]" />
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      </div>
      {children}
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
  icon: ElementType;
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
