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
