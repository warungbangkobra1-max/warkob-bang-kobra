import React, { useState, useEffect } from 'react';
import { Package, Plus, Search, Edit2, Trash2, AlertTriangle, Check, RefreshCw } from 'lucide-react';
import { Product } from '../types';
import { fetchProducts, createProduct, updateProduct, deleteProduct } from '../lib/api';
import { formatIDR } from '../lib/utils';

export const ProductManagement: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form
  const [name, setName] = useState('');
  const [category, setCategory] = useState<Product['category']>('Makanan');
  const [price, setPrice] = useState<number | ''>('');
  const [costPrice, setCostPrice] = useState<number | ''>('');
  const [stock, setStock] = useState<number | ''>('');
  const [unit, setUnit] = useState('porsi');
  const [imageUrl, setImageUrl] = useState('');
  const [description, setDescription] = useState('');
  const [barcode, setBarcode] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await fetchProducts();
      setProducts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = () => {
    setEditingProduct(null);
    setName('');
    setCategory('Makanan');
    setPrice('');
    setCostPrice('');
    setStock(20);
    setUnit('porsi');
    setImageUrl('');
    setDescription('');
    setBarcode('');
    setShowModal(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setCategory(p.category);
    setPrice(p.price);
    setCostPrice(p.costPrice || 0);
    setStock(p.stock);
    setUnit(p.unit);
    setImageUrl(p.imageUrl || '');
    setDescription(p.description || '');
    setBarcode(p.barcode || '');
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || price === '') return;

    try {
      const payload: Partial<Product> = {
        name,
        category,
        price: Number(price),
        costPrice: Number(costPrice || Number(price) * 0.7),
        stock: Number(stock || 0),
        unit,
        imageUrl: imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=80',
        description,
        barcode
      };

      if (editingProduct) {
        const updated = await updateProduct(editingProduct.id, payload);
        setProducts((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      } else {
        const created = await createProduct(payload);
        setProducts((prev) => [created, ...prev]);
      }
      setShowModal(false);
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan produk');
    }
  };

  const handleDelete = async (id: string, prodName: string) => {
    if (!confirm(`Hapus produk "${prodName}"?`)) return;
    try {
      await deleteProduct(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      alert('Gagal menghapus produk');
    }
  };

  const handleQuickStock = async (p: Product, delta: number) => {
    const newStock = Math.max(0, p.stock + delta);
    try {
      const updated = await updateProduct(p.id, { stock: newStock });
      setProducts((prev) => prev.map((item) => (item.id === p.id ? updated : item)));
    } catch (err) {
      console.error(err);
    }
  };

  const categories = ['Semua', 'Makanan', 'Minuman', 'Snack', 'Sembako', 'Lainnya'];

  const filteredProducts = products.filter((p) => {
    const matchCat = selectedCategory === 'Semua' || p.category === selectedCategory;
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.barcode && p.barcode.includes(search));
    return matchCat && matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-800/80 border border-slate-700/70 p-5 rounded-2xl backdrop-blur-md">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-emerald-400" />
            Manajemen Produk & Stok
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Data harga dan stok tersinkronisasi secara otomatis antara sistem Kasir dan Pemesanan QR Pelanggan.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="p-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-700/60 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            id="btn-add-product"
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition"
          >
            <Plus className="w-4 h-4" />
            Tambah Produk
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                selectedCategory === cat
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-750 border border-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama atau barcode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Products Table / Cards */}
      <div className="rounded-2xl border border-slate-700/80 bg-slate-800/90 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-700">
              <tr>
                <th className="py-3.5 px-4">Produk</th>
                <th className="py-3.5 px-4">Kategori</th>
                <th className="py-3.5 px-4">Harga Jual</th>
                <th className="py-3.5 px-4">Harga Modal</th>
                <th className="py-3.5 px-4 text-center">Stok</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/60">
              {filteredProducts.map((p) => {
                const isLowStock = p.stock > 0 && p.stock <= 5;
                const isOutOfStock = p.stock === 0;

                return (
                  <tr key={p.id} className="hover:bg-slate-700/30 transition">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={p.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100'}
                          alt={p.name}
                          className="w-10 h-10 rounded-lg object-cover bg-slate-700 shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="font-semibold text-white truncate max-w-[200px] sm:max-w-xs">{p.name}</p>
                          {p.barcode && (
                            <p className="text-[10px] text-slate-400 font-mono">Barcode: {p.barcode}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-slate-700 text-slate-300 text-[11px]">
                        {p.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-emerald-400">{formatIDR(p.price)}</td>
                    <td className="py-3 px-4 text-slate-400">{formatIDR(p.costPrice || 0)}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleQuickStock(p, -1)}
                          className="w-6 h-6 rounded bg-slate-700 hover:bg-slate-600 text-white font-bold flex items-center justify-center transition"
                        >
                          -
                        </button>
                        <span
                          className={`font-mono font-bold w-10 text-center ${
                            isOutOfStock ? 'text-rose-400' : isLowStock ? 'text-amber-400' : 'text-white'
                          }`}
                        >
                          {p.stock}
                        </span>
                        <button
                          onClick={() => handleQuickStock(p, 1)}
                          className="w-6 h-6 rounded bg-slate-700 hover:bg-slate-600 text-white font-bold flex items-center justify-center transition"
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {isOutOfStock ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                          <AlertTriangle className="w-3 h-3" />
                          Habis
                        </span>
                      ) : isLowStock ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                          Menipis ({p.stock})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          Tersedia
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(p)}
                          className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 transition"
                          title="Edit Produk"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id, p.name)}
                          className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 transition"
                          title="Hapus Produk"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add / Edit */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700 p-6 text-slate-100 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-white mb-4">
              {editingProduct ? 'Edit Produk' : 'Tambah Produk Baru'}
            </h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Nama Produk *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Indomie Goreng Spesial Kobra"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Kategori</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Makanan">Makanan</option>
                    <option value="Minuman">Minuman</option>
                    <option value="Snack">Snack</option>
                    <option value="Sembako">Sembako</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Satuan</label>
                  <input
                    type="text"
                    placeholder="porsi / botol / pcs"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Harga Jual (Rp) *</label>
                  <input
                    type="number"
                    required
                    placeholder="15000"
                    value={price}
                    onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Harga Modal (Rp)</label>
                  <input
                    type="number"
                    placeholder="9000"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Jumlah Stok</label>
                  <input
                    type="number"
                    value={stock}
                    onChange={(e) => setStock(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">URL Foto Produk</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Barcode / SKU (Opsional)</label>
                <input
                  type="text"
                  placeholder="89988..."
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Deskripsi Singkat</label>
                <textarea
                  rows={2}
                  placeholder="Deskripsi bahan, rasa, porsi..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-xs font-semibold hover:bg-slate-800 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-emerald-500/20"
                >
                  Simpan Produk
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
