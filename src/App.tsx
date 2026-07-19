import { useState } from 'react';
import type { ActionStep, HazardSignal, AgentState, PersonalContext } from '@/types/domain';
import { LANGUAGES_MAP } from '@/constants/languages';
import { INITIAL_AGENTS } from '@/constants/agents';
import { getShelterInfo } from '@/lib/shelter';
import { buildAdvice } from '@/lib/advice';
import { buildSmsDraft } from '@/lib/sms';
import { useARCamera } from '@/hooks/useARCamera';
import { useVoiceAssistant } from '@/hooks/useVoiceAssistant';
import { useAuth } from '@/hooks/useAuth';
import { useGeolocation } from '@/hooks/useGeolocation';
import { usePlacesSearch } from '@/hooks/usePlacesSearch';
import { useGoogleMaps } from '@/hooks/useGoogleMaps';
import { useAgentPipeline } from '@/hooks/useAgentPipeline';
import { BrandHeader } from '@/components/shell/BrandHeader';
import { DynamicIsland } from '@/components/shell/DynamicIsland';
import { SmsGateModal } from '@/components/sms/SmsGateModal';
import { AROverlay } from '@/components/map/AROverlay';
import { AuthScreen } from '@/components/auth/AuthScreen';
import { EnableLocationState } from '@/components/map/EnableLocationState';
import { MapSearchBar } from '@/components/map/MapSearchBar';
import { CategoryChips } from '@/components/map/CategoryChips';
import { MapControls } from '@/components/map/MapControls';
import { MarkerPopup } from '@/components/map/MarkerPopup';
import { VoiceFeedPanel } from '@/components/drawer/VoiceFeedPanel';
import { LiveTelemetryCard } from '@/components/drawer/LiveTelemetryCard';
import { SafetyGuardPanel } from '@/components/drawer/SafetyGuardPanel';
import { HazardAdvisory } from '@/components/drawer/HazardAdvisory';
import { AgentPipelineConsole } from '@/components/drawer/AgentPipelineConsole';
import { ActionCards } from '@/components/drawer/ActionCards';
import { StandbyPanel } from '@/components/drawer/StandbyPanel';
import type { LatLng } from './services/geolocation';
import type { WalkingRoute } from './services/maps';
import {
  RotateCcw,
  Compass,
  ChevronUp,
  ChevronDown
} from 'lucide-react';

export default function App() {
  // Demo configurations
  const [activeHazard, setActiveHazard] = useState<'earthquake' | 'typhoon' | 'tsunami'>('earthquake');
  const [personalContext, setPersonalContext] = useState<PersonalContext>({
    language: 'English',
    location: '',
    floor: '9th Floor',
    companions: 'With a Child',
    mobility: 'Fully Mobile'
  });

  // Simulation play state
  const [isSimulating, setIsSimulating] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [showSmsModal, setShowSmsModal] = useState(false);
  const [smsStatus, setSmsStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [distressSent, setDistressSent] = useState(false);

  // Google Maps styles and interactive state
  const [mapLayer, setMapLayer] = useState<'streets' | 'satellite' | 'terrain' | 'traffic' | 'hazard'>('streets');
  const [filterCategory, setFilterCategory] = useState<'all' | 'shelter' | 'water' | 'medical' | 'station'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMarker, setActiveMarker] = useState<string | null>(null);
  const [isDrawerExpanded, setIsDrawerExpanded] = useState(false);
  const [voiceAssistant, setVoiceAssistant] = useState(false);
  const [cameraMode, setCameraMode] = useState(false);
  const cameraRef = useARCamera(cameraMode, setCameraMode);

  // Dynamic Google Places API States & Refs
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [dynamicMarkers, setDynamicMarkers] = useState<any[]>([]);

  // Live, model-generated state (replaces hardcoded JMA bulletins, evac steps, SMS draft, user pin)
  const [hazardSignal, setHazardSignal] = useState<HazardSignal | null>(null);
  const [liveSteps, setLiveSteps] = useState<ActionStep[] | null>(null);
  const [liveSmsDraft, setLiveSmsDraft] = useState<string | null>(null);
  const [livePosition, setLivePosition] = useState<LatLng | null>(null);
  const [liveAddress, setLiveAddress] = useState<string | null>(null);
  const [liveRoute, setLiveRoute] = useState<WalkingRoute | null>(null);
  const [liveShelter, setLiveShelter] = useState<{ name: string; distanceMeters: number; lat: number; lng: number } | null>(null);

  // Real Google Maps API integration state (map instance/overlay refs live in useGoogleMaps)
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);

  // Auth/session (Google OAuth) and geolocation are managed by hooks.
  const { user, authLoading, signOut } = useAuth();
  const { requestLocation, locationStatus } = useGeolocation({
    enabled: !!user,
    googleMapsLoaded, livePosition,
    setLivePosition, setLiveAddress, setPersonalContext
  });
  const handleSignOut = () => {
    signOut();
    setCurrentStep(-1);
    setIsSimulating(false);
    setSmsStatus('idle');
    setShowSmsModal(false);
  };

  // Google Maps instance + markers/route/layers (owns all map refs); returns the map container ref.
  const { mapRef } = useGoogleMaps({
    dynamicMarkers, mapLayer, currentStep,
    user, livePosition, liveRoute, liveShelter, googleMapsLoaded,
    setGoogleMapsLoaded, setMapCenter, setActiveMarker
  });

  // Dynamic Places API search — populates dynamicMarkers from the current map center.
  usePlacesSearch({
    googleMapsLoaded, mapCenter, filterCategory, searchQuery,
    setDynamicMarkers
  });

  // Agent Pipeline States
  const [agents, setAgents] = useState<AgentState[]>(INITIAL_AGENTS);

  // Live multi-agent pipeline (Situation → Personal → Route → Translate → Commander) + route-ready haptic.
  useAgentPipeline({
    isSimulating, currentStep, activeHazard, personalContext, googleMapsLoaded, dynamicMarkers,
    livePosition, liveAddress,
    setAgents, setHazardSignal, setCurrentStep, setLiveSteps, setLiveSmsDraft,
    setLiveRoute, setLiveShelter, setLiveAddress, setIsSimulating, setShowSmsModal
  });

  // Translate labels dynamically based on selected language
  const labels = LANGUAGES_MAP[personalContext.language];

  // Dynamic advice synthesis based on context. Prefers live Gemini-generated steps;
  // falls back to the deterministic template below if Gemini is disabled or hasn't returned yet.
  const getDynamicAdvice = (): ActionStep[] => buildAdvice({ liveSteps, personalContext, activeHazard, dynamicMarkers, userPos: livePosition });


  // Restart simulation
  const handleTriggerAlert = () => {
    window.speechSynthesis?.cancel();
    setAgents(prev => prev.map(a => ({ ...a, status: 'idle', result: '' })));
    setHazardSignal(null);
    setLiveSteps(null);
    setLiveSmsDraft(null);
    setLiveRoute(null);
    setLiveShelter(null);
    setSmsStatus('idle');
    setShowSmsModal(false);
    setCurrentStep(0);
    setIsSimulating(true);
    navigator.vibrate?.([300, 100, 300]);
  };



  const handleApproveSms = () => {
    setSmsStatus('sending');
    setTimeout(() => {
      setSmsStatus('sent');
      navigator.vibrate?.([600]);
      setTimeout(() => {
        setShowSmsModal(false);
      }, 2000);
    }, 1500);
  };

  // Get the drafted message text. Prefers live Gemini draft when available.
  const getDraftedSmsText = (): string => buildSmsDraft({ liveSmsDraft, personalContext, activeHazard, dynamicMarkers, livePosition });

  const { isListening, heardText, sttFeedback, toggleSpeechRecognition } = useVoiceAssistant({
    voiceAssistant, personalContext, currentStep, smsStatus, isSimulating,
    liveSteps, activeHazard, livePosition, dynamicMarkers,
    setPersonalContext, onTrigger: handleTriggerAlert, onApproveSms: handleApproveSms
  });

  return (
    <div className="min-h-screen mobile-device-wrapper flex flex-col items-center justify-center p-0 sm:p-6 select-none">
      {/* Brand Header (Desktop Only) */}
      <BrandHeader />

      {/* iPhone Device Shell Mockup */}
      <div className="mobile-device-frame bg-slate-950 w-full h-screen sm:h-[844px] sm:w-[390px] flex flex-col justify-between shadow-2xl relative text-white">
        
        {/* iOS Dynamic Island Area */}
        <DynamicIsland />

        {!user ? (
          /* ==========================================
             PREMIUM AUTHENTICATION & LOGIN GUARD
             ========================================== */
          <AuthScreen authLoading={authLoading} />
        ) : !(googleMapsLoaded && livePosition) ? (
          /* ==========================================
             LOCATION GATE — the app is fully driven by the user's real GPS
             ========================================== */
          <EnableLocationState mapsReady={googleMapsLoaded} status={locationStatus} onRetry={requestLocation} />
        ) : (
          /* ==========================================
             MAIN PREMIUM GOOGLE MAPS DISASTER CO-PILOT DASHBOARD
             ========================================== */
          <>
            {/* AR LIVE CAMERA FEED + OVERLAY */}
            <AROverlay
              cameraMode={cameraMode}
              cameraRef={cameraRef}
              currentStep={currentStep}
              activeHazard={activeHazard}
              shelterName={getShelterInfo(livePosition, dynamicMarkers).name}
              shelterDistance={getShelterInfo(livePosition, dynamicMarkers).distance}
              liveRoute={liveRoute}
              firstStep={getDynamicAdvice()[0]}
            />

            {/* REAL GOOGLE MAPS DIV */}
            <div
              ref={mapRef}
              className="absolute inset-0 w-full h-full z-0 overflow-hidden"
            />

            {/* FLOATING TOP GOOGLE MAPS SEARCH BAR */}
            <div className="absolute top-12 left-4 right-4 z-30 flex flex-col gap-2.5">
              <MapSearchBar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onClearSearch={() => setSearchQuery('')}
                location={personalContext.location}
                user={user}
                onSignOut={handleSignOut}
              />

              {/* HORIZONTAL CATEGORY SCROLLABLE CHIPS */}
              <CategoryChips
                filterCategory={filterCategory}
                onSelectCategory={(id) => setFilterCategory(id as any)}
              />
            </div>

            {/* FLOATING RIGHT-SIDE CONTROLS */}
            <MapControls
              mapLayer={mapLayer}
              onSelectLayer={(id) => setMapLayer(id as any)}
              onRecenter={() => { setActiveMarker(null); setSearchQuery(''); }}
              voiceAssistant={voiceAssistant}
              onToggleVoice={() => {
                if (voiceAssistant) window.speechSynthesis?.cancel();
                setVoiceAssistant(!voiceAssistant);
              }}
              cameraMode={cameraMode}
              onToggleCamera={() => setCameraMode(!cameraMode)}
              onTriggerAlert={handleTriggerAlert}
              isSimulating={isSimulating}
            />

            {/* SELECTION POPUP INFO CARD OVER MAP */}
            <MarkerPopup
              activeMarker={activeMarker}
              markers={dynamicMarkers}
              currentStep={currentStep}
              onClose={() => setActiveMarker(null)}
              onNavigate={() => { handleTriggerAlert(); setIsDrawerExpanded(true); }}
            />

            {/* GOOGLE MAPS EXPANDABLE BOTTOM SHEET DRAWER */}
            <div 
              className={`absolute left-0 right-0 bottom-0 bg-slate-900 border-t border-slate-800 rounded-t-3xl z-40 transition-all duration-300 ease-out shadow-2xl flex flex-col ${
                isDrawerExpanded ? 'h-[520px]' : 'h-[110px]'
              }`}
            >
              {/* Drawer Top Header - Interactive Drag/Expand Bar */}
              <div 
                onClick={() => setIsDrawerExpanded(!isDrawerExpanded)}
                className="w-full py-3 flex flex-col items-center cursor-pointer hover:bg-slate-850/50 rounded-t-3xl transition duration-150 shrink-0"
              >
                {/* Visual Drag pill */}
                <div className="w-10 h-1 bg-slate-700 rounded-full mb-1.5" />
                
                {/* Dynamic Status / ETA Display */}
                <div className="w-full px-5 flex justify-between items-center text-left">
                  <div className="flex gap-2.5 items-center">
                    <Compass className={`w-5 h-5 text-indigo-400 ${isSimulating ? 'animate-spin' : ''}`} style={{ animationDuration: '6s' }} />
                    <div className="flex flex-col">
                      <span className="text-xs font-black tracking-tight text-white font-sans uppercase">
                        {currentStep >= 4 
                          ? `${(liveShelter?.name || getShelterInfo(livePosition, dynamicMarkers).name)} Safe Route`
                          : currentStep >= 0 
                          ? '📡 Analyzing active safety route...'
                          : '🟢 SafeRoute AI Active'}
                      </span>
                      <span className="text-[9.5px] text-slate-400 font-mono leading-none mt-0.5 uppercase tracking-wide">
                        {currentStep >= 4
                          ? (liveRoute ? `${liveRoute.durationText} ETA • ${liveRoute.distanceText} • Hazard-Free Path` : 'Calculating safest route…')
                          : '🔐 Real-Time Cloud Node'}
                      </span>
                    </div>
                  </div>

                  <div className="p-1 text-slate-400 hover:text-white transition shrink-0">
                    {isDrawerExpanded ? <ChevronDown className="w-4.5 h-4.5" /> : <ChevronUp className="w-4.5 h-4.5" />}
                  </div>
                </div>
              </div>

              {/* Drawer Content Area (Scrollable when expanded) */}
              {isDrawerExpanded && (
                <div className="flex-1 overflow-y-auto px-5 pb-8 scrollbar-none space-y-4">
                  
                  {/* VOICE ASSISTANT LIVE FEED (If active) */}
                  {voiceAssistant && (
                    <VoiceFeedPanel
                      currentStep={currentStep}
                      firstStep={getDynamicAdvice()[0]}
                      isListening={isListening}
                      heardText={heardText}
                      sttFeedback={sttFeedback}
                      onToggleSpeech={toggleSpeechRecognition}
                    />
                  )}

                  {/* LIVE TELEMETRY CARD — real GPS + nearest shelter + walking ETA */}
                  <LiveTelemetryCard
                    livePosition={livePosition}
                    liveAddress={liveAddress}
                    liveShelter={liveShelter}
                    liveRoute={liveRoute}
                    dynamicMarkers={dynamicMarkers}
                    language={personalContext.language}
                    activeHazard={activeHazard}
                    isSimulating={isSimulating}
                    onSelectHazard={setActiveHazard}
                  />

                  {/* SAFETY GUARD DASHBOARD — All Family Secure */}
                  <SafetyGuardPanel
                    distressSent={distressSent}
                    onSendDistress={() => {
                      setDistressSent(true);
                      navigator.vibrate?.([200, 100, 200, 100, 200]);
                      setTimeout(() => setDistressSent(false), 8000);
                    }}
                  />

                  {/* ACTIVE LIVE HAZARD ADVISORY */}
                  {currentStep >= 0 && (
                    <HazardAdvisory activeHazard={activeHazard} hazardSignal={hazardSignal} />
                  )}

                  {/* MULTI-AGENT PIPELINE CONSOLE LOGS */}
                  {currentStep >= 0 && (
                    <AgentPipelineConsole agents={agents} currentStep={currentStep} />
                  )}

                  {/* HIGH-TECH FINAL ACTION ADVICE CARDS */}
                  {currentStep >= 4 && (
                    <ActionCards steps={getDynamicAdvice()} labels={labels} onOpenSms={() => setShowSmsModal(true)} />
                  )}

                  {/* STANDBY STATE ADVICE PANEL */}
                  {currentStep < 0 && (
                    <StandbyPanel labels={labels} onTriggerAlert={handleTriggerAlert} />
                  )}

                  {/* RESTART SIMULATION IN DRAWER IF COMPLETED */}
                  {currentStep >= 4 && (
                    <div className="flex justify-center pt-2">
                      <button 
                        onClick={handleTriggerAlert}
                        disabled={isSimulating}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-900 text-slate-300 hover:text-white rounded-xl text-xs font-bold shadow transition active:scale-95"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Restart Emergency Replay
                      </button>
                    </div>
                  )}

                </div>
              )}
            </div>

            {/* Dynamic iOS Safety Gate Modal (Sliding Draw Sheet) */}
            <SmsGateModal
              show={showSmsModal}
              labels={labels}
              smsStatus={smsStatus}
              draftText={getDraftedSmsText()}
              onClose={() => setShowSmsModal(false)}
              onApprove={handleApproveSms}
            />
          </>
        )}

      </div>
    </div>
  );
}
