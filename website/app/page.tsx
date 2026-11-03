import Image from "next/image";
import Link from "next/link";
import { HeroPortrait } from "./hero-portrait";
import {
  Mic,
  Languages,
  ShieldCheck,
  Briefcase,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  BookOpen,
  Wifi,
  MessageCircle,
} from "lucide-react";
import { API_BASE } from "@/lib/api";
import { TryIt } from "./try-it";
import { OfficialLogos } from "./official-logos";
import { WhatItDoes } from "./what-it-does";

const WHY_POINTS = [
  {
    icon: ShieldCheck,
    title: "No Guessing",
    body: "You are shown the exact government course your skill matches, and why. Nothing is hidden.",
  },
  {
    icon: Languages,
    title: "Your Own Language",
    body: "Speak or listen in Hindi, Tamil, Bengali and 7 more. Every word is written by people who speak it.",
  },
  {
    icon: Wifi,
    title: "Works On Weak Network",
    body: "Built for slow internet and simple phones. It keeps working when the signal is poor.",
  },
];

const STEPS = [
  { n: "01", title: "Say Your Work", body: 'Just say what work you do, in your own words — "main mitti ke bartan banata hoon".' },
  { n: "02", title: "We Find The Course", body: "Your work is matched to a real government skill course that fits it." },
  { n: "03", title: "See What Is Near You", body: "Training and jobs close to your village or town, at your level." },
  { n: "04", title: "Hear The Reason", body: "Saksham tells you out loud why it chose that, in the same language you spoke." },
];

const TRUST_POINTS = [
  {
    icon: CheckCircle2,
    title: "Real Government Lists",
    body: "Every course comes from the official government lists — 1,283 skill courses and 2,366 PM-AJAY courses.",
  },
  {
    icon: AlertTriangle,
    title: "We Say What Is A Sample",
    body: "Where a wage or seat count is only an example, it is clearly marked. We never show a made-up number as real.",
  },
  {
    icon: Sparkles,
    title: "You Can Check It",
    body: "The match is not a secret. The course code is shown so anyone can look it up on the government website.",
  },
  {
    icon: BookOpen,
    title: "Grounded Answers",
    body: '"Will I get a certificate?" is answered strictly from real government PDF passages, never invented.',
  },
];

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Saksham",
  alternateName: "सक्षम",
  applicationCategory: "GovernmentApplication",
  operatingSystem: "Web, Android",
  description:
    "AI-driven voice assistant for livelihood mapping and NSQF-aligned skilling recommendations for SC communities under PM-AJAY, Ministry of Social Justice & Empowerment.",
  offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
  inLanguage: ["hi", "en", "bn", "ta", "te", "mr", "kn", "gu", "pa", "or"],
  publisher: { "@type": "GovernmentOrganization", name: "Ministry of Social Justice & Empowerment" },
};

async function getLiveCoverage() {
  const fallback = { sectors: [] as string[], jobPostings: null as number | null, programs: null as number | null };
  try {
    const [sectorsRes, jobsRes, programsRes] = await Promise.all([
      fetch(`${API_BASE}/api/pmajay-courses/filters`, { next: { revalidate: 3600 } }),
      fetch(`${API_BASE}/api/job-postings?pageSize=1`, { next: { revalidate: 3600 } }),
      fetch(`${API_BASE}/api/programs`, { next: { revalidate: 3600 } }),
    ]);
    const sectors: string[] = sectorsRes.ok ? (await sectorsRes.json()).sectors ?? [] : [];
    const jobsData = jobsRes.ok ? await jobsRes.json() : null;
    const programsData = programsRes.ok ? await programsRes.json() : null;
    return {
      sectors,
      jobPostings: jobsData?.total ?? null,
      programs: Array.isArray(programsData) ? programsData.length : (programsData?.total ?? null),
    };
  } catch {
    return fallback;
  }
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground-dim">
      {children}
    </span>
  );
}

export default async function Home() {

  return (
    <div className="bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />

      {/* Government identifier strip */}
      <div className="border-b border-border bg-surface-alt px-6 py-1.5 text-center text-xs text-foreground-dim">
        Government of India · Ministry of Social Justice &amp; Empowerment
      </div>

      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3 lg:px-10">
          <div className="flex items-center gap-2.5">
            <Image src="/icon.png" alt="Saksham" width={34} height={34} className="rounded-lg" />
            <div className="leading-tight">
              <p className="text-sm font-extrabold">सक्षम · Saksham</p>
              <p className="text-xs text-foreground-faint">Speak your skill. Get matched.</p>
            </div>
          </div>
          <nav className="hidden items-center gap-1 md:flex">
            <a href="#how-it-works" className="rounded-full px-3.5 py-1.5 text-sm font-medium text-foreground-dim hover:bg-surface-alt">
              How It Works
            </a>
            <a href="#try-it" className="rounded-full px-3.5 py-1.5 text-sm font-medium text-foreground-dim hover:bg-surface-alt">
              Try It
            </a>
            <a href="#trust" className="rounded-full px-3.5 py-1.5 text-sm font-medium text-foreground-dim hover:bg-surface-alt">
              Trust
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <a
              href={process.env.NEXT_PUBLIC_APP_URL ?? "https://saksham-app-preview.vercel.app"}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold hover:bg-surface-alt"
            >
              Try the App
            </a>
            <Link
              href="/admin/login"
              className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-on-brand hover:bg-brand-strong"
            >
              Admin Login
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero — soft gradient band, pill badge, big bold headline, example card */}
        <section
          className="border-b border-border"
          style={{
            background: "linear-gradient(120deg, color-mix(in srgb, var(--accent) 38%, var(--background)) 0%, var(--background) 52%, color-mix(in srgb, var(--brand) 44%, var(--background)) 100%)",
          }}
        >
          <div className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:px-10 lg:py-8">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-accent">
                PM-AJAY · Official Skilling Help
              </span>
              <h1 className="mt-4 text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl">
                Say What You Know.
                <br />
                Get Matched For Real.
              </h1>
              <p className="mt-4 max-w-lg text-base text-foreground-dim">
                Speak your traditional skill out loud, in your own language. Saksham matches it to a real government
                qualification and real training or job openings nearby — with proof, not a guess.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Pill><Mic className="h-3.5 w-3.5 text-brand" />Voice-first</Pill>
                <Pill><Languages className="h-3.5 w-3.5 text-brand" />10 languages</Pill>
                <Pill><ShieldCheck className="h-3.5 w-3.5 text-brand" />Real NSQF match</Pill>
                <Pill><Briefcase className="h-3.5 w-3.5 text-brand" />Real vacancies</Pill>
              </div>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <a
                  href="#how-it-works"
                  className="inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-on-brand hover:bg-brand-strong"
                >
                  See How It Works
                  <ArrowRight className="h-4 w-4" />
                </a>
                <a href="#try-it" className="rounded-xl border border-border bg-surface px-6 py-3 text-sm font-semibold hover:bg-surface-alt">
                  Try a real example
                </a>
              </div>
            </div>

            <HeroPortrait />
          </div>
        </section>

        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <WhatItDoes />

          {/* Why it matters */}
          <section className="border-b border-border py-14">
            <p className="text-xs font-bold uppercase tracking-wide text-emphasis">Why Use It</p>
            <h2 className="mt-2 max-w-xl text-3xl font-extrabold leading-tight">
              Know what your work is worth.
            </h2>
            <p className="mt-2 max-w-xl text-sm text-foreground-dim">
              You already have the skill. What is missing is the paper that proves it.
            </p>
            <div className="mt-8 grid gap-5 sm:grid-cols-3">
              {WHY_POINTS.map((p) => (
                <div key={p.title} className="rounded-xl border border-border bg-surface p-5">
                  <p.icon className="h-6 w-6 text-brand" />
                  <h3 className="mt-3 font-bold">{p.title}</h3>
                  <p className="mt-1.5 text-sm text-foreground-dim">{p.body}</p>
                </div>
              ))}
            </div>
          </section>

          {/* How it works */}
          <section id="how-it-works" className="border-b border-border py-14">
            <p className="text-xs font-bold uppercase tracking-wide text-emphasis">How It Works</p>
            <h2 className="mt-2 max-w-xl text-3xl font-extrabold leading-tight">Say it once. Get a real answer.</h2>
            <p className="mt-2 max-w-xl text-sm text-foreground-dim">
              It works the same on the app, this website, or WhatsApp.
            </p>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((s) => (
                <div key={s.n} className="rounded-xl border border-border bg-surface p-5">
                  <p className="text-2xl font-extrabold text-foreground/30">{s.n}</p>
                  <h3 className="mt-1 font-bold">{s.title}</h3>
                  <p className="mt-1.5 text-sm text-foreground-dim">{s.body}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Try it — interactive */}
          <section id="try-it" className="border-b border-border py-14">
            <p className="text-xs font-bold uppercase tracking-wide text-emphasis">Try It</p>
            <h2 className="mt-2 max-w-xl text-3xl font-extrabold leading-tight">Check a real match now.</h2>
            <p className="mt-2 max-w-xl text-sm text-foreground-dim">
              Pick a phrase below. What you&apos;ll see is a real qualification and a real posting from the database
              — not a mockup.
            </p>
            <div className="mt-8">
              <TryIt />
            </div>
          </section>

          {/* Trust */}
          <section id="trust" className="border-b border-border py-14">
            <p className="text-xs font-bold uppercase tracking-wide text-emphasis">Trust</p>
            <h2 className="mt-2 max-w-xl text-3xl font-extrabold leading-tight">Made for important public information.</h2>
            <p className="mt-2 max-w-xl text-sm text-foreground-dim">
              Beneficiaries shouldn&apos;t lose out on real support because information was unclear or unlabelled.
            </p>
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {TRUST_POINTS.map((p) => (
                <div key={p.title} className="rounded-xl border border-border bg-surface p-5">
                  <p.icon className="h-6 w-6 text-brand" />
                  <h3 className="mt-3 font-bold">{p.title}</h3>
                  <p className="mt-1.5 text-sm text-foreground-dim">{p.body}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Channels */}
          <section className="border-b border-border py-14">
            <p className="text-xs font-bold uppercase tracking-wide text-emphasis">Where To Reach It</p>
            <h2 className="mt-2 max-w-xl text-3xl font-extrabold leading-tight">Built for citizens and field teams.</h2>
            <div className="mt-8 grid gap-5 sm:grid-cols-3">
              <div className="rounded-xl border border-border bg-surface p-5">
                <Mic className="h-6 w-6 text-brand" />
                <h3 className="mt-3 font-bold">Mobile App</h3>
                <p className="mt-1.5 text-sm text-foreground-dim">The full voice-first experience — Android, with offline-friendly speech fallback.</p>
              </div>
              <div className="rounded-xl border border-border bg-surface p-5">
                <MessageCircle className="h-6 w-6 text-brand" />
                <h3 className="mt-3 font-bold">WhatsApp</h3>
                <p className="mt-1.5 text-sm text-foreground-dim">A webhook wired to the same real pipeline — text or voice notes, no app download needed.</p>
              </div>
              <div className="rounded-xl border border-border bg-surface p-5">
                <ShieldCheck className="h-6 w-6 text-brand" />
                <h3 className="mt-3 font-bold">Admin Dashboard</h3>
                <p className="mt-1.5 text-sm text-foreground-dim">Programme staff manage job postings, training programmes, and beneficiary funnel from one place.</p>
              </div>
            </div>
          </section>

          <footer className="flex flex-col gap-3 py-10 text-xs text-foreground-faint">
            <div className="mb-2">
              <OfficialLogos />
            </div>
            <p>Prototype for demonstration. Programme data is representative sample data.</p>
            <p>
              PM-AJAY and NCVET marks and course data are reproduced from pmajay.dosje.gov.in and
              nqr.gov.in under their copyright policies, which permit reuse with acknowledgement.
            </p>
            <p>Built for SC communities under PM-AJAY, Ministry of Social Justice &amp; Empowerment.</p>
            <div className="flex gap-4">
              <Link href="/privacy" className="hover:text-foreground-dim hover:underline">
                Privacy Policy
              </Link>
              <Link href="/terms" className="hover:text-foreground-dim hover:underline">
                Terms of Service
              </Link>
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
}
