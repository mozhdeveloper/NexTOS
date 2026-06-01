import { useMemo } from "react";
import { useCRMStore } from "@/features/crm/useCRMStore";
import { useBillingStore } from "@/features/billing/useBillingStore";
import { useOperationsStore } from "@/stores/useOperationsStore";
import type { Deal, Task, Lead, Client, Invoice } from "@/types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import {
  TrendingUp,
  Users,
  DollarSign,
  AlertTriangle,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Clock,
  Building2,
  Calendar,
  Activity,
  Zap,
} from "lucide-react";

// ─── KPI Card ───────────────────────────────────────────────
function KPICard({
  label,
  value,
  delta,
  deltaUp,
  icon: Icon,
  accent,
  alert,
}: {
  label: string;
  value: string;
  delta: string;
  deltaUp: boolean;
  icon: React.ElementType;
  accent?: string;
  alert?: boolean;
}) {
  return (
    <div
      className={`data-card p-4 ${alert ? "border-[#EF4444]/20 bg-[#EF4444]/5" : ""}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-gray-500 uppercase tracking-[0.1em] font-medium">
          {label}
        </span>
        <div
          className={`w-7 h-7 rounded-lg flex items-center justify-center ${alert ? "bg-[#EF4444]/10" : "bg-[#66B2B2]/10"}`}
        >
          <Icon
            className={`w-3.5 h-3.5 ${alert ? "text-[#EF4444]" : accent || "text-[#66B2B2]"}`}
          />
        </div>
      </div>
      <div
        className={`text-2xl font-bold tracking-[-0.02em] mb-1 ${alert ? "text-[#EF4444]" : "text-gray-900"}`}
      >
        {value}
      </div>
      <div className="flex items-center gap-1">
        {deltaUp ? (
          <ArrowUpRight className="w-3 h-3 text-[#10B981]" />
        ) : (
          <ArrowDownRight
            className={`w-3 h-3 ${alert ? "text-[#EF4444]" : "text-gray-400"}`}
          />
        )}
        <span
          className={`text-[10px] font-medium ${alert ? "text-[#EF4444]" : deltaUp ? "text-[#10B981]" : "text-gray-500"}`}
        >
          {delta}
        </span>
      </div>
    </div>
  );
}

// ─── Pipeline Stage Badge ───────────────────────────────────
function StageBadge({ stage }: { stage: string }) {
  const colors: Record<string, string> = {
    inquiry: "bg-[#66B2B2]/10 text-[#66B2B2]",
    proposal: "bg-[#8B5CF6]/10 text-[#8B5CF6]",
    negotiation: "bg-[#66B2B2]/10 text-[#66B2B2]",
    closed_won: "bg-[#10B981]/10 text-[#10B981]",
    closed_lost: "bg-[#EF4444]/10 text-[#EF4444]",
  };
  return (
    <span
      className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${colors[stage] || "bg-gray-100 text-gray-500"}`}
    >
      {stage.replace("_", " ")}
    </span>
  );
}

// ─── Priority Dot ───────────────────────────────────────────
function PriorityDot({ priority }: { priority: string }) {
  const c =
    priority === "high"
      ? "#EF4444"
      : priority === "medium"
        ? "#66B2B2"
        : "#D1D5DB";
  return (
    <div
      className="w-1.5 h-1.5 rounded-full shrink-0"
      style={{ background: c }}
    />
  );
}

// ─── Chart Tooltip Style ────────────────────────────────────
const tooltipStyle = {
  background: "#FFFFFF",
  border: "1px solid #E5E7EB",
  borderRadius: 6,
  fontSize: 12,
};

// ─── Main Component ─────────────────────────────────────────
export default function CRMDashboard() {
  const { clients, deals, tasks, leads, getOverdueTasks } = useCRMStore();
  const { invoices, getTotalRevenue, getOutstandingRevenue } =
    useBillingStore();
  const { serviceRecords, equipment } = useOperationsStore();

  // ── KPI Metrics ──
  const metrics = useMemo(() => {
    const totalPipeline = deals
      .filter(d => d.stage !== "closed_lost")
      .reduce((s, d) => s + d.value, 0);
    const weightedPipeline = deals
      .filter(d => d.stage !== "closed_lost" && d.stage !== "closed_won")
      .reduce((s, d) => s + (d.value * d.probability) / 100, 0);
    const wonDeals = deals.filter(d => d.stage === "closed_won");
    const wonValue = wonDeals.reduce((s, d) => s + d.value, 0);
    const activeDeals = deals.filter(
      d => d.stage !== "closed_won" && d.stage !== "closed_lost"
    );
    const overdue = getOverdueTasks();
    const activeClients = clients.filter(c => c.status === "active").length;
    const qualifiedLeads = leads.filter(l => l.status === "qualified").length;
    const totalRevenue = getTotalRevenue();
    const outstanding = getOutstandingRevenue();

    return {
      totalPipeline,
      weightedPipeline,
      wonDeals: wonDeals.length,
      wonValue,
      activeDeals: activeDeals.length,
      overdueTasks: overdue.length,
      overdueList: overdue,
      activeClients,
      qualifiedLeads,
      totalLeads: leads.length,
      totalRevenue,
      outstanding,
      conversionRate:
        leads.length > 0
          ? Math.round((wonDeals.length / leads.length) * 100)
          : 0,
    };
  }, [clients, deals, tasks, leads, invoices]);

  // ── Pipeline Distribution ──
  const pipelineData = useMemo(() => {
    const stages = [
      { id: "inquiry", label: "Inquiry", color: "#66B2B2" },
      { id: "proposal", label: "Proposal", color: "#8B5CF6" },
      { id: "negotiation", label: "Negotiation", color: "#F59E0B" },
      { id: "closed_won", label: "Won", color: "#10B981" },
      { id: "closed_lost", label: "Lost", color: "#EF4444" },
    ];
    return stages.map(s => ({
      name: s.label,
      value: deals.filter(d => d.stage === s.id).length,
      revenue: deals
        .filter(d => d.stage === s.id)
        .reduce((sum, d) => sum + d.value, 0),
      color: s.color,
    }));
  }, [deals]);

  // ── Lead Source Distribution ──
  const leadSourceData = useMemo(() => {
    const sources: Record<string, number> = {};
    leads.forEach(l => {
      sources[l.source] = (sources[l.source] || 0) + 1;
    });
    const colors = [
      "#66B2B2",
      "#8B5CF6",
      "#10B981",
      "#F59E0B",
      "#EF4444",
      "#6366F1",
      "#EC4899",
    ];
    return Object.entries(sources).map(([name, value], i) => ({
      name,
      value,
      color: colors[i % colors.length],
    }));
  }, [leads]);

  // ── Monthly Revenue Trend (mock months) ──
  const revenueTrend = useMemo(
    () => [
      { month: "Jan", revenue: 42000, target: 50000 },
      { month: "Feb", revenue: 56000, target: 50000 },
      { month: "Mar", revenue: 48000, target: 55000 },
      { month: "Apr", revenue: 63000, target: 55000 },
      { month: "May", revenue: 71000, target: 60000 },
      { month: "Jun", revenue: metrics.totalRevenue || 77500, target: 65000 },
    ],
    [metrics.totalRevenue]
  );

  // ── Top Deals ──
  const topDeals = useMemo(
    () =>
      [...deals]
        .filter(d => d.stage !== "closed_lost")
        .sort((a, b) => b.value - a.value)
        .slice(0, 5),
    [deals]
  );

  // ── Urgent Tasks ──
  const urgentTasks = useMemo(
    () =>
      tasks
        .filter(t => t.status !== "completed" && t.priority === "high")
        .slice(0, 6),
    [tasks]
  );

  // ── Client Health ──
  const clientHealth = useMemo(
    () =>
      clients
        .filter(c => c.status === "active")
        .map(c => {
          const clientDeals = deals.filter(d => d.clientId === c.id);
          const clientInvoices = invoices.filter(i => i.clientId === c.id);
          const overdue = clientInvoices.filter(
            i => i.status === "overdue"
          ).length;
          const paidTotal = clientInvoices
            .filter(i => i.status === "paid")
            .reduce((s, i) => s + i.total, 0);
          return {
            ...c,
            dealCount: clientDeals.length,
            overdueInvoices: overdue,
            paidTotal,
          };
        })
        .slice(0, 4),
    [clients, deals, invoices]
  );

  // ── Activity Feed (mock, based on recent tasks/deals) ──
  const activityFeed = useMemo(() => {
    const items: {
      id: string;
      icon: React.ElementType;
      iconColor: string;
      text: string;
      time: string;
    }[] = [];
    deals
      .filter(d => d.stage === "closed_won")
      .slice(0, 2)
      .forEach(d => {
        const client = clients.find(c => c.id === d.clientId);
        items.push({
          id: `deal-${d.id}`,
          icon: CheckCircle2,
          iconColor: "text-[#10B981]",
          text: `${d.title} closed — ₱${d.value.toLocaleString()}`,
          time: client?.companyName || "Client",
        });
      });
    tasks
      .filter(t => t.status === "overdue")
      .slice(0, 2)
      .forEach(t => {
        items.push({
          id: `task-${t.id}`,
          icon: AlertTriangle,
          iconColor: "text-[#EF4444]",
          text: t.title,
          time: `Overdue • ${t.assignedTo}`,
        });
      });
    leads
      .filter(l => l.status === "new")
      .slice(0, 2)
      .forEach(l => {
        items.push({
          id: `lead-${l.id}`,
          icon: Zap,
          iconColor: "text-[#8B5CF6]",
          text: `New lead from ${l.source}`,
          time: l.notes,
        });
      });
    return items.slice(0, 6);
  }, [deals, tasks, leads, clients]);

  return (
    <div className="space-y-5 animate-in fade-in duration-500">
      {/* ── KPI Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard
          label="Pipeline Value"
          value={`₱${(metrics.totalPipeline / 1000).toFixed(0)}k`}
          delta={`₱${(metrics.weightedPipeline / 1000).toFixed(0)}k weighted`}
          deltaUp={true}
          icon={TrendingUp}
        />
        <KPICard
          label="Active Clients"
          value={metrics.activeClients.toString()}
          delta={`${metrics.qualifiedLeads} qualified leads`}
          deltaUp={true}
          icon={Users}
        />
        <KPICard
          label="Revenue Collected"
          value={`₱${(metrics.totalRevenue / 1000).toFixed(1)}k`}
          delta={`₱${(metrics.outstanding / 1000).toFixed(1)}k outstanding`}
          deltaUp={metrics.totalRevenue > metrics.outstanding}
          icon={DollarSign}
        />
        <KPICard
          label="Overdue Tasks"
          value={metrics.overdueTasks.toString()}
          delta="Immediate action needed"
          deltaUp={false}
          icon={AlertTriangle}
          alert={metrics.overdueTasks > 0}
        />
      </div>

      {/* ── Secondary KPIs ── */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          {
            label: "Open Deals",
            value: metrics.activeDeals.toString(),
            color: "text-[#66B2B2]",
          },
          {
            label: "Won Deals",
            value: metrics.wonDeals.toString(),
            color: "text-[#10B981]",
          },
          {
            label: "Conversion",
            value: `${metrics.conversionRate}%`,
            color: "text-[#8B5CF6]",
          },
          {
            label: "Total Leads",
            value: metrics.totalLeads.toString(),
            color: "text-gray-900",
          },
          {
            label: "Equipment",
            value: equipment.length.toString(),
            color: "text-[#66B2B2]",
          },
          {
            label: "Services Done",
            value: serviceRecords
              .filter(s => s.status === "completed")
              .length.toString(),
            color: "text-[#10B981]",
          },
        ].map(item => (
          <div key={item.label} className="data-card p-3 text-center">
            <div className="text-[9px] text-gray-500 uppercase tracking-[0.1em] font-medium mb-1">
              {item.label}
            </div>
            <div className={`text-lg font-bold ${item.color} font-mono-tech`}>
              {item.value}
            </div>
          </div>
        ))}
      </div>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Revenue Trend */}
        <div className="data-card p-4 lg:col-span-2">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold text-gray-900">
              Revenue Trend
            </h3>
            <span className="text-[10px] text-gray-500 font-mono-tech">
              Last 6 months
            </span>
          </div>
          <p className="text-[10px] text-gray-500 mb-3">
            Monthly collected vs target
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={revenueTrend}>
              <defs>
                <linearGradient id="crmRevGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#66B2B2" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#66B2B2" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="month" stroke="#6B7280" fontSize={11} />
              <YAxis
                stroke="#6B7280"
                fontSize={11}
                tickFormatter={(v: number) => `${v / 1000}k`}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value: number) => [
                  `₱${value.toLocaleString()}`,
                  "",
                ]}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#66B2B2"
                strokeWidth={2}
                fill="url(#crmRevGrad)"
                dot={{ fill: "#66B2B2", r: 3 }}
              />
              <Area
                type="monotone"
                dataKey="target"
                stroke="#D1D5DB"
                strokeWidth={1.5}
                strokeDasharray="5 5"
                fill="none"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Lead Sources Pie */}
        <div className="data-card p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">
            Lead Sources
          </h3>
          <p className="text-[10px] text-gray-500 mb-3">
            Distribution by channel
          </p>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={leadSourceData}
                cx="50%"
                cy="50%"
                innerRadius={38}
                outerRadius={62}
                paddingAngle={3}
                dataKey="value"
              >
                {leadSourceData.map((entry, i) => (
                  <Cell key={`ls-${i}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-1">
            {leadSourceData.map(d => (
              <div key={d.name} className="flex items-center gap-1">
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: d.color }}
                />
                <span className="text-[9px] text-gray-500">
                  {d.name} ({d.value})
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Pipeline + Activity ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Pipeline Breakdown */}
        <div className="data-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Target className="w-4 h-4 text-[#66B2B2]" />
            <h3 className="text-sm font-semibold text-gray-900">
              Pipeline Breakdown
            </h3>
          </div>
          <p className="text-[10px] text-gray-500 mb-3">
            Deals & revenue by stage
          </p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={pipelineData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="name" stroke="#6B7280" fontSize={10} />
              <YAxis stroke="#6B7280" fontSize={10} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="value" name="Deals" radius={[3, 3, 0, 0]}>
                {pipelineData.map((entry, i) => (
                  <Cell key={`pc-${i}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Activity Feed */}
        <div className="data-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-4 h-4 text-[#66B2B2]" />
            <h3 className="text-sm font-semibold text-gray-900">
              Recent Activity
            </h3>
          </div>
          <p className="text-[10px] text-gray-500 mb-3">Latest CRM events</p>
          <div className="space-y-2.5">
            {activityFeed.map(item => (
              <div
                key={item.id}
                className="flex items-start gap-2.5 p-2 rounded hover:bg-gray-50 transition-colors"
              >
                <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
                  <item.icon className={`w-3 h-3 ${item.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-black font-medium truncate">
                    {item.text}
                  </div>
                  <div className="text-[10px] text-gray-500 truncate">
                    {item.time}
                  </div>
                </div>
              </div>
            ))}
            {activityFeed.length === 0 && (
              <div className="text-center py-6 text-[10px] text-gray-400">
                No recent activity
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Top Deals + Urgent Tasks ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Top Deals */}
        <div className="data-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-[#66B2B2]" />
            <h3 className="text-sm font-semibold text-gray-900">Top Deals</h3>
          </div>
          <p className="text-[10px] text-gray-500 mb-3">
            Highest value opportunities
          </p>
          <div className="overflow-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 text-gray-500 font-medium">
                    Deal
                  </th>
                  <th className="text-left py-2 text-gray-500 font-medium">
                    Value
                  </th>
                  <th className="text-left py-2 text-gray-500 font-medium">
                    Stage
                  </th>
                  <th className="text-right py-2 text-gray-500 font-medium">
                    Prob.
                  </th>
                </tr>
              </thead>
              <tbody>
                {topDeals.map(deal => {
                  const client = clients.find(c => c.id === deal.clientId);
                  return (
                    <tr
                      key={deal.id}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-2">
                        <div className="text-black font-medium">
                          {deal.title}
                        </div>
                        <div className="text-[10px] text-gray-500">
                          {client?.companyName}
                        </div>
                      </td>
                      <td className="py-2 text-[#66B2B2] font-mono-tech font-bold">
                        ₱{deal.value.toLocaleString()}
                      </td>
                      <td className="py-2">
                        <StageBadge stage={deal.stage} />
                      </td>
                      <td className="py-2 text-right text-gray-600 font-mono-tech">
                        {deal.probability}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Urgent Tasks */}
        <div className="data-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-[#EF4444]" />
            <h3 className="text-sm font-semibold text-gray-900">
              High Priority Tasks
            </h3>
          </div>
          <p className="text-[10px] text-gray-500 mb-3">
            Requires immediate attention
          </p>
          <div className="space-y-1.5">
            {urgentTasks.map(task => (
              <div
                key={task.id}
                className={`flex items-center gap-2.5 p-2 rounded border border-gray-200 ${
                  task.status === "overdue"
                    ? "border-l-2 border-l-[#EF4444] bg-[#EF4444]/5"
                    : "border-l-2 border-l-[#66B2B2]"
                } hover:bg-gray-50 transition-colors`}
              >
                <PriorityDot priority={task.priority} />
                <div className="flex-1 min-w-0">
                  <div
                    className={`text-xs font-medium truncate ${task.status === "overdue" ? "text-[#EF4444]" : "text-black"}`}
                  >
                    {task.title}
                  </div>
                  <div className="text-[10px] text-gray-500 truncate">
                    {task.assignedTo} •{" "}
                    {new Date(task.dueDate).toLocaleDateString()}
                  </div>
                </div>
                {task.status === "overdue" && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#EF4444]/10 text-[#EF4444] uppercase shrink-0">
                    Overdue
                  </span>
                )}
              </div>
            ))}
            {urgentTasks.length === 0 && (
              <div className="text-center py-6 text-[10px] text-gray-400">
                No high-priority tasks
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Client Health Overview ── */}
      <div className="data-card p-4">
        <div className="flex items-center gap-2 mb-1">
          <Building2 className="w-4 h-4 text-[#66B2B2]" />
          <h3 className="text-sm font-semibold text-gray-900">
            Client Health Overview
          </h3>
        </div>
        <p className="text-[10px] text-gray-500 mb-3">
          Active client status & billing summary
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {clientHealth.map(c => (
            <div
              key={c.id}
              className="p-3 rounded-lg border border-gray-200 hover:border-[#66B2B2]/30 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded bg-[#66B2B2]/10 flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-[#66B2B2]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-black truncate">
                    {c.companyName}
                  </div>
                  <div className="text-[10px] text-gray-500">{c.industry}</div>
                </div>
              </div>
              <div className="space-y-1.5 mt-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-500">Deals</span>
                  <span className="text-[10px] font-bold text-black font-mono-tech">
                    {c.dealCount}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-500">Revenue</span>
                  <span className="text-[10px] font-bold text-[#66B2B2] font-mono-tech">
                    ₱{c.paidTotal.toLocaleString()}
                  </span>
                </div>
                {c.overdueInvoices > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-[#EF4444]">Overdue</span>
                    <span className="text-[10px] font-bold text-[#EF4444] font-mono-tech">
                      {c.overdueInvoices} invoice(s)
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-500">Contract</span>
                  <span className="text-[10px] font-bold text-black font-mono-tech">
                    ₱{c.contractValue.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
