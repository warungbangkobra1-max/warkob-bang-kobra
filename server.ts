import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Global CORS & preflight options
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});

// In-Memory Database for Warung Bang Kobra
interface ProductEntity {
  id: string;
  name: string;
  category: 'Makanan' | 'Minuman' | 'Snack' | 'Sembako' | 'Lainnya';
  price: number;
  costPrice: number;
  stock: number;
  unit: string;
  imageUrl: string;
  description: string;
  isAvailable: boolean;
  barcode?: string;
}

interface QRCodeEntity {
  id: string;
  code: string;
  name: string;
  type: 'table' | 'area' | 'counter' | 'custom';
  location: string;
  isActive: boolean;
  createdAt: string;
}

interface OrderItemEntity {
  id: string;
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  note: string;
  subtotal: number;
}

interface OrderEntity {
  id: string;
  orderNumber: string;
  qrCodeId?: string;
  qrCodeName?: string;
  customerName: string;
  orderType: 'dine_in' | 'takeaway';
  tableNumber?: string;
  items: OrderItemEntity[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod?: 'cash' | 'qris' | 'transfer' | 'debit';
  paymentStatus: 'unpaid' | 'paid';
  orderStatus: 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';
  customerToken: string;
  notes?: string;
  cashTendered?: number;
  cashChange?: number;
  createdAt: string;
  updatedAt: string;
  paidAt?: string;
}

// Initial Products Data
let products: ProductEntity[] = [
  {
    id: 'p-01',
    name: 'Indomie Goreng Telur Kornet (Internet)',
    category: 'Makanan',
    price: 15000,
    costPrice: 9000,
    stock: 45,
    unit: 'porsi',
    imageUrl: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=500&auto=format&fit=crop&q=80',
    description: 'Indomie goreng legendaris khas warung bang kobra dengan telur mata sapi setengah matang, kornet sapi gurih, dan taburan bawang goreng.',
    isAvailable: true,
    barcode: '89988662001'
  },
  {
    id: 'p-02',
    name: 'Indomie Kuah Soto Spesial Telur',
    category: 'Makanan',
    price: 13000,
    costPrice: 7500,
    stock: 38,
    unit: 'porsi',
    imageUrl: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=500&auto=format&fit=crop&q=80',
    description: 'Indomie soto hangat dengan kuah koya gurih, jeruk nipis segar, cabai rawit ulek, dan telur rebus/ceplok.',
    isAvailable: true,
    barcode: '89988662002'
  },
  {
    id: 'p-03',
    name: 'Indomie Goreng Polos',
    category: 'Makanan',
    price: 8000,
    costPrice: 4000,
    stock: 60,
    unit: 'porsi',
    imageUrl: 'https://images.unsplash.com/photo-1552611052-33e04de081de?w=500&auto=format&fit=crop&q=80',
    description: 'Indomie goreng matang pas dengan bumbu racikan warung mantap.',
    isAvailable: true,
    barcode: '89988662003'
  },
  {
    id: 'p-04',
    name: 'Teh Botol Sosro Dingin',
    category: 'Minuman',
    price: 5000,
    costPrice: 3200,
    stock: 48,
    unit: 'botol',
    imageUrl: 'https://images.unsplash.com/photo-1556881286-fc6915169721?w=500&auto=format&fit=crop&q=80',
    description: 'Teh melati wangi dingin menyegarkan dari kulkas.',
    isAvailable: true,
    barcode: '89988663001'
  },
  {
    id: 'p-05',
    name: 'Es Kopi Susu Kobra / Tubruk',
    category: 'Minuman',
    price: 6000,
    costPrice: 2800,
    stock: 50,
    unit: 'gelas',
    imageUrl: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=500&auto=format&fit=crop&q=80',
    description: 'Kopi hitam mantap Kapal Api diseduh kental khas warkop, manis pas dengan susu kental krimer.',
    isAvailable: true,
    barcode: '89988663002'
  },
  {
    id: 'p-06',
    name: 'Aqua 600ml Dingin',
    category: 'Minuman',
    price: 4000,
    costPrice: 2500,
    stock: 75,
    unit: 'botol',
    imageUrl: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=500&auto=format&fit=crop&q=80',
    description: 'Air mineral pegunungan botol 600ml dingin.',
    isAvailable: true,
    barcode: '89988663003'
  },
  {
    id: 'p-07',
    name: 'Es Teh Manis Jumbo',
    category: 'Minuman',
    price: 4000,
    costPrice: 1500,
    stock: 120,
    unit: 'gelas',
    imageUrl: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop&q=80',
    description: 'Es teh manis segar ukuran jumbo pelepas dahaga.',
    isAvailable: true,
    barcode: '89988663004'
  },
  {
    id: 'p-08',
    name: 'Gorengan Bakwan & Tempe Mendoan (Isi 3)',
    category: 'Snack',
    price: 5000,
    costPrice: 2500,
    stock: 30,
    unit: 'porsi',
    imageUrl: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&auto=format&fit=crop&q=80',
    description: 'Gorengan renyah hangat disajikan dengan cabai rawit hijau segar.',
    isAvailable: true,
    barcode: '89988664001'
  },
  {
    id: 'p-09',
    name: 'Kerupuk Kaleng Putih / Keripik Singkong',
    category: 'Snack',
    price: 2000,
    costPrice: 1000,
    stock: 50,
    unit: 'pcs',
    imageUrl: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=500&auto=format&fit=crop&q=80',
    description: 'Kerupuk renyah kaleng khas warung makan.',
    isAvailable: true,
    barcode: '89988664002'
  },
  {
    id: 'p-10',
    name: 'Roti Bakar Cokelat Keju Susu',
    category: 'Snack',
    price: 14000,
    costPrice: 7000,
    stock: 25,
    unit: 'porsi',
    imageUrl: 'https://images.unsplash.com/photo-1509722747041-616f39b57569?w=500&auto=format&fit=crop&q=80',
    description: 'Roti bakar empuk renyah dengan isian cokelat melimpah, parutan keju gurih, dan kental manis.',
    isAvailable: true,
    barcode: '89988664003'
  },
  {
    id: 'p-11',
    name: 'Beras Ramos Super 5kg',
    category: 'Sembako',
    price: 72000,
    costPrice: 65000,
    stock: 15,
    unit: 'karung',
    imageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&auto=format&fit=crop&q=80',
    description: 'Beras pulen putih bersih kemasan 5kg.',
    isAvailable: true,
    barcode: '89988665001'
  },
  {
    id: 'p-12',
    name: 'Minyak Goreng Sania / Bimoli 1 Liter',
    category: 'Sembako',
    price: 18500,
    costPrice: 16500,
    stock: 22,
    unit: 'pouch',
    imageUrl: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500&auto=format&fit=crop&q=80',
    description: 'Minyak kelapa sawit jernih kualitas terbaik.',
    isAvailable: true,
    barcode: '89988665002'
  },
  {
    id: 'p-13',
    name: 'Gula Pasir Gulaku 1kg',
    category: 'Sembako',
    price: 17500,
    costPrice: 15500,
    stock: 18,
    unit: 'kemasan',
    imageUrl: 'https://images.unsplash.com/photo-1622484216850-252f821d3f3f?w=500&auto=format&fit=crop&q=80',
    description: 'Gula pasir kristal putih higienis 1 kilogram.',
    isAvailable: true,
    barcode: '89988665003'
  },
  {
    id: 'p-14',
    name: 'Rokok Gudang Garam Surya 16',
    category: 'Lainnya',
    price: 35000,
    costPrice: 32500,
    stock: 20,
    unit: 'bungkus',
    imageUrl: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=500&auto=format&fit=crop&q=80',
    description: 'Rokok kretek filter Surya 16 batang cukai resmi.',
    isAvailable: true,
    barcode: '89988666001'
  }
];

// Initial QR Codes - Cukup Order/Kasir Takeaway
let qrCodes: QRCodeEntity[] = [
  {
    id: 'qr-takeaway',
    code: 'kasir-takeaway',
    name: 'Order Kasir Takeaway',
    type: 'counter',
    location: 'Meja Kasir Utama / Area Bawa Pulang',
    isActive: true,
    createdAt: new Date().toISOString()
  }
];

// Store Settings
let storeSettings = {
  name: 'WARUNG BANG KOBRA',
  tagline: 'Kenyang, Gurih, Harga Teman!',
  logo: '🐍',
  address: 'Jl. Pemuda Warkop No. 88',
  city: 'Jakarta Selatan',
  phone: '0812-3456-7890',
  whatsapp: '6281234567890',
  email: 'warungbangkobra@gmail.com',
  npwp: '31.456.789.0-012.000',
  openTime: '08:00',
  closeTime: '23:30',
  operationalDays: ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'],
  isOpenManualOverride: null as boolean | null,
  closedMessage: 'Warung Bang Kobra sedang tutup istirahat. Buka kembali setiap hari pkl 08:00 WIB.',
  activePaymentMethods: ['cash', 'qris', 'transfer', 'debit'] as const,
  taxPercentage: 0,
  discountPercentage: 0,
  serviceChargePercentage: 0,
  priceRounding: 0,
  receiptFooter: 'Terima kasih telah berkunjung ke Warung Bang Kobra! Semoga harimu menyenangkan 🙏',
  receiptPaperSize: '58mm' as '58mm' | '80mm',
  receiptShowCashier: true,
  receiptShowTable: true,
  receiptShowHeaderLogo: true,
  receiptAutoCut: true,
  soundNotification: true,
  kitchenAlertSound: true
};

// Current Active User / Cashier Profile
let userProfile = {
  id: 'usr-01',
  name: 'Bang Kobra (Dimas S.)',
  username: 'owner_kobra',
  role: 'owner' as 'owner' | 'manager' | 'cashier' | 'kitchen',
  avatar: '🐍',
  phone: '0812-3456-7890',
  email: 'bang.kobra.warkop@gmail.com',
  pin: '1234',
  shiftStartTime: new Date().toISOString(),
  initialCash: 350000,
  notes: 'Pemilik & Penanggung Jawab Operasional Warung Bang Kobra',
  theme: 'dark' as 'dark' | 'light',
  enableSoundEffects: true
};

// Initial Orders (realistic recent history)
let orders: OrderEntity[] = [
  {
    id: 'ord-120',
    orderNumber: 'ORD-00120',
    qrCodeId: 'qr-01',
    qrCodeName: 'Meja 01',
    customerName: 'Dimas',
    orderType: 'dine_in',
    tableNumber: 'Meja 01',
    items: [
      {
        id: 'item-1',
        productId: 'p-01',
        productName: 'Indomie Goreng Telur Kornet (Internet)',
        price: 15000,
        quantity: 1,
        note: 'Pedas, cabe rawit 5',
        subtotal: 15000
      },
      {
        id: 'item-2',
        productId: 'p-04',
        productName: 'Teh Botol Sosro Dingin',
        price: 5000,
        quantity: 1,
        note: '',
        subtotal: 5000
      }
    ],
    subtotal: 20000,
    discount: 0,
    tax: 0,
    total: 20000,
    paymentMethod: 'cash',
    paymentStatus: 'paid',
    orderStatus: 'COMPLETED',
    customerToken: 'tok_demo_120',
    notes: '',
    cashTendered: 50000,
    cashChange: 30000,
    createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 2.5).toISOString(),
    paidAt: new Date(Date.now() - 3600000 * 2.5).toISOString()
  },
  {
    id: 'ord-121',
    orderNumber: 'ORD-00121',
    qrCodeId: 'qr-03',
    qrCodeName: 'Meja 03',
    customerName: 'Budi Santoso',
    orderType: 'dine_in',
    tableNumber: 'Meja 03',
    items: [
      {
        id: 'item-3',
        productId: 'p-02',
        productName: 'Indomie Kuah Soto Spesial Telur',
        price: 13000,
        quantity: 2,
        note: 'Telur setengah mateng 1, mateng 1',
        subtotal: 26000
      },
      {
        id: 'item-4',
        productId: 'p-05',
        productName: 'Es Kopi Susu Kobra / Tubruk',
        price: 6000,
        quantity: 2,
        note: 'Gula dikit',
        subtotal: 12000
      }
    ],
    subtotal: 38000,
    discount: 0,
    tax: 0,
    total: 38000,
    paymentMethod: 'qris',
    paymentStatus: 'paid',
    orderStatus: 'COMPLETED',
    customerToken: 'tok_demo_121',
    createdAt: new Date(Date.now() - 3600000 * 1.5).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 1).toISOString(),
    paidAt: new Date(Date.now() - 3600000 * 1).toISOString()
  }
];

let orderCounter = 125;

// ----------------------------------------------------
// PERSISTENT DATABASE ENGINE (File-backed Disk Storage)
// ----------------------------------------------------
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');
const DB_TEMP_FILE = path.join(DATA_DIR, 'database.tmp.json');

function saveDatabase() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const dbPayload = {
      version: '1.0',
      lastSaved: new Date().toISOString(),
      orderCounter,
      storeSettings,
      userProfile,
      qrCodes,
      products,
      orders
    };
    fs.writeFileSync(DB_TEMP_FILE, JSON.stringify(dbPayload, null, 2), 'utf-8');
    fs.renameSync(DB_TEMP_FILE, DB_FILE);
  } catch (err) {
    console.error('[Database] Gagal menyimpan ke disk:', err);
  }
}

function initDatabase() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.products) && parsed.products.length > 0) {
        products = parsed.products;
      }
      if (Array.isArray(parsed.qrCodes) && parsed.qrCodes.length > 0) {
        qrCodes = parsed.qrCodes;
      }
      if (parsed.storeSettings && typeof parsed.storeSettings === 'object') {
        storeSettings = { ...storeSettings, ...parsed.storeSettings };
      }
      if (parsed.userProfile && typeof parsed.userProfile === 'object') {
        userProfile = { ...userProfile, ...parsed.userProfile };
      }
      if (Array.isArray(parsed.orders)) {
        orders = parsed.orders;
      }
      if (typeof parsed.orderCounter === 'number') {
        orderCounter = parsed.orderCounter;
      }
      console.log(`[Database] Database persisten berhasil dimuat dari ${DB_FILE}`);
    } else {
      // First boot: write initial seed data to permanent disk
      saveDatabase();
      console.log(`[Database] Berkas database awal berhasil disimpan ke ${DB_FILE}`);
    }
  } catch (err) {
    console.error('[Database] Gagal membaca berkas database, menggunakan in-memory:', err);
  }
}

// Initialize persistent database immediately on module load
initDatabase();

// Server-Sent Events (SSE) connections for Realtime Updates
const sseClients: Response[] = [];

// SSE Keepalive heartbeat every 15 seconds to prevent reverse-proxy timeouts
setInterval(() => {
  for (let i = sseClients.length - 1; i >= 0; i--) {
    try {
      sseClients[i].write(': keepalive\n\n');
    } catch {
      sseClients.splice(i, 1);
    }
  }
}, 15000);

function broadcastSSE(event: string, data: any) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (let i = sseClients.length - 1; i >= 0; i--) {
    try {
      sseClients[i].write(payload);
    } catch {
      sseClients.splice(i, 1);
    }
  }
}

// Check if store is open
function isStoreOpenNow(): boolean {
  if (storeSettings.isOpenManualOverride !== null) {
    return storeSettings.isOpenManualOverride;
  }
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const [openH, openM] = storeSettings.openTime.split(':').map(Number);
  const [closeH, closeM] = storeSettings.closeTime.split(':').map(Number);
  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;

  if (openMinutes <= closeMinutes) {
    return currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
  } else {
    // Overnight hours (e.g. 17:00 to 02:00)
    return currentMinutes >= openMinutes || currentMinutes <= closeMinutes;
  }
}

// ----------------------------------------------------
// API ROUTES
// ----------------------------------------------------

// SSE Endpoint for Live Updates to Kasir, Kitchen, and Customers
app.get('/api/events', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  // Send initial ping
  res.write(`event: connected\ndata: ${JSON.stringify({ timestamp: Date.now() })}\n\n`);

  sseClients.push(res);

  req.on('close', () => {
    const index = sseClients.indexOf(res);
    if (index !== -1) sseClients.splice(index, 1);
  });
});

// Store Settings
app.get('/api/settings', (req: Request, res: Response) => {
  res.json({
    ...storeSettings,
    isOpen: isStoreOpenNow()
  });
});

app.put('/api/settings', (req: Request, res: Response) => {
  storeSettings = { ...storeSettings, ...req.body };
  saveDatabase();
  broadcastSSE('settings_updated', storeSettings);
  res.json({ success: true, settings: storeSettings });
});

// User / Cashier Profile
app.get('/api/profile', (req: Request, res: Response) => {
  res.json(userProfile);
});

app.put('/api/profile', (req: Request, res: Response) => {
  userProfile = { ...userProfile, ...req.body };
  saveDatabase();
  broadcastSSE('profile_updated', userProfile);
  res.json({ success: true, profile: userProfile });
});

// Full System Backup Export & Restore
app.get('/api/backup/export', (req: Request, res: Response) => {
  res.json({
    version: '1.0',
    exportDate: new Date().toISOString(),
    storeSettings,
    userProfile,
    products,
    qrCodes,
    ordersCount: orders.length,
    orders
  });
});

app.post('/api/backup/restore', (req: Request, res: Response) => {
  try {
    const backup = req.body;
    if (backup.storeSettings) storeSettings = { ...storeSettings, ...backup.storeSettings };
    if (backup.userProfile) userProfile = { ...userProfile, ...backup.userProfile };
    if (Array.isArray(backup.products) && backup.products.length > 0) products = backup.products;
    if (Array.isArray(backup.qrCodes) && backup.qrCodes.length > 0) qrCodes = backup.qrCodes;
    if (Array.isArray(backup.orders)) orders = backup.orders;

    saveDatabase();

    broadcastSSE('settings_updated', storeSettings);
    broadcastSSE('profile_updated', userProfile);
    broadcastSSE('products_updated', products);
    broadcastSSE('orders_updated', orders);
    broadcastSSE('qr_codes_updated', qrCodes);

    res.json({ success: true, message: 'Data cadangan sistem berhasil dipulihkan' });
  } catch (err: any) {
    res.status(400).json({ error: 'Format data cadangan tidak valid' });
  }
});

// Products
app.get('/api/products', (req: Request, res: Response) => {
  res.json(products);
});

app.post('/api/products', (req: Request, res: Response) => {
  const { name, category, price, costPrice, stock, unit, imageUrl, description, barcode } = req.body;
  if (!name || price == null) {
    res.status(400).json({ error: 'Nama dan harga produk wajib diisi' });
    return;
  }
  const newProduct: ProductEntity = {
    id: `p-${Date.now()}`,
    name,
    category: category || 'Makanan',
    price: Number(price),
    costPrice: Number(costPrice || price * 0.7),
    stock: Number(stock || 0),
    unit: unit || 'porsi',
    imageUrl: imageUrl || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=500&auto=format&fit=crop&q=80',
    description: description || '',
    isAvailable: Number(stock) > 0,
    barcode: barcode || ''
  };
  products.unshift(newProduct);
  saveDatabase();
  broadcastSSE('products_updated', products);
  res.status(201).json(newProduct);
});

app.put('/api/products/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const index = products.findIndex((p) => p.id === id);
  if (index === -1) {
    res.status(404).json({ error: 'Produk tidak ditemukan' });
    return;
  }
  const updated = {
    ...products[index],
    ...req.body,
    isAvailable: req.body.stock !== undefined ? req.body.stock > 0 : products[index].isAvailable
  };
  products[index] = updated;
  saveDatabase();
  broadcastSSE('products_updated', products);
  res.json(updated);
});

app.delete('/api/products/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  products = products.filter((p) => p.id !== id);
  saveDatabase();
  broadcastSSE('products_updated', products);
  res.json({ success: true });
});

// QR Code Management
app.get('/api/qr-codes', (req: Request, res: Response) => {
  res.json(qrCodes);
});

app.get('/api/qr-codes/:code', (req: Request, res: Response) => {
  const { code } = req.params;
  const qr = qrCodes.find((q) => q.code.toLowerCase() === code.toLowerCase() || q.id === code);
  if (!qr) {
    res.status(404).json({ error: 'QR Code tidak ditemukan' });
    return;
  }
  res.json(qr);
});

app.post('/api/qr-codes', (req: Request, res: Response) => {
  const { name, type, location, code } = req.body;
  if (!name) {
    res.status(400).json({ error: 'Nama QR Code wajib diisi' });
    return;
  }
  const cleanCode = (code || name)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  const newQR: QRCodeEntity = {
    id: `qr-${Date.now()}`,
    code: cleanCode,
    name,
    type: type || 'table',
    location: location || 'Area Warung',
    isActive: true,
    createdAt: new Date().toISOString()
  };
  qrCodes.push(newQR);
  saveDatabase();
  broadcastSSE('qr_updated', qrCodes);
  res.status(201).json(newQR);
});

app.put('/api/qr-codes/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const index = qrCodes.findIndex((q) => q.id === id);
  if (index === -1) {
    res.status(404).json({ error: 'QR Code tidak ditemukan' });
    return;
  }
  qrCodes[index] = { ...qrCodes[index], ...req.body };
  saveDatabase();
  broadcastSSE('qr_updated', qrCodes);
  res.json(qrCodes[index]);
});

app.delete('/api/qr-codes/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  qrCodes = qrCodes.filter((q) => q.id !== id);
  saveDatabase();
  broadcastSSE('qr_updated', qrCodes);
  res.json({ success: true });
});

// Orders Endpoint
app.get('/api/orders', (req: Request, res: Response) => {
  const { status, type } = req.query;
  let result = [...orders];
  if (status) {
    result = result.filter((o) => o.orderStatus === status);
  }
  if (type) {
    result = result.filter((o) => o.orderType === type);
  }
  // Sort latest first
  result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json(result);
});

// Customer Tracking by Token (Public, secure token)
app.get('/api/order-status', (req: Request, res: Response) => {
  res.status(400).json({ error: 'Token pesanan wajib disertakan' });
});

app.get('/api/order-status/:token', (req: Request, res: Response) => {
  const token = req.params.token?.trim();
  if (!token) {
    res.status(400).json({ error: 'Token pesanan wajib disertakan' });
    return;
  }
  const order = orders.find((o) => o.customerToken === token || o.orderNumber === token);
  if (!order) {
    res.status(404).json({ error: 'Pesanan tidak ditemukan atau token tidak valid' });
    return;
  }
  res.json(order);
});

// CREATE ORDER (From Customer QR or Direct POS)
app.post('/api/orders', (req: Request, res: Response) => {
  const {
    qrCode,
    customerName,
    orderType,
    tableNumber,
    items,
    notes,
    paymentMethod,
    isDirectKasir
  } = req.body;

  // 1. Check Store Operational Status
  if (!isDirectKasir && !isStoreOpenNow()) {
    res.status(403).json({
      error: 'Saat ini warung sedang tutup.',
      openTime: storeSettings.openTime,
      closeTime: storeSettings.closeTime
    });
    return;
  }

  // 2. Validate QR Code if provided
  let validatedQR: QRCodeEntity | undefined;
  if (qrCode) {
    validatedQR = qrCodes.find(
      (q) => q.code.toLowerCase() === String(qrCode).toLowerCase() || q.id === qrCode
    );
    if (!validatedQR) {
      res.status(400).json({ error: 'QR Code tidak valid atau tidak terdaftar' });
      return;
    }
    if (!validatedQR.isActive) {
      res.status(403).json({
        error: 'QR TIDAK AKTIF',
        message: 'Silakan gunakan QR lainnya atau hubungi petugas warung.'
      });
      return;
    }
  }

  // 3. Validate Items & Stock & Recalculate Subtotal Server-Side!
  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: 'Keranjang belanja tidak boleh kosong' });
    return;
  }

  const calculatedItems: OrderItemEntity[] = [];
  let calculatedSubtotal = 0;

  for (const item of items) {
    const product = products.find((p) => p.id === item.productId);
    if (!product) {
      res.status(400).json({ error: `Produk dengan ID ${item.productId} tidak ditemukan` });
      return;
    }

    const requestedQty = Math.max(1, Number(item.quantity) || 1);

    // Stock verification
    if (product.stock < requestedQty) {
      res.status(400).json({
        error: `Stok untuk "${product.name}" tidak mencukupi (sisa: ${product.stock}, diminta: ${requestedQty})`,
        outOfStockProductId: product.id
      });
      return;
    }

    const itemSubtotal = product.price * requestedQty;
    calculatedSubtotal += itemSubtotal;

    calculatedItems.push({
      id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      productId: product.id,
      productName: product.name,
      price: product.price, // STRICT SERVER PRICE
      quantity: requestedQty,
      note: item.note || '',
      subtotal: itemSubtotal
    });
  }

  // Calculate taxes and discounts
  const discount = Math.round((calculatedSubtotal * (storeSettings.discountPercentage || 0)) / 100);
  const taxableAmount = calculatedSubtotal - discount;
  const tax = Math.round((taxableAmount * (storeSettings.taxPercentage || 0)) / 100);
  const total = taxableAmount + tax;

  orderCounter++;
  const orderNumber = `ORD-${String(orderCounter).padStart(5, '0')}`;
  const customerToken = 'tok_' + crypto.randomBytes(12).toString('hex');

  const resolvedTable =
    tableNumber ||
    (validatedQR?.type === 'table' ? validatedQR.name : undefined);

  const initialStatus = isDirectKasir ? 'CONFIRMED' : 'PENDING';
  const initialPaymentStatus = isDirectKasir && paymentMethod ? 'paid' : 'unpaid';

  // Reserve/deduct stock immediately if confirmed by Kasir
  if (initialStatus === 'CONFIRMED') {
    for (const item of calculatedItems) {
      const p = products.find((prod) => prod.id === item.productId);
      if (p) {
        p.stock = Math.max(0, p.stock - item.quantity);
        if (p.stock === 0) p.isAvailable = false;
      }
    }
  }

  const newOrder: OrderEntity = {
    id: `ord-${Date.now()}`,
    orderNumber,
    qrCodeId: validatedQR?.id,
    qrCodeName: validatedQR?.name,
    customerName: customerName ? String(customerName).trim() : 'Pelanggan ' + (resolvedTable || 'Warung'),
    orderType: orderType || (resolvedTable ? 'dine_in' : 'takeaway'),
    tableNumber: resolvedTable,
    items: calculatedItems,
    subtotal: calculatedSubtotal,
    discount,
    tax,
    total,
    paymentMethod: paymentMethod || undefined,
    paymentStatus: initialPaymentStatus,
    orderStatus: initialStatus,
    customerToken,
    notes: notes || '',
    cashTendered: req.body.cashTendered,
    cashChange: req.body.cashChange,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    paidAt: initialPaymentStatus === 'paid' ? new Date().toISOString() : undefined
  };

  orders.unshift(newOrder);
  saveDatabase();

  // Broadcast to Kasir and Kitchen
  broadcastSSE('new_order', newOrder);
  if (initialStatus === 'CONFIRMED') {
    broadcastSSE('products_updated', products);
  }

  res.status(201).json(newOrder);
});

// Update Order Status (Kasir & Kitchen)
app.put('/api/orders/:id/status', (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;
  const order = orders.find((o) => o.id === id || o.orderNumber === id);
  if (!order) {
    res.status(404).json({ error: 'Pesanan tidak ditemukan' });
    return;
  }

  const prevStatus = order.orderStatus;
  const newStatus = status;

  // Deduct stock if transitioning from PENDING -> CONFIRMED
  if (prevStatus === 'PENDING' && newStatus === 'CONFIRMED') {
    for (const item of order.items) {
      const p = products.find((prod) => prod.id === item.productId);
      if (p) {
        p.stock = Math.max(0, p.stock - item.quantity);
        if (p.stock === 0) p.isAvailable = false;
      }
    }
    broadcastSSE('products_updated', products);
  }

  // Restore stock if CANCELLED after stock was deducted
  if (prevStatus !== 'PENDING' && prevStatus !== 'CANCELLED' && newStatus === 'CANCELLED') {
    for (const item of order.items) {
      const p = products.find((prod) => prod.id === item.productId);
      if (p) {
        p.stock += item.quantity;
        p.isAvailable = true;
      }
    }
    broadcastSSE('products_updated', products);
  }

  order.orderStatus = newStatus;
  order.updatedAt = new Date().toISOString();

  // If marked COMPLETED and was unpaid cash, can be marked paid
  if (newStatus === 'COMPLETED' && order.paymentStatus === 'unpaid' && req.body.autoMarkPaid) {
    order.paymentStatus = 'paid';
    order.paidAt = new Date().toISOString();
  }

  saveDatabase();
  broadcastSSE('order_updated', order);
  res.json(order);
});

// Process Payment (Cash, QRIS, Transfer, Debit)
app.post('/api/orders/:id/pay', (req: Request, res: Response) => {
  const { id } = req.params;
  const { paymentMethod, cashTendered } = req.body;
  const order = orders.find((o) => o.id === id || o.orderNumber === id);
  if (!order) {
    res.status(404).json({ error: 'Pesanan tidak ditemukan' });
    return;
  }

  if (paymentMethod === 'cash') {
    const tendered = Number(cashTendered || 0);
    if (tendered < order.total) {
      res.status(400).json({ error: 'Uang tunai kurang dari total tagihan' });
      return;
    }
    order.cashTendered = tendered;
    order.cashChange = tendered - order.total;
  }

  order.paymentMethod = paymentMethod;
  order.paymentStatus = 'paid';
  order.paidAt = new Date().toISOString();
  order.updatedAt = new Date().toISOString();

  // If order was PENDING, auto confirm
  if (order.orderStatus === 'PENDING') {
    order.orderStatus = 'CONFIRMED';
    // deduct stock
    for (const item of order.items) {
      const p = products.find((prod) => prod.id === item.productId);
      if (p) {
        p.stock = Math.max(0, p.stock - item.quantity);
        if (p.stock === 0) p.isAvailable = false;
      }
    }
    broadcastSSE('products_updated', products);
  }

  saveDatabase();
  broadcastSSE('order_updated', order);
  res.json(order);
});

// Reports & Statistics
app.get('/api/reports', (req: Request, res: Response) => {
  const completed = orders.filter((o) => o.paymentStatus === 'paid' && o.orderStatus !== 'CANCELLED');
  const totalRevenue = completed.reduce((acc, o) => acc + o.total, 0);
  const totalOrders = orders.length;
  const completedOrders = completed.length;
  const cancelledOrders = orders.filter((o) => o.orderStatus === 'CANCELLED').length;
  const averageOrderValue = completedOrders > 0 ? Math.round(totalRevenue / completedOrders) : 0;

  const paymentBreakdown = {
    cash: 0,
    qris: 0,
    transfer: 0,
    debit: 0
  };

  completed.forEach((o) => {
    if (o.paymentMethod && paymentBreakdown[o.paymentMethod] !== undefined) {
      paymentBreakdown[o.paymentMethod] += o.total;
    }
  });

  // Top Products
  const productCountMap: Record<string, { name: string; quantity: number; revenue: number }> = {};
  completed.forEach((o) => {
    o.items.forEach((item) => {
      if (!productCountMap[item.productId]) {
        productCountMap[item.productId] = { name: item.productName, quantity: 0, revenue: 0 };
      }
      productCountMap[item.productId].quantity += item.quantity;
      productCountMap[item.productId].revenue += item.subtotal;
    });
  });

  const topProducts = Object.values(productCountMap).sort((a, b) => b.quantity - a.quantity).slice(0, 5);

  res.json({
    totalRevenue,
    totalOrders,
    completedOrders,
    cancelledOrders,
    averageOrderValue,
    paymentBreakdown,
    topProducts
  });
});

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    store: storeSettings.name,
    isOpen: isStoreOpenNow(),
    totalProducts: products.length,
    totalOrders: orders.length
  });
});

// Database Status & Persistence Management Endpoints
app.get('/api/database/status', (req: Request, res: Response) => {
  let sizeBytes = 0;
  let exists = false;
  let lastModified: string | null = null;
  try {
    if (fs.existsSync(DB_FILE)) {
      exists = true;
      const stat = fs.statSync(DB_FILE);
      sizeBytes = stat.size;
      lastModified = stat.mtime.toISOString();
    }
  } catch {}

  res.json({
    status: 'connected',
    isPersistent: true,
    storageType: 'file_json',
    filePath: 'data/database.json',
    exists,
    sizeBytes,
    totalProducts: products.length,
    totalOrders: orders.length,
    lastModified: lastModified || new Date().toISOString()
  });
});

app.post('/api/database/sync', (req: Request, res: Response) => {
  saveDatabase();
  res.json({
    success: true,
    message: 'Database berhasil disinkronkan ke penyimpanan permanen disk',
    lastSaved: new Date().toISOString()
  });
});

app.get('/api/database/download', (req: Request, res: Response) => {
  saveDatabase();
  if (fs.existsSync(DB_FILE)) {
    res.download(DB_FILE, `warung-kobra-db-${new Date().toISOString().slice(0, 10)}.json`);
  } else {
    res.status(404).json({ error: 'Berkas database belum tersedia' });
  }
});

// Explicit 404 for unmatched /api routes to prevent Vite SPA HTML fallback from returning HTML to API callers
app.all('/api/*', (req: Request, res: Response) => {
  res.status(404).json({ error: `API endpoint ${req.method} ${req.path} tidak ditemukan` });
});
app.all('/api', (req: Request, res: Response) => {
  res.status(404).json({ error: 'API route tidak ditemukan' });
});

// Start Server with Vite Middleware in Development
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Warung Bang Kobra server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
