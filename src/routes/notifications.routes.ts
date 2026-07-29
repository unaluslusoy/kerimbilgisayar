import express from 'express';
import { eq, desc } from 'drizzle-orm';
import { db } from '../db/index';
import { notifications, tickets } from '../db/schema';
import { requireAdmin } from '../server/middleware';

export const notificationsRouter = express.Router();

notificationsRouter.get('/api/admin/notifications', requireAdmin, async (req, res) => {
  try {
    const rows = await db.select().from(notifications)
      .orderBy(desc(notifications.createdAt))
      .limit(150);
    
    if (rows.length === 0) {
      const recentTickets = await db.select({
        id: tickets.id,
        ticketNumber: tickets.ticketNumber,
        subject: tickets.subject,
        status: tickets.status,
        createdAt: tickets.createdAt
      }).from(tickets)
        .orderBy(desc(tickets.createdAt))
        .limit(5);

      const dynamicNotifications = recentTickets.map(t => ({
        id: t.id,
        title: `Yeni Servis Kaydı: ${t.ticketNumber}`,
        message: `${t.subject} konulu cihaz servise alındı.`,
        type: 'info',
        isRead: false,
        linkUrl: `/admin/servis`,
        createdAt: t.createdAt
      }));
      return res.json(dynamicNotifications);
    }
    res.json(rows);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

notificationsRouter.post('/api/admin/notifications/mark-read', requireAdmin, async (req, res) => {
  try {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.isRead, false));
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

notificationsRouter.post('/api/admin/notifications/:id/read', requireAdmin, async (req, res) => {
  try {
    await db.update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

notificationsRouter.delete('/api/admin/notifications/:id', requireAdmin, async (req, res) => {
  try {
    await db.delete(notifications)
      .where(eq(notifications.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
