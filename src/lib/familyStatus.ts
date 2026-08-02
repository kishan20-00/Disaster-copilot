import type { FamilyMember } from '@/lib/familyStore';
import type { ImpactAssessment, Severity, ThreatScanState } from '@/lib/impact';
import { tActive } from '@/i18n/context';

// One family member's place, judged against the hazard from the current run.
//
// Produced by the pipeline rather than computed in the panel, so "check my
// family" is genuinely part of pressing the emergency button — not something
// that only happens if the drawer happens to be open.
export interface FamilyStatus {
  member: FamilyMember;
  impact: ImpactAssessment;
}

// ─────────────────────────────────────────────────────────────────────────────
// What do we actually say about one place?
//
// This lives here rather than inside a component because two surfaces render it
// — the Family tab's member cards and the map drawer's compact summary — and
// they had begun wording the same states differently. A place can be in six
// genuinely distinct situations, and collapsing any of them loses information:
//
//   at risk      a hazard was detected and this place falls inside it
//   clear        a hazard was detected and this place is outside it
//   scanning     the feeds are being queried right now
//   no hazard    a scan finished and found nothing to be inside of
//   unknown      no feed answered, so this place COULD NOT be judged
//   unchecked    no scan has run yet
//
// "unknown" is deliberately not folded into "clear". A scan that reached no
// source is not an all-clear, and implying otherwise is the single mistake this
// app is built to avoid.
// ─────────────────────────────────────────────────────────────────────────────

export interface VerdictTone {
  /** Left edge of the member card — the status accent from the design. */
  accent: string;
  /** Badge beside the name. */
  pill: string;
  /** Small status dot. */
  dot: string;
  /** Filled segments of the severity meter. */
  meter: string;
  /** Body text carrying the verdict. */
  text: string;
}

export interface FamilyVerdict {
  /** Badge text, short enough for a pill. */
  label: string;
  /** One line saying what the badge means, in plain language. */
  note: string;
  /** True ONLY when the place falls inside a detected hazard. */
  atRisk: boolean;
  /** 0–4, for the meter. 0 when there is nothing to show. */
  severityLevel: number;
  tone: VerdictTone;
}

const SEVERITY_LEVEL: Record<Severity, number> = {
  none: 0, minor: 1, moderate: 2, severe: 3, extreme: 4
};

const TONES: Record<'risk' | 'clear' | 'busy' | 'unknown' | 'idle', VerdictTone> = {
  risk: {
    accent: 'bg-red-500', pill: 'bg-red-500/15 text-red-700',
    dot: 'bg-red-500 animate-pulse', meter: 'bg-red-500', text: 'text-red-600'
  },
  clear: {
    accent: 'bg-emerald-500', pill: 'bg-emerald-500/15 text-emerald-700',
    dot: 'bg-emerald-500', meter: 'bg-emerald-500', text: 'text-emerald-700'
  },
  busy: {
    accent: 'bg-indigo-500', pill: 'bg-indigo-500/15 text-indigo-700',
    dot: 'bg-indigo-400 animate-pulse', meter: 'bg-indigo-500', text: 'text-indigo-600'
  },
  unknown: {
    accent: 'bg-amber-500', pill: 'bg-amber-500/15 text-amber-700',
    dot: 'bg-amber-500', meter: 'bg-amber-500', text: 'text-amber-700'
  },
  idle: {
    accent: 'bg-slate-300', pill: 'bg-slate-200 text-slate-500',
    dot: 'bg-slate-400', meter: 'bg-slate-300', text: 'text-slate-500'
  }
};

/**
 * `impact` is null when the last run produced no verdict for this place, which
 * is why `scanStatus` is needed as well: both "no scan yet" and "a scan found
 * nothing" leave it null, and showing one grey badge for both made a clean
 * result read as a failure.
 */
export function familyVerdict(
  impact: ImpactAssessment | null,
  scanStatus: ThreatScanState['status'] | null
): FamilyVerdict {
  if (impact) {
    if (impact.affected) {
      return {
        label: tActive('verdict.inArea'),
        // `basis` is still English — it is composed by string concatenation in
        // lib/impact and has not been converted to parameterised messages yet.
        note: impact.basis,
        atRisk: true,
        // An affected place always shows at least one segment, even if the
        // severity scale rounded it down to none.
        severityLevel: SEVERITY_LEVEL[impact.severity] || 1,
        tone: TONES.risk
      };
    }
    return {
      label: tActive('verdict.outside'), note: impact.basis, atRisk: false,
      severityLevel: SEVERITY_LEVEL[impact.severity], tone: TONES.clear
    };
  }

  if (scanStatus === 'scanning') {
    return {
      label: tActive('verdict.checking'), note: tActive('verdict.checkingNote'),
      atRisk: false, severityLevel: 0, tone: TONES.busy
    };
  }
  if (scanStatus === 'clear') {
    return {
      label: tActive('verdict.noHazard'), note: tActive('verdict.noHazardNote'),
      atRisk: false, severityLevel: 0, tone: TONES.clear
    };
  }
  if (scanStatus === 'unavailable') {
    return {
      label: tActive('verdict.unknown'), note: tActive('verdict.unknownNote'),
      atRisk: false, severityLevel: 0, tone: TONES.unknown
    };
  }
  return {
    label: tActive('verdict.unchecked'), note: tActive('verdict.uncheckedNote'),
    atRisk: false, severityLevel: 0, tone: TONES.idle
  };
}
