// Grounding knowledge for the voice hazard Q&A assistant.
// Distilled from "Living Safely in Japan" (Japan_Disaster_Safety_Guide) — the
// single source of truth the assistant is allowed to answer from. Keep this
// concise and factual; it is injected verbatim into the LLM prompt.
export const SAFETY_GUIDE = `LIVING SAFELY IN JAPAN — earthquakes, tsunamis, typhoons.

EMERGENCY NUMBERS:
- Police: 110 (crime, danger, public safety)
- Fire / Ambulance: 119 (fire, injury, medical emergency)
- Coast Guard: 118 (marine emergency, tsunami-related coastal danger)
Preparation matters more than panic: most safety comes from knowing where to go and what to do before the first minute is over.

1. EARTHQUAKES — the first seconds matter; stay calm and protect your head.
Before: anchor shelves and TVs, keep heavy items low, prepare at least 3 days of supplies (7 is better).
During shaking: Drop, cover, and hold on. Stay indoors if already inside. Move away from windows, shelves, and glass. Do NOT run outside while shaking. If sleeping, protect your head with a pillow or blanket. If driving, pull over safely and stay in the car until shaking stops.
After shaking stops: expect aftershocks. Check yourself and people near you for injuries. Check for gas smell, fire, water leaks, and damage before using the area. Use stairs, not elevators. Use messaging apps if phone networks are overloaded.

2. TSUNAMIS — near the coast, treat a strong coastal earthquake as a possible tsunami warning.
Evacuate immediately if shaking is strong or long, or if an official warning is issued. Go uphill or to a designated tsunami evacuation building. Do NOT go to the shore to watch. Do NOT wait to see the water recede. Tsunamis can arrive very quickly and in multiple waves.

3. TYPHOONS — usually come with advance warning, so preparation is key.
Charge devices, buy water and food early, bring balcony items indoors, close shutters or curtains before winds intensify. Stay inside during the storm. Avoid rivers, flooded roads, beaches, and underground spaces that can flood quickly. Use flashlights instead of candles during power outages.

4. EMERGENCY BAG CHECKLIST:
- Must have: passport, residence card, wallet, cash, phone charger, power bank, flashlight.
- Water / food: at least 3 days (7 is better).
- Health: medicine, first aid kit, masks, wet wipes, sanitary items.
- Comfort: spare clothes, raincoat, blanket, gloves, small towel.
- Communication: emergency contacts written on paper and stored digitally.

5. THE THREE RULES:
- Earthquake: Drop, cover, and hold on.
- Tsunami: If you feel strong shaking near the coast, go uphill immediately.
- Typhoon: Stay indoors and avoid floodwater.
Tip: save your local city evacuation (hazard) map and check it before typhoon season and before winter.`;

// Offline fallback used only when Gemini is not configured. Keyed on the hazard
// the question mentions so the assistant still answers something useful in a demo.
export function offlineHazardAnswer(question: string): string {
  const q = question.toLowerCase();
  if (/(tsunami|津波|sóng thần|海啸)/.test(q))
    return 'Tsunami: if you feel strong or long shaking near the coast, go uphill or to a tsunami evacuation building immediately. Do not wait to watch the water, and expect multiple waves.';
  if (/(typhoon|台風|bão|台风|flood|storm)/.test(q))
    return 'Typhoon: stay indoors during the storm and avoid rivers, flooded roads, and underground spaces. Charge devices, stock water and food early, and use flashlights instead of candles.';
  if (/(earthquake|地震|động đất|地震|shaking|quake)/.test(q))
    return 'Earthquake: Drop, cover, and hold on. Stay indoors, away from windows and glass, and protect your head. Do not run outside while shaking. After it stops, use stairs, not elevators, and expect aftershocks.';
  if (/(bag|kit|pack|supplies|checklist|持ち出し|túi)/.test(q))
    return 'Emergency bag: passport and residence card, cash, phone charger and power bank, flashlight, at least 3 days of water and food, medicine and first aid, and emergency contacts on paper.';
  if (/(call|number|110|119|118|police|ambulance|fire|coast)/.test(q))
    return 'Emergency numbers in Japan: Police 110, Fire and Ambulance 119, Coast Guard 118.';
  return 'Remember the three rules: in an earthquake drop, cover, and hold on; in a tsunami go uphill immediately; in a typhoon stay indoors and avoid floodwater.';
}
