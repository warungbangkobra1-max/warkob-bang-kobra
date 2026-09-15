import React, { useState, useEffect, useRef } from 'react';
import {
  User,
  Shield,
  Key,
  Clock,
  Coins,
  CheckCircle2,
  AlertCircle,
  Save,
  RefreshCw,
  Camera,
  Phone,
  Mail,
  Lock,
  Eye,
  EyeOff,
  UserCheck,
  Briefcase,
  Sparkles,
  ArrowRightLeft,
  FileCheck,
  DollarSign
} from 'lucide-react';
import { UserProfile, StoreSettings } from '../types';
import { fetchProfile, updateProfile } from '../lib/api';
import { formatIDR, formatDate } from '../lib/utils';
import { playSuccessChime } from '../lib/audio';

interface ProfileViewProps {
  settings: StoreSettings;
  onProfileUpdated?: (profile: UserProfile) => void;
}

type ProfileTab = 'info' | 'security' | 'shift' | 'switch';

const AVATAR_PRESETS = [
  '🐍', '👑', '👨‍🍳', '👩‍🍳', '🏪', '☕', '💼', '⭐', '🔥', '🍜', '🦁', '🎯'
];

const PRESET_ACCOUNTS: Partial<UserProfile>[] = [
  {
    id: 'usr-01',
    name: 'Bang Kobra (Dimas S.)',
    username: 'owner_kobra',
    role: 'owner',
    avatar: '🐍',
    phone: '0812-3456-7890',
    email: 'bang.kobra.warkop@gmail.com',
    pin: '1234',
    initialCash: 350000,
    notes: 'Pemilik & Penanggung Jawab Utama'
  },
  {
    id: 'usr-02',
    name: 'Siti Rahmawati',
    username: 'kasir_pagi',
    role: 'cashier',
    avatar: '👩‍🍳',
    phone: '0813-8877-6655',
    email: 'siti.kasir@gmail.com',
    pin: '2233',
    initialCash: 250000,
    notes: 'Kasir Shift Pagi (08:00 - 16:00)'
  },
  {
    id: 'usr-03',
    name: 'Rian Pratama',
    username: 'kasir_malam',
    role: 'cashier',
    avatar: '💼',
    phone: '0815-9988-1122',
    email: 'rian.kasir@gmail.com',
    pin: '5566',
    initialCash: 300000,
    notes: 'Kasir Shift Malam (16:00 - 23:30)'
  },
  {
    id: 'usr-04',
    name: 'Budi Santoso',
    username: 'kasir_siang',
    role: 'cashier',
    avatar: '👨‍💼',
    phone: '0818-0022-3344',
    email: 'budi.kasir@gmail.com',
    pin: '9988',
    initialCash: 250000,
    notes: 'Kasir Shift Siang (12:00 - 17:00)'
  }
];

export const ProfileView: React.FC<ProfileViewProps> = ({ settings, onProfileUpdated }) => {
  const [activeTab, setActiveTab] = useState<ProfileTab>('info');
  const [profile, setProfile] = useState<UserProfile>({
    id: 'usr-01',
    name: 'Bang Kobra (Dimas S.)',
    username: 'owner_kobra',
    role: 'owner',
    avatar: '🐍',
    phone: '0812-3456-7890',
    email: 'bang.kobra.warkop@gmail.com',
    pin: '1234',
    shiftStartTime: new Date().toISOString(),
    initialCash: 350000,
    notes: 'Pemilik & Penanggung Jawab Operasional Warung Bang Kobra',
    theme: 'dark',
    enableSoundEffects: true
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // PIN security states
  const [showPin, setShowPin] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinChangeSuccess, setPinChangeSuccess] = useState(false);
  const [testPinInput, setTestPinInput] = useState('');
  const [testPinResult, setTestPinResult] = useState<'success' | 'fail' | null>(null);

  // Shift settlement modal state
  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const [settlementSuccess, setSettlementSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await fetchProfile();
      if (data && data.name) {
        setProfile(data);
      }
    } catch (err) {
      console.warn('Using local fallback profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setErrorMessage('');
    try {
      const res = await updateProfile(profile);
      const updated = res.profile || profile;
      setProfile(updated);
      onProfileUpdated?.(updated);
      setSaveSuccess(true);
      playSuccessChime();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal menyimpan profil');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Hanya berkas gambar (PNG, JPG, WebP) yang didukung.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setProfile({ ...profile, avatar: base64 });
    };
    reader.readAsDataURL(file);
  };

  const handleUpdatePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin.length < 4 || newPin.length > 6) {
      alert('PIN harus terdiri dari 4 hingga 6 digit angka!');
      return;
    }
    if (newPin !== confirmPin) {
      alert('Konfirmasi PIN baru tidak sesuai!');
      return;
    }

    setSaving(true);
    try {
      const updated = { ...profile, pin: newPin };
      await updateProfile(updated);
      setProfile(updated);
      onProfileUpdated?.(updated);
      setPinChangeSuccess(true);
      setNewPin('');
      setConfirmPin('');
      playSuccessChime();
      setTimeout(() => setPinChangeSuccess(false), 3000);
    } catch (err: any) {
      alert('Gagal memperbarui PIN: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTestPin = () => {
    if (testPinInput === profile.pin) {
      setTestPinResult('success');
      playSuccessChime();
    } else {
      setTestPinResult('fail');
    }
    setTimeout(() => {
      setTestPinResult(null);
      setTestPinInput('');
    }, 2500);
  };

  const handleSwitchAccount = async (acc: Partial<UserProfile>) => {
    setSaving(true);
    try {
      const switched: UserProfile = {
        ...profile,
        ...acc,
        shiftStartTime: new Date().toISOString()
      };
      await updateProfile(switched);
      setProfile(switched);
      onProfileUpdated?.(switched);
      playSuccessChime();
      alert(`Berhasil beralih ke akun kasir: ${switched.name}`);
    } catch (err: any) {
      alert('Gagal beralih akun: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCloseShift = async () => {
    setShowSettlementModal(false);
    setSettlementSuccess(true);
    playSuccessChime();
    const newShiftTime = new Date().toISOString();
    const updated = { ...profile, shiftStartTime: newShiftTime };
    await updateProfile(updated);
    setProfile(updated);
    setTimeout(() => setSettlementSuccess(false), 4000);
  };

  const roleLabels: Record<UserProfile['role'], { label: string; color: string; desc: string }> = {
    owner: {
      label: 'Pemilik (Owner / Super Admin)',
      color: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
      desc: 'Akses penuh ke semua menu: POS Kasir, laporan keuangan, stok harga, QR Takeaway & pengaturan sistem.'
    },
    manager: {
      label: 'Manajer Operasional',
      color: 'bg-purple-500/20 text-purple-400 border-purple-500/40',
      desc: 'Akses ke manajemen stok, laporan penjualan & kasir POS.'
    },
    cashier: {
      label: 'Kasir Utama',
      color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
      desc: 'Akses fokus ke kasir POS, proses transaksi takeaway, terima pesanan pelanggan & cetak struk.'
    },
    kitchen: {
      label: 'Kasir / Staf',
      color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40',
      desc: 'Akses kasir POS dan proses pesanan masuk.'
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner Profile Summary */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-700/80 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-5">
          {/* Avatar Container */}
          <div className="relative group shrink-0">
            <div className="w-20 h-20 rounded-2xl bg-slate-800 border-2 border-emerald-500 flex items-center justify-center shadow-lg overflow-hidden text-4xl">
              {profile.avatar && profile.avatar.startsWith('data:image') ? (
                <img
                  src={profile.avatar}
                  alt={profile.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{profile.avatar || '👤'}</span>
              )}
            </div>

            <button
              onClick={() => fileInputRef.current?.click()}
              title="Ganti Foto Profil"
              className="absolute -bottom-2 -right-2 p-1.5 rounded-full bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-md transition"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarFileUpload}
              className="hidden"
            />
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-black text-white tracking-wide">{profile.name}</h2>
              <span
                className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold border ${
                  roleLabels[profile.role]?.color || 'bg-slate-800 text-slate-300'
                }`}
              >
                {roleLabels[profile.role]?.label || profile.role.toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              ID Pegawai: <strong className="text-slate-200">@{profile.username}</strong> • ID: {profile.id}
            </p>
            <p className="text-xs text-slate-400 flex items-center gap-2">
              <span>🏪 {settings.name}</span>
              <span>•</span>
              <span className="text-emerald-400 font-medium">Shift Aktif</span>
            </p>
          </div>
        </div>

        {/* Quick Shift Card */}
        <div className="flex items-center gap-3 bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800 shrink-0">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Shift Masuk:</div>
            <div className="text-xs font-bold text-white font-mono">
              {formatDate(profile.shiftStartTime)}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Modal Kas: <span className="text-emerald-400 font-bold">{formatIDR(profile.initialCash || 0)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar border-b border-slate-800">
        <button
          onClick={() => setActiveTab('info')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'info'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
              : 'bg-slate-850 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <User className="w-4 h-4" />
          Data Pribadi & Profil
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'security'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
              : 'bg-slate-850 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Key className="w-4 h-4" />
          Keamanan & PIN Kasir
        </button>

        <button
          onClick={() => setActiveTab('shift')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'shift'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
              : 'bg-slate-850 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          Sesi Shift & Kas Opname
        </button>

        <button
          onClick={() => setActiveTab('switch')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'switch'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
              : 'bg-slate-850 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <ArrowRightLeft className="w-4 h-4" />
          Ganti Akun Kasir Cepat
        </button>
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Profil kasir berhasil diperbarui!</span>
        </div>
      )}

      {/* TAB 1: DATA PRIBADI & PROFIL */}
      {activeTab === 'info' && (
        <div className="bg-slate-850/90 rounded-2xl border border-slate-700/80 p-6 shadow-xl space-y-6">
          <div>
            <h3 className="text-base font-black text-white uppercase tracking-wide flex items-center gap-2">
              <User className="w-5 h-5 text-emerald-400" />
              Informasi Pribadi & Penugasan
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Data kasir ini dicetak di struk belanja pelanggan dan tercatat pada riwayat transaksi.
            </p>
          </div>

          {/* Avatar Selector Presets */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-700/80 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200">
                Pilih Icon / Emoji Avatar Kasir:
              </label>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-[11px] text-emerald-400 hover:underline font-semibold flex items-center gap-1"
              >
                <Camera className="w-3.5 h-3.5" />
                Upload Foto Gambar
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {AVATAR_PRESETS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setProfile({ ...profile, avatar: emoji })}
                  className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition ${
                    profile.avatar === emoji
                      ? 'bg-emerald-500 text-slate-950 scale-110 shadow-md ring-2 ring-emerald-400'
                      : 'bg-slate-800 hover:bg-slate-750 text-white'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Nama Lengkap *
                </label>
                <input
                  type="text"
                  required
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-emerald-500 font-semibold"
                  placeholder="Contoh: Bang Kobra (Dimas Setiawan)"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Username / ID Pegawai *
                </label>
                <input
                  type="text"
                  required
                  value={profile.username}
                  onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
                  placeholder="Contoh: owner_kobra"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Jabatan / Peran Pengguna *
                </label>
                <select
                  value={profile.role}
                  onChange={(e) =>
                    setProfile({ ...profile, role: e.target.value as UserProfile['role'] })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-emerald-500 font-semibold"
                >
                  <option value="owner">👑 Pemilik (Owner / Super Admin)</option>
                  <option value="manager">💼 Manajer Operasional</option>
                  <option value="cashier">🏪 Kasir Utama</option>
                </select>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  {roleLabels[profile.role]?.desc}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Nomor WhatsApp Pribadi
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
                    placeholder="0812-3456-7890"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Email Akun
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-emerald-500"
                    placeholder="bang.kobra.warkop@gmail.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Modal Kas Awal Laci (Cash Float)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-xs text-slate-500 font-bold">
                    Rp
                  </span>
                  <input
                    type="number"
                    min={0}
                    step={10000}
                    value={profile.initialCash || 0}
                    onChange={(e) =>
                      setProfile({ ...profile, initialCash: Math.max(0, Number(e.target.value)) })
                    }
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Uang kembalian yang disiapkan di awal shift kasir.
                </span>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Catatan / Bio Penugasan
                </label>
                <textarea
                  rows={2}
                  value={profile.notes || ''}
                  onChange={(e) => setProfile({ ...profile, notes: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500 resize-none"
                  placeholder="Catatan penugasan shift atau tanggung jawab kasir..."
                />
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black text-xs transition shadow-lg shadow-emerald-500/20"
              >
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Simpan Perubahan Profil
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: KEAMANAN & PIN KASIR */}
      {activeTab === 'security' && (
        <div className="bg-slate-850/90 rounded-2xl border border-slate-700/80 p-6 shadow-xl space-y-6">
          <div>
            <h3 className="text-base font-black text-white uppercase tracking-wide flex items-center gap-2">
              <Key className="w-5 h-5 text-emerald-400" />
              PIN Akses Cepat Kasir (Quick POS PIN)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              PIN numerik digunakan untuk membuka laci kas (cash drawer), otorisasi diskon khusus, dan pembatalan transaksi.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left: PIN Status & Test */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-700/80 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 block">PIN Kasir Saat Ini:</span>
                  <div className="text-2xl font-mono font-black text-emerald-400 mt-1 tracking-widest">
                    {showPin ? profile.pin : '••••'}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                  title={showPin ? 'Sembunyikan PIN' : 'Lihat PIN'}
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <div className="pt-3 border-t border-slate-800 space-y-2">
                <span className="text-xs font-bold text-slate-300 block">
                  Uji Coba Verifikasi PIN:
                </span>
                <div className="flex gap-2">
                  <input
                    type="password"
                    maxLength={6}
                    value={testPinInput}
                    onChange={(e) => setTestPinInput(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="Ketik PIN..."
                    className="px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm font-mono text-white tracking-widest focus:outline-none focus:border-emerald-500 w-full"
                  />
                  <button
                    type="button"
                    onClick={handleTestPin}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold whitespace-nowrap transition"
                  >
                    Uji PIN
                  </button>
                </div>

                {testPinResult === 'success' && (
                  <div className="text-xs text-emerald-400 font-bold flex items-center gap-1.5 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4" /> PIN Benar! Otorisasi Berhasil.
                  </div>
                )}
                {testPinResult === 'fail' && (
                  <div className="text-xs text-rose-400 font-bold flex items-center gap-1.5 animate-in fade-in">
                    <AlertCircle className="w-4 h-4" /> PIN Salah! Silakan periksa kembali.
                  </div>
                )}
              </div>
            </div>

            {/* Right: Change PIN Form */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-700/80 space-y-4">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-400" />
                Ubah PIN Akses Kasir
              </h4>

              {pinChangeSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  PIN baru berhasil disimpan!
                </div>
              )}

              <form onSubmit={handleUpdatePin} className="space-y-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    PIN Baru (4-6 Digit Angka)
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    required
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm font-mono text-white tracking-widest focus:outline-none focus:border-emerald-500"
                    placeholder="••••"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Ulangi Konfirmasi PIN Baru
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    required
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm font-mono text-white tracking-widest focus:outline-none focus:border-emerald-500"
                    placeholder="••••"
                  />
                </div>

                <button
                  type="submit"
                  disabled={saving || !newPin || newPin !== confirmPin}
                  className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-bold text-xs transition mt-2"
                >
                  Simpan PIN Baru
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SESI SHIFT & KAS OPNAME */}
      {activeTab === 'shift' && (
        <div className="bg-slate-850/90 rounded-2xl border border-slate-700/80 p-6 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-black text-white uppercase tracking-wide flex items-center gap-2">
                <Clock className="w-5 h-5 text-emerald-400" />
                Sesi Shift Kasir & Rekonsiliasi Kas (Cash Drawer)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Pantau modal awal kasir, rekonsiliasi uang fisik di laci kas, dan lakukan tutup shift harian.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowSettlementModal(true)}
              className="px-4 py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-bold text-xs border border-rose-500/40 transition flex items-center gap-2"
            >
              <FileCheck className="w-4 h-4" />
              Tutup Shift Kasir (Settlement)
            </button>
          </div>

          {settlementSuccess && (
            <div className="p-4 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-5 h-5" />
              <span>Shift kasir berhasil ditutup dan shift baru telah dimulai!</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-700/80">
              <span className="text-xs text-slate-400 font-medium">Jam Mulai Shift</span>
              <div className="text-lg font-mono font-black text-white mt-1">
                {new Date(profile.shiftStartTime).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                })}{' '}
                WIB
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                {new Date(profile.shiftStartTime).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-700/80">
              <span className="text-xs text-slate-400 font-medium">Modal Awal Laci (Float)</span>
              <div className="text-lg font-mono font-black text-emerald-400 mt-1">
                {formatIDR(profile.initialCash || 0)}
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">Uang pecahan kasir</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-700/80">
              <span className="text-xs text-slate-400 font-medium">Status Kasir Bertugas</span>
              <div className="text-lg font-bold text-emerald-400 mt-1 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                Aktif Melayani
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                Petugas: {profile.name}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: GANTI AKUN KASIR CEPAT */}
      {activeTab === 'switch' && (
        <div className="bg-slate-850/90 rounded-2xl border border-slate-700/80 p-6 shadow-xl space-y-6">
          <div>
            <h3 className="text-base font-black text-white uppercase tracking-wide flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-emerald-400" />
              Peralihan Akun Kasir Cepat (Multi-User Switch)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Ganti akun kasir bertugas dalam 1-klik untuk pergantian shift kasir pagi, kasir malam, atau akun owner.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {PRESET_ACCOUNTS.map((acc) => {
              const isCurrent = profile.username === acc.username;
              return (
                <div
                  key={acc.id}
                  className={`p-4 rounded-2xl border flex items-center justify-between gap-4 transition ${
                    isCurrent
                      ? 'bg-emerald-500/10 border-emerald-500/60 shadow-lg'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-2xl">
                      {acc.avatar}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-white">{acc.name}</h4>
                        {isCurrent && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold font-mono">
                            SEDANG AKTIF
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 font-mono">@{acc.username}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{acc.notes}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isCurrent}
                    onClick={() => handleSwitchAccount(acc)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
                      isCurrent
                        ? 'bg-slate-850 text-emerald-400 cursor-default'
                        : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md'
                    }`}
                  >
                    {isCurrent ? 'Aktif' : 'Pilih Akun'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Settlement Modal */}
      {showSettlementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl space-y-4 text-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-black text-base text-white flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-emerald-400" />
                Konfirmasi Tutup Shift Kasir
              </h3>
              <button
                onClick={() => setShowSettlementModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Pastikan seluruh transaksi kasir telah selesai. Menutup shift akan merekam ringkasan penjualan dan mereset jam shift untuk kasir berikutnya.
            </p>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Kasir:</span>
                <span className="font-bold text-white">{profile.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Waktu Mulai:</span>
                <span className="font-mono text-slate-300">
                  {formatDate(profile.shiftStartTime)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Modal Kas Awal:</span>
                <span className="font-mono text-emerald-400 font-bold">
                  {formatIDR(profile.initialCash || 0)}
                </span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowSettlementModal(false)}
                className="w-1/2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-xs transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleCloseShift}
                className="w-1/2 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition shadow-lg shadow-emerald-500/20"
              >
                Ya, Tutup Shift
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
