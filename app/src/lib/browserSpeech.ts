// Deliberately dependency-free: native and unsupported browsers return null.
interface SpeechResult { isFinal: boolean; 0: { transcript: string } }
interface ResultEvent { results: { length: number; [index: number]: SpeechResult } }
export interface BrowserRecognizer {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: ResultEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
export type RecognizerConstructor = new () => BrowserRecognizer;
export function browserRecognizerConstructor(): RecognizerConstructor | null {
  if (typeof window === 'undefined') return null;
  const browser = window as unknown as { SpeechRecognition?: RecognizerConstructor; webkitSpeechRecognition?: RecognizerConstructor };
  return browser.SpeechRecognition ?? browser.webkitSpeechRecognition ?? null;
}

/** Collect real browser recognition, including its final result after stop(). */
export function startBrowserSpeech(Constructor: RecognizerConstructor, language: 'hi' | 'en', onPartial: (text: string) => void) {
  const recognition = new Constructor();
  let text = '';
  let failed = false;
  let ended = false;
  let settle: ((text: string | null) => void) | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const finish = () => {
    if (timer) clearTimeout(timer);
    settle?.(!failed && text.trim() ? text.trim() : null);
    settle = null;
  };
  recognition.lang = language === 'hi' ? 'hi-IN' : 'en-IN';
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;
  recognition.onresult = event => {
    text = Array.from({ length: event.results.length }, (_, index) => event.results[index][0].transcript).join(' ').trim();
    onPartial(text);
  };
  recognition.onerror = () => { failed = true; ended = true; finish(); };
  recognition.onend = () => { ended = true; finish(); };
  try { recognition.start(); }
  catch { failed = true; ended = true; }
  return {
    finish: () => new Promise<string | null>(resolve => {
      settle = resolve;
      if (ended) { finish(); return; }
      timer = setTimeout(finish, 2500);
      try { recognition.stop(); } catch { finish(); }
    }),
    abort: () => {
      failed = true;
      recognition.onresult = null;
      try { recognition.abort(); } catch { /* already ended */ }
      finish();
    },
  };
}
