import {
  X, LogOut, User, Building2, Users, Accessibility, Languages
} from 'lucide-react';
import type { AuthUser, PersonalContext, Language, Companions } from '@/types/domain';
import { floorLabel, describeFloor, companionsLabel, TSUNAMI_MIN_SAFE_FLOOR } from '@/lib/profileFormat';

interface ProfileSheetProps {
  show: boolean;
  user: AuthUser | null;
  sessionExpiry: number | null;
  personalContext: PersonalContext;
  onChangeContext: (patch: Partial<PersonalContext>) => void;
  onClose: () => void;
  onSignOut: () => void;
}

const MOBILITY: PersonalContext['mobility'][] = ['Fully Mobile', 'Wheelchair User'];
/** Dropping to zero also clears the flags — they describe people who are there. */
function adjustCount(c: Companions, delta: number): Companions {
  const count = Math.max(0, Math.min(20, c.count + delta));
  return count === 0
    ? { count: 0, needsAssistance: false, needsCarrying: false }
    : { ...c, count };
}

const FLOOR_MIN = -5;
const FLOOR_MAX = 200;
const LANGUAGES: Language[] = ['English', 'Japanese', 'Chinese', 'Vietnamese'];

function Choice<T extends string>({
  label, Icon, value, options, onPick, hint
}: {
  label: string; Icon: typeof User; value: T; options: T[]; onPick: (v: T) => void; hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
        <span className="text-[9.5px] font-black uppercase tracking-wider text-slate-500">{label}</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            key={o}
            onClick={() => onPick(o)}
            className={`px-2.5 py-1.5 rounded-xl border text-[10px] font-bold transition active:scale-95 ${
              value === o
                ? 'bg-indigo-600/15 border-indigo-500/60 text-indigo-700'
                : 'bg-white border-slate-200 text-slate-500 hover:text-slate-700'
            }`}
          >
            {o}
          </button>
        ))}
      </div>
      {hint && <p className="text-[9px] font-mono text-slate-400 leading-snug">{hint}</p>}
    </div>
  );
}

// Account + personal-context settings. Reached by tapping the avatar. Family
// management moved to its own tab (see FamilyScreen) — this sheet is what's
// left: who you are, and the situation that shapes every generated
// instruction (floor / companions / mobility / language).
export function ProfileSheet({
  show, user, sessionExpiry, personalContext, onChangeContext, onClose, onSignOut
}: ProfileSheetProps) {
  if (!show) return null;

  const expiryText = sessionExpiry
    ? new Date(sessionExpiry * 1000).toLocaleString()
    : 'until you sign out';

  return (
    <div className="absolute inset-0 bg-black/75 backdrop-blur-sm z-50 flex flex-col justify-end animate-in fade-in duration-200">
      <div className="bg-white border-t border-slate-200 rounded-t-3xl max-h-[85%] flex flex-col animate-in slide-in-from-bottom duration-300">
        <div className="shrink-0 px-5 pt-3 pb-2">
          <div className="flex justify-center mb-3">
            <div className="w-12 h-1 bg-slate-300 rounded-full" />
          </div>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {user?.avatar ? (
                <img src={user.avatar} alt="" className="w-11 h-11 rounded-full border border-slate-300 shrink-0" />
              ) : (
                <div className="w-11 h-11 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-slate-500" />
                </div>
              )}
              <div className="min-w-0">
                <h3 className="text-sm font-black text-slate-900 truncate">{user?.name ?? 'Guest'}</h3>
                <p className="text-[10px] font-mono text-slate-500 truncate">
                  {user ? user.email : 'Emergency Mode — not signed in'}
                </p>
                {user && <p className="text-[9px] font-mono text-slate-400 mt-0.5">Google session · {expiryText}</p>}
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-[calc(1.5rem+var(--safe-bottom))] space-y-5 scrollbar-none">
          {/* ── What actually shapes the advice ── */}
          <section className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-3.5">
            <div>
              <h4 className="text-[10.5px] font-black uppercase tracking-wider text-slate-700">Your situation</h4>
              <p className="text-[9px] font-mono text-slate-500 mt-0.5">
                Every instruction and the emergency message are written around these.
              </p>
            </div>
            {/* A number, not a picked label. The old options were Basement /
                Ground / 9th Floor, so nobody on floor 3 could describe themselves
                — and the tsunami advice told whoever picked "9th" that they were
                above the wave. */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                <span className="text-[9.5px] font-black uppercase tracking-wider text-slate-500">Which floor</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onChangeContext({ floor: Math.max(FLOOR_MIN, personalContext.floor - 1) })}
                  className="w-8 h-8 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-600 font-black text-sm active:scale-95 transition"
                >−</button>
                <div className="flex-1 text-center bg-white border border-slate-200 rounded-xl py-1.5">
                  <span className="block text-[13px] font-black text-slate-900 leading-none">{floorLabel(personalContext.floor)}</span>
                  <span className="block text-[9px] font-mono text-slate-500 mt-0.5">{describeFloor(personalContext.floor)}</span>
                </div>
                <button
                  onClick={() => onChangeContext({ floor: Math.min(FLOOR_MAX, personalContext.floor + 1) })}
                  className="w-8 h-8 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-600 font-black text-sm active:scale-95 transition"
                >+</button>
              </div>
              <div className="flex gap-1.5">
                {[-1, 0, 1, 5, 10].map((f) => (
                  <button key={f} onClick={() => onChangeContext({ floor: f })}
                    className={`flex-1 py-1 rounded-lg border text-[9px] font-bold transition ${
                      personalContext.floor === f
                        ? 'bg-indigo-600/15 border-indigo-500/60 text-indigo-700'
                        : 'bg-white border-slate-200 text-slate-500 hover:text-slate-700'
                    }`}>{floorLabel(f)}</button>
                ))}
              </div>
              <p className="text-[9px] font-mono text-slate-400 leading-snug">
                {personalContext.floor >= TSUNAMI_MIN_SAFE_FLOOR
                  ? `At or above the ${TSUNAMI_MIN_SAFE_FLOOR}th floor, so a tsunami may not require moving.`
                  : 'Below the 4th floor, so a tsunami means climbing higher.'}
              </p>
            </div>

            {/* Attributes, not personas. Previously the only options were solo,
                with a child, or with elderly parents — being with another adult
                could not be expressed at all. */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                <span className="text-[9.5px] font-black uppercase tracking-wider text-slate-500">Who is with you</span>
                <span className="text-[9px] font-mono text-slate-500 ml-auto">{companionsLabel(personalContext.companions)}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onChangeContext({ companions: adjustCount(personalContext.companions, -1) })}
                  className="w-8 h-8 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-600 font-black text-sm active:scale-95 transition"
                >−</button>
                <div className="flex-1 text-center bg-white border border-slate-200 rounded-xl py-1.5">
                  <span className="block text-[13px] font-black text-slate-900 leading-none">{personalContext.companions.count}</span>
                  <span className="block text-[9px] font-mono text-slate-500 mt-0.5">
                    {personalContext.companions.count === 0 ? 'travelling alone' : 'people with you'}
                  </span>
                </div>
                <button
                  onClick={() => onChangeContext({ companions: adjustCount(personalContext.companions, 1) })}
                  className="w-8 h-8 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-600 font-black text-sm active:scale-95 transition"
                >+</button>
              </div>
              {personalContext.companions.count > 0 && (
                <div className="flex gap-1.5">
                  <button
                    onClick={() => onChangeContext({ companions: { ...personalContext.companions, needsAssistance: !personalContext.companions.needsAssistance } })}
                    className={`flex-1 py-1.5 rounded-lg border text-[9.5px] font-bold transition ${
                      personalContext.companions.needsAssistance
                        ? 'bg-amber-600/15 border-amber-500/60 text-amber-800'
                        : 'bg-white border-slate-200 text-slate-500 hover:text-slate-700'
                    }`}>Someone needs help moving</button>
                  <button
                    onClick={() => onChangeContext({ companions: { ...personalContext.companions, needsCarrying: !personalContext.companions.needsCarrying } })}
                    className={`flex-1 py-1.5 rounded-lg border text-[9.5px] font-bold transition ${
                      personalContext.companions.needsCarrying
                        ? 'bg-amber-600/15 border-amber-500/60 text-amber-800'
                        : 'bg-white border-slate-200 text-slate-500 hover:text-slate-700'
                    }`}>Someone must be carried</button>
                </div>
              )}
            </div>
            <Choice label="Mobility" Icon={Accessibility} value={personalContext.mobility} options={MOBILITY}
              onPick={(v) => onChangeContext({ mobility: v })}
              hint="Wheelchair selects step-free routing wording." />
            <Choice label="Language" Icon={Languages} value={personalContext.language} options={LANGUAGES}
              onPick={(v) => onChangeContext({ language: v })} />
          </section>

          {user && (
            <button
              onClick={onSignOut}
              className="w-full py-2.5 bg-red-600/15 hover:bg-red-600/25 border border-red-500/40 text-red-300 hover:text-red-200 rounded-xl text-[11px] font-black uppercase tracking-wide transition active:scale-95 flex items-center justify-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
