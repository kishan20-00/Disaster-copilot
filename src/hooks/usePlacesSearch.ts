import { useEffect } from 'react';

declare const google: any;

export interface UsePlacesSearchParams {
  googleMapsLoaded: boolean;
  mapCenter: { lat: number; lng: number } | null;
  filterCategory: string;
  searchQuery: string;
  location: string;
  setDynamicMarkers: (markers: any[]) => void;
}

// Dynamic Places API (New) fetcher — uses google.maps.places.Place.searchNearby.
// Requires "Places API (New)" enabled in Google Cloud Console.
export function usePlacesSearch({
  googleMapsLoaded, mapCenter, filterCategory, searchQuery, location, setDynamicMarkers
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
          const descSuffix =
            cat === 'shelter' ? 'Designated shelter point.' :
            cat === 'water' ? 'Emergency water / supply node.' :
            cat === 'medical' ? 'Emergency medical / triage point.' :
            'Active evacuation transit point.';
          return {
            id: p.id,
            category: cat,
            name,
            lat,
            lng,
            desc: `${p.formattedAddress || 'Tokyo, Japan'}. ${descSuffix}`,
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

      const final = deduplicated.filter((m: any) => {
        if (!searchQuery) return true;
        return (
          (m.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (m.desc || '').toLowerCase().includes(searchQuery.toLowerCase())
        );
      });
      setDynamicMarkers(final);
    });

  }, [googleMapsLoaded, mapCenter, filterCategory, searchQuery, location, setDynamicMarkers]);
}
