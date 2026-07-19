import { Search, X, User, LogOut } from 'lucide-react';

interface MapSearchBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onClearSearch: () => void;
  location: string;
  user: { avatar?: string } | null;
  onSignOut: () => void;
}

export function MapSearchBar({ searchQuery, onSearchChange, onClearSearch, location, user, onSignOut }: MapSearchBarProps) {
  return (
    <div className="backdrop-blur-md bg-slate-900/85 border border-slate-800/80 rounded-2xl py-2.5 px-4 flex items-center justify-between shadow-2xl relative">
      <div className="flex items-center gap-2.5 flex-1 mr-2">
        <Search className="w-4 h-4 text-slate-400 shrink-0" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={`Search ${location} evacuation...`}
          className="bg-transparent text-xs text-white placeholder-slate-400 focus:outline-none w-full border-none"
        />
        {searchQuery && (
          <button onClick={onClearSearch} className="p-0.5 hover:bg-slate-800 rounded-full transition text-slate-400 hover:text-slate-200">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Vertical Divider line */}
      <div className="h-4 w-px bg-slate-800 mx-1.5 shrink-0" />

      {/* Profile Session Avatar / Menu Button with Hover LogOut Animation */}
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
  );
}
