import { ShieldCheck, Compass, Users, AlertTriangle } from 'lucide-react';

interface BottomNavBarProps {
  activeTab: 'home' | 'navigate' | 'family';
  /** True while the Alerts sheet is open — the only case Alerts shows as active. */
  alertsOpen: boolean;
  onSelectHome: () => void;
  onSelectNavigate: () => void;
  onSelectFamily: () => void;
  onOpenAlerts: () => void;
}

// Home, Navigate, and Family are real tabs. Alerts opens a sheet layered on
// top of whichever tab is underneath, so it still gets a real active state
// without needing a fourth persisted "current screen" concept.
export function BottomNavBar({ activeTab, alertsOpen, onSelectHome, onSelectNavigate, onSelectFamily, onOpenAlerts }: BottomNavBarProps) {
  const items: { id: string; label: string; Icon: typeof ShieldCheck; active: boolean; onClick: () => void }[] = [
    { id: 'home', label: 'Home', Icon: ShieldCheck, active: activeTab === 'home' && !alertsOpen, onClick: onSelectHome },
    { id: 'navigate', label: 'Navigate', Icon: Compass, active: activeTab === 'navigate' && !alertsOpen, onClick: onSelectNavigate },
    { id: 'family', label: 'Family', Icon: Users, active: activeTab === 'family' && !alertsOpen, onClick: onSelectFamily },
    { id: 'alerts', label: 'Alerts', Icon: AlertTriangle, active: alertsOpen, onClick: onOpenAlerts }
  ];

  return (
    /* Height comes from --nav-h (4rem of controls + the home-indicator inset,
       see index.css) and the same inset is added as padding, so the buttons
       stay above the indicator in a standalone PWA instead of underneath it.
       Everything that stops short of the nav measures from --nav-h too. */
    <div className="absolute bottom-0 left-0 right-0 h-[var(--nav-h)] pb-[var(--safe-bottom)] z-40 bg-white/95 backdrop-blur border-t border-slate-200 flex items-stretch justify-around px-1">
      {items.map(({ id, label, Icon, active, onClick }) => (
        <button
          key={id}
          onClick={onClick}
          className="flex-1 flex flex-col items-center justify-center transition active:scale-95"
        >
          {/* Active tab is an indigo pill — the mockup's Material 3 pill SHAPE
              (a clear "you are here" affordance) but in the app's own accent, so
              green stays reserved for its "safe / all-clear" meaning (safe hero,
              shelter pins, Navigate status). The pill wraps an inner span so it
              hugs its content instead of filling the full-height flex-1 button. */}
          <span
            className={`flex flex-col items-center justify-center gap-0.5 rounded-full transition-colors px-4 py-1 ${
              active ? 'bg-indigo-100 text-indigo-700' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Icon className="w-5 h-5" style={active ? { fill: 'currentColor', fillOpacity: 0.2 } : undefined} strokeWidth={active ? 2.5 : 2} />
            <span className="text-[9px] font-black uppercase tracking-wide">{label}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
