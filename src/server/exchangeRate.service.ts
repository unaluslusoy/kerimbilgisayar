/**
 * TCMB Günlük Döviz Kuru Servis Katmanı
 * ────────────────────────────────────
 * TCMB XML servisi üzerinden USD ve EUR alış/satış kurlarını çekip exchange_rates tablosuna yazar.
 */

import { db } from '../db/index';
import { eq, and } from 'drizzle-orm';
import { exchangeRates } from '../db/schema';

export interface ExchangeRateResult {
  currency: string;
  rate: number;
  rateDate: string;
  source: 'tcmb' | 'manual';
}

export async function fetchTcmbRates(): Promise<{ success: boolean; rates: ExchangeRateResult[]; message: string }> {
  try {
    const response = await fetch('https://www.tcmb.gov.tr/kurlar/today.xml', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
    });

    if (!response.ok) {
      return { success: false, rates: [], message: `TCMB Servis Hatası: HTTP ${response.status}` };
    }

    const xmlText = await response.text();
    const dateMatch = xmlText.match(/Tarih_Date\s+Tarih="([^"]+)"/);
    const rateDateStr = dateMatch ? dateMatch[1] : new Date().toISOString().substring(0, 10);

    // YYYY-MM-DD formatına çevir
    let formattedDate = new Date().toISOString().substring(0, 10);
    if (dateMatch && dateMatch[1]) {
      const parts = dateMatch[1].split('.');
      if (parts.length === 3) {
        formattedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }

    const currenciesToFetch = ['USD', 'EUR', 'GBP'];
    const rates: ExchangeRateResult[] = [];

    for (const code of currenciesToFetch) {
      // Regex ile XML düğümünü bul
      const currencyRegex = new RegExp(`<Currency\\s+[^>]*CurrencyCode="${code}"[^>]*>([\\s\\S]*?)</Currency>`, 'i');
      const match = xmlText.match(currencyRegex);

      if (match && match[1]) {
        const nodeContent = match[1];
        // Efektif Satış veya BanknoteSelling veya ForexSelling
        const sellingMatch = nodeContent.match(/<ForexSelling>([^<]+)<\/ForexSelling>/i) ||
                             nodeContent.match(/<BanknoteSelling>([^<]+)<\/BanknoteSelling>/i);

        if (sellingMatch && sellingMatch[1]) {
          const rateVal = parseFloat(sellingMatch[1].replace(',', '.'));
          if (!isNaN(rateVal) && rateVal > 0) {
            rates.push({
              currency: code,
              rate: rateVal,
              rateDate: formattedDate,
              source: 'tcmb',
            });
          }
        }
      }
    }

    // Veritabanına kaydet (upsert logic)
    for (const rateItem of rates) {
      const existing = await db.select().from(exchangeRates)
        .where(
          and(
            eq(exchangeRates.targetCurrency, rateItem.currency),
            eq(exchangeRates.rateDate, rateItem.rateDate as any)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        await db.update(exchangeRates)
          .set({
            rate: rateItem.rate.toFixed(6),
            fetchedAt: new Date(),
          })
          .where(eq(exchangeRates.id, existing[0].id));
      } else {
        await db.insert(exchangeRates).values({
          tenantId: 1,
          baseCurrency: 'TRY',
          targetCurrency: rateItem.currency,
          rate: rateItem.rate.toFixed(6),
          source: 'tcmb',
          rateDate: rateItem.rateDate as any,
          fetchedAt: new Date(),
        });
      }
    }

    return {
      success: true,
      rates,
      message: `${rates.length} para biriminin TCMB kurları başarıyla güncellendi (${formattedDate})`,
    };
  } catch (err: any) {
    console.error('[TCMB Exchange Rate] Hata:', err.message);
    return { success: false, rates: [], message: `Kur çekme hatası: ${err.message}` };
  }
}

// Aktif Kurları Getir
export async function getLatestRates(): Promise<Record<string, number>> {
  const result: Record<string, number> = { TRY: 1.0 };
  try {
    const rows = await db.select().from(exchangeRates)
      .orderBy(exchangeRates.rateDate);

    // En son kurları al
    for (const row of rows) {
      result[row.targetCurrency] = parseFloat(row.rate);
    }
  } catch (e) {
    console.error('Exchange rate read error:', e);
  }
  return result;
}
