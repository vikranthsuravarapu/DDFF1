import { ShoppingBag, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useCart } from '../contexts/CartContext';
import MiniCart from './MiniCart';
import { useLocation } from 'react-router-dom';

export default function GlobalCart() {
  const { itemCount, isDrawerOpen, setIsDrawerOpen } = useCart();
  const location = useLocation();

  // Hide global floating cart on checkout and cart pages
  const isExcludedPage = ['/checkout', '/cart'].includes(location.pathname);
  if (isExcludedPage) return null;

  return (
    <>
      {/* Floating Cart Button */}
      <div className="fixed bottom-42 right-6 md:bottom-6 md:left-6 z-[100]">
        <button 
          onClick={() => setIsDrawerOpen(true)}
          className="relative bg-[#D4820A] text-white p-3.5 rounded-full shadow-2xl shadow-[#D4820A]/40 hover:scale-110 active:scale-95 transition-all group ring-4 ring-white dark:ring-slate-900"
        >
          <ShoppingBag className="w-5 h-5" />
          {itemCount > 0 ? (
            <span className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 animate-bounce shadow-lg">
              {itemCount}
            </span>
          ) : (
            <span className="absolute -top-1 -right-1 bg-slate-400 text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-white dark:border-slate-900">
              0
            </span>
          )}
        </button>
      </div>

      {/* Cart Drawer */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110]"
            />
            <motion.div 
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-28 left-6 right-6 md:right-auto w-[calc(100vw-3rem)] sm:w-96 bg-white dark:bg-slate-800 z-[120] shadow-2xl flex flex-col rounded-[32px] overflow-hidden border border-black/5 dark:border-white/10 h-[500px] max-h-[calc(100vh-120px)]"
            >
              <div className="p-4 flex items-center justify-between border-b border-black/5 dark:border-white/10 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md">
                <div className="flex items-center space-x-2">
                  <ShoppingBag className="w-5 h-5 text-[#D4820A]" />
                  <h2 className="text-lg font-bold dark:text-white">Your Cart</h2>
                </div>
                <button 
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="flex-grow overflow-hidden">
                <MiniCart isMobile onClose={() => setIsDrawerOpen(false)} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
