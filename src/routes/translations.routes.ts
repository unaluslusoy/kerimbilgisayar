import express from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/index';
import { languages, translations } from '../db/schema';
import { requireAdmin } from '../server/middleware';

export const translationsRouter = express.Router();

translationsRouter.get('/api/admin/languages', requireAdmin, async (req, res) => {
  try {
    const allLangs = await db.select().from(languages);
    res.json(allLangs);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

translationsRouter.post('/api/admin/languages', requireAdmin, async (req, res) => {
  try {
    const { code, name, isDefault, isActive } = req.body;
    const result = await db.insert(languages).values({ code, name, isDefault, isActive });
    res.json({ id: result[0].insertId });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

translationsRouter.get('/api/admin/translations', requireAdmin, async (req, res) => {
  try {
    const allTrans = await db.select().from(translations);
    res.json(allTrans);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

translationsRouter.post('/api/admin/translations', requireAdmin, async (req, res) => {
  try {
    const { langCode, translations: updates } = req.body;
    
    if (langCode && updates) {
      await db.delete(translations).where(eq(translations.langCode, langCode));
      const entries = Object.entries(updates).map(([k, v]) => ({
        langCode,
        key: k,
        value: v as string
      }));
      if (entries.length > 0) {
        await db.insert(translations).values(entries);
      }
    }
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
