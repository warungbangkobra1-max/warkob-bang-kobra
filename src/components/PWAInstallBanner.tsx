import React, { useState } from 'react';
import { Download, X, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallBanner: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled || dismissed) {
    return null;
  }

  if (!isInstallable && !isIOS) {
    return null;
  }

  return (
    <div id="pwa-install-banner" className="bg-emerald-950/80 border border-emerald-700/60 backdrop-blur-md rounded-xl p-3 mb-4 flex items-center justify-between gap-3 text-emerald-100 shadow-lg animate-in fade-in slide-in-from-top-2">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
          <Smartphone className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-emerald-300 truncate">Pasang ke Layar Utama</p>
          <p className="text-[11px] text-emerald-200/80 truncate">Akses cepat menu Warung Bang Kobra (Opsional)</p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {isInstallable && (
          <button
            id="btn-pwa-install"
            onClick={install}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition font-semibold"
          >
            <Download className="w-3.5 h-3.5" />
            Pasang
          </button>
        )}

        {isIOS && (
          <button
            id="btn-pwa-ios"
            onClick={() => setShowIOSGuide(true)}
            className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30 transition"
          >
            Petunjuk iOS
          </button>
        )}

        <button
          id="btn-pwa-dismiss"
          onClick={() => setDismissed(true)}
          className="p-1 text-emerald-400/60 hover:text-emerald-200 transition"
          aria-label="Tutup"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl text-slate-100">
            <h3 className="text-base font-semibold text-white mb-2">Pasang di iPhone / iPad</h3>
            <ol className="text-xs text-slate-300 space-y-2 mb-4 list-decimal list-inside leading-relaxed">
              <li>Tekan tombol <strong>Share / Bagikan</strong> (kotak panah ke atas) di menu bawah Safari.</li>
              <li>Gulir ke bawah lalu pilih <strong>Tambahkan ke Layar Utama (Add to Home Screen)</strong>.</li>
              <li>Tekan <strong>Tambah</strong> di pojok kanan atas.</li>
            </ol>
            <button
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-2 rounded-xl bg-emerald-500 font-semibold text-slate-950 text-xs hover:bg-emerald-400 transition"
            >
              Mengerti
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
