import { Play, CheckCircle2, ClipboardList } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import type { ServiceRecord, Equipment, Client } from "@/types";
import type { DraftExecution } from "@/stores/useOperationsStore";
import { getPmsMetricValue } from "../service.utils";

function formatServiceInterval(interval: number, unit: string): string {
  const u = unit.toLowerCase();
  if (u === "hours") return `${interval}h`;
  if (u === "km") return `${interval} km`;
  const totalDays = Math.round(
    u === "weeks"
      ? interval * 7
      : u === "months"
        ? interval * 30.44
        : u === "years"
          ? interval * 365.25
          : 0
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
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in duration-300">
      {activeTasks.length > 0 ? (
        activeTasks.map(task => {
          const eq = equipment.find(e => e.id === task.equipmentId);
          const client = clients.find(c => c.id === task.clientId);
          const isDraft = !!draftExecutions[task.id];

          // Resolve display data from seed for PMS auto-tasks, store for manual/sim tasks
          let pmsMeta: any = {};
          try {
            pmsMeta = JSON.parse(task.description ?? "{}");
          } catch {}
          const isPmsTask = pmsMeta._src === "pms";
          const pmsSeedEq = isPmsTask
            ? (liveEquipment.find(s => s.id === pmsMeta._seedEqId) ?? null)
            : null;
          const pmsCfg =
            pmsSeedEq && pmsMeta._pmsIdx !== undefined
              ? Array.isArray(pmsSeedEq.pmsConfiguration)
                ? pmsSeedEq.pmsConfiguration[pmsMeta._pmsIdx]
                : null
              : null;
          const pmsSeedClient = pmsSeedEq
            ? (liveClients.find(c => c.id === pmsSeedEq.clientId) ?? null)
            : null;

          const displayName = isPmsTask
            ? (pmsSeedEq?.name ?? eq?.name ?? eq?.id ?? "Unknown Equipment")
            : (eq?.name ?? eq?.id ?? "No unit selected");
          const displaySub = isPmsTask ? null : eq ? eq.equipmentType : null;
          const displayClient = isPmsTask
            ? (pmsSeedClient?.companyName ??
              client?.companyName ??
              "Unknown Client")
            : (client?.companyName ?? "Unknown Client");
          const metricUnit = pmsCfg?.serviceIntervalUnit ?? "Hours";
          const metricValue = isPmsTask
            ? getPmsMetricValue(
                pmsSeedEq,
                metricUnit,
                gps001CacheMs,
                gps001HoursOffsetMs
              )
            : (eq?.hoursTotal ?? "—");
          const serviceIntervalDisplay =
            isPmsTask && pmsCfg
              ? formatServiceInterval(
                  pmsCfg.serviceInterval,
                  pmsCfg.serviceIntervalUnit
                )
              : null;

          return (
            <div
              key={task.id}
              className="data-card p-4 flex flex-col justify-between hover:border-[#66B2B2]/40 transition-all cursor-pointer group"
              onClick={() =>
                draftExecutions[task.id]?.travelStartTime
                  ? onContinueTask(task)
                  : draftExecutions[task.id]?.travelStartTime
                    ? onContinueTask(task)
                    : onStartTask(task)
              }
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  {task.status === "scheduled" && !isDraft ? (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-gray-100 text-gray-500">
                      Not Started
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-amber-100 text-amber-700">
                      Repairing / Pending
                    </span>
                  )}
                  <span className="text-[10px] text-gray-500 font-mono-tech">
                    ID: {task.id}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-gray-900 group-hover:text-[#66B2B2] transition-colors">
                  {displayName}
                </h4>
                {displaySub && (
                  <p className="text-[10px] text-gray-500 mb-2">{displaySub}</p>
                )}

                <div className="space-y-1 mt-3">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-gray-500">Service:</span>
                    <span className="text-gray-900 font-bold">
                      {task.serviceCategory}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-gray-500">Client:</span>
                    <span className="text-gray-900">{displayClient}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-gray-500">Metric at Service:</span>
                    <span className="text-gray-900 font-mono-tech">
                      {metricValue}
                    </span>
                  </div>
                  {serviceIntervalDisplay && (
                    <div className="flex justify-between text-[11px]">
                      <span className="text-gray-500">Service Interval:</span>
                      <span className="text-gray-900 font-mono-tech font-bold">
                        {serviceIntervalDisplay}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <Button className="w-full mt-4 h-9 bg-gray-900 hover:bg-[#66B2B2] text-white text-xs font-bold transition-all">
                {task.status === "scheduled" && !isDraft ? (
                  <>
                    <Play className="w-3 h-3 mr-2" /> Start Service
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3 h-3 mr-2" /> Continue Execution
                  </>
                )}
              </Button>
            </div>
          );
        })
      ) : (
        <div className="col-span-full py-20 text-center data-card bg-gray-50/50">
          <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-gray-900 font-bold">No Active Tasks</h3>
          <p className="text-xs text-gray-500 mt-1">
            New tasks will appear here automatically when equipment reaches
            service thresholds.
          </p>
        </div>
      )}
    </div>
  );
}

