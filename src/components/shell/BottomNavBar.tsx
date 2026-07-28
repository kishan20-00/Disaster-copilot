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
    <div className="absolute bottom-0 left-0 right-0 h-16 z-40 bg-slate-900/95 backdrop-blur border-t border-slate-800 flex items-stretch justify-around px-1">
      {items.map(({ id, label, Icon, active, onClick }) => (
        <button
          key={id}
          onClick={onClick}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition active:scale-95 ${
            active ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Icon className="w-5 h-5" style={active ? { fill: 'currentColor', fillOpacity: 0.15 } : undefined} />
          <span className="text-[9px] font-black uppercase tracking-wide">{label}</span>
        </button>
      ))}
    </div>
  );
}
