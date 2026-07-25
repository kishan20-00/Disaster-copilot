import type { Hazard, ResponseMode } from '../types/domain';
import { hazardInfo, responseMode } from '../constants/hazards';
import type { LatLng } from '../services/geolocation';
import type { LiveHazard } from '../services/alerts';

// ─────────────────────────────────────────────────────────────────────────────
// Does this hazard actually reach *this* user?
//
// Everything here is a pure function of a LiveHazard plus the user's position,
// so it is deterministic and testable. Each verdict carries a `basis` string
// explaining itself, because a copilot that says "evacuate" without saying why
// is not trustworthy.
// ─────────────────────────────────────────────────────────────────────────────

export type Severity = 'none' | 'minor' | 'moderate' | 'severe' | 'extreme';

export interface ImpactAssessment {
  hazardId: string;
  hazard: Hazard;
  /** True only when this hazard warrants protective action for this user. */
  affected: boolean;
  /** False when the feed lacked the data needed to decide — NOT the same as safe. */
  assessable: boolean;
  severity: Severity;
  distanceKm: number | null;
  estimatedMmi: number | null;
  /** Hours until it reaches the user. 0 = already here. */
  leadTimeHours: number | null;
  ageMinutes: number;
  basis: string;
  /** What to actually do — not every hazard means "go to a shelter". */
  response: ResponseMode;
}

/** Sub-assessors return everything except the response mode, which is uniform. */
type PartialAssessment = Omit<ImpactAssessment, 'response'>;

/** Shaking is instantaneous — past this age an event is history, not an alert. */
const QUAKE_ACTIVE_WINDOW_MIN = 90;
/** Tsunami warnings stay actionable much longer than the triggering quake. */
const TSUNAMI_ACTIVE_WINDOW_MIN = 180;
/** A cyclone bulletin older than this is stale enough to distrust. */
const TYPHOON_STALE_WINDOW_MIN = 12 * 60;

/**
 * Modified Mercalli intensity at which protective action is warranted. MMI V is
 * "felt by nearly everyone, unstable objects overturned" — below it people feel
 * the quake but evacuating is the wrong advice.
 */
export const MMI_TRIGGER = 5.0;

/** Conservative reach for tsunami warnings, by warning level. */
const TSUNAMI_REACH_KM = { extreme: 2000, severe: 1500, moderate: 600, minor: 0 };

const R_EARTH_KM = 6371;
const toRad = (d: number) => (d * Math.PI) / 180;

export function distanceKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R_EARTH_KM * Math.asin(Math.sqrt(h));
}

/**
 * First-order macroseismic attenuation: MMI = A + B*M - C*log10(R) - D*R,
 * with R the hypocentral distance in km.
 *
 * These coefficients are NOT from a published IPE — they were fitted by least
 * squares against eleven reference points (Tohoku 2011 at Tokyo and Sendai,
 * Kobe 1995, Kumamoto 2016, plus small/distant quakes that must NOT trigger),
 * giving RMS 0.58 MMI and the correct trigger/quiet verdict on all eleven. It
 * under-predicts very shallow near-field intensity (Kobe by ~1.3 MMI), which is
 * the safe direction for a threshold test but means the number should be treated
 * as an estimate, not a ShakeMap. Swap in a real IPE if this ever needs to be
 * authoritative.
 */
export function estimateMmi(magnitude: number, hypocentralKm: number): number {
  const R = Math.max(1, hypocentralKm);
  const mmi = 1.58 + 1.489 * magnitude - 2.503 * Math.log10(R) - 0.0046 * R;
  return Math.max(0, Math.min(12, mmi));
}

/** JMA shindo (震度) to its approximate MMI equivalent. */
export function shindoToMmi(shindo?: string): number | null {
  if (!shindo) return null;
  const s = shindo.trim().replace('弱', '-').replace('強', '+');
  const table: Record<string, number> = {
    '0': 1, '1': 2, '2': 3, '3': 4, '4': 5,
    '5-': 6, '5': 6.5, '5+': 7, '6-': 8, '6': 8.5, '6+': 9, '7': 10.5
  };
  return table[s] ?? null;
}

const severityFromMmi = (mmi: number): Severity =>
  mmi >= 8 ? 'extreme' : mmi >= 6.5 ? 'severe' : mmi >= MMI_TRIGGER ? 'moderate' : mmi >= 3 ? 'minor' : 'none';

const SEVERITY_RANK: Record<Severity, number> = {
  none: 0, minor: 1, moderate: 2, severe: 3, extreme: 4
};

const fmtKm = (km: number) => (km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`);
const fmtAge = (min: number) =>
  min < 1 ? 'just now' : min < 60 ? `${Math.round(min)} min ago` : `${(min / 60).toFixed(1)} h ago`;

// ── Earthquake ───────────────────────────────────────────────────────────────

function assessEarthquake(h: LiveHazard, user: LatLng, ageMin: number): PartialAssessment {
  const base = {
    hazardId: h.id, hazard: h.hazard, ageMinutes: ageMin, leadTimeHours: 0 as number | null
  };

  if (!h.epicenter || typeof h.magnitude !== 'number') {
    return {
      ...base, affected: false, assessable: false, severity: 'none',
      distanceKm: null, estimatedMmi: null,
      basis: 'Feed did not include an epicentre or magnitude, so local shaking could not be estimated.'
    };
  }

  const epiKm = distanceKm(user, h.epicenter);
  const depth = h.depthKm ?? 10;
  const hypoKm = Math.sqrt(epiKm * epiKm + depth * depth);

  let mmi = estimateMmi(h.magnitude, hypoKm);
  const anchors: string[] = [];

  // You cannot experience more than the strongest intensity observed anywhere,
  // so published observations cap the model rather than being averaged with it.
  const observedCap = shindoToMmi(h.observedShindo);
  if (observedCap !== null && mmi > observedCap) {
    mmi = observedCap;
    anchors.push(`capped at JMA max observed intensity ${h.observedShindo}`);
  }
  if (typeof h.usgsMmi === 'number' && mmi > h.usgsMmi) {
    mmi = h.usgsMmi;
    anchors.push(`capped at USGS ShakeMap max MMI ${h.usgsMmi.toFixed(1)}`);
  }

  const stale = ageMin > QUAKE_ACTIVE_WINDOW_MIN;
  const strongEnough = mmi >= MMI_TRIGGER;
  const affected = strongEnough && !stale;

  let basis =
    `M${h.magnitude.toFixed(1)} at ${fmtKm(epiKm)} (depth ${depth.toFixed(0)} km, ` +
    `hypocentral ${fmtKm(hypoKm)}) → estimated local intensity MMI ${mmi.toFixed(1)}`;
  if (anchors.length) basis += ` (${anchors.join('; ')})`;
  basis += `. Occurred ${fmtAge(ageMin)}.`;
  if (stale && strongEnough) {
    basis += ' Shaking has already passed — aftershock risk remains, but evacuation is not being triggered on a past event.';
  } else if (!strongEnough) {
    basis += ` Below the MMI ${MMI_TRIGGER.toFixed(1)} action threshold.`;
  }
  if (h.usgsAlert) basis += ` USGS PAGER alert: ${h.usgsAlert}.`;

  return {
    ...base,
    affected,
    assessable: true,
    severity: affected ? severityFromMmi(mmi) : severityFromMmi(Math.min(mmi, MMI_TRIGGER - 0.01)),
    distanceKm: epiKm,
    estimatedMmi: mmi,
    basis
  };
}

// ── Tsunami ──────────────────────────────────────────────────────────────────

function tsunamiLevel(text: string): { severity: Severity; label: string } {
  if (text.includes('大津波警報')) return { severity: 'extreme', label: 'Major Tsunami Warning' };
  if (text.includes('津波警報')) return { severity: 'severe', label: 'Tsunami Warning' };
  if (text.includes('津波注意報')) return { severity: 'moderate', label: 'Tsunami Advisory' };
  return { severity: 'minor', label: 'Tsunami Forecast (no significant wave expected)' };
}

function assessTsunami(h: LiveHazard, user: LatLng, ageMin: number): PartialAssessment {
  const { severity, label } = tsunamiLevel(h.tsunamiKind?.text ?? h.bulletinJa ?? '');
  const dist = h.epicenter ? distanceKm(user, h.epicenter) : null;
  const reach = TSUNAMI_REACH_KM[severity as keyof typeof TSUNAMI_REACH_KM] ?? 0;
  const stale = ageMin > TSUNAMI_ACTIVE_WINDOW_MIN;
  const inReach = dist !== null && dist <= reach;
  const affected = reach > 0 && inReach && !stale;

  let basis = `${label}, source region ${dist !== null ? fmtKm(dist) : 'distance unknown'} away, issued ${fmtAge(ageMin)}.`;
  if (severity === 'minor') {
    basis += ' This level forecasts only slight sea-level change — no protective action required.';
  } else if (stale) {
    basis += ' Bulletin is older than the active window; treat as historical.';
  } else if (!inReach) {
    basis += ` Outside the ${reach} km reach used for this warning level.`;
  }
  // Per-coast forecast areas are the authoritative answer and this does not read them.
  basis += ' Coast-by-coast forecast areas are not evaluated, so proximity is used conservatively.';

  return {
    hazardId: h.id, hazard: h.hazard, affected, assessable: dist !== null,
    severity: affected ? severity : 'none',
    distanceKm: dist, estimatedMmi: null, leadTimeHours: 0, ageMinutes: ageMin, basis
  };
}

// ── Typhoon ──────────────────────────────────────────────────────────────────

const CATEGORY_SEVERITY: Record<string, Severity> = {
  TD: 'minor', TS: 'moderate', STS: 'severe', TY: 'severe', VSTY: 'extreme', VITY: 'extreme'
};

function assessTyphoon(h: LiveHazard, user: LatLng, ageMin: number): PartialAssessment {
  const steps = h.typhoon?.steps ?? [];
  if (!steps.length) {
    return {
      hazardId: h.id, hazard: h.hazard, affected: false, assessable: false, severity: 'none',
      distanceKm: null, estimatedMmi: null, leadTimeHours: null, ageMinutes: ageMin,
      basis: 'Cyclone feed carried no forecast positions, so approach could not be evaluated.'
    };
  }

  // Walk the forecast track and find the first step whose warning area — padded
  // by the forecast-position uncertainty — actually contains the user.
  let firstHit: { step: typeof steps[number]; distKm: number; extentKm: number; inStorm: boolean } | null = null;
  let nearest = { distKm: Infinity, extentKm: 0, hoursAhead: 0 };

  for (const step of steps) {
    const distKm = distanceKm(user, step.center);
    const gale = (step.galeRadiusM ?? 0) / 1000;
    const storm = (step.stormRadiusM ?? 0) / 1000;
    const pad = (step.uncertaintyRadiusM ?? 0) / 1000;
    const extentKm = Math.max(gale, storm) + pad;

    if (distKm - extentKm < nearest.distKm - nearest.extentKm) {
      nearest = { distKm, extentKm, hoursAhead: step.hoursAhead };
    }
    if (!firstHit && distKm <= extentKm) {
      firstHit = { step, distKm, extentKm, inStorm: storm > 0 && distKm <= storm + pad };
    }
  }

  const categorySeverity = CATEGORY_SEVERITY[h.typhoon?.categoryEn ?? ''] ?? 'moderate';
  const stale = ageMin > TYPHOON_STALE_WINDOW_MIN;
  const affected = !!firstHit && !stale;
  const horizon = steps[steps.length - 1].hoursAhead;

  let basis: string;
  if (firstHit) {
    basis =
      `${h.typhoon?.categoryEn} ${h.typhoon?.name}: you fall inside the ` +
      `${firstHit.inStorm ? 'storm' : 'gale'} warning area at +${firstHit.step.hoursAhead} h ` +
      `(${fmtKm(firstHit.distKm)} from the forecast centre, warning radius ${fmtKm(firstHit.extentKm)}).`;
  } else {
    basis =
      `${h.typhoon?.categoryEn} ${h.typhoon?.name} stays ${fmtKm(nearest.distKm)} away at its closest ` +
      `approach (+${nearest.hoursAhead} h) against a warning radius of ${fmtKm(nearest.extentKm)} — ` +
      `outside every forecast circle through +${horizon} h.`;
  }
  if (h.typhoon?.sustainedMs) basis += ` Sustained winds ${h.typhoon.sustainedMs} m/s.`;
  if (stale) basis += ` Bulletin issued ${fmtAge(ageMin)} — stale.`;

  return {
    hazardId: h.id, hazard: h.hazard, affected, assessable: true,
    severity: affected ? (firstHit!.inStorm ? categorySeverity : 'moderate') : 'none',
    distanceKm: firstHit?.distKm ?? nearest.distKm,
    estimatedMmi: null,
    leadTimeHours: firstHit?.step.hoursAhead ?? null,
    ageMinutes: ageMin,
    basis
  };
}

// ── Generic proximity (GDACS-style point events) ─────────────────────────────

/** GDACS alert level → severity. */
const GDACS_SEVERITY: Record<string, Severity> = {
  red: 'extreme', orange: 'severe', green: 'minor'
};

/** How long a point event stays actionable, by response mode. */
const GENERIC_ACTIVE_WINDOW_MIN = 24 * 60;

/**
 * For hazards whose feed reports a location but no footprint — floods,
 * wildfires, volcanic activity, unclassified events. A coarse per-hazard reach
 * stands in for the missing extent, and the basis says so plainly rather than
 * implying the boundary is precise.
 */
function assessByProximity(h: LiveHazard, user: LatLng, ageMin: number): PartialAssessment {
  const info = hazardInfo(h.hazard);
  const dist = h.epicenter ? distanceKm(user, h.epicenter) : null;
  const reach = info.coarseReachKm;
  const level = (h.gdacsAlertLevel ?? '').toLowerCase();
  const severity = GDACS_SEVERITY[level] ?? 'moderate';
  const stale = ageMin > GENERIC_ACTIVE_WINDOW_MIN;
  const inReach = dist !== null && reach > 0 && dist <= reach;
  // 'monitor' hazards (drought) are reported but never trigger a response.
  const actionable = info.response !== 'monitor';
  const affected = actionable && inReach && !stale;

  let basis = `${info.label}`;
  if (h.gdacsSeverity) basis += ` — ${h.gdacsSeverity}`;
  basis += dist !== null ? `. Reported ${fmtKm(dist)} away` : '. Location not given';
  basis += `, ${fmtAge(ageMin)}.`;
  if (!actionable) {
    basis += ' This is a slow-onset hazard: monitored, not evacuated.';
  } else if (dist === null) {
    basis += ' Without a location, reach to you cannot be judged.';
  } else if (!inReach) {
    basis += ` Outside the ${reach} km screening radius used for this hazard type.`;
  } else if (stale) {
    basis += ' Older than the active window; treated as historical.';
  }
  if (reach > 0 && dist !== null) {
    basis += ` The feed gives a point rather than an affected area, so ${reach} km is a coarse screen, not a boundary.`;
  }

  return {
    hazardId: h.id, hazard: h.hazard, affected,
    assessable: dist !== null,
    severity: affected ? severity : 'none',
    distanceKm: dist, estimatedMmi: null, leadTimeHours: 0, ageMinutes: ageMin, basis
  };
}

// ── Public API ───────────────────────────────────────────────────────────────

export function assessImpact(h: LiveHazard, user: LatLng, now = Date.now()): ImpactAssessment {
  const t = Date.parse(h.occurredAt);
  const ageMin = Number.isFinite(t) ? Math.max(0, (now - t) / 60_000) : Number.POSITIVE_INFINITY;
  // Precise models where a feed publishes a real footprint; coarse proximity
  // screening for everything else.
  const partial =
    h.hazard === 'earthquake' ? assessEarthquake(h, user, ageMin)
    : h.hazard === 'tsunami' ? assessTsunami(h, user, ageMin)
    : h.hazard === 'typhoon' && h.typhoon ? assessTyphoon(h, user, ageMin)
    : assessByProximity(h, user, ageMin);
  return { ...partial, response: responseMode(h.hazard) };
}

/** UI-facing record of the most recent scan. */
export interface ThreatScanState {
  status: 'scanning' | 'threat' | 'clear' | 'unavailable';
  scannedAt: string | null;
  sourcesQueried: string[];
  sourcesFailed: string[];
  verdict: ThreatVerdict | null;
}

export interface ThreatVerdict {
  /** The hazard to act on, or null when nothing reaches the user. */
  worst: { hazard: LiveHazard; impact: ImpactAssessment } | null;
  /** Everything assessed, worst-first — used to explain an all-clear. */
  all: { hazard: LiveHazard; impact: ImpactAssessment }[];
}

/**
 * Assess every discovered hazard and pick the one that matters: highest
 * severity, then soonest arrival, then closest.
 */
export function evaluateThreats(hazards: LiveHazard[], user: LatLng, now = Date.now()): ThreatVerdict {
  const all = hazards
    .map((hazard) => ({ hazard, impact: assessImpact(hazard, user, now) }))
    .sort((a, b) => {
      const bySeverity = SEVERITY_RANK[b.impact.severity] - SEVERITY_RANK[a.impact.severity];
      if (bySeverity !== 0) return bySeverity;
      const lead = (a.impact.leadTimeHours ?? 999) - (b.impact.leadTimeHours ?? 999);
      if (lead !== 0) return lead;
      return (a.impact.distanceKm ?? 1e9) - (b.impact.distanceKm ?? 1e9);
    });

  return { worst: all.find((x) => x.impact.affected) ?? null, all };
}
