import type { AgentState } from '@/types/domain';

// Initial multi-agent pipeline roster (all idle before a run).
export const INITIAL_AGENTS: AgentState[] = [
  { id: 'situation', name: 'Situation Agent', role: 'Hazard Analysis', status: 'idle', result: '' },
  { id: 'personal', name: 'Personal Context Agent', role: 'Vulnerability Analysis', status: 'idle', result: '' },
  { id: 'route', name: 'Route & Shelter Agent', role: 'Evacuation Mapping', status: 'idle', result: '' },
  { id: 'translate', name: 'Translate & Comms Agent', role: 'Language Synthesis', status: 'idle', result: '' },
  { id: 'commander', name: 'Commander Agent', role: 'Synthesis & Command', status: 'idle', result: '' }
];
