import { Users, UserPlus, HelpCircle, Trash2, ChevronRight } from 'lucide-react';
import type { FamilyMember } from '@/lib/familyStore';
import { describeAge } from '@/lib/familyStore';
import type { FamilyStatus } from '@/lib/familyStatus';
import type { ThreatScanState } from '@/lib/impact';
import { hazardInfo } from '@/constants/hazards';

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
  onOpenProfile: () => void;
  /** When provided, each row gets a remove button (used by the full Family tab). */
  onRemove?: (id: string) => void;
  /**
   * Collapses to a single tappable summary row instead of the full per-member
   * list. Used by the map drawer now that the Family tab is the full view —
   * showing the complete breakdown in both places was the same content twice.
   */
  compact?: boolean;
}

// Family places, checked against the live hazard.
//
// The old version of this panel was entirely invented: three hardcoded people, a
// "2/3 SAFE" counter computed from a constant so it could never change,
// timestamps frozen at "2 min ago", and map pins welded to the user's own
// position so they followed you around at a fixed 156 m. None of it was data.
//
// What IS real and computable: given a hazard with a known footprint and a place
// the user told us about, we can say whether that place falls inside it. That is
// not "is your child safe" — nothing here can know that — but "is the school you
// told me about inside the warning area", which is true and useful.
export function SafetyGuardPanel({ family, familyStatus, scanStatus, onOpenProfile, onRemove, compact }: SafetyGuardPanelProps) {
  const byId = new Map((familyStatus ?? []).map((f) => [f.member.id, f.impact]));
  const assessed = family.map((m) => ({ member: m, impact: byId.get(m.id) ?? null }));
  const inHarm = assessed.filter((a) => a.impact?.affected).length;

  // One badge per genuine state, so a clear result never reads as a failure.
  const unassessed =
    scanStatus === 'scanning' ? { label: 'Checking…', tone: 'bg-indigo-500/15 text-indigo-600', dot: 'bg-indigo-400 animate-pulse',
        note: 'Checking this place against the live feeds.' }
    : scanStatus === 'clear' ? { label: 'No hazard', tone: 'bg-emerald-500/15 text-emerald-600', dot: 'bg-emerald-500',
        note: 'No active hazard, so there is nothing for this place to be inside.' }
    : scanStatus === 'unavailable' ? { label: 'Unknown', tone: 'bg-amber-500/15 text-amber-600', dot: 'bg-amber-500',
        note: 'Hazard feeds could not be reached, so this place could not be judged.' }
    : { label: 'Not checked yet', tone: 'bg-slate-200 text-slate-500', dot: 'bg-slate-400',
        note: 'Trigger an alert to check this place against live hazards.' };

  if (compact) {
    const statusText = family.length === 0
      ? 'No one added yet'
      : familyStatus === null
      ? (scanStatus === 'clear' ? 'No active hazard' : unassessed.label)
      : inHarm > 0 ? `${inHarm} in affected area` : 'None in affected area';
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
          <span className="text-[10.5px] font-extrabold tracking-wider uppercase font-sans text-slate-600">Family places</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className={`text-[9px] font-mono font-bold uppercase ${statusColor}`}>{statusText}</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        </div>
      </button>
    );
  }

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2.5">
      <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
        <div className="flex items-center gap-1.5">
          <Users className="w-4 h-4 text-indigo-500" />
          <span className="text-[10.5px] font-extrabold tracking-wider uppercase font-sans text-slate-600">
            Family places
          </span>
        </div>
        {family.length > 0 && (
          <span className={`text-[9px] font-mono font-bold ${
            familyStatus === null
              ? scanStatus === 'clear' ? 'text-emerald-600' : 'text-slate-500'
              : inHarm ? 'text-red-600' : 'text-emerald-600'
          }`}>
            {familyStatus === null
              ? (scanStatus === 'clear' ? 'NO ACTIVE HAZARD' : unassessed.label.toUpperCase())
              : inHarm ? `${inHarm} IN AFFECTED AREA` : 'NONE IN AFFECTED AREA'}
          </span>
        )}
      </div>

      {family.length === 0 ? (
        <div className="py-2 text-center space-y-2">
          <p className="text-[10px] font-mono text-slate-500 leading-relaxed px-2">
            Add the people you would check on, and where you expect them to be. Their places get
            checked against any hazard that reaches you.
          </p>
          <button
            onClick={onOpenProfile}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-bold transition active:scale-95"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Add family
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {assessed.map(({ member, impact }) => {
            const affected = impact?.affected ?? false;
            return (
              <div key={member.id} className="flex items-start gap-2.5">
                <span
                  className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${
                    !impact ? unassessed.dot : affected ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[10.5px] font-bold text-slate-800 font-sans">{member.name}</span>
                    <span className="text-[9px] font-mono text-slate-500">{member.relation}</span>
                  </div>
                  <p className="text-[9.5px] font-mono text-slate-500 truncate">{member.place.name}</p>
                  <p className="text-[9px] font-mono text-slate-400">
                    expected location · {describeAge(member.addedAt)}
                  </p>
                  {impact ? (
                    <p className={`text-[9px] font-mono leading-snug mt-0.5 ${affected ? 'text-red-600' : 'text-emerald-600/80'}`}>
                      {affected
                        ? `Inside the ${hazardInfo(impact.hazard).label.toLowerCase()} affected area`
                        : 'Outside the affected area'}
                      {impact.distanceKm !== null && ` · ${Math.round(impact.distanceKm)} km from it`}
                    </p>
                  ) : (
                    <p className="text-[9px] font-mono leading-snug mt-0.5 text-slate-400">{unassessed.note}</p>
                  )}
                </div>
                <span
                  className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md shrink-0 ${
                    !impact
                      ? unassessed.tone
                      : affected
                      ? 'bg-red-500/15 text-red-600'
                      : 'bg-emerald-500/15 text-emerald-600'
                  }`}
                >
                  {!impact ? unassessed.label : affected ? 'At risk' : 'Clear'}
                </span>
                {onRemove && (
                  <button
                    onClick={() => onRemove(member.id)}
                    className="p-1 text-slate-400 hover:text-red-500 transition shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}

          {/* A green dot must never be read as "this person is fine". */}
          <p className="flex items-start gap-1.5 text-[9px] font-mono text-slate-400 leading-snug pt-1">
            <HelpCircle className="w-3 h-3 shrink-0 mt-0.5" />
            This checks places, not people. It cannot tell you whether someone is actually there, or safe.
          </p>
        </div>
      )}

    </div>
  );
}
