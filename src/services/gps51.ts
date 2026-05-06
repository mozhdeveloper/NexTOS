// src/services/gps51.ts
// GPS51 API Service - handles authentication and data fetching

const BASE_URL = "https://gps51.com/webapi";
const DEVICE_ID = "866557081650428";
const GPS51_DEBUG_LOG = true;

function logGPS51(label: string, payload: unknown): void {
  if (!GPS51_DEBUG_LOG) return;
  console.log(`[GPS51] ${label}:`, payload);
}

// MD5 implementation for password hashing
function md5(input: string): string {
  function safeAdd(x: number, y: number): number {
    const lsw = (x & 0xffff) + (y & 0xffff);
    const msw = (x >> 16) + (y >> 16) + (lsw >> 16);
    return (msw << 16) | (lsw & 0xffff);
  }
  function bitRotateLeft(num: number, cnt: number): number {
    return (num << cnt) | (num >>> (32 - cnt));
  }
  function md5cmn(q: number, a: number, b: number, x: number, s: number, t: number): number {
    return safeAdd(bitRotateLeft(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b);
  }
  function md5ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
    return md5cmn((b & c) | (~b & d), a, b, x, s, t);
  }
  function md5gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
    return md5cmn((b & d) | (c & ~d), a, b, x, s, t);
  }
  function md5hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
    return md5cmn(b ^ c ^ d, a, b, x, s, t);
  }
  function md5ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
    return md5cmn(c ^ (b | ~d), a, b, x, s, t);
  }

  const str = unescape(encodeURIComponent(input));
  const x: number[] = [];
  for (let i = 0; i < str.length * 8; i += 8) {
    x[i >> 5] |= (str.charCodeAt(i / 8) & 0xff) << i % 32;
  }
  const strLen = str.length * 8;
  x[strLen >> 5] |= 0x80 << strLen % 32;
  x[(((strLen + 64) >>> 9) << 4) + 14] = strLen;

  let a = 1732584193;
  let b = -271733879;
  let c = -1732584194;
  let d = 271733878;

  for (let i = 0; i < x.length; i += 16) {
    const olda = a, oldb = b, oldc = c, oldd = d;
    a = md5ff(a, b, c, d, x[i], 7, -680876936); d = md5ff(d, a, b, c, x[i + 1], 12, -389564586);
    c = md5ff(c, d, a, b, x[i + 2], 17, 606105819); b = md5ff(b, c, d, a, x[i + 3], 22, -1044525330);
    a = md5ff(a, b, c, d, x[i + 4], 7, -176418897); d = md5ff(d, a, b, c, x[i + 5], 12, 1200080426);
    c = md5ff(c, d, a, b, x[i + 6], 17, -1473231341); b = md5ff(b, c, d, a, x[i + 7], 22, -45705983);
    a = md5ff(a, b, c, d, x[i + 8], 7, 1770035416); d = md5ff(d, a, b, c, x[i + 9], 12, -1958414417);
    c = md5ff(c, d, a, b, x[i + 10], 17, -42063); b = md5ff(b, c, d, a, x[i + 11], 22, -1990404162);
    a = md5ff(a, b, c, d, x[i + 12], 7, 1804603682); d = md5ff(d, a, b, c, x[i + 13], 12, -40341101);
    c = md5ff(c, d, a, b, x[i + 14], 17, -1502002290); b = md5ff(b, c, d, a, x[i + 15], 22, 1236535329);
    a = md5gg(a, b, c, d, x[i + 1], 5, -165796510); d = md5gg(d, a, b, c, x[i + 6], 9, -1069501632);
    c = md5gg(c, d, a, b, x[i + 11], 14, 643717713); b = md5gg(b, c, d, a, x[i], 20, -373897302);
    a = md5gg(a, b, c, d, x[i + 5], 5, -701558691); d = md5gg(d, a, b, c, x[i + 10], 9, 38016083);
    c = md5gg(c, d, a, b, x[i + 15], 14, -660478335); b = md5gg(b, c, d, a, x[i + 4], 20, -405537848);
    a = md5gg(a, b, c, d, x[i + 9], 5, 568446438); d = md5gg(d, a, b, c, x[i + 14], 9, -1019803690);
    c = md5gg(c, d, a, b, x[i + 3], 14, -187363961); b = md5gg(b, c, d, a, x[i + 8], 20, 1163531501);
    a = md5gg(a, b, c, d, x[i + 13], 5, -1444681467); d = md5gg(d, a, b, c, x[i + 2], 9, -51403784);
    c = md5gg(c, d, a, b, x[i + 7], 14, 1735328473); b = md5gg(b, c, d, a, x[i + 12], 20, -1926607734);
    a = md5hh(a, b, c, d, x[i + 5], 4, -378558); d = md5hh(d, a, b, c, x[i + 8], 11, -2022574463);
    c = md5hh(c, d, a, b, x[i + 11], 16, 1839030562); b = md5hh(b, c, d, a, x[i + 14], 23, -35309556);
    a = md5hh(a, b, c, d, x[i + 1], 4, -1530992060); d = md5hh(d, a, b, c, x[i + 4], 11, 1272893353);
    c = md5hh(c, d, a, b, x[i + 7], 16, -155497632); b = md5hh(b, c, d, a, x[i + 10], 23, -1094730640);
    a = md5hh(a, b, c, d, x[i + 13], 4, 681279174); d = md5hh(d, a, b, c, x[i], 11, -358537222);
    c = md5hh(c, d, a, b, x[i + 3], 16, -722521979); b = md5hh(b, c, d, a, x[i + 6], 23, 76029189);
    a = md5hh(a, b, c, d, x[i + 9], 4, -640364487); d = md5hh(d, a, b, c, x[i + 12], 11, -421815835);
    c = md5hh(c, d, a, b, x[i + 15], 16, 530742520); b = md5hh(b, c, d, a, x[i + 2], 23, -995338651);
    a = md5ii(a, b, c, d, x[i], 6, -198630844); d = md5ii(d, a, b, c, x[i + 7], 10, 1126891415);
    c = md5ii(c, d, a, b, x[i + 14], 15, -1416354905); b = md5ii(b, c, d, a, x[i + 5], 21, -57434055);
    a = md5ii(a, b, c, d, x[i + 12], 6, 1700485571); d = md5ii(d, a, b, c, x[i + 3], 10, -1894986606);
    c = md5ii(c, d, a, b, x[i + 10], 15, -1051523); b = md5ii(b, c, d, a, x[i + 1], 21, -2054922799);
    a = md5ii(a, b, c, d, x[i + 8], 6, 1873313359); d = md5ii(d, a, b, c, x[i + 15], 10, -30611744);
    c = md5ii(c, d, a, b, x[i + 6], 15, -1560198380); b = md5ii(b, c, d, a, x[i + 13], 21, 1309151649);
    a = md5ii(a, b, c, d, x[i + 4], 6, -145523070); d = md5ii(d, a, b, c, x[i + 11], 10, -1120210379);
    c = md5ii(c, d, a, b, x[i + 2], 15, 718787259); b = md5ii(b, c, d, a, x[i + 9], 21, -343485551);
    a = safeAdd(a, olda); b = safeAdd(b, oldb);
    c = safeAdd(c, oldc); d = safeAdd(d, oldd);
  }

  const output = [a, b, c, d];
  const hex: string[] = [];
  for (let i = 0; i < output.length * 32; i += 8) {
    hex.push(('00' + ((output[i >> 5] >>> i % 32) & 0xff).toString(16)).slice(-2));
  }
  return hex.join('');
}

// Types
export interface GPS51Session {
  token: string;
  serverid: number;
}

function parseServerId(data: Record<string, unknown>): number {
  const candidates = [data.serverid, data.servers, data.server];
  for (const candidate of candidates) {
    const value = Number(candidate);
    if (Number.isFinite(value)) {
      return value;
    }
  }
  return 0;
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

interface GPS51TrackPoint {
  lat?: number;
  lng?: number;
  speed: number;
  starttime?: number;
  endtime?: number;
  updatetime?: number;
  raw?: Record<string, unknown>;
}

function toFiniteNumber(value: unknown, fallback = 0): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function toOptionalTimestamp(value: unknown): number | undefined {
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) {
    return numeric;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
}

  const geocodeCache = new Map<string, string>();

  async function reverseGeocode(lat: number, lng: number): Promise<string> {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return "";

    const cacheKey = `${lat.toFixed(6)},${lng.toFixed(6)}`;
    const cached = geocodeCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
        },
      });
      if (!response.ok) return "";

      const data = await response.json();
      const address = typeof data?.display_name === "string" ? data.display_name.trim() : "";
      if (address) {
        geocodeCache.set(cacheKey, address);
      }
      return address;
    } catch {
      return "";
    }
  }

function parseDurationTextToMs(value: string): number | undefined {
  const text = value.trim();
  if (!text) return undefined;

  const hm = text.match(/(\d+)\s*H\s*(\d+)\s*M(?:\s*(\d+)\s*S)?/i);
  if (hm) {
    const hours = Number(hm[1] ?? 0);
    const minutes = Number(hm[2] ?? 0);
    const seconds = Number(hm[3] ?? 0);
    return ((hours * 60 + minutes) * 60 + seconds) * 1000;
  }

  const ms = text.match(/(\d+)\s*M(?:\s*(\d+)\s*S)?/i);
  if (ms) {
    const minutes = Number(ms[1] ?? 0);
    const seconds = Number(ms[2] ?? 0);
    return (minutes * 60 + seconds) * 1000;
  }

  const zh = text.match(/(\d+)\s*时\s*(\d+)\s*分(?:\s*(\d+)\s*秒)?/);
  if (zh) {
    const hours = Number(zh[1] ?? 0);
    const minutes = Number(zh[2] ?? 0);
    const seconds = Number(zh[3] ?? 0);
    return ((hours * 60 + minutes) * 60 + seconds) * 1000;
  }

  return undefined;
}


function pickReadableAddress(
  record: Record<string, unknown> | null,
  keys: string[],
  dynamicKeyPattern: RegExp
): string {
  if (!record) return "";

  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  for (const [key, value] of Object.entries(record)) {
    if (!dynamicKeyPattern.test(key)) continue;
    if (typeof value !== "string") continue;
    const text = value.trim();
    if (!text) continue;
    return text;
  }

  return "";
}

async function postGps51Action(
  action: string,
  username: string,
  password: string,
  body: Record<string, unknown>
): Promise<any> {
  const { token, serverid } = await getSession(username, password);
  const response = await fetch(
    `${BASE_URL}?action=${action}&token=${token}&serverid=${serverid}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
  return response.json();
}

function parseOnlineHoursFromStatus(record: Record<string, unknown>): number | null {
  const englishStatus = typeof record.strstatusen === "string" ? record.strstatusen : "";
  const chineseStatus = typeof record.strstatus === "string" ? record.strstatus : "";

  const englishMatch = englishStatus.match(/(\d+)\s*H(?:\s*(\d+)\s*M)?/i);
  if (englishMatch) {
    const hours = Number(englishMatch[1] ?? 0);
    const minutes = Number(englishMatch[2] ?? 0);
    if (Number.isFinite(hours) && Number.isFinite(minutes)) {
      return hours + minutes / 60;
    }
  }

  const chineseMatch = chineseStatus.match(/(\d+)\s*时(?:\s*(\d+)\s*分)?/);
  if (chineseMatch) {
    const hours = Number(chineseMatch[1] ?? 0);
    const minutes = Number(chineseMatch[2] ?? 0);
    if (Number.isFinite(hours) && Number.isFinite(minutes)) {
      return hours + minutes / 60;
    }
  }

  return null;
}

// Session storage
let session: GPS51Session | null = null;
let lastLoginTime: number | null = null;
const SESSION_DURATION = 23 * 60 * 60 * 1000; // 23 hours in ms

// Login and get token
export async function gps51Login(username: string, password: string): Promise<GPS51Session> {
  const hashedPassword = md5(password);

  const response = await fetch(`${BASE_URL}?action=login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "USER",
      from: "WEB",
      username,
      password: hashedPassword,
      browser: "Chrome",
    }),
  });

  const data = await response.json();
  logGPS51("login.response", data);

  if (data.status !== 0) {
    throw new Error(`GPS51 login failed: ${data.cause}`);
  }

  session = { token: data.token, serverid: parseServerId(data as Record<string, unknown>) };
  logGPS51("login.session", session);
  lastLoginTime = Date.now();
  return session;
}

// Auto re-login if session expired
async function getSession(username: string, password: string): Promise<GPS51Session> {
  const isExpired = !lastLoginTime || Date.now() - lastLoginTime > SESSION_DURATION;
  if (!session || isExpired) {
    await gps51Login(username, password);
  }
  return session!;
}

// Fetch last known position of the tracker
export async function fetchLastPosition(
  username: string,
  password: string
): Promise<GPS51Position | null> {
  const { token, serverid } = await getSession(username, password);

  const response = await fetch(
    `${BASE_URL}?action=lastposition&token=${token}&serverid=${serverid}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username,
        deviceids: [DEVICE_ID],
        lastquerypositiontime: 0,
      }),
    }
  );

  const data = await response.json();
  logGPS51("lastposition.response", data);

  if (data.status !== 0 || !data.records?.length) return null;

  const record = data.records[0];
  // GPS51 API field names vary — try known aliases in priority order
  const lat = record.callat ?? record.lat ?? record.latitude ?? record.silent ?? record.y ?? null;
  const lng = record.callon ?? record.lng ?? record.longitude ?? record.x ?? null;
  if (lat === null || lng === null) {
    console.warn("GPS51: could not find lat/lng in record", record);
    return null;
  }

  const statusHours = parseOnlineHoursFromStatus(record as Record<string, unknown>);

  // Fallback when duration is not present in status text.
  const accDurationMs = Number(record.accduration ?? 0);
  const durationHours = Number.isFinite(accDurationMs) && accDurationMs > 0
    ? accDurationMs / (1000 * 60 * 60)
    : 0;
  const onlineHours = statusHours ?? durationHours;

  const mappedPosition = {
    deviceid: record.deviceid,
    lat,
    lng,
    speed: record.speed,
    course: record.course,
    status: record.strstatus,
    devicetime: record.devicetime,
    moving: record.moving,
    exvoltage: record.exvoltage,
    onlineHours,
  };
  logGPS51("lastposition.record", record);
  logGPS51("lastposition.mapped", mappedPosition);

  return mappedPosition;
}

// Fetch history/route between two dates
export async function fetchRouteHistory(
  username: string,
  password: string,
  startDate: string,  // format: "yyyy-MM-dd"
  endDate: string     // format: "yyyy-MM-dd"
): Promise<GPS51HistoryPoint[]> {
  const { token, serverid } = await getSession(username, password);

  const response = await fetch(
    `${BASE_URL}?action=reportmileagedetail&token=${token}&serverid=${serverid}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deviceid: DEVICE_ID,
        startday: startDate,
        endday: endDate,
        offset: 8, // timezone offset, adjust if needed
      }),
    }
  );

  const data = await response.json();
  logGPS51("history.response", data);
  logGPS51("history.response.summary", {
    startDate,
    endDate,
    status: data?.status,
    recordCount: Array.isArray(data?.records) ? data.records.length : 0,
  });

  if (data.status !== 0 || !data.records?.length) return [];

  const getFirstDefined = (record: Record<string, unknown>, keys: string[]): unknown => {
    for (const key of keys) {
      const value = record[key];
      if (value !== undefined && value !== null && value !== "") {
        return value;
      }
    }
    return undefined;
  };

  const toNumber = (value: unknown): number | undefined => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : undefined;
  };

  const toTimestamp = (value: unknown): number | undefined => {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string" && value.trim()) {
      const asNumber = Number(value);
      if (Number.isFinite(asNumber)) {
        return asNumber;
      }
      const parsed = Date.parse(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
    return undefined;
  };

  // Map history records to lat/lng points
  const mappedHistory = data.records.map((r: any) => {
    const record = (r ?? {}) as Record<string, unknown>;

    return {
      lat: record.callat ?? record.lat ?? record.latitude ?? record.silent ?? record.y,
      lng: record.callon ?? record.lng ?? record.longitude ?? record.x,
      speed: record.speed,
      course: record.course,
      devicetime: record.devicetime,
      mileageKm: toNumber(getFirstDefined(record, ["mileage", "mile", "miles", "distance", "totaldistance", "allmile"])),
      maxSpeedKph: toNumber(getFirstDefined(record, ["maxspeed", "maxSpeed", "topspeed"])),
      avgSpeedKph: toNumber(getFirstDefined(record, ["avgspeed", "avgSpeed", "meanspeed"])),
      drivingMinutes: toNumber(getFirstDefined(record, ["drivingminute", "drivingminutes", "drivingtime", "runningtime", "drivetime"])),
      workingMinutes: toNumber(getFirstDefined(record, ["workminute", "workingminute", "workingtime", "accontime", "onlinetime"])),
      idleMinutes: toNumber(getFirstDefined(record, ["idletime", "parkingminute", "parkminute", "stopminute"])),
      startAddress: String(getFirstDefined(record, ["startaddress", "startaddr", "fromaddress", "fromaddr"]) ?? ""),
      endAddress: String(getFirstDefined(record, ["endaddress", "endaddr", "toaddress", "toaddr"]) ?? ""),
      startTime: toTimestamp(getFirstDefined(record, ["starttime", "begintime", "fromtime"])),
      endTime: toTimestamp(getFirstDefined(record, ["endtime", "stoptime", "totime"])),
      raw: record,
    };
  });
  logGPS51(
    "history.reportmileagedetail.debug",
    mappedHistory.map((point: GPS51HistoryPoint) => ({
      devicetime: point.devicetime,
      mileageKm: point.mileageKm ?? 0,
      maxSpeedKph: point.maxSpeedKph ?? 0,
      avgSpeedKph: point.avgSpeedKph ?? 0,
      drivingMinutes: point.drivingMinutes ?? 0,
      workingMinutes: point.workingMinutes ?? 0,
      idleMinutes: point.idleMinutes ?? 0,
      startTime: point.startTime,
      endTime: point.endTime,
      startAddress: point.startAddress,
      endAddress: point.endAddress,
      rawParkingFields: point.raw
        ? {
            idletime: point.raw.idletime,
            parkingminute: point.raw.parkingminute,
            parkminute: point.raw.parkminute,
            stopminute: point.raw.stopminute,
            workingtime: point.raw.workingtime,
            accontime: point.raw.accontime,
            onlinetime: point.raw.onlinetime,
          }
        : null,
    }))
  );
  logGPS51("history.mapped", mappedHistory);
  return mappedHistory;
}

export async function fetchDailyHistorySummary(
  username: string,
  password: string,
  day: string
): Promise<GPS51DailyHistorySummary | null> {
  const startTime = `${day} 00:00:00`;
  const endTime = `${day} 23:59:59`;

  const [tripsData, mileageData, tracksAdditionalData] = await Promise.all([
    postGps51Action("querytrips", username, password, {
      deviceid: DEVICE_ID,
      starttime: startTime,
      endtime: endTime,
      timezone: 8,
    }),
    postGps51Action("reportmileagedetail", username, password, {
      deviceid: DEVICE_ID,
      startday: day,
      endday: day,
      offset: 8,
    }),
    postGps51Action("querytrackswithadditionals", username, password, {
      deviceid: DEVICE_ID,
      starttime: startTime,
      endtime: endTime,
      timezone: 8,
    }),
  ]);

  logGPS51("daily.querytrips.response", tripsData);
  logGPS51("daily.reportmileagedetail.response", mileageData);
  logGPS51("daily.querytrackswithadditionals.response", tracksAdditionalData);

  if (tripsData?.status !== 0 && mileageData?.status !== 0 && tracksAdditionalData?.status !== 0) {
    return null;
  }

  const trips = Array.isArray(tripsData?.totaltrips) ? tripsData.totaltrips : [];
  const mileageRecords = Array.isArray(mileageData?.records) ? mileageData.records : [];
  const mileageRecord = mileageRecords.length ? mileageRecords[0] as Record<string, unknown> : null;
  logGPS51("daily.reportmileagedetail.record0", mileageRecord);

  const additionalTrackRecords = Array.isArray(tracksAdditionalData?.tracks)
    ? tracksAdditionalData.tracks
    : [];
  const additionalParkRecords = Array.isArray(tracksAdditionalData?.parks)
    ? tracksAdditionalData.parks
    : [];
  const parks = additionalParkRecords;
  const additionalDetailReport =
    tracksAdditionalData && typeof tracksAdditionalData.detailreport === "object"
      ? tracksAdditionalData.detailreport as Record<string, unknown>
      : null;
  const trackPoints: GPS51TrackPoint[] = additionalTrackRecords
    .map((record: Record<string, unknown>) => ({
      lat: Number(record.silent ?? record.callat ?? record.lat),
      lng: Number(record.callon ?? record.lng ?? record.lon),
      speed: toFiniteNumber(record.speed, 0),
      starttime: toOptionalTimestamp(record.starttime),
      endtime: toOptionalTimestamp(record.endtime),
      updatetime: toOptionalTimestamp(record.updatetime),
      raw: record,
    }))
    .filter((point: GPS51TrackPoint) => Number.isFinite(point.speed));

  logGPS51("daily.querytrackswithadditionals.record0", additionalTrackRecords[0]);
  logGPS51("daily.querytrackswithadditionals.park0", additionalParkRecords[0]);
  logGPS51("daily.querytrackswithadditionals.detailreport", additionalDetailReport);

  const starterMeters = mileageRecord ? toFiniteNumber(mileageRecord.starter, 0) : 0;
  const endDistanceMeters = mileageRecord ? toFiniteNumber(mileageRecord.enddis, 0) : 0;
  const totalDistanceFromEdges = endDistanceMeters - starterMeters;
  const totalDistanceFromRecord = mileageRecord ? toFiniteNumber(mileageRecord.totaldistance, 0) : 0;
  const mileageMeters =
    totalDistanceFromRecord !== 0
      ? totalDistanceFromRecord
      : (totalDistanceFromEdges !== 0
        ? totalDistanceFromEdges
        : toFiniteNumber(tripsData?.totaldistance, 0));

  const maxSpeedMps = toFiniteNumber(tripsData?.totalmaxspeed, 0);
  const avgSpeedMps = mileageRecord
    ? toFiniteNumber(mileageRecord.avgspeed, toFiniteNumber(tripsData?.totalaveragespeed, 0))
    : toFiniteNumber(tripsData?.totalaveragespeed, 0);

  const drivingMs = toFiniteNumber(
    tripsData?.totaltriptime,
    mileageRecord ? toFiniteNumber(mileageRecord.totalacc, 0) : 0
  );

  const hasCoreActivityEvidence =
    Math.abs(mileageMeters) > 0 ||
    Math.abs(maxSpeedMps) > 0 ||
    Math.abs(avgSpeedMps) > 0 ||
    drivingMs > 0 ||
    trips.length > 0 ||
    trackPoints.some((point) => point.speed > 0);

  const tripParkingMs = trips.reduce(
    (sum: number, trip: Record<string, unknown>) => sum + toFiniteNumber(trip?.parking, 0),
    0
  );
  const recordParkingMs = mileageRecord
    ? Math.max(
        0,
        toFiniteNumber(mileageRecord.parkingduration, 0),
        toFiniteNumber(mileageRecord.parkduration, 0),
        toFiniteNumber(mileageRecord.parkingtime, 0)
      )
    : 0;

  const additionalDetailParkingMs = additionalDetailReport
    ? Math.max(
        0,
        toFiniteNumber(additionalDetailReport.parkingduration, 0),
        toFiniteNumber(additionalDetailReport.parkduration, 0),
        toFiniteNumber(additionalDetailReport.parkingtime, 0),
        toFiniteNumber(additionalDetailReport.totalpark, 0)
      )
    : 0;

  const additionalParksParkingMs = additionalParkRecords.reduce(
    (sum: number, park: Record<string, unknown>) => {
      const explicitIdleDuration = toFiniteNumber(park.durationidle, 0);
      if (explicitIdleDuration > 0) {
        return sum + explicitIdleDuration;
      }

      // Use start/end span only when the day has real movement/activity evidence.
      // This avoids offline placeholder rows that span nearly the whole day.
      if (!hasCoreActivityEvidence) {
        return sum;
      }

      const start = toOptionalTimestamp(park.starttime);
      const end = toOptionalTimestamp(park.endtime);
      if (!Number.isFinite(Number(start)) || !Number.isFinite(Number(end))) {
        return sum;
      }

      const spanMs = Number(end) - Number(start);
      if (spanMs <= 0) {
        return sum;
      }

      // Ignore near full-day spans; these are usually boundary placeholders, not real park sessions.
      if (spanMs >= 23 * 60 * 60 * 1000) {
        return sum;
      }

      return sum + spanMs;
    },
    0
  );

  const parkingText = mileageRecord
    ? String(
        mileageRecord.parkingdurationstr ??
        mileageRecord.parkdurationstr ??
        mileageRecord.parkingstr ??
        mileageRecord.parkstr ??
        mileageRecord.parkingdurationtext ??
        ""
      ).trim()
    : "";

  const additionalParkingText = additionalDetailReport
    ? String(
        additionalDetailReport.parkingdurationstr ??
        additionalDetailReport.parkdurationstr ??
        additionalDetailReport.parkingstr ??
        additionalDetailReport.parkstr ??
        ""
      ).trim()
    : "";

  const parsedParkingTextMs = parkingText ? parseDurationTextToMs(parkingText) ?? 0 : 0;
  const parsedAdditionalParkingTextMs = additionalParkingText
    ? parseDurationTextToMs(additionalParkingText) ?? 0
    : 0;

  const dynamicParkingTextMs = mileageRecord
    ? Object.entries(mileageRecord)
      .filter(([key, value]) =>
        /(park|idle)/i.test(key) &&
        /(str|text|duration)/i.test(key) &&
        typeof value === "string"
      )
      .map(([, value]) => parseDurationTextToMs(String(value)))
      .find((value) => Number.isFinite(value ?? NaN) && Number(value) > 0) ?? 0
    : 0;

  const resolvedParkingMs = Math.max(
    tripParkingMs,
    recordParkingMs,
    additionalDetailParkingMs,
    additionalParksParkingMs,
    parsedParkingTextMs,
    parsedAdditionalParkingTextMs,
    dynamicParkingTextMs
  );

  const parkIdleMs = parks.reduce(
    (sum: number, park: Record<string, unknown>) => sum + toFiniteNumber(park?.durationidle, 0),
    0
  );
  const recordIdleMs = mileageRecord
    ? Math.max(
        0,
        toFiniteNumber(mileageRecord.totalidle, 0),
        toFiniteNumber(mileageRecord.idleduration, 0),
        toFiniteNumber(mileageRecord.idletime, 0)
      )
    : 0;
  const idleMs = Math.max(recordIdleMs, parkIdleMs);

  const firstTrackTime = trackPoints.length
    ? trackPoints.reduce(
        (min, point) => Math.min(min, point.starttime ?? point.updatetime ?? Number.MAX_SAFE_INTEGER),
        Number.MAX_SAFE_INTEGER
      )
    : Number.MAX_SAFE_INTEGER;
  const lastTrackTime = trackPoints.length
    ? trackPoints.reduce(
        (max, point) => Math.max(max, point.endtime ?? point.updatetime ?? 0),
        0
      )
    : 0;
  const trackTotalMs =
    firstTrackTime !== Number.MAX_SAFE_INTEGER && lastTrackTime > firstTrackTime
      ? lastTrackTime - firstTrackTime
      : 0;

  const movingTrackCount = trackPoints.filter((point) => point.speed > 0).length;
  const inferredDrivingMs =
    drivingMs > 0
      ? drivingMs
      : (trackTotalMs > 0 && movingTrackCount > 0)
        ? Math.round(trackTotalMs * (movingTrackCount / trackPoints.length))
        : 0;
  const inferredIdleMs = idleMs;
  const workingMs = drivingMs > 0 || idleMs > 0
    ? drivingMs + idleMs
    : toFiniteNumber(mileageRecord?.totalacc, 0);

  const maxTrackSpeed = trackPoints.reduce((max, point) => Math.max(max, point.speed), 0);
  const avgTrackSpeed = trackPoints.length
    ? trackPoints.reduce((sum, point) => sum + point.speed, 0) / trackPoints.length
    : 0;

  const resolvedMaxSpeed = maxSpeedMps !== 0 ? maxSpeedMps : maxTrackSpeed;
  const resolvedAvgSpeed = avgSpeedMps !== 0 ? avgSpeedMps : avgTrackSpeed;

  const tripStartTime = trips.length
    ? trips.reduce(
        (min: number, trip: Record<string, unknown>) => Math.min(min, toFiniteNumber(trip?.starttime, Number.MAX_SAFE_INTEGER)),
        Number.MAX_SAFE_INTEGER
      )
    : Number.MAX_SAFE_INTEGER;
  const tripEndTime = trips.length
    ? trips.reduce(
        (max: number, trip: Record<string, unknown>) => Math.max(max, toFiniteNumber(trip?.endtime, 0)),
        0
      )
    : 0;

  const firstPark = parks.length ? parks[0] : null;
  const lastPark = parks.length ? parks[parks.length - 1] : null;

  const startTimeValue = mileageRecord
    ? toOptionalTimestamp(mileageRecord.starttime) ?? (
        tripStartTime !== Number.MAX_SAFE_INTEGER
          ? tripStartTime
          : (firstTrackTime !== Number.MAX_SAFE_INTEGER
            ? firstTrackTime
            : toOptionalTimestamp(firstPark?.starttime))
      )
    : (tripStartTime !== Number.MAX_SAFE_INTEGER
      ? tripStartTime
      : (firstTrackTime !== Number.MAX_SAFE_INTEGER
        ? firstTrackTime
        : toOptionalTimestamp(firstPark?.starttime)));

  const endTimeValue = mileageRecord
    ? toOptionalTimestamp(mileageRecord.endtime) ?? (
        tripEndTime > 0
          ? tripEndTime
          : (lastTrackTime > 0 ? lastTrackTime : toOptionalTimestamp(lastPark?.endtime))
      )
    : (tripEndTime > 0
      ? tripEndTime
      : (lastTrackTime > 0 ? lastTrackTime : toOptionalTimestamp(lastPark?.endtime)));

  const firstTrackRaw = trackPoints.find((point) => point.raw)?.raw ?? null;
  const lastTrackRaw = [...trackPoints].reverse().find((point) => point.raw)?.raw ?? null;
  const firstAdditionalRaw = additionalParkRecords.length
    ? (additionalParkRecords[0] as Record<string, unknown>)
    : additionalTrackRecords.length
      ? (additionalTrackRecords[0] as Record<string, unknown>)
      : null;
  const lastAdditionalRaw = additionalParkRecords.length
    ? (additionalParkRecords[additionalParkRecords.length - 1] as Record<string, unknown>)
    : additionalTrackRecords.length
      ? (additionalTrackRecords[additionalTrackRecords.length - 1] as Record<string, unknown>)
      : null;

  const startAddress = pickReadableAddress(
    mileageRecord,
    [
      "startaddress",
      "startadd",
      "startaddr",
      "fromaddress",
      "fromaddr",
      "begaddress",
      "beginaddress",
    ],
    /(start|from|begin|beg).*(address|addr|add)/i
  ) || pickReadableAddress(
    firstAdditionalRaw,
    [
      "address",
      "straddress",
      "addr",
      "positionaddress",
      "location",
      "startaddress",
      "from",
      "fromaddress",
    ],
    /(start|from|address|addr|location)/i
  ) || pickReadableAddress(
    firstTrackRaw,
    [
      "address",
      "straddress",
      "addr",
      "positionaddress",
      "location",
    ],
    /(address|addr|location)/i
  ) || (typeof firstPark?.address === "string" ? firstPark.address : "");

  const endAddress = pickReadableAddress(
    mileageRecord,
    [
      "endaddress",
      "endadd",
      "endaddr",
      "toaddress",
      "toaddr",
      "stopaddress",
    ],
    /(end|to|stop).*(address|addr|add)/i
  ) || pickReadableAddress(
    lastAdditionalRaw,
    [
      "address",
      "straddress",
      "addr",
      "positionaddress",
      "location",
      "endaddress",
      "to",
      "toaddress",
      "stopaddress",
    ],
    /(end|to|stop|address|addr|location)/i
  ) || pickReadableAddress(
    lastTrackRaw,
    [
      "address",
      "straddress",
      "addr",
      "positionaddress",
      "location",
    ],
    /(address|addr|location)/i
  ) || (typeof lastPark?.address === "string" ? lastPark.address : "");

  const resolvedStartAddress = String(startAddress).trim();
  const resolvedEndAddress = String(endAddress).trim();

  // Extract coordinates for address fallback when API returns null addresses
  const coordLatKeys = ["callat", "silent", "lat", "latitude"];
  const coordLngKeys = ["callon", "lng", "lon", "longitude"];
  const pickCoordNum = (rec: Record<string, unknown> | null, keys: string[]): number | undefined => {
    if (!rec) return undefined;
    for (const key of keys) {
      const v = Number(rec[key]);
      if (Number.isFinite(v) && v !== 0) return v;
    }
    return undefined;
  };
  const startLat = pickCoordNum(firstAdditionalRaw, coordLatKeys) ?? pickCoordNum(firstTrackRaw, coordLatKeys);
  const startLng = pickCoordNum(firstAdditionalRaw, coordLngKeys) ?? pickCoordNum(firstTrackRaw, coordLngKeys);
  const endLat = pickCoordNum(lastAdditionalRaw, coordLatKeys) ?? pickCoordNum(lastTrackRaw, coordLatKeys);
  const endLng = pickCoordNum(lastAdditionalRaw, coordLngKeys) ?? pickCoordNum(lastTrackRaw, coordLngKeys);

  const hasExplicitTelemetryEvidence =
    Math.abs(mileageMeters) > 0 ||
    Math.abs(resolvedMaxSpeed) > 0 ||
    Math.abs(resolvedAvgSpeed) > 0 ||
    inferredDrivingMs > 0 ||
    toFiniteNumber(mileageRecord?.totalacc, 0) > 0 ||
    toFiniteNumber(mileageRecord?.totalidle, 0) > 0 ||
    tripParkingMs > 0 ||
    recordParkingMs > 0 ||
    additionalDetailParkingMs > 0 ||
    parkIdleMs > 0 ||
    trackPoints.some((point) => point.speed > 0);

  if (!hasExplicitTelemetryEvidence) {
    return null;
  }

  const hasPresenceEvidence =
    trips.length > 0 ||
    additionalTrackRecords.length > 0 ||
    additionalParkRecords.length > 0;
  const hasMovementEvidence =
    Math.abs(mileageMeters) > 0 ||
    Math.abs(resolvedMaxSpeed) > 0 ||
    Math.abs(resolvedAvgSpeed) > 0 ||
    inferredDrivingMs > 0;
  const hasSupportedStationaryEvidence =
    hasPresenceEvidence && (workingMs > 0 || inferredIdleMs > 0 || resolvedParkingMs > 0);

  const hasSummaryData = hasMovementEvidence || hasSupportedStationaryEvidence;

  if (!hasSummaryData) {
    return null;
  }

  const finalStartAddress = resolvedStartAddress || (
    startLat !== undefined && startLng !== undefined
      ? await reverseGeocode(startLat, startLng)
      : ""
  );
  const finalEndAddress = resolvedEndAddress || (
    endLat !== undefined && endLng !== undefined
      ? await reverseGeocode(endLat, endLng)
      : ""
  );

  return {
    mileageMeters,
    maxSpeedMps: resolvedMaxSpeed,
    avgSpeedMps: resolvedAvgSpeed,
    drivingMs: inferredDrivingMs,
    workingMs,
    idleMs: inferredIdleMs,
    parkingMs: resolvedParkingMs,
    parkingText: parkingText || additionalParkingText,
    startTime: startTimeValue,
    endTime: endTimeValue,
    startAddress: finalStartAddress,
    endAddress: finalEndAddress,
    startLat,
    startLng,
    endLat,
    endLng,
  };
}
