import type { Language } from '@/types/domain';

// The chosen UI language, remembered on this device.
//
// Deliberately NOT scoped per Google account, unlike the family list: sign-in is
// optional and happens well after launch, so an account-scoped language would be
// unreadable to the very user who needs it — someone who cannot read the English
// sign-in screen. Language is a property of the person holding the phone.
const KEY = 'saferoute.language.v1';

const SUPPORTED: Language[] = ['English', 'Japanese', 'Chinese', 'Vietnamese'];

const isLanguage = (v: unknown): v is Language =>
  typeof v === 'string' && (SUPPORTED as string[]).includes(v);

/**
 * The language to start in: the stored choice, else a match against the
 * browser's own preferences, else English. Guessing from `navigator.language`
 * is the honest default — a Japanese-locale phone opening a Japanese disaster
 * app almost certainly wants Japanese, and the user can still change it.
 */
export function initialLanguage(): Language {
  try {
    const stored = localStorage.getItem(KEY);
    if (isLanguage(stored)) return stored;
  } catch {
    // Storage unavailable (private mode) — fall through to the browser hint.
  }
  return languageFromNavigator();
}

/** First supported language among the browser's preferred locales. */
function languageFromNavigator(): Language {
  const tags = typeof navigator !== 'undefined'
    ? navigator.languages ?? [navigator.language]
    : [];
  for (const tag of tags) {
    const primary = String(tag).toLowerCase().split('-')[0];
    if (primary === 'ja') return 'Japanese';
    if (primary === 'zh') return 'Chinese';
    if (primary === 'vi') return 'Vietnamese';
    if (primary === 'en') return 'English';
  }
  return 'English';
}

export function saveLanguage(lang: Language): void {
  try {
    localStorage.setItem(KEY, lang);
  } catch {
    // Storage unavailable — the choice just won't survive a reload.
  }
}
