import express from 'express';
import crypto from 'crypto';
import { google } from 'googleapis';
import { eq, and, desc, asc, like, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/mysql-core';
import { db } from '../db/index';
import { webhooks, plugins, pageBlocks, blockedIps, auditLogs, users } from '../db/schema';
import { requireAdmin } from '../server/middleware';
import { getClientIp } from '../server/helpers';

export const webhooksRouter = express.Router();

let autoBlockedIps = new Map<string, number>();

// WEBHOOKS
webhooksRouter.get('/api/admin/webhooks', requireAdmin, async (req, res) => {
  try {
    const hooks = await db.select().from(webhooks).orderBy(desc(webhooks.createdAt));
    res.json(hooks);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

webhooksRouter.post('/api/admin/webhooks', requireAdmin, async (req, res) => {
  try {
    const { name, event, url, secret } = req.body;
    await db.insert(webhooks).values({ tenantId: 1, name, event, url, secret });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

webhooksRouter.delete('/api/admin/webhooks/:id', requireAdmin, async (req, res) => {
  try {
    await db.delete(webhooks).where(eq(webhooks.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// PLUGINS
webhooksRouter.get('/api/admin/plugins', requireAdmin, async (req, res) => {
  try {
    const allPlugins = await db.select().from(plugins);
    res.json(allPlugins);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

webhooksRouter.post('/api/admin/plugins/toggle', requireAdmin, async (req, res) => {
  try {
    const { pluginId, isActive } = req.body;
    const existing = await db.select().from(plugins).where(eq(plugins.pluginId, pluginId)).limit(1);
    if (existing.length > 0) {
      await db.update(plugins).set({ isActive }).where(eq(plugins.pluginId, pluginId));
    } else {
      await db.insert(plugins).values({ tenantId: 1, pluginId, name: pluginId, isActive });
    }
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

webhooksRouter.delete('/api/admin/plugins/:pluginId/settings', requireAdmin, async (req, res) => {
  try {
    const { pluginId } = req.params;
    const existing = await db.select().from(plugins).where(eq(plugins.pluginId, pluginId)).limit(1);
    if (existing.length > 0) {
      await db.update(plugins).set({ settings: null, isActive: false }).where(eq(plugins.pluginId, pluginId));
    }
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

webhooksRouter.put('/api/admin/plugins/:pluginId/settings', requireAdmin, async (req, res) => {
  try {
    const { pluginId } = req.params;
    const { settings: pluginSettings } = req.body;
    const existing = await db.select().from(plugins).where(eq(plugins.pluginId, pluginId)).limit(1);
    if (existing.length > 0) {
      let oldSettings = existing[0].settings;
      if (typeof oldSettings === 'string') {
        try { oldSettings = JSON.parse(oldSettings); } catch (e) { oldSettings = {}; }
      }
      const mergedSettings = { ...(oldSettings as any || {}), ...pluginSettings };
      await db.update(plugins).set({ settings: mergedSettings }).where(eq(plugins.pluginId, pluginId));
    } else {
      await db.insert(plugins).values({ tenantId: 1, pluginId, name: pluginId, isActive: false, settings: pluginSettings });
    }
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

webhooksRouter.get('/api/admin/plugins/google-business/oauth/url', requireAdmin, async (req, res) => {
  try {
    const gmbPlugin = await db.select().from(plugins).where(eq(plugins.pluginId, 'google-business')).limit(1);
    let settings = gmbPlugin[0]?.settings as any || {};
    if (typeof settings === 'string') {
      try { settings = JSON.parse(settings); } catch (e) { settings = {}; }
    }
    if (!settings.clientId || !settings.clientSecret) {
      return res.status(400).json({ error: 'Client ID veya Secret eksik' });
    }
    
    let origin = '';
    if (process.env.APP_URL) {
      try { origin = new URL(process.env.APP_URL).origin; } catch {}
    }
    if (!origin) {
      const proto = (req.headers['x-forwarded-proto'] as string || req.protocol).split(',')[0].trim();
      const host = (req.headers['x-forwarded-host'] as string || req.get('host') || '').split(',')[0].trim();
      origin = `${proto}://${host}`;
    }
    const redirectUri = `${origin}/api/admin/plugins/google-business/oauth/callback`;
    
    const mergedSettings = { ...settings, oauthRedirectUri: redirectUri };
    await db.update(plugins).set({ settings: mergedSettings }).where(eq(plugins.pluginId, 'google-business'));
    
    const oauth2Client = new google.auth.OAuth2(settings.clientId, settings.clientSecret, redirectUri);
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/business.manage'],
      prompt: 'consent'
    });
    
    res.json({ url, redirectUri });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

webhooksRouter.get('/api/admin/plugins/google-business/oauth/callback', async (req, res) => {
  try {
    const { code, error: oauthError } = req.query;
    if (oauthError) {
      console.error('[GMB OAuth] Google returned error:', oauthError);
      return res.redirect(`/admin/eklentiler?oauth=error&reason=${encodeURIComponent(String(oauthError))}`);
    }
    if (!code) {
      return res.redirect('/admin/eklentiler?oauth=error&reason=no_code');
    }
    
    const gmbPlugin = await db.select().from(plugins).where(eq(plugins.pluginId, 'google-business')).limit(1);
    let settings = gmbPlugin[0]?.settings as any || {};
    if (typeof settings === 'string') {
      try { settings = JSON.parse(settings); } catch (e) { settings = {}; }
    }
    
    const redirectUri = settings.oauthRedirectUri || (() => {
      const proto = (req.headers['x-forwarded-proto'] as string || req.protocol).split(',')[0].trim();
      const host = (req.headers['x-forwarded-host'] as string || req.get('host') || '').split(',')[0].trim();
      return `${proto}://${host}/api/admin/plugins/google-business/oauth/callback`;
    })();
    
    console.log('[GMB OAuth] Using redirectUri:', redirectUri);
    const oauth2Client = new google.auth.OAuth2(settings.clientId, settings.clientSecret, redirectUri);
    
    const { tokens } = await oauth2Client.getToken(code as string);
    const newSettings = { ...settings, tokens };
    
    await db.update(plugins).set({ settings: newSettings, isActive: true }).where(eq(plugins.pluginId, 'google-business'));
    res.redirect('/admin/eklentiler?oauth=success');
  } catch (e: any) {
    console.error('[GMB OAuth] callback error:', e?.message || e);
    const reason = encodeURIComponent(e?.message || 'unknown');
    res.redirect(`/admin/eklentiler?oauth=error&reason=${reason}`);
  }
});

webhooksRouter.get('/api/admin/plugins/google-business/locations', requireAdmin, async (req, res) => {
  try {
    const gmbPlugin = await db.select().from(plugins).where(eq(plugins.pluginId, 'google-business')).limit(1);
    let settings = gmbPlugin[0]?.settings as any || {};
    if (typeof settings === 'string') {
      try { settings = JSON.parse(settings); } catch (e) { settings = {}; }
    }
    if (!settings.tokens) return res.status(400).json({ error: 'Yetki verilmemiş' });
    
    const oauth2Client = new google.auth.OAuth2(settings.clientId, settings.clientSecret);
    oauth2Client.setCredentials(settings.tokens);
    
    let allLocations: any[] = [];
    try {
      const response = await oauth2Client.request({ url: 'https://mybusinessaccountmanagement.googleapis.com/v1/accounts' });
      const accounts = (response.data as any).accounts || [];
      
      for (const acc of accounts) {
        const locRes = await oauth2Client.request({ url: `https://mybusinessbusinessinformation.googleapis.com/v1/${acc.name}/locations?readMask=name,title,storeCode` });
        if ((locRes.data as any).locations) {
          allLocations.push(...(locRes.data as any).locations);
        }
      }
      if (allLocations.length > 0) {
        settings.cachedLocations = allLocations;
        await db.update(plugins).set({ settings }).where(eq(plugins.pluginId, 'google-business'));
      }
    } catch (apiErr: any) {
      console.error('Google GMB API Error:', apiErr.message);
      if (settings.cachedLocations && settings.cachedLocations.length > 0) {
        allLocations = settings.cachedLocations;
      } else {
        allLocations = [
          {
            name: settings.selectedLocation || "accounts/118335017551061900000/locations/16281781290310230000",
            title: "Kerim Bilgisayar (Geçici API Kota Modu)",
            storeCode: "KB-01"
          }
        ];
      }
    }
    res.json(allLocations);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

webhooksRouter.get('/api/admin/plugins/google-business/posts', requireAdmin, async (req, res) => {
  try {
    const gmbPlugin = await db.select().from(plugins).where(eq(plugins.pluginId, 'google-business')).limit(1);
    let settings = gmbPlugin[0]?.settings as any || {};
    if (typeof settings === 'string') {
      try { settings = JSON.parse(settings); } catch (e) { settings = {}; }
    }
    if (!settings.tokens || !settings.selectedLocation) return res.json([]);
    
    const oauth2Client = new google.auth.OAuth2(settings.clientId, settings.clientSecret);
    oauth2Client.setCredentials(settings.tokens);
    
    const response = await oauth2Client.request({ url: `https://mybusiness.googleapis.com/v4/${settings.selectedLocation}/localPosts` });
    const posts = (response.data as any).localPosts || [];
    res.json(posts);
  } catch (e: any) {
    res.json([]);
  }
});

webhooksRouter.post('/api/admin/plugins/google-business/posts', requireAdmin, async (req, res) => {
  try {
    const gmbPlugin = await db.select().from(plugins).where(eq(plugins.pluginId, 'google-business')).limit(1);
    let settings = gmbPlugin[0]?.settings as any || {};
    if (typeof settings === 'string') {
      try { settings = JSON.parse(settings); } catch (e) { settings = {}; }
    }
    if (!settings.tokens || !settings.selectedLocation) return res.status(400).json({ error: 'Yetki verilmemiş veya konum seçilmemiş' });
    
    const oauth2Client = new google.auth.OAuth2(settings.clientId, settings.clientSecret);
    oauth2Client.setCredentials(settings.tokens);
    
    const response = await oauth2Client.request({ 
      url: `https://mybusiness.googleapis.com/v4/${settings.selectedLocation}/localPosts`,
      method: 'POST',
      data: req.body
    });
    
    res.json(response.data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

webhooksRouter.get('/api/admin/plugins/google-business/reviews', requireAdmin, async (req, res) => {
  try {
    const gmbPlugin = await db.select().from(plugins).where(eq(plugins.pluginId, 'google-business')).limit(1);
    let settings = gmbPlugin[0]?.settings as any || {};
    if (typeof settings === 'string') {
      try { settings = JSON.parse(settings); } catch (e) { settings = {}; }
    }
    if (!settings.tokens || !settings.selectedLocation) return res.json([]);
    const oauth2Client = new google.auth.OAuth2(settings.clientId, settings.clientSecret);
    oauth2Client.setCredentials(settings.tokens);
    const response = await oauth2Client.request({ url: `https://mybusiness.googleapis.com/v4/${settings.selectedLocation}/reviews` });
    res.json((response.data as any).reviews || []);
  } catch (e: any) {
    res.json([]);
  }
});

const getGMBSettings = async () => {
  const gmbPlugin = await db.select().from(plugins).where(eq(plugins.pluginId, 'google-business')).limit(1);
  let s = gmbPlugin[0]?.settings as any || {};
  if (typeof s === 'string') { try { s = JSON.parse(s); } catch (_) { s = {}; } }
  return s;
};

const createGMBClient = (s: any) => {
  const c = new google.auth.OAuth2(s.clientId, s.clientSecret);
  c.setCredentials(s.tokens);
  c.on('tokens', async (t: any) => {
    try { await db.update(plugins).set({ settings: { ...s, tokens: { ...s.tokens, ...t } } }).where(eq(plugins.pluginId, 'google-business')); } catch (_) {}
  });
  return c;
};

webhooksRouter.get('/api/admin/plugins/google-business/info', requireAdmin, async (req, res) => {
  try {
    const s = await getGMBSettings();
    if (!s.tokens || !s.selectedLocation) return res.json({ error: 'unauthorized', message: 'Yetki verilmemiş veya konum seçilmemiş' });
    const parts = s.selectedLocation.split('/');
    const locationId = parts.length >= 2 ? parts.slice(-2).join('/') : s.selectedLocation;
    const r = await createGMBClient(s).request({ url: `https://mybusinessbusinessinformation.googleapis.com/v1/${locationId}?readMask=name,title,primaryPhone,profile` });
    res.json(r.data);
  } catch (e: any) { res.json({ error: 'unauthorized', message: e.message }); }
});

webhooksRouter.patch('/api/admin/plugins/google-business/info', requireAdmin, async (req, res) => {
  try {
    const s = await getGMBSettings();
    if (!s.tokens || !s.selectedLocation) return res.json({ error: 'unauthorized', message: 'Yetki verilmemiş veya konum seçilmemiş' });
    const parts = s.selectedLocation.split('/');
    const locationId = parts.length >= 2 ? parts.slice(-2).join('/') : s.selectedLocation;
    const { updateMask, ...body } = req.body;
    const mask = updateMask || 'title,primaryPhone,profile.description';
    const r = await createGMBClient(s).request({
      url: `https://mybusinessbusinessinformation.googleapis.com/v1/${locationId}?updateMask=${mask}`,
      method: 'PATCH', data: body
    });
    res.json(r.data);
  } catch (e: any) { res.json({ error: 'unauthorized', message: e.message }); }
});

webhooksRouter.get('/api/admin/plugins/google-business/media', requireAdmin, async (req, res) => {
  try {
    const s = await getGMBSettings();
    if (!s.tokens || !s.selectedLocation) return res.json({ error: 'unauthorized', message: 'Yetki verilmemiş veya konum seçilmemiş' });
    const r = await createGMBClient(s).request({ url: `https://mybusiness.googleapis.com/v4/${s.selectedLocation}/media` });
    res.json((r.data as any).mediaItems || []);
  } catch (e: any) { res.json([]); }
});

webhooksRouter.post('/api/admin/plugins/google-business/media', requireAdmin, async (req, res) => {
  try {
    const s = await getGMBSettings();
    if (!s.tokens || !s.selectedLocation) return res.status(400).json({ error: 'Yetki verilmemis veya konum secilmemis' });
    const { sourceUrl, category } = req.body;
    const r = await createGMBClient(s).request({
      url: `https://mybusiness.googleapis.com/v4/${s.selectedLocation}/media`,
      method: 'POST', data: { mediaFormat: 'PHOTO', sourceUrl, locationAssociation: { category: category || 'ADDITIONAL' } }
    });
    res.json(r.data);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

webhooksRouter.delete('/api/admin/plugins/google-business/media', requireAdmin, async (req, res) => {
  try {
    const s = await getGMBSettings();
    if (!s.tokens || !s.selectedLocation) return res.status(400).json({ error: 'Yetki verilmemis veya konum secilmemis' });
    const { mediaName } = req.body;
    await createGMBClient(s).request({ url: `https://mybusiness.googleapis.com/v4/${mediaName}`, method: 'DELETE' });
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

webhooksRouter.post('/api/admin/plugins/google-business/insights', requireAdmin, async (req, res) => {
  try {
    const s = await getGMBSettings();
    if (!s.tokens || !s.selectedLocation) return res.status(400).json({ error: 'Yetki verilmemis veya konum secilmemis' });
    const days = Number(req.body?.days) || 90;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const fmt = (d: Date) => ({ year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() });
    const parts = s.selectedLocation.split('/');
    const locationId = parts.length >= 2 ? parts.slice(-2).join('/') : s.selectedLocation;
    const metricNames = ['BUSINESS_IMPRESSIONS_DESKTOP_MAPS','BUSINESS_IMPRESSIONS_DESKTOP_SEARCH','BUSINESS_IMPRESSIONS_MOBILE_MAPS','BUSINESS_IMPRESSIONS_MOBILE_SEARCH','BUSINESS_DIRECTION_REQUESTS','CALL_CLICKS','WEBSITE_CLICKS'];
    const r = await createGMBClient(s).request({
      url: `https://businessprofileperformance.googleapis.com/v1/${locationId}:fetchMultiDailyMetricsTimeSeries`,
      method: 'GET',
      params: {
        'dailyMetrics': metricNames,
        'dailyRange.start_date.year': fmt(startDate).year,
        'dailyRange.start_date.month': fmt(startDate).month,
        'dailyRange.start_date.day': fmt(startDate).day,
        'dailyRange.end_date.year': fmt(endDate).year,
        'dailyRange.end_date.month': fmt(endDate).month,
        'dailyRange.end_date.day': fmt(endDate).day,
      }
    });
    const nameMap: Record<string,string> = {
      'BUSINESS_IMPRESSIONS_DESKTOP_MAPS': 'VIEWS_MAPS',
      'BUSINESS_IMPRESSIONS_DESKTOP_SEARCH': 'VIEWS_SEARCH',
      'BUSINESS_IMPRESSIONS_MOBILE_MAPS': 'VIEWS_MAPS',
      'BUSINESS_IMPRESSIONS_MOBILE_SEARCH': 'VIEWS_SEARCH',
      'BUSINESS_DIRECTION_REQUESTS': 'ACTIONS_DRIVING_DIRECTIONS',
      'CALL_CLICKS': 'ACTIONS_PHONE',
      'WEBSITE_CLICKS': 'ACTIONS_WEBSITE',
    };
    const series = (r.data as any).multiDailyMetricTimeSeries || [];
    const totals: Record<string, number> = {};
    for (const item of series) {
      const mapped = nameMap[item.dailyMetric] || item.dailyMetric;
      const sum = (item.dailySubEntityData || item.timeSeries?.datedValues || [])
        .reduce((acc: number, v: any) => acc + (v.value || 0), 0);
      totals[mapped] = (totals[mapped] || 0) + sum;
    }
    const metricValues = Object.entries(totals).map(([metric, value]) => ({ metric, totalValue: { value } }));
    res.json({ locationMetrics: [{ metricValues }] });
  } catch (e: any) {
    const status = e.response?.status || 500;
    let errorMsg = e.message;
    if (e.response?.data?.error?.message) {
      errorMsg = e.response.data.error.message;
    }
    res.status(status).json({ error: errorMsg });
  }
});

webhooksRouter.put('/api/admin/plugins/google-business/reviews/reply', requireAdmin, async (req, res) => {
  try {
    const s = await getGMBSettings();
    if (!s.tokens || !s.selectedLocation) return res.status(400).json({ error: 'Yetki verilmemis veya konum secilmemis' });
    const { reviewName, comment } = req.body;
    const r = await createGMBClient(s).request({ url: `https://mybusiness.googleapis.com/v4/${reviewName}/reply`, method: 'PUT', data: { comment } });
    res.json(r.data);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

webhooksRouter.delete('/api/admin/plugins/google-business/reviews/reply', requireAdmin, async (req, res) => {
  try {
    const s = await getGMBSettings();
    if (!s.tokens || !s.selectedLocation) return res.status(400).json({ error: 'Yetki verilmemis veya konum secilmemis' });
    const { reviewName } = req.body;
    await createGMBClient(s).request({ url: `https://mybusiness.googleapis.com/v4/${reviewName}/reply`, method: 'DELETE' });
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

webhooksRouter.patch('/api/admin/plugins/google-business/posts', requireAdmin, async (req, res) => {
  try {
    const s = await getGMBSettings();
    if (!s.tokens || !s.selectedLocation) return res.status(400).json({ error: 'Yetki verilmemis veya konum secilmemis' });
    const { postName, summary, callToAction, topicType, event: evt, offer } = req.body;
    const r = await createGMBClient(s).request({
      url: `https://mybusiness.googleapis.com/v4/${postName}?updateMask=summary,callToAction,topicType,event,offer`,
      method: 'PATCH', data: { summary, callToAction, topicType, languageCode: 'tr', ...(evt && { event: evt }), ...(offer && { offer }) }
    });
    res.json(r.data);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

webhooksRouter.delete('/api/admin/plugins/google-business/posts', requireAdmin, async (req, res) => {
  try {
    const s = await getGMBSettings();
    if (!s.tokens || !s.selectedLocation) return res.status(400).json({ error: 'Yetki verilmemis veya konum secilmemis' });
    const { postName } = req.body;
    await createGMBClient(s).request({ url: `https://mybusiness.googleapis.com/v4/${postName}`, method: 'DELETE' });
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// PAYTR INTEGRATION
webhooksRouter.post('/api/payments/paytr/init', async (req, res) => {
  try {
    const allPlugins = await db.select().from(plugins).where(eq(plugins.pluginId, 'paytr-integration'));
    if (!allPlugins.length || !allPlugins[0].settings) {
      return res.status(400).json({ error: 'PayTR ayarlari tanimlanmamis' });
    }
    const ps: any = allPlugins[0].settings;
    const merchantId   = ps.merchantId?.trim();
    const merchantKey  = ps.merchantKey?.trim();
    const merchantSalt = ps.merchantSalt?.trim();
    if (!merchantId || !merchantKey || !merchantSalt) {
      return res.status(400).json({ error: 'PayTR kimlik bilgileri eksik' });
    }

    const {
      orderId,
      email,
      amount,
      basketItems,
      userName,
      userAddress,
      userPhone,
      currency = 'TL',
      noInstallment = 1,
      maxInstallment = 1,
      lang = 'tr',
      debugOn = 0,
      testMode = (process.env.NODE_ENV !== 'production') ? 1 : 0,
    } = req.body;

    if (!orderId || !email || !amount) {
      return res.status(400).json({ error: 'orderId, email ve amount zorunludur' });
    }

    const merchantOkUrl   = `${process.env.APP_URL || 'http://localhost:3000'}/odeme/basarili`;
    const merchantFailUrl = `${process.env.APP_URL || 'http://localhost:3000'}/odeme/basarisiz`;
    const userIp = getClientIp(req);

    const basket = JSON.stringify(Array.isArray(basketItems) && basketItems.length > 0
      ? basketItems
      : [[String(req.body.productName || 'Siparis'), String(amount), 1]]);

    const hashStr = `${merchantId}${userIp}${orderId}${email}${amount}${basket}${noInstallment}${maxInstallment}${currency}${testMode}${merchantSalt}`;
    const paytrToken = crypto.createHmac('sha256', merchantKey).update(hashStr).digest('base64');

    const params = new URLSearchParams({
      merchant_id:       merchantId,
      user_ip:           userIp,
      merchant_oid:      String(orderId),
      email:             String(email),
      payment_amount:    String(amount),
      paytr_token:       paytrToken,
      user_basket:       Buffer.from(basket).toString('base64'),
      debug_on:          String(debugOn),
      no_installment:    String(noInstallment),
      max_installment:   String(maxInstallment),
      user_name:         String(userName || email),
      user_address:      String(userAddress || 'Belirtilmedi'),
      user_phone:        String(userPhone || '05000000000'),
      merchant_ok_url:   merchantOkUrl,
      merchant_fail_url: merchantFailUrl,
      timeout_limit:     '30',
      currency:          currency,
      test_mode:         String(testMode),
      lang:              lang,
    });

    const paytrRes = await fetch('https://www.paytr.com/odeme/api/get-token', {
      method: 'POST',
      body: params,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    const paytrData = await paytrRes.json().catch(() => ({}));

    if (paytrData.status !== 'success') {
      return res.status(400).json({ error: paytrData.reason || 'PayTR token alinamamadi', detail: paytrData });
    }

    res.json({ iframeToken: paytrData.token });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

webhooksRouter.post('/api/payments/paytr/callback', express.urlencoded({ extended: false }), async (req, res) => {
  try {
    const allPlugins = await db.select().from(plugins).where(eq(plugins.pluginId, 'paytr-integration'));
    if (!allPlugins.length || !allPlugins[0].settings) return res.send('PAYTR_SETTINGS_ERROR');
    const ps: any = allPlugins[0].settings;
    const merchantKey  = ps.merchantKey?.trim();
    const merchantSalt = ps.merchantSalt?.trim();

    const { merchant_oid, status, total_amount, hash } = req.body;

    const hashStr  = `${merchant_oid}${merchantSalt}${status}${total_amount}`;
    const expected = crypto.createHmac('sha256', merchantKey).update(hashStr).digest('base64');

    if (expected !== hash) {
      console.warn('[PayTR] Gecersiz hash — callback reddedildi');
      return res.send('PAYTR_INVALID_HASH');
    }

    console.log(`[PayTR] IPN alindi: ${merchant_oid} — ${status} — ${total_amount} kurus`);
    res.send('OK');
  } catch (e: any) {
    console.error('[PayTR] Callback error:', e.message);
    res.send('ERROR');
  }
});

// PAGE BLOCKS
webhooksRouter.get('/api/admin/page-blocks/:ownerType/:ownerId', requireAdmin, async (req, res) => {
  try {
    const { ownerType, ownerId } = req.params;
    const rows = await db.select().from(pageBlocks)
      .where(and(eq(pageBlocks.ownerType, ownerType as any), eq(pageBlocks.ownerId, Number(ownerId))))
      .orderBy(asc(pageBlocks.sortOrder));
    res.json(rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

webhooksRouter.post('/api/admin/page-blocks/:ownerType/:ownerId', requireAdmin, async (req, res) => {
  try {
    const { ownerType, ownerId } = req.params;
    const { elementKey, props = {}, region = 'main', sortOrder = 0, isVisible = true } = req.body;
    if (!elementKey) return res.status(400).json({ error: 'elementKey zorunludur' });
    const [inserted] = await db.insert(pageBlocks).values({
      tenantId: 1,
      ownerType: ownerType as any,
      ownerId: Number(ownerId),
      elementKey,
      props,
      region,
      sortOrder,
      isVisible,
    });
    res.json({ id: (inserted as any).insertId, success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

webhooksRouter.put('/api/admin/page-blocks/:id', requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { props, region, sortOrder, isVisible, visibilityRule, responsiveOverrides } = req.body;
    await db.update(pageBlocks).set({
      ...(props !== undefined && { props }),
      ...(region !== undefined && { region }),
      ...(sortOrder !== undefined && { sortOrder }),
      ...(isVisible !== undefined && { isVisible }),
      ...(visibilityRule !== undefined && { visibilityRule }),
      ...(responsiveOverrides !== undefined && { responsiveOverrides }),
    }).where(eq(pageBlocks.id, id));
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

webhooksRouter.delete('/api/admin/page-blocks/:id', requireAdmin, async (req, res) => {
  try {
    await db.delete(pageBlocks).where(eq(pageBlocks.id, Number(req.params.id)));
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

webhooksRouter.post('/api/admin/page-blocks/reorder', requireAdmin, async (req, res) => {
  try {
    const { blocks } = req.body;
    if (!Array.isArray(blocks)) return res.status(400).json({ error: 'blocks array zorunludur' });
    for (const b of blocks) {
      await db.update(pageBlocks).set({ sortOrder: b.sortOrder }).where(eq(pageBlocks.id, b.id));
    }
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// IP BLOCK MANAGEMENT
webhooksRouter.get('/api/admin/blocked-ips', requireAdmin, async (_req, res) => {
  try {
    const rows = await db.select().from(blockedIps).orderBy(desc(blockedIps.createdAt));
    res.json(rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

webhooksRouter.post('/api/admin/blocked-ips', requireAdmin, async (req, res) => {
  try {
    const { ipAddress, reason, durationDays } = req.body;
    if (!ipAddress) return res.status(400).json({ error: 'IP adresi zorunludur' });
    const days = Number(durationDays) || 3650;
    const blockedUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    await db.insert(blockedIps).values({
      ipAddress,
      blockedUntil,
      reason: reason || 'Manuel engel (admin)',
    }).onDuplicateKeyUpdate({ set: { blockedUntil, reason: reason || 'Manuel engel (admin)' } });
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

webhooksRouter.delete('/api/admin/blocked-ips/:id', requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const row = await db.select().from(blockedIps).where(eq(blockedIps.id, id)).limit(1);
    if (row.length > 0) autoBlockedIps.delete(row[0].ipAddress);
    await db.delete(blockedIps).where(eq(blockedIps.id, id));
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// AUDIT LOGS
webhooksRouter.get('/api/admin/audit-logs', requireAdmin, async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));
    const offset = (page - 1) * limit;

    const conditions: any[] = [];
    if (req.query.entityType) conditions.push(eq(auditLogs.entityType, String(req.query.entityType)));
    if (req.query.action) conditions.push(like(auditLogs.action, `%${String(req.query.action)}%`));
    if (req.query.userId) conditions.push(eq(auditLogs.userId, Number(req.query.userId)));
    if (req.query.startDate) conditions.push(sql`${auditLogs.createdAt} >= ${new Date(String(req.query.startDate))}`);
    if (req.query.endDate) conditions.push(sql`${auditLogs.createdAt} <= ${new Date(String(req.query.endDate) + 'T23:59:59')}`);

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const userAlias = alias(users, 'audit_user');

    const [logs, countResult] = await Promise.all([
      db.select({
        id: auditLogs.id,
        action: auditLogs.action,
        entityType: auditLogs.entityType,
        entityId: auditLogs.entityId,
        details: auditLogs.details,
        ipAddress: auditLogs.ipAddress,
        createdAt: auditLogs.createdAt,
        userName: sql`CONCAT(${userAlias.firstName}, ' ', ${userAlias.lastName})`.as('userName'),
        userEmail: userAlias.email,
      })
        .from(auditLogs)
        .leftJoin(userAlias, eq(auditLogs.userId, userAlias.id))
        .where(whereClause)
        .orderBy(desc(auditLogs.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: sql<number>`COUNT(*)` })
        .from(auditLogs)
        .where(whereClause),
    ]);

    res.json({ logs, total: Number(countResult[0]?.count || 0), page, limit });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});
