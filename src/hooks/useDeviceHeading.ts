import { useEffect, useRef, useState } from 'react';

// Reads the phone's compass heading (degrees, 0 = north, clockwise) from the
// DeviceOrientation API so AR overlays can be anchored to the real world rather
// than drawn at a fixed angle. Returns null until a reading arrives (or when the
// sensor/permission is unavailable), so callers can fall back to GPS bearing.
//
// iOS 13+ gates the sensor behind a user-gesture permission prompt
// (DeviceOrientationEvent.requestPermission); `enabled` should only flip true in
// response to a tap (e.g. entering camera mode), never on mount.
export function useDeviceHeading(enabled: boolean): number | null {
  const [heading, setHeading] = useState<number | null>(null);
  // Throttle state writes to animation-frame cadence — the sensor can fire far
  // faster than we need, and every update re-renders the AR overlay.
  const latest = useRef<number | null>(null);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) {
      setHeading(null);
      return;
    }

    const flush = () => {
      frame.current = null;
      if (latest.current !== null) setHeading(latest.current);
    };

    const onOrient = (e: DeviceOrientationEvent) => {
      // iOS exposes an absolute, compass-corrected heading via webkitCompassHeading
      // (already 0 = north, clockwise). Elsewhere, `alpha` is degrees counter-
      // clockwise from north, so the compass heading is 360 - alpha.
      const webkitHeading = (e as any).webkitCompassHeading as number | undefined;
      let h: number | null = null;
      if (typeof webkitHeading === 'number' && !Number.isNaN(webkitHeading)) {
        h = webkitHeading;
      } else if (e.alpha !== null && e.alpha !== undefined) {
        h = (360 - e.alpha) % 360;
      }
      if (h === null) return;
      latest.current = ((h % 360) + 360) % 360;
      if (frame.current === null) frame.current = requestAnimationFrame(flush);
    };

    let cancelled = false;
    const attach = () => {
      if (cancelled) return;
      // Prefer the absolute-orientation event where the platform offers it.
      window.addEventListener('deviceorientationabsolute', onOrient as EventListener, true);
      window.addEventListener('deviceorientation', onOrient as EventListener, true);
    };

    // iOS permission gate. `requestPermission` exists only there; call it and
    // attach on grant. Everywhere else, attach directly.
    const anyDOE = DeviceOrientationEvent as any;
    if (typeof anyDOE?.requestPermission === 'function') {
      anyDOE.requestPermission()
        .then((state: string) => { if (state === 'granted') attach(); })
        .catch(() => { /* denied or unsupported — caller keeps GPS fallback */ });
    } else {
      attach();
    }

    return () => {
      cancelled = true;
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      window.removeEventListener('deviceorientationabsolute', onOrient as EventListener, true);
      window.removeEventListener('deviceorientation', onOrient as EventListener, true);
    };
  }, [enabled]);

  return heading;
}
