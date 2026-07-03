export type Role = 'admin' | 'technician' | 'customer';

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar?: string;
  phone?: string;
};

export type DeviceStatus = 'pending' | 'diagnosing' | 'waiting_parts' | 'repairing' | 'ready' | 'delivered';

export type ServiceRecord = {
  id: string;
  customerId: string;
  customerName: string;
  deviceType: string;
  brandModel: string;
  serialNumber: string;
  issueDescription: string;
  status: DeviceStatus;
  technicianId?: string;
  createdAt: string;
  updatedAt: string;
  estimatedCost?: number;
};

export type InventoryItem = {
  id: string;
  name: string;
  category: string;
  sku: string;
  stock: number;
  minStock: number;
  price: number;
};

export type Message = {
  id: string;
  senderId: string;
  receiverId?: string;
  channelId?: string;
  content: string;
  timestamp: string;
};
