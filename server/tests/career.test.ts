import test from 'node:test';
import assert from 'node:assert/strict';
import { careerCatalog, careerProfileSchema, buildCareerPlan, careerDetailText, type CareerProfile } from '../src/services/career.js';
import { profileRelevance } from '../src/services/careerRanking.js';

function profile(profession = 'teaching', specialization = 'senior'): CareerProfile {
  const p = careerCatalog.professions.find(p => p.id === profession)!;
  return careerProfileSchema.parse({ profession, specialization, state: 'Delhi', district: 'New Delhi', notes: '', answers: Object.fromEntries([...careerCatalog.common, ...p.questions].map(q => [q.id, q.options[0].id])) });
}
for (const p of careerCatalog.professions) {
  for (const s of p.specializations) test(`${p.id}/${s.id}: bilingual plans and distinct goals`, () => {
    const input = profile(p.id, s.id);
    const jobs = buildCareerPlan(input, 'jobs', 'en');
    const training = buildCareerPlan(input, 'training', 'en');
    const hindi = buildCareerPlan(input, 'jobs', 'hi');
    assert.notDeepEqual(jobs.steps, training.steps);
    assert.notEqual(jobs.action.url, training.action.url);
    assert.notEqual(jobs.roleTitle, hindi.roleTitle);
    assert.match(jobs.summary, /New Delhi/);
    assert.ok(jobs.steps.length >= 3);
    assert.ok(training.modules.length >= 2);
  });
}
test('reject missing, invalid and irrelevant survey answers', () => {
  const p = profile(); delete p.answers.subject;
  assert.equal(careerProfileSchema.safeParse(p).success, false);
  p.answers.subject = 'made up';
  assert.equal(careerProfileSchema.safeParse(p).success, false);
  p.answers.subject = 'maths'; p.answers.unrelated = 'test';
  assert.equal(careerProfileSchema.safeParse(p).success, false);
});
test('senior maths teacher does not see preschool, primary or English vacancies', () => {
  const p = profile();
  assert.equal(profileRelevance('Preschool teacher', p, 'job'), -1);
  assert.equal(profileRelevance('Primary teacher', p, 'job'), -1);
  assert.equal(profileRelevance('English secondary tutor', p, 'job'), -1);
  assert.ok(profileRelevance('Mathematics secondary tutor', p, 'job') > 0);
});
test('preschool stays distinct from academic tutoring', () => {
  const p = profile('teaching', 'preschool');
  assert.equal(profileRelevance('Senior Maths Tutor', p, 'job'), -1);
  assert.ok(profileRelevance('Preschool teacher', p, 'job') > 0);
});
test('experience, credentials and delivery preferences change the plan', () => {
  const p = profile(); const novice = buildCareerPlan(p, 'training', 'en');
  p.answers.experience = '3plus'; p.answers.credential = 'tet'; p.answers.setting = 'online'; p.answers.mode = 'online'; p.answers.digital = 'computer';
  const experienced = buildCareerPlan(p, 'training', 'en');
  assert.notDeepEqual(novice.modules, experienced.modules);
  assert.notDeepEqual(novice.gaps, experienced.gaps);
  assert.equal(experienced.ready, true);
});
test('Hindi UI answers produce canonical subject terms for catalogue ranking', () => {
  assert.match(careerDetailText(profile()), /Mathematics/);
});
test('safety gaps persist for experienced electricians', () => {
  const p = profile('electrical', 'solar'); p.answers.experience = '3plus';
  assert.equal(buildCareerPlan(p, 'jobs', 'hi').ready, false);
  assert.equal(profileRelevance('Domestic electrician', p, 'job'), -1);
});
test('specialization and work mode exclude irrelevant roles', () => {
  const p = profile('tailoring', 'embroidery');
  assert.equal(profileRelevance('Industrial sewing operator', p, 'job'), -1);
  p.answers.mode = 'online';
  assert.equal(profileRelevance('Embroidery artisan onsite', p, 'job'), -1);
});

test('senior secondary is a teaching level, not evidence of seniority', () => {
  const p = profile();
  assert.ok(profileRelevance('Mathematics Senior Secondary Tutor', p, 'job') > 0);
  assert.equal(profileRelevance('Senior Mathematics Tutor', p, 'job'), -1);
});
