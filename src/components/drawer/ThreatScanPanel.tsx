import { Radar, ShieldCheck, AlertTriangle, WifiOff, Clock, MapPin, Home, Footprints, Eye } from 'lucide-react';
import { hazardInfo } from '@/constants/hazards';
import type { ThreatScanState } from '@/lib/impact';

interface ThreatScanPanelProps {
  scan: ThreatScanState | null;
}

const SEVERITY_STYLE: Record<string, string> = {
  extreme: 'bg-red-50 border-red-300 text-red-800',
  severe: 'bg-orange-50 border-orange-300 text-orange-800',
  moderate: 'bg-amber-50 border-amber-300 text-amber-800',
  minor: 'bg-sky-50 border-sky-300 text-sky-800',
  none: 'bg-slate-50 border-slate-200 text-slate-600'
};

const fmtDistance = (km: number | null) =>
  km === null ? 'distance unknown' : km < 10 ? `${km.toFixed(1)} km away` : `${Math.round(km)} km away`;

// Result of the live hazard scan: what was checked, what was found, and whether
// it reaches the user. Shown instead of a hazard picker — the hazard is detected,
// not selected.
export function ThreatScanPanel({ scan }: ThreatScanPanelProps) {
  if (!scan) return null;

  if (scan.status === 'scanning') {
    return (
      <div className="bg-slate-50 border border-indigo-300 rounded-2xl p-3.5 flex items-center gap-2.5 animate-in fade-in duration-200">
        <Radar className="w-4 h-4 text-indigo-500 animate-spin shrink-0" style={{ animationDuration: '2.5s' }} />
        <div className="min-w-0">
          <span className="text-[10.5px] font-extrabold tracking-wider uppercase font-sans text-indigo-600 block">
            Scanning live hazard feeds
          </span>
          <span className="text-[9.5px] font-mono text-slate-500">
            JMA quake/tsunami/typhoon · USGS · GDACS worldwide
          </span>
        </div>
      </div>
    );
  }

  if (scan.status === 'unavailable') {
    return (
      <div className="bg-amber-50 border border-amber-300 rounded-2xl p-3.5 space-y-1.5">
        <div className="flex items-center gap-2">
          <WifiOff className="w-4 h-4 text-amber-500 shrink-0" />
          <span className="text-[10.5px] font-extrabold tracking-wider uppercase font-sans text-amber-700">
            Threat status unknown
          </span>
        </div>
        <p className="text-[10px] text-slate-600 font-mono leading-relaxed">
          No hazard feed could be reached, so this is <strong>not</strong> an all-clear. Retry once you have a
          connection.
        </p>
        {!!scan.sourcesFailed.length && (
          <p className="text-[9px] font-mono text-slate-500">Failed: {scan.sourcesFailed.join(', ')}</p>
        )}
      </div>
    );
  }

  if (scan.status === 'clear') {
    const closest = scan.verdict?.all[0];
    return (
      <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-3.5 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="text-[10.5px] font-extrabold tracking-wider uppercase font-sans text-emerald-700">
              No active threat at your location
            </span>
          </div>
          <span className="text-[9px] font-mono text-slate-500 shrink-0">
            {scan.verdict?.all.length ?? 0} events
          </span>
        </div>

        {closest && (
          <div className="border-t border-emerald-300/60 pt-2 space-y-1">
            <span className="text-slate-500 uppercase tracking-wide font-bold text-[9px]">
              Closest recent event
            </span>
            <p className="text-[10.5px] text-slate-800 font-mono leading-snug break-words">
              {closest.hazard.headline}
            </p>
            <p className="text-[9.5px] text-slate-500 font-mono leading-relaxed">{closest.impact.basis}</p>
          </div>
        )}

        <p className="text-[9px] font-mono text-slate-500 border-t border-emerald-300/40 pt-1.5">
          Checked {scan.sourcesQueried.join(' · ')}
          {scan.sourcesFailed.length ? ` — unreachable: ${scan.sourcesFailed.join(', ')}` : ''}
        </p>
      </div>
    );
  }

  // status === 'threat'
  const worst = scan.verdict?.worst;
  if (!worst) return null;
  const tone = SEVERITY_STYLE[worst.impact.severity] ?? SEVERITY_STYLE.none;
  const info = hazardInfo(worst.hazard.hazard);

  // What to DO is the single most important thing on this card — a typhoon that
  // reaches you means stay inside, not evacuate.
  const action = worst.impact.response === 'evacuate'
    ? { Icon: Footprints, text: 'Evacuate now', hint: info.rationale }
    : worst.impact.response === 'shelter_in_place'
    ? { Icon: Home, text: 'Stay inside — do not evacuate', hint: info.rationale }
    : { Icon: Eye, text: 'Monitor only', hint: info.rationale };

  return (
    <div className={`border rounded-2xl p-3.5 space-y-2 shadow-lg animate-in fade-in duration-300 ${tone}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <AlertTriangle className="w-4 h-4 shrink-0 animate-pulse" />
          <span className="text-[10.5px] font-extrabold tracking-wider uppercase font-sans truncate">
            {worst.impact.severity} {info.label} — affects you
          </span>
        </div>
        {worst.impact.leadTimeHours !== null && worst.impact.leadTimeHours > 0 && (
          <span className="text-[9px] font-mono font-bold shrink-0 flex items-center gap-1">
            <Clock className="w-3 h-3" />+{worst.impact.leadTimeHours}h
          </span>
        )}
      </div>

      <p className="text-[10.5px] font-mono leading-snug break-words">{worst.hazard.headline}</p>

      <div className="flex items-start gap-2 bg-white/60 rounded-xl px-2.5 py-2 border border-current/20">
        <action.Icon className="w-4 h-4 shrink-0 mt-0.5" />
        <div className="min-w-0">
          <span className="text-[11px] font-black uppercase tracking-wide block">{action.text}</span>
          <span className="text-[9.5px] font-mono opacity-80 leading-snug">{action.hint}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[9px] font-mono opacity-80">
        <span className="flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          {fmtDistance(worst.impact.distanceKm)}
        </span>
        {worst.impact.estimatedMmi !== null && (
          <span>est. intensity MMI {worst.impact.estimatedMmi.toFixed(1)}</span>
        )}
        <span>{worst.hazard.source}</span>
      </div>

      <p className="text-[9.5px] font-mono leading-relaxed opacity-90 border-t border-current/15 pt-1.5">
        {worst.impact.basis}
      </p>
    </div>
  );
}
