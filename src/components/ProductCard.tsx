import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Minus, Heart, MapPin } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { useWishlist } from '../contexts/WishlistContext';

const ProductCard: React.FC<{ product: any, onWishlistUpdate?: () => void }> = ({ product, onWishlistUpdate }) => {
  const { items, addItem, updateQuantity } = useCart();
  const { isAuthenticated } = useAuth();
  const { isInWishlist, toggleWishlist: toggleWishlistInContext } = useWishlist();

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

  const discount = product.original_price 
    ? Math.round(((product.original_price - product.price) / product.original_price) * 100) 
    : 0;

  const isOutOfStock = product.stock <= 0;

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-2xl overflow-hidden border border-black/5 dark:border-white/10 hover:border-[#D4820A]/30 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 group flex flex-col h-full ${isOutOfStock ? 'opacity-75' : ''}`}>
      <Link to={`/products/${product.id}`} className="relative aspect-square bg-[#F0E6D3] dark:bg-slate-700 flex items-center justify-center overflow-hidden transition-colors">
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
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="bg-white text-black px-4 py-2 rounded-xl font-bold text-sm uppercase tracking-wider">
              Out of Stock
            </span>
          </div>
        )}
        {discount > 0 && !isOutOfStock && (
          <span className="absolute top-3 left-3 bg-[#C0392B] text-white text-xs font-bold px-2 py-1 rounded-lg">
            {discount}% OFF
          </span>
        )}
        <button 
          onClick={toggleWishlist}
          className={`absolute top-3 right-3 p-2 backdrop-blur-sm rounded-full transition-all ${isCurrentlyInWishlist ? 'bg-red-500 text-white' : 'bg-white/80 text-gray-400 hover:text-red-500'}`}
        >
          <Heart className={`w-5 h-5 ${isCurrentlyInWishlist ? 'fill-current' : ''}`} />
        </button>
        <div className="absolute bottom-3 left-3 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm px-2 py-1 rounded-lg flex items-center space-x-1 text-[10px] font-bold text-gray-600 dark:text-gray-300 transition-colors">
          <MapPin className="w-3 h-3" />
          <span>{product.origin}</span>
        </div>
      </Link>

      <div className="p-4 flex flex-col flex-grow">
        <div className="flex-grow">
          <h3 className="font-bold text-lg mb-0.5 group-hover:text-[#F39C12] transition-colors text-gray-900 dark:text-white">{product.name}</h3>
          {product.farmer_name && (
            <p className="text-[10px] text-[#D4820A] font-bold uppercase tracking-wider mb-1">By {product.farmer_name}</p>
          )}
          <p className="text-gray-500 dark:text-slate-400 text-xs mb-2">{product.unit}</p>
        </div>
        
        <div className="flex items-center justify-between mt-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xl font-bold text-gray-900 dark:text-white">₹{product.price}</span>
              {product.original_price && (
                <span className="text-gray-400 dark:text-slate-400 line-through text-sm">₹{product.original_price}</span>
              )}
            </div>
          </div>

          {quantityInCart > 0 ? (
            <div className="flex items-center bg-gray-100 dark:bg-slate-700 rounded-xl p-1 shadow-inner">
              <button 
                onClick={() => updateQuantity(product.id, -1)}
                className="p-1.5 hover:bg-white dark:hover:bg-slate-600 rounded-lg transition-colors text-gray-600 dark:text-gray-300"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-8 text-center font-bold text-sm text-gray-900 dark:text-white">{quantityInCart}</span>
              <button 
                onClick={() => updateQuantity(product.id, 1)}
                className="p-1.5 hover:bg-white dark:hover:bg-slate-600 rounded-lg transition-colors text-[#D4820A]"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button 
              onClick={() => !isOutOfStock && addItem(product)}
              disabled={isOutOfStock}
              className={`${isOutOfStock ? 'bg-gray-200 cursor-not-allowed' : 'bg-[#D4820A] hover:bg-[#F39C12] shadow-[#D4820A]/20'} text-white p-2 rounded-xl transition-all hover:scale-110 shadow-lg active:scale-95`}
            >
              <Plus className="w-6 h-6" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
