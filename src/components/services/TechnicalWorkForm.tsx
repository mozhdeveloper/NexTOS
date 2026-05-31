import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DraftExecution } from "@/stores/useOperationsStore";
import { useInventoryStore } from "@/stores/useInventoryStore";
import type { Equipment, Client } from "@/types";
import { getPmsMetricValue, getPmsMetricLabel } from "./utils";

interface TechnicalWorkFormProps {
  draft: DraftExecution;
  equipment?: Equipment;
  client?: Client;
  packages: any[];
  seedEquipment?: any;
  seedClients?: any[];
  pmsConfig?: any;
  onSave: (d: Partial<DraftExecution>) => void;
  onBack: () => void;
}

export function TechnicalWorkForm({ draft, equipment, client, packages, seedEquipment, seedClients, pmsConfig, onSave, onBack }: TechnicalWorkFormProps) {
    const { items: inventoryItems } = useInventoryStore();
    const [selectedPartId, setSelectedPartId] = useState<number | "">("");
    const [partQty, setPartQty] = useState<string>("1");

    const [fields, setFields] = useState({
        findings: draft.findings || "",
        workDone: draft.workDone || "",
        selectedParts: draft.selectedParts || [],
        recommendations: draft.recommendations || "",
        hoursAtService: draft.hoursAtService || Math.floor(parseFloat((equipment?.hoursTotal ?? "0").match(/(\d+)/)?.[1] ?? "0")) || 0,
        cost: draft.cost ?? 0,
    });

    const partsTotal = (fields.selectedParts ?? []).reduce(
        (sum, p) => sum + p.quantity * p.pricePerUnit,
        0
    );

    // Current metric value for the service context card
    const currentMetric = useMemo(() => {
        if (!pmsConfig) return null;
        const unit: string = pmsConfig.serviceIntervalUnit ?? "Hours";
        let gps001CacheMs = 0;
        try { gps001CacheMs = Number(window.localStorage.getItem("nextos-gps001-total-hours-ms") ?? "0") || 0; } catch {}
        return getPmsMetricValue(seedEquipment, unit, gps001CacheMs);
    }, [seedEquipment, pmsConfig]);

    // PMS interval display e.g. "200h" or "2w"
    const intervalDisplay = useMemo(() => {
        if (!pmsConfig) return null;
        const n = pmsConfig.serviceInterval;
        const u: string = (pmsConfig.serviceIntervalUnit ?? "").toLowerCase();
        const suffix = u === "hours" ? "h" : u === "km" ? "km" : u === "weeks" ? "w" : u === "days" ? "d" : u === "months" ? "mo" : u;
        return `${n}${suffix}`;
    }, [pmsConfig]);

    // Client name: prefer seed client lookup, fall back to CRM client
    const clientName = useMemo(() => {
        if (seedEquipment?.clientId) {
            const sc = (seedClients ?? []).find((c: any) => c.id === seedEquipment.clientId);
            if (sc?.companyName) return sc.companyName;
        }
        return client?.companyName ?? "—";
    }, [seedEquipment, client]);

    const eqName = seedEquipment?.name ?? equipment?.name ?? equipment?.id ?? "—";
    const eqType = seedEquipment?.equipmentType ?? equipment?.equipmentType ?? "—";

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 gap-4">
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                    <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-2">Equipment Unit</div>
                    <div className="text-xs text-white mt-1"><span className="font-semibold text-gray-600">Equipment Name:</span> {eqName}</div>
                    <div className="text-xs text-white mt-1"><span className="font-semibold text-gray-600">Equipment Type:</span> {eqType}</div>
                    <div className="text-xs text-white mt-0.5"><span className="font-semibold text-gray-600">Client:</span> {clientName}</div>
                </div>
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                    <div className="text-[10px] text-white uppercase font-bold tracking-wider mb-2">Service Context</div>
                    {pmsConfig ? (
                        <div className="space-y-1">
                            <div className="text-xs text-gray-500"><span className="font-semibold text-gray-600">Service Type:</span> {pmsConfig.serviceType}</div>
                            {intervalDisplay && <div className="text-xs text-white"><span className="font-semibold text-gray-600">Scheduled Maintenance:</span> {intervalDisplay}</div>}
                            {currentMetric && <div className="text-xs text-white"><span className="font-semibold text-gray-600">{getPmsMetricLabel(pmsConfig.serviceIntervalUnit ?? "Hours")}:</span> {currentMetric}</div>}
                        </div>
                    ) : (
                        <div className="text-sm font-bold text-white truncate">{client?.companyName ?? "—"}</div>
                    )}
                </div>
            </div>

            <div className="grid gap-4">
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1">Initial Findings / Faults</label>
                    <textarea
                        className="w-full p-4 rounded-xl border border-gray-200 text-sm focus:border-[#66B2B2] focus:ring-2 focus:ring-[#66B2B2]/10 outline-none resize-none"
                        rows={2}
                        value={fields.findings}
                        onChange={(e) => setFields({...fields, findings: e.target.value})}
                        placeholder="Detail any damage or leaks..."
                    />
                </div>

                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1">Technical Work Performed</label>
                    <textarea
                        className="w-full p-4 rounded-xl border border-gray-200 text-sm focus:border-[#66B2B2] focus:ring-2 focus:ring-[#66B2B2]/10 outline-none resize-none"
                        rows={2}
                        value={fields.workDone}
                        onChange={(e) => setFields({...fields, workDone: e.target.value})}
                        placeholder="Describe services completed..."
                    />
                </div>

                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1">Strategic Recommendations</label>
                    <Input
                        className="h-10 rounded-xl text-xs"
                        placeholder="e.g. Belt change in 500h"
                        value={fields.recommendations}
                        onChange={(e) => setFields({...fields, recommendations: e.target.value})}
                    />
                </div>

                <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-3">
                  <div className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Parts Used</div>

                  <div className="flex gap-2 items-end">
                    <div className="flex-1 space-y-1">
                      <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Part</label>
                      <Select
                        value={selectedPartId === "" ? "" : String(selectedPartId)}
                        onValueChange={(v) => setSelectedPartId(Number(v))}
                      >
                        <SelectTrigger className="h-9 bg-white border-gray-200 text-xs">
                          <SelectValue placeholder="Select part…" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-gray-200">
                          {inventoryItems.map((item) => (
                            <SelectItem key={item.id} value={String(item.id)} className="text-xs">
                              {item.name}
                              <span className="text-gray-400 ml-1">— ₱{item.pricePerUnit}/{item.unit}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-24 space-y-1">
                      <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                        Qty {selectedPartId !== "" ? `(${inventoryItems.find(i => i.id === selectedPartId)?.unit ?? ""})` : ""}
                      </label>
                      <Input
                        type="number"
                        min="1"
                        step="1"
                        className="h-9 bg-white border-gray-200 text-xs text-center"
                        value={partQty}
                        onChange={(e) => setPartQty(e.target.value)}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9 px-3 border-gray-200 text-[#66B2B2] hover:bg-[#66B2B2]/10 text-xs font-bold shrink-0"
                      disabled={selectedPartId === "" || !partQty || Number(partQty) <= 0}
                      onClick={() => {
                        const item = inventoryItems.find(i => i.id === selectedPartId);
                        if (!item) return;
                        const qty = Math.max(1, Math.floor(Number(partQty)));
                        const already = fields.selectedParts ?? [];
                        const existing = already.find(p => p.inventoryItemId === item.id);
                        const updated = existing
                          ? already.map(p => p.inventoryItemId === item.id ? { ...p, quantity: p.quantity + qty } : p)
                          : [...already, { inventoryItemId: item.id, name: item.name, quantity: qty, pricePerUnit: item.pricePerUnit }];
                        setFields({ ...fields, selectedParts: updated });
                        setSelectedPartId("");
                        setPartQty("1");
                      }}
                    >
                      + Add
                    </Button>
                  </div>

                  {(fields.selectedParts ?? []).length > 0 && (
                    <div className="space-y-1.5 mt-1">
                      {(fields.selectedParts ?? []).map((part) => (
                        <div key={part.inventoryItemId} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-gray-100">
                          <div className="text-xs font-semibold text-gray-700 flex-1 min-w-0 truncate">{part.name}</div>
                          <div className="text-[10px] text-gray-400 mx-3 shrink-0">
                            {part.quantity} × ₱{part.pricePerUnit.toLocaleString("en-PH")}
                          </div>
                          <div className="text-xs font-bold text-[#66B2B2] shrink-0 mr-2">
                            ₱{(part.quantity * part.pricePerUnit).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                          </div>
                          <button
                            type="button"
                            className="text-gray-300 hover:text-[#EF4444] transition-colors shrink-0"
                            onClick={() => setFields({ ...fields, selectedParts: (fields.selectedParts ?? []).filter(p => p.inventoryItemId !== part.inventoryItemId) })}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                      <div className="flex justify-between items-center pt-1 border-t border-gray-200 mt-1">
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Total</span>
                        <span className="text-sm font-black text-gray-900 font-mono-tech">
                          ₱{partsTotal.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
            </div>
            <div className="flex gap-3 pt-2">
                <Button variant="ghost" className="flex-1 h-12 rounded-xl text-gray-400 font-bold" onClick={onBack}>Previous</Button>
                <Button
                    className="flex-[2] h-12 bg-[#66B2B2] text-white font-bold rounded-xl hover:bg-[#5A9E9E]"
                    onClick={() => onSave({ ...fields, cost: partsTotal })}
                >
                    Save Progress & Proceed
                </Button>
            </div>
        </div>
    );
}
