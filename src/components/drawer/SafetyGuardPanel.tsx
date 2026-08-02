import { Users, ChevronRight } from 'lucide-react';
import type { FamilyMember } from '@/lib/familyStore';
import type { FamilyStatus } from '@/lib/familyStatus';
import { familyVerdict } from '@/lib/familyStatus';
import type { ThreatScanState } from '@/lib/impact';
import { useT } from '@/i18n/context';

interface SafetyGuardPanelProps {
  family: FamilyMember[];
  /**
   * Per-member verdicts from the last emergency run, or null when no run has
   * happened. Computed by the pipeline so pressing the button genuinely checks
   * these places, rather than the panel working it out only while it is open.
   */
  familyStatus: FamilyStatus[] | null;
  /**
   * Needed to tell "no scan has run" apart from "a scan ran and found nothing".
   * Both leave familyStatus null, and showing the same grey "not checked" badge
   * for each made a clean result look like a failure.
   */
  scanStatus: ThreatScanState['status'] | null;
  /** Opens the Family tab, where the full breakdown lives. */
  onOpenProfile: () => void;
}

// One-line family summary for the map drawer.
//
// This used to carry a full per-member breakdown as well. That breakdown now
// lives on the Family tab as proper cards (see FamilyMemberCard), so keeping a
// second copy here was the same content rendered twice, in two different
// vocabularies — and only one of them got updated when the wording changed. What
// remains is the summary row and a way through to the real thing.
//
// The wording itself comes from familyVerdict, shared with those cards, so the
// drawer and the tab cannot disagree about what a state is called.
//
// What IS real and computable: given a hazard with a known footprint and a place
// the user told us about, we can say whether that place falls inside it. That is
// not "is your child safe" — nothing here can know that — but "is the school you
// told me about inside the warning area", which is true and useful.
export function SafetyGuardPanel({ family, familyStatus, scanStatus, onOpenProfile }: SafetyGuardPanelProps) {
  const t = useT();
  const inHarm = (familyStatus ?? []).filter((f) => f.impact.affected).length;
  const unassessed = familyVerdict(null, scanStatus);

  const statusText = family.length === 0
    ? t('guard.noneAdded')
    : familyStatus === null
    ? unassessed.label
    : inHarm > 0 ? t('guard.inAffected', { count: inHarm }) : t('guard.noneAffected');

  const statusColor = family.length === 0
    ? 'text-slate-500'
    : familyStatus === null
    ? (scanStatus === 'clear' ? 'text-emerald-600' : 'text-slate-500')
    : inHarm > 0 ? 'text-red-600' : 'text-emerald-600';

  return (
    <button
      onClick={onOpenProfile}
      className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 flex items-center justify-between active:scale-[0.99] transition"
    >
      <div className="flex items-center gap-1.5">
        <Users className="w-4 h-4 text-indigo-500 shrink-0" />
        <span className="text-[10.5px] font-extrabold tracking-wider uppercase font-sans text-slate-600">{t('guard.title')}</span>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <span className={`text-[9px] font-mono font-bold uppercase ${statusColor}`}>{statusText}</span>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
      </div>
    </button>
  );
}
