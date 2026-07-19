import { X, Check } from 'lucide-react';

interface MarkerPopupProps {
  activeMarker: string | null;
  markers: any[];
  currentStep: number;
  onClose: () => void;
  onNavigate: () => void;
}

export function MarkerPopup({ activeMarker, markers, currentStep, onClose, onNavigate }: MarkerPopupProps) {
  if (!activeMarker) return null;
  const marker = markers.find((m: any) => m.id === activeMarker);
  if (!marker) return null;
  const isShelter = marker.category === 'shelter';
  return (
    <div className="absolute top-60 left-4 right-4 z-20 backdrop-blur-md bg-slate-950/85 border border-slate-800 rounded-2xl p-3.5 shadow-2xl animate-in slide-in-from-top-4 duration-300 flex flex-col gap-2">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-1.5">
          <span className="text-xs">
            {marker.category === 'shelter' ? '🏥' : marker.category === 'water' ? '⛲' : marker.category === 'medical' ? '🩹' : '🚉'}
          </span>
          <h4 className="text-[11.5px] font-black text-slate-100 font-sans tracking-wide uppercase">{marker.name}</h4>
        </div>
        <button
          onClick={onClose}
          className="p-0.5 hover:bg-slate-800 rounded-full transition text-slate-400 hover:text-slate-200"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <p className="text-[10px] text-slate-400 leading-normal font-mono">{marker.desc}</p>

      {isShelter && (
        <div className="flex justify-between items-center mt-1 text-[10px]">
          <span className="text-emerald-400 font-bold flex items-center gap-1">
            <Check className="w-3.5 h-3.5" /> ADA Accessible
          </span>
          {currentStep < 0 && (
            <button
              onClick={onNavigate}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold px-2.5 py-1 rounded-lg uppercase tracking-wide transition font-sans text-[9px]"
            >
              Navigate Route
            </button>
          )}
        </div>
      )}
    </div>
  );
}
