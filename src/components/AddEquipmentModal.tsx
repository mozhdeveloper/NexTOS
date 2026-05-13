import { useEffect, useState } from "react";
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

export type ServiceIntervalUnit = "Hours" | "KM" | "Weeks" | "Months" | "Years";

export interface EquipmentPMSConfiguration {
  serviceIntervalHours: number;
  serviceIntervalUnit: ServiceIntervalUnit;
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

const EQUIPMENT_TYPES = [
  { value: "heavy-equipment", label: "Heavy Equipment" },
  { value: "testing-equipment", label: "Testing Equipment" },
  { value: "laboratory-equipment", label: "Laboratory Equipment" },
  { value: "safety-equipment", label: "Safety Equipment" },
  { value: "vehicles", label: "Vehicles" },
  { value: "power-tools", label: "Power Tools" },
  { value: "monitoring-equipment", label: "Monitoring Equipment" },
];

const SERVICE_INTERVAL_UNITS: ServiceIntervalUnit[] = ["Hours", "KM", "Weeks", "Months", "Years"];

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
  const [serviceIntervalValue, setServiceIntervalValue] = useState("");
  const [serviceIntervalUnit, setServiceIntervalUnit] = useState<ServiceIntervalUnit>("Hours");
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
      setServiceIntervalValue(
        initialEquipment.pmsConfiguration?.serviceIntervalHours !== undefined
          ? String(initialEquipment.pmsConfiguration.serviceIntervalHours)
          : ""
      );
      setServiceIntervalUnit(initialEquipment.pmsConfiguration?.serviceIntervalUnit ?? "Hours");
      setMissingFields([]);
      return;
    }

    setEquipmentName("");
    setEquipmentType("");
    setSelectedClient("");
    setSerialNumber("");
    setNotes("");
    setImage("");
    setServiceIntervalValue("");
    setServiceIntervalUnit("Hours");
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
    const trimmedInterval = serviceIntervalValue.trim();
    const numericInterval = trimmedInterval.length > 0 ? Number(trimmedInterval) : Number.NaN;
    const pmsConfiguration =
      trimmedInterval.length > 0 && Number.isFinite(numericInterval)
        ? {
            serviceIntervalHours: numericInterval,
            serviceIntervalUnit,
          }
        : undefined;

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
      ...(pmsConfiguration ? { pmsConfiguration } : {}),
    };

    try {
      await onSubmitEquipment(equipmentToSave);
    } catch (error) {
      console.error("Failed to save equipment", error);
      return;
    }

    // Reset form
    setEquipmentName("");
    setEquipmentType("");
    setSelectedClient("");
    setSerialNumber("");
    setNotes("");
    setImage("");
    setServiceIntervalValue("");
    setServiceIntervalUnit("Hours");
    setMissingFields([]);
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
      setImage("");
        setServiceIntervalValue("");
        setServiceIntervalUnit("Hours");
      setMissingFields([]);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-white border border-gray-200 max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-black">{initialEquipment ? "Edit Equipment" : "Add Equipment"}</DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {missingFields.length > 0 && (
            <div className="rounded border border-[#EF4444]/40 bg-[#EF4444]/10 px-3 py-2 text-xs text-[#EF4444]">
              Missing required fields: {missingFields.map((field) => missingFieldLabels[field]).join(", ")}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

              {/* Image Upload */}
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

            <div className="space-y-4">
              {/* Notes */}
              <div className="space-y-2">
                <Label className="text-sm text-black">Notes</Label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any additional notes"
                  className="w-full h-40 rounded-md bg-white border border-gray-200 px-3 py-2 text-sm text-black placeholder:text-gray-400 focus-visible:border-[#66B2B2] focus-visible:ring-[#66B2B2]/30 outline-none transition-colors resize-none"
                />
              </div>

              {/* PMS Configuration */}
              <div className="space-y-2 pt-0">
                <Label className="text-sm text-black">PMS Configuration</Label>
                <div className="grid grid-cols-[1.6fr_120px] gap-2">
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    value={serviceIntervalValue}
                    onChange={(e) => setServiceIntervalValue(e.target.value)}
                    placeholder="Service interval"
                    className="bg-white border-gray-200 text-black placeholder:text-gray-400 focus-visible:border-[#66B2B2] focus-visible:ring-[#66B2B2]/30"
                  />
                  <Select value={serviceIntervalUnit} onValueChange={(value: ServiceIntervalUnit) => setServiceIntervalUnit(value)}>
                    <SelectTrigger className="w-full bg-white border-gray-200 text-black">
                      <SelectValue placeholder="Unit" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200">
                      {SERVICE_INTERVAL_UNITS.map((unit) => (
                        <SelectItem key={unit} value={unit}>
                          {unit}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
