import React from 'react';
import { Printer, X, Check, Share2 } from 'lucide-react';
import { Order, StoreSettings } from '../types';
import { formatIDR, formatDate } from '../lib/utils';
import { StoreLogo } from './StoreLogo';

interface ReceiptModalProps {
  order: Order;
  settings: StoreSettings;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ order, settings, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm print:p-0 print:bg-white">
      <div
        id="receipt-modal-card"
        className="w-full max-w-sm rounded-2xl bg-white text-slate-900 shadow-2xl overflow-hidden print:shadow-none print:w-full print:max-w-none"
      >
        {/* Header Actions (hidden on print) */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3 print:hidden">
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Struk Pembayaran</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Printable Thermal Receipt Area */}
        <div id="thermal-receipt" className="p-6 font-mono text-xs leading-relaxed text-slate-800">
          {/* Logo & Header */}
          <div className="text-center pb-3 border-b border-dashed border-slate-300">
            <div className="flex justify-center mb-1">
              <StoreLogo
                logo={settings.logo}
                name={settings.name}
                size="md"
                className="bg-transparent border-0 text-2xl"
              />
            </div>
            <h2 className="text-base font-black tracking-wide uppercase text-slate-900">{settings.name}</h2>
            <p className="text-[11px] text-slate-600 font-sans">{settings.tagline}</p>
            <p className="text-[10px] text-slate-500 font-sans mt-0.5">{settings.address}</p>
            <p className="text-[10px] text-slate-500 font-sans">WA: {settings.phone}</p>
          </div>

          {/* Meta Information */}
          <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span>No:</span>
              <span className="font-bold">{order.orderNumber}</span>
            </div>
            <div className="flex justify-between">
              <span>Tanggal:</span>
              <span>{formatDate(order.paidAt || order.createdAt)}</span>
            </div>
            <div className="flex justify-between">
              <span>Pelanggan:</span>
              <span>{order.customerName}</span>
            </div>
            <div className="flex justify-between">
              <span>Tipe/Meja:</span>
              <span className="font-bold">
                {order.tableNumber || (order.orderType === 'dine_in' ? 'Dine In' : 'Bawa Pulang')}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Status Bayar:</span>
              <span className="font-bold uppercase text-emerald-700">
                {order.paymentStatus === 'paid' ? 'LUNAS' : 'BELUM DIBAYAR'}
              </span>
            </div>
          </div>

          {/* Items */}
          <div className="py-3 border-b border-dashed border-slate-300 space-y-2">
            {order.items.map((item) => (
              <div key={item.id} className="space-y-0.5">
                <div className="flex justify-between font-semibold">
                  <span className="truncate pr-2">{item.productName}</span>
                  <span className="shrink-0">{formatIDR(item.subtotal)}</span>
                </div>
                <div className="text-[10px] text-slate-500 flex justify-between">
                  <span>{item.quantity} x {formatIDR(item.price)}</span>
                  {item.note && <span className="italic text-slate-600 truncate max-w-[140px]">({item.note})</span>}
                </div>
              </div>
            ))}
          </div>

          {/* Calculations */}
          <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>{formatIDR(order.subtotal)}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Diskon:</span>
                <span>-{formatIDR(order.discount)}</span>
              </div>
            )}
            {order.tax > 0 && (
              <div className="flex justify-between">
                <span>Pajak:</span>
                <span>{formatIDR(order.tax)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-black pt-1 border-t border-slate-200">
              <span>TOTAL:</span>
              <span>{formatIDR(order.total)}</span>
            </div>
          </div>

          {/* Payment Details */}
          <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span>Pembayaran:</span>
              <span className="font-bold uppercase">{order.paymentMethod || 'CASH'}</span>
            </div>
            {order.cashTendered !== undefined && (
              <>
                <div className="flex justify-between">
                  <span>Dibayar:</span>
                  <span>{formatIDR(order.cashTendered)}</span>
                </div>
                <div className="flex justify-between font-bold text-emerald-700">
                  <span>Kembalian:</span>
                  <span>{formatIDR(order.cashChange || 0)}</span>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="pt-4 text-center text-[10px] text-slate-600 font-sans space-y-1">
            <p className="font-medium">{settings.receiptFooter}</p>
            <p className="text-slate-400">--- Simpan struk ini sebagai bukti pembayaran ---</p>
          </div>
        </div>

        {/* Action Buttons (print:hidden) */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2 print:hidden">
          <button
            id="btn-print-receipt"
            onClick={handlePrint}
            className="flex-1 py-2.5 px-3 rounded-xl bg-slate-900 text-white font-semibold text-xs hover:bg-slate-800 transition flex items-center justify-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            Cetak Struk
          </button>
          <button
            id="btn-close-receipt"
            onClick={onClose}
            className="py-2.5 px-4 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-100 transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
