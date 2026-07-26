import { useEffect, useRef, useState } from 'react';
import { Search, X, User, LogOut, MapPin, Loader2 } from 'lucide-react';
import type { LatLng } from '@/services/geolocation';
import type { PlaceSuggestion } from '@/services/placeSearch';
import { fetchPlaceSuggestions } from '@/services/placeSearch';

interface MapSearchBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onClearSearch: () => void;
  /** Called with the picked suggestion — the caller resolves it to coordinates. */
  onSelectSuggestion: (s: PlaceSuggestion) => void;
  /** Biases suggestions toward wherever the map is currently looking. */
  near: LatLng | null;
  placeholderLocation: string;
  user: { avatar?: string } | null;
  onSignOut: () => void;
}

/** Long enough to stop firing a request per keystroke, short enough to feel live. */
const DEBOUNCE_MS = 250;

export function MapSearchBar({
  searchQuery, onSearchChange, onClearSearch, onSelectSuggestion,
  near, placeholderLocation, user, onSignOut
}: MapSearchBarProps) {
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  // Lets a stale in-flight response be discarded once typing has moved on.
  const requestSeq = useRef(0);
  // Read inside the debounced callback so re-biasing does not restart the timer.
  const nearRef = useRef(near);
  nearRef.current = near;

  useEffect(() => {
    const query = searchQuery.trim();
    if (query.length < 2) {
      setSuggestions([]);
      setOpen(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    const seq = ++requestSeq.current;
    const timer = setTimeout(async () => {
      const results = await fetchPlaceSuggestions(query, nearRef.current);
      if (seq !== requestSeq.current) return;   // a newer keystroke won
      setSuggestions(results);
      setHighlight(0);
      setOpen(results.length > 0);
      setLoading(false);
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const choose = (s: PlaceSuggestion) => {
    setOpen(false);
    setSuggestions([]);
    onSelectSuggestion(s);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open || !suggestions.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => (h + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => (h - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      choose(suggestions[highlight]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className="relative">
      <div className="backdrop-blur-md bg-slate-900/85 border border-slate-800/80 rounded-2xl py-2.5 px-4 flex items-center justify-between shadow-2xl">
        <div className="flex items-center gap-2.5 flex-1 mr-2">
          <span className="shrink-0 text-slate-400">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={onKeyDown}
            onFocus={() => setOpen(suggestions.length > 0)}
            placeholder={placeholderLocation ? `Check another place near ${placeholderLocation}…` : 'Check another place…'}
            className="bg-transparent text-xs text-white placeholder-slate-400 focus:outline-none w-full border-none"
          />
          {searchQuery && (
            <button
              onClick={() => { onClearSearch(); setOpen(false); setSuggestions([]); }}
              className="p-0.5 hover:bg-slate-800 rounded-full transition text-slate-400 hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="h-4 w-px bg-slate-800 mx-1.5 shrink-0" />

        <div className="flex items-center gap-2 shrink-0 ml-1.5 relative group/profile">
          <button
            onClick={onSignOut}
            className="w-7 h-7 rounded-full border border-slate-700 hover:border-red-500/30 hover:bg-red-500/10 flex items-center justify-center transition bg-slate-950/80 text-slate-400 hover:text-red-400 relative overflow-hidden"
            title="Log Out Session"
          >
            {user?.avatar ? (
              <>
                <img src={user.avatar} alt="Avatar" className="w-full h-full rounded-full group-hover/profile:opacity-0 transition-opacity" />
                <LogOut className="w-3.5 h-3.5 absolute opacity-0 group-hover/profile:opacity-100 transition-opacity text-red-400" />
              </>
            ) : (
              <>
                <User className="w-3.5 h-3.5 group-hover/profile:opacity-0 transition-opacity" />
                <LogOut className="w-3.5 h-3.5 absolute opacity-0 group-hover/profile:opacity-100 transition-opacity text-red-400" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Explicit selection. The old submit handler geocoded the raw text and flew
          to whatever came back first, with no chance to confirm which place. */}
      {open && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 mt-1.5 bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-1 duration-150">
          {suggestions.map((s, i) => (
            <button
              key={s.id}
              onMouseEnter={() => setHighlight(i)}
              onClick={() => choose(s)}
              className={`w-full text-left px-3.5 py-2.5 flex items-start gap-2.5 transition border-b border-slate-800/60 last:border-b-0 ${
                i === highlight ? 'bg-indigo-600/20' : 'hover:bg-slate-800/50'
              }`}
            >
              <MapPin className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${i === highlight ? 'text-indigo-300' : 'text-slate-500'}`} />
              <span className="min-w-0">
                <span className="block text-[11.5px] font-bold text-slate-100 truncate">{s.primary}</span>
                {s.secondary && (
                  <span className="block text-[9.5px] font-mono text-slate-500 truncate">{s.secondary}</span>
                )}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
