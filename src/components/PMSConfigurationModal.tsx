import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Trash2, Edit2 } from "lucide-react";

export interface PMSConfiguration {
  id: string;
  equipmentType: string;
  serviceIntervalHours: number;
}

interface PMSConfigurationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  configurations: PMSConfiguration[];
  onAddConfiguration: (config: PMSConfiguration) => void;
  onUpdateConfiguration: (id: string, config: PMSConfiguration) => void;
  onDeleteConfiguration: (id: string) => void;
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

const SERVICE_HOURS = [
  { value: "3000", label: "3,000 hours" },
  { value: "5000", label: "5,000 hours" },
  { value: "8000", label: "8,000 hours" },
  { value: "10000", label: "10,000 hours" },
];

export function PMSConfigurationModal({
  open,
  onOpenChange,
  configurations,
  onAddConfiguration,
  onUpdateConfiguration,
  onDeleteConfiguration,
}: PMSConfigurationModalProps) {
  const [selectedEquipmentType, setSelectedEquipmentType] = useState("");
  const [selectedHours, setSelectedHours] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleSubmit = () => {
    if (!selectedEquipmentType || !selectedHours) {
      return;
    }

    const config: PMSConfiguration = {
      id: editingId || `pms-${Date.now()}`,
      equipmentType: selectedEquipmentType,
      serviceIntervalHours: Number(selectedHours),
    };

    if (editingId) {
      onUpdateConfiguration(editingId, config);
      setEditingId(null);
    } else {
      onAddConfiguration(config);
    }

    // Reset form
    setSelectedEquipmentType("");
    setSelectedHours("");
  };

  const handleEdit = (config: PMSConfiguration) => {
    setSelectedEquipmentType(config.equipmentType);
    setSelectedHours(String(config.serviceIntervalHours));
    setEditingId(config.id);
  };

  const handleDelete = (id: string) => {
    onDeleteConfiguration(id);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset form when closing
      setSelectedEquipmentType("");
      setSelectedHours("");
      setEditingId(null);
    }
    onOpenChange(newOpen);
  };

  const getEquipmentTypeLabel = (value: string) => {
    return EQUIPMENT_TYPES.find((t) => t.value === value)?.label || value;
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-[#1A1A20] border border-white/10 max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[#EAEAEA]">PMS Configuration</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Equipment Type */}
          <div className="space-y-2">
            <Label className="text-sm text-[#EAEAEA]">Equipment Type</Label>
            <Select value={selectedEquipmentType} onValueChange={setSelectedEquipmentType}>
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

          {/* Service Interval Hours */}
          <div className="space-y-2">
            <Label className="text-sm text-[#EAEAEA]">Service Interval Hours</Label>
            <Select
              value={selectedHours}
              onValueChange={setSelectedHours}
              disabled={!selectedEquipmentType}
            >
              <SelectTrigger
                className={`bg-[#121214] border-white/10 ${
                  selectedEquipmentType
                    ? "text-[#EAEAEA] cursor-pointer"
                    : "text-[#88888C] cursor-not-allowed opacity-50"
                }`}
              >
                <SelectValue placeholder="Select service interval" />
              </SelectTrigger>
              <SelectContent className="bg-[#1A1A20] border-white/10">
                {SERVICE_HOURS.map((hours) => (
                  <SelectItem key={hours.value} value={hours.value}>
                    {hours.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!selectedEquipmentType && (
              <p className="text-xs text-[#88888C]">
                Select an equipment type first
              </p>
            )}
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setSelectedEquipmentType("");
                setSelectedHours("");
                setEditingId(null);
              }}
              className="border-white/10 text-[#EAEAEA] hover:bg-white/10 text-sm"
            >
              Clear
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!selectedEquipmentType || !selectedHours}
              className="bg-[#F2A900] text-[#050505] hover:bg-[#F2A900]/90 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {editingId ? "Update" : "Add"} Configuration
            </Button>
          </div>

          {/* Divider */}
          {configurations.length > 0 && (
            <div className="pt-4 border-t border-white/10">
              <h3 className="text-sm font-semibold text-[#EAEAEA] mb-3">
                Configurations
              </h3>

              {/* Configuration Table */}
              <div className="space-y-2">
                {configurations.map((config) => (
                  <div
                    key={config.id}
                    className="flex items-center justify-between p-3 bg-[#121214] rounded border border-white/5 hover:border-white/10 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-[#EAEAEA] font-medium">
                        {getEquipmentTypeLabel(config.equipmentType)}
                      </div>
                      <div className="text-xs text-[#88888C]">
                        {config.serviceIntervalHours.toLocaleString()} hours
                      </div>
                    </div>
                    <div className="flex gap-2 ml-2">
                      <button
                        onClick={() => handleEdit(config)}
                        className="p-1.5 rounded hover:bg-white/10 transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4 text-[#F2A900]" />
                      </button>
                      <button
                        onClick={() => handleDelete(config.id)}
                        className="p-1.5 rounded hover:bg-white/10 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4 text-[#EF4444]" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 justify-end pt-4 border-t border-white/10">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            className="border-white/10 text-[#EAEAEA] hover:bg-white/10"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
