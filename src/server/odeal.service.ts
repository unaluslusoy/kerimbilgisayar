/**
 * Ödeal Sanal POS Servis Katmanı
 * ─────────────────────────────
 * Token yönetimi, Pay by Link, durum sorgulama, iptal, iade ve webhook işleme.
 * 
 * [DOĞRULA]: Token endpoint, tam enum listesi ve bazı alan tipleri
 * Ödeal ile doğrulanana kadar dokümandaki bilgilerle çalışır.
 */

import crypto from 'crypto';
import { db } from '../db/index';
import { eq, and, sql, lt, inArray } from 'drizzle-orm';
import { odealPayments, odealRefunds, odealWebhookInbox, payments, settings } from '../db/schema';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface OdealConfig {
  apiUrl: string;
  apiKey: string;
  secretKey: string;
  callbackUrl: string;
  returnUrl: string;
  enabled: boolean;
}

export interface PayByLinkRequest {
  amount: number;
  installment?: number;
  buyerName?: string;
  buyerPhone?: string;
  buyerEmail?: string;
  buyerCity?: string;
  buyerAddress?: string;
  relatedType?: 'ticket' | 'sale' | 'manual';
  relatedId?: number;
  createdByUserId?: number;
}

export interface OdealPaymentRecord {
  id: number;
  externalId: string;
  odealTransactionId: string | null;
  amount: string;
  status: string;
  paymentLink: string | null;
  relatedType: string;
  relatedId: number | null;
  createdAt: Date | null;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const CONNECT_TIMEOUT_MS = 3000;
const RESPONSE_TIMEOUT_MS = 15000;
const MAX_RECOVERY_ATTEMPTS = 10;
const RECOVERY_GRACE_PERIOD_MS = 5 * 60 * 1000; // 5 dakika

// Monoton durum geçişi — bir durumdan hangi durumlara geçilebilir
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  created:   ['pending', 'processing', 'succeeded', 'failed', 'cancelled', 'unknown'],
  pending:   ['processing', 'succeeded', 'failed', 'cancelled', 'unknown'],
  processing: ['succeeded', 'failed', 'cancelled', 'unknown'],
  unknown:   ['succeeded', 'failed', 'cancelled'],
  // Terminal durumlar — geçiş yok (succeeded, failed, cancelled)
};

// ─── Token Cache ────────────────────────────────────────────────────────────

let cachedToken: string | null = null;
let tokenExpiresAt = 0;
const TOKEN_SAFETY_WINDOW_MS = 60_000; // Süresi dolmadan 1 dk önce yenile

// ─── Helper: Güvenli fetch with timeout ─────────────────────────────────────

async function odealFetch(url: string, options: RequestInit & { timeoutMs?: number } = {}): Promise<Response> {
  const { timeoutMs = RESPONSE_TIMEOUT_MS, ...fetchOptions } = options;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

// ─── Config ─────────────────────────────────────────────────────────────────

export async function getOdealConfig(): Promise<OdealConfig> {
  const rows = await db.select().from(settings)
    .where(eq(settings.group, 'odeal'));

  const config: Record<string, string> = {};
  for (const row of rows) {
    config[row.key] = row.value || '';
  }

  return {
    apiUrl: config['odeal_api_url'] || process.env.ODEAL_API_URL || 'https://api-stg.odeal.com',
    apiKey: config['odeal_api_key'] || process.env.ODEAL_API_KEY || '',
    secretKey: config['odeal_secret_key'] || process.env.ODEAL_SECRET_KEY || '',
    callbackUrl: config['odeal_callback_url'] || process.env.ODEAL_CALLBACK_URL || '',
    returnUrl: config['odeal_return_url'] || process.env.ODEAL_RETURN_URL || '',
    enabled: config['odeal_enabled'] === 'true',
  };
}

export async function saveOdealConfig(updates: Partial<OdealConfig>): Promise<void> {
  const keyMap: Record<string, string> = {
    apiUrl: 'odeal_api_url',
    apiKey: 'odeal_api_key',
    secretKey: 'odeal_secret_key',
    callbackUrl: 'odeal_callback_url',
    returnUrl: 'odeal_return_url',
    enabled: 'odeal_enabled',
  };

  for (const [field, dbKey] of Object.entries(keyMap)) {
    if (field in updates) {
      const value = String((updates as any)[field]);
      // Upsert: mevcut kayıt varsa güncelle, yoksa oluştur
      const existing = await db.select().from(settings)
        .where(and(eq(settings.key, dbKey), eq(settings.group, 'odeal')))
        .limit(1);

      if (existing.length > 0) {
        await db.update(settings)
          .set({ value })
          .where(eq(settings.id, existing[0].id));
      } else {
        await db.insert(settings).values({
          tenantId: 1,
          key: dbKey,
          value,
          group: 'odeal',
        });
      }
    }
  }

  // Token cache'i temizle (credential değişmiş olabilir)
  cachedToken = null;
  tokenExpiresAt = 0;
}

// ─── Token Yönetimi ─────────────────────────────────────────────────────────

/**
 * [DOĞRULA] Token endpoint ve response şeması Ödeal ile doğrulanmalı.
 * Şu anki implementasyon dokümandaki genel bilgilere dayanır.
 */
async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt - TOKEN_SAFETY_WINDOW_MS) {
    return cachedToken;
  }

  const config = await getOdealConfig();
  if (!config.apiKey || !config.secretKey) {
    throw new OdealError('ODEAL_NOT_CONFIGURED', 'Ödeal API anahtarları yapılandırılmamış');
  }

  try {
    // [DOĞRULA] Token endpoint'i — Ödeal'den tam yol ve alanlar doğrulanmalı
    const response = await odealFetch(`${config.apiUrl}/vpos/auth/token`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify({
        apiKey: config.apiKey,
        secretKey: config.secretKey,
      }),
      timeoutMs: CONNECT_TIMEOUT_MS,
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      throw new OdealError(
        'TOKEN_FAILED',
        `Token alınamadı: HTTP ${response.status}`,
        response.status,
        errorBody
      );
    }

    const data = await response.json() as any;
    // [DOĞRULA] Token response şeması
    const token = data.token || data.access_token || data.result?.token;
    const expiresIn = data.expiresIn || data.expires_in || 3600; // saniye

    if (!token) {
      throw new OdealError('TOKEN_INVALID', 'Token yanıtında token alanı bulunamadı');
    }

    cachedToken = token;
    tokenExpiresAt = Date.now() + (expiresIn * 1000);

    return token;
  } catch (err) {
    if (err instanceof OdealError) throw err;
    throw new OdealError('TOKEN_ERROR', `Token alınırken hata: ${(err as Error).message}`);
  }
}

// ─── Pay by Link ────────────────────────────────────────────────────────────

export async function createPayByLink(request: PayByLinkRequest): Promise<{
  id: number;
  externalId: string;
  paymentLink: string;
}> {
  const config = await getOdealConfig();
  if (!config.enabled) {
    throw new OdealError('ODEAL_DISABLED', 'Ödeal entegrasyonu aktif değil');
  }

  // Benzersiz external ID üret
  const externalId = `KB-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

  // Yerel kayıt oluştur
  const [insertResult] = await db.insert(odealPayments).values({
    tenantId: 1,
    externalId,
    amount: request.amount.toFixed(2),
    currency: 'TRY',
    installment: request.installment || 1,
    buyerName: request.buyerName || null,
    buyerPhone: request.buyerPhone || null,
    buyerEmail: request.buyerEmail || null,
    buyerCity: request.buyerCity || null,
    buyerAddress: request.buyerAddress || null,
    status: 'created',
    relatedType: request.relatedType || 'manual',
    relatedId: request.relatedId || null,
    returnUrl: config.returnUrl,
    createdByUserId: request.createdByUserId || null,
  });
  const paymentId = (insertResult as any).insertId;

  // Ödeal API çağrısı
  const token = await getToken();
  const payloadBody: Record<string, any> = {
    amount: request.amount,
    installment: request.installment || 1,
    externalId,
    returnUrl: config.returnUrl ? `${config.returnUrl}?externalId=${externalId}` : undefined,
    currency: 'TRY',
  };

  // Buyer alanları — [DOĞRULA] iç içe nesne mi, düz alanlar mı
  if (request.buyerName) payloadBody.buyerName = request.buyerName;
  if (request.buyerPhone) payloadBody.phone = request.buyerPhone;
  if (request.buyerEmail) payloadBody.buyerMail = request.buyerEmail;
  if (request.buyerCity) payloadBody.buyerCity = request.buyerCity;
  if (request.buyerAddress) payloadBody.buyerAddress = request.buyerAddress;

  try {
    const response = await odealFetch(`${config.apiUrl}/vpos/pay-by-link`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json; charset=utf-8',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payloadBody),
    });

    const body = await response.json().catch(() => null);

    if (!response.ok) {
      // Durumu FAILED olarak güncelle
      await db.update(odealPayments)
        .set({
          status: 'failed',
          providerResponse: body,
        })
        .where(eq(odealPayments.id, paymentId));

      throw new OdealError(
        'PAY_LINK_FAILED',
        `Pay by Link oluşturulamadı: HTTP ${response.status}`,
        response.status,
        JSON.stringify(body)
      );
    }

    // [DOĞRULA] Response şeması — link ve transaction ID
    const paymentLink = body?.link || body?.paymentLink || body?.result?.link || '';
    const odealTransactionId = body?.id || body?.transactionId || body?.result?.id || '';

    await db.update(odealPayments)
      .set({
        odealTransactionId: String(odealTransactionId),
        paymentLink,
        status: 'pending',
        providerResponse: body,
      })
      .where(eq(odealPayments.id, paymentId));

    return {
      id: paymentId,
      externalId,
      paymentLink,
    };
  } catch (err) {
    if (err instanceof OdealError) throw err;
    // Network/timeout hataları — durum UNKNOWN yap
    await db.update(odealPayments)
      .set({ status: 'unknown' })
      .where(eq(odealPayments.id, paymentId));
    throw new OdealError('PAY_LINK_ERROR', `Pay by Link hatası: ${(err as Error).message}`);
  }
}

// ─── İşlem Durumu Sorgulama ─────────────────────────────────────────────────

export async function checkPaymentStatus(paymentDbId: number): Promise<{
  localStatus: string;
  providerStatus: string | null;
  updated: boolean;
}> {
  const [payment] = await db.select().from(odealPayments)
    .where(eq(odealPayments.id, paymentDbId))
    .limit(1);

  if (!payment) {
    throw new OdealError('NOT_FOUND', 'Ödeme kaydı bulunamadı');
  }

  // Terminal durumda sorgulama yapma
  if (['succeeded', 'failed', 'cancelled'].includes(payment.status!) && payment.status !== 'unknown') {
    return { localStatus: payment.status!, providerStatus: null, updated: false };
  }

  const config = await getOdealConfig();
  const token = await getToken();

  const queryBody: Record<string, string> = {};
  if (payment.odealTransactionId) {
    queryBody.id = payment.odealTransactionId;
  } else {
    queryBody.externalId = payment.externalId;
  }

  const response = await odealFetch(`${config.apiUrl}/vpos/check-status`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json; charset=utf-8',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(queryBody),
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    // Attempt sayısını artır ama durumu değiştirme
    await db.update(odealPayments)
      .set({ attemptCount: sql`${odealPayments.attemptCount} + 1` })
      .where(eq(odealPayments.id, paymentDbId));

    return { localStatus: payment.status!, providerStatus: null, updated: false };
  }

  // [DOĞRULA] payment_status alanı
  const providerStatus = body?.result?.payment_status || body?.payment_status || body?.status || 'UNKNOWN';

  // Provider status → local status eşleme
  const mappedStatus = mapProviderStatus(providerStatus);

  // Monoton geçiş kontrolü
  const currentStatus = payment.status!;
  const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];
  if (mappedStatus !== currentStatus && allowed.includes(mappedStatus)) {
    await db.update(odealPayments)
      .set({
        status: mappedStatus as any,
        providerResponse: body,
        attemptCount: sql`${odealPayments.attemptCount} + 1`,
      })
      .where(eq(odealPayments.id, paymentDbId));

    // Başarılı olursa ilişkili payments tablosunu da güncelle
    if (mappedStatus === 'succeeded' && payment.relatedType && payment.relatedId) {
      await syncPaymentRecord(payment);
    }

    return { localStatus: mappedStatus, providerStatus, updated: true };
  }

  // Geçiş yapılamıyorsa sadece attempt count güncelle
  await db.update(odealPayments)
    .set({ attemptCount: sql`${odealPayments.attemptCount} + 1` })
    .where(eq(odealPayments.id, paymentDbId));

  return { localStatus: currentStatus, providerStatus, updated: false };
}

// ─── İptal ──────────────────────────────────────────────────────────────────

export async function cancelPayment(paymentDbId: number): Promise<{ success: boolean; message: string }> {
  const [payment] = await db.select().from(odealPayments)
    .where(eq(odealPayments.id, paymentDbId))
    .limit(1);

  if (!payment) {
    throw new OdealError('NOT_FOUND', 'Ödeme kaydı bulunamadı');
  }

  if (payment.status === 'cancelled') {
    return { success: true, message: 'Ödeme zaten iptal edilmiş' };
  }
  if (payment.status === 'failed') {
    return { success: false, message: 'Başarısız ödeme iptal edilemez' };
  }
  if (payment.refundStatus !== 'none') {
    return { success: false, message: 'İade yapılmış ödeme iptal edilemez' };
  }

  const config = await getOdealConfig();
  const token = await getToken();

  // [DOĞRULA] İptal endpoint'i
  const response = await odealFetch(`${config.apiUrl}/vpos/cancel`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json; charset=utf-8',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      id: payment.odealTransactionId,
      externalId: payment.externalId,
    }),
  });

  const body = await response.json().catch(() => null);

  if (response.ok) {
    await db.update(odealPayments)
      .set({
        status: 'cancelled',
        providerResponse: body,
      })
      .where(eq(odealPayments.id, paymentDbId));

    return { success: true, message: 'Ödeme başarıyla iptal edildi' };
  }

  return {
    success: false,
    message: `İptal başarısız: ${body?.error?.message || body?.message || `HTTP ${response.status}`}`,
  };
}

// ─── İade ───────────────────────────────────────────────────────────────────

export async function refundPayment(
  paymentDbId: number,
  amount: number,
  reason: string,
  userId?: number
): Promise<{ success: boolean; message: string; refundId?: number }> {
  const [payment] = await db.select().from(odealPayments)
    .where(eq(odealPayments.id, paymentDbId))
    .limit(1);

  if (!payment) {
    throw new OdealError('NOT_FOUND', 'Ödeme kaydı bulunamadı');
  }
  if (payment.status !== 'succeeded') {
    return { success: false, message: 'Yalnızca başarılı ödemeler iade edilebilir' };
  }

  const originalAmount = parseFloat(payment.amount);
  const alreadyRefunded = parseFloat(payment.totalRefunded || '0');

  if (amount <= 0) {
    return { success: false, message: 'İade tutarı 0\'dan büyük olmalıdır' };
  }
  if (alreadyRefunded + amount > originalAmount) {
    return { success: false, message: `İade tutarı orijinal tutarı aşıyor. Kalan: ${(originalAmount - alreadyRefunded).toFixed(2)} TL` };
  }

  const externalRefundId = `KB-R-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

  // Yerel iade kaydı oluştur
  const [refundInsert] = await db.insert(odealRefunds).values({
    tenantId: 1,
    odealPaymentId: paymentDbId,
    externalRefundId,
    amount: amount.toFixed(2),
    reason,
    status: 'pending',
    createdByUserId: userId || null,
  });
  const refundId = (refundInsert as any).insertId;

  const config = await getOdealConfig();
  const token = await getToken();

  // [DOĞRULA] İade endpoint'i
  const response = await odealFetch(`${config.apiUrl}/vpos/refund`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json; charset=utf-8',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      id: payment.odealTransactionId,
      externalId: payment.externalId,
      amount,
    }),
  });

  const body = await response.json().catch(() => null);

  if (response.ok) {
    const newTotalRefunded = alreadyRefunded + amount;
    const isFullRefund = newTotalRefunded >= originalAmount;

    await db.update(odealRefunds)
      .set({
        status: 'succeeded',
        providerRefundId: body?.refundId || body?.id || null,
        providerResponse: body,
      })
      .where(eq(odealRefunds.id, refundId));

    await db.update(odealPayments)
      .set({
        totalRefunded: newTotalRefunded.toFixed(2),
        refundStatus: isFullRefund ? 'full' : 'partial',
      })
      .where(eq(odealPayments.id, paymentDbId));

    return { success: true, message: 'İade başarılı', refundId };
  }

  await db.update(odealRefunds)
    .set({
      status: 'failed',
      providerResponse: body,
    })
    .where(eq(odealRefunds.id, refundId));

  return {
    success: false,
    message: `İade başarısız: ${body?.error?.message || body?.message || `HTTP ${response.status}`}`,
    refundId,
  };
}

// ─── Webhook İşleme ─────────────────────────────────────────────────────────

export async function handleWebhook(rawBody: string, headers: Record<string, string>): Promise<{ ok: boolean }> {
  const payloadHash = crypto.createHash('sha256').update(rawBody).digest('hex');

  // Aynı payload daha önce işlendi mi?
  const existing = await db.select().from(odealWebhookInbox)
    .where(eq(odealWebhookInbox.payloadHash, payloadHash))
    .limit(1);

  if (existing.length > 0) {
    return { ok: true }; // İdempotent — tekrar 2xx dön
  }

  let parsedPayload: any = {};
  try {
    parsedPayload = JSON.parse(rawBody);
  } catch {
    console.error('[Ödeal Webhook] JSON parse hatası');
    return { ok: false };
  }

  // [DOĞRULA] Callback payload yapısı — eventId, externalId, status alanları
  const eventId = parsedPayload.eventId || parsedPayload.id || payloadHash;
  const externalId = parsedPayload.externalId || parsedPayload.external_id || null;
  const eventType = parsedPayload.eventType || parsedPayload.type || 'payment_result';

  const config = await getOdealConfig();
  let signatureValid = true;
  const incomingSignature = headers['x-odeal-signature'] || headers['x-signature'] || headers['signature'] || '';
  
  if (config.secretKey && incomingSignature) {
    const expectedHex = crypto.createHmac('sha256', config.secretKey).update(rawBody).digest('hex');
    const expectedBase64 = crypto.createHmac('sha256', config.secretKey).update(rawBody).digest('base64');
    signatureValid = (incomingSignature === expectedHex || incomingSignature === expectedBase64);
  } else if (config.secretKey && !incomingSignature) {
    signatureValid = false;
  }

  if (!signatureValid) {
    console.error('[Ödeal Webhook] Geçersiz veya eksik webhook imzası!');
    await db.insert(odealWebhookInbox).values({
      provider: 'ODEAL',
      eventId: String(eventId),
      eventType,
      externalId,
      payloadHash,
      rawPayload: parsedPayload,
      signatureValid: false,
      processingState: 'failed',
    }).catch(console.error);
    return { ok: false };
  }

  // Inbox'a kaydet
  await db.insert(odealWebhookInbox).values({
    provider: 'ODEAL',
    eventId: String(eventId),
    eventType,
    externalId,
    payloadHash,
    rawPayload: parsedPayload,
    signatureValid: true,
    processingState: 'processing',
  });

  // İlişkili ödeme kaydını bul ve güncelle
  if (externalId) {
    try {
      const [payment] = await db.select().from(odealPayments)
        .where(eq(odealPayments.externalId, externalId))
        .limit(1);

      if (payment) {
        const providerStatus = parsedPayload.payment_status || parsedPayload.status || 'UNKNOWN';
        const mappedStatus = mapProviderStatus(providerStatus);

        const currentStatus = payment.status!;
        const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];

        if (mappedStatus !== currentStatus && allowed.includes(mappedStatus)) {
          await db.update(odealPayments)
            .set({
              status: mappedStatus as any,
              callbackReceivedAt: new Date(),
              providerResponse: parsedPayload,
            })
            .where(eq(odealPayments.id, payment.id));

          if (mappedStatus === 'succeeded' && payment.relatedType && payment.relatedId) {
            await syncPaymentRecord(payment);
          }
        } else {
          await db.update(odealPayments)
            .set({ callbackReceivedAt: new Date() })
            .where(eq(odealPayments.id, payment.id));
        }
      }

      // Inbox'u processed olarak işaretle
      await db.update(odealWebhookInbox)
        .set({ processingState: 'processed', processedAt: new Date() })
        .where(eq(odealWebhookInbox.payloadHash, payloadHash));
    } catch (err) {
      console.error('[Ödeal Webhook] İşleme hatası:', (err as Error).message);
      await db.update(odealWebhookInbox)
        .set({ processingState: 'failed' })
        .where(eq(odealWebhookInbox.payloadHash, payloadHash));
    }
  }

  return { ok: true };
}

// ─── Recovery Job ───────────────────────────────────────────────────────────

export async function runRecoveryJob(): Promise<{ checked: number; updated: number }> {
  const config = await getOdealConfig();
  if (!config.enabled || !config.apiKey) {
    return { checked: 0, updated: 0 };
  }

  const graceTime = new Date(Date.now() - RECOVERY_GRACE_PERIOD_MS);

  // Belirsiz durumdaki kayıtları bul
  const pendingPayments = await db.select().from(odealPayments)
    .where(
      and(
        inArray(odealPayments.status, ['created', 'pending', 'processing', 'unknown']),
        lt(odealPayments.updatedAt, graceTime),
        lt(odealPayments.attemptCount, MAX_RECOVERY_ATTEMPTS)
      )
    )
    .limit(20);

  let updated = 0;

  for (const payment of pendingPayments) {
    try {
      const result = await checkPaymentStatus(payment.id);
      if (result.updated) updated++;
    } catch (err) {
      console.error(`[Ödeal Recovery] ID ${payment.id} sorgulanamadı:`, (err as Error).message);
    }
    // Rate limiting — çağrılar arası 500ms bekle
    await new Promise(r => setTimeout(r, 500));
  }

  if (pendingPayments.length > 0) {
    console.log(`[Ödeal Recovery] ${pendingPayments.length} işlem kontrol edildi, ${updated} güncellendi`);
  }

  return { checked: pendingPayments.length, updated };
}

// ─── Bağlantı Testi ─────────────────────────────────────────────────────────

export async function testConnection(): Promise<{ success: boolean; message: string; latencyMs?: number }> {
  const config = await getOdealConfig();
  if (!config.apiKey || !config.secretKey) {
    return { success: false, message: 'API anahtarları yapılandırılmamış' };
  }

  const start = Date.now();
  try {
    // Token almayı dene
    cachedToken = null; // Cache'i temizle
    tokenExpiresAt = 0;
    await getToken();
    const latencyMs = Date.now() - start;
    return { success: true, message: 'Bağlantı başarılı', latencyMs };
  } catch (err) {
    const latencyMs = Date.now() - start;
    return {
      success: false,
      message: `Bağlantı başarısız: ${(err as Error).message}`,
      latencyMs,
    };
  }
}

// ─── Ödeme Listesi ──────────────────────────────────────────────────────────

export async function listPayments(filters?: {
  status?: string;
  relatedType?: string;
  relatedId?: number;
  limit?: number;
}): Promise<any[]> {
  let query = db.select().from(odealPayments).orderBy(sql`${odealPayments.createdAt} DESC`);

  // Drizzle'da dinamik where zinciri — basit tutuyoruz
  if (filters?.relatedType && filters?.relatedId) {
    return db.select().from(odealPayments)
      .where(and(
        eq(odealPayments.relatedType, filters.relatedType as any),
        eq(odealPayments.relatedId, filters.relatedId)
      ))
      .orderBy(sql`${odealPayments.createdAt} DESC`)
      .limit(filters?.limit || 100);
  }

  if (filters?.status) {
    return db.select().from(odealPayments)
      .where(eq(odealPayments.status, filters.status as any))
      .orderBy(sql`${odealPayments.createdAt} DESC`)
      .limit(filters?.limit || 100);
  }

  return db.select().from(odealPayments)
    .orderBy(sql`${odealPayments.createdAt} DESC`)
    .limit(filters?.limit || 100);
}

export async function getPaymentDetail(id: number) {
  const [payment] = await db.select().from(odealPayments)
    .where(eq(odealPayments.id, id))
    .limit(1);

  if (!payment) return null;

  const refunds = await db.select().from(odealRefunds)
    .where(eq(odealRefunds.odealPaymentId, id))
    .orderBy(sql`${odealRefunds.createdAt} DESC`);

  return { ...payment, refunds };
}

// ─── Yardımcı Fonksiyonlar ──────────────────────────────────────────────────

/**
 * [DOĞRULA] Provider status → local status eşlemesi.
 * Ödeal'in tam payment_status enum listesi alındıktan sonra tamamlanmalı.
 */
function mapProviderStatus(providerStatus: string): string {
  const normalized = (providerStatus || '').toUpperCase().trim();

  const mapping: Record<string, string> = {
    'SUCCESS': 'succeeded',
    'SUCCESSFUL': 'succeeded',
    'APPROVED': 'succeeded',
    'COMPLETED': 'succeeded',
    'FAILED': 'failed',
    'FAILURE': 'failed',
    'DECLINED': 'failed',
    'REJECTED': 'failed',
    'ERROR': 'failed',
    'CANCELLED': 'cancelled',
    'CANCELED': 'cancelled',
    'CANCEL': 'cancelled',
    'PENDING': 'pending',
    'WAITING': 'pending',
    'IN_PROGRESS': 'processing',
    'PROCESSING': 'processing',
  };

  return mapping[normalized] || 'unknown';
}

/**
 * Başarılı Ödeal ödemesini yerel payments tablosuna senkronize eder
 */
async function syncPaymentRecord(payment: any): Promise<void> {
  try {
    // Daha önce senkronize edilmiş mi?
    const existing = await db.select().from(payments)
      .where(eq(payments.transactionId, `odeal:${payment.externalId}`))
      .limit(1);

    if (existing.length > 0) return; // Zaten var

    await db.insert(payments).values({
      tenantId: payment.tenantId || 1,
      ticketId: payment.relatedType === 'ticket' ? payment.relatedId : null,
      amount: payment.amount,
      paymentMethod: 'kredi_karti',
      status: 'basarili',
      transactionId: `odeal:${payment.externalId}`,
      notes: `Ödeal Pay by Link - ${payment.externalId}`,
    });
  } catch (err) {
    console.error('[Ödeal] payments senkronizasyon hatası:', (err as Error).message);
  }
}

// ─── Özel Hata Sınıfı ──────────────────────────────────────────────────────

export class OdealError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly httpStatus?: number,
    public readonly providerBody?: string,
  ) {
    super(message);
    this.name = 'OdealError';
  }
}
