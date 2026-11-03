import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
const execFileAsync = promisify(execFile);

export function canSpeakLocally(language: string) {
  return process.platform === 'darwin' && process.env.LOCAL_TTS_ENABLED !== 'false' && ['hi', 'en'].includes(language) && existsSync('/usr/bin/say');
}
/** Installed macOS voices make this local demo independent of paid TTS credits. */
export async function synthesizeLocally(text: string, language: string) {
  const directory = await mkdtemp(join(tmpdir(), 'saksham-voice-'));
  try {
    const input = join(directory, 'speech.txt');
    const output = join(directory, 'speech.wav');
    await writeFile(input, text, 'utf8');
    await execFileAsync('/usr/bin/say', ['-v', language === 'hi' ? 'Lekha' : 'Rishi', '-f', input, '-o', output, '--file-format=WAVE', '--data-format=LEI16@22050'], { timeout: 20000 });
    const audio = await readFile(output);
    return { audioUrl: `data:audio/wav;base64,${audio.toString('base64')}`, provider: 'local-device' as const, format: 'wav' as const };
  } finally { await rm(directory, { recursive: true, force: true }); }
}
