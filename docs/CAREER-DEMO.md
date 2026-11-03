# Hindi / English personalized career demo

## Run locally

Dependencies and the existing database must already be configured. From the repository root:

```sh
npm --prefix server run speech:setup  # one-time local Whisper install/model download
npm run demo:seed   # idempotent: adds 53 explicitly labelled SAMPLE job cards (3–4 per specialization)
npm run demo        # API :4000, public website :3000, beneficiary app :8081
```

Open **http://localhost:8081** for the beneficiary workflow. The public website's “Try the app” link also opens this local app when started with `npm run demo`.

Use Hindi or English. Guests can complete the survey and explore their plan; an account is needed to submit an internal job application. The existing demo beneficiary is `9000000001` / `demo123`.

## The three demo trades

The survey covers three trades in depth: **Tailoring (सिलाई)**, **Beauty & hair (ब्यूटी)** and **Electrician (बिजली)**. Each has four specializations and its own two questions. Teaching stays in the code but is not offered, because NQR has no school-teacher qualification to map it to.

| Trade | Specializations | Trade questions |
|---|---|---|
| Tailoring | alterations · blouses/suits/womenswear · industrial machine sewing · embroidery | machines you can use · strongest skill (basic / cutting / pattern) |
| Beauty | hair · skin & facials · bridal makeup · general salon | hygiene training · own kit |
| Electrician | domestic wiring · maintenance · solar · industrial | ITI / apprenticeship · safety training |

Every person also answers experience, way of working (near home / from home / online / relocate), hours per day and phone/internet access, then state and district.

**How the answers choose the result** (`server/src/services/careerQualifications.ts`, an editable table):
points = experience (0–3) + the two trade answers (0–2 each). 0–2 → *starting* step, 3–5 → *working* step, 6–7 → *advanced* step. Each specialization has a ladder of three real NSQF qualifications (codes, levels and training hours from NQR). Safety gates hold someone back whatever their points: no safety training → electrical starting step; no hygiene training → beauty can't reach advanced; industrial sewing with no machine practice → starting step. The app says why.

## Demo script

1. Choose a language, continue as guest, open Speak. Say or type one of the examples, e.g. “मैं ब्लाउज़ और सूट की सिलाई करती हूँ” / “I stitch blouses and suits”. (**Type instead / लिखकर बताएं** works when there is no microphone.)
2. The survey opens and **speaks each question**, with a 💡 line explaining why it is asked. The trade and specialization are pre-selected from what was said.
3. Answer as an **expert**: more than 3 years, industrial machine, pattern making, Delhi / New Delhi → **Find work**. Shown: *Pattern Master – Apparel (NSQF 4)* as best fit, with the reason; senior womenswear jobs first; no trainee posts; no alteration or factory jobs.
4. **Change your answers or goal** → answer as a **beginner** (just starting, no machine, basic) → **I want training**. Now: *Tailor (Darzi) (NSQF 3)* best fit, next step *Darzi – Advanced*, and PM-AJAY courses that train for them, with weeks at the chosen hours per day.
5. Try **work from home**: home-based order jobs move to the top. Try an **electrician with no safety training** but 3+ years and ITI: held at *Helper Electrician* with the safety reason.

### Jobs vs training vs certificate

The same answers give the same three NSQF qualifications; the goal changes which one to act on:

| Goal | Primary qualification (★ “For your goal”) | Where it leads |
|---|---|---|
| Find work | your level today (“employers look for this”); next step = “reachable with training” | Saksham job cards → **Apply** saves an application in Saksham that staff see in the admin; optional external search on **National Career Service** (ncs.gov.in, Ministry of Labour — the Government job portal) |
| I want training | beginner: today's level (“train for this first”); 1–3 yrs / expert: the **next** level (“your upskilling goal”), with today's level offered for RPL certification | PM-AJAY courses that train for it; **Skill India Digital Hub** (skillindiadigital.gov.in, Ministry of Skill Development — where NSQF courses, centres and enrolment are) + the official PM-AJAY course list |
| Certificate | today's level via RPL (assessment of what you already do) | Skill India Digital Hub assessment centres |

PM-AJAY training itself is arranged through the state SC development corporation / district office; the app says this under the button. Neither portal accepts a search link, so the plan shows exactly what to search for (“Search for the course: Sampling Tailor. Location: …”).

### Education (onboarding)

The education question understands English, Hinglish and Hindi, digits or words: “8th”, “dasvi pass”, “12वीं”, “inter”, “ITI”, “college second year” / “BA 2nd year” / “ग्रेजुएशन कर रही हूँ” (→ *In college*), “graduated”, “B.Com”, “M.A.”, “postgraduate”, “अनपढ़”. See `server/src/services/educationParse.ts` and `server/tests/education.test.ts` (130+ answers).

| Same trade, different answers | NSQF qualification shown |
|---|---|
| Tailoring · alterations · beginner | Tailor (Darzi), L3 → next: Self Employed Tailor |
| Tailoring · alterations · 1–3 yrs, cutting | Self Employed Tailor, L3 → next: Sampling Tailor L4 |
| Tailoring · alterations · 3+ yrs, pattern | Sampling Tailor, L4 (or Pattern Master) |
| Tailoring · industrial · beginner | Sewing Machine Operator, L3 |
| Beauty · hair · beginner → expert | Assistant Hair Dresser L3 → Hair Dresser & Stylist L4 → Senior Hair Dresser L5 |
| Electrician · solar · beginner | Rooftop Solar PV, L3 → next: Solar Panel Installation Technician L4 |

## Application workflow

For a SAMPLE card, Apply saves a **demo application** in Saksham. Guests are sent to sign in and returned to their results; tap Apply after signing in. Repeated applications update the same record. **My job applications**, available from Results and Profile, shows saved applications and current status; Refresh fetches changes made by an administrator.

For real opportunities, open the official portal and search using the role and location shown in the plan. Registration, eligibility checks and submission happen on that portal. Opening a portal does not submit an application. Track those applications on the external portal.

## Verification

With the API and Expo web app running:

```sh
npm run typecheck
npm run test:career
npm --prefix server run test:career-workflow
npm run test:career:e2e
npm --prefix server run test:voice
npm run test:voice:e2e
npm run build
```

The API workflow test uses a temporary SAMPLE posting and deletes it and its application afterwards. The browser tests run English tailoring (with sign-in and apply), Hindi beauty and English electrician surveys, answer once as an expert (jobs) and once as a beginner (training), and check that the NSQF qualification on screen changes. Screenshots are written to `artifacts/`.

## Scope and data

- The three-trade survey is available in Hindi and English. Other languages retain the existing flow.
- Structured answers choose the NSQF qualification, the PM-AJAY courses, the jobs, the preparation modules and the roadmap. Free-text notes appear in the plan; they are not an automatic credential or eligibility assessment.
- NSQF codes, levels and training hours are real NQR data; the weeks estimate assumes 6 days a week at the chosen hours per day. NQR entry requirements are not loaded, so eligibility must be confirmed with the training centre.
- The 53 demo job cards are **SAMPLE**, not live vacancies. No employer is contacted. Real opportunities and training batches must be confirmed on the linked official portals.
- If no suitable catalogue course exists, the app says so and shows the tailored learning plan and official training portal. It does not substitute an unrelated course.
- Survey answers are held for the current app session. Reloading the app starts a new work assessment; submitted internal applications persist in the database.
- On supported browsers, voice input first uses the browser speech service (which may need internet). Choose **Voice: Hindi / Hinglish** to speak Hindi while keeping the app UI in English. The voice-language choice does not change the UI language.
- If browser recognition is unavailable, the recorded audio uses a local multilingual Whisper model when installed, with configured Sarvam/Groq providers as further fallbacks. Audio stays on this machine for local recognition. The first setup downloads the model; individual recordings do not download anything.
- On this Mac, installed Hindi (Lekha) and English (Rishi) voices generate WAV replies without paid credits. Other hosts use configured TTS or device/browser speech. `LOCAL_TTS_ENABLED=false` disables Mac synthesis and `LOCAL_STT_ENABLED=false` disables local Whisper, so Sarvam handles Hindi and English too.
- Voice: in Hindi and English, the speak screen does not read the NSQF reply aloud; it hands over to the survey, which reads its own questions. Every screen stops speaking when you leave it.
- Tap **Start recording**, allow microphone permission, speak, and tap **Stop recording**. Low-confidence drafts carry a warning; code-switched speech is not discarded solely for low recognition confidence. The recognized words appear in an editable field; review them and press **Send**. The same recorder is used during onboarding. A short pause no longer cuts a sentence off after 1.5 seconds, and the microphone always stops by the 45-second cap.
- Open `http://localhost:8081` or HTTPS for microphone access. Non-local HTTP addresses are blocked by browser security. Microphone errors appear in the page.
- **View matching jobs in Saksham** stays inside the app. NCS is a separately labelled optional external search, not the primary job workflow.
- A new APK or a hosted deployment is separate from these local changes. Use `npm run demo` for this demonstration.

### Voice verification boundary

The automated local-fallback tests feed synthesized English, Hindi and Hinglish WAV clips through Chromium’s microphone and real MediaRecorder, then call the actual local Whisper model. English is tested through to automatic profession recognition. Hindi/Hinglish tests explicitly exercise review and correction before submitting; they do **not** claim word-perfect Hindi/Hinglish recognition. Browser-service event handling has unit tests, but the browser provider and the presentation device’s physical microphone still require a live check.
