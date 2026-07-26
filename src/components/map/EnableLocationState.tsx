import { MapPin, Compass, WifiOff, ShieldAlert, Clock, SatelliteDish } from 'lucide-react';
import type { LocationState } from '@/hooks/useGeolocation';

interface EnableLocationStateProps {
  mapsReady: boolean;
  location: LocationState;
  onRetry: () => void;
}

// Full-screen gate shown until we have BOTH the Maps API and a real position —
// the whole app is location-driven, so there is no meaningful fallback.
//
// Each failure now gets its own remedy. Previously everything reported as
// "denied" and offered the same retry button, which on iOS could not possibly
// work: once the permission is blocked, the browser fails the request instantly
// without prompting, so tapping appeared to do nothing at all.
export function EnableLocationState({ mapsReady, location, onRetry }: EnableLocationStateProps) {
  const mapsUnavailable = !mapsReady;
  const pending = mapsReady && location.status === 'pending';

  const view = mapsUnavailable
    ? {
        Icon: WifiOff, amber: true,
        title: 'Maps unavailable',
        body: 'SafeRoute AI needs the Google Maps service to find shelters and routes near you. Check your connection, or configure VITE_GOOGLE_MAPS_API_KEY.',
        retry: false, steps: [] as string[]
      }
    : pending
    ? {
        Icon: Compass, amber: false,
        title: 'Locating you…',
        body: 'Getting your position to map nearby shelters, water and medical points. Indoors this can take a few seconds while it falls back to a network fix.',
        retry: false, steps: []
      }
    : location.reason === 'denied'
    ? {
        Icon: ShieldAlert, amber: true,
        title: 'Location is blocked',
        body: 'Your browser is refusing the request, which is why nothing happens when you tap. It has to be re-allowed in settings — the app cannot ask again on its own.',
        retry: true,
        steps: [
          'Safari on iPhone: tap the page-settings icon at the left of the address bar, then Website Settings → Location → Ask or Allow.',
          'If that option is not there: Settings → Safari (listed under “Apps” on newer iOS) → Location → Ask.',
          'Added to your Home Screen? Settings → SafeRoute AI → Location → While Using the App.',
          'Also check Settings → Privacy & Security → Location Services is switched on.'
        ]
      }
    : location.reason === 'insecure'
    ? {
        Icon: ShieldAlert, amber: true,
        title: 'Needs a secure connection',
        body: 'Browsers only give location to pages served over HTTPS. Open the https:// address for this site — on http it can never work, however many times you tap.',
        retry: false, steps: []
      }
    : location.reason === 'timeout'
    ? {
        Icon: Clock, amber: false,
        title: 'Location is taking too long',
        body: 'Your device could not get a fix in time, even after retrying at reduced accuracy. That is normal deep inside buildings, basements and trains.',
        retry: true,
        steps: [
          'Move near a window or step outside, then try again.',
          'Turn Wi-Fi on — it speeds up positioning even when you are not connected to a network.'
        ]
      }
    : location.reason === 'unavailable'
    ? {
        Icon: SatelliteDish, amber: true,
        title: 'Position unavailable',
        body: 'The device reported that it cannot work out a position at the moment.',
        retry: true,
        steps: [
          'Check Location Services is enabled for your device.',
          'Switch Airplane Mode off if it is on.'
        ]
      }
    : location.reason === 'unsupported'
    ? {
        Icon: WifiOff, amber: true,
        title: 'Not supported here',
        body: 'This browser does not offer location at all. Try Safari or Chrome.',
        retry: false, steps: []
      }
    : {
        Icon: MapPin, amber: false,
        title: 'Enable location',
        body: 'SafeRoute AI works from your real position. Allow location access so it can check live hazards against where you actually are.',
        retry: true, steps: []
      };

  const { Icon, amber } = view;

  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center px-7 text-center bg-slate-950 overflow-y-auto py-12 scrollbar-none">
      <div
        className={`w-20 h-20 rounded-3xl border flex items-center justify-center mb-5 shrink-0 ${
          amber ? 'border-amber-500/40 bg-amber-500/10' : 'border-indigo-500/40 bg-indigo-500/10'
        }`}
      >
        <Icon
          className={`w-9 h-9 ${amber ? 'text-amber-400' : 'text-indigo-400'} ${pending ? 'animate-spin' : ''}`}
          style={pending ? { animationDuration: '4s' } : undefined}
        />
      </div>

      <h2 className="text-white font-black text-lg tracking-tight font-sans">{view.title}</h2>
      <p className="text-slate-400 text-xs leading-relaxed mt-2 max-w-[300px] font-mono">{view.body}</p>

      {view.steps.length > 0 && (
        <ol className="mt-4 space-y-2 text-left max-w-[310px]">
          {view.steps.map((step, i) => (
            <li key={i} className="flex gap-2 text-[10.5px] text-slate-300 font-mono leading-relaxed">
              <span className="shrink-0 w-4 h-4 rounded-full bg-slate-800 text-slate-400 text-[9px] font-bold flex items-center justify-center mt-0.5">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      )}

      {view.retry && (
        <button
          onClick={onRetry}
          className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-full shadow-lg hover:shadow-indigo-500/20 active:scale-95 transition-all shrink-0"
        >
          <MapPin className="w-4 h-4" />
          {location.reason === 'denied' ? 'I’ve allowed it — try again' : 'Try again'}
        </button>
      )}
    </div>
  );
}
