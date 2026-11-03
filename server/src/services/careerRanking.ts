import type { CareerProfile } from './career.js';

/** Reject incompatible specialties instead of treating every sector match as suitable. */
export function profileRelevance(value: string, p: CareerProfile, kind: 'job' | 'course'): number {
  const t = value.toLowerCase();
  const a = p.answers;
  if (kind === 'job') {
    if ((a.experience === 'new' || a.experience === 'under1') && /\bsenior\b(?!\s+(?:secondary|school|high))|supervisor|manager|lead technician/.test(t)) return -1;
    if (a.mode === 'online' && !/online|remote|work from home/.test(t)) return -1;
    if (a.mode === 'home' && /factory|on.site|industrial plant/.test(t)) return -1;
  }
  const early = /preschool|pre.school|nursery|early childhood|childcare|anganwadi|creche/.test(t);
  if (p.profession === 'teaching') {
    if (kind === 'course' && !/teacher|teaching|pedagog|educator|classroom|early childhood|preschool/.test(t)) return -1;
    if (p.specialization === 'preschool' ? !early : early) return -1;
    if (p.specialization !== 'preschool' && !/teach|tutor|pedagog|educator|classroom/.test(t)) return -1;
    if (p.specialization === 'primary' && /secondary|class (9|10|11|12)|jee|neet/.test(t)) return -1;
    if ((p.specialization === 'senior' || p.specialization === 'secondary') && /primary teacher|elementary teacher/.test(t)) return -1;
    const subjects = ['math', 'science', 'english', 'hindi', 'commerce'];
    const target = a.subject === 'maths' ? 'math' : a.subject;
    if (subjects.some(s => t.includes(s)) && target !== 'all' && !t.includes(target)) return -1;
    return target !== 'all' && t.includes(target) ? .25 : .08;
  }
  const specialties: Record<string, string> = {
    alterations: 'alteration|repair|tailor', womenswear: 'women|blouse|suit|tailor', industrial: p.profession === 'electrical' ? 'industrial|electric' : 'industrial|sewing|machine', embroidery: 'embroid',
    hair: 'hair|barber', skin: 'skin|facial|beauty therapist', bridal: 'bridal|make.?up', general: 'salon|beaut|hair',
    domestic: 'domestic|wiring|electrician', maintenance: 'maintenance|electric', solar: 'solar',
  };
  const match = new RegExp(specialties[p.specialization]).test(t);
  if (!match) return -1;
  return .2;
}
