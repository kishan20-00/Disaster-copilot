import { Users, Check, AlertTriangle } from 'lucide-react';
import { FAMILY_MEMBERS } from '@/constants/family';

interface SafetyGuardPanelProps {
  distressSent: boolean;
  onSendDistress: () => void;
}

export function SafetyGuardPanel({ distressSent, onSendDistress }: SafetyGuardPanelProps) {
  return (
    <div className="bg-slate-950/60 border border-slate-800/60 rounded-2xl p-3.5 space-y-2.5">
      <div className="flex items-center justify-between pb-1.5 border-b border-slate-900/60">
        <div className="flex items-center gap-1.5">
          <Users className="w-4 h-4 text-indigo-400" />
          <span className="text-[10.5px] font-extrabold tracking-wider uppercase font-sans text-slate-300">Safety Guard</span>
        </div>
        <span className={`text-[9px] font-mono font-bold ${
          FAMILY_MEMBERS.every(f => f.status === 'safe') ? 'text-emerald-400' : 'text-amber-400'
        }`}>
          {FAMILY_MEMBERS.filter(f => f.status === 'safe').length}/{FAMILY_MEMBERS.length} SAFE
        </span>
      </div>

      {/* Per-member status rows */}
      <div className="space-y-2">
        {FAMILY_MEMBERS.map(member => (
          <div key={member.id} className="flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: member.color }} />
            <div className="flex-1 min-w-0">
              <span className="text-[10.5px] font-bold text-slate-200 font-sans leading-none">{member.name}</span>
              <p className="text-[9px] font-mono text-slate-500 leading-none mt-0.5">{member.lastSeen}</p>
            </div>
            <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md shrink-0 ${
              member.status === 'safe'
                ? 'bg-emerald-500/15 text-emerald-400'
                : 'bg-amber-500/15 text-amber-400 animate-pulse'
            }`}>
              {member.status === 'safe' ? 'Safe' : 'Awaiting'}
            </span>
          </div>
        ))}
      </div>

      {/* Send Distress Signal — single-tap */}
      <div className="pt-1 border-t border-slate-900/60">
        {distressSent ? (
          <div className="flex items-center gap-1.5 justify-center py-1.5">
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[10.5px] font-bold text-emerald-400 font-mono">Distress signal sent to family</span>
          </div>
        ) : (
          <button
            onClick={onSendDistress}
            className="w-full py-2 bg-red-600/15 hover:bg-red-600/25 border border-red-500/35 hover:border-red-500/55 text-red-300 rounded-xl text-[10.5px] font-extrabold uppercase tracking-wide transition active:scale-95 flex items-center justify-center gap-1.5"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Send Distress Signal
          </button>
        )}
      </div>
    </div>
  );
}
