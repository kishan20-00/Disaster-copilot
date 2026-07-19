import { locationMarkers } from '@/constants/locationMarkers';

// Resolve shelter info (localized name/distance/detail) — prefers dynamic Places
// results when available, else falls back to the hardcoded ward markers.
export const getShelterInfo = (location: string, language: string, dynamicShelters?: any[]) => {
  const markers = (dynamicShelters && dynamicShelters.length > 0)
    ? dynamicShelters
    : (locationMarkers[location as keyof typeof locationMarkers] || []);
  const shelter = markers.find(m => m.category === 'shelter') as any;
  if (!shelter) {
    return { name: 'Emergency Shelter', distance: '400m', detail: 'Open shelter', fullName: 'Emergency Shelter', desc: '' };
  }

  let name = shelter.shortName || shelter.name;
  if (language === 'Japanese') name = shelter.shortNameJa || shelter.name;
  else if (language === 'Chinese') name = shelter.shortNameZh || shelter.name;
  else if (language === 'Vietnamese') name = shelter.shortNameVi || shelter.name;

  return {
    name: name || shelter.shortName || shelter.name,
    fullName: shelter.name,
    distance: shelter.distance || '350m',
    detail: shelter.detailDesc || shelter.desc || 'Designated Shelter',
    desc: shelter.desc
  };
};
