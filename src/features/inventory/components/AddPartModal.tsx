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
import { Package } from "lucide-react";
import type { InventoryItem } from "@/types";

export interface AddPartModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitPart: (part: Omit<InventoryItem, "id" | "lastRestocked" | "createdAt">) => void;
}

const CATEGORIES = [
  { value: "Filter", label: "Filter" },
  { value: "Oil", label: "Oil & Fluids" },
  { value: "Belt", label: "Drive Belts" },
  { value: "Hardware", label: "Hardware" },
  { value: "Electrical", label: "Electrical" },
  { value: "Other", label: "Other" },
];

const UNIT_TYPES = [
  { value: "Pcs", label: "PER PCS" },
  { value: "Liters", label: "PER LITERS" },
  { value: "Kits", label: "PER KITS" },
  { value: "Meters", label: "PER METERS" },
];

export function AddPartModal({
  open,
  onOpenChange,
  onSubmitPart,
}: AddPartModalProps) {
  type RequiredFieldKey = "partName" | "partId" | "category" | "unitPrice" | "unit";

  const [partName, setPartName] = useState("");
  const [partId, setPartId] = useState("");
  const [category, setCategory] = useState("");
  const [otherCategory, setOtherCategory] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [unit, setUnit] = useState("");
  const [stockLevel, setStockLevel] = useState("");
  const [minThreshold, setMinThreshold] = useState("");
  const [missingFields, setMissingFields] = useState<RequiredFieldKey[]>([]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setPartName("");
    setPartId("");
    setCategory("");
    setOtherCategory("");
    setUnitPrice("");
    setUnit("");
    setStockLevel("");
    setMinThreshold("");
    setMissingFields([]);
  }, [open]);

  const handleSubmit = () => {
    const newMissingFields: RequiredFieldKey[] = [];

    if (!partName.trim()) newMissingFields.push("partName");
    if (!partId.trim()) newMissingFields.push("partId");
    if (!category) newMissingFields.push("category");
    if (category === "Other" && !otherCategory.trim()) {
      // You can decide if you want a specific error for this
      newMissingFields.push("category");
    }
    if (!unitPrice || parseFloat(unitPrice) <= 0) newMissingFields.push("unitPrice");
    if (!unit) newMissingFields.push("unit");

    if (newMissingFields.length > 0) {
      setMissingFields(newMissingFields);
      toast.error("Missing Required Fields", {
        description: "Please fill in all required fields.",
      });
      return;
    }

    const newPart: Omit<InventoryItem, "id" | "lastRestocked" | "createdAt"> = {
      partNumber: partId.trim(),
      name: partName.trim(),
      category: category === "Other" ? otherCategory.trim() : (category as InventoryItem["category"]),
      unit: unit as InventoryItem["unit"],
      pricePerUnit: parseFloat(unitPrice),
      stockLevel: stockLevel ? parseInt(stockLevel) : 0,
      minThreshold: minThreshold ? parseInt(minThreshold) : 10,
      compatibility: [],
    };

    onSubmitPart(newPart);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white border-gray-200 sm:max-w-md rounded-2xl shadow-2xl">
        <DialogHeader className="border-b border-gray-50 pb-4">
          <DialogTitle className="text-gray-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-[#66B2B2]" />
            Add New Part
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Part Identification */}
          <div className="space-y-2">
            <Label className="text-[10px] text-gray-400 font-black uppercase tracking-widest ml-1">
              Part Identification <span className="text-red-500">*</span>
            </Label>
            <Input
              placeholder="e.g. Engine Oil Filter (Primary)"
              value={partName}
              onChange={(e) => setPartName(e.target.value)}
              className={`h-12 bg-white border-gray-200 focus:ring-[#66B2B2]/20 ${
                missingFields.includes("partName") ? "border-red-500" : ""
              }`}
            />
          </div>

          {/* ID */}
          <div className="space-y-2">
            <Label className="text-[10px] text-gray-400 font-black uppercase tracking-widest ml-1">
              ID <span className="text-red-500">*</span>
            </Label>
            <Input
              placeholder="e.g. FL-OIL-01"
              value={partId}
              onChange={(e) => setPartId(e.target.value)}
              className={`h-12 bg-white border-gray-200 focus:ring-[#66B2B2]/20 ${
                missingFields.includes("partId") ? "border-red-500" : ""
              }`}
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label className="text-[10px] text-gray-400 font-black uppercase tracking-widest ml-1">
              Category <span className="text-red-500">*</span>
            </Label>
            <div className="flex items-center gap-3">
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger
                  className={`h-12 bg-white border-gray-200 focus:ring-[#66B2B2]/20 ${
                    category === "Other" ? "w-1/2" : "w-full"
                  } ${
                    missingFields.includes("category") ? "border-red-500" : ""
                  }`}
                >
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {category === "Other" && (
                <Input
                  placeholder="Enter custom category"
                  value={otherCategory}
                  onChange={(e) => setOtherCategory(e.target.value)}
                  className={`h-12 bg-white border-gray-200 focus:ring-[#66B2B2]/20 w-1/2 ${
                    missingFields.includes("category") && !otherCategory.trim() ? "border-red-500" : ""
                  }`}
                />
              )}
            </div>
          </div>

          {/* Unit Price & Unit */}
          <div className="space-y-2">
            <Label className="text-[10px] text-gray-400 font-black uppercase tracking-widest ml-1">
              Unit Price <span className="text-red-500">*</span>
            </Label>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                placeholder="0.00"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                step="0.01"
                min="0"
                className={`flex-1 h-12 bg-white border-gray-200 focus:ring-[#66B2B2]/20 text-right ${
                  missingFields.includes("unitPrice") ? "border-red-500" : ""
                }`}
              />
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger
                  className={`w-40 h-12 bg-white border-gray-200 focus:ring-[#66B2B2]/20 ${
                    missingFields.includes("unit") ? "border-red-500" : ""
                  }`}
                >
                  <SelectValue placeholder="Unit" />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  {UNIT_TYPES.map((u) => (
                    <SelectItem key={u.value} value={u.value}>
                      {u.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Initial Stock Level */}
          <div className="space-y-2">
            <Label className="text-[10px] text-gray-400 font-black uppercase tracking-widest ml-1">
              Initial Stock Level
            </Label>
            <Input
              type="number"
              placeholder="0"
              value={stockLevel}
              onChange={(e) => setStockLevel(e.target.value)}
              min="0"
              className="h-12 bg-white border-gray-200 focus:ring-[#66B2B2]/20"
            />
          </div>

          {/* Minimum Threshold */}
          <div className="space-y-2">
            <Label className="text-[10px] text-gray-400 font-black uppercase tracking-widest ml-1">
              Minimum Threshold
            </Label>
            <Input
              type="number"
              placeholder="10"
              value={minThreshold}
              onChange={(e) => setMinThreshold(e.target.value)}
              min="1"
              className="h-12 bg-white border-gray-200 focus:ring-[#66B2B2]/20"
            />
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-xl h-12 font-bold border-gray-200"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              className="bg-[#66B2B2] text-white hover:bg-[#5A9E9E] font-bold rounded-xl h-12 shadow-lg shadow-[#66B2B2]/20"
            >
              Add Part
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

