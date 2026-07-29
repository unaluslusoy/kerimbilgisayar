import express from 'express';
import { eq, desc } from 'drizzle-orm';
import { db } from '../db/index';
import {
  blogPosts,
  campaigns,
  faqCategories,
  knowledgeBase,
  leads,
  formSubmissions,
  terms,
  taxonomies,
  termRelationships,
  testimonials,
} from '../db/schema';
import { requireAdmin } from '../server/middleware';
import { generateSlug, saveRemoteImageToMedia } from '../server/utils';

export const contentRouter = express.Router();

// ADMIN API — BLOG
contentRouter.get('/api/admin/blog', requireAdmin, async (req, res) => {
  try {
    const posts = await db.select().from(blogPosts).orderBy(desc(blogPosts.createdAt));
    res.json(posts);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

contentRouter.post('/api/admin/blog', requireAdmin, async (req, res) => {
  try {
    const { title, slug, content, excerpt, imageUrl, status, metaTitle, metaDescription } = req.body;
    await db.insert(blogPosts).values({
      tenantId: 1,
      title, slug: slug || generateSlug(title),
      content, excerpt, imageUrl,
      status: status || 'taslak',
      metaTitle, metaDescription,
      publishedAt: status === 'yayinlandi' ? new Date() : undefined,
    });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

contentRouter.put('/api/admin/blog/:id', requireAdmin, async (req, res) => {
  try {
    const { title, slug, content, excerpt, imageUrl, status, metaTitle, metaDescription } = req.body;
    const updateData: any = { title, slug, content, excerpt, imageUrl, status, metaTitle, metaDescription };
    if (status === 'yayinlandi') updateData.publishedAt = new Date();
    await db.update(blogPosts).set(updateData).where(eq(blogPosts.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

contentRouter.delete('/api/admin/blog/:id', requireAdmin, async (req, res) => {
  try {
    await db.update(blogPosts).set({ status: 'arsivlendi' }).where(eq(blogPosts.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ADMIN API — CAMPAIGNS
contentRouter.get('/api/admin/campaigns', requireAdmin, async (req, res) => {
  try {
    const all = await db.select().from(campaigns).orderBy(desc(campaigns.createdAt));
    res.json(all);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

contentRouter.post('/api/admin/campaigns', requireAdmin, async (req, res) => {
  try {
    const { title, slug, description, imageUrl, startDate, endDate, discountRate, status } = req.body;
    const localImageUrl = imageUrl ? await saveRemoteImageToMedia(imageUrl, (req as any).adminUser.userId) : imageUrl;
    await db.insert(campaigns).values({
      tenantId: 1,
      title, 
      slug: slug || generateSlug(title),
      description, imageUrl: localImageUrl,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      discountRate: discountRate?.toString(),
      status: status || 'taslak',
    });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

contentRouter.patch('/api/admin/campaigns/:id', requireAdmin, async (req, res) => {
  try {
    const { status, title, description, imageUrl, startDate, endDate, discountRate } = req.body;
    const updateData: any = {};
    if (status) updateData.status = status;
    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl ? await saveRemoteImageToMedia(imageUrl, (req as any).adminUser.userId) : null;
    if (startDate) updateData.startDate = new Date(startDate);
    if (endDate) updateData.endDate = new Date(endDate);
    if (discountRate !== undefined) updateData.discountRate = discountRate?.toString();
    await db.update(campaigns).set(updateData).where(eq(campaigns.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

contentRouter.delete('/api/admin/campaigns/:id', requireAdmin, async (req, res) => {
  try {
    await db.delete(campaigns).where(eq(campaigns.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

contentRouter.post('/api/admin/campaigns/import-remote-images', requireAdmin, async (req, res) => {
  try {
    const all = await db.select().from(campaigns);
    let imported = 0;
    const errors: string[] = [];

    for (const campaign of all) {
      if (!campaign.imageUrl || !/^https?:\/\//i.test(campaign.imageUrl)) continue;
      try {
        const localImageUrl = await saveRemoteImageToMedia(campaign.imageUrl, (req as any).adminUser.userId);
        await db.update(campaigns).set({ imageUrl: localImageUrl }).where(eq(campaigns.id, campaign.id));
        imported += 1;
      } catch (err: any) {
        errors.push(`${campaign.title}: ${err.message}`);
      }
    }

    res.json({ success: true, imported, errors });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ADMIN API — FAQ / KNOWLEDGE BASE
contentRouter.get('/api/admin/faq', requireAdmin, async (req, res) => {
  try {
    const cats = await db.select().from(faqCategories);
    const kbase = await db.select().from(knowledgeBase).orderBy(desc(knowledgeBase.createdAt));
    res.json({ categories: cats, questions: kbase });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

contentRouter.post('/api/admin/faq/categories', requireAdmin, async (req, res) => {
  try {
    const { name, icon } = req.body;
    await db.insert(faqCategories).values({ tenantId: 1, name, icon });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

contentRouter.post('/api/admin/faq/questions', requireAdmin, async (req, res) => {
  try {
    const { categoryId, question, answer, status } = req.body;
    await db.insert(knowledgeBase).values({
      tenantId: 1, categoryId, question, answer,
      status: status || 'yayinlandi'
    });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

contentRouter.put('/api/admin/faq/questions/:id', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { categoryId, question, answer, status } = req.body;
    await db.update(knowledgeBase).set({
      categoryId: categoryId ? parseInt(categoryId) : null,
      question,
      answer,
      status: status || 'yayinlandi'
    }).where(eq(knowledgeBase.id, id));
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

contentRouter.delete('/api/admin/faq/questions/:id', requireAdmin, async (req, res) => {
  try {
    await db.delete(knowledgeBase).where(eq(knowledgeBase.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

contentRouter.put('/api/admin/faq/categories/:id', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, icon } = req.body;
    await db.update(faqCategories).set({ name, icon }).where(eq(faqCategories.id, id));
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

contentRouter.delete('/api/admin/faq/categories/:id', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.update(knowledgeBase).set({ categoryId: null }).where(eq(knowledgeBase.categoryId, id));
    await db.delete(faqCategories).where(eq(faqCategories.id, id));
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ADMIN API — LEADS
contentRouter.get('/api/admin/leads', requireAdmin, async (req, res) => {
  try {
    const allLeads = await db.select().from(leads).orderBy(desc(leads.createdAt));
    res.json(allLeads);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

contentRouter.patch('/api/admin/leads/:id', requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    await db.update(leads).set({ status }).where(eq(leads.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ADMIN API — MESSAGES (Form Submissions)
contentRouter.get('/api/admin/messages', requireAdmin, async (req, res) => {
  try {
    const submissions = await db.select().from(formSubmissions).orderBy(desc(formSubmissions.createdAt));
    res.json(submissions);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ADMIN API — TAXONOMIES
contentRouter.get('/api/admin/terms', requireAdmin, async (req, res) => {
  try {
    const allTerms = await db.select({
      id: terms.id,
      name: terms.name,
      slug: terms.slug,
      description: terms.description,
      taxonomyId: terms.taxonomyId,
      taxonomyName: taxonomies.name
    }).from(terms)
      .leftJoin(taxonomies, eq(terms.taxonomyId, taxonomies.id));
    res.json(allTerms);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

contentRouter.post('/api/admin/terms', requireAdmin, async (req, res) => {
  try {
    const { name, taxonomyName, description } = req.body;
    
    let taxonomyId: number;
    const existingTax = await db.select().from(taxonomies).where(eq(taxonomies.name, taxonomyName)).limit(1);
    if (existingTax.length > 0) {
      taxonomyId = existingTax[0].id;
    } else {
      const newTax = await db.insert(taxonomies).values({ tenantId: 1, name: taxonomyName, slug: taxonomyName });
      taxonomyId = (newTax[0] as any).insertId;
    }

    await db.insert(terms).values({
      tenantId: 1,
      taxonomyId,
      name,
      slug: generateSlug(name),
      description
    });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

contentRouter.delete('/api/admin/terms/:id', requireAdmin, async (req, res) => {
  try {
    await db.delete(termRelationships).where(eq(termRelationships.termId, parseInt(req.params.id)));
    await db.delete(terms).where(eq(terms.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ADMIN API — TESTIMONIALS
contentRouter.get('/api/admin/testimonials', requireAdmin, async (req, res) => {
  try {
    const allTestimonials = await db.select().from(testimonials).orderBy(desc(testimonials.createdAt));
    res.json(allTestimonials);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

contentRouter.post('/api/admin/testimonials', requireAdmin, async (req, res) => {
  try {
    const { authorName, authorTitle, authorImageUrl, content, rating, status } = req.body;
    await db.insert(testimonials).values({
      tenantId: 1,
      authorName, authorTitle, authorImageUrl, content,
      rating: parseInt(rating) || 5,
      status: status || 'taslak'
    });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

contentRouter.patch('/api/admin/testimonials/:id', requireAdmin, async (req, res) => {
  try {
    const updates = req.body;
    updates.updatedAt = new Date();
    await db.update(testimonials).set(updates).where(eq(testimonials.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

contentRouter.delete('/api/admin/testimonials/:id', requireAdmin, async (req, res) => {
  try {
    await db.delete(testimonials).where(eq(testimonials.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
