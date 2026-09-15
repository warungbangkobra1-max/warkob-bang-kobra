import React, { useState, useEffect, useRef } from 'react';
import {
  ShoppingCart,
  Search,
  Bell,
  Check,
  X,
  CreditCard,
  QrCode,
  DollarSign,
  Printer,
  Trash2,
  Plus,
  Minus,
  Utensils,
  ShoppingBag,
  Sparkles,
  Volume2,
  VolumeX,
  AlertCircle
} from 'lucide-react';
import { Product, Order, StoreSettings, CartItem, PaymentMethod } from '../types';
import { fetchProducts, fetchOrders, submitOrder, updateOrderStatus, processPayment } from '../lib/api';
import { formatIDR, formatDate, formatTime } from '../lib/utils';
import { playNewOrderChime, playSuccessChime } from '../lib/audio';
import { ReceiptModal } from './ReceiptModal';

interface CashierViewProps {
  settings: StoreSettings;
}

export const CashierView: React.FC<CashierViewProps> = ({ settings }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [search, setSearch] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Active Direct Cart
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [orderType, setOrderType] = useState<'dine_in' | 'takeaway'>('dine_in');
  const [tableNumber, setTableNumber] = useState('Kasir Walk-in');

  // Modals
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('cash');
  const [cashTendered, setCashTendered] = useState<number | ''>('');
  const [activeTab, setActiveTab] = useState<'pos' | 'incoming'>('pos');
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Audio alert tracker for pending orders
  const prevPendingCount = useRef(0);

  const loadData = async () => {
    try {
      setLoading(true);
      const [prodData, orderData] = await Promise.all([fetchProducts(), fetchOrders()]);
      setProducts(prodData);
      setOrders(orderData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(async () => {
      try {
        const orderData = await fetchOrders();
        const pendingCount = orderData.filter((o) => o.orderStatus === 'PENDING').length;

        if (pendingCount > prevPendingCount.current && soundEnabled) {
          playNewOrderChime();
        }
        prevPendingCount.current = pendingCount;
        setOrders(orderData);
      } catch (e) {
        console.error(e);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [soundEnabled]);

  // Keyboard Shortcuts: F2 for Search, F9 for Pay, Esc to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'F9') {
        e.preventDefault();
        if (cart.length > 0) {
          setShowPaymentModal(true);
        }
      } else if (e.key === 'Escape') {
        setShowPaymentModal(false);
        setReceiptOrder(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart]);

  // Cart operations
  const addToCart = (product: Product) => {
    if (product.stock <= 0) return;
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          alert(`Stok hanya tersisa ${product.stock}`);
          return prev;
        }
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1, note: '' }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.product.id === productId) {
            const nextQty = item.quantity + delta;
            if (nextQty > item.product.stock) {
              alert(`Maksimal stok ${item.product.stock}`);
              return item;
            }
            return { ...item, quantity: nextQty };
          }
          return item;
        })
        .filter((item) => item.quantity > 0);
    });
  };

  const updateNote = (productId: string, note: string) => {
    setCart((prev) =>
      prev.map((item) => (item.product.id === productId ? { ...item, note } : item))
    );
  };

  const clearCart = () => {
    setCart([]);
    setCustomerName('');
    setCashTendered('');
  };

  // Calculations
  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const discount = Math.round((subtotal * (settings.discountPercentage || 0)) / 100);
  const tax = Math.round(((subtotal - discount) * (settings.taxPercentage || 0)) / 100);
  const total = subtotal - discount + tax;

  const numericTendered = Number(cashTendered) || 0;
  const change = selectedPaymentMethod === 'cash' ? Math.max(0, numericTendered - total) : 0;
  const isCashSufficient = selectedPaymentMethod !== 'cash' || numericTendered >= total;

  // Process Direct POS Checkout
  const handleCheckoutDirect = async () => {
    if (cart.length === 0) return;
    if (!isCashSufficient) {
      alert('Uang tunai kurang dari total belanja');
      return;
    }

    try {
      const order = await submitOrder({
        customerName: customerName || 'Pelanggan Kasir',
        orderType,
        tableNumber: orderType === 'dine_in' ? tableNumber : 'Takeaway',
        items: cart.map((i) => ({
          productId: i.product.id,
          quantity: i.quantity,
          note: i.note
        })),
        paymentMethod: selectedPaymentMethod,
        cashTendered: selectedPaymentMethod === 'cash' ? numericTendered : undefined,
        cashChange: selectedPaymentMethod === 'cash' ? change : undefined,
        isDirectKasir: true
      });

      playSuccessChime();
      setShowPaymentModal(false);
      setReceiptOrder(order);
      clearCart();
      loadData();
    } catch (err: any) {
      alert(err.message || 'Gagal memproses transaksi');
    }
  };

  // Accept QR Order from Incoming List
  const handleAcceptOrder = async (order: Order) => {
    try {
      const updated = await updateOrderStatus(order.id, 'CONFIRMED');
      playSuccessChime();
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      loadData(); // refreshes stock
    } catch (err: any) {
      alert(err.message || 'Gagal menerima pesanan');
    }
  };

  // Reject QR Order
  const handleRejectOrder = async (order: Order) => {
    if (!confirm(`Tolak pesanan ${order.orderNumber}?`)) return;
    try {
      const updated = await updateOrderStatus(order.id, 'CANCELLED');
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
    } catch (err: any) {
      alert(err.message || 'Gagal menolak pesanan');
    }
  };

  // Pay unpaid QR Order at Cashier
  const handlePayQrOrder = async (order: Order, method: PaymentMethod, tendered?: number) => {
    try {
      const updated = await processPayment(order.id, {
        paymentMethod: method,
        cashTendered: tendered
      });
      playSuccessChime();
      setReceiptOrder(updated);
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
    } catch (err: any) {
      alert(err.message || 'Gagal memproses pembayaran');
    }
  };

  const pendingOrders = orders.filter((o) => o.orderStatus === 'PENDING');
  const activeUnpaidOrders = orders.filter(
    (o) => o.paymentStatus === 'unpaid' && o.orderStatus !== 'CANCELLED' && o.orderStatus !== 'PENDING'
  );

  const categories = ['Semua', 'Makanan', 'Minuman', 'Snack', 'Sembako', 'Lainnya'];
  const filteredProducts = products.filter((p) => {
    const matchCat = selectedCategory === 'Semua' || p.category === selectedCategory;
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.barcode && p.barcode.includes(search));
    return matchCat && matchSearch;
  });

  return (
    <div className="space-y-4">
      {/* Top Banner & Mode Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-800/80 border border-slate-700/70 p-3.5 rounded-2xl">
        <div className="flex items-center gap-3">
          <button
            id="tab-pos-register"
            onClick={() => setActiveTab('pos')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'pos'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'bg-slate-700/60 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            Kasir Transaksi Cepat
          </button>

          <button
            id="tab-incoming-orders"
            onClick={() => setActiveTab('incoming')}
            className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'incoming'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'bg-slate-700/60 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Bell className={`w-4 h-4 ${pendingOrders.length > 0 ? 'animate-bounce text-amber-400' : ''}`} />
            Pesanan Masuk QR
            {pendingOrders.length > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white animate-pulse">
                {pendingOrders.length}
              </span>
            )}
          </button>
        </div>

        {/* Hotkeys & Sound info */}
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span className="hidden md:inline-flex items-center gap-2 text-[11px] font-mono text-slate-400">
            <kbd className="px-1.5 py-0.5 bg-slate-900 border border-slate-700 rounded text-emerald-400">F2</kbd> Cari
            <kbd className="px-1.5 py-0.5 bg-slate-900 border border-slate-700 rounded text-emerald-400">F9</kbd> Bayar
          </span>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-300 text-xs transition"
          >
            {soundEnabled ? (
              <>
                <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Suara Aktif</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5 text-slate-500" />
                <span>Mute</span>
              </>
            )}
          </button>
        </div>
      </div>

      {activeTab === 'incoming' ? (
        /* ================= INCOMING QR ORDERS SCREEN ================= */
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Bell className="w-5 h-5 text-amber-400" />
                Daftar Pesanan Masuk dari QR Pelanggan
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Setiap pelanggan memesan via QR meja/area, pesanan otomatis tampil di sini secara real-time.
              </p>
            </div>
            <span className="text-xs text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-xl">
              ● Live Sync Aktif
            </span>
          </div>

          {/* Pending Orders Waiting for Approval */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              Menunggu Persetujuan Kasir ({pendingOrders.length})
            </h4>

            {pendingOrders.length === 0 ? (
              <div className="p-8 text-center bg-slate-800/40 rounded-2xl border border-dashed border-slate-700 text-slate-500 text-xs">
                Belum ada pesanan QR baru yang menunggu. Ketika pelanggan scan QR dan klik kirim, pesanan langsung muncul di sini.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingOrders.map((order) => (
                  <div
                    key={order.id}
                    id={`incoming-order-${order.id}`}
                    className="bg-slate-800 border-2 border-amber-500/60 rounded-2xl p-5 shadow-xl flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-mono font-bold text-amber-400">
                          {order.orderNumber}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {formatTime(order.createdAt)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between bg-slate-900/80 px-3 py-2 rounded-xl mb-3">
                        <div className="font-bold text-sm text-white flex items-center gap-1.5">
                          <span className="text-emerald-400">📍</span>
                          {order.tableNumber || 'Area Warung'}
                        </div>
                        <span className="text-xs text-slate-300">{order.customerName}</span>
                      </div>

                      {/* Items */}
                      <div className="space-y-2 border-t border-slate-700/60 pt-2 text-xs">
                        {order.items.map((item) => (
                          <div key={item.id} className="flex justify-between items-start">
                            <div className="leading-snug">
                              <span className="font-semibold text-white">
                                {item.quantity}x {item.productName}
                              </span>
                              {item.note && (
                                <p className="text-[11px] text-amber-300 italic">
                                  Catatan: {item.note}
                                </p>
                              )}
                            </div>
                            <span className="text-slate-400 font-mono">
                              {formatIDR(item.subtotal)}
                            </span>
                          </div>
                        ))}
                      </div>

                      {order.notes && (
                        <div className="mt-2 text-[11px] text-amber-200/90 bg-amber-500/10 p-2 rounded-lg italic">
                          Catatan Umum: {order.notes}
                        </div>
                      )}

                      <div className="mt-4 pt-3 border-t border-slate-700/60 flex justify-between items-center text-sm font-bold text-white">
                        <span>Total Pesanan:</span>
                        <span className="text-base text-emerald-400 font-mono font-black">
                          {formatIDR(order.total)}
                        </span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="mt-5 grid grid-cols-2 gap-2 pt-2">
                      <button
                        id={`btn-accept-${order.id}`}
                        onClick={() => handleAcceptOrder(order)}
                        className="py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20"
                      >
                        <Check className="w-4 h-4" />
                        Terima Pesanan
                      </button>
                      <button
                        id={`btn-reject-${order.id}`}
                        onClick={() => handleRejectOrder(order)}
                        className="py-2.5 rounded-xl bg-slate-700 hover:bg-rose-600/80 text-rose-300 hover:text-white font-semibold text-xs transition flex items-center justify-center gap-1.5"
                      >
                        <X className="w-4 h-4" />
                        Tolak
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Orders Needing Cashier Payment */}
          <div className="space-y-3 pt-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Pesanan Sedang Aktif / Belum Lunas ({activeUnpaidOrders.length})
            </h4>

            {activeUnpaidOrders.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeUnpaidOrders.map((order) => (
                  <div
                    key={order.id}
                    className="bg-slate-800/90 border border-slate-700 rounded-2xl p-4 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-mono font-bold text-slate-300">{order.orderNumber}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 uppercase">
                          {order.orderStatus}
                        </span>
                      </div>
                      <div className="flex justify-between items-center mb-3 text-xs">
                        <span className="font-bold text-white">{order.tableNumber || 'Takeaway'}</span>
                        <span className="text-slate-400">{order.customerName}</span>
                      </div>
                      <div className="text-xs space-y-1 border-t border-slate-700/60 pt-2 text-slate-300">
                        {order.items.map((it) => (
                          <div key={it.id} className="flex justify-between">
                            <span>{it.quantity}x {it.productName}</span>
                            <span className="font-mono">{formatIDR(it.subtotal)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 pt-2 border-t border-slate-700 flex justify-between font-bold text-sm">
                        <span>Total:</span>
                        <span className="text-emerald-400 font-mono">{formatIDR(order.total)}</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-2 flex gap-2">
                      <button
                        onClick={() => handlePayQrOrder(order, 'cash', order.total)}
                        className="flex-1 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition"
                      >
                        Bayar Cash Lunas
                      </button>
                      <button
                        onClick={() => handlePayQrOrder(order, 'qris')}
                        className="py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition"
                      >
                        QRIS
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ================= MAIN RAPID POS REGISTER ================= */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Products Grid (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Search and Category Filter */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Cari menu, snack, minuman (Tekan F2)..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                      selectedCategory === cat
                        ? 'bg-emerald-500 text-slate-950 shadow-sm'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-750 border border-slate-700'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Products Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[680px] overflow-y-auto pr-1">
              {filteredProducts.map((product) => {
                const isOutOfStock = product.stock <= 0;
                return (
                  <div
                    key={product.id}
                    id={`pos-product-${product.id}`}
                    onClick={() => !isOutOfStock && addToCart(product)}
                    className={`group rounded-2xl border p-3 flex flex-col justify-between transition cursor-pointer select-none bg-slate-800/90 ${
                      isOutOfStock
                        ? 'border-slate-800 opacity-50 cursor-not-allowed'
                        : 'border-slate-700/80 hover:border-emerald-500/60 hover:shadow-lg hover:shadow-emerald-500/5'
                    }`}
                  >
                    <div>
                      <div className="aspect-video w-full rounded-xl overflow-hidden bg-slate-700 mb-2 relative">
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                          loading="lazy"
                        />
                        {isOutOfStock ? (
                          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center">
                            <span className="text-[10px] font-bold text-rose-400 bg-rose-950/80 px-2 py-0.5 rounded-md">
                              Habis
                            </span>
                          </div>
                        ) : (
                          <span className="absolute bottom-1.5 right-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-900/80 text-emerald-400">
                            Stok: {product.stock}
                          </span>
                        )}
                      </div>

                      <h4 className="font-bold text-xs text-white line-clamp-2 leading-snug">
                        {product.name}
                      </h4>
                    </div>

                    <div className="mt-2 pt-2 border-t border-slate-700/50 flex items-center justify-between">
                      <span className="font-mono font-bold text-emerald-400 text-xs">
                        {formatIDR(product.price)}
                      </span>
                      <button
                        type="button"
                        disabled={isOutOfStock}
                        className="p-1 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-slate-950 transition disabled:opacity-30"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Active Cart / POS Bill (5 cols) */}
          <div className="lg:col-span-5 bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 shadow-xl flex flex-col justify-between min-h-[640px]">
            <div>
              {/* Order Meta Details */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-700/60 mb-3">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-emerald-400" />
                  <h3 className="font-bold text-white text-sm">Pesanan Kasir Langsung</h3>
                </div>
                {cart.length > 0 && (
                  <button
                    onClick={clearCart}
                    className="text-[11px] text-rose-400 hover:text-rose-300 transition flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    Reset
                  </button>
                )}
              </div>

              {/* Table & Type selector */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="flex rounded-xl bg-slate-900 p-1 border border-slate-700 text-xs">
                  <button
                    type="button"
                    onClick={() => setOrderType('dine_in')}
                    className={`flex-1 py-1.5 rounded-lg font-semibold transition flex items-center justify-center gap-1 ${
                      orderType === 'dine_in' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400'
                    }`}
                  >
                    <Utensils className="w-3 h-3" />
                    Dine In
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderType('takeaway')}
                    className={`flex-1 py-1.5 rounded-lg font-semibold transition flex items-center justify-center gap-1 ${
                      orderType === 'takeaway' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400'
                    }`}
                  >
                    <ShoppingBag className="w-3 h-3" />
                    Bungkus
                  </button>
                </div>

                <input
                  type="text"
                  placeholder="Nama meja (Meja 01)..."
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <input
                type="text"
                placeholder="Nama pelanggan (opsional)..."
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder:text-slate-500 mb-3 focus:outline-none focus:border-emerald-500"
              />

              {/* Cart Items List */}
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {cart.length === 0 ? (
                  <div className="h-44 flex flex-col items-center justify-center text-slate-500 text-xs text-center">
                    <ShoppingCart className="w-8 h-8 mb-2 opacity-30" />
                    Keranjang kosong. Klik produk di sebelah kiri untuk menambahkan.
                  </div>
                ) : (
                  cart.map((item) => (
                    <div
                      key={item.product.id}
                      className="bg-slate-900/80 border border-slate-700/60 rounded-xl p-2.5 text-xs space-y-1.5"
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-semibold text-white line-clamp-1 max-w-[160px]">
                          {item.product.name}
                        </span>
                        <span className="font-mono font-bold text-emerald-400 shrink-0">
                          {formatIDR(item.product.price * item.quantity)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <input
                          type="text"
                          placeholder="Catatan (pedas, manis, es...)"
                          value={item.note}
                          onChange={(e) => updateNote(item.product.id, e.target.value)}
                          className="text-[11px] bg-transparent text-slate-300 placeholder:text-slate-600 focus:outline-none max-w-[160px]"
                        />

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(item.product.id, -1)}
                            className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="font-mono font-bold text-white w-4 text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.product.id, 1)}
                            className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Cart Calculations & Pay Button */}
            <div className="mt-4 pt-3 border-t border-slate-700/80 space-y-2">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Subtotal ({cart.reduce((s, i) => s + i.quantity, 0)} item)</span>
                <span className="font-mono">{formatIDR(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-xs text-rose-400">
                  <span>Diskon Warung</span>
                  <span className="font-mono">-{formatIDR(discount)}</span>
                </div>
              )}
              {tax > 0 && (
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Pajak ({settings.taxPercentage}%)</span>
                  <span className="font-mono">{formatIDR(tax)}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-sm font-bold text-white pt-2 border-t border-slate-700">
                <span>Total Tagihan</span>
                <span className="text-xl font-mono font-black text-emerald-400">
                  {formatIDR(total)}
                </span>
              </div>

              <button
                id="btn-pos-pay"
                type="button"
                disabled={cart.length === 0}
                onClick={() => setShowPaymentModal(true)}
                className="w-full mt-3 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-black text-sm transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
              >
                <CreditCard className="w-4 h-4" />
                Bayar Sekarang (F9)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 p-6 text-slate-100 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="font-bold text-base text-white">Pembayaran Kasir</h3>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Total Display */}
            <div className="text-center py-4 bg-slate-800/60 rounded-xl mb-4 border border-slate-700/60">
              <span className="text-xs text-slate-400">Total yang harus dibayar:</span>
              <p className="text-2xl font-mono font-black text-emerald-400 mt-0.5">
                {formatIDR(total)}
              </p>
            </div>

            {/* Payment Method Selector */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              {[
                { id: 'cash', label: 'Cash / Tunai' },
                { id: 'qris', label: 'QRIS' },
                { id: 'transfer', label: 'Transfer' },
                { id: 'debit', label: 'Kartu Debit' }
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedPaymentMethod(m.id as any)}
                  className={`py-2 px-1 rounded-xl text-[11px] font-bold border text-center transition ${
                    selectedPaymentMethod === m.id
                      ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* Cash Tender Details */}
            {selectedPaymentMethod === 'cash' && (
              <div className="space-y-3 mb-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Uang Diterima (Rp)
                  </label>
                  <input
                    type="number"
                    autoFocus
                    placeholder={String(total)}
                    value={cashTendered}
                    onChange={(e) =>
                      setCashTendered(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-lg font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Quick Tender Buttons */}
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { label: 'Uang Pas', val: total },
                    { label: '20rb', val: 20000 },
                    { label: '50rb', val: 50000 },
                    { label: '100rb', val: 100000 }
                  ].map((btn, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setCashTendered(btn.val)}
                      className="py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-slate-300 transition"
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>

                {/* Kembalian calculation */}
                <div className="p-3 bg-slate-800/80 rounded-xl flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-semibold">Kembalian:</span>
                  <span
                    className={`font-mono font-bold text-base ${
                      change > 0 ? 'text-emerald-400' : 'text-slate-300'
                    }`}
                  >
                    {formatIDR(change)}
                  </span>
                </div>
              </div>
            )}

            {/* QRIS / Transfer / Debit Notice */}
            {selectedPaymentMethod === 'qris' && (
              <div className="p-4 bg-slate-800/80 rounded-xl mb-4 text-center space-y-2 border border-blue-500/30">
                <QrCode className="w-10 h-10 text-blue-400 mx-auto" />
                <p className="text-xs font-semibold text-white">QRIS Dinamis Warung Bang Kobra</p>
                <p className="text-[11px] text-slate-400">
                  Arahkan pelanggan scan QRIS kasir. Konfirmasi pembayaran instan.
                </p>
              </div>
            )}

            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-xs font-semibold hover:bg-slate-800 transition"
              >
                Batal
              </button>
              <button
                id="btn-confirm-payment"
                type="button"
                onClick={handleCheckoutDirect}
                disabled={!isCashSufficient}
                className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-bold text-xs transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                Selesaikan Transaksi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Thermal Receipt Modal */}
      {receiptOrder && (
        <ReceiptModal
          order={receiptOrder}
          settings={settings}
          onClose={() => setReceiptOrder(null)}
        />
      )}
    </div>
  );
};
