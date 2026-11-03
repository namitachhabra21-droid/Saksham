/** Real API/database smoke check. Cleans up its sample application afterwards. */
import assert from 'node:assert/strict';
import { prisma } from '../src/lib/prisma.js';
import { careerCatalog } from '../src/services/career.js';
const base = process.env.TEST_API_URL ?? 'http://localhost:4000';
async function post(path: string, body: unknown, token?: string) {
  const res = await fetch(`${base}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
  assert.ok(res.ok, `${path}: ${res.status} ${res.ok ? '' : await res.text()}`);
  return res.json();
}
async function main() {
  const p = careerCatalog.professions.find(p => p.id === 'teaching')!;
  const profile = { profession: p.id, specialization: 'senior', state: 'Delhi', district: 'New Delhi', notes: '', answers: Object.fromEntries([...careerCatalog.common, ...p.questions].map(q => [q.id, q.options[0].id])) };
  profile.answers.experience = '3plus'; profile.answers.credential = 'tet'; profile.answers.digital = 'computer';
  const session = await post('/api/assistant/converse', { transcript: 'I teach maths to class 12 students', language: 'en' });
  const jobs = await post('/api/assistant/reprioritise', { sessionId: session.sessionId, intent: 'jobs', profile });
  assert.equal(jobs.recommendations.length, 0);
  assert.ok(jobs.jobs.some((j: { title: string }) => /Mathematics Senior/.test(j.title)));
  assert.ok(jobs.jobs.every((j: { title: string }) => !/preschool|english|primary teacher/i.test(j.title)));
  const training = await post('/api/assistant/reprioritise', { sessionId: session.sessionId, intent: 'training', profile });
  assert.equal(training.jobs.length, 0);
  assert.notDeepEqual(jobs.plan.steps, training.plan.steps);
  const loggedIn = await post('/api/auth/login', { phone: '9000000001', password: 'demo123' });
  // Use a dedicated temporary fixture so we cannot modify an existing application.
  const temp = await prisma.jobPosting.create({ data: { title: 'Workflow test only', employerName: 'Automated test — no real vacancy', skillTokens: ['teaching'], source: 'SAMPLE' } });
  try {
    const first = await post(`/api/jobs/${temp.id}/apply`, {}, loggedIn.token);
    const second = await post(`/api/jobs/${temp.id}/apply`, {}, loggedIn.token);
    assert.equal(first.application.id, second.application.id);
    const mine = await fetch(`${base}/api/jobs/my-applications`, { headers: { Authorization: `Bearer ${loggedIn.token}` } }).then(r => r.json());
    assert.ok(mine.some((r: { jobPostingId: string }) => r.jobPostingId === temp.id));
    const unauthorized = await fetch(`${base}/api/jobs/${temp.id}/apply`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(unauthorized.status, 401);
    console.log('PASS: real survey ranking, separate job/training plans, login, application, duplicate protection and application tracking.');
  } finally { await prisma.jobPosting.delete({ where: { id: temp.id } }); }
}
main().finally(() => prisma.$disconnect());
