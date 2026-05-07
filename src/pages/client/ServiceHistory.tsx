import { useState } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import { useOperationsStore } from "@/stores/useOperationsStore";
import { useCRMStore } from "@/stores/useCRMStore";
import { History, ChevronDown, ChevronUp, Wrench, Search, Camera, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";

const serviceCategoryColors: Record<string, string> = {
  "Heavy Equipment PMS": "bg-[#005F73]/20 text-[#005F73]",
  "Calibration PMS":       "bg-[#10B981]/20 text-[#10B981]",
  "Lab Testing Service": "bg-[#8B5CF6]/20 text-[#8B5CF6]",
  "Repair":               "bg-[#EF4444]/20 text-[#EF4444]",
  "Inspection":           "bg-[#F2A900]/20 text-[#F2A900]",
  "Installation":         "bg-[#3B82F6]/20 text-[#3B82F6]",
};

const statusColors: Record<string, string> = {
  completed:   "bg-[#10B981]/20 text-[#10B981]",
  in_progress: "bg-[#F2A900]/20 text-[#F2A900]",
  pending:     "bg-[#88888C]/20 text-[#88888C]",
};

export default function ClientServiceHistory() {
  const { user } = useAuthStore();
  const { equipment, serviceRecords, servicePhotos } = useOperationsStore();
  const { clients } = useCRMStore();
  const clientId = user?.clientId || 1;

  const [expanded, setExpanded] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const clientEquipment = equipment.filter((e) => e.clientId === clientId);
  const clientRecords = serviceRecords
    .filter((r) => r.clientId === clientId)
    .filter((r) =>
      search === "" ||
      r.serviceCategory.toLowerCase().includes(search.toLowerCase()) ||
      r.technician.toLowerCase().includes(search.toLowerCase()) ||
      r.description.toLowerCase().includes(search.toLowerCase()) ||
      clientEquipment.find((e) => e.id === r.equipmentId)?.unitId.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime());

  return (
    <div className="space-y-4 px-8 pt-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[32px] font-bold text-[#EAEAEA] tracking-[-0.02em]">Service History</h1>
          <p className="text-sm text-[#88888C] mt-0.5">{clientRecords.length} service records on file</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-xs">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#88888C]" />
        <Input
          placeholder="Search by unit, category, technician…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8 h-8 bg-[#1A1A20] border-white/10 text-[#EAEAEA] text-xs placeholder:text-[#88888C]/50"
        />
      </div>

      {/* Records */}
      <div className="space-y-3">
        {clientRecords.length === 0 && (
          <div className="data-card p-8 flex flex-col items-center justify-center gap-2">
            <History className="w-8 h-8 text-[#88888C]" />
            <p className="text-sm text-[#88888C]">No service records found</p>
          </div>
        )}

        {clientRecords.map((record) => {
          const eq = clientEquipment.find((e) => e.id === record.equipmentId);
          const photos = servicePhotos.filter((p) => p.serviceRecordId === record.id);
          const beforePhotos = photos.filter((p) => p.type === "before");
          const afterPhotos = photos.filter((p) => p.type === "after");
          const isExpanded = expanded === record.id;

          return (
            <div key={record.id} className="data-card">
              {/* Row header — always visible */}
              <button
                onClick={() => setExpanded(isExpanded ? null : record.id)}
                className="w-full flex items-center justify-between p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded bg-[#005F73]/10 flex items-center justify-center shrink-0">
                    <Wrench className="w-4 h-4 text-[#005F73]" />
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-[#EAEAEA] font-mono-tech">
                        {eq?.unitId ?? "—"}
                      </span>
                      <span className="text-xs text-[#88888C]">{eq?.equipmentType}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${serviceCategoryColors[record.serviceCategory] ?? "bg-[#88888C]/20 text-[#88888C]"}`}>
                        {record.serviceCategory}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium capitalize ${statusColors[record.status] ?? "bg-[#88888C]/20 text-[#88888C]"}`}>
                        {record.status.replace("_", " ")}
                      </span>
                    </div>
                    <div className="text-[10px] text-[#88888C] mt-0.5">
                      {record.completedDate
                        ? new Date(record.completedDate).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
                        : `Scheduled: ${new Date(record.scheduledDate).toLocaleDateString()}`}{" "}
                      · {record.technician}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {photos.length > 0 && (
                    <span className="flex items-center gap-1 text-[10px] text-[#88888C]">
                      <Camera className="w-3 h-3" />
                      {photos.length}
                    </span>
                  )}
                  <span className="text-[10px] text-[#F2A900] font-mono-tech font-bold">
                    ${record.cost.toFixed(2)}
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-[#88888C]" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-[#88888C]" />
                  )}
                </div>
              </button>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="px-6 pb-5 border-t border-white/5 pt-4 space-y-4">
                  {/* Details grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div>
                      <div className="text-[10px] text-[#88888C] uppercase tracking-wider mb-0.5">Equipment SN</div>
                      <div className="text-[#EAEAEA] font-mono-tech">{eq?.serialNumber ?? "—"}</div>
                    </div>
                    {record.serviceCategory === "Heavy Equipment PMS" ? (
                      <div>
                        <div className="text-[10px] text-[#88888C] uppercase tracking-wider mb-0.5">Hours at Service</div>
                        <div className="text-[#EAEAEA] font-mono-tech">{record.hoursAtService}h</div>
                      </div>
                    ) : (record.serviceCategory === "Calibration PMS") ? (
                      <div>
                        <div className="text-[10px] text-[#88888C] uppercase tracking-wider mb-0.5">Next Calibration</div>
                        <div className="text-[#EAEAEA] font-mono-tech">{record.nextCalibrationDate ? new Date(record.nextCalibrationDate).toLocaleDateString() : "—"}</div>
                      </div>
                    ) : (record.serviceCategory === "Lab Testing Service") ? (
                       <div>
                        <div className="text-[10px] text-[#88888C] uppercase tracking-wider mb-0.5">Lab Status</div>
                        <div className="text-[#10B981] font-bold uppercase">{record.labStatus}</div>
                      </div>
                    ) : (
                       <div>
                        <div className="text-[10px] text-[#88888C] uppercase tracking-wider mb-0.5">Technician</div>
                        <div className="text-[#EAEAEA]">{record.technician}</div>
                      </div>
                    )}
                    <div>
                      <div className="text-[10px] text-[#88888C] uppercase tracking-wider mb-0.5">Cost</div>
                      <div className="text-[#F2A900] font-bold font-mono-tech">${record.cost.toFixed(2)}</div>
                    </div>
                    <div>
                       <div className="text-[10px] text-[#88888C] uppercase tracking-wider mb-0.5">Work Done</div>
                       <div className="text-[#EAEAEA] capitalize">{record.status}</div>
                    </div>
                  </div>

                  {/* Lab Specific Details */}
                  {record.serviceCategory === "Lab Testing Service" && (
                    <div className="p-3 rounded bg-[#0A0A0C] border border-white/5 grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-[10px] text-[#88888C] uppercase tracking-wider mb-1">Test Details</div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px]">
                              <span className="text-[#88888C]">Type</span>
                              <span className="text-[#EAEAEA]">{record.testType}</span>
                            </div>
                            <div className="flex justify-between text-[11px]">
                              <span className="text-[#88888C]">Sample</span>
                              <span className="text-[#EAEAEA]">{record.sampleName}</span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-[#88888C] uppercase tracking-wider mb-1">Project</div>
                          <div className="text-[11px] text-[#EAEAEA]">{record.projectName}</div>
                        </div>
                    </div>
                  )}

                  {/* Description */}
                  <div>
                    <div className="text-[10px] text-[#88888C] uppercase tracking-wider mb-1">Findings / Description</div>
                    <p className="text-xs text-[#EAEAEA] leading-relaxed">{record.description}</p>
                  </div>

                  {/* Parts used */}
                  {record.partsUsed && record.partsUsed !== "None" && (
                    <div>
                      <div className="text-[10px] text-[#88888C] uppercase tracking-wider mb-1">Parts Used</div>
                      <p className="text-xs text-[#EAEAEA]">{record.partsUsed}</p>
                    </div>
                  )}

                  {/* Before / After Photos & Reports */}
                  <div className="space-y-3">
                    {photos.length > 0 && (
                      <div className="grid grid-cols-2 gap-4">
                        {beforePhotos.length > 0 && (
                          <div>
                            <div className="text-[10px] text-[#88888C] uppercase tracking-wider mb-1.5">Before</div>
                            <div className="grid grid-cols-2 gap-2">
                              {beforePhotos.map((photo) => (
                                <div key={photo.id} className="relative rounded overflow-hidden">
                                  <img
                                    src={photo.url}
                                    alt={photo.caption}
                                    className="w-full h-20 object-cover"
                                  />
                                  <span className="absolute top-0.5 left-0.5 text-[8px] px-1 py-0.5 rounded bg-[#F2A900]/80 text-[#050505] font-bold">
                                    BEFORE
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {afterPhotos.length > 0 && (
                          <div>
                            <div className="text-[10px] text-[#88888C] uppercase tracking-wider mb-1.5">After</div>
                            <div className="grid grid-cols-2 gap-2">
                              {afterPhotos.map((photo) => (
                                <div key={photo.id} className="relative rounded overflow-hidden">
                                  <img
                                    src={photo.url}
                                    alt={photo.caption}
                                    className="w-full h-20 object-cover"
                                  />
                                  <span className="absolute top-0.5 left-0.5 text-[8px] px-1 py-0.5 rounded bg-[#10B981]/80 text-[#050505] font-bold">
                                    AFTER
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {record.reportAttachment && (
                       <button className="flex items-center gap-2 px-3 py-2 rounded bg-[#005F73]/10 border border-[#005F73]/20 text-[#EAEAEA] text-xs hover:bg-[#005F73]/20 transition-colors">
                          <FileText className="w-4 h-4 text-[#005F73]" />
                          View Complete Technical Report ({record.reportAttachment})
                       </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
