export function getPmsMetricValue(seedEq: any, unit: string, gps001CacheMs: number, gps001HoursOffsetMs = 0): string {
  const u = unit.toLowerCase();
  if (u === "hours") {
    if (seedEq?.id === "EQ-001" && gps001CacheMs > 0) {
      const effectiveMs = Math.max(0, gps001CacheMs - gps001HoursOffsetMs);
      const totalMin = Math.floor(effectiveMs / (1000 * 60));
      return `${Math.floor(totalMin / 60)}h ${totalMin % 60}m`;
    }
    return seedEq?.hoursTotal ?? "—";
  }
  if (u === "km") {
    const km = seedEq?.kmTotal;
    return (km !== undefined && km !== null) ? `${km} km` : "—";
  }
  const raw = seedEq?.days;
  const d = typeof raw === "number" ? raw : parseFloat(String(raw ?? ""));
  if (!Number.isFinite(d) || d < 0) return "—";
  if (u === "weeks") return `${(d / 7).toFixed(1)} wk (${Math.round(d)}d)`;
  if (u === "months") return `${(d / 30.44).toFixed(1)} mo (${Math.round(d)}d)`;
  if (u === "years") return `${(d / 365.25).toFixed(2)} yr (${Math.round(d)}d)`;
  return "—";
}

export function getPmsMetricLabel(unit: string): string {
  switch (unit.toLowerCase()) {
    case "km": return "KM Logged";
    case "weeks": return "Weeks Logged";
    case "months": return "Months Logged";
    case "years": return "Years Logged";
    default: return "Hours Logged";
  }
}
