import { useCRMStore } from "@/stores/useCRMStore";
import { useBillingStore } from "@/stores/useBillingStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { useState } from "react";
import type { PackageTier, Package } from "@/types";
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
  Plus,
  Package as PackageIcon,
  X,
  Calendar,
  Layers,
  Wrench,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export default function Billing() {
  const { user } = useAuthStore();
  const { clients } = useCRMStore();
  const { invoices, packages, markInvoicePaid, addPackage } = useBillingStore();

  const [activeTab, setActiveTab] = useState<"dashboard" | "packages">("dashboard");
  const [showCreator, setShowCreator] = useState(false);

  // Form State
  const [pkgName, setPkgName] = useState("");
  const [pkgDesc, setPkgDesc] = useState("");
  const [pkgPrice, setPkgPrice] = useState("");
  const [pkgTier, setPkgTier] = useState<PackageTier>("professional");
  const [pkgCycle, setPkgCycle] = useState<"monthly" | "quarterly" | "annual">("monthly");
  const [pkgVisits, setPkgVisits] = useState("");
  const [pkgDuration, setPkgDuration] = useState("12");
  const [pkgTerms, setPkgTerms] = useState("");
  const [pkgServices, setPkgServices] = useState("");
  const [targetClientId, setTargetClientId] = useState(clients[0]?.id.toString() || "");

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

  const handleSubmitPackage = () => {
    const totalVisits = parseInt(pkgVisits) || 0;
    const duration = parseInt(pkgDuration) || 12;
    const price = parseFloat(pkgPrice) || 0;

    addPackage({
      clientId: parseInt(targetClientId),
      name: pkgName,
      description: pkgDesc,
      tier: pkgTier,
      price,
      billingCycle: pkgCycle,
      includedServices: pkgServices.split(",").map(s => s.trim()),
      totalVisits,
      visitsRemaining: totalVisits,
      durationMonths: duration,
      terms: pkgTerms,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + duration * 30 * 86400000).toISOString(),
      status: "active",
    });

    setShowCreator(false);
    setPkgName("");
    setPkgDesc("");
    setPkgPrice("");
    setPkgVisits("");
    setPkgTerms("");
    setPkgServices("");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[32px] font-bold text-[#EAEAEA] tracking-[-0.02em]">Billing</h1>
          <p className="text-sm text-[#88888C] mt-0.5">Invoices, packages &amp; revenue analytics</p>
        </div>
        {!isClient && (
          <Button onClick={() => setShowCreator(true)} className="bg-[#F2A900] text-[#050505] font-bold h-9">
            <Plus className="w-4 h-4 mr-2" />
            Create Package
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/5">
        <button
          onClick={() => setActiveTab("dashboard")}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-all border-b-2 ${
            activeTab === "dashboard"
              ? "border-[#F2A900] text-[#F2A900] bg-[#F2A900]/5"
              : "border-transparent text-[#88888C] hover:text-[#EAEAEA]"
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          Dashboard
        </button>
        <button
          onClick={() => setActiveTab("packages")}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-all border-b-2 ${
            activeTab === "packages"
              ? "border-[#F2A900] text-[#F2A900] bg-[#F2A900]/5"
              : "border-transparent text-[#88888C] hover:text-[#EAEAEA]"
          }`}
        >
          <PackageIcon className="w-3.5 h-3.5" />
          Active Packages
        </button>
      </div>

      {activeTab === "dashboard" ? (
        <>
          {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="data-card p-4 laser-scan">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-[#88888C] uppercase tracking-wider">Total Revenue</span>
            <DollarSign className="w-4 h-4 text-[#88888C]" />
          </div>
          <div className="text-4xl font-bold text-[#EAEAEA] kpi-glow">₱{(totalRevenue / 1000).toFixed(1)}k</div>
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
          <div className="text-4xl font-bold text-[#F2A900]">₱{(outstandingRevenue / 1000).toFixed(1)}k</div>
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
                  <td className="py-2.5 px-3 text-[#88888C] font-mono-tech">₱{invoice.amount.toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-[#88888C] font-mono-tech">₱{invoice.tax.toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-[#F2A900] font-mono-tech font-bold">₱{invoice.total.toFixed(2)}</td>
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
        </>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPackages.map((pkg) => {
            const client = clients.find(c => c.id === pkg.clientId);
            return (
              <div key={pkg.id} className="data-card p-5 border-t-4 border-[#F2A900] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] bg-[#F2A900]/10 text-[#F2A900] px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                      {pkg.tier}
                    </span>
                    <span className="text-[10px] text-[#88888C] font-mono-tech">ID: {pkg.id}</span>
                  </div>
                  <h4 className="text-lg font-bold text-[#EAEAEA] mb-1">{pkg.name}</h4>
                  <p className="text-xs text-[#88888C] line-clamp-2 mb-4">{pkg.description}</p>
                  
                  <div className="space-y-2.5 mb-6">
                    <div className="flex items-center gap-2 text-xs text-[#EAEAEA]">
                      <PackageIcon className="w-3.5 h-3.5 text-[#88888C]" />
                      <span>{client?.companyName || "Unknown Client"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[#EAEAEA]">
                      <Wrench className="w-3.5 h-3.5 text-[#88888C]" />
                      <span>{pkg.visitsRemaining} / {pkg.totalVisits} Visits Remaining</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[#EAEAEA]">
                      <Calendar className="w-3.5 h-3.5 text-[#88888C]" />
                      <span>Valid until {new Date(pkg.endDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-[#88888C] uppercase">Monthly Price</div>
                    <div className="text-xl font-bold text-[#F2A900] font-mono-tech">₱{pkg.price.toLocaleString()}</div>
                  </div>
                  <Button variant="ghost" size="sm" className="text-[#88888C] hover:text-[#EAEAEA]">
                    Details <ChevronRight className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Package Creator Modal */}
      {showCreator && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCreator(false)} />
          <div className="relative z-10 w-full max-w-2xl bg-[#0A0A0C] border border-white/10 rounded-lg shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded bg-[#F2A900]/10 flex items-center justify-center">
                    <PackageIcon className="w-6 h-6 text-[#F2A900]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#EAEAEA]">Create Service Package</h3>
                    <p className="text-xs text-[#88888C]">Define a new maintenance or subscription plan</p>
                  </div>
                </div>
                <button onClick={() => setShowCreator(false)} className="text-[#88888C] hover:text-[#EAEAEA]">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] text-[#88888C] uppercase font-bold mb-1.5 block">Package Name</label>
                    <Input value={pkgName} onChange={(e) => setPkgName(e.target.value)} placeholder="e.g. Annual Calibration" className="bg-[#1A1A20]" />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#88888C] uppercase font-bold mb-1.5 block">Description</label>
                    <Textarea value={pkgDesc} onChange={(e) => setPkgDesc(e.target.value)} placeholder="What's included in this plan?" className="bg-[#1A1A20] h-20 resize-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] text-[#88888C] uppercase font-bold mb-1.5 block">Price ($)</label>
                      <Input value={pkgPrice} onChange={(e) => setPkgPrice(e.target.value)} type="number" placeholder="0.00" className="bg-[#1A1A20]" />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#88888C] uppercase font-bold mb-1.5 block">Tier</label>
                      <Select value={pkgTier} onValueChange={(v) => setPkgTier(v as any)}>
                        <SelectTrigger className="bg-[#1A1A20]"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-[#1A1A20] border-white/10">
                          <SelectItem value="basic">Basic</SelectItem>
                          <SelectItem value="professional">Professional</SelectItem>
                          <SelectItem value="enterprise">Enterprise</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] text-[#88888C] uppercase font-bold mb-1.5 block">Target Client</label>
                    <Select value={targetClientId} onValueChange={setTargetClientId}>
                      <SelectTrigger className="bg-[#1A1A20]"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-[#1A1A20] border-white/10">
                        {clients.map(c => (
                          <SelectItem key={c.id} value={c.id.toString()}>{c.companyName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] text-[#88888C] uppercase font-bold mb-1.5 block">Max Visits</label>
                      <Input value={pkgVisits} onChange={(e) => setPkgVisits(e.target.value)} type="number" placeholder="4" className="bg-[#1A1A20]" />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#88888C] uppercase font-bold mb-1.5 block">Duration (Mo)</label>
                      <Input value={pkgDuration} onChange={(e) => setPkgDuration(e.target.value)} type="number" placeholder="12" className="bg-[#1A1A20]" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-[#88888C] uppercase font-bold mb-1.5 block">Included Services (Comma separated)</label>
                    <Input value={pkgServices} onChange={(e) => setPkgServices(e.target.value)} placeholder="PMS, Calibration, Tech Support" className="bg-[#1A1A20]" />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-[#88888C] uppercase font-bold mb-1.5 block">Terms & Conditions</label>
                <Textarea value={pkgTerms} onChange={(e) => setPkgTerms(e.target.value)} placeholder="Legal terms or SLA details..." className="bg-[#1A1A20] h-16 resize-none" />
              </div>

              <div className="flex gap-3 pt-4 border-t border-white/5">
                <Button variant="outline" onClick={() => setShowCreator(false)} className="flex-1">Cancel</Button>
                <Button onClick={handleSubmitPackage} className="flex-1 bg-[#F2A900] text-[#050505] font-bold">Create Package</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
