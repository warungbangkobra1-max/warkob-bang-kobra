import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  QrCode,
  Download,
  Printer,
  CheckCircle2,
  XCircle,
  ExternalLink,
  RefreshCw,
  Copy,
  Check,
  Smartphone,
  ShoppingBag,
  Sparkles,
  MapPin,
  Save,
  AlertCircle
} from 'lucide-react';
import { QRCodeData, StoreSettings } from '../types';
import { fetchQRCodes, createQRCode, updateQRCode } from '../lib/api';
import { StoreLogo } from './StoreLogo';

interface QRManagementProps {
  onOpenCustomerView: (qrCode: string) => void;
  settings?: StoreSettings;
}

export const QRManagement: React.FC<QRManagementProps> = ({ onOpenCustomerView, settings }) => {
  const [takeawayQR, setTakeawayQR] = useState<QRCodeData | null>(null);
  const [qrImageUrl, setQrImageUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const loadQRData = async () => {
    try {
      setLoading(true);
      const data = await fetchQRCodes();
      // Find takeaway QR or fallback to first
      let target = data.find(
        (q) => q.code === 'kasir-takeaway' || q.type === 'counter' || q.name.toLowerCase().includes('takeaway')
      );

      // If not found, create one automatically
      if (!target && data.length > 0) {
        target = data[0];
      } else if (!target) {
        target = await createQRCode({
          name: 'Order Kasir Takeaway',
          type: 'counter',
          location: 'Meja Kasir Utama / Area Bawa Pulang',
          code: 'kasir-takeaway'
        });
      }

      setTakeawayQR(target);
      setEditName(target.name);
      setEditLocation(target.location);
    } catch (e) {
      console.error('Error fetching QR data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQRData();
  }, []);

  // Generate high-resolution QR code
  useEffect(() => {
    if (!takeawayQR) return;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const orderUrl = `${origin}/order/${takeawayQR.code}`;

    QRCode.toDataURL(orderUrl, {
      width: 480,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      },
      errorCorrectionLevel: 'H'
    })
      .then((url) => setQrImageUrl(url))
      .catch((err) => console.error(err));
  }, [takeawayQR]);

  const handleToggleStatus = async () => {
    if (!takeawayQR) return;
    try {
      const newStatus = !takeawayQR.isActive;
      await updateQRCode(takeawayQR.id, { isActive: newStatus });
      setTakeawayQR({ ...takeawayQR, isActive: newStatus });
    } catch (err) {
      alert('Gagal mengubah status QR code');
    }
  };

  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!takeawayQR || !editName.trim()) return;
    try {
      setSaving(true);
      const updated = await updateQRCode(takeawayQR.id, {
        name: editName.trim(),
        location: editLocation.trim() || 'Meja Kasir Utama'
      });
      setTakeawayQR(updated);
      setIsEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      alert('Gagal menyimpan perubahan');
    } finally {
      setSaving(false);
    }
  };

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const fullOrderUrl = takeawayQR ? `${origin}/order/${takeawayQR.code}` : `${origin}/order/kasir-takeaway`;

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(fullOrderUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Download printable standee card
  const handleDownloadStandee = async () => {
    if (!takeawayQR || !qrImageUrl) return;

    const canvas = document.createElement('canvas');
    canvas.width = 650;
    canvas.height = 860;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Card background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 650, 860);

    // Decorative top header bar
    ctx.fillStyle = '#10b981';
    ctx.fillRect(0, 0, 650, 24);

    // Store Name & Tagline
    ctx.fillStyle = '#0f172a';
    ctx.font = '900 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText((settings?.name || 'WARUNG BANG KOBRA').toUpperCase(), 325, 80);

    ctx.fillStyle = '#64748b';
    ctx.font = '16px sans-serif';
    ctx.fillText(settings?.tagline || 'Kenyang, Gurih, Harga Teman!', 325, 110);

    // Pill badge: TAKEAWAY / BAWA PULANG
    ctx.fillStyle = '#ecfdf5';
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(175, 135, 300, 38, 19) : ctx.fillRect(175, 135, 300, 38);
    ctx.fill();
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#065f46';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('🛍️ ORDER KASIR TAKEAWAY', 325, 160);

    // Subtitle
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('SCAN DI SINI UNTUK PESAN', 325, 220);

    ctx.fillStyle = '#475569';
    ctx.font = '15px sans-serif';
    ctx.fillText('Pesan cepat bawa pulang langsung dari ponsel Anda', 325, 246);

    // QR Image Container
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(145, 275, 360, 360, 24) : ctx.fillRect(145, 275, 360, 360);
    ctx.fill();
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.stroke();

    const img = new Image();
    img.src = qrImageUrl;
    await new Promise((res) => {
      img.onload = res;
    });
    ctx.drawImage(img, 165, 295, 320, 320);

    // Steps Instructions
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('1. Buka Kamera HP / Google Lens', 325, 675);
    ctx.fillText('2. Pilih Menu & Konfirmasi Pesanan', 325, 705);
    ctx.fillText('3. Pesanan Siap Disiapkan Kasir', 325, 735);

    // Footer divider & info
    ctx.strokeStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.moveTo(80, 765);
    ctx.lineTo(570, 765);
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = '13px sans-serif';
    ctx.fillText('✓ Tanpa Install Aplikasi • Langsung dari Browser HP', 325, 795);
    ctx.fillText(`${settings?.address || 'Jl. Pemuda Warkop No. 88'} • Kasir POS`, 325, 820);

    const a = document.createElement('a');
    a.download = `Standee-QR-Takeaway-${settings?.name?.replace(/\s+/g, '_') || 'Warung'}.png`;
    a.href = canvas.toDataURL('image/png');
    a.click();
  };

  // Direct print standee
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-850/90 border border-slate-700/80 p-5 rounded-2xl backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <ShoppingBag className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                Manajemen QR Order Kasir Takeaway
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Satu QR code terpusat di meja kasir untuk pemesanan mandiri pelanggan bawa pulang (Takeaway).
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadQRData}
            className="p-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-750 transition"
            title="Muat Ulang"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
          <button
            id="btn-test-customer-order"
            onClick={() => onOpenCustomerView(takeawayQR?.code || 'kasir-takeaway')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition"
          >
            <Smartphone className="w-4 h-4" />
            Uji Coba Tampilan HP
          </button>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left / Center: Acrylic Standee Preview */}
        <div className="lg:col-span-6 flex flex-col items-center">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5 self-start">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            Tampilan Siap Cetak (Standee Meja Kasir)
          </div>

          {/* Standee Preview Card */}
          <div
            id="standee-print-card"
            className="w-full max-w-sm bg-white text-slate-900 rounded-3xl p-6 shadow-2xl border-4 border-slate-100 flex flex-col items-center relative overflow-hidden transition hover:shadow-emerald-500/10"
          >
            {/* Top accent bar */}
            <div className="absolute top-0 left-0 right-0 h-3 bg-emerald-500" />

            {/* Store Brand */}
            <div className="text-center pt-2 mb-2">
              <div className="inline-flex mb-1">
                <StoreLogo logo={settings?.logo || '🐍'} name={settings?.name || 'Warung'} size="md" />
              </div>
              <h3 className="font-black text-lg text-slate-900 tracking-wide uppercase">
                {settings?.name || 'WARUNG BANG KOBRA'}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                {settings?.tagline || 'Kenyang, Gurih, Harga Teman!'}
              </p>
            </div>

            {/* Takeaway Pill */}
            <div className="my-2 px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-black flex items-center gap-1.5 tracking-wide shadow-xs">
              <ShoppingBag className="w-3.5 h-3.5 text-emerald-600" />
              <span>ORDER KASIR TAKEAWAY</span>
            </div>

            <div className="text-center mb-3">
              <h4 className="font-black text-base text-slate-900">
                SCAN DI SINI UNTUK PESAN
              </h4>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Pesan bawa pulang mandiri tanpa antre di kasir
              </p>
            </div>

            {/* QR Code Container */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 shadow-inner my-1 flex flex-col items-center">
              {qrImageUrl ? (
                <img
                  src={qrImageUrl}
                  alt="QR Order Takeaway"
                  className="w-52 h-52 object-contain rounded-xl"
                />
              ) : (
                <div className="w-52 h-52 flex items-center justify-center bg-slate-100 rounded-xl text-slate-400 text-xs animate-pulse">
                  Menyiapkan QR Code...
                </div>
              )}
              <span className="font-mono text-[10px] text-slate-600 mt-1.5 font-bold tracking-wider">
                KODE: {takeawayQR?.code || 'kasir-takeaway'}
              </span>
            </div>

            {/* Instructions */}
            <div className="w-full mt-4 pt-3 border-t border-slate-200 text-center space-y-1 text-slate-600 text-[11px]">
              <div className="flex items-center justify-center gap-1 font-semibold text-slate-800">
                <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[10px] font-bold">
                  1
                </span>
                <span>Arahkan kamera HP ke QR Code</span>
              </div>
              <div className="flex items-center justify-center gap-1 font-semibold text-slate-800">
                <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[10px] font-bold">
                  2
                </span>
                <span>Pilih menu makanan & minuman</span>
              </div>
              <div className="flex items-center justify-center gap-1 font-semibold text-slate-800">
                <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[10px] font-bold">
                  3
                </span>
                <span>Pesanan langsung siap diproses kasir</span>
              </div>
            </div>

            <p className="text-[10px] text-slate-600 mt-3">
              ✓ Tanpa Install Aplikasi • Langsung dari Kamera HP
            </p>
          </div>
        </div>

        {/* Right: Actions, Links & Settings */}
        <div className="lg:col-span-6 space-y-4">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5">
            <QrCode className="w-3.5 h-3.5 text-emerald-400" />
            Tindakan & Pengaturan QR Takeaway
          </div>

          {/* Quick Action Buttons */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 space-y-3 shadow-md">
            <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
              <span>🖨️ Cetak & Unduh Standee Meja</span>
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Cetak dan tempel atau letakkan pada meja kasir (acrylic tent stand) agar pelanggan yang ingin pesan bawa pulang dapat langsung scan tanpa berdesakan.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                id="btn-download-standee-png"
                onClick={handleDownloadStandee}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition"
              >
                <Download className="w-4 h-4" />
                Unduh Gambar Standee (PNG)
              </button>

              <button
                id="btn-print-standee"
                onClick={handlePrint}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs transition border border-slate-600"
              >
                <Printer className="w-4 h-4" />
                Cetak Standee Langsung
              </button>
            </div>
          </div>

          {/* Direct URL Box */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <ExternalLink className="w-4 h-4 text-emerald-400" />
                Tautan Langsung Pesanan Takeaway
              </h4>
              <span className="text-[11px] text-emerald-400 font-mono">
                {takeawayQR?.isActive ? '● Aktif' : '○ Non-aktif'}
              </span>
            </div>

            <p className="text-xs text-slate-400">
              Link ini bisa dibagikan juga ke status WhatsApp atau media sosial warung untuk order pesan antar/ambil mandiri.
            </p>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={fullOrderUrl}
                className="flex-1 bg-slate-900 border border-slate-700 px-3 py-2.5 rounded-xl text-xs text-emerald-300 font-mono focus:outline-none select-all"
              />
              <button
                id="btn-copy-takeaway-link"
                onClick={handleCopyLink}
                className="px-3.5 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold flex items-center gap-1.5 transition shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Disalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Salin Link</span>
                  </>
                )}
              </button>
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-slate-700/60 text-xs">
              <span className="text-slate-400">Status Pemesanan Mandiri:</span>
              <button
                onClick={handleToggleStatus}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition ${
                  takeawayQR?.isActive
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                }`}
              >
                {takeawayQR?.isActive ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Aktif (Pelanggan bisa order)
                  </>
                ) : (
                  <>
                    <XCircle className="w-3.5 h-3.5 text-rose-400" />
                    Non-aktif (Order ditutup)
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Edit Information Form */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-400" />
                Informasi Meja Kasir / Lokasi
              </h4>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-xs text-emerald-400 hover:underline font-semibold"
                >
                  Ubah Keterangan
                </button>
              )}
            </div>

            {saveSuccess && (
              <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Informasi QR berhasil diperbarui!
              </div>
            )}

            {isEditing ? (
              <form onSubmit={handleSaveDetails} className="space-y-3 pt-1">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Label Nama QR
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                    placeholder="Contoh: Order Kasir Takeaway"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Keterangan Penempatan / Lokasi
                  </label>
                  <input
                    type="text"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                    placeholder="Contoh: Meja Kasir Utama / Area Bawa Pulang"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setEditName(takeawayQR?.name || '');
                      setEditLocation(takeawayQR?.location || '');
                    }}
                    className="px-3 py-1.5 rounded-xl border border-slate-700 text-slate-300 text-xs hover:bg-slate-750"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shadow-md transition"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {saving ? 'Menyimpan...' : 'Simpan'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-750">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">
                    Nama QR:
                  </span>
                  <span className="text-white font-semibold font-mono">
                    {takeawayQR?.name || 'Order Kasir Takeaway'}
                  </span>
                </div>
                <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-750">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">
                    Lokasi:
                  </span>
                  <span className="text-white font-semibold">
                    {takeawayQR?.location || 'Meja Kasir Utama'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Quick Notice Card */}
          <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-600/30 text-emerald-200 text-xs leading-relaxed space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Sistem QR Kasir Takeaway Siap Pakai
            </div>
            <p>
              Dengan sistem 1 QR ini, pelanggan yang datang untuk memesan bawa pulang cukup memindai QR di meja kasir. Pesanan akan otomatis berstatus <strong>Bawa Pulang (Takeaway)</strong> dan langsung muncul di layar kasir dengan notifikasi suara.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
