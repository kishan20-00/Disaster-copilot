import { useState } from 'react';
import {
  X, LogOut, User, Building2, Users, Accessibility, Languages,
  Plus, Trash2, MapPin, ShieldQuestion
} from 'lucide-react';
import type { AuthUser, PersonalContext, Language, Companions } from '@/types/domain';
import { floorLabel, describeFloor, companionsLabel, TSUNAMI_MIN_SAFE_FLOOR } from '@/lib/profileFormat';
import type { LatLng } from '@/services/geolocation';
import type { PlaceSuggestion } from '@/services/placeSearch';
import { fetchPlaceSuggestions, resolveSuggestion } from '@/services/placeSearch';
import type { FamilyMember } from '@/lib/familyStore';
import {
  addMember, removeMember, describeAge, RELATION_PRESETS
} from '@/lib/familyStore';

interface ProfileSheetProps {
  show: boolean;
  user: AuthUser;
  sessionExpiry: number | null;
  personalContext: PersonalContext;
  onChangeContext: (patch: Partial<PersonalContext>) => void;
  family: FamilyMember[];
  onChangeFamily: (members: FamilyMember[]) => void;
  near: LatLng | null;
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
        <Icon className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
        <span className="text-[9.5px] font-black uppercase tracking-wider text-slate-400">{label}</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            key={o}
            onClick={() => onPick(o)}
            className={`px-2.5 py-1.5 rounded-xl border text-[10px] font-bold transition active:scale-95 ${
              value === o
                ? 'bg-indigo-600/25 border-indigo-500/60 text-indigo-100'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            {o}
          </button>
        ))}
      </div>
      {hint && <p className="text-[9px] font-mono text-slate-600 leading-snug">{hint}</p>}
    </div>
  );
}

// Profile and settings. Reached by tapping the avatar, which used to sign the
// user straight out with no confirmation.
//
// This is also where floor / companions / mobility finally get a UI. They feed
// every generated instruction and the emergency message, but until now the only
// way to change them was to say them out loud to the voice assistant — which is
// why the SMS said "with child" whether or not anyone had one.
export function ProfileSheet({
  show, user, sessionExpiry, personalContext, onChangeContext,
  family, onChangeFamily, near, onClose, onSignOut
}: ProfileSheetProps) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [relation, setRelation] = useState(RELATION_PRESETS[0]);
  const [placeQuery, setPlaceQuery] = useState('');
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [picked, setPicked] = useState<{ name: string; address?: string; pos: LatLng } | null>(null);
  const [busy, setBusy] = useState(false);

  if (!show) return null;

  const searchPlace = async (q: string) => {
    setPlaceQuery(q);
    setPicked(null);
    if (q.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    setSuggestions(await fetchPlaceSuggestions(q, near));
  };

  const choosePlace = async (s: PlaceSuggestion) => {
    setBusy(true);
    const resolved = await resolveSuggestion(s);
    setBusy(false);
    if (!resolved) return;
    setPicked({ name: resolved.name, address: resolved.address, pos: resolved.pos });
    setPlaceQuery(resolved.name);
    setSuggestions([]);
  };

  const commit = () => {
    if (!name.trim() || !picked) return;
    onChangeFamily(addMember(family, {
      name,
      relation,
      place: { name: picked.name, address: picked.address, lat: picked.pos.lat, lng: picked.pos.lng }
    }));
    setName('');
    setRelation(RELATION_PRESETS[0]);
    setPlaceQuery('');
    setPicked(null);
    setSuggestions([]);
    setAdding(false);
  };

  const expiryText = sessionExpiry
    ? new Date(sessionExpiry * 1000).toLocaleString()
    : 'until you sign out';

  return (
    <div className="absolute inset-0 bg-black/75 backdrop-blur-sm z-50 flex flex-col justify-end animate-in fade-in duration-200">
      <div className="bg-slate-900 border-t border-slate-800 rounded-t-3xl max-h-[85%] flex flex-col animate-in slide-in-from-bottom duration-300">
        <div className="shrink-0 px-5 pt-3 pb-2">
          <div className="flex justify-center mb-3">
            <div className="w-12 h-1 bg-slate-700 rounded-full" />
          </div>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {user.avatar ? (
                <img src={user.avatar} alt="" className="w-11 h-11 rounded-full border border-slate-700 shrink-0" />
              ) : (
                <div className="w-11 h-11 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-slate-400" />
                </div>
              )}
              <div className="min-w-0">
                <h3 className="text-sm font-black text-white truncate">{user.name}</h3>
                <p className="text-[10px] font-mono text-slate-400 truncate">{user.email}</p>
                <p className="text-[9px] font-mono text-slate-600 mt-0.5">Google session · {expiryText}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-5 scrollbar-none">
          {/* ── What actually shapes the advice ── */}
          <section className="bg-slate-950/60 border border-slate-800/60 rounded-2xl p-3.5 space-y-3.5">
            <div>
              <h4 className="text-[10.5px] font-black uppercase tracking-wider text-slate-300">Your situation</h4>
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
                <Building2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span className="text-[9.5px] font-black uppercase tracking-wider text-slate-400">Which floor</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onChangeContext({ floor: Math.max(FLOOR_MIN, personalContext.floor - 1) })}
                  className="w-8 h-8 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 font-black text-sm active:scale-95 transition"
                >−</button>
                <div className="flex-1 text-center bg-slate-950 border border-slate-800 rounded-xl py-1.5">
                  <span className="block text-[13px] font-black text-white leading-none">{floorLabel(personalContext.floor)}</span>
                  <span className="block text-[9px] font-mono text-slate-500 mt-0.5">{describeFloor(personalContext.floor)}</span>
                </div>
                <button
                  onClick={() => onChangeContext({ floor: Math.min(FLOOR_MAX, personalContext.floor + 1) })}
                  className="w-8 h-8 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 font-black text-sm active:scale-95 transition"
                >+</button>
              </div>
              <div className="flex gap-1.5">
                {[-1, 0, 1, 5, 10].map((f) => (
                  <button key={f} onClick={() => onChangeContext({ floor: f })}
                    className={`flex-1 py-1 rounded-lg border text-[9px] font-bold transition ${
                      personalContext.floor === f
                        ? 'bg-indigo-600/25 border-indigo-500/60 text-indigo-100'
                        : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
                    }`}>{floorLabel(f)}</button>
                ))}
              </div>
              <p className="text-[9px] font-mono text-slate-600 leading-snug">
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
                <Users className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span className="text-[9.5px] font-black uppercase tracking-wider text-slate-400">Who is with you</span>
                <span className="text-[9px] font-mono text-slate-500 ml-auto">{companionsLabel(personalContext.companions)}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onChangeContext({ companions: adjustCount(personalContext.companions, -1) })}
                  className="w-8 h-8 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 font-black text-sm active:scale-95 transition"
                >−</button>
                <div className="flex-1 text-center bg-slate-950 border border-slate-800 rounded-xl py-1.5">
                  <span className="block text-[13px] font-black text-white leading-none">{personalContext.companions.count}</span>
                  <span className="block text-[9px] font-mono text-slate-500 mt-0.5">
                    {personalContext.companions.count === 0 ? 'travelling alone' : 'people with you'}
                  </span>
                </div>
                <button
                  onClick={() => onChangeContext({ companions: adjustCount(personalContext.companions, 1) })}
                  className="w-8 h-8 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 font-black text-sm active:scale-95 transition"
                >+</button>
              </div>
              {personalContext.companions.count > 0 && (
                <div className="flex gap-1.5">
                  <button
                    onClick={() => onChangeContext({ companions: { ...personalContext.companions, needsAssistance: !personalContext.companions.needsAssistance } })}
                    className={`flex-1 py-1.5 rounded-lg border text-[9.5px] font-bold transition ${
                      personalContext.companions.needsAssistance
                        ? 'bg-amber-600/25 border-amber-500/60 text-amber-100'
                        : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
                    }`}>Someone needs help moving</button>
                  <button
                    onClick={() => onChangeContext({ companions: { ...personalContext.companions, needsCarrying: !personalContext.companions.needsCarrying } })}
                    className={`flex-1 py-1.5 rounded-lg border text-[9.5px] font-bold transition ${
                      personalContext.companions.needsCarrying
                        ? 'bg-amber-600/25 border-amber-500/60 text-amber-100'
                        : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
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

          {/* ── Family ── */}
          <section className="bg-slate-950/60 border border-slate-800/60 rounded-2xl p-3.5 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h4 className="text-[10.5px] font-black uppercase tracking-wider text-slate-300">Family places</h4>
                <p className="text-[9px] font-mono text-slate-500 mt-0.5 leading-snug">
                  Where you expect people to be. Checked against the hazard when an alert runs.
                </p>
              </div>
              {!adding && (
                <button onClick={() => setAdding(true)}
                  className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[9.5px] font-black uppercase tracking-wide transition active:scale-95">
                  <Plus className="w-3 h-3" /> Add
                </button>
              )}
            </div>

            {/* Honest about what this is and is not */}
            <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 rounded-xl px-2.5 py-2">
              <ShieldQuestion className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-[9px] font-mono text-amber-200/90 leading-snug">
                These are expected places, not live positions. No Google API lets an app read family
                locations — Family Link has none and Maps sharing is not published. For live positions,
                use Google Maps itself.
              </p>
            </div>

            {family.length === 0 && !adding && (
              <p className="text-[10px] font-mono text-slate-500 py-2 text-center">
                No one added yet.
              </p>
            )}

            {family.map((m) => (
              <div key={m.id} className="flex items-start gap-2.5 bg-slate-950 border border-slate-900 rounded-xl p-2.5">
                <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <span className="text-[11px] font-bold text-slate-100">{m.name}</span>
                  <span className="text-[9px] font-mono text-slate-500 ml-1.5">{m.relation}</span>
                  <p className="text-[9.5px] font-mono text-slate-400 truncate mt-0.5">{m.place.name}</p>
                  <p className="text-[9px] font-mono text-slate-600">{describeAge(m.addedAt)}</p>
                </div>
                <button onClick={() => onChangeFamily(removeMember(family, m.id))}
                  className="p-1 text-slate-500 hover:text-red-400 transition shrink-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            {adding && (
              <div className="bg-slate-950 border border-indigo-500/30 rounded-xl p-3 space-y-2.5">
                <input
                  value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="Name"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/60"
                />
                <div className="flex flex-wrap gap-1.5">
                  {RELATION_PRESETS.map((r) => (
                    <button key={r} onClick={() => setRelation(r)}
                      className={`px-2 py-1 rounded-lg border text-[9.5px] font-bold transition ${
                        relation === r ? 'bg-indigo-600/25 border-indigo-500/60 text-indigo-100'
                                       : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}>{r}</button>
                  ))}
                </div>
                <div className="relative">
                  <input
                    value={placeQuery} onChange={(e) => searchPlace(e.target.value)}
                    placeholder="Where do you expect them to be?"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/60"
                  />
                  {suggestions.length > 0 && (
                    <div className="absolute left-0 right-0 mt-1 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden z-10 shadow-2xl">
                      {suggestions.slice(0, 5).map((s) => (
                        <button key={s.id} onClick={() => choosePlace(s)}
                          className="w-full text-left px-2.5 py-2 hover:bg-slate-800 border-b border-slate-800/60 last:border-b-0">
                          <span className="block text-[10.5px] font-bold text-slate-100 truncate">{s.primary}</span>
                          <span className="block text-[9px] font-mono text-slate-500 truncate">{s.secondary}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {picked && (
                  <p className="text-[9px] font-mono text-emerald-400">
                    ✓ {picked.name}{picked.address ? ` · ${picked.address}` : ''}
                  </p>
                )}
                <div className="flex gap-2 pt-1">
                  <button onClick={() => { setAdding(false); setName(''); setPlaceQuery(''); setPicked(null); setSuggestions([]); }}
                    className="flex-1 py-2 border border-slate-800 hover:bg-slate-800 text-slate-300 rounded-lg text-[10px] font-bold transition">
                    Cancel
                  </button>
                  <button onClick={commit} disabled={!name.trim() || !picked || busy}
                    className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:pointer-events-none text-white rounded-lg text-[10px] font-bold transition">
                    {busy ? 'Locating…' : 'Save'}
                  </button>
                </div>
              </div>
            )}

          </section>

          <button
            onClick={onSignOut}
            className="w-full py-2.5 bg-red-600/15 hover:bg-red-600/25 border border-red-500/40 text-red-300 hover:text-red-200 rounded-xl text-[11px] font-black uppercase tracking-wide transition active:scale-95 flex items-center justify-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
