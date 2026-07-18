import { Search, Plus, X, Printer, MessageSquare, Send, ChevronRight, Calendar, DollarSign, Phone, Mail, Clock, AlertCircle, Image as ImageIcon, Trash2, Truck, Camera, LayoutList, Columns, Building2, Shield, Users, Wrench } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { fetchAdminTickets, createAdminTicket, updateAdminTicket, deleteAdminTicket, fetchTicketMessages, createTicketMessage, fetchTicketAttachments, createTicketAttachment, deleteTicketAttachment, triggerTicketWhatsApp, fetchAdminShipments, createAdminShipment, adminRequest, fetchTicketParts, addTicketPart, deleteTicketPart, fetchAdminUsers, fetchAdminStock, fetchTicketStatusLogs, searchAdminCustomers } from '../../lib/api';
import MediaPicker from '../../components/ui/MediaPicker';
import RichTextEditor from '../../components/ui/RichTextEditor';
import PatternLockPicker from '../../components/ui/PatternLockPicker';
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
  const [statusLogs, setStatusLogs] = useState<any[]>([]);
  const [rightPanelTab, setRightPanelTab] = useState<'notes' | 'timeline'>('notes');
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
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
  // Detay paneli cihaz bilgileri düzenleme state'leri
  const [editImei, setEditImei] = useState('');
  const [editDeviceSerial, setEditDeviceSerial] = useState('');
  const [editPatternLock, setEditPatternLock] = useState('');
  const [editPinPassword, setEditPinPassword] = useState('');
  const [editDeviceEmail, setEditDeviceEmail] = useState('');
  const [editDeviceEmailPassword, setEditDeviceEmailPassword] = useState('');
  const [editCustomerAddress, setEditCustomerAddress] = useState('');
  const [newTicketPhotos, setNewTicketPhotos] = useState<any[]>([]);
  const [newTicketPhotoUploading, setNewTicketPhotoUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [modalTab, setModalTab] = useState<'musteri'|'cihaz'|'servis'|'medya'>('musteri');
  
  // Advanced filters and pagination
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [technicianFilter, setTechnicianFilter] = useState('all');
  const [deviceTypeFilter, setDeviceTypeFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(15);

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
    deviceSerial: '',
    imei: '',
    patternLock: '',
    pinPassword: '',
    deviceEmail: '',
    deviceEmailPassword: '',
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

  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [duplicateCustomers, setDuplicateCustomers] = useState<any[]>([]);
  const [searchingCustomer, setSearchingCustomer] = useState(false);

  // Müşteri bilgileri girildikçe veritabanından eşleşen müşterileri bul
  const checkDuplicateCustomers = async (field: 'name' | 'phone' | 'email', value: string) => {
    if (!value || value.length < 2) {
      setDuplicateCustomers([]);
      return;
    }
    setSearchingCustomer(true);
    try {
      const results = await searchAdminCustomers(value);
      setDuplicateCustomers(results || []);
      
      // Auto-fill exactly matched customer (e.g. exactly same phone or email)
      if (results && results.length === 1) {
        const c = results[0];
        const isPhoneMatch = field === 'phone' && c.phone && value.replace(/\D/g, '') === c.phone.replace(/\D/g, '');
        const isEmailMatch = field === 'email' && c.email && value.toLowerCase() === c.email.toLowerCase();
        
        if (isPhoneMatch || isEmailMatch) {
          // Auto select if exact match
          selectExistingCustomer(c);
          setDuplicateCustomers([]); // Hide warning since we auto-selected
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSearchingCustomer(false);
    }
  };

  const selectExistingCustomer = (c: any) => {
    setNewTicket(prev => ({
      ...prev,
      customerName: `${c.firstName || ''} ${c.lastName || ''}`.trim(),
      customerPhone: c.phone || '',
      customerEmail: c.email || '',
      customerType: c.companyName ? 'kurumsal' : 'bireysel',
      companyName: c.companyName || '',
      taxOffice: c.taxOffice || '',
      taxId: c.taxId || '',
      address: c.address || '',
    }));
    setDuplicateCustomers([]);
  };

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
      setAllUsers(users);
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
      
    const matchPriority = priorityFilter === 'all' || t.priority === priorityFilter;
    const matchTechnician = technicianFilter === 'all' || String(t.assignedTo) === String(technicianFilter);
    const matchDeviceType = deviceTypeFilter === 'all' || t.deviceType === deviceTypeFilter;

    return matchStatus && matchSearch && matchPriority && matchTechnician && matchDeviceType;
  });

  // Calculate paginated subset of filtered tickets
  const totalPages = Math.ceil(filtered.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedFiltered = filtered.slice(startIndex, startIndex + rowsPerPage);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, search, priorityFilter, technicianFilter, deviceTypeFilter]);

  const handleNewTicketPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setNewTicketPhotoUploading(true);
    const files = Array.from(e.target.files) as File[];
    const token = localStorage.getItem('admin_token');
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/admin/servis/upload', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        if (!res.ok) throw new Error('Yükleme başarısız: ' + file.name);
        const data = await res.json();
        setNewTicketPhotos(prev => [...prev, {
          fileName: data.fileName || file.name,
          fileUrl: data.fileUrl,
          fileType: data.fileType || file.type,
          fileSize: data.fileSize || file.size,
        }]);
      }
    } catch (err: any) {
      alert('Dosya yüklenirken hata: ' + err.message);
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
      setModalTab('musteri');
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
        deviceSerial: '',
        imei: '',
        patternLock: '',
        pinPassword: '',
        deviceEmail: '',
        deviceEmailPassword: '',
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
    if (status === 'teslim_edildi') {
      setShowSignatureModal(true);
      return;
    }
    try {
      await updateAdminTicket(id, { status });
      setTickets(prev => prev.map(t => t.id === id ? { ...t, status } : t));
      if (detailTicket?.id === id) {
        setDetailTicket((prev: any) => ({ ...prev, status }));
        const logs = await fetchTicketStatusLogs(id).catch(() => []);
        setStatusLogs(logs || []);
      }
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

  const [isSignatureSaving, setIsSignatureSaving] = useState(false);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0f172a'; // slate-900 color
    
    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };
  
  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    
    ctx.lineTo(x, y);
    ctx.stroke();
  };
  
  const stopDrawing = () => {
    setIsDrawing(false);
  };
  
  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleSaveSignatureAndDeliver = async () => {
    if (!detailTicket) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    setIsSignatureSaving(true);
    try {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('İmza görseli oluşturulamadı.');
      
      const file = new File([blob], `imza_${detailTicket.ticketNumber}.png`, { type: 'image/png' });
      const formData = new FormData();
      formData.append('file', file);
      
      const token = localStorage.getItem('admin_token');
      const uploadRes = await fetch('/api/admin/media/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!uploadRes.ok) throw new Error('İmza görseli sunucuya yüklenemedi.');
      const mediaData = await uploadRes.json();
      
      // Link to ticket attachments
      await createTicketAttachment(detailTicket.id, {
        fileName: `Müşteri Teslim İmzası - ${detailTicket.customerName}`,
        fileUrl: mediaData.fileUrl,
        fileType: 'image/png',
        fileSize: file.size,
      });
      
      // Update ticket status to "teslim_edildi"
      await updateAdminTicket(detailTicket.id, { 
        status: 'teslim_edildi',
        technicianNotes: (detailTicket.technicianNotes || '') + '\n[Cihaz dijital imza karşılığında teslim edildi.]'
      });
      
      // Update state
      setTickets(prev => prev.map(t => t.id === detailTicket.id ? { ...t, status: 'teslim_edildi' } : t));
      setDetailTicket((prev: any) => ({ 
        ...prev, 
        status: 'teslim_edildi',
        technicianNotes: (prev.technicianNotes || '') + '\n[Cihaz dijital imza karşılığında teslim edildi.]'
      }));
      
      const atts = await fetchTicketAttachments(detailTicket.id).catch(() => []);
      setTicketAttachments(atts || []);
      const logs = await fetchTicketStatusLogs(detailTicket.id).catch(() => []);
      setStatusLogs(logs || []);
      
      setShowSignatureModal(false);
      alert('Cihaz başarıyla dijital imza ile teslim edildi!');
    } catch (e: any) {
      alert('Hata: ' + e.message);
    } finally {
      setIsSignatureSaving(false);
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
        imei: editImei,
        deviceSerial: editDeviceSerial,
        patternLock: editPatternLock,
        pinPassword: editPinPassword,
        deviceEmail: editDeviceEmail,
        deviceEmailPassword: editDeviceEmailPassword,
        address: editCustomerAddress,
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
    setEditImei(ticket.imei || '');
    setEditDeviceSerial(ticket.deviceSerial || ticket.serialNumber || '');
    setEditPatternLock(ticket.patternLock || '');
    setEditPinPassword(ticket.pinPassword || '');
    setEditDeviceEmail(ticket.deviceEmail || '');
    setEditDeviceEmailPassword(ticket.deviceEmailPassword || '');
    setEditCustomerAddress(ticket.address || ticket.customerAddress || '');
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
      const logs = await fetchTicketStatusLogs(ticket.id);
      setStatusLogs(logs || []);
    } catch (e) {
      setStatusLogs([]);
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
      <div className="bg-white p-4 rounded-theme border border-gray-200 shadow-sm space-y-3 shrink-0">
        {/* Status Filters */}
        <div className="flex flex-col lg:flex-row gap-3 justify-between items-start lg:items-center">
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
          <div className="flex items-center gap-2 shrink-0 self-end lg:self-auto">
            {/* Görünüm modu toggle */}
            <div className="flex rounded-theme border border-gray-200 overflow-hidden bg-gray-50">
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
          </div>
        </div>

        {/* Detailed Dropdown Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-gray-100">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Öncelik Seviyesi</label>
            <select
              value={priorityFilter}
              onChange={e => setPriorityFilter(e.target.value)}
              className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">Tüm Öncelikler</option>
              <option value="dusuk">Düşük</option>
              <option value="normal">Normal</option>
              <option value="yuksek">Yüksek</option>
              <option value="acil">Acil</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Atanan Personel</label>
            <select
              value={technicianFilter}
              onChange={e => setTechnicianFilter(e.target.value)}
              className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">Tüm Personeller</option>
              {staffUsers.map(u => (
                <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Cihaz Türü</label>
            <select
              value={deviceTypeFilter}
              onChange={e => setDeviceTypeFilter(e.target.value)}
              className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">Tüm Cihazlar</option>
              {Array.from(new Set(tickets.map(t => t.deviceType).filter(Boolean))).map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Hızlı Arama</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="No, müşteri, telefon..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
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
            /* LİSTE GÖRÜNÜMÜ — UZMAN DATATABLE TASARIMI */
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        <th className="py-3.5 px-4 font-mono">Kayıt No</th>
                        <th className="py-3.5 px-4">Kayıt Tarihi</th>
                        <th className="py-3.5 px-4">Müşteri & İletişim</th>
                        <th className="py-3.5 px-4">Cihaz / Marka Model</th>
                        <th className="py-3.5 px-4">Şikayet / Konu</th>
                        <th className="py-3.5 px-4 text-center">Öncelik</th>
                        <th className="py-3.5 px-4">Atanan Personel</th>
                        <th className="py-3.5 px-4">Durum</th>
                        <th className="py-3.5 px-4 text-right">İşlemler</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                      {paginatedFiltered.map(ticket => (
                        <tr
                          key={ticket.id}
                          onClick={() => openDetail(ticket)}
                          className={cn(
                            "hover:bg-slate-50/70 transition-colors cursor-pointer group",
                            detailTicket?.id === ticket.id ? "bg-blue-50/30" : "",
                            ticket.status === 'musteri_onayi_bekliyor' ? "bg-amber-50/10" : ""
                          )}
                        >
                          {/* Kayıt No */}
                          <td className="py-3.5 px-4 font-mono font-bold text-gray-900 group-hover:text-primary transition-colors">
                            {ticket.ticketNumber}
                          </td>
                          {/* Kayıt Tarihi */}
                          <td className="py-3.5 px-4 text-gray-500 whitespace-nowrap">
                            {new Date(ticket.createdAt).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </td>
                          {/* Müşteri & İletişim */}
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-gray-900 leading-normal">{ticket.customerName}</div>
                            <div className="text-[10px] text-gray-400 font-medium">{ticket.customerPhone || '—'}</div>
                          </td>
                          {/* Cihaz / Marka Model */}
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-gray-800 leading-normal">{ticket.deviceBrand} {ticket.deviceModel}</div>
                            <div className="text-[10px] text-gray-400 font-mono font-medium">{ticket.deviceType || 'Cihaz'} {ticket.deviceSerial ? `• ${ticket.deviceSerial}` : ''}</div>
                          </td>
                          {/* Şikayet / Konu */}
                          <td className="py-3.5 px-4 max-w-xs">
                            <div className="truncate font-semibold text-gray-800" title={ticket.subject}>{ticket.subject}</div>
                          </td>
                          {/* Öncelik */}
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <span className={cn(
                              "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border",
                              ticket.priority === 'dusuk' ? "bg-gray-50 text-gray-500 border-gray-200" :
                              ticket.priority === 'normal' ? "bg-blue-50 text-blue-600 border-blue-150" :
                              ticket.priority === 'yuksek' ? "bg-orange-50 text-orange-600 border-orange-150" :
                              "bg-red-50 text-red-600 border-red-150 font-black animate-pulse"
                            )}>
                              {PRIORITY_LABELS[ticket.priority || 'normal']}
                            </span>
                          </td>
                          {/* Atanan Personel */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {ticket.assignedName ? (
                              <span className="text-blue-600 font-bold inline-flex items-center gap-1">
                                <Users className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                {ticket.assignedName}
                              </span>
                            ) : (
                              <span className="text-gray-400 italic">Atanmamış</span>
                            )}
                          </td>
                          {/* Durum */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className={cn("px-2.5 py-1 rounded-full text-[10px] font-extrabold shadow-2xs border border-black/5", STATUS_COLORS[ticket.status || 'yeni'])}>
                              {STATUS_LABELS[ticket.status || 'yeni']}
                            </span>
                          </td>
                          {/* İşlemler */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              <Link
                                to={`/print/ticket/${ticket.ticketNumber}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-700 rounded-lg transition-colors flex items-center justify-center shadow-2xs"
                                title="Fis Yazdir"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* PAGINATION CONTROL BAR */}
              {totalPages > 1 && (
                <div className="bg-white px-4 py-3.5 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-3">
                  <div className="text-xs text-gray-500 font-medium">
                    Toplam <span className="font-bold text-gray-800">{filtered.length}</span> kayıttan <span className="font-bold text-gray-800">{startIndex + 1} - {Math.min(startIndex + rowsPerPage, filtered.length)}</span> arası gösteriliyor
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 text-xs font-bold border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Önceki
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={cn(
                          "w-8 h-8 rounded-lg text-xs font-bold transition-all flex items-center justify-center",
                          currentPage === page
                            ? "bg-primary text-white shadow-sm"
                            : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                        )}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1.5 text-xs font-bold border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Sonraki
                    </button>
                  </div>
                </div>
              )}
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
                          <p className="text-gray-855 font-bold text-sm">
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
                        <p className="text-gray-855 font-bold text-sm">{formatDate(detailTicket.createdAt)}</p>
                      </div>
                    </div>
                  )}

                  {/* Cihaz & Erişim Bilgileri Kartı */}
                  <div className="border border-gray-200 rounded-2xl p-5 bg-white shadow-sm space-y-4">
                    <p className="text-xs font-black text-gray-700 uppercase tracking-widest flex items-center gap-1.5 border-b pb-2">
                      <Shield className="w-4 h-4 text-amber-500" /> Cihaz & Erişim Bilgileri
                    </p>
                    
                    {isEditingDetails ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider">Seri Numarası</label>
                            <input
                              type="text"
                              value={editDeviceSerial}
                              onChange={e => setEditDeviceSerial(e.target.value)}
                              className="w-full border border-gray-300 rounded-lg p-2 focus:ring-1 focus:ring-primary outline-none font-mono text-xs"
                              placeholder="Seri No"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider">IMEI</label>
                            <input
                              type="text"
                              value={editImei}
                              onChange={e => setEditImei(e.target.value)}
                              className="w-full border border-gray-300 rounded-lg p-2 focus:ring-1 focus:ring-primary outline-none font-mono text-xs"
                              placeholder="IMEI"
                            />
                          </div>
                        </div>

                        <div className="bg-amber-50/50 border border-amber-200/75 rounded-xl p-4 space-y-3">
                          <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">🔐 Cihaz Kilit & Hesap Bilgileri</p>
                          <div className="flex gap-4 flex-wrap">
                            <div className="flex flex-col items-center gap-1 shrink-0">
                              <label className="block text-[10px] font-semibold text-gray-600 mb-1 self-start">Desen Kilidi</label>
                              <PatternLockPicker
                                value={editPatternLock}
                                onChange={val => setEditPatternLock(val)}
                                size={148}
                              />
                            </div>
                            <div className="flex-1 min-w-[160px] space-y-2">
                              <div>
                                <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">PIN / Ekran Şifresi</label>
                                <input
                                  type="text"
                                  value={editPinPassword}
                                  onChange={e => setEditPinPassword(e.target.value)}
                                  className="w-full border border-gray-300 bg-white rounded-lg p-1.5 text-xs focus:ring-1 focus:ring-primary outline-none font-mono"
                                  placeholder="Ekran şifresi"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">Cihaz E-Postası</label>
                                <input
                                  type="text"
                                  value={editDeviceEmail}
                                  onChange={e => setEditDeviceEmail(e.target.value)}
                                  className="w-full border border-gray-300 bg-white rounded-lg p-1.5 text-xs focus:ring-1 focus:ring-primary outline-none"
                                  placeholder="Google / Apple hesabı"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">Hesap Şifresi</label>
                                <input
                                  type="text"
                                  value={editDeviceEmailPassword}
                                  onChange={e => setEditDeviceEmailPassword(e.target.value)}
                                  className="w-full border border-gray-300 bg-white rounded-lg p-1.5 text-xs focus:ring-1 focus:ring-primary outline-none"
                                  placeholder="E-posta şifresi"
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider">Müşteri Adresi</label>
                          <textarea
                            value={editCustomerAddress}
                            onChange={e => setEditCustomerAddress(e.target.value)}
                            rows={2}
                            className="w-full border border-gray-300 rounded-lg p-2 focus:ring-1 focus:ring-primary outline-none text-xs"
                            placeholder="Müşteri Fatura / Teslimat Adresi"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4 text-xs">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-gray-50/60 border border-gray-100 rounded-xl p-2.5">
                            <p className="text-gray-400 font-semibold uppercase tracking-wider text-[10px] mb-0.5">Seri No</p>
                            <p className="text-gray-800 font-mono font-bold">{detailTicket.deviceSerial || detailTicket.serialNumber || '—'}</p>
                          </div>
                          <div className="bg-gray-50/60 border border-gray-100 rounded-xl p-2.5">
                            <p className="text-gray-400 font-semibold uppercase tracking-wider text-[10px] mb-0.5">IMEI</p>
                            <p className="text-gray-800 font-mono font-bold">{detailTicket.imei || '—'}</p>
                          </div>
                        </div>

                        <div className="bg-amber-50/40 border border-amber-100/70 rounded-xl p-3.5 flex gap-4 flex-wrap">
                          <div className="flex flex-col items-center shrink-0">
                            <p className="text-[10px] text-amber-800 font-semibold self-start mb-1">Desen Kilidi Görünümü</p>
                            <PatternLockPicker
                              value={detailTicket.patternLock || ''}
                              onChange={() => {}}
                              size={128}
                              readOnly
                            />
                          </div>
                          <div className="flex-1 min-w-[160px] space-y-2">
                            <div>
                              <p className="text-gray-400 font-semibold uppercase tracking-wider text-[10px] mb-0.5">PIN / Şifre</p>
                              <p className="text-gray-855 font-mono font-bold bg-white px-2 py-1 rounded border border-gray-200/50 inline-block text-xs">
                                {detailTicket.pinPassword || 'Belirtilmedi'}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-400 font-semibold uppercase tracking-wider text-[10px] mb-0.5">Cihaz Hesabı / E-Posta</p>
                              <p className="text-gray-855 font-bold break-all bg-white px-2 py-1 rounded border border-gray-200/50 inline-block text-xs">
                                {detailTicket.deviceEmail || 'Belirtilmedi'}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-400 font-semibold uppercase tracking-wider text-[10px] mb-0.5">Hesap Şifresi</p>
                              <p className="text-gray-855 font-mono font-bold bg-white px-2 py-1 rounded border border-gray-200/50 inline-block text-xs">
                                {detailTicket.deviceEmailPassword || 'Belirtilmedi'}
                              </p>
                            </div>
                          </div>
                        </div>

                        {(detailTicket.address || detailTicket.customerAddress) && (
                          <div className="bg-gray-50/60 border border-gray-100 rounded-xl p-3">
                            <p className="text-gray-400 font-semibold uppercase tracking-wider text-[10px] mb-0.5">Adres</p>
                            <p className="text-gray-800 leading-normal font-medium">{detailTicket.address || detailTicket.customerAddress}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

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
                            <button
                              type="button"
                              onClick={() => setPreviewImage(mediaUrl(att.fileUrl))}
                              className="w-full h-full text-left focus:outline-none cursor-zoom-in"
                            >
                              <img
                                src={mediaUrl(att.fileUrl)}
                                alt={att.fileName}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            </button>
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

                {/* Right Area: Chat & Internal Notes / Timeline */}
                <div className="w-full lg:w-2/5 flex flex-col min-h-0 bg-slate-50/50 border-t lg:border-t-0 lg:border-l border-gray-200">
                  <div className="border-b border-gray-200 shrink-0 bg-white flex">
                    <button
                      type="button"
                      onClick={() => setRightPanelTab('notes')}
                      className={cn(
                        'flex-1 py-3 text-center text-xs font-bold border-b-2 transition-all flex items-center justify-center gap-1.5',
                        rightPanelTab === 'notes' ? 'border-primary text-primary bg-slate-50/30' : 'border-transparent text-gray-500 hover:text-gray-800'
                      )}
                    >
                      <MessageSquare className="w-3.5 h-3.5" /> Dahili Notlar ({ticketNotes.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setRightPanelTab('timeline')}
                      className={cn(
                        'flex-1 py-3 text-center text-xs font-bold border-b-2 transition-all flex items-center justify-center gap-1.5',
                        rightPanelTab === 'timeline' ? 'border-primary text-primary bg-slate-50/30' : 'border-transparent text-gray-500 hover:text-gray-800'
                      )}
                    >
                      <Clock className="w-3.5 h-3.5" /> Durum Geçmişi ({statusLogs.length})
                    </button>
                  </div>
                  
                  {rightPanelTab === 'notes' ? (
                    <>
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
                          type="button"
                          onClick={handleSendNote}
                          disabled={noteSending || !noteText.trim()}
                          className="px-4 py-2 bg-primary hover:bg-secondary text-white rounded-xl transition-colors disabled:opacity-50 shrink-0 flex items-center justify-center"
                          title="Gönder (Ctrl+Enter)"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {statusLogs.length === 0 && (
                        <p className="text-xs text-gray-400 italic text-center py-8">İşlem geçmişi bulunmuyor.</p>
                      )}
                      <div className="relative border-l-2 border-gray-200 ml-3 pl-5 space-y-5">
                        {statusLogs.map((log) => (
                          <div key={log.id} className="relative">
                            {/* Timeline Node Icon */}
                            <div className="absolute -left-[27px] top-1 w-3 h-3 rounded-full bg-primary border-2 border-white ring-4 ring-slate-100" />
                            
                            <div className="bg-white border border-gray-150 rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow">
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-xs font-bold text-gray-800">
                                  {STATUS_LABELS[log.fromStatus] || 'Başlangıç'} ➜ {STATUS_LABELS[log.toStatus] || log.toStatus}
                                </span>
                                <span className="text-[10px] text-gray-400 font-medium">
                                  {formatDate(log.createdAt)}
                                </span>
                              </div>
                              <p className="text-xs text-gray-600 mb-1.5 italic">"{log.notes || 'Açıklama belirtilmemiş'}"</p>
                              <div className="flex items-center gap-1 text-[10px] text-gray-400 font-semibold">
                                <span>👤 Güncelleyen:</span>
                                <span className="text-gray-600">{log.changedByName || 'Sistem'}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* New Ticket Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-[90vw] max-h-[92vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-0 border-b border-gray-100">
              <h2 className="text-xl font-black text-gray-900 tracking-tight">Yeni Servis Kaydı Oluştur</h2>
              <button onClick={() => { setShowModal(false); setModalTab('musteri'); }} className="p-2 hover:bg-gray-100 rounded-xl">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-100 px-6 bg-white">
              {([
                { key: 'musteri', label: 'Müşteri & Cari Bilgileri' },
                { key: 'cihaz', label: 'Cihaz & Erişim Bilgileri' },
                { key: 'servis', label: 'Servis Kabul & Detayları' },
                { key: 'medya', label: 'Teslim Fotoğrafları & Ekler' },
              ] as const).map(tab => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setModalTab(tab.key)}
                  className={cn(
                    'px-5 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-1.5',
                    modalTab === tab.key
                      ? 'border-primary text-primary'
                      : 'border-transparent text-gray-500 hover:text-gray-800'
                  )}
                >
                  {tab.key === 'musteri' && <Users className="w-4 h-4" />}
                  {tab.key === 'cihaz' && <Shield className="w-4 h-4" />}
                  {tab.key === 'servis' && <Wrench className="w-4 h-4" />}
                  {tab.key === 'medya' && <ImageIcon className="w-4 h-4" />}
                  {tab.label}
                  {tab.key === 'medya' && newTicketPhotos.length > 0 && (
                    <span className="ml-1.5 bg-primary text-white text-[10px] px-1.5 py-0.5 rounded-full">{newTicketPhotos.length}</span>
                  )}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-6">

              {/* ── TAB 1: MÜŞTERİ BİLGİLERİ ── */}
              {modalTab === 'musteri' && (
                <div className="bg-white border border-gray-150 rounded-2xl p-6 shadow-sm space-y-5 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2 mb-2 border-b border-gray-100 pb-3">
                    <Users className="w-5 h-5 text-primary" />
                    <h3 className="text-sm font-bold text-gray-800">Müşteri ve Cari Bilgileri</h3>
                  </div>
                  <div className="mb-4">
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Müşteri Türü</label>
                    <div className="flex gap-2">
                      <button type="button"
                        onClick={() => setNewTicket({ ...newTicket, customerType: 'bireysel' })}
                        className={`flex-1 py-2 text-sm font-bold rounded-xl border transition-all ${newTicket.customerType === 'bireysel' ? 'bg-primary text-white border-primary shadow-sm' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                      >Bireysel Müşteri</button>
                      <button type="button"
                        onClick={() => setNewTicket({ ...newTicket, customerType: 'kurumsal' })}
                        className={`flex-1 py-2 text-sm font-bold rounded-xl border transition-all ${newTicket.customerType === 'kurumsal' ? 'bg-primary text-white border-primary shadow-sm' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                      >Kurumsal Müşteri (Cari)</button>
                    </div>
                  </div>

                  {newTicket.customerType === 'kurumsal' && (
                    <div className="animate-in fade-in duration-200 space-y-3 bg-blue-50/60 border border-blue-100 rounded-2xl p-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Firma / Cari Ünvanı *</label>
                        <input type="text" value={newTicket.companyName}
                          onChange={e => {
                            setNewTicket({ ...newTicket, companyName: e.target.value });
                            checkDuplicateCustomers('name', e.target.value);
                          }}
                          className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                          placeholder="Firma Adı / Ticari Ünvan" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">Vergi Dairesi</label>
                          <input type="text" value={newTicket.taxOffice}
                            onChange={e => setNewTicket({ ...newTicket, taxOffice: e.target.value })}
                            className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                            placeholder="Vergi Dairesi" />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">Vergi / TCKN</label>
                          <input type="text" value={newTicket.taxId}
                            onChange={e => setNewTicket({ ...newTicket, taxId: e.target.value })}
                            className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                            placeholder="Vergi No / TCKN" />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">
                        {newTicket.customerType === 'kurumsal' ? 'Yetkili Adı Soyadı *' : 'Müşteri Adı Soyadı *'}
                      </label>
                      <input type="text" value={newTicket.customerName}
                        onChange={e => {
                          setNewTicket({ ...newTicket, customerName: e.target.value });
                          checkDuplicateCustomers('name', e.target.value);
                        }}
                        className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                        placeholder="Ad Soyad" required />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Telefon Numarası</label>
                      <input type="tel" value={newTicket.customerPhone}
                        onChange={e => {
                          setNewTicket({ ...newTicket, customerPhone: e.target.value });
                          checkDuplicateCustomers('phone', e.target.value);
                        }}
                        className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                        placeholder="05XX XXX XX XX" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">E-Posta Adresi</label>
                    <input type="email" value={newTicket.customerEmail}
                      onChange={e => {
                        setNewTicket({ ...newTicket, customerEmail: e.target.value });
                        checkDuplicateCustomers('email', e.target.value);
                      }}
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                      placeholder="musteri@eposta.com" />
                  </div>

                  {searchingCustomer && (
                    <div className="flex items-center gap-2 text-xs text-primary font-semibold py-1">
                      <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      Müşteriler sorgulanıyor...
                    </div>
                  )}

                  {/* Yinelenen / Kayıtlı Müşteri Uyarı Alanı */}
                  {duplicateCustomers.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 space-y-2 animate-in fade-in duration-200">
                      <p className="text-xs font-extrabold text-amber-800 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4 text-amber-600" /> Kayıtlı Müşteri Bulundu ({duplicateCustomers.length})
                      </p>
                      <div className="max-h-28 overflow-y-auto space-y-1.5">
                        {duplicateCustomers.map(c => (
                          <div
                            key={c.id}
                            onClick={() => selectExistingCustomer(c)}
                            className="bg-white border border-gray-200 hover:border-primary p-2 rounded-xl text-xs flex justify-between items-center cursor-pointer transition-all hover:shadow-sm"
                          >
                            <div>
                              <p className="font-bold text-gray-900">{c.firstName} {c.lastName}</p>
                              {c.companyName && <p className="text-[10px] text-gray-450">{c.companyName}</p>}
                            </div>
                            <div className="text-right text-[10px] text-gray-500">
                              <p>{c.phone}</p>
                              <p>{c.email}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Müşteri Adresi</label>
                    <textarea value={newTicket.address}
                      onChange={e => setNewTicket({ ...newTicket, address: e.target.value })}
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none resize-none"
                      rows={2} placeholder="Müşteri adresi (Fatura / Teslimat için)" />
                  </div>
                </div>
              )}

              {/* ── TAB 2: CİHAZ BİLGİLERİ ── */}
              {modalTab === 'cihaz' && (
                <div className="bg-white border border-gray-150 rounded-2xl p-6 shadow-sm space-y-5 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2 mb-2 border-b border-gray-100 pb-3">
                    <Shield className="w-5 h-5 text-primary" />
                    <h3 className="text-sm font-bold text-gray-800">Cihaz & Teslimat Bilgileri</h3>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Cihaz Türü</label>
                      <input type="text" value={newTicket.deviceType}
                        onChange={e => setNewTicket({ ...newTicket, deviceType: e.target.value })}
                        className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                        placeholder="Örn: Laptop, Telefon" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Marka</label>
                      <input type="text" value={newTicket.deviceBrand}
                        onChange={e => setNewTicket({ ...newTicket, deviceBrand: e.target.value })}
                        className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                        placeholder="Örn: Asus, Apple" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Model</label>
                      <input type="text" value={newTicket.deviceModel}
                        onChange={e => setNewTicket({ ...newTicket, deviceModel: e.target.value })}
                        className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                        placeholder="Örn: ROG Strix, iPhone 15" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Seri No</label>
                      <input type="text" value={newTicket.deviceSerial}
                        onChange={e => setNewTicket({ ...newTicket, deviceSerial: e.target.value })}
                        className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none font-mono"
                        placeholder="Seri Numarası" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">IMEI</label>
                      <input type="text" value={newTicket.imei}
                        onChange={e => setNewTicket({ ...newTicket, imei: e.target.value })}
                        className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none font-mono"
                        placeholder="IMEI Numarası" />
                    </div>
                  </div>

                  <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 space-y-3">
                    <p className="text-xs font-bold text-amber-700 uppercase tracking-widest flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5" />
                      Erişim Bilgileri (Teknik Personel)
                    </p>
                    <div className="flex gap-4 flex-wrap">
                      {/* Sol: Desen Kilidi - görsel */}
                      <div className="flex flex-col items-center gap-1">
                        <label className="block text-xs font-semibold text-gray-600 mb-1 self-start">Desen Kilidi</label>
                        <PatternLockPicker
                          value={newTicket.patternLock}
                          onChange={val => setNewTicket({ ...newTicket, patternLock: val })}
                          size={172}
                        />
                      </div>
                      {/* Sağ: PIN, E-posta, Parola */}
                      <div className="flex-1 min-w-[180px] space-y-3">
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">PIN / Parola</label>
                          <input type="text" value={newTicket.pinPassword}
                            onChange={e => setNewTicket({ ...newTicket, pinPassword: e.target.value })}
                            className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                            placeholder="PIN veya ekran parolası" />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">Cihaz E-Postası</label>
                          <input type="text" value={newTicket.deviceEmail}
                            onChange={e => setNewTicket({ ...newTicket, deviceEmail: e.target.value })}
                            className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                            placeholder="Apple ID / Google hesabı" />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">E-Posta Parolası</label>
                          <input type="text" value={newTicket.deviceEmailPassword}
                            onChange={e => setNewTicket({ ...newTicket, deviceEmailPassword: e.target.value })}
                            className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                            placeholder="Hesap parolası" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Yanında Teslim Alınan Emanetler</label>
                    <input type="text" value={newTicket.accessories}
                      onChange={e => setNewTicket({ ...newTicket, accessories: e.target.value })}
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                      placeholder="Örn: Şarj aleti, kılıf, çanta, kutu..." />
                  </div>
                </div>
              )}

              {/* ── TAB 3: SERVİS DETAYLARI ── */}
              {modalTab === 'servis' && (
                <div className="bg-white border border-gray-150 rounded-2xl p-6 shadow-sm space-y-5 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2 mb-2 border-b border-gray-100 pb-3">
                    <Wrench className="w-5 h-5 text-primary" />
                    <h3 className="text-sm font-bold text-gray-800">Servis Kabul ve Arıza Detayları</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Kanal / Kaynak</label>
                      <select value={newTicket.source}
                        onChange={e => {
                          const val = e.target.value;
                          setNewTicket(prev => ({ ...prev, source: val, dealerId: val !== 'dealer' ? '' : prev.dealerId }));
                        }}
                        className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none">
                        <option value="walk_in">Elden Teslim (Walk-in)</option>
                        <option value="dealer">Bayi Kanalı</option>
                        <option value="online">Online Başvuru</option>
                        <option value="phone">Telefon</option>
                      </select>
                    </div>
                    {newTicket.source === 'dealer' ? (
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Aracı Bayi</label>
                        <select value={newTicket.dealerId}
                          onChange={e => setNewTicket({ ...newTicket, dealerId: e.target.value })}
                          className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none">
                          <option value="">Bayi Seçin...</option>
                          {dealers.map(d => (<option key={d.id} value={d.id}>{d.name}</option>))}
                        </select>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Teslim Alan / Atanan Personel</label>
                        <select value={newTicket.assignedTo}
                          onChange={e => setNewTicket({ ...newTicket, assignedTo: e.target.value })}
                          className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none">
                          <option value="">Seçin...</option>
                          {staffUsers.map(u => (
                            <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
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
                    <label className="block text-sm font-bold text-gray-800 mb-2">Müşteri Şikayeti / Detaylı Açıklama</label>
                    <RichTextEditor
                      value={newTicket.description}
                      onChange={val => setNewTicket({ ...newTicket, description: val })}
                      placeholder="Arıza açıklaması, müşteri şikayetleri ve ilk tespitleri buraya yazın..."
                      className="bg-white rounded-xl shadow-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-800 mb-2">Teknik Personel Görüşü (Ön Tespit)</label>
                    <RichTextEditor
                      value={newTicket.technicianNotes}
                      onChange={val => setNewTicket({ ...newTicket, technicianNotes: val })}
                      placeholder="Teknik ön tespit, olası sorunlar..."
                      className="bg-white rounded-xl shadow-sm"
                    />
                  </div>
                </div>
              )}

              {/* ── TAB 4: MEDYA / DOSYALAR ── */}
              {modalTab === 'medya' && (
                <div className="bg-white border border-gray-150 rounded-2xl p-6 shadow-sm space-y-5 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2 mb-2 border-b border-gray-100 pb-3">
                    <ImageIcon className="w-5 h-5 text-primary" />
                    <h3 className="text-sm font-bold text-gray-800">Cihaz Teslim Fotoğrafları & Ekler</h3>
                  </div>
                  <div className="border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center hover:border-primary/40 transition-colors">
                    <label className="cursor-pointer">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <Camera className="w-6 h-6 text-primary" />
                        </div>
                        <p className="text-sm font-bold text-gray-700">Fotoğraf veya Video Yükle</p>
                        <p className="text-xs text-gray-400">Birden fazla dosya seçebilirsiniz • Görsel ve video desteklenir</p>
                        {newTicketPhotoUploading && (
                          <div className="flex items-center gap-2 text-primary text-sm font-semibold">
                            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            Yükleniyor...
                          </div>
                        )}
                      </div>
                      <input
                        type="file"
                        accept="image/*,video/*"
                        multiple
                        onChange={handleNewTicketPhotoUpload}
                        disabled={newTicketPhotoUploading}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {newTicketPhotos.length === 0 ? (
                    <p className="text-center text-sm text-gray-400 py-4">Henüz teslim anı görseli / videosu eklenmedi.</p>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                      {newTicketPhotos.map((file, index) => (
                        <div key={index} className="relative group border border-gray-200 rounded-xl overflow-hidden aspect-video bg-gray-50 flex items-center justify-center">
                          {file.fileType?.startsWith('video/') ? (
                            <video src={file.fileUrl} className="w-full h-full object-cover" controls />
                          ) : (
                            <button
                              type="button"
                              onClick={() => setPreviewImage(file.fileUrl)}
                              className="w-full h-full text-left focus:outline-none cursor-zoom-in"
                            >
                              <img src={file.fileUrl} alt={file.fileName} className="w-full h-full object-cover" />
                            </button>
                          )}
                          <button type="button"
                            onClick={() => setNewTicketPhotos(prev => prev.filter((_, idx) => idx !== index))}
                            className="absolute top-1 right-1 p-1 bg-red-600 hover:bg-red-700 text-white rounded-md shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Sil"
                          >
                            <X className="w-3 h-3" />
                          </button>
                          <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] p-1 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                            {file.fileName}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-6 py-4 border-t border-gray-100 bg-slate-50/50">
              <button type="button" onClick={() => { setShowModal(false); setModalTab('musteri'); }}
                className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl font-bold hover:bg-gray-50 transition-colors">
                İptal
              </button>
              <button type="button" onClick={handleCreate}
                disabled={saving || !newTicket.customerName}
                className="flex-1 bg-primary hover:bg-secondary text-white py-2.5 rounded-xl font-bold transition-colors disabled:opacity-50 flex items-center justify-center shadow-md shadow-primary/20">
                {saving ? (<div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />) : null}
                Kayıt ve Giriş Fişi Oluştur
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Digital Signature Delivery Modal */}
      {showSignatureModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-slate-50">
              <div>
                <h3 className="text-sm font-black text-gray-950 uppercase tracking-widest">Cihaz Teslim Alım İmzası</h3>
                <p className="text-[10px] text-gray-400 font-semibold mt-0.5">Lütfen aşağıdaki alana imza atınız.</p>
              </div>
              <button 
                type="button" 
                onClick={() => setShowSignatureModal(false)} 
                className="p-1.5 hover:bg-gray-200 rounded-xl text-gray-400 hover:text-gray-950 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawing Area (Canvas) */}
            <div className="p-6 bg-slate-50 flex flex-col items-center">
              <div className="relative w-full aspect-[4/3] bg-white rounded-2xl border-2 border-dashed border-gray-200 overflow-hidden shadow-inner">
                <canvas
                  ref={canvasRef}
                  width={400}
                  height={300}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-full cursor-crosshair touch-none"
                />
                
                {/* Floating Clear Button */}
                <button
                  type="button"
                  onClick={clearSignature}
                  className="absolute bottom-3 right-3 px-3 py-1.5 bg-white border border-gray-200 hover:bg-slate-50 text-gray-600 rounded-xl text-[10px] font-bold shadow-sm transition-colors"
                >
                  Alanı Temizle
                </button>
              </div>
              <p className="text-[10px] text-gray-450 italic mt-3 text-center">
                * Bu imza, cihazın tüm onarım / servis işlemleri tamamlandıktan sonra teslim alındığını taahhüt eder.
              </p>
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-6 py-4 border-t border-gray-100 bg-white">
              <button
                type="button"
                onClick={() => setShowSignatureModal(false)}
                className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl font-bold hover:bg-gray-50 transition-colors text-xs"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={handleSaveSignatureAndDeliver}
                disabled={isSignatureSaving}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-xl font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-1 shadow-md shadow-green-600/10 text-xs"
              >
                {isSignatureSaving ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />
                ) : (
                  <Shield className="w-3.5 h-3.5" />
                )}
                İmzala & Teslim Et
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
    </div>
  );
}
