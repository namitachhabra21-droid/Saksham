import type { CareerProfile } from './career.js';

/**
 * Survey profile -> NSQF qualification, as an editable, auditable table.
 *
 * Each specialization has a three-step ladder of REAL qualifications from
 * prisma/data/nsqf-qualifications.json (codes, levels and notional hours are
 * copied verbatim; tests/careerQualifications.test.ts checks them against that
 * file). The survey answers choose the step:
 *
 *   points = experience (0–3) + the two trade-specific answers (0–2 each)
 *   0–2 -> step 1 (start here) · 3–5 -> step 2 (working level) · 6–7 -> step 3
 *
 * Safety gates can hold someone at a lower step whatever their points (no live
 * electrical work without safety training, no advanced beauty work without
 * hygiene training, no industrial sewing without machine practice). The reason
 * is spoken back to the user, so nothing here is a black box.
 */

export const FOCUS_PROFESSIONS = ['tailoring', 'beauty', 'electrical'] as const;
export type FocusProfession = (typeof FOCUS_PROFESSIONS)[number];
export function isFocusProfession(id: string): id is FocusProfession {
  return (FOCUS_PROFESSIONS as readonly string[]).includes(id);
}

export interface LadderQp {
  qpCode: string;
  title: string;
  titleHi: string;
  level: number;
  /** notional training hours on NQR */
  hours: number;
  /** PM-AJAY course names that train for this qualification */
  course: RegExp;
}

const q = (qpCode: string, title: string, titleHi: string, level: number, hours: number, course: RegExp): LadderQp =>
  ({ qpCode, title, titleHi, level, hours, course });

// ---- Apparel (AMHSSC and others) ----
const darzi = q('NG-2.5-AP-00739-2023-V1-AMHSSC', 'Tailor (Darzi)', 'दर्जी', 3, 40, /darzi|self employed tailor|women.s tailor/i);
const darziAdvanced = q('NG-03-AP-02338-2024-V1-AMHSSC', 'Darzi - Advanced', 'उन्नत दर्जी', 3, 120, /darzi|dress designing for women|women.s tailor/i);
const selfEmployedTailor = q('QG-2.5-AP-01868-2024-V1.1-AMHSSC', 'Self Employed Tailor', 'स्व-रोज़गार दर्जी', 3, 300, /self employed tailor/i);
const samplingTailor = q('QG-04-AP-01767-2024-V2-AMHSSC', 'Sampling Tailor', 'सैंपलिंग टेलर', 4, 420, /sampling tailor/i);
const patternMaster = q('QG-04-AP-03282-2024-V2-AMHSSC', 'Pattern Master - Apparel', 'पैटर्न मास्टर', 4, 420, /pattern master/i);
const smo = q('QG-2.5-AP-01866-2024-V1.1-AMHSSC, Version 4.0', 'Sewing Machine Operator', 'सिलाई मशीन ऑपरेटर', 3, 300, /^sewing machine operator$/i);
const specialisedSmo = q('QG-3.5-AP-01871-2024-V1.1-AMHSSC  Version 4.0', 'Specialized Sewing Machine Operator', 'विशेष सिलाई मशीन ऑपरेटर', 4, 420, /speciali[sz]ed sewing machine operator/i);
const inlineChecker = q('QG-3.5-AP-03570-2025-V2-AMHSSC', 'Inline Checker - Sewing', 'इनलाइन चेकर – सिलाई', 4, 420, /qc executive.*sewing|quality control inspector/i);
const productionSupervisor = q('QG-05-AP-01777-2024-V2-AMHSSC', 'Production Supervisor- Sewing', 'प्रोडक्शन सुपरवाइज़र – सिलाई', 5, 570, /production supervisor sewing|line supervisor stitching/i);
const handEmbroiderer = q('QG-02-AP-01865-2024-V1.1-AMHSSC , Version 4.0', 'Hand Embroiderer (Addawala)', 'हाथ कढ़ाई कारीगर (अड्डावाला)', 2, 270, /hand embroider|aari|adda/i);
const embroideryMachine = q('QG-03-AP-03571-2025-V2-AMHSSC', 'Embroidery Machine Operator', 'कढ़ाई मशीन ऑपरेटर', 3, 390, /embroi?dary machine operator|embroidery machine/i);
const cadEmbroidery = q('QG-04-AP-03220-2024-V2-DGT', 'Computer Aided Embroidery & Design', 'कंप्यूटर कढ़ाई और डिज़ाइन', 4, 1350, /computeri[sz]ed embroidery|master hand embroiderer/i);

// ---- Beauty & Wellness (BWSSC) ----
const asstHairDresser = q('NG-2.5- BW-00741- 2023-V1- BWSSC', 'Assistant Hair Dresser', 'सहायक हेयर ड्रेसर', 3, 40, /assistant hair dresser|^hairdresser$/i);
const hairDresser = q('2022/BW/BWSSC/06579', 'Hair Dresser & Stylist', 'हेयर ड्रेसर और स्टाइलिस्ट', 4, 510, /^hair dresser & stylist$/i);
const seniorHairDresser = q('QM-05-BW-00440-2023-V1.1-BWSSC', 'Senior Hair Dresser & Stylist', 'सीनियर हेयर ड्रेसर और स्टाइलिस्ट', 5, 690, /senior hair dresser/i);
const juniorBeautyTherapist = q('QG-03-BW-06575-2025-V2-BWSSC', 'Junior Beauty Therapist', 'जूनियर ब्यूटी थेरेपिस्ट', 3, 450, /assistant beauty therapist|assistant beauty & wellness/i);
const beautyTherapist = q('2022/BW/BWSSC/06576', 'Beauty Therapist', 'ब्यूटी थेरेपिस्ट', 4, 510, /^beauty therapist$|beauty parlou?r management/i);
const aestheticSkin = q('QG-04-BW-03600-2025-V2-BWSSC', 'Aesthetic Skin Technician', 'एस्थेटिक स्किन टेक्नीशियन', 4, 690, /aesthetic skin/i);
const seniorBeautyTherapist = q('QG-05-BW-06577-2025-V2-BWSSC', 'Senior Beauty Therapist', 'सीनियर ब्यूटी थेरेपिस्ट', 5, 600, /senior beauty therapist|advanced beauty parlou?r|cosmetologist/i);
const makeupArtist = q('2022/BW/BWSSC/06594', 'Professional Makeup Artist', 'प्रोफ़ेशनल मेकअप आर्टिस्ट', 4, 570, /professional makeup|make-?up artist/i);
const bridalMakeup = q('2022/BW/BWSSC/06584', 'Bridal, Fashion and Portfolio Makeup Artist', 'ब्राइडल, फ़ैशन और पोर्टफ़ोलियो मेकअप आर्टिस्ट', 5, 600, /bridal/i);

// ---- Electrical (Construction / Power / Electronics) ----
const helperElectrician = q('QG-02-CO-03950-2025-V2-CSDCI', 'Helper Electrician', 'हेल्पर इलेक्ट्रीशियन', 2, 270, /helper electrician/i);
const asstElectrician = q('QG-03-CO-03951-2025-V2-CSDCI', 'Assistant Electrician', 'सहायक इलेक्ट्रीशियन', 3, 390, /^assistant electrician$|electrical wiring|electrician domestic/i);
const houseWireman = q('QG-03-CO-00090-2023-V1-WBSC', 'Assistant House Wireman and Motor Winder', 'सहायक हाउस वायरमैन और मोटर वाइंडर', 3, 600, /motor rewinding|electrical winder|domestic electrical appliance/i);
const asstElectricianDomInd = q('QG-03-PW-02422-2024-V1-MSME', 'Assistant Electrician (Domestic cum Industrial)', 'सहायक इलेक्ट्रीशियन (घरेलू व औद्योगिक)', 3, 600, /multi skill technician \(electrical\)|electrical technician/i);
const smartElectrician = q('QG-04-CO-00619-2023-V1-SVSU', 'Smart Electrician', 'स्मार्ट इलेक्ट्रीशियन', 4, 510, /smart energy|electrician - smart/i);
const constructionElectrician = q('QG-04-CO-03952-2025-V2-CSDCI', 'Construction Electrician-LV', 'कंस्ट्रक्शन इलेक्ट्रीशियन (LV)', 4, 450, /construction electrician/i);
const industrialElectrician = q('QG-04-PW-00870-2023-V1-PSSC', 'Industrial Electrician', 'औद्योगिक इलेक्ट्रीशियन', 4, 540, /^industrial electrician$/i);
const electricianDgt = q('QG-4.5-IT-03174-2024-V2-DGT', 'Electrician', 'इलेक्ट्रीशियन (ITI स्तर)', 5, 1350, /supervisor - electrical works|foreman - electrician/i);
const electricianPowerDist = q('QG-4.5-PW-03175-2024-V2-DGT', 'Electrician Power Distribution', 'इलेक्ट्रीशियन – बिजली वितरण', 5, 1350, /lineman|power distribution/i);
const rooftopSolar = q('NG-03-PW-02710-2024-V1-DGT', 'Rooftop Solar PV (Installation & Maintenance)', 'रूफ़टॉप सोलर PV (इंस्टॉलेशन और रखरखाव)', 3, 60, /suryamitra|solar pv installer - electrical|solar pv project helper|solar led technician/i);
const solarTechnician = q('2022/EHW/ESSC/06654', 'Solar Panel Installation Technician', 'सोलर पैनल इंस्टॉलेशन तकनीशियन', 4, 600, /solar panel installation|solar pv maintenance technician|solar pump technician/i);
const solarTrainer = q('NM-04-PW-02711-2024-V1-DGT', 'Rooftop Solar PV (Installation & Maintenance) - Trainer', 'रूफ़टॉप सोलर PV – प्रशिक्षक', 4, 15, /green energy supervisor|rooftop solar grid|solar photovoltaic entrepreneur/i);

type Ladder = [LadderQp[], LadderQp[], LadderQp[]];
export const LADDERS: Record<FocusProfession, Record<string, Ladder>> = {
  tailoring: {
    alterations: [[darzi], [selfEmployedTailor, darziAdvanced], [samplingTailor, patternMaster]],
    womenswear: [[darzi], [darziAdvanced, selfEmployedTailor], [patternMaster, samplingTailor]],
    industrial: [[smo], [specialisedSmo, inlineChecker], [productionSupervisor, inlineChecker]],
    embroidery: [[handEmbroiderer], [embroideryMachine], [cadEmbroidery]],
  },
  beauty: {
    hair: [[asstHairDresser], [hairDresser], [seniorHairDresser]],
    skin: [[juniorBeautyTherapist], [beautyTherapist, aestheticSkin], [seniorBeautyTherapist, aestheticSkin]],
    bridal: [[juniorBeautyTherapist], [makeupArtist], [bridalMakeup]],
    general: [[juniorBeautyTherapist, asstHairDresser], [beautyTherapist, hairDresser], [seniorBeautyTherapist]],
  },
  electrical: {
    domestic: [[helperElectrician], [asstElectrician, houseWireman], [smartElectrician, constructionElectrician]],
    maintenance: [[helperElectrician], [asstElectricianDomInd, houseWireman], [electricianDgt, industrialElectrician]],
    solar: [[rooftopSolar], [solarTechnician], [solarTechnician, solarTrainer]],
    industrial: [[asstElectricianDomInd], [industrialElectrician], [electricianPowerDist, electricianDgt]],
  },
};

/** Lexicon tokens (services/skillLexicon.ts) the trade's courses and jobs carry. */
export const PROFESSION_TOKENS: Record<FocusProfession, string[]> = {
  tailoring: ['tailoring', 'embroidery'],
  beauty: ['beautician', 'hair-styling', 'beauty-therapy', 'makeup-artist'],
  electrical: ['electrical', 'house-wiring', 'solar-installation', 'solar'],
};
/** Course-name words for the trade, to find PM-AJAY courses whose keywords are empty. */
export const PROFESSION_COURSE_TERMS: Record<FocusProfession, string[]> = {
  tailoring: ['tailor', 'sewing', 'embroid', 'embroidary', 'pattern', 'dress designing', 'stitching'],
  beauty: ['beaut', 'hair', 'makeup', 'make-up', 'skin', 'cosmetolog', 'parlour', 'parlor'],
  electrical: ['electric', 'solar', 'wiring', 'wireman', 'winder', 'lineman'],
};
/** Words that mark a course or job as belonging to one specialization (not just the trade). */
export const SPECIALIZATION_TERMS: Record<FocusProfession, Record<string, RegExp>> = {
  tailoring: {
    alterations: /alteration|fitting|self employed tailor|darzi/i,
    womenswear: /women|ladies|blouse|suit|dress designing|sampling tailor|pattern/i,
    industrial: /sewing machine operator|line supervisor|production supervisor|sewing line|qc executive|garment unit/i,
    embroidery: /embroi|aari|zari/i,
  },
  beauty: {
    hair: /hair/i,
    skin: /skin|facial|beauty therapist|cosmetolog/i,
    bridal: /make-?up|bridal/i,
    general: /beauty parlou?r|salon|beauty therapist|beauty & wellness|beauty services|cosmetolog|nail/i,
  },
  electrical: {
    domestic: /electrical wiring|domestic|house|wireman|helper electrician|local electrician|construction electrician|smart (energy|home)/i,
    maintenance: /maintenance|repair|winder|rewinding|multi skill technician|electrical technician/i,
    solar: /solar/i,
    industrial: /industrial|control panel|electrical assembly|lineman|plant|factory/i,
  },
};
/** Trade-matched course names that are out of scope for a livelihood beneficiary. */
export const OUT_OF_SCOPE = /vehicle|\bev\b|automo|aero|avionics|wind power|telecom|\bmine\b|mining|oil & gas|life sciences|airport|engineer|manager|designer|developer|metal|footwear|jute|leather|medical|sewage|knits/i;

export function specializationToken(profile: CareerProfile): string {
  if (profile.profession === 'tailoring') return profile.specialization === 'embroidery' ? 'embroidery' : 'tailoring';
  if (profile.profession === 'beauty') return profile.specialization === 'hair' ? 'hair-styling' : 'beautician';
  if (profile.profession === 'electrical') return profile.specialization === 'solar' ? 'solar-installation' : 'electrical';
  return profile.profession;
}

const ANSWER_POINTS: Record<FocusProfession, Record<string, Record<string, number>>> = {
  tailoring: { equipment: { none: 0, domestic: 1, industrial: 2 }, technique: { basic: 0, cutting: 1, pattern: 2 } },
  beauty: { hygiene: { none: 0, basic: 1, certified: 2 }, equipment: { none: 0, basic: 1, professional: 2 } },
  electrical: { credential: { none: 0, apprentice: 1, iti: 2 }, safety: { none: 0, basic: 1, trained: 2 } },
};
const EXPERIENCE_POINTS: Record<string, number> = { new: 0, under1: 1, '1to3': 2, '3plus': 3 };
/** hours per day for each availability answer, used for the weeks estimate */
export const HOURS_PER_DAY: Record<string, number> = { part: 2, half: 3.5, full: 7 };

export type Step = 0 | 1 | 2;
export interface StepDecision {
  step: Step;
  points: number;
  /** the step the points alone would give, before a safety gate */
  unlockedStep: Step;
  gate: { en: string; hi: string } | null;
}

export function decideStep(profile: CareerProfile): StepDecision {
  const trade = profile.profession as FocusProfession;
  const a = profile.answers;
  const points = (EXPERIENCE_POINTS[a.experience] ?? 0)
    + Object.entries(ANSWER_POINTS[trade] ?? {}).reduce((sum, [question, scale]) => sum + (scale[a[question]] ?? 0), 0);
  const unlockedStep: Step = points <= 2 ? 0 : points <= 5 ? 1 : 2;
  let cap: Step = 2;
  let gate: StepDecision['gate'] = null;
  if (trade === 'electrical' && a.safety === 'none') {
    cap = 0;
    gate = { en: 'Electrical safety training comes first, so you start at the foundation step.', hi: 'पहले बिजली सुरक्षा का प्रशिक्षण ज़रूरी है, इसलिए आप बुनियादी स्तर से शुरू करेंगे।' };
  } else if (trade === 'electrical' && a.safety === 'basic') {
    cap = 1;
    gate = { en: 'Full safety training (not just basic) is needed before the advanced step.', hi: 'उन्नत स्तर से पहले पूरा सुरक्षा प्रशिक्षण (सिर्फ़ बुनियादी नहीं) ज़रूरी है।' };
  } else if (trade === 'beauty' && a.hygiene === 'none') {
    cap = 1;
    gate = { en: 'Hygiene and client-safety training is needed before the advanced step.', hi: 'उन्नत स्तर से पहले स्वच्छता और ग्राहक-सुरक्षा का प्रशिक्षण ज़रूरी है।' };
  } else if (trade === 'tailoring' && profile.specialization === 'industrial' && a.equipment === 'none') {
    cap = 0;
    gate = { en: 'Industrial sewing needs supervised machine practice first, so you start at the foundation step.', hi: 'औद्योगिक सिलाई के लिए पहले निगरानी में मशीन का अभ्यास ज़रूरी है, इसलिए आप बुनियादी स्तर से शुरू करेंगे।' };
  }
  const step = Math.min(unlockedStep, cap) as Step;
  return { step, points, unlockedStep, gate: step < unlockedStep ? gate : null };
}

export type Fit = 'recommended' | 'alternative' | 'next';
export interface QualificationPick extends Omit<LadderQp, 'course'> {
  fit: Fit;
  /** training weeks at the user's chosen hours per day, 6 days a week */
  weeks: number;
  reason: string;
  course: RegExp;
}

function answerLabel(profile: CareerProfile, questionId: string, catalog: CatalogLike, hi: boolean): string | null {
  const p = catalog.professions.find(x => x.id === profile.profession);
  const question = [...catalog.common, ...(p?.questions ?? [])].find(x => x.id === questionId);
  const option = question?.options.find(o => o.id === profile.answers[questionId]);
  return option ? option.label[hi ? 'hi' : 'en'] : null;
}
interface CatalogLike {
  common: { id: string; options: { id: string; label: { en: string; hi: string } }[] }[];
  professions: { id: string; specializations: { id: string; label: { en: string; hi: string } }[]; questions: { id: string; options: { id: string; label: { en: string; hi: string } }[] }[] }[];
}

/**
 * The qualifications to show for this profile: the best fit for today, an
 * alternative at the same level when there is one, and the next step up.
 * Returns [] for professions outside the focus trades.
 */
export function pickQualifications(profile: CareerProfile, language: string, catalog: CatalogLike): QualificationPick[] {
  if (!isFocusProfession(profile.profession)) return [];
  const ladder = LADDERS[profile.profession][profile.specialization];
  if (!ladder) return [];
  const hi = language === 'hi';
  const decision = decideStep(profile);
  const hoursPerDay = HOURS_PER_DAY[profile.answers.availability] ?? 3.5;
  const weeksFor = (hours: number) => Math.max(1, Math.ceil(hours / (hoursPerDay * 6)));
  const experience = answerLabel(profile, 'experience', catalog, hi) ?? '';
  const keyAnswers = Object.keys(ANSWER_POINTS[profile.profession]).map(id => answerLabel(profile, id, catalog, hi)).filter(Boolean).join(', ');
  const stepName = (s: Step) => hi ? ['शुरुआती', 'कामकाजी', 'उन्नत'][s] : ['starting', 'working', 'advanced'][s];
  const newcomer = profile.answers.experience === 'new' || profile.answers.experience === 'under1';
  const duration = (x: LadderQp) => x.hours <= 60
    ? (newcomer
      ? (hi ? `छोटा शुरुआती कोर्स (लगभग ${x.hours} घंटे)।` : `a short starter course (about ${x.hours} hours).`)
      : (hi ? `छोटा कोर्स (लगभग ${x.hours} घंटे) — जो आप पहले से करते हैं उसका प्रमाणपत्र पाने के लिए।` : `a short course (about ${x.hours} hours) — mainly to certify what you already do.`))
    : (hi ? `लगभग ${x.hours} घंटे का प्रशिक्षण — रोज़ लगभग ${hoursPerDay} घंटे देकर करीब ${weeksFor(x.hours)} हफ़्ते।` : `about ${x.hours} hours of training — roughly ${weeksFor(x.hours)} weeks at about ${hoursPerDay} hours a day.`);
  const name = (x: LadderQp) => hi ? x.titleHi : x.title;
  const picks: QualificationPick[] = [];
  const [best, alternative] = ladder[decision.step];
  picks.push({ ...best, fit: 'recommended', weeks: weeksFor(best.hours), reason: hi
    ? `आपके जवाब (${experience}; ${keyAnswers}) ${stepName(decision.step)} स्तर पर आते हैं। NSQF स्तर ${best.level}: ${duration(best)}${decision.gate ? ` ${decision.gate.hi}` : ''}`
    : `Your answers (${experience}; ${keyAnswers}) put you at the ${stepName(decision.step)} step. NSQF level ${best.level}: ${duration(best)}${decision.gate ? ` ${decision.gate.en}` : ''}` });
  if (alternative && alternative.qpCode !== best.qpCode) {
    picks.push({ ...alternative, fit: 'alternative', weeks: weeksFor(alternative.hours), reason: hi
      ? `इसी स्तर का दूसरा विकल्प (NSQF ${alternative.level}): ${duration(alternative)}`
      : `Another option at the same step (NSQF ${alternative.level}): ${duration(alternative)}` });
  }
  if (decision.step < 2) {
    const next = ladder[decision.step + 1][0];
    if (!picks.some(p => p.qpCode === next.qpCode)) {
      picks.push({ ...next, fit: 'next', weeks: weeksFor(next.hours), reason: hi
        ? `अगला कदम: ${name(best)} के बाद ${name(next)} (NSQF ${next.level}) से आगे की नौकरियाँ खुलती हैं। ${duration(next)}`
        : `Next step: after ${name(best)}, ${name(next)} (NSQF ${next.level}) opens higher-level work. ${duration(next).replace(/^./, ch => ch.toUpperCase())}` });
    }
  }
  return picks;
}
