import { useEffect, useRef } from 'react';
import type { ActionStep, AgentState, Hazard, HazardSignal, PersonalContext } from '@/types/domain';
import type { LatLng } from '@/services/geolocation';
import type { WalkingRoute } from '@/services/maps';
import { getWalkingRoute, reverseGeocode } from '@/services/maps';
import { scanForHazards } from '@/services/alerts';
import { fetchDesignatedShelters } from '@/services/shelters';
import { responseMode, hazardInfo } from '@/constants/hazards';
import { evaluateThreats } from '@/lib/impact';
import type { ThreatScanState } from '@/lib/impact';
import {
  generateActionSteps,
  generateSmsDraft,
  isGeminiConfigured,
  runCommanderAgent,
  runPersonalAgent,
  runRouteAgent,
  runSituationAgent,
  runTranslateAgent
} from '@/services/gemini';
import { getShelterInfo, pickSafestShelter } from '@/lib/shelter';

type LiveShelter = { name: string; distanceMeters: number; lat: number; lng: number };

export interface UseAgentPipelineParams {
  isSimulating: boolean;
  currentStep: number;
  personalContext: PersonalContext;
  googleMapsLoaded: boolean;
  dynamicMarkers: any[];
  livePosition: LatLng | null;
  liveAddress: string | null;
  setAgents: React.Dispatch<React.SetStateAction<AgentState[]>>;
  setHazardSignal: React.Dispatch<React.SetStateAction<HazardSignal | null>>;
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
  setLiveSteps: React.Dispatch<React.SetStateAction<ActionStep[] | null>>;
  setLiveSmsDraft: React.Dispatch<React.SetStateAction<string | null>>;
  setLiveRoute: React.Dispatch<React.SetStateAction<WalkingRoute | null>>;
  setLiveShelter: React.Dispatch<React.SetStateAction<LiveShelter | null>>;
  setLiveAddress: React.Dispatch<React.SetStateAction<string | null>>;
  setIsSimulating: React.Dispatch<React.SetStateAction<boolean>>;
  setShowSmsModal: React.Dispatch<React.SetStateAction<boolean>>;
  /** The hazard is discovered, not chosen — the scan writes it back. */
  setActiveHazard: React.Dispatch<React.SetStateAction<Hazard>>;
  setThreatScan: React.Dispatch<React.SetStateAction<ThreatScanState | null>>;
  /** Whether the chosen shelter came from the official register or a guess. */
  setShelterSource: React.Dispatch<React.SetStateAction<'official' | 'places' | null>>;
}

// The live multi-agent pipeline: Situation → Personal → Route → Translate →
// Commander. Real Gemini calls when configured; deterministic fallbacks otherwise.
// A run-id guard cancels stale runs when inputs change mid-flight.
export function useAgentPipeline(params: UseAgentPipelineParams) {
  const { isSimulating, currentStep } = params;

  const pipelineRunIdRef = useRef(0);

  // A live handle on the newest params, so the run can snapshot what it needs at
  // start without the effect having to subscribe to any of it.
  const paramsRef = useRef(params);
  paramsRef.current = params;

  // Keyed on `isSimulating` alone — that is the only signal that should start a
  // run or cancel one. Anything else in the dep list re-runs the effect, and the
  // cleanup's `cancelled = true` then kills the very run that triggered it:
  // `setCurrentStep(1)` below used to abort the pipeline at step 1 (leaving the
  // Personal Context agent spinning forever, no route, no ETA), and each Places
  // refetch produced a fresh `dynamicMarkers` array that did the same thing.
  // Stand Down still cancels correctly, because it flips `isSimulating` to false.
  useEffect(() => {
    if (!isSimulating) return;

    const {
      currentStep, personalContext, googleMapsLoaded, dynamicMarkers,
      livePosition, liveAddress,
      setAgents, setHazardSignal, setCurrentStep, setLiveSteps, setLiveSmsDraft,
      setLiveRoute, setLiveShelter, setLiveAddress, setIsSimulating, setShowSmsModal,
      setActiveHazard, setThreatScan, setShelterSource
    } = paramsRef.current;

    if (currentStep !== 0) return;

    const runId = ++pipelineRunIdRef.current;
    let cancelled = false;
    const cancelTimers: ReturnType<typeof setTimeout>[] = [];
    const wait = (ms: number) => new Promise<void>((resolve) => {
      const t = setTimeout(resolve, ms);
      cancelTimers.push(t);
    });

    const markRunning = (idx: number) =>
      setAgents(prev => prev.map((a, i) => i === idx ? { ...a, status: 'running' } : a));
    const markCompleted = (idx: number, result: string) =>
      setAgents(prev => prev.map((a, i) => i === idx ? { ...a, status: 'completed', result } : a));
    const stillCurrent = () => !cancelled && runId === pipelineRunIdRef.current;

    const profile = {
      language: personalContext.language,
      location: personalContext.location,
      floor: personalContext.floor,
      companions: personalContext.companions,
      mobility: personalContext.mobility
    };

    const originPos = livePosition;

    // Wind and severe weather are survived indoors — routing someone outside is
    // the wrong instruction, so these hazards get their own step set.
    const buildStayPutSteps = (h: Hazard): ActionStep[] => [
      { num: '1', title: 'Stay inside — do not evacuate', desc: hazardInfo(h).rationale },
      { num: '2', title: 'Move away from windows and glass', desc: 'Shelter in an inner room or hallway with no exterior glazing.' },
      { num: '3', title: 'Keep your phone charged and alerts on', desc: 'Conditions can change; you will be told if moving becomes necessary.' }
    ];

    const buildFallbackSteps = (shelterLabel: string): ActionStep[] => [
      { num: '1', title: 'Drop, Cover, Hold', desc: 'Take immediate protective posture and shield your head from falling debris.' },
      { num: '2', title: 'Take Stairs, Not Elevator', desc: 'Move calmly through the safest exit, supporting any companions.' },
      { num: '3', title: `Evacuate to ${shelterLabel}`, desc: 'Follow the highlighted route on the map.' }
    ];

    const run = async () => {
      try {
        // ── Step 0: Situation Agent ──
        // Search live hazard feeds, then decide whether anything found actually
        // reaches THIS user. Nothing downstream runs unless it does — the whole
        // point is that an evacuation is not triggered by a distant or past event.
        markRunning(0);

        if (!originPos) {
          setThreatScan({
            status: 'unavailable', scannedAt: new Date().toISOString(),
            sourcesQueried: [], sourcesFailed: [], verdict: null
          });
          markCompleted(0, 'No GPS fix yet — cannot judge whether a hazard reaches you.');
          setIsSimulating(false);
          setCurrentStep(-1);
          return;
        }

        const [scan] = await Promise.all([scanForHazards(originPos), wait(300)]);
        if (!stillCurrent()) return;

        const verdict = evaluateThreats(scan.hazards, originPos);
        // Reaching no feed at all is "unknown", never "all clear".
        const noFeedAnswered = scan.sourcesQueried.length === 0;

        setThreatScan({
          status: noFeedAnswered ? 'unavailable' : verdict.worst ? 'threat' : 'clear',
          scannedAt: scan.scannedAt,
          sourcesQueried: scan.sourcesQueried,
          sourcesFailed: scan.sourcesFailed,
          verdict
        });

        // ── The gate ──
        if (!verdict.worst) {
          const nearest = verdict.all[0];
          markCompleted(0, noFeedAnswered
            ? 'Could not reach any hazard feed, so threat status is unknown. Retry when you have a connection.'
            : `Scanned ${scan.sourcesQueried.length} live feeds — ${scan.hazards.length} recent event(s), none reaching your location. ` +
              (nearest ? `Closest: ${nearest.impact.basis}` : ''));
          setIsSimulating(false);
          setCurrentStep(-1);
          return;
        }

        const detected = verdict.worst;
        const hazard = detected.hazard.hazard;
        setActiveHazard(hazard);

        const signal: HazardSignal = {
          hazard,
          headline: detected.hazard.headline,
          bulletinJa: detected.hazard.bulletinJa ?? detected.hazard.headline,
          bulletinEn: detected.hazard.bulletinEn ?? detected.hazard.headline,
          magnitude: detected.hazard.magnitude,
          intensity: detected.hazard.observedShindo,
          source: detected.hazard.source
        };
        setHazardSignal(signal);

        // Safest place *for this hazard*. The official register is queried first:
        // its sites are already certified for this exact hazard, which the Places
        // heuristic can only guess at. Outside GSI coverage this comes back empty
        // and the fallback is labelled as unofficial.
        const lookup = await fetchDesignatedShelters(originPos, hazard);
        if (!stillCurrent()) return;
        setShelterSource(lookup.official ? 'official' : 'places');

        const safest = pickSafestShelter(
          hazard, originPos, dynamicMarkers, lookup.shelters, detected.hazard.epicenter
        );
        const shelterInfo = safest
          ? { name: safest.name, fullName: safest.name, distance: safest.distance, detail: safest.rationale, desc: safest.desc }
          : getShelterInfo(originPos, dynamicMarkers);
        const shelterDistance = shelterInfo.distance;
        const shelterPos = safest ? { lat: safest.lat, lng: safest.lng } : null;
        const mode = responseMode(hazard);
        const fallbackSteps = mode === 'evacuate'
          ? buildFallbackSteps(`${shelterInfo.name} (${shelterInfo.distance})`)
          : buildStayPutSteps(hazard);

        let situationResult = `${detected.hazard.headline}. ${detected.impact.basis}`;
        if (isGeminiConfigured) {
          try {
            situationResult = await runSituationAgent({
              hazard,
              location: personalContext.location,
              jmaSignal: signal
            });
          } catch (e) {
            console.warn('Situation agent failed; using the feed summary.', e);
          }
        }
        if (!stillCurrent()) return;
        markCompleted(0, situationResult);
        setCurrentStep(1);

        // ── Step 1: Personal Context Agent (resolves real address) ──
        markRunning(1);
        let address: string | null = liveAddress;
        if (!address && livePosition) {
          address = await reverseGeocode(livePosition);
          if (address) setLiveAddress(address);
        }
        let personalResult = address
          ? `User at "${address}" — ${profile.floor}, ${profile.companions}, ${profile.mobility}. Vulnerability rating: HIGH.`
          : `User context parsed: Lang: ${profile.language}, Location: ${profile.location}, Floor: ${profile.floor}, Companions: ${profile.companions}, Mobility: ${profile.mobility}. Vulnerability rating: HIGH.`;
        if (isGeminiConfigured) {
          try {
            personalResult = await runPersonalAgent(profile, address);
          } catch (e) {
            console.warn('Personal agent failed; using fallback.', e);
            await wait(600);
          }
        } else {
          await wait(1000);
        }
        if (!stillCurrent()) return;
        markCompleted(1, personalResult);
        setCurrentStep(2);

        // ── Step 2: Route & Shelter Agent (fetches REAL walking directions) ──
        markRunning(2);
        let walkingRoute: WalkingRoute | null = null;
        // Only fetch a walking route when leaving is actually the advice.
        if (mode === 'evacuate' && shelterPos && originPos && googleMapsLoaded) {
          walkingRoute = await getWalkingRoute(originPos, shelterPos);
          if (walkingRoute) {
            setLiveRoute(walkingRoute);
            setLiveShelter({
              name: shelterInfo.name,
              distanceMeters: walkingRoute.distanceMeters,
              lat: shelterPos.lat,
              lng: shelterPos.lng
            });
          }
        }

        const realDist = walkingRoute?.distanceText;
        const realEta = walkingRoute?.durationText;
        let routeResult = mode !== 'evacuate'
          ? `${hazardInfo(hazard).label}: shelter in place. ${hazardInfo(hazard).rationale} No route issued — leaving would increase exposure.`
          : walkingRoute
          ? `${lookup.official ? 'Designated' : 'Candidate'} shelter: ${shelterInfo.name}. Walking ${realDist}, ETA ${realEta} via Google Directions.`
          : `${lookup.official ? 'Designated' : 'Candidate'} shelter: ${shelterInfo.name} (${shelterInfo.detail}).`;
        let stepsPromise: Promise<ActionStep[]> = Promise.resolve(fallbackSteps);
        if (isGeminiConfigured) {
          stepsPromise = generateActionSteps({
            profile,
            hazard,
            shelterName: shelterInfo.name,
            shelterDistance,
            walkingDuration: realEta,
            address
          }).catch((e) => {
            console.warn('Action-step generation failed; using fallback.', e);
            return fallbackSteps;
          });
          try {
            routeResult = await runRouteAgent({
              profile,
              hazard,
              shelterName: shelterInfo.name,
              shelterDistance,
              walkingDistance: realDist,
              walkingDuration: realEta
            });
          } catch (e) {
            console.warn('Route agent failed; using fallback.', e);
          }
        } else {
          await wait(1000);
        }
        if (!stillCurrent()) return;
        markCompleted(2, routeResult);
        setCurrentStep(3);

        // ── Step 3: Translate & Comms Agent (+ generate SMS in parallel) ──
        markRunning(3);
        const trackerUrl = livePosition
          ? `https://maps.google.com/?q=${livePosition.lat.toFixed(5)},${livePosition.lng.toFixed(5)}`
          : 'https://maps.google.com/';
        let translateResult = `Draft text generated in ${profile.language}. Emergency contact parsed. Human validation required.`;
        let smsPromise: Promise<string> = Promise.resolve('');
        if (isGeminiConfigured) {
          smsPromise = generateSmsDraft({
            profile,
            hazard,
            shelterName: shelterInfo.name,
            trackerUrl
          }).catch((e) => {
            console.warn('SMS draft failed; using fallback.', e);
            return '';
          });
          try {
            translateResult = await runTranslateAgent(profile);
          } catch (e) {
            console.warn('Translate agent failed; using fallback.', e);
          }
        } else {
          await wait(1200);
        }
        if (!stillCurrent()) return;
        markCompleted(3, translateResult);
        setCurrentStep(4);

        // ── Step 4: Commander Agent (+ resolve steps + SMS) ──
        markRunning(4);
        const [steps, sms, commanderText] = await Promise.all([
          stepsPromise,
          smsPromise,
          isGeminiConfigured
            ? runCommanderAgent(profile, hazard).catch((e) => {
                console.warn('Commander agent failed; using fallback.', e);
                return `Command list compiled with 3 hyper-personalized steps in ${profile.language}. Layout dispatched.`;
              })
            : Promise.resolve(`Command list compiled with 3 hyper-personalized steps in ${profile.language}. Layout dispatched.`)
        ]);
        if (!stillCurrent()) return;
        setLiveSteps(steps && steps.length ? steps : fallbackSteps);
        if (sms) setLiveSmsDraft(sms);
        markCompleted(4, commanderText);
        setIsSimulating(false);
        setShowSmsModal(true);
      } catch (err) {
        console.error('Pipeline failed unexpectedly', err);
        if (!stillCurrent()) return;
        setIsSimulating(false);
      }
    };

    run();

    return () => {
      cancelled = true;
      cancelTimers.forEach(clearTimeout);
    };
    // See the note above: every value the run needs is snapshotted from
    // paramsRef, so `isSimulating` is deliberately the only dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSimulating]);

  // Haptic: triple pulse when route is ready, indicating safe path confirmed
  useEffect(() => {
    if (currentStep < 4 || isSimulating) return;
    navigator.vibrate?.([100, 60, 100, 60, 100]);
  }, [currentStep, isSimulating]);
}
