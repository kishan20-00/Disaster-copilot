import type { LatLng } from './geolocation';

declare const google: any;

export interface ShelterCandidate {
  id: string;
  name: string;
  lat: number;
  lng: number;
  category: string;
  desc?: string;
  vicinity?: string;
}

export interface NearestShelter extends ShelterCandidate {
  distanceMeters: number;
}

export interface WalkingRoute {
  encodedPolyline: string;
  path: LatLng[];
  distanceMeters: number;
  durationSeconds: number;
  distanceText: string;
  durationText: string;
}

const R_EARTH_M = 6_371_000;
const toRad = (d: number) => (d * Math.PI) / 180;

export function haversineMeters(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R_EARTH_M * Math.asin(Math.sqrt(h));
}

export function formatDistance(m: number): string {
  if (m < 1000) return `${Math.round(m)}m`;
  return `${(m / 1000).toFixed(1)}km`;
}

/** Initial compass bearing from `from` to `to`, in degrees (0 = north, clockwise). */
export function bearingDegrees(from: LatLng, to: LatLng): number {
  const phi1 = toRad(from.lat);
  const phi2 = toRad(to.lat);
  const dLambda = toRad(to.lng - from.lng);
  const y = Math.sin(dLambda) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLambda);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

export function findNearestShelter(userPos: LatLng, markers: ShelterCandidate[]): NearestShelter | null {
  const shelters = markers.filter((m) => m.category === 'shelter');
  if (!shelters.length) return null;
  let best: NearestShelter | null = null;
  for (const s of shelters) {
    const d = haversineMeters(userPos, { lat: s.lat, lng: s.lng });
    if (!best || d < best.distanceMeters) best = { ...s, distanceMeters: d };
  }
  return best;
}

export async function reverseGeocode(pos: LatLng): Promise<string | null> {
  if (typeof google === 'undefined' || !google.maps?.Geocoder) return null;
  const geocoder = new google.maps.Geocoder();
  return new Promise((resolve) => {
    geocoder.geocode({ location: pos, language: 'en' }, (results: any, status: any) => {
      if (status === 'OK' && results?.length) {
        const formatted: string | undefined = results[0].formatted_address;
        resolve(formatted ?? null);
      } else {
        if (status !== 'OK') console.warn(`[Geocoder] ${status}`);
        resolve(null);
      }
    });
  });
}

export interface Locality {
  address: string;
  locality: string;
}

// Reverse-geocode into a full address + a short locality label (neighborhood /
// city / region), picking the most specific useful address component. Works
// anywhere in the world.
export async function resolveLocality(pos: LatLng): Promise<Locality | null> {
  if (typeof google === 'undefined' || !google.maps?.Geocoder) return null;
  const geocoder = new google.maps.Geocoder();
  return new Promise((resolve) => {
    geocoder.geocode({ location: pos, language: 'en' }, (results: any, status: any) => {
      if (status !== 'OK' || !results?.length) {
        if (status !== 'OK') console.warn(`[Geocoder] ${status}`);
        resolve(null);
        return;
      }
      const best = results[0];
      const address: string = best.formatted_address ?? '';
      const components: any[] = best.address_components ?? [];
      const pick = (type: string): string | undefined =>
        components.find((c) => c.types?.includes(type))?.long_name;
      const locality =
        pick('sublocality') ||
        pick('sublocality_level_1') ||
        pick('locality') ||
        pick('postal_town') ||
        pick('administrative_area_level_2') ||
        pick('administrative_area_level_1') ||
        address.split(',')[0] ||
        'Your area';
      resolve({ address, locality });
    });
  });
}

export async function getWalkingRoute(origin: LatLng, destination: LatLng): Promise<WalkingRoute | null> {
  if (typeof google === 'undefined' || !google.maps?.DirectionsService) return null;
  const svc = new google.maps.DirectionsService();
  return new Promise((resolve) => {
    svc.route(
      {
        origin,
        destination,
        travelMode: google.maps.TravelMode.WALKING,
        provideRouteAlternatives: false
      },
      (result: any, status: any) => {
        if (status !== 'OK' || !result?.routes?.length) {
          console.warn(`[Directions] ${status}`);
          resolve(null);
          return;
        }
        const route = result.routes[0];
        const leg = route.legs?.[0];
        if (!leg) {
          resolve(null);
          return;
        }
        // `overview_path` is a *simplified* polyline: at street zoom it visibly
        // cuts corners and can look like it runs through buildings. The
        // per-step paths carry the full geometry, so prefer those and keep
        // overview_path only as a fallback.
        const toLatLng = (p: any): LatLng => ({ lat: p.lat(), lng: p.lng() });
        const detailed: LatLng[] = [];
        for (const leg of route.legs ?? []) {
          for (const step of leg.steps ?? []) {
            for (const point of step.path ?? step.lat_lngs ?? []) {
              const next = toLatLng(point);
              // Consecutive steps share an endpoint — don't repeat it.
              const prev = detailed[detailed.length - 1];
              if (prev && prev.lat === next.lat && prev.lng === next.lng) continue;
              detailed.push(next);
            }
          }
        }
        const path: LatLng[] = detailed.length > 1
          ? detailed
          : (route.overview_path || []).map(toLatLng);
        resolve({
          encodedPolyline: route.overview_polyline || '',
          path,
          distanceMeters: leg.distance?.value ?? 0,
          durationSeconds: leg.duration?.value ?? 0,
          distanceText: leg.distance?.text ?? '',
          durationText: leg.duration?.text ?? ''
        });
      }
    );
  });
}
