import { useState } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import { useBillingStore } from "@/stores/useBillingStore";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, CreditCard, Activity, FlaskConical, ClipboardList } from "lucide-react";

export default function ClientPackages() {
  const { user } = useAuthStore();
  const { packages, addInvoice } = useBillingStore();
  const clientId = user?.clientId || 1;

  const clientPackages = packages.filter((p) => p.clientId === clientId);
  // Show a few example packages that aren't the client's
  const availablePackages = packages.filter((p) => p.clientId !== clientId);

  const [selectedPackage, setSelectedPackage] = useState<number | null>(null);
  const [purchaseProcessing, setPurchaseProcessing] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState("");

  const handlePackagePurchase = (packageId: number, packageName: string) => {
    setSelectedPackage(packageId);
    setPurchaseProcessing(true);

    setTimeout(() => {
      const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
      const pkg = packages.find((p) => p.id === packageId);
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
    if (type === "Heavy Equipment PMS Package") return <Activity className="w-4 h-4 text-[#005F73]" />;
    if (type === "Calibration Package") return <FlaskConical className="w-4 h-4 text-[#F2A900]" />;
    return <ClipboardList className="w-4 h-4 text-[#8B5CF6]" />;
  };

  return (
    <div className="space-y-4 px-8 pt-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[32px] font-bold text-[#EAEAEA] tracking-[-0.02em]">Packages</h1>
          <p className="text-sm text-[#88888C] mt-0.5">View active packages and purchase upgrades</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="data-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
            <h3 className="text-sm font-semibold text-[#EAEAEA]">Active Packages</h3>
          </div>
          <p className="text-[10px] text-[#88888C] mb-3">Currently assigned to your account</p>
          {clientPackages.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {clientPackages.map((pkg) => (
                <div key={pkg.id} className="rounded border border-white/10 bg-[#0A0A0C] p-4 flex flex-col h-full">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                        {getPackageIcon(pkg.packageType)}
                        <div>
                        <div className="text-xs font-bold text-[#EAEAEA]">{pkg.name}</div>
                        <div className="text-[9px] text-[#88888C] uppercase font-bold tracking-tighter">
                            {pkg.packageType}
                        </div>
                        </div>
                    </div>
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#10B981]/20 text-[#10B981] font-bold">
                      ACTIVE
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 my-3 py-2 border-y border-white/5">
                    <div>
                        <div className="text-[8px] text-[#88888C] uppercase">Usage</div>
                        <div className="text-[11px] text-[#EAEAEA] font-mono-tech">{pkg.visitsRemaining} / {pkg.totalVisits} visits</div>
                    </div>
                    <div>
                        <div className="text-[8px] text-[#88888C] uppercase">Validity</div>
                        <div className="text-[11px] text-[#EAEAEA] font-mono-tech">{pkg.validityMonths} months</div>
                    </div>
                  </div>

                  <div className="text-[#F2A900] font-bold text-sm mb-2">${pkg.price.toLocaleString()} / {pkg.billingCycle}</div>
                  
                  <div className="flex flex-wrap gap-1 mt-auto">
                    {pkg.includedServices.map((service, idx) => (
                      <span key={idx} className="px-1.5 py-0.5 rounded text-[9px] bg-[#005F73]/10 border border-[#005F73]/20 text-[#005F73]">
                        {service}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-[#88888C]">No active packages found.</div>
          )}
        </div>

        <div className="data-card p-4">
          <h3 className="text-sm font-semibold text-[#EAEAEA] mb-1">Available Package Upgrades</h3>
          <p className="text-[10px] text-[#88888C] mb-3">Browse and request a new package purchase</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {availablePackages.map((pkg) => (
              <div key={pkg.id} className="rounded border border-white/10 bg-[#0A0A0C] p-4 flex flex-col h-full opacity-80 hover:opacity-100 transition-opacity">
                <div className="flex items-start justify-between gap-2 mb-2">
                   <div className="flex items-center gap-2">
                        {getPackageIcon(pkg.packageType)}
                        <div>
                        <div className="text-xs font-bold text-[#EAEAEA]">{pkg.name}</div>
                        <div className="text-[9px] text-[#88888C] uppercase font-bold tracking-tighter">
                            {pkg.packageType}
                        </div>
                        </div>
                    </div>
                </div>
                
                <p className="text-[10px] text-[#88888C] mb-3 line-clamp-2">{pkg.description}</p>
                
                <div className="text-[#F2A900] font-bold text-base mb-3">${pkg.price.toLocaleString()}</div>
                
                <div className="flex flex-wrap gap-1 mb-4">
                  {pkg.includedServices.map((service, idx) => (
                    <span key={idx} className="px-1.5 py-0.5 rounded text-[9px] bg-[#005F73]/10 border border-[#005F73]/20 text-[#005F73]">
                      {service}
                    </span>
                  ))}
                </div>

                <Button
                  size="sm"
                  onClick={() => handlePackagePurchase(pkg.id, pkg.name)}
                  disabled={purchaseProcessing && selectedPackage === pkg.id}
                  className="h-8 text-xs bg-[#F2A900] hover:bg-[#F2A900]/80 text-[#050505] font-bold w-full mt-auto"
                >
                  {purchaseProcessing && selectedPackage === pkg.id ? (
                    <Clock className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4 mr-1.5" />
                      Select Plan
                    </>
                  )}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {purchaseSuccess && (
        <div className="fixed bottom-4 right-4 px-4 py-3 rounded bg-[#10B981]/20 border border-[#10B981]/30 flex items-center gap-2 z-50 animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
          <span className="text-sm text-[#10B981] font-medium">{purchaseSuccess}</span>
        </div>
      )}
    </div>
  );
}
