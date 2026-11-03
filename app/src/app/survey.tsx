import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, TextInput, View } from 'react-native';
import { getCareerCatalog, getCareerProfile, saveCareerProfile, type CareerCatalog, type CareerProfile, type SurveyOption } from '@/lib/career';
import { getLastResult } from '@/lib/session';
import { useStore } from '@/lib/store';
import { useTheme } from '@/theme';
import { Button, Card, Screen, Txt } from '@/ui';
import { speak, stopSpeaking } from '@/lib/speech';

/** Hindi nukta letters (ड़ etc.) have two Unicode spellings; compare on one. */
const nfc = (value: string) => value.normalize('NFC');
const matches = (pattern: string | undefined, text: string) => !!pattern && new RegExp(nfc(pattern), 'i').test(nfc(text));

export default function SurveyScreen() {
  const { language, state, district, setLocation } = useStore();
  const { c } = useTheme();
  const result = getLastResult();
  const lang = language === 'hi' ? 'hi' : 'en';
  const text = (en: string, hi: string) => lang === 'hi' ? hi : en;
  const saved = getCareerProfile(result?.sessionId);
  const [catalog, setCatalog] = useState<CareerCatalog | null>(null);
  const [error, setError] = useState(false);
  const [profession, setProfession] = useState(saved?.profession ?? '');
  const [specialization, setSpecialization] = useState(saved?.specialization ?? '');
  const [answers, setAnswers] = useState<Record<string, string>>(saved?.answers ?? {});
  const [placeState, setPlaceState] = useState(saved?.state ?? state ?? '');
  const [placeDistrict, setPlaceDistrict] = useState(saved?.district ?? district ?? '');
  const [notes, setNotes] = useState(saved?.notes ?? '');
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [unmatched, setUnmatched] = useState(false);
  const spokenContext = `${result?.transcript ?? ''} ${result?.mappings.map(m => m.normalizedSkill).join(' ') ?? ''}`;

  async function load() {
    setError(false);
    try {
      const data = await getCareerCatalog();
      setCatalog(data);
      if (!saved) {
        // Suggest what they said; they can correct it.
        const guess = data.professions.find(p => matches(p.pattern, spokenContext));
        setProfession(guess?.id ?? '');
        setSpecialization(guess?.specializations.find(s => matches(s.pattern, result?.transcript ?? ''))?.id ?? '');
        setUnmatched(!guess && !!result?.transcript);
      }
    } catch { setError(true); }
  }
  useEffect(() => { load(); return () => stopSpeaking(); }, []);

  const selected = catalog?.professions.find(p => p.id === profession);
  const questions = selected && catalog ? [...catalog.common, ...selected.questions] : [];
  const current = questions[step - 1];
  const isLocation = !!catalog && !!selected && step === questions.length + 1;
  const heading = step === 0 ? text('Tell us about your work', 'अपने काम के बारे में बताएँ') : isLocation ? text('Location and additional experience', 'स्थान और अतिरिक्त अनुभव') : current?.label[lang] ?? '';
  const help = step === 0
    ? text('Choose your work and what you do most. We have suggested it from what you said; you can change it.', 'अपना काम और उसमें आप सबसे ज़्यादा क्या करते हैं, चुनें। आपकी बात से हमने सुझाव दिया है; आप बदल सकते हैं।')
    : isLocation ? text('Jobs and courses near you are shown first.', 'आपके पास की नौकरियाँ और कोर्स पहले दिखाए जाते हैं।')
      : current?.help?.[lang] ?? '';
  const complete = step === 0 ? !!selected && !!specialization : isLocation ? placeState.trim().length >= 2 && placeDistrict.trim().length >= 2 : !!current && !!answers[current.id];

  /** What the voice reads for this step: the question, why we ask, then the choices. */
  function prompt(): string {
    const options = step === 0
      ? (selected ? [text('Your specialization', 'आपकी विशेषज्ञता'), ...selected.specializations.map(s => s.label[lang])] : catalog?.professions.map(p => p.label[lang]) ?? [])
      : current?.options.map(o => o.label[lang]) ?? [];
    const heard = step === 0 && selected && !saved && matches(selected.pattern, spokenContext)
      ? text(`From what you said, your work is ${selected.label.en}.`, `आपकी बात से आपका काम है: ${selected.label.hi}।`) : '';
    return [heard, heading, help, ...options].filter(Boolean).join('. ');
  }
  // Voice-first: read every question aloud as it appears (and the specializations once a trade is picked).
  useEffect(() => {
    if (!catalog || !language) return;
    const timer = setTimeout(() => speak(prompt(), language), 300);
    return () => clearTimeout(timer);
  }, [catalog, step, profession]);

  if (!language) return <Redirect href="/" />;
  if (!result) return <Redirect href="/main/speak" />;

  async function next() {
    if (!complete || saving) return;
    if (!isLocation) { setStep(v => v + 1); return; }
    setSaving(true);
    stopSpeaking();
    try {
      const specLabel = selected?.specializations.find(s => s.id === specialization)?.label[lang] ?? '';
      const experience = catalog?.common.find(q => q.id === 'experience')?.options.find(o => o.id === answers.experience)?.label[lang] ?? '';
      saveCareerProfile(result!.sessionId, { profession: profession as CareerProfile['profession'], specialization, answers, state: placeState.trim(), district: placeDistrict.trim(), notes: notes.trim() }, [selected?.label[lang], specLabel, experience].filter(Boolean).join(', '));
      await setLocation(placeState.trim(), placeDistrict.trim());
      router.push('/confirm');
    } finally { setSaving(false); }
  }
  function back() {
    stopSpeaking();
    if (step > 0) setStep(step - 1); else router.back();
  }
  function choices(options: SurveyOption[], value: string, change: (id: string) => void) {
    return <View style={{ gap: 10 }}>{options.map(option => <Pressable key={option.id} accessibilityRole="radio" accessibilityState={{ checked: value === option.id }} onPress={() => change(option.id)} style={{ padding: 16, borderRadius: 14, borderWidth: 2, borderColor: value === option.id ? c.primary : c.border, backgroundColor: value === option.id ? c.primarySoft : c.surface }}><Txt variant="bodyLg">{value === option.id ? '✓ ' : ''}{option.label[lang]}</Txt></Pressable>)}</View>;
  }
  const inputStyle = { borderWidth: 1, borderColor: c.border, borderRadius: 12, padding: 14, color: c.text, fontSize: 16, backgroundColor: c.surface };
  const total = selected ? questions.length + 2 : 1;
  return <Screen edges={['top']}>
    <ScrollView key={step} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, gap: 18, paddingBottom: 40 }}>
      <Txt variant="overline" tone="dim">{text('YOUR PERSONAL WORK PROFILE', 'आपका व्यक्तिगत कार्य परिचय')}</Txt>
      {selected && <View style={{ height: 6, borderRadius: 3, backgroundColor: c.surfaceAlt, overflow: 'hidden' }}><View style={{ width: `${Math.round(((step + 1) / total) * 100)}%`, height: 6, backgroundColor: c.primary }} /></View>}
      {selected && <Txt variant="caption">{text('Step', 'चरण')} {step + 1} / {total}</Txt>}
      <Txt variant="h2">{heading}</Txt>
      {!!help && <Card style={{ flexDirection: 'row', gap: 10 }}><Txt variant="body" tone="dim" style={{ flex: 1 }}>💡 {help}</Txt></Card>}
      <Button variant="secondary" size="md" icon="volume-high" label={text('Read this question again', 'सवाल फिर से सुनें')} onPress={() => speak(prompt(), language)} />
      {!catalog && !error && <ActivityIndicator color={c.primary} />}
      {error && <Card><Txt>{text('Unable to load the questions. Please check your connection and try again.', 'सवाल नहीं खुल पाए। इंटरनेट जाँचें और फिर कोशिश करें।')}</Txt><Button label={text('Retry', 'फिर कोशिश करें')} onPress={load} /></Card>}
      {catalog && step === 0 && <>
        {unmatched && !profession && <Txt tone="dim">{text('Detailed guidance is available for these trades. Choose the one closest to your work.', 'इन कामों के लिए विस्तृत मार्गदर्शन उपलब्ध है। अपने काम से सबसे मिलता हुआ चुनें।')}</Txt>}
        {choices(catalog.professions.map(p => ({ id: p.id, label: p.label })), profession, id => { if (id !== profession) { setProfession(id); setSpecialization(''); setAnswers({}); } })}
        {selected && <><Txt variant="h2">{text('Your specialization', 'आपकी विशेषज्ञता')}</Txt>{choices(selected.specializations, specialization, setSpecialization)}</>}
      </>}
      {current && !isLocation && choices(current.options, answers[current.id], id => setAnswers(previous => ({ ...previous, [current.id]: id })))}
      {isLocation && <>
        <Txt>{text('State', 'राज्य')} *</Txt><TextInput accessibilityLabel={text('State', 'राज्य')} value={placeState} onChangeText={setPlaceState} maxLength={80} style={inputStyle} />
        <Txt>{text('District / city', 'ज़िला / शहर')} *</Txt><TextInput accessibilityLabel={text('District / city', 'ज़िला / शहर')} value={placeDistrict} onChangeText={setPlaceDistrict} maxLength={80} style={inputStyle} />
        <Txt>{text('Other experience, achievements, accessibility needs or goals (optional)', 'अन्य अनुभव, उपलब्धियाँ, सुविधा की ज़रूरत या लक्ष्य (वैकल्पिक)')}</Txt><TextInput accessibilityLabel={text('Additional information', 'अतिरिक्त जानकारी')} value={notes} onChangeText={setNotes} maxLength={1000} multiline style={[inputStyle, { minHeight: 110, textAlignVertical: 'top' }]} />
        <Txt variant="caption" tone="dim">{text('Your answers stay with this session and are sent to prepare your plan.', 'आपके उत्तर इस सत्र में रहेंगे और आपकी योजना बनाने के लिए भेजे जाएँगे।')}</Txt>
      </>}
      <Button label={isLocation ? text('Choose my goal', 'अपना लक्ष्य चुनें') : text('Continue', 'आगे बढ़ें')} disabled={!complete || saving} loading={saving} onPress={next} />
      <Button variant="ghost" label={text('Back', 'पीछे')} onPress={back} />
    </ScrollView>
  </Screen>;
}
