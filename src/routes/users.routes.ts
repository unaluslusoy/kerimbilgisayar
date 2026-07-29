import express from 'express';
import crypto from 'crypto';
import { eq, desc, sql } from 'drizzle-orm';
import { db } from '../db/index';
import { users, customers } from '../db/schema';
import { requireAdmin, requireRole, hashPassword } from '../server/middleware';

export const usersRouter = express.Router();

// ADMIN API — PROFILE
usersRouter.get('/api/admin/profile', requireAdmin, async (req, res) => {
  try {
    const adminId = (req as any).adminUser.userId;
    const profile = await db.select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      phone: users.phone,
      avatarUrl: users.avatarUrl,
    }).from(users).where(eq(users.id, adminId)).limit(1);
    
    if (profile.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(profile[0]);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

usersRouter.patch('/api/admin/profile', requireAdmin, async (req, res) => {
  try {
    const adminId = (req as any).adminUser.userId;
    const { firstName, lastName, email, phone, password } = req.body;
    const updates: any = {};
    if (firstName) updates.firstName = firstName;
    if (lastName) updates.lastName = lastName;
    if (email) updates.email = email;
    if (phone) updates.phone = phone;
    if (password) updates.passwordHash = password;

    await db.update(users).set(updates).where(eq(users.id, adminId));
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ADMIN API — USERS
usersRouter.get('/api/admin/users', requireAdmin, async (req, res) => {
  try {
    const allUsers = await db.select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      phone: users.phone,
      roleType: users.roleType,
      isActive: users.isActive,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
    }).from(users).where(sql`${users.roleType} <> 'customer'`).orderBy(desc(users.createdAt));
    res.json(allUsers);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

usersRouter.post('/api/admin/users', requireAdmin, requireRole('superadmin', 'tenant_admin'), async (req, res) => {
  try {
    const { firstName, lastName, email, phone, roleType, password } = req.body;
    const targetRole = roleType || 'staff';
    
    await db.transaction(async (tx) => {
      const insertedUser = await tx.insert(users).values({
        tenantId: 1,
        firstName,
        lastName: lastName || '',
        email,
        phone: phone || null,
        roleType: targetRole,
        passwordHash: await hashPassword(password || crypto.randomBytes(9).toString('base64url')),
        isActive: true,
      });
      
      if (targetRole === 'customer') {
        const userId = (insertedUser[0] as any).insertId;
        await tx.insert(customers).values({
          tenantId: 1,
          userId,
          accountCode: `MUS-${String(userId).padStart(5, '0')}`,
          balance: '0.00',
          creditLimit: '0.00',
          notes: 'Yönetim panelinden kullanıcı olarak eklendi.',
          isActive: true,
        });
      }
    });

    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

usersRouter.patch('/api/admin/users/:id', requireAdmin, requireRole('superadmin', 'tenant_admin'), async (req, res) => {
  try {
    const { isActive, roleType } = req.body;
    const updateData: any = {};
    if (isActive !== undefined) updateData.isActive = isActive;
    if (roleType) updateData.roleType = roleType;
    await db.update(users).set(updateData).where(eq(users.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
