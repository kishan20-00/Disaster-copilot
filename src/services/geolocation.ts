export interface LatLng {
  lat: number;
  lng: number;
}

const CITY_FALLBACK: Record<string, LatLng> = {
  Shibuya: { lat: 35.6565, lng: 139.7000 },
  Minato: { lat: 35.6595, lng: 139.7390 },
  Shinjuku: { lat: 35.6882, lng: 139.7015 }
};

export function getCityFallback(location: string): LatLng {
  return CITY_FALLBACK[location] || CITY_FALLBACK.Shibuya;
}

export function requestUserPosition(timeoutMs = 8000): Promise<LatLng | null> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => {
        console.warn('Geolocation denied or failed; using city fallback.', err.message);
        resolve(null);
      },
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 30_000 }
    );
  });
}
