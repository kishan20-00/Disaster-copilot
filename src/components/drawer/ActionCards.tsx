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
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-3 shadow-xl">
      <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
        <Shield className="w-5 h-5 text-indigo-500" />
        <span className="text-[11px] font-extrabold tracking-wider uppercase font-sans text-indigo-600">
          {labels.instructions}
        </span>
      </div>

      <div className="space-y-2.5">
        {steps.map((step: any) => (
          <div key={step.num} className="flex gap-2.5 items-start p-2.5 bg-white border border-slate-200 rounded-xl">
            <div className="w-5 h-5 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-[10px] font-black text-indigo-500 font-mono shrink-0 mt-0.5">
              {step.num}
            </div>
            <div className="flex-1 text-[11px]">
              <h3 className="font-bold text-slate-900 font-sans leading-snug">{step.title}</h3>
              <p className="text-slate-500 mt-0.5 leading-relaxed">{step.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Manual Trigger For SMS Confirmation Portal */}
      <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-[11px]">
        <span className="text-[10px] text-indigo-500/80 font-mono flex items-center gap-1 font-sans">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Safe Route Formulated
        </span>
        <button
          onClick={onOpenSms}
          className="text-indigo-500 hover:text-indigo-600 font-bold hover:underline flex items-center gap-1 transition"
        >
          {labels.approving} <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
