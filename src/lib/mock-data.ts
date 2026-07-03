import { User, ServiceRecord, InventoryItem, Message } from '../types';

export const mockUsers: User[] = [
  { id: 'u1', name: 'Ahmet Yılmaz', email: 'ahmet@kerimbilgisayar.com', role: 'admin', phone: '+90 555 111 2233' },
  { id: 'u2', name: 'Mehmet Demir', email: 'mehmet@kerimbilgisayar.com', role: 'technician', phone: '+90 555 222 3344' },
  { id: 'u3', name: 'Ayşe Kaya', email: 'ayse@example.com', role: 'customer', phone: '+90 555 333 4455' },
];

export const mockServiceRecords: ServiceRecord[] = [
  {
    id: 'SRV-2023-001',
    customerId: 'u3',
    customerName: 'Ayşe Kaya',
    deviceType: 'Laptop',
    brandModel: 'Dell XPS 15',
    serialNumber: 'DX15-9988-ABC',
    issueDescription: 'Ekran titriyor ve bazen görüntü tamamen gidiyor.',
    status: 'diagnosing',
    technicianId: 'u2',
    createdAt: '2023-10-24T10:00:00Z',
    updatedAt: '2023-10-25T14:30:00Z',
  },
  {
    id: 'SRV-2023-002',
    customerId: 'u4',
    customerName: 'Caner Uysal',
    deviceType: 'Masaüstü PC',
    brandModel: 'Toplama Kasa',
    serialNumber: 'VAR-MAC-112',
    issueDescription: 'Oyun oynarken aniden kapanıyor.',
    status: 'repairing',
    technicianId: 'u2',
    createdAt: '2023-10-26T09:15:00Z',
    updatedAt: '2023-10-26T11:20:00Z',
    estimatedCost: 1500,
  },
  {
    id: 'SRV-2023-003',
    customerId: 'u5',
    customerName: 'Selin Doğan',
    deviceType: 'MacBook',
    brandModel: 'MacBook Pro M1',
    serialNumber: 'C02CG12345',
    issueDescription: 'Klavye tuşları basmıyor (A, S, D).',
    status: 'waiting_parts',
    createdAt: '2023-10-27T16:45:00Z',
    updatedAt: '2023-10-27T17:00:00Z',
    estimatedCost: 4500,
  },
  {
    id: 'SRV-2023-004',
    customerId: 'u6',
    customerName: 'Burak Tekin',
    deviceType: 'Laptop',
    brandModel: 'Lenovo Thinkpad T14',
    serialNumber: 'PF123ABC',
    issueDescription: 'Batarya şarj olmuyor.',
    status: 'ready',
    createdAt: '2023-10-20T10:00:00Z',
    updatedAt: '2023-10-22T14:30:00Z',
    estimatedCost: 1200,
  }
];

export const mockInventory: InventoryItem[] = [
  { id: 'INV-001', name: '500GB NVMe SSD', category: 'Depolama', sku: 'SKU-SSD-500', stock: 15, minStock: 5, price: 950 },
  { id: 'INV-002', name: 'DDR4 16GB 3200MHz RAM', category: 'Bellek', sku: 'SKU-RAM-16', stock: 8, minStock: 10, price: 850 },
  { id: 'INV-003', name: '15.6" IPS Panel Ekran', category: 'Ekran', sku: 'SKU-SCR-156', stock: 2, minStock: 3, price: 2100 },
  { id: 'INV-004', name: 'Termal Macun (4g)', category: 'Sarf Malzeme', sku: 'SKU-THM-04', stock: 45, minStock: 20, price: 120 },
];

export const mockMessages: Message[] = [
  { id: 'm1', senderId: 'u1', channelId: 'tech-team', content: 'Arkadaşlar, yarın ofis bakımımız var unutmayalım.', timestamp: '2023-10-28T09:00:00Z' },
  { id: 'm2', senderId: 'u2', channelId: 'tech-team', content: 'Tamamdır Ahmet Bey. Ben sabah SRV-2023-002 kasasını bitireceğim.', timestamp: '2023-10-28T09:05:00Z' },
];

export const dashboardStats = {
  monthlyRevenue: [
    { name: 'Oca', total: 40000 },
    { name: 'Şub', total: 30000 },
    { name: 'Mar', total: 20000 },
    { name: 'Nis', total: 27800 },
    { name: 'May', total: 18900 },
    { name: 'Haz', total: 23900 },
    { name: 'Tem', total: 34900 },
    { name: 'Ağu', total: 41000 },
    { name: 'Eyl', total: 38000 },
    { name: 'Eki', total: 45000 },
  ],
  statusDistribution: [
    { name: 'Bekleyen', value: 4 },
    { name: 'Tanı/Arıza Tespiti', value: 8 },
    { name: 'Parça Bekleyen', value: 3 },
    { name: 'Onarımda', value: 12 },
    { name: 'Hazır', value: 5 },
  ]
};
