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

  // Dynamically calculate monthly data for the chart based on invoices
  const monthlyData = Object.values(
    invoices.reduce((acc, inv) => {
      const date = new Date(inv.createdAt);
      const month = date.toLocaleString('default', { month: 'short' });
      const year = date.getFullYear();
      const key = `${month} ${year}`;
      
      if (!acc[key]) {
        acc[key] = { month, year, revenue: 0, expenses: 0, timestamp: date.getTime() };
      }
      
      if (inv.status === 'paid') {
        acc[key].revenue += inv.total;
      }
      // Mock expenses as 45% of revenue for a healthy margin in the mock data
      acc[key].expenses += (inv.status === 'paid' ? inv.total : inv.total * 0.5) * 0.45;
      
      return acc;
    }, {} as Record<string, { month: string, year: number, revenue: number, expenses: number, timestamp: number }>)
  )
  .sort((a, b) => a.timestamp - b.timestamp)
  .map(({ month, revenue, expenses }) => ({ month, revenue, expenses }))
  .slice(-6);

  const statusData = [
    { name: "Paid", value: invoices.filter((i) => i.status === "paid").length, color: "#10B981" },
    { name: "Outstanding", value: invoices.filter((i) => i.status === "sent" || i.status === "overdue").length, color: "#66B2B2" },
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
          <h1 className="text-[32px] font-bold text-black tracking-[-0.02em]">Billing</h1>
          <p className="text-sm text-gray-600 mt-0.5">Invoices, packages &amp; revenue analytics</p>
        </div>
        {!isClient && (
          <Button onClick={() => setShowCreator(true)} className="bg-[#66B2B2] text-white font-bold h-9">
            <Plus className="w-4 h-4 mr-2" />
            Create Package
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        <button
          onClick={() => setActiveTab("dashboard")}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-all border-b-2 ${
            activeTab === "dashboard"
              ? "border-[#66B2B2] text-[#66B2B2] bg-[#66B2B2]/5"
              : "border-transparent text-gray-600 hover:text-black"
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          Dashboard
        </button>
        <button
          onClick={() => setActiveTab("packages")}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-all border-b-2 ${
            activeTab === "packages"
              ? "border-[#66B2B2] text-[#66B2B2] bg-[#66B2B2]/5"
              : "border-transparent text-gray-600 hover:text-black"
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
            <span className="text-[10px] text-gray-600 uppercase tracking-wider">Total Revenue</span>
            <DollarSign className="w-4 h-4 text-gray-600" />
          </div>
          <div className="text-4xl font-bold text-black kpi-glow">₱{(totalRevenue / 1000).toFixed(1)}k</div>
          <div className="flex items-center gap-1 mt-1">
            <TrendingUp className="w-3 h-3 text-[#10B981]" />
            <span className="text-xs text-[#10B981] font-medium">+12% vs last month</span>
          </div>
        </div>
        <div className="data-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-gray-600 uppercase tracking-wider">Outstanding</span>
            <Clock className="w-4 h-4 text-[#66B2B2]" />
          </div>
          <div className="text-4xl font-bold text-[#66B2B2]">₱{(outstandingRevenue / 1000).toFixed(1)}k</div>
          <div className="text-xs text-gray-600 mt-1">{filteredInvoices.filter((i) => i.status === "sent").length} pending invoices</div>
        </div>
        <div className="data-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-gray-600 uppercase tracking-wider">Overdue</span>
            <AlertTriangle className="w-4 h-4 text-[#EF4444]" />
          </div>
          <div className="text-4xl font-bold text-[#EF4444]">{overdueCount}</div>
          <div className="text-xs text-[#EF4444] mt-1">Requires immediate action</div>
        </div>
        <div className="data-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-gray-600 uppercase tracking-wider">Active Packages</span>
            <CreditCard className="w-4 h-4 text-gray-600" />
          </div>
          <div className="text-4xl font-bold text-black">{filteredPackages.length}</div>
          <div className="text-xs text-gray-600 mt-1">Monthly recurring</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2 data-card p-4">
          <h3 className="text-base font-semibold text-black mb-1">Revenue vs Expenses</h3>
          <p className="text-xs text-gray-600 mb-3">Monthly financial overview</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="month" stroke="#6B7280" fontSize={11} />
              <YAxis stroke="#6B7280" fontSize={11} />
              <Tooltip
                contentStyle={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 4, fontSize: 12 }}
              />
              <Bar dataKey="revenue" fill="#66B2B2" radius={[2, 2, 0, 0]} />
              <Bar dataKey="expenses" fill="#E5E7EB" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="data-card p-4">
          <h3 className="text-base font-semibold text-black mb-1">Invoice Status</h3>
          <p className="text-xs text-gray-600 mb-3">Payment distribution</p>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={statusData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 4, fontSize: 12 }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-3 mt-2">
            {statusData.map((d) => (
              <div key={d.name} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                <span className="text-[10px] text-gray-600">{d.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="data-card overflow-auto">
        <div className="p-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-black">All Invoices</h3>
          <span className="text-[10px] text-gray-600">{filteredInvoices.length} records</span>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left py-2.5 px-3 text-gray-600 font-medium">Invoice #</th>
              <th className="text-left py-2.5 px-3 text-gray-600 font-medium">Company</th>
              <th className="text-left py-2.5 px-3 text-gray-600 font-medium">Service</th>
              <th className="text-left py-2.5 px-3 text-gray-600 font-medium">Total</th>
              <th className="text-left py-2.5 px-3 text-gray-600 font-medium">Status</th>
              <th className="text-left py-2.5 px-3 text-gray-600 font-medium">Date</th>
              <th className="text-left py-2.5 px-3 text-gray-600 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredInvoices.map((invoice) => {
              const client = clients.find((c) => c.id === invoice.clientId);
              return (
                <tr key={invoice.id} className="grid-table-row border-b border-gray-200">
                  <td className="py-2.5 px-3 text-black font-mono-tech">{invoice.invoiceNumber}</td>
                  <td className="py-2.5 px-3">
                    <div className="text-black font-medium">{client?.companyName || "—"}</div>
                    <div className="text-[10px] text-gray-500 font-mono-tech">
                      CL-{invoice.clientId.toString().padStart(3, "0")}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-gray-600">{invoice.service || "—"}</td>
                  <td className="py-2.5 px-3 text-[#66B2B2] font-mono-tech font-bold">₱{invoice.total.toFixed(2)}</td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        invoice.status === "paid"
                          ? "bg-[#10B981]/20 text-[#10B981]"
                          : invoice.status === "overdue"
                          ? "bg-[#EF4444]/20 text-[#EF4444]"
                          : "bg-[#F59E0B]/20 text-[#F59E0B]"
                      }`}
                    >
                      {invoice.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-gray-600 font-mono-tech">
                    {new Date(invoice.dueDate).toLocaleDateString()}
                  </td>
                  <td className="py-2.5 px-3">
                    {invoice.status !== "paid" ? (
                      <Button
                        size="sm"
                        onClick={() => markInvoicePaid(invoice.id)}
                        className="h-6 text-[10px] bg-[#66B2B2] hover:bg-[#66B2B2]/80 text-white font-semibold px-3"
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
              <div key={pkg.id} className="data-card p-5 border-t-4 border-[#66B2B2] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] bg-[#66B2B2]/10 text-[#66B2B2] px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                      {pkg.tier}
                    </span>
                    <span className="text-[10px] text-gray-600 font-mono-tech">ID: {pkg.id}</span>
                  </div>
                  <h4 className="text-lg font-bold text-black mb-1">{pkg.name}</h4>
                  <p className="text-xs text-gray-600 line-clamp-2 mb-4">{pkg.description}</p>
                  
                  <div className="space-y-2.5 mb-6">
                    <div className="flex items-center gap-2 text-xs text-black">
                      <PackageIcon className="w-3.5 h-3.5 text-gray-600" />
                      <span>{client?.companyName || "Unknown Client"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-black">
                      <Wrench className="w-3.5 h-3.5 text-gray-600" />
                      <span>{pkg.visitsRemaining} / {pkg.totalVisits} Visits Remaining</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-black">
                      <Calendar className="w-3.5 h-3.5 text-gray-600" />
                      <span>Valid until {new Date(pkg.endDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-gray-600 uppercase">Monthly Price</div>
                    <div className="text-xl font-bold text-[#66B2B2] font-mono-tech">₱{pkg.price.toLocaleString()}</div>
                  </div>
                  <Button variant="ghost" size="sm" className="text-gray-600 hover:text-black">
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
          <div className="relative z-10 w-full max-w-2xl bg-white border border-gray-200 rounded-lg shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-gray-200 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded bg-[#66B2B2]/10 flex items-center justify-center">
                    <PackageIcon className="w-6 h-6 text-[#66B2B2]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-black">Create Service Package</h3>
                    <p className="text-xs text-gray-600">Define a new maintenance or subscription plan</p>
                  </div>
                </div>
                <button onClick={() => setShowCreator(false)} className="text-gray-600 hover:text-black">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] text-gray-600 uppercase font-bold mb-1.5 block">Package Name</label>
                    <Input value={pkgName} onChange={(e) => setPkgName(e.target.value)} placeholder="e.g. Annual Calibration" className="bg-white border-gray-200 text-black placeholder:text-gray-500" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-600 uppercase font-bold mb-1.5 block">Description</label>
                    <Textarea value={pkgDesc} onChange={(e) => setPkgDesc(e.target.value)} placeholder="What's included in this plan?" className="bg-white border-gray-200 text-black placeholder:text-gray-500 h-20 resize-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] text-gray-600 uppercase font-bold mb-1.5 block">Price ($)</label>
                      <Input value={pkgPrice} onChange={(e) => setPkgPrice(e.target.value)} type="number" placeholder="0.00" className="bg-white border-gray-200 text-black placeholder:text-gray-500" />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-600 uppercase font-bold mb-1.5 block">Tier</label>
                      <Select value={pkgTier} onValueChange={(v) => setPkgTier(v as any)}>
                        <SelectTrigger className="bg-white border-gray-200 text-black"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-white border-gray-200 text-black">
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
                    <label className="text-[10px] text-gray-600 uppercase font-bold mb-1.5 block">Target Client</label>
                    <Select value={targetClientId} onValueChange={setTargetClientId}>
                      <SelectTrigger className="bg-white border-gray-200 text-black"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-white border-gray-200 text-black">
                        {clients.map(c => (
                          <SelectItem key={c.id} value={c.id.toString()}>{c.companyName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] text-gray-600 uppercase font-bold mb-1.5 block">Max Visits</label>
                      <Input value={pkgVisits} onChange={(e) => setPkgVisits(e.target.value)} type="number" placeholder="4" className="bg-white border-gray-200 text-black placeholder:text-gray-500" />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-600 uppercase font-bold mb-1.5 block">Duration (Mo)</label>
                      <Input value={pkgDuration} onChange={(e) => setPkgDuration(e.target.value)} type="number" placeholder="12" className="bg-white border-gray-200 text-black placeholder:text-gray-500" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-600 uppercase font-bold mb-1.5 block">Included Services (Comma separated)</label>
                    <Input value={pkgServices} onChange={(e) => setPkgServices(e.target.value)} placeholder="PMS, Calibration, Tech Support" className="bg-white border-gray-200 text-black placeholder:text-gray-500" />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-gray-600 uppercase font-bold mb-1.5 block">Terms & Conditions</label>
                <Textarea value={pkgTerms} onChange={(e) => setPkgTerms(e.target.value)} placeholder="Legal terms or SLA details..." className="bg-white border-gray-200 text-black placeholder:text-gray-500 h-16 resize-none" />
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <Button variant="outline" onClick={() => setShowCreator(false)} className="flex-1 border-gray-200">Cancel</Button>
                <Button onClick={handleSubmitPackage} className="flex-1 bg-[#66B2B2] text-white font-bold">Create Package</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
