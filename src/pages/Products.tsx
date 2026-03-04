import { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, Filter, Camera, Loader2, X, Sparkles } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import { identifyImage } from '../services/geminiService';

export default function Products() {
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [farmers, setFarmers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [visualSearchResult, setVisualSearchResult] = useState<string | null>(null);
  const [priceRange, setPriceRange] = useState({ min: 0, max: 2000 });
  const [selectedFarmer, setSelectedFarmer] = useState('');
  const [minRating, setMinRating] = useState(0);
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
        fetch(url),
        fetch('/api/categories'),
        fetch('/api/farmers')
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

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar Filters */}
        <aside className="w-full md:w-64 space-y-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-black/5 dark:border-white/10 space-y-6 transition-colors">
            <div className="flex items-center space-x-2 font-bold text-lg text-gray-900 dark:text-white">
              <Filter className="w-5 h-5" />
              <span>Filters</span>
            </div>

            {/* Price Range */}
            <div className="space-y-3">
              <label className="text-sm font-bold text-gray-700 dark:text-white">Price Range (₹)</label>
              <div className="flex items-center space-x-2">
                <input 
                  type="number" 
                  placeholder="Min"
                  className="w-full p-2 rounded-xl border border-black/5 dark:border-white/10 bg-gray-50 dark:bg-slate-900 text-sm text-slate-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500"
                  value={priceRange.min}
                  onChange={(e) => setPriceRange({ ...priceRange, min: Number(e.target.value) })}
                />
                <span className="text-gray-400 dark:text-slate-500">-</span>
                <input 
                  type="number" 
                  placeholder="Max"
                  className="w-full p-2 rounded-xl border border-black/5 dark:border-white/10 bg-gray-50 dark:bg-slate-900 text-sm text-slate-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500"
                  value={priceRange.max}
                  onChange={(e) => setPriceRange({ ...priceRange, max: Number(e.target.value) })}
                />
              </div>
            </div>

            {/* Farmer Filter */}
            <div className="space-y-3">
              <label className="text-sm font-bold text-gray-700 dark:text-white">Farmer Origin</label>
              <select 
                className="w-full p-2 rounded-xl border border-black/5 dark:border-white/10 bg-gray-50 dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100"
                value={selectedFarmer}
                onChange={(e) => setSelectedFarmer(e.target.value)}
              >
                <option value="">All Farmers</option>
                {farmers.map((f: any) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>

            {/* Rating Filter */}
            <div className="space-y-3">
              <label className="text-sm font-bold text-gray-700 dark:text-white">Minimum Rating</label>
              <div className="flex items-center space-x-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setMinRating(star)}
                    className={`text-xl transition-colors ${minRating >= star ? 'text-amber-400' : 'text-gray-300 dark:text-slate-600'}`}
                  >
                    ★
                  </button>
                ))}
                {minRating > 0 && (
                  <button onClick={() => setMinRating(0)} className="text-xs text-gray-400 dark:text-slate-500 hover:text-red-500">Clear</button>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-black/5 dark:border-white/10 space-y-4">
              <div className="font-bold text-sm text-gray-700 dark:text-white">Categories</div>
              <div className="space-y-2">
                <Link 
                  to="/products" 
                  className={`block px-4 py-2 rounded-xl transition-colors text-sm font-medium ${!categoryFilter ? 'bg-[#D4820A] text-white' : 'text-gray-600 dark:text-slate-300 hover:bg-[#F0E6D3] dark:hover:bg-slate-700'}`}
                >
                  All Products
                </Link>
                {categories.map((cat: any) => (
                  <Link 
                    key={cat.id} 
                    to={`/products?category=${cat.slug}`}
                    className={`block px-4 py-2 rounded-xl transition-colors text-sm font-medium ${categoryFilter === cat.slug ? 'bg-[#D4820A] text-white' : 'text-gray-600 dark:text-slate-300 hover:bg-[#F0E6D3] dark:hover:bg-slate-700'}`}
                  >
                    <span className="mr-2">{cat.emoji}</span>
                    {cat.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Product Grid */}
        <div className="flex-grow">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="bg-white dark:bg-slate-800 h-80 rounded-2xl animate-pulse border border-black/5 dark:border-white/10 transition-colors" />
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
    </div>
  );
}
