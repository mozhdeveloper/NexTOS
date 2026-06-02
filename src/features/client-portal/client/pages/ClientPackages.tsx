import { useState } from "react";
import { useAuthStore } from "@/features/auth/useAuthStore";
import { useBillingStore } from "@/features/billing/useBillingStore";
import { useOperationsStore } from "@/stores/useOperationsStore";
import { useClientPortalStore } from "@/features/client-portal/client.store";
import seedData from "@/data/seed-data.json";
import { Button } from "@/shared/components/ui/button";
import {
  CheckCircle2,
  Clock,
  Activity,
  FlaskConical,
  ClipboardList,
  ShieldCheck,
  DollarSign,
  PackagePlus,
  TrendingUp,
  Info,
  Package as PackageIcon,
  Search,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import type { Package } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";

export default function ClientPackages() {
  const { user } = useAuthStore();
  const { packages, addInvoice } = useBillingStore();
  const { equipment, registerEquipmentToPackage } = useOperationsStore();
  const { selectedCompanyId } = useClientPortalStore();

  // Map seedData company ID to numeric clientId
  const selectedCompanyIndex = seedData.clients.findIndex(
    c => c.id === selectedCompanyId
  );
  const clientId =
    selectedCompanyIndex !== -1
      ? selectedCompanyIndex + 1
      : user?.clientId || 1;

  const clientPackages = packages.filter(pkg => pkg.clientId === clientId);
  const activePackages = clientPackages.filter(pkg => pkg.status === "active");
  const availablePackages = packages.filter(pkg => pkg.clientId !== clientId);

  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [showRegModal, setShowRegModal] = useState(false);
  const [regSearch, setRegSearch] = useState("");
  const [purchaseProcessing, setPurchaseProcessing] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState("");

  const recommendedPackages: Package[] = [
    {
      id: 1001,
      clientId: 0,
      name: "Enterprise Security",
      description:
        "Advanced maintenance and proactive monitoring for large fleets.",
      packageType: "Heavy Equipment PMS Package",
      tier: "enterprise",
      price: 4500,
      billingCycle: "annual",
      includedServices: [
        "PMS (1000 hrs)",
        "24/7 Monitoring",
        "Priority Support",
        "Fleet Tracking",
      ],
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
      description:
        "Professional package for multi-unit fleet visibility and periodic servicing.",
      packageType: "Heavy Equipment PMS Package",
      tier: "professional",
      price: 3200,
      billingCycle: "annual",
      includedServices: [
        "PMS (500 hrs)",
        "Real-time GPS Tracking",
        "Monthly Reports",
        "Route Optimization",
      ],
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
      description:
        "Calibration and lab validation services with full reporting.",
      packageType: "Calibration Package",
      tier: "professional",
      price: 2800,
      billingCycle: "annual",
      includedServices: [
        "PMS (500 hrs)",
        "Annual Calibration",
        "Standard Support",
        "Uptime Reporting",
      ],
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

  const displayPackages =
    availablePackages.length > 0 ? availablePackages : recommendedPackages;

  const now = new Date();
  const upcomingThreshold = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const totalServicesIncluded = activePackages.reduce(
    (sum, pkg) => sum + pkg.includedServices.length,
    0
  );
  const totalVisits = activePackages.reduce(
    (sum, pkg) => sum + pkg.totalVisits,
    0
  );
  const visitsUsed = activePackages.reduce(
    (sum, pkg) => sum + (pkg.totalVisits - pkg.visitsRemaining),
    0
  );
  const visitsRemaining = activePackages.reduce(
    (sum, pkg) => sum + pkg.visitsRemaining,
    0
  );
  const activeValue = activePackages.reduce((sum, pkg) => sum + pkg.price, 0);
  const expiringSoon = activePackages.filter(
    pkg =>
      new Date(pkg.endDate) <= upcomingThreshold && new Date(pkg.endDate) >= now
  );

  const summaryData = [
    { name: "Used", value: visitsUsed, color: "#66B2B2" },
    { name: "Remaining", value: visitsRemaining, color: "#10B981" },
    {
      name: "Expired",
      value: activePackages.filter(pkg => pkg.status === "expired").length,
      color: "#6B7280",
    },
  ];

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

  const handlePackagePurchase = (pkg: Package) => {
    setPurchaseProcessing(true);

    setTimeout(() => {
      const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
      const amount = pkg.price;
      const tax = Math.round(amount * 0.1 * 100) / 100;
      const total = Math.round((amount + tax) * 100) / 100;
      const dueDate = new Date(Date.now() + 14 * 86400000).toISOString();

      addInvoice({
        clientId,
        packageId: pkg.id,
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
      setPurchaseSuccess(
        `${pkg.name} purchase requested - invoice ${invoiceNumber} created.`
      );
      setTimeout(() => {
        setPurchaseSuccess("");
      }, 3000);
    }, 1200);
  };

  const handleOpenRegistration = (pkg: Package) => {
    setSelectedPackage(pkg);
    setShowRegModal(true);
  };

  const handleRegister = (equipmentId: number) => {
    if (selectedPackage) {
      handlePackagePurchase(selectedPackage);
      registerEquipmentToPackage(equipmentId, selectedPackage);
      setShowRegModal(false);
      setSelectedPackage(null);
    }
  };

  const getPackageIcon = (type: string) => {
    if (type === "Heavy Equipment PMS Package")
      return <Activity className="w-4 h-4 text-[#81E6D9]" />;
    if (type === "Calibration Package")
      return <FlaskConical className="w-4 h-4 text-[#66B2B2]" />;
    return <ClipboardList className="w-4 h-4 text-[#A78BFA]" />;
  };

  const unassignedEquipment = equipment.filter(
    eq =>
      Number(String(eq.clientId).replace(/\D/g, "")) === clientId &&
      (regSearch === "" ||
        eq.name?.toLowerCase().includes(regSearch.toLowerCase()) ||
        eq.serialNumber.toLowerCase().includes(regSearch.toLowerCase()))
  );

  return (
    <div className="space-y-6 px-8 pt-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-[32px] font-bold text-gray-900 tracking-[-0.02em]">
            Service Packages
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Select a package and register your equipment for automated PMS
            tracking
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button className="bg-gray-100 border border-gray-200 text-gray-900 hover:bg-gray-100 px-4 py-2 text-xs font-semibold">
            <Info className="w-4 h-4 mr-2" /> How it Works
          </Button>
          <Button className="bg-[#66B2B2] text-white px-4 py-2 text-xs font-semibold hover:bg-[#5A9E9E]">
            <PackagePlus className="w-4 h-4 mr-2" /> Request Custom Plan
          </Button>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[repeat(5,_minmax(0,1fr))]">
        <div className="data-card p-4 lg:col-span-1">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <ShieldCheck className="w-3 h-3" /> Active Packages
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {activePackages.length}
          </div>
          <div className="text-[10px] text-gray-500 mt-2">
            Current active subscriptions
          </div>
        </div>
        <div className="data-card p-4 lg:col-span-1">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <ClipboardList className="w-3 h-3" /> Services Included
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {totalServicesIncluded}
          </div>
          <div className="text-[10px] text-gray-500 mt-2">
            Across all active plans
          </div>
        </div>
        <div className="data-card p-4 lg:col-span-1">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <TrendingUp className="w-3 h-3" /> Services Used
          </div>
          <div className="text-3xl font-bold text-gray-900">{visitsUsed}</div>
          <div className="text-[10px] text-gray-500 mt-2">
            {totalVisits > 0
              ? `${Math.round((visitsUsed / totalVisits) * 100)}% of total`
              : "No usage yet"}
          </div>
        </div>
        <div className="data-card p-4 lg:col-span-1">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Clock className="w-3 h-3" /> Expiring Soon
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {expiringSoon.length}
          </div>
          <div className="text-[10px] text-gray-500 mt-2">
            Within next 30 days
          </div>
        </div>
        <div className="data-card p-4 lg:col-span-1">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <DollarSign className="w-3 h-3" /> Total Value
          </div>
          <div className="text-3xl font-bold text-[#66B2B2]">
            ₱{activeValue.toLocaleString()}
          </div>
          <div className="text-[10px] text-gray-500 mt-2">
            Of active packages
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          <div className="data-card overflow-hidden">
            <div className="flex flex-col gap-3 border-b border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">
                  Active Packages
                </h3>
                <p className="text-[10px] text-gray-500 mt-1">
                  Overview of your currently subscribed packages
                </p>
              </div>
            </div>
            <div className="overflow-auto">
              <table className="min-w-full text-left text-[11px]">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-3 px-3 text-gray-500 font-medium">
                      Package
                    </th>
                    <th className="py-3 px-3 text-gray-500 font-medium">
                      Usage
                    </th>
                    <th className="py-3 px-3 text-gray-500 font-medium">
                      Validity
                    </th>
                    <th className="py-3 px-3 text-gray-500 font-medium">
                      Status
                    </th>
                    <th className="py-3 px-3 text-gray-500 font-medium">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {activePackages.map(pkg => {
                    const used = pkg.totalVisits - pkg.visitsRemaining;
                    return (
                      <tr
                        key={pkg.id}
                        className="border-b border-gray-200 hover:bg-gray-50"
                      >
                        <td className="py-4 px-3 align-top">
                          <div className="flex items-start gap-3">
                            {getPackageIcon(pkg.packageType)}
                            <div>
                              <div className="font-semibold text-gray-900 text-sm">
                                {pkg.name}
                              </div>
                              <div className="text-[10px] text-gray-500">
                                {pkg.packageType}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-3 align-top">
                          <div className="text-sm font-semibold text-gray-900">
                            {used}/{pkg.totalVisits}
                          </div>
                          <div className="text-[10px] text-gray-500">
                            Visits Used
                          </div>
                          <div className="mt-2 h-1.5 w-24 overflow-hidden rounded-full bg-gray-100">
                            <div
                              className="h-full rounded-full bg-[#66B2B2]"
                              style={{
                                width: `${Math.round((used / pkg.totalVisits) * 100)}%`,
                              }}
                            />
                          </div>
                        </td>
                        <td className="py-4 px-3 align-top text-gray-900">
                          <div className="text-[10px] text-gray-500">
                            Expires
                          </div>
                          <div className="font-semibold">
                            {formatDate(pkg.endDate)}
                          </div>
                        </td>
                        <td className="py-4 px-3 align-top">
                          <span className="inline-flex rounded-full bg-[#10B981]/20 px-2.5 py-1 text-[10px] font-semibold text-[#10B981]">
                            Active
                          </span>
                        </td>
                        <td className="py-4 px-3 align-top">
                          <Button
                            onClick={() => handleOpenRegistration(pkg)}
                            className="bg-[#66B2B2] text-white text-[10px] font-semibold px-3 py-2 hover:bg-[#5A9E9E]"
                          >
                            Register Unit
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                  {activePackages.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-10 text-center text-gray-500"
                      >
                        No active packages. Select one below to get started.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="data-card p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">
                  Available Packages
                </h3>
                <p className="text-[10px] text-gray-500 mt-1">
                  Select a package and link your equipment
                </p>
              </div>
            </div>
            <div className="grid gap-3 lg:grid-cols-3">
              {displayPackages.map(pkg => (
                <div
                  key={pkg.id}
                  className={`rounded-xl border p-4 text-sm shadow-sm ${pkg.tier === "enterprise" ? "border-[#66B2B2] bg-white" : "border-gray-200 bg-gray-50"}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-xs font-semibold text-gray-900">
                        {pkg.name}
                      </div>
                      <div className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">
                        {pkg.tier}
                      </div>
                    </div>
                  </div>
                  <div className="text-[#66B2B2] font-bold text-lg mb-2">
                    ₱{pkg.price.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-gray-500 mb-4 h-8 line-clamp-2">
                    {pkg.description}
                  </div>
                  <div className="space-y-2 mb-6">
                    {pkg.includedServices.slice(0, 4).map((service, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 text-[10px] text-gray-900"
                      >
                        <CheckCircle2 className="w-3 h-3 text-[#10B981]" />
                        {service}
                      </div>
                    ))}
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleOpenRegistration(pkg)}
                    className="w-full rounded-md bg-[#66B2B2] text-white text-[10px] font-semibold py-2 hover:bg-[#5A9E9E]"
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
            <h3 className="text-sm font-semibold text-gray-900 mb-4">
              Usage Analytics
            </h3>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={summaryData}
                    dataKey="value"
                    innerRadius={35}
                    outerRadius={50}
                    stroke="transparent"
                    paddingAngle={5}
                  >
                    {summaryData.map(entry => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 mt-2">
              {summaryData.map(segment => (
                <div
                  key={segment.name}
                  className="flex items-center justify-between text-[10px] text-gray-900"
                >
                  <span className="inline-flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: segment.color }}
                    />
                    {segment.name}
                  </span>
                  <span>{segment.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="data-card p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">
              How it Works
            </h3>
            <div className="space-y-4 text-[10px] text-gray-500">
              <div className="flex items-start gap-3">
                <div className="h-5 w-5 rounded-full bg-[#66B2B2]/20 text-[#66B2B2] flex items-center justify-center shrink-0">
                  1
                </div>
                <div>
                  <div className="font-semibold text-gray-900 mb-0.5">
                    Select Equipment
                  </div>
                  Pick an available package and choose the equipment you want to
                  register.
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-5 w-5 rounded-full bg-[#66B2B2]/20 text-[#66B2B2] flex items-center justify-center shrink-0">
                  2
                </div>
                <div>
                  <div className="font-semibold text-gray-900 mb-0.5">
                    Automated Tracking
                  </div>
                  System sets thresholds (500h or 1000h) and monitors runtime in
                  real-time.
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-5 w-5 rounded-full bg-[#66B2B2]/20 text-[#66B2B2] flex items-center justify-center shrink-0">
                  3
                </div>
                <div>
                  <div className="font-semibold text-gray-900 mb-0.5">
                    Instant Alert
                  </div>
                  When thresholds are hit, a technician task is auto-generated
                  for action.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={showRegModal} onOpenChange={setShowRegModal}>
        <DialogContent className="max-w-md bg-white border-gray-200">
          <DialogHeader>
            <DialogTitle className="text-gray-900 flex items-center gap-2">
              <PackageIcon className="w-5 h-5 text-[#66B2B2]" />
              Register Equipment
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
              <div className="text-[10px] text-gray-500 uppercase font-bold">
                Selected Package
              </div>
              <div className="text-sm font-bold text-gray-900">
                {selectedPackage?.name}
              </div>
              <div className="text-[10px] text-[#66B2B2]">
                Threshold:{" "}
                {selectedPackage?.tier === "enterprise" ? "1000" : "500"} hours
              </div>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search unit ID or serial..."
                value={regSearch}
                onChange={e => setRegSearch(e.target.value)}
                className="pl-9 bg-white border-gray-200 text-gray-900"
              />
            </div>

            <div className="max-h-[300px] overflow-auto space-y-2 pr-1">
              {unassignedEquipment.length > 0 ? (
                unassignedEquipment.map(eq => (
                  <div
                    key={eq.id}
                    className="p-3 rounded-lg border border-gray-200 bg-white hover:border-[#66B2B2]/50 transition-colors flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-gray-900">
                        {eq.name ?? eq.id}
                      </div>
                      <div className="text-[10px] text-gray-500">
                        {eq.equipmentType}
                      </div>
                      <div className="text-[10px] text-gray-500 font-mono-tech">
                        {eq.serialNumber}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleRegister(eq.id)}
                      className="bg-[#66B2B2] hover:bg-[#5A9E9E] text-white text-[10px] h-8"
                    >
                      Register
                    </Button>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500 text-xs">
                  No unassigned equipment found.
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {purchaseSuccess && (
        <div className="fixed bottom-4 right-4 px-4 py-3 rounded bg-[#10B981]/20 border border-[#10B981]/30 flex items-center gap-2 z-50">
          <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
          <span className="text-sm text-[#10B981] font-medium">
            {purchaseSuccess}
          </span>
        </div>
      )}
    </div>
  );
}
