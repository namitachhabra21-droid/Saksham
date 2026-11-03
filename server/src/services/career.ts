import { z } from 'zod';
import catalog from './career-catalog.json';
import { decideStep, isFocusProfession, pickQualifications, FOCUS_PROFESSIONS } from './careerQualifications.js';

export { catalog as careerCatalog };
/** What the survey offers: only the focus trades, each with an NSQF ladder.
 *  Teaching stays valid in the schema (tests, saved profiles) but is not offered,
 *  because NQR has no school-teacher qualification to map it to. */
export const surveyCatalog = { ...catalog, professions: catalog.professions.filter(p => (FOCUS_PROFESSIONS as readonly string[]).includes(p.id)) };
export const careerProfileSchema = z.object({
  profession: z.enum(['teaching', 'tailoring', 'beauty', 'electrical']),
  specialization: z.string().max(50),
  answers: z.record(z.string().max(50)),
  state: z.string().trim().min(2).max(80),
  district: z.string().trim().min(2).max(80),
  notes: z.string().trim().max(1000).default(''),
}).superRefine((profile, ctx) => {
  const profession = catalog.professions.find(p => p.id === profile.profession)!;
  if (!profession.specializations.some(s => s.id === profile.specialization)) {
    ctx.addIssue({ code: 'custom', path: ['specialization'], message: 'Choose a specialization' });
  }
  const questions = [...catalog.common, ...profession.questions];
  for (const q of questions) {
    if (!q.options.some(o => o.id === profile.answers[q.id])) {
      ctx.addIssue({ code: 'custom', path: ['answers', q.id], message: 'Choose a valid answer' });
    }
  }
  for (const key of Object.keys(profile.answers)) {
    if (!questions.some(q => q.id === key)) ctx.addIssue({ code: 'custom', path: ['answers', key], message: 'Unknown question' });
  }
});
export type CareerProfile = z.infer<typeof careerProfileSchema>;
export type CareerIntent = 'jobs' | 'training' | 'certificate' | 'guidance';
export type CareerPlan = ReturnType<typeof buildCareerPlan>;

const roles: Record<string, Record<string, [string, string]>> = {
  teaching: {
    preschool: ['Preschool Teacher', 'प्रीस्कूल शिक्षक'], primary: ['Primary Teacher', 'प्राथमिक शिक्षक'],
    secondary: ['Secondary Tutor', 'माध्यमिक ट्यूटर'], senior: ['Senior Secondary Tutor', 'उच्च माध्यमिक ट्यूटर'], exam: ['Exam Preparation Tutor', 'प्रतियोगी परीक्षा ट्यूटर'],
  },
  tailoring: { alterations: ['Alteration Tailor', 'कपड़ों की फिटिंग के दर्जी'], womenswear: ['Womenswear Tailor', 'महिलाओं के कपड़ों के दर्जी'], industrial: ['Sewing Machine Operator', 'सिलाई मशीन ऑपरेटर'], embroidery: ['Embroidery Artisan', 'कढ़ाई कारीगर'] },
  beauty: { hair: ['Hair Stylist', 'हेयर स्टाइलिस्ट'], skin: ['Beauty Therapist', 'ब्यूटी थेरेपिस्ट'], bridal: ['Bridal Makeup Artist', 'ब्राइडल मेकअप आर्टिस्ट'], general: ['Beauty Parlour Worker', 'ब्यूटी पार्लर कर्मी'] },
  electrical: { domestic: ['Domestic Electrician', 'घरेलू इलेक्ट्रीशियन'], maintenance: ['Electrical Maintenance Technician', 'विद्युत रखरखाव तकनीशियन'], solar: ['Solar Installation Technician', 'सोलर इंस्टॉलेशन तकनीशियन'], industrial: ['Industrial Electrician', 'औद्योगिक इलेक्ट्रीशियन'] },
};

/** Structured answers, not free-text keyword guesses, determine the pathway. */
export function buildCareerPlan(profile: CareerProfile, intent: CareerIntent, language: string) {
  const hi = language === 'hi';
  const text = (en: string, hindi: string) => hi ? hindi : en;
  const a = profile.answers;
  const p = catalog.professions.find(p => p.id === profile.profession)!;
  const specialization = p.specializations.find(s => s.id === profile.specialization)!;
  const subject = p.questions.find(q => q.id === 'subject')?.options.find(o => o.id === a.subject);
  const role = roles[profile.profession][profile.specialization];
  const roleTitle = [subject && a.subject !== 'all' ? subject.label[hi ? 'hi' : 'en'] : '', role[hi ? 1 : 0]].filter(Boolean).join(' ');
  const searchTitle = [subject && a.subject !== 'all' ? subject.label.en : '', role[0]].filter(Boolean).join(' ');
  const beginner = a.experience === 'new' || a.experience === 'under1';
  const gaps: string[] = [];
  const modules: string[] = [];
  const add = (en: string, hindi: string) => modules.push(text(en, hindi));
  if (profile.profession === 'teaching') {
    add(`${specialization.label.en}: lesson planning, classroom practice and assessment`, `${specialization.label.hi}: पाठ योजना, कक्षा अभ्यास और मूल्यांकन`);
    if (subject) add(`${subject.label.en}: prepare a 15-minute demonstration lesson`, `${subject.label.hi}: 15 मिनट का डेमो पाठ तैयार करें`);
    if (a.credential === 'none' || a.credential === 'graduate') gaps.push(text('For formal school roles, check the vacancy’s teacher education and CTET / state TET requirements. Tutoring and school eligibility are different.', 'स्कूल की नौकरी के लिए विज्ञापन में शिक्षक शिक्षा और CTET / राज्य TET की शर्तें जाँचें। ट्यूशन और स्कूल की पात्रता अलग हैं।'));
    if (a.setting === 'new') add('Supervised teaching practice and student feedback', 'निगरानी में पढ़ाने का अभ्यास और विद्यार्थियों की प्रतिक्रिया');
    if (a.setting === 'online' || a.mode === 'online') add('Online lesson delivery, whiteboard and student engagement', 'ऑनलाइन पाठ, व्हाइटबोर्ड और विद्यार्थियों की भागीदारी');
  } else if (profile.profession === 'tailoring') {
    add(`${specialization.label.en}: measurements, fabric handling and quality checks`, `${specialization.label.hi}: नाप, कपड़े की समझ और गुणवत्ता जाँच`);
    if (a.technique === 'basic') add('Measurement, cutting and pattern foundations', 'नाप, कटिंग और पैटर्न की बुनियाद');
    if (a.equipment === 'none') gaps.push(text('Arrange supervised machine practice before applying for machine operator roles.', 'मशीन ऑपरेटर की नौकरी से पहले निगरानी में मशीन चलाने का अभ्यास करें।'));
    if (a.technique === 'pattern') add('Advanced patterns, fitting and order costing', 'उन्नत पैटर्न, फिटिंग और ऑर्डर की लागत');
    if (a.equipment === 'industrial') add('Industrial machine maintenance and production quality', 'औद्योगिक मशीन का रखरखाव और उत्पादन की गुणवत्ता');
  } else if (profile.profession === 'beauty') {
    add(`${specialization.label.en}: consultation, practical technique and aftercare`, `${specialization.label.hi}: परामर्श, व्यावहारिक तकनीक और बाद की देखभाल`);
    if (a.hygiene !== 'certified') gaps.push(text('Complete hygiene, patch testing and client safety practice.', 'स्वच्छता, पैच टेस्ट और ग्राहक सुरक्षा का अभ्यास पूरा करें।'));
    if (a.equipment === 'none') gaps.push(text('Ask the training centre about shared kits before paying for equipment.', 'किट खरीदने से पहले प्रशिक्षण केंद्र से साझा किट की सुविधा पूछें।'));
    if (a.equipment === 'professional') add('Portfolio photography and client booking', 'पोर्टफोलियो की फ़ोटो और ग्राहक बुकिंग');
  } else {
    add(`${specialization.label.en}: supervised practical work and fault diagnosis`, `${specialization.label.hi}: निगरानी में व्यावहारिक काम और खराबी की पहचान`);
    if (a.safety !== 'trained' || a.credential === 'none') gaps.push(text('Start with supervised safety training; do not work independently on live circuits. Check employer and local authorization requirements.', 'पहले निगरानी में सुरक्षा प्रशिक्षण लें; चालू सर्किट पर स्वतंत्र काम न करें। नियोक्ता और स्थानीय अनुमति की शर्तें जाँचें।'));
    if (a.credential === 'iti') add('Read technical drawings and document test results', 'तकनीकी ड्रॉइंग पढ़ना और टेस्ट के परिणाम लिखना');
  }
  add(beginner ? 'Foundation practice with a mentor' : 'Advanced practice and a portfolio of previous work', beginner ? 'प्रशिक्षक के साथ बुनियादी अभ्यास' : 'उन्नत अभ्यास और पिछले काम का पोर्टफोलियो');
  if (a.mode === 'home') add('Home workspace, client communication and pricing', 'घर पर कार्यस्थल, ग्राहकों से बातचीत और मूल्य तय करना');
  if (a.digital === 'no') gaps.push(text('Prefer a nearby centre or phone support; online-only options need reliable internet.', 'नज़दीकी केंद्र या फ़ोन सहायता चुनें; केवल ऑनलाइन विकल्प के लिए भरोसेमंद इंटरनेट चाहिए।'));
  const ready = gaps.length === 0 && !beginner;
  const mode = catalog.common.find(q => q.id === 'mode')!.options.find(o => o.id === a.mode)!.label[hi ? 'hi' : 'en'];
  const time = catalog.common.find(q => q.id === 'availability')!.options.find(o => o.id === a.availability)!.label[hi ? 'hi' : 'en'];
  const experience = catalog.common.find(q => q.id === 'experience')!.options.find(o => o.id === a.experience)!.label[hi ? 'hi' : 'en'];
  const summary = text(`${roleTitle} • ${experience} • ${mode} • ${time} • ${profile.district}, ${profile.state}`, `${roleTitle} • ${experience} • ${mode} • ${time} • ${profile.district}, ${profile.state}`);
  const qualifications = pickQualifications(profile, language, catalog);
  const best = qualifications.find(x => x.fit === 'recommended');
  const next = qualifications.find(x => x.fit === 'next');
  const qName = (x: { title: string; titleHi: string; level: number }) => `${hi ? x.titleHi : x.title} (NSQF ${x.level})`;
  const stepWords = isFocusProfession(profile.profession) ? (hi ? ['शुरुआती', 'कामकाजी', 'उन्नत'] : ['starting', 'working', 'advanced'])[decideStep(profile).step] : '';
  const documents = profile.profession === 'teaching'
    ? text('Prepare education certificates, teaching credentials (if held), experience references and a demo lesson.', 'शिक्षा प्रमाणपत्र, शिक्षण योग्यता (यदि है), अनुभव के संदर्भ और डेमो पाठ तैयार करें।')
    : text('Prepare a short work profile, training certificates (if held), references and photos of your work.', 'छोटा कार्य परिचय, प्रशिक्षण प्रमाणपत्र (यदि है), संदर्भ और काम की फ़ोटो तैयार करें।');
  const qualificationStep = best ? (intent === 'jobs'
    ? { title: text('Your level today', 'आज आपका स्तर'), detail: text(`${qName(best)}. Jobs at this level are listed first.${next ? ` Jobs marked “reachable with training” need ${qName(next)}.` : ''}`, `${qName(best)}। इस स्तर की नौकरियाँ पहले दिखाई गई हैं।${next ? ` “प्रशिक्षण से संभव” वाली नौकरियों के लिए ${qName(next)} चाहिए।` : ''}`) }
    : intent === 'certificate'
      ? { title: text('Qualification to get certified in', 'किस योग्यता का प्रमाणपत्र लें'), detail: text(`${qName(best)} through Recognition of Prior Learning (RPL): an assessment of the work you already do.${next ? ` Later: ${qName(next)}.` : ''}`, `${qName(best)} — पूर्व कौशल की मान्यता (RPL) से, यानी आप जो काम पहले से करते हैं उसका मूल्यांकन।${next ? ` बाद में: ${qName(next)}।` : ''}`) }
      : { title: text('Recommended NSQF course', 'सुझाई गई NSQF योग्यता'), detail: text(`${qName(best)}: about ${best.hours} hours (≈ ${best.weeks} weeks at your hours).${next ? ` After that: ${qName(next)}.` : ''}`, `${qName(best)}: लगभग ${best.hours} घंटे (आपके समय के अनुसार ≈ ${best.weeks} हफ़्ते)।${next ? ` उसके बाद: ${qName(next)}।` : ''}`) }) : null;
  const steps = intent === 'jobs' ? [
    { title: text('1. Prepare your application', '1. आवेदन की तैयारी'), detail: documents },
    { title: text('2. Address requirements', '2. ज़रूरी शर्तें पूरी करें'), detail: gaps.join(' ') || text('Check each vacancy’s experience, qualification and schedule requirements.', 'हर नौकरी की अनुभव, योग्यता और समय की शर्तें जाँचें।') },
    { title: text('3. Search and apply', '3. नौकरी खोजें और आवेदन करें'), detail: text(`Review Saksham job cards for ${searchTitle} in ${profile.district} (${a.availability === 'full' ? 'full-time' : 'part-time'} preference). Check employer, pay and eligibility before applying. If no suitable opening is listed, use the optional external search.`, `${roleTitle} के सक्षम जॉब कार्ड देखें; ${profile.district} और ${a.availability === 'full' ? 'पूर्णकालिक' : 'अंशकालिक'} काम की पसंद के अनुसार नियोक्ता, वेतन और पात्रता जाँचें। उपयुक्त नौकरी न मिले तो वैकल्पिक बाहरी खोज खोलें।`) },
    { title: text('4. Track and follow up', '4. आवेदन की स्थिति देखें'), detail: text('Use My job applications to track applications submitted in Saksham. If you apply on an external website, save its reference number and track it there. Opening a link does not submit an application.', 'सक्षम में जमा आवेदन मेरे नौकरी के आवेदन पेज पर देखें। बाहरी वेबसाइट पर आवेदन किया हो तो उसका नंबर सुरक्षित रखें और वहीं स्थिति देखें। लिंक खोलना आवेदन जमा करना नहीं है।') },
  ] : intent === 'certificate' ? [
    { title: text('1. Collect evidence', '1. काम का प्रमाण जुटाएँ'), detail: documents },
    { title: text('2. Check assessment eligibility', '2. मूल्यांकन की पात्रता जाँचें'), detail: text('Ask an authorized centre whether Recognition of Prior Learning is available for your exact trade; teaching credentials have a separate route.', 'अधिकृत केंद्र से अपने काम के लिए पूर्व कौशल की मान्यता (RPL) की उपलब्धता पूछें; शिक्षण योग्यता की प्रक्रिया अलग है।') },
    { title: text('3. Complete gaps and assessment', '3. कमियाँ पूरी करें और मूल्यांकन दें'), detail: gaps.join(' ') || modules[0] },
  ] : [
    { title: text('1. Your learning focus', '1. आपके सीखने का लक्ष्य'), detail: modules.join(' • ') },
    { title: text('2. Choose a suitable batch', '2. सही बैच चुनें'), detail: text(`${mode}; ${time}. Check fees, equipment, teaching language and batch timing with the centre.`, `${mode}; ${time}। केंद्र से शुल्क, उपकरण, पढ़ाने की भाषा और बैच का समय पूछें।`) },
    { title: text('3. Enrol and practise', '3. दाखिला लें और अभ्यास करें'), detail: text('Use the official training portal to find a provider. Confirm eligibility and availability; save your enrolment receipt and build a practice portfolio.', 'आधिकारिक प्रशिक्षण पोर्टल पर केंद्र खोजें। पात्रता और सीटों की पुष्टि करें; दाखिले की रसीद सुरक्षित रखें और अभ्यास का पोर्टफोलियो बनाएँ।') },
  ];
  if (qualificationStep) steps.unshift(qualificationStep);
  steps.forEach((s, i) => { s.title = s.title.replace(/^\d+\.\s*/, `${i + 1}. `); if (!/^\d+\./.test(s.title)) s.title = `${i + 1}. ${s.title}`; });
  const goal = intent === 'jobs' ? text('Below are jobs that match your level and way of working.', 'नीचे आपके स्तर और काम के तरीके से मिलती नौकरियाँ हैं।')
    : intent === 'certificate' ? text('Below are courses and assessment options to certify your skill.', 'नीचे आपके हुनर का प्रमाणपत्र पाने के कोर्स और मूल्यांकन विकल्प हैं।')
      : text('Below are PM-AJAY courses matched to this qualification.', 'नीचे इस योग्यता से मिलते PM-AJAY कोर्स हैं।');
  const spoken = best
    ? text(`Based on your answers, your work is ${roleTitle}, at the ${stepWords} step. The best NSQF qualification for you is ${best.title}, level ${best.level}. ${next ? `Your next step is ${next.title}. ` : ''}${goal}`,
      `आपके जवाबों के अनुसार आप ${roleTitle} हैं, ${stepWords} स्तर पर। आपके लिए सबसे सही NSQF योग्यता है ${best.titleHi}, स्तर ${best.level}। ${next ? `आपका अगला कदम है ${next.titleHi}। ` : ''}${goal}`)
    : [summary, ...steps.map(s => `${s.title}. ${s.detail}`)].join('. ');
  return { intent, profile, roleTitle, searchTitle, summary, ready, gaps, modules, steps, spoken,
    qualifications: qualifications.map(({ course: _course, ...pick }) => pick),
    action: intent === 'jobs'
      ? { label: text('Open National Career Service', 'National Career Service खोलें'), url: 'https://www.ncs.gov.in/' }
      : { label: text('Find training / assessment centres', 'प्रशिक्षण / मूल्यांकन केंद्र खोजें'), url: 'https://www.skillindiadigital.gov.in/' },
    searchHint: text(`Search for: ${searchTitle}. Location: ${profile.district}, ${profile.state}.`, `खोजें: ${searchTitle}। स्थान: ${profile.district}, ${profile.state}।`),
  };
}

/** Canonical English terms let the existing catalogue scorer handle Hindi answers too. */
export function careerDetailText(profile: CareerProfile): string {
  const p = catalog.professions.find(p => p.id === profile.profession)!;
  return [roles[profile.profession][profile.specialization][0],
    profile.profession === 'teaching' ? ({ primary: 'class 1 to 5', secondary: 'class 6 to 10', senior: 'class 11 to 12', preschool: 'preschool nursery', exam: 'teach students competitive exams' } as Record<string, string>)[profile.specialization] : '',
    ...[...catalog.common, ...p.questions].map(q => q.options.find(o => o.id === profile.answers[q.id])?.label.en), profile.notes].filter(Boolean).join('. ');
}
