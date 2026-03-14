import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Star, MapPin, ShieldCheck, Truck, ShoppingCart, Plus, Minus, Sparkles, Loader2, Languages, BookOpen, MessageSquareText, X, User, Save, Package, Bell, Check } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { formatCurrency } from '../utils/format';
import { generateRecipe, translateText, generateFarmerStory, summarizeReviews } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { items, addItem, updateQuantity, setNotification } = useCart();
  const { isAuthenticated, token, user } = useAuth();
  const { t } = useLanguage();
  const [product, setProduct] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role === 'delivery_boy') {
      navigate('/delivery');
    }
  }, [user, navigate]);

  const cartItem = items.find(i => i.id === Number(id));
  const quantityInCart = cartItem ? cartItem.quantity : 0;
  const isOutOfStock = product?.stock <= 0;

  useEffect(() => {
    if (quantityInCart > 0) {
      setQuantity(quantityInCart);
    }
  }, [quantityInCart]);
  const [recipe, setRecipe] = useState<string | null>(null);
  const [isGeneratingRecipe, setIsGeneratingRecipe] = useState(false);
  const [translatedDescription, setTranslatedDescription] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [farmerStory, setFarmerStory] = useState<string | null>(null);
  const [isGeneratingStory, setIsGeneratingStory] = useState(false);
  const [reviewSummary, setReviewSummary] = useState<string | null>(null);
  const [isSummarizingReviews, setIsSummarizingReviews] = useState(false);
  
  // Review Form State
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [hasAlert, setHasAlert] = useState(false);
  const [alertLoading, setAlertLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState<{h: number, m: number, s: number} | null>(null);

  const isActiveSale = product?.sale_price !== null && product?.sale_ends_at && new Date(product.sale_ends_at) > new Date();
  const displayPrice = isActiveSale ? product.sale_price : product?.price;
  const originalPrice = isActiveSale ? product.price : product?.original_price;

  useEffect(() => {
    if (!isActiveSale || !product?.sale_ends_at) {
      setTimeLeft(null);
      return;
    }

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const end = new Date(product.sale_ends_at).getTime();
      const diff = end - now;

      if (diff <= 0) {
        setTimeLeft(null);
        clearInterval(timer);
        // Optionally refresh data to hide sale UI
        fetchData();
        return;
      }

      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ h, m, s });
    }, 1000);

    return () => clearInterval(timer);
  }, [isActiveSale, product?.sale_ends_at]);

  useEffect(() => {
    if (isAuthenticated && isOutOfStock && id) {
      fetch(`/api/products/${id}/stock-alert`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
        .then(res => res.json())
        .then(data => setHasAlert(data.hasAlert))
        .catch(err => console.error('Error checking stock alert:', err));
    }
  }, [isAuthenticated, isOutOfStock, id, token]);

  const toggleStockAlert = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    setAlertLoading(true);
    try {
      if (hasAlert) {
        const res = await fetch(`/api/products/${id}/stock-alert`, { 
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.ok) {
          setHasAlert(false);
          setNotification('Alert cancelled.');
        }
      } else {
        const res = await fetch(`/api/products/${id}/stock-alert`, { 
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.ok) {
          setHasAlert(true);
          setNotification('We will notify you when back in stock!');
        }
      }
    } catch (err) {
      console.error('Error toggling stock alert:', err);
      setNotification('Failed to update alert.');
    } finally {
      setAlertLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [prodRes, revRes] = await Promise.all([
        fetch(`/api/products/${id}`),
        fetch(`/api/products/${id}/reviews`)
      ]);
      const [prodData, revData] = await Promise.all([prodRes.json(), revRes.json()]);
      setProduct(prodData);
      setReviews(revData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handlePostReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      setNotification('Please login to post a review.');
      return;
    }
    setIsSubmittingReview(true);
    try {
      const res = await fetch(`/api/products/${id}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ rating: newRating, comment: newComment })
      });
      if (res.ok) {
        setNotification('Review posted successfully!');
        setNewComment('');
        fetchData(); // Refresh data
      }
    } catch (e) {
      setNotification('Failed to post review.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleGenerateRecipe = async () => {
    if (!product) return;
    setIsGeneratingRecipe(true);
    const result = await generateRecipe(product.name);
    setRecipe(result || "Failed to generate recipe.");
    setIsGeneratingRecipe(false);
  };

  const handleTranslate = async () => {
    if (!product) return;
    if (translatedDescription) {
      setTranslatedDescription(null);
      return;
    }
    setIsTranslating(true);
    const result = await translateText(product.description, "Telugu");
    setTranslatedDescription(result || "Translation failed.");
    setIsTranslating(false);
  };

  const handleGenerateStory = async () => {
    if (!product) return;
    setIsGeneratingStory(true);
    const result = await generateFarmerStory(product.name, product.origin);
    setFarmerStory(result || "Failed to generate story.");
    setIsGeneratingStory(false);
  };

  const handleSummarizeReviews = async () => {
    if (!product) return;
    setIsSummarizingReviews(true);
    // Use real reviews if available, otherwise mock
    const reviewsToSummarize = reviews.length > 0 ? reviews : [
      { rating: 5, comment: "Absolutely fresh and authentic!" },
      { rating: 4, comment: "Great quality, but delivery took 2 days." },
      { rating: 5, comment: "The aroma is amazing. Highly recommended." }
    ];
    const result = await summarizeReviews(reviewsToSummarize);
    setReviewSummary(result || "Failed to summarize reviews.");
    setIsSummarizingReviews(false);
  };

  if (loading) return <div className="animate-pulse h-96 bg-white dark:bg-slate-800 rounded-3xl transition-colors" />;
  if (!product) return <div className="dark:text-white">Product not found</div>;

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    
    if (quantityInCart > 0) {
      const delta = quantity - quantityInCart;
      updateQuantity(product.id, delta);
      setNotification('Cart updated!');
    } else {
      addItem({ ...product, price: displayPrice }, quantity);
      setNotification('Added to cart!');
    }
  };

  return (
    <div className="space-y-8 pb-24 md:pb-0">
      <button onClick={() => navigate(-1)} className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-[#D4820A] transition-colors">
        <ArrowLeft className="w-5 h-5" />
        <span>{t('back_to_store')}</span>
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* Image Section */}
        <div className="bg-[#F0E6D3] dark:bg-slate-700 rounded-3xl overflow-hidden aspect-square flex items-center justify-center transition-colors relative">
          <img 
            src={product.image_url || `https://picsum.photos/seed/${product.id}/800/800`} 
            alt={product.name}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = `https://picsum.photos/seed/${product.id}/800/800`;
            }}
          />
          {isActiveSale && (
            <div className="absolute top-6 left-6 bg-red-600 text-white px-4 py-2 rounded-xl font-bold text-lg shadow-lg flex items-center space-x-2 animate-bounce">
              <Sparkles className="w-5 h-5" />
              <span>{t('flash_sale')}</span>
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-[#D4820A] font-bold">
              <MapPin className="w-4 h-4" />
              <span className="text-sm uppercase tracking-wider">{product.origin}</span>
            </div>
          <div className="flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              <h1 className="text-4xl font-bold dark:text-white">{product.name}</h1>
              <button 
                onClick={handleTranslate}
                disabled={isTranslating}
                className="flex items-center space-x-1 text-sm font-bold text-[#D4820A] hover:underline disabled:opacity-50"
              >
                <Languages className="w-4 h-4" />
                <span>{isTranslating ? t('translating') : translatedDescription ? t('show_english') : t('translate_to_telugu')}</span>
              </button>
            </div>
            {product.stock > 0 && product.stock <= 5 && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 p-3 rounded-2xl flex items-center space-x-2 text-amber-800 dark:text-amber-300 animate-pulse">
                <Sparkles className="w-5 h-5" />
                <span className="font-bold">{t('hurry_only')} {product.stock} {t('units_left')}</span>
              </div>
            )}
            {product.stock > 5 && product.stock <= 10 && (
              <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800/30 p-3 rounded-2xl flex items-center space-x-2 text-orange-800 dark:text-orange-300">
                <Package className="w-5 h-5" />
                <span className="font-bold">{t('limited_stock')} {product.stock}</span>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-4">
              <div className="flex items-center text-yellow-500">
                <Star className="w-5 h-5 fill-current" />
                <span className="ml-1 font-bold dark:text-white">{product.rating || 4.8}</span>
              </div>
              <span className="text-gray-400 dark:text-slate-400">({product.review_count || 12} {t('customer_reviews')})</span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <span className={`text-3xl font-bold ${isActiveSale ? 'text-red-600' : 'text-[#D4820A]'}`}>
              {formatCurrency(displayPrice)}
            </span>
            {originalPrice && (
              <span className="text-xl text-gray-400 dark:text-slate-500 line-through">
                {formatCurrency(originalPrice)}
              </span>
            )}
            <span className={`${isOutOfStock ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'} px-3 py-1 rounded-full text-sm font-bold transition-colors`}>
              {isOutOfStock ? t('out_of_stock') : t('in_stock')}
            </span>
          </div>

          {timeLeft && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30 p-4 rounded-2xl flex items-center justify-between">
              <div className="flex items-center space-x-2 text-red-700 dark:text-red-400 font-bold">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>{t('sale_ends_in')}</span>
              </div>
              <div className="flex space-x-2">
                {[
                  { label: 'H', value: timeLeft.h },
                  { label: 'M', value: timeLeft.m },
                  { label: 'S', value: timeLeft.s }
                ].map((unit, idx) => (
                  <div key={idx} className="flex flex-col items-center">
                    <div className="bg-red-600 text-white w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg">
                      {unit.value.toString().padStart(2, '0')}
                    </div>
                    <span className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase mt-1">{unit.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-gray-600 dark:text-slate-300 leading-relaxed text-lg">
            {translatedDescription || product.description}
          </p>

          {/* Farmer Info Card */}
          {product.farmer_id && (
            <Link to={`/farmer/${product.farmer_id}`} className="block group">
              <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded-2xl border border-black/5 dark:border-white/10 flex items-center space-x-4 group-hover:bg-gray-100 dark:hover:bg-slate-700 transition-all">
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-200 dark:bg-slate-700">
                  <img src={product.farmer_image || `https://picsum.photos/seed/farmer${product.farmer_id}/100/100`} alt={product.farmer_name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-grow">
                  <p className="text-xs text-gray-500 dark:text-slate-400 font-bold uppercase tracking-wider">{t('grown_by')}</p>
                  <p className="font-bold text-lg dark:text-white group-hover:text-[#D4820A] transition-colors">{product.farmer_name}</p>
                  <p className="text-xs text-gray-400 dark:text-slate-500 flex items-center">
                    <MapPin className="w-3 h-3 mr-1" />
                    {product.farmer_location}
                  </p>
                </div>
                <ArrowLeft className="w-5 h-5 text-gray-400 dark:text-gray-600 rotate-180 group-hover:text-[#D4820A] transition-all" />
              </div>
            </Link>
          )}

          <div className="grid grid-cols-2 gap-4 py-6 border-y border-black/5 dark:border-white/5">
            <div className="flex items-center space-x-3 dark:text-gray-300">
              <ShieldCheck className="text-[#D4820A]" />
              <span className="text-sm font-medium">100% Organic</span>
            </div>
            <div className="flex items-center space-x-3 dark:text-gray-300">
              <Truck className="text-[#D4820A]" />
              <span className="text-sm font-medium">Fast Delivery</span>
            </div>
          </div>

          <div className="space-y-4 pt-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center border border-black/10 dark:border-white/10 rounded-2xl p-1 bg-white dark:bg-slate-800 transition-colors">
                <button 
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl transition-colors dark:text-slate-100"
                >
                  <Minus className="w-5 h-5" />
                </button>
                <span className="w-12 text-center font-bold text-xl dark:text-white">{quantity}</span>
                <button 
                  onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl transition-colors dark:text-slate-100"
                  disabled={quantity >= product.stock}
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              <span className="text-gray-500 dark:text-slate-400 font-medium">{product.unit}</span>
            </div>

            <button 
              onClick={isOutOfStock ? toggleStockAlert : handleAddToCart}
              disabled={alertLoading}
              className={`w-full ${isOutOfStock ? (hasAlert ? 'bg-emerald-600' : 'bg-[#D4820A]') : 'bg-[#D4820A] hover:bg-[#B87008] shadow-[#D4820A]/20'} text-white py-4 rounded-2xl font-bold text-lg flex items-center justify-center space-x-3 transition-all shadow-xl disabled:opacity-50`}
            >
              {isOutOfStock ? (
                hasAlert ? (
                  <>
                    <Check className="w-6 h-6" />
                    <span>{t('well_notify_you')}</span>
                  </>
                ) : (
                  <>
                    <Bell className="w-6 h-6" />
                    <span>{t('notify_me_available')}</span>
                  </>
                )
              ) : (
                <>
                  <ShoppingCart className="w-6 h-6" />
                  <span>
                    {quantityInCart > 0 
                      ? `${t('update_cart')} • ${formatCurrency(displayPrice * quantity)}` 
                      : `${t('add_to_cart')} • ${formatCurrency(displayPrice * quantity)}`}
                  </span>
                </>
              )}
            </button>

            {isOutOfStock && hasAlert && (
              <button 
                onClick={toggleStockAlert}
                disabled={alertLoading}
                className="w-full text-sm text-gray-500 hover:text-red-500 font-bold flex items-center justify-center space-x-1 py-2"
              >
                <X className="w-4 h-4" />
                <span>{t('cancel_alert')}</span>
              </button>
            )}

            {/* AI Features Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 border-t border-black/5 dark:border-white/5">
              {/* Farmer Story */}
              <div className="space-y-3">
                {!farmerStory ? (
                  <button 
                    onClick={handleGenerateStory}
                    disabled={isGeneratingStory}
                    className="w-full flex items-center justify-center space-x-2 p-3 border border-black/10 dark:border-white/10 rounded-2xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors text-sm font-bold dark:text-gray-300"
                  >
                    {isGeneratingStory ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookOpen className="w-4 h-4" />}
                    <span>{t('read_farmer_story')}</span>
                  </button>
                ) : (
                  <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-2xl border border-orange-100 dark:border-orange-800/30 relative transition-colors">
                    <button onClick={() => setFarmerStory(null)} className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"><X className="w-4 h-4" /></button>
                    <h4 className="text-xs font-bold text-orange-800 dark:text-orange-300 uppercase tracking-widest mb-2">{t('farmers_journey')}</h4>
                    <p className="text-sm text-gray-700 dark:text-slate-300 italic leading-relaxed">"{farmerStory}"</p>
                  </div>
                )}
              </div>

              {/* Review Summary */}
              <div className="space-y-3">
                {!reviewSummary ? (
                  <button 
                    onClick={handleSummarizeReviews}
                    disabled={isSummarizingReviews}
                    className="w-full flex items-center justify-center space-x-2 p-3 border border-black/10 dark:border-white/10 rounded-2xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors text-sm font-bold dark:text-gray-300"
                  >
                    {isSummarizingReviews ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquareText className="w-4 h-4" />}
                    <span>{t('ai_review_summary')}</span>
                  </button>
                ) : (
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-800/30 relative transition-colors">
                    <button onClick={() => setReviewSummary(null)} className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"><X className="w-4 h-4" /></button>
                    <h4 className="text-xs font-bold text-blue-800 dark:text-blue-300 uppercase tracking-widest mb-2">{t('ai_review_insights')}</h4>
                    <div className="prose prose-sm max-w-none prose-p:text-gray-700 dark:prose-p:text-slate-300 prose-li:text-gray-700 dark:prose-li:text-slate-300 prose-headings:text-blue-900 dark:prose-headings:text-blue-200">
                      <ReactMarkdown>{reviewSummary}</ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* AI Recipe Feature */}
            <div className="pt-6 border-t border-black/5 dark:border-white/5">
              {!recipe ? (
                <button 
                  onClick={handleGenerateRecipe}
                  disabled={isGeneratingRecipe}
                  className="w-full bg-white dark:bg-slate-800 border-2 border-[#D4820A] text-[#D4820A] py-3 rounded-2xl font-bold flex items-center justify-center space-x-2 hover:bg-[#FDF6EC] dark:hover:bg-slate-700 transition-all disabled:opacity-50"
                >
                  {isGeneratingRecipe ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>{t('generating_recipe')}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      <span>{t('get_ai_recipe')}</span>
                    </>
                  )}
                </button>
              ) : (
                <div className="bg-[#FDF6EC] dark:bg-slate-900/50 p-6 rounded-3xl border border-[#D4820A]/20 space-y-4 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-[#D4820A] font-bold">
                      <Sparkles className="w-5 h-5" />
                      <span>{t('village_recipe')}</span>
                    </div>
                    <button 
                      onClick={() => setRecipe(null)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-sm font-medium"
                    >
                      {t('close')}
                    </button>
                  </div>
                  <div className="prose prose-sm max-w-none prose-headings:text-[#3B2A1A] dark:prose-headings:text-white prose-p:text-gray-600 dark:prose-p:text-slate-300 prose-li:text-gray-600 dark:prose-li:text-slate-300">
                    <ReactMarkdown>{recipe}</ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Reviews Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 pt-12 border-t border-black/5 dark:border-white/5">
        <div className="lg:col-span-2 space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold dark:text-white">{t('customer_reviews')} ({reviews.length})</h2>
            <div className="flex items-center space-x-2">
              <div className="flex text-yellow-500">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className={`w-5 h-5 ${i < Math.round(Number(product.rating) || 4.5) ? 'fill-current' : ''}`} />
                ))}
              </div>
              <span className="font-bold dark:text-white">{Number(product.rating || 4.5).toFixed(1)}</span>
            </div>
          </div>

          <div className="space-y-6">
            {reviews.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 dark:bg-slate-800/50 rounded-3xl border border-dashed border-black/10 dark:border-white/10 transition-colors">
                <MessageSquareText className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">{t('no_reviews_yet')}</p>
              </div>
            ) : (
              reviews.map((review) => (
                <div key={review.id} className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-black/5 dark:border-white/10 space-y-3 transition-colors">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center font-bold text-[#D4820A] transition-colors">
                        {review.user_name[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold dark:text-white">{review.user_name}</p>
                        <p className="text-xs text-gray-400 dark:text-slate-500">{new Date(review.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex text-yellow-500">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`w-4 h-4 ${i < review.rating ? 'fill-current' : ''}`} />
                      ))}
                    </div>
                  </div>
                  <p className="text-gray-600 dark:text-slate-300">{review.comment}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Post Review Form */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-black/5 dark:border-white/10 shadow-sm space-y-6 sticky top-24 transition-colors">
            <h3 className="text-xl font-bold dark:text-white">{t('write_review')}</h3>
            {isAuthenticated ? (
              <form onSubmit={handlePostReview} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold mb-2 dark:text-white">{t('rating')}</label>
                  <div className="flex space-x-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setNewRating(star)}
                        className={`p-1 transition-colors ${star <= newRating ? 'text-yellow-500' : 'text-gray-200 dark:text-gray-700'}`}
                      >
                        <Star className={`w-8 h-8 ${star <= newRating ? 'fill-current' : ''}`} />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2 dark:text-white">{t('comment')}</label>
                  <textarea
                    required
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder={t('tell_us_think')}
                    className="w-full p-4 rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-slate-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#D4820A]/20 h-32 resize-none transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmittingReview}
                  className="w-full bg-[#D4820A] text-white py-3 rounded-2xl font-bold hover:bg-[#B87008] transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  {isSubmittingReview ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  <span>{t('post_review')}</span>
                </button>
              </form>
            ) : (
              <div className="text-center py-6 space-y-4">
                <User className="w-12 h-12 text-gray-200 dark:text-gray-700 mx-auto" />
                <p className="text-gray-500 dark:text-gray-400 text-sm">{t('must_login_review')}</p>
                <Link to="/login" className="block w-full bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 py-3 rounded-2xl font-bold hover:bg-gray-200 dark:hover:bg-slate-600 transition-all">
                  {t('login_to_review')}
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sticky Mobile Add to Cart */}
      {!isOutOfStock && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg border-t border-black/5 dark:border-white/10 md:hidden z-40 flex items-center justify-between gap-4 animate-in slide-in-from-bottom duration-300">
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">{t('total_price')}</span>
            <span className="text-xl font-bold text-[#D4820A]">{formatCurrency(displayPrice * quantity)}</span>
          </div>
          <button 
            onClick={handleAddToCart}
            className="flex-grow bg-[#D4820A] text-white py-3 px-6 rounded-xl font-bold flex items-center justify-center space-x-2 shadow-lg shadow-[#D4820A]/20"
          >
            <ShoppingCart className="w-5 h-5" />
            <span>{quantityInCart > 0 ? t('update_cart') : t('add_to_cart')}</span>
          </button>
        </div>
      )}
    </div>
  );
}
