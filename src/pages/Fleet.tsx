import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import { useFleetStore } from "@/stores/useFleetStore";
import { useOperationsStore } from "@/stores/useOperationsStore";
import { useCRMStore } from "@/stores/useCRMStore";
import { useAuthStore } from "@/stores/useAuthStore";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Radio,
  AlertTriangle,
  ChevronRight,
  Wifi,
  WifiOff,
} from "lucide-react";

// Fix Leaflet default markers
const defaultIcon = L.icon({
  iconUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='25' height='41' viewBox='0 0 25 41'%3E%3Cpath fill='%23F2A900' stroke='%23050505' stroke-width='2' d='M12.5 0C5.6 0 0 5.6 0 12.5c0 9.4 12.5 28.5 12.5 28.5S25 21.9 25 12.5C25 5.6 19.4 0 12.5 0z'/%3E%3Ccircle fill='%23050505' cx='12.5' cy='12.5' r='5'/%3E%3C/svg%3E",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const onlineIcon = L.icon({
  iconUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='25' height='41' viewBox='0 0 25 41'%3E%3Cpath fill='%2310B981' stroke='%23050505' stroke-width='2' d='M12.5 0C5.6 0 0 5.6 0 12.5c0 9.4 12.5 28.5 12.5 28.5S25 21.9 25 12.5C25 5.6 19.4 0 12.5 0z'/%3E%3Ccircle fill='%23050505' cx='12.5' cy='12.5' r='5'/%3E%3C/svg%3E",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const idleIcon = L.icon({
  iconUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='25' height='41' viewBox='0 0 25 41'%3E%3Cpath fill='%23F2A900' stroke='%23050505' stroke-width='2' d='M12.5 0C5.6 0 0 5.6 0 12.5c0 9.4 12.5 28.5 12.5 28.5S25 21.9 25 12.5C25 5.6 19.4 0 12.5 0z'/%3E%3Ccircle fill='%23050505' cx='12.5' cy='12.5' r='5'/%3E%3C/svg%3E",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

function MapCenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 13);
  }, [center, map]);
  return null;
}

export default function Fleet() {
  useAuthStore();
  const { units, selectedUnitId, selectUnit } = useFleetStore();
  const { equipment } = useOperationsStore();
  const { clients } = useCRMStore();
  const [mapCenter, setMapCenter] = useState<[number, number]>([41.4036, 2.1741]);

  const selectedUnit = units.find((u) => u.id === selectedUnitId);

  useEffect(() => {
    if (selectedUnit) {
      setMapCenter([selectedUnit.telemetry.lat, selectedUnit.telemetry.lng]);
    }
  }, [selectedUnit]);

  const statusIcon = (status: string) => {
    switch (status) {
      case "online": return onlineIcon;
      case "idle": return idleIcon;
      default: return defaultIcon;
    }
  };

  return (
    <div className="space-y-4 h-[calc(100vh-40px)]">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-[32px] font-bold text-[#EAEAEA] tracking-[-0.02em]">Fleet Intelligence</h1>
          <p className="text-sm text-[#88888C] mt-0.5">Real-time GPS tracking and telemetry</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-[#10B981]/10 border border-[#10B981]/20">
            <Wifi className="w-3 h-3 text-[#10B981]" />
            <span className="text-xs text-[#10B981] font-medium">
              {units.filter((u) => u.telemetry.status === "online").length} online
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-[#F2A900]/10 border border-[#F2A900]/20">
            <WifiOff className="w-3 h-3 text-[#F2A900]" />
            <span className="text-xs text-[#F2A900] font-medium">
              {units.filter((u) => u.telemetry.status === "idle").length} idle
            </span>
          </div>
        </div>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Map */}
        <div className="flex-1 data-card overflow-hidden relative">
          <MapContainer
            center={mapCenter}
            zoom={13}
            style={{ height: "100%", width: "100%", background: "#1A1A20" }}
            zoomControl={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://carto.com/">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            <MapCenter center={mapCenter} />
            {units.map((unit) => (
              <Marker
                key={unit.id}
                position={[unit.telemetry.lat, unit.telemetry.lng]}
                icon={statusIcon(unit.telemetry.status)}
                eventHandlers={{
                  click: () => selectUnit(unit.id),
                }}
              >
                <Popup className="dark-popup">
                  <div className="bg-[#121214] p-2 min-w-[180px]">
                    <div className="text-xs font-bold text-[#EAEAEA] mb-1">{unit.unitName}</div>
                    <div className="text-[10px] text-[#88888C] space-y-0.5">
                      <div>Status: <span className={unit.telemetry.status === "online" ? "text-[#10B981]" : "text-[#F2A900]"}>{unit.telemetry.status}</span></div>
                      <div>Speed: {unit.telemetry.speed} mph</div>
                      <div>Hours: {Math.floor(unit.telemetry.hours)}</div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
            {/* Pulse effect for selected unit */}
            {selectedUnit && (
              <Circle
                center={[selectedUnit.telemetry.lat, selectedUnit.telemetry.lng]}
                radius={500}
                pathOptions={{
                  color: "#F2A900",
                  fillColor: "#F2A900",
                  fillOpacity: 0.1,
                  weight: 1,
                }}
              />
            )}
          </MapContainer>

          {/* Telemetry overlay */}
          {selectedUnit && (
            <div className="absolute bottom-4 left-4 void-glass rounded p-3 min-w-[200px]">
              <div className="flex items-center gap-2 mb-2">
                <Radio className={`w-3.5 h-3.5 ${selectedUnit.telemetry.status === "online" ? "text-[#10B981]" : "text-[#F2A900]"}`} />
                <span className="text-xs font-semibold text-[#EAEAEA]">{selectedUnit.unitName}</span>
              </div>
              <div className="space-y-1 font-mono-tech text-[10px]">
                <div className="flex justify-between">
                  <span className="text-[#88888C]">Coordinates</span>
                  <span className="text-[#EAEAEA]">
                    {selectedUnit.telemetry.lat.toFixed(4)}, {selectedUnit.telemetry.lng.toFixed(4)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#88888C]">Speed</span>
                  <span className="text-[#EAEAEA]">{selectedUnit.telemetry.speed} mph</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#88888C]">Heading</span>
                  <span className="text-[#EAEAEA]">{Math.floor(selectedUnit.telemetry.heading)}°</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#88888C]">Engine Hours</span>
                  <span className="text-[#F2A900]">{Math.floor(selectedUnit.telemetry.hours)}</span>
                </div>
                {selectedUnit.serviceDue && (
                  <div className="flex items-center gap-1 mt-1 pt-1 border-t border-white/5">
                    <AlertTriangle className="w-3 h-3 text-[#EF4444]" />
                    <span className="text-[#EF4444]">Service Due</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Asset List Sidebar */}
        <div className="w-[280px] data-card overflow-auto">
          <div className="p-3 border-b border-white/5">
            <h3 className="text-sm font-semibold text-[#EAEAEA]">Fleet Units</h3>
            <p className="text-[10px] text-[#88888C]">{units.length} units tracked</p>
          </div>
          <div className="divide-y divide-white/5">
            {units.map((unit) => {
              const eq = equipment.find((e) => e.id === unit.equipmentId);
              const client = clients.find((c) => c.id === eq?.clientId);
              const isSelected = selectedUnitId === unit.id;
              return (
                <button
                  key={unit.id}
                  onClick={() => selectUnit(unit.id)}
                  className={`w-full p-3 text-left transition-colors ${
                    isSelected ? "bg-[#F2A900]/10" : "hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          unit.telemetry.status === "online"
                            ? "bg-[#10B981]"
                            : unit.telemetry.status === "idle"
                            ? "bg-[#F2A900]"
                            : "bg-[#EF4444]"
                        }`}
                      />
                      <span className="text-xs font-medium text-[#EAEAEA]">{eq?.unitId || unit.unitName}</span>
                    </div>
                    <ChevronRight className={`w-3 h-3 ${isSelected ? "text-[#F2A900]" : "text-[#88888C]"}`} />
                  </div>
                  <div className="text-[10px] text-[#88888C] ml-3.5 space-y-0.5">
                    <div>{client?.companyName || "—"}</div>
                    <div className="flex items-center gap-2">
                      <span>Speed: {unit.telemetry.speed} mph</span>
                      <span>Hours: {Math.floor(unit.telemetry.hours)}</span>
                    </div>
                    {unit.serviceDue && (
                      <div className="flex items-center gap-1 text-[#EF4444]">
                        <AlertTriangle className="w-2.5 h-2.5" />
                        <span>Service due</span>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
