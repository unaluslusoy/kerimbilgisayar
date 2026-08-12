// GTIN/EAN/UPC checksum doğrulaması (EAN-8, UPC-A, EAN-13, GTIN-14)
export function validateGTIN(code: string): { valid: boolean; reason?: string } {
  const trimmed = (code || '').trim();
  if (!/^\d+$/.test(trimmed)) {
    return { valid: false, reason: 'Sadece rakam içermeli' };
  }
  if (![8, 12, 13, 14].includes(trimmed.length)) {
    return { valid: false, reason: 'Uzunluk 8, 12, 13 veya 14 hane olmalı (EAN-8/UPC-A/EAN-13/GTIN-14)' };
  }

  const digits = trimmed.split('').map(Number);
  const checkDigit = digits.pop() as number;
  let sum = 0;
  // Sağdan sola: tek pozisyonlar x3, çift pozisyonlar x1 (GS1 standart algoritması)
  digits.reverse().forEach((d, i) => {
    sum += d * (i % 2 === 0 ? 3 : 1);
  });
  const calculatedCheckDigit = (10 - (sum % 10)) % 10;

  if (calculatedCheckDigit !== checkDigit) {
    return { valid: false, reason: 'Checksum uyuşmuyor' };
  }
  return { valid: true };
}

// Türkiye 869 prefix'li geçerli EAN-13 barkod üreteci
export function generateEAN13(prefix = '869'): string {
  let code12 = prefix;
  while (code12.length < 12) {
    code12 += Math.floor(Math.random() * 10).toString();
  }
  const digits = code12.split('').map(Number);
  let sum = 0;
  digits.reverse().forEach((d, i) => {
    sum += d * (i % 2 === 0 ? 3 : 1);
  });
  const checkDigit = (10 - (sum % 10)) % 10;
  return code12 + checkDigit;
}
