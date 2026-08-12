import { Search, Plus, X, Printer, MessageSquare, Send, ChevronRight, Calendar, DollarSign, Phone, Mail, Clock, AlertCircle, AlertTriangle, Image as ImageIcon, Trash2, Truck, Camera, LayoutList, Columns, Building2, Shield, Users, Wrench, FileText, CreditCard, Wallet, RotateCcw, History, Settings2, ClipboardCheck, CheckCircle2, XCircle, MinusCircle, Save } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { cn, openWhatsApp, formatWaPhone } from '../../lib/utils';
import { fetchAdminTickets, createAdminTicket, updateAdminTicket, deleteAdminTicket, createTicketMessage, fetchTicketAttachments, createTicketAttachment, deleteTicketAttachment, triggerTicketWhatsApp, fetchAdminShipments, createAdminShipment, adminRequest, fetchTicketParts, addTicketPart, deleteTicketPart, fetchAdminUsers, fetchAdminStock, searchAdminCustomers, createInvoiceFromTicket, createOdealPaymentLink, fetchAdminDeviceTypes, fetchTicketPayments, createAdminPayment, reverseAdminPayment, fetchTicketActivity, fetchTicketExpertise, saveTicketExpertise, fetchTicketApprovalRequests, recordManualApproval, sendApprovalRequest, fetchTicketSupplyRequests, createSupplyRequest, markSupplyRequestArrived } from '../../lib/api';
import MediaPicker from '../../components/ui/MediaPicker';
import RichTextEditor from '../../components/ui/RichTextEditor';
import PatternLockPicker from '../../components/ui/PatternLockPicker';
import DamageMarkingCanvas, { DamagePin } from '../../components/ui/DamageMarkingCanvas';
import SignatureCanvas from '../../components/ui/SignatureCanvas';
import CameraBarcodeScanner from '../../components/ui/CameraBarcodeScanner';
import { mediaUrl } from '../../lib/media';
import { TICKET_STATUS_LABELS } from '../../lib/ticketStatus';

const STATUS_COLORS: Record<string, string> = {
  'yeni': 'bg-blue-100 text-blue-700',
  'isleme_alindi': 'bg-purple-100 text-purple-700',
  'parca_bekliyor': 'bg-orange-100 text-orange-700',
  'dis_servis': 'bg-cyan-100 text-cyan-700',
  'musteri_onayi_bekliyor': 'bg-amber-100 text-amber-700',
  'onay_red': 'bg-rose-100 text-rose-700',
  'onarimda': 'bg-indigo-100 text-indigo-700',
  'cozuldu': 'bg-green-100 text-green-700',
  'iade': 'bg-orange-100 text-orange-700',
  'kapatildi': 'bg-gray-100 text-gray-500',
  'teslim_edildi': 'bg-teal-100 text-teal-700',
  'iptal': 'bg-red-100 text-red-600',
};

const STATUS_LABELS = TICKET_STATUS_LABELS;

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

const TYPE_LABELS: Record<string, string> = {
  'ariza': 'Arıza',
  'destek': 'Destek',
  'kurulum': 'Kurulum',
  'bakim': 'Bakım',
  'diger': 'Diğer',
};

const PHYSICAL_CONDITIONS = [
  'Ekran/panel çizik', 'Ekran/panel kırık', 'Kasa çizik / ezik', 'Parça eksik',
  'Sıvı teması şüphesi', 'Cihaz açılmıyor', 'Daha önce müdahale görmüş',
];

const QUICK_ISSUE_PRESETS = [
  '📱 Ekran Kırık / Dokunmatik Hatalı',
  '🔋 Batarya Çabuk Bitiyor / Şişmiş',
  '💧 Sıvı Teması Var',
  '⚡ Şarj Almıyor / Soket Temassızlık',
  '🔥 Cihaz Aşırı Isınıyor / Kapanıyor',
  '💻 Yavaş Çalışıyor / Format & Temizlik',
  '🔊 Ses Gelmiyor / Hoparlör Bozuk',
  '🌐 Wi-Fi / Şebeke Bağlanmıyor',
];

const SERVICE_STEPS = [
  { key: 'yeni', label: 'Kabul Edildi', stepNum: 1 },
  { key: 'isleme_alindi', label: 'Arıza Tespiti', stepNum: 2 },
  { key: 'musteri_onayi_bekliyor', label: 'Fiyat Onayı', stepNum: 3 },
  { key: 'onarimda', label: 'Onarımda', stepNum: 4 },
  { key: 'cozuldu', label: 'Çözüldü / Hazır', stepNum: 5 },
  { key: 'teslim_edildi', label: 'Teslim Edildi', stepNum: 6 },
];

// IMEI Luhn algoritması doğrulaması (GSMA standardı — 15 hane). Server tarafında da tekrar kontrol edilir.
function isValidImei(imei: string): boolean {
  if (!/^\d{15}$/.test(imei)) return false;
  let sum = 0;
  for (let i = 0; i < 15; i++) {
    let d = Number(imei[i]);
    if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
  }
  return sum % 10 === 0;
}

function formatDate(d: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// Yüzlerce sayfa olduğunda tek tek buton basmak yerine pencereli sayfalama:
// her zaman ilk/son sayfa + aktif sayfanın etrafı görünür, arası "..." ile kısaltılır.
function getPaginationWindow(current: number, total: number): (number | '...')[] {
  const delta = 2;
  const range: number[] = [];
  for (let i = Math.max(2, current - delta); i <= Math.min(total - 1, current + delta); i++) {
    range.push(i);
  }
  const result: (number | '...')[] = [1];
  if (range[0] > 2) result.push('...');
  result.push(...range);
  if (range[range.length - 1] < total - 1) result.push('...');
  if (total > 1) result.push(total);
  return result;
}

function getSlaBadge(estimatedDueAt?: string) {
  if (!estimatedDueAt) return null;
  const due = new Date(estimatedDueAt).getTime();
  const now = new Date().getTime();
  const diffDays = Math.ceil((due - now) / (1000 * 3600 * 24));

  if (diffDays < 0) {
    return <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold">Gecikmede ({Math.abs(diffDays)}d)</span>;
  } else if (diffDays <= 2) {
    return <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold">Kritik ({diffDays}d)</span>;
  }
  return <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[10px] font-bold">SLA: {diffDays}d</span>;
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
  const [ticketPayments, setTicketPayments] = useState<any[]>([]);
  const [isAddingPayment, setIsAddingPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('nakit');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentIsRefund, setPaymentIsRefund] = useState(false);
  const [isAddingPart, setIsAddingPart] = useState(false);
  const [selectedStockId, setSelectedStockId] = useState('');
  const [partQuantity, setPartQuantity] = useState('1');
  const [partUnitPrice, setPartUnitPrice] = useState('');
  const [partVatRate, setPartVatRate] = useState('20');
  const [partMode, setPartMode] = useState<'stok' | 'manuel'>('stok');
  const [manualPartName, setManualPartName] = useState('');
  const [manualPartBrand, setManualPartBrand] = useState('');
  const [laborCostValue, setLaborCostValue] = useState('');
  const [isSavingLabor, setIsSavingLabor] = useState(false);

  // Toplu İşlemler State
  const [selectedTicketIds, setSelectedTicketIds] = useState<number[]>([]);
  const [bulkStatus, setBulkStatus] = useState('');
  const [bulkTechnician, setBulkTechnician] = useState('');
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [activityFeed, setActivityFeed] = useState<any[]>([]);
  const [activityFilter, setActivityFilter] = useState<'all' | 'note' | 'status' | 'audit'>('all');
  const [physicalConditions, setPhysicalConditions] = useState<Set<string>>(new Set());
  const [functionTestResults, setFunctionTestResults] = useState<Record<string, string>>({});
  const [isSavingExpertise, setIsSavingExpertise] = useState(false);
  const [approvalRequests, setApprovalRequests] = useState<any[]>([]);
  const [isRecordingManualApproval, setIsRecordingManualApproval] = useState(false);
  const [isSendingApprovalRequest, setIsSendingApprovalRequest] = useState(false);
  const [supplyRequests, setSupplyRequests] = useState<any[]>([]);
  const [supplyItemName, setSupplyItemName] = useState('');
  const [supplySupplier, setSupplySupplier] = useState('');
  const [supplyEta, setSupplyEta] = useState('');
  const [isAddingSupplyRequest, setIsAddingSupplyRequest] = useState(false);
  const [editExternalServiceName, setEditExternalServiceName] = useState('');
  const [editExternalCost, setEditExternalCost] = useState('');
  const [isSavingExternalService, setIsSavingExternalService] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // FAZ 2: Görünüm modu ve bayi
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [dealers, setDealers] = useState<any[]>([]);
  const [cameraUploading, setCameraUploading] = useState(false);
  const [deviceTypes, setDeviceTypes] = useState<any[]>([]);

  // Edit Details Mode State
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [detailTab, setDetailTab] = useState<'genel' | 'fiziksel' | 'parca' | 'durum' | 'ekler' | 'aktivite'>('genel');
  const [showDamageDetail, setShowDamageDetail] = useState(false);

  // Özel bildirim/onay modalları (native alert/confirm yerine)
  const [infoModal, setInfoModal] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ message: string; danger?: boolean; resolve: (v: boolean) => void } | null>(null);

  function showAlert(message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') {
    setInfoModal({ message, type });
  }
  function showConfirm(message: string, danger = false): Promise<boolean> {
    return new Promise(resolve => setConfirmModal({ message, danger, resolve }));
  }
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
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);
  const [showWaModal, setShowWaModal] = useState(false);
  const [selectedWaTemplate, setSelectedWaTemplate] = useState('1');

  // Live Camera Capture State
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  // Detay paneli cihaz bilgileri düzenleme state'leri
  const [editImei, setEditImei] = useState('');
  const [editDeviceSerial, setEditDeviceSerial] = useState('');
  const [editPatternLock, setEditPatternLock] = useState('');
  const [editPinPassword, setEditPinPassword] = useState('');
  const [editDeviceEmail, setEditDeviceEmail] = useState('');
  const [editDeviceEmailPassword, setEditDeviceEmailPassword] = useState('');
  const [editDeviceTypeId, setEditDeviceTypeId] = useState<string | number>('');
  const [editColor, setEditColor] = useState('');
  const [editVariant, setEditVariant] = useState('');
  const [editCustomerAddress, setEditCustomerAddress] = useState('');
  const [newTicketPhotos, setNewTicketPhotos] = useState<any[]>([]);
  const [newTicketPhotoUploading, setNewTicketPhotoUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [modalTab, setModalTab] = useState<'musteri'|'cihaz'|'servis'|'fiziksel'|'medya'>('musteri');
  
  // Advanced filters and pagination
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [technicianFilter, setTechnicianFilter] = useState('all');
  const [deviceTypeFilter, setDeviceTypeFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(15);

  // Advanced scanner & analytics states
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  const loadAnalytics = async () => {
    try {
      setLoadingAnalytics(true);
      const res = await adminRequest('/api/admin/tickets/analytics');
      setAnalyticsData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const [newTicketStep, setNewTicketStep] = useState<1 | 2 | 3 | 4>(1);
  const [newTicket, setNewTicket] = useState({
    subject: '',
    description: '',
    type: 'ariza',
    priority: 'normal',
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    deviceType: '',
    deviceTypeId: '' as string | number,
    deviceBrand: '',
    deviceModel: '',
    color: '',
    variant: '',
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
    rackLocation: '',
    damagePins: [] as DamagePin[],
    estimatedCost: '',
    estimatedDueAt: '',
    consentKvkk: false,
    consentDataLoss: false,
    consentAccessInfo: false,
    consentExpertiseFee: false,
  });

  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [duplicateCustomers, setDuplicateCustomers] = useState<any[]>([]);
  const [searchingCustomer, setSearchingCustomer] = useState(false);
  const customerSearchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const customerSearchRequestIdRef = useRef(0);

  // Müşteri bilgileri girildikçe veritabanından eşleşen müşterileri bul.
  // Debounce'lu: her tuş vuruşunda değil, yazma durduktan 350ms sonra arar.
  // Ayrıca yalnızca en son isteğin sonucu uygulanır — yavaş biten eski bir
  // istek, daha sonra tamamlanan yeni bir aramanın sonucunu ezmesin diye.
  const checkDuplicateCustomers = (field: 'name' | 'phone' | 'email', value: string) => {
    if (customerSearchDebounceRef.current) clearTimeout(customerSearchDebounceRef.current);

    if (!value || value.length < 2) {
      setDuplicateCustomers([]);
      customerSearchRequestIdRef.current += 1; // bekleyen eski istekleri geçersiz kıl
      return;
    }

    customerSearchDebounceRef.current = setTimeout(async () => {
      const requestId = ++customerSearchRequestIdRef.current;
      setSearchingCustomer(true);
      try {
        const results = await searchAdminCustomers(value);
        if (requestId !== customerSearchRequestIdRef.current) return; // daha yeni bir arama başladı, bu sonucu atla
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
        if (requestId === customerSearchRequestIdRef.current) setSearchingCustomer(false);
      }
    }, 350);
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
      const [users, stock, dealersData, deviceTypesData, customersData] = await Promise.all([
        fetchAdminUsers(),
        fetchAdminStock(),
        adminRequest('/api/admin/dealers').catch(() => []),
        fetchAdminDeviceTypes().catch(() => []),
        adminRequest('/api/admin/customers').catch(() => [])
      ]);
      const staff = users.filter((u: any) => u.roleType === 'superadmin' || u.roleType === 'tenant_admin' || u.roleType === 'staff' || u.roleType === 'technician');
      setStaffUsers(staff);
      
      const combinedUsers = [...users];
      if (Array.isArray(customersData)) {
        customersData.forEach((c: any) => {
          if (!combinedUsers.some(u => u.id === c.id)) {
            combinedUsers.push({
              id: c.id,
              firstName: c.firstName,
              lastName: c.lastName,
              email: c.email,
              phone: c.phone,
              companyName: c.companyName,
              roleType: 'customer',
            });
          }
        });
      }
      setAllUsers(combinedUsers);
      setStockItems(stock);
      setDealers(Array.isArray(dealersData) ? dealersData : []);
      setDeviceTypes(Array.isArray(deviceTypesData) ? deviceTypesData : []);
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

  // Durum (status tab) hariç tüm filtreleri uygular — hem List (üstüne status tab'ı ekler)
  // hem de Kanban (her sütun kendi status'ünü uygular) bu TEK kaynaktan beslenir, böylece
  // iki görünüm arasında geçince farklı sonuç kümesi görünmez.
  const baseFiltered = tickets.filter(t => {
    const matchSearch = search === '' ||
      t.ticketNumber?.toLowerCase().includes(search.toLowerCase()) ||
      t.customerName?.toLowerCase().includes(search.toLowerCase()) ||
      t.subject?.toLowerCase().includes(search.toLowerCase()) ||
      t.customerPhone?.toLowerCase().includes(search.toLowerCase());

    const matchPriority = priorityFilter === 'all' || t.priority === priorityFilter;
    const matchTechnician = technicianFilter === 'all' || String(t.assignedTo) === String(technicianFilter);
    const matchDeviceType = deviceTypeFilter === 'all' || t.deviceType === deviceTypeFilter;
    const matchType = typeFilter === 'all' || t.type === typeFilter;

    return matchSearch && matchPriority && matchTechnician && matchDeviceType && matchType;
  });

  const filtered = baseFiltered.filter(t => filter === 'all' || t.status === filter);

  // Calculate paginated subset of filtered tickets
  const totalPages = Math.ceil(filtered.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedFiltered = filtered.slice(startIndex, startIndex + rowsPerPage);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, search, priorityFilter, technicianFilter, deviceTypeFilter, typeFilter]);

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
      showAlert('Dosya yüklenirken hata: ' + err.message, 'error');
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
        deviceTypeId: '',
        deviceBrand: '',
        deviceModel: '',
        color: '',
        variant: '',
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
        consentKvkk: false,
        consentDataLoss: false,
        consentAccessInfo: false,
        consentExpertiseFee: false,
      });
      await loadTickets();
      if (res && res.ticketNumber) {
        window.open(`/print/ticket/${res.ticketNumber}`, '_blank');
      }
    } catch (e: any) {
      showAlert('Hata: ' + e.message, 'error');
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
      showAlert('Fotoğraf yüklenirken hata: ' + err.message, 'error');
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
        loadActivityFeed(id);
        fetchTicketApprovalRequests(id).then(r => setApprovalRequests(r || [])).catch(() => {});
      }
    } catch (e: any) {
      showAlert('Hata: ' + e.message, 'error');
    }
  };

  const handleBulkUpdate = async () => {
    if (selectedTicketIds.length === 0) return;
    if (!bulkStatus && !bulkTechnician) return;
    setIsBulkUpdating(true);
    try {
      const updateData: any = {};
      if (bulkStatus) updateData.status = bulkStatus;
      if (bulkTechnician) updateData.assignedTo = parseInt(bulkTechnician);

      await Promise.all(
        selectedTicketIds.map(id => updateAdminTicket(id, updateData))
      );

      showAlert(`${selectedTicketIds.length} servis kaydı topluca güncellendi.`, 'success');
      setSelectedTicketIds([]);
      setBulkStatus('');
      setBulkTechnician('');
      await loadTickets();
    } catch (e: any) {
      showAlert('Toplu güncelleme hatası: ' + e.message, 'error');
    } finally {
      setIsBulkUpdating(false);
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
      showAlert('Hata: ' + e.message, 'error');
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
      
      // Update ticket status to "teslim_edildi" ve imzayı kendi kolonuna kaydet
      await updateAdminTicket(detailTicket.id, {
        status: 'teslim_edildi',
        deliverySignature: mediaData.fileUrl,
        technicianNotes: (detailTicket.technicianNotes || '') + '\n[Cihaz dijital imza karşılığında teslim edildi.]'
      });

      // Update state
      setTickets(prev => prev.map(t => t.id === detailTicket.id ? { ...t, status: 'teslim_edildi', deliverySignature: mediaData.fileUrl } : t));
      setDetailTicket((prev: any) => ({
        ...prev,
        status: 'teslim_edildi',
        deliverySignature: mediaData.fileUrl,
        technicianNotes: (prev.technicianNotes || '') + '\n[Cihaz dijital imza karşılığında teslim edildi.]'
      }));
      
      const atts = await fetchTicketAttachments(detailTicket.id).catch(() => []);
      setTicketAttachments(atts || []);
      loadActivityFeed(detailTicket.id);

      setShowSignatureModal(false);
      showAlert('Cihaz başarıyla dijital imza ile teslim edildi!', 'success');
    } catch (e: any) {
      showAlert('Hata: ' + e.message, 'error');
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
        deviceTypeId: editDeviceTypeId,
        deviceBrand: editDeviceBrand,
        deviceModel: editDeviceModel,
        color: editColor,
        variant: editVariant,
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
      showAlert('Servis kaydı başarıyla güncellendi.', 'success');
    } catch (e: any) {
      showAlert('Hata: ' + e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTicket = async () => {
    if (!detailTicket) return;
    if (!(await showConfirm('Bu servis kaydını silmek istediğinize emin misiniz? Bu işlem geri alınamaz!', true))) return;
    setIsDeletingTicket(true);
    try {
      await deleteAdminTicket(detailTicket.id);
      setDetailTicket(null);
      await loadTickets();
      showAlert('Servis kaydı silindi.', 'success');
    } catch (e: any) {
      showAlert('Silme işlemi başarısız: ' + e.message, 'error');
    } finally {
      setIsDeletingTicket(false);
    }
  };

  const handleCreateInvoiceFromTicket = async () => {
    if (!detailTicket) return;
    setIsCreatingInvoice(true);
    try {
      const res = await createInvoiceFromTicket(detailTicket.id);
      if (res.success) {
        showAlert(`Servis #${detailTicket.ticketNumber} için Fatura #${res.invoiceNumber} başarıyla oluşturuldu!`, 'success');
        window.open('/admin/faturalar', '_blank');
      }
    } catch (e: any) {
      showAlert('Fatura oluşturulurken hata: ' + e.message, 'error');
    } finally {
      setIsCreatingInvoice(false);
    }
  };

  const handleSendOdealPaymentLink = async () => {
    if (!detailTicket) return;
    const grandTotal = (parseFloat(detailTicket.laborCost) || 0) + ticketParts.reduce((sum: any, p: any) => sum + parseFloat(p.totalPrice || 0), 0);
    const collected = ticketPayments.filter((p: any) => p.status === 'basarili').reduce((s: any, p: any) => s + parseFloat(p.amount || 0), 0);
    const refunded = ticketPayments.filter((p: any) => p.status === 'iade').reduce((s: any, p: any) => s + parseFloat(p.amount || 0), 0);
    const balance = grandTotal - collected + refunded;
    const defaultAmount = balance > 0 ? balance.toFixed(2) : (parseFloat(detailTicket.cost) || grandTotal || 0).toFixed(2);

    const inputAmt = prompt(`Servis #${detailTicket.ticketNumber} için Ödeal Ödeme Linki Tutarı (TL):`, defaultAmount);
    if (!inputAmt || parseFloat(inputAmt) <= 0) return;

    try {
      const res = await createOdealPaymentLink({
        amount: parseFloat(inputAmt),
        buyerName: detailTicket.customerName || `${detailTicket.userFirstName || ''} ${detailTicket.userLastName || ''}`.trim() || undefined,
        buyerPhone: detailTicket.customerPhone || detailTicket.userPhone || undefined,
        buyerEmail: detailTicket.customerEmail || detailTicket.userEmail || undefined,
        relatedType: 'ticket',
        relatedId: detailTicket.id,
      });

      const url = res.paymentLink || (res as any).paymentUrl;
      if (url) {
        const phone = detailTicket.customerPhone || detailTicket.userPhone;
        if (phone) {
          openWhatsApp(phone, `Sayın Müşterimiz, ${detailTicket.ticketNumber} numaralı servis kaydınız için Ödeal ile kredi kartıyla güvenli ödeme bağlantınız: ${url}`);
        }
        navigator.clipboard.writeText(url);
        showAlert(`Ödeal Ödeme Linki (₺${inputAmt}) panoya kopyalandı:\n${url}`, 'success');
      } else {
        showAlert('Ödeal yanıtında ödeme linki alınamadı.', 'error');
      }
    } catch (e: any) {
      showAlert('Ödeal linki oluşturulamadı: ' + e.message, 'error');
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setCameraStream(stream);
      setShowCameraModal(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 200);
    } catch (e: any) {
      showAlert('Kamera erişimi sağlanamadı: ' + e.message, 'error');
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCameraModal(false);
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !detailTicket) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], `servis_foto_${Date.now()}.jpg`, { type: 'image/jpeg' });
      
      const formData = new FormData();
      formData.append('file', file);
      const uploadRes = await adminRequest('/api/admin/media/upload', {
        method: 'POST',
        body: formData,
      });

      if (uploadRes.fileUrl) {
        await createTicketAttachment(detailTicket.id, {
          fileName: `Fotoğraf - ${new Date().toLocaleTimeString('tr-TR')}`,
          fileUrl: uploadRes.fileUrl,
          fileType: 'image/jpeg',
          fileSize: file.size,
        });
        const atts = await fetchTicketAttachments(detailTicket.id).catch(() => []);
        setTicketAttachments(atts || []);
        stopCamera();
        showAlert('Fotoğraf servis kaydına eklendi!', 'success');
      }
    }
  };

  const loadActivityFeed = async (ticketId: number) => {
    try {
      const feed = await fetchTicketActivity(ticketId);
      setActivityFeed(feed || []);
    } catch (e) {
      setActivityFeed([]);
    }
  };

  const openDetail = async (ticket: any) => {
    setDetailTicket(ticket);
    setDetailTab('genel');
    setShowDamageDetail(false);
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
    setEditDeviceTypeId(ticket.deviceTypeId || '');
    setEditDeviceBrand(ticket.deviceBrand || '');
    setEditDeviceModel(ticket.deviceModel || '');
    setEditColor(ticket.color || '');
    setEditVariant(ticket.variant || '');
    setEditImei(ticket.imei || '');
    setEditDeviceSerial(ticket.deviceSerial || ticket.serialNumber || '');
    setEditPatternLock(ticket.patternLock || '');
    setEditPinPassword(ticket.pinPassword || '');
    setEditDeviceEmail(ticket.deviceEmail || '');
    setEditDeviceEmailPassword(ticket.deviceEmailPassword || '');
    setEditCustomerAddress(ticket.address || ticket.customerAddress || '');
    setIsEditingDetails(false);
    
    loadActivityFeed(ticket.id);

    try {
      const exp = await fetchTicketExpertise(ticket.id);
      setPhysicalConditions(new Set(exp?.physicalConditions || []));
      setFunctionTestResults(exp?.functionTests || {});
    } catch (e) {
      setPhysicalConditions(new Set());
      setFunctionTestResults({});
    }

    try {
      const reqs = await fetchTicketApprovalRequests(ticket.id);
      setApprovalRequests(reqs || []);
    } catch (e) {
      setApprovalRequests([]);
    }

    try {
      const supplyReqs = await fetchTicketSupplyRequests(ticket.id);
      setSupplyRequests(supplyReqs || []);
    } catch (e) {
      setSupplyRequests([]);
    }
    setSupplyItemName('');
    setSupplySupplier('');
    setSupplyEta('');
    setEditExternalServiceName(ticket.externalServiceName || '');
    setEditExternalCost(ticket.externalCost || '');

    try {
      const parts = await fetchTicketParts(ticket.id);
      setTicketParts(parts || []);
    } catch (e) {
      setTicketParts([]);
    }

    try {
      const pays = await fetchTicketPayments(ticket.id);
      setTicketPayments(pays || []);
    } catch (e) {
      setTicketPayments([]);
    }
    setPaymentAmount('');
    setPaymentMethod('nakit');
    setPaymentNotes('');
    setPaymentIsRefund(false);

    setTimeout(() => notesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 150);
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
      loadActivityFeed(detailTicket.id);
      setNoteText('');
      setTimeout(() => notesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (e: any) {
      showAlert('Hata: ' + e.message, 'error');
    } finally {
      setNoteSending(false);
    }
  };

  const handleDeleteAttachment = async (id: number) => {
    if (!(await showConfirm('Bu görseli silmek istediğinize emin misiniz?', true))) return;
    try {
      await deleteTicketAttachment(id);
      if (detailTicket) {
        const atts = await fetchTicketAttachments(detailTicket.id);
        setTicketAttachments(atts || []);
      }
    } catch (e: any) {
      showAlert('Silme hatası: ' + e.message, 'error');
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
        showAlert(`Kargo başarıyla oluşturuldu! Takip No: ${res.trackingNumber}`, 'success');
      }
    } catch (e: any) {
      showAlert('Kargo oluşturulurken hata: ' + e.message, 'error');
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
      showAlert('Atama hatası: ' + e.message, 'error');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleAddPart = async () => {
    if (!detailTicket) return;
    if (partMode === 'stok' && !selectedStockId) {
      showAlert('Lütfen önce stoktan bir ürün/hizmet seçin.', 'warning');
      return;
    }
    if (partMode === 'manuel' && !manualPartName.trim()) {
      showAlert('Manuel kalem için isim girmelisiniz.', 'warning');
      return;
    }
    if (partMode === 'stok') {
      const selected = stockItems.find(s => s.id === parseInt(selectedStockId));
      const qty = parseInt(partQuantity) || 1;
      if (selected && qty > (selected.currentStock || 0)) {
        showAlert(`Yetersiz stok: "${selected.name}" için elinizde ${selected.currentStock} ${selected.unit} var, ${qty} ${selected.unit} isteniyor.`, 'warning');
        return;
      }
    }
    setIsAddingPart(true);
    try {
      await addTicketPart(detailTicket.id, {
        stockItemId: partMode === 'stok' ? parseInt(selectedStockId) : undefined,
        name: partMode === 'manuel' ? manualPartName.trim() : undefined,
        brand: partMode === 'manuel' ? manualPartBrand.trim() : undefined,
        quantity: parseInt(partQuantity) || 1,
        unitPrice: parseFloat(partUnitPrice) || 0,
        vatRate: parseInt(partVatRate) || 20,
      });
      const parts = await fetchTicketParts(detailTicket.id);
      setTicketParts(parts || []);
      loadActivityFeed(detailTicket.id);
      setSelectedStockId('');
      setPartQuantity('1');
      setPartUnitPrice('');
      setPartVatRate('20');
      setManualPartName('');
      setManualPartBrand('');
      showAlert('Parça/İşlem başarıyla eklendi.', 'success');
    } catch (e: any) {
      console.error('handleAddPart error:', e);
      showAlert('Parça eklenirken hata oluştu:\n\n' + (e?.message || 'Bilinmeyen hata') + '\n\nLütfen bu mesajın tam metnini paylaşın.', 'error');
    } finally {
      setIsAddingPart(false);
    }
  };

  const handleRemovePart = async (partId: number) => {
    if (!(await showConfirm('Bu parçayı/işlemi silmek istediğinize emin misiniz? Stok iade edilecektir.', true))) return;
    try {
      await deleteTicketPart(partId);
      const parts = await fetchTicketParts(detailTicket?.id);
      setTicketParts(parts || []);
      loadActivityFeed(detailTicket?.id);
    } catch (e: any) {
      showAlert('Silme hatası: ' + e.message, 'error');
    }
  };

  const togglePhysicalCondition = (key: string) => {
    setPhysicalConditions(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const setFunctionTestResult = (testName: string, result: 'ok' | 'fail' | 'na') => {
    setFunctionTestResults(prev => ({ ...prev, [testName]: prev[testName] === result ? '' : result }));
  };

  const handleSaveExpertise = async () => {
    if (!detailTicket) return;
    setIsSavingExpertise(true);
    try {
      await saveTicketExpertise(detailTicket.id, {
        physicalConditions: Array.from(physicalConditions),
        functionTests: functionTestResults,
      });
      loadActivityFeed(detailTicket.id);
      showAlert('Ekspertiz kaydedildi.', 'success');
    } catch (e: any) {
      showAlert('Ekspertiz kaydedilirken hata: ' + e.message, 'error');
    } finally {
      setIsSavingExpertise(false);
    }
  };

  const handleManualApproval = async (decision: 'approved' | 'rejected') => {
    if (!detailTicket) return;
    const label = decision === 'approved' ? 'onayladığını' : 'reddettiğini';
    if (!(await showConfirm(`Müşterinin teklifi telefon/yüz yüze görüşmede ${label} kaydetmek istediğinize emin misiniz?`, decision === 'rejected'))) return;
    setIsRecordingManualApproval(true);
    try {
      await recordManualApproval(detailTicket.id, decision);
      const newStatus = decision === 'approved' ? 'onarimda' : 'onay_red';
      setDetailTicket((prev: any) => ({ ...prev, status: newStatus }));
      setTickets(prev => prev.map(t => t.id === detailTicket.id ? { ...t, status: newStatus } : t));
      loadActivityFeed(detailTicket.id);
      const reqs = await fetchTicketApprovalRequests(detailTicket.id);
      setApprovalRequests(reqs || []);
    } catch (e: any) {
      showAlert('Hata: ' + e.message, 'error');
    } finally {
      setIsRecordingManualApproval(false);
    }
  };

  const handleSendApprovalRequest = async () => {
    if (!detailTicket) return;
    setIsSendingApprovalRequest(true);
    try {
      await sendApprovalRequest(detailTicket.id);
      loadActivityFeed(detailTicket.id);
      const reqs = await fetchTicketApprovalRequests(detailTicket.id);
      setApprovalRequests(reqs || []);
    } catch (e: any) {
      showAlert('Hata: ' + e.message, 'error');
    } finally {
      setIsSendingApprovalRequest(false);
    }
  };

  const handleAddSupplyRequest = async () => {
    if (!detailTicket || !supplyItemName.trim()) return;
    setIsAddingSupplyRequest(true);
    try {
      await createSupplyRequest(detailTicket.id, { itemName: supplyItemName.trim(), supplier: supplySupplier.trim() || undefined, etaDate: supplyEta || undefined });
      const reqs = await fetchTicketSupplyRequests(detailTicket.id);
      setSupplyRequests(reqs || []);
      loadActivityFeed(detailTicket.id);
      setSupplyItemName('');
      setSupplySupplier('');
      setSupplyEta('');
    } catch (e: any) {
      showAlert('Tedarik talebi eklenirken hata: ' + e.message, 'error');
    } finally {
      setIsAddingSupplyRequest(false);
    }
  };

  const handleMarkSupplyArrived = async (requestId: number) => {
    if (!detailTicket) return;
    try {
      await markSupplyRequestArrived(requestId);
      const reqs = await fetchTicketSupplyRequests(detailTicket.id);
      setSupplyRequests(reqs || []);
      loadActivityFeed(detailTicket.id);
    } catch (e: any) {
      showAlert('Hata: ' + e.message, 'error');
    }
  };

  const handleSaveExternalService = async () => {
    if (!detailTicket) return;
    setIsSavingExternalService(true);
    try {
      await updateAdminTicket(detailTicket.id, { externalServiceName: editExternalServiceName, externalCost: editExternalCost || null });
      setDetailTicket((prev: any) => ({ ...prev, externalServiceName: editExternalServiceName, externalCost: editExternalCost }));
      setTickets(prev => prev.map(t => t.id === detailTicket.id ? { ...t, externalServiceName: editExternalServiceName, externalCost: editExternalCost } : t));
      showAlert('Dış servis bilgileri kaydedildi.', 'success');
    } catch (e: any) {
      showAlert('Hata: ' + e.message, 'error');
    } finally {
      setIsSavingExternalService(false);
    }
  };

  const handleExternalServiceAction = async (action: 'sent' | 'returned') => {
    if (!detailTicket) return;
    try {
      const payload = action === 'sent' ? { externalSentAction: true } : { externalReturnedAction: true };
      await updateAdminTicket(detailTicket.id, payload);
      const field = action === 'sent' ? 'externalSentAt' : 'externalReturnedAt';
      const now = new Date().toISOString();
      setDetailTicket((prev: any) => ({ ...prev, [field]: now }));
      setTickets(prev => prev.map(t => t.id === detailTicket.id ? { ...t, [field]: now } : t));
      loadActivityFeed(detailTicket.id);
    } catch (e: any) {
      showAlert('Hata: ' + e.message, 'error');
    }
  };

  const handleAddPayment = async () => {
    if (!detailTicket || !paymentAmount || parseFloat(paymentAmount) <= 0) return;
    setIsAddingPayment(true);
    try {
      await createAdminPayment({
        ticketId: detailTicket.id,
        amount: parseFloat(paymentAmount),
        paymentMethod,
        notes: paymentNotes.trim() || undefined,
        isRefund: paymentIsRefund,
      });
      const pays = await fetchTicketPayments(detailTicket.id);
      setTicketPayments(pays || []);
      loadActivityFeed(detailTicket.id);
      setPaymentAmount('');
      setPaymentNotes('');
      setPaymentIsRefund(false);
    } catch (e: any) {
      showAlert('Tahsilat kaydedilirken hata: ' + e.message, 'error');
    } finally {
      setIsAddingPayment(false);
    }
  };

  const handleReversePayment = async (paymentId: number) => {
    if (!(await showConfirm('Bu ödeme kaydını iptal etmek istediğinize emin misiniz? Ters kayıt oluşturulacaktır.', true))) return;
    try {
      await reverseAdminPayment(paymentId);
      const pays = await fetchTicketPayments(detailTicket.id);
      setTicketPayments(pays || []);
    } catch (e: any) {
      showAlert('İptal hatası: ' + e.message, 'error');
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
      showAlert('İşçilik maliyeti kaydedildi.', 'success');
    } catch (e: any) {
      showAlert('İşçilik kaydedilirken hata: ' + e.message, 'error');
    } finally {
      setIsSavingLabor(false);
    }
  };
  const FILTER_TABS = [
    { key: 'all', label: 'Tümü' },
    { key: 'yeni', label: 'Servise Alındı' },
    { key: 'isleme_alindi', label: 'Arıza Tespiti' },
    { key: 'parca_bekliyor', label: 'Parça Bekl.' },
    { key: 'dis_servis', label: 'Dış Serviste' },
    { key: 'musteri_onayi_bekliyor', label: 'Onay Bekl.' },
    { key: 'onay_red', label: 'Teklif Red.' },
    { key: 'cozuldu', label: 'Çözüldü' },
    { key: 'iade', label: 'İade Bekl.' },
    { key: 'teslim_edildi', label: 'Teslim Edildi' },
    { key: 'kapatildi', label: 'Kapatıldı' },
    { key: 'iptal', label: 'İptal' },
  ];

  return (
    <div className="space-y-5 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Servis Kayıtları</h1>
          <p className="text-sm text-gray-500 mt-1">Teknik servis ve onarım süreçlerini yönetin.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { loadAnalytics(); setShowAnalyticsModal(true); }}
            className="bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 px-3 py-2 rounded-theme font-medium text-xs transition-colors flex items-center shrink-0 shadow-sm gap-1.5"
          >
            <History className="w-4 h-4 text-purple-600" /> Analitik & Ciro
          </button>
          <button
            onClick={() => setIsBarcodeScannerOpen(true)}
            className="bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 px-3 py-2 rounded-theme font-medium text-xs transition-colors flex items-center shrink-0 shadow-sm gap-1.5"
          >
            <Camera className="w-4 h-4 text-blue-600" /> Kamera Taraması
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="bg-primary hover:bg-secondary text-white px-4 py-2 rounded-theme font-medium transition-colors flex items-center shrink-0 shadow-sm"
          >
            <Plus className="w-4 h-4 mr-2" /> Yeni Kayıt
          </button>
        </div>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-2 border-t border-gray-100">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Talep Türü</label>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">Tüm Türler</option>
              {Object.entries(TYPE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

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
                const colTickets = baseFiltered.filter(t => t.status === col.key);
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
            <div className="space-y-4">
              {/* LİSTE GÖRÜNÜMÜ — UZMAN DATATABLE TASARIMI */}
              {selectedTicketIds.length > 0 && (
                <div className="bg-slate-900 text-white p-3 rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-lg">
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>{selectedTicketIds.length} servis kaydı seçildi</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={bulkStatus}
                      onChange={e => setBulkStatus(e.target.value)}
                      className="bg-slate-800 border border-slate-700 text-white text-xs rounded-lg px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="">-- Durum Güncelle --</option>
                      {Object.entries(STATUS_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                    <select
                      value={bulkTechnician}
                      onChange={e => setBulkTechnician(e.target.value)}
                      className="bg-slate-800 border border-slate-700 text-white text-xs rounded-lg px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="">-- Personel Ata --</option>
                      {staffUsers.map(u => (
                        <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                      ))}
                    </select>
                    <button
                      onClick={handleBulkUpdate}
                      disabled={isBulkUpdating || (!bulkStatus && !bulkTechnician)}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg disabled:opacity-50 transition-colors shadow-sm"
                    >
                      {isBulkUpdating ? 'Uygulanıyor...' : 'Toplu Uygula'}
                    </button>
                    <button
                      onClick={() => setSelectedTicketIds([])}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg"
                    >
                      Vazgeç
                    </button>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        <th className="py-3.5 px-3 text-center w-10">
                          <input
                            type="checkbox"
                            checked={paginatedFiltered.length > 0 && paginatedFiltered.every(t => selectedTicketIds.includes(t.id))}
                            onChange={e => {
                              if (e.target.checked) {
                                setSelectedTicketIds(paginatedFiltered.map(t => t.id));
                              } else {
                                setSelectedTicketIds([]);
                              }
                            }}
                            className="rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                          />
                        </th>
                        <th className="py-3.5 px-4 font-mono">Kayıt No</th>
                        <th className="py-3.5 px-4">Kayıt Tarihi</th>
                        <th className="py-3.5 px-4">Müşteri & İletişim</th>
                        <th className="py-3.5 px-4">Cihaz / Marka Model</th>
                        <th className="py-3.5 px-4">Şikayet / Konu</th>
                        <th className="py-3.5 px-4">Tür</th>
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
                          {/* Checkbox */}
                          <td className="py-3.5 px-3 text-center" onClick={e => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selectedTicketIds.includes(ticket.id)}
                              onChange={e => {
                                if (e.target.checked) {
                                  setSelectedTicketIds(prev => [...prev, ticket.id]);
                                } else {
                                  setSelectedTicketIds(prev => prev.filter(id => id !== ticket.id));
                                }
                              }}
                              className="rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                            />
                          </td>
                          {/* Kayıt No */}
                          <td className="py-3.5 px-4 font-mono font-bold text-gray-900 group-hover:text-primary transition-colors">
                            <div className="flex items-center gap-1">
                              <span>{ticket.ticketNumber}</span>
                              {ticket.isRma && (
                                <span className="text-[9px] font-black bg-rose-500 text-white px-1.5 py-0.2 rounded shadow-xs" title="Garanti Kapsamında Tekrar Servis">RMA</span>
                              )}
                            </div>
                          </td>
                          {/* Kayıt Tarihi */}
                          <td className="py-3.5 px-4 text-gray-500 whitespace-nowrap">
                            {formatDate(ticket.createdAt)}
                          </td>
                          {/* Müşteri & İletişim */}
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-gray-900 leading-normal">{ticket.customerName}</div>
                            <div className="text-[10px] text-gray-400 font-medium">{ticket.customerPhone || '—'}</div>
                          </td>
                          {/* Cihaz / Marka Model */}
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-gray-800 leading-normal flex items-center gap-1.5">
                              <span>{ticket.deviceBrand} {ticket.deviceModel}</span>
                              {ticket.rackLocation && (
                                <span className="text-[9px] bg-slate-100 text-slate-700 border border-slate-200 px-1.5 py-0.2 rounded font-bold">🏷️ {ticket.rackLocation}</span>
                              )}
                            </div>
                            <div className="text-[10px] text-gray-400 font-mono font-medium">{ticket.deviceType || 'Cihaz'} {ticket.deviceSerial ? `• ${ticket.deviceSerial}` : ''}</div>
                          </td>
                          {/* Şikayet / Konu */}
                          <td className="py-3.5 px-4 max-w-xs">
                            <div className="truncate font-semibold text-gray-800" title={ticket.subject}>{ticket.subject}</div>
                          </td>
                          {/* Tür */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                              {TYPE_LABELS[ticket.type] || ticket.type || '—'}
                            </span>
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
                          <td className="py-3.5 px-4 whitespace-nowrap space-y-1">
                            <span className={cn("px-2.5 py-1 rounded-full text-[10px] font-extrabold shadow-2xs border border-black/5 block text-center", STATUS_COLORS[ticket.status || 'yeni'])}>
                              {STATUS_LABELS[ticket.status || 'yeni']}
                            </span>
                            {getSlaBadge(ticket.estimatedDueAt)}
                          </td>
                          {/* İşlemler */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  const phone = ticket.customerPhone || '';
                                  const name = ticket.customerName || 'Müşterimiz';
                                  const msg = `Sayın ${name},\n${ticket.ticketNumber} numaralı servis kaydınızın durumu: ${STATUS_LABELS[ticket.status] || 'Güncellendi'}.\nCihaz: ${ticket.deviceBrand || ''} ${ticket.deviceModel || ''}\nTakip Linki: ${window.location.origin}/takip?no=${ticket.ticketNumber}\n\nKerim Bilgisayar Teknik Servis`;
                                  openWhatsApp(phone, msg);
                                }}
                                className="p-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-600 rounded-lg transition-colors flex items-center justify-center shadow-2xs cursor-pointer"
                                title="WhatsApp İle Durum Bildirimi Gönder"
                              >
                                <Send className="w-3.5 h-3.5" />
                              </button>
                              <Link
                                to={`/print/ticket/${ticket.ticketNumber}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-700 rounded-lg transition-colors flex items-center justify-center shadow-2xs"
                                title="Fiş Yazdır"
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
              {filtered.length > 0 && (
                <div className="bg-white px-4 py-3.5 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 font-medium">
                      Toplam <span className="font-bold text-gray-800">{filtered.length}</span> kayıttan <span className="font-bold text-gray-800">{startIndex + 1} - {Math.min(startIndex + rowsPerPage, filtered.length)}</span> arası gösteriliyor
                    </span>
                    <select
                      value={rowsPerPage}
                      onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                      className="text-xs font-bold border border-gray-300 rounded-lg px-2 py-1 bg-white text-gray-600 outline-none"
                    >
                      {[15, 25, 50, 100].map(n => <option key={n} value={n}>{n} / sayfa</option>)}
                    </select>
                  </div>
                  {totalPages > 1 && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1.5 text-xs font-bold border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Önceki
                      </button>
                      {getPaginationWindow(currentPage, totalPages).map((page, i) => (
                        page === '...' ? (
                          <span key={`gap-${i}`} className="w-8 h-8 flex items-center justify-center text-xs text-gray-400">…</span>
                        ) : (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page as number)}
                            className={cn(
                              "w-8 h-8 rounded-lg text-xs font-bold transition-all flex items-center justify-center",
                              currentPage === page
                                ? "bg-primary text-white shadow-sm"
                                : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                            )}
                          >
                            {page}
                          </button>
                        )
                      ))}
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1.5 text-xs font-bold border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Sonraki
                      </button>
                    </div>
                  )}
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
              <div className="p-5 border-b border-gray-200 flex items-center justify-between shrink-0 bg-slate-50 flex-wrap gap-3">
                <div className="space-y-1.5">
                  <h2 className="font-black text-gray-900 text-base leading-none">{detailTicket.subject}</h2>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-black text-blue-600 bg-blue-50 border border-blue-100 px-3 py-1 rounded-xl shadow-sm">
                      {detailTicket.ticketNumber}
                    </span>
                    <span className={cn('px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/80 border border-gray-200', PRIORITY_COLORS[detailTicket.priority || 'normal'])}>
                      ● {PRIORITY_LABELS[detailTicket.priority || 'normal']}
                    </span>
                    <span className={cn(
                      'px-2.5 py-1 rounded-full text-[10px] font-bold border flex items-center gap-1',
                      detailTicket.assignedName ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-gray-100 text-gray-400 border-gray-200'
                    )}>
                      <Users className="w-3 h-3" /> {detailTicket.assignedName || 'Atanmamış'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  {/* Ödeme Grubu */}
                  <div className="flex items-center gap-1.5 bg-blue-50/70 border border-blue-100 rounded-xl p-1">
                    <button
                      onClick={handleSendOdealPaymentLink}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold text-blue-700 hover:bg-blue-100 transition-colors"
                      title="Ödeal ile Kredi Kartı Ödeme Linki Gönder"
                    >
                      <CreditCard className="w-3.5 h-3.5" /> Ödeal Link
                    </button>
                  </div>
                  {/* Belge/Yazdırma Grubu */}
                  <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
                    <button
                      onClick={handleCreateInvoiceFromTicket}
                      disabled={isCreatingInvoice}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold text-emerald-700 hover:bg-emerald-50 transition-colors disabled:opacity-50"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      {isCreatingInvoice ? 'Oluşturuluyor...' : 'Fatura Oluştur'}
                    </button>
                    <Link
                      to={`/print/ticket-tag/${detailTicket.ticketNumber}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold text-purple-700 hover:bg-purple-50 transition-colors"
                      title="50x30mm Yapışkanlı Cihaz Takip Etiketi"
                    >
                      <Printer className="w-3.5 h-3.5" /> Cihaz Etiketi
                    </Link>
                    <Link
                      to={`/print/ticket/${detailTicket.ticketNumber}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      <Printer className="w-3.5 h-3.5" /> Servis Fişi
                    </Link>
                  </div>
                  <button
                    onClick={() => setDetailTicket(null)}
                    className="p-2 hover:bg-gray-200 rounded-xl text-gray-400 hover:text-gray-900 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                {/* Content Area: Detail & Actions */}
                <div className="w-full flex flex-col min-h-0">
                  {/* Detail Tabs */}
                  <div className="flex gap-1 border-b border-gray-200 px-4 pt-2 bg-white shrink-0 overflow-x-auto">
                    {([
                      { key: 'genel', label: 'Genel Bilgiler', icon: Users, active: 'border-blue-500 text-blue-600', chip: 'bg-blue-500' },
                      { key: 'fiziksel', label: 'Fiziksel Durum', icon: ClipboardCheck, active: 'border-amber-500 text-amber-600', chip: 'bg-amber-500' },
                      { key: 'parca', label: 'Parça & Ödeme', icon: Wallet, active: 'border-emerald-500 text-emerald-600', chip: 'bg-emerald-500' },
                      { key: 'durum', label: 'Durum & Onay', icon: CheckCircle2, active: 'border-purple-500 text-purple-600', chip: 'bg-purple-500' },
                      { key: 'ekler', label: 'Ekler & Kargo', icon: ImageIcon, active: 'border-indigo-500 text-indigo-600', chip: 'bg-indigo-500' },
                      { key: 'aktivite', label: 'Aktivite', icon: History, active: 'border-slate-500 text-slate-600', chip: 'bg-slate-500' },
                    ] as const).map(tab => (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setDetailTab(tab.key)}
                        className={cn(
                          'px-3.5 py-2.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap',
                          detailTab === tab.key
                            ? tab.active
                            : 'border-transparent text-gray-500 hover:text-gray-800'
                        )}
                      >
                        <tab.icon className="w-3.5 h-3.5" />
                        {tab.label}
                        {tab.key === 'aktivite' && activityFeed.length > 0 && (
                          <span className={cn('text-white text-[9px] px-1.5 py-0.5 rounded-full', detailTab === 'aktivite' ? tab.chip : 'bg-gray-400')}>
                            {activityFeed.length}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {detailTab === 'genel' && (
                  <>
                  {/* Servis Süreç Yolculuğu (Process Timeline Stepper) */}
                  <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-md border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Cihaz Süreç Yolculuğu</span>
                      {getSlaBadge(detailTicket.estimatedDueAt)}
                    </div>
                    <div className="grid grid-cols-6 gap-1 text-center relative pt-1">
                      {SERVICE_STEPS.map((step, idx) => {
                        const activeIndex = SERVICE_STEPS.findIndex(s => s.key === detailTicket.status);
                        const isCurrent = detailTicket.status === step.key;
                        const isPassed = activeIndex >= idx;

                        return (
                          <button
                            key={step.key}
                            type="button"
                            onClick={() => handleStatusChange(detailTicket.id, step.key)}
                            className="group flex flex-col items-center gap-1 focus:outline-none"
                            title={`Durumu ${step.label} olarak değiştir`}
                          >
                            <div className={cn(
                              'w-7 h-7 rounded-full flex items-center justify-center font-black text-xs transition-all ring-2',
                              isCurrent
                                ? 'bg-blue-500 text-white ring-blue-300 scale-110 shadow-lg shadow-blue-500/50'
                                : isPassed
                                ? 'bg-emerald-500 text-white ring-emerald-400'
                                : 'bg-slate-800 text-slate-400 ring-slate-700 group-hover:bg-slate-700'
                            )}>
                              {isPassed && !isCurrent ? '✓' : step.stepNum}
                            </div>
                            <span className={cn(
                              'text-[10px] font-semibold tracking-tight transition-colors line-clamp-1',
                              isCurrent ? 'text-blue-400 font-bold' : isPassed ? 'text-emerald-300' : 'text-slate-500 group-hover:text-slate-300'
                            )}>
                              {step.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  
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
                              setEditDeviceTypeId(detailTicket.deviceTypeId || '');
                              setEditDeviceBrand(detailTicket.deviceBrand || '');
                              setEditDeviceModel(detailTicket.deviceModel || '');
                              setEditColor(detailTicket.color || '');
                              setEditVariant(detailTicket.variant || '');
                              setEditImei(detailTicket.imei || '');
                              setEditDeviceSerial(detailTicket.deviceSerial || detailTicket.serialNumber || '');
                              setEditPatternLock(detailTicket.patternLock || '');
                              setEditPinPassword(detailTicket.pinPassword || '');
                              setEditDeviceEmail(detailTicket.deviceEmail || '');
                              setEditDeviceEmailPassword(detailTicket.deviceEmailPassword || '');
                              setEditCustomerAddress(detailTicket.address || detailTicket.customerAddress || '');
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
                        <select
                          value={editDeviceType}
                          onChange={e => {
                            const profile = deviceTypes.find(dt => dt.name === e.target.value);
                            setEditDeviceType(e.target.value);
                            setEditDeviceTypeId(profile?.id || '');
                          }}
                          className="w-full border border-gray-300 rounded-lg p-2 focus:ring-1 focus:ring-primary outline-none bg-white"
                        >
                          <option value="">Seçiniz...</option>
                          {deviceTypes.map(dt => <option key={dt.id} value={dt.name}>{dt.name}</option>)}
                        </select>
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
                      <div className="border border-gray-200 rounded-xl p-3 bg-white shadow-sm space-y-1">
                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider">Renk</label>
                        <input
                          type="text"
                          value={editColor}
                          onChange={e => setEditColor(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg p-2 focus:ring-1 focus:ring-primary outline-none"
                        />
                      </div>
                      <div className="border border-gray-200 rounded-xl p-3 bg-white shadow-sm space-y-1">
                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider">
                          {(() => { const p = deviceTypes.find(dt => dt.name === editDeviceType); return p?.variantLabel || 'Kapasite / Konfigürasyon'; })()}
                        </label>
                        <input
                          type="text"
                          value={editVariant}
                          onChange={e => setEditVariant(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg p-2 focus:ring-1 focus:ring-primary outline-none"
                          placeholder={(() => { const p = deviceTypes.find(dt => dt.name === editDeviceType); return p?.variantPlaceholder || ''; })()}
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
                              href={`https://wa.me/${formatWaPhone(detailTicket.customerPhone)}?text=${encodeURIComponent(`Merhaba Sayın Müşterimiz, ${detailTicket.ticketNumber} numaralı cihazınızın servis işlemlerini takip etmek için: https://kerimbilgisayar.com/ariza-sorgulama?no=${detailTicket.ticketNumber}`)}`}
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
                                    showAlert('WhatsApp bildirimi arka planda başarıyla sıraya alındı.', 'success');
                                  } else {
                                    showAlert('Gönderilemedi. Ayarları kontrol edin.', 'error');
                                  }
                                } catch (e: any) {
                                  showAlert('WhatsApp API hatası: ' + e.message, 'error');
                                }
                              }}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg text-[10px] font-bold transition-colors"
                            >
                              <Send className="w-3 h-3 text-blue-600" /> API ile Gönder
                            </button>
                            <button
                              onClick={() => {
                                if (!detailTicket.publicApprovalToken) {
                                  showAlert('Bu servis kaydı için onay token\'ı bulunamadı. Kaydı yeniden açıp deneyin.', 'warning');
                                  return;
                                }
                                const link = `${window.location.origin}/onay/${detailTicket.ticketNumber}?token=${detailTicket.publicApprovalToken}`;
                                navigator.clipboard.writeText(link);
                                showAlert('Dijital Müşteri Onay Linki kopyalandı:\n' + link, 'success');
                              }}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 rounded-lg text-[10px] font-bold transition-colors"
                              title="Müşteriye teklif onay linki gönderin"
                            >
                              <FileText className="w-3 h-3 text-purple-600" /> Dijital Onay Linki
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
                        <p className="text-gray-900 font-bold text-sm">{formatDate(detailTicket.createdAt)}</p>
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
                          {(() => {
                            const p = deviceTypes.find(dt => dt.name === editDeviceType);
                            if (p && !p.hasImei) return <div />;
                            const imeiOk = editImei ? isValidImei(editImei) : null;
                            return (
                              <div className="space-y-1">
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                                  IMEI
                                  {imeiOk === true && <span className="text-emerald-600 text-[10px] font-bold normal-case">✓ Doğrulandı</span>}
                                  {imeiOk === false && <span className="text-red-500 text-[10px] font-bold normal-case">✗ Geçersiz</span>}
                                </label>
                                <input
                                  type="text"
                                  value={editImei}
                                  onChange={e => setEditImei(e.target.value.replace(/\D/g, '').slice(0, 15))}
                                  className={cn(
                                    "w-full border rounded-lg p-2 focus:ring-1 focus:ring-primary outline-none font-mono text-xs",
                                    imeiOk === false ? "border-red-300" : "border-gray-300"
                                  )}
                                  placeholder="15 haneli IMEI" inputMode="numeric"
                                />
                              </div>
                            );
                          })()}
                        </div>

                        <div className="bg-amber-50/50 border border-amber-200/75 rounded-xl p-4 space-y-3">
                          <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">🔐 Cihaz Kilit & Hesap Bilgileri</p>
                          <div className="flex gap-4 flex-wrap">
                            {(() => {
                              const p = deviceTypes.find(dt => dt.name === editDeviceType);
                              if (p && !p.hasPatternLock) return null;
                              return (
                                <div className="flex flex-col items-center gap-1 shrink-0">
                                  <label className="block text-[10px] font-semibold text-gray-600 mb-1 self-start">Desen Kilidi</label>
                                  <PatternLockPicker
                                    value={editPatternLock}
                                    onChange={val => setEditPatternLock(val)}
                                    size={148}
                                  />
                                </div>
                              );
                            })()}
                            <div className="flex-1 min-w-[160px] space-y-2">
                              <div>
                                <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">
                                  {(() => { const p = deviceTypes.find(dt => dt.name === editDeviceType); return p?.lockLabel || 'PIN / Ekran Şifresi'; })()}
                                </label>
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

                  </>
                  )}

                  {detailTab === 'fiziksel' && (
                  <>
                  {/* Ekspertiz: Fiziksel Durum & Fonksiyon Testi */}
                  <div className="border border-gray-200 rounded-2xl p-4 bg-white shadow-sm space-y-4">
                    <p className="text-xs font-black text-gray-700 uppercase tracking-widest flex items-center gap-1.5 border-b border-gray-100 pb-2">
                      <ClipboardCheck className="w-4 h-4 text-indigo-500" /> Ekspertiz
                    </p>

                    <div>
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Fiziksel Durum Bulguları</p>
                      <div className="flex flex-wrap gap-1.5">
                        {PHYSICAL_CONDITIONS.map(c => (
                          <button key={c} type="button" onClick={() => togglePhysicalCondition(c)}
                            className={cn(
                              'px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors',
                              physicalConditions.has(c) ? 'bg-red-100 text-red-700 border-red-300' : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-50'
                            )}>
                            {c}
                          </button>
                        ))}
                      </div>
                    </div>

                    {(() => {
                      const profile = deviceTypes.find(dt => dt.name === detailTicket.deviceType);
                      const testList: string[] = profile?.tests || [];
                      if (testList.length === 0) return null;
                      return (
                        <div>
                          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Fonksiyon Testi ({profile?.name})</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {testList.map(testName => {
                              const result = functionTestResults[testName];
                              return (
                                <div key={testName} className="flex items-center justify-between gap-2 border border-gray-100 rounded-xl px-2.5 py-1.5 bg-gray-50/50">
                                  <span className="text-[11px] font-semibold text-gray-700 truncate">{testName}</span>
                                  <div className="flex gap-0.5 shrink-0">
                                    {([
                                      { v: 'ok', icon: CheckCircle2, cls: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
                                      { v: 'fail', icon: XCircle, cls: 'bg-red-100 text-red-600 border-red-300' },
                                      { v: 'na', icon: MinusCircle, cls: 'bg-gray-100 text-gray-500 border-gray-300' },
                                    ] as const).map(({ v, icon: Icon, cls }) => (
                                      <button key={v} type="button" onClick={() => setFunctionTestResult(testName, v)}
                                        className={cn('p-1 rounded-lg border transition-colors', result === v ? cls : 'border-transparent text-gray-300 hover:text-gray-400')}>
                                        <Icon className="w-3.5 h-3.5" />
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}

                    <button type="button" onClick={handleSaveExpertise} disabled={isSavingExpertise}
                      className="w-full bg-gray-900 hover:bg-black text-white text-xs font-bold py-2 rounded-xl transition-all disabled:opacity-50">
                      {isSavingExpertise ? 'Kaydediliyor...' : 'Ekspertizi Kaydet'}
                    </button>
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

                  {/* Hasar Haritası & Teslim İmzası (Kabul Sırasında Alınan) — sadece istenirse görüntülenir */}
                  {(detailTicket.damageMapJson || detailTicket.deliverySignature) && (
                    <div className="border border-gray-200 rounded-2xl p-4 bg-white shadow-sm">
                      <button
                        type="button"
                        onClick={() => setShowDamageDetail(v => !v)}
                        className="w-full flex items-center justify-between text-left"
                      >
                        <span className="text-xs font-black text-gray-700 uppercase tracking-widest flex items-center gap-1.5">
                          <AlertCircle className="w-4 h-4 text-amber-500" /> Hasar Haritası & Teslim İmzası
                        </span>
                        <span className="text-[11px] font-bold text-primary">
                          {showDamageDetail ? 'Gizle' : 'Görüntüle'}
                        </span>
                      </button>
                      {showDamageDetail && (
                        <div className="space-y-4 mt-4 pt-4 border-t border-gray-100">
                          {detailTicket.damageMapJson && (
                            <DamageMarkingCanvas
                              deviceType={detailTicket.deviceType}
                              value={JSON.parse(detailTicket.damageMapJson)}
                              readOnly
                            />
                          )}
                          {detailTicket.deliverySignature && (
                            <SignatureCanvas value={detailTicket.deliverySignature} label="Teslim İmzası" readOnly />
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  </>
                  )}

                  {detailTab === 'parca' && (
                  <>
                  {/* İşlem ve Maliyetler (Parça & İşçilik) */}
                  <div className="border border-gray-200 rounded-2xl p-4 bg-slate-50/30">
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider flex items-center gap-1 mb-4">
                      <DollarSign className="w-3.5 h-3.5" /> İşlem ve Maliyetler (Parça & İşçilik)
                    </p>
                    
                    {/* Parça Ekleme Alanı */}
                    <div className="bg-white p-3 rounded-xl border border-gray-200 mb-4 shadow-sm space-y-2">
                      <div className="flex gap-1.5">
                        <button type="button" onClick={() => setPartMode('stok')}
                          className={cn('px-3 py-1 rounded-lg text-[11px] font-bold border', partMode === 'stok' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-500 border-gray-300')}>
                          Stoktan Seç
                        </button>
                        <button type="button" onClick={() => setPartMode('manuel')}
                          className={cn('px-3 py-1 rounded-lg text-[11px] font-bold border', partMode === 'manuel' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-500 border-gray-300')}>
                          Manuel Kalem
                        </button>
                      </div>
                      <div className="flex flex-col md:flex-row gap-2">
                        {partMode === 'stok' ? (
                          <select
                            value={selectedStockId}
                            onChange={e => {
                              setSelectedStockId(e.target.value);
                              const item = stockItems.find(s => s.id === parseInt(e.target.value));
                              if (item) {
                                setPartUnitPrice(item.sellingPrice || item.costPrice || '0');
                                if (item.vatRate !== undefined) setPartVatRate(String(item.vatRate));
                              }
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
                        ) : (
                          <>
                            <input type="text" value={manualPartName} onChange={e => setManualPartName(e.target.value)}
                              className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:ring-1 focus:ring-primary outline-none"
                              placeholder="Kalem adı (Örn: Genel Bakım Hizmeti)" />
                            <input type="text" value={manualPartBrand} onChange={e => setManualPartBrand(e.target.value)}
                              className="w-28 border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:ring-1 focus:ring-primary outline-none"
                              placeholder="Marka" />
                          </>
                        )}
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
                        <select value={partVatRate} onChange={e => setPartVatRate(e.target.value)}
                          className="w-20 border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:ring-1 focus:ring-primary outline-none">
                          {[0, 1, 10, 20].map(r => <option key={r} value={r}>%{r} KDV</option>)}
                        </select>
                        <button
                          type="button"
                          onClick={handleAddPart}
                          disabled={isAddingPart || (partMode === 'stok' ? !selectedStockId : !manualPartName.trim())}
                          className="px-3 py-1.5 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700 disabled:opacity-50"
                        >
                          {isAddingPart ? '...' : 'Ekle'}
                        </button>
                      </div>
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
                              <th className="px-3 py-2 font-semibold text-center">KDV</th>
                              <th className="px-3 py-2 font-semibold text-right">Toplam</th>
                              <th className="px-3 py-2 text-center"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {ticketParts.map((p, i) => (
                              <tr key={i} className="hover:bg-gray-50">
                                <td className="px-3 py-2">
                                  <p className="font-bold text-gray-800">{p.name || p.stockItemName}</p>
                                  <p className="text-[10px] text-gray-400 font-mono">{p.stockItemSku || (p.source === 'manuel' ? 'Manuel' : p.brand)}</p>
                                </td>
                                <td className="px-3 py-2 text-right">₺{parseFloat(p.unitPrice).toLocaleString('tr-TR')}</td>
                                <td className="px-3 py-2 text-center font-bold">{p.quantity}</td>
                                <td className="px-3 py-2 text-center text-gray-500">%{p.vatRate ?? 20}</td>
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
                            className="w-full pl-6 pr-2 py-1.5 border border-gray-300 rounded-lg text-sm font-bold focus:ring-1 focus:ring-primary outline-none"
                            placeholder="0.00"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleSaveLabor}
                          disabled={isSavingLabor}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary hover:bg-secondary text-white text-xs font-bold rounded-lg disabled:opacity-50 shrink-0"
                        >
                          <Save className="w-3.5 h-3.5" /> {isSavingLabor ? 'Kaydediliyor...' : 'Kaydet'}
                        </button>
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

                  {/* Tedarik Talepleri */}
                  <div className="border border-gray-200 rounded-2xl p-4 bg-purple-50/20">
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-3">Tedarik Talepleri</p>
                    <div className="flex flex-col md:flex-row gap-2 mb-3">
                      <input type="text" value={supplyItemName} onChange={e => setSupplyItemName(e.target.value)}
                        className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:ring-1 focus:ring-primary outline-none"
                        placeholder="İstenen parça / kalem" />
                      <input type="text" value={supplySupplier} onChange={e => setSupplySupplier(e.target.value)}
                        className="w-32 border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:ring-1 focus:ring-primary outline-none"
                        placeholder="Tedarikçi" />
                      <input type="date" value={supplyEta} onChange={e => setSupplyEta(e.target.value)}
                        className="w-36 border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:ring-1 focus:ring-primary outline-none" />
                      <button onClick={handleAddSupplyRequest} disabled={isAddingSupplyRequest || !supplyItemName.trim()}
                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg disabled:opacity-50">
                        {isAddingSupplyRequest ? '...' : 'Talep Aç'}
                      </button>
                    </div>
                    {supplyRequests.length > 0 && (
                      <div className="space-y-1.5">
                        {supplyRequests.map((r) => (
                          <div key={r.id} className="flex items-center justify-between text-[11px] bg-white border border-gray-100 rounded-lg px-2.5 py-1.5">
                            <span className="text-gray-700">
                              <b className="font-semibold">{r.itemName}</b>
                              {r.supplier && <> · {r.supplier}</>}
                              {r.etaDate && <> · tahmini: {r.etaDate}</>}
                            </span>
                            {r.arrivedAt ? (
                              <span className="font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Geldi</span>
                            ) : (
                              <button onClick={() => handleMarkSupplyArrived(r.id)} className="font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 hover:bg-amber-200">Bekliyor · Geldi İşaretle</button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Dış Servis Sevk */}
                  {(detailTicket.status === 'dis_servis' || detailTicket.externalServiceName) && (
                    <div className="border border-gray-200 rounded-2xl p-4 bg-cyan-50/20">
                      <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-3">Dış Servis Sevk</p>
                      <div className="flex flex-col md:flex-row gap-2 mb-3">
                        <input type="text" value={editExternalServiceName} onChange={e => setEditExternalServiceName(e.target.value)}
                          className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:ring-1 focus:ring-primary outline-none"
                          placeholder="Dış servis / yetkili adı" />
                        <div className="relative w-28">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">₺</span>
                          <input type="number" value={editExternalCost} onChange={e => setEditExternalCost(e.target.value)}
                            className="w-full pl-6 pr-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-1 focus:ring-primary outline-none"
                            placeholder="Maliyet" />
                        </div>
                        <button
                          type="button"
                          onClick={handleSaveExternalService}
                          disabled={isSavingExternalService}
                          className="inline-flex items-center justify-center gap-1 px-3 py-1.5 bg-cyan-700 hover:bg-cyan-800 text-white text-xs font-bold rounded-lg disabled:opacity-50 shrink-0"
                        >
                          <Save className="w-3.5 h-3.5" /> {isSavingExternalService ? 'Kaydediliyor...' : 'Kaydet'}
                        </button>
                      </div>
                      <div className="flex gap-2 text-[11px]">
                        <button onClick={() => handleExternalServiceAction('sent')} disabled={!!detailTicket.externalSentAt}
                          className="flex-1 px-2 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-lg disabled:opacity-50">
                          {detailTicket.externalSentAt ? `Sevk Edildi: ${formatDate(detailTicket.externalSentAt)}` : 'Sevk Edildi İşaretle'}
                        </button>
                        <button onClick={() => handleExternalServiceAction('returned')} disabled={!detailTicket.externalSentAt || !!detailTicket.externalReturnedAt}
                          className="flex-1 px-2 py-1.5 border border-cyan-300 hover:bg-cyan-50 text-cyan-700 font-bold rounded-lg disabled:opacity-50">
                          {detailTicket.externalReturnedAt ? `Geri Döndü: ${formatDate(detailTicket.externalReturnedAt)}` : 'Geri Döndü İşaretle'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Tahsilat */}
                  {(() => {
                    const grandTotal = (parseFloat(detailTicket.laborCost) || 0) + ticketParts.reduce((sum, p) => sum + parseFloat(p.totalPrice), 0);
                    const collected = ticketPayments.filter(p => p.status === 'basarili').reduce((s, p) => s + parseFloat(p.amount), 0);
                    const refunded = ticketPayments.filter(p => p.status === 'iade').reduce((s, p) => s + parseFloat(p.amount), 0);
                    const balance = grandTotal - collected + refunded;
                    return (
                      <div className="border border-gray-200 rounded-2xl p-4 bg-slate-50/30">
                        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider flex items-center gap-1 mb-4">
                          <Wallet className="w-3.5 h-3.5" /> Tahsilat
                        </p>

                        <div className="grid grid-cols-3 gap-2 mb-4">
                          <div className="bg-white border border-gray-200 rounded-xl p-2.5 text-center">
                            <p className="text-[9px] text-gray-400 font-bold uppercase">Genel Toplam</p>
                            <p className="text-sm font-black text-gray-900">₺{grandTotal.toLocaleString('tr-TR')}</p>
                          </div>
                          <div className="bg-white border border-gray-200 rounded-xl p-2.5 text-center">
                            <p className="text-[9px] text-gray-400 font-bold uppercase">Tahsil Edilen</p>
                            <p className="text-sm font-black text-emerald-700">₺{collected.toLocaleString('tr-TR')}</p>
                          </div>
                          <div className={cn('rounded-xl p-2.5 text-center border', balance > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200')}>
                            <p className="text-[9px] text-gray-400 font-bold uppercase">Kalan Bakiye</p>
                            <p className={cn('text-sm font-black', balance > 0 ? 'text-red-600' : 'text-gray-900')}>₺{balance.toLocaleString('tr-TR')}</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2 mb-3">
                          <button
                            type="button"
                            onClick={handleSendOdealPaymentLink}
                            className="w-full px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all"
                          >
                            <CreditCard className="w-4 h-4 text-emerald-200" />
                            Ödeal Sanal POS ile Link Gönder (WhatsApp / SMS)
                          </button>
                        </div>

                        <div className="bg-white p-3 rounded-xl border border-gray-200 mb-3 shadow-sm flex flex-col md:flex-row gap-2 items-stretch md:items-center">
                          <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}
                            className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:ring-1 focus:ring-primary outline-none">
                            <option value="nakit">Nakit</option>
                            <option value="kredi_karti">Kredi Kartı</option>
                            <option value="havale_eft">Havale / EFT</option>
                            <option value="diger">Diğer</option>
                          </select>
                          <div className="relative w-28">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">₺</span>
                            <input type="number" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)}
                              className="w-full pl-6 pr-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-1 focus:ring-primary outline-none"
                              placeholder="Tutar" />
                          </div>
                          <input type="text" value={paymentNotes} onChange={e => setPaymentNotes(e.target.value)}
                            className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:ring-1 focus:ring-primary outline-none"
                            placeholder="Not (opsiyonel)" />
                          <label className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-600 shrink-0">
                            <input type="checkbox" checked={paymentIsRefund} onChange={e => setPaymentIsRefund(e.target.checked)} className="rounded border-gray-300" />
                            İade
                          </label>
                          <button onClick={handleAddPayment} disabled={isAddingPayment || !paymentAmount}
                            className="px-3 py-1.5 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700 disabled:opacity-50 shrink-0">
                            {isAddingPayment ? '...' : 'Kaydet'}
                          </button>
                        </div>

                        {ticketPayments.length > 0 && (
                          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-gray-50 border-b border-gray-200 text-gray-500">
                                <tr>
                                  <th className="px-3 py-2 font-semibold">Tarih</th>
                                  <th className="px-3 py-2 font-semibold">Yöntem</th>
                                  <th className="px-3 py-2 font-semibold text-right">Tutar</th>
                                  <th className="px-3 py-2 font-semibold text-center">Durum</th>
                                  <th className="px-3 py-2 text-center"></th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {ticketPayments.map((p) => (
                                  <tr key={p.id} className="hover:bg-gray-50">
                                    <td className="px-3 py-2 text-gray-500">{formatDate(p.createdAt)}</td>
                                    <td className="px-3 py-2 font-semibold text-gray-800">
                                      {p.paymentMethod === 'nakit' ? 'Nakit' : p.paymentMethod === 'kredi_karti' ? 'Kredi Kartı' : p.paymentMethod === 'havale_eft' ? 'Havale/EFT' : 'Diğer'}
                                      {p.notes && <p className="text-[10px] text-gray-400 font-normal">{p.notes}</p>}
                                    </td>
                                    <td className={cn('px-3 py-2 text-right font-black', p.status === 'iade' ? 'text-orange-600' : 'text-gray-900')}>₺{parseFloat(p.amount).toLocaleString('tr-TR')}</td>
                                    <td className="px-3 py-2 text-center">
                                      <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold',
                                        p.status === 'basarili' ? 'bg-emerald-100 text-emerald-700' :
                                        p.status === 'iade' ? 'bg-orange-100 text-orange-700' :
                                        'bg-gray-100 text-gray-500'
                                      )}>
                                        {p.status === 'basarili' ? 'Tahsilat' : p.status === 'iade' ? 'İade' : 'İptal'}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                      {p.status !== 'iptal' && !p.reversalOfId && (
                                        <button onClick={() => handleReversePayment(p.id)} className="text-red-500 hover:text-red-700 p-1" title="İptal Et">
                                          <RotateCcw className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  </>
                  )}

                  {detailTab === 'durum' && (
                  <>
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

                  {/* Onay & Fiyat Kilidi */}
                  {(detailTicket.status === 'musteri_onayi_bekliyor' || approvalRequests.length > 0) && (
                    <div className="border border-gray-200 rounded-2xl p-4 bg-indigo-50/20">
                      <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-3">Onay & Fiyat Kilidi</p>

                      {detailTicket.status === 'musteri_onayi_bekliyor' && (
                        <>
                          <button onClick={handleSendApprovalRequest} disabled={isSendingApprovalRequest}
                            className="w-full mb-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-1.5">
                            <Send size={13} />
                            {isSendingApprovalRequest ? 'Gönderiliyor...' : (approvalRequests.length > 0 ? 'Onay İsteğini Tekrar Gönder (WhatsApp + E-posta)' : 'Onay İsteği Gönder (WhatsApp + E-posta)')}
                          </button>
                          <div className="flex gap-2 mb-3">
                            <button onClick={() => handleManualApproval('approved')} disabled={isRecordingManualApproval}
                              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 rounded-xl transition-all disabled:opacity-50">
                              Manuel Onay Kaydet (Telefon/Yüz Yüze)
                            </button>
                            <button onClick={() => handleManualApproval('rejected')} disabled={isRecordingManualApproval}
                              className="flex-1 border border-red-300 hover:bg-red-50 text-red-700 text-xs font-bold py-2 rounded-xl transition-all disabled:opacity-50">
                              Manuel Red Kaydet
                            </button>
                          </div>
                        </>
                      )}

                      {approvalRequests.length > 0 && (
                        <div className="space-y-1.5">
                          {approvalRequests.map((r) => (
                            <div key={r.id} className="flex items-center justify-between text-[11px] bg-white border border-gray-100 rounded-lg px-2.5 py-1.5">
                              <span className="font-semibold text-gray-700">
                                {r.channel === 'portal' ? 'Web Portal' : 'Manuel'} · ₺{parseFloat(r.quotedAmount).toLocaleString('tr-TR')}
                              </span>
                              <span className={cn('font-bold px-2 py-0.5 rounded-full',
                                r.approvedAt ? 'bg-emerald-100 text-emerald-700' : r.rejectedAt ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'
                              )}>
                                {r.approvedAt ? 'Onaylandı' : r.rejectedAt ? 'Reddedildi' : 'Bekliyor'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

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

                  </>
                  )}

                  {detailTab === 'ekler' && (
                  <>
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
                          type="button"
                          onClick={startCamera}
                          className="text-xs text-purple-600 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Camera className="w-3.5 h-3.5" /> Canlı Kamera Çek
                        </button>
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
                  </>
                  )}

                  {detailTab === 'aktivite' && (
                  <>
                  {/* Birleşik Aktivite Akışı (Not + Durum + Sistem/Denetim) */}
                  <div className="border border-gray-200 rounded-2xl bg-white shadow-sm overflow-hidden">
                    <div className="border-b border-gray-200 shrink-0 bg-slate-50/60 px-4 py-3 flex items-center gap-1.5 flex-wrap">
                      <History className="w-4 h-4 text-slate-500 shrink-0" />
                      <p className="text-xs font-bold text-gray-700 mr-1">Aktivite Akışı</p>
                      {([
                        { key: 'all', label: 'Tümü' },
                        { key: 'note', label: 'Notlar' },
                        { key: 'status', label: 'Durum' },
                        { key: 'audit', label: 'Sistem' },
                      ] as const).map(f => (
                        <button key={f.key} type="button" onClick={() => setActivityFilter(f.key)}
                          className={cn(
                            'px-2.5 py-1 rounded-full text-[10px] font-bold transition-colors',
                            activityFilter === f.key ? 'bg-slate-800 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          )}>
                          {f.label}
                        </button>
                      ))}
                    </div>

                    <div className="max-h-[420px] overflow-y-auto p-4 space-y-3">
                    {activityFeed.filter(a => activityFilter === 'all' || a.type === activityFilter).length === 0 && (
                      <p className="text-xs text-gray-400 italic text-center py-8">Henüz kayıt bulunmuyor.</p>
                    )}
                    {activityFeed.filter(a => activityFilter === 'all' || a.type === activityFilter).map((a) => {
                      if (a.type === 'note') {
                        return (
                          <div key={a.id} className="bg-amber-50 border border-amber-100 rounded-xl p-3 shadow-sm">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs font-bold text-amber-800 flex items-center gap-1"><MessageSquare className="w-3 h-3" /> {a.actorName}</span>
                              <span className="text-[10px] text-amber-600 font-medium">{formatDate(a.createdAt)}</span>
                            </div>
                            <p className="text-xs text-gray-700 whitespace-pre-line leading-relaxed">{a.message}</p>
                          </div>
                        );
                      }
                      if (a.type === 'status') {
                        return (
                          <div key={a.id} className="bg-white border border-gray-150 rounded-xl p-3 shadow-sm">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs font-bold text-gray-800 flex items-center gap-1">
                                <Clock className="w-3 h-3 text-primary" /> {STATUS_LABELS[a.fromStatus] || 'Başlangıç'} ➜ {STATUS_LABELS[a.toStatus] || a.toStatus}
                              </span>
                              <span className="text-[10px] text-gray-400 font-medium">{formatDate(a.createdAt)}</span>
                            </div>
                            {a.notes && <p className="text-xs text-gray-600 mb-1.5 italic">"{a.notes}"</p>}
                            <div className="flex items-center gap-1 text-[10px] text-gray-400 font-semibold">
                              <span>👤 {a.actorName}</span>
                            </div>
                          </div>
                        );
                      }
                      // audit / system
                      const auditLabels: Record<string, string> = {
                        'payment.collected': 'Tahsilat kaydedildi',
                        'payment.refund': 'İade kaydedildi',
                        'ticket_part.added': 'Parça/işlem eklendi',
                        'ticket_part.removed': 'Parça/işlem kaldırıldı',
                      };
                      const d = a.details || {};
                      return (
                        <div key={a.id} className="bg-slate-100/70 border border-slate-200 rounded-xl p-3">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                              <Settings2 className="w-3 h-3" /> {auditLabels[a.action] || a.action}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">{formatDate(a.createdAt)}</span>
                          </div>
                          <p className="text-[11px] text-slate-500">
                            {d.name && <>{d.name} </>}
                            {d.amount !== undefined && <>₺{d.amount} </>}
                            {d.quantity !== undefined && <>× {d.quantity} </>}
                          </p>
                          <div className="flex items-center gap-1 text-[10px] text-slate-400 font-semibold mt-0.5">
                            <span>👤 {a.actorName}</span>
                          </div>
                        </div>
                      );
                    })}
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
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl transition-colors disabled:opacity-50 shrink-0 flex items-center justify-center"
                        title="Gönder (Ctrl+Enter)"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  </>
                  )}
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
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-[90vw] max-h-[92vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100 bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-900 tracking-tight leading-none">Yeni Servis Kaydı Oluştur</h2>
                  <p className="text-xs text-gray-500 mt-1">5 adımda müşteri, cihaz ve servis bilgilerini kaydedin</p>
                </div>
              </div>
              <button onClick={() => { setShowModal(false); setModalTab('musteri'); }} className="p-2 hover:bg-gray-200 rounded-xl">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-100 px-6 bg-white overflow-x-auto">
              {([
                { key: 'musteri', label: 'Müşteri & Cari Bilgileri', icon: Users, active: 'border-blue-500 text-blue-600' },
                { key: 'cihaz', label: 'Cihaz & Erişim Bilgileri', icon: Shield, active: 'border-cyan-500 text-cyan-600' },
                { key: 'servis', label: 'Servis Detayları', icon: Wrench, active: 'border-orange-500 text-orange-600' },
                { key: 'fiziksel', label: 'Fiziksel Durum & Onaylar', icon: ClipboardCheck, active: 'border-amber-500 text-amber-600' },
                { key: 'medya', label: 'Teslim Fotoğrafları & Ekler', icon: ImageIcon, active: 'border-indigo-500 text-indigo-600' },
              ] as const).map(tab => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setModalTab(tab.key)}
                  className={cn(
                    'px-5 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap',
                    modalTab === tab.key
                      ? tab.active
                      : 'border-transparent text-gray-500 hover:text-gray-800'
                  )}
                >
                  <tab.icon className="w-4 h-4" />
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
                      <select value={newTicket.deviceType}
                        onChange={e => {
                          const profile = deviceTypes.find(dt => dt.name === e.target.value);
                          setNewTicket({ ...newTicket, deviceType: e.target.value, deviceTypeId: profile?.id || '' });
                        }}
                        className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none bg-white">
                        <option value="">Seçiniz...</option>
                        {deviceTypes.map(dt => <option key={dt.id} value={dt.name}>{dt.name}</option>)}
                      </select>
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
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Renk</label>
                      <input type="text" value={newTicket.color}
                        onChange={e => setNewTicket({ ...newTicket, color: e.target.value })}
                        className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                        placeholder="Örn: Siyah" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">
                        {(() => { const p = deviceTypes.find(dt => dt.name === newTicket.deviceType); return p?.variantLabel || 'Kapasite / Konfigürasyon'; })()}
                      </label>
                      <input type="text" value={newTicket.variant}
                        onChange={e => setNewTicket({ ...newTicket, variant: e.target.value })}
                        className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                        placeholder={(() => { const p = deviceTypes.find(dt => dt.name === newTicket.deviceType); return p?.variantPlaceholder || ''; })()} />
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
                    {(() => {
                      const p = deviceTypes.find(dt => dt.name === newTicket.deviceType);
                      if (p && !p.hasImei) return <div />;
                      const imeiOk = newTicket.imei ? isValidImei(newTicket.imei) : null;
                      return (
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1.5">
                            IMEI
                            {imeiOk === true && <span className="text-emerald-600 text-[10px] font-bold">✓ Doğrulandı</span>}
                            {imeiOk === false && <span className="text-red-500 text-[10px] font-bold">✗ Geçersiz (Luhn)</span>}
                          </label>
                          <input type="text" value={newTicket.imei}
                            onChange={e => setNewTicket({ ...newTicket, imei: e.target.value.replace(/\D/g, '').slice(0, 15) })}
                            className={cn(
                              "w-full border rounded-xl px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none font-mono",
                              imeiOk === false ? "border-red-300" : "border-gray-300"
                            )}
                            placeholder="15 haneli IMEI numarası" inputMode="numeric" />
                        </div>
                      );
                    })()}
                  </div>

                  <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 space-y-3">
                    <p className="text-xs font-bold text-amber-700 uppercase tracking-widest flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5" />
                      Erişim Bilgileri (Teknik Personel)
                    </p>
                    <div className="flex gap-4 flex-wrap">
                      {/* Sol: Desen Kilidi - görsel */}
                      {(() => {
                        const p = deviceTypes.find(dt => dt.name === newTicket.deviceType);
                        if (p && !p.hasPatternLock) return null;
                        return (
                          <div className="flex flex-col items-center gap-1">
                            <label className="block text-xs font-semibold text-gray-600 mb-1 self-start">Desen Kilidi</label>
                            <PatternLockPicker
                              value={newTicket.patternLock}
                              onChange={val => setNewTicket({ ...newTicket, patternLock: val })}
                              size={172}
                            />
                          </div>
                        );
                      })()}
                      {/* Sağ: PIN, E-posta, Parola */}
                      <div className="flex-1 min-w-[180px] space-y-3">
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">
                            {(() => { const p = deviceTypes.find(dt => dt.name === newTicket.deviceType); return p?.lockLabel || 'PIN / Parola'; })()}
                          </label>
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
                      placeholder={(() => { const p = deviceTypes.find(dt => dt.name === newTicket.deviceType); return p?.accessoriesHint || 'Örn: Şarj aleti, kılıf, çanta, kutu...'; })()} />
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
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-sm font-bold text-gray-800">Müşteri Şikayeti / Detaylı Açıklama</label>
                      <span className="text-[11px] text-gray-400 font-medium">Hızlı Arıza Seçimi:</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-2.5">
                      {QUICK_ISSUE_PRESETS.map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            const cleanPreset = preset.replace(/^[^\s]+\s/, '');
                            const current = newTicket.description || '';
                            const updated = current ? `${current}<p>${cleanPreset}</p>` : `<p>${cleanPreset}</p>`;
                            setNewTicket({ ...newTicket, description: updated });
                          }}
                          className="px-2.5 py-1 text-[11px] font-semibold bg-gray-100 hover:bg-primary hover:text-white text-gray-700 rounded-lg transition-all border border-gray-200"
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
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
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Raf / Lokasyon No</label>
                      <input
                        type="text"
                        value={newTicket.rackLocation}
                        onChange={e => setNewTicket({ ...newTicket, rackLocation: e.target.value })}
                        placeholder="Örn: A-2, Masa-1"
                        className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Tahmini Teslim Tarihi (SLA)</label>
                      <input
                        type="date"
                        value={newTicket.estimatedDueAt}
                        onChange={e => setNewTicket({ ...newTicket, estimatedDueAt: e.target.value })}
                        className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Tahmini Ücret (₺)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={newTicket.estimatedCost}
                        onChange={e => setNewTicket({ ...newTicket, estimatedCost: e.target.value })}
                        placeholder="0.00"
                        className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ── TAB 4: FİZİKSEL DURUM & ONAYLAR ── */}
              {modalTab === 'fiziksel' && (
                <div className="bg-white border border-gray-150 rounded-2xl p-6 shadow-sm space-y-5 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2 mb-2 border-b border-gray-100 pb-3">
                    <ClipboardCheck className="w-5 h-5 text-primary" />
                    <h3 className="text-sm font-bold text-gray-800">Fiziksel Durum, İmza & Onaylar</h3>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-gray-800">Fiziksel Hasar & Çizik Haritası (İğneleme)</label>
                    <DamageMarkingCanvas
                      deviceType={newTicket.deviceType}
                      value={newTicket.damagePins}
                      onChange={pins => setNewTicket({ ...newTicket, damagePins: pins })}
                    />
                  </div>

                  <div className="border border-amber-200 bg-amber-50/40 rounded-2xl p-4 space-y-2.5">
                    <p className="text-xs font-bold text-amber-800 uppercase tracking-widest flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5" /> Müşteri Onay Beyanları
                    </p>
                    <label className="flex items-start gap-2 text-xs text-gray-700">
                      <input type="checkbox" checked={newTicket.consentKvkk} onChange={e => setNewTicket({ ...newTicket, consentKvkk: e.target.checked })} className="w-4 h-4 rounded border-gray-300 mt-0.5" />
                      <span>Müşteri, kişisel verilerinin KVKK kapsamında işlenmesine dair aydınlatma metnini okuduğunu ve onayladığını beyan etmiştir.</span>
                    </label>
                    <label className="flex items-start gap-2 text-xs text-gray-700">
                      <input type="checkbox" checked={newTicket.consentDataLoss} onChange={e => setNewTicket({ ...newTicket, consentDataLoss: e.target.checked })} className="w-4 h-4 rounded border-gray-300 mt-0.5" />
                      <span>Müşteri, onarım sürecinde veri kaybı yaşanabileceği konusunda bilgilendirilmiştir.</span>
                    </label>
                    <label className="flex items-start gap-2 text-xs text-gray-700">
                      <input type="checkbox" checked={newTicket.consentAccessInfo} onChange={e => setNewTicket({ ...newTicket, consentAccessInfo: e.target.checked })} className="w-4 h-4 rounded border-gray-300 mt-0.5" />
                      <span>Müşteri, cihaz erişim bilgilerinin (PIN/desen/hesap şifresi) yalnızca onarım amacıyla kullanılacağı konusunda bilgilendirilmiştir.</span>
                    </label>
                    <label className="flex items-start gap-2 text-xs text-gray-700">
                      <input type="checkbox" checked={newTicket.consentExpertiseFee} onChange={e => setNewTicket({ ...newTicket, consentExpertiseFee: e.target.checked })} className="w-4 h-4 rounded border-gray-300 mt-0.5" />
                      <span>Müşteri, teklifi reddetmesi halinde ekspertiz ücreti tahakkuk edebileceği konusunda bilgilendirilmiştir.</span>
                    </label>
                  </div>
                </div>
              )}

              {/* ── TAB 5: MEDYA / DOSYALAR ── */}
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
            <div className="flex flex-col sm:flex-row gap-3 px-6 py-4 border-t border-gray-100 bg-slate-50/50 justify-between items-center">
              <button type="button" onClick={() => { setShowModal(false); setModalTab('musteri'); }}
                className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-100 transition-colors text-xs">
                Vazgeç
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                {modalTab !== 'musteri' && (
                  <button
                    type="button"
                    onClick={() => {
                      if (modalTab === 'cihaz') setModalTab('musteri');
                      else if (modalTab === 'servis') setModalTab('cihaz');
                      else if (modalTab === 'fiziksel') setModalTab('servis');
                      else if (modalTab === 'medya') setModalTab('fiziksel');
                    }}
                    className="px-4 py-2.5 border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 rounded-xl font-bold text-xs transition-colors"
                  >
                    ← Önceki Adım
                  </button>
                )}

                {modalTab !== 'medya' ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (modalTab === 'musteri') setModalTab('cihaz');
                      else if (modalTab === 'cihaz') setModalTab('servis');
                      else if (modalTab === 'servis') setModalTab('fiziksel');
                      else if (modalTab === 'fiziksel') setModalTab('medya');
                    }}
                    className="px-4 py-2.5 bg-gray-900 text-white hover:bg-gray-800 rounded-xl font-bold text-xs transition-colors flex-1 sm:flex-initial"
                  >
                    Sonraki Adım →
                  </button>
                ) : null}

                <button type="button" onClick={handleCreate}
                  disabled={saving || !newTicket.customerName}
                  className="px-5 py-2.5 bg-primary hover:bg-secondary text-white rounded-xl font-bold text-xs transition-colors disabled:opacity-50 flex items-center justify-center shadow-md shadow-primary/20 flex-1 sm:flex-initial">
                  {saving ? (<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />) : null}
                  Servis Kaydını Tamamla & Fiş Bastır
                </button>
              </div>
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
            showAlert('Dosya ekleme hatası: ' + err.message, 'error');
          }
        }}
      />

      {/* Bilgi Modalı (alert() yerine) */}
      {infoModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 text-center space-y-3">
              <div className={cn(
                'w-14 h-14 rounded-full flex items-center justify-center mx-auto',
                infoModal.type === 'success' ? 'bg-emerald-50 text-emerald-600' :
                infoModal.type === 'error' ? 'bg-red-50 text-red-600' :
                infoModal.type === 'warning' ? 'bg-amber-50 text-amber-600' :
                'bg-blue-50 text-blue-600'
              )}>
                {infoModal.type === 'success' && <CheckCircle2 className="w-7 h-7" />}
                {infoModal.type === 'error' && <XCircle className="w-7 h-7" />}
                {infoModal.type === 'warning' && <AlertTriangle className="w-7 h-7" />}
                {infoModal.type === 'info' && <AlertCircle className="w-7 h-7" />}
              </div>
              <p className="text-sm text-gray-800 font-semibold whitespace-pre-line leading-relaxed">{infoModal.message}</p>
            </div>
            <div className="p-4 border-t border-gray-100 bg-gray-50/50">
              <button
                type="button"
                onClick={() => setInfoModal(null)}
                autoFocus
                className="w-full bg-primary hover:bg-secondary text-white py-2.5 rounded-xl font-bold text-sm transition-colors"
              >
                Tamam
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Onay Modalı (window.confirm() yerine) */}
      {confirmModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 text-center space-y-3">
              <div className={cn(
                'w-14 h-14 rounded-full flex items-center justify-center mx-auto',
                confirmModal.danger ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
              )}>
                <AlertTriangle className="w-7 h-7" />
              </div>
              <p className="text-sm text-gray-800 font-semibold whitespace-pre-line leading-relaxed">{confirmModal.message}</p>
            </div>
            <div className="flex gap-2 p-4 border-t border-gray-100 bg-gray-50/50">
              <button
                type="button"
                onClick={() => { confirmModal.resolve(false); setConfirmModal(null); }}
                className="flex-1 border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 py-2.5 rounded-xl font-bold text-sm transition-colors"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={() => { confirmModal.resolve(true); setConfirmModal(null); }}
                autoFocus
                className={cn(
                  'flex-1 py-2.5 rounded-xl font-bold text-sm transition-colors text-white',
                  confirmModal.danger ? 'bg-red-600 hover:bg-red-700' : 'bg-primary hover:bg-secondary'
                )}
              >
                Onayla
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

      {/* Live Camera Stream Modal */}
      {showCameraModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-5 max-w-lg w-full flex flex-col items-center gap-4 shadow-2xl">
            <div className="flex justify-between items-center w-full border-b pb-3">
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                <Camera className="w-4 h-4 text-purple-600" /> Canlı Kamera Fotoğraf Çekimi
              </h3>
              <button onClick={stopCamera} className="p-1 text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden flex items-center justify-center">
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            </div>
            <div className="flex gap-3 w-full pt-2">
              <button onClick={stopCamera} className="flex-1 py-2.5 border border-gray-300 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50">Kapat</button>
              <button onClick={capturePhoto} className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-2">
                <Camera className="w-4 h-4" /> Fotoğraf Çek & Ekle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Camera Barcode Scanner Component */}
      <CameraBarcodeScanner
        isOpen={isBarcodeScannerOpen}
        onClose={() => setIsBarcodeScannerOpen(false)}
        onScan={(scannedCode) => {
          setSearch(scannedCode);
          showAlert(`Barkod / QR tarandı: ${scannedCode}`, 'info');
        }}
      />

      {/* Analytics & Performance Modal */}
      {showAnalyticsModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <History className="w-6 h-6 text-purple-400" />
                <h2 className="text-xl font-bold tracking-tight">Servis Ciro & Performans Analitiği</h2>
              </div>
              <button onClick={() => setShowAnalyticsModal(false)} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {loadingAnalytics || !analyticsData ? (
              <div className="py-12 text-center text-slate-400">Analitik verileri yükleniyor...</div>
            ) : (
              <div className="space-y-6">
                {/* Metric Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-slate-800/80 border border-slate-700 p-4 rounded-2xl">
                    <div className="text-xs text-slate-400">Toplam Servis Kaydı</div>
                    <div className="text-2xl font-black text-white mt-1">{analyticsData.totalTickets}</div>
                  </div>
                  <div className="bg-slate-800/80 border border-slate-700 p-4 rounded-2xl">
                    <div className="text-xs text-slate-400">Ortalama Tamir Süresi</div>
                    <div className="text-2xl font-black text-blue-400 mt-1">{analyticsData.avgRepairDays} gün</div>
                  </div>
                  <div className="bg-slate-800/80 border border-slate-700 p-4 rounded-2xl">
                    <div className="text-xs text-slate-400">Toplam İşçilik Kazancı</div>
                    <div className="text-2xl font-black text-emerald-400 mt-1">₺{Number(analyticsData.totalLaborRevenue).toLocaleString('tr-TR')}</div>
                  </div>
                  <div className="bg-slate-800/80 border border-slate-700 p-4 rounded-2xl">
                    <div className="text-xs text-slate-400">Garanti / RMA Sayısı</div>
                    <div className="text-2xl font-black text-amber-400 mt-1">{analyticsData.rmaCount}</div>
                  </div>
                </div>

                {/* Markalar & Türler Kırılımı */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-800/60 border border-slate-800 p-5 rounded-2xl space-y-3">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-400">En Çok Tamir Edilen Markalar</div>
                    <div className="space-y-2">
                      {analyticsData.topBrands.map((b: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between text-sm">
                          <span className="text-slate-300 font-semibold">{b.brand}</span>
                          <span className="bg-slate-700 text-slate-200 text-xs px-2.5 py-0.5 rounded-full font-bold">{b.count} cihaz</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-slate-800/60 border border-slate-800 p-5 rounded-2xl space-y-3">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Cihaz Türü Dağılımı</div>
                    <div className="space-y-2">
                      {analyticsData.topDeviceTypes.map((t: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between text-sm">
                          <span className="text-slate-300 font-semibold">{t.type}</span>
                          <span className="bg-slate-700 text-slate-200 text-xs px-2.5 py-0.5 rounded-full font-bold">{t.count} cihaz</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
