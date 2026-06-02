import { FilterX, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatServiceType } from "./formatters";
import type { ServiceHistoryFilters as Filters, ServiceHistoryRecord } from "./types";

type Props = {
  filters: Filters;
  clientRecords: ServiceHistoryRecord[];
  onFiltersChange: (filters: Filters) => void;
  onReset: () => void;
};

export function ServiceHistoryFilters({ filters, clientRecords, onFiltersChange, onReset }: Props) {
  const equipmentOptions = Array.from(
    new Map(clientRecords.map((record) => [record.equipmentId, record.equipmentName])).entries()
  );
  const serviceTypes = Array.from(new Set(clientRecords.map((record) => record.serviceType).filter(Boolean)));

  const update = (next: Partial<Filters>) => onFiltersChange({ ...filters, ...next });

  return (
    <div className="data-card p-4">
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))_minmax(0,0.9fr)_minmax(0,0.9fr)_auto] gap-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
          <Input
            placeholder="Search by equipment, technician, or work done"
            value={filters.search}
            onChange={(event) => update({ search: event.target.value })}
            className="pl-8 h-9 bg-white border-gray-200 text-gray-900 text-xs placeholder:text-gray-500/50"
          />
        </div>

        <Select value={filters.equipmentId} onValueChange={(value) => update({ equipmentId: value })}>
          <SelectTrigger className="w-full h-9 border-gray-200 bg-white text-gray-900 text-xs">
            <SelectValue placeholder="All Equipment" />
          </SelectTrigger>
          <SelectContent className="border-gray-200 bg-white text-gray-900">
            <SelectItem value="all">All Equipment</SelectItem>
            {equipmentOptions.map(([id, name]) => (
              <SelectItem key={id} value={id}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.serviceType} onValueChange={(value) => update({ serviceType: value })}>
          <SelectTrigger className="w-full h-9 border-gray-200 bg-white text-gray-900 text-xs">
            <SelectValue placeholder="All Service Types" />
          </SelectTrigger>
          <SelectContent className="border-gray-200 bg-white text-gray-900">
            <SelectItem value="all">All Service Types</SelectItem>
            {serviceTypes.map((serviceType) => (
              <SelectItem key={serviceType} value={serviceType}>
                {formatServiceType(serviceType)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.status} onValueChange={(value) => update({ status: value })}>
          <SelectTrigger className="w-full h-9 border-gray-200 bg-white text-gray-900 text-xs">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent className="border-gray-200 bg-white text-gray-900">
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        <Input
          type="date"
          value={filters.dateFrom}
          onChange={(event) => update({ dateFrom: event.target.value })}
          className="h-9 bg-white border-gray-200 text-gray-900 text-xs"
        />

        <Input
          type="date"
          value={filters.dateTo}
          onChange={(event) => update({ dateTo: event.target.value })}
          className="h-9 bg-white border-gray-200 text-gray-900 text-xs"
        />

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onReset}
          className="h-9 border-gray-200 bg-white text-gray-900 hover:bg-white"
        >
          <FilterX className="w-3.5 h-3.5" />
          Reset
        </Button>
      </div>
    </div>
  );
}
