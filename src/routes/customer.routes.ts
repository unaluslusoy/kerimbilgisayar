import express from 'express';
import crypto from 'crypto';
import { eq, desc } from 'drizzle-orm';
import { db } from '../db/index';
import { users, customers, tickets, devices } from '../db/schema';
import {
  hashPassword,
  verifyPassword,
  signToken,
  requireCustomer,
  loginLimiter,
  CUSTOMER_TOKEN_TTL
} from '../server/middleware';

export const customerRouter = express.Router();

customerRouter.post('/api/customer/register', loginLimiter, async (req, res) => {
  try {
    const { firstName, lastName, email, phone, password } = req.body;
    if (!firstName || !email || !password) {
      return res.status(400).json({ error: 'Eksik bilgi' });
    }
    
    const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing.length > 0) {
      if (!existing[0].passwordHash) {
        await db.transaction(async (tx) => {
          await tx.update(users).set({ 
            passwordHash: await hashPassword(password), 
            firstName, 
            lastName: lastName || '', 
            phone: phone || null 
          }).where(eq(users.id, existing[0].id));
          
          const existingCustomer = await tx.select().from(customers).where(eq(customers.userId, existing[0].id)).limit(1);
          if (existingCustomer.length === 0) {
            await tx.insert(customers).values({
              tenantId: existing[0].tenantId || 1,
              userId: existing[0].id,
              companyId: existing[0].companyId || null,
              accountCode: `MUS-${String(existing[0].id).padStart(5, '0')}`,
              balance: '0.00',
              creditLimit: '0.00',
              notes: 'Müşteri kaydı esnasında otomatik oluşturuldu.',
              isActive: true,
            });
          }
        });
        return res.json({ success: true });
      }
      return res.status(400).json({ error: 'Bu e-posta zaten kullanımda' });
    }

    await db.transaction(async (tx) => {
      const insertedUser = await tx.insert(users).values({
        tenantId: 1,
        firstName,
        lastName: lastName || '',
        email,
        phone: phone || null,
        passwordHash: await hashPassword(password),
        roleType: 'customer',
        isActive: true,
      });
      const userId = (insertedUser[0] as any).insertId;

      await tx.insert(customers).values({
        tenantId: 1,
        userId,
        accountCode: `MUS-${String(userId).padStart(5, '0')}`,
        balance: '0.00',
        creditLimit: '0.00',
        notes: 'Müşteri kayıt esnasında otomatik oluşturuldu.',
        isActive: true,
      });
    });

    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

customerRouter.post('/api/customer/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    const userRes = await db.select().from(users).where(eq(users.email, email)).limit(1);
    
    if (userRes.length === 0) return res.status(401).json({ error: 'Kullanıcı bulunamadı veya şifre hatalı' });
    
    const u = userRes[0];
    if (u.roleType !== 'customer') return res.status(403).json({ error: 'Bu alana sadece müşteriler girebilir' });

    if (!(await verifyPassword(password, u.passwordHash))) return res.status(401).json({ error: 'Kullanıcı bulunamadı veya şifre hatalı' });

    const sessionData = { userId: u.id, email: u.email, name: `${u.firstName} ${u.lastName}`, role: 'customer' };
    const token = signToken(sessionData, 'customer', CUSTOMER_TOKEN_TTL);

    await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, u.id));

    res.json({ token, user: sessionData });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

customerRouter.post('/api/customer/logout', requireCustomer, (req, res) => {
  res.json({ success: true });
});

customerRouter.get('/api/customer/me', requireCustomer, (req, res) => {
  res.json((req as any).customerUser);
});

customerRouter.get('/api/customer/tickets', requireCustomer, async (req, res) => {
  try {
    const userId = (req as any).customerUser.userId;
    const myTickets = await db.select({
      id: tickets.id,
      ticketNumber: tickets.ticketNumber,
      subject: tickets.subject,
      description: tickets.description,
      status: tickets.status,
      cost: tickets.cost,
      createdAt: tickets.createdAt,
      updatedAt: tickets.updatedAt,
      deviceName: devices.name,
      deviceType: devices.deviceType,
    }).from(tickets)
      .leftJoin(devices, eq(tickets.deviceId, devices.id))
      .where(eq(tickets.userId, userId))
      .orderBy(desc(tickets.createdAt));
      
    res.json(myTickets);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

customerRouter.post('/api/customer/tickets', requireCustomer, async (req, res) => {
  try {
    const userId = (req as any).customerUser.userId;
    const { subject, description, deviceType, brand, model } = req.body;
    
    let deviceId: number | null = null;
    if (deviceType) {
      const newDevice = await db.insert(devices).values({
        tenantId: 1, userId, deviceType, brand, model,
        name: `${brand || ''} ${model || ''}`.trim() || deviceType,
      });
      deviceId = (newDevice[0] as any).insertId;
    }

    const ticketNumber = `SRV-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;
    await db.insert(tickets).values({
      tenantId: 1, ticketNumber, userId, deviceId,
      type: 'ariza', subject, description, priority: 'normal', status: 'yeni', cost: '0.00',
      publicApprovalToken: crypto.randomBytes(24).toString('hex'),
    });

    res.json({ success: true, ticketNumber });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
