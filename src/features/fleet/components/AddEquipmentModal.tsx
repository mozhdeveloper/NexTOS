import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Label } from "@/shared/components/ui/label";
import type { Client } from "@/types";
import seedData from "@/data/seed-data.json";

// Values sourced from serviceIntervalUnits in src/data/seed-data.json
export type ServiceIntervalUnit = string;

export interface EquipmentPMSConfiguration {
  serviceInterval: number;
  serviceIntervalUnit: ServiceIntervalUnit;
  serviceType?: string;
}

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
  pmsConfiguration?: EquipmentPMSConfiguration;
  lat?: number;
  lng?: number;
}

interface AddEquipmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: Client[];
  onSubmitEquipment: (equipment: Equipment) => void | Promise<void>;
  initialEquipment?: Equipment | null;
  equipmentTypeOptions?: Array<{ value: string; label: string }>;
}

const EQUIPMENT_TYPES = seedData.equipmentTypes;

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
  onSubmitEquipment,
  initialEquipment,
  equipmentTypeOptions,
}: AddEquipmentModalProps) {
  type RequiredFieldKey = "equipmentName" | "equipmentType" | "selectedClient" | "serialNumber";
  const [equipmentName, setEquipmentName] = useState("");
  const [equipmentType, setEquipmentType] = useState("");
  const [selectedClient, setSelectedClient] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [image, setImage] = useState<string>("");
  const [missingFields, setMissingFields] = useState<RequiredFieldKey[]>([]);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (initialEquipment) {
      setEquipmentName(initialEquipment.name);
      setEquipmentType(initialEquipment.type);
      setSelectedClient(String(initialEquipment.clientId));
      setSerialNumber(initialEquipment.serialNumber);
      setNotes(initialEquipment.notes);
      setImage(initialEquipment.image ?? "");
      setMissingFields([]);
      return;
    }

    setEquipmentName("");
    setEquipmentType("");
    setSelectedClient("");
    setSerialNumber("");
    setNotes("");
    setImage("");
    setMissingFields([]);
  }, [initialEquipment, open]);

  const getMissingRequiredFields = (): RequiredFieldKey[] => {
    const requiredChecks: Array<{ key: RequiredFieldKey; value: string }> = [
      { key: "equipmentName", value: equipmentName.trim() },
      { key: "equipmentType", value: equipmentType },
      { key: "selectedClient", value: selectedClient },
      { key: "serialNumber", value: serialNumber.trim() },
    ];

    return requiredChecks.filter((field) => !field.value).map((field) => field.key);
  };

  const isFieldMissing = (fieldKey: RequiredFieldKey): boolean => missingFields.includes(fieldKey);

  const missingFieldLabels: Record<RequiredFieldKey, string> = {
    equipmentName: "Equipment Name",
    equipmentType: "Equipment Type",
    selectedClient: "Client",
    serialNumber: "Serial Number",
  };

  const availableEquipmentTypes =
    equipmentTypeOptions && equipmentTypeOptions.length > 0
      ? equipmentTypeOptions
      : EQUIPMENT_TYPES;

  const handleSubmit = async () => {
    const missing = getMissingRequiredFields();
    if (missing.length > 0) {
      setMissingFields(missing);
      return;
    }

    const timestamp = Date.now();
    const randomSuffix = timestamp;
    const hoursPreset = HARD_CODED_HOURS_PRESETS[randomSuffix % HARD_CODED_HOURS_PRESETS.length];

    const equipmentToSave: Equipment = {
      id: initialEquipment?.id ?? `eq-${timestamp}`,
      name: equipmentName,
      type: equipmentType,
      clientId: Number(selectedClient),
      serialNumber,
      notes,
      ...(image ? { image } : {}),
      hoursToday: initialEquipment?.hoursToday ?? hoursPreset.today,
      hoursTotal: initialEquipment?.hoursTotal ?? hoursPreset.total,
    };

    try {
      await onSubmitEquipment(equipmentToSave);
    } catch (error) {
      console.error("Failed to save equipment", error);
      toast.error(error instanceof Error ? error.message : "Failed to save equipment. Please try again.");
      return;
    }

    // Reset form
    setEquipmentName("");
    setEquipmentType("");
    setSelectedClient("");
    setSerialNumber("");
    setNotes("");
    setImage("");
    setMissingFields([]);
    onOpenChange(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setEquipmentName("");
      setEquipmentType("");
      setSelectedClient("");
      setSerialNumber("");
      setNotes("");
      setImage("");
      setMissingFields([]);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-white border border-gray-200 w-[min(98vw,60rem)] max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-black">{initialEquipment ? "Edit Equipment" : "Add Equipment"}</DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {missingFields.length > 0 && (
            <div className="mb-4 rounded border border-[#EF4444]/40 bg-[#EF4444]/10 px-3 py-2 text-xs text-[#EF4444]">
              Missing required fields: {missingFields.map((field) => missingFieldLabels[field]).join(", ")}
            </div>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left column */}
            <div className="space-y-4">
              {/* Equipment Name */}
              <div className="space-y-2">
                <Label className="text-sm text-black">Equipment Name</Label>
                <Input
                  value={equipmentName}
                  onChange={(e) => {
                    setEquipmentName(e.target.value);
                    if (missingFields.length > 0) {
                      setMissingFields((prev) => prev.filter((field) => field !== "equipmentName"));
                    }
                  }}
                  placeholder="Enter equipment name"
                  className={`bg-white text-black placeholder:text-gray-400 focus-visible:border-[#66B2B2] focus-visible:ring-[#66B2B2]/30 ${
                    isFieldMissing("equipmentName") ? "border-[#EF4444]" : "border-gray-200"
                  }`}
                />
                {isFieldMissing("equipmentName") && (
                  <p className="text-xs text-[#EF4444]">Equipment Name is required.</p>
                )}
              </div>

              {/* Equipment Type */}
              <div className="space-y-2">
                <Label className="text-sm text-black">Equipment Type</Label>
                <Select
                  value={equipmentType}
                  onValueChange={(value) => {
                    setEquipmentType(value);
                    if (missingFields.length > 0) {
                      setMissingFields((prev) => prev.filter((field) => field !== "equipmentType"));
                    }
                  }}
                >
                  <SelectTrigger
                    className={`w-full truncate bg-white text-black ${
                      isFieldMissing("equipmentType") ? "border-[#EF4444]" : "border-gray-200"
                    }`}
                  >
                    <SelectValue placeholder="Select equipment type" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200">
                    {availableEquipmentTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isFieldMissing("equipmentType") && (
                  <p className="text-xs text-[#EF4444]">Equipment Type is required.</p>
                )}
              </div>

              {/* Client Selection */}
              <div className="space-y-2">
                <Label className="text-sm text-black">Client</Label>
                <Select
                  value={selectedClient}
                  onValueChange={(value) => {
                    setSelectedClient(value);
                    if (missingFields.length > 0) {
                      setMissingFields((prev) => prev.filter((field) => field !== "selectedClient"));
                    }
                  }}
                >
                  <SelectTrigger
                    className={`w-full truncate bg-white text-black ${
                      isFieldMissing("selectedClient") ? "border-[#EF4444]" : "border-gray-200"
                    }`}
                  >
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200">
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={String(client.id)}>
                        {client.companyName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isFieldMissing("selectedClient") && (
                  <p className="text-xs text-[#EF4444]">Client is required.</p>
                )}
              </div>

              {/* Serial Number */}
              <div className="space-y-2">
                <Label className="text-sm text-black">Serial Number</Label>
                <Input
                  value={serialNumber}
                  onChange={(e) => {
                    setSerialNumber(e.target.value);
                    if (missingFields.length > 0) {
                      setMissingFields((prev) => prev.filter((field) => field !== "serialNumber"));
                    }
                  }}
                  placeholder="Enter serial number"
                  className={`bg-white text-black placeholder:text-gray-400 focus-visible:border-[#66B2B2] focus-visible:ring-[#66B2B2]/30 ${
                    isFieldMissing("serialNumber") ? "border-[#EF4444]" : "border-gray-200"
                  }`}
                />
                {isFieldMissing("serialNumber") && (
                  <p className="text-xs text-[#EF4444]">Serial Number is required.</p>
                )}
              </div>
            </div>

            {/* Right column */}
            <div className="space-y-4">
              {/* Equipment Photo */}
              <div className="space-y-2">
                <Label className="text-sm text-black">Equipment Photo</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      const result = reader.result;
                      if (typeof result === "string") {
                        setImage(result);
                      }
                    };
                    reader.readAsDataURL(file);
                  }}
                  className="bg-white border-gray-200 text-black placeholder:text-gray-400 focus-visible:border-[#66B2B2] focus-visible:ring-[#66B2B2]/30 cursor-pointer"
                />
              </div>

              {/* Notes */}
              <div className="space-y-2 flex flex-col flex-1">
                <Label className="text-sm text-black">Notes</Label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any additional notes about this equipment"
                  className="w-full rounded-md bg-white border border-gray-200 px-3 py-2 text-sm text-black placeholder:text-gray-400 focus-visible:border-[#66B2B2] focus-visible:ring-[#66B2B2]/30 outline-none transition-colors resize-none"
                  style={{ minHeight: "200px", flex: 1 }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-4">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            className="border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            className="bg-[#66B2B2] text-white hover:bg-[#66B2B2]/90 font-semibold"
          >
            {initialEquipment ? "Save Changes" : "Add Equipment"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

