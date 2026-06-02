import { Play, CheckCircle2, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ServiceRecord, Equipment, Client } from "@/types";
import type { DraftExecution } from "@/stores/useOperationsStore";
import { getPmsMetricValue } from "./utils";

function formatServiceInterval(interval: number, unit: string): string {
  const u = unit.toLowerCase();
  if (u === "hours") return `${interval}h`;
  if (u === "km") return `${interval} km`;
  const totalDays = Math.round(
    u === "weeks" ? interval * 7 :
    u === "months" ? interval * 30.44 :
    u === "years" ? interval * 365.25 : 0
  );
  const abbr = u === "weeks" ? "w" : u === "months" ? "mo" : "yr";
  return `${interval}${abbr} (${totalDays}d)`;
}

interface TasksTabProps {
  activeTasks: ServiceRecord[];
  equipment: Equipment[];
  clients: Client[];
  draftExecutions: Record<number, DraftExecution>;
  liveEquipment: any[];
  liveClients: any[];
  gps001CacheMs: number;
  gps001HoursOffsetMs: number;
  onStartTask: (task: ServiceRecord) => void;
  onContinueTask: (task: ServiceRecord) => void;
}

export function TasksTab({
  activeTasks,
  equipment,
  clients,
  draftExecutions,
  liveEquipment,
  liveClients,
  gps001CacheMs,
  gps001HoursOffsetMs,
  onStartTask,
  onContinueTask,
}: TasksTabProps) {
  if (activeTasks.length === 0) {
    return (
      <div className="data-card py-20 text-center bg-gray-50/50 animate-in fade-in duration-300">
        <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <h3 className="text-gray-900 font-bold">No Active Tasks</h3>
        <p className="text-xs text-gray-500 mt-1">New tasks will appear here automatically when equipment reaches service thresholds.</p>
      </div>
    );
  }

  return (
    <div className="data-card animate-in fade-in duration-300 overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100">
            {["Status", "ID", "Equipment", "Client", "Service", "Metric at Service", "Service Interval", "Action"].map((col) => (
              <th key={col} className="px-3 py-2.5 text-left text-[9px] font-bold uppercase tracking-wider text-gray-400 whitespace-nowrap">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {activeTasks.map(task => {
            const eq = equipment.find(e => e.id === task.equipmentId);
            const client = clients.find(c => c.id === task.clientId);
            const isDraft = !!draftExecutions[task.id];

            let pmsMeta: any = {};
            try { pmsMeta = JSON.parse(task.description ?? "{}"); } catch {}
            const isPmsTask = pmsMeta._src === "pms";
            const pmsSeedEq = isPmsTask
              ? liveEquipment.find((s) => s.id === pmsMeta._seedEqId) ?? null
              : null;
            const pmsCfg = pmsSeedEq && pmsMeta._pmsIdx !== undefined
              ? (Array.isArray(pmsSeedEq.pmsConfiguration) ? pmsSeedEq.pmsConfiguration[pmsMeta._pmsIdx] : null)
              : null;
            const pmsSeedClient = pmsSeedEq
              ? liveClients.find((c) => c.id === pmsSeedEq.clientId) ?? null
              : null;

            const displayName = isPmsTask
              ? (pmsSeedEq?.name ?? eq?.name ?? eq?.id ?? "Unknown Equipment")
              : (eq?.name ?? eq?.id ?? "No unit selected");
            const displaySub = isPmsTask ? null : (eq ? eq.equipmentType : null);
            const displayClient = isPmsTask
              ? (pmsSeedClient?.companyName ?? client?.companyName ?? "Unknown Client")
              : (client?.companyName ?? "Unknown Client");
            const metricUnit = pmsCfg?.serviceIntervalUnit ?? "Hours";
            const metricValue = isPmsTask
              ? getPmsMetricValue(pmsSeedEq, metricUnit, gps001CacheMs, gps001HoursOffsetMs)
              : (eq?.hoursTotal ?? "—");
            const serviceIntervalDisplay = (isPmsTask && pmsCfg)
              ? formatServiceInterval(pmsCfg.serviceInterval, pmsCfg.serviceIntervalUnit)
              : null;

            const hasTravelStart = !!draftExecutions[task.id]?.travelStartTime;
            const handleRowClick = () => hasTravelStart ? onContinueTask(task) : onStartTask(task);

            return (
              <tr
                key={task.id}
                className="hover:bg-gray-50/60 transition-colors cursor-pointer border-b border-gray-50 last:border-0"
                onClick={handleRowClick}
              >
                <td className="px-3 py-3 whitespace-nowrap">
                  {task.status === "scheduled" && !isDraft ? (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-gray-100 text-gray-500">Not Started</span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-amber-100 text-amber-700">Repairing / Pending</span>
                  )}
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <span className="font-mono-tech text-[10px] text-gray-500">#{task.id}</span>
                </td>
                <td className="px-3 py-3">
                  <div className="text-xs font-bold text-gray-900">{displayName}</div>
                  {displaySub && <div className="text-[10px] text-gray-400">{displaySub}</div>}
                </td>
                <td className="px-3 py-3 text-xs text-gray-700 whitespace-nowrap">{displayClient}</td>
                <td className="px-3 py-3 text-xs text-gray-700 whitespace-nowrap">{task.serviceCategory}</td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <span className="font-mono-tech text-xs text-gray-700">{metricValue}</span>
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <span className="font-mono-tech text-xs text-gray-700">{serviceIntervalDisplay ?? "—"}</span>
                </td>
                <td className="px-3 py-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                  <Button
                    className="h-8 px-3 text-xs bg-gray-900 hover:bg-[#66B2B2] text-white font-bold transition-all"
                    onClick={handleRowClick}
                  >
                    {task.status === "scheduled" && !isDraft ? (
                      <><Play className="w-3 h-3 mr-1.5" /> Start Service</>
                    ) : (
                      <><CheckCircle2 className="w-3 h-3 mr-1.5" /> Continue Execution</>
                    )}
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
