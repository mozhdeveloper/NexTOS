import { Camera, CheckCircle2, FileText, History, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  formatDate,
  formatMoneyPeso,
  formatServiceType,
  formatStatusLabel,
  getInitials,
  getServiceDate,
} from "./formatters";
import type { ServiceHistoryRecord } from "./types";

const serviceTypeColors: Record<string, string> = {
  pms: "bg-[#66B2B2]/15 text-[#0F766E]",
  repair: "bg-[#EF4444]/20 text-[#EF4444]",
  inspection: "bg-[#EDE9FE] text-[#7C3AED]",
  installation: "bg-[#66B2B2]/15 text-[#0F766E]",
  calibration: "bg-[#10B981]/20 text-[#10B981]",
};

const statusColors: Record<string, string> = {
  completed: "bg-[#C7F0DF] text-[#059669]",
  in_progress: "bg-[#66B2B2]/15 text-[#0F766E]",
  pending: "bg-[#6B7280]/20 text-gray-500",
  cancelled: "bg-[#EF4444]/20 text-[#EF4444]",
  scheduled: "bg-[#66B2B2]/15 text-[#0F766E]",
};

type Props = {
  records: ServiceHistoryRecord[];
  onViewRecord: (record: ServiceHistoryRecord) => void;
};

export function ServiceHistoryTable({ records, onViewRecord }: Props) {
  return (
    <div className="data-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left py-2.5 px-3 text-[10px] text-gray-500 font-bold uppercase tracking-wider">Equipment</th>
              <th className="text-left py-2.5 px-3 text-[10px] text-gray-500 font-bold uppercase tracking-wider">Service Type</th>
              <th className="text-left py-2.5 px-3 text-[10px] text-gray-500 font-bold uppercase tracking-wider">Date</th>
              <th className="text-left py-2.5 px-3 text-[10px] text-gray-500 font-bold uppercase tracking-wider">Technician</th>
              <th className="text-left py-2.5 px-3 text-[10px] text-gray-500 font-bold uppercase tracking-wider">Metric</th>
              <th className="text-left py-2.5 px-3 text-[10px] text-gray-500 font-bold uppercase tracking-wider">Status</th>
              <th className="text-left py-2.5 px-3 text-[10px] text-gray-500 font-bold uppercase tracking-wider">Amount</th>
              <th className="text-left py-2.5 px-3 text-[10px] text-gray-500 font-bold uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 && (
              <tr>
                <td colSpan={8} className="py-10 px-3">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <History className="w-8 h-8 text-gray-500" />
                    <p className="text-sm text-gray-500">No service records match the current filters</p>
                  </div>
                </td>
              </tr>
            )}

            {records.map((record) => {
              const serviceTypeKey = record.serviceType.toLowerCase().includes("pms")
                ? "pms"
                : record.serviceType.toLowerCase();
              const statusKey = record.status.toLowerCase();
              const mediaCount = Number(Boolean(record.beforePhoto)) + Number(Boolean(record.afterPhoto));

              return (
                <tr key={record.id} className="border-b border-gray-100 hover:bg-[#66B2B2]/5">
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-md bg-white border border-gray-200 flex items-center justify-center shrink-0">
                        <Wrench className="w-4 h-4 text-[#66B2B2]" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-gray-900 leading-tight">{record.equipmentName}</div>
                        <div className="text-xs text-gray-400">SN: {record.serialNumber}</div>
                      </div>
                    </div>
                  </td>

                  <td className="py-2.5 px-3">
                    <div className="text-xs text-gray-900 font-semibold">{formatServiceType(record.serviceType)}</div>
                    <div className={`inline-flex mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${serviceTypeColors[serviceTypeKey] ?? "bg-[#6B7280]/20 text-gray-500"}`}>
                      {serviceTypeKey ? serviceTypeKey.toUpperCase() : "UNKNOWN"}
                    </div>
                  </td>

                  <td className="py-2.5 px-3">
                    <div className="text-xs text-gray-900 font-semibold">{formatDate(getServiceDate(record))}</div>
                    <div className="text-gray-400 mt-0.5">
                      {new Date(getServiceDate(record)).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </td>

                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#66B2B2] text-white flex items-center justify-center text-[10px] font-semibold">
                        {getInitials(record.technician)}
                      </div>
                      <span className="text-gray-900">{record.technician}</span>
                    </div>
                  </td>

                  <td className="py-2.5 px-3">
                    <div className="text-[#0F766E] font-semibold font-mono-tech">{record.metricAtService ?? "-"}</div>
                    <div className="text-gray-400 mt-0.5">
                      {record.serviceInterval && record.serviceIntervalUnit ? `${record.serviceInterval} ${record.serviceIntervalUnit}` : "-"}
                    </div>
                  </td>

                  <td className="py-2.5 px-3">
                    <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-medium capitalize ${statusColors[statusKey] ?? "bg-[#6B7280]/20 text-gray-500"}`}>
                      {formatStatusLabel(record.status)}
                    </span>
                    {record.equipmentStatusAtService && (
                      <div className="mt-1 flex items-center gap-1 text-[11px] text-gray-400">
                        <CheckCircle2 className="w-3 h-3" />
                        {record.equipmentStatusAtService}
                      </div>
                    )}
                  </td>

                  <td className="py-2.5 px-3 text-gray-900 font-semibold font-mono-tech">{formatMoneyPeso(record.cost)}</td>

                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => onViewRecord(record)}
                        className="h-8 border-[#66B2B2] bg-white text-gray-900 hover:bg-[#66B2B2]/10 text-xs"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        View
                      </Button>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="outline"
                        disabled={mediaCount === 0}
                        onClick={() => onViewRecord(record)}
                        className="h-8 w-8 border-gray-200 bg-gray-50 text-gray-500 hover:text-gray-900 disabled:opacity-40"
                      >
                        <Camera className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
