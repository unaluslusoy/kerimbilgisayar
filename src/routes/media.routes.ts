import express from 'express';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import { eq, desc, asc, sql } from 'drizzle-orm';
import { db } from '../db/index';
import { pages, mediaFolders, mediaLibrary } from '../db/schema';
import { requireAdmin } from '../server/middleware';
import { rootDir, upload } from '../server/helpers';
import { generateSlug, saveRemoteImageToMedia } from '../server/utils';

export const mediaRouter = express.Router();

// ADMIN PAGES
mediaRouter.get('/api/admin/pages', requireAdmin, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 200, 500);
    const allPages = await db.select().from(pages).orderBy(desc(pages.createdAt)).limit(limit);
    res.json(allPages);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

mediaRouter.post('/api/admin/pages', requireAdmin, async (req, res) => {
  try {
    const { title, slug, content, status, metaTitle, metaDescription } = req.body;
    await db.insert(pages).values({
      tenantId: 1,
      title,
      slug: slug || generateSlug(title),
      content,
      status: status || 'taslak',
      metaTitle,
      metaDescription,
    });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

mediaRouter.patch('/api/admin/pages/:id', requireAdmin, async (req, res) => {
  try {
    const updates = req.body;
    updates.updatedAt = new Date();
    await db.update(pages).set(updates).where(eq(pages.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

mediaRouter.delete('/api/admin/pages/:id', requireAdmin, async (req, res) => {
  try {
    await db.delete(pages).where(eq(pages.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// MEDIA FOLDERS
mediaRouter.get('/api/admin/media/folders', requireAdmin, async (req, res) => {
  try {
    const folders = await db.select().from(mediaFolders).orderBy(asc(mediaFolders.name));
    res.json(folders);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

mediaRouter.post('/api/admin/media/folders', requireAdmin, async (req, res) => {
  try {
    const { name, parentId } = req.body;
    const newFolder = await db.insert(mediaFolders).values({
      tenantId: 1,
      name,
      parentId: parentId || null
    });
    res.json({ success: true, id: (newFolder[0] as any).insertId });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

mediaRouter.put('/api/admin/media/folders/:id', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, parentId } = req.body;
    await db.update(mediaFolders).set({
      name,
      parentId: parentId || null
    }).where(eq(mediaFolders.id, id));
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

mediaRouter.delete('/api/admin/media/folders/:id', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.update(mediaLibrary).set({ folderId: null }).where(eq(mediaLibrary.folderId, id));
    await db.delete(mediaFolders).where(eq(mediaFolders.id, id));
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// MEDIA LIBRARY
mediaRouter.get('/api/admin/media', requireAdmin, async (req, res) => {
  try {
    const folderIdParam = req.query.folderId;
    let query = db.select().from(mediaLibrary);
    
    if (folderIdParam !== undefined) {
       if (folderIdParam === 'null' || folderIdParam === '') {
           query = query.where(sql`${mediaLibrary.folderId} IS NULL`) as any;
       } else {
           query = query.where(eq(mediaLibrary.folderId, parseInt(folderIdParam as string))) as any;
       }
    }
    
    const limit = Math.min(parseInt(req.query.limit as string) || 500, 1000);
    const mediaFiles = await query.orderBy(desc(mediaLibrary.createdAt)).limit(limit);
    res.json(mediaFiles);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

mediaRouter.post('/api/admin/media/upload', requireAdmin, (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      console.error("Multer Media Upload Hatası:", err);
      return res.status(400).json({ error: 'Dosya yüklenemedi: ' + err.message });
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    
    let finalFilename = req.file.filename;
    let finalMimeType = req.file.mimetype;
    let finalSize = req.file.size;
    let finalOriginalName = req.file.originalname;

    if (req.file.mimetype.startsWith('image/') && !req.file.mimetype.includes('webp')) {
      const parsedPath = path.parse(req.file.filename);
      const webpFilename = `${parsedPath.name}.webp`;
      const webpPath = path.join(req.file.destination, webpFilename);
      
      try {
        await sharp(req.file.path)
          .webp({ quality: 80 })
          .toFile(webpPath);
          
        fs.unlinkSync(req.file.path);
        
        finalFilename = webpFilename;
        finalMimeType = 'image/webp';
        finalSize = fs.statSync(webpPath).size;
        
        const origParsed = path.parse(req.file.originalname);
        finalOriginalName = `${origParsed.name}.webp`;
      } catch (err) {
        console.error('Sharp webp conversion failed, falling back to original:', err);
      }
    }

    const folderId = req.body.folderId ? parseInt(req.body.folderId) : null;
    
    const fileUrl = `/uploads/${finalFilename}`;
    const newMedia = await db.insert(mediaLibrary).values({
      tenantId: 1,
      uploaderId: (req as any).adminUser.userId,
      folderId: folderId,
      fileName: finalOriginalName,
      fileUrl: fileUrl,
      mimeType: finalMimeType,
      fileSize: finalSize,
      title: path.parse(finalOriginalName).name,
      altText: path.parse(finalOriginalName).name,
      description: '',
    });
    res.json({ success: true, fileUrl, id: (newMedia[0] as any).insertId });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

mediaRouter.post('/api/admin/media/import-remote', requireAdmin, async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL gerekli' });
    const fileUrl = await saveRemoteImageToMedia(url, (req as any).adminUser.userId);
    res.json({ success: true, fileUrl });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

mediaRouter.put('/api/admin/media/:id', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { title, altText, description, folderId } = req.body;
    const updateData: any = { title, altText, description };
    if (folderId !== undefined) {
       updateData.folderId = folderId === null ? null : parseInt(folderId);
    }
    
    await db.update(mediaLibrary).set(updateData).where(eq(mediaLibrary.id, id));
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

mediaRouter.delete('/api/admin/media/:id', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const item = await db.select().from(mediaLibrary).where(eq(mediaLibrary.id, id)).limit(1);
    if (item.length === 0) return res.status(404).json({ error: 'Media not found' });
    
    await db.delete(mediaLibrary).where(eq(mediaLibrary.id, id));
    
    const filePath = path.join(rootDir, item[0].fileUrl);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
