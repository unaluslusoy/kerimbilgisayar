export function generateTicketReceiptHtml(ticket: any): string {
  const dateStr = ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString('tr-TR') : '—';
  const totalCost = parseFloat(ticket.cost || '0');
  const laborCost = parseFloat(ticket.laborCost || '0');
  const partsCost = Math.max(0, totalCost - laborCost);

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Teknik Servis Dekontu #${ticket.ticketNumber || ''}</title>
    <style>
      body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1e293b; padding: 40px; margin: 0; background: #fff; }
      .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 20px; margin-bottom: 30px; }
      .company-title { font-size: 22px; font-weight: bold; color: #0f172a; }
      .company-sub { font-size: 12px; color: #64748b; margin-top: 4px; }
      .badge { background: #3b82f6; color: white; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
      .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
      .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; }
      .card-title { font-size: 11px; text-transform: uppercase; font-weight: bold; color: #64748b; margin-bottom: 8px; }
      .card-value { font-size: 14px; font-weight: bold; color: #0f172a; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
      th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
      th { background: #f1f5f9; font-weight: bold; color: #475569; }
      .total-box { text-align: right; margin-top: 20px; font-size: 18px; font-weight: bold; color: #2563eb; }
      .footer { font-size: 11px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 40px; }
    </style>
  </head>
  <body>
    <div class="header">
      <div>
        <div class="company-title">KERİM BİLGİSAYAR & TEKNİK SERVİS</div>
        <div class="company-sub">Bilgisayar - Tablet - Telefon Onarım Merkezi</div>
      </div>
      <div class="badge">KAYIT NO: #${ticket.ticketNumber || ''}</div>
    </div>

    <div class="info-grid">
      <div class="card">
        <div class="card-title">MÜŞTERİ BİLGİLERİ</div>
        <div class="card-value">${ticket.customerName || 'Müşteri'}</div>
        <div style="font-size:12px; color:#64748b; margin-top:4px;">${ticket.customerPhone || ''} · ${ticket.customerEmail || ''}</div>
      </div>
      <div class="card">
        <div class="card-title">CİHAZ BİLGİLERİ</div>
        <div class="card-value">${ticket.deviceBrand || ''} ${ticket.deviceModel || ''} (${ticket.deviceType || 'Cihaz'})</div>
        <div style="font-size:12px; color:#64748b; margin-top:4px;">Tarih: ${dateStr}</div>
      </div>
    </div>

    <div class="card" style="margin-bottom: 20px;">
      <div class="card-title">ARIZA & MÜŞTERİ BEYANI</div>
      <div style="font-size:13px; color:#334155;">${ticket.description || 'Arıza beyanı belirtilmemiş.'}</div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Açıklama / Hizmet</th>
          <th>Miktar</th>
          <th style="text-align:right;">Tutar</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>İşçilik & Onarım Hizmet Bedeli</td>
          <td>1</td>
          <td style="text-align:right;">₺${laborCost.toLocaleString('tr-TR')}</td>
        </tr>
        ${partsCost > 0 ? `
        <tr>
          <td>Yedek Parça & Malzeme Bedeli</td>
          <td>1</td>
          <td style="text-align:right;">₺${partsCost.toLocaleString('tr-TR')}</td>
        </tr>
        ` : ''}
      </tbody>
    </table>

    <div class="total-box">
      TOPLAM TUTAR: ₺${totalCost.toLocaleString('tr-TR')}
    </div>

    ${ticket.customerSignature ? `
      <div style="margin-top:40px; text-center">
        <div style="font-size:11px; color:#64748b; font-weight:bold; margin-bottom:8px;">MÜŞTERİ DİJİTAL İMZASI</div>
        <img src="${ticket.customerSignature}" style="height:60px; object-fit:contain;" />
      </div>
    ` : ''}

    <div class="footer">
      Kerim Bilgisayar · Bu belge elektronik ortamda oluşturulmuştur. · 90 Gün Parça ve İşçilik Garantilidir.
    </div>
  </body>
  </html>
  `;
}
