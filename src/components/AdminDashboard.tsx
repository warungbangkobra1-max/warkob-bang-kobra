import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  CreditCard,
  ShoppingBag,
  DollarSign,
  Calendar,
  Settings as SettingsIcon,
  Receipt,
  FileSpreadsheet,
  Download,
  Filter,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Order, StoreSettings, DashboardSummary } from '../types';
import { fetchDashboardSummary, fetchOrders, updateSettings } from '../lib/api';
import { formatIDR, formatDate, formatTime } from '../lib/utils';
import { ReceiptModal } from './ReceiptModal';
import { FullSettingsView } from './FullSettingsView';

interface AdminDashboardProps {
  settings: StoreSettings & { isOpen: boolean };
  onSettingsUpdated: (s: StoreSettings & { isOpen: boolean }) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  settings,
  onSettingsUpdated
}) => {
  const [activeTab, setActiveTab] = useState<'analytics' | 'history' | 'settings'>('analytics');
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // History Filter
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [selectedOrderReceipt, setSelectedOrderReceipt] = useState<Order | null>(null);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [sum, ord] = await Promise.all([fetchDashboardSummary(), fetchOrders()]);
      setSummary(sum);
      setOrders(ord);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'No Pesanan',
      'Waktu',
      'Pelanggan',
      'Meja/Lokasi',
      'Tipe',
      'Status Pesanan',
      'Status Bayar',
      'Metode',
      'Total'
    ];
    const rows = orders.map((o) => [
      o.orderNumber,
      `"${o.createdAt}"`,
      `"${o.customerName}"`,
      `"${o.tableNumber || ''}"`,
      o.orderType,
      o.orderStatus,
      o.paymentStatus,
      o.paymentMethod || '',
      o.total
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Laporan_Transaksi_Bang_Kobra_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered order history
  const filteredOrders = orders.filter((o) => {
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'paid' && o.paymentStatus === 'paid') ||
      (statusFilter === 'unpaid' && o.paymentStatus === 'unpaid') ||
      (statusFilter === 'cancelled' && o.orderStatus === 'CANCELLED');
    const matchesSearch =
      o.orderNumber.toLowerCase().includes(searchFilter.toLowerCase()) ||
      o.customerName.toLowerCase().includes(searchFilter.toLowerCase()) ||
      (o.tableNumber && o.tableNumber.toLowerCase().includes(searchFilter.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  // Prepare chart data: Sales by hour or simulated recent points
  const chartData = [
    { hour: '08:00', total: 45000 },
    { hour: '10:00', total: 85000 },
    { hour: '12:00', total: 240000 },
    { hour: '14:00', total: 160000 },
    { hour: '16:00', total: 110000 },
    { hour: '18:00', total: 320000 },
    { hour: '20:00', total: summary?.todaySales || 280000 }
  ];

  const paymentDistribution = [
    { name: 'Cash', value: 65, color: '#10b981' },
    { name: 'QRIS', value: 30, color: '#3b82f6' },
    { name: 'Transfer', value: 5, color: '#f59e0b' }
  ];

  return (
    <div className="space-y-6">
      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/70 p-2 rounded-2xl">
        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'analytics'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-700/60'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Ringkasan & Analitik
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'history'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-700/60'
          }`}
        >
          <Receipt className="w-4 h-4" />
          Riwayat Transaksi
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'settings'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-700/60'
          }`}
        >
          <SettingsIcon className="w-4 h-4" />
          Pengaturan Warung
        </button>
      </div>

      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Key Metric Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-slate-800/90 border border-slate-700/80 flex items-center justify-between shadow-lg">
              <div>
                <p className="text-xs text-slate-400 font-medium">Penjualan Hari Ini</p>
                <h3 className="text-2xl font-black font-mono text-emerald-400 mt-1">
                  {formatIDR(summary?.todaySales || 0)}
                </h3>
                <span className="text-[11px] text-emerald-400/80 font-medium flex items-center gap-1 mt-1">
                  <TrendingUp className="w-3 h-3" /> Transaksi lunas
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <DollarSign className="w-6 h-6" />
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-800/90 border border-slate-700/80 flex items-center justify-between shadow-lg">
              <div>
                <p className="text-xs text-slate-400 font-medium">Total Transaksi</p>
                <h3 className="text-2xl font-black font-mono text-white mt-1">
                  {summary?.todayOrdersCount || 0}
                </h3>
                <span className="text-[11px] text-slate-400 mt-1 block">Kasir + Pemesanan QR</span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                <Receipt className="w-6 h-6" />
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-800/90 border border-slate-700/80 flex items-center justify-between shadow-lg">
              <div>
                <p className="text-xs text-slate-400 font-medium">Item Terjual Hari Ini</p>
                <h3 className="text-2xl font-black font-mono text-white mt-1">
                  {summary?.todayItemsSold || 0}
                </h3>
                <span className="text-[11px] text-slate-400 mt-1 block">Porsi / Cup / Pack</span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                <ShoppingBag className="w-6 h-6" />
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-800/90 border border-slate-700/80 flex items-center justify-between shadow-lg">
              <div>
                <p className="text-xs text-slate-400 font-medium">Produk Menipis (&le; 5)</p>
                <h3 className="text-2xl font-black font-mono text-rose-400 mt-1">
                  {summary?.lowStockCount || 0}
                </h3>
                <span className="text-[11px] text-rose-400/80 mt-1 block">Perlu restock segera</span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
                <Clock className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sales Hourly Bar Chart (2 cols) */}
            <div className="lg:col-span-2 p-5 rounded-2xl bg-slate-800/90 border border-slate-700/80 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-white">Tren Jam Ramai Penjualan</h3>
                  <p className="text-xs text-slate-400">Total akumulasi penjualan sepanjang hari</p>
                </div>
                <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-xl">
                  Hari Ini
                </span>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="hour" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `${v / 1000}k`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                      formatter={(val: any) => [formatIDR(Number(val)), 'Penjualan']}
                    />
                    <Bar dataKey="total" fill="#10b981" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Payment Method Breakdown Pie Chart (1 col) */}
            <div className="p-5 rounded-2xl bg-slate-800/90 border border-slate-700/80 shadow-lg flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Metode Pembayaran</h3>
                <p className="text-xs text-slate-400">Distribusi kasir tunai vs QRIS digital</p>
              </div>

              <div className="h-48 w-full flex items-center justify-center my-2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentDistribution}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={65}
                      innerRadius={40}
                      paddingAngle={4}
                    >
                      {paymentDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-slate-700/60 text-xs">
                {paymentDistribution.map((m) => (
                  <div key={m.name} className="flex justify-between items-center text-slate-300">
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: m.color }} />
                      {m.name}
                    </span>
                    <span className="font-bold">{m.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-4">
          {/* Header & Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-800/80 border border-slate-700/70 p-4 rounded-2xl">
            <div className="flex flex-wrap items-center gap-2">
              {[
                { id: 'all', label: 'Semua Transaksi' },
                { id: 'paid', label: 'Lunas' },
                { id: 'unpaid', label: 'Belum Lunas' },
                { id: 'cancelled', label: 'Dibatalkan' }
              ].map((b) => (
                <button
                  key={b.id}
                  onClick={() => setStatusFilter(b.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                    statusFilter === b.id
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-slate-700/60 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Cari no struk, meja, nama..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
              />
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold transition"
                title="Export CSV Excel"
              >
                <Download className="w-3.5 h-3.5" />
                CSV
              </button>
            </div>
          </div>

          {/* Orders Table */}
          <div className="rounded-2xl border border-slate-700/80 bg-slate-800/90 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-700">
                  <tr>
                    <th className="py-3 px-4">No Pesanan</th>
                    <th className="py-3 px-4">Waktu</th>
                    <th className="py-3 px-4">Meja / Pelanggan</th>
                    <th className="py-3 px-4">Rincian Item</th>
                    <th className="py-3 px-4">Status Pesanan</th>
                    <th className="py-3 px-4">Pembayaran</th>
                    <th className="py-3 px-4">Total</th>
                    <th className="py-3 px-4 text-right">Struk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/60">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-slate-500">
                        Tidak ada transaksi yang cocok
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((ord) => (
                      <tr key={ord.id} className="hover:bg-slate-700/30 transition">
                        <td className="py-3 px-4 font-mono font-bold text-white">
                          {ord.orderNumber}
                        </td>
                        <td className="py-3 px-4 text-slate-400">
                          {formatTime(ord.createdAt)}
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-semibold text-white">{ord.tableNumber || 'Takeaway'}</p>
                          <p className="text-[10px] text-slate-400">{ord.customerName}</p>
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-slate-300 max-w-xs truncate">
                            {ord.items.map((i) => `${i.quantity}x ${i.productName}`).join(', ')}
                          </p>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              ord.orderStatus === 'COMPLETED'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : ord.orderStatus === 'CANCELLED'
                                ? 'bg-rose-500/20 text-rose-300'
                                : 'bg-blue-500/20 text-blue-300'
                            }`}
                          >
                            {ord.orderStatus}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {ord.paymentStatus === 'paid' ? (
                            <span className="text-emerald-400 font-semibold flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              Lunas ({ord.paymentMethod})
                            </span>
                          ) : (
                            <span className="text-amber-400 font-semibold">Belum Bayar</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                          {formatIDR(ord.total)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setSelectedOrderReceipt(ord)}
                            className="p-1.5 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                            title="Cetak Struk"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <FullSettingsView settings={settings} onSettingsUpdated={onSettingsUpdated} />
      )}

      {/* Struk Modal */}
      {selectedOrderReceipt && (
        <ReceiptModal
          order={selectedOrderReceipt}
          settings={settings}
          onClose={() => setSelectedOrderReceipt(null)}
        />
      )}
    </div>
  );
};
