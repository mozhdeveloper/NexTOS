import { useState } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import { useBillingStore } from "@/stores/useBillingStore";
import { useOperationsStore } from "@/stores/useOperationsStore";
import { useClientPortalStore } from "@/stores/useClientPortalStore";
import seedData from "@/data/seed-data.json";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  CheckCircle2,
  Clock,
  CreditCard,
  ReceiptText,
  CalendarClock,
  DollarSign, 
  TrendingUp,
  ChevronRight,
  Info,
  FileText,
  Wrench,
  PieChart,
  BarChart3,
} from "lucide-react";
import { BarChart, Bar, ResponsiveContainer, PieChart as RechartsPieChart, Cell, Pie, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

export default function ClientBilling() {
  const { user } = useAuthStore();
  const { invoices, packages, markInvoicePaid } = useBillingStore();
  const { serviceRecords, equipment } = useOperationsStore();
  const { selectedCompanyId } = useClientPortalStore();
  
  // Map seedData company ID to numeric clientId
  const selectedCompanyIndex = seedData.clients.findIndex(c => c.id === selectedCompanyId);
  const clientId = selectedCompanyIndex !== -1 ? selectedCompanyIndex + 1 : (user?.clientId || 1);

  const clientInvoices = invoices.filter((i) => i.clientId === clientId);

  const [selectedInvoice, setSelectedInvoice] = useState<number | null>(null);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [invoiceDetailsOpen, setInvoiceDetailsOpen] = useState(false);
  const [selectedInvoiceDetails, setSelectedInvoiceDetails] = useState<any>(null);

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
            return eq?.name || eq?.serialNumber || "Asset";
        }
    }
    return "—";
  };

  // Computed data for charts and summaries
  const outstandingAmount = clientInvoices.filter((i) => i.status !== "paid").reduce((s, i) => s + i.total, 0);
  const paidAmount = clientInvoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.total, 0);
  const totalInvoices = clientInvoices.length;
  const unpaidInvoices = clientInvoices.filter((i) => i.status !== "paid").length;
  const upcomingDue = clientInvoices.filter(i => i.status !== "paid" && new Date(i.dueDate) <= new Date(Date.now() + 7 * 86400000));

  const chartData = [
    { name: "Paid", value: paidAmount, color: "#10B981" },
    { name: "Outstanding", value: outstandingAmount, color: "#66B2B2" },
  ];

  // Invoice Breakdown by Category
  const invoiceBreakdown = clientInvoices.reduce((acc, invoice) => {
    const category = getInvoiceCategory(invoice);
    if (!acc[category]) acc[category] = 0;
    acc[category] += invoice.total;
    return acc;
  }, {} as Record<string, number>);
  const breakdownData = Object.entries(invoiceBreakdown).map(([name, value]) => ({
    name,
    value,
    color: name.includes("Package") ? "#66B2B2" : name.includes("Service") ? "#10B981" : "#6B7280"
  }));

  // Spending Overview (Monthly)
  const monthlySpending = clientInvoices.reduce((acc, invoice) => {
    const month = new Date(invoice.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
    if (!acc[month]) acc[month] = 0;
    acc[month] += invoice.total;
    return acc;
  }, {} as Record<string, number>);
  const spendingOverviewData = Object.entries(monthlySpending).map(([month, amount]) => ({
    month,
    amount
  })).sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());

  // Service Summary
  const serviceSummary = clientInvoices.reduce((acc, invoice) => {
    const category = getInvoiceCategory(invoice);
    if (!acc[category]) acc[category] = { count: 0, total: 0 };
    acc[category].count += 1;
    acc[category].total += invoice.total;
    return acc;
  }, {} as Record<string, { count: number; total: number }>);

  // Spending Category (Pie Chart)
  const spendingCategoryData = Object.entries(invoiceBreakdown).map(([name, value], index) => ({
    name,
    value,
    color: ["#66B2B2", "#10B981", "#EF4444", "#6B7280"][index % 4]
  }));

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

  const handleViewInvoiceDetails = (invoice: any) => {
    setSelectedInvoiceDetails(invoice);
    setInvoiceDetailsOpen(true);
  };

  return (
    <div className="space-y-6 px-8 pt-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-[32px] font-bold text-gray-900 tracking-[-0.02em]">Billing & Invoices</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your invoices, payments and billing history</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button className="bg-gray-100 border border-gray-200 text-gray-900 hover:bg-gray-100 px-4 py-2 text-xs font-semibold">
            <Info className="w-4 h-4 mr-2" /> Billing FAQ
          </Button>
          <Button className="bg-[#66B2B2] text-white px-4 py-2 text-xs font-semibold hover:bg-[#5A9E9E]">
            <FileText className="w-4 h-4 mr-2" /> Download Statements
          </Button>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[repeat(5,_minmax(0,1fr))]">
        <div className="data-card p-4 lg:col-span-1">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <CreditCard className="w-3 h-3" /> Outstanding
          </div>
          <div className="text-3xl font-bold text-[#66B2B2] kpi-glow">₱{outstandingAmount.toFixed(2)}</div>
          <div className="text-[10px] text-gray-500 mt-2">{unpaidInvoices} unpaid invoices</div>
        </div>
        <div className="data-card p-4 lg:col-span-1">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <ReceiptText className="w-3 h-3" /> Total Invoices
          </div>
          <div className="text-3xl font-bold text-gray-900">{totalInvoices}</div>
          <div className="text-[10px] text-gray-500 mt-2">All time</div>
        </div>
        <div className="data-card p-4 lg:col-span-1">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <TrendingUp className="w-3 h-3" /> Paid Amount
          </div>
          <div className="text-3xl font-bold text-[#10B981]">₱{paidAmount.toFixed(2)}</div>
          <div className="text-[10px] text-gray-500 mt-2">Total paid</div>
        </div>
        <div className="data-card p-4 lg:col-span-1">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <CalendarClock className="w-3 h-3" /> Due Soon
          </div>
          <div className="text-3xl font-bold text-gray-900">{upcomingDue.length}</div>
          <div className="text-[10px] text-gray-500 mt-2">Within 7 days</div>
        </div>
        <div className="data-card p-4 lg:col-span-1">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <DollarSign className="w-3 h-3" /> Avg Invoice
          </div>
          <div className="text-3xl font-bold text-gray-900">₱{totalInvoices > 0 ? (clientInvoices.reduce((s, i) => s + i.total, 0) / totalInvoices).toFixed(2) : "0.00"}</div>
          <div className="text-[10px] text-gray-500 mt-2">Per invoice</div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          <div className="data-card overflow-hidden">
            <div className="flex flex-col gap-3 border-b border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Invoice History</h3>
                <p className="text-[10px] text-gray-500 mt-1">Complete overview of all your invoices and payments</p>
              </div>
              <Button className="inline-flex items-center gap-2 text-[10px] font-semibold bg-gray-100 border border-gray-200 text-gray-900 hover:bg-gray-100 px-4 py-2">
                View all invoices <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <div className="overflow-auto">
              <table className="min-w-full text-left text-[11px]">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-3 px-3 text-gray-500 font-medium">Invoice #</th>
                    <th className="py-3 px-3 text-gray-500 font-medium">Service / Item</th>
                    <th className="py-3 px-3 text-gray-500 font-medium">Asset</th>
                    <th className="py-3 px-3 text-gray-500 font-medium">Total</th>
                    <th className="py-3 px-3 text-gray-500 font-medium">Due Date</th>
                    <th className="py-3 px-3 text-gray-500 font-medium">Status</th>
                    <th className="py-3 px-3 text-gray-500 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {clientInvoices.map((invoice) => (
                    <tr key={invoice.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="py-4 px-3 align-top">
                        <div className="font-semibold text-gray-900 text-sm">{invoice.invoiceNumber}</div>
                        <div className="text-[10px] text-gray-500">{new Date(invoice.createdAt).toLocaleDateString()}</div>
                      </td>
                      <td className="py-4 px-3 align-top text-gray-900">
                        <div className="font-semibold">{getInvoiceCategory(invoice)}</div>
                        <div className="text-[10px] text-gray-500">Created {new Date(invoice.createdAt).toLocaleDateString()}</div>
                      </td>
                      <td className="py-4 px-3 align-top text-gray-500 font-mono-tech">{getInvoiceAsset(invoice)}</td>
                      <td className="py-4 px-3 align-top">
                        <div className="text-[#66B2B2] font-bold text-sm">₱{invoice.total.toFixed(2)}</div>
                        <div className="text-[10px] text-gray-500">Tax: ₱{invoice.tax.toFixed(2)}</div>
                      </td>
                      <td className="py-4 px-3 align-top text-gray-900">
                        <div className="font-semibold">{new Date(invoice.dueDate).toLocaleDateString()}</div>
                        <div className="text-[10px] text-gray-500">Due in {Math.ceil((new Date(invoice.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days</div>
                      </td>
                      <td className="py-4 px-3 align-top">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                            invoice.status === "paid"
                              ? "bg-[#10B981]/20 text-[#10B981]"
                              : invoice.status === "overdue"
                              ? "bg-[#EF4444]/20 text-[#EF4444]"
                              : "bg-[#66B2B2]/20 text-[#66B2B2]"
                          }`}
                        >
                          {invoice.status}
                        </span>
                      </td>
                      <td className="py-4 px-3 align-top">
                        {invoice.status !== "paid" ? (
                          <div className="flex flex-col gap-1">
                            <Button
                              size="sm"
                              onClick={() => handlePayment(invoice.id)}
                              disabled={paymentProcessing && selectedInvoice === invoice.id}
                              className="bg-[#66B2B2] text-white text-[10px] font-semibold px-3 py-2 hover:bg-[#5A9E9E]"
                            >
                              {paymentProcessing && selectedInvoice === invoice.id ? (
                                <Clock className="w-3 h-3 animate-spin" />
                              ) : (
                                <>
                                  <CreditCard className="w-3 h-3 mr-1" />
                                  Pay Now
                                </>
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewInvoiceDetails(invoice)}
                              className="text-[10px] border-gray-200 text-gray-900 hover:bg-gray-50"
                            >
                              View Details
                            </Button>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5 text-[#10B981] font-bold">
                              <CheckCircle2 className="w-4 h-4" />
                              <span className="text-[10px]">PAID</span>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewInvoiceDetails(invoice)}
                              className="text-[10px] border-gray-200 text-gray-900 hover:bg-gray-50"
                            >
                              View Details
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="data-card p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Invoice Breakdown</h3>
                <p className="text-[10px] text-gray-500 mt-1">Spending by invoice category</p>
              </div>
              <PieChart className="w-4 h-4 text-gray-500" />
            </div>
            <div className="flex items-center gap-4">
              <div className="w-24 h-24">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie data={breakdownData} dataKey="value" cx="50%" cy="50%" outerRadius={40}>
                      {breakdownData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-2">
                {breakdownData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-[10px] text-gray-900">
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      {item.name}
                    </span>
                    <span>₱{item.value.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="data-card p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Spending Overview</h3>
                <p className="text-[10px] text-gray-500 mt-1">Monthly spending trends</p>
              </div>
              <BarChart3 className="w-4 h-4 text-gray-500" />
            </div>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={spendingOverviewData}>
                  <Line type="monotone" dataKey="amount" stroke="#66B2B2" strokeWidth={2} />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#6B7280' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#6B7280' }} />
                  <CartesianGrid stroke="#E5E7EB" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '4px' }}
                    labelStyle={{ color: '#F3F4F6' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="data-card p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Payment Summary</h3>
                <p className="text-[10px] text-gray-500 mt-1">Paid vs outstanding amounts</p>
              </div>
              <div className="w-24 h-24">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <Bar dataKey="value" fill="#66B2B2" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="space-y-2 mt-4">
              {chartData.map((segment) => (
                <div key={segment.name} className="flex items-center justify-between text-[10px] text-gray-900">
                  <span className="inline-flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: segment.color }} />
                    {segment.name}
                  </span>
                  <span>₱{segment.value.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="data-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">Upcoming Due Dates</h3>
              <span className="text-[10px] text-[#66B2B2]">{upcomingDue.length} due</span>
            </div>
            <div className="space-y-3">
              {upcomingDue.length > 0 ? (
                upcomingDue.map((invoice) => (
                  <div key={invoice.id} className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-semibold text-gray-900">{invoice.invoiceNumber}</div>
                        <div className="text-[10px] text-gray-500">{getInvoiceCategory(invoice)}</div>
                      </div>
                      <div className="text-[10px] text-[#66B2B2] font-semibold">₱{invoice.total.toFixed(2)}</div>
                    </div>
                    <div className="text-[10px] text-gray-500 mt-2">Due {new Date(invoice.dueDate).toLocaleDateString()}</div>
                  </div>
                ))
              ) : (
                <div className="text-[10px] text-gray-500">No invoices due in the next 7 days.</div>
              )}
            </div>
          </div>

          <div className="data-card p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Need Help with Billing?</h3>
                <p className="text-[10px] text-gray-500 mt-1">Contact support for billing questions or disputes.</p>
              </div>
            </div>
            <Button className="w-full rounded-md bg-gray-100 border border-gray-200 text-gray-900 text-[10px] font-semibold py-2 hover:bg-gray-100">
              Contact Support
            </Button>
          </div>

          <div className="data-card p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">How Billing Works</h3>
            <div className="space-y-3 text-[10px] text-gray-500">
              <div className="flex items-start gap-3">
                <div className="mt-1 h-6 w-6 rounded-full bg-[#66B2B2]/20 text-[#66B2B2] flex items-center justify-center">1</div>
                <div>
                  <div className="font-semibold text-gray-900">Services Completed</div>
                  Invoices are generated when services are completed or packages are purchased.
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-1 h-6 w-6 rounded-full bg-[#66B2B2]/20 text-[#66B2B2] flex items-center justify-center">2</div>
                <div>
                  <div className="font-semibold text-gray-900">Invoice Sent</div>
                  You'll receive an email notification with payment details and due date.
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-1 h-6 w-6 rounded-full bg-[#66B2B2]/20 text-[#66B2B2] flex items-center justify-center">3</div>
                <div>
                  <div className="font-semibold text-gray-900">Payment Options</div>
                  Pay online securely or contact us for alternative payment methods.
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-1 h-6 w-6 rounded-full bg-[#66B2B2]/20 text-[#66B2B2] flex items-center justify-center">4</div>
                <div>
                  <div className="font-semibold text-gray-900">Confirmation</div>
                  Receive instant confirmation and updated billing history.
                </div>
              </div>
            </div>
          </div>

          <div className="data-card p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Service Summary</h3>
                <p className="text-[10px] text-gray-500 mt-1">Overview of services performed</p>
              </div>
              <Wrench className="w-4 h-4 text-gray-500" />
            </div>
            <div className="space-y-3">
              {Object.entries(serviceSummary).map(([category, data]) => (
                <div key={category} className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{category}</div>
                    <div className="text-[10px] text-gray-500">{data.count} invoices</div>
                  </div>
                  <div className="text-[#66B2B2] font-bold">₱{data.total.toFixed(2)}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="data-card p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Spending by Category</h3>
                <p className="text-[10px] text-gray-500 mt-1">Breakdown of total spending</p>
              </div>
              <PieChart className="w-4 h-4 text-gray-500" />
            </div>
            <div className="space-y-2">
              {spendingCategoryData.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-[10px] text-gray-900">
                  <span className="inline-flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    {item.name}
                  </span>
                  <span>₱{item.value.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Dialog open={invoiceDetailsOpen} onOpenChange={setInvoiceDetailsOpen}>
        <DialogContent className="bg-gray-50 border border-gray-200 text-gray-900">
          <DialogHeader>
            <DialogTitle>Invoice Details - {selectedInvoiceDetails?.invoiceNumber}</DialogTitle>
          </DialogHeader>
          {selectedInvoiceDetails && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-semibold">Invoice Information</h4>
                  <p className="text-[10px] text-gray-500">Created: {new Date(selectedInvoiceDetails.createdAt).toLocaleDateString()}</p>
                  <p className="text-[10px] text-gray-500">Due: {new Date(selectedInvoiceDetails.dueDate).toLocaleDateString()}</p>
                  <p className="text-[10px] text-gray-500">Status: {selectedInvoiceDetails.status}</p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold">Amounts</h4>
                  <p className="text-[10px] text-gray-500">Subtotal: ₱{selectedInvoiceDetails.subtotal?.toFixed(2) || selectedInvoiceDetails.total.toFixed(2)}</p>
                  <p className="text-[10px] text-gray-500">Tax: ₱{selectedInvoiceDetails.tax.toFixed(2)}</p>
                  <p className="text-[#66B2B2] font-bold">Total: ₱{selectedInvoiceDetails.total.toFixed(2)}</p>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold">Service Details</h4>
                <p className="text-[10px] text-gray-500">Category: {getInvoiceCategory(selectedInvoiceDetails)}</p>
                <p className="text-[10px] text-gray-500">Asset: {getInvoiceAsset(selectedInvoiceDetails)}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {paymentSuccess && (
        <div className="fixed bottom-4 right-4 px-4 py-3 rounded bg-[#10B981]/20 border border-[#10B981]/30 flex items-center gap-2 z-50">
          <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
          <span className="text-sm text-[#10B981] font-medium">Payment successful!</span>
        </div>
      )}
    </div>
  );
}
