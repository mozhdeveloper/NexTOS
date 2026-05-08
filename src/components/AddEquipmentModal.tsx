import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { Client } from "@/types";

export interface Equipment {
  id: string;
  name: string;
  type: string;
  clientId: number;
  serialNumber: string;
  notes: string;
  image?: string;
  hoursToday: string;
  hoursTotal: string;
}

interface AddEquipmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: Client[];
  onAddEquipment: (equipment: Equipment) => void;
}

const EQUIPMENT_TYPES = [
  { value: "heavy-equipment", label: "Heavy Equipment" },
  { value: "testing-equipment", label: "Testing Equipment" },
  { value: "laboratory-equipment", label: "Laboratory Equipment" },
  { value: "safety-equipment", label: "Safety Equipment" },
  { value: "vehicles", label: "Vehicles" },
  { value: "power-tools", label: "Power Tools" },
  { value: "monitoring-equipment", label: "Monitoring Equipment" },
];

const HARD_CODED_HOURS_PRESETS = [
  { today: "4h 20m", total: "3890h 40m" },
  { today: "6h 15m", total: "2100h 40m" },
  { today: "3h 50m", total: "3450h 40m" },
  { today: "7h 10m", total: "5200h 40m" },
  { today: "5h 05m", total: "2780h 30m" },
];

export function AddEquipmentModal({
  open,
  onOpenChange,
  clients,
  onAddEquipment,
}: AddEquipmentModalProps) {
  const [equipmentName, setEquipmentName] = useState("");
  const [equipmentType, setEquipmentType] = useState("");
  const [selectedClient, setSelectedClient] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = () => {
    if (!equipmentName || !equipmentType || !selectedClient) {
      return;
    }

    const timestamp = Date.now();
    const randomSuffix = timestamp;
    const hoursPreset = HARD_CODED_HOURS_PRESETS[randomSuffix % HARD_CODED_HOURS_PRESETS.length];

    const newEquipment: Equipment = {
      id: `eq-${timestamp}`,
      name: equipmentName,
      type: equipmentType,
      clientId: Number(selectedClient),
      serialNumber,
      notes,
      hoursToday: hoursPreset.today,
      hoursTotal: hoursPreset.total,
    };

    onAddEquipment(newEquipment);

    // Reset form
    setEquipmentName("");
    setEquipmentType("");
    setSelectedClient("");
    setSerialNumber("");
    setNotes("");
    onOpenChange(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset form when closing
      setEquipmentName("");
      setEquipmentType("");
      setSelectedClient("");
      setSerialNumber("");
      setNotes("");
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-[#1A1A20] border border-white/10 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#EAEAEA]">Add Equipment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Equipment Name */}
          <div className="space-y-2">
            <Label className="text-sm text-[#EAEAEA]">Equipment Name</Label>
            <Input
              value={equipmentName}
              onChange={(e) => setEquipmentName(e.target.value)}
              placeholder="Enter equipment name"
              className="bg-[#121214] border-white/10 text-[#EAEAEA] placeholder:text-[#88888C] focus-visible:border-[#F2A900] focus-visible:ring-[#F2A900]/50"
            />
          </div>

          {/* Equipment Type */}
          <div className="space-y-2">
            <Label className="text-sm text-[#EAEAEA]">Equipment Type</Label>
            <Select value={equipmentType} onValueChange={setEquipmentType}>
              <SelectTrigger className="bg-[#121214] border-white/10 text-[#EAEAEA]">
                <SelectValue placeholder="Select equipment type" />
              </SelectTrigger>
              <SelectContent className="bg-[#1A1A20] border-white/10">
                {EQUIPMENT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Client Selection */}
          <div className="space-y-2">
            <Label className="text-sm text-[#EAEAEA]">Client</Label>
            <Select value={selectedClient} onValueChange={setSelectedClient}>
              <SelectTrigger className="bg-[#121214] border-white/10 text-[#EAEAEA]">
                <SelectValue placeholder="Select client" />
              </SelectTrigger>
              <SelectContent className="bg-[#1A1A20] border-white/10">
                {clients.map((client) => (
                  <SelectItem key={client.id} value={String(client.id)}>
                    {client.companyName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Image Upload */}
          <div className="space-y-2">
            <Label className="text-sm text-[#EAEAEA]">Equipment Photo</Label>
            <Input
              type="file"
              accept="image/*"
              className="bg-[#121214] border-white/10 text-[#EAEAEA] placeholder:text-[#88888C] focus-visible:border-[#F2A900] focus-visible:ring-[#F2A900]/50 cursor-pointer"
            />
          </div>

          {/* Serial Number */}
          <div className="space-y-2">
            <Label className="text-sm text-[#EAEAEA]">Serial Number</Label>
            <Input
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
              placeholder="Enter serial number"
              className="bg-[#121214] border-white/10 text-[#EAEAEA] placeholder:text-[#88888C] focus-visible:border-[#F2A900] focus-visible:ring-[#F2A900]/50"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label className="text-sm text-[#EAEAEA]">Notes</Label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional notes"
              className="w-full h-20 rounded-md bg-[#121214] border border-white/10 px-3 py-2 text-sm text-[#EAEAEA] placeholder:text-[#88888C] focus-visible:border-[#F2A900] focus-visible:ring-[#F2A900]/50 outline-none transition-colors resize-none"
            />
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-4">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            className="border-white/10 text-[#EAEAEA] hover:bg-white/10"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            className="bg-[#F2A900] text-[#050505] hover:bg-[#F2A900]/90 font-semibold"
          >
            Add Equipment
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
