import { Shield } from 'lucide-react';

interface AuthScreenProps {
  authLoading: 'none' | 'google';
}

// Login guard: Google OAuth (GSI renders into #google-signin-button).
export function AuthScreen({ authLoading }: AuthScreenProps) {
  return (
    <div className="flex-1 flex flex-col pt-12 overflow-y-auto px-5 pb-8 scrollbar-none justify-center animate-in fade-in duration-300">
      {/* Top Logo and Tagline */}
      <div className="flex flex-col items-center text-center mt-6">
        <div className="relative mb-4 group">
          <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full blur opacity-40 group-hover:opacity-60 transition duration-1000 group-hover:duration-200 animate-pulse" />
          <div className="relative w-16 h-16 bg-slate-900 border border-slate-800 rounded-full flex items-center justify-center shadow-lg">
            <Shield className="w-8 h-8 text-indigo-400 animate-pulse" />
          </div>
        </div>
        <h2 className="text-xl font-black tracking-tight text-white font-sans uppercase">SafeRoute AI</h2>
        <span className="text-[10px] text-indigo-400 font-mono tracking-widest uppercase font-bold">安心避難 • Disaster Co-pilot</span>
        <p className="text-slate-400 text-xs px-4 mt-3 leading-relaxed">
          Active multi-agent advisor for urban hazards. Verify identity to sync contacts, medical records, and live telemetry.
        </p>
      </div>

      {/* Real Google OAuth Login */}
      <div className="my-6 space-y-4">
        <div className="w-full flex flex-col items-center">
          <div
            id="google-signin-button"
            className="w-full flex justify-center h-11"
          />
          {authLoading === 'google' && (
            <div className="mt-2 text-[10px] text-indigo-400 font-mono flex items-center gap-1.5 animate-pulse">
              <span className="w-3 h-3 border border-indigo-400 border-t-transparent rounded-full animate-spin" />
              Securely connecting to Google Identity Services...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
