import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';


import { converse, type ConverseResponse, type LanguageCode } from '@/lib/api';
import { LANGUAGES, UI_STRINGS } from '@/constants/languages';
import { loadHistory, saveConversation, type ConversationRecord } from '@/lib/conversationHistory';
import { setLastResult } from '@/lib/session';
import { revealPortion, speak, stopSpeaking } from '@/lib/speech';
import { useVoiceInput } from '@/lib/useVoiceInput';

import { useAuth } from '@/lib/auth';
import { useStore } from '@/lib/store';
import { useTheme } from '@/theme';
import { Button, MicOrb, Screen, TypingDots, Txt, type MicState } from '@/ui';

type AgentMessage = {
  role: 'user' | 'assistant';
  text: string;
};

export default function SpeakScreen() {
  const { language, state, district, guestProfile } = useStore();
  const { user } = useAuth();
  const { c, radius, elevation } = useTheme();
  const [busy, setBusy] = useState(false);
  const [currentResult, setCurrentResult] = useState<ConverseResponse | null>(null);
  const [agentError, setAgentError] = useState<string | null>(null);

  const [agentMessages, setAgentMessages] = useState<AgentMessage[]>([]);
  const [typed, setTyped] = useState('');
  const [showType, setShowType] = useState(false);
  const [heardSpeech, setHeardSpeech] = useState(false);
  const voice = useVoiceInput(language ?? 'hi', transcript => {
    setTyped(transcript);
    setShowType(true);
    setHeardSpeech(true);
  }, busy);
  const transcribing = voice.transcribing || voice.starting;
  const micLevel = voice.level;
  const recState = { isRecording: voice.recording, durationMillis: voice.duration };
  const toggleRecord = voice.toggle;
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<ConversationRecord[]>([]);
  // reveals the latest agent bubble word-by-word, paced to the spoken audio
  const [reveal, setReveal] = useState<{ index: number; fraction: number } | null>(null);
  const spoke = useRef(false);
  const sessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    loadHistory().then(setHistory);
  }, []);

  useEffect(() => () => stopSpeaking(), []);

  function ensureSessionId(): string {
    if (!sessionIdRef.current) sessionIdRef.current = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    return sessionIdRef.current;
  }

  function openHistoryItem(record: ConversationRecord) {
    stopSpeaking();
    setReveal(null);
    setAgentMessages(record.messages);
    sessionIdRef.current = record.id;
    setHistoryOpen(false);
    setShowType(false);
  }

  /** The work questions are about a specific trade — "how many years have you
   *  done THIS work?" — so they are asked per skill, not once per user. Twenty
   *  years of pottery says nothing about food processing, and answering once
   *  used to silently credit those years to every later trade. */
  function shouldAskSkillQuestions(skill: string | null): boolean {
    const profile = user ?? guestProfile;
    if (!profile) return true;
    if (profile.experienceYears == null || !profile.workPreference) return true;
    // Ask again if we don't know which trade the saved experience belongs to.
    // This also avoids carrying forward old local data from before we stored
    // experienceSkill.
    if (!skill || !profile.experienceSkill) return true;
    // already answered — but only skip if it was about this same trade
    return profile.experienceSkill !== skill;
  }

  /** The normalized skill token this turn resolved to, if any. */
  function capturedSkill(result: ConverseResponse): string | null {
    return (result.mappings ?? []).find((m) => m.normalizedSkill !== 'unknown' && !!m.title)?.normalizedSkill ?? null;
  }

  /** A skill counts as understood only once it maps to a real NSQF
   *  qualification. "unknown" mappings carry no title. */
  function understoodSkill(result: ConverseResponse): boolean {
    return capturedSkill(result) !== null;
  }

  function routeAfterSkill(result: ConverseResponse) {
    if (language === 'hi' || language === 'en') { router.push('/survey'); return; }
    const skill = capturedSkill(result);
    router.push(
      // Work-profile answers are quick, and re-asking keeps demos honest after
      // edits or a corrected "months" answer.
      skill || shouldAskSkillQuestions(skill)
        ? `/onboarding/voice-profile?mode=skill&returnTo=/confirm${skill ? `&skill=${encodeURIComponent(skill)}` : ''}`
        : '/confirm',
    );
  }

  const t = language ? UI_STRINGS[language] : UI_STRINGS.hi;
  const langNative = LANGUAGES.find((l) => l.code === language)?.native ?? '';

  useEffect(() => {
    if (language && !spoke.current) {
      spoke.current = true;
      const timer = setTimeout(() => speak(t.tapHint, language), 400);
      return () => clearTimeout(timer);
    }
  }, [language]);



  if (!language) return null;

  const micState: MicState = busy || transcribing ? 'thinking' : recState.isRecording ? 'listening' : 'idle';
  const status = busy
    ? t.agentThinking
    : transcribing
      ? t.transcribing
      : recState.isRecording
        ? t.listening
        : t.agentTapToTalk;

  async function submit(payload: { transcript?: string; audioUri?: string }, turnLanguage: LanguageCode = language!) {
    setAgentError(null);
    setBusy(true);
    try {
      const result = await converse({
        ...payload,
        language: turnLanguage,
        state,
        district,
        channel: 'APP',
        userId: user?.id,
        history: agentMessages,
        autoDetectLanguage: true,
      });
      setLastResult(result);
      setCurrentResult(result);
      setShowType(false);
      setTyped('');
      const spokenText = payload.transcript ?? result.transcript;
      if (spokenText) {
        const updated = await saveConversation(`${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, [
          { role: 'user', text: spokenText },
          { role: 'assistant', text: result.reply.text },
        ]);
        setHistory(updated);
      }
      // Don't move on until we actually understood the skill. Asking "how many
      // years have you done this work?" when we could not tell what the work
      // is reads as the app not listening — and the answer would be attached
      // to no trade. Stay here so they can say it again, in their own words.
      if (understoodSkill(result)) {
        routeAfterSkill(result);
      } else {
        setAgentMessages((prev) =>
          prev.concat({ role: 'assistant' as const, text: result.reply.text || t.noMatch }),
        );
      }
    } catch (e) {
      setAgentError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function sendTranscript(text: string) {
    const clean = text.trim();
    if (!clean) {
      Alert.alert(t.noSpeechDetected);
      return;
    }
    await runAgentTurn(clean);
  }

  async function runAgentTurn(text: string, turnLanguage: LanguageCode = language!) {
    const clean = text.trim();
    if (!clean) return;

    setAgentError(null);
    setBusy(true);
    setShowType(false);
    setTyped('');
    const withUser = agentMessages.concat({ role: 'user' as const, text: clean });
    setAgentMessages(withUser);
    try {
      const result = await converse({
        transcript: clean,
        language: turnLanguage,
        state,
        district,
        channel: 'APP',
        userId: user?.id,
        history: agentMessages,
        autoDetectLanguage: true,
      });
      // Always speak the reply in the language the beneficiary chose, never one
      // the server or STT inferred — see the note in the transcription branch.
      const replyLanguage = turnLanguage;
      setLastResult(result);
      setCurrentResult(result);
      const replyText = result.reply.text || t.agentFallbackReply;
      const withReply = withUser.concat({ role: 'assistant' as const, text: replyText });
      setAgentMessages(withReply);
      setReveal(null);
      speak(replyText, replyLanguage);
      const updated = await saveConversation(ensureSessionId(), withReply);
      setHistory(updated);
      // as above: only move on once we actually understood the skill. The
      // reply is already shown and spoken, so they can simply try again.
      if (understoodSkill(result)) routeAfterSkill(result);
    } catch (e) {
      setAgentError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }


  function changeLanguage() {
    router.push('/language');
  }

  return (
    <Screen edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.topBar}>
          <Txt variant="h2">{t.navSpeak}</Txt>
          <View style={styles.topActions}>
            <Pressable
              onPress={() => setHistoryOpen((v) => !v)}
              accessibilityRole="button"
              accessibilityLabel={t.historyTitle}
              style={[
                styles.historyChip,
                {
                  backgroundColor: historyOpen ? c.primary : c.surfaceAlt,
                  borderColor: historyOpen ? c.primary : c.border,
                },
              ]}>
              <Ionicons name="time-outline" size={16} color={historyOpen ? c.onPrimary : c.textDim} />
            </Pressable>
            <Pressable
              onPress={changeLanguage}
              style={[styles.langChip, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
              <Ionicons name="language" size={14} color={c.textDim} />
              <Txt variant="caption" tone="dim">
                {langNative}
              </Txt>
              <Ionicons name="chevron-down" size={13} color={c.textDim} />
            </Pressable>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {historyOpen && (
            <Animated.View
              entering={FadeInDown.duration(200)}
              style={[styles.historyPanel, { backgroundColor: c.surface, borderColor: c.border }, elevation('card')]}>
              <Txt variant="overline" tone="faint" style={{ marginBottom: 6 }}>
                {t.historyTitle}
              </Txt>
              {history.length === 0 ? (
                <Txt variant="body" tone="dim">
                  {t.noHistoryYet}
                </Txt>
              ) : (
                history.slice(0, 3).map((rec) => (
                  <Pressable
                    key={rec.id}
                    onPress={() => openHistoryItem(rec)}
                    style={[styles.historyRow, { borderColor: c.border }]}>
                    <Ionicons name="chatbubble-ellipses-outline" size={16} color={c.primary} />
                    <Txt variant="body" style={{ flex: 1 }} numberOfLines={1}>
                      {rec.title}
                    </Txt>
                    <Ionicons name="chevron-forward" size={15} color={c.textFaint} />
                  </Pressable>
                ))
              )}
            </Animated.View>
          )}

          {!!(voice.error || agentError) && <View accessibilityRole="alert" style={{ padding: 16, gap: 8 }}><Txt tone="danger">{voice.error || agentError}</Txt><Txt tone="dim">You can retry the microphone or type your answer below.</Txt></View>}
          <Animated.View entering={FadeIn.duration(500)} style={styles.micWrap}>
            <MicOrb state={micState} onPress={toggleRecord} level={micLevel} />
            <View key={status}>
              <Txt variant="title" center style={{ marginTop: 4 }}>
                {status}
              </Txt>
            </View>
            {micState === 'idle' && (
              <Txt variant="body" tone="dim" center style={{ maxWidth: 280 }}>
                {t.agentHint}
              </Txt>
            )}
            {recState.isRecording && (
              <View style={[styles.recPill, { backgroundColor: c.dangerSoft }]}>
                <View style={[styles.recDot, { backgroundColor: c.danger }]} />
                <Txt variant="caption" style={{ color: c.danger }}>
                  {`${Math.round((recState.durationMillis ?? 0) / 1000)}s`}
                </Txt>
              </View>
            )}
          </Animated.View>

          {agentMessages.length > 0 && (
            <Animated.View entering={FadeInDown.duration(300)} style={styles.agentThread}>
              {agentMessages.map((message, index) => {
                const revealing = reveal?.index === index && message.role === 'assistant';
                const waitingToSpeak = revealing && reveal.fraction <= 0;
                const shownText = revealing ? revealPortion(message.text, reveal.fraction) : message.text;
                return (
                  <View
                    key={`${message.role}-${index}`}
                    style={[
                      styles.agentBubble,
                      {
                        alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
                        backgroundColor: message.role === 'user' ? c.surfaceAlt : c.primarySoft,
                        borderColor: message.role === 'user' ? c.border : c.primarySoft,
                      },
                    ]}>
                    <View style={styles.agentBubbleHeader}>
                      <Ionicons
                        name={message.role === 'user' ? 'person-circle-outline' : 'sparkles'}
                        size={15}
                        color={message.role === 'user' ? c.textDim : c.primary}
                      />
                      <Txt variant="overline" tone="faint">
                        {message.role === 'user' ? t.youSaid : t.agentName}
                      </Txt>
                    </View>
                    {waitingToSpeak ? (
                      <TypingDots color={c.primary} />
                    ) : (
                      <Txt variant="body">
                        {shownText}
                        {revealing && shownText.length < message.text.length ? ' ▍' : ''}
                      </Txt>
                    )}
                  </View>
                );
              })}
              {busy && !reveal && (
                <View
                  style={[
                    styles.agentBubble,
                    { alignSelf: 'flex-start', backgroundColor: c.primarySoft, borderColor: c.primarySoft },
                  ]}>
                  <View style={styles.agentBubbleHeader}>
                    <Ionicons name="sparkles" size={15} color={c.primary} />
                    <Txt variant="overline" tone="faint">
                      {t.agentName}
                    </Txt>
                  </View>
                  <TypingDots color={c.primary} />
                </View>
              )}
              {currentResult && !understoodSkill(currentResult) && (language === 'hi' || language === 'en') && <Button label="Choose profession and customize" variant="secondary" onPress={() => router.push('/survey')} />}
              <View style={styles.actionRow}>
                <Button
                  label={t.clearAgent}
                  variant="secondary"
                  size="md"
                  icon="trash-outline"
                  fullWidth={false}
                  onPress={() => {
                    stopSpeaking();
                    setReveal(null);
                    setAgentMessages([]);
                    sessionIdRef.current = null;
                  }}
                />
                <Button
                  label={t.viewResults}
                  size="md"
                  icon="school-outline"
                  fullWidth={false}
                  onPress={() => router.push('/results')}
                />
              </View>
            </Animated.View>
          )}

          {micState === 'idle' && !showType && (
            <Animated.View
              entering={FadeInDown.delay(150).duration(400)}
              style={[styles.examples, { backgroundColor: c.surface, borderColor: c.border }, elevation('card')]}>
              <Txt variant="overline" tone="faint" style={{ marginBottom: 4 }}>
                {t.examplesTitle}
              </Txt>
              {t.examples.map((ex) => (
                <Pressable
                  key={ex}
                  onPress={() => submit({ transcript: ex })}
                  style={({ pressed }) => [
                    styles.exampleRow,
                    { borderColor: c.border, backgroundColor: pressed ? c.surfaceAlt : 'transparent' },
                  ]}>
                  <Ionicons name="chatbubble-ellipses-outline" size={16} color={c.primary} />
                  <Txt variant="body" style={{ flex: 1 }}>
                    {ex}
                  </Txt>
                  <Ionicons name="arrow-forward" size={15} color={c.textFaint} />
                </Pressable>
              ))}
            </Animated.View>
          )}

          {showType && (
            <Animated.View entering={FadeInDown.duration(300)} style={styles.typeBox}>
              {heardSpeech && <Txt tone="primary">{language === 'hi' ? 'आपने यह कहा। जाँचकर भेजें या सुधारें।' : 'I heard this. Review or edit it, then send.'}</Txt>}
              {heardSpeech && voice.needsReview && <Txt tone="danger">Low-confidence transcription. Please correct any mistakes before sending.</Txt>}
              <TextInput
                value={typed}
                onChangeText={setTyped}
                placeholder={t.typePlaceholder}
                placeholderTextColor={c.textFaint}
                multiline
                autoFocus
                style={[
                  styles.input,
                  { color: c.text, backgroundColor: c.surface, borderColor: c.border, borderRadius: radius.md },
                ]}
              />
              <Button
                label={t.send}
                icon="send"
                onPress={() => sendTranscript(typed)}
                loading={busy}
                disabled={!typed.trim() || transcribing || recState.isRecording}
              />
            </Animated.View>
          )}
        </ScrollView>

        <View style={styles.bottom}>
          {Platform.OS === 'web' && !recState.isRecording && !transcribing && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Button size="md" fullWidth={false} variant={voice.voiceLanguage === 'en' ? 'primary' : 'secondary'} label="Voice: English" onPress={() => voice.setVoiceLanguage('en')} />
            <Button size="md" fullWidth={false} variant={voice.voiceLanguage === 'hi' ? 'primary' : 'secondary'} label="Voice: Hindi / Hinglish" onPress={() => voice.setVoiceLanguage('hi')} />
          </View>}
          {!!voice.partial && recState.isRecording && <Txt tone="primary">Hearing: {voice.partial}</Txt>}
          <Button label={recState.isRecording ? "Stop recording" : "Start recording"} icon={recState.isRecording ? "stop-circle-outline" : "mic-outline"} disabled={busy || transcribing} onPress={toggleRecord} />
          <Txt variant="caption" center tone="dim">{recState.isRecording ? 'Listening… speak clearly, then tap Stop recording.' : 'Tap the microphone to start. Allow microphone access when asked.'}</Txt>
          <Button
            label={showType ? t.agentTapToTalk : t.typeInstead}
            variant="secondary"
            size="md"
            icon={showType ? 'mic-outline' : 'create-outline'}
            onPress={() => setShowType((v) => !v)}
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 8,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  langChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  historyChip: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  historyPanel: { borderRadius: 18, borderWidth: 1, padding: 14, gap: 2 },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 16, gap: 24 },
  micWrap: { alignItems: 'center', gap: 10 },
  recPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginTop: 2,
  },
  recDot: { width: 8, height: 8, borderRadius: 4 },
  examples: { borderRadius: 20, borderWidth: 1, padding: 14, gap: 6 },
  actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' },
  agentThread: { gap: 10 },
  agentBubble: { maxWidth: '92%', borderRadius: 16, borderWidth: 1, padding: 14, gap: 8 },
  agentBubbleHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  exampleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  typeBox: { gap: 12 },
  input: { minHeight: 64, borderWidth: 1, padding: 14, fontSize: 16, lineHeight: 22 },
  bottom: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8 },
});
