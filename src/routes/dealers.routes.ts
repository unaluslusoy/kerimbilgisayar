import express from 'express';
import bcrypt from 'bcryptjs';
import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '../db/index';
import { companies, users, dealerLedger, tickets, exchangeRates } from '../db/schema';
import { requireAdmin } from '../server/middleware';

export const dealersRouter = express.Router();

// FAZ 1B — BAYİ YÖNETİMİ
dealersRouter.get('/api/admin/dealers', requireAdmin, async (req, res) => {
  try {
    const dealers = await db.select().from(companies)
      .where(eq(companies.dealerType, 'dealer'))
      .orderBy(desc(companies.createdAt));
    res.json(dealers);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

dealersRouter.post('/api/admin/dealers', requireAdmin, async (req, res) => {
  try {
    const { name, taxId, taxOffice, address, phone, email, website, sector, dealerRiskLimit, dealerDueDays, dealerDiscountRate, dealerPriceListNote } = req.body;
    const inserted = await db.insert(companies).values({
      tenantId: 1,
      name,
      taxId,
      taxOffice,
      address,
      phone,
      email,
      website,
      sector,
      type: 'partner',
      dealerType: 'dealer',
      dealerRiskLimit: dealerRiskLimit ? dealerRiskLimit.toString() : null,
      dealerDueDays: parseInt(dealerDueDays) || 0,
      dealerDiscountRate: dealerDiscountRate ? dealerDiscountRate.toString() : '0.00',
      dealerPriceListNote,
    });
    res.json({ success: true, id: (inserted[0] as any).insertId });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

dealersRouter.delete('/api/admin/dealers/:id', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.update(users).set({ companyId: null }).where(eq(users.companyId, id));
    await db.delete(companies).where(eq(companies.id, id));
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

dealersRouter.get('/api/admin/dealers/:id/users', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const dealerUsers = await db.select().from(users).where(eq(users.companyId, id));
    res.json(dealerUsers);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

dealersRouter.post('/api/admin/dealers/:id/users', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { firstName, lastName, email, phone, password } = req.body;
    const hashedPassword = await bcrypt.hash(password || 'bayi123', 10);
    const inserted = await db.insert(users).values({
      tenantId: 1,
      firstName,
      lastName,
      email,
      phone,
      passwordHash: hashedPassword,
      roleType: 'dealer_user',
      companyId: id,
    });
    res.json({ success: true, id: (inserted[0] as any).insertId });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

dealersRouter.get('/api/admin/dealers/:id/balance', requireAdmin, async (req, res) => {
  try {
    const dealerId = parseInt(req.params.id);
    const ledgerRows = await db.select().from(dealerLedger)
      .where(and(eq(dealerLedger.dealerCompanyId, dealerId), eq(dealerLedger.isReversed, false)));
    
    let balance = 0;
    for (const row of ledgerRows) {
      const amt = parseFloat(row.amount as string);
      if (row.type === 'debit') balance += amt;
      else balance -= amt;
    }
    
    const company = await db.select().from(companies).where(eq(companies.id, dealerId)).limit(1);
    res.json({
      dealerId,
      companyName: company[0]?.name || '—',
      balance: balance.toFixed(2),
      riskLimit: company[0]?.dealerRiskLimit || null,
      dueDays: company[0]?.dealerDueDays || 0,
      ledgerCount: ledgerRows.length,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

dealersRouter.get('/api/admin/dealers/:id/ledger', requireAdmin, async (req, res) => {
  try {
    const dealerId = parseInt(req.params.id);
    const rows = await db.select({
      id: dealerLedger.id,
      type: dealerLedger.type,
      amount: dealerLedger.amount,
      currency: dealerLedger.currency,
      description: dealerLedger.description,
      dueDate: dealerLedger.dueDate,
      isReversed: dealerLedger.isReversed,
      createdAt: dealerLedger.createdAt,
      ticketId: dealerLedger.ticketId,
      ticketNumber: tickets.ticketNumber,
    }).from(dealerLedger)
      .leftJoin(tickets, eq(dealerLedger.ticketId, tickets.id))
      .where(eq(dealerLedger.dealerCompanyId, dealerId))
      .orderBy(desc(dealerLedger.createdAt))
      .limit(200);
    res.json(rows);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

dealersRouter.post('/api/admin/dealers/:id/ledger', requireAdmin, async (req, res) => {
  try {
    const dealerId = parseInt(req.params.id);
    const { type, amount, description, dueDate, currency } = req.body;
    const adminUser = (req as any).adminUser;
    if (!type || !amount) return res.status(400).json({ error: 'type ve amount zorunlu' });
    await db.insert(dealerLedger).values({
      tenantId: 1,
      dealerCompanyId: dealerId,
      type,
      amount: parseFloat(amount).toFixed(2),
      currency: currency || 'TRY',
      description,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      createdByUserId: adminUser?.userId,
    });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

dealersRouter.post('/api/admin/dealers/ledger/:entryId/reverse', requireAdmin, async (req, res) => {
  try {
    const entryId = parseInt(req.params.entryId);
    const adminUser = (req as any).adminUser;
    const entry = await db.select().from(dealerLedger).where(eq(dealerLedger.id, entryId)).limit(1);
    if (!entry.length) return res.status(404).json({ error: 'Kayıt bulunamadı' });
    if (entry[0].isReversed) return res.status(400).json({ error: 'Bu kayıt zaten iptal edildi' });

    await db.transaction(async (tx) => {
      await tx.update(dealerLedger).set({ isReversed: true }).where(eq(dealerLedger.id, entryId));
      await tx.insert(dealerLedger).values({
        tenantId: entry[0].tenantId || 1,
        dealerCompanyId: entry[0].dealerCompanyId,
        type: entry[0].type === 'debit' ? 'credit' : 'debit',
        amount: entry[0].amount,
        currency: entry[0].currency || 'TRY',
        description: `İPTAL - ${entry[0].description || `Kayıt #${entryId}`}`,
        reversalOfId: entryId,
        createdByUserId: adminUser?.userId,
      });
    });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

dealersRouter.patch('/api/admin/dealers/:id', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, taxId, taxOffice, address, phone, email, website, sector, dealerRiskLimit, dealerDueDays, dealerDiscountRate, dealerPriceListNote } = req.body;
    const updateData: any = { updatedAt: new Date() };
    if (name !== undefined) updateData.name = name;
    if (taxId !== undefined) updateData.taxId = taxId;
    if (taxOffice !== undefined) updateData.taxOffice = taxOffice;
    if (address !== undefined) updateData.address = address;
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email;
    if (website !== undefined) updateData.website = website;
    if (sector !== undefined) updateData.sector = sector;
    if (dealerRiskLimit !== undefined) updateData.dealerRiskLimit = dealerRiskLimit ? dealerRiskLimit.toString() : null;
    if (dealerDueDays !== undefined) updateData.dealerDueDays = parseInt(dealerDueDays) || 0;
    if (dealerDiscountRate !== undefined) updateData.dealerDiscountRate = dealerDiscountRate ? dealerDiscountRate.toString() : '0.00';
    if (dealerPriceListNote !== undefined) updateData.dealerPriceListNote = dealerPriceListNote;

    await db.update(companies).set(updateData).where(eq(companies.id, id));
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// FAZ 1D — DÖVİZ KURLARI
dealersRouter.get('/api/admin/rates', requireAdmin, async (req, res) => {
  try {
    const { currency } = req.query;
    const rates = await db.select().from(exchangeRates)
      .where(currency ? eq(exchangeRates.targetCurrency, String(currency)) : sql`1=1`)
      .orderBy(desc(exchangeRates.rateDate))
      .limit(30);
    res.json(rates);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

dealersRouter.post('/api/admin/rates/fetch-tcmb', requireAdmin, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const response = await fetch('https://www.tcmb.gov.tr/kurlar/today.xml');
    if (!response.ok) return res.status(502).json({ error: 'TCMB bağlantı hatası' });
    const xmlText = await response.text();
    
    const currencies = ['USD', 'EUR', 'GBP'];
    const results: any[] = [];

    for (const curr of currencies) {
      const forexSelling = xmlText.match(new RegExp(`<Currency CurrencyCode="${curr}">[^]*?<ForexSelling>([^<]+)<`, 'i'));
      if (forexSelling && forexSelling[1]) {
        const rate = parseFloat(forexSelling[1].replace(',', '.'));
        if (rate > 0) {
          const existing = await db.select().from(exchangeRates)
            .where(and(eq(exchangeRates.targetCurrency, curr), eq(exchangeRates.rateDate, today as any)))
            .limit(1);
          
          if (existing.length > 0) {
            await db.update(exchangeRates).set({ rate: rate.toString(), fetchedAt: new Date(), source: 'tcmb' })
              .where(eq(exchangeRates.id, existing[0].id));
          } else {
            await db.insert(exchangeRates).values({
              tenantId: 1,
              baseCurrency: 'TRY',
              targetCurrency: curr,
              rate: rate.toString(),
              source: 'tcmb',
              rateDate: today as any,
            });
          }
          results.push({ currency: curr, rate });
        }
      }
    }
    res.json({ success: true, fetched: results, date: today });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

dealersRouter.post('/api/admin/rates', requireAdmin, async (req, res) => {
  try {
    const { targetCurrency, rate, rateDate } = req.body;
    if (!targetCurrency || !rate || !rateDate) return res.status(400).json({ error: 'targetCurrency, rate ve rateDate zorunlu' });
    
    const existing = await db.select().from(exchangeRates)
      .where(and(eq(exchangeRates.targetCurrency, targetCurrency), eq(exchangeRates.rateDate, rateDate)))
      .limit(1);
    
    if (existing.length > 0) {
      await db.update(exchangeRates).set({ rate: String(rate), source: 'manual' }).where(eq(exchangeRates.id, existing[0].id));
    } else {
      await db.insert(exchangeRates).values({ tenantId: 1, baseCurrency: 'TRY', targetCurrency, rate: String(rate), source: 'manual', rateDate });
    }
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
