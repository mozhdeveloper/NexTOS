import { useState } from "react";
import { useCRMStore } from "@/stores/useCRMStore";
import { useAuthStore } from "@/stores/useAuthStore";
import type { Deal, DealStage, Task, Client } from "@/types";
import {
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Phone,
  Mail,
  Building2,
  TrendingUp,
  ArrowRightLeft,
} from "lucide-react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PageHeader from "@/components/PageHeader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type TabType = "clients" | "pipeline" | "tasks" | "leads";

export default function CRM() {
  const { user } = useAuthStore();
  const {
    clients,
    deals,
    tasks,
    leads,
    moveDealStage,
    completeTask,
    getOverdueTasks,
  } = useCRMStore();
  // Deal modal state
  const [dealModalOpen, setDealModalOpen] = useState(false);
  const [dealTitle, setDealTitle] = useState("");
  const [dealValue, setDealValue] = useState("");
  const [dealStage, setDealStage] = useState<DealStage>("inquiry");
  const [dealClientId, setDealClientId] = useState<number | null>(clients[0]?.id ?? null);
  

  // Task modal state
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskPriority, setTaskPriority] = useState<"low" | "medium" | "high">("medium");
  const [taskClientId, setTaskClientId] = useState<number | null>(clients[0]?.id ?? null);
  
  const [activeTab, setActiveTab] = useState<TabType>("pipeline");
  const [searchQuery, setSearchQuery] = useState("");
  const [clientFilter, setClientFilter] = useState("all");
  const [draggingDeal, setDraggingDeal] = useState<number | null>(null);

  // Filter clients
  const filteredClients = clients.filter((c) => {
    const matchesSearch =
      searchQuery === "" ||
      c.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.contactName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = clientFilter === "all" || c.status === clientFilter;
    return matchesSearch && matchesFilter;
  });

  // Pipeline columns
  const stages: { id: DealStage; label: string; color: string }[] = [
    { id: "inquiry", label: "Inquiry", color: "#005F73" },
    { id: "proposal", label: "Proposal", color: "#8B5CF6" },
    { id: "negotiation", label: "Negotiation", color: "#F2A900" },
    { id: "contracting", label: "Contracting", color: "#00A8E8" },
    { id: "closed_won", label: "Closed Won", color: "#10B981" },
    { id: "closed_lost", label: "Closed Lost", color: "#EF4444" },
  ];

  const overdueTasks = getOverdueTasks();

  const handleDragStart = (dealId: number) => {
    setDraggingDeal(dealId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, stage: DealStage) => {
    e.preventDefault();
    if (draggingDeal !== null) {
      moveDealStage(draggingDeal, stage);
      setDraggingDeal(null);
    }
  };

  // Filter deals for pipeline
  const filteredDeals = deals.filter((d) => {
    const client = clients.find((c) => c.id === d.clientId);
    return (
      searchQuery === "" ||
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client?.companyName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="CRM"
        subtitle="Client management & sales pipeline"
        actions={
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-[#EF4444]/10 border border-[#EF4444]/20">
            <AlertTriangle className="w-3.5 h-3.5 text-[#EF4444]" />
            <span className="text-xs text-[#EF4444] font-medium">{overdueTasks.length} overdue</span>
          </div>
        }
      />

      {/* Search Bar - Shared across tabs or specific? Let's make it shared for consistency */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#88888C]" />
          <Input
            placeholder={`Search ${activeTab === 'pipeline' ? 'deals' : activeTab}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 bg-[#1A1A20] border-white/10 text-[#EAEAEA] text-xs placeholder:text-[#88888C]/50"
          />
        </div>
        {activeTab === "clients" && (
          <Select value={clientFilter} onValueChange={setClientFilter}>
            <SelectTrigger className="h-8 w-36 bg-[#1A1A20] border-white/10 text-[#EAEAEA] text-xs">
              <Filter className="w-3 h-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1A1A20] border-white/10">
              <SelectItem value="all" className="text-xs text-[#EAEAEA]">All Status</SelectItem>
              <SelectItem value="active" className="text-xs text-[#EAEAEA]">Active</SelectItem>
              <SelectItem value="prospect" className="text-xs text-[#EAEAEA]">Prospect</SelectItem>
              <SelectItem value="inactive" className="text-xs text-[#EAEAEA]">Inactive</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/5 pb-0">
        {(
          [
            { id: "pipeline" as TabType, label: "Pipeline", icon: TrendingUp },
            { id: "clients" as TabType, label: "Clients", icon: Building2 },
            { id: "leads" as TabType, label: "Leads", icon: ArrowRightLeft },
            { id: "tasks" as TabType, label: "Tasks", icon: Clock },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              // Search query is shared, but we could clear it if we wanted tab-specific
            }}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-all border-b-2 ${
              activeTab === tab.id
                ? "border-[#F2A900] text-[#F2A900] bg-[#F2A900]/5"
                : "border-transparent text-[#88888C] hover:text-[#EAEAEA]"
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Pipeline Tab */}
      {activeTab === "pipeline" && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#88888C]" />
              <h3 className="text-sm font-semibold text-[#EAEAEA]">Pipeline</h3>
            </div>
            <div>
              <Button onClick={() => setDealModalOpen(true)} className="h-8 bg-[#F2A900] hover:bg-[#F2A900]/80 text-[#050505] text-xs">
                <Plus className="w-3 h-3 mr-2" />
                New Deal
              </Button>
            </div>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 min-h-[500px]">
          {stages.map((stage) => {
            const stageDeals = filteredDeals.filter((d) => d.stage === stage.id);
            // Calculate Weighted Value: Sum of (Value * Probability / 100)
            const weightedValue = stageDeals.reduce((sum, d) => sum + (d.value * d.probability / 100), 0);
            return (
              <div
                key={stage.id}
                className={`min-w-[260px] flex-1 rounded-lg transition-colors ${
                  draggingDeal !== null ? "bg-white/[0.02] ring-1 ring-white/5" : ""
                }`}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stage.id)}
              >
                <div className="flex flex-col mb-3 px-1">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: stage.color }} />
                      <span className="text-xs font-semibold text-[#EAEAEA]">{stage.label}</span>
                    </div>
                    <span className="text-[10px] text-[#88888C]">{stageDeals.length} deals</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-[#88888C] uppercase tracking-wider">Weighted Revenue</span>
                    <span className="text-[11px] text-[#F2A900] font-mono-tech font-bold">
                      ${(weightedValue / 1000).toFixed(1)}k
                    </span>
                  </div>
                </div>
                <div className="space-y-2 p-1">
                  {stageDeals.map((deal) => (
                    <DealCard
                      key={deal.id}
                      deal={deal}
                      client={clients.find((c) => c.id === deal.clientId)}
                      draggable
                      onDragStart={() => handleDragStart(deal.id)}
                    />
                  ))}
                  {stageDeals.length === 0 && draggingDeal !== null && (
                    <div className="h-20 rounded border-2 border-dashed border-white/5 flex items-center justify-center text-[10px] text-[#88888C]">
                      Drop here
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          </div>
        </div>
      )}

      {/* Clients Tab */}
      {activeTab === "clients" && (
        <div className="space-y-3">
          <div className="data-card overflow-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[#0A0A0C]">
                  <th className="text-left py-2.5 px-3 text-[#88888C] font-medium">Company</th>
                  <th className="text-left py-2.5 px-3 text-[#88888C] font-medium">Contact</th>
                  <th className="text-left py-2.5 px-3 text-[#88888C] font-medium">Status</th>
                  <th className="text-left py-2.5 px-3 text-[#88888C] font-medium">Value</th>
                  <th className="text-left py-2.5 px-3 text-[#88888C] font-medium">Last Contact</th>
                  <th className="text-left py-2.5 px-3 text-[#88888C] font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map((client) => (
                  <ClientRow key={client.id} client={client} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Leads Tab */}
      {activeTab === "leads" && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {leads
              .filter(
                (l) =>
                  (searchQuery === "" ||
                  l.source.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  l.notes.toLowerCase().includes(searchQuery.toLowerCase())) &&
                  (l.status !== 'lost' && l.status !== 'qualified') // Filter active leads
              )
              .map((lead) => (
                <LeadCard key={lead.id} lead={lead} client={clients.find((c) => c.id === lead.clientId)} />
              ))}
          </div>
        </div>
      )}

      {/* Tasks Tab */}
      {activeTab === "tasks" && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <div className="relative max-w-xs">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#88888C]" />
                <Input
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 bg-[#1A1A20] border-white/10 text-[#EAEAEA] text-xs placeholder:text-[#88888C]/50"
                />
              </div>
            </div>
            <div>
              <Button onClick={() => setTaskModalOpen(true)} className="h-8 bg-[#F2A900] hover:bg-[#F2A900]/80 text-[#050505] text-xs">
                <Plus className="w-3 h-3 mr-2" />
                Add Task
              </Button>
            </div>
          </div>

          {overdueTasks.length > 0 && (
            <div className="mb-3 p-3 rounded border border-[#EF4444]/20 bg-[#EF4444]/5">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-[#EF4444]" />
                <span className="text-sm font-semibold text-[#EF4444]">Overdue Tasks ({overdueTasks.length})</span>
              </div>
              <div className="space-y-1">
                {overdueTasks.map((task) => (
                  <TaskItem key={task.id} task={task} onComplete={completeTask} overdue />
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1">
            {tasks
              .filter((t) => t.status !== "completed")
              .filter(
                (t) =>
                  searchQuery === "" || t.title.toLowerCase().includes(searchQuery.toLowerCase())
              )
              .map((task) => (
                <TaskItem key={task.id} task={task} onComplete={completeTask} />
              ))}
          </div>
        </div>
      )}

      {/* Deal Modal */}
      {dealModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setDealModalOpen(false)} />
          <div className="relative z-10 w-full max-w-md mx-4">
            <div className="bg-[#0A0A0C] rounded p-5">
              <button onClick={() => setDealModalOpen(false)} className="absolute top-3 right-3 text-[#88888C]"><X className="w-4 h-4" /></button>
              <h3 className="text-sm font-semibold text-[#EAEAEA] mb-3">New Deal</h3>
              <div className="space-y-3">
                <Input placeholder="Deal title" value={dealTitle} onChange={(e) => setDealTitle(e.target.value)} className="bg-[#1A1A20]" />
                <Input placeholder="Value" value={dealValue} onChange={(e) => setDealValue(e.target.value)} className="bg-[#1A1A20]" />
                <Select value={dealStage} onValueChange={(v) => setDealStage(v as DealStage)}>
                  <SelectTrigger className="h-8 bg-[#1A1A20] border-white/10 text-[#EAEAEA] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1A1A20] border-white/10">
                    {stages.map((s) => (
                      <SelectItem key={s.id} value={s.id} className="text-xs text-[#EAEAEA]">{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={String(dealClientId ?? "")} onValueChange={(v) => setDealClientId(Number(v))}>
                  <SelectTrigger className="h-8 bg-[#1A1A20] border-white/10 text-[#EAEAEA] text-xs">
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1A1A20] border-white/10">
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)} className="text-xs text-[#EAEAEA]">{c.companyName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setDealModalOpen(false)} className="flex-1">Cancel</Button>
                  <Button
                    className="flex-1 bg-[#F2A900]"
                    onClick={() => {
                      const probMap: Record<DealStage, number> = { inquiry: 20, proposal: 45, negotiation: 70, contracting: 85, closed_won: 100, closed_lost: 0 };
                      const value = Number(dealValue) || 0;
                      useCRMStore.getState().addDeal({
                        clientId: dealClientId ?? clients[0].id,
                        title: dealTitle,
                        value,
                        stage: dealStage,
                        probability: probMap[dealStage],
                        expectedClose: new Date().toISOString(),
                        assignedTo: user?.name || "Sales",
                      });
                      setTimeout(() => {
                        setDealModalOpen(false);
                        setDealTitle("");
                        setDealValue("");
                      }, 1200);
                    }}
                  >
                    Create
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Task Modal */}
      {taskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setTaskModalOpen(false)} />
          <div className="relative z-10 w-full max-w-md mx-4">
            <div className="bg-[#0A0A0C] rounded p-5">
              <button onClick={() => setTaskModalOpen(false)} className="absolute top-3 right-3 text-[#88888C]"><X className="w-4 h-4" /></button>
              <h3 className="text-sm font-semibold text-[#EAEAEA] mb-3">Add Task</h3>
              <div className="space-y-3">
                <Input placeholder="Task title" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} className="bg-[#1A1A20]" />
                <Input type="date" value={taskDueDate} onChange={(e) => setTaskDueDate(e.target.value)} className="bg-[#1A1A20]" />
                <Select value={taskPriority} onValueChange={(v) => setTaskPriority(v as any)}>
                  <SelectTrigger className="h-8 bg-[#1A1A20] border-white/10 text-[#EAEAEA] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1A1A20] border-white/10">
                    <SelectItem value="low" className="text-xs text-[#EAEAEA]">Low</SelectItem>
                    <SelectItem value="medium" className="text-xs text-[#EAEAEA]">Medium</SelectItem>
                    <SelectItem value="high" className="text-xs text-[#EAEAEA]">High</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={taskClientId === null ? "none" : String(taskClientId)} onValueChange={(v) => setTaskClientId(v === "none" ? null : Number(v))}>
                  <SelectTrigger className="h-8 bg-[#1A1A20] border-white/10 text-[#EAEAEA] text-xs">
                    <SelectValue placeholder="Assign to client (optional)" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1A1A20] border-white/10">
                    <SelectItem value="none">None</SelectItem>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)} className="text-xs text-[#EAEAEA]">{c.companyName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setTaskModalOpen(false)} className="flex-1">Cancel</Button>
                  <Button
                    className="flex-1 bg-[#F2A900]"
                    onClick={() => {
                      useCRMStore.getState().addTask({
                        title: taskTitle,
                        description: "",
                        assignedTo: user?.name || "", 
                        relatedType: taskClientId ? "client" : "general",
                        relatedId: taskClientId ?? null,
                        dueDate: taskDueDate || new Date().toISOString(),
                        priority: taskPriority,
                        status: "pending",
                      });
                      setTimeout(() => {
                        setTaskModalOpen(false);
                        setTaskTitle("");
                        setTaskDueDate("");
                      }, 1200);
                    }}
                  >
                    Create
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DealCard({
  deal,
  client,
  draggable,
  onDragStart,
}: {
  deal: Deal;
  client?: Client;
  draggable?: boolean;
  onDragStart?: () => void;
}) {
  const statusColors: Record<string, string> = {
    inquiry: "#005F73",
    proposal: "#8B5CF6",
    negotiation: "#F2A900",
    contracting: "#00A8E8",
    closed_won: "#10B981",
    closed_lost: "#EF4444",
  };

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      className="data-card p-3 cursor-grab active:cursor-grabbing hover:border-[#F2A900]/30 transition-all"
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] text-[#88888C] font-mono-tech">{client?.companyName || "Unknown"}</span>
        <div
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: statusColors[deal.stage] }}
        />
      </div>
      <h4 className="text-xs font-semibold text-[#EAEAEA] mb-1">{deal.title}</h4>
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-[#F2A900] font-mono-tech">
          ${deal.value.toLocaleString()}
        </span>
        <span className="text-[10px] text-[#88888C]">{deal.probability}% prob</span>
      </div>
    </div>
  );
}

function ClientRow({ client }: { client: Client }) {
  const statusColors = {
    active: "bg-[#10B981]/20 text-[#10B981]",
    prospect: "bg-[#F2A900]/20 text-[#F2A900]",
    inactive: "bg-[#EF4444]/20 text-[#EF4444]",
  };

  return (
    <tr className="grid-table-row border-b border-[#2A2A30]">
      <td className="py-2.5 px-3">
        <div className="text-[#EAEAEA] font-medium">{client.companyName}</div>
        <div className="text-[10px] text-[#88888C]">{client.industry}</div>
      </td>
      <td className="py-2.5 px-3">
        <div className="text-[#EAEAEA]">{client.contactName}</div>
        <div className="flex items-center gap-2 mt-0.5">
          <Mail className="w-2.5 h-2.5 text-[#88888C]" />
          <span className="text-[10px] text-[#88888C]">{client.email}</span>
        </div>
      </td>
      <td className="py-2.5 px-3">
        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${statusColors[client.status]}`}>
          {client.status}
        </span>
      </td>
      <td className="py-2.5 px-3 text-[#F2A900] font-mono-tech font-bold">
        ${client.contractValue.toLocaleString()}
      </td>
      <td className="py-2.5 px-3 text-[#88888C] font-mono-tech text-[10px]">
        {new Date(client.lastContact).toLocaleDateString()}
      </td>
      <td className="py-2.5 px-3">
        <div className="flex items-center gap-1">
          <button className="p-1 rounded hover:bg-white/5">
            <Phone className="w-3 h-3 text-[#88888C]" />
          </button>
          <button className="p-1 rounded hover:bg-white/5">
            <Mail className="w-3 h-3 text-[#88888C]" />
          </button>
        </div>
      </td>
    </tr>
  );
}

function LeadCard({ lead, client }: { lead: import("@/types").Lead; client?: Client }) {
  const priorityColors = {
    low: "bg-[#005F73]/20 text-[#005F73]",
    medium: "bg-[#F2A900]/20 text-[#F2A900]",
    high: "bg-[#EF4444]/20 text-[#EF4444]",
  };

  const statusColors = {
    new: "#005F73",
    contacted: "#F2A900",
    qualified: "#10B981",
    lost: "#EF4444",
  };

  return (
    <div className="data-card p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${priorityColors[lead.priority]}`}>
            {lead.priority}
          </span>
          <span className="text-[10px] text-[#88888C]">{lead.source}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: statusColors[lead.status] }} />
          <span className="text-[10px] text-[#88888C] capitalize">{lead.status}</span>
        </div>
      </div>
      <div className="text-xs text-[#EAEAEA] font-medium mb-1">{lead.notes}</div>
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-[#88888C]">{client?.companyName || "No client"}</span>
        <span className="text-[10px] text-[#8B5CF6] font-mono-tech font-bold">Score: {lead.score}</span>
      </div>
    </div>
  );
}

function TaskItem({
  task,
  onComplete,
  overdue,
}: {
  task: Task;
  onComplete: (id: number) => void;
  overdue?: boolean;
}) {
  const priorityColors = {
    low: "border-l-[#005F73]",
    medium: "border-l-[#F2A900]",
    high: "border-l-[#EF4444]",
  };

  return (
    <div
      className={`flex items-center gap-3 p-2.5 rounded bg-[#1A1A20] border border-white/5 border-l-2 ${priorityColors[task.priority]} hover:bg-[#2A2A30] transition-colors`}
    >
      <button
        onClick={() => onComplete(task.id)}
        className="w-4 h-4 rounded border border-[#88888C]/30 flex items-center justify-center hover:border-[#10B981] hover:bg-[#10B981]/10 transition-colors shrink-0"
      >
        {task.status === "completed" && <CheckCircle2 className="w-3 h-3 text-[#10B981]" />}
      </button>
      <div className="flex-1 min-w-0">
        <div className={`text-xs font-medium ${overdue ? "text-[#EF4444]" : "text-[#EAEAEA]"}`}>
          {task.title}
        </div>
        <div className="text-[10px] text-[#88888C] truncate">{task.description}</div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[10px] text-[#88888C] font-mono-tech">
          {new Date(task.dueDate).toLocaleDateString()}
        </span>
        <span className="text-[10px] text-[#88888C]">{task.assignedTo}</span>
      </div>
    </div>
  );
}
