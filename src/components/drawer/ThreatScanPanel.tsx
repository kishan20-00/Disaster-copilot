import { Radar, ShieldCheck, AlertTriangle, WifiOff, Clock, MapPin } from 'lucide-react';
import type { ThreatScanState } from '@/lib/impact';

interface ThreatScanPanelProps {
  scan: ThreatScanState | null;
}

const SEVERITY_STYLE: Record<string, string> = {
  extreme: 'bg-red-950/30 border-red-500/45 text-red-200',
  severe: 'bg-orange-950/30 border-orange-500/45 text-orange-200',
  moderate: 'bg-amber-950/30 border-amber-500/45 text-amber-200',
  minor: 'bg-sky-950/25 border-sky-500/35 text-sky-200',
  none: 'bg-slate-950/40 border-slate-800/60 text-slate-300'
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
      <div className="bg-slate-950/60 border border-indigo-500/25 rounded-2xl p-3.5 flex items-center gap-2.5 animate-in fade-in duration-200">
        <Radar className="w-4 h-4 text-indigo-400 animate-spin shrink-0" style={{ animationDuration: '2.5s' }} />
        <div className="min-w-0">
          <span className="text-[10.5px] font-extrabold tracking-wider uppercase font-sans text-indigo-300 block">
            Scanning live hazard feeds
          </span>
          <span className="text-[9.5px] font-mono text-slate-500">
            JMA earthquake · tsunami · typhoon · USGS worldwide
          </span>
        </div>
      </div>
    );
  }

  if (scan.status === 'unavailable') {
    return (
      <div className="bg-amber-950/25 border border-amber-500/40 rounded-2xl p-3.5 space-y-1.5">
        <div className="flex items-center gap-2">
          <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-[10.5px] font-extrabold tracking-wider uppercase font-sans text-amber-300">
            Threat status unknown
          </span>
        </div>
        <p className="text-[10px] text-slate-300 font-mono leading-relaxed">
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
      <div className="bg-emerald-950/20 border border-emerald-500/35 rounded-2xl p-3.5 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-[10.5px] font-extrabold tracking-wider uppercase font-sans text-emerald-300">
              No active threat at your location
            </span>
          </div>
          <span className="text-[9px] font-mono text-slate-500 shrink-0">
            {scan.verdict?.all.length ?? 0} events
          </span>
        </div>

        {closest && (
          <div className="border-t border-emerald-500/15 pt-2 space-y-1">
            <span className="text-slate-500 uppercase tracking-wide font-bold text-[9px]">
              Closest recent event
            </span>
            <p className="text-[10.5px] text-slate-200 font-mono leading-snug break-words">
              {closest.hazard.headline}
            </p>
            <p className="text-[9.5px] text-slate-400 font-mono leading-relaxed">{closest.impact.basis}</p>
          </div>
        )}

        <p className="text-[9px] font-mono text-slate-500 border-t border-emerald-500/10 pt-1.5">
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

  return (
    <div className={`border rounded-2xl p-3.5 space-y-2 shadow-lg animate-in fade-in duration-300 ${tone}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <AlertTriangle className="w-4 h-4 shrink-0 animate-pulse" />
          <span className="text-[10.5px] font-extrabold tracking-wider uppercase font-sans truncate">
            {worst.impact.severity} {worst.hazard.hazard} — affects you
          </span>
        </div>
        {worst.impact.leadTimeHours !== null && worst.impact.leadTimeHours > 0 && (
          <span className="text-[9px] font-mono font-bold shrink-0 flex items-center gap-1">
            <Clock className="w-3 h-3" />+{worst.impact.leadTimeHours}h
          </span>
        )}
      </div>

      <p className="text-[10.5px] font-mono leading-snug break-words">{worst.hazard.headline}</p>

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
