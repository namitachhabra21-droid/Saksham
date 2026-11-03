import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { careerCatalog, careerProfileSchema, buildCareerPlan, surveyCatalog, type CareerProfile } from '../src/services/career.js';
import { FOCUS_PROFESSIONS, LADDERS, decideStep, pickQualifications } from '../src/services/careerQualifications.js';
import { isUpskilling } from '../src/services/careerMatch.js';

const nsqf: { qpCode: string; title: string; nsqfLevel: number; notionalHours: number | null }[] =
  JSON.parse(readFileSync(new URL('../prisma/data/nsqf-qualifications.json', import.meta.url), 'utf8'));

function profile(profession: string, specialization: string, level: 'low' | 'mid' | 'high', overrides: Record<string, string> = {}): CareerProfile {
  const p = careerCatalog.professions.find(x => x.id === profession)!;
  const pick = (options: { id: string }[]) => options[level === 'low' ? 0 : level === 'mid' ? 1 : options.length - 1].id;
  const answers = Object.fromEntries(p.questions.map(q => [q.id, pick(q.options)]));
  Object.assign(answers, { experience: { low: 'new', mid: '1to3', high: '3plus' }[level], mode: 'local', availability: 'half', digital: 'phone' }, overrides);
  return careerProfileSchema.parse({ profession, specialization, answers, state: 'Delhi', district: 'New Delhi', notes: '' });
}

test('every ladder qualification is a real NQR row with the same level and hours', () => {
  for (const [trade, specs] of Object.entries(LADDERS)) {
    for (const [spec, ladder] of Object.entries(specs)) {
      for (const qp of ladder.flat()) {
        const row = nsqf.find(r => r.qpCode === qp.qpCode);
        assert.ok(row, `${trade}/${spec}: ${qp.qpCode} not in nsqf-qualifications.json`);
        assert.equal(row.nsqfLevel, qp.level, `${qp.qpCode} level`);
        assert.equal(row.notionalHours, qp.hours, `${qp.qpCode} hours`);
      }
    }
  }
});

test('every focus specialization has a ladder, and the survey offers only focus trades', () => {
  assert.deepEqual(surveyCatalog.professions.map(p => p.id), [...FOCUS_PROFESSIONS]);
  for (const p of surveyCatalog.professions) for (const s of p.specializations) assert.ok(LADDERS[p.id as 'tailoring'][s.id], `${p.id}/${s.id}`);
});

for (const trade of FOCUS_PROFESSIONS) {
  for (const s of careerCatalog.professions.find(p => p.id === trade)!.specializations) {
    test(`${trade}/${s.id}: beginner and expert get different NSQF qualifications`, () => {
      const beginner = pickQualifications(profile(trade, s.id, 'low'), 'en', careerCatalog);
      const expert = pickQualifications(profile(trade, s.id, 'high'), 'en', careerCatalog);
      const rec = (picks: typeof beginner) => picks.find(p => p.fit === 'recommended')!;
      assert.notEqual(rec(beginner).qpCode, rec(expert).qpCode);
      assert.ok(rec(expert).level >= rec(beginner).level);
      assert.ok(beginner.some(p => p.fit === 'next'), 'a beginner is shown a next step');
      assert.ok(rec(beginner).reason.length > 20);
    });
  }
}

test('specializations in one trade lead to different qualifications', () => {
  const codes = ['alterations', 'industrial', 'embroidery'].map(s => pickQualifications(profile('tailoring', s, 'mid'), 'en', careerCatalog)[0].qpCode);
  assert.equal(new Set(codes).size, codes.length);
});

test('safety gates hold an experienced person at a lower step, and say why', () => {
  const unsafe = profile('electrical', 'domestic', 'high', { safety: 'none' });
  const decision = decideStep(unsafe);
  assert.equal(decision.step, 0);
  assert.ok(decision.unlockedStep > 0 && decision.gate);
  assert.match(pickQualifications(unsafe, 'en', careerCatalog)[0].reason, /safety/i);
  assert.equal(decideStep(profile('beauty', 'skin', 'high', { hygiene: 'none' })).step, 1);
  assert.equal(decideStep(profile('tailoring', 'industrial', 'high', { equipment: 'none' })).step, 0);
});

test('hours per day change the training-weeks estimate', () => {
  const part = pickQualifications(profile('beauty', 'hair', 'mid', { availability: 'part' }), 'en', careerCatalog)[0];
  const full = pickQualifications(profile('beauty', 'hair', 'mid', { availability: 'full' }), 'en', careerCatalog)[0];
  assert.ok(part.weeks > full.weeks);
});

test('training upskills a working person to the next step; jobs and certificates use today\'s level', () => {
  const working = profile('tailoring', 'alterations', 'mid');
  const picks = pickQualifications(working, 'en', careerCatalog);
  assert.equal(isUpskilling(working, 'training', picks), true);
  assert.equal(isUpskilling(working, 'jobs', picks), false);
  assert.equal(isUpskilling(profile('tailoring', 'alterations', 'low'), 'training', pickQualifications(profile('tailoring', 'alterations', 'low'), 'en', careerCatalog)), false);
  const training = buildCareerPlan(working, 'training', 'en');
  const jobs = buildCareerPlan(working, 'jobs', 'en');
  const certificate = buildCareerPlan(working, 'certificate', 'en');
  assert.match(training.steps[0].title, /Train for your next level/);
  assert.match(training.steps[0].detail, /Sampling Tailor/);
  assert.match(training.searchHint, /Sampling Tailor/);
  assert.match(jobs.steps[0].detail, /^Self Employed Tailor/);
  assert.match(certificate.steps[0].detail, /^Self Employed Tailor/);
  assert.match(jobs.action.url, /ncs\.gov\.in/);
  assert.match(training.action.url, /skillindiadigital\.gov\.in/);
  assert.ok(training.actionNote && training.secondaryAction?.url.includes('pmajay'));
  assert.equal(jobs.secondaryAction, undefined);
});

test('the plan names the recommended qualification and has a Hindi spoken summary', () => {
  const p = profile('tailoring', 'womenswear', 'high');
  const en = buildCareerPlan(p, 'training', 'en');
  const hi = buildCareerPlan(p, 'training', 'hi');
  assert.match(en.steps[0].detail, /Pattern Master/);
  assert.match(hi.spoken, /पैटर्न मास्टर/);
  assert.equal(en.qualifications.find(q => q.fit === 'recommended')?.qpCode, 'QG-04-AP-03282-2024-V2-AMHSSC');
});
