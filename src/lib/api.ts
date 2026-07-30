// Public API helpers

// API sağlık kontrolü — uygulama açılışında çağrılır
export async function checkApiHealth(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const res = await fetch('/api/health', { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) return false;
    const data = await res.json();
    return data?.status === 'ok';
  } catch {
    return false;
  }
}

async function handleResponse(res: Response) {
  if (res.status === 401) {
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      window.location.href = '/admin/login';
    }
  }
  if (!res.ok) {
    const text = await res.text();
    console.error('API Error:', res.status, text);
    throw new Error('API Error: ' + text);
  }
  // JSON olmayan yanıtları güvenli işle
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return res.json();
  }
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('API yanıtı geçerli JSON değil');
  }
}

export async function fetchSettings() {
  const res = await fetch('/api/public/settings');
  return handleResponse(res);
}

export async function fetchTestimonials() {
  const res = await fetch('/api/public/testimonials');
  return handleResponse(res);
}

export async function fetchServices() {
  const res = await fetch('/api/services');
  return handleResponse(res);
}

export async function fetchService(id: string) {
  const res = await fetch(`/api/services/${id}`);
  return handleResponse(res);
}

export async function fetchServiceCategories() {
  const res = await fetch('/api/public/service-categories');
  return handleResponse(res);
}

export async function fetchBlogPosts() {
  const res = await fetch('/api/blog');
  return handleResponse(res);
}

export async function fetchBlogPost(slug: string) {
  const res = await fetch(`/api/blog/${slug}`);
  return handleResponse(res);
}

export async function fetchCampaigns() {
  const res = await fetch('/api/campaigns');
  return handleResponse(res);
}

export async function fetchPage(slug: string) {
  const res = await fetch(`/api/pages/${slug}`);
  return handleResponse(res);
}

export async function fetchFAQ() {
  const res = await fetch('/api/faq');
  return handleResponse(res);
}

export async function submitContactForm(data: any) {
  const res = await fetch('/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return handleResponse(res);
}

export async function fetchTicket(ticketNumber: string) {
  const res = await fetch(`/api/tickets/${ticketNumber}`);
  return handleResponse(res);
}

export async function fetchDeviceHistory(identifier: string) {
  const res = await fetch(`/api/public/device-history/${identifier}`);
  return handleResponse(res);
}

export async function submitAppointment(data: any) {
  const res = await fetch('/api/appointments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return handleResponse(res);
}

// ===================== ADMIN API =====================

function getAdminHeaders() {
  const token = localStorage.getItem('admin_token');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
  };
}

export async function adminRequest(url: string, options: RequestInit = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { ...getAdminHeaders(), ...(options.headers || {}) },
  });
  return handleResponse(res);
}

export async function adminLogin(email: string, password: string) {
  const res = await fetch('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return handleResponse(res);
}

export async function fetchAdminProfile() {
  return adminRequest('/api/admin/profile');
}

export async function updateAdminProfile(data: any) {
  return adminRequest('/api/admin/profile', { method: 'PATCH', body: JSON.stringify(data) });
}

export async function fetchAdminStats() {
  return adminRequest('/api/admin/stats');
}

// Tickets
export async function fetchAdminTickets(status?: string) {
  const q = status && status !== 'all' ? `?status=${status}` : '';
  return adminRequest(`/api/admin/tickets${q}`);
}

export async function createAdminTicket(data: any) {
  return adminRequest('/api/admin/tickets', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateAdminTicket(id: number, data: any) {
  return adminRequest(`/api/admin/tickets/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export async function deleteAdminTicket(id: number) {
  return adminRequest(`/api/admin/tickets/${id}`, { method: 'DELETE' });
}

export async function fetchTicketParts(ticketId: number) {
  return adminRequest(`/api/admin/tickets/${ticketId}/parts`);
}

export async function addTicketPart(ticketId: number, data: { stockItemId?: number; name?: string; brand?: string; quantity: number; unitPrice: number; vatRate?: number }) {
  return adminRequest(`/api/admin/tickets/${ticketId}/parts`, { method: 'POST', body: JSON.stringify(data) });
}

export async function deleteTicketPart(partId: number) {
  return adminRequest(`/api/admin/tickets/parts/${partId}`, { method: 'DELETE' });
}

// Cihaz Profilleri
export async function fetchAdminDeviceTypes() {
  return adminRequest('/api/admin/device-types');
}

// Ekspertiz (fiziksel durum + fonksiyon testi)
export async function fetchTicketExpertise(ticketId: number) {
  return adminRequest(`/api/admin/tickets/${ticketId}/expertise`);
}

export async function saveTicketExpertise(ticketId: number, data: { physicalConditions: string[]; functionTests: Record<string, string> }) {
  return adminRequest(`/api/admin/tickets/${ticketId}/expertise`, { method: 'POST', body: JSON.stringify(data) });
}

// Onay istekleri (portal + manuel)
export async function fetchTicketApprovalRequests(ticketId: number) {
  return adminRequest(`/api/admin/tickets/${ticketId}/approval-requests`);
}

export async function recordManualApproval(ticketId: number, decision: 'approved' | 'rejected') {
  return adminRequest(`/api/admin/tickets/${ticketId}/manual-approval`, { method: 'POST', body: JSON.stringify({ decision }) });
}

export async function sendApprovalRequest(ticketId: number) {
  return adminRequest(`/api/admin/tickets/${ticketId}/send-approval-request`, { method: 'POST' });
}

// Tedarik talebi
export async function fetchTicketSupplyRequests(ticketId: number) {
  return adminRequest(`/api/admin/tickets/${ticketId}/supply-requests`);
}

export async function createSupplyRequest(ticketId: number, data: { itemName: string; supplier?: string; etaDate?: string }) {
  return adminRequest(`/api/admin/tickets/${ticketId}/supply-requests`, { method: 'POST', body: JSON.stringify(data) });
}

export async function markSupplyRequestArrived(requestId: number) {
  return adminRequest(`/api/admin/supply-requests/${requestId}/arrived`, { method: 'POST' });
}

// Stock
export async function fetchAdminStock() {
  return adminRequest('/api/admin/stock');
}

export async function createStockItem(data: any) {
  return adminRequest('/api/admin/stock', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateStockItem(id: number, data: any) {
  return adminRequest(`/api/admin/stock/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

// Settings
export async function fetchAdminSettings() {
  return adminRequest('/api/admin/settings');
}

export async function saveAdminSettings(data: Record<string, string>) {
  return adminRequest('/api/admin/settings', { method: 'PUT', body: JSON.stringify(data) });
}

// Users
export async function fetchAdminUsers() {
  return adminRequest('/api/admin/users');
}

export async function createAdminUser(data: any) {
  return adminRequest('/api/admin/users', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateAdminUser(id: number, data: any) {
  return adminRequest(`/api/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

// Customers
export async function fetchAdminCustomers() {
  return adminRequest('/api/admin/customers');
}

export async function createAdminCustomer(data: any) {
  return adminRequest('/api/admin/customers', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateAdminCustomer(id: number, data: any) {
  return adminRequest(`/api/admin/customers/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export async function migrateCustomerUsers() {
  return adminRequest('/api/admin/customers/migrate-from-users', { method: 'POST' });
}

export async function assignCustomerSubscription(id: number, data: any) {
  return adminRequest(`/api/admin/customers/${id}/subscription`, { method: 'POST', body: JSON.stringify(data) });
}

export async function fetchCustomerLedger(id: number) {
  return adminRequest(`/api/admin/customers/${id}/ledger`);
}

export async function addCustomerLedgerEntry(id: number, data: { type: 'borc' | 'alacak'; amount: number | string; description?: string }) {
  return adminRequest(`/api/admin/customers/${id}/ledger`, { method: 'POST', body: JSON.stringify(data) });
}

export async function deleteCustomerLedgerEntry(customerId: number, entryId: number) {
  return adminRequest(`/api/admin/customers/${customerId}/ledger/${entryId}`, { method: 'DELETE' });
}

export async function deleteAdminCustomer(id: number) {
  return adminRequest(`/api/admin/customers/${id}`, { method: 'DELETE' });
}

export async function fetchSubscriptionPlans() {
  return adminRequest('/api/admin/subscription-plans');
}

export async function createSubscriptionPlan(data: any) {
  return adminRequest('/api/admin/subscription-plans', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateSubscriptionPlan(id: number, data: any) {
  return adminRequest(`/api/admin/subscription-plans/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

// Taxonomies
export async function fetchAdminTerms() {
  return adminRequest('/api/admin/terms');
}

export async function createAdminTerm(data: any) {
  return adminRequest('/api/admin/terms', { method: 'POST', body: JSON.stringify(data) });
}

export async function deleteAdminTerm(id: number) {
  return adminRequest(`/api/admin/terms/${id}`, { method: 'DELETE' });
}


// Testimonials
export async function fetchAdminTestimonials() {
  return adminRequest('/api/admin/testimonials');
}

export async function createAdminTestimonial(data: any) {
  return adminRequest('/api/admin/testimonials', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateAdminTestimonial(id: number, data: any) {
  return adminRequest(`/api/admin/testimonials/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export async function deleteAdminTestimonial(id: number) {
  return adminRequest(`/api/admin/testimonials/${id}`, { method: 'DELETE' });
}

// Blog
export async function fetchAdminBlog() {
  return adminRequest('/api/admin/blog');
}

export async function createBlogPost(data: any) {
  return adminRequest('/api/admin/blog', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateBlogPost(id: number, data: any) {
  return adminRequest(`/api/admin/blog/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function deleteBlogPost(id: number) {
  return adminRequest(`/api/admin/blog/${id}`, { method: 'DELETE' });
}

// Campaigns
export async function fetchAdminCampaigns() {
  return adminRequest('/api/admin/campaigns');
}

export async function createCampaign(data: any) {
  return adminRequest('/api/admin/campaigns', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateCampaign(id: number, data: any) {
  return adminRequest(`/api/admin/campaigns/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export async function importCampaignRemoteImages() {
  return adminRequest('/api/admin/campaigns/import-remote-images', { method: 'POST' });
}

export async function deleteCampaign(id: number) {
  return adminRequest(`/api/admin/campaigns/${id}`, { method: 'DELETE' });
}

// FAQ
export async function fetchAdminFAQ() {
  return adminRequest('/api/admin/faq');
}

export async function createFAQCategory(data: any) {
  return adminRequest('/api/admin/faq/categories', { method: 'POST', body: JSON.stringify(data) });
}

export async function createFAQQuestion(data: any) {
  return adminRequest('/api/admin/faq/questions', { method: 'POST', body: JSON.stringify(data) });
}

export async function deleteFAQQuestion(id: number) {
  return adminRequest(`/api/admin/faq/questions/${id}`, { method: 'DELETE' });
}

// Leads
export async function fetchAdminLeads() {
  return adminRequest('/api/admin/leads');
}

export async function updateLeadStatus(id: number, status: string) {
  return adminRequest(`/api/admin/leads/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
}

// Messages
export async function fetchAdminMessages() {
  return adminRequest('/api/admin/messages');
}

// ============================================================
// CMS ARCHITECTURE: PAGES, MEDIA, MENUS
// ============================================================

export async function fetchAdminPages() {
  return adminRequest('/api/admin/pages');
}

export async function createAdminPage(data: any) {
  return adminRequest('/api/admin/pages', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateAdminPage(id: number, data: any) {
  return adminRequest(`/api/admin/pages/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export async function deleteAdminPage(id: number) {
  return adminRequest(`/api/admin/pages/${id}`, { method: 'DELETE' });
}

export async function fetchAdminMedia(folderId?: number | null) {
  const q = folderId !== undefined ? `?folderId=${folderId === null ? 'null' : folderId}` : '';
  return adminRequest(`/api/admin/media${q}`);
}

export async function uploadAdminMedia(file: File, folderId?: number | null) {
  const token = localStorage.getItem('admin_token');
  const formData = new FormData();
  formData.append('file', file);
  if (folderId) {
    formData.append('folderId', folderId.toString());
  }
  
  const res = await fetch('/api/admin/media/upload', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData,
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.error || 'API Request failed');
  }
  return res.json();
}

export async function importRemoteMedia(url: string) {
  return adminRequest('/api/admin/media/import-remote', { method: 'POST', body: JSON.stringify({ url }) });
}

// Media Folders
export async function fetchMediaFolders() {
  return adminRequest('/api/admin/media/folders');
}

export async function createMediaFolder(data: { name: string; parentId?: number }) {
  return adminRequest('/api/admin/media/folders', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateMediaFolder(id: number, data: { name: string; parentId?: number }) {
  return adminRequest(`/api/admin/media/folders/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function deleteMediaFolder(id: number) {
  return adminRequest(`/api/admin/media/folders/${id}`, { method: 'DELETE' });
}

export async function fetchAdminMenus() {
  return adminRequest('/api/admin/menus');
}

export async function createAdminMenu(data: any) {
  return adminRequest('/api/admin/menus', { method: 'POST', body: JSON.stringify(data) });
}

export async function createAdminMenuItem(menuId: number, data: any) {
  return adminRequest(`/api/admin/menus/${menuId}/items`, { method: 'POST', body: JSON.stringify(data) });
}

export async function deleteAdminMenuItem(itemId: number) {
  return adminRequest(`/api/admin/menus/items/${itemId}`, { method: 'DELETE' });
}

export async function reorderAdminMenuItems(items: { id: number; displayOrder: number }[]) {
  return adminRequest('/api/admin/menus/items/reorder', { method: 'PUT', body: JSON.stringify({ items }) });
}

// ============================================================
// PUBLIC CMS APIs
// ============================================================

export async function fetchPublicMenus() {
  const res = await fetch('/api/public/menus');
  if (!res.ok) throw new Error('Menüler yüklenemedi');
  return res.json();
}

export async function fetchPublicPage(slug: string) {
  const res = await fetch(`/api/public/pages/${slug}`);
  if (!res.ok) throw new Error('Sayfa bulunamadı');
  return res.json();
}

export async function fetchPublicPageBlocks(slug: string) {
  const res = await fetch(`/api/public/pages/${slug}/blocks`);
  if (!res.ok) throw new Error('Sayfa blokları yüklenemedi');
  return res.json();
}

// ============================================================
// STOCK — DELETE
// ============================================================
export async function deleteStockItem(id: number) {
  return adminRequest(`/api/admin/stock/${id}`, { method: 'DELETE' });
}

// ============================================================
// INVENTORY CATEGORIES
// ============================================================
export async function fetchInventoryCategories() {
  return adminRequest('/api/admin/inventory-categories');
}

export async function createInventoryCategory(data: { name: string; description?: string; parentId?: number }) {
  return adminRequest('/api/admin/inventory-categories', { method: 'POST', body: JSON.stringify(data) });
}

export const deleteInventoryCategory = async (id: number) => {
  return adminRequest(`/api/admin/inventory-categories/${id}`, { method: 'DELETE' });
};

export const updateInventoryCategory = async (id: number, data: any) => {
  return adminRequest(`/api/admin/inventory-categories/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
};

// ============================================================
// SAYIM (STOCKTAKE)
// ============================================================
export async function fetchCountSessions(status?: string) {
  const q = status ? `?status=${status}` : '';
  return adminRequest(`/api/admin/stock/count-sessions${q}`);
}

export async function createCountSession(data: { categoryId?: number | null }) {
  return adminRequest('/api/admin/stock/count-sessions', { method: 'POST', body: JSON.stringify(data) });
}

export async function fetchCountSession(id: number) {
  return adminRequest(`/api/admin/stock/count-sessions/${id}`);
}

export async function scanCountItem(sessionId: number, code: string) {
  return adminRequest(`/api/admin/stock/count-sessions/${sessionId}/scan`, { method: 'POST', body: JSON.stringify({ code }) });
}

export async function updateCountLine(sessionId: number, lineId: number, countedQty: number) {
  return adminRequest(`/api/admin/stock/count-sessions/${sessionId}/lines/${lineId}`, { method: 'PATCH', body: JSON.stringify({ countedQty }) });
}

export async function finalizeCountSession(sessionId: number, notes?: string) {
  return adminRequest(`/api/admin/stock/count-sessions/${sessionId}/finalize`, { method: 'POST', body: JSON.stringify({ notes }) });
}

export async function cancelCountSession(sessionId: number) {
  return adminRequest(`/api/admin/stock/count-sessions/${sessionId}/cancel`, { method: 'POST' });
}

// ============================================================
// E-TİCARET KANAL EŞLEME
// ============================================================
export async function fetchChannelMappings(stockItemId: number) {
  return adminRequest(`/api/admin/stock/${stockItemId}/channel-mappings`);
}

export async function createChannelMapping(stockItemId: number, data: { channel: string; externalProductId?: string; externalSku?: string; notes?: string }) {
  return adminRequest(`/api/admin/stock/${stockItemId}/channel-mappings`, { method: 'POST', body: JSON.stringify(data) });
}

export async function updateChannelMapping(id: number, data: any) {
  return adminRequest(`/api/admin/stock/channel-mappings/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export async function deleteChannelMapping(id: number) {
  return adminRequest(`/api/admin/stock/channel-mappings/${id}`, { method: 'DELETE' });
}



// ============================================================
// TICKET MESSAGES (Dahili Notlar)
// ============================================================
export async function fetchTicketMessages(ticketId: number) {
  return adminRequest(`/api/admin/ticket-messages/${ticketId}`);
}

export async function createTicketMessage(data: { ticketId: number; message: string; isInternal?: boolean }) {
  return adminRequest('/api/admin/ticket-messages', { method: 'POST', body: JSON.stringify(data) });
}

export async function fetchTicketStatusLogs(ticketId: number) {
  return adminRequest(`/api/admin/tickets/${ticketId}/status-logs`);
}

export async function fetchTicketActivity(ticketId: number) {
  return adminRequest(`/api/admin/tickets/${ticketId}/activity`);
}

// ============================================================
// LEADS — CONVERT TO TICKET
// ============================================================
export async function convertLeadToTicket(id: number) {
  return adminRequest(`/api/admin/leads/${id}/convert`, { method: 'POST' });
}

// ============================================================
// TICKET ATTACHMENTS (Görseller & Ekler)
// ============================================================
export async function fetchTicketAttachments(ticketId: number) {
  return adminRequest(`/api/admin/tickets/${ticketId}/attachments`);
}

export async function createTicketAttachment(ticketId: number, data: { fileName: string; fileUrl: string; fileType?: string; fileSize?: number }) {
  return adminRequest(`/api/admin/tickets/${ticketId}/attachments`, { method: 'POST', body: JSON.stringify(data) });
}

export async function deleteTicketAttachment(id: number) {
  return adminRequest(`/api/admin/tickets/attachments/${id}`, { method: 'DELETE' });
}

export async function triggerTicketWhatsApp(ticketId: number) {
  return adminRequest(`/api/admin/tickets/${ticketId}/whatsapp-trigger`, { method: 'POST' });
}

export async function fetchAdminNotifications() {
  return adminRequest('/api/admin/notifications');
}

export async function markNotificationsAsRead() {
  return adminRequest('/api/admin/notifications/mark-read', { method: 'POST' });
}

// ============================================================
// SHIPMENTS (Kargo Yönetimi)
// ============================================================
export async function fetchAdminShipments() {
  return adminRequest('/api/admin/shipments');
}

export async function createAdminShipment(data: any) {
  return adminRequest('/api/admin/shipments', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateAdminShipment(id: number, data: any) {
  return adminRequest(`/api/admin/shipments/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export async function deleteAdminShipment(id: number) {
  return adminRequest(`/api/admin/shipments/${id}`, { method: 'DELETE' });
}

// ============================================================
// EXPENSES & OCR (Masraflar & Fiş Tarama)
// ============================================================
export async function fetchAdminExpenses() {
  return adminRequest('/api/admin/expenses');
}

export async function createAdminExpense(data: any) {
  return adminRequest('/api/admin/expenses', { method: 'POST', body: JSON.stringify(data) });
}

export async function deleteAdminExpense(id: number) {
  return adminRequest(`/api/admin/expenses/${id}`, { method: 'DELETE' });
}

export async function analyzeReceiptOcr(imageUrl: string) {
  return adminRequest('/api/admin/expenses/ocr', { method: 'POST', body: JSON.stringify({ imageUrl }) });
}

// ============================================================
// SALES & POS SYSTEM
// ============================================================
export async function fetchAdminSales() {
  return adminRequest('/api/admin/sales');
}

export async function createAdminSale(data: any) {
  return adminRequest('/api/admin/sales', { method: 'POST', body: JSON.stringify(data) });
}

export async function fetchAdminSaleDetails(id: number) {
  return adminRequest(`/api/admin/sales/${id}`);
}

// ============================================================
// CUSTOMERS SEARCH
// ============================================================
export async function searchAdminCustomers(query: string) {
  return adminRequest(`/api/admin/customers/search?query=${encodeURIComponent(query)}`);
}

// ============================================================
// DEALERS (BAYİ YÖNETİMİ)
// ============================================================
export async function fetchAdminDealers() {
  return adminRequest('/api/admin/dealers');
}

export async function createAdminDealer(data: any) {
  return adminRequest('/api/admin/dealers', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateAdminDealer(id: number, data: any) {
  return adminRequest(`/api/admin/dealers/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export async function deleteAdminDealer(id: number) {
  return adminRequest(`/api/admin/dealers/${id}`, { method: 'DELETE' });
}

export async function fetchDealerUsers(dealerId: number) {
  return adminRequest(`/api/admin/dealers/${dealerId}/users`);
}

export async function createDealerUser(dealerId: number, data: any) {
  return adminRequest(`/api/admin/dealers/${dealerId}/users`, { method: 'POST', body: JSON.stringify(data) });
}

// ============================================================
// AUDIT LOGS (Denetim Logları)
// ============================================================
export async function fetchAuditLogs(params?: { page?: number; limit?: number; userId?: number; action?: string; entityType?: string; startDate?: string; endDate?: string }) {
  const q = new URLSearchParams();
  if (params?.page) q.set('page', String(params.page));
  if (params?.limit) q.set('limit', String(params.limit));
  if (params?.userId) q.set('userId', String(params.userId));
  if (params?.action) q.set('action', params.action);
  if (params?.entityType) q.set('entityType', params.entityType);
  if (params?.startDate) q.set('startDate', params.startDate);
  if (params?.endDate) q.set('endDate', params.endDate);
  const qs = q.toString();
  return adminRequest(`/api/admin/audit-logs${qs ? '?' + qs : ''}`);
}

// ============================================================
// INVOICES (Fatura Yönetimi)
// ============================================================
export async function fetchAdminInvoices() {
  return adminRequest('/api/admin/invoices');
}

export async function fetchAdminInvoice(id: number) {
  return adminRequest(`/api/admin/invoices/${id}`);
}

export async function createAdminInvoice(data: any) {
  return adminRequest('/api/admin/invoices', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateAdminInvoice(id: number, data: any) {
  return adminRequest(`/api/admin/invoices/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export async function deleteAdminInvoice(id: number) {
  return adminRequest(`/api/admin/invoices/${id}`, { method: 'DELETE' });
}

export async function createInvoiceFromTicket(ticketId: number) {
  return adminRequest(`/api/admin/invoices/from-ticket/${ticketId}`, { method: 'POST' });
}

// ============================================================
// CONTRACTS (Bakım Sözleşmeleri)
// ============================================================
export async function fetchAdminContracts() {
  return adminRequest('/api/admin/contracts');
}

export async function createAdminContract(data: any) {
  return adminRequest('/api/admin/contracts', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateAdminContract(id: number, data: any) {
  return adminRequest(`/api/admin/contracts/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export async function deleteAdminContract(id: number) {
  return adminRequest(`/api/admin/contracts/${id}`, { method: 'DELETE' });
}

// ============================================================
// REPORTS (Raporlar)
// ============================================================
export async function fetchAdminReportSummary(params?: { startDate?: string; endDate?: string }) {
  const q = new URLSearchParams();
  if (params?.startDate) q.set('startDate', params.startDate);
  if (params?.endDate) q.set('endDate', params.endDate);
  const qs = q.toString();
  return adminRequest(`/api/admin/reports/summary${qs ? '?' + qs : ''}`);
}

// Tahsilat (manuel ödeme kaydı)
export async function fetchTicketPayments(ticketId: number) {
  return adminRequest(`/api/admin/payments?ticketId=${ticketId}`);
}

export async function createAdminPayment(data: { ticketId: number; amount: number | string; paymentMethod: string; notes?: string; isRefund?: boolean }) {
  return adminRequest('/api/admin/payments', { method: 'POST', body: JSON.stringify(data) });
}

export async function reverseAdminPayment(paymentId: number) {
  return adminRequest(`/api/admin/payments/${paymentId}/reverse`, { method: 'POST' });
}

// ============================================================
// ÖDEAL PAYMENT API HELPERS
// ============================================================
export async function createOdealPaymentLink(data: { amount: number | string; title?: string; description?: string; customerPhone?: string; customerEmail?: string; ticketId?: number; invoiceId?: number }) {
  return adminRequest('/api/payments/odeal/init-link', { method: 'POST', body: JSON.stringify(data) });
}

export async function initOdeal3DSecurePayment(data: any) {
  return adminRequest('/api/payments/odeal/init-3d', { method: 'POST', body: JSON.stringify(data) });
}
