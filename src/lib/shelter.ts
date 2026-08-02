import type { LatLng } from '@/services/geolocation';
import type { Hazard } from '@/types/domain';
import { findNearestShelter, formatDistance, haversineMeters } from '@/services/maps';
import type { DesignatedShelter } from '@/services/shelters';
import type { HazardInfo } from '@/constants/hazards';
import { hazardInfo, hazardLabel, hazardRationale } from '@/constants/hazards';

export interface ShelterInfo {
  name: string;
  fullName: string;
  distance: string;
  detail: string;
  desc: string;
}

const PLACEHOLDER: ShelterInfo = {
  name: 'Nearest Shelter',
  fullName: 'Nearest Shelter',
  distance: '—',
  detail: 'Locating the nearest designated shelter…',
  desc: ''
};

// Nearest real shelter from live Google Places markers around the user's GPS
// position, with a real haversine distance. Works anywhere in the world.
export function getShelterInfo(userPos: LatLng | null, dynamicMarkers: any[]): ShelterInfo {
  if (!userPos || !dynamicMarkers?.length) return PLACEHOLDER;
  const nearest = findNearestShelter(userPos, dynamicMarkers);
  if (!nearest) return PLACEHOLDER;
  return {
    name: nearest.name,
    fullName: nearest.name,
    distance: formatDistance(nearest.distanceMeters),
    detail: nearest.desc || 'Nearest designated shelter (from Google Places).',
    desc: nearest.desc || ''
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Hazard-aware shelter choice.
//
// Shelters are not interchangeable. A site certified for shaking may sit inside
// a tsunami inundation zone; a low-lying park is useless against a surge. So the
// candidate set changes with the hazard, and only then does distance decide.
//
// Two tiers, in order of trust:
//
//   1. OFFICIAL — Japan's designated evacuation sites (指定緊急避難場所), already
//      filtered by the municipality to those certified for this exact hazard.
//      Nothing needs inferring: nearest certified site wins.
//   2. FALLBACK — outside GSI coverage there is no register, so candidates come
//      from Google Places and are scored by what kind of place they are. These
//      are explicitly NOT official and must be labelled that way.
// ─────────────────────────────────────────────────────────────────────────────

/** Places primary types grouped by what they physically offer. */
const OPEN_GROUND = ['park', 'stadium', 'school', 'university', 'playground'];
const SOLID_BUILDING = ['city_hall', 'hospital', 'library', 'university', 'shopping_mall', 'gym', 'train_station', 'subway_station'];
/** No elevation data client-side, so "high" can only mean "a tall solid structure". */
const HIGH_GROUND = ['city_hall', 'hospital', 'university', 'shopping_mall', 'train_station'];

const TERRAIN_TYPES: Record<HazardInfo['fallbackTerrain'], string[]> = {
  open_ground: OPEN_GROUND,
  solid_building: SOLID_BUILDING,
  high_ground: HIGH_GROUND,
  none: []
};

const TERRAIN_AVOID: Record<HazardInfo['fallbackTerrain'], string[]> = {
  open_ground: ['shopping_mall'],
  solid_building: ['park', 'playground', 'stadium'],
  high_ground: ['park', 'playground', 'stadium'],
  none: []
};

export interface SafestShelter {
  id: string;
  name: string;
  lat: number;
  lng: number;
  distanceMeters: number;
  distance: string;
  desc: string;
  /** Why this one, in plain language, for the UI to show. */
  rationale: string;
  /** True only when drawn from the official designated-site register. */
  official: boolean;
  address?: string;
  /** GSI disasterN numbers this site is certified for. */
  certifiedFor?: number[];
  source: string;
}

const GSI_HAZARD_NAMES: Record<number, string> = {
  1: 'flood', 2: 'landslide', 3: 'storm surge', 4: 'earthquake',
  5: 'tsunami', 6: 'large fire', 7: 'inland flooding', 8: 'volcanic activity'
};

/**
 * Pick where to send someone for a specific hazard.
 *
 * `official` are pre-filtered designated sites (may be empty outside Japan);
 * `placesMarkers` is the Google Places fallback. `threatFrom` is the hazard's
 * origin, used so a water hazard never routes anyone toward the source.
 */
export function pickSafestShelter(
  hazard: Hazard,
  userPos: LatLng | null,
  placesMarkers: any[],
  official: DesignatedShelter[] = [],
  threatFrom?: LatLng | null
): SafestShelter | null {
  if (!userPos) return null;
  const info = hazardInfo(hazard);

  // ── Tier 1: the official register ──
  if (official.length) {
    const ranked = official
      .map((s) => ({ s, d: haversineMeters(userPos, { lat: s.lat, lng: s.lng }) }))
      .sort((a, b) => a.d - b.d);
    const best = ranked[0];
    const certified = best.s.certifiedFor.map((n) => GSI_HAZARD_NAMES[n]).filter(Boolean);
    return {
      id: best.s.id,
      name: best.s.name,
      lat: best.s.lat,
      lng: best.s.lng,
      distanceMeters: best.d,
      distance: formatDistance(best.d),
      desc: [best.s.address, best.s.remarks].filter(Boolean).join(' · '),
      official: true,
      address: best.s.address,
      certifiedFor: best.s.certifiedFor,
      source: best.s.source,
      rationale:
        `Officially designated for ${hazardLabel(hazard).toLowerCase()}` +
        (certified.length > 1 ? ` (also certified for ${certified.filter((c) => c !== hazardLabel(hazard).toLowerCase()).join(', ')})` : '') +
        `. ${ranked.length} certified site(s) nearby; this is the closest.`
    };
  }

  // ── Tier 2: Google Places, scored by what the place physically is ──
  const candidates = placesMarkers.filter(
    (m) => m?.category === 'shelter' && Number.isFinite(m.lat) && Number.isFinite(m.lng)
  );
  if (!candidates.length) return null;

  const prefer = TERRAIN_TYPES[info.fallbackTerrain];
  const avoid = TERRAIN_AVOID[info.fallbackTerrain];
  const wantsAwayFromSource = info.fallbackTerrain === 'high_ground';

  const scored = candidates.map((m) => {
    const distanceMeters = haversineMeters(userPos, { lat: m.lat, lng: m.lng });
    const types: string[] = Array.isArray(m.types) ? m.types : [];

    let score = 0;
    if (types.some((t) => prefer.includes(t))) score += 3;
    if (types.some((t) => avoid.includes(t))) score -= 3;

    // Distance matters, but not enough to send someone somewhere unsuitable:
    // one preference grade is worth roughly 600 m of walking.
    score -= distanceMeters / 600;

    // For water hazards, moving toward the source is the wrong direction.
    if (threatFrom && wantsAwayFromSource) {
      const userToThreat = haversineMeters(userPos, threatFrom);
      const shelterToThreat = haversineMeters({ lat: m.lat, lng: m.lng }, threatFrom);
      score += shelterToThreat > userToThreat ? 1.5 : -1.5;
    }

    return { m, distanceMeters, score };
  }).sort((a, b) => b.score - a.score);

  const best = scored[0];
  const closest = scored.reduce((a, b) => (b.distanceMeters < a.distanceMeters ? b : a));
  const tradedUp = best.m.id !== closest.m.id;

  return {
    id: best.m.id,
    name: best.m.name,
    lat: best.m.lat,
    lng: best.m.lng,
    distanceMeters: best.distanceMeters,
    distance: formatDistance(best.distanceMeters),
    desc: best.m.desc || '',
    official: false,
    source: 'Google Places (no official shelter register available here)',
    rationale:
      `No official shelter register covers this area, so this is a best guess from nearby places — ` +
      `not a designated shelter. Chosen because ${hazardLabel(hazard).toLowerCase()} calls for ${hazardRationale(hazard).toLowerCase()}` +
      (tradedUp ? ` It was preferred over the closer ${closest.m.name}.` : '')
  };
}
