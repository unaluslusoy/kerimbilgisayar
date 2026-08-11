/**
 * SMS Gateway Servis Katmanı
 * ─────────────────────────
 * Netgsm, VatanSMS veya jenerik SMS HTTP API sağlayıcıları üzerinden SMS gönderim yönetimi.
 */

import { db } from '../db/index';
import { eq, and } from 'drizzle-orm';
import { settings, auditLogs } from '../db/schema';

export interface SmsConfig {
  provider: 'netgsm' | 'vatansms' | 'generic';
  apiUrl: string;
  apiKey: string;
  apiSecret: string;
  username: string;
  header: string; // SMS Başlığı / Sender ID
  enabled: boolean;
}

export interface SendSmsRequest {
  phone: string;
  message: string;
  ticketId?: number;
}

// ─── Config Okuma & Yazma ───────────────────────────────────────────────────

export async function getSmsConfig(): Promise<SmsConfig> {
  const rows = await db.select().from(settings)
    .where(eq(settings.group, 'sms'));

  const config: Record<string, string> = {};
  for (const row of rows) {
    config[row.key] = row.value || '';
  }

  return {
    provider: (config['sms_provider'] as any) || 'netgsm',
    apiUrl: config['sms_api_url'] || 'https://api.netgsm.com.tr/sms/send/get',
    apiKey: config['sms_api_key'] || '',
    apiSecret: config['sms_api_secret'] || '',
    username: config['sms_username'] || '',
    header: config['sms_header'] || 'KERIMBLG',
    enabled: config['sms_enabled'] === 'true',
  };
}

export async function saveSmsConfig(updates: Partial<SmsConfig>): Promise<void> {
  const keyMap: Record<string, string> = {
    provider: 'sms_provider',
    apiUrl: 'sms_api_url',
    apiKey: 'sms_api_key',
    apiSecret: 'sms_api_secret',
    username: 'sms_username',
    header: 'sms_header',
    enabled: 'sms_enabled',
  };

  for (const [field, dbKey] of Object.entries(keyMap)) {
    if (field in updates) {
      const value = String((updates as any)[field]);
      const existing = await db.select().from(settings)
        .where(and(eq(settings.key, dbKey), eq(settings.group, 'sms')))
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
          group: 'sms',
        });
      }
    }
  }
}

// ─── Telefon Formatlama ─────────────────────────────────────────────────────

export function formatPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }
  if (cleaned.startsWith('90') && cleaned.length === 12) {
    cleaned = cleaned.substring(2);
  }
  // Türkiye 10 haneli format: 5XXXXXXXXX
  return cleaned;
}

// ─── SMS Gönderim Mantığı ───────────────────────────────────────────────────

export async function sendSms(req: SendSmsRequest): Promise<{ success: boolean; message: string; rawResponse?: string }> {
  const config = await getSmsConfig();
  if (!config.enabled) {
    return { success: false, message: 'SMS gönderim servisi aktif değil' };
  }

  const phone = formatPhoneNumber(req.phone);
  if (phone.length !== 10) {
    return { success: false, message: 'Geçersiz telefon numarası formatı' };
  }

  try {
    let result: { success: boolean; message: string; rawResponse?: string };

    if (config.provider === 'netgsm') {
      result = await sendNetgsm(config, phone, req.message);
    } else if (config.provider === 'vatansms') {
      result = await sendVatanSms(config, phone, req.message);
    } else {
      result = await sendGenericSms(config, phone, req.message);
    }

    // Audit log kaydı
    await db.insert(auditLogs).values({
      tenantId: 1,
      action: 'sms.sent',
      entityType: req.ticketId ? 'Ticket' : 'SMS',
      entityId: req.ticketId || null,
      details: {
        phone: `+90${phone}`,
        provider: config.provider,
        success: result.success,
        messageSnippet: req.message.substring(0, 50),
      },
    }).catch(e => console.error('SMS Audit error:', e));

    return result;
  } catch (err: any) {
    console.error('[SMS Service] Gönderim hatası:', err.message);
    return { success: false, message: `SMS hatası: ${err.message}` };
  }
}

// Netgsm API Gönderimi
async function sendNetgsm(config: SmsConfig, phone: string, message: string) {
  const url = new URL(config.apiUrl || 'https://api.netgsm.com.tr/sms/send/get');
  url.searchParams.set('usercode', config.username);
  url.searchParams.set('password', config.apiKey);
  url.searchParams.set('gsmno', phone);
  url.searchParams.set('message', message);
  url.searchParams.set('msgheader', config.header);

  const res = await fetch(url.toString(), { method: 'GET' });
  const text = await res.text();

  // Netgsm 00 veya 01/02 dönüyorsa başarılıdır
  const isOk = text.startsWith('00') || text.startsWith('01') || text.startsWith('02');
  return {
    success: isOk,
    message: isOk ? 'SMS başarıyla gönderildi' : `Netgsm Hata Kodu: ${text}`,
    rawResponse: text,
  };
}

// VatanSMS API Gönderimi
async function sendVatanSms(config: SmsConfig, phone: string, message: string) {
  const payload = {
    api_id: config.username,
    api_key: config.apiKey,
    sender: config.header,
    message: message,
    phones: [phone],
  };

  const res = await fetch(config.apiUrl || 'https://api.vatansms.com/v1/1toN', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const body = await res.json().catch(() => null);
  const isOk = res.ok && (body?.status === 'success' || body?.code === 200);

  return {
    success: isOk,
    message: isOk ? 'SMS başarıyla gönderildi' : `VatanSMS Hata: ${body?.message || res.status}`,
    rawResponse: JSON.stringify(body),
  };
}

// Jenerik HTTP POST Gönderimi
async function sendGenericSms(config: SmsConfig, phone: string, message: string) {
  const res = await fetch(config.apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      to: `+90${phone}`,
      sender: config.header,
      text: message,
    }),
  });

  const text = await res.text();
  return {
    success: res.ok,
    message: res.ok ? 'SMS gönderildi' : `HTTP ${res.status}`,
    rawResponse: text,
  };
}
