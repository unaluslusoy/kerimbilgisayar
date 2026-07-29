import express from 'express';
import { eq, and, desc, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/mysql-core';
import { db } from '../db/index';
import {
  invoices,
  invoiceItems,
  maintenanceContracts,
  companies,
  users,
  tickets,
  ticketParts,
  stockItems,
} from '../db/schema';
import { requireAdmin } from '../server/middleware';

export const invoicesRouter = express.Router();

// INVOICES — Fatura Yönetimi
invoicesRouter.get('/api/admin/invoices', requireAdmin, async (req, res) => {
  try {
    const customerUser = alias(users, 'invoice_user');
    const result = await db.select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      userId: invoices.userId,
      companyId: invoices.companyId,
      ticketId: invoices.ticketId,
      subtotal: invoices.subtotal,
      taxRate: invoices.taxRate,
      taxAmount: invoices.taxAmount,
      discountAmount: invoices.discountAmount,
      totalAmount: invoices.totalAmount,
      status: invoices.status,
      issueDate: invoices.issueDate,
      dueDate: invoices.dueDate,
      notes: invoices.notes,
      createdAt: invoices.createdAt,
      customerName: sql`CONCAT(${customerUser.firstName}, ' ', ${customerUser.lastName})`.as('customerName'),
      companyName: companies.name,
    })
      .from(invoices)
      .leftJoin(customerUser, eq(invoices.userId, customerUser.id))
      .leftJoin(companies, eq(invoices.companyId, companies.id))
      .orderBy(desc(invoices.createdAt));

    const invoiceIds = result.map(r => r.id);
    let allItems: any[] = [];
    if (invoiceIds.length > 0) {
      allItems = await db.select().from(invoiceItems).where(sql`${invoiceItems.invoiceId} IN (${sql.join(invoiceIds.map(id => sql`${id}`), sql`, `)})`);
    }

    const enriched = result.map(inv => ({
      ...inv,
      items: allItems.filter(it => it.invoiceId === inv.id),
    }));

    res.json(enriched);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

invoicesRouter.get('/api/admin/invoices/:id', requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [inv] = await db.select().from(invoices).where(eq(invoices.id, id)).limit(1);
    if (!inv) return res.status(404).json({ error: 'Fatura bulunamadı' });
    const items = await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, id));
    res.json({ ...inv, items });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

invoicesRouter.post('/api/admin/invoices', requireAdmin, async (req, res) => {
  try {
    const { invoiceNumber, userId, companyId, ticketId, subtotal, taxRate, taxAmount, discountAmount, totalAmount, status, issueDate, dueDate, notes, items } = req.body;
    if (!invoiceNumber || !issueDate) return res.status(400).json({ error: 'Fatura numarası ve düzenlenme tarihi zorunludur' });

    const [result] = await db.insert(invoices).values({
      tenantId: 1,
      invoiceNumber,
      userId: userId || null,
      companyId: companyId || null,
      ticketId: ticketId || null,
      subtotal: subtotal || '0.00',
      taxRate: taxRate || '20.00',
      taxAmount: taxAmount || '0.00',
      discountAmount: discountAmount || '0.00',
      totalAmount: totalAmount || '0.00',
      status: status || 'taslak',
      issueDate: new Date(issueDate),
      dueDate: dueDate ? new Date(dueDate) : new Date(issueDate),
      notes: notes || null,
    });

    const insertedId = (result as any).insertId;

    if (Array.isArray(items) && items.length > 0) {
      await db.insert(invoiceItems).values(
        items.map((it: any) => ({
          invoiceId: insertedId,
          description: it.description || '',
          quantity: Number(it.quantity) || 1,
          unitPrice: it.unitPrice || '0.00',
          total: it.total || '0.00',
        }))
      );
    }

    res.json({ success: true, id: insertedId });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

invoicesRouter.patch('/api/admin/invoices/:id', requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { invoiceNumber, userId, companyId, ticketId, subtotal, taxRate, taxAmount, discountAmount, totalAmount, status, issueDate, dueDate, notes, items } = req.body;

    await db.update(invoices).set({
      ...(invoiceNumber && { invoiceNumber }),
      ...(userId !== undefined && { userId: userId || null }),
      ...(companyId !== undefined && { companyId: companyId || null }),
      ...(ticketId !== undefined && { ticketId: ticketId || null }),
      ...(subtotal && { subtotal }),
      ...(taxRate && { taxRate }),
      ...(taxAmount && { taxAmount }),
      ...(discountAmount !== undefined && { discountAmount }),
      ...(totalAmount && { totalAmount }),
      ...(status && { status: status as any }),
      ...(issueDate && { issueDate: new Date(issueDate) }),
      ...(dueDate && { dueDate: new Date(dueDate) }),
      ...(notes !== undefined && { notes }),
    }).where(eq(invoices.id, id));

    if (Array.isArray(items)) {
      await db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, id));
      if (items.length > 0) {
        await db.insert(invoiceItems).values(
          items.map((it: any) => ({
            invoiceId: id,
            description: it.description || '',
            quantity: Number(it.quantity) || 1,
            unitPrice: it.unitPrice || '0.00',
            total: it.total || '0.00',
          }))
        );
      }
    }

    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

invoicesRouter.delete('/api/admin/invoices/:id', requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, id));
    await db.delete(invoices).where(eq(invoices.id, id));
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

invoicesRouter.post('/api/admin/invoices/from-ticket/:ticketId', requireAdmin, async (req, res) => {
  try {
    const ticketId = Number(req.params.ticketId);
    const [ticket] = await db.select().from(tickets).where(eq(tickets.id, ticketId)).limit(1);
    if (!ticket) return res.status(404).json({ error: 'Servis kaydı bulunamadı' });

    const rawParts = await db.select({
      name: ticketParts.name,
      stockItemName: stockItems.name,
      quantity: ticketParts.quantity,
      unitPrice: ticketParts.unitPrice,
      totalPrice: ticketParts.totalPrice,
    }).from(ticketParts)
      .leftJoin(stockItems, eq(ticketParts.stockItemId, stockItems.id))
      .where(and(eq(ticketParts.ticketId, ticketId), sql`${ticketParts.removedAt} IS NULL`));
    const parts = rawParts.map(p => ({ ...p, name: p.name || p.stockItemName || 'Parça' }));

    const invoiceNum = `FTR-${Date.now().toString(36).toUpperCase()}`;
    const laborCost = parseFloat(String(ticket.laborCost)) || 0;
    const partsCost = parts.reduce((s, p) => s + (parseFloat(String(p.totalPrice)) || 0), 0);
    const subtotal = laborCost + partsCost;
    const taxRate = 20;
    const taxAmount = subtotal * taxRate / 100;
    const totalAmount = subtotal + taxAmount;

    const allItems = [
      ...(laborCost > 0 ? [{ description: 'İşçilik Ücreti', quantity: 1, unitPrice: laborCost.toFixed(2), total: laborCost.toFixed(2) }] : []),
      ...parts.map(p => ({ description: p.name, quantity: p.quantity, unitPrice: String(p.unitPrice), total: String(p.totalPrice) })),
    ];

    const [result] = await db.insert(invoices).values({
      tenantId: 1,
      invoiceNumber: invoiceNum,
      userId: ticket.userId,
      ticketId,
      subtotal: subtotal.toFixed(2),
      taxRate: taxRate.toFixed(2),
      taxAmount: taxAmount.toFixed(2),
      totalAmount: totalAmount.toFixed(2),
      status: 'taslak',
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      notes: `Servis kaydı #${ticket.ticketNumber} için oluşturuldu`,
    });

    const insertedId = (result as any).insertId;

    if (allItems.length > 0) {
      await db.insert(invoiceItems).values(allItems.map(it => ({
        invoiceId: insertedId,
        description: it.description,
        quantity: Number(it.quantity),
        unitPrice: it.unitPrice,
        total: it.total,
      })));
    }

    res.json({ success: true, id: insertedId, invoiceNumber: invoiceNum });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// CONTRACTS — Bakım Sözleşmeleri
invoicesRouter.get('/api/admin/contracts', requireAdmin, async (req, res) => {
  try {
    const result = await db.select({
      id: maintenanceContracts.id,
      title: maintenanceContracts.title,
      companyId: maintenanceContracts.companyId,
      startDate: maintenanceContracts.startDate,
      endDate: maintenanceContracts.endDate,
      status: maintenanceContracts.status,
      slaDetails: maintenanceContracts.slaDetails,
      monthlyFee: maintenanceContracts.monthlyFee,
      createdAt: maintenanceContracts.createdAt,
      companyName: companies.name,
    })
      .from(maintenanceContracts)
      .leftJoin(companies, eq(maintenanceContracts.companyId, companies.id))
      .orderBy(desc(maintenanceContracts.createdAt));
    res.json(result);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

invoicesRouter.post('/api/admin/contracts', requireAdmin, async (req, res) => {
  try {
    const { title, companyId, startDate, endDate, status, slaDetails, monthlyFee } = req.body;
    if (!title || !startDate || !endDate) return res.status(400).json({ error: 'Başlık, başlangıç ve bitiş tarihi zorunludur' });

    const [result] = await db.insert(maintenanceContracts).values({
      tenantId: 1,
      title,
      companyId: companyId || null,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      status: status || 'bekliyor',
      slaDetails: slaDetails || null,
      monthlyFee: monthlyFee || null,
    });
    res.json({ success: true, id: (result as any).insertId });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

invoicesRouter.patch('/api/admin/contracts/:id', requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { title, companyId, startDate, endDate, status, slaDetails, monthlyFee } = req.body;
    await db.update(maintenanceContracts).set({
      ...(title && { title }),
      ...(companyId !== undefined && { companyId: companyId || null }),
      ...(startDate && { startDate: new Date(startDate) }),
      ...(endDate && { endDate: new Date(endDate) }),
      ...(status && { status: status as any }),
      ...(slaDetails !== undefined && { slaDetails }),
      ...(monthlyFee !== undefined && { monthlyFee }),
    }).where(eq(maintenanceContracts.id, id));
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

invoicesRouter.delete('/api/admin/contracts/:id', requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(maintenanceContracts).where(eq(maintenanceContracts.id, id));
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});
