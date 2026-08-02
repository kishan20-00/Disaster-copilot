import { createContext, useContext } from 'react';
import type { Language } from '@/types/domain';
import type { MessageKey, MessageVars } from './messages';
import { translate } from './messages';

export interface LanguageValue {
  language: Language;
  t: (key: MessageKey, vars?: MessageVars) => string;
}

// Defaults to English rather than throwing when no provider is mounted, so a
// component can still be rendered in isolation.
export const LanguageContext = createContext<LanguageValue>({
  language: 'English',
  t: (key, vars) => translate('English', key, vars)
});

/**
 * The translator for the current language.
 *
 * A context is used here in preference to prop-drilling, which is the pattern
 * this replaces: `labels` was threaded from App.tsx into three components and
 * already awkward at that size. Every remaining screen needs the same value, and
 * it is exactly one value that changes rarely — the case a context is for. This
 * is deliberately NOT a general app-state store; app state stays in hooks.
 */
export const useT = () => useContext(LanguageContext).t;

/** The active language itself, for the few places that need to branch on it. */
export const useLanguage = () => useContext(LanguageContext).language;

// ─────────────────────────────────────────────────────────────────────────────
// Module-level translator, for pure functions.
//
// Components must use useT(). This exists for the code that CANNOT: the hazard
// table, the impact assessor, the verdict builder and the time formatters are
// plain functions called from services and hooks as well as from render, and
// threading a `t` parameter through every one of them would change a dozen
// signatures to carry something none of them conceptually own.
//
// LanguageProvider keeps this in sync during render, before any child renders,
// so a component reading it can never see a stale language.
// ─────────────────────────────────────────────────────────────────────────────

let activeLanguage: Language = 'English';

export function setActiveLanguage(lang: Language): void {
  activeLanguage = lang;
}

export function getActiveLanguage(): Language {
  return activeLanguage;
}

/** Translate in whatever language the app is currently showing. */
export function tActive(key: MessageKey, vars?: MessageVars): string {
  return translate(activeLanguage, key, vars);
}
