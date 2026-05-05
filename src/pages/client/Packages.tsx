import { useState } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import { useBillingStore } from "@/stores/useBillingStore";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, CreditCard } from "lucide-react";

export default function ClientPackages() {
  const { user } = useAuthStore();
  const { packages, addInvoice } = useBillingStore();
  const clientId = user?.clientId || 1;

  const clientPackages = packages.filter((p) => p.clientId === clientId);
  const availablePackages = packages.filter((p) => p.clientId !== clientId);

  const [selectedPackage, setSelectedPackage] = useState<number | null>(null);
  const [purchaseProcessing, setPurchaseProcessing] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState("");

  const handlePackagePurchase = (packageId: number, packageName: string) => {
    setSelectedPackage(packageId);
    setPurchaseProcessing(true);

    setTimeout(() => {
      const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
      const amount = packages.find((p) => p.id === packageId)?.price ?? 0;
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
          <h3 className="text-sm font-semibold text-[#EAEAEA] mb-1">Active Packages</h3>
          <p className="text-[10px] text-[#88888C] mb-3">Currently assigned to your account</p>
          {clientPackages.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {clientPackages.map((pkg) => (
                <div key={pkg.id} className="rounded border border-white/10 bg-[#0A0A0C] p-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="text-xs font-semibold text-[#EAEAEA]">{pkg.name}</div>
                      <div className="text-[10px] text-[#88888C] capitalize">
                        {pkg.tier} - {pkg.billingCycle}
                      </div>
                    </div>
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#10B981]/20 text-[#10B981]">
                      {pkg.status}
                    </span>
                  </div>
                  <div className="text-[#F2A900] font-bold text-sm mb-2">${pkg.price.toFixed(0)}</div>
                  <div className="flex flex-wrap gap-1">
                    {pkg.includedServices.map((service, idx) => (
                      <span key={idx} className="px-1.5 py-0.5 rounded text-[10px] bg-[#005F73]/20 text-[#005F73]">
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
          <h3 className="text-sm font-semibold text-[#EAEAEA] mb-1">Available Packages</h3>
          <p className="text-[10px] text-[#88888C] mb-3">Browse and request a new package purchase</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {availablePackages.map((pkg) => (
              <div key={pkg.id} className="rounded border border-white/10 bg-[#0A0A0C] p-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <div className="text-xs font-semibold text-[#EAEAEA]">{pkg.name}</div>
                    <div className="text-[10px] text-[#88888C] capitalize">
                      {pkg.tier} - {pkg.billingCycle}
                    </div>
                  </div>
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#F2A900]/20 text-[#F2A900]">
                    Available
                  </span>
                </div>
                <div className="text-[#F2A900] font-bold text-sm mb-2">${pkg.price.toFixed(0)}</div>
                <div className="flex flex-wrap gap-1 mb-3">
                  {pkg.includedServices.map((service, idx) => (
                    <span key={idx} className="px-1.5 py-0.5 rounded text-[10px] bg-[#005F73]/20 text-[#005F73]">
                      {service}
                    </span>
                  ))}
                </div>
                <Button
                  size="sm"
                  onClick={() => handlePackagePurchase(pkg.id, pkg.name)}
                  disabled={purchaseProcessing && selectedPackage === pkg.id}
                  className="h-6 text-[10px] bg-[#F2A900] hover:bg-[#F2A900]/80 text-[#050505] font-semibold px-3"
                >
                  {purchaseProcessing && selectedPackage === pkg.id ? (
                    <Clock className="w-3 h-3 animate-spin" />
                  ) : (
                    <>
                      <CreditCard className="w-3 h-3 mr-1" />
                      Purchase
                    </>
                  )}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {purchaseSuccess && (
        <div className="fixed bottom-4 right-4 px-4 py-3 rounded bg-[#10B981]/20 border border-[#10B981]/30 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
          <span className="text-sm text-[#10B981] font-medium">{purchaseSuccess}</span>
        </div>
      )}
    </div>
  );
}
