import { useCallback, useEffect, useState } from 'react';
import type { LatLng } from '@/services/geolocation';
import type { GeolocationFailure } from '@/services/geolocation';
import { requestUserPosition, peekPermission } from '@/services/geolocation';
import { resolveLocality } from '@/services/maps';
import type { PersonalContext } from '@/types/domain';

export type LocationStatus = 'pending' | 'granted' | 'failed';

export interface LocationState {
  status: LocationStatus;
  /** Why it failed, so the gate can offer the right remedy. */
  reason: GeolocationFailure | null;
  /** Set when the fix came from the coarse network fallback. */
  coarse: boolean;
}

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
  const [location, setLocation] = useState<LocationState>({
    status: 'pending', reason: null, coarse: false
  });

  const requestLocation = useCallback(() => {
    setLocation({ status: 'pending', reason: null, coarse: false });
    requestUserPosition().then((result) => {
      if (result.ok) {
        setLivePosition(result.pos);
        setLocation({ status: 'granted', reason: null, coarse: result.coarse });
        return;
      }
      // Carry the real reason through. Reporting every failure as a denial left
      // the gate offering a retry button that could never work.
      setLocation({ status: 'failed', reason: result.reason, coarse: false });
    });
  }, [setLivePosition]);

  // Where the browser exposes it, notice an already-blocked permission before
  // the user taps anything — on iOS a blocked request fails instantly and
  // silently, which reads as the button being broken.
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    peekPermission().then((state) => {
      if (cancelled || state !== 'denied') return;
      // Never clobber a fix we already hold: an odd browser reporting "denied"
      // after a successful read must not throw the user back to the gate.
      setLocation((prev) => (prev.status === 'granted' ? prev : { status: 'failed', reason: 'denied', coarse: false }));
    });
    return () => { cancelled = true; };
  }, [enabled]);

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

  return { requestLocation, location };
}
