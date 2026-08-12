import express from 'express';
import fs from 'fs';
import { eq, desc, or, and } from 'drizzle-orm';
import { db } from '../db/index';
import { stockItems, inventoryCategories, stockMovements, stockCountSessions, stockCountLines, stockChannelMappings, quickSaleGroups } from '../db/schema';
import { requireAdmin } from '../server/middleware';
import { upload } from '../server/helpers';

export const stockRouter = express.Router();

function generateEAN13Backend(): string {
  let code12 = '200';
  for (let i = 0; i < 9; i++) {
    code12 += Math.floor(Math.random() * 10);
  }
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const d = parseInt(code12[i], 10);
    sum += d * (i % 2 === 0 ? 1 : 3);
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return code12 + checkDigit;
}

stockRouter.get('/api/admin/stock', requireAdmin, async (req, res) => {
  try {
    const items = await db.select({
      id: stockItems.id,
      sku: stockItems.sku,
      barcode: stockItems.barcode,
      name: stockItems.name,
      description: stockItems.description,
      brand: stockItems.brand,
      model: stockItems.model,
      unit: stockItems.unit,
      vatRate: stockItems.vatRate,
      imageUrl: stockItems.imageUrl,
      costPrice: stockItems.costPrice,
      sellingPrice: stockItems.sellingPrice,
      costPriceExclVat: stockItems.costPriceExclVat,
      wholesalePrice: stockItems.wholesalePrice,
      currency: stockItems.currency,
      gtipCode: stockItems.gtipCode,
      accountingCode: stockItems.accountingCode,
      landedCost: stockItems.landedCost,
      currentStock: stockItems.currentStock,
      minStockLevel: stockItems.minStockLevel,
      hasSerialTracking: stockItems.hasSerialTracking,
      warrantyMonths: stockItems.warrantyMonths,
      supplier: stockItems.supplier,
      isActive: stockItems.isActive,
      isQuickSale: stockItems.isQuickSale,
      quickSaleGroupId: stockItems.quickSaleGroupId,
      quickSaleSortOrder: stockItems.quickSaleSortOrder,
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

stockRouter.post('/api/admin/stock', requireAdmin, async (req, res) => {
  try {
    const { sku, barcode, name, description, brand, model, unit, vatRate, imageUrl, costPrice, sellingPrice, currentStock, minStockLevel, categoryId, hasSerialTracking, warrantyMonths, supplier, isQuickSale, costPriceExclVat, wholesalePrice, currency, gtipCode, accountingCode, landedCost } = req.body;
    const finalBarcode = barcode && barcode.trim() !== '' ? barcode.trim() : generateEAN13Backend();

    await db.insert(stockItems).values({
      tenantId: 1,
      sku: sku || `SKU-${Date.now()}`,
      barcode: finalBarcode,
      name,
      description: description || null,
      brand: brand || null,
      model: model || null,
      unit: unit || 'adet',
      vatRate: parseInt(vatRate) || 20,
      imageUrl: imageUrl || null,
      costPrice: costPrice?.toString() || '0.00',
      sellingPrice: sellingPrice?.toString() || '0.00',
      costPriceExclVat: costPriceExclVat ? costPriceExclVat.toString() : null,
      wholesalePrice: wholesalePrice ? wholesalePrice.toString() : null,
      currency: currency || 'TRY',
      gtipCode: gtipCode || null,
      accountingCode: accountingCode || null,
      landedCost: landedCost ? landedCost.toString() : null,
      currentStock: parseInt(currentStock) || 0,
      minStockLevel: parseInt(minStockLevel) || 5,
      hasSerialTracking: hasSerialTracking === true || hasSerialTracking === 'true',
      warrantyMonths: parseInt(warrantyMonths) || 0,
      supplier: supplier || null,
      isQuickSale: isQuickSale === true || isQuickSale === 'true',
      quickSaleGroupId: req.body.quickSaleGroupId ? parseInt(req.body.quickSaleGroupId) : null,
      quickSaleSortOrder: parseInt(req.body.quickSaleSortOrder) || 0,
      categoryId: categoryId ? parseInt(categoryId) : null,
    });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

stockRouter.patch('/api/admin/stock/:id', requireAdmin, async (req, res) => {
  try {
    const { adjustment, name, description, brand, model, unit, vatRate, imageUrl, categoryId, minStockLevel, sellingPrice, costPrice, barcode, isActive, hasSerialTracking, warrantyMonths, supplier, isQuickSale, costPriceExclVat, wholesalePrice, currency, gtipCode, accountingCode, landedCost } = req.body;
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (brand !== undefined) updateData.brand = brand;
    if (model !== undefined) updateData.model = model;
    if (unit !== undefined) updateData.unit = unit;
    if (vatRate !== undefined) updateData.vatRate = parseInt(vatRate);
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (categoryId !== undefined) updateData.categoryId = categoryId ? parseInt(categoryId) : null;
    if (minStockLevel !== undefined) updateData.minStockLevel = parseInt(minStockLevel);
    if (sellingPrice !== undefined) updateData.sellingPrice = sellingPrice.toString();
    if (costPrice !== undefined) updateData.costPrice = costPrice.toString();
    if (costPriceExclVat !== undefined) updateData.costPriceExclVat = costPriceExclVat ? costPriceExclVat.toString() : null;
    if (wholesalePrice !== undefined) updateData.wholesalePrice = wholesalePrice ? wholesalePrice.toString() : null;
    if (currency !== undefined) updateData.currency = currency;
    if (gtipCode !== undefined) updateData.gtipCode = gtipCode;
    if (accountingCode !== undefined) updateData.accountingCode = accountingCode;
    if (landedCost !== undefined) updateData.landedCost = landedCost ? landedCost.toString() : null;
    if (barcode !== undefined) updateData.barcode = barcode;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (hasSerialTracking !== undefined) updateData.hasSerialTracking = hasSerialTracking === true || hasSerialTracking === 'true';
    if (warrantyMonths !== undefined) updateData.warrantyMonths = parseInt(warrantyMonths) || 0;
    if (supplier !== undefined) updateData.supplier = supplier;
    if (isQuickSale !== undefined) updateData.isQuickSale = isQuickSale === true || isQuickSale === 'true';
    if (req.body.quickSaleGroupId !== undefined) updateData.quickSaleGroupId = req.body.quickSaleGroupId ? parseInt(req.body.quickSaleGroupId) : null;
    if (req.body.quickSaleSortOrder !== undefined) updateData.quickSaleSortOrder = parseInt(req.body.quickSaleSortOrder) || 0;

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

stockRouter.delete('/api/admin/stock/:id', requireAdmin, async (req, res) => {
  try {
    // Soft delete: ticketParts/saleItems/stockMovements bu kayda referans veriyor olabilir
    await db.update(stockItems).set({ isActive: false }).where(eq(stockItems.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

stockRouter.post('/api/admin/stock/import-csv', requireAdmin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Dosya yüklenemedi' });
    const csvData = fs.readFileSync(req.file.path, 'utf8');
    const Papa = await import('papaparse').then(m => (m as any).default || m);
    const parsed = Papa.parse(csvData, { header: true, skipEmptyLines: true });
    
    let imported = 0;
    let updated = 0;

    for (const row of parsed.data as any[]) {
      const { name, sku, barcode, brand, model, unit, vatRate, costPrice, sellingPrice, currentStock, minStockLevel, description, imageUrl, category } = row;
      if (!name) continue;

      let catId = null;
      if (category) {
        const [existingCat] = await db.select({ id: inventoryCategories.id }).from(inventoryCategories).where(eq(inventoryCategories.name, category)).limit(1);
        if (existingCat) {
          catId = existingCat.id;
        } else {
          await db.insert(inventoryCategories).values({ tenantId: 1, name: category });
          const [insertedCat] = await db.select({ id: inventoryCategories.id }).from(inventoryCategories).where(eq(inventoryCategories.name, category)).limit(1);
          catId = insertedCat?.id || null;
        }
      }

      const matchedSku = sku ? await db.select().from(stockItems).where(eq(stockItems.sku, sku)).limit(1) : [];
      if (matchedSku.length > 0) {
        const updateObj: any = {};
        if (name) updateObj.name = name;
        if (barcode) updateObj.barcode = barcode;
        if (brand !== undefined) updateObj.brand = brand;
        if (model !== undefined) updateObj.model = model;
        if (unit) updateObj.unit = unit;
        if (vatRate) updateObj.vatRate = parseInt(vatRate);
        if (costPrice) updateObj.costPrice = costPrice;
        if (sellingPrice) updateObj.sellingPrice = sellingPrice;
        if (currentStock) updateObj.currentStock = parseInt(currentStock);
        if (minStockLevel) updateObj.minStockLevel = parseInt(minStockLevel);
        if (description !== undefined) updateObj.description = description;
        if (imageUrl !== undefined) updateObj.imageUrl = imageUrl;
        if (catId) updateObj.categoryId = catId;

        await db.update(stockItems).set(updateObj).where(eq(stockItems.id, matchedSku[0].id));
        updated++;
      } else {
        await db.insert(stockItems).values({
          tenantId: 1,
          sku: sku || `SKU-${Date.now()}-${Math.floor(Math.random()*1000)}`,
          barcode: barcode || `869${Math.floor(Math.random() * 10000000000)}`,
          name,
          brand: brand || null,
          model: model || null,
          unit: unit || 'adet',
          vatRate: parseInt(vatRate) || 20,
          costPrice: costPrice || '0.00',
          sellingPrice: sellingPrice || '0.00',
          currentStock: parseInt(currentStock) || 0,
          minStockLevel: parseInt(minStockLevel) || 5,
          description: description || null,
          imageUrl: imageUrl || null,
          categoryId: catId,
        });
        imported++;
      }
    }

    fs.unlinkSync(req.file.path);
    res.json({ success: true, imported, updated });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

stockRouter.get('/api/admin/stock/export-excel', requireAdmin, async (req, res) => {
  try {
    const items = await db.select({
      id: stockItems.id,
      sku: stockItems.sku,
      barcode: stockItems.barcode,
      name: stockItems.name,
      brand: stockItems.brand,
      model: stockItems.model,
      unit: stockItems.unit,
      vatRate: stockItems.vatRate,
      costPrice: stockItems.costPrice,
      sellingPrice: stockItems.sellingPrice,
      currentStock: stockItems.currentStock,
      minStockLevel: stockItems.minStockLevel,
      description: stockItems.description,
      imageUrl: stockItems.imageUrl,
      categoryName: inventoryCategories.name,
    }).from(stockItems)
      .leftJoin(inventoryCategories, eq(stockItems.categoryId, inventoryCategories.id))
      .where(eq(stockItems.isActive, true))
      .orderBy(desc(stockItems.createdAt));

    const ExcelJS = await import('exceljs').then(m => (m as any).default || m);
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Stok Listesi');

    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Ürün Kodu (SKU)', key: 'sku', width: 20 },
      { header: 'Barkod', key: 'barcode', width: 20 },
      { header: 'Ürün Adı', key: 'name', width: 35 },
      { header: 'Marka', key: 'brand', width: 15 },
      { header: 'Model', key: 'model', width: 15 },
      { header: 'Kategori', key: 'categoryName', width: 20 },
      { header: 'Birim', key: 'unit', width: 10 },
      { header: 'KDV Oranı (%)', key: 'vatRate', width: 15 },
      { header: 'Maliyet Fiyatı', key: 'costPrice', width: 15 },
      { header: 'Satış Fiyatı', key: 'sellingPrice', width: 15 },
      { header: 'Mevcut Stok', key: 'currentStock', width: 15 },
      { header: 'Kritik Stok Sınırı', key: 'minStockLevel', width: 15 },
      { header: 'Açıklama', key: 'description', width: 30 },
    ];

    items.forEach(item => {
      worksheet.addRow({
        ...item,
        costPrice: item.costPrice ? parseFloat(item.costPrice) : 0,
        sellingPrice: item.sellingPrice ? parseFloat(item.sellingPrice) : 0,
      });
    });

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=stok_listesi.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (e: any) {
    console.error(e);
    if (!res.headersSent) {
      res.status(500).json({ error: e.message });
    }
  }
});

// INVENTORY CATEGORIES
stockRouter.get('/api/admin/inventory-categories', requireAdmin, async (req, res) => {
  try {
    const cats = await db.select().from(inventoryCategories);
    res.json(cats);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

stockRouter.post('/api/admin/inventory-categories', requireAdmin, async (req, res) => {
  try {
    const { name, description, parentId } = req.body;
    await db.insert(inventoryCategories).values({
      tenantId: 1,
      name,
      description,
      parentId: parentId ? parseInt(parentId) : null,
    });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

stockRouter.patch('/api/admin/inventory-categories/:id', requireAdmin, async (req, res) => {
  try {
    const { name, description, parentId } = req.body;
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (parentId !== undefined) updateData.parentId = parentId ? parseInt(parentId) : null;
    await db.update(inventoryCategories).set(updateData).where(eq(inventoryCategories.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

stockRouter.delete('/api/admin/inventory-categories/:id', requireAdmin, async (req, res) => {
  try {
    await db.delete(inventoryCategories).where(eq(inventoryCategories.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// SAYIM (STOCKTAKE)

stockRouter.post('/api/admin/stock/count-sessions', requireAdmin, async (req, res) => {
  try {
    const { categoryId } = req.body;
    const [openSession] = await db.select({ id: stockCountSessions.id }).from(stockCountSessions).where(eq(stockCountSessions.status, 'acik')).limit(1);
    if (openSession) {
      return res.status(409).json({ error: 'Zaten açık bir sayım oturumu var. Önce onu tamamlayın veya iptal edin.' });
    }
    const adminUser = (req as any).adminUser;
    const result = await db.insert(stockCountSessions).values({
      tenantId: 1,
      categoryId: categoryId ? parseInt(categoryId) : null,
      status: 'acik',
      startedById: adminUser?.userId || null,
    });
    const insertId = (result as any)[0]?.insertId;
    const [session] = await db.select().from(stockCountSessions).where(eq(stockCountSessions.id, insertId));
    res.json(session);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

stockRouter.get('/api/admin/stock/count-sessions', requireAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    const sessions = await db.select({
      id: stockCountSessions.id,
      categoryId: stockCountSessions.categoryId,
      categoryName: inventoryCategories.name,
      status: stockCountSessions.status,
      startedAt: stockCountSessions.startedAt,
      finalizedAt: stockCountSessions.finalizedAt,
      notes: stockCountSessions.notes,
    }).from(stockCountSessions)
      .leftJoin(inventoryCategories, eq(stockCountSessions.categoryId, inventoryCategories.id))
      .where(status ? eq(stockCountSessions.status, status as any) : undefined)
      .orderBy(desc(stockCountSessions.startedAt));
    res.json(sessions);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

stockRouter.get('/api/admin/stock/count-sessions/:id', requireAdmin, async (req, res) => {
  try {
    const sessionId = parseInt(req.params.id);
    const [session] = await db.select().from(stockCountSessions).where(eq(stockCountSessions.id, sessionId));
    if (!session) return res.status(404).json({ error: 'Sayım oturumu bulunamadı' });

    const lines = await db.select({
      id: stockCountLines.id,
      stockItemId: stockCountLines.stockItemId,
      sku: stockItems.sku,
      barcode: stockItems.barcode,
      name: stockItems.name,
      expectedQty: stockCountLines.expectedQty,
      countedQty: stockCountLines.countedQty,
      scanCount: stockCountLines.scanCount,
      lastScannedAt: stockCountLines.lastScannedAt,
    }).from(stockCountLines)
      .innerJoin(stockItems, eq(stockCountLines.stockItemId, stockItems.id))
      .where(eq(stockCountLines.sessionId, sessionId))
      .orderBy(desc(stockCountLines.lastScannedAt));

    res.json({ session, lines });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

stockRouter.post('/api/admin/stock/count-sessions/:id/scan', requireAdmin, async (req, res) => {
  try {
    const sessionId = parseInt(req.params.id);
    const { code } = req.body;
    if (!code || !code.trim()) return res.status(400).json({ error: 'Barkod/SKU gerekli' });
    const trimmedCode = code.trim();

    const [session] = await db.select().from(stockCountSessions).where(eq(stockCountSessions.id, sessionId));
    if (!session) return res.status(404).json({ error: 'Sayım oturumu bulunamadı' });
    if (session.status !== 'acik') return res.status(400).json({ error: 'Bu oturum artık açık değil' });

    const matches = await db.select().from(stockItems)
      .where(or(eq(stockItems.barcode, trimmedCode), eq(stockItems.sku, trimmedCode)))
      .limit(2);
    if (matches.length === 0) return res.status(404).json({ error: 'Barkod/SKU bulunamadı' });
    if (matches.length > 1) return res.status(409).json({ error: 'Birden fazla ürün eşleşti, lütfen manuel seçin' });

    const item = matches[0];
    const [existingLine] = await db.select().from(stockCountLines)
      .where(and(eq(stockCountLines.sessionId, sessionId), eq(stockCountLines.stockItemId, item.id)))
      .limit(1);

    if (existingLine) {
      await db.update(stockCountLines).set({
        countedQty: existingLine.countedQty + 1,
        scanCount: existingLine.scanCount + 1,
        lastScannedAt: new Date(),
      }).where(eq(stockCountLines.id, existingLine.id));
    } else {
      await db.insert(stockCountLines).values({
        sessionId,
        stockItemId: item.id,
        expectedQty: item.currentStock || 0,
        countedQty: 1,
        scanCount: 1,
        lastScannedAt: new Date(),
      });
    }

    const [line] = await db.select({
      id: stockCountLines.id,
      stockItemId: stockCountLines.stockItemId,
      sku: stockItems.sku,
      barcode: stockItems.barcode,
      name: stockItems.name,
      expectedQty: stockCountLines.expectedQty,
      countedQty: stockCountLines.countedQty,
      scanCount: stockCountLines.scanCount,
      lastScannedAt: stockCountLines.lastScannedAt,
    }).from(stockCountLines)
      .innerJoin(stockItems, eq(stockCountLines.stockItemId, stockItems.id))
      .where(and(eq(stockCountLines.sessionId, sessionId), eq(stockCountLines.stockItemId, item.id)));

    res.json({ line });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

stockRouter.patch('/api/admin/stock/count-sessions/:id/lines/:lineId', requireAdmin, async (req, res) => {
  try {
    const sessionId = parseInt(req.params.id);
    const { countedQty } = req.body;
    const [session] = await db.select().from(stockCountSessions).where(eq(stockCountSessions.id, sessionId));
    if (!session) return res.status(404).json({ error: 'Sayım oturumu bulunamadı' });
    if (session.status !== 'acik') return res.status(400).json({ error: 'Bu oturum artık açık değil' });

    await db.update(stockCountLines).set({ countedQty: parseInt(countedQty) || 0 })
      .where(and(eq(stockCountLines.id, parseInt(req.params.lineId)), eq(stockCountLines.sessionId, sessionId)));
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

stockRouter.post('/api/admin/stock/count-sessions/:id/finalize', requireAdmin, async (req, res) => {
  try {
    const sessionId = parseInt(req.params.id);
    const { notes } = req.body;
    const adminUser = (req as any).adminUser;

    const [session] = await db.select().from(stockCountSessions).where(eq(stockCountSessions.id, sessionId));
    if (!session) return res.status(404).json({ error: 'Sayım oturumu bulunamadı' });
    if (session.status !== 'acik') return res.status(400).json({ error: 'Bu oturum artık açık değil' });

    const lines = await db.select().from(stockCountLines).where(eq(stockCountLines.sessionId, sessionId));
    let varianceCount = 0;

    await db.transaction(async (tx) => {
      for (const line of lines) {
        const delta = line.countedQty - line.expectedQty;
        if (delta !== 0) {
          varianceCount++;
          await tx.insert(stockMovements).values({
            tenantId: 1,
            stockItemId: line.stockItemId,
            quantity: delta,
            type: 'sayim',
            reason: 'Sayım farkı',
            referenceId: sessionId,
            createdById: adminUser?.userId || null,
          });
          await tx.update(stockItems).set({ currentStock: line.countedQty }).where(eq(stockItems.id, line.stockItemId));
        }
      }
      await tx.update(stockCountSessions).set({
        status: 'tamamlandi',
        finalizedById: adminUser?.userId || null,
        finalizedAt: new Date(),
        notes: notes || session.notes,
      }).where(eq(stockCountSessions.id, sessionId));
    });

    res.json({ success: true, varianceCount });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

stockRouter.post('/api/admin/stock/count-sessions/:id/cancel', requireAdmin, async (req, res) => {
  try {
    const sessionId = parseInt(req.params.id);
    await db.update(stockCountSessions).set({ status: 'iptal' }).where(eq(stockCountSessions.id, sessionId));
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// E-TİCARET KANAL EŞLEME

stockRouter.get('/api/admin/stock/:stockItemId/channel-mappings', requireAdmin, async (req, res) => {
  try {
    const mappings = await db.select().from(stockChannelMappings)
      .where(eq(stockChannelMappings.stockItemId, parseInt(req.params.stockItemId)));
    res.json(mappings);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

stockRouter.post('/api/admin/stock/:stockItemId/channel-mappings', requireAdmin, async (req, res) => {
  try {
    const stockItemId = parseInt(req.params.stockItemId);
    const { channel, externalProductId, externalSku, notes } = req.body;

    const [existing] = await db.select().from(stockChannelMappings)
      .where(and(eq(stockChannelMappings.stockItemId, stockItemId), eq(stockChannelMappings.channel, channel)))
      .limit(1);

    if (existing) {
      await db.update(stockChannelMappings).set({
        externalProductId: externalProductId || null,
        externalSku: externalSku || null,
        notes: notes || null,
      }).where(eq(stockChannelMappings.id, existing.id));
    } else {
      await db.insert(stockChannelMappings).values({
        tenantId: 1,
        stockItemId,
        channel,
        externalProductId: externalProductId || null,
        externalSku: externalSku || null,
        notes: notes || null,
      });
    }
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

stockRouter.patch('/api/admin/stock/channel-mappings/:id', requireAdmin, async (req, res) => {
  try {
    const { externalProductId, externalSku, syncStatus, notes } = req.body;
    const updateData: any = {};
    if (externalProductId !== undefined) updateData.externalProductId = externalProductId;
    if (externalSku !== undefined) updateData.externalSku = externalSku;
    if (syncStatus !== undefined) updateData.syncStatus = syncStatus;
    if (notes !== undefined) updateData.notes = notes;
    await db.update(stockChannelMappings).set(updateData).where(eq(stockChannelMappings.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

stockRouter.delete('/api/admin/stock/channel-mappings/:id', requireAdmin, async (req, res) => {
  try {
    await db.delete(stockChannelMappings).where(eq(stockChannelMappings.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Depo Transferi ve Stok Hareketleri ─────────────────────────────────────

stockRouter.get('/api/admin/stock/movements', requireAdmin, async (_req, res) => {
  try {
    const rows = await db.select({
      id: stockMovements.id,
      stockItemId: stockMovements.stockItemId,
      stockItemName: stockItems.name,
      quantity: stockMovements.quantity,
      type: stockMovements.type,
      reason: stockMovements.reason,
      createdAt: stockMovements.createdAt,
    })
    .from(stockMovements)
    .leftJoin(stockItems, eq(stockMovements.stockItemId, stockItems.id))
    .orderBy(desc(stockMovements.createdAt))
    .limit(100);

    res.json(rows);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

stockRouter.post('/api/admin/stock/transfer', requireAdmin, async (req, res) => {
  try {
    const { stockItemId, fromWarehouse, toWarehouse, quantity, reason } = req.body;
    if (!stockItemId || !quantity || parseInt(quantity) <= 0) {
      return res.status(400).json({ error: 'Geçersiz ürün veya miktar' });
    }

    const adminUser = (req as any).adminUser;
    const qty = parseInt(quantity);

    await db.insert(stockMovements).values({
      tenantId: 1,
      stockItemId: parseInt(stockItemId),
      quantity: qty,
      type: 'transfer',
      reason: `${fromWarehouse} -> ${toWarehouse}: ${reason || 'Depo Transferi'}`,
      createdById: adminUser?.userId || null,
    });

    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Hızlı Satış Grupları (Quick Sale Groups) ────────────────────────────────

stockRouter.get('/api/admin/quick-sale-groups', requireAdmin, async (_req, res) => {
  try {
    const groups = await db.select().from(quickSaleGroups).orderBy(quickSaleGroups.sortOrder);
    res.json(groups);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

stockRouter.post('/api/admin/quick-sale-groups', requireAdmin, async (req, res) => {
  try {
    const { name, color, icon } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Grup adı zorunludur' });
    const maxSort = await db.select({ max: quickSaleGroups.sortOrder }).from(quickSaleGroups).limit(1);
    const nextSort = ((maxSort[0]?.max as number) || 0) + 1;
    await db.insert(quickSaleGroups).values({
      tenantId: 1,
      name: name.trim(),
      color: color || '#f59e0b',
      icon: icon || null,
      sortOrder: nextSort,
    });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

stockRouter.patch('/api/admin/quick-sale-groups/:id', requireAdmin, async (req, res) => {
  try {
    const { name, color, icon, sortOrder } = req.body;
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (color !== undefined) updateData.color = color;
    if (icon !== undefined) updateData.icon = icon;
    if (sortOrder !== undefined) updateData.sortOrder = parseInt(sortOrder);
    await db.update(quickSaleGroups).set(updateData).where(eq(quickSaleGroups.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

stockRouter.delete('/api/admin/quick-sale-groups/:id', requireAdmin, async (req, res) => {
  try {
    const groupId = parseInt(req.params.id);
    // Gruptaki ürünlerin gruptan çıkar
    await db.update(stockItems).set({ quickSaleGroupId: null }).where(eq(stockItems.quickSaleGroupId, groupId));
    await db.delete(quickSaleGroups).where(eq(quickSaleGroups.id, groupId));
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Toplu sıralama güncelleme (drag & drop sonrası)
stockRouter.patch('/api/admin/quick-sale-sort', requireAdmin, async (req, res) => {
  try {
    const { items } = req.body; // [{id, quickSaleSortOrder, quickSaleGroupId?}]
    if (!Array.isArray(items)) return res.status(400).json({ error: 'Geçersiz veri' });
    for (const item of items) {
      const updateData: any = { quickSaleSortOrder: parseInt(item.quickSaleSortOrder) || 0 };
      if (item.quickSaleGroupId !== undefined) {
        updateData.quickSaleGroupId = item.quickSaleGroupId ? parseInt(item.quickSaleGroupId) : null;
      }
      await db.update(stockItems).set(updateData).where(eq(stockItems.id, parseInt(item.id)));
    }
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
