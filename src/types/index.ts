export type UserRole = "admin" | "sales" | "tech" | "client";

export interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  clientId?: number;
}

export interface Client {
  id: number;
  companyName: string;
  industry: string;
  contactName: string;
  email: string;
  phone: string;
  status: "active" | "inactive" | "prospect";
  address: string;
  city: string;
  country: string;
  contractValue: number;
  lastContact: string;
  notes: string;
  createdAt: string;
}

export type Department = "Purchasing" | "Engineering" | "Operations" | "Service" | "Finance" | "Management";

export interface Contact {
  id: number;
  clientId: number;
  name: string;
  role: string;
  department: Department;
  email: string;
  phone: string;
  isPrimary: boolean;
}

export interface Lead {
  id: number;
  clientId: number | null;
  source: string;
  status: "new" | "contacted" | "qualified" | "lost";
  priority: "low" | "medium" | "high";
  score: number;
  assignedTo: string;
  notes: string;
  createdAt: string;
}

export type DealStage = "inquiry" | "proposal" | "negotiation" | "contracting" | "closed_won" | "closed_lost";

export interface Deal {
  id: number;
  clientId: number;
  title: string;
  value: number;
  stage: DealStage;
  probability: number;
  expectedClose: string;
  assignedTo: string;
  createdAt: string;
}

export interface Task {
  id: number;
  title: string;
  description: string;
  assignedTo: string;
  relatedType: "client" | "deal" | "equipment" | "general";
  relatedId: number | null;
  dueDate: string;
  priority: "low" | "medium" | "high";
  status: "pending" | "in_progress" | "completed" | "overdue";
  createdAt: string;
}

export interface Equipment {
  id: number;
  clientId: number;
  unitId: string;
  type: string;
  serialNumber: string;
  manufacturer: string;
  model: string;
  installDate: string;
  warrantyExpiry: string;
  status: "active" | "inactive" | "maintenance" | "retired";
  lastService: string;
  nextServiceDue: number;
  currentHours: number;
  location: string;
  notes: string;
  createdAt: string;
}

export type ServiceType = "pms" | "installation" | "repair" | "inspection";

export interface ServiceRecord {
  id: number;
  equipmentId: number;
  clientId: number;
  technician: string;
  serviceType: ServiceType;
  description: string;
  hoursAtService: number;
  partsUsed: string;
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
  scheduledDate: string;
  completedDate: string | null;
  cost: number;
  invoiceId: number | null;
  createdAt: string;
}

export interface ServicePhoto {
  id: number;
  serviceRecordId: number;
  type: "before" | "after";
  url: string;
  caption: string;
  uploadedAt: string;
}

export interface Booking {
  id: number;
  clientId: number;
  equipmentId: number;
  serviceType: ServiceType;
  requestedDate: string;
  preferredTime: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  notes: string;
  createdAt: string;
}

export type PackageTier = "basic" | "professional" | "enterprise";

export interface Package {
  id: number;
  clientId: number;
  name: string;
  tier: PackageTier;
  price: number;
  billingCycle: "monthly" | "quarterly" | "annual";
  includedServices: string[];
  startDate: string;
  endDate: string;
  status: "active" | "expired" | "cancelled";
  createdAt: string;
}

export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "cancelled";

export interface Invoice {
  id: number;
  clientId: number;
  packageId: number | null;
  serviceRecordId: number | null;
  invoiceNumber: string;
  amount: number;
  tax: number;
  total: number;
  status: InvoiceStatus;
  dueDate: string;
  paidDate: string | null;
  createdAt: string;
}

export interface GPSTelemetry {
  lat: number;
  lng: number;
  hours: number;
  status: "online" | "idle" | "offline";
  speed: number;
  heading: number;
  lastUpdated: string;
}

export interface FleetUnit {
  id: number;
  equipmentId: number;
  unitName: string;
  telemetry: GPSTelemetry;
  serviceDue: boolean;
}
