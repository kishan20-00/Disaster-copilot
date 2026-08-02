import { useT } from '@/i18n/context';

interface CategoryChipsProps {
  filterCategory: string;
  onSelectCategory: (id: string) => void;
}

export function CategoryChips({ filterCategory, onSelectCategory }: CategoryChipsProps) {
  const t = useT();
  return (
    <div className="overflow-x-auto whitespace-nowrap flex gap-2 pb-1 scrollbar-none select-none">
      {[
        { id: 'all', label: t('category.all'), emoji: '🗺️' },
        { id: 'shelter', label: t('category.shelter'), emoji: '🏥' },
        { id: 'water', label: t('category.water'), emoji: '⛲' },
        { id: 'medical', label: t('category.medical'), emoji: '🩹' },
        { id: 'station', label: t('category.station'), emoji: '🚉' }
      ].map((chip) => {
        const isActive = filterCategory === chip.id;
        return (
          <button
            key={chip.id}
            onClick={() => onSelectCategory(chip.id)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10.5px] font-extrabold tracking-wide uppercase transition border shadow-md active:scale-95 ${
              isActive
                ? 'bg-indigo-600 border-indigo-400 text-white font-sans'
                : 'bg-white/85 backdrop-blur border-slate-200 text-slate-600 hover:text-slate-900'
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
