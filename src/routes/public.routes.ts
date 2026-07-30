import express from 'express';
import rateLimit from 'express-rate-limit';
import { google } from 'googleapis';
import { eq, and, or, sql, like, desc, asc } from 'drizzle-orm';
import { db } from '../db/index';
import {
  blogPosts,
  pages,
  services,
  tickets,
  users,
  devices,
  ticketParts,
  stockItems,
  ticketAttachments,
  serviceStatusLogs,
  menus,
  menuItems,
  settings,
  themeSettings,
  translations,
  plugins,
  pageBlocks,
  testimonials,
  campaigns,
  serviceCategories,
  faqCategories,
  knowledgeBase,
  leads,
  forms,
  formSubmissions,
} from '../db/schema';
import { decryptField } from '../lib/fieldCrypto';
import { TICKET_TERMINAL_STATUSES } from '../lib/ticketStatus';
import {
  readSettingsMap,
  getClientIp,
  notifyStaff,
  markLatestApprovalRequest,
  verifyTurnstile,
  triggerWebhook,
} from '../server/helpers';

let gmbCache: any = null;
let gmbCacheTime = 0;

export const publicRouter = express.Router();

// --- SITEMAP ---
publicRouter.get('/sitemap.xml', async (req, res) => {
  try {
    const settingsMap = await readSettingsMap();
    const base = (settingsMap.sitemapBaseUrl || settingsMap.siteBaseUrl || 'https://kerimbilgisayar.com').replace(/\/$/, '');
    const freq = settingsMap.sitemapDefaultChangefreq || 'weekly';
    const now  = new Date().toISOString().split('T')[0];

    const staticRoutes = [
      { loc: '/',              priority: '1.0', changefreq: 'daily'  },
      { loc: '/hakkimizda',    priority: '0.8', changefreq: freq     },
      { loc: '/iletisim',      priority: '0.8', changefreq: freq     },
      { loc: '/hizmetler',     priority: '0.9', changefreq: freq     },
      { loc: '/blog',          priority: '0.8', changefreq: 'daily'  },
      { loc: '/kampanyalar',   priority: '0.7', changefreq: freq     },
      { loc: '/sss',           priority: '0.6', changefreq: 'monthly'},
    ];

    // Dynamic: blog posts
    const blogRows = await db.select({ slug: blogPosts.slug, updatedAt: blogPosts.updatedAt })
      .from(blogPosts).where(eq(blogPosts.status, 'yayinlandi'));

    // Dynamic: pages
    const pageRows = await db.select({ slug: pages.slug, updatedAt: pages.updatedAt })
      .from(pages).where(eq(pages.status, 'yayinlandi'));

    // Dynamic: services
    const serviceRows = await db.select({ id: services.id })
      .from(services).where(eq(services.isActive, true));

    // Extra URLs from settings
    const extraUrls = (settingsMap.sitemapExtraUrls || '')
      .split(/[\n,]/).map((u: string) => u.trim()).filter(Boolean);

    const urls: string[] = [
      ...staticRoutes.map(r =>
        `  <url>\n    <loc>${base}${r.loc}</loc>\n    <lastmod>${now}</lastmod>\n    <changefreq>${r.changefreq}</changefreq>\n    <priority>${r.priority}</priority>\n  </url>`
      ),
      ...blogRows.map(b =>
        `  <url>\n    <loc>${base}/blog/${b.slug}</loc>\n    <lastmod>${b.updatedAt ? new Date(b.updatedAt).toISOString().split('T')[0] : now}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>`
      ),
      ...pageRows.map(p =>
        `  <url>\n    <loc>${base}/${p.slug}</loc>\n    <lastmod>${p.updatedAt ? new Date(p.updatedAt).toISOString().split('T')[0] : now}</lastmod>\n    <changefreq>${freq}</changefreq>\n    <priority>0.6</priority>\n  </url>`
      ),
      ...serviceRows.map(s =>
        `  <url>\n    <loc>${base}/hizmetler/${s.id}</loc>\n    <lastmod>${now}</lastmod>\n    <changefreq>${freq}</changefreq>\n    <priority>0.8</priority>\n  </url>`
      ),
      ...extraUrls.map((u: string) => {
        const loc = u.startsWith('http') ? u : `${base}${u.startsWith('/') ? '' : '/'}${u}`;
        return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${now}</lastmod>\n    <changefreq>${freq}</changefreq>\n    <priority>0.5</priority>\n  </url>`;
      }),
    ];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>`;
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(xml);
  } catch (e: any) {
    res.status(500).send(`<?xml version="1.0"?><error>${e.message}</error>`);
  }
});

// --- ROBOTS.TXT ---
publicRouter.get('/robots.txt', async (req, res) => {
  try {
    const settingsMap = await readSettingsMap();
    const base = (settingsMap.sitemapBaseUrl || settingsMap.siteBaseUrl || 'https://kerimbilgisayar.com').replace(/\/$/, '');
    const customRobots = settingsMap.robotsTxt?.trim();
    const content = customRobots || [
      'User-agent: *',
      'Allow: /',
      'Disallow: /admin/',
      'Disallow: /api/',
      'Disallow: /musteri/',
      '',
      `Sitemap: ${base}/sitemap.xml`,
    ].join('\n');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(content);
  } catch (e: any) {
    res.status(500).send('# robots.txt error');
  }
});

publicRouter.get('/api/public/search', async (req, res) => {
  try {
    const q = req.query.q as string;
    if (!q || q.trim() === '') {
      return res.json({ services: [], blog: [], pages: [] });
    }

    const searchTerm = `%${q}%`;

    const servicesResults = await db.select({
      id: services.id,
      title: services.name,
      slug: sql<string>`CAST(${services.id} AS CHAR)`,
      shortDesc: services.description,
      type: sql<string>`'service'`
    }).from(services)
      .where(like(services.name, searchTerm))
      .limit(5);

    const blogResults = await db.select({
      id: blogPosts.id,
      title: blogPosts.title,
      slug: blogPosts.slug,
      shortDesc: blogPosts.excerpt,
      type: sql<string>`'blog'`
    }).from(blogPosts)
      .where(
        and(
          eq(blogPosts.status, 'yayinlandi'),
          like(blogPosts.title, searchTerm)
        )
      )
      .limit(5);

    const pagesResults = await db.select({
      id: pages.id,
      title: pages.title,
      slug: pages.slug,
      shortDesc: pages.content,
      type: sql<string>`'page'`
    }).from(pages)
      .where(
        and(
          eq(pages.status, 'yayinlandi'),
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

// Dedicated Rate Limiting for Public Ticket Query
const ticketQueryLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  message: { error: 'Çok fazla arıza sorgulama denemesi yapıldı. Lütfen 1 dakika sonra tekrar deneyin.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
});

const ticketActionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  message: { error: 'Çok fazla onay/red denemesi yapıldı. Lütfen 15 dakika sonra tekrar deneyin.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
});

function maskName(fullName: string | null | undefined): string {
  if (!fullName || !fullName.trim()) return '';
  const parts = fullName.trim().split(/\s+/);
  return parts.map(part => {
    if (part.length <= 2) return part[0] + '*';
    if (part.length <= 4) return part.substring(0, 2) + '**';
    return part.substring(0, 2) + '**' + part.substring(part.length - 1);
  }).join(' ');
}

function maskPhone(phone: string | null | undefined): string {
  if (!phone || !phone.trim()) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 7) return phone.substring(0, 3) + '***';
  return digits.substring(0, 4) + ' *** ** ' + digits.substring(digits.length - 2);
}

function maskEmail(email: string | null | undefined): string {
  if (!email || !email.includes('@')) return '';
  const [name, domain] = email.split('@');
  const maskedName = name.length <= 3 ? name[0] + '**' : name.substring(0, 2) + '**' + name[name.length - 1];
  return maskedName + '@' + domain;
}

function maskAddress(addr: string | null | undefined): string {
  if (!addr || !addr.trim()) return '';
  const words = addr.trim().split(/\s+/);
  if (words.length <= 2) return words[0] + ' ***';
  return words.map((w, idx) => {
    if (idx >= words.length - 2) return w;
    if (w.length <= 3) return w[0] + '*';
    return w.substring(0, 2) + '**';
  }).join(' ');
}

publicRouter.get(['/api/tickets/:ticketNumber', '/api/public/ticket/query'], ticketQueryLimiter, async (req, res) => {
  try {
    const rawCode = (req.params.ticketNumber || req.query.no as string || '').trim();
    if (!rawCode) return res.status(400).json({ error: 'Takip numarası giriniz' });

    const cleanCode = rawCode.replace(/[^A-Za-z0-9\-]/g, '');
    if (cleanCode.length < 1 || cleanCode.length > 50) {
      return res.status(400).json({ error: 'Geçersiz takip kodu biçimi' });
    }

    const rows = await db.select()
      .from(tickets)
      .where(
        or(
          eq(tickets.ticketNumber, cleanCode),
          eq(tickets.ticketNumber, cleanCode.toUpperCase())
        )
      )
      .limit(1);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Servis kaydı bulunamadı. Lütfen takip kodunu kontrol ediniz.' });
    }

    const ticket = rows[0];

    let customerInfo: any = null;
    if (ticket.userId) {
      const userRows = await db.select().from(users).where(eq(users.id, ticket.userId)).limit(1);
      if (userRows.length > 0) {
        const u = userRows[0];
        customerInfo = {
          firstName: u.firstName,
          lastName: u.lastName,
          phone: u.phone,
          email: u.email,
          address: u.address || ''
        };
      }
    }

    let deviceInfo: any = null;
    if (ticket.deviceId) {
      try {
        const devRows = await db.select().from(devices).where(eq(devices.id, ticket.deviceId)).limit(1);
        if (devRows.length > 0) deviceInfo = devRows[0];
      } catch {}
    }

    let parts: any[] = [];
    let atts: any[] = [];
    let logs: any[] = [];

    try {
      const rawParts = await db.select({
        id: ticketParts.id,
        stockItemId: ticketParts.stockItemId,
        name: ticketParts.name,
        stockItemName: stockItems.name,
        quantity: ticketParts.quantity,
        unitPrice: ticketParts.unitPrice,
        totalPrice: ticketParts.totalPrice,
        vatRate: ticketParts.vatRate,
      })
      .from(ticketParts)
      .leftJoin(stockItems, eq(ticketParts.stockItemId, stockItems.id))
      .where(and(eq(ticketParts.ticketId, ticket.id), sql`${ticketParts.removedAt} IS NULL`));
      parts = rawParts.map(p => ({ ...p, name: p.name || p.stockItemName }));
    } catch (e: any) {
      console.error('Error fetching ticketParts:', e);
    }
    try { atts = await db.select().from(ticketAttachments).where(eq(ticketAttachments.ticketId, ticket.id)); } catch {}
    try { logs = await db.select().from(serviceStatusLogs).where(eq(serviceStatusLogs.ticketId, ticket.id)).orderBy(desc(serviceStatusLogs.createdAt)); } catch {}

    const rawName = customerInfo ? `${customerInfo.firstName || ''} ${customerInfo.lastName || ''}`.trim() : '';
    const rawPhone = customerInfo?.phone || '';
    const rawEmail = customerInfo?.email || '';
    const rawAddress = customerInfo?.address || '';

    const deviceBrand = deviceInfo?.brand || '';
    const deviceModel = deviceInfo?.model || '';
    const deviceType = deviceInfo?.deviceType || deviceInfo?.name || ticket.subject || '';
    const serialNumber = deviceInfo?.serialNumber || deviceInfo?.imei || '';
    const issueDescription = ticket.description || ticket.subject || '';
    const accessories = ticket.accessories || '';

    res.json({
      ...ticket,
      rawStatus: ticket.status,
      deviceBrand,
      deviceModel,
      deviceType,
      serialNumber,
      imei: deviceInfo?.imei || '',
      patternLock: decryptField(deviceInfo?.patternLock) || '',
      pinPassword: decryptField(deviceInfo?.pinPassword) || '',
      issueDescription,
      accessories,
      customerName: maskName(rawName),
      customerPhone: maskPhone(rawPhone),
      customerEmail: maskEmail(rawEmail),
      customerAddress: maskAddress(rawAddress),
      parts,
      attachments: atts,
      statusLogs: logs
    });
  } catch (e: any) {
    console.error('Public ticket query error:', e);
    res.status(500).json({ error: 'Sorgulama işlemi sırasında hata oluştu' });
  }
});

// Cihaz Etiketi QR'ı — seri no/IMEI ile cihazın TÜM geçmiş servis kayıtlarını (özet) getirir.
// Bilerek sadece özet döndürür (maliyet/teknisyen notu YOK) — seri no bilen herkes erişebildiği için
// /api/public/ticket-approval-info'da bulunan aşırı bilgi ifşası hatası burada tekrarlanmıyor.
publicRouter.get('/api/public/device-history/:identifier', ticketQueryLimiter, async (req, res) => {
  try {
    const rawId = (req.params.identifier || '').trim();
    const cleanId = rawId.replace(/[^A-Za-z0-9\-]/g, '');
    if (cleanId.length < 3 || cleanId.length > 50) {
      return res.status(400).json({ error: 'Geçersiz seri no / IMEI biçimi' });
    }

    const matchingDevices = await db.select({ id: devices.id, brand: devices.brand, model: devices.model, deviceType: devices.deviceType })
      .from(devices)
      .where(or(eq(devices.serialNumber, cleanId), eq(devices.imei, cleanId)));

    if (matchingDevices.length === 0) {
      return res.status(404).json({ error: 'Bu seri no / IMEI ile eşleşen bir cihaz bulunamadı.' });
    }

    const deviceIds = matchingDevices.map(d => d.id);
    const rows = await db.select({
      id: tickets.id,
      ticketNumber: tickets.ticketNumber,
      subject: tickets.subject,
      type: tickets.type,
      status: tickets.status,
      createdAt: tickets.createdAt,
      resolvedAt: tickets.resolvedAt,
      deliveredAt: tickets.deliveredAt,
      customerFirstName: users.firstName,
      customerLastName: users.lastName,
    })
      .from(tickets)
      .leftJoin(users, eq(tickets.userId, users.id))
      .where(sql`${tickets.deviceId} IN (${sql.join(deviceIds, sql`, `)})`)
      .orderBy(desc(tickets.createdAt));

    const latest = matchingDevices[0];
    res.json({
      device: { brand: latest.brand, model: latest.model, deviceType: latest.deviceType },
      history: rows.map(r => ({
        ticketNumber: r.ticketNumber,
        subject: r.subject,
        type: r.type,
        status: r.status,
        createdAt: r.createdAt,
        resolvedAt: r.resolvedAt,
        deliveredAt: r.deliveredAt,
        customerName: maskName(`${r.customerFirstName || ''} ${r.customerLastName || ''}`.trim()),
      })),
    });
  } catch (e: any) {
    console.error('Device history query error:', e);
    res.status(500).json({ error: 'Sorgulama işlemi sırasında hata oluştu' });
  }
});

publicRouter.post('/api/tickets/:ticketNumber/approve', ticketActionLimiter, async (req, res) => {
  try {
    const rawCode = (req.params.ticketNumber || '').trim();
    const cleanCode = rawCode.replace(/[^A-Za-z0-9\-]/g, '');
    if (!cleanCode) return res.status(400).json({ error: 'Geçersiz takip kodu' });

    const rows = await db.select().from(tickets).where(
      or(
        eq(tickets.ticketNumber, cleanCode),
        eq(tickets.ticketNumber, cleanCode.toUpperCase()),
        sql`CAST(${tickets.id} AS CHAR) = ${cleanCode}`
      )
    ).limit(1);

    if (rows.length === 0) return res.status(404).json({ error: 'Servis kaydı bulunamadı' });
    const ticket = rows[0];

    if (TICKET_TERMINAL_STATUSES.includes(ticket.status)) {
      return res.status(400).json({ error: 'Bu servis kaydı tamamlanmış veya kapatılmış durumdadır.' });
    }

    await db.update(tickets).set({
      status: 'onarimda',
      updatedAt: new Date(),
    }).where(eq(tickets.id, ticket.id));

    await db.insert(serviceStatusLogs).values({
      tenantId: ticket.tenantId,
      ticketId: ticket.id,
      fromStatus: ticket.status,
      toStatus: 'onarimda',
      notes: `Müşteri web üzerinden (${getClientIp(req)}) onarım teklifini onayladı.`,
    }).catch((e) => console.error('serviceStatusLogs insert error:', e));

    await markLatestApprovalRequest(ticket.id, 'approved', getClientIp(req));

    await notifyStaff({
      type: 'success',
      title: `Onarım Onayı: #${ticket.ticketNumber}`,
      message: `Müşteri #${ticket.ticketNumber} numaralı servis kaydı için onarım teklifini onayladı.`,
    });

    res.json({ success: true, message: 'Onarım onayınız başarıyla iletildi.' });
  } catch (e: any) {
    console.error('Ticket approve error:', e);
    res.status(500).json({ error: e.message || 'Onaylama işlemi başarısız.' });
  }
});

publicRouter.post('/api/tickets/:ticketNumber/decline', ticketActionLimiter, async (req, res) => {
  try {
    const rawCode = (req.params.ticketNumber || '').trim();
    const cleanCode = rawCode.replace(/[^A-Za-z0-9\-]/g, '');
    if (!cleanCode) return res.status(400).json({ error: 'Geçersiz takip kodu' });

    const rows = await db.select().from(tickets).where(
      or(
        eq(tickets.ticketNumber, cleanCode),
        eq(tickets.ticketNumber, cleanCode.toUpperCase()),
        sql`CAST(${tickets.id} AS CHAR) = ${cleanCode}`
      )
    ).limit(1);

    if (rows.length === 0) return res.status(404).json({ error: 'Servis kaydı bulunamadı' });
    const ticket = rows[0];

    if (TICKET_TERMINAL_STATUSES.includes(ticket.status)) {
      return res.status(400).json({ error: 'Bu servis kaydı halihazırda sonuçlandırılmıştır.' });
    }

    await db.update(tickets).set({
      status: 'onay_red',
      updatedAt: new Date(),
    }).where(eq(tickets.id, ticket.id));

    await db.insert(serviceStatusLogs).values({
      tenantId: ticket.tenantId,
      ticketId: ticket.id,
      fromStatus: ticket.status,
      toStatus: 'onay_red',
      notes: `Müşteri web üzerinden (${getClientIp(req)}) onarım teklifini reddetti. Cihaz iade edilecek.`,
    }).catch((e) => console.error('serviceStatusLogs insert error:', e));

    await markLatestApprovalRequest(ticket.id, 'rejected', getClientIp(req));

    await notifyStaff({
      type: 'warning',
      title: `Teklif Reddedildi: #${ticket.ticketNumber}`,
      message: `Müşteri #${ticket.ticketNumber} numaralı servis kaydı için onarım teklifini reddetti. Cihaz iade edilmeyi bekliyor.`,
    });

    res.json({ success: true, message: 'Teklif reddedildi. Cihaz iade edilmek üzere hazırlanacaktır.' });
  } catch (e: any) {
    console.error('Ticket decline error:', e);
    res.status(500).json({ error: e.message || 'İşlem başarısız.' });
  }
});

publicRouter.get('/api/public/ticket-approval-info/:ticketNumber', ticketQueryLimiter, async (req, res) => {
  try {
    const ticketNumber = req.params.ticketNumber;
    const token = (req.query.token as string || '').trim();
    if (!token) {
      return res.status(403).json({ error: 'Geçersiz veya eksik onay linki' });
    }

    const rows = await db.select({
      id: tickets.id,
      ticketNumber: tickets.ticketNumber,
      subject: tickets.subject,
      description: tickets.description,
      status: tickets.status,
      cost: tickets.cost,
      laborCost: tickets.laborCost,
      estimatedCost: tickets.estimatedCost,
      technicianNotes: tickets.technicianNotes,
      publicApprovalToken: tickets.publicApprovalToken,
      brand: devices.brand,
      model: devices.model,
      deviceName: devices.name,
      customerName: users.firstName,
    })
    .from(tickets)
    .leftJoin(devices, eq(tickets.deviceId, devices.id))
    .leftJoin(users, eq(tickets.userId, users.id))
    .where(or(eq(tickets.ticketNumber, ticketNumber), eq(tickets.ticketNumber, ticketNumber.toUpperCase())))
    .limit(1);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Servis kaydı bulunamadı' });
    }

    const ticket = rows[0];
    if (!ticket.publicApprovalToken || ticket.publicApprovalToken !== token) {
      return res.status(403).json({ error: 'Geçersiz veya eksik onay linki' });
    }
    const parts = await db.select({
      name: stockItems.name,
      quantity: ticketParts.quantity,
      unitPrice: ticketParts.unitPrice,
    })
    .from(ticketParts)
    .leftJoin(stockItems, eq(ticketParts.stockItemId, stockItems.id))
    .where(eq(ticketParts.ticketId, ticket.id));

    let approvalStatus: 'pending' | 'approved' | 'rejected' = 'pending';
    if (ticket.status === 'onarimda' || ticket.status === 'cozuldu' || ticket.status === 'teslim_edildi') {
      approvalStatus = 'approved';
    } else if (ticket.status === 'onay_red' || ticket.status === 'iptal') {
      approvalStatus = 'rejected';
    }

    const { publicApprovalToken, ...ticketSafe } = ticket;
    res.json({
      ticket: {
        ...ticketSafe,
        approvalStatus,
        parts: parts.map(p => ({
          name: p.name || 'Yedek Parça / Hizmet',
          quantity: p.quantity || 1,
          unitPrice: p.unitPrice || '0',
        })),
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Sunucu hatası' });
  }
});

publicRouter.post('/api/public/ticket-approval-submit', ticketActionLimiter, async (req, res) => {
  try {
    const { ticketId, ticketNumber, approved, token } = req.body;
    if (!ticketId && !ticketNumber) return res.status(400).json({ error: 'Eksik parametre' });
    if (!token || typeof token !== 'string') return res.status(403).json({ error: 'Geçersiz veya eksik onay linki' });

    const condition = ticketId ? eq(tickets.id, Number(ticketId)) : eq(tickets.ticketNumber, String(ticketNumber));
    const rows = await db.select().from(tickets).where(condition).limit(1);
    if (rows.length === 0) return res.status(404).json({ error: 'Servis kaydı bulunamadı' });

    const ticket = rows[0];
    if (!ticket.publicApprovalToken || ticket.publicApprovalToken !== token) {
      return res.status(403).json({ error: 'Geçersiz veya eksik onay linki' });
    }
    const newStatus = approved ? 'onarimda' : 'onay_red';

    await db.update(tickets).set({
      status: newStatus,
      updatedAt: new Date(),
    }).where(eq(tickets.id, ticket.id));

    await db.insert(serviceStatusLogs).values({
      tenantId: ticket.tenantId,
      ticketId: ticket.id,
      fromStatus: ticket.status,
      toStatus: newStatus,
      notes: `Müşteri onay portalı üzerinden (${getClientIp(req)}) onarımı ${approved ? 'ONAYLADI' : 'REDDETTİ'}.`,
    }).catch((e) => console.error('serviceStatusLogs insert error:', e));

    await markLatestApprovalRequest(ticket.id, approved ? 'approved' : 'rejected', getClientIp(req));

    await notifyStaff({
      type: approved ? 'success' : 'warning',
      title: `Müşteri Onay Portalı: #${ticket.ticketNumber}`,
      message: `Müşteri #${ticket.ticketNumber} servis kaydı için teklifi ${approved ? 'ONAYLADI' : 'REDDETTİ'}.`,
    });

    res.json({ success: true, newStatus });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'İşlem gerçekleştirilemedi' });
  }
});

publicRouter.post('/api/tickets/:ticketNumber/pay', ticketActionLimiter, async (req, res) => {
  try {
    const rawCode = (req.params.ticketNumber || '').trim();
    const cleanCode = rawCode.replace(/[^A-Za-z0-9\-]/g, '');
    const { paymentMethod } = req.body;
    const rows = await db.select().from(tickets).where(
      or(eq(tickets.ticketNumber, cleanCode), sql`CAST(${tickets.id} AS CHAR) = ${cleanCode}`)
    ).limit(1);

    if (rows.length === 0) return res.status(404).json({ error: 'Servis kaydı bulunamadı' });
    const ticket = rows[0];

    await db.update(tickets).set({
      status: 'cozuldu',
      updatedAt: new Date(),
    }).where(eq(tickets.id, ticket.id));

    await db.insert(serviceStatusLogs).values({
      tenantId: ticket.tenantId,
      ticketId: ticket.id,
      fromStatus: ticket.status,
      toStatus: 'cozuldu',
      notes: `Müşteri web üzerinden (${getClientIp(req)}) ${paymentMethod || 'kredi kartı'} ile ödeme bildiriminde bulundu.`,
    }).catch((e) => console.error('serviceStatusLogs insert error:', e));

    await notifyStaff({
      type: 'success',
      title: `Ödeme Bildirimi: #${ticket.ticketNumber}`,
      message: `Müşteri #${ticket.ticketNumber} numaralı servis kaydı için ${paymentMethod || 'kredi kartı'} ile ödeme bildiriminde bulundu.`,
    });

    res.json({ success: true, message: 'Ödeme kaydınız işleme alındı.' });
  } catch (e: any) {
    console.error('Ticket pay error:', e);
    res.status(500).json({ error: e.message || 'Ödeme kaydı oluşturulamadı.' });
  }
});

publicRouter.get('/api/public/menus', async (req, res) => {
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

publicRouter.get('/api/public/settings', async (req, res) => {
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
      'captchaEnabled', 'turnstileSiteKey',
      'geoLat', 'geoLng', 'geoRegion', 'geoPlacename',
      'businessHoursOpen', 'businessHoursClose', 'businessDays',
      'sitemapBaseUrl', 'siteBaseUrl', 'robotsTxt',
      'whatsappApiEnabled', 'whatsappApiUrl', 'whatsappApiToken', 'whatsappTemplate'
    ];
    
    const publicSettings: Record<string, string> = {};
    allSettings.forEach(s => {
      if (publicKeys.includes(s.key)) {
        publicSettings[s.key] = s.value || '';
      }
    });

    const publishedThemeSettings = await db.select().from(themeSettings).where(eq(themeSettings.isDraft, false));
    publishedThemeSettings.forEach(ts => {
      if (publicKeys.includes(ts.settingKey)) {
        let val = ts.settingValue;
        if (typeof val !== 'string') {
          try { val = JSON.stringify(val); } catch { val = ''; }
          if (typeof val === 'string' && val.startsWith('"') && val.endsWith('"')) {
            val = val.slice(1, -1);
          }
        }
        publicSettings[ts.settingKey] = val as string;
      }
    });

    res.json(publicSettings);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

publicRouter.get('/api/public/translations/:lang', async (req, res) => {
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

publicRouter.get('/api/public/plugins', async (req, res) => {
  try {
    const activePlugins = await db.select().from(plugins).where(eq(plugins.isActive, true));
    res.json(activePlugins.map(p => p.pluginId));
  } catch (e: any) {
    console.error('Plugins endpoint fallback used:', e?.message || e);
    res.setHeader('x-fallback-source', 'default-plugins');
    res.json([]);
  }
});

publicRouter.get('/api/public/google-business', async (req, res) => {
  try {
    const now = Date.now();
    const GMB_CACHE_DURATION = 60 * 60 * 1000;
    if (gmbCache && (now - gmbCacheTime < GMB_CACHE_DURATION)) {
      res.setHeader('x-cache', 'HIT');
      return res.json(gmbCache);
    }

    const gmbPlugin = await db.select().from(plugins).where(eq(plugins.pluginId, 'google-business')).limit(1);
    if (!gmbPlugin.length || !gmbPlugin[0].isActive) {
      return res.json({ error: 'Plugin not active' });
    }
    let pluginSettings = gmbPlugin[0].settings as any;
    if (typeof pluginSettings === 'string') {
      try { pluginSettings = JSON.parse(pluginSettings); } catch (e) { pluginSettings = {}; }
    }
    if (!pluginSettings || !pluginSettings.tokens || !pluginSettings.selectedLocation) {
      return res.json({ error: 'Settings not configured' });
    }
    
    const oauth2Client = new google.auth.OAuth2(pluginSettings.clientId, pluginSettings.clientSecret);
    oauth2Client.setCredentials(pluginSettings.tokens);
    
    const url = `https://mybusiness.googleapis.com/v4/${pluginSettings.selectedLocation}/reviews`;
    const response = await oauth2Client.request({ url }).catch(() => ({ data: {} }));
    const reviewsData = (response as any).data || {};
    
    const result = {
      rating: reviewsData.averageRating || 5.0,
      user_ratings_total: reviewsData.totalReviewCount || reviewsData.reviews?.length || 0,
      reviews: reviewsData.reviews || [],
      url: '#'
    };

    gmbCache = result;
    gmbCacheTime = now;
    res.setHeader('x-cache', 'MISS');
    res.json(result);
  } catch (e: any) {
    if (gmbCache) {
      res.setHeader('x-cache', 'STALE');
      return res.json(gmbCache);
    }
    res.status(500).json({ error: e.message });
  }
});

publicRouter.get('/api/public/pages/:slug', async (req, res) => {
  try {
    const pageResult = await db.select().from(pages).where(eq(pages.slug, req.params.slug)).limit(1);
    if (pageResult.length === 0) return res.status(404).json({ error: 'Sayfa bulunamadı' });
    if (pageResult[0].status !== 'yayinlandi') return res.status(404).json({ error: 'Sayfa bulunamadı' });
    res.json(pageResult[0]);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

publicRouter.get('/api/public/pages/:slug/blocks', async (req, res) => {
  try {
    const pageResult = await db.select().from(pages).where(eq(pages.slug, req.params.slug)).limit(1);
    if (pageResult.length === 0) return res.status(404).json({ error: 'Sayfa bulunamadı' });
    if (pageResult[0].status !== 'yayinlandi') return res.status(404).json({ error: 'Sayfa bulunamadı' });
    
    const blocks = await db.select().from(pageBlocks).where(
      and(
        eq(pageBlocks.ownerType, 'page'),
        eq(pageBlocks.ownerId, pageResult[0].id)
      )
    ).orderBy(asc(pageBlocks.sortOrder));
    res.json(blocks);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

publicRouter.get('/api/public/testimonials', async (req, res) => {
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

// CMS: Settings
publicRouter.get('/api/settings', async (req, res) => {
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
publicRouter.get('/api/pages', async (req, res) => {
  try {
    const allPages = await db.select().from(pages).where(eq(pages.status, 'yayinlandi'));
    res.json(allPages);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

publicRouter.get('/api/pages/:slug', async (req, res) => {
  try {
    const page = await db.select().from(pages).where(eq(pages.slug, req.params.slug)).limit(1);
    if (page.length === 0) return res.status(404).json({ error: 'Page not found' });
    res.json(page[0]);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// CMS: Blog
publicRouter.get('/api/blog', async (req, res) => {
  try {
    const posts = await db.select().from(blogPosts).where(eq(blogPosts.status, 'yayinlandi')).orderBy(desc(blogPosts.createdAt));
    res.json(posts);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

publicRouter.get('/api/blog/:slug', async (req, res) => {
  try {
    const post = await db.select().from(blogPosts).where(eq(blogPosts.slug, req.params.slug)).limit(1);
    if (post.length === 0) return res.status(404).json({ error: 'Post not found' });
    res.json(post[0]);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// CMS: Campaigns
publicRouter.get('/api/campaigns', async (req, res) => {
  try {
    const allCampaigns = await db.select().from(campaigns).where(eq(campaigns.status, 'aktif'));
    res.json(allCampaigns);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Services
publicRouter.get('/api/services', async (req, res) => {
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

publicRouter.get('/api/services/:id', async (req, res) => {
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
publicRouter.get('/api/faq', async (req, res) => {
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

// Appointments
publicRouter.post('/api/appointments', async (req, res) => {
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
publicRouter.post('/api/contact', async (req, res) => {
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

