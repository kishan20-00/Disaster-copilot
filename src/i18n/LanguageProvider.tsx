import { useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { Language } from '@/types/domain';
import { getLangCode } from '@/lib/speech';
import type { MessageKey, MessageVars } from './messages';
import { translate } from './messages';
import { LanguageContext, setActiveLanguage } from './context';

interface LanguageProviderProps {
  /**
   * The active language. Passed in rather than owned here on purpose:
   * `personalContext.language` stays the single source of truth, because the
   * Gemini prompts, the SMS draft and speech recognition all read it from there.
   * Two copies of "what language is this" would eventually disagree.
   */
  language: Language;
  children: ReactNode;
}

export function LanguageProvider({ language, children }: LanguageProviderProps) {
  // Synchronously, during render rather than in an effect: children render
  // before effects run, so an effect here would let the first paint after a
  // language change use the previous one.
  setActiveLanguage(language);

  // Tell the document what language it is in. Without this the page claims to be
  // English however it renders, which mis-pronounces every screen for a screen
  // reader and prompts browsers to "translate" text that is already translated.
  useEffect(() => {
    document.documentElement.lang = getLangCode(language);
  }, [language]);

  const value = useMemo(
    () => ({
      language,
      t: (key: MessageKey, vars?: MessageVars) => translate(language, key, vars)
    }),
    [language]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
