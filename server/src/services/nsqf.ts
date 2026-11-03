import { prisma } from "../lib/prisma.js";
import { extractSkills, patternHitCount, titleTermsForSkill } from "./skillLexicon.js";
import { classifySkillsWithLlm, classifyQualificationWithLlm } from "./skillLlm.js";

/**
 * Tuning constants for skill matching.
 *
 * These are hand-chosen judgement calls, not values derived from data — they
 * are gathered here so the behaviour of the engine can be read and adjusted in
 * one place instead of being scattered as literals through the scoring code.
 * scripts/audit-coverage.ts reports how the current values perform across all
 * ~84 known trades, so a change can be checked rather than guessed at.
 */
const TUNING = {
  /** title names the trade outright — the dominant signal */
  titleNamesTrade: 10,
  /** title contains a stem of the trade ("mason" in "Concrete Mason") */
  titleContainsStem: 6,
  /** supervisor/manager titles: this app serves the worker, not their boss */
  seniorTitlePenalty: 8,
  /** Office/support functions attached to a trade rather than the trade.
   *  Deliberately larger than titleNamesTrade: a procurement or documentation
   *  role is never the right answer for someone describing manual work, even
   *  when its title happens to contain their trade word. Sector names like
   *  "agriculture" appear in administrative titles far more often than in the
   *  titles of the people who actually do the work. */
  deskTitlePenalty: 12,
  /** titles naming someone who does the work by hand */
  handsOnTitleBonus: 5,
  /** qualifications above this NSQF level are progressively deprioritised */
  preferredMaxLevel: 3,
  /** base confidence for a keyword match, before per-hit bonuses */
  keywordBase: 0.55,
  /** added per matched keyword/pattern */
  keywordPerHit: 0.1,
  /** a keyword match never claims certainty */
  keywordCeiling: 0.95,
  /** below this we say we did not understand rather than assert a trade */
  minConfidence: 0.4,
  /** free-text catalogue fallback must clear this to be used at all */
  catalogFallbackMin: 2,
} as const;

export interface MappingResult {
  rawSkillText: string;
  normalizedSkill: string;
  nsqfQualificationId: string | null;
  qpCode: string | null;
  title: string | null;
  sector: string | null;
  nsqfLevel: number | null;
  confidence: number;
  /** "profile": chosen from the survey answers by services/careerQualifications.ts */
  method: "keyword" | "embedding" | "llm" | "manual" | "profile";
  /** Survey-profile mappings only: how this qualification relates to the
   *  person today, why it was chosen (localized), and the training effort. */
  fit?: "recommended" | "alternative" | "next";
  reason?: string;
  trainingHours?: number;
  trainingWeeks?: number;
  /** true if this normalizedSkill also has a real, currently PM-AJAY-funded
   *  course (prisma/data/README-pmajay-courses.md) — independent of, and not
   *  required for, the NSQF match above. */
  pmajayVerified: boolean;
  pmajayCourse: { subCourseCode: string; subCourseName: string; sector: string } | null;
  /** true when the matched qualification's NQR validity has lapsed. The match
   *  is still shown (many lapsed trades — pottery, basket-making — still have
   *  live PM-AJAY courses), but the client must label it so nobody is told an
   *  expired certification is current. */
  nsqfExpired: boolean;
  /** Real job titles this qualification leads to (NQR "proposed occupations").
   *  Populated for 1,170 of the 1,283 qualifications — this is the only
   *  employment-side data in the catalogue, so an intent of "find work"
   *  answers with these rather than with job listings, which we do not have. */
  proposedOccupations: string[];
}


/** Word stems for a normalized skill token, so "masonry" also recognises
 *  "Mason", "handloom-weaving" recognises "loom"/"weav". Trailing -ing/-ry/-y
 *  are dropped because NQR titles name the worker ("Mason"), not the craft. */
export function tradeStems(token: string): string[] {
  const stems: string[] = [];
  for (const word of token.split(/[-\s]+/)) {
    if (word.length < 3) continue;
    stems.push(word);
    for (const suffix of ["ing", "ry", "y", "s"]) {
      if (word.length > suffix.length + 2 && word.endsWith(suffix)) {
        stems.push(word.slice(0, -suffix.length));
      }
    }
  }
  return [...new Set(stems)];
}

/** Titles naming a role the beneficiary is unlikely to hold. A PM-AJAY
 *  beneficiary is an informal worker, so an entry-level "Brick Mason- Basic"
 *  is a far better mapping than "Project Coordinator (Construction)". */
const SENIOR_TITLE = /\b(manager|supervisor|coordinator|engineer|executive|officer|specialist|analyst|architect|consultant|instructor|teacher|trainer)\b/i;

/** Office and support functions attached to a trade rather than the trade
 *  itself. "Purchase Assistant-Food and Agriculture Commodity" reads as junior
 *  — "Assistant" dodges the seniority penalty — but it is a procurement desk
 *  job, and it was being returned as the representative qualification for
 *  every farming skill. */
const DESK_TITLE =
  /\b(purchase|procurement|sales|marketing|clerk|clerical|data|documentation|promoter|extension|auditor|inspector|surveyor)\b/i;

/** Words naming someone who does the work with their hands. A title matching
 *  the trade word is not enough on its own: "agriculture" appears in a
 *  purchasing role, while the qualification an actual farmer wants says
 *  "Farmer" and never says "agriculture" at all. */
const HANDS_ON_TITLE =
  /\b(farmer|artisan|craftsman|craftsperson|worker|maker|operator|technician|mechanic|fitter|weaver|potter|mason|tailor|carpenter|welder|electrician|plumber|helper|practitioner)\b/i;

/** Pick the qualification/course whose title most directly names the trade.
 *  Falls back to the first candidate so behaviour never regresses to "no match". */
export function pickBestByTitle<T>(candidates: T[], token: string, titleOf: (item: T) => string, levelOf?: (item: T) => number | null): T | undefined {
  if (candidates.length === 0) return undefined;
  const stems = tradeStems(token);
  let best: T | undefined;
  let bestScore = -Infinity;
  for (const candidate of candidates) {
    const title = normalizeTitle(titleOf(candidate));
    let score = 0;
    // naming the trade at all is the dominant signal
    if (title.includes(normalizeTitle(token))) score += TUNING.titleNamesTrade;
    for (const stem of stems) if (new RegExp(`\\b${stem}`, "i").test(title)) score += TUNING.titleContainsStem;
    // prefer the worker over the manager of the worker
    if (SENIOR_TITLE.test(title)) score -= TUNING.seniorTitlePenalty;
    if (DESK_TITLE.test(title)) score -= TUNING.deskTitlePenalty;
    if (HANDS_ON_TITLE.test(title)) score += TUNING.handsOnTitleBonus;
    // prefer entry-level qualifications, which is who this app serves
    const level = levelOf?.(candidate);
    if (typeof level === "number") score -= Math.max(0, level - TUNING.preferredMaxLevel);
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }
  return best ?? candidates[0];
}

function normalizeTitle(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function isSeniorTeachingTranscript(transcript: string): boolean {
  return /\b(9|10|11|12|9th|10th|11th|12th|secondary|senior|higher secondary|board|math|maths|science|physics|chemistry|biology|accounts|commerce|english|hindi)\b/i.test(
    normalizeTitle(transcript),
  );
}

function isCreativeTeachingTranscript(transcript: string): boolean {
  return /\b(dance|music|singing|fine art|fine arts|drawing|painting|guitar|tabla|harmonium)\b/i.test(normalizeTitle(transcript));
}

function isEarlyChildhoodQualification(title: string): boolean {
  return /\b(play school|playschool|pre school|preschool|anganwadi|childcare|child care|caregiver|creche|nursery|toddler|early childhood|poshak)\b/i.test(
    normalizeTitle(title),
  );
}

function isAcademicTeachingTranscript(transcript: string): boolean {
  const text = normalizeTitle(transcript);
  return /\b(teach|teaching|teacher|tutor|tuition|coaching|padhata|padhati|padhana|shikshak|adhyapak)\b/i.test(text) &&
    /\b(9|10|11|12|9th|10th|11th|12th|class|standard|secondary|senior|higher secondary|board|student|students|math|maths|science|physics|chemistry|biology|accounts|commerce|english|hindi)\b/i.test(text) &&
    !isCreativeTeachingTranscript(transcript);
}

function normalizeSectorForFallback(value: string): string {
  return value.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "");
}

function cleanDisplayTitle(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/** The only qualification columns the mapping reads. */
const QUAL_FIELDS = {
  id: true,
  qpCode: true,
  title: true,
  sector: true,
  nsqfLevel: true,
  keywords: true,
  proposedOccupations: true,
} as const;

/** The NSQF + PM-AJAY catalogues, cached in-process.
 *
 *  This is government reference data: it only changes when the service is
 *  redeployed and reseeded, but it was being refetched in full on every single
 *  request — ~2,400 rows over the network, which dominated response time on
 *  Render's free tier. Cached for an hour; a redeploy restarts the process and
 *  therefore clears it. */
let catalogCache: {
  quals: QualRow[];
  expiredQuals: QualRow[];
  pmajayCourses: CourseRow[];
  fetchedAt: number;
} | null = null;
const CATALOG_TTL_MS = 60 * 60 * 1000;

async function loadCatalog() {
  if (catalogCache && Date.now() - catalogCache.fetchedAt < CATALOG_TTL_MS) return catalogCache;
  const [quals, expiredQuals, pmajayCourses] = await Promise.all([
    // Select only what the mapping actually reads. The full row carries the
    // scraped NQR detail blobs (nos, eligibility, progressionPathway); pulling
    // those for all 1,283 rows dominated response time.
    prisma.nsqfQualification.findMany({ where: { expired: false }, select: QUAL_FIELDS }),
    prisma.nsqfQualification.findMany({ where: { expired: true }, select: QUAL_FIELDS }),
    prisma.pmajayCourse.findMany({
      select: { subCourseCode: true, subCourseName: true, sector: true, keywords: true },
    }),
  ]);
  catalogCache = { quals, expiredQuals, pmajayCourses, fetchedAt: Date.now() };
  return catalogCache;
}

type QualRow = {
  id: string;
  qpCode: string;
  title: string;
  sector: string;
  nsqfLevel: number;
  keywords: string[];
  proposedOccupations: string[];
};
type CourseRow = { subCourseCode: string; subCourseName: string; sector: string; keywords: string[] };

const TRANSCRIPT_STOPWORDS = new Set([
  "about", "also", "and", "any", "are", "can", "does", "doing", "for", "from",
  "have", "help", "her", "him", "his", "job", "know", "learn", "like", "need",
  "operator", "please", "repair", "repairs", "service", "services", "she",
  "skill", "skills", "that", "the", "their", "them", "this", "want", "with",
  "make", "maker", "makes", "making", "work", "worker", "working", "would",
  "main", "maintenance", "maintain", "mera", "meri",
  "mere", "mujhe", "karta", "karti", "karte", "hoon", "hun", "hai", "hain",
]);

function lowerKeywords(keywords: string[]): string[] {
  return keywords.map((k) => k.toLowerCase());
}

function titleTermMatches(title: string, terms: string[]): boolean {
  const hay = normalizeTitle(title);
  return terms.some((term) => hay.includes(normalizeTitle(term)));
}

function qualificationCandidates(quals: QualRow[], token: string): { candidates: QualRow[]; pickToken: string } {
  const normalizedToken = token.toLowerCase();
  const keywordMatches = quals.filter((q) => lowerKeywords(q.keywords).includes(normalizedToken));
  const terms = titleTermsForSkill(token);
  const titleMatches = quals.filter((q) => titleTermMatches(q.title, terms));
  return { candidates: [...new Map([...titleMatches, ...keywordMatches].map((q) => [q.id, q])).values()], pickToken: terms[0] ?? token };
}

function filterContextualQualificationCandidates(candidates: QualRow[], token: string, transcript: string): QualRow[] {
  if (token !== "teaching") return candidates;
  if (!isCreativeTeachingTranscript(transcript) && isSeniorTeachingTranscript(transcript)) return [];
  const filtered = isSeniorTeachingTranscript(transcript)
    ? candidates.filter((q) => !isEarlyChildhoodQualification(q.title))
    : candidates;
  return filtered.length > 0 ? filtered : candidates;
}

function courseCandidates(courses: CourseRow[], token: string): { candidates: CourseRow[]; pickToken: string } {
  const normalizedToken = token.toLowerCase();
  const keywordMatches = courses.filter((c) => lowerKeywords(c.keywords).includes(normalizedToken));
  const terms = titleTermsForSkill(token);
  const titleMatches = courses.filter((c) => titleTermMatches(c.subCourseName, terms) || titleTermMatches(c.sector, terms));
  return {
    candidates: [...new Map([...titleMatches, ...keywordMatches].map((c) => [c.subCourseCode, c])).values()],
    pickToken: terms[0] ?? token,
  };
}

function transcriptWords(transcript: string): string[] {
  return [
    ...new Set(
      normalizeTitle(transcript)
        .split(" ")
        .map((word) => spokenStem(word))
        .filter((word) => word.length >= 4 && !TRANSCRIPT_STOPWORDS.has(word)),
    ),
  ];
}

function spokenStem(word: string): string {
  if (word.length < 6) return word;
  return word.replace(/(ing|ed|er|ers|na|ta|ti|te|ya|ye|yi|ne)$/u, "");
}

function catalogFallbackMatch(transcript: string, quals: QualRow[]): { match: QualRow; score: number } | null {
  const words = transcriptWords(transcript);
  if (words.length === 0) return null;

  let best: { match: QualRow; score: number } | null = null;
  for (const qual of quals) {
    const title = normalizeTitle(qual.title);
    const occupations = normalizeTitle((qual.proposedOccupations ?? []).join(" "));
    const hay = `${title} ${occupations}`;
    let score = 0;

    for (const word of words) {
      if (new RegExp(`\\b${word}`, "i").test(hay)) score += 2;
      else if (word.length >= 5 && hay.includes(word)) score += 1;
    }
    if (score === 0) continue;
    score -= Math.max(0, qual.nsqfLevel - 4) * 0.2;

    if (!best || score > best.score) best = { match: qual, score };
  }

  return best && best.score >= TUNING.catalogFallbackMin ? best : null;
}

/**
 * Map a raw transcript to NSQF qualifications.
 *
 * Strategy (transparent, offline-capable):
 *  1. Pull normalized skill tokens from the lexicon.
 *  2. For each token, find the NsqfQualification whose `keywords` array contains it.
 *  3. Confidence = keyword overlap ratio, capped at 0.95 so nothing looks certain.
 *  4. Separately, check the real PM-AJAY course catalogue for the same token —
 *     this is an independent real-data signal, not a scoring input.
 */
function unknownMapping(transcript: string): MappingResult {
  return {
    rawSkillText: transcript,
    normalizedSkill: "unknown",
    nsqfQualificationId: null,
    qpCode: null,
    title: null,
    sector: null,
    nsqfLevel: null,
    confidence: 0,
    method: "keyword",
    pmajayVerified: false,
    pmajayCourse: null,
    nsqfExpired: false,
    proposedOccupations: [],
  };
}

function academicTutoringMapping(transcript: string, pmajayCourses: CourseRow[]): MappingResult {
  const course =
    pmajayCourses.find((c) => lowerKeywords(c.keywords).includes("teaching") && normalizeSectorForFallback(c.sector) === "specialtutoring") ??
    null;
  return {
    rawSkillText: transcript,
    normalizedSkill: "academic-tutoring",
    nsqfQualificationId: null,
    qpCode: course?.subCourseCode ?? null,
    title: "Academic Tutor / Special Tutoring",
    sector: "Special Tutoring",
    nsqfLevel: null,
    confidence: 0.82,
    method: "manual",
    pmajayVerified: Boolean(course),
    pmajayCourse: course
      ? { subCourseCode: course.subCourseCode, subCourseName: course.subCourseName, sector: course.sector }
      : null,
    nsqfExpired: false,
    proposedOccupations: ["Tutor", "Tuition Teacher", "Academic Coach"],
  };
}

export async function mapTranscriptToNsqf(transcript: string): Promise<MappingResult[]> {
  // Let the LLM interpret natural phrasing first when configured. It is still
  // constrained to known catalogue tokens; keyword and catalogue matching stay
  // as deterministic fallbacks for local/no-key development.
  const llmMatches = await classifySkillsWithLlm(transcript);
  const keywordTokens = extractSkills(transcript);
  let matchedByLlm = llmMatches.length > 0;
  // how clearly the model judged each trade to be evidenced, so an indirect
  // mention ("something related to cotton") ranks below an explicit one
  const llmConfidence = new Map(llmMatches.map((m) => [m.token, m.confidence]));
  let tokens: string[] = matchedByLlm ? llmMatches.map((m) => m.token) : keywordTokens;
  if (tokens.length === 0) {
    const { quals, pmajayCourses } = await loadCatalog();

    // Ask the model to match the real catalogue before falling back to word
    // overlap. The token pass above can only return one of ~84 lexicon
    // entries; this reaches all 819 live qualifications, so a trade nobody
    // wrote into the lexicon is still findable.
    const llmQuals = await classifyQualificationWithLlm(transcript, quals);
    const byQpCode = new Map(quals.map((q) => [q.qpCode, q]));
    const fromCatalogue = llmQuals
      .map((m) => ({ match: byQpCode.get(m.qpCode), confidence: m.confidence }))
      .filter((m): m is { match: QualRow; confidence: number } => !!m.match)
      .filter((m) => m.confidence >= TUNING.minConfidence);

    if (fromCatalogue.length > 0) {
      return fromCatalogue.map(({ match, confidence }) => {
        const course = pickBestByTitle(
          pmajayCourses.filter(
            (c) => normalizeSectorForFallback(c.sector) === normalizeSectorForFallback(match.sector),
          ),
          match.title,
          (c) => c.subCourseName,
        );
        return {
          rawSkillText: transcript,
          normalizedSkill: normalizeTitle(match.title).replace(/\s+/g, "-"),
          nsqfQualificationId: match.id,
          qpCode: match.qpCode,
          title: cleanDisplayTitle(match.title),
          sector: match.sector,
          nsqfLevel: match.nsqfLevel,
          confidence,
          method: "llm" as const,
          pmajayVerified: Boolean(course),
          pmajayCourse: course
            ? { subCourseCode: course.subCourseCode, subCourseName: course.subCourseName, sector: course.sector }
            : null,
          nsqfExpired: false,
          proposedOccupations: match.proposedOccupations ?? [],
        };
      });
    }

    const fallback = catalogFallbackMatch(transcript, quals);
    if (fallback) {
      const course = pickBestByTitle(
        pmajayCourses.filter((c) => normalizeSectorForFallback(c.sector) === normalizeSectorForFallback(fallback.match.sector)),
        fallback.match.title,
        (c) => c.subCourseName,
      );
      return [
        {
          rawSkillText: transcript,
          normalizedSkill: normalizeTitle(fallback.match.title).replace(/\s+/g, "-"),
          nsqfQualificationId: fallback.match.id,
          qpCode: fallback.match.qpCode,
          title: cleanDisplayTitle(fallback.match.title),
          sector: fallback.match.sector,
          nsqfLevel: fallback.match.nsqfLevel,
          confidence: Math.min(0.55, 0.35 + fallback.score * 0.05),
          method: "keyword",
          pmajayVerified: Boolean(course),
          pmajayCourse: course
            ? { subCourseCode: course.subCourseCode, subCourseName: course.subCourseName, sector: course.sector }
            : null,
          nsqfExpired: false,
          proposedOccupations: fallback.match.proposedOccupations ?? [],
        },
      ];
    }

    return [
      {
        rawSkillText: transcript,
        normalizedSkill: "unknown",
        nsqfQualificationId: null,
        qpCode: null,
        title: null,
        sector: null,
        nsqfLevel: null,
        confidence: 0,
        method: "keyword",
        pmajayVerified: false,
        pmajayCourse: null,
        nsqfExpired: false,
        proposedOccupations: [],
      },
    ];
  }

  const { quals, expiredQuals, pmajayCourses } = await loadCatalog();
  if (isAcademicTeachingTranscript(transcript)) return [academicTutoringMapping(transcript, pmajayCourses)];
  const results: MappingResult[] = [];

  for (const token of tokens) {
    // Now that every one of the 1,283 rows carries keywords (not just ~64),
    // several can share a broad concept (e.g. "masonry" also matches generic
    // "construction" job titles like "Road Construction Engineer") — among
    // all real matches, prefer whichever title most directly names the
    // concept, so the qualification actually returned is the most
    // representative one, not just the first row Postgres happened to return.
    const activeQuals = qualificationCandidates(quals, token);
    activeQuals.candidates = filterContextualQualificationCandidates(activeQuals.candidates, token, transcript);
    let match = pickBestByTitle(activeQuals.candidates, activeQuals.pickToken, (q) => q.title, (q) => q.nsqfLevel);
    let matchExpired = false;
    if (!match) {
      const expired = qualificationCandidates(expiredQuals, token);
      expired.candidates = filterContextualQualificationCandidates(expired.candidates, token, transcript);
      match = pickBestByTitle(expired.candidates, expired.pickToken, (q) => q.title, (q) => q.nsqfLevel);
      matchExpired = Boolean(match);
    }
    // Several courses can share a broad concept (e.g. "masonry" also matches
    // generic "construction" job titles) — among all real matches, prefer
    // whichever course title most directly names the concept itself, so the
    // example surfaced is the most representative one, not just the first
    // row Postgres happened to return.
    const pmajay = courseCandidates(pmajayCourses, token);
    const pmajayMatch = pickBestByTitle(pmajay.candidates, pmajay.pickToken, (c) => c.subCourseName);
    const pmajayCourse = pmajayMatch
      ? { subCourseCode: pmajayMatch.subCourseCode, subCourseName: pmajayMatch.subCourseName, sector: pmajayMatch.sector }
      : null;

    if (!match) {
      results.push({
        rawSkillText: transcript,
        normalizedSkill: token,
        nsqfQualificationId: null,
        qpCode: null,
        title: null,
        sector: null,
        nsqfLevel: null,
        confidence: 0.2,
        method: "keyword",
        pmajayVerified: Boolean(pmajayMatch),
        pmajayCourse,
        nsqfExpired: false,
        proposedOccupations: [],
      });
      continue;
    }

    // Confidence reflects how strongly the transcript evidences this skill.
    // The qualification's own keywords are mostly formal English ("pottery",
    // "terracotta"), so counting only those punished beneficiaries who speak
    // in their own language: "mitti ke bartan" scored 0 hits and floored at
    // the base, while "silai" happened to be a keyword and scored higher.
    // Count the LEXICON patterns that actually fired too — that is the real
    // evidence the beneficiary named this trade.
    const hay = transcript.toLowerCase();
    const qualificationHits = match.keywords.filter((k) => hay.includes(k.toLowerCase())).length;
    const spokenHits = patternHitCount(transcript, token);
    // an LLM match is a genuine reading of what they said, but it is inferred
    // rather than a literal phrase hit, so it does not claim keyword certainty
    // An LLM match is scored by the model on how clearly the words evidence
    // the trade; a keyword match is scored on how many known phrases fired.
    const confidence = matchedByLlm
      ? (llmConfidence.get(token) ?? 0.5)
      : Math.min(TUNING.keywordBase + TUNING.keywordPerHit * (qualificationHits + spokenHits), TUNING.keywordCeiling);

    results.push({
      rawSkillText: transcript,
      normalizedSkill: token,
      nsqfQualificationId: match.id,
      qpCode: match.qpCode,
      title: cleanDisplayTitle(match.title),
      sector: match.sector,
      nsqfLevel: match.nsqfLevel,
      confidence,
      method: matchedByLlm ? "llm" : "keyword",
      pmajayVerified: Boolean(pmajayMatch),
      pmajayCourse,
      nsqfExpired: matchExpired,
      proposedOccupations: match.proposedOccupations ?? [],
    });
  }

  // Rank by confidence so the "best match" the client shows really is the
  // best one. Results used to come back in whatever order the model listed
  // them, which did not track its own scores — a 35% match could be presented
  // above a 50% one.
  const ranked = results.sort((a, b) => b.confidence - a.confidence);

  // A guess we do not believe should not be stated back as fact. "I do
  // something related to cotton" scores very low precisely because the trade
  // is genuinely ambiguous — weaving, spinning and farming are all plausible —
  // and telling that beneficiary "you have experience in Shuttle Loom
  // Operator" is worse than admitting we did not follow. Below the floor we
  // report unknown, which is the same path as no match: the client keeps them
  // on the question and asks them to say it again.
  if (ranked.length > 0 && ranked[0].confidence < TUNING.minConfidence) {
    return [unknownMapping(transcript)];
  }
  return ranked;
}
