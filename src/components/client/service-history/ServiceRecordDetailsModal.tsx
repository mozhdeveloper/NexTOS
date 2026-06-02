import {
  Camera,
  ClipboardList,
  MapPin,
  PenLine,
  Timer,
  Wrench,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  formatDateTime,
  formatMoneyPeso,
  formatServiceType,
  formatStatusLabel,
  getServiceDate,
  splitDetailText,
} from "./formatters";
import type { ServiceHistoryRecord } from "./types";

const changeStatusColor = (status: string) => {
  switch (status) {
    case "completed":
      return "text-green-400";
    case "pending":
      return "text-yellow-400";
    case "cancelled":
      return "text-red-400";
    default:
      return "text-gray-400";
  }
};

type Props = {
  record: ServiceHistoryRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ServiceRecordDetailsModal({
  record,
  open,
  onOpenChange,
}: Props) {
  if (!record) return null;

  const workItems = splitDetailText(record.workDone);
  const partTotal = record.partsUsedDetails.reduce(
    (sum, part) => sum + part.quantity * part.pricePerUnit,
    0
  );
  const description = getReadableDescription(record.description);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto bg-white p-5 sm:max-w-5xl">
        <DialogHeader className="border-b border-gray-200 pb-4">
          <div className="inline-flex w-fit items-center gap-2 rounded-full bg-gray-900 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white">
            <span className="h-1.5 w-1.5 rounded-full bg-[#66B2B2]" />
            Service Report
          </div>
          <DialogTitle className="flex items-center gap-2 text-2xl font-bold tracking-tight text-gray-950">
            <Wrench className="w-5 h-5 text-[#66B2B2]" />
            {record.equipmentName}
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500">
            {formatServiceType(record.serviceType)} for {record.clientName} -{" "}
            {formatDateTime(getServiceDate(record))}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <section className="space-y-4 rounded-lg border border-gray-200 bg-gray-50/50 p-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <DetailTile
                label="Status"
                value={formatStatusLabel(record.status).toLocaleUpperCase()}
              />
              <DetailTile label="Amount" value={formatMoneyPeso(record.cost)} />
              <DetailTile
                label="Metric"
                value={record.metricAtService ?? "-"}
              />
            </div>

            <div className="grid grid-cols-1 gap-x-6 gap-y-2 text-xs md:grid-cols-2">
              <RowDetail label="Equipment Type" value={record.equipmentType} />
              <RowDetail label="Serial Number" value={record.serialNumber} />
              <RowDetail
                label="Service Category"
                value={record.serviceCategory}
              />
              <RowDetail label="Technician" value={record.technician} />
              <RowDetail
                label="Scheduled"
                value={formatDateTime(record.scheduledDate)}
              />
              <RowDetail
                label="Completed"
                value={formatDateTime(record.completedDate)}
              />
              <RowDetail
                label="Interval"
                value={
                  record.serviceInterval && record.serviceIntervalUnit
                    ? `${record.serviceInterval} ${record.serviceIntervalUnit}`
                    : "-"
                }
              />
              <RowDetail
                label="Equipment State"
                value={record.equipmentStatusAtService ?? "-"}
              />
            </div>
          </section>

          <section className="space-y-3 rounded-lg border border-gray-200 bg-gray-50/50 p-4">
            <SectionTitle
              icon={<Timer className="w-4 h-4 text-[#66B2B2]" />}
              title="Service Timeline"
            />
            <RowDetail
              label="Travel Started"
              value={formatDateTime(record.travelStartTime)}
            />
            <RowDetail
              label="Arrived"
              value={formatDateTime(record.arrivalTime)}
            />
            <RowDetail
              label="Work Started"
              value={formatDateTime(record.startTime)}
            />
            <RowDetail
              label="Completed"
              value={formatDateTime(record.completionTime ?? record.endTime)}
            />
            <RowDetail label="Duration" value={record.duration ?? "-"} />
          </section>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <section className="rounded-lg border border-gray-200 bg-white p-4">
            <SectionTitle
              icon={<ClipboardList className="w-4 h-4 text-[#66B2B2]" />}
              title="Work Performed"
            />
            {workItems.length > 0 ? (
              <div className="mt-3 space-y-2 text-xs text-gray-900">
                {workItems.map(item => (
                  <div key={item} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#10B981]" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-xs text-gray-500">
                No work log was attached.
              </p>
            )}
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-4">
            <SectionTitle title="Findings" />
            <p className="mt-3 text-xs leading-relaxed text-gray-900">
              {record.findings || "No findings recorded."}
            </p>
            {description && (
              <p className="mt-3 text-xs leading-relaxed text-gray-500">
                {description}
              </p>
            )}
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-4">
            <SectionTitle title="Recommendation" />
            <p className="mt-3 text-xs leading-relaxed text-gray-900">
              {record.recommendation || "No recommendation recorded."}
            </p>
          </section>
        </div>

        <section className="rounded-lg border border-gray-200 bg-white p-4">
          <SectionTitle title="Parts Used" />
          {record.partsUsedDetails.length > 0 ? (
            <div className="mt-3 space-y-2">
              {record.partsUsedDetails.map(part => (
                <div
                  key={`${part.name}-${part.quantity}-${part.pricePerUnit}`}
                  className="flex items-center justify-between gap-3 text-xs"
                >
                  <span className="font-medium text-gray-900">{part.name}</span>
                  <span className="text-gray-500">
                    {part.quantity} x {formatMoneyPeso(part.pricePerUnit)}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between border-t border-gray-100 pt-2 text-xs font-semibold">
                <span>Total Parts</span>
                <span className="font-mono-tech">
                  {formatMoneyPeso(partTotal)}
                </span>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-xs text-gray-500">
              {record.partsUsed || "No parts recorded."}
            </p>
          )}
        </section>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <PhotoPanel
            title="Before Service"
            photo={record.beforePhoto}
            notes={record.beforeNotes}
          />
          <PhotoPanel
            title="After Service"
            photo={record.afterPhoto}
            notes={record.afterNotes}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <SignaturePanel
            title="Technician Signature"
            signature={record.techSignature}
          />
          <SignaturePanel
            title="Client Signature"
            signature={record.clientSignature}
          />
        </div>

        <section className="space-y-2 rounded-lg border border-gray-200 bg-gray-50/50 p-4">
          <SectionTitle
            icon={<MapPin className="w-4 h-4 text-[#66B2B2]" />}
            title="Locations"
          />
          <RowDetail
            label="Equipment Site"
            value={record.equipmentSiteAddress ?? "-"}
          />
          <RowDetail
            label="Technician Address"
            value={record.technicianAddress ?? "-"}
          />
        </section>
      </DialogContent>
    </Dialog>
  );
}

function SectionTitle({
  icon,
  title,
}: {
  icon?: React.ReactNode;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2 text-sm font-semibold text-gray-950">
      {icon}
      <span>{title}</span>
    </div>
  );
}

function DetailTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-gray-200 bg-white p-3">
      <div className="text-[10px] uppercase tracking-[0.12em] text-gray-500">
        {label}
      </div>
      <div className={`mt-1 text-lg font-semibold tracking-tight ${changeStatusColor(value.toLowerCase())}`}>
        {value}
      </div>
    </div>
  );
}

function RowDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 text-xs">
      <span className="text-gray-500">{label}</span>
      <span className="text-right font-medium text-gray-900">{value}</span>
    </div>
  );
}

function PhotoPanel({
  title,
  photo,
  notes,
}: {
  title: string;
  photo?: string;
  notes?: string;
}) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4">
      <SectionTitle
        icon={<Camera className="w-4 h-4 text-[#66B2B2]" />}
        title={title}
      />
      {photo ? (
        <img
          src={photo}
          alt={title}
          className="mt-3 h-52 w-full rounded-md border border-gray-200 object-cover"
        />
      ) : (
        <div className="mt-3 flex h-28 items-center justify-center rounded-md border border-dashed border-gray-200 bg-gray-50 text-xs text-gray-500">
          No photo attached
        </div>
      )}
      {notes && <p className="mt-2 text-xs text-gray-600">{notes}</p>}
    </section>
  );
}

function SignaturePanel({
  title,
  signature,
}: {
  title: string;
  signature?: string;
}) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4">
      <SectionTitle
        icon={<PenLine className="w-4 h-4 text-[#66B2B2]" />}
        title={title}
      />
      {signature ? (
        <img
          src={signature}
          alt={title}
          className="mt-3 h-24 w-full rounded-md border border-gray-200 bg-white object-contain"
        />
      ) : (
        <div className="mt-3 flex h-20 items-center justify-center rounded-md border border-dashed border-gray-200 bg-gray-50 text-xs text-gray-500">
          No signature attached
        </div>
      )}
    </section>
  );
}

function getReadableDescription(description: string) {
  if (!description.trim()) return "";

  try {
    const parsed = JSON.parse(description) as { label?: string };
    return parsed.label ?? "";
  } catch {
    return description;
  }
}
