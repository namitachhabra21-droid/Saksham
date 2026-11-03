import { useEffect, useRef } from 'react';

import { shouldStopRecording, SPEECH_LEVEL } from './recordingPolicy';

interface Options {
  isRecording: boolean;
  /** 0–1 normalized microphone level, as fed to MicOrb */
  level: number;
  durationMillis: number;
  /** called once, to end the turn — the screen's own mic toggle */
  onStop: () => void;
}

/**
 * Ends a recording once the beneficiary has clearly finished speaking, so a
 * turn closes on its own instead of needing a second tap on the mic. Tapping
 * the mic still works, and is the fallback if a device reports no metering.
 */
export function useAutoStopRecording({ isRecording, level, durationMillis, onStop }: Options) {
  const onStopRef = useRef(onStop);
  onStopRef.current = onStop;

  const heardSpeechRef = useRef(false);
  const lastVoiceAtRef = useRef(0);
  const stoppedRef = useRef(false);

  useEffect(() => {
    if (!isRecording) {
      heardSpeechRef.current = false;
      lastVoiceAtRef.current = 0;
      stoppedRef.current = false;
      return;
    }
    if (stoppedRef.current) return;

    const now = Date.now();
    if (shouldStopRecording({ heardSpeech: heardSpeechRef.current, lastVoiceAt: lastVoiceAtRef.current, level, durationMillis, now })) {
      stoppedRef.current = true;
      onStopRef.current();
      return;
    }
    if (level >= SPEECH_LEVEL) {
      heardSpeechRef.current = true;
      lastVoiceAtRef.current = now;
    }
  }, [isRecording, level, durationMillis]);
}
