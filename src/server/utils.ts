import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import { db } from '../db/index';
import { mediaLibrary } from '../db/schema';
import { eq } from 'drizzle-orm';

const rootDir = process.cwd();
const uploadsDir = path.join(rootDir, 'uploads');

export function nullableDecimal(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized.toString() : null;
}

export function nullableInt(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const normalized = parseInt(String(value), 10);
  return Number.isFinite(normalized) ? normalized : null;
}

export function generateSlug(text: string): string {
  const mapping: Record<string, string> = {
    'ç': 'c', 'Ç': 'c',
    'ğ': 'g', 'Ğ': 'g',
    'ı': 'i', 'I': 'i', 'İ': 'i',
    'ö': 'o', 'Ö': 'o',
    'ş': 's', 'Ş': 's',
    'ü': 'u', 'Ü': 'u'
  };
  let str = text || '';
  Object.keys(mapping).forEach(key => {
    str = str.replace(new RegExp(key, 'g'), mapping[key]);
  });
  return str.toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

export function assertSafeRemoteUrl(rawUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error('Geçersiz URL');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Yalnızca http/https destekleniyor');
  }
  const host = parsed.hostname.toLowerCase();
  const blockedHosts = ['localhost', '127.0.0.1', '0.0.0.0', '::1', 'metadata.google.internal'];
  if (blockedHosts.includes(host)) throw new Error('Bu adrese erişim engellendi');
  
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const [a, b] = [parseInt(m[1]), parseInt(m[2])];
    const isPrivate =
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168);
    if (isPrivate) throw new Error('Özel ağ adreslerine erişim engellendi');
  }
  return parsed;
}

export async function saveRemoteImageToMedia(sourceUrl: string, uploaderId?: number | null): Promise<string> {
  if (!/^https?:\/\//i.test(sourceUrl)) return sourceUrl;

  assertSafeRemoteUrl(sourceUrl);

  const existing = await db.select().from(mediaLibrary).where(eq(mediaLibrary.description, `remote:${sourceUrl}`)).limit(1);
  if (existing.length > 0) return existing[0].fileUrl;

  const response = await fetch(sourceUrl, { redirect: 'follow' });
  if (!response.ok) throw new Error(`Görsel indirilemedi: ${response.status}`);

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.startsWith('image/')) throw new Error('URL bir görsel dosyası değil');

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > 8 * 1024 * 1024) throw new Error('Görsel 8 MB sınırını aşıyor');

  fs.mkdirSync(uploadsDir, { recursive: true });
  const parsedUrl = new URL(sourceUrl);
  const originalName = path.basename(parsedUrl.pathname) || 'remote-image';
  const safeBase = generateSlug(path.parse(originalName).name) || 'remote-image';
  const fileName = `${Date.now()}-${safeBase}.webp`;
  const filePath = path.join(uploadsDir, fileName);

  await sharp(buffer).webp({ quality: 80 }).toFile(filePath);

  const fileUrl = `/uploads/${fileName}`;
  const title = path.parse(originalName).name || safeBase;
  await db.insert(mediaLibrary).values({
    tenantId: 1,
    uploaderId: uploaderId || null,
    folderId: null,
    fileName,
    fileUrl,
    mimeType: 'image/webp',
    fileSize: fs.statSync(filePath).size,
    title,
    altText: title,
    description: `remote:${sourceUrl}`,
  });

  return fileUrl;
}
