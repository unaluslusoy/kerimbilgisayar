import { Search, Plus, X, Printer, MessageSquare, Send, ChevronRight, Calendar, DollarSign, Phone, Mail, Clock, AlertCircle, Image as ImageIcon, Trash2, Truck, Camera, LayoutList, Columns, Building2 } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { fetchAdminTickets, createAdminTicket, updateAdminTicket, deleteAdminTicket, fetchTicketMessages, createTicketMessage, fetchTicketAttachments, createTicketAttachment, deleteTicketAttachment, triggerTicketWhatsApp, fetchAdminShipments, createAdminShipment, adminRequest, fetchTicketParts, addTicketPart, deleteTicketPart, fetchAdminUsers, fetchAdminStock } from '../../lib/api';
import MediaPicker from '../../components/ui/MediaPicker';
import RichTextEditor from '../../components/ui/RichTextEditor';
import { mediaUrl } from '../../lib/media';

const STATUS_COLORS: Record<string, string> = {
  'yeni': 'bg-blue-100 text-blue-700',
  'isleme_alindi': 'bg-purple-100 text-purple-700',
  'parca_bekliyor': 'bg-orange-100 text-orange-700',
  'musteri_onayi_bekliyor': 'bg-amber-100 text-amber-700',
  'cozuldu': 'bg-green-100 text-green-700',
  'kapatildi': 'bg-gray-100 text-gray-500',
  'teslim_edildi': 'bg-teal-100 text-teal-700',
  'iptal': 'bg-red-100 text-red-600',
};

const STATUS_LABELS: Record<string, string> = {
  'yeni': 'Servise Alındı',
  'isleme_alindi': 'Arıza Tespiti',
  'parca_bekliyor': 'Parça Bekleniyor',
  'musteri_onayi_bekliyor': 'Onay Bekleniyor',
  'cozuldu': 'Çözüldü',
  'kapatildi': 'Kapatıldı',
  'teslim_edildi': 'Teslim Edildi',
  'iptal': 'İptal',
};

const PRIORITY_LABELS: Record<string, string> = {
  'dusuk': 'Düşük',
  'normal': 'Normal',
  'yuksek': 'Yüksek',
  'acil': 'Acil',
};

const PRIORITY_COLORS: Record<string, string> = {
  'dusuk': 'text-gray-400',
  'normal': 'text-blue-500',
  'yuksek': 'text-orange-500',
  'acil': 'text-red-600 font-bold',
};

function formatDate(d: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function ServiceManager() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Detay paneli
  const [detailTicket, setDetailTicket] = useState<any>(null);
  const [ticketNotes, setTicketNotes] = useState<any[]>([]);
  const [ticketAttachments, setTicketAttachments] = useState<any[]>([]);
  const [ticketShipment, setTicketShipment] = useState<any | null>(null);
  const [isCreatingShipment, setIsCreatingShipment] = useState(false);
  const [selectedCarrier, setSelectedCarrier] = useState('yurtici');
  const [activeCarriers, setActiveCarriers] = useState<string[]>([]);
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [noteSending, setNoteSending] = useState(false);
  const notesEndRef = useRef<HTMLDivElement>(null);

  // Maliyet düzenleme
  const [editingCost, setEditingCost] = useState(false);
  const [costValue, setCostValue] = useState('');
  const [costSaving, setCostSaving] = useState(false);

  // Yeni Özellikler: Personel, Yedek Parça, İşçilik
  const [staffUsers, setStaffUsers] = useState<any[]>([]);
  const [stockItems, setStockItems] = useState<any[]>([]);
  const [ticketParts, setTicketParts] = useState<any[]>([]);
  const [isAddingPart, setIsAddingPart] = useState(false);
  const [selectedStockId, setSelectedStockId] = useState('');
  const [partQuantity, setPartQuantity] = useState('1');
  const [partUnitPrice, setPartUnitPrice] = useState('');
  const [laborCostValue, setLaborCostValue] = useState('');
  const [isSavingLabor, setIsSavingLabor] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  // FAZ 2: Görünüm modu ve bayi
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [dealers, setDealers] = useState<any[]>([]);
  const [cameraUploading, setCameraUploading] = useState(false);

  // Edit Details Mode State
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editCustomerPhone, setEditCustomerPhone] = useState('');
  const [editCustomerEmail, setEditCustomerEmail] = useState('');
  const [editAccessories, setEditAccessories] = useState('');
  const [editTechnicianNotes, setEditTechnicianNotes] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDeviceType, setEditDeviceType] = useState('');
  const [editDeviceBrand, setEditDeviceBrand] = useState('');
  const [editDeviceModel, setEditDeviceModel] = useState('');
  const [isDeletingTicket, setIsDeletingTicket] = useState(false);
  const [newTicketPhotos, setNewTicketPhotos] = useState<any[]>([]);
  const [newTicketPhotoUploading, setNewTicketPhotoUploading] = useState(false);

  const [newTicket, setNewTicket] = useState({
    subject: '',
    description: '',
    type: 'ariza',
    priority: 'normal',
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    deviceType: '',
    deviceBrand: '',
    deviceModel: '',
    dealerId: '' as string | number,
    source: 'walk_in',
    assignedTo: '' as string | number,
    accessories: '',
    technicianNotes: '',
    customerType: 'bireysel',
    companyName: '',
    taxId: '',
    taxOffice: '',
    address: '',
  });

  const loadTickets = async () => {
    try {
      const data = await fetchAdminTickets();
      setTickets(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadDependencies = async () => {
    try {
      const [users, stock, dealersData] = await Promise.all([
        fetchAdminUsers(),
        fetchAdminStock(),
        adminRequest('/api/admin/dealers').catch(() => [])
      ]);
      // Sadece admin ve teknisyenleri filtrele
      const staff = users.filter((u: any) => u.roleType === 'superadmin' || u.roleType === 'tenant_admin' || u.roleType === 'staff' || u.roleType === 'technician');
      setStaffUsers(staff);
      setStockItems(stock);
      setDealers(Array.isArray(dealersData) ? dealersData : []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => { 
    loadTickets(); 
    loadDependencies();
  }, []);

  // Filter counts
  const statusCounts: Record<string, number> = { all: tickets.length };
  tickets.forEach(t => {
    statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
  });

  const filtered = tickets.filter(t => {
    const matchStatus = filter === 'all' || t.status === filter;
    const matchSearch = search === '' ||
      t.ticketNumber?.toLowerCase().includes(search.toLowerCase()) ||
      t.customerName?.toLowerCase().includes(search.toLowerCase()) ||
      t.subject?.toLowerCase().includes(search.toLowerCase()) ||
      t.customerPhone?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const handleNewTicketPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    setNewTicketPhotoUploading(true);
    try {
      const file = e.target.files[0];
      const formData = new FormData();
      formData.append('file', file);
      const token = localStorage.getItem('admin_token');
      const res = await fetch('/api/admin/media/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) throw new Error('Yükleme başarısız');
      const data = await res.json();
      setNewTicketPhotos(prev => [...prev, {
        fileName: file.name,
        fileUrl: data.fileUrl,
        fileType: file.type,
        fileSize: file.size,
      }]);
    } catch (err: any) {
      alert('Fotoğraf yüklenirken hata: ' + err.message);
    } finally {
      setNewTicketPhotoUploading(false);
      e.target.value = '';
    }
  };

  const handleCreate = async () => {
    if (!newTicket.customerName) return;
    setSaving(true);
    try {
      const res = await createAdminTicket(newTicket);
      
      // Save photos if there are any
      if (res && res.id && newTicketPhotos.length > 0) {
        for (const photo of newTicketPhotos) {
          await createTicketAttachment(res.id, photo);
        }
      }

      setShowModal(false);
      setNewTicketPhotos([]);
      setNewTicket({
        subject: '',
        description: '',
        type: 'ariza',
        priority: 'normal',
        customerName: '',
        customerPhone: '',
        customerEmail: '',
        deviceType: '',
        deviceBrand: '',
        deviceModel: '',
        dealerId: '',
        source: 'walk_in',
        assignedTo: '',
        accessories: '',
        technicianNotes: '',
        customerType: 'bireysel',
        companyName: '',
        taxId: '',
        taxOffice: '',
        address: '',
      });
      await loadTickets();
      if (res && res.ticketNumber) {
        window.open(`/print/ticket/${res.ticketNumber}`, '_blank');
      }
    } catch (e: any) {
      alert('Hata: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  // FAZ 2A: Kamera fotoğrafı yükleme
  const handleCameraCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!detailTicket || !e.target.files?.[0]) return;
    setCameraUploading(true);
    try {
      const file = e.target.files[0];
      const formData = new FormData();
      formData.append('file', file);
      const token = localStorage.getItem('admin_token');
      const res = await fetch('/api/admin/media/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) throw new Error('Yükleme başarısız');
      const mediaData = await res.json();
      
      await createTicketAttachment(detailTicket.id, {
        fileName: file.name,
        fileUrl: mediaData.fileUrl,
        fileType: file.type,
        fileSize: file.size,
      });
      
      const atts = await fetchTicketAttachments(detailTicket.id);
      setTicketAttachments(atts || []);
    } catch (err: any) {
      alert('Fotoğraf yüklenirken hata: ' + err.message);
    } finally {
      setCameraUploading(false);
      e.target.value = '';
    }
  };

  const handleStatusChange = async (id: number, status: string) => {
    try {
      await updateAdminTicket(id, { status });
      setTickets(prev => prev.map(t => t.id === id ? { ...t, status } : t));
      if (detailTicket?.id === id) setDetailTicket((prev: any) => ({ ...prev, status }));
    } catch (e: any) {
      alert('Hata: ' + e.message);
    }
  };


  const handleCostSave = async () => {
    if (!detailTicket) return;
    setCostSaving(true);
    try {
      const cost = parseFloat(costValue) || 0;
      await updateAdminTicket(detailTicket.id, { cost });
      setDetailTicket((prev: any) => ({ ...prev, cost }));
      setTickets(prev => prev.map(t => t.id === detailTicket.id ? { ...t, cost } : t));
      setEditingCost(false);
    } catch (e: any) {
      alert('Hata: ' + e.message);
    } finally {
      setCostSaving(false);
    }
  };

  const handleSaveDetails = async () => {
    if (!detailTicket) return;
    setSaving(true);
    try {
      const dataToSave = {
        customerName: editCustomerName,
        customerPhone: editCustomerPhone,
        customerEmail: editCustomerEmail,
        accessories: editAccessories,
        technicianNotes: editTechnicianNotes,
        description: editDescription,
        deviceType: editDeviceType,
        deviceBrand: editDeviceBrand,
        deviceModel: editDeviceModel,
      };
      await updateAdminTicket(detailTicket.id, dataToSave);
      
      const updatedTicket = {
        ...detailTicket,
        ...dataToSave,
      };
      setDetailTicket(updatedTicket);
      setTickets(prev => prev.map(t => t.id === detailTicket.id ? { ...t, ...dataToSave } : t));
      setIsEditingDetails(false);
      alert('Servis kaydı başarıyla güncellendi.');
    } catch (e: any) {
      alert('Hata: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTicket = async () => {
    if (!detailTicket) return;
    if (!window.confirm('Bu servis kaydını silmek istediğinize emin misiniz? Bu işlem geri alınamaz!')) return;
    setIsDeletingTicket(true);
    try {
      await deleteAdminTicket(detailTicket.id);
      setDetailTicket(null);
      await loadTickets();
      alert('Servis kaydı silindi.');
    } catch (e: any) {
      alert('Silme işlemi başarısız: ' + e.message);
    } finally {
      setIsDeletingTicket(false);
    }
  };

  const openDetail = async (ticket: any) => {
    setDetailTicket(ticket);
    setCostValue(ticket.cost || '');
    setLaborCostValue(ticket.laborCost || '');
    setEditingCost(false);
    setNoteText('');
    
    // Initialize edit details fields
    setEditCustomerName(ticket.customerName || '');
    setEditCustomerPhone(ticket.customerPhone || '');
    setEditCustomerEmail(ticket.customerEmail || '');
    setEditAccessories(ticket.accessories || '');
    setEditTechnicianNotes(ticket.technicianNotes || '');
    setEditDescription(ticket.description || '');
    setEditDeviceType(ticket.deviceType || '');
    setEditDeviceBrand(ticket.deviceBrand || '');
    setEditDeviceModel(ticket.deviceModel || '');
    setIsEditingDetails(false);
    
    try {
      const parts = await fetchTicketParts(ticket.id);
      setTicketParts(parts || []);
    } catch (e) {
      setTicketParts([]);
    }

    try {
      const msgs = await fetchTicketMessages(ticket.id);
      setTicketNotes(msgs);
      setTimeout(() => notesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (e) {
      setTicketNotes([]);
    }
    try {
      const atts = await fetchTicketAttachments(ticket.id);
      setTicketAttachments(atts || []);
    } catch (e) {
      setTicketAttachments([]);
    }
    try {
      const shipmentsData = await fetchAdminShipments();
      const match = shipmentsData.find((s: any) => s.ticketId === ticket.id);
      setTicketShipment(match || null);
    } catch (e) {
      setTicketShipment(null);
    }
    try {
      const pluginsData = await adminRequest('/api/admin/plugins').catch(() => []);
      const active: string[] = [];
      if (pluginsData && Array.isArray(pluginsData)) {
        if (pluginsData.some((p: any) => p.pluginId === 'yurtici-cargo' && p.isActive)) active.push('yurtici');
        if (pluginsData.some((p: any) => p.pluginId === 'aras-cargo' && p.isActive)) active.push('aras');
        if (pluginsData.some((p: any) => p.pluginId === 'mng-cargo' && p.isActive)) active.push('mng');
        if (pluginsData.some((p: any) => p.pluginId === 'ptt-cargo' && p.isActive)) active.push('ptt');
      }
      setActiveCarriers(active);
      if (active.length > 0) {
        setSelectedCarrier(active[0]);
      }
    } catch (e) {
      setActiveCarriers([]);
    }
  };

  const handleSendNote = async () => {
    if (!noteText.trim() || !detailTicket) return;
    setNoteSending(true);
    try {
      await createTicketMessage({ ticketId: detailTicket.id, message: noteText.trim(), isInternal: true });
      const msgs = await fetchTicketMessages(detailTicket.id);
      setTicketNotes(msgs);
      setNoteText('');
      setTimeout(() => notesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (e: any) {
      alert('Hata: ' + e.message);
    } finally {
      setNoteSending(false);
    }
  };

  const handleDeleteAttachment = async (id: number) => {
    if (!window.confirm('Bu görseli silmek istediğinize emin misiniz?')) return;
    try {
      await deleteTicketAttachment(id);
      if (detailTicket) {
        const atts = await fetchTicketAttachments(detailTicket.id);
        setTicketAttachments(atts || []);
      }
    } catch (e: any) {
      alert('Silme hatası: ' + e.message);
    }
  };

  const handleCreateShipment = async () => {
    if (!detailTicket) return;
    setIsCreatingShipment(true);
    try {
      const receiverDetails = `${detailTicket.customerName}\nTel: ${detailTicket.customerPhone || ''}\nCihaz: ${[detailTicket.deviceBrand, detailTicket.deviceModel].filter(Boolean).join(' ') || detailTicket.deviceType || ''}`;
      const payload = {
        ticketId: detailTicket.id,
        carrier: selectedCarrier,
        senderDetails: 'Kerim Bilgisayar Merkez Ofis - İstanbul',
        receiverDetails,
        notes: `${detailTicket.ticketNumber} nolu servis kaydı için otomatik oluşturuldu.`
      };
      const res = await createAdminShipment(payload);
      if (res.success) {
        const shipmentsData = await fetchAdminShipments();
        const match = shipmentsData.find((s: any) => s.ticketId === detailTicket.id);
        setTicketShipment(match || null);
        alert(`Kargo başarıyla oluşturuldu! Takip No: ${res.trackingNumber}`);
      }
    } catch (e: any) {
      alert('Kargo oluşturulurken hata: ' + e.message);
    } finally {
      setIsCreatingShipment(false);
    }
  };
  const handleAssignUser = async (userId: string) => {
    if (!detailTicket) return;
    setIsAssigning(true);
    try {
      await updateAdminTicket(detailTicket.id, { assignedTo: userId ? parseInt(userId) : null });
      setDetailTicket((prev: any) => ({ ...prev, assignedTo: userId ? parseInt(userId) : null }));
      setTickets(prev => prev.map(t => t.id === detailTicket.id ? { ...t, assignedTo: userId ? parseInt(userId) : null } : t));
    } catch (e: any) {
      alert('Atama hatası: ' + e.message);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleAddPart = async () => {
    if (!detailTicket || !selectedStockId) return;
    setIsAddingPart(true);
    try {
      await addTicketPart(detailTicket.id, {
        stockItemId: parseInt(selectedStockId),
        quantity: parseInt(partQuantity) || 1,
        unitPrice: parseFloat(partUnitPrice) || 0
      });
      const parts = await fetchTicketParts(detailTicket.id);
      setTicketParts(parts || []);
      setSelectedStockId('');
      setPartQuantity('1');
      setPartUnitPrice('');
      alert('Parça/İşlem başarıyla eklendi.');
    } catch (e: any) {
      alert('Parça eklenirken hata: ' + e.message);
    } finally {
      setIsAddingPart(false);
    }
  };

  const handleRemovePart = async (partId: number) => {
    if (!window.confirm('Bu parçayı/işlemi silmek istediğinize emin misiniz? Stok iade edilecektir.')) return;
    try {
      await deleteTicketPart(partId);
      const parts = await fetchTicketParts(detailTicket?.id);
      setTicketParts(parts || []);
    } catch (e: any) {
      alert('Silme hatası: ' + e.message);
    }
  };

  const handleSaveLabor = async () => {
    if (!detailTicket) return;
    setIsSavingLabor(true);
    try {
      const laborCost = parseFloat(laborCostValue) || 0;
      await updateAdminTicket(detailTicket.id, { laborCost });
      setDetailTicket((prev: any) => ({ ...prev, laborCost }));
      setTickets(prev => prev.map(t => t.id === detailTicket.id ? { ...t, laborCost } : t));
    } catch (e: any) {
      alert('İşçilik kaydedilirken hata: ' + e.message);
    } finally {
      setIsSavingLabor(false);
    }
  };
  const FILTER_TABS = [
    { key: 'all', label: 'Tümü' },
    { key: 'yeni', label: 'Servise Alındı' },
    { key: 'isleme_alindi', label: 'Arıza Tespiti' },
    { key: 'parca_bekliyor', label: 'Parça Bekl.' },
    { key: 'musteri_onayi_bekliyor', label: 'Onay Bekl.' },
    { key: 'cozuldu', label: 'Çözüldü' },
    { key: 'teslim_edildi', label: 'Teslim Edildi' },
    { key: 'kapatildi', label: 'Kapatıldı' },
  ];

  return (
    <div className="space-y-5 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Servis Kayıtları</h1>
          <p className="text-sm text-gray-500 mt-1">Teknik servis ve onarım süreçlerini yönetin.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-primary hover:bg-secondary text-white px-4 py-2 rounded-theme font-medium transition-colors flex items-center shrink-0 shadow-sm"
        >
          <Plus className="w-4 h-4 mr-2" /> Yeni Kayıt
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-3 rounded-theme border border-gray-200 shadow-sm flex flex-col md:flex-row gap-3 items-center shrink-0">
        <div className="flex flex-wrap gap-1.5 flex-1">
          {FILTER_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={cn(
                "px-3 py-1.5 rounded-theme text-xs font-semibold transition-colors inline-flex items-center gap-1.5",
                filter === tab.key ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              {tab.label}
              {statusCounts[tab.key] !== undefined && (
                <span className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded-full font-bold",
                  filter === tab.key ? "bg-white/20 text-white" : "bg-gray-200 text-gray-600"
                )}>
                  {statusCounts[tab.key] || 0}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Görünüm modu toggle */}
          <div className="flex rounded-theme border border-gray-200 overflow-hidden">
            <button
              onClick={() => setViewMode('list')}
              title="Liste Görünümü"
              className={cn('px-2.5 py-1.5 transition-colors', viewMode === 'list' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100')}
            >
              <LayoutList className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              title="Kanban Görünümü"
              className={cn('px-2.5 py-1.5 transition-colors', viewMode === 'kanban' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100')}
            >
              <Columns className="w-4 h-4" />
            </button>
          </div>
          <div className="relative w-full md:w-56">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Kayıt no, müşteri, telefon..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-theme text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* Main layout: list + detail panel */}
      <div className="flex gap-5 flex-1 overflow-hidden min-h-0">
        <div className="w-full overflow-y-auto pb-4">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-10 h-10 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
            </div>
          ) : filtered.length === 0 && viewMode === 'list' ? (
            <div className="text-center py-16 text-gray-400">
              <p className="font-semibold text-lg">Kayıt bulunamadı</p>
              <p className="text-sm mt-1">Filtrelerinizi değiştirin veya yeni kayıt oluşturun.</p>
            </div>
          ) : viewMode === 'kanban' ? (
            /* KANBAN GÖRÜNÜMÜ — HTML5 native drag & drop */
            <div className="flex gap-3 overflow-x-auto pb-4 min-h-[500px]">
              {FILTER_TABS.filter(t => t.key !== 'all').map(col => {
                const colTickets = tickets.filter(t => {
                  const matchSearch = search === '' ||
                    t.ticketNumber?.toLowerCase().includes(search.toLowerCase()) ||
                    t.customerName?.toLowerCase().includes(search.toLowerCase()) ||
                    t.subject?.toLowerCase().includes(search.toLowerCase());
                  return t.status === col.key && matchSearch;
                });
                return (
                  <div
                    key={col.key}
                    className="flex-shrink-0 w-64 bg-gray-50 rounded-xl border border-gray-200 flex flex-col"
                    onDragOver={e => e.preventDefault()}
                    onDrop={async e => {
                      e.preventDefault();
                      const ticketId = parseInt(e.dataTransfer.getData('ticketId'));
                      if (ticketId) await handleStatusChange(ticketId, col.key);
                    }}
                  >
                    <div className={cn('px-3 py-2 rounded-t-xl border-b border-gray-200 flex items-center justify-between', STATUS_COLORS[col.key])}>
                      <span className="text-xs font-bold">{col.label}</span>
                      <span className="text-xs font-bold bg-white/50 rounded-full px-2 py-0.5">{colTickets.length}</span>
                    </div>
                    <div className="flex flex-col gap-2 p-2 flex-1 overflow-y-auto max-h-[calc(100vh-280px)]">
                      {colTickets.map(ticket => (
                        <div
                          key={ticket.id}
                          draggable
                          onDragStart={e => e.dataTransfer.setData('ticketId', String(ticket.id))}
                          onClick={() => openDetail(ticket)}
                          className={cn(
                            'bg-white rounded-lg border p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-all text-left',
                            detailTicket?.id === ticket.id ? 'border-primary ring-1 ring-primary' : 'border-gray-200'
                          )}
                        >
                          <div className="flex justify-between items-start mb-1.5">
                            <span className="font-mono text-[10px] text-gray-400 font-bold">{ticket.ticketNumber}</span>
                            <span className={cn('text-[10px] font-bold', PRIORITY_COLORS[ticket.priority || 'normal'])}>● {PRIORITY_LABELS[ticket.priority || 'normal']}</span>
                          </div>
                          <p className="text-xs font-semibold text-gray-800 line-clamp-2 mb-1">{ticket.subject}</p>
                          <p className="text-[11px] text-gray-500">{ticket.customerName}</p>
                          {ticket.assignedName && (
                            <p className="text-[10px] text-blue-500 mt-1">👤 {ticket.assignedName}</p>
                          )}
                        </div>
                      ))}
                      {colTickets.length === 0 && (
                        <div className="flex items-center justify-center h-16 text-gray-300 text-xs border-2 border-dashed border-gray-200 rounded-lg m-1">
                          Buraya sürükle
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* LİSTE GÖRÜNÜMÜ */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map(ticket => (
                <div
                  key={ticket.id}
                  onClick={() => openDetail(ticket)}
                  className={cn(
                    "bg-white rounded-theme border shadow-sm hover:shadow-md hover:border-gray-300 transition-all flex flex-col p-5 cursor-pointer",
                    detailTicket?.id === ticket.id ? 'border-primary ring-1 ring-primary' : 'border-gray-200',
                    ticket.status === 'musteri_onayi_bekliyor' && detailTicket?.id !== ticket.id ? 'border-amber-300' : ''
                  )}
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className="font-mono text-xs font-bold text-gray-400">{ticket.ticketNumber}</span>
                    <div className="flex items-center gap-2">
                      {ticket.status === 'musteri_onayi_bekliyor' && (
                        <span title="Müşteri onayı bekleniyor"><AlertCircle className="w-3.5 h-3.5 text-amber-500" /></span>
                      )}
                      <span className={cn("px-2.5 py-1 rounded-full text-[11px] font-bold", STATUS_COLORS[ticket.status || 'yeni'])}>
                        {STATUS_LABELS[ticket.status || 'yeni']}
                      </span>
                      <Link
                        to={`/print/ticket/${ticket.ticketNumber}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="text-gray-400 hover:text-gray-600 p-1"
                        title="Yazdır"
                      >
                        <Printer className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-1 text-sm line-clamp-1">{ticket.subject}</h3>
                  <p className="text-xs text-gray-500 mb-0.5">{ticket.customerName}</p>
                  {ticket.customerPhone && (
                    <p className="text-xs text-gray-400 mb-1">{ticket.customerPhone}</p>
                  )}
                  {ticket.dealerName && (
                    <p className="text-xs text-blue-500 flex items-center gap-1 mb-1"><Building2 className="w-3 h-3" /> {ticket.dealerName}</p>
                  )}
                  <div className="mt-auto flex items-center justify-between pt-2 border-t border-gray-100 text-xs text-gray-400">
                    <span className={cn('font-semibold', PRIORITY_COLORS[ticket.priority || 'normal'])}>
                      ● {PRIORITY_LABELS[ticket.priority || 'normal']}
                    </span>
                    <span className="text-[10px]">
                      {new Date(ticket.createdAt).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detail Modal (Full Screen Overlay) */}
        {detailTicket && (
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-0 md:p-6 transition-all duration-300">
            <div className="bg-white w-full h-full md:max-w-6xl md:h-[90vh] md:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              
              {/* Modal Header */}
              <div className="p-5 border-b border-gray-200 flex items-center justify-between shrink-0 bg-slate-50">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-black text-blue-600 bg-blue-50 border border-blue-100 px-3 py-1 rounded-xl shadow-sm">
                    {detailTicket.ticketNumber}
                  </span>
                  <h2 className="font-black text-gray-900 text-base leading-none">{detailTicket.subject}</h2>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    to={`/print/ticket/${detailTicket.ticketNumber}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-4 py-2 border border-gray-300 rounded-xl text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 transition-colors shadow-sm"
                  >
                    <Printer className="w-3.5 h-3.5" /> Yazdır
                  </Link>
                  <button 
                    onClick={() => setDetailTicket(null)} 
                    className="p-2 hover:bg-gray-200 rounded-xl text-gray-400 hover:text-gray-900 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-hidden flex flex-col lg:flex-row min-h-0">
                {/* Left Area: Detail & Actions */}
                <div className="w-full lg:w-3/5 overflow-y-auto p-6 space-y-6">
                  
                  {/* Action Controls for Edits and Deletions */}
                  <div className="flex items-center justify-between bg-slate-50 border border-slate-200/60 p-4 rounded-2xl shadow-sm">
                    <div>
                      <p className="text-xs font-black text-gray-550 uppercase tracking-widest">
                        {isEditingDetails ? 'Düzenleme Modu Aktif' : 'Bilgi Düzenleme & Silme'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {isEditingDetails ? (
                        <>
                          <button
                            onClick={handleSaveDetails}
                            disabled={saving}
                            className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-sm flex items-center gap-1"
                          >
                            Değişiklikleri Kaydet
                          </button>
                          <button
                            onClick={() => setIsEditingDetails(false)}
                            className="border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold px-4 py-2 rounded-xl transition-all"
                          >
                            Vazgeç
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              setEditCustomerName(detailTicket.customerName || '');
                              setEditCustomerPhone(detailTicket.customerPhone || '');
                              setEditCustomerEmail(detailTicket.customerEmail || '');
                              setEditAccessories(detailTicket.accessories || '');
                              setEditTechnicianNotes(detailTicket.technicianNotes || '');
                              setEditDescription(detailTicket.description || '');
                              setEditDeviceType(detailTicket.deviceType || '');
                              setEditDeviceBrand(detailTicket.deviceBrand || '');
                              setEditDeviceModel(detailTicket.deviceModel || '');
                              setIsEditingDetails(true);
                            }}
                            className="bg-primary hover:bg-secondary text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-sm"
                          >
                            Bilgileri Düzenle
                          </button>
                          <button
                            onClick={handleDeleteTicket}
                            disabled={isDeletingTicket}
                            className="bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-xs font-bold px-4 py-2 rounded-xl transition-all flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Servis Kaydını Sil
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Grid fields */}
                  {isEditingDetails ? (
                    <div className="grid grid-cols-2 gap-4 text-xs font-sans">
                      <div className="border border-gray-200 rounded-xl p-3 bg-white shadow-sm space-y-1">
                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider">Müşteri Adı Soyadı</label>
                        <input
                          type="text"
                          value={editCustomerName}
                          onChange={e => setEditCustomerName(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg p-2 focus:ring-1 focus:ring-primary outline-none"
                        />
                      </div>
                      <div className="border border-gray-200 rounded-xl p-3 bg-white shadow-sm space-y-1">
                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider">Telefon Numarası</label>
                        <input
                          type="text"
                          value={editCustomerPhone}
                          onChange={e => setEditCustomerPhone(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg p-2 focus:ring-1 focus:ring-primary outline-none"
                        />
                      </div>
                      <div className="border border-gray-200 rounded-xl p-3 bg-white shadow-sm space-y-1">
                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider">E-Posta Adresi</label>
                        <input
                          type="email"
                          value={editCustomerEmail}
                          onChange={e => setEditCustomerEmail(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg p-2 focus:ring-1 focus:ring-primary outline-none"
                        />
                      </div>
                      <div className="border border-gray-200 rounded-xl p-3 bg-white shadow-sm space-y-1">
                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider">Cihaz Türü</label>
                        <input
                          type="text"
                          value={editDeviceType}
                          onChange={e => setEditDeviceType(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg p-2 focus:ring-1 focus:ring-primary outline-none"
                        />
                      </div>
                      <div className="border border-gray-200 rounded-xl p-3 bg-white shadow-sm space-y-1">
                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider">Marka</label>
                        <input
                          type="text"
                          value={editDeviceBrand}
                          onChange={e => setEditDeviceBrand(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg p-2 focus:ring-1 focus:ring-primary outline-none"
                        />
                      </div>
                      <div className="border border-gray-200 rounded-xl p-3 bg-white shadow-sm space-y-1">
                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider">Model</label>
                        <input
                          type="text"
                          value={editDeviceModel}
                          onChange={e => setEditDeviceModel(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg p-2 focus:ring-1 focus:ring-primary outline-none"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div className="border border-gray-100 rounded-xl p-3 bg-gray-50/50">
                        <p className="text-gray-400 font-semibold uppercase tracking-wider mb-1">Müşteri</p>
                        <p className="text-gray-850 font-bold text-sm">{detailTicket.customerName || '—'}</p>
                      </div>
                      <div className="border border-gray-100 rounded-xl p-3 bg-gray-50/50 flex flex-col justify-between">
                        <div>
                          <p className="text-gray-400 font-semibold uppercase tracking-wider mb-1">Telefon</p>
                          <p className="text-gray-850 font-bold text-sm">
                            {detailTicket.customerPhone
                              ? <a href={`tel:${detailTicket.customerPhone}`} className="text-blue-600 hover:underline flex items-center gap-1">
                                  <Phone className="w-3.5 h-3.5" /> {detailTicket.customerPhone}
                                </a>
                              : '—'}
                          </p>
                        </div>
                        {detailTicket.customerPhone && (
                          <div className="mt-2 flex items-center gap-2">
                            <a
                              href={`https://wa.me/${detailTicket.customerPhone.replace(/\D/g, '').startsWith('0') ? '90' + detailTicket.customerPhone.replace(/\D/g, '').substring(1) : detailTicket.customerPhone.replace(/\D/g, '').startsWith('90') ? detailTicket.customerPhone.replace(/\D/g, '') : '90' + detailTicket.customerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(`Merhaba Sayın Müşterimiz, ${detailTicket.ticketNumber} numaralı cihazınızın servis işlemlerini takip etmek için: https://kerimbilgisayar.com/ariza-sorgulama?no=${detailTicket.ticketNumber}`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 rounded-lg text-[10px] font-bold transition-colors"
                            >
                              <Send className="w-3 h-3 text-green-600" /> WhatsApp Web
                            </a>
                            <button
                              onClick={async () => {
                                try {
                                  const res = await triggerTicketWhatsApp(detailTicket.id);
                                  if (res.success) {
                                    alert('WhatsApp bildirimi arka planda başarıyla sıraya alındı.');
                                  } else {
                                    alert('Hata: Gönderilemedi. Ayarları kontrol edin.');
                                  }
                                } catch (e: any) {
                                  alert('WhatsApp API hatası: ' + e.message);
                                }
                              }}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg text-[10px] font-bold transition-colors"
                            >
                              <Send className="w-3 h-3 text-blue-600" /> API ile Gönder
                            </button>
                          </div>
                        )}
                      </div>
                      {detailTicket.customerEmail && (
                        <div className="border border-gray-100 rounded-xl p-3 bg-gray-50/50">
                          <p className="text-gray-400 font-semibold uppercase tracking-wider mb-1">E-Posta</p>
                          <a href={`mailto:${detailTicket.customerEmail}`} className="text-blue-600 hover:underline flex items-center gap-1 truncate font-bold text-sm">
                            <Mail className="w-3.5 h-3.5 shrink-0" /> {detailTicket.customerEmail}
                          </a>
                        </div>
                      )}
                      <div className="border border-gray-100 rounded-xl p-3 bg-gray-50/50">
                        <p className="text-gray-400 font-semibold uppercase tracking-wider mb-1">Cihaz</p>
                        <p className="text-gray-850 font-bold text-sm">
                          {[detailTicket.deviceBrand, detailTicket.deviceModel].filter(Boolean).join(' ') || detailTicket.deviceType || '—'}
                        </p>
                      </div>
                      <div className="border border-gray-100 rounded-xl p-3 bg-gray-50/50">
                        <p className="text-gray-400 font-semibold uppercase tracking-wider mb-1">Öncelik</p>
                        <p className={cn('font-bold text-sm', PRIORITY_COLORS[detailTicket.priority || 'normal'])}>
                          ● {PRIORITY_LABELS[detailTicket.priority || 'normal']}
                        </p>
                      </div>
                      <div className="border border-gray-100 rounded-xl p-3 bg-gray-50/50">
                        <p className="text-gray-400 font-semibold uppercase tracking-wider mb-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Oluşturulma
                        </p>
                        <p className="text-gray-850 font-bold text-sm">{formatDate(detailTicket.createdAt)}</p>
                      </div>
                    </div>
                  )}

                  {/* Personel Atama */}
                  <div className="border border-gray-200 rounded-2xl p-4 bg-blue-50/30">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-blue-600 font-bold uppercase tracking-wider">İlgilenen Personel / Teknisyen</p>
                    </div>
                    <div className="flex gap-2 items-center">
                      <select
                        value={detailTicket.assignedTo || ''}
                        onChange={e => handleAssignUser(e.target.value)}
                        disabled={isAssigning}
                        className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none disabled:opacity-50"
                      >
                        <option value="">Atanmadı</option>
                        {staffUsers.map(u => (
                          <option key={u.id} value={u.id}>
                            {u.firstName} {u.lastName} ({u.roleType === 'technician' ? 'Teknisyen' : 'Personel'})
                          </option>
                        ))}
                      </select>
                      {isAssigning && <span className="text-xs text-gray-500">Kaydediliyor...</span>}
                    </div>
                  </div>

                  {/* İşlem ve Maliyetler (Parça & İşçilik) */}
                  <div className="border border-gray-200 rounded-2xl p-4 bg-slate-50/30">
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider flex items-center gap-1 mb-4">
                      <DollarSign className="w-3.5 h-3.5" /> İşlem ve Maliyetler (Parça & İşçilik)
                    </p>
                    
                    {/* Parça Ekleme Alanı */}
                    <div className="bg-white p-3 rounded-xl border border-gray-200 mb-4 shadow-sm flex flex-col md:flex-row gap-2">
                      <select
                        value={selectedStockId}
                        onChange={e => {
                          setSelectedStockId(e.target.value);
                          const item = stockItems.find(s => s.id === parseInt(e.target.value));
                          if (item) setPartUnitPrice(item.sellingPrice || item.costPrice || '0');
                        }}
                        className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:ring-1 focus:ring-primary outline-none"
                      >
                        <option value="">Stoktan Parça / Hizmet Seçin...</option>
                        {stockItems.map(s => (
                          <option key={s.id} value={s.id} disabled={s.currentStock <= 0}>
                            {s.sku} - {s.name} (Stok: {s.currentStock} {s.unit})
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        value={partQuantity}
                        onChange={e => setPartQuantity(e.target.value)}
                        min="1"
                        className="w-16 border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:ring-1 focus:ring-primary outline-none"
                        placeholder="Miktar"
                      />
                      <div className="relative w-24">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">₺</span>
                        <input
                          type="number"
                          value={partUnitPrice}
                          onChange={e => setPartUnitPrice(e.target.value)}
                          className="w-full pl-6 pr-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-1 focus:ring-primary outline-none"
                          placeholder="B.Fiyat"
                        />
                      </div>
                      <button
                        onClick={handleAddPart}
                        disabled={isAddingPart || !selectedStockId}
                        className="px-3 py-1.5 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700 disabled:opacity-50"
                      >
                        {isAddingPart ? '...' : 'Ekle'}
                      </button>
                    </div>

                    {/* Eklenen Parçalar Listesi */}
                    {ticketParts.length > 0 && (
                      <div className="mb-4 bg-white border border-gray-200 rounded-xl overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-gray-50 border-b border-gray-200 text-gray-500">
                            <tr>
                              <th className="px-3 py-2 font-semibold">Parça/İşlem</th>
                              <th className="px-3 py-2 font-semibold text-right">B.Fiyat</th>
                              <th className="px-3 py-2 font-semibold text-center">Adet</th>
                              <th className="px-3 py-2 font-semibold text-right">Toplam</th>
                              <th className="px-3 py-2 text-center"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {ticketParts.map((p, i) => (
                              <tr key={i} className="hover:bg-gray-50">
                                <td className="px-3 py-2">
                                  <p className="font-bold text-gray-800">{p.stockItemName}</p>
                                  <p className="text-[10px] text-gray-400 font-mono">{p.stockItemSku}</p>
                                </td>
                                <td className="px-3 py-2 text-right">₺{parseFloat(p.unitPrice).toLocaleString('tr-TR')}</td>
                                <td className="px-3 py-2 text-center font-bold">{p.quantity}</td>
                                <td className="px-3 py-2 text-right font-black text-gray-900">₺{parseFloat(p.totalPrice).toLocaleString('tr-TR')}</td>
                                <td className="px-3 py-2 text-center">
                                  <button onClick={() => handleRemovePart(p.id)} className="text-red-500 hover:text-red-700 p-1">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* İşçilik ve Genel Toplam */}
                    <div className="flex flex-col gap-2 items-end mt-4 pt-4 border-t border-gray-200">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-gray-500">İşçilik Maliyeti:</span>
                        <div className="relative w-32">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">₺</span>
                          <input
                            type="number"
                            value={laborCostValue}
                            onChange={e => setLaborCostValue(e.target.value)}
                            onBlur={handleSaveLabor}
                            className="w-full pl-6 pr-2 py-1.5 border border-gray-300 rounded-lg text-sm font-bold focus:ring-1 focus:ring-primary outline-none"
                            placeholder="0.00"
                          />
                        </div>
                        {isSavingLabor && <span className="text-[10px] text-blue-500">Kaydediliyor...</span>}
                      </div>
                      
                      <div className="flex items-center gap-3 mt-2 bg-green-50 px-4 py-2 rounded-xl border border-green-200">
                        <span className="text-sm font-bold text-green-800">Genel Toplam:</span>
                        <span className="text-xl font-black text-green-900">
                          ₺{(
                            (parseFloat(detailTicket.laborCost) || 0) + 
                            ticketParts.reduce((sum, p) => sum + parseFloat(p.totalPrice), 0)
                          ).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      
                      {parseFloat(detailTicket.cost || 0) > 0 && (
                        <p className="text-[10px] text-gray-400 mt-1">Eski / Manuel Girilen Fiyat: ₺{detailTicket.cost}</p>
                      )}
                    </div>
                  </div>

                  {/* Durum Değiştir */}
                  <div className="border border-gray-200 rounded-2xl p-4">
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-3">Durum Değiştir</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(STATUS_LABELS).map(([val, label]) => (
                        <button
                          key={val}
                          onClick={() => handleStatusChange(detailTicket.id, val)}
                          className={cn(
                            'px-3 py-1.5 rounded-full text-xs font-bold border transition-colors',
                            detailTicket.status === val
                              ? STATUS_COLORS[val] + ' border-current'
                              : 'bg-gray-100 text-gray-500 border-transparent hover:bg-gray-200'
                          )}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Aksesuarlar / Emanetler */}
                  {(isEditingDetails || detailTicket.accessories) && (
                    <div className="border border-gray-200 rounded-2xl p-4 bg-amber-50/10">
                      <p className="text-xs text-gray-550 font-black uppercase tracking-wider mb-2">Cihazla Birlikte Alınan Emanetler (Aksesuarlar)</p>
                      {isEditingDetails ? (
                        <input
                          type="text"
                          value={editAccessories}
                          onChange={e => setEditAccessories(e.target.value)}
                          className="w-full border border-gray-300 rounded-xl p-2 text-sm focus:ring-1 focus:ring-primary outline-none bg-white"
                          placeholder="Örn: Şarj aleti, kılıf, çanta..."
                        />
                      ) : (
                        <p className="text-sm text-gray-800 font-bold bg-amber-50/30 p-3 rounded-xl border border-amber-100/60">
                          {detailTicket.accessories}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Açıklama / Müşteri Şikayeti */}
                  <div className="border border-gray-200 rounded-2xl p-4">
                    <p className="text-xs text-gray-550 font-black uppercase tracking-wider mb-2">Açıklama / Şikayet</p>
                    {isEditingDetails ? (
                      <RichTextEditor
                        value={editDescription}
                        onChange={val => setEditDescription(val)}
                        placeholder="Müşterinin bildirdiği arıza açıklaması..."
                        className="bg-white rounded-xl"
                      />
                    ) : (
                      <div 
                        className="text-sm text-gray-700 leading-relaxed prose max-w-none" 
                        dangerouslySetInnerHTML={{ __html: detailTicket.description || 'Açıklama belirtilmemiş.' }}
                      />
                    )}
                  </div>

                  {/* Teknisyen Görüşü / Raporu */}
                  {(isEditingDetails || detailTicket.technicianNotes) && (
                    <div className="border border-gray-200 rounded-2xl p-4 bg-slate-50/60">
                      <p className="text-xs text-gray-550 font-black uppercase tracking-wider mb-2">Teknisyen Görüşü / Raporu</p>
                      {isEditingDetails ? (
                        <RichTextEditor
                          value={editTechnicianNotes}
                          onChange={val => setEditTechnicianNotes(val)}
                          placeholder="Teknik detaylar, onarım raporu ve öneriler..."
                          className="bg-white rounded-xl"
                        />
                      ) : (
                        <div 
                          className="text-sm text-gray-700 leading-relaxed italic prose max-w-none bg-white p-4 border rounded-xl" 
                          dangerouslySetInnerHTML={{ __html: detailTicket.technicianNotes }}
                        />
                      )}
                    </div>
                  )}

                  {/* Ekli Görseller (Cihaz Fotoğrafları) */}
                  <div className="border border-gray-200 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider flex items-center gap-1">
                        <ImageIcon className="w-3.5 h-3.5 text-blue-500" /> Cihaz Görselleri ({ticketAttachments.length})
                      </p>
                      <div className="flex items-center gap-3">
                        <label className="text-xs text-blue-600 hover:underline font-bold flex items-center gap-1 cursor-pointer">
                          <Camera className="w-3.5 h-3.5" /> {cameraUploading ? 'Yükleniyor...' : 'Kamerayı Aç'}
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={handleCameraCapture}
                            disabled={cameraUploading}
                            className="hidden"
                          />
                        </label>
                        <button
                          onClick={() => setIsMediaPickerOpen(true)}
                          className="text-xs text-blue-600 hover:underline font-bold flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" /> Fotoğraf Ekle
                        </button>
                      </div>
                    </div>

                    {ticketAttachments.length === 0 ? (
                      <p className="text-xs text-gray-400 italic">Cihaza ait yüklenmiş görsel bulunmamaktadır.</p>
                    ) : (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                        {ticketAttachments.map(att => (
                          <div key={att.id} className="relative group border border-gray-100 rounded-xl overflow-hidden aspect-video bg-gray-50 flex items-center justify-center">
                            <a href={mediaUrl(att.fileUrl)} target="_blank" rel="noopener noreferrer" className="w-full h-full">
                              <img
                                src={mediaUrl(att.fileUrl)}
                                alt={att.fileName}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            </a>
                            <button
                              onClick={() => handleDeleteAttachment(att.id)}
                              className="absolute top-1 right-1 p-1 bg-red-600 hover:bg-red-700 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-md"
                              title="Sil"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Kargo Yönetim Entegrasyonu */}
                  <div className="border border-gray-200 rounded-2xl p-4 space-y-3">
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider flex items-center gap-1">
                      <Truck className="w-3.5 h-3.5 text-blue-500" /> Kargo Yönetim Entegrasyonu
                    </p>

                    {ticketShipment ? (
                      <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-gray-800">
                            {ticketShipment.carrier.toUpperCase()} Kargo
                          </span>
                          <span className="font-mono text-gray-900 bg-white border border-gray-150 px-2 py-0.5 rounded-lg font-bold">
                            {ticketShipment.trackingNumber}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-gray-500">Kargo Durumu:</span>
                          <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">
                            {ticketShipment.status === 'hazirlaniyor' ? 'Hazırlanıyor' :
                             ticketShipment.status === 'kargoya_verildi' ? 'Kargoya Verildi' :
                             ticketShipment.status === 'yolda' ? 'Yolda / Dağıtımda' :
                             ticketShipment.status === 'teslim_edildi' ? 'Teslim Edildi' : 'İade Edildi'}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-400">Son Güncelleme: {new Date(ticketShipment.updatedAt || ticketShipment.createdAt).toLocaleDateString('tr-TR')}</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-xs text-gray-500">Cihazı müşteriye anlaşmalı fiyatlarla göndermek için kargo çıkışı yapın.</p>
                        <div className="flex gap-2">
                          <select
                             value={selectedCarrier}
                             onChange={e => setSelectedCarrier(e.target.value)}
                             className="text-xs border border-slate-300 rounded-xl px-2.5 py-1.5 focus:ring-1 focus:ring-primary outline-none"
                           >
                             {activeCarriers.length > 0 ? (
                               activeCarriers.map(c => (
                                 <option key={c} value={c}>
                                   {c === 'yurtici' ? 'Yurtiçi Kargo (%35 İndirim)' :
                                    c === 'aras' ? 'Aras Kargo (%30 İndirim)' :
                                    c === 'mng' ? 'MNG Kargo (%25 İndirim)' : 'PTT Kargo (%40 İndirim)'}
                                 </option>
                               ))
                             ) : (
                               <>
                                 <option value="yurtici">Yurtiçi Kargo (Demo)</option>
                                 <option value="aras">Aras Kargo (Demo)</option>
                                 <option value="mng">MNG Kargo (Demo)</option>
                                 <option value="ptt">PTT Kargo (Demo)</option>
                               </>
                             )}
                           </select>
                          <button
                            onClick={handleCreateShipment}
                            disabled={isCreatingShipment}
                            className="flex-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-1"
                          >
                            {isCreatingShipment ? '...' : <><Truck className="w-3.5 h-3.5" /> Kargola</>}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Area: Chat & Internal Notes */}
                <div className="w-full lg:w-2/5 flex flex-col min-h-0 bg-slate-50/50 border-t lg:border-t-0 lg:border-l border-gray-200">
                  <div className="p-4 border-b border-gray-200 shrink-0 bg-white">
                    <p className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                      <MessageSquare className="w-4 h-4 text-blue-500" /> Dahili Notlar ({ticketNotes.length})
                    </p>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {ticketNotes.length === 0 && (
                      <p className="text-xs text-gray-400 italic text-center py-8">Henüz not eklenmemiş.</p>
                    )}
                    {ticketNotes.map(note => (
                      <div key={note.id} className="bg-amber-50 border border-amber-100 rounded-xl p-3 shadow-sm">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-bold text-amber-800">{note.senderName}</span>
                          <span className="text-[10px] text-amber-600 font-medium">{formatDate(note.createdAt)}</span>
                        </div>
                        <p className="text-xs text-gray-700 whitespace-pre-line leading-relaxed">{note.message}</p>
                      </div>
                    ))}
                    <div ref={notesEndRef} />
                  </div>

                  <div className="p-4 border-t border-gray-200 bg-white flex gap-2 shrink-0">
                    <textarea
                      rows={2}
                      value={noteText}
                      onChange={e => setNoteText(e.target.value)}
                      placeholder="Dahili not ekle... (Ctrl+Enter ile gönder)"
                      className="flex-1 border border-gray-300 rounded-xl px-3.5 py-2 text-xs focus:ring-2 focus:ring-primary outline-none resize-none"
                      onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) handleSendNote(); }}
                    />
                    <button
                      onClick={handleSendNote}
                      disabled={noteSending || !noteText.trim()}
                      className="px-4 py-2 bg-primary hover:bg-secondary text-white rounded-xl transition-colors disabled:opacity-50 shrink-0 flex items-center justify-center"
                      title="Gönder (Ctrl+Enter)"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* New Ticket Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-150">
              <h2 className="text-xl font-black text-gray-900 tracking-tight">Yeni Servis Kaydı Oluştur</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-xl">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="p-6 space-y-6 overflow-y-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Sol Sütun: Müşteri & Cihaz */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-gray-800 uppercase tracking-widest border-b pb-1.5 mb-3">Müşteri & Cihaz Bilgileri</h3>
                  
                  {/* Müşteri Türü Seçimi */}
                  <div className="mb-4">
                    <label className="block text-xs font-semibold text-gray-555 mb-1.5">Müşteri Türü</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setNewTicket({ ...newTicket, customerType: 'bireysel' })}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-xl border transition-all ${
                          newTicket.customerType === 'bireysel'
                            ? 'bg-primary text-white border-primary shadow-sm'
                            : 'bg-white text-gray-750 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        Bireysel
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewTicket({ ...newTicket, customerType: 'kurumsal' })}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-xl border transition-all ${
                          newTicket.customerType === 'kurumsal'
                            ? 'bg-primary text-white border-primary shadow-sm'
                            : 'bg-white text-gray-750 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        Kurumsal (Firma)
                      </button>
                    </div>
                  </div>

                  {newTicket.customerType === 'kurumsal' && (
                    <div className="mb-3 animate-in fade-in duration-200">
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Firma / Cari Ünvanı *</label>
                      <input
                        type="text" value={newTicket.companyName}
                        onChange={e => setNewTicket({ ...newTicket, companyName: e.target.value })}
                        className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                        placeholder="Firma Adı / Ticari Ünvan"
                        required={newTicket.customerType === 'kurumsal'}
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">
                        {newTicket.customerType === 'kurumsal' ? 'Yetkili Adı Soyadı *' : 'Müşteri Adı Soyadı *'}
                      </label>
                      <input
                        type="text" value={newTicket.customerName}
                        onChange={e => setNewTicket({ ...newTicket, customerName: e.target.value })}
                        className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                        placeholder="Ad Soyad"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Telefon Numarası</label>
                      <input
                        type="text" value={newTicket.customerPhone}
                        onChange={e => setNewTicket({ ...newTicket, customerPhone: e.target.value })}
                        className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                        placeholder="05XX XXX XX XX"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">E-Posta Adresi</label>
                      <input
                        type="email" value={newTicket.customerEmail}
                        onChange={e => setNewTicket({ ...newTicket, customerEmail: e.target.value })}
                        className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                        placeholder="musteri@eposta.com"
                      />
                    </div>
                    {newTicket.customerType === 'kurumsal' && (
                      <div className="grid grid-cols-2 gap-2 animate-in fade-in duration-200">
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">Vergi Dairesi</label>
                          <input
                            type="text" value={newTicket.taxOffice}
                            onChange={e => setNewTicket({ ...newTicket, taxOffice: e.target.value })}
                            className="w-full border border-gray-300 rounded-xl px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary outline-none"
                            placeholder="Vergi Dairesi"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">Vergi / TCKN</label>
                          <input
                            type="text" value={newTicket.taxId}
                            onChange={e => setNewTicket({ ...newTicket, taxId: e.target.value })}
                            className="w-full border border-gray-300 rounded-xl px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary outline-none"
                            placeholder="Vergi No / TCKN"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Müşteri Adresi</label>
                    <textarea
                      value={newTicket.address}
                      onChange={e => setNewTicket({ ...newTicket, address: e.target.value })}
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none resize-none"
                      rows={2}
                      placeholder="Müşteri adresi (Fatura / Teslimat için)"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3 pt-2">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Cihaz Türü</label>
                      <input
                        type="text" value={newTicket.deviceType}
                        onChange={e => setNewTicket({ ...newTicket, deviceType: e.target.value })}
                        className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                        placeholder="Örn: Laptop"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Marka</label>
                      <input
                        type="text" value={newTicket.deviceBrand}
                        onChange={e => setNewTicket({ ...newTicket, deviceBrand: e.target.value })}
                        className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                        placeholder="Örn: Asus"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Model</label>
                      <input
                        type="text" value={newTicket.deviceModel}
                        onChange={e => setNewTicket({ ...newTicket, deviceModel: e.target.value })}
                        className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                        placeholder="Örn: ROG Strix"
                      />
                    </div>
                  </div>
                </div>

                {/* Sağ Sütun: Servis Parametreleri */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-gray-800 uppercase tracking-widest border-b pb-1.5 mb-3">Servis Detayları</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Kanal / Kaynak</label>
                      <select
                        value={newTicket.source}
                        onChange={e => {
                          const val = e.target.value;
                          setNewTicket(prev => ({
                            ...prev,
                            source: val,
                            dealerId: val !== 'dealer' ? '' : prev.dealerId
                          }));
                        }}
                        className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                      >
                        <option value="walk_in">Elden Teslim (Walk-in)</option>
                        <option value="dealer">Bayi Kanalı</option>
                        <option value="online">Online Başvuru</option>
                        <option value="phone">Telefon</option>
                      </select>
                    </div>
                    {newTicket.source === 'dealer' ? (
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Aracı Bayi</label>
                        <select
                          value={newTicket.dealerId}
                          onChange={e => setNewTicket({ ...newTicket, dealerId: e.target.value })}
                          className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                        >
                          <option value="">Bayi Seçin...</option>
                          {dealers.map(d => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Teslim Alan / Atanan Personel</label>
                        <select
                          value={newTicket.assignedTo}
                          onChange={e => setNewTicket({ ...newTicket, assignedTo: e.target.value })}
                          className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                        >
                          <option value="">Seçin...</option>
                          {staffUsers.map(u => (
                            <option key={u.id} value={u.id}>
                              {u.firstName} {u.lastName}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Servis Türü</label>
                      <select value={newTicket.type} onChange={e => setNewTicket({ ...newTicket, type: e.target.value })}
                        className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none">
                        <option value="ariza">Arıza</option>
                        <option value="destek">Destek</option>
                        <option value="kurulum">Kurulum</option>
                        <option value="bakim">Bakım</option>
                        <option value="diger">Diğer</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Öncelik Seviyesi</label>
                      <select value={newTicket.priority} onChange={e => setNewTicket({ ...newTicket, priority: e.target.value })}
                        className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none">
                        <option value="dusuk">Düşük</option>
                        <option value="normal">Normal</option>
                        <option value="yuksek">Yüksek</option>
                        <option value="acil">Acil</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Cihazla Birlikte Alınan Emanetler (Aksesuarlar)</label>
                    <input
                      type="text"
                      value={newTicket.accessories}
                      onChange={e => setNewTicket({ ...newTicket, accessories: e.target.value })}
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                      placeholder="Örn: Şarj aleti, kılıf, çanta..."
                    />
                  </div>

                  {/* Cihaz Fotoğrafları - Teslim Anı */}
                  <div className="pt-2">
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5 flex items-center justify-between">
                      <span>Cihaz Fotoğrafları (Teslim Anı)</span>
                      <span className="text-[10px] text-blue-650 hover:underline font-bold flex items-center gap-1 cursor-pointer">
                        <Camera className="w-3.5 h-3.5" /> {newTicketPhotoUploading ? 'Yükleniyor...' : 'Fotoğraf Çek / Yükle'}
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={handleNewTicketPhotoUpload}
                          disabled={newTicketPhotoUploading}
                          className="hidden"
                        />
                      </span>
                    </label>
                    
                    {newTicketPhotos.length === 0 ? (
                      <p className="text-[11px] text-gray-400 italic">Henüz teslim anı fotoğrafı eklenmedi.</p>
                    ) : (
                      <div className="grid grid-cols-4 gap-2 border border-gray-200 p-2 rounded-xl bg-gray-50/50">
                        {newTicketPhotos.map((photo, index) => (
                          <div key={index} className="relative group border border-gray-200 rounded-lg overflow-hidden aspect-video bg-white flex items-center justify-center">
                            <img
                              src={photo.fileUrl}
                              alt={photo.fileName}
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setNewTicketPhotos(prev => prev.filter((_, idx) => idx !== index));
                              }}
                              className="absolute top-1 right-1 p-1 bg-red-600 hover:bg-red-700 text-white rounded-md shadow-md"
                              title="Fotoğrafı Sil"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Açıklama / Şikayet */}
              <div className="pt-4 border-t border-gray-150">
                <label className="block text-sm font-bold text-gray-800 mb-2">Müşteri Şikayeti / Detaylı Açıklama (Zengin Metin)</label>
                <RichTextEditor
                  value={newTicket.description}
                  onChange={val => setNewTicket({ ...newTicket, description: val })}
                  placeholder="Arıza açıklaması, müşteri şikayetleri ve ilk tespitleri buraya yazın..."
                  className="bg-white rounded-xl shadow-sm animate-in fade-in duration-200"
                />
              </div>
            </div>

            <div className="flex gap-3 p-6 border-t border-gray-150 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl font-bold hover:bg-gray-50 transition-colors"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={saving || !newTicket.customerName}
                className="flex-1 bg-primary hover:bg-secondary text-white py-2.5 rounded-xl font-bold transition-colors disabled:opacity-50 flex items-center justify-center shadow-md shadow-primary/20"
              >
                {saving ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                ) : null}
                Kayıt ve Giriş Fişi Oluştur
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Media Picker Modal */}
      <MediaPicker
        isOpen={isMediaPickerOpen}
        onClose={() => setIsMediaPickerOpen(false)}
        onSelect={async (url) => {
          setIsMediaPickerOpen(false);
          if (!detailTicket) return;
          try {
            await createTicketAttachment(detailTicket.id, {
              fileName: url.split('/').pop() || 'Fotoğraf',
              fileUrl: url,
              fileType: 'image/*',
            });
            const atts = await fetchTicketAttachments(detailTicket.id);
            setTicketAttachments(atts || []);
          } catch (err: any) {
            alert('Dosya ekleme hatası: ' + err.message);
          }
        }}
      />
    </div>
  );
}
