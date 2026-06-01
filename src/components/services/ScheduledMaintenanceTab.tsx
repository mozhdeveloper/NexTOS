import type { Dispatch, SetStateAction } from "react";
import { Wrench, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
} from "@/components/ui/dialog";
import seedData from "@/data/seed-data.json";
import type { ScheduledMaintenanceEntry } from "./types";

const serviceTypeOptions = seedData.serviceTypes;
const PM_INTERVAL_UNITS = seedData.serviceIntervalUnits;

interface ScheduledMaintenanceTabProps {
  // Data
  allScheduledMaintenance: ScheduledMaintenanceEntry[];
  liveEquipment: any[];
  computeNextService: (pms: { serviceInterval: number; serviceIntervalUnit: string }, eq: any) => string;
  // Schedule modal
  scheduleModalOpen: boolean;
  setScheduleModalOpen: (v: boolean) => void;
  resetScheduleModal: () => void;
  scheduleMissingFields: string[];
  setScheduleMissingFields: Dispatch<SetStateAction<string[]>>;
  scheduleEquipmentId: string;
  setScheduleEquipmentId: (v: string) => void;
  scheduleServiceType: string;
  setScheduleServiceType: (v: string) => void;
  scheduleInterval: string;
  setScheduleInterval: (v: string) => void;
  scheduleIntervalUnit: string;
  setScheduleIntervalUnit: (v: string) => void;
  scheduleEstimatedCost: string;
  setScheduleEstimatedCost: (v: string) => void;
  handleScheduleSubmit: () => void;
  addPmsPending: boolean;
  // Edit modal
  editModalOpen: boolean;
  setEditModalOpen: (v: boolean) => void;
  resetEditModal: () => void;
  editMissingFields: string[];
  setEditMissingFields: Dispatch<SetStateAction<string[]>>;
  editEquipmentId: string;
  setEditEquipmentId: (v: string) => void;
  editServiceType: string;
  setEditServiceType: (v: string) => void;
  editInterval: string;
  setEditInterval: (v: string) => void;
  editIntervalUnit: string;
  setEditIntervalUnit: (v: string) => void;
  editEstimatedCost: string;
  setEditEstimatedCost: (v: string) => void;
  editingEntry: ScheduledMaintenanceEntry | null;
  handleEditSubmit: () => void;
  updatePmsPending: boolean;
  // Row actions
  openEditModal: (entry: ScheduledMaintenanceEntry) => void;
  handleDeleteEntry: (entry: ScheduledMaintenanceEntry) => void;
  deletePmsPending: boolean;
}

export function ScheduledMaintenanceTab({
  allScheduledMaintenance,
  liveEquipment,
  computeNextService,
  scheduleModalOpen,
  setScheduleModalOpen,
  resetScheduleModal,
  scheduleMissingFields,
  setScheduleMissingFields,
  scheduleEquipmentId,
  setScheduleEquipmentId,
  scheduleServiceType,
  setScheduleServiceType,
  scheduleInterval,
  setScheduleInterval,
  scheduleIntervalUnit,
  setScheduleIntervalUnit,
  scheduleEstimatedCost,
  setScheduleEstimatedCost,
  handleScheduleSubmit,
  addPmsPending,
  editModalOpen,
  setEditModalOpen,
  resetEditModal,
  editMissingFields,
  setEditMissingFields,
  editEquipmentId,
  setEditEquipmentId,
  editServiceType,
  setEditServiceType,
  editInterval,
  setEditInterval,
  editIntervalUnit,
  setEditIntervalUnit,
  editEstimatedCost,
  setEditEstimatedCost,
  editingEntry,
  handleEditSubmit,
  updatePmsPending,
  openEditModal,
  handleDeleteEntry,
  deletePmsPending,
}: ScheduledMaintenanceTabProps) {
  return (
    <div className="space-y-3 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wrench className="w-4 h-4 text-[#66B2B2]" />
          <span className="text-sm font-bold text-black">Scheduled Maintenance (PMS)</span>
        </div>
        <Button
          size="sm"
          onClick={() => setScheduleModalOpen(true)}
          className="h-8 bg-[#66B2B2] text-black hover:bg-[#66B2B2]/90 font-semibold text-xs"
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Schedule Service
        </Button>
      </div>

      <div className="data-card overflow-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left py-2.5 px-3 text-gray-600 font-medium">Equipment</th>
              <th className="text-left py-2.5 px-3 text-gray-600 font-medium">Client</th>
              <th className="text-left py-2.5 px-3 text-gray-600 font-medium">Serial Number</th>
              <th className="text-left py-2.5 px-3 text-gray-600 font-medium">Service Type</th>
              <th className="text-left py-2.5 px-3 text-gray-600 font-medium">Interval</th>
              <th className="text-left py-2.5 px-3 text-gray-600 font-medium">Unit</th>
              <th className="text-left py-2.5 px-3 text-gray-600 font-medium">Est. Cost</th>
              <th className="text-left py-2.5 px-3 text-gray-600 font-medium">Status</th>
              <th className="text-left py-2.5 px-3 text-gray-600 font-medium">Next Service</th>
              <th className="text-left py-2.5 px-3 text-gray-600 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {allScheduledMaintenance.map((entry) => {
              const _seedEq = liveEquipment.find((e) => e.id === entry.equipmentId);
              const nextService = _seedEq
                ? computeNextService({ serviceInterval: entry.serviceInterval, serviceIntervalUnit: entry.serviceIntervalUnit }, _seedEq)
                : "—";
              const statusDef = seedData.pmsStatuses.find(s => s.value === entry.status);
              return (
              <tr key={entry.id} className="border-b border-gray-200 hover:bg-gray-50">
                <td className="py-2.5 px-3 text-black font-medium">{entry.equipmentName}</td>
                <td className="py-2.5 px-3 text-gray-700">{entry.clientName}</td>
                <td className="py-2.5 px-3 text-gray-600 font-mono">{entry.serialNumber}</td>
                <td className="py-2.5 px-3 text-black">{entry.serviceType}</td>
                <td className="py-2.5 px-3 text-black font-mono">{entry.serviceInterval}</td>
                <td className="py-2.5 px-3 text-gray-600">{entry.serviceIntervalUnit}</td>
                <td className="py-2.5 px-3 text-black">
                  {entry.estimatedCost > 0
                    ? `₱${entry.estimatedCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : "—"}
                </td>
                <td className="py-2.5 px-3">
                  {statusDef ? (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase" style={{ backgroundColor: `${statusDef.color}33`, color: statusDef.color }}>{statusDef.label}</span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-500 uppercase">—</span>
                  )}
                </td>
                <td className="py-2.5 px-3 font-mono-tech text-xs text-gray-700">{nextService}</td>
                <td className="py-2.5 px-3">
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEditModal(entry)} className="h-6 w-6 p-0 text-gray-500 hover:text-[#66B2B2] hover:bg-[#66B2B2]/10">
                      <Pencil className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteEntry(entry)} disabled={deletePmsPending} className="h-6 w-6 p-0 text-gray-500 hover:text-[#EF4444] hover:bg-[#EF4444]/10">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </td>
              </tr>
            );
            })}
            {allScheduledMaintenance.length === 0 && (
              <tr>
                <td colSpan={10} className="py-10 text-center text-gray-400">
                  No scheduled maintenance entries. Click "+ Schedule Service" to add one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Schedule Service Modal */}
      <Dialog open={scheduleModalOpen} onOpenChange={(open) => { if (!open) resetScheduleModal(); setScheduleModalOpen(open); }}>
        <DialogContent className="bg-white border border-gray-200 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-black flex items-center gap-2">
              <Wrench className="w-4 h-4 text-[#66B2B2]" /> Schedule Maintenance
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {scheduleMissingFields.length > 0 && (
              <div className="rounded border border-[#EF4444]/40 bg-[#EF4444]/10 px-3 py-2 text-xs text-[#EF4444]">Please fill in all required fields.</div>
            )}
            <div className="space-y-1.5">
              <Label className="text-sm text-black font-medium">Equipment</Label>
              <Select value={scheduleEquipmentId} onValueChange={(v) => {
                setScheduleEquipmentId(v);
                setScheduleMissingFields((p) => p.filter((f) => f !== "equipment"));
                const taken = new Set(
                  allScheduledMaintenance
                    .filter((e) => e.equipmentId === v)
                    .map((e) => e.serviceIntervalUnit.toLowerCase())
                );
                const firstAvailable = PM_INTERVAL_UNITS.find((u) => !taken.has(u.toLowerCase()));
                if (firstAvailable) setScheduleIntervalUnit(firstAvailable);
              }}>
                <SelectTrigger className={`w-full bg-white text-black ${scheduleMissingFields.includes("equipment") ? "border-[#EF4444]" : "border-gray-200"}`}><SelectValue placeholder="Select equipment" /></SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  {liveEquipment.map((eq) => <SelectItem key={eq.id} value={eq.id}>{eq.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm text-black font-medium">Service Type</Label>
              <Select value={scheduleServiceType} onValueChange={(v) => { setScheduleServiceType(v); setScheduleMissingFields((p) => p.filter((f) => f !== "serviceType")); }}>
                <SelectTrigger className={`w-full bg-white text-black ${scheduleMissingFields.includes("serviceType") ? "border-[#EF4444]" : "border-gray-200"}`}><SelectValue placeholder="Select service type" /></SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  {serviceTypeOptions.map((opt) => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-[1fr_130px] gap-2">
              <div className="space-y-1.5">
                <Label className="text-sm text-black font-medium">Service Interval</Label>
                <Input type="number" min="1" step="any" value={scheduleInterval} onChange={(e) => { setScheduleInterval(e.target.value); setScheduleMissingFields((p) => p.filter((f) => f !== "serviceInterval")); }} placeholder="e.g. 500" className={`bg-white text-black placeholder:text-gray-400 ${scheduleMissingFields.includes("serviceInterval") ? "border-[#EF4444]" : "border-gray-200"}`} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm text-black font-medium">Unit</Label>
                <Select value={scheduleIntervalUnit} onValueChange={setScheduleIntervalUnit}>
                  <SelectTrigger className="w-full bg-white border-gray-200 text-black"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-white border-gray-200">
                    {(() => {
                      const takenUnitsForAdd = new Set(
                        allScheduledMaintenance
                          .filter((e) => e.equipmentId === scheduleEquipmentId)
                          .map((e) => e.serviceIntervalUnit.toLowerCase())
                      );
                      return PM_INTERVAL_UNITS.map((u) => (
                        <SelectItem key={u} value={u} disabled={takenUnitsForAdd.has(u.toLowerCase())}>
                          {u}
                        </SelectItem>
                      ));
                    })()}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm text-black font-medium">Estimated Cost</Label>
              <Input type="number" min="0" step="0.01" value={scheduleEstimatedCost} onChange={(e) => setScheduleEstimatedCost(e.target.value)} placeholder="$0.00" className="bg-white border-gray-200 text-black placeholder:text-gray-400" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => { resetScheduleModal(); setScheduleModalOpen(false); }} className="border-gray-200 text-gray-600 hover:bg-gray-50" disabled={addPmsPending}>Cancel</Button>
            <Button onClick={handleScheduleSubmit} className="bg-[#66B2B2] text-black hover:bg-[#66B2B2]/90 font-semibold" disabled={addPmsPending}>{addPmsPending ? "Saving…" : "Schedule →"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Maintenance Modal */}
      <Dialog open={editModalOpen} onOpenChange={(open) => { if (!open) resetEditModal(); setEditModalOpen(open); }}>
        <DialogContent className="bg-white border border-gray-200 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-black flex items-center gap-2">
              <Pencil className="w-4 h-4 text-[#66B2B2]" /> Edit Maintenance
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {editMissingFields.length > 0 && (
              <div className="rounded border border-[#EF4444]/40 bg-[#EF4444]/10 px-3 py-2 text-xs text-[#EF4444]">Please fill in all required fields.</div>
            )}
            <div className="space-y-1.5">
              <Label className="text-sm text-black font-medium">Equipment</Label>
              <Select value={editEquipmentId} onValueChange={(v) => { setEditEquipmentId(v); setEditMissingFields((p) => p.filter((f) => f !== "equipment")); }}>
                <SelectTrigger className={`w-full bg-white text-black ${editMissingFields.includes("equipment") ? "border-[#EF4444]" : "border-gray-200"}`}><SelectValue placeholder="Select equipment" /></SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  {liveEquipment.map((eq) => <SelectItem key={eq.id} value={eq.id}>{eq.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm text-black font-medium">Service Type</Label>
              <Select value={editServiceType} onValueChange={(v) => { setEditServiceType(v); setEditMissingFields((p) => p.filter((f) => f !== "serviceType")); }}>
                <SelectTrigger className={`w-full bg-white text-black ${editMissingFields.includes("serviceType") ? "border-[#EF4444]" : "border-gray-200"}`}><SelectValue placeholder="Select service type" /></SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  {serviceTypeOptions.map((opt) => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-[1fr_130px] gap-2">
              <div className="space-y-1.5">
                <Label className="text-sm text-black font-medium">Service Interval</Label>
                <Input type="number" min="1" step="any" value={editInterval} onChange={(e) => { setEditInterval(e.target.value); setEditMissingFields((p) => p.filter((f) => f !== "serviceInterval")); }} placeholder="e.g. 500" className={`bg-white text-black placeholder:text-gray-400 ${editMissingFields.includes("serviceInterval") ? "border-[#EF4444]" : "border-gray-200"}`} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm text-black font-medium">Unit</Label>
                <Select value={editIntervalUnit} onValueChange={setEditIntervalUnit}>
                  <SelectTrigger className="w-full bg-white border-gray-200 text-black"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-white border-gray-200">
                    {(() => {
                      const takenUnitsForEdit = new Set(
                        allScheduledMaintenance
                          .filter((e) => e.equipmentId === editEquipmentId && e.id !== editingEntry?.id)
                          .map((e) => e.serviceIntervalUnit.toLowerCase())
                      );
                      return PM_INTERVAL_UNITS.map((u) => (
                        <SelectItem key={u} value={u} disabled={takenUnitsForEdit.has(u.toLowerCase())}>
                          {u}
                        </SelectItem>
                      ));
                    })()}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm text-black font-medium">Estimated Cost</Label>
              <Input type="number" min="0" step="0.01" value={editEstimatedCost} onChange={(e) => setEditEstimatedCost(e.target.value)} placeholder="$0.00" className="bg-white border-gray-200 text-black placeholder:text-gray-400" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => { resetEditModal(); setEditModalOpen(false); }} className="border-gray-200 text-gray-600 hover:bg-gray-50" disabled={updatePmsPending}>Cancel</Button>
            <Button onClick={handleEditSubmit} className="bg-[#66B2B2] text-white hover:bg-[#66B2B2]/90 font-semibold" disabled={updatePmsPending}>{updatePmsPending ? "Saving…" : "Save Changes"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
