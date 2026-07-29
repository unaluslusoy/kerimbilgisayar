import express from 'express';
import crypto from 'crypto';
import { eq, and, or, desc, sql, like } from 'drizzle-orm';
import { db } from '../db/index';
import { customers, users, companies, customerSubscriptions, plans } from '../db/schema';
import { requireAdmin, hashPassword } from '../server/middleware';
import { generateSlug } from '../server/utils';

export const customersRouter = express.Router();

async function ensureCustomerRowsFromUsers(): Promise<number> {
  const customerUsers = await db.select().from(users).where(eq(users.roleType, 'customer'));
  let migrated = 0;

  for (const user of customerUsers) {
    const existingCustomer = await db.select().from(customers).where(eq(customers.userId, user.id)).limit(1);
    if (existingCustomer.length > 0) continue;

    await db.insert(customers).values({
      tenantId: user.tenantId || 1,
      userId: user.id,
      companyId: user.companyId || null,
      accountCode: `MUS-${String(user.id).padStart(5, '0')}`,
      balance: '0.00',
      creditLimit: '0.00',
      notes: 'Eski müşteri kullanıcı kaydından otomatik taşındı.',
      isActive: user.isActive !== false,
    });
    migrated += 1;
  }

  return migrated;
}

customersRouter.get('/api/admin/customers/search', requireAdmin, async (req, res) => {
  try {
    const q = (req.query.query as string || '').trim().toLowerCase();
    if (!q) {
      return res.json([]);
    }
    const matched = await db.select({
      id: customers.userId,
      customerId: customers.id,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      phone: users.phone,
      companyName: companies.name,
      address: companies.address,
    }).from(customers)
      .leftJoin(users, eq(customers.userId, users.id))
      .leftJoin(companies, eq(customers.companyId, companies.id))
      .where(
        or(
          like(sql<string>`LOWER(${users.firstName})`, `%${q}%`),
          like(sql<string>`LOWER(${users.lastName})`, `%${q}%`),
          like(sql<string>`LOWER(CONCAT(${users.firstName}, ' ', ${users.lastName}))`, `%${q}%`),
          like(users.phone, `%${q}%`),
          like(sql<string>`LOWER(${users.email})`, `%${q}%`)
        )
      )
      .limit(10);
    res.json(matched);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

customersRouter.get('/api/admin/customers', requireAdmin, async (req, res) => {
  try {
    const allCustomers = await db.select({
      id: customers.userId,
      customerId: customers.id,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      phone: users.phone,
      isActive: customers.isActive,
      createdAt: customers.createdAt,
      accountCode: customers.accountCode,
      balance: customers.balance,
      creditLimit: customers.creditLimit,
      notes: customers.notes,
      companyId: companies.id,
      companyName: companies.name,
      taxId: companies.taxId,
      taxOffice: companies.taxOffice,
      address: companies.address,
      sector: companies.sector,
      subscriptionId: customerSubscriptions.id,
      subscriptionStatus: customerSubscriptions.status,
      currentPeriodEnd: customerSubscriptions.currentPeriodEnd,
      planId: plans.id,
      planName: plans.name,
      planPrice: plans.price,
      planDiscountRate: plans.discountRate,
      billingCycle: plans.billingCycle,
    }).from(customers)
      .leftJoin(users, eq(customers.userId, users.id))
      .leftJoin(companies, eq(customers.companyId, companies.id))
      .leftJoin(customerSubscriptions, eq(customerSubscriptions.userId, customers.userId))
      .leftJoin(plans, eq(customerSubscriptions.planId, plans.id))
      .orderBy(desc(customers.createdAt));
    res.json(allCustomers);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

customersRouter.post('/api/admin/customers', requireAdmin, async (req, res) => {
  try {
    const { firstName, lastName, email, phone, password, companyName, taxId, taxOffice, address, sector, accountCode, balance, creditLimit, notes } = req.body;
    
    if (email) {
      const existingByEmail = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (existingByEmail.length > 0) {
        return res.status(400).json({ error: 'Bu e-posta adresiyle kayıtlı bir müşteri zaten var.' });
      }
    }
    if (phone) {
      const existingByPhone = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
      if (existingByPhone.length > 0) {
        return res.status(400).json({ error: 'Bu telefon numarasıyla kayıtlı bir müşteri zaten var.' });
      }
    }
    if (firstName) {
      const existingByName = await db.select().from(users).where(
        and(
          eq(users.firstName, firstName),
          eq(users.lastName, lastName || '')
        )
      ).limit(1);
      if (existingByName.length > 0) {
        return res.status(400).json({ error: 'Bu ad ve soyad ile kayıtlı bir müşteri zaten var.' });
      }
    }

    await db.transaction(async (tx) => {
      let companyId: number | null = null;

      if (companyName || taxId || taxOffice || address || sector) {
        const insertedCompany = await tx.insert(companies).values({
          tenantId: 1,
          name: companyName || `${firstName} ${lastName || ''}`.trim(),
          taxId: taxId || null,
          taxOffice: taxOffice || null,
          address: address || null,
          phone: phone || null,
          email: email || null,
          sector: sector || null,
          type: 'customer',
        });
        companyId = (insertedCompany[0] as any).insertId;
      }

      const insertedUser = await tx.insert(users).values({
        tenantId: 1,
        companyId,
        firstName,
        lastName: lastName || '',
        email,
        phone: phone || null,
        roleType: 'customer',
        passwordHash: await hashPassword(password || crypto.randomBytes(9).toString('base64url')),
        isActive: true,
      });
      const userId = (insertedUser[0] as any).insertId;
      
      await tx.insert(customers).values({
        tenantId: 1,
        userId,
        companyId,
        accountCode: accountCode || `MUS-${String(userId).padStart(5, '0')}`,
        balance: balance?.toString() || '0.00',
        creditLimit: creditLimit?.toString() || '0.00',
        notes: notes || null,
        isActive: true,
      });
    });

    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

customersRouter.patch('/api/admin/customers/:id', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { firstName, lastName, email, phone, isActive, companyName, taxId, taxOffice, address, sector, accountCode, balance, creditLimit, notes } = req.body;
    const existing = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (existing.length === 0 || existing[0].roleType !== 'customer') return res.status(404).json({ error: 'Müşteri bulunamadı' });

    const userUpdates: any = {};
    if (firstName !== undefined) userUpdates.firstName = firstName;
    if (lastName !== undefined) userUpdates.lastName = lastName;
    if (email !== undefined) userUpdates.email = email;
    if (phone !== undefined) userUpdates.phone = phone;
    if (isActive !== undefined) userUpdates.isActive = isActive;
    if (Object.keys(userUpdates).length > 0) await db.update(users).set(userUpdates).where(eq(users.id, id));

    const customerUpdates: any = {};
    if (accountCode !== undefined) customerUpdates.accountCode = accountCode;
    if (balance !== undefined) customerUpdates.balance = balance?.toString() || '0.00';
    if (creditLimit !== undefined) customerUpdates.creditLimit = creditLimit?.toString() || '0.00';
    if (notes !== undefined) customerUpdates.notes = notes;
    if (isActive !== undefined) customerUpdates.isActive = isActive;
    if (Object.keys(customerUpdates).length > 0) {
      const existingCustomer = await db.select().from(customers).where(eq(customers.userId, id)).limit(1);
      if (existingCustomer.length > 0) {
        await db.update(customers).set(customerUpdates).where(eq(customers.userId, id));
      } else {
        await db.insert(customers).values({
          tenantId: 1,
          userId: id,
          companyId: existing[0].companyId || null,
          accountCode: accountCode || `MUS-${String(id).padStart(5, '0')}`,
          balance: balance?.toString() || '0.00',
          creditLimit: creditLimit?.toString() || '0.00',
          notes: notes || null,
          isActive: isActive !== false,
        });
      }
    }

    const companyUpdates: any = {};
    if (companyName !== undefined) companyUpdates.name = companyName;
    if (taxId !== undefined) companyUpdates.taxId = taxId;
    if (taxOffice !== undefined) companyUpdates.taxOffice = taxOffice;
    if (address !== undefined) companyUpdates.address = address;
    if (sector !== undefined) companyUpdates.sector = sector;
    if (phone !== undefined) companyUpdates.phone = phone;
    if (email !== undefined) companyUpdates.email = email;

    if (Object.keys(companyUpdates).length > 0) {
      if (existing[0].companyId) {
        await db.update(companies).set(companyUpdates).where(eq(companies.id, existing[0].companyId));
      } else {
        const insertedCompany = await db.insert(companies).values({
          tenantId: 1,
          name: companyName || `${firstName || existing[0].firstName} ${lastName || existing[0].lastName || ''}`.trim(),
          phone: phone || existing[0].phone || null,
          email: email || existing[0].email || null,
          type: 'customer',
          ...companyUpdates,
        });
        await db.update(users).set({ companyId: (insertedCompany[0] as any).insertId }).where(eq(users.id, id));
        await db.update(customers).set({ companyId: (insertedCompany[0] as any).insertId }).where(eq(customers.userId, id));
      }
    }
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

customersRouter.post('/api/admin/customers/migrate-from-users', requireAdmin, async (req, res) => {
  try {
    const migrated = await ensureCustomerRowsFromUsers();
    res.json({ success: true, migrated });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

customersRouter.get('/api/admin/subscription-plans', requireAdmin, async (req, res) => {
  try {
    const allPlans = await db.select().from(plans).orderBy(desc(plans.createdAt));
    res.json(allPlans);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

customersRouter.post('/api/admin/subscription-plans', requireAdmin, async (req, res) => {
  try {
    const { name, slug, description, price, discountRate, billingCycle, features, isActive } = req.body;
    await db.insert(plans).values({
      name,
      slug: slug || generateSlug(name),
      description: description || null,
      price: (price || 0).toString(),
      discountRate: (discountRate || 0).toString(),
      billingCycle: billingCycle || 'monthly',
      features: String(features || '').split('\n').map(item => item.trim()).filter(Boolean),
      isActive: isActive !== false,
    });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

customersRouter.patch('/api/admin/subscription-plans/:id', requireAdmin, async (req, res) => {
  try {
    const { name, description, price, discountRate, billingCycle, features, isActive } = req.body;
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = price.toString();
    if (discountRate !== undefined) updateData.discountRate = discountRate.toString();
    if (billingCycle !== undefined) updateData.billingCycle = billingCycle;
    if (features !== undefined) updateData.features = String(features).split('\n').map(item => item.trim()).filter(Boolean);
    if (isActive !== undefined) updateData.isActive = isActive;
    await db.update(plans).set(updateData).where(eq(plans.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

customersRouter.post('/api/admin/customers/:id/subscription', requireAdmin, async (req, res) => {
  try {
    const customerId = parseInt(req.params.id);
    const { planId, status, currentPeriodStart, currentPeriodEnd, cancelAtPeriodEnd } = req.body;
    const customer = await db.select().from(users).where(eq(users.id, customerId)).limit(1);
    if (customer.length === 0 || customer[0].roleType !== 'customer') return res.status(404).json({ error: 'Müşteri bulunamadı' });

    let companyId = customer[0].companyId;
    if (!companyId) {
      const insertedCompany = await db.insert(companies).values({
        tenantId: 1,
        name: `${customer[0].firstName} ${customer[0].lastName || ''}`.trim(),
        email: customer[0].email,
        phone: customer[0].phone,
        type: 'customer',
      });
      companyId = (insertedCompany[0] as any).insertId;
      await db.update(users).set({ companyId }).where(eq(users.id, customerId));
    }

    const existing = await db.select().from(customerSubscriptions).where(eq(customerSubscriptions.userId, customerId)).limit(1);
    const payload = {
      tenantId: 1,
      userId: customerId,
      companyId,
      planId: parseInt(planId),
      status: status || 'active',
      currentPeriodStart: currentPeriodStart ? new Date(currentPeriodStart) : new Date(),
      currentPeriodEnd: currentPeriodEnd ? new Date(currentPeriodEnd) : null,
      cancelAtPeriodEnd: !!cancelAtPeriodEnd,
    };

    if (existing.length > 0) {
      await db.update(customerSubscriptions).set(payload).where(eq(customerSubscriptions.id, existing[0].id));
    } else {
      await db.insert(customerSubscriptions).values(payload);
    }
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
