import { Smartphone, Play } from 'lucide-react';
import { useT } from '@/i18n/context';

interface StandbyPanelProps {
  onTriggerAlert: () => void;
}

export function StandbyPanel({ onTriggerAlert }: StandbyPanelProps) {
  const t = useT();
  return (
    <div className="flex flex-col justify-center items-center py-6 text-center animate-in fade-in duration-300">
      <div className="w-12 h-16 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-center mb-3 shadow-inner">
        <Smartphone className="w-6 h-6 text-indigo-500 animate-pulse" />
      </div>
      <h4 className="text-[11.5px] font-bold text-slate-800 font-sans">{t('standby.title')}</h4>
      <p className="text-slate-500 text-[10px] px-6 mt-1.5 leading-relaxed max-w-[280px]">
        {t('standby.blurb')}
      </p>

      <button
        onClick={onTriggerAlert}
        className="mt-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2 px-5 rounded-full shadow-lg hover:shadow-indigo-500/20 active:scale-95 transition-all flex items-center gap-2"
      >
        <Play className="w-3.5 h-3.5 fill-current" />
        {t('standby.trigger')}
      </button>
    </div>
  );
}
