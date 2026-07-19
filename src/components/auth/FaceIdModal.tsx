import { Fingerprint } from 'lucide-react';

interface FaceIdModalProps {
  show: boolean;
  faceIdState: 'idle' | 'scanning' | 'success' | 'error';
}

// Simulated FaceID biometric scan overlay (offline emergency bypass).
export function FaceIdModal({ show, faceIdState }: FaceIdModalProps) {
  if (!show) return null;
  return (
    <div className="absolute inset-0 bg-black/90 backdrop-blur-md z-50 flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="w-full max-w-[220px] text-center space-y-6">

        {/* Animated FaceID target scanner */}
        <div className="relative w-40 h-40 mx-auto border-2 border-indigo-500/20 rounded-[44px] flex items-center justify-center overflow-hidden bg-slate-900/40 shadow-inner">
          {/* Custom Face ID layout lines */}
          <div className="absolute inset-4 border border-dashed border-indigo-500/10 rounded-[32px]" />

          {/* Face icon with state */}
          <Fingerprint className={`w-20 h-20 transition duration-500 ${
            faceIdState === 'success' ? 'text-emerald-400 scale-105' :
            faceIdState === 'scanning' ? 'text-indigo-400 animate-pulse animate-[pulse_1s_infinite]' :
            'text-slate-500'
          }`} />

          {/* Cyber Scanner Laser Line */}
          {faceIdState === 'scanning' && (
            <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-indigo-400 to-transparent top-0 animate-[scan_2.2s_ease-in-out_infinite]" />
          )}

          {/* Glowing border on success */}
          {faceIdState === 'success' && (
            <div className="absolute inset-0 border-2 border-emerald-400 rounded-[44px] animate-ping opacity-25" />
          )}
        </div>

        {/* Telemetry Status Labels */}
        <div className="space-y-1">
          <h3 className="text-sm font-extrabold tracking-tight text-white font-sans uppercase leading-none">
            {faceIdState === 'scanning' ? "Scanning Biometrics..." : "Access Granted!"}
          </h3>
          <p className="text-[9px] text-slate-400 font-mono uppercase tracking-widest leading-none">
            {faceIdState === 'scanning' ? "Analyzing face telemetry..." : "LOCAL DECRYPTION SUCCESSFUL"}
          </p>
        </div>

        {/* Status Indicator */}
        <div className="flex justify-center items-center gap-1.5 text-xs">
          {faceIdState === 'scanning' ? (
            <span className="text-[9px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded font-mono uppercase font-bold">Offline Local Sync...</span>
          ) : (
            <span className="text-[9px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-mono uppercase font-bold">Offline Decrypted</span>
          )}
        </div>
      </div>
    </div>
  );
}
