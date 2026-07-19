import { useEffect, useRef } from 'react';
import type { ActionStep, AgentState, Hazard, HazardSignal, PersonalContext } from '@/types/domain';
import type { LatLng } from '@/services/geolocation';
import type { WalkingRoute } from '@/services/maps';
import { findNearestShelter, getWalkingRoute, reverseGeocode } from '@/services/maps';
import { fetchHazardSignal } from '@/services/jma';
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
import { getShelterInfo } from '@/lib/shelter';

type LiveShelter = { name: string; distanceMeters: number; lat: number; lng: number };

export interface UseAgentPipelineParams {
  isSimulating: boolean;
  currentStep: number;
  activeHazard: Hazard;
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
}

// The live multi-agent pipeline: Situation → Personal → Route → Translate →
// Commander. Real Gemini calls when configured; deterministic fallbacks otherwise.
// A run-id guard cancels stale runs when inputs change mid-flight.
export function useAgentPipeline(params: UseAgentPipelineParams) {
  const {
    isSimulating, currentStep, activeHazard, personalContext, googleMapsLoaded, dynamicMarkers,
    livePosition, liveAddress,
    setAgents, setHazardSignal, setCurrentStep, setLiveSteps, setLiveSmsDraft,
    setLiveRoute, setLiveShelter, setLiveAddress, setIsSimulating, setShowSmsModal
  } = params;

  const pipelineRunIdRef = useRef(0);

  useEffect(() => {
    if (!isSimulating || currentStep !== 0) return;

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

    // Pick the nearest shelter from real Places results around the user's GPS position.
    const originPos = livePosition;
    const nearest = originPos ? findNearestShelter(originPos, dynamicMarkers) : null;
    const fallbackShelterInfo = getShelterInfo(originPos, dynamicMarkers);
    const shelterInfo = nearest
      ? {
          name: nearest.name,
          fullName: nearest.name,
          distance: nearest.distanceMeters < 1000
            ? `${Math.round(nearest.distanceMeters)}m`
            : `${(nearest.distanceMeters / 1000).toFixed(1)}km`,
          detail: nearest.desc || 'Nearest designated shelter (from Google Places).',
          desc: nearest.desc || ''
        }
      : fallbackShelterInfo;
    const shelterDistance = shelterInfo.distance;
    const shelterPos = nearest ? { lat: nearest.lat, lng: nearest.lng } : null;

    const fallbackSituation =
      activeHazard === 'earthquake'
        ? `M7.2 Earthquake detected. ${personalContext.location} intensity JMA 5-Upper. Tsunami threat: ADVISORY (0.5m waves expected).`
        : activeHazard === 'typhoon'
        ? `Category 4 Typhoon making landfall near ${personalContext.location}. Sustained winds 140km/h. Heavy rain 50mm/hr.`
        : `M8.4 Subduction Quake. ${personalContext.location} intensity JMA 6-Lower. Major Tsunami Warning (Waves 3.2m in 8 mins).`;

    const fallbackSteps: ActionStep[] = [
      { num: '1', title: 'Drop, Cover, Hold', desc: 'Take immediate protective posture and shield your head from falling debris.' },
      { num: '2', title: 'Take Stairs, Not Elevator', desc: 'Move calmly through the safest exit, supporting any companions.' },
      { num: '3', title: `Evacuate to ${shelterInfo.name} (${shelterInfo.distance})`, desc: 'Follow the highlighted route on the map.' }
    ];

    const run = async () => {
      try {
        // ── Step 0: Situation Agent ──
        markRunning(0);
        const [signal] = await Promise.all([
          fetchHazardSignal(activeHazard, personalContext.location),
          wait(300)
        ]);
        if (!stillCurrent()) return;
        setHazardSignal(signal);

        let situationResult = fallbackSituation;
        if (isGeminiConfigured) {
          try {
            situationResult = await runSituationAgent({
              hazard: activeHazard,
              location: personalContext.location,
              jmaSignal: signal
            });
          } catch (e) {
            console.warn('Situation agent failed; using fallback.', e);
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
        if (shelterPos && originPos && googleMapsLoaded) {
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
        let routeResult = walkingRoute
          ? `Nearest shelter: ${shelterInfo.name}. Walking ${realDist}, ETA ${realEta} via Google Directions. Path avoids highway segments.`
          : `Closest safe shelter: ${shelterInfo.name} (${shelterInfo.detail}). Route validated.`;
        let stepsPromise: Promise<ActionStep[]> = Promise.resolve(fallbackSteps);
        if (isGeminiConfigured) {
          stepsPromise = generateActionSteps({
            profile,
            hazard: activeHazard,
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
              hazard: activeHazard,
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
            hazard: activeHazard,
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
            ? runCommanderAgent(profile, activeHazard).catch((e) => {
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
    // Deps are intentionally narrow: the run snapshots livePosition/liveAddress at
    // start and the run-id guard cancels stale runs — adding them would restart mid-run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSimulating, currentStep, activeHazard, personalContext, googleMapsLoaded, dynamicMarkers]);

  // Haptic: triple pulse when route is ready, indicating safe path confirmed
  useEffect(() => {
    if (currentStep < 4 || isSimulating) return;
    navigator.vibrate?.([100, 60, 100, 60, 100]);
  }, [currentStep, isSimulating]);
}
