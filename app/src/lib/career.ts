import { API_BASE } from './api';

export type Bilingual = { en: string; hi: string };
export interface SurveyOption { id: string; label: Bilingual }
export interface SurveyQuestion { id: string; label: Bilingual; options: SurveyOption[] }
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
let saved: { sessionId: string; profile: CareerProfile } | null = null;
export function saveCareerProfile(sessionId: string, profile: CareerProfile) { saved = { sessionId, profile }; }
export function getCareerProfile(sessionId?: string) { return saved && saved.sessionId === sessionId ? saved.profile : null; }
