import type { Hazard, ResponseMode } from '@/types/domain';

// ─────────────────────────────────────────────────────────────────────────────
// One table describing every hazard the app handles. Anything that used to be a
// three-way `activeHazard === 'earthquake' ? … : 'typhoon' ? … : …` chain reads
// from here instead, so adding a hazard is a data change rather than a hunt
// through conditionals.
//
// `gsiLayers` are Japan's official designated-evacuation-site tile layers
// (指定緊急避難場所). A site is only listed under a layer if the municipality
// certified it for that hazard — which is why shelters are NOT interchangeable:
// about 71% of earthquake-designated sites near Yokohama are not tsunami-safe.
//
//   skhb01 洪水 flood          skhb05 津波 tsunami
//   skhb02 崖崩れ・土石流・地滑り landslide   skhb06 大規模な火事 large fire
//   skhb03 高潮 storm surge     skhb07 内水氾濫 inland flood
//   skhb04 地震 earthquake      skhb08 火山現象 volcanic
// ─────────────────────────────────────────────────────────────────────────────

export interface HazardInfo {
  label: string;
  labelJa: string;
  emoji: string;
  /** Official designated-shelter layers valid for this hazard (Japan only). */
  gsiLayers: string[];
  response: ResponseMode;
  /**
   * Coarse reach used only when a feed reports a point with no extent (GDACS).
   * Sources that publish a real footprint — JMA cyclone radii, quake magnitude
   * with attenuation — always take precedence over this number.
   */
  coarseReachKm: number;
  /** One line on why this response mode is right, shown to the user. */
  rationale: string;
  /**
   * What kind of place helps, used ONLY where no official register exists
   * (outside Japan). Open ground beats buildings for shaking; height beats
   * distance for water; walls beat everything for wind.
   */
  fallbackTerrain: 'open_ground' | 'solid_building' | 'high_ground' | 'none';
  /** Tailwind tone for badges/cards. */
  tone: string;
}

export const HAZARD_INFO: Record<Hazard, HazardInfo> = {
  earthquake: {
    label: 'Earthquake', labelJa: '地震', emoji: '🌋',
    gsiLayers: ['skhb04'], response: 'evacuate', coarseReachKm: 300,
    rationale: 'Move clear of falling façades and glass once shaking stops.',
    fallbackTerrain: 'open_ground',
    tone: 'bg-red-50 border-red-300 text-red-800'
  },
  tsunami: {
    label: 'Tsunami', labelJa: '津波', emoji: '🌊',
    gsiLayers: ['skhb05'], response: 'evacuate', coarseReachKm: 1500,
    rationale: 'Height beats distance — reach certified high ground or a vertical evacuation building.',
    fallbackTerrain: 'high_ground',
    tone: 'bg-amber-50 border-amber-300 text-amber-800'
  },
  typhoon: {
    // Wind means stay put; the flood and surge that come with it are what
    // designated sites exist for, so both layers are offered.
    label: 'Typhoon', labelJa: '台風', emoji: '🌀',
    gsiLayers: ['skhb03', 'skhb01'], response: 'shelter_in_place', coarseReachKm: 500,
    rationale: 'Walking through wind-borne debris is more dangerous than staying in a solid building.',
    fallbackTerrain: 'solid_building',
    tone: 'bg-sky-50 border-sky-300 text-sky-800'
  },
  flood: {
    label: 'Flood', labelJa: '洪水', emoji: '💧',
    gsiLayers: ['skhb01'], response: 'evacuate', coarseReachKm: 100,
    rationale: 'Move to higher ground before routes are cut off.',
    fallbackTerrain: 'high_ground',
    tone: 'bg-blue-50 border-blue-300 text-blue-800'
  },
  inland_flood: {
    label: 'Inland flooding', labelJa: '内水氾濫', emoji: '🌧️',
    gsiLayers: ['skhb07', 'skhb01'], response: 'evacuate', coarseReachKm: 50,
    rationale: 'Drainage is overwhelmed — leave basements and underground levels.',
    fallbackTerrain: 'high_ground',
    tone: 'bg-blue-50 border-blue-300 text-blue-800'
  },
  storm_surge: {
    label: 'Storm surge', labelJa: '高潮', emoji: '🌊',
    gsiLayers: ['skhb03'], response: 'evacuate', coarseReachKm: 100,
    rationale: 'Sea level is being pushed inland; get above and away from the shore.',
    fallbackTerrain: 'high_ground',
    tone: 'bg-cyan-50 border-cyan-300 text-cyan-800'
  },
  landslide: {
    label: 'Landslide', labelJa: '土砂災害', emoji: '⛰️',
    gsiLayers: ['skhb02'], response: 'evacuate', coarseReachKm: 30,
    rationale: 'Move out of the slope run-out path, not along it.',
    fallbackTerrain: 'open_ground',
    tone: 'bg-orange-50 border-orange-300 text-orange-800'
  },
  volcano: {
    label: 'Volcanic activity', labelJa: '火山現象', emoji: '🌫️',
    gsiLayers: ['skhb08'], response: 'evacuate', coarseReachKm: 30,
    rationale: 'Leave the exclusion zone; ballistics and pyroclastic flow allow no reaction time.',
    fallbackTerrain: 'open_ground',
    tone: 'bg-stone-100 border-stone-300 text-stone-800'
  },
  wildfire: {
    label: 'Wildfire', labelJa: '大規模な火事', emoji: '🔥',
    gsiLayers: ['skhb06'], response: 'evacuate', coarseReachKm: 50,
    rationale: 'Fire spreads faster than people walk — move early, across the wind.',
    fallbackTerrain: 'open_ground',
    tone: 'bg-orange-50 border-orange-300 text-orange-800'
  },
  severe_weather: {
    label: 'Severe weather', labelJa: '荒天', emoji: '⛈️',
    gsiLayers: [], response: 'shelter_in_place', coarseReachKm: 150,
    rationale: 'Stay indoors, away from windows, until the system passes.',
    fallbackTerrain: 'solid_building',
    tone: 'bg-indigo-50 border-indigo-300 text-indigo-800'
  },
  drought: {
    label: 'Drought', labelJa: '干ばつ', emoji: '🏜️',
    gsiLayers: [], response: 'monitor', coarseReachKm: 0,
    rationale: 'A long-onset hazard — nothing to evacuate from.',
    fallbackTerrain: 'none',
    tone: 'bg-yellow-50 border-yellow-300 text-yellow-800'
  },
  other: {
    label: 'Hazard', labelJa: '災害', emoji: '⚠️',
    // Unclassified: offer every designated site rather than none.
    gsiLayers: ['skhb04', 'skhb01', 'skhb05', 'skhb02', 'skhb03', 'skhb06', 'skhb07', 'skhb08'],
    response: 'monitor', coarseReachKm: 50,
    rationale: 'Unclassified hazard — follow local guidance.',
    fallbackTerrain: 'solid_building',
    tone: 'bg-slate-100 border-slate-300 text-slate-700'
  }
};

export const hazardInfo = (h: Hazard): HazardInfo => HAZARD_INFO[h] ?? HAZARD_INFO.other;
export const hazardLabel = (h: Hazard): string => hazardInfo(h).label;
export const responseMode = (h: Hazard): ResponseMode => hazardInfo(h).response;
