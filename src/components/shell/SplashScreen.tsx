import { useEffect, useState } from 'react';
import { Shield } from 'lucide-react';
import { markSplashSeen, prefersReducedMotion } from '@/lib/splash';

interface SplashScreenProps {
  onDone: () => void;
}

/** Long enough to read the name, short enough that nobody waits on it. */
const FULL_MS = 2200;
const REDUCED_MS = 700;
const FADE_MS = 420;

// The opening animation: a radar sweep over the shield, which is the same motion
// the app performs for real when it scans the hazard feeds.
//
// Three deliberate constraints:
//   * it plays once per device, never again
//   * a tap skips it immediately
//   * nothing in the app waits on it — auth, Maps and the feeds all start behind
//     it, so this costs no time at all
export function SplashScreen({ onDone }: SplashScreenProps) {
  const reduced = prefersReducedMotion();
  const duration = reduced ? REDUCED_MS : FULL_MS;
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const hold = setTimeout(() => setLeaving(true), duration);
    return () => clearTimeout(hold);
  }, [duration]);

  useEffect(() => {
    if (!leaving) return;
    const fade = setTimeout(() => {
      markSplashSeen();
      onDone();
    }, FADE_MS);
    return () => clearTimeout(fade);
  }, [leaving, onDone]);

  const skip = () => setLeaving(true);

  return (
    <div
      onClick={skip}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') skip(); }}
      aria-label="Skip introduction"
      className={`absolute inset-0 z-[60] flex flex-col items-center justify-center bg-white cursor-pointer select-none transition-opacity ease-out ${
        leaving ? 'opacity-0' : 'opacity-100'
      }`}
      style={{ transitionDuration: `${FADE_MS}ms` }}
    >
      {/* Faint grid, so the dark field reads as a surface rather than a void */}
      {!reduced && (
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'linear-gradient(#6366f1 1px, transparent 1px), linear-gradient(90deg, #6366f1 1px, transparent 1px)',
            backgroundSize: '38px 38px'
          }}
        />
      )}

      <div className="relative flex items-center justify-center mb-7">
        {/* Expanding rings — the scan going out */}
        {!reduced && [0, 1, 2].map((i) => (
          <span
            key={i}
            className="absolute rounded-full border border-indigo-400/40 splash-ring"
            style={{ width: 76, height: 76, animationDelay: `${i * 620}ms` }}
          />
        ))}

        {/* Rotating sweep behind the emblem */}
        {!reduced && (
          <span
            className="absolute w-[124px] h-[124px] rounded-full splash-sweep"
            style={{
              background: 'conic-gradient(from 0deg, rgba(99,102,241,0) 0deg, rgba(99,102,241,0) 285deg, rgba(129,140,248,0.55) 355deg, rgba(99,102,241,0) 360deg)'
            }}
          />
        )}

        <span
          className={`relative w-[76px] h-[76px] rounded-3xl bg-slate-50 border border-slate-200 flex items-center justify-center shadow-2xl ${
            reduced ? '' : 'splash-emblem'
          }`}
        >
          <Shield className="w-9 h-9 text-indigo-500" />
        </span>
      </div>

      <h1 className={`text-xl font-black tracking-tight text-slate-900 font-sans uppercase ${reduced ? '' : 'splash-rise'}`}>
        SafeRoute AI
      </h1>
      <span
        className={`text-[10px] text-indigo-400 font-mono tracking-[0.25em] uppercase font-bold mt-1.5 ${reduced ? '' : 'splash-rise'}`}
        style={reduced ? undefined : { animationDelay: '260ms' }}
      >
        安心避難
      </span>

      <div className="w-40 h-[2px] bg-slate-200 rounded-full overflow-hidden mt-7">
        <span
          className="block h-full bg-gradient-to-r from-indigo-500 to-indigo-300 splash-bar"
          style={{ animationDuration: `${duration}ms` }}
        />
      </div>

      <span
        className={`text-[9px] font-mono text-slate-400 tracking-wider uppercase mt-5 ${reduced ? '' : 'splash-rise'}`}
        style={reduced ? undefined : { animationDelay: '620ms' }}
      >
        Tap to skip
      </span>
    </div>
  );
}
