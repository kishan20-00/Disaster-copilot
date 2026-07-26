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

// Who is with the user, described by the things that actually change the advice
// rather than by a fixed set of personas. "With a Child" and "With Elderly
// Parents" both really meant "someone slower who may need help on stairs", and
// there was no way at all to say you were with another adult.
export interface Companions {
  /** People with the user, not counting the user. */
  count: number;
  /** Anyone who cannot move quickly or manage stairs unaided. */
  needsAssistance: boolean;
  /** Anyone who must be carried — an infant, or someone non-ambulatory. */
  needsCarrying: boolean;
}

// Strict UI-facing profile used across app state (assignable to PersonalProfile).
export interface PersonalContext {
  language: Language;
  location: string; // resolved locality name from GPS reverse-geocoding (works anywhere)
  /**
   * Storey the user is on: 0 = ground, negative = basement levels, positive = up.
   *
   * This was previously the literal string '9th Floor', a leftover from a scripted
   * demo. It meant nobody on floor 3 or floor 20 could describe themselves, and
   * the tsunami advice asserted "you are well above wave crest height" to anyone
   * who picked the only "high" option available.
   */
  floor: number;
  companions: Companions;
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
  /**
   * Google's `sub` claim — a stable per-account id. Used to scope stored data,
   * because an email address can change on the same account and would then
   * orphan (or worse, cross-wire) whatever was keyed to it.
   */
  sub?: string;
}
