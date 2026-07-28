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
  extreme: 'bg-red-50 border-red-300 text-red-800',
  severe: 'bg-orange-50 border-orange-300 text-orange-800',
  moderate: 'bg-amber-50 border-amber-300 text-amber-800',
  minor: 'bg-sky-50 border-sky-300 text-sky-800',
  none: 'bg-slate-50 border-slate-200 text-slate-600'
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
      <div className="bg-white border-t border-slate-200 rounded-t-3xl max-h-[85%] flex flex-col animate-in slide-in-from-bottom duration-300">
        <div className="shrink-0 px-5 pt-4 pb-3 flex items-center justify-between border-b border-slate-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4.5 h-4.5 text-amber-500" />
            <div>
              <h3 className="text-sm font-black text-slate-900 leading-tight">Live Alerts</h3>
              <p className="text-[9.5px] text-slate-500 font-mono">Live updates in your area</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {/* Rescan is a small secondary control, not a full-width bar: on an
                alerts feed the primary action is reading, not re-scanning. It
                doubles as the live-state cue — the radar spins while a scan is
                in flight. */}
            <button
              onClick={onRescan}
              disabled={isSimulating}
              className="flex items-center gap-1 pl-2 pr-2.5 py-1.5 rounded-full bg-indigo-50 hover:bg-indigo-100 text-indigo-600 disabled:opacity-45 disabled:pointer-events-none transition active:scale-95"
              title="Rescan hazard feeds"
            >
              <Radar className={`w-3.5 h-3.5 ${isSimulating ? 'animate-spin' : ''}`} style={{ animationDuration: '2.5s' }} />
              <span className="text-[9.5px] font-black uppercase tracking-wide">{isSimulating ? 'Scanning' : 'Rescan'}</span>
            </button>
            <button onClick={onClose} className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 scrollbar-none">
          {!threatScan ? (
            <div className="py-8 text-center space-y-3">
              <Radar className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-[11px] text-slate-500 font-mono leading-relaxed max-w-[240px] mx-auto">
                No scan yet. Run a safety check to see live events near you.
              </p>
            </div>
          ) : threatScan.status === 'scanning' ? (
            <div className="py-8 text-center space-y-3">
              <Radar className="w-8 h-8 text-indigo-500 mx-auto animate-spin" style={{ animationDuration: '2.5s' }} />
              <p className="text-[11px] text-slate-500 font-mono">Scanning live hazard feeds…</p>
            </div>
          ) : threatScan.status === 'unavailable' ? (
            <div className="py-8 text-center space-y-3">
              <WifiOff className="w-8 h-8 text-amber-500 mx-auto" />
              <p className="text-[11px] text-amber-800/90 font-mono leading-relaxed max-w-[260px] mx-auto">
                No hazard feed could be reached, so this is not an all-clear. Retry once you have a connection.
              </p>
            </div>
          ) : events.length === 0 ? (
            <div className="py-8 text-center space-y-3">
              <AlertTriangle className="w-8 h-8 text-slate-300 mx-auto" />
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
                      <span className="text-[9px] font-black uppercase tracking-wide bg-white/60 px-2 py-0.5 rounded-md shrink-0">
                        Acting on this
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] font-mono leading-snug break-words">{hazard.headline}</p>

                  {impact.affected && (
                    <div className="flex items-center gap-1.5 bg-white/60 rounded-xl px-2.5 py-1.5">
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
      </div>
    </div>
  );
}
