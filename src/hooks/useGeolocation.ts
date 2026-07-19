import { useEffect } from 'react';
import type { LatLng } from '@/services/geolocation';
import { requestUserPosition } from '@/services/geolocation';
import { reverseGeocode } from '@/services/maps';
import type { PersonalContext } from '@/types/domain';

export interface UseGeolocationParams {
  enabled: boolean;
  googleMapsLoaded: boolean;
  livePosition: LatLng | null;
  liveAddress: string | null;
  setLivePosition: (pos: LatLng) => void;
  setLiveAddress: (addr: string) => void;
  setPersonalContext: React.Dispatch<React.SetStateAction<PersonalContext>>;
}

// Resolves the device position, reverse-geocodes it, and auto-detects display
// language (browser) and Tokyo ward (GPS address).
export function useGeolocation({
  enabled, googleMapsLoaded, livePosition, liveAddress,
  setLivePosition, setLiveAddress, setPersonalContext
}: UseGeolocationParams) {
  // Request real device geolocation once the user has authenticated.
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    requestUserPosition().then((pos) => {
      if (!cancelled && pos) setLivePosition(pos);
    });
    return () => {
      cancelled = true;
    };
  }, [enabled, setLivePosition]);

  // Reverse-geocode the live position into a human-readable address.
  useEffect(() => {
    if (!googleMapsLoaded || !livePosition) return;
    let cancelled = false;
    reverseGeocode(livePosition).then((addr) => {
      if (!cancelled && addr) setLiveAddress(addr);
    });
    return () => {
      cancelled = true;
    };
  }, [googleMapsLoaded, livePosition, setLiveAddress]);

  // Auto-detect display language from the browser on first mount.
  useEffect(() => {
    const tag = (navigator.language || 'en').toLowerCase();
    const detected: PersonalContext['language'] =
      tag.startsWith('ja') ? 'Japanese' :
      tag.startsWith('zh') ? 'Chinese' :
      tag.startsWith('vi') ? 'Vietnamese' :
      'English';
    setPersonalContext((prev) => prev.language === detected ? prev : { ...prev, language: detected });
  }, [setPersonalContext]);

  // Auto-detect the user's Tokyo ward from the GPS-resolved address.
  useEffect(() => {
    if (!liveAddress) return;
    const lower = liveAddress.toLowerCase();
    const ward: PersonalContext['location'] | null =
      lower.includes('shibuya') ? 'Shibuya' :
      lower.includes('shinjuku') ? 'Shinjuku' :
      lower.includes('minato') ? 'Minato' :
      null;
    if (ward) {
      setPersonalContext((prev) => prev.location === ward ? prev : { ...prev, location: ward });
    }
  }, [liveAddress, setPersonalContext]);
}
