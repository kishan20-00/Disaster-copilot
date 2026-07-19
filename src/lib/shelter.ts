import type { LatLng } from '@/services/geolocation';
import { findNearestShelter, formatDistance } from '@/services/maps';

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
