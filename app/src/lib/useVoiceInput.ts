import { browserRecognizerConstructor, startBrowserSpeech } from './browserSpeech';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import { useAutoStopRecording } from './useAutoStopRecording';
import { transcribeWithSarvam } from './transcription';
import { stopSpeaking } from './speech';
import type { LanguageCode } from './api';

/** One guarded recorder lifecycle shared by onboarding and the work assistant. */
export function useVoiceInput(language: LanguageCode, onTranscript: (text: string) => void, disabled = false) {
  const recorder = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true });
  const recording = useAudioRecorderState(recorder, 100);
  const [voiceLanguage, setVoiceLanguage] = useState<'hi' | 'en'>(language === 'hi' ? 'hi' : 'en');
  const [partial, setPartial] = useState('');
  const browserSpeech = useRef<ReturnType<typeof startBrowserSpeech> | null>(null);
  const [starting, setStarting] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const operation = useRef(false);
  const mounted = useRef(true);
  const generation = useRef(0);
  const [needsReview, setNeedsReview] = useState(false);
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;
  const level = recording.isRecording ? Math.min(1, Math.max(0, ((recording.metering ?? -50) + 50) / 50)) : 0;
  useFocusEffect(useCallback(() => {
    mounted.current = true;
    generation.current++;
    operation.current = false;
    setStarting(false);
    setTranscribing(false);
    return () => {
      mounted.current = false;
      generation.current++;
      browserSpeech.current?.abort();
      browserSpeech.current = null;
      if (recorder.isRecording) void recorder.stop().catch(() => {});
    };
  }, [recorder]));

  async function toggle() {
    if (operation.current || disabled || transcribing) return;
    operation.current = true;
    const requestGeneration = generation.current;
    setError(null);
    try {
      if (recorder.isRecording) {
        setTranscribing(true);
        await recorder.stop();
        await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
        const uri = recorder.uri;
        if (!uri) throw new Error('No recording was captured. Please try again.');
        try {
          const session = browserSpeech.current;
          const browserText = await session?.finish();
          session?.abort();
          if (browserSpeech.current === session) browserSpeech.current = null;
          if (!mounted.current || generation.current !== requestGeneration) return;
          const result = browserText ? { transcript: browserText } : await transcribeWithSarvam(uri, language);
          if (mounted.current && generation.current === requestGeneration) {
            setNeedsReview('needsReview' in result && Boolean(result.needsReview));
            onTranscriptRef.current(result.transcript);
          }
        } finally {
          if (Platform.OS === 'web' && uri.startsWith('blob:')) URL.revokeObjectURL(uri);
        }
      } else {
        setStarting(true);
        setPartial('');
        stopSpeaking();
        if (Platform.OS === 'web' && (!globalThis.isSecureContext || !navigator.mediaDevices?.getUserMedia)) {
          throw new Error('Open the app on localhost or HTTPS to use your microphone.');
        }
        const permission = await requestRecordingPermissionsAsync();
        if (!permission.granted) throw new Error('Microphone access is blocked. Allow the microphone in your browser or device settings, then try again.');
        await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
        await recorder.prepareToRecordAsync();
        if (!mounted.current || generation.current !== requestGeneration) return;
        recorder.record();
        if (Platform.OS === 'web') {
          const Constructor = browserRecognizerConstructor();
          if (Constructor) browserSpeech.current = startBrowserSpeech(Constructor, voiceLanguage, text => { if (mounted.current && generation.current === requestGeneration) setPartial(text); });
        }
      }
    } catch (cause) {
      if (mounted.current && generation.current === requestGeneration) setError(cause instanceof Error ? cause.message : 'Could not use the microphone. Please try again.');
    } finally {
      if (generation.current === requestGeneration) operation.current = false;
      if (mounted.current && generation.current === requestGeneration) { setStarting(false); setTranscribing(false); }
    }
  }
  useAutoStopRecording({ isRecording: recording.isRecording, level, durationMillis: recording.durationMillis ?? 0, onStop: toggle });
  return { toggle, recording: recording.isRecording, level, duration: recording.durationMillis ?? 0, voiceLanguage, setVoiceLanguage, partial, needsReview, starting, transcribing, error, clearError: () => setError(null) };
}
