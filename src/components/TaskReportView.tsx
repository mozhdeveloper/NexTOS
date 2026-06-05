import { Printer, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TaskReport, Task, Client } from "@/types";

interface TaskReportViewProps {
  report: TaskReport & Record<string, any>;
  clients?: Client[];
  tasks?: Task[];
  resolveTypeLabel?: (task: { salesTaskType?: string; serviceType?: string }) => string;
}

// "June 5, 2026"
function formatDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" });
  } catch {
    return null;
  }
}

// "June 5, 2026 | 6:30 AM"
function formatDateWithPipe(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    const date = d.toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" });
    const time = d.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit", hour12: true });
    return `${date} | ${time}`;
  } catch {
    return null;
  }
}

export function TaskReportView({ report, clients, tasks, resolveTypeLabel }: TaskReportViewProps) {
  // Fall back to the live task for older reports that lack snapshots.
  const task = tasks?.find((t) => t.id === report.taskId);

  const taskTitle = report.taskTitle || task?.title || "—";
  const typeLabel =
    report.salesTaskTypeLabel ||
    (task && resolveTypeLabel ? resolveTypeLabel(task) : null) ||
    report.salesTaskType ||
    "—";
  const rawClientName =
    report.clientName ??
    (task?.clientId != null ? clients?.find((c) => c.id === task.clientId)?.companyName : null) ??
    "";
  const clientName = rawClientName && rawClientName !== "-" ? rawClientName : "—";
  const taskCreatedAt = report.taskCreatedAt || task?.createdAt;
  const dueDate = report.dueDate || task?.dueDate;
  const priority = report.priority || task?.priority || null;
  const taskOrigin: "manual" | "auto" = report.taskOrigin === "auto" ? "auto" : "manual";

  const createdDisplay = formatDate(taskCreatedAt);
  const dueDisplay = formatDate(dueDate);
  const completedDisplay = formatDateWithPipe(report.completedAt);

  const hasFiles = Array.isArray(report.files) && report.files.length > 0;

  const downloadFile = (file: { name: string; url: string }) => {
    const a = document.createElement("a");
    a.href = file.url;
    a.download = file.name;
    a.click();
  };

  return (
    <div className="p-2 animate-in fade-in zoom-in-95 duration-300">
      {/* ── Header ── */}
      <div className="flex items-start justify-between border-b border-gray-200 pb-6 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-900 text-white rounded-full text-[9px] font-black uppercase tracking-[0.15em] mb-3">
            <div className="w-1.5 h-1.5 rounded-full bg-[#66B2B2] animate-pulse" />
            {taskOrigin === "manual" ? "Manually Created" : "Auto-Generated"}
          </div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Task Report</h2>
          <p className="text-[11px] text-gray-400 font-bold tracking-wider mt-1 font-mono-tech">
            NexTOS Record <span className="text-gray-700 font-black">#{report.id}</span>
          </p>
        </div>
        <Button
          onClick={() => window.print()}
          className="bg-gray-100 hover:bg-gray-200 text-gray-900 h-9 px-4 border border-gray-200 text-[11px] font-bold rounded-xl transition-all no-print"
        >
          <Printer className="w-3.5 h-3.5 mr-2" />
          Export Copy
        </Button>
      </div>

      {/* ── Body ── */}
      <div className="space-y-6">
        {/* Task + Details (two-column info grid) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Task */}
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-1.5">
            <div className="text-[10px] text-[#66B2B2] font-black uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <div className="w-1 h-3 bg-[#66B2B2] rounded-full" />
              Task
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-400 font-semibold">Task Title</span>
              <span className="text-gray-800 font-bold text-right max-w-[60%]">{taskTitle}</span>
            </div>
            <div className="flex justify-between text-xs border-t border-gray-100 pt-1.5">
              <span className="text-gray-400 font-semibold">Task Type</span>
              <span className={`font-bold text-right max-w-[60%] ${typeLabel !== "—" ? "text-gray-800" : "text-gray-400"}`}>{typeLabel}</span>
            </div>
            <div className="flex justify-between text-xs border-t border-gray-100 pt-1.5">
              <span className="text-gray-400 font-semibold">Client</span>
              <span className={`font-bold text-right max-w-[60%] ${clientName !== "—" ? "text-gray-800" : "text-gray-400"}`}>{clientName}</span>
            </div>
            <div className="flex justify-between items-center text-xs border-t border-gray-100 pt-1.5">
              <span className="text-gray-400 font-semibold">Status</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide border bg-green-100 text-green-700 border-green-200">
                Completed
              </span>
            </div>
          </div>

          {/* Details */}
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-1.5">
            <div className="text-[10px] text-[#66B2B2] font-black uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <div className="w-1 h-3 bg-[#66B2B2] rounded-full" />
              Details
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-400 font-semibold">Sales Associate</span>
              <span className={`font-bold text-right max-w-[60%] ${report.completedBy ? "text-gray-800" : "text-gray-400"}`}>{report.completedBy || "—"}</span>
            </div>
            <div className="flex justify-between items-center text-xs border-t border-gray-100 pt-1.5">
              <span className="text-gray-400 font-semibold">Priority</span>
              {priority ? (
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                  priority === "high"
                    ? "bg-red-100 text-red-700"
                    : priority === "medium"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-gray-100 text-gray-500"
                }`}>{priority}</span>
              ) : (
                <span className="text-gray-400 font-bold">—</span>
              )}
            </div>
            <div className="flex justify-between text-xs border-t border-gray-100 pt-1.5">
              <span className="text-gray-400 font-semibold">Created At</span>
              <span className={`font-bold ${createdDisplay ? "text-gray-800" : "text-gray-400"}`}>{createdDisplay || "—"}</span>
            </div>
            <div className="flex justify-between text-xs border-t border-gray-100 pt-1.5">
              <span className="text-gray-400 font-semibold">Due Date</span>
              <span className={`font-bold ${dueDisplay ? "text-gray-800" : "text-gray-400"}`}>{dueDisplay || "—"}</span>
            </div>
            <div className="flex justify-between text-xs border-t border-gray-100 pt-1.5">
              <span className="text-gray-400 font-semibold">Completed</span>
              <span className={`font-bold ${completedDisplay ? "text-gray-800" : "text-gray-400"}`}>{completedDisplay || "—"}</span>
            </div>
          </div>
        </div>

        {/* What Happened */}
        <div className="rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
            <span className="text-[10px] text-gray-600 font-black uppercase tracking-widest flex items-center gap-1.5">
              <div className="w-1 h-3 bg-[#66B2B2] rounded-full" />
              What Happened
            </span>
          </div>
          <div className="p-4">
            {report.notes?.trim() ? (
              <p className="text-xs text-gray-800 leading-relaxed whitespace-pre-wrap">{report.notes}</p>
            ) : (
              <p className="text-xs text-gray-400">No summary provided.</p>
            )}
          </div>
        </div>

        {/* Attachments */}
        <div className="rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
            <span className="text-[10px] text-gray-600 font-black uppercase tracking-widest flex items-center gap-1.5">
              <div className="w-1 h-3 bg-[#66B2B2] rounded-full" />
              Attachments
            </span>
          </div>
          <div className="p-4">
            {hasFiles ? (
              <div className="flex flex-wrap gap-2">
                {report.files.map((file, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => downloadFile(file)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-[#66B2B2] font-medium hover:border-[#66B2B2]/40 hover:bg-[#66B2B2]/5 transition-colors text-left"
                  >
                    <Paperclip className="w-3 h-3" />
                    {file.name}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400">No attachments.</p>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 pt-6 border-t border-gray-100 text-center">
        <p className="text-[9px] text-gray-300 font-mono-tech uppercase tracking-[0.3em]">
          Security Verified System Record • NexTOS Operations
        </p>
      </div>
    </div>
  );
}
