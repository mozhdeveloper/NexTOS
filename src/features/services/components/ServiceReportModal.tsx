import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/shared/components/ui/dialog";
import { ServiceReportView } from "@/features/services/components/ServiceReportView";
import type { ServiceRecord, Equipment, Client, ServicePhoto } from "@/types";

interface ServiceReportModalProps {
  showReport: (ServiceRecord & Record<string, any>) | null;
  onClose: () => void;
  equipment: Equipment[];
  clients: Client[];
  servicePhotos: ServicePhoto[];
}

export function ServiceReportModal({
  showReport,
  onClose,
  equipment,
  clients,
  servicePhotos,
}: ServiceReportModalProps) {
  return (
    <Dialog open={!!showReport} onOpenChange={() => onClose()}>
      <DialogContent className="bg-white border-gray-200 max-w-4xl max-h-[95vh] overflow-auto scrollbar-hide rounded-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Service Report Detail</DialogTitle>
          <DialogDescription>
            Detailed documentation of the maintenance service performed.
          </DialogDescription>
        </DialogHeader>
        {showReport && (
          <ServiceReportView
            record={showReport}
            equipment={equipment.find(
              eqItem => eqItem.id === showReport.equipmentId
            )}
            client={clients.find(c => c.id === showReport.clientId)}
            photos={servicePhotos.filter(
              p => p.serviceRecordId === showReport.id
            )}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

