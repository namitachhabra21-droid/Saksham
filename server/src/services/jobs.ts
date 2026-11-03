import type { CareerProfile } from "./career.js";
import { profileRelevance } from "./careerRanking.js";
import { prisma } from "../lib/prisma.js";
import type { MappingResult } from "./nsqf.js";

export interface JobMatch {
  jobPostingId: string;
  title: string;
  titleHindi: string | null;
  employerName: string;
  sector: string | null;
  nsqfLevel: number | null;
  state: string | null;
  district: string | null;
  wageMin: number | null;
  wageMax: number | null;
  positions: number | null;
  contactPhone: string | null;
  applyUrl: string;
  /** where this row came from — SAMPLE rows are demonstration data and the
   *  client must label them as such, never as live vacancies */
  source: string;
  score: number;
  /** true when the job asks for a higher NSQF level than the beneficiary's
   *  mapped qualification — shown as "reachable with training", not as a
   *  job they can walk into today */
  needsUpskilling: boolean;
  /** the qualification that would bridge the gap, when needsUpskilling */
  nsqfQpCode: string | null;
  nsqfTitle: string | null;
}

interface MatchInput {
  mappings: MappingResult[];
  state?: string | null;
  district?: string | null;
  skillDetails?: string | null;
  limit?: number;
  profile?: CareerProfile;
}

function normalizeLocation(value: string | null | undefined): string | null {
  return value?.trim().toLowerCase().replace(/[^a-z0-9]+/g, "") || null;
}

function normalizeText(value: string | null | undefined): string {
  return value?.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim() || "";
}

function jobSearchUrl(jobTitle: string): string {
  return `https://www.ncs.gov.in/?keyword=${encodeURIComponent(jobTitle)}`;
}

function academicTutorTitles(details: string): string[] {
  const text = normalizeText(details);
  const classMatch = text.match(/\b(?:class|standard)?\s*(9|10|11|12|9th|10th|11th|12th)\b/);
  const classLabel = classMatch ? `Class ${classMatch[1].replace(/\D/g, "")}` : "Secondary School";
  const subjects = [
    ["Maths", /\b(math|maths|mathematics)\b/],
    ["Science", /\b(science)\b/],
    ["Physics", /\b(physics)\b/],
    ["Chemistry", /\b(chemistry)\b/],
    ["Biology", /\b(biology)\b/],
    ["Accounts", /\b(accounts|accountancy)\b/],
    ["Commerce", /\b(commerce|business studies|economics)\b/],
    ["English", /\b(english)\b/],
    ["Hindi", /\b(hindi)\b/],
  ]
    .filter(([, pattern]) => (pattern as RegExp).test(text))
    .map(([subject]) => subject as string);

  const subjectTitles = subjects.map((subject) => `${classLabel} ${subject} Tutor`);
  return [
    ...subjectTitles,
    `${classLabel} Home Tuition Teacher`,
    `${classLabel} Coaching Teacher`,
    "Online Academic Tutor",
    "Private Tuition Teacher",
    "After School Tutor",
  ].slice(0, 5);
}

function academicTutoringFallbackJobs(matched: MappingResult[], details: string, limit: number): JobMatch[] {
  const source = matched.find((m) => m.normalizedSkill.toLowerCase() === "academic-tutoring") ?? matched[0];
  return academicTutorTitles(details).slice(0, limit).map((title, index) => ({
    jobPostingId: `ncs-academic-tutoring-${index + 1}`,
    title,
    titleHindi: null,
    employerName: "National Career Service",
    sector: "Special Tutoring",
    nsqfLevel: null,
    state: null,
    district: null,
    wageMin: null,
    wageMax: null,
    positions: null,
    contactPhone: null,
    applyUrl: jobSearchUrl(title),
    source: "NCS",
    score: Number((0.92 - index * 0.04).toFixed(3)),
    needsUpskilling: false,
    nsqfQpCode: source?.qpCode ?? null,
    nsqfTitle: source?.title ?? "Academic Tutor / Special Tutoring",
  }));
}

function detailScore(job: { title: string; description: string | null; skillTokens: string[] }, details: string): number {
  if (!details) return 0;
  const haystack = normalizeText(`${job.title} ${job.description ?? ""} ${job.skillTokens.join(" ")}`);
  const wantsSeniorTeaching = /\b(9|10|11|12|9th|10th|11th|12th|secondary|senior|higher secondary|board|math|maths|science|physics|chemistry|biology|accounts|commerce|english|hindi)\b/.test(details);
  const earlyChildRole = /\b(play school|playschool|pre school|preschool|anganwadi|childcare|child care|caregiver|creche|nursery|toddler|early childhood|poshak)\b/.test(haystack);

  if (wantsSeniorTeaching && earlyChildRole) return -1;

  let score = 0;
  for (const word of details.split(/\s+/).filter((w) => w.length >= 4)) {
    if (haystack.includes(word)) score += 0.04;
  }
  if (wantsSeniorTeaching && /\b(teacher|teaching|tutor|tuition|school facilitator|secondary|senior)\b/.test(haystack)) score += 0.18;
  return Math.min(0.25, score);
}

/**
 * Match real job postings to a beneficiary's mapped skills.
 *
 * Jobs carry the SAME normalized skill tokens the voice pipeline emits
 * (services/skillLexicon.ts), so this is an exact join rather than fuzzy title
 * comparison — every trade the pipeline can map is a trade jobs can be found
 * for.
 *
 * Score (0–1):
 *   0.55  the job serves a skill the beneficiary actually said
 *   0.20  same district as the beneficiary  (0.10 for same state)
 *   0.15  the beneficiary already meets the NSQF level the job asks for
 *   0.10  sector matches the mapped qualification's sector
 */
export async function matchJobs(input: MatchInput): Promise<JobMatch[]> {
  const { mappings, state, district, skillDetails, profile, limit = 20 } = input;

  const matched = mappings.filter((m) => m.normalizedSkill !== "unknown");
  const tokens = [...new Set(matched.map((m) => m.normalizedSkill.toLowerCase()))];
  const searchTokens = [...new Set(tokens.flatMap((token) => (token === "academic-tutoring" ? ["teaching"] : [token])))];
  if (tokens.length === 0) return [];

  // Jobs are keyed on the lexicon's skill tokens, but a mapping can also come
  // from the catalogue path, whose normalizedSkill is derived from the
  // qualification title ("craft-baker", "optical-fiber-splicer"). Those match
  // no job token, so the better qualification match used to cost the
  // beneficiary their job results entirely. Fall back to the qualification and
  // sector, which every mapping carries whichever path produced it.
  const qualificationIds = [...new Set(matched.map((m) => m.nsqfQualificationId).filter((id): id is string => !!id))];
  let jobs = await prisma.jobPosting.findMany({
    where: { active: true, skillTokens: { hasSome: searchTokens } },
    take: 200,
  });
  if (jobs.length === 0 && qualificationIds.length > 0) {
    jobs = await prisma.jobPosting.findMany({
      where: { active: true, nsqfQualificationId: { in: qualificationIds } },
      take: 200,
    });
  }

  const wantedSectors = new Set(matched.map((m) => m.sector).filter(Boolean).map((s) => s!.toLowerCase()));
  // the highest level the beneficiary has actually mapped to
  const beneficiaryLevel = Math.max(0, ...matched.map((m) => m.nsqfLevel ?? 0));
  const beneficiaryState = normalizeLocation(state);
  const beneficiaryDistrict = normalizeLocation(district);

  if (profile) jobs = jobs.filter(job => profileRelevance(`${job.title} ${job.description ?? ""}`, profile, "job") >= 0);

  const scored = jobs.map((job) => {
    const hit = job.skillTokens.find((t) => searchTokens.includes(t.toLowerCase()));
    const source =
      matched.find((m) => m.normalizedSkill.toLowerCase() === hit?.toLowerCase()) ??
      matched.find((m) => m.normalizedSkill.toLowerCase() === "academic-tutoring") ??
      matched[0];

    let score = 0;
    if (hit) score += 0.55;

    const jobDistrict = normalizeLocation(job.district);
    const jobState = normalizeLocation(job.state);
    if (jobDistrict && beneficiaryDistrict && jobDistrict === beneficiaryDistrict) score += 0.2;
    else if (jobState && beneficiaryState && jobState === beneficiaryState) score += 0.1;

    const needsUpskilling = (job.nsqfLevel ?? 0) > beneficiaryLevel;
    if (!needsUpskilling) score += 0.15;

    if (job.sector && wantedSectors.has(job.sector.toLowerCase())) score += 0.1;
    const details = normalizeText(skillDetails);
    const detailBoost = detailScore(job, details);
    score += detailBoost;
    if (profile) score += profileRelevance(`${job.title} ${job.description ?? ""}`, profile, "job");

    return {
      jobPostingId: job.id,
      title: job.title,
      titleHindi: job.titleHindi,
      employerName: job.employerName,
      sector: job.sector,
      nsqfLevel: job.nsqfLevel,
      state: job.state,
      district: job.district,
      wageMin: job.wageMin,
      wageMax: job.wageMax,
      positions: job.positions,
      contactPhone: job.contactPhone,
      applyUrl: jobSearchUrl(job.title),
      source: job.source,
      score: Number(Math.max(0, Math.min(1, score)).toFixed(3)),
      needsUpskilling,
      nsqfQpCode: source?.qpCode ?? null,
      nsqfTitle: source?.title ?? null,
      detailBoost,
    };
  });

  const ranked = scored
    .filter((job) => job.detailBoost >= 0)
    .sort((a, b) => Number(a.needsUpskilling) - Number(b.needsUpskilling) || b.score - a.score)
    .slice(0, limit)
    .map(({ detailBoost: _detailBoost, ...job }) => job);

  if (!profile && ranked.length === 0 && tokens.includes("academic-tutoring")) {
    return academicTutoringFallbackJobs(matched, skillDetails ?? "", Math.min(5, limit));
  }

  return ranked;
}
