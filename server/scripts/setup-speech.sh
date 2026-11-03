#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
SPEECH_PYTHON="${SPEECH_PYTHON:-python3}"
"$SPEECH_PYTHON" -m venv .venv-speech
.venv-speech/bin/python -m pip install -r scripts/requirements-speech.txt
HF_HUB_DISABLE_XET=1 .venv-speech/bin/python scripts/local-stt.py --prepare
