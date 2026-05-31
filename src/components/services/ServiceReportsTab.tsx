import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Equipment, Client } from "@/types";

interface ServiceReportsTabProps {
  seedServiceRecordsData: { records: any[] } | undefined;
  equipment: Equipment[];
  clients: Client[];
  liveEquipment: any[];
  liveClients: any[];
  onShowReport: (record: any) => void;
}

export function ServiceReportsTab({
  seedServiceRecordsData,
  equipment,
  clients,
  liveEquipment,
  liveClients,
  onShowReport,
}: ServiceReportsTabProps) {
  // Seed-data.json is the single source of truth for completed records.
  // All rich fields (metricAtService, equipmentStatusAtService, addresses, timestamps)
  // only exist on persisted records. Failed submissions are queued in Zustand and
  // retried automatically via the pendingSubmissions effect above — they never
  // appear here as sparse phantom rows.
  const allCompleted = (seedServiceRecordsData?.records ?? []).filter((r) => r.status === "completed");

  return (
    <div className="space-y-3 animate-in fade-in duration-300">
      <div className="data-card overflow-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left py-2.5 px-3 text-gray-600 font-bold uppercase tracking-wider whitespace-nowrap">Equipment</th>
              <th className="text-left py-2.5 px-3 text-gray-600 font-bold uppercase tracking-wider whitespace-nowrap">Client</th>
              <th className="text-left py-2.5 px-3 text-gray-600 font-bold uppercase tracking-wider whitespace-nowrap">Serial Number</th>
              <th className="text-left py-2.5 px-3 text-gray-600 font-bold uppercase tracking-wider whitespace-nowrap">Equipment Type</th>
              <th className="text-left py-2.5 px-3 text-gray-600 font-bold uppercase tracking-wider whitespace-nowrap">Service Type</th>
              <th className="text-left py-2.5 px-3 text-gray-600 font-bold uppercase tracking-wider whitespace-nowrap">Cost</th>
              <th className="text-left py-2.5 px-3 text-gray-600 font-bold uppercase tracking-wider whitespace-nowrap">Technician</th>
              <th className="text-left py-2.5 px-3 text-gray-600 font-bold uppercase tracking-wider whitespace-nowrap">Completed Date</th>
              <th className="text-left py-2.5 px-3 text-gray-600 font-bold uppercase tracking-wider whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody>
            {allCompleted.map((record) => {
              // Resolve display values: rich fields on seed records first, then seed JSON lookups,
              // then store lookups as a last resort.
              const r = record as any;
              const storeEq = equipment.find(e => e.id === record.equipmentId);

              // Parse PMS meta from the task description — store-completed records don't
              // carry seedEquipmentId directly, but it's always in the description JSON.
              const descMeta = (() => { try { return JSON.parse(r.description ?? "{}"); } catch { return {}; } })();

              // Priority: explicit seedEquipmentId field → _seedEqId in description → serial match
              const seedEqRow: any = r.seedEquipmentId
                ? liveEquipment.find(s => s.id === r.seedEquipmentId)
                : descMeta._seedEqId
                  ? liveEquipment.find(s => s.id === descMeta._seedEqId)
                  : storeEq
                    ? liveEquipment.find(s => s.serialNumber === storeEq.serialNumber)
                    : null;

              // PMS config for interval / service type fallback
              const seedPmsCfg: any = seedEqRow && descMeta._pmsIdx !== undefined
                ? (Array.isArray(seedEqRow.pmsConfiguration) ? seedEqRow.pmsConfiguration[descMeta._pmsIdx] : null) ?? null
                : null;

              const storeClient = clients.find(c => c.id === record.clientId);
              const seedClientRow: any = seedEqRow?.clientId
                ? liveClients.find(c => c.id === seedEqRow.clientId)
                : null;

              const rowEqName = r.equipmentName || seedEqRow?.name || storeEq?.name || storeEq?.id || "—";
              const rowClientName = r.clientName || seedClientRow?.companyName || storeClient?.companyName || "—";
              const rowSerial = r.serialNumber || seedEqRow?.serialNumber || storeEq?.serialNumber || "—";
              const rowEqType = r.equipmentType || seedEqRow?.equipmentType || "—";
              const rowSvcType = r.serviceType || seedPmsCfg?.serviceType || record.serviceCategory || "—";
              const recordCost = r.finalCost ?? record.cost ?? 0;
              const rowCost = recordCost > 0
                ? `₱${Number(recordCost).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : "—";

              return (
                <tr key={record.id} className="grid-table-row border-b border-gray-100 hover:bg-gray-50 transition-all">
                  <td className="py-3 px-3 font-bold text-gray-900 whitespace-nowrap">{rowEqName}</td>
                  <td className="py-3 px-3 text-gray-700 whitespace-nowrap">{rowClientName}</td>
                  <td className="py-3 px-3 text-gray-500 font-mono-tech whitespace-nowrap">{rowSerial}</td>
                  <td className="py-3 px-3 text-gray-600 whitespace-nowrap">{rowEqType}</td>
                  <td className="py-3 px-3 text-gray-700 whitespace-nowrap">{rowSvcType}</td>
                  <td className="py-3 px-3 text-gray-700 font-mono-tech whitespace-nowrap">{rowCost}</td>
                  <td className="py-3 px-3 text-gray-700 whitespace-nowrap">{record.technician}</td>
                  <td className="py-3 px-3 text-gray-500 font-mono-tech whitespace-nowrap">
                    {record.completedDate ? new Date(record.completedDate).toLocaleDateString() : "—"}
                  </td>
                  <td className="py-3 px-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onShowReport({
                        ...record,
                        equipmentName: rowEqName,
                        clientName: rowClientName,
                        serialNumber: rowSerial,
                        equipmentType: rowEqType,
                        serviceType: rowSvcType,
                        invoiceId: (record as any).invoiceId ?? null,
                        createdAt: (record as any).createdAt ?? new Date().toISOString(),
                      } as any)}
                      className="h-7 text-[10px] border-gray-200 hover:bg-[#66B2B2] hover:text-white transition-all whitespace-nowrap"
                    >
                      <FileText className="w-3 h-3 mr-1" />
                      View Report
                    </Button>
                  </td>
                </tr>
              );
            })}
            {allCompleted.length === 0 && (
              <tr>
                <td colSpan={11} className="py-12 text-center text-gray-400 text-xs font-bold uppercase tracking-widest">
                  No completed service records found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
