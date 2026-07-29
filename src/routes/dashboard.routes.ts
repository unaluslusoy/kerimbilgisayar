import express from 'express';
import { eq, desc } from 'drizzle-orm';
import { db } from '../db/index';
import { tickets, users, customers, pages, blogPosts, stockItems, sales } from '../db/schema';
import { requireAdmin } from '../server/middleware';
import { TICKET_STATUS_LABELS } from '../lib/ticketStatus';

export const dashboardRouter = express.Router();

dashboardRouter.get('/api/admin/stats', requireAdmin, async (req, res) => {
  try {
    const allTickets = await db.select().from(tickets);
    const newTickets = allTickets.filter(t => t.status === 'yeni');
    
    const allUsers = await db.select().from(users);
    const allCustomers = await db.select().from(customers).where(eq(customers.isActive, true));

    const allPages = await db.select().from(pages);
    const allBlogs = await db.select().from(blogPosts);

    const allStock = await db.select().from(stockItems).where(eq(stockItems.isActive, true));
    const stockAlertCount = allStock.filter(s => (s.currentStock || 0) <= (s.minStockLevel || 0)).length;

    const allSales = await db.select().from(sales).where(eq(sales.status, 'odendi'));
    const totalRevenue = allSales.reduce((sum, s) => sum + parseFloat(s.totalAmount || '0'), 0);
    const salesCount = allSales.length;

    const dailyMap: Record<string, { date: string; amount: number; count: number }> = {};
    const formatLocDate = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = formatLocDate(d);
      const label = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
      dailyMap[dateStr] = { date: label, amount: 0, count: 0 };
    }

    for (const s of allSales) {
      if (s.createdAt) {
        const dateStr = formatLocDate(new Date(s.createdAt));
        if (dailyMap[dateStr]) {
          dailyMap[dateStr].amount += parseFloat(s.totalAmount || '0');
          dailyMap[dateStr].count += 1;
        }
      }
    }

    const dailySales = Object.keys(dailyMap).sort().map(k => ({
      date: dailyMap[k].date,
      amount: Math.round(dailyMap[k].amount),
      count: dailyMap[k].count
    }));

    const statusCounts = allTickets.reduce((acc: any, t) => {
      acc[t.status] = (acc[t.status] || 0) + 1;
      return acc;
    }, {});

    const statusDistribution = Object.keys(statusCounts).map(k => ({
      name: TICKET_STATUS_LABELS[k] || k,
      value: statusCounts[k]
    }));

    const recentTickets = await db.select({
      id: tickets.id,
      ticketNumber: tickets.ticketNumber,
      subject: tickets.subject,
      status: tickets.status,
      customerName: users.firstName,
      customerLastName: users.lastName
    }).from(tickets)
      .leftJoin(users, eq(tickets.userId, users.id))
      .orderBy(desc(tickets.createdAt))
      .limit(5);

    res.json({
      ticketCount: allTickets.length,
      newLeads: newTickets.length,
      userCount: allUsers.length,
      customerCount: allCustomers.length,
      stockAlerts: stockAlertCount,
      pageCount: allPages.length,
      blogCount: allBlogs.length,
      totalRevenue,
      salesCount,
      dailySales,
      statusDistribution,
      recentTickets: recentTickets.map(t => ({
        ...t,
        customerName: `${t.customerName || ''} ${t.customerLastName || ''}`.trim() || 'Müşteri'
      }))
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
