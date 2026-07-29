import express from 'express';
import { eq, desc, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/mysql-core';
import { db } from '../db/index';
import { sales, saleItems, stockItems, stockMovements, serializedItems, users } from '../db/schema';
import { requireAdmin } from '../server/middleware';

export const salesRouter = express.Router();

salesRouter.get('/api/admin/sales', requireAdmin, async (req, res) => {
  try {
    const customerUsers = alias(users, 'customer_users');
    const salespersonUsers = alias(users, 'salesperson_users');

    const results = await db.select({
      id: sales.id,
      receiptNumber: sales.receiptNumber,
      totalAmount: sales.totalAmount,
      taxAmount: sales.taxAmount,
      discountAmount: sales.discountAmount,
      paymentType: sales.paymentType,
      status: sales.status,
      notes: sales.notes,
      createdAt: sales.createdAt,
      customerName: sql<string>`CONCAT(${customerUsers.firstName}, ' ', COALESCE(${customerUsers.lastName}, ''))`,
      salespersonName: sql<string>`CONCAT(${salespersonUsers.firstName}, ' ', COALESCE(${salespersonUsers.lastName}, ''))`
    }).from(sales)
      .leftJoin(customerUsers, eq(sales.customerId, customerUsers.id))
      .leftJoin(salespersonUsers, eq(sales.salespersonId, salespersonUsers.id))
      .orderBy(desc(sales.createdAt));
    res.json(results);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

salesRouter.post('/api/admin/sales', requireAdmin, async (req, res) => {
  try {
    const { customerId, paymentType, discountAmount, notes, items: saleProducts } = req.body;
    if (!saleProducts || !Array.isArray(saleProducts) || saleProducts.length === 0) {
      return res.status(400).json({ error: 'Sepet boş veya geçersiz ürün listesi' });
    }

    const salespersonId = (req as any).adminUser.userId;
    const receiptNumber = `POS-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    let calculatedTotal = 0;
    let calculatedTax = 0;

    for (const item of saleProducts) {
      const qty = parseInt(item.quantity) || 1;
      const price = parseFloat(item.unitPrice) || 0;
      const vatRate = parseInt(item.vatRate) || 20;
      const subtotal = price * qty;
      calculatedTotal += subtotal;
      calculatedTax += subtotal * (vatRate / (100 + vatRate));
    }

    const finalDiscount = parseFloat(discountAmount) || 0;
    const finalTotal = Math.max(0, calculatedTotal - finalDiscount);

    const saleId = await db.transaction(async (tx) => {
      const [insertedSale] = await tx.insert(sales).values({
        tenantId: 1,
        customerId: customerId ? parseInt(customerId) : null,
        salespersonId,
        receiptNumber,
        totalAmount: finalTotal.toFixed(2),
        taxAmount: calculatedTax.toFixed(2),
        discountAmount: finalDiscount.toFixed(2),
        paymentType,
        status: 'odendi',
        notes: notes || null,
      });
      const newSaleId = (insertedSale as any).insertId;

      for (const item of saleProducts) {
        const qty = parseInt(item.quantity) || 1;
        const price = parseFloat(item.unitPrice) || 0;
        const vatRate = parseInt(item.vatRate) || 20;
        const totalPrice = price * qty;

        await tx.insert(saleItems).values({
          tenantId: 1,
          saleId: newSaleId,
          stockItemId: parseInt(item.stockItemId),
          serializedItemId: item.serializedItemId ? parseInt(item.serializedItemId) : null,
          quantity: qty,
          unitPrice: price.toFixed(2),
          vatRate,
          totalPrice: totalPrice.toFixed(2),
        });

        await tx.update(stockItems)
          .set({ currentStock: sql`GREATEST(0, ${stockItems.currentStock} - ${qty})` })
          .where(eq(stockItems.id, parseInt(item.stockItemId)));

        await tx.insert(stockMovements).values({
          tenantId: 1,
          stockItemId: parseInt(item.stockItemId),
          serializedItemId: item.serializedItemId ? parseInt(item.serializedItemId) : null,
          fromWarehouseId: null,
          toWarehouseId: null,
          quantity: qty,
          type: 'cikis',
          reason: 'POS Satış',
          referenceId: newSaleId,
          createdById: salespersonId,
        });

        if (item.serializedItemId) {
          await tx.update(serializedItems).set({ status: 'satildi' }).where(eq(serializedItems.id, parseInt(item.serializedItemId)));
        }
      }
      return newSaleId;
    });

    res.json({ success: true, saleId, receiptNumber });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

salesRouter.get('/api/admin/sales/:id', requireAdmin, async (req, res) => {
  try {
    const saleId = parseInt(req.params.id);
    const customerUsers = alias(users, 'customer_users');
    const salespersonUsers = alias(users, 'salesperson_users');

    const [sale] = await db.select({
      id: sales.id,
      receiptNumber: sales.receiptNumber,
      totalAmount: sales.totalAmount,
      taxAmount: sales.taxAmount,
      discountAmount: sales.discountAmount,
      paymentType: sales.paymentType,
      status: sales.status,
      notes: sales.notes,
      createdAt: sales.createdAt,
      customerName: sql<string>`CONCAT(${customerUsers.firstName}, ' ', COALESCE(${customerUsers.lastName}, ''))`,
      customerPhone: customerUsers.phone,
      customerEmail: customerUsers.email,
      salespersonName: sql<string>`CONCAT(${salespersonUsers.firstName}, ' ', COALESCE(${salespersonUsers.lastName}, ''))`
    }).from(sales)
      .leftJoin(customerUsers, eq(sales.customerId, customerUsers.id))
      .leftJoin(salespersonUsers, eq(sales.salespersonId, salespersonUsers.id))
      .where(eq(sales.id, saleId))
      .limit(1);

    if (!sale) return res.status(404).json({ error: 'Satış kaydı bulunamadı' });

    const itemsList = await db.select({
      id: saleItems.id,
      quantity: saleItems.quantity,
      unitPrice: saleItems.unitPrice,
      vatRate: saleItems.vatRate,
      totalPrice: saleItems.totalPrice,
      productName: stockItems.name,
      sku: stockItems.sku,
      barcode: stockItems.barcode,
      serialNumber: serializedItems.serialNumber
    }).from(saleItems)
      .leftJoin(stockItems, eq(saleItems.stockItemId, stockItems.id))
      .leftJoin(serializedItems, eq(saleItems.serializedItemId, serializedItems.id))
      .where(eq(saleItems.saleId, saleId));

    res.json({ sale, items: itemsList });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
