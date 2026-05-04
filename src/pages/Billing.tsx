import { useCRMStore } from "@/stores/useCRMStore";
import { useBillingStore } from "@/stores/useBillingStore";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CreditCard,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Billing() {
  const { user } = useAuthStore();
  const { clients } = useCRMStore();
  const { invoices, packages, markInvoicePaid } = useBillingStore();

  const isClient = user?.role === "client";
  const clientId = user?.clientId;

  const filteredInvoices = isClient
    ? invoices.filter((i) => i.clientId === clientId)
    : invoices;
  const filteredPackages = isClient
    ? packages.filter((p) => p.clientId === clientId)
    : packages;

  const totalRevenue = invoices
    .filter((i) => i.status === "paid")
    .reduce((sum, i) => sum + i.total, 0);
  const outstandingRevenue = invoices
    .filter((i) => i.status === "sent" || i.status === "overdue")
    .reduce((sum, i) => sum + i.total, 0);
  const overdueCount = invoices.filter((i) => i.status === "overdue").length;

  const monthlyData = [
    { month: "Jan", revenue: 12500, expenses: 8200 },
    { month: "Feb", revenue: 15200, expenses: 9100 },
    { month: "Mar", revenue: 11800, expenses: 7800 },
    { month: "Apr", revenue: 18900, expenses: 10200 },
    { month: "May", revenue: 21400, expenses: 11500 },
    { month: "Jun", revenue: 24300, expenses: 12800 },
  ];

  const statusData = [
    { name: "Paid", value: invoices.filter((i) => i.status === "paid").length, color: "#10B981" },
    { name: "Outstanding", value: invoices.filter((i) => i.status === "sent").length, color: "#F2A900" },
    { name: "Overdue", value: invoices.filter((i) => i.status === "overdue").length, color: "#EF4444" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[32px] font-bold text-[#EAEAEA] tracking-[-0.02em]">Billing</h1>
          <p className="text-sm text-[#88888C] mt-0.5">Invoices, packages &amp; revenue analytics</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="data-card p-4 laser-scan">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-[#88888C] uppercase tracking-wider">Total Revenue</span>
            <DollarSign className="w-4 h-4 text-[#88888C]" />
          </div>
          <div className="text-4xl font-bold text-[#EAEAEA] kpi-glow">${(totalRevenue / 1000).toFixed(1)}k</div>
          <div className="flex items-center gap-1 mt-1">
            <TrendingUp className="w-3 h-3 text-[#10B981]" />
            <span className="text-xs text-[#10B981] font-medium">+12% vs last month</span>
          </div>
        </div>
        <div className="data-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-[#88888C] uppercase tracking-wider">Outstanding</span>
            <Clock className="w-4 h-4 text-[#F2A900]" />
          </div>
          <div className="text-4xl font-bold text-[#F2A900]">${(outstandingRevenue / 1000).toFixed(1)}k</div>
          <div className="text-xs text-[#88888C] mt-1">{filteredInvoices.filter((i) => i.status === "sent").length} pending invoices</div>
        </div>
        <div className="data-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-[#88888C] uppercase tracking-wider">Overdue</span>
            <AlertTriangle className="w-4 h-4 text-[#EF4444]" />
          </div>
          <div className="text-4xl font-bold text-[#EF4444]">{overdueCount}</div>
          <div className="text-xs text-[#EF4444] mt-1">Requires immediate action</div>
        </div>
        <div className="data-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-[#88888C] uppercase tracking-wider">Active Packages</span>
            <CreditCard className="w-4 h-4 text-[#88888C]" />
          </div>
          <div className="text-4xl font-bold text-[#EAEAEA]">{filteredPackages.length}</div>
          <div className="text-xs text-[#88888C] mt-1">Monthly recurring</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2 data-card p-4">
          <h3 className="text-base font-semibold text-[#EAEAEA] mb-1">Revenue vs Expenses</h3>
          <p className="text-xs text-[#88888C] mb-3">Monthly financial overview</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A2A30" />
              <XAxis dataKey="month" stroke="#88888C" fontSize={11} />
              <YAxis stroke="#88888C" fontSize={11} />
              <Tooltip
                contentStyle={{ background: "#1E1E22", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 4, fontSize: 12 }}
              />
              <Bar dataKey="revenue" fill="#F2A900" radius={[2, 2, 0, 0]} />
              <Bar dataKey="expenses" fill="#2A2A30" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="data-card p-4">
          <h3 className="text-base font-semibold text-[#EAEAEA] mb-1">Invoice Status</h3>
          <p className="text-xs text-[#88888C] mb-3">Payment distribution</p>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={statusData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: "#1E1E22", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 4, fontSize: 12 }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-3 mt-2">
            {statusData.map((d) => (
              <div key={d.name} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                <span className="text-[10px] text-[#88888C]">{d.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="data-card overflow-auto">
        <div className="p-3 border-b border-white/5 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#EAEAEA]">All Invoices</h3>
          <span className="text-[10px] text-[#88888C]">{filteredInvoices.length} records</span>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-[#0A0A0C]">
              <th className="text-left py-2.5 px-3 text-[#88888C] font-medium">Invoice #</th>
              <th className="text-left py-2.5 px-3 text-[#88888C] font-medium">Client</th>
              <th className="text-left py-2.5 px-3 text-[#88888C] font-medium">Amount</th>
              <th className="text-left py-2.5 px-3 text-[#88888C] font-medium">Tax</th>
              <th className="text-left py-2.5 px-3 text-[#88888C] font-medium">Total</th>
              <th className="text-left py-2.5 px-3 text-[#88888C] font-medium">Status</th>
              <th className="text-left py-2.5 px-3 text-[#88888C] font-medium">Due Date</th>
              <th className="text-left py-2.5 px-3 text-[#88888C] font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredInvoices.map((invoice) => {
              const client = clients.find((c) => c.id === invoice.clientId);
              return (
                <tr key={invoice.id} className="grid-table-row border-b border-[#2A2A30]">
                  <td className="py-2.5 px-3 text-[#EAEAEA] font-mono-tech">{invoice.invoiceNumber}</td>
                  <td className="py-2.5 px-3 text-[#EAEAEA]">{client?.companyName || "—"}</td>
                  <td className="py-2.5 px-3 text-[#88888C] font-mono-tech">${invoice.amount.toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-[#88888C] font-mono-tech">${invoice.tax.toFixed(2)}</td>
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
                  <td className="py-2.5 px-3 text-[#88888C] font-mono-tech">
                    {new Date(invoice.dueDate).toLocaleDateString()}
                  </td>
                  <td className="py-2.5 px-3">
                    {invoice.status !== "paid" ? (
                      <Button
                        size="sm"
                        onClick={() => markInvoicePaid(invoice.id)}
                        className="h-6 text-[10px] bg-[#F2A900] hover:bg-[#F2A900]/80 text-[#050505] font-semibold px-3"
                      >
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Mark Paid
                      </Button>
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
