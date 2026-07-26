// Whether the opening animation has already been shown on this device.
//
// It plays once and then never again. A disaster app that makes you sit through
// an animation before you can act is working against its own purpose, so the
// splash is an introduction, not a loading screen — nothing waits for it.

const KEY = 'saferoute.splash.v1';

export function hasSeenSplash(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    // Storage unavailable (private mode): treat as seen, so nobody is shown the
    // intro on every single visit with no way to stop it.
    return true;
  }
}

export function markSplashSeen(): void {
  try {
    localStorage.setItem(KEY, '1');
  } catch {
    // Nothing to do — it simply plays again next time.
  }
}

/** Honour the OS "reduce motion" setting: much shorter, and no sweeping. */
export function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  } catch {
    return false;
  }
}
