import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Client, Contact, Lead, Deal, Task, TaskReport, DealStage } from "@/types";
import seedData from "@/data/seed-data.json";

export function computeTaskStatus(task: Task): Task["status"] {
  if (task.status === "completed") return "completed";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(task.dueDate);
  due.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((due.getTime() - today.getTime()) / 86400000);
  if (diffDays < 0) return "overdue";
  if (diffDays === 0) return "due_today";
  if (diffDays <= 3) return "due_soon";
  return "upcoming";
}

interface CRMState {
  clients: Client[];
  contacts: Contact[];
  leads: Lead[];
  deals: Deal[];
  tasks: Task[];
  taskReports: TaskReport[];
  addClient: (client: Omit<Client, "id" | "createdAt">) => void;
  updateClient: (id: number, data: Partial<Client>) => void;
  deleteClient: (id: number) => void;
  addDeal: (deal: Omit<Deal, "id" | "createdAt">) => void;
  updateDeal: (dealId: number, data: Partial<Deal>) => void;
  deleteDeal: (dealId: number) => void;
  moveDealStage: (dealId: number, stage: DealStage) => void;
  addTask: (task: Task) => void;
  completeTask: (taskId: number, report: Omit<TaskReport, "id" | "taskId" | "taskTitle">) => void;
  addTaskReport: (report: Omit<TaskReport, "id">) => void;
  updateTask: (id: number, data: Partial<Task>) => void;
  deleteTask: (id: number) => void;
  addLead: (lead: Omit<Lead, "id" | "createdAt">) => void;
  updateLead: (id: number, data: Partial<Lead>) => void;
  convertLeadToDeal: (leadId: number, dealData: Omit<Deal, "id" | "createdAt" | "clientId">) => void;
  getClientDeals: (clientId: number) => Deal[];
  getClientTasks: (clientId: number) => Task[];
  getOverdueTasks: () => Task[];
}

const now = new Date().toISOString();
const yesterday = new Date(Date.now() - 86400000).toISOString();
const lastWeek = new Date(Date.now() - 7 * 86400000).toISOString();
const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString();

const seedClients: Client[] = seedData.clients.map((c: any) => ({
  id: Number(c.id.replace("CL-", "")),
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


export const seedStaff = (seedData as any).staff as { id: string; name: string; email: string; role: string }[];

const mockContacts: Contact[] = [
  { id: 1, clientId: 1, name: "Robert Hale", role: "Security Director", department: "Operations", email: "robert@acme.com", phone: "+1-555-0101", isPrimary: true },
  { id: 2, clientId: 1, name: "Nancy Hale", role: "Finance Lead", department: "Finance", email: "nancy@acme.com", phone: "+1-555-0111", isPrimary: false },
  { id: 3, clientId: 2, name: "Lisa Park", role: "CTO", department: "Engineering", email: "lisa@techcorp.com", phone: "+1-555-0102", isPrimary: true },
  { id: 4, clientId: 2, name: "Tom Bradley", role: "Purchasing Manager", department: "Purchasing", email: "tom@techcorp.com", phone: "+1-555-0112", isPrimary: false },
  { id: 5, clientId: 3, name: "David Kim", role: "Property Manager", department: "Operations", email: "david@guardian.com", phone: "+1-555-0103", isPrimary: true },
  { id: 6, clientId: 4, name: "Amanda Foster", role: "Fleet Manager", department: "Operations", email: "amanda@metrolog.com", phone: "+1-555-0104", isPrimary: true },
  { id: 7, clientId: 5, name: "Carlos Mendez", role: "CEO", department: "Management", email: "carlos@securenet.com", phone: "+1-555-0105", isPrimary: true },
  { id: 8, clientId: 6, name: "Jennifer Walsh", role: "Facilities Director", department: "Operations", email: "jen@brightstar.com", phone: "+1-555-0106", isPrimary: true },
  { id: 9, clientId: 7, name: "Dr. Sam Patel", role: "Medical Director", department: "Management", email: "sam@harbormed.com", phone: "+1-555-0107", isPrimary: true },
  { id: 10, clientId: 8, name: "Mike Torres", role: "Project Manager", department: "Engineering", email: "mike@atlas.com", phone: "+1-555-0108", isPrimary: true },
  { id: 11, clientId: 3, name: "Elena Rossi", role: "Service Coordinator", department: "Service", email: "elena@guardian.com", phone: "+1-555-0113", isPrimary: false },
  { id: 12, clientId: 5, name: "Alex Kumar", role: "Security Analyst", department: "Engineering", email: "alex@securenet.com", phone: "+1-555-0114", isPrimary: false },
  { id: 13, clientId: 7, name: "Rachel Green", role: "Finance Officer", department: "Finance", email: "rachel@harbormed.com", phone: "+1-555-0115", isPrimary: false },
  { id: 14, clientId: 4, name: "Steve Chen", role: "Ops Lead", department: "Operations", email: "steve@metrolog.com", phone: "+1-555-0116", isPrimary: false },
  { id: 15, clientId: 8, name: "Dana White", role: "Purchasing Specialist", department: "Purchasing", email: "dana@atlas.com", phone: "+1-555-0117", isPrimary: false },
];


const seedDeals: Deal[] = (seedData as any).deals.map((d: any) => ({
  id: d.id,
  clientId: d.clientId,
  title: d.title,
  value: d.value,
  stage: d.stage as DealStage,
  probability: d.probability,
  expectedClose: d.expectedClose,
  assignedTo: d.assignedTo,
  createdAt: d.createdAt,
}));


export const useCRMStore = create<CRMState>()(
  persist(
    (set, get) => ({
      clients: seedClients,
      contacts: mockContacts,
      leads: [],
      deals: seedDeals,
      tasks: [],
      taskReports: [],

      addClient: (client) => {
        const newClient = { ...client, id: Date.now(), createdAt: new Date().toISOString() };
        set((state) => ({ clients: [...state.clients, newClient] }));
      },

      updateClient: (id, data) => {
        set((state) => ({
          clients: state.clients.map((c) => (c.id === id ? { ...c, ...data } : c)),
        }));
      },

      deleteClient: (id) => {
        set((state) => ({ clients: state.clients.filter((c) => c.id !== id) }));
      },

      addDeal: (deal) => {
        const newDeal = { ...deal, id: Date.now(), createdAt: new Date().toISOString() };
        set((state) => ({ deals: [...state.deals, newDeal] }));
      },

      updateDeal: (dealId, data) => {
        set((state) => ({
          deals: state.deals.map((d) => (d.id === dealId ? { ...d, ...data } : d)),
        }));
      },

      deleteDeal: (dealId) => {
        set((state) => ({
          deals: state.deals.filter((d) => d.id !== dealId),
        }));
      },

      moveDealStage: (dealId, stage) => {
        set((state) => ({
          deals: state.deals.map((d) => {
            if (d.id === dealId) {
              const probMap: Record<DealStage, number> = {
                inquiry: 20,
                proposal: 45,
                negotiation: 70,
                closed_won: 100,
                closed_lost: 0,
              };
              return { ...d, stage, probability: probMap[stage] };
            }
            return d;
          }),
        }));
      },

      addTask: (task) => {
        // Preserve the caller-supplied id/createdAt so the Zustand copy stays in sync
        // with the seed-data.json copy written by createTaskMutation. Regenerating the id
        // here would desync them and break later status updates (e.g. completion).
        const newTask: Task = {
          ...task,
          id: task.id ?? Date.now(),
          createdAt: task.createdAt ?? new Date().toISOString(),
        };
        set((state) => ({ tasks: [...state.tasks, newTask] }));
      },

      addTaskReport: (report) => {
        const newReport: TaskReport = { ...report, id: Date.now() };
        set((state) => ({ taskReports: [...state.taskReports, newReport] }));
      },

      completeTask: (taskId, report) => {
        const task = get().tasks.find((t) => t.id === taskId);
        if (!task) return;
        const newReport: TaskReport = {
          id: Date.now(),
          taskId,
          taskTitle: task.title,
          ...report,
        };
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === taskId ? { ...t, status: "completed" as const } : t
          ),
          taskReports: [...state.taskReports, newReport],
        }));
      },

      updateTask: (id, data) => {
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...data } : t)),
        }));
      },

      deleteTask: (id) => {
        set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) }));
      },

      addLead: (lead) => {
        const newLead = { ...lead, id: Date.now(), createdAt: new Date().toISOString() };
        set((state) => ({ leads: [...state.leads, newLead] }));
      },

      updateLead: (id, data) => {
        set((state) => ({
          leads: state.leads.map((lead) => (lead.id === id ? { ...lead, ...data } : lead)),
        }));
      },

      convertLeadToDeal: (leadId, dealData) => {
        const lead = get().leads.find((l) => l.id === leadId);
        if (!lead) return;

        // If lead doesn't have a clientId, create a prospect client from lead data
        let effectiveClientId = lead.clientId;

        if (!effectiveClientId) {
          const newClientId = Date.now();
          const newClient: Client = {
            id: newClientId,
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
            lastContact: new Date().toISOString(),
            notes: lead.notes || "",
            createdAt: new Date().toISOString(),
          };
          set((state) => ({ clients: [...state.clients, newClient] }));
          effectiveClientId = newClientId;
        }

        const newDeal: Deal = {
          ...dealData,
          id: Date.now() + 1,
          clientId: effectiveClientId,
          createdAt: new Date().toISOString(),
        };
        const convertedAt = new Date().toISOString();

        set((state) => ({
          deals: [...state.deals, newDeal],
          leads: state.leads.map((l) =>
            l.id === leadId
              ? {
                  ...l,
                  status: "qualified" as const,
                  clientId: effectiveClientId,
                  convertedToDealId: newDeal.id,
                  convertedAt,
                }
              : l
          ),
        }));
      },

      getClientDeals: (clientId) => {
        return get().deals.filter((d) => d.clientId === clientId);
      },

      getClientTasks: (clientId) => {
        return get().tasks.filter((t) => t.relatedId === clientId);
      },

      getOverdueTasks: () => {
        return get().tasks.filter((t) => computeTaskStatus(t) === "overdue");
      },
    }),
    {
      name: "nextos-crm-v4",
    }
  )
);
