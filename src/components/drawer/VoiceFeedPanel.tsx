import { Volume2, Mic } from 'lucide-react';
import type { ActionStep } from '@/types/domain';

interface VoiceFeedPanelProps {
  currentStep: number;
  firstStep: ActionStep | undefined;
  isListening: boolean;
  heardText: string;
  sttFeedback: string;
  onToggleSpeech: () => void;
}

export function VoiceFeedPanel({ currentStep, firstStep, isListening, heardText, sttFeedback, onToggleSpeech }: VoiceFeedPanelProps) {
  return (
    <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-2xl p-3.5 space-y-3 animate-in zoom-in-95 duration-200">
      <div className="flex gap-2.5 items-center">
        <div className="relative shrink-0">
          <span className="absolute -inset-1 rounded-full bg-emerald-500 animate-ping opacity-30" />
          <div className="w-7 h-7 rounded-full bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center">
            <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
        </div>
        <div className="flex-1 text-[10.5px]">
          <span className="font-extrabold uppercase text-emerald-400 block tracking-wide font-sans text-[9.5px]">Voice Assistant & Control Active</span>
          <p className="text-slate-300 font-mono leading-relaxed mt-0.5">
            {currentStep >= 4
              ? `”${firstStep?.title || 'Route ready'}. ${firstStep?.desc || 'Follow the highlighted paths.'}”`
              : currentStep >= 0
              ? '”Analyzing situation. Stand by for evacuation instructions.”'
              : '”Standing by. Speak to customize your profile or say \'trigger simulation\'.”'}
          </p>
        </div>
      </div>

      {/* SPEECH-TO-TEXT CONTROLS */}
      <div className="border-t border-emerald-500/10 pt-3 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleSpeech}
            className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 text-[9.5px] font-extrabold uppercase transition-all active:scale-95 duration-200 ${
              isListening
                ? 'bg-red-500/20 border-red-500 text-red-300 animate-pulse'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20 hover:border-emerald-500/40'
            }`}
          >
            <Mic className={`w-3.5 h-3.5 ${isListening ? 'text-red-400 animate-pulse' : 'text-emerald-400'}`} />
            {isListening ? 'Listening...' : 'Tap to Speak'}
          </button>
          <div className="flex-1 min-w-0 bg-slate-950/70 border border-slate-900 rounded-xl px-2.5 py-1.5 h-8 flex items-center">
            <span className="text-[10px] font-mono text-slate-400 truncate w-full">
              {heardText ? (
                <span className="text-slate-200 font-semibold">Heard: "{heardText}"</span>
              ) : isListening ? (
                <span className="text-red-400 animate-pulse">Say "wheelchair", "3rd floor", "trigger"...</span>
              ) : (
                'Voice control ready...'
              )}
            </span>
          </div>
        </div>
        {sttFeedback && (
          <div className="text-[10px] font-medium text-emerald-300 font-mono bg-emerald-500/5 px-2.5 py-1.5 rounded-xl border border-emerald-500/10 animate-in fade-in-50 slide-in-from-top-1 duration-150">
            {sttFeedback}
          </div>
        )}
      </div>
    </div>
  );
}
