export type PmsStatusEntry = {
  value: string;
  label: string;
  color: string;
  minProgressPercent: number;
};

/**
 * Compute PMS status from a 0-based progress percentage where
 * 0 = just serviced, 100 = exactly at interval, >100 = overdue.
 *
 * Entries are evaluated highest-threshold-first; the first entry
 * whose minProgressPercent <= progressPercent wins.
 *
 * Returns null if statuses is empty or progressPercent is not finite.
 */
export function computePmsStatus(
  progressPercent: number,
  statuses: PmsStatusEntry[]
): string | null {
  if (!Number.isFinite(progressPercent) || statuses.length === 0) return null;
  const sorted = [...statuses].sort((a, b) => b.minProgressPercent - a.minProgressPercent);
  return sorted.find(s => progressPercent >= s.minProgressPercent)?.value ?? null;
}

/**
 * Convenience wrapper for callers that compute hours/km/periods remaining
 * rather than progress percentage directly.
 *
 * remaining  = nextServiceMilestone - currentUsage
 *   positive → still has capacity left
 *   zero     → exactly at service point
 *   negative → overdue
 *
 * Converts to progressPercent via: (1 - remaining / interval) * 100
 */
export function computePmsStatusFromRemaining(
  remaining: number,
  interval: number,
  statuses: PmsStatusEntry[]
): string | null {
  if (!Number.isFinite(remaining) || !Number.isFinite(interval) || interval <= 0) return null;
  const progressPercent = (1 - remaining / interval) * 100;
  return computePmsStatus(progressPercent, statuses);
}
