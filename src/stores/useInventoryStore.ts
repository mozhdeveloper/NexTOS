import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { InventoryItem, PartUsage } from "@/types";
import { toast } from "sonner";

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

const mockInventory: InventoryItem[] = [
  {
    id: 1,
    partNumber: "FL-OIL-01",
    name: "Engine Oil Filter (Primary)",
    category: "Filter",
    unit: "Pcs",
    stockLevel: 45,
    minThreshold: 10,
    pricePerUnit: 1250,
    compatibility: ["Excavator", "Generator"],
    lastRestocked: new Date().toISOString(),
    createdAt: new Date().toISOString()
  },
  {
    id: 2,
    partNumber: "FL-AIR-02",
    name: "Heavy Duty Air Filter",
    category: "Filter",
    unit: "Pcs",
    stockLevel: 12,
    minThreshold: 15,
    pricePerUnit: 3400,
    compatibility: ["Excavator", "Boom Truck"],
    lastRestocked: new Date().toISOString(),
    createdAt: new Date().toISOString()
  },
  {
    id: 3,
    partNumber: "OIL-15W40",
    name: "Premium Engine Oil 15W-40",
    category: "Oil",
    unit: "Liters",
    stockLevel: 250,
    minThreshold: 50,
    pricePerUnit: 450,
    compatibility: ["Heavy Equipment"],
    lastRestocked: new Date().toISOString(),
    createdAt: new Date().toISOString()
  },
  {
    id: 4,
    partNumber: "BLT-DRV-003",
    name: "Main Drive Belt",
    category: "Belt",
    unit: "Pcs",
    stockLevel: 5,
    minThreshold: 8,
    pricePerUnit: 5600,
    compatibility: ["Generator", "Pump"],
    lastRestocked: new Date().toISOString(),
    createdAt: new Date().toISOString()
  },
  {
    id: 5,
    partNumber: "HW-BOLT-M12",
    name: "Steel Bolt M12 (Grade 8)",
    category: "Hardware",
    unit: "Pcs",
    stockLevel: 500,
    minThreshold: 100,
    pricePerUnit: 45,
    compatibility: ["All"],
    lastRestocked: new Date().toISOString(),
    createdAt: new Date().toISOString()
  }
];

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
