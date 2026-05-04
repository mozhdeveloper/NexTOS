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
  getClientInvoices: (clientId: number) => Invoice[];
  getClientPackages: (clientId: number) => Package[];
  getTotalRevenue: () => number;
  getOutstandingRevenue: () => number;
}

const lastMonth = new Date(Date.now() - 30 * 86400000).toISOString();
const nextMonth = new Date(Date.now() + 30 * 86400000).toISOString();

const mockPackages: Package[] = [
  { id: 1, clientId: 1, name: "Enterprise Security", tier: "enterprise", price: 4500, billingCycle: "monthly", includedServices: ["24/7 Monitoring", "Quarterly PMS", "Priority Support", "Fleet Tracking"], startDate: lastMonth, endDate: nextMonth, status: "active", createdAt: lastMonth },
  { id: 2, clientId: 2, name: "Professional Suite", tier: "professional", price: 2800, billingCycle: "monthly", includedServices: ["Business Hours Monitoring", "Bi-annual PMS", "Standard Support"], startDate: lastMonth, endDate: nextMonth, status: "active", createdAt: lastMonth },
  { id: 3, clientId: 5, name: "Enterprise Security", tier: "enterprise", price: 5500, billingCycle: "monthly", includedServices: ["24/7 Monitoring", "Monthly PMS", "Dedicated Account Manager", "Global Fleet Tracking"], startDate: lastMonth, endDate: nextMonth, status: "active", createdAt: lastMonth },
  { id: 4, clientId: 4, name: "Fleet Pro", tier: "professional", price: 3200, billingCycle: "monthly", includedServices: ["Real-time GPS Tracking", "Monthly PMS", "Route Optimization"], startDate: lastMonth, endDate: nextMonth, status: "active", createdAt: lastMonth },
  { id: 5, clientId: 8, name: "Basic Security", tier: "basic", price: 1800, billingCycle: "monthly", includedServices: ["Business Hours Monitoring", "Annual PMS", "Email Support"], startDate: lastMonth, endDate: nextMonth, status: "active", createdAt: lastMonth },
];

const mockInvoices: Invoice[] = [
  { id: 1, clientId: 1, packageId: null, serviceRecordId: 1, invoiceNumber: "INV-2024-0001", amount: 450.00, tax: 45.00, total: 495.00, status: "paid", dueDate: nextMonth, paidDate: lastMonth, createdAt: lastMonth },
  { id: 2, clientId: 1, packageId: null, serviceRecordId: 2, invoiceNumber: "INV-2024-0002", amount: 1200.00, tax: 120.00, total: 1320.00, status: "paid", dueDate: nextMonth, paidDate: lastMonth, createdAt: lastMonth },
  { id: 3, clientId: 2, packageId: null, serviceRecordId: 3, invoiceNumber: "INV-2024-0003", amount: 320.00, tax: 32.00, total: 352.00, status: "sent", dueDate: nextMonth, paidDate: null, createdAt: lastMonth },
  { id: 4, clientId: 4, packageId: null, serviceRecordId: 4, invoiceNumber: "INV-2024-0004", amount: 680.00, tax: 68.00, total: 748.00, status: "sent", dueDate: nextMonth, paidDate: null, createdAt: lastMonth },
  { id: 5, clientId: 5, packageId: null, serviceRecordId: 5, invoiceNumber: "INV-2024-0005", amount: 250.00, tax: 25.00, total: 275.00, status: "paid", dueDate: nextMonth, paidDate: lastMonth, createdAt: lastMonth },
  { id: 6, clientId: 5, packageId: null, serviceRecordId: 7, invoiceNumber: "INV-2024-0006", amount: 180.00, tax: 18.00, total: 198.00, status: "sent", dueDate: nextMonth, paidDate: null, createdAt: lastMonth },
  { id: 7, clientId: 2, packageId: null, serviceRecordId: 8, invoiceNumber: "INV-2024-0007", amount: 950.00, tax: 95.00, total: 1045.00, status: "paid", dueDate: nextMonth, paidDate: lastMonth, createdAt: lastMonth },
  { id: 8, clientId: 4, packageId: null, serviceRecordId: 9, invoiceNumber: "INV-2024-0008", amount: 290.00, tax: 29.00, total: 319.00, status: "sent", dueDate: nextMonth, paidDate: null, createdAt: lastMonth },
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
