import React, { useState } from "react";
import { useAuthStore } from "@/features/auth/useAuthStore";
import { useOperationsStore } from "@/stores/useOperationsStore";
import { useClientPortalStore } from "@/features/client-portal/client.store";
import seedData from "@/data/seed-data.json";
import {
  Package,
  ChevronDown,
  ChevronUp,
  Wrench,
  FileText,
  Search,
  CheckCircle2,
  Activity,
  Wallet,
  Printer,
} from "lucide-react";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";

function QRModal({
  equipment,
  isOpen,
  onClose,
}: {
  equipment: any;
  isOpen: boolean;
  onClose: () => void;
}) {
  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const qrSvg = document.getElementById(`qr-gen-${equipment.id}`)?.outerHTML;

    printWindow.document.write(`
      <html>
        <head>
          <title>Print QR Tag - ${equipment.name ?? equipment.serialNumber}</title>
          <style>
            @page { size: auto; margin: 0; }
            body { 
              font-family: 'Inter', sans-serif; 
              display: flex; 
              flex-direction: column; 
              align-items: center; 
              justify-content: center; 
              height: 100vh; 
              margin: 0; 
              padding: 20px;
              text-align: center;
            }
            .tag-container {
              border: 2px solid #000;
              padding: 30px;
              border-radius: 20px;
              width: 300px;
            }
            .brand { font-weight: 900; font-size: 24px; margin-bottom: 5px; color: #66B2B2; }
            .unit-id { font-weight: 800; font-size: 32px; margin-bottom: 20px; letter-spacing: -0.05em; }
            .qr-wrapper { margin-bottom: 20px; }
            .meta { font-size: 12px; color: #666; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; }
            svg { width: 200px; height: 200px; }
          </style>
        </head>
        <body>
          <div class="tag-container">
            <div class="brand">NexTOS</div>
            <div class="unit-id">${equipment.name ?? equipment.id}</div>
            <div class="qr-wrapper">${qrSvg}</div>
            <div class="meta">${equipment.equipmentType}</div>
            <div class="meta" style="margin-top: 4px;">SN: ${equipment.serialNumber}</div>
          </div>
          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => window.close(), 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="bg-white border-gray-200 sm:max-w-md rounded-[2.5rem] shadow-2xl p-8">
        <DialogHeader className="items-center pb-4">
          <DialogTitle className="text-2xl font-black tracking-tighter text-gray-900">
            Equipment QR Tag
          </DialogTitle>
          <p className="text-sm text-gray-500 font-medium">
            Digital Identity for {equipment.name ?? equipment.id}
          </p>
        </DialogHeader>

        <div className="flex flex-col items-center gap-8 py-4">
          <div className="relative group">
            <div className="absolute -inset-4 bg-gradient-to-br from-[#66B2B2]/20 to-[#10B981]/20 rounded-[2rem] blur-xl opacity-50 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative p-6 bg-white rounded-[2rem] border-2 border-gray-50 shadow-sm flex items-center justify-center">
              <QRCodeSVG
                id={`qr-gen-${equipment.id}`}
                value={JSON.stringify({
                  id: equipment.id,
                  name: equipment.name,
                  serialNumber: equipment.serialNumber,
                  type: "EQUIPMENT_TAG",
                })}
                size={220}
                level="H"
                includeMargin={false}
              />
            </div>
          </div>

          <div className="text-center space-y-1">
            <h3 className="text-xl font-bold text-gray-900 font-mono-tech uppercase tracking-tight">
              {equipment.unitId}
            </h3>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">
              {equipment.manufacturer} {equipment.model}
            </p>
          </div>

          <div className="w-full grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="h-12 rounded-2xl font-black border-gray-200 text-gray-500 hover:bg-gray-50"
            >
              Close
            </Button>
            <Button
              onClick={handlePrint}
              className="h-12 rounded-2xl font-black bg-[#66B2B2] text-white hover:bg-[#5A9E9E] shadow-lg shadow-[#66B2B2]/20 transition-all active:scale-95"
            >
              <Printer className="w-4 h-4 mr-2" />
              Print Tag
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function KPICard({
  title,
  value,
  subtext,
  icon: Icon,
  colorClass,
  iconBgClass,
}: {
  title: string;
  value: string | number;
  subtext: string;
  icon: any;
  colorClass: string;
  iconBgClass: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-xl bg-white border border-gray-200 p-4 shadow-sm transition-all duration-300 hover:border-[#66B2B2]/40 hover:-translate-y-1 hover:shadow-md">
      <div className="flex items-center justify-between relative z-10">
        <div>
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
            {title}
          </p>
          <h3 className="text-2xl font-bold text-gray-900 mt-1 font-mono-tech">
            {value}
          </h3>
          <p className="text-[10px] text-gray-500 mt-0.5">{subtext}</p>
        </div>
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center ${iconBgClass}`}
        >
          <Icon className={`w-5 h-5 ${colorClass}`} />
        </div>
      </div>
      <div className="absolute inset-0 bg-gradient-to-br from-[#66B2B2]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    </div>
  );
}

export default function ClientEquipment() {
  const { user } = useAuthStore();
  const { equipment, serviceRecords, servicePhotos } = useOperationsStore();
  const { selectedCompanyId } = useClientPortalStore();

  // Map seedData company ID to numeric clientId
  const selectedCompanyIndex = seedData.clients.findIndex(
    c => c.id === selectedCompanyId
  );
  const clientId =
    selectedCompanyIndex !== -1
      ? selectedCompanyIndex + 1
      : user?.clientId || 1;

  const [searchQuery, setSearchQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [qrModalItem, setQrModalItem] = useState<any | null>(null);

  // Metrics calculation
  const allEqRecords = serviceRecords.filter(r => r.clientId === clientId);
  const totalServices = allEqRecords.length;
  const completedServices = allEqRecords.filter(
    r => r.status === "completed"
  ).length;
  const inProgressServices = allEqRecords.filter(
    r => r.status === "in_progress" || r.status === "scheduled"
  ).length;
  const totalSpent = allEqRecords.reduce((sum, r) => sum + Number(r.cost), 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const clientEquipment = equipment.filter(
    e =>
      Number(String(e.clientId).replace(/\D/g, "")) === clientId &&
      (searchQuery === "" ||
        e.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.serialNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.id.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const statusBadge = (status: string) => {
    switch (status) {
      case "active":
        return "px-2 py-0.5 rounded text-sm bg-[#10B981]/20 text-[#10B981] font-medium";
      case "maintenance":
        return "px-2 py-0.5 rounded text-sm bg-[#66B2B2]/20 text-[#66B2B2] font-medium";
      case "inactive":
        return "px-2 py-0.5 rounded text-sm bg-[#6B7280]/20 text-gray-500 font-medium";
      case "retired":
        return "px-2 py-0.5 rounded text-sm bg-[#EF4444]/20 text-[#EF4444] font-medium";
      default:
        return "px-2 py-0.5 rounded text-sm bg-[#6B7280]/20 text-gray-500 font-medium";
    }
  };

  const parseH = (text: string) => {
    const m = String(text ?? "").match(/(\d+)\s*h/i);
    return m ? Number(m[1]) : 0;
  };

  const isServiceDue = (eq: any) => {
    const config = eq.pmsConfiguration?.[0];
    if (!config || config.serviceIntervalUnit?.toLowerCase() !== "hours")
      return false;
    return parseH(eq.hoursTotal ?? "0h 0m") >= config.serviceInterval;
  };

  return (
    <div className="space-y-6 px-8 pt-8 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[32px] font-bold text-gray-900 tracking-[-0.02em]">
            My Equipment
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {clientEquipment.length} units under management
          </p>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Total Services"
          value={totalServices}
          subtext="Lifetime fleet records"
          icon={Wrench}
          colorClass="text-[#66B2B2]"
          iconBgClass="bg-white shadow-sm"
        />
        <KPICard
          title="Completed"
          value={completedServices}
          subtext="Successful operations"
          icon={CheckCircle2}
          colorClass="text-[#059669]"
          iconBgClass="bg-white shadow-sm"
        />
        <KPICard
          title="In Progress"
          value={inProgressServices}
          subtext="Active service tickets"
          icon={Activity}
          colorClass="text-[#66B2B2]"
          iconBgClass="bg-white shadow-sm"
        />
        <KPICard
          title="Total Spent"
          value={formatCurrency(totalSpent)}
          subtext="Maintenance investment"
          icon={Wallet}
          colorClass="text-[#DC2626]"
          iconBgClass="bg-white shadow-sm"
        />
      </div>

      {/* Filter Bar */}
      <div className="flex items-center justify-between pt-2">
        <div className=" flex items-center gap-3 relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input
            placeholder="Search serial, model, or unit ID..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10 h-10 bg-white border-gray-200 text-gray-900 text-sm focus:border-[#10B981]/50 transition-colors"
          />
        </div>
      </div>

      <div className="space-y-3">
        {clientEquipment.map(eq => {
          const eqRecords = serviceRecords.filter(
            r => r.equipmentId === eq.id && r.clientId === clientId
          );
          const eqPhotos = servicePhotos.filter(p =>
            eqRecords.some(r => r.id === p.serviceRecordId)
          );
          const isExpanded = expanded === eq.id;
          const serviceDue = isServiceDue(eq);

          return (
            <div
              key={eq.id}
              className={`data-card transition-all duration-300 hover:border-[#10B981]/30`}
            >
              <button
                onClick={() => setExpanded(isExpanded ? null : eq.id)}
                className="w-full flex items-center justify-between p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded bg-white shadow-sm flex items-center justify-center">
                    <Package className="w-4 h-4 text-[#66B2B2]" />
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <span className="text-base lg:text-lg font-semibold text-gray-900 font-mono-tech">
                        {eq.name ?? eq.id}
                      </span>
                      <span className="text-xs text-gray-500">
                        {eq.equipmentType}
                      </span>
                      <span className={statusBadge(eq.status ?? "active")}>
                        {eq.status ?? "active"}
                      </span>
                    </div>
                    <div className="text-[10px] text-gray-500">
                      SN: {eq.serialNumber}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {serviceDue && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#EF4444]/20 text-[#EF4444] font-medium">
                      Service Due
                    </span>
                  )}
                  <span className="text-[10px] text-gray-500">
                    {eqRecords.length} services
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  )}
                </div>
              </button>

              {isExpanded && (
                <div className="px-6 pb-4 border-t border-gray-200 pt-3">
                  <div className="grid grid-cols-4 gap-2 mb-3 text-xs">
                    <div>
                      <div className="text-[10px] text-gray-500">Serial</div>
                      <div className="text-gray-900 font-mono-tech">
                        {eq.serialNumber}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-gray-500">
                        Hours Total
                      </div>
                      <div className="text-gray-900 font-mono-tech">
                        {eq.hoursTotal ?? "—"}
                      </div>
                    </div>
                    {eq.pmsConfiguration?.[0] && (
                      <div className="col-span-2">
                        <div className="flex justify-between items-center mb-1">
                          <div className="text-[10px] text-gray-500">
                            Usage Progress
                          </div>
                          <div className="text-[10px] text-gray-900 font-mono-tech">
                            {eq.hoursTotal ?? "0h"} /{" "}
                            {eq.pmsConfiguration[0].serviceInterval}
                            {eq.pmsConfiguration[0].serviceIntervalUnit}
                          </div>
                        </div>
                        <div className="h-1.5 bg-gray-50 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${serviceDue ? "bg-[#EF4444]" : "bg-[#66B2B2]"}`}
                            style={{
                              width: `${Math.min(100, (parseH(eq.hoursTotal ?? "0h 0m") / eq.pmsConfiguration[0].serviceInterval) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}
                    <div>
                      <div className="text-[10px] text-gray-500">
                        PMS Interval
                      </div>
                      <div className="text-gray-900 font-mono-tech">
                        {eq.pmsConfiguration?.[0]
                          ? `${eq.pmsConfiguration[0].serviceInterval} ${eq.pmsConfiguration[0].serviceIntervalUnit}`
                          : "—"}
                      </div>
                    </div>
                  </div>

                  {eqRecords.length > 0 && (
                    <div className="mb-3">
                      <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">
                        Service Records
                      </div>
                      <div className="space-y-1">
                        {eqRecords.map(record => (
                          <div
                            key={record.id}
                            className="p-2 rounded bg-gray-100 space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Wrench className="w-3 h-3 text-[#66B2B2]" />
                                <span className="text-xs text-gray-900">
                                  {record.serviceCategory}
                                </span>
                                <span className="text-[10px] text-gray-500">
                                  {record.technician}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-[#66B2B2] font-mono-tech">
                                  ₱{record.cost.toFixed(2)}
                                </span>
                                <span className="text-[10px] text-gray-500">
                                  {record.completedDate
                                    ? new Date(
                                        record.completedDate
                                      ).toLocaleDateString()
                                    : "—"}
                                </span>
                              </div>
                            </div>
                            {record.serviceCategory ===
                              "Lab Testing Service" && (
                              <div className="grid grid-cols-3 gap-2 px-5 py-1 border-t border-gray-200">
                                <div>
                                  <div className="text-[8px] text-gray-500 uppercase">
                                    Test Type
                                  </div>
                                  <div className="text-[10px] text-gray-900">
                                    {record.testType}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-[8px] text-gray-500 uppercase">
                                    Project
                                  </div>
                                  <div className="text-[10px] text-gray-900">
                                    {record.projectName}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-[8px] text-gray-500 uppercase">
                                    Status
                                  </div>
                                  <div className="text-[10px] text-[#10B981] font-bold uppercase">
                                    {record.labStatus}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {eqPhotos.length > 0 && (
                    <div>
                      <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">
                        Documentation
                      </div>
                      <div className="grid grid-cols-4 gap-1.5">
                        {eqPhotos.map((photo, idx) => (
                          <div key={idx} className="relative">
                            <img
                              src={photo.url}
                              alt={photo.caption}
                              className="w-full h-16 object-cover rounded"
                            />
                            <span
                              className={`absolute top-0.5 left-0.5 text-[8px] px-1 py-0.5 rounded font-medium ${photo.type === "before" ? "bg-[#66B2B2]/80 text-white" : "bg-[#10B981]/80 text-white"}`}
                            >
                              {photo.type}
                            </span>
                          </div>
                        ))}
                        {eqRecords.some(r => r.reportAttachment) && (
                          <div className="w-full h-16 rounded bg-[#66B2B2]/10 border border-[#66B2B2]/20 flex flex-col items-center justify-center gap-1 cursor-pointer hover:bg-[#66B2B2]/20 transition-colors">
                            <FileText className="w-4 h-4 text-[#66B2B2]" />
                            <span className="text-[8px] text-gray-900 font-medium">
                              View Report
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {qrModalItem && (
        <QRModal
          equipment={qrModalItem}
          isOpen={!!qrModalItem}
          onClose={() => setQrModalItem(null)}
        />
      )}
    </div>
  );
}
