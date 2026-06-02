import { useMemo, useState } from "react";
import seedData from "@/data/seed-data.json";
import { ServiceHistoryFilters } from "../components/ServiceHistoryFilters";
import { ServiceHistoryStats } from "../components/ServiceHistoryStats";
import { ServiceHistoryTable } from "../components/ServiceHistoryTable";
import { ServiceRecordDetailsModal } from "../components/ServiceRecordDetailsModal";
import {
  filterServiceHistoryRecords,
  mapServiceRecordsToClientAccounts,
  summarizeServiceHistory,
} from "../components/serviceHistoryData";
import type {
  ServiceHistoryFilters as Filters,
  ServiceHistoryRecord,
} from "../types";
import { clientStore } from "../../client.store";

const defaultFilters: Filters = {
  search: "",
  equipmentId: "all",
  serviceType: "all",
  status: "all",
  dateFrom: "",
  dateTo: "",
};

export default function ClientServiceHistory() {
  const { selectedCompanyId } = clientStore();
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [selectedRecord, setSelectedRecord] =
    useState<ServiceHistoryRecord | null>(null);

  const allRecords = useMemo(
    () => mapServiceRecordsToClientAccounts(seedData),
    []
  );

  const clientRecords = useMemo(
    () => allRecords.filter(record => record.clientId === selectedCompanyId),
    [allRecords, selectedCompanyId]
  );

  const filteredRecords = useMemo(
    () => filterServiceHistoryRecords(clientRecords, filters),
    [clientRecords, filters]
  );

  const summary = useMemo(
    () => summarizeServiceHistory(clientRecords),
    [clientRecords]
  );

  return (
    <div className="space-y-4 px-8 pt-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[32px] font-bold text-gray-900 tracking-[-0.02em]">
            Service History
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {new Set(clientRecords.map(record => record.equipmentId)).size}{" "}
            equipment units · {filteredRecords.length} matching service records
          </p>
        </div>
      </div>

      <ServiceHistoryFilters
        filters={filters}
        clientRecords={clientRecords}
        onFiltersChange={setFilters}
        onReset={() => setFilters(defaultFilters)}
      />

      <ServiceHistoryStats summary={summary} />

      <ServiceHistoryTable
        records={filteredRecords}
        onViewRecord={setSelectedRecord}
      />

      <ServiceRecordDetailsModal
        record={selectedRecord}
        open={selectedRecord !== null}
        onOpenChange={open => {
          if (!open) setSelectedRecord(null);
        }}
      />
    </div>
  );
}
