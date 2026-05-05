import { useState } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import { useBillingStore } from "@/stores/useBillingStore";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, CreditCard } from "lucide-react";

export default function ClientBilling() {
  const { user } = useAuthStore();
  const { invoices, packages, markInvoicePaid } = useBillingStore();
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
          <div className="text-[10px] text-[#88888C] uppercase tracking-wider mb-1">Outstanding</div>
          <div className="text-3xl font-bold text-[#F2A900] kpi-glow">${clientInvoices.filter((i) => i.status !== "paid").reduce((s, i) => s + i.total, 0).toFixed(2)}</div>
          <div className="text-[10px] text-[#88888C] mt-1">{clientInvoices.filter((i) => i.status !== "paid").length} unpaid</div>
        </div>
        <div className="data-card p-4">
          <div className="text-[10px] text-[#88888C] uppercase tracking-wider mb-1">Active Packages</div>
          <div className="text-3xl font-bold text-[#EAEAEA]">{clientPackages.length}</div>
          <div className="text-[10px] text-[#88888C] mt-1">Packages on account</div>
        </div>
        <div className="data-card p-4">
          <div className="text-[10px] text-[#88888C] uppercase tracking-wider mb-1">Recent Activity</div>
          <div className="text-3xl font-bold text-[#EAEAEA]">{clientInvoices.slice(-3).length}</div>
          <div className="text-[10px] text-[#88888C] mt-1">Last invoices</div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="data-card overflow-auto">
          <div className="p-3 border-b border-white/5">
            <h3 className="text-sm font-semibold text-[#EAEAEA]">Invoices</h3>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[#0A0A0C]">
                <th className="text-left py-2.5 px-3 text-[#88888C] font-medium">Invoice #</th>
                <th className="text-left py-2.5 px-3 text-[#88888C] font-medium">Amount</th>
                <th className="text-left py-2.5 px-3 text-[#88888C] font-medium">Status</th>
                <th className="text-left py-2.5 px-3 text-[#88888C] font-medium">Due Date</th>
                <th className="text-left py-2.5 px-3 text-[#88888C] font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {clientInvoices.map((invoice) => (
                <tr key={invoice.id} className="grid-table-row border-b border-[#2A2A30]">
                  <td className="py-2.5 px-3 text-[#EAEAEA] font-mono-tech">{invoice.invoiceNumber}</td>
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
                  <td className="py-2.5 px-3 text-[#88888C] font-mono-tech">{new Date(invoice.dueDate).toLocaleDateString()}</td>
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
                      <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {paymentSuccess && (
        <div className="fixed bottom-4 right-4 px-4 py-3 rounded bg-[#10B981]/20 border border-[#10B981]/30 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
          <span className="text-sm text-[#10B981] font-medium">Payment successful!</span>
        </div>
      )}
    </div>
  );
}
