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

  session = { token: data.token, serverid: data.servers };
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

  if (data.status !== 0 || !data.records?.length) return [];

  // Map history records to lat/lng points
  const mappedHistory = data.records.map((r: any) => ({
    lat: r.callat ?? r.lat ?? r.latitude ?? r.silent ?? r.y,
    lng: r.callon ?? r.lng ?? r.longitude ?? r.x,
    speed: r.speed,
    course: r.course,
    devicetime: r.devicetime,
  }));
  logGPS51("history.mapped", mappedHistory);
  return mappedHistory;
}
