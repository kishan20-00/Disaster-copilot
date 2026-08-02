import { useEffect, useRef, type RefObject } from 'react';
import { Navigation, ArrowUp } from 'lucide-react';
import type { ActionStep, Hazard } from '@/types/domain';
import type { WalkingRoute } from '@/services/maps';
import type { LatLng } from '@/services/geolocation';
import { bearingDegrees } from '@/services/maps';
import { hazardInfo, hazardLabel } from '@/constants/hazards';
import { useDeviceHeading } from '@/hooks/useDeviceHeading';
import { useT } from '@/i18n/context';

interface AROverlayProps {
  cameraMode: boolean;
  cameraRef: RefObject<HTMLVideoElement | null>;
  currentStep: number;
  activeHazard: Hazard;
  shelterName: string;
  shelterDistance: string;
  liveRoute: WalkingRoute | null;
  firstStep: ActionStep | undefined;
  /** Live GPS position — origin for the real-world bearing to the shelter. */
  livePosition: LatLng | null;
  /** Chosen shelter's coordinates — target of the bearing. */
  shelterPos: LatLng | null;
}

// How close (in degrees) the phone must point to the shelter bearing before we
// call it "on course" — drives both the green arrow lock and the haptic pulse.
const ON_COURSE_TOLERANCE = 22;

// Rear-camera AR view: live feed + hazard/shelter/direction overlays. The
// direction arrow is anchored to the real world using the device compass
// (heading) and the GPS bearing to the shelter, so it points where the user
// must actually turn — not at a fixed decorative angle. A gentle haptic pulse
// confirms "on course" for eyes-free / low-visibility (smoke, dust) navigation.
export function AROverlay({
  cameraMode, cameraRef, currentStep, activeHazard,
  shelterName, shelterDistance, liveRoute, firstStep, livePosition, shelterPos
}: AROverlayProps) {
  const t = useT();
  // Only listen to the compass while the camera is actually up and a route is
  // ready — no point spinning the sensor (or prompting for it on iOS) otherwise.
  const navigating = cameraMode && currentStep >= 4;
  const heading = useDeviceHeading(navigating);

  // Absolute GPS bearing to the shelter, then rotate it into the phone's frame:
  // relative = bearingToShelter - deviceHeading. When the compass is unavailable
  // (heading null), fall back to the raw bearing so the arrow is still meaningful
  // relative to north rather than a hardcoded 45°.
  const absBearing = livePosition && shelterPos ? bearingDegrees(livePosition, shelterPos) : null;
  const relBearing = absBearing === null ? null
    : heading === null ? absBearing
    : ((absBearing - heading) % 360 + 360) % 360;

  // Signed offset from straight-ahead in [-180, 180]; |offset| small = on course.
  const offset = relBearing === null ? null : relBearing > 180 ? relBearing - 360 : relBearing;
  const onCourse = offset !== null && Math.abs(offset) <= ON_COURSE_TOLERANCE;

  // Haptic compass: a short pulse the moment the user swings onto the correct
  // bearing (rising edge only), so pointing the phone the right way is felt, not
  // just seen. Guarded to fire once per entry into the on-course cone.
  const wasOnCourse = useRef(false);
  useEffect(() => {
    if (!navigating) { wasOnCourse.current = false; return; }
    if (onCourse && !wasOnCourse.current) navigator.vibrate?.(35);
    wasOnCourse.current = onCourse;
  }, [navigating, onCourse]);

  if (!cameraMode) return null;
  const hazard = hazardInfo(activeHazard);
  const hasBearing = relBearing !== null;

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
              {hazard.emoji} {hazardLabel(activeHazard)} {t('ar.alertSuffix')}
            </span>
          </div>
        )}

        {/* Center: direction arrow + shelter callout */}
        <div className="flex flex-col items-center gap-3">
          {currentStep >= 4 ? (
            <>
              <div
                className={`w-24 h-24 rounded-full flex items-center justify-center backdrop-blur-sm border-2 transition-colors duration-300 ${
                  onCourse ? 'bg-emerald-500/25 border-emerald-400' : 'bg-white/15 border-white/70'
                }`}
                style={{ boxShadow: onCourse ? '0 0 40px rgba(52,211,153,0.4)' : '0 0 24px rgba(0,0,0,0.35)' }}
              >
                {/* Arrow rotates to the real bearing. lucide's Navigation points
                    up-right (~45°) by default, so subtract 45 to make 0° = up =
                    straight ahead, then add the relative bearing. */}
                <Navigation
                  className={`w-12 h-12 transition-transform duration-200 ${onCourse ? 'text-emerald-300' : 'text-white'}`}
                  style={{ transform: `rotate(${hasBearing ? relBearing! - 45 : -45}deg)` }}
                />
              </div>
              {/* Turn instruction derived from the live offset. */}
              {hasBearing && (
                <div className={`rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wide backdrop-blur-md border ${
                  onCourse ? 'bg-emerald-500/85 border-emerald-300 text-white' : 'bg-black/55 border-white/30 text-white'
                }`}>
                  {onCourse ? t('ar.onCourse')
                    : offset! > 0 ? t('ar.turnRight')
                    : t('ar.turnLeft')}
                </div>
              )}
              <div className="bg-white/80 backdrop-blur-md border border-emerald-500/40 rounded-2xl px-5 py-3 text-center">
                <p className="text-emerald-600 font-black text-base leading-tight">
                  {shelterName}
                </p>
                <p className="text-slate-500 text-[11px] font-mono mt-0.5">
                  {liveRoute
                    ? `${liveRoute.distanceText} · ${liveRoute.durationText}`
                    : shelterDistance}
                </p>
              </div>
            </>
          ) : (
            <div className="bg-white/75 backdrop-blur-md border border-slate-200 rounded-2xl px-5 py-3 text-center">
              <p className="text-slate-600 text-xs font-mono">{t('ar.standby')}</p>
            </div>
          )}
        </div>

        {/* Bottom: current action step card */}
        {currentStep >= 4 && firstStep && (
          <div className="w-full bg-white/90 backdrop-blur-md border border-indigo-500/30 rounded-2xl p-4 shadow-2xl">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center text-[9px] font-black text-white shrink-0">1</div>
              <span className="text-slate-900 font-black text-sm leading-tight">{firstStep.title}</span>
            </div>
            <p className="text-slate-600 text-[11px] leading-relaxed font-mono">{firstStep.desc}</p>
          </div>
        )}
      </div>

      {/* Heads-up safety prompt: keep users from walking face-down into a hazard
          while holding the phone up. Shown while actively navigating in camera
          mode; the compass/arrow does the guiding so eyes can stay on the path. */}
      {navigating && (
        <div
          className="absolute left-1/2 -translate-x-1/2 top-16 pointer-events-none"
          style={{ zIndex: 13 }}
        >
          <div className="flex items-center gap-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/25 px-3 py-1.5 animate-pulse">
            <ArrowUp className="w-3.5 h-3.5 text-amber-300" />
            <span className="text-white text-[10.5px] font-bold">{t('ar.lookUp')}</span>
          </div>
        </div>
      )}
    </>
  );
}
