import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

export function localSpeechConfig() {
  const python = process.env.LOCAL_STT_PYTHON || resolve(process.cwd(), '.venv-speech/bin/python');
  const script = resolve(process.cwd(), 'scripts/local-stt.py');
  return { python, script, available: process.env.LOCAL_STT_ENABLED !== 'false' && existsSync(python) && existsSync(script) };
}
let active = 0;
export async function transcribeLocally(audio: Buffer, language: string) {
  const { python, script, available } = localSpeechConfig();
  if (!available) throw new Error('Local speech recognition is not installed');
  if (active >= 2) throw new Error('Speech recognition is busy. Please try again shortly.');
  active++;
  try {
    return await new Promise<{ transcript: string; language: string; confidence?: number; needsReview?: boolean }>((resolveResult, reject) => {
      const child = spawn(python, [script, '--language', language], { stdio: ['pipe', 'pipe', 'pipe'] });
      let stdout = '';
      let stderr = '';
      const timeout = setTimeout(() => { child.kill('SIGKILL'); reject(new Error('Speech recognition timed out. Please record a shorter message.')); }, 90_000);
      child.stdout.setEncoding('utf8').on('data', data => { stdout += data; });
      child.stderr.setEncoding('utf8').on('data', data => { stderr = (stderr + data).slice(-4000); });
      child.stdin.on('error', () => {});
      child.on('error', error => { clearTimeout(timeout); reject(error); });
      child.on('close', code => {
        clearTimeout(timeout);
        if (code !== 0) {
          console.error('[speech] Local recognition failed:', stderr.slice(-1000));
          reject(new Error('Local speech recognition could not decode this recording. Please try again.'));
          return;
        }
        try {
          const result = JSON.parse(stdout);
          if (typeof result.transcript !== 'string' || !result.transcript.trim()) {
            reject(new Error('No clear speech was heard. Move closer to the microphone and try again.'));
          } else resolveResult(result);
        } catch { reject(new Error('Speech recognition returned an invalid response')); }
      });
      child.stdin.end(audio);
    });
  } finally { active--; }
}
