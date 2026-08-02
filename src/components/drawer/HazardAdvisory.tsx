import { AlertTriangle } from 'lucide-react';
import type { Hazard, HazardSignal } from '@/types/domain';
import { hazardInfo } from '@/constants/hazards';
import { useT } from '@/i18n/context';

interface HazardAdvisoryProps {
  activeHazard: Hazard;
  hazardSignal: HazardSignal | null;
}

export function HazardAdvisory({ activeHazard, hazardSignal }: HazardAdvisoryProps) {
  const t = useT();
  const hazard = hazardInfo(activeHazard);
  return (
    <div className={`border rounded-2xl overflow-hidden shadow-lg animate-in fade-in duration-300 ${
      activeHazard === 'earthquake' ? 'bg-red-50 border-red-300 text-red-800' :
      activeHazard === 'typhoon' ? 'bg-sky-50 border-sky-300 text-sky-800' :
      'bg-amber-50 border-amber-300 text-amber-800'
    }`}>
      <div className={`px-3 py-2 flex items-center justify-between text-[10.5px] font-bold border-b ${
        activeHazard === 'earthquake' ? 'bg-red-100/70 border-red-300/60' :
        activeHazard === 'typhoon' ? 'bg-sky-100/70 border-sky-300/60' :
        'bg-amber-100/70 border-amber-300/60'
      }`}>
        {/* This was a three-way ternary over hardcoded Japanese JMA warning
            names, falling through to 大津波警報発表 — so a wildfire, a flood or a
            landslide announced itself as a MAJOR TSUNAMI WARNING. That is not a
            cosmetic bug: it asserted a warning that had not been issued, by an
            agency that had not issued it. The hazard table names the hazard, and
            the actual issuing source is already shown on the right. */}
        <span className="flex items-center gap-1.5 uppercase font-sans">
          <AlertTriangle className="w-3.5 h-3.5 animate-bounce" />
          {hazard.emoji} {hazard.label}
        </span>
        <span className="text-[9px] font-mono tracking-wider">
          {hazardSignal ? hazardSignal.source : t('advisory.awaitingFeed')}
        </span>
      </div>
      {/* The English rendering leads. This app is aimed at people in Japan who do
          not read Japanese, yet `bulletinEn` was computed for every hazard in
          jma.ts and rendered nowhere, so the one thing guaranteed to be Japanese
          was the official bulletin. The original text still follows, because it
          is the authoritative wording. */}
      <div className="p-3 space-y-2 text-[11px] font-mono leading-relaxed select-text">
        {hazardSignal ? (
          <>
            {hazardSignal.bulletinEn && <p>{hazardSignal.bulletinEn}</p>}
            {hazardSignal.bulletinJa && hazardSignal.bulletinJa !== hazardSignal.bulletinEn && (
              <p className="text-[10px] opacity-70 border-t border-current/15 pt-2">
                <span className="uppercase tracking-wider text-[8.5px] opacity-70 block mb-0.5">{t('advisory.original')}</span>
                {hazardSignal.bulletinJa}
              </p>
            )}
          </>
        ) : (
          <p>{t('advisory.fetching')}</p>
        )}
      </div>
    </div>
  );
}
