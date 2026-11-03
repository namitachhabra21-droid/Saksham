import { test, expect, type Page } from '@playwright/test';

// Run against the Expo web demo: CAREER_E2E=1 BASE_URL=http://localhost:8081 npm --prefix website run test:e2e -- career.spec.ts
test.skip(!process.env.CAREER_E2E, 'Set CAREER_E2E=1 to test the Expo demo, independently of the public website.');
const appUrl = process.env.BASE_URL ?? 'http://localhost:8081';
const apiUrl = process.env.API_URL ?? 'http://localhost:4000';

type Case = {
  language: 'en' | 'hi'; trade: string; phrase: string; spec: string;
  /** NSQF title (in the UI language) for an expert and for a beginner with this specialization */
  expert: string; beginner: string; otherSpecJob: RegExp; login?: boolean;
};
const CASES: Case[] = [
  { language: 'en', trade: 'tailoring', phrase: 'I stitch blouses and suits', spec: 'womenswear', expert: 'Pattern Master - Apparel', beginner: 'Tailor (Darzi)', otherSpecJob: /Alteration Tailor|Sewing Machine Operator/, login: true },
  { language: 'hi', trade: 'beauty', phrase: 'मैं ब्यूटी पार्लर में बाल काटती हूँ और मेकअप करती हूँ', spec: 'hair', expert: 'सीनियर हेयर ड्रेसर और स्टाइलिस्ट', beginner: 'सहायक हेयर ड्रेसर', otherSpecJob: /मेकअप आर्टिस्ट|ब्यूटी थेरेपिस्ट/ },
  { language: 'en', trade: 'electrical', phrase: 'I do house wiring and electrical repairs', spec: 'domestic', expert: 'Smart Electrician', beginner: 'Helper Electrician', otherSpecJob: /Solar|Industrial Electrician/ },
];

async function answerSurvey(page: Page, c: Case, catalog: any, level: 'expert' | 'beginner') {
  const prof = catalog.professions.find((p: { id: string }) => p.id === c.trade);
  const radio = (label: string) => page.getByRole('radio', { name: new RegExp(`^(✓ )?${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) });
  const next = () => page.getByRole('button', { name: c.language === 'en' ? 'Continue' : 'आगे बढ़ें', exact: true }).click();
  for (const q of [...catalog.common, ...prof.questions]) {
    await expect(page.getByText(q.label[c.language], { exact: true })).toBeVisible();
    const option = q.id === 'experience' ? q.options.find((o: { id: string }) => o.id === (level === 'expert' ? '3plus' : 'new'))
      : ['mode', 'availability', 'digital'].includes(q.id) ? q.options[q.id === 'availability' ? 1 : 0]
        : q.options[level === 'expert' ? q.options.length - 1 : 0];
    await radio(option.label[c.language]).click();
    await next();
  }
  await page.getByRole('textbox', { name: c.language === 'en' ? 'State' : 'राज्य', exact: true }).fill('Delhi');
  await page.getByRole('textbox', { name: c.language === 'en' ? 'District / city' : 'ज़िला / शहर', exact: true }).fill('New Delhi');
  await page.getByRole('button', { name: c.language === 'en' ? 'Choose my goal' : 'अपना लक्ष्य चुनें', exact: true }).click();
  await expect(page).toHaveURL(/\/confirm$/);
}

for (const c of CASES) {
  test(`${c.language} ${c.trade}: speech → survey → answers change the NSQF qualification, courses and jobs`, async ({ page, request }) => {
    test.setTimeout(150_000);
    page.setDefaultTimeout(20_000);
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width: 430, height: 932 });
    await page.goto(appUrl);
    await page.getByText('Get Started · शुरू करें', { exact: true }).click();
    await page.getByRole('button', { name: c.language === 'en' ? 'English, English' : 'Hindi, हिन्दी', exact: true }).click();
    await page.goto(`${appUrl}/main/speak`);
    await page.getByText(c.language === 'en' ? 'Type instead' : 'लिखकर बताएं', { exact: true }).click();
    await page.getByRole('textbox').fill(c.phrase);
    await page.getByText(c.language === 'en' ? 'Send' : 'भेजें', { exact: true }).click();
    await expect(page).toHaveURL(/\/survey$/, { timeout: 60_000 });

    const catalog = await (await request.get(`${apiUrl}/api/career/catalog`)).json();
    expect(catalog.professions.map((p: { id: string }) => p.id)).toEqual(['tailoring', 'beauty', 'electrical']);
    const prof = catalog.professions.find((p: { id: string }) => p.id === c.trade);
    // What they said pre-selects the trade and the specialization.
    await expect(page.getByRole('radio', { name: `✓ ${prof.label[c.language]}` })).toBeVisible();
    await expect(page.getByRole('radio', { name: `✓ ${prof.specializations.find((s: { id: string }) => s.id === c.spec).label[c.language]}` })).toBeVisible();
    await page.getByRole('button', { name: c.language === 'en' ? 'Continue' : 'आगे बढ़ें', exact: true }).click();
    await answerSurvey(page, c, catalog, 'expert');

    // Jobs, as an expert: their level first, nothing from another specialization.
    await page.getByRole('button', { name: c.language === 'en' ? 'Find work / employment' : 'काम या रोज़गार ढूँढना', exact: true }).click();
    await expect(page).toHaveURL(/\/results$/, { timeout: 30_000 });
    await expect(page.getByText(c.language === 'en' ? 'NSQF qualifications for you' : 'आपके लिए NSQF योग्यताएँ', { exact: true })).toBeVisible();
    await expect(page.getByText(c.expert, { exact: true }).first()).toBeVisible();
    await expect(page.getByText(c.otherSpecJob).filter({ visible: true })).toHaveCount(0);
    await expect(page.getByText(/Trainee|प्रशिक्षु/).filter({ visible: true })).toHaveCount(0);
    await page.screenshot({ path: `../artifacts/career-jobs-${c.language}-${c.trade}.png`, fullPage: true });

    if (c.login) {
      // An unauthenticated application returns to this exact plan after login.
      await page.getByRole('button', { name: 'Apply', exact: true }).first().click();
      await expect(page).toHaveURL(/\/auth\?returnTo=/);
      await page.getByPlaceholder('Mobile number', { exact: true }).fill('9000000001');
      await page.getByPlaceholder('Password', { exact: true }).fill('demo123');
      await page.getByRole('button', { name: 'Log in', exact: true }).click();
      await expect(page).toHaveURL(/\/results$/);
      await page.getByRole('button', { name: 'View my applications and status', exact: true }).click();
      await expect(page).toHaveURL(/\/applications$/);
      await expect(page.getByRole('button', { name: 'Refresh status', exact: true })).toBeVisible();
      await page.getByRole('button', { name: 'Back', exact: true }).click();
      await expect(page).toHaveURL(/\/results$/);
    }

    // Change the answers to a beginner and ask for training: a different qualification.
    await page.getByRole('button', { name: c.language === 'en' ? 'Change your answers or goal' : 'अपने उत्तर या लक्ष्य बदलें', exact: true }).click();
    await expect(page).toHaveURL(/\/survey$/);
    await page.getByRole('button', { name: c.language === 'en' ? 'Continue' : 'आगे बढ़ें', exact: true }).click();
    await answerSurvey(page, c, catalog, 'beginner');
    await page.getByRole('button', { name: c.language === 'en' ? 'I want training' : 'ट्रेनिंग करना चाहता हूँ', exact: true }).click();
    await expect(page).toHaveURL(/\/results$/, { timeout: 30_000 });
    const visible = (t: string) => page.getByText(t, { exact: true }).filter({ visible: true });
    await expect(visible(c.beginner).first()).toBeVisible();
    await expect(visible(c.expert)).toHaveCount(0);
    await expect(page.getByText(/PM-AJAY ·/).filter({ visible: true }).first()).toBeVisible();
    await page.screenshot({ path: `../artifacts/career-training-${c.language}-${c.trade}.png`, fullPage: true });
    expect(errors).toEqual([]);
  });
}
