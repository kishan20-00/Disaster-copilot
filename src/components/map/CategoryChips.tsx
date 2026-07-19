interface CategoryChipsProps {
  filterCategory: string;
  onSelectCategory: (id: string) => void;
}

export function CategoryChips({ filterCategory, onSelectCategory }: CategoryChipsProps) {
  return (
    <div className="overflow-x-auto whitespace-nowrap flex gap-2 pb-1 scrollbar-none select-none">
      {[
        { id: 'all', label: 'All', emoji: '🗺️' },
        { id: 'shelter', label: 'Shelters', emoji: '🏥' },
        { id: 'water', label: 'Water', emoji: '⛲' },
        { id: 'medical', label: 'Medical', emoji: '🩹' },
        { id: 'station', label: 'Stations', emoji: '🚉' }
      ].map((chip) => {
        const isActive = filterCategory === chip.id;
        return (
          <button
            key={chip.id}
            onClick={() => onSelectCategory(chip.id)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10.5px] font-extrabold tracking-wide uppercase transition border shadow-md active:scale-95 ${
              isActive
                ? 'bg-indigo-600 border-indigo-400 text-white font-sans'
                : 'bg-slate-900/85 backdrop-blur border-slate-800/80 text-slate-300 hover:text-white'
            }`}
          >
            <span className="text-xs leading-none">{chip.emoji}</span>
            {chip.label}
          </button>
        );
      })}
    </div>
  );
}
