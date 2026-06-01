import { useState, useEffect, useRef } from "react";
import { Navigation, MapPin, Clock, Car, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import type { ServiceRecord } from "@/types";

interface PreServiceConfirmModalProps {
  task: ServiceRecord | null;
  seedEquipment: any[];
  onReady: (travelStartTime: string, techAddress: string, eqAddress: string, estimatedArrival: string) => void;
  onCancel: () => void;
}

export function PreServiceConfirmModal({
  task,
  seedEquipment,
  onReady,
  onCancel,
}: PreServiceConfirmModalProps) {
  const [userLocation, setUserLocation] = useState<string>("Fetching your location…");
  const [isAnimating, setIsAnimating] = useState(false);
  const travelStartRef = useRef<string>("");

  // Reset & fetch geolocation whenever a new task opens
  useEffect(() => {
    if (!task) {
      setUserLocation("Fetching your location…");
      setIsAnimating(false);
      return;
    }
    if (!navigator.geolocation) {
      setUserLocation("Location unavailable");
      return;
    }
    setUserLocation("Fetching your location…");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
            { headers: { "Accept-Language": "en" } }
          );
          const data = await res.json();
          setUserLocation(data.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        } catch {
          setUserLocation(`${lat.toFixed(5)}°N, ${lng.toFixed(5)}°E`);
        }
      },
      () => setUserLocation("Location unavailable"),
      { timeout: 10_000, enableHighAccuracy: false }
    );
  }, [task?.id]);

  // Derive equipment address from seed data (lat/lng coords)
  let equipmentAddress = "Not specified";
  if (task) {
    let meta: any = {};
    try { meta = JSON.parse(task.description ?? "{}"); } catch {}
    if (meta._src === "pms") {
      const seedEq = seedEquipment.find((s: any) => s.id === meta._seedEqId);
      if (seedEq?.lat != null && seedEq?.lng != null) {
        equipmentAddress = `${Number(seedEq.lat).toFixed(5)}°N, ${Number(seedEq.lng).toFixed(5)}°E`;
      }
    }
  }

  const isLocationReady = userLocation !== "Fetching your location…" && userLocation !== "Location unavailable";
  const estimatedArrival = "~25 min (ETA 2:45 PM)";

  const handleConfirm = () => {
    travelStartRef.current = new Date().toISOString();
    setIsAnimating(true);
    setTimeout(() => {
      onReady(travelStartRef.current, userLocation, equipmentAddress, estimatedArrival);
    }, 2600);
  };

  return (
    <>
      <Dialog open={!!task} onOpenChange={(open) => { if (!open && !isAnimating) onCancel(); }}>
        <DialogContent className="max-w-md bg-white border-gray-200 rounded-2xl shadow-2xl p-0 overflow-hidden">
          {isAnimating ? (
            /* ── Car Animation Screen ── */
            <div className="p-6 space-y-4 text-center">
              <div className="rounded-2xl overflow-hidden">
                <video
                  src="/assets/05f1ab3a-2610-4b4c-ae2e-45cbcb01e443.mp4"
                  autoPlay
                  muted
                  playsInline
                  className="w-full block"
                />
              </div>
              <div>
                <p className="text-base font-bold text-gray-800 mb-1">On your way!</p>
                <p className="text-xs text-gray-500">Travel started — opening service checklist…</p>
              </div>
            </div>
          ) : (
            /* ── Confirmation Screen ── */
            <>
              <DialogHeader className="p-6 border-b border-gray-50 bg-gradient-to-br from-[#66B2B2]/5 to-transparent rounded-t-2xl">
                <DialogTitle className="flex items-center gap-2.5 text-gray-900 text-base font-bold">
                  <div className="w-9 h-9 rounded-xl bg-[#66B2B2]/10 flex items-center justify-center">
                    <Navigation className="w-4.5 h-4.5 text-[#66B2B2]" />
                  </div>
                  Pre-Service Confirmation
                </DialogTitle>
                <DialogDescription className="text-xs text-gray-500 mt-1">
                  Confirm your readiness before starting the service execution.
                </DialogDescription>
              </DialogHeader>

              <div className="p-6 space-y-4">
                {/* Location row */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3 h-3 text-blue-500 shrink-0" />
                      <p className="text-[9px] font-black uppercase tracking-widest text-blue-600">Your Location</p>
                    </div>
                    <p className="text-[11px] text-blue-900 font-medium leading-snug break-words">{userLocation}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3 h-3 text-amber-500 shrink-0" />
                      <p className="text-[9px] font-black uppercase tracking-widest text-amber-600">Equipment Site</p>
                    </div>
                    <p className="text-[11px] text-amber-900 font-medium leading-snug break-words">{equipmentAddress}</p>
                  </div>
                </div>

                {isLocationReady && (
                  <div className="p-3 rounded-xl bg-teal-50 border border-teal-100 space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-teal-500 shrink-0" />
                      <p className="text-[9px] font-black uppercase tracking-widest text-teal-600">Estimated Arrival</p>
                    </div>
                    <p className="text-[11px] text-teal-900 font-medium leading-snug">{estimatedArrival}</p>
                  </div>
                )}

                {/* Prompt */}
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 text-center">
                  <p className="text-sm font-bold text-gray-800 leading-relaxed">
                    Are you ready to travel to the equipment location and begin the service?
                  </p>
                </div>

                {/* Action buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    onClick={onCancel}
                    className="h-11 border-gray-200 text-gray-600 font-bold text-xs hover:bg-gray-50 rounded-xl"
                  >
                    <X className="w-3.5 h-3.5 mr-1.5" />
                    No, Cancel
                  </Button>
                  <Button
                    onClick={handleConfirm}
                    disabled={!isLocationReady}
                    className="h-11 bg-[#66B2B2] text-white hover:bg-[#5A9E9E] font-bold text-xs shadow-lg shadow-[#66B2B2]/20 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Car className="w-3.5 h-3.5 mr-1.5" />
                    Yes, Ready to Go
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

