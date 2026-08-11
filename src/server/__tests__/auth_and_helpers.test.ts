import { describe, it } from 'node:test';
import assert from 'node:assert';
import { isValidImei } from '../helpers';
import { isBcryptHash, verifyPassword, hashPassword } from '../middleware';
import { generateSlug, isPrivateIp } from '../utils';

describe('Güvenlik ve Yardımcı Fonksiyon Birim Testleri', () => {
  it('isValidImei — geçerli ve geçersiz IMEI numaralarını doğru doğrular', () => {
    assert.strictEqual(isValidImei('352099001761481'), true);
    assert.strictEqual(isValidImei('123456789012345'), false);
    assert.strictEqual(isValidImei('invalid'), false);
  });

  it('generateSlug — Türkçe karakterleri doğru slug biçimine dönüştürür', () => {
    assert.strictEqual(generateSlug('Bilgisayar & Ekran Değişimi Çözümü'), 'bilgisayar-ekran-degisimi-cozumu');
    assert.strictEqual(generateSlug('Şifreleme & Güvenlik'), 'sifreleme-guvenlik');
  });

  it('isPrivateIp — yerel ve özel IP adreslerini doğru tespit eder', () => {
    assert.strictEqual(isPrivateIp('127.0.0.1'), true);
    assert.strictEqual(isPrivateIp('10.0.0.5'), true);
    assert.strictEqual(isPrivateIp('192.168.1.1'), true);
    assert.strictEqual(isPrivateIp('8.8.8.8'), false);
    assert.strictEqual(isPrivateIp('142.250.180.206'), false);
  });

  it('verifyPassword — yalnızca bcrypt hash ile parolaları doğrular, düz metin parolaları reddeder', async () => {
    const rawPass = 'GuvenliSifre123!';
    const hashed = await hashPassword(rawPass);

    assert.strictEqual(isBcryptHash(hashed), true);
    assert.strictEqual(isBcryptHash('plaintextSecret'), false);

    // Bcrypt hashed password test
    const validResult = await verifyPassword(rawPass, hashed);
    assert.strictEqual(validResult, true);

    const invalidResult = await verifyPassword('YanlisSifre', hashed);
    assert.strictEqual(invalidResult, false);

    // Plaintext password should be rejected (SEC-06)
    const plaintextResult = await verifyPassword('plaintextSecret', 'plaintextSecret');
    assert.strictEqual(plaintextResult, false);
  });
});
