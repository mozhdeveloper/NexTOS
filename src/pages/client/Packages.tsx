import { useState } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import { useBillingStore } from "@/stores/useBillingStore";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Clock,
  Activity,
  FlaskConical,
  ClipboardList,
  ShieldCheck,
  DollarSign,
  ArrowRight,
  PackagePlus,
  TrendingUp,
  ChevronRight,
  Info,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import type { Package } from "@/types";

export default function ClientPackages() {
  const { user } = useAuthStore();
  const { packages, addInvoice } = useBillingStore();
  const clientId = user?.clientId || 1;

  const clientPackages = packages.filter((pkg) => pkg.clientId === clientId);
  const activePackages = clientPackages.filter((pkg) => pkg.status === "active");
  const availablePackages = packages.filter((pkg) => pkg.clientId !== clientId);

  const [selectedPackage, setSelectedPackage] = useState<number | null>(null);
  const [purchaseProcessing, setPurchaseProcessing] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState("");

  const recommendedPackages: Package[] = [
    {
      id: 1001,
      clientId: 0,
      name: "Enterprise Security",
      description: "Advanced maintenance and proactive monitoring for large fleets.",
      packageType: "Heavy Equipment PMS Package",
      tier: "enterprise",
      price: 4500,
      billingCycle: "annual",
      includedServices: ["PMS (1000 hrs)", "24/7 Monitoring", "Priority Support", "Fleet Tracking"],
      totalVisits: 6,
      visitsRemaining: 2,
      usageCount: 4,
      durationMonths: 12,
      validityMonths: 12,
      terms: "Enterprise level SLA applies.",
      startDate: new Date(Date.now() - 60 * 86400000).toISOString(),
      endDate: new Date(Date.now() + 305 * 86400000).toISOString(),
      linkedServiceCategory: "Heavy Equipment PMS",
      status: "active",
      createdAt: new Date().toISOString(),
    },
    {
      id: 1002,
      clientId: 0,
      name: "Fleet Pro",
      description: "Professional package for multi-unit fleet visibility and periodic servicing.",
      packageType: "Heavy Equipment PMS Package",
      tier: "professional",
      price: 3200,
      billingCycle: "annual",
      includedServices: ["PMS (500 hrs)", "Real-time GPS Tracking", "Monthly Reports", "Route Optimization"],
      totalVisits: 4,
      visitsRemaining: 2,
      usageCount: 2,
      durationMonths: 6,
      validityMonths: 6,
      terms: "Ideal for growing equipment fleets.",
      startDate: new Date(Date.now() - 30 * 86400000).toISOString(),
      endDate: new Date(Date.now() + 155 * 86400000).toISOString(),
      linkedServiceCategory: "Heavy Equipment PMS",
      status: "active",
      createdAt: new Date().toISOString(),
    },
    {
      id: 1003,
      clientId: 0,
      name: "Professional Suite",
      description: "Calibration and lab validation services with full reporting.",
      packageType: "Calibration Package",
      tier: "professional",
      price: 2800,
      billingCycle: "annual",
      includedServices: ["PMS (500 hrs)", "Annual Calibration", "Standard Support", "Uptime Reporting"],
      totalVisits: 4,
      visitsRemaining: 1,
      usageCount: 3,
      durationMonths: 6,
      validityMonths: 6,
      terms: "Optimized for critical equipment uptime.",
      startDate: new Date(Date.now() - 20 * 86400000).toISOString(),
      endDate: new Date(Date.now() + 160 * 86400000).toISOString(),
      linkedServiceCategory: "Calibration PMS",
      status: "active",
      createdAt: new Date().toISOString(),
    },
  ];

  const displayPackages = availablePackages.length > 0 ? availablePackages : recommendedPackages;

  const now = new Date();
  const upcomingThreshold = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const totalServicesIncluded = activePackages.reduce((sum, pkg) => sum + pkg.includedServices.length, 0);
  const totalVisits = activePackages.reduce((sum, pkg) => sum + pkg.totalVisits, 0);
  const visitsUsed = activePackages.reduce((sum, pkg) => sum + (pkg.totalVisits - pkg.visitsRemaining), 0);
  const visitsRemaining = activePackages.reduce((sum, pkg) => sum + pkg.visitsRemaining, 0);
  const activeValue = activePackages.reduce((sum, pkg) => sum + pkg.price, 0);
  const expiringSoon = activePackages.filter((pkg) => new Date(pkg.endDate) <= upcomingThreshold && new Date(pkg.endDate) >= now);

  const summaryData = [
    { name: "Used", value: visitsUsed, color: "#F2A900" },
    { name: "Remaining", value: visitsRemaining, color: "#10B981" },
    { name: "Expired", value: activePackages.filter((pkg) => pkg.status === "expired").length, color: "#88888C" },
  ];

  const formatDate = (value: string) => new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const formatDays = (value: string) => {
    const diff = Math.ceil((new Date(value).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? `${diff} days` : "Expired";
  };

  const handlePackagePurchase = (packageId: number, packageName: string) => {
    setSelectedPackage(packageId);
    setPurchaseProcessing(true);

    setTimeout(() => {
      const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
      const pkg = packages.find((p) => p.id === packageId) || displayPackages.find((p) => p.id === packageId);
      const amount = pkg?.price ?? 0;
      const tax = Math.round(amount * 0.1 * 100) / 100;
      const total = Math.round((amount + tax) * 100) / 100;
      const dueDate = new Date(Date.now() + 14 * 86400000).toISOString();

      addInvoice({
        clientId,
        packageId,
        serviceRecordId: null,
        invoiceNumber,
        amount,
        tax,
        total,
        status: "sent",
        dueDate,
        paidDate: null,
      });

      setPurchaseProcessing(false);
      setPurchaseSuccess(`${packageName} purchase requested - invoice ${invoiceNumber} created.`);
      setTimeout(() => {
        setPurchaseSuccess("");
        setSelectedPackage(null);
      }, 3000);
    }, 1200);
  };

  const getPackageIcon = (type: string) => {
    if (type === "Heavy Equipment PMS Package") return <Activity className="w-4 h-4 text-[#81E6D9]" />;
    if (type === "Calibration Package") return <FlaskConical className="w-4 h-4 text-[#F2A900]" />;
    return <ClipboardList className="w-4 h-4 text-[#A78BFA]" />;
  };

  return (
    <div className="space-y-6 px-8 pt-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-[32px] font-bold text-[#EAEAEA] tracking-[-0.02em]">Packages & Subscriptions</h1>
          <p className="text-sm text-[#88888C] mt-1">Manage your service packages, usage and renewals</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button className="bg-[#111827] border border-white/10 text-[#EAEAEA] hover:bg-[#141A2B] px-4 py-2 text-xs font-semibold">
            <Info className="w-4 h-4 mr-2" /> How Packages Work
          </Button>
          <Button className="bg-[#F2A900] text-[#050505] px-4 py-2 text-xs font-semibold hover:bg-[#D69E02]">
            <PackagePlus className="w-4 h-4 mr-2" /> Purchase New Package
          </Button>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[repeat(5,_minmax(0,1fr))]">
        <div className="data-card p-4 lg:col-span-1">
          <div className="text-[10px] text-[#88888C] uppercase tracking-wider mb-3 flex items-center gap-2">
            <ShieldCheck className="w-3 h-3" /> Active Packages
          </div>
          <div className="text-3xl font-bold text-[#EAEAEA]">{activePackages.length}</div>
          <div className="text-[10px] text-[#88888C] mt-2">View details of your current packages</div>
        </div>
        <div className="data-card p-4 lg:col-span-1">
          <div className="text-[10px] text-[#88888C] uppercase tracking-wider mb-3 flex items-center gap-2">
            <ClipboardList className="w-3 h-3" /> Total Services Included
          </div>
          <div className="text-3xl font-bold text-[#EAEAEA]">{totalServicesIncluded}</div>
          <div className="text-[10px] text-[#88888C] mt-2">Across all active packages</div>
        </div>
        <div className="data-card p-4 lg:col-span-1">
          <div className="text-[10px] text-[#88888C] uppercase tracking-wider mb-3 flex items-center gap-2">
            <TrendingUp className="w-3 h-3" /> Services Used
          </div>
          <div className="text-3xl font-bold text-[#EAEAEA]">{visitsUsed}</div>
          <div className="text-[10px] text-[#88888C] mt-2">{totalVisits > 0 ? `${Math.round((visitsUsed / totalVisits) * 100)}% of total` : "No usage yet"}</div>
        </div>
        <div className="data-card p-4 lg:col-span-1">
          <div className="text-[10px] text-[#88888C] uppercase tracking-wider mb-3 flex items-center gap-2">
            <Clock className="w-3 h-3" /> Expiring Soon
          </div>
          <div className="text-3xl font-bold text-[#EAEAEA]">{expiringSoon.length}</div>
          <div className="text-[10px] text-[#88888C] mt-2">Within 30 days</div>
        </div>
        <div className="data-card p-4 lg:col-span-1">
          <div className="text-[10px] text-[#88888C] uppercase tracking-wider mb-3 flex items-center gap-2">
            <DollarSign className="w-3 h-3" /> Total Value
          </div>
          <div className="text-3xl font-bold text-[#F2A900]">${activeValue.toLocaleString()}</div>
          <div className="text-[10px] text-[#88888C] mt-2">Of active packages</div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          <div className="data-card overflow-hidden">
            <div className="flex flex-col gap-3 border-b border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-[#EAEAEA]">Active Packages</h3>
                <p className="text-[10px] text-[#88888C] mt-1">Overview of your currently subscribed packages</p>
              </div>
              <Button className="inline-flex items-center gap-2 text-[10px] font-semibold bg-[#111827] border border-white/10 text-[#EAEAEA] hover:bg-[#141A2B] px-4 py-2">
                View all active <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <div className="overflow-auto">
              <table className="min-w-full text-left text-[11px]">
                <thead className="bg-[#0D111D]">
                  <tr>
                    <th className="py-3 px-3 text-[#88888C] font-medium">Package</th>
                    <th className="py-3 px-3 text-[#88888C] font-medium">Linked Service</th>
                    <th className="py-3 px-3 text-[#88888C] font-medium">Inclusions</th>
                    <th className="py-3 px-3 text-[#88888C] font-medium">Usage</th>
                    <th className="py-3 px-3 text-[#88888C] font-medium">Validity</th>
                    <th className="py-3 px-3 text-[#88888C] font-medium">Status</th>
                    <th className="py-3 px-3 text-[#88888C] font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {activePackages.map((pkg) => {
                    const used = pkg.totalVisits - pkg.visitsRemaining;
                    return (
                      <tr key={pkg.id} className="border-b border-white/10 hover:bg-white/5">
                        <td className="py-4 px-3 align-top">
                          <div className="flex items-start gap-3">
                            {getPackageIcon(pkg.packageType)}
                            <div>
                              <div className="font-semibold text-[#EAEAEA] text-sm">{pkg.name}</div>
                              <div className="text-[10px] text-[#88888C]">{pkg.packageType}</div>
                              <div className="text-[10px] text-[#F2A900] mt-1">${pkg.price.toLocaleString()} / {pkg.billingCycle}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-3 align-top text-[#EAEAEA]">
                          <div className="text-[10px] text-[#88888C]">{pkg.linkedServiceCategory || "Primary Equipment"}</div>
                        </td>
                        <td className="py-4 px-3 align-top text-[#EAEAEA]">
                          <div className="flex flex-col gap-1 text-[10px]">
                            {pkg.includedServices.slice(0, 3).map((service, idx) => (
                              <span key={idx} className="inline-flex rounded bg-white/5 px-2 py-1">{service}</span>
                            ))}
                          </div>
                        </td>
                        <td className="py-4 px-3 align-top">
                          <div className="text-sm font-semibold text-[#EAEAEA]">{used}/{pkg.totalVisits}</div>
                          <div className="text-[10px] text-[#88888C]">PMS Visits Used</div>
                          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                            <div className="h-full rounded-full bg-[#F2A900]" style={{ width: `${Math.round((used / pkg.totalVisits) * 100)}%` }} />
                          </div>
                        </td>
                        <td className="py-4 px-3 align-top text-[#EAEAEA]">
                          <div className="text-[10px] text-[#88888C]">Start</div>
                          <div className="font-semibold">{formatDate(pkg.startDate)}</div>
                          <div className="text-[10px] text-[#88888C] mt-2">Expiry</div>
                          <div className="font-semibold">{formatDate(pkg.endDate)}</div>
                        </td>
                        <td className="py-4 px-3 align-top">
                          <span className="inline-flex rounded-full bg-[#10B981]/20 px-2.5 py-1 text-[10px] font-semibold text-[#10B981]">Active</span>
                        </td>
                        <td className="py-4 px-3 align-top">
                          <Button className="bg-[#F2A900] text-[#050505] text-[10px] font-semibold px-3 py-2 hover:bg-[#D69E02]">
                            Use Package
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="data-card p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-[#EAEAEA]">Available Packages</h3>
                <p className="text-[10px] text-[#88888C] mt-1">Choose a package that fits your equipment and service needs</p>
              </div>
              <button className="text-[10px] text-[#F2A900] font-semibold flex items-center gap-1">
                Compare Packages <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="grid gap-3 lg:grid-cols-3">
              {displayPackages.map((pkg) => (
                <div
                  key={pkg.id}
                  className={`rounded-xl border p-4 text-sm shadow-sm ${pkg.tier === "enterprise" ? "border-[#F2A900] bg-[#141A2B]" : "border-white/10 bg-[#0A0A0C]"}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-xs font-semibold text-[#EAEAEA]">{pkg.name}</div>
                      <div className="text-[10px] text-[#88888C] uppercase tracking-[0.18em] mt-1">{pkg.tier === "enterprise" ? "Enterprise" : pkg.tier === "professional" ? "Professional" : "Basic"}</div>
                    </div>
                    {pkg.tier === "enterprise" && (
                      <span className="rounded-full bg-[#F2A900] px-2 py-1 text-[10px] font-semibold text-[#050505]">Most Popular</span>
                    )}
                  </div>
                  <div className="text-[#F2A900] font-bold text-lg mb-2">${pkg.price.toLocaleString()} / {pkg.billingCycle === "annual" ? "year" : pkg.billingCycle}</div>
                  <div className="text-[10px] text-[#88888C] mb-3">{pkg.description}</div>
                  <div className="space-y-2 mb-4">
                    {pkg.includedServices.slice(0, 4).map((service, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-[10px] text-[#EAEAEA]">
                        <CheckCircle2 className="w-3 h-3 text-[#10B981]" />
                        {service}
                      </div>
                    ))}
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handlePackagePurchase(pkg.id, pkg.name)}
                    disabled={purchaseProcessing && selectedPackage === pkg.id}
                    className="w-full rounded-md bg-[#F2A900] text-[#050505] text-[10px] font-semibold py-2 hover:bg-[#D69E02]"
                  >
                    Select Equipment
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="data-card p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-[#EAEAEA]">Package Usage Summary</h3>
                <p className="text-[10px] text-[#88888C] mt-1">Used, remaining and expired visits</p>
              </div>
              <div className="w-24 h-24">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={summaryData} dataKey="value" innerRadius={28} outerRadius={40} stroke="transparent">
                      {summaryData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="space-y-2 mt-4">
              {summaryData.map((segment) => (
                <div key={segment.name} className="flex items-center justify-between text-[10px] text-[#EAEAEA]">
                  <span className="inline-flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: segment.color }} />
                    {segment.name}
                  </span>
                  <span>{segment.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="data-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-[#EAEAEA]">Upcoming Expirations</h3>
              <span className="text-[10px] text-[#F2A900]">{expiringSoon.length} soon</span>
            </div>
            <div className="space-y-3">
              {expiringSoon.length > 0 ? (
                expiringSoon.map((pkg) => (
                  <div key={pkg.id} className="rounded-xl border border-white/10 bg-[#0A0A0C] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-semibold text-[#EAEAEA]">{pkg.name}</div>
                        <div className="text-[10px] text-[#88888C]">{pkg.linkedServiceCategory || "Primary Equipment"}</div>
                      </div>
                      <div className="text-[10px] text-[#F2A900] font-semibold">{formatDays(pkg.endDate)}</div>
                    </div>
                    <div className="text-[10px] text-[#88888C] mt-2">Expires {formatDate(pkg.endDate)}</div>
                  </div>
                ))
              ) : (
                <div className="text-[10px] text-[#88888C]">No packages expiring in the next 30 days.</div>
              )}
            </div>
          </div>

          <div className="data-card p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-[#EAEAEA]">Need a Custom Package?</h3>
                <p className="text-[10px] text-[#88888C] mt-1">Tell us your requirements and we’ll create a custom plan.</p>
              </div>
            </div>
            <Button className="w-full rounded-md bg-[#111827] border border-white/10 text-[#EAEAEA] text-[10px] font-semibold py-2 hover:bg-[#141A2B]">
              Request Custom Package
            </Button>
          </div>

          <div className="data-card p-4">
            <h3 className="text-sm font-semibold text-[#EAEAEA] mb-4">How it Works</h3>
            <div className="space-y-3 text-[10px] text-[#88888C]">
              <div className="flex items-start gap-3">
                <div className="mt-1 h-6 w-6 rounded-full bg-[#F2A900]/20 text-[#F2A900] flex items-center justify-center">1</div>
                <div>
                  <div className="font-semibold text-[#EAEAEA]">Choose a Package</div>
                  Select the package that best fits your equipment and needs.
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-1 h-6 w-6 rounded-full bg-[#F2A900]/20 text-[#F2A900] flex items-center justify-center">2</div>
                <div>
                  <div className="font-semibold text-[#EAEAEA]">Link Your Equipment</div>
                  Choose the equipment you want this package for.
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-1 h-6 w-6 rounded-full bg-[#F2A900]/20 text-[#F2A900] flex items-center justify-center">3</div>
                <div>
                  <div className="font-semibold text-[#EAEAEA]">Confirm & Schedule</div>
                  Confirm details and schedule your service.
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-1 h-6 w-6 rounded-full bg-[#F2A900]/20 text-[#F2A900] flex items-center justify-center">4</div>
                <div>
                  <div className="font-semibold text-[#EAEAEA]">Start Using</div>
                  Book services and track usage in real-time.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {purchaseSuccess && (
        <div className="fixed bottom-4 right-4 px-4 py-3 rounded bg-[#10B981]/20 border border-[#10B981]/30 flex items-center gap-2 z-50">
          <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
          <span className="text-sm text-[#10B981] font-medium">{purchaseSuccess}</span>
        </div>
      )}
    </div>
  );
}
