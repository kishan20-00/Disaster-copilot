import { AlertTriangle } from 'lucide-react';
import type { Hazard, HazardSignal } from '@/types/domain';

interface HazardAdvisoryProps {
  activeHazard: Hazard;
  hazardSignal: HazardSignal | null;
}

export function HazardAdvisory({ activeHazard, hazardSignal }: HazardAdvisoryProps) {
  return (
    <div className={`border rounded-2xl overflow-hidden shadow-lg animate-in fade-in duration-300 ${
      activeHazard === 'earthquake' ? 'bg-red-950/20 border-red-500/35 text-red-200' :
      activeHazard === 'typhoon' ? 'bg-sky-950/20 border-sky-500/35 text-sky-200' :
      'bg-amber-950/20 border-amber-500/35 text-amber-200'
    }`}>
      <div className={`px-3 py-2 flex items-center justify-between text-[10.5px] font-bold border-b ${
        activeHazard === 'earthquake' ? 'bg-red-950/60 border-red-500/20' :
        activeHazard === 'typhoon' ? 'bg-sky-950/60 border-sky-500/20' :
        'bg-amber-950/60 border-amber-500/20'
      }`}>
        <span className="flex items-center gap-1.5 uppercase font-sans">
          <AlertTriangle className="w-3.5 h-3.5 animate-bounce" />
          {activeHazard === 'earthquake' ? '気象庁 地震緊急警報 (JMA)' : activeHazard === 'typhoon' ? '特別台風警報 (JMA)' : '大津波警報発表 (JMA)'}
        </span>
        <span className="text-[9px] font-mono tracking-wider">
          {hazardSignal ? hazardSignal.source : 'AWAITING FEED'}
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
                <span className="uppercase tracking-wider text-[8.5px] opacity-70 block mb-0.5">Original (JMA)</span>
                {hazardSignal.bulletinJa}
              </p>
            )}
          </>
        ) : (
          <p>Fetching the official bulletin…</p>
        )}
      </div>
    </div>
  );
}
