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
import { HomeScreen } from '@/components/home/HomeScreen';
import { BottomNavBar } from '@/components/shell/BottomNavBar';
import { LiveNavigationView, LAYER_ORDER } from '@/components/map/LiveNavigationView';
import { AlertsSheet } from '@/components/alerts/AlertsSheet';
import { FamilyScreen } from '@/components/family/FamilyScreen';
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
  const [smsStatus, setSmsStatus] = useState<'idle' | 'copied'>('idle');

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
  const [showAlertsList, setShowAlertsList] = useState(false);
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
  // Home, Navigate, and Family are real tabs. Alerts instead opens a sheet
  // layered on top of whichever tab is underneath — see BottomNavBar.
  const [activeTab, setActiveTab] = useState<'home' | 'navigate' | 'family'>('home');
  // Tapping Back/Search in the live-navigation view peeks at the browsing map
  // without ending the route; a fresh trigger or reroute always returns to the
  // navigation view (see handleTriggerAlert/handleStandDown resetting this).
  const [peekingBrowse, setPeekingBrowse] = useState(false);

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

  // Auth/session (Google OAuth) and geolocation are managed by hooks. Sign-in
  // is optional — Emergency Mode runs on GPS alone; only Family sync asks for
  // it — so location is requested from launch, not gated on `user`.
  const { user, authLoading, signOut, renderSignInButton } = useAuth();
  const { requestLocation, location } = useGeolocation({
    enabled: true,
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

  // The Navigate tab's in-progress state: a real route is ready to walk. Not a
  // separate flag — derived from the same pipeline state everything else reads,
  // so it can never drift out of sync with what the drawer/AR view show.
  const showLiveNav = activeTab === 'navigate' && routingEnabled && currentStep >= 4 && !!liveRoute && !peekingBrowse;

  const handleCycleLayer = () => {
    const idx = LAYER_ORDER.indexOf(mapLayer);
    setMapLayer(LAYER_ORDER[(idx + 1) % LAYER_ORDER.length] as any);
  };

  const { mapRef, recenter, panTo, refresh } = useGoogleMaps({
    dynamicMarkers, activeMarker, mapLayer, currentStep, routingEnabled, focusPosition: focusPlace?.pos ?? null, family,
    user, livePosition, liveRoute, liveShelter, googleMapsLoaded,
    setGoogleMapsLoaded, setMapCenter, setActiveMarker
  });

  // Dynamic Places API search — populates dynamicMarkers from the current map center.
  usePlacesSearch({
    googleMapsLoaded, mapCenter, filterCategory,
    setDynamicMarkers
  });

  // The map div now lives behind every tab (see the render tree below), so it
  // can be laid out while covered by Home/Family. When Navigate becomes visible
  // again, poke Google Maps to re-measure and repaint — otherwise it keeps the
  // stale viewport size it cached while hidden and shows black tiles. Next-frame
  // so the reveal has actually happened before we measure.
  useEffect(() => {
    if (activeTab === 'navigate' && googleMapsLoaded && livePosition) {
      const id = requestAnimationFrame(() => refresh());
      return () => cancelAnimationFrame(id);
    }
  }, [activeTab, googleMapsLoaded, livePosition, refresh]);

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
    setPeekingBrowse(false);
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
    setPeekingBrowse(false);
  };



  // This app has no SMS transport, so it never claims to "send". Instead it
  // copies the drafted message to the clipboard — a real action we can honestly
  // confirm — for the user to paste into their own Messages app. The "copied"
  // state is only set on the clipboard write actually succeeding.
  const handleApproveSms = async () => {
    const text = getDraftedSmsText();
    try {
      await navigator.clipboard.writeText(text);
      setSmsStatus('copied');
      navigator.vibrate?.([120]);
      setTimeout(() => {
        setShowSmsModal(false);
        setSmsStatus('idle');
      }, 2200);
    } catch {
      // Clipboard blocked (no permission / insecure context): leave the draft
      // on screen so the user can select and copy it by hand. Never fake success.
    }
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

  const handleToggleVoice = () => {
    if (voiceAssistant) window.speechSynthesis?.cancel();
    setVoiceAssistant(!voiceAssistant);
  };

  // Alerts opens a full page listing every event the last scan found (not just
  // the one hazard the pipeline is acting on) — see AlertsSheet. Opening the tab
  // auto-starts a fresh scan so the feed is live on arrival, but never restarts
  // one already in flight (guarding on isSimulating) — otherwise re-tapping the
  // tab mid-scan would reset the pipeline under itself. An explicit Rescan lives
  // in the page header for manual refreshes.
  const handleOpenAlerts = () => {
    setShowAlertsList(true);
    if (!isSimulating) handleTriggerAlert();
  };

  // Reuses the same "examine a place that isn't you" mechanism search results
  // already use, rather than inventing a second way to point the map at a
  // place — a family member's expected place is just another focusable spot.
  const handleViewFamilyOnMap = (member: FamilyMember) => {
    const pos = { lat: member.place.lat, lng: member.place.lng };
    setFocusPlace({
      pos,
      name: member.name,
      address: member.place.address ?? member.place.name
    });
    setOverrideNotice(null);
    setActiveMarker(null);
    // With a route in progress the Navigate tab is the full-screen turn-by-turn
    // view, which has no family pin on it — so this landed the user in their own
    // navigation instead of at the place they asked for. Peek at the browsing
    // map instead of standing the alert down: looking up where your family is
    // must not cancel an active evacuation.
    setPeekingBrowse(true);
    setActiveTab('navigate');
    // Switching tabs alone never moved the camera, so the map stayed wherever it
    // already was — on the user's own position.
    panTo(pos);
  };

  return (
    <div className="min-h-dvh mobile-device-wrapper flex flex-col items-center justify-center p-0 sm:p-6 select-none">
      {/* Brand Header (Desktop Only) */}
      <BrandHeader />

      {/* iPhone Device Shell Mockup. On a phone the frame IS the viewport, sized
          in dvh (see .app-viewport in index.css) so it ends where the screen
          ends — the bottom nav used to sit below the fold behind the browser's
          URL bar, reachable only by scrolling. On desktop it goes back to being
          a fixed 390×844 mockup. */}
      <div className="mobile-device-frame bg-white w-full app-viewport sm:h-[844px] sm:w-[390px] flex flex-col justify-between shadow-2xl relative text-slate-900">
        
        {/* iOS Dynamic Island Area */}
        <DynamicIsland />

        {/* Opening animation. Sits over everything, but blocks nothing — auth,
            Maps and the hazard feeds all initialise behind it. */}
        {showSplash && <SplashScreen onDone={() => setShowSplash(false)} />}

        {!(googleMapsLoaded && livePosition) ? (
          /* ==========================================
             LOCATION GATE — the app is fully driven by the user's real GPS
             ========================================== */
          <EnableLocationState mapsReady={googleMapsLoaded} location={location} onRetry={requestLocation} />
        ) : (
          <>
          {/* REAL GOOGLE MAPS DIV — mounted ONCE here, behind every tab, so the
              map instance is never detached from its container. Home/Family are
              opaque full-screen panels that cover it; Navigate reveals it. This
              is what stops the intermittent black map on tab switches. */}
          <div
            ref={mapRef}
            className="absolute inset-0 w-full h-full z-0 overflow-hidden"
          />

          {activeTab === 'home' ? (
          /* ==========================================
             HOME TAB — status-first landing screen
             ========================================== */
          <HomeScreen
            user={user}
            onOpenProfile={() => setShowProfile(true)}
            hazardSignal={hazardSignal}
            threatScan={threatScan}
            activeHazard={activeHazard}
            currentStep={currentStep}
            isSimulating={isSimulating}
            agents={agents}
            livePosition={livePosition}
            dynamicMarkers={dynamicMarkers}
            liveRoute={liveRoute}
            family={family}
            familyStatus={familyStatus}
            locationCoarse={location.coarse}
            googleMapsLoaded={googleMapsLoaded}
            voiceAssistant={voiceAssistant}
            isListening={isListening}
            heardText={heardText}
            sttFeedback={sttFeedback}
            firstStep={getDynamicAdvice()[0]}
            onToggleSpeech={toggleSpeechRecognition}
            onToggleVoice={handleToggleVoice}
            onTriggerAlert={handleTriggerAlert}
            onNavigateToMap={() => setActiveTab('navigate')}
            onSelectCategory={(id) => setFilterCategory(id as any)}
            onOpenFamily={() => setActiveTab('family')}
            onOpenAlerts={handleOpenAlerts}
          />
        ) : activeTab === 'family' ? (
          /* ==========================================
             FAMILY TAB — expected places + real hazard status
             ========================================== */
          <FamilyScreen
            user={user}
            authLoading={authLoading}
            renderSignInButton={renderSignInButton}
            family={family}
            familyStatus={familyStatus}
            scanStatus={threatScan?.status ?? null}
            scannedAt={threatScan?.scannedAt ?? null}
            near={focusPos}
            livePosition={livePosition}
            onChangeFamily={updateFamily}
            onViewOnMap={handleViewFamilyOnMap}
            onOpenSms={() => setShowSmsModal(true)}
            onOpenMap={() => setActiveTab('navigate')}
          />
        ) : (
          /* ==========================================
             NAVIGATE TAB — live map dashboard
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

            {showLiveNav && (
              <LiveNavigationView
                activeHazard={activeHazard}
                threatScan={threatScan}
                liveRoute={liveRoute}
                liveShelter={liveShelter}
                livePosition={livePosition}
                isSimulating={isSimulating}
                isListening={isListening}
                heardText={heardText}
                mapLayer={mapLayer}
                onCycleLayer={handleCycleLayer}
                cameraMode={cameraMode}
                onToggleCamera={() => setCameraMode(!cameraMode)}
                onTriggerAlert={handleTriggerAlert}
                onExitToBrowse={() => setPeekingBrowse(true)}
                onEndNavigation={handleStandDown}
              />
            )}

            {/* FLOATING TOP GOOGLE MAPS SEARCH BAR — hidden during live navigation
                (see LiveNavigationView) to keep that screen a focused, single-purpose
                view rather than layering both UIs at once. */}
            {!showLiveNav && (
            <>
            {/* max() keeps the tuned 3rem offset in a browser tab (where the
                inset is 0) and only grows it when the status bar / Dynamic
                Island is genuinely overlapping the frame. */}
            <div className="absolute top-[max(3rem,var(--safe-top))] left-4 right-4 z-30 flex flex-col gap-2.5">
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
              onToggleVoice={handleToggleVoice}
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
            {/* Expanded height is capped against the frame, not a flat 520px:
                on a short viewport 520px + the nav is taller than the screen, so
                the top of the drawer — the handle you tap to close it again —
                was pushed off screen. The content area scrolls, so losing a few
                pixels of height costs nothing. */}
            <div
              className={`absolute left-0 right-0 bottom-[var(--nav-h)] bg-white border-t border-slate-200 rounded-t-3xl z-40 transition-all duration-300 ease-out shadow-2xl flex flex-col ${
                isDrawerExpanded ? 'h-[min(520px,calc(100%-7rem))]' : 'h-[110px]'
              }`}
            >
              {/* Drawer Top Header - Interactive Drag/Expand Bar */}
              <div
                onClick={() => setIsDrawerExpanded(!isDrawerExpanded)}
                className="w-full py-3 flex flex-col items-center cursor-pointer hover:bg-slate-50 rounded-t-3xl transition duration-150 shrink-0"
              >
                {/* Visual Drag pill */}
                <div className="w-10 h-1 bg-slate-300 rounded-full mb-1.5" />
                
                {/* Dynamic Status / ETA Display */}
                <div className="w-full px-5 flex justify-between items-center text-left">
                  <div className="flex gap-2.5 items-center min-w-0">
                    <Compass className={`w-5 h-5 text-indigo-400 shrink-0 ${isSimulating ? 'animate-spin' : ''}`} style={{ animationDuration: '6s' }} />
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-black tracking-tight text-slate-900 font-sans uppercase truncate">
                        {currentStep >= 4
                          ? `${(liveShelter?.name || shelterInfo.name)} Safe Route`
                          : currentStep >= 0
                          ? '📡 Analyzing active safety route...'
                          : '🟢 SafeRoute AI Active'}
                      </span>
                      {/* Always carry something true and useful here: the real walking
                          ETA once routed, otherwise how far the nearest shelter is. */}
                      <span className="text-[9.5px] text-slate-500 font-mono leading-none mt-0.5 uppercase tracking-wide truncate">
                        {currentStep >= 4
                          ? (liveRoute ? `${liveRoute.durationText} ETA • ${liveRoute.distanceText} on foot` : 'Calculating safest route…')
                          : shelterInfo.distance !== '—'
                          ? `Nearest shelter ${shelterInfo.distance} • ${shelterInfo.name}`
                          : 'Locating nearest shelter…'}
                      </span>
                    </div>
                  </div>

                  <div className="p-1 text-slate-500 hover:text-slate-900 transition shrink-0">
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

                  {/* SAFETY GUARD SUMMARY — full breakdown lives in the Family tab now */}
                  <SafetyGuardPanel
                    family={family}
                    familyStatus={familyStatus}
                    scanStatus={threatScan?.status ?? null}
                    onOpenProfile={() => setActiveTab('family')}
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
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 rounded-xl text-xs font-bold shadow transition active:scale-95 disabled:opacity-45"
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
            </>
            )}

          </>
          )}
          </>
        )}

        {/* Profile/Family sheet, the SMS gate, and the tab bar sit above both
            tabs — Family/SMS approval and tab switching must work from Home
            just as they do from Navigate. */}
        {googleMapsLoaded && livePosition && (
          <>
            <ProfileSheet
              show={showProfile}
              user={user}
              sessionExpiry={sessionExpiry()}
              personalContext={personalContext}
              onChangeContext={updateContext}
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

            <AlertsSheet
              show={showAlertsList}
              threatScan={threatScan}
              isSimulating={isSimulating}
              onRescan={handleTriggerAlert}
            />

            {/* Suppressed during live navigation — a focused, single-purpose
                screen per the source design's own "Destination Rule".
                Alerts has no close button — the bottom nav is its only exit, so
                every other tab must dismiss the Alerts page as well as switch
                the underlying tab; otherwise Alerts stays layered on top and
                tapping Home/Navigate/Family silently changes the tab behind it
                with no visible effect. */}
            {!showLiveNav && (
              <BottomNavBar
                activeTab={activeTab}
                alertsOpen={showAlertsList}
                onSelectHome={() => { setShowAlertsList(false); setActiveTab('home'); }}
                onSelectNavigate={() => { setShowAlertsList(false); setActiveTab('navigate'); }}
                onSelectFamily={() => { setShowAlertsList(false); setActiveTab('family'); }}
                onOpenAlerts={handleOpenAlerts}
              />
            )}
          </>
        )}

      </div>
    </div>
  );
}
