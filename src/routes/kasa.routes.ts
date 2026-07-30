import express from 'express';
import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '../db/index';
import { sales, expenses, customerLedger, cashRegisterClosures, customers, users } from '../db/schema';
import { requireAdmin } from '../server/middleware';

export const kasaRouter = express.Router();

function dayRange(dateStr: string) {
  const start = new Date(`${dateStr}T00:00:00`);
  const end = new Date(`${dateStr}T23:59:59.999`);
  return { start, end };
}

async function buildSummary(dateStr: string) {
  const { start, end } = dayRange(dateStr);
  const dateFilter = (field: any) => and(sql`${field} >= ${start}`, sql`${field} <= ${end}`);

  const salesByType = await db.select({
    paymentType: sales.paymentType,
    total: sql<string>`COALESCE(SUM(${sales.totalAmount}), 0)`,
  }).from(sales)
    .where(and(dateFilter(sales.createdAt), eq(sales.status, 'odendi')))
    .groupBy(sales.paymentType);

  const ledgerByMethod = await db.select({
    paymentMethod: customerLedger.paymentMethod,
    total: sql<string>`COALESCE(SUM(${customerLedger.amount}), 0)`,
  }).from(customerLedger)
    .where(and(dateFilter(customerLedger.createdAt), eq(customerLedger.type, 'alacak')))
    .groupBy(customerLedger.paymentMethod);

  const expensesByMethod = await db.select({
    paymentMethod: expenses.paymentMethod,
    total: sql<string>`COALESCE(SUM(${expenses.amount}), 0)`,
  }).from(expenses)
    .where(dateFilter(expenses.createdAt))
    .groupBy(expenses.paymentMethod);

  const sumFor = (rows: any[], key: string, matchValue: string) =>
    rows.filter(r => r[key] === matchValue).reduce((s, r) => s + parseFloat(r.total || '0'), 0);

  const cashSales = sumFor(salesByType, 'paymentType', 'nakit');
  const cardSales = sumFor(salesByType, 'paymentType', 'kredi_karti');
  const transferSales = sumFor(salesByType, 'paymentType', 'havale');
  const cariSales = sumFor(salesByType, 'paymentType', 'cari');

  const cashTahsilat = sumFor(ledgerByMethod, 'paymentMethod', 'nakit');
  const otherTahsilat = ledgerByMethod.reduce((s, r) => s + parseFloat(r.total || '0'), 0) - cashTahsilat;

  const cashExpense = sumFor(expensesByMethod, 'paymentMethod', 'nakit');
  const otherExpense = expensesByMethod.reduce((s, r) => s + parseFloat(r.total || '0'), 0) - cashExpense;

  const [closure] = await db.select().from(cashRegisterClosures).where(eq(cashRegisterClosures.closureDate, dateStr as any)).limit(1);

  const [prevClosure] = await db.select().from(cashRegisterClosures)
    .where(sql`${cashRegisterClosures.closureDate} < ${dateStr}`)
    .orderBy(desc(cashRegisterClosures.closureDate))
    .limit(1);

  const suggestedOpening = prevClosure ? parseFloat(prevClosure.countedCash) : 0;
  const expectedCash = suggestedOpening + cashSales + cashTahsilat - cashExpense;

  return {
    date: dateStr,
    sales: { cash: cashSales, card: cardSales, transfer: transferSales, cari: cariSales },
    tahsilat: { cash: cashTahsilat, other: otherTahsilat },
    expenses: { cash: cashExpense, other: otherExpense },
    suggestedOpening,
    expectedCash,
    closure: closure || null,
    isClosed: !!closure,
  };
}

// GET /api/admin/kasa/summary?date=YYYY-MM-DD
kasaRouter.get('/api/admin/kasa/summary', requireAdmin, async (req, res) => {
  try {
    const dateStr = (req.query.date as string) || new Date().toISOString().substring(0, 10);
    const summary = await buildSummary(dateStr);
    res.json(summary);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/admin/kasa/tahsilat — Hızlı tahsilat (müşteri cari hesabına alacak kaydı)
kasaRouter.post('/api/admin/kasa/tahsilat', requireAdmin, async (req, res) => {
  try {
    const { customerId, amount, paymentMethod, description } = req.body;
    const numericAmount = parseFloat(amount);
    if (!customerId || !numericAmount || numericAmount <= 0) {
      return res.status(400).json({ error: 'Müşteri ve geçerli bir tutar zorunludur.' });
    }
    const adminUser = (req as any).adminUser;
    const userId = parseInt(customerId);

    await db.transaction(async (tx) => {
      await tx.insert(customerLedger).values({
        tenantId: 1,
        userId,
        type: 'alacak',
        amount: numericAmount.toFixed(2),
        paymentMethod: paymentMethod === 'kredi_karti' || paymentMethod === 'havale' ? paymentMethod : 'nakit',
        description: description || 'Kasa üzerinden tahsilat',
        createdByUserId: adminUser?.userId || null,
      });

      const [cust] = await tx.select().from(customers).where(eq(customers.userId, userId)).limit(1);
      if (cust) {
        const currentBal = parseFloat(cust.balance || '0');
        await tx.update(customers).set({ balance: (currentBal - numericAmount).toFixed(2) }).where(eq(customers.userId, userId));
      }
    });

    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/admin/kasa/masraf — Hızlı masraf girişi
kasaRouter.post('/api/admin/kasa/masraf', requireAdmin, async (req, res) => {
  try {
    const { title, amount, category, paymentMethod, description } = req.body;
    const numericAmount = parseFloat(amount);
    if (!title || !numericAmount || numericAmount <= 0) {
      return res.status(400).json({ error: 'Masraf adı ve geçerli bir tutar zorunludur.' });
    }
    await db.insert(expenses).values({
      tenantId: 1,
      title,
      amount: numericAmount.toFixed(2),
      category: category || 'diger',
      paymentMethod: paymentMethod === 'kredi_karti' || paymentMethod === 'havale' ? paymentMethod : 'nakit',
      description: description || null,
      expenseDate: new Date(),
    });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/admin/kasa/close — Gün sonu kapanışı
kasaRouter.post('/api/admin/kasa/close', requireAdmin, async (req, res) => {
  try {
    const { date, openingBalance, countedCash, notes } = req.body;
    const dateStr = date || new Date().toISOString().substring(0, 10);

    const [existing] = await db.select().from(cashRegisterClosures).where(eq(cashRegisterClosures.closureDate, dateStr as any)).limit(1);
    if (existing) {
      return res.status(409).json({ error: 'Bu tarih için kasa zaten kapatılmış.' });
    }

    const summary = await buildSummary(dateStr);
    const opening = parseFloat(openingBalance) || summary.suggestedOpening;
    const expected = opening + summary.sales.cash + summary.tahsilat.cash - summary.expenses.cash;
    const counted = parseFloat(countedCash) || 0;
    const variance = counted - expected;

    const adminUser = (req as any).adminUser;
    await db.insert(cashRegisterClosures).values({
      tenantId: 1,
      closureDate: dateStr as any,
      openingBalance: opening.toFixed(2),
      expectedCash: expected.toFixed(2),
      countedCash: counted.toFixed(2),
      variance: variance.toFixed(2),
      notes: notes || null,
      closedByUserId: adminUser?.userId || null,
    });

    res.json({ success: true, expected, variance });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/admin/kasa/closures — Gün sonu geçmişi
kasaRouter.get('/api/admin/kasa/closures', requireAdmin, async (req, res) => {
  try {
    const rows = await db.select({
      id: cashRegisterClosures.id,
      closureDate: cashRegisterClosures.closureDate,
      openingBalance: cashRegisterClosures.openingBalance,
      expectedCash: cashRegisterClosures.expectedCash,
      countedCash: cashRegisterClosures.countedCash,
      variance: cashRegisterClosures.variance,
      notes: cashRegisterClosures.notes,
      createdAt: cashRegisterClosures.createdAt,
      closedByName: sql<string>`CONCAT(COALESCE(${users.firstName}, ''), ' ', COALESCE(${users.lastName}, ''))`,
    }).from(cashRegisterClosures)
      .leftJoin(users, eq(cashRegisterClosures.closedByUserId, users.id))
      .orderBy(desc(cashRegisterClosures.closureDate))
      .limit(60);
    res.json(rows);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
