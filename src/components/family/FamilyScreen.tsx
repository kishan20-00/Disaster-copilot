import { useEffect, useState } from 'react';
import { Shield, Plus, UserPlus, Map as MapIcon, HelpCircle } from 'lucide-react';
import type { AuthUser } from '@/types/domain';
import type { FamilyMember } from '@/lib/familyStore';
import { addMember, RELATION_PRESETS } from '@/lib/familyStore';
import type { FamilyStatus } from '@/lib/familyStatus';
import type { ThreatScanState } from '@/lib/impact';
import type { LatLng } from '@/services/geolocation';
import type { PlaceSuggestion } from '@/services/placeSearch';
import { fetchPlaceSuggestions, resolveSuggestion } from '@/services/placeSearch';
import { FamilyMemberCard } from '@/components/family/FamilyMemberCard';
import { FamilyStatusHero } from '@/components/family/FamilyStatusHero';

interface FamilyScreenProps {
  user: AuthUser | null;
  authLoading: 'none' | 'google';
  renderSignInButton: () => void;
  family: FamilyMember[];
  familyStatus: FamilyStatus[] | null;
  scanStatus: ThreatScanState['status'] | null;
  /** When the last scan finished, for the hero's "as of" line. */
  scannedAt: string | null;
  /** Biases place autocomplete toward wherever the map is pointed. */
  near: LatLng | null;
  /** The device's own position, for each card's "from you" distance. */
  livePosition: LatLng | null;
  onChangeFamily: (members: FamilyMember[]) => void;
  onViewOnMap: (member: FamilyMember) => void;
  /** Opens the existing human-approval message gate. */
  onOpenSms: () => void;
  /** Switches to the Navigate tab, where the live map already lives. */
  onOpenMap: () => void;
}

// The Family tab: a status hero, then one card per person, then a way onto the
// map. Laid out to the supplied "Family Dashboard" design; the per-card
// reasoning about what may and may not be displayed is in FamilyMemberCard, and
// the wording of each state is shared with the map drawer through
// familyVerdict so the two surfaces cannot drift.
//
// This screen still does NOT show live position, battery, signal or movement
// speed, however prominently a design asks for them. Those were in an earlier
// version of this exact feature and were deliberately removed (see
// familyStore.ts): no Google API exposes a family member's live position, so
// every one of those fields was invented. What IS real: an expected place, and
// whether that place falls inside a detected hazard.
export function FamilyScreen({
  user, authLoading, renderSignInButton, family, familyStatus, scanStatus,
  scannedAt, near, livePosition, onChangeFamily, onViewOnMap, onOpenSms, onOpenMap
}: FamilyScreenProps) {
  const [adding, setAdding] = useState(false);
  // Shown once, right after sign-in, while family is still empty. Skippable —
  // it's a nudge toward the one real action (adding a member), not a gate.
  const [onboardingSkipped, setOnboardingSkipped] = useState(false);
  const [name, setName] = useState('');
  const [relation, setRelation] = useState(RELATION_PRESETS[0]);
  const [phone, setPhone] = useState('');
  const [placeQuery, setPlaceQuery] = useState('');
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [picked, setPicked] = useState<{ name: string; address?: string; pos: LatLng } | null>(null);
  const [busy, setBusy] = useState(false);

  // The GSI button div below only exists while this tab is mounted, so the
  // button has to be (re)rendered on mount rather than relying on useAuth's
  // own mount-time effect, which ran before this tab was ever visited.
  useEffect(() => {
    if (!user) renderSignInButton();
  }, [user, renderSignInButton]);

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
      phone,
      place: { name: picked.name, address: picked.address, lat: picked.pos.lat, lng: picked.pos.lng }
    }));
    setName('');
    setRelation(RELATION_PRESETS[0]);
    setPhone('');
    setPlaceQuery('');
    setPicked(null);
    setSuggestions([]);
    setAdding(false);
  };

  const cancelAdd = () => {
    setAdding(false);
    setName('');
    setPhone('');
    setPlaceQuery('');
    setPicked(null);
    setSuggestions([]);
  };

  const byId = new Map((familyStatus ?? []).map((f) => [f.member.id, f.impact]));

  return (
    <div className="absolute inset-0 overflow-y-auto pb-[calc(var(--nav-h)+1rem)] scrollbar-none bg-white">
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-slate-200 px-4 pt-[max(0.75rem,var(--safe-top))] pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-indigo-500" />
          <span className="text-sm font-black text-slate-900 tracking-tight">Family</span>
          {family.length > 0 && (
            <span className="text-[9px] font-mono text-slate-400 tabular-nums">
              {family.length} {family.length === 1 ? 'place' : 'places'}
            </span>
          )}
        </div>
        {user && !adding && (
          <button
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full text-[10.5px] font-black uppercase tracking-wide transition active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        )}
      </div>

      <div className="px-4 py-4 flex flex-col gap-4">
        {!user ? (
          <div className="bg-slate-50 border border-indigo-300 rounded-2xl p-4 flex flex-col items-center text-center gap-2.5">
            <Shield className="w-6 h-6 text-indigo-500" />
            <p className="text-[10px] font-mono text-slate-500 leading-snug">
              Sign in with Google to add family places and sync them across your devices.
            </p>
            <div id="google-signin-button" className="w-full flex justify-center h-11" />
            {authLoading === 'google' && (
              <div className="text-[9.5px] text-indigo-500 font-mono flex items-center gap-1.5 animate-pulse">
                <span className="w-3 h-3 border border-indigo-500 border-t-transparent rounded-full animate-spin" />
                Securely connecting to Google Identity Services...
              </div>
            )}
          </div>
        ) : family.length === 0 && !onboardingSkipped && !adding ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-6 py-10">
            <h2 className="text-xl font-black text-slate-900 leading-snug px-4">
              Protect the people who matter most.
            </h2>
            <div className="w-full flex flex-col gap-3 px-2">
              <button
                onClick={() => setAdding(true)}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full text-[12px] font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 active:scale-95 transition"
              >
                <UserPlus className="w-4 h-4" />
                Add Family Member
              </button>
              <button
                onClick={() => setOnboardingSkipped(true)}
                className="w-full py-2.5 text-slate-500 hover:text-slate-700 text-[11px] font-bold transition"
              >
                Skip for now
              </button>
            </div>
          </div>
        ) : (
          <>
            {adding && (
              <div className="bg-slate-50 border border-indigo-300 rounded-xl p-3 space-y-2.5">
                <input
                  value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="Name"
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500/60"
                />
                <div className="flex flex-wrap gap-1.5">
                  {RELATION_PRESETS.map((r) => (
                    <button key={r} onClick={() => setRelation(r)}
                      className={`px-2 py-1 rounded-lg border text-[9.5px] font-bold transition ${
                        relation === r ? 'bg-indigo-600/15 border-indigo-500/60 text-indigo-700'
                                       : 'bg-white border-slate-200 text-slate-500'
                      }`}>{r}</button>
                  ))}
                </div>
                {/* Optional, and the only contact detail stored. It powers the
                    Call button on the card — a real dialler handoff, which is
                    worth more in an emergency than any status readout. */}
                <input
                  value={phone} onChange={(e) => setPhone(e.target.value)}
                  inputMode="tel" autoComplete="tel"
                  placeholder="Phone number (optional)"
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500/60"
                />
                <div className="relative">
                  <input
                    value={placeQuery} onChange={(e) => searchPlace(e.target.value)}
                    placeholder="Where do you expect them to be?"
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500/60"
                  />
                  {suggestions.length > 0 && (
                    <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl overflow-hidden z-10 shadow-2xl">
                      {suggestions.slice(0, 5).map((s) => (
                        <button key={s.id} onClick={() => choosePlace(s)}
                          className="w-full text-left px-2.5 py-2 hover:bg-slate-50 border-b border-slate-100 last:border-b-0">
                          <span className="block text-[10.5px] font-bold text-slate-900 truncate">{s.primary}</span>
                          <span className="block text-[9px] font-mono text-slate-500 truncate">{s.secondary}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {picked && (
                  <p className="text-[9px] font-mono text-emerald-600">
                    ✓ {picked.name}{picked.address ? ` · ${picked.address}` : ''}
                  </p>
                )}
                <div className="flex gap-2 pt-1">
                  <button onClick={cancelAdd}
                    className="flex-1 py-2 border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold transition">
                    Cancel
                  </button>
                  <button onClick={commit} disabled={!name.trim() || !picked || busy}
                    className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:pointer-events-none text-white rounded-lg text-[10px] font-bold transition">
                    {busy ? 'Locating…' : 'Save'}
                  </button>
                </div>
              </div>
            )}

            <FamilyStatusHero
              memberCount={family.length}
              familyStatus={familyStatus}
              scanStatus={scanStatus}
              scannedAt={scannedAt}
            />

            {family.length === 0 ? (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl py-6 px-4 text-center space-y-3">
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Add the people you would check on, and where you expect them to be. Their places
                  get tested against any hazard that reaches you.
                </p>
                <button
                  onClick={() => setAdding(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full text-[11px] font-bold transition active:scale-95"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Add family
                </button>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-3">
                  {family.map((m) => (
                    <FamilyMemberCard
                      key={m.id}
                      member={m}
                      impact={byId.get(m.id) ?? null}
                      scanStatus={scanStatus}
                      livePosition={livePosition}
                      onViewOnMap={() => onViewOnMap(m)}
                      onOpenSms={onOpenSms}
                      onRemove={() => onChangeFamily(family.filter((x) => x.id !== m.id))}
                    />
                  ))}
                </div>

                {/* Map strip. The design shows a small static preview; this app
                    already owns one live Google Map behind every tab, so rather
                    than mount a second instance this hands over to the tab where
                    that map — with every family pin already on it — is visible. */}
                <button
                  onClick={onOpenMap}
                  className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl px-4 py-3 flex items-center gap-3 text-left active:scale-[0.99] transition"
                >
                  <span className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center shrink-0">
                    <MapIcon className="w-4 h-4 text-indigo-600" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[11.5px] font-black text-slate-900 tracking-tight">
                      See every place on the map
                    </span>
                    <span className="block text-[9.5px] font-mono text-slate-500 truncate">
                      {family.length} {family.length === 1 ? 'pin' : 'pins'} · plus shelters and your own position
                    </span>
                  </span>
                </button>

                {/* A green edge must never be read as "this person is fine". */}
                <p className="flex items-start gap-1.5 text-[9.5px] font-mono text-slate-400 leading-snug px-0.5">
                  <HelpCircle className="w-3 h-3 shrink-0 mt-0.5" />
                  This checks places, not people. It cannot tell you whether someone is actually
                  there, or safe. Live location, battery and movement are not available to this app.
                </p>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
