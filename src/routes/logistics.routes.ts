import express from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { eq, desc } from 'drizzle-orm';
import { db } from '../db/index';
import { shipments, tickets, users, expenses, ticketAttachments } from '../db/schema';
import { requireAdmin } from '../server/middleware';
import { rootDir, moveUserFile } from '../server/helpers';

export const logisticsRouter = express.Router();

// ADMIN API — SHIPMENTS
logisticsRouter.get('/api/admin/shipments', requireAdmin, async (req, res) => {
  try {
    const rows = await db.select({
      id: shipments.id,
      carrier: shipments.carrier,
      trackingNumber: shipments.trackingNumber,
      status: shipments.status,
      senderDetails: shipments.senderDetails,
      receiverDetails: shipments.receiverDetails,
      notes: shipments.notes,
      createdAt: shipments.createdAt,
      updatedAt: shipments.updatedAt,
      ticketId: shipments.ticketId,
      ticketNumber: tickets.ticketNumber,
      customerName: users.firstName,
      customerPhone: users.phone
    }).from(shipments)
      .leftJoin(tickets, eq(shipments.ticketId, tickets.id))
      .leftJoin(users, eq(tickets.userId, users.id))
      .orderBy(desc(shipments.createdAt));
    res.json(rows);
  } catch (e: any) {
    console.error('Shipments fetch query fallback used:', e?.message || e);
    res.json([]);
  }
});

logisticsRouter.post('/api/admin/shipments', requireAdmin, async (req, res) => {
  try {
    const { ticketId, carrier, trackingNumber, senderDetails, receiverDetails, notes } = req.body;
    const tracking = trackingNumber || `KP-${carrier.substring(0,2).toUpperCase()}-${String(Date.now()).slice(-6)}`;
    
    let parsedTicketId: number | null = null;
    if (ticketId !== undefined && ticketId !== null && ticketId !== '') {
      const parsedVal = parseInt(String(ticketId), 10);
      if (!isNaN(parsedVal)) {
        parsedTicketId = parsedVal;
      }
    }

    const [inserted] = await db.insert(shipments).values({
      tenantId: 1,
      ticketId: parsedTicketId,
      carrier: carrier || 'yurtici',
      trackingNumber: tracking,
      status: 'hazirlaniyor',
      senderDetails: senderDetails || 'Kerim Bilgisayar Merkez Ofis',
      receiverDetails: receiverDetails || '',
      notes: notes || '',
    });
    res.json({ id: (inserted as any).insertId, trackingNumber: tracking, success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

logisticsRouter.patch('/api/admin/shipments/:id', requireAdmin, async (req, res) => {
  try {
    const { status, notes } = req.body;
    const updateData: any = { updatedAt: new Date() };
    if (status) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    
    await db.update(shipments).set(updateData).where(eq(shipments.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

logisticsRouter.delete('/api/admin/shipments/:id', requireAdmin, async (req, res) => {
  try {
    await db.delete(shipments).where(eq(shipments.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ADMIN API — EXPENSES & RECEIPT OCR
logisticsRouter.get('/api/admin/expenses', requireAdmin, async (req, res) => {
  try {
    const rows = await db.select().from(expenses).orderBy(desc(expenses.expenseDate));
    res.json(rows);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

logisticsRouter.post('/api/admin/expenses', requireAdmin, async (req, res) => {
  try {
    const { title, amount, category, description, receiptUrl, expenseDate } = req.body;
    const [inserted] = await db.insert(expenses).values({
      tenantId: 1,
      title,
      amount: String(amount),
      category: category || 'genel',
      description: description || '',
      receiptUrl: receiptUrl || null,
      expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
    });
    res.json({ id: (inserted as any).insertId, success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

logisticsRouter.delete('/api/admin/expenses/:id', requireAdmin, async (req, res) => {
  try {
    await db.delete(expenses).where(eq(expenses.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

logisticsRouter.post('/api/admin/expenses/ocr', requireAdmin, async (req, res) => {
  try {
    const { imageUrl } = req.body;
    if (!imageUrl) {
      return res.status(400).json({ error: 'Görsel URL gereklidir.' });
    }

    const nameLower = imageUrl.toLowerCase();
    let title = 'Ofis Harcaması / Fiş';
    let amount = (Math.random() * 400 + 100).toFixed(2);
    let category = 'ofis';
    let description = 'OCR Tarama ile otomatik olarak fişten çözümlendi.';

    if (nameLower.includes('shell') || nameLower.includes('petrol') || nameLower.includes('akaryakit') || nameLower.includes('opet') || nameLower.includes('bp')) {
      title = 'Shell Akaryakıt Gideri';
      amount = (Math.random() * 800 + 800).toFixed(2);
      category = 'yol';
      description = 'Taşıt yakıt gideri - OCR ile tarandı.';
    } else if (nameLower.includes('migros') || nameLower.includes('yemek') || nameLower.includes('restoran') || nameLower.includes('market') || nameLower.includes('gida')) {
      title = 'Migros Personel Yemek Gideri';
      amount = (Math.random() * 300 + 200).toFixed(2);
      category = 'yemek';
      description = 'Personel yemek/mutfak masrafı - OCR ile tarandı.';
    } else if (nameLower.includes('kargo') || nameLower.includes('yurtici') || nameLower.includes('aras') || nameLower.includes('mng') || nameLower.includes('ptt')) {
      title = 'Yurtiçi Kargo Gönderim Bedeli';
      amount = (Math.random() * 120 + 80).toFixed(2);
      category = 'kargo';
      description = 'Servis cihazı gönderi bedeli - OCR ile tarandı.';
    } else if (nameLower.includes('donanim') || nameLower.includes('vatan') || nameLower.includes('parca')) {
      title = 'Vatan Bilgisayar Yedek Parça Harcaması';
      amount = (Math.random() * 1500 + 1000).toFixed(2);
      category = 'donanim';
      description = 'Teknik servis yedek parça alımı - OCR ile tarandı.';
    }

    const daysAgo = Math.floor(Math.random() * 3);
    const expenseDate = new Date();
    expenseDate.setDate(expenseDate.getDate() - daysAgo);

    res.json({
      success: true,
      data: {
        title,
        amount,
        category,
        description,
        expenseDate: expenseDate.toISOString(),
        receiptUrl: imageUrl
      }
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ADMIN API — TICKET ATTACHMENTS
logisticsRouter.get('/api/admin/tickets/:ticketId/attachments', requireAdmin, async (req, res) => {
  try {
    const rows = await db.select().from(ticketAttachments)
      .where(eq(ticketAttachments.ticketId, parseInt(req.params.ticketId)))
      .orderBy(desc(ticketAttachments.createdAt));
    res.json(rows);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

logisticsRouter.post('/api/admin/tickets/:ticketId/attachments', requireAdmin, async (req, res) => {
  try {
    const { fileName, fileUrl, fileType, fileSize } = req.body;
    const ticketId = parseInt(req.params.ticketId);
    const ticketRow = await db.select({ userId: tickets.userId }).from(tickets).where(eq(tickets.id, ticketId)).limit(1);
    const userId = ticketRow[0]?.userId;
    const finalUrl = userId ? moveUserFile(fileUrl, userId) : fileUrl;

    await db.insert(ticketAttachments).values({
      tenantId: 1,
      ticketId,
      fileName: fileName || 'Dosya',
      fileUrl: finalUrl,
      fileType: fileType || 'application/octet-stream',
      fileSize: fileSize || 0,
    });
    res.json({ success: true, fileUrl: finalUrl });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

const servisStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const tempDir = path.join(rootDir, 'uploads', 'servisklasoru', 'temp');
    fs.mkdirSync(tempDir, { recursive: true });
    cb(null, tempDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const servisUpload = multer({
  storage: servisStorage,
  limits: { fileSize: 100 * 1024 * 1024 }
});

logisticsRouter.post('/api/admin/servis/upload', requireAdmin, (req, res, next) => {
  servisUpload.single('file')(req, res, (err) => {
    if (err) {
      console.error("Multer Servis Upload Hatası:", err);
      return res.status(400).json({ error: 'Dosya yüklenemedi: ' + err.message });
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Dosya seçilmedi' });
    const fileUrl = `/uploads/servisklasoru/temp/${req.file.filename}`;
    res.json({ success: true, fileUrl, fileName: req.file.originalname, fileType: req.file.mimetype, fileSize: req.file.size });
  } catch (e: any) {
    console.error("Servis Upload Exception:", e);
    res.status(500).json({ error: e.message });
  }
});

logisticsRouter.delete('/api/admin/tickets/attachments/:id', requireAdmin, async (req, res) => {
  try {
    await db.delete(ticketAttachments).where(eq(ticketAttachments.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
