import { useState, useMemo } from "react";
import { useCRMStore } from "@/stores/useCRMStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { useOperationsStore } from "@/stores/useOperationsStore";
import { useBillingStore } from "@/stores/useBillingStore";
import type { Deal, DealStage, Task, Client, Contact, Equipment, ServiceRecord, Booking, Package, Invoice } from "@/types";
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
  FileText,
  Wrench,
  CreditCard,
  User as UserIcon,
  Plus,
  X,
  Package as PackageIcon,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

type TabType = "clients" | "pipeline" | "tasks" | "leads";

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

  const [activeTab, setActiveTab] = useState<TabType>("pipeline");
  const [searchQuery, setSearchQuery] = useState("");
  const [clientFilter, setClientFilter] = useState("all");
  const [draggingDeal, setDraggingDeal] = useState<number | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);

  // Modals
  const [dealModalOpen, setDealModalOpen] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);

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

  if (selectedClientId && selectedClient && clientData) {
    return (
      <ClientProfile 
        client={selectedClient} 
        data={clientData} 
        onBack={() => setSelectedClientId(null)} 
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[32px] font-bold text-[#EAEAEA] tracking-[-0.02em]">CRM</h1>
          <p className="text-sm text-[#88888C] mt-0.5">Client management & sales pipeline</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-[#EF4444]/10 border border-[#EF4444]/20">
            <AlertTriangle className="w-3.5 h-3.5 text-[#EF4444]" />
            <span className="text-xs text-[#EF4444] font-medium">{overdueTasks.length} overdue</span>
          </div>
        </div>
      </div>

      {/* Search Bar */}
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
            onClick={() => setActiveTab(tab.id)}
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
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#F2A900]" />
              <h3 className="text-sm font-semibold text-[#EAEAEA]">Sales Pipeline</h3>
            </div>
            <Button onClick={() => setDealModalOpen(true)} className="h-8 bg-[#F2A900] hover:bg-[#F2A900]/80 text-[#050505] text-xs font-bold">
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
                  <ClientRow 
                    key={client.id} 
                    client={client} 
                    onClick={() => setSelectedClientId(client.id)}
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
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#88888C]" />
                <Input
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 bg-[#1A1A20] border-white/10 text-[#EAEAEA] text-xs placeholder:text-[#88888C]/50"
                />
              </div>
            </div>
            <Button onClick={() => setTaskModalOpen(true)} className="h-8 bg-[#F2A900] hover:bg-[#F2A900]/80 text-[#050505] text-xs font-bold">
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
    </div>
  );
}

function ClientProfile({ 
  client, 
  data, 
  onBack 
}: { 
  client: Client; 
  data: any; 
  onBack: () => void 
}) {
  const [profileTab, setProfileTab] = useState<"overview" | "assets" | "billing" | "history">("overview");

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
      {/* Back & Breadcrumb */}
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-[#88888C] hover:text-[#EAEAEA] transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        <span className="text-xs font-medium">Back to CRM</span>
      </button>

      {/* Profile Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded bg-[#F2A900]/10 border border-[#F2A900]/20 flex items-center justify-center">
            <Building2 className="w-8 h-8 text-[#F2A900]" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-[#EAEAEA] tracking-tight">{client.companyName}</h2>
            <div className="flex items-center gap-3 mt-1.5">
              <div className="flex items-center gap-1 text-xs text-[#88888C]">
                <Layers className="w-3.5 h-3.5" />
                {client.industry}
              </div>
              <div className="flex items-center gap-1 text-xs text-[#88888C]">
                <MapPin className="w-3.5 h-3.5" />
                {client.city}, {client.country}
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="h-8 text-xs border-white/10 text-[#88888C]">
            Edit Profile
          </Button>
          <Button className="h-8 text-xs bg-[#F2A900] text-[#050505] font-bold">
            Create Booking
          </Button>
        </div>
      </div>

      {/* Profile Navigation */}
      <div className="flex gap-6 border-b border-white/5">
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
                ? "border-[#F2A900] text-[#F2A900]"
                : "border-transparent text-[#88888C] hover:text-[#EAEAEA]"
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
                <h3 className="text-sm font-bold text-[#EAEAEA] flex items-center gap-2">
                  <UserIcon className="w-4 h-4 text-[#F2A900]" />
                  Departmental Contacts
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {data.contacts.map((contact: Contact) => (
                    <div key={contact.id} className="p-3 rounded bg-[#1A1A20] border border-white/5">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-xs font-bold text-[#EAEAEA]">{contact.name}</div>
                          <div className="text-[10px] text-[#F2A900] font-medium uppercase tracking-wider">
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
                        <div className="flex items-center gap-1 text-[10px] text-[#88888C]">
                          <Mail className="w-3 h-3" />
                          {contact.email}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-[#88888C]">
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
                <h3 className="text-sm font-bold text-[#EAEAEA] flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#F2A900]" />
                  Active Deals
                </h3>
                <div className="space-y-2">
                  {data.deals.map((deal: Deal) => (
                    <div key={deal.id} className="flex items-center justify-between p-3 rounded bg-[#1A1A20] border border-white/5">
                      <div>
                        <div className="text-xs font-bold text-[#EAEAEA]">{deal.title}</div>
                        <div className="text-[10px] text-[#88888C]">Expected Close: {new Date(deal.expectedClose).toLocaleDateString()}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-bold text-[#F2A900] font-mono-tech">${deal.value.toLocaleString()}</div>
                        <div className="text-[10px] text-[#88888C] capitalize">{deal.stage.replace('_', ' ')}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Summaries & Quick Tasks */}
            <div className="col-span-4 space-y-6">
              <div className="data-card p-5 space-y-4">
                <h3 className="text-sm font-bold text-[#EAEAEA]">Client Summary</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#88888C]">Total Assets</span>
                    <span className="text-xs font-bold text-[#EAEAEA]">{data.equipment.length} Units</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#88888C]">Active Package</span>
                    <span className="text-xs font-bold text-[#10B981]">
                      {data.packages[0]?.tier.toUpperCase() || "NONE"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#88888C]">Contract Value</span>
                    <span className="text-xs font-bold text-[#F2A900] font-mono-tech">
                      ${client.contractValue.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="data-card p-5 space-y-4">
                <h3 className="text-sm font-bold text-[#EAEAEA] flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#F2A900]" />
                  Upcoming Bookings
                </h3>
                {data.bookings.map((booking: Booking) => (
                  <div key={booking.id} className="p-2.5 rounded bg-[#1A1A20] border border-white/5">
                    <div className="text-[10px] font-bold text-[#EAEAEA] uppercase">{booking.serviceType}</div>
                    <div className="text-[10px] text-[#88888C] mt-1">{new Date(booking.requestedDate).toLocaleDateString()} • {booking.preferredTime}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {profileTab === "assets" && (
          <div className="col-span-12">
            <div className="data-card overflow-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-[#0A0A0C]">
                    <th className="text-left py-2.5 px-3 text-[#88888C] font-medium">Unit ID</th>
                    <th className="text-left py-2.5 px-3 text-[#88888C] font-medium">Type</th>
                    <th className="text-left py-2.5 px-3 text-[#88888C] font-medium">Serial</th>
                    <th className="text-left py-2.5 px-3 text-[#88888C] font-medium">Location</th>
                    <th className="text-left py-2.5 px-3 text-[#88888C] font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.equipment.map((eq: Equipment) => (
                    <tr key={eq.id} className="border-b border-white/5">
                      <td className="py-2.5 px-3 text-[#EAEAEA] font-bold">{eq.unitId}</td>
                      <td className="py-2.5 px-3 text-[#EAEAEA]">{eq.type}</td>
                      <td className="py-2.5 px-3 text-[#88888C] font-mono-tech">{eq.serialNumber}</td>
                      <td className="py-2.5 px-3 text-[#EAEAEA]">{eq.location}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#10B981]/10 text-[#10B981] uppercase">
                          {eq.status}
                        </span>
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
                <div key={pkg.id} className="data-card p-5 border-t-4 border-t-[#F2A900]">
                  <div className="text-[10px] text-[#F2A900] font-bold uppercase mb-1">{pkg.tier} Package</div>
                  <div className="text-lg font-bold text-[#EAEAEA]">{pkg.name}</div>
                  <div className="text-2xl font-bold text-[#EAEAEA] mt-4 font-mono-tech">${pkg.price}/mo</div>
                  <div className="mt-4 space-y-2">
                    {pkg.includedServices.map((service: string, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-[10px] text-[#88888C]">
                        <CheckCircle2 className="w-3 h-3 text-[#10B981]" />
                        {service}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="data-card overflow-auto">
              <h3 className="p-4 text-sm font-bold text-[#EAEAEA]">Recent Invoices</h3>
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-[#0A0A0C]">
                    <th className="text-left py-2.5 px-3 text-[#88888C] font-medium">Invoice #</th>
                    <th className="text-left py-2.5 px-3 text-[#88888C] font-medium">Due Date</th>
                    <th className="text-left py-2.5 px-3 text-[#88888C] font-medium">Amount</th>
                    <th className="text-left py-2.5 px-3 text-[#88888C] font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.invoices.map((inv: Invoice) => (
                    <tr key={inv.id} className="border-b border-white/5">
                      <td className="py-2.5 px-3 text-[#EAEAEA] font-mono-tech">{inv.invoiceNumber}</td>
                      <td className="py-2.5 px-3 text-[#88888C]">{new Date(inv.dueDate).toLocaleDateString()}</td>
                      <td className="py-2.5 px-3 text-[#F2A900] font-bold font-mono-tech">${inv.total.toFixed(2)}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#F2A900]/10 text-[#F2A900] uppercase">
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
                  <tr className="bg-[#0A0A0C]">
                    <th className="text-left py-2.5 px-3 text-[#88888C] font-medium">Date</th>
                    <th className="text-left py-2.5 px-3 text-[#88888C] font-medium">Equipment</th>
                    <th className="text-left py-2.5 px-3 text-[#88888C] font-medium">Service Type</th>
                    <th className="text-left py-2.5 px-3 text-[#88888C] font-medium">Technician</th>
                    <th className="text-left py-2.5 px-3 text-[#88888C] font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.serviceHistory.map((s: ServiceRecord) => (
                    <tr key={s.id} className="border-b border-white/5">
                      <td className="py-2.5 px-3 text-[#88888C] font-mono-tech">
                        {s.completedDate ? new Date(s.completedDate).toLocaleDateString() : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-[#EAEAEA] font-bold">
                        {data.equipment.find((e: Equipment) => e.id === s.equipmentId)?.unitId || '—'}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#005F73]/10 text-[#005F73] uppercase">
                          {s.serviceType}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-[#EAEAEA]">{s.technician}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                          s.status === 'completed' ? 'bg-[#10B981]/10 text-[#10B981]' : 'bg-[#F2A900]/10 text-[#F2A900]'
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

function ClientRow({ client, onClick }: { client: Client; onClick: () => void }) {
  const statusColors = {
    active: "bg-[#10B981]/20 text-[#10B981]",
    prospect: "bg-[#F2A900]/20 text-[#F2A900]",
    inactive: "bg-[#EF4444]/20 text-[#EF4444]",
  };

  return (
    <tr 
      className="grid-table-row border-b border-[#2A2A30] cursor-pointer hover:bg-[#2A2A30] transition-colors"
      onClick={onClick}
    >
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

function LeadCard({ lead, client }: { lead: Lead; client?: Client }) {
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
