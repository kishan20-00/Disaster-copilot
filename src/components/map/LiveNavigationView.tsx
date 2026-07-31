import { ArrowLeft, Search, AlertTriangle, Layers, Camera, X, RotateCcw, Mic, ShieldCheck } from 'lucide-react';
import type { Hazard } from '@/types/domain';
import type { ThreatScanState } from '@/lib/impact';
import type { LatLng } from '@/services/geolocation';
import type { WalkingRoute } from '@/services/maps';
import { haversineMeters, formatDistance, bearingDegrees } from '@/services/maps';
import { hazardInfo } from '@/constants/hazards';

interface LiveNavigationViewProps {
  activeHazard: Hazard;
  threatScan: ThreatScanState | null;
  liveRoute: WalkingRoute | null;
  liveShelter: { name: string; distanceMeters: number; lat: number; lng: number } | null;
  livePosition: LatLng | null;
  isSimulating: boolean;
  isListening: boolean;
  heardText: string;
  mapLayer: string;
  onCycleLayer: () => void;
  cameraMode: boolean;
  onToggleCamera: () => void;
  onTriggerAlert: () => void;
  onExitToBrowse: () => void;
  onEndNavigation: () => void;
}

export const LAYER_ORDER = ['streets', 'satellite', 'traffic', 'hazard'];

// Full-screen turn-by-turn-style overlay, shown once a route is actually in
// progress. Sits on top of the SAME real Google Map the browsing view uses —
// it does not redraw its own map, so every marker underneath (hazard, shelter,
// route line) is the live one already owned by useGoogleMaps. Per the source
// mockup's own "Destination Rule" note, the bottom tab bar is suppressed here
// (see App.tsx) since this is a focused, single-purpose screen.
export function LiveNavigationView({
  activeHazard, threatScan, liveRoute, liveShelter, livePosition, isSimulating,
  isListening, heardText, mapLayer, onCycleLayer, cameraMode, onToggleCamera,
  onTriggerAlert, onExitToBrowse, onEndNavigation
}: LiveNavigationViewProps) {
  const destination = liveShelter ? { lat: liveShelter.lat, lng: liveShelter.lng } : null;
  const bearing = livePosition && destination ? bearingDegrees(livePosition, destination) : null;
  const remainingM = livePosition && destination ? haversineMeters(livePosition, destination) : null;

  // Approximate progress: straight-line remaining vs. the route's total walking
  // distance. Not path-accurate (it doesn't know the route bends), but it is a
  // real number derived from live GPS, not a fixed placeholder fill.
  const progress = remainingM !== null && liveRoute?.distanceMeters
    ? Math.max(0, Math.min(1, 1 - remainingM / liveRoute.distanceMeters))
    : 0;

  const worst = threatScan?.status === 'threat' ? threatScan.verdict?.worst ?? null : null;
  const info = hazardInfo(activeHazard);
  const now = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  return (
    <div className="absolute inset-0 z-40 flex flex-col pointer-events-none">
      {/* Top bar */}
      <div className="pt-[max(3rem,var(--safe-top))] px-4 flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-2">
          <button
            onClick={onExitToBrowse}
            className="w-11 h-11 rounded-full bg-white/85 backdrop-blur border border-slate-200 text-slate-700 flex items-center justify-center shadow-lg active:scale-95 transition"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <button
            onClick={onExitToBrowse}
            className="h-9 px-3.5 rounded-full bg-white/85 backdrop-blur border border-slate-200 text-slate-600 text-[11px] font-bold flex items-center gap-1.5 shadow-lg active:scale-95 transition"
          >
            <Search className="w-3.5 h-3.5" />
            Search
          </button>
        </div>
        <button
          onClick={onTriggerAlert}
          disabled={isSimulating}
          className="h-9 px-4 rounded-full bg-red-600 hover:bg-red-500 text-white text-[10.5px] font-black uppercase tracking-wide shadow-lg active:scale-95 disabled:opacity-45 transition"
        >
          SOS
        </button>
      </div>

      <div className="px-4 pt-3 flex flex-col gap-3 pointer-events-auto">
        {isSimulating && (
          <div className="self-center bg-white/90 backdrop-blur border border-indigo-500/40 rounded-full px-3 py-1.5 flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-400" />
            </span>
            <span className="text-[10.5px] font-bold text-slate-700">Rerouting…</span>
          </div>
        )}

        {/* Direction card */}
        <div className="bg-white/90 backdrop-blur-md border border-slate-200 rounded-3xl p-5 flex items-center gap-4 shadow-xl">
          <div
            className="w-16 h-16 rounded-full bg-indigo-600 flex items-center justify-center shrink-0 shadow-md transition-transform"
            style={{ transform: bearing !== null ? `rotate(${bearing}deg)` : undefined }}
          >
            <ArrowLeft className="w-8 h-8 text-white" style={{ transform: 'rotate(135deg)' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xl font-black text-slate-900 leading-tight truncate">
              Head toward {liveShelter?.name ?? 'your shelter'}
            </p>
            <p className="text-lg text-indigo-600 font-bold mt-0.5">
              {remainingM !== null ? `${formatDistance(remainingM)} remaining` : (liveRoute?.distanceText ?? '—')}
            </p>
          </div>
        </div>

        {worst && (
          <div className="self-end bg-red-950/80 backdrop-blur border border-red-500/40 text-red-200 text-[10.5px] font-bold px-3.5 py-2 rounded-full shadow-lg flex items-center gap-1.5">
            <span>{info.emoji}</span>
            {info.label}
            {worst.impact.distanceKm !== null ? ` · ${Math.round(worst.impact.distanceKm)} km` : ''}
          </div>
        )}
      </div>

      {/* Right-side FABs */}
      <div className="absolute right-4 bottom-[calc(16rem+var(--safe-bottom))] flex flex-col gap-3 pointer-events-auto">
        <button
          onClick={onCycleLayer}
          className={`w-11 h-11 rounded-full flex items-center justify-center shadow-lg border transition active:scale-95 ${
            mapLayer !== 'streets'
              ? 'bg-indigo-600 border-indigo-400 text-white'
              : 'bg-white/85 backdrop-blur border-slate-200 text-slate-600'
          }`}
          title={`Layer: ${mapLayer}`}
        >
          <Layers className="w-4.5 h-4.5" />
        </button>
        <button
          onClick={onToggleCamera}
          className={`w-13 h-13 rounded-full flex items-center justify-center shadow-lg border transition active:scale-95 ${
            cameraMode
              ? 'bg-violet-600 border-violet-400 text-white'
              : 'bg-indigo-600 border-indigo-400 text-white'
          }`}
          title="AR guidance"
        >
          <Camera className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1" />

      {/* Live voice transcript — only while actually listening, showing real
          heard text, never a scripted quote. */}
      {(isListening || heardText) && (
        <div className="px-4 mb-3 pointer-events-auto">
          <div className="bg-black/70 backdrop-blur rounded-xl p-3 flex items-center gap-2.5">
            <Mic className={`w-4 h-4 text-white shrink-0 ${isListening ? 'animate-pulse' : ''}`} />
            <p className="text-white text-[12.5px] font-medium italic truncate">
              {heardText ? `"${heardText}"` : 'Listening…'}
            </p>
          </div>
        </div>
      )}

      {/* Bottom sheet. The tab bar is suppressed on this screen, so this runs to
          the very bottom edge and has to clear the home indicator itself — End
          and Reroute are the two buttons you least want half-covered. */}
      <div className="bg-white border-t border-slate-200 rounded-t-[32px] px-4 pt-3 pb-[calc(1.5rem+var(--safe-bottom))] pointer-events-auto relative overflow-hidden">
        <div className="absolute top-0 left-0 h-1 bg-slate-200 w-full">
          <div className="h-full bg-indigo-500 transition-all" style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
        <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-4 mt-2" />
        <div className="flex justify-between items-end mb-5">
          <div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight">{liveRoute?.durationText ?? '—'}</h2>
            <p className="text-sm text-slate-500 flex items-center gap-2 mt-1.5 font-medium">
              {liveRoute?.distanceText ?? '—'}
              <span className="w-1 h-1 bg-slate-300 rounded-full" />
              {now}
            </p>
          </div>
          <div className={`font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 text-[11px] ${
            worst ? 'bg-red-500/15 text-red-300 border border-red-500/30' : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
          }`}>
            {worst ? <AlertTriangle className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
            {worst ? 'Hazard nearby' : 'Path Clear'}
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onEndNavigation}
            className="flex-1 h-13 py-3.5 rounded-full bg-red-600/15 border border-red-500/40 text-red-300 font-bold flex items-center justify-center gap-2 active:scale-95 transition"
          >
            <X className="w-4 h-4" />
            End
          </button>
          <button
            onClick={onTriggerAlert}
            disabled={isSimulating}
            className="flex-[2] h-13 py-3.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-md flex items-center justify-center gap-2 active:scale-95 disabled:opacity-45 transition"
          >
            <RotateCcw className="w-4 h-4" />
            Reroute
          </button>
        </div>
      </div>
    </div>
  );
}
