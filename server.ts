import express from 'express';
import path from 'path';
import { db } from './src/db/index';
import multer from 'multer';
import fs from 'fs';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const rootDir = process.cwd();
import { 
  users, 
  companies,
  customers,
  plans,
  subscriptions,
  customerSubscriptions,
  devices,
  services,
  blogPosts,
  campaigns,
  knowledgeBase,
  faqCategories,
  settings,
  pages,
  tickets,
  ticketMessages,
  stockItems,
  leads,
  forms,
  formSubmissions,
  inventoryCategories,
  mediaLibrary,
  menus,
  menuItems,
  testimonials,
  apiKeys,
  webhooks,
  plugins,
  terms,
  taxonomies,
  termRelationships,
  themeSettings,
  layoutTemplates,
  layoutAssignments,
  languages,
  translations,
  pageBlocks,
  mediaFolders,
  serviceCategories
} from './src/db/schema';

import { eq, desc, and, sql, asc, like } from 'drizzle-orm';
import crypto from 'crypto';
import { sendTicketEmail, getStatusEmailTemplate } from './src/lib/mail';

const uploadsDir = path.join(rootDir, 'uploads');

async function saveRemoteImageToMedia(sourceUrl: string, uploaderId?: number | null): Promise<string> {
  if (!/^https?:\/\//i.test(sourceUrl)) return sourceUrl;

  const existing = await db.select().from(mediaLibrary).where(eq(mediaLibrary.description, `remote:${sourceUrl}`)).limit(1);
  if (existing.length > 0) return existing[0].fileUrl;

  const response = await fetch(sourceUrl, { redirect: 'follow' });
  if (!response.ok) throw new Error(`Görsel indirilemedi: ${response.status}`);

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.startsWith('image/')) throw new Error('URL bir görsel dosyası değil');

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > 8 * 1024 * 1024) throw new Error('Görsel 8 MB sınırını aşıyor');

  fs.mkdirSync(uploadsDir, { recursive: true });
  const parsedUrl = new URL(sourceUrl);
  const originalName = path.basename(parsedUrl.pathname) || 'remote-image';
  const safeBase = path.parse(originalName).name.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || 'remote-image';
  const fileName = `${Date.now()}-${safeBase}.webp`;
  const filePath = path.join(uploadsDir, fileName);

  await sharp(buffer).webp({ quality: 80 }).toFile(filePath);

  const fileUrl = `/uploads/${fileName}`;
  const title = path.parse(originalName).name || safeBase;
  await db.insert(mediaLibrary).values({
    tenantId: 1,
    uploaderId: uploaderId || null,
    folderId: null,
    fileName,
    fileUrl,
    mimeType: 'image/webp',
    fileSize: fs.statSync(filePath).size,
    title,
    altText: title,
    description: `remote:${sourceUrl}`,
  });

  return fileUrl;
}

async function ensureCustomerRowsFromUsers(): Promise<number> {
  const customerUsers = await db.select().from(users).where(eq(users.roleType, 'customer'));
  let migrated = 0;

  for (const user of customerUsers) {
    const existingCustomer = await db.select().from(customers).where(eq(customers.userId, user.id)).limit(1);
    if (existingCustomer.length > 0) continue;

    await db.insert(customers).values({
      tenantId: user.tenantId || 1,
      userId: user.id,
      companyId: user.companyId || null,
      accountCode: `MUS-${String(user.id).padStart(5, '0')}`,
      balance: '0.00',
      creditLimit: '0.00',
      notes: 'Eski müşteri kullanıcı kaydından otomatik taşındı.',
      isActive: user.isActive !== false,
    });
    migrated += 1;
  }

  return migrated;
}

// Simple in-memory token store (for demo; in production use a proper session/JWT)
const activeSessions: Map<string, { userId: number; email: string; name: string; role: string }> = new Map();
const customerSessions: Map<string, { userId: number; email: string; name: string; role: string }> = new Map();

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Yetkilendirme gerekli' });
  }
  const token = authHeader.slice(7);
  const session = activeSessions.get(token);
  if (!session) {
    return res.status(401).json({ error: 'Geçersiz veya süresi dolmuş token' });
  }
  (req as any).adminUser = session;
  next();
}

function requireCustomer(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Yetkilendirme gerekli' });
  }
  const token = authHeader.slice(7);
  const session = customerSessions.get(token);
  if (!session) {
    return res.status(401).json({ error: 'Geçersiz veya süresi dolmuş token' });
  }
  (req as any).customerUser = session;
  next();
}

async function requireApiKey(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers['x-api-key'] || req.headers.authorization;
  let providedKey = '';

  if (typeof authHeader === 'string') {
    if (authHeader.startsWith('Bearer ')) {
      providedKey = authHeader.substring(7);
    } else {
      providedKey = authHeader;
    }
  }

  if (!providedKey || !providedKey.startsWith('kb_')) {
    return res.status(401).json({ error: 'Geçersiz veya eksik API Key' });
  }

  try {
    const keyHash = crypto.createHash('sha256').update(providedKey).digest('hex');
    const matchedKey = await db.select().from(apiKeys).where(eq(apiKeys.keyHash, keyHash)).limit(1);

    if (matchedKey.length === 0) {
      return res.status(401).json({ error: 'Yetkisiz API Key' });
    }

    // Update last used at in background
    db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, matchedKey[0].id)).execute().catch(console.error);

    (req as any).apiClient = matchedKey[0];
    next();
  } catch (err) {
    res.status(500).json({ error: 'API Key doğrulama hatası' });
  }
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;
  const requestCounters = new Map<string, { count: number; startedAt: number }>();
  const autoBlockedIps = new Map<string, number>();

  app.use(express.json());

  const parseList = (value?: string) => (value || '')
    .split(/[\n,]/)
    .map(item => item.trim())
    .filter(Boolean);

  const getClientIp = (req: express.Request) => {
    const forwarded = req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'];
    const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0];
    return (raw || req.ip || '').replace(/^::ffff:/, '').trim();
  };

  const readSettingsMap = async () => {
    const allSettings = await db.select().from(settings);
    const settingsMap: Record<string, string> = {};
    allSettings.forEach(s => {
      if (s.value !== null && s.value !== undefined) settingsMap[s.key] = s.value;
    });
    return settingsMap;
  };

  const verifyTurnstile = async (req: express.Request) => {
    const settingsMap = await readSettingsMap();
    if (settingsMap.captchaEnabled !== 'true') return true;
    const secret = settingsMap.turnstileSecretKey?.trim();
    const token = (req.body?.turnstileToken || req.body?.['cf-turnstile-response'] || '').trim();
    if (!secret || !token) return false;

    const formData = new URLSearchParams();
    formData.set('secret', secret);
    formData.set('response', token);
    formData.set('remoteip', getClientIp(req));
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
    });
    const data = await response.json().catch(() => ({}));
    return Boolean(data?.success);
  };

  app.use(async (req, res, next) => {
    try {
      if (req.path.startsWith('/assets/') || req.path.startsWith('/uploads/')) return next();

      const settingsMap = await readSettingsMap();

      const ip = getClientIp(req);
      const blocklist = parseList(settingsMap.securityIpBlocklist);
      const adminAllowlist = parseList(settingsMap.securityAdminIpAllowlist || settingsMap.securityIpAllowlist);
      const now = Date.now();
      const autoBlockedUntil = autoBlockedIps.get(ip) || 0;

      if (blocklist.includes(ip) || autoBlockedUntil > now) {
        return res.status(403).json({ error: 'Erişim engellendi' });
      }

      if ((req.path.startsWith('/admin') || req.path.startsWith('/api/admin')) && adminAllowlist.length > 0 && !adminAllowlist.includes(ip)) {
        return res.status(403).json({ error: 'Admin erişimi bu IP için izinli değil' });
      }

      if ((settingsMap.securityAutoBlockEnabled || 'true') !== 'false') {
        const windowMs = Number(settingsMap.securityWindowSeconds || 60) * 1000;
        const limit = Number(settingsMap.securityRequestLimit || 180);
        const blockMs = Number(settingsMap.securityAutoBlockMinutes || 30) * 60 * 1000;
        const current = requestCounters.get(ip);
        const bucket = current && now - current.startedAt < windowMs ? current : { count: 0, startedAt: now };
        bucket.count += 1;
        requestCounters.set(ip, bucket);
        if (bucket.count > limit) {
          autoBlockedIps.set(ip, now + blockMs);
          return res.status(429).json({ error: 'Çok fazla istek nedeniyle geçici engel uygulandı' });
        }
      }

      next();
    } catch (e) {
      next();
    }
  });
  
  // Uploads directory static serving. Missing files must not fall through to the SPA shell.
  app.use('/uploads', express.static(path.join(rootDir, 'uploads'), { fallthrough: false }));

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = path.join(rootDir, 'uploads');
      if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath);
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    }
  });
  const upload = multer({ storage });

  // --- HEALTH ---
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'API is running' });
  });

  // ============================================================
  // PUBLIC API (CMS FRONTEND)
  // ============================================================

  app.get('/api/public/search', async (req, res) => {
    try {
      const q = req.query.q as string;
      if (!q || q.trim() === '') {
        return res.json({ services: [], blog: [], pages: [] });
      }

      const searchTerm = `%${q}%`;

      // Search services
      const servicesResults = await db.select({
        id: services.id,
        title: services.title,
        slug: services.slug,
        shortDesc: services.shortDescription,
        type: sql<string>`'service'`
      }).from(services)
        .where(like(services.title, searchTerm))
        .limit(5);

      // Search blog posts
      const blogResults = await db.select({
        id: blogPosts.id,
        title: blogPosts.title,
        slug: blogPosts.slug,
        shortDesc: blogPosts.excerpt,
        type: sql<string>`'blog'`
      }).from(blogPosts)
        .where(
          and(
            eq(blogPosts.status, 'published'),
            like(blogPosts.title, searchTerm)
          )
        )
        .limit(5);

      // Search pages
      const pagesResults = await db.select({
        id: pages.id,
        title: pages.title,
        slug: pages.slug,
        shortDesc: pages.content, // or short description if exists
        type: sql<string>`'page'`
      }).from(pages)
        .where(
          and(
            eq(pages.status, 'published'),
            like(pages.title, searchTerm)
          )
        )
        .limit(5);

      res.json({
        services: servicesResults,
        blog: blogResults,
        pages: pagesResults
      });
    } catch (err) {
      console.error('Search error:', err);
      res.status(500).json({ error: 'Search failed' });
    }
  });

  app.get('/api/public/menus', async (req, res) => {
    try {
      const allMenus = await db.select().from(menus);
      const allItems = await db.select().from(menuItems).orderBy(menuItems.displayOrder);
      
      const result = allMenus.map(m => ({
        ...m,
        items: allItems.filter(i => i.menuId === m.id)
      }));
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/public/settings', async (req, res) => {
    try {
      const allSettings = await db.select().from(settings);
      const publicKeys = [
        'siteTitle', 'siteTagline', 'logoUrl', 'contactPhone', 'contactEmail', 'contactAddress',
        'socialFacebook', 'socialTwitter', 'socialInstagram', 'socialLinkedin', 'footerText', 
        'themeColor', 'themeSecondaryColor', 'themeRadius', 'themeFont', 'siteLogo', 'siteFavicon', 'headerLayout',
        'homeHeroTitle', 'homeHeroSubtitle', 'homeHeroImage',
        'aboutVision', 'aboutMission', 'aboutImage',
        'homeFeature1Title', 'homeFeature1Desc',
        'homeFeature2Title', 'homeFeature2Desc',
        'homeFeature3Title', 'homeFeature3Desc',
        'googleMapsIframeUrl',
        'homeGamingTitle', 'homeGamingDesc', 'homeGamingBullets', 'homeGamingImage', 'homeGamingBtnText', 'homeGamingBtnUrl',
        'homeCorporateTitle', 'homeCorporateDesc', 'homeCorporateBullets', 'homeCorporateImage', 'homeCorporateBtnText', 'homeCorporateBtnUrl',
        'homePartnersJson',
        'homeSlidesJson', 'homeSectionOrder',
        'homeTestimonial1Name', 'homeTestimonial1Role', 'homeTestimonial1Comment',
        'homeTestimonial2Name', 'homeTestimonial2Role', 'homeTestimonial2Comment',
        'homeTestimonial3Name', 'homeTestimonial3Role', 'homeTestimonial3Comment',
        'contactFax', 'contactMersis', 'contactVkn', 'contactVergiDairesi', 'contactTicaretSicil',
        'contactKep', 'contactEsnafSicil', 'contactNaceKodu', 'contactMukellefAdi', 'contactTicaretUnvan',
        'contactCard1Title', 'contactCard1Link', 'contactCard2Title', 'contactCard2Link', 'contactCard3Title', 'contactCard3Link',
        'contactSubtitle', 'contactBannerTitle', 'contactBannerDesc', 'contactBannerImage',
        'contactBankName', 'contactBankAccount', 'contactBankIban', 'contactBankQrCode',
        'siteMetaDescription', 'siteOgImage', 'siteFocusKeyword', 'googleAnalyticsId', 'googleSearchConsoleCode',
        'googleSiteVerification', 'googleSearchConsoleVerification', 'googleVerificationCode', 'searchConsoleCode',
        'captchaEnabled', 'turnstileSiteKey'
      ];
      
      const publicSettings: Record<string, string> = {};
      allSettings.forEach(s => {
        if (publicKeys.includes(s.key)) {
          publicSettings[s.key] = s.value || '';
        }
      });
      res.json(publicSettings);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // i18n Translation Endpoint (used by i18next-http-backend)
  app.get('/api/public/translations/:lang', async (req, res) => {
    const getDefaultTranslations = (langCode: string) => {
      if (langCode === 'tr') {
        return {
          'common.loading': 'Yukleniyor...',
          'common.error': 'Bir hata olustu',
          'common.submit': 'Gonder'
        };
      }

      return {
        'common.loading': 'Loading...',
        'common.error': 'An error occurred',
        'common.submit': 'Submit'
      };
    };

    try {
      const { lang } = req.params;
      const trans = await db.select().from(translations).where(eq(translations.langCode, lang));
      
      const result: Record<string, string> = {};
      trans.forEach(t => {
        result[t.key] = t.value || '';
      });

      // Default fallbacks if DB is empty for requested lang
      if (Object.keys(result).length === 0) {
        Object.assign(result, getDefaultTranslations(lang));
      }
      
      res.json(result);
    } catch (e: any) {
      const { lang } = req.params;
      console.error('Translations endpoint fallback used:', e?.message || e);
      res.setHeader('x-fallback-source', 'default-translations');
      res.json(getDefaultTranslations(lang));
    }
  });

  app.get('/api/public/plugins', async (req, res) => {
    try {
      const activePlugins = await db.select().from(plugins).where(eq(plugins.isActive, true));
      // Sadece ID'leri dönelim ki frontend anlasın (Örn: ['maintenance-mode', 'google-business'])
      res.json(activePlugins.map(p => p.pluginId));
    } catch (e: any) {
      console.error('Plugins endpoint fallback used:', e?.message || e);
      res.setHeader('x-fallback-source', 'default-plugins');
      res.json([]);
    }
  });

  app.get('/api/public/pages/:slug', async (req, res) => {
    try {
      const pageResult = await db.select().from(pages).where(eq(pages.slug, req.params.slug)).limit(1);
      if (pageResult.length === 0) return res.status(404).json({ error: 'Sayfa bulunamadı' });
      // Sadece yayınlanmış olanları göster
      if (pageResult[0].status !== 'yayinlandi') return res.status(404).json({ error: 'Sayfa bulunamadı' });
      res.json(pageResult[0]);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/public/pages/:slug/blocks', async (req, res) => {
    try {
      const pageResult = await db.select().from(pages).where(eq(pages.slug, req.params.slug)).limit(1);
      if (pageResult.length === 0) return res.status(404).json({ error: 'Sayfa bulunamadı' });
      if (pageResult[0].status !== 'yayinlandi') return res.status(404).json({ error: 'Sayfa bulunamadı' });
      
      const blocks = await db.select().from(pageBlocks).where(eq(pageBlocks.pageId, pageResult[0].id)).orderBy(asc(pageBlocks.displayOrder));
      res.json(blocks);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/public/testimonials', async (req, res) => {
    try {
      const allTestimonials = await db.select().from(testimonials)
        .where(eq(testimonials.status, 'yayinlandi'))
        .orderBy(asc(testimonials.displayOrder), desc(testimonials.createdAt));
      const mapped = allTestimonials.map(t => ({
        id: t.id,
        name: t.authorName,
        role: t.authorTitle,
        comment: t.content,
        rating: t.rating,
        imageUrl: t.authorImageUrl
      }));
      res.json(mapped);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ============================================================
  // CUSTOMER API
  // ============================================================

  app.post('/api/customer/register', async (req, res) => {
    try {
      const { firstName, lastName, email, phone, password } = req.body;
      if (!firstName || !email || !password) {
        return res.status(400).json({ error: 'Eksik bilgi' });
      }
      
      const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (existing.length > 0) {
        // If a user with this email exists but has no password (e.g. from lead form)
        if (!existing[0].passwordHash) {
          await db.update(users).set({ passwordHash: password, firstName, lastName, phone }).where(eq(users.id, existing[0].id));
          return res.json({ success: true });
        }
        return res.status(400).json({ error: 'Bu e-posta zaten kullanımda' });
      }

      await db.insert(users).values({
        tenantId: 1,
        firstName, lastName, email, phone,
        passwordHash: password,
        roleType: 'customer',
        isActive: true,
      });

      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/customer/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      const userRes = await db.select().from(users).where(eq(users.email, email)).limit(1);
      
      if (userRes.length === 0) return res.status(401).json({ error: 'Kullanıcı bulunamadı veya şifre hatalı' });
      
      const u = userRes[0];
      if (u.roleType !== 'customer') return res.status(403).json({ error: 'Bu alana sadece müşteriler girebilir' });
      
      if (u.passwordHash !== password) return res.status(401).json({ error: 'Şifre hatalı' });

      const token = generateToken();
      const sessionData = { userId: u.id, email: u.email, name: `${u.firstName} ${u.lastName}`, role: 'customer' };
      customerSessions.set(token, sessionData);

      await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, u.id));

      res.json({ token, user: sessionData });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/customer/logout', requireCustomer, (req, res) => {
    const token = req.headers.authorization?.slice(7);
    if (token) customerSessions.delete(token);
    res.json({ success: true });
  });

  app.get('/api/customer/me', requireCustomer, (req, res) => {
    res.json((req as any).customerUser);
  });

  app.get('/api/customer/tickets', requireCustomer, async (req, res) => {
    try {
      const userId = (req as any).customerUser.userId;
      const myTickets = await db.select({
        id: tickets.id,
        ticketNumber: tickets.ticketNumber,
        subject: tickets.subject,
        description: tickets.description,
        status: tickets.status,
        cost: tickets.cost,
        createdAt: tickets.createdAt,
        updatedAt: tickets.updatedAt,
        deviceName: devices.name,
        deviceType: devices.deviceType,
      }).from(tickets)
        .leftJoin(devices, eq(tickets.deviceId, devices.id))
        .where(eq(tickets.userId, userId))
        .orderBy(desc(tickets.createdAt));
        
      res.json(myTickets);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/customer/tickets', requireCustomer, async (req, res) => {
    try {
      const userId = (req as any).customerUser.userId;
      const { subject, description, deviceType, brand, model } = req.body;
      
      let deviceId: number | null = null;
      if (deviceType) {
        const newDevice = await db.insert(devices).values({
          tenantId: 1, userId, deviceType, brand, model,
          name: `${brand || ''} ${model || ''}`.trim() || deviceType,
        });
        deviceId = (newDevice[0] as any).insertId;
      }

      const ticketNumber = `SRV-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;
      await db.insert(tickets).values({
        tenantId: 1, ticketNumber, userId, deviceId,
        type: 'ariza', subject, description, priority: 'normal', status: 'yeni', cost: '0.00'
      });

      res.json({ success: true, ticketNumber });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ============================================================
  // PUBLIC API ROUTES
  // ============================================================

  // CMS: Settings
  app.get('/api/settings', async (req, res) => {
    try {
      const allSettings = await db.select().from(settings);
      const settingsMap: Record<string, string> = {};
      allSettings.forEach(s => {
        if (s.value) settingsMap[s.key] = s.value;
      });
      res.json(settingsMap);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // CMS: Pages
  app.get('/api/pages', async (req, res) => {
    try {
      const allPages = await db.select().from(pages).where(eq(pages.status, 'yayinlandi'));
      res.json(allPages);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/pages/:slug', async (req, res) => {
    try {
      const page = await db.select().from(pages).where(eq(pages.slug, req.params.slug)).limit(1);
      if (page.length === 0) return res.status(404).json({ error: 'Page not found' });
      res.json(page[0]);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // CMS: Blog
  app.get('/api/blog', async (req, res) => {
    try {
      const posts = await db.select().from(blogPosts).where(eq(blogPosts.status, 'yayinlandi')).orderBy(desc(blogPosts.createdAt));
      res.json(posts);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/blog/:slug', async (req, res) => {
    try {
      const post = await db.select().from(blogPosts).where(eq(blogPosts.slug, req.params.slug)).limit(1);
      if (post.length === 0) return res.status(404).json({ error: 'Post not found' });
      res.json(post[0]);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // CMS: Campaigns
  app.get('/api/campaigns', async (req, res) => {
    try {
      const allCampaigns = await db.select().from(campaigns).where(eq(campaigns.status, 'aktif'));
      res.json(allCampaigns);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Services
  app.get('/api/services', async (req, res) => {
    try {
      const allServices = await db.select({
        service: services,
        category: serviceCategories
      })
      .from(services)
      .leftJoin(serviceCategories, eq(services.categoryId, serviceCategories.id))
      .where(eq(services.isActive, true));

      const formatted = allServices.map(row => ({
         ...row.service,
         categoryDetails: row.category
      }));
      res.json(formatted);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/services/:id', async (req, res) => {
    try {
      const result = await db.select({
        service: services,
        category: serviceCategories
      })
      .from(services)
      .leftJoin(serviceCategories, eq(services.categoryId, serviceCategories.id))
      .where(eq(services.id, parseInt(req.params.id)))
      .limit(1);

      if (result.length === 0) return res.status(404).json({ error: 'Service not found' });
      
      const serviceData = {
         ...result[0].service,
         categoryDetails: result[0].category
      };
      res.json(serviceData);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // FAQ / Knowledge Base
  app.get('/api/faq', async (req, res) => {
    try {
      const categories = await db.select().from(faqCategories);
      const kbase = await db.select().from(knowledgeBase).where(eq(knowledgeBase.status, 'yayinlandi'));
      const map = categories.map(cat => ({
        ...cat,
        questions: kbase.filter(q => q.categoryId === cat.id)
      }));
      res.json(map);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Tickets (Device Status)
  app.get('/api/tickets/:ticketNumber', async (req, res) => {
    try {
      const result = await db.select({
        id: tickets.ticketNumber,
        status: tickets.status,
        brandModel: devices.name,
        deviceType: devices.deviceType,
        customerName: users.firstName,
        customerLastName: users.lastName,
        issueDescription: tickets.description,
        createdAt: tickets.createdAt,
        updatedAt: tickets.updatedAt,
        estimatedCost: tickets.cost
      }).from(tickets)
        .leftJoin(devices, eq(tickets.deviceId, devices.id))
        .leftJoin(users, eq(tickets.userId, users.id))
        .where(eq(tickets.ticketNumber, req.params.ticketNumber))
        .limit(1);
      
      if (result.length === 0) return res.status(404).json({ error: 'Ticket not found' });
      
      const t = result[0];
      const statusMapDb: any = {
        'yeni': 'pending',
        'isleme_alindi': 'diagnosing',
        'parca_bekliyor': 'waiting_parts',
        'musteri_onaji_bekliyor': 'waiting_parts',
        'cozuldu': 'ready',
        'kapatildi': 'delivered',
        'iptal': 'delivered'
      };

      res.json({
        id: t.id,
        status: statusMapDb[t.status || 'yeni'] || 'pending',
        brandModel: t.brandModel || 'Bilinmeyen Cihaz',
        deviceType: t.deviceType || 'Bilinmeyen',
        customerName: `${t.customerName || ''} ${t.customerLastName || ''}`.trim() || 'Müşteri',
        issueDescription: t.issueDescription,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        estimatedCost: t.estimatedCost ? parseFloat(t.estimatedCost) : null
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Appointments
  app.post('/api/appointments', async (req, res) => {
    try {
      if (!(await verifyTurnstile(req))) return res.status(400).json({ error: 'Captcha doğrulaması başarısız' });
      const { type, serviceType, details, date, time, companyName, fullName, phone } = req.body;
      const note = `Tipi: ${type}\nHizmet/Cihaz Türü: ${serviceType}\nTarih/Saat: ${date} ${time}\nŞikayet/Detaylar: ${details}`.trim();
      const [result] = await db.insert(leads).values({
        tenantId: 1,
        name: fullName || 'İsimsiz',
        companyName: companyName,
        phone: phone,
        source: 'Web Randevu Formu',
        notes: note,
        status: 'new'
      });
      res.json({ success: true, message: 'Talep alındı', ticketId: `TLP-${(result as any).insertId}` });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Contact Form
  app.post('/api/contact', async (req, res) => {
    try {
      if (!(await verifyTurnstile(req))) return res.status(400).json({ error: 'Captcha doğrulaması başarısız' });
      const { name, email, phone, subject, message } = req.body;
      let formRes = await db.select().from(forms).where(eq(forms.name, 'İletişim Formu')).limit(1);
      let formId = 0;
      if (formRes.length === 0) {
        const insertRes = await db.insert(forms).values({
          tenantId: 1,
          name: 'İletişim Formu',
          isActive: true,
          schema: {}
        });
        formId = (insertRes[0] as any).insertId;
      } else {
        formId = formRes[0].id;
      }
      const data = { name, email, phone, subject, message };
      const [insertResult] = await db.insert(formSubmissions).values({
        tenantId: 1,
        formId: parseInt(formId.toString()),
        data,
        ipAddress: req.ip || '',
        userAgent: req.headers['user-agent'] || '',
      });

      // Trigger Webhook
      triggerWebhook('lead.created', {
        submissionId: (insertResult as any).insertId,
        formId,
        data
      });

      res.json({ success: true, message: 'Mesajınız gönderildi.' });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ============================================================
  // ADMIN AUTH
  // ============================================================

  app.post('/api/admin/login', async (req, res) => {
    try {
      if (!(await verifyTurnstile(req))) return res.status(400).json({ error: 'Captcha doğrulaması başarısız' });
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'E-posta ve şifre gerekli' });
      }

      // Find user with admin role
      const adminUser = await db.select().from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (adminUser.length === 0) {
        return res.status(401).json({ error: 'E-posta veya şifre hatalı' });
      }

      const u = adminUser[0];

      // Check role
      if (!['superadmin', 'tenant_admin', 'staff', 'technician'].includes(u.roleType || '')) {
        return res.status(403).json({ error: 'Bu hesabın panel erişimi yok' });
      }

      // Simple password check (plain text for demo — in production use bcrypt)
      // Accept 'admin123' as default password if no hash stored, OR compare stored hash
      const isValid = u.passwordHash === password || (!u.passwordHash && password === 'admin123');
      if (!isValid) {
        return res.status(401).json({ error: 'E-posta veya şifre hatalı' });
      }

      const token = generateToken();
      const sessionData = {
        userId: u.id,
        email: u.email,
        name: `${u.firstName} ${u.lastName}`,
        role: u.roleType || 'staff'
      };
      activeSessions.set(token, sessionData);

      // Update last login
      await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, u.id));

      res.json({ token, user: sessionData });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/admin/logout', requireAdmin, (req, res) => {
    const token = req.headers.authorization?.slice(7);
    if (token) activeSessions.delete(token);
    res.json({ success: true });
  });

  app.get('/api/admin/me', requireAdmin, (req, res) => {
    res.json((req as any).adminUser);
  });

  // ============================================================
  // ADMIN API — SERVICES CRUD
  // ============================================================

  app.get('/api/admin/services', requireAdmin, async (req, res) => {
    try {
      const all = await db.select().from(services);
      res.json(all);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/admin/services', requireAdmin, async (req, res) => {
    try {
      const { name, description, basePrice, categoryId, imageUrl, isActive } = req.body;
      await db.insert(services).values({
        tenantId: 1,
        name,
        description,
        basePrice: basePrice?.toString(),
        categoryId: categoryId ? parseInt(categoryId) : null,
        imageUrl: imageUrl || null,
        isActive: isActive !== false,
      });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put('/api/admin/services/:id', requireAdmin, async (req, res) => {
    try {
      const { name, description, basePrice, categoryId, imageUrl, isActive } = req.body;
      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (basePrice !== undefined) updateData.basePrice = basePrice.toString();
      if (categoryId !== undefined) updateData.categoryId = categoryId ? parseInt(categoryId) : null;
      if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
      if (isActive !== undefined) updateData.isActive = isActive;
      await db.update(services).set(updateData).where(eq(services.id, parseInt(req.params.id)));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/admin/services/:id', requireAdmin, async (req, res) => {
    try {
      await db.update(services).set({ isActive: false }).where(eq(services.id, parseInt(req.params.id)));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ============================================================
  // ADMIN API — SERVICE CATEGORIES CRUD
  // ============================================================

  app.get('/api/admin/service-categories', requireAdmin, async (req, res) => {
    try {
      const all = await db.select().from(serviceCategories).orderBy(asc(serviceCategories.displayOrder));
      res.json(all);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/admin/service-categories', requireAdmin, async (req, res) => {
    try {
      await db.insert(serviceCategories).values({
        tenantId: 1,
        ...req.body
      });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put('/api/admin/service-categories/:id', requireAdmin, async (req, res) => {
    try {
      await db.update(serviceCategories).set(req.body).where(eq(serviceCategories.id, parseInt(req.params.id)));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/admin/service-categories/:id', requireAdmin, async (req, res) => {
    try {
      await db.update(serviceCategories).set({ isActive: false }).where(eq(serviceCategories.id, parseInt(req.params.id)));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/public/service-categories', async (req, res) => {
    try {
      const all = await db.select().from(serviceCategories).where(eq(serviceCategories.isActive, true)).orderBy(asc(serviceCategories.displayOrder));
      res.json(all);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ============================================================
  // ADMIN API (i18n TRANSLATIONS)
  // ============================================================
  
  app.get('/api/admin/languages', async (req, res) => {
    try {
      const allLangs = await db.select().from(languages);
      res.json(allLangs);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/admin/languages', async (req, res) => {
    try {
      const { code, name, isDefault, isActive } = req.body;
      const result = await db.insert(languages).values({ code, name, isDefault, isActive });
      res.json({ id: result[0].insertId });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/admin/translations', async (req, res) => {
    try {
      const allTrans = await db.select().from(translations);
      res.json(allTrans);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/admin/translations', async (req, res) => {
    try {
      const { langCode, translations: updates } = req.body; // updates: Record<string, string>
      
      // Delete existing for this lang to replace them
      // Alternatively, we can UPSERT, but delete/insert is simpler for bulk update
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


  // ============================================================
  // ADMIN API — TICKETS (Servis Kayıtları)
  // ============================================================

  app.get('/api/admin/tickets', requireAdmin, async (req, res) => {
    try {
      const { status } = req.query;
      let query = db.select({
        id: tickets.id,
        ticketNumber: tickets.ticketNumber,
        subject: tickets.subject,
        description: tickets.description,
        status: tickets.status,
        priority: tickets.priority,
        type: tickets.type,
        cost: tickets.cost,
        createdAt: tickets.createdAt,
        updatedAt: tickets.updatedAt,
        customerName: users.firstName,
        customerLastName: users.lastName,
        customerPhone: users.phone,
        deviceName: devices.name,
        deviceType: devices.deviceType,
        deviceBrand: devices.brand,
        deviceModel: devices.model,
      }).from(tickets)
        .leftJoin(users, eq(tickets.userId, users.id))
        .leftJoin(devices, eq(tickets.deviceId, devices.id))
        .orderBy(desc(tickets.createdAt));
      
      const results = await query;
      
      const filtered = status && status !== 'all' 
        ? results.filter(r => r.status === status)
        : results;
      
      res.json(filtered.map(t => ({
        ...t,
        customerName: `${t.customerName || ''} ${t.customerLastName || ''}`.trim() || 'Müşteri'
      })));
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/admin/tickets', requireAdmin, async (req, res) => {
    try {
      const { subject, description, type, priority, customerName, customerPhone, customerEmail, deviceType, deviceBrand, deviceModel, cost } = req.body;
      
      // Create or find user
      let userId: number | null = null;
      let userEmailForMail = customerEmail || '';

      if (customerName && customerPhone) {
        const nameParts = customerName.split(' ');
        const existingUser = await db.select().from(users).where(eq(users.phone, customerPhone)).limit(1);
        if (existingUser.length > 0) {
          userId = existingUser[0].id;
          if (!userEmailForMail && existingUser[0].email && !existingUser[0].email.includes('@noemail.local')) {
            userEmailForMail = existingUser[0].email;
          }
          // If customer provided a new email, update it
          if (customerEmail && existingUser[0].email.includes('@noemail.local')) {
            await db.update(users).set({ email: customerEmail }).where(eq(users.id, userId));
          }
        } else {
          const newUser = await db.insert(users).values({
            tenantId: 1,
            firstName: nameParts[0] || customerName,
            lastName: nameParts.slice(1).join(' ') || '',
            email: customerEmail || `${customerPhone}@noemail.local`,
            phone: customerPhone,
            roleType: 'customer'
          });
          userId = (newUser[0] as any).insertId;
        }
      }

      // Create device if provided
      let deviceId: number | null = null;
      if (deviceType) {
        const newDevice = await db.insert(devices).values({
          tenantId: 1,
          userId: userId,
          deviceType: deviceType,
          brand: deviceBrand,
          model: deviceModel,
          name: `${deviceBrand || ''} ${deviceModel || ''}`.trim() || deviceType,
        });
        deviceId = (newDevice[0] as any).insertId;
      }

      const ticketNumber = `SRV-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;
      await db.insert(tickets).values({
        tenantId: 1,
        ticketNumber,
        userId: userId,
        deviceId: deviceId,
        type: type || 'ariza',
        subject: subject || 'Teknik Servis Talebi',
        description: description || '',
        priority: priority || 'normal',
        status: 'yeni',
        cost: cost || '0.00'
      });

      // Send initial email
      if (userEmailForMail && !userEmailForMail.includes('@noemail.local')) {
        const deviceNameStr = `${deviceBrand || ''} ${deviceModel || ''}`.trim() || deviceType || 'Cihazınız';
        const html = getStatusEmailTemplate(customerName || 'Müşterimiz', ticketNumber, deviceNameStr, 'Servise Alındı / Yeni Kayıt');
        // Do not await to avoid blocking response
        sendTicketEmail(userEmailForMail, `Servis Kaydı Oluşturuldu: ${ticketNumber}`, html).catch(console.error);
      }

      res.json({ success: true, ticketNumber });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.patch('/api/admin/tickets/:id', requireAdmin, async (req, res) => {
    try {
      const { status, priority, cost } = req.body;
      const updateData: any = { updatedAt: new Date() };
      if (status) updateData.status = status;
      if (priority) updateData.priority = priority;
      if (cost !== undefined) updateData.cost = cost;
      if (status === 'cozuldu' || status === 'kapatildi') updateData.resolvedAt = new Date();
      
      await db.update(tickets).set(updateData).where(eq(tickets.id, parseInt(req.params.id)));

      // Send status change email
      if (status) {
        const ticketInfo = await db.select({
          ticketNumber: tickets.ticketNumber,
          customerName: users.firstName,
          customerEmail: users.email,
          deviceName: devices.name
        }).from(tickets)
          .leftJoin(users, eq(tickets.userId, users.id))
          .leftJoin(devices, eq(tickets.deviceId, devices.id))
          .where(eq(tickets.id, parseInt(req.params.id)))
          .limit(1);

        if (ticketInfo.length > 0) {
          const t = ticketInfo[0];
          if (t.customerEmail && !t.customerEmail.includes('@noemail.local')) {
            const statusMapDb: any = {
              'yeni': 'Yeni',
              'isleme_alindi': 'İşleme Alındı',
              'parca_bekliyor': 'Parça Bekleniyor',
              'musteri_onaji_bekliyor': 'Onay Bekleniyor',
              'cozuldu': 'Çözüldü / Onarıldı',
              'kapatildi': 'Kapatıldı / Teslim Edildi',
              'iptal': 'İptal Edildi'
            };
            const statusText = statusMapDb[status] || status;
            const html = getStatusEmailTemplate(t.customerName || 'Müşterimiz', t.ticketNumber, t.deviceName || 'Cihazınız', statusText);
            sendTicketEmail(t.customerEmail, `Servis Durumu Güncellendi: ${t.ticketNumber}`, html).catch(console.error);
          }
        }
      }

      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ============================================================
  // ADMIN API — STATS (DASHBOARD)
  // ============================================================

  app.get('/api/admin/stats', requireAdmin, async (req, res) => {
    try {
      await ensureCustomerRowsFromUsers();
      // Tickets count
      const allTickets = await db.select().from(tickets);
      const newTickets = allTickets.filter(t => t.status === 'yeni');
      
      // Users count
      const allUsers = await db.select().from(users);
      const allCustomers = await db.select().from(customers).where(eq(customers.isActive, true));

      // CMS counts
      const allPages = await db.select().from(pages);
      const allBlogs = await db.select().from(blogPosts);

      // Stock alerts — kritik stok seviyesinin altındaki ürünler
      const allStock = await db.select().from(stockItems).where(eq(stockItems.isActive, true));
      const stockAlertCount = allStock.filter(s => (s.currentStock || 0) <= (s.minStockLevel || 0)).length;

      // Status Distribution
      const statusCounts = allTickets.reduce((acc: any, t) => {
        acc[t.status] = (acc[t.status] || 0) + 1;
        return acc;
      }, {});

      const statusMapDb: any = {
        'yeni': 'Yeni',
        'isleme_alindi': 'İşlemde',
        'parca_bekliyor': 'Parça Bekleniyor',
        'musteri_onaji_bekliyor': 'Onay Bekleniyor',
        'cozuldu': 'Çözüldü',
        'kapatildi': 'Kapatıldı',
        'iptal': 'İptal'
      };

      const statusDistribution = Object.keys(statusCounts).map(k => ({
        name: statusMapDb[k] || k,
        value: statusCounts[k]
      }));

      // Recent Tickets
      const recentTickets = await db.select({
        id: tickets.id,
        ticketNumber: tickets.ticketNumber,
        subject: tickets.subject,
        status: tickets.status,
        customerName: users.firstName,
        customerLastName: users.lastName
      }).from(tickets)
        .leftJoin(users, eq(tickets.userId, users.id))
        .orderBy(desc(tickets.createdAt))
        .limit(5);

      res.json({
        ticketCount: allTickets.length,
        newLeads: newTickets.length,
        userCount: allUsers.length,
        customerCount: allCustomers.length,
        stockAlerts: stockAlertCount,
        pageCount: allPages.length,
        blogCount: allBlogs.length,
        statusDistribution,
        recentTickets: recentTickets.map(t => ({
          ...t,
          customerName: `${t.customerName || ''} ${t.customerLastName || ''}`.trim() || 'Müşteri'
        }))
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });



  // ============================================================
  // ADMIN API — STOCK
  // ============================================================

  app.get('/api/admin/stock', requireAdmin, async (req, res) => {
    try {
      const items = await db.select({
        id: stockItems.id,
        sku: stockItems.sku,
        name: stockItems.name,
        description: stockItems.description,
        brand: stockItems.brand,
        costPrice: stockItems.costPrice,
        sellingPrice: stockItems.sellingPrice,
        currentStock: stockItems.currentStock,
        minStockLevel: stockItems.minStockLevel,
        isActive: stockItems.isActive,
        categoryId: stockItems.categoryId,
        categoryName: inventoryCategories.name,
      }).from(stockItems)
        .leftJoin(inventoryCategories, eq(stockItems.categoryId, inventoryCategories.id))
        .orderBy(desc(stockItems.createdAt));
      res.json(items);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/admin/stock', requireAdmin, async (req, res) => {
    try {
      const { sku, name, description, brand, costPrice, sellingPrice, currentStock, minStockLevel, categoryId } = req.body;
      await db.insert(stockItems).values({
        tenantId: 1,
        sku: sku || `SKU-${Date.now()}`,
        name,
        description,
        brand,
        costPrice: costPrice?.toString(),
        sellingPrice: sellingPrice?.toString(),
        currentStock: parseInt(currentStock) || 0,
        minStockLevel: parseInt(minStockLevel) || 5,
        categoryId: categoryId || null,
      });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.patch('/api/admin/stock/:id', requireAdmin, async (req, res) => {
    try {
      const { adjustment, name, minStockLevel, sellingPrice, costPrice } = req.body;
      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (minStockLevel !== undefined) updateData.minStockLevel = parseInt(minStockLevel);
      if (sellingPrice !== undefined) updateData.sellingPrice = sellingPrice.toString();
      if (costPrice !== undefined) updateData.costPrice = costPrice.toString();
      if (adjustment !== undefined) {
        const [current] = await db.select({ stock: stockItems.currentStock }).from(stockItems).where(eq(stockItems.id, parseInt(req.params.id)));
        updateData.currentStock = Math.max(0, (current?.stock || 0) + parseInt(adjustment));
      }
      await db.update(stockItems).set(updateData).where(eq(stockItems.id, parseInt(req.params.id)));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/admin/stock/:id', requireAdmin, async (req, res) => {
    try {
      await db.update(stockItems).set({ isActive: false }).where(eq(stockItems.id, parseInt(req.params.id)));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ============================================================
  // ADMIN API — INVENTORY CATEGORIES
  // ============================================================

  app.get('/api/admin/inventory-categories', requireAdmin, async (req, res) => {
    try {
      const cats = await db.select().from(inventoryCategories);
      res.json(cats);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/admin/inventory-categories', requireAdmin, async (req, res) => {
    try {
      const { name, description } = req.body;
      await db.insert(inventoryCategories).values({ tenantId: 1, name, description });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/admin/inventory-categories/:id', requireAdmin, async (req, res) => {
    try {
      await db.delete(inventoryCategories).where(eq(inventoryCategories.id, parseInt(req.params.id)));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ============================================================
  // ADMIN API — TICKET MESSAGES (Dahili Notlar)
  // ============================================================

  app.get('/api/admin/ticket-messages/:ticketId', requireAdmin, async (req, res) => {
    try {
      const msgs = await db.select({
        id: ticketMessages.id,
        message: ticketMessages.message,
        isInternal: ticketMessages.isInternal,
        createdAt: ticketMessages.createdAt,
        senderName: users.firstName,
        senderLastName: users.lastName,
      }).from(ticketMessages)
        .leftJoin(users, eq(ticketMessages.senderId, users.id))
        .where(eq(ticketMessages.ticketId, parseInt(req.params.ticketId)))
        .orderBy(asc(ticketMessages.createdAt));
      res.json(msgs.map(m => ({
        ...m,
        senderName: `${m.senderName || ''} ${m.senderLastName || ''}`.trim() || 'Sistem'
      })));
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/admin/ticket-messages', requireAdmin, async (req, res) => {
    try {
      const { ticketId, message, isInternal } = req.body;
      const adminUser = (req as any).adminUser;
      await db.insert(ticketMessages).values({
        tenantId: 1,
        ticketId: parseInt(ticketId),
        senderId: adminUser.userId,
        message,
        isInternal: isInternal !== false,
      });
      // Ticket updatedAt güncelle
      await db.update(tickets).set({ updatedAt: new Date() }).where(eq(tickets.id, parseInt(ticketId)));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ============================================================
  // ADMIN API — LEAD TO TICKET (Lead'i Servise Dönüştür)
  // ============================================================

  app.post('/api/admin/leads/:id/convert', requireAdmin, async (req, res) => {
    try {
      const lead = await db.select().from(leads).where(eq(leads.id, parseInt(req.params.id))).limit(1);
      if (lead.length === 0) return res.status(404).json({ error: 'Lead bulunamadı' });
      const l = lead[0];

      // Müşteri bul veya oluştur
      let userId: number | null = null;
      if (l.phone) {
        const existing = await db.select().from(users).where(eq(users.phone, l.phone || '')).limit(1);
        if (existing.length > 0) {
          userId = existing[0].id;
        } else {
          const nameParts = (l.name || '').split(' ');
          const newUser = await db.insert(users).values({
            tenantId: 1,
            firstName: nameParts[0] || l.name || 'İsimsiz',
            lastName: nameParts.slice(1).join(' ') || '',
            email: l.email || `${l.phone}@noemail.local`,
            phone: l.phone || '',
            roleType: 'customer',
          });
          userId = (newUser[0] as any).insertId;
        }
      }

      const ticketNumber = `SRV-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;
      await db.insert(tickets).values({
        tenantId: 1,
        ticketNumber,
        userId,
        type: 'ariza',
        subject: `Randevu Dönüşümü: ${l.name}`,
        description: l.notes || 'Randevu formu üzerinden alınan talep.',
        priority: 'normal',
        status: 'yeni',
        cost: '0.00',
      });

      // Lead durumunu güncelle
      await db.update(leads).set({ status: 'converted' }).where(eq(leads.id, parseInt(req.params.id)));

      res.json({ success: true, ticketNumber });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ============================================================
  // ADMIN API — SETTINGS (GET + PUT)

  // ============================================================

  app.get('/api/admin/settings', requireAdmin, async (req, res) => {
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

  app.put('/api/admin/settings', requireAdmin, async (req, res) => {
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

  app.post('/api/admin/cloudflare/test', requireAdmin, async (req, res) => {
    try {
      const settingsMap = await getSettingsMap();
      const data = await cloudflareRequest(settingsMap, '/zones/:zoneId');
      res.json({ success: true, zone: data.result });
    } catch (e: any) {
      res.status(e.statusCode || 500).json({ success: false, error: e.message });
    }
  });

  app.post('/api/admin/cloudflare/purge-cache', requireAdmin, async (req, res) => {
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

  app.post('/api/admin/cloudflare/setting', requireAdmin, async (req, res) => {
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

  // ============================================================
  // ADMIN API — THEME BUILDER (LIVE CUSTOMIZER)
  // ============================================================

  app.get('/api/admin/theme/settings', requireAdmin, async (req, res) => {
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

  app.put('/api/admin/theme/settings/draft', requireAdmin, async (req, res) => {
    try {
      const updates = req.body as Record<string, any>;
      // updates is an object of key: value pairs
      for (const [key, value] of Object.entries(updates)) {
        // Group can be derived or default to 'general' for now
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

  app.post('/api/admin/theme/settings/publish', requireAdmin, async (req, res) => {
    try {
      // Get all draft settings
      const draftSettings = await db.select().from(themeSettings).where(eq(themeSettings.isDraft, true));
      
      for (const draft of draftSettings) {
        // Find existing live setting
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
      
      // Delete all drafts after publish
      await db.delete(themeSettings).where(eq(themeSettings.isDraft, true));
      
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/admin/theme/settings/discard', requireAdmin, async (req, res) => {
    try {
      await db.delete(themeSettings).where(eq(themeSettings.isDraft, true));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ============================================================
  // ADMIN API — LAYOUTS (Template Builder)
  // ============================================================

  app.get('/api/admin/layouts', requireAdmin, async (req, res) => {
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

  app.post('/api/admin/layouts', requireAdmin, async (req, res) => {
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

  app.get('/api/admin/layouts/resolve', requireAdmin, async (req, res) => {
    try {
      const { context, type } = req.query;
      const defaultLayout = await db.select().from(layoutTemplates).where(and(eq(layoutTemplates.type, type as any), eq(layoutTemplates.isDefault, true))).limit(1);
      res.json(defaultLayout.length > 0 ? defaultLayout[0] : null);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/admin/layouts/:id/assignments', requireAdmin, async (req, res) => {
    try {
      const results = await db.select().from(layoutAssignments).where(eq(layoutAssignments.layoutTemplateId, parseInt(req.params.id)));
      res.json(results);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/admin/layouts/:id/assignments', requireAdmin, async (req, res) => {
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

  app.delete('/api/admin/layouts/assignments/:id', requireAdmin, async (req, res) => {
    try {
      await db.delete(layoutAssignments).where(eq(layoutAssignments.id, parseInt(req.params.id)));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });


  app.post('/api/admin/settings/smtp-test', requireAdmin, async (req, res) => {
    try {
      const adminUser = (req as any).adminUser;
      const profile = await db.select({ email: users.email }).from(users).where(eq(users.id, adminUser.userId)).limit(1);
      const testEmail = profile[0]?.email;
      if (!testEmail) return res.status(400).json({ error: 'Admin e-postası bulunamadı' });
      const success = await sendTicketEmail(
        testEmail,
        'SMTP Test — Kerim Bilgisayar',
        `<p style="font-family:sans-serif;">Bu bir SMTP test e-postasıdır. Ayarlarınız doğru yapılandırılmış!</p>`
      );
      if (success) {
        res.json({ success: true, message: `Test e-postası ${testEmail} adresine gönderildi.` });
      } else {
        res.status(500).json({ success: false, error: 'E-posta gönderilemedi. SMTP ayarlarını kontrol edin.' });
      }
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // ============================================================
  // ADMIN API — PROFILE
  // ============================================================


  app.get('/api/admin/profile', requireAdmin, async (req, res) => {
    try {
      const adminId = (req as any).adminUser.userId;
      const profile = await db.select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        phone: users.phone,
        avatarUrl: users.avatarUrl,
      }).from(users).where(eq(users.id, adminId)).limit(1);
      
      if (profile.length === 0) return res.status(404).json({ error: 'User not found' });
      res.json(profile[0]);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.patch('/api/admin/profile', requireAdmin, async (req, res) => {
    try {
      const adminId = (req as any).adminUser.userId;
      const { firstName, lastName, email, phone, password } = req.body;
      const updates: any = {};
      if (firstName) updates.firstName = firstName;
      if (lastName) updates.lastName = lastName;
      if (email) updates.email = email;
      if (phone) updates.phone = phone;
      if (password) updates.passwordHash = password; // Since it's plain text in this demo, just update it directly

      await db.update(users).set(updates).where(eq(users.id, adminId));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ============================================================
  // ADMIN API — USERS
  // ============================================================

  app.get('/api/admin/users', requireAdmin, async (req, res) => {
    try {
      const allUsers = await db.select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        phone: users.phone,
        roleType: users.roleType,
        isActive: users.isActive,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
      }).from(users).where(sql`${users.roleType} <> 'customer'`).orderBy(desc(users.createdAt));
      res.json(allUsers);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/admin/users', requireAdmin, async (req, res) => {
    try {
      const { firstName, lastName, email, phone, roleType, password } = req.body;
      await db.insert(users).values({
        tenantId: 1,
        firstName, lastName, email, phone,
        roleType: roleType || 'staff',
        passwordHash: password || 'admin123',
        isActive: true,
      });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.patch('/api/admin/users/:id', requireAdmin, async (req, res) => {
    try {
      const { isActive, roleType } = req.body;
      const updateData: any = {};
      if (isActive !== undefined) updateData.isActive = isActive;
      if (roleType) updateData.roleType = roleType;
      await db.update(users).set(updateData).where(eq(users.id, parseInt(req.params.id)));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ============================================================
  // ADMIN API — CUSTOMERS, ACCOUNTS & SUBSCRIPTIONS
  // ============================================================

  app.get('/api/admin/customers', requireAdmin, async (req, res) => {
    try {
      await ensureCustomerRowsFromUsers();
      const allCustomers = await db.select({
        id: customers.userId,
        customerId: customers.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        phone: users.phone,
        isActive: customers.isActive,
        createdAt: customers.createdAt,
        accountCode: customers.accountCode,
        balance: customers.balance,
        creditLimit: customers.creditLimit,
        notes: customers.notes,
        companyId: companies.id,
        companyName: companies.name,
        taxId: companies.taxId,
        taxOffice: companies.taxOffice,
        address: companies.address,
        sector: companies.sector,
        subscriptionId: customerSubscriptions.id,
        subscriptionStatus: customerSubscriptions.status,
        currentPeriodEnd: customerSubscriptions.currentPeriodEnd,
        planId: plans.id,
        planName: plans.name,
        planPrice: plans.price,
        billingCycle: plans.billingCycle,
      }).from(customers)
        .leftJoin(users, eq(customers.userId, users.id))
        .leftJoin(companies, eq(customers.companyId, companies.id))
        .leftJoin(customerSubscriptions, eq(customerSubscriptions.userId, customers.userId))
        .leftJoin(plans, eq(customerSubscriptions.planId, plans.id))
        .orderBy(desc(customers.createdAt));
      res.json(allCustomers);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/admin/customers', requireAdmin, async (req, res) => {
    try {
      const { firstName, lastName, email, phone, password, companyName, taxId, taxOffice, address, sector, accountCode, balance, creditLimit, notes } = req.body;
      let companyId: number | null = null;

      if (companyName || taxId || taxOffice || address || sector) {
        const insertedCompany = await db.insert(companies).values({
          tenantId: 1,
          name: companyName || `${firstName} ${lastName || ''}`.trim(),
          taxId: taxId || null,
          taxOffice: taxOffice || null,
          address: address || null,
          phone: phone || null,
          email: email || null,
          sector: sector || null,
          type: 'customer',
        });
        companyId = (insertedCompany[0] as any).insertId;
      }

      const insertedUser = await db.insert(users).values({
        tenantId: 1,
        companyId,
        firstName,
        lastName: lastName || '',
        email,
        phone: phone || null,
        roleType: 'customer',
        passwordHash: password || 'musteri123',
        isActive: true,
      });
      const userId = (insertedUser[0] as any).insertId;
      await db.insert(customers).values({
        tenantId: 1,
        userId,
        companyId,
        accountCode: accountCode || `MUS-${String(userId).padStart(5, '0')}`,
        balance: balance?.toString() || '0.00',
        creditLimit: creditLimit?.toString() || '0.00',
        notes: notes || null,
        isActive: true,
      });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.patch('/api/admin/customers/:id', requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { firstName, lastName, email, phone, isActive, companyName, taxId, taxOffice, address, sector, accountCode, balance, creditLimit, notes } = req.body;
      const existing = await db.select().from(users).where(eq(users.id, id)).limit(1);
      if (existing.length === 0 || existing[0].roleType !== 'customer') return res.status(404).json({ error: 'Müşteri bulunamadı' });

      const userUpdates: any = {};
      if (firstName !== undefined) userUpdates.firstName = firstName;
      if (lastName !== undefined) userUpdates.lastName = lastName;
      if (email !== undefined) userUpdates.email = email;
      if (phone !== undefined) userUpdates.phone = phone;
      if (isActive !== undefined) userUpdates.isActive = isActive;
      if (Object.keys(userUpdates).length > 0) await db.update(users).set(userUpdates).where(eq(users.id, id));

      const customerUpdates: any = {};
      if (accountCode !== undefined) customerUpdates.accountCode = accountCode;
      if (balance !== undefined) customerUpdates.balance = balance?.toString() || '0.00';
      if (creditLimit !== undefined) customerUpdates.creditLimit = creditLimit?.toString() || '0.00';
      if (notes !== undefined) customerUpdates.notes = notes;
      if (isActive !== undefined) customerUpdates.isActive = isActive;
      if (Object.keys(customerUpdates).length > 0) {
        const existingCustomer = await db.select().from(customers).where(eq(customers.userId, id)).limit(1);
        if (existingCustomer.length > 0) {
          await db.update(customers).set(customerUpdates).where(eq(customers.userId, id));
        } else {
          await db.insert(customers).values({
            tenantId: 1,
            userId: id,
            companyId: existing[0].companyId || null,
            accountCode: accountCode || `MUS-${String(id).padStart(5, '0')}`,
            balance: balance?.toString() || '0.00',
            creditLimit: creditLimit?.toString() || '0.00',
            notes: notes || null,
            isActive: isActive !== false,
          });
        }
      }

      const companyUpdates: any = {};
      if (companyName !== undefined) companyUpdates.name = companyName;
      if (taxId !== undefined) companyUpdates.taxId = taxId;
      if (taxOffice !== undefined) companyUpdates.taxOffice = taxOffice;
      if (address !== undefined) companyUpdates.address = address;
      if (sector !== undefined) companyUpdates.sector = sector;
      if (phone !== undefined) companyUpdates.phone = phone;
      if (email !== undefined) companyUpdates.email = email;

      if (Object.keys(companyUpdates).length > 0) {
        if (existing[0].companyId) {
          await db.update(companies).set(companyUpdates).where(eq(companies.id, existing[0].companyId));
        } else {
          const insertedCompany = await db.insert(companies).values({
            tenantId: 1,
            name: companyName || `${firstName || existing[0].firstName} ${lastName || existing[0].lastName || ''}`.trim(),
            phone: phone || existing[0].phone || null,
            email: email || existing[0].email || null,
            type: 'customer',
            ...companyUpdates,
          });
          await db.update(users).set({ companyId: (insertedCompany[0] as any).insertId }).where(eq(users.id, id));
          await db.update(customers).set({ companyId: (insertedCompany[0] as any).insertId }).where(eq(customers.userId, id));
        }
      }
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/admin/customers/migrate-from-users', requireAdmin, async (req, res) => {
    try {
      const migrated = await ensureCustomerRowsFromUsers();
      res.json({ success: true, migrated });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/admin/subscription-plans', requireAdmin, async (req, res) => {
    try {
      const allPlans = await db.select().from(plans).orderBy(desc(plans.createdAt));
      res.json(allPlans);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/admin/subscription-plans', requireAdmin, async (req, res) => {
    try {
      const { name, slug, description, price, billingCycle, features, isActive } = req.body;
      await db.insert(plans).values({
        name,
        slug: slug || name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, ''),
        description: description || null,
        price: (price || 0).toString(),
        billingCycle: billingCycle || 'monthly',
        features: String(features || '').split('\n').map(item => item.trim()).filter(Boolean),
        isActive: isActive !== false,
      });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.patch('/api/admin/subscription-plans/:id', requireAdmin, async (req, res) => {
    try {
      const { name, description, price, billingCycle, features, isActive } = req.body;
      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (price !== undefined) updateData.price = price.toString();
      if (billingCycle !== undefined) updateData.billingCycle = billingCycle;
      if (features !== undefined) updateData.features = String(features).split('\n').map(item => item.trim()).filter(Boolean);
      if (isActive !== undefined) updateData.isActive = isActive;
      await db.update(plans).set(updateData).where(eq(plans.id, parseInt(req.params.id)));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/admin/customers/:id/subscription', requireAdmin, async (req, res) => {
    try {
      const customerId = parseInt(req.params.id);
      const { planId, status, currentPeriodStart, currentPeriodEnd, cancelAtPeriodEnd } = req.body;
      const customer = await db.select().from(users).where(eq(users.id, customerId)).limit(1);
      if (customer.length === 0 || customer[0].roleType !== 'customer') return res.status(404).json({ error: 'Müşteri bulunamadı' });

      let companyId = customer[0].companyId;
      if (!companyId) {
        const insertedCompany = await db.insert(companies).values({
          tenantId: 1,
          name: `${customer[0].firstName} ${customer[0].lastName || ''}`.trim(),
          email: customer[0].email,
          phone: customer[0].phone,
          type: 'customer',
        });
        companyId = (insertedCompany[0] as any).insertId;
        await db.update(users).set({ companyId }).where(eq(users.id, customerId));
      }

      const existing = await db.select().from(customerSubscriptions).where(eq(customerSubscriptions.userId, customerId)).limit(1);
      const payload = {
        tenantId: 1,
        userId: customerId,
        companyId,
        planId: parseInt(planId),
        status: status || 'active',
        currentPeriodStart: currentPeriodStart ? new Date(currentPeriodStart) : new Date(),
        currentPeriodEnd: currentPeriodEnd ? new Date(currentPeriodEnd) : null,
        cancelAtPeriodEnd: !!cancelAtPeriodEnd,
      };

      if (existing.length > 0) {
        await db.update(customerSubscriptions).set(payload).where(eq(customerSubscriptions.id, existing[0].id));
      } else {
        await db.insert(customerSubscriptions).values(payload);
      }
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ============================================================
  // ADMIN API — BLOG
  // ============================================================

  app.get('/api/admin/blog', requireAdmin, async (req, res) => {
    try {
      const posts = await db.select().from(blogPosts).orderBy(desc(blogPosts.createdAt));
      res.json(posts);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/admin/blog', requireAdmin, async (req, res) => {
    try {
      const { title, slug, content, excerpt, imageUrl, status, metaTitle, metaDescription } = req.body;
      await db.insert(blogPosts).values({
        tenantId: 1,
        title, slug: slug || title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, ''),
        content, excerpt, imageUrl,
        status: status || 'taslak',
        metaTitle, metaDescription,
        publishedAt: status === 'yayinlandi' ? new Date() : undefined,
      });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put('/api/admin/blog/:id', requireAdmin, async (req, res) => {
    try {
      const { title, slug, content, excerpt, imageUrl, status, metaTitle, metaDescription } = req.body;
      const updateData: any = { title, slug, content, excerpt, imageUrl, status, metaTitle, metaDescription };
      if (status === 'yayinlandi') updateData.publishedAt = new Date();
      await db.update(blogPosts).set(updateData).where(eq(blogPosts.id, parseInt(req.params.id)));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/admin/blog/:id', requireAdmin, async (req, res) => {
    try {
      await db.update(blogPosts).set({ status: 'arsivlendi' }).where(eq(blogPosts.id, parseInt(req.params.id)));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ============================================================
  // ADMIN API — CAMPAIGNS
  // ============================================================

  app.get('/api/admin/campaigns', requireAdmin, async (req, res) => {
    try {
      const all = await db.select().from(campaigns).orderBy(desc(campaigns.createdAt));
      res.json(all);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/admin/campaigns', requireAdmin, async (req, res) => {
    try {
      const { title, slug, description, imageUrl, startDate, endDate, discountRate, status } = req.body;
      const localImageUrl = imageUrl ? await saveRemoteImageToMedia(imageUrl, (req as any).adminUser.userId) : imageUrl;
      await db.insert(campaigns).values({
        tenantId: 1,
        title, 
        slug: slug || title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, ''),
        description, imageUrl: localImageUrl,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        discountRate: discountRate?.toString(),
        status: status || 'taslak',
      });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.patch('/api/admin/campaigns/:id', requireAdmin, async (req, res) => {
    try {
      const { status, title, description, imageUrl, startDate, endDate, discountRate } = req.body;
      const updateData: any = {};
      if (status) updateData.status = status;
      if (title) updateData.title = title;
      if (description) updateData.description = description;
      if (imageUrl !== undefined) updateData.imageUrl = imageUrl ? await saveRemoteImageToMedia(imageUrl, (req as any).adminUser.userId) : null;
      if (startDate) updateData.startDate = new Date(startDate);
      if (endDate) updateData.endDate = new Date(endDate);
      if (discountRate !== undefined) updateData.discountRate = discountRate?.toString();
      await db.update(campaigns).set(updateData).where(eq(campaigns.id, parseInt(req.params.id)));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/admin/campaigns/import-remote-images', requireAdmin, async (req, res) => {
    try {
      const all = await db.select().from(campaigns);
      let imported = 0;
      const errors: string[] = [];

      for (const campaign of all) {
        if (!campaign.imageUrl || !/^https?:\/\//i.test(campaign.imageUrl)) continue;
        try {
          const localImageUrl = await saveRemoteImageToMedia(campaign.imageUrl, (req as any).adminUser.userId);
          await db.update(campaigns).set({ imageUrl: localImageUrl }).where(eq(campaigns.id, campaign.id));
          imported += 1;
        } catch (err: any) {
          errors.push(`${campaign.title}: ${err.message}`);
        }
      }

      res.json({ success: true, imported, errors });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ============================================================
  // ADMIN API — FAQ / KNOWLEDGE BASE
  // ============================================================

  app.get('/api/admin/faq', requireAdmin, async (req, res) => {
    try {
      const cats = await db.select().from(faqCategories);
      const kbase = await db.select().from(knowledgeBase).orderBy(desc(knowledgeBase.createdAt));
      res.json({ categories: cats, questions: kbase });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/admin/faq/categories', requireAdmin, async (req, res) => {
    try {
      const { name, icon } = req.body;
      await db.insert(faqCategories).values({ tenantId: 1, name, icon });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/admin/faq/questions', requireAdmin, async (req, res) => {
    try {
      const { categoryId, question, answer, status } = req.body;
      await db.insert(knowledgeBase).values({
        tenantId: 1, categoryId, question, answer,
        status: status || 'yayinlandi'
      });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put('/api/admin/faq/questions/:id', requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { categoryId, question, answer, status } = req.body;
      await db.update(knowledgeBase).set({
        categoryId: categoryId ? parseInt(categoryId) : null,
        question,
        answer,
        status: status || 'yayinlandi'
      }).where(eq(knowledgeBase.id, id));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/admin/faq/questions/:id', requireAdmin, async (req, res) => {
    try {
      await db.delete(knowledgeBase).where(eq(knowledgeBase.id, parseInt(req.params.id)));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put('/api/admin/faq/categories/:id', requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { name, icon } = req.body;
      await db.update(faqCategories).set({ name, icon }).where(eq(faqCategories.id, id));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/admin/faq/categories/:id', requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await db.update(knowledgeBase).set({ categoryId: null }).where(eq(knowledgeBase.categoryId, id));
      await db.delete(faqCategories).where(eq(faqCategories.id, id));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ============================================================
  // ADMIN API — LEADS (Randevular / Başvurular)
  // ============================================================

  app.get('/api/admin/leads', requireAdmin, async (req, res) => {
    try {
      const allLeads = await db.select().from(leads).orderBy(desc(leads.createdAt));
      res.json(allLeads);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.patch('/api/admin/leads/:id', requireAdmin, async (req, res) => {
    try {
      const { status } = req.body;
      await db.update(leads).set({ status }).where(eq(leads.id, parseInt(req.params.id)));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ============================================================
  // ADMIN API — MESSAGES (Form Submissions)
  // ============================================================

  app.get('/api/admin/messages', requireAdmin, async (req, res) => {
    try {
      const submissions = await db.select().from(formSubmissions).orderBy(desc(formSubmissions.createdAt));
      res.json(submissions);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // --- ADMIN PAGES ---
  app.get('/api/admin/pages', requireAdmin, async (req, res) => {
    try {
      const allPages = await db.select().from(pages).orderBy(desc(pages.createdAt));
      res.json(allPages);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/admin/pages', requireAdmin, async (req, res) => {
    try {
      const { title, slug, content, status, metaTitle, metaDescription } = req.body;
      await db.insert(pages).values({
        tenantId: 1,
        title,
        slug: slug || title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, ''),
        content,
        status: status || 'taslak',
        metaTitle,
        metaDescription,
      });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.patch('/api/admin/pages/:id', requireAdmin, async (req, res) => {
    try {
      const updates = req.body;
      updates.updatedAt = new Date();
      await db.update(pages).set(updates).where(eq(pages.id, parseInt(req.params.id)));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/admin/pages/:id', requireAdmin, async (req, res) => {
    try {
      await db.delete(pages).where(eq(pages.id, parseInt(req.params.id)));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // --- MEDIA FOLDERS ---
  app.get('/api/admin/media/folders', requireAdmin, async (req, res) => {
    try {
      const folders = await db.select().from(mediaFolders).orderBy(asc(mediaFolders.name));
      res.json(folders);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/admin/media/folders', requireAdmin, async (req, res) => {
    try {
      const { name, parentId } = req.body;
      const newFolder = await db.insert(mediaFolders).values({
        tenantId: 1,
        name,
        parentId: parentId || null
      });
      res.json({ success: true, id: (newFolder[0] as any).insertId });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put('/api/admin/media/folders/:id', requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { name, parentId } = req.body;
      await db.update(mediaFolders).set({
        name,
        parentId: parentId || null
      }).where(eq(mediaFolders.id, id));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/admin/media/folders/:id', requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      // Move files in this folder to root before deleting
      await db.update(mediaLibrary).set({ folderId: null }).where(eq(mediaLibrary.folderId, id));
      // Delete the folder
      await db.delete(mediaFolders).where(eq(mediaFolders.id, id));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // --- MEDIA LIBRARY ---
  app.get('/api/admin/media', requireAdmin, async (req, res) => {
    try {
      const folderIdParam = req.query.folderId;
      let query = db.select().from(mediaLibrary);
      
      if (folderIdParam !== undefined) {
         if (folderIdParam === 'null' || folderIdParam === '') {
             query = query.where(sql`${mediaLibrary.folderId} IS NULL`) as any;
         } else {
             query = query.where(eq(mediaLibrary.folderId, parseInt(folderIdParam as string))) as any;
         }
      }
      
      const mediaFiles = await query.orderBy(desc(mediaLibrary.createdAt));
      res.json(mediaFiles);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/admin/media/upload', requireAdmin, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
      
      let finalFilename = req.file.filename;
      let finalMimeType = req.file.mimetype;
      let finalSize = req.file.size;
      let finalOriginalName = req.file.originalname;

      if (req.file.mimetype.startsWith('image/') && !req.file.mimetype.includes('webp')) {
        const parsedPath = path.parse(req.file.filename);
        const webpFilename = `${parsedPath.name}.webp`;
        const webpPath = path.join(req.file.destination, webpFilename);
        
        try {
          await sharp(req.file.path)
            .webp({ quality: 80 })
            .toFile(webpPath);
            
          // Delete original file
          fs.unlinkSync(req.file.path);
          
          finalFilename = webpFilename;
          finalMimeType = 'image/webp';
          finalSize = fs.statSync(webpPath).size;
          
          // Also adjust original name extension to .webp for consistency
          const origParsed = path.parse(req.file.originalname);
          finalOriginalName = `${origParsed.name}.webp`;
        } catch (err) {
          console.error('Sharp webp conversion failed, falling back to original:', err);
        }
      }

      const folderId = req.body.folderId ? parseInt(req.body.folderId) : null;
      
      const fileUrl = `/uploads/${finalFilename}`;
      const newMedia = await db.insert(mediaLibrary).values({
        tenantId: 1,
        uploaderId: (req as any).adminUser.userId,
        folderId: folderId,
        fileName: finalOriginalName,
        fileUrl: fileUrl,
        mimeType: finalMimeType,
        fileSize: finalSize,
        title: path.parse(finalOriginalName).name,
        altText: path.parse(finalOriginalName).name,
        description: '',
      });
      res.json({ success: true, fileUrl, id: (newMedia[0] as any).insertId });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/admin/media/import-remote', requireAdmin, async (req, res) => {
    try {
      const { url } = req.body;
      if (!url) return res.status(400).json({ error: 'URL gerekli' });
      const fileUrl = await saveRemoteImageToMedia(url, (req as any).adminUser.userId);
      res.json({ success: true, fileUrl });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put('/api/admin/media/:id', requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { title, altText, description, folderId } = req.body;
      const updateData: any = { title, altText, description };
      if (folderId !== undefined) {
         updateData.folderId = folderId === null ? null : parseInt(folderId);
      }
      
      await db.update(mediaLibrary).set(updateData).where(eq(mediaLibrary.id, id));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/admin/media/:id', requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const item = await db.select().from(mediaLibrary).where(eq(mediaLibrary.id, id)).limit(1);
      if (item.length === 0) return res.status(404).json({ error: 'Media not found' });
      
      // Delete database record
      await db.delete(mediaLibrary).where(eq(mediaLibrary.id, id));
      
      // Delete physical file
      const filePath = path.join(rootDir, item[0].fileUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // --- MENUS (moved below to the unified block) ---

  // ============================================================
  // ADMIN API — TAXONOMIES (CATEGORIES/TAGS)
  // ============================================================

  app.get('/api/admin/terms', requireAdmin, async (req, res) => {
    try {
      const allTerms = await db.select({
        id: terms.id,
        name: terms.name,
        slug: terms.slug,
        description: terms.description,
        taxonomyId: terms.taxonomyId,
        taxonomyName: taxonomies.name
      }).from(terms)
        .leftJoin(taxonomies, eq(terms.taxonomyId, taxonomies.id));
      res.json(allTerms);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/admin/terms', requireAdmin, async (req, res) => {
    try {
      const { name, taxonomyName, description } = req.body;
      
      // Ensure taxonomy exists
      let taxonomyId: number;
      const existingTax = await db.select().from(taxonomies).where(eq(taxonomies.name, taxonomyName)).limit(1);
      if (existingTax.length > 0) {
        taxonomyId = existingTax[0].id;
      } else {
        const newTax = await db.insert(taxonomies).values({ tenantId: 1, name: taxonomyName, slug: taxonomyName });
        taxonomyId = (newTax[0] as any).insertId;
      }

      await db.insert(terms).values({
        tenantId: 1,
        taxonomyId,
        name,
        slug: name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, ''),
        description
      });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/admin/terms/:id', requireAdmin, async (req, res) => {
    try {
      // First delete relationships
      await db.delete(termRelationships).where(eq(termRelationships.termId, parseInt(req.params.id)));
      // Then delete term
      await db.delete(terms).where(eq(terms.id, parseInt(req.params.id)));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ============================================================
  // ADMIN API — TESTIMONIALS (COMMENTS)
  // ============================================================

  app.get('/api/admin/testimonials', requireAdmin, async (req, res) => {
    try {
      const allTestimonials = await db.select().from(testimonials).orderBy(desc(testimonials.createdAt));
      res.json(allTestimonials);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/admin/testimonials', requireAdmin, async (req, res) => {
    try {
      const { authorName, authorTitle, authorImageUrl, content, rating, status } = req.body;
      await db.insert(testimonials).values({
        tenantId: 1,
        authorName, authorTitle, authorImageUrl, content,
        rating: parseInt(rating) || 5,
        status: status || 'taslak'
      });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.patch('/api/admin/testimonials/:id', requireAdmin, async (req, res) => {
    try {
      const updates = req.body;
      updates.updatedAt = new Date();
      await db.update(testimonials).set(updates).where(eq(testimonials.id, parseInt(req.params.id)));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/admin/testimonials/:id', requireAdmin, async (req, res) => {
    try {
      await db.delete(testimonials).where(eq(testimonials.id, parseInt(req.params.id)));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ============================================================
  // ADVANCED ARCHITECTURE: API KEYS, WEBHOOKS, PLUGINS
  // ============================================================

  // API KEYS
  app.get('/api/admin/apikeys', requireAdmin, async (req, res) => {
    try {
      const keys = await db.select().from(apiKeys).orderBy(desc(apiKeys.createdAt));
      res.json(keys);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/admin/apikeys', requireAdmin, async (req, res) => {
    try {
      const { name } = req.body;
      const rawKey = crypto.randomBytes(32).toString('hex');
      const prefix = 'kb_';
      const fullKey = prefix + rawKey;
      const keyHash = crypto.createHash('sha256').update(fullKey).digest('hex');

      await db.insert(apiKeys).values({
        tenantId: 1,
        name,
        prefix,
        keyHash
      });
      // Sadece oluşturulduğu an gösterilir
      res.json({ success: true, apiKey: fullKey });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/admin/apikeys/:id', requireAdmin, async (req, res) => {
    try {
      await db.delete(apiKeys).where(eq(apiKeys.id, parseInt(req.params.id)));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ============================================================
  // MENUS
  // ============================================================

  app.get('/api/admin/menus', requireAdmin, async (req, res) => {
    try {
      const allMenus = await db.select().from(menus).where(eq(menus.tenantId, 1));
      const allItems = await db.select().from(menuItems).where(eq(menuItems.tenantId, 1)).orderBy(asc(menuItems.displayOrder));
      
      const result = allMenus.map(m => ({
        ...m,
        items: allItems.filter(i => i.menuId === m.id)
      }));
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/admin/menus', requireAdmin, async (req, res) => {
    try {
      const { name, location } = req.body;
      await db.insert(menus).values({ tenantId: 1, name, location });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put('/api/admin/menus/:id', requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { name, location } = req.body;
      await db.update(menus).set({ name, location }).where(eq(menus.id, id));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/admin/menus/:id', requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await db.delete(menuItems).where(eq(menuItems.menuId, id));
      await db.delete(menus).where(eq(menus.id, id));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/admin/menus/:id/items', requireAdmin, async (req, res) => {
    try {
      const { title, url, target, parentId, displayOrder, megaMenu } = req.body;
      await db.insert(menuItems).values({
        tenantId: 1,
        menuId: parseInt(req.params.id),
        title, url, target: target || '_self', parentId, displayOrder: displayOrder || 0,
        megaMenu: megaMenu || null
      });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put('/api/admin/menus/items/:itemId', requireAdmin, async (req, res) => {
    try {
      const { title, url, target, parentId, megaMenu } = req.body;
      await db.update(menuItems)
        .set({ title, url, target, parentId, megaMenu: megaMenu || null })
        .where(eq(menuItems.id, parseInt(req.params.itemId)));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/admin/menus/items/:itemId', requireAdmin, async (req, res) => {
    try {
      await db.delete(menuItems).where(eq(menuItems.id, parseInt(req.params.itemId)));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put('/api/admin/menus/items/reorder', requireAdmin, async (req, res) => {
    try {
      const { items } = req.body; // Array of { id: number, displayOrder: number }
      if (!Array.isArray(items)) return res.status(400).json({ error: 'Invalid payload' });
      
      // Update each item in sequence (for SQLite/MySQL consistency)
      for (const item of items) {
        await db.update(menuItems)
          .set({ displayOrder: item.displayOrder })
          .where(eq(menuItems.id, item.id));
      }
      
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // /api/public/menus already defined at the top of PUBLIC API section

  // WEBHOOKS
  async function triggerWebhook(eventName: string, payload: any) {
    try {
      const activeHooks = await db.select().from(webhooks).where(
        and(eq(webhooks.event, eventName), eq(webhooks.isActive, true))
      );
      
      for (const hook of activeHooks) {
        // Send async, do not await to block main thread
        fetch(hook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(hook.secret && { 'x-webhook-secret': hook.secret })
          },
          body: JSON.stringify({ event: eventName, payload, timestamp: new Date() })
        }).catch(err => {
          console.error(`Webhook error for ${hook.url}:`, err);
        });
      }
    } catch (e) {
      console.error('Failed to trigger webhooks:', e);
    }
  }

  app.get('/api/admin/webhooks', requireAdmin, async (req, res) => {
    try {
      const hooks = await db.select().from(webhooks).orderBy(desc(webhooks.createdAt));
      res.json(hooks);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/admin/webhooks', requireAdmin, async (req, res) => {
    try {
      const { name, event, url, secret } = req.body;
      await db.insert(webhooks).values({ tenantId: 1, name, event, url, secret });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/admin/webhooks/:id', requireAdmin, async (req, res) => {
    try {
      await db.delete(webhooks).where(eq(webhooks.id, parseInt(req.params.id)));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // PLUGINS
  app.get('/api/admin/plugins', requireAdmin, async (req, res) => {
    try {
      const allPlugins = await db.select().from(plugins);
      res.json(allPlugins);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/admin/plugins/toggle', requireAdmin, async (req, res) => {
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

  // ============================================================
  // EXTERNAL API (Secured via API Key)
  // ============================================================
  
  app.post('/api/external/tickets', requireApiKey, async (req, res) => {
    try {
      const { title, description, customerId, deviceType } = req.body;
      if (!title || !description || !customerId) {
        return res.status(400).json({ error: 'Eksik bilgi: title, description, customerId zorunludur' });
      }

      // Normally we would generate a unique ticket ID like 'SRV-1234'
      const ticketId = 'SRV-' + Math.floor(Math.random() * 10000);

      const [insertResult] = await db.insert(tickets).values({
        tenantId: 1,
        userId: customerId,
        ticketNumber: ticketId,
        type: 'diger',
        subject: title,
        description: title + '\n' + description + '\n\nCihaz: ' + (deviceType || 'Bilinmiyor'),
        status: 'yeni',
        assignedTo: null,
      });

      // Trigger Webhook
      triggerWebhook('ticket.created', {
        ticketId,
        title,
        customerId,
        deviceType
      });

      res.json({ success: true, ticketId, message: 'Servis kaydı API üzerinden oluşturuldu' });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ============================================================
  // SEO & SITEMAP API
  // ============================================================
  
  app.get('/sitemap.xml', async (req, res) => {
    try {
      const allSettings = await db.select().from(settings);
      const settingsMap: Record<string, string> = {};
      allSettings.forEach(s => {
        if (s.value !== null && s.value !== undefined) settingsMap[s.key] = s.value;
      });
      const baseUrl = (settingsMap.sitemapBaseUrl || settingsMap.siteBaseUrl || 'https://kerimbilgisayar.com').replace(/\/$/, '');
      const defaultChangefreq = settingsMap.sitemapDefaultChangefreq || 'weekly';
      const extraUrls = (settingsMap.sitemapExtraUrls || '')
        .split('\n')
        .map(url => url.trim())
        .filter(Boolean);
      
      // Fetch dynamic pages
      const allPages = await db.select().from(pages).where(eq(pages.status, 'yayinlandi'));
      const allServices = await db.select().from(services);
      const allBlogPosts = await db.select().from(blogPosts).where(eq(blogPosts.status, 'published'));
      
      let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/hakkimizda</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/iletisim</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/hizmetler</loc>
    <changefreq>${defaultChangefreq}</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${baseUrl}/blog</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;

      allPages.forEach(p => {
        xml += `
  <url>
    <loc>${baseUrl}/sayfa/${p.slug}</loc>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`;
      });

      allServices.forEach(s => {
        xml += `
  <url>
    <loc>${baseUrl}/hizmetler/${s.slug || s.id}</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`;
      });

      allBlogPosts.forEach(b => {
        xml += `
  <url>
    <loc>${baseUrl}/blog/${b.slug}</loc>
    <lastmod>${b.updatedAt ? new Date(b.updatedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`;
      });

      extraUrls.forEach(url => {
        const loc = url.startsWith('http') ? url : `${baseUrl}${url.startsWith('/') ? url : `/${url}`}`;
        xml += `
  <url>
    <loc>${loc}</loc>
    <changefreq>${defaultChangefreq}</changefreq>
    <priority>0.6</priority>
  </url>`;
      });

      xml += `\n</urlset>`;
      
      res.header('Content-Type', 'application/xml');
      res.send(xml);
    } catch (e: any) {
      res.status(500).send(e.message);
    }
  });

  app.get('/robots.txt', async (req, res) => {
    const allSettings = await db.select().from(settings);
    const settingsMap: Record<string, string> = {};
    allSettings.forEach(s => {
      if (s.value !== null && s.value !== undefined) settingsMap[s.key] = s.value;
    });
    const baseUrl = (settingsMap.sitemapBaseUrl || settingsMap.siteBaseUrl || 'https://kerimbilgisayar.com').replace(/\/$/, '');
    const robotsContent = settingsMap.robotsTxt || `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /musteri/
Disallow: /login

Sitemap: ${baseUrl}/sitemap.xml`;
    
    res.header('Content-Type', 'text/plain');
    res.send(robotsContent);
  });

  // ============================================================
  // VITE DEV VEYA PROD SERVE

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, { index: false }));
    app.get('*', async (req, res) => {
      try {
        const htmlPath = path.join(distPath, 'index.html');
        let html = await fs.promises.readFile(htmlPath, 'utf8');
        const allSettings = await db.select().from(settings);
        const settingsMap: Record<string, string> = {};
        allSettings.forEach(s => {
          if (s.value !== null && s.value !== undefined) settingsMap[s.key] = s.value;
        });
        const googleAnalyticsId = (settingsMap.googleAnalyticsId || '').trim();
        const searchConsoleCode = (
          settingsMap.googleSearchConsoleCode
          || settingsMap.googleSiteVerification
          || settingsMap.googleSearchConsoleVerification
          || settingsMap.googleVerificationCode
          || settingsMap.searchConsoleCode
          || ''
        ).trim();
        const googleSiteVerification = searchConsoleCode.match(/content=["']([^"']+)["']/i)?.[1] || searchConsoleCode;
        const safeGoogleAnalyticsId = googleAnalyticsId.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        const escapeHtml = (value: string) => value
          .replace(/&/g, '&amp;')
          .replace(/"/g, '&quot;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
        const headTags = [
          googleSiteVerification ? `<meta name="google-site-verification" content="${escapeHtml(googleSiteVerification)}">` : '',
          googleAnalyticsId ? `<script async src="https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(googleAnalyticsId)}"></script>` : '',
          googleAnalyticsId ? `<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${safeGoogleAnalyticsId}');</script>` : '',
        ].filter(Boolean).join('\n    ');

        if (headTags) {
          html = html.replace('</head>', `    ${headTags}\n  </head>`);
        }
        res.type('html').send(html);
      } catch (e) {
        console.error('Failed to render index.html with dynamic head tags:', e);
        res.sendFile(path.join(distPath, 'index.html'));
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
