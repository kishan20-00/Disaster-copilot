import { Activity, Check } from 'lucide-react';
import type { AgentState } from '@/types/domain';

interface AgentPipelineConsoleProps {
  agents: AgentState[];
  currentStep: number;
}

export function AgentPipelineConsole({ agents, currentStep }: AgentPipelineConsoleProps) {
  return (
    <div className="bg-slate-950/60 border border-slate-850/60 rounded-2xl p-3.5">
      <h3 className="text-[10.5px] font-bold tracking-wider uppercase text-slate-400 flex items-center gap-1.5 mb-2.5 pb-1 border-b border-slate-900/40">
        <Activity className="w-3.5 h-3.5 text-indigo-400" />
        Multi-Agent Pipeline Logs
      </h3>
      <div className="space-y-2">
        {agents.map((agent: any, i: number) => {
          const isActive = currentStep === i;
          return (
            <div key={agent.id} className={`text-[10.5px] rounded-xl p-2.5 transition ${isActive ? 'bg-indigo-950/25 border border-indigo-500/30' : 'bg-slate-950/30 border border-slate-900/30'}`}>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1.5">
                  {agent.status === 'completed' && <Check className="w-3 h-3 text-emerald-400" />}
                  {agent.status === 'running' && <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-ping shrink-0" />}
                  {agent.status === 'idle' && <span className="w-1.5 h-1.5 bg-slate-800 rounded-full shrink-0" />}
                  <span className={`font-black font-sans uppercase ${isActive ? 'text-indigo-300' : 'text-slate-300'}`}>{agent.name}</span>
                  <span className="text-[9px] text-slate-500 font-mono">({agent.role})</span>
                </div>
                <div>
                  {agent.status === 'running' && <span className="text-[9px] text-indigo-400 font-bold animate-pulse font-mono uppercase">Thinking</span>}
                  {agent.status === 'completed' && <span className="text-[9px] text-emerald-400/80 font-mono font-bold uppercase">Ready</span>}
                  {agent.status === 'idle' && <span className="text-[9px] text-slate-600 font-mono font-semibold uppercase">Pending</span>}
                </div>
              </div>

              {agent.status === 'running' && (
                <div className="mt-1.5 space-y-1">
                  <div className="h-1.5 w-full animate-shimmer rounded bg-slate-800" />
                  <div className="h-1.5 w-4/5 animate-shimmer rounded bg-slate-800" />
                </div>
              )}

              {agent.status === 'completed' && (
                <p className="mt-1 text-[10px] text-slate-400 leading-normal font-mono select-text bg-slate-950/50 p-1.5 rounded border border-slate-900/40">{agent.result}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
