import React, { useState, useEffect, useRef } from 'react';
import {
  Plus, Search, AlertTriangle, X, TrendingUp, TrendingDown,
  Trash2, Barcode, Printer, Upload, Download, Layers, Eye, RefreshCw, FileText,
  Image as ImageIcon, ShoppingCart, Send, Zap, CheckSquare, Square, Percent,
  History, Sparkles, Filter, ArrowUpDown
} from 'lucide-react';
import {
  fetchAdminStock, createStockItem, updateStockItem, deleteStockItem,
  fetchInventoryCategories, createInventoryCategory, deleteInventoryCategory,
  updateInventoryCategory,
  fetchChannelMappings, createChannelMapping, updateChannelMapping, deleteChannelMapping
} from '../../lib/api';
import { mediaUrl } from '../../lib/media';
import MediaPicker from '../../components/ui/MediaPicker';
import { validateGTIN, generateEAN13 } from '../../lib/barcode';
import StockCountTab from './stock/StockCountTab';
import StockMovementsTab from './stock/StockMovementsTab';

export default function AdminStock() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showPoModal, setShowPoModal] = useState(false);
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [adjustingId, setAdjustingId] = useState<number | null>(null);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'items' | 'categories' | 'movements' | 'sayim'>('items');
  const [categories, setCategories] = useState<any[]>([]);
  const [newCategory, setNewCategory] = useState({ name: '', description: '', parentId: '' });
  const [editingCategory, setEditingCategory] = useState<any | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'critical' | 'ok'>('all');
  const [sortBy, setSortBy] = useState<'name_asc' | 'stock_asc' | 'stock_desc' | 'price_asc' | 'price_desc'>('name_asc');

  // Hızlı Stok Girişi (Mal Kabul) State
  const [showRapidModal, setShowRapidModal] = useState(false);
  const [rapidScanCode, setRapidScanCode] = useState('');
  const [rapidQty, setRapidQty] = useState('1');
  const [rapidSupplierNote, setRapidSupplierNote] = useState('');
  const [rapidLogs, setRapidLogs] = useState<any[]>([]);
  const rapidInputRef = useRef<HTMLInputElement>(null);

  // Bulk Selection State
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showBulkCategoryModal, setShowBulkCategoryModal] = useState(false);
  const [showBulkVatModal, setShowBulkVatModal] = useState(false);
  const [showBulkPriceModal, setShowBulkPriceModal] = useState(false);
  const [bulkPriceTarget, setBulkPriceTarget] = useState<'sellingPrice' | 'costPrice' | 'wholesalePrice'>('sellingPrice');
  const [bulkPriceMode, setBulkPriceMode] = useState<'percent' | 'fixed' | 'margin'>('percent');
  const [bulkPriceVal, setBulkPriceVal] = useState('10');
  const [bulkCategoryVal, setBulkCategoryVal] = useState('');
  const [bulkVatVal, setBulkVatVal] = useState('20');
  const [bulkActionSaving, setBulkActionSaving] = useState(false);

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
    categoryId: '', hasSerialTracking: false, warrantyMonths: 0, supplier: '',
    wholesalePrice: '', currency: 'TRY', gtipCode: '', accountingCode: '', landedCost: ''
  });

  // E-ticaret Kanal Eşleme (yalnızca düzenleme modunda)
  const CHANNEL_OPTIONS = [
    { value: 'ikas', label: 'ikas' },
    { value: 'shopify', label: 'Shopify' },
    { value: 'trendyol', label: 'Trendyol' },
    { value: 'hepsiburada', label: 'Hepsiburada' },
    { value: 'n11', label: 'N11' },
    { value: 'diger', label: 'Diğer' },
  ];
  const [channelMappings, setChannelMappings] = useState<any[]>([]);
  const [channelMappingsLoading, setChannelMappingsLoading] = useState(false);
  const [newMappingChannel, setNewMappingChannel] = useState('ikas');

  useEffect(() => {
    if (editingItem?.id) {
      setChannelMappingsLoading(true);
      fetchChannelMappings(editingItem.id)
        .then(setChannelMappings)
        .catch(() => setChannelMappings([]))
        .finally(() => setChannelMappingsLoading(false));
    } else {
      setChannelMappings([]);
    }
  }, [editingItem?.id]);

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

  const availableBrands = Array.from(new Set(items.map(i => i.brand).filter(Boolean))).sort();
  const availableSuppliers = Array.from(new Set(items.map(i => i.supplier).filter(Boolean))).sort();

  const filtered = items.filter(i => {
    const matchSearch = !search ||
      i.name?.toLowerCase().includes(search.toLowerCase()) ||
      i.sku?.toLowerCase().includes(search.toLowerCase()) ||
      i.barcode?.toLowerCase().includes(search.toLowerCase()) ||
      i.brand?.toLowerCase().includes(search.toLowerCase()) ||
      i.model?.toLowerCase().includes(search.toLowerCase());
    const matchCategory = !categoryFilter || i.categoryId === parseInt(categoryFilter);
    const matchBrand = !brandFilter || i.brand === brandFilter;
    const matchSupplier = !supplierFilter || i.supplier === supplierFilter;
    const matchStatus = statusFilter === 'all' ||
      (statusFilter === 'critical' && (i.currentStock || 0) <= (i.minStockLevel || 0)) ||
      (statusFilter === 'ok' && (i.currentStock || 0) > (i.minStockLevel || 0));
    return matchSearch && matchCategory && matchBrand && matchSupplier && matchStatus;
  }).sort((a, b) => {
    if (sortBy === 'stock_asc') return (a.currentStock || 0) - (b.currentStock || 0);
    if (sortBy === 'stock_desc') return (b.currentStock || 0) - (a.currentStock || 0);
    if (sortBy === 'price_asc') return (parseFloat(a.sellingPrice) || 0) - (parseFloat(b.sellingPrice) || 0);
    if (sortBy === 'price_desc') return (parseFloat(b.sellingPrice) || 0) - (parseFloat(a.sellingPrice) || 0);
    return (a.name || '').localeCompare(b.name || '', 'tr');
  });

  const totalItems = items.length;
  const totalQty = items.reduce((s, i) => s + (i.currentStock || 0), 0);
  const criticalCount = items.filter(i => (i.currentStock || 0) <= (i.minStockLevel || 0)).length;

  // Bulk Selection Helpers
  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map(i => i.id));
    }
  };

  const toggleSelectOne = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleBulkCategory = async () => {
    if (selectedIds.length === 0) return;
    setBulkActionSaving(true);
    try {
      const catId = bulkCategoryVal ? parseInt(bulkCategoryVal) : null;
      await Promise.all(selectedIds.map(id => updateStockItem(id, { categoryId: catId })));
      setShowBulkCategoryModal(false);
      setSelectedIds([]);
      await load();
    } catch (e: any) {
      alert('Toplu kategori güncelleme hatası: ' + e.message);
    } finally {
      setBulkActionSaving(false);
    }
  };

  const handleBulkVat = async () => {
    if (selectedIds.length === 0) return;
    setBulkActionSaving(true);
    try {
      const vatRate = parseInt(bulkVatVal) || 20;
      await Promise.all(selectedIds.map(id => updateStockItem(id, { vatRate })));
      setShowBulkVatModal(false);
      setSelectedIds([]);
      await load();
    } catch (e: any) {
      alert('Toplu KDV güncelleme hatası: ' + e.message);
    } finally {
      setBulkActionSaving(false);
    }
  };

  const handleBulkPriceUpdate = async () => {
    if (selectedIds.length === 0) return;
    const val = parseFloat(bulkPriceVal);
    if (isNaN(val)) {
      alert('Lütfen geçerli bir sayısal değer girin.');
      return;
    }
    setBulkActionSaving(true);
    try {
      const selectedItems = items.filter(i => selectedIds.includes(i.id));
      await Promise.all(selectedItems.map(item => {
        const updateData: any = {};
        if (bulkPriceMode === 'percent') {
          const current = parseFloat(item[bulkPriceTarget] || '0') || 0;
          const updated = Math.max(0, current * (1 + val / 100));
          updateData[bulkPriceTarget] = updated.toFixed(2);
        } else if (bulkPriceMode === 'fixed') {
          const current = parseFloat(item[bulkPriceTarget] || '0') || 0;
          const updated = Math.max(0, current + val);
          updateData[bulkPriceTarget] = updated.toFixed(2);
        } else if (bulkPriceMode === 'margin') {
          const cost = parseFloat(item.costPrice || '0') || 0;
          if (cost > 0) {
            const updated = cost * (1 + val / 100);
            updateData.sellingPrice = updated.toFixed(2);
          }
        }
        return updateStockItem(item.id, updateData);
      }));
      setShowBulkPriceModal(false);
      setSelectedIds([]);
      await load();
    } catch (e: any) {
      alert('Toplu fiyat güncelleme hatası: ' + e.message);
    } finally {
      setBulkActionSaving(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Seçilen ${selectedIds.length} ürünü silmek istediğinize emin misiniz?`)) return;
    setBulkActionSaving(true);
    try {
      await Promise.all(selectedIds.map(id => deleteStockItem(id)));
      setSelectedIds([]);
      await load();
    } catch (e: any) {
      alert('Toplu silme hatası: ' + e.message);
    } finally {
      setBulkActionSaving(false);
    }
  };

  const handleFastRestock = async (item: any) => {
    const target = (item.minStockLevel || 5) > 0 ? (item.minStockLevel || 5) * 2 : 10;
    const diff = Math.max(1, target - (item.currentStock || 0));
    if (!confirm(`"${item.name}" stok adedi ${item.currentStock || 0}'den ${item.currentStock + diff}'a yükseltilecek (+${diff} adet ikmal). Onaylıyor musunuz?`)) return;
    try {
      await updateStockItem(item.id, { adjustment: diff });
      await load();
    } catch (e: any) {
      alert('İkmal hatası: ' + e.message);
    }
  };

  const handleRapidScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = rapidScanCode.trim();
    if (!code) return;
    const qty = Math.max(1, parseInt(rapidQty) || 1);
    const matched = items.find(i => i.barcode === code || i.sku === code || i.name?.toLowerCase().includes(code.toLowerCase()));
    if (!matched) {
      alert(`Ürün bulunamadı: ${code}`);
      setRapidScanCode('');
      rapidInputRef.current?.focus();
      return;
    }

    try {
      await updateStockItem(matched.id, { adjustment: qty });
      const newEntry = {
        id: Date.now(),
        time: new Date().toLocaleTimeString('tr-TR'),
        itemName: matched.name,
        sku: matched.sku,
        qty,
        newTotal: (matched.currentStock || 0) + qty,
        note: rapidSupplierNote
      };
      setRapidLogs(prev => [newEntry, ...prev]);
      setRapidScanCode('');
      setRapidQty('1');
      await load();
    } catch (err: any) {
      alert('Stok girişi hatası: ' + err.message);
    } finally {
      rapidInputRef.current?.focus();
    }
  };

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
        categoryId: '', hasSerialTracking: false, warrantyMonths: 0, supplier: ''
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
            onClick={() => setShowRapidModal(true)}
            className="inline-flex items-center px-4 py-2 border border-emerald-300 hover:bg-emerald-50 text-emerald-800 text-sm font-semibold rounded-xl transition-colors shadow-sm bg-emerald-50/50 cursor-pointer"
            title="Barkod okutarak seri koli / mal kabul stok girişi yapın"
          >
            <Zap className="w-4 h-4 mr-2 text-emerald-600 fill-emerald-500" /> Hızlı Stok Girişi
          </button>
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
          <button
            onClick={() => setShowPoModal(true)}
            className="inline-flex items-center px-4 py-2 border border-purple-300 hover:bg-purple-50 text-purple-700 text-sm font-medium rounded-xl transition-colors shadow-sm bg-purple-50/50 cursor-pointer"
            title="Kritik stoktaki ürünler için otomatik sipariş listesi"
          >
            <ShoppingCart className="w-4 h-4 mr-2 text-purple-600" /> Tedarik Sipariş Taslağı (PO)
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
        <button
          onClick={() => setActiveTab('movements')}
          className={`pb-3 text-sm font-semibold transition-all border-b-2 px-2 cursor-pointer ${activeTab === 'movements' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
        >
          Stok Hareketleri
        </button>
        <button
          onClick={() => setActiveTab('sayim')}
          className={`pb-3 text-sm font-semibold transition-all border-b-2 px-2 cursor-pointer ${activeTab === 'sayim' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
        >
          Sayım
        </button>
      </div>

      {activeTab === 'sayim' ? (
        <StockCountTab categories={categories} onFinalized={load} />
      ) : activeTab === 'movements' ? (
        <StockMovementsTab />
      ) : activeTab === 'items' ? (
        <>
          {/* Summary Cards — Stok Değerleme & Analitik */}
          {(() => {
            const totalCostVal = items.reduce((s, i) => s + ((parseFloat(i.costPrice) || 0) * (parseInt(i.currentStock) || 0)), 0);
            const totalSellingVal = items.reduce((s, i) => s + ((parseFloat(i.sellingPrice) || 0) * (parseInt(i.currentStock) || 0)), 0);
            const estProfit = totalSellingVal - totalCostVal;
            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm transition-all hover:shadow-md">
                  <p className="text-xs text-gray-500 font-medium mb-1">Toplam Stok & Kalem</p>
                  <p className="text-2xl font-bold text-gray-900">{totalQty.toLocaleString('tr-TR')} <span className="text-xs font-normal text-gray-400">adet ({totalItems} kalem)</span></p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm transition-all hover:shadow-md">
                  <p className="text-xs text-gray-500 font-medium mb-1">Toplam Alış Maliyeti</p>
                  <p className="text-2xl font-bold text-slate-800">₺{totalCostVal.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm transition-all hover:shadow-md">
                  <p className="text-xs text-gray-500 font-medium mb-1">Potansiyel Satış Değeri</p>
                  <p className="text-2xl font-bold text-emerald-600">₺{totalSellingVal.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</p>
                  {estProfit > 0 && <p className="text-[10px] text-emerald-500 mt-0.5">+₺{estProfit.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} tahmini kâr</p>}
                </div>
                <div 
                  onClick={() => setStatusFilter('critical')}
                  className={`p-4 rounded-2xl border shadow-sm transition-all hover:shadow-md cursor-pointer ${criticalCount > 0 ? 'bg-red-50/50 border-red-200 hover:bg-red-100/50' : 'bg-white border-gray-200'}`}
                >
                  <p className={`text-xs font-semibold mb-1 flex items-center justify-between ${criticalCount > 0 ? 'text-red-600' : 'text-gray-500'}`}>
                    <span className="flex items-center gap-1">
                      {criticalCount > 0 && <AlertTriangle className="w-3.5 h-3.5 text-red-500 animate-pulse" />} Kritik Stok
                    </span>
                    <span className="text-[10px] underline">Filtrele</span>
                  </p>
                  <p className="text-2xl font-bold text-gray-900">{criticalCount} <span className="text-xs font-normal text-gray-400">ürün ikazlı</span></p>
                </div>
              </div>
            );
          })()}

          {/* Filtering and Table */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex flex-col gap-4">
              {/* Row 1: Search & Dropdown Filters */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
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
                      className="border border-gray-300 rounded-xl px-3 py-2 text-xs text-gray-700 focus:ring-2 focus:ring-primary bg-white outline-none"
                    >
                      <option value="">Tüm Kategoriler</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{getCategoryPath(c.id)}</option>
                      ))}
                    </select>
                  )}

                  {availableBrands.length > 0 && (
                    <select
                      value={brandFilter}
                      onChange={e => setBrandFilter(e.target.value)}
                      className="border border-gray-300 rounded-xl px-3 py-2 text-xs text-gray-700 focus:ring-2 focus:ring-primary bg-white outline-none"
                    >
                      <option value="">Tüm Markalar</option>
                      {availableBrands.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  )}

                  {availableSuppliers.length > 0 && (
                    <select
                      value={supplierFilter}
                      onChange={e => setSupplierFilter(e.target.value)}
                      className="border border-gray-300 rounded-xl px-3 py-2 text-xs text-gray-700 focus:ring-2 focus:ring-primary bg-white outline-none"
                    >
                      <option value="">Tüm Tedarikçiler</option>
                      {availableSuppliers.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 px-2.5 py-1.5 rounded-xl text-xs">
                    <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
                    <select
                      value={sortBy}
                      onChange={e => setSortBy(e.target.value as any)}
                      className="bg-transparent text-xs font-bold text-gray-700 outline-none cursor-pointer"
                    >
                      <option value="name_asc">Ürün Adı (A-Z)</option>
                      <option value="stock_asc">Stok: Azdan Çoka</option>
                      <option value="stock_desc">Stok: Çoktan Aza</option>
                      <option value="price_asc">Fiyat: Düşükten Yükseğe</option>
                      <option value="price_desc">Fiyat: Yüksekten Düşüğe</option>
                    </select>
                  </div>

                  <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
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
              </div>

              {/* Row 2: Toplu İşlemler Barı (Bulk Actions Bar) */}
              {selectedIds.length > 0 && (
                <div className="flex items-center justify-between bg-primary/10 border border-primary/30 p-3 rounded-xl animate-fade-in">
                  <div className="flex items-center gap-2 text-xs font-bold text-primary">
                    <CheckSquare className="w-4 h-4" />
                    <span>{selectedIds.length} ürün seçildi</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowBulkPriceModal(true)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-sm"
                    >
                      <TrendingUp className="w-3.5 h-3.5" /> Toplu Fiyat Güncelle
                    </button>
                    <button
                      onClick={() => setShowBulkCategoryModal(true)}
                      className="px-3 py-1.5 bg-white border border-primary/40 hover:bg-primary/5 text-primary text-xs font-bold rounded-lg transition-colors cursor-pointer"
                    >
                      Toplu Kategori Ata
                    </button>
                    <button
                      onClick={() => setShowBulkVatModal(true)}
                      className="px-3 py-1.5 bg-white border border-primary/40 hover:bg-primary/5 text-primary text-xs font-bold rounded-lg transition-colors cursor-pointer"
                    >
                      Toplu KDV Değiştir
                    </button>
                    <button
                      onClick={handleBulkDelete}
                      disabled={bulkActionSaving}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Seçilenleri Sil
                    </button>
                  </div>
                </div>
              )}
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
                      <th className="p-4 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={filtered.length > 0 && selectedIds.length === filtered.length}
                          onChange={toggleSelectAll}
                          className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary cursor-pointer"
                        />
                      </th>
                      <th className="px-4 py-4 font-semibold">Görsel / Barkod</th>
                      <th className="px-4 py-4 font-semibold">SKU / Model</th>
                      <th className="px-4 py-4 font-semibold">Ürün Adı</th>
                      <th className="px-4 py-4 font-semibold">Kategori / Marka</th>
                      <th className="px-4 py-4 font-semibold text-center">Mevcut / Kritik</th>
                      <th className="px-4 py-4 font-semibold">Durum</th>
                      <th className="px-4 py-4 font-semibold text-center">Stok Güncelle</th>
                      <th className="px-4 py-4 font-semibold text-center">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="text-center py-16 text-gray-400 font-medium bg-gray-50/30">
                          Stok kalemi bulunamadı.
                        </td>
                      </tr>
                    ) : filtered.map(item => {
                      const st = getStatusLabel(item);
                      const isAdjusting = adjustingId === item.id;
                      const isSelected = selectedIds.includes(item.id);
                      const isLow = (item.currentStock || 0) <= (item.minStockLevel || 0);
                      return (
                        <tr key={item.id} className={`hover:bg-gray-50/40 transition-colors ${isSelected ? 'bg-primary/5' : ''}`}>
                          <td className="p-4 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectOne(item.id)}
                              className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary cursor-pointer"
                            />
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              {item.imageUrl ? (
                                <button
                                  type="button"
                                  onClick={() => setPreviewImage(mediaUrl(item.imageUrl))}
                                  className="focus:outline-none cursor-zoom-in"
                                >
                                  <img src={mediaUrl(item.imageUrl)} alt={item.name} className="w-10 h-10 object-cover rounded-lg border animate-fade-in" />
                                </button>
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
                            <div className="flex flex-col items-start gap-1">
                              <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${st.cls}`}>{st.label}</span>
                              {isLow && (
                                <button
                                  type="button"
                                  onClick={() => handleFastRestock(item)}
                                  className="text-[10px] font-extrabold text-amber-700 bg-amber-100 hover:bg-amber-200 px-2 py-0.5 rounded-full flex items-center gap-0.5 cursor-pointer shadow-xs transition-colors"
                                  title="Min. stok seviyesine hızlı ikmal yap"
                                >
                                  <Zap className="w-3 h-3 fill-amber-600 text-amber-600" /> İkmal Et
                                </button>
                              )}
                            </div>
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
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-semibold text-gray-500 uppercase">Barkod</label>
                    <button
                      type="button"
                      onClick={() => setField('barcode', generateEAN13('869'))}
                      className="text-[10px] font-bold text-primary hover:underline flex items-center gap-0.5 cursor-pointer"
                      title="Türkiye uyumlu 869 EAN-13 Barkod Üret"
                    >
                      <Sparkles className="w-3 h-3 text-amber-500" /> ⚡ 869 Barkod Üret
                    </button>
                  </div>
                  <input type="text" value={data.barcode || ''} onChange={e => setField('barcode', e.target.value)} className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none" placeholder="869..." />
                  {data.barcode && (() => {
                    const { valid, reason } = validateGTIN(data.barcode);
                    return (
                      <span className={`inline-block mt-1 text-[11px] font-semibold ${valid ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {valid ? '✓ Geçerli GTIN/EAN' : `⚠ ${reason}`}
                      </span>
                    );
                  })()}
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
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Tedarikçi</label>
                  <input type="text" value={data.supplier || ''} onChange={e => setField('supplier', e.target.value)} className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none" placeholder="Tedarikçi adı" />
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

                {/* Akıllı Kâr Marjı & Ön Muhasebe Fiyatlandırma Alanları */}
                <div className="sm:col-span-2 bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5 uppercase">
                      <Percent className="w-4 h-4 text-emerald-600" /> Ön Muhasebe Fiyatlandırma & Kâr Marjı
                    </span>
                    <div className="flex items-center gap-1">
                      <span className="text-xxs font-bold text-gray-400 uppercase">Para Birimi:</span>
                      <select
                        value={data.currency || 'TRY'}
                        onChange={e => setField('currency', e.target.value)}
                        className="text-xs font-bold bg-white border border-gray-300 rounded-lg px-2 py-0.5 outline-none cursor-pointer"
                      >
                        <option value="TRY">₺ (TRY)</option>
                        <option value="USD">$ (USD)</option>
                        <option value="EUR">€ (EUR)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xxs font-semibold text-gray-500 uppercase mb-1">Alış Fiyatı (KDV Dahil)</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={data.costPrice ?? ''}
                        onChange={e => {
                          const cost = parseFloat(e.target.value) || 0;
                          setField('costPrice', e.target.value);
                          if (data.marginPercent && cost > 0) {
                            const margin = parseFloat(data.marginPercent) || 0;
                            setField('sellingPrice', (cost * (1 + margin / 100)).toFixed(2));
                          }
                        }}
                        className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm font-semibold focus:ring-2 focus:ring-primary outline-none bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xxs font-semibold text-gray-500 uppercase mb-1">Kâr Marjı (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="Örn: 30"
                        value={data.marginPercent ?? (data.costPrice && data.sellingPrice && parseFloat(data.costPrice) > 0 ? (((parseFloat(data.sellingPrice) - parseFloat(data.costPrice)) / parseFloat(data.costPrice)) * 100).toFixed(1) : '')}
                        onChange={e => {
                          const margin = parseFloat(e.target.value);
                          setField('marginPercent', e.target.value);
                          const cost = parseFloat(data.costPrice) || 0;
                          if (!isNaN(margin) && cost > 0) {
                            setField('sellingPrice', (cost * (1 + margin / 100)).toFixed(2));
                          }
                        }}
                        className="w-full border border-emerald-300 rounded-xl px-3 py-2 text-sm font-bold text-emerald-800 focus:ring-2 focus:ring-emerald-500 outline-none bg-emerald-50/50"
                      />
                    </div>
                    <div>
                      <label className="block text-xxs font-semibold text-gray-500 uppercase mb-1">Perakende Satış (₺)</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={data.sellingPrice ?? ''}
                        onChange={e => {
                          const selling = parseFloat(e.target.value) || 0;
                          setField('sellingPrice', e.target.value);
                          const cost = parseFloat(data.costPrice) || 0;
                          if (cost > 0 && selling > 0) {
                            const margin = (((selling - cost) / cost) * 100).toFixed(1);
                            setField('marginPercent', margin);
                          }
                        }}
                        className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-primary outline-none bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xxs font-semibold text-gray-500 uppercase mb-1">Toptan / Bayi Fiyatı (₺)</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={data.wholesalePrice ?? ''}
                        onChange={e => setField('wholesalePrice', e.target.value)}
                        className="w-full border border-purple-200 rounded-xl px-3 py-2 text-sm font-bold text-purple-900 focus:ring-2 focus:ring-purple-500 outline-none bg-purple-50/40"
                      />
                    </div>
                  </div>

                  {/* Nakliye Maliyet Payı & Gerçek Kapı Maliyeti */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-200">
                    <div>
                      <label className="block text-xxs font-semibold text-gray-500 uppercase mb-1">Kargo / Nakliye Maliyet Payı (₺)</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={data.landedCost ?? ''}
                        onChange={e => setField('landedCost', e.target.value)}
                        className="w-full border border-gray-300 rounded-xl px-3 py-1.5 text-xs font-semibold focus:ring-2 focus:ring-primary outline-none bg-white"
                      />
                    </div>
                    <div className="flex flex-col justify-center">
                      <span className="text-[10px] font-bold text-gray-500 uppercase">Net Kapı Birim Maliyeti (Alış + Kargo):</span>
                      <span className="text-sm font-black text-slate-800">
                        ₺{((parseFloat(data.costPrice || '0') + parseFloat(data.landedCost || '0'))).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  {/* Realtime profit summary */}
                  {(() => {
                    const cost = parseFloat(data.costPrice) || 0;
                    const selling = parseFloat(data.sellingPrice) || 0;
                    if (cost > 0 && selling > 0) {
                      const profit = selling - cost;
                      const marginPct = ((profit / cost) * 100).toFixed(1);
                      return (
                        <div className="flex justify-between items-center text-xs font-semibold pt-1 border-t border-slate-200/80">
                          <span className="text-gray-500">Tahmini Birim Perakende Kârı:</span>
                          <span className={profit >= 0 ? 'text-emerald-700 font-extrabold' : 'text-red-600 font-extrabold'}>
                            {profit >= 0 ? '+' : ''}₺{profit.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ({marginPct}%)
                          </span>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>

                {/* Ön Muhasebe & Resmi Belge Kodları (GTİP & Muhasebe Kodu) */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">GTİP Kodu (e-Fatura / e-Arşiv)</label>
                  <input
                    type="text"
                    placeholder="Örn: 8471.30.00.00.00"
                    value={data.gtipCode || ''}
                    onChange={e => setField('gtipCode', e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Muhasebe Hesap Kodu</label>
                  <input
                    type="text"
                    placeholder="Örn: 153.01.001"
                    value={data.accountingCode || ''}
                    onChange={e => setField('accountingCode', e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none font-mono"
                  />
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
                      <button
                        type="button"
                        onClick={() => setPreviewImage(mediaUrl(data.imageUrl))}
                        className="w-full h-full text-left focus:outline-none cursor-zoom-in"
                      >
                        <img src={mediaUrl(data.imageUrl)} alt="Önizleme" className="w-full h-full object-cover" />
                      </button>
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

                {/* E-ticaret Kanal Eşleme (ikas / Shopify / Trendyol vb.) */}
                <div className="sm:col-span-2 border-t border-gray-100 pt-4">
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">E-ticaret Kanal Eşleme</label>
                  {!isEdit ? (
                    <p className="text-xs text-gray-400 italic">Ürün kaydedildikten sonra kanal eşlemesi eklenebilir.</p>
                  ) : (
                    <div className="space-y-2">
                      {channelMappingsLoading ? (
                        <p className="text-xs text-gray-400">Yükleniyor...</p>
                      ) : channelMappings.length === 0 ? (
                        <p className="text-xs text-gray-400">Henüz kanal eşlemesi eklenmedi.</p>
                      ) : (
                        channelMappings.map((m) => (
                          <div key={m.id} className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl p-2">
                            <span className="text-xs font-bold text-gray-700 w-24 shrink-0">{CHANNEL_OPTIONS.find(c => c.value === m.channel)?.label || m.channel}</span>
                            <input
                              type="text"
                              defaultValue={m.externalSku || ''}
                              placeholder="Dış SKU"
                              onBlur={e => updateChannelMapping(m.id, { externalSku: e.target.value }).then(() => fetchChannelMappings(editingItem.id).then(setChannelMappings))}
                              className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-primary outline-none"
                            />
                            <input
                              type="text"
                              defaultValue={m.externalProductId || ''}
                              placeholder="Dış Ürün ID"
                              onBlur={e => updateChannelMapping(m.id, { externalProductId: e.target.value }).then(() => fetchChannelMappings(editingItem.id).then(setChannelMappings))}
                              className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-primary outline-none"
                            />
                            <span className={`text-[10px] font-bold px-2 py-1 rounded-full shrink-0 ${m.syncStatus === 'eslendi' ? 'bg-emerald-100 text-emerald-700' : m.syncStatus === 'hata' ? 'bg-red-100 text-red-700' : 'bg-gray-200 text-gray-600'}`}>
                              {m.syncStatus === 'eslendi' ? 'Eşlendi' : m.syncStatus === 'hata' ? 'Hata' : 'Eşlenmedi'}
                            </span>
                            <button
                              type="button"
                              onClick={() => deleteChannelMapping(m.id).then(() => setChannelMappings(prev => prev.filter(x => x.id !== m.id)))}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))
                      )}
                      <div className="flex items-center gap-2 pt-1">
                        <select
                          value={newMappingChannel}
                          onChange={e => setNewMappingChannel(e.target.value)}
                          className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs bg-white focus:ring-2 focus:ring-primary outline-none"
                        >
                          {CHANNEL_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                        </select>
                        <button
                          type="button"
                          onClick={() => createChannelMapping(editingItem.id, { channel: newMappingChannel }).then(() => fetchChannelMappings(editingItem.id).then(setChannelMappings))}
                          className="text-xs font-semibold text-primary hover:text-secondary px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                        >
                          + Kanal Ekle
                        </button>
                      </div>
                    </div>
                  )}
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

      {/* Image Preview Modal */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-sm cursor-zoom-out animate-fade-in"
          onClick={() => setPreviewImage(null)}
        >
          <div 
            className="relative max-w-5xl max-h-[90vh] p-1.5 bg-white rounded-2xl shadow-2xl flex items-center justify-center overflow-hidden m-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute top-3 right-3 z-50 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <img 
              src={previewImage} 
              alt="Önizleme" 
              className="max-w-full max-h-[85vh] object-contain rounded-xl"
            />
          </div>
        </div>
      )}

      {/* Purchase Order (PO Generator) Modal */}
      {showPoModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowPoModal(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[88vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-purple-600" />
                <h2 className="text-lg font-bold text-gray-900">Otomatik Tedarik Sipariş Taslağı (PO)</h2>
              </div>
              <button onClick={() => setShowPoModal(false)} className="p-2 hover:bg-gray-200 rounded-xl"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            {(() => {
              const lowStockList = items.filter(i => (i.currentStock || 0) <= (i.minStockLevel || 0) && (i.minStockLevel || 0) > 0);
              const totalEstCost = lowStockList.reduce((s, i) => {
                const needed = Math.max(1, (i.minStockLevel || 5) - (i.currentStock || 0));
                return s + (parseFloat(i.costPrice || 0) * needed);
              }, 0);

              const poText = lowStockList.map((i, idx) => {
                const needed = Math.max(1, (i.minStockLevel || 5) - (i.currentStock || 0));
                return `${idx + 1}. ${i.name} (SKU: ${i.sku}) - İstenen Miktar: ${needed} ${i.unit}`;
              }).join('\n');

              return (
                <div className="p-6 space-y-4">
                  <div className="flex justify-between items-center bg-purple-50 p-4 rounded-2xl border border-purple-100">
                    <div>
                      <p className="text-xs text-purple-700 font-semibold">Tedarik Edilecek Kalem Sayısı</p>
                      <p className="text-2xl font-bold text-purple-900">{lowStockList.length} çeşit yedek parça/ürün</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-purple-700 font-semibold">Tahmini Sipariş Maliyeti</p>
                      <p className="text-2xl font-bold text-purple-900">₺{totalEstCost.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</p>
                    </div>
                  </div>

                  {lowStockList.length === 0 ? (
                    <p className="text-center py-8 text-emerald-600 font-medium text-sm">Tüm ürünlerin stok seviyesi yeterli!</p>
                  ) : (
                    <div className="border rounded-2xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-gray-50 border-b text-gray-500 font-bold">
                          <tr>
                            <th className="p-3">Ürün / Parça</th>
                            <th className="p-3 text-center">Mevcut</th>
                            <th className="p-3 text-center">Min. Sınır</th>
                            <th className="p-3 text-center text-purple-700">İstenen Miktar</th>
                            <th className="p-3 text-right">B.Alış Fiyatı</th>
                            <th className="p-3 text-right">Tahm. Toplam</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {lowStockList.map((item, idx) => {
                            const needed = Math.max(1, (item.minStockLevel || 5) - (item.currentStock || 0));
                            const itemCost = parseFloat(item.costPrice || 0) * needed;
                            return (
                              <tr key={idx} className="hover:bg-slate-50">
                                <td className="p-3">
                                  <p className="font-bold text-gray-800">{item.name}</p>
                                  <p className="text-[10px] text-gray-400 font-mono">SKU: {item.sku}</p>
                                </td>
                                <td className="p-3 text-center font-bold text-red-600">{item.currentStock} {item.unit}</td>
                                <td className="p-3 text-center text-gray-500">{item.minStockLevel} {item.unit}</td>
                                <td className="p-3 text-center font-black text-purple-700 bg-purple-50/50">{needed} {item.unit}</td>
                                <td className="p-3 text-right font-medium">₺{parseFloat(item.costPrice || 0).toLocaleString('tr-TR')}</td>
                                <td className="p-3 text-right font-bold text-gray-900">₺{itemCost.toLocaleString('tr-TR')}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {lowStockList.length > 0 && (
                    <div className="flex gap-3 pt-3 border-t">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(poText);
                          alert('Sipariş listesi panoya kopyalandı!');
                        }}
                        className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-xl"
                      >
                        Listeyi Panoya Kopyala
                      </button>
                      <a
                        href={`https://wa.me/?text=${encodeURIComponent(`Sayın Tedarikçimiz, aşağıdaki yedek parça siparişlerinin tarafımıza hazırlanmasını rica ederiz:\n\n${poText}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2"
                      >
                        <Send className="w-4 h-4" /> WhatsApp İle Tedarikçiye Yolla
                      </a>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}
      {/* ===================== HIZLI STOK GİRİŞİ / MAL KABUL MODALI ===================== */}
      {showRapidModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-emerald-50/60">
              <h2 className="text-base font-bold text-emerald-900 flex items-center gap-2">
                <Zap className="w-5 h-5 text-emerald-600 fill-emerald-500" /> Hızlı Stok Girişi / Mal Kabul
              </h2>
              <button onClick={() => setShowRapidModal(false)} className="p-2 hover:bg-emerald-100/50 rounded-xl cursor-pointer">
                <X className="w-5 h-5 text-emerald-700" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto">
              <form onSubmit={handleRapidScanSubmit} className="bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-2">
                    <label className="block text-xxs font-bold text-gray-500 uppercase mb-1">Barkod / SKU Okutun veya Girin *</label>
                    <input
                      ref={rapidInputRef}
                      type="text"
                      autoFocus
                      placeholder="Barkod / SKU okutun..."
                      value={rapidScanCode}
                      onChange={e => setRapidScanCode(e.target.value)}
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm font-semibold focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xxs font-bold text-gray-500 uppercase mb-1">Giriş Adedi *</label>
                    <input
                      type="number"
                      min="1"
                      value={rapidQty}
                      onChange={e => setRapidQty(e.target.value)}
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm font-bold text-center focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xxs font-bold text-gray-500 uppercase mb-1">Tedarikçi / Fatura Notu (Opsiyonel)</label>
                  <input
                    type="text"
                    placeholder="Örn: X Tedarikçi Fatura No #12345"
                    value={rapidSupplierNote}
                    onChange={e => setRapidSupplierNote(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-1.5 text-xs focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!rapidScanCode.trim()}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl disabled:opacity-50 transition-colors shadow-md shadow-emerald-200 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Stoğa Ekle & Kaydet (Enter)
                </button>
              </form>

              {/* Bu Oturumda Girilenler Logu */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-gray-500 uppercase block">Bu Oturumda Yapılan Stok Girişleri ({rapidLogs.length})</span>
                {rapidLogs.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4 italic">Henüz giriş yapılmadı. Barkod okutarak seri giriş yapabilirsiniz.</p>
                ) : (
                  <div className="border rounded-2xl divide-y max-h-48 overflow-y-auto">
                    {rapidLogs.map(log => (
                      <div key={log.id} className="p-3 bg-white flex justify-between items-center text-xs">
                        <div>
                          <span className="font-bold text-gray-800">{log.itemName}</span>
                          <span className="text-gray-400 font-mono text-[10px] block">SKU: {log.sku} | Saat: {log.time}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-extrabold text-emerald-600 text-sm">+{log.qty} adet</span>
                          <span className="text-gray-400 text-[10px] block">Yeni Stok: {log.newTotal}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end p-4 border-t border-gray-100 bg-gray-50">
              <button
                onClick={() => setShowRapidModal(false)}
                className="px-5 py-2 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-gray-800 cursor-pointer"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== TOPLU KATEGORİ ATA MODALI ===================== */}
      {showBulkCategoryModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50">
              <h2 className="text-base font-bold text-gray-900">Toplu Kategori Atama ({selectedIds.length} ürün)</h2>
              <button onClick={() => setShowBulkCategoryModal(false)} className="p-2 hover:bg-gray-100 rounded-xl cursor-pointer"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-5 space-y-3">
              <label className="block text-xs font-semibold text-gray-500 uppercase">Atanacak Kategori</label>
              <select
                value={bulkCategoryVal}
                onChange={e => setBulkCategoryVal(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-primary outline-none"
              >
                <option value="">Kategorisiz</option>
                {categories.map(c => <option key={c.id} value={c.id}>{getCategoryPath(c.id)}</option>)}
              </select>
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-100 bg-gray-50">
              <button onClick={() => setShowBulkCategoryModal(false)} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-xl font-semibold hover:bg-gray-50 cursor-pointer">İptal</button>
              <button
                onClick={handleBulkCategory}
                disabled={bulkActionSaving}
                className="flex-1 bg-primary hover:bg-secondary text-white py-2 rounded-xl font-semibold disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1"
              >
                {bulkActionSaving && <RefreshCw className="w-4 h-4 animate-spin" />}
                Uygula
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== TOPLU KDV DEĞİŞTİR MODALI ===================== */}
      {showBulkVatModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50">
              <h2 className="text-base font-bold text-gray-900">Toplu KDV Değiştir ({selectedIds.length} ürün)</h2>
              <button onClick={() => setShowBulkVatModal(false)} className="p-2 hover:bg-gray-100 rounded-xl cursor-pointer"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-5 space-y-3">
              <label className="block text-xs font-semibold text-gray-500 uppercase">Atanacak KDV Oranı (%)</label>
              <select
                value={bulkVatVal}
                onChange={e => setBulkVatVal(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-primary outline-none"
              >
                <option value="0">%0 (KDV'siz)</option>
                <option value="1">%1</option>
                <option value="10">%10</option>
                <option value="20">%20 (Genel Standart)</option>
              </select>
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-100 bg-gray-50">
              <button onClick={() => setShowBulkVatModal(false)} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-xl font-semibold hover:bg-gray-50 cursor-pointer">İptal</button>
              <button
                onClick={handleBulkVat}
                disabled={bulkActionSaving}
                className="flex-1 bg-primary hover:bg-secondary text-white py-2 rounded-xl font-semibold disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1"
              >
                {bulkActionSaving && <RefreshCw className="w-4 h-4 animate-spin" />}
                Uygula
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ===================== TOPLU FİYAT GÜNCELLEME MODALI ===================== */}
      {showBulkPriceModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-emerald-50/60">
              <h2 className="text-base font-bold text-emerald-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-600" /> Toplu Fiyat Güncelleme ({selectedIds.length} ürün)
              </h2>
              <button onClick={() => setShowBulkPriceModal(false)} className="p-2 hover:bg-emerald-100/50 rounded-xl cursor-pointer">
                <X className="w-5 h-5 text-emerald-700" />
              </button>
            </div>
            <div className="p-5 space-y-4 text-left">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Güncellenecek Fiyat Türü</label>
                <select
                  value={bulkPriceTarget}
                  onChange={e => setBulkPriceTarget(e.target.value as any)}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="sellingPrice">Perakende Satış Fiyatı (₺)</option>
                  <option value="costPrice">Alış Maliyet Fiyatı (₺)</option>
                  <option value="wholesalePrice">Toptan / Bayi Satış Fiyatı (₺)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Hesaplama Mantığı / Yöntem</label>
                <select
                  value={bulkPriceMode}
                  onChange={e => setBulkPriceMode(e.target.value as any)}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="percent">Yüzde (%) Oranında Zam / İskonto Uygula</option>
                  <option value="fixed">Sabit Tutar (₺) Ekle veya Çıkar</option>
                  <option value="margin">Alış Fiyatı Üzerinden Kâr Marjı % Koyup Satış Fiyatı Hesapla</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                  {bulkPriceMode === 'percent' ? 'Yüzde Oranı (%) — (Örn: +15 zam için 15, -10 indirim için -10)' :
                   bulkPriceMode === 'fixed' ? 'Tutar (₺) — (Örn: +50 eklemek için 50, -20 düşmek için -20)' :
                   'Kâr Marjı Oranı (%) — (Örn: Alış üzerine %35 marj)'}
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={bulkPriceVal}
                  onChange={e => setBulkPriceVal(e.target.value)}
                  className="w-full border border-emerald-300 rounded-xl px-3 py-2 text-sm font-extrabold focus:ring-2 focus:ring-emerald-500 outline-none bg-emerald-50/30"
                />
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-gray-600">
                💡 Seçilen {selectedIds.length} adet ürünün mevcut fiyatları üzerinden otomatik toplu güncelleme yapılacaktır.
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-100 bg-gray-50/50">
              <button onClick={() => setShowBulkPriceModal(false)} className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl font-semibold hover:bg-gray-50 cursor-pointer">İptal</button>
              <button
                onClick={handleBulkPriceUpdate}
                disabled={bulkActionSaving || !bulkPriceVal}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl font-semibold disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-emerald-200"
              >
                {bulkActionSaving && <RefreshCw className="w-4 h-4 animate-spin" />}
                Fiyatları Güncelle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
