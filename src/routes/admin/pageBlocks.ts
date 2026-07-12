/**
 * src/routes/admin/pageBlocks.ts
 * Sayfa blok yonetimi (Layout Builder) admin API route'lari.
 * Bagimsiz moduler route dosyasi - server.ts'den ayrildi.
 *
 * Baglanmak icin server.ts startServer() fonksiyonu icinde:
 *   import { registerPageBlockRoutes } from "./src/routes/admin/pageBlocks";
 *   registerPageBlockRoutes(app, { db, pageBlocks, requireAdmin, eq, asc, and });
 */

import type { Express } from "express";
import type { RouteDeps } from "../index";

export function registerPageBlockRoutes(app: Express, deps: RouteDeps): void {
  const { db, pageBlocks, requireAdmin, eq, asc, and } = deps;

  // GET /api/admin/page-blocks/:ownerType/:ownerId
  app.get("/api/admin/page-blocks/:ownerType/:ownerId", requireAdmin, async (req, res) => {
    try {
      const { ownerType, ownerId } = req.params;
      const rows = await db.select().from(pageBlocks)
        .where(and(eq(pageBlocks.ownerType, ownerType as any), eq(pageBlocks.ownerId, Number(ownerId))))
        .orderBy(asc(pageBlocks.sortOrder));
      res.json(rows);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // POST /api/admin/page-blocks/:ownerType/:ownerId
  app.post("/api/admin/page-blocks/:ownerType/:ownerId", requireAdmin, async (req, res) => {
    try {
      const { ownerType, ownerId } = req.params;
      const { elementKey, props = {}, region = "main", sortOrder = 0, isVisible = true } = req.body;
      if (!elementKey) return res.status(400).json({ error: "elementKey zorunludur" });
      const [inserted] = await db.insert(pageBlocks).values({
        tenantId: 1, ownerType: ownerType as any, ownerId: Number(ownerId),
        elementKey, props, region, sortOrder, isVisible,
      });
      res.json({ id: (inserted as any).insertId, success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // PUT /api/admin/page-blocks/:id
  app.put("/api/admin/page-blocks/:id", requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { props, region, sortOrder, isVisible, visibilityRule, responsiveOverrides } = req.body;
      await db.update(pageBlocks).set({
        ...(props !== undefined && { props }),
        ...(region !== undefined && { region }),
        ...(sortOrder !== undefined && { sortOrder }),
        ...(isVisible !== undefined && { isVisible }),
        ...(visibilityRule !== undefined && { visibilityRule }),
        ...(responsiveOverrides !== undefined && { responsiveOverrides }),
      }).where(eq(pageBlocks.id, id));
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // DELETE /api/admin/page-blocks/:id
  app.delete("/api/admin/page-blocks/:id", requireAdmin, async (req, res) => {
    try {
      await db.delete(pageBlocks).where(eq(pageBlocks.id, Number(req.params.id)));
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // POST /api/admin/page-blocks/reorder — toplu siralamay guncelle
  app.post("/api/admin/page-blocks/reorder", requireAdmin, async (req, res) => {
    try {
      const { blocks } = req.body;
      if (!Array.isArray(blocks)) return res.status(400).json({ error: "blocks array zorunludur" });
      for (const b of blocks) {
        await db.update(pageBlocks).set({ sortOrder: b.sortOrder }).where(eq(pageBlocks.id, b.id));
      }
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
}
