export interface LatLng {
  lat: number;
  lng: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Device position.
//
// The first version resolved `null` for every failure, so the UI could only ever
// say "denied". That is wrong three ways on a phone:
//
//   * A blocked permission on iOS fires the error callback IMMEDIATELY with no
//     prompt, so tapping the button looked like it did nothing at all.
//   * A high-accuracy GPS timeout indoors is not a denial, but was reported as
//     one — and the retry button could not fix it.
//   * A page served over http can never get a position, and no amount of
//     tapping will change that.
//
// So failures are now distinguished, and a timeout falls back to a coarse
// network fix, which usually succeeds indoors where GPS does not.
// ─────────────────────────────────────────────────────────────────────────────

export type GeolocationFailure =
  /** Browser has no geolocation API at all. */
  | 'unsupported'
  /** Not a secure context (http). Geolocation is permanently unavailable. */
  | 'insecure'
  /** Permission blocked. Needs changing in browser or OS settings. */
  | 'denied'
  /** Hardware/network could not produce a fix. */
  | 'unavailable'
  /** Took too long, even after retrying with coarse accuracy. */
  | 'timeout';

export type PositionResult =
  | { ok: true; pos: LatLng; accuracyM: number | null; coarse: boolean }
  | { ok: false; reason: GeolocationFailure; message?: string };

/** Browser error codes, which are plain numbers at runtime. */
const PERMISSION_DENIED = 1;
const POSITION_UNAVAILABLE = 2;
const TIMEOUT = 3;

function attempt(options: PositionOptions): Promise<
  { ok: true; position: GeolocationPosition } | { ok: false; code: number; message: string }
> {
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ ok: true, position }),
      (err) => resolve({ ok: false, code: err.code, message: err.message }),
      options
    );
  });
}

/**
 * Ask the device where it is.
 *
 * `highAccuracyTimeoutMs` bounds the GPS attempt; if that times out or no fix is
 * available, a second coarse attempt runs with a longer budget and accepts a
 * recently cached position.
 */
export async function requestUserPosition(
  highAccuracyTimeoutMs = 10_000,
  coarseTimeoutMs = 20_000
): Promise<PositionResult> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return { ok: false, reason: 'unsupported' };
  }
  // Browsers refuse geolocation outside a secure context, and fail in ways that
  // look like a denial — so name it before asking.
  if (typeof window !== 'undefined' && window.isSecureContext === false) {
    return { ok: false, reason: 'insecure' };
  }

  const precise = await attempt({
    enableHighAccuracy: true,
    timeout: highAccuracyTimeoutMs,
    maximumAge: 30_000
  });
  if (precise.ok) {
    return {
      ok: true,
      pos: { lat: precise.position.coords.latitude, lng: precise.position.coords.longitude },
      accuracyM: Number.isFinite(precise.position.coords.accuracy) ? precise.position.coords.accuracy : null,
      coarse: false
    };
  }

  // A refusal will not become an acceptance on retry, so stop and say so.
  if (precise.code === PERMISSION_DENIED) {
    return { ok: false, reason: 'denied', message: precise.message };
  }

  // Indoors, GPS often times out while the network fix lands instantly. Accept a
  // position up to five minutes old — for working out which city you are in and
  // which shelters are near, that is plenty.
  console.warn(`[geolocation] precise fix failed (code ${precise.code}); retrying coarse.`);
  const coarse = await attempt({
    enableHighAccuracy: false,
    timeout: coarseTimeoutMs,
    maximumAge: 300_000
  });
  if (coarse.ok) {
    return {
      ok: true,
      pos: { lat: coarse.position.coords.latitude, lng: coarse.position.coords.longitude },
      accuracyM: Number.isFinite(coarse.position.coords.accuracy) ? coarse.position.coords.accuracy : null,
      coarse: true
    };
  }

  if (coarse.code === PERMISSION_DENIED) return { ok: false, reason: 'denied', message: coarse.message };
  if (coarse.code === POSITION_UNAVAILABLE) return { ok: false, reason: 'unavailable', message: coarse.message };
  if (coarse.code === TIMEOUT) return { ok: false, reason: 'timeout', message: coarse.message };
  return { ok: false, reason: 'unavailable', message: coarse.message };
}

/**
 * Permission state without triggering a prompt, where the browser supports it.
 * Lets the gate show "you have blocked this" up front instead of after a tap that
 * cannot possibly succeed. Safari's support is patchy, hence the null.
 */
export async function peekPermission(): Promise<'granted' | 'denied' | 'prompt' | null> {
  try {
    const perms = (navigator as any)?.permissions;
    if (!perms?.query) return null;
    const status = await perms.query({ name: 'geolocation' as PermissionName });
    return status?.state ?? null;
  } catch {
    return null;
  }
}
