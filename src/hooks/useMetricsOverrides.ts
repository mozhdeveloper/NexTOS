import { useState, useEffect, useCallback } from "react";
import seedData from "@/data/seed-data.json";

const METRICS_OVERRIDES_KEY = "nextos-metrics-overrides-v1";
const GPS001_HOURS_OFFSET_KEY = "nextos-gps001-hours-offset-ms";

export type MetricsOverride = { hoursTotal?: string; kmTotal?: number };

interface UseMetricsOverridesParams {
  gps001CacheMs: number;
  setGps001HoursOffsetMs: (ms: number) => void;
  seedEquipmentQueryData: { equipment: any[] } | undefined;
}

export function useMetricsOverrides({
  gps001CacheMs,
  setGps001HoursOffsetMs,
  seedEquipmentQueryData,
}: UseMetricsOverridesParams) {
  const [metricsOverrides, setMetricsOverrides] = useState<Map<string, MetricsOverride>>(() => {
    try {
      const raw = window.localStorage.getItem(METRICS_OVERRIDES_KEY);
      if (!raw) return new Map();
      const stored = new Map(JSON.parse(raw) as [string, MetricsOverride][]);
      const parseH = (s: string): number => {
        const m = String(s ?? "").match(/(\d+)\s*h\s*(\d+)\s*m/i);
        return m ? Number(m[1]) + Number(m[2]) / 60 : 0;
      };
      let changed = false;
      for (const eq of seedData.equipment as any[]) {
        const ov = stored.get(eq.id);
        if (!ov) continue;
        if (ov.hoursTotal !== undefined && parseH(eq.hoursTotal ?? "0h 0m") > parseH(ov.hoursTotal) + 0.5) {
          stored.delete(eq.id); changed = true; continue;
        }
        if (ov.kmTotal !== undefined) {
          const liveKm = typeof eq.kmTotal === "number" ? eq.kmTotal : parseFloat(String(eq.kmTotal ?? "0").replace(/[^\d.]/g, ""));
          if (Number.isFinite(liveKm) && liveKm > (ov.kmTotal ?? 0) + 1) {
            stored.delete(eq.id); changed = true;
          }
        }
      }
      if (changed) window.localStorage.setItem(METRICS_OVERRIDES_KEY, JSON.stringify(Array.from(stored.entries())));
      return stored;
    } catch { return new Map(); }
  });

  // Auto-clear stale overrides when live data diverges upward
  useEffect(() => {
    if (!seedEquipmentQueryData?.equipment || metricsOverrides.size === 0) return;
    const parseH = (s: string): number => {
      const m = String(s ?? "").match(/(\d+)\s*h\s*(\d+)\s*m/i);
      return m ? Number(m[1]) + Number(m[2]) / 60 : 0;
    };
    let anyCleared = false;
    const next = new Map(metricsOverrides);
    for (const eq of seedEquipmentQueryData.equipment) {
      const ov = next.get(eq.id);
      if (!ov) continue;
      if (ov.hoursTotal !== undefined) {
        const liveH = parseH(eq.hoursTotal ?? "0h 0m");
        const ovH = parseH(ov.hoursTotal);
        if (liveH > ovH + 0.5) { next.delete(eq.id); anyCleared = true; continue; }
      }
      if (ov.kmTotal !== undefined) {
        const liveKm = typeof eq.kmTotal === "number"
          ? eq.kmTotal
          : parseFloat(String(eq.kmTotal ?? "0").replace(/[^\d.]/g, ""));
        if (Number.isFinite(liveKm) && liveKm > (ov.kmTotal ?? 0) + 1) {
          next.delete(eq.id); anyCleared = true;
        }
      }
    }
    if (anyCleared) {
      setMetricsOverrides(next);
      try { window.localStorage.setItem(METRICS_OVERRIDES_KEY, JSON.stringify(Array.from(next.entries()))); } catch {}
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedEquipmentQueryData]);

  const handleMetricsReset = useCallback((seedEqId: string, unit: string) => {
    const u = unit.toLowerCase();
    if (u !== "hours" && u !== "km") return;

    if (seedEqId === "EQ-001") {
      if (u === "hours") {
        const offsetMs = gps001CacheMs;
        setGps001HoursOffsetMs(offsetMs);
        try { window.localStorage.setItem(GPS001_HOURS_OFFSET_KEY, String(offsetMs)); } catch {}
      }
    } else {
      const newOverride: MetricsOverride = u === "hours" ? { hoursTotal: "0h 0m" } : { kmTotal: 0 };
      setMetricsOverrides((prev) => {
        const next = new Map(prev);
        next.set(seedEqId, { ...(next.get(seedEqId) ?? {}), ...newOverride });
        try {
          window.localStorage.setItem(METRICS_OVERRIDES_KEY, JSON.stringify(Array.from(next.entries())));
        } catch {}
        return next;
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gps001CacheMs]);

  return { metricsOverrides, handleMetricsReset };
}
