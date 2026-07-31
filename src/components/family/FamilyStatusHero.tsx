import { ShieldCheck, Radar, WifiOff, AlertTriangle, Shield } from 'lucide-react';
import type { FamilyStatus } from '@/lib/familyStatus';
import type { ThreatScanState } from '@/lib/impact';
import { hazardInfo } from '@/constants/hazards';

interface FamilyStatusHeroProps {
  memberCount: number;
  familyStatus: FamilyStatus[] | null;
  scanStatus: ThreatScanState['status'] | null;
  /** When the last scan completed, for an honest "as of" line. */
  scannedAt: string | null;
}

// The summary card at the top of the Family tab.
//
// The design fills this with a first-person narration — "I'm guiding Dad around
// the hazard. Mom has arrived safely at the shelter." Neither claim is available
// to this app: it is not guiding anyone but the user, and it has no way to know
// that another person arrived anywhere. So the card keeps the design's shape and
// prominence, and states what the last run actually established about the places
// on file.
//
// The badge deliberately reads "All clear" rather than "All secure". The scope is
// places, not people — a distinction the footer of this screen spells out — and
// "secure" asserts something about the people themselves.
export function FamilyStatusHero({ memberCount, familyStatus, scanStatus, scannedAt }: FamilyStatusHeroProps) {
  const atRisk = (familyStatus ?? []).filter((f) => f.impact.affected);
  const hazard = atRisk[0] ? hazardInfo(atRisk[0].impact.hazard) : null;

  const state = (() => {
    if (memberCount === 0) {
      return {
        badge: 'Nobody added', Icon: Shield,
        tone: 'bg-slate-100 border-slate-200', pill: 'bg-slate-200 text-slate-600',
        icon: 'bg-slate-200 text-slate-500', body: 'text-slate-600',
        line: 'Add the people you would check on first, and where you expect them to be. Their places are then tested against every hazard the app detects.'
      };
    }
    if (scanStatus === 'scanning') {
      return {
        badge: 'Checking', Icon: Radar,
        tone: 'bg-indigo-50 border-indigo-200', pill: 'bg-indigo-200/70 text-indigo-800',
        icon: 'bg-indigo-600 text-white', body: 'text-indigo-900/80',
        line: `Testing ${memberCount} recorded ${memberCount === 1 ? 'place' : 'places'} against the live hazard feeds.`
      };
    }
    if (scanStatus === 'unavailable') {
      return {
        badge: 'Unknown', Icon: WifiOff,
        tone: 'bg-amber-50 border-amber-300', pill: 'bg-amber-200/70 text-amber-900',
        icon: 'bg-amber-500 text-white', body: 'text-amber-900/80',
        line: 'No hazard feed could be reached, so these places could not be judged. This is not an all-clear — retry once you have a connection.'
      };
    }
    if (atRisk.length > 0) {
      const names = atRisk.map((f) => `${f.member.name} at ${f.member.place.name}`).join('; ');
      return {
        badge: `${atRisk.length} in area`, Icon: AlertTriangle,
        tone: 'bg-red-50 border-red-300', pill: 'bg-red-200/70 text-red-900',
        icon: 'bg-red-600 text-white', body: 'text-red-900/80',
        line: `${atRisk.length} of ${memberCount} recorded ${memberCount === 1 ? 'place' : 'places'} ${atRisk.length === 1 ? 'falls' : 'fall'} inside the ${hazard?.label.toLowerCase() ?? 'hazard'} affected area: ${names}.`
      };
    }
    if (familyStatus !== null) {
      return {
        badge: 'All clear', Icon: ShieldCheck,
        tone: 'bg-emerald-50 border-emerald-300', pill: 'bg-emerald-200/70 text-emerald-900',
        icon: 'bg-emerald-600 text-white', body: 'text-emerald-900/80',
        line: `None of the ${memberCount} recorded ${memberCount === 1 ? 'place' : 'places'} ${memberCount === 1 ? 'falls' : 'fall'} inside the ${hazard?.label.toLowerCase() ?? 'detected'} affected area.`
      };
    }
    if (scanStatus === 'clear') {
      return {
        badge: 'All clear', Icon: ShieldCheck,
        tone: 'bg-emerald-50 border-emerald-300', pill: 'bg-emerald-200/70 text-emerald-900',
        icon: 'bg-emerald-600 text-white', body: 'text-emerald-900/80',
        line: `No active hazard reaches you, so there is nothing for these ${memberCount === 1 ? 'place' : 'places'} to be inside.`
      };
    }
    return {
      badge: 'Not checked', Icon: Shield,
      tone: 'bg-indigo-50 border-indigo-200', pill: 'bg-indigo-200/70 text-indigo-800',
      icon: 'bg-indigo-600 text-white', body: 'text-indigo-900/80',
      line: `${memberCount} ${memberCount === 1 ? 'place' : 'places'} on file. Run a safety check and each one is tested against whatever the live feeds report.`
    };
  })();

  const asOf = (() => {
    if (!scannedAt) return null;
    const mins = Math.max(0, (Date.now() - Date.parse(scannedAt)) / 60_000);
    if (!Number.isFinite(mins)) return null;
    if (mins < 1) return 'checked just now';
    if (mins < 60) return `checked ${Math.round(mins)} min ago`;
    return `checked ${(mins / 60).toFixed(1)} h ago`;
  })();

  return (
    <section className={`border rounded-3xl p-4 ${state.tone}`}>
      <div className="flex items-start gap-3">
        <span className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm ${state.icon}`}>
          <state.Icon className={`w-5 h-5 ${scanStatus === 'scanning' ? 'animate-spin' : ''}`} style={{ animationDuration: '2.5s' }} />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="text-[15px] font-black text-slate-900 tracking-tight leading-tight">Family status</h2>
              {asOf && <p className="text-[9px] font-mono text-slate-500 mt-0.5">{asOf}</p>}
            </div>
            <span className={`shrink-0 text-[9.5px] font-black uppercase tracking-wide px-2.5 py-1 rounded-full ${state.pill}`}>
              {state.badge}
            </span>
          </div>
          <p className={`text-[11.5px] leading-relaxed mt-2 ${state.body}`}>{state.line}</p>
        </div>
      </div>
    </section>
  );
}
