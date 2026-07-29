import express from 'express';
import { eq, and, or, asc, sql } from 'drizzle-orm';
import { db } from '../db/index';
import {
  tickets,
  sales,
  expenses,
  customers,
  invoices,
  saleItems,
  stockItems,
  settings,
} from '../db/schema';
import { requireAdmin } from '../server/middleware';
import { TICKET_STATUS_LABELS } from '../lib/ticketStatus';

export const reportsRouter = express.Router();

// REPORTS — Raporlar
reportsRouter.get('/api/admin/reports/summary', requireAdmin, async (req, res) => {
  try {
    const startDate = req.query.startDate ? new Date(String(req.query.startDate)) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = req.query.endDate ? new Date(String(req.query.endDate) + 'T23:59:59') : new Date();

    const dateFilter = (_table: any, field: any) => and(
      sql`${field} >= ${startDate}`,
      sql`${field} <= ${endDate}`
    );

    const [ticketCountResult] = await db.select({ count: sql<number>`COUNT(*)` }).from(tickets).where(dateFilter(tickets, tickets.createdAt));
    const ticketCount = Number(ticketCountResult?.count || 0);

    const [revenueResult] = await db.select({ total: sql<string>`COALESCE(SUM(total_amount), 0)` }).from(sales)
      .where(and(dateFilter(sales, sales.createdAt), eq(sales.status, 'odendi')));
    const totalRevenue = revenueResult?.total || '0';

    const [expenseResult] = await db.select({ total: sql<string>`COALESCE(SUM(amount), 0)` }).from(expenses).where(dateFilter(expenses, expenses.createdAt));
    const totalExpenses = expenseResult?.total || '0';

    const netProfit = parseFloat(totalRevenue) - parseFloat(totalExpenses);

    const dailyRevenue = await db.select({
      date: sql<string>`DATE_FORMAT(created_at, '%d/%m')`.as('date'),
      amount: sql<number>`COALESCE(SUM(total_amount), 0)`.as('amount'),
    }).from(sales)
      .where(and(dateFilter(sales, sales.createdAt), eq(sales.status, 'odendi')))
      .groupBy(sql`DATE(created_at)`)
      .orderBy(sql`DATE(created_at)`);

    const ticketTypeDistribution = await db.select({
      name: tickets.type,
      value: sql<number>`COUNT(*)`.as('value'),
    }).from(tickets)
      .where(dateFilter(tickets, tickets.createdAt))
      .groupBy(tickets.type);

    const TYPE_LABELS: Record<string, string> = { ariza: 'Arıza', destek: 'Destek', kurulum: 'Kurulum', bakim: 'Bakım', diger: 'Diğer' };
    const ticketTypeLabeled = ticketTypeDistribution.map(t => ({ ...t, name: TYPE_LABELS[t.name] || t.name }));

    const ticketStatusRaw = await db.select({
      status: tickets.status,
      count: sql<number>`COUNT(*)`.as('count'),
    }).from(tickets)
      .where(dateFilter(tickets, tickets.createdAt))
      .groupBy(tickets.status);

    const ticketStatusSummary = ticketStatusRaw.map(s => ({
      label: TICKET_STATUS_LABELS[s.status] || s.status,
      count: Number(s.count),
    }));

    const [avgRes] = await db.select({
      avg: sql<number>`AVG(DATEDIFF(COALESCE(resolved_at, completed_at), created_at))`.as('avg'),
    }).from(tickets)
      .where(and(dateFilter(tickets, tickets.createdAt), or(sql`resolved_at IS NOT NULL`, sql`completed_at IS NOT NULL`)));
    const avgResolutionDays = avgRes?.avg ? Math.round(Number(avgRes.avg) * 10) / 10 : null;

    const [resolvedRes] = await db.select({ count: sql<number>`COUNT(*)` }).from(tickets)
      .where(and(dateFilter(tickets, tickets.createdAt), or(eq(tickets.status, 'cozuldu'), eq(tickets.status, 'kapatildi'), eq(tickets.status, 'teslim_edildi'))));
    const resolvedCount = Number(resolvedRes?.count || 0);

    const [pendingRes] = await db.select({ count: sql<number>`COUNT(*)` }).from(tickets)
      .where(and(dateFilter(tickets, tickets.createdAt), sql`status NOT IN ('cozuldu','kapatildi','iptal','teslim_edildi')`));
    const pendingCount = Number(pendingRes?.count || 0);

    const [newCustRes] = await db.select({ count: sql<number>`COUNT(*)` }).from(customers).where(dateFilter(customers, customers.createdAt));
    const newCustomerCount = Number(newCustRes?.count || 0);

    const paymentMethodRaw = await db.select({
      method: sales.paymentType,
      total: sql<string>`COALESCE(SUM(total_amount), 0)`.as('total'),
    }).from(sales)
      .where(and(dateFilter(sales, sales.createdAt), eq(sales.status, 'odendi')))
      .groupBy(sales.paymentType);

    const METHOD_LABELS: Record<string, string> = { nakit: 'Nakit', kredi_karti: 'Kredi Kartı', havale: 'Havale/EFT', cari: 'Cari' };
    const paymentMethodDistribution = paymentMethodRaw.map(p => ({ method: METHOD_LABELS[p.method] || p.method, total: p.total }));

    const expenseCategories = await db.select({
      category: expenses.category,
      total: sql<string>`COALESCE(SUM(amount), 0)`.as('total'),
    }).from(expenses)
      .where(dateFilter(expenses, expenses.createdAt))
      .groupBy(expenses.category)
      .orderBy(sql`SUM(amount) DESC`);

    const invoiceStatusRaw = await db.select({
      status: invoices.status,
      count: sql<number>`COUNT(*)`.as('count'),
      total: sql<string>`COALESCE(SUM(total_amount), 0)`.as('total'),
    }).from(invoices)
      .where(dateFilter(invoices, invoices.createdAt))
      .groupBy(invoices.status);

    const INV_LABELS: Record<string, string> = { taslak: 'Taslak', kuyrukta: 'Kuyrukta', gonderildi: 'Gönderildi', odendi: 'Ödendi', iptal: 'İptal', gecikmis: 'Gecikmiş' };
    const invoiceStatusSummary = invoiceStatusRaw.map(i => ({ status: INV_LABELS[i.status] || i.status, count: Number(i.count), total: i.total }));

    const topSellingProducts = await db.select({
      name: stockItems.name,
      sku: stockItems.sku,
      totalSold: sql<number>`SUM(${saleItems.quantity})`.as('totalSold'),
      totalRevenue: sql<string>`SUM(${saleItems.totalPrice})`.as('totalRevenue'),
    }).from(saleItems)
      .innerJoin(stockItems, eq(saleItems.stockItemId, stockItems.id))
      .innerJoin(sales, eq(saleItems.saleId, sales.id))
      .where(and(dateFilter(sales, sales.createdAt), eq(sales.status, 'odendi')))
      .groupBy(saleItems.stockItemId, stockItems.name, stockItems.sku)
      .orderBy(sql`totalSold DESC`)
      .limit(10);

    const lowStockItems = await db.select({
      name: stockItems.name,
      sku: stockItems.sku,
      currentStock: stockItems.currentStock,
      minStockLevel: stockItems.minStockLevel,
    }).from(stockItems)
      .where(and(eq(stockItems.isActive, true), sql`${stockItems.currentStock} <= ${stockItems.minStockLevel}`, sql`${stockItems.minStockLevel} > 0`))
      .orderBy(asc(stockItems.currentStock))
      .limit(20);

    res.json({
      ticketCount,
      totalRevenue,
      totalExpenses,
      netProfit,
      dailyRevenue,
      ticketTypeDistribution: ticketTypeLabeled,
      ticketStatusSummary,
      avgResolutionDays,
      resolvedCount,
      pendingCount,
      newCustomerCount,
      paymentMethodDistribution,
      expenseCategories,
      invoiceStatusSummary,
      topSellingProducts,
      lowStockItems,
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ÖDEAL PAYMENT API
reportsRouter.post('/api/payments/odeal/init-link', requireAdmin, async (req, res) => {
  try {
    const { amount, title, description, customerPhone, customerEmail } = req.body;
    if (!amount || Number(amount) <= 0) return res.status(400).json({ error: 'Geçerli bir tutar girilmelidir' });

    const settingsRows = await db.select().from(settings);
    const settingsMap: Record<string, string> = {};
    settingsRows.forEach(s => { settingsMap[s.key] = s.value; });

    const apiKey = settingsMap['odeal_api_key'] || process.env.ODEAL_API_KEY || '';
    const merchantId = settingsMap['odeal_merchant_id'] || process.env.ODEAL_MERCHANT_ID || '';
    const isSandbox = (settingsMap['odeal_sandbox'] || process.env.ODEAL_SANDBOX || 'true') === 'true';

    const baseUrl = isSandbox ? 'https://sandbox-api.odeal.com' : 'https://api.odeal.com';
    const referenceCode = `ODEAL-${Date.now()}`;

    if (apiKey && merchantId) {
      try {
        const odealRes = await fetch(`${baseUrl}/sanalpos/tr/api/payment/init-link`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'x-merchant-id': merchantId,
          },
          body: JSON.stringify({
            amount: parseFloat(amount).toFixed(2),
            title: title || 'Kerim Bilgisayar Ödeme',
            description: description || 'Servis / Fatura Ödemesi',
            clientPhone: customerPhone ? customerPhone.replace(/\D/g, '') : undefined,
            clientEmail: customerEmail || undefined,
            externalId: referenceCode,
            callbackUrl: `${req.protocol}://${req.get('host')}/api/payments/odeal/callback`,
          }),
        });
        const odealData = await odealRes.json();
        if (odealData?.paymentUrl || odealData?.data?.paymentUrl) {
          return res.json({
            success: true,
            paymentUrl: odealData.paymentUrl || odealData.data.paymentUrl,
            referenceCode,
          });
        }
      } catch (err) {
        console.error('[Ödeal API Error]:', err);
      }
    }

    const encodedPhone = customerPhone ? encodeURIComponent(customerPhone) : '';
    const fallbackUrl = `${req.protocol}://${req.get('host')}/pay/odeal?ref=${referenceCode}&amount=${amount}&title=${encodeURIComponent(title || 'Kerim Bilgisayar Ödeme')}&phone=${encodedPhone}`;

    res.json({
      success: true,
      paymentUrl: fallbackUrl,
      referenceCode,
      isSimulated: true,
      message: apiKey ? 'Ödeal API yanıt verdi' : 'Ödeal API anahtarları eklenene kadar simüle edilmiş ödeme linki oluşturuldu',
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

reportsRouter.post('/api/payments/odeal/init-3d', async (req, res) => {
  try {
    const { amount, cardNumber } = req.body;
    if (!amount || !cardNumber) return res.status(400).json({ error: 'Kart bilgileri eksik' });

    const referenceCode = `ODEAL-3D-${Date.now()}`;
    res.json({
      success: true,
      referenceCode,
      status: 'pending_3d',
      htmlContent: `<form id="odeal3d" action="https://sandbox-api.odeal.com/sanalpos/tr/api/payment/init-3d" method="POST"><input type="hidden" name="ref" value="${referenceCode}"/></form><script>document.getElementById('odeal3d').submit();</script>`,
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

reportsRouter.post('/api/payments/odeal/callback', express.urlencoded({ extended: false }), async (req, res) => {
  try {
    const { status, ticketId, invoiceId } = req.body;
    console.log('[Ödeal Callback Received]:', req.body);

    if (status === 'SUCCESS' || status === '1' || req.body.paymentStatus === 'SUCCESS') {
      if (invoiceId) {
        await db.update(invoices).set({ status: 'odendi' }).where(eq(invoices.id, Number(invoiceId)));
      }
      if (ticketId) {
        await db.update(tickets).set({ status: 'cozuldu' }).where(eq(tickets.id, Number(ticketId)));
      }
      return res.send('OK');
    }
    res.send('FAILED');
  } catch (e: any) { res.status(500).send('ERROR: ' + e.message); }
});
