import type { Hazard, Language } from '@/types/domain';

interface ScenarioSwitcherProps {
  language: Language;
  activeHazard: Hazard;
  isSimulating: boolean;
  onSelectHazard: (hazard: Hazard) => void;
}

export function ScenarioSwitcher({ language, activeHazard, isSimulating, onSelectHazard }: ScenarioSwitcherProps) {
  return (
    <div className="pt-2 border-t border-slate-900/60">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-slate-500 uppercase tracking-wide font-bold text-[9px]">Drill scenario</span>
        <span className="text-[9px] font-mono text-slate-600">{language}</span>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {([
          { id: 'earthquake', label: 'Earthquake', emoji: '🌋' },
          { id: 'typhoon', label: 'Typhoon', emoji: '🌀' },
          { id: 'tsunami', label: 'Tsunami', emoji: '🌊' }
        ] as { id: Hazard; label: string; emoji: string }[]).map((h) => (
          <button
            key={h.id}
            type="button"
            onClick={() => !isSimulating && onSelectHazard(h.id)}
            disabled={isSimulating}
            className={`text-[10px] font-bold py-1.5 rounded-xl border transition active:scale-95 ${
              activeHazard === h.id
                ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-200'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            } ${isSimulating ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span className="mr-1">{h.emoji}</span>{h.label}
          </button>
        ))}
      </div>
    </div>
  );
}
