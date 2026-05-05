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
  const [formParts, setFormParts] = useState("");
  const [beforePhotos, setBeforePhotos] = useState<string[]>([]);
  const [afterPhotos, setAfterPhotos] = useState<string[]>([]);
  const [showReport, setShowReport] = useState<ServiceRecord | null>(null);

  const location = useLocation();

  useEffect(() => {
    // Check if we arrived here via a scan redirect
    const state = location.state as { selectedUnitId?: number };
    if (state?.selectedUnitId) {
      setSelectedEquipment(state.selectedUnitId);
      // Optional: Clear the state so it doesn't re-select on refresh
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
    if (!formClientId || !formEquipmentId || !formDescription) return;
    const record = {
      equipmentId: parseInt(formEquipmentId),
      clientId: parseInt(formClientId),
      technician: formTechnician,
      serviceType: formType,
      description: formDescription,
      hoursAtService: equipment.find((e) => e.id === parseInt(formEquipmentId))?.currentHours || 0,
      partsUsed: formParts,
      status: "completed" as const,
      scheduledDate: new Date().toISOString(),
      completedDate: new Date().toISOString(),
      cost: Math.floor(Math.random() * 800) + 150,
    };
    addServiceRecord(record);
    // Reset form
    setFormClientId("");
    setFormEquipmentId("");
    setFormDescription("");
    setFormParts("");
    setBeforePhotos([]);
    setAfterPhotos([]);
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
            <Dialog open={showQR} onOpenChange={setShowQR}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (selectedEquipment) {
                      const eq = equipment.find(e => e.id === selectedEquipment);
                      if (eq) setQrSerial(eq.serialNumber);
                    }
                  }}
                  className="h-8 border-[#F2A900]/30 text-[#F2A900] hover:bg-[#F2A900]/10 text-xs"
                >
                  <QrCode className="w-3.5 h-3.5 mr-1" />
                  QR Generator
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#121214] border-[#F2A900]/20 max-w-sm">
                <DialogHeader>
                  <DialogTitle className="text-[#EAEAEA] text-base">Smart Asset QR Generator</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-[#88888C] uppercase tracking-wider">Asset Serial Number</label>
                    <Input
                      placeholder="Enter serial number"
                      value={qrSerial}
                      onChange={(e) => setQrSerial(e.target.value)}
                      className="bg-[#1A1A20] border-white/10 text-[#EAEAEA] text-xs"
                    />
                  </div>
                  {qrSerial && (
                    <div className="flex flex-col items-center gap-3 p-4 bg-white rounded qr-container">
                      <QRCodeSVG value={`${window.location.origin}/scan/${qrSerial}`} size={200} />
                      <div className="text-center">
                        <div className="text-[10px] text-[#050505] font-bold uppercase tracking-widest">NexTOS Smart Asset</div>
                        <div className="text-xs text-[#050505] font-mono-tech font-bold">{qrSerial}</div>
                      </div>
                    </div>
                  )}
                  <Button
                    onClick={() => {
                      const printWindow = window.open('', '_blank');
                      if (printWindow) {
                        printWindow.document.write(`
                          <html>
                            <head>
                              <title>Print QR Label</title>
                              <style>
                                body { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; font-family: monospace; }
                                .serial { margin-top: 10px; font-size: 20px; font-weight: bold; }
                              </style>
                            </head>
                            <body>
                              ${document.querySelector('.qr-container')?.innerHTML || ''}
                              <script>
                                window.onload = () => {
                                  window.print();
                                  window.close();
                                };
                              </script>
                            </body>
                          </html>
                        `);
                        printWindow.document.close();
                      }
                    }}
                    variant="outline"
                    size="sm"
                    className="w-full border-white/10 text-[#88888C] text-xs"
                  >
                    <Printer className="w-3 h-3 mr-1" />
                    Print Label
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
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

          {/* Equipment Detail */}
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
                  <th className="text-left py-2.5 px-3 text-[#88888C] font-medium">Cost</th>
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
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            record.status === "completed"
                              ? "bg-[#10B981]/20 text-[#10B981]"
                              : record.status === "in_progress"
                              ? "bg-[#F2A900]/20 text-[#F2A900]"
                              : "bg-[#005F73]/20 text-[#005F73]"
                          }`}
                        >
                          {record.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-[#F2A900] font-mono-tech">${record.cost.toFixed(2)}</td>
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
        <div className="max-w-3xl space-y-4">
          <div className="data-card p-4 space-y-4">
            <h3 className="text-base font-semibold text-[#EAEAEA]">New Service Report</h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-[#88888C] uppercase tracking-wider mb-1 block">Client</label>
                <Select value={formClientId} onValueChange={setFormClientId}>
                  <SelectTrigger className="h-8 bg-[#1A1A20] border-white/10 text-[#EAEAEA] text-xs">
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
                <label className="text-[10px] text-[#88888C] uppercase tracking-wider mb-1 block">Equipment</label>
                <Select value={formEquipmentId} onValueChange={setFormEquipmentId}>
                  <SelectTrigger className="h-8 bg-[#1A1A20] border-white/10 text-[#EAEAEA] text-xs">
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

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-[#88888C] uppercase tracking-wider mb-1 block">Service Type</label>
                <Select value={formType} onValueChange={(v) => setFormType(v as ServiceType)}>
                  <SelectTrigger className="h-8 bg-[#1A1A20] border-white/10 text-[#EAEAEA] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1A1A20] border-white/10">
                    <SelectItem value="pms" className="text-xs text-[#EAEAEA]">Preventative Maintenance</SelectItem>
                    <SelectItem value="installation" className="text-xs text-[#EAEAEA]">Installation</SelectItem>
                    <SelectItem value="repair" className="text-xs text-[#EAEAEA]">Repair</SelectItem>
                    <SelectItem value="inspection" className="text-xs text-[#EAEAEA]">Inspection</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[10px] text-[#88888C] uppercase tracking-wider mb-1 block">Technician</label>
                <Input
                  value={formTechnician}
                  onChange={(e) => setFormTechnician(e.target.value)}
                  className="h-8 bg-[#1A1A20] border-white/10 text-[#EAEAEA] text-xs"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] text-[#88888C] uppercase tracking-wider mb-1 block">Description</label>
              <textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 rounded bg-[#1A1A20] border border-white/10 text-[#EAEAEA] text-xs focus:outline-none focus:border-[#F2A900]/50 resize-none"
                placeholder="Describe the work performed..."
              />
            </div>

            <div>
              <label className="text-[10px] text-[#88888C] uppercase tracking-wider mb-1 block">Parts Used</label>
              <Input
                value={formParts}
                onChange={(e) => setFormParts(e.target.value)}
                placeholder="List parts and materials..."
                className="h-8 bg-[#1A1A20] border-white/10 text-[#EAEAEA] text-xs"
              />
            </div>

            {/* Photo Uploads */}
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
                onRemove={(idx) => setAfterPhotos((prev) => prev.filter((_, i) => i !== idx))}
              />
            </div>

            <Button
              onClick={handleSubmitReport}
              disabled={!formClientId || !formEquipmentId || !formDescription}
              className="w-full h-9 bg-[#F2A900] hover:bg-[#F2A900]/80 text-[#050505] font-bold text-sm disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              Submit Report
            </Button>
          </div>
        </div>
      )}

      {/* Service Report Dialog */}
      <Dialog open={!!showReport} onOpenChange={() => setShowReport(null)}>
        <DialogContent className="bg-[#121214] border-white/10 max-w-2xl max-h-[90vh] overflow-auto">
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
      className="border-2 border-dashed rounded p-3"
      style={{ borderColor: photos.length > 0 ? `${color}40` : "#88888C40" }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold tracking-wider" style={{ color }}>
          {label} PHOTOS
        </span>
        <span className="text-[10px] text-[#88888C]">{photos.length} uploaded</span>
      </div>
      {photos.length === 0 ? (
        <label className="flex flex-col items-center justify-center py-6 cursor-pointer hover:bg-white/5 rounded transition-colors">
          <Camera className="w-6 h-6 text-[#88888C] mb-1" />
          <span className="text-[10px] text-[#88888C]">Click to upload photos</span>
          <input type="file" accept="image/*" multiple className="hidden" onChange={onUpload} />
        </label>
      ) : (
        <div className="space-y-1.5">
          <div className="grid grid-cols-3 gap-1.5">
            {photos.map((photo, idx) => (
              <div key={idx} className="relative group">
                <img src={photo} alt={`${label} ${idx}`} className="w-full h-16 object-cover rounded" />
                <button
                  onClick={() => onRemove(idx)}
                  className="absolute top-0.5 right-0.5 w-4 h-4 bg-[#EF4444] rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-2.5 h-2.5 text-white" />
                </button>
              </div>
            ))}
          </div>
          <label className="flex items-center justify-center py-2 cursor-pointer hover:bg-white/5 rounded transition-colors">
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
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div>
              <div className="text-[10px] text-[#88888C] uppercase">Manufacturer</div>
              <div className="text-[#EAEAEA]">{equipment.manufacturer}</div>
            </div>
            <div>
              <div className="text-[10px] text-[#88888C] uppercase">Model</div>
              <div className="text-[#EAEAEA]">{equipment.model}</div>
            </div>
            <div>
              <div className="text-[10px] text-[#88888C] uppercase">Serial</div>
              <div className="text-[#EAEAEA] font-mono-tech">{equipment.serialNumber}</div>
            </div>
            <div>
              <div className="text-[10px] text-[#88888C] uppercase">Client</div>
              <div className="text-[#EAEAEA]">{client?.companyName || "—"}</div>
            </div>
            <div>
              <div className="text-[10px] text-[#88888C] uppercase">Location</div>
              <div className="text-[#EAEAEA]">{equipment.location}</div>
            </div>
            <div>
              <div className="text-[10px] text-[#88888C] uppercase">Install Date</div>
              <div className="text-[#EAEAEA]">{new Date(equipment.installDate).toLocaleDateString()}</div>
            </div>
          </div>

          {eqPhotos.length > 0 && (
            <div>
              <div className="text-[10px] text-[#88888C] uppercase mb-1">Service Photos</div>
              <div className="grid grid-cols-6 gap-1.5">
                {eqPhotos.slice(0, 6).map((photo, idx) => (
                  <img key={idx} src={photo.url} alt="" className="w-full h-12 object-cover rounded" />
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="text-[10px] text-[#88888C] uppercase mb-1">Service History ({serviceHistory.length})</div>
            <div className="space-y-1">
              {serviceHistory.slice(0, 5).map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between p-2 rounded bg-[#121214] hover:bg-[#1A1A20] cursor-pointer"
                  onClick={() => onViewReport(record)}
                >
                  <div className="flex items-center gap-2">
                    <Wrench className="w-3 h-3 text-[#005F73]" />
                    <span className="text-xs text-[#EAEAEA] capitalize">{record.serviceType}</span>
                    <span className="text-[10px] text-[#88888C]">{record.technician}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[#F2A900] font-mono-tech">${record.cost.toFixed(2)}</span>
                    <span className="text-[10px] text-[#88888C]">
                      {record.completedDate ? new Date(record.completedDate).toLocaleDateString() : "—"}
                    </span>
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
    <div className="space-y-4">
      <DialogHeader>
        <DialogTitle className="text-[#EAEAEA] flex items-center justify-between">
          <span>Service Report #{record.id}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={onPrint}
            className="h-7 border-white/10 text-[#88888C] hover:text-[#F2A900] text-xs"
          >
            <Printer className="w-3 h-3 mr-1" />
            Print
          </Button>
        </DialogTitle>
      </DialogHeader>

      <div className="border border-white/10 rounded p-4 space-y-4 bg-[#0A0A0C]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <div>
            <div className="text-lg font-bold text-[#F2A900]">NexTOS</div>
            <div className="text-[10px] text-[#88888C]">Service Report</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-[#EAEAEA] font-mono-tech">Report #{record.id}</div>
            <div className="text-[10px] text-[#88888C]">
              {record.completedDate ? new Date(record.completedDate).toLocaleDateString() : "—"}
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <div className="text-[10px] text-[#88888C] uppercase">Client</div>
            <div className="text-[#EAEAEA] font-medium">{client?.companyName || "—"}</div>
          </div>
          <div>
            <div className="text-[10px] text-[#88888C] uppercase">Equipment</div>
            <div className="text-[#EAEAEA] font-medium font-mono-tech">
              {equipment?.unitId || "—"} — {equipment?.type || "—"}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-[#88888C] uppercase">Technician</div>
            <div className="text-[#EAEAEA]">{record.technician}</div>
          </div>
          <div>
            <div className="text-[10px] text-[#88888C] uppercase">Service Type</div>
            <div className="text-[#EAEAEA] capitalize">{record.serviceType}</div>
          </div>
          <div>
            <div className="text-[10px] text-[#88888C] uppercase">Hours at Service</div>
            <div className="text-[#EAEAEA] font-mono-tech">{record.hoursAtService}</div>
          </div>
          <div>
            <div className="text-[10px] text-[#88888C] uppercase">Cost</div>
            <div className="text-[#F2A900] font-mono-tech font-bold">${record.cost.toFixed(2)}</div>
          </div>
        </div>

        {/* Description */}
        <div>
          <div className="text-[10px] text-[#88888C] uppercase mb-1">Work Description</div>
          <div className="text-xs text-[#EAEAEA] bg-[#1A1A20] p-3 rounded leading-relaxed">{record.description}</div>
        </div>

        {/* Parts */}
        {record.partsUsed && (
          <div>
            <div className="text-[10px] text-[#88888C] uppercase mb-1">Parts &amp; Materials</div>
            <div className="text-xs text-[#EAEAEA] font-mono-tech">{record.partsUsed}</div>
          </div>
        )}

        {/* Photos */}
        {photos.length > 0 && (
          <div>
            <div className="text-[10px] text-[#88888C] uppercase mb-2">Documentation Photos</div>
            <div className="grid grid-cols-2 gap-3">
              {photos.map((photo, idx) => (
                <div key={idx}>
                  <img src={photo.url} alt={photo.caption} className="w-full h-32 object-cover rounded mb-1" />
                  <div className="flex items-center gap-1">
                    <span
                      className={`text-[9px] px-1 py-0.5 rounded font-medium ${
                        photo.type === "before"
                          ? "bg-[#F2A900]/20 text-[#F2A900]"
                          : "bg-[#10B981]/20 text-[#10B981]"
                      }`}
                    >
                      {photo.type.toUpperCase()}
                    </span>
                    <span className="text-[9px] text-[#88888C]">{photo.caption}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-white/5 pt-3 flex items-center justify-between">
          <div className="text-[10px] text-[#88888C]">Generated by NexTOS Service Management</div>
          <div className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-[#10B981]" />
            <span className="text-[10px] text-[#10B981]">Completed</span>
          </div>
        </div>
      </div>
    </div>
  );
}
