import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';


import { extractProfileAnswer, type ProfileField } from '@/lib/api';
import { UI_STRINGS } from '@/constants/languages';
import { useAuth } from '@/lib/auth';
import { revealPortion, speak, stopSpeaking } from '@/lib/speech';
import { useVoiceInput } from '@/lib/useVoiceInput';

import { resolveDeviceLocation } from '@/lib/location';
import { setSkillDetails } from '@/lib/session';
import { useStore } from '@/lib/store';
import { useTheme } from '@/theme';
import { Button, MicOrb, Screen, StepProgress, TypingDots, Txt, type MicState } from '@/ui';

type ProfileMessage = { id: number; role: 'user' | 'assistant'; text: string };
type StepField = ProfileField | 'skillDetails';

export default function VoiceProfileStep() {
  const params = useLocalSearchParams<{ mode?: string; returnTo?: string; skill?: string }>();
  const { language, guestProfile, setGuestProfile, setLocation } = useStore();
  const { updateProfile, token, user } = useAuth();
  const { c, radius, elevation } = useTheme();
  const t = language ? UI_STRINGS[language] : UI_STRINGS.hi;
  const effectiveLanguage = language ?? 'hi';

  const mode = params.mode === 'skill' ? 'skill' : 'basic';
  // which trade these answers are about, so experience is not later credited
  // to a different skill the beneficiary happens to mention
  const skillContext = typeof params.skill === 'string' ? params.skill : undefined;
  // Basic onboarding is deliberately short: name, age, qualification. The
  // work-specific questions happen only after the beneficiary has told a skill.
  const knownName = user?.name?.trim() || null;
  const basicSteps: { field: StepField; question: string }[] = knownName
    ? [
        { field: 'age', question: `${t.voiceProfileGreetingNamed.replace('{name}', knownName)} ${t.ageQuestion}` },
        { field: 'education', question: t.eduQuestion },
      ]
    : [
        { field: 'name', question: t.voiceProfileGreeting },
        { field: 'age', question: t.ageQuestion },
        { field: 'education', question: t.eduQuestion },
      ];
  const skillSteps: { field: StepField; question: string }[] = [
    { field: 'skillDetails', question: t.skillDetailQuestion },
    { field: 'experienceYears', question: t.experienceQuestion },
    { field: 'workPreference', question: t.workPreferenceQuestion },
  ];
  const STEPS = mode === 'skill' ? skillSteps : basicSteps;

  const eduLabel: Record<string, string> = {
    below_10th: t.eduBelow10th,
    '10th': t.edu10th,
    '12th': t.edu12th,
    iti_diploma: t.eduIti,
    undergrad: t.eduUndergrad,
    postgrad: t.eduPostgrad,
  };

  // "other" adds a follow-up asking WHICH place; "home" captures the device
  // location instead, so a beneficiary never has to name their own village.
  const [askingWhere, setAskingWhere] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [messages, setMessages] = useState<ProfileMessage[]>([]);
  const [collected, setCollected] = useState<Record<string, string | number>>({});
  const [typed, setTyped] = useState('');
  const [showType, setShowType] = useState(false);
  const [busy, setBusy] = useState(false);
  const [heardSpeech, setHeardSpeech] = useState(false);
  const voice = useVoiceInput(effectiveLanguage, transcript => {
    setTyped(transcript);
    setShowType(true);
    setHeardSpeech(true);
  }, busy);
  const transcribing = voice.transcribing || voice.starting;
  const micLevel = voice.level;
  const recState = { isRecording: voice.recording, durationMillis: voice.duration };
  const toggleRecord = voice.toggle;


  // types the latest agent bubble out word-by-word, paced to the spoken audio
  const [reveal, setReveal] = useState<{ id: number; fraction: number } | null>(null);
  const askedStepRef = useRef(-1);
  const idRef = useRef(0);

  const currentStep = STEPS[stepIndex];

  function addUser(text: string) {
    setMessages((m) => m.concat({ id: ++idRef.current, role: 'user', text }));
  }

  function addAssistant(text: string) {
    const id = ++idRef.current;
    setMessages((m) => m.concat({ id, role: 'assistant', text }));
    setReveal(null);
    speak(text, effectiveLanguage);
  }

  useEffect(() => () => stopSpeaking(), []);

  useEffect(() => {
    if (askedStepRef.current === stepIndex) return;
    askedStepRef.current = stepIndex;
    const timer = setTimeout(() => addAssistant(currentStep.question), 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex]);

  function labelFor(field: ProfileField, value: string | number): string {
    if (field === 'name') return t.nameConfirmedGreeting.replace('{name}', String(value));
    if (field === 'age') return `${value} ${t.yearsSuffix}`;
    if (field === 'experienceYears') {
      const yearLabel = effectiveLanguage === 'en' && value === 1 ? 'year' : t.yearsSuffix;
      return value === 0 ? t.experienceNone : `${value} ${yearLabel}`;
    }
    if (field === 'workPreference') return value === 'home' ? t.workNearHome : t.workElsewhere;
    return eduLabel[value as string] ?? String(value);
  }

  async function finish(data: Record<string, string | number>) {
    // record which trade the experience answer was about, so a later, different
    // skill triggers the question again instead of inheriting these years
    if (mode === 'skill' && skillContext) data = { ...data, experienceSkill: skillContext };
    if (token) {
      await updateProfile({ ...data, ...(mode === 'skill' && { onboarded: true }) } as Parameters<typeof updateProfile>[0]);
    } else {
      setGuestProfile({ ...(mode === 'skill' ? guestProfile ?? {} : {}), ...data } as Parameters<typeof setGuestProfile>[0]);
    }
    setTimeout(
      () =>
        router.replace({
          pathname: '/onboarding/done',
          params: params.returnTo ? { returnTo: params.returnTo } : undefined,
        }),
      700,
    );
  }

  async function submitAnswer(rawText: string) {
    const clean = rawText.trim();
    if (!clean) return;

    // free-text place name — kept as spoken, since it may be a village the
    // catalogue has no district row for
    if (askingWhere) {
      setBusy(true);
      setTyped('');
      setShowType(false);
      addUser(clean);
      try {
        addAssistant(t.locationSaved.replace('{place}', clean));
        await finish({ ...collected, preferredLocation: clean });
      } catch (e) {
        Alert.alert(t.tryAgain, e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(false);
      }
      return;
    }
    setBusy(true);
    setTyped('');
    setShowType(false);
    addUser(clean);
    try {
      if (currentStep.field === 'skillDetails') {
        setSkillDetails(clean);
        setCollected({ ...collected, skillDetails: clean });
        setTimeout(() => setStepIndex((i) => i + 1), 700);
        return;
      }

      const { value } = await extractProfileAnswer(currentStep.field, clean, effectiveLanguage);
      if (value === null) {
        addAssistant(t.profileAnswerUnclear);
        return;
      }

      const label = labelFor(currentStep.field, value);
      addAssistant(label);

      let nextCollected = { ...collected, [currentStep.field]: value };

      if (currentStep.field === 'workPreference') {
        if (value === 'other') {
          // ask which place, and finish on that answer instead of this one
          setCollected(nextCollected);
          setAskingWhere(true);
          setTimeout(() => addAssistant(t.whereQuestion), 700);
          return;
        }
        // "home": use the device location so they don't have to name it
        const loc = await resolveDeviceLocation();
        if (loc) {
          await setLocation(loc.state, loc.district);
          nextCollected = { ...nextCollected, ...(loc.state && { state: loc.state }), ...(loc.district && { district: loc.district }) };
          if (loc.district || loc.state) {
            addAssistant(t.locationSaved.replace('{place}', [loc.district, loc.state].filter(Boolean).join(', ')));
          }
        }
      }

      setCollected(nextCollected);

      if (stepIndex < STEPS.length - 1) {
        setTimeout(() => setStepIndex((i) => i + 1), 700);
      } else {
        await finish(nextCollected);
      }
    } catch (e) {
      Alert.alert(t.tryAgain, e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }


  const micState: MicState = busy || transcribing ? 'thinking' : recState.isRecording ? 'listening' : 'idle';
  const status = busy
    ? t.agentThinking
    : transcribing
      ? t.transcribing
      : recState.isRecording
        ? t.listening
        : t.voiceProfileIntro;

  return (
    <Screen edges={['top']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={[styles.iconBtn, { backgroundColor: c.surfaceAlt }]}>
            <Ionicons name="arrow-back" size={20} color={c.text} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <StepProgress step={stepIndex + 1} total={STEPS.length} />
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.thread}>
            {messages.map((m) => {
              const revealing = reveal?.id === m.id && m.role === 'assistant';
              const shownText = revealing ? revealPortion(m.text, reveal.fraction) : m.text;
              const waiting = revealing && reveal.fraction <= 0;
              return (
                <Animated.View
                  key={m.id}
                  entering={FadeInDown.duration(250)}
                  style={[
                    styles.bubble,
                    {
                      alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                      backgroundColor: m.role === 'user' ? c.surfaceAlt : c.primarySoft,
                      borderColor: m.role === 'user' ? c.border : c.primarySoft,
                    },
                  ]}>
                  {waiting ? (
                    <TypingDots color={c.primary} />
                  ) : (
                    <Txt variant="body">
                      {shownText}
                      {revealing && shownText.length < m.text.length ? ' ▍' : ''}
                    </Txt>
                  )}
                </Animated.View>
              );
            })}
            {busy && !reveal && (
              <Animated.View
                entering={FadeInDown.duration(250)}
                style={[
                  styles.bubble,
                  { alignSelf: 'flex-start', backgroundColor: c.primarySoft, borderColor: c.primarySoft },
                ]}>
                <TypingDots color={c.primary} />
              </Animated.View>
            )}
          </View>

          <View style={styles.micWrap}>
            {!!voice.error && <Txt accessibilityRole="alert" tone="danger">{voice.error}</Txt>}
            {recState.isRecording && <Button label="Stop recording" onPress={toggleRecord} />}
            <MicOrb state={micState} onPress={toggleRecord} level={micLevel} size={120} />
            <Txt variant="title" center style={{ marginTop: 8 }}>
              {status}
            </Txt>
          </View>

          {showType && (
            <Animated.View entering={FadeInDown.duration(250)} style={styles.typeBox}>
              {heardSpeech && <Txt tone="primary">I heard this. Review or edit your answer, then send.</Txt>}
              {heardSpeech && voice.needsReview && <Txt tone="danger">Low-confidence transcription. Please correct any mistakes before sending.</Txt>}
              <TextInput
                value={typed}
                onChangeText={setTyped}
                placeholder={t.profileTypePlaceholder}
                placeholderTextColor={c.textFaint}
                autoFocus
                style={[
                  styles.input,
                  { color: c.text, backgroundColor: c.surface, borderColor: c.border, borderRadius: radius.md },
                ]}
              />
              <Button
                label={t.send}
                icon="send"
                onPress={() => submitAnswer(typed)}
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
          <Button
            label={showType ? t.tapToSpeak : t.typeInstead}
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
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingTop: 4, paddingBottom: 10 },
  iconBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 20, paddingBottom: 24, gap: 20 },
  thread: { gap: 10 },
  bubble: { maxWidth: '88%', borderRadius: 16, borderWidth: 1, padding: 12 },
  micWrap: { alignItems: 'center', paddingTop: 8 },
  typeBox: { gap: 12 },
  input: { height: 54, borderWidth: 1, paddingHorizontal: 16, fontSize: 16 },
  bottom: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8 },
});
