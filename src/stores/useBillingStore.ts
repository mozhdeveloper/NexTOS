import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Package, Invoice } from "@/types";

interface BillingState {
  packages: Package[];
  invoices: Invoice[];
  addPackage: (pkg: Omit<Package, "id" | "createdAt">) => void;
  addInvoice: (invoice: Omit<Invoice, "id" | "createdAt">) => void;
  _addInvoice: (invoice: Invoice) => void;
  markInvoicePaid: (invoiceId: number) => void;
  decrementPackageVisits: (clientId: number, serviceCategory: string) => void;
  getClientInvoices: (clientId: number) => Invoice[];
  getClientPackages: (clientId: number) => Package[];
  getTotalRevenue: () => number;
  getOutstandingRevenue: () => number;
}

const lastWeek = new Date(Date.now() - 7 * 86400000).toISOString();
const lastMonth = new Date(Date.now() - 30 * 86400000).toISOString();
const nextMonth = new Date(Date.now() + 30 * 86400000).toISOString();
const nextYear = new Date(Date.now() + 365 * 86400000).toISOString();

const mockPackages: Package[] = [
  { 
    id: 1, 
    clientId: 1, 
    name: "Enterprise Heavy Equipment PMS", 
    description: "Quarterly PMS for heavy machinery fleet.",
    packageType: "Heavy Equipment PMS Package",
    tier: "enterprise", 
    price: 4500, 
    billingCycle: "monthly", 
    includedServices: ["Engine Oil", "Hydraulic Filter", "Track Inspection"], 
    totalVisits: 4,
    visitsRemaining: 3,
    usageCount: 1,
    durationMonths: 12,
    validityMonths: 12,
    terms: "Standard enterprise service level agreement applies.",
    startDate: lastMonth, 
    endDate: nextMonth, 
    linkedServiceCategory: "Heavy Equipment PMS",
    status: "active", 
    createdAt: lastMonth 
  },
  { 
    id: 2, 
    clientId: 1, 
    name: "Annual Calibration Package", 
    description: "Certified calibration services for lab equipment.",
    packageType: "Calibration Package",
    tier: "professional", 
    price: 1500, 
    billingCycle: "annual", 
    includedServices: ["Calibration", "Certification", "Reporting"], 
    totalVisits: 1,
    visitsRemaining: 1,
    usageCount: 0,
    durationMonths: 12,
    validityMonths: 12,
    terms: "Ensures equipment compliance with international standards.",
    startDate: lastMonth, 
    endDate: nextYear, 
    linkedServiceCategory: "Calibration PMS",
    status: "active", 
    createdAt: lastMonth 
  },
  { 
    id: 3, 
    clientId: 1, 
    name: "Lab Testing Bundle (10 Tests)", 
    description: "Discounted bundle for concrete and soil testing.",
    packageType: "Lab Testing Package",
    tier: "basic", 
    price: 1200, 
    billingCycle: "annual", 
    includedServices: ["Concrete Strength", "Soil Analysis", "Asphalt Test"], 
    totalVisits: 10,
    visitsRemaining: 9,
    usageCount: 1,
    durationMonths: 12,
    validityMonths: 12,
    terms: "Includes up to 10 lab testing services.",
    startDate: lastMonth, 
    endDate: nextYear, 
    linkedServiceCategory: "Lab Testing Service",
    status: "active", 
    createdAt: lastMonth 
  },
];

const mockInvoices: Invoice[] = [
  { id: 1, clientId: 1, packageId: null, serviceRecordId: 1, invoiceNumber: "INV-2024-0001", amount: 850.00, tax: 85.00, total: 935.00, status: "paid", dueDate: nextMonth, paidDate: lastWeek, createdAt: lastWeek },
  { id: 2, clientId: 1, packageId: null, serviceRecordId: 2, invoiceNumber: "INV-2024-0002", amount: 450.00, tax: 45.00, total: 495.00, status: "paid", dueDate: nextMonth, paidDate: lastMonth, createdAt: lastMonth },
];

export const useBillingStore = create<BillingState>()(
  persist(
    (set, get) => ({
      packages: mockPackages,
      invoices: mockInvoices,

      addPackage: (pkg) => {
        const newPkg = { ...pkg, id: Date.now(), createdAt: new Date().toISOString() };
        set((state) => ({ packages: [...state.packages, newPkg] }));
      },

      addInvoice: (invoice) => {
        const newInvoice = { ...invoice, id: Date.now(), createdAt: new Date().toISOString() };
        set((state) => ({ invoices: [...state.invoices, newInvoice] }));
      },

      _addInvoice: (invoice) => {
        set((state) => ({ invoices: [...state.invoices, invoice] }));
      },

      markInvoicePaid: (invoiceId) => {
        set((state) => ({
          invoices: state.invoices.map((inv) =>
            inv.id === invoiceId
              ? { ...inv, status: "paid" as const, paidDate: new Date().toISOString() }
              : inv
          ),
        }));
      },

      decrementPackageVisits: (clientId, serviceCategory) => {
        set((state) => ({
          packages: state.packages.map((pkg) => {
            // Check if package belongs to client, is active, and matches category
            const matchesCategory = pkg.linkedServiceCategory === serviceCategory;
            
            if (pkg.clientId === clientId && pkg.status === "active" && matchesCategory && pkg.visitsRemaining > 0) {
              return { 
                ...pkg, 
                visitsRemaining: pkg.visitsRemaining - 1,
                usageCount: (pkg.usageCount || 0) + 1
              };
            }
            return pkg;
          })
        }));
      },

      getClientInvoices: (clientId) => {
        return get().invoices.filter((inv) => inv.clientId === clientId);
      },

      getClientPackages: (clientId) => {
        return get().packages.filter((pkg) => pkg.clientId === clientId);
      },

      getTotalRevenue: () => {
        return get().invoices
          .filter((inv) => inv.status === "paid")
          .reduce((sum, inv) => sum + inv.total, 0);
      },

      getOutstandingRevenue: () => {
        return get().invoices
          .filter((inv) => inv.status === "sent" || inv.status === "overdue")
          .reduce((sum, inv) => sum + inv.total, 0);
      },
    }),
    {
      name: "nextos-billing",
    }
  )
);
