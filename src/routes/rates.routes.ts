/**
 * TCMB Döviz Kuru API Route'ları
 * ─────────────────────────────
 * TCMB kur senkronizasyonu ve kur sorgulama
 */

import express from 'express';
import { requireAdmin } from '../server/middleware';
import { fetchTcmbRates, getLatestRates } from '../server/exchangeRate.service';

export const ratesRouter = express.Router();

// ─── TCMB Kurlarını Senkronize Et ──────────────────────────────────────────

ratesRouter.post('/api/admin/exchange-rates/sync', requireAdmin, async (_req, res) => {
  try {
    const result = await fetchTcmbRates();
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ─── Aktif Kurları Getir ───────────────────────────────────────────────────

ratesRouter.get('/api/admin/exchange-rates', requireAdmin, async (_req, res) => {
  try {
    const rates = await getLatestRates();
    res.json(rates);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
