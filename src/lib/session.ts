import type { AuthUser } from '@/types/domain';

// Persisted auth session (client-only — no backend). Survives page refreshes and
// honors the Google token's expiry so a stale session doesn't linger forever.
const KEY = 'saferoute.session.v1';

export interface StoredSession {
  user: AuthUser;
  exp: number | null; // Google ID-token expiry (unix seconds)
}

// Load a valid session, or null. Drops (and clears) an expired session.
export function loadSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as StoredSession;
    if (!s.user) return null;
    if (s.exp && Date.now() / 1000 >= s.exp) {
      clearSession();
      return null;
    }
    return s;
  } catch {
    return null;
  }
}

export function saveSession(s: StoredSession): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // Storage unavailable (e.g. private mode) — the session just won't persist.
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
