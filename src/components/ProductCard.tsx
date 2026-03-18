import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Minus, Heart, MapPin, Bell, Check, X as CloseIcon } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { useWishlist } from '../contexts/WishlistContext';
import { formatCurrency } from '../utils/format';

const ProductCard: React.FC<{ product: any, onWishlistUpdate?: () => void }> = ({ product, onWishlistUpdate }) => {
  const { items, addItem, updateQuantity } = useCart();
  const { isAuthenticated, apiFetch } = useAuth();
  const { isInWishlist, toggleWishlist: toggleWishlistInContext } = useWishlist();
  const navigate = useNavigate();

  const [hasAlert, setHasAlert] = useState(false);
  const [alertLoading, setAlertLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string | null>(null);

  const isActiveSale = product.sale_price !== null && product.sale_ends_at && new Date(product.sale_ends_at) > new Date();
  const displayPrice = isActiveSale ? product.sale_price : product.price;
  const originalPrice = isActiveSale ? product.price : product.original_price;

  useEffect(() => {
    if (!isActiveSale) {
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
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    }, 1000);

    return () => clearInterval(timer);
  }, [product.sale_ends_at, isActiveSale]);

  const cartItem = items.find(i => i.id === product.id);
  const quantityInCart = cartItem ? cartItem.quantity : 0;

  const isCurrentlyInWishlist = isInWishlist(product.id);

  const toggleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) return;

    await toggleWishlistInContext(product);
    if (onWishlistUpdate) onWishlistUpdate();
  };

  const discount = originalPrice 
    ? Math.round(((originalPrice - displayPrice) / originalPrice) * 100) 
    : 0;

  const isOutOfStock = product.stock <= 0;

  useEffect(() => {
    if (isAuthenticated && isOutOfStock) {
      apiFetch(`/api/products/${product.id}/stock-alert`)
        .then(res => res.json())
        .then(data => setHasAlert(data.hasAlert))
        .catch(err => console.error('Error checking stock alert:', err));
    }
  }, [isAuthenticated, isOutOfStock, product.id, apiFetch]);

  const toggleStockAlert = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    setAlertLoading(true);
    try {
      if (hasAlert) {
        const res = await apiFetch(`/api/products/${product.id}/stock-alert`, { 
          method: 'DELETE'
        });
        if (res.ok) setHasAlert(false);
      } else {
        const res = await apiFetch(`/api/products/${product.id}/stock-alert`, { 
          method: 'POST'
        });
        if (res.ok) setHasAlert(true);
      }
    } catch (err) {
      console.error('Error toggling stock alert:', err);
    } finally {
      setAlertLoading(false);
    }
  };

  return (
    <div className={`bg-white dark:bg-[#1a2233] rounded-2xl sm:rounded-[1.5rem] border border-black/5 dark:border-white/5 hover:border-[#D4820A]/30 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 group flex flex-col h-full ${isOutOfStock ? 'opacity-75' : ''}`}>
      <div className="relative aspect-[4/3] sm:aspect-[4/3] bg-[#F0E6D3] dark:bg-[#242f45] flex items-center justify-center overflow-hidden rounded-t-2xl sm:rounded-t-[1.5rem] transition-colors">
        <Link to={`/products/${product.id}`} className="w-full h-full">
          <img 
            src={product.image_url || `https://picsum.photos/seed/${product.id}/400/400`} 
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
            referrerPolicy="no-referrer"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = `https://picsum.photos/seed/${product.id}/400/400`;
            }}
          />
          {isOutOfStock && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
              <span className="bg-white text-black px-4 py-2 rounded-xl font-bold text-sm uppercase tracking-wider">
                Out of Stock
              </span>
            </div>
          )}
          {product.stock > 0 && product.stock <= 5 && (
            <div className="absolute top-4 right-14 z-10">
              <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow-lg animate-pulse">
                Only {product.stock} left!
              </span>
            </div>
          )}
          {isActiveSale && (
            <div className="absolute top-4 left-4 z-10 flex flex-col gap-1">
              <span className="bg-red-600 text-white text-[10px] font-black px-3 py-1.5 rounded-xl shadow-lg flex items-center gap-1">
                🔥 SALE
              </span>
              {timeLeft && (
                <span className="bg-black/80 backdrop-blur-sm text-white text-[9px] font-bold px-2 py-1 rounded-lg">
                  Ends: {timeLeft}
                </span>
              )}
            </div>
          )}
          {discount > 0 && !isOutOfStock && !isActiveSale && (
            <span className="absolute top-4 left-4 bg-[#E74C3C] text-white text-[11px] font-black px-3 py-1.5 rounded-xl shadow-lg">
              {discount}% OFF
            </span>
          )}
        </Link>
        <button 
          onClick={toggleWishlist}
          className={`absolute top-4 right-4 p-2.5 backdrop-blur-md rounded-full transition-all z-10 ${isCurrentlyInWishlist ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'bg-white/90 dark:bg-slate-800/90 text-gray-400 hover:text-red-500 shadow-lg'}`}
        >
          <Heart className={`w-5 h-5 ${isCurrentlyInWishlist ? 'fill-current' : ''}`} />
        </button>
        <div className="absolute bottom-4 left-4 bg-[#1a2233]/90 backdrop-blur-md px-3 py-1.5 rounded-xl flex items-center space-x-1.5 text-[11px] font-bold text-white shadow-lg transition-colors border border-white/10">
          <MapPin className="w-3.5 h-3.5" />
          <span>{product.origin}</span>
        </div>
      </div>

      <div className="p-3 sm:p-4 flex flex-col flex-grow">
        <div className="flex-grow space-y-0.5 sm:space-y-0.5">
          <h3 className="font-bold text-xs sm:text-lg group-hover:text-[#F39C12] transition-colors text-gray-900 dark:text-white line-clamp-1 sm:line-clamp-1 leading-tight">{product.name}</h3>
          {product.farmer_name && (
            <Link 
              to={`/farmer/${product.farmer_id}`}
              className="block text-[8px] sm:text-[10px] text-[#D4820A] font-black uppercase tracking-widest hover:text-[#F39C12] transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              BY {product.farmer_name}
            </Link>
          )}
          <p className="text-gray-500 dark:text-slate-400 text-[9px] sm:text-xs font-medium">{product.unit}</p>
        </div>
        
        <div className="flex items-center justify-between mt-1 sm:mt-3">
          <div className="flex flex-col">
            <div className="flex items-baseline space-x-1 sm:space-x-1.5">
              <span className={`text-sm sm:text-xl font-black ${isActiveSale ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>{formatCurrency(displayPrice)}</span>
            </div>
            {originalPrice && (
              <span className="text-gray-400 dark:text-slate-500 line-through text-[8px] sm:text-[10px] font-medium">{formatCurrency(originalPrice)}</span>
            )}
            {product.stock > 5 && product.stock <= 10 && (
              <span className="text-[8px] sm:text-[10px] font-bold text-orange-500 uppercase tracking-wider mt-0.5">Limited Stock</span>
            )}
          </div>

          <div className="flex-shrink-0">
            {isOutOfStock ? (
              <div className="flex flex-col items-end">
                {hasAlert ? (
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-bold text-emerald-600 flex items-center">
                      <Check className="w-3 h-3 mr-1" />
                      We'll notify you!
                    </span>
                    <button 
                      onClick={toggleStockAlert}
                      disabled={alertLoading}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full text-gray-400 hover:text-red-500 transition-colors"
                      title="Cancel Alert"
                    >
                      <CloseIcon className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={toggleStockAlert}
                    disabled={alertLoading}
                    className="flex items-center space-x-1.5 bg-[#D4820A] hover:bg-[#F39C12] text-white px-3 py-2 rounded-xl text-[10px] font-bold shadow-lg shadow-[#D4820A]/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                  >
                    <Bell className="w-3.5 h-3.5" />
                    <span>Notify Me</span>
                  </button>
                )}
              </div>
            ) : quantityInCart > 0 ? (
              <div className="flex items-center bg-gray-100 dark:bg-slate-800 rounded-lg sm:rounded-xl p-0.5 sm:p-0.5 shadow-inner border border-black/5 dark:border-white/5">
                <button 
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); updateQuantity(product.id, -1); }}
                  className="p-0.5 sm:p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-md sm:rounded-lg transition-colors text-gray-600 dark:text-gray-300"
                >
                  <span className="sr-only">Decrease</span>
                  <Minus className="w-2.5 h-2.5 sm:w-3.5 h-3.5" />
                </button>
                <span className="w-4 sm:w-6 text-center font-black text-[10px] sm:text-xs text-gray-900 dark:text-white">{quantityInCart}</span>
                <button 
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); updateQuantity(product.id, 1); }}
                  className="p-0.5 sm:p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-md sm:rounded-lg transition-colors text-[#D4820A]"
                >
                  <span className="sr-only">Increase</span>
                  <Plus className="w-2.5 h-2.5 sm:w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button 
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); !isOutOfStock && addItem({...product, price: displayPrice}); }}
                disabled={isOutOfStock}
                className={`${isOutOfStock ? 'bg-gray-400 cursor-not-allowed px-2 py-2 sm:px-4 sm:py-2.5 text-[8px] sm:text-[10px] font-bold' : 'bg-[#D4820A] hover:bg-[#F39C12] shadow-lg shadow-[#D4820A]/30 p-1.5 sm:p-2.5'} text-white rounded-lg sm:rounded-xl transition-all hover:scale-110 active:scale-95`}
              >
                {isOutOfStock ? 'Out of Stock' : <Plus className="w-4 h-4 sm:w-5 h-5" />}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
