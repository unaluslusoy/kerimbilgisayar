/**
 * src/routes/index.ts
 * 
 * Route modulleri icin merkezi kayit noktasi.
 * Her modul (app, deps: RouteDeps) => void seklinde bir fonksiyon export eder.
 * 
 * KULLANIM (server.ts icinde):
 *   import { registerPaytrRoutes }   from "./src/routes/payments";
 *   import { registerPageBlockRoutes } from "./src/routes/admin/pageBlocks";
 *   import { registerIpBlockRoutes }   from "./src/routes/admin/security";
 *   // ... startServer() icinde:
 *   registerPaytrRoutes(app, deps);
 *   registerPageBlockRoutes(app, deps);
 *   registerIpBlockRoutes(app, deps);
 */

import type { Express } from "express";
import type { db as DrizzleDb } from "../db/index";

export interface RouteDeps {
  db: typeof DrizzleDb;
  requireAdmin: (req: any, res: any, next: any) => void;
  getClientIp: (req: any) => string;
  readSettingsMap: () => Promise<Record<string, string>>;
  autoBlockedIps: Map<string, number>;
  plugins: any;
  pageBlocks: any;
  blockedIps: any;
  eq: any;
  desc: any;
  asc: any;
  and: any;
  crypto: any;
}
