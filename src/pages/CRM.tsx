import { useState, useMemo, useEffect } from "react";
import { useCRMStore } from "@/stores/useCRMStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { useOperationsStore } from "@/stores/useOperationsStore";
import { useBillingStore } from "@/stores/useBillingStore";
import type { Deal, DealStage, Task, Client, Contact, Equipment, ServiceRecord, Booking, Package, Invoice, Lead } from "@/types";
import { QRCodeSVG } from "qrcode.react";
import CRMDashboard from "@/components/CRMDashboard";
import { trpc } from "@/providers/trpc";
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
  ChevronLeft,
  MapPin,
  Calendar,
  Layers,
  Wrench,
  CreditCard,
  User as UserIcon,
  Plus,
  X,
  Package as PackageIcon,
  QrCode,
  Download,
  MoreVertical,
  Trash2,
  PenTool,
  Pencil,
  LayoutDashboard,
} from "lucide-react";
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

type TabType = "dashboard" | "clients" | "pipeline" | "tasks" | "leads" | "performance";

export default function CRM() {
  const { user } = useAuthStore();
  const {
    clients,
    deals,
    tasks,
    leads,
    contacts,
    moveDealStage,
    completeTask,
    getOverdueTasks,
  } = useCRMStore();

  const { equipment, serviceRecords, bookings } = useOperationsStore();
  const { packages, invoices } = useBillingStore();

  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [clientFilter, setClientFilter] = useState("all");
  const [draggingDeal, setDraggingDeal] = useState<number | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);

  // Deal modal state
  const [dealModalOpen, setDealModalOpen] = useState(false);
  const [dealTitle, setDealTitle] = useState("");
  const [dealValue, setDealValue] = useState("");
  const [dealStage, setDealStage] = useState<DealStage>("inquiry");
  const [dealClientId, setDealClientId] = useState<number | null>(clients[0]?.id ?? null);

  // Deal action menu and modals
  const [openMenuDealId, setOpenMenuDealId] = useState<number | null>(null);
  const [selectedActionDeal, setSelectedActionDeal] = useState<Deal | null>(null);
  const [editDealOpen, setEditDealOpen] = useState(false);
  const [editDealClientId, setEditDealClientId] = useState<number | null>(null);
  const [editDealTitle, setEditDealTitle] = useState("");
  const [editDealValue, setEditDealValue] = useState("");
  const [editDealProbability, setEditDealProbability] = useState("");
  const [deleteDealOpen, setDeleteDealOpen] = useState(false);

  // Task modal state
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskPriority, setTaskPriority] = useState<"low" | "medium" | "high">("medium");
  const [taskClientId, setTaskClientId] = useState<number | null>(clients[0]?.id ?? null);

  // Equipment modal state
  const [equipmentModalOpen, setEquipmentModalOpen] = useState(false);
  const [eqUnitId, setEqUnitId] = useState("");
  const [eqType, setEqType] = useState("");
  const [eqSerial, setEqSerial] = useState("");
  const [eqModel, setEqModel] = useState("");
  const [eqLocation, setEqLocation] = useState("");
  const [eqHours, setEqHours] = useState("");

  // Add Client modal state
  const [addClientOpen, setAddClientOpen] = useState(false);
  const [acCompanyName, setAcCompanyName] = useState("");
  const [acIndustry, setAcIndustry] = useState("");
  const [acContactName, setAcContactName] = useState("");
  const [acEmail, setAcEmail] = useState("");
  const [acPhone, setAcPhone] = useState("");
  const [acStatus, setAcStatus] = useState<"active" | "inactive" | "prospect">("active");
  const [acAddress, setAcAddress] = useState("");
  const [acCity, setAcCity] = useState("");
  const [acCountry, setAcCountry] = useState("");
  const [acContractValue, setAcContractValue] = useState("");
  const [acLastContact, setAcLastContact] = useState("");
  const [acNotes, setAcNotes] = useState("");

  // Edit Client modal state
  const [editClientOpen, setEditClientOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [editClientCompany, setEditClientCompany] = useState("");
  const [editClientIndustry, setEditClientIndustry] = useState("");
  const [editClientContactName, setEditClientContactName] = useState("");
  const [editClientEmail, setEditClientEmail] = useState("");
  const [editClientPhone, setEditClientPhone] = useState("");
  const [editClientStatus, setEditClientStatus] = useState<"active" | "inactive" | "prospect">("active");
  const [editClientAddress, setEditClientAddress] = useState("");
  const [editClientContractValue, setEditClientContractValue] = useState("");
  const [editClientLastContact, setEditClientLastContact] = useState("");

  // Filter clients
  const filteredClients = clients.filter((c) => {
    const matchesSearch =
      searchQuery === "" ||
      c.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.contactName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = clientFilter === "all" || c.status === clientFilter;
    return matchesSearch && matchesFilter;
  });

  // Client Profile Data aggregation
  const selectedClient = useMemo(() => 
    clients.find(c => c.id === selectedClientId),
    [selectedClientId, clients]
  );

  const clientData = useMemo(() => {
    if (!selectedClientId) return null;
    return {
      contacts: contacts.filter(c => c.clientId === selectedClientId),
      equipment: equipment.filter(e => e.clientId === selectedClientId),
      deals: deals.filter(d => d.clientId === selectedClientId),
      serviceHistory: serviceRecords.filter(s => s.clientId === selectedClientId),
      bookings: bookings.filter(b => b.clientId === selectedClientId),
      packages: packages.filter(p => p.clientId === selectedClientId),
      invoices: invoices.filter(i => i.clientId === selectedClientId),
      tasks: tasks.filter(t => t.relatedId === selectedClientId && t.relatedType === 'client'),
    };
  }, [selectedClientId, contacts, equipment, deals, serviceRecords, bookings, packages, invoices, tasks]);

  // Pipeline columns
  const stages: { id: DealStage; label: string; color: string }[] = [
    { id: "inquiry", label: "Inquiry", color: "#66B2B2" },
    { id: "proposal", label: "Proposal", color: "#8B5CF6" },
    { id: "negotiation", label: "Negotiation", color: "#66B2B2" },
    { id: "closed_won", label: "Closed Won", color: "#10B981" },
    { id: "closed_lost", label: "Closed Lost", color: "#EF4444" },
  ];

  const overdueTasks = getOverdueTasks();

  const addDealMutation = trpc.deals.add.useMutation();
  const updateDealMutation = trpc.deals.update.useMutation();
  const deleteDealMutation = trpc.deals.delete.useMutation();
  const moveDealMutation = trpc.deals.move.useMutation();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (openMenuDealId !== null) {
        if (
          !target.closest('[data-deal-menu-open="true"]') &&
          !target.closest('[data-deal-menu-trigger]')
        ) {
          setOpenMenuDealId(null);
        }
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenMenuDealId(null);
        setEditDealOpen(false);
        setDeleteDealOpen(false);
        setDealModalOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [openMenuDealId]);

  const openDealMenu = (dealId: number) => {
    setOpenMenuDealId((current) => (current === dealId ? null : dealId));
  };

  const openEditDealModal = (deal: Deal) => {
    setSelectedActionDeal(deal);
    setEditDealClientId(deal.clientId);
    setEditDealTitle(deal.title);
    setEditDealValue(deal.value.toString());
    setEditDealProbability(deal.probability.toString());
    setEditDealOpen(true);
    setOpenMenuDealId(null);
  };

  const openDeleteDealModal = (deal: Deal) => {
    setSelectedActionDeal(deal);
    setDeleteDealOpen(true);
    setOpenMenuDealId(null);
  };

  const stageFromProbability = (prob: number): DealStage => {
    if (prob >= 100) return "closed_won";
    if (prob >= 70)  return "negotiation";
    if (prob >= 45)  return "proposal";
    if (prob > 0)    return "inquiry";
    return "closed_lost";
  };

  const handleSaveDealChanges = () => {
    if (!selectedActionDeal || editDealClientId === null) return;
    const newProb = Number(editDealProbability) || selectedActionDeal.probability;
    const derivedStage = stageFromProbability(newProb);
    const patch = {
      clientId: editDealClientId,
      title: editDealTitle,
      value: Number(editDealValue) || selectedActionDeal.value,
      probability: newProb,
      ...(derivedStage !== selectedActionDeal.stage ? { stage: derivedStage } : {}),
    };
    useCRMStore.getState().updateDeal(selectedActionDeal.id, patch);
    updateDealMutation.mutate({ id: selectedActionDeal.id, data: patch }, {
      onError: (err) => console.error("deals.update failed", err),
    });
    setEditDealOpen(false);
    setSelectedActionDeal(null);
  };

  const handleConfirmDeleteDeal = () => {
    if (!selectedActionDeal) return;
    const id = selectedActionDeal.id;
    useCRMStore.getState().deleteDeal(id);
    deleteDealMutation.mutate({ id }, {
      onError: (err) => console.error("deals.delete failed", err),
    });
    setDeleteDealOpen(false);
    setSelectedActionDeal(null);
  };

  const handleDragStart = (dealId: number) => {
    setDraggingDeal(dealId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, stage: DealStage) => {
    e.preventDefault();
    if (draggingDeal !== null) {
      const probMap: Record<DealStage, number> = { inquiry: 20, proposal: 45, negotiation: 70, closed_won: 100, closed_lost: 0 };
      moveDealStage(draggingDeal, stage);
      moveDealMutation.mutate({ id: draggingDeal, stage, probability: probMap[stage] }, {
        onError: (err) => console.error("deals.move failed", err),
      });
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
      {selectedClientId && selectedClient && clientData ? (
        <CliecntProfile 
          client={selectedClient} 
          data={clientData} 
          onBack={() => setSelectedClientId(null)} 
          onAddEquipment={() => setEquipmentModalOpen(true)}
        />
      ) : (
        <>
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

          {/* Search Bar */}
          {/* Search Bar & Filters */}
          {activeTab !== "dashboard" && activeTab !== "performance" && (
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600" />
                <Input
                  placeholder={`Search ${activeTab === 'pipeline' ? 'deals' : activeTab}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 bg-white border-gray-200 text-black text-xs placeholder:text-gray-400"
                />
              </div>
              {activeTab === "clients" && (
                <Select value={clientFilter} onValueChange={setClientFilter}>
                  <SelectTrigger className="h-8 w-36 bg-white border-gray-200 text-black text-xs">
                    <Filter className="w-3 h-3 mr-1" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200">
                    <SelectItem value="all" className="text-xs text-black">All Status</SelectItem>
                    <SelectItem value="active" className="text-xs text-black">Active</SelectItem>
                    <SelectItem value="prospect" className="text-xs text-black">Prospect</SelectItem>
                    <SelectItem value="inactive" className="text-xs text-black">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 border-b border-gray-200 pb-0">
            {(
              [
                { id: "dashboard" as TabType, label: "Dashboard", icon: LayoutDashboard },
                { id: "pipeline" as TabType, label: "Pipeline", icon: TrendingUp },
                { id: "clients" as TabType, label: "Clients", icon: Building2 },
                { id: "leads" as TabType, label: "Leads", icon: ArrowRightLeft },
                { id: "tasks" as TabType, label: "Tasks", icon: Clock },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-all border-b-2 ${
                  activeTab === tab.id
                    ? "border-[#66B2B2] text-[#66B2B2] bg-[#66B2B2]/5"
                    : "border-transparent text-gray-600 hover:text-black"
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
            <button
              onClick={() => setActiveTab("performance")}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-all border-b-2 ${
                activeTab === "performance"
                  ? "border-[#66B2B2] text-[#66B2B2] bg-[#66B2B2]/5"
                  : "border-transparent text-gray-600 hover:text-black"
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              Performance
            </button>
          </div>

          {/* Dashboard Tab */}
          {activeTab === "dashboard" && (
            <CRMDashboard />
          )}

          {/* Performance Tab */}
          {activeTab === "performance" && (
            <SalesPerformance leads={leads} deals={deals} tasks={tasks} />
          )}

          {/* Pipeline Tab */}
          {activeTab === "pipeline" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#66B2B2]" />
                  <h3 className="text-sm font-semibold text-black">Sales Pipeline</h3>
                </div>
                <Button onClick={() => setDealModalOpen(true)} className="h-8 bg-[#66B2B2] hover:bg-[#66B2B2]/80 text-white text-xs font-bold">
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  New Deal
                </Button>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-4 min-h-[600px] scrollbar-hide">
              {stages.map((stage) => {
                const stageDeals = filteredDeals.filter((d) => d.stage === stage.id);
                const weightedValue = stageDeals.reduce((sum, d) => sum + (d.value * d.probability / 100), 0);
                return (
                  <div
                    key={stage.id}
                    className={`min-w-[260px] flex-1 rounded-lg transition-colors ${
                      draggingDeal !== null ? "bg-gray-50 ring-1 ring-gray-200" : ""
                    }`}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, stage.id)}
                  >
                    <div className="flex flex-col mb-3 px-1">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: stage.color }} />
                          <span className="text-xs font-semibold text-black">{stage.label}</span>
                        </div>
                        <span className="text-[10px] text-gray-600">{stageDeals.length} deals</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] text-gray-600 uppercase tracking-wider">Weighted Revenue</span>
                        <span className="text-[11px] text-[#66B2B2] font-mono-tech font-bold">
                          ₱{(weightedValue / 1000).toFixed(1)}k
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
                          isMenuOpen={openMenuDealId === deal.id}
                          onMenuToggle={() => openDealMenu(deal.id)}
                          onEdit={() => openEditDealModal(deal)}
                          onDelete={() => openDeleteDealModal(deal)}
                        />
                      ))}
                      {stageDeals.length === 0 && draggingDeal !== null && (
                        <div className="h-20 rounded border-2 border-dashed border-gray-200 flex items-center justify-center text-[10px] text-gray-600">
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
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-black">All Clients</h3>
                <Button onClick={() => setAddClientOpen(true)} className="h-8 bg-[#66B2B2] hover:bg-[#66B2B2]/80 text-white text-xs font-bold">
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Add Client
                </Button>
              </div>
              <div className="data-card overflow-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left py-2.5 px-3 text-gray-600 font-medium">Company</th>
                      <th className="text-left py-2.5 px-3 text-gray-600 font-medium">Contact</th>
                      <th className="text-left py-2.5 px-3 text-gray-600 font-medium">Address</th>
                      <th className="text-left py-2.5 px-3 text-gray-600 font-medium">Status</th>
                      <th className="text-left py-2.5 px-3 text-gray-600 font-medium">Value</th>
                      <th className="text-left py-2.5 px-3 text-gray-600 font-medium">Last Contact</th>
                      <th className="text-left py-2.5 px-3 text-gray-600 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredClients.map((client) => (
                      <ClientRow
                        key={client.id}
                        client={client}
                        onClick={() => setSelectedClientId(client.id)}
                        onEdit={() => {
                          setEditingClient(client);
                          setEditClientCompany(client.companyName);
                          setEditClientIndustry(client.industry);
                          setEditClientContactName(client.contactName);
                          setEditClientEmail(client.email);
                          setEditClientPhone(client.phone);
                          setEditClientStatus(client.status);
                          setEditClientAddress(client.address);
                          setEditClientContractValue(client.contractValue.toString());
                          setEditClientLastContact(client.lastContact);
                          setEditClientOpen(true);
                        }}
                      />
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
                      (l.status !== 'lost' && l.status !== 'qualified')
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
              <div className="flex justify-between items-center mb-2">
                <div className="flex gap-2">
                  <div className="relative max-w-xs">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600" />
                    <Input
                      placeholder="Search tasks..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 h-8 bg-white border-gray-200 text-black text-xs placeholder:text-gray-400"
                    />
                  </div>
                </div>
                <Button onClick={() => setTaskModalOpen(true)} className="h-8 bg-[#66B2B2] hover:bg-[#66B2B2]/80 text-white text-xs font-bold">
                  <Plus className="w-3 h-3 mr-2" />
                  Add Task
                </Button>
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
        </>
      )}

      {/* Deal Modal */}
      {dealModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setDealModalOpen(false)} />
          <div className="relative z-10 w-full max-w-md mx-4">
            <div className="bg-white border border-gray-200 rounded p-5">
              <button onClick={() => setDealModalOpen(false)} className="absolute top-3 right-3 text-gray-500"><X className="w-4 h-4" /></button>
              <h3 className="text-sm font-semibold text-black mb-3">New Deal</h3>
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">Deal Title</label>
                  <Input placeholder="Deal title" value={dealTitle} onChange={(e) => setDealTitle(e.target.value)} className="bg-white border-gray-200 text-black" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">Value (₱)</label>
                  <Input placeholder="Value" value={dealValue} onChange={(e) => setDealValue(e.target.value)} className="bg-white border-gray-200 text-black" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">Stage</label>
                  <Select value={dealStage} onValueChange={(v) => setDealStage(v as DealStage)}>
                    <SelectTrigger className="h-8 bg-white border-gray-200 text-black text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200">
                      {stages.map((s) => (
                        <SelectItem key={s.id} value={s.id} className="text-xs text-black">{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">Client</label>
                  <Select value={String(dealClientId ?? "")} onValueChange={(v) => setDealClientId(Number(v))}>
                    <SelectTrigger className="h-8 bg-white border-gray-200 text-black text-xs">
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200">
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)} className="text-xs text-black">{c.companyName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setDealModalOpen(false)} className="flex-1">Cancel</Button>
                  <Button
                    className="flex-1 bg-[#66B2B2] text-white"
                    onClick={() => {
                      const probMap: Record<DealStage, number> = { inquiry: 20, proposal: 45, negotiation: 70, closed_won: 100, closed_lost: 0 };
                      const value = Number(dealValue) || 0;
                      const now = new Date().toISOString();
                      const storePayload = {
                        clientId: dealClientId ?? clients[0].id,
                        title: dealTitle,
                        value,
                        stage: dealStage,
                        probability: probMap[dealStage],
                        expectedClose: now,
                        assignedTo: user?.name || "Sales",
                      };
                      useCRMStore.getState().addDeal(storePayload);
                      const allDeals = useCRMStore.getState().deals;
                      const added = allDeals[allDeals.length - 1];
                      if (added) {
                        addDealMutation.mutate(
                          { ...storePayload, id: added.id, createdAt: added.createdAt },
                          { onError: (err) => console.error("deals.add failed", err) }
                        );
                      }
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
            <div className="bg-white border border-gray-200 rounded p-5">
              <button onClick={() => setTaskModalOpen(false)} className="absolute top-3 right-3 text-gray-500"><X className="w-4 h-4" /></button>
              <h3 className="text-sm font-semibold text-black mb-3">Add Task</h3>
              <div className="space-y-3">
                <Input placeholder="Task title" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} className="bg-white border-gray-200 text-black" />
                <Input type="date" value={taskDueDate} onChange={(e) => setTaskDueDate(e.target.value)} className="bg-white border-gray-200 text-black" />
                <Select value={taskPriority} onValueChange={(v) => setTaskPriority(v as any)}>
                  <SelectTrigger className="h-8 bg-white border-gray-200 text-black text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200">
                    <SelectItem value="low" className="text-xs text-black">Low</SelectItem>
                    <SelectItem value="medium" className="text-xs text-black">Medium</SelectItem>
                    <SelectItem value="high" className="text-xs text-black">High</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={taskClientId === null ? "none" : String(taskClientId)} onValueChange={(v) => setTaskClientId(v === "none" ? null : Number(v))}>
                  <SelectTrigger className="h-8 bg-white border-gray-200 text-black text-xs">
                    <SelectValue placeholder="Assign to client (optional)" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200">
                    <SelectItem value="none">None</SelectItem>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)} className="text-xs text-black">{c.companyName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setTaskModalOpen(false)} className="flex-1">Cancel</Button>
                  <Button
                    className="flex-1 bg-[#66B2B2] text-white"
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

      {/* Equipment Modal */}
      {equipmentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setEquipmentModalOpen(false)} />
          <div className="relative z-10 w-full max-w-md mx-4">
            <div className="bg-white border border-gray-200 rounded p-5">
              <button onClick={() => setEquipmentModalOpen(false)} className="absolute top-3 right-3 text-gray-500"><X className="w-4 h-4" /></button>
              <h3 className="text-sm font-semibold text-black mb-3">Add Equipment</h3>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Input placeholder="Unit ID (e.g. GPS-001)" value={eqUnitId} onChange={(e) => setEqUnitId(e.target.value)} className="bg-white border-gray-200 text-black" />
                  <Input placeholder="Type (e.g. GPS Tracker)" value={eqType} onChange={(e) => setEqType(e.target.value)} className="bg-white border-gray-200 text-black" />
                </div>
                <Input placeholder="Serial Number" value={eqSerial} onChange={(e) => setEqSerial(e.target.value)} className="bg-white border-gray-200 text-black" />
                <Input placeholder="Model" value={eqModel} onChange={(e) => setEqModel(e.target.value)} className="bg-white border-gray-200 text-black" />
                <Input placeholder="Location" value={eqLocation} onChange={(e) => setEqLocation(e.target.value)} className="bg-white border-gray-200 text-black" />
                <Input placeholder="Current Hours" type="number" value={eqHours} onChange={(e) => setEqHours(e.target.value)} className="bg-white border-gray-200 text-black" />
                
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setEquipmentModalOpen(false)} className="flex-1">Cancel</Button>
                  <Button
                    className="flex-1 bg-[#66B2B2] text-white"
                    onClick={() => {
                      useOperationsStore.getState().addEquipment({
                        clientId: selectedClientId!,
                        unitId: eqUnitId,
                        type: eqType,
                        serialNumber: eqSerial,
                        manufacturer: "TBD",
                        model: eqModel,
                        installDate: new Date().toISOString(),
                        warrantyExpiry: new Date(Date.now() + 365 * 86400000).toISOString(),
                        status: "active",
                        lastService: new Date().toISOString(),
                        nextServiceDue: 5000,
                        currentHours: Number(eqHours) || 0,
                        location: eqLocation,
                        notes: "",
                      });
                      setTimeout(() => {
                        setEquipmentModalOpen(false);
                        setEqUnitId("");
                        setEqType("");
                        setEqSerial("");
                        setEqModel("");
                        setEqLocation("");
                        setEqHours("");
                      }, 1200);
                    }}
                  >
                    Add Unit
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Deal Modal */}
      {editDealOpen && selectedActionDeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setEditDealOpen(false)} />
          <div className="relative z-10 w-full max-w-md mx-4">
            <div className="bg-white border border-gray-200 rounded p-5">
              <button onClick={() => setEditDealOpen(false)} className="absolute top-3 right-3 text-gray-500"><X className="w-4 h-4" /></button>
              <h3 className="text-sm font-semibold text-black mb-3">Edit Deal</h3>
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">Client</label>
                  <Select value={String(editDealClientId ?? "")} onValueChange={(v) => setEditDealClientId(Number(v))}>
                    <SelectTrigger className="h-8 bg-white border-gray-200 text-black text-xs">
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200">
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)} className="text-xs text-black">
                          {c.companyName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">Deal Title</label>
                  <Input
                    placeholder="Deal title"
                    value={editDealTitle}
                    onChange={(e) => setEditDealTitle(e.target.value)}
                    className="bg-white border-gray-200 text-black"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">Revenue (₱)</label>
                  <Input
                    placeholder="Revenue"
                    value={editDealValue}
                    onChange={(e) => setEditDealValue(e.target.value)}
                    className="bg-white border-gray-200 text-black"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">Probability (%)</label>
                  <Input
                    placeholder="Probability (%)"
                    value={editDealProbability}
                    onChange={(e) => setEditDealProbability(e.target.value)}
                    className="bg-white border-gray-200 text-black"
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setEditDealOpen(false)} className="flex-1">Cancel</Button>
                  <Button onClick={handleSaveDealChanges} className="flex-1 bg-[#10B981] hover:bg-[#10B981]/80">
                    Save Changes
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Deal Confirmation Modal */}
      {deleteDealOpen && selectedActionDeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setDeleteDealOpen(false)} />
          <div className="relative z-10 w-full max-w-md mx-4">
            <div className="bg-white border border-gray-200 rounded p-5">
              <button onClick={() => setDeleteDealOpen(false)} className="absolute top-3 right-3 text-gray-500"><X className="w-4 h-4" /></button>
              <h3 className="text-sm font-semibold text-black mb-3">Delete Deal</h3>
              <p className="text-sm text-gray-700 mb-4">
                Are you sure you want to delete <span className="font-semibold">{selectedActionDeal.title}</span>? This action cannot be undone.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setDeleteDealOpen(false)} className="flex-1">Cancel</Button>
                <Button onClick={handleConfirmDeleteDeal} className="flex-1 bg-[#EF4444] hover:bg-[#EF4444]/80">
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Client Modal */}
      {addClientOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setAddClientOpen(false)} />
          <div className="relative z-10 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="bg-white border border-gray-200 rounded p-5">
              <button onClick={() => setAddClientOpen(false)} className="absolute top-3 right-3 text-gray-500"><X className="w-4 h-4" /></button>
              <h3 className="text-sm font-semibold text-black mb-4">Add Client</h3>
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">Company Name</label>
                  <Input value={acCompanyName} onChange={(e) => setAcCompanyName(e.target.value)} className="bg-white border-gray-200 text-black" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">Industry</label>
                  <Input value={acIndustry} onChange={(e) => setAcIndustry(e.target.value)} className="bg-white border-gray-200 text-black" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">Contact Name</label>
                  <Input value={acContactName} onChange={(e) => setAcContactName(e.target.value)} className="bg-white border-gray-200 text-black" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">Email</label>
                  <Input type="email" value={acEmail} onChange={(e) => setAcEmail(e.target.value)} className="bg-white border-gray-200 text-black" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">Phone</label>
                  <Input value={acPhone} onChange={(e) => setAcPhone(e.target.value)} className="bg-white border-gray-200 text-black" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">Status</label>
                  <Select value={acStatus} onValueChange={(v) => setAcStatus(v as "active" | "inactive" | "prospect")}>
                    <SelectTrigger className="h-8 bg-white border-gray-200 text-black text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200">
                      <SelectItem value="active" className="text-xs text-black">Active</SelectItem>
                      <SelectItem value="inactive" className="text-xs text-black">Inactive</SelectItem>
                      <SelectItem value="prospect" className="text-xs text-black">Prospect</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">Address</label>
                  <Input value={acAddress} onChange={(e) => setAcAddress(e.target.value)} className="bg-white border-gray-200 text-black" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">Contract Value (₱)</label>
                  <Input type="number" min={0} value={acContractValue} onChange={(e) => setAcContractValue(e.target.value)} className="bg-white border-gray-200 text-black" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">Last Contact</label>
                  <Input type="date" value={acLastContact} onChange={(e) => setAcLastContact(e.target.value)} className="bg-white border-gray-200 text-black" />
                </div>
                <div className="flex gap-2 pt-1">
                  <Button variant="outline" onClick={() => setAddClientOpen(false)} className="flex-1">Cancel</Button>
                  <Button
                    className="flex-1 bg-[#66B2B2] hover:bg-[#66B2B2]/80 text-white"
                    onClick={() => {
                      useCRMStore.getState().addClient({
                        companyName: acCompanyName,
                        industry: acIndustry,
                        contactName: acContactName,
                        email: acEmail,
                        phone: acPhone,
                        status: acStatus,
                        address: acAddress,
                        city: "",
                        country: "",
                        contractValue: Number(acContractValue) || 0,
                        lastContact: acLastContact || new Date().toISOString(),
                        notes: "",
                      });
                      setAddClientOpen(false);
                      setAcCompanyName(""); setAcIndustry(""); setAcContactName("");
                      setAcEmail(""); setAcPhone(""); setAcStatus("active");
                      setAcAddress(""); setAcContractValue(""); setAcLastContact("");
                    }}
                  >
                    Add Client →
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Client Modal */}
      {editClientOpen && editingClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setEditClientOpen(false)} />
          <div className="relative z-10 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="bg-white border border-gray-200 rounded p-5">
              <button onClick={() => setEditClientOpen(false)} className="absolute top-3 right-3 text-gray-500"><X className="w-4 h-4" /></button>
              <h3 className="text-sm font-semibold text-black mb-4">Edit Client</h3>
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">Company Name</label>
                  <Input value={editClientCompany} onChange={(e) => setEditClientCompany(e.target.value)} className="bg-white border-gray-200 text-black" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">Industry</label>
                  <Input value={editClientIndustry} onChange={(e) => setEditClientIndustry(e.target.value)} className="bg-white border-gray-200 text-black" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">Contact Name</label>
                  <Input value={editClientContactName} onChange={(e) => setEditClientContactName(e.target.value)} className="bg-white border-gray-200 text-black" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">Email</label>
                  <Input type="email" value={editClientEmail} onChange={(e) => setEditClientEmail(e.target.value)} className="bg-white border-gray-200 text-black" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">Phone</label>
                  <Input value={editClientPhone} onChange={(e) => setEditClientPhone(e.target.value)} className="bg-white border-gray-200 text-black" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">Status</label>
                  <Select value={editClientStatus} onValueChange={(v) => setEditClientStatus(v as "active" | "inactive" | "prospect")}>
                    <SelectTrigger className="h-8 bg-white border-gray-200 text-black text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200">
                      <SelectItem value="active" className="text-xs text-black">Active</SelectItem>
                      <SelectItem value="inactive" className="text-xs text-black">Inactive</SelectItem>
                      <SelectItem value="prospect" className="text-xs text-black">Prospect</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">Address</label>
                  <Input value={editClientAddress} onChange={(e) => setEditClientAddress(e.target.value)} className="bg-white border-gray-200 text-black" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">Contract Value (₱)</label>
                  <Input type="number" min={0} value={editClientContractValue} onChange={(e) => setEditClientContractValue(e.target.value)} className="bg-white border-gray-200 text-black" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">Last Contact</label>
                  <Input type="date" value={editClientLastContact} onChange={(e) => setEditClientLastContact(e.target.value)} className="bg-white border-gray-200 text-black" />
                </div>
                <div className="flex gap-2 pt-1">
                  <Button variant="outline" onClick={() => setEditClientOpen(false)} className="flex-1">Cancel</Button>
                  <Button
                    className="flex-1 bg-[#66B2B2] hover:bg-[#66B2B2]/80 text-white"
                    onClick={() => {
                      if (!editingClient) return;
                      useCRMStore.getState().updateClient(editingClient.id, {
                        companyName: editClientCompany,
                        industry: editClientIndustry,
                        contactName: editClientContactName,
                        email: editClientEmail,
                        phone: editClientPhone,
                        status: editClientStatus,
                        address: editClientAddress,
                        contractValue: Number(editClientContractValue) || 0,
                        lastContact: editClientLastContact,
                      });
                      setEditClientOpen(false);
                      setEditingClient(null);
                    }}
                  >
                    Save Changes
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

function ClientProfile({ 
  client, 
  data, 
  onBack,
  onAddEquipment
}: { 
  client: Client; 
  data: any; 
  onBack: () => void;
  onAddEquipment: () => void;
}) {
  const [profileTab, setProfileTab] = useState<"overview" | "assets" | "billing" | "history">("overview");

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
      {/* Back & Breadcrumb */}
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-gray-600 hover:text-black transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        <span className="text-xs font-medium">Back to CRM</span>
      </button>

      {/* Profile Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded bg-[#66B2B2]/10 border border-[#66B2B2]/20 flex items-center justify-center">
            <Building2 className="w-8 h-8 text-[#66B2B2]" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-black tracking-tight">{client.companyName}</h2>
            <div className="flex items-center gap-3 mt-1.5">
              <div className="flex items-center gap-1 text-xs text-gray-600">
                <Layers className="w-3.5 h-3.5" />
                {client.industry}
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-600">
                <MapPin className="w-3.5 h-3.5" />
                {client.city}, {client.country}
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="h-8 text-xs border-gray-200 text-gray-600">
            Edit Profile
          </Button>
          <Button className="h-8 text-xs bg-[#66B2B2] text-white font-bold">
            Create Booking
          </Button>
        </div>
      </div>

      {/* Profile Navigation */}
      <div className="flex gap-6 border-b border-gray-200">
        {[
          { id: "overview", label: "Overview", icon: Building2 },
          { id: "assets", label: "Equipment & Assets", icon: PackageIcon },
          { id: "billing", label: "Billing & Packages", icon: CreditCard },
          { id: "history", label: "Service History", icon: Wrench },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setProfileTab(tab.id as any)}
            className={`flex items-center gap-2 pb-3 text-xs font-semibold transition-all border-b-2 ${
              profileTab === tab.id
                ? "border-[#66B2B2] text-[#66B2B2]"
                : "border-transparent text-gray-600 hover:text-black"
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="grid grid-cols-12 gap-6">
        {profileTab === "overview" && (
          <>
            {/* Left Column: Basic Info & Contacts */}
            <div className="col-span-8 space-y-6">
              <div className="data-card p-5 space-y-4">
                <h3 className="text-sm font-bold text-black flex items-center gap-2">
                  <UserIcon className="w-4 h-4 text-[#66B2B2]" />
                  Departmental Contacts
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {data.contacts.map((contact: Contact) => (
                    <div key={contact.id} className="p-3 rounded bg-white border border-gray-200">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-xs font-bold text-black">{contact.name}</div>
                          <div className="text-[10px] text-[#66B2B2] font-medium uppercase tracking-wider">
                            {contact.department} • {contact.role}
                          </div>
                        </div>
                        {contact.isPrimary && (
                          <span className="px-1.5 py-0.5 rounded bg-[#10B981]/10 text-[#10B981] text-[9px] font-bold uppercase">
                            Primary
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-3">
                        <div className="flex items-center gap-1 text-[10px] text-gray-600">
                          <Mail className="w-3 h-3" />
                          {contact.email}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-gray-600">
                          <Phone className="w-3 h-3" />
                          {contact.phone}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Active Deals */}
              <div className="data-card p-5 space-y-4">
                <h3 className="text-sm font-bold text-black flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#66B2B2]" />
                  Active Deals
                </h3>
                <div className="space-y-2">
                  {data.deals.map((deal: Deal) => (
                    <div key={deal.id} className="flex items-center justify-between p-3 rounded bg-white border border-gray-200">
                      <div>
                        <div className="text-xs font-bold text-black">{deal.title}</div>
                        <div className="text-[10px] text-gray-600">Expected Close: {new Date(deal.expectedClose).toLocaleDateString()}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-bold text-[#66B2B2] font-mono-tech">₱{deal.value.toLocaleString()}</div>
                        <div className="text-[10px] text-gray-600 capitalize">{deal.stage.replace('_', ' ')}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Summaries & Quick Tasks */}
            <div className="col-span-4 space-y-6">
              <div className="data-card p-5 space-y-4">
                <h3 className="text-sm font-bold text-black">Client Summary</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">Total Assets</span>
                    <span className="text-xs font-bold text-black">{data.equipment.length} Units</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">Active Package</span>
                    <span className="text-xs font-bold text-[#10B981]">
                      {data.packages[0]?.tier.toUpperCase() || "NONE"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">Contract Value</span>
                    <span className="text-xs font-bold text-[#66B2B2] font-mono-tech">
                      ₱{client.contractValue.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="data-card p-5 space-y-4">
                <h3 className="text-sm font-bold text-black flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#66B2B2]" />
                  Upcoming Bookings
                </h3>
                {data.bookings.map((booking: Booking) => (
                  <div key={booking.id} className="p-2.5 rounded bg-gray-50 border border-gray-200">
                    <div className="text-[10px] font-bold text-black uppercase">{booking.serviceType}</div>
                    <div className="text-[10px] text-gray-600 mt-1">{new Date(booking.requestedDate).toLocaleDateString()} • {booking.preferredTime}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {profileTab === "assets" && (
          <div className="col-span-12 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-black">Equipment Fleet</h3>
              <Button 
                onClick={onAddEquipment}
                className="h-8 text-xs bg-[#66B2B2] text-white font-bold"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Add Equipment
              </Button>
            </div>
            <div className="data-card overflow-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left py-2.5 px-3 text-gray-600 font-medium">Unit ID</th>
                    <th className="text-left py-2.5 px-3 text-gray-600 font-medium">Type</th>
                    <th className="text-left py-2.5 px-3 text-gray-600 font-medium">Serial</th>
                    <th className="text-left py-2.5 px-3 text-gray-600 font-medium">Location</th>
                    <th className="text-left py-2.5 px-3 text-gray-600 font-medium">Status</th>
                    <th className="text-left py-2.5 px-3 text-gray-600 font-medium">Hours</th>
                    <th className="text-left py-2.5 px-3 text-gray-600 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.equipment.map((eq: Equipment) => (
                    <tr key={eq.id} className="border-b border-gray-200 group hover:bg-gray-50">
                      <td className="py-2.5 px-3 text-black font-bold">{eq.unitId}</td>
                      <td className="py-2.5 px-3 text-black">{eq.type}</td>
                      <td className="py-2.5 px-3 text-gray-600 font-mono-tech">{eq.serialNumber}</td>
                      <td className="py-2.5 px-3 text-black">{eq.location}</td>
                      <td className="py-2.5 px-3">
                        <StatusBadge status={eq.status} />
                      </td>
                      <td className="py-2.5 px-3 text-black font-mono-tech">{eq.currentHours}h</td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1">
                          <QRButton serial={eq.serialNumber} unitId={eq.unitId} />
                          <button className="p-1 rounded hover:bg-gray-100 text-gray-600 hover:text-black">
                            <Wrench className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {profileTab === "billing" && (
          <div className="col-span-12 space-y-6">
            <div className="grid grid-cols-3 gap-6">
              {data.packages.map((pkg: Package) => (
                <div key={pkg.id} className="data-card p-5 border-t-4 border-t-[#66B2B2]">
                  <div className="text-[10px] text-[#66B2B2] font-bold uppercase mb-1">{pkg.tier} Package</div>
                  <div className="text-lg font-bold text-black">{pkg.name}</div>
                  <div className="text-2xl font-bold text-black mt-4 font-mono-tech">₱{pkg.price}/mo</div>
                  <div className="mt-4 space-y-2">
                    {pkg.includedServices.map((service: string, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-[10px] text-gray-600">
                        <CheckCircle2 className="w-3 h-3 text-[#10B981]" />
                        {service}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="data-card overflow-auto">
              <h3 className="p-4 text-sm font-bold text-black">Recent Invoices</h3>
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left py-2.5 px-3 text-gray-600 font-medium">Invoice #</th>
                    <th className="text-left py-2.5 px-3 text-gray-600 font-medium">Due Date</th>
                    <th className="text-left py-2.5 px-3 text-gray-600 font-medium">Amount</th>
                    <th className="text-left py-2.5 px-3 text-gray-600 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.invoices.map((inv: Invoice) => (
                    <tr key={inv.id} className="border-b border-gray-200">
                      <td className="py-2.5 px-3 text-black font-mono-tech">{inv.invoiceNumber}</td>
                      <td className="py-2.5 px-3 text-gray-600">{new Date(inv.dueDate).toLocaleDateString()}</td>
                      <td className="py-2.5 px-3 text-[#66B2B2] font-bold font-mono-tech">₱{inv.total.toFixed(2)}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#66B2B2]/10 text-[#66B2B2] uppercase">
                          {inv.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {profileTab === "history" && (
          <div className="col-span-12">
            <div className="data-card overflow-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left py-2.5 px-3 text-gray-600 font-medium">Date</th>
                    <th className="text-left py-2.5 px-3 text-gray-600 font-medium">Equipment</th>
                    <th className="text-left py-2.5 px-3 text-gray-600 font-medium">Service Type</th>
                    <th className="text-left py-2.5 px-3 text-gray-600 font-medium">Technician</th>
                    <th className="text-left py-2.5 px-3 text-gray-600 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.serviceHistory.map((s: ServiceRecord) => (
                    <tr key={s.id} className="border-b border-gray-200">
                      <td className="py-2.5 px-3 text-gray-600 font-mono-tech">
                        {s.completedDate ? new Date(s.completedDate).toLocaleDateString() : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-black font-bold">
                        {data.equipment.find((e: Equipment) => e.id === s.equipmentId)?.unitId || '—'}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#66B2B2]/10 text-[#66B2B2] uppercase">
                          {s.serviceType}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-black">{s.technician}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                          s.status === 'completed' ? 'bg-[#10B981]/10 text-[#10B981]' : 'bg-[#66B2B2]/10 text-[#66B2B2]'
                        }`}>
                          {s.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: Equipment["status"] }) {
  const configs: Record<Equipment["status"], { label: string; color: string }> = {
    active: { label: "Active", color: "bg-[#10B981]/10 text-[#10B981]" },
    inactive: { label: "Inactive", color: "bg-gray-100 text-gray-600" },
    maintenance: { label: "Maintenance", color: "bg-[#66B2B2]/10 text-[#66B2B2]" },
    retired: { label: "Retired", color: "bg-[#EF4444]/10 text-[#EF4444]" },
    under_service: { label: "Under Service", color: "bg-[#8B5CF6]/10 text-[#8B5CF6]" },
    broken: { label: "Broken", color: "bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/30" },
    service_due: { label: "Service Due", color: "bg-[#66B2B2]/20 text-[#66B2B2] animate-pulse" },
  };

  const config = configs[status];
  return (
    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${config.color}`}>
      {config.label}
    </span>
  );
}

function QRButton({ serial, unitId }: { serial: string; unitId: string }) {
  const [open, setOpen] = useState(false);
  const scanUrl = `${window.location.origin}/asset/${serial}`;

  return (
    <>
      <button 
        onClick={() => setOpen(true)}
        className="p-1 rounded hover:bg-gray-100 text-gray-600 hover:text-[#66B2B2] transition-colors"
        title="View QR Code"
      >
        <QrCode className="w-3.5 h-3.5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative bg-white border border-gray-200 rounded-lg p-6 max-w-sm w-full animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-black"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center space-y-4">
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-black">{unitId}</h3>
                <p className="text-xs text-gray-600 font-mono-tech">S/N: {serial}</p>
              </div>

              <div className="bg-white p-4 rounded-lg inline-block mx-auto">
                <QRCodeSVG 
                  value={scanUrl}
                  size={200}
                  level="H"
                  includeMargin={false}
                />
              </div>

              <p className="text-[10px] text-gray-600 leading-relaxed">
                Scan this code to view service history or log a new maintenance record.
              </p>

              <div className="flex gap-2 pt-2">
                <Button 
                  variant="outline" 
                  className="flex-1 h-9 text-xs border-gray-200 hover:bg-gray-50"
                  onClick={() => window.print()}
                >
                  <Download className="w-3.5 h-3.5 mr-2" />
                  Print Label
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function DealCard({
  deal,
  client,
  draggable,
  onDragStart,
  isMenuOpen,
  onMenuToggle,
  onEdit,
  onDelete,
}: {
  deal: Deal;
  client?: Client;
  draggable?: boolean;
  onDragStart?: () => void;
  isMenuOpen?: boolean;
  onMenuToggle?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const statusColors: Record<string, string> = {
    inquiry: "#66B2B2",
    proposal: "#8B5CF6",
    negotiation: "#66B2B2",
    closed_won: "#10B981",
    closed_lost: "#EF4444",
  };

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      className="relative data-card p-3 cursor-grab active:cursor-grabbing hover:border-[#66B2B2]/30 transition-all"
    >
      <div className="flex items-start justify-between mb-1.5 gap-2">
        <span className="text-[10px] text-gray-600 font-mono-tech">{client?.companyName || "Unknown"}</span>
        <div className="relative">
          <button
            type="button"
            data-deal-menu-trigger
            onClick={(event) => {
              event.stopPropagation();
              onMenuToggle?.();
            }}
            className="p-1 rounded-full transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#66B2B2]/30"
          >
            <MoreVertical className="w-4 h-4 text-gray-600" />
          </button>
          {isMenuOpen && (
            <div
              data-deal-menu-open="true"
              className="absolute right-0 top-8 z-20 min-w-[170px] rounded-lg border border-gray-200 bg-white shadow-lg py-1"
            >
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onEdit?.();
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-black hover:bg-gray-50"
              >
                <PenTool className="w-3.5 h-3.5 text-[#66B2B2]" />
                Edit Deal
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onDelete?.();
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[#EF4444] hover:bg-[#EF4444]/10"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Deal
              </button>
            </div>
          )}
        </div>
      </div>
      <h4 className="text-xs font-semibold text-black mb-1">{deal.title}</h4>
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-[#66B2B2] font-mono-tech">
          ₱{deal.value.toLocaleString()}
        </span>
        <span className="text-[10px] text-gray-600">{deal.probability}% prob</span>
      </div>
    </div>
  );
}

function ClientRow({ client, onClick, onEdit }: { client: Client; onClick: () => void; onEdit: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const statusColors = {
    active: "bg-[#10B981]/20 text-[#10B981]",
    prospect: "bg-[#66B2B2]/20 text-[#66B2B2]",
    inactive: "bg-[#EF4444]/20 text-[#EF4444]",
  };

  return (
    <tr
      className="grid-table-row border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
      onClick={onClick}
    >
      <td className="py-2.5 px-3">
        <div className="text-black font-medium">{client.companyName}</div>
        <div className="text-[10px] text-gray-600">{client.industry}</div>
      </td>
      <td className="py-2.5 px-3">
        <div>
          <p className="text-xs font-medium text-black">{client.contactName || "—"}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {client.email || "—"} {client.phone ? `| ${client.phone}` : ""}
          </p>
        </div>
      </td>
      <td className="py-2.5 px-3 text-xs text-gray-600">{client.address || "—"}</td>
      <td className="py-2.5 px-3">
        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${statusColors[client.status]}`}>
          {client.status}
        </span>
      </td>
      <td className="py-2.5 px-3 text-[#66B2B2] font-mono-tech font-bold">
        ₱{client.contractValue.toLocaleString()}
      </td>
      <td className="py-2.5 px-3 text-gray-600 font-mono-tech text-[10px]">
        {new Date(client.lastContact).toLocaleDateString()}
      </td>
      <td className="py-2.5 px-3">
        <div className="flex items-center gap-1">
          <button className="p-1 rounded hover:bg-gray-100" onClick={(e) => { e.stopPropagation(); if (client.phone) window.location.href = `tel:${client.phone}`; }}>
            <Phone className="w-3 h-3 text-gray-600" />
          </button>
          <button className="p-1 rounded hover:bg-gray-100" onClick={(e) => { e.stopPropagation(); if (client.email) window.location.href = `mailto:${client.email}`; }}>
            <Mail className="w-3 h-3 text-gray-600" />
          </button>
          <div className="relative">
            <button
              className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
              onClick={(e) => { e.stopPropagation(); setMenuOpen((o) => !o); }}
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-7 z-50 min-w-[120px] rounded border border-gray-200 bg-white py-1 shadow-lg">
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 transition-colors"
                  onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onEdit(); }}
                >
                  <Pencil className="w-3 h-3" />
                  Edit
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors"
                  onClick={(e) => { e.stopPropagation(); setMenuOpen(false); useCRMStore.getState().deleteClient(client.id); }}
                >
                  <Trash2 className="w-3 h-3" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
}

function LeadCard({ lead, client }: { lead: Lead; client?: Client }) {
  const priorityColors = {
    low: "bg-[#66B2B2]/20 text-[#66B2B2]",
    medium: "bg-[#66B2B2]/20 text-[#66B2B2]",
    high: "bg-[#EF4444]/20 text-[#EF4444]",
  };

  const statusColors = {
    new: "#66B2B2",
    contacted: "#66B2B2",
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
          <span className="text-[10px] text-gray-600">{lead.source}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: statusColors[lead.status] }} />
          <span className="text-[10px] text-gray-600 capitalize">{lead.status}</span>
        </div>
      </div>
      <div className="text-xs text-black font-medium mb-1">{lead.notes}</div>
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-gray-600">{client?.companyName || "No client"}</span>
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
    low: "border-l-[#66B2B2]",
    medium: "border-l-[#66B2B2]",
    high: "border-l-[#EF4444]",
  };

  return (
    <div
      className={`flex items-center gap-3 p-2.5 rounded bg-white border border-gray-200 border-l-2 ${priorityColors[task.priority]} hover:bg-gray-50 transition-colors`}
    >
      <button
        onClick={() => onComplete(task.id)}
        className="w-4 h-4 rounded border border-gray-300 flex items-center justify-center hover:border-[#10B981] hover:bg-[#10B981]/10 transition-colors shrink-0"
      >
        {task.status === "completed" && <CheckCircle2 className="w-3 h-3 text-[#10B981]" />}
      </button>
      <div className="flex-1 min-w-0">
        <div className={`text-xs font-medium ${overdue ? "text-[#EF4444]" : "text-black"}`}>
          {task.title}
        </div>
        <div className="text-[10px] text-gray-600 truncate">{task.description}</div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[10px] text-gray-600 font-mono-tech">
          {new Date(task.dueDate).toLocaleDateString()}
        </span>
        <span className="text-[10px] text-gray-600">{task.assignedTo}</span>
      </div>
    </div>
  );
}

function SalesPerformance({ leads, deals, tasks }: { leads: Lead[]; deals: Deal[]; tasks: Task[] }) {
  const salespeople = ["Sarah Blake", "James Rodriguez", "Marcus Chen", "Marketing System"];

  const stats = salespeople.map(person => {
    const assignedLeads = leads.filter(l => l.assignedTo === person).length;
    const contactedLeads = leads.filter(l => l.assignedTo === person && l.status !== "new").length;
    const wonDeals = deals.filter(d => d.assignedTo === person && d.stage === "closed_won").length;
    const overdueTasks = tasks.filter(t => t.assignedTo === person && t.status === "overdue").length;
    const conversion = assignedLeads > 0 ? Math.round((wonDeals / assignedLeads) * 100) : 0;
    
    return {
      name: person,
      assigned: assignedLeads,
      contacted: contactedLeads,
      won: wonDeals,
      overdue: overdueTasks,
      conversion
    };
  });

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="grid grid-cols-4 gap-3">
        <div className="data-card p-4">
          <div className="text-[10px] text-gray-600 uppercase font-bold mb-1">Top Performer</div>
          <div className="text-xl font-bold text-[#10B981]">{stats.sort((a,b) => b.won - a.won)[0].name}</div>
          <div className="text-[10px] text-gray-600 mt-1">Most deals closed</div>
        </div>
        <div className="data-card p-4">
          <div className="text-[10px] text-gray-600 uppercase font-bold mb-1">Team Avg Conversion</div>
          <div className="text-xl font-bold text-[#66B2B2]">
            {Math.round(stats.reduce((s, a) => s + a.conversion, 0) / stats.length)}%
          </div>
          <div className="text-[10px] text-gray-600 mt-1">Across all channels</div>
        </div>
        <div className="data-card p-4">
          <div className="text-[10px] text-gray-600 uppercase font-bold mb-1">Total Active Leads</div>
          <div className="text-xl font-bold text-black">{leads.filter(l => l.status !== 'lost').length}</div>
          <div className="text-[10px] text-gray-600 mt-1">In current pipeline</div>
        </div>
        <div className="data-card p-4 border border-[#EF4444]/20 bg-[#EF4444]/5">
          <div className="text-[10px] text-[#EF4444] uppercase font-bold mb-1">Critical Follow-ups</div>
          <div className="text-xl font-bold text-[#EF4444]">{tasks.filter(t => t.status === 'overdue').length}</div>
          <div className="text-[10px] text-[#EF4444]/70 mt-1">Immediate action required</div>
        </div>
      </div>

      <div className="data-card overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-sm font-bold text-black">Salesperson Performance Matrix</h3>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left py-3 px-4 text-gray-600 font-medium uppercase tracking-wider text-[10px]">Salesperson</th>
              <th className="text-left py-3 px-4 text-gray-600 font-medium uppercase tracking-wider text-[10px]">Assigned Leads</th>
              <th className="text-left py-3 px-4 text-gray-600 font-medium uppercase tracking-wider text-[10px]">Contacted</th>
              <th className="text-left py-3 px-4 text-gray-600 font-medium uppercase tracking-wider text-[10px]">Closed Deals</th>
              <th className="text-left py-3 px-4 text-gray-600 font-medium uppercase tracking-wider text-[10px]">Conversion %</th>
              <th className="text-left py-3 px-4 text-gray-600 font-medium uppercase tracking-wider text-[10px]">Overdue</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((s, i) => (
              <tr key={i} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                <td className="py-3 px-4 font-bold text-black">{s.name}</td>
                <td className="py-3 px-4 text-gray-600 font-mono-tech">{s.assigned}</td>
                <td className="py-3 px-4 text-gray-600 font-mono-tech">{s.contacted}</td>
                <td className="py-3 px-4 text-[#10B981] font-bold font-mono-tech">{s.won}</td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#66B2B2] w-8">{s.conversion}%</span>
                    <div className="flex-1 h-1.5 w-20 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-[#66B2B2]" style={{ width: `${s.conversion}%` }} />
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className={`font-bold ${s.overdue > 0 ? 'text-[#EF4444]' : 'text-gray-600'}`}>
                    {s.overdue}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
