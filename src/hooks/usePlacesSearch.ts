import { useEffect } from 'react';

declare const google: any;

export interface UsePlacesSearchParams {
  googleMapsLoaded: boolean;
  mapCenter: { lat: number; lng: number } | null;
  filterCategory: string;
  setDynamicMarkers: (markers: any[]) => void;
}

// Dynamic Places API (New) fetcher — uses google.maps.places.Place.searchNearby.
// Requires "Places API (New)" enabled in Google Cloud Console.
export function usePlacesSearch({
  googleMapsLoaded, mapCenter, filterCategory, setDynamicMarkers
}: UsePlacesSearchParams) {
  useEffect(() => {
    if (!googleMapsLoaded || !mapCenter || typeof google === 'undefined' || !google.maps?.places?.Place) return;

    const CATEGORY_TYPES: Record<string, string[]> = {
      shelter: ['school', 'park', 'stadium', 'university', 'city_hall', 'gym'],
      water: ['convenience_store', 'supermarket', 'gas_station'],
      medical: ['hospital', 'pharmacy', 'doctor'],
      station: ['transit_station', 'subway_station', 'train_station', 'bus_station']
    };

    const activeCategories: string[] = filterCategory === 'all'
      ? ['shelter', 'water', 'medical', 'station']
      : [filterCategory];

    const { Place, SearchNearbyRankPreference } = google.maps.places as any;

    const searches = activeCategories.map(async (cat) => {
      try {
        const res = await Place.searchNearby({
          fields: ['id', 'displayName', 'location', 'formattedAddress', 'types'],
          locationRestriction: { center: mapCenter, radius: 3000 },
          includedPrimaryTypes: CATEGORY_TYPES[cat],
          maxResultCount: 20,
          rankPreference: SearchNearbyRankPreference?.DISTANCE
        });
        const places = res?.places ?? [];
        return places.map((p: any) => {
          const loc = p.location;
          const lat = typeof loc?.lat === 'function' ? loc.lat() : loc?.lat;
          const lng = typeof loc?.lng === 'function' ? loc.lng() : loc?.lng;
          const name = typeof p.displayName === 'string' ? p.displayName : (p.displayName?.text ?? 'Unknown');
          // These are ordinary Google Places results, not certified facilities.
          // Official designated shelters come from services/shelters.ts; claiming
          // that status for any nearby park or shop would be a lie.
          const descSuffix =
            cat === 'shelter' ? 'Open/public space — not a designated shelter.' :
            cat === 'water' ? 'Shop that may stock water and supplies.' :
            cat === 'medical' ? 'Medical facility.' :
            'Public transit point.';
          return {
            id: p.id,
            category: cat,
            name,
            lat,
            lng,
            // Kept so hazard-aware shelter ranking can tell a park from a city
            // hall — open ground suits an earthquake, not a typhoon.
            types: Array.isArray(p.types) ? p.types : [],
            desc: `${p.formattedAddress ? p.formattedAddress + '. ' : ''}${descSuffix}`,
            x: 0,
            y: 0
          };
        });
      } catch (err) {
        console.warn(`[Places-New] ${cat} failed`, err);
        return [] as any[];
      }
    });

    Promise.all(searches).then((arrays) => {
      const merged = arrays.flat();
      const uniqueMap = new Map<string, any>();
      merged.forEach((item) => {
        if (item.id && !uniqueMap.has(item.id)) uniqueMap.set(item.id, item);
      });
      const deduplicated = Array.from(uniqueMap.values());
      console.info('[Places-New] result', { categories: activeCategories.length, total: deduplicated.length });

      // No text filtering here any more: the search box picks a place to examine
      // rather than narrowing the pins, and having it do both meant typing and
      // pressing Enter did contradictory things.
      setDynamicMarkers(deduplicated);
    });

  }, [googleMapsLoaded, mapCenter, filterCategory, setDynamicMarkers]);
}
