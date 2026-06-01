import { Upload, X, FileText, Package, UserCheck, AlertTriangle, CheckCircle2, PenTool, Camera } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import type { Client, Equipment } from "@/types";
import { SignaturePad } from "./SignaturePad";

interface ManualLogTabProps {
  clients: Client[];
  equipment: Equipment[];
  formClientId: string;
  setFormClientId: (v: string) => void;
  formEquipmentId: string;
  setFormEquipmentId: (v: string) => void;
  formType: string;
  setFormType: (v: string) => void;
  formTechnician: string;
  setFormTechnician: (v: string) => void;
  formFindings: string;
  setFormFindings: (v: string) => void;
  formWorkDone: string;
  setFormWorkDone: (v: string) => void;
  formRecommendation: string;
  setFormRecommendation: (v: string) => void;
  formBeforePhoto: string | null;
  setFormBeforePhoto: (v: string | null) => void;
  formAfterPhoto: string | null;
  setFormAfterPhoto: (v: string | null) => void;
  formTechSign: string;
  setFormTechSign: (v: string) => void;
  formClientSign: string;
  setFormClientSign: (v: string) => void;
  onSubmit: () => void;
}

export function ManualLogTab({
  clients,
  equipment,
  formClientId,
  setFormClientId,
  formEquipmentId,
  setFormEquipmentId,
  formType,
  setFormType,
  formTechnician,
  setFormTechnician,
  formFindings,
  setFormFindings,
  formWorkDone,
  setFormWorkDone,
  formRecommendation,
  setFormRecommendation,
  formBeforePhoto,
  setFormBeforePhoto,
  formAfterPhoto,
  setFormAfterPhoto,
  formTechSign,
  setFormTechSign,
  formClientSign,
  setFormClientSign,
  onSubmit,
}: ManualLogTabProps) {
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300 pb-10">
      <div className="data-card p-8 space-y-8 bg-white dark:bg-[#1A1A20] shadow-xl border border-gray-200 dark:border-white/10 rounded-2xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-2">
           <div className="w-12 h-12 rounded-2xl bg-[#66B2B2]/10 flex items-center justify-center shadow-inner">
              <PenTool className="w-6 h-6 text-[#66B2B2]" />
           </div>
           <div>
              <h3 className="text-xl font-black text-gray-900 dark:text-[#EAEAEA] tracking-tight">Manual Service Documentation</h3>
              <p className="text-sm text-gray-500 dark:text-[#88888C] font-medium">Generate a comprehensive service report for ad-hoc maintenance.</p>
           </div>
        </div>

        {/* Step 1: Core Info */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 border-b border-gray-100 dark:border-white/5 pb-2">
             <Package className="w-4 h-4 text-[#66B2B2]" />
             <span className="text-xs font-black uppercase tracking-widest text-gray-400 dark:text-[#88888C]">Asset & Assignment</span>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-[10px] text-gray-500 dark:text-[#88888C] uppercase font-black mb-1.5 block tracking-widest">Client Company</label>
                <Select value={formClientId} onValueChange={(v) => { setFormClientId(v); setFormEquipmentId(""); }}>
                  <SelectTrigger className="h-12 bg-gray-50 dark:bg-[#121214] border-gray-100 dark:border-white/5 text-gray-900 dark:text-[#EAEAEA] focus:ring-[#66B2B2]/30 rounded-xl font-bold">
                    <SelectValue placeholder="Select client..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-[#1A1A20] border-gray-200 dark:border-white/10 z-50">
                    {clients.length > 0 ? clients.map(c => (
                      <SelectItem key={c.id} value={c.id.toString()} className="text-gray-900 dark:text-[#EAEAEA]">{c.companyName}</SelectItem>
                    )) : <div className="p-2 text-xs text-gray-400">No clients found</div>}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[10px] text-gray-500 dark:text-[#88888C] uppercase font-black mb-1.5 block tracking-widest">Equipment Unit</label>
                <Select value={formEquipmentId} onValueChange={setFormEquipmentId} disabled={!formClientId}>
                  <SelectTrigger className="h-12 bg-gray-50 dark:bg-[#121214] border-gray-100 dark:border-white/5 text-gray-900 dark:text-[#EAEAEA] focus:ring-[#66B2B2]/30 disabled:bg-gray-50 dark:disabled:bg-white/5 rounded-xl font-bold">
                    <SelectValue placeholder={formClientId ? "Select unit ID..." : "Select client first"} />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-[#1A1A20] border-gray-200 dark:border-white/10 z-50">
                    {equipment.filter(e => e.clientId === formClientId).map(e => (
                      <SelectItem key={e.id} value={e.id} className="text-gray-900 dark:text-[#EAEAEA] font-mono-tech">{e.name ?? e.id} — {e.equipmentType}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] text-gray-500 dark:text-[#88888C] uppercase font-black mb-1.5 block tracking-widest">Service Category</label>
                <Select value={formType} onValueChange={setFormType}>
                  <SelectTrigger className="h-12 bg-gray-50 dark:bg-[#121214] border-gray-100 dark:border-white/5 text-gray-900 dark:text-[#EAEAEA] focus:ring-[#66B2B2]/30 rounded-xl font-bold">
                    <SelectValue placeholder="Select type..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-[#1A1A20] border-gray-200 dark:border-white/10 z-50">
                    <SelectItem value="Heavy Equipment PMS" className="text-gray-900 dark:text-[#EAEAEA]">Heavy Equipment PMS</SelectItem>
                    <SelectItem value="Calibration PMS" className="text-gray-900 dark:text-[#EAEAEA]">Calibration PMS</SelectItem>
                    <SelectItem value="Repair" className="text-gray-900 dark:text-[#EAEAEA]">General Repair</SelectItem>
                    <SelectItem value="Inspection" className="text-gray-900 dark:text-[#EAEAEA]">Standard Inspection</SelectItem>
                    <SelectItem value="Installation" className="text-gray-900 dark:text-[#EAEAEA]">New Installation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[10px] text-gray-500 dark:text-[#88888C] uppercase font-black mb-1.5 block tracking-widest">Performing Technician</label>
                <Input value={formTechnician} onChange={(e) => setFormTechnician(e.target.value)} className="h-12 bg-gray-50 dark:bg-[#121214] border-gray-100 dark:border-white/5 text-gray-900 dark:text-[#EAEAEA] focus:ring-[#66B2B2]/30 rounded-xl font-bold" />
              </div>
            </div>
          </div>
        </div>

        {/* Step 2: Visual Evidence */}
        <div className="space-y-6">
           <div className="flex items-center gap-2 border-b border-gray-100 dark:border-white/5 pb-2">
              <Camera className="w-4 h-4 text-[#66B2B2]" />
              <span className="text-xs font-black uppercase tracking-widest text-gray-400 dark:text-[#88888C]">Visual Evidence Documentation</span>
           </div>
           <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                 <label className="text-[10px] text-gray-500 dark:text-[#88888C] uppercase font-black block tracking-widest ml-1">Pre-Service State (Before)</label>
                 <div className="relative aspect-video rounded-2xl bg-gray-50 dark:bg-[#121214] border-2 border-dashed border-gray-200 dark:border-white/10 overflow-hidden group hover:border-[#66B2B2]/50 transition-colors">
                    {formBeforePhoto ? (
                       <>
                          <img src={formBeforePhoto} className="w-full h-full object-cover" alt="Before" />
                          <button onClick={() => setFormBeforePhoto(null)} className="absolute top-2 right-2 bg-red-500 p-1.5 rounded-full text-white shadow-xl opacity-0 group-hover:opacity-100 transition-opacity">
                             <X className="w-4 h-4" />
                          </button>
                       </>
                    ) : (
                       <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-[#66B2B2]/5 transition-colors">
                          <Upload className="w-8 h-8 text-gray-300 dark:text-[#6B7280] mb-2" />
                          <span className="text-[10px] font-black text-gray-400 dark:text-[#88888C] uppercase tracking-widest">Upload Photo</span>
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                             const file = e.target.files?.[0];
                             if (file) {
                                const reader = new FileReader();
                                reader.onload = (ev) => setFormBeforePhoto(ev.target?.result as string);
                                reader.readAsDataURL(file);
                             }
                          }} />
                       </label>
                    )}
                 </div>
              </div>
              <div className="space-y-3">
                 <label className="text-[10px] text-gray-500 dark:text-[#88888C] uppercase font-black block tracking-widest ml-1">Post-Service State (After)</label>
                 <div className="relative aspect-video rounded-2xl bg-gray-50 dark:bg-[#121214] border-2 border-dashed border-gray-200 dark:border-white/10 overflow-hidden group hover:border-[#66B2B2]/50 transition-colors">
                    {formAfterPhoto ? (
                       <>
                          <img src={formAfterPhoto} className="w-full h-full object-cover" alt="After" />
                          <button onClick={() => setFormAfterPhoto(null)} className="absolute top-2 right-2 bg-red-500 p-1.5 rounded-full text-white shadow-xl opacity-0 group-hover:opacity-100 transition-opacity">
                             <X className="w-4 h-4" />
                          </button>
                       </>
                    ) : (
                       <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-[#66B2B2]/5 transition-colors">
                          <Upload className="w-8 h-8 text-gray-300 dark:text-[#6B7280] mb-2" />
                          <span className="text-[10px] font-black text-gray-400 dark:text-[#88888C] uppercase tracking-widest">Upload Photo</span>
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                             const file = e.target.files?.[0];
                             if (file) {
                                const reader = new FileReader();
                                reader.onload = (ev) => setFormAfterPhoto(ev.target?.result as string);
                                reader.readAsDataURL(file);
                             }
                          }} />
                       </label>
                    )}
                 </div>
              </div>
           </div>
        </div>

        {/* Step 3: Technical Details */}
        <div className="space-y-6">
           <div className="flex items-center gap-2 border-b border-gray-100 dark:border-white/5 pb-2">
              <FileText className="w-4 h-4 text-[#66B2B2]" />
              <span className="text-xs font-black uppercase tracking-widest text-gray-400 dark:text-[#88888C]">Technical Report Details</span>
           </div>
           <div className="grid gap-6">
              <div>
                <label className="text-[10px] text-gray-500 dark:text-[#88888C] uppercase font-black mb-1.5 block tracking-widest ml-1">Initial Findings & Diagnosed Faults</label>
                <textarea
                  className="w-full p-4 rounded-xl border border-gray-200 dark:border-white/10 text-sm text-gray-900 dark:text-[#EAEAEA] focus:border-[#66B2B2] focus:ring-2 focus:ring-[#66B2B2]/10 outline-none transition-all resize-none bg-gray-50/50 dark:bg-[#121214]/50"
                  rows={2}
                  value={formFindings}
                  onChange={(e) => setFormFindings(e.target.value)}
                  placeholder="Detail any damage, leaks, or identified issues before work started..."
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 dark:text-[#88888C] uppercase font-black mb-1.5 block tracking-widest ml-1">Technical Work & Operations Performed</label>
                <textarea
                  className="w-full p-4 rounded-xl border border-gray-200 dark:border-white/10 text-sm text-gray-900 dark:text-[#EAEAEA] focus:border-[#66B2B2] focus:ring-2 focus:ring-[#66B2B2]/10 outline-none transition-all resize-none bg-gray-50/50 dark:bg-[#121214]/50"
                  rows={3}
                  value={formWorkDone}
                  onChange={(e) => setFormWorkDone(e.target.value)}
                  placeholder="Detail all repairs, parts replaced, adjustments, and testing performed..."
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 dark:text-[#88888C] uppercase font-black mb-1.5 block tracking-widest ml-1">Strategic Maintenance Recommendations</label>
                <textarea
                  className="w-full p-4 rounded-xl border border-gray-200 dark:border-white/10 text-sm text-gray-900 dark:text-[#EAEAEA] focus:border-[#66B2B2] focus:ring-2 focus:ring-[#66B2B2]/10 outline-none transition-all resize-none bg-gray-50/50 dark:bg-[#121214]/50"
                  rows={2}
                  value={formRecommendation}
                  onChange={(e) => setFormRecommendation(e.target.value)}
                  placeholder="Next suggested service, preventative actions, or pending parts..."
                />
              </div>
           </div>
        </div>

        {/* Step 4: Verification */}
        <div className="space-y-6">
           <div className="flex items-center gap-2 border-b border-gray-100 dark:border-white/5 pb-2">
              <UserCheck className="w-4 h-4 text-[#66B2B2]" />
              <span className="text-xs font-black uppercase tracking-widest text-gray-400 dark:text-[#88888C]">Digital Seal & Verification</span>
           </div>
           <div className="grid grid-cols-2 gap-8">
              <SignaturePad
                 label="Technician Verification"
                 value={formTechSign}
                 onChange={setFormTechSign}
                 caption="Technician's digital seal of work completion."
              />
              <SignaturePad
                 label="Client Representative Acceptance"
                 value={formClientSign}
                 onChange={setFormClientSign}
                 caption="Customer's acknowledgment of service delivery."
              />
           </div>
        </div>

        <div className="bg-[#66B2B2]/5 border border-[#66B2B2]/20 dark:border-[#66B2B2]/40 p-5 rounded-2xl flex gap-4">
           <div className="w-10 h-10 rounded-xl bg-[#66B2B2]/10 flex items-center justify-center flex-shrink-0 shadow-sm border border-[#66B2B2]/20">
              <AlertTriangle className="w-5 h-5 text-[#66B2B2]" />
           </div>
           <p className="text-[11px] text-gray-700 dark:text-[#B5B5B8] leading-relaxed font-medium">
             <strong className="text-gray-900 dark:text-[#EAEAEA]">Legal Compliance Notice:</strong> By submitting this manual log, you certify that all technical work listed was performed to NexTOS safety standards and has been visually verified. This record will be permanently sealed into the asset's maintenance history and available for client review.
           </p>
        </div>

        <Button
          className="w-full h-14 bg-[#66B2B2] text-white font-black hover:bg-[#5A9E9E] rounded-2xl shadow-xl shadow-[#66B2B2]/20 transition-all active:scale-[0.98] text-base uppercase tracking-widest"
          onClick={onSubmit}
        >
           <CheckCircle2 className="w-5 h-5 mr-3" />
           Seal & Submit Service Report
        </Button>
      </div>
    </div>
  );
}

