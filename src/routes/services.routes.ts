import express from 'express';
import { eq, asc } from 'drizzle-orm';
import { db } from '../db/index';
import { services, serviceCategories } from '../db/schema';
import { requireAdmin } from '../server/middleware';
import { nullableDecimal, nullableInt } from '../server/utils';

export const servicesRouter = express.Router();

servicesRouter.get('/api/admin/services', requireAdmin, async (req, res) => {
  try {
    const all = await db.select().from(services);
    res.json(all);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

servicesRouter.post('/api/admin/services', requireAdmin, async (req, res) => {
  try {
    const { name, description, basePrice, categoryId, imageUrl, isActive } = req.body;
    await db.insert(services).values({
      tenantId: 1,
      name,
      description,
      basePrice: nullableDecimal(basePrice),
      categoryId: nullableInt(categoryId),
      imageUrl: imageUrl || null,
      isActive: isActive !== false,
    });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

servicesRouter.put('/api/admin/services/:id', requireAdmin, async (req, res) => {
  try {
    const { name, description, basePrice, categoryId, imageUrl, isActive } = req.body;
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (basePrice !== undefined) updateData.basePrice = nullableDecimal(basePrice);
    if (categoryId !== undefined) updateData.categoryId = nullableInt(categoryId);
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl || null;
    if (isActive !== undefined) updateData.isActive = isActive;
    await db.update(services).set(updateData).where(eq(services.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

servicesRouter.delete('/api/admin/services/:id', requireAdmin, async (req, res) => {
  try {
    await db.update(services).set({ isActive: false }).where(eq(services.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

servicesRouter.get('/api/admin/service-categories', requireAdmin, async (req, res) => {
  try {
    const all = await db.select().from(serviceCategories).orderBy(asc(serviceCategories.displayOrder));
    res.json(all);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

servicesRouter.post('/api/admin/service-categories', requireAdmin, async (req, res) => {
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

servicesRouter.put('/api/admin/service-categories/:id', requireAdmin, async (req, res) => {
  try {
    await db.update(serviceCategories).set(req.body).where(eq(serviceCategories.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

servicesRouter.delete('/api/admin/service-categories/:id', requireAdmin, async (req, res) => {
  try {
    await db.update(serviceCategories).set({ isActive: false }).where(eq(serviceCategories.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

servicesRouter.get('/api/public/service-categories', async (req, res) => {
  try {
    const all = await db.select().from(serviceCategories).where(eq(serviceCategories.isActive, true)).orderBy(asc(serviceCategories.displayOrder));
    res.json(all);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
