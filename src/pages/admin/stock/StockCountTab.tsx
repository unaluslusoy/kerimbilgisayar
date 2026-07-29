// Stok Sayımı (Stocktake) — barkod okutarak beklenen/sayılan karşılaştırması
import React, { useState, useEffect, useRef } from 'react';
import { Barcode, Camera, Plus, X, CheckCircle, RefreshCw, XCircle, ClipboardList } from 'lucide-react';
import {
  fetchCountSessions, createCountSession, fetchCountSession, scanCountItem,
  updateCountLine, finalizeCountSession, cancelCountSession
} from '../../../lib/api';
import CameraBarcodeScanner from '../../../components/ui/CameraBarcodeScanner';

interface StockCountTabProps {
  categories: any[];
  onFinalized: () => void;
}

export default function StockCountTab({ categories, onFinalized }: StockCountTabProps) {
  const [view, setView] = useState<'list' | 'active'>('list');
  const [sessions, setSessions] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newSessionCategoryId, setNewSessionCategoryId] = useState('');
  const [starting, setStarting] = useState(false);

  const [activeSession, setActiveSession] = useState<any | null>(null);
  const [lines, setLines] = useState<any[]>([]);
  const [scanBuffer, setScanBuffer] = useState('');
  const [showCamera, setShowCamera] = useState(false);
  const [flashLineId, setFlashLineId] = useState<number | null>(null);
  const [scanError, setScanError] = useState('');
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const scanInputRef = useRef<HTMLInputElement>(null);

  // Detay görünümü (tamamlanmış/iptal edilmiş bir oturumu salt-okunur incelemek için)
  const [detailSession, setDetailSession] = useState<any | null>(null);
  const [detailLines, setDetailLines] = useState<any[]>([]);

  const getCategoryPath = (catId: number): string => {
    const cat = categories.find(c => c.id === catId);
    if (!cat) return '';
    if (cat.parentId) return `${getCategoryPath(cat.parentId)} > ${cat.name}`;
    return cat.name;
  };

  const loadSessions = async () => {
    setLoadingSessions(true);
    try {
      const data = await fetchCountSessions();
      setSessions(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSessions(false);
    }
  };

  useEffect(() => { loadSessions(); }, []);

  useEffect(() => {
    if (view === 'active' && scanInputRef.current) {
      scanInputRef.current.focus();
    }
  }, [view, showCamera]);

  const handleStartSession = async () => {
    setStarting(true);
    try {
      const session = await createCountSession({ categoryId: newSessionCategoryId ? parseInt(newSessionCategoryId) : null });
      setActiveSession(session);
      setLines([]);
      setShowNewModal(false);
      setNewSessionCategoryId('');
      setView('active');
    } catch (e: any) {
      alert('Hata: ' + e.message);
    } finally {
      setStarting(false);
    }
  };

  const handleOpenSession = async (sessionId: number, readOnly: boolean) => {
    try {
      const data = await fetchCountSession(sessionId);
      if (readOnly) {
        setDetailSession(data.session);
        setDetailLines(data.lines);
      } else {
        setActiveSession(data.session);
        setLines(data.lines);
        setView('active');
      }
    } catch (e: any) {
      alert('Hata: ' + e.message);
    }
  };

  const handleScan = async (code: string) => {
    if (!activeSession || !code.trim()) return;
    setScanError('');
    try {
      const { line } = await scanCountItem(activeSession.id, code.trim());
      setLines(prev => {
        const idx = prev.findIndex(l => l.id === line.id);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = line;
          return copy;
        }
        return [line, ...prev];
      });
      setFlashLineId(line.id);
      setTimeout(() => setFlashLineId(null), 800);
    } catch (e: any) {
      setScanError(e.message || 'Barkod/SKU bulunamadı');
    }
    setScanBuffer('');
  };

  const handleScannerKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleScan(scanBuffer);
    }
  };

  const handleLineQtyChange = async (lineId: number, countedQty: number) => {
    if (!activeSession) return;
    setLines(prev => prev.map(l => l.id === lineId ? { ...l, countedQty } : l));
    try {
      await updateCountLine(activeSession.id, lineId, countedQty);
    } catch (e: any) {
      alert('Hata: ' + e.message);
    }
  };

  const handleFinalize = async () => {
    if (!activeSession) return;
    setFinalizing(true);
    try {
      await finalizeCountSession(activeSession.id);
      setShowFinalizeConfirm(false);
      setActiveSession(null);
      setLines([]);
      setView('list');
      await loadSessions();
      onFinalized();
    } catch (e: any) {
      alert('Hata: ' + e.message);
    } finally {
      setFinalizing(false);
    }
  };

  const handleCancel = async () => {
    if (!activeSession) return;
    if (!confirm('Bu sayım oturumunu iptal etmek istediğinizden emin misiniz? Hiçbir stok değişikliği kaydedilmeyecek.')) return;
    try {
      await cancelCountSession(activeSession.id);
      setActiveSession(null);
      setLines([]);
      setView('list');
      await loadSessions();
    } catch (e: any) {
      alert('Hata: ' + e.message);
    }
  };

  const varianceCount = lines.filter(l => l.countedQty !== l.expectedQty).length;
  const totalDelta = lines.reduce((s, l) => s + (l.countedQty - l.expectedQty), 0);

  const statusLabel: Record<string, { label: string; cls: string }> = {
    acik: { label: 'Açık', cls: 'bg-blue-100 text-blue-700' },
    tamamlandi: { label: 'Tamamlandı', cls: 'bg-emerald-100 text-emerald-700' },
    iptal: { label: 'İptal', cls: 'bg-gray-200 text-gray-600' },
  };

  if (view === 'active' && activeSession) {
    return (
      <div className="space-y-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-primary" /> Aktif Sayım
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Kapsam: {activeSession.categoryId ? getCategoryPath(activeSession.categoryId) : 'Tüm Ürünler'} · Başlangıç: {new Date(activeSession.startedAt).toLocaleString('tr-TR')}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleCancel} className="px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-xl cursor-pointer">
              İptal Et
            </button>
            <button onClick={() => setShowFinalizeConfirm(true)} className="px-4 py-2 bg-primary hover:bg-secondary text-white text-sm font-medium rounded-xl cursor-pointer">
              Sayımı Bitir
            </button>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[240px]">
              <Barcode className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                ref={scanInputRef}
                type="text"
                value={scanBuffer}
                onChange={e => setScanBuffer(e.target.value)}
                onKeyDown={handleScannerKeyDown}
                placeholder="Barkod / SKU okutun veya girip Enter'a basın..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-primary outline-none"
              />
            </div>
            <button
              onClick={() => setShowCamera(true)}
              className="inline-flex items-center px-4 py-2.5 border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-xl cursor-pointer"
            >
              <Camera className="w-4 h-4 mr-2 text-primary" /> Kamera ile Tara
            </button>
          </div>
          {scanError && <p className="text-xs font-semibold text-red-600">{scanError}</p>}

          <div className="flex gap-4 text-xs font-semibold text-gray-500">
            <span>{lines.length} ürün okutuldu</span>
            <span className={varianceCount > 0 ? 'text-amber-600' : 'text-emerald-600'}>{varianceCount} farklı satır</span>
            <span className={totalDelta === 0 ? 'text-gray-500' : totalDelta > 0 ? 'text-emerald-600' : 'text-red-600'}>
              Toplam fark: {totalDelta > 0 ? '+' : ''}{totalDelta} adet
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50/70 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 font-semibold">Ürün</th>
                  <th className="px-6 py-3 font-semibold">SKU / Barkod</th>
                  <th className="px-6 py-3 font-semibold text-center">Beklenen</th>
                  <th className="px-6 py-3 font-semibold text-center">Sayılan</th>
                  <th className="px-6 py-3 font-semibold text-center">Fark</th>
                  <th className="px-6 py-3 font-semibold text-center">Tarama</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {lines.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-16 text-gray-400 font-medium">Henüz barkod okutulmadı.</td></tr>
                ) : lines.map(line => {
                  const delta = line.countedQty - line.expectedQty;
                  return (
                    <tr key={line.id} className={`transition-colors ${flashLineId === line.id ? 'bg-emerald-50' : 'hover:bg-gray-50/40'}`}>
                      <td className="px-6 py-3 font-semibold text-gray-900">{line.name}</td>
                      <td className="px-6 py-3 font-mono text-xs text-gray-500">{line.sku} / {line.barcode || '—'}</td>
                      <td className="px-6 py-3 text-center text-gray-700">{line.expectedQty}</td>
                      <td className="px-6 py-3 text-center">
                        <input
                          type="number"
                          value={line.countedQty}
                          onChange={e => handleLineQtyChange(line.id, parseInt(e.target.value) || 0)}
                          className="w-20 border border-gray-300 rounded-lg px-2 py-1 text-center text-sm focus:ring-2 focus:ring-primary outline-none"
                        />
                      </td>
                      <td className={`px-6 py-3 text-center font-bold ${delta === 0 ? 'text-gray-400' : delta > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {delta > 0 ? '+' : ''}{delta}
                      </td>
                      <td className="px-6 py-3 text-center text-xs text-gray-400">{line.scanCount}x</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <CameraBarcodeScanner isOpen={showCamera} onClose={() => setShowCamera(false)} onScan={handleScan} />

        {showFinalizeConfirm && (
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50/50">
                <h2 className="text-base font-bold text-gray-900">Sayımı Bitir</h2>
                <button onClick={() => setShowFinalizeConfirm(false)} className="p-2 hover:bg-gray-100 rounded-xl cursor-pointer"><X className="w-5 h-5 text-gray-500" /></button>
              </div>
              <div className="p-5 space-y-2 text-sm text-gray-700">
                <p>{lines.length} ürün sayıldı, <span className="font-bold text-amber-600">{varianceCount}</span> üründe fark bulundu.</p>
                <p>Toplam adet farkı: <span className="font-bold">{totalDelta > 0 ? '+' : ''}{totalDelta}</span></p>
                <p className="text-xs text-gray-500">Onaylarsanız fark olan ürünlerin stok miktarı sayılan değere güncellenecek ve bir stok hareketi kaydı oluşturulacaktır.</p>
              </div>
              <div className="flex gap-3 p-5 border-t border-gray-100 bg-gray-50/50">
                <button onClick={() => setShowFinalizeConfirm(false)} className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl font-semibold hover:bg-gray-50 cursor-pointer">Vazgeç</button>
                <button
                  onClick={handleFinalize}
                  disabled={finalizing}
                  className="flex-1 bg-primary hover:bg-secondary text-white py-2.5 rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {finalizing && <RefreshCw className="w-4 h-4 animate-spin" />}
                  Onayla ve Bitir
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
        <div>
          <h3 className="font-bold text-gray-900">Stok Sayımı</h3>
          <p className="text-xs text-gray-500 mt-1">Barkod okutarak fiziksel sayım yapın, sistemdeki stokla karşılaştırın.</p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="inline-flex items-center px-4 py-2 bg-primary hover:bg-secondary text-white text-sm font-medium rounded-xl shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4 mr-2" /> Yeni Sayım Başlat
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h4 className="font-bold text-gray-900 text-sm">Sayım Geçmişi</h4>
        </div>
        {loadingSessions ? (
          <div className="flex items-center justify-center h-32">
            <RefreshCw className="w-6 h-6 text-primary animate-spin" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">Henüz sayım oturumu oluşturulmadı.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50/70 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 font-semibold">Tarih</th>
                  <th className="px-6 py-3 font-semibold">Kapsam</th>
                  <th className="px-6 py-3 font-semibold">Durum</th>
                  <th className="px-6 py-3 font-semibold text-center">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sessions.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50/40">
                    <td className="px-6 py-3 text-gray-700">{new Date(s.startedAt).toLocaleString('tr-TR')}</td>
                    <td className="px-6 py-3 text-gray-700">{s.categoryName || 'Tüm Ürünler'}</td>
                    <td className="px-6 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${statusLabel[s.status]?.cls}`}>{statusLabel[s.status]?.label || s.status}</span>
                    </td>
                    <td className="px-6 py-3 text-center">
                      <button
                        onClick={() => handleOpenSession(s.id, s.status !== 'acik')}
                        className="text-xs font-semibold text-primary hover:text-secondary px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                      >
                        {s.status === 'acik' ? 'Devam Et' : 'Detay'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showNewModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-base font-bold text-gray-900">Yeni Sayım Başlat</h2>
              <button onClick={() => setShowNewModal(false)} className="p-2 hover:bg-gray-100 rounded-xl cursor-pointer"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-5 space-y-3">
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Kapsam</label>
              <select
                value={newSessionCategoryId}
                onChange={e => setNewSessionCategoryId(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-primary outline-none"
              >
                <option value="">Tüm Ürünler</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-100 bg-gray-50/50">
              <button onClick={() => setShowNewModal(false)} className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl font-semibold hover:bg-gray-50 cursor-pointer">İptal</button>
              <button
                onClick={handleStartSession}
                disabled={starting}
                className="flex-1 bg-primary hover:bg-secondary text-white py-2.5 rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {starting && <RefreshCw className="w-4 h-4 animate-spin" />}
                Başlat
              </button>
            </div>
          </div>
        </div>
      )}

      {detailSession && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50/50 sticky top-0">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                {detailSession.status === 'tamamlandi' ? <CheckCircle className="w-5 h-5 text-emerald-600" /> : <XCircle className="w-5 h-5 text-gray-400" />}
                Sayım Detayı
              </h2>
              <button onClick={() => { setDetailSession(null); setDetailLines([]); }} className="p-2 hover:bg-gray-100 rounded-xl cursor-pointer"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-5">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase bg-gray-50/70 border-b border-gray-200">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Ürün</th>
                    <th className="px-3 py-2 font-semibold text-center">Beklenen</th>
                    <th className="px-3 py-2 font-semibold text-center">Sayılan</th>
                    <th className="px-3 py-2 font-semibold text-center">Fark</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {detailLines.map((line: any) => {
                    const delta = line.countedQty - line.expectedQty;
                    return (
                      <tr key={line.id}>
                        <td className="px-3 py-2 font-semibold text-gray-900">{line.name}</td>
                        <td className="px-3 py-2 text-center text-gray-700">{line.expectedQty}</td>
                        <td className="px-3 py-2 text-center text-gray-700">{line.countedQty}</td>
                        <td className={`px-3 py-2 text-center font-bold ${delta === 0 ? 'text-gray-400' : delta > 0 ? 'text-emerald-600' : 'text-red-600'}`}>{delta > 0 ? '+' : ''}{delta}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
