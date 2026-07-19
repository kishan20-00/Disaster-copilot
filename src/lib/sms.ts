import type { Hazard, PersonalContext } from '@/types/domain';
import type { LatLng } from '@/services/geolocation';
import { getShelterInfo } from '@/lib/shelter';

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
  const floorClean = personalContext.floor.replace(' Floor', '');

  const locName = personalContext.location || 'your area';
  const shelterName = getShelterInfo(livePosition, dynamicMarkers).name;
  const trackerUrl = livePosition
    ? `https://maps.google.com/?q=${livePosition.lat.toFixed(5)},${livePosition.lng.toFixed(5)}`
    : 'https://maps.google.com/';

  if (activeHazard === 'earthquake') {
    if (lang === 'English') {
      return `Alert: Strong quake in ${locName}. We're safe (floor ${floorClean}, with child). Heading to ${shelterName}. Tracker: ${trackerUrl}`;
    }
    if (lang === 'Chinese') {
      return `警告：${locName}发生强震。我们安全（位于${personalContext.floor}，带孩子）。正撤往${shelterName}。追踪链接: ${trackerUrl}`;
    }
    if (lang === 'Vietnamese') {
      return `Cảnh báo: Động chất mạnh ở ${locName}. Chúng tôi ổn (tầng ${floorClean}, đi cùng con nhỏ). Đang tới ${shelterName}. Bản đồ: ${trackerUrl}`;
    }
    return `【緊急連絡】${locName}で強い地震。無事です（${personalContext.floor}・子供同伴）。${shelterName}へ移動します。現在地：${trackerUrl}`;
  } else if (activeHazard === 'typhoon') {
    if (lang === 'English') {
      return `Alert: Category 4 Typhoon near ${locName}. Staying inside on floor ${floorClean}. Secured. Track: ${trackerUrl}`;
    }
    if (lang === 'Chinese') {
      return `警告：${locName}附近台风4级。我们在${personalContext.floor}室内避险。一切安好。追踪: ${trackerUrl}`;
    }
    if (lang === 'Vietnamese') {
      return `Cảnh báo: Bão Cấp 4 gần ${locName}. Đang trú ẩn ở tầng ${floorClean}. An toàn. Định vị: ${trackerUrl}`;
    }
    return `【緊急連絡】大型台風接近中。安全に${personalContext.floor}に留まっています。無事です。GPS：${trackerUrl}`;
  } else {
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
}
