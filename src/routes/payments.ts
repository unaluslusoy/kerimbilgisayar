/**
 * src/routes/payments.ts
 * PayTR sanal pos odeme entegrasyonu route'lari.
 * Bagimsiz moduler route dosyasi - server.ts'den ayrildi.
 *
 * Baglanmak icin server.ts startServer() fonksiyonu icinde:
 *   import { registerPaytrRoutes } from "./src/routes/payments";
 *   registerPaytrRoutes(app, { db, plugins, getClientIp, eq });
 */

import type { Express } from "express";
import express from "express";
import type { RouteDeps } from "./index";

export function registerPaytrRoutes(app: Express, deps: RouteDeps): void {
  const { db, plugins, eq, getClientIp, crypto } = deps;

  // POST /api/payments/paytr/init
  // PayTR iframe token uret (odeme baslatma)
  app.post("/api/payments/paytr/init", async (req, res) => {
    try {
      const allPlugins = await db.select().from(plugins).where(eq(plugins.pluginId, "paytr-integration"));
      if (!allPlugins.length || !allPlugins[0].settings) {
        return res.status(400).json({ error: "PayTR ayarlari tanimlanmamis" });
      }
      const ps: any = allPlugins[0].settings;
      const merchantId   = ps.merchantId?.trim();
      const merchantKey  = ps.merchantKey?.trim();
      const merchantSalt = ps.merchantSalt?.trim();
      if (!merchantId || !merchantKey || !merchantSalt) {
        return res.status(400).json({ error: "PayTR kimlik bilgileri eksik" });
      }

      const {
        orderId, email, amount, basketItems, userName, userAddress, userPhone,
        currency = "TL", noInstallment = 1, maxInstallment = 1,
        lang = "tr", debugOn = 0,
        testMode = process.env.NODE_ENV !== "production" ? 1 : 0,
      } = req.body;

      if (!orderId || !email || !amount) {
        return res.status(400).json({ error: "orderId, email ve amount zorunludur" });
      }

      const merchantOkUrl   = `${process.env.APP_URL || "http://localhost:3000"}/odeme/basarili`;
      const merchantFailUrl = `${process.env.APP_URL || "http://localhost:3000"}/odeme/basarisiz`;
      const userIp = getClientIp(req);

      const basket = JSON.stringify(
        Array.isArray(basketItems) && basketItems.length > 0
          ? basketItems
          : [[String(req.body.productName || "Siparis"), String(amount), 1]]
      );

      const hashStr    = `${merchantId}${userIp}${orderId}${email}${amount}${basket}${noInstallment}${maxInstallment}${currency}${testMode}${merchantSalt}`;
      const paytrToken = crypto.createHmac("sha256", merchantKey).update(hashStr).digest("base64");

      const params = new URLSearchParams({
        merchant_id: merchantId, user_ip: userIp, merchant_oid: String(orderId),
        email: String(email), payment_amount: String(amount), paytr_token: paytrToken,
        user_basket: Buffer.from(basket).toString("base64"),
        debug_on: String(debugOn), no_installment: String(noInstallment),
        max_installment: String(maxInstallment), user_name: String(userName || email),
        user_address: String(userAddress || "Belirtilmedi"), user_phone: String(userPhone || "05000000000"),
        merchant_ok_url: merchantOkUrl, merchant_fail_url: merchantFailUrl,
        timeout_limit: "30", currency, test_mode: String(testMode), lang,
      });

      const paytrRes  = await fetch("https://www.paytr.com/odeme/api/get-token", { method: "POST", body: params, headers: { "Content-Type": "application/x-www-form-urlencoded" } });
      const paytrData = await paytrRes.json().catch(() => ({}));
      if ((paytrData as any).status !== "success") {
        return res.status(400).json({ error: (paytrData as any).reason || "PayTR token alinamamadi", detail: paytrData });
      }
      res.json({ iframeToken: (paytrData as any).token });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // POST /api/payments/paytr/callback
  // PayTR IPN (Instant Payment Notification) webhook
  app.post("/api/payments/paytr/callback", express.urlencoded({ extended: false }), async (req, res) => {
    try {
      const allPlugins = await db.select().from(plugins).where(eq(plugins.pluginId, "paytr-integration"));
      if (!allPlugins.length || !allPlugins[0].settings) return res.send("PAYTR_SETTINGS_ERROR");
      const ps: any = allPlugins[0].settings;
      const merchantKey  = ps.merchantKey?.trim();
      const merchantSalt = ps.merchantSalt?.trim();
      const { merchant_oid, status, total_amount, hash } = req.body;
      const hashStr  = `${merchant_oid}${merchantSalt}${status}${total_amount}`;
      const expected = crypto.createHmac("sha256", merchantKey).update(hashStr).digest("base64");
      if (expected !== hash) {
        console.warn("[PayTR] Gecersiz hash - callback reddedildi");
        return res.send("PAYTR_INVALID_HASH");
      }
      console.log(`[PayTR] IPN alindi: ${merchant_oid} - ${status} - ${total_amount} kurus`);
      // TODO: Siparis/abonelik durumunu DB'de guncelle
      res.send("OK");
    } catch (e: any) {
      console.error("[PayTR] Callback error:", e.message);
      res.send("ERROR");
    }
  });
}
