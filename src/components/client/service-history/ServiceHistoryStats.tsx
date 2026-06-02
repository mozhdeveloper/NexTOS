import { AlertCircle, CheckCircle2, Clock3, Wallet, Wrench } from "lucide-react";
import { formatMoneyPeso } from "./formatters";
import type { ServiceHistorySummary } from "./types";

type Props = {
  summary: ServiceHistorySummary;
};

export function ServiceHistoryStats({ summary }: Props) {
  const completionPercent = summary.totalServices > 0
    ? Math.round((summary.completedServices / summary.totalServices) * 100)
    : 0;
  const inProgressPercent = summary.totalServices > 0
    ? Math.round((summary.inProgressServices / summary.totalServices) * 100)
    : 0;
  const cancelledPercent = summary.totalServices > 0
    ? Math.round((summary.cancelledServices / summary.totalServices) * 100)
    : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
      <StatCard label="Total Services" value={summary.totalServices.toString()} sublabel="All time" icon={<Wrench className="w-4 h-4 text-[#2563EB]" />} />
      <StatCard label="Completed" value={summary.completedServices.toString()} sublabel={`${completionPercent}%`} icon={<CheckCircle2 className="w-4 h-4 text-[#059669]" />} />
      <StatCard label="In Progress" value={summary.inProgressServices.toString()} sublabel={`${inProgressPercent}%`} icon={<Clock3 className="w-4 h-4 text-[#66B2B2]" />} />
      <StatCard label="Cancelled" value={summary.cancelledServices.toString()} sublabel={`${cancelledPercent}%`} icon={<AlertCircle className="w-4 h-4 text-[#DC2626]" />} />
      <StatCard label="Total Spent" value={formatMoneyPeso(summary.totalSpent)} sublabel="All time" icon={<Wallet className="w-4 h-4 text-[#7C3AED]" />} />
    </div>
  );
}

function StatCard({ label, value, sublabel, icon }: { label: string; value: string; sublabel: string; icon: React.ReactNode }) {
  return (
    <div className="data-card p-3">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[11px] text-gray-500">{label}</div>
          <div className="text-2xl font-bold text-gray-900 mt-1 font-mono-tech tracking-tight">{value}</div>
          <div className="text-[11px] text-gray-500 mt-1">{sublabel}</div>
        </div>
        <div className="w-8 h-8 rounded-md bg-[#66B2B2]/10 border border-[#66B2B2]/20 flex items-center justify-center">
          {icon}
        </div>
      </div>
    </div>
  );
}
