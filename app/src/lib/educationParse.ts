/**
 * Free-text education answer -> one education level.
 *
 * Used when no LLM is configured (and as its fallback). Handles English,
 * romanized Hindi and Devanagari, digits or words, and in-progress study
 * ("college second year", "BA 2nd year", "ग्रेजुएशन कर रही हूँ").
 *
 * KEEP IN SYNC with server/src/services/educationParse.ts — this is the app's offline copy, used only when the API cannot be reached.
 */

export const EDUCATION_LEVELS = ["below_10th", "10th", "12th", "iti_diploma", "undergrad_ongoing", "undergrad", "postgrad"] as const;
export type Education = (typeof EDUCATION_LEVELS)[number];

/** Lower-case, unify digits/punctuation, and drop Devanagari nukta and
 *  chandrabindu so "पढ़ाई"/"पढाई" and "दसवीं"/"दसवी" compare equal. */
function normalize(answer: string): string {
  return ` ${answer
    .toLowerCase()
    .normalize("NFC")
    .replace(/[०-९]/g, (d) => String("०१२३४५६७८९".indexOf(d)))
    .replace(/़/g, "") // nukta
    .replace(/ँ/g, "ं") // chandrabindu -> anusvara
    .replace(/(\d)\s*(st|nd|rd|th)\b/g, "$1th")
    .replace(/[।,.;:!?'"()/\\-]/g, " ")
    .replace(/\+\s*2/g, " plus two ")
    .replace(/\s+/g, " ")
    .trim()} `;
}

const has = (text: string, pattern: RegExp) => pattern.test(text);

// "is still studying" — for college this means the degree is not complete
const ONGOING = /\b(pursuing|studying|currently|doing|appearing|chal raha|chal rahi|kar raha|kar rahi|kar rha|kar rhi|padh raha|padh rahi|padhai kar|semester|sem|abhi|me hun|mein hun|me hu|mein hu|in college|in university|college me|college mein)\b|पढ रह|कर रह|चल रह|सेमेस्टर|साल में|वर्ष में|अभी|में हूं|में हू|कॉलेज में/;
// "has finished" — wins over a bare mention of a year ("graduated last year")
const COMPLETE = /\b(graduated|completed|complete|passed|pass|done|finished|kiya|kar liya|kar li|ho gaya|ho gayi|poora|pura)\b|पूरा|पूरी|पास|किया|कर ली|कर लिया|हो गया|हो गई/;
// "2nd year", "final year", "दूसरे साल" — an explicit year of study
const YEAR_OF_STUDY = /\b(first|1th|second|2th|third|3th|fourth|4th|final)\s*(year|yr|sem\w*)\b|\b[1-4]\s*(year|yr)\b|(पहले|पहला|दूसरे|दूसरा|तीसरे|तीसरा|आखिरी|फाइनल|फर्स्ट|सेकंड|सेकेंड|थर्ड)\s*(साल|वर्ष|ईयर|इयर|सेमेस्टर)/;
const LEFT = /\b(drop ?out|dropped|left|chhod|chod|chhodi|chhoda|incomplete|adhura|adhuri)\b|छोड|अधूर/;
const FAILED = /\b(fail|failed|appearing|compartment|supply)\b|फेल/;

// Devanagari letters are not \w, so "\b" never fires next to them: use (?=\s) instead.
const POSTGRAD = /\b(post ?grad\w*|pg|masters?|m ?a|m ?sc|m ?com|mba|mca|m ?tech|m ?ed|ph ?d|doctorate|m ?phil)\b|पोस्ट ?ग्र[ेै]जु|स्नातकोत्तर|मास्टर|एम ?ए(?=\s)|एम ?एससी|एम ?कॉम|एमबीए|पीएचडी|पीजी/;
const COLLEGE = /\b(grad\w*|degree|bachelor\w*|college|university|b ?a|b ?sc|b ?com|bba|bca|b ?tech|b ?ed|b ?pharm|engineering|llb|mbbs|nursing|hons|honours)\b|ग्र[ेै]जु|स्नातक|कॉलेज|कालेज|डिग्री|यूनिवर्सिटी|विश्वविद्यालय|बी ?ए(?=\s)|बी ?एससी|बी ?कॉम|बी ?टेक|इंजीनियरिंग/;
const ITI = /\b(iti|diploma|polytechnic|poly)\b|आईटीआई|आई टी आई|डिप्लोमा|पॉलिटेक्निक|पोलिटेक्निक/;
const NONE = /\b(never (went|been) to school|no school\w*|not studied|did not study|didn t study|illiterate|uneducated|anpadh|unpadh|nahi padh\w*|nahin padh\w*|padhai nahi|school nahi|kabhi school nahi|no education|none|padhi likhi nahi|padha likha nahi)\b|अनपढ|नहीं पढ|पढाई नहीं|स्कूल नहीं|कभी स्कूल|पढी लिखी नहीं|पढा लिखा नहीं/;

/** Class words, romanized and Devanagari, with optional ordinal suffix (vi, vin, veen, वीं). */
const CLASS_WORDS: [RegExp, number][] = [
  [/\b(baarah|barah|barahvi\w*|baarahvi\w*|barvi\w*|baarvi\w*|barhvi\w*|twelve|twelfth|xii)\b|बारहवी|बारह/, 12],
  [/\b(gyarah|gyaarah|gyarahvi\w*|eleven|eleventh|xi)\b|ग्यारहवी|ग्यारह/, 11],
  [/\b(dasvi\w*|daswi\w*|dasvee\w*|daswee\w*|dasmi|das|dus|ten|tenth)\b|दसवी|दस(?=\s)/, 10],
  [/\b(nauvi\w*|nauvee\w*|nineth|ninth|nine)\b|नौवी/, 9],
  [/\b(aathvi\w*|athvi\w*|aathvee\w*|eighth|eight)\b|आठवी/, 8],
  [/\b(saatvi\w*|satvi\w*|seventh|seven)\b|सातवी/, 7],
  [/\b(chhathi|chhati|chhatvi\w*|sixth|six)\b|छठी|छठवी/, 6],
  [/\b(paanchvi\w*|panchvi\w*|pachvi\w*|fifth|five)\b|पांचवी|पाचवी/, 5],
  [/\b(chauthi|fourth|four)\b|चौथी/, 4],
  [/\b(teesri|tisri|third)\b|तीसरी/, 3],
];
const SCHOOL_CONTEXT = /\b(class|kaksha|std|standard|pass|passed|tak|grade|school|th|fail|me|mein)\b|कक्षा|पास|तक|क्लास|में|वी/;

/** The school class (1–12) the answer names, or null. */
function schoolClass(text: string): number | null {
  // "class 10", "10th", "10 pass", "10 tak", "10वीं"
  const digit = text.match(/(?:\b(?:class|kaksha|std|standard|grade)\s*|कक्षा\s*)(\d{1,2})\b|\b(\d{1,2})(?:th|वी|वीं)?(?=\s|$)/);
  if (digit) {
    const n = Number(digit[1] ?? digit[2]);
    const onlyNumber = /^\s*\d{1,2}(th)?\s*$/.test(text);
    if (n >= 1 && n <= 12 && (digit[1] || onlyNumber || /\d(th|वी|वीं)/.test(text) || SCHOOL_CONTEXT.test(text))) return n;
  }
  const shortAnswer = text.trim().split(' ').length <= 2;
  for (const [pattern, n] of CLASS_WORDS) {
    if (!pattern.test(text)) continue;
    // a bare number word ("das", "ten") needs school context or to be the whole answer; ordinals don't
    const ordinal = /(vi|vee|wi|wee|th|mi)\b|वी/.test(text);
    if (!ordinal && !SCHOOL_CONTEXT.test(text) && !shortAnswer) continue;
    return n;
  }
  return null;
}

export function parseEducation(answer: string): Education | null {
  const text = normalize(answer);
  if (!text.trim()) return null;

  // studying for a PG means a first degree is done
  if (has(text, POSTGRAD)) return (has(text, ONGOING) || has(text, YEAR_OF_STUDY)) && !/\b(completed|complete|done|finished)\b|पूरा|पूरी/.test(text) ? "undergrad" : "postgrad";
  if (has(text, COLLEGE) || has(text, YEAR_OF_STUDY)) {
    if (has(text, LEFT)) return "12th";
    if (has(text, YEAR_OF_STUDY)) return "undergrad_ongoing";
    if (has(text, COMPLETE)) return "undergrad";
    return has(text, ONGOING) ? "undergrad_ongoing" : "undergrad";
  }
  if (has(text, ITI)) return "iti_diploma";
  if (has(text, NONE)) return "below_10th";
  if (/\b(below|less than|under|kam)\s*(10|tenth|matric|dasvi)|\b(10|tenth|dasvi|daswi)\w*\s*(se|tak)?\s*kam\b|(10|दसवी)\w*\s*से कम/.test(text)) return "below_10th";
  if (/\b(intermediate|inter|higher secondary|senior secondary|plus two|hsc|puc)\b|इंटर|उच्च माध्यमिक/.test(text)) return has(text, FAILED) ? "10th" : "12th";

  const n = schoolClass(text);
  if (n !== null) {
    const unfinished = has(text, FAILED) || /\b(padh raha|padh rahi|studying|in class|me hun|mein hun|me hu|mein hu)\b|पढ रह|में हूं|में हू/.test(text);
    if (n === 12) return unfinished ? "10th" : "12th";
    if (n === 11) return "10th";
    if (n === 10) return unfinished ? "below_10th" : "10th";
    return "below_10th";
  }
  if (/\b(matric\w*|high ?school|ssc|sslc|secondary)\b|मैट्रिक|हाई ?स्कूल|माध्यमिक/.test(text)) return has(text, FAILED) ? "below_10th" : "10th";
  if (/\b(primary|middle|middle school|can read|read and write|literate)\b|प्राइमरी|प्राथमिक|मिडिल|साक्षर/.test(text)) return "below_10th";
  return null;
}
