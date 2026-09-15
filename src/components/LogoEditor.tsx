import React, { useState, useRef } from 'react';
import { Upload, Link2, Smile, RotateCcw, Image as ImageIcon, Check, AlertCircle } from 'lucide-react';
import { StoreLogo } from './StoreLogo';

interface LogoEditorProps {
  value?: string;
  storeName: string;
  onChange: (newLogo: string) => void;
}

const PRESET_EMOJIS = [
  { emoji: '🐍', label: 'Ular Kobra' },
  { emoji: '☕', label: 'Warkop / Kopi' },
  { emoji: '🍜', label: 'Mie / Bakso' },
  { emoji: '🏪', label: 'Warung POS' },
  { emoji: '🍗', label: 'Ayam Goreng' },
  { emoji: '🔥', label: 'Pedas / Spesial' },
  { emoji: '🍚', label: 'Nasi / Resto' },
  { emoji: '🍹', label: 'Es / Minuman' },
  { emoji: '🥩', label: 'Sate & Grill' },
  { emoji: '🍲', label: 'Soto / Kuah' },
  { emoji: '🍔', label: 'Burger / Snack' },
  { emoji: '🍞', label: 'Roti Bakar' }
];

export const LogoEditor: React.FC<LogoEditorProps> = ({ value = '', storeName, onChange }) => {
  const [mode, setMode] = useState<'upload' | 'url' | 'emoji'>('upload');
  const [urlInput, setUrlInput] = useState(value && value.startsWith('http') ? value : '');
  const [customChar, setCustomChar] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Resize and optimize image via Canvas
  const processImageFile = (file: File) => {
    setErrorMsg('');
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Format file harus berupa gambar (PNG, JPG, SVG, WebP)');
      return;
    }

    // 5MB limit
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Ukuran file maksimal 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (!result) return;

      // If SVG, keep as is
      if (file.type.includes('svg')) {
        onChange(result);
        return;
      }

      // Optimize raster images (max 300x300) to keep JSON small
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 320;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/png', 0.85);
          onChange(dataUrl);
        } else {
          onChange(result);
        }
      };
      img.onerror = () => {
        setErrorMsg('Gagal memproses gambar');
      };
      img.src = result;
    };
    reader.onerror = () => setErrorMsg('Gagal membaca file');
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleApplyUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) {
      setErrorMsg('Masukkan tautan URL gambar');
      return;
    }
    onChange(urlInput.trim());
    setErrorMsg('');
  };

  const handleApplyCustomChar = () => {
    if (customChar.trim()) {
      onChange(customChar.trim());
      setCustomChar('');
    }
  };

  const handleResetDefault = () => {
    onChange('/icon.svg');
    setUrlInput('');
    setErrorMsg('');
  };

  return (
    <div className="rounded-2xl bg-slate-900/90 border border-slate-700/80 p-4 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <label className="block text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-emerald-400" />
            Logo Warung / Bisnis
          </label>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Logo ini akan tampil pada header POS, menu HP pelanggan, cetak struk kasir, dan QR stand meja.
          </p>
        </div>

        <button
          type="button"
          onClick={handleResetDefault}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-[11px] font-medium border border-slate-700 transition self-start sm:self-auto"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset Default
        </button>
      </div>

      {/* Main Grid: Preview & Controls */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Left: Interactive Preview Box */}
        <div className="md:col-span-4 flex flex-col items-center justify-center p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-center space-y-3">
          <div className="relative group">
            <StoreLogo
              logo={value}
              name={storeName}
              size="xl"
              className="shadow-xl ring-2 ring-emerald-500/30"
            />
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 block">
              Pratinjau Logo Aktif
            </span>
            <p className="text-xs font-bold text-white mt-0.5 truncate max-w-[180px]">
              {storeName}
            </p>
          </div>

          {/* Mini Context Previews */}
          <div className="w-full pt-2 border-t border-slate-800/80 space-y-2 text-left">
            <div className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-900 border border-slate-800">
              <StoreLogo logo={value} name={storeName} size="xs" />
              <div className="overflow-hidden">
                <span className="text-[9px] text-slate-400 block font-mono">Tampilan Header:</span>
                <span className="text-[10px] font-bold text-slate-200 truncate block">
                  {storeName}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 p-1.5 rounded-lg bg-white text-slate-900">
              <StoreLogo
                logo={value}
                name={storeName}
                size="xs"
                className="bg-slate-100 border-slate-300"
              />
              <div className="overflow-hidden">
                <span className="text-[9px] text-slate-500 block font-mono">Struk Kasir:</span>
                <span className="text-[10px] font-black text-slate-900 uppercase truncate block">
                  {storeName}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Mode Selector & Inputs */}
        <div className="md:col-span-8 flex flex-col space-y-3">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setMode('upload')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition ${
                mode === 'upload'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              Unggah Berkas
            </button>

            <button
              type="button"
              onClick={() => setMode('emoji')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition ${
                mode === 'emoji'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Smile className="w-3.5 h-3.5" />
              Ikon & Emoji
            </button>

            <button
              type="button"
              onClick={() => setMode('url')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition ${
                mode === 'url'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Link2 className="w-3.5 h-3.5" />
              Tautan URL
            </button>
          </div>

          {/* Mode: Upload */}
          {mode === 'upload' && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex-1 min-h-[140px] border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition text-center ${
                dragActive
                  ? 'border-emerald-400 bg-emerald-500/10'
                  : 'border-slate-700 hover:border-slate-600 bg-slate-950/40 hover:bg-slate-950/70'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-2">
                <Upload className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold text-white">
                Klik untuk memilih file atau tarik & lepas gambar di sini
              </p>
              <p className="text-[10px] text-slate-400 mt-1">
                Mendukung PNG, JPG, WebP, SVG (Maks. 5MB)
              </p>
            </div>
          )}

          {/* Mode: Emoji / Presets */}
          {mode === 'emoji' && (
            <div className="space-y-3">
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {PRESET_EMOJIS.map((item) => (
                  <button
                    key={item.emoji}
                    type="button"
                    onClick={() => onChange(item.emoji)}
                    className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition ${
                      value === item.emoji
                        ? 'bg-emerald-500/20 border-emerald-500 text-white'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800 hover:border-slate-700'
                    }`}
                    title={item.label}
                  >
                    <span className="text-xl">{item.emoji}</span>
                    <span className="text-[9px] text-slate-400 truncate max-w-full">
                      {item.label.split(' ')[0]}
                    </span>
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  placeholder="Ketik emoji / karakter lain (contoh: 🍕, 🍳)"
                  value={customChar}
                  onChange={(e) => setCustomChar(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={handleApplyCustomChar}
                  disabled={!customChar.trim()}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs transition"
                >
                  Terapkan
                </button>
              </div>
            </div>
          )}

          {/* Mode: URL */}
          {mode === 'url' && (
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Masukkan Alamat URL Gambar:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    placeholder="https://contoh.com/logo-warung.png"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleApplyUrl}
                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition shrink-0"
                  >
                    Gunakan
                  </button>
                </div>
              </div>
              <p className="text-[10px] text-slate-400">
                Gunakan tautan langsung ke gambar dengan format HTTPS agar logo selalu dapat dimuat.
              </p>
            </div>
          )}

          {/* Error notice */}
          {errorMsg && (
            <div className="flex items-center gap-1.5 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/30 p-2 rounded-xl">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
