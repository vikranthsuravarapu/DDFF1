import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Star, ShieldCheck, Truck, Clock, Loader2, Gift, ShoppingCart, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import ProductCard from '../components/ProductCard';
import ComingSoon from '../components/ComingSoon';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useCart } from '../contexts/CartContext';

export default function Home() {
  const { t } = useLanguage();
  const { addItem } = useCart();
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [flashSales, setFlashSales] = useState([]);
  const [bundles, setBundles] = useState<any[]>([]);
  const [categories, setCategories] = useState([]);
  const [activePromos, setActivePromos] = useState<any[]>([]);
  const { isDeliveryAvailable, isCheckingDelivery, user, apiFetch } = useAuth();
  const navigate = useNavigate();
  const [addingBundleId, setAddingBundleId] = useState<number | null>(null);

  useEffect(() => {
    if (user?.role === 'delivery_boy') {
      navigate('/delivery');
    }
  }, [user, navigate]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productsRes, flashRes, categoriesRes, bundlesRes] = await Promise.all([
          apiFetch('/api/products?featured=1'),
          apiFetch('/api/products/flash-sales'),
          apiFetch('/api/categories'),
          apiFetch('/api/bundles')
        ]);
        const [productsData, flashData, categoriesData, bundlesData] = await Promise.all([
          productsRes.json(),
          flashRes.json(),
          categoriesRes.json(),
          bundlesRes.json()
        ]);
        setFeaturedProducts(Array.isArray(productsData) ? productsData : []);
        setFlashSales(Array.isArray(flashData) ? flashData : []);
        setCategories(Array.isArray(categoriesData) ? categoriesData : []);
        setBundles(Array.isArray(bundlesData) ? bundlesData : []);
      } catch (error) {
        console.error('Error fetching home data:', error);
      }
    };
    fetchData();
  }, []);

  const handleAddBundle = async (bundle: any) => {
    setAddingBundleId(bundle.id);
    for (const item of bundle.items) {
      addItem({
        id: item.product_id,
        name: item.name,
        price: item.price,
        image_url: item.image_url,
        unit: item.unit
      }, item.quantity);
    }
    setTimeout(() => setAddingBundleId(null), 2000);
  };

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
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="relative h-[500px] rounded-3xl overflow-hidden bg-gradient-to-br from-[#3B2A1A] to-[#4A3624] text-white flex items-center">
        <div className="absolute inset-0 opacity-20">
          <img 
            src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1920&q=80" 
            className="w-full h-full object-cover"
            alt="Farm background"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="relative z-10 px-8 md:px-16 max-w-2xl space-y-6">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-bold leading-tight"
          >
            {t('hero_title').split('Farmer')[0]} <span className="text-[#D4820A]">{t('hero_title').includes('Farmer') ? 'Farmer' : 'రైతు'}</span>
          </motion.h1>
          <p className="text-lg text-white/80">
            {t('hero_desc')}
          </p>
          <div className="flex space-x-4">
            <Link to="/products" className="bg-[#D4820A] text-white px-8 py-4 rounded-full font-bold flex items-center space-x-2 hover:bg-[#B87008] transition-all">
              <span>{t('shop_now')}</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Flash Sales Section */}
      {flashSales.length > 0 && (
        <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex justify-between items-end">
            <div>
              <div className="flex items-center space-x-2 text-red-600 mb-1">
                <Clock className="w-5 h-5 animate-pulse" />
                <span className="text-sm font-black uppercase tracking-widest">{t('limited_time_offers')}</span>
              </div>
              <h2 className="text-3xl font-bold dark:text-white">⚡ {t('flash_sales')}</h2>
              <p className="text-gray-600 dark:text-slate-400">{t('flash_sales_desc')}</p>
            </div>
            <Link to="/products" className="text-[#D4820A] font-bold flex items-center space-x-1">
              <span>{t('view_all_deals')}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="flex overflow-x-auto gap-6 pb-6 no-scrollbar scroll-smooth">
            {flashSales.map((product: any) => (
              <div key={product.id} className="w-[280px] sm:w-[320px] flex-shrink-0">
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Value Combos Section */}
      {bundles.length > 0 && (
        <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex justify-between items-end">
            <div>
              <div className="flex items-center space-x-2 text-[#D4820A] mb-1">
                <Gift className="w-5 h-5" />
                <span className="text-sm font-black uppercase tracking-widest">Special Offers</span>
              </div>
              <h2 className="text-3xl font-bold dark:text-white">🎁 Value Combos</h2>
              <p className="text-gray-600 dark:text-slate-400">Save more with our curated product bundles</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {bundles.map((bundle) => (
              <motion.div
                key={bundle.id}
                whileHover={{ y: -5 }}
                className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-black/5 dark:border-white/10 shadow-xl overflow-hidden flex flex-col sm:flex-row group"
              >
                <div className="sm:w-2/5 relative overflow-hidden">
                  <img 
                    src={bundle.image_url} 
                    alt={bundle.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-4 left-4 bg-emerald-500 text-white px-4 py-2 rounded-2xl font-black text-sm shadow-lg">
                    SAVE ₹{(Number(bundle.original_total) - Number(bundle.bundle_price)).toFixed(0)}
                  </div>
                </div>
                
                <div className="sm:w-3/5 p-8 flex flex-col justify-between space-y-6">
                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-slate-100">{bundle.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-slate-400 line-clamp-2">{bundle.description}</p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {bundle.items.map((item: any, idx: number) => (
                        <div key={idx} className="flex items-center space-x-2 bg-gray-50 dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-black/5 dark:border-white/5">
                          <img src={item.image_url} alt={item.name} className="w-5 h-5 rounded-md object-cover" />
                          <span className="text-[10px] font-bold text-gray-600 dark:text-slate-300">
                            {item.quantity}x {item.name}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-black/5 dark:border-white/5">
                      <div className="space-y-1">
                        <p className="text-xs text-gray-400 line-through font-medium">₹{Number(bundle.original_total).toFixed(2)}</p>
                        <p className="text-3xl font-black text-[#D4820A]">₹{Number(bundle.bundle_price).toFixed(2)}</p>
                      </div>
                      <button
                        onClick={() => handleAddBundle(bundle)}
                        disabled={addingBundleId === bundle.id}
                        className={`p-4 rounded-2xl shadow-xl transition-all active:scale-95 ${
                          addingBundleId === bundle.id 
                            ? 'bg-emerald-500 text-white' 
                            : 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:opacity-90'
                        }`}
                      >
                        {addingBundleId === bundle.id ? (
                          <CheckCircle2 className="w-6 h-6" />
                        ) : (
                          <ShoppingCart className="w-6 h-6" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Active Promos Banner */}
      {activePromos.length > 0 && (
        <div className="flex overflow-x-auto gap-2 pb-2 no-scrollbar scroll-smooth -mt-8">
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

      {/* Categories */}
      <section className="space-y-8">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-bold dark:text-white">{t('shop_by_category')}</h2>
            <p className="text-gray-600 dark:text-slate-400">{t('explore_collections')}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          {categories.map((cat: any) => (
            <Link 
              key={cat.id} 
              to={`/products?category=${cat.slug}`}
              className="bg-white dark:bg-slate-900 p-6 rounded-2xl text-center hover:shadow-xl hover:scale-[1.05] hover:border-[#D4820A]/20 transition-all border border-black/5 dark:border-white/10 group"
            >
              <span className="text-4xl block mb-2 group-hover:scale-110 transition-transform duration-300">{cat.emoji}</span>
              <span className="font-bold text-gray-900 dark:text-white group-hover:text-[#D4820A] transition-colors">{cat.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Products */}
      <section className="space-y-8">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-bold dark:text-white">{t('featured_products')}</h2>
            <p className="text-gray-600 dark:text-slate-400">{t('handpicked_week')}</p>
          </div>
          <Link to="/products" className="text-[#D4820A] font-bold flex items-center space-x-1">
            <span>{t('view_all')}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
          {featuredProducts.map((product: any) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8 py-12 border-y border-black/5 dark:border-white/5">
        <div className="flex items-start space-x-4">
          <div className="bg-[#D4820A]/10 p-3 rounded-2xl text-[#D4820A]">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <h3 className="font-bold text-xl dark:text-white">{t('organic_title')}</h3>
            <p className="text-gray-600 dark:text-slate-400">{t('organic_desc')}</p>
          </div>
        </div>
        <div className="flex items-start space-x-4">
          <div className="bg-[#D4820A]/10 p-3 rounded-2xl text-[#D4820A]">
            <Truck className="w-8 h-8" />
          </div>
          <div>
            <h3 className="font-bold text-xl dark:text-white">{t('fast_delivery_title')}</h3>
            <p className="text-gray-600 dark:text-slate-400">{t('fast_delivery_desc')}</p>
          </div>
        </div>
        <div className="flex items-start space-x-4">
          <div className="bg-[#D4820A]/10 p-3 rounded-2xl text-[#D4820A]">
            <Clock className="w-8 h-8" />
          </div>
          <div>
            <h3 className="font-bold text-xl dark:text-white">{t('fresh_stock_title')}</h3>
            <p className="text-gray-600 dark:text-slate-400">{t('fresh_stock_desc')}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
