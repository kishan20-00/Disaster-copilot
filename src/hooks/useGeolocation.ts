import { useCallback, useEffect, useState } from 'react';
import type { LatLng } from '@/services/geolocation';
import { requestUserPosition } from '@/services/geolocation';
import { resolveLocality } from '@/services/maps';
import type { PersonalContext } from '@/types/domain';

export type LocationStatus = 'pending' | 'granted' | 'denied';

export interface UseGeolocationParams {
  enabled: boolean;
  googleMapsLoaded: boolean;
  livePosition: LatLng | null;
  setLivePosition: (pos: LatLng) => void;
  setLiveAddress: (addr: string) => void;
  setPersonalContext: React.Dispatch<React.SetStateAction<PersonalContext>>;
}

// Resolves the device position, reverse-geocodes it into a real locality name
// (works anywhere), and auto-detects display language. Exposes a retry.
export function useGeolocation({
  enabled, googleMapsLoaded, livePosition,
  setLivePosition, setLiveAddress, setPersonalContext
}: UseGeolocationParams) {
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('pending');

  const requestLocation = useCallback(() => {
    setLocationStatus('pending');
    requestUserPosition().then((pos) => {
      if (pos) {
        setLivePosition(pos);
        setLocationStatus('granted');
      } else {
        setLocationStatus('denied');
      }
    });
  }, [setLivePosition]);

  // Request device geolocation once the user has authenticated.
  useEffect(() => {
    if (!enabled) return;
    requestLocation();
  }, [enabled, requestLocation]);

  // Reverse-geocode the live position into a full address + locality label.
  useEffect(() => {
    if (!googleMapsLoaded || !livePosition) return;
    let cancelled = false;
    resolveLocality(livePosition).then((res) => {
      if (cancelled || !res) return;
      setLiveAddress(res.address);
      setPersonalContext((prev) => prev.location === res.locality ? prev : { ...prev, location: res.locality });
    });
    return () => {
      cancelled = true;
    };
  }, [googleMapsLoaded, livePosition, setLiveAddress, setPersonalContext]);

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

  return { requestLocation, locationStatus };
}
