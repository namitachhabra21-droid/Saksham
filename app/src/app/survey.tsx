import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, TextInput, View } from 'react-native';
import { getCareerCatalog, getCareerProfile, saveCareerProfile, type CareerCatalog, type CareerProfile, type SurveyOption } from '@/lib/career';
import { getLastResult } from '@/lib/session';
import { useStore } from '@/lib/store';
import { useTheme } from '@/theme';
import { Button, Card, Screen, Txt } from '@/ui';
import { speak, stopSpeaking } from '@/lib/speech';

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
  async function load() {
    setError(false);
    try {
      const data = await getCareerCatalog();
      setCatalog(data);
      if (!saved) {
        const context = `${result?.transcript ?? ''} ${result?.mappings.map(m => m.normalizedSkill).join(' ') ?? ''}`;
        setProfession(data.professions.find(p => new RegExp(p.pattern, 'i').test(context))?.id ?? '');
      }
    } catch { setError(true); }
  }
  useEffect(() => { load(); return () => stopSpeaking(); }, []);
  const selected = catalog?.professions.find(p => p.id === profession);
  const questions = selected && catalog ? [...catalog.common, ...selected.questions] : [];
  const current = questions[step - 1];
  const isLocation = !!catalog && step === questions.length + 1;
  const heading = step === 0 ? text('Tell us about your work', 'अपने काम के बारे में बताएँ') : isLocation ? text('Location and additional experience', 'स्थान और अतिरिक्त अनुभव') : current?.label[lang] ?? '';
  const help = step === 0 ? text('Choose your profession and specialization. You can correct our suggestion.', 'अपना पेशा और विशेषज्ञता चुनें। हमारे सुझाव को बदल सकते हैं।') : '';
  const complete = step === 0 ? !!selected && !!specialization : isLocation ? placeState.trim().length >= 2 && placeDistrict.trim().length >= 2 : !!current && !!answers[current.id];
  if (!language) return <Redirect href="/" />;
  if (!result) return <Redirect href="/main/speak" />;
  async function next() {
    if (!complete || saving) return;
    if (!isLocation) { setStep(v => v + 1); return; }
    setSaving(true);
    try {
      saveCareerProfile(result!.sessionId, { profession: profession as CareerProfile['profession'], specialization, answers, state: placeState.trim(), district: placeDistrict.trim(), notes: notes.trim() });
      await setLocation(placeState.trim(), placeDistrict.trim());
      router.push('/confirm');
    } finally { setSaving(false); }
  }
  function choices(options: SurveyOption[], value: string, change: (id: string) => void) {
    return <View style={{ gap: 10 }}>{options.map(option => <Pressable key={option.id} accessibilityRole="radio" accessibilityState={{ checked: value === option.id }} onPress={() => change(option.id)} style={{ padding: 16, borderRadius: 14, borderWidth: 2, borderColor: value === option.id ? c.primary : c.border, backgroundColor: value === option.id ? c.primarySoft : c.surface }}><Txt variant="bodyLg">{value === option.id ? '✓ ' : ''}{option.label[lang]}</Txt></Pressable>)}</View>;
  }
  const inputStyle = { borderWidth: 1, borderColor: c.border, borderRadius: 12, padding: 14, color: c.text, fontSize: 16, backgroundColor: c.surface };
  return <Screen edges={['top']}>
    <ScrollView key={step} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, gap: 18, paddingBottom: 40 }}>
      <Txt variant="overline" tone="dim">{text('YOUR PERSONAL WORK PROFILE', 'आपका व्यक्तिगत कार्य परिचय')}</Txt>
      <Txt variant="caption">{text('Step', 'चरण')} {step + 1} / {questions.length + 2}</Txt>
      <Txt variant="h2">{heading}</Txt>
      {!!help && <Txt variant="body" tone="dim">{help}</Txt>}
      <Button variant="secondary" size="md" icon="volume-high" label={text('Read this question', 'सवाल सुनें')} onPress={() => speak([heading, help, ...(step === 0 ? catalog?.professions.map(p => p.label[lang]) ?? [] : current?.options.map(o => o.label[lang]) ?? [])].join('. '), language)} />
      {!catalog && !error && <ActivityIndicator color={c.primary} />}
      {error && <Card><Txt>{text('Unable to load the survey. Check that the updated API is running.', 'सर्वे नहीं खुल पाया। जाँचें कि अपडेट किया गया API चल रहा है।')}</Txt><Button label={text('Retry', 'फिर कोशिश करें')} onPress={load} /></Card>}
      {catalog && step === 0 && <>
        {choices(catalog.professions.map(p => ({ id: p.id, label: p.label })), profession, id => { setProfession(id); setSpecialization(''); setAnswers({}); })}
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
      <Button variant="ghost" label={text('Back', 'पीछे')} onPress={() => step > 0 ? setStep(step - 1) : router.back()} />
    </ScrollView>
  </Screen>;
}
