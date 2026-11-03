import { File } from 'expo-file-system';
import { Platform } from 'react-native';
import { API_BASE, type LanguageCode } from '@/lib/api';

export interface TranscriptionResult {
  transcript: string;
  languageCode: LanguageCode | null;
  languageProbability: number | null;
  provider?: string;
  needsReview?: boolean;
}

/** Use the recorded Blob's actual MIME type: Safari records MP4, Chrome WebM. */
export async function appendRecording(form: FormData, audioUri: string, field = 'audio') {
  if (Platform.OS === 'web') {
    const recording = await fetch(audioUri);
    const blob = await recording.blob();
    if (!blob.size) throw new Error('The recording was empty. Please try again.');
    const extension = /mp4|m4a/.test(blob.type) ? 'm4a' : /wav/.test(blob.type) ? 'wav' : /ogg/.test(blob.type) ? 'ogg' : 'webm';
    form.append(field, blob, `speech.${extension}`);
  } else {
    form.append(field, new File(audioUri), 'speech.m4a');
  }
}

/** All providers, including local Whisper, run on the API. Never retry an exhausted provider from the client. */
export async function transcribeWithSarvam(audioUri: string, language: LanguageCode): Promise<TranscriptionResult> {
  const form = new FormData();
  await appendRecording(form, audioUri);
  form.append('language', language);
  form.append('autoDetectLanguage', 'true');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 100_000);
  try {
    const response = await fetch(`${API_BASE}/api/assistant/transcribe`, { method: 'POST', body: form, signal: controller.signal });
    const body = await response.json();
    if (!response.ok) throw new Error(typeof body.error === 'string' ? body.error : 'Speech recognition is unavailable. Please try again.');
    if (!body.transcript?.trim()) throw new Error('No clear speech was heard. Please try again.');
    return { transcript: body.transcript.trim(), languageCode: body.languageCode ?? body.language ?? null, languageProbability: body.languageProbability ?? null, provider: body.stt?.provider, needsReview: body.needsReview };
  } catch (error) {
    if (controller.signal.aborted) throw new Error('Speech recognition took too long. Please try a shorter recording.');
    throw error;
  } finally { clearTimeout(timeout); }
}
