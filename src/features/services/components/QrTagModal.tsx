import { QrCode, Printer } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";

interface QrTagModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  qrSerial: string;
  unitName: string;
}

export function QrTagModal({ open, onOpenChange, qrSerial, unitName }: QrTagModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white border-gray-200 sm:max-w-md rounded-2xl shadow-2xl">
        <DialogHeader className="border-b border-gray-50 pb-4">
          <DialogTitle className="text-gray-900 flex items-center gap-2">
            <QrCode className="w-5 h-5 text-[#66B2B2]" />
            Asset Identification Label
          </DialogTitle>
          <DialogDescription className="text-xs text-gray-500">
            Unique QR code for physical asset tracking and field identification.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center p-8 bg-white rounded-xl mt-4 border border-gray-50 shadow-inner">
          <div className="bg-white p-4 rounded-xl border-2 border-gray-900 shadow-xl">
            <QRCodeSVG value={qrSerial} size={220} level="H" includeMargin={true} />
          </div>
          <div className="mt-6 text-center space-y-1">
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Serial Number</p>
            <p className="text-lg font-bold text-gray-900 font-mono-tech">{qrSerial}</p>
            <div className="inline-flex items-center px-3 py-1 bg-[#66B2B2]/10 text-[#66B2B2] rounded-full text-[10px] font-bold mt-2">
              UNIT: {unitName}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl h-11 text-xs font-bold border-gray-200">Cancel</Button>
          <Button onClick={() => window.print()} className="bg-[#66B2B2] text-white hover:bg-[#5A9E9E] font-bold rounded-xl h-11 shadow-lg shadow-[#66B2B2]/20">
            <Printer className="w-4 h-4 mr-2" /> Print Tag
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

