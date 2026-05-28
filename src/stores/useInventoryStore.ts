import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { InventoryItem, PartUsage } from "@/types";
import { toast } from "sonner";
import seedData from "@/data/seed-data.json";

interface InventoryState {
  items: InventoryItem[];
  usageHistory: PartUsage[];
  
  // Actions
  addItem: (item: Omit<InventoryItem, "id" | "createdAt" | "lastRestocked">) => void;
  updateItem: (id: number, data: Partial<InventoryItem>) => void;
  restockItem: (id: number, quantity: number) => void;
  
  // Usage Actions
  logPartUsage: (usage: Omit<PartUsage, "id" | "createdAt" | "unitPriceAtTime">) => void;
  getUsageByService: (serviceRecordId: number) => PartUsage[];
  
  // Selectors
  getLowStockItems: () => InventoryItem[];
  getItemsByCategory: (category: InventoryItem["category"]) => InventoryItem[];
  getItemByPartNumber: (partNumber: string) => InventoryItem | undefined;
}

// Map seed data to inventory items
const mockInventory: InventoryItem[] = seedData.parts.map((part, index) => ({
  id: index + 1,
  partNumber: part.id,
  name: part.name,
  category: part.category,
  unit: part.unitType,
  stockLevel: part.quantity,
  minThreshold: part.minQuantity,
  pricePerUnit: part.unitPrice,
  compatibility: [],
  lastRestocked: new Date().toISOString(),
  createdAt: new Date().toISOString()
}));

export const useInventoryStore = create<InventoryState>()(
  persist(
    (set, get) => ({
      items: mockInventory,
      usageHistory: [],

      addItem: (item) => {
        const newItem: InventoryItem = {
          ...item,
          id: Date.now(),
          lastRestocked: new Date().toISOString(),
          createdAt: new Date().toISOString()
        };
        set((state) => ({ items: [...state.items, newItem] }));
        toast.success(`Part Added`, { description: `${item.name} is now in inventory.` });
      },

      updateItem: (id, data) => {
        set((state) => ({
          items: state.items.map((i) => (i.id === id ? { ...i, ...data } : i))
        }));
      },

      restockItem: (id, quantity) => {
        set((state) => ({
          items: state.items.map((i) => 
            i.id === id 
              ? { ...i, stockLevel: i.stockLevel + quantity, lastRestocked: new Date().toISOString() } 
              : i
          )
        }));
        const item = get().items.find(i => i.id === id);
        toast.success(`Restock Complete`, { description: `Added ${quantity} units to ${item?.name}.` });
      },

      logPartUsage: (usage) => {
        const item = get().items.find(i => i.id === usage.inventoryItemId);
        if (!item) return;

        if (item.stockLevel < usage.quantityUsed) {
          toast.error(`Insufficient Stock`, { description: `Only ${item.stockLevel} units of ${item.name} remaining.` });
          return;
        }

        const newUsage: PartUsage = {
          ...usage,
          id: Date.now(),
          unitPriceAtTime: item.pricePerUnit,
          createdAt: new Date().toISOString()
        };

        set((state) => ({
          usageHistory: [...state.usageHistory, newUsage],
          items: state.items.map((i) => 
            i.id === usage.inventoryItemId 
              ? { ...i, stockLevel: i.stockLevel - usage.quantityUsed } 
              : i
          )
        }));

        // Alert if below threshold
        const updatedItem = get().items.find(i => i.id === usage.inventoryItemId);
        if (updatedItem && updatedItem.stockLevel <= updatedItem.minThreshold) {
          toast.warning(`Low Stock Alert`, { 
            description: `${updatedItem.name} level is ${updatedItem.stockLevel}. Min threshold: ${updatedItem.minThreshold}.` 
          });
        }
      },

      getUsageByService: (serviceRecordId) => 
        get().usageHistory.filter(u => u.serviceRecordId === serviceRecordId),

      getLowStockItems: () => 
        get().items.filter(i => i.stockLevel <= i.minThreshold),

      getItemsByCategory: (category) => 
        get().items.filter(i => i.category === category),

      getItemByPartNumber: (partNumber) => 
        get().items.find(i => i.partNumber === partNumber)
    }),
    {
      name: "nexvision-inventory-v1",
    }
  )
);
