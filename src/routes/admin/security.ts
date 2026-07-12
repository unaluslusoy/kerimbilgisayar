/**
 * src/routes/admin/security.ts
 * Kalici IP engelleme yonetimi admin API route'lari.
 * Bagimsiz moduler route dosyasi - server.ts'den ayrildi.
 *
 * Baglanmak icin server.ts startServer() fonksiyonu icinde:
 *   import { registerIpBlockRoutes } from "./src/routes/admin/security";
 *   registerIpBlockRoutes(app, { db, blockedIps, requireAdmin, eq, desc, autoBlockedIps });
 */

import type { Express } from "express";
import type { RouteDeps } from "../index";

export function registerIpBlockRoutes(app: Express, deps: RouteDeps): void {
  const { db, blockedIps, requireAdmin, eq, desc, autoBlockedIps } = deps;

  // GET /api/admin/blocked-ips — tum kalici IP engellerini listele
  app.get("/api/admin/blocked-ips", requireAdmin, async (_req, res) => {
    try {
      const rows = await db.select().from(blockedIps).orderBy(desc(blockedIps.createdAt));
      res.json(rows);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // POST /api/admin/blocked-ips — el ile IP engelle
  app.post("/api/admin/blocked-ips", requireAdmin, async (req, res) => {
    try {
      const { ipAddress, reason, durationDays } = req.body;
      if (!ipAddress) return res.status(400).json({ error: "IP adresi zorunludur" });
      const days = Number(durationDays) || 3650;
      const blockedUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      await db.insert(blockedIps).values({
        ipAddress, blockedUntil, reason: reason || "Manuel engel (admin)",
      }).onDuplicateKeyUpdate({ set: { blockedUntil, reason: reason || "Manuel engel (admin)" } });
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // DELETE /api/admin/blocked-ips/:id — engeli kaldir
  app.delete("/api/admin/blocked-ips/:id", requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const row = await db.select().from(blockedIps).where(eq(blockedIps.id, id)).limit(1);
      if (row.length > 0) autoBlockedIps.delete(row[0].ipAddress);
      await db.delete(blockedIps).where(eq(blockedIps.id, id));
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
}
