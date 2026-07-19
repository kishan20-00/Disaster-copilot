import { Shield, CheckCircle2, ArrowRight } from 'lucide-react';
import type { ActionStep } from '@/types/domain';
import type { Labels } from '@/constants/languages';

interface ActionCardsProps {
  steps: ActionStep[];
  labels: Labels;
  onOpenSms: () => void;
}

export function ActionCards({ steps, labels, onOpenSms }: ActionCardsProps) {
  return (
    <div className="bg-slate-950/60 border border-slate-800/60 rounded-2xl p-3.5 space-y-3 shadow-xl">
      <div className="flex items-center gap-2 pb-2 border-b border-slate-900">
        <Shield className="w-5 h-5 text-indigo-400" />
        <span className="text-[11px] font-extrabold tracking-wider uppercase font-sans text-indigo-300">
          {labels.instructions}
        </span>
      </div>

      <div className="space-y-2.5">
        {steps.map((step: any) => (
          <div key={step.num} className="flex gap-2.5 items-start p-2.5 bg-slate-950 border border-slate-900 rounded-xl">
            <div className="w-5 h-5 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-[10px] font-black text-indigo-400 font-mono shrink-0 mt-0.5">
              {step.num}
            </div>
            <div className="flex-1 text-[11px]">
              <h3 className="font-bold text-slate-100 font-sans leading-snug">{step.title}</h3>
              <p className="text-slate-400 mt-0.5 leading-relaxed">{step.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Manual Trigger For SMS Confirmation Portal */}
      <div className="pt-2 border-t border-slate-900 flex justify-between items-center text-[11px]">
        <span className="text-[10px] text-indigo-400/80 font-mono flex items-center gap-1 font-sans">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Safe Route Formulated
        </span>
        <button
          onClick={onOpenSms}
          className="text-indigo-400 hover:text-indigo-300 font-bold hover:underline flex items-center gap-1 transition"
        >
          {labels.approving} <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
