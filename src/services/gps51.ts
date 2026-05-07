// src/services/gps51.ts
// Frontend wrapper for backend GPS51 proxy endpoints.

const API_BASE = "/api/gps51";

async function readJson<T>(response: Response): Promise<T> {
  const data = await response.json();
  if (!response.ok) {
    const message =
      typeof data?.error === "string" && data.error.trim().length > 0
        ? data.error
        : `Request failed with status ${response.status}`;
    throw new Error(message);
  }
  return data as T;
}

// Types
export interface GPS51Session {
  token: string;
  serverid: number;
}

export interface GPS51Position {
  deviceid: string;
  lat: number;
  lng: number;
  speed: number;
  course: number;
  status: string;
  devicetime: number;
  moving: number;
  exvoltage: number;
  onlineHours: number;
}

export interface GPS51HistoryPoint {
  lat: number;
  lng: number;
  speed: number;
  course: number;
  devicetime: number;
  mileageKm?: number;
  maxSpeedKph?: number;
  avgSpeedKph?: number;
  drivingMinutes?: number;
  workingMinutes?: number;
  idleMinutes?: number;
  startAddress?: string;
  endAddress?: string;
  startTime?: number;
  endTime?: number;
  raw?: Record<string, unknown>;
}

export interface GPS51DailyHistorySummary {
  mileageMeters: number;
  maxSpeedMps: number;
  avgSpeedMps: number;
  drivingMs: number;
  workingMs: number;
  idleMs: number;
  parkingMs: number;
  parkingText?: string;
  startTime?: number;
  endTime?: number;
  startAddress?: string;
  endAddress?: string;
  startLat?: number;
  startLng?: number;
  endLat?: number;
  endLng?: number;
}

// Kept for compatibility with previous call sites; credentials are now server-side.
export async function gps51Login(_username: string, _password: string): Promise<GPS51Session> {
  throw new Error("Direct GPS51 login from frontend is disabled; use backend endpoints.");
}

export async function fetchLastPosition(
  _username?: string,
  _password?: string
): Promise<GPS51Position | null> {
  const response = await fetch(`${API_BASE}/last-position`, {
    credentials: "include",
  });
  const payload = await readJson<{ data: GPS51Position | null }>(response);
  return payload.data;
}

export async function fetchRouteHistory(
  _username: string | undefined,
  _password: string | undefined,
  startDate: string,
  endDate: string
): Promise<GPS51HistoryPoint[]> {
  const params = new URLSearchParams({ startDate, endDate });
  const response = await fetch(`${API_BASE}/route-history?${params.toString()}`, {
    credentials: "include",
  });
  const payload = await readJson<{ data: GPS51HistoryPoint[] }>(response);
  return payload.data;
}

export async function fetchDailyHistorySummary(
  _username: string | undefined,
  _password: string | undefined,
  day: string
): Promise<GPS51DailyHistorySummary | null> {
  const params = new URLSearchParams({ day });
  const response = await fetch(`${API_BASE}/daily-history-summary?${params.toString()}`, {
    credentials: "include",
  });
  const payload = await readJson<{ data: GPS51DailyHistorySummary | null }>(response);
  return payload.data;
}

export async function fetchAllTimeWorkingMs(
  _username: string | undefined,
  _password: string | undefined,
  startDay = "2000-01-01",
  endDay?: string
): Promise<number> {
  const params = new URLSearchParams({ startDay });
  if (endDay) {
    params.set("endDay", endDay);
  }
  const response = await fetch(`${API_BASE}/all-time-working?${params.toString()}`, {
    credentials: "include",
  });
  const payload = await readJson<{ totalMs: number }>(response);
  return Number(payload.totalMs ?? 0);
}
