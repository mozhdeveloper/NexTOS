import { useState } from "react";
import { UserCheck, Clock, AlertTriangle, Settings, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SafetyProtocolProps {
  checklist: any;
  onSave: (c: any) => void;
  onBack: () => void;
}

export function SafetyProtocol({ checklist, onSave, onBack }: SafetyProtocolProps) {
    const [localChecklist, setLocalChecklist] = useState(checklist);

    const items = [
        { id: 'ppeChecked', label: 'PPE Verified', desc: 'Helmet, Gloves, and High-Vis vest are worn.', icon: UserCheck },
        { id: 'engineOff', label: 'Engine Isolated', desc: 'Engine is OFF and key is removed from ignition.', icon: Clock },
        { id: 'areaSecured', label: 'Work Area Secured', desc: 'Area is cordoned off and bystanders are clear.', icon: AlertTriangle },
        { id: 'lotoApplied', label: 'LOTO Applied', desc: 'Lockout/Tagout procedures are physically applied.', icon: Settings },
    ];

    const allChecked = Object.values(localChecklist).every(v => v === true);

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-3">
                    <AlertTriangle className="w-8 h-8 text-amber-600" />
                </div>
                <h4 className="text-lg font-bold text-gray-900">Safety First Protocol</h4>
                <p className="text-sm text-gray-500 px-10">Perform these mandatory checks before touching the machine.</p>
            </div>

            <div className="space-y-3">
                {items.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setLocalChecklist({ ...localChecklist, [item.id]: !localChecklist[item.id] })}
                        className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${
                            localChecklist[item.id]
                                ? 'bg-green-50 border-green-500 shadow-sm'
                                : 'bg-white border-gray-100 hover:border-gray-200'
                        }`}
                    >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                            localChecklist[item.id] ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'
                        }`}>
                            <item.icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                            <div className={`text-sm font-bold ${localChecklist[item.id] ? 'text-green-700' : 'text-gray-900'}`}>{item.label}</div>
                            <div className="text-[10px] text-gray-400 font-medium uppercase tracking-tighter">{item.desc}</div>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                            localChecklist[item.id] ? 'bg-green-500 border-green-500' : 'bg-white border-gray-200'
                        }`}>
                            {localChecklist[item.id] && <Check className="w-4 h-4 text-white" />}
                        </div>
                    </button>
                ))}
            </div>

            <div className="flex gap-3 pt-2">
                <Button variant="ghost" className="flex-1 h-12 rounded-xl text-gray-400 font-bold" onClick={onBack}>Previous</Button>
                <Button
                    className={`flex-[2] h-12 font-bold rounded-xl transition-all ${
                        allChecked
                            ? 'bg-[#66B2B2] text-white hover:bg-[#5A9E9E] shadow-lg shadow-[#66B2B2]/20'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                    disabled={!allChecked}
                    onClick={() => onSave(localChecklist)}
                >
                    {allChecked ? 'Proceed to Documentation' : 'Complete Checklist to Unlock'}
                </Button>
            </div>
        </div>
    );
}
