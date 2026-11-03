import { API_BASE } from './api';

export type Bilingual = { en: string; hi: string };
export interface SurveyOption { id: string; label: Bilingual; pattern?: string }
export interface SurveyQuestion { id: string; label: Bilingual; help?: Bilingual; options: SurveyOption[] }
export interface CareerCatalog {
  professions: { id: string; label: Bilingual; pattern: string; specializations: SurveyOption[]; questions: SurveyQuestion[] }[];
  common: SurveyQuestion[];
}
export interface CareerProfile {
  profession: 'teaching' | 'tailoring' | 'beauty' | 'electrical';
  specialization: string;
  answers: Record<string, string>;
  state: string;
  district: string;
  notes: string;
}
/** An NSQF qualification chosen from the survey answers (server: careerQualifications.ts). */
export interface QualificationPick {
  qpCode: string;
  title: string;
  titleHi: string;
  level: number;
  hours: number;
  weeks: number;
  fit: 'recommended' | 'alternative' | 'next';
  reason: string;
}
export interface CareerPlan {
  intent: string;
  profile: CareerProfile;
  roleTitle: string;
  searchTitle: string;
  summary: string;
  ready: boolean;
  gaps: string[];
  modules: string[];
  steps: { title: string; detail: string }[];
  action: { label: string; url: string };
  searchHint: string;
  /** short narrative for the voice reply */
  spoken?: string;
  qualifications?: QualificationPick[];
}
export async function getCareerCatalog(): Promise<CareerCatalog> {
  const response = await fetch(`${API_BASE}/api/career/catalog`);
  if (!response.ok) throw new Error('Survey unavailable');
  return response.json();
}
export async function getCareerPlan(profile: CareerProfile, intent: string, language: string): Promise<CareerPlan> {
  const response = await fetch(`${API_BASE}/api/career/plan`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile, intent, language: language === 'hi' ? 'hi' : 'en' }),
  });
  if (!response.ok) throw new Error('Could not prepare your plan');
  return response.json();
}
let saved: { sessionId: string; profile: CareerProfile; summary: string } | null = null;
/** `summary` is a short spoken description of the profile ("Alteration tailor, 1–3 years"). */
export function saveCareerProfile(sessionId: string, profile: CareerProfile, summary = '') { saved = { sessionId, profile, summary }; }
export function getCareerProfile(sessionId?: string) { return saved && saved.sessionId === sessionId ? saved.profile : null; }
export function getCareerSummary(sessionId?: string) { return saved && saved.sessionId === sessionId ? saved.summary : ''; }
