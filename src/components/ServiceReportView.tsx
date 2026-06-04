import { Printer, CheckCircle2, X, ShieldCheck, MapPin, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ServiceRecord, Equipment, Client, ServicePhoto } from "@/types";

interface ServiceReportViewProps {
  record: ServiceRecord & Record<string, any>;
  equipment?: Equipment;
  client?: Client;
  photos: ServicePhoto[];
}

function formatServiceInterval(interval: number, unit: string): string {
  const u = unit.toLowerCase();
  if (u === "hours") return `${interval}h`;
  if (u === "km") return `${interval} km`;
  const totalDays = Math.round(
    u === "weeks" ? interval * 7 :
    u === "months" ? interval * 30.44 :
    u === "years" ? interval * 365.25 : 0
  );
  const abbr = u === "weeks" ? "w" : u === "months" ? "mo" : "yr";
  return `${interval}${abbr} (${totalDays}d)`;
}

// Format an ISO timestamp to a clean time string: "11:14 AM"
function formatTime(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit", hour12: true });
  } catch {
    return null;
  }
}

// Format the elapsed time between two ISO strings: "1h 30m" or "45m"
function formatElapsed(fromIso: string | null | undefined, toIso: string | null | undefined): string | null {
  if (!fromIso || !toIso) return null;
  try {
    const from = new Date(fromIso).getTime();
    const to = new Date(toIso).getTime();
    const diffMs = to - from;
    if (!Number.isFinite(diffMs) || diffMs < 0) return null;
    const totalMinutes = Math.round(diffMs / 60_000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours === 0) return `${minutes}m`;
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}m`;
  } catch {
    return null;
  }
}

export function ServiceReportView({ record, equipment, client, photos }: ServiceReportViewProps) {
  // Prefer rich fields saved directly on the record (from seed), fall back to looked-up store data
  const eqName: string = record.equipmentName || equipment?.unitId || "";
  const clientName: string = record.clientName || client?.companyName || "";
  const serialNumber: string = record.serialNumber || equipment?.serialNumber || "";
  const equipmentType: string = record.equipmentType || "";
  const serviceType: string = record.serviceType || record.serviceCategory || "";
  const finalCost: number | null = record.finalCost ?? (record.cost > 0 ? record.cost : null);
  const equipmentStatus: string | null = record.equipmentStatusAtService ?? null;

  let _descMeta: any = {};
  try { _descMeta = JSON.parse(record.description ?? "{}"); } catch {}
  const taskOrigin: "auto" | "manual" =
    record.taskOrigin === "manual" || _descMeta._origin === "manual" ? "manual" : "auto";
  const taskPriority: string | null = record.priority ?? _descMeta._priority ?? null;

  const metricAtService: string = taskOrigin === "manual"
    ? (record.metricAtService || "")
    : (record.metricAtService || (record.hoursAtService ? `${record.hoursAtService}h` : ""));

  const statusBadgeClass =
    equipmentStatus === "Overdue"
      ? "bg-red-100 text-red-700 border-red-200"
      : equipmentStatus === "Due"
      ? "bg-orange-100 text-orange-700 border-orange-200"
      : equipmentStatus === "Due Soon" || equipmentStatus === "Near Service"
      ? "bg-amber-100 text-amber-700 border-amber-200"
      : equipmentStatus === "OK"
      ? "bg-green-100 text-green-700 border-green-200"
      : "bg-gray-100 text-gray-500 border-gray-200";

  // Journey fields
  const travelStartTime: string | null = record.travelStartTime ?? null;
  const arrivalTime: string | null = record.arrivalTime ?? null;
  const completionTime: string | null = record.completionTime ?? null;
  const technicianAddress: string | null = record.technicianAddress ?? null;
  const equipmentSiteAddress: string | null = record.equipmentSiteAddress ?? null;
  const estimatedArrival: string | null = record.estimatedArrival ?? null;

  const travelTimeDisplay = formatElapsed(travelStartTime, arrivalTime);
  const serviceTimeDisplay = formatElapsed(arrivalTime, completionTime);
  const travelStartDisplay = formatTime(travelStartTime);
  const arrivalDisplay = formatTime(arrivalTime);

  const hasJourney = !!(travelStartTime || arrivalTime || completionTime || technicianAddress || equipmentSiteAddress || estimatedArrival);

  // Photos: prefer record-embedded URLs (from seed), augmented by servicePhotos store
  const beforePhotoUrl: string =
    record.beforePhoto || photos.find((p) => p.type === "before")?.url || "";
  const afterPhotoUrl: string =
    record.afterPhoto || photos.find((p) => p.type === "after")?.url || "";
  const beforeNotes: string = record.beforeNotes || photos.find((p) => p.type === "before")?.caption || "";
  const afterNotes: string = record.afterNotes || photos.find((p) => p.type === "after")?.caption || "";

  const hasFindings = !!record.findings?.trim();
  const hasWorkDone = !!record.workDone?.trim();
  const hasRecommendation = !!record.recommendation?.trim();
  const hasPartsUsed = !!(
    (record.partsUsedDetails && record.partsUsedDetails.length > 0) ||
    (record.partsUsed && record.partsUsed !== "None" && record.partsUsed.trim())
  );
  const hasSafety = !!record.safetyChecklist;
  const hasBeforePhoto = !!beforePhotoUrl;
  const hasAfterPhoto = !!afterPhotoUrl;
  const hasPhotos = hasBeforePhoto || hasAfterPhoto;
  const hasTechSig = !!record.techSignature;
  const hasClientSig = !!record.clientSignature;
  const hasSignatures = hasTechSig || hasClientSig;
  const hasSummary = hasFindings || hasWorkDone || hasRecommendation || hasPartsUsed;

  const formatDateWithPipe = (iso: string | null | undefined): string | null => {
    if (!iso) return null;
    try {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return null;
      const date = d.toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" });
      const time = d.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit", hour12: true });
      return `${date} | ${time}`;
    } catch { return null; }
  };

  const completedDateDisplay = formatDateWithPipe(record.completedDate);
  const scheduledDateDisplay = formatDateWithPipe(record.scheduledDate);

  const serviceIntervalDisplay =
    record.serviceInterval && record.serviceIntervalUnit
      ? formatServiceInterval(Number(record.serviceInterval), record.serviceIntervalUnit)
      : record.serviceIntervalUnit
      ? String(record.serviceIntervalUnit)
      : null;

  return (
    <div className="p-2 animate-in fade-in zoom-in-95 duration-300">
      {/* ── Header ── */}
      <div className="flex items-start justify-between border-b border-gray-200 pb-6 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-900 text-white rounded-full text-[9px] font-black uppercase tracking-[0.15em] mb-3">
            <div className="w-1.5 h-1.5 rounded-full bg-[#66B2B2] animate-pulse" />
            {taskOrigin === "manual" ? "Manually Created" : "Auto-Generated"}
          </div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Service Report</h2>
          <p className="text-[11px] text-gray-400 font-bold tracking-wider mt-1 font-mono-tech">
            NexTOS Record <span className="text-gray-700 font-black">#{record.id}</span>
          </p>
        </div>
        <Button
          onClick={() => window.print()}
          className="bg-gray-100 hover:bg-gray-200 text-gray-900 h-9 px-4 border border-gray-200 text-[11px] font-bold rounded-xl transition-all no-print"
        >
          <Printer className="w-3.5 h-3.5 mr-2" />
          Export Copy
        </Button>
      </div>

      {/* ── Body ── */}
      <div className="space-y-6">

        {/* Equipment + Service Details (two-column info grid) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Equipment Info */}
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-1.5">
            <div className="text-[10px] text-[#66B2B2] font-black uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <div className="w-1 h-3 bg-[#66B2B2] rounded-full" />
              Equipment
            </div>
            {eqName && (
              <div className="flex justify-between text-xs">
                <span className="text-gray-400 font-semibold">Equipment Name</span>
                <span className="text-gray-800 font-bold text-right max-w-[60%]">{eqName}</span>
              </div>
            )}
            {equipmentType && (
              <div className="flex justify-between text-xs border-t border-gray-100 pt-1.5 mt-1.5">
                <span className="text-gray-400 font-semibold">Equipment Type</span>
                <span className="text-gray-800 font-bold">{equipmentType}</span>
              </div>
            )}
            {serialNumber && (
              <div className="flex justify-between text-xs border-t border-gray-100 pt-1.5">
                <span className="text-gray-400 font-semibold">Serial Number</span>
                <span className="text-gray-800 font-bold font-mono-tech">{serialNumber}</span>
              </div>
            )}
            {clientName && (
              <div className="flex justify-between text-xs border-t border-gray-100 pt-1.5">
                <span className="text-gray-400 font-semibold">Client</span>
                <span className="text-gray-800 font-bold text-right max-w-[60%]">{clientName}</span>
              </div>
            )}
            {record.clientRepresentativeName && (
              <div className="flex justify-between text-xs border-t border-gray-100 pt-1.5">
                <span className="text-gray-400 font-semibold">Client Representative</span>
                <span className="text-gray-800 font-bold text-right max-w-[60%]">{record.clientRepresentativeName}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-xs border-t border-gray-100 pt-1.5">
              <span className="text-gray-400 font-semibold">Status at Service</span>
              {equipmentStatus && taskOrigin !== "manual" ? (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide border ${statusBadgeClass}`}>
                  {equipmentStatus}
                </span>
              ) : (
                <span className="text-gray-400 font-bold">—</span>
              )}
            </div>
          </div>

          {/* Service Details */}
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-1.5">
            <div className="text-[10px] text-[#66B2B2] font-black uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <div className="w-1 h-3 bg-[#66B2B2] rounded-full" />
              Service Details
            </div>
            {serviceType && (
              <div className="flex justify-between text-xs">
                <span className="text-gray-400 font-semibold">Service Type</span>
                <span className="text-gray-800 font-bold">{serviceType}</span>
              </div>
            )}
            <div className="flex justify-between text-xs border-t border-gray-100 pt-1.5">
              <span className="text-gray-400 font-semibold">Service Interval</span>
              <span className={`font-bold ${serviceIntervalDisplay ? "text-gray-800" : "text-gray-400"}`}>
                {serviceIntervalDisplay || "—"}
              </span>
            </div>
            <div className="flex justify-between text-xs border-t border-gray-100 pt-1.5">
              <span className="text-gray-400 font-semibold">Metric at Service</span>
              <span className={`font-black font-mono-tech ${metricAtService ? "text-[#66B2B2]" : "text-gray-400"}`}>
                {metricAtService || "—"}
              </span>
            </div>
            {record.technician && (
              <div className="flex justify-between text-xs border-t border-gray-100 pt-1.5">
                <span className="text-gray-400 font-semibold">Technician</span>
                <span className="text-gray-800 font-bold">{record.technician}</span>
              </div>
            )}
            {taskPriority && (
              <div className="flex justify-between items-center text-xs border-t border-gray-100 pt-1.5">
                <span className="text-gray-400 font-semibold">Priority</span>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                  taskPriority === "high"
                    ? "bg-red-100 text-red-700"
                    : taskPriority === "medium"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-gray-100 text-gray-500"
                }`}>{taskPriority}</span>
              </div>
            )}
            {scheduledDateDisplay && (
              <div className="flex justify-between text-xs border-t border-gray-100 pt-1.5">
                <span className="text-gray-400 font-semibold">Scheduled</span>
                <span className="text-gray-800 font-bold">{scheduledDateDisplay}</span>
              </div>
            )}
            {completedDateDisplay && (
              <div className="flex justify-between text-xs border-t border-gray-100 pt-1.5">
                <span className="text-gray-400 font-semibold">Completed</span>
                <span className="text-gray-800 font-bold">{completedDateDisplay}</span>
              </div>
            )}
            {finalCost !== null && (
              <div className="flex justify-between text-xs border-t border-gray-100 pt-1.5">
                <span className="text-gray-400 font-semibold">Total Cost</span>
                <span className="text-gray-900 font-black font-mono-tech">
                  ₱{Number(finalCost).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Journey & Location — only if any journey data exists */}
        {hasJourney && (
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-3">
            <div className="text-[10px] text-[#66B2B2] font-black uppercase tracking-widest flex items-center gap-1.5">
              <div className="w-1 h-3 bg-[#66B2B2] rounded-full" />
              Journey &amp; Location
            </div>

            {/* Addresses */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 space-y-1">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3 h-3 text-blue-500 shrink-0" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-blue-600">Technician's Address</span>
                </div>
                <p className="text-[11px] text-blue-900 font-medium leading-snug break-words">
                  {technicianAddress || "—"}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 space-y-1">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3 h-3 text-amber-500 shrink-0" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-amber-600">Equipment Site</span>
                </div>
                <p className="text-[11px] text-amber-900 font-medium leading-snug break-words">
                  {equipmentSiteAddress || "—"}
                </p>
              </div>
            </div>

            {estimatedArrival && (
              <div className="p-3 rounded-xl bg-teal-50 border border-teal-100 space-y-1">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-teal-500 shrink-0" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-teal-600">Estimated Arrival</span>
                </div>
                <p className="text-[11px] text-teal-900 font-medium leading-snug">{estimatedArrival}</p>
              </div>
            )}

            {/* Timing breakdown */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {travelStartDisplay && (
                <div className="p-2.5 rounded-lg bg-white border border-gray-100 space-y-0.5 text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Clock className="w-3 h-3 text-gray-400" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">Departed</span>
                  </div>
                  <p className="text-xs font-bold text-gray-800 font-mono-tech">{travelStartDisplay}</p>
                </div>
              )}
              {arrivalDisplay && (
                <div className="p-2.5 rounded-lg bg-white border border-gray-100 space-y-0.5 text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Clock className="w-3 h-3 text-gray-400" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">Arrived</span>
                  </div>
                  <p className="text-xs font-bold text-gray-800 font-mono-tech">{arrivalDisplay}</p>
                </div>
              )}
              {travelTimeDisplay && (
                <div className="p-2.5 rounded-lg bg-white border border-[#66B2B2]/30 space-y-0.5 text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Clock className="w-3 h-3 text-[#66B2B2]" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-[#66B2B2]">Travel Time</span>
                  </div>
                  <p className="text-xs font-black text-[#66B2B2] font-mono-tech">{travelTimeDisplay}</p>
                </div>
              )}
              {serviceTimeDisplay && (
                <div className="p-2.5 rounded-lg bg-white border border-[#66B2B2]/30 space-y-0.5 text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Clock className="w-3 h-3 text-[#66B2B2]" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-[#66B2B2]">Service Time</span>
                  </div>
                  <p className="text-xs font-black text-[#66B2B2] font-mono-tech">{serviceTimeDisplay}</p>
                </div>
              )}
            </div>

          </div>
        )}

        {/* Safety Checklist — only if exists */}
        {hasSafety && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-100">
            <div className="text-[10px] text-amber-700 font-black uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              Safety & Compliance Verification
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { label: "PPE Verified", value: record.safetyChecklist?.ppeChecked },
                { label: "Engine Isolated", value: record.safetyChecklist?.engineOff },
                { label: "Area Secured", value: record.safetyChecklist?.areaSecured },
                { label: "LOTO Applied", value: record.safetyChecklist?.lotoApplied },
              ].map((item, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-2 p-2.5 rounded-lg border text-[10px] font-bold ${
                    item.value
                      ? "bg-green-50 border-green-200 text-green-700"
                      : "bg-white border-gray-200 text-gray-400"
                  }`}
                >
                  {item.value
                    ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    : <X className="w-3.5 h-3.5 shrink-0" />}
                  <span className="uppercase tracking-tight leading-tight">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Findings, Work Done, Recommendations — only if at least one exists */}
        {hasSummary && (
          <div className="rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
              <span className="text-[10px] text-gray-600 font-black uppercase tracking-widest flex items-center gap-1.5">
                <div className="w-1 h-3 bg-[#66B2B2] rounded-full" />
                Technical Summary
              </span>
            </div>
            <div className="divide-y divide-gray-100">
              {hasFindings && (
                <div className="p-4">
                  <div className="text-[10px] text-[#66B2B2] font-black uppercase tracking-widest mb-2">Fault Diagnosis / Findings</div>
                  <p className="text-xs text-gray-800 leading-relaxed">{record.findings}</p>
                </div>
              )}
              {hasWorkDone && (
                <div className="p-4">
                  <div className="text-[10px] text-[#66B2B2] font-black uppercase tracking-widest mb-2">Technical Work Performed</div>
                  <p className="text-xs text-gray-800 leading-relaxed">{record.workDone}</p>
                </div>
              )}
              {hasPartsUsed && (
                <div className="p-4">
                  <div className="text-[10px] text-[#66B2B2] font-black uppercase tracking-widest mb-2">Parts Used &amp; Cost</div>
                  {record.partsUsedDetails && record.partsUsedDetails.length > 0 ? (
                    <>
                      {record.partsUsedDetails.map((part, i) => (
                        <div key={i} className="flex items-center justify-between text-xs border-t border-gray-100 pt-1.5 mt-1.5">
                          <span className="text-gray-700 font-semibold flex-1 min-w-0 truncate">{part.name}</span>
                          <span className="text-gray-400 mx-3 shrink-0">x{part.quantity}</span>
                          <span className="text-gray-900 font-black font-mono-tech shrink-0">
                            ₱{(part.quantity * part.pricePerUnit).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      ))}
                      <div className="flex justify-between items-center text-xs border-t border-gray-200 pt-1.5 mt-2">
                        <span className="text-gray-400 font-semibold">Total Cost</span>
                        <span className="text-gray-900 font-black font-mono-tech">
                          ₱{record.partsUsedDetails.reduce((sum, p) => sum + p.quantity * p.pricePerUnit, 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-gray-800 leading-relaxed">{record.partsUsed}</p>
                  )}
                </div>
              )}
              {hasRecommendation && (
                <div className="p-4 bg-[#66B2B2]/5">
                  <div className="text-[10px] text-[#66B2B2] font-black uppercase tracking-widest mb-2">Strategic Recommendations</div>
                  <p className="text-xs text-gray-800 leading-relaxed italic">{record.recommendation}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Field Documentation (photos) — only if at least one photo exists */}
        {hasPhotos && (
          <div className="rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
              <span className="text-[10px] text-gray-600 font-black uppercase tracking-widest flex items-center gap-1.5">
                <div className="w-1 h-3 bg-[#66B2B2] rounded-full" />
                Field Documentation
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100">
              {hasBeforePhoto && (
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Initial State Proof</span>
                    <span className="text-[9px] font-bold text-[#66B2B2] uppercase">Before Service</span>
                  </div>
                  <div className="aspect-video rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                    <img src={beforePhotoUrl} className="w-full h-full object-cover" alt="Before service" />
                  </div>
                  {beforeNotes && (
                    <p className="text-[11px] text-gray-500 italic">{beforeNotes}</p>
                  )}
                </div>
              )}
              {hasAfterPhoto && (
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Completion Proof</span>
                    <span className="text-[9px] font-bold text-green-500 uppercase">After Service</span>
                  </div>
                  <div className="aspect-video rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                    <img src={afterPhotoUrl} className="w-full h-full object-cover" alt="After service" />
                  </div>
                  {afterNotes && (
                    <p className="text-[11px] text-gray-500 italic">{afterNotes}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Signatures — only if at least one exists */}
        {hasSignatures && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {hasTechSig && (
              <div className="space-y-2">
                <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest ml-1">Technician Certification</div>
                <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col items-center justify-center relative overflow-hidden min-h-[120px]">
                  <img
                    src={record.techSignature}
                    className="h-16 object-contain contrast-125 mix-blend-multiply"
                    alt="Technician signature"
                  />
                  <div className="mt-4 text-center">
                    <div className="h-px w-2/3 mx-auto bg-gray-200 mb-1.5" />
                    <span className="text-[9px] text-gray-500 font-bold uppercase tracking-tight">
                      {record.technician}
                    </span>
                  </div>
                </div>
              </div>
            )}
            {hasClientSig && (
              <div className="space-y-2">
                <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest ml-1">Client Acknowledgment</div>
                <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col items-center justify-center relative overflow-hidden min-h-[120px]">
                  <img
                    src={record.clientSignature}
                    className="h-16 object-contain contrast-125 mix-blend-multiply"
                    alt="Client signature"
                  />
                  <div className="mt-4 text-center">
                    <div className="h-px w-2/3 mx-auto bg-gray-200 mb-1.5" />
                    <span className="text-[9px] text-gray-500 font-bold uppercase tracking-tight">
                      {record.clientRepresentativeName || "Authorized Rep"}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-8 pt-6 border-t border-gray-100 text-center">
        <p className="text-[9px] text-gray-300 font-mono-tech uppercase tracking-[0.3em]">
          Security Verified System Record • NexTOS Operations
        </p>
      </div>
    </div>
  );
}
