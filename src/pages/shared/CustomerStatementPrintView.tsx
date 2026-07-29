import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { fetchCustomerLedger, fetchSettings } from '../../lib/api';

export default function CustomerStatementPrintView() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<{ customer: any; transactions: any[]; summary: any } | null>(null);
  const [settings, setSettings] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      fetchCustomerLedger(parseInt(id, 10)),
      fetchSettings().catch(() => null),
    ])
      .then(([ledgerRes, settingsRes]) => {
        setData(ledgerRes);
        setSettings(settingsRes);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!data || !data.customer) {
    return (
      <div className="p-8 text-center text-red-600 font-bold">
        Müşteri ekstresi yüklenemedi veya cari kayıt bulunamadı.
      </div>
    );
  }

  const { customer, transactions, summary } = data;
  const companyName = settings?.siteTitle || settings?.companyName || 'KERİM BİLGİSAYAR';
  const companyAddress = settings?.address || 'Merkez Mh. Bilgisayar Sk. No:1';
  const companyPhone = settings?.phone || '0(212) 000 00 00';
  const companyEmail = settings?.email || 'info@kerimbilgisayar.com';

  return (
    <div className="min-h-screen bg-white text-gray-900 p-8 max-w-4xl mx-auto font-sans print:p-0 print:max-w-none">
      {/* Print Controls Bar (hidden when printing) */}
      <div className="mb-6 flex justify-between items-center bg-gray-100 p-4 rounded-xl print:hidden border border-gray-200">
        <div>
          <h2 className="font-bold text-gray-800">Cari Hesap Ekstresi (Yazdırma Görünümü)</h2>
          <p className="text-xs text-gray-500">Müşteriye vermek veya arşivlemek için ekstre çıktısı alın.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-lg shadow transition"
          >
            🖨️ Yazdır / PDF İndir
          </button>
          <button
            onClick={() => window.close()}
            className="px-4 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-semibold rounded-lg transition"
          >
            Kapat
          </button>
        </div>
      </div>

      {/* Header */}
      <div className="border-b-2 border-gray-800 pb-6 mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900">{companyName}</h1>
          <p className="text-xs text-gray-600 mt-1 max-w-xs">{companyAddress}</p>
          <p className="text-xs text-gray-600">Tel: {companyPhone} | E-posta: {companyEmail}</p>
        </div>
        <div className="text-right">
          <div className="inline-block px-3 py-1 bg-gray-900 text-white font-bold text-xs rounded uppercase tracking-wider mb-2">
            CARİ HESAP EKSTRESİ
          </div>
          <p className="text-xs text-gray-500">Tarih: {new Date().toLocaleDateString('tr-TR')}</p>
          <p className="text-xs font-semibold text-gray-700">Cari Kod: {customer.accountCode || '—'}</p>
        </div>
      </div>

      {/* Customer Info Box */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6 grid grid-cols-2 gap-4 text-xs">
        <div>
          <p className="text-gray-400 font-medium uppercase tracking-wider text-[10px]">Müşteri / Cari Ünvanı</p>
          <p className="font-bold text-sm text-gray-900 mt-0.5">
            {customer.companyName || `${customer.firstName} ${customer.lastName}`}
          </p>
          {customer.phone && <p className="text-gray-600 mt-1">Tel: {customer.phone}</p>}
          {customer.email && <p className="text-gray-600">E-posta: {customer.email}</p>}
        </div>
        <div className="text-right flex flex-col justify-between">
          <div>
            <p className="text-gray-400 font-medium uppercase tracking-wider text-[10px]">Güncel Bakiye Durumu</p>
            <p
              className={`text-xl font-black mt-0.5 ${
                Number(summary?.balance || customer.balance || 0) > 0 ? 'text-red-600' : 'text-emerald-700'
              }`}
            >
              {Number(summary?.balance || customer.balance || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL
            </p>
            <p className="text-[11px] text-gray-500 font-medium">
              {Number(summary?.balance || customer.balance || 0) > 0 ? '(MÜŞTERİ BORÇLU)' : '(BAKİYE KAPALI / ALACAKLI)'}
            </p>
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="mb-6">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="bg-gray-100 border-y-2 border-gray-800 text-gray-700">
              <th className="py-2.5 px-3 font-bold">Tarih</th>
              <th className="py-2.5 px-3 font-bold">İşlem Türü / Kaynak</th>
              <th className="py-2.5 px-3 font-bold">Açıklama</th>
              <th className="py-2.5 px-3 font-bold text-right text-red-700">Borç (TL)</th>
              <th className="py-2.5 px-3 font-bold text-right text-emerald-700">Alacak (TL)</th>
              <th className="py-2.5 px-3 font-bold text-right">Bakiye (TL)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-gray-400">
                  Bu cari hesaba ait hareket bulunmamaktadır.
                </td>
              </tr>
            ) : (
              transactions.map((tx: any) => (
                <tr key={tx.id} className="hover:bg-gray-50">
                  <td className="py-2 px-3 whitespace-nowrap text-gray-600">
                    {new Date(tx.date).toLocaleDateString('tr-TR')}
                  </td>
                  <td className="py-2 px-3 whitespace-nowrap font-medium text-gray-700 uppercase text-[10px]">
                    {tx.source}
                  </td>
                  <td className="py-2 px-3 text-gray-800 font-medium max-w-xs">{tx.description}</td>
                  <td className="py-2 px-3 text-right font-semibold text-red-600 whitespace-nowrap">
                    {tx.debit > 0 ? `${tx.debit.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}` : '—'}
                  </td>
                  <td className="py-2 px-3 text-right font-semibold text-emerald-600 whitespace-nowrap">
                    {tx.credit > 0 ? `${tx.credit.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}` : '—'}
                  </td>
                  <td className="py-2 px-3 text-right font-bold text-gray-900 whitespace-nowrap">
                    {Number(tx.runningBalance).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Totals Summary & Stamp Block */}
      <div className="grid grid-cols-2 gap-6 pt-4 border-t-2 border-gray-800">
        <div className="space-y-2 text-xs">
          <p className="font-bold text-gray-800 uppercase tracking-wider">Cari Anlaşma & Notlar</p>
          <p className="text-gray-600 bg-gray-50 p-3 rounded border border-gray-200">
            {customer.notes || 'Herhangi bir özel not bulunmamaktadır.'}
          </p>
          <div className="pt-6">
            <p className="font-bold text-gray-700">Düzenleyen (Kaşe / İmza)</p>
            <div className="h-16 border-b border-dashed border-gray-300 mt-2"></div>
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-2 text-xs">
          <div className="flex justify-between text-gray-600">
            <span>Toplam Borç (Satış / Servis):</span>
            <span className="font-semibold text-red-600">
              {Number(summary?.totalDebit || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL
            </span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Toplam Alacak (Tahsilat / Ödeme):</span>
            <span className="font-semibold text-emerald-600">
              {Number(summary?.totalCredit || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL
            </span>
          </div>
          <div className="border-t border-gray-300 pt-2 flex justify-between text-sm font-black text-gray-900">
            <span>Genel Net Bakiye:</span>
            <span className={Number(summary?.balance || 0) > 0 ? 'text-red-600' : 'text-emerald-700'}>
              {Number(summary?.balance || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
