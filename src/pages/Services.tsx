import { useState, useCallback, useEffect } from "react";
import { useLocation } from "react-router";
import { useOperationsStore } from "@/stores/useOperationsStore";
import { useCRMStore } from "@/stores/useCRMStore";
import { useAuthStore } from "@/stores/useAuthStore";
import type { ServiceType, Equipment, ServiceRecord, Client } from "@/types";
import { QRCodeSVG } from "qrcode.react";
import {
  Search,
  QrCode,
  Upload,
  Camera,
  Wrench,
  FileText,
  Printer,
  X,
  CheckCircle2,
  AlertTriangle,
  Package,
  ChevronDown,
  ChevronUp,
  PenTool,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type TabType = "equipment" | "reports" | "new";

export default function Services() {
  const { user } = useAuthStore();
  const { clients } = useCRMStore();
  const {
    equipment,
    serviceRecords,
    servicePhotos,
    addServiceRecord,
    getServiceHistory,
  } = useOperationsStore();
  const [activeTab, setActiveTab] = useState<TabType>("equipment");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEquipment, setSelectedEquipment] = useState<number | null>(null);
  const [qrSerial, setQrSerial] = useState("");
  const [showQR, setShowQR] = useState(false);

  // Form state
  const [formClientId, setFormClientId] = useState("");
  const [formEquipmentId, setFormEquipmentId] = useState("");
  const [formType, setFormType] = useState<ServiceType>("pms");
  const [formTechnician, setFormTechnician] = useState(user?.name || "");
  const [formDescription, setFormDescription] = useState("");
  const [formFindings, setFormFindings] = useState("");
  const [formWorkDone, setFormWorkDone] = useState("");
  const [formRecommendation, setFormRecommendation] = useState("");
  const [formParts, setFormParts] = useState("");
  const [formClientSign, setFormClientSign] = useState("");
  const [formTechSign, setFormTechSign] = useState("");
  const [beforePhotos, setBeforePhotos] = useState<string[]>([]);
  const [afterPhotos, setAfterPhotos] = useState<string[]>([]);
  const [showReport, setShowReport] = useState<ServiceRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  const location = useLocation();

  useEffect(() => {
    const state = location.state as { selectedUnitId?: number };
    if (state?.selectedUnitId) {
      setSelectedEquipment(state.selectedUnitId);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const filteredEquipment = equipment.filter(
    (eq: Equipment) =>
      searchQuery === "" ||
      eq.unitId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      eq.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      eq.serialNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handlePhotoUpload = useCallback(
    (type: "before" | "after", event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files) return;
      Array.from(files).forEach((file: File) => {
        const reader = new FileReader();
        reader.onload = (e: ProgressEvent<FileReader>) => {
          const url = e.target?.result as string;
          if (type === "before") {
            setBeforePhotos((prev) => [...prev, url]);
          } else {
            setAfterPhotos((prev) => [...prev, url]);
          }
        };
        reader.readAsDataURL(file);
      });
    },
    []
  );

  const handleSubmitReport = () => {
    setError(null);
    
    // Rule: Must have before and after photos to complete
    if (beforePhotos.length === 0 || afterPhotos.length === 0) {
      setError("Technician Rule: You must upload at least one BEFORE and one AFTER photo to complete this service.");
      return;
    }

    if (!formClientId || !formEquipmentId || !formDescription || !formClientSign || !formTechSign) {
      setError("Please fill all required fields, including signatures.");
      return;
    }

    const newRecordId = Date.now();
    const record = {
      equipmentId: parseInt(formEquipmentId),
      clientId: parseInt(formClientId),
      technician: formTechnician,
      serviceType: formType,
      description: formDescription,
      findings: formFindings,
      workDone: formWorkDone,
      recommendation: formRecommendation,
      hoursAtService: equipment.find((e) => e.id === parseInt(formEquipmentId))?.currentHours || 0,
      partsUsed: formParts,
      status: "completed" as const,
      scheduledDate: new Date().toISOString(),
      completedDate: new Date().toISOString(),
      cost: Math.floor(Math.random() * 800) + 150,
      clientSignature: formClientSign,
      techSignature: formTechSign,
    };
    
    // 1. Add the record
    addServiceRecord({ ...record });
    
    // 2. Add the photos associated with this record
    beforePhotos.forEach(url => {
      useOperationsStore.getState().addServicePhoto({
        serviceRecordId: newRecordId,
        type: "before",
        url,
        caption: "Before service photo",
      });
    });

    afterPhotos.forEach(url => {
      useOperationsStore.getState().addServicePhoto({
        serviceRecordId: newRecordId,
        type: "after",
        url,
        caption: "After service photo",
      });
    });

    // 3. Automated Visit Tracking (Module 8 Connection)
    // Decrement the visits remaining for the client's package
    useBillingStore.getState().decrementPackageVisits(parseInt(formClientId), formType);
    
    // Reset form
    setFormClientId("");
    setFormEquipmentId("");
    setFormDescription("");
    setFormFindings("");
    setFormWorkDone("");
    setFormRecommendation("");
    setFormParts("");
    setFormClientSign("");
    setFormTechSign("");
    setBeforePhotos([]);
    setAfterPhotos([]);
    setError(null);
    setActiveTab("reports");
  };

  const handlePrintReport = () => {
    window.print();
  };

  const statusColors: Record<string, string> = {
    active: "bg-[#10B981]/20 text-[#10B981]",
    inactive: "bg-[#EF4444]/20 text-[#EF4444]",
    maintenance: "bg-[#F2A900]/20 text-[#F2A900]",
    retired: "bg-[#88888C]/20 text-[#88888C]",
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[32px] font-bold text-[#EAEAEA] tracking-[-0.02em]">Services</h1>
          <p className="text-sm text-[#88888C] mt-0.5">Equipment, service records &amp; PMS</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/5">
        {[
          { id: "equipment" as TabType, label: "Equipment", icon: Package },
          { id: "reports" as TabType, label: "Service Reports", icon: FileText },
          { id: "new" as TabType, label: "New Report", icon: Wrench },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-all border-b-2 ${
              activeTab === tab.id
                ? "border-[#F2A900] text-[#F2A900] bg-[#F2A900]/5"
                : "border-transparent text-[#88888C] hover:text-[#EAEAEA]"
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Equipment Tab */}
      {activeTab === "equipment" && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#88888C]" />
              <Input
                placeholder="Search equipment..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 bg-[#1A1A20] border-white/10 text-[#EAEAEA] text-xs"
              />
            </div>
          </div>

          <div className="data-card overflow-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[#0A0A0C]">
                  <th className="text-left py-2.5 px-3 text-[#88888C] font-medium">Unit ID</th>
                  <th className="text-left py-2.5 px-3 text-[#88888C] font-medium">Type</th>
                  <th className="text-left py-2.5 px-3 text-[#88888C] font-medium">Serial</th>
                  <th className="text-left py-2.5 px-3 text-[#88888C] font-medium">Client</th>
                  <th className="text-left py-2.5 px-3 text-[#88888C] font-medium">Status</th>
                  <th className="text-left py-2.5 px-3 text-[#88888C] font-medium">Hours</th>
                  <th className="text-left py-2.5 px-3 text-[#88888C] font-medium">Next Service</th>
                </tr>
              </thead>
              <tbody>
                {filteredEquipment.map((eq) => {
                  const client = clients.find((c) => c.id === eq.clientId);
                  const serviceDue = eq.currentHours >= eq.nextServiceDue;
                  return (
                    <tr
                      key={eq.id}
                      className="grid-table-row border-b border-[#2A2A30] cursor-pointer hover:bg-[#2A2A30]"
                      onClick={() => setSelectedEquipment(selectedEquipment === eq.id ? null : eq.id)}
                    >
                      <td className="py-2.5 px-3 text-[#EAEAEA] font-mono-tech font-bold">{eq.unitId}</td>
                      <td className="py-2.5 px-3 text-[#EAEAEA]">{eq.type}</td>
                      <td className="py-2.5 px-3 text-[#88888C] font-mono-tech">{eq.serialNumber}</td>
                      <td className="py-2.5 px-3 text-[#EAEAEA]">{client?.companyName || "—"}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${statusColors[eq.status]}`}>
                          {eq.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`font-mono-tech ${serviceDue ? "text-[#EF4444]" : "text-[#EAEAEA]"}`}>
                          {eq.currentHours}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`font-mono-tech ${serviceDue ? "text-[#EF4444]" : "text-[#88888C]"}`}>
                          {eq.nextServiceDue}h
                          {serviceDue && <AlertTriangle className="w-3 h-3 inline ml-1 text-[#EF4444]" />}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {selectedEquipment && (
            <EquipmentDetail
              equipment={equipment.find((eqItem: Equipment) => eqItem.id === selectedEquipment)!}
              client={clients.find((c: Client) => c.id === equipment.find((eqItem: Equipment) => eqItem.id === selectedEquipment)?.clientId)}
              serviceHistory={getServiceHistory(selectedEquipment)}
              photos={servicePhotos}
              onViewReport={(record) => setShowReport(record)}
            />
          )}
        </div>
      )}

      {/* Reports Tab */}
      {activeTab === "reports" && (
        <div className="space-y-3">
          <div className="data-card overflow-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[#0A0A0C]">
                  <th className="text-left py-2.5 px-3 text-[#88888C] font-medium">ID</th>
                  <th className="text-left py-2.5 px-3 text-[#88888C] font-medium">Equipment</th>
                  <th className="text-left py-2.5 px-3 text-[#88888C] font-medium">Type</th>
                  <th className="text-left py-2.5 px-3 text-[#88888C] font-medium">Technician</th>
                  <th className="text-left py-2.5 px-3 text-[#88888C] font-medium">Date</th>
                  <th className="text-left py-2.5 px-3 text-[#88888C] font-medium">Status</th>
                  <th className="text-left py-2.5 px-3 text-[#88888C] font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {serviceRecords.map((record: ServiceRecord) => {
                  const eq = equipment.find((eqItem: Equipment) => eqItem.id === record.equipmentId);
                  return (
                    <tr key={record.id} className="grid-table-row border-b border-[#2A2A30]">
                      <td className="py-2.5 px-3 text-[#88888C] font-mono-tech">#{record.id}</td>
                      <td className="py-2.5 px-3 text-[#EAEAEA] font-mono-tech">{eq?.unitId || "—"}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#005F73]/20 text-[#005F73] uppercase">
                          {record.serviceType}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-[#EAEAEA]">{record.technician}</td>
                      <td className="py-2.5 px-3 text-[#88888C] font-mono-tech">
                        {record.completedDate ? new Date(record.completedDate).toLocaleDateString() : "—"}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="bg-[#10B981]/20 text-[#10B981] px-1.5 py-0.5 rounded text-[10px] font-medium uppercase">
                          {record.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowReport(record)}
                          className="h-6 text-[10px] text-[#88888C] hover:text-[#F2A900]"
                        >
                          <FileText className="w-3 h-3 mr-1" />
                          View
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* New Report Tab */}
      {activeTab === "new" && (
        <div className="max-w-4xl space-y-4">
          {error && (
            <div className="p-3 rounded bg-[#EF4444]/10 border border-[#EF4444]/20 flex items-center gap-2 text-[#EF4444] text-xs font-bold">
              <AlertTriangle className="w-4 h-4" />
              {error}
            </div>
          )}

          <div className="data-card p-5 space-y-6">
            <h3 className="text-base font-bold text-[#EAEAEA] flex items-center gap-2">
              <Wrench className="w-4 h-4 text-[#F2A900]" />
              Technician Service Logging
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] text-[#88888C] uppercase tracking-wider mb-1 block font-bold">Client</label>
                  <Select value={formClientId} onValueChange={setFormClientId}>
                    <SelectTrigger className="h-9 bg-[#1A1A20] border-white/10 text-[#EAEAEA] text-xs">
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1A1A20] border-white/10">
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={c.id.toString()} className="text-xs text-[#EAEAEA]">
                          {c.companyName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-[10px] text-[#88888C] uppercase tracking-wider mb-1 block font-bold">Equipment</label>
                  <Select value={formEquipmentId} onValueChange={setFormEquipmentId}>
                    <SelectTrigger className="h-9 bg-[#1A1A20] border-white/10 text-[#EAEAEA] text-xs">
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1A1A20] border-white/10">
                      {equipment
                        .filter((eqItem: Equipment) => !formClientId || eqItem.clientId === parseInt(formClientId))
                        .map((eqItem: Equipment) => (
                          <SelectItem key={eqItem.id} value={eqItem.id.toString()} className="text-xs text-[#EAEAEA]">
                            {eqItem.unitId} — {eqItem.type}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] text-[#88888C] uppercase tracking-wider mb-1 block font-bold">Service Type</label>
                  <Select value={formType} onValueChange={(v) => setFormType(v as ServiceType)}>
                    <SelectTrigger className="h-9 bg-[#1A1A20] border-white/10 text-[#EAEAEA] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1A1A20] border-white/10">
                      <SelectItem value="pms" className="text-xs text-[#EAEAEA]">PMS (Preventative Maintenance)</SelectItem>
                      <SelectItem value="calibration" className="text-xs text-[#EAEAEA]">Calibration</SelectItem>
                      <SelectItem value="repair" className="text-xs text-[#EAEAEA]">Repair</SelectItem>
                      <SelectItem value="inspection" className="text-xs text-[#EAEAEA]">Inspection</SelectItem>
                      <SelectItem value="installation" className="text-xs text-[#EAEAEA]">Installation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-[10px] text-[#88888C] uppercase tracking-wider mb-1 block font-bold">Technician</label>
                  <Input
                    value={formTechnician}
                    onChange={(e) => setFormTechnician(e.target.value)}
                    className="h-9 bg-[#1A1A20] border-white/10 text-[#EAEAEA] text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-1 space-y-4">
                <div>
                  <label className="text-[10px] text-[#88888C] uppercase tracking-wider mb-1 block font-bold">Findings</label>
                  <textarea
                    value={formFindings}
                    onChange={(e) => setFormFindings(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 rounded bg-[#1A1A20] border border-white/10 text-[#EAEAEA] text-xs focus:outline-none focus:border-[#F2A900]/50 resize-none"
                    placeholder="Describe initial state & faults..."
                  />
                </div>
              </div>
              <div className="col-span-1 space-y-4">
                <div>
                  <label className="text-[10px] text-[#88888C] uppercase tracking-wider mb-1 block font-bold">Work Performed</label>
                  <textarea
                    value={formWorkDone}
                    onChange={(e) => setFormWorkDone(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 rounded bg-[#1A1A20] border border-white/10 text-[#EAEAEA] text-xs focus:outline-none focus:border-[#F2A900]/50 resize-none"
                    placeholder="List all actions taken..."
                  />
                </div>
              </div>
              <div className="col-span-1 space-y-4">
                <div>
                  <label className="text-[10px] text-[#88888C] uppercase tracking-wider mb-1 block font-bold">Recommendation</label>
                  <textarea
                    value={formRecommendation}
                    onChange={(e) => setFormRecommendation(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 rounded bg-[#1A1A20] border border-white/10 text-[#EAEAEA] text-xs focus:outline-none focus:border-[#F2A900]/50 resize-none"
                    placeholder="Advise on future maintenance..."
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] text-[#88888C] uppercase tracking-wider mb-1 block font-bold">Overall Summary</label>
                <Input
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="General summary of the service visit"
                  className="h-9 bg-[#1A1A20] border-white/10 text-[#EAEAEA] text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] text-[#88888C] uppercase tracking-wider mb-1 block font-bold">Parts Used</label>
                <Input
                  value={formParts}
                  onChange={(e) => setFormParts(e.target.value)}
                  placeholder="Serial numbers or names of replaced parts"
                  className="h-9 bg-[#1A1A20] border-white/10 text-[#EAEAEA] text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <PhotoDropzone
                label="BEFORE"
                photos={beforePhotos}
                onUpload={(e) => handlePhotoUpload("before", e)}
                onRemove={(idx) => setBeforePhotos((prev) => prev.filter((_, i) => i !== idx))}
              />
              <PhotoDropzone
                label="AFTER"
                photos={afterPhotos}
                onUpload={(e) => handlePhotoUpload("after", e)}
                onRemove={(idx) => setBeforePhotos((prev) => prev.filter((_, i) => i !== idx))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-6">
              <div className="space-y-2">
                <label className="text-[10px] text-[#88888C] uppercase tracking-wider block font-bold">Technician Signature</label>
                <div className="relative group">
                  <Input
                    placeholder="Type name to sign"
                    value={formTechSign}
                    onChange={(e) => setFormTechSign(e.target.value)}
                    className="h-10 bg-[#1A1A20] border-white/10 text-[#EAEAEA] font-mono-tech italic"
                  />
                  <PenTool className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#88888C]/30" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] text-[#88888C] uppercase tracking-wider block font-bold">Client Confirmation Signature</label>
                <div className="relative group">
                  <Input
                    placeholder="Type name to sign"
                    value={formClientSign}
                    onChange={(e) => setFormClientSign(e.target.value)}
                    className="h-10 bg-[#1A1A20] border-white/10 text-[#EAEAEA] font-mono-tech italic"
                  />
                  <PenTool className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#88888C]/30" />
                </div>
              </div>
            </div>

            <Button
              onClick={handleSubmitReport}
              className="w-full h-12 bg-[#F2A900] hover:bg-[#F2A900]/80 text-[#050505] font-bold text-base shadow-[0_4px_20px_-5px_rgba(242,169,0,0.3)] transition-all"
            >
              <CheckCircle2 className="w-5 h-5 mr-2" />
              Finalize & Complete Service
            </Button>
          </div>
        </div>
      )}

      {/* Service Report Dialog */}
      <Dialog open={!!showReport} onOpenChange={() => setShowReport(null)}>
        <DialogContent className="bg-[#0A0A0C] border-white/10 max-w-4xl max-h-[95vh] overflow-auto scrollbar-hide">
          {showReport && (
            <ServiceReportView
              record={showReport}
              equipment={equipment.find((eqItem: Equipment) => eqItem.id === showReport.equipmentId)}
              client={clients.find((c: Client) => c.id === showReport.clientId)}
              photos={servicePhotos.filter((p: { serviceRecordId: number }) => p.serviceRecordId === showReport.id)}
              onPrint={handlePrintReport}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PhotoDropzone({
  label,
  photos,
  onUpload,
  onRemove,
}: {
  label: string;
  photos: string[];
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: (idx: number) => void;
}) {
  const color = label === "BEFORE" ? "#F2A900" : "#10B981";
  return (
    <div
      className="border-2 border-dashed rounded p-3 bg-white/5"
      style={{ borderColor: photos.length > 0 ? `${color}40` : "#88888C40" }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold tracking-wider" style={{ color }}>
          {label} PHOTOS
        </span>
        <span className="text-[10px] text-[#88888C] font-mono-tech">{photos.length} uploaded</span>
      </div>
      {photos.length === 0 ? (
        <label className="flex flex-col items-center justify-center py-8 cursor-pointer hover:bg-white/5 rounded transition-colors group">
          <Camera className="w-8 h-8 text-[#88888C] mb-2 group-hover:text-[#EAEAEA] transition-colors" />
          <span className="text-[10px] text-[#88888C] group-hover:text-[#EAEAEA]">Required: Tap to upload</span>
          <input type="file" accept="image/*" multiple className="hidden" onChange={onUpload} />
        </label>
      ) : (
        <div className="space-y-1.5">
          <div className="grid grid-cols-3 gap-1.5">
            {photos.map((photo, idx) => (
              <div key={idx} className="relative group aspect-square">
                <img src={photo} alt={`${label} ${idx}`} className="w-full h-full object-cover rounded" />
                <button
                  onClick={() => onRemove(idx)}
                  className="absolute top-1 right-1 w-5 h-5 bg-[#EF4444] rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ))}
          </div>
          <label className="flex items-center justify-center py-2 cursor-pointer hover:bg-white/10 rounded transition-colors">
            <Upload className="w-3 h-3 text-[#88888C] mr-1" />
            <span className="text-[10px] text-[#88888C]">Add more</span>
            <input type="file" accept="image/*" multiple className="hidden" onChange={onUpload} />
          </label>
        </div>
      )}
    </div>
  );
}

function EquipmentDetail({
  equipment,
  client,
  serviceHistory,
  photos,
  onViewReport,
}: {
  equipment: Equipment;
  client?: Client;
  serviceHistory: ServiceRecord[];
  photos: Array<{ serviceRecordId: number; type: string; url: string }>;
  onViewReport: (record: ServiceRecord) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const eqPhotos = photos.filter((p) => serviceHistory.some((s) => s.id === p.serviceRecordId));

  return (
    <div className="data-card p-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-[#EAEAEA]">{equipment.unitId}</span>
          <span className="text-xs text-[#88888C]">{equipment.type}</span>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-[#88888C]" /> : <ChevronDown className="w-4 h-4 text-[#88888C]" />}
      </button>

      {expanded && (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-4 gap-4 text-xs">
            <div>
              <div className="text-[10px] text-[#88888C] uppercase font-bold mb-0.5">Manufacturer</div>
              <div className="text-[#EAEAEA]">{equipment.manufacturer}</div>
            </div>
            <div>
              <div className="text-[10px] text-[#88888C] uppercase font-bold mb-0.5">Model</div>
              <div className="text-[#EAEAEA]">{equipment.model}</div>
            </div>
            <div>
              <div className="text-[10px] text-[#88888C] uppercase font-bold mb-0.5">Serial</div>
              <div className="text-[#EAEAEA] font-mono-tech">{equipment.serialNumber}</div>
            </div>
            <div>
              <div className="text-[10px] text-[#88888C] uppercase font-bold mb-0.5">Status</div>
              <span className="px-1.5 py-0.5 rounded bg-[#10B981]/20 text-[#10B981] text-[9px] font-bold uppercase">
                {equipment.status}
              </span>
            </div>
          </div>

          <div>
            <div className="text-[10px] text-[#88888C] uppercase font-bold mb-2">Service History ({serviceHistory.length})</div>
            <div className="space-y-1.5">
              {serviceHistory.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between p-2.5 rounded bg-[#1A1A20] hover:bg-[#2A2A30] cursor-pointer transition-colors border border-white/5"
                  onClick={() => onViewReport(record)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-[#F2A900]/10 flex items-center justify-center">
                      <Wrench className="w-4 h-4 text-[#F2A900]" />
                    </div>
                    <div>
                      <div className="text-xs text-[#EAEAEA] font-bold capitalize">{record.serviceType}</div>
                      <div className="text-[10px] text-[#88888C]">{record.technician} • {record.completedDate ? new Date(record.completedDate).toLocaleDateString() : "—"}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-[#F2A900] font-mono-tech font-bold">${record.cost.toFixed(2)}</div>
                    <span className="text-[9px] text-[#10B981] font-bold uppercase tracking-wider">Completed</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ServiceReportView({
  record,
  equipment,
  client,
  photos,
  onPrint,
}: {
  record: ServiceRecord;
  equipment?: Equipment;
  client?: Client;
  photos: Array<{ type: string; url: string; caption: string }>;
  onPrint: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div>
          <h2 className="text-xl font-bold text-[#EAEAEA]">Digital Service Report</h2>
          <p className="text-xs text-[#88888C] mt-1">Generated by NexTOS Enterprise</p>
        </div>
        <Button
          onClick={onPrint}
          className="bg-white/5 hover:bg-white/10 text-white h-9 px-4 border border-white/10"
        >
          <Printer className="w-4 h-4 mr-2" />
          Print Report
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-8">
        <div className="space-y-4">
          <section>
            <h4 className="text-[10px] font-bold text-[#F2A900] uppercase tracking-widest mb-2">Customer & Asset</h4>
            <div className="data-card p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-[11px] text-[#88888C]">Client:</span>
                <span className="text-[11px] text-[#EAEAEA] font-bold">{client?.companyName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[11px] text-[#88888C]">Equipment:</span>
                <span className="text-[11px] text-[#EAEAEA]">{equipment?.unitId} ({equipment?.type})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[11px] text-[#88888C]">Serial:</span>
                <span className="text-[11px] text-[#EAEAEA] font-mono-tech">{equipment?.serialNumber}</span>
              </div>
            </div>
          </section>

          <section>
            <h4 className="text-[10px] font-bold text-[#F2A900] uppercase tracking-widest mb-2">Service Details</h4>
            <div className="data-card p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-[11px] text-[#88888C]">Type:</span>
                <span className="text-[11px] text-[#EAEAEA] font-bold uppercase">{record.serviceType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[11px] text-[#88888C]">Technician:</span>
                <span className="text-[11px] text-[#EAEAEA]">{record.technician}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[11px] text-[#88888C]">Date:</span>
                <span className="text-[11px] text-[#EAEAEA]">{record.completedDate ? new Date(record.completedDate).toLocaleDateString() : "—"}</span>
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-4">
          <section>
            <h4 className="text-[10px] font-bold text-[#F2A900] uppercase tracking-widest mb-2">Technical Summary</h4>
            <div className="data-card p-4 space-y-4">
              <div>
                <span className="text-[10px] text-[#88888C] uppercase font-bold mb-1 block">Findings:</span>
                <p className="text-xs text-[#EAEAEA] leading-relaxed">{record.findings || "No findings recorded."}</p>
              </div>
              <div>
                <span className="text-[10px] text-[#88888C] uppercase font-bold mb-1 block">Work Performed:</span>
                <p className="text-xs text-[#EAEAEA] leading-relaxed">{record.workDone || record.description}</p>
              </div>
              <div>
                <span className="text-[10px] text-[#88888C] uppercase font-bold mb-1 block">Recommendation:</span>
                <p className="text-xs text-[#EAEAEA] leading-relaxed italic">{record.recommendation || "Maintain regular schedule."}</p>
              </div>
            </div>
          </section>
        </div>
      </div>

      <section>
        <h4 className="text-[10px] font-bold text-[#F2A900] uppercase tracking-widest mb-3">Documentation Photos</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <span className="text-[9px] font-bold text-[#F2A900] tracking-widest">BEFORE PHOTOS</span>
            <div className="grid grid-cols-2 gap-2">
              {photos.filter(p => p.type === 'before').map((p, i) => (
                <img key={i} src={p.url} className="w-full h-32 object-cover rounded border border-white/5" alt="Before" />
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <span className="text-[9px] font-bold text-[#10B981] tracking-widest">AFTER PHOTOS</span>
            <div className="grid grid-cols-2 gap-2">
              {photos.filter(p => p.type === 'after').map((p, i) => (
                <img key={i} src={p.url} className="w-full h-32 object-cover rounded border border-white/5" alt="After" />
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-8 border-t border-white/5 pt-6">
        <div className="space-y-2">
          <span className="text-[10px] text-[#88888C] uppercase font-bold block">Technician E-Signature</span>
          <div className="p-4 bg-[#1A1A20] rounded border border-white/5">
            <div className="text-xl font-mono-tech italic text-[#EAEAEA] tracking-wide">{record.techSignature}</div>
            <div className="text-[9px] text-[#88888C] mt-2 border-t border-white/5 pt-1 uppercase">Digitally Verified Technician</div>
          </div>
        </div>
        <div className="space-y-2">
          <span className="text-[10px] text-[#88888C] uppercase font-bold block">Client Approval Signature</span>
          <div className="p-4 bg-[#1A1A20] rounded border border-white/5">
            <div className="text-xl font-mono-tech italic text-[#EAEAEA] tracking-wide">{record.clientSignature}</div>
            <div className="text-[9px] text-[#88888C] mt-2 border-t border-white/5 pt-1 uppercase">Confirmed by Client Representative</div>
          </div>
        </div>
      </div>
    </div>
  );
}
