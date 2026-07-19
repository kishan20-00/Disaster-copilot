import { Smartphone, Play } from 'lucide-react';
import type { Labels } from '@/constants/languages';

interface StandbyPanelProps {
  labels: Labels;
  onTriggerAlert: () => void;
}

export function StandbyPanel({ labels, onTriggerAlert }: StandbyPanelProps) {
  return (
    <div className="flex flex-col justify-center items-center py-6 text-center animate-in fade-in duration-300">
      <div className="w-12 h-16 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-center mb-3 shadow-inner">
        <Smartphone className="w-6 h-6 text-indigo-400 animate-pulse" />
      </div>
      <h4 className="text-[11.5px] font-bold text-slate-200 font-sans">SafeRoute AI Evacuation Assistant</h4>
      <p className="text-slate-400 text-[10px] px-6 mt-1.5 leading-relaxed max-w-[280px]">
        Configured with live Google Places shelter data around you, Google Identity API, and Gemini 2.5. Trigger an alert on the map or expand configs to start co-piloting.
      </p>

      <button
        onClick={onTriggerAlert}
        className="mt-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2 px-5 rounded-full shadow-lg hover:shadow-indigo-500/20 active:scale-95 transition-all flex items-center gap-2"
      >
        <Play className="w-3.5 h-3.5 fill-current" />
        {labels.trigger}
      </button>
    </div>
  );
}
