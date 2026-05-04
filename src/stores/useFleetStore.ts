import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { FleetUnit, GPSTelemetry } from "@/types";

interface FleetState {
  units: FleetUnit[];
  selectedUnitId: number | null;
  startSimulation: () => void;
  stopSimulation: () => void;
  selectUnit: (id: number | null) => void;
  getUnitTelemetry: (unitId: number) => GPSTelemetry | null;
}

const createInitialTelemetry = (): GPSTelemetry => ({
  lat: 41.4036,
  lng: 2.1741,
  hours: 4532,
  status: "online",
  speed: 45,
  heading: 180,
  lastUpdated: new Date().toISOString(),
});

const mockUnits: FleetUnit[] = [
  {
    id: 1,
    equipmentId: 1,
    unitName: "GPS-001 (Acme)",
    telemetry: createInitialTelemetry(),
    serviceDue: false,
  },
  {
    id: 2,
    equipmentId: 3,
    unitName: "GPS-003 (TechCorp)",
    telemetry: {
      ...createInitialTelemetry(),
      lat: 37.3382,
      lng: -121.8863,
      hours: 3890,
      speed: 0,
      status: "idle",
    },
    serviceDue: false,
  },
  {
    id: 3,
    equipmentId: 4,
    unitName: "GPS-004 (Metro)",
    telemetry: {
      ...createInitialTelemetry(),
      lat: 41.8781,
      lng: -87.6298,
      hours: 2100,
      speed: 62,
      status: "online",
    },
    serviceDue: true,
  },
  {
    id: 4,
    equipmentId: 10,
    unitName: "GPS-010 (Metro)",
    telemetry: {
      ...createInitialTelemetry(),
      lat: 41.8313,
      lng: -87.6452,
      hours: 3450,
      speed: 38,
      status: "online",
    },
    serviceDue: false,
  },
  {
    id: 5,
    equipmentId: 7,
    unitName: "GPS-007 (Atlas)",
    telemetry: {
      ...createInitialTelemetry(),
      lat: 39.7392,
      lng: -104.9903,
      hours: 5200,
      speed: 0,
      status: "idle",
    },
    serviceDue: true,
  },
];

let simulationInterval: ReturnType<typeof setInterval> | null = null;

export const useFleetStore = create<FleetState>()(
  persist(
    (set, get) => ({
      units: mockUnits,
      selectedUnitId: 1,

      startSimulation: () => {
        if (simulationInterval) return;
        simulationInterval = setInterval(() => {
          set((state) => ({
            units: state.units.map((unit) => {
              const newLat = unit.telemetry.lat + (Math.random() - 0.5) * 0.0005;
              const newLng = unit.telemetry.lng + (Math.random() - 0.5) * 0.0005;
              const newHours = unit.telemetry.hours + 0.001;
              const statuses: GPSTelemetry["status"][] = ["online", "idle"];
              const newStatus = Math.random() > 0.9
                ? statuses[Math.floor(Math.random() * statuses.length)]
                : unit.telemetry.status;
              const newSpeed = newStatus === "online" ? Math.floor(Math.random() * 80) : 0;
              const newHeading = (unit.telemetry.heading + (Math.random() - 0.5) * 10) % 360;

              return {
                ...unit,
                telemetry: {
                  ...unit.telemetry,
                  lat: newLat,
                  lng: newLng,
                  hours: newHours,
                  status: newStatus,
                  speed: newSpeed,
                  heading: Math.abs(newHeading),
                  lastUpdated: new Date().toISOString(),
                },
              };
            }),
          }));
        }, 3000);
      },

      stopSimulation: () => {
        if (simulationInterval) {
          clearInterval(simulationInterval);
          simulationInterval = null;
        }
      },

      selectUnit: (id) => {
        set({ selectedUnitId: id });
      },

      getUnitTelemetry: (unitId) => {
        const unit = get().units.find((u) => u.id === unitId);
        return unit?.telemetry || null;
      },
    }),
    {
      name: "nextos-fleet",
      partialize: (state) => ({ units: state.units, selectedUnitId: state.selectedUnitId }),
    }
  )
);
