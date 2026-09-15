import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  CreditCard,
  Package,
  QrCode,
  BarChart3,
  Settings as SettingsIcon,
  User as UserIcon,
  Store,
  RotateCcw,
  ExternalLink,
  MapPin,
  Clock,
  Sparkles,
  Receipt as ReceiptIcon,
  ShoppingBag
} from 'lucide-react';
import { StoreSettings, Order, UserProfile } from './types';
import { fetchSettings, fetchProfile, subscribeToEvents } from './lib/api';
import { CustomerOrderView } from './components/CustomerOrderView';
import { CustomerTrackingView } from './components/CustomerTrackingView';
import { CashierView } from './components/CashierView';
import { ProductManagement } from './components/ProductManagement';
import { QRManagement } from './components/QRManagement';
import { AdminDashboard } from './components/AdminDashboard';
import { FullSettingsView } from './components/FullSettingsView';
import { ProfileView } from './components/ProfileView';
import { ReceiptModal } from './components/ReceiptModal';
import { StoreLogo } from './components/StoreLogo';

type AppRole =
  | 'customer'
  | 'cashier'
  | 'products'
  | 'qr'
  | 'admin'
  | 'settings'
  | 'profile';

export default function App() {
  const [role, setRole] = useState<AppRole>(() => {
    const path = window.location.pathname;
    if (path.startsWith('/order/')) return 'customer';
    return 'cashier';
  });

  const [activeQrCode, setActiveQrCode] = useState<string>(() => {
    const path = window.location.pathname;
    if (path.startsWith('/order/')) {
      const code = path.replace('/order/', '').trim();
      if (code) return code;
    }
    return 'kasir-takeaway';
  });

  // Active customer tracking order
  const [activeOrder, setActiveOrder] = useState<Order | null>(() => {
    try {
      const saved = localStorage.getItem('active_customer_order');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [settings, setSettings] = useState<StoreSettings & { isOpen: boolean }>({
    name: 'Warung Bang Kobra',
    address: 'Jl. Rawamangun Muka Raya No. 12, Jakarta Timur',
    phone: '0812-3456-7890',
    whatsapp: '6281234567890',
    openTime: '08:00',
    closeTime: '23:30',
    isOpen: true,
    taxPercentage: 0,
    discountPercentage: 0,
    footerMessage: 'Terima kasih telah berkunjung ke Warung Bang Kobra!'
  });

  const [userProfile, setUserProfile] = useState<UserProfile>({
    id: 'usr-01',
    name: 'Bang Kobra (Dimas S.)',
    username: 'owner_kobra',
    role: 'owner',
    avatar: '🐍',
    phone: '0812-3456-7890',
    email: 'bang.kobra.warkop@gmail.com',
    pin: '1234',
    shiftStartTime: new Date().toISOString(),
    initialCash: 350000
  });

  const [receiptModalOrder, setReceiptModalOrder] = useState<Order | null>(null);
  const [showTablePicker, setShowTablePicker] = useState(false);

  // Load settings & profile
  useEffect(() => {
    fetchSettings()
      .then((data) => setSettings(data))
      .catch((e) => console.error(e));

    fetchProfile()
      .then((data) => {
        if (data && data.name) setUserProfile(data);
      })
      .catch((e) => console.error(e));
  }, []);

  // Real-time SSE connection
  useEffect(() => {
    const unsubscribe = subscribeToEvents({
      onSettingsUpdated: (newSettings) => {
        setSettings((prev) => ({ ...prev, ...newSettings }));
      },
      onProfileUpdated: (updatedProfile) => {
        setUserProfile(updatedProfile);
      }
    });
    return () => unsubscribe();
  }, []);

  // Save active order
  useEffect(() => {
    if (activeOrder) {
      localStorage.setItem('active_customer_order', JSON.stringify(activeOrder));
    } else {
      localStorage.removeItem('active_customer_order');
    }
  }, [activeOrder]);

  const handleOpenCustomerWithQR = (qrCode: string) => {
    setActiveQrCode(qrCode);
    setActiveOrder(null);
    setRole('customer');
    window.history.pushState({}, '', `/order/${qrCode}`);
  };

  const handleSwitchRole = (newRole: AppRole) => {
    setRole(newRole);
    if (newRole !== 'customer') {
      window.history.pushState({}, '', '/');
    } else {
      window.history.pushState({}, '', `/order/${activeQrCode}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Universal Top Bar / App Role Switcher */}
      <header className="sticky top-0 z-40 bg-slate-900/95 border-b border-slate-800 backdrop-blur-md px-3 sm:px-6 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Brand Logo & Name */}
          <div className="flex items-center justify-between w-full md:w-auto gap-3">
            <div
              onClick={() => handleSwitchRole('cashier')}
              className="flex items-center gap-2.5 cursor-pointer select-none"
            >
              <StoreLogo logo={settings.logo} name={settings.name} size="sm" />
              <div>
                <h1 className="text-sm font-black text-white tracking-wider uppercase flex items-center gap-1.5">
                  {settings.name || 'WARUNG BANG KOBRA'}
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono font-bold">
                    POS + QR
                  </span>
                </h1>
                <p className="text-[10px] text-slate-400 hidden sm:block">
                  {settings.tagline || 'Sistem Kasir Modern & Pemesanan Pelanggan Tanpa Install Aplikasi'}
                </p>
              </div>
            </div>

            {/* Store Open/Close Indicator & Profile Quick Pill */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-[11px]">
                <span
                  className={`w-2 h-2 rounded-full ${
                    settings.isOpen ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
                  }`}
                />
                <span className="text-slate-300 font-medium">
                  {settings.isOpen ? 'Buka' : 'Tutup'} ({settings.openTime} - {settings.closeTime})
                </span>
              </div>

              {/* Profile Shortcut Badge */}
              <button
                id="header-profile-badge"
                onClick={() => handleSwitchRole('profile')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] transition ${
                  role === 'profile'
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                    : 'bg-slate-800 hover:bg-slate-750 border-slate-700 text-slate-300'
                }`}
                title="Buka Menu Profil Kasir / Akun"
              >
                <span className="text-xs">{userProfile.avatar || '👤'}</span>
                <span className="font-bold max-w-[100px] truncate hidden sm:inline">
                  {userProfile.name.split(' ')[0]}
                </span>
                <span className="text-[9px] px-1 py-0.2 rounded bg-slate-900 text-emerald-400 font-mono font-bold">
                  {userProfile.role.toUpperCase()}
                </span>
              </button>
            </div>
          </div>

          {/* Role Navigation Buttons */}
          <nav className="flex items-center gap-1 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 no-scrollbar">
            <button
              id="nav-customer-view"
              onClick={() => handleSwitchRole('customer')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                role === 'customer'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-750 hover:text-white border border-slate-700/60'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>📱 Menu HP (Takeaway)</span>
              <span className="text-[9px] bg-slate-900/40 px-1.5 py-0.5 rounded text-emerald-300 font-mono">
                TAKEAWAY
              </span>
            </button>

            <button
              id="nav-cashier-view"
              onClick={() => handleSwitchRole('cashier')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                role === 'cashier'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-750 hover:text-white border border-slate-700/60'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Kasir POS</span>
            </button>

            <button
              id="nav-products-view"
              onClick={() => handleSwitchRole('products')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                role === 'products'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-750 hover:text-white border border-slate-700/60'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Produk & Stok</span>
            </button>

            <button
              id="nav-qr-view"
              onClick={() => handleSwitchRole('qr')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                role === 'qr'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-750 hover:text-white border border-slate-700/60'
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>QR Kasir Takeaway</span>
            </button>

            <button
              id="nav-admin-view"
              onClick={() => handleSwitchRole('admin')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                role === 'admin'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-750 hover:text-white border border-slate-700/60'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Admin & Laporan</span>
            </button>

            <button
              id="nav-settings-view"
              onClick={() => handleSwitchRole('settings')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                role === 'settings'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-750 hover:text-white border border-slate-700/60'
              }`}
            >
              <SettingsIcon className="w-3.5 h-3.5" />
              <span>Pengaturan</span>
            </button>

            <button
              id="nav-profile-view"
              onClick={() => handleSwitchRole('profile')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                role === 'profile'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-750 hover:text-white border border-slate-700/60'
              }`}
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span>Profil</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content Body */}
      <div className="flex-1 w-full">
        {role === 'customer' ? (
          /* Mobile Frame Simulation Container */
          <div className="py-4 px-2 sm:px-4 flex justify-center items-start min-h-[calc(100vh-60px)]">
            <div className="w-full max-w-md shadow-2xl rounded-3xl overflow-hidden border border-slate-800 bg-slate-900 relative">
              {/* Quick simulation bar above phone */}
              <div className="p-2.5 bg-slate-800/90 border-b border-slate-700 flex items-center justify-between text-[11px] text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                  Simulasi HP: <strong className="text-white">/order/{activeQrCode}</strong>
                </span>
                <button
                  onClick={() => setShowTablePicker(true)}
                  className="px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold text-[10px] transition flex items-center gap-1"
                >
                  <ShoppingBag className="w-3 h-3 text-emerald-400" />
                  <span>Info QR Takeaway</span>
                </button>
              </div>

              {activeOrder ? (
                <CustomerTrackingView
                  order={activeOrder}
                  settings={settings}
                  onOrderAgain={() => setActiveOrder(null)}
                  onViewReceipt={(ord) => setReceiptModalOrder(ord)}
                />
              ) : (
                <CustomerOrderView
                  initialQrCode={activeQrCode}
                  settings={settings}
                  onOrderSuccess={(order) => setActiveOrder(order)}
                  onSwitchTableRequest={() => setShowTablePicker(true)}
                />
              )}
            </div>
          </div>
        ) : (
          /* Desktop/Full Container for POS, Products, QR Takeaway, Admin, Settings, Profile */
          <main className="max-w-7xl mx-auto p-4 sm:p-6 w-full">
            {role === 'cashier' && <CashierView settings={settings} />}
            {role === 'products' && <ProductManagement />}
            {role === 'qr' && (
              <QRManagement onOpenCustomerView={handleOpenCustomerWithQR} settings={settings} />
            )}
            {role === 'admin' && (
              <AdminDashboard settings={settings} onSettingsUpdated={setSettings} />
            )}
            {role === 'settings' && (
              <FullSettingsView settings={settings} onSettingsUpdated={setSettings} />
            )}
            {role === 'profile' && (
              <ProfileView
                settings={settings}
                onProfileUpdated={(updated) => setUserProfile(updated)}
              />
            )}
          </main>
        )}
      </div>

      {/* QR Takeaway Simulation Modal */}
      {showTablePicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700 p-5 text-slate-100 shadow-2xl space-y-4">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400">
                <ShoppingBag className="w-4 h-4" />
              </span>
              <div>
                <h3 className="font-bold text-sm text-white">
                  Simulasi QR Kasir Takeaway
                </h3>
                <p className="text-[11px] text-slate-400">
                  Mode pemesanan mandiri bawa pulang
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-800/80 rounded-xl border border-slate-700/80 space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-300">
                <span>Tipe Order:</span>
                <span className="font-bold text-emerald-400">🛍️ Takeaway / Bawa Pulang</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span>Penempatan:</span>
                <span className="text-white font-semibold">Meja Kasir Utama</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span>URL Pemesanan:</span>
                <span className="font-mono text-emerald-400">/order/kasir-takeaway</span>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Warung Anda menggunakan satu QR Code terpusat di meja kasir. Pelanggan dapat memindai QR ini untuk memesan bawa pulang langsung ke kasir tanpa perlu nomor meja.
            </p>

            <div className="space-y-2 pt-1">
              <button
                onClick={() => {
                  handleOpenCustomerWithQR('kasir-takeaway');
                  setShowTablePicker(false);
                }}
                className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md transition"
              >
                Muat Ulang Pesanan Takeaway
              </button>
              <button
                onClick={() => setShowTablePicker(false)}
                className="w-full py-2 rounded-xl border border-slate-700 text-slate-300 text-xs font-semibold hover:bg-slate-800 transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Receipt Modal */}
      {receiptModalOrder && (
        <ReceiptModal
          order={receiptModalOrder}
          settings={settings}
          onClose={() => setReceiptModalOrder(null)}
        />
      )}
    </div>
  );
}
