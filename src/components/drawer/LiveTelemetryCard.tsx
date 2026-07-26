import { Navigation, MapPin, Shield, Compass } from 'lucide-react';
import type { LatLng } from '@/services/geolocation';
import type { WalkingRoute } from '@/services/maps';
import { getShelterInfo } from '@/lib/shelter';

interface LiveTelemetryCardProps {
  livePosition: LatLng | null;
  liveAddress: string | null;
  liveShelter: { name: string } | null;
  liveRoute: WalkingRoute | null;
  dynamicMarkers: any[];
  shelterSource: 'official' | 'places' | null;
  /** Non-null while examining a searched place rather than the user's own. */
  focusName: string | null;
}

export function LiveTelemetryCard({
  livePosition, liveAddress, liveShelter, liveRoute, dynamicMarkers, shelterSource, focusName
}: LiveTelemetryCardProps) {
  // Straight-line distance to the nearest real shelter. Available as soon as GPS
  // and Places have landed, so the card is useful before any alert is triggered
  // — the walking route below only exists once the pipeline has run.
  const nearest = getShelterInfo(livePosition, dynamicMarkers);
  const hasShelter = !!liveShelter || nearest.distance !== '—';
  const shelterName = liveShelter?.name ?? (hasShelter ? nearest.name : null);

  return (
    <div className="bg-slate-950/60 border border-slate-800/60 rounded-2xl p-3.5 space-y-2">
      <div className="flex items-center gap-1.5 text-slate-300 pb-1.5 border-b border-slate-900/60">
        <Navigation className="w-4 h-4 text-emerald-400" />
        <span className="text-[10.5px] font-extrabold tracking-wider uppercase font-sans">Live Telemetry</span>
        <span className="ml-auto text-[9px] font-mono uppercase text-slate-500">
          {focusName ? 'VIEWING ELSEWHERE' : livePosition ? 'GPS LOCKED' : 'AWAITING GPS'}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-1.5 text-[10.5px] font-mono">
        <div className="flex items-start gap-1.5">
          <MapPin className="w-3 h-3 text-indigo-400 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-slate-500 uppercase tracking-wide font-bold text-[9px]">
              {focusName ? 'Checking' : 'You are at'}
            </span>
            <p className="text-slate-200 leading-snug break-words">
              {focusName || liveAddress || (livePosition
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
              {shelterName ?? 'Awaiting Places data…'}
            </p>
            {hasShelter && (
              <p className="text-slate-500 text-[9.5px] leading-snug mt-0.5">
                {nearest.distance} away · straight line
              </p>
            )}
            {shelterSource && (
              <p className={`text-[9px] font-mono leading-snug mt-0.5 ${
                shelterSource === 'official' ? 'text-emerald-500' : 'text-amber-500'
              }`}>
                {shelterSource === 'official'
                  ? '✓ officially designated for this hazard'
                  : '⚠ no official register here — nearby place, not a shelter'}
              </p>
            )}
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
    </div>
  );
}
