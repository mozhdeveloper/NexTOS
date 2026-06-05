import { useMemo } from "react";
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
} from "recharts";
import {
  ClipboardList,
  AlertTriangle,
  CheckCircle2,
  Wrench,
  Activity,
  ArrowRight,
  TrendingUp,
  Clock,
  History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ServiceRecord, Equipment } from "@/types";
import type { ScheduledMaintenanceEntry, TabType } from "./types";

interface DashboardTabProps {
  activeTasks: ServiceRecord[];
  allScheduledMaintenance: ScheduledMaintenanceEntry[];
  serviceRecords: ServiceRecord[];
  onViewReport: (report: ServiceRecord) => void;
  onSetActiveTab: (tab: TabType) => void;
}

export function DashboardTab({
  activeTasks,
  allScheduledMaintenance,
  serviceRecords,
  onViewReport,
  onSetActiveTab,
}: DashboardTabProps) {
  // 1. KPI Calculations
  const overdueCount = allScheduledMaintenance.filter((e) => e.status === "Overdue").length;
  const nearServiceCount = allScheduledMaintenance.filter((e) => e.status === "Near Service").length;
  const backlogCount = activeTasks.length;
  
  const completedLast30Days = useMemo(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return serviceRecords.filter(
      (r) => r.status === "completed" && r.completedDate && new Date(r.completedDate) > thirtyDaysAgo
    ).length;
  }, [serviceRecords]);

  // 2. Fleet Health Distribution (Pie Chart)
  const healthData = useMemo(() => {
    const ok = allScheduledMaintenance.filter((e) => e.status === "OK").length;
    return [
      { name: "Healthy", value: ok, color: "#10B981" },
      { name: "Near Service", value: nearServiceCount, color: "#66B2B2" },
      { name: "Overdue", value: overdueCount, color: "#EF4444" },
    ].filter(d => d.value > 0);
  }, [allScheduledMaintenance, nearServiceCount, overdueCount]);

  // 3. Service Mix (Bar Chart)
  const serviceMixData = useMemo(() => {
    const counts: Record<string, number> = {};
    serviceRecords.forEach((r) => {
      counts[r.serviceCategory] = (counts[r.serviceCategory] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [serviceRecords]);

  // 4. Critical Assets (Top 5 Overdue)
  const criticalAssets = useMemo(() => {
    return allScheduledMaintenance
      .filter((e) => e.status === "Overdue")
      .slice(0, 5);
  }, [allScheduledMaintenance]);

  // 5. Recent Activity
  const recentReports = useMemo(() => {
    return [...serviceRecords]
      .filter((r) => r.status === "completed")
      .sort((a, b) => {
        const dateA = a.completedDate ? new Date(a.completedDate).getTime() : 0;
        const dateB = b.completedDate ? new Date(b.completedDate).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, 5);
  }, [serviceRecords]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="data-card p-5 bg-white border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#66B2B2]/10 flex items-center justify-center">
            <ClipboardList className="w-6 h-6 text-[#66B2B2]" />
          </div>
          <div>
            <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Active Backlog</div>
            <div className="text-2xl font-black text-gray-900">{backlogCount} <span className="text-[10px] text-gray-400">Tasks</span></div>
          </div>
        </div>

        <div className={`data-card p-5 border flex items-center gap-4 ${overdueCount > 0 ? 'bg-red-50 border-red-100' : 'bg-white border-gray-100'}`}>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${overdueCount > 0 ? 'bg-red-100' : 'bg-green-50'}`}>
            <AlertTriangle className={`w-6 h-6 ${overdueCount > 0 ? 'text-red-600' : 'text-green-600'}`} />
          </div>
          <div>
            <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Overdue PMS</div>
            <div className={`text-2xl font-black ${overdueCount > 0 ? 'text-red-600' : 'text-green-600'}`}>{overdueCount} <span className="text-[10px] text-gray-400">Units</span></div>
          </div>
        </div>

        <div className="data-card p-5 bg-white border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Completed (30d)</div>
            <div className="text-2xl font-black text-gray-900">{completedLast30Days} <span className="text-[10px] text-gray-400">Jobs</span></div>
          </div>
        </div>

        <div className="data-card p-5 bg-white border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center">
            <Activity className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Fleet Health</div>
            <div className="text-2xl font-black text-gray-900">
              {allScheduledMaintenance.length > 0 
                ? `${Math.round(((allScheduledMaintenance.length - overdueCount) / allScheduledMaintenance.length) * 100)}%` 
                : "100%"}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Fleet Health Chart */}
        <div className="data-card p-6 bg-white">
          <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#66B2B2]" />
            Fleet Health Status
          </h3>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={healthData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {healthData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {healthData.map((d) => (
              <div key={d.name} className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-gray-500">{d.name}</span>
                </div>
                <span className="font-bold text-gray-900">{d.value} Units</span>
              </div>
            ))}
          </div>
        </div>

        {/* Service Mix Chart */}
        <div className="data-card p-6 bg-white lg:col-span-2">
          <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Wrench className="w-4 h-4 text-[#66B2B2]" />
            Top Service Categories
          </h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={serviceMixData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" stroke="#9CA3AF" fontSize={10} width={120} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: '#F9FAFB' }} />
                <Bar dataKey="value" fill="#66B2B2" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Critical Assets List */}
        <div className="data-card overflow-hidden bg-white">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              Critical Maintenance Required
            </h3>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onSetActiveTab("scheduled-maintenance")}
              className="text-[10px] font-bold text-[#66B2B2] hover:bg-[#66B2B2]/5"
            >
              View All <ArrowRight className="ml-1 w-3 h-3" />
            </Button>
          </div>
          <div className="divide-y divide-gray-50">
            {criticalAssets.length > 0 ? (
              criticalAssets.map((asset) => (
                <div key={asset.id} className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                      <Wrench className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-gray-900">{asset.equipmentName}</div>
                      <div className="text-[10px] text-gray-500 font-mono-tech uppercase">{asset.serialNumber}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-black text-red-600 uppercase tracking-tighter">Overdue</div>
                    <div className="text-[11px] text-gray-500">{asset.serviceType}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-gray-400 text-xs italic">No critical assets found. Fleet is healthy!</div>
            )}
          </div>
        </div>

        {/* Recent Activity Feed */}
        <div className="data-card overflow-hidden bg-white">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <History className="w-4 h-4 text-[#66B2B2]" />
              Recent Service Activity
            </h3>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onSetActiveTab("reports")}
              className="text-[10px] font-bold text-[#66B2B2] hover:bg-[#66B2B2]/5"
            >
              View Reports <ArrowRight className="ml-1 w-3 h-3" />
            </Button>
          </div>
          <div className="divide-y divide-gray-50">
            {recentReports.length > 0 ? (
              recentReports.map((report) => (
                <div 
                  key={report.id} 
                  className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between cursor-pointer group"
                  onClick={() => onViewReport(report)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-gray-900 group-hover:text-[#66B2B2] transition-colors">{report.serviceCategory}</div>
                      <div className="text-[10px] text-gray-500 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {report.completedDate ? new Date(report.completedDate).toLocaleDateString() : '—'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Technician</div>
                    <div className="text-[11px] text-gray-900 font-bold">{report.technician}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-gray-400 text-xs italic">No recent activity recorded.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
