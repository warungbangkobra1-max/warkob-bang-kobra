import React, { useState, useEffect } from 'react';
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  X,
  Check,
  Clock,
  MapPin,
  Utensils,
  ShoppingBag,
  Sparkles,
  AlertTriangle,
  QrCode,
  ArrowRight,
  Info
} from 'lucide-react';
import { Product, QRCodeData, StoreSettings, CartItem, Order } from '../types';
import { fetchProducts, fetchQRCodeByCode, submitOrder } from '../lib/api';
import { formatIDR } from '../lib/utils';
import { playSuccessChime } from '../lib/audio';
import { PWAInstallBanner } from './PWAInstallBanner';
import { StoreLogo } from './StoreLogo';

interface CustomerOrderViewProps {
  initialQrCode?: string;
  settings: StoreSettings & { isOpen: boolean };
  onOrderSuccess: (order: Order) => void;
  onSwitchTableRequest: () => void;
}

export const CustomerOrderView: React.FC<CustomerOrderViewProps> = ({
  initialQrCode = 'kasir-takeaway',
  settings,
  onOrderSuccess,
  onSwitchTableRequest
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [currentQR, setCurrentQR] = useState<QRCodeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [qrError, setQrError] = useState<string | null>(null);

  // Filter & Search
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');

  // Product Detail Modal / Sheet
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [modalQuantity, setModalQuantity] = useState(1);
  const [modalNote, setModalNote] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Cart Drawer
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(`cart_${initialQrCode}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [showCartDrawer, setShowCartDrawer] = useState(false);

  // Customer identity
  const [customerName, setCustomerName] = useState(() => {
    return localStorage.getItem('customer_name') || '';
  });
  const [orderType, setOrderType] = useState<'dine_in' | 'takeaway'>('dine_in');
  const [orderGeneralNotes, setOrderGeneralNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Persist cart
  useEffect(() => {
    try {
      localStorage.setItem(`cart_${initialQrCode}`, JSON.stringify(cart));
    } catch (e) {
      console.error(e);
    }
  }, [cart, initialQrCode]);

  useEffect(() => {
    try {
      if (customerName) localStorage.setItem('customer_name', customerName);
    } catch (e) {
      console.error(e);
    }
  }, [customerName]);

  // Load products & validate QR
  useEffect(() => {
    let mounted = true;
    async function init() {
      try {
        setLoading(true);
        setQrError(null);

        const [prodList, qrData] = await Promise.all([
          fetchProducts(),
          initialQrCode ? fetchQRCodeByCode(initialQrCode).catch(() => null) : null
        ]);

        if (!mounted) return;
        setProducts(prodList);

        if (qrData) {
          if (!qrData.isActive) {
            setQrError('QR TIDAK AKTIF. Silakan gunakan QR lainnya atau hubungi petugas warung.');
          } else {
            setCurrentQR(qrData);
            if (qrData.type === 'counter') {
              setOrderType('takeaway');
            } else {
              setOrderType('dine_in');
            }
          }
        }
      } catch (err: any) {
        if (!mounted) return;
        console.error(err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    init();
    return () => {
      mounted = false;
    };
  }, [initialQrCode]);

  // Toast helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Add from Detail Modal
  const handleAddToCartFromModal = () => {
    if (!selectedProduct) return;
    if (selectedProduct.stock < modalQuantity) {
      alert(`Stok hanya tersisa ${selectedProduct.stock}`);
      return;
    }

    setCart((prev) => {
      const existing = prev.find(
        (i) => i.product.id === selectedProduct.id && i.note === modalNote.trim()
      );
      if (existing) {
        return prev.map((i) =>
          i === existing ? { ...i, quantity: i.quantity + modalQuantity } : i
        );
      }
      return [...prev, { product: selectedProduct, quantity: modalQuantity, note: modalNote.trim() }];
    });

    showToast(`✓ Ditambahkan ke keranjang`);
    setSelectedProduct(null);
    setModalQuantity(1);
    setModalNote('');
  };

  // Quick Add 1 directly
  const handleQuickAdd = (p: Product) => {
    if (p.stock <= 0) return;
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === p.id && !i.note);
      if (existing) {
        if (existing.quantity >= p.stock) {
          alert(`Stok hanya tersisa ${p.stock}`);
          return prev;
        }
        return prev.map((i) => (i === existing ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, { product: p, quantity: 1, note: '' }];
    });
    showToast(`✓ Ditambahkan ke keranjang`);
  };

  const updateCartQty = (index: number, delta: number) => {
    setCart((prev) => {
      const next = [...prev];
      const item = next[index];
      const newQty = item.quantity + delta;
      if (newQty > item.product.stock) {
        alert(`Maksimal stok tersisa ${item.product.stock}`);
        return prev;
      }
      if (newQty <= 0) {
        next.splice(index, 1);
      } else {
        next[index] = { ...item, quantity: newQty };
      }
      return next;
    });
  };

  // Calculations
  const cartTotalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const discount = Math.round((subtotal * (settings.discountPercentage || 0)) / 100);
  const tax = Math.round(((subtotal - discount) * (settings.taxPercentage || 0)) / 100);
  const total = subtotal - discount + tax;

  // Submit Order
  const handleSendOrder = async () => {
    if (cart.length === 0) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const payload = {
        qrCode: currentQR ? currentQR.code : initialQrCode,
        customerName: customerName.trim() || undefined,
        orderType,
        tableNumber: currentQR?.name || 'Order Kasir Takeaway',
        items: cart.map((i) => ({
          productId: i.product.id,
          quantity: i.quantity,
          note: i.note
        })),
        notes: orderGeneralNotes.trim() || undefined
      };

      const newOrder = await submitOrder(payload);
      playSuccessChime();
      setCart([]);
      try {
        localStorage.removeItem(`cart_${initialQrCode}`);
      } catch {}
      setShowCartDrawer(false);
      onOrderSuccess(newOrder);
    } catch (err: any) {
      setErrorMessage(
        err.message || 'Beberapa produk dalam pesanan Anda sudah tidak tersedia. Silakan periksa kembali keranjang.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const categories = ['Semua', 'Makanan', 'Minuman', 'Snack', 'Sembako', 'Lainnya'];
  const filteredProducts = products.filter((p) => {
    const matchCat = selectedCategory === 'Semua' || p.category === selectedCategory;
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-900 text-slate-100 flex flex-col pb-24 relative selection:bg-emerald-500 selection:text-white">
      {/* PWA Optional Install Prompt */}
      <div className="p-4 pb-0">
        <PWAInstallBanner />
      </div>

      {/* Closed Warning Banner if store is currently closed */}
      {!settings.isOpen && (
        <div className="m-4 p-4 rounded-2xl bg-amber-950/80 border border-amber-500/50 text-amber-200 text-xs leading-relaxed space-y-1">
          <div className="flex items-center gap-2 font-bold text-amber-300 text-sm">
            <Clock className="w-4 h-4" />
            Saat ini warung sedang tutup
          </div>
          <p>
            Jam operasional: <strong>{settings.openTime} - {settings.closeTime}</strong>. Silakan kembali pada jam operasional.
          </p>
        </div>
      )}

      {/* QR Inactive Error Screen */}
      {qrError ? (
        <div className="m-4 p-6 rounded-2xl bg-rose-950/80 border border-rose-600 text-rose-200 text-center space-y-3">
          <AlertTriangle className="w-12 h-12 text-rose-400 mx-auto" />
          <h3 className="font-bold text-base text-white">QR TIDAK AKTIF</h3>
          <p className="text-xs text-rose-200/90 leading-relaxed">{qrError}</p>
          <button
            onClick={onSwitchTableRequest}
            className="mt-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs"
          >
            Pilih QR Lain / Ganti Meja
          </button>
        </div>
      ) : null}

      {/* Customer Header */}
      <header className="p-4 pt-2 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2.5">
            <StoreLogo logo={settings.logo} name={settings.name} size="md" />
            <div>
              <h1 className="font-black text-base text-white tracking-wide uppercase">
                {settings.name}
              </h1>
              <p className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                <span>Selamat datang 👋</span>
              </p>
            </div>
          </div>

          {/* Table / Takeaway Badge */}
          <div
            onClick={onSwitchTableRequest}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-bold cursor-pointer hover:bg-emerald-500/25 transition shrink-0"
            title="Info QR Kasir"
          >
            <ShoppingBag className="w-3.5 h-3.5 text-emerald-400" />
            <span>{currentQR?.name || 'Kasir Takeaway'}</span>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative mt-3">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari menu makanan & minuman..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-800/90 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Categories Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 mt-3 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                selectedCategory === cat
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700/60'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </header>

      {/* Main Menu Grid */}
      <main className="p-4 space-y-3 flex-1">
        <div className="flex items-center justify-between text-xs text-slate-400 px-1">
          <span>Daftar Menu ({filteredProducts.length})</span>
          <span className="text-[11px] text-emerald-400">Pesan tanpa download aplikasi</span>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-48 rounded-2xl bg-slate-800/50 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredProducts.map((prod) => {
              const isOutOfStock = prod.stock <= 0;

              return (
                <div
                  key={prod.id}
                  id={`product-card-${prod.id}`}
                  className={`rounded-2xl border bg-slate-800/90 overflow-hidden flex flex-col justify-between transition ${
                    isOutOfStock
                      ? 'border-slate-800 opacity-60'
                      : 'border-slate-700/70 hover:border-emerald-500/50 shadow-md'
                  }`}
                >
                  {/* Photo */}
                  <div
                    onClick={() => !isOutOfStock && setSelectedProduct(prod)}
                    className="aspect-square w-full relative bg-slate-700 cursor-pointer overflow-hidden group"
                  >
                    <img
                      src={prod.imageUrl}
                      alt={prod.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      loading="lazy"
                    />
                    {isOutOfStock ? (
                      <div className="absolute inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center">
                        <span className="text-[11px] font-bold text-rose-400 bg-rose-950/90 px-2.5 py-1 rounded-md border border-rose-500/30">
                          STOK HABIS
                        </span>
                      </div>
                    ) : (
                      <span className="absolute bottom-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-950/80 text-emerald-400 border border-emerald-500/30">
                        {prod.category}
                      </span>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-3 flex-1 flex flex-col justify-between">
                    <div>
                      <h3
                        onClick={() => !isOutOfStock && setSelectedProduct(prod)}
                        className="font-bold text-xs text-white line-clamp-2 leading-snug cursor-pointer"
                      >
                        {prod.name}
                      </h3>
                      <p className="font-mono font-black text-emerald-400 text-sm mt-1">
                        {formatIDR(prod.price)}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-700/60 flex items-center justify-between">
                      {isOutOfStock ? (
                        <span className="text-[10px] text-slate-500 font-medium">Tidak tersedia</span>
                      ) : (
                        <button
                          id={`btn-add-${prod.id}`}
                          onClick={() => handleQuickAdd(prod)}
                          className="w-full py-1.5 px-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1 transition shadow-sm shadow-emerald-500/20 active:scale-95"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          + TAMBAH
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Floating Bottom Cart Bar */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 p-3 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent pointer-events-none">
          <div className="max-w-md mx-auto pointer-events-auto">
            <button
              id="btn-open-cart"
              onClick={() => setShowCartDrawer(true)}
              className="w-full p-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold shadow-xl shadow-emerald-500/30 flex items-center justify-between transition active:scale-[0.99]"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-slate-950 text-emerald-400 flex items-center justify-center font-black text-xs">
                  {cartTotalItems}
                </div>
                <span className="text-xs font-black uppercase tracking-wider">
                  Lihat Keranjang
                </span>
              </div>
              <div className="flex items-center gap-2 font-mono font-black text-sm">
                <span>{formatIDR(total)}</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs shadow-xl animate-in fade-in slide-in-from-bottom-2 flex items-center gap-1.5">
          <Check className="w-4 h-4" />
          {toastMessage}
        </div>
      )}

      {/* Product Detail Modal / Bottom Sheet */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 p-0 sm:p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-t-3xl sm:rounded-3xl p-5 text-slate-100 shadow-2xl max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-4">
            <div className="flex justify-between items-start mb-3">
              <div className="aspect-video w-full rounded-2xl overflow-hidden bg-slate-800 relative">
                <img
                  src={selectedProduct.imageUrl}
                  alt={selectedProduct.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <button
                onClick={() => setSelectedProduct(null)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-900/80 backdrop-blur-md text-white flex items-center justify-center shadow-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <h3 className="font-bold text-base text-white">{selectedProduct.name}</h3>
            <p className="text-emerald-400 font-mono font-black text-lg mt-0.5">
              {formatIDR(selectedProduct.price)}
            </p>

            {selectedProduct.description && (
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                {selectedProduct.description}
              </p>
            )}

            {/* Stepper */}
            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">Jumlah Pesanan:</span>
              <div className="flex items-center gap-3 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
                <button
                  type="button"
                  onClick={() => setModalQuantity(Math.max(1, modalQuantity - 1))}
                  className="w-7 h-7 rounded-lg bg-slate-700 text-white flex items-center justify-center font-bold"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono font-bold text-sm w-6 text-center">
                  {modalQuantity}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setModalQuantity(Math.min(selectedProduct.stock, modalQuantity + 1))
                  }
                  className="w-7 h-7 rounded-lg bg-slate-700 text-white flex items-center justify-center font-bold"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Notes */}
            <div className="mt-3">
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Catatan Pesanan:
              </label>
              <input
                type="text"
                placeholder="Contoh: Tidak pedas, tambah telur, es sedikit"
                value={modalNote}
                onChange={(e) => setModalNote(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Submit Button */}
            <button
              id="btn-add-to-cart-modal"
              onClick={handleAddToCartFromModal}
              className="w-full mt-4 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider transition shadow-lg shadow-emerald-500/20"
            >
              TAMBAH KE KERANJANG • {formatIDR(selectedProduct.price * modalQuantity)}
            </button>
          </div>
        </div>
      )}

      {/* Cart Drawer / Full Sheet */}
      {showCartDrawer && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-t-3xl sm:rounded-3xl p-5 text-slate-100 shadow-2xl max-h-[90vh] flex flex-col justify-between animate-in slide-in-from-bottom-4">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-emerald-400" />
                  <h3 className="font-bold text-sm text-white uppercase tracking-wider">
                    KERANJANG PESANAN
                  </h3>
                </div>
                <button
                  onClick={() => setShowCartDrawer(false)}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Identity Banner */}
              <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/80 mb-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-white">
                    Pesanan: {currentQR?.name || 'Order Kasir Takeaway'}
                  </span>
                </div>
                <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-md">
                  🛍️ Bawa Pulang
                </span>
              </div>

              {/* If not a table QR, let them toggle dine-in vs takeaway */}
              {currentQR?.type !== 'table' && (
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setOrderType('dine_in')}
                    className={`py-2 rounded-xl text-xs font-semibold border transition ${
                      orderType === 'dine_in'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    ○ Makan di tempat
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderType('takeaway')}
                    className={`py-2 rounded-xl text-xs font-semibold border transition ${
                      orderType === 'takeaway'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    ○ Bawa pulang
                  </button>
                </div>
              )}

              {/* Optional Customer Name & Note */}
              <div className="space-y-2 mb-3">
                <input
                  type="text"
                  placeholder="Nama Anda (opsional, cth: Dimas / Mas Budi)"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                />
                <input
                  type="text"
                  placeholder="Catatan umum (cth: tolong segera, sendok garpu 2)"
                  value={orderGeneralNotes}
                  onChange={(e) => setOrderGeneralNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Items List */}
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {cart.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs flex justify-between items-center"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="font-bold text-white truncate">{item.product.name}</p>
                      <p className="text-[11px] text-emerald-400 font-mono">
                        {formatIDR(item.product.price)}
                      </p>
                      {item.note && (
                        <p className="text-[10px] text-amber-300 italic truncate max-w-[180px]">
                          Note: {item.note}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => updateCartQty(idx, -1)}
                        className="w-6 h-6 rounded-md bg-slate-700 text-white flex items-center justify-center font-bold"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-mono font-bold w-4 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateCartQty(idx, 1)}
                        className="w-6 h-6 rounded-md bg-slate-700 text-white flex items-center justify-center font-bold"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Calculations & Submit */}
            <div className="mt-3 pt-3 border-t border-slate-800 space-y-2">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Subtotal</span>
                <span className="font-mono">{formatIDR(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-xs text-rose-400">
                  <span>Diskon</span>
                  <span className="font-mono">-{formatIDR(discount)}</span>
                </div>
              )}
              {tax > 0 && (
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Pajak</span>
                  <span className="font-mono">{formatIDR(tax)}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-sm font-bold text-white pt-1 border-t border-slate-700">
                <span>Total</span>
                <span className="text-lg font-mono font-black text-emerald-400">
                  {formatIDR(total)}
                </span>
              </div>

              {errorMessage && (
                <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-700 text-rose-200 text-xs flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <button
                id="btn-submit-order"
                disabled={isSubmitting || cart.length === 0}
                onClick={handleSendOrder}
                className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-black text-xs uppercase tracking-wider transition shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <span>Mengirim pesanan...</span>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    KIRIM PESANAN
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
