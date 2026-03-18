import { useState, useEffect } from 'react';
import { ShoppingBag, Plus, Minus, Trash2, ArrowRight, AlertCircle } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { formatCurrency } from '../utils/format';

interface MiniCartProps {
  isMobile?: boolean;
  onClose?: () => void;
}

export default function MiniCart({ isMobile, onClose }: MiniCartProps) {
  const { items, total, updateQuantity, removeItem, itemCount } = useCart();
  const { userLocation, apiFetch } = useAuth();
  const [currentZone, setCurrentZone] = useState<any>(null);

  useEffect(() => {
    if (userLocation) {
      apiFetch('/api/delivery-zones')
        .then(res => res.json())
        .then(zones => {
          const zone = zones.find((z: any) => 
            z.name.toLowerCase() === userLocation.toLowerCase() ||
            z.pincode === userLocation
          );
          setCurrentZone(zone || null);
        })
        .catch(err => console.error('Error fetching zones in MiniCart:', err));
    }
  }, [userLocation]);

  const isBelowMinimum = currentZone && total < currentZone.min_order_amount;

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 h-full text-center bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-20 h-20 bg-[#FDF6EC] dark:bg-slate-700/50 rounded-full flex items-center justify-center mb-6 shadow-inner"
        >
          <ShoppingBag className="w-10 h-10 text-[#D4820A]/40" />
        </motion.div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Your cart is empty</h3>
        <p className="text-gray-500 dark:text-slate-400 text-sm mb-8 max-w-[200px]">Add some fresh village products to get started!</p>
        {isMobile && (
          <button 
            onClick={onClose}
            className="w-full py-4 bg-[#D4820A] text-white rounded-2xl font-bold hover:bg-[#B87008] transition-all shadow-lg shadow-[#D4820A]/20 active:scale-95"
          >
            Start Shopping
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white/40 dark:bg-slate-800/40 backdrop-blur-md">
      <div className="p-4 border-b border-black/5 dark:border-white/10 flex items-center justify-between bg-white/95 dark:bg-slate-800/95 backdrop-blur-md">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-[#D4820A]/10 rounded-lg">
            <ShoppingBag className="w-4 h-4 text-[#D4820A]" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-900 dark:text-white leading-tight">My Cart</h2>
            <p className="text-[9px] uppercase tracking-wider font-bold text-gray-400">{itemCount} items</p>
          </div>
        </div>
        {isMobile && (
          <button onClick={onClose} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors">
            <Plus className="w-5 h-5 rotate-45 text-gray-400" />
          </button>
        )}
      </div>

      <div className="flex-grow overflow-y-auto min-h-0 p-4 space-y-3 custom-scrollbar">
        <AnimatePresence initial={false}>
          {items.map((item) => (
            <motion.div 
              key={item.id}
              layout
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex items-center space-x-3 bg-white/60 dark:bg-slate-900/40 p-3 rounded-2xl border border-black/5 dark:border-white/5 shadow-sm hover:shadow-md transition-all group"
            >
              <div className="w-12 h-12 bg-[#F0E6D3] dark:bg-slate-700 rounded-lg flex-shrink-0 overflow-hidden shadow-inner">
                <img 
                  src={item.image_url || `https://picsum.photos/seed/${item.id}/100/100`} 
                  alt={item.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
              </div>
              <div className="flex-grow min-w-0">
                <h4 className="text-xs font-bold text-gray-900 dark:text-white truncate">{item.name}</h4>
                <p className="text-[9px] text-gray-400 dark:text-slate-500 mb-1">{item.unit}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center bg-gray-100/50 dark:bg-slate-800/50 rounded-lg p-0.5 border border-black/5 dark:border-white/5">
                    <button 
                      onClick={() => updateQuantity(item.id, -1)}
                      className="p-0.5 hover:bg-white dark:hover:bg-slate-700 rounded-md transition-all text-gray-400 hover:text-gray-600"
                    >
                      <Minus className="w-2.5 h-2.5" />
                    </button>
                    <span className="w-5 text-center text-[10px] font-bold text-gray-900 dark:text-white">{item.quantity}</span>
                    <button 
                      onClick={() => updateQuantity(item.id, 1)}
                      className="p-0.5 hover:bg-white dark:hover:bg-slate-700 rounded-md transition-all text-[#D4820A]"
                    >
                      <Plus className="w-2.5 h-2.5" />
                    </button>
                  </div>
                  <span className="text-xs font-bold text-gray-900 dark:text-white">{formatCurrency(item.price * item.quantity)}</span>
                </div>
              </div>
              <button 
                onClick={() => removeItem(item.id)}
                className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="p-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-black/5 dark:border-white/10 space-y-3 shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[9px] uppercase tracking-widest font-bold text-gray-400">Total Amount</span>
            <span className="text-xl font-black text-gray-900 dark:text-white">{formatCurrency(total)}</span>
          </div>
          <div className="text-right">
            {currentZone && (
              <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded-md">
                Delivery: {currentZone.delivery_fee > 0 ? formatCurrency(currentZone.delivery_fee) : 'Free'}
              </span>
            )}
          </div>
        </div>

        {isBelowMinimum && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl flex items-start space-x-2"
          >
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-[10px] font-bold text-amber-700 dark:text-amber-300 leading-tight">
              ⚠️ Minimum order for delivery to {currentZone.name} is ₹{currentZone.min_order_amount}. 
              Add ₹{currentZone.min_order_amount - total} more to proceed.
            </p>
          </motion.div>
        )}

        <Link 
          to={isBelowMinimum ? "#" : "/checkout"} 
          onClick={(e) => {
            if (isBelowMinimum) {
              e.preventDefault();
              return;
            }
            if (onClose) onClose();
          }}
          className={`w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center space-x-2 group active:scale-[0.98] ${
            isBelowMinimum 
              ? 'bg-gray-200 dark:bg-slate-700 text-gray-400 dark:text-slate-500 cursor-not-allowed' 
              : 'bg-[#D4820A] text-white hover:bg-[#F39C12] shadow-xl shadow-[#D4820A]/30'
          }`}
        >
          <span className="text-sm">Go to Checkout</span>
          {!isBelowMinimum && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
        </Link>
      </div>
    </div>
  );
}
