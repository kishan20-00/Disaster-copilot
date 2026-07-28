import { X, Radar, WifiOff, AlertTriangle, Footprints, Home, Eye, MapPin, Clock } from 'lucide-react';
import type { ThreatScanState, Severity } from '@/lib/impact';
import { fmtAge, fmtKm } from '@/lib/impact';
import { hazardInfo } from '@/constants/hazards';

interface AlertsSheetProps {
  show: boolean;
  threatScan: ThreatScanState | null;
  isSimulating: boolean;
  onClose: () => void;
  onRescan: () => void;
}

const SEVERITY_STYLE: Record<Severity, string> = {
  extreme: 'bg-red-950/30 border-red-500/45 text-red-200',
  severe: 'bg-orange-950/30 border-orange-500/45 text-orange-200',
  moderate: 'bg-amber-950/30 border-amber-500/45 text-amber-200',
  minor: 'bg-sky-950/25 border-sky-500/35 text-sky-200',
  none: 'bg-slate-900/60 border-slate-800/60 text-slate-300'
};

const RESPONSE_LABEL: Record<string, { text: string; Icon: typeof Footprints }> = {
  evacuate: { text: 'Evacuate', Icon: Footprints },
  shelter_in_place: { text: 'Shelter in place', Icon: Home },
  monitor: { text: 'Monitor', Icon: Eye }
};

// A list of every event the last scan actually found (evaluateThreats' `all`,
// worst-first) — not just the single hazard the pipeline is acting on. Every
// field shown is real: severity/distance/age come straight from
// assessImpact(); there is no confidence score, crowd-validation count, or
// duration estimate here because this app has no model that produces one.
export function AlertsSheet({ show, threatScan, isSimulating, onClose, onRescan }: AlertsSheetProps) {
  if (!show) return null;

  const events = threatScan?.verdict?.all ?? [];

  return (
    <div className="absolute inset-0 bg-black/75 backdrop-blur-sm z-50 flex flex-col justify-end animate-in fade-in duration-200">
      <div className="bg-slate-900 border-t border-slate-800 rounded-t-3xl max-h-[85%] flex flex-col animate-in slide-in-from-bottom duration-300">
        <div className="shrink-0 px-5 pt-4 pb-3 flex items-center justify-between border-b border-slate-800/60">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4.5 h-4.5 text-amber-400" />
            <h3 className="text-sm font-black text-white">Live Alerts</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 scrollbar-none">
          {!threatScan ? (
            <div className="py-8 text-center space-y-3">
              <Radar className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-[11px] text-slate-500 font-mono leading-relaxed max-w-[240px] mx-auto">
                No scan yet. Run a safety check to see live events near you.
              </p>
            </div>
          ) : threatScan.status === 'scanning' ? (
            <div className="py-8 text-center space-y-3">
              <Radar className="w-8 h-8 text-indigo-400 mx-auto animate-spin" style={{ animationDuration: '2.5s' }} />
              <p className="text-[11px] text-slate-400 font-mono">Scanning live hazard feeds…</p>
            </div>
          ) : threatScan.status === 'unavailable' ? (
            <div className="py-8 text-center space-y-3">
              <WifiOff className="w-8 h-8 text-amber-400 mx-auto" />
              <p className="text-[11px] text-amber-200/90 font-mono leading-relaxed max-w-[260px] mx-auto">
                No hazard feed could be reached, so this is not an all-clear. Retry once you have a connection.
              </p>
            </div>
          ) : events.length === 0 ? (
            <div className="py-8 text-center space-y-3">
              <AlertTriangle className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-[11px] text-slate-500 font-mono">No recent events found near you.</p>
            </div>
          ) : (
            events.map(({ hazard, impact }) => {
              const info = hazardInfo(hazard.hazard);
              const response = RESPONSE_LABEL[impact.response] ?? RESPONSE_LABEL.monitor;
              return (
                <div
                  key={hazard.id}
                  className={`border rounded-2xl p-3.5 space-y-2 ${SEVERITY_STYLE[impact.severity]}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10.5px] font-extrabold tracking-wider uppercase flex items-center gap-1.5">
                      <span>{info.emoji}</span>
                      {impact.severity === 'none' ? info.label : `${impact.severity} ${info.label}`}
                    </span>
                    {impact.affected && (
                      <span className="text-[9px] font-black uppercase tracking-wide bg-black/25 px-2 py-0.5 rounded-md shrink-0">
                        Acting on this
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] font-mono leading-snug break-words">{hazard.headline}</p>

                  {impact.affected && (
                    <div className="flex items-center gap-1.5 bg-black/25 rounded-xl px-2.5 py-1.5">
                      <response.Icon className="w-3.5 h-3.5 shrink-0" />
                      <span className="text-[10.5px] font-black uppercase tracking-wide">{response.text}</span>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-[9px] font-mono opacity-80">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {impact.distanceKm !== null ? `${fmtKm(impact.distanceKm)} away` : 'distance unknown'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {fmtAge(impact.ageMinutes)}
                    </span>
                    <span>{hazard.source}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="shrink-0 px-5 py-4 border-t border-slate-800/60">
          <button
            onClick={onRescan}
            disabled={isSimulating}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-45 disabled:pointer-events-none text-white rounded-xl text-[11px] font-black uppercase tracking-wide transition active:scale-95 flex items-center justify-center gap-1.5"
          >
            <Radar className="w-3.5 h-3.5" />
            Rescan
          </button>
        </div>
      </div>
    </div>
  );
}
