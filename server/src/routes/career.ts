import { Router } from 'express';
import { z } from 'zod';
import { surveyCatalog, careerProfileSchema, buildCareerPlan } from '../services/career.js';

export const careerRouter = Router();
careerRouter.get('/catalog', (_req, res) => res.json(surveyCatalog));
careerRouter.post('/plan', (req, res) => {
  const parsed = z.object({ profile: careerProfileSchema, intent: z.enum(['jobs', 'training', 'certificate', 'guidance']), language: z.enum(['hi', 'en']) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { profile, intent, language } = parsed.data;
  res.json(buildCareerPlan(profile, intent, language));
});
