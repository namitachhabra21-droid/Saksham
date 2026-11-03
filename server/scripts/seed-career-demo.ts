/** Non-destructive, idempotent demo fixtures. These are never live vacancies. */
import { prisma } from '../src/lib/prisma.js';
import { careerCatalog, buildCareerPlan, type CareerProfile } from '../src/services/career.js';

async function main() {
  let count = 0;
  for (const p of careerCatalog.professions) {
    for (const s of p.specializations) {
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
          skillTokens: p.id === 'teaching' ? ['teaching', 'academic-tutoring'] : p.id === 'tailoring' ? ['tailoring', 'embroidery'] : p.id === 'beauty' ? ['beautician', 'hair-styling', 'beauty-therapy'] : ['electrical', 'solar'],
          state: 'Delhi', district: 'New Delhi', source: 'SAMPLE' as const,
          description: `${en.searchTitle}. Demonstration only. In-person role; full-time or part-time schedule to discuss. ${p.id === 'teaching' && s.id !== 'preschool' ? 'Home tuition or online tutoring available in this demo.' : ''}`,
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
