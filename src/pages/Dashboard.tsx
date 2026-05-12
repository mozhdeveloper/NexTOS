
import { useCRMStore } from "@/stores/useCRMStore";
import { useBillingStore } from "@/stores/useBillingStore";
import { useFleetStore } from "@/stores/useFleetStore";
import { useAuthStore } from "@/stores/useAuthStore";
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
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  TrendingUp,
  Users,
  DollarSign,
  AlertTriangle,
  Radio,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
} from "lucide-react";

export default function Dashboard() {
function formatHoursMinutes(hours: number): string {
  const totalMinutes = Math.max(0, Math.floor((hours ?? 0) * 60));
  const wholeHours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${wholeHours}h ${minutes}m`;
}
  const { user } = useAuthStore();
  const { deals, tasks, leads, getOverdueTasks } = useCRMStore();
  const { getTotalRevenue, getOutstandingRevenue } = useBillingStore();
  const { units } = useFleetStore();
  // KPI Calculations
  const totalLeads = leads.length;
  const dealsClosed = deals.filter((d) => d.stage === "closed_won").length;
  const conversionRate = totalLeads > 0 ? Math.round((dealsClosed / totalLeads) * 100) : 0;
  const overdueFollowups = getOverdueTasks().length;
  const totalRevenue = getTotalRevenue();
  const outstandingRevenue = getOutstandingRevenue();


  // Chart Data
  const salesByPerson = [
    { name: "Sarah", deals: 8, target: 10 },
    { name: "Marcus", deals: 3, target: 5 },
    { name: "James", deals: 4, target: 6 },
  ];

  const funnelData = [
    { name: "Inquiry", value: leads.filter((l) => l.status === "new").length + deals.filter((d) => d.stage === "inquiry").length },
    { name: "Proposal", value: deals.filter((d) => d.stage === "proposal").length },
    { name: "Negotiation", value: deals.filter((d) => d.stage === "negotiation").length },
    { name: "Closed", value: dealsClosed },
  ];

  const trendData = [
    { month: "Jan", revenue: 45000, target: 50000 },
    { month: "Feb", revenue: 52000, target: 50000 },
    { month: "Mar", revenue: 48000, target: 55000 },
    { month: "Apr", revenue: 61000, target: 55000 },
    { month: "May", revenue: 58000, target: 60000 },
    { month: "Jun", revenue: 72000, target: 60000 },
  ];

  const pieData = [
    { name: "On-Time", value: tasks.filter((t) => t.status === "pending" || t.status === "in_progress").length, color: "#10B981" },
    { name: "Completed", value: tasks.filter((t) => t.status === "completed").length, color: "#66B2B2" },
    { name: "Overdue", value: overdueFollowups, color: "#EF4444" },
  ];

  const recentDeals = deals
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[32px] font-bold text-black tracking-[-0.02em]">
            Dashboard
          </h1>
          <p className="text-sm text-gray-600 mt-0.5">
            Welcome back, {user?.name}. Here&apos;s your command overview.
          </p>
        </div>
        <div className="flex items-center gap-2 text-gray-600 font-mono-tech text-xs">
          <Activity className="w-3.5 h-3.5 text-[#10B981]" />
          <span>All systems operational</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard
          label="Total Leads"
          value={totalLeads.toString()}
          delta="+3 this week"
          deltaUp={true}
          icon={Users}
          laser
        />
        <KPICard
          label="Deals Closed"
          value={dealsClosed.toString()}
          delta={`${conversionRate}% conversion`}
          deltaUp={true}
          icon={TrendingUp}
        />
        <KPICard
          label="Total Revenue"
          value={`₱${(totalRevenue / 1000).toFixed(1)}k`}
          delta={`₱${(outstandingRevenue / 1000).toFixed(1)}k outstanding`}
          deltaUp={totalRevenue > 3000}
          icon={DollarSign}
        />
        <KPICard
          label="Overdue Tasks"
          value={overdueFollowups.toString()}
          delta="Action required"
          deltaUp={false}
          icon={AlertTriangle}
          alert={overdueFollowups > 0}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Bar Chart */}
        <div className="data-card p-4">
          <h3 className="text-base font-semibold text-black mb-1">Sales Performance</h3>
          <p className="text-xs text-gray-600 mb-3">Deals closed vs target by person</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={salesByPerson} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="name" stroke="#6B7280" fontSize={11} />
              <YAxis stroke="#6B7280" fontSize={11} />
              <Tooltip
                contentStyle={{
                  background: "#FFFFFF",
                  border: "1px solid #E5E7EB",
                  borderRadius: 4,
                  fontSize: 12,
                }}
              />
              <Bar dataKey="deals" fill="#66B2B2" radius={[2, 2, 0, 0]} />
              <Bar dataKey="target" fill="#E5E7EB" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Funnel Chart */}
        <div className="data-card p-4">
          <h3 className="text-base font-semibold text-black mb-1">Pipeline Funnel</h3>
          <p className="text-xs text-gray-600 mb-3">Lead to close progression</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={funnelData} layout="vertical" barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis type="number" stroke="#6B7280" fontSize={11} />
              <YAxis dataKey="name" type="category" stroke="#6B7280" fontSize={11} width={70} />
              <Tooltip
                contentStyle={{
                  background: "#FFFFFF",
                  border: "1px solid #E5E7EB",
                  borderRadius: 4,
                  fontSize: 12,
                }}
              />
              <Bar dataKey="value" fill="#66B2B2" radius={[0, 2, 2, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div className="data-card p-4">
          <h3 className="text-base font-semibold text-black mb-1">Task Status</h3>
          <p className="text-xs text-gray-600 mb-3">Current task distribution</p>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={65}
                paddingAngle={3}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "#FFFFFF",
                  border: "1px solid #E5E7EB",
                  borderRadius: 4,
                  fontSize: 12,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-1">
            {pieData.map((d) => (
              <div key={d.name} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                <span className="text-[10px] text-gray-600">{d.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Trend Line + Recent Deals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="data-card p-4">
          <h3 className="text-base font-semibold text-black mb-1">Revenue Trend</h3>
          <p className="text-xs text-gray-600 mb-3">Monthly revenue vs target</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="month" stroke="#6B7280" fontSize={11} />
              <YAxis stroke="#6B7280" fontSize={11} />
              <Tooltip
                contentStyle={{
                  background: "#FFFFFF",
                  border: "1px solid #E5E7EB",
                  borderRadius: 4,
                  fontSize: 12,
                }}
              />
              <Line type="monotone" dataKey="revenue" stroke="#66B2B2" strokeWidth={2} dot={{ fill: "#66B2B2", r: 3 }} />
              <Line type="monotone" dataKey="target" stroke="#CBD5E1" strokeWidth={1.5} strokeDasharray="5 5" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Deals Table */}
        <div className="data-card p-4">
          <h3 className="text-base font-semibold text-black mb-1">Recent Deals</h3>
          <p className="text-xs text-gray-600 mb-3">Latest pipeline activity</p>
          <div className="overflow-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 text-gray-600 font-medium">Deal</th>
                  <th className="text-left py-2 text-gray-600 font-medium">Value</th>
                  <th className="text-left py-2 text-gray-600 font-medium">Stage</th>
                  <th className="text-left py-2 text-gray-600 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentDeals.map((deal) => (
                  <tr key={deal.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="py-2 text-black">{deal.title}</td>
                    <td className="py-2 text-[#66B2B2] font-mono-tech">
                      ₱{deal.value.toLocaleString()}
                    </td>
                    <td className="py-2 text-gray-600 capitalize">{deal.stage.replace("_", " ")}</td>
                    <td className="py-2">
                      <StageBadge stage={deal.stage} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Fleet Status Row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
        {units.slice(0, 5).map((unit) => (
          <div key={unit.id} className="data-card p-3">
            <div className="flex items-center gap-2 mb-2">
              <Radio
                className={`w-3.5 h-3.5 ${
                  unit.telemetry.status === "online"
                    ? "text-[#10B981]"
                    : unit.telemetry.status === "idle"
                    ? "text-[#F2A900]"
                    : "text-[#EF4444]"
                }`}
              />
              <span className="text-xs text-black font-medium truncate">{unit.unitName}</span>
            </div>
            <div className="font-mono-tech text-[10px] text-gray-600 space-y-0.5">
              <div>Lat: {unit.telemetry.lat.toFixed(4)}</div>
              <div>Lng: {unit.telemetry.lng.toFixed(4)}</div>
              <div>Hours: {formatHoursMinutes(unit.telemetry.hours)}</div>
              <div className="flex items-center gap-1">
                Speed: {unit.telemetry.speed} mph
                {unit.serviceDue && (
                  <span className="ml-1 px-1 py-0.5 rounded text-[9px] bg-[#EF4444]/20 text-[#EF4444]">
                    SERVICE DUE
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function KPICard({
  label,
  value,
  delta,
  deltaUp,
  icon: Icon,
  laser,
  alert,
}: {
  label: string;
  value: string;
  delta: string;
  deltaUp: boolean;
  icon: React.ElementType;
  laser?: boolean;
  alert?: boolean;
}) {
  return (
    <div className={`data-card p-4 ${laser ? "laser-scan" : ""}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-gray-600 uppercase tracking-[0.1em] font-medium">
          {label}
        </span>
        <Icon
          className={`w-4 h-4 ${alert ? "text-[#EF4444]" : "text-gray-500"}`}
        />
      </div>
      <div className={`text-4xl font-bold tracking-[-0.03em] mb-1 ${alert ? "text-[#EF4444]" : "text-black kpi-glow"}`}>
        {value}
      </div>
      <div className="flex items-center gap-1">
        {deltaUp ? (
          <ArrowUpRight className="w-3 h-3 text-[#10B981]" />
        ) : (
          <ArrowDownRight className={`w-3 h-3 ${alert ? "text-[#EF4444]" : "text-[#66B2B2]"}`} />
        )}
        <span className={`text-xs font-medium ${alert ? "text-[#EF4444]" : deltaUp ? "text-[#10B981]" : "text-[#66B2B2]"}`}>
          {delta}
        </span>
      </div>
    </div>
  );
}

function StageBadge({ stage }: { stage: string }) {
  const colors: Record<string, string> = {
    inquiry: "bg-[#66B2B2]/20 text-[#66B2B2]",
    proposal: "bg-[#8B5CF6]/20 text-[#8B5CF6]",
    negotiation: "bg-[#66B2B2]/20 text-[#66B2B2]",
    closed_won: "bg-[#10B981]/20 text-[#10B981]",
    closed_lost: "bg-[#EF4444]/20 text-[#EF4444]",
  };
  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${colors[stage] || "bg-gray-100 text-gray-600"}`}>
      {stage.replace("_", " ")}
    </span>
  );
}
