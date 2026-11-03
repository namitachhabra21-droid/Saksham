import { test, expect } from '@playwright/test';

// Run against the Expo web demo: CAREER_E2E=1 BASE_URL=http://localhost:8081 npm --prefix website run test:e2e -- education.spec.ts
test.skip(!process.env.CAREER_E2E, 'Set CAREER_E2E=1 to test the Expo demo, independently of the public website.');
const appUrl = process.env.BASE_URL ?? 'http://localhost:8081';

// [UI language, answer typed to the education question, label the app should confirm]
const CASES: ['English' | 'Hindi', string, string][] = [
  ['English', 'college second year', 'In college (graduation ongoing)'],
  ['English', 'I graduated last year', 'Graduate (UG degree)'],
  ['English', 'postgraduate', 'Postgraduate'],
  ['English', '10th pass', '10th pass'],
  ['Hindi', 'मैं कॉलेज के दूसरे साल में हूँ', 'कॉलेज में पढ़ रहे हैं (स्नातक जारी)'],
  ['Hindi', 'दसवी पास', '10वीं पास'],
];

for (const [language, answer, label] of CASES) {
  test(`${language}: education answer "${answer}" is understood`, async ({ page }) => {
    test.setTimeout(60_000);
    page.setDefaultTimeout(15_000);
    const en = language === 'English';
    await page.goto(appUrl);
    await page.getByText('Get Started · शुरू करें', { exact: true }).click();
    await page.getByRole('button', { name: en ? 'English, English' : 'Hindi, हिन्दी', exact: true }).click();
    await page.goto(`${appUrl}/onboarding/voice-profile`);
    // After each answer the screen returns to the microphone; open typing again.
    const send = async (text: string) => {
      await page.getByRole('button', { name: en ? 'Type instead' : 'लिखकर बताएं', exact: true }).click();
      await page.getByRole('textbox').fill(text);
      await page.getByRole('button', { name: en ? 'Send' : 'भेजें', exact: true }).click();
      await expect(page.getByText(text, { exact: true }).first()).toBeVisible();
    };
    // answer each question only once it has been asked
    const asked = (question: string) => expect(page.getByText(question, { exact: true }).last()).toBeVisible();
    await asked(en ? "Hello! I'm Saksham. Please tell me your name." : 'नमस्ते! मैं सक्षम हूँ। कृपया अपना नाम बताइए।');
    await send('Asha');
    await asked(en ? 'What is your age?' : 'आपकी उम्र?');
    await send('25');
    await asked(en ? 'How far did you study?' : 'आप कहाँ तक पढ़े हैं?');
    await send(answer);
    // the app's confirmation bubble (the last match: the answer itself may read the same)
    await expect(page.getByText(label, { exact: true }).last()).toBeVisible();
    await expect(page.getByText(en ? "I didn't catch that, please say it again" : 'मुझे समझ नहीं आया, कृपया फिर से बताएं')).toHaveCount(0);
  });
}
