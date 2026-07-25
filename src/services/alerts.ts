import type { Hazard } from '../types/domain';
import type { LatLng } from './geolocation';

// ─────────────────────────────────────────────────────────────────────────────
// Live hazard discovery.
//
// Every source here is a public feed that sends `Access-Control-Allow-Origin: *`,
// so the browser can read it directly — no backend, no proxy, no API key:
//
//   JMA quake   https://www.jma.go.jp/bosai/quake/data/list.json
//   JMA tsunami https://www.jma.go.jp/bosai/tsunami/data/list.json
//   JMA typhoon https://www.jma.go.jp/bosai/typhoon/data/{targetTc,<id>/…}.json
//   USGS        https://earthquake.usgs.gov/fdsnws/event/1/query  (worldwide)
//
// JMA is authoritative for Japan and carries observed 震度 (shindo) plus, for
// typhoons, the actual published gale/storm warning radii. USGS covers the rest
// of the world and adds ShakeMap/PAGER figures. Nothing here is simulated.
// ─────────────────────────────────────────────────────────────────────────────

/** One forecast position for a tropical cyclone, with its warning extents. */
export interface TyphoonStep {
  hoursAhead: number;
  center: LatLng;
  /** Radius of the gale (>=15 m/s) warning area, metres. */
  galeRadiusM: number | null;
  /** Radius of the storm (>=25 m/s) warning area, metres. */
  stormRadiusM: number | null;
  /** Forecast-position uncertainty ("probability circle"), metres. */
  uncertaintyRadiusM: number | null;
  validTime: string | null;
}

export interface LiveHazard {
  id: string;
  hazard: Hazard;
  source: string;
  headline: string;
  bulletinJa?: string;
  bulletinEn?: string;
  /** ISO timestamp of the event / bulletin issue. */
  occurredAt: string;
  epicenter: LatLng | null;
  magnitude?: number;
  depthKm?: number;
  /** JMA maximum observed intensity (shindo), e.g. "5-", "6+". */
  observedShindo?: string;
  /** USGS ShakeMap maximum instrumental intensity (MMI). */
  usgsMmi?: number;
  /** USGS PAGER alert level: green | yellow | orange | red. */
  usgsAlert?: string;
  /** Number of USGS "did you feel it" reports. */
  feltReports?: number;
  tsunamiFlag?: boolean;
  tsunamiKind?: { codes: string[]; text: string };
  typhoon?: {
    name: string;
    nameJa?: string;
    categoryEn: string;
    sustainedMs?: number;
    gustMs?: number;
    steps: TyphoonStep[];
  };
}

const JMA_QUAKE = 'https://www.jma.go.jp/bosai/quake/data/list.json';
const JMA_TSUNAMI = 'https://www.jma.go.jp/bosai/tsunami/data/list.json';
const JMA_TYPHOON_TARGETS = 'https://www.jma.go.jp/bosai/typhoon/data/targetTc.json';
const JMA_TYPHOON_DIR = 'https://www.jma.go.jp/bosai/typhoon/data';
const USGS_QUERY = 'https://earthquake.usgs.gov/fdsnws/event/1/query';

/** How far out to look for quakes. Impact assessment does the real filtering. */
const QUAKE_SEARCH_RADIUS_KM = 2000;
const QUAKE_SEARCH_WINDOW_HOURS = 24;
const QUAKE_SEARCH_MIN_MAG = 3.0;
/** Cap concurrent cyclone detail fetches — usually 1-2 are active. */
const MAX_TYPHOONS = 3;

async function getJson<T>(url: string, timeoutMs = 7000): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { cache: 'no-store', signal: controller.signal });
    if (!res.ok) {
      console.warn(`[alerts] ${res.status} from ${url}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.warn(`[alerts] fetch failed: ${url}`, err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ── JMA shared helpers ───────────────────────────────────────────────────────

/**
 * JMA packs hypocentres into one string: "+34.5+139.4-10000/" is
 * lat +34.5, lon +139.4, depth -10000 m (negative = below sea level).
 */
export function parseJmaCod(cod?: string): { pos: LatLng; depthKm: number | null } | null {
  if (!cod) return null;
  const m = /^([+-][\d.]+)([+-][\d.]+)([+-][\d.]+)?/.exec(cod.trim());
  if (!m) return null;
  const lat = parseFloat(m[1]);
  const lng = parseFloat(m[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const depthM = m[3] !== undefined ? parseFloat(m[3]) : NaN;
  return {
    pos: { lat, lng },
    depthKm: Number.isFinite(depthM) ? Math.abs(depthM) / 1000 : null
  };
}

interface JmaQuakeEntry {
  eid?: string; ctt?: string; ttl?: string; at?: string; rdt?: string;
  anm?: string; en_anm?: string; cod?: string; mag?: string; maxi?: string;
}

async function fetchJmaQuakes(): Promise<LiveHazard[]> {
  const list = await getJson<JmaQuakeEntry[]>(JMA_QUAKE);
  if (!Array.isArray(list)) return [];

  // JMA republishes the same event as successive reports; keep the newest per eid.
  const newestByEvent = new Map<string, JmaQuakeEntry>();
  for (const entry of list) {
    const key = entry.eid || `${entry.at}|${entry.anm}`;
    const seen = newestByEvent.get(key);
    if (!seen || (entry.ctt ?? '') > (seen.ctt ?? '')) newestByEvent.set(key, entry);
  }

  // JMA's list reaches back about a month. USGS is already time-filtered by the
  // query, so trim JMA to the same window — otherwise a scan returns 150 events,
  // nearly all of them weeks old.
  const oldestAllowed = Date.now() - QUAKE_SEARCH_WINDOW_HOURS * 3600_000;

  return [...newestByEvent.values()].flatMap((entry) => {
    const when = entry.at || entry.rdt;
    if (!when) return [];
    const t = Date.parse(when);
    if (!Number.isFinite(t) || t < oldestAllowed) return [];
    const geo = parseJmaCod(entry.cod);
    const mag = entry.mag ? parseFloat(entry.mag) : undefined;
    const place = entry.en_anm || entry.anm || 'unknown epicentre';
    const shindo = entry.maxi || undefined;
    return [{
      id: `jma-quake-${entry.eid ?? when}`,
      hazard: 'earthquake' as Hazard,
      source: 'JMA (気象庁) earthquake feed',
      headline: `M${entry.mag ?? '?.?'} earthquake near ${place}${shindo ? `, max JMA intensity ${shindo}` : ''}`,
      bulletinJa: `${entry.ttl ?? '地震情報'}：${entry.anm ?? ''}付近でマグニチュード${entry.mag ?? '?.?'}の地震。最大震度${shindo ?? '不明'}。`,
      bulletinEn: `${entry.ttl ?? 'Earthquake'} near ${place}. Magnitude ${entry.mag ?? '?.?'}, max JMA intensity ${shindo ?? 'N/A'}.`,
      occurredAt: new Date(when).toISOString(),
      epicenter: geo?.pos ?? null,
      magnitude: Number.isFinite(mag as number) ? mag : undefined,
      depthKm: geo?.depthKm ?? undefined,
      observedShindo: shindo
    }];
  });
}

// ── USGS (worldwide) ─────────────────────────────────────────────────────────

interface UsgsFeature {
  id?: string;
  properties?: {
    mag?: number; place?: string; time?: number; tsunami?: number;
    mmi?: number; cdi?: number; alert?: string; felt?: number; title?: string;
  };
  geometry?: { coordinates?: [number, number, number] };
}

async function fetchUsgsQuakes(pos: LatLng): Promise<LiveHazard[]> {
  const start = new Date(Date.now() - QUAKE_SEARCH_WINDOW_HOURS * 3600_000)
    .toISOString().slice(0, 19);
  const url =
    `${USGS_QUERY}?format=geojson&starttime=${start}` +
    `&latitude=${pos.lat.toFixed(4)}&longitude=${pos.lng.toFixed(4)}` +
    `&maxradiuskm=${QUAKE_SEARCH_RADIUS_KM}&minmagnitude=${QUAKE_SEARCH_MIN_MAG}` +
    `&orderby=time`;

  const data = await getJson<{ features?: UsgsFeature[] }>(url);
  if (!data?.features?.length) return [];

  return data.features.flatMap((f) => {
    const p = f.properties ?? {};
    const coords = f.geometry?.coordinates;
    if (!p.time) return [];
    return [{
      id: `usgs-${f.id ?? p.time}`,
      hazard: 'earthquake' as Hazard,
      source: 'USGS earthquake catalog',
      headline: p.title || `M${p.mag ?? '?.?'} earthquake — ${p.place ?? 'unknown location'}`,
      bulletinEn: `M${p.mag ?? '?.?'} ${p.place ?? ''}. ${p.mmi ? `ShakeMap max intensity MMI ${p.mmi}. ` : ''}${p.alert ? `PAGER alert: ${p.alert}.` : ''}`.trim(),
      occurredAt: new Date(p.time).toISOString(),
      epicenter: coords ? { lat: coords[1], lng: coords[0] } : null,
      magnitude: typeof p.mag === 'number' ? p.mag : undefined,
      depthKm: coords && Number.isFinite(coords[2]) ? coords[2] : undefined,
      usgsMmi: typeof p.mmi === 'number' ? p.mmi : undefined,
      usgsAlert: p.alert || undefined,
      feltReports: typeof p.felt === 'number' ? p.felt : undefined,
      tsunamiFlag: p.tsunami === 1
    }];
  });
}

// ── JMA tsunami ──────────────────────────────────────────────────────────────

interface JmaTsunamiEntry {
  eid?: string; ctt?: string; ttl?: string; at?: string; rdt?: string;
  anm?: string; en_anm?: string; cod?: string; mag?: string;
  kind?: { code?: string; kind?: string }[];
}

async function fetchJmaTsunami(): Promise<LiveHazard[]> {
  const list = await getJson<JmaTsunamiEntry[]>(JMA_TSUNAMI);
  if (!Array.isArray(list) || !list.length) return [];

  return list.flatMap((entry) => {
    const when = entry.rdt || entry.at;
    if (!when) return [];
    const geo = parseJmaCod(entry.cod);
    const codes = (entry.kind ?? []).map((k) => k.code ?? '').filter(Boolean);
    const text = (entry.kind ?? []).map((k) => k.kind ?? '').filter(Boolean).join(' / ');
    const place = entry.en_anm || entry.anm || 'unknown source region';
    return [{
      id: `jma-tsunami-${entry.eid ?? when}`,
      hazard: 'tsunami' as Hazard,
      source: 'JMA (気象庁) tsunami feed',
      headline: `${text || 'Tsunami information'} — source region ${place}`,
      bulletinJa: `${entry.ttl ?? '津波情報'}：${entry.anm ?? ''}。${text}`,
      bulletinEn: `${entry.ttl ?? 'Tsunami information'} for the ${place} source region. ${text}`,
      occurredAt: new Date(when).toISOString(),
      epicenter: geo?.pos ?? null,
      magnitude: entry.mag ? parseFloat(entry.mag) : undefined,
      tsunamiKind: { codes, text }
    }];
  });
}

// ── JMA typhoon ──────────────────────────────────────────────────────────────

interface JmaTyphoonTarget { tropicalCyclone?: string; typhoonNumber?: string; category?: string; issue?: string; }

/** Pull the largest radius out of a stormWarningArea `arc` structure. */
function maxArcRadius(area: any): number | null {
  const arcs = area?.arc;
  if (!Array.isArray(arcs)) return null;
  let best: number | null = null;
  for (const arc of arcs) {
    const r = Array.isArray(arc) ? Number(arc[1]) : NaN;
    if (Number.isFinite(r) && (best === null || r > best)) best = r;
  }
  return best;
}

const toLatLngPair = (v: any): LatLng | null =>
  Array.isArray(v) && Number.isFinite(Number(v[0])) && Number.isFinite(Number(v[1]))
    ? { lat: Number(v[0]), lng: Number(v[1]) }
    : null;

async function fetchJmaTyphoons(): Promise<LiveHazard[]> {
  const targets = await getJson<JmaTyphoonTarget[]>(JMA_TYPHOON_TARGETS);
  if (!Array.isArray(targets) || !targets.length) return [];

  const results = await Promise.all(
    targets.slice(0, MAX_TYPHOONS).map(async (t) => {
      const tc = t.tropicalCyclone;
      if (!tc) return null;
      const [specs, forecast] = await Promise.all([
        getJson<any[]>(`${JMA_TYPHOON_DIR}/${tc}/specifications.json`),
        getJson<any[]>(`${JMA_TYPHOON_DIR}/${tc}/forecast.json`)
      ]);
      if (!Array.isArray(forecast)) return null;

      const title = Array.isArray(specs) ? specs.find((p) => p?.part === 'title') : null;
      const analysis = Array.isArray(specs)
        ? specs.find((p) => p?.part?.en === 'Analysis' || p?.part === 'Analysis')
        : null;

      // The Analysis entry is the only one carrying the gale-warning radius, so
      // it is carried forward as the storm's extent for later forecast steps.
      const fcAnalysis = forecast.find((p) => p?.advancedHours === 0);
      const baseGale = Number(fcAnalysis?.galeWarningArea?.radius);
      const carriedGale = Number.isFinite(baseGale) ? baseGale : null;

      const steps: TyphoonStep[] = forecast.flatMap((part) => {
        const center = toLatLngPair(part?.center);
        if (!center) return [];
        const gale = Number(part?.galeWarningArea?.radius);
        return [{
          hoursAhead: Number.isFinite(Number(part?.advancedHours)) ? Number(part.advancedHours) : 0,
          center,
          galeRadiusM: Number.isFinite(gale) ? gale : carriedGale,
          stormRadiusM: maxArcRadius(part?.stormWarningArea),
          uncertaintyRadiusM: Number.isFinite(Number(part?.probabilityCircle?.radius))
            ? Number(part.probabilityCircle.radius)
            : null,
          validTime: part?.validtime?.UTC ?? null
        }];
      }).sort((a, b) => a.hoursAhead - b.hoursAhead);

      if (!steps.length) return null;

      const nameEn = title?.name?.en || t.typhoonNumber || tc;
      const nameJa = title?.name?.jp;
      const categoryEn = title?.category?.en || t.category || 'TC';
      const sustained = Number(analysis?.maximumWind?.sustained?.['m/s']);
      const gust = Number(analysis?.maximumWind?.gust?.['m/s']);
      const issued = t.issue || title?.issue?.UTC || new Date().toISOString();

      return {
        id: `jma-typhoon-${tc}`,
        hazard: 'typhoon' as Hazard,
        source: 'JMA (気象庁) tropical cyclone feed',
        headline: `${categoryEn} ${nameEn}${t.typhoonNumber ? ` (T${t.typhoonNumber})` : ''}` +
          `${Number.isFinite(sustained) ? `, sustained ${sustained} m/s` : ''}`,
        bulletinJa: `${nameJa ? `台風「${nameJa}」` : '台風'}。中心気圧付近の最大風速${Number.isFinite(sustained) ? `${sustained}m/s` : '不明'}、最大瞬間風速${Number.isFinite(gust) ? `${gust}m/s` : '不明'}。`,
        bulletinEn: `${categoryEn} ${nameEn} — sustained winds ${Number.isFinite(sustained) ? `${sustained} m/s` : 'unknown'}, gusts ${Number.isFinite(gust) ? `${gust} m/s` : 'unknown'}.`,
        occurredAt: new Date(issued).toISOString(),
        epicenter: steps[0].center,
        typhoon: {
          name: nameEn,
          nameJa,
          categoryEn,
          sustainedMs: Number.isFinite(sustained) ? sustained : undefined,
          gustMs: Number.isFinite(gust) ? gust : undefined,
          steps
        }
      } as LiveHazard;
    })
  );

  return results.filter((r): r is LiveHazard => r !== null);
}

// ── Public entry point ───────────────────────────────────────────────────────

export interface HazardScan {
  hazards: LiveHazard[];
  /** Feeds that answered, for provenance in the UI. */
  sourcesQueried: string[];
  sourcesFailed: string[];
  scannedAt: string;
}

/**
 * Query every feed at once and return whatever came back. One dead feed never
 * blocks the others — a scan that reaches no source at all returns an empty
 * hazard list, which the caller must treat as "unknown", not as "all clear".
 */
export async function scanForHazards(pos: LatLng): Promise<HazardScan> {
  const jobs: { name: string; run: () => Promise<LiveHazard[]> }[] = [
    { name: 'JMA earthquakes', run: fetchJmaQuakes },
    { name: 'USGS earthquakes', run: () => fetchUsgsQuakes(pos) },
    { name: 'JMA tsunami', run: fetchJmaTsunami },
    { name: 'JMA typhoons', run: fetchJmaTyphoons }
  ];

  const settled = await Promise.allSettled(jobs.map((j) => j.run()));

  const hazards: LiveHazard[] = [];
  const sourcesQueried: string[] = [];
  const sourcesFailed: string[] = [];

  settled.forEach((result, i) => {
    const name = jobs[i].name;
    if (result.status === 'fulfilled') {
      sourcesQueried.push(name);
      hazards.push(...result.value);
    } else {
      sourcesFailed.push(name);
      console.warn(`[alerts] ${name} rejected`, result.reason);
    }
  });

  return {
    hazards: dedupeQuakes(hazards),
    sourcesQueried,
    sourcesFailed,
    scannedAt: new Date().toISOString()
  };
}

/**
 * JMA and USGS both report the same Japanese quakes. Treat two events as one
 * when they are within 3 minutes and ~120 km of each other, preferring the JMA
 * record because it carries observed shindo.
 */
function dedupeQuakes(hazards: LiveHazard[]): LiveHazard[] {
  const quakes = hazards.filter((h) => h.hazard === 'earthquake');
  const others = hazards.filter((h) => h.hazard !== 'earthquake');
  const kept: LiveHazard[] = [];

  const jmaFirst = (h: LiveHazard) => Number(h.source.startsWith('JMA'));
  for (const q of quakes.sort((a, b) => jmaFirst(b) - jmaFirst(a))) {
    const dup = kept.find((k) => {
      const dt = Math.abs(Date.parse(k.occurredAt) - Date.parse(q.occurredAt));
      if (!Number.isFinite(dt) || dt > 3 * 60_000) return false;
      if (!k.epicenter || !q.epicenter) return true;
      return roughKm(k.epicenter, q.epicenter) < 120;
    });
    if (dup) {
      // Fold in anything the duplicate knows that the kept record doesn't.
      dup.usgsMmi ??= q.usgsMmi;
      dup.usgsAlert ??= q.usgsAlert;
      dup.feltReports ??= q.feltReports;
      dup.observedShindo ??= q.observedShindo;
      dup.tsunamiFlag ||= q.tsunamiFlag;
      continue;
    }
    kept.push(q);
  }
  return [...kept, ...others];
}

const roughKm = (a: LatLng, b: LatLng): number => {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
};
