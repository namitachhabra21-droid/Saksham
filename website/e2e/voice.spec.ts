import { test, expect, chromium } from '@playwright/test';
import { resolve } from 'node:path';

test.skip(!process.env.VOICE_E2E, 'Set VOICE_E2E=1 and run the local speech setup first.');
const appUrl = process.env.BASE_URL ?? 'http://localhost:8081';
for (const language of ['en', 'hi', 'hinglish-roman'] as const) {
  test.describe(`real ${language} audio`, () => {
    test('microphone → actual recorded audio → local Whisper → editable review → confirmed skill survey', async () => {
      test.setTimeout(120_000);
      const browser = await chromium.launch({ args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', `--use-file-for-fake-audio-capture=${resolve('../artifacts/voice', `teacher-${language}.wav`)}%noloop`] });
      const context = await browser.newContext();
      const page = await context.newPage();
      // Test the unsupported-browser path using real MediaRecorder audio and
      // the real local model, rather than a mocked transcription response.
      await page.addInitScript(() => {
        Object.defineProperty(window, 'SpeechRecognition', { value: undefined, configurable: true });
        Object.defineProperty(window, 'webkitSpeechRecognition', { value: undefined, configurable: true });
      });
      try {
      await context.grantPermissions(['microphone'], { origin: appUrl });
      await page.goto(appUrl);
      await page.getByRole('button', { name: 'Get Started · शुरू करें', exact: true }).click();
      await page.getByRole('button', { name: 'English, English', exact: true }).click();
      await page.goto(`${appUrl}/main/speak`);
      const result = page.waitForResponse(r => r.url().endsWith('/api/assistant/transcribe') && r.request().method() === 'POST', { timeout: 100_000 });
      await page.getByRole('button', { name: 'Start recording', exact: true }).last().click();
      await expect(page.getByRole('button', { name: 'Stop recording', exact: true }).last()).toBeVisible();
      // Let the WAV fixture actually play through Chromium's microphone.
      await page.waitForTimeout(6500);
      const stop = page.getByRole('button', { name: 'Stop recording', exact: true }).last();
      if (await stop.isVisible()) await stop.click();
      const response = await result;
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.stt.provider).toBe('local-whisper');
      expect(data.transcript.trim().length).toBeGreaterThan(15);
      if (language === 'en') expect(data.transcript).toMatch(/teach|mathematic|class/i);
      const transcript = page.getByRole('textbox');
      await expect(transcript).toHaveValue(data.transcript);
      await expect(page.getByText('I heard this. Review or edit it, then send.', { exact: true })).toBeVisible();
      // Exercise the explicit review/edit step. This does not assert word-perfect
      // Hindi ASR: local fallback accuracy still needs human confirmation.
      if (language !== 'en') await transcript.fill('मैं कक्षा 12 के बच्चों को गणित पढ़ाती हूँ।');
      await page.getByRole('button', { name: 'Send', exact: true }).click();
      await expect(page).toHaveURL(/\/survey$/, { timeout: 30_000 });
      } finally { await browser.close(); }
    });
  });
}

test('blocked microphone has a visible error and typing still works', async ({ page }) => {
  // Deny the real browser permission, rather than faking the recorder or STT.
  await page.context().clearPermissions();
  await page.goto(appUrl);
  await page.getByRole('button', { name: 'Get Started · शुरू करें', exact: true }).click();
  await page.getByRole('button', { name: 'English, English', exact: true }).click();
  await page.goto(`${appUrl}/main/speak`);
  await page.getByRole('button', { name: 'Start recording', exact: true }).last().click();
  await expect(page.getByRole('alert')).toContainText('Microphone access is blocked');
  await page.getByRole('button', { name: 'Type instead', exact: true }).click();
  await page.getByRole('textbox').fill('I do tailoring');
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(page).toHaveURL(/\/survey$/);
});

test('speech API rejects silence and returns real Hindi and English audio replies', async ({ request }) => {
  test.setTimeout(120_000);
  const silence = Buffer.alloc(44 + 16000 * 2 * 2);
  silence.write('RIFF', 0); silence.writeUInt32LE(silence.length - 8, 4); silence.write('WAVEfmt ', 8); silence.writeUInt32LE(16, 16);
  silence.writeUInt16LE(1, 20); silence.writeUInt16LE(1, 22); silence.writeUInt32LE(16000, 24); silence.writeUInt32LE(32000, 28);
  silence.writeUInt16LE(2, 32); silence.writeUInt16LE(16, 34); silence.write('data', 36); silence.writeUInt32LE(silence.length - 44, 40);
  const empty = await request.post('http://localhost:4000/api/assistant/transcribe', { multipart: { language: 'en', audio: { name: 'silence.wav', mimeType: 'audio/wav', buffer: silence } } });
  expect(empty.status()).toBe(503);
  expect((await empty.json()).error).toContain('No clear speech');
  for (const language of ['hi', 'en']) {
    const voice = await request.post('http://localhost:4000/api/assistant/tts', { data: { language, text: language === 'hi' ? 'नमस्ते, अपना हुनर बताइए।' : 'Hello. Tell me about your skills.' } });
    const data = await voice.json();
    expect(data.format).toBe('wav');
    expect(data.audioUrl).toMatch(/^data:audio\/wav;base64,/);
    expect(Buffer.from(data.audioUrl.split(',')[1], 'base64').subarray(0, 4).toString()).toBe('RIFF');
  }
});
