import type { Hazard } from '../types/domain';
import type { LatLng } from './geolocation';
import { hazardInfo } from '../constants/hazards';

// ─────────────────────────────────────────────────────────────────────────────
// Official designated evacuation sites (指定緊急避難場所) from Japan's
// Geospatial Information Authority, served as GeoJSON tiles:
//
//   https://cyberjapandata.gsi.go.jp/xyz/skhb{01..08}/10/{x}/{y}.geojson
//
// Sends Access-Control-Allow-Origin: *, so this works client-side with no key
// and no backend, exactly like the JMA feeds.
//
// Two things make this strictly better than guessing from Google Places types:
//   1. Every site is certified by its municipality for specific hazards, so the
//      shelter set genuinely changes per disaster.
//   2. Granularity is per building — "Honcho Elementary School Gymnasium" is a
//      separate record from "school building 17", because which one you enter
//      matters.
//
// Japan only. Outside coverage the tiles 404 and this returns an empty list, so
// callers must treat "no official data" as a distinct case from "no shelters".
// ─────────────────────────────────────────────────────────────────────────────

/** GSI serves these layers at exactly this zoom. */
const GSI_ZOOM = 10;
const GSI_BASE = 'https://cyberjapandata.gsi.go.jp/xyz';

export interface DesignatedShelter {
  id: string;
  name: string;
  address: string;
  remarks: string;
  lat: number;
  lng: number;
  /** Hazard numbers (1–8) this site is certified for, from the disasterN flags. */
  certifiedFor: number[];
  /** Which layer(s) it was found under. */
  layers: string[];
  source: string;
}

export interface ShelterLookup {
  shelters: DesignatedShelter[];
  /** False when GSI has no coverage here (outside Japan) or every tile failed. */
  official: boolean;
  layersQueried: string[];
  /** Tiles that returned nothing, for diagnostics. */
  tilesMissing: number;
}

interface TileKey { z: number; x: number; y: number; }

export function tileForPosition(pos: LatLng, z = GSI_ZOOM): TileKey {
  const n = 2 ** z;
  const x = Math.floor(((pos.lng + 180) / 360) * n);
  const latRad = (pos.lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
  );
  return { z, x, y };
}

// A zoom-10 tile is roughly 30 km wide, so a user near an edge would otherwise
// miss closer sites just across the boundary. Fetching the 3×3 neighbourhood
// costs a few cached requests and removes the edge case entirely.
function tileNeighbourhood(centre: TileKey): TileKey[] {
  const span = 2 ** centre.z;
  const out: TileKey[] = [];
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const y = centre.y + dy;
      if (y < 0 || y >= span) continue;
      out.push({ z: centre.z, x: (centre.x + dx + span) % span, y });
    }
  }
  return out;
}

// Tiles are ~200 KB and immutable in practice, so never fetch one twice a session.
const tileCache = new Map<string, DesignatedShelter[] | null>();

async function fetchTile(layer: string, t: TileKey): Promise<DesignatedShelter[] | null> {
  const key = `${layer}/${t.z}/${t.x}/${t.y}`;
  const cached = tileCache.get(key);
  if (cached !== undefined) return cached;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`${GSI_BASE}/${key}.geojson`, { signal: controller.signal });
    if (!res.ok) {
      // 404 simply means "no designated sites in this tile" (or outside Japan).
      tileCache.set(key, null);
      return null;
    }
    const geo = await res.json();
    const shelters: DesignatedShelter[] = (geo?.features ?? []).flatMap((f: any) => {
      const c = f?.geometry?.coordinates;
      if (!Array.isArray(c) || !Number.isFinite(c[0]) || !Number.isFinite(c[1])) return [];
      const p = f.properties ?? {};
      const certifiedFor: number[] = [];
      for (let i = 1; i <= 8; i++) if (p[`disaster${i}`]) certifiedFor.push(i);
      const name = p.name ?? '(unnamed site)';
      return [{
        // GSI features carry no stable id, so key on layer-independent identity.
        id: `gsi:${name}@${c[1].toFixed(5)},${c[0].toFixed(5)}`,
        name,
        address: p.address ?? '',
        remarks: p.remarks ?? '',
        lat: c[1],
        lng: c[0],
        certifiedFor,
        layers: [layer],
        source: 'GSI 指定緊急避難場所 (Geospatial Information Authority of Japan)'
      }];
    });
    tileCache.set(key, shelters);
    return shelters;
  } catch (err) {
    console.warn(`[shelters] tile ${key} failed`, err);
    tileCache.set(key, null);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Designated sites certified for `hazard` near `pos`. Returns `official: false`
 * when GSI has no coverage, which the caller must surface rather than silently
 * falling back to guesses.
 */
export async function fetchDesignatedShelters(pos: LatLng, hazard: Hazard): Promise<ShelterLookup> {
  const layers = hazardInfo(hazard).gsiLayers;
  if (!layers.length) {
    return { shelters: [], official: false, layersQueried: [], tilesMissing: 0 };
  }

  const tiles = tileNeighbourhood(tileForPosition(pos));
  const jobs = layers.flatMap((layer) => tiles.map((t) => fetchTile(layer, t)));
  const results = await Promise.all(jobs);

  const tilesMissing = results.filter((r) => r === null).length;
  const byId = new Map<string, DesignatedShelter>();
  for (const batch of results) {
    if (!batch) continue;
    for (const s of batch) {
      const seen = byId.get(s.id);
      if (seen) {
        // Same site found under another hazard layer — remember both.
        for (const l of s.layers) if (!seen.layers.includes(l)) seen.layers.push(l);
      } else {
        byId.set(s.id, { ...s });
      }
    }
  }

  return {
    shelters: [...byId.values()],
    official: byId.size > 0,
    layersQueried: layers,
    tilesMissing
  };
}
