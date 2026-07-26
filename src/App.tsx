import { useEffect, useState } from 'react';
import type { ActionStep, HazardSignal, AgentState, PersonalContext, Hazard } from '@/types/domain';
import { LANGUAGES_MAP } from '@/constants/languages';
import { INITIAL_AGENTS } from '@/constants/agents';
import { getShelterInfo } from '@/lib/shelter';
import { responseMode } from '@/constants/hazards';
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
import { SplashScreen } from '@/components/shell/SplashScreen';
import { hasSeenSplash } from '@/lib/splash';
import { SmsGateModal } from '@/components/sms/SmsGateModal';
import { AROverlay } from '@/components/map/AROverlay';
import { AuthScreen } from '@/components/auth/AuthScreen';
import { EnableLocationState } from '@/components/map/EnableLocationState';
import { MapSearchBar } from '@/components/map/MapSearchBar';
import { FocusBanner } from '@/components/map/FocusBanner';
import type { PlaceSuggestion } from '@/services/placeSearch';
import { resolveSuggestion } from '@/services/placeSearch';
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
import { ProfileSheet } from '@/components/profile/ProfileSheet';
import type { FamilyMember } from '@/lib/familyStore';
import { loadFamily, saveFamily, familyScope, purgeLegacyFamily } from '@/lib/familyStore';
import type { FamilyStatus } from '@/lib/familyStatus';
import { sessionExpiry } from '@/lib/session';
import { ThreatScanPanel } from '@/components/drawer/ThreatScanPanel';
import type { ThreatScanState } from '@/lib/impact';
import type { LatLng } from './services/geolocation';
import type { WalkingRoute } from './services/maps';
import {
  RotateCcw,
  Compass,
  ChevronUp,
  ChevronDown,
  ShieldCheck,
  AlertTriangle,
  X
} from 'lucide-react';

export default function App() {
  // The hazard is discovered by the live scan, never picked by hand. It starts
  // as earthquake purely so the type is populated before the first scan.
  const [activeHazard, setActiveHazard] = useState<Hazard>('earthquake');
  const [threatScan, setThreatScan] = useState<ThreatScanState | null>(null);
  // Whether the shelter shown is an officially designated site or a Places guess.
  const [shelterSource, setShelterSource] = useState<'official' | 'places' | null>(null);
  const [personalContext, setPersonalContext] = useState<PersonalContext>({
    language: 'English',
    location: '',
    // Ground floor and alone are the conservative defaults: assuming someone is
    // high up would tell them to stay put in a tsunami, and assuming companions
    // put "with child" in the emergency message whether or not one existed.
    floor: 0,
    companions: { count: 0, needsAssistance: false, needsCarrying: false },
    mobility: 'Fully Mobile'
  });

  // Simulation play state
  const [isSimulating, setIsSimulating] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [showSmsModal, setShowSmsModal] = useState(false);
  const [smsStatus, setSmsStatus] = useState<'idle' | 'sending' | 'sent'>('idle');

  // Google Maps styles and interactive state
  const [mapLayer, setMapLayer] = useState<'streets' | 'satellite' | 'terrain' | 'traffic' | 'hazard'>('streets');
  const [filterCategory, setFilterCategory] = useState<'all' | 'shelter' | 'water' | 'medical' | 'station'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  // A place the user chose to examine instead of where they are standing. Null
  // means "me". Deliberately not persisted: starting the app pointed somewhere
  // you are not is the wrong default for an emergency tool.
  const [focusPlace, setFocusPlace] = useState<{ pos: LatLng; name: string; address: string } | null>(null);
  const [overrideNotice, setOverrideNotice] = useState<string | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  // Read once, at mount: the intro plays on a device's first visit and not again.
  const [showSplash, setShowSplash] = useState(() => !hasSeenSplash());
  // Family places the user recorded. Loaded per account, not globally — see the
  // effect below.
  const [family, setFamily] = useState<FamilyMember[]>([]);
  // Per-member verdicts produced by the emergency run.
  const [familyStatus, setFamilyStatus] = useState<FamilyStatus[] | null>(null);
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
  const { requestLocation, location } = useGeolocation({
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
  // The position every decision is made from: the searched place if there is
  // one, otherwise the device's own GPS fix.
  const focusPos = focusPlace?.pos ?? livePosition;

  // Only draw an evacuation line when leaving is actually the advice.
  const routingEnabled = currentStep >= 0 && responseMode(activeHazard) === 'evacuate';

  const { mapRef, recenter, panTo } = useGoogleMaps({
    dynamicMarkers, mapLayer, currentStep, routingEnabled, focusPosition: focusPlace?.pos ?? null, family,
    user, livePosition, liveRoute, liveShelter, googleMapsLoaded,
    setGoogleMapsLoaded, setMapCenter, setActiveMarker
  });

  // Dynamic Places API search — populates dynamicMarkers from the current map center.
  usePlacesSearch({
    googleMapsLoaded, mapCenter, filterCategory,
    setDynamicMarkers
  });

  // Agent Pipeline States
  const [agents, setAgents] = useState<AgentState[]>(INITIAL_AGENTS);

  // Live multi-agent pipeline (Situation → Personal → Route → Translate → Commander) + route-ready haptic.
  useAgentPipeline({
    isSimulating, currentStep, personalContext, googleMapsLoaded, dynamicMarkers,
    livePosition, liveAddress, family, setFamilyStatus,
    focusPosition: focusPos, focusName: focusPlace?.name ?? null,
    onOverrideToLive: (reason) => { setFocusPlace(null); setOverrideNotice(reason); },
    setAgents, setHazardSignal, setCurrentStep, setLiveSteps, setLiveSmsDraft,
    setLiveRoute, setLiveShelter, setLiveAddress, setIsSimulating, setShowSmsModal,
    setActiveHazard, setThreatScan, setShelterSource
  });

  // One list per Google account. Reloaded whenever the signed-in account changes,
  // so switching accounts no longer shows the previous person's family — the
  // first version used a single global key and read it once at mount.
  const scope = familyScope(user);
  useEffect(() => {
    purgeLegacyFamily();
    setFamily(loadFamily(scope));
  }, [scope]);

  const updateFamily = (members: FamilyMember[]) => {
    setFamily(members);
    saveFamily(scope, members);
  };

  const updateContext = (patch: Partial<PersonalContext>) =>
    setPersonalContext((prev) => ({ ...prev, ...patch }));

  // Translate labels dynamically based on selected language
  const labels = LANGUAGES_MAP[personalContext.language];

  // Nearest real shelter (Places + haversine). Computed once per render — the
  // header, the AR overlay and the advice builder all want the same answer.
  const shelterInfo = getShelterInfo(livePosition, dynamicMarkers);

  // Dynamic advice synthesis based on context. Prefers live Gemini-generated steps;
  // falls back to the deterministic template below if Gemini is disabled or hasn't returned yet.
  const getDynamicAdvice = (): ActionStep[] => buildAdvice({ liveSteps, personalContext, activeHazard, dynamicMarkers, userPos: livePosition });


  // Scan the live hazard feeds. Whether anything actually happens after this is
  // decided by the scan, not by the button — if nothing reaches the user, the
  // pipeline stands itself back down.
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
    setThreatScan({
      status: 'scanning', scannedAt: null, sourcesQueried: [], sourcesFailed: [], verdict: null
    });
    setIsDrawerExpanded(true);
    setCurrentStep(0);
    setIsSimulating(true);
    navigator.vibrate?.([300, 100, 300]);
  };

  // Exit the danger stage — cancel any active alert and return to standby.
  // Setting currentStep/-isSimulating re-runs the pipeline effect, whose cleanup
  // cancels an in-flight run so these resets stick.
  const handleStandDown = () => {
    window.speechSynthesis?.cancel();
    setAgents(prev => prev.map(a => ({ ...a, status: 'idle', result: '' })));
    setHazardSignal(null);
    setLiveSteps(null);
    setLiveSmsDraft(null);
    setLiveRoute(null);
    setLiveShelter(null);
    setSmsStatus('idle');
    setShowSmsModal(false);
    setThreatScan(null);
    setShelterSource(null);
    setFamilyStatus(null);
    setIsSimulating(false);
    setCurrentStep(-1);
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

  // Picking a suggestion moves what the app is REASONING about, not just the
  // camera. The old handler only flew the map; the scan and shelter lookup stayed
  // pinned to GPS, so searching another city changed the view and nothing else.
  const handleSelectSuggestion = async (s: PlaceSuggestion) => {
    const resolved = await resolveSuggestion(s);
    if (!resolved) return;
    setFocusPlace(resolved);
    setOverrideNotice(null);
    setSearchQuery('');
    panTo(resolved.pos);
    handleStandDown();
  };

  const handleReturnToMe = () => {
    setFocusPlace(null);
    setOverrideNotice(null);
    setSearchQuery('');
    handleStandDown();
    recenter();
  };

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

        {/* Opening animation. Sits over everything, but blocks nothing — auth,
            Maps and the hazard feeds all initialise behind it. */}
        {showSplash && <SplashScreen onDone={() => setShowSplash(false)} />}

        {!user ? (
          /* ==========================================
             PREMIUM AUTHENTICATION & LOGIN GUARD
             ========================================== */
          <AuthScreen authLoading={authLoading} />
        ) : !(googleMapsLoaded && livePosition) ? (
          /* ==========================================
             LOCATION GATE — the app is fully driven by the user's real GPS
             ========================================== */
          <EnableLocationState mapsReady={googleMapsLoaded} location={location} onRetry={requestLocation} />
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
              shelterName={shelterInfo.name}
              shelterDistance={shelterInfo.distance}
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
                onSelectSuggestion={handleSelectSuggestion}
                near={focusPos}
                placeholderLocation={personalContext.location}
                user={user}
                onOpenProfile={() => setShowProfile(true)}
              />

              {/* Loud, persistent reminder that routes are not from where you are */}
              <FocusBanner placeName={focusPlace?.name ?? null} onReturnToMe={handleReturnToMe} />

              {/* A real hazard at the user's own position outranks whatever they
                  were browsing, so it says so instead of silently switching. */}
              {overrideNotice && (
                <div className="bg-red-600/20 border border-red-500/60 rounded-2xl px-3 py-2 flex items-start gap-2 shadow-xl backdrop-blur-md">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5 animate-pulse" />
                  <div className="min-w-0 flex-1">
                    <span className="block text-[10px] font-black uppercase tracking-wider text-red-300 leading-none">
                      Returned to your location
                    </span>
                    <span className="block text-[10px] text-red-100 font-mono leading-snug mt-1">{overrideNotice}</span>
                  </div>
                  <button
                    onClick={() => setOverrideNotice(null)}
                    className="shrink-0 text-red-300 hover:text-white transition p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

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
              onRecenter={() => { recenter(); setActiveMarker(null); }}
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
                  <div className="flex gap-2.5 items-center min-w-0">
                    <Compass className={`w-5 h-5 text-indigo-400 shrink-0 ${isSimulating ? 'animate-spin' : ''}`} style={{ animationDuration: '6s' }} />
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-black tracking-tight text-white font-sans uppercase truncate">
                        {currentStep >= 4
                          ? `${(liveShelter?.name || shelterInfo.name)} Safe Route`
                          : currentStep >= 0
                          ? '📡 Analyzing active safety route...'
                          : '🟢 SafeRoute AI Active'}
                      </span>
                      {/* Always carry something true and useful here: the real walking
                          ETA once routed, otherwise how far the nearest shelter is. */}
                      <span className="text-[9.5px] text-slate-400 font-mono leading-none mt-0.5 uppercase tracking-wide truncate">
                        {currentStep >= 4
                          ? (liveRoute ? `${liveRoute.durationText} ETA • ${liveRoute.distanceText} on foot` : 'Calculating safest route…')
                          : shelterInfo.distance !== '—'
                          ? `Nearest shelter ${shelterInfo.distance} • ${shelterInfo.name}`
                          : 'Locating nearest shelter…'}
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

                  {/* LIVE THREAT SCAN — what the feeds say, and whether it reaches you */}
                  <ThreatScanPanel scan={threatScan} />

                  {/* LIVE TELEMETRY CARD — real GPS + nearest shelter + walking ETA */}
                  <LiveTelemetryCard
                    livePosition={livePosition}
                    liveAddress={liveAddress}
                    liveShelter={liveShelter}
                    liveRoute={liveRoute}
                    dynamicMarkers={dynamicMarkers}
                    shelterSource={shelterSource}
                    focusName={focusPlace?.name ?? null}
                  />

                  {/* SAFETY GUARD DASHBOARD — All Family Secure */}
                  <SafetyGuardPanel
                    family={family}
                    familyStatus={familyStatus}
                    scanStatus={threatScan?.status ?? null}
                    onOpenProfile={() => setShowProfile(true)}
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

                  {/* ACTIVE-ALERT CONTROLS — exit the danger stage (+ restart when complete) */}
                  {currentStep >= 0 && (
                    <div className="flex justify-center gap-2 pt-2">
                      {currentStep >= 4 && (
                        <button
                          onClick={handleTriggerAlert}
                          disabled={isSimulating}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-900 text-slate-300 hover:text-white rounded-xl text-xs font-bold shadow transition active:scale-95 disabled:opacity-45"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Restart
                        </button>
                      )}
                      <button
                        onClick={handleStandDown}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600/15 border border-emerald-500/40 hover:bg-emerald-600/25 text-emerald-300 hover:text-emerald-200 rounded-xl text-xs font-bold shadow transition active:scale-95"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Stand Down · All Clear
                      </button>
                    </div>
                  )}

                </div>
              )}
            </div>

            <ProfileSheet
              show={showProfile}
              user={user}
              sessionExpiry={sessionExpiry()}
              personalContext={personalContext}
              onChangeContext={updateContext}
              family={family}
              onChangeFamily={updateFamily}
              near={focusPos}
              onClose={() => setShowProfile(false)}
              onSignOut={() => { setShowProfile(false); handleSignOut(); }}
            />

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
