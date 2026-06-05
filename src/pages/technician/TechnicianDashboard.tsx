import { useMemo, useState } from "react";
import type { ElementType } from "react";
import { useNavigate } from "react-router";
import { useAuthStore } from "@/stores/useAuthStore";
import { useInventoryStore } from "@/stores/useInventoryStore";
import { useOperationsStore } from "@/stores/useOperationsStore";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import {
  Activity,
  
  ShieldCheck,
  Wrench,
  AlertTriangle,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const STATUS_COLORS = {
  pending: "#60A5FA",
  assigned: "#0284C7",
  inProgress: "#0EA5E9",
  completed: "#10B981",
  overdue: "#EF4444",
};

function parseHoursText(text: string | undefined) {
  const match = String(text ?? "").match(/(\d+)\s*h/i);
  return match ? Number(match[1]) : 0;
}

function formatDaysSince(dateISO: string | undefined) {
  if (!dateISO) return "No record";
  const date = new Date(dateISO);
  if (Number.isNaN(date.getTime())) return "No record";

  const days = Math.max(0, Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)));
  if (days === 0) return "Today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

function getHealthLabel(score: number) {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Stable";
  if (score >= 40) return "Degraded";
  return "Critical";
}

export default function TechnicianDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { serviceRecords, equipment } = useOperationsStore();
  const { items: inventoryItems } = useInventoryStore();
  const [showAllHealthItems, setShowAllHealthItems] = useState(false);

  const now = new Date();

  const assignedJobs = serviceRecords.filter(
    (record) => record.status === "scheduled" && new Date(record.scheduledDate) <= now,
  ).length;
  const pendingJobs = serviceRecords.filter(
    (record) => record.status === "scheduled" && new Date(record.scheduledDate) > now,
  ).length;
  const inProgressJobs = serviceRecords.filter((record) => record.status === "in_progress").length;
  const completedJobs = serviceRecords.filter((record) => record.status === "completed").length;
  const cancelledJobs = serviceRecords.filter((record) => record.status === "cancelled").length;
  const overdueJobs = serviceRecords.filter(
    (record) =>
      record.status !== "completed" &&
      record.status !== "cancelled" &&
      new Date(record.scheduledDate) < now,
  ).length;

  // workOrderTrend removed — replaced by Upcoming Preventive Maintenance timeline

  const statusDistribution = useMemo(() => [
    { name: "Pending", value: pendingJobs, color: STATUS_COLORS.pending },
    { name: "Assigned", value: assignedJobs, color: STATUS_COLORS.assigned },
    { name: "In Progress", value: inProgressJobs, color: STATUS_COLORS.inProgress },
    { name: "Completed", value: completedJobs, color: STATUS_COLORS.completed },
    { name: "Overdue", value: overdueJobs, color: STATUS_COLORS.overdue },
  ], [assignedJobs, completedJobs, inProgressJobs, overdueJobs, pendingJobs]);

  // maintenanceAnalysis removed (replaced by partsInventoryRows)

  const equipmentHealth = useMemo(() => {
    return equipment.slice(0, 8).map((item) => {
      const history = serviceRecords.filter((record) => record.equipmentId === item.id);
      const breakdownCount = history.filter((record) =>
        /breakdown/i.test(`${record.description ?? ""} ${record.findings ?? ""}`),
      ).length;
      const alertCount = ["overdue", "service_due", "alert"].reduce(
        (count, token) => count + (item.status?.toLowerCase().includes(token) ? 1 : 0),
        0,
      );
      const engineHours = parseHoursText(item.hoursTotal);
      const rawScore = 100 - breakdownCount * 16 - alertCount * 12 - Math.min(40, engineHours / 40) - history.length * 1.5;
      const score = Math.max(28, Math.min(100, Math.round(rawScore)));
      return {
        id: item.id,
        name: item.name || item.id,
        type: item.equipmentType,
        score,
        status: getHealthLabel(score),
        currentHours: engineHours,
        alerts: alertCount,
        breakdowns: breakdownCount,
      };
    });
  }, [equipment, serviceRecords]);

  const upcomingPreventiveMaintenance = useMemo(() => {
    const pmsTimeline = serviceRecords
      .filter((record) => record.serviceCategory?.includes("PMS"))
      .map((record) => {
        const scheduled = new Date(record.scheduledDate || record.createdAt);
        const days = Math.max(0, Math.ceil((scheduled.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
        return {
          id: record.id,
          equipmentName: equipment.find((item) => item.id === record.equipmentId)?.name || record.equipmentId,
          days,
          scheduled,
        };
      })
      .sort((a, b) => a.days - b.days)
      .slice(0, 5);

    return pmsTimeline;
  }, [serviceRecords, equipment, now]);

  const partsInventoryRows = useMemo(() => {
    return inventoryItems
      .map((item) => ({
        id: item.id,
        partIdentification: `${item.partNumber} - ${item.name}`,
        category: item.category,
        stockLevel: item.stockLevel,
        minThreshold: item.minThreshold,
        stockStatus: item.stockLevel <= item.minThreshold ? "Low Stock" : "In Stock",
        lastRestocked: formatDaysSince(item.lastRestocked),
      }))
      .sort((a, b) => a.stockLevel - b.stockLevel)
      .slice(0, 6);
  }, [inventoryItems]);

  const averageHealth = useMemo(() => {
    if (equipmentHealth.length === 0) return 0;
    return Math.round(equipmentHealth.reduce((sum, item) => sum + item.score, 0) / equipmentHealth.length);
  }, [equipmentHealth]);

  const equipmentPreview = useMemo(() => (showAllHealthItems ? equipmentHealth : equipmentHealth.slice(0, 3)), [equipmentHealth, showAllHealthItems]);

  const recentActivities = useMemo(() => {
    return [...serviceRecords]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 6)
      .map((r) => {
        const name = equipment.find((e) => e.id === r.equipmentId)?.name || r.equipmentId;
        const category = r.serviceCategory || "Service";
        let labelText: string = String(category);
        if (/repair/i.test(category) || /repair/i.test(`${r.description ?? ""}`)) labelText = "Started Repair";
        else if (/restock|restocked/i.test(`${r.description ?? ""}`)) labelText = "Restocked";
        else if (/inspection/i.test(category)) labelText = "Completed Inspection";
        else if (/pms|preventive/i.test(category)) labelText = "Scheduled Preventive Maintenance";
        return { id: r.id, text: `${labelText}: ${name}`, time: new Date(r.createdAt).toLocaleString() };
      });
  }, [serviceRecords, equipment]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-[32px] font-bold text-gray-900 tracking-[-0.02em]">
            Technician Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            A live operations overview for {user?.name ?? "your team"} and equipment health.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center text-gray-500 text-xs font-medium">
          <Activity className="w-3.5 h-3.5 text-[#10B981]" />
          <span>Workload and equipment status in one place</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        <SummaryCard
          label="Active Work Orders"
          value={`${assignedJobs + inProgressJobs}`}
          detail={`${pendingJobs} pending · ${inProgressJobs} in progress`}
          icon={Wrench}
          accent="bg-sky-50 text-sky-700"
        />
        <SummaryCard
          label="Completed Jobs"
          value={`${completedJobs}`}
          detail={`${cancelledJobs} cancelled`}
          icon={CheckCircle2}
          accent="bg-emerald-50 text-emerald-700"
        />
        <SummaryCard
          label="Equipment Health"
          value={`${averageHealth}%`}
          detail={`${equipmentHealth.length} tracked units`}
          icon={ShieldCheck}
          accent="bg-emerald-50 text-emerald-700"
        />
        <SummaryCard
          label="Alerts & Risks"
          value={`${overdueJobs}`}
          detail="Overdue and at-risk work orders"
          icon={AlertTriangle}
          accent="bg-amber-50 text-amber-700"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 items-start">
        {/* Service Status moved into Work Orders position */}
        <div className="data-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Service Status Distribution</h2>
              <p className="text-xs text-gray-500">Visualize current service status across the field.</p>
            </div>
            <Clock className="w-4 h-4 text-[#0284C7]" />
          </div>
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            <div className="w-full lg:w-1/2 h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={2}
                    labelLine={false}
                    label={({ percent, name }) => `${name} ${Math.round(percent * 100)}%`}
                  >
                    {statusDistribution.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "#FFFFFF",
                      border: "1px solid #E5E7EB",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full lg:w-1/2 space-y-2">
              {statusDistribution.map((item) => (
                <div key={item.name} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-sm font-medium text-gray-700">{item.name}</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Work Orders Trend moved to second position */}
        <div className="data-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Upcoming Preventive Maintenance</h2>
              <p className="text-xs text-gray-500">Next scheduled preventive maintenance items (timeline).</p>
            </div>
            <Clock className="w-4 h-4 text-[#0284C7]" />
          </div>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={upcomingPreventiveMaintenance.map((e) => ({ date: e.scheduled.toISOString().slice(0,10), days: e.days, name: e.equipmentName }))}
                margin={{ top: 0, right: 12, left: -8, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="date" stroke="#6B7280" fontSize={11} />
                <YAxis dataKey="days" stroke="#6B7280" fontSize={11} allowDecimals={false} />
                <Tooltip
                  labelFormatter={(label) => new Date(label).toLocaleDateString()}
                  formatter={(value) => [`${value} day(s)`, 'Days remaining']}
                  contentStyle={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 12 }}
                />
                <Line type="monotone" dataKey="days" stroke="#0284C7" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Replace Maintenance Analysis with Parts Consumption + Recent Activity layout */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 items-start xl:col-span-2">
          <div className="grid grid-rows-2 gap-3 h-full">
            <div className="data-card p-4 h-[280px] flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">Inventory Analysis</h2>
                  <p className="text-xs text-gray-500">Track inventory usage connected to the inventory module.</p>
                </div>
                <Activity className="w-4 h-4 text-[#10B981]" />
              </div>
              <div className="flex-1 overflow-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-white">
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-2 px-2 text-gray-500 font-medium">Part Identification</th>
                      <th className="text-left py-2 px-2 text-gray-500 font-medium">Category</th>
                      <th className="text-left py-2 px-2 text-gray-500 font-medium">Stock Status</th>
                      <th className="text-left py-2 px-2 text-gray-500 font-medium">Last Restocked</th>
                    </tr>
                  </thead>
                  <tbody>
                    {partsInventoryRows.map((part) => (
                      <tr key={part.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="py-2 px-2 text-gray-900 font-semibold">{part.partIdentification}</td>
                        <td className="py-2 px-2 text-gray-500">{part.category}</td>
                        <td className="py-2 px-2">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                            part.stockStatus === "Low Stock"
                              ? "bg-[#EF4444]/10 text-[#EF4444]"
                              : "bg-[#10B981]/10 text-[#059669]"
                          }`}>
                            {part.stockStatus} ({part.stockLevel})
                          </span>
                        </td>
                        <td className="py-2 px-2 text-gray-500">{part.lastRestocked}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 flex items-center justify-between text-[11px] text-gray-500">
                <span>Connected to Inventory</span>
                <Button variant="ghost" size="sm" className="text-[11px] font-semibold" onClick={() => navigate('/reports')}>
                  See More
                </Button>
              </div>
            </div>

            <div className="data-card p-4 h-[280px] flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">Recent Service Activity</h2>
                  <p className="text-xs text-gray-500">Recent service-related activities.</p>
                </div>
                <Activity className="w-4 h-4 text-[#60A5FA]" />
              </div>
              <div className="flex-1 space-y-2 overflow-auto">
                {recentActivities.length === 0 ? (
                  <div className="text-sm text-gray-400">No recent activity</div>
                ) : (
                  recentActivities.map((a) => (
                    <div key={a.id} className="flex items-center justify-between">
                      <div className="text-sm text-gray-700">{a.text}</div>
                      <div className="text-xs text-gray-500">{a.time}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="data-card p-4 h-full">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Equipment Health</h2>
                <p className="text-xs text-gray-500">Tracks health from maintenance history, breakdowns, alerts and engine hours.</p>
              </div>
              <ShieldCheck className="w-4 h-4 text-[#10B981]" />
            </div>
            <div className="space-y-4">
              {equipmentPreview.map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-100 p-3">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">{item.name}</div>
                      <div className="text-[10px] uppercase tracking-[0.24em] text-gray-400">{item.type}</div>
                    </div>
                    <span className="text-xs font-bold uppercase tracking-[0.26em] text-slate-500">
                      {item.status}
                    </span>
                  </div>
                  <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${item.score}%`, backgroundColor: item.score >= 80 ? '#10B981' : item.score >= 60 ? '#F59E0B' : item.score >= 40 ? '#F97316' : '#EF4444' }} />
                  </div>
                  <div className="mt-2 text-[11px] text-gray-500 grid grid-cols-3 gap-2">
                    <div>
                      <div className="text-xs font-black text-slate-900">{item.score}%</div>
                      <div className="text-[10px] uppercase tracking-[0.3em] text-gray-400">Health</div>
                    </div>
                    <div>
                      <div className="text-xs font-black text-slate-900">{item.currentHours}h</div>
                      <div className="text-[10px] uppercase tracking-[0.3em] text-gray-400">Engine</div>
                    </div>
                    <div>
                      <div className="text-xs font-black text-slate-900">{item.breakdowns} / {item.alerts}</div>
                      <div className="text-[10px] uppercase tracking-[0.3em] text-gray-400">Breakdowns / Alerts</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-3">
              {equipmentHealth.length > 2 ? (
                <button
                  type="button"
                  className="text-[11px] font-semibold text-blue-700 hover:text-blue-900"
                  onClick={() => setShowAllHealthItems((state) => !state)}
                >
                  {showAllHealthItems ? "See less" : "See more"}
                </button>
              ) : null}
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-gray-500">Equipment health index</span>
              <div className="space-y-1 text-right">
                <div className="text-sm font-bold text-gray-900">{averageHealth}%</div>
                <div className="text-[10px] text-gray-500 uppercase tracking-[0.24em]">{equipmentHealth.length} tracked units</div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

function SummaryCard({
  label,
  value,
  detail,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  detail: string;
  icon: ElementType;
  accent: string;
}) {
  return (
    <div className="data-card p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="space-y-1">
          <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500 font-semibold">{label}</p>
          <p className="text-3xl font-black text-gray-900">{value}</p>
        </div>
        <div className={`${accent} rounded-2xl p-3`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className="text-xs text-gray-500">{detail}</p>
    </div>
  );
}
