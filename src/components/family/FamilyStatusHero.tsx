import { ShieldCheck, Radar, WifiOff, AlertTriangle, Shield } from 'lucide-react';
import type { FamilyStatus } from '@/lib/familyStatus';
import type { ThreatScanState } from '@/lib/impact';
import { hazardInfo } from '@/constants/hazards';
import { useT } from '@/i18n/context';

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
  const t = useT();
  const atRisk = (familyStatus ?? []).filter((f) => f.impact.affected);
  const hazard = atRisk[0] ? hazardInfo(atRisk[0].impact.hazard) : null;

  // Every line below is phrased so no singular/plural branch is needed. The
  // previous version chose between "place"/"places" and "falls"/"fall" inline,
  // which is untranslatable: Japanese, Chinese and Vietnamese have no such
  // agreement, so those branches could only ever produce English grammar.
  const state = (() => {
    if (memberCount === 0) {
      return {
        badge: t('hero.badge.nobody'), Icon: Shield,
        tone: 'bg-slate-100 border-slate-200', pill: 'bg-slate-200 text-slate-600',
        icon: 'bg-slate-200 text-slate-500', body: 'text-slate-600',
        line: t('hero.line.nobody')
      };
    }
    if (scanStatus === 'scanning') {
      return {
        badge: t('hero.badge.checking'), Icon: Radar,
        tone: 'bg-indigo-50 border-indigo-200', pill: 'bg-indigo-200/70 text-indigo-800',
        icon: 'bg-indigo-600 text-white', body: 'text-indigo-900/80',
        line: t('hero.line.checking')
      };
    }
    if (scanStatus === 'unavailable') {
      return {
        badge: t('hero.badge.unknown'), Icon: WifiOff,
        tone: 'bg-amber-50 border-amber-300', pill: 'bg-amber-200/70 text-amber-900',
        icon: 'bg-amber-500 text-white', body: 'text-amber-900/80',
        line: t('hero.line.unknown')
      };
    }
    if (atRisk.length > 0) {
      const names = atRisk.map((f) => `${f.member.name} — ${f.member.place.name}`).join('; ');
      return {
        badge: t('hero.badge.inArea', { count: atRisk.length }), Icon: AlertTriangle,
        tone: 'bg-red-50 border-red-300', pill: 'bg-red-200/70 text-red-900',
        icon: 'bg-red-600 text-white', body: 'text-red-900/80',
        line: t('hero.line.inArea', {
          names, count: atRisk.length, total: memberCount,
          hazard: hazard?.label.toLowerCase() ?? ''
        })
      };
    }
    if (familyStatus !== null) {
      return {
        badge: t('hero.badge.allClear'), Icon: ShieldCheck,
        tone: 'bg-emerald-50 border-emerald-300', pill: 'bg-emerald-200/70 text-emerald-900',
        icon: 'bg-emerald-600 text-white', body: 'text-emerald-900/80',
        line: t('hero.line.allClearAssessed', { hazard: hazard?.label.toLowerCase() ?? '' })
      };
    }
    if (scanStatus === 'clear') {
      return {
        badge: t('hero.badge.allClear'), Icon: ShieldCheck,
        tone: 'bg-emerald-50 border-emerald-300', pill: 'bg-emerald-200/70 text-emerald-900',
        icon: 'bg-emerald-600 text-white', body: 'text-emerald-900/80',
        line: t('hero.line.allClearNoHazard')
      };
    }
    return {
      badge: t('hero.badge.notChecked'), Icon: Shield,
      tone: 'bg-indigo-50 border-indigo-200', pill: 'bg-indigo-200/70 text-indigo-800',
      icon: 'bg-indigo-600 text-white', body: 'text-indigo-900/80',
      line: t('hero.line.notChecked', { count: memberCount })
    };
  })();

  const asOf = (() => {
    if (!scannedAt) return null;
    const mins = Math.max(0, (Date.now() - Date.parse(scannedAt)) / 60_000);
    if (!Number.isFinite(mins)) return null;
    if (mins < 1) return t('hero.asOf.justNow');
    if (mins < 60) return t('hero.asOf.minutes', { n: Math.round(mins) });
    return t('hero.asOf.hours', { n: (mins / 60).toFixed(1) });
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
              <h2 className="text-[15px] font-black text-slate-900 tracking-tight leading-tight">{t('hero.title')}</h2>
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
