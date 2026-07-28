import { useState } from 'react';
import {
  Shield, AlertTriangle, ChevronDown, ChevronUp, Wifi, Map as MapIcon, Radar,
  ShieldCheck, Sparkles, Home as HomeIcon, Timer, Play, Compass, Users, Stethoscope, Mic, User
} from 'lucide-react';
import type { AgentState, ActionStep, AuthUser, Hazard, HazardSignal } from '@/types/domain';
import type { ThreatScanState } from '@/lib/impact';
import type { FamilyMember } from '@/lib/familyStore';
import type { FamilyStatus } from '@/lib/familyStatus';
import type { LatLng } from '@/services/geolocation';
import type { WalkingRoute } from '@/services/maps';
import { getShelterInfo } from '@/lib/shelter';
import { hazardInfo } from '@/constants/hazards';
import { AgentPipelineConsole } from '@/components/drawer/AgentPipelineConsole';
import { VoiceFeedPanel } from '@/components/drawer/VoiceFeedPanel';

interface HomeScreenProps {
  user: AuthUser | null;
  onOpenProfile: () => void;
  hazardSignal: HazardSignal | null;
  threatScan: ThreatScanState | null;
  activeHazard: Hazard;
  currentStep: number;
  isSimulating: boolean;
  agents: AgentState[];
  livePosition: LatLng | null;
  dynamicMarkers: any[];
  liveRoute: WalkingRoute | null;
  family: FamilyMember[];
  familyStatus: FamilyStatus[] | null;
  locationCoarse: boolean;
  googleMapsLoaded: boolean;
  voiceAssistant: boolean;
  isListening: boolean;
  heardText: string;
  sttFeedback: string;
  firstStep: ActionStep | undefined;
  onToggleSpeech: () => void;
  onToggleVoice: () => void;
  onTriggerAlert: () => void;
  onNavigateToMap: () => void;
  onSelectCategory: (id: string) => void;
  onOpenFamily: () => void;
  onOpenAlerts: () => void;
}

// The Home tab: a status-first landing screen, reskinned from a Stitch mockup
// onto the app's existing dark theme. Every figure here is real app state —
// there is no demo/placeholder content — so most of this file is composition,
// not new logic. See AgentPipelineConsole, getShelterInfo, hazardInfo, and
// ThreatScanPanel's status handling (mirrored below) for the actual data work.
export function HomeScreen({
  user, onOpenProfile,
  hazardSignal, threatScan, activeHazard, currentStep, isSimulating, agents,
  livePosition, dynamicMarkers, liveRoute, family, familyStatus,
  locationCoarse, googleMapsLoaded, voiceAssistant, isListening, heardText, sttFeedback,
  firstStep, onToggleSpeech, onToggleVoice, onTriggerAlert, onNavigateToMap,
  onSelectCategory, onOpenFamily, onOpenAlerts
}: HomeScreenProps) {
  const [showStatus, setShowStatus] = useState(false);
  const [showAgents, setShowAgents] = useState(false);

  const shelter = getShelterInfo(livePosition, dynamicMarkers);
  const worst = threatScan?.status === 'threat' ? threatScan.verdict?.worst ?? null : null;
  const inHarm = (familyStatus ?? []).filter((f) => f.impact.affected).length;

  // "X ago" from the real last scan, not a fixed placeholder — mirrors how
  // familyStore's describeAge treats its own timestamps.
  const lastSyncLabel = (() => {
    if (!threatScan?.scannedAt) return null;
    const mins = Math.max(0, (Date.now() - Date.parse(threatScan.scannedAt)) / 60_000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${Math.round(mins)} min ago`;
    return `${(mins / 60).toFixed(1)} h ago`;
  })();

  return (
    <div className="absolute inset-0">
    <div className="absolute inset-0 overflow-y-auto pb-20 scrollbar-none bg-slate-950">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-slate-950/90 backdrop-blur border-b border-slate-900 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-indigo-400" />
          <span className="text-sm font-black text-white tracking-tight">SafeRoute AI</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onTriggerAlert}
            disabled={isSimulating}
            className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-full text-[10.5px] font-black uppercase tracking-wide shadow-lg active:scale-95 disabled:opacity-45 disabled:pointer-events-none transition"
          >
            SOS
          </button>
          {/* Only settings entry point reachable from Home — previously this
              (floor/mobility/language, sign-out) was only reachable from a
              small avatar icon buried in the Navigate tab's search bar. */}
          <button
            onClick={onOpenProfile}
            className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 active:scale-95 transition overflow-hidden"
            title="Settings"
          >
            {user?.avatar ? (
              <img src={user.avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <User className="w-4 h-4 text-slate-400" />
            )}
          </button>
        </div>
      </div>

      <div className="px-4 py-4 flex flex-col gap-4">
        {/* System Readiness (collapsible) */}
        <section className="bg-slate-950/60 border border-slate-800/60 rounded-2xl overflow-hidden">
          <button
            onClick={() => setShowStatus((v) => !v)}
            className="w-full flex items-center justify-between px-3.5 py-2.5"
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10.5px] font-bold text-slate-200">System Readiness</span>
            </div>
            {showStatus ? <ChevronUp className="w-3.5 h-3.5 text-slate-500" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-500" />}
          </button>
          {showStatus && (
            <div className="grid grid-cols-3 gap-2 px-3.5 pb-3.5 text-[9.5px]">
              <div className="flex flex-col items-center gap-1 bg-slate-900/60 rounded-xl p-2 border border-slate-800/60">
                <Wifi className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-slate-400 text-center leading-tight">{locationCoarse ? 'Coarse GPS' : 'High-precision GPS'}</span>
              </div>
              <div className="flex flex-col items-center gap-1 bg-slate-900/60 rounded-xl p-2 border border-slate-800/60">
                <MapIcon className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-slate-400 text-center leading-tight">{googleMapsLoaded ? 'Maps ready' : 'Loading maps'}</span>
              </div>
              <div className="flex flex-col items-center gap-1 bg-slate-900/60 rounded-xl p-2 border border-slate-800/60">
                <Radar className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-slate-400 text-center leading-tight">
                  {threatScan?.status === 'scanning' ? 'Scanning' : threatScan ? 'Last checked' : 'Standby'}
                </span>
              </div>
            </div>
          )}
          {showStatus && lastSyncLabel && (
            <p className="px-3.5 pb-3 text-[9px] text-slate-500 text-right">Last sync: {lastSyncLabel}</p>
          )}
        </section>

        {/* Hero */}
        {isSimulating ? (
          <section className="bg-indigo-950/25 border border-indigo-500/30 rounded-[28px] p-6 flex flex-col items-center text-center gap-3">
            <Radar className="w-10 h-10 text-indigo-400 animate-spin" style={{ animationDuration: '2.5s' }} />
            <h2 className="text-xl font-black text-white">Analyzing…</h2>
            <p className="text-[11px] text-slate-400 font-mono">
              {agents[currentStep]?.name ?? 'Running safety pipeline'}
            </p>
          </section>
        ) : currentStep < 0 && !threatScan ? (
          <section className="bg-slate-950/60 border border-slate-800/60 rounded-[28px] p-6 flex flex-col items-center text-center gap-3">
            <Shield className="w-12 h-12 text-indigo-400" />
            <h2 className="text-xl font-black text-white">SafeRoute AI Active</h2>
            <p className="text-[11px] text-slate-400 leading-relaxed max-w-[280px]">
              Checks JMA and worldwide hazard feeds, then works out whether anything found actually reaches your position.
            </p>
            <button
              onClick={onTriggerAlert}
              className="mt-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2.5 px-6 rounded-full shadow-lg active:scale-95 transition flex items-center gap-2"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Run Safety Check
            </button>
          </section>
        ) : threatScan?.status === 'unavailable' ? (
          <section className="bg-amber-950/25 border border-amber-500/40 rounded-[28px] p-6 flex flex-col items-center text-center gap-3">
            <AlertTriangle className="w-12 h-12 text-amber-400" />
            <h2 className="text-xl font-black text-white">Status unknown</h2>
            <p className="text-[11px] text-amber-200/90 leading-relaxed max-w-[280px]">
              No hazard feed could be reached, so this is not an all-clear. Retry once you have a connection.
            </p>
            <button
              onClick={onTriggerAlert}
              className="mt-1 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold py-2.5 px-6 rounded-full shadow-lg active:scale-95 transition"
            >
              Retry
            </button>
          </section>
        ) : worst ? (
          <section className={`rounded-[28px] p-6 flex flex-col items-center text-center gap-3 border ${hazardInfo(activeHazard).tone}`}>
            <AlertTriangle className="w-12 h-12 animate-pulse" />
            <h2 className="text-xl font-black text-white">{hazardInfo(activeHazard).label} detected</h2>
            <p className="text-[11px] opacity-90 leading-relaxed max-w-[280px]">{worst.hazard.headline}</p>
            <div className="grid grid-cols-2 gap-3 w-full mt-1">
              <div className="bg-black/25 rounded-2xl p-3 flex flex-col items-center gap-1">
                <HomeIcon className="w-4 h-4" />
                <span className="text-sm font-black">{shelter.distance}</span>
                <span className="text-[9px] uppercase tracking-wide opacity-70">Nearest shelter</span>
              </div>
              <div className="bg-black/25 rounded-2xl p-3 flex flex-col items-center gap-1">
                <Timer className="w-4 h-4" />
                <span className="text-sm font-black">{liveRoute?.durationText ?? '—'}</span>
                <span className="text-[9px] uppercase tracking-wide opacity-70">Evac ETA</span>
              </div>
            </div>
            {/* Label matches what actually happens next: only 'evacuate' hazards
                get a route, so only those get a "navigation" CTA — a
                shelter-in-place hazard (e.g. typhoon) never computes one. */}
            <button
              onClick={onNavigateToMap}
              className="mt-1 w-full bg-white/90 hover:bg-white text-slate-950 text-sm font-black py-3 rounded-full shadow-lg active:scale-95 transition flex items-center justify-center gap-2"
            >
              {hazardInfo(activeHazard).response === 'evacuate' ? (
                <>
                  <Compass className="w-4 h-4" />
                  Start Safe Navigation
                </>
              ) : (
                <>
                  <HomeIcon className="w-4 h-4" />
                  View Shelter-in-Place Steps
                </>
              )}
            </button>
          </section>
        ) : (
          <section className="bg-emerald-950/20 border border-emerald-500/35 rounded-[28px] p-6 flex flex-col items-center text-center gap-3">
            <ShieldCheck className="w-12 h-12 text-emerald-400" />
            <h2 className="text-xl font-black text-white">You are safe</h2>
            {hazardSignal && (
              <div className="bg-black/20 border border-emerald-500/20 rounded-2xl p-3 flex gap-2 items-start text-left">
                <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-[10.5px] text-emerald-100/90 leading-relaxed">{hazardSignal.headline}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 w-full mt-1">
              <div className="bg-slate-900/60 border border-slate-800/60 rounded-2xl p-3 flex flex-col items-center gap-1">
                <HomeIcon className="w-4 h-4 text-indigo-400" />
                <span className="text-sm font-black text-white">{shelter.distance}</span>
                <span className="text-[9px] uppercase tracking-wide text-slate-500">Nearest shelter</span>
              </div>
              <div className="bg-slate-900/60 border border-slate-800/60 rounded-2xl p-3 flex flex-col items-center gap-1">
                <Timer className="w-4 h-4 text-indigo-400" />
                <span className="text-sm font-black text-white">{liveRoute?.durationText ?? '—'}</span>
                <span className="text-[9px] uppercase tracking-wide text-slate-500">Evac ETA</span>
              </div>
            </div>
            <button
              onClick={onNavigateToMap}
              className="mt-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2.5 px-6 rounded-full shadow-lg active:scale-95 transition"
            >
              View Map
            </button>
          </section>
        )}

        {/* AI Agent Status (collapsible) — reuses AgentPipelineConsole as-is */}
        <section className="bg-slate-950/60 border border-slate-800/60 rounded-2xl overflow-hidden">
          <button
            onClick={() => setShowAgents((v) => !v)}
            className="w-full flex items-center justify-between px-3.5 py-2.5"
          >
            <span className="text-[10.5px] font-bold text-slate-200">AI Agent Status</span>
            {showAgents ? <ChevronUp className="w-3.5 h-3.5 text-slate-500" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-500" />}
          </button>
          {showAgents && <div className="px-3.5 pb-3.5"><AgentPipelineConsole agents={agents} currentStep={currentStep} /></div>}
        </section>

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onOpenFamily}
            className="bg-slate-950/60 border border-slate-800/60 rounded-2xl p-4 flex flex-col items-center gap-1.5 active:scale-95 transition"
          >
            <Users className="w-6 h-6 text-indigo-400" />
            <span className="text-[11px] font-black text-white">Family</span>
            <span className={`text-[9.5px] font-mono ${inHarm > 0 ? 'text-red-400' : 'text-slate-500'}`}>
              {family.length === 0 ? 'No one added' : inHarm > 0 ? `${inHarm} in affected area` : 'All clear'}
            </span>
          </button>
          <button
            onClick={onOpenAlerts}
            className="bg-slate-950/60 border border-slate-800/60 rounded-2xl p-4 flex flex-col items-center gap-1.5 active:scale-95 transition"
          >
            <AlertTriangle className="w-6 h-6 text-amber-400" />
            <span className="text-[11px] font-black text-white">Alerts</span>
            <span className="text-[9.5px] font-mono text-slate-500">
              {worst
                ? `${hazardInfo(activeHazard).label}${worst.impact.distanceKm !== null ? ` · ${Math.round(worst.impact.distanceKm)} km` : ''}`
                : 'No active alert'}
            </span>
          </button>
        </div>

        {/* Quick Resources */}
        <div>
          <h3 className="text-[10.5px] font-bold text-slate-300 mb-2 px-0.5">Quick Resources</h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => { onSelectCategory('medical'); onNavigateToMap(); }}
              className="bg-slate-950/60 border border-slate-800/60 rounded-2xl p-5 flex flex-col items-center gap-2 active:scale-95 transition"
            >
              <Stethoscope className="w-6 h-6 text-indigo-400" />
              <span className="text-[11px] font-black text-white">Medical</span>
            </button>
            <button
              onClick={() => { onSelectCategory('shelter'); onNavigateToMap(); }}
              className="bg-slate-950/60 border border-slate-800/60 rounded-2xl p-5 flex flex-col items-center gap-2 active:scale-95 transition"
            >
              <HomeIcon className="w-6 h-6 text-indigo-400" />
              <span className="text-[11px] font-black text-white">Shelter</span>
            </button>
          </div>
        </div>

        {voiceAssistant && (
          <VoiceFeedPanel
            currentStep={currentStep}
            firstStep={firstStep}
            isListening={isListening}
            heardText={heardText}
            sttFeedback={sttFeedback}
            onToggleSpeech={onToggleSpeech}
          />
        )}
      </div>
    </div>

    {/* Voice FAB — a sibling of the scroll container, not a descendant, so it
        stays pinned to the phone frame instead of scrolling with the content. */}
    <button
      onClick={onToggleVoice}
      className={`absolute bottom-24 right-4 w-14 h-14 rounded-2xl shadow-lg flex items-center justify-center active:scale-95 transition z-30 border ${
        voiceAssistant
          ? 'bg-emerald-600 border-emerald-400 text-white animate-pulse'
          : 'bg-indigo-600 border-indigo-400 text-white'
      }`}
      title="Voice assistant"
    >
      {voiceAssistant ? <Mic className="w-6 h-6" /> : <Sparkles className="w-6 h-6" />}
    </button>
    </div>
  );
}
