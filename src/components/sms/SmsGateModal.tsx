import { Shield, X, MessageSquare, MapPin, Copy, Check } from 'lucide-react';

interface SmsGateModalProps {
  show: boolean;
  labels: { approving: string; copied: string };
  smsStatus: 'idle' | 'copied';
  draftText: string;
  onClose: () => void;
  onApprove: () => void;
}

// Human-in-the-loop gate for the emergency message draft. This app has no SMS
// transport of its own, so it never claims to send: it prepares the message and
// copies it for the user to send from their own Messages app.
export function SmsGateModal({ show, labels, smsStatus, draftText, onClose, onApprove }: SmsGateModalProps) {
  if (!show) return null;
  return (
    <div className="absolute inset-0 bg-black/75 backdrop-blur-sm z-50 flex flex-col justify-end animate-in fade-in duration-300">
      <div className="bg-white border-t border-slate-200 rounded-t-3xl p-5 space-y-4 animate-in slide-in-from-bottom duration-300">

        {/* Modal Drag Handle */}
        <div className="flex justify-center -mt-2.5 mb-2">
          <div className="w-12 h-1 bg-slate-300 rounded-full" />
        </div>

        {/* Title Header */}
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-500" />
            <div>
              <h4 className="text-sm font-extrabold tracking-tight text-slate-900 font-sans uppercase">
                {labels.approving}
              </h4>
              <span className="text-[10px] text-slate-500 font-mono">Emergency Approval Gate</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Interactive SMS Preview Card */}
        <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-inner bg-slate-50 p-4">
          <div className="flex justify-between items-center border-b border-slate-200 pb-2 mb-3">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono">
              <MessageSquare className="w-3.5 h-3.5 text-indigo-500" />
              <span>Emergency message</span>
            </div>
            <span className="text-[10px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 px-1.5 py-0.5 rounded font-mono font-extrabold">DRAFT</span>
          </div>

          <p className="text-xs text-slate-800 font-mono leading-relaxed bg-indigo-50 border border-indigo-200 p-3 rounded-xl select-text">
            {draftText}
          </p>

          {/* Only a real, verifiable fact about the draft: it carries a live GPS
              link when a position is known. No recipient is shown because the
              app has no contacts — the user picks who to send it to. */}
          <div className="mt-3 flex gap-2 text-[10px] text-slate-500">
            <span className="flex items-center gap-1 font-mono"><MapPin className="w-3 h-3 text-indigo-500" /> Live GPS link included</span>
          </div>
        </div>

        {/* Confirmation Action State Controls */}
        {smsStatus === 'idle' && (
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={onClose}
              className="border border-slate-200 hover:bg-slate-100 text-slate-600 font-bold py-3 px-4 rounded-xl text-xs active:scale-95 transition-all"
            >
              Hold / Edit
            </button>
            <button
              onClick={onApprove}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded-xl text-xs active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/15"
            >
              <Copy className="w-3.5 h-3.5" /> Copy Message
            </button>
          </div>
        )}

        {smsStatus === 'copied' && (
          <div className="py-4 flex flex-col items-center justify-center animate-in zoom-in-95 duration-300">
            <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 rounded-full flex items-center justify-center mb-2 shadow-lg">
              <Check className="w-6 h-6 stroke-[3]" />
            </div>
            <span className="text-xs text-emerald-600 font-bold tracking-tight text-center px-4">{labels.copied}</span>
          </div>
        )}

      </div>
    </div>
  );
}
