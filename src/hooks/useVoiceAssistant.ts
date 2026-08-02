import { useEffect, useRef, useState } from 'react';
import type { ActionStep, Hazard, Language, PersonalContext } from '@/types/domain';
import type { LatLng } from '@/services/geolocation';
import { getLangCode, speakText } from '@/lib/speech';
import { buildAdvice } from '@/lib/advice';
import { askHazardQuestion } from '@/services/gemini';

export interface UseVoiceAssistantParams {
  voiceAssistant: boolean;
  personalContext: PersonalContext;
  currentStep: number;
  smsStatus: string;
  isSimulating: boolean;
  liveSteps: ActionStep[] | null;
  activeHazard: Hazard;
  livePosition: LatLng | null;
  dynamicMarkers: any[];
  setPersonalContext: React.Dispatch<React.SetStateAction<PersonalContext>>;
  onTrigger: () => void;
  onApproveSms: () => void;
}

// Speech input (STT) + spoken output (TTS) for the co-pilot. Owns the recognition
// instance and its transcript/feedback state; announces pipeline events aloud.
export function useVoiceAssistant(params: UseVoiceAssistantParams) {
  const {
    voiceAssistant, personalContext, currentStep, smsStatus, isSimulating,
    liveSteps, activeHazard, livePosition, dynamicMarkers,
    setPersonalContext, onTrigger, onApproveSms
  } = params;

  const [isListening, setIsListening] = useState(false);
  const [heardText, setHeardText] = useState('');
  const [sttFeedback, setSttFeedback] = useState('');
  const recognitionRef = useRef<any>(null);
  // Bridges the once-created recognition instance to the latest command handler
  // so onresult always sees fresh state without re-creating recognition.
  const processVoiceCommandRef = useRef<((text: string) => void) | null>(null);

  // Speech-to-Text (STT) recognition setup — created once.
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;

      rec.onstart = () => {
        setIsListening(true);
        setSttFeedback('');
      };

      rec.onend = () => {
        setIsListening(false);
      };

      rec.onerror = (e: any) => {
        console.error("Speech Recognition Error", e);
        setIsListening(false);
        setSttFeedback('Could not hear clearly. Try again.');
      };

      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setHeardText(transcript);
        processVoiceCommandRef.current?.(transcript);
      };

      recognitionRef.current = rec;
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (err) {
          console.error("Failed to abort speech recognition on unmount", err);
        }
      }
    };
  }, []);

  // Sync recognition locale with the selected language.
  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = getLangCode(personalContext.language);
    }
  }, [personalContext.language]);

  // Stop recognition whenever the assistant is switched off.
  useEffect(() => {
    if (!voiceAssistant) {
      try {
        recognitionRef.current?.stop();
      } catch (err) {
        console.error("Failed to stop recognition", err);
      }
      setIsListening(false);
    }
  }, [voiceAssistant]);

  const processVoiceCommand = (text: string) => {
    const lower = text.toLowerCase().trim();
    let updated = false;
    let feedback = '';

    // Language
    if (lower.includes('english') || lower.includes('yingyu') || lower.includes('tiếng anh')) {
      setPersonalContext(prev => ({ ...prev, language: 'English' }));
      feedback = 'Language updated to English.';
      updated = true;
    } else if (lower.includes('japanese') || lower.includes('nihongo') || lower.includes('日本語') || lower.includes('tiếng nhật')) {
      setPersonalContext(prev => ({ ...prev, language: 'Japanese' }));
      feedback = '言語を日本語に更新しました。';
      updated = true;
    } else if (lower.includes('chinese') || lower.includes('zhongwen') || lower.includes('中文') || lower.includes('汉语') || lower.includes('tiếng trung')) {
      setPersonalContext(prev => ({ ...prev, language: 'Chinese' }));
      feedback = '语言已更新为中文。';
      updated = true;
    } else if (lower.includes('vietnamese') || lower.includes('tieng viet') || lower.includes('tiếng việt') || lower.includes('yuenan')) {
      setPersonalContext(prev => ({ ...prev, language: 'Vietnamese' }));
      feedback = 'Ngôn ngữ cập nhật thành Tiếng Việt.';
      updated = true;
    }

    // Floor — accepts any storey, not just the three the demo shipped with.
    const floorMatch = /(?:^|\s)(?:floor\s*(\d{1,3})|(\d{1,3})\s*(?:st|nd|rd|th)?\s*(?:floor|f|階|楼|tầng))/.exec(lower);
    if (lower.includes('basement') || lower.includes('underground') || lower.includes('地下') || lower.includes('tầng hầm')) {
      const level = /b\s*(\d)/.exec(lower);
      const depth = level ? -Math.abs(parseInt(level[1], 10)) : -1;
      setPersonalContext(prev => ({ ...prev, floor: depth }));
      feedback = `Floor set to basement level ${Math.abs(depth)}.`;
      updated = true;
    } else if (lower.includes('ground floor') || lower.includes('一楼') || lower.includes('1階') || lower.includes('tầng trệt')) {
      setPersonalContext(prev => ({ ...prev, floor: 0 }));
      feedback = 'Floor set to ground floor.';
      updated = true;
    } else if (floorMatch) {
      const n = parseInt(floorMatch[1] ?? floorMatch[2], 10);
      if (Number.isFinite(n) && n >= 0 && n <= 200) {
        setPersonalContext(prev => ({ ...prev, floor: n }));
        feedback = `Floor set to ${n}.`;
        updated = true;
      }
    }

    // Companions — attributes rather than three fixed personas.
    const peopleMatch = /(\d{1,2})\s*(?:people|persons|others|人|người)/.exec(lower);
    if (lower.includes('alone') || lower.includes('by myself') || lower.includes('solo') || lower.includes('一人') || lower.includes('một mình')) {
      setPersonalContext(prev => ({ ...prev, companions: { count: 0, needsAssistance: false, needsCarrying: false } }));
      feedback = 'Set to travelling alone.';
      updated = true;
    } else if (peopleMatch) {
      const n = parseInt(peopleMatch[1], 10);
      setPersonalContext(prev => ({ ...prev, companions: { ...prev.companions, count: n } }));
      feedback = `Set to ${n} with you.`;
      updated = true;
    }
    if (lower.includes('baby') || lower.includes('infant') || lower.includes('carry') || lower.includes('抱') || lower.includes('赤ちゃん')) {
      setPersonalContext(prev => ({ ...prev, companions: { ...prev.companions, count: Math.max(1, prev.companions.count), needsCarrying: true } }));
      feedback = 'Noted: someone needs carrying.';
      updated = true;
    } else if (lower.includes('elderly') || lower.includes('needs help') || lower.includes('高齢') || lower.includes('người già')) {
      setPersonalContext(prev => ({ ...prev, companions: { ...prev.companions, count: Math.max(1, prev.companions.count), needsAssistance: true } }));
      feedback = 'Noted: someone needs help moving.';
      updated = true;
    }

    // Mobility
    if (lower.includes('wheelchair') || lower.includes('wheel chair') || lower.includes('mobility impaired') || lower.includes('轮椅') || lower.includes('車椅子') || lower.includes('xe lăn')) {
      setPersonalContext(prev => ({ ...prev, mobility: 'Wheelchair User' }));
      feedback = 'Mobility updated to Wheelchair User.';
      updated = true;
    } else if (lower.includes('mobile') || lower.includes('fully mobile') || lower.includes('walking') || lower.includes('正常') || lower.includes('歩行可能') || lower.includes('di chuyển bình thường')) {
      setPersonalContext(prev => ({ ...prev, mobility: 'Fully Mobile' }));
      feedback = 'Mobility updated to Fully Mobile.';
      updated = true;
    }

    // Action Commands
    if (lower.includes('trigger') || lower.includes('simulation') || lower.includes('start') || lower.includes('alert') || lower.includes('地震') || lower.includes('台風') || lower.includes('kích hoạt') || lower.includes('chạy')) {
      onTrigger();
      feedback = 'Triggering emergency simulation!';
      updated = true;
    } else if (lower.includes('send') || lower.includes('approve') || lower.includes('sms') || lower.includes('message') || lower.includes('发送') || lower.includes('送信') || lower.includes('gửi')) {
      if (currentStep >= 4 && smsStatus === 'idle') {
        onApproveSms();
        feedback = 'Emergency message copied — paste it into your SMS app to send.';
        updated = true;
      } else {
        feedback = 'The message can only be copied once the safety check is finished.';
      }
    }

    if (updated) {
      setSttFeedback(feedback);
      speakText(feedback, getLangCode(personalContext.language));
    } else {
      // Not a profile/action command — treat it as a safety question and answer
      // it aloud, grounded in the Japan safety guide, in the user's language.
      answerHazardQuestion(text);
    }
  };

  // Route unmatched speech to the grounded safety Q&A assistant and speak the
  // reply. Kept separate so the command handler stays synchronous.
  const answerHazardQuestion = async (question: string) => {
    const lang = personalContext.language;
    setSttFeedback(`Heard: "${question}". Thinking…`);
    try {
      const answer = await askHazardQuestion(question, lang);
      setSttFeedback(answer);
      speakText(answer, getLangCode(lang));
    } catch (err) {
      console.error('Hazard Q&A failed', err);
      const fallback = 'Sorry, I could not answer that. In an emergency, drop, cover, and hold on, or move uphill away from the coast.';
      setSttFeedback(fallback);
      speakText(fallback, getLangCode(lang));
    }
  };

  // Keep the ref pointing at the latest handler (fresh state) every render.
  useEffect(() => { processVoiceCommandRef.current = processVoiceCommand; });

  const toggleSpeechRecognition = () => {
    if (!recognitionRef.current) {
      setSttFeedback('Speech recognition not supported in this browser.');
      return;
    }
    if (isListening) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.error(err);
      }
    } else {
      try {
        setHeardText('');
        setSttFeedback('');
        recognitionRef.current.start();
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Speak an alert announcement the moment the pipeline fires. Intentionally fires
  // only on step 0 — re-speaking on a later language change is not wanted.
  useEffect(() => {
    if (!voiceAssistant || currentStep !== 0) return;
    const announcements: Record<Language, string> = {
      English: 'Emergency alert activated. Analyzing situation now.',
      Chinese: '紧急警报已启动，正在分析情况。',
      Vietnamese: 'Cảnh báo khẩn cấp đã kích hoạt. Đang phân tích tình huống.',
      Japanese: '緊急警報が発動されました。状況を分析しています。'
    };
    speakText(announcements[personalContext.language], getLangCode(personalContext.language));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceAssistant, currentStep]);

  // Read the final action steps aloud once the pipeline is done. Fires on
  // completion; deliberately not re-run on later profile edits.
  useEffect(() => {
    if (!voiceAssistant || currentStep < 4 || isSimulating) return;
    const steps = buildAdvice({ liveSteps, personalContext, activeHazard, dynamicMarkers, userPos: livePosition });
    const text = steps.map(s => `${s.title}. ${s.desc}`).join(' ');
    speakText(text, getLangCode(personalContext.language));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceAssistant, currentStep, isSimulating, liveSteps]);

  return { isListening, heardText, sttFeedback, toggleSpeechRecognition };
}
