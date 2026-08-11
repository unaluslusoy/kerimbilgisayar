/**
 * SMS & Döviz Kuru API Route'ları
 * ──────────────────────────────
 * SMS ayarları, test SMS gönderimi, TCMB kur senkronizasyonu
 */

import express from 'express';
import { requireAdmin } from '../server/middleware';
import { getSmsConfig, saveSmsConfig, sendSms } from '../server/sms.service';
import { fetchTcmbRates, getLatestRates } from '../server/exchangeRate.service';

export const smsRouter = express.Router();

// ─── SMS Ayarlarını Getir ───────────────────────────────────────────────────

smsRouter.get('/api/admin/sms/settings', requireAdmin, async (_req, res) => {
  try {
    const config = await getSmsConfig();
    res.json({
      ...config,
      apiKey: config.apiKey ? '••••••••' : '',
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── SMS Ayarlarını Güncelle ────────────────────────────────────────────────

smsRouter.put('/api/admin/sms/settings', requireAdmin, async (req, res) => {
  try {
    const { provider, apiUrl, apiKey, apiSecret, username, header, enabled } = req.body;
    const updates: Record<string, any> = {};

    if (provider !== undefined) updates.provider = provider;
    if (apiUrl !== undefined) updates.apiUrl = apiUrl;
    if (apiKey !== undefined && apiKey !== '' && apiKey !== '••••••••') updates.apiKey = apiKey;
    if (apiSecret !== undefined && apiSecret !== '' && apiSecret !== '••••••••') updates.apiSecret = apiSecret;
    if (username !== undefined) updates.username = username;
    if (header !== undefined) updates.header = header;
    if (enabled !== undefined) updates.enabled = enabled;

    await saveSmsConfig(updates);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Test SMS Gönder ────────────────────────────────────────────────────────

smsRouter.post('/api/admin/sms/send-test', requireAdmin, async (req, res) => {
  try {
    const { phone, message } = req.body;
    if (!phone || !message) {
      return res.status(400).json({ error: 'Telefon numarası ve mesaj zorunludur' });
    }

    const result = await sendSms({ phone, message });
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ─── TCMB Kurlarını Senkronize Et ──────────────────────────────────────────

smsRouter.post('/api/admin/exchange-rates/sync', requireAdmin, async (_req, res) => {
  try {
    const result = await fetchTcmbRates();
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ─── Aktif Kurları Getir ───────────────────────────────────────────────────

smsRouter.get('/api/admin/exchange-rates', requireAdmin, async (_req, res) => {
  try {
    const rates = await getLatestRates();
    res.json(rates);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
