import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Edit, Trash2, Package, MapPin, X, Save, Sparkles, Loader2, Smile } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { generateProductDescription, analyzeAdminData } from '../../services/geminiService';
import ReactMarkdown from 'react-markdown';
import EmojiPicker, { Theme } from 'emoji-picker-react';

export default function AdminProducts() {
  const { token, apiFetch } = useAuth();
  const { setNotification } = useCart();
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [farmers, setFarmers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryEmoji, setNewCategoryEmoji] = useState('🌾');
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
    is_best_seller: false,
    sale_price: '',
    sale_ends_at: ''
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
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isUpdatingCategory, setIsUpdatingCategory] = useState(false);
  const [filterLowStock, setFilterLowStock] = useState(searchParams.get('filter') === 'low-stock');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  useEffect(() => {
    if (searchParams.get('filter') === 'low-stock') {
      setFilterLowStock(true);
    }
  }, [searchParams]);

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
      console.log('[AdminProducts] Fetching data...');
      // Only show loading skeleton on initial load
      if (products.length === 0) setLoading(true);
      
      const [prodRes, catRes, farmRes] = await Promise.all([
        apiFetch(`/api/admin/products?t=${Date.now()}`),
        apiFetch(`/api/categories?t=${Date.now()}`),
        apiFetch(`/api/admin/farmers?t=${Date.now()}`)
      ]);
      
      if (!prodRes.ok || !catRes.ok || !farmRes.ok) {
        throw new Error(`Fetch failed: ${prodRes.status} ${catRes.status} ${farmRes.status}`);
      }

      const [prodData, catData, farmData] = await Promise.all([
        prodRes.json(),
        catRes.json(),
        farmRes.json()
      ]);
      
      console.log(`[AdminProducts] Fetched ${Array.isArray(prodData) ? prodData.length : 0} products, ${Array.isArray(catData) ? catData.length : 0} categories, ${Array.isArray(farmData) ? farmData.length : 0} farmers`);
      
      if (Array.isArray(prodData)) setProducts(prodData);
      else setProducts([]);

      if (Array.isArray(catData)) setCategories(catData);
      else setCategories([]);

      if (Array.isArray(farmData)) setFarmers(farmData);
      else setFarmers([]);
    } catch (err) {
      console.error('[AdminProducts] Fetch error:', err);
      setNotification('Failed to fetch data. Please try again.');
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
      const res = await apiFetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          image_url: finalImageUrl,
          price: parseFloat(formData.price),
          original_price: formData.original_price ? parseFloat(formData.original_price) : null,
          stock: parseInt(formData.stock),
          category_id: parseInt(formData.category_id),
          farmer_id: parseInt(formData.farmer_id),
          sale_price: formData.sale_price ? parseFloat(formData.sale_price) : null,
          sale_ends_at: formData.sale_ends_at || null
        })
      });

      if (res.ok) {
        setShowAddModal(false);
        setEditingProduct(null);
        setFormData({
          name: '', description: '', price: '', original_price: '', unit: '',
          stock: '', origin: '', category_id: '', farmer_id: '', image_url: '',
          is_featured: false, is_best_seller: false, sale_price: '', sale_ends_at: ''
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
      is_best_seller: !!product.is_best_seller,
      sale_price: product.sale_price?.toString() || '',
      sale_ends_at: product.sale_ends_at ? new Date(product.sale_ends_at).toISOString().slice(0, 16) : ''
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
      // Try DELETE first
      let res = await apiFetch(`/api/admin/products/${id}`, {
        method: 'DELETE'
      });

      // If DELETE is not allowed or fails, try POST fallback
      if (res.status === 405 || res.status === 404) {
        res = await apiFetch(`/api/admin/products/${id}/delete`, {
          method: 'POST'
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

    if (editingCategory) {
      handleUpdateCategory();
      return;
    }

    setIsAddingCategory(true);
    try {
      const res = await apiFetch('/api/admin/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: newCategoryName, emoji: newCategoryEmoji })
      });

      if (res.ok) {
        setNewCategoryName('');
        setNewCategoryEmoji('🌾');
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

  const handleUpdateCategory = async () => {
    if (!editingCategory) return;
    setIsUpdatingCategory(true);
    try {
      const res = await apiFetch(`/api/admin/categories/${editingCategory.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: newCategoryName, emoji: newCategoryEmoji })
      });

      if (res.ok) {
        setEditingCategory(null);
        setNewCategoryName('');
        setNewCategoryEmoji('🌾');
        await fetchData();
        setNotification('Category updated successfully!');
      } else {
        const data = await res.json();
        setNotification(`Error: ${data.error || 'Failed to update category'}`);
      }
    } catch (err) {
      setNotification('Failed to connect to server');
    } finally {
      setIsUpdatingCategory(false);
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
      console.log(`[Admin] Attempting to delete category ${id}`);
      
      // Try DELETE first
      let res = await apiFetch(`/api/admin/categories/${id}`, {
        method: 'DELETE'
      });

      // Fallback to POST if DELETE is blocked
      if (res.status === 405 || res.status === 404) {
        console.log(`[Admin] DELETE not supported, trying POST fallback for category ${id}`);
        res = await apiFetch(`/api/admin/categories/${id}/delete`, {
          method: 'POST'
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
      const res = await apiFetch('/api/admin/products/bulk-stock', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
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

  if (loading && products.length === 0) return <div className="animate-pulse h-96 bg-white dark:bg-slate-800 rounded-3xl transition-colors" />;

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-slate-100">Manage Products</h1>
          {selectedIds.length > 0 && (
            <p className="text-sm text-[#D4820A] font-bold animate-in fade-in slide-in-from-left-2">
              {selectedIds.length} products selected
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {selectedIds.length > 0 && (
            <div className="flex items-center space-x-2 animate-in zoom-in-95">
              <button 
                onClick={() => setShowBulkStockModal(true)}
                className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-4 py-2 rounded-xl hover:opacity-90 transition-all font-bold flex items-center space-x-2"
              >
                <Package className="w-4 h-4" />
                <span className="hidden sm:inline">Bulk Edit Stock</span>
                <span className="sm:hidden">Bulk Edit</span>
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
            className="bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 px-4 py-2 rounded-xl border border-black/10 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all font-bold text-sm"
          >
            {selectedIds.length === products.length ? 'Deselect All' : 'Select All'}
          </button>
          <button 
            onClick={() => setFilterLowStock(!filterLowStock)}
            className={`px-4 py-2 rounded-xl border font-bold text-sm transition-all ${filterLowStock ? 'bg-amber-100 border-amber-500 text-amber-700' : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 border-black/10 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
          >
            Low Stock
          </button>
          <div className="flex items-center bg-white dark:bg-slate-800 rounded-xl border border-black/10 dark:border-white/10 p-1">
            <button 
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'grid' ? 'bg-[#D4820A] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-slate-400'}`}
            >
              Grid
            </button>
            <button 
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'table' ? 'bg-[#D4820A] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-slate-400'}`}
            >
              Table
            </button>
          </div>
          <button 
            onClick={() => setShowCategoryModal(true)}
            className="bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 px-4 py-2 rounded-xl border border-black/10 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all font-bold text-sm"
          >
            Categories
          </button>
          <button 
            onClick={handleAIAnalysis}
            disabled={isAnalyzing}
            className="flex items-center space-x-2 bg-emerald-600 text-white px-4 py-2 rounded-xl hover:bg-emerald-700 transition-all disabled:opacity-50 shadow-lg text-sm"
          >
            {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            <span className="hidden sm:inline">AI Analysis</span>
            <span className="sm:hidden">AI</span>
          </button>
          <button 
            onClick={() => {
              setEditingProduct(null);
              setFormData({
                name: '', description: '', price: '', original_price: '', unit: '',
                stock: '', origin: '', category_id: '', farmer_id: '', image_url: '',
                is_featured: false, is_best_seller: false, sale_price: '', sale_ends_at: ''
              });
              setShowAddModal(true);
            }}
            className="bg-[#D4820A] text-white px-4 sm:px-6 py-2 sm:py-3 rounded-xl sm:rounded-2xl font-bold flex items-center space-x-2 hover:bg-[#B87008] transition-all shadow-lg"
          >
            <Plus className="w-5 h-5" />
            <span>Add Product</span>
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

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products
            .filter((p: any) => !filterLowStock || p.stock <= 5)
            .map((product: any) => (
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
                {product.stock === 0 && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <span className="bg-red-600 text-white px-3 py-1 rounded-lg font-bold text-xs uppercase tracking-widest">Out of Stock</span>
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
                
                <div className="flex items-center space-x-2 pt-2">
                  <div className="flex items-center space-x-2 text-sm">
                    <Package className="w-4 h-4 text-gray-400 dark:text-slate-500" />
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                      product.stock === 0 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                      product.stock <= 5 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                      'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    }`}>
                      {product.stock} in stock
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-4 border-t border-black/5 dark:border-white/5">
                <button 
                  onClick={(e) => { e.stopPropagation(); handleEdit(product); }}
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
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-black/5 dark:border-white/10 overflow-hidden shadow-sm transition-colors">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-slate-900/50 border-b border-black/5 dark:border-white/10">
                  <th className="p-4 w-12">
                    <input 
                      type="checkbox"
                      checked={selectedIds.length === products.length && products.length > 0}
                      onChange={() => {
                        if (selectedIds.length === products.length) setSelectedIds([]);
                        else setSelectedIds(products.map((p: any) => p.id));
                      }}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th className="p-4 font-bold text-sm text-gray-500 dark:text-slate-400 uppercase tracking-wider">Product</th>
                  <th className="p-4 font-bold text-sm text-gray-500 dark:text-slate-400 uppercase tracking-wider">Category</th>
                  <th className="p-4 font-bold text-sm text-gray-500 dark:text-slate-400 uppercase tracking-wider">Price</th>
                  <th className="p-4 font-bold text-sm text-gray-500 dark:text-slate-400 uppercase tracking-wider">Stock</th>
                  <th className="p-4 font-bold text-sm text-gray-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="p-4 font-bold text-sm text-gray-500 dark:text-slate-400 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/5">
                {products
                  .filter((p: any) => !filterLowStock || p.stock <= 5)
                  .map((product: any) => (
                  <tr 
                    key={product.id}
                    onClick={() => toggleSelect(product.id)}
                    className={`hover:bg-gray-50/50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer ${selectedIds.includes(product.id) ? 'bg-[#D4820A]/5' : ''}`}
                  >
                    <td className="p-4" onClick={(e) => e.stopPropagation()}>
                      <input 
                        type="checkbox"
                        checked={selectedIds.includes(product.id)}
                        onChange={() => toggleSelect(product.id)}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 dark:bg-slate-700 flex-shrink-0">
                          <img 
                            src={product.image_url || `https://picsum.photos/seed/${product.id}/100/100`}
                            className="w-full h-full object-cover"
                            alt={product.name}
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 dark:text-white">{product.name}</p>
                          <p className="text-xs text-gray-500 dark:text-slate-400">{product.unit}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-gray-600 dark:text-slate-300">
                        {categories.find((c: any) => c.id === product.category_id)?.name || 'Uncategorized'}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="font-bold text-gray-900 dark:text-white">₹{product.price}</span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${
                          product.stock === 0 ? 'bg-red-500' :
                          product.stock <= 5 ? 'bg-amber-500' :
                          'bg-green-500'
                        }`} />
                        <span className={`font-bold text-sm ${
                          product.stock === 0 ? 'text-red-600 dark:text-red-400' :
                          product.stock <= 5 ? 'text-amber-600 dark:text-amber-400' :
                          'text-green-600 dark:text-green-400'
                        }`}>
                          {product.stock}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                        product.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {product.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end space-x-2">
                        <button 
                          onClick={() => handleEdit(product)}
                          className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteProduct(product.id)}
                          disabled={deletingId === product.id}
                          className={`p-2 rounded-lg transition-all ${confirmDeleteId === product.id ? 'bg-red-600 text-white' : 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'}`}
                        >
                          {deletingId === product.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
                    is_featured: false, is_best_seller: false, sale_price: '', sale_ends_at: ''
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
                      <option key={cat.id} value={cat.id}>{cat.emoji} {cat.name}</option>
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

                <div className="col-span-2 h-px bg-black/5 dark:bg-white/5 my-2" />
                
                <div className="col-span-2">
                  <h4 className="text-sm font-bold text-[#D4820A] uppercase tracking-wider mb-4">Flash Sale Settings</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold mb-1 text-gray-900 dark:text-white">Sale Price (₹)</label>
                      <input 
                        type="number"
                        className="w-full p-3 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#D4820A]/20 transition-colors"
                        placeholder="Optional"
                        value={formData.sale_price}
                        onChange={e => setFormData({...formData, sale_price: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-1 text-gray-900 dark:text-white">Sale Ends At</label>
                      <input 
                        type="datetime-local"
                        className="w-full p-3 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#D4820A]/20 transition-colors"
                        value={formData.sale_ends_at}
                        onChange={e => setFormData({...formData, sale_ends_at: e.target.value})}
                      />
                    </div>
                  </div>
                  {formData.sale_price && formData.price && (
                    <p className="mt-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      Customers will save ₹{(parseFloat(formData.price) - parseFloat(formData.sale_price)).toFixed(2)} ({((1 - parseFloat(formData.sale_price) / parseFloat(formData.price)) * 100).toFixed(0)}% off)
                    </p>
                  )}
                </div>
              </div>

              <div className="pt-6">
                <button 
                  type="submit"
                  className="w-full bg-[#D4820A] text-white py-4 rounded-2xl font-bold text-lg flex items-center justify-center space-x-2 hover:bg-[#B87008] transition-all"
                >
                  <Save className="w-5 h-5" />
                  <span>{editingProduct ? 'Update Product' : 'Add Product'}</span>
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
              <div className="flex items-center space-x-2">
                <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100">Manage Categories</h3>
                <button 
                  onClick={fetchData}
                  className="p-1 text-gray-400 hover:text-[#D4820A] transition-colors"
                  title="Refresh categories"
                >
                  <Loader2 className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
              <button 
                onClick={() => setShowCategoryModal(false)}
                className="p-2 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-gray-900 dark:text-slate-100" />
              </button>
            </div>
            
            <div className="p-6 space-y-6 overflow-y-auto flex-grow">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-700 dark:text-white uppercase tracking-wider">Select Category to Edit/Delete</label>
                  <select 
                    className="w-full p-3 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#D4820A]/20 transition-colors"
                    value={editingCategory?.id || ''}
                    onChange={(e) => {
                      const catId = e.target.value;
                      if (!catId) {
                        setEditingCategory(null);
                        setNewCategoryName('');
                        setNewCategoryEmoji('🌾');
                        return;
                      }
                      const cat = categories.find((c: any) => c.id.toString() === catId);
                      if (cat) {
                        setEditingCategory(cat);
                        setNewCategoryName(cat.name);
                        setNewCategoryEmoji(cat.emoji || '🌾');
                      }
                    }}
                  >
                    <option value="">-- Add New Category --</option>
                    {categories.map((cat: any) => (
                      <option key={cat.id} value={cat.id}>{cat.emoji} {cat.name}</option>
                    ))}
                  </select>
                  {editingCategory && (
                    <button 
                      type="button"
                      onClick={() => {
                        setEditingCategory(null);
                        setNewCategoryName('');
                        setNewCategoryEmoji('🌾');
                      }}
                      className="absolute right-10 top-[38px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                      title="Switch to Add New"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="h-px bg-black/5 dark:bg-white/5 my-4" />

                <form onSubmit={handleAddCategory} className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-bold text-gray-700 dark:text-white uppercase tracking-wider">Category Name</label>
                      <input 
                        type="text"
                        placeholder="e.g. Honey, Spices, Rice"
                        className="w-full p-3 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#D4820A]/20 transition-colors"
                        value={newCategoryName}
                        onChange={e => setNewCategoryName(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-bold text-gray-700 dark:text-white uppercase tracking-wider">Select Emoji</label>
                      <div className="flex space-x-2">
                        <select 
                          className="flex-grow p-3 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#D4820A]/20 transition-colors"
                          value={newCategoryEmoji}
                          onChange={(e) => setNewCategoryEmoji(e.target.value)}
                        >
                          {['🌾', '🍚', '🥦', '🥬', '🥕', '🌶️', '🍎', '🥭', '🍇', '🌽', '🥚', '🥛', '🧀', '🍯', '🥜', '🫘', '🐐', '🐔', '🐓', '🐄', '🐑', '🐖', '🐟', '🦆', '🥩', '🍗', '🍄', '🧺', '🚜', '📦'].map(emoji => (
                            <option key={emoji} value={emoji}>{emoji} {emoji === '🍯' ? '(Honey)' : ''}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                          className="w-14 p-3 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-slate-700 text-center text-2xl outline-none focus:ring-2 focus:ring-[#D4820A]/20 transition-colors hover:bg-gray-50 dark:hover:bg-slate-600"
                        >
                          <Smile className="w-6 h-6 mx-auto text-gray-400" />
                        </button>
                      </div>
                      {showEmojiPicker && (
                        <div className="absolute z-[100] mt-2">
                          <div className="fixed inset-0" onClick={() => setShowEmojiPicker(false)} />
                          <div className="relative">
                            <EmojiPicker 
                              onEmojiClick={(emojiData) => {
                                setNewCategoryEmoji(emojiData.emoji);
                                setShowEmojiPicker(false);
                              }}
                              theme={document.documentElement.classList.contains('dark') ? Theme.DARK : Theme.LIGHT}
                              width={300}
                              height={400}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button 
                      type="submit"
                      disabled={isAddingCategory || isUpdatingCategory}
                      className="flex-grow bg-[#D4820A] text-white py-3 rounded-xl font-bold hover:bg-[#B87008] transition-all disabled:opacity-50 flex items-center justify-center space-x-2 shadow-lg"
                    >
                      {(isAddingCategory || isUpdatingCategory) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      <span>{editingCategory ? 'Update Category' : 'Add Category'}</span>
                    </button>
                    
                    {editingCategory && (
                      <button 
                        type="button"
                        onClick={() => handleDeleteCategory(editingCategory.id)}
                        disabled={deletingCatId === editingCategory.id}
                        className={`px-4 py-3 rounded-xl font-bold transition-all flex items-center justify-center space-x-2 ${confirmDeleteCatId === editingCategory.id ? 'bg-red-600 text-white animate-pulse' : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40'}`}
                      >
                        {deletingCatId === editingCategory.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        <span>{confirmDeleteCatId === editingCategory.id ? 'Confirm' : 'Delete'}</span>
                      </button>
                    )}

                    {editingCategory && (
                      <button 
                        type="button"
                        onClick={() => {
                          setEditingCategory(null);
                          setNewCategoryName('');
                          setNewCategoryEmoji('🌾');
                        }}
                        className="px-4 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-slate-600 transition-all"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Quick Emoji Suggestions</p>
                <div className="flex flex-wrap gap-2">
                  {['🌾', '🍚', '🥦', '🥬', '🥕', '🌶️', '🍎', '🥭', '🍇', '🌽', '🍯', '🥚', '🥛', '🧀', '🥜', '🫘', '🐐', '🐔', '🐄', '🐑', '🐖', '🐟', '🥩', '🍄', '🧺', '🚜'].map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setNewCategoryEmoji(emoji)}
                      className={`w-10 h-10 flex items-center justify-center rounded-lg border transition-all ${newCategoryEmoji === emoji ? 'bg-[#D4820A]/10 border-[#D4820A] scale-110' : 'bg-gray-50 dark:bg-slate-900/50 border-black/5 dark:border-white/5 hover:border-black/20 dark:hover:border-white/20'}`}
                    >
                      <span className="text-xl">{emoji}</span>
                    </button>
                  ))}
                </div>
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
