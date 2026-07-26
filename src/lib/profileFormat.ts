import type { Companions } from '@/types/domain';

// Turning the numeric profile into words — for the UI, for Gemini prompts, and
// for the emergency message. Kept in one place so the phrasing cannot drift
// between what the user sees and what the model is told.

/**
 * Minimum storey generally considered above tsunami inundation. Japanese guidance
 * is to reach the third floor or higher, with the fourth used as the safer
 * planning figure — so any claim of being "above the wave" is gated on this.
 */
export const TSUNAMI_MIN_SAFE_FLOOR = 4;

/** Floors at or above this sway noticeably and lose lift access in a quake. */
export const HIGH_RISE_FLOOR = 3;

const ordinal = (n: number): string => {
  // 11th/12th/13th break the usual pattern, and so do 111th, 112th, 113th.
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  const suffix = ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th';
  return `${n}${suffix}`;
};

/** Short label for buttons and status lines: "Ground", "B2", "9F". */
export function floorLabel(floor: number): string {
  if (floor === 0) return 'Ground';
  if (floor < 0) return `B${Math.abs(floor)}`;
  return `${floor}F`;
}

/** Sentence form for prompts and messages: "the 9th floor", "basement level 2". */
export function describeFloor(floor: number): string {
  if (floor === 0) return 'the ground floor';
  if (floor < 0) return `basement level ${Math.abs(floor)}`;
  return `the ${ordinal(floor)} floor`;
}

export const isBasement = (floor: number): boolean => floor < 0;
export const isGround = (floor: number): boolean => floor === 0;
export const isHighRise = (floor: number): boolean => floor >= HIGH_RISE_FLOOR;
export const isAboveTsunamiLine = (floor: number): boolean => floor >= TSUNAMI_MIN_SAFE_FLOOR;

/** Sentence form for prompts and messages. */
export function describeCompanions(c: Companions): string {
  if (c.count <= 0) return 'alone';
  const people = c.count === 1 ? 'one other person' : `${c.count} other people`;
  const needs: string[] = [];
  if (c.needsCarrying) needs.push('someone who must be carried');
  if (c.needsAssistance) needs.push('someone who needs help moving');
  return needs.length ? `${people}, including ${needs.join(' and ')}` : `with ${people}`;
}

/** Compact label for the UI: "Alone", "2 people · needs help". */
export function companionsLabel(c: Companions): string {
  if (c.count <= 0) return 'Alone';
  const base = c.count === 1 ? '1 with me' : `${c.count} with me`;
  const flags = [c.needsCarrying && 'carrying', c.needsAssistance && 'needs help']
    .filter(Boolean).join(' · ');
  return flags ? `${base} · ${flags}` : base;
}

/** True when the group cannot simply move at the user's own pace. */
export const groupSlowsYou = (c: Companions): boolean =>
  c.count > 0 && (c.needsAssistance || c.needsCarrying);
