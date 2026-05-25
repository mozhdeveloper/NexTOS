import { Printer, CheckCircle2, X, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ServiceRecord, Equipment, Client, ServicePhoto } from "@/types";

interface ServiceReportViewProps {
  record: ServiceRecord & Record<string, any>;
  equipment?: Equipment;
  client?: Client;
  photos: ServicePhoto[];
}

export function ServiceReportView({ record, equipment, client, photos }: ServiceReportViewProps) {
  // Prefer rich fields saved directly on the record (from seed), fall back to looked-up store data
  const eqName: string = record.equipmentName || equipment?.unitId || "";
  const clientName: string = record.clientName || client?.companyName || "";
  const serialNumber: string = record.serialNumber || equipment?.serialNumber || "";
  const equipmentType: string = record.equipmentType || "";
  const serviceType: string = record.serviceType || record.serviceCategory || "";
  const metricAtService: string = record.metricAtService || (record.hoursAtService ? `${record.hoursAtService}h` : "");
  const startTime: string = record.startTime || "";
  const endTime: string = record.endTime || "";
  const duration: string = record.duration || "";
  const finalCost: number | null = record.finalCost ?? (record.cost > 0 ? record.cost : null);

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
  const hasSafety = !!record.safetyChecklist;
  const hasBeforePhoto = !!beforePhotoUrl;
  const hasAfterPhoto = !!afterPhotoUrl;
  const hasPhotos = hasBeforePhoto || hasAfterPhoto;
  const hasTechSig = !!record.techSignature;
  const hasClientSig = !!record.clientSignature;
  const hasSignatures = hasTechSig || hasClientSig;
  const hasSummary = hasFindings || hasWorkDone || hasRecommendation;

  const completedDateDisplay = record.completedDate
    ? new Date(record.completedDate).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })
    : null;

  const serviceIntervalDisplay =
    record.serviceInterval && record.serviceIntervalUnit
      ? `${record.serviceInterval} ${record.serviceIntervalUnit}`
      : null;

  return (
    <div className="p-2 animate-in fade-in zoom-in-95 duration-300">
      {/* ── Header ── */}
      <div className="flex items-start justify-between border-b border-gray-200 pb-6 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-900 text-white rounded-full text-[9px] font-black uppercase tracking-[0.15em] mb-3">
            <div className="w-1.5 h-1.5 rounded-full bg-[#66B2B2] animate-pulse" />
            Official Document
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
            {serviceIntervalDisplay && (
              <div className="flex justify-between text-xs border-t border-gray-100 pt-1.5">
                <span className="text-gray-400 font-semibold">Service Interval</span>
                <span className="text-gray-800 font-bold">{serviceIntervalDisplay}</span>
              </div>
            )}
            {metricAtService && (
              <div className="flex justify-between text-xs border-t border-gray-100 pt-1.5">
                <span className="text-gray-400 font-semibold">Metric at Service</span>
                <span className="text-[#66B2B2] font-black font-mono-tech">{metricAtService}</span>
              </div>
            )}
            {record.technician && (
              <div className="flex justify-between text-xs border-t border-gray-100 pt-1.5">
                <span className="text-gray-400 font-semibold">Technician</span>
                <span className="text-gray-800 font-bold">{record.technician}</span>
              </div>
            )}
            {completedDateDisplay && (
              <div className="flex justify-between text-xs border-t border-gray-100 pt-1.5">
                <span className="text-gray-400 font-semibold">Completed</span>
                <span className="text-gray-800 font-bold">{completedDateDisplay}</span>
              </div>
            )}
            {/* Timing fields — always present in JSON structure, shown when populated */}
            <div className="flex justify-between text-xs border-t border-gray-100 pt-1.5">
              <span className="text-gray-400 font-semibold">Start Time</span>
              <span className="text-gray-800 font-mono-tech">{startTime || "—"}</span>
            </div>
            <div className="flex justify-between text-xs border-t border-gray-100 pt-1.5">
              <span className="text-gray-400 font-semibold">End Time</span>
              <span className="text-gray-800 font-mono-tech">{endTime || "—"}</span>
            </div>
            <div className="flex justify-between text-xs border-t border-gray-100 pt-1.5">
              <span className="text-gray-400 font-semibold">Duration</span>
              <span className="text-gray-800 font-mono-tech">{duration || "—"}</span>
            </div>
            {finalCost !== null && (
              <div className="flex justify-between text-xs border-t border-gray-100 pt-1.5">
                <span className="text-gray-400 font-semibold">Service Cost</span>
                <span className="text-gray-900 font-black font-mono-tech">
                  ₱{Number(finalCost).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </div>
        </div>

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
                      {clientName || "Authorized Rep"}
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
