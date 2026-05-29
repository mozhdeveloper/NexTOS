import { useState } from "react";
import { useInventoryStore } from "@/stores/useInventoryStore";
import { AddPartModal } from "@/components/AddPartModal";
import { 
  Box, 
  Search, 
  Plus, 
  AlertTriangle, 
  TrendingUp, 
  Filter,
  History,
  ArrowRight,
  Package,
  ArrowUpCircle,
  MoreVertical
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export default function Inventory() {
  const { items, restockItem, addItem } = useInventoryStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [showRestock, setShowRestock] = useState<number | null>(null);
  const [restockQty, setPartQty] = useState(1);
  const [showAddPart, setShowAddPart] = useState(false);

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.partNumber.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const lowStockCount = items.filter(i => i.stockLevel <= i.minThreshold).length;

  const handleRestock = () => {
    if (showRestock) {
      restockItem(showRestock, restockQty);
      setShowRestock(null);
      setPartQty(1);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[32px] font-bold text-gray-900 tracking-[-0.02em]">Inventory</h1>
          <p className="text-sm text-gray-500 mt-0.5">Warehouse Control & Spare Parts Logistics</p>
        </div>
        <div className="flex items-center gap-2">
           <Button variant="outline" className="bg-white text-gray-700 h-10 px-4 font-bold border-gray-200">
              <History className="w-4 h-4 mr-2" />
              Usage History
           </Button>
           <Button 
              onClick={() => setShowAddPart(true)}
              className="bg-[#66B2B2] text-white hover:bg-[#5A9E9E] h-10 px-4 font-bold shadow-lg shadow-[#66B2B2]/20">
              <Plus className="w-4 h-4 mr-2" />
              Add New Part
           </Button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
         <div className="data-card p-5 bg-white border border-gray-100 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#66B2B2]/10 flex items-center justify-center">
               <Box className="w-6 h-6 text-[#66B2B2]" />
            </div>
            <div>
               <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Total SKU Count</div>
               <div className="text-2xl font-black text-gray-900">{items.length} <span className="text-[10px] text-gray-400">Parts</span></div>
            </div>
         </div>
         <div className={`data-card p-5 border flex items-center gap-4 ${lowStockCount > 0 ? 'bg-red-50 border-red-100' : 'bg-white border-gray-100'}`}>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${lowStockCount > 0 ? 'bg-red-100' : 'bg-green-50'}`}>
               <AlertTriangle className={`w-6 h-6 ${lowStockCount > 0 ? 'text-red-600' : 'text-green-600'}`} />
            </div>
            <div>
               <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Low Stock Alerts</div>
               <div className={`text-2xl font-black ${lowStockCount > 0 ? 'text-red-600' : 'text-green-600'}`}>{lowStockCount} <span className="text-[10px] text-gray-400">Items</span></div>
            </div>
         </div>
         <div className="data-card p-5 bg-white border border-gray-100 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center">
               <TrendingUp className="w-6 h-6 text-amber-600" />
            </div>
            <div>
               <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Inventory Value</div>
               <div className="text-2xl font-black text-gray-900">₱{(items.reduce((sum, i) => sum + (i.stockLevel * i.pricePerUnit), 0) / 1000).toFixed(1)}k</div>
            </div>
         </div>
         <div className="data-card p-5 bg-white border border-gray-100 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center">
               <History className="w-6 h-6 text-blue-600" />
            </div>
            <div>
               <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Restocks (MTD)</div>
               <div className="text-2xl font-black text-gray-900">12 <span className="text-[10px] text-gray-400">Orders</span></div>
            </div>
         </div>
      </div>

      {/* Table & Controls */}
      <div className="data-card p-6 space-y-4">
         <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
               <Input 
                  placeholder="Search by part name or part number..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-11 bg-gray-50 border-transparent focus:bg-white focus:ring-[#66B2B2]/20"
               />
            </div>
            <div className="flex items-center gap-3">
               <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-40 h-11 bg-white border-gray-200 text-xs font-bold">
                     <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200">
                     <SelectItem value="all">All Categories</SelectItem>
                     <SelectItem value="FILTER">Filters</SelectItem>
                     <SelectItem value="OIL">Oils & Fluids</SelectItem>
                     <SelectItem value="BELT">Drive Belts</SelectItem>
                     <SelectItem value="HARDWARE">Hardware</SelectItem>
                  </SelectContent>
               </Select>
               <Button variant="outline" className="h-11 bg-white border-gray-200 font-bold px-4">
                  <Filter className="w-4 h-4 mr-2" />
                  More Filters
               </Button>
            </div>
         </div>

         <div className="overflow-x-auto">
            <table className="w-full text-sm">
               <thead>
                  <tr className="bg-gray-50/50 border-y border-gray-100">
                     <th className="text-left py-4 px-4 text-gray-400 font-black uppercase tracking-widest text-[10px]">Part Identification</th>
                     <th className="text-left py-4 px-4 text-gray-400 font-black uppercase tracking-widest text-[10px]">Category</th>
                     <th className="text-left py-4 px-4 text-gray-400 font-black uppercase tracking-widest text-[10px]">Stock Status</th>
                     <th className="text-right py-4 px-4 text-gray-400 font-black uppercase tracking-widest text-[10px]">Unit Price</th>
                     <th className="text-right py-4 px-4 text-gray-400 font-black uppercase tracking-widest text-[10px]">Actions</th>
                  </tr>
               </thead>
               <tbody>
                  {filteredItems.map(item => {
                     const isLow = item.stockLevel <= item.minThreshold;
                     return (
                        <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors group">
                           <td className="py-4 px-4">
                              <div className="flex items-center gap-3">
                                 <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isLow ? 'bg-red-50 text-red-600' : 'bg-[#66B2B2]/5 text-[#66B2B2]'}`}>
                                    <Package className="w-5 h-5" />
                                 </div>
                                 <div>
                                    <div className="font-bold text-gray-900">{item.name}</div>
                                    <div className="text-[10px] text-gray-400 font-mono-tech tracking-wider uppercase">{item.partNumber}</div>
                                 </div>
                              </div>
                           </td>
                           <td className="py-4 px-4">
                              <span className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 text-[10px] font-black uppercase tracking-tight">
                                 {item.category}
                              </span>
                           </td>
                           <td className="py-4 px-4">
                              <div className="space-y-1">
                                 <div className="flex items-center gap-2">
                                    <div className={`text-sm font-black ${isLow ? 'text-red-600' : 'text-gray-900'}`}>{item.stockLevel} {item.unit}</div>
                                    {isLow && <div className="animate-pulse w-2 h-2 rounded-full bg-red-500" />}
                                 </div>
                                 <div className="text-[9px] text-gray-400 font-bold uppercase">Min: {item.minThreshold} {item.unit}</div>
                              </div>
                           </td>
                           <td className="py-4 px-4 text-right">
                              <div className="font-mono-tech font-bold text-gray-900">₱{item.pricePerUnit.toLocaleString()}</div>
                              <div className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter">Per {item.unit}</div>
                           </td>
                           <td className="py-4 px-4">
                              <div className="flex items-center justify-end gap-2">
                                 <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => setShowRestock(item.id)}
                                    className="h-8 text-[10px] font-black uppercase tracking-tighter bg-white border-gray-200 text-[#66B2B2] hover:bg-[#66B2B2] hover:text-white"
                                 >
                                    <ArrowUpCircle className="w-3.5 h-3.5 mr-1" />
                                    Restock
                                 </Button>
                                 <button className="p-2 text-gray-300 hover:text-gray-900 transition-colors">
                                    <MoreVertical className="w-4 h-4" />
                                 </button>
                              </div>
                           </td>
                        </tr>
                     );
                  })}
               </tbody>
            </table>
         </div>
      </div>

      {/* Restock Modal */}
      <Dialog open={!!showRestock} onOpenChange={(open) => !open && setShowRestock(null)}>
         <DialogContent className="bg-white border-gray-200 sm:max-w-md rounded-2xl shadow-2xl">
            <DialogHeader className="border-b border-gray-50 pb-4">
               <DialogTitle className="text-gray-900 flex items-center gap-2">
                  <ArrowUpCircle className="w-5 h-5 text-[#66B2B2]" />
                  Log Inventory Restock
               </DialogTitle>
            </DialogHeader>
            
            {showRestock && (
               <div className="space-y-6 pt-4">
                  <div className="p-4 rounded-xl bg-[#66B2B2]/5 border border-[#66B2B2]/10">
                     <div className="text-[10px] text-[#66B2B2] font-black uppercase tracking-[0.2em] mb-1">Target Part</div>
                     <div className="text-sm font-bold text-gray-900">{items.find(i => i.id === showRestock)?.name}</div>
                     <div className="text-[11px] text-gray-500 font-mono-tech mt-0.5">{items.find(i => i.id === showRestock)?.partNumber}</div>
                  </div>

                  <div className="space-y-2">
                     <label className="text-[10px] text-gray-400 font-black uppercase tracking-widest ml-1">Restock Quantity</label>
                     <div className="flex items-center gap-4">
                        <Input 
                           type="number" 
                           min={1} 
                           value={restockQty} 
                           onChange={(e) => setPartQty(parseInt(e.target.value) || 1)}
                           className="h-12 text-2xl font-black font-mono-tech bg-white border-gray-200 text-center"
                        />
                        <div className="text-xs font-bold text-gray-400 uppercase">{items.find(i => i.id === showRestock)?.unit} Incoming</div>
                     </div>
                  </div>

                  <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between">
                     <div>
                        <div className="text-[9px] text-gray-400 font-black uppercase tracking-widest">New Stock Level</div>
                        <div className="text-lg font-black text-gray-900">
                           {(items.find(i => i.id === showRestock)?.stockLevel || 0) + restockQty} {items.find(i => i.id === showRestock)?.unit}
                        </div>
                     </div>
                     <ArrowRight className="w-5 h-5 text-gray-300" />
                     <div className="text-right">
                        <div className="text-[9px] text-gray-400 font-black uppercase tracking-widest">Projected Value</div>
                        <div className="text-lg font-black text-[#66B2B2]">
                           ₱{(((items.find(i => i.id === showRestock)?.stockLevel || 0) + restockQty) * (items.find(i => i.id === showRestock)?.pricePerUnit || 0)).toLocaleString()}
                        </div>
                     </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                     <Button variant="outline" onClick={() => setShowRestock(null)} className="rounded-xl h-12 font-bold border-gray-200">Cancel</Button>
                     <Button onClick={handleRestock} className="bg-[#66B2B2] text-white hover:bg-[#5A9E9E] font-bold rounded-xl h-12 shadow-lg shadow-[#66B2B2]/20">
                        Confirm Restock
                     </Button>
                  </div>
               </div>
            )}
         </DialogContent>
      </Dialog>

      {/* Add Part Modal */}
      <AddPartModal 
        open={showAddPart} 
        onOpenChange={setShowAddPart}
        onSubmitPart={addItem}
      />
    </div>
  );
}
