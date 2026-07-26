import { Crosshair, LocateFixed } from 'lucide-react';

interface FocusBannerProps {
  placeName: string | null;
  onReturnToMe: () => void;
}

// Shown whenever the app is reasoning about a place the user is NOT standing in.
//
// This exists for safety, not decoration. An evacuation route is only meaningful
// for one starting point, and someone glancing at their phone mid-emergency must
// never mistake a route from a place they looked up earlier for their own. So the
// state is loud, permanent while it lasts, and one tap from being undone.
export function FocusBanner({ placeName, onReturnToMe }: FocusBannerProps) {
  if (!placeName) return null;
  return (
    <div className="bg-amber-500/15 border border-amber-500/50 rounded-2xl px-3 py-2 flex items-center gap-2.5 shadow-xl backdrop-blur-md">
      <Crosshair className="w-4 h-4 text-amber-400 shrink-0" />
      <div className="min-w-0 flex-1">
        <span className="block text-[10px] font-black uppercase tracking-wider text-amber-300 leading-none">
          Checking another place
        </span>
        <span className="block text-[11px] font-bold text-white truncate mt-0.5">{placeName}</span>
        <span className="block text-[9px] font-mono text-amber-200/70 leading-none mt-0.5">
          Not your location — routes shown are from here
        </span>
      </div>
      <button
        onClick={onReturnToMe}
        className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-950/70 hover:bg-slate-900 border border-amber-500/40 text-amber-200 hover:text-white rounded-xl text-[9.5px] font-black uppercase tracking-wide transition active:scale-95"
      >
        <LocateFixed className="w-3 h-3" />
        Back to me
      </button>
    </div>
  );
}
