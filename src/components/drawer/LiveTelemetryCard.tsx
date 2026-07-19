import { Navigation, MapPin, Shield, Compass } from 'lucide-react';
import type { Hazard, Language } from '@/types/domain';
import type { LatLng } from '@/services/geolocation';
import type { WalkingRoute } from '@/services/maps';
import { ScenarioSwitcher } from '@/components/drawer/ScenarioSwitcher';

interface LiveTelemetryCardProps {
  livePosition: LatLng | null;
  liveAddress: string | null;
  liveShelter: { name: string } | null;
  liveRoute: WalkingRoute | null;
  dynamicMarkers: any[];
  language: Language;
  activeHazard: Hazard;
  isSimulating: boolean;
  onSelectHazard: (hazard: Hazard) => void;
}

export function LiveTelemetryCard({
  livePosition, liveAddress, liveShelter, liveRoute, dynamicMarkers,
  language, activeHazard, isSimulating, onSelectHazard
}: LiveTelemetryCardProps) {
  return (
    <div className="bg-slate-950/60 border border-slate-800/60 rounded-2xl p-3.5 space-y-2">
      <div className="flex items-center gap-1.5 text-slate-300 pb-1.5 border-b border-slate-900/60">
        <Navigation className="w-4 h-4 text-emerald-400" />
        <span className="text-[10.5px] font-extrabold tracking-wider uppercase font-sans">Live Telemetry</span>
        <span className="ml-auto text-[9px] font-mono uppercase text-slate-500">
          {livePosition ? 'GPS LOCKED' : 'AWAITING GPS'}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-1.5 text-[10.5px] font-mono">
        <div className="flex items-start gap-1.5">
          <MapPin className="w-3 h-3 text-indigo-400 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-slate-500 uppercase tracking-wide font-bold text-[9px]">You are at</span>
            <p className="text-slate-200 leading-snug break-words">
              {liveAddress || (livePosition
                ? `${livePosition.lat.toFixed(5)}, ${livePosition.lng.toFixed(5)}`
                : 'Acquiring device location…')}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-1.5">
          <Shield className="w-3 h-3 text-emerald-400 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-slate-500 uppercase tracking-wide font-bold text-[9px]">Nearest shelter</span>
            <p className="text-slate-200 leading-snug break-words">
              {liveShelter
                ? `${liveShelter.name}`
                : (dynamicMarkers.find((m: any) => m.category === 'shelter')?.name || 'Awaiting Places data…')}
            </p>
          </div>
        </div>
        {liveRoute && (
          <div className="flex items-start gap-1.5">
            <Compass className="w-3 h-3 text-amber-400 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-slate-500 uppercase tracking-wide font-bold text-[9px]">Walking route</span>
              <p className="text-slate-200 leading-snug">
                {liveRoute.distanceText} · ETA {liveRoute.durationText}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Inline hazard scenario switcher — replaces the old setup form */}
      <ScenarioSwitcher
        language={language}
        activeHazard={activeHazard}
        isSimulating={isSimulating}
        onSelectHazard={onSelectHazard}
      />
    </div>
  );
}
