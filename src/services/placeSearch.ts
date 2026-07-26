import type { LatLng } from './geolocation';

declare const google: any;

// ─────────────────────────────────────────────────────────────────────────────
// Place autocomplete, for choosing which location to examine.
//
// Deliberately built on Places API (New) rather than the Geocoder: the same
// service already returns nearby shelters and pharmacies successfully, whereas
// Geocoding is a separate API that may not be enabled on a given key. Verified
// against this project's key — Geocoding returns REQUEST_DENIED while Places
// autocomplete returns results, so the search box works either way.
//
// A session token groups keystrokes into one billable session; without it every
// keystroke is charged as a separate request.
// ─────────────────────────────────────────────────────────────────────────────

export interface PlaceSuggestion {
  id: string;
  /** Place name, e.g. "Yokohama Station". */
  primary: string;
  /** Disambiguating context, e.g. "Nishi Ward, Yokohama, Kanagawa". */
  secondary: string;
  /** The prediction object, kept so the coordinates can be fetched on selection. */
  prediction: any;
}

export interface ResolvedPlace {
  pos: LatLng;
  name: string;
  address: string;
}

let sessionToken: any = null;

function ensureSession(): any {
  const places = typeof google !== 'undefined' ? google.maps?.places : undefined;
  if (!places?.AutocompleteSessionToken) return undefined;
  if (!sessionToken) sessionToken = new places.AutocompleteSessionToken();
  return sessionToken;
}

/** A session ends when a place is picked; the next search starts a fresh one. */
function endSession(): void {
  sessionToken = null;
}

/**
 * Suggestions for a partial query, biased toward `near` so local results rank
 * first. Returns an empty list rather than throwing — a dead search box should
 * never take the map down with it.
 */
export async function fetchPlaceSuggestions(
  input: string,
  near?: LatLng | null
): Promise<PlaceSuggestion[]> {
  const query = input.trim();
  if (query.length < 2) return [];

  const places = typeof google !== 'undefined' ? google.maps?.places : undefined;
  if (!places?.AutocompleteSuggestion?.fetchAutocompleteSuggestions) {
    console.warn('[placeSearch] Places autocomplete unavailable in this Maps build.');
    return [];
  }

  try {
    const request: Record<string, unknown> = { input: query };
    const token = ensureSession();
    if (token) request.sessionToken = token;
    if (near) {
      request.locationBias = { center: near, radius: 50_000 };
    }

    const res = await places.AutocompleteSuggestion.fetchAutocompleteSuggestions(request);
    const suggestions: any[] = res?.suggestions ?? [];

    return suggestions.flatMap((s) => {
      const p = s?.placePrediction;
      if (!p) return [];
      const primary = p.structuredFormat?.mainText?.text ?? p.text?.text ?? '';
      if (!primary) return [];
      return [{
        id: p.placeId ?? primary,
        primary,
        secondary: p.structuredFormat?.secondaryText?.text ?? '',
        prediction: p
      }];
    });
  } catch (err) {
    console.warn('[placeSearch] autocomplete failed', err);
    return [];
  }
}

/** Turn a chosen suggestion into coordinates. */
export async function resolveSuggestion(s: PlaceSuggestion): Promise<ResolvedPlace | null> {
  try {
    const place = s.prediction?.toPlace?.();
    if (!place) return null;
    await place.fetchFields({ fields: ['location', 'displayName', 'formattedAddress'] });
    const loc = place.location;
    const lat = typeof loc?.lat === 'function' ? loc.lat() : loc?.lat;
    const lng = typeof loc?.lng === 'function' ? loc.lng() : loc?.lng;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    const name =
      (typeof place.displayName === 'string' ? place.displayName : place.displayName?.text) ||
      s.primary;

    return {
      pos: { lat, lng },
      name,
      address: place.formattedAddress ?? s.secondary
    };
  } catch (err) {
    console.warn('[placeSearch] could not resolve the selected place', err);
    return null;
  } finally {
    // Selection closes the billing session whether or not it succeeded.
    endSession();
  }
}
