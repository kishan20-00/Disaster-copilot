import type { Language } from '@/types/domain';

// Map app language names to BCP-47 codes for Web Speech API.
export const getLangCode = (lang: Language): string =>
  ({ English: 'en-US', Chinese: 'zh-CN', Vietnamese: 'vi-VN', Japanese: 'ja-JP' }[lang]);

// Cancel any in-flight utterance then speak new text at a calm emergency cadence.
export function speakText(text: string, lang: string): void {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = lang;
  utter.rate = 0.88;
  window.speechSynthesis.speak(utter);
}
