import { useState } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import { useBillingStore } from "@/stores/useBillingStore";
import { useOperationsStore } from "@/stores/useOperationsStore";
import { useClientPortalStore } from "@/stores/useClientPortalStore";
import seedData from "@/data/seed-data.json";
import { Button } from "@/components/ui/button";
import {
  Activity,
  CheckCircle2,
  ClipboardList,
  Clock,
  DollarSign,
  Eye,
  FlaskConical,
  Info,
  Package as PackageIcon,
  PackagePlus,
  Search,
  ShieldCheck,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import type {
  Package,
  PackageTier,
  PackageType,
  ServiceCategory,
} from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

type RegistrationMode = "activate" | "link";

type SeedPackage = {
  id: string;
  name: string;
  type?: string;
  includes?: string[];
  validityMonths?: number;
  price?: number;
};

function mapSeedPackageType(type?: string): PackageType {
  if (type === "Calibration PMS") return "Calibration Package";
  if (type === "Lab Testing") return "Lab Testing Package";
  return "Heavy Equipment PMS Package";
}

function mapLinkedServiceCategory(type: PackageType): ServiceCategory {
  if (type === "Calibration Package") return "Calibration PMS";
  if (type === "Lab Testing Package") return "Lab Testing Service";
  return "Heavy Equipment PMS";
}

function inferTier(pkg: { name?: string; price?: number }): PackageTier {
  const name = (pkg.name ?? "").toLowerCase();
  if (name.includes("1000") || (pkg.price ?? 0) >= 40000) return "enterprise";
  if ((pkg.price ?? 0) >= 20000) return "professional";
  return "basic";
}

function inferVisits(pkg: { type?: string; includes?: string[] }) {
  const visitsText = (pkg.includes ?? []).find(item => /\d+/.test(item));
  const parsed = visitsText ? Number(visitsText.match(/\d+/)?.[0]) : 0;
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  if (pkg.type === "Lab Testing") return 10;
  return 4;
}

function buildPackageCatalog(): Package[] {
  return (seedData.packages as SeedPackage[]).map((pkg, index) => {
    const packageType = mapSeedPackageType(pkg.type);
    const totalVisits = inferVisits(pkg);
    const validityMonths = pkg.validityMonths ?? 12;

    return {
      id: 9000 + index,
      clientId: 0,
      name: pkg.name,
      description: `${pkg.type} package with ${totalVisits} included service${totalVisits === 1 ? "" : "s"}.`,
      packageType,
      tier: inferTier(pkg),
      price: pkg.price ?? 0,
      billingCycle: "annual",
      includedServices: pkg.includes ?? [],
      totalVisits,
      visitsRemaining: totalVisits,
      usageCount: 0,
      durationMonths: validityMonths,
      validityMonths,
      terms:
        "MVP package catalog entry. Terms are finalized during activation.",
      startDate: new Date().toISOString(),
      endDate: new Date(
        Date.now() + validityMonths * 30 * MS_PER_DAY
      ).toISOString(),
      linkedServiceCategory: mapLinkedServiceCategory(packageType),
      status: "active",
      createdAt: new Date().toISOString(),
    };
  });
}

const packageCatalog = buildPackageCatalog();

function getPackageBaseKey(pkg: Package) {
  return `${pkg.name}|${pkg.packageType}`;
}

function getDisplayActivePackages(packages: Package[]) {
  const linkedBaseKeys = new Set(
    packages
      .filter(pkg => Boolean(pkg.linkedEquipmentId))
      .map(getPackageBaseKey)
  );
  const seenDisplayKeys = new Set<string>();

  return packages.filter(pkg => {
    const baseKey = getPackageBaseKey(pkg);

    if (!pkg.linkedEquipmentId && linkedBaseKeys.has(baseKey)) return false;

    const displayKey = `${baseKey}|${pkg.linkedEquipmentId ?? "unlinked"}`;
    if (seenDisplayKeys.has(displayKey)) return false;

    seenDisplayKeys.add(displayKey);
    return true;
  });
}

export default function ClientPackages() {
  const { user } = useAuthStore();
  const {
    packages,
    addInvoice,
    activatePackageForEquipment,
    linkPackageToEquipment,
    unsubscribePackage,
  } = useBillingStore();
  const { equipment, registerEquipmentToPackage } = useOperationsStore();
  const { selectedCompanyId } = useClientPortalStore();

  const selectedCompanyIndex = seedData.clients.findIndex(
    client => client.id === selectedCompanyId
  );
  const clientId =
    selectedCompanyIndex !== -1
      ? selectedCompanyIndex + 1
      : user?.clientId || 1;

  const clientPackages = packages.filter(pkg => pkg.clientId === clientId);
  const activePackages = clientPackages.filter(pkg => pkg.status === "active");
  const displayActivePackages = getDisplayActivePackages(activePackages);
  const linkedEquipmentIds = new Set(
    activePackages.map(pkg => pkg.linkedEquipmentId).filter(Boolean)
  );

  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [registrationMode, setRegistrationMode] =
    useState<RegistrationMode>("activate");
  const [showRegModal, setShowRegModal] = useState(false);
  const [showHowItWorksModal, setShowHowItWorksModal] = useState(false);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [regSearch, setRegSearch] = useState("");
  const [purchaseProcessing, setPurchaseProcessing] = useState(false);

  const now = new Date();
  const upcomingThreshold = new Date(now.getTime() + 30 * MS_PER_DAY);

  const totalServicesIncluded = displayActivePackages.reduce(
    (sum, pkg) => sum + pkg.includedServices.length,
    0
  );
  const totalVisits = displayActivePackages.reduce(
    (sum, pkg) => sum + pkg.totalVisits,
    0
  );
  const visitsUsed = displayActivePackages.reduce(
    (sum, pkg) => sum + (pkg.totalVisits - pkg.visitsRemaining),
    0
  );
  const visitsRemaining = displayActivePackages.reduce(
    (sum, pkg) => sum + pkg.visitsRemaining,
    0
  );
  const activeValue = displayActivePackages.reduce(
    (sum, pkg) => sum + pkg.price,
    0
  );
  const expiringSoon = displayActivePackages.filter(
    pkg =>
      new Date(pkg.endDate) <= upcomingThreshold && new Date(pkg.endDate) >= now
  );

  const summaryData = [
    { name: "Used", value: visitsUsed, color: "#66B2B2" },
    { name: "Remaining", value: visitsRemaining, color: "#10B981" },
    {
      name: "Expired",
      value: clientPackages.filter(pkg => pkg.status === "expired").length,
      color: "#6B7280",
    },
  ];

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  const formatDays = (value: string) => {
    const diff = Math.ceil(
      (new Date(value).getTime() - now.getTime()) / MS_PER_DAY
    );
    return diff > 0 ? `${diff} days` : "Expired";
  };
  const formatMoney = (amount: number) =>
    `PHP ${amount.toLocaleString("en-PH")}`;

  const selectedRegisteredUnit = equipment.find(
    item => item.id === selectedUnitId
  );

  const handleOpenRegistration = (pkg: Package, mode: RegistrationMode) => {
    setSelectedPackage(pkg);
    setRegistrationMode(mode);
    setRegSearch("");
    setShowRegModal(true);
  };

  const handleRegister = (equipmentId: string) => {
    if (!selectedPackage || purchaseProcessing) return;

    const selectedEquipment = equipment.find(item => item.id === equipmentId);
    if (!selectedEquipment) return;

    setPurchaseProcessing(true);

    if (registrationMode === "link") {
      const linkedPackage = linkPackageToEquipment(
        selectedPackage.id,
        equipmentId
      );
      const packageForTracking = linkedPackage ?? {
        ...selectedPackage,
        linkedEquipmentId: equipmentId,
      };

      registerEquipmentToPackage(equipmentId, packageForTracking);
      setPurchaseProcessing(false);
      setShowRegModal(false);
      setSelectedPackage(null);
      setRegSearch("");

      toast.success("Unit linked", {
        description: `${selectedEquipment.name} is now registered under ${selectedPackage.name}.`,
      });
      return;
    }

    const activatedPackage = activatePackageForEquipment(
      selectedPackage,
      clientId,
      equipmentId
    );
    const invoiceNumber = `INV-${String(activatedPackage.id).slice(-6)}`;
    const amount = activatedPackage.price;
    const tax = Math.round(amount * 0.1 * 100) / 100;
    const total = Math.round((amount + tax) * 100) / 100;
    const dueDate = new Date(activatedPackage.createdAt);
    dueDate.setDate(dueDate.getDate() + 14);

    addInvoice({
      clientId,
      packageId: activatedPackage.id,
      serviceRecordId: null,
      invoiceNumber,
      amount,
      tax,
      total,
      status: "sent",
      dueDate: dueDate.toISOString(),
      paidDate: null,
    });

    registerEquipmentToPackage(equipmentId, activatedPackage);
    setPurchaseProcessing(false);
    setShowRegModal(false);
    setSelectedPackage(null);
    setRegSearch("");

    toast.success("Package activated", {
      description: `${activatedPackage.name} is now active for ${selectedEquipment.name}. Invoice ${invoiceNumber} was created.`,
    });
  };

  const handleUnsubscribe = (pkg: Package) => {
    unsubscribePackage(pkg.id);

    toast.success("Package unsubscribed", {
      description: `${pkg.name} was removed from active packages for ${getLinkedEquipmentLabel(pkg.linkedEquipmentId)}.`,
    });
  };

  const getPackageIcon = (type: string) => {
    if (type === "Heavy Equipment PMS Package")
      return <Activity className="w-4 h-4 text-[#66B2B2]" />;
    if (type === "Calibration Package")
      return <FlaskConical className="w-4 h-4 text-[#66B2B2]" />;
    return <ClipboardList className="w-4 h-4 text-[#A78BFA]" />;
  };

  const getLinkedEquipmentLabel = (equipmentId?: string) => {
    const unit = equipment.find(item => item.id === equipmentId);
    return unit ? `${unit.name} - ${unit.serialNumber}` : "No equipment linked";
  };

  const availableEquipment = equipment.filter(
    eq =>
      Number(String(eq.clientId).replace(/\D/g, "")) === clientId &&
      !linkedEquipmentIds.has(eq.id) &&
      (regSearch === "" ||
        eq.name?.toLowerCase().includes(regSearch.toLowerCase()) ||
        eq.serialNumber.toLowerCase().includes(regSearch.toLowerCase()))
  );

  return (
    <div className="space-y-4 px-6 pt-6 lg:px-8 lg:pt-7">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-[28px] font-bold text-gray-900 tracking-[-0.02em]">
            Service Packages
          </h1>
          <p className="mt-1 text-[11px] text-gray-500">
            Select a package and register your equipment for automated PMS
            tracking
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            onClick={() => setShowHowItWorksModal(true)}
            className="bg-gray-100 border border-gray-200 text-gray-900 hover:bg-gray-100 px-4 py-2 text-xs font-semibold"
          >
            <Info className="w-4 h-4 mr-2" /> How it Works
          </Button>
          <Button className="bg-[#66B2B2] text-white px-4 py-2 text-xs font-semibold hover:bg-[#5A9E9E]">
            <PackagePlus className="w-4 h-4 mr-2" /> Request Custom Plan
          </Button>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[repeat(5,_minmax(0,1fr))]">
        <SummaryCard
          icon={<ShieldCheck className="w-3 h-3" />}
          label="Active Packages"
          value={displayActivePackages.length.toString()}
          sublabel="Current active subscriptions"
        />
        <SummaryCard
          icon={<ClipboardList className="w-3 h-3" />}
          label="Services Included"
          value={totalServicesIncluded.toString()}
          sublabel="Across all active plans"
        />
        <SummaryCard
          icon={<TrendingUp className="w-3 h-3" />}
          label="Services Used"
          value={visitsUsed.toString()}
          sublabel={
            totalVisits > 0
              ? `${Math.round((visitsUsed / totalVisits) * 100)}% of total`
              : "No usage yet"
          }
        />
        <SummaryCard
          icon={<Clock className="w-3 h-3" />}
          label="Expiring Soon"
          value={expiringSoon.length.toString()}
          sublabel="Within next 30 days"
        />
        <SummaryCard
          icon={<DollarSign className="w-3 h-3" />}
          label="Total Value"
          value={formatMoney(activeValue)}
          sublabel="Of active packages"
          accent
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[2.1fr_1fr]">
        <div className="space-y-4">
          <div className="data-card overflow-hidden">
            <div className="flex flex-col gap-2 border-b border-gray-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">
                  Active Packages
                </h3>
                <p className="mt-1 text-[10px] text-gray-500">
                  Overview of your currently subscribed packages
                </p>
              </div>
            </div>
            <div className="overflow-auto">
              <table className="min-w-full text-left text-[11px]">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-[10px] font-semibold text-gray-500">
                      Package
                    </th>
                    <th className="px-3 py-2 text-[10px] font-semibold text-gray-500">
                      Linked Equipment
                    </th>
                    <th className="px-3 py-2 text-[10px] font-semibold text-gray-500">
                      Usage
                    </th>
                    <th className="px-3 py-2 text-[10px] font-semibold text-gray-500">
                      Validity
                    </th>
                    <th className="px-3 py-2 text-[10px] font-semibold text-gray-500">
                      Status
                    </th>
                    <th className="px-3 py-2 text-[10px] font-semibold text-gray-500">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {displayActivePackages.map(pkg => {
                    const used = pkg.totalVisits - pkg.visitsRemaining;
                    const usagePercent =
                      pkg.totalVisits > 0
                        ? Math.round((used / pkg.totalVisits) * 100)
                        : 0;
                    const linkedUnit = equipment.find(
                      item => item.id === pkg.linkedEquipmentId
                    );
                    return (
                      <tr
                        key={pkg.id}
                        className="border-b border-gray-200 hover:bg-gray-50"
                      >
                        <td className="px-3 py-2 align-top">
                          <div className="flex items-start gap-3">
                            {getPackageIcon(pkg.packageType)}
                            <div>
                              <div className="text-sm font-semibold text-gray-900">
                                {pkg.name}
                              </div>
                              <div className="text-[10px] text-gray-500">
                                {pkg.packageType}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2 align-top">
                          <div className="text-[11px] font-semibold text-gray-900">
                            {getLinkedEquipmentLabel(pkg.linkedEquipmentId)}
                          </div>
                          <div className="text-[10px] text-gray-500">
                            {linkedUnit
                              ? "Registered unit"
                              : "Waiting for unit"}
                          </div>
                        </td>
                        <td className="px-3 py-2 align-top">
                          <div className="text-[11px] font-semibold text-gray-900">
                            {used}/{pkg.totalVisits}
                          </div>
                          <div className="text-[10px] text-gray-500">
                            Visits Used
                          </div>
                          <div className="mt-2 h-1.5 w-24 overflow-hidden rounded-full bg-gray-100">
                            <div
                              className="h-full rounded-full bg-[#66B2B2]"
                              style={{ width: `${usagePercent}%` }}
                            />
                          </div>
                        </td>
                        <td className="px-3 py-2 align-top text-gray-900">
                          <div className="text-[10px] text-gray-500">
                            Expires in {formatDays(pkg.endDate)}
                          </div>
                          <div className="text-[11px] font-semibold">
                            {formatDate(pkg.endDate)}
                          </div>
                        </td>
                        <td className="px-3 py-2 align-top">
                          <span className="inline-flex rounded-full bg-[#10B981]/20 px-2.5 py-1 text-[10px] font-semibold text-[#10B981]">
                            Active
                          </span>
                        </td>
                        <td className="px-3 py-2 align-top">
                          <div className="flex flex-col gap-2 sm:flex-row">
                            {linkedUnit ? (
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setSelectedUnitId(linkedUnit.id)}
                                className="h-7 rounded-md border-[#66B2B2]/40 px-3 text-[10px] font-semibold text-[#0F766E] hover:bg-[#66B2B2]/10"
                              >
                                <Eye className="mr-1.5 h-3.5 w-3.5" />
                                View Unit
                              </Button>
                            ) : (
                              <Button
                                onClick={() =>
                                  handleOpenRegistration(pkg, "link")
                                }
                                className="h-7 rounded-md bg-[#66B2B2] px-3 text-[10px] font-semibold text-white hover:bg-[#5A9E9E]"
                              >
                                Link Unit
                              </Button>
                            )}
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => handleUnsubscribe(pkg)}
                              className="h-7 rounded-md border-red-200 px-3 text-[10px] font-semibold text-red-600 hover:bg-red-50 hover:text-red-700"
                            >
                              <XCircle className="mr-1.5 h-3.5 w-3.5" />
                              Unsubscribe
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {displayActivePackages.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
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
            <div className="grid items-stretch gap-3 lg:grid-cols-3">
              {packageCatalog.map(pkg => (
                <div
                  key={pkg.id}
                  className={`flex h-full flex-col rounded-lg border bg-white p-3 text-xs shadow-sm transition-colors hover:border-[#66B2B2]/60 ${pkg.tier === "enterprise" ? "border-[#66B2B2]" : "border-gray-200"}`}
                >
                  <div className="mb-3 flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#66B2B2]/25 bg-[#66B2B2]/10">
                      {getPackageIcon(pkg.packageType)}
                    </div>
                    <div className="min-w-0">
                      <div className="line-clamp-2 text-sm font-semibold leading-5 text-gray-900">
                        {pkg.name}
                      </div>
                      <div className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                        {pkg.tier}
                      </div>
                    </div>
                  </div>
                  <div className="mb-2 text-lg font-bold text-[#66B2B2]">
                    {formatMoney(pkg.price)}
                  </div>
                  <div className="mb-3 min-h-8 text-[11px] leading-4 text-gray-500">
                    {pkg.description}
                  </div>
                  <div className="mb-4 space-y-2">
                    {pkg.includedServices.slice(0, 4).map((service, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2 text-[11px] leading-4 text-gray-900"
                      >
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#10B981]" />
                        <span>{service}</span>
                      </div>
                    ))}
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleOpenRegistration(pkg, "activate")}
                    className="mt-auto h-8 w-full rounded-md bg-[#66B2B2] text-[11px] font-semibold text-white hover:bg-[#5A9E9E]"
                  >
                    Select Equipment
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="data-card p-3">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">
              Usage Analytics
            </h3>
            <div className="h-32">
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
            <div className="mt-2 space-y-2">
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

          <div className="data-card p-3">
            <h3 className="mb-3 text-sm font-semibold text-gray-900">
              How it Works
            </h3>
            <div className="space-y-3 text-[10px] text-gray-500">
              <HowItWorksStep
                step="1"
                title="Choose a package"
                body="Pick the plan that fits the equipment you want covered."
              />
              <HowItWorksStep
                step="2"
                title="Select the equipment"
                body="Choose the unit you want registered under the package."
              />
              <HowItWorksStep
                step="3"
                title="Confirm registration"
                body="Your package becomes active and the unit appears in Active Packages."
              />
              <HowItWorksStep
                step="4"
                title="Track status"
                body="View visits, expiry, and the registered unit anytime."
              />
            </div>
          </div>
        </div>
      </div>

      <Dialog open={showRegModal} onOpenChange={setShowRegModal}>
        <DialogContent className="max-w-md bg-white border-gray-200">
          <DialogHeader>
            <DialogTitle className="text-gray-900 flex items-center gap-2">
              <PackageIcon className="w-5 h-5 text-[#66B2B2]" />
              {registrationMode === "activate"
                ? "Select Equipment"
                : "Link Equipment"}
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
              <div className="text-[10px] text-gray-500">
                {registrationMode === "activate"
                  ? "This will activate a new package for the selected unit."
                  : "This will attach a unit to this active package without creating another subscription."}
              </div>
              <div className="text-[10px] text-[#66B2B2]">
                PMS Rule:{" "}
                {selectedPackage?.packageType === "Heavy Equipment PMS Package"
                  ? `${selectedPackage?.tier === "enterprise" ? "1000" : "500"} hours`
                  : selectedPackage?.packageType === "Calibration Package"
                    ? "12 months calibration"
                    : "6 months lab testing"}
              </div>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search unit ID or serial..."
                value={regSearch}
                onChange={event => setRegSearch(event.target.value)}
                className="pl-9 bg-white border-gray-200 text-gray-900"
              />
            </div>

            <div className="max-h-[300px] overflow-auto space-y-2 pr-1">
              {availableEquipment.length > 0 ? (
                availableEquipment.map(eq => (
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
                      disabled={purchaseProcessing}
                      onClick={() => handleRegister(eq.id)}
                      className="bg-[#66B2B2] hover:bg-[#5A9E9E] text-white text-[10px] h-8"
                    >
                      {purchaseProcessing
                        ? "Saving..."
                        : registrationMode === "activate"
                          ? "Activate"
                          : "Link"}
                    </Button>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500 text-xs">
                  No available equipment found.
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showHowItWorksModal} onOpenChange={setShowHowItWorksModal}>
        <DialogContent className="max-h-[90vh] overflow-y-auto bg-white border-gray-200 sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-gray-900 flex items-center gap-2">
              <Info className="w-5 h-5 text-[#66B2B2]" />
              How Your Packages Work
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 text-xs">
            <section className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <h3 className="mb-3 text-sm font-semibold text-gray-900">
                Your Package Flow
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <ModalStep
                  step="1"
                  title="Choose a package"
                  body="Pick the plan that fits the equipment you want covered."
                />
                <ModalStep
                  step="2"
                  title="Select the equipment"
                  body="Choose the unit you want registered under the package."
                />
                <ModalStep
                  step="3"
                  title="Confirm registration"
                  body="The package becomes active and the unit appears in Active Packages."
                />
                <ModalStep
                  step="4"
                  title="Track status"
                  body="View visits, expiry, and the registered unit anytime."
                />
              </div>
            </section>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(selectedUnitId)}
        onOpenChange={open => !open && setSelectedUnitId(null)}
      >
        <DialogContent className="max-w-md bg-white border-gray-200">
          <DialogHeader>
            <DialogTitle className="text-gray-900 flex items-center gap-2">
              <Eye className="w-5 h-5 text-[#66B2B2]" />
              Registered Unit
            </DialogTitle>
          </DialogHeader>

          {selectedRegisteredUnit && (
            <div className="space-y-4 text-xs">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="text-sm font-semibold text-gray-900">
                  {selectedRegisteredUnit.name}
                </div>
                <div className="mt-1 font-mono-tech text-[11px] text-gray-500">
                  {selectedRegisteredUnit.serialNumber}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <UnitDetail
                  label="Type"
                  value={selectedRegisteredUnit.equipmentType}
                />
                <UnitDetail
                  label="Status"
                  value={selectedRegisteredUnit.status ?? "Active"}
                />
                <UnitDetail
                  label="Hours"
                  value={selectedRegisteredUnit.hoursTotal ?? "0h 0m"}
                />
                <UnitDetail
                  label="Location"
                  value={selectedRegisteredUnit.location ?? "Not set"}
                />
              </div>

              <div className="rounded-lg border border-[#66B2B2]/25 bg-[#66B2B2]/5 p-4">
                <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#0F766E]">
                  Service Tracking
                </div>
                {selectedRegisteredUnit.pmsConfiguration?.length ? (
                  <div className="space-y-2">
                    {selectedRegisteredUnit.pmsConfiguration.map(
                      (config, index) => (
                        <div
                          key={`${config.serviceType}-${index}`}
                          className="flex items-center justify-between gap-3"
                        >
                          <span className="font-semibold text-gray-900">
                            {config.serviceType}
                          </span>
                          <span className="text-gray-500">
                            Every {config.serviceInterval}{" "}
                            {config.serviceIntervalUnit}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                ) : (
                  <div className="text-gray-500">
                    No service tracking configured yet.
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  sublabel,
  accent = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sublabel: string;
  accent?: boolean;
}) {
  return (
    <div className="data-card p-3 lg:col-span-1">
      <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-wider text-gray-500">
        {icon} {label}
      </div>
      <div
        className={`text-[22px] font-bold ${accent ? "text-[#66B2B2]" : "text-gray-900"}`}
      >
        {value}
      </div>
      <div className="mt-1 text-[10px] text-gray-500">{sublabel}</div>
    </div>
  );
}

function HowItWorksStep({
  step,
  title,
  body,
}: {
  step: string;
  title: string;
  body: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="h-5 w-5 rounded-full bg-[#66B2B2]/20 text-[#66B2B2] flex items-center justify-center shrink-0">
        {step}
      </div>
      <div>
        <div className="font-semibold text-gray-900 mb-0.5">{title}</div>
        {body}
      </div>
    </div>
  );
}

function ModalStep({
  step,
  title,
  body,
}: {
  step: string;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#66B2B2]/20 text-[10px] font-bold text-[#0F766E]">
          {step}
        </span>
        <span className="font-semibold text-gray-900">{title}</span>
      </div>
      <p className="text-gray-500 leading-relaxed">{body}</p>
    </div>
  );
}

function UnitDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3">
      <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
        {label}
      </div>
      <div className="mt-1 font-semibold text-gray-900">{value}</div>
    </div>
  );
}
