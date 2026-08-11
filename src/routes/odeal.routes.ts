/**
 * Ödeal Sanal POS API Routes
 * ──────────────────────────
 * Admin panel endpoint'leri + public webhook/return endpoint'leri
 */

import express from 'express';
import { requireAdmin } from '../server/middleware';
import {
  getOdealConfig,
  saveOdealConfig,
  createPayByLink,
  checkPaymentStatus,
  cancelPayment,
  refundPayment,
  handleWebhook,
  testConnection,
  listPayments,
  getPaymentDetail,
  OdealError,
} from '../server/odeal.service';

export const odealRouter = express.Router();

// ─── Admin: Ayarları Getir ──────────────────────────────────────────────────

odealRouter.get('/api/admin/odeal/settings', requireAdmin, async (_req, res) => {
  try {
    const config = await getOdealConfig();
    // Secret'ları maskeleme
    res.json({
      apiUrl: config.apiUrl,
      apiKey: config.apiKey ? `${config.apiKey.substring(0, 8)}...` : '',
      secretKey: config.secretKey ? '••••••••' : '',
      callbackUrl: config.callbackUrl,
      returnUrl: config.returnUrl,
      enabled: config.enabled,
      hasCredentials: !!(config.apiKey && config.secretKey),
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Admin: Ayarları Güncelle ───────────────────────────────────────────────

odealRouter.put('/api/admin/odeal/settings', requireAdmin, async (req, res) => {
  try {
    const { apiUrl, apiKey, secretKey, callbackUrl, returnUrl, enabled } = req.body;
    const updates: Record<string, any> = {};

    if (apiUrl !== undefined) updates.apiUrl = apiUrl;
    if (apiKey !== undefined && apiKey !== '' && !apiKey.includes('...')) updates.apiKey = apiKey;
    if (secretKey !== undefined && secretKey !== '••••••••') updates.secretKey = secretKey;
    if (callbackUrl !== undefined) updates.callbackUrl = callbackUrl;
    if (returnUrl !== undefined) updates.returnUrl = returnUrl;
    if (enabled !== undefined) updates.enabled = enabled;

    await saveOdealConfig(updates);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Admin: Bağlantı Testi ─────────────────────────────────────────────────

odealRouter.post('/api/admin/odeal/test-connection', requireAdmin, async (_req, res) => {
  try {
    const result = await testConnection();
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ─── Admin: Pay by Link Oluştur ─────────────────────────────────────────────

odealRouter.post('/api/admin/odeal/pay-link', requireAdmin, async (req, res) => {
  try {
    const { amount, installment, buyerName, buyerPhone, buyerEmail, buyerCity, buyerAddress, relatedType, relatedId } = req.body;

    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'Geçerli bir tutar giriniz' });
    }

    const adminUser = (req as any).adminUser;
    const result = await createPayByLink({
      amount: parseFloat(amount),
      installment: parseInt(installment) || 1,
      buyerName,
      buyerPhone,
      buyerEmail,
      buyerCity,
      buyerAddress,
      relatedType: relatedType || 'manual',
      relatedId: relatedId ? parseInt(relatedId) : undefined,
      createdByUserId: adminUser?.userId,
    });

    res.json(result);
  } catch (e: any) {
    if (e instanceof OdealError) {
      return res.status(e.httpStatus || 400).json({ error: e.message, code: e.code });
    }
    res.status(500).json({ error: e.message });
  }
});

// ─── Admin: İşlem Durumu Sorgula ────────────────────────────────────────────

odealRouter.get('/api/admin/odeal/status/:id', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Geçersiz ID' });

    const result = await checkPaymentStatus(id);
    res.json(result);
  } catch (e: any) {
    if (e instanceof OdealError) {
      return res.status(e.httpStatus || 400).json({ error: e.message, code: e.code });
    }
    res.status(500).json({ error: e.message });
  }
});

// ─── Admin: İptal ───────────────────────────────────────────────────────────

odealRouter.post('/api/admin/odeal/cancel/:id', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Geçersiz ID' });

    const result = await cancelPayment(id);
    res.json(result);
  } catch (e: any) {
    if (e instanceof OdealError) {
      return res.status(e.httpStatus || 400).json({ error: e.message, code: e.code });
    }
    res.status(500).json({ error: e.message });
  }
});

// ─── Admin: İade ────────────────────────────────────────────────────────────

odealRouter.post('/api/admin/odeal/refund/:id', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Geçersiz ID' });

    const { amount, reason } = req.body;
    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'Geçerli bir iade tutarı giriniz' });
    }

    const adminUser = (req as any).adminUser;
    const result = await refundPayment(id, parseFloat(amount), reason || '', adminUser?.userId);
    res.json(result);
  } catch (e: any) {
    if (e instanceof OdealError) {
      return res.status(e.httpStatus || 400).json({ error: e.message, code: e.code });
    }
    res.status(500).json({ error: e.message });
  }
});

// ─── Admin: Ödeme Listesi ───────────────────────────────────────────────────

odealRouter.get('/api/admin/odeal/payments', requireAdmin, async (req, res) => {
  try {
    const { status, relatedType, relatedId, limit } = req.query;
    const payments = await listPayments({
      status: status as string,
      relatedType: relatedType as string,
      relatedId: relatedId ? parseInt(relatedId as string) : undefined,
      limit: limit ? parseInt(limit as string) : 100,
    });
    res.json(payments);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Admin: Tekil Ödeme Detayı ──────────────────────────────────────────────

odealRouter.get('/api/admin/odeal/payments/:id', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Geçersiz ID' });

    const detail = await getPaymentDetail(id);
    if (!detail) return res.status(404).json({ error: 'Ödeme bulunamadı' });

    res.json(detail);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Public: Ödeal Webhook/Callback ─────────────────────────────────────────

odealRouter.post('/api/odeal/callback', async (req, res) => {
  try {
    // Raw body'yi al
    const rawBody = JSON.stringify(req.body);
    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries(req.headers)) {
      if (typeof value === 'string') headers[key] = value;
    }

    const result = await handleWebhook(rawBody, headers);
    // Callback'i hızlı kabul et — 2xx dön
    res.status(result.ok ? 200 : 400).json({ received: true });
  } catch (e: any) {
    console.error('[Ödeal Callback] Hata:', e.message);
    // Callback'te hata olsa bile 200 dönmeyi düşün — Ödeal tekrar göndermesin
    res.status(200).json({ received: true, error: true });
  }
});

// ─── Public: Ödeme Sonrası Dönüş ───────────────────────────────────────────

odealRouter.get('/api/odeal/return', async (req, res) => {
  const { externalId } = req.query;

  // returnUrl'den dönen kullanıcıyı bilgilendirme sayfasına yönlendir
  // Query parametrelerine güvenme — backend'de durum sorgula
  if (externalId) {
    // Async olarak durumu sorgula (background'da)
    // Kullanıcıyı teşekkür sayfasına yönlendir
    try {
      const { db } = await import('../db/index');
      const { odealPayments } = await import('../db/schema');
      const { eq } = await import('drizzle-orm');

      const [payment] = await db.select().from(odealPayments)
        .where(eq(odealPayments.externalId, externalId as string))
        .limit(1);

      if (payment && payment.status !== 'succeeded' && payment.status !== 'failed') {
        // Arka planda durum sorgula
        checkPaymentStatus(payment.id).catch(err => {
          console.error('[Ödeal Return] Status check hatası:', err.message);
        });
      }
    } catch (err) {
      console.error('[Ödeal Return] Hata:', (err as Error).message);
    }
  }

  // Kullanıcıyı ana sayfaya yönlendir — frontend'de sonuç gösterilecek
  const redirectUrl = process.env.APP_URL || '/';
  res.redirect(`${redirectUrl}/odeme-sonucu?ref=${externalId || ''}`);
});
