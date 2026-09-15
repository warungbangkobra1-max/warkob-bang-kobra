export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY'
  | 'COMPLETED'
  | 'CANCELLED';

export type PaymentMethod = 'cash' | 'qris' | 'transfer' | 'debit';
export type PaymentStatus = 'unpaid' | 'paid';
export type OrderType = 'dine_in' | 'takeaway';
export type QRType = 'table' | 'area' | 'counter' | 'custom';

export interface Product {
  id: string;
  name: string;
  category: 'Makanan' | 'Minuman' | 'Snack' | 'Sembako' | 'Lainnya';
  price: number;
  costPrice?: number;
  stock: number;
  unit: string;
  imageUrl?: string;
  description?: string;
  isAvailable: boolean;
  barcode?: string;
}

export interface QRCodeData {
  id: string;
  code: string; // e.g. 'meja-01'
  name: string; // e.g. 'Meja 01'
  type: QRType;
  location: string;
  isActive: boolean;
  createdAt: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  note: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  note: string;
  subtotal: number;
}

export interface Order {
  id: string;
  orderNumber: string; // e.g. 'ORD-00125'
  qrCodeId?: string;
  qrCodeName?: string; // e.g. 'Meja 02'
  customerName: string;
  orderType: OrderType;
  tableNumber?: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod?: PaymentMethod;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  customerToken: string; // secure token for client tracking
  notes?: string;
  cashTendered?: number;
  cashChange?: number;
  createdAt: string;
  updatedAt: string;
  paidAt?: string;
}

export interface StoreSettings {
  name: string;
  tagline?: string;
  logo?: string;
  address: string;
  city?: string;
  phone: string;
  whatsapp: string;
  email?: string;
  npwp?: string;
  openTime: string; // '08:00'
  closeTime: string; // '22:00'
  operationalDays?: string[];
  isOpenManualOverride?: boolean | null; // null = follow time, true/false = manual
  closedMessage?: string;
  activePaymentMethods?: PaymentMethod[];
  taxPercentage: number;
  discountPercentage: number;
  serviceChargePercentage?: number;
  priceRounding?: number;
  receiptFooter?: string;
  footerMessage?: string;
  receiptPaperSize?: '58mm' | '80mm';
  receiptShowCashier?: boolean;
  receiptShowTable?: boolean;
  receiptShowHeaderLogo?: boolean;
  receiptAutoCut?: boolean;
  soundNotification?: boolean;
  kitchenAlertSound?: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  username: string;
  role: 'owner' | 'manager' | 'cashier' | 'kitchen';
  avatar?: string;
  phone: string;
  email: string;
  pin: string;
  shiftStartTime: string;
  initialCash: number;
  notes?: string;
  theme?: 'dark' | 'light';
  enableSoundEffects?: boolean;
}

export interface SalesReport {
  totalRevenue: number;
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  averageOrderValue: number;
  paymentBreakdown: Record<PaymentMethod, number>;
  topProducts: { name: string; quantity: number; revenue: number }[];
  hourlyOrders: { hour: string; count: number; revenue: number }[];
}

export interface DashboardSummary {
  todaySales: number;
  todayOrdersCount: number;
  todayItemsSold: number;
  lowStockCount: number;
}

