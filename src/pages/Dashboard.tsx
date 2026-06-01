import { useMemo } from "react";
import { useNavigate } from "react-router";
import { useCRMStore } from "@/stores/useCRMStore";
import { useBillingStore } from "@/stores/useBillingStore";
import { useFleetStore } from "@/stores/useFleetStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { useOperationsStore } from "@/stores/useOperationsStore";
import { useInventoryStore } from "@/stores/useInventoryStore";
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
  UserCheck,
  ShieldCheck,
  Wrench,
  Clock,
  CheckCircle2,
  Box,
  ArrowRight,
  Trophy,
  Medal,
  Star
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { deals, tasks, leads, getOverdueTasks } = useCRMStore();
  const { getTotalRevenue, getOutstandingRevenue } = useBillingStore();
  const { units } = useFleetStore();
  const { serviceRecords, equipment } = useOperationsStore();
  const { getLowStockItems } = useInventoryStore();

  const lowStockItems = getLowStockItems();

  // KPI Calculations
  const totalLeads = leads.length;
  const dealsClosed = deals.filter((d) => d.stage === "closed_won").length;
  const conversionRate = totalLeads > 0 ? Math.round((dealsClosed / totalLeads) * 100) : 0;
  
  // Safety Compliance Calculation
  const completedServices = serviceRecords.filter(s => s.status === "completed");
  const servicesWithSafety = completedServices.filter(s => s.safetyChecklist);
  
  const safetyRate = servicesWithSafety.length > 0 
    ? Math.round((servicesWithSafety.length / completedServices.length) * 100)
    : 100;

  const totalRevenue = getTotalRevenue();
  const outstandingRevenue = getOutstandingRevenue();

  const totalOverdueEquipment = equipment.filter(e => e.status === 'service_due').length;

  // Top Technician Calculation
  const topTech = useMemo(() => {
    const techStats: Record<string, { name: string; jobs: number; safety: number; safetyCount: number }> = {};
    serviceRecords.forEach(s => {
      if (s.status !== "completed") return;
      if (!techStats[s.technician]) {
        techStats[s.technician] = { name: s.technician, jobs: 0, safety: 0, safetyCount: 0 };
      }
      techStats[s.technician].jobs++;
      if (s.safetyChecklist) {
        techStats[s.technician].safetyCount++;
        let score = 0;
        if (s.safetyChecklist.ppeChecked) score += 25;
        if (s.safetyChecklist.engineOff) score += 25;
        if (s.safetyChecklist.areaSecured) score += 25;
        if (s.safetyChecklist.lotoApplied) score += 25;
        techStats[s.technician].safety += score;
      }
    });

    const techs = Object.values(techStats).map(t => ({
      ...t,
      avgSafety: t.safetyCount > 0 ? t.safety / t.safetyCount : 100,
      powerScore: (t.safetyCount > 0 ? (t.safety / t.safetyCount) * 0.6 : 60) + (Math.min(t.jobs, 10) * 4)
    })).sort((a, b) => b.powerScore - a.powerScore);

    return techs[0] || null;
  }, [serviceRecords]);

  // Chart Data
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
    { name: "Overdue", value: getOverdueTasks().length, color: "#EF4444" },
  ];

  return (
    <div className="space-y-5 ">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[32px] font-bold text-gray-900 tracking-[-0.02em]">
            Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Welcome back, {user?.name}. Here&apos;s your command overview.
          </p>
        </div>
        <div className="flex items-center gap-2 text-gray-500 font-mono-tech text-xs">
          <Activity className="w-3.5 h-3.5 text-[#10B981]" />
          <span>All systems operational</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard
          label="Fleet Health"
          value={`${Math.round(((equipment.length - totalOverdueEquipment) / equipment.length) * 100)}%`}
          delta={`${totalOverdueEquipment} units due`}
          deltaUp={totalOverdueEquipment === 0}
          icon={ShieldCheck}
          laser
          alert={totalOverdueEquipment > 0}
        />
        <KPICard
          label="Safety Compliance"
          value={`${safetyRate}%`}
          delta="Audit pass rate"
          deltaUp={safetyRate > 90}
          icon={UserCheck}
        />
        <KPICard
          label="Total Revenue"
          value={`$${(totalRevenue / 1000).toFixed(1)}k`}
          delta={`$${(outstandingRevenue / 1000).toFixed(1)}k outstanding`}
          deltaUp={totalRevenue > 3000}
          icon={DollarSign}
        />
        <KPICard
          label="Maintenance Alerts"
          value={totalOverdueEquipment.toString()}
          delta="Critical service risk"
          deltaUp={totalOverdueEquipment === 0}
          icon={Wrench}
          alert={totalOverdueEquipment > 0}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Bar Chart */}
        <div className="data-card p-4">
          <div className="flex items-center justify-between mb-3">
             <div>
                <h3 className="text-base font-semibold text-gray-900 mb-1">Fleet Utilization</h3>
                <p className="text-xs text-gray-500">Operating hours vs target by unit</p>
             </div>
             <Activity className="w-4 h-4 text-[#66B2B2]" />
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={units.slice(0, 5).map(u => ({ name: u.unitName.split('-')[1] || u.unitName, hours: Math.floor(u.telemetry.hours), target: 160 }))} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="name" stroke="#6B7280" fontSize={11} />
              <YAxis stroke="#6B7280" fontSize={11} />
              <Tooltip
                contentStyle={{
                  background: "#FFFFFF",
                  border: "1px solid #E5E7EB",
                  borderRadius: 6,
                  fontSize: 12,
                }}
              />
              <Bar dataKey="hours" fill="#66B2B2" radius={[2, 2, 0, 0]} />
              <Bar dataKey="target" fill="#E5E7EB" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Funnel Chart - Pipeline */}
        <div className="data-card p-4">
          <h3 className="text-base font-semibold text-gray-900 mb-1">Sales Funnel</h3>
          <p className="text-xs text-gray-500 mb-3">Lead to close progression</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={funnelData} layout="vertical" barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis type="number" stroke="#6B7280" fontSize={11} />
              <YAxis dataKey="name" type="category" stroke="#6B7280" fontSize={11} width={70} />
              <Tooltip
                contentStyle={{
                  background: "#FFFFFF",
                  border: "1px solid #E5E7EB",
                  borderRadius: 6,
                  fontSize: 12,
                }}
              />
              <Bar dataKey="value" fill="#66B2B2" radius={[0, 2, 2, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Maintenance Activity Feed */}
        <div className="data-card p-4">
          <div className="flex items-center justify-between mb-3">
             <h3 className="text-base font-semibold text-gray-900">Maintenance Feed</h3>
             <span className="text-[10px] font-black text-[#66B2B2] bg-[#66B2B2]/5 px-2 py-0.5 rounded-full uppercase tracking-tighter">Live Updates</span>
          </div>
          <div className="space-y-4 max-h-[220px] overflow-auto scrollbar-hide">
            {serviceRecords.slice().reverse().slice(0, 5).map((record, i) => (
              <div key={record.id} className="flex gap-3 relative">
                {i < 4 && <div className="absolute left-[13px] top-7 bottom-0 w-[1px] bg-gray-100" />}
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 z-10 ${
                  record.status === 'completed' ? 'bg-green-50 border border-green-100' : 'bg-amber-50 border border-amber-100'
                }`}>
                  {record.status === 'completed' ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <Clock className="w-3.5 h-3.5 text-amber-500" />}
                </div>
                <div>
                   <div className="text-[11px] font-bold text-gray-900">
                      {record.technician} {record.status === 'completed' ? 'finalized' : 'started'} {record.serviceCategory}
                   </div>
                   <div className="text-[10px] text-gray-400 mt-0.5">
                      {equipment.find(e => e.id === record.equipmentId)?.name || 'Unknown Asset'} • {new Date(record.completedDate || record.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                   </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
             <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Global Status</div>
             <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] font-black text-green-600 uppercase">Operational</span>
             </div>
          </div>
        </div>
      </div>

      {/* Trend Line + Maintenance Priority */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="data-card p-4">
          <h3 className="text-base font-semibold text-gray-900 mb-1">Revenue Trend</h3>
          <p className="text-xs text-gray-500 mb-3">Monthly revenue vs target</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="month" stroke="#6B7280" fontSize={11} />
              <YAxis stroke="#6B7280" fontSize={11} />
              <Tooltip
                contentStyle={{
                  background: "#FFFFFF",
                  border: "1px solid #E5E7EB",
                  borderRadius: 6,
                  fontSize: 12,
                }}
              />
              <Line type="monotone" dataKey="revenue" stroke="#66B2B2" strokeWidth={2} dot={{ fill: "#66B2B2", r: 3 }} />
              <Line type="monotone" dataKey="target" stroke="#D1D5DB" strokeWidth={1.5} strokeDasharray="5 5" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Maintenance Priority Table */}
        <div className="data-card p-4">
          <div className="flex items-center justify-between mb-1">
             <h3 className="text-base font-semibold text-gray-900">Maintenance Priority</h3>
             <span className="text-[10px] font-black text-red-600 bg-red-50 px-2 py-0.5 rounded-full uppercase tracking-tighter">High Risk</span>
          </div>
          <p className="text-xs text-gray-500 mb-3">Units requiring immediate attention</p>
          <div className="overflow-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 text-gray-400 font-medium uppercase tracking-wider text-[9px]">
                  <th className="text-left py-2">Asset ID</th>
                  <th className="text-left py-2">Current</th>
                  <th className="text-left py-2">Threshold</th>
                  <th className="text-left py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {equipment.filter(e => e.status === 'service_due').slice(0, 5).map((eq) => (
                  <tr key={eq.id} className="border-b border-gray-100 hover:bg-gray-50 group">
                    <td className="py-2">
                       <div className="font-bold text-gray-900">{eq.name ?? eq.id}</div>
                       <div className="text-[10px] text-gray-400">{eq.equipmentType}</div>
                    </td>
                    <td className="py-2 font-mono-tech font-bold text-gray-700">{eq.hoursTotal ?? "—"}</td>
                    <td className="py-2 font-mono-tech text-gray-400">{eq.pmsConfiguration?.[0]?.serviceInterval ?? "—"}h</td>
                    <td className="py-2">
                      <span className={`px-1.5 py-0.5 rounded-[4px] text-[9px] font-black uppercase tracking-tighter ${
                        eq.status === 'service_due' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-amber-50 text-amber-600 border border-amber-100'
                      }`}>
                        {eq.status === 'service_due' ? 'Overdue' : 'Due Soon'}
                      </span>
                    </td>
                  </tr>
                ))}
                {equipment.filter(e => e.status === 'service_due').length === 0 && (
                   <tr>
                      <td colSpan={4} className="py-10 text-center text-gray-400 italic">All fleet assets operational.</td>
                   </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Logistics & Alerts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
         {/* Low Stock Alerts */}
         <div className="data-card p-4 border-amber-100 bg-amber-50/20">
            <div className="flex items-center justify-between mb-3">
               <div className="flex items-center gap-2">
                  <Box className="w-4 h-4 text-amber-600" />
                  <h3 className="text-base font-semibold text-gray-900">Inventory Health</h3>
               </div>
               {lowStockItems.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[9px] font-black uppercase">Low Stock: {lowStockItems.length}</span>
               )}
            </div>
            <div className="space-y-3">
               {lowStockItems.length > 0 ? lowStockItems.slice(0, 3).map(item => (
                  <div key={item.id} className="p-3 rounded-xl bg-white border border-amber-100 shadow-sm flex items-center justify-between">
                     <div>
                        <div className="text-[11px] font-bold text-gray-900">{item.name}</div>
                        <div className="text-[9px] text-gray-400 font-mono-tech">{item.partNumber}</div>
                     </div>
                     <div className="text-right">
                        <div className="text-xs font-black text-amber-600">{item.stockLevel} {item.unit}</div>
                        <div className="text-[8px] text-gray-400 uppercase font-bold">Target: {item.minThreshold}</div>
                     </div>
                  </div>
               )) : (
                  <div className="py-8 text-center text-gray-400 italic text-xs">
                     All stock levels within nominal range.
                  </div>
               )}
               <Button
                  variant="ghost"
                  className="w-full mt-2 h-8 text-[10px] font-bold text-amber-700 hover:bg-amber-100/50 rounded-lg"
                  onClick={() => navigate('/inventory')}
               >
                  Manage Inventory <ArrowRight className="w-3 h-3 ml-1.5" />
               </Button>
            </div>
         </div>

         {/* Top Notcher Spotlight - NEW */}
         <div className="data-card p-4 relative overflow-hidden bg-gradient-to-br from-amber-500/5 to-transparent border-amber-200">
            <div className="absolute top-2 right-2">
               <Trophy className="w-12 h-12 text-amber-500/10 -rotate-12" />
            </div>
            <div className="flex items-center justify-between mb-4">
               <div className="flex items-center gap-2">
                  <Medal className="w-4 h-4 text-amber-600" />
                  <h3 className="text-base font-semibold text-gray-900">Top Notcher</h3>
               </div>
               <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[9px] font-black uppercase tracking-tighter">Elite Performer</span>
            </div>
            
            {topTech ? (
               <div className="space-y-4">
                  <div className="flex items-center gap-3">
                     <div className="w-12 h-12 rounded-2xl bg-amber-500 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-amber-500/20">
                        {topTech.name.charAt(0)}
                     </div>
                     <div>
                        <div className="text-sm font-black text-gray-900">{topTech.name}</div>
                        <div className="flex items-center gap-1 text-[10px] text-amber-600 font-bold uppercase tracking-widest">
                           <Star className="w-2.5 h-2.5 fill-amber-500" />
                           Top Performer
                        </div>
                     </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                     <div className="p-2 rounded-lg bg-white border border-gray-100">
                        <div className="text-[9px] text-gray-400 uppercase font-bold">Power Score</div>
                        <div className="text-sm font-black text-gray-900">{topTech.powerScore.toFixed(0)}</div>
                     </div>
                     <div className="p-2 rounded-lg bg-white border border-gray-100">
                        <div className="text-[9px] text-gray-400 uppercase font-bold">Safety</div>
                        <div className="text-sm font-black text-green-600">{topTech.avgSafety.toFixed(0)}%</div>
                     </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                     <div className="text-[10px] text-gray-400 font-bold uppercase">{topTech.jobs} Jobs Completed</div>
                     <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map(i => (
                           <Star key={i} className={`w-2 h-2 ${i <= 5 ? 'text-amber-500 fill-amber-500' : 'text-gray-200'}`} />
                        ))}
                     </div>
                  </div>
               </div>
            ) : (
               <div className="py-12 text-center text-gray-400 italic text-xs">
                  Awaiting performance data...
               </div>
            )}
         </div>

         {/* Sales Pipeline Funnel */}
         <div className="data-card p-4">
            <div className="flex items-center justify-between mb-3">
               <h3 className="text-base font-semibold text-gray-900">Sales Pipeline</h3>
               <TrendingUp className="w-4 h-4 text-[#66B2B2]" />
            </div>
            <ResponsiveContainer width="100%" height={160}>
               <BarChart data={funnelData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" stroke="#6B7280" fontSize={11} width={80} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="value" fill="#66B2B2" radius={[0, 4, 4, 0]} barSize={20} />
               </BarChart>
            </ResponsiveContainer>
         </div>
      </div>

      {/* Fleet Status Row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
        {units.slice(0, 5).map((unit) => {
          const eq = equipment.find(e => e.id === unit.equipmentId);
          return (
            <div key={unit.id} className="data-card p-3 relative overflow-hidden group">
              {unit.serviceDue && <div className="absolute top-0 right-0 w-8 h-8 bg-red-500/10 rounded-bl-full flex items-center justify-center"><AlertTriangle className="w-3 h-3 text-red-500" /></div>}
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-1.5 h-1.5 rounded-full ${
                  unit.telemetry.status === "online" ? "bg-[#10B981] animate-pulse" : unit.telemetry.status === "idle" ? "bg-[#66B2B2]" : "bg-[#EF4444]"
                }`} />
                <span className="text-xs text-gray-900 font-black truncate uppercase tracking-tight">{unit.unitName}</span>
              </div>
              <div className="font-mono-tech text-[10px] text-gray-500 space-y-0.5">
                <div className="flex justify-between"><span>LAT:</span> <span className="text-gray-900">{unit.telemetry.lat.toFixed(3)}</span></div>
                <div className="flex justify-between"><span>LNG:</span> <span className="text-gray-900">{unit.telemetry.lng.toFixed(3)}</span></div>
                <div className="flex justify-between"><span>HRS:</span> <span className={`${unit.serviceDue ? 'text-red-500 font-bold' : 'text-[#66B2B2]'}`}>{Math.floor(unit.telemetry.hours)}</span></div>
                <div className="flex items-center justify-between pt-1 mt-1 border-t border-gray-50">
                  <span className="uppercase text-[8px] font-black text-gray-300">Telemetry</span>
                  <div className="flex items-center gap-1 text-gray-900 font-bold">
                    {unit.telemetry.speed} <span className="text-[8px] text-gray-400">MPH</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
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
        <span className="text-[10px] text-gray-500 uppercase tracking-[0.1em] font-medium">
          {label}
        </span>
        <Icon
          className={`w-4 h-4 ${alert ? "text-[#EF4444]" : "text-gray-400"}`}
        />
      </div>
      <div className={` text-4xl font-bold tracking-[-0.03em] mb-1 ${alert ? "text-[#EF4444]" : "text-gray-900 kpi-glow"}`}>
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
    inquiry: "bg-[#66B2B2]/10 text-[#66B2B2]",
    proposal: "bg-[#8B5CF6]/10 text-[#8B5CF6]",
    negotiation: "bg-[#66B2B2]/10 text-[#66B2B2]",
    closed_won: "bg-[#10B981]/10 text-[#10B981]",
    closed_lost: "bg-[#EF4444]/10 text-[#EF4444]",
  };
  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${colors[stage] || "bg-gray-100 text-gray-500"}`}>
      {stage.replace("_", " ")}
    </span>
  );
}
