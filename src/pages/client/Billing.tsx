import { useState } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import { useBillingStore } from "@/stores/useBillingStore";
import { useOperationsStore } from "@/stores/useOperationsStore";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, CreditCard, ReceiptText, CalendarClock } from "lucide-react";

export default function ClientBilling() {
  const { user } = useAuthStore();
  const { invoices, packages, markInvoicePaid } = useBillingStore();
  const { serviceRecords, equipment } = useOperationsStore();
  const clientId = user?.clientId || 1;

  const clientInvoices = invoices.filter((i) => i.clientId === clientId);
  const clientPackages = packages.filter((p) => p.clientId === clientId);

  const [selectedInvoice, setSelectedInvoice] = useState<number | null>(null);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const handlePayment = (invoiceId: number) => {
    setSelectedInvoice(invoiceId);
    setPaymentProcessing(true);
    setTimeout(() => {
      markInvoicePaid(invoiceId);
      setPaymentProcessing(false);
      setPaymentSuccess(true);
      setTimeout(() => {
        setPaymentSuccess(false);
        setSelectedInvoice(null);
      }, 2000);
    }, 2000);
  };

  const getInvoiceCategory = (invoice: any) => {
    if (invoice.packageId) {
        const pkg = packages.find(p => p.id === invoice.packageId);
        return pkg?.packageType || "Package Purchase";
    }
    if (invoice.serviceRecordId) {
        const record = serviceRecords.find(r => r.id === invoice.serviceRecordId);
        return record?.serviceCategory || "Service Fee";
    }
    return "General Billing";
  };

  const getInvoiceAsset = (invoice: any) => {
    if (invoice.serviceRecordId) {
        const record = serviceRecords.find(r => r.id === invoice.serviceRecordId);
        if (record) {
            const eq = equipment.find(e => e.id === record.equipmentId);
            return eq?.unitId || "Asset";
        }
    }
    return "—";
  };

  return (
    <div className="space-y-4 px-8 pt-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[32px] font-bold text-[#EAEAEA] tracking-[-0.02em]">Billing</h1>
          <p className="text-sm text-[#88888C] mt-0.5">Invoices, packages & revenue</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="data-card p-4">
          <div className="text-[10px] text-[#88888C] uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <CreditCard className="w-3 h-3" /> Outstanding
          </div>
          <div className="text-3xl font-bold text-[#F2A900] kpi-glow">${clientInvoices.filter((i) => i.status !== "paid").reduce((s, i) => s + i.total, 0).toFixed(2)}</div>
          <div className="text-[10px] text-[#88888C] mt-1">{clientInvoices.filter((i) => i.status !== "paid").length} unpaid invoices</div>
        </div>
        <div className="data-card p-4">
          <div className="text-[10px] text-[#88888C] uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <ReceiptText className="w-3 h-3" /> Active Packages
          </div>
          <div className="text-3xl font-bold text-[#EAEAEA]">{clientPackages.length}</div>
          <div className="text-[10px] text-[#88888C] mt-1">Managed service bundles</div>
        </div>
        <div className="data-card p-4">
          <div className="text-[10px] text-[#88888C] uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <CalendarClock className="w-3 h-3" /> Recent Activity
          </div>
          <div className="text-3xl font-bold text-[#EAEAEA]">{clientInvoices.filter(i => new Date(i.createdAt) > new Date(Date.now() - 7 * 86400000)).length}</div>
          <div className="text-[10px] text-[#88888C] mt-1">Invoices this week</div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="data-card overflow-auto">
          <div className="p-3 border-b border-white/5">
            <h3 className="text-sm font-semibold text-[#EAEAEA]">Invoice History</h3>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[#0A0A0C]">
                <th className="text-left py-2.5 px-3 text-[#88888C] font-medium">Invoice #</th>
                <th className="text-left py-2.5 px-3 text-[#88888C] font-medium">Service / Item</th>
                <th className="text-left py-2.5 px-3 text-[#88888C] font-medium">Asset</th>
                <th className="text-left py-2.5 px-3 text-[#88888C] font-medium">Total</th>
                <th className="text-left py-2.5 px-3 text-[#88888C] font-medium">Status</th>
                <th className="text-left py-2.5 px-3 text-[#88888C] font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {clientInvoices.map((invoice) => (
                <tr key={invoice.id} className="grid-table-row border-b border-[#2A2A30]">
                  <td className="py-2.5 px-3 text-[#EAEAEA] font-mono-tech">{invoice.invoiceNumber}</td>
                  <td className="py-2.5 px-3">
                    <div className="text-[#EAEAEA] font-bold">{getInvoiceCategory(invoice)}</div>
                    <div className="text-[10px] text-[#88888C]">{new Date(invoice.createdAt).toLocaleDateString()}</div>
                  </td>
                  <td className="py-2.5 px-3 text-[#88888C] font-mono-tech">{getInvoiceAsset(invoice)}</td>
                  <td className="py-2.5 px-3 text-[#F2A900] font-mono-tech font-bold">${invoice.total.toFixed(2)}</td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        invoice.status === "paid"
                          ? "bg-[#10B981]/20 text-[#10B981]"
                          : invoice.status === "overdue"
                          ? "bg-[#EF4444]/20 text-[#EF4444]"
                          : "bg-[#F2A900]/20 text-[#F2A900]"
                      }`}
                    >
                      {invoice.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    {invoice.status !== "paid" ? (
                      <Button
                        size="sm"
                        onClick={() => handlePayment(invoice.id)}
                        disabled={paymentProcessing && selectedInvoice === invoice.id}
                        className="h-6 text-[10px] bg-[#F2A900] hover:bg-[#F2A900]/80 text-[#050505] font-semibold px-3"
                      >
                        {paymentProcessing && selectedInvoice === invoice.id ? (
                          <Clock className="w-3 h-3 animate-spin" />
                        ) : (
                          <>
                            <CreditCard className="w-3 h-3 mr-1" />
                            Pay
                          </>
                        )}
                      </Button>
                    ) : (
                      <div className="flex items-center gap-1.5 text-[#10B981] font-bold">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="text-[10px]">PAID</span>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {paymentSuccess && (
        <div className="fixed bottom-4 right-4 px-4 py-3 rounded bg-[#10B981]/20 border border-[#10B981]/30 flex items-center gap-2 z-50 animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
          <span className="text-sm text-[#10B981] font-medium">Payment successful!</span>
        </div>
      )}
    </div>
  );
}
