import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Package, MapPin, X, Save, Sparkles, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { generateProductDescription, analyzeAdminData } from '../../services/geminiService';
import ReactMarkdown from 'react-markdown';

export default function AdminProducts() {
  const { token } = useAuth();
  const { setNotification } = useCart();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [farmers, setFarmers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryEmoji, setNewCategoryEmoji] = useState('📦');
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    original_price: '',
    unit: '',
    stock: '',
    origin: '',
    category_id: '',
    farmer_id: '',
    image_url: '',
    is_featured: false,
    is_best_seller: false
  });
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deletingCatId, setDeletingCatId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [confirmDeleteCatId, setConfirmDeleteCatId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showBulkStockModal, setShowBulkStockModal] = useState(false);
  const [bulkStockValue, setBulkStockValue] = useState('');
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const handleAIDescription = async () => {
    if (!formData.name) {
      setNotification('Please enter a product name first.');
      return;
    }
    const category = categories.find((c: any) => c.id.toString() === formData.category_id)?.name || 'General';
    setIsGeneratingAI(true);
    const result = await generateProductDescription(formData.name, category);
    if (result) {
      setFormData({ ...formData, description: result });
      setNotification('AI Description generated!');
    }
    setIsGeneratingAI(false);
  };

  const handleAIAnalysis = async () => {
    if (products.length === 0) return;
    setIsAnalyzing(true);
    const result = await analyzeAdminData(products, "Inventory, Stock Levels & Product Performance");
    setAiAnalysis(result || "Failed to analyze data.");
    setIsAnalyzing(false);
  };

  const fetchData = async () => {
    try {
      const [prodRes, catRes, farmRes] = await Promise.all([
        fetch(`/api/admin/products?t=${Date.now()}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`/api/categories?t=${Date.now()}`),
        fetch(`/api/admin/farmers?t=${Date.now()}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);
      const [prodData, catData, farmData] = await Promise.all([
        prodRes.json(),
        catRes.json(),
        farmRes.json()
      ]);
      setProducts(prodData);
      setCategories(catData);
      setFarmers(farmData);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let finalImageUrl = formData.image_url;
    if (finalImageUrl.includes('imgur.com/a/') || finalImageUrl.includes('imgur.com/gallery/')) {
      const id = finalImageUrl.split('/').pop();
      if (id) finalImageUrl = `https://i.imgur.com/${id}.png`;
    } else if (finalImageUrl.includes('imgur.com/') && !finalImageUrl.includes('i.imgur.com')) {
      const id = finalImageUrl.split('/').pop();
      if (id && !id.includes('.')) finalImageUrl = `https://i.imgur.com/${id}.png`;
    }

    const url = editingProduct ? `/api/admin/products/${editingProduct.id}` : '/api/admin/products';
    const method = editingProduct ? 'PUT' : 'POST';

    try {
      if (!token) {
        setNotification('You must be logged in as an admin.');
        return;
      }
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          image_url: finalImageUrl,
          price: parseFloat(formData.price),
          original_price: formData.original_price ? parseFloat(formData.original_price) : null,
          stock: parseInt(formData.stock),
          category_id: parseInt(formData.category_id),
          farmer_id: parseInt(formData.farmer_id)
        })
      });

      if (res.ok) {
        setShowAddModal(false);
        setEditingProduct(null);
        setFormData({
          name: '', description: '', price: '', original_price: '', unit: '',
          stock: '', origin: '', category_id: '', farmer_id: '', image_url: '',
          is_featured: false, is_best_seller: false
        });
        fetchData();
        setNotification(editingProduct ? 'Product updated successfully!' : 'Product added successfully!');
      } else {
        const data = await res.json();
        setNotification(`Error: ${data.error || 'Something went wrong'}`);
      }
    } catch (err) {
      console.error('Submit error:', err);
      setNotification('Failed to connect to server');
    }
  };

  const handleEdit = (product: any) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      price: product.price.toString(),
      original_price: product.original_price?.toString() || '',
      unit: product.unit,
      stock: product.stock.toString(),
      origin: product.origin,
      category_id: product.category_id.toString(),
      farmer_id: product.farmer_id?.toString() || '',
      image_url: product.image_url,
      is_featured: !!product.is_featured,
      is_best_seller: !!product.is_best_seller
    });
    setShowAddModal(true);
  };

  const handleDeleteProduct = async (id: number) => {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      setTimeout(() => setConfirmDeleteId(null), 3000);
      return;
    }
    
    setConfirmDeleteId(null);
    setDeletingId(id);
    try {
      if (!token) {
        setNotification('Error: No authentication token found. Please re-login.');
        return;
      }

      // Try DELETE first
      let res = await fetch(`/api/admin/products/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      // If DELETE is not allowed or fails, try POST fallback
      if (res.status === 405 || res.status === 404) {
        res = await fetch(`/api/admin/products/${id}/delete`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }

      if (res.ok) {
        const data = await res.json();
        setNotification(`Product deleted successfully!`);
        await fetchData();
      } else {
        const errorData = await res.json().catch(() => ({}));
        setNotification(`Error: ${errorData.error || 'Failed to delete product'}`);
        
        if (res.status === 403) {
          setNotification(`Permission Denied: Your account is not recognized as an admin.`);
        }
      }
    } catch (err) {
      console.error('[Admin] Network error during delete:', err);
      setNotification('Network Error: Failed to connect to server.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) {
      setNotification('Please enter a category name');
      return;
    }

    setIsAddingCategory(true);
    try {
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: newCategoryName, emoji: newCategoryEmoji })
      });

      if (res.ok) {
        setNewCategoryName('');
        setNewCategoryEmoji('📦');
        await fetchData();
        setNotification('Category added successfully!');
      } else {
        const data = await res.json();
        setNotification(`Error: ${data.error || 'Failed to add category'}`);
      }
    } catch (err) {
      setNotification('Failed to connect to server');
    } finally {
      setIsAddingCategory(false);
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (confirmDeleteCatId !== id) {
      setConfirmDeleteCatId(id);
      setTimeout(() => setConfirmDeleteCatId(null), 3000);
      return;
    }

    setConfirmDeleteCatId(null);
    setDeletingCatId(id);
    try {
      if (!token) {
        setNotification('Error: No authentication token found.');
        return;
      }

      console.log(`[Admin] Attempting to delete category ${id}`);
      
      // Try DELETE first
      let res = await fetch(`/api/admin/categories/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      // Fallback to POST if DELETE is blocked
      if (res.status === 405 || res.status === 404) {
        console.log(`[Admin] DELETE not supported, trying POST fallback for category ${id}`);
        res = await fetch(`/api/admin/categories/${id}/delete`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }

      if (res.ok) {
        fetchData();
        setNotification('Category deleted successfully!');
      } else {
        const data = await res.json().catch(() => ({ error: 'Unknown server error' }));
        console.error('[Admin] Delete category failed:', data);
        setNotification(`Error: ${data.error || 'Failed to delete category'}`);
      }
    } catch (err) {
      console.error('[Admin] Network error during category delete:', err);
      setNotification('Failed to connect to server');
    } finally {
      setDeletingCatId(null);
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkStockUpdate = async () => {
    const stock = parseInt(bulkStockValue);
    if (isNaN(stock)) {
      setNotification('Please enter a valid stock number');
      return;
    }
    
    setIsBulkUpdating(true);
    try {
      const res = await fetch('/api/admin/products/bulk-stock', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ids: selectedIds, stock })
      });
      
      if (res.ok) {
        setNotification(`Successfully updated stock for ${selectedIds.length} products!`);
        setSelectedIds([]);
        setShowBulkStockModal(false);
        setBulkStockValue('');
        fetchData();
      } else {
        const data = await res.json();
        setNotification(`Error: ${data.error || 'Failed to update stock'}`);
      }
    } catch (err) {
      setNotification('Failed to connect to server');
    } finally {
      setIsBulkUpdating(false);
    }
  };

  if (loading) return <div className="animate-pulse h-96 bg-white dark:bg-slate-800 rounded-3xl transition-colors" />;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-slate-100">Manage Products</h1>
          {selectedIds.length > 0 && (
            <p className="text-sm text-[#D4820A] font-bold animate-in fade-in slide-in-from-left-2">
              {selectedIds.length} products selected
            </p>
          )}
        </div>
        <div className="flex items-center space-x-4">
          {selectedIds.length > 0 && (
            <div className="flex items-center space-x-2 animate-in zoom-in-95">
              <button 
                onClick={() => setShowBulkStockModal(true)}
                className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-4 py-2 rounded-xl hover:opacity-90 transition-all font-bold flex items-center space-x-2"
              >
                <Package className="w-4 h-4" />
                <span>Bulk Edit Stock</span>
              </button>
              <button 
                onClick={() => setSelectedIds([])}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}
          <button 
            onClick={() => {
              if (selectedIds.length === products.length) setSelectedIds([]);
              else setSelectedIds(products.map((p: any) => p.id));
            }}
            className="bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 px-4 py-2 rounded-xl border border-black/10 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all font-bold"
          >
            {selectedIds.length === products.length ? 'Deselect All' : 'Select All'}
          </button>
          <button 
            onClick={() => setShowCategoryModal(true)}
            className="bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 px-4 py-2 rounded-xl border border-black/10 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all font-bold"
          >
            Manage Categories
          </button>
          <button 
            onClick={handleAIAnalysis}
            disabled={isAnalyzing}
            className="flex items-center space-x-2 bg-emerald-600 text-white px-4 py-2 rounded-xl hover:bg-emerald-700 transition-all disabled:opacity-50 shadow-lg"
          >
            {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            <span>AI Inventory Analysis</span>
          </button>
          <button 
            onClick={() => {
              setEditingProduct(null);
              setFormData({
                name: '', description: '', price: '', original_price: '', unit: '',
                stock: '', origin: '', category_id: '', image_url: '',
                is_featured: false, is_best_seller: false
              });
              setShowAddModal(true);
            }}
            className="bg-[#D4820A] text-white px-6 py-3 rounded-2xl font-bold flex items-center space-x-2 hover:bg-[#B87008] transition-all"
          >
            <Plus className="w-5 h-5" />
            <span>Add New Product</span>
          </button>
        </div>
      </div>

      {aiAnalysis && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 p-8 rounded-3xl border border-emerald-100 dark:border-emerald-800/30 relative animate-in fade-in slide-in-from-top-4 transition-colors">
          <button onClick={() => setAiAnalysis(null)} className="absolute top-4 right-4 text-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-300"><X className="w-6 h-6" /></button>
          <div className="flex items-center space-x-2 text-emerald-700 dark:text-emerald-400 font-bold mb-4">
            <Sparkles className="w-5 h-5" />
            <span>AI Inventory Insights</span>
          </div>
          <div className="prose prose-sm max-w-none prose-p:text-emerald-900/70 dark:prose-p:text-emerald-200/70 prose-li:text-emerald-900/70 dark:prose-li:text-emerald-200/70">
            <ReactMarkdown>{aiAnalysis}</ReactMarkdown>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product: any) => (
          <div 
            key={product.id} 
            onClick={() => toggleSelect(product.id)}
            className={`bg-white dark:bg-slate-800 p-6 rounded-3xl border ${selectedIds.includes(product.id) ? 'border-[#D4820A] ring-2 ring-[#D4820A]/20' : 'border-black/5 dark:border-white/10'} shadow-sm space-y-4 group transition-all cursor-pointer relative`}
          >
            <div className="absolute top-4 right-4 z-20">
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${selectedIds.includes(product.id) ? 'bg-[#D4820A] border-[#D4820A]' : 'bg-white/50 dark:bg-slate-800/50 border-white/30 dark:border-slate-600'}`}>
                {selectedIds.includes(product.id) && <Plus className="w-4 h-4 text-white rotate-45" />}
              </div>
            </div>
            <div className="aspect-video bg-[#F0E6D3] dark:bg-slate-700 rounded-2xl overflow-hidden relative">
              <img 
                src={product.image_url || `https://picsum.photos/seed/${product.id}/400/225`} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                alt={product.name}
                referrerPolicy="no-referrer"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = `https://picsum.photos/seed/${product.id}/400/225`;
                }}
              />
              <div className="absolute top-3 left-3 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm px-2 py-1 rounded-lg flex items-center space-x-1 text-[10px] font-bold text-gray-600 dark:text-slate-300 transition-colors">
                <MapPin className="w-3 h-3" />
                <span>{product.origin}</span>
              </div>
              {product.is_active === 0 && (
                <div className="absolute top-3 right-3 bg-red-500 text-white px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                  Inactive
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-xl text-gray-900 dark:text-slate-100">{product.name}</h3>
                  <p className="text-gray-500 dark:text-slate-400 text-sm">{product.unit}</p>
                </div>
                <span className="text-xl font-bold text-[#D4820A]">₹{product.price}</span>
              </div>
              
              <div className="flex items-center space-x-4 pt-2">
                <div className="flex items-center space-x-1 text-sm">
                  <Package className="w-4 h-4 text-gray-400 dark:text-slate-500" />
                  <span className={`font-bold ${product.stock < 10 ? 'text-red-500 dark:text-red-400' : 'text-gray-600 dark:text-slate-300'}`}>
                    {product.stock} in stock
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-4 border-t border-black/5 dark:border-white/5">
              <button 
                onClick={() => handleEdit(product)}
                className="flex-grow bg-gray-50 dark:bg-slate-700 text-gray-600 dark:text-gray-300 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-100 dark:hover:bg-slate-600 transition-all"
              >
                <Edit className="w-4 h-4" />
                <span>Edit</span>
              </button>
              <button 
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleDeleteProduct(product.id);
                }}
                disabled={deletingId === product.id}
                className={`p-3 rounded-xl transition-all flex items-center justify-center disabled:opacity-50 cursor-pointer relative z-10 ${confirmDeleteId === product.id ? 'bg-red-600 text-white animate-pulse' : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40'}`}
                title={confirmDeleteId === product.id ? "Click again to confirm" : "Delete Product"}
              >
                {deletingId === product.id ? <Loader2 className="w-5 h-5 animate-spin" /> : (confirmDeleteId === product.id ? <Save className="w-5 h-5" /> : <Trash2 className="w-5 h-5" />)}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col transition-colors">
            <div className="p-6 border-b border-black/5 dark:border-white/10 flex items-center justify-between bg-gray-50 dark:bg-slate-900/50">
              <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100">{editingProduct ? 'Edit Product' : 'Add New Product'}</h3>
              <button 
                onClick={() => {
                  setShowAddModal(false);
                  setEditingProduct(null);
                  setFormData({
                    name: '', description: '', price: '', original_price: '', unit: '',
                    stock: '', origin: '', category_id: '', farmer_id: '', image_url: '',
                    is_featured: false, is_best_seller: false
                  });
                }}
                className="p-2 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-gray-900 dark:text-slate-100" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-bold mb-1 text-gray-900 dark:text-white">Product Name</label>
                  <input 
                    type="text" required
                    className="w-full p-3 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#D4820A]/20 transition-colors"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-bold mb-1 text-gray-900 dark:text-white">Description</label>
                  <textarea 
                    required
                    className="w-full p-3 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#D4820A]/20 h-24 transition-colors"
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1 text-gray-900 dark:text-white">Price (₹)</label>
                  <input 
                    type="number" required
                    className="w-full p-3 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#D4820A]/20 transition-colors"
                    value={formData.price}
                    onChange={e => setFormData({...formData, price: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1 text-gray-900 dark:text-white">Original Price (₹)</label>
                  <input 
                    type="number"
                    className="w-full p-3 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#D4820A]/20 transition-colors"
                    value={formData.original_price}
                    onChange={e => setFormData({...formData, original_price: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1 text-gray-900 dark:text-white">Unit (e.g. 500g, 1kg)</label>
                  <input 
                    type="text" required
                    className="w-full p-3 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#D4820A]/20 transition-colors"
                    value={formData.unit}
                    onChange={e => setFormData({...formData, unit: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1 text-gray-900 dark:text-white">Stock</label>
                  <input 
                    type="number" required
                    className="w-full p-3 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#D4820A]/20 transition-colors"
                    value={formData.stock}
                    onChange={e => setFormData({...formData, stock: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1 text-gray-900 dark:text-white">Origin</label>
                  <input 
                    type="text" required
                    className="w-full p-3 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#D4820A]/20 transition-colors"
                    value={formData.origin}
                    onChange={e => setFormData({...formData, origin: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1 text-gray-900 dark:text-white">Category</label>
                  <select 
                    required
                    className="w-full p-3 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#D4820A]/20 transition-colors"
                    value={formData.category_id}
                    onChange={e => setFormData({...formData, category_id: e.target.value})}
                  >
                    <option value="">Select Category</option>
                    {categories.map((cat: any) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1 text-gray-900 dark:text-white">Farmer</label>
                  <select 
                    required
                    className="w-full p-3 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#D4820A]/20 transition-colors"
                    value={formData.farmer_id}
                    onChange={e => setFormData({...formData, farmer_id: e.target.value})}
                  >
                    <option value="">Select Farmer</option>
                    {farmers.map((farmer: any) => (
                      <option key={farmer.id} value={farmer.id}>{farmer.name}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-bold mb-1 text-gray-900 dark:text-white">Image URL</label>
                  <div className="flex space-x-4">
                    <div className="flex-grow">
                      <input 
                        type="url" required
                        className="w-full p-3 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#D4820A]/20 transition-colors"
                        placeholder="https://images.unsplash.com/..."
                        value={formData.image_url}
                        onChange={e => setFormData({...formData, image_url: e.target.value})}
                      />
                    </div>
                    {formData.image_url && (
                      <div className="w-16 h-16 rounded-xl overflow-hidden border border-black/10 dark:border-white/10 flex-shrink-0 bg-gray-100 dark:bg-slate-700 transition-colors">
                        <img 
                          src={formData.image_url} 
                          alt="Preview" 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = 'https://picsum.photos/seed/error/200/200';
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <input 
                    type="checkbox"
                    id="is_featured"
                    checked={formData.is_featured}
                    onChange={e => setFormData({...formData, is_featured: e.target.checked})}
                  />
                  <label htmlFor="is_featured" className="text-sm font-bold text-gray-900 dark:text-white">Featured Product</label>
                </div>
                <div className="flex items-center space-x-2">
                  <input 
                    type="checkbox"
                    id="is_best_seller"
                    checked={formData.is_best_seller}
                    onChange={e => setFormData({...formData, is_best_seller: e.target.checked})}
                  />
                  <label htmlFor="is_best_seller" className="text-sm font-bold text-gray-900 dark:text-white">Best Seller</label>
                </div>
              </div>

              <div className="pt-6">
                <button 
                  type="submit"
                  className="w-full bg-[#D4820A] text-white py-4 rounded-2xl font-bold text-lg flex items-center justify-center space-x-2 hover:bg-[#B87008] transition-all"
                >
                  <Save className="w-5 h-5" />
                  <span>{editingProduct ? 'Update Product' : 'Save Product'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Categories Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col transition-colors">
            <div className="p-6 border-b border-black/5 dark:border-white/10 flex items-center justify-between bg-gray-50 dark:bg-slate-900/50">
              <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100">Manage Categories</h3>
              <button 
                onClick={() => setShowCategoryModal(false)}
                className="p-2 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-gray-900 dark:text-slate-100" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <form onSubmit={handleAddCategory} className="space-y-4">
                <div className="flex space-x-2">
                  <input 
                    type="text"
                    placeholder="Emoji (e.g. 🍚)"
                    className="w-20 p-3 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-slate-700 text-center text-2xl outline-none focus:ring-2 focus:ring-[#D4820A]/20 transition-colors"
                    value={newCategoryEmoji}
                    onChange={e => setNewCategoryEmoji(e.target.value)}
                  />
                  <input 
                    type="text"
                    placeholder="New Category Name"
                    className="flex-grow p-3 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#D4820A]/20 transition-colors"
                    value={newCategoryName}
                    onChange={e => setNewCategoryName(e.target.value)}
                  />
                </div>
                <button 
                  type="submit"
                  disabled={isAddingCategory}
                  className="w-full bg-[#D4820A] text-white py-3 rounded-xl font-bold hover:bg-[#B87008] transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  {isAddingCategory ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  <span>Add Category</span>
                </button>
              </form>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {categories.map((cat: any) => (
                  <div key={cat.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-900/50 rounded-xl border border-black/5 dark:border-white/5">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{cat.emoji || '📦'}</span>
                      <span className="font-medium text-gray-900 dark:text-slate-100">{cat.name}</span>
                    </div>
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDeleteCategory(cat.id);
                      }}
                      disabled={deletingCatId === cat.id}
                      className={`p-1 rounded transition-all disabled:opacity-50 cursor-pointer relative z-10 ${confirmDeleteCatId === cat.id ? 'text-red-600 animate-pulse scale-125' : 'text-red-500 hover:text-red-700 dark:hover:text-red-400'}`}
                      title={confirmDeleteCatId === cat.id ? "Click again to confirm" : "Delete Category"}
                    >
                      {deletingCatId === cat.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : confirmDeleteCatId === cat.id ? (
                        <Save className="w-4 h-4 text-red-600" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Stock Modal */}
      {showBulkStockModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md p-8 space-y-6 animate-in zoom-in-95 transition-colors">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Bulk Update Stock</h3>
              <button onClick={() => setShowBulkStockModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors">
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>
            <p className="text-gray-500 dark:text-slate-400">
              Updating stock for <span className="text-[#D4820A] font-bold">{selectedIds.length}</span> selected products.
            </p>
            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-700 dark:text-white">New Stock Level</label>
              <input 
                type="number"
                className="w-full p-4 rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#D4820A]/20 transition-colors"
                placeholder="Enter stock amount..."
                value={bulkStockValue}
                onChange={e => setBulkStockValue(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex space-x-3">
              <button 
                onClick={() => setShowBulkStockModal(false)}
                className="flex-1 px-6 py-4 rounded-2xl font-bold text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleBulkStockUpdate}
                disabled={isBulkUpdating || !bulkStockValue}
                className="flex-1 bg-[#D4820A] text-white px-6 py-4 rounded-2xl font-bold hover:bg-[#B87008] transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                {isBulkUpdating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                <span>Update All</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
