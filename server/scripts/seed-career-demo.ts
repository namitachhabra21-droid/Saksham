/** Non-destructive, idempotent demo fixtures. These are never live vacancies. */
import { prisma } from '../src/lib/prisma.js';
import { careerCatalog, buildCareerPlan, type CareerProfile } from '../src/services/career.js';
import { LADDERS, PROFESSION_TOKENS, isFocusProfession } from '../src/services/careerQualifications.js';

/**
 * Focus trades get several SAMPLE jobs per specialization, one per NSQF step
 * plus a home-based / relocation option, so experience, work mode and hours
 * visibly change the job list. Fields: [title, Hindi title, step 0|1|2, work
 * arrangement, schedule, wageMin, wageMax].
 */
type Arrangement = 'shop' | 'nearby' | 'home' | 'site' | 'factory';
type Template = [string, string, 0 | 1 | 2, Arrangement, 'Full-time' | 'Part-time', number, number];
const TEMPLATES: Record<string, Record<string, Template[]>> = {
  tailoring: {
    alterations: [
      ['Alteration Helper (Trainee)', 'फिटिंग सहायक (प्रशिक्षु)', 0, 'shop', 'Part-time', 6000, 9000],
      ['Alteration Tailor', 'फिटिंग दर्जी', 1, 'shop', 'Full-time', 11000, 16000],
      ['Master Tailor – Alterations & Fitting', 'मास्टर दर्जी – फिटिंग', 2, 'shop', 'Full-time', 18000, 26000],
      ['Home-based Alteration Orders', 'घर से फिटिंग के ऑर्डर', 0, 'home', 'Part-time', 5000, 10000],
    ],
    womenswear: [
      ['Assistant Ladies Tailor (Trainee)', 'सहायक लेडीज़ दर्जी (प्रशिक्षु)', 0, 'shop', 'Part-time', 6000, 9000],
      ['Ladies Tailor – Blouses & Suits', 'लेडीज़ दर्जी – ब्लाउज़ और सूट', 1, 'shop', 'Full-time', 12000, 18000],
      ['Boutique Pattern Master – Womenswear', 'बुटीक पैटर्न मास्टर – महिलाओं के कपड़े', 2, 'shop', 'Full-time', 20000, 30000],
      ['Home-based Blouse & Suit Stitching', 'घर से ब्लाउज़ और सूट की सिलाई', 1, 'home', 'Part-time', 7000, 14000],
    ],
    industrial: [
      ['Trainee Sewing Machine Operator', 'प्रशिक्षु सिलाई मशीन ऑपरेटर', 0, 'factory', 'Full-time', 10000, 12000],
      ['Specialised Sewing Machine Operator', 'विशेष सिलाई मशीन ऑपरेटर', 1, 'factory', 'Full-time', 13000, 17000],
      ['Sewing Line Supervisor', 'सिलाई लाइन सुपरवाइज़र', 2, 'factory', 'Full-time', 20000, 28000],
    ],
    embroidery: [
      ['Hand Embroidery Helper', 'हाथ कढ़ाई सहायक', 0, 'shop', 'Part-time', 5000, 8000],
      ['Embroidery Machine Operator', 'कढ़ाई मशीन ऑपरेटर', 1, 'factory', 'Full-time', 11000, 15000],
      ['Computerised Embroidery Designer', 'कंप्यूटर कढ़ाई डिज़ाइनर', 2, 'shop', 'Full-time', 18000, 25000],
      ['Home-based Aari & Hand Embroidery Orders', 'घर से आरी और हाथ कढ़ाई के ऑर्डर', 0, 'home', 'Part-time', 5000, 11000],
    ],
  },
  beauty: {
    hair: [
      ['Salon Assistant – Hair (Trainee)', 'सैलून सहायक – बाल (प्रशिक्षु)', 0, 'shop', 'Part-time', 6000, 9000],
      ['Hair Dresser & Stylist', 'हेयर ड्रेसर और स्टाइलिस्ट', 1, 'shop', 'Full-time', 12000, 18000],
      ['Senior Hair Stylist', 'सीनियर हेयर स्टाइलिस्ट', 2, 'shop', 'Full-time', 20000, 30000],
      ['Home-visit Hair Services', 'घर जाकर बालों की सेवा', 1, 'home', 'Part-time', 6000, 14000],
    ],
    skin: [
      ['Junior Beauty Therapist', 'जूनियर ब्यूटी थेरेपिस्ट', 0, 'shop', 'Part-time', 7000, 10000],
      ['Beauty Therapist – Facials & Skin Care', 'ब्यूटी थेरेपिस्ट – फ़ेशियल और स्किन केयर', 1, 'shop', 'Full-time', 12000, 18000],
      ['Senior Beauty Therapist', 'सीनियर ब्यूटी थेरेपिस्ट', 2, 'shop', 'Full-time', 20000, 28000],
      ['Home-visit Facial & Skin Care', 'घर जाकर फ़ेशियल और स्किन केयर', 1, 'home', 'Part-time', 6000, 14000],
    ],
    bridal: [
      ['Makeup Assistant (Trainee)', 'मेकअप सहायक (प्रशिक्षु)', 0, 'shop', 'Part-time', 6000, 9000],
      ['Professional Makeup Artist', 'प्रोफ़ेशनल मेकअप आर्टिस्ट', 1, 'shop', 'Full-time', 14000, 22000],
      ['Bridal Makeup Artist', 'ब्राइडल मेकअप आर्टिस्ट', 2, 'shop', 'Full-time', 22000, 35000],
      ['Freelance Makeup – Home Visits', 'फ़्रीलांस मेकअप – घर जाकर', 1, 'home', 'Part-time', 8000, 20000],
    ],
    general: [
      ['Salon Assistant (Trainee)', 'सैलून सहायक (प्रशिक्षु)', 0, 'shop', 'Part-time', 6000, 9000],
      ['Beauty Parlour Technician', 'ब्यूटी पार्लर तकनीशियन', 1, 'shop', 'Full-time', 11000, 16000],
      ['Beauty Parlour Manager', 'ब्यूटी पार्लर मैनेजर', 2, 'shop', 'Full-time', 18000, 26000],
      ['Home-based Beauty Services', 'घर से ब्यूटी सेवाएँ', 0, 'home', 'Part-time', 5000, 12000],
    ],
  },
  electrical: {
    domestic: [
      ['Helper Electrician', 'हेल्पर इलेक्ट्रीशियन', 0, 'nearby', 'Full-time', 9000, 12000],
      ['Assistant Electrician – House Wiring', 'सहायक इलेक्ट्रीशियन – घर की वायरिंग', 1, 'nearby', 'Full-time', 13000, 18000],
      ['Smart Home Electrician', 'स्मार्ट होम इलेक्ट्रीशियन', 2, 'nearby', 'Full-time', 18000, 26000],
      ['Local Electrician – Repair Calls Nearby', 'स्थानीय इलेक्ट्रीशियन – आसपास मरम्मत', 1, 'nearby', 'Part-time', 7000, 15000],
    ],
    maintenance: [
      ['Maintenance Helper – Electrical', 'मेंटेनेंस सहायक – इलेक्ट्रिकल', 0, 'site', 'Full-time', 9000, 12000],
      ['Electrical Maintenance Technician', 'विद्युत रखरखाव तकनीशियन', 1, 'site', 'Full-time', 14000, 19000],
      ['Maintenance Electrician (Senior)', 'मेंटेनेंस इलेक्ट्रीशियन (सीनियर)', 2, 'site', 'Full-time', 20000, 28000],
    ],
    solar: [
      ['Solar Installation Helper', 'सोलर इंस्टॉलेशन सहायक', 0, 'site', 'Full-time', 9000, 13000],
      ['Solar Panel Installation Technician', 'सोलर पैनल इंस्टॉलेशन तकनीशियन', 1, 'site', 'Full-time', 14000, 20000],
      ['Solar Site Lead Technician', 'सोलर साइट लीड तकनीशियन', 2, 'site', 'Full-time', 20000, 30000],
    ],
    industrial: [
      ['Assistant Electrician – Factory', 'सहायक इलेक्ट्रीशियन – फ़ैक्टरी', 0, 'factory', 'Full-time', 11000, 14000],
      ['Industrial Electrician', 'औद्योगिक इलेक्ट्रीशियन', 1, 'factory', 'Full-time', 15000, 21000],
      ['Electrical Supervisor – Plant', 'इलेक्ट्रिकल सुपरवाइज़र – प्लांट', 2, 'factory', 'Full-time', 22000, 32000],
    ],
  },
};

const ARRANGEMENT_TEXT: Record<Arrangement, string> = {
  shop: 'In-person at a local shop or salon',
  nearby: 'In person: visits homes and shops nearby',
  home: 'Work from home (home-based orders or home visits)',
  site: 'On-site work at customer locations; travel within the city',
  factory: 'Factory role; relocation support available',
};

async function main() {
  let count = 0;
  for (const p of careerCatalog.professions) {
    for (const s of p.specializations) {
      if (isFocusProfession(p.id)) {
        const ladder = LADDERS[p.id][s.id];
        for (const [index, [title, titleHindi, step, arrangement, schedule, wageMin, wageMax]] of TEMPLATES[p.id][s.id].entries()) {
          // the step-1 shop job keeps the original id so existing applications still point at it
          const id = step === 1 && index === 1 ? `career-demo-${p.id}-${s.id}` : `career-demo-${p.id}-${s.id}-${index}`;
          const data = {
            title, titleHindi, employerName: 'Saksham Demo — no real vacancy',
            skillTokens: PROFESSION_TOKENS[p.id], sector: p.id === 'electrical' ? 'Electrical' : p.id === 'beauty' ? 'Beauty & Wellness' : 'Apparel',
            nsqfLevel: ladder[step][0].level, state: 'Delhi', district: 'New Delhi', source: 'SAMPLE' as const,
            description: `${title}. Demonstration only. ${ARRANGEMENT_TEXT[arrangement]}. ${schedule}. Suits NSQF level ${ladder[step][0].level} (${ladder[step][0].title}).`,
            wageMin, wageMax, positions: 1 + (index % 3), active: true,
          };
          await prisma.jobPosting.upsert({ where: { id }, create: { id, ...data }, update: data });
          count++;
        }
        continue;
      }
      const subjects = p.id === 'teaching' && ['senior', 'secondary'].includes(s.id) ? ['maths', 'english', 'science'] : [p.id === 'teaching' ? 'all' : ''];
      for (const subject of subjects) {
        const profile: CareerProfile = { profession: p.id as CareerProfile['profession'], specialization: s.id, state: 'Delhi', district: 'New Delhi', notes: '', answers: Object.fromEntries([...careerCatalog.common, ...p.questions].map(q => [q.id, q.options[0].id])) };
        if (subject) profile.answers.subject = subject;
        const en = buildCareerPlan(profile, 'jobs', 'en');
        const hi = buildCareerPlan(profile, 'jobs', 'hi');
        const id = `career-demo-${p.id}-${s.id}${subject ? `-${subject}` : ''}`;
        const data = {
          title: en.searchTitle, titleHindi: hi.roleTitle,
          employerName: 'Saksham Demo — no real vacancy',
          skillTokens: ['teaching', 'academic-tutoring'],
          state: 'Delhi', district: 'New Delhi', source: 'SAMPLE' as const,
          description: `${en.searchTitle}. Demonstration only. In-person role; full-time or part-time schedule to discuss. ${s.id !== 'preschool' ? 'Home tuition or online tutoring available in this demo.' : ''}`,
          positions: 1, active: true,
        };
        await prisma.jobPosting.upsert({ where: { id }, create: { id, ...data }, update: data });
        count++;
      }
    }
  }
  console.log(`Ready: ${count} clearly labelled SAMPLE job cards in Delhi / New Delhi. Existing jobs and applications preserved.`);
}
main().finally(() => prisma.$disconnect());
