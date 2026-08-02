import { MapPin, Compass, WifiOff, ShieldAlert, Clock, SatelliteDish } from 'lucide-react';
import type { LocationState } from '@/hooks/useGeolocation';
import { useT } from '@/i18n/context';

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
  const t = useT();
  const mapsUnavailable = !mapsReady;
  const pending = mapsReady && location.status === 'pending';

  const view = mapsUnavailable
    ? {
        Icon: WifiOff, amber: true,
        title: t('location.maps.title'),
        body: t('location.maps.body'),
        retry: false, steps: [] as string[]
      }
    : pending
    ? {
        Icon: Compass, amber: false,
        title: t('location.pending.title'),
        body: t('location.pending.body'),
        retry: false, steps: []
      }
    : location.reason === 'denied'
    ? {
        Icon: ShieldAlert, amber: true,
        title: t('location.denied.title'),
        body: t('location.denied.body'),
        retry: true,
        steps: [
          t('location.denied.step1'),
          t('location.denied.step2'),
          t('location.denied.step3'),
          t('location.denied.step4')
        ]
      }
    : location.reason === 'insecure'
    ? {
        Icon: ShieldAlert, amber: true,
        title: t('location.insecure.title'),
        body: t('location.insecure.body'),
        retry: false, steps: []
      }
    : location.reason === 'timeout'
    ? {
        Icon: Clock, amber: false,
        title: t('location.timeout.title'),
        body: t('location.timeout.body'),
        retry: true,
        steps: [t('location.timeout.step1'), t('location.timeout.step2')]
      }
    : location.reason === 'unavailable'
    ? {
        Icon: SatelliteDish, amber: true,
        title: t('location.unavailable.title'),
        body: t('location.unavailable.body'),
        retry: true,
        steps: [t('location.unavailable.step1'), t('location.unavailable.step2')]
      }
    : location.reason === 'unsupported'
    ? {
        Icon: WifiOff, amber: true,
        title: t('location.unsupported.title'),
        body: t('location.unsupported.body'),
        retry: false, steps: []
      }
    : {
        Icon: MapPin, amber: false,
        title: t('location.default.title'),
        body: t('location.default.body'),
        retry: true, steps: []
      };

  const { Icon, amber } = view;

  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center px-7 text-center bg-white overflow-y-auto py-12 scrollbar-none">
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

      <h2 className="text-slate-900 font-black text-lg tracking-tight font-sans">{view.title}</h2>
      <p className="text-slate-500 text-xs leading-relaxed mt-2 max-w-[300px] font-mono">{view.body}</p>

      {view.steps.length > 0 && (
        <ol className="mt-4 space-y-2 text-left max-w-[310px]">
          {view.steps.map((step, i) => (
            <li key={i} className="flex gap-2 text-[10.5px] text-slate-600 font-mono leading-relaxed">
              <span className="shrink-0 w-4 h-4 rounded-full bg-slate-100 text-slate-500 text-[9px] font-bold flex items-center justify-center mt-0.5">
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
          {location.reason === 'denied' ? t('location.retryAllowed') : t('location.retry')}
        </button>
      )}
    </div>
  );
}
