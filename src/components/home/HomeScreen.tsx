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
import { useT } from '@/i18n/context';

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
  const t = useT();
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
    if (mins < 1) return t('home.syncJustNow');
    if (mins < 60) return t('home.syncMinutes', { n: Math.round(mins) });
    return t('home.syncHours', { n: (mins / 60).toFixed(1) });
  })();

  return (
    <div className="absolute inset-0">
    {/* Bottom padding clears the nav (--nav-h) with a rem to spare, so the last
        card is never left tucked underneath it. */}
    <div className="absolute inset-0 overflow-y-auto pb-[calc(var(--nav-h)+1rem)] scrollbar-none bg-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-slate-200 px-4 pt-[max(0.75rem,var(--safe-top))] pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-indigo-500" />
          <span className="text-sm font-black text-slate-900 tracking-tight">SafeRoute AI</span>
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
            className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 active:scale-95 transition overflow-hidden"
            title={t('home.settings')}
          >
            {user?.avatar ? (
              <img src={user.avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <User className="w-4 h-4 text-slate-500" />
            )}
          </button>
        </div>
      </div>

      <div className="px-4 py-4 flex flex-col gap-4">
        {/* System Readiness (collapsible) */}
        <section className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden">
          <button
            onClick={() => setShowStatus((v) => !v)}
            className="w-full flex items-center justify-between px-3.5 py-2.5"
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10.5px] font-bold text-slate-700">{t('home.systemReadiness')}</span>
            </div>
            {showStatus ? <ChevronUp className="w-3.5 h-3.5 text-slate-500" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-500" />}
          </button>
          {showStatus && (
            <div className="grid grid-cols-3 gap-2 px-3.5 pb-3.5 text-[9.5px]">
              <div className="flex flex-col items-center gap-1 bg-white rounded-xl p-2 border border-slate-200">
                <Wifi className="w-3.5 h-3.5 text-indigo-500" />
                <span className="text-slate-500 text-center leading-tight">{locationCoarse ? t('home.coarseGps') : t('home.preciseGps')}</span>
              </div>
              <div className="flex flex-col items-center gap-1 bg-white rounded-xl p-2 border border-slate-200">
                <MapIcon className="w-3.5 h-3.5 text-indigo-500" />
                <span className="text-slate-500 text-center leading-tight">{googleMapsLoaded ? t('home.mapsReady') : t('home.mapsLoading')}</span>
              </div>
              <div className="flex flex-col items-center gap-1 bg-white rounded-xl p-2 border border-slate-200">
                <Radar className="w-3.5 h-3.5 text-indigo-500" />
                <span className="text-slate-500 text-center leading-tight">
                  {threatScan?.status === 'scanning' ? t('home.scanningShort') : threatScan ? t('home.lastChecked') : t('home.standbyShort')}
                </span>
              </div>
            </div>
          )}
          {showStatus && lastSyncLabel && (
            <p className="px-3.5 pb-3 text-[9px] text-slate-500 text-right">{t('home.lastSync', { when: lastSyncLabel })}</p>
          )}
        </section>

        {/* Hero */}
        {isSimulating ? (
          <section className="bg-indigo-50 border border-indigo-300 rounded-[28px] p-6 flex flex-col items-center text-center gap-3">
            <Radar className="w-10 h-10 text-indigo-500 animate-spin" style={{ animationDuration: '2.5s' }} />
            <h2 className="text-xl font-black text-slate-900">{t('home.analyzing')}</h2>
            <p className="text-[11px] text-slate-500 font-mono">
              {agents[currentStep]?.name ?? t('home.runningPipeline')}
            </p>
          </section>
        ) : currentStep < 0 && !threatScan ? (
          <section className="bg-slate-50 border border-slate-200 rounded-[28px] p-6 flex flex-col items-center text-center gap-3">
            <Shield className="w-12 h-12 text-indigo-500" />
            <h2 className="text-xl font-black text-slate-900">{t('home.activeTitle')}</h2>
            <p className="text-[11px] text-slate-500 leading-relaxed max-w-[280px]">
              {t('home.activeBlurb')}
            </p>
            <button
              onClick={onTriggerAlert}
              className="mt-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2.5 px-6 rounded-full shadow-lg active:scale-95 transition flex items-center gap-2"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {t('home.runCheck')}
            </button>
          </section>
        ) : threatScan?.status === 'unavailable' ? (
          <section className="bg-amber-50 border border-amber-300 rounded-[28px] p-6 flex flex-col items-center text-center gap-3">
            <AlertTriangle className="w-12 h-12 text-amber-500" />
            <h2 className="text-xl font-black text-slate-900">{t('home.unknownTitle')}</h2>
            <p className="text-[11px] text-amber-800/90 leading-relaxed max-w-[280px]">
              {t('home.unknownBlurb')}
            </p>
            <button
              onClick={onTriggerAlert}
              className="mt-1 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold py-2.5 px-6 rounded-full shadow-lg active:scale-95 transition"
            >
              {t('home.retry')}
            </button>
          </section>
        ) : worst ? (
          <section className={`rounded-[28px] p-6 flex flex-col items-center text-center gap-3 border ${hazardInfo(activeHazard).tone}`}>
            <AlertTriangle className="w-12 h-12 animate-pulse" />
            <h2 className="text-xl font-black">{t('home.detected', { hazard: hazardInfo(activeHazard).label })}</h2>
            <p className="text-[11px] opacity-90 leading-relaxed max-w-[280px]">{worst.hazard.headline}</p>
            <div className="grid grid-cols-2 gap-3 w-full mt-1">
              <div className="bg-white/60 rounded-2xl p-3 flex flex-col items-center gap-1">
                <HomeIcon className="w-4 h-4" />
                <span className="text-sm font-black">{shelter.distance}</span>
                <span className="text-[9px] uppercase tracking-wide opacity-70">{t('home.nearestShelter')}</span>
              </div>
              <div className="bg-white/60 rounded-2xl p-3 flex flex-col items-center gap-1">
                <Timer className="w-4 h-4" />
                <span className="text-sm font-black">{liveRoute?.durationText ?? '—'}</span>
                <span className="text-[9px] uppercase tracking-wide opacity-70">{t('home.evacEta')}</span>
              </div>
            </div>
            {/* Label matches what actually happens next: only 'evacuate' hazards
                get a route, so only those get a "navigation" CTA — a
                shelter-in-place hazard (e.g. typhoon) never computes one. */}
            <button
              onClick={onNavigateToMap}
              className="mt-1 w-full bg-slate-900/90 hover:bg-slate-900 text-white text-sm font-black py-3 rounded-full shadow-lg active:scale-95 transition flex items-center justify-center gap-2"
            >
              {hazardInfo(activeHazard).response === 'evacuate' ? (
                <>
                  <Compass className="w-4 h-4" />
                  {t('home.startNav')}
                </>
              ) : (
                <>
                  <HomeIcon className="w-4 h-4" />
                  {t('home.viewShelterSteps')}
                </>
              )}
            </button>
          </section>
        ) : (
          <section className="bg-emerald-50 border border-emerald-300 rounded-[28px] p-6 flex flex-col items-center text-center gap-3">
            <ShieldCheck className="w-12 h-12 text-emerald-600" />
            <h2 className="text-xl font-black text-slate-900">{t('home.safeTitle')}</h2>
            {hazardSignal && (
              <div className="bg-white/70 border border-emerald-300/60 rounded-2xl p-3 flex gap-2 items-start text-left">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-[10.5px] text-emerald-900/90 leading-relaxed">{hazardSignal.headline}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 w-full mt-1">
              <div className="bg-white/60 border border-slate-200 rounded-2xl p-3 flex flex-col items-center gap-1">
                <HomeIcon className="w-4 h-4 text-indigo-500" />
                <span className="text-sm font-black text-slate-900">{shelter.distance}</span>
                <span className="text-[9px] uppercase tracking-wide text-slate-500">{t('home.nearestShelter')}</span>
              </div>
              <div className="bg-white/60 border border-slate-200 rounded-2xl p-3 flex flex-col items-center gap-1">
                <Timer className="w-4 h-4 text-indigo-500" />
                <span className="text-sm font-black text-slate-900">{liveRoute?.durationText ?? '—'}</span>
                <span className="text-[9px] uppercase tracking-wide text-slate-500">{t('home.evacEta')}</span>
              </div>
            </div>
            <button
              onClick={onNavigateToMap}
              className="mt-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2.5 px-6 rounded-full shadow-lg active:scale-95 transition"
            >
              {t('home.viewMap')}
            </button>
          </section>
        )}

        {/* AI Agent Status (collapsible) — reuses AgentPipelineConsole as-is */}
        <section className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden">
          <button
            onClick={() => setShowAgents((v) => !v)}
            className="w-full flex items-center justify-between px-3.5 py-2.5"
          >
            <span className="text-[10.5px] font-bold text-slate-700">{t('home.agentStatus')}</span>
            {showAgents ? <ChevronUp className="w-3.5 h-3.5 text-slate-500" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-500" />}
          </button>
          {showAgents && <div className="px-3.5 pb-3.5"><AgentPipelineConsole agents={agents} currentStep={currentStep} /></div>}
        </section>

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onOpenFamily}
            className="bg-sky-50 border border-sky-200 rounded-2xl p-4 flex flex-col items-center gap-1.5 active:scale-95 transition"
          >
            <span className="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center mb-0.5">
              <Users className="w-5 h-5 text-sky-600" />
            </span>
            <span className="text-[11px] font-black text-slate-900">{t('nav.family')}</span>
            <span className={`text-[9.5px] font-mono ${inHarm > 0 ? 'text-red-600' : 'text-slate-500'}`}>
              {family.length === 0 ? t('home.noOneAdded') : inHarm > 0 ? t('guard.inAffected', { count: inHarm }) : t('home.allClear')}
            </span>
          </button>
          <button
            onClick={onOpenAlerts}
            className={`rounded-2xl p-4 flex flex-col items-center gap-1.5 active:scale-95 transition border ${
              worst ? 'bg-rose-50 border-rose-200' : 'bg-amber-50 border-amber-200'
            }`}
          >
            <span className={`w-10 h-10 rounded-full flex items-center justify-center mb-0.5 ${worst ? 'bg-rose-100' : 'bg-amber-100'}`}>
              <AlertTriangle className={`w-5 h-5 ${worst ? 'text-rose-600' : 'text-amber-600'}`} />
            </span>
            <span className="text-[11px] font-black text-slate-900">{t('nav.alerts')}</span>
            <span className={`text-[9.5px] font-mono ${worst ? 'text-rose-600' : 'text-slate-500'}`}>
              {worst
                ? `${hazardInfo(activeHazard).label}${worst.impact.distanceKm !== null ? ` · ${Math.round(worst.impact.distanceKm)} km` : ''}`
                : t('home.noActiveAlert')}
            </span>
          </button>
        </div>

        {/* Quick Resources */}
        <div>
          <h3 className="text-[10.5px] font-bold text-slate-600 mb-2 px-0.5">{t('home.quickResources')}</h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => { onSelectCategory('medical'); onNavigateToMap(); }}
              className="bg-violet-50 border border-violet-200 rounded-2xl p-5 flex flex-col items-center gap-2 active:scale-95 transition"
            >
              <span className="w-11 h-11 rounded-full bg-violet-100 flex items-center justify-center">
                <Stethoscope className="w-5 h-5 text-violet-600" />
              </span>
              <span className="text-[11px] font-black text-slate-900">{t('home.medical')}</span>
            </button>
            <button
              onClick={() => { onSelectCategory('shelter'); onNavigateToMap(); }}
              className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex flex-col items-center gap-2 active:scale-95 transition"
            >
              <span className="w-11 h-11 rounded-full bg-emerald-100 flex items-center justify-center">
                <HomeIcon className="w-5 h-5 text-emerald-600" />
              </span>
              <span className="text-[11px] font-black text-slate-900">{t('home.shelter')}</span>
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
      className={`absolute bottom-[calc(var(--nav-h)+2rem)] right-4 w-14 h-14 rounded-2xl shadow-lg flex items-center justify-center active:scale-95 transition z-30 border ${
        voiceAssistant
          ? 'bg-emerald-600 border-emerald-400 text-white animate-pulse'
          : 'bg-indigo-600 border-indigo-400 text-white'
      }`}
      title={t('home.voiceAssistant')}
    >
      {voiceAssistant ? <Mic className="w-6 h-6" /> : <Sparkles className="w-6 h-6" />}
    </button>
    </div>
  );
}
