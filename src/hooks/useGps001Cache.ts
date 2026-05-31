import { useState, useEffect } from "react";

const RESET_ON_COMPLETION_KEY = "nextos-reset-on-completion";
const GPS001_HOURS_OFFSET_KEY = "nextos-gps001-hours-offset-ms";

export function useGps001Cache() {
  const [gps001CacheMs, setGps001CacheMs] = useState<number>(() => {
    try { return Number(window.localStorage.getItem("nextos-gps001-total-hours-ms") ?? "0") || 0; }
    catch { return 0; }
  });

  const [gps001KmTotal, setGps001KmTotal] = useState<number>(() => {
    try { return Number(window.localStorage.getItem("nextos-gps001-total-km") ?? "0") || 0; }
    catch { return 0; }
  });

  const [gps001WorkingDays, setGps001WorkingDays] = useState<number>(() => {
    try {
      const raw = window.localStorage.getItem("fleet:gps001WorkingDaysByDay:v2");
      if (!raw) return 0;
      const parsed = JSON.parse(raw) as Record<string, number>;
      const entries = Object.entries(parsed).sort((a, b) => b[0].localeCompare(a[0]));
      return entries[0]?.[1] ?? 0;
    } catch { return 0; }
  });

  const [gps001HoursOffsetMs, setGps001HoursOffsetMs] = useState<number>(() => {
    try { return Number(window.localStorage.getItem(GPS001_HOURS_OFFSET_KEY) ?? "0") || 0; } catch { return 0; }
  });

  const [resetOnCompletion, setResetOnCompletion] = useState<boolean>(() => {
    try { return window.localStorage.getItem(RESET_ON_COMPLETION_KEY) !== "false"; } catch { return true; }
  });

  // Poll GPS hours every 30s and listen for cross-tab storage changes
  useEffect(() => {
    const refresh = () => {
      try {
        const ms = Number(window.localStorage.getItem("nextos-gps001-total-hours-ms") ?? "0") || 0;
        setGps001CacheMs((prev) => (prev !== ms ? ms : prev));
      } catch {}
    };
    const id = setInterval(refresh, 30_000);
    window.addEventListener("storage", refresh);
    return () => { clearInterval(id); window.removeEventListener("storage", refresh); };
  }, []);

  // Poll km + working days every 30s
  useEffect(() => {
    const refresh = () => {
      try {
        const km = Number(window.localStorage.getItem("nextos-gps001-total-km") ?? "0") || 0;
        setGps001KmTotal((prev) => (prev !== km ? km : prev));
        const raw = window.localStorage.getItem("fleet:gps001WorkingDaysByDay:v2");
        if (raw) {
          const parsed = JSON.parse(raw) as Record<string, number>;
          const days = Object.entries(parsed).sort((a, b) => b[0].localeCompare(a[0]))[0]?.[1] ?? 0;
          setGps001WorkingDays((prev) => (prev !== days ? days : prev));
        }
      } catch {}
    };
    const id = setInterval(refresh, 30_000);
    window.addEventListener("storage", refresh);
    return () => { clearInterval(id); window.removeEventListener("storage", refresh); };
  }, []);

  const toggleResetOnCompletion = () => {
    setResetOnCompletion((prev) => {
      const next = !prev;
      try { window.localStorage.setItem(RESET_ON_COMPLETION_KEY, String(next)); } catch {}
      if (!next) {
        setGps001HoursOffsetMs(0);
        try { window.localStorage.removeItem(GPS001_HOURS_OFFSET_KEY); } catch {}
      }
      return next;
    });
  };

  return {
    gps001CacheMs,
    gps001KmTotal,
    gps001WorkingDays,
    gps001HoursOffsetMs,
    setGps001HoursOffsetMs,
    resetOnCompletion,
    toggleResetOnCompletion,
  };
}
