import express from 'express';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '../db/index';
import { periodLocks, payments, tickets, auditLogs } from '../db/schema';
import { requireAdmin } from '../server/middleware';

export const financeRouter = express.Router();

// FAZ 1D — DÖNEM KİLİTLERİ
financeRouter.get('/api/admin/period-locks', requireAdmin, async (req, res) => {
  try {
    const locks = await db.select().from(periodLocks).orderBy(desc(periodLocks.year), desc(periodLocks.month));
    res.json(locks);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

financeRouter.post('/api/admin/period-locks', requireAdmin, async (req, res) => {
  try {
    const { year, month, notes } = req.body;
    const adminUser = (req as any).adminUser;
    if (!year || !month) return res.status(400).json({ error: 'year ve month zorunlu' });

    const existing = await db.select().from(periodLocks)
      .where(and(eq(periodLocks.year, parseInt(year)), eq(periodLocks.month, parseInt(month))))
      .limit(1);
    if (existing.length > 0) return res.status(409).json({ error: 'Bu dönem zaten kilitli' });

    await db.insert(periodLocks).values({
      tenantId: 1,
      year: parseInt(year),
      month: parseInt(month),
      notes,
      lockedByUserId: adminUser?.userId,
    });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

financeRouter.delete('/api/admin/period-locks/:id', requireAdmin, async (req, res) => {
  try {
    const adminUser = (req as any).adminUser;
    if (adminUser?.role !== 'superadmin' && adminUser?.role !== 'tenant_admin') {
      return res.status(403).json({ error: 'Bu işlem için süper yönetici yetkisi gerekli' });
    }
    await db.delete(periodLocks).where(eq(periodLocks.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// FAZ 3A — ÖDEME TERS KAYIT & TAH SİLAT
financeRouter.post('/api/admin/payments/:id/reverse', requireAdmin, async (req, res) => {
  try {
    const paymentId = parseInt(req.params.id);
    const adminUser = (req as any).adminUser;
    const payment = await db.select().from(payments).where(eq(payments.id, paymentId)).limit(1);
    if (!payment.length) return res.status(404).json({ error: 'Ödeme bulunamadı' });
    if (payment[0].status === 'iptal') return res.status(400).json({ error: 'Bu ödeme zaten iptal edilmiş' });
    if (payment[0].reversalOfId) return res.status(400).json({ error: 'Bu kayıt zaten bir ters kayıttır' });

    await db.transaction(async (tx) => {
      await tx.update(payments).set({
        status: 'iptal',
        reversedAt: new Date(),
        reversedByUserId: adminUser?.userId,
      }).where(eq(payments.id, paymentId));

      await tx.insert(payments).values({
        tenantId: payment[0].tenantId || 1,
        invoiceId: payment[0].invoiceId,
        companyId: payment[0].companyId,
        ticketId: (payment[0] as any).ticketId || null,
        amount: payment[0].amount,
        paymentMethod: payment[0].paymentMethod,
        status: 'iptal' as any,
        notes: `TERS KAYIT - Orijinal ödeme #${paymentId} iptal edildi`,
        reversalOfId: paymentId,
        reversedByUserId: adminUser?.userId,
        reversedAt: new Date(),
      } as any);
    });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

financeRouter.post('/api/admin/payments', requireAdmin, async (req, res) => {
  try {
    const { ticketId, amount, paymentMethod, notes, isRefund } = req.body;
    const amt = parseFloat(amount);
    if (!ticketId || !amt || amt <= 0) {
      return res.status(400).json({ error: 'Geçerli bir servis kaydı ve tutar giriniz.' });
    }
    if (!['kredi_karti', 'havale_eft', 'nakit', 'diger'].includes(paymentMethod)) {
      return res.status(400).json({ error: 'Geçersiz ödeme yöntemi.' });
    }
    const adminUser = (req as any).adminUser;
    const [ticket] = await db.select().from(tickets).where(eq(tickets.id, parseInt(ticketId))).limit(1);
    if (!ticket) return res.status(404).json({ error: 'Servis kaydı bulunamadı' });

    const [result] = await db.insert(payments).values({
      tenantId: ticket.tenantId || 1,
      ticketId: ticket.id,
      amount: amt.toFixed(2),
      paymentMethod,
      status: isRefund ? 'iade' : 'basarili',
      notes: notes || null,
    });
    const paymentId = (result as any).insertId;

    await db.insert(auditLogs).values({
      tenantId: ticket.tenantId || 1,
      userId: adminUser?.userId || null,
      action: isRefund ? 'payment.refund' : 'payment.collected',
      entityType: 'Ticket',
      entityId: ticket.id,
      details: { paymentId, amount: amt.toFixed(2), paymentMethod, notes: notes || null },
    }).catch((e) => console.error('auditLogs insert error:', e));

    res.json({ success: true, id: paymentId });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

financeRouter.get('/api/admin/payments', requireAdmin, async (req, res) => {
  try {
    const { ticketId } = req.query;
    let rows;
    if (ticketId) {
      rows = await db.select().from(payments)
        .where(eq((payments as any).ticketId, parseInt(String(ticketId))))
        .orderBy(desc(payments.createdAt));
    } else {
      rows = await db.select().from(payments).orderBy(desc(payments.createdAt)).limit(100);
    }
    res.json(rows);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
