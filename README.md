# SafeRoute AI — Personal Disaster Co-pilot 🛡️ 安心避難

An offline-first, multi-agent disaster co-pilot for Japan's earthquakes, tsunamis, and
typhoons. SafeRoute AI reads live hazard feeds, reasons about **your** personal constraints
(language, floor, children, mobility), routes you to an official designated shelter, and
guides you there hands-free with an AR camera view — all behind a strict human-approval
safety gate, and with a grounded voice assistant that answers "what do I do in an
earthquake?" out loud.

Built for Japan's dense urban areas with a deep focus on foreign residents and tourists —
the entire app is available in **English, 日本語, 中文, and Tiếng Việt**.

---

## What it does

- **Situation awareness** — pulls live quakes/tsunami/typhoon advisories and decides whether
  anything actually threatens *your* location before alarming you.
- **Personalized action plan** — a multi-agent pipeline turns the raw hazard into concrete,
  ranked steps tailored to your profile.
- **Safe routing** — finds the nearest *official* designated emergency shelter
  (指定緊急避難場所) and a walking route to it.
- **AR camera guidance** — hold the phone up and a compass-anchored arrow points at the
  shelter in the real world, with a haptic "on-course" pulse for smoke/low-visibility.
- **Grounded voice assistant** — ask safety questions by voice and get spoken answers drawn
  only from an official Japan safety guide (works offline via a keyword fallback).
- **Family SMS** — drafts an emergency SMS to your contacts with a live location link — sent
  only after you approve it.

---

## Architecture: the agent pipeline

The core is a **gate → fan-out → join** pipeline (`src/hooks/useAgentPipeline.ts`), surfaced
live in the in-app "AI Agent Status" console:

```
                        ┌─ Personal Agent ─┐
   Situation Agent ────▶├─ Route Agent    ─┤────▶ Commander Agent
     (gate)             └─ Translate Agent ┘        (join)
```

1. **Situation Agent (gate).** Scores live hazards against your GPS location. If nothing
   crosses the action threshold, it stops the run here — the three middle agents stay
   *pending by design*, not as a bug. Only a real, local hazard opens the gate.
2. **Personal ∥ Route ∥ Translate (fan-out).** These run concurrently — they each read the
   raw hazard and your profile, not each other's output, so serializing them would only add
   dead wall-clock in a scenario where seconds matter:
   - **Personal** — reverse-geocodes your position and builds profile-aware action steps.
   - **Route** — looks up the nearest official shelter and a walking route.
   - **Translate** — localizes critical guidance and drafts the family SMS.
3. **Commander Agent (join).** Merges the three branches into the final, ranked plan and opens
   the SMS approval modal.

`currentStep` is a coarse phase milestone read app-wide: `≥ 0` a run has started, `=== 0`
fires the one-shot voice announcement, `≥ 4` the plan is complete.

---

## Voice hazard assistant

The home voice box is a grounded Q&A assistant (`src/services/gemini.ts` →
`askHazardQuestion`, `src/data/safetyGuide.ts`). Ask things like *"What should I do in an
earthquake?"* or *"How do I prepare for a typhoon?"* and it answers in your language, in one
to three short spoken sentences, using **only** a distilled official Japan safety guide
(emergency numbers 110/119/118, Drop-Cover-Hold, tsunami-uphill, 72-hour go-bag, etc.). It
still recognizes profile-customization and `trigger` commands. With no Gemini key configured
it falls back to an offline keyword matcher, so core answers work without a network.

## AR camera guidance

In camera mode (`src/components/map/AROverlay.tsx` + `src/hooks/useDeviceHeading.ts`), the
direction arrow is anchored to the real world: the device compass heading is combined with
the GPS bearing to the shelter, so the arrow points where you must actually turn — not at a
fixed decorative angle. It shows turn-left / turn-right / on-course, pulses the haptic motor
the moment you swing onto the correct bearing, and keeps a "look up while walking" banner up
so you don't walk face-down into a hazard. On iOS the compass is requested behind the
required user-gesture permission gate; where it's unavailable the arrow falls back to the raw
GPS bearing.

---

## Tech stack

- **React 19 + TypeScript**, scaffolded with **Vite**
- **Tailwind CSS v4** for styling, **Lucide React** icons
- **PWA** via the Vite PWA plugin (service worker, offline caching, installable)
- **Google Gemini** (`@google/genai`, default `gemini-2.5-flash`) for agent reasoning and the
  voice assistant
- **Web Speech API** for speech-to-text / text-to-speech in all four languages
- **DeviceOrientation** compass + **Vibration** API for AR guidance
- **i18n**: a lightweight `LanguageProvider` / `useT()` system (`src/i18n/`) with four language
  blocks

### Data sources

- **JMA** — earthquake, tsunami, and typhoon feeds (Japan)
- **USGS** — worldwide earthquakes
- **GDACS** — global disaster alerts
- **GSI** (`cyberjapandata.gsi.go.jp`) — official designated emergency shelters
- **Google Maps / Places** — geocoding and walking routes
- **Google Identity Services** — OAuth sign-in

---

## Getting started

### 1. Configure environment

Copy `.env.example` to `.env` and fill in your keys:

```bash
cp .env.example .env
```

| Variable | Purpose |
|---|---|
| `VITE_GOOGLE_CLIENT_ID` | Google Identity Services OAuth client (sign-in) |
| `VITE_GOOGLE_MAPS_API_KEY` | Google Maps JavaScript API + Places (geocode, routes) |
| `VITE_GEMINI_API_KEY` | Gemini API key (agents + voice assistant) |
| `VITE_GEMINI_MODEL` | Optional model override (default `gemini-2.5-flash`) |

The app degrades gracefully without keys: the pipeline uses offline fallbacks and the voice
assistant answers from the bundled safety guide.

### 2. Develop

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### 3. Quality checks

```bash
npm run lint        # oxlint
npm run build       # tsc -b && vite build (also the type-check gate)
```

---

## Deployment

```bash
npm run build                 # standalone PWA in dist/

npx vercel                    # zero-config Vercel deploy
npx netlify-cli deploy --dir=dist --prod   # Netlify

npm run deploy                # Firebase Hosting (firebase-tools)
npm run deploy:run            # Google Cloud Run
```

The built `dist/` is a fully static, installable PWA — scan the deployed URL on a phone and
"Add to Home Screen" for a full-screen native-feeling app with offline support.

---

## Project layout

```
src/
  components/   UI — home, map/AR, drawer (agent console), shell, profile
  hooks/        useAgentPipeline, useDeviceHeading, useVoiceAssistant, useGoogleMaps
  services/     gemini, maps, geolocation, hazard feeds
  data/         safetyGuide (grounding for the voice assistant)
  constants/    agents, hazards
  i18n/         LanguageProvider, useT, messages (4 languages)
  types/        domain models
```
