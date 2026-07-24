import crypto from 'crypto';

// Hassas cihaz erişim bilgileri (PIN, desen kilidi, e-posta şifresi) için
// alan bazlı şifreleme. AES-256-GCM, her alan için rastgele IV.
//
// ENCRYPTION_KEY .env / deploy secrets içinde tanımlı değilse şifreleme
// devre dışı kalır ve düz metin saklanır (uygulamanın çökmesi yerine
// bilinçli bir düşüş — ama prod'da mutlaka bir anahtar tanımlanmalı).

const ALGO = 'aes-256-gcm';
const PREFIX = 'enc:v1:';

function getKey(): Buffer | null {
  const raw = process.env.ENCRYPTION_KEY || '';
  if (!raw) return null;
  // 64 hex karakter (32 byte) doğrudan kabul edilir, aksi halde herhangi bir
  // string'den sha256 ile 32 byte anahtar türetilir.
  if (/^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, 'hex');
  return crypto.createHash('sha256').update(raw).digest();
}

let warned = false;
function warnOnce() {
  if (warned) return;
  warned = true;
  console.warn('⚠ ENCRYPTION_KEY tanımlı değil — hassas cihaz erişim bilgileri (PIN/desen/e-posta şifresi) şifrelenmeden saklanıyor. .env ve deploy secrets içine ENCRYPTION_KEY ekleyin.');
}

export function encryptField(plain: string | null | undefined): string | null {
  if (plain === null || plain === undefined || plain === '') return plain ?? null;
  const key = getKey();
  if (!key) { warnOnce(); return plain; }
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
}

export function decryptField(stored: string | null | undefined): string | null {
  if (!stored) return stored ?? null;
  if (!stored.startsWith(PREFIX)) return stored; // şifrelenmemiş / eski düz metin
  const key = getKey();
  if (!key) { warnOnce(); return null; } // anahtar yoksa çözülemez — düz metin gibi göstermek yerine gizlenir
  try {
    const [ivB64, tagB64, dataB64] = stored.slice(PREFIX.length).split(':');
    const iv = Buffer.from(ivB64, 'base64');
    const authTag = Buffer.from(tagB64, 'base64');
    const data = Buffer.from(dataB64, 'base64');
    const decipher = crypto.createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
    return decrypted.toString('utf8');
  } catch (e) {
    console.error('decryptField error:', e);
    return null;
  }
}
