import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Client, Contact, Lead, Deal, Task, DealStage } from "@/types";

interface CRMState {
  clients: Client[];
  contacts: Contact[];
  leads: Lead[];
  deals: Deal[];
  tasks: Task[];
  addClient: (client: Omit<Client, "id" | "createdAt">) => void;
  updateClient: (id: number, data: Partial<Client>) => void;
  addDeal: (deal: Omit<Deal, "id" | "createdAt">) => void;
  moveDealStage: (dealId: number, stage: DealStage) => void;
  addTask: (task: Omit<Task, "id" | "createdAt">) => void;
  completeTask: (taskId: number) => void;
  updateTask: (id: number, data: Partial<Task>) => void;
  addLead: (lead: Omit<Lead, "id" | "createdAt">) => void;
  convertLeadToDeal: (leadId: number, dealData: Omit<Deal, "id" | "createdAt" | "clientId">) => void;
  getClientDeals: (clientId: number) => Deal[];
  getClientTasks: (clientId: number) => Task[];
  getOverdueTasks: () => Task[];
}

const now = new Date().toISOString();
const yesterday = new Date(Date.now() - 86400000).toISOString();
const lastWeek = new Date(Date.now() - 7 * 86400000).toISOString();
const tomorrow = new Date(Date.now() + 86400000).toISOString();
const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString();

const mockClients: Client[] = [
  { id: 1, companyName: "Acme Security", industry: "Security Services", contactName: "Robert Hale", email: "robert@acme.com", phone: "+1-555-0101", status: "active", address: "100 Industrial Way", city: "Austin", country: "USA", contractValue: 125000, lastContact: yesterday, notes: "Enterprise client, multiple sites", createdAt: lastWeek },
  { id: 2, companyName: "TechCorp Industries", industry: "Technology", contactName: "Lisa Park", email: "lisa@techcorp.com", phone: "+1-555-0102", status: "active", address: "500 Innovation Dr", city: "San Jose", country: "USA", contractValue: 85000, lastContact: now, notes: "Growing fast, needs expansion", createdAt: lastWeek },
  { id: 3, companyName: "Guardian Properties", industry: "Real Estate", contactName: "David Kim", email: "david@guardian.com", phone: "+1-555-0103", status: "prospect", address: "200 Marina Blvd", city: "Miami", country: "USA", contractValue: 45000, lastContact: threeDaysAgo, notes: "High-value prospect", createdAt: lastWeek },
  { id: 4, companyName: "Metro Logistics", industry: "Transportation", contactName: "Amanda Foster", email: "amanda@metrolog.com", phone: "+1-555-0104", status: "active", address: "300 Freight Lane", city: "Chicago", country: "USA", contractValue: 67000, lastContact: yesterday, notes: "Fleet tracking client", createdAt: lastWeek },
  { id: 5, companyName: "SecureNet Solutions", industry: "Cybersecurity", contactName: "Carlos Mendez", email: "carlos@securenet.com", phone: "+1-555-0105", status: "active", address: "800 Cyber Ave", city: "Seattle", country: "USA", contractValue: 150000, lastContact: now, notes: "Premium support tier", createdAt: lastWeek },
  { id: 6, companyName: "BrightStar Energy", industry: "Energy", contactName: "Jennifer Walsh", email: "jen@brightstar.com", phone: "+1-555-0106", status: "inactive", address: "400 Solar Rd", city: "Phoenix", country: "USA", contractValue: 32000, lastContact: lastWeek, notes: "Contract ending soon", createdAt: lastWeek },
  { id: 7, companyName: "Harbor Medical", industry: "Healthcare", contactName: "Dr. Sam Patel", email: "sam@harbormed.com", phone: "+1-555-0107", status: "prospect", address: "700 Health St", city: "Boston", country: "USA", contractValue: 95000, lastContact: threeDaysAgo, notes: "Compliance requirements", createdAt: lastWeek },
  { id: 8, companyName: "Atlas Construction", industry: "Construction", contactName: "Mike Torres", email: "mike@atlas.com", phone: "+1-555-0108", status: "active", address: "900 Builder Way", city: "Denver", country: "USA", contractValue: 78000, lastContact: yesterday, notes: "Site security systems", createdAt: lastWeek },
];

const mockContacts: Contact[] = [
  { id: 1, clientId: 1, name: "Robert Hale", role: "Security Director", email: "robert@acme.com", phone: "+1-555-0101", isPrimary: true },
  { id: 2, clientId: 1, name: "Nancy Hale", role: "Operations Manager", email: "nancy@acme.com", phone: "+1-555-0111", isPrimary: false },
  { id: 3, clientId: 2, name: "Lisa Park", role: "CTO", email: "lisa@techcorp.com", phone: "+1-555-0102", isPrimary: true },
  { id: 4, clientId: 2, name: "Tom Bradley", role: "IT Manager", email: "tom@techcorp.com", phone: "+1-555-0112", isPrimary: false },
  { id: 5, clientId: 3, name: "David Kim", role: "Property Manager", email: "david@guardian.com", phone: "+1-555-0103", isPrimary: true },
  { id: 6, clientId: 4, name: "Amanda Foster", role: "Fleet Manager", email: "amanda@metrolog.com", phone: "+1-555-0104", isPrimary: true },
  { id: 7, clientId: 5, name: "Carlos Mendez", role: "CEO", email: "carlos@securenet.com", phone: "+1-555-0105", isPrimary: true },
  { id: 8, clientId: 6, name: "Jennifer Walsh", role: "Facilities Director", email: "jen@brightstar.com", phone: "+1-555-0106", isPrimary: true },
  { id: 9, clientId: 7, name: "Dr. Sam Patel", role: "Medical Director", email: "sam@harbormed.com", phone: "+1-555-0107", isPrimary: true },
  { id: 10, clientId: 8, name: "Mike Torres", role: "Project Manager", email: "mike@atlas.com", phone: "+1-555-0108", isPrimary: true },
  { id: 11, clientId: 3, name: "Elena Rossi", role: "Assistant Manager", email: "elena@guardian.com", phone: "+1-555-0113", isPrimary: false },
  { id: 12, clientId: 5, name: "Alex Kumar", role: "Security Analyst", email: "alex@securenet.com", phone: "+1-555-0114", isPrimary: false },
  { id: 13, clientId: 7, name: "Rachel Green", role: "Compliance Officer", email: "rachel@harbormed.com", phone: "+1-555-0115", isPrimary: false },
  { id: 14, clientId: 4, name: "Steve Chen", role: "Dispatcher", email: "steve@metrolog.com", phone: "+1-555-0116", isPrimary: false },
  { id: 15, clientId: 8, name: "Dana White", role: "Site Supervisor", email: "dana@atlas.com", phone: "+1-555-0117", isPrimary: false },
];

const mockLeads: Lead[] = [
  { id: 1, clientId: 3, source: "Website", status: "qualified", priority: "high", score: 85, assignedTo: "Sarah Blake", notes: "Interested in full package", createdAt: lastWeek },
  { id: 2, clientId: 7, source: "Referral", status: "contacted", priority: "high", score: 72, assignedTo: "Sarah Blake", notes: "Needs HIPAA compliance", createdAt: threeDaysAgo },
  { id: 3, clientId: null, source: "Trade Show", status: "new", priority: "medium", score: 45, assignedTo: "Sarah Blake", notes: "Coastal Defense Corp", createdAt: yesterday },
  { id: 4, clientId: 6, source: "Email Campaign", status: "contacted", priority: "medium", score: 60, assignedTo: "Sarah Blake", notes: "Renewal discussion", createdAt: threeDaysAgo },
  { id: 5, clientId: null, source: "LinkedIn", status: "new", priority: "low", score: 30, assignedTo: "Sarah Blake", notes: "Pacific Rim Logistics", createdAt: yesterday },
  { id: 6, clientId: 2, source: "Inbound Call", status: "qualified", priority: "high", score: 90, assignedTo: "Sarah Blake", notes: "Expansion to 3 new locations", createdAt: lastWeek },
  { id: 7, clientId: null, source: "Partner", status: "contacted", priority: "medium", score: 55, assignedTo: "Sarah Blake", notes: "Summit Retail Group", createdAt: threeDaysAgo },
  { id: 8, clientId: 1, source: "Website", status: "qualified", priority: "high", score: 78, assignedTo: "Sarah Blake", notes: "Upgrade to enterprise tier", createdAt: lastWeek },
  { id: 9, clientId: null, source: "Cold Call", status: "new", priority: "low", score: 25, assignedTo: "Sarah Blake", notes: "Midwest Manufacturing", createdAt: yesterday },
  { id: 10, clientId: 4, source: "Referral", status: "qualified", priority: "medium", score: 65, assignedTo: "Sarah Blake", notes: "Additional fleet units", createdAt: threeDaysAgo },
  { id: 11, clientId: null, source: "Website", status: "new", priority: "medium", score: 40, assignedTo: "Sarah Blake", notes: "Urban Development Inc", createdAt: yesterday },
  { id: 12, clientId: 5, source: "Email Campaign", status: "contacted", priority: "high", score: 80, assignedTo: "Sarah Blake", notes: "International expansion", createdAt: lastWeek },
];

const mockDeals: Deal[] = [
  { id: 1, clientId: 1, title: "Enterprise Upgrade Q2", value: 75000, stage: "negotiation", probability: 75, expectedClose: tomorrow, assignedTo: "Sarah Blake", createdAt: lastWeek },
  { id: 2, clientId: 2, title: "TechCorp Site Expansion", value: 45000, stage: "proposal", probability: 50, expectedClose: tomorrow, assignedTo: "Sarah Blake", createdAt: lastWeek },
  { id: 3, clientId: 5, title: "SecureNet Global License", value: 120000, stage: "inquiry", probability: 25, expectedClose: tomorrow, assignedTo: "Sarah Blake", createdAt: lastWeek },
  { id: 4, clientId: 4, title: "Metro Fleet Add-on", value: 28000, stage: "closed_won", probability: 100, expectedClose: yesterday, assignedTo: "Sarah Blake", createdAt: lastWeek },
  { id: 5, clientId: 7, title: "Harbor Medical Compliance", value: 60000, stage: "proposal", probability: 45, expectedClose: tomorrow, assignedTo: "Sarah Blake", createdAt: lastWeek },
  { id: 6, clientId: 3, title: "Guardian Full Package", value: 38000, stage: "negotiation", probability: 70, expectedClose: tomorrow, assignedTo: "Sarah Blake", createdAt: lastWeek },
  { id: 7, clientId: 8, title: "Atlas Multi-Site Install", value: 55000, stage: "inquiry", probability: 30, expectedClose: tomorrow, assignedTo: "Sarah Blake", createdAt: lastWeek },
  { id: 8, clientId: 1, title: "Acme Annual Renewal", value: 95000, stage: "closed_won", probability: 100, expectedClose: yesterday, assignedTo: "Sarah Blake", createdAt: lastWeek },
  { id: 9, clientId: 6, title: "BrightStar Re-engagement", value: 22000, stage: "proposal", probability: 40, expectedClose: tomorrow, assignedTo: "Sarah Blake", createdAt: lastWeek },
  { id: 10, clientId: 2, title: "TechCorp Support Tier Up", value: 32000, stage: "negotiation", probability: 65, expectedClose: tomorrow, assignedTo: "Sarah Blake", createdAt: lastWeek },
];

const mockTasks: Task[] = [
  { id: 1, title: "Follow up on Guardian proposal", description: "Send revised pricing", assignedTo: "Sarah Blake", relatedType: "deal", relatedId: 6, dueDate: yesterday, priority: "high", status: "overdue", createdAt: lastWeek },
  { id: 2, title: "Prepare TechCorp demo", description: "Set up live environment", assignedTo: "Sarah Blake", relatedType: "deal", relatedId: 2, dueDate: tomorrow, priority: "high", status: "pending", createdAt: lastWeek },
  { id: 3, title: "Acme site visit", description: "Inspect new location", assignedTo: "James Rodriguez", relatedType: "client", relatedId: 1, dueDate: tomorrow, priority: "medium", status: "pending", createdAt: lastWeek },
  { id: 4, title: "Update SecureNet contract", description: "Legal review complete", assignedTo: "Marcus Chen", relatedType: "client", relatedId: 5, dueDate: yesterday, priority: "high", status: "overdue", createdAt: lastWeek },
  { id: 5, title: "Fleet unit calibration", description: "Unit GPS-004 needs recalibration", assignedTo: "James Rodriguez", relatedType: "equipment", relatedId: 4, dueDate: tomorrow, priority: "medium", status: "pending", createdAt: lastWeek },
  { id: 6, title: "Quarterly business review", description: "Prepare Q2 report", assignedTo: "Sarah Blake", relatedType: "general", relatedId: null, dueDate: tomorrow, priority: "low", status: "pending", createdAt: lastWeek },
  { id: 7, title: "Harbor Medical compliance audit", description: "Schedule on-site visit", assignedTo: "James Rodriguez", relatedType: "client", relatedId: 7, dueDate: yesterday, priority: "high", status: "overdue", createdAt: lastWeek },
  { id: 8, title: "Metro Logistics training", description: "New fleet dashboard walkthrough", assignedTo: "James Rodriguez", relatedType: "client", relatedId: 4, dueDate: tomorrow, priority: "medium", status: "in_progress", createdAt: lastWeek },
  { id: 9, title: "Renew BrightStar contract", description: "Present new pricing options", assignedTo: "Sarah Blake", relatedType: "deal", relatedId: 9, dueDate: tomorrow, priority: "medium", status: "pending", createdAt: lastWeek },
  { id: 10, title: "Atlas installation planning", description: "Site survey for 3 locations", assignedTo: "James Rodriguez", relatedType: "deal", relatedId: 7, dueDate: tomorrow, priority: "low", status: "pending", createdAt: lastWeek },
  { id: 11, title: "SecureNet international call", description: "Discuss APAC requirements", assignedTo: "Marcus Chen", relatedType: "deal", relatedId: 3, dueDate: yesterday, priority: "high", status: "overdue", createdAt: lastWeek },
  { id: 12, title: "Equipment inventory check", description: "Verify all units accounted for", assignedTo: "James Rodriguez", relatedType: "general", relatedId: null, dueDate: tomorrow, priority: "low", status: "pending", createdAt: lastWeek },
  { id: 13, title: "Client feedback survey", description: "Send Q2 satisfaction survey", assignedTo: "Sarah Blake", relatedType: "general", relatedId: null, dueDate: tomorrow, priority: "low", status: "in_progress", createdAt: lastWeek },
  { id: 14, title: "Harbor Medical proposal revision", description: "Include HIPAA addendum", assignedTo: "Sarah Blake", relatedType: "deal", relatedId: 5, dueDate: yesterday, priority: "high", status: "overdue", createdAt: lastWeek },
  { id: 15, title: "Update service documentation", description: "Revise PMS procedures", assignedTo: "James Rodriguez", relatedType: "general", relatedId: null, dueDate: tomorrow, priority: "medium", status: "pending", createdAt: lastWeek },
  { id: 16, title: "TechCorp expansion meeting", description: "Present proposal to executive team", assignedTo: "Sarah Blake", relatedType: "deal", relatedId: 2, dueDate: yesterday, priority: "high", status: "overdue", createdAt: lastWeek },
  { id: 17, title: "Guardian site assessment", description: "Evaluate Marina Blvd location", assignedTo: "James Rodriguez", relatedType: "client", relatedId: 3, dueDate: tomorrow, priority: "medium", status: "pending", createdAt: lastWeek },
  { id: 18, title: "Quarterly revenue forecast", description: "Project Q3 pipeline value", assignedTo: "Marcus Chen", relatedType: "general", relatedId: null, dueDate: tomorrow, priority: "medium", status: "pending", createdAt: lastWeek },
  { id: 19, title: "Atlas contract finalization", description: "Send final terms for signature", assignedTo: "Sarah Blake", relatedType: "deal", relatedId: 7, dueDate: yesterday, priority: "medium", status: "overdue", createdAt: lastWeek },
  { id: 20, title: "Fleet maintenance schedule", description: "Plan July maintenance windows", assignedTo: "James Rodriguez", relatedType: "general", relatedId: null, dueDate: tomorrow, priority: "low", status: "pending", createdAt: lastWeek },
];

export const useCRMStore = create<CRMState>()(
  persist(
    (set, get) => ({
      clients: mockClients,
      contacts: mockContacts,
      leads: mockLeads,
      deals: mockDeals,
      tasks: mockTasks,

      addClient: (client) => {
        const newClient = { ...client, id: Date.now(), createdAt: new Date().toISOString() };
        set((state) => ({ clients: [...state.clients, newClient] }));
      },

      updateClient: (id, data) => {
        set((state) => ({
          clients: state.clients.map((c) => (c.id === id ? { ...c, ...data } : c)),
        }));
      },

      addDeal: (deal) => {
        const newDeal = { ...deal, id: Date.now(), createdAt: new Date().toISOString() };
        set((state) => ({ deals: [...state.deals, newDeal] }));
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
        const newTask = { ...task, id: Date.now(), createdAt: new Date().toISOString() };
        set((state) => ({ tasks: [...state.tasks, newTask] }));
      },

      completeTask: (taskId) => {
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === taskId ? { ...t, status: "completed" as const } : t
          ),
        }));
      },

      updateTask: (id, data) => {
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...data } : t)),
        }));
      },

      addLead: (lead) => {
        const newLead = { ...lead, id: Date.now(), createdAt: new Date().toISOString() };
        set((state) => ({ leads: [...state.leads, newLead] }));
      },

      convertLeadToDeal: (leadId, dealData) => {
        const lead = get().leads.find((l) => l.id === leadId);
        if (!lead) return;
        const newDeal: Deal = {
          ...dealData,
          id: Date.now(),
          clientId: lead.clientId || 0,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          deals: [...state.deals, newDeal],
          leads: state.leads.map((l) =>
            l.id === leadId ? { ...l, status: "qualified" as const } : l
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
        const now = new Date().toISOString();
        return get().tasks.filter((t) => t.dueDate < now && t.status !== "completed");
      },
    }),
    {
      name: "nextos-crm",
    }
  )
);
