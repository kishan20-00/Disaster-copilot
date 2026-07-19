import { useEffect, useRef, useState } from 'react';
import type { ActionStep, Hazard, Language, PersonalContext } from '@/types/domain';
import type { LatLng } from '@/services/geolocation';
import { getLangCode, speakText } from '@/lib/speech';
import { buildAdvice } from '@/lib/advice';

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

    // Floor
    if (lower.includes('9th floor') || lower.includes('ninth floor') || lower.includes('high rise') || lower.includes('9楼') || lower.includes('九楼') || lower.includes('9階') || lower.includes('tầng 9')) {
      setPersonalContext(prev => ({ ...prev, floor: '9th Floor' }));
      feedback = 'Floor context updated to 9th Floor.';
      updated = true;
    } else if (lower.includes('ground floor') || lower.includes('first floor') || lower.includes('1st floor') || lower.includes('一楼') || lower.includes('1楼') || lower.includes('1階') || lower.includes('1f') || lower.includes('tầng trệt') || lower.includes('tầng 1')) {
      setPersonalContext(prev => ({ ...prev, floor: 'Ground Floor' }));
      feedback = 'Floor context updated to Ground Floor.';
      updated = true;
    } else if (lower.includes('basement') || lower.includes('underground') || lower.includes('地下') || lower.includes('b1') || lower.includes('tầng hầm')) {
      setPersonalContext(prev => ({ ...prev, floor: 'Basement' }));
      feedback = 'Floor context updated to Basement.';
      updated = true;
    }

    // Companions
    if (lower.includes('solo') || lower.includes('alone') || lower.includes('myself') || lower.includes('单人') || lower.includes('独自') || lower.includes('cá nhân') || lower.includes('một mình')) {
      setPersonalContext(prev => ({ ...prev, companions: 'Traveling Solo' }));
      feedback = 'Companions updated to Traveling Solo.';
      updated = true;
    } else if (lower.includes('child') || lower.includes('baby') || lower.includes('stroller') || lower.includes('孩子') || lower.includes('儿童') || lower.includes('子供') || lower.includes('trẻ em') || lower.includes('em bé')) {
      setPersonalContext(prev => ({ ...prev, companions: 'With a Child' }));
      feedback = 'Companions updated to With a Child.';
      updated = true;
    } else if (lower.includes('elderly') || lower.includes('parent') || lower.includes('old') || lower.includes('老人') || lower.includes('长辈') || lower.includes('高齢') || lower.includes('cha mẹ') || lower.includes('người già')) {
      setPersonalContext(prev => ({ ...prev, companions: 'With Elderly Parents' }));
      feedback = 'Companions updated to With Elderly Parents.';
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
        feedback = 'Emergency SMS approved and sent!';
        updated = true;
      } else {
        feedback = 'SMS can only be sent when the simulation is finished.';
      }
    }

    if (updated) {
      setSttFeedback(feedback);
      speakText(feedback, getLangCode(personalContext.language));
    } else {
      setSttFeedback(`Heard: "${text}". No command found.`);
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
