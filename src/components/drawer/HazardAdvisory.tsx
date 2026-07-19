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
      <div className="p-3 text-[11px] font-mono leading-relaxed select-text">
        {hazardSignal
          ? hazardSignal.bulletinJa
          : activeHazard === 'earthquake' ? '気象庁の地震速報を取得しています…'
          : activeHazard === 'typhoon' ? '気象庁の台風情報を取得しています…'
          : '気象庁の津波警報を取得しています…'}
      </div>
    </div>
  );
}
