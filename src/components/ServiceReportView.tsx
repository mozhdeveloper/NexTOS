import { Printer, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ServiceRecord, Equipment, Client, ServicePhoto } from "@/types";

interface ServiceReportViewProps {
  record: ServiceRecord;
  equipment?: Equipment;
  client?: Client;
  photos: ServicePhoto[];
}

export function ServiceReportView({ record, equipment, client, photos }: ServiceReportViewProps) {
  return (
    <div className="p-2 animate-in fade-in zoom-in-95 duration-300">
      <div className="flex items-center justify-between border-b-2 border-gray-900 pb-6 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-black text-white rounded-full text-[9px] font-black uppercase tracking-[0.2em] mb-3">
             <div className="w-2 h-2 rounded-full bg-[#66B2B2] animate-pulse" /> Official Document
          </div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tighter">TECHNICAL SERVICE REPORT</h2>
          <p className="text-xs text-gray-400 font-bold tracking-widest mt-1 font-mono-tech">NEXVISION OPS SYSTEM RECORD <span className="text-gray-900 font-black">#SR-{record.id}</span></p>
        </div>
        <Button onClick={() => window.print()} className="bg-gray-100 hover:bg-gray-200 text-gray-900 h-12 px-6 border border-gray-200 text-xs font-black rounded-xl transition-all active:scale-95 shadow-sm no-print">
          <Printer className="w-5 h-5 mr-3" />
          EXPORT SYSTEM COPY
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-10">
        <div className="space-y-8">
          <section>
            <h4 className="text-[11px] font-black text-gray-900 uppercase tracking-[0.25em] mb-4 flex items-center gap-2">
               <div className="w-1.5 h-4 bg-[#66B2B2]" /> ASSET SPECIFICATIONS
            </h4>
            <div className="space-y-3 px-3">
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-[11px] text-gray-400 font-bold uppercase">Identification ID:</span>
                <span className="text-[11px] text-gray-900 font-black font-mono-tech tracking-wider">{equipment?.unitId}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-[11px] text-gray-400 font-bold uppercase">Manufacturer:</span>
                <span className="text-[11px] text-gray-900 font-bold">{equipment?.manufacturer}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-[11px] text-gray-400 font-bold uppercase">Model Descriptor:</span>
                <span className="text-[11px] text-gray-900 font-bold">{equipment?.model}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-[11px] text-gray-400 font-bold uppercase">Runtime Meter:</span>
                <span className="text-sm text-[#66B2B2] font-black font-mono-tech">{record.hoursAtService} HOURS</span>
              </div>
            </div>
          </section>

          <section>
             <h4 className="text-[11px] font-black text-gray-900 uppercase tracking-[0.25em] mb-4 flex items-center gap-2">
               <div className="w-1.5 h-4 bg-[#66B2B2]" /> LOGISTICAL CONTEXT
            </h4>
            <div className="space-y-3 px-3">
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-[11px] text-gray-400 font-bold uppercase">Service Category:</span>
                <span className="text-[11px] text-gray-900 font-black uppercase tracking-tighter">{record.serviceCategory}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-[11px] text-gray-400 font-bold uppercase">Primary Technician:</span>
                <span className="text-[11px] text-gray-900 font-bold">{record.technician}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-[11px] text-gray-400 font-bold uppercase">Completion Date:</span>
                <span className="text-[11px] text-gray-900 font-bold">{record.completedDate ? new Date(record.completedDate).toLocaleDateString('en-PH', {year:'numeric', month:'long', day:'numeric'}) : "PENDING"}</span>
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-8">
          <section>
            <h4 className="text-[11px] font-black text-gray-900 uppercase tracking-[0.25em] mb-4 flex items-center gap-2">
               <div className="w-1.5 h-4 bg-amber-500" /> SAFETY & COMPLIANCE VERIFICATION
            </h4>
            <div className="grid grid-cols-2 gap-3 px-3">
              {[
                { label: 'PPE Verified', value: record.safetyChecklist?.ppeChecked },
                { label: 'Engine Isolated', value: record.safetyChecklist?.engineOff },
                { label: 'Area Secured', value: record.safetyChecklist?.areaSecured },
                { label: 'LOTO Applied', value: record.safetyChecklist?.lotoApplied },
              ].map((item, i) => (
                <div key={i} className={`flex items-center gap-2 p-2 rounded-lg border ${item.value ? 'bg-green-50/50 border-green-100 text-green-700' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>
                  {item.value ? <CheckCircle2 className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                  <span className="text-[9px] font-black uppercase tracking-tight">{item.label}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 px-3">
               <div className="p-2 rounded-lg bg-gray-900 text-[8px] text-white font-mono-tech uppercase tracking-widest text-center">
                  Audit Pass: All protocols verified at {record.completedDate ? new Date(record.completedDate).toLocaleTimeString() : 'N/A'}
               </div>
            </div>
          </section>

          <section className="h-full">
             <h4 className="text-[11px] font-black text-gray-900 uppercase tracking-[0.25em] mb-4 flex items-center gap-2">
               <div className="w-1.5 h-4 bg-[#66B2B2]" /> EXECUTIVE SUMMARY
            </h4>
            <div className="p-6 rounded-2xl bg-gray-50 border border-gray-100 space-y-6 shadow-inner h-[calc(100%-2.5rem)]">
              <div>
                <span className="text-[10px] text-[#66B2B2] font-black uppercase tracking-widest mb-2 block">Fault Diagnosis / Findings:</span>
                <p className="text-[12px] text-gray-900 font-medium leading-relaxed bg-white p-3 rounded-lg border border-gray-100">{record.findings || "Operational state nominal. No significant faults detected during primary inspection."}</p>
              </div>
              <div>
                <span className="text-[10px] text-[#66B2B2] font-black uppercase tracking-widest mb-2 block">Technical Work Documentation:</span>
                <p className="text-[12px] text-gray-900 font-medium leading-relaxed bg-white p-3 rounded-lg border border-gray-100">{record.workDone}</p>
              </div>
              <div>
                <span className="text-[10px] text-[#66B2B2] font-black uppercase tracking-widest mb-2 block">Strategic Recommendations:</span>
                <p className="text-[12px] text-gray-900 font-bold leading-relaxed italic bg-[#66B2B2]/5 p-3 rounded-lg border border-[#66B2B2]/10">{record.recommendation || "No immediate action required. Maintain standard PMS intervals."}</p>
              </div>
            </div>
          </section>
        </div>
      </div>

      <section className="mb-10">
        <h4 className="text-[11px] font-black text-gray-900 uppercase tracking-[0.25em] mb-6 flex items-center gap-2">
            <div className="w-1.5 h-4 bg-[#66B2B2]" /> FIELD DOCUMENTATION
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="space-y-3">
            <div className="flex items-center justify-between px-2">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Initial State Proof</span>
                <span className="text-[8px] font-bold text-[#66B2B2] uppercase">Before Service</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {photos.filter((p: any) => p.type === 'before').map((p: any, i: number) => (
                <div key={i} className="aspect-video rounded-xl overflow-hidden border-2 border-gray-100 shadow-md">
                   <img src={p.url} className="w-full h-full object-cover" alt="Before" />
                </div>
              ))}
              {photos.filter((p: any) => p.type === 'before').length === 0 && <div className="col-span-2 py-8 text-center bg-gray-50 rounded-xl border border-dashed text-[10px] text-gray-400 font-bold uppercase tracking-widest">No Before Documentation</div>}
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between px-2">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Completion Proof</span>
                <span className="text-[8px] font-bold text-green-500 uppercase">After Service</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {photos.filter((p: any) => p.type === 'after').map((p: any, i: number) => (
                <div key={i} className="aspect-video rounded-xl overflow-hidden border-2 border-gray-100 shadow-md">
                   <img src={p.url} className="w-full h-full object-cover" alt="After" />
                </div>
              ))}
              {photos.filter((p: any) => p.type === 'after').length === 0 && <div className="col-span-2 py-8 text-center bg-gray-50 rounded-xl border border-dashed text-[10px] text-gray-400 font-bold uppercase tracking-widest">No After Documentation</div>}
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 border-t-2 border-gray-100 pt-10 mb-6">
        <div className="space-y-4">
          <span className="text-[10px] text-gray-400 font-black uppercase tracking-[0.3em] block ml-1">Technician Certification</span>
          <div className="p-8 bg-gray-50/50 rounded-3xl border border-gray-100 flex items-center justify-center shadow-inner relative overflow-hidden">
            {record.techSignature ? (
               <img src={record.techSignature} className="h-24 object-contain contrast-125 mix-blend-multiply transition-all hover:scale-105 duration-500" alt="Tech Sig" />
            ) : <div className="h-24 flex items-center justify-center text-gray-300 italic text-[11px] font-bold uppercase tracking-widest">Digital Stamp Missing</div>}
            <div className="absolute bottom-4 left-0 right-0 text-center">
                <div className="h-[1px] w-2/3 mx-auto bg-gray-200 mb-2" />
                <span className="text-[9px] text-gray-500 font-black uppercase tracking-tighter">{record.technician} <span className="text-gray-300 mx-1">•</span> SENIOR TECHNICIAN</span>
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <span className="text-[10px] text-gray-400 font-black uppercase tracking-[0.3em] block ml-1">Client Acknowledgment</span>
          <div className="p-8 bg-gray-50/50 rounded-3xl border border-gray-100 flex items-center justify-center shadow-inner relative overflow-hidden">
            {record.clientSignature ? (
               <img src={record.clientSignature} className="h-24 object-contain contrast-125 mix-blend-multiply transition-all hover:scale-105 duration-500" alt="Client Sig" />
            ) : <div className="h-24 flex items-center justify-center text-gray-300 italic text-[11px] font-bold uppercase tracking-widest">Acknowledgment Missing</div>}
            <div className="absolute bottom-4 left-0 right-0 text-center">
                <div className="h-[1px] w-2/3 mx-auto bg-gray-200 mb-2" />
                <span className="text-[9px] text-gray-500 font-black uppercase tracking-tighter">{client?.companyName} <span className="text-gray-300 mx-1">•</span> AUTHORIZED REP</span>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center pt-8 opacity-20 hover:opacity-100 transition-opacity font-mono-tech uppercase tracking-[0.5em] text-[8px]">
         Security Verified System Record • NexVision Operations OS • Built by NexTOS
      </div>
    </div>
  );
}
