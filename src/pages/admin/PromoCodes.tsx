import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Plus, Edit2, Trash2, Tag, Percent, IndianRupee, Calendar, Users, Package } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface PromoCode {
  id: number;
  code: string;
  discount_percent: number | null;
  discount_amount: number | null;
  min_order: number;
  expiry_date: string | null;
  is_active: boolean;
  max_uses: number | null;
  used_count: number;
  product_id: number | null;
  product_name?: string;
}

interface Product {
  id: number;
  name: string;
}

export default function AdminPromoCodes() {
  const { apiFetch } = useAuth();
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<PromoCode | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    discount_percent: '',
    discount_amount: '',
    min_order: '0',
    expiry_date: '',
    max_uses: '',
    is_active: true,
    product_id: ''
  });

  useEffect(() => {
    fetchPromoCodes();
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await apiFetch('/api/products');
      const data = await response.json();
      if (Array.isArray(data)) {
        setProducts(data);
      } else {
        setProducts([]);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]);
    }
  };

  const fetchPromoCodes = async () => {
    try {
      const response = await apiFetch('/api/admin/promo-codes');
      const data = await response.json();
      if (Array.isArray(data)) {
        setPromoCodes(data);
      } else {
        console.error('Unexpected response format for promo codes:', data);
        setPromoCodes([]);
      }
    } catch (error) {
      console.error('Error fetching promo codes:', error);
      setPromoCodes([]);
    } finally {
      setIsLoading(false);
    }
  };

  const [discountType, setDiscountType] = useState<'percent' | 'amount'>('percent');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const url = editingPromo 
      ? `/api/admin/promo-codes/${editingPromo.id}` 
      : '/api/admin/promo-codes';
    const method = editingPromo ? 'PUT' : 'POST';

    try {
      const response = await apiFetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          discount_percent: discountType === 'percent' ? parseInt(formData.discount_percent) : null,
          discount_amount: discountType === 'amount' ? parseFloat(formData.discount_amount) : null,
          min_order: parseFloat(formData.min_order),
          max_uses: formData.max_uses ? parseInt(formData.max_uses) : null,
          expiry_date: formData.expiry_date || null,
          product_id: formData.product_id ? parseInt(formData.product_id) : null
        })
      });

      if (response.ok) {
        fetchPromoCodes();
        setEditingPromo(null);
        setFormData({
          code: '',
          discount_percent: '',
          discount_amount: '',
          min_order: '0',
          expiry_date: '',
          max_uses: '',
          is_active: true,
          product_id: ''
        });
        alert(editingPromo ? 'Promo code updated successfully!' : 'Promo code created successfully!');
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error || 'Failed to save promo code'}`);
      }
    } catch (error) {
      console.error('Error saving promo code:', error);
      alert('An unexpected error occurred. Please try again.');
    }
  };

  const toggleStatus = async (id: number, currentStatus: boolean) => {
    try {
      const response = await apiFetch(`/api/admin/promo-codes/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_active: !currentStatus })
      });
      if (response.ok) fetchPromoCodes();
    } catch (error) {
      console.error('Error toggling status:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this promo code?')) return;
    try {
      const response = await apiFetch(`/api/admin/promo-codes/${id}`, {
        method: 'DELETE'
      });
      if (response.ok) fetchPromoCodes();
    } catch (error) {
      console.error('Error deleting promo code:', error);
    }
  };

  const startEdit = (promo: PromoCode) => {
    setEditingPromo(promo);
    setDiscountType(promo.discount_percent ? 'percent' : 'amount');
    setFormData({
      code: promo.code,
      discount_percent: promo.discount_percent?.toString() || '',
      discount_amount: promo.discount_amount?.toString() || '',
      min_order: promo.min_order.toString(),
      expiry_date: promo.expiry_date ? new Date(promo.expiry_date).toISOString().split('T')[0] : '',
      max_uses: promo.max_uses?.toString() || '',
      is_active: promo.is_active,
      product_id: promo.product_id?.toString() || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (isLoading) return <div className="flex justify-center p-12">Loading...</div>;

  return (
    <div className="space-y-10 pb-20">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-[#3B2A1A] dark:text-white">Promo Codes Management</h1>
      </div>

      {/* Top Section: Create/Edit Form */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-sm border border-[#E5E7EB] dark:border-slate-800">
        <h2 className="text-xl font-bold mb-6 dark:text-white flex items-center gap-2">
          {editingPromo ? <Edit2 className="w-5 h-5 text-blue-500" /> : <Plus className="w-5 h-5 text-green-500" />}
          {editingPromo ? 'Edit Promo Code' : 'Create New Promo Code'}
        </h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Code</label>
            <input
              type="text"
              required
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              className="w-full p-3 border rounded-xl dark:bg-slate-800 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-[#D4820A] outline-none transition-all"
              placeholder="E.g. RICE20"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Discount Type</label>
            <select
              value={discountType}
              onChange={(e) => setDiscountType(e.target.value as 'percent' | 'amount')}
              className="w-full p-3 border rounded-xl dark:bg-slate-800 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-[#D4820A] outline-none transition-all"
            >
              <option value="percent">Percentage (%)</option>
              <option value="amount">Fixed Amount (₹)</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Discount Value</label>
            <div className="relative">
              <input
                type="number"
                required
                value={discountType === 'percent' ? formData.discount_percent : formData.discount_amount}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  [discountType === 'percent' ? 'discount_percent' : 'discount_amount']: e.target.value 
                })}
                className="w-full p-3 pr-8 border rounded-xl dark:bg-slate-800 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-[#D4820A] outline-none transition-all"
                placeholder={discountType === 'percent' ? '%' : '₹'}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {discountType === 'percent' ? <Percent size={16} /> : <IndianRupee size={16} />}
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Min Order ₹</label>
            <input
              type="number"
              required
              value={formData.min_order}
              onChange={(e) => setFormData({ ...formData, min_order: e.target.value })}
              className="w-full p-3 border rounded-xl dark:bg-slate-800 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-[#D4820A] outline-none transition-all"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Applies To</label>
            <select
              value={formData.product_id}
              onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
              className="w-full p-3 border rounded-xl dark:bg-slate-800 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-[#D4820A] outline-none transition-all"
            >
              <option value="">All Products</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Expiry Date</label>
            <input
              type="date"
              required
              value={formData.expiry_date}
              onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
              className="w-full p-3 border rounded-xl dark:bg-slate-800 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-[#D4820A] outline-none transition-all"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Max Uses</label>
            <input
              type="number"
              value={formData.max_uses}
              onChange={(e) => setFormData({ ...formData, max_uses: e.target.value })}
              className="w-full p-3 border rounded-xl dark:bg-slate-800 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-[#D4820A] outline-none transition-all"
              placeholder="Unlimited"
            />
          </div>

          <div className="flex items-center gap-4 pt-6">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-5 h-5 rounded border-gray-300 text-[#D4820A] focus:ring-[#D4820A]"
              />
              <label htmlFor="is_active" className="text-sm font-bold dark:text-gray-300">Active</label>
            </div>
          </div>

          <div className="flex gap-3 pt-6">
            {editingPromo && (
              <button
                type="button"
                onClick={() => {
                  setEditingPromo(null);
                  setFormData({
                    code: '',
                    discount_percent: '',
                    discount_amount: '',
                    min_order: '0',
                    expiry_date: '',
                    max_uses: '',
                    is_active: true,
                    product_id: ''
                  });
                }}
                className="flex-1 px-4 py-3 border border-gray-300 dark:border-slate-700 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 dark:text-white transition-all"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-[#D4820A] text-white rounded-xl hover:bg-[#B36D08] font-bold shadow-lg shadow-[#D4820A]/20 transition-all"
            >
              {editingPromo ? 'Update Code' : 'Create Code'}
            </button>
          </div>
        </form>
      </div>

      {/* Bottom Section: Existing Promo Codes Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-[#E5E7EB] dark:border-slate-800 overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-slate-800">
          <h2 className="text-xl font-bold dark:text-white">Existing Promo Codes</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-slate-800/50">
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Code</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Discount</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Applies To</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Min Order</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Expires</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Uses</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Status</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {promoCodes.map((promo) => (
                <tr key={promo.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-mono font-bold text-gray-900 dark:text-white bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded">
                      {promo.code}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1 font-bold text-[#D4820A]">
                      {promo.discount_percent ? (
                        <><Percent size={14} /> {promo.discount_percent}%</>
                      ) : (
                        <><IndianRupee size={14} /> {promo.discount_amount}</>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {promo.product_id ? (
                      <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                        <Package size={14} />
                        <span className="text-sm">{promo.product_name}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500 dark:text-gray-400">All Products</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                    ₹{promo.min_order}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {promo.expiry_date ? new Date(promo.expiry_date).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                        {promo.used_count} / {promo.max_uses || '∞'}
                      </span>
                      {promo.max_uses && (
                        <div className="w-16 bg-gray-100 dark:bg-slate-800 h-1 rounded-full overflow-hidden">
                          <div 
                            className="bg-[#D4820A] h-full"
                            style={{ width: `${Math.min((promo.used_count / promo.max_uses) * 100, 100)}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => toggleStatus(promo.id, promo.is_active)}
                      className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${
                        promo.is_active 
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}
                    >
                      {promo.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => startEdit(promo)}
                        className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => handleDelete(promo.id)}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {promoCodes.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    No promo codes found. Create your first one above!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}