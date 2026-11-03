import { Redirect, router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import {
  applyToJob,
  getMyApplications,
  setRecommendationStatus,
  type NsqfMapping,
  type CourseRecommendation,
  type JobMatch,
} from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { UI_STRINGS } from '@/constants/languages';
import { getIntent, getLastResult } from '@/lib/session';
import { speak, stopSpeaking } from '@/lib/speech';
import { useStore } from '@/lib/store';
import { useTheme } from '@/theme';
import { Button, Card, Chip, Meter, Screen, Txt } from '@/ui';

const PAGE_SIZE = 5;

export default function ResultsScreen() {
  const { language } = useStore();
  const { c, radius } = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const [jobsOffset, setJobsOffset] = useState(0);
  const result = getLastResult();
  const intent = getIntent();
  const { token } = useAuth();
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // what they have already applied to, so the button reads "Applied" on return
  useEffect(() => {
    if (!token) return;
    getMyApplications(token).then((rows) => setAppliedIds(new Set(rows.map((r) => r.jobPostingId))));
  }, [token]);

  async function applyTo(j: JobMatch) {
    if (j.source === "NCS") {
      if (j.applyUrl) await Linking.openURL(j.applyUrl).catch(() => Alert.alert(t.tryAgain));
      return;
    }
    // Applying needs an account: a programme officer has to be able to call
    // this person back, and a guest session carries no name or number. Send
    // them to sign in and bring them straight back here.
    if (!token) {
      stopSpeaking();
      if (Platform.OS === 'web') { router.push('/auth?returnTo=/results'); return; }
      Alert.alert(t.loginToApply, t.loginToApplyBody, [
        { text: t.cancel, style: 'cancel' },
        { text: t.loginBtn, onPress: () => router.push('/auth?returnTo=/results') },
      ]);
      return;
    }
    setApplyingId(j.jobPostingId);
    try {
      await applyToJob(token, j.jobPostingId, { qpCode: j.nsqfQpCode, title: j.nsqfTitle });
      setAppliedIds((prev) => new Set(prev).add(j.jobPostingId));
      setToast(t.applied);
    } catch (e) {
      Alert.alert(t.tryAgain, e instanceof Error ? e.message : String(e));
    } finally {
      setApplyingId(null);
    }
  }
  const [jobsPage, setJobsPage] = useState(0);
  const [recsPage, setRecsPage] = useState(0);
  const t = language ? UI_STRINGS[language] : UI_STRINGS.hi;

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(timer);
  }, [toast]);

  const sectionTitle =
    intent === 'jobs'
      ? t.jobsTitle
      : intent === 'certificate'
        ? t.certTitle
        : intent === 'guidance'
          ? t.guidanceTitle
          : t.recommended;

  // the admin funnel is SUGGESTED -> VIEWED -> ... ; reaching this screen is
  // what "viewed" means, now that courses carry no call-to-action of their own
  useEffect(() => {
    for (const r of result?.recommendations ?? []) {
      if (r.recommendationId) setRecommendationStatus(r.recommendationId, 'VIEWED').catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (result?.reply.text && language) {
      const timer = setTimeout(() => speak(result.reply.text, language), 350);
      return () => {
        clearTimeout(timer);
        stopSpeaking();
      };
    }
  }, []);

  if (!language) return <Redirect href="/" />;
  if (!result) return <Redirect href="/main/speak" />;

  // multiple spoken phrases can map to the same NSQF qualification (e.g.
  // "tailoring" and "embroidery" both point at the Self Employed Tailor QP) —
  // dedupe so it isn't shown twice.
  const known = result.mappings
    .filter((m) => m.title)
    .filter((m, i, arr) => arr.findIndex((x) => x.qpCode === m.qpCode) === i);
  const jobs = result.jobs ?? [];
  const visibleJobs = jobs.slice(jobsPage * PAGE_SIZE, jobsPage * PAGE_SIZE + PAGE_SIZE);
  const visibleRecommendations = result.recommendations.slice(recsPage * PAGE_SIZE, recsPage * PAGE_SIZE + PAGE_SIZE);

  return (
    <Screen edges={['top']}>
      {/* header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/main/speak'))}
          hitSlop={12}
          style={[styles.iconBtn, { backgroundColor: c.surfaceAlt }]}>
          <Ionicons name="arrow-back" size={20} color={c.text} />
        </Pressable>
        <Pressable
          onPress={() => result.reply.text && speak(result.reply.text, language)}
          hitSlop={12}
          style={[styles.iconBtn, { backgroundColor: c.primarySoft }]}>
          <Ionicons name="volume-high" size={20} color={c.primary} />
        </Pressable>
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* transcript */}
        <Card index={0}>
          <Txt variant="overline" tone="faint">
            {t.yourSkill}
          </Txt>
          <View style={styles.quoteRow}>
            <View style={[styles.quoteBar, { backgroundColor: c.primary }]} />
            <Txt variant="bodyLg" style={{ flex: 1, fontStyle: 'italic' }}>
              {result.transcript}
            </Txt>
          </View>
        </Card>

        {result.plan && <Card index={1} style={{ gap: 14 }}>
          <Txt variant="h2">{language === 'hi' ? 'आपकी व्यक्तिगत कार्ययोजना' : 'Your personalized roadmap'}</Txt>
          <Txt variant="bodyLg">{result.plan.summary}</Txt>
          <Txt variant="caption" tone="dim">{language === 'hi' ? 'यह मार्गदर्शन आपके सर्वे के उत्तरों और तय नियमों पर आधारित है। नौकरी या कोर्स की पात्रता की पुष्टि संबंधित संस्था से करें।' : 'This guidance uses your survey answers and predefined rules. Confirm job or course eligibility with the employer or training provider.'}</Txt>
          {result.plan.profile.notes ? <Txt tone="dim">{language === 'hi' ? 'आपकी अतिरिक्त जानकारी: ' : 'Your additional information: '}{result.plan.profile.notes}</Txt> : null}
          {!!result.personalizationNotice && <Txt tone="dim">{result.personalizationNotice}</Txt>}
          {result.plan.gaps.map((gap, i) => <Txt key={i} variant="body" tone="dim">• {gap}</Txt>)}
          {result.plan.steps.map((step, i) => <View key={i} style={{ gap: 5 }}><Txt variant="h2">{step.title}</Txt><Txt variant="body" tone="dim">{step.detail}</Txt></View>)}
          <Txt variant="body">{result.plan.searchHint}</Txt>
          {intent === 'jobs' && <Button label={language === 'hi' ? 'सक्षम में नौकरियाँ देखें' : 'View matching jobs in Saksham'} icon="briefcase-outline" onPress={() => scrollRef.current?.scrollTo({ y: jobsOffset, animated: true })} />}
          {intent === 'jobs' && <Txt variant="caption" tone="dim">{language === 'hi' ? 'नीचे सक्षम के जॉब कार्ड हैं। NCS एक वैकल्पिक बाहरी वेबसाइट है; उसे खोलने से आवेदन जमा नहीं होता।' : 'Saksham job cards appear below. NCS is an optional external website; opening it does not submit an application.'}</Txt>}
          <Button label={intent === 'jobs' ? (language === 'hi' ? 'वैकल्पिक: NCS पर खोजें (बाहरी)' : 'Optional: search NCS (external)') : result.plan.action.label} variant={intent === 'jobs' ? 'secondary' : 'primary'} icon="open-outline" onPress={() => Linking.openURL(result.plan!.action.url).catch(() => Alert.alert(t.tryAgain))} />
          <Button variant="secondary" size="md" label={language === 'hi' ? 'अपने उत्तर या लक्ष्य बदलें' : 'Change your answers or goal'} onPress={() => { stopSpeaking(); router.push('/survey'); }} />
        </Card>}

        {intent === 'jobs' && <Button label={language === 'hi' ? 'मेरे आवेदन और स्थिति देखें' : 'View my applications and status'} variant="secondary" onPress={() => { stopSpeaking(); router.push('/applications'); }} />}
        {/* nsqf */}
        {known.some((m) => m.fit) && (
          <View style={styles.sectionHead}>
            <Ionicons name="layers" size={18} color={c.primary} />
            <Txt variant="h2">{language === 'hi' ? 'आपके लिए NSQF योग्यताएँ' : 'NSQF qualifications for you'}</Txt>
          </View>
        )}
        {known.length > 0 ? (
          known.map((m, i) => (
            <NsqfCard key={m.qpCode} m={m} label={t.nsqfMatch} matchLabel={t.matchLabel} index={i + 1} best={i === 0} hindi={language === 'hi'} />
          ))
        ) : (
          <Card index={1} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Ionicons name="help-circle-outline" size={26} color={c.warn} />
            <Txt variant="body" tone="dim" style={{ flex: 1 }}>
              {t.noMatch}
            </Txt>
          </Card>
        )}

        {/* jobs — real vacancies matched to the spoken skill */}
        {intent === 'jobs' && jobs.length > 0 && (
          <View onLayout={event => setJobsOffset(event.nativeEvent.layout.y)} style={{ gap: 12, marginTop: 4 }}>
            <View style={styles.sectionHead}>
              <Ionicons name="briefcase" size={18} color={c.primary} />
              <Txt variant="h2">{t.jobsAvailable}</Txt>
              <View style={[styles.countPill, { backgroundColor: c.primarySoft }]}>
                <Txt variant="caption" style={{ color: c.primary }}>
                  {jobs.length}
                </Txt>
              </View>
            </View>
            {visibleJobs.map((j, i) => (
              <JobCard
                key={j.jobPostingId}
                j={j}
                hindi={language === "hi"}
                t={t}
                index={i + 2}
                applied={appliedIds.has(j.jobPostingId)}
                applying={applyingId === j.jobPostingId}
                onApply={() => applyTo(j)}
              />
            ))}
            <Pager total={jobs.length} page={jobsPage} onPage={setJobsPage} />
          </View>
        )}

        {intent === 'jobs' && jobs.length === 0 && (
          <View onLayout={event => setJobsOffset(event.nativeEvent.layout.y)}><Card index={2} style={{ gap: 12 }}>
            <View style={styles.sectionHead}>
              <Ionicons name="briefcase" size={18} color={c.primary} />
              <Txt variant="h2">{t.jobsAvailable}</Txt>
            </View>
            <Txt variant="body" tone="dim">
              {t.noResults}
            </Txt>
            <Button
              label={t.askAgain}
              variant="secondary"
              size="md"
              icon="mic"
              onPress={() => router.replace('/main/speak')}
            />
          </Card></View>
        )}

        {/* recommendations */}
        {intent !== 'jobs' && result.recommendations.length > 0 && (
          <View style={{ gap: 12, marginTop: 4 }}>
            <View style={styles.sectionHead}>
              <Ionicons name="school" size={18} color={c.primary} />
              <Txt variant="h2">{sectionTitle}</Txt>
              <View style={[styles.countPill, { backgroundColor: c.primarySoft }]}>
                <Txt variant="caption" style={{ color: c.primary }}>
                  {result.recommendations.length}
                </Txt>
              </View>
            </View>
            {visibleRecommendations.map((r, i) => (
              <CourseCard key={r.pmajayCourseId} r={r} t={t} index={i + 2} best={recsPage === 0 && i === 0} />
            ))}
            <Pager total={result.recommendations.length} page={recsPage} onPage={setRecsPage} />
          </View>
        )}

        {intent !== 'jobs' && result.recommendations.length === 0 && result.plan && <Card><Txt tone="dim">{language === 'hi' ? 'कैटलॉग में आपकी विशेषज्ञता का उपयुक्त कोर्स नहीं मिला। ऊपर दिए प्रशिक्षण पोर्टल पर केंद्र और बैच की पुष्टि करें।' : 'No suitable catalogue course was found for your specialization. Use the training portal above to confirm providers and batches.'}</Txt></Card>}
        <View style={{ height: 8 }} />
      </ScrollView>

      {/* sticky footer */}
      <View style={[styles.footer, { backgroundColor: c.bg, borderTopColor: c.border }]}>
        <View style={{ flex: 1 }}>
          <Button
            label={t.speakAgain}
            variant="secondary"
            size="md"
            icon="refresh"
            onPress={() => result.reply.text && speak(result.reply.text, language)}
          />
        </View>
        <View style={{ flex: 1.2 }}>
          <Button label={t.askAgain} size="md" icon="mic" onPress={() => router.replace('/main/speak')} />
        </View>
      </View>
      {toast && (
        <Animated.View
          entering={FadeInDown.duration(180)}
          style={[styles.toast, { backgroundColor: c.text, shadowColor: '#16204A' }]}>
          <Ionicons name="checkmark-circle" size={18} color={c.success} />
          <Txt variant="body" style={{ color: c.bg }}>
            {toast}
          </Txt>
        </Animated.View>
      )}
    </Screen>
  );
}

function Pager({ total, page, onPage }: { total: number; page: number; onPage: (page: number) => void }) {
  const { c } = useTheme();
  const totalPages = Math.ceil(total / PAGE_SIZE);
  if (totalPages <= 1) return null;
  return (
    <View style={styles.pager}>
      <Pressable
        disabled={page === 0}
        onPress={() => onPage(Math.max(0, page - 1))}
        style={[styles.pageBtn, { backgroundColor: c.surfaceAlt, opacity: page === 0 ? 0.45 : 1 }]}>
        <Ionicons name="chevron-back" size={18} color={c.text} />
      </Pressable>
      <Txt variant="caption" tone="dim">
        {page + 1} / {totalPages}
      </Txt>
      <Pressable
        disabled={page >= totalPages - 1}
        onPress={() => onPage(Math.min(totalPages - 1, page + 1))}
        style={[styles.pageBtn, { backgroundColor: c.surfaceAlt, opacity: page >= totalPages - 1 ? 0.45 : 1 }]}>
        <Ionicons name="chevron-forward" size={18} color={c.text} />
      </Pressable>
    </View>
  );
}

const FIT_LABEL = {
  recommended: { en: 'Best fit for you today', hi: 'आज आपके लिए सबसे सही' },
  alternative: { en: 'Same-level option', hi: 'इसी स्तर का विकल्प' },
  next: { en: 'Your next step', hi: 'आपका अगला कदम' },
} as const;

function NsqfCard({
  m,
  label,
  matchLabel,
  index,
  best,
  hindi,
}: {
  m: NsqfMapping;
  label: string;
  matchLabel: string;
  index: number;
  best?: boolean;
  hindi?: boolean;
}) {
  const { c, radius } = useTheme();
  const fit = m.fit ? FIT_LABEL[m.fit][hindi ? 'hi' : 'en'] : null;
  return (
    <Card index={index} tint={m.fit ? (m.fit === 'recommended' ? 'primary' : undefined) : best ? 'primary' : undefined} style={{ gap: 10 }}>
      <View style={styles.sectionHead}>
        <Txt variant="overline" tone="faint" style={{ flex: 1 }}>
          {fit ?? label}
        </Txt>
        {(m.fit ? m.fit === 'recommended' : best) && <Chip label={hindi ? 'सबसे सही' : 'Best match'} tone="primary" icon="star" />}
        {m.fit === 'next' && <Chip label={hindi ? 'अगला कदम' : 'Next step'} tone="accent" icon="trending-up" />}
      </View>
      <View style={styles.nsqfRow}>
        <View style={{ flex: 1, gap: 8 }}>
          <Txt variant="h2">{hindi && m.titleHi ? m.titleHi : m.title}</Txt>
          {hindi && m.titleHi && <Txt variant="caption" tone="faint">{m.title}</Txt>}
          <View style={styles.chipRow}>
            {m.nsqfLevel != null && <Chip label={`NSQF ${m.nsqfLevel}`} tone="accent" icon="layers" />}
            {m.trainingHours != null && <Chip label={hindi ? `${m.trainingHours} घंटे` : `${m.trainingHours} hours`} icon="time-outline" />}
            {m.sector && <Chip label={m.sector} />}
            {m.qpCode && <Chip label={m.qpCode} tone="primary" icon="pricetag" />}
          </View>
        </View>
        {!m.fit && <Meter value={m.confidence} label={matchLabel} />}
      </View>
      {!!m.reason && (
        <View style={[styles.why, { backgroundColor: c.surfaceAlt, borderRadius: radius.md }]}>
          <Ionicons name="bulb-outline" size={14} color={c.accent} />
          <Txt variant="body" tone="dim" style={{ flex: 1 }}>{m.reason}</Txt>
        </View>
      )}
    </Card>
  );
}


function JobCard({
  j,
  hindi,
  t,
  index,
  applied,
  applying,
  onApply,
}: {
  j: JobMatch;
  hindi: boolean;
  t: (typeof UI_STRINGS)['hi'];
  index: number;
  applied: boolean;
  applying: boolean;
  onApply: () => void;
}) {
  const { c, radius } = useTheme();
  const wage =
    j.wageMin && j.wageMax ? `₹${j.wageMin.toLocaleString('en-IN')} – ₹${j.wageMax.toLocaleString('en-IN')}` : null;
  return (
    <Card index={index} style={{ gap: 10 }}>
      <View style={styles.progHead}>
        <View style={{ flex: 1, gap: 4 }}>
          <Txt variant="h2" style={{ lineHeight: 24 }}>
            {hindi ? j.titleHindi ?? j.title : j.title}
          </Txt>
          <Txt variant="body" tone="dim">
            {j.employerName}
          </Txt>
        </View>
        <Meter value={j.score} size={44} />
      </View>

      <View style={styles.jobMetaRow}>
        <View style={styles.jobMeta}>
          <Ionicons name="location-outline" size={14} color={c.textFaint} />
          <Txt variant="caption" tone="dim">
            {[j.district, j.state].filter(Boolean).join(', ') || 'Location not listed'}
          </Txt>
        </View>
        {!!wage && (
          <View style={styles.jobMeta}>
            <Ionicons name="cash-outline" size={14} color={c.textFaint} />
            <Txt variant="caption" tone="dim">
              {wage} {t.jobPerMonth}
            </Txt>
          </View>
        )}
        {!!j.positions && (
          <View style={styles.jobMeta}>
            <Ionicons name="people-outline" size={14} color={c.textFaint} />
            <Txt variant="caption" tone="dim">
              {j.positions} {t.jobPositions}
            </Txt>
          </View>
        )}
      </View>

      {j.needsUpskilling && (
        <View style={[styles.why, { backgroundColor: c.surfaceAlt, borderRadius: radius.md }]}>
          <Ionicons name="school-outline" size={14} color={c.accent} />
          <Txt variant="caption" tone="dim" style={{ flex: 1 }}>
            {t.jobNeedsTraining}{j.nsqfTitle ? ` — ${j.nsqfTitle}` : ''}
          </Txt>
        </View>
      )}

      {/* provenance — a SAMPLE row is demonstration data, never a live vacancy */}
      {j.source === 'SAMPLE' && (
        <View style={styles.jobMeta}>
          <Ionicons name="information-circle-outline" size={13} color={c.textFaint} />
          <Txt variant="caption" tone="faint">
            {t.jobSample}
          </Txt>
        </View>
      )}

      {j.source === 'NCS' && (
        <View style={styles.jobMeta}>
          <Ionicons name="open-outline" size={13} color={c.textFaint} />
          <Txt variant="caption" tone="faint">
            {t.jobPortalSearch}
          </Txt>
        </View>
      )}

      <Button
        label={j.source === "NCS" ? (hindi ? "पोर्टल पर नौकरी खोजें" : "Search jobs on portal") : applied ? t.applied : applying ? t.applying : t.apply}
        variant={applied ? 'secondary' : 'success'}
        size="md"
        icon={applied ? 'checkmark' : 'arrow-forward'}
        loading={applying}
        disabled={applied || applying}
        onPress={onApply}
      />

      {!!j.contactPhone && (
        <Pressable onPress={() => Linking.openURL(`tel:${j.contactPhone}`)} style={styles.jobMeta}>
          <Ionicons name="call-outline" size={14} color={c.primary} />
          <Txt variant="caption" tone="primary">
            {j.contactPhone}
          </Txt>
        </Pressable>
      )}
    </Card>
  );
}

function CourseCard({
  r,
  t,
  index,
  best,
}: {
  r: CourseRecommendation;
  t: (typeof UI_STRINGS)['hi'];
  index: number;
  best?: boolean;
}) {
  const { c, radius } = useTheme();
  const locationLabel = courseLocationLabel(r.courseLevel);
  return (
    <Card index={index} tint={best ? 'violet' : undefined} style={{ gap: 12 }}>
      <View style={styles.progHead}>
        <View style={[styles.schemeBadge, { backgroundColor: best ? c.violet : c.text, borderRadius: radius.sm }]}>
          <Txt variant="caption" style={{ color: '#fff', fontWeight: '600' }}>
            PM-AJAY · {r.subCourseCode}
          </Txt>
        </View>
        <Meter value={r.score} size={44} />
      </View>

      <Txt variant="h2" style={{ lineHeight: 26 }}>
        {r.subCourseName}
      </Txt>

      {!!r.rationale && (
        <View style={[styles.why, { backgroundColor: c.surfaceAlt, borderRadius: radius.md }]}>
          <Ionicons name="sparkles" size={14} color={c.accent} />
          <Txt variant="body" tone="dim" style={{ flex: 1 }}>
            {r.rationale}
          </Txt>
        </View>
      )}

      <View style={styles.jobMeta}>
        <Ionicons name="location-outline" size={14} color={c.textFaint} />
        <Txt variant="caption" tone="dim">
          {locationLabel}
        </Txt>
      </View>

      <View style={styles.chipRow}>
        <Chip label={r.sector} />
        {r.nsqfLevel != null && <Chip label={`NSQF ${r.nsqfLevel}`} icon="layers" tone="primary" />}
        <Chip label={r.courseLevel} icon="ribbon" />
      </View>

      {!!r.nsqfTitle && (
        <Txt variant="caption" tone="faint">
          {r.nsqfQpCode} · {r.nsqfTitle}
        </Txt>
      )}
    </Card>
  );
}

function courseLocationLabel(courseLevel: string): string {
  const state = courseLevel.match(/\[([^\]]+)\]/)?.[1]?.trim();
  if (state) return `State: ${state}`;
  if (/national/i.test(courseLevel)) return 'All India';
  return courseLevel;
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 10,
  },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 20, paddingBottom: 24, gap: 12 },
  quoteRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  quoteBar: { width: 4, borderRadius: 2 },
  nsqfRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  jobMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  jobMeta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  countPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  progHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  schemeBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  why: { flexDirection: 'row', gap: 8, padding: 12, alignItems: 'flex-start' },
  pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, paddingVertical: 4 },
  pageBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    borderTopWidth: 1,
  },
  toast: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 76,
    minHeight: 48,
    borderRadius: 8,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
});
