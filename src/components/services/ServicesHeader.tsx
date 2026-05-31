import { ClipboardList, Package, CalendarClock, FileText, PenTool } from "lucide-react";
import type { TabType } from "./types";

interface ServicesHeaderProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  taskCount: number;
  resetOnCompletion: boolean;
  onToggleReset: () => void;
}

export function ServicesHeader({
  activeTab,
  onTabChange,
  taskCount,
  resetOnCompletion,
  onToggleReset,
}: ServicesHeaderProps) {
  return (
    <>
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[32px] font-bold text-black tracking-[-0.02em]">Services</h1>
          <p className="text-sm text-gray-600 mt-0.5">Automated PMS, Task Management & Documentation</p>
        </div>
        <button
          onClick={onToggleReset}
          className="flex items-center gap-2.5 px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-all group"
          title={resetOnCompletion ? "Reset Hours on Completion: ON" : "Reset Hours on Completion: OFF"}
        >
          <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 ${
            resetOnCompletion ? "bg-[#66B2B2]" : "bg-gray-300"
          }`}>
            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200 ${
              resetOnCompletion ? "translate-x-4" : "translate-x-0.5"
            }`} />
          </div>
          <span className="text-[11px] font-bold text-gray-700 whitespace-nowrap">
            Reset Hours on Completion
          </span>
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-200">
        {[
          { id: "tasks" as TabType, label: "My Tasks", icon: ClipboardList, count: taskCount },
          { id: "equipment" as TabType, label: "Equipment", icon: Package },
          { id: "scheduled-maintenance" as TabType, label: "Scheduled Maintenance", icon: CalendarClock },
          { id: "reports" as TabType, label: "Service Reports", icon: FileText },
          { id: "new" as TabType, label: "Manual Log", icon: PenTool },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-all border-b-2 ${
              activeTab === tab.id
                ? "border-[#66B2B2] text-[#66B2B2] bg-[#66B2B2]/5"
                : "border-transparent text-gray-600 hover:text-black"
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-[#EF4444] text-white text-[9px] font-bold">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>
    </>
  );
}
