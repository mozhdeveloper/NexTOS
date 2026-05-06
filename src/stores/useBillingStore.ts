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
  decrementPackageVisits: (clientId: number, serviceType: string) => void;
  getClientInvoices: (clientId: number) => Invoice[];
  getClientPackages: (clientId: number) => Package[];
  getTotalRevenue: () => number;
  getOutstandingRevenue: () => number;
}

const lastMonth = new Date(Date.now() - 30 * 86400000).toISOString();
const nextMonth = new Date(Date.now() + 30 * 86400000).toISOString();
const nextYear = new Date(Date.now() + 365 * 86400000).toISOString();

const mockPackages: Package[] = [
  { 
    id: 1, 
    clientId: 1, 
    name: "Enterprise Security", 
    description: "Full-scale security and fleet monitoring for large operations.",
    tier: "enterprise", 
    price: 4500, 
    billingCycle: "monthly", 
    includedServices: ["24/7 Monitoring", "Quarterly PMS", "Priority Support", "Fleet Tracking"], 
    totalVisits: 4,
    visitsRemaining: 3,
    durationMonths: 12,
    terms: "Standard enterprise service level agreement applies.",
    startDate: lastMonth, 
    endDate: nextMonth, 
    status: "active", 
    createdAt: lastMonth 
  },
  { 
    id: 2, 
    clientId: 2, 
    name: "Professional Suite", 
    description: "Optimized for medium-sized businesses needing regular maintenance.",
    tier: "professional", 
    price: 2800, 
    billingCycle: "monthly", 
    includedServices: ["Business Hours Monitoring", "Bi-annual PMS", "Standard Support"], 
    totalVisits: 2,
    visitsRemaining: 1,
    durationMonths: 12,
    terms: "Includes two preventative maintenance visits per year.",
    startDate: lastMonth, 
    endDate: nextMonth, 
    status: "active", 
    createdAt: lastMonth 
  },
  { 
    id: 3, 
    clientId: 5, 
    name: "Annual Calibration Package", 
    description: "Certified calibration services for precision equipment.",
    tier: "professional", 
    price: 1500, 
    billingCycle: "annual", 
    includedServices: ["Calibration", "Certification", "Reporting"], 
    totalVisits: 1,
    visitsRemaining: 1,
    durationMonths: 12,
    terms: "Ensures equipment compliance with international standards.",
    startDate: lastMonth, 
    endDate: nextYear, 
    status: "active", 
    createdAt: lastMonth 
  },
  { 
    id: 4, 
    clientId: 4, 
    name: "4x PMS Package", 
    description: "Discounted quarterly preventative maintenance plan.",
    tier: "basic", 
    price: 3200, 
    billingCycle: "quarterly", 
    includedServices: ["Quarterly PMS", "Oil Change", "Filter Replacement"], 
    totalVisits: 4,
    visitsRemaining: 4,
    durationMonths: 12,
    terms: "Visits must be scheduled at least 2 weeks in advance.",
    startDate: lastMonth, 
    endDate: nextYear, 
    status: "active", 
    createdAt: lastMonth 
  },
];

const mockInvoices: Invoice[] = [
  { id: 1, clientId: 1, packageId: null, serviceRecordId: 1, invoiceNumber: "INV-2024-0001", amount: 450.00, tax: 45.00, total: 495.00, status: "paid", dueDate: nextMonth, paidDate: lastMonth, createdAt: lastMonth },
  { id: 2, clientId: 1, packageId: null, serviceRecordId: 2, invoiceNumber: "INV-2024-0002", amount: 1200.00, tax: 120.00, total: 1320.00, status: "paid", dueDate: nextMonth, paidDate: lastMonth, createdAt: lastMonth },
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

      decrementPackageVisits: (clientId, serviceType) => {
        set((state) => ({
          packages: state.packages.map((pkg) => {
            // Check if package belongs to client, is active, and includes the service type
            const matchesService = pkg.includedServices.some(s => 
              s.toLowerCase().includes(serviceType.toLowerCase())
            );
            
            if (pkg.clientId === clientId && pkg.status === "active" && matchesService && pkg.visitsRemaining > 0) {
              return { ...pkg, visitsRemaining: pkg.visitsRemaining - 1 };
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
