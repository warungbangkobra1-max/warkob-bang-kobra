import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import QRCode from 'qrcode';
import {
  CheckCircle2,
  Clock,
  Flame,
  ShoppingBag,
  CreditCard,
  QrCode,
  MessageCircle,
  RefreshCw,
  ArrowLeft,
  XCircle,
  Receipt,
  Check,
  PackageCheck
} from 'lucide-react';
import { Order, StoreSettings, OrderStatus } from '../types';
import { fetchOrderStatus, processPayment } from '../lib/api';
import { formatIDR, formatDate } from '../lib/utils';
import { playSuccessChime } from '../lib/audio';
import { StoreLogo } from './StoreLogo';

interface CustomerTrackingViewProps {
  order: Order;
  settings: StoreSettings;
  onOrderAgain: () => void;
  onViewReceipt: (order: Order) => void;
}

export const CustomerTrackingView: React.FC<CustomerTrackingViewProps> = ({
  order: initialOrder,
  settings,
  onOrderAgain,
  onViewReceipt
}) => {
  const [order, setOrder] = useState<Order>(initialOrder);
  const [qrisDataUrl, setQrisDataUrl] = useState<string>('');
  const [showQrisModal, setShowQrisModal] = useState(false);
  const [isPayingQris, setIsPayingQris] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Confetti on success mount
  useEffect(() => {
    try {
      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.6 }
      });
    } catch {}
  }, []);

  // Poll order status live
  useEffect(() => {
    let active = true;

    const checkStatus = async () => {
      try {
        const token = order?.customerToken || order?.orderNumber;
        if (!token || !token.trim()) return;
        const latest = await fetchOrderStatus(token.trim());
        if (active && latest) {
          setOrder(latest);
        }
      } catch (err) {
        // silent polling catch
      }
    };

    const interval = setInterval(checkStatus, 3500);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [order.customerToken, order.orderNumber]);

  // Generate QRIS QR code
  useEffect(() => {
    async function genQRIS() {
      try {
        // QRIS specification mockup string with total amount
        const qrisPayload = `00020101021226600016ID.CO.WARUNGBANGKOBRA.WWW0118936009990000012345520458125303360540${order.total}5802ID5918WARUNG BANG KOBRA6007JAKARTA62070703A016304`;
        const url = await QRCode.toDataURL(qrisPayload, {
          width: 300,
          margin: 2,
          color: {
            dark: '#0f172a',
            light: '#ffffff'
          }
        });
        setQrisDataUrl(url);
      } catch (e) {
        console.error(e);
      }
    }
    genQRIS();
  }, [order.total]);

  // Handle simulated QRIS payment
  const handleSimulateQrisPay = async () => {
    setIsPayingQris(true);
    try {
      const paidOrder = await processPayment(order.id, {
        paymentMethod: 'qris'
      });
      playSuccessChime();
      confetti({ particleCount: 80, spread: 70 });
      setOrder(paidOrder);
      setShowQrisModal(false);
    } catch (e: any) {
      alert(e.message || 'Gagal membayar');
    } finally {
      setIsPayingQris(false);
    }
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      const latest = await fetchOrderStatus(order.customerToken || order.orderNumber);
      setOrder(latest);
    } finally {
      setIsRefreshing(false);
    }
  };

  // WhatsApp Link
  const waNumber = settings.whatsapp.replace(/[^0-9]/g, '');
  const waMessage = encodeURIComponent(
    `Halo ${settings.name}, saya ingin menanyakan pesanan saya:\n\n*No Pesanan:* ${order.orderNumber}\n*Meja:* ${order.tableNumber || 'Area Warung'}\n*Total:* ${formatIDR(order.total)}\n\nTerima kasih!`
  );
  const whatsappUrl = `https://wa.me/${waNumber}?text=${waMessage}`;

  // Status mapping
  const steps: { key: OrderStatus; label: string; desc: string; icon: any }[] = [
    {
      key: 'PENDING',
      label: 'Pesanan Diterima',
      desc: 'Menunggu konfirmasi kasir',
      icon: Clock
    },
    {
      key: 'CONFIRMED',
      label: 'Sedang Diproses',
      desc: 'Pesanan dikonfirmasi kasir',
      icon: CheckCircle2
    },
    {
      key: 'PREPARING',
      label: 'Sedang Disiapkan',
      desc: 'Menu sedang disiapkan dan diracik',
      icon: Flame
    },
    {
      key: 'READY',
      label: 'Pesanan Siap Diambil',
      desc: 'Silakan ambil di area kasir / counter',
      icon: PackageCheck
    },
    {
      key: 'COMPLETED',
      label: 'Selesai',
      desc: 'Terima kasih, selamat menikmati!',
      icon: ShoppingBag
    }
  ];

  const statusOrder: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'COMPLETED'];
  const currentIndex = statusOrder.indexOf(order.orderStatus);
  const isCancelled = order.orderStatus === 'CANCELLED';

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-900 text-slate-100 flex flex-col p-4 pb-20 selection:bg-emerald-500 selection:text-white">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
        <button
          onClick={onOrderAgain}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Menu Warung
        </button>

        <span className="text-xs font-bold text-emerald-400 font-mono">
          {order.orderNumber}
        </span>

        <button
          onClick={handleManualRefresh}
          className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition"
          title="Segarkan status"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Success Hero Card */}
      <div className="rounded-3xl bg-gradient-to-b from-slate-800 to-slate-900 border border-emerald-500/40 p-5 text-center shadow-xl mb-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center text-2xl mx-auto mb-2.5">
          {isCancelled ? '❌' : '✓'}
        </div>

        <h2 className="font-black text-lg text-white tracking-wide uppercase">
          {isCancelled ? 'PESANAN DIBATALKAN' : 'PESANAN BERHASIL'}
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          {isCancelled
            ? 'Pesanan telah dibatalkan oleh kasir/petugas.'
            : 'Pesanan Anda telah diterima sistem Warung Bang Kobra.'}
        </p>

        {/* Highlight Details */}
        <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-800 text-left">
          <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 block">Meja / Lokasi</span>
            <span className="text-sm font-black text-white">
              {order.tableNumber || 'Area Warung'}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 block">Total Tagihan</span>
            <span className="text-sm font-mono font-black text-emerald-400">
              {formatIDR(order.total)}
            </span>
          </div>
        </div>

        {/* Payment Status Badge */}
        <div className="mt-3 flex items-center justify-between text-xs px-1">
          <span className="text-slate-400">Status Pembayaran:</span>
          {order.paymentStatus === 'paid' ? (
            <span className="font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <Check className="w-3 h-3" />
              Lunas ({order.paymentMethod?.toUpperCase()})
            </span>
          ) : (
            <span className="font-bold text-amber-400 bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 rounded-full">
              Belum Dibayar
            </span>
          )}
        </div>
      </div>

      {/* Realtime Status Progress Timeline */}
      <div className="bg-slate-800/70 border border-slate-700/70 rounded-3xl p-5 mb-5 shadow-lg">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Status Pesanan Realtime
        </h3>

        {isCancelled ? (
          <div className="p-4 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-200 text-xs text-center flex items-center justify-center gap-2">
            <XCircle className="w-4 h-4 text-rose-400" />
            Pesanan ini telah dibatalkan. Hubungi kasir jika ada pertanyaan.
          </div>
        ) : (
          <div className="space-y-4 relative">
            {/* Connecting line */}
            <div className="absolute left-[17px] top-4 bottom-4 w-0.5 bg-slate-700 -z-0" />

            {steps.map((step, idx) => {
              const isPast = currentIndex > idx;
              const isCurrent = currentIndex === idx;
              const Icon = step.icon;

              return (
                <div key={step.key} className="flex items-start gap-3 relative z-10">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                      isCurrent
                        ? 'bg-emerald-500 text-slate-950 font-black shadow-lg shadow-emerald-500/30 ring-4 ring-emerald-500/20'
                        : isPast
                        ? 'bg-emerald-950 border border-emerald-500 text-emerald-400'
                        : 'bg-slate-800 border border-slate-700 text-slate-500'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>

                  <div className="flex-1 pt-0.5">
                    <div className="flex items-center justify-between">
                      <p
                        className={`text-xs font-bold ${
                          isCurrent
                            ? 'text-emerald-400 text-sm font-black'
                            : isPast
                            ? 'text-white'
                            : 'text-slate-500'
                        }`}
                      >
                        {step.label}
                      </p>
                      {isCurrent && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 animate-pulse">
                          Aktif
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">{step.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Payment Options (if unpaid) */}
      {order.paymentStatus === 'unpaid' && !isCancelled && (
        <div className="bg-slate-800/70 border border-slate-700/70 rounded-3xl p-5 mb-5 shadow-lg space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <CreditCard className="w-4 h-4 text-emerald-400" />
            Pilihan Cara Pembayaran
          </h3>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={() => setShowQrisModal(true)}
              className="p-3 rounded-2xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-left transition flex flex-col justify-between group"
            >
              <div className="flex items-center justify-between mb-2">
                <QrCode className="w-5 h-5 text-blue-400 group-hover:scale-110 transition" />
                <span className="text-[10px] font-bold text-blue-300 bg-blue-500/20 px-1.5 py-0.5 rounded">
                  Instan
                </span>
              </div>
              <div>
                <p className="text-xs font-bold text-white">Bayar QRIS</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Gopay, OVO, Dana, BCA...</p>
              </div>
            </button>

            <div className="p-3 rounded-2xl bg-slate-800 border border-slate-700 text-left flex flex-col justify-between">
              <div className="w-5 h-5 text-emerald-400 mb-2 font-black text-sm">💵</div>
              <div>
                <p className="text-xs font-bold text-white">Bayar di Kasir</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Sebut No: {order.orderNumber}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Order Item Details Card */}
      <div className="bg-slate-800/70 border border-slate-700/70 rounded-3xl p-5 mb-5 shadow-lg">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
          <span>Rincian Pesanan ({order.items.reduce((s, i) => s + i.quantity, 0)} Item)</span>
          <button
            onClick={() => onViewReceipt(order)}
            className="text-[11px] text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1"
          >
            <Receipt className="w-3.5 h-3.5" />
            Lihat Struk
          </button>
        </h3>

        <div className="divide-y divide-slate-700/60 text-xs">
          {order.items.map((item) => (
            <div key={item.id} className="py-2 flex justify-between items-start">
              <div>
                <span className="font-semibold text-white">
                  {item.quantity}x {item.productName}
                </span>
                {item.note && (
                  <p className="text-[11px] text-amber-300 italic mt-0.5">Note: {item.note}</p>
                )}
              </div>
              <span className="font-mono text-slate-300">{formatIDR(item.subtotal)}</span>
            </div>
          ))}
        </div>

        <div className="mt-3 pt-3 border-t border-slate-700 flex justify-between font-bold text-xs text-white">
          <span>Total</span>
          <span className="text-emerald-400 font-mono font-black text-sm">
            {formatIDR(order.total)}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-2 mt-auto">
        <button
          onClick={onOrderAgain}
          className="w-full py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition shadow-lg shadow-emerald-500/20"
        >
          [ PESAN LAGI / TAMBAH MENU ]
        </button>

        {settings.whatsapp && (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-emerald-400 font-semibold text-xs flex items-center justify-center gap-2 transition"
          >
            <MessageCircle className="w-4 h-4 text-emerald-400" />
            HUBUNGI WARUNG VIA WHATSAPP
          </a>
        )}
      </div>

      {/* QRIS Modal */}
      {showQrisModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xs rounded-3xl bg-white text-slate-900 p-6 text-center shadow-2xl space-y-3 animate-in zoom-in-95">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                PEMBAYARAN QRIS
              </span>
              <button
                onClick={() => setShowQrisModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="flex justify-center mb-1">
              <StoreLogo logo={settings.logo} name={settings.name} size="sm" />
            </div>
            <h3 className="text-base font-black text-slate-900 uppercase">
              {settings.name}
            </h3>

            <p className="text-2xl font-mono font-black text-emerald-600">
              {formatIDR(order.total)}
            </p>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 inline-block mx-auto">
              {qrisDataUrl && (
                <img
                  src={qrisDataUrl}
                  alt="QRIS Warung Bang Kobra"
                  className="w-52 h-52 object-contain mx-auto"
                />
              )}
            </div>

            <div className="space-y-1 text-xs text-slate-600">
              <p className="font-semibold">NMID: ID1020023849102</p>
              <p className="text-[11px] text-slate-400">
                Scan menggunakan aplikasi m-Banking atau e-Wallet apa saja.
              </p>
            </div>

            <button
              id="btn-simulate-qris-paid"
              disabled={isPayingQris}
              onClick={handleSimulateQrisPay}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider shadow-md transition flex items-center justify-center gap-1.5"
            >
              {isPayingQris ? 'Memverifikasi...' : '✓ Simulasi Pembayaran Sukses'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
