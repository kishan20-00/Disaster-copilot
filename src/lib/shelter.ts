import type { LatLng } from '@/services/geolocation';
import type { Hazard } from '@/types/domain';
import { findNearestShelter, formatDistance, haversineMeters } from '@/services/maps';

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
// "Nearest" is the wrong answer on its own — the safest place depends on what is
// happening. Open ground is right for an earthquake (falling façades, glass) and
// wrong for a typhoon (flying debris); a low-lying park is actively dangerous in
// a tsunami. These weights encode that, and distance breaks the tie.
//
// Note: true high-ground selection needs elevation data. Google's Elevation API
// would give it; until that is wired, the tsunami rule can only prefer sturdy
// structures and push away from the wave's approach bearing.
// ─────────────────────────────────────────────────────────────────────────────

/** Google Places primary types, grouped by what they physically offer. */
const OPEN_GROUND = ['park', 'stadium', 'school', 'university', 'playground'];
const STURDY_BUILDING = ['city_hall', 'hospital', 'library', 'university', 'shopping_mall', 'gym', 'train_station', 'subway_station'];

const HAZARD_PREFERENCE: Record<Hazard, { prefer: string[]; avoid: string[]; rationale: string }> = {
  earthquake: {
    prefer: OPEN_GROUND,
    avoid: ['shopping_mall'],
    rationale: 'open ground, clear of façades and glass'
  },
  typhoon: {
    prefer: STURDY_BUILDING,
    avoid: ['park', 'playground', 'stadium'],
    rationale: 'a sturdy enclosed building, away from wind-borne debris'
  },
  tsunami: {
    prefer: STURDY_BUILDING,
    avoid: ['park', 'playground', 'beach'],
    rationale: 'a tall, solid structure for vertical evacuation'
  }
};

export interface SafestShelter {
  id: string;
  name: string;
  lat: number;
  lng: number;
  distanceMeters: number;
  distance: string;
  desc: string;
  /** Why this one was chosen over a closer option, for the UI to show. */
  rationale: string;
}

/**
 * Rank candidate shelters for a specific hazard. `threatFrom` is the hazard's
 * origin (quake epicentre / tsunami source) — when supplied, shelters lying in
 * that direction are penalised so a tsunami never routes someone toward the water.
 */
export function pickSafestShelter(
  hazard: Hazard,
  userPos: LatLng | null,
  markers: any[],
  threatFrom?: LatLng | null
): SafestShelter | null {
  if (!userPos || !markers?.length) return null;
  const candidates = markers.filter((m) => m?.category === 'shelter' && Number.isFinite(m.lat) && Number.isFinite(m.lng));
  if (!candidates.length) return null;

  const { prefer, avoid, rationale } = HAZARD_PREFERENCE[hazard];

  const scored = candidates.map((m) => {
    const distanceMeters = haversineMeters(userPos, { lat: m.lat, lng: m.lng });
    const types: string[] = Array.isArray(m.types) ? m.types : [];

    let score = 0;
    if (types.some((t) => prefer.includes(t))) score += 3;
    if (types.some((t) => avoid.includes(t))) score -= 3;

    // Distance matters, but not enough to send someone somewhere unsuitable:
    // one preference grade is worth roughly 600 m of walking.
    score -= distanceMeters / 600;

    // For wave hazards, moving toward the source is the wrong direction.
    if (threatFrom && (hazard === 'tsunami')) {
      const userToThreat = haversineMeters(userPos, threatFrom);
      const shelterToThreat = haversineMeters({ lat: m.lat, lng: m.lng }, threatFrom);
      score += shelterToThreat > userToThreat ? 1.5 : -1.5;
    }

    return { m, distanceMeters, score };
  }).sort((a, b) => b.score - a.score);

  const best = scored[0];
  const closest = scored.reduce((a, b) => (b.distanceMeters < a.distanceMeters ? b : a));
  const tradedUp = best.m.id !== closest.m.id;
  const hazardPhrase = hazard === 'earthquake' ? 'an earthquake' : `a ${hazard}`;

  return {
    id: best.m.id,
    name: best.m.name,
    lat: best.m.lat,
    lng: best.m.lng,
    distanceMeters: best.distanceMeters,
    distance: formatDistance(best.distanceMeters),
    desc: best.m.desc || '',
    rationale: tradedUp
      ? `Chosen over the closer ${closest.m.name} because ${hazardPhrase} calls for ${rationale}.`
      : `Nearest suitable option for ${hazardPhrase}: ${rationale}.`
  };
}
