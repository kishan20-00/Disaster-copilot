import type { Hazard, PersonalContext } from '@/types/domain';
import type { LatLng } from '@/services/geolocation';
import { getShelterInfo } from '@/lib/shelter';
import { hazardInfo, responseMode } from '@/constants/hazards';
import { describeFloor, floorLabel, describeCompanions } from '@/lib/profileFormat';

export interface SmsDraftInput {
  liveSmsDraft: string | null;
  personalContext: PersonalContext;
  activeHazard: Hazard;
  dynamicMarkers: any[];
  livePosition: LatLng | null;
}

// Deterministic multilingual emergency SMS draft (fallback when Gemini is off).
export function buildSmsDraft({ liveSmsDraft, personalContext, activeHazard, dynamicMarkers, livePosition }: SmsDraftInput): string {
  if (liveSmsDraft && liveSmsDraft.trim().length > 0) return liveSmsDraft;
  const lang = personalContext.language;
  // Previously `floor.replace(' Floor','')` turned '9th Floor' into "floor 9th".
  const floorClean = floorLabel(personalContext.floor);
  const floorPhrase = describeFloor(personalContext.floor);
  const withWhom = describeCompanions(personalContext.companions);

  const locName = personalContext.location || 'your area';
  const shelterName = getShelterInfo(livePosition, dynamicMarkers).name;
  const trackerUrl = livePosition
    ? `https://maps.google.com/?q=${livePosition.lat.toFixed(5)},${livePosition.lng.toFixed(5)}`
    : 'https://maps.google.com/';

  if (activeHazard === 'earthquake') {
    if (lang === 'English') {
      return `Alert: Strong quake in ${locName}. We're safe (${floorPhrase}, ${withWhom}). Heading to ${shelterName}. Tracker: ${trackerUrl}`;
    }
    if (lang === 'Chinese') {
      return `警告：${locName}发生强震。我们安全（${floorClean}）。正撤往${shelterName}。追踪链接: ${trackerUrl}`;
    }
    if (lang === 'Vietnamese') {
      return `Cảnh báo: Động đất mạnh ở ${locName}. Chúng tôi ổn (tầng ${floorClean}). Đang tới ${shelterName}. Bản đồ: ${trackerUrl}`;
    }
    return `【緊急連絡】${locName}で強い地震。無事です（${floorClean}）。${shelterName}へ移動します。現在地：${trackerUrl}`;
  } else if (activeHazard === 'typhoon') {
    if (lang === 'English') {
      return `Alert: Category 4 Typhoon near ${locName}. Staying inside on floor ${floorClean}. Secured. Track: ${trackerUrl}`;
    }
    if (lang === 'Chinese') {
      return `警告：${locName}附近台风4级。我们在${floorClean}室内避险。一切安好。追踪: ${trackerUrl}`;
    }
    if (lang === 'Vietnamese') {
      return `Cảnh báo: Bão Cấp 4 gần ${locName}. Đang trú ẩn ở tầng ${floorClean}. An toàn. Định vị: ${trackerUrl}`;
    }
    return `【緊急連絡】大型台風接近中。安全に${floorClean}に留まっています。無事です。GPS：${trackerUrl}`;
  } else if (activeHazard === 'tsunami') {
    if (lang === 'English') {
      return `Alert: Major Tsunami Warning! Evacuating to safe vertical height. Position: ${locName}. Track: ${trackerUrl}`;
    }
    if (lang === 'Chinese') {
      return `紧急警报：大海啸预警！我们正前往高处垂直避难。${locName}。追踪: ${trackerUrl}`;
    }
    if (lang === 'Vietnamese') {
      return `Cảnh báo khẩn: Sóng thần lớn! Đang sơ tán lên vùng cao an toàn. ${locName}. Định vị: ${trackerUrl}`;
    }
    return `【大津波警報】津波から避難するため、高台へ向かっています。現在地：${locName}。URL: ${trackerUrl}`;
  }

  // Generic draft for the newer hazard classes. English only by design: Gemini
  // writes the localised version in the live path, and inventing hazard-name
  // translations for a message people may actually send would be worse than
  // being plainly English.
  const info = hazardInfo(activeHazard);
  const movement = responseMode(activeHazard) === 'evacuate'
    ? `Heading to ${shelterName}.`
    : 'Staying put indoors.';
  return `Alert: ${info.label} near ${locName}. We are safe (${floorPhrase}, ${withWhom}). ${movement} Tracker: ${trackerUrl}`;
}
