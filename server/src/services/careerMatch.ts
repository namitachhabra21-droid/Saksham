import { prisma } from '../lib/prisma.js';
import { careerCatalog, type CareerIntent, type CareerProfile } from './career.js';
import { profileRelevance } from './careerRanking.js';
import {
  OUT_OF_SCOPE, PROFESSION_COURSE_TERMS, PROFESSION_TOKENS, SPECIALIZATION_TERMS,
  LADDERS, decideStep, pickQualifications, specializationToken, type FocusProfession, type QualificationPick,
} from './careerQualifications.js';
import type { CourseRecommendation } from './recommend.js';
import type { JobMatch } from './jobs.js';
import type { MappingResult } from './nsqf.js';

/**
 * Survey-profile matching for the focus trades (tailoring, beauty, electrical).
 * Every result is traceable to an answer: the NSQF picks come from the ladder
 * in careerQualifications.ts, courses are the PM-AJAY courses that train for
 * those picks (or name the specialization), and jobs are filtered by
 * specialization, level, work mode and hours.
 */

export type ProfileMapping = MappingResult & {
  titleHi?: string;
  /** what this qualification means for the chosen goal, e.g. "Train for this next" (localized) */
  goalLabel?: string;
  /** the one qualification to act on for this goal */
  primary?: boolean;
};

const CONFIDENCE = { recommended: 0.92, alternative: 0.8, next: 0.65 } as const;

/**
 * The same qualifications mean different things per goal. For a job, the
 * person's level today is what employers look for. For training, a beginner
 * trains for that level first, but someone already working at it trains for
 * the NEXT step (upskilling) — and can get their current level certified.
 */
export function isUpskilling(profile: CareerProfile, intent: CareerIntent, picks: QualificationPick[]): boolean {
  return intent === 'training' && decideStep(profile).step >= 1 && picks.some(p => p.fit === 'next');
}
const GOAL_LABELS: Record<'jobs' | 'training' | 'upskill' | 'certificate', Record<QualificationPick['fit'], [string, string]>> = {
  jobs: {
    recommended: ['Your level today — employers look for this', 'आज आपका स्तर — नियोक्ता यही देखते हैं'],
    alternative: ['Also matches your level', 'आपके स्तर से यह भी मेल खाता है'],
    next: ['Reachable with training — for higher-paid jobs', 'प्रशिक्षण से संभव — ज़्यादा कमाई वाली नौकरियों के लिए'],
  },
  training: {
    recommended: ['Train for this first', 'पहले इसका प्रशिक्षण लें'],
    alternative: ['Or train for this (same level)', 'या इसका प्रशिक्षण (इसी स्तर का)'],
    next: ['After that', 'उसके बाद'],
  },
  upskill: {
    next: ['Train for this next — your upskilling goal', 'अब इसका प्रशिक्षण लें — आगे बढ़ने का लक्ष्य'],
    recommended: ['Your current level — you can get this certified', 'आपका मौजूदा स्तर — इसका प्रमाणपत्र ले सकते हैं'],
    alternative: ['Also at your current level', 'आपके मौजूदा स्तर का दूसरा विकल्प'],
  },
  certificate: {
    recommended: ['Get certified in this (RPL assessment)', 'इसका प्रमाणपत्र लें (RPL मूल्यांकन)'],
    alternative: ['Or get certified in this', 'या इसका प्रमाणपत्र लें'],
    next: ['Later, after more training', 'बाद में, और प्रशिक्षण के बाद'],
  },
};

export async function profileMappings(profile: CareerProfile, language: string, intent: CareerIntent = 'guidance'): Promise<{ picks: QualificationPick[]; mappings: ProfileMapping[] }> {
  const picks = pickQualifications(profile, language, careerCatalog);
  if (picks.length === 0) return { picks, mappings: [] };
  const trade = profile.profession as FocusProfession;
  const [rows, verified] = await Promise.all([
    prisma.nsqfQualification.findMany({ where: { qpCode: { in: picks.map(p => p.qpCode) } } }),
    prisma.pmajayCourse.findFirst({ where: { keywords: { hasSome: PROFESSION_TOKENS[trade] } }, select: { subCourseCode: true, subCourseName: true, sector: true } }),
  ]);
  const token = specializationToken(profile);
  const upskill = isUpskilling(profile, intent, picks);
  const goal = upskill ? 'upskill' : intent === 'jobs' || intent === 'certificate' ? intent : 'training';
  const primaryFit: QualificationPick['fit'] = upskill ? 'next' : 'recommended';
  const ordered = upskill ? [...picks].sort((a, b) => Number(b.fit === 'next') - Number(a.fit === 'next')) : picks;
  const mappings = ordered.map((pick): ProfileMapping => {
    const row = rows.find(r => r.qpCode === pick.qpCode);
    return {
      rawSkillText: `${profile.profession}/${profile.specialization}`,
      normalizedSkill: token,
      nsqfQualificationId: row?.id ?? null,
      qpCode: pick.qpCode,
      title: pick.title, // the NQR title, with NQR's ALL-CAPS ones re-cased for reading aloud
      titleHi: pick.titleHi,
      sector: row?.sector ?? null,
      nsqfLevel: row?.nsqfLevel ?? pick.level,
      confidence: CONFIDENCE[pick.fit],
      method: 'profile',
      pmajayVerified: Boolean(verified),
      pmajayCourse: verified,
      nsqfExpired: Boolean(row?.validTill && row.validTill < new Date()),
      proposedOccupations: row?.proposedOccupations ?? [],
      fit: pick.fit,
      reason: pick.reason,
      trainingHours: pick.hours,
      trainingWeeks: pick.weeks,
      goalLabel: GOAL_LABELS[goal][pick.fit][language === 'hi' ? 1 : 0],
      primary: pick.fit === primaryFit,
    };
  });
  return { picks, mappings };
}

function courseState(courseLevel: string): string | null {
  return courseLevel.match(/\[([^\]]+)\]/)?.[1]?.trim().toLowerCase().replace(/[^a-z]/g, '') ?? null;
}

const COURSE_WEIGHTS: Record<CareerIntent, Record<QualificationPick['fit'], number>> = {
  training: { recommended: 0.5, alternative: 0.35, next: 0.4 },
  guidance: { recommended: 0.5, alternative: 0.35, next: 0.4 },
  certificate: { recommended: 0.6, alternative: 0.4, next: 0.2 },
  jobs: { recommended: 0.5, alternative: 0.35, next: 0.3 },
};

export async function recommendCoursesForProfile(input: {
  profile: CareerProfile; picks: QualificationPick[]; intent: CareerIntent; state?: string | null; language: string; limit?: number;
}): Promise<CourseRecommendation[]> {
  const { profile, picks, intent, state, language, limit = 8 } = input;
  const trade = profile.profession as FocusProfession;
  const hi = language === 'hi';
  const specTerms = SPECIALIZATION_TERMS[trade][profile.specialization];
  const specLabel = careerCatalog.professions.find(p => p.id === trade)?.specializations.find(s => s.id === profile.specialization)?.label[hi ? 'hi' : 'en'] ?? '';
  const myState = state?.toLowerCase().replace(/[^a-z]/g, '') || null;
  const candidates = await prisma.pmajayCourse.findMany({
    where: { OR: [{ keywords: { hasSome: PROFESSION_TOKENS[trade] } }, ...PROFESSION_COURSE_TERMS[trade].map(t => ({ subCourseName: { contains: t, mode: 'insensitive' as const } }))] },
    take: 500,
  });
  const recommended = picks.find(p => p.fit === 'recommended')!;
  // upskilling: courses for the next step come first
  const weights = isUpskilling(profile, intent, picks) ? { recommended: 0.4, alternative: 0.3, next: 0.55 } : COURSE_WEIGHTS[intent];
  const seen = new Set<string>();
  const scored = candidates.flatMap(course => {
    const name = course.subCourseName.trim();
    if (OUT_OF_SCOPE.test(name)) return [];
    const scoped = courseState(course.courseLevel);
    const locationRank = scoped ? (myState && myState.includes(scoped) ? 2 : -1) : 1;
    if (locationRank < 0) return []; // a course only run in another state
    const pick = picks.find(p => p.course.test(name));
    const specific = specTerms?.test(name) ?? false;
    if (!pick && !specific) return [];
    const via = pick ?? recommended;
    // the goal decides the order among qualification courses; specialization words only lift the rest
    let score = (pick ? weights[pick.fit] : 0) + (specific ? (pick ? 0.05 : 0.25) : 0) + (locationRank === 2 ? 0.15 : 0.1);
    score = Math.min(1, score);
    const rationale = pick?.fit === 'recommended'
      ? (hi ? `आपकी सुझाई गई योग्यता ${pick.titleHi} (NSQF ${pick.level}) के लिए प्रशिक्षण।` : `Trains for your recommended qualification: ${pick.title} (NSQF ${pick.level}).`)
      : pick?.fit === 'next'
        ? (hi ? `अगला कदम: ${pick.titleHi} (NSQF ${pick.level}) की तैयारी।` : `Next step: prepares you for ${pick.title} (NSQF ${pick.level}).`)
        : pick
          ? (hi ? `इसी स्तर का विकल्प: ${pick.titleHi} (NSQF ${pick.level})।` : `Same-level option: ${pick.title} (NSQF ${pick.level}).`)
          : (hi ? `आपकी विशेषज्ञता से मेल खाता है: ${specLabel}।` : `Matches your specialization: ${specLabel}.`);
    return [{
      key: name.toLowerCase(),
      rank: locationRank,
      recommendation: {
        pmajayCourseId: course.id, subCourseCode: course.subCourseCode, subCourseName: name, courseName: course.courseName,
        sector: course.sector, subSector: course.subSector, courseLevel: course.courseLevel,
        nsqfQpCode: via.qpCode, nsqfTitle: hi ? via.titleHi : via.title, nsqfLevel: via.level,
        score: Number(score.toFixed(3)), rationale,
      } satisfies CourseRecommendation,
    }];
  });
  const ranked = scored
    .sort((a, b) => b.recommendation.score - a.recommendation.score || b.rank - a.rank)
    .filter(s => (seen.has(s.key) ? false : (seen.add(s.key), true)))
    .slice(0, limit)
    .map(s => s.recommendation);
  if (ranked.length >= 3) return ranked;
  // Thin list: add courses for other qualifications in the same trade, own specialization's ladder first.
  const tradeQps = [LADDERS[trade][profile.specialization], ...Object.entries(LADDERS[trade]).filter(([s]) => s !== profile.specialization).map(([, l]) => l)].flat(2);
  const available = candidates.filter(c => {
    const name = c.subCourseName.trim();
    const scoped = courseState(c.courseLevel);
    return !OUT_OF_SCOPE.test(name) && !(scoped && !(myState && myState.includes(scoped)));
  });
  for (const related of tradeQps) {
    if (ranked.length >= 4) break;
    const course = available.find(c => related.course.test(c.subCourseName.trim()) && !seen.has(c.subCourseName.trim().toLowerCase()));
    if (!course) continue;
    const name = course.subCourseName.trim();
    seen.add(name.toLowerCase());
    ranked.push({
      pmajayCourseId: course.id, subCourseCode: course.subCourseCode, subCourseName: name, courseName: course.courseName,
      sector: course.sector, subSector: course.subSector, courseLevel: course.courseLevel,
      nsqfQpCode: related.qpCode, nsqfTitle: hi ? related.titleHi : related.title, nsqfLevel: related.level,
      score: 0.3, rationale: hi ? `आपके काम से जुड़ा कोर्स: ${related.titleHi} (NSQF ${related.level})।` : `Related course in your trade: ${related.title} (NSQF ${related.level}).`,
    });
  }
  return ranked;
}

const MODE_TERMS: Record<string, RegExp> = {
  home: /work from home|home-based|home visit/i,
  online: /work from home|home-based|online/i,
  local: /in person|in-person|shop|salon|parlou?r|local|nearby/i,
  relocate: /relocation|factory|site|plant/i,
};

export async function matchJobsForProfile(input: {
  profile: CareerProfile; picks: QualificationPick[]; state?: string | null; district?: string | null; language: string; limit?: number;
}): Promise<JobMatch[]> {
  const { profile, picks, state, district, language, limit = 10 } = input;
  const trade = profile.profession as FocusProfession;
  const hi = language === 'hi';
  const recommended = picks.find(p => p.fit === 'recommended')!;
  const next = picks.find(p => p.fit === 'next');
  const ceiling = next?.level ?? recommended.level;
  const specTerms = SPECIALIZATION_TERMS[trade][profile.specialization];
  const norm = (v?: string | null) => v?.toLowerCase().replace(/[^a-z0-9]/g, '') || null;
  const jobs = await prisma.jobPosting.findMany({ where: { active: true, skillTokens: { hasSome: PROFESSION_TOKENS[trade] } }, take: 300 });
  const step = decideStep(profile).step;
  const scored = jobs.flatMap(job => {
    const text = `${job.title} ${job.description ?? ''}`;
    if (profileRelevance(text, profile, 'job') < 0) return [];
    const level = job.nsqfLevel ?? recommended.level;
    if (level > ceiling) return []; // beyond the next step: not reachable yet
    const entryRole = /trainee|helper/i.test(job.title);
    if (step === 2 && (entryRole || level < recommended.level - 1)) return []; // an expert is not offered trainee or junior posts
    const needsUpskilling = level > recommended.level;
    const specific = specTerms?.test(job.title) ?? false;
    let score = 0.3 + (specific ? 0.15 : 0) + (needsUpskilling ? 0 : 0.1) + (level === recommended.level ? 0.1 : 0);
    if (MODE_TERMS[profile.answers.mode]?.test(text)) score += 0.15;
    if (profile.answers.availability === 'full' ? /full-time/i.test(text) : /part-time/i.test(text)) score += 0.1;
    if (step === 0 ? !entryRole && !needsUpskilling && level >= recommended.level : entryRole) score += step === 0 ? -0.05 : -0.25; // beginners: trainee posts first; others: their own level first
    if (level < recommended.level) score -= 0.2; // below their level
    if (norm(job.district) && norm(job.district) === norm(district)) score += 0.05;
    else if (norm(job.state) && norm(job.state) === norm(state)) score += 0.03;
    const bridge = needsUpskilling ? (next ?? recommended) : recommended;
    return [{
      specific,
      raw: score,
      match: {
        jobPostingId: job.id, title: job.title, titleHindi: job.titleHindi, employerName: job.employerName, sector: job.sector,
        nsqfLevel: job.nsqfLevel, state: job.state, district: job.district, wageMin: job.wageMin, wageMax: job.wageMax,
        positions: job.positions, contactPhone: job.contactPhone,
        applyUrl: `https://www.ncs.gov.in/?keyword=${encodeURIComponent(job.title)}`,
        source: job.source, score: Number(Math.max(0, Math.min(1, score)).toFixed(3)), needsUpskilling,
        nsqfQpCode: bridge.qpCode, nsqfTitle: hi ? bridge.titleHi : bridge.title,
      } satisfies JobMatch,
    }];
  });
  // Show only the specialization's own jobs when there are enough of them.
  const own = scored.filter(s => s.specific);
  return (own.length >= 2 ? own : scored)
    .sort((a, b) => Number(a.match.needsUpskilling) - Number(b.match.needsUpskilling) || b.raw - a.raw)
    .slice(0, limit)
    .map(s => s.match);
}
