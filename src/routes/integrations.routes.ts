import express from 'express';
import crypto from 'crypto';
import { eq, desc, asc } from 'drizzle-orm';
import { db } from '../db/index';
import { apiKeys, menus, menuItems } from '../db/schema';
import { requireAdmin } from '../server/middleware';

export const integrationsRouter = express.Router();

// API KEYS
integrationsRouter.get('/api/admin/apikeys', requireAdmin, async (req, res) => {
  try {
    const keys = await db.select().from(apiKeys).orderBy(desc(apiKeys.createdAt));
    res.json(keys);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

integrationsRouter.post('/api/admin/apikeys', requireAdmin, async (req, res) => {
  try {
    const { name } = req.body;
    const rawKey = crypto.randomBytes(32).toString('hex');
    const prefix = 'kb_';
    const fullKey = prefix + rawKey;
    const keyHash = crypto.createHash('sha256').update(fullKey).digest('hex');

    await db.insert(apiKeys).values({
      tenantId: 1,
      name,
      prefix,
      keyHash
    });
    res.json({ success: true, apiKey: fullKey });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

integrationsRouter.delete('/api/admin/apikeys/:id', requireAdmin, async (req, res) => {
  try {
    await db.delete(apiKeys).where(eq(apiKeys.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// MENUS
integrationsRouter.get('/api/admin/menus', requireAdmin, async (req, res) => {
  try {
    const allMenus = await db.select().from(menus).where(eq(menus.tenantId, 1));
    const allItems = await db.select().from(menuItems).where(eq(menuItems.tenantId, 1)).orderBy(asc(menuItems.displayOrder));
    
    const result = allMenus.map(m => ({
      ...m,
      items: allItems.filter(i => i.menuId === m.id)
    }));
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

integrationsRouter.post('/api/admin/menus', requireAdmin, async (req, res) => {
  try {
    const { name, location } = req.body;
    await db.insert(menus).values({ tenantId: 1, name, location });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

integrationsRouter.put('/api/admin/menus/:id', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, location } = req.body;
    await db.update(menus).set({ name, location }).where(eq(menus.id, id));
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

integrationsRouter.delete('/api/admin/menus/:id', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(menuItems).where(eq(menuItems.menuId, id));
    await db.delete(menus).where(eq(menus.id, id));
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

integrationsRouter.post('/api/admin/menus/:id/items', requireAdmin, async (req, res) => {
  try {
    const { title, url, target, parentId, displayOrder, megaMenu } = req.body;
    await db.insert(menuItems).values({
      tenantId: 1,
      menuId: parseInt(req.params.id),
      title, url, target: target || '_self', parentId, displayOrder: displayOrder || 0,
      megaMenu: megaMenu || null
    });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

integrationsRouter.put('/api/admin/menus/items/:itemId', requireAdmin, async (req, res) => {
  try {
    const { title, url, target, parentId, megaMenu } = req.body;
    await db.update(menuItems)
      .set({ title, url, target, parentId, megaMenu: megaMenu || null })
      .where(eq(menuItems.id, parseInt(req.params.itemId)));
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

integrationsRouter.delete('/api/admin/menus/items/:itemId', requireAdmin, async (req, res) => {
  try {
    await db.delete(menuItems).where(eq(menuItems.id, parseInt(req.params.itemId)));
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

integrationsRouter.put('/api/admin/menus/items/reorder', requireAdmin, async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) return res.status(400).json({ error: 'Invalid payload' });
    
    for (const item of items) {
      await db.update(menuItems)
        .set({ displayOrder: item.displayOrder })
        .where(eq(menuItems.id, item.id));
    }
    
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
