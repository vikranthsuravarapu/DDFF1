import { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { Search, Filter, Camera, Loader2, X, Sparkles, Plus } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import MiniCart from '../components/MiniCart';
import ComingSoon from '../components/ComingSoon';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { identifyImage } from '../services/geminiService';
import { formatCurrency } from '../utils/format';
import { motion, AnimatePresence } from 'motion/react';

export default function Products() {
  const [searchParams] = useSearchParams();
  const { itemCount } = useCart();
  const { isDeliveryAvailable, isCheckingDelivery, user, apiFetch } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.role === 'delivery_boy') {
      navigate('/delivery');
    }
  }, [user, navigate]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [farmers, setFarmers] = useState([]);
  const [activePromos, setActivePromos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [visualSearchResult, setVisualSearchResult] = useState<string | null>(null);
  const [priceRange, setPriceRange] = useState({ min: 0, max: 2000 });
  const [selectedFarmer, setSelectedFarmer] = useState('');
  const [minRating, setMinRating] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categoryFilter = searchParams.get('category');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      let url = `/api/products?min_price=${priceRange.min}&max_price=${priceRange.max}`;
      if (categoryFilter) url += `&category=${categoryFilter}`;
      if (selectedFarmer) url += `&farmer_id=${selectedFarmer}`;
      if (minRating > 0) url += `&min_rating=${minRating}`;
      
      const [productsRes, categoriesRes, farmersRes] = await Promise.all([
        apiFetch(url),
        apiFetch('/api/categories'),
        apiFetch('/api/farmers')
      ]);

      if (!productsRes.ok || !categoriesRes.ok || !farmersRes.ok) {
        throw new Error('Failed to fetch data from server');
      }

      const [productsData, categoriesData, farmersData] = await Promise.all([
        productsRes.json(),
        categoriesRes.json(),
        farmersRes.json()
      ]);

      setProducts(Array.isArray(productsData) ? productsData : []);
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
      setFarmers(Array.isArray(farmersData) ? farmersData : []);
    } catch (err: any) {
      console.error('Error fetching products:', err);
      setError(err.message || 'An unexpected error occurred while loading products.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [categoryFilter, priceRange, selectedFarmer, minRating]);

  useEffect(() => {
    const fetchPromos = async () => {
      try {
        const res = await apiFetch('/api/promo-codes/active');
        if (res.ok) {
          const data = await res.json();
          setActivePromos(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error('Error fetching active promos:', err);
      }
    };
    fetchPromos();
  }, []);

  const filteredProducts = products.filter((p: any) => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.origin && p.origin.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsIdentifying(true);
    setVisualSearchResult(null);

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      const result = await identifyImage(base64, file.type);
      setVisualSearchResult(result);
      setIsIdentifying(false);
      
      // If identification was successful, try to search for the identified name
      const nameMatch = result?.split('\n')[0].replace(/Identify this|It is|This is|I see/gi, '').trim();
      if (nameMatch && nameMatch.length < 30) {
        setSearchQuery(nameMatch);
      }
    };
    reader.readAsDataURL(file);
  };

  if (isCheckingDelivery) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-[#D4820A] animate-spin" />
      </div>
    );
  }

  if (!isDeliveryAvailable) {
    return <ComingSoon />;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold dark:text-white">Our Store</h1>
          <p className="text-gray-600 dark:text-slate-400">Fresh from the village to your kitchen</p>
        </div>
        
        <div className="relative max-w-md w-full flex items-center space-x-2">
          <div className="relative flex-grow group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-[#D4820A] transition-colors" />
            <input 
              type="text" 
              placeholder="Search products or origin..." 
              className="w-full pl-12 pr-10 py-3 rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#D4820A]/20 transition-colors shadow-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isIdentifying}
            className="p-3 bg-white dark:bg-slate-800 border border-black/5 dark:border-white/10 rounded-2xl text-[#D4820A] hover:bg-[#FDF6EC] dark:hover:bg-slate-700 transition-all shadow-sm disabled:opacity-50"
            title="Search by image"
          >
            {isIdentifying ? <Loader2 className="w-6 h-6 animate-spin" /> : <Camera className="w-6 h-6" />}
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*" 
            onChange={handleImageUpload} 
          />
        </div>
      </div>

      {visualSearchResult && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/30 p-4 rounded-2xl flex items-start space-x-3 relative animate-in fade-in slide-in-from-top-2 transition-colors">
          <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-1 flex-shrink-0" />
          <div className="flex-grow">
            <h4 className="text-sm font-bold text-emerald-800 dark:text-emerald-300">AI Visual Identification</h4>
            <p className="text-sm text-emerald-700 dark:text-emerald-400">{visualSearchResult}</p>
          </div>
          <button onClick={() => setVisualSearchResult(null)} className="text-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-300">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-4 items-start">
        {/* Main Content Area (Filters + Grid) */}
        <div className="flex-grow w-full min-w-0 space-y-6">
          {/* Horizontal Filters Bar */}
          <div className="bg-white/80 dark:bg-[#1a2233]/80 backdrop-blur-md p-2.5 px-4 rounded-2xl border border-black/5 dark:border-white/5 shadow-sm sticky top-24 z-30 transition-colors">
            <div className="flex flex-wrap items-center gap-4 sm:gap-6">
              <div className="flex items-center space-x-2 text-[#D4820A] font-bold">
                <Filter className="w-4 h-4" />
                <span className="text-sm">Filters</span>
              </div>
              
              <div className="flex flex-wrap items-center gap-4 sm:gap-8 flex-grow">
                {/* Category Dropdown */}
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-gray-400">Category:</span>
                  <select 
                    className="bg-transparent text-xs font-bold text-gray-700 dark:text-slate-200 focus:outline-none cursor-pointer"
                    value={categoryFilter || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      navigate(val ? `/products?category=${val}` : '/products');
                    }}
                  >
                    <option value="">All Categories</option>
                    {categories.map((cat: any) => (
                      <option key={cat.id} value={cat.slug}>{cat.emoji} {cat.name}</option>
                    ))}
                  </select>
                </div>

                {/* Price Filter */}
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-gray-400">Price:</span>
                  <select 
                    className="bg-transparent text-xs font-bold text-gray-700 dark:text-slate-200 focus:outline-none cursor-pointer"
                    value={`${priceRange.min}-${priceRange.max}`}
                    onChange={(e) => {
                      const [min, max] = e.target.value.split('-').map(Number);
                      setPriceRange({ min, max });
                    }}
                  >
                    <option value="0-2000">Any Price</option>
                    <option value="0-100">Under {formatCurrency(100)}</option>
                    <option value="100-500">{formatCurrency(100)} - {formatCurrency(500)}</option>
                    <option value="500-2000">Over {formatCurrency(500)}</option>
                  </select>
                </div>
                
                {/* Farmer Filter */}
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-gray-400">Farmer:</span>
                  <select 
                    className="bg-transparent text-xs font-bold text-gray-700 dark:text-slate-200 focus:outline-none cursor-pointer max-w-[120px] truncate"
                    value={selectedFarmer}
                    onChange={(e) => setSelectedFarmer(e.target.value)}
                  >
                    <option value="">All Regions</option>
                    {farmers.map((f: any) => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* More Filters Toggle */}
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className="p-1.5 bg-gray-100 dark:bg-slate-700 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-200 transition-colors"
                title="More filters"
              >
                <Plus className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-45' : ''}`} />
              </button>
            </div>

            {/* Expanded Filters (Mobile or Detailed) */}
            <AnimatePresence>
              {showFilters && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="pt-4 mt-4 border-t border-black/5 dark:border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-wider font-bold text-gray-400">Price Range</label>
                      <div className="flex items-center space-x-2">
                        <input 
                          type="number" 
                          className="w-full p-2 rounded-xl bg-gray-50 dark:bg-slate-900 border border-black/5 dark:border-white/10 text-xs"
                          placeholder="Min"
                          value={priceRange.min}
                          onChange={(e) => setPriceRange({ ...priceRange, min: Number(e.target.value) })}
                        />
                        <input 
                          type="number" 
                          className="w-full p-2 rounded-xl bg-gray-50 dark:bg-slate-900 border border-black/5 dark:border-white/10 text-xs"
                          placeholder="Max"
                          value={priceRange.max}
                          onChange={(e) => setPriceRange({ ...priceRange, max: Number(e.target.value) })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-wider font-bold text-gray-400">Minimum Rating</label>
                      <div className="flex items-center space-x-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => setMinRating(star)}
                            className={`text-lg ${minRating >= star ? 'text-amber-400' : 'text-gray-200 dark:text-slate-700'}`}
                          >
                            ★
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-wider font-bold text-gray-400">All Categories</label>
                      <div className="flex flex-wrap gap-1">
                        {categories.map((cat: any) => (
                          <button
                            key={cat.id}
                            onClick={() => {}} // Handled by Link above, but for UI consistency
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold ${categoryFilter === cat.slug ? 'bg-[#D4820A] text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-500'}`}
                          >
                            {cat.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Active Promos Banner */}
          {activePromos.length > 0 && (
            <div className="flex overflow-x-auto gap-2 pb-2 no-scrollbar scroll-smooth">
              {activePromos.map((promo) => (
                <button
                  key={promo.id}
                  onClick={() => navigate('/offers')}
                  className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 text-amber-800 dark:text-amber-200 rounded-full text-sm font-medium hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors whitespace-nowrap shadow-sm"
                >
                  <span className="text-base">🏷️</span>
                  <span>
                    <span className="font-bold">[{promo.code}]</span> — {promo.description} on {promo.product_name || 'all orders'}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Product Grid */}
          <div className="min-h-[400px]">
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-6">
                {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                  <div key={i} className="bg-white dark:bg-[#1a2233] h-56 sm:h-64 rounded-2xl sm:rounded-[1.5rem] animate-pulse border border-black/5 dark:border-white/5 transition-colors" />
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-3xl border border-red-100 dark:border-red-900/30 transition-colors space-y-4">
                <div className="text-6xl mb-4">⚠️</div>
                <h3 className="text-2xl font-bold text-red-600 dark:text-red-400">Oops! Something went wrong</h3>
                <p className="text-gray-500 dark:text-slate-400 max-w-md mx-auto">{error}</p>
                <button 
                  onClick={fetchData}
                  className="bg-[#D4820A] text-white px-8 py-3 rounded-2xl font-bold hover:bg-[#B87008] transition-all shadow-lg shadow-[#D4820A]/20"
                >
                  Try Again
                </button>
              </div>
            ) : filteredProducts.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-6">
                {filteredProducts.map((product: any) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-3xl border border-black/5 dark:border-white/10 transition-colors">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-2xl font-bold dark:text-white">No products found</h3>
                <p className="text-gray-500 dark:text-slate-400">Try adjusting your search or category filters</p>
              </div>
            )}
          </div>
        </div>

        {/* Sticky Cart Sidebar (Desktop) */}
        <aside className="hidden md:block w-60 lg:w-64 flex-shrink-0 sticky top-24 self-start">
          <div className="flex flex-col h-[calc(100vh-200px)] bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-[32px] border border-black/5 dark:border-white/10 overflow-hidden shadow-2xl shadow-black/5 transition-all hover:shadow-black/10">
            <MiniCart />
          </div>
        </aside>
      </div>
    </div>
  );
}
