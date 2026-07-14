// Stok & Envanter yönetim ekranı — ürün CRUD, kategori, barkod, CSV, stok hareketi
import React, { useState, useEffect, useRef } from 'react';
import {
  Plus, Search, AlertTriangle, X, TrendingUp, TrendingDown,
  Trash2, Barcode, Printer, Upload, Download, Layers, Eye, RefreshCw, FileText,
  Image as ImageIcon
} from 'lucide-react';
import { 
  fetchAdminStock, createStockItem, updateStockItem, deleteStockItem, 
  fetchInventoryCategories, createInventoryCategory, deleteInventoryCategory,
  updateInventoryCategory
} from '../../lib/api';
import { mediaUrl } from '../../lib/media';
import MediaPicker from '../../components/ui/MediaPicker';

export default function AdminStock() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [adjustingId, setAdjustingId] = useState<number | null>(null);
  const [adjustAmount, setAdjustAmount] = useState('');

  const [activeTab, setActiveTab] = useState<'items' | 'categories'>('items');
  const [categories, setCategories] = useState<any[]>([]);
  const [newCategory, setNewCategory] = useState({ name: '', description: '', parentId: '' });
  const [editingCategory, setEditingCategory] = useState<any | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'critical' | 'ok'>('all');

  // Barcode Printer State
  const [printItem, setPrintItem] = useState<any | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  // Barcode Scanner State
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [scanBuffer, setScanBuffer] = useState('');
  const scannerInputRef = useRef<HTMLInputElement>(null);

  // CSV Import State
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any | null>(null);

  const [newItem, setNewItem] = useState({
    sku: '', barcode: '', name: '', brand: '', model: '', 
    unit: 'adet', vatRate: '20', imageUrl: '', description: '',
    currentStock: '', minStockLevel: '5', costPrice: '', sellingPrice: '',
    categoryId: '', hasSerialTracking: false, warrantyMonths: 0
  });

  const load = async () => {
    try {
      const [itemData, catData] = await Promise.all([
        fetchAdminStock(),
        fetchInventoryCategories()
      ]);
      setItems(itemData);
      setCategories(catData);
    } catch (e) { 
      console.error(e); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { 
    load(); 
  }, []);

  // Auto-focus scanner input when modal is open
  useEffect(() => {
    if (showScannerModal && scannerInputRef.current) {
      scannerInputRef.current.focus();
    }
  }, [showScannerModal]);

  const handleScannerKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const barcodeValue = scanBuffer.trim();
      if (barcodeValue) {
        // Find product with this barcode
        const matched = items.find(i => i.barcode === barcodeValue || i.sku === barcodeValue);
        if (matched) {
          setShowScannerModal(false);
          setScanBuffer('');
          // Trigger quick stock edit or details modal
          setAdjustingId(matched.id);
        } else {
          alert(`Barkod/SKU bulunamadı: ${barcodeValue}`);
          setScanBuffer('');
        }
      }
    }
  };

  const handleImportCSV = async () => {
    if (!importFile) return;
    setImporting(true);
    setImportResult(null);
    try {
      const token = localStorage.getItem('admin_token');
      const formData = new FormData();
      formData.append('file', importFile);

      const res = await fetch('/api/admin/stock/import-csv', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'İçe aktarma başarısız.');

      setImportResult({
        success: true,
        imported: data.imported,
        updated: data.updated
      });
      setImportFile(null);
      await load();
    } catch (e: any) {
      setImportResult({ success: false, error: e.message });
    } finally {
      setImporting(false);
    }
  };

  // Helper to build category tree label
  const getCategoryPath = (catId: number): string => {
    const cat = categories.find(c => c.id === catId);
    if (!cat) return '';
    if (cat.parentId) {
      return `${getCategoryPath(cat.parentId)} > ${cat.name}`;
    }
    return cat.name;
  };

  const filtered = items.filter(i => {
    const matchSearch = !search ||
      i.name?.toLowerCase().includes(search.toLowerCase()) ||
      i.sku?.toLowerCase().includes(search.toLowerCase()) ||
      i.barcode?.toLowerCase().includes(search.toLowerCase()) ||
      i.brand?.toLowerCase().includes(search.toLowerCase()) ||
      i.model?.toLowerCase().includes(search.toLowerCase());
    const matchCategory = !categoryFilter || i.categoryId === parseInt(categoryFilter);
    const matchStatus = statusFilter === 'all' ||
      (statusFilter === 'critical' && (i.currentStock || 0) <= (i.minStockLevel || 0)) ||
      (statusFilter === 'ok' && (i.currentStock || 0) > (i.minStockLevel || 0));
    return matchSearch && matchCategory && matchStatus;
  });

  const totalItems = items.length;
  const totalQty = items.reduce((s, i) => s + (i.currentStock || 0), 0);
  const criticalCount = items.filter(i => (i.currentStock || 0) <= (i.minStockLevel || 0)).length;

  const handleCreate = async () => {
    if (!newItem.name) return;
    setSaving(true);
    try {
      await createStockItem(newItem);
      setShowModal(false);
      setNewItem({
        sku: '', barcode: '', name: '', brand: '', model: '', 
        unit: 'adet', vatRate: '20', imageUrl: '', description: '',
        currentStock: '', minStockLevel: '5', costPrice: '', sellingPrice: '',
        categoryId: '', hasSerialTracking: false, warrantyMonths: 0
      });
      await load();
    } catch (e: any) { 
      alert('Hata: ' + e.message); 
    } finally { 
      setSaving(false); 
    }
  };

  const handleUpdate = async () => {
    if (!editingItem || !editingItem.name) return;
    setSaving(true);
    try {
      await updateStockItem(editingItem.id, editingItem);
      setEditingItem(null);
      await load();
    } catch (e: any) { 
      alert('Hata: ' + e.message); 
    } finally { 
      setSaving(false); 
    }
  };

  const handleAdjust = async (id: number, direction: number) => {
    const amt = parseInt(adjustAmount) || 1;
    try {
      await updateStockItem(id, { adjustment: direction * amt });
      setAdjustingId(null);
      setAdjustAmount('');
      await load();
    } catch (e: any) { 
      alert('Hata: ' + e.message); 
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bu ürünü silmek istediğinizden emin misiniz?')) return;
    try {
      await deleteStockItem(id);
      await load();
    } catch (e: any) { 
      alert('Hata: ' + e.message); 
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategory.name) return;
    setSaving(true);
    try {
      await createInventoryCategory({
        name: newCategory.name,
        description: newCategory.description,
        parentId: newCategory.parentId ? parseInt(newCategory.parentId) : undefined
      });
      setNewCategory({ name: '', description: '', parentId: '' });
      await load();
    } catch (e: any) { 
      alert('Hata: ' + e.message); 
    } finally { 
      setSaving(false); 
    }
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory || !editingCategory.name) return;
    setSaving(true);
    try {
      await updateInventoryCategory(editingCategory.id, {
        name: editingCategory.name,
        description: editingCategory.description,
        parentId: editingCategory.parentId ? parseInt(editingCategory.parentId) : null
      });
      setEditingCategory(null);
      await load();
    } catch (e: any) {
      alert('Hata: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!confirm('Bu kategoriyi silmek istediğinizden emin misiniz? (Bağlı ürünlerin kategorisi sıfırlanacaktır)')) return;
    try {
      await deleteInventoryCategory(id);
      await load();
    } catch (e: any) { 
      alert('Hata: ' + e.message); 
    }
  };

  const getStatusLabel = (item: any) => {
    const stock = item.currentStock || 0;
    const min = item.minStockLevel || 0;
    if (stock === 0) return { label: 'Tükendi', cls: 'bg-red-100 text-red-700' };
    if (stock <= min) return { label: 'Kritik', cls: 'bg-red-100 text-red-700' };
    if (stock <= min * 2) return { label: 'Azalıyor', cls: 'bg-amber-100 text-amber-700' };
    return { label: 'Yeterli', cls: 'bg-emerald-100 text-emerald-800' };
  };

  const handlePrintBarcode = () => {
    const printContent = printRef.current?.innerHTML;
    if (printContent) {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);
      
      const doc = iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(`
          <html>
            <head>
              <title>Barkod Yazdır - ${printItem.name}</title>
              <style>
                body { margin: 0; padding: 20px; font-family: monospace; display: flex; justify-content: center; align-items: center; }
                .label { border: 1px dashed #ccc; padding: 20px; text-align: center; width: 60mm; height: 40mm; display: flex; flex-direction: column; justify-content: space-between; box-sizing: border-box; }
                .title { font-size: 11px; font-weight: bold; margin-bottom: 5px; word-break: break-all; max-height: 2.4em; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
                .barcode-visual { height: 12mm; display: flex; align-items: center; justify-content: center; margin: 10px 0; border-top: 1px solid #000; border-bottom: 1px solid #000; letter-spacing: 4px; font-weight: bold; }
                .price { font-size: 14px; font-weight: bold; margin-top: 5px; }
                .barcode-text { font-size: 10px; font-family: monospace; }
                @media print {
                  body { padding: 0; }
                  .label { border: none; }
                }
              </style>
            </head>
            <body>
              <div class="label">
                <div class="title">${printItem.name}</div>
                <div class="barcode-visual">||| | || ||| || | |||</div>
                <div>
                  <div class="barcode-text">${printItem.barcode}</div>
                  <div class="price">Fiyat: ₺${parseFloat(printItem.sellingPrice || '0').toLocaleString('tr-TR')}</div>
                </div>
              </div>
              <script>
                window.onload = function() {
                  window.print();
                  setTimeout(function() { window.frameElement.remove(); }, 100);
                }
              </script>
            </body>
          </html>
        `);
        doc.close();
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <Layers className="w-7 h-7 text-primary" /> Stok ve Envanter Yönetimi
          </h1>
          <p className="text-sm text-gray-500 mt-1">Ürünlerinizi, barkodlarınızı, kategorilerinizi ve depo hareketlerinizi yönetin.</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <button
            onClick={() => setShowScannerModal(true)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-xl transition-colors shadow-sm bg-white cursor-pointer"
          >
            <Barcode className="w-4 h-4 mr-2 text-primary" /> Barkod Oku
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-xl transition-colors shadow-sm bg-white cursor-pointer"
          >
            <Upload className="w-4 h-4 mr-2 text-amber-600" /> CSV Yükle
          </button>
          <a
            href="/api/admin/stock/export-excel"
            className="inline-flex items-center px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-xl transition-colors shadow-sm bg-white"
          >
            <Download className="w-4 h-4 mr-2 text-emerald-600" /> Excel İndir
          </a>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center px-4 py-2 bg-primary hover:bg-secondary text-white text-sm font-medium rounded-xl shadow-sm transition-all duration-200 cursor-pointer"
          >
            <Plus className="w-4 h-4 mr-2" /> Yeni Ürün Ekle
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('items')}
          className={`pb-3 text-sm font-semibold transition-all border-b-2 px-2 cursor-pointer ${activeTab === 'items' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
        >
          Stok Kalemleri
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={`pb-3 text-sm font-semibold transition-all border-b-2 px-2 cursor-pointer ${activeTab === 'categories' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
        >
          Kategori Yönetimi
        </button>
      </div>

      {activeTab === 'items' ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm transition-all hover:shadow-md">
              <p className="text-sm text-gray-500 font-medium mb-1">Toplam Çeşit</p>
              <p className="text-3xl font-bold text-gray-900">{totalItems} <span className="text-sm font-normal text-gray-400">kalem</span></p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm transition-all hover:shadow-md">
              <p className="text-sm text-gray-500 font-medium mb-1">Toplam Stok Adedi</p>
              <p className="text-3xl font-bold text-gray-900">{totalQty.toLocaleString('tr-TR')} <span className="text-sm font-normal text-gray-400">adet</span></p>
            </div>
            <div className={`p-5 rounded-2xl border shadow-sm transition-all hover:shadow-md ${criticalCount > 0 ? 'bg-red-50/50 border-red-200' : 'bg-white border-gray-200'}`}>
              <p className={`text-sm font-semibold mb-1 flex items-center gap-1.5 ${criticalCount > 0 ? 'text-red-600' : 'text-gray-500'}`}>
                {criticalCount > 0 && <AlertTriangle className="w-4 h-4 text-red-500 animate-pulse" />} Kritik Stok
              </p>
              <p className="text-3xl font-bold text-gray-900">{criticalCount} <span className="text-sm font-normal text-gray-400">ürün</span></p>
            </div>
          </div>

          {/* Filtering and Table */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
                <div className="relative w-full max-w-xs">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="Ad, SKU, Barkod, Marka, Model..."
                    value={search} 
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                  />
                </div>
                {categories.length > 0 && (
                  <select
                    value={categoryFilter}
                    onChange={e => setCategoryFilter(e.target.value)}
                    className="border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-700 focus:ring-2 focus:ring-primary bg-white outline-none"
                  >
                    <option value="">Tüm Kategoriler</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{getCategoryPath(c.id)}</option>
                    ))}
                  </select>
                )}
              </div>
              <div className="flex gap-1.5 bg-gray-100 p-1 rounded-xl">
                {(['all', 'critical', 'ok'] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      statusFilter === s
                        ? s === 'critical' ? 'bg-red-600 text-white shadow-sm' : s === 'ok' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-gray-900 text-white shadow-sm'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
                    }`}
                  >
                    {s === 'all' ? `Tümü (${items.length})` : s === 'critical' ? `Kritik (${items.filter(i => (i.currentStock || 0) <= (i.minStockLevel || 0)).length})` : `Yeterli (${items.filter(i => (i.currentStock || 0) > (i.minStockLevel || 0)).length})`}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3">
                <RefreshCw className="w-8 h-8 text-primary animate-spin" />
                <span className="text-sm text-gray-500 font-medium">Stok verileri yükleniyor...</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-500 uppercase bg-gray-50/70 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 font-semibold">Görsel / Barkod</th>
                      <th className="px-6 py-4 font-semibold">SKU / Model</th>
                      <th className="px-6 py-4 font-semibold">Ürün Adı</th>
                      <th className="px-6 py-4 font-semibold">Kategori / Marka</th>
                      <th className="px-6 py-4 font-semibold text-center">Mevcut / Kritik</th>
                      <th className="px-6 py-4 font-semibold">Durum</th>
                      <th className="px-6 py-4 font-semibold text-center">Stok Güncelle</th>
                      <th className="px-6 py-4 font-semibold text-center">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-16 text-gray-400 font-medium bg-gray-50/30">
                          Stok kalemi bulunamadı.
                        </td>
                      </tr>
                    ) : filtered.map(item => {
                      const st = getStatusLabel(item);
                      const isAdjusting = adjustingId === item.id;
                      return (
                        <tr key={item.id} className="hover:bg-gray-50/40 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              {item.imageUrl ? (
                                <img src={mediaUrl(item.imageUrl)} alt={item.name} className="w-10 h-10 object-cover rounded-lg border animate-fade-in" />
                              ) : (
                                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center border text-gray-400">
                                  <FileText className="w-5 h-5" />
                                </div>
                              )}
                              <div className="flex flex-col">
                                <span className="font-mono text-xs text-gray-500 flex items-center gap-1">
                                  <Barcode className="w-3.5 h-3.5 text-gray-400" /> {item.barcode || '—'}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="font-mono text-xs font-semibold text-gray-800 bg-gray-100 px-2 py-0.5 rounded w-max">{item.sku}</span>
                              <span className="text-xs text-gray-400 mt-1">{item.model || 'Model yok'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-semibold text-gray-900">{item.name}</div>
                            <div className="text-xs text-gray-400">{item.unit || 'adet'}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-700">{item.categoryId ? getCategoryPath(item.categoryId) : '—'}</div>
                            <div className="text-xs text-gray-400">{item.brand || 'Markasız'}</div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="font-bold text-gray-900">{item.currentStock ?? 0}</div>
                            <div className="text-[11px] text-gray-400">min: {item.minStockLevel ?? 0}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${st.cls}`}>{st.label}</span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            {isAdjusting ? (
                              <div className="flex items-center justify-center gap-1.5">
                                <input
                                  type="number"
                                  min="1"
                                  autoFocus
                                  value={adjustAmount}
                                  onChange={e => setAdjustAmount(e.target.value)}
                                  placeholder="Adet"
                                  className="w-16 border border-gray-300 rounded-lg px-2 py-1 text-xs text-center outline-none focus:ring-1 focus:ring-primary"
                                />
                                <button
                                  onClick={() => handleAdjust(item.id, 1)}
                                  title="Stok girişi"
                                  className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg cursor-pointer"
                                >
                                  <TrendingUp className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleAdjust(item.id, -1)}
                                  title="Stok çıkışı"
                                  className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg cursor-pointer"
                                >
                                  <TrendingDown className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => { setAdjustingId(null); setAdjustAmount(''); }}
                                  className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg cursor-pointer"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => { setAdjustingId(item.id); setAdjustAmount(''); }}
                                className="text-xs font-semibold text-primary hover:text-secondary px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                              >
                                Giriş / Çıkış
                              </button>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => setEditingItem({ ...item, categoryId: item.categoryId || '' })}
                                title="Düzenle"
                                className="p-1.5 text-gray-500 hover:text-primary hover:bg-primary/10 rounded-lg cursor-pointer"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setPrintItem(item)}
                                title="Barkod Yazdır"
                                className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg cursor-pointer"
                              >
                                <Printer className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(item.id)}
                                title="Sil"
                                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        /* ===================== KATEGORİ YÖNETİMİ ===================== */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Yeni / Düzenle kategori formu */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm h-max">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4 text-primary" /> {editingCategory ? 'Kategoriyi Düzenle' : 'Yeni Kategori'}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Kategori Adı *</label>
                <input
                  type="text"
                  value={editingCategory ? editingCategory.name : newCategory.name}
                  onChange={e => editingCategory
                    ? setEditingCategory({ ...editingCategory, name: e.target.value })
                    : setNewCategory({ ...newCategory, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                  placeholder="Örn: Ekran Kartları"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Üst Kategori</label>
                <select
                  value={editingCategory ? (editingCategory.parentId || '') : newCategory.parentId}
                  onChange={e => editingCategory
                    ? setEditingCategory({ ...editingCategory, parentId: e.target.value })
                    : setNewCategory({ ...newCategory, parentId: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-primary outline-none"
                >
                  <option value="">Ana Kategori (yok)</option>
                  {categories.filter(c => !editingCategory || c.id !== editingCategory.id).map(c => (
                    <option key={c.id} value={c.id}>{getCategoryPath(c.id)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Açıklama</label>
                <textarea
                  rows={2}
                  value={editingCategory ? (editingCategory.description || '') : newCategory.description}
                  onChange={e => editingCategory
                    ? setEditingCategory({ ...editingCategory, description: e.target.value })
                    : setNewCategory({ ...newCategory, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none resize-none"
                />
              </div>
              <div className="flex gap-2 pt-1">
                {editingCategory && (
                  <button
                    onClick={() => setEditingCategory(null)}
                    className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-xl font-semibold hover:bg-gray-50 cursor-pointer"
                  >
                    İptal
                  </button>
                )}
                <button
                  onClick={editingCategory ? handleUpdateCategory : handleCreateCategory}
                  disabled={saving || (editingCategory ? !editingCategory.name : !newCategory.name)}
                  className="flex-1 bg-primary hover:bg-secondary text-white py-2 rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {saving && <RefreshCw className="w-4 h-4 animate-spin" />}
                  {editingCategory ? 'Güncelle' : 'Ekle'}
                </button>
              </div>
            </div>
          </div>

          {/* Kategori listesi */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Kategoriler ({categories.length})</h3>
            </div>
            {categories.length === 0 ? (
              <div className="text-center py-16 text-gray-400 text-sm">Henüz kategori eklenmedi.</div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {categories.map(cat => (
                  <li key={cat.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50/40">
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">{getCategoryPath(cat.id)}</p>
                      {cat.description && <p className="text-xs text-gray-400 mt-0.5">{cat.description}</p>}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setEditingCategory({ ...cat, parentId: cat.parentId || '' })}
                        className="p-1.5 text-gray-500 hover:text-primary hover:bg-primary/10 rounded-lg cursor-pointer"
                        title="Düzenle"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(cat.id)}
                        className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                        title="Sil"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* ===================== YENİ / DÜZENLE ÜRÜN MODALI ===================== */}
      {(showModal || editingItem) && (() => {
        const isEdit = !!editingItem;
        const data: any = isEdit ? editingItem : newItem;
        const setField = (field: string, value: any) => isEdit
          ? setEditingItem({ ...editingItem, [field]: value })
          : setNewItem({ ...newItem, [field]: value });
        const close = () => isEdit ? setEditingItem(null) : setShowModal(false);
        return (
          <>
            <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50/50 sticky top-0">
                <h2 className="text-base font-bold text-gray-900">{isEdit ? 'Ürünü Düzenle' : 'Yeni Ürün Ekle'}</h2>
                <button onClick={close} className="p-2 hover:bg-gray-100 rounded-xl cursor-pointer"><X className="w-5 h-5 text-gray-500" /></button>
              </div>
              <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Ürün Adı *</label>
                  <input type="text" value={data.name || ''} onChange={e => setField('name', e.target.value)} className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">SKU</label>
                  <input type="text" value={data.sku || ''} onChange={e => setField('sku', e.target.value)} className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Barkod</label>
                  <input type="text" value={data.barcode || ''} onChange={e => setField('barcode', e.target.value)} className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Marka</label>
                  <input type="text" value={data.brand || ''} onChange={e => setField('brand', e.target.value)} className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Model</label>
                  <input type="text" value={data.model || ''} onChange={e => setField('model', e.target.value)} className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Kategori</label>
                  <select value={data.categoryId || ''} onChange={e => setField('categoryId', e.target.value)} className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-primary outline-none">
                    <option value="">Kategorisiz</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{getCategoryPath(c.id)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Birim</label>
                  <input type="text" value={data.unit || ''} onChange={e => setField('unit', e.target.value)} className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none" placeholder="adet" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">KDV (%)</label>
                  <input type="number" value={data.vatRate ?? ''} onChange={e => setField('vatRate', e.target.value)} className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Alış Fiyatı (₺)</label>
                  <input type="number" step="0.01" value={data.costPrice ?? ''} onChange={e => setField('costPrice', e.target.value)} className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Satış Fiyatı (₺)</label>
                  <input type="number" step="0.01" value={data.sellingPrice ?? ''} onChange={e => setField('sellingPrice', e.target.value)} className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none" />
                </div>
                {!isEdit && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Başlangıç Stok</label>
                    <input type="number" value={data.currentStock ?? ''} onChange={e => setField('currentStock', e.target.value)} className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none" />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Kritik Stok Seviyesi</label>
                  <input type="number" value={data.minStockLevel ?? ''} onChange={e => setField('minStockLevel', e.target.value)} className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Seri No Takibi</label>
                  <div className="flex items-center h-[38px]">
                    <input type="checkbox" checked={data.hasSerialTracking || false} onChange={e => setField('hasSerialTracking', e.target.checked)} className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary cursor-pointer" />
                    <span className="ml-2 text-sm text-gray-700">Aktif</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Garanti Süresi (Ay)</label>
                  <input type="number" value={data.warrantyMonths ?? 0} onChange={e => setField('warrantyMonths', parseInt(e.target.value) || 0)} className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Ürün Görseli</label>
                  <div className="flex gap-2">
                    <input type="text" value={data.imageUrl || ''} onChange={e => setField('imageUrl', e.target.value)} className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none" placeholder="/uploads/..." />
                    <button
                      type="button"
                      onClick={() => setIsMediaPickerOpen(true)}
                      className="px-4 bg-slate-100 hover:bg-slate-200 border border-gray-300 text-gray-700 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <ImageIcon className="w-4 h-4" /> Medya Seç
                    </button>
                  </div>
                  {data.imageUrl && (
                    <div className="mt-2 relative w-16 h-16 border rounded-lg overflow-hidden bg-white">
                      <img src={mediaUrl(data.imageUrl)} alt="Önizleme" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setField('imageUrl', '')}
                        className="absolute top-0 right-0 bg-red-500 text-white rounded-bl p-0.5 hover:bg-red-600 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Açıklama</label>
                  <textarea rows={2} value={data.description || ''} onChange={e => setField('description', e.target.value)} className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none resize-none" />
                </div>
              </div>
              <div className="flex gap-3 p-5 border-t border-gray-100 bg-gray-50/50 sticky bottom-0">
                <button onClick={close} className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl font-semibold hover:bg-gray-50 cursor-pointer">İptal</button>
                <button
                  onClick={isEdit ? handleUpdate : handleCreate}
                  disabled={saving || !data.name}
                  className="flex-1 bg-primary hover:bg-secondary text-white py-2.5 rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {saving && <RefreshCw className="w-4 h-4 animate-spin" />}
                  {isEdit ? 'Değişiklikleri Kaydet' : 'Ürünü Kaydet'}
                </button>
              </div>
            </div>
          </div>
          {/* Media Picker Modal */}
          <MediaPicker
            isOpen={isMediaPickerOpen}
            onClose={() => setIsMediaPickerOpen(false)}
            onSelect={(url) => {
              setField('imageUrl', url);
              setIsMediaPickerOpen(false);
            }}
          />
        </>
        );
      })()}

      {/* ===================== BARKOD OKUYUCU MODALI ===================== */}
      {showScannerModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2"><Barcode className="w-5 h-5 text-primary" /> Barkod Oku</h2>
              <button onClick={() => { setShowScannerModal(false); setScanBuffer(''); }} className="p-2 hover:bg-gray-100 rounded-xl cursor-pointer"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-xs text-gray-500">Barkodu okutun veya SKU girip Enter'a basın. Eşleşen ürünün stok giriş/çıkış alanı otomatik açılır.</p>
              <input
                ref={scannerInputRef}
                type="text"
                value={scanBuffer}
                onChange={e => setScanBuffer(e.target.value)}
                onKeyDown={handleScannerKeyDown}
                placeholder="Barkod / SKU..."
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm font-semibold focus:ring-2 focus:ring-primary outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* ===================== CSV İÇE AKTARMA MODALI ===================== */}
      {showImportModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2"><Upload className="w-5 h-5 text-amber-600" /> CSV ile Toplu Yükle</h2>
              <button onClick={() => { setShowImportModal(false); setImportResult(null); setImportFile(null); }} className="p-2 hover:bg-gray-100 rounded-xl cursor-pointer"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-5 space-y-4">
              <input
                type="file"
                accept=".csv"
                onChange={e => setImportFile(e.target.files?.[0] || null)}
                className="w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary/10 file:text-primary file:font-semibold hover:file:bg-primary/20 cursor-pointer"
              />
              {importResult && (
                <div className={`text-xs font-semibold p-3 rounded-lg ${importResult.success ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                  {importResult.success
                    ? `Tamamlandı: ${importResult.imported || 0} yeni, ${importResult.updated || 0} güncellendi.`
                    : `Hata: ${importResult.error}`}
                </div>
              )}
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-100 bg-gray-50/50">
              <button onClick={() => { setShowImportModal(false); setImportResult(null); setImportFile(null); }} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-xl font-semibold hover:bg-gray-50 cursor-pointer">Kapat</button>
              <button
                onClick={handleImportCSV}
                disabled={importing || !importFile}
                className="flex-1 bg-primary hover:bg-secondary text-white py-2 rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {importing && <RefreshCw className="w-4 h-4 animate-spin" />}
                İçe Aktar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== BARKOD YAZDIR MODALI ===================== */}
      {printItem && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2"><Printer className="w-5 h-5 text-primary" /> Barkod Etiketi</h2>
              <button onClick={() => setPrintItem(null)} className="p-2 hover:bg-gray-100 rounded-xl cursor-pointer"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-5">
              <div ref={printRef} className="border border-dashed border-gray-300 rounded-xl p-5 text-center">
                <div className="font-bold text-sm mb-2 line-clamp-2">{printItem.name}</div>
                <div className="border-y border-black py-2 my-2 tracking-[4px] font-bold">||| | || ||| || | |||</div>
                <div className="text-xs font-mono">{printItem.barcode || '—'}</div>
                <div className="text-sm font-bold mt-1">Fiyat: ₺{parseFloat(printItem.sellingPrice || '0').toLocaleString('tr-TR')}</div>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-100 bg-gray-50/50">
              <button onClick={() => setPrintItem(null)} className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl font-semibold hover:bg-gray-50 cursor-pointer">Kapat</button>
              <button onClick={handlePrintBarcode} className="flex-1 bg-primary hover:bg-secondary text-white py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 cursor-pointer">
                <Printer className="w-4 h-4" /> Yazdır
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
