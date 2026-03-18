import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Package, Plus, Trash2, Save, Image as ImageIcon, Tag, Info, CheckCircle2, XCircle, Loader2, ChevronLeft, Gift } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

interface Product {
  id: number;
  name: string;
  price: number;
  image_url: string;
  unit: string;
}

interface BundleItem {
  product_id: number;
  quantity: number;
  product?: Product;
}

interface Bundle {
  id: number;
  name: string;
  description: string;
  image_url: string;
  bundle_price: number;
  is_active: boolean;
  items: any[];
  original_total: number;
}

export default function AdminBundles() {
  const { token } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [bundlePrice, setBundlePrice] = useState('');
  const [selectedItems, setSelectedItems] = useState<BundleItem[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [prodRes, bundleRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/bundles')
      ]);
      const prodData = await prodRes.json();
      const bundleData = await bundleRes.json();
      setProducts(prodData);
      setBundles(bundleData);
    } catch (e) {
      console.error('Failed to fetch data:', e);
    } finally {
      setLoading(false);
    }
  };

  const addItem = () => {
    setSelectedItems([...selectedItems, { product_id: products[0]?.id || 0, quantity: 1 }]);
  };

  const removeItem = (index: number) => {
    setSelectedItems(selectedItems.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof BundleItem, value: any) => {
    const newItems = [...selectedItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setSelectedItems(newItems);
  };

  const calculateOriginalTotal = () => {
    return selectedItems.reduce((total, item) => {
      const product = products.find(p => p.id === item.product_id);
      return total + (product?.price || 0) * item.quantity;
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItems.length === 0) {
      alert('Please add at least one product to the bundle');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/bundles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name,
          description,
          image_url: imageUrl,
          bundle_price: parseFloat(bundlePrice),
          items: selectedItems
        })
      });

      if (res.ok) {
        setName('');
        setDescription('');
        setImageUrl('');
        setBundlePrice('');
        setSelectedItems([]);
        fetchData();
      }
    } catch (e) {
      console.error('Failed to create bundle:', e);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (id: number, currentStatus: boolean) => {
    try {
      await fetch(`/api/admin/bundles/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ is_active: !currentStatus })
      });
      fetchData();
    } catch (e) {
      console.error('Failed to toggle status:', e);
    }
  };

  const deleteBundle = async (id: number) => {
    if (!confirm('Are you sure you want to delete this bundle?')) return;
    try {
      await fetch(`/api/admin/bundles/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchData();
    } catch (e) {
      console.error('Failed to delete bundle:', e);
    }
  };

  const originalTotal = calculateOriginalTotal();
  const savings = originalTotal - parseFloat(bundlePrice || '0');

  return (
    <div className="space-y-12 pb-20">
      <div className="flex flex-col space-y-4">
        <Link to="/admin" className="flex items-center text-sm font-bold text-[#D4820A] hover:underline">
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back to Dashboard
        </Link>
        <div className="flex items-center space-x-4">
          <div className="bg-[#D4820A]/10 p-3 rounded-2xl text-[#D4820A]">
            <Gift className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-slate-100">Product Bundles</h1>
            <p className="text-gray-500 dark:text-slate-400">Create value combos and special offers</p>
          </div>
        </div>
      </div>

      {/* Create Bundle Form */}
      <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-black/5 dark:border-white/10 shadow-xl overflow-hidden">
        <div className="p-8 border-b border-black/5 dark:border-white/10 bg-gray-50/50 dark:bg-slate-900/50">
          <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100 flex items-center space-x-2">
            <Plus className="w-5 h-5 text-[#D4820A]" />
            <span>Create New Bundle</span>
          </h2>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-gray-400 px-1">Bundle Name</label>
              <div className="relative">
                <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  required
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-slate-900 border-none rounded-2xl outline-none focus:ring-2 focus:ring-[#D4820A]/20 transition-all font-medium"
                  placeholder="e.g., Weekly Veggie Box"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-gray-400 px-1">Description</label>
              <div className="relative">
                <Info className="absolute left-4 top-4 w-5 h-5 text-gray-400" />
                <textarea
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-slate-900 border-none rounded-2xl outline-none focus:ring-2 focus:ring-[#D4820A]/20 transition-all font-medium min-h-[120px]"
                  placeholder="What's included in this combo?"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-400 px-1">Image URL</label>
                <div className="relative">
                  <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    required
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-slate-900 border-none rounded-2xl outline-none focus:ring-2 focus:ring-[#D4820A]/20 transition-all font-medium text-sm"
                    placeholder="https://..."
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-400 px-1">Bundle Price (₹)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400">₹</span>
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={bundlePrice}
                    onChange={(e) => setBundlePrice(e.target.value)}
                    className="w-full pl-10 pr-4 py-4 bg-gray-50 dark:bg-slate-900 border-none rounded-2xl outline-none focus:ring-2 focus:ring-[#D4820A]/20 transition-all font-bold text-lg text-[#D4820A]"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            {/* Live Preview Card */}
            <div className="bg-[#D4820A]/5 rounded-3xl p-6 border border-[#D4820A]/10 space-y-4">
              <h3 className="text-sm font-bold text-[#D4820A] uppercase tracking-wider">Bundle Savings Preview</h3>
              <div className="flex items-end justify-between">
                <div className="space-y-1">
                  <p className="text-xs text-gray-500">Original Total</p>
                  <p className="text-xl font-bold text-gray-400 line-through">₹{originalTotal.toFixed(2)}</p>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-xs text-gray-500">Bundle Price</p>
                  <p className="text-3xl font-bold text-[#D4820A]">₹{parseFloat(bundlePrice || '0').toFixed(2)}</p>
                </div>
              </div>
              {savings > 0 && (
                <div className="bg-emerald-500 text-white px-4 py-2 rounded-xl text-center font-bold animate-pulse">
                  Customers save ₹{savings.toFixed(2)}!
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between px-1">
              <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Bundle Items</label>
              <button
                type="button"
                onClick={addItem}
                className="text-xs font-bold text-[#D4820A] hover:underline flex items-center"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Product
              </button>
            </div>

            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              <AnimatePresence initial={false}>
                {selectedItems.map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex items-center space-x-4 bg-gray-50 dark:bg-slate-900 p-4 rounded-2xl border border-black/5 dark:border-white/5"
                  >
                    <div className="flex-grow">
                      <select
                        value={item.product_id}
                        onChange={(e) => updateItem(index, 'product_id', parseInt(e.target.value))}
                        className="w-full bg-transparent border-none outline-none font-bold text-gray-900 dark:text-slate-100"
                      >
                        {products.map(p => (
                          <option key={p.id} value={p.id}>{p.name} (₹{p.price}/{p.unit})</option>
                        ))}
                      </select>
                    </div>
                    <div className="w-24">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value))}
                        className="w-full bg-white dark:bg-slate-800 border-none rounded-lg px-3 py-2 outline-none font-bold text-center"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
              {selectedItems.length === 0 && (
                <div className="text-center py-12 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-3xl">
                  <Package className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No products added to this bundle yet</p>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting || selectedItems.length === 0}
              className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-4 rounded-2xl font-bold text-lg flex items-center justify-center space-x-3 hover:opacity-90 transition-opacity disabled:opacity-50 shadow-xl"
            >
              {submitting ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
              <span>Create Bundle Offer</span>
            </button>
          </div>
        </form>
      </div>

      {/* Existing Bundles Table */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100 px-2">Active Bundles</h2>
        <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-black/5 dark:border-white/10 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 dark:bg-slate-900/50 border-b border-black/5 dark:border-white/5">
                  <th className="p-6 font-bold text-gray-600 dark:text-white">Bundle</th>
                  <th className="p-6 font-bold text-gray-600 dark:text-white text-center">Items</th>
                  <th className="p-6 font-bold text-gray-600 dark:text-white">Pricing</th>
                  <th className="p-6 font-bold text-gray-600 dark:text-white">Savings</th>
                  <th className="p-6 font-bold text-gray-600 dark:text-white">Status</th>
                  <th className="p-6 font-bold text-gray-600 dark:text-white">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/5">
                {bundles.map((bundle) => (
                  <tr key={bundle.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    <td className="p-6">
                      <div className="flex items-center space-x-4">
                        <img src={bundle.image_url} alt={bundle.name} className="w-12 h-12 rounded-xl object-cover" />
                        <div>
                          <p className="font-bold text-gray-900 dark:text-slate-100">{bundle.name}</p>
                          <p className="text-xs text-gray-500 truncate max-w-[200px]">{bundle.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-6 text-center">
                      <span className="bg-gray-100 dark:bg-slate-700 px-3 py-1 rounded-full text-xs font-bold">
                        {bundle.items.length} Products
                      </span>
                    </td>
                    <td className="p-6">
                      <div className="space-y-1">
                        <p className="text-lg font-bold text-[#D4820A]">₹{bundle.bundle_price}</p>
                        <p className="text-xs text-gray-400 line-through">₹{Number(bundle.original_total).toFixed(2)}</p>
                      </div>
                    </td>
                    <td className="p-6">
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                        ₹{(Number(bundle.original_total) - Number(bundle.bundle_price)).toFixed(2)}
                      </span>
                    </td>
                    <td className="p-6">
                      <button
                        onClick={() => toggleActive(bundle.id, bundle.is_active)}
                        className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${
                          bundle.is_active 
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                            : 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-400'
                        }`}
                      >
                        {bundle.is_active ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        <span>{bundle.is_active ? 'Active' : 'Inactive'}</span>
                      </button>
                    </td>
                    <td className="p-6">
                      <button
                        onClick={() => deleteBundle(bundle.id)}
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
                {bundles.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-gray-500">
                      No bundles created yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
