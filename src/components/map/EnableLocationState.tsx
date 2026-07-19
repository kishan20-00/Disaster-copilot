import { MapPin, Compass, WifiOff } from 'lucide-react';
import type { LocationStatus } from '@/hooks/useGeolocation';

interface EnableLocationStateProps {
  mapsReady: boolean;
  status: LocationStatus;
  onRetry: () => void;
}

// Full-screen gate shown until we have BOTH the Maps API and a real GPS fix —
// the whole app is location-driven, so there is no meaningful Tokyo fallback.
export function EnableLocationState({ mapsReady, status, onRetry }: EnableLocationStateProps) {
  const mapsUnavailable = !mapsReady;
  const pending = mapsReady && status === 'pending';

  const icon = mapsUnavailable ? WifiOff : pending ? Compass : MapPin;
  const Icon = icon;

  const title = mapsUnavailable
    ? 'Maps unavailable'
    : pending
    ? 'Locating you…'
    : 'Enable location';

  const body = mapsUnavailable
    ? 'SafeRoute AI needs the Google Maps service to find shelters and routes near you. Check your connection, or configure VITE_GOOGLE_MAPS_API_KEY.'
    : pending
    ? 'Getting your position to map nearby shelters, water, and medical points.'
    : 'SafeRoute AI works from your real location. Allow location access so we can route you to the nearest safe shelter.';

  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center px-8 text-center bg-slate-950">
      <div
        className={`w-20 h-20 rounded-3xl border flex items-center justify-center mb-5 ${
          mapsUnavailable ? 'border-amber-500/40 bg-amber-500/10' : 'border-indigo-500/40 bg-indigo-500/10'
        }`}
      >
        <Icon className={`w-9 h-9 ${mapsUnavailable ? 'text-amber-400' : 'text-indigo-400'} ${pending ? 'animate-spin' : ''}`} style={pending ? { animationDuration: '4s' } : undefined} />
      </div>

      <h2 className="text-white font-black text-lg tracking-tight font-sans">{title}</h2>
      <p className="text-slate-400 text-xs leading-relaxed mt-2 max-w-[300px] font-mono">{body}</p>

      {!mapsUnavailable && !pending && (
        <button
          onClick={onRetry}
          className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-full shadow-lg hover:shadow-indigo-500/20 active:scale-95 transition-all"
        >
          <MapPin className="w-4 h-4" />
          Grant location access
        </button>
      )}

      {status === 'denied' && !mapsUnavailable && (
        <p className="text-slate-500 text-[10px] mt-4 max-w-[280px] font-mono">
          If you previously blocked it, enable location for this site in your browser settings, then retry.
        </p>
      )}
    </div>
  );
}
