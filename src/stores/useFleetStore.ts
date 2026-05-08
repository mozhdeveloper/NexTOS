// src/stores/useFleetStore.ts
// Updated to use real GPS51 data instead of mock simulation

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { FleetUnit, GPSTelemetry } from "@/types";
import { fetchLastPosition } from "@/services/gps51";
import { useOperationsStore } from "./useOperationsStore";

// ─── GPS51 credentials ───────────────────────────────────────────────────────
// ⚠️ Move these to .env in production:
// VITE_GPS51_USERNAME=your_username
// VITE_GPS51_PASSWORD=your_password
const GPS51_USERNAME = import.meta.env.VITE_GPS51_USERNAME ?? "";
const GPS51_PASSWORD = import.meta.env.VITE_GPS51_PASSWORD ?? "";
// ─────────────────────────────────────────────────────────────────────────────

interface FleetState {
  units: FleetUnit[];
  selectedUnitId: number | null;
  isLive: boolean;
  lastFetchedAt: string | null;
  fetchError: string | null;

  // Actions
  selectUnit: (id: number | null) => void;
  getUnitTelemetry: (unitId: number) => GPSTelemetry | null;
  startLiveTracking: () => void;
  stopLiveTracking: () => void;
  fetchNow: () => Promise<void>;

  // Keep simulation for non-GPS51 units (optional)
  startSimulation: () => void;
  stopSimulation: () => void;
}

// Your real tracker unit — ID 1 maps to the KS199D-4G device
const GPS51_UNIT_ID = 1;

function mapGps51Status(position: {
  moving: number;
  status: string;
  speed: number;
}): GPSTelemetry["status"] {
  const statusText = String(position.status ?? "").toLowerCase();
  const hasOfflineText =
    statusText.includes("offline") ||
    statusText.includes("disconnect") ||
    statusText.includes("sleep");

  if (hasOfflineText) {
    return "offline";
  }

  const hasParkingText = statusText.includes("acc off") || statusText.includes("acc关");
  if (hasParkingText) {
    return "parking";
  }

  if (position.moving === 1 || Number(position.speed ?? 0) > 0) {
    return "driving";
  }

  return "idle";
}

// Placeholder for initial render before first fetch
const initialUnit: FleetUnit = {
  id: GPS51_UNIT_ID,
  equipmentId: 1,
  unitName: "KS199D-4G Tracker",
  telemetry: {
    lat: 14.6507,   // Manila default until first fetch
    lng: 21.0995,
    hours: 0,
    status: "idle",
    speed: 0,
    heading: 0,
    lastUpdated: new Date().toISOString(),
  },
  serviceDue: false,
};

let liveInterval: ReturnType<typeof setInterval> | null = null;
let simulationInterval: ReturnType<typeof setInterval> | null = null;

export const useFleetStore = create<FleetState>()(
  persist(
    (set, get) => ({
      units: [initialUnit],
      selectedUnitId: GPS51_UNIT_ID,
      isLive: false,
      lastFetchedAt: null,
      fetchError: null,

      // ── Fetch real GPS data now ──────────────────────────────────────────
      fetchNow: async () => {
        try {
          const position = await fetchLastPosition(GPS51_USERNAME, GPS51_PASSWORD);

          if (!position) {
            set({ fetchError: "No position data returned" });
            return;
          }

          const status = mapGps51Status(position);

          set((state) => ({
            fetchError: null,
            lastFetchedAt: new Date().toISOString(),
            units: state.units.map((unit) =>
              unit.id === GPS51_UNIT_ID
                ? {
                    ...unit,
                    telemetry: {
                      lat: position.lat,
                      lng: position.lng,
                      speed: Math.round(position.speed * 0.000277778), // m/s → mph
                      heading: position.course,
                      status,
                      hours: position.onlineHours,
                      lastUpdated: new Date(position.devicetime).toISOString(),
                    },
                  }
                : unit
            ),
          }));

          // 🔄 Sync Equipment with Fleet Data
          useOperationsStore.getState().syncWithFleet(get().units);
        } catch (err: any) {
          set({ fetchError: err.message ?? "Unknown error fetching GPS data" });
          console.error("GPS51 fetch error:", err);
        }
      },

      // ── Start live tracking (polls every 30 seconds) ─────────────────────
      startLiveTracking: () => {
        if (liveInterval) return;
        set({ isLive: true });

        // Fetch immediately on start
        get().fetchNow();

        // Then every 30 seconds
        liveInterval = setInterval(() => {
          get().fetchNow();
        }, 30_000);
      },

      // ── Stop live tracking ───────────────────────────────────────────────
      stopLiveTracking: () => {
        if (liveInterval) {
          clearInterval(liveInterval);
          liveInterval = null;
        }
        set({ isLive: false });
      },

      // ── Select a unit on the map ─────────────────────────────────────────
      selectUnit: (id) => set({ selectedUnitId: id }),

      getUnitTelemetry: (unitId) => {
        const unit = get().units.find((u) => u.id === unitId);
        return unit?.telemetry || null;
      },

      // ── Legacy simulation (kept for compatibility) ───────────────────────
      startSimulation: () => {
        if (simulationInterval) return;
        simulationInterval = setInterval(() => {
          set((state) => ({
            units: state.units.map((unit) => ({
              ...unit,
              telemetry: {
                ...unit.telemetry,
                lat: unit.telemetry.lat + (Math.random() - 0.5) * 0.0005,
                lng: unit.telemetry.lng + (Math.random() - 0.5) * 0.0005,
                lastUpdated: new Date().toISOString(),
              },
            })),
          }));
          // 🔄 Sync Equipment with Fleet Data (Simulation)
          useOperationsStore.getState().syncWithFleet(get().units);
        }, 3000);
      },

      stopSimulation: () => {
        if (simulationInterval) {
          clearInterval(simulationInterval);
          simulationInterval = null;
        }
      },
    }),
    {
      name: "nextos-fleet",
      partialize: (state) => ({
        units: state.units,
        selectedUnitId: state.selectedUnitId,
      }),
    }
  )
);