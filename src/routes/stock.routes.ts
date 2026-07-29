import express from 'express';
import fs from 'fs';
import { eq, desc } from 'drizzle-orm';
import { db } from '../db/index';
import { stockItems, inventoryCategories } from '../db/schema';
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
      currentStock: stockItems.currentStock,
      minStockLevel: stockItems.minStockLevel,
      hasSerialTracking: stockItems.hasSerialTracking,
      warrantyMonths: stockItems.warrantyMonths,
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

stockRouter.post('/api/admin/stock', requireAdmin, async (req, res) => {
  try {
    const { sku, barcode, name, description, brand, model, unit, vatRate, imageUrl, costPrice, sellingPrice, currentStock, minStockLevel, categoryId, hasSerialTracking, warrantyMonths } = req.body;
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
      currentStock: parseInt(currentStock) || 0,
      minStockLevel: parseInt(minStockLevel) || 5,
      hasSerialTracking: hasSerialTracking === true || hasSerialTracking === 'true',
      warrantyMonths: parseInt(warrantyMonths) || 0,
      categoryId: categoryId ? parseInt(categoryId) : null,
    });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

stockRouter.patch('/api/admin/stock/:id', requireAdmin, async (req, res) => {
  try {
    const { adjustment, name, description, brand, model, unit, vatRate, imageUrl, categoryId, minStockLevel, sellingPrice, costPrice, barcode, isActive, hasSerialTracking, warrantyMonths } = req.body;
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
    if (barcode !== undefined) updateData.barcode = barcode;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (hasSerialTracking !== undefined) updateData.hasSerialTracking = hasSerialTracking === true || hasSerialTracking === 'true';
    if (warrantyMonths !== undefined) updateData.warrantyMonths = parseInt(warrantyMonths) || 0;
    
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
