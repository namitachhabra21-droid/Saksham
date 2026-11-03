import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldStopRecording } from '../../app/src/lib/recordingPolicy.ts';

test('continuous voice or loud noise still stops at the hard limit', () => {
  assert.equal(shouldStopRecording({ heardSpeech: true, level: .9, lastVoiceAt: 44900, now: 45000, durationMillis: 45000 }), true);
});
test('a short pause within a sentence does not submit partial speech', () => {
  assert.equal(shouldStopRecording({ heardSpeech: true, level: 0, lastVoiceAt: 3000, now: 4500, durationMillis: 4500 }), false);
});
test('finished speech stops after sustained silence', () => {
  assert.equal(shouldStopRecording({ heardSpeech: true, level: 0, lastVoiceAt: 3000, now: 5400, durationMillis: 5400 }), true);
});
test('silence before the user begins does not immediately stop recording', () => {
  assert.equal(shouldStopRecording({ heardSpeech: false, level: 0, lastVoiceAt: 0, now: 5000, durationMillis: 5000 }), false);
});
test('an unused microphone stops after ten seconds rather than recording forever', () => {
  assert.equal(shouldStopRecording({ heardSpeech: false, level: 0, lastVoiceAt: 0, now: 10000, durationMillis: 10000 }), true);
});

import { extractSkills } from '../src/services/skillLexicon.js';
test('Hindi speech with or without nukta identifies the same profession', () => {
  assert.ok(extractSkills('मैं गणित पढाती हूं').includes('teaching'));
  assert.ok(extractSkills('मैं गणित पढ़ाती हूं').includes('teaching'));
  assert.ok(extractSkills('मुझे टीचिंग का अनुभव है').includes('teaching'));
  assert.ok(!extractSkills('मैं स्कूल के पास रहती हूँ').includes('teaching'));
});

import { startBrowserSpeech, type BrowserRecognizer } from '../../app/src/lib/browserSpeech.ts';
class FakeRecognizer implements BrowserRecognizer {
  static last: FakeRecognizer;
  lang = ''; continuous = false; interimResults = false; maxAlternatives = 1;
  onresult: BrowserRecognizer['onresult'] = null;
  onerror: BrowserRecognizer['onerror'] = null;
  onend: BrowserRecognizer['onend'] = null;
  constructor() { FakeRecognizer.last = this; }
  start() {}
  stop() { this.onresult?.({ results: { length: 1, 0: { isFinal: true, 0: { transcript: 'I teach maths' } } } }); this.onend?.(); }
  abort() { this.onend?.(); }
}
test('browser recognition waits for the final words after Stop', async () => {
  let preview = '';
  const session = startBrowserSpeech(FakeRecognizer, 'en', value => { preview = value; });
  assert.equal(FakeRecognizer.last.lang, 'en-IN');
  assert.equal(await session.finish(), 'I teach maths');
  assert.equal(preview, 'I teach maths');
});
test('unavailable browser recognition falls back instead of inventing a transcript', async () => {
  const session = startBrowserSpeech(FakeRecognizer, 'hi', () => {});
  assert.equal(FakeRecognizer.last.lang, 'hi-IN');
  FakeRecognizer.last.onerror?.();
  assert.equal(await session.finish(), null);
});
