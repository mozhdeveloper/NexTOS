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
  name?: string;
  company?: string;
  email?: string;
  phone?: string;
  inquiryType?: "sales" | "quote" | "pms" | "equipment" | "general";
  department?: Department;
  message?: string;
  source: string;
  status: "new" | "contacted" | "qualified" | "lost";
  priority: "low" | "medium" | "high";
  score: number;
  assignedTo: string;
  notes: string;
  convertedToDealId?: number;
  convertedAt?: string;
  createdAt: string;
}

export type DealStage = "inquiry" | "proposal" | "negotiation" | "closed_won" | "closed_lost";

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
  serviceType?: string;
  createdAt: string;
}

// Values sourced from equipmentTypes in src/data/seed-data.json
export type EquipmentType = string;

export interface PmsConfig {
  serviceInterval: number;
  serviceIntervalUnit: string;
  serviceType: string;
  estimatedCost?: number;
}

export interface Equipment {
  id: string;          // "EQ-001", "LAB-001" etc — matches seed-data.json
  name: string;
  clientId: string;    // "CL-001" etc — matches seed-data.json
  serialNumber: string;
  equipmentType: EquipmentType;
  status?: string;
  unitId?: string;
  type?: string;
  manufacturer?: string;
  model?: string;
  location?: string;
  installDate?: string;
  warrantyExpiry?: string;
  currentHours?: number;
  lastPMSHours?: number;
  nextPMSHours?: number;
  pmsInterval?: number;
  lastCalibrationDate?: string;
  nextCalibrationDate?: string;
  calibrationFrequency?: number;
  notes?: string;
  hoursTotal?: string;  // "1250h 10m"
  hoursToday?: string;
  kmTotal?: number;
  kmToday?: number;
  lat?: number;
  lng?: number;
  pmsConfiguration?: PmsConfig[];
  image?: string;
  days?: number;
}

export type ServiceCategory = 
  | "Heavy Equipment PMS" 
  | "Calibration PMS" 
  | "Lab Testing Service" 
  | "Repair" 
  | "Inspection" 
  | "Installation";

export type ServiceType = "pms" | "installation" | "repair" | "inspection" | "calibration"; // Legacy enum

export type LabTestingStatus = 
  | "Requested" 
  | "Scheduled" 
  | "In Progress" 
  | "Completed" 
  | "Released";

export interface ServiceRecord {
  id: number;
  equipmentId: string;   // matches Equipment.id / seedEquipmentId
  clientId: string | number; // Support both old mock integers and seed-data string prefixes
  technician: string;
  serviceCategory: ServiceCategory;
  serviceType?: ServiceType; // Legacy
  description: string;
  findings?: string;
  workDone?: string;
  recommendation?: string;
  
  // Logic-specific fields
  hoursAtService?: number; // for Heavy Equipment
  lastCalibrationDate?: string; // for Lab Equipment
  nextCalibrationDate?: string; // for Lab Equipment
  
  // Lab Testing specific
  testType?: string;
  sampleName?: string;
  projectName?: string;
  labStatus?: LabTestingStatus;
  reportAttachment?: string;
  
  bookingId?: number;
  partsUsed: string;
  partsUsedDetails?: { name: string; quantity: number; pricePerUnit: number }[];
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
  scheduledDate: string;
  completedDate: string | null;
  cost: number;
  invoiceId: number | null;
  clientSignature?: string;
  techSignature?: string;
  safetyChecklist?: {
    ppeChecked: boolean;
    engineOff: boolean;
    areaSecured: boolean;
    lotoApplied: boolean;
  };
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
  id: string;
  clientId: string;
  equipmentId: string;
  serviceCategory?: ServiceCategory;
  serviceType?: ServiceType;
  type?: string;
  requestedDate: string;
  preferredTime?: string;
  status: "pending" | "confirmed" | "completed" | "cancelled" | "Pending" | "Confirmed" | "Scheduled";
  packageId?: number;
  packageName?: string;
  preferredTechnician?: string;
  cancelReason?: string;
  rescheduledFrom?: string;
  notes?: string;
  projectName?: string;
  sampleName?: string;
  package?: string;
  createdAt?: string;
}

export type PackageType = 
  | "Heavy Equipment PMS Package" 
  | "Calibration Package" 
  | "Lab Testing Package";

export type PackageTier = "basic" | "professional" | "enterprise";

export interface Package {
  id: number;
  clientId: number;
  name: string;
  description: string;
  packageType: PackageType;
  tier: PackageTier;
  price: number;
  billingCycle: "monthly" | "quarterly" | "annual";
  includedServices: string[];
  totalVisits: number;
  visitsRemaining: number;
  usageCount: number;
  durationMonths: number;
  validityMonths: number;
  terms: string;
  startDate: string;
  endDate: string;
  linkedEquipmentId?: string;
  linkedServiceCategory?: ServiceCategory;
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
  service?: string;
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
  status: "driving" | "idle" | "parking" | "offline" | "online";
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

export interface InventoryItem {
  id: number;
  partNumber: string;
  name: string;
  category: "Filter" | "Oil" | "Belt" | "Hardware" | "Electrical" | "Other" | string;
  unit: "Pcs" | "Liters" | "Kits" | "Meters" | string;
  stockLevel: number;
  minThreshold: number;
  pricePerUnit: number;
  compatibility: string[]; // List of Equipment Models or Types
  lastRestocked: string;
  createdAt: string;
}

export interface PartUsage {
  id: number;
  serviceRecordId: number;
  inventoryItemId: number;
  quantityUsed: number;
  unitPriceAtTime: number;
  createdAt: string;
}

export interface RestockEvent {
  id: number;
  inventoryItemId: number;
  quantityAdded: number;
  unitPriceAtTime: number;
  createdAt: string;
}

export type CampaignStatus = "draft" | "scheduled" | "sending" | "completed";
export type CampaignType = "email" | "sms";

export interface MarketingCampaign {
  id: number;
  name: string;
  type: CampaignType;
  status: CampaignStatus;
  sentCount: number;
  openCount: number;
  clickCount: number;
  leadsGenerated: number;
  scheduledDate: string;
  createdAt: string;
}

export interface Rating {
  id: number;
  serviceRecordId: number;
  clientId: string | number;
  technician: string;
  rating: number;
  comments: string;
  suggestions?: string;
  createdAt: string;
}

