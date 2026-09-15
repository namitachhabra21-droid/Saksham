#!/bin/bash
# Pre-demo health check. Run: bash demo-check.sh
GREEN=$'\033[32m'; RED=$'\033[31m'; YEL=$'\033[33m'; NC=$'\033[0m'
PASS=0; FAIL=0
ok(){ echo "${GREEN}PASS${NC}  $1"; PASS=$((PASS+1)); }
no(){ echo "${RED}FAIL${NC}  $1"; FAIL=$((FAIL+1)); }

echo "=============================================="
echo "        SAKSHAM PRE-DEMO CHECK"
echo "=============================================="

echo; echo "-- 1. Database --"
if pg_isready -q 2>/dev/null; then ok "PostgreSQL running"
else no "PostgreSQL DOWN  -> start Postgres.app, then re-run"; fi

echo; echo "-- 2. Services --"
for pair in "4000:Backend API" "3000:Website" "8081:Expo Metro"; do
  port="${pair%%:*}"; name="${pair#*:}"
  if lsof -nP -iTCP:$port -sTCP:LISTEN >/dev/null 2>&1; then ok "$name (:$port)"
  else no "$name (:$port) NOT running"; fi
done

echo; echo "-- 3. Admin login --"
LOGIN=$(curl -s -m 15 -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"9999900000","password":"admin123"}' 2>/dev/null)
TOKEN=$(printf '%s' "$LOGIN" | python3 -c "import sys,json;print(json.load(sys.stdin).get('token',''))" 2>/dev/null)
if [ -n "$TOKEN" ]; then ok "Login works (9999900000 / admin123)"
else no "LOGIN BROKEN -> run: npm run prisma:push --prefix server, then restart server"; fi

echo; echo "-- 4. Admin dashboard --"
for ep in stats sessions geo; do
  code=$(curl -s -m 25 -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOKEN" "http://localhost:4000/api/admin/$ep" 2>/dev/null)
  [ "$code" = "200" ] && ok "/admin/$ep" || no "/admin/$ep -> $code"
done

echo; echo "-- 5. Skill mapping (demo phrases) --"
python3 - "$@" <<'PY'
import json,urllib.request
phrases=["main silai karti hun","mitti ke bartan banata hun","main baal katta hun",
         "main bunkar hun","main raj mistri hun","main khet me kaam karti hun"]
for t in phrases:
    try:
        r=urllib.request.Request('http://localhost:4000/api/nsqf/map',
            data=json.dumps({'text':t}).encode('utf-8'),
            headers={'Content-Type':'application/json'})
        d=json.load(urllib.request.urlopen(r,timeout=25))[0]
        c=d.get('confidence',0)
        print(("\033[32mPASS\033[0m  " if c>0 else "\033[31mFAIL\033[0m  ")+f"{t}  ->  {d.get('normalizedSkill')} ({c})")
    except Exception as e:
        print(f"\033[31mFAIL\033[0m  {t}  -> {e}")
PY

echo; echo "-- 6. Voice (TTS, all 10 languages) --"
BAD=""
for L in hi en bn ta te mr kn gu pa or; do
  code=$(curl -s -m 60 -o /dev/null -w "%{http_code}" -X POST http://localhost:4000/api/assistant/tts \
    -H "Content-Type: application/json" -d "{\"text\":\"namaste\",\"language\":\"$L\"}" 2>/dev/null)
  [ "$code" != "200" ] && BAD="$BAD $L"
done
if [ -z "$BAD" ]; then ok "TTS working in all 10 languages"
else no "TTS failing for:$BAD (check internet / Sarvam key)"; fi

echo; echo "-- 7. RAG --"
G=$(curl -s -m 60 -X POST http://localhost:4000/api/assistant/ask \
  -H "Content-Type: application/json" -d '{"question":"What is PM-AJAY?","language":"en"}' 2>/dev/null \
  | python3 -c "import sys,json;print(json.load(sys.stdin).get('grounded'))" 2>/dev/null)
[ "$G" = "True" ] && ok "RAG answering from government documents" || no "RAG not responding"

echo; echo "=============================================="
if [ "$FAIL" -eq 0 ]; then
  echo "${GREEN}ALL $PASS CHECKS PASSED - DEMO READY${NC}"
else
  echo "${RED}$FAIL CHECK(S) FAILED${NC} / $PASS passed - fix above before presenting"
fi
echo "=============================================="
echo
echo "Login    : 9999900000 / admin123"
echo "Admin    : http://localhost:3000/admin"
echo "Start all: npm run dev   (+ npm run dev:app for Expo)"
