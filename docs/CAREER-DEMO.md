# Hindi / English personalized career demo

## Run locally

Dependencies and the existing database must already be configured. From the repository root:

```sh
npm --prefix server run speech:setup  # one-time local Whisper install/model download
npm run demo:seed   # idempotent: adds 21 explicitly labelled SAMPLE job cards
npm run demo        # API :4000, public website :3000, beneficiary app :8081
```

Open **http://localhost:8081** for the beneficiary workflow. The public website's “Try the app” link also opens this local app when started with `npm run demo`.

Use Hindi or English. Guests can complete the survey and explore their plan; an account is needed to submit an internal job application. The existing demo beneficiary is `9000000001` / `demo123`.

## Demonstrate different teachers

1. Choose a language, sign in or continue as a guest, then open Speak. You can use **Type instead / लिखकर बताएं** when a microphone is unavailable.
2. Say/type “I teach maths to class 12 students” or “मैं कक्षा 12 के बच्चों को गणित पढ़ाता हूँ”.
3. Complete the survey: Teaching → Senior secondary → more than 3 years → nearby → 3–4 hours → computer → Mathematics → B.Ed + CTET / state TET → School. Set Delhi / New Delhi to match the demo cards.
4. Choose **Find work / employment**. The result includes the subject and level, an application roadmap, relevant sample jobs, and the official National Career Service link. Preschool and English-subject roles are excluded.
5. Use **Change your answers or goal** to return to the survey. Answers remain selected. Choose **I want training**: the result now shows a learning plan and a training-centre portal instead of job cards.
6. Change the specialization to preschool, subject to all primary subjects, experience to just starting, and teaching qualification to none. The role, preparation modules, gaps and compatible jobs change.

Tailoring covers alterations, womenswear, industrial sewing and embroidery. Beauty covers hair, skin, bridal makeup and general salon work. Electrical work covers domestic wiring, maintenance, solar and industrial work. Each has its own questions about equipment, techniques, qualifications or safety.

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

The API workflow test uses a temporary SAMPLE posting and deletes it and its application afterwards. The browser tests run the Hindi and English teacher surveys and switch between job and training goals. Screenshots are written to `artifacts/`.

## Scope and data

- The four-profession survey is available in Hindi and English. Other languages retain the existing flow.
- Structured answers control specialization matching, subject exclusions, preparation modules and roadmap. Free-text notes appear in the plan and supplement catalogue matching; they are not an automatic credential or eligibility assessment.
- The 21 demo cards are **SAMPLE**, not live vacancies. No employer is contacted. Real opportunities and training batches must be confirmed on the linked official portals.
- If no suitable catalogue course exists, the app says so and shows the tailored learning plan and official training portal. It does not substitute an unrelated course.
- Survey answers are held for the current app session. Reloading the app starts a new work assessment; submitted internal applications persist in the database.
- On supported browsers, voice input first uses the browser speech service (which may need internet). Choose **Voice: Hindi / Hinglish** to speak Hindi while keeping the app UI in English. The voice-language choice does not change the UI language.
- If browser recognition is unavailable, the recorded audio uses a local multilingual Whisper model when installed, with configured Sarvam/Groq providers as further fallbacks. Audio stays on this machine for local recognition. The first setup downloads the model; individual recordings do not download anything.
- On this Mac, installed Hindi (Lekha) and English (Rishi) voices generate WAV replies without paid credits. Other hosts use configured TTS or device/browser speech. `LOCAL_TTS_ENABLED=false` disables Mac synthesis.
- Tap **Start recording**, allow microphone permission, speak, and tap **Stop recording**. Low-confidence drafts carry a warning; code-switched speech is not discarded solely for low recognition confidence. The recognized words appear in an editable field; review them and press **Send**. The same recorder is used during onboarding. A short pause no longer cuts a sentence off after 1.5 seconds, and the microphone always stops by the 45-second cap.
- Open `http://localhost:8081` or HTTPS for microphone access. Non-local HTTP addresses are blocked by browser security. Microphone errors appear in the page.
- **View matching jobs in Saksham** stays inside the app. NCS is a separately labelled optional external search, not the primary job workflow.
- A new APK or a hosted deployment is separate from these local changes. Use `npm run demo` for this demonstration.

### Voice verification boundary

The automated local-fallback tests feed synthesized English, Hindi and Hinglish WAV clips through Chromium’s microphone and real MediaRecorder, then call the actual local Whisper model. English is tested through to automatic profession recognition. Hindi/Hinglish tests explicitly exercise review and correction before submitting; they do **not** claim word-perfect Hindi/Hinglish recognition. Browser-service event handling has unit tests, but the browser provider and the presentation device’s physical microphone still require a live check.
