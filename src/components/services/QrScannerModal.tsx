import { useState, useRef, useEffect } from "react";
import { Camera, AlertTriangle } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface QrScannerModalProps {
  open: boolean;
  onClose: () => void;
  onScanSuccess: (serial: string) => void;
}

export function QrScannerModal({ open, onClose, onScanSuccess }: QrScannerModalProps) {
  const [scanning, setScanning] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [manualSerial, setManualSerial] = useState("");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const initTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const stopScanning = async () => {
    if (initTimeoutRef.current) {
      clearTimeout(initTimeoutRef.current);
      initTimeoutRef.current = null;
    }
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); await scannerRef.current.clear(); } catch {}
      scannerRef.current = null;
    }
    setScanning(false);
    setScannerError(null);
  };

  const handleScanSuccess = async (scannedText: string) => {
    await stopScanning();
    onClose();
    setTimeout(() => onScanSuccess(scannedText.trim()), 100);
  };

  const startScanning = async () => {
    setScanning(true);
    setManualSerial("");
    setScannerError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
    } catch {
      setScannerError("Camera permission denied. Please allow camera access and try again.");
      setScanning(false);
      return;
    }

    initTimeoutRef.current = setTimeout(() => {
      setScannerError("Camera failed to start. Please try again or use manual entry.");
      setScanning(false);
      if (scannerRef.current) {
        scannerRef.current.stop().catch(console.error);
        scannerRef.current.clear().catch(console.error);
        scannerRef.current = null;
      }
    }, 5000);

    setTimeout(async () => {
      try {
        const readerElement = document.getElementById("qr-reader-admin");
        if (!readerElement) return;
        if (!scannerRef.current) {
          scannerRef.current = new Html5Qrcode("qr-reader-admin");
          try {
            await scannerRef.current.start(
              { facingMode: "environment" },
              { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
              (decodedText) => handleScanSuccess(decodedText),
              () => {}
            );
          } catch {
            await scannerRef.current.start(
              {},
              { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
              (decodedText) => handleScanSuccess(decodedText),
              () => {}
            );
          }
          if (initTimeoutRef.current) { clearTimeout(initTimeoutRef.current); initTimeoutRef.current = null; }
          setScanning(false);
        }
      } catch {
        setScannerError("Failed to start camera. Please check camera permissions and try again.");
        setScanning(false);
      }
    }, 500);
  };

  const handleManualEntry = async () => {
    if (!manualSerial.trim()) return;
    if (scanning) await stopScanning();
    const serial = manualSerial.trim();
    setManualSerial("");
    onClose();
    setTimeout(() => onScanSuccess(serial), 100);
  };

  // Auto-start camera when modal opens; stop when it closes
  useEffect(() => {
    if (open) {
      startScanning();
    } else {
      stopScanning();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { stopScanning(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="bg-white border-gray-200 sm:max-w-lg rounded-2xl shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-gray-900 flex items-center gap-2 text-lg">
            <Camera className="w-5 h-5 text-[#10B981]" />
            Field Asset Recognition
          </DialogTitle>
          <DialogDescription className="text-xs text-gray-500">
            Scan equipment QR code to identify and manage the asset in the field.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {scannerError && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-100 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-xs text-red-700 leading-relaxed font-medium">{scannerError}</p>
            </div>
          )}

          <div className="relative group">
            <div
              id="qr-reader-admin"
              className="w-full max-w-sm mx-auto rounded-2xl overflow-hidden bg-gray-900 border-4 border-gray-100 shadow-inner"
            ></div>
            {scanning && !scannerError && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-2xl backdrop-blur-[2px]">
                <div className="text-center">
                  <div className="w-12 h-12 border-4 border-white/20 border-t-[#10B981] rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-sm text-white font-bold tracking-widest uppercase">Targeting...</p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4 pt-4 border-t border-gray-50">
            <p className="text-[10px] text-center text-gray-400 uppercase font-bold tracking-[0.2em]">Manual Input Alternative</p>
            <div className="flex gap-2">
              <Input
                placeholder="Enter equipment serial..."
                value={manualSerial}
                onChange={(e) => setManualSerial(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleManualEntry()}
                className="bg-white border-gray-200 text-gray-900 text-sm h-11 rounded-xl focus:ring-[#10B981]/20 font-mono-tech"
              />
              <Button onClick={handleManualEntry} className="bg-gray-900 text-white hover:bg-black font-bold px-6 h-11 rounded-xl shadow-lg">Recognize</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
