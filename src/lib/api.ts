import { Product, QRCodeData, Order, StoreSettings, SalesReport, OrderStatus, PaymentMethod, DashboardSummary, UserProfile } from '../types';

const BASE_URL = '/api';

export async function fetchSettings(): Promise<StoreSettings & { isOpen: boolean }> {
  const res = await fetch(`${BASE_URL}/settings`);
  if (!res.ok) throw new Error('Gagal memuat pengaturan toko');
  return res.json();
}

export async function updateSettings(settings: Partial<StoreSettings>): Promise<{ success: boolean; settings: StoreSettings }> {
  const res = await fetch(`${BASE_URL}/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings)
  });
  if (!res.ok) throw new Error('Gagal memperbarui pengaturan');
  return res.json();
}

export async function fetchProfile(): Promise<UserProfile> {
  const res = await fetch(`${BASE_URL}/profile`);
  if (!res.ok) throw new Error('Gagal memuat profil');
  return res.json();
}

export async function updateProfile(profile: Partial<UserProfile>): Promise<{ success: boolean; profile: UserProfile }> {
  const res = await fetch(`${BASE_URL}/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile)
  });
  if (!res.ok) throw new Error('Gagal memperbarui profil');
  return res.json();
}

export async function exportBackupData(): Promise<any> {
  const res = await fetch(`${BASE_URL}/backup/export`);
  if (!res.ok) throw new Error('Gagal mengekspor data cadangan');
  return res.json();
}

export async function restoreBackupData(backupData: any): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${BASE_URL}/backup/restore`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(backupData)
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Gagal memulihkan data');
  }
  return res.json();
}

export interface DatabaseStatus {
  status: string;
  isPersistent: boolean;
  storageType: string;
  filePath: string;
  exists: boolean;
  sizeBytes: number;
  totalProducts: number;
  totalOrders: number;
  lastModified: string;
}

export async function fetchDatabaseStatus(): Promise<DatabaseStatus> {
  const res = await fetch(`${BASE_URL}/database/status`);
  if (!res.ok) throw new Error('Gagal memeriksa status database');
  return res.json();
}

export async function syncDatabase(): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${BASE_URL}/database/sync`, { method: 'POST' });
  if (!res.ok) throw new Error('Gagal menyinkronkan database');
  return res.json();
}

export async function fetchProducts(): Promise<Product[]> {
  const res = await fetch(`${BASE_URL}/products`);
  if (!res.ok) throw new Error('Gagal memuat data produk');
  return res.json();
}

export async function createProduct(product: Partial<Product>): Promise<Product> {
  const res = await fetch(`${BASE_URL}/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(product)
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Gagal menambahkan produk');
  }
  return res.json();
}

export async function updateProduct(id: string, product: Partial<Product>): Promise<Product> {
  const res = await fetch(`${BASE_URL}/products/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(product)
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Gagal mengupdate produk');
  }
  return res.json();
}

export async function deleteProduct(id: string): Promise<{ success: boolean }> {
  const res = await fetch(`${BASE_URL}/products/${id}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Gagal menghapus produk');
  return res.json();
}

export async function fetchQRCodes(): Promise<QRCodeData[]> {
  const res = await fetch(`${BASE_URL}/qr-codes`);
  if (!res.ok) throw new Error('Gagal memuat data QR Code');
  return res.json();
}

export async function fetchQRCodeByCode(code: string): Promise<QRCodeData> {
  const res = await fetch(`${BASE_URL}/qr-codes/${encodeURIComponent(code)}`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'QR Code tidak ditemukan');
  }
  return res.json();
}

export async function createQRCode(data: Partial<QRCodeData>): Promise<QRCodeData> {
  const res = await fetch(`${BASE_URL}/qr-codes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Gagal membuat QR Code');
  }
  return res.json();
}

export async function updateQRCode(id: string, data: Partial<QRCodeData>): Promise<QRCodeData> {
  const res = await fetch(`${BASE_URL}/qr-codes/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Gagal memperbarui QR Code');
  return res.json();
}

export async function deleteQRCode(id: string): Promise<{ success: boolean }> {
  const res = await fetch(`${BASE_URL}/qr-codes/${id}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Gagal menghapus QR Code');
  return res.json();
}

export async function fetchOrders(params?: { status?: string; type?: string }): Promise<Order[]> {
  const query = new URLSearchParams();
  if (params?.status) query.set('status', params.status);
  if (params?.type) query.set('type', params.type);
  const res = await fetch(`${BASE_URL}/orders?${query.toString()}`);
  if (!res.ok) throw new Error('Gagal memuat pesanan');
  return res.json();
}

export async function fetchOrderStatus(token: string): Promise<Order> {
  const res = await fetch(`${BASE_URL}/order-status/${encodeURIComponent(token)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Pesanan tidak ditemukan');
  }
  return res.json();
}

export interface CreateOrderPayload {
  qrCode?: string;
  customerName?: string;
  orderType?: 'dine_in' | 'takeaway';
  tableNumber?: string;
  items: {
    productId: string;
    quantity: number;
    note?: string;
  }[];
  notes?: string;
  paymentMethod?: PaymentMethod;
  cashTendered?: number;
  cashChange?: number;
  isDirectKasir?: boolean;
}

export async function submitOrder(payload: CreateOrderPayload): Promise<Order> {
  const res = await fetch(`${BASE_URL}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const errorMsg = data.error || data.message || 'Gagal mengirim pesanan';
    const err = new Error(errorMsg) as Error & { outOfStockProductId?: string; code?: number };
    err.outOfStockProductId = data.outOfStockProductId;
    err.code = res.status;
    throw err;
  }

  return data;
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  autoMarkPaid?: boolean
): Promise<Order> {
  const res = await fetch(`${BASE_URL}/orders/${orderId}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, autoMarkPaid })
  });
  if (!res.ok) throw new Error('Gagal mengupdate status pesanan');
  return res.json();
}

export async function processPayment(
  orderId: string,
  payload: { paymentMethod: PaymentMethod; cashTendered?: number }
): Promise<Order> {
  const res = await fetch(`${BASE_URL}/orders/${orderId}/pay`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Gagal memproses pembayaran');
  }
  return res.json();
}

export async function fetchReports(): Promise<SalesReport> {
  const res = await fetch(`${BASE_URL}/reports`);
  if (!res.ok) throw new Error('Gagal memuat laporan');
  return res.json();
}

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const [reports, products] = await Promise.all([fetchReports(), fetchProducts()]);
  const lowStock = products.filter((p) => p.stock <= 5).length;
  return {
    todaySales: reports.totalRevenue,
    todayOrdersCount: reports.totalOrders,
    todayItemsSold: reports.topProducts.reduce((sum, p) => sum + p.quantity, 0),
    lowStockCount: lowStock
  };
}

// Subscribe to SSE Realtime Stream
export function subscribeToEvents(handlers: {
  onNewOrder?: (order: Order) => void;
  onOrderUpdated?: (order: Order) => void;
  onProductsUpdated?: (products: Product[]) => void;
  onQrUpdated?: (qrs: QRCodeData[]) => void;
  onSettingsUpdated?: (settings: StoreSettings) => void;
  onProfileUpdated?: (profile: UserProfile) => void;
}) {
  if (typeof window === 'undefined' || !window.EventSource) {
    return () => {};
  }

  const es = new EventSource(`${BASE_URL}/events`);

  es.addEventListener('new_order', (e) => {
    try {
      const order = JSON.parse(e.data);
      handlers.onNewOrder?.(order);
    } catch (err) {
      console.error(err);
    }
  });

  es.addEventListener('order_updated', (e) => {
    try {
      const order = JSON.parse(e.data);
      handlers.onOrderUpdated?.(order);
    } catch (err) {
      console.error(err);
    }
  });

  es.addEventListener('products_updated', (e) => {
    try {
      const products = JSON.parse(e.data);
      handlers.onProductsUpdated?.(products);
    } catch (err) {
      console.error(err);
    }
  });

  es.addEventListener('qr_updated', (e) => {
    try {
      const qrs = JSON.parse(e.data);
      handlers.onQrUpdated?.(qrs);
    } catch (err) {
      console.error(err);
    }
  });

  es.addEventListener('settings_updated', (e) => {
    try {
      const settings = JSON.parse(e.data);
      handlers.onSettingsUpdated?.(settings);
    } catch (err) {
      console.error(err);
    }
  });

  es.addEventListener('profile_updated', (e) => {
    try {
      const profile = JSON.parse(e.data);
      handlers.onProfileUpdated?.(profile);
    } catch (err) {
      console.error(err);
    }
  });

  return () => {
    es.close();
  };
}
