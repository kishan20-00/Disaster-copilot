import type { RefObject } from 'react';
import { Navigation } from 'lucide-react';
import type { ActionStep, Hazard } from '@/types/domain';
import type { WalkingRoute } from '@/services/maps';

interface AROverlayProps {
  cameraMode: boolean;
  cameraRef: RefObject<HTMLVideoElement | null>;
  currentStep: number;
  activeHazard: Hazard;
  shelterName: string;
  shelterDistance: string;
  liveRoute: WalkingRoute | null;
  firstStep: ActionStep | undefined;
}

// Rear-camera AR view: live feed + hazard/shelter/direction overlays.
export function AROverlay({
  cameraMode, cameraRef, currentStep, activeHazard,
  shelterName, shelterDistance, liveRoute, firstStep
}: AROverlayProps) {
  if (!cameraMode) return null;
  return (
    <>
      {/* AR LIVE CAMERA FEED */}
      <video
        ref={cameraRef}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ zIndex: 2 }}
        playsInline
        muted
      />

      {/* AR OVERLAY — layered above camera feed, below all UI controls */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-between pointer-events-none px-4 pt-24 pb-44"
        style={{ zIndex: 12 }}
      >
        {/* Hazard type badge */}
        {currentStep >= 0 && (
          <div className={`rounded-2xl px-4 py-2 text-center border backdrop-blur-md ${
            activeHazard === 'earthquake' ? 'bg-red-900/70 border-red-500/60' :
            activeHazard === 'typhoon' ? 'bg-sky-900/70 border-sky-500/60' :
            'bg-amber-900/70 border-amber-500/60'
          }`}>
            <span className="text-white font-black text-xs uppercase tracking-widest">
              {activeHazard === 'earthquake' ? '⚠️ EARTHQUAKE ALERT' :
               activeHazard === 'typhoon' ? '🌀 TYPHOON WARNING' : '🌊 TSUNAMI WARNING'}
            </span>
          </div>
        )}

        {/* Center: direction arrow + shelter callout */}
        <div className="flex flex-col items-center gap-3">
          {currentStep >= 4 ? (
            <>
              <div
                className="w-24 h-24 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center backdrop-blur-sm"
                style={{ boxShadow: '0 0 40px rgba(52,211,153,0.3)' }}
              >
                <Navigation className="w-12 h-12 text-emerald-400" style={{ transform: 'rotate(-45deg)' }} />
              </div>
              <div className="bg-slate-900/80 backdrop-blur-md border border-emerald-500/40 rounded-2xl px-5 py-3 text-center">
                <p className="text-emerald-400 font-black text-base leading-tight">
                  {shelterName}
                </p>
                <p className="text-white/60 text-[11px] font-mono mt-0.5">
                  {liveRoute
                    ? `${liveRoute.distanceText} · ${liveRoute.durationText}`
                    : shelterDistance}
                </p>
              </div>
            </>
          ) : (
            <div className="bg-slate-900/75 backdrop-blur-md border border-slate-700/60 rounded-2xl px-5 py-3 text-center">
              <p className="text-slate-300 text-xs font-mono">Trigger alert to activate AR navigation</p>
            </div>
          )}
        </div>

        {/* Bottom: current action step card */}
        {currentStep >= 4 && firstStep && (
          <div className="w-full bg-slate-950/90 backdrop-blur-md border border-indigo-500/30 rounded-2xl p-4 shadow-2xl">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center text-[9px] font-black text-white shrink-0">1</div>
              <span className="text-white font-black text-sm leading-tight">{firstStep.title}</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed font-mono">{firstStep.desc}</p>
          </div>
        )}
      </div>
    </>
  );
}
