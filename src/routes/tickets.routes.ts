import express from 'express';
import { eq, and, or, sql, desc, asc } from 'drizzle-orm';
import { alias } from 'drizzle-orm/mysql-core';
import { db } from '../db/index';
import {
  tickets,
  users,
  devices,
  ticketParts,
  stockItems,
  serviceStatusLogs,
  ticketApprovalRequests,
  ticketPhysicalConditions,
  ticketFunctionTests,
  auditLogs,
  deviceTypes,
  deviceTypeTests,
  ticketSupplyRequests,
  companies,
  dealerLedger,
  ticketAttachments,
  ticketMessages,
  payments,
  settings,
  leads,
  customers,
} from '../db/schema';
import { requireAdmin } from '../server/middleware';
import { TICKET_STATUS_LABELS, TICKET_TERMINAL_STATUSES } from '../lib/ticketStatus';
import { sendTicketEmail, getStatusEmailTemplate } from '../lib/mail';
import { encryptField, decryptField } from '../lib/fieldCrypto';
import { isValidImei } from '../server/helpers';

export const ticketsRouter = express.Router();

// WHATSAPP API DISPATCHER
async function sendWhatsAppMessage(phone: string, text: string) {
  try {
    const allSettings = await db.select().from(settings);
    const settingsMap: Record<string, string> = {};
    allSettings.forEach(s => { settingsMap[s.key] = s.value || ''; });

    if (settingsMap.whatsappApiEnabled !== 'true') return;
    const apiUrl = settingsMap.whatsappApiUrl;
    const apiToken = settingsMap.whatsappApiToken;
    if (!apiUrl || !apiToken) return;

    let formattedPhone = phone.replace(/\D/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '90' + formattedPhone.substring(1);
    } else if (!formattedPhone.startsWith('90') && formattedPhone.length === 10) {
      formattedPhone = '90' + formattedPhone;
    }

    let bodyObj: any = {};
    let headers: Record<string, string> = { 'Content-Type': 'application/json' };

    if (apiUrl.includes('ultramsg')) {
      bodyObj = {
        token: apiToken,
        to: formattedPhone,
        body: text
      };
    } else {
      bodyObj = {
        to: formattedPhone,
        message: text,
        text: text
      };
      headers['Authorization'] = `Bearer ${apiToken}`;
      headers['x-api-key'] = apiToken;
    }

    const res = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(bodyObj)
    });
    if (!res.ok) {
      console.error('WhatsApp API error:', res.status, await res.text());
    } else {
      console.log('WhatsApp message sent successfully to:', formattedPhone);
    }
  } catch (err) {
    console.error('Failed to send WhatsApp message:', err);
  }
}

// STATUS CHANGE NOTIFICATION DISPATCHER
async function triggerStatusNotifications(ticketId: number, status: string) {
  try {
    const ticketInfo = await db.select({
      id: tickets.id,
      ticketNumber: tickets.ticketNumber,
      customerName: users.firstName,
      customerPhone: users.phone,
      customerEmail: users.email,
      deviceBrand: devices.brand,
      deviceModel: devices.model,
      deviceType: devices.deviceType
    }).from(tickets)
      .leftJoin(users, eq(tickets.userId, users.id))
      .leftJoin(devices, eq(tickets.deviceId, devices.id))
      .where(eq(tickets.id, ticketId))
      .limit(1);

    if (ticketInfo.length > 0) {
      const t = ticketInfo[0];
      const deviceName = `${t.deviceBrand || ''} ${t.deviceModel || ''}`.trim() || t.deviceType || 'Cihazınız';
      const statusText = TICKET_STATUS_LABELS[status] || status;

      if (t.customerEmail && !t.customerEmail.includes('@noemail.local')) {
        const html = getStatusEmailTemplate(t.customerName || 'Müşterimiz', t.ticketNumber, deviceName, statusText);
        sendTicketEmail(t.customerEmail, `Servis Durumu Güncellendi: ${t.ticketNumber}`, html).catch(console.error);
      }

      if (t.customerPhone) {
        const allSettings = await db.select().from(settings);
        const settingsMap: Record<string, string> = {};
        allSettings.forEach(s => { settingsMap[s.key] = s.value || ''; });

        if (settingsMap.whatsappApiEnabled === 'true') {
          const siteUrl = settingsMap.siteBaseUrl || 'https://kerimbilgisayar.com';
          const trackingLink = `${siteUrl}/ariza-sorgulama?no=${t.ticketNumber}`;

          const defaultTemplate = "Sayın [Musteri], [No] numaralı [Cihaz] cihazınızın servis durumu '[Durum]' olarak güncellenmiştir. Takip linkiniz: [Link]";
          const template = settingsMap.whatsappTemplate || defaultTemplate;

          const text = template
            .replace('[Musteri]', t.customerName || 'Müşterimiz')
            .replace('[No]', t.ticketNumber || '')
            .replace('[Cihaz]', deviceName)
            .replace('[Durum]', statusText)
            .replace('[Link]', trackingLink);

          sendWhatsAppMessage(t.customerPhone, text).catch(console.error);
        }
      }
    }
  } catch (err) {
    console.error('Failed to trigger status notifications:', err);
  }
}

// TESLİM YAŞLANDIRMA (2D)
export async function checkPickupReminders() {
  try {
    const rows = await db.select({
      id: tickets.id,
      tenantId: tickets.tenantId,
      ticketNumber: tickets.ticketNumber,
      status: tickets.status,
      readySince: tickets.readySince,
      pickupReminder7dSentAt: tickets.pickupReminder7dSentAt,
      pickupReminder15dSentAt: tickets.pickupReminder15dSentAt,
      pickupLegalNotice30dSentAt: tickets.pickupLegalNotice30dSentAt,
      customerName: users.firstName,
      customerPhone: users.phone,
      customerEmail: users.email,
      deviceBrand: devices.brand,
      deviceModel: devices.model,
      deviceType: devices.deviceType,
    }).from(tickets)
      .leftJoin(users, eq(tickets.userId, users.id))
      .leftJoin(devices, eq(tickets.deviceId, devices.id))
      .where(and(
        sql`${tickets.status} IN ('cozuldu', 'iade')`,
        sql`${tickets.readySince} IS NOT NULL`
      ));

    if (rows.length === 0) return;

    const allSettings = await db.select().from(settings);
    const settingsMap: Record<string, string> = {};
    allSettings.forEach(s => { settingsMap[s.key] = s.value || ''; });
    const siteUrl = settingsMap.siteBaseUrl || 'https://kerimbilgisayar.com';

    for (const t of rows) {
      const daysReady = Math.floor((Date.now() - new Date(t.readySince as any).getTime()) / 86_400_000);
      let tier: '7' | '15' | '30' | null = null;
      if (daysReady >= 30 && !t.pickupLegalNotice30dSentAt) tier = '30';
      else if (daysReady >= 15 && !t.pickupReminder15dSentAt) tier = '15';
      else if (daysReady >= 7 && !t.pickupReminder7dSentAt) tier = '7';
      if (!tier) continue;

      const deviceName = `${t.deviceBrand || ''} ${t.deviceModel || ''}`.trim() || t.deviceType || 'Cihazınız';
      const trackingLink = `${siteUrl}/ariza-sorgulama?no=${t.ticketNumber}`;
      const text = tier === '30'
        ? `Sayın ${t.customerName || 'Müşterimiz'}, ${t.ticketNumber} numaralı ${deviceName} cihazınız ${daysReady} gündür teslim alınmayı bekliyor. Yasal bildirim: Lütfen en kısa sürede cihazınızı teslim alınız, aksi halde saklama koşulları ve ek ücretler uygulanabilir. Detay: ${trackingLink}`
        : `Sayın ${t.customerName || 'Müşterimiz'}, ${t.ticketNumber} numaralı ${deviceName} cihazınız ${daysReady} gündür teslim almanızı bekliyor. Detay: ${trackingLink}`;

      if (t.customerEmail && !t.customerEmail.includes('@noemail.local')) {
        sendTicketEmail(t.customerEmail, `Cihazınız Teslim Almanızı Bekliyor: ${t.ticketNumber}`, `<p>${text}</p>`).catch(console.error);
      }
      if (t.customerPhone) {
        sendWhatsAppMessage(t.customerPhone, text).catch(console.error);
      }

      const updateData: any = {};
      if (tier === '7') updateData.pickupReminder7dSentAt = new Date();
      if (tier === '15') updateData.pickupReminder15dSentAt = new Date();
      if (tier === '30') updateData.pickupLegalNotice30dSentAt = new Date();
      await db.update(tickets).set(updateData).where(eq(tickets.id, t.id));

      await db.insert(serviceStatusLogs).values({
        tenantId: t.tenantId,
        ticketId: t.id,
        toStatus: t.status,
        notes: `Teslim hatırlatması gönderildi (${tier} gün, ${daysReady} gündür hazır bekliyor).`,
      }).catch(() => {});
    }
  } catch (err) {
    console.error('checkPickupReminders error:', err);
  }
}

// ADMIN API — CİHAZ PROFİLLERİ
ticketsRouter.get('/api/admin/device-types', requireAdmin, async (req, res) => {
  try {
    const rowsTypes = await db.select().from(deviceTypes).where(eq(deviceTypes.tenantId, 1)).orderBy(asc(deviceTypes.sortOrder));
    const rowsTests = await db.select().from(deviceTypeTests).orderBy(asc(deviceTypeTests.sortOrder));
    const testsByType: Record<number, string[]> = {};
    for (const t of rowsTests) {
      (testsByType[t.deviceTypeId] ||= []).push(t.testName);
    }
    res.json(rowsTypes.map(dt => ({ ...dt, tests: testsByType[dt.id] || [] })));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ADMIN API — EKSPERTİZ
ticketsRouter.get('/api/admin/tickets/:id/expertise', requireAdmin, async (req, res) => {
  try {
    const ticketId = parseInt(req.params.id);
    const [conditions, tests] = await Promise.all([
      db.select().from(ticketPhysicalConditions).where(eq(ticketPhysicalConditions.ticketId, ticketId)),
      db.select().from(ticketFunctionTests).where(eq(ticketFunctionTests.ticketId, ticketId)),
    ]);
    res.json({
      physicalConditions: conditions.map(c => c.conditionKey),
      functionTests: Object.fromEntries(tests.map(t => [t.testName, t.result])),
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

ticketsRouter.post('/api/admin/tickets/:id/expertise', requireAdmin, async (req, res) => {
  try {
    const ticketId = parseInt(req.params.id);
    const { physicalConditions, functionTests } = req.body;
    const adminUser = (req as any).adminUser;

    await db.transaction(async (tx) => {
      await tx.delete(ticketPhysicalConditions).where(eq(ticketPhysicalConditions.ticketId, ticketId));
      if (Array.isArray(physicalConditions) && physicalConditions.length > 0) {
        await tx.insert(ticketPhysicalConditions).values(
          physicalConditions.map((conditionKey: string) => ({ ticketId, conditionKey }))
        );
      }

      await tx.delete(ticketFunctionTests).where(eq(ticketFunctionTests.ticketId, ticketId));
      const testEntries = Object.entries(functionTests || {}).filter(([, v]) => v);
      if (testEntries.length > 0) {
        await tx.insert(ticketFunctionTests).values(
          testEntries.map(([testName, result]) => ({ ticketId, testName, result: result as any }))
        );
      }
    });

    await db.insert(auditLogs).values({
      tenantId: 1,
      userId: adminUser?.userId || null,
      action: 'ticket.expertise_saved',
      entityType: 'Ticket',
      entityId: ticketId,
      details: { physicalConditionsCount: (physicalConditions || []).length, functionTestsCount: Object.keys(functionTests || {}).length },
    }).catch((e) => console.error('auditLogs insert error:', e));

    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

ticketsRouter.post('/api/admin/tickets/:id/manual-approval', requireAdmin, async (req, res) => {
  try {
    const ticketId = parseInt(req.params.id);
    const { decision } = req.body;
    if (!['approved', 'rejected'].includes(decision)) {
      return res.status(400).json({ error: 'Geçersiz karar.' });
    }
    const adminUser = (req as any).adminUser;
    const [ticket] = await db.select().from(tickets).where(eq(tickets.id, ticketId)).limit(1);
    if (!ticket) return res.status(404).json({ error: 'Servis kaydı bulunamadı' });
    if (TICKET_TERMINAL_STATUSES.includes(ticket.status)) {
      return res.status(400).json({ error: 'Bu servis kaydı halihazırda sonuçlandırılmıştır.' });
    }

    const partsRows = await db.select({ totalPrice: ticketParts.totalPrice }).from(ticketParts)
      .where(and(eq(ticketParts.ticketId, ticketId), sql`${ticketParts.removedAt} IS NULL`));
    const partsTotal = partsRows.reduce((s, p) => s + parseFloat(p.totalPrice || '0'), 0);
    const grandTotal = partsTotal + parseFloat(ticket.laborCost || '0');
    const newStatus = decision === 'approved' ? 'isleme_alindi' : 'onay_red';

    await db.transaction(async (tx) => {
      await tx.update(tickets).set({ status: newStatus, updatedAt: new Date() }).where(eq(tickets.id, ticketId));
      await tx.insert(serviceStatusLogs).values({
        tenantId: ticket.tenantId,
        ticketId,
        fromStatus: ticket.status,
        toStatus: newStatus,
        changedById: adminUser?.userId,
        notes: `Müşteri telefon/yüz yüze görüşmede teklifi ${decision === 'approved' ? 'onayladı' : 'reddetti'} (personel tarafından kaydedildi).`,
      });
      await tx.insert(ticketApprovalRequests).values({
        ticketId,
        channel: 'manuel',
        quotedAmount: grandTotal.toFixed(2),
        approvedAt: decision === 'approved' ? new Date() : null,
        rejectedAt: decision === 'rejected' ? new Date() : null,
        createdBy: adminUser?.userId,
      });
    });

    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

ticketsRouter.get('/api/admin/tickets/:id/approval-requests', requireAdmin, async (req, res) => {
  try {
    const ticketId = parseInt(req.params.id);
    const rows = await db.select().from(ticketApprovalRequests)
      .where(eq(ticketApprovalRequests.ticketId, ticketId))
      .orderBy(desc(ticketApprovalRequests.sentAt));
    res.json(rows);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

ticketsRouter.post('/api/admin/tickets/:id/send-approval-request', requireAdmin, async (req, res) => {
  try {
    const ticketId = parseInt(req.params.id);
    const adminUser = (req as any).adminUser;

    const [ticket] = await db.select({
      tenantId: tickets.tenantId,
      status: tickets.status,
      ticketNumber: tickets.ticketNumber,
      laborCost: tickets.laborCost,
      customerName: users.firstName,
      customerPhone: users.phone,
      customerEmail: users.email,
      deviceBrand: devices.brand,
      deviceModel: devices.model,
      deviceType: devices.deviceType,
    }).from(tickets)
      .leftJoin(users, eq(tickets.userId, users.id))
      .leftJoin(devices, eq(tickets.deviceId, devices.id))
      .where(eq(tickets.id, ticketId)).limit(1);
    if (!ticket) return res.status(404).json({ error: 'Servis kaydı bulunamadı' });
    if (ticket.status !== 'musteri_onayi_bekliyor') {
      return res.status(400).json({ error: 'Onay isteği yalnızca "Müşteri Onayı Bekliyor" durumundaki kayıtlar için gönderilebilir.' });
    }

    const partsRows = await db.select({ totalPrice: ticketParts.totalPrice }).from(ticketParts)
      .where(and(eq(ticketParts.ticketId, ticketId), sql`${ticketParts.removedAt} IS NULL`));
    const partsTotal = partsRows.reduce((s, p) => s + parseFloat(p.totalPrice || '0'), 0);
    const grandTotal = partsTotal + parseFloat(ticket.laborCost || '0');

    await db.insert(ticketApprovalRequests).values({
      ticketId,
      channel: 'portal',
      quotedAmount: grandTotal.toFixed(2),
      createdBy: adminUser?.userId,
    });

    await db.insert(serviceStatusLogs).values({
      tenantId: ticket.tenantId,
      ticketId,
      toStatus: ticket.status,
      changedById: adminUser?.userId,
      notes: `Onay isteği tekrar gönderildi (₺${grandTotal.toFixed(2)}).`,
    }).catch(() => {});

    const deviceName = `${ticket.deviceBrand || ''} ${ticket.deviceModel || ''}`.trim() || ticket.deviceType || 'Cihazınız';
    const allSettings = await db.select().from(settings);
    const settingsMap: Record<string, string> = {};
    allSettings.forEach(s => { settingsMap[s.key] = s.value || ''; });
    const siteUrl = settingsMap.siteBaseUrl || 'https://kerimbilgisayar.com';
    const trackingLink = `${siteUrl}/ariza-sorgulama?no=${ticket.ticketNumber}`;

    if (ticket.customerEmail && !ticket.customerEmail.includes('@noemail.local')) {
      const html = `<p>Sayın ${ticket.customerName || 'Müşterimiz'},</p>
        <p><b>${ticket.ticketNumber}</b> numaralı <b>${deviceName}</b> servis kaydınız için hazırlanan
        teklif tutarı <b>₺${grandTotal.toFixed(2)}</b>'dir.</p>
        <p>Onaylamak veya reddetmek için lütfen takip linkini ziyaret edin:
        <a href="${trackingLink}">${trackingLink}</a></p>`;
      sendTicketEmail(ticket.customerEmail, `Onayınız Bekleniyor: ${ticket.ticketNumber}`, html).catch(console.error);
    }

    if (ticket.customerPhone) {
      const text = `Sayın ${ticket.customerName || 'Müşterimiz'}, ${ticket.ticketNumber} numaralı ${deviceName} cihazınız için teklif tutarımız ₺${grandTotal.toFixed(2)}'dir. Onaylamak/reddetmek için: ${trackingLink}`;
      sendWhatsAppMessage(ticket.customerPhone, text).catch(console.error);
    }

    res.json({ success: true, quotedAmount: grandTotal.toFixed(2) });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

ticketsRouter.get('/api/admin/tickets/:id/supply-requests', requireAdmin, async (req, res) => {
  try {
    const ticketId = parseInt(req.params.id);
    const rows = await db.select().from(ticketSupplyRequests)
      .where(eq(ticketSupplyRequests.ticketId, ticketId))
      .orderBy(desc(ticketSupplyRequests.createdAt));
    res.json(rows);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

ticketsRouter.post('/api/admin/tickets/:id/supply-requests', requireAdmin, async (req, res) => {
  try {
    const ticketId = parseInt(req.params.id);
    const { itemName, supplier, etaDate } = req.body;
    if (!itemName?.trim()) return res.status(400).json({ error: 'Kalem adı zorunludur.' });
    const adminUser = (req as any).adminUser;

    const [ticket] = await db.select({ tenantId: tickets.tenantId, ticketNumber: tickets.ticketNumber }).from(tickets).where(eq(tickets.id, ticketId)).limit(1);
    if (!ticket) return res.status(404).json({ error: 'Servis kaydı bulunamadı' });

    await db.insert(ticketSupplyRequests).values({
      ticketId,
      itemName: itemName.trim(),
      supplier: supplier?.trim() || null,
      etaDate: etaDate || null,
      createdBy: adminUser?.userId || null,
    });

    await db.insert(serviceStatusLogs).values({
      tenantId: ticket.tenantId,
      ticketId,
      toStatus: 'parca_bekliyor',
      notes: `Tedarik talebi açıldı: ${itemName.trim()}${supplier ? ` (${supplier.trim()})` : ''}${etaDate ? ` — tahmini: ${etaDate}` : ''}`,
    }).catch(() => {});

    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

ticketsRouter.post('/api/admin/supply-requests/:id/arrived', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [reqRow] = await db.select().from(ticketSupplyRequests).where(eq(ticketSupplyRequests.id, id)).limit(1);
    if (!reqRow) return res.status(404).json({ error: 'Tedarik talebi bulunamadı' });
    await db.update(ticketSupplyRequests).set({ arrivedAt: new Date() }).where(eq(ticketSupplyRequests.id, id));

    const [ticket] = await db.select({ tenantId: tickets.tenantId }).from(tickets).where(eq(tickets.id, reqRow.ticketId)).limit(1);
    await db.insert(serviceStatusLogs).values({
      tenantId: ticket?.tenantId,
      ticketId: reqRow.ticketId,
      toStatus: 'isleme_alindi',
      notes: `Tedarik parçası geldi: ${reqRow.itemName} — süreç devam edebilir.`,
    }).catch(() => {});

    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ADMIN API — TICKETS
ticketsRouter.get('/api/admin/tickets', requireAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    const dealerAlias = alias(companies, 'dealer');
    const whereClause = and(
      eq(tickets.tenantId, 1),
      status && status !== 'all' ? eq(tickets.status, status as any) : undefined
    );

    const results = await db.select({
      id: tickets.id,
      ticketNumber: tickets.ticketNumber,
      subject: tickets.subject,
      description: tickets.description,
      status: tickets.status,
      priority: tickets.priority,
      type: tickets.type,
      cost: tickets.cost,
      createdAt: tickets.createdAt,
      updatedAt: tickets.updatedAt,
      customerName: users.firstName,
      customerLastName: users.lastName,
      customerPhone: users.phone,
      deviceName: devices.name,
      deviceTypeId: devices.deviceTypeId,
      deviceType: devices.deviceType,
      deviceBrand: devices.brand,
      deviceModel: devices.model,
      color: devices.color,
      variant: devices.variant,
      deviceSerial: devices.serialNumber,
      imei: devices.imei,
      patternLock: devices.patternLock,
      pinPassword: devices.pinPassword,
      deviceEmail: devices.deviceEmail,
      deviceEmailPassword: devices.deviceEmailPassword,
      customerEmail: users.email,
      address: users.address,
      assignedTo: tickets.assignedTo,
      laborCost: tickets.laborCost,
      dealerId: tickets.dealerId,
      dealerName: dealerAlias.name,
      technicianNotes: tickets.technicianNotes,
      accessories: tickets.accessories,
      kvkkConsentAt: tickets.kvkkConsentAt,
      dataLossConsentAt: tickets.dataLossConsentAt,
      accessInfoConsentAt: tickets.accessInfoConsentAt,
      expertiseFeeConsentAt: tickets.expertiseFeeConsentAt,
      externalServiceName: tickets.externalServiceName,
      externalSentAt: tickets.externalSentAt,
      externalCost: tickets.externalCost,
      externalReturnedAt: tickets.externalReturnedAt,
    }).from(tickets)
      .leftJoin(users, eq(tickets.userId, users.id))
      .leftJoin(devices, eq(tickets.deviceId, devices.id))
      .leftJoin(dealerAlias, eq(tickets.dealerId, dealerAlias.id))
      .where(whereClause)
      .orderBy(desc(tickets.createdAt));

    res.json(results.map(t => ({
      ...t,
      customerName: `${t.customerName || ''} ${t.customerLastName || ''}`.trim() || 'Müşteri',
      patternLock: decryptField(t.patternLock),
      pinPassword: decryptField(t.pinPassword),
      deviceEmailPassword: decryptField(t.deviceEmailPassword),
    })));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

ticketsRouter.post('/api/admin/tickets', requireAdmin, async (req, res) => {
  try {
    const {
      subject, description, type, priority, customerName, customerPhone, customerEmail, deviceType, deviceBrand, deviceModel, cost, dealerId, source, assignedTo, accessories, technicianNotes,
      deviceSerial, imei, patternLock, pinPassword, deviceEmail, deviceEmailPassword, deviceTypeId, color, variant,
      customerType, companyName, taxId, taxOffice, address,
      consentKvkk, consentDataLoss, consentAccessInfo, consentExpertiseFee,
    } = req.body;

    if (imei && !isValidImei(imei)) {
      return res.status(400).json({ error: 'IMEI numarası geçersiz (15 haneli olmalı ve Luhn doğrulamasını geçmeli).' });
    }

    let userId: number | null = null;
    let deviceId: number | null = null;
    let userEmailForMail = customerEmail || '';
    const ticketNumber = `SRV-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;

    await db.transaction(async (tx) => {
      let companyId: number | null = null;
      if (customerType === 'kurumsal' && companyName?.trim()) {
        const existingCompany = await tx.select().from(companies).where(eq(companies.name, companyName.trim())).limit(1);
        if (existingCompany.length > 0) {
          companyId = existingCompany[0].id;
        } else {
          const newCompany = await tx.insert(companies).values({
            tenantId: 1,
            name: companyName.trim(),
            taxId: taxId || null,
            taxOffice: taxOffice || null,
            address: address || null,
            phone: customerPhone || null,
            email: customerEmail || null,
            type: 'customer',
          });
          companyId = (newCompany[0] as any).insertId;
        }
      }

      if (customerName && (customerPhone || customerEmail)) {
        const nameParts = customerName.split(' ');
        let existingUser = await tx.select().from(users).where(eq(users.phone, customerPhone)).limit(1);
        if (existingUser.length === 0 && customerEmail) {
          existingUser = await tx.select().from(users).where(eq(users.email, customerEmail)).limit(1);
        }

        if (existingUser.length > 0) {
          userId = existingUser[0].id;
          if (!userEmailForMail && existingUser[0].email && !existingUser[0].email.includes('@noemail.local')) {
            userEmailForMail = existingUser[0].email;
          }
          if (customerEmail && existingUser[0].email.includes('@noemail.local')) {
            const duplicateEmailUser = await tx.select().from(users).where(eq(users.email, customerEmail)).limit(1);
            if (duplicateEmailUser.length === 0) {
              await tx.update(users).set({ email: customerEmail }).where(eq(users.id, userId));
            }
          }

          const userUpdate: any = {};
          if (address !== undefined) userUpdate.address = address;
          if (taxId !== undefined) userUpdate.taxNumber = taxId;
          if (taxOffice !== undefined) userUpdate.taxOffice = taxOffice;
          if (companyId) userUpdate.companyId = companyId;
          if (Object.keys(userUpdate).length > 0) {
            await tx.update(users).set(userUpdate).where(eq(users.id, userId));
          }

          const existingCustomer = await tx.select().from(customers).where(eq(customers.userId, userId)).limit(1);
          if (existingCustomer.length === 0) {
            await tx.insert(customers).values({
              tenantId: existingUser[0].tenantId || 1,
              userId: userId,
              companyId: companyId || existingUser[0].companyId || null,
              accountCode: `MUS-${String(userId).padStart(5, '0')}`,
              balance: '0.00',
              creditLimit: '0.00',
              notes: 'Teknik servis fişi oluşturulurken otomatik senkronize edildi.',
              isActive: true,
            });
          }
        } else {
          const newUser = await tx.insert(users).values({
            tenantId: 1,
            companyId: companyId || null,
            firstName: nameParts[0] || customerName,
            lastName: nameParts.slice(1).join(' ') || '',
            email: customerEmail || `${customerPhone || Date.now()}@noemail.local`,
            phone: customerPhone || '',
            address: address || null,
            taxNumber: taxId || null,
            taxOffice: taxOffice || null,
            roleType: 'customer'
          });
          userId = (newUser[0] as any).insertId;

          await tx.insert(customers).values({
            tenantId: 1,
            userId: userId,
            companyId: companyId || null,
            accountCode: `MUS-${String(userId).padStart(5, '0')}`,
            balance: '0.00',
            creditLimit: '0.00',
            notes: 'Teknik servis fişi oluşturulurken otomatik eklendi.',
            isActive: true,
          });
        }
      }

      if (deviceType || deviceBrand || deviceModel) {
        const newDevice = await tx.insert(devices).values({
          tenantId: 1,
          userId: userId,
          deviceTypeId: deviceTypeId ? parseInt(deviceTypeId as string) : null,
          deviceType: deviceType || 'Bilinmeyen',
          brand: deviceBrand || '',
          model: deviceModel || '',
          color: color || null,
          variant: variant || null,
          name: `${deviceBrand || ''} ${deviceModel || ''}`.trim() || deviceType || 'Cihaz',
          serialNumber: deviceSerial || null,
          imei: imei || null,
          patternLock: encryptField(patternLock || null),
          pinPassword: encryptField(pinPassword || null),
          deviceEmail: deviceEmail || null,
          deviceEmailPassword: encryptField(deviceEmailPassword || null),
        });
        deviceId = (newDevice[0] as any).insertId;
      }

      const autoSubject = subject || `${deviceBrand || ''} ${deviceModel || ''} ${type === 'ariza' ? 'Arıza' : type === 'bakim' ? 'Bakım' : type === 'kurulum' ? 'Kurulum' : 'Destek'}`.trim() || 'Teknik Servis Talebi';

      const newTicketRecord = await tx.insert(tickets).values({
        tenantId: 1,
        ticketNumber,
        userId: userId,
        deviceId: deviceId,
        type: type || 'ariza',
        subject: autoSubject,
        description: description || '',
        priority: priority || 'normal',
        status: 'yeni',
        cost: cost || '0.00',
        dealerId: dealerId ? parseInt(dealerId as string) : null,
        source: source || 'walk_in',
        assignedTo: assignedTo ? parseInt(assignedTo as string) : null,
        accessories: accessories || '',
        technicianNotes: technicianNotes || '',
        kvkkConsentAt: consentKvkk ? new Date() : null,
        dataLossConsentAt: consentDataLoss ? new Date() : null,
        accessInfoConsentAt: consentAccessInfo ? new Date() : null,
        expertiseFeeConsentAt: consentExpertiseFee ? new Date() : null,
      });
      req.body.insertedTicketId = (newTicketRecord[0] as any).insertId;
    });

    if (userEmailForMail && !userEmailForMail.includes('@noemail.local')) {
      const deviceNameStr = `${deviceBrand || ''} ${deviceModel || ''}`.trim() || deviceType || 'Cihazınız';
      const html = getStatusEmailTemplate(customerName || 'Müşterimiz', ticketNumber, deviceNameStr, 'Servise Alındı / Yeni Kayıt');
      sendTicketEmail(userEmailForMail, `Servis Kaydı Oluşturuldu: ${ticketNumber}`, html).catch(console.error);
    }

    res.json({ success: true, ticketNumber, id: req.body.insertedTicketId });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

ticketsRouter.patch('/api/admin/tickets/:id', requireAdmin, async (req, res) => {
  try {
    const {
      status, priority, cost, assignedTo, laborCost, technicianNotes, accessories, description,
      customerName, customerPhone, customerEmail, address,
      deviceType, deviceBrand, deviceModel, imei, deviceSerial, patternLock, pinPassword, deviceEmail, deviceEmailPassword, deviceTypeId, color, variant,
      deliverySignature, customerSignature,
      externalServiceName, externalCost, externalSentAction, externalReturnedAction,
    } = req.body;

    if (imei && !isValidImei(imei)) {
      return res.status(400).json({ error: 'IMEI numarası geçersiz (15 haneli olmalı ve Luhn doğrulamasını geçmeli).' });
    }

    if (status === 'teslim_edildi') {
      const ticketIdCheck = parseInt(req.params.id);
      const [partsSum] = await db.select({ total: sql<string>`COALESCE(SUM(${ticketParts.totalPrice}), 0)` })
        .from(ticketParts)
        .where(and(eq(ticketParts.ticketId, ticketIdCheck), sql`${ticketParts.removedAt} IS NULL`));
      const [ticketRow] = await db.select({ laborCost: tickets.laborCost }).from(tickets).where(eq(tickets.id, ticketIdCheck)).limit(1);
      const grandTotal = parseFloat(partsSum?.total || '0') + parseFloat(ticketRow?.laborCost || '0');
      const paymentRows = await db.select({ amount: payments.amount, status: payments.status }).from(payments).where(eq(payments.ticketId, ticketIdCheck));
      const paid = paymentRows.filter(p => p.status === 'basarili').reduce((s, p) => s + parseFloat(p.amount), 0);
      const refunded = paymentRows.filter(p => p.status === 'iade').reduce((s, p) => s + parseFloat(p.amount), 0);
      const balance = grandTotal - paid + refunded;
      if (balance > 0.009) {
        return res.status(400).json({ error: `Bakiye kapanmadan cihaz teslim edilemez. Kalan bakiye: ₺${balance.toFixed(2)}` });
      }
    }

    const updateData: any = { updatedAt: new Date() };
    if (status) updateData.status = status;
    if (priority) updateData.priority = priority;
    if (cost !== undefined) updateData.cost = cost;
    if (assignedTo !== undefined) updateData.assignedTo = assignedTo;
    if (laborCost !== undefined) updateData.laborCost = laborCost;
    if (technicianNotes !== undefined) updateData.technicianNotes = technicianNotes;
    if (accessories !== undefined) updateData.accessories = accessories;
    if (description !== undefined) updateData.description = description;
    if (deliverySignature !== undefined) updateData.deliverySignature = deliverySignature;
    if (customerSignature !== undefined) updateData.customerSignature = customerSignature;
    if (status === 'cozuldu' || status === 'kapatildi') updateData.resolvedAt = new Date();
    if (status === 'teslim_edildi') updateData.deliveredAt = new Date();
    if (status === 'cozuldu' || status === 'iade') updateData.readySince = new Date();
    if (externalServiceName !== undefined) updateData.externalServiceName = externalServiceName;
    if (externalCost !== undefined) updateData.externalCost = externalCost;
    if (externalSentAction) updateData.externalSentAt = new Date();
    if (externalReturnedAction) updateData.externalReturnedAt = new Date();

    const ticketId = parseInt(req.params.id);

    await db.transaction(async (tx) => {
      const [ticketRec] = await tx.select().from(tickets).where(eq(tickets.id, ticketId)).limit(1);
      const fromStatus = ticketRec?.status || null;

      await tx.update(tickets).set(updateData).where(eq(tickets.id, ticketId));

      if (status && status !== fromStatus) {
        const changedById = (req as any).adminUser.userId;
        await tx.insert(serviceStatusLogs).values({
          tenantId: 1,
          ticketId,
          fromStatus: fromStatus,
          toStatus: status,
          changedById,
          notes: technicianNotes || 'Durum güncellendi.',
        });

        if (status === 'musteri_onayi_bekliyor') {
          const partsRows = await tx.select({ totalPrice: ticketParts.totalPrice }).from(ticketParts)
            .where(and(eq(ticketParts.ticketId, ticketId), sql`${ticketParts.removedAt} IS NULL`));
          const partsTotal = partsRows.reduce((s, p) => s + parseFloat(p.totalPrice || '0'), 0);
          const laborCostVal = parseFloat((laborCost !== undefined ? laborCost : ticketRec?.laborCost) || '0');
          await tx.insert(ticketApprovalRequests).values({
            ticketId,
            channel: 'portal',
            quotedAmount: (partsTotal + laborCostVal).toFixed(2),
            createdBy: changedById,
          }).catch((e) => console.error('ticketApprovalRequests insert error:', e));
        }
      }

      if (customerName || customerPhone || customerEmail || address !== undefined) {
        if (ticketRec?.userId) {
          const uId = ticketRec.userId;
          const userUpdate: any = {};
          if (customerName) {
            const parts = customerName.split(' ');
            userUpdate.firstName = parts[0];
            userUpdate.lastName = parts.slice(1).join(' ');
          }
          if (customerPhone !== undefined) userUpdate.phone = customerPhone;
          if (customerEmail !== undefined) {
            const duplicateEmailUser = await tx.select().from(users).where(eq(users.email, customerEmail)).limit(1);
            if (duplicateEmailUser.length === 0 || duplicateEmailUser[0].id === uId) {
              userUpdate.email = customerEmail;
            }
          }
          if (address !== undefined) userUpdate.address = address;

          if (Object.keys(userUpdate).length > 0) {
            await tx.update(users).set(userUpdate).where(eq(users.id, uId));
          }
        }
      }

      const deviceFieldsProvided = [deviceType, deviceBrand, deviceModel, imei, deviceSerial, patternLock, pinPassword, deviceEmail, deviceEmailPassword, deviceTypeId, color, variant].some((v) => v !== undefined);
      if (deviceFieldsProvided) {
        const deviceUpdate: any = {};
        if (deviceType !== undefined) deviceUpdate.deviceType = deviceType;
        if (deviceBrand !== undefined) deviceUpdate.brand = deviceBrand;
        if (deviceModel !== undefined) deviceUpdate.model = deviceModel;
        if (imei !== undefined) deviceUpdate.imei = imei;
        if (deviceSerial !== undefined) deviceUpdate.serialNumber = deviceSerial;
        if (patternLock !== undefined) deviceUpdate.patternLock = encryptField(patternLock);
        if (pinPassword !== undefined) deviceUpdate.pinPassword = encryptField(pinPassword);
        if (deviceEmail !== undefined) deviceUpdate.deviceEmail = deviceEmail;
        if (deviceEmailPassword !== undefined) deviceUpdate.deviceEmailPassword = encryptField(deviceEmailPassword);
        if (deviceTypeId !== undefined) deviceUpdate.deviceTypeId = deviceTypeId ? parseInt(deviceTypeId as string) : null;
        if (color !== undefined) deviceUpdate.color = color;
        if (variant !== undefined) deviceUpdate.variant = variant;

        if (ticketRec?.deviceId) {
          await tx.update(devices).set(deviceUpdate).where(eq(devices.id, ticketRec.deviceId));
        } else if (deviceType || deviceBrand || deviceModel) {
          const newDevice = await tx.insert(devices).values({
            tenantId: 1,
            userId: ticketRec?.userId || null,
            deviceType: deviceType || 'Bilinmeyen',
            brand: deviceBrand || '',
            model: deviceModel || '',
            name: `${deviceBrand || ''} ${deviceModel || ''}`.trim() || deviceType || 'Cihaz',
            ...deviceUpdate,
          });
          const newDeviceId = (newDevice[0] as any).insertId;
          await tx.update(tickets).set({ deviceId: newDeviceId }).where(eq(tickets.id, ticketId));
        }
      }
    });

    if (status === 'teslim_edildi') {
      const ticketId = parseInt(req.params.id);
      const ticket = await db.select().from(tickets).where(eq(tickets.id, ticketId)).limit(1);
      if (ticket.length > 0 && ticket[0].dealerId) {
        const dealerId = ticket[0].dealerId;
        const parts = await db.select().from(ticketParts).where(and(eq(ticketParts.ticketId, ticketId), sql`${ticketParts.removedAt} IS NULL`));
        const partsTotal = parts.reduce((sum, p) => sum + parseFloat(p.totalPrice || '0'), 0);
        const laborCostVal = parseFloat(ticket[0].laborCost || '0');
        const grandTotal = partsTotal + laborCostVal;

        if (grandTotal > 0) {
          const existing = await db.select().from(dealerLedger)
            .where(and(
              eq(dealerLedger.ticketId, ticketId),
              eq(dealerLedger.type, 'debit'),
              eq(dealerLedger.isReversed, false)
            )).limit(1);

          if (existing.length === 0) {
            const company = await db.select().from(companies).where(eq(companies.id, dealerId)).limit(1);
            const dueDays = company[0]?.dealerDueDays || 0;
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + dueDays);

            await db.insert(dealerLedger).values({
              tenantId: 1,
              dealerCompanyId: dealerId,
              ticketId,
              type: 'debit',
              amount: grandTotal.toFixed(2),
              currency: 'TRY',
              description: `${ticket[0].ticketNumber} nolu cihaz teslim edildi. (İşçilik: ${laborCostVal.toFixed(2)} TL, Parça: ${partsTotal.toFixed(2)} TL)`,
              dueDate: dueDate,
            });
          }
        }
      }
    }

    if (status) {
      triggerStatusNotifications(parseInt(req.params.id), status).catch(console.error);
    }

    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

ticketsRouter.get('/api/admin/tickets/:id/status-logs', requireAdmin, async (req, res) => {
  try {
    const ticketId = parseInt(req.params.id);
    const logs = await db.select({
      id: serviceStatusLogs.id,
      fromStatus: serviceStatusLogs.fromStatus,
      toStatus: serviceStatusLogs.toStatus,
      notes: serviceStatusLogs.notes,
      createdAt: serviceStatusLogs.createdAt,
      changedByName: sql<string>`CONCAT(${users.firstName}, ' ', COALESCE(${users.lastName}, ''))`
    }).from(serviceStatusLogs)
      .leftJoin(users, eq(serviceStatusLogs.changedById, users.id))
      .where(eq(serviceStatusLogs.ticketId, ticketId))
      .orderBy(desc(serviceStatusLogs.createdAt));
    res.json(logs);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

ticketsRouter.get('/api/admin/tickets/:id/activity', requireAdmin, async (req, res) => {
  try {
    const ticketId = parseInt(req.params.id);

    const [statusRows, noteRows, auditRows] = await Promise.all([
      db.select({
        id: serviceStatusLogs.id,
        fromStatus: serviceStatusLogs.fromStatus,
        toStatus: serviceStatusLogs.toStatus,
        notes: serviceStatusLogs.notes,
        createdAt: serviceStatusLogs.createdAt,
        actorName: sql<string>`CONCAT(${users.firstName}, ' ', COALESCE(${users.lastName}, ''))`,
      }).from(serviceStatusLogs)
        .leftJoin(users, eq(serviceStatusLogs.changedById, users.id))
        .where(eq(serviceStatusLogs.ticketId, ticketId)),
      db.select({
        id: ticketMessages.id,
        message: ticketMessages.message,
        createdAt: ticketMessages.createdAt,
        actorName: sql<string>`CONCAT(${users.firstName}, ' ', COALESCE(${users.lastName}, ''))`,
      }).from(ticketMessages)
        .leftJoin(users, eq(ticketMessages.senderId, users.id))
        .where(eq(ticketMessages.ticketId, ticketId)),
      db.select({
        id: auditLogs.id,
        action: auditLogs.action,
        details: auditLogs.details,
        createdAt: auditLogs.createdAt,
        actorName: sql<string>`CONCAT(${users.firstName}, ' ', COALESCE(${users.lastName}, ''))`,
      }).from(auditLogs)
        .leftJoin(users, eq(auditLogs.userId, users.id))
        .where(and(eq(auditLogs.entityType, 'Ticket'), eq(auditLogs.entityId, ticketId))),
    ]);

    const feed = [
      ...statusRows.map(r => ({
        id: `status-${r.id}`, type: 'status' as const, createdAt: r.createdAt,
        actorName: r.actorName?.trim() || 'Sistem',
        fromStatus: r.fromStatus, toStatus: r.toStatus, notes: r.notes,
      })),
      ...noteRows.map(r => ({
        id: `note-${r.id}`, type: 'note' as const, createdAt: r.createdAt,
        actorName: r.actorName?.trim() || 'Sistem', message: r.message,
      })),
      ...auditRows.map(r => ({
        id: `audit-${r.id}`, type: 'audit' as const, createdAt: r.createdAt,
        actorName: r.actorName?.trim() || 'Sistem', action: r.action, details: r.details,
      })),
    ].sort((a, b) => new Date(a.createdAt as any).getTime() - new Date(b.createdAt as any).getTime());

    res.json(feed);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

ticketsRouter.delete('/api/admin/tickets/:id', requireAdmin, async (req, res) => {
  try {
    const ticketId = parseInt(req.params.id);
    await db.transaction(async (tx) => {
      await tx.delete(ticketParts).where(eq(ticketParts.ticketId, ticketId));
      await tx.delete(ticketAttachments).where(eq(ticketAttachments.ticketId, ticketId));
      await tx.delete(ticketMessages).where(eq(ticketMessages.ticketId, ticketId));
      await tx.delete(tickets).where(eq(tickets.id, ticketId));
    });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

ticketsRouter.post('/api/admin/tickets/:id/whatsapp-trigger', requireAdmin, async (req, res) => {
  try {
    const ticketInfo = await db.select({
      ticketNumber: tickets.ticketNumber,
      customerName: users.firstName,
      customerPhone: users.phone,
      deviceBrand: devices.brand,
      deviceModel: devices.model,
      deviceType: devices.deviceType,
      status: tickets.status
    }).from(tickets)
      .leftJoin(users, eq(tickets.userId, users.id))
      .leftJoin(devices, eq(tickets.deviceId, devices.id))
      .where(eq(tickets.id, parseInt(req.params.id)))
      .limit(1);

    if (ticketInfo.length === 0) {
      return res.status(404).json({ error: 'Kayıt bulunamadı' });
    }

    const t = ticketInfo[0];
    if (!t.customerPhone) {
      return res.status(400).json({ error: 'Müşteri telefon numarası tanımlı değil' });
    }

    const allSettings = await db.select().from(settings);
    const settingsMap: Record<string, string> = {};
    allSettings.forEach(s => { settingsMap[s.key] = s.value || ''; });

    const deviceName = `${t.deviceBrand || ''} ${t.deviceModel || ''}`.trim() || t.deviceType || 'Cihaz';
    const statusLabel = TICKET_STATUS_LABELS[t.status || 'yeni'] || t.status || 'Yeni';
    const siteUrl = settingsMap.siteBaseUrl || 'https://kerimbilgisayar.com';
    const trackingLink = `${siteUrl}/ariza-sorgulama?no=${t.ticketNumber}`;

    const defaultTemplate = "Sayın [Musteri], [No] numaralı [Cihaz] cihazınızın servis durumu '[Durum]' olarak güncellenmiştir. Takip linkiniz: [Link]";
    const template = settingsMap.whatsappTemplate || defaultTemplate;

    const text = template
      .replace('[Musteri]', t.customerName || 'Müşterimiz')
      .replace('[No]', t.ticketNumber || '')
      .replace('[Cihaz]', deviceName)
      .replace('[Durum]', statusLabel)
      .replace('[Link]', trackingLink);

    await sendWhatsAppMessage(t.customerPhone, text);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// TICKET PARTS
ticketsRouter.get('/api/admin/tickets/:id/parts', requireAdmin, async (req, res) => {
  try {
    const parts = await db.select({
      id: ticketParts.id,
      ticketId: ticketParts.ticketId,
      stockItemId: ticketParts.stockItemId,
      name: ticketParts.name,
      brand: ticketParts.brand,
      quantity: ticketParts.quantity,
      unitPrice: ticketParts.unitPrice,
      totalPrice: ticketParts.totalPrice,
      vatRate: ticketParts.vatRate,
      source: ticketParts.source,
      createdAt: ticketParts.createdAt,
      stockItemName: stockItems.name,
      stockItemSku: stockItems.sku
    }).from(ticketParts)
      .leftJoin(stockItems, eq(ticketParts.stockItemId, stockItems.id))
      .where(and(eq(ticketParts.ticketId, parseInt(req.params.id)), sql`${ticketParts.removedAt} IS NULL`))
      .orderBy(desc(ticketParts.createdAt));

    res.json(parts.map(p => ({ ...p, name: p.name || p.stockItemName })));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

ticketsRouter.post('/api/admin/tickets/:id/parts', requireAdmin, async (req, res) => {
  try {
    const { stockItemId, quantity, unitPrice, name, brand, vatRate } = req.body;
    const q = parseInt(quantity) || 1;
    const price = parseFloat(unitPrice) || 0;
    const total = q * price;
    const vat = vatRate !== undefined ? parseInt(vatRate) : 20;
    const createdBy = (req as any).adminUser?.userId || null;
    const isManual = !stockItemId;

    if (isManual && !name?.trim()) {
      return res.status(400).json({ error: 'Manuel kalem için isim zorunludur.' });
    }

    await db.transaction(async (tx) => {
      if (isManual) {
        await tx.insert(ticketParts).values({
          tenantId: 1,
          ticketId: parseInt(req.params.id),
          stockItemId: null,
          name: name.trim(),
          brand: brand?.trim() || 'Manuel',
          quantity: q,
          unitPrice: price.toString(),
          totalPrice: total.toString(),
          vatRate: vat,
          source: 'manuel',
          createdBy,
        });
        return;
      }

      const item = await tx.select().from(stockItems).where(eq(stockItems.id, parseInt(stockItemId))).limit(1);
      await tx.insert(ticketParts).values({
        tenantId: 1,
        ticketId: parseInt(req.params.id),
        stockItemId: parseInt(stockItemId),
        name: item[0]?.name || null,
        brand: item[0]?.brand || null,
        quantity: q,
        unitPrice: price.toString(),
        totalPrice: total.toString(),
        vatRate: vat,
        source: 'stok',
        createdBy,
      });

      if (item.length > 0) {
        const newStock = (item[0].currentStock || 0) - q;
        await tx.update(stockItems).set({ currentStock: newStock }).where(eq(stockItems.id, parseInt(stockItemId)));
      }
    });

    await db.insert(auditLogs).values({
      tenantId: 1,
      userId: createdBy,
      action: 'ticket_part.added',
      entityType: 'Ticket',
      entityId: parseInt(req.params.id),
      details: { name: isManual ? name?.trim() : undefined, stockItemId: isManual ? null : parseInt(stockItemId), quantity: q, unitPrice: price, source: isManual ? 'manuel' : 'stok' },
    }).catch((e) => console.error('auditLogs insert error:', e));

    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

ticketsRouter.delete('/api/admin/tickets/parts/:partId', requireAdmin, async (req, res) => {
  try {
    const removedBy = (req as any).adminUser?.userId || null;
    let affectedTicketId: number | null = null;
    let removedPartName: string | null = null;
    await db.transaction(async (tx) => {
      const part = await tx.select().from(ticketParts).where(eq(ticketParts.id, parseInt(req.params.partId))).limit(1);
      if (part.length > 0) {
        affectedTicketId = part[0].ticketId;
        removedPartName = part[0].name;
        if (part[0].stockItemId) {
          const item = await tx.select().from(stockItems).where(eq(stockItems.id, part[0].stockItemId)).limit(1);
          if (item.length > 0) {
            const newStock = (item[0].currentStock || 0) + part[0].quantity;
            await tx.update(stockItems).set({ currentStock: newStock }).where(eq(stockItems.id, part[0].stockItemId));
          }
        }
        await tx.update(ticketParts).set({ removedAt: new Date(), removedBy }).where(eq(ticketParts.id, parseInt(req.params.partId)));
      }
    });
    if (affectedTicketId) {
      await db.insert(auditLogs).values({
        tenantId: 1,
        userId: removedBy,
        action: 'ticket_part.removed',
        entityType: 'Ticket',
        entityId: affectedTicketId,
        details: { name: removedPartName },
      }).catch((e) => console.error('auditLogs insert error:', e));
    }
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// TICKET MESSAGES
ticketsRouter.get('/api/admin/ticket-messages/:ticketId', requireAdmin, async (req, res) => {
  try {
    const msgs = await db.select({
      id: ticketMessages.id,
      message: ticketMessages.message,
      isInternal: ticketMessages.isInternal,
      createdAt: ticketMessages.createdAt,
      senderName: users.firstName,
      senderLastName: users.lastName,
    }).from(ticketMessages)
      .leftJoin(users, eq(ticketMessages.senderId, users.id))
      .where(eq(ticketMessages.ticketId, parseInt(req.params.ticketId)))
      .orderBy(asc(ticketMessages.createdAt));
    res.json(msgs.map(m => ({
      ...m,
      senderName: `${m.senderName || ''} ${m.senderLastName || ''}`.trim() || 'Sistem'
    })));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

ticketsRouter.post('/api/admin/ticket-messages', requireAdmin, async (req, res) => {
  try {
    const { ticketId, message, isInternal } = req.body;
    const adminUser = (req as any).adminUser;
    await db.insert(ticketMessages).values({
      tenantId: 1,
      ticketId: parseInt(ticketId),
      senderId: adminUser.userId,
      message,
      isInternal: isInternal !== false,
    });
    await db.update(tickets).set({ updatedAt: new Date() }).where(eq(tickets.id, parseInt(ticketId)));
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// LEAD TO TICKET
ticketsRouter.post('/api/admin/leads/:id/convert', requireAdmin, async (req, res) => {
  try {
    const lead = await db.select().from(leads).where(eq(leads.id, parseInt(req.params.id))).limit(1);
    if (lead.length === 0) return res.status(404).json({ error: 'Lead bulunamadı' });
    const l = lead[0];

    let userId: number | null = null;
    if (l.phone) {
      const existing = await db.select().from(users).where(eq(users.phone, l.phone || '')).limit(1);
      if (existing.length > 0) {
        userId = existing[0].id;
      } else {
        const nameParts = (l.name || '').split(' ');
        const newUser = await db.insert(users).values({
          tenantId: 1,
          firstName: nameParts[0] || l.name || 'İsimsiz',
          lastName: nameParts.slice(1).join(' ') || '',
          email: l.email || `${l.phone}@noemail.local`,
          phone: l.phone || '',
          roleType: 'customer',
        });
        userId = (newUser[0] as any).insertId;
      }
    }

    const ticketNumber = `SRV-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;
    await db.insert(tickets).values({
      tenantId: 1,
      ticketNumber,
      userId,
      type: 'ariza',
      subject: `Randevu Dönüşümü: ${l.name}`,
      description: l.notes || 'Randevu formu üzerinden alınan talep.',
      priority: 'normal',
      status: 'yeni',
      cost: '0.00',
    });

    await db.update(leads).set({ status: 'converted' }).where(eq(leads.id, parseInt(req.params.id)));

    res.json({ success: true, ticketNumber });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

