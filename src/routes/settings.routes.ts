import express from 'express';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '../db/index';
import { settings, themeSettings, layoutTemplates, layoutAssignments, users } from '../db/schema';
import { requireAdmin } from '../server/middleware';
import { sendTicketEmail, sendEmailDetails } from '../lib/mail';
import { invalidateDbBlockedIpsCache } from '../server/helpers';

export const settingsRouter = express.Router();

settingsRouter.get('/api/admin/settings', requireAdmin, async (req, res) => {
  try {
    const allSettings = await db.select().from(settings);
    const settingsMap: Record<string, string> = {};
    allSettings.forEach(s => {
      if (s.value !== null && s.value !== undefined) settingsMap[s.key] = s.value;
    });
    res.json(settingsMap);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

settingsRouter.put('/api/admin/settings', requireAdmin, async (req, res) => {
  try {
    const updates = req.body as Record<string, string>;
    for (const [key, value] of Object.entries(updates)) {
      const existing = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
      if (existing.length > 0) {
        await db.update(settings).set({ value }).where(eq(settings.key, key));
      } else {
        await db.insert(settings).values({ tenantId: 1, key, value, group: 'general' });
      }
    }
    invalidateDbBlockedIpsCache();
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

const getSettingsMap = async () => {
  const allSettings = await db.select().from(settings);
  const settingsMap: Record<string, string> = {};
  allSettings.forEach(s => {
    if (s.value !== null && s.value !== undefined) settingsMap[s.key] = s.value;
  });
  return settingsMap;
};

const cloudflareRequest = async (settingsMap: Record<string, string>, pathName: string, init: RequestInit = {}) => {
  const zoneId = settingsMap.cloudflareZoneId?.trim();
  const apiToken = settingsMap.cloudflareApiToken?.trim();

  if (!zoneId || !apiToken) {
    const error = new Error('Cloudflare Zone ID ve API Token zorunludur.');
    (error as any).statusCode = 400;
    throw error;
  }

  const response = await fetch(`https://api.cloudflare.com/client/v4${pathName.replace(':zoneId', zoneId)}`, {
    ...init,
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok || data?.success === false) {
    const message = data?.errors?.[0]?.message || `Cloudflare isteği başarısız oldu (${response.status}).`;
    const error = new Error(message);
    (error as any).statusCode = response.status || 500;
    throw error;
  }

  return data;
};

settingsRouter.post('/api/admin/cloudflare/test', requireAdmin, async (req, res) => {
  try {
    const settingsMap = await getSettingsMap();
    const data = await cloudflareRequest(settingsMap, '/zones/:zoneId');
    res.json({ success: true, zone: data.result });
  } catch (e: any) {
    res.status(e.statusCode || 500).json({ success: false, error: e.message });
  }
});

settingsRouter.post('/api/admin/cloudflare/purge-cache', requireAdmin, async (req, res) => {
  try {
    const settingsMap = await getSettingsMap();
    const files = Array.isArray(req.body?.files) ? req.body.files.filter((file: unknown) => typeof file === 'string' && file.trim()) : [];
    const body = files.length > 0 ? { files } : { purge_everything: true };
    const data = await cloudflareRequest(settingsMap, '/zones/:zoneId/purge_cache', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    res.json({ success: true, result: data.result });
  } catch (e: any) {
    res.status(e.statusCode || 500).json({ success: false, error: e.message });
  }
});

settingsRouter.post('/api/admin/cloudflare/setting', requireAdmin, async (req, res) => {
  try {
    const allowedSettings = new Set(['development_mode', 'ssl', 'always_use_https', 'browser_cache_ttl']);
    const { setting, value } = req.body || {};
    if (!allowedSettings.has(setting)) {
      return res.status(400).json({ success: false, error: 'Bu Cloudflare ayarı desteklenmiyor.' });
    }

    const settingsMap = await getSettingsMap();
    const data = await cloudflareRequest(settingsMap, `/zones/:zoneId/settings/${setting}`, {
      method: 'PATCH',
      body: JSON.stringify({ value }),
    });
    res.json({ success: true, result: data.result });
  } catch (e: any) {
    res.status(e.statusCode || 500).json({ success: false, error: e.message });
  }
});

// ADMIN API — THEME BUILDER (LIVE CUSTOMIZER)
settingsRouter.get('/api/admin/theme/settings', requireAdmin, async (req, res) => {
  try {
    const isDraft = req.query.draft === 'true';
    const allSettings = await db.select().from(themeSettings).where(eq(themeSettings.isDraft, isDraft));
    const settingsMap: Record<string, any> = {};
    allSettings.forEach(s => {
      settingsMap[s.settingKey] = s.settingValue;
    });
    res.json(settingsMap);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

settingsRouter.put('/api/admin/theme/settings/draft', requireAdmin, async (req, res) => {
  try {
    const updates = req.body as Record<string, any>;
    for (const [key, value] of Object.entries(updates)) {
      const existing = await db.select().from(themeSettings)
        .where(and(eq(themeSettings.settingKey, key), eq(themeSettings.isDraft, true))).limit(1);
        
      if (existing.length > 0) {
        await db.update(themeSettings).set({ settingValue: value }).where(eq(themeSettings.id, existing[0].id));
      } else {
        await db.insert(themeSettings).values({ 
          tenantId: 1, 
          settingGroup: 'general', 
          settingKey: key, 
          settingValue: value, 
          isDraft: true 
        });
      }
    }
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

settingsRouter.post('/api/admin/theme/settings/publish', requireAdmin, async (req, res) => {
  try {
    const draftSettings = await db.select().from(themeSettings).where(eq(themeSettings.isDraft, true));
    
    for (const draft of draftSettings) {
      const live = await db.select().from(themeSettings)
        .where(and(eq(themeSettings.settingKey, draft.settingKey), eq(themeSettings.isDraft, false))).limit(1);
        
      if (live.length > 0) {
        await db.update(themeSettings).set({ settingValue: draft.settingValue }).where(eq(themeSettings.id, live[0].id));
      } else {
        await db.insert(themeSettings).values({
          tenantId: 1,
          settingGroup: draft.settingGroup,
          settingKey: draft.settingKey,
          settingValue: draft.settingValue,
          isDraft: false
        });
      }
    }
    
    await db.delete(themeSettings).where(eq(themeSettings.isDraft, true));
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

settingsRouter.post('/api/admin/theme/settings/discard', requireAdmin, async (req, res) => {
  try {
    await db.delete(themeSettings).where(eq(themeSettings.isDraft, true));
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ADMIN API — LAYOUTS
settingsRouter.get('/api/admin/layouts', requireAdmin, async (req, res) => {
  try {
    const type = req.query.type as string;
    let query: any = db.select().from(layoutTemplates);
    if (type) {
      query = query.where(eq(layoutTemplates.type, type as any));
    }
    const results = await query;
    res.json(results);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

settingsRouter.post('/api/admin/layouts', requireAdmin, async (req, res) => {
  try {
    const { type, name, isDefault, structure } = req.body;
    const insertResult = await db.insert(layoutTemplates).values({
      tenantId: 1,
      type, name, isDefault: isDefault || false, structure: structure || { regions: [] }
    });
    res.json({ success: true, id: insertResult[0].insertId });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

settingsRouter.get('/api/admin/layouts/resolve', requireAdmin, async (req, res) => {
  try {
    const { type } = req.query;
    const defaultLayout = await db.select().from(layoutTemplates).where(and(eq(layoutTemplates.type, type as any), eq(layoutTemplates.isDefault, true))).limit(1);
    res.json(defaultLayout.length > 0 ? defaultLayout[0] : null);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

settingsRouter.get('/api/admin/layouts/:id/assignments', requireAdmin, async (req, res) => {
  try {
    const results = await db.select().from(layoutAssignments).where(eq(layoutAssignments.layoutTemplateId, parseInt(req.params.id)));
    res.json(results);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

settingsRouter.post('/api/admin/layouts/:id/assignments', requireAdmin, async (req, res) => {
  try {
    const { conditionType, conditionValue, priority } = req.body;
    await db.insert(layoutAssignments).values({
      layoutTemplateId: parseInt(req.params.id),
      conditionType, conditionValue, priority: priority || 0
    });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

settingsRouter.delete('/api/admin/layouts/assignments/:id', requireAdmin, async (req, res) => {
  try {
    await db.delete(layoutAssignments).where(eq(layoutAssignments.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

settingsRouter.post('/api/admin/settings/smtp-test', requireAdmin, async (req, res) => {
  try {
    const adminUser = (req as any).adminUser;
    const profile = await db.select({ email: users.email }).from(users).where(eq(users.id, adminUser.userId)).limit(1);
    const testEmail = profile[0]?.email;
    if (!testEmail) return res.status(400).json({ error: 'Admin e-postası bulunamadı' });

    const result = await sendEmailDetails(
      testEmail,
      'SMTP Test — Kerim Bilgisayar',
      `<div style="font-family:sans-serif; max-width:600px; margin:0 auto; border:1px solid #e5e7eb; border-radius:8px; padding:20px;">
        <h2 style="color:#16a34a;">SMTP Test E-postası</h2>
        <p>Bu bir SMTP test e-postasıdır. Sunucu e-posta ayarlarınız başarıyla yapılandırılmıştır!</p>
        <p style="font-size:12px; color:#6b7280;">Tarih: ${new Date().toLocaleString('tr-TR')}</p>
      </div>`
    );

    if (result.success) {
      res.json({ success: true, message: `Test e-postası ${testEmail} adresine başarıyla gönderildi.` });
    } else {
      res.status(400).json({ success: false, error: result.error || 'E-posta gönderilemedi. SMTP ayarlarını kontrol edin.' });
    }
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ─── Veritabanı Yedeği Dışa Aktarma (SQL Dump) ──────────────────────────────

settingsRouter.get('/api/admin/system/backup', requireAdmin, async (_req, res) => {
  try {
    const tableNames = [
      'users', 'customers', 'companies', 'tickets', 'devices', 'stock_items',
      'inventory_categories', 'sales', 'sale_items', 'payments', 'invoices',
      'settings', 'dealer_ledger', 'customer_ledger', 'odeal_payments',
      'odeal_refunds', 'exchange_rates', 'period_locks', 'shipments', 'expenses'
    ];

    let sqlDump = `-- ========================================================\n`;
    sqlDump += `-- Kerim Bilgisayar Database Backup\n`;
    sqlDump += `-- Date: ${new Date().toISOString()}\n`;
    sqlDump += `-- ========================================================\n\n`;

    for (const table of tableNames) {
      try {
        const rows = await db.execute(sql.raw(`SELECT * FROM \`${table}\``)) as any;
        const dataRows = Array.isArray(rows) ? (Array.isArray(rows[0]) ? rows[0] : rows) : [];
        if (dataRows.length > 0) {
          sqlDump += `-- Table: ${table}\n`;
          for (const row of dataRows) {
            const keys = Object.keys(row).map(k => `\`${k}\``).join(', ');
            const values = Object.values(row).map(v => {
              if (v === null || v === undefined) return 'NULL';
              if (typeof v === 'number') return v;
              if (typeof v === 'boolean') return v ? 1 : 0;
              if (v instanceof Date) return `'${v.toISOString().slice(0, 19).replace('T', ' ')}'`;
              if (typeof v === 'object') return `'${JSON.stringify(v).replace(/'/g, "''")}'`;
              return `'${String(v).replace(/'/g, "''")}'`;
            }).join(', ');
            sqlDump += `INSERT INTO \`${table}\` (${keys}) VALUES (${values});\n`;
          }
          sqlDump += `\n`;
        }
      } catch (err) {
        // Table error fallback
      }
    }

    const filename = `kerimbilgisayar_backup_${new Date().toISOString().slice(0, 10)}.sql`;
    res.setHeader('Content-Type', 'application/sql');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(sqlDump);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

