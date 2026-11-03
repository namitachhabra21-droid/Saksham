"""One short recording -> JSON. Downloads are performed by speech:setup, never on a request."""
import argparse
import json
import os
import sys
from faster_whisper import WhisperModel

parser = argparse.ArgumentParser()
parser.add_argument('--prepare', action='store_true')
parser.add_argument('--language', default='auto')
args = parser.parse_args()
model_name = os.environ.get('LOCAL_STT_MODEL', 'small')
model = WhisperModel(model_name, device='cpu', compute_type='int8', cpu_threads=4,
                     local_files_only=not args.prepare)
if args.prepare:
    print(json.dumps({'ready': True, 'model': model_name}))
    sys.exit(0)

import io
segments, info = model.transcribe(io.BytesIO(sys.stdin.buffer.read()),
    language=None if args.language == 'auto' else args.language,
    task='transcribe', beam_size=1, best_of=1, temperature=0, max_new_tokens=128, repetition_penalty=1.2, no_repeat_ngram_size=3, no_speech_threshold=None, vad_filter=True,
    initial_prompt='शिक्षक, पढ़ाती, गणित, कक्षा, सिलाई, कढ़ाई, ब्यूटी, बिजली। Teaching, tailoring, beauty, electrician.',
    vad_parameters={'min_silence_duration_ms': 500, 'min_speech_duration_ms': 250},
    condition_on_previous_text=False)
# VAD rejects silence. Low recognizer confidence on code-switched
# speech should produce an explicitly reviewable draft, not disappear as silence.
speech_segments = list(segments)
text = ' '.join(s.text.strip() for s in speech_segments).strip()
print(json.dumps({'transcript': text, 'language': info.language,
                  'needsReview': any(s.avg_logprob < -1.0 or s.no_speech_prob >= 0.6 for s in speech_segments),
                  'confidence': info.language_probability}, ensure_ascii=False))
