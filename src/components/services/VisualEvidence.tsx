import { useState } from "react";
import { Camera, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VisualEvidenceProps {
  label: string;
  photo?: string;
  notes?: string;
  onSave: (photo: string, notes: string) => void;
  onBack: () => void;
}

export function VisualEvidence({ label, photo, notes, onSave, onBack }: VisualEvidenceProps) {
    const [localPhoto, setLocalPhoto] = useState(photo || "");
    const [localNotes, setLocalNotes] = useState(notes || "");

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => setLocalPhoto(ev.target?.result as string);
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="space-y-5">
            <div className="relative aspect-video rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 overflow-hidden group">
                {localPhoto ? (
                    <>
                        <img src={localPhoto} className="w-full h-full object-cover" alt="Evidence" />
                        <button onClick={() => setLocalPhoto("")} className="absolute top-2 right-2 bg-red-500 p-1.5 rounded-full text-white shadow-xl opacity-0 group-hover:opacity-100 transition-opacity">
                            <X className="w-4 h-4" />
                        </button>
                    </>
                ) : (
                    <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors">
                        <Camera className="w-10 h-10 text-gray-300 mb-2" />
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Capture {label} State</span>
                        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
                    </label>
                )}
            </div>
            <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1">Condition Notes</label>
                <textarea
                    className="w-full p-4 rounded-xl border border-gray-200 text-sm focus:border-[#66B2B2] focus:ring-2 focus:ring-[#66B2B2]/10 outline-none transition-all resize-none"
                    placeholder={`Describe ${label.toLowerCase()} condition...`}
                    rows={2}
                    value={localNotes}
                    onChange={(e) => setLocalNotes(e.target.value)}
                />
            </div>
            <div className="flex gap-3">
                <Button variant="ghost" className="flex-1 h-12 rounded-xl text-gray-400 font-bold" onClick={onBack}>Previous</Button>
                <Button
                    className="flex-[2] h-12 bg-[#66B2B2] text-white font-bold rounded-xl hover:bg-[#5A9E9E]"
                    disabled={!localPhoto}
                    onClick={() => onSave(localPhoto, localNotes)}
                >
                    Save & Proceed
                </Button>
            </div>
        </div>
    );
}
