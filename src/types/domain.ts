// Shared domain types — single source of truth for the app + services.

export type Language = 'English' | 'Chinese' | 'Vietnamese' | 'Japanese';
export type Hazard = 'earthquake' | 'typhoon' | 'tsunami';

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
  location: 'Shibuya' | 'Minato' | 'Shinjuku';
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
