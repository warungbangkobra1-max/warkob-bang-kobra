import { Product, QRCodeData, Order, StoreSettings, SalesReport, OrderStatus, PaymentMethod, DashboardSummary, UserProfile } from '../types';

const BASE_URL = '/api';

/**
 * Safe response handler that ensures responses are JSON before parsing,
 * preventing 'Unexpected token <' HTML parse crashes when encountering 404/500 proxy responses.
 */
async function handleResponse<T>(res: Response, fallbackErrMsg: string): Promise<T> {
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    if (!res.ok) {
      throw new Error(`${fallbackErrMsg} (${res.status} ${res.statusText})`);
    }
    throw new Error('Respons server tidak valid (bukan JSON)');
  }
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || data.message || fallbackErrMsg);
  }
  return data;
}

export async function fetchSettings(): Promise<StoreSettings & { isOpen: boolean }> {
  const res = await fetch(`${BASE_URL}/settings`);
  return handleResponse<StoreSettings & { isOpen: boolean }>(res, 'Gagal memuat pengaturan toko');
}

export async function updateSettings(settings: Partial<StoreSettings>): Promise<{ success: boolean; settings: StoreSettings }> {
  const res = await fetch(`${BASE_URL}/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings)
  });
  return handleResponse<{ success: boolean; settings: StoreSettings }>(res, 'Gagal memperbarui pengaturan');
}

export async function fetchProfile(): Promise<UserProfile> {
  const res = await fetch(`${BASE_URL}/profile`);
  return handleResponse<UserProfile>(res, 'Gagal memuat profil');
}

export async function updateProfile(profile: Partial<UserProfile>): Promise<{ success: boolean; profile: UserProfile }> {
  const res = await fetch(`${BASE_URL}/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile)
  });
  return handleResponse<{ success: boolean; profile: UserProfile }>(res, 'Gagal memperbarui profil');
}

export async function exportBackupData(): Promise<any> {
  const res = await fetch(`${BASE_URL}/backup/export`);
  return handleResponse<any>(res, 'Gagal mengekspor data cadangan');
}

export async function restoreBackupData(backupData: any): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${BASE_URL}/backup/restore`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(backupData)
  });
  return handleResponse<{ success: boolean; message: string }>(res, 'Gagal memulihkan data');
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
  return handleResponse<DatabaseStatus>(res, 'Gagal memeriksa status database');
}

export async function syncDatabase(): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${BASE_URL}/database/sync`, { method: 'POST' });
  return handleResponse<{ success: boolean; message: string }>(res, 'Gagal menyinkronkan database');
}

export async function fetchProducts(): Promise<Product[]> {
  const res = await fetch(`${BASE_URL}/products`);
  return handleResponse<Product[]>(res, 'Gagal memuat data produk');
}

export async function createProduct(product: Partial<Product>): Promise<Product> {
  const res = await fetch(`${BASE_URL}/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(product)
  });
  return handleResponse<Product>(res, 'Gagal menambahkan produk');
}

export async function updateProduct(id: string, product: Partial<Product>): Promise<Product> {
  const res = await fetch(`${BASE_URL}/products/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(product)
  });
  return handleResponse<Product>(res, 'Gagal mengupdate produk');
}

export async function deleteProduct(id: string): Promise<{ success: boolean }> {
  const res = await fetch(`${BASE_URL}/products/${id}`, {
    method: 'DELETE'
  });
  return handleResponse<{ success: boolean }>(res, 'Gagal menghapus produk');
}

export async function fetchQRCodes(): Promise<QRCodeData[]> {
  const res = await fetch(`${BASE_URL}/qr-codes`);
  return handleResponse<QRCodeData[]>(res, 'Gagal memuat data QR Code');
}

export async function fetchQRCodeByCode(code: string): Promise<QRCodeData> {
  if (!code || !code.trim()) {
    throw new Error('Kode QR tidak boleh kosong');
  }
  const res = await fetch(`${BASE_URL}/qr-codes/${encodeURIComponent(code.trim())}`);
  return handleResponse<QRCodeData>(res, 'QR Code tidak ditemukan');
}

export async function createQRCode(data: Partial<QRCodeData>): Promise<QRCodeData> {
  const res = await fetch(`${BASE_URL}/qr-codes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return handleResponse<QRCodeData>(res, 'Gagal membuat QR Code');
}

export async function updateQRCode(id: string, data: Partial<QRCodeData>): Promise<QRCodeData> {
  const res = await fetch(`${BASE_URL}/qr-codes/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return handleResponse<QRCodeData>(res, 'Gagal memperbarui QR Code');
}

export async function deleteQRCode(id: string): Promise<{ success: boolean }> {
  const res = await fetch(`${BASE_URL}/qr-codes/${id}`, {
    method: 'DELETE'
  });
  return handleResponse<{ success: boolean }>(res, 'Gagal menghapus QR Code');
}

export async function fetchOrders(params?: { status?: string; type?: string }): Promise<Order[]> {
  const query = new URLSearchParams();
  if (params?.status) query.set('status', params.status);
  if (params?.type) query.set('type', params.type);
  const res = await fetch(`${BASE_URL}/orders?${query.toString()}`);
  return handleResponse<Order[]>(res, 'Gagal memuat pesanan');
}

export async function fetchOrderStatus(token: string): Promise<Order> {
  if (!token || !token.trim()) {
    throw new Error('Token pesanan wajib diisi');
  }
  const res = await fetch(`${BASE_URL}/order-status/${encodeURIComponent(token.trim())}`);
  return handleResponse<Order>(res, 'Pesanan tidak ditemukan');
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

  const contentType = res.headers.get('content-type') || '';
  let data: any = {};
  if (contentType.includes('application/json')) {
    data = await res.json().catch(() => ({}));
  }

  if (!res.ok) {
    const errorMsg = data.error || data.message || `Gagal mengirim pesanan (${res.status})`;
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
  return handleResponse<Order>(res, 'Gagal mengupdate status pesanan');
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
  return handleResponse<Order>(res, 'Gagal memproses pembayaran');
}

export async function fetchReports(): Promise<SalesReport> {
  const res = await fetch(`${BASE_URL}/reports`);
  return handleResponse<SalesReport>(res, 'Gagal memuat laporan');
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

  es.onerror = () => {
    // EventSource will automatically attempt reconnection; suppress unhandled logging
  };

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
