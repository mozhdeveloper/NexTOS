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
} from "recharts";
import {
  TrendingUp,
  Users,
  Wrench,
  DollarSign,
  Calendar,
} from "lucide-react";

export default function Reports() {
  const { clients, deals, leads, tasks } = useCRMStore();
  const { equipment, serviceRecords } = useOperationsStore();
  useBillingStore();

  // Summary stats
  const activeClients = clients.filter((c) => c.status === "active").length;
  const prospectClients = clients.filter((c) => c.status === "prospect").length;
  const totalContractValue = clients.reduce((sum, c) => sum + c.contractValue, 0);
  const wonDeals = deals.filter((d) => d.stage === "closed_won");
  const wonValue = wonDeals.reduce((sum, d) => sum + d.value, 0);
  const pipelineValue = deals
    .filter((d) => d.stage !== "closed_won" && d.stage !== "closed_lost")
    .reduce((sum, d) => sum + d.value, 0);
  const overdueTasks = tasks.filter((t) => t.status === "overdue").length;
  const activeEquipment = equipment.filter((e) => e.status === "active").length;
  const serviceDueEquipment = equipment.filter((e) => e.currentHours >= e.nextServiceDue).length;

  const salesPipelineData = [
    { stage: "Inquiry", count: deals.filter((d) => d.stage === "inquiry").length, value: deals.filter((d) => d.stage === "inquiry").reduce((s, d) => s + d.value, 0) },
    { stage: "Proposal", count: deals.filter((d) => d.stage === "proposal").length, value: deals.filter((d) => d.stage === "proposal").reduce((s, d) => s + d.value, 0) },
    { stage: "Negotiation", count: deals.filter((d) => d.stage === "negotiation").length, value: deals.filter((d) => d.stage === "negotiation").reduce((s, d) => s + d.value, 0) },
    { stage: "Closed Won", count: deals.filter((d) => d.stage === "closed_won").length, value: wonValue },
  ];

  const leadSourceData = [
    { source: "Website", count: leads.filter((l) => l.source === "Website").length },
    { source: "Referral", count: leads.filter((l) => l.source === "Referral").length },
    { source: "Trade Show", count: leads.filter((l) => l.source === "Trade Show").length },
    { source: "Email", count: leads.filter((l) => l.source === "Email Campaign").length },
    { source: "LinkedIn", count: leads.filter((l) => l.source === "LinkedIn").length },
    { source: "Cold Call", count: leads.filter((l) => l.source === "Cold Call").length },
  ];

  const monthlyServices = [
    { month: "Jan", completed: 3, scheduled: 5 },
    { month: "Feb", completed: 4, scheduled: 4 },
    { month: "Mar", completed: 2, scheduled: 6 },
    { month: "Apr", completed: 5, scheduled: 5 },
    { month: "May", completed: 4, scheduled: 7 },
    { month: "Jun", completed: 6, scheduled: 6 },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[32px] font-bold text-[#EAEAEA] tracking-[-0.02em]">Reports</h1>
          <p className="text-sm text-[#88888C] mt-0.5">Performance analytics and operational insights</p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-[#005F73]/10 border border-[#005F73]/20">
          <Calendar className="w-3 h-3 text-[#005F73]" />
          <span className="text-xs text-[#005F73] font-medium">Last 6 Months</span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="data-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-[#88888C] uppercase tracking-wider">Clients</span>
            <Users className="w-4 h-4 text-[#88888C]" />
          </div>
          <div className="text-3xl font-bold text-[#EAEAEA]">{activeClients}</div>
          <div className="text-[10px] text-[#88888C] mt-1">{prospectClients} prospects</div>
        </div>
        <div className="data-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-[#88888C] uppercase tracking-wider">Pipeline Value</span>
            <TrendingUp className="w-4 h-4 text-[#F2A900]" />
          </div>
          <div className="text-3xl font-bold text-[#F2A900]">${(pipelineValue / 1000).toFixed(0)}k</div>
          <div className="text-[10px] text-[#88888C] mt-1">{wonValue > 0 ? `$${(wonValue / 1000).toFixed(0)}k closed` : "No closed deals"}</div>
        </div>
        <div className="data-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-[#88888C] uppercase tracking-wider">Equipment</span>
            <Wrench className="w-4 h-4 text-[#88888C]" />
          </div>
          <div className="text-3xl font-bold text-[#EAEAEA]">{activeEquipment}</div>
          <div className="text-[10px] text-[#EF4444] mt-1">{serviceDueEquipment} need service</div>
        </div>
        <div className="data-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-[#88888C] uppercase tracking-wider">Contract Value</span>
            <DollarSign className="w-4 h-4 text-[#88888C]" />
          </div>
          <div className="text-3xl font-bold text-[#EAEAEA]">${(totalContractValue / 1000).toFixed(0)}k</div>
          <div className="text-[10px] text-[#88888C] mt-1">Across {clients.length} clients</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2 data-card p-4">
          <h3 className="text-base font-semibold text-[#EAEAEA] mb-1">Sales Pipeline</h3>
          <p className="text-xs text-[#88888C] mb-3">Deals by stage with value</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={salesPipelineData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A2A30" />
              <XAxis dataKey="stage" stroke="#88888C" fontSize={11} />
              <YAxis stroke="#88888C" fontSize={11} />
              <Tooltip
                contentStyle={{ background: "#1E1E22", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 4, fontSize: 12 }}
                formatter={(value: number) => [`$${value.toLocaleString()}`, "Value"]}
              />
              <Bar dataKey="value" fill="#F2A900" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="data-card p-4">
          <h3 className="text-base font-semibold text-[#EAEAEA] mb-1">Lead Sources</h3>
          <p className="text-xs text-[#88888C] mb-3">Where leads originate</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={leadSourceData} layout="vertical" barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A2A30" />
              <XAxis type="number" stroke="#88888C" fontSize={11} />
              <YAxis dataKey="source" type="category" stroke="#88888C" fontSize={11} width={60} />
              <Tooltip
                contentStyle={{ background: "#1E1E22", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 4, fontSize: 12 }}
              />
              <Bar dataKey="count" fill="#005F73" radius={[0, 2, 2, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Service Activity */}
      <div className="data-card p-4">
        <h3 className="text-base font-semibold text-[#EAEAEA] mb-1">Service Activity</h3>
        <p className="text-xs text-[#88888C] mb-3">Completed vs scheduled services</p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={monthlyServices}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2A2A30" />
            <XAxis dataKey="month" stroke="#88888C" fontSize={11} />
            <YAxis stroke="#88888C" fontSize={11} />
            <Tooltip
              contentStyle={{ background: "#1E1E22", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 4, fontSize: 12 }}
            />
            <Line type="monotone" dataKey="completed" stroke="#10B981" strokeWidth={2} dot={{ fill: "#10B981", r: 3 }} />
            <Line type="monotone" dataKey="scheduled" stroke="#005F73" strokeWidth={2} dot={{ fill: "#005F73", r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Task Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="data-card p-4 text-center">
          <div className="text-3xl font-bold text-[#EAEAEA]">{tasks.length}</div>
          <div className="text-[10px] text-[#88888C] uppercase tracking-wider mt-1">Total Tasks</div>
        </div>
        <div className="data-card p-4 text-center">
          <div className="text-3xl font-bold text-[#EF4444]">{overdueTasks}</div>
          <div className="text-[10px] text-[#EF4444] uppercase tracking-wider mt-1">Overdue</div>
        </div>
        <div className="data-card p-4 text-center">
          <div className="text-3xl font-bold text-[#10B981]">
            {tasks.filter((t) => t.status === "completed").length}
          </div>
          <div className="text-[10px] text-[#10B981] uppercase tracking-wider mt-1">Completed</div>
        </div>
      </div>

      {/* Service Records Table */}
      <div className="data-card overflow-auto">
        <div className="p-3 border-b border-white/5">
          <h3 className="text-sm font-semibold text-[#EAEAEA]">Recent Service Records</h3>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-[#0A0A0C]">
              <th className="text-left py-2.5 px-3 text-[#88888C] font-medium">Equipment</th>
              <th className="text-left py-2.5 px-3 text-[#88888C] font-medium">Type</th>
              <th className="text-left py-2.5 px-3 text-[#88888C] font-medium">Technician</th>
              <th className="text-left py-2.5 px-3 text-[#88888C] font-medium">Status</th>
              <th className="text-left py-2.5 px-3 text-[#88888C] font-medium">Cost</th>
            </tr>
          </thead>
          <tbody>
            {serviceRecords.slice(0, 10).map((record) => {
              const eq = equipment.find((e) => e.id === record.equipmentId);
              return (
                <tr key={record.id} className="grid-table-row border-b border-[#2A2A30]">
                  <td className="py-2.5 px-3 text-[#EAEAEA] font-mono-tech">{eq?.unitId || "—"}</td>
                  <td className="py-2.5 px-3">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#005F73]/20 text-[#005F73] uppercase">
                      {record.serviceType}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-[#EAEAEA]">{record.technician}</td>
                  <td className="py-2.5 px-3">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      record.status === "completed" ? "bg-[#10B981]/20 text-[#10B981]" :
                      record.status === "in_progress" ? "bg-[#F2A900]/20 text-[#F2A900]" :
                      "bg-[#005F73]/20 text-[#005F73]"
                    }`}>
                      {record.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-[#F2A900] font-mono-tech">${record.cost.toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
