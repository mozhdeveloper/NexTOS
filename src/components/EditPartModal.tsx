import { useEffect, useState } from "react";
import { toast } from "sonner";
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
import { Edit2 } from "lucide-react";
import type { InventoryItem } from "@/types";

export interface EditPartModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  part: InventoryItem | null;
  onSubmitPart: (id: number, data: Partial<InventoryItem>) => void;
}

const CATEGORIES = [
  { value: "Filter", label: "Filter" },
  { value: "Oil", label: "Oil & Fluids" },
  { value: "Belt", label: "Drive Belts" },
  { value: "Hardware", label: "Hardware" },
  { value: "Electrical", label: "Electrical" },
  { value: "Other", label: "Other" },
];

export function EditPartModal({
  open,
  onOpenChange,
  part,
  onSubmitPart,
}: EditPartModalProps) {
  type RequiredFieldKey = "partName" | "partId" | "category" | "unitPrice";

  const [partName, setPartName] = useState("");
  const [partId, setPartId] = useState("");
  const [category, setCategory] = useState("");
  const [otherCategory, setOtherCategory] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [minThreshold, setMinThreshold] = useState("");
  const [missingFields, setMissingFields] = useState<RequiredFieldKey[]>([]);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (part) {
      setPartName(part.name);
      setPartId(part.partNumber);
      const isStandardCategory = CATEGORIES.some(c => c.value === part.category);
      if (isStandardCategory) {
        setCategory(part.category);
        setOtherCategory("");
      } else {
        setCategory("Other");
        setOtherCategory(part.category);
      }
      setUnitPrice(part.pricePerUnit.toString());
      setMinThreshold(part.minThreshold.toString());
      setMissingFields([]);
      return;
    }
  }, [open, part]);

  const handleSubmit = () => {
    const newMissingFields: RequiredFieldKey[] = [];

    if (!partName.trim()) newMissingFields.push("partName");
    if (!partId.trim()) newMissingFields.push("partId");
    if (!category) newMissingFields.push("category");
    if (category === "Other" && !otherCategory.trim()) {
      newMissingFields.push("category");
    }
    if (!unitPrice || parseFloat(unitPrice) <= 0) newMissingFields.push("unitPrice");

    if (newMissingFields.length > 0) {
      setMissingFields(newMissingFields);
      toast.error("Missing Required Fields", {
        description: "Please fill in all required fields.",
      });
      return;
    }

    const updatedData: Partial<InventoryItem> = {
      name: partName.trim(),
      partNumber: partId.trim(),
      category: category === "Other" ? otherCategory.trim() : (category as InventoryItem["category"]),
      pricePerUnit: parseFloat(unitPrice),
      minThreshold: minThreshold ? parseInt(minThreshold) : 10,
    };

    onSubmitPart(part!.id, updatedData);
    onOpenChange(false);
    toast.success("Part Updated", {
      description: `${partName} has been updated successfully.`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white border-gray-200 sm:max-w-md rounded-2xl shadow-2xl">
        <DialogHeader className="border-b border-gray-50 pb-4">
          <DialogTitle className="text-gray-900 flex items-center gap-2">
            <Edit2 className="w-5 h-5 text-[#66B2B2]" />
            Edit Part
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

          {/* Unit Price */}
          <div className="space-y-2">
            <Label className="text-[10px] text-gray-400 font-black uppercase tracking-widest ml-1">
              Unit Price <span className="text-red-500">*</span>
            </Label>
            <Input
              type="number"
              placeholder="0.00"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              step="0.01"
              min="0"
              className={`h-12 bg-white border-gray-200 focus:ring-[#66B2B2]/20 text-right ${
                missingFields.includes("unitPrice") ? "border-red-500" : ""
              }`}
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
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
