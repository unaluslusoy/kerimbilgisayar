import {
  mysqlTable,
  varchar,
  text,
  timestamp,
  int,
  mysqlEnum,
  decimal,
  boolean,
  date,
  json,
  index,
  uniqueIndex,
} from 'drizzle-orm/mysql-core';

// --- SAAS MULTI-TENANCY & BILLING ---

export const tenants = mysqlTable('tenants', {
  id: int('id').autoincrement().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  customDomain: varchar('custom_domain', { length: 255 }).unique(),
  logoUrl: varchar('logo_url', { length: 500 }),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const plans = mysqlTable('plans', {
  id: int('id').autoincrement().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  description: text('description'),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  discountRate: decimal('discount_rate', { precision: 5, scale: 2 }).default('0.00'),
  billingCycle: mysqlEnum('billing_cycle', ['monthly', 'yearly']).notNull(),
  features: json('features'), 
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

export const subscriptions = mysqlTable('subscriptions', {
  id: int('id').autoincrement().primaryKey(),
  tenantId: int('tenant_id').references(() => tenants.id), 
  planId: int('plan_id').references(() => plans.id),
  status: mysqlEnum('status', ['trial', 'active', 'past_due', 'canceled', 'unpaid']).default('trial'),
  trialEndsAt: timestamp('trial_ends_at'),
  currentPeriodStart: timestamp('current_period_start'),
  currentPeriodEnd: timestamp('current_period_end'),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false),
  stripeCustomerId: varchar('stripe_customer_id', { length: 255 }),
  stripeSubscriptionId: varchar('stripe_subscription_id', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

// --- CRM: COMPANIES & LEADS ---

export const companies = mysqlTable('companies', {
  id: int('id').autoincrement().primaryKey(),
  tenantId: int('tenant_id').references(() => tenants.id),
  name: varchar('name', { length: 255 }).notNull(),
  taxId: varchar('tax_id', { length: 50 }),
  taxOffice: varchar('tax_office', { length: 100 }),
  address: text('address'),
  phone: varchar('phone', { length: 20 }),
  email: varchar('email', { length: 255 }),
  website: varchar('website', { length: 255 }),
  sector: varchar('sector', { length: 100 }),
  type: mysqlEnum('type', ['lead', 'customer', 'partner', 'vendor']).default('lead'),
  // --- FAZ 1B: Bayi (Dealer) Genişletmesi ---
  dealerType: mysqlEnum('dealer_type', ['none', 'dealer']).default('none'),
  dealerRiskLimit: decimal('dealer_risk_limit', { precision: 15, scale: 2 }),
  dealerDueDays: int('dealer_due_days').default(0),
  dealerDiscountRate: decimal('dealer_discount_rate', { precision: 5, scale: 2 }).default('0.00'),
  dealerPriceListNote: text('dealer_price_list_note'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const leads = mysqlTable('leads', {
  id: int('id').autoincrement().primaryKey(),
  tenantId: int('tenant_id').references(() => tenants.id),
  name: varchar('name', { length: 255 }).notNull(),
  companyName: varchar('company_name', { length: 255 }),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 20 }),
  source: varchar('source', { length: 100 }),
  status: mysqlEnum('status', ['new', 'contacted', 'qualified', 'lost', 'converted']).default('new'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

// --- USERS & RBAC ---

export const users = mysqlTable('users', {
  id: int('id').autoincrement().primaryKey(),
  tenantId: int('tenant_id').references(() => tenants.id),
  companyId: int('company_id').references(() => companies.id), // If user is a customer contact
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }),
  phone: varchar('phone', { length: 20 }),
  avatarUrl: varchar('avatar_url', { length: 500 }),
  roleType: mysqlEnum('role_type', ['superadmin', 'tenant_admin', 'staff', 'technician', 'customer', 'dealer_user']).default('customer'),
  isActive: boolean('is_active').default(true),
  lastLoginAt: timestamp('last_login_at'),
  // --- FAZ 1A: Cari Alan Genişletmesi (tümü nullable - migration güvenli) ---
  taxNumber: varchar('tax_number', { length: 50 }),
  taxOffice: varchar('tax_office', { length: 100 }),
  tcNo: varchar('tc_no', { length: 11 }),
  kvkkConsent: boolean('kvkk_consent').default(false),
  kvkkConsentAt: timestamp('kvkk_consent_at'),
  currency: varchar('currency', { length: 10 }).default('TRY'),
  userNotes: text('user_notes'),
  address: text('address'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
}, (t) => ({
  roleIdx: index('idx_users_role').on(t.roleType),
  tenantIdx: index('idx_users_tenant').on(t.tenantId),
}));

export const customers = mysqlTable('customers', {
  id: int('id').autoincrement().primaryKey(),
  tenantId: int('tenant_id').references(() => tenants.id).default(1),
  userId: int('user_id').references(() => users.id).notNull(),
  companyId: int('company_id').references(() => companies.id),
  accountCode: varchar('account_code', { length: 50 }),
  balance: decimal('balance', { precision: 10, scale: 2 }).default('0.00'),
  creditLimit: decimal('credit_limit', { precision: 10, scale: 2 }).default('0.00'),
  notes: text('notes'),
  isActive: boolean('is_active').default(true),
  // --- FAZ 1A: Cari Finansal Alanlar ---
  riskLimit: decimal('risk_limit', { precision: 15, scale: 2 }),
  defaultDueDays: int('default_due_days').default(0),
  discountRate: decimal('discount_rate', { precision: 5, scale: 2 }).default('0.00'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
}, (t) => ({
  userIdx: index('idx_customers_user').on(t.userId),
  companyIdx: index('idx_customers_company').on(t.companyId),
}));

export const customerSubscriptions = mysqlTable('customer_subscriptions', {
  id: int('id').autoincrement().primaryKey(),
  tenantId: int('tenant_id').references(() => tenants.id).default(1),
  userId: int('user_id').references(() => users.id).notNull(),
  companyId: int('company_id').references(() => companies.id),
  planId: int('plan_id').references(() => plans.id).notNull(),
  status: mysqlEnum('status', ['trial', 'active', 'past_due', 'canceled', 'unpaid']).default('active'),
  currentPeriodStart: timestamp('current_period_start'),
  currentPeriodEnd: timestamp('current_period_end'),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false),
  agreementNotes: text('agreement_notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const roles = mysqlTable('roles', {
  id: int('id').autoincrement().primaryKey(),
  tenantId: int('tenant_id').references(() => tenants.id),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const permissions = mysqlTable('permissions', {
  id: int('id').autoincrement().primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  group: varchar('group', { length: 100 }), // e.g., 'tickets', 'invoices'
  description: text('description'),
});

export const rolePermissions = mysqlTable('role_permissions', {
  id: int('id').autoincrement().primaryKey(),
  roleId: int('role_id').references(() => roles.id).notNull(),
  permissionId: int('permission_id').references(() => permissions.id).notNull(),
});

export const userRoles = mysqlTable('user_roles', {
  id: int('id').autoincrement().primaryKey(),
  userId: int('user_id').references(() => users.id).notNull(),
  roleId: int('role_id').references(() => roles.id).notNull(),
});

// --- CORE: ASSETS & SERVICES ---

export const devices = mysqlTable('devices', {
  id: int('id').autoincrement().primaryKey(),
  tenantId: int('tenant_id').references(() => tenants.id),
  userId: int('user_id').references(() => users.id),
  companyId: int('company_id').references(() => companies.id),
  deviceTypeId: int('device_type_id').references(() => deviceTypes.id),
  name: varchar('name', { length: 255 }),
  deviceType: varchar('device_type', { length: 100 }).notNull(),
  brand: varchar('brand', { length: 100 }),
  model: varchar('model', { length: 100 }),
  color: varchar('color', { length: 40 }),
  variant: varchar('variant', { length: 100 }),
  serialNumber: varchar('serial_number', { length: 100 }),
  imei: varchar('imei', { length: 100 }),
  patternLock: varchar('pattern_lock', { length: 100 }),
  pinPassword: varchar('pin_password', { length: 100 }),
  deviceEmail: varchar('device_email', { length: 255 }),
  deviceEmailPassword: varchar('device_email_password', { length: 255 }),
  purchaseDate: date('purchase_date'),
  warrantyStatus: boolean('warranty_status').default(false),
  warrantyExpiry: date('warranty_expiry'),
  status: mysqlEnum('status', ['active', 'in_repair', 'retired']).default('active'),
  details: text('details'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Cihaz türü profilleri (dinamik) — sabit kod yerine DB'den okunur, yeni tür
// eklemek migration gerektirmez.
export const deviceTypes = mysqlTable('device_types', {
  id: int('id').autoincrement().primaryKey(),
  tenantId: int('tenant_id').references(() => tenants.id),
  name: varchar('name', { length: 50 }).notNull().unique(),
  hasImei: boolean('has_imei').default(false),
  hasPatternLock: boolean('has_pattern_lock').default(false),
  lockLabel: varchar('lock_label', { length: 60 }),
  variantLabel: varchar('variant_label', { length: 60 }),
  variantPlaceholder: varchar('variant_placeholder', { length: 100 }),
  accessoriesHint: varchar('accessories_hint', { length: 200 }),
  sortOrder: int('sort_order').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

export const deviceTypeTests = mysqlTable('device_type_tests', {
  id: int('id').autoincrement().primaryKey(),
  deviceTypeId: int('device_type_id').notNull().references(() => deviceTypes.id, { onDelete: 'cascade' }),
  testName: varchar('test_name', { length: 80 }).notNull(),
  sortOrder: int('sort_order').default(0),
}, (t) => ({
  deviceTypeIdx: index('idx_device_type_tests_type').on(t.deviceTypeId),
}));

export const serviceCategories = mysqlTable('service_categories', {
  id: int('id').autoincrement().primaryKey(),
  tenantId: int('tenant_id').references(() => tenants.id),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  description: text('description'),
  icon: varchar('icon', { length: 100 }),
  features: json('features'),
  metaTitle: varchar('meta_title', { length: 255 }),
  metaDescription: text('meta_description'),
  isActive: boolean('is_active').default(true),
  displayOrder: int('display_order').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

export const services = mysqlTable('services', {
  id: int('id').autoincrement().primaryKey(),
  tenantId: int('tenant_id').references(() => tenants.id),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  basePrice: decimal('base_price', { precision: 10, scale: 2 }),
  categoryId: int('category_id').references(() => serviceCategories.id),
  imageUrl: varchar('image_url', { length: 500 }),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

export const maintenanceContracts = mysqlTable('maintenance_contracts', {
  id: int('id').autoincrement().primaryKey(),
  tenantId: int('tenant_id').references(() => tenants.id),
  companyId: int('company_id').references(() => companies.id),
  title: varchar('title', { length: 255 }).notNull(),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  status: mysqlEnum('status', ['aktif', 'pasif', 'iptal', 'bekliyor']).default('bekliyor'),
  slaDetails: text('sla_details'),
  monthlyFee: decimal('monthly_fee', { precision: 10, scale: 2 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

// --- HELPDESK & TICKETING ---

export const tickets = mysqlTable('tickets', {
  id: int('id').autoincrement().primaryKey(),
  tenantId: int('tenant_id').references(() => tenants.id),
  ticketNumber: varchar('ticket_number', { length: 50 }).notNull(), 
  userId: int('user_id').references(() => users.id),
  companyId: int('company_id').references(() => companies.id),
  deviceId: int('device_id').references(() => devices.id),
  contractId: int('contract_id').references(() => maintenanceContracts.id),
  type: mysqlEnum('type', ['ariza', 'destek', 'kurulum', 'bakim', 'diger']).notNull(),
  subject: varchar('subject', { length: 255 }).notNull(),
  description: text('description').notNull(),
  priority: mysqlEnum('priority', ['dusuk', 'normal', 'yuksek', 'acil']).default('normal'),
  status: mysqlEnum('status', ['yeni', 'isleme_alindi', 'parca_bekliyor', 'dis_servis', 'musteri_onayi_bekliyor', 'onay_red', 'cozuldu', 'iade', 'kapatildi', 'iptal', 'teslim_edildi']).default('yeni'),
  assignedTo: int('assigned_to').references(() => users.id),
  cost: decimal('cost', { precision: 10, scale: 2 }).default('0.00'),
  laborCost: decimal('labor_cost', { precision: 10, scale: 2 }).default('0.00'),
  accessories: text('accessories'),
  isUnderWarranty: boolean('is_under_warranty').default(false),
  warrantyNote: text('warranty_note'),
  technicianNotes: text('technician_notes'),
  estimatedCost: decimal('estimated_cost', { precision: 10, scale: 2 }),
  estimatedDueAt: timestamp('estimated_due_at'),
  completedAt: timestamp('completed_at'),
  deliveredAt: timestamp('delivered_at'),
  customerSignature: text('customer_signature'),
  deliverySignature: text('delivery_signature'),
  // --- FAZ 1B: Bayi Entegrasyonu ---
  dealerId: int('dealer_id').references(() => companies.id),
  source: mysqlEnum('source', ['walk_in', 'dealer', 'online', 'phone']).default('walk_in'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
  resolvedAt: timestamp('resolved_at'),
}, (t) => ({
  ticketNumberIdx: uniqueIndex('idx_tickets_number').on(t.ticketNumber),
  userIdx: index('idx_tickets_user').on(t.userId),
  statusIdx: index('idx_tickets_status').on(t.status),
  deviceIdx: index('idx_tickets_device').on(t.deviceId),
  dealerIdx: index('idx_tickets_dealer').on(t.dealerId),
}));

export const ticketMessages = mysqlTable('ticket_messages', {
  id: int('id').autoincrement().primaryKey(),
  tenantId: int('tenant_id').references(() => tenants.id),
  ticketId: int('ticket_id').references(() => tickets.id).notNull(),
  senderId: int('sender_id').references(() => users.id).notNull(),
  message: text('message').notNull(),
  isInternal: boolean('is_internal').default(false), // For staff-only notes
  createdAt: timestamp('created_at').defaultNow(),
});

export const ticketAttachments = mysqlTable('ticket_attachments', {
  id: int('id').autoincrement().primaryKey(),
  tenantId: int('tenant_id').references(() => tenants.id),
  ticketId: int('ticket_id').references(() => tickets.id).notNull(),
  messageId: int('message_id').references(() => ticketMessages.id),
  fileName: varchar('file_name', { length: 255 }).notNull(),
  fileUrl: varchar('file_url', { length: 500 }).notNull(),
  fileType: varchar('file_type', { length: 50 }),
  fileSize: int('file_size'),
  createdAt: timestamp('created_at').defaultNow(),
});

// --- INVENTORY & PARTS ---

export const inventoryCategories = mysqlTable('inventory_categories', {
  id: int('id').autoincrement().primaryKey(),
  tenantId: int('tenant_id').references(() => tenants.id),
  parentId: int('parent_id'),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
});

export const stockItems = mysqlTable('stock_items', {
  id: int('id').autoincrement().primaryKey(),
  tenantId: int('tenant_id').references(() => tenants.id),
  categoryId: int('category_id').references(() => inventoryCategories.id),
  sku: varchar('sku', { length: 100 }).notNull(),
  barcode: varchar('barcode', { length: 100 }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  brand: varchar('brand', { length: 100 }),
  model: varchar('model', { length: 100 }),
  unit: varchar('unit', { length: 50 }).default('adet'),
  vatRate: int('vat_rate').default(20),
  imageUrl: varchar('image_url', { length: 500 }),
  costPrice: decimal('cost_price', { precision: 10, scale: 2 }),
  sellingPrice: decimal('selling_price', { precision: 10, scale: 2 }),
  currentStock: int('current_stock').default(0),
  minStockLevel: int('min_stock_level').default(0),
  hasSerialTracking: boolean('has_serial_tracking').default(false),
  warrantyMonths: int('warranty_months').default(0),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
}, (t) => ({
  skuIdx: index('idx_stock_sku').on(t.sku),
  barcodeIdx: index('idx_stock_barcode').on(t.barcode),
  categoryIdx: index('idx_stock_category').on(t.categoryId),
}));

export const ticketParts = mysqlTable('ticket_parts', {
  id: int('id').autoincrement().primaryKey(),
  tenantId: int('tenant_id').references(() => tenants.id),
  ticketId: int('ticket_id').references(() => tickets.id).notNull(),
  stockItemId: int('stock_item_id').references(() => stockItems.id).notNull(),
  quantity: int('quantity').notNull().default(1),
  unitPrice: decimal('unit_price', { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal('total_price', { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// --- BILLING & ACCOUNTING ---

export const invoices = mysqlTable('invoices', {
  id: int('id').autoincrement().primaryKey(),
  tenantId: int('tenant_id').references(() => tenants.id),
  invoiceNumber: varchar('invoice_number', { length: 100 }).notNull(),
  companyId: int('company_id').references(() => companies.id),
  userId: int('user_id').references(() => users.id),
  ticketId: int('ticket_id').references(() => tickets.id),
  contractId: int('contract_id').references(() => maintenanceContracts.id),
  subtotal: decimal('subtotal', { precision: 10, scale: 2 }).notNull(),
  taxRate: decimal('tax_rate', { precision: 5, scale: 2 }).default('18.00'),
  taxAmount: decimal('tax_amount', { precision: 10, scale: 2 }).notNull(),
  discountAmount: decimal('discount_amount', { precision: 10, scale: 2 }).default('0.00'),
  totalAmount: decimal('total_amount', { precision: 10, scale: 2 }).notNull(),
  status: mysqlEnum('status', ['taslak', 'kuyrukta', 'gonderildi', 'odendi', 'iptal', 'gecikmis']).default('taslak'),
  issueDate: date('issue_date').notNull(),
  dueDate: date('due_date').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const invoiceItems = mysqlTable('invoice_items', {
  id: int('id').autoincrement().primaryKey(),
  invoiceId: int('invoice_id').references(() => invoices.id).notNull(),
  description: varchar('description', { length: 255 }).notNull(),
  quantity: int('quantity').notNull().default(1),
  unitPrice: decimal('unit_price', { precision: 10, scale: 2 }).notNull(),
  total: decimal('total', { precision: 10, scale: 2 }).notNull(),
});

export const payments = mysqlTable('payments', {
  id: int('id').autoincrement().primaryKey(),
  tenantId: int('tenant_id').references(() => tenants.id),
  invoiceId: int('invoice_id').references(() => invoices.id),
  companyId: int('company_id').references(() => companies.id),
  ticketId: int('ticket_id').references(() => tickets.id),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  paymentMethod: mysqlEnum('payment_method', ['kredi_karti', 'havale_eft', 'nakit', 'diger']).notNull(),
  status: mysqlEnum('status', ['basarili', 'basarisiz', 'bekliyor', 'iade', 'iptal']).default('basarili'),
  transactionId: varchar('transaction_id', { length: 100 }),
  notes: text('notes'),
  paymentDate: timestamp('payment_date').defaultNow(),
  // --- FAZ 3A: Ters Kayit (Reversal) Pattern ---
  reversalOfId: int('reversal_of_id'),
  reversedAt: timestamp('reversed_at'),
  reversedByUserId: int('reversed_by_user_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
});

// --- CMS: PAGES, BLOG, KNOWLEDGE BASE ---

export const pages = mysqlTable('pages', {
  id: int('id').autoincrement().primaryKey(),
  tenantId: int('tenant_id').references(() => tenants.id),
  title: varchar('title', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull(),
  content: text('content'),
  metaTitle: varchar('meta_title', { length: 255 }),
  metaDescription: text('meta_description'),
  canonicalUrl: varchar('canonical_url', { length: 500 }),
  ogImageUrl: varchar('og_image_url', { length: 500 }),
  focusKeyword: varchar('focus_keyword', { length: 100 }),
  status: mysqlEnum('status', ['taslak', 'yayinlandi', 'arsivlendi']).default('taslak'),
  isSystem: boolean('is_system').default(false), // e.g. Home, About Us, Term that shouldn't be deleted completely
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
}, (t) => ({
  slugIdx: index('idx_pages_slug').on(t.slug),
  statusIdx: index('idx_pages_status').on(t.status),
}));

export const blogPosts = mysqlTable('blog_posts', {
  id: int('id').autoincrement().primaryKey(),
  tenantId: int('tenant_id').references(() => tenants.id),
  title: varchar('title', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull(),
  content: text('content').notNull(),
  excerpt: text('excerpt'),
  imageUrl: varchar('image_url', { length: 500 }),
  authorId: int('author_id').references(() => users.id),
  status: mysqlEnum('status', ['taslak', 'yayinlandi', 'arsivlendi']).default('taslak'),
  publishedAt: timestamp('published_at'),
  metaTitle: varchar('meta_title', { length: 255 }),
  metaDescription: text('meta_description'),
  canonicalUrl: varchar('canonical_url', { length: 500 }),
  ogImageUrl: varchar('og_image_url', { length: 500 }),
  focusKeyword: varchar('focus_keyword', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
}, (t) => ({
  slugIdx: index('idx_blog_slug').on(t.slug),
  statusIdx: index('idx_blog_status').on(t.status),
}));

export const faqCategories = mysqlTable('faq_categories', {
  id: int('id').autoincrement().primaryKey(),
  tenantId: int('tenant_id').references(() => tenants.id),
  name: varchar('name', { length: 255 }).notNull(),
  icon: varchar('icon', { length: 50 }),
  displayOrder: int('display_order').default(0),
});

export const knowledgeBase = mysqlTable('knowledge_base', {
  id: int('id').autoincrement().primaryKey(),
  tenantId: int('tenant_id').references(() => tenants.id),
  categoryId: int('category_id').references(() => faqCategories.id),
  question: varchar('question', { length: 500 }).notNull(),
  answer: text('answer').notNull(),
  isHelpfulCount: int('is_helpful_count').default(0),
  isNotHelpfulCount: int('is_not_helpful_count').default(0),
  status: mysqlEnum('status', ['taslak', 'yayinlandi']).default('yayinlandi'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

// --- MARKETING & SETTINGS ---

export const campaigns = mysqlTable('campaigns', {
  id: int('id').autoincrement().primaryKey(),
  tenantId: int('tenant_id').references(() => tenants.id),
  title: varchar('title', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull(),
  description: text('description'),
  imageUrl: varchar('image_url', { length: 500 }),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  discountRate: decimal('discount_rate', { precision: 5, scale: 2 }),
  status: mysqlEnum('status', ['aktif', 'pasif', 'taslak']).default('taslak'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const notifications = mysqlTable('notifications', {
  id: int('id').autoincrement().primaryKey(),
  tenantId: int('tenant_id').references(() => tenants.id),
  userId: int('user_id').references(() => users.id).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),
  type: mysqlEnum('type', ['info', 'success', 'warning', 'error', 'system']).default('info'),
  isRead: boolean('is_read').default(false),
  linkUrl: varchar('link_url', { length: 500 }),
  createdAt: timestamp('created_at').defaultNow(),
});

export const settings = mysqlTable('settings', {
  id: int('id').autoincrement().primaryKey(),
  tenantId: int('tenant_id').references(() => tenants.id),
  key: varchar('key', { length: 100 }).notNull(),
  value: text('value'),
  group: varchar('group', { length: 100 }), // e.g. 'general', 'smtp', 'payment'
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
}, (t) => ({
  keyIdx: index('idx_settings_key').on(t.key),
}));

export const auditLogs = mysqlTable('audit_logs', {
  id: int('id').autoincrement().primaryKey(),
  tenantId: int('tenant_id').references(() => tenants.id),
  userId: int('user_id').references(() => users.id),
  action: varchar('action', { length: 255 }).notNull(), // e.g. 'ticket.created', 'user.deleted'
  entityType: varchar('entity_type', { length: 100 }), // e.g. 'Ticket', 'User'
  entityId: int('entity_id'),
  details: json('details'), // Snapshot of changes or context
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow(),
});

// --- CMS: MEDIA & UPLOADS ---

export const mediaFolders = mysqlTable('media_folders', {
  id: int('id').autoincrement().primaryKey(),
  tenantId: int('tenant_id').references(() => tenants.id),
  name: varchar('name', { length: 255 }).notNull(),
  parentId: int('parent_id'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const mediaLibrary = mysqlTable('media_library', {
  id: int('id').autoincrement().primaryKey(),
  tenantId: int('tenant_id').references(() => tenants.id),
  uploaderId: int('uploader_id').references(() => users.id),
  folderId: int('folder_id').references(() => mediaFolders.id),
  fileName: varchar('file_name', { length: 255 }).notNull(),
  fileUrl: varchar('file_url', { length: 500 }).notNull(),
  mimeType: varchar('mime_type', { length: 100 }),
  fileSize: int('file_size'),
  altText: varchar('alt_text', { length: 255 }),
  title: varchar('title', { length: 255 }),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow(),
});

// --- CMS: TAXONOMIES (Categories, Tags) ---

export const taxonomies = mysqlTable('taxonomies', {
  id: int('id').autoincrement().primaryKey(),
  tenantId: int('tenant_id').references(() => tenants.id),
  name: varchar('name', { length: 100 }).notNull(), // e.g. 'category', 'tag'
  slug: varchar('slug', { length: 100 }).notNull(),
});

export const terms = mysqlTable('terms', {
  id: int('id').autoincrement().primaryKey(),
  tenantId: int('tenant_id').references(() => tenants.id),
  taxonomyId: int('taxonomy_id').references(() => taxonomies.id),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull(),
  description: text('description'),
  parentId: int('parent_id'), 
});

export const termRelationships = mysqlTable('term_relationships', {
  id: int('id').autoincrement().primaryKey(),
  objectId: int('object_id').notNull(), // e.g. blog_post.id
  objectType: varchar('object_type', { length: 50 }).notNull(), // 'blog_post', 'page'
  termId: int('term_id').references(() => terms.id).notNull(),
}, (t) => ({
  objectIdx: index('idx_termrel_object').on(t.objectType, t.objectId),
  termIdx: index('idx_termrel_term').on(t.termId),
}));

// --- CMS: MENUS & NAVIGATION ---

export const menus = mysqlTable('menus', {
  id: int('id').autoincrement().primaryKey(),
  tenantId: int('tenant_id').references(() => tenants.id),
  name: varchar('name', { length: 100 }).notNull(),
  location: varchar('location', { length: 100 }), // e.g. 'header', 'footer'
  createdAt: timestamp('created_at').defaultNow(),
});

export const menuItems = mysqlTable('menu_items', {
  id: int('id').autoincrement().primaryKey(),
  tenantId: int('tenant_id').references(() => tenants.id),
  menuId: int('menu_id').references(() => menus.id).notNull(),
  parentId: int('parent_id'),
  title: varchar('title', { length: 255 }).notNull(),
  url: varchar('url', { length: 500 }),
  target: varchar('target', { length: 20 }).default('_self'),
  displayOrder: int('display_order').default(0),
  icon: varchar('icon', { length: 50 }),
  cssClass: varchar('css_class', { length: 255 }),
  megaMenu: json('mega_menu'),
}, (t) => ({
  menuIdx: index('idx_menuitems_menu').on(t.menuId),
}));

// --- CMS: FORMS ---

export const forms = mysqlTable('forms', {
  id: int('id').autoincrement().primaryKey(),
  tenantId: int('tenant_id').references(() => tenants.id),
  name: varchar('name', { length: 255 }).notNull(),
  schema: json('schema'), 
  isActive: boolean('is_active').default(true),
  emailNotifications: json('email_notifications'), 
  createdAt: timestamp('created_at').defaultNow(),
});

export const formSubmissions = mysqlTable('form_submissions', {
  id: int('id').autoincrement().primaryKey(),
  tenantId: int('tenant_id').references(() => tenants.id),
  formId: int('form_id').references(() => forms.id).notNull(),
  data: json('data'),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow(),
});

// --- CMS: TESTIMONIALS (COMMENTS/REVIEWS) ---

export const testimonials = mysqlTable('testimonials', {
  id: int('id').autoincrement().primaryKey(),
  tenantId: int('tenant_id').references(() => tenants.id),
  authorName: varchar('author_name', { length: 255 }).notNull(),
  authorTitle: varchar('author_title', { length: 255 }), // e.g. CEO at Company
  authorImageUrl: varchar('author_image_url', { length: 500 }),
  content: text('content').notNull(),
  rating: int('rating').default(5), // 1-5 scale
  status: mysqlEnum('status', ['taslak', 'yayinlandi']).default('taslak'),
  displayOrder: int('display_order').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});
// --- ADVANCED ARCHITECTURE: API, WEBHOOKS, PLUGINS ---

export const apiKeys = mysqlTable('api_keys', {
  id: int('id').autoincrement().primaryKey(),
  tenantId: int('tenant_id').references(() => tenants.id),
  name: varchar('name', { length: 255 }).notNull(),
  keyHash: varchar('key_hash', { length: 255 }).notNull(), // hashed key for security
  prefix: varchar('prefix', { length: 10 }).notNull(), // 'kb_' etc to identify key easily
  lastUsedAt: timestamp('last_used_at'),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => ({
  keyHashIdx: index('idx_apikeys_hash').on(t.keyHash),
}));

export const webhooks = mysqlTable('webhooks', {
  id: int('id').autoincrement().primaryKey(),
  tenantId: int('tenant_id').references(() => tenants.id),
  name: varchar('name', { length: 255 }).notNull(),
  event: varchar('event', { length: 100 }).notNull(), // e.g. 'ticket.created', 'lead.created'
  url: varchar('url', { length: 500 }).notNull(),
  secret: varchar('secret', { length: 255 }), // for payload signature validation
  isActive: boolean('is_active').default(true),
  failureCount: int('failure_count').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});
export const plugins = mysqlTable('plugins', {
  id: int('id').autoincrement().primaryKey(),
  tenantId: int('tenant_id').references(() => tenants.id),
  pluginId: varchar('plugin_id', { length: 100 }).notNull().unique(), // e.g. 'google-business', 'maintenance-mode'
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  isActive: boolean('is_active').default(false),
  settings: json('settings'), // JSON string or object
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

// --- CMS: THEME BUILDER & UI OPTIONS ---

export const themeSettings = mysqlTable('theme_settings', {
  id: int('id').autoincrement().primaryKey(),
  tenantId: int('tenant_id').references(() => tenants.id),
  settingGroup: varchar('setting_group', { length: 64 }).notNull(), // 'general', 'header', 'footer', 'skin'
  settingKey: varchar('setting_key', { length: 128 }).notNull(),
  settingValue: json('setting_value').notNull(),
  isDraft: boolean('is_draft').default(false).notNull(), // for Live Customizer
  updatedBy: int('updated_by').references(() => users.id),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

// --- i18n TRANSLATIONS ---

export const languages = mysqlTable('languages', {
  id: int('id').autoincrement().primaryKey(),
  code: varchar('code', { length: 10 }).notNull().unique(), // 'tr', 'en', 'de'
  name: varchar('name', { length: 50 }).notNull(), // 'Türkçe', 'English'
  isDefault: boolean('is_default').default(false),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

export const translations = mysqlTable('translations', {
  id: int('id').autoincrement().primaryKey(),
  langCode: varchar('lang_code', { length: 10 }).references(() => languages.code).notNull(),
  key: varchar('key', { length: 255 }).notNull(), // e.g. 'common.loading'
  value: text('value'), // e.g. 'Yükleniyor...'
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
}, (t) => ({
  langIdx: index('idx_translations_lang').on(t.langCode),
}));

export const themePresets = mysqlTable('theme_presets', {
  id: int('id').autoincrement().primaryKey(),
  tenantId: int('tenant_id').references(() => tenants.id),
  name: varchar('name', { length: 128 }).notNull(),
  thumbnailUrl: varchar('thumbnail_url', { length: 255 }),
  sector: varchar('sector', { length: 64 }), // 'e-ticaret', 'kurumsal', vb.
  settingsPayload: json('settings_payload').notNull(), // bulk settings snapshot
  createdAt: timestamp('created_at').defaultNow(),
});

export const layoutTemplates = mysqlTable('layout_templates', {
  id: int('id').autoincrement().primaryKey(),
  tenantId: int('tenant_id').references(() => tenants.id),
  type: mysqlEnum('type', ['header', 'footer', 'single_post', 'single_product', 'archive', 'popup', 'page_header']).notNull(),
  name: varchar('name', { length: 128 }).notNull(),
  isDefault: boolean('is_default').default(false),
  structure: json('structure').notNull(), // region/element tree
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const layoutAssignments = mysqlTable('layout_assignments', {
  id: int('id').autoincrement().primaryKey(),
  layoutTemplateId: int('layout_template_id').references(() => layoutTemplates.id, { onDelete: 'cascade' }).notNull(),
  conditionType: mysqlEnum('condition_type', ['all', 'category', 'specific_page', 'specific_product', 'post_type', 'homepage']).notNull(),
  conditionValue: varchar('condition_value', { length: 255 }), // e.g. category slug, page id
  priority: int('priority').default(0),
});

export const pageBlocks = mysqlTable('page_blocks', {
  id: int('id').autoincrement().primaryKey(),
  tenantId: int('tenant_id').references(() => tenants.id),
  ownerType: mysqlEnum('owner_type', ['page', 'layout_template']).notNull(),
  ownerId: int('owner_id').notNull(), // refers to pages.id or layoutTemplates.id
  region: varchar('region', { length: 64 }).default('main'), // 'header_top', 'content', 'sidebar'
  elementKey: varchar('element_key', { length: 64 }).notNull(), // from element registry
  props: json('props').notNull(),
  responsiveOverrides: json('responsive_overrides'), // tablet/mobile specific settings
  sortOrder: int('sort_order').default(0),
  isVisible: boolean('is_visible').default(true),
  visibilityRule: json('visibility_rule'), // conditions to show/hide this block
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
}, (t) => ({
  ownerIdx: index('idx_pageblocks_owner').on(t.ownerType, t.ownerId),
}));

// --- DEPO & STOk HAREKETLERİ ---

export const warehouses = mysqlTable('warehouses', {
  id: int('id').autoincrement().primaryKey(),
  tenantId: int('tenant_id').references(() => tenants.id),
  name: varchar('name', { length: 255 }).notNull(),
  code: varchar('code', { length: 50 }),
  address: text('address'),
  isDefault: boolean('is_default').default(false),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const serializedItems = mysqlTable('serialized_items', {
  id: int('id').autoincrement().primaryKey(),
  tenantId: int('tenant_id').references(() => tenants.id),
  stockItemId: int('stock_item_id').references(() => stockItems.id),
  serialNumber: varchar('serial_number', { length: 255 }).notNull(),
  status: mysqlEnum('status', ['stokta', 'satildi', 'iade', 'servis']).default('stokta'),
  warehouseId: int('warehouse_id').references(() => warehouses.id),
  purchasePrice: decimal('purchase_price', { precision: 12, scale: 2 }),
  purchasedAt: timestamp('purchased_at'),
  soldAt: timestamp('sold_at'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const stockMovements = mysqlTable('stock_movements', {
  id: int('id').autoincrement().primaryKey(),
  tenantId: int('tenant_id').references(() => tenants.id),
  stockItemId: int('stock_item_id').references(() => stockItems.id),
  serializedItemId: int('serialized_item_id').references(() => serializedItems.id),
  fromWarehouseId: int('from_warehouse_id').references(() => warehouses.id),
  toWarehouseId: int('to_warehouse_id').references(() => warehouses.id),
  quantity: int('quantity').notNull().default(0),
  type: mysqlEnum('type', ['giris', 'cikis', 'transfer', 'iade', 'fire']).notNull(),
  reason: varchar('reason', { length: 255 }),
  referenceId: int('reference_id'),
  createdById: int('created_by_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
});

// --- SATIŞ & POS ---

export const sales = mysqlTable('sales', {
  id: int('id').autoincrement().primaryKey(),
  tenantId: int('tenant_id').references(() => tenants.id),
  customerId: int('customer_id').references(() => customers.id),
  salespersonId: int('salesperson_id').references(() => users.id),
  receiptNumber: varchar('receipt_number', { length: 100 }).notNull().unique(),
  totalAmount: decimal('total_amount', { precision: 12, scale: 2 }).notNull(),
  taxAmount: decimal('tax_amount', { precision: 12, scale: 2 }).default('0.00'),
  discountAmount: decimal('discount_amount', { precision: 12, scale: 2 }).default('0.00'),
  paymentType: mysqlEnum('payment_type', ['nakit', 'kredi_karti', 'havale', 'cari']).notNull(),
  status: mysqlEnum('status', ['odendi', 'beklemede', 'iptal', 'iade']).default('odendi'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const saleItems = mysqlTable('sale_items', {
  id: int('id').autoincrement().primaryKey(),
  tenantId: int('tenant_id').references(() => tenants.id),
  saleId: int('sale_id').references(() => sales.id),
  stockItemId: int('stock_item_id').references(() => stockItems.id),
  serializedItemId: int('serialized_item_id').references(() => serializedItems.id),
  quantity: int('quantity').notNull().default(1),
  unitPrice: decimal('unit_price', { precision: 12, scale: 2 }).notNull(),
  vatRate: int('vat_rate').default(20),
  totalPrice: decimal('total_price', { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const blockedIps = mysqlTable('blocked_ips', {
  id: int('id').autoincrement().primaryKey(),
  ipAddress: varchar('ip_address', { length: 45 }).notNull().unique(),
  blockedUntil: timestamp('blocked_until').notNull(),
  reason: varchar('reason', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => ({
  ipIdx: uniqueIndex('idx_blocked_ips_ip').on(t.ipAddress),
}));

export const shipments = mysqlTable('shipments', {
  id: int('id').autoincrement().primaryKey(),
  tenantId: int('tenant_id').references(() => tenants.id),
  ticketId: int('ticket_id').references(() => tickets.id, { onDelete: 'set null' }),
  carrier: varchar('carrier', { length: 50 }).notNull(), // 'yurtici', 'aras', 'mng', 'ptt', 'diger'
  trackingNumber: varchar('tracking_number', { length: 100 }),
  status: mysqlEnum('status', ['hazirlaniyor', 'kargoya_verildi', 'yolda', 'teslim_edildi', 'iade']).default('hazirlaniyor'),
  senderDetails: text('sender_details'),
  receiverDetails: text('receiver_details'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const expenses = mysqlTable('expenses', {
  id: int('id').autoincrement().primaryKey(),
  tenantId: int('tenant_id').references(() => tenants.id),
  title: varchar('title', { length: 255 }).notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  category: varchar('category', { length: 100 }), // e.g. 'yol', 'yemek', 'kargo', 'donanim'
  description: text('description'),
  receiptUrl: varchar('receipt_url', { length: 500 }), // photo of the receipt
  expenseDate: timestamp('expense_date').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

// ============================================================
// FAZ 1B — BAYİ DEFTERİ (Dealer Ledger)
// ============================================================
// Bayi cari hareketleri: DEBIT (borç - teslim), CREDIT (alacak - ödeme)
export const dealerLedger = mysqlTable('dealer_ledger', {
  id: int('id').autoincrement().primaryKey(),
  tenantId: int('tenant_id').references(() => tenants.id),
  dealerCompanyId: int('dealer_company_id').references(() => companies.id).notNull(),
  ticketId: int('ticket_id').references(() => tickets.id),
  paymentId: int('payment_id').references(() => payments.id),
  type: mysqlEnum('type', ['debit', 'credit']).notNull(), // debit=borçlandırma, credit=ödeme
  amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 10 }).default('TRY'),
  description: varchar('description', { length: 500 }),
  dueDate: date('due_date'),
  // Ters kayıt için:
  reversalOfId: int('reversal_of_id'),
  isReversed: boolean('is_reversed').default(false),
  // FIFO mahsup referansı:
  reconciledWith: int('reconciled_with'),
  reconciledAmount: decimal('reconciled_amount', { precision: 15, scale: 2 }),
  createdByUserId: int('created_by_user_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => ({
  dealerIdx: index('idx_dealer_ledger_company').on(t.dealerCompanyId),
  ticketIdx: index('idx_dealer_ledger_ticket').on(t.ticketId),
}));

// ============================================================
// FAZ 1D — DÖVİZ KURLARI (Exchange Rates)
// ============================================================
export const exchangeRates = mysqlTable('exchange_rates', {
  id: int('id').autoincrement().primaryKey(),
  tenantId: int('tenant_id').references(() => tenants.id),
  baseCurrency: varchar('base_currency', { length: 10 }).notNull().default('TRY'),
  targetCurrency: varchar('target_currency', { length: 10 }).notNull(),
  rate: decimal('rate', { precision: 15, scale: 6 }).notNull(),
  source: mysqlEnum('source', ['tcmb', 'manual', 'carried_over']).default('tcmb'),
  rateDate: date('rate_date').notNull(), // Hangi güne ait kur
  fetchedAt: timestamp('fetched_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => ({
  dateIdx: index('idx_exchange_rates_date').on(t.rateDate),
  currencyIdx: index('idx_exchange_rates_currency').on(t.targetCurrency),
}));

// ============================================================
// FAZ 1D — DÖNEM KİLİTLERİ (Period Locks)
// ============================================================
export const periodLocks = mysqlTable('period_locks', {
  id: int('id').autoincrement().primaryKey(),
  tenantId: int('tenant_id').references(() => tenants.id),
  year: int('year').notNull(),
  month: int('month').notNull(), // 1-12
  lockedAt: timestamp('locked_at').defaultNow(),
  lockedByUserId: int('locked_by_user_id').references(() => users.id),
  notes: text('notes'),
}, (t) => ({
  periodIdx: index('idx_period_locks_period').on(t.year, t.month),
}));

// ============================================================
// FAZ 2A — FİŞ FOTOĞRAF FAZLARI (ticketAttachments genişletmesi)
// NOT: ticketAttachments tablosuna doğrudan alan eklenemez (FK constraint var)
// Bu nedenle ayrı bir meta tablo kullanıyoruz
// ============================================================
export const ticketAttachmentMeta = mysqlTable('ticket_attachment_meta', {
  id: int('id').autoincrement().primaryKey(),
  attachmentId: int('attachment_id').references(() => ticketAttachments.id).notNull(),
  phase: mysqlEnum('phase', ['teslim_alim', 'tamir', 'teslim', 'genel']).default('genel'),
  isLocked: boolean('is_locked').default(false), // Teslim alım fazı kilitlenir
  lockedAt: timestamp('locked_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const serviceStatusLogs = mysqlTable('service_status_logs', {
  id: int('id').autoincrement().primaryKey(),
  tenantId: int('tenant_id').references(() => tenants.id),
  ticketId: int('ticket_id').references(() => tickets.id).notNull(),
  fromStatus: varchar('from_status', { length: 50 }),
  toStatus: varchar('to_status', { length: 50 }).notNull(),
  notes: text('notes'),
  changedById: int('changed_by_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => ({
  ticketIdx: index('idx_service_status_logs_ticket').on(t.ticketId),
}));


