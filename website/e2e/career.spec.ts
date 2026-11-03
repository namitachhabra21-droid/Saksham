import { test, expect } from '@playwright/test';

// Run against the Expo web demo: CAREER_E2E=1 BASE_URL=http://localhost:8081 npm --prefix website run test:e2e -- career.spec.ts
test.skip(!process.env.CAREER_E2E, 'Set CAREER_E2E=1 to test the Expo demo, independently of the public website.');
const appUrl = process.env.BASE_URL ?? 'http://localhost:8081';
for (const language of ['en', 'hi'] as const) {
  test(`${language}: skills → detailed teacher survey → jobs → training`, async ({ page, request }) => {
    test.setTimeout(90_000);
    page.setDefaultTimeout(15_000);
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width: 430, height: 932 });
    await page.goto(appUrl);
    await page.getByText('Get Started · शुरू करें', { exact: true }).click();
    await page.getByRole('button', { name: language === 'en' ? 'English, English' : 'Hindi, हिन्दी', exact: true }).click();
    // The work assistant is available to guests; account onboarding is independent.
    await page.goto(`${appUrl}/main/speak`);
    await page.getByText(language === 'en' ? 'Type instead' : 'लिखकर बताएं', { exact: true }).click();
    await page.getByRole('textbox').fill(language === 'en' ? 'I teach maths to class 12 students' : 'मैं कक्षा 12 के बच्चों को गणित पढ़ाता हूँ');
    await page.getByText(language === 'en' ? 'Send' : 'भेजें', { exact: true }).click();
    await expect(page).toHaveURL(/\/survey$/, { timeout: 60_000 });
    const catalog = await (await request.get('http://localhost:4000/api/career/catalog')).json();
    const teacher = catalog.professions.find((p: { id: string }) => p.id === 'teaching');
    const choose = async (label: string) => page.getByRole('radio', { name: label, exact: true }).click();
    const next = async () => page.getByRole('button', { name: language === 'en' ? 'Continue' : 'आगे बढ़ें', exact: true }).click();
    await choose(teacher.specializations.find((s: { id: string }) => s.id === 'senior').label[language]);
    await next();
    const selections: Record<string, string> = { experience: '3plus', mode: 'local', availability: 'half', digital: 'computer', subject: 'maths', credential: 'tet', setting: 'school' };
    for (const q of [...catalog.common, ...teacher.questions]) {
      await expect(page.getByText(q.label[language], { exact: true })).toBeVisible();
      await choose(q.options.find((o: { id: string }) => o.id === selections[q.id]).label[language]);
      await next();
    }
    await page.getByRole('textbox', { name: language === 'en' ? 'State' : 'राज्य', exact: true }).fill('Delhi');
    await page.getByRole('textbox', { name: language === 'en' ? 'District / city' : 'ज़िला / शहर', exact: true }).fill('New Delhi');
    await page.getByRole('button', { name: language === 'en' ? 'Choose my goal' : 'अपना लक्ष्य चुनें', exact: true }).click();
    await expect(page).toHaveURL(/\/confirm$/);
    await page.getByRole('button', { name: language === 'en' ? 'Find work / employment' : 'काम या रोज़गार ढूँढना', exact: true }).click();
    await expect(page).toHaveURL(/\/results$/, { timeout: 30_000 });
    await expect(page.getByText(language === 'en' ? 'Your personalized roadmap' : 'आपकी व्यक्तिगत कार्ययोजना', { exact: true })).toBeVisible();
    await expect(page.getByText(language === 'en' ? '1. Prepare your application' : '1. आवेदन की तैयारी', { exact: true })).toBeVisible();
    await expect(page.getByText(/Preschool Teacher|प्रीस्कूल शिक्षक/, { exact: true })).toHaveCount(0);
    await expect(page.getByText(language === 'en' ? 'Your personalized roadmap' : 'आपकी व्यक्तिगत कार्ययोजना', { exact: true }).locator('..')).toHaveCSS('opacity', '1');
    await page.screenshot({ path: `../artifacts/career-jobs-${language}.png`, fullPage: true });
    if (language === 'en') {
      // An unauthenticated application returns to this exact plan after login.
      await page.getByRole('button', { name: 'Apply', exact: true }).first().click();
      await expect(page).toHaveURL(/\/auth\?returnTo=/);
      await page.getByPlaceholder('Mobile number', { exact: true }).fill('9000000001');
      await page.getByPlaceholder('Password', { exact: true }).fill('demo123');
      await page.getByRole('button', { name: 'Log in', exact: true }).click();
      await expect(page).toHaveURL(/\/results$/);
      await expect(page.getByRole('button', { name: 'Apply', exact: true }).first()).toBeVisible();
      await page.getByRole('button', { name: 'View my applications and status', exact: true }).click();
      await expect(page).toHaveURL(/\/applications$/);
      await expect(page.getByRole('button', { name: 'Refresh status', exact: true })).toBeVisible();
      await page.getByRole('button', { name: 'Back', exact: true }).click();
      await expect(page).toHaveURL(/\/results$/);
    }
    await page.getByRole('button', { name: language === 'en' ? 'Change your answers or goal' : 'अपने उत्तर या लक्ष्य बदलें', exact: true }).click();
    // Saved answers remain selected; walk through them without changing the profile.
    for (let i = 0; i < catalog.common.length + teacher.questions.length + 1; i++) await next();
    await page.getByRole('button', { name: language === 'en' ? 'Choose my goal' : 'अपना लक्ष्य चुनें', exact: true }).click();
    await page.getByRole('button', { name: language === 'en' ? 'I want training' : 'ट्रेनिंग करना चाहता हूँ', exact: true }).click();
    await expect(page).toHaveURL(/\/results$/, { timeout: 30_000 });
    await expect(page.getByText(language === 'en' ? '1. Your learning focus' : '1. आपके सीखने का लक्ष्य', { exact: true })).toBeVisible();
    await expect(page.getByText(language === 'en' ? '1. Prepare your application' : '1. आवेदन की तैयारी', { exact: true }).filter({ visible: true })).toHaveCount(0);
    await expect(page.getByText(language === 'en' ? 'Your personalized roadmap' : 'आपकी व्यक्तिगत कार्ययोजना', { exact: true }).filter({ visible: true }).locator('..')).toHaveCSS('opacity', '1');
    await page.screenshot({ path: `../artifacts/career-training-${language}.png`, fullPage: true });
    expect(errors).toEqual([]);
  });
}
