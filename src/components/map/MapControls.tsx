import { useState } from 'react';
import { Layers, Navigation, Mic, MicOff, Camera, AlertTriangle } from 'lucide-react';

interface MapControlsProps {
  mapLayer: string;
  onSelectLayer: (id: string) => void;
  onRecenter: () => void;
  voiceAssistant: boolean;
  onToggleVoice: () => void;
  cameraMode: boolean;
  onToggleCamera: () => void;
  onTriggerAlert: () => void;
  isSimulating: boolean;
}

export function MapControls({
  mapLayer, onSelectLayer, onRecenter, voiceAssistant, onToggleVoice,
  cameraMode, onToggleCamera, onTriggerAlert, isSimulating
}: MapControlsProps) {
  const [showLayerMenu, setShowLayerMenu] = useState(false);

  return (
    <div className="absolute top-36 right-4 z-30 flex flex-col gap-2.5">
      {/* Map Layers Controller */}
      <div className="relative">
        <button
          onClick={() => setShowLayerMenu(!showLayerMenu)}
          className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-lg border transition ${
            showLayerMenu || mapLayer !== 'streets'
              ? 'bg-indigo-600 border-indigo-400 text-white'
              : 'bg-slate-900/85 backdrop-blur border-slate-800/80 text-slate-300 hover:text-white'
          }`}
          title="Map Layers"
        >
          <Layers className="w-4 h-4" />
        </button>

        {/* Floating Layers Dropdown */}
        {showLayerMenu && (
          <div className="absolute right-11 top-0 bg-slate-900/95 backdrop-blur border border-slate-800 rounded-xl p-2 shadow-2xl flex flex-col gap-1.5 min-w-[120px] animate-in fade-in zoom-in-95 duration-200">
            {[
              { id: 'streets', label: 'Vector Map' },
              { id: 'satellite', label: 'Satellite' },
              { id: 'traffic', label: 'Live Traffic' },
              { id: 'hazard', label: 'Hazard Feed' }
            ].map((layer) => (
              <button
                key={layer.id}
                onClick={() => {
                  onSelectLayer(layer.id);
                  setShowLayerMenu(false);
                }}
                className={`text-left text-[10px] font-extrabold uppercase px-2.5 py-1.5 rounded-lg transition ${
                  mapLayer === layer.id
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {layer.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Recenter Button */}
      <button
        onClick={onRecenter}
        className="w-9 h-9 rounded-xl bg-slate-900/85 backdrop-blur border border-slate-800/80 text-slate-300 hover:text-white flex items-center justify-center shadow-lg active:scale-95 transition"
        title="Recenter Map"
      >
        <Navigation className="w-4 h-4 transform rotate-45" />
      </button>

      {/* Voice Assistant Toggle */}
      <button
        onClick={onToggleVoice}
        className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-lg border transition active:scale-95 ${
          voiceAssistant
            ? 'bg-emerald-600 border-emerald-400 text-white animate-pulse'
            : 'bg-slate-900/85 backdrop-blur border-slate-800/80 text-slate-300 hover:text-white'
        }`}
        title="Audio Co-pilot Guidance"
      >
        {voiceAssistant ? <Mic className="w-4 h-4 animate-pulse" /> : <MicOff className="w-4 h-4" />}
      </button>

      {/* AR Camera View Toggle */}
      <button
        onClick={onToggleCamera}
        className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-lg border transition active:scale-95 ${
          cameraMode
            ? 'bg-violet-600 border-violet-400 text-white'
            : 'bg-slate-900/85 backdrop-blur border-slate-800/80 text-slate-300 hover:text-white'
        }`}
        title="AR Camera View"
      >
        <Camera className="w-4 h-4" />
      </button>

      {/* Emergency SOS Pulse Trigger */}
      <button
        onClick={onTriggerAlert}
        disabled={isSimulating}
        className="w-10 h-10 rounded-xl bg-red-600 hover:bg-red-500 text-white border border-red-400 flex items-center justify-center shadow-lg active:scale-95 disabled:opacity-45 disabled:pointer-events-none transition relative group"
        title="Trigger Emergency Advisory"
      >
        <span className="absolute inset-0 rounded-xl bg-red-600 animate-ping opacity-30 group-hover:opacity-40" />
        <AlertTriangle className="w-4.5 h-4.5 text-white animate-pulse relative z-10" />
      </button>
    </div>
  );
}
