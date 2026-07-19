import { GoogleGenAI, Type } from '@google/genai';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
const MODEL = (import.meta.env.VITE_GEMINI_MODEL as string | undefined) || 'gemini-2.5-flash';

export const isGeminiConfigured = Boolean(API_KEY && API_KEY.trim().length > 0);

const client = isGeminiConfigured ? new GoogleGenAI({ apiKey: API_KEY! }) : null;

// Domain types now live in src/types/domain.ts; re-exported here so existing
// consumers importing them from this module keep working unchanged.
import type { Language, Hazard, PersonalProfile, HazardSignal, ActionStep } from '../types/domain';
export type { Language, Hazard, PersonalProfile, HazardSignal, ActionStep };

async function generateJson<T>(prompt: string, schema: any): Promise<T> {
  if (!client) throw new Error('Gemini not configured. Set VITE_GEMINI_API_KEY in .env');
  const res = await client.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: schema,
      temperature: 0.4
    }
  });
  const text = (res.text ?? '').trim();
  return JSON.parse(text) as T;
}

async function generateText(prompt: string): Promise<string> {
  if (!client) throw new Error('Gemini not configured. Set VITE_GEMINI_API_KEY in .env');
  const res = await client.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: { temperature: 0.4 }
  });
  return (res.text ?? '').trim();
}

const langName = (lang: Language): string =>
  lang === 'Japanese' ? 'Japanese (日本語)' :
  lang === 'Chinese' ? 'Simplified Chinese (简体中文)' :
  lang === 'Vietnamese' ? 'Vietnamese (Tiếng Việt)' :
  'English';

export async function runSituationAgent(input: {
  hazard: Hazard;
  location: string;
  jmaSignal?: HazardSignal | null;
}): Promise<string> {
  const { hazard, location, jmaSignal } = input;
  const jmaContext = jmaSignal
    ? `Live JMA bulletin: ${jmaSignal.headline}. Source: ${jmaSignal.source}. Raw JA bulletin: ${jmaSignal.bulletinJa}`
    : `No live JMA bulletin available; treat as a simulated ${hazard} drill near ${location}.`;
  return generateText(
    `You are the SITUATION AGENT in a multi-agent disaster co-pilot. ` +
    `Summarize the current ${hazard} hazard for a civilian in ${location}, in ONE concise English sentence (max 30 words). ` +
    `Include magnitude or wind speed or wave height if applicable, the JMA intensity scale, and the immediate local impact. ` +
    `${jmaContext}`
  );
}

export async function runPersonalAgent(profile: PersonalProfile, address?: string | null): Promise<string> {
  const locLine = address ? `Current GPS-resolved address: "${address}".` : `Approximate location: ${profile.location}.`;
  return generateText(
    `You are the PERSONAL CONTEXT AGENT. In ONE English sentence (max 30 words) state the user's vulnerability profile ` +
    `and the dominant constraint shaping evacuation advice. Mention the resolved location when present. ` +
    `${locLine} Profile: language=${profile.language}, floor=${profile.floor}, ` +
    `companions=${profile.companions}, mobility=${profile.mobility}.`
  );
}

export async function runRouteAgent(input: {
  profile: PersonalProfile;
  shelterName: string;
  shelterDistance?: string;
  walkingDistance?: string;
  walkingDuration?: string;
  hazard: Hazard;
}): Promise<string> {
  const realRoute = input.walkingDistance && input.walkingDuration
    ? ` Real walking route from Google Directions: ${input.walkingDistance}, ETA ${input.walkingDuration}.`
    : '';
  return generateText(
    `You are the ROUTE & SHELTER AGENT. In ONE English sentence (max 30 words) describe the safest evacuation route ` +
    `from the user's GPS position to "${input.shelterName}"${input.shelterDistance ? ` (${input.shelterDistance} straight-line)` : ''} ` +
    `during a ${input.hazard}.${realRoute} Account for: floor=${input.profile.floor}, ` +
    `companions=${input.profile.companions}, mobility=${input.profile.mobility}.`
  );
}

export async function runTranslateAgent(profile: PersonalProfile): Promise<string> {
  return generateText(
    `You are the TRANSLATE & COMMS AGENT. In ONE English sentence (max 25 words), confirm that the emergency SMS draft has ` +
    `been localized into ${langName(profile.language)} and that a human approval gate is required before dispatch.`
  );
}

export async function runCommanderAgent(profile: PersonalProfile, hazard: Hazard): Promise<string> {
  return generateText(
    `You are the COMMANDER AGENT. In ONE English sentence (max 25 words), confirm the synthesized command list for a ` +
    `${hazard} response, written in ${langName(profile.language)}, has been compiled and dispatched to the UI.`
  );
}

const actionStepSchema = {
  type: Type.OBJECT,
  properties: {
    steps: {
      type: Type.ARRAY,
      minItems: 3,
      maxItems: 3,
      items: {
        type: Type.OBJECT,
        properties: {
          num: { type: Type.STRING, description: 'Step number "1", "2", or "3"' },
          title: { type: Type.STRING, description: 'Imperative action heading, max 8 words' },
          desc: { type: Type.STRING, description: 'One short instruction sentence, max 25 words' }
        },
        required: ['num', 'title', 'desc']
      }
    }
  },
  required: ['steps']
};

export async function generateActionSteps(input: {
  profile: PersonalProfile;
  hazard: Hazard;
  shelterName: string;
  shelterDistance?: string;
  walkingDuration?: string;
  address?: string | null;
}): Promise<ActionStep[]> {
  const { profile, hazard, shelterName, shelterDistance, walkingDuration, address } = input;
  const locLine = address ? `User GPS address: "${address}".` : `User approximate area: ${profile.location}.`;
  const etaLine = walkingDuration ? ` Walking ETA to shelter: ${walkingDuration}.` : '';
  const prompt =
    `Generate exactly 3 prioritized evacuation action steps for a civilian facing a ${hazard} in ${profile.location}. ` +
    `Write the title and desc in ${langName(profile.language)}. Use imperative voice. ` +
    `${locLine}${etaLine} ` +
    `Tailor every step to: floor=${profile.floor}, companions=${profile.companions}, mobility=${profile.mobility}. ` +
    `Step 1 = immediate protective action. Step 2 = secondary safety action (e.g., stairs vs elevator, indoor positioning). ` +
    `Step 3 = evacuate toward "${shelterName}"${shelterDistance ? ` (${shelterDistance})` : ''}${walkingDuration ? ` — walking ETA ${walkingDuration}` : ''}.`;
  const result = await generateJson<{ steps: ActionStep[] }>(prompt, actionStepSchema);
  return result.steps;
}

export async function generateSmsDraft(input: {
  profile: PersonalProfile;
  hazard: Hazard;
  shelterName: string;
  trackerUrl: string;
}): Promise<string> {
  const { profile, hazard, shelterName, trackerUrl } = input;
  return generateText(
    `Write a short emergency SMS (max 160 characters) from the user to family in ${langName(profile.language)}. ` +
    `Hazard: ${hazard}. Location: ${profile.location}, ${profile.floor}. Companions: ${profile.companions}. ` +
    `State they are safe, heading to "${shelterName}". End with the live tracker URL: ${trackerUrl}. ` +
    `Return ONLY the SMS text, no quotes, no preamble.`
  );
}
