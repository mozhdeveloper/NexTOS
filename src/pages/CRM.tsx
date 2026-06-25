import { useState, useMemo, useEffect, useRef } from "react";
import { useCRMStore, seedStaff, computeTaskStatus } from "@/stores/useCRMStore";
import seedData from "@/data/seed-data.json";
import { useAuthStore } from "@/stores/useAuthStore";
import { useOperationsStore } from "@/stores/useOperationsStore";
import { useBillingStore } from "@/stores/useBillingStore";
import type { Deal, DealStage, Task, TaskReport, Client, Contact, Equipment, ServiceRecord, Booking, Package, Invoice, Lead } from "@/types";
import { QRCodeSVG } from "qrcode.react";
import CRMDashboard from "@/components/CRMDashboard";
import { TaskReportView } from "@/components/TaskReportView";
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
type LeadListView = "active" | "converted" | "lost";

const STATUS_ORDER: Record<string, number> = { overdue: 0, due_today: 1, due_soon: 2, upcoming: 3 };
const LEAD_SOURCES = ["Website", "Referral", "LinkedIn", "Cold Call", "Email Campaign", "Trade Show", "Partner", "Inbound Call"];
const LEAD_INQUIRY_TYPES: NonNullable<Lead["inquiryType"]>[] = ["sales", "quote", "pms", "equipment", "general"];
const CRM_MODAL_VIEWPORT_CLASS = "fixed inset-0 z-50 flex h-dvh w-dvw items-center justify-center overflow-hidden p-5";
const CRM_MODAL_PANEL_CLASS = "relative z-10 w-full max-w-md max-h-[90vh] overflow-y-auto animate-in fade-in-0 zoom-in-95 duration-200";
const CRM_MODAL_PANEL_SM_CLASS = "relative z-10 w-full max-w-sm max-h-[90vh] overflow-y-auto animate-in fade-in-0 zoom-in-95 duration-200";
const CRM_MODAL_BACKDROP_CLASS = "fixed inset-0 h-dvh w-dvw bg-black/50 backdrop-blur-sm animate-in fade-in-0 duration-200";
const CRM_MODAL_CARD_CLASS = "bg-white border border-gray-200 rounded-2xl p-6 shadow-2xl";
const CRM_MODAL_LABEL_CLASS = "text-[10px] text-gray-400 font-black uppercase tracking-widest ml-1";
const CRM_MODAL_INPUT_CLASS = "h-12 bg-white border-gray-200 focus:ring-[#66B2B2]/20 text-gray-900";
const CRM_MODAL_SELECT_CLASS = "h-12 w-full bg-white border-gray-200 focus:ring-[#66B2B2]/20 text-gray-900";
const CRM_MODAL_CANCEL_CLASS = "rounded-xl h-12 font-bold border-gray-200";
const CRM_MODAL_SUBMIT_CLASS = "bg-[#66B2B2] text-white hover:bg-[#5A9E9E] font-bold rounded-xl h-12";

export default function CRM() {
  const { user } = useAuthStore();
  const {
    clients,
    deals,
    tasks,
    leads,
    contacts,
    taskReports,
    moveDealStage,
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

  // Lead modal state
  const [leadModalOpen, setLeadModalOpen] = useState(false);
  const [leadListView, setLeadListView] = useState<LeadListView>("active");
  const [leadCompany, setLeadCompany] = useState("");
  const [leadName, setLeadName] = useState("");
  const [leadSource, setLeadSource] = useState("Website");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [leadInquiryType, setLeadInquiryType] = useState<NonNullable<Lead["inquiryType"]>>("sales");
  const [leadPriority, setLeadPriority] = useState<Lead["priority"]>("medium");
  const [leadNotes, setLeadNotes] = useState("");

  // Edit lead modal state
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [editLeadCompany, setEditLeadCompany] = useState("");
  const [editLeadName, setEditLeadName] = useState("");
  const [editLeadSource, setEditLeadSource] = useState("");
  const [editLeadInquiryType, setEditLeadInquiryType] = useState("");
  const [editLeadEmail, setEditLeadEmail] = useState("");
  const [editLeadPhone, setEditLeadPhone] = useState("");
  const [editLeadPriority, setEditLeadPriority] = useState<"low" | "medium" | "high">("medium");
  const [editLeadNotes, setEditLeadNotes] = useState("");

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
  const [salesTaskType, setSalesTaskType] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskPriority, setTaskPriority] = useState<"low" | "medium" | "high">("medium");
  const [taskClientId, setTaskClientId] = useState<number | null>(null);
  const [taskAssignedTo, setTaskAssignedTo] = useState<string>("");
  const autoAssignTask = (() => {
    try { return window.localStorage.getItem("nextos-auto-assign-task") !== "false"; }
    catch { return true; }
  })();

  // Edit Task modal state
  const [editTaskOpen, setEditTaskOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editTaskTitle, setEditTaskTitle] = useState("");
  const [editTaskType, setEditTaskType] = useState("");
  const [editTaskDueDate, setEditTaskDueDate] = useState("");
  const [editTaskPriority, setEditTaskPriority] = useState<"low" | "medium" | "high">("medium");
  const [editTaskClientId, setEditTaskClientId] = useState<string>("none");
  const [editTaskAssignedTo, setEditTaskAssignedTo] = useState("");

  // Tasks sub-tab
  const [tasksView, setTasksView] = useState<"active" | "reports">("active");

  // Done modal (sales)
  const [doneModalOpen, setDoneModalOpen] = useState(false);
  const [doneTask, setDoneTask] = useState<Task | null>(null);
  const [doneNotes, setDoneNotes] = useState("");
  const [doneFiles, setDoneFiles] = useState<File[]>([]);

  // View Report modal
  const [viewReportOpen, setViewReportOpen] = useState(false);
  const [viewingReport, setViewingReport] = useState<TaskReport | null>(null);

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
      equipment: equipment.filter(e => String(e.clientId) === String(selectedClientId)),
      deals: deals.filter(d => d.clientId === selectedClientId),
      serviceHistory: serviceRecords.filter(s => s.clientId === selectedClientId),
      bookings: bookings.filter(b => String(b.clientId) === String(selectedClientId)),
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
  const deleteClientMutation = trpc.clients.delete.useMutation();
  const createTaskMutation = trpc.tasks.create.useMutation();
  const updateTaskMutation = trpc.tasks.update.useMutation();
  const deleteTaskMutation = trpc.tasks.delete.useMutation();
  const upsertTaskReportMutation = trpc.taskReports.upsert.useMutation();
  const moveDealMutation = trpc.deals.move.useMutation();

  const trpcUtils = trpc.useUtils();
  const { data: tasksData } = trpc.tasks.list.useQuery(undefined, { staleTime: 30_000 });
  const { data: taskReportsData } = trpc.taskReports.list.useQuery(undefined, { staleTime: 30_000 });

  const crmTasksInjectedRef = useRef(false);
  useEffect(() => {
    if (!tasksData || crmTasksInjectedRef.current) return;
    crmTasksInjectedRef.current = true;
    const injectedTasks = tasksData.tasks.map((t: any) => ({
      id: t.id, title: t.title, description: t.description ?? "",
      assignedTo: t.assignedTo, relatedType: t.relatedType,
      relatedId: t.relatedId ?? null, dueDate: t.dueDate,
      priority: t.priority, status: t.status, createdAt: t.createdAt,
      salesTaskType: t.salesTaskType, clientId: t.clientId ?? null,
      isAutoAssigned: t.isAutoAssigned ?? false,
    }));
    useCRMStore.setState({ tasks: injectedTasks } as any);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasksData]);

  const crmReportsInjectedRef = useRef(false);
  useEffect(() => {
    if (!taskReportsData || crmReportsInjectedRef.current) return;
    crmReportsInjectedRef.current = true;
    useCRMStore.setState({ taskReports: taskReportsData.reports });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskReportsData]);

  const { data: leadsData } = trpc.leads.list.useQuery(undefined, { staleTime: 30_000 });
  const crmLeadsInjectedRef = useRef(false);
  useEffect(() => {
    if (!leadsData || crmLeadsInjectedRef.current) return;
    crmLeadsInjectedRef.current = true;
    useCRMStore.setState({ leads: leadsData.leads } as any);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadsData]);

  const createLeadMutation = trpc.leads.create.useMutation();
  const updateLeadMutation = trpc.leads.update.useMutation();
  const convertLeadMutation = trpc.leads.convert.useMutation();

  // Seed `clients` is the live source of truth for the CRM client list. Map seed shape
  // (CL-XXX string id, mainContact) to store shape (numeric id, contactName) and MERGE —
  // so seed clients (incl. ones created by lead conversion) appear, while clients added
  // locally via the Add Client modal (not yet persisted to seed) are preserved.
  const { data: clientsData } = trpc.clients.list.useQuery(undefined, { staleTime: 30_000 });
  const crmClientsInjectedRef = useRef(false);
  useEffect(() => {
    if (!clientsData || crmClientsInjectedRef.current) return;
    crmClientsInjectedRef.current = true;
    const mapped = clientsData.clients.map((c: any) => ({
      id: Number(String(c.id).replace("CL-", "")),
      companyName: c.companyName,
      industry: c.industry ?? "",
      contactName: c.mainContact ?? "",
      email: c.email ?? "",
      phone: c.phone ?? "",
      status: (c.status as "active" | "inactive" | "prospect") ?? "active",
      address: c.address ?? "",
      city: "",
      country: "Philippines",
      contractValue: c.contractValue ?? 0,
      lastContact: c.lastContact ?? new Date().toISOString(),
      notes: "",
      createdAt: new Date().toISOString(),
    }));
    useCRMStore.setState((state: any) => ({
      clients: [
        ...state.clients.filter((c: any) => !mapped.some((mc: any) => mc.id === c.id)),
        ...mapped,
      ],
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientsData]);

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

  const resetLeadForm = () => {
    setLeadCompany("");
    setLeadName("");
    setLeadSource("Website");
    setLeadEmail("");
    setLeadPhone("");
    setLeadInquiryType("sales");
    setLeadPriority("medium");
    setLeadNotes("");
  };

  const getLeadDealTitle = (lead: Lead) => {
    return lead.notes?.trim() || lead.company || lead.name || "New Prospect";
  };

  const isLeadConverted = (lead: Lead) => {
    return Boolean(lead.convertedToDealId || lead.convertedAt);
  };

  // Component-scope task-type label resolver (mirrors the one inside the active-tasks
  // render block) so the Done handler and report fallbacks can reuse it.
  const resolveTaskTypeLabel = (task: { salesTaskType?: string; serviceType?: string }): string => {
    const list = (seedData as any).salesTaskTypes as { value: string; label: string }[];
    if (task.salesTaskType) {
      return list.find((t) => t.value === task.salesTaskType)?.label ?? task.salesTaskType;
    }
    if (task.serviceType) {
      return (seedData as any).serviceTypes.find((t: any) => t.value === task.serviceType)?.label ?? task.serviceType;
    }
    return "—";
  };

  const handleAddLead = () => {
    const newId = Date.now();
    const payload = {
      id: newId,
      clientId: null,
      company: leadCompany.trim(),
      name: leadName.trim(),
      source: leadSource,
      email: leadEmail.trim(),
      phone: leadPhone.trim(),
      inquiryType: leadInquiryType,
      status: "new" as const,
      priority: leadPriority,
      score: 0,
      assignedTo: user?.name || "",
      notes: leadNotes.trim() || leadCompany.trim() || leadName.trim() || "New lead",
      createdAt: new Date().toISOString(),
    };
    useCRMStore.getState().addLead(payload);
    createLeadMutation.mutate(payload, {
      onSuccess: () => trpcUtils.leads.list.invalidate(),
      onError: (err) => console.error("leads.create failed", err),
    });
    setLeadModalOpen(false);
    resetLeadForm();
  };

  const handleOpenEditLead = (lead: Lead) => {
    setEditingLead(lead);
    setEditLeadCompany(lead.company || "");
    setEditLeadName(lead.name || "");
    setEditLeadSource(lead.source || "");
    setEditLeadInquiryType(lead.inquiryType || "");
    setEditLeadEmail(lead.email || "");
    setEditLeadPhone(lead.phone || "");
    setEditLeadPriority(lead.priority);
    setEditLeadNotes(lead.notes || "");
  };

  const handleUpdateLeadStatus = (leadId: number, status: Lead["status"]) => {
    useCRMStore.getState().updateLead(leadId, { status });
    updateLeadMutation.mutate({ id: leadId, data: { status } }, {
      onError: (err) => console.error("leads.update failed", err),
    });
  };

  const handleConvertLead = (lead: Lead) => {
    if (isLeadConverted(lead)) return;

    const clientData = {
      companyName: lead.company || lead.name || "New Prospect",
      industry: "-",
      contactName: lead.name || "-",
      email: lead.email || "-",
      phone: lead.phone || "-",
      status: "prospect",
      address: "-",
      city: "-",
      country: "-",
      contractValue: 0,
      lastContact: lead.createdAt || new Date().toISOString(),
      notes: lead.notes || "",
    };

    // ONE atomic server mutation does client + deal + lead in a single write.
    convertLeadMutation.mutate({
      leadId: lead.id,
      existingClientId: lead.clientId ?? null,
      clientData,
      dealTitle: getLeadDealTitle(lead),
      assignedTo: lead.assignedTo || user?.name || "Sales",
    }, {
      onSuccess: (res: any) => {
        // Reflect the same server-assigned ids into the live store for instant UI update.
        useCRMStore.setState((state: any) => ({
          clients: res.createdClient
            ? [...state.clients.filter((c: any) => c.id !== res.createdClient.id), res.createdClient]
            : state.clients,
          deals: [...state.deals.filter((d: any) => d.id !== res.deal.id), res.deal],
          leads: state.leads.map((l: Lead) =>
            l.id === lead.id
              ? { ...l, status: "qualified", clientId: res.clientId, convertedToDealId: res.deal.id, convertedAt: res.convertedAt }
              : l
          ),
        }));
        trpcUtils.leads.list.invalidate();
        trpcUtils.clients.list.invalidate();
      },
      onError: (err) => console.error("leads.convert failed", err),
    });
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

  const filteredLeads = leads.filter((lead) => {
    const client = clients.find((c) => c.id === lead.clientId);
    const haystack = [
      lead.source,
      lead.notes,
      lead.company,
      lead.name,
      lead.email,
      lead.phone,
      client?.companyName,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const matchesSearch = searchQuery === "" || haystack.includes(searchQuery.toLowerCase());
    const converted = isLeadConverted(lead);
    const matchesView =
      leadListView === "lost"
        ? lead.status === "lost" && !converted
        : leadListView === "converted"
          ? converted
          : lead.status !== "lost" && !converted;
    return matchesSearch && matchesView;
  });
  const activeLeadCount = leads.filter((lead) => lead.status !== "lost" && !isLeadConverted(lead)).length;
  const convertedLeadCount = leads.filter((lead) => isLeadConverted(lead)).length;
  const lostLeadCount = leads.filter((lead) => lead.status === "lost" && !isLeadConverted(lead)).length;

  return (
    <div className="space-y-4 overflow-x-hidden">
      {selectedClientId && selectedClient && clientData ? (
        <ClientProfile 
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

          {/* Tabs */}
          <div className="flex items-center justify-between gap-3 border-b border-gray-200 pb-0">
            <div className="flex min-w-0 shrink-0 gap-1">
              {(
                [
                  { id: "dashboard" as TabType, label: "Dashboard", icon: LayoutDashboard },
                  { id: "leads" as TabType, label: "Leads", icon: ArrowRightLeft },
                  { id: "clients" as TabType, label: "Clients", icon: Building2 },
                  { id: "pipeline" as TabType, label: "Pipeline", icon: TrendingUp },
                  { id: "tasks" as TabType, label: user?.role === "sales" ? "My Tasks" : "Tasks", icon: Clock },
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

            {activeTab !== "dashboard" && activeTab !== "performance" && (
              <div className="flex min-w-0 flex-1 items-center justify-end gap-2 pb-1.5">
                {activeTab === "clients" && (
                  <Select value={clientFilter} onValueChange={setClientFilter}>
                    <SelectTrigger className="h-8 w-36 rounded-xl bg-white border-gray-200 text-black text-xs">
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
                {activeTab === "leads" && (
                  <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-white p-0.5">
                    {(["active", "converted", "lost"] as const).map((view) => {
                      const selected = leadListView === view;
                      const count = view === "active" ? activeLeadCount : view === "converted" ? convertedLeadCount : lostLeadCount;
                      return (
                        <button
                          key={view}
                          type="button"
                          onClick={() => setLeadListView(view)}
                          className={`h-7 rounded-lg px-3 text-xs font-medium transition-colors ${
                            selected
                              ? view === "lost"
                                ? "bg-[#EF4444]/10 text-[#EF4444]"
                                : view === "converted"
                                  ? "bg-[#10B981]/10 text-[#10B981]"
                                  : "bg-[#66B2B2]/10 text-[#66B2B2]"
                              : "text-gray-600 hover:text-black"
                          }`}
                        >
                          {view === "active" ? "Active" : view === "converted" ? "Converted" : "Lost"}
                          <span className="ml-1 font-mono-tech">{count}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
                {activeTab !== "tasks" && (
                  <div className="relative w-80 max-w-[36vw] shrink-0">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600" />
                    <Input
                      placeholder={`Search ${activeTab === "pipeline" ? "deals" : activeTab}...`}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 h-8 rounded-xl bg-white border-gray-200 text-black text-xs placeholder:text-gray-400"
                    />
                  </div>
                )}
              </div>
            )}
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
                <Button onClick={() => setDealModalOpen(true)} className="h-8 rounded-xl bg-[#66B2B2] hover:bg-[#66B2B2]/80 text-white text-xs font-bold">
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
                <Button onClick={() => setAddClientOpen(true)} className="h-8 rounded-xl bg-[#66B2B2] hover:bg-[#66B2B2]/80 text-white text-xs font-bold">
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Add Client
                </Button>
              </div>
              <div className="data-card overflow-auto rounded-xl">
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
                        onDelete={() => {
                          useCRMStore.getState().deleteClient(client.id);
                          deleteClientMutation.mutate({ id: client.id }, {
                            onSuccess: () => trpcUtils.clients.list.invalidate(),
                            onError: (err) => console.error("clients.delete failed", err),
                          });
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
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  {leadListView === "lost" ? (
                    <AlertTriangle className="w-4 h-4 text-[#EF4444]" />
                  ) : leadListView === "converted" ? (
                    <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                  ) : (
                    <ArrowRightLeft className="w-4 h-4 text-[#66B2B2]" />
                  )}
                  <h3 className="text-sm font-semibold text-black">
                    {leadListView === "active" ? "Active Leads" : leadListView === "converted" ? "Converted Leads" : "Lost Leads"}
                  </h3>
                  {leadListView !== "active" && (
                    <span className={`rounded px-2 py-0.5 text-[10px] font-medium ${
                      leadListView === "converted" ? "bg-[#10B981]/10 text-[#10B981]" : "bg-[#EF4444]/10 text-[#EF4444]"
                    }`}>
                      {leadListView === "converted" ? "Done" : "Archived"}
                    </span>
                  )}
                </div>
                <Button onClick={() => setLeadModalOpen(true)} className="h-8 rounded-xl bg-[#66B2B2] hover:bg-[#66B2B2]/80 text-white text-xs font-bold">
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Add Lead
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredLeads.map((lead) => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    client={clients.find((c) => c.id === lead.clientId)}
                    isConverted={isLeadConverted(lead)}
                    onStatusChange={handleUpdateLeadStatus}
                    onConvert={handleConvertLead}
                    onScoreChange={(leadId, score) => {
                      useCRMStore.getState().updateLead(leadId, { score });
                      updateLeadMutation.mutate({ id: leadId, data: { score } }, {
                        onError: (err) => console.error("leads.update score failed", err),
                      });
                    }}
                    onEdit={handleOpenEditLead}
                  />
                ))}
              </div>
              {filteredLeads.length === 0 && (
                <div className="data-card p-6 text-center text-xs text-gray-600">
                  No {leadListView === "active" ? "active" : leadListView === "converted" ? "converted" : "lost"} leads found.
                </div>
              )}
            </div>
          )}

          {/* Tasks Tab */}
          {activeTab === "tasks" && (
            <div className="space-y-3">
              {/* Sub-tab switcher */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-white p-0.5">
                  {(["active", "reports"] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setTasksView(v)}
                      className={`h-7 rounded-lg px-3 text-xs font-medium transition-colors ${
                        tasksView === v ? "bg-[#66B2B2]/10 text-[#66B2B2]" : "text-gray-600 hover:text-black"
                      }`}
                    >
                      {v === "active" ? "Active Tasks" : "Task Reports"}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative max-w-xs">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600" />
                    <Input
                      placeholder="Search tasks..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 h-8 rounded-xl bg-white border-gray-200 text-black text-xs placeholder:text-gray-400"
                    />
                  </div>
                  {tasksView === "active" && user?.role === "admin" && (
                    <Button onClick={() => setTaskModalOpen(true)} className="h-8 rounded-xl bg-[#66B2B2] hover:bg-[#66B2B2]/80 text-white text-xs font-bold">
                      <Plus className="w-3 h-3 mr-2" />
                      Add Task
                    </Button>
                  )}
                </div>
              </div>

              {/* Active Tasks */}
              {tasksView === "active" && (() => {
                const salesTaskTypeList = (seedData as any).salesTaskTypes as { value: string; label: string }[];
                const getTaskTypeLabel = (task: Task) => {
                  if (task.salesTaskType) {
                    return salesTaskTypeList.find(t => t.value === task.salesTaskType)?.label ?? task.salesTaskType;
                  }
                  if (task.serviceType) {
                    return (seedData as any).serviceTypes.find((t: any) => t.value === task.serviceType)?.label ?? task.serviceType;
                  }
                  return "—";
                };
                const getClientName = (task: Task): string => {
                  const id = task.clientId ?? (task.relatedType === "client" ? task.relatedId : null);
                  return id != null ? (clients.find(c => c.id === id)?.companyName ?? "—") : "—";
                };

                if (user?.role === "admin") {
                  const filtered = tasks
                    .filter(t => t.status !== "completed")
                    .filter(t => searchQuery === "" || t.title.toLowerCase().includes(searchQuery.toLowerCase()))
                    .sort((a, b) => (STATUS_ORDER[computeTaskStatus(a)] ?? 9) - (STATUS_ORDER[computeTaskStatus(b)] ?? 9));
                  return (
                    <>
                      {overdueTasks.length > 0 && (
                        <div className="p-3 rounded border border-[#EF4444]/20 bg-[#EF4444]/5">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-[#EF4444]" />
                            <span className="text-sm font-semibold text-[#EF4444]">Overdue Tasks ({overdueTasks.length})</span>
                          </div>
                        </div>
                      )}
                      <div className="data-card overflow-auto rounded-xl">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-gray-50">
                              <th className="text-left py-2.5 px-3 text-gray-600 font-medium">Task Title</th>
                              <th className="text-left py-2.5 px-3 text-gray-600 font-medium">Task Type</th>
                              <th className="text-left py-2.5 px-3 text-gray-600 font-medium">Client</th>
                              <th className="text-left py-2.5 px-3 text-gray-600 font-medium">Created At</th>
                              <th className="text-left py-2.5 px-3 text-gray-600 font-medium">Due Date</th>
                              <th className="text-left py-2.5 px-3 text-gray-600 font-medium">Assigned To</th>
                              <th className="text-left py-2.5 px-3 text-gray-600 font-medium">Priority</th>
                              <th className="text-left py-2.5 px-3 text-gray-600 font-medium">Status</th>
                              <th className="text-left py-2.5 px-3 text-gray-600 font-medium">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filtered.map((task) => (
                              <AdminTaskRow
                                key={task.id}
                                task={task}
                                taskTypeLabel={getTaskTypeLabel(task)}
                                clientName={getClientName(task)}
                                onEdit={() => {
                                  setEditingTask(task);
                                  setEditTaskTitle(task.title);
                                  setEditTaskType(task.salesTaskType ?? "");
                                  setEditTaskDueDate(task.dueDate);
                                  setEditTaskPriority(task.priority);
                                  setEditTaskClientId(task.clientId != null ? String(task.clientId) : "none");
                                  setEditTaskAssignedTo(task.assignedTo ?? "");
                                  setEditTaskOpen(true);
                                }}
                                onDelete={(id) => {
                                  useCRMStore.getState().deleteTask(id);
                                  deleteTaskMutation.mutate({ id }, {
                                    onSuccess: () => trpcUtils.tasks.list.invalidate(),
                                    onError: (err) => console.error("tasks.delete failed", err),
                                  });
                                }}
                              />
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  );
                }

                // Sales role
                const filtered = tasks
                  .filter(t => computeTaskStatus(t) !== "completed")
                  .filter(t => t.assignedTo === user?.name || t.isAutoAssigned === true)
                  .filter(t => searchQuery === "" || t.title.toLowerCase().includes(searchQuery.toLowerCase()))
                  .sort((a, b) => (STATUS_ORDER[computeTaskStatus(a)] ?? 9) - (STATUS_ORDER[computeTaskStatus(b)] ?? 9));
                return (
                  <div className="data-card overflow-auto rounded-xl">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="text-left py-2.5 px-3 text-gray-600 font-medium">Task Title</th>
                          <th className="text-left py-2.5 px-3 text-gray-600 font-medium">Task Type</th>
                          <th className="text-left py-2.5 px-3 text-gray-600 font-medium">Client</th>
                          <th className="text-left py-2.5 px-3 text-gray-600 font-medium">Due Date</th>
                          <th className="text-left py-2.5 px-3 text-gray-600 font-medium">Priority</th>
                          <th className="text-left py-2.5 px-3 text-gray-600 font-medium">Status</th>
                          <th className="text-left py-2.5 px-3 text-gray-600 font-medium">Done</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((task) => (
                          <SalesTaskRow
                            key={task.id}
                            task={task}
                            taskTypeLabel={getTaskTypeLabel(task)}
                            clientName={getClientName(task)}
                            onDone={() => {
                              setDoneTask(task);
                              setDoneNotes("");
                              setDoneFiles([]);
                              setDoneModalOpen(true);
                            }}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}

              {/* Task Reports */}
              {tasksView === "reports" && (
                <div className="data-card overflow-auto rounded-xl">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="text-left py-2.5 px-3 text-gray-600 font-medium">Task</th>
                        <th className="text-left py-2.5 px-3 text-gray-600 font-medium">Completed By</th>
                        <th className="text-left py-2.5 px-3 text-gray-600 font-medium">Completed At</th>
                        <th className="text-left py-2.5 px-3 text-gray-600 font-medium">View</th>
                      </tr>
                    </thead>
                    <tbody>
                      {taskReports
                        .filter(r => searchQuery === "" || r.taskTitle.toLowerCase().includes(searchQuery.toLowerCase()) || r.completedBy.toLowerCase().includes(searchQuery.toLowerCase()))
                        .map((report) => (
                          <tr key={report.id} className="border-b border-gray-200 hover:bg-gray-50">
                            <td className="py-2.5 px-3 text-black font-medium">{report.taskTitle}</td>
                            <td className="py-2.5 px-3 text-gray-700">{report.completedBy}</td>
                            <td className="py-2.5 px-3 text-gray-500 font-mono-tech">
                              {new Date(report.completedAt).toLocaleDateString("en-PH")}
                            </td>
                            <td className="py-2.5 px-3">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 rounded-lg px-3 text-[10px] font-bold border-[#66B2B2]/30 text-[#66B2B2] hover:bg-[#66B2B2]/10"
                                onClick={() => { setViewingReport(report); setViewReportOpen(true); }}
                              >
                                View Report
                              </Button>
                            </td>
                          </tr>
                        ))}
                      {taskReports.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-xs text-gray-500">No task reports yet.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Lead Modal */}
      {leadModalOpen && (
        <div className={CRM_MODAL_VIEWPORT_CLASS}>
          <div className={CRM_MODAL_BACKDROP_CLASS} onClick={() => setLeadModalOpen(false)} />
          <div className={CRM_MODAL_PANEL_CLASS}>
            <div className={CRM_MODAL_CARD_CLASS}>
              <button onClick={() => setLeadModalOpen(false)} className="absolute top-5 right-5 text-gray-500 hover:text-gray-900"><X className="w-4 h-4" /></button>
              <h3 className="text-lg font-bold text-gray-900 border-b border-gray-50 pb-4 mb-4">Add Lead</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className={CRM_MODAL_LABEL_CLASS}>Company Name</label>
                  <Input value={leadCompany} onChange={(e) => setLeadCompany(e.target.value)} className={CRM_MODAL_INPUT_CLASS} />
                </div>
                <div className="space-y-1">
                  <label className={CRM_MODAL_LABEL_CLASS}>Contact Name</label>
                  <Input value={leadName} onChange={(e) => setLeadName(e.target.value)} className={CRM_MODAL_INPUT_CLASS} />
                </div>
                <div className="space-y-1">
                  <label className={CRM_MODAL_LABEL_CLASS}>Source</label>
                  <Select value={leadSource} onValueChange={setLeadSource}>
                    <SelectTrigger className={CRM_MODAL_SELECT_CLASS}><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-white border-gray-200">
                      {LEAD_SOURCES.map((source) => (
                        <SelectItem key={source} value={source} className="text-xs text-black">{source}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className={CRM_MODAL_LABEL_CLASS}>Inquiry Type</label>
                  <Select value={leadInquiryType} onValueChange={(v) => setLeadInquiryType(v as NonNullable<Lead["inquiryType"]>)}>
                    <SelectTrigger className={CRM_MODAL_SELECT_CLASS}><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-white border-gray-200">
                      {LEAD_INQUIRY_TYPES.map((type) => (
                        <SelectItem key={type} value={type} className="text-xs text-black">{type.toUpperCase() === "PMS" ? "PMS" : type[0].toUpperCase() + type.slice(1)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className={CRM_MODAL_LABEL_CLASS}>Email</label>
                  <Input type="email" value={leadEmail} onChange={(e) => setLeadEmail(e.target.value)} className={CRM_MODAL_INPUT_CLASS} />
                </div>
                <div className="space-y-1">
                  <label className={CRM_MODAL_LABEL_CLASS}>Phone</label>
                  <Input value={leadPhone} onChange={(e) => setLeadPhone(e.target.value)} className={CRM_MODAL_INPUT_CLASS} />
                </div>
                <div className="space-y-1">
                  <label className={CRM_MODAL_LABEL_CLASS}>Priority</label>
                  <Select value={leadPriority} onValueChange={(v) => setLeadPriority(v as Lead["priority"])}>
                    <SelectTrigger className={CRM_MODAL_SELECT_CLASS}><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-white border-gray-200">
                      <SelectItem value="low" className="text-xs text-black">Low</SelectItem>
                      <SelectItem value="medium" className="text-xs text-black">Medium</SelectItem>
                      <SelectItem value="high" className="text-xs text-black">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className={CRM_MODAL_LABEL_CLASS}>Description</label>
                  <textarea
                    value={leadNotes}
                    onChange={(e) => setLeadNotes(e.target.value)}
                    className="min-h-20 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-xs text-black outline-none focus-visible:border-[#66B2B2]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2 md:col-span-2">
                  <Button variant="outline" onClick={() => setLeadModalOpen(false)} className={CRM_MODAL_CANCEL_CLASS}>Cancel</Button>
                  <Button className={CRM_MODAL_SUBMIT_CLASS} onClick={handleAddLead}>
                    Create Lead
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Lead Modal */}
      {editingLead && (
        <div className={CRM_MODAL_VIEWPORT_CLASS}>
          <div className={CRM_MODAL_BACKDROP_CLASS} onClick={() => setEditingLead(null)} />
          <div className={CRM_MODAL_PANEL_CLASS}>
            <div className={CRM_MODAL_CARD_CLASS}>
              <button onClick={() => setEditingLead(null)} className="absolute top-5 right-5 text-gray-500 hover:text-gray-900"><X className="w-4 h-4" /></button>
              <h3 className="text-lg font-bold text-gray-900 border-b border-gray-50 pb-4 mb-4">Edit Lead</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className={CRM_MODAL_LABEL_CLASS}>Company Name</label>
                  <Input value={editLeadCompany} onChange={(e) => setEditLeadCompany(e.target.value)} className={CRM_MODAL_INPUT_CLASS} />
                </div>
                <div className="space-y-1">
                  <label className={CRM_MODAL_LABEL_CLASS}>Contact Name</label>
                  <Input value={editLeadName} onChange={(e) => setEditLeadName(e.target.value)} className={CRM_MODAL_INPUT_CLASS} />
                </div>
                <div className="space-y-1">
                  <label className={CRM_MODAL_LABEL_CLASS}>Source</label>
                  <Select value={editLeadSource} onValueChange={setEditLeadSource}>
                    <SelectTrigger className={CRM_MODAL_SELECT_CLASS}><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-white border-gray-200">
                      {LEAD_SOURCES.map((source) => (
                        <SelectItem key={source} value={source} className="text-xs text-black">{source}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className={CRM_MODAL_LABEL_CLASS}>Inquiry Type</label>
                  <Select value={editLeadInquiryType} onValueChange={setEditLeadInquiryType}>
                    <SelectTrigger className={CRM_MODAL_SELECT_CLASS}><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-white border-gray-200">
                      {LEAD_INQUIRY_TYPES.map((type) => (
                        <SelectItem key={type} value={type} className="text-xs text-black">{type.toUpperCase() === "PMS" ? "PMS" : type[0].toUpperCase() + type.slice(1)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className={CRM_MODAL_LABEL_CLASS}>Email</label>
                  <Input type="email" value={editLeadEmail} onChange={(e) => setEditLeadEmail(e.target.value)} className={CRM_MODAL_INPUT_CLASS} />
                </div>
                <div className="space-y-1">
                  <label className={CRM_MODAL_LABEL_CLASS}>Phone</label>
                  <Input value={editLeadPhone} onChange={(e) => setEditLeadPhone(e.target.value)} className={CRM_MODAL_INPUT_CLASS} />
                </div>
                <div className="space-y-1">
                  <label className={CRM_MODAL_LABEL_CLASS}>Priority</label>
                  <Select value={editLeadPriority} onValueChange={(v) => setEditLeadPriority(v as "low" | "medium" | "high")}>
                    <SelectTrigger className={CRM_MODAL_SELECT_CLASS}><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-white border-gray-200">
                      <SelectItem value="low" className="text-xs text-black">Low</SelectItem>
                      <SelectItem value="medium" className="text-xs text-black">Medium</SelectItem>
                      <SelectItem value="high" className="text-xs text-black">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className={CRM_MODAL_LABEL_CLASS}>Description</label>
                  <textarea
                    value={editLeadNotes}
                    onChange={(e) => setEditLeadNotes(e.target.value)}
                    className="min-h-20 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-xs text-black outline-none focus-visible:border-[#66B2B2]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2 md:col-span-2">
                  <Button variant="outline" onClick={() => setEditingLead(null)} className={CRM_MODAL_CANCEL_CLASS}>Cancel</Button>
                  <Button
                    className={CRM_MODAL_SUBMIT_CLASS}
                    onClick={() => {
                      if (!editingLead) return;
                      const patch = {
                        company: editLeadCompany, name: editLeadName,
                        source: editLeadSource, inquiryType: editLeadInquiryType as Lead["inquiryType"],
                        email: editLeadEmail, phone: editLeadPhone,
                        priority: editLeadPriority, notes: editLeadNotes,
                      };
                      useCRMStore.getState().updateLead(editingLead.id, patch);
                      updateLeadMutation.mutate({ id: editingLead.id, data: patch }, {
                        onError: (err) => console.error("leads.update (edit) failed", err),
                      });
                      setEditingLead(null);
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

      {/* Deal Modal */}
      {dealModalOpen && (
        <div className={CRM_MODAL_VIEWPORT_CLASS}>
          <div className={CRM_MODAL_BACKDROP_CLASS} onClick={() => setDealModalOpen(false)} />
          <div className={CRM_MODAL_PANEL_CLASS}>
            <div className={CRM_MODAL_CARD_CLASS}>
              <button onClick={() => setDealModalOpen(false)} className="absolute top-5 right-5 text-gray-500 hover:text-gray-900"><X className="w-4 h-4" /></button>
              <h3 className="text-lg font-bold text-gray-900 border-b border-gray-50 pb-4 mb-4">New Deal</h3>
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className={CRM_MODAL_LABEL_CLASS}>Deal Title</label>
                  <Input placeholder="Deal title" value={dealTitle} onChange={(e) => setDealTitle(e.target.value)} className={CRM_MODAL_INPUT_CLASS} />
                </div>
                <div className="space-y-1">
                  <label className={CRM_MODAL_LABEL_CLASS}>Value (₱)</label>
                  <Input placeholder="Value" value={dealValue} onChange={(e) => setDealValue(e.target.value)} className={CRM_MODAL_INPUT_CLASS} />
                </div>
                <div className="space-y-1">
                  <label className={CRM_MODAL_LABEL_CLASS}>Stage</label>
                  <Select value={dealStage} onValueChange={(v) => setDealStage(v as DealStage)}>
                    <SelectTrigger className={CRM_MODAL_SELECT_CLASS}>
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
                  <label className={CRM_MODAL_LABEL_CLASS}>Client</label>
                  <Select value={String(dealClientId ?? "")} onValueChange={(v) => setDealClientId(Number(v))}>
                    <SelectTrigger className={CRM_MODAL_SELECT_CLASS}>
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200">
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)} className="text-xs text-black">{c.companyName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Button variant="outline" onClick={() => setDealModalOpen(false)} className={CRM_MODAL_CANCEL_CLASS}>Cancel</Button>
                  <Button
                    className={CRM_MODAL_SUBMIT_CLASS}
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
        <div className={CRM_MODAL_VIEWPORT_CLASS}>
          <div className={CRM_MODAL_BACKDROP_CLASS} onClick={() => setTaskModalOpen(false)} />
          <div className={CRM_MODAL_PANEL_CLASS}>
            <div className={CRM_MODAL_CARD_CLASS}>
              <button onClick={() => setTaskModalOpen(false)} className="absolute top-5 right-5 text-gray-500 hover:text-gray-900"><X className="w-4 h-4" /></button>
              <h3 className="text-lg font-bold text-gray-900 border-b border-gray-50 pb-4 mb-4">Add Task</h3>
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className={CRM_MODAL_LABEL_CLASS}>Task Title</label>
                  <Input placeholder="Task title" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} className={CRM_MODAL_INPUT_CLASS} />
                </div>
                <div className="space-y-1">
                  <label className={CRM_MODAL_LABEL_CLASS}>Task Type</label>
                  <Select value={salesTaskType} onValueChange={setSalesTaskType}>
                    <SelectTrigger className={CRM_MODAL_SELECT_CLASS}>
                      <SelectValue placeholder="Select task type" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200">
                      {(seedData as any).salesTaskTypes.map((opt: { value: string; label: string }) => (
                        <SelectItem key={opt.value} value={opt.value} className="text-xs text-black">{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className={CRM_MODAL_LABEL_CLASS}>Due Date</label>
                  <Input type="date" value={taskDueDate} onChange={(e) => setTaskDueDate(e.target.value)} className={CRM_MODAL_INPUT_CLASS} />
                </div>
                <div className="space-y-1">
                  <label className={CRM_MODAL_LABEL_CLASS}>Priority</label>
                  <Select value={taskPriority} onValueChange={(v) => setTaskPriority(v as "low" | "medium" | "high")}>
                    <SelectTrigger className={CRM_MODAL_SELECT_CLASS}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200">
                      <SelectItem value="low" className="text-xs text-black">Low</SelectItem>
                      <SelectItem value="medium" className="text-xs text-black">Medium</SelectItem>
                      <SelectItem value="high" className="text-xs text-black">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className={CRM_MODAL_LABEL_CLASS}>Client (Optional)</label>
                  <Select value={taskClientId === null ? "none" : String(taskClientId)} onValueChange={(v) => setTaskClientId(v === "none" ? null : Number(v))}>
                    <SelectTrigger className={CRM_MODAL_SELECT_CLASS}>
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200">
                      <SelectItem value="none" className="text-xs text-black">None</SelectItem>
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)} className="text-xs text-black">{c.companyName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {!autoAssignTask && (
                  <div className="space-y-1">
                    <label className={CRM_MODAL_LABEL_CLASS}>Assign To</label>
                    <Select value={taskAssignedTo} onValueChange={setTaskAssignedTo}>
                      <SelectTrigger className={CRM_MODAL_SELECT_CLASS}>
                        <SelectValue placeholder="Select salesperson" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-200">
                        {seedStaff.filter(s => s.role === "sales").map(s => (
                          <SelectItem key={s.id} value={s.name} className="text-xs text-black">{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Button variant="outline" onClick={() => setTaskModalOpen(false)} className={CRM_MODAL_CANCEL_CLASS}>Cancel</Button>
                  <Button
                    className={CRM_MODAL_SUBMIT_CLASS}
                    onClick={() => {
                      const newId = Date.now();
                      const newTaskPayload = {
                        id: newId,
                        title: taskTitle,
                        description: "",
                        assignedTo: autoAssignTask ? "" : (taskAssignedTo || ""),
                        isAutoAssigned: autoAssignTask,
                        salesTaskType: salesTaskType || undefined,
                        clientId: taskClientId,
                        relatedType: (taskClientId ? "client" : "general") as Task["relatedType"],
                        relatedId: taskClientId ?? null,
                        dueDate: taskDueDate || new Date().toISOString(),
                        priority: taskPriority,
                        status: "upcoming" as Task["status"],
                        createdAt: new Date().toISOString(),
                      };
                      useCRMStore.getState().addTask(newTaskPayload);
                      createTaskMutation.mutate(newTaskPayload, {
                        onSuccess: () => trpcUtils.tasks.list.invalidate(),
                        onError: (err) => console.error("tasks.create failed", err),
                      });
                      setTaskModalOpen(false);
                      setTaskTitle("");
                      setSalesTaskType("");
                      setTaskDueDate("");
                      setTaskClientId(null);
                      setTaskAssignedTo("");
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

      {/* Edit Task Modal */}
      {editTaskOpen && editingTask && (
        <div className={CRM_MODAL_VIEWPORT_CLASS}>
          <div className={CRM_MODAL_BACKDROP_CLASS} onClick={() => setEditTaskOpen(false)} />
          <div className={CRM_MODAL_PANEL_CLASS}>
            <div className={CRM_MODAL_CARD_CLASS}>
              <button onClick={() => setEditTaskOpen(false)} className="absolute top-5 right-5 text-gray-500 hover:text-gray-900"><X className="w-4 h-4" /></button>
              <h3 className="text-lg font-bold text-gray-900 border-b border-gray-50 pb-4 mb-4">Edit Task</h3>
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className={CRM_MODAL_LABEL_CLASS}>Task Title</label>
                  <Input value={editTaskTitle} onChange={(e) => setEditTaskTitle(e.target.value)} className={CRM_MODAL_INPUT_CLASS} />
                </div>
                <div className="space-y-1">
                  <label className={CRM_MODAL_LABEL_CLASS}>Task Type</label>
                  <Select value={editTaskType} onValueChange={setEditTaskType}>
                    <SelectTrigger className={CRM_MODAL_SELECT_CLASS}><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent className="bg-white border-gray-200">
                      {((seedData as any).salesTaskTypes as { value: string; label: string }[]).map(t => (
                        <SelectItem key={t.value} value={t.value} className="text-xs text-black">{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className={CRM_MODAL_LABEL_CLASS}>Due Date</label>
                  <Input type="date" value={editTaskDueDate} onChange={(e) => setEditTaskDueDate(e.target.value)} className={CRM_MODAL_INPUT_CLASS} />
                </div>
                <div className="space-y-1">
                  <label className={CRM_MODAL_LABEL_CLASS}>Priority</label>
                  <Select value={editTaskPriority} onValueChange={(v) => setEditTaskPriority(v as "low" | "medium" | "high")}>
                    <SelectTrigger className={CRM_MODAL_SELECT_CLASS}><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-white border-gray-200">
                      <SelectItem value="low" className="text-xs text-black">Low</SelectItem>
                      <SelectItem value="medium" className="text-xs text-black">Medium</SelectItem>
                      <SelectItem value="high" className="text-xs text-black">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className={CRM_MODAL_LABEL_CLASS}>Client (Optional)</label>
                  <Select value={editTaskClientId} onValueChange={setEditTaskClientId}>
                    <SelectTrigger className={CRM_MODAL_SELECT_CLASS}><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent className="bg-white border-gray-200">
                      <SelectItem value="none" className="text-xs text-black">None</SelectItem>
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)} className="text-xs text-black">{c.companyName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {!autoAssignTask && (
                  <div className="space-y-1">
                    <label className={CRM_MODAL_LABEL_CLASS}>Assign To</label>
                    <Select value={editTaskAssignedTo} onValueChange={setEditTaskAssignedTo}>
                      <SelectTrigger className={CRM_MODAL_SELECT_CLASS}><SelectValue placeholder="Select salesperson" /></SelectTrigger>
                      <SelectContent className="bg-white border-gray-200">
                        {seedStaff.filter(s => s.role === "sales").map(s => (
                          <SelectItem key={s.id} value={s.name} className="text-xs text-black">{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Button variant="outline" onClick={() => setEditTaskOpen(false)} className={CRM_MODAL_CANCEL_CLASS}>Cancel</Button>
                  <Button
                    className={CRM_MODAL_SUBMIT_CLASS}
                    onClick={() => {
                      if (!editingTask) return;
                      const resolvedClientId = editTaskClientId !== "none" ? Number(editTaskClientId) : null;
                      const taskPatch = {
                        title: editTaskTitle,
                        salesTaskType: editTaskType || undefined,
                        dueDate: editTaskDueDate,
                        priority: editTaskPriority,
                        clientId: resolvedClientId,
                        relatedType: resolvedClientId ? "client" as const : "general" as const,
                        relatedId: resolvedClientId,
                        assignedTo: autoAssignTask ? "" : (editTaskAssignedTo || ""),
                        isAutoAssigned: autoAssignTask,
                      };
                      useCRMStore.getState().updateTask(editingTask.id, taskPatch);
                      updateTaskMutation.mutate({ id: editingTask.id, data: taskPatch }, {
                        onSuccess: () => trpcUtils.tasks.list.invalidate(),
                        onError: (err) => console.error("tasks.update failed", err),
                      });
                      setEditTaskOpen(false);
                      setEditingTask(null);
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

      {/* Equipment Modal */}
      {equipmentModalOpen && (
        <div className={CRM_MODAL_VIEWPORT_CLASS}>
          <div className={CRM_MODAL_BACKDROP_CLASS} onClick={() => setEquipmentModalOpen(false)} />
          <div className={CRM_MODAL_PANEL_CLASS}>
            <div className={CRM_MODAL_CARD_CLASS}>
              <button onClick={() => setEquipmentModalOpen(false)} className="absolute top-5 right-5 text-gray-500 hover:text-gray-900"><X className="w-4 h-4" /></button>
              <h3 className="text-lg font-bold text-gray-900 border-b border-gray-50 pb-4 mb-4">Add Equipment</h3>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Input placeholder="Unit ID (e.g. GPS-001)" value={eqUnitId} onChange={(e) => setEqUnitId(e.target.value)} className={CRM_MODAL_INPUT_CLASS} />
                  <Input placeholder="Type (e.g. GPS Tracker)" value={eqType} onChange={(e) => setEqType(e.target.value)} className={CRM_MODAL_INPUT_CLASS} />
                </div>
                <Input placeholder="Serial Number" value={eqSerial} onChange={(e) => setEqSerial(e.target.value)} className={CRM_MODAL_INPUT_CLASS} />
                <Input placeholder="Model" value={eqModel} onChange={(e) => setEqModel(e.target.value)} className={CRM_MODAL_INPUT_CLASS} />
                <Input placeholder="Location" value={eqLocation} onChange={(e) => setEqLocation(e.target.value)} className={CRM_MODAL_INPUT_CLASS} />
                <Input placeholder="Current Hours" type="number" value={eqHours} onChange={(e) => setEqHours(e.target.value)} className={CRM_MODAL_INPUT_CLASS} />
                
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Button variant="outline" onClick={() => setEquipmentModalOpen(false)} className={CRM_MODAL_CANCEL_CLASS}>Cancel</Button>
                  <Button
                    className={CRM_MODAL_SUBMIT_CLASS}
                    onClick={() => {
                      useOperationsStore.getState().addEquipment({
                        clientId: String(selectedClientId!),
                        name: eqModel || eqUnitId || "New Equipment",
                        unitId: eqUnitId,
                        equipmentType: eqType || "Heavy Equipment",
                        type: eqType,
                        serialNumber: eqSerial,
                        manufacturer: "TBD",
                        model: eqModel,
                        installDate: new Date().toISOString(),
                        warrantyExpiry: new Date(Date.now() + 365 * 86400000).toISOString(),
                        status: "active",
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
        <div className={CRM_MODAL_VIEWPORT_CLASS}>
          <div className={CRM_MODAL_BACKDROP_CLASS} onClick={() => setEditDealOpen(false)} />
          <div className={CRM_MODAL_PANEL_CLASS}>
            <div className={CRM_MODAL_CARD_CLASS}>
              <button onClick={() => setEditDealOpen(false)} className="absolute top-5 right-5 text-gray-500 hover:text-gray-900"><X className="w-4 h-4" /></button>
              <h3 className="text-lg font-bold text-gray-900 border-b border-gray-50 pb-4 mb-4">Edit Deal</h3>
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className={CRM_MODAL_LABEL_CLASS}>Client</label>
                  <Select value={String(editDealClientId ?? "")} onValueChange={(v) => setEditDealClientId(Number(v))}>
                    <SelectTrigger className={CRM_MODAL_SELECT_CLASS}>
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
                  <label className={CRM_MODAL_LABEL_CLASS}>Deal Title</label>
                  <Input
                    placeholder="Deal title"
                    value={editDealTitle}
                    onChange={(e) => setEditDealTitle(e.target.value)}
                    className={CRM_MODAL_INPUT_CLASS}
                  />
                </div>
                <div className="space-y-1">
                  <label className={CRM_MODAL_LABEL_CLASS}>Revenue (₱)</label>
                  <Input
                    placeholder="Revenue"
                    value={editDealValue}
                    onChange={(e) => setEditDealValue(e.target.value)}
                    className={CRM_MODAL_INPUT_CLASS}
                  />
                </div>
                <div className="space-y-1">
                  <label className={CRM_MODAL_LABEL_CLASS}>Probability (%)</label>
                  <Input
                    placeholder="Probability (%)"
                    value={editDealProbability}
                    onChange={(e) => setEditDealProbability(e.target.value)}
                    className={CRM_MODAL_INPUT_CLASS}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Button variant="outline" onClick={() => setEditDealOpen(false)} className={CRM_MODAL_CANCEL_CLASS}>Cancel</Button>
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
        <div className={CRM_MODAL_VIEWPORT_CLASS}>
          <div className={CRM_MODAL_BACKDROP_CLASS} onClick={() => setDeleteDealOpen(false)} />
          <div className={CRM_MODAL_PANEL_SM_CLASS}>
            <div className={CRM_MODAL_CARD_CLASS}>
              <button onClick={() => setDeleteDealOpen(false)} className="absolute top-5 right-5 text-gray-500 hover:text-gray-900"><X className="w-4 h-4" /></button>
              <h3 className="text-lg font-bold text-gray-900 border-b border-gray-50 pb-4 mb-4">Delete Deal</h3>
              <p className="text-sm text-gray-700 mb-4">
                Are you sure you want to delete <span className="font-semibold">{selectedActionDeal.title}</span>? This action cannot be undone.
              </p>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <Button variant="outline" onClick={() => setDeleteDealOpen(false)} className={CRM_MODAL_CANCEL_CLASS}>Cancel</Button>
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
        <div className={CRM_MODAL_VIEWPORT_CLASS}>
          <div className={CRM_MODAL_BACKDROP_CLASS} onClick={() => setAddClientOpen(false)} />
          <div className={CRM_MODAL_PANEL_CLASS}>
            <div className={CRM_MODAL_CARD_CLASS}>
              <button onClick={() => setAddClientOpen(false)} className="absolute top-5 right-5 text-gray-500 hover:text-gray-900"><X className="w-4 h-4" /></button>
              <h3 className="text-lg font-bold text-gray-900 border-b border-gray-50 pb-4 mb-4">Add Client</h3>
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className={CRM_MODAL_LABEL_CLASS}>Company Name</label>
                  <Input value={acCompanyName} onChange={(e) => setAcCompanyName(e.target.value)} className={CRM_MODAL_INPUT_CLASS} />
                </div>
                <div className="space-y-1">
                  <label className={CRM_MODAL_LABEL_CLASS}>Industry</label>
                  <Input value={acIndustry} onChange={(e) => setAcIndustry(e.target.value)} className={CRM_MODAL_INPUT_CLASS} />
                </div>
                <div className="space-y-1">
                  <label className={CRM_MODAL_LABEL_CLASS}>Contact Name</label>
                  <Input value={acContactName} onChange={(e) => setAcContactName(e.target.value)} className={CRM_MODAL_INPUT_CLASS} />
                </div>
                <div className="space-y-1">
                  <label className={CRM_MODAL_LABEL_CLASS}>Email</label>
                  <Input type="email" value={acEmail} onChange={(e) => setAcEmail(e.target.value)} className={CRM_MODAL_INPUT_CLASS} />
                </div>
                <div className="space-y-1">
                  <label className={CRM_MODAL_LABEL_CLASS}>Phone</label>
                  <Input value={acPhone} onChange={(e) => setAcPhone(e.target.value)} className={CRM_MODAL_INPUT_CLASS} />
                </div>
                <div className="space-y-1">
                  <label className={CRM_MODAL_LABEL_CLASS}>Status</label>
                  <Select value={acStatus} onValueChange={(v) => setAcStatus(v as "active" | "inactive" | "prospect")}>
                    <SelectTrigger className={CRM_MODAL_SELECT_CLASS}>
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
                  <label className={CRM_MODAL_LABEL_CLASS}>Address</label>
                  <Input value={acAddress} onChange={(e) => setAcAddress(e.target.value)} className={CRM_MODAL_INPUT_CLASS} />
                </div>
                <div className="space-y-1">
                  <label className={CRM_MODAL_LABEL_CLASS}>Contract Value (₱)</label>
                  <Input type="number" min={0} value={acContractValue} onChange={(e) => setAcContractValue(e.target.value)} className={CRM_MODAL_INPUT_CLASS} />
                </div>
                <div className="space-y-1">
                  <label className={CRM_MODAL_LABEL_CLASS}>Last Contact</label>
                  <Input type="date" value={acLastContact} onChange={(e) => setAcLastContact(e.target.value)} className={CRM_MODAL_INPUT_CLASS} />
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Button variant="outline" onClick={() => setAddClientOpen(false)} className={CRM_MODAL_CANCEL_CLASS}>Cancel</Button>
                  <Button
                    className={CRM_MODAL_SUBMIT_CLASS}
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

      {/* Done Modal (Sales) */}
      {doneModalOpen && doneTask && (
        <div className={CRM_MODAL_VIEWPORT_CLASS}>
          <div className={CRM_MODAL_BACKDROP_CLASS} onClick={() => setDoneModalOpen(false)} />
          <div className={CRM_MODAL_PANEL_CLASS}>
            <div className={CRM_MODAL_CARD_CLASS}>
              <button onClick={() => setDoneModalOpen(false)} className="absolute top-5 right-5 text-gray-500 hover:text-gray-900"><X className="w-4 h-4" /></button>
              <h3 className="text-lg font-bold text-gray-900 border-b border-gray-50 pb-4 mb-4">Mark Task as Complete</h3>
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className={CRM_MODAL_LABEL_CLASS}>What happened?</label>
                  <textarea
                    required
                    value={doneNotes}
                    onChange={(e) => setDoneNotes(e.target.value)}
                    placeholder="Describe what happened or the outcome of this task..."
                    className="min-h-24 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-xs text-black outline-none focus-visible:border-[#66B2B2]"
                  />
                </div>
                <div className="space-y-1">
                  <label className={CRM_MODAL_LABEL_CLASS}>Attachments (Optional)</label>
                  <label className="flex items-center gap-2 cursor-pointer h-10 w-full rounded-xl border border-dashed border-gray-300 px-3 text-xs text-gray-500 hover:border-[#66B2B2] hover:text-[#66B2B2] transition-colors">
                    <Plus className="w-3.5 h-3.5" />
                    Add files
                    <input
                      type="file"
                      multiple
                      className="sr-only"
                      onChange={(e) => {
                        const picked = Array.from(e.target.files ?? []);
                        setDoneFiles((prev) => [...prev, ...picked]);
                        e.target.value = "";
                      }}
                    />
                  </label>
                  {doneFiles.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {doneFiles.map((f, i) => (
                        <span key={i} className="flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-[10px] text-gray-700 border border-gray-200">
                          {f.name}
                          <button type="button" onClick={() => setDoneFiles((prev) => prev.filter((_, j) => j !== i))} className="ml-0.5 text-gray-400 hover:text-[#EF4444]">
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Button variant="outline" onClick={() => setDoneModalOpen(false)} className={CRM_MODAL_CANCEL_CLASS}>Cancel</Button>
                  <Button
                    className={CRM_MODAL_SUBMIT_CLASS}
                    disabled={!doneNotes.trim()}
                    onClick={async () => {
                      // Capture before clearing state
                      const taskId = doneTask.id;
                      const taskTitle = doneTask.title;
                      const notes = doneNotes.trim();
                      const files = [...doneFiles];
                      // Snapshot task context onto the report (robust against the live task
                      // changing or being deleted later).
                      const snapSalesTaskType = doneTask.salesTaskType;
                      const snapTypeLabel = resolveTaskTypeLabel(doneTask);
                      const snapClientName = clients.find((c) => c.id === doneTask.clientId)?.companyName ?? "-";
                      const snapTaskCreatedAt = doneTask.createdAt;
                      const snapDueDate = doneTask.dueDate;
                      const snapPriority = doneTask.priority;
                      // Close immediately — don't wait for async file conversion
                      setDoneModalOpen(false);
                      setDoneTask(null);
                      setDoneNotes("");
                      setDoneFiles([]);
                      // Update store right away so the task disappears from the table
                      useCRMStore.getState().updateTask(taskId, { status: "completed" as const });
                      // Convert files async in background
                      const fileToBase64 = (file: File): Promise<string> =>
                        new Promise((resolve, reject) => {
                          const reader = new FileReader();
                          reader.onload = () => resolve(reader.result as string);
                          reader.onerror = reject;
                          reader.readAsDataURL(file);
                        });
                      const convertedFiles = await Promise.all(
                        files.map(async (f) => ({ name: f.name, url: await fileToBase64(f) }))
                      );
                      const reportPayload = {
                        id: Date.now(),
                        taskId,
                        taskTitle,
                        notes,
                        files: convertedFiles,
                        completedAt: new Date().toISOString(),
                        completedBy: user?.name ?? "",
                        // Snapshots
                        salesTaskType: snapSalesTaskType,
                        salesTaskTypeLabel: snapTypeLabel,
                        clientName: snapClientName,
                        taskCreatedAt: snapTaskCreatedAt,
                        dueDate: snapDueDate,
                        priority: snapPriority,
                        status: "completed",
                        taskOrigin: "manual" as const,
                      };
                      useCRMStore.getState().addTaskReport(reportPayload);
                      updateTaskMutation.mutate({ id: taskId, data: { status: "completed" } }, {
                        onError: (err) => console.error("tasks.update (complete) failed", err),
                      });
                      upsertTaskReportMutation.mutate(reportPayload, {
                        onSuccess: () => trpcUtils.taskReports.list.invalidate(),
                        onError: (err) => console.error("taskReports.upsert failed", err),
                      });
                    }}
                  >
                    Mark as Complete
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Report Modal */}
      {viewReportOpen && viewingReport && (
        <div className={CRM_MODAL_VIEWPORT_CLASS}>
          <div className={CRM_MODAL_BACKDROP_CLASS} onClick={() => setViewReportOpen(false)} />
          <div className="relative z-10 w-full max-w-3xl max-h-[92vh] overflow-y-auto animate-in fade-in-0 zoom-in-95 duration-200">
            <div className="relative bg-white border border-gray-200 rounded-2xl p-6 shadow-2xl">
              <button onClick={() => setViewReportOpen(false)} className="absolute top-5 right-5 z-20 text-gray-500 hover:text-gray-900 no-print"><X className="w-4 h-4" /></button>
              <TaskReportView
                report={viewingReport}
                clients={clients}
                tasks={tasks}
                resolveTypeLabel={resolveTaskTypeLabel}
              />
              <div className="pt-2 no-print">
                <Button variant="outline" onClick={() => setViewReportOpen(false)} className={`w-full ${CRM_MODAL_CANCEL_CLASS}`}>Close</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Client Modal */}
      {editClientOpen && editingClient && (
        <div className={CRM_MODAL_VIEWPORT_CLASS}>
          <div className={CRM_MODAL_BACKDROP_CLASS} onClick={() => setEditClientOpen(false)} />
          <div className={CRM_MODAL_PANEL_CLASS}>
            <div className={CRM_MODAL_CARD_CLASS}>
              <button onClick={() => setEditClientOpen(false)} className="absolute top-5 right-5 text-gray-500 hover:text-gray-900"><X className="w-4 h-4" /></button>
              <h3 className="text-lg font-bold text-gray-900 border-b border-gray-50 pb-4 mb-4">Edit Client</h3>
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className={CRM_MODAL_LABEL_CLASS}>Company Name</label>
                  <Input value={editClientCompany} onChange={(e) => setEditClientCompany(e.target.value)} className={CRM_MODAL_INPUT_CLASS} />
                </div>
                <div className="space-y-1">
                  <label className={CRM_MODAL_LABEL_CLASS}>Industry</label>
                  <Input value={editClientIndustry} onChange={(e) => setEditClientIndustry(e.target.value)} className={CRM_MODAL_INPUT_CLASS} />
                </div>
                <div className="space-y-1">
                  <label className={CRM_MODAL_LABEL_CLASS}>Contact Name</label>
                  <Input value={editClientContactName} onChange={(e) => setEditClientContactName(e.target.value)} className={CRM_MODAL_INPUT_CLASS} />
                </div>
                <div className="space-y-1">
                  <label className={CRM_MODAL_LABEL_CLASS}>Email</label>
                  <Input type="email" value={editClientEmail} onChange={(e) => setEditClientEmail(e.target.value)} className={CRM_MODAL_INPUT_CLASS} />
                </div>
                <div className="space-y-1">
                  <label className={CRM_MODAL_LABEL_CLASS}>Phone</label>
                  <Input value={editClientPhone} onChange={(e) => setEditClientPhone(e.target.value)} className={CRM_MODAL_INPUT_CLASS} />
                </div>
                <div className="space-y-1">
                  <label className={CRM_MODAL_LABEL_CLASS}>Status</label>
                  <Select value={editClientStatus} onValueChange={(v) => setEditClientStatus(v as "active" | "inactive" | "prospect")}>
                    <SelectTrigger className={CRM_MODAL_SELECT_CLASS}>
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
                  <label className={CRM_MODAL_LABEL_CLASS}>Address</label>
                  <Input value={editClientAddress} onChange={(e) => setEditClientAddress(e.target.value)} className={CRM_MODAL_INPUT_CLASS} />
                </div>
                <div className="space-y-1">
                  <label className={CRM_MODAL_LABEL_CLASS}>Contract Value (₱)</label>
                  <Input type="number" min={0} value={editClientContractValue} onChange={(e) => setEditClientContractValue(e.target.value)} className={CRM_MODAL_INPUT_CLASS} />
                </div>
                <div className="space-y-1">
                  <label className={CRM_MODAL_LABEL_CLASS}>Last Contact</label>
                  <Input type="date" value={editClientLastContact} onChange={(e) => setEditClientLastContact(e.target.value)} className={CRM_MODAL_INPUT_CLASS} />
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Button variant="outline" onClick={() => setEditClientOpen(false)} className={CRM_MODAL_CANCEL_CLASS}>Cancel</Button>
                  <Button
                    className={CRM_MODAL_SUBMIT_CLASS}
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
        <div className="grid grid-cols-2 gap-3 pt-2">
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
            <div className="data-card overflow-auto rounded-xl">
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
                          <QRButton serial={eq.serialNumber} unitId={eq.unitId ?? ""} />
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

            <div className="data-card overflow-auto rounded-xl">
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
            <div className="data-card overflow-auto rounded-xl">
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
  const configs: Record<string, { label: string; color: string }> = {
    active: { label: "Active", color: "bg-[#10B981]/10 text-[#10B981]" },
    inactive: { label: "Inactive", color: "bg-gray-100 text-gray-600" },
    maintenance: { label: "Maintenance", color: "bg-[#66B2B2]/10 text-[#66B2B2]" },
    retired: { label: "Retired", color: "bg-[#EF4444]/10 text-[#EF4444]" },
    under_service: { label: "Under Service", color: "bg-[#8B5CF6]/10 text-[#8B5CF6]" },
    broken: { label: "Broken", color: "bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/30" },
    service_due: { label: "Service Due", color: "bg-[#66B2B2]/20 text-[#66B2B2] animate-pulse" },
  };

  const config = configs[status ?? "active"];
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
      className="relative data-card p-3 rounded-xl cursor-grab active:cursor-grabbing hover:border-[#66B2B2]/30 transition-all"
    >
      <div className="flex items-start justify-between mb-1.5 gap-2">
        <div className="min-w-0">
          <span className="text-[10px] text-gray-600 font-mono-tech block truncate">{client?.companyName || "Unknown"}</span>
          {client?.contactName && client.contactName !== "-" && (
            <span className="text-[10px] text-gray-400 font-mono-tech block truncate">{client.contactName}</span>
          )}
        </div>
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

function ClientRow({ client, onClick, onEdit, onDelete }: { client: Client; onClick: () => void; onEdit: () => void; onDelete: () => void }) {
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
                  onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onDelete(); }}
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

function LeadCard({
  lead,
  client: _client,
  isConverted,
  onStatusChange,
  onConvert,
  onScoreChange,
  onEdit,
}: {
  lead: Lead;
  client?: Client;
  isConverted: boolean;
  onStatusChange: (leadId: number, status: Lead["status"]) => void;
  onConvert: (lead: Lead) => void;
  onScoreChange: (leadId: number, score: number) => void;
  onEdit: (lead: Lead) => void;
}) {
  const [editingScore, setEditingScore] = useState(false);
  const [scoreInput, setScoreInput] = useState(String(lead.score ?? 0));

  const isLost = lead.status === "lost";
  const isDone = isConverted && !isLost;

  const priorityColors: Record<string, string> = {
    low: "bg-gray-100 text-gray-500",
    medium: "bg-amber-100 text-amber-700",
    high: "bg-red-100 text-red-700",
  };

  const companyName = lead.company || _client?.companyName || lead.name || "Unknown";
  const contactName = lead.name && lead.name !== lead.company ? lead.name : null;
  const inquiryLabel = !lead.inquiryType ? "General"
    : lead.inquiryType.toUpperCase() === "PMS" ? "PMS"
    : lead.inquiryType[0].toUpperCase() + lead.inquiryType.slice(1);

  const scoreVal = lead.score ?? 0;
  const scoreColor = scoreVal >= 80 ? "#10B981" : scoreVal >= 30 ? "#F2A900" : "#9CA3AF";
  const scoreBarColor = scoreVal >= 80 ? "bg-[#10B981]" : scoreVal >= 30 ? "bg-amber-400" : "bg-gray-300";

  const commitScore = () => {
    const n = Math.max(0, Math.min(100, parseInt(scoreInput) || 0));
    setEditingScore(false);
    setScoreInput(String(n));
    if (n !== scoreVal) onScoreChange(lead.id, n);
  };

  return (
    <div className={`data-card p-4 rounded-xl flex flex-col gap-3 ${
      isLost ? "border-[#EF4444]/20 bg-[#EF4444]/[0.03]"
      : isDone ? "border-[#10B981]/20 bg-[#10B981]/[0.03]" : ""
    }`}>
      {/* Header: priority badge + source chip + edit button */}
      <div className="flex items-center justify-between">
        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${priorityColors[lead.priority] ?? priorityColors.low}`}>
          {lead.priority}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{lead.source}</span>
          <button
            type="button"
            onClick={() => onEdit(lead)}
            className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Company + contact */}
      <div>
        <div className="text-sm font-bold text-gray-900 leading-tight">{companyName}</div>
        {contactName && <div className="text-[11px] text-gray-500 mt-0.5">Contact: {contactName}</div>}
      </div>

      {/* Notes */}
      {lead.notes && (
        <p className="text-[11px] text-gray-500 line-clamp-2 leading-snug">{lead.notes}</p>
      )}

      {/* Info row: inquiry type, email, phone */}
      <div className="grid grid-cols-3 gap-1.5 text-[10px]">
        <div className="bg-gray-50 rounded px-2 py-1.5 text-center">
          <div className="text-gray-400 mb-0.5">Inquiry</div>
          <div className="font-semibold text-gray-700">{inquiryLabel}</div>
        </div>
        <div className="bg-gray-50 rounded px-2 py-1.5 text-center min-w-0">
          <div className="text-gray-400 mb-0.5 flex items-center justify-center gap-0.5"><Mail className="w-2.5 h-2.5" /> Email</div>
          <div className="font-medium text-gray-700 truncate">{lead.email || "—"}</div>
        </div>
        <div className="bg-gray-50 rounded px-2 py-1.5 text-center min-w-0">
          <div className="text-gray-400 mb-0.5 flex items-center justify-center gap-0.5"><Phone className="w-2.5 h-2.5" /> Phone</div>
          <div className="font-medium text-gray-700 truncate">{lead.phone || "—"}</div>
        </div>
      </div>

      {/* Score editor + bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-gray-500 font-semibold">Score</span>
          {editingScore ? (
            <input
              type="number" min={0} max={100}
              value={scoreInput}
              onChange={(e) => setScoreInput(e.target.value)}
              onBlur={commitScore}
              onKeyDown={(e) => { if (e.key === "Enter") commitScore(); if (e.key === "Escape") { setEditingScore(false); setScoreInput(String(scoreVal)); } }}
              className="w-16 h-6 text-center text-xs border border-gray-200 rounded focus:outline-none focus:border-[#66B2B2]"
              autoFocus
            />
          ) : (
            <button
              type="button"
              onClick={() => { setEditingScore(true); setScoreInput(String(scoreVal)); }}
              className="inline-flex items-center gap-1 text-xs font-black font-mono-tech hover:opacity-70 transition-opacity group"
              style={{ color: scoreColor }}
              title="Click to edit score"
            >
              {scoreVal}
              <Pencil className="w-2.5 h-2.5 opacity-40 group-hover:opacity-80 transition-opacity" />
            </button>
          )}
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${scoreBarColor}`} style={{ width: `${Math.min(100, scoreVal)}%` }} />
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-between gap-2 pt-0.5">
        {isDone ? (
          <span className="inline-flex h-7 items-center rounded-lg bg-[#10B981]/10 px-3 text-[10px] font-bold text-[#10B981]">
            ✓ Converted
          </span>
        ) : isLost ? (
          <Button
            onClick={() => onStatusChange(lead.id, "active" as Lead["status"])}
            variant="outline"
            className="h-7 px-3 border-[#66B2B2]/30 text-[#66B2B2] hover:bg-[#66B2B2]/10 text-[10px] font-bold"
          >
            Restore
          </Button>
        ) : (
          <>
            {scoreVal >= 80 && (
              <Button
                onClick={() => onConvert(lead)}
                className="h-7 flex-1 bg-[#10B981] hover:bg-[#10B981]/80 text-white text-[10px] font-bold"
              >
                Convert to Deal
              </Button>
            )}
            <Button
              onClick={() => onStatusChange(lead.id, "lost" as Lead["status"])}
              variant="outline"
              className="h-7 px-3 border-[#EF4444]/30 text-[#EF4444] hover:bg-[#EF4444]/10 text-[10px] font-bold"
            >
              Lost
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

const TASK_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  upcoming:  { label: "Upcoming",  color: "#66B2B2" },
  due_soon:  { label: "Due Soon",  color: "#F2A900" },
  due_today: { label: "Due Today", color: "#F97316" },
  overdue:   { label: "Overdue",   color: "#EF4444" },
  completed: { label: "Completed", color: "#10B981" },
};

function TaskStatusBadge({ task }: { task: Task }) {
  const s = computeTaskStatus(task);
  const cfg = TASK_STATUS_CONFIG[s] ?? TASK_STATUS_CONFIG.upcoming;
  return (
    <span
      className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase"
      style={{ background: `${cfg.color}20`, color: cfg.color }}
    >
      {cfg.label}
    </span>
  );
}

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-[#F2A900]/15 text-[#B87900]",
  high: "bg-[#EF4444]/15 text-[#EF4444]",
};

function AdminTaskRow({ task, taskTypeLabel, clientName, onEdit, onDelete }: {
  task: Task;
  taskTypeLabel: string;
  clientName: string;
  onEdit: () => void;
  onDelete: (id: number) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <tr className="border-b border-gray-200 hover:bg-gray-50">
      <td className="py-2.5 px-3 font-medium text-black">{task.title}</td>
      <td className="py-2.5 px-3 text-gray-600">{taskTypeLabel}</td>
      <td className="py-2.5 px-3 text-gray-600">{clientName}</td>
      <td className="py-2.5 px-3 text-gray-500 font-mono-tech">{new Date(task.createdAt).toLocaleDateString("en-PH")}</td>
      <td className="py-2.5 px-3 text-gray-700 font-mono-tech">{new Date(task.dueDate).toLocaleDateString("en-PH")}</td>
      <td className="py-2.5 px-3 text-gray-700">{task.assignedTo || "—"}</td>
      <td className="py-2.5 px-3">
        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${PRIORITY_COLORS[task.priority] ?? ""}`}>
          {task.priority}
        </span>
      </td>
      <td className="py-2.5 px-3"><TaskStatusBadge task={task} /></td>
      <td className="py-2.5 px-3">
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
                <Pencil className="w-3 h-3" /> Edit
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors"
                onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onDelete(task.id); }}
              >
                <Trash2 className="w-3 h-3" /> Delete
              </button>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}

function SalesTaskRow({ task, taskTypeLabel, clientName, onDone }: {
  task: Task;
  taskTypeLabel: string;
  clientName: string;
  onDone: () => void;
}) {
  return (
    <tr className="border-b border-gray-200 hover:bg-gray-50">
      <td className="py-2.5 px-3 font-medium text-black">{task.title}</td>
      <td className="py-2.5 px-3 text-gray-600">{taskTypeLabel}</td>
      <td className="py-2.5 px-3 text-gray-600">{clientName}</td>
      <td className="py-2.5 px-3 text-gray-700 font-mono-tech">{new Date(task.dueDate).toLocaleDateString("en-PH")}</td>
      <td className="py-2.5 px-3">
        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${PRIORITY_COLORS[task.priority] ?? ""}`}>
          {task.priority}
        </span>
      </td>
      <td className="py-2.5 px-3"><TaskStatusBadge task={task} /></td>
      <td className="py-2.5 px-3">
        {computeTaskStatus(task) !== "completed" && (
          <Button
            size="sm"
            className="h-7 rounded-lg px-3 text-[10px] font-bold bg-[#10B981] hover:bg-[#10B981]/80 text-white"
            onClick={onDone}
          >
            Done
          </Button>
        )}
      </td>
    </tr>
  );
}

function SalesPerformance({ leads, deals, tasks }: { leads: Lead[]; deals: Deal[]; tasks: Task[] }) {
  const salespeople = ["Sarah Blake", "James Rodriguez", "Marcus Chen", "Marketing System"];

  const stats = salespeople.map(person => {
    const assignedLeads = leads.filter(l => l.assignedTo === person).length;
    const contactedLeads = leads.filter(l => l.assignedTo === person && l.status !== "new").length;
    const wonDeals = deals.filter(d => d.assignedTo === person && d.stage === "closed_won").length;
    const overdueTasks = tasks.filter(t => t.assignedTo === person && computeTaskStatus(t) === "overdue").length;
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
          <div className="text-xl font-bold text-[#EF4444]">{tasks.filter(t => computeTaskStatus(t) === 'overdue').length}</div>
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
