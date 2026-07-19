import { Shield, X, MessageSquare, Users, MapPin, Send, Check } from 'lucide-react';

interface SmsGateModalProps {
  show: boolean;
  labels: { approving: string; sent: string };
  smsStatus: 'idle' | 'sending' | 'sent';
  draftText: string;
  onClose: () => void;
  onApprove: () => void;
}

// Human-in-the-loop approval gate for the emergency SMS draft.
export function SmsGateModal({ show, labels, smsStatus, draftText, onClose, onApprove }: SmsGateModalProps) {
  if (!show) return null;
  return (
    <div className="absolute inset-0 bg-black/75 backdrop-blur-sm z-50 flex flex-col justify-end animate-in fade-in duration-300">
      <div className="bg-slate-900 border-t border-slate-800 rounded-t-3xl p-5 space-y-4 animate-in slide-in-from-bottom duration-300">

        {/* Modal Drag Handle */}
        <div className="flex justify-center -mt-2.5 mb-2">
          <div className="w-12 h-1 bg-slate-700 rounded-full" />
        </div>

        {/* Title Header */}
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-400" />
            <div>
              <h4 className="text-sm font-extrabold tracking-tight text-white font-sans uppercase">
                {labels.approving}
              </h4>
              <span className="text-[10px] text-slate-400 font-mono">Emergency Approval Gate</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Interactive SMS Preview Card */}
        <div className="border border-slate-800 rounded-2xl overflow-hidden shadow-inner bg-slate-950/60 p-4">
          <div className="flex justify-between items-center border-b border-slate-850 pb-2 mb-3">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
              <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
              <span>TO: Emergency Contacts</span>
            </div>
            <span className="text-[10px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded font-mono font-extrabold">SMS DRAFT</span>
          </div>

          <p className="text-xs text-slate-200 font-mono leading-relaxed bg-indigo-950/15 border border-indigo-950/45 p-3 rounded-xl select-text">
            {draftText}
          </p>

          <div className="mt-3 flex gap-2 text-[10px] text-slate-400">
            <span className="flex items-center gap-1 font-mono"><Users className="w-3 h-3 text-indigo-400" /> Yen (Spouse)</span>
            <span className="flex items-center gap-1 font-mono"><MapPin className="w-3 h-3 text-indigo-400" /> Smart Live GPS Attached</span>
          </div>
        </div>

        {/* Confirmation Action State Controls */}
        {smsStatus === 'idle' && (
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={onClose}
              className="border border-slate-800 hover:bg-slate-800 text-slate-300 font-bold py-3 px-4 rounded-xl text-xs active:scale-95 transition-all"
            >
              Hold / Edit
            </button>
            <button
              onClick={onApprove}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded-xl text-xs active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/15"
            >
              <Send className="w-3.5 h-3.5" /> Approve & Send
            </button>
          </div>
        )}

        {smsStatus === 'sending' && (
          <div className="py-4 flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mb-2" />
            <span className="text-xs text-slate-300 font-bold tracking-tight">Encrypting & transmitting satellite SMS...</span>
          </div>
        )}

        {smsStatus === 'sent' && (
          <div className="py-4 flex flex-col items-center justify-center animate-in zoom-in-95 duration-300">
            <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full flex items-center justify-center mb-2 shadow-lg">
              <Check className="w-6 h-6 stroke-[3]" />
            </div>
            <span className="text-xs text-emerald-400 font-bold tracking-tight mb-0.5">{labels.sent}</span>
            <span className="text-[10px] text-slate-500 font-mono">Message delivered to 1 contact</span>
          </div>
        )}

      </div>
    </div>
  );
}
