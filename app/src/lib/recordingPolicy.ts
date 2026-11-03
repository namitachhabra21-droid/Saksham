interface RecordingSnapshot {
  heardSpeech: boolean;
  lastVoiceAt: number;
  level: number;
  durationMillis: number;
  now: number;
}
export const SPEECH_LEVEL = 0.22;
/** The hard cap must take priority even during continuous speech or noise. */
export function shouldStopRecording(s: RecordingSnapshot): boolean {
  if (s.durationMillis >= 45000) return true;
  if (!s.heardSpeech && s.durationMillis >= 10000) return true;
  if (s.level >= SPEECH_LEVEL || !s.heardSpeech || s.durationMillis < 1200) return false;
  return s.now - s.lastVoiceAt >= 2300;
}
