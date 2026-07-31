import type { LatLng } from '@/services/geolocation';

// ─────────────────────────────────────────────────────────────────────────────
// Family members the user has added themselves, with a place for each.
//
// This replaces three invented people whose "2 min ago" timestamps never moved
// and whose map pins were fixed offsets from the user's own position — so they
// followed you around at a constant 156 m forever.
//
// What is stored is an EXPECTED place ("Yuki is at school on weekdays"), not a
// live position. No Google API exposes family locations: Family Link has no
// developer API, and Maps location sharing is not published either. Pretending
// otherwise is what the old panel did, so every label here says "expected".
//
// Stored locally, on this device only. Nothing is uploaded, and each Google
// account gets its own list — the first version used a single global key, so
// signing in with a second account showed the first account's family.
// ─────────────────────────────────────────────────────────────────────────────

const PREFIX = 'saferoute.family.v2';
/** The unscoped v1 key, removed on sight rather than migrated. */
const LEGACY_KEY = 'saferoute.family.v1';

/**
 * Storage key for one account. `sub` is Google's stable account id; email is a
 * fallback for tokens that omit it.
 */
export function familyScope(user: { sub?: string; email?: string } | null): string | null {
  const id = user?.sub || user?.email;
  return id ? `${PREFIX}:${id}` : null;
}

/**
 * Drop the shared v1 list. It is deliberately NOT migrated: there is no way to
 * know which account created it, so adopting it would hand one person's family
 * to whoever happened to sign in first.
 */
export function purgeLegacyFamily(): void {
  try {
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    // Nothing to do — storage is unavailable.
  }
}

export interface FamilyPlace {
  name: string;
  address?: string;
  lat: number;
  lng: number;
}

export interface FamilyMember {
  id: string;
  name: string;
  /** Free text: "Child", "Partner", "Father" — the user's own words. */
  relation: string;
  place: FamilyPlace;
  /**
   * Optional phone number, typed by the user. The one piece of contact data this
   * app can genuinely act on: a `tel:` link reaches the real dialler, which is
   * more use in an emergency than any status readout we could invent. Optional
   * on purpose — older saved members predate the field, and a member without a
   * number is still perfectly valid.
   */
  phone?: string;
  /** When the user recorded this, so staleness can be stated honestly. */
  addedAt: string;
}

export const RELATION_PRESETS = ['Partner', 'Child', 'Parent', 'Sibling', 'Friend', 'Carer'];

export function loadFamily(scope: string | null): FamilyMember[] {
  if (!scope) return [];
  try {
    const raw = localStorage.getItem(scope);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Drop anything malformed rather than letting a bad record break the panel.
    return parsed.filter(
      (m): m is FamilyMember =>
        !!m && typeof m.name === 'string' && !!m.place &&
        Number.isFinite(m.place.lat) && Number.isFinite(m.place.lng)
    );
  } catch {
    return [];
  }
}

export function saveFamily(scope: string | null, members: FamilyMember[]): void {
  if (!scope) return;
  try {
    localStorage.setItem(scope, JSON.stringify(members));
  } catch {
    // Storage unavailable (private mode) — the list just won't survive a reload.
  }
}

/** Stable-enough id without pulling in a uuid dependency. */
function newId(): string {
  return `fam-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}

export function addMember(
  members: FamilyMember[],
  input: { name: string; relation: string; place: FamilyPlace; phone?: string }
): FamilyMember[] {
  const name = input.name.trim();
  if (!name) return members;
  const phone = input.phone?.trim();
  return [
    ...members,
    {
      id: newId(),
      name,
      relation: input.relation.trim() || 'Family',
      place: input.place,
      // Stored only when actually given, so `phone` stays absent rather than ''
      // and the Call button can test for it with a simple truthiness check.
      ...(phone ? { phone } : {}),
      addedAt: new Date().toISOString()
    }
  ];
}

export const removeMember = (members: FamilyMember[], id: string): FamilyMember[] =>
  members.filter((m) => m.id !== id);

export const memberPosition = (m: FamilyMember): LatLng => ({ lat: m.place.lat, lng: m.place.lng });

/** "added 3 days ago" — the honest counterpart to the old fake "2 min ago". */
export function describeAge(addedAt: string, now = Date.now()): string {
  const t = Date.parse(addedAt);
  if (!Number.isFinite(t)) return 'added recently';
  const mins = Math.max(0, (now - t) / 60_000);
  if (mins < 60) return 'added just now';
  const hours = mins / 60;
  if (hours < 24) return `added ${Math.round(hours)}h ago`;
  const days = Math.round(hours / 24);
  return `added ${days} day${days === 1 ? '' : 's'} ago`;
}
