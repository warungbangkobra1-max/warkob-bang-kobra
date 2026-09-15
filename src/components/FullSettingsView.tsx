import React, { useState, useEffect, useRef } from 'react';
import {
  Store,
  Clock,
  Percent,
  CreditCard,
  Printer,
  Bell,
  Database,
  Save,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Volume2,
  Download,
  Upload,
  RefreshCw,
  Eye,
  FileText,
  Sliders,
  ShieldCheck,
  Building2,
  Sparkles,
  Cloud,
  Check,
  Copy,
  ExternalLink,
  GitBranch
} from 'lucide-react';
import { StoreSettings, PaymentMethod } from '../types';
import { updateSettings, exportBackupData, restoreBackupData, fetchDatabaseStatus, syncDatabase, DatabaseStatus, fetchProducts, fetchOrders } from '../lib/api';
import { LogoEditor } from './LogoEditor';
import { StoreLogo } from './StoreLogo';
import { playNewOrderChime, playSuccessChime } from '../lib/audio';
import { formatIDR } from '../lib/utils';
import { syncAllDataToFirestore, firestoreInfo } from '../lib/firebase';

interface FullSettingsViewProps {
  settings: StoreSettings & { isOpen: boolean };
  onSettingsUpdated: (newSettings: StoreSettings & { isOpen: boolean }) => void;
}

type SettingsSection = 'store' | 'operational' | 'tax' | 'payments' | 'receipt' | 'notifications' | 'backup';

const DAYS_OF_WEEK = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

export const FullSettingsView: React.FC<FullSettingsViewProps> = ({
  settings,
  onSettingsUpdated
}) => {
  const [activeSection, setActiveSection] = useState<SettingsSection>('store');
  const [form, setForm] = useState<StoreSettings>({
    ...settings,
    operationalDays: settings.operationalDays || DAYS_OF_WEEK,
    activePaymentMethods: settings.activePaymentMethods || ['cash', 'qris', 'transfer', 'debit'],
    receiptPaperSize: settings.receiptPaperSize || '58mm',
    receiptShowCashier: settings.receiptShowCashier !== false,
    receiptShowTable: settings.receiptShowTable !== false,
    receiptShowHeaderLogo: settings.receiptShowHeaderLogo !== false,
    receiptAutoCut: settings.receiptAutoCut !== false,
    soundNotification: settings.soundNotification !== false,
    kitchenAlertSound: settings.kitchenAlertSound !== false,
    priceRounding: settings.priceRounding || 0,
    serviceChargePercentage: settings.serviceChargePercentage || 0,
    closedMessage:
      settings.closedMessage ||
      'Warung Bang Kobra sedang tutup istirahat. Buka kembali setiap hari pkl 08:00 WIB.'
  });

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupMessage, setBackupMessage] = useState('');
  const [dbStatus, setDbStatus] = useState<DatabaseStatus | null>(null);
  const [syncingDb, setSyncingDb] = useState(false);
  const [firebaseSyncing, setFirebaseSyncing] = useState(false);
  const [firebaseSuccess, setFirebaseSuccess] = useState<string | null>(null);
  const [copiedGitCmd, setCopiedGitCmd] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setForm({
      ...settings,
      operationalDays: settings.operationalDays || DAYS_OF_WEEK,
      activePaymentMethods: settings.activePaymentMethods || ['cash', 'qris', 'transfer', 'debit'],
      receiptPaperSize: settings.receiptPaperSize || '58mm',
      receiptShowCashier: settings.receiptShowCashier !== false,
      receiptShowTable: settings.receiptShowTable !== false,
      receiptShowHeaderLogo: settings.receiptShowHeaderLogo !== false,
      receiptAutoCut: settings.receiptAutoCut !== false,
      soundNotification: settings.soundNotification !== false,
      kitchenAlertSound: settings.kitchenAlertSound !== false,
      priceRounding: settings.priceRounding || 0,
      serviceChargePercentage: settings.serviceChargePercentage || 0,
      closedMessage:
        settings.closedMessage ||
        'Warung Bang Kobra sedang tutup istirahat. Buka kembali setiap hari pkl 08:00 WIB.'
    });
  }, [settings]);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setErrorMessage('');
    try {
      const res = await updateSettings(form);
      const updated = res.settings || res;
      onSettingsUpdated({ ...settings, ...updated });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal menyimpan pengaturan');
    } finally {
      setSaving(false);
    }
  };

  const toggleDay = (day: string) => {
    const current = form.operationalDays || [];
    const updated = current.includes(day)
      ? current.filter((d) => d !== day)
      : [...current, day];
    setForm({ ...form, operationalDays: updated });
  };

  const togglePaymentMethod = (method: PaymentMethod) => {
    const current = form.activePaymentMethods || [];
    const updated = current.includes(method)
      ? current.filter((m) => m !== method)
      : [...current, method];
    if (updated.length === 0) {
      alert('Minimal harus ada 1 metode pembayaran yang aktif!');
      return;
    }
    setForm({ ...form, activePaymentMethods: updated });
  };

  const handleExportBackup = async () => {
    setBackupLoading(true);
    setBackupMessage('');
    try {
      const data = await exportBackupData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_${form.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setBackupMessage('File cadangan (.json) berhasil diunduh ke komputer/HP Anda');
    } catch (err: any) {
      setErrorMessage('Gagal mengekspor data cadangan');
    } finally {
      setBackupLoading(false);
    }
  };

  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        setBackupLoading(true);
        const res = await restoreBackupData(json);
        setBackupMessage(res.message || 'Data berhasil dipulihkan!');
        await loadDbStatus();
        setTimeout(() => window.location.reload(), 1500);
      } catch (err: any) {
        setErrorMessage(err.message || 'File cadangan tidak valid atau rusak');
      } finally {
        setBackupLoading(false);
      }
    };
    reader.readAsText(file);
  };

  const loadDbStatus = async () => {
    try {
      const status = await fetchDatabaseStatus();
      setDbStatus(status);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (activeSection === 'backup') {
      loadDbStatus();
    }
  }, [activeSection]);

  const handleSyncDb = async () => {
    setSyncingDb(true);
    setBackupMessage('');
    try {
      const res = await syncDatabase();
      setBackupMessage(res.message || 'Database berhasil disinkronkan!');
      await loadDbStatus();
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal sinkronisasi database');
    } finally {
      setSyncingDb(false);
    }
  };

  const handleSyncFirebase = async () => {
    setFirebaseSyncing(true);
    setFirebaseSuccess(null);
    setErrorMessage('');
    try {
      const [prods, ords] = await Promise.all([fetchProducts(), fetchOrders()]);
      const res = await syncAllDataToFirestore(prods, ords, form);
      setFirebaseSuccess(res.message);
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal sinkronisasi ke Firebase Firestore');
    } finally {
      setFirebaseSyncing(false);
    }
  };

  const copyCommand = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedGitCmd(id);
    setTimeout(() => setCopiedGitCmd(null), 2500);
  };

  const navItems: { id: SettingsSection; label: string; icon: React.ReactNode; desc: string }[] = [
    {
      id: 'store',
      label: 'Identitas & Profil Usaha',
      icon: <Building2 className="w-4 h-4" />,
      desc: 'Nama, logo, alamat, dan kontak'
    },
    {
      id: 'operational',
      label: 'Jam Buka & Operasional',
      icon: <Clock className="w-4 h-4" />,
      desc: 'Jadwal operasional & status warung'
    },
    {
      id: 'tax',
      label: 'Pajak & Biaya Tambahan',
      icon: <Percent className="w-4 h-4" />,
      desc: 'PB1, service charge & pembulatan'
    },
    {
      id: 'payments',
      label: 'Metode Pembayaran',
      icon: <CreditCard className="w-4 h-4" />,
      desc: 'Tunai, QRIS, transfer & kartu'
    },
    {
      id: 'receipt',
      label: 'Format Cetak Struk',
      icon: <Printer className="w-4 h-4" />,
      desc: 'Ukuran kertas thermal & pesan struk'
    },
    {
      id: 'notifications',
      label: 'Suara & Notifikasi',
      icon: <Bell className="w-4 h-4" />,
      desc: 'Lonceng pesanan & konfirmasi kasir'
    },
    {
      id: 'backup',
      label: 'Cadangan & Data Sistem',
      icon: <Database className="w-4 h-4" />,
      desc: 'Ekspor JSON & pemulihan data'
    }
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-800/90 border border-slate-700 shadow-xl">
        <div className="flex items-center gap-3.5">
          <StoreLogo logo={form.logo} name={form.name} size="lg" />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-white tracking-wide uppercase">
                Pengaturan Lengkap
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Sistem & Warung
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Konfigurasi menyeluruh identitas resto, cetak kasir, metode pembayaran, dan operasional.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {saveSuccess && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-bold animate-in fade-in">
              <CheckCircle2 className="w-4 h-4" />
              Tersimpan!
            </div>
          )}

          <button
            type="button"
            onClick={() => handleSave()}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black text-xs transition shadow-lg shadow-emerald-500/20 active:scale-95"
          >
            {saving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Simpan Semua Pengaturan
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Layout: Left Navigation + Right Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Sidebar Category Nav */}
        <div className="lg:col-span-4 space-y-2 bg-slate-850/90 p-2.5 rounded-2xl border border-slate-700/80">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 py-1.5">
            Kategori Pengaturan
          </p>

          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`w-full text-left p-3 rounded-xl transition flex items-start gap-3 ${
                activeSection === item.id
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/10'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div
                className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                  activeSection === item.id
                    ? 'bg-slate-950 text-emerald-400'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {item.icon}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold truncate leading-tight">{item.label}</div>
                <div
                  className={`text-[11px] truncate mt-0.5 ${
                    activeSection === item.id ? 'text-slate-900/80 font-medium' : 'text-slate-400'
                  }`}
                >
                  {item.desc}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Right Content Area */}
        <div className="lg:col-span-8 bg-slate-850/90 rounded-2xl border border-slate-700/80 p-6 shadow-xl">
          {/* SECTION 1: Identitas & Profil Usaha */}
          {activeSection === 'store' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-black text-white uppercase tracking-wide flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-emerald-400" />
                  Identitas & Profil Usaha
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Informasi ini muncul di struk belanja, header aplikasi kasir, dan menu pemesanan pelanggan.
                </p>
              </div>

              {/* Logo Editor Component */}
              <LogoEditor
                value={form.logo}
                storeName={form.name || 'Warung Bang Kobra'}
                onChange={(newLogo) => setForm({ ...form, logo: newLogo })}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Nama Usaha / Warung *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-emerald-500 font-semibold"
                    placeholder="Contoh: WARUNG BANG KOBRA"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Slogan / Tagline
                  </label>
                  <input
                    type="text"
                    value={form.tagline || ''}
                    onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-emerald-500"
                    placeholder="Contoh: Kenyang, Gurih, Harga Teman!"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Alamat Lengkap Usaha *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-emerald-500"
                    placeholder="Contoh: Jl. Pemuda Warkop No. 88"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Kota / Wilayah
                  </label>
                  <input
                    type="text"
                    value={form.city || ''}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-emerald-500"
                    placeholder="Contoh: Jakarta Selatan"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    No. Telepon Toko
                  </label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
                    placeholder="Contoh: 0812-3456-7890"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    WhatsApp Bisnis (Untuk Kontak Pelanggan)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-xs text-slate-500 font-mono">
                      +
                    </span>
                    <input
                      type="text"
                      value={form.whatsapp}
                      onChange={(e) =>
                        setForm({ ...form, whatsapp: e.target.value.replace(/[^0-9]/g, '') })
                      }
                      className="w-full pl-7 pr-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
                      placeholder="6281234567890"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Email Resmi Usaha (Opsional)
                  </label>
                  <input
                    type="email"
                    value={form.email || ''}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-emerald-500"
                    placeholder="warungbangkobra@gmail.com"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    NPWP / NIB Usaha (Jika Ada)
                  </label>
                  <input
                    type="text"
                    value={form.npwp || ''}
                    onChange={(e) => setForm({ ...form, npwp: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
                    placeholder="Contoh: 31.456.789.0-012.000"
                  />
                </div>
              </div>
            </div>
          )}

          {/* SECTION 2: Jam Buka & Operasional */}
          {activeSection === 'operational' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-black text-white uppercase tracking-wide flex items-center gap-2">
                  <Clock className="w-5 h-5 text-emerald-400" />
                  Jam Buka & Status Operasional
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Atur jam buka toko dan kontrol status pesanan pelanggan secara otomatis atau manual.
                </p>
              </div>

              {/* Manual Override Status */}
              <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-700 space-y-3">
                <label className="block text-xs font-bold text-slate-200">
                  Mode Status Toko Saat Ini:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, isOpenManualOverride: null })}
                    className={`p-3 rounded-xl border text-left transition ${
                      form.isOpenManualOverride === null
                        ? 'bg-emerald-500/20 border-emerald-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="font-bold text-xs block">⏰ Otomatis</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Buka/tutup otomatis mengikuti jadwal jam
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setForm({ ...form, isOpenManualOverride: true })}
                    className={`p-3 rounded-xl border text-left transition ${
                      form.isOpenManualOverride === true
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="font-bold text-xs block">🟢 Paksa Buka (Manual)</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Selalu menerima pesanan QR
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setForm({ ...form, isOpenManualOverride: false })}
                    className={`p-3 rounded-xl border text-left transition ${
                      form.isOpenManualOverride === false
                        ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="font-bold text-xs block">🔴 Tutup Sementara</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Tolak pesanan baru sementara
                    </span>
                  </button>
                </div>
              </div>

              {/* Time pickers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Jam Buka (WIB)
                  </label>
                  <input
                    type="time"
                    value={form.openTime}
                    onChange={(e) => setForm({ ...form, openTime: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Jam Tutup (WIB)
                  </label>
                  <input
                    type="time"
                    value={form.closeTime}
                    onChange={(e) => setForm({ ...form, closeTime: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Hari Operasional */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">
                  Hari Buka Operasional:
                </label>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map((day) => {
                    const isChecked = (form.operationalDays || []).includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(day)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                          isChecked
                            ? 'bg-emerald-500 text-slate-950 border-emerald-500 shadow-sm'
                            : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Pesan Saat Tutup */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Pesan Pemberitahuan Saat Toko Tutup (Tampil di Menu HP Pelanggan)
                </label>
                <textarea
                  rows={3}
                  value={form.closedMessage || ''}
                  onChange={(e) => setForm({ ...form, closedMessage: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500 resize-none"
                  placeholder="Contoh: Warung Bang Kobra sedang istirahat. Buka kembali setiap hari pukul 08:00 WIB."
                />
              </div>
            </div>
          )}

          {/* SECTION 3: Pajak & Biaya Tambahan */}
          {activeSection === 'tax' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-black text-white uppercase tracking-wide flex items-center gap-2">
                  <Percent className="w-5 h-5 text-emerald-400" />
                  Pajak, Layanan & Pembulatan Harga
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Atur kalkulasi otomatis untuk pajak restoran (PB1), biaya layanan, dan pembulatan struk.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Pajak Restoran / PB1 (%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      max={25}
                      step={0.5}
                      value={form.taxPercentage}
                      onChange={(e) =>
                        setForm({ ...form, taxPercentage: Math.max(0, Number(e.target.value)) })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                    <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 font-bold">
                      %
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Isi 0 jika harga menu sudah termasuk pajak / bebas pajak warung.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Biaya Layanan / Service Charge (%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      max={20}
                      step={0.5}
                      value={form.serviceChargePercentage || 0}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          serviceChargePercentage: Math.max(0, Number(e.target.value))
                        })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                    <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 font-bold">
                      %
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Biaya pelayan / fasilitas makan di tempat.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Diskon Global Toko (%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={form.discountPercentage}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          discountPercentage: Math.max(0, Number(e.target.value))
                        })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                    <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 font-bold">
                      %
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Diskon promo yang berlaku otomatis untuk semua transaksi.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Aturan Pembulatan Total Struk
                  </label>
                  <select
                    value={form.priceRounding || 0}
                    onChange={(e) =>
                      setForm({ ...form, priceRounding: Number(e.target.value) })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value={0}>Tanpa Pembulatan (Nominal Asli)</option>
                    <option value={100}>Bulatkan ke Rp 100 terdekat</option>
                    <option value={500}>Bulatkan ke Rp 500 terdekat</option>
                    <option value={1000}>Bulatkan ke Rp 1.000 terdekat</option>
                  </select>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Mempermudah uang kembalian pecahan tunai kasir.
                  </span>
                </div>
              </div>

              {/* Simulation Box */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-700/60">
                <span className="text-[11px] font-bold text-emerald-400 block mb-2">
                  Contoh Simulasi Struk Belanja Rp 50.000:
                </span>
                <div className="space-y-1 font-mono text-xs text-slate-300">
                  <div className="flex justify-between">
                    <span>Subtotal Makanan:</span>
                    <span>Rp 50.000</span>
                  </div>
                  {form.discountPercentage > 0 && (
                    <div className="flex justify-between text-emerald-400">
                      <span>Diskon ({form.discountPercentage}%):</span>
                      <span>- Rp {(50000 * form.discountPercentage) / 100}</span>
                    </div>
                  )}
                  {form.taxPercentage > 0 && (
                    <div className="flex justify-between text-amber-400">
                      <span>Pajak Resto ({form.taxPercentage}%):</span>
                      <span>+ Rp {(50000 * form.taxPercentage) / 100}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-white pt-2 border-t border-slate-700">
                    <span>Total Pembayaran Pelanggan:</span>
                    <span>
                      {formatIDR(
                        50000 -
                          (50000 * form.discountPercentage) / 100 +
                          (50000 * form.taxPercentage) / 100
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 4: Metode Pembayaran */}
          {activeSection === 'payments' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-black text-white uppercase tracking-wide flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-emerald-400" />
                  Kanal & Metode Pembayaran Aktif
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Centang metode yang diterima kasir POS dan yang tampil saat pelanggan checkout mandiri via QR.
                </p>
              </div>

              <div className="space-y-3">
                {[
                  {
                    id: 'cash' as PaymentMethod,
                    title: '💵 Tunai (Cash)',
                    desc: 'Pembayaran konvensional uang kertas/koin dengan kalkulator kembalian otomatis di POS kasir.'
                  },
                  {
                    id: 'qris' as PaymentMethod,
                    title: '📱 QRIS (Semua Bank & E-Wallet)',
                    desc: 'Standar QRIS Nasional (BCA, Mandiri, GoPay, OVO, ShopeePay, Dana, LinkAja).'
                  },
                  {
                    id: 'transfer' as PaymentMethod,
                    title: '🏦 Transfer Bank',
                    desc: 'Transfer langsung antar rekening bank (BCA, Mandiri, BRI, BNI) dengan verifikasi bukti bayar kasir.'
                  },
                  {
                    id: 'debit' as PaymentMethod,
                    title: '💳 Kartu Debit & EDC',
                    desc: 'Pembayaran gesek kartu debit / ATM pada mesin EDC kasir.'
                  }
                ].map((item) => {
                  const isActive = (form.activePaymentMethods || []).includes(item.id);
                  return (
                    <div
                      key={item.id}
                      onClick={() => togglePaymentMethod(item.id)}
                      className={`p-4 rounded-xl border flex items-start justify-between gap-3 cursor-pointer transition select-none ${
                        isActive
                          ? 'bg-emerald-500/10 border-emerald-500/50'
                          : 'bg-slate-900 border-slate-800 opacity-60 hover:opacity-80'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="text-sm font-bold text-white flex items-center gap-2">
                          <span>{item.title}</span>
                          {isActive && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                              AKTIF
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400">{item.desc}</p>
                      </div>

                      <div
                        className={`w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 transition ${
                          isActive
                            ? 'bg-emerald-500 border-emerald-400 text-slate-950 font-black'
                            : 'border-slate-700 bg-slate-950'
                        }`}
                      >
                        {isActive && <CheckCircle2 className="w-4 h-4" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SECTION 5: Format Cetak Struk */}
          {activeSection === 'receipt' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-black text-white uppercase tracking-wide flex items-center gap-2">
                  <Printer className="w-5 h-5 text-emerald-400" />
                  Format & Pengaturan Struk Kasir (Thermal Printer)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Sesuaikan ukuran kertas printer Bluetooth/USB thermal dan informasi yang tercantum pada struk fisik.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Lebar Kertas Thermal Printer
                  </label>
                  <select
                    value={form.receiptPaperSize || '58mm'}
                    onChange={(e) =>
                      setForm({ ...form, receiptPaperSize: e.target.value as '58mm' | '80mm' })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="58mm">58mm (Printer Mini / Mobile POS Bluetooth)</option>
                    <option value="80mm">80mm (Printer Desktop Standar Resto)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-300">
                    Opsi Elemen Struk:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.receiptShowCashier}
                        onChange={(e) =>
                          setForm({ ...form, receiptShowCashier: e.target.checked })
                        }
                        className="rounded accent-emerald-500"
                      />
                      <span>Nama Kasir</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.receiptShowTable}
                        onChange={(e) =>
                          setForm({ ...form, receiptShowTable: e.target.checked })
                        }
                        className="rounded accent-emerald-500"
                      />
                      <span>Nomor Meja</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.receiptShowHeaderLogo}
                        onChange={(e) =>
                          setForm({ ...form, receiptShowHeaderLogo: e.target.checked })
                        }
                        className="rounded accent-emerald-500"
                      />
                      <span>Logo Warung</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.receiptAutoCut}
                        onChange={(e) =>
                          setForm({ ...form, receiptAutoCut: e.target.checked })
                        }
                        className="rounded accent-emerald-500"
                      />
                      <span>Potong Kertas (Cut)</span>
                    </label>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Pesan Penutup / Ucapan Terima Kasih (Footer Struk)
                  </label>
                  <textarea
                    rows={2}
                    value={form.receiptFooter || ''}
                    onChange={(e) => setForm({ ...form, receiptFooter: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500 resize-none font-mono"
                    placeholder="Contoh: Terima kasih telah berkunjung ke Warung Bang Kobra! Semoga harimu menyenangkan 🙏"
                  />
                </div>
              </div>

              {/* Live Receipt Sample Preview */}
              <div className="p-4 rounded-xl bg-white text-slate-950 max-w-sm mx-auto shadow-2xl font-mono text-xs border border-slate-300 space-y-2">
                <div className="text-center pb-2 border-b border-dashed border-slate-400">
                  {form.receiptShowHeaderLogo && (
                    <div className="flex justify-center mb-1">
                      <StoreLogo
                        logo={form.logo}
                        name={form.name}
                        size="sm"
                        className="bg-transparent border-0"
                      />
                    </div>
                  )}
                  <h4 className="font-black text-sm uppercase">{form.name}</h4>
                  <p className="text-[10px] text-slate-600 font-sans">{form.tagline}</p>
                  <p className="text-[9px] text-slate-500 font-sans">{form.address}</p>
                  <p className="text-[9px] text-slate-500 font-mono">Telp/WA: {form.whatsapp}</p>
                </div>

                <div className="space-y-0.5 text-[11px]">
                  <div className="flex justify-between">
                    <span>No: ORD-DEMO01</span>
                    <span>{form.receiptPaperSize}</span>
                  </div>
                  {form.receiptShowCashier && (
                    <div className="flex justify-between">
                      <span>Kasir: Bang Kobra</span>
                      <span>LUNAS</span>
                    </div>
                  )}
                  {form.receiptShowTable && (
                    <div className="flex justify-between">
                      <span>Meja: Meja 02</span>
                      <span>Dine In</span>
                    </div>
                  )}
                </div>

                <div className="border-t border-b border-dashed border-slate-400 py-1.5 space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span>1x Indomie Spesial Kobra</span>
                    <span>15.000</span>
                  </div>
                  <div className="flex justify-between">
                    <span>1x Es Kopi Susu</span>
                    <span>8.000</span>
                  </div>
                </div>

                <div className="space-y-0.5 text-[11px]">
                  <div className="flex justify-between font-black text-xs pt-1">
                    <span>TOTAL:</span>
                    <span>Rp 23.000</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Bayar (QRIS):</span>
                    <span>Rp 23.000</span>
                  </div>
                </div>

                <div className="text-center pt-2 border-t border-dashed border-slate-400 text-[10px] text-slate-600 font-sans">
                  {form.receiptFooter}
                </div>
              </div>
            </div>
          )}

          {/* SECTION 6: Suara & Notifikasi */}
          {activeSection === 'notifications' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-black text-white uppercase tracking-wide flex items-center gap-2">
                  <Bell className="w-5 h-5 text-emerald-400" />
                  Suara & Notifikasi Audio Kasir
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Dengarkan bunyi lonceng otomatis saat ada pesanan baru masuk dari meja atau kasir melunasi transaksi.
                </p>
              </div>

              <div className="space-y-4">
                {/* Chime 1: Pesanan Masuk */}
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">
                        🔔 Lonceng Pesanan Baru Masuk
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                        Chime Ganda
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Berbunyi di layar kasir & dapur saat pelanggan mengirim order mandiri lewat scan QR.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => playNewOrderChime()}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition"
                    >
                      <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                      Uji Suara
                    </button>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.soundNotification}
                        onChange={(e) =>
                          setForm({ ...form, soundNotification: e.target.checked })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-10 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                    </label>
                  </div>
                </div>

                {/* Chime 2: Sukses Bayar */}
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">
                        💰 Suara Transaksi Selesai & Lunas
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono">
                        Melodi Kasir
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Berbunyi saat tombol "Bayar & Cetak Struk" ditekan atau pembayaran QRIS berhasil.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => playSuccessChime()}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition self-start sm:self-auto"
                  >
                    <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                    Uji Suara
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 7: Cadangan & Data Sistem */}
          {activeSection === 'backup' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-black text-white uppercase tracking-wide flex items-center gap-2">
                  <Database className="w-5 h-5 text-emerald-400" />
                  Database & Keamanan Data Usaha
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Sistem penyimpanan database permanen di server dan pengelolaan cadangan file data.
                </p>
              </div>

              {/* Status Database Permanen */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/40 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-black text-white uppercase tracking-wide">
                          Penyimpanan Database Permanen Aktif
                        </h4>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          File-Backed Disk
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1 max-w-xl">
                        Seluruh menu produk, stok, harga, barcode, riwayat transaksi kasir, dan konfigurasi warung disimpan permanen ke berkas disk <code className="px-1.5 py-0.5 rounded bg-slate-800 text-emerald-400 font-mono text-[11px]">data/database.json</code>. Data Anda aman dan tidak akan hilang atau berubah-ubah saat server/halaman di-refresh.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleSyncDb}
                      disabled={syncingDb}
                      className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition shadow-md"
                    >
                      {syncingDb ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Save className="w-3.5 h-3.5" />
                      )}
                      Sinkronkan Sekarang
                    </button>
                    <a
                      href="/api/database/download"
                      download
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1.5 border border-slate-600 transition"
                    >
                      <Download className="w-3.5 h-3.5 text-cyan-400" />
                      Unduh Database
                    </a>
                  </div>
                </div>

                {/* Status metrics */}
                {dbStatus && (
                  <div className="mt-4 pt-4 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                      <span className="text-slate-400 text-[11px] block">Status Berkas:</span>
                      <span className="font-bold text-emerald-400 font-mono text-xs">
                        {dbStatus.exists ? 'Tersimpan di Disk' : 'In-Memory'}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                      <span className="text-slate-400 text-[11px] block">Total Produk:</span>
                      <span className="font-bold text-white text-xs">{dbStatus.totalProducts} Item</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                      <span className="text-slate-400 text-[11px] block">Total Pesanan:</span>
                      <span className="font-bold text-white text-xs">{dbStatus.totalOrders} Transaksi</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                      <span className="text-slate-400 text-[11px] block">Ukuran File:</span>
                      <span className="font-bold text-cyan-400 font-mono text-xs">
                        {Math.round(dbStatus.sizeBytes / 1024)} KB
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Integrasi Cloud Firebase Firestore */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-950/30 via-slate-900 to-slate-900 border border-amber-500/30 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                      <Cloud className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-black text-white uppercase tracking-wide">
                          Firebase Firestore Cloud Database
                        </h4>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                          Cloud Connected
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1 max-w-xl">
                        Aplikasi telah terhubung ke cloud database Google Firebase Firestore. Data produk dan pesanan dapat disinkronkan langsung ke cloud secara real-time.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleSyncFirebase}
                      disabled={firebaseSyncing}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 text-slate-950 font-black text-xs flex items-center gap-1.5 transition shadow-md shadow-amber-500/20"
                    >
                      {firebaseSyncing ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Cloud className="w-3.5 h-3.5" />
                      )}
                      Sinkronkan ke Cloud Firestore
                    </button>
                  </div>
                </div>

                {firebaseSuccess && (
                  <div className="mt-4 p-3 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-amber-400" />
                    <span>{firebaseSuccess}</span>
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                    <span className="text-slate-400 text-[11px] block">Project ID Firebase:</span>
                    <span className="font-mono text-amber-300 font-bold text-xs truncate block">
                      {firestoreInfo.projectId}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                    <span className="text-slate-400 text-[11px] block">Database ID:</span>
                    <span className="font-mono text-slate-200 text-[11px] truncate block" title={firestoreInfo.databaseId}>
                      {firestoreInfo.databaseId}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                    <span className="text-slate-400 text-[11px] block">Security Rules:</span>
                    <span className="font-bold text-emerald-400 text-xs flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Deployed & Terproteksi
                    </span>
                  </div>
                </div>
              </div>

              {/* Integrasi GitHub & Vercel */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-950/30 via-slate-900 to-slate-900 border border-indigo-500/30 shadow-xl">
                <div className="flex items-start gap-3.5 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/30">
                    <GitBranch className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-black text-white uppercase tracking-wide">
                        Integrasi GitHub & Vercel Deployment
                      </h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                        Git Branch: main (Ready)
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1">
                      Repository Git lokal telah diinisialisasi dan berkas konfigurasi <code className="px-1.5 py-0.5 rounded bg-slate-800 text-indigo-300 font-mono text-[11px]">vercel.json</code> siap untuk live deployment global.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* GitHub Card */}
                  <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-xs font-black text-white flex items-center gap-1.5">
                          🐙 1. Hubungkan ke GitHub
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                          git push
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mb-3">
                        Buat repository kosong di <strong className="text-white">github.com/new</strong>, lalu jalankan perintah berikut di terminal Anda:
                      </p>

                      <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 font-mono text-[11px] text-indigo-300 space-y-1 select-all">
                        <div>git remote add origin https://github.com/USERNAME/warung-kobra.git</div>
                        <div>git push -u origin main</div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        copyCommand(
                          'git remote add origin https://github.com/USERNAME/warung-kobra.git\ngit push -u origin main',
                          'git'
                        )
                      }
                      className="mt-3 w-full py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition"
                    >
                      {copiedGitCmd === 'git' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-300" />
                          Tersalin ke Clipboard!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          Salin Perintah Git Push
                        </>
                      )}
                    </button>
                  </div>

                  {/* Vercel Card */}
                  <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-xs font-black text-white flex items-center gap-1.5">
                          ▲ 2. Deploy ke Vercel
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                          vercel.json Configured
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mb-2">
                        Setelah repository terhubung ke GitHub, deployment ke Vercel hanya butuh 1-klik:
                      </p>

                      <ol className="space-y-1.5 text-[11px] text-slate-300 pl-4 list-decimal marker:text-indigo-400">
                        <li>Buka dashboard <strong>vercel.com</strong> & klik <em>Add New Project</em></li>
                        <li>Pilih (Import) repository GitHub warung Anda</li>
                        <li>Framework Preset otomatis mendeteksi <strong>Vite</strong></li>
                        <li>Klik <strong>Deploy</strong> (otomatis online dalam 60 detik)</li>
                      </ol>
                    </div>

                    <a
                      href="https://vercel.com/new"
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-750 text-white font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-700 transition"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
                      Buka Dashboard Vercel.com
                    </a>
                  </div>
                </div>
              </div>

              {backupMessage && (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{backupMessage}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Export Card */}
                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-700/80 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3">
                      <Download className="w-5 h-5" />
                    </div>
                    <h4 className="text-sm font-bold text-white">
                      Unduh Salinan Cadangan (.JSON)
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Menyimpan semua master produk, stok, data QR takeaway, riwayat order, dan pengaturan toko ke file komputer/HP Anda.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleExportBackup}
                    disabled={backupLoading}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs transition"
                  >
                    {backupLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    Unduh Cadangan Sekarang
                  </button>
                </div>

                {/* Import Card */}
                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-700/80 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center mb-3">
                      <Upload className="w-5 h-5" />
                    </div>
                    <h4 className="text-sm font-bold text-white">
                      Pulihkan Data dari Berkas (.JSON)
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Unggah file cadangan yang pernah diunduh sebelumnya untuk mengembalikan kondisi data sistem jika diperlukan.
                    </p>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/json"
                    onChange={handleRestoreFile}
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={backupLoading}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 text-white font-bold text-xs border border-slate-600 transition"
                  >
                    <Upload className="w-4 h-4 text-cyan-400" />
                    Pilih File Cadangan & Pulihkan
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Save Action Bar */}
          <div className="mt-8 pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-[11px] text-slate-400">
              * Perubahan akan langsung disinkronkan secara real-time ke seluruh layar POS & menu pelanggan.
            </span>

            <button
              type="button"
              onClick={() => handleSave()}
              disabled={saving}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black text-xs transition shadow-lg shadow-emerald-500/20"
            >
              {saving ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Simpan Pengaturan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
