// Shared domain types — single source of truth for the app + services.

export type Language = 'English' | 'Chinese' | 'Vietnamese' | 'Japanese';

// Hazard classes the app can detect and act on. The list is deliberately aligned
// with Japan's official evacuation-site categories (GSI skhb01–08), so every
// hazard that says "evacuate" has a corresponding set of designated shelters.
// See src/constants/hazards.ts for the per-hazard behaviour.
export type Hazard =
  | 'earthquake'
  | 'tsunami'
  | 'typhoon'
  | 'flood'
  | 'inland_flood'
  | 'storm_surge'
  | 'landslide'
  | 'volcano'
  | 'wildfire'
  | 'severe_weather'
  | 'drought'
  | 'other';

// What the user should actually do about a hazard. Not every disaster means
// "run to a shelter" — walking into a typhoon is worse than staying put.
export type ResponseMode = 'evacuate' | 'shelter_in_place' | 'monitor';

// Loose profile shape consumed by the Gemini service prompts.
export interface PersonalProfile {
  language: Language;
  location: string;
  floor: string;
  companions: string;
  mobility: string;
}

// Strict UI-facing profile used across app state (assignable to PersonalProfile).
export interface PersonalContext {
  language: Language;
  location: string; // resolved locality name from GPS reverse-geocoding (works anywhere)
  floor: '9th Floor' | 'Ground Floor' | 'Basement';
  companions: 'Traveling Solo' | 'With a Child' | 'With Elderly Parents';
  mobility: 'Fully Mobile' | 'Wheelchair User';
}

export interface HazardSignal {
  hazard: Hazard;
  headline: string;
  bulletinJa: string;
  bulletinEn: string;
  magnitude?: number;
  intensity?: string;
  source: string;
}

export interface ActionStep {
  num: string;
  title: string;
  desc: string;
}

export interface AgentState {
  id: string;
  name: string;
  role: string;
  status: 'idle' | 'running' | 'completed';
  result: string;
}

export interface AuthUser {
  name: string;
  email: string;
  avatar?: string;
}
