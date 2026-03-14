import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Tag, Copy, Check, ShoppingBag, Clock, Info, Package, Percent, IndianRupee } from 'lucide-react';
import { Link } from 'react-router-dom';

interface PromoCode {
  id: number;
  code: string;
  discount_percent: number | null;
  discount_amount: number | null;
  min_order: number;
  expiry_date: string | null;
  is_active: boolean;
  max_uses: number | null;
  used_count: number;
  product_id: number | null;
  product_name?: string;
  image_url?: string;
  category?: string;
}

export default function Offers() {
  const [offers, setOffers] = useState<PromoCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    fetchOffers();
  }, []);

  const fetchOffers = async () => {
    try {
      const response = await fetch('/api/promo-codes/active');
      const data = await response.json();
      if (Array.isArray(data)) {
        setOffers(data);
      } else {
        console.error('Unexpected response format:', data);
        setOffers([]);
      }
    } catch (error) {
      console.error('Error fetching offers:', error);
      setOffers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-12 h-12 border-4 border-[#D4820A] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-500 font-medium animate-pulse">Harvesting the best deals for you...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-20">
      <div className="text-center space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#D4820A]/10 text-[#D4820A] rounded-full text-sm font-bold uppercase tracking-widest"
        >
          <Tag size={16} />
          Exclusive Savings
        </motion.div>
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-4xl md:text-6xl font-bold text-[#3B2A1A] dark:text-white"
        >
          Active Offers & Coupons
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto text-lg"
        >
          Save big on your favorite farm-fresh products. Copy the codes below and apply them at checkout.
        </motion.p>
      </div>

      {offers.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border-2 border-dashed border-gray-200 dark:border-slate-800"
        >
          <div className="text-6xl mb-4">🌾</div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">No active offers right now</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Check back soon for fresh deals!</p>
          <Link 
            to="/products" 
            className="inline-block mt-8 px-8 py-3 bg-[#D4820A] text-white rounded-full font-bold hover:bg-[#B36D08] transition-all shadow-lg shadow-[#D4820A]/20"
          >
            Start Shopping
          </Link>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {offers.map((offer, index) => (
            <motion.div
              key={offer.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="group relative bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border border-gray-100 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all duration-300"
            >
              {/* Card Header: Discount Headline */}
              <div className="p-8 pb-4 space-y-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <h3 className="text-4xl font-black text-[#D4820A] flex items-baseline gap-1">
                      {offer.discount_percent ? (
                        <>{offer.discount_percent}<span className="text-2xl">%</span></>
                      ) : (
                        <><span className="text-2xl">₹</span>{offer.discount_amount}</>
                      )}
                      <span className="text-xl uppercase tracking-tighter text-gray-400 dark:text-gray-500 ml-1">OFF</span>
                    </h3>
                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Limited Time Offer
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-[#D4820A]/10 rounded-2xl flex items-center justify-center text-[#D4820A]">
                    {offer.discount_percent ? <Percent size={24} /> : <IndianRupee size={24} />}
                  </div>
                </div>

                {/* Promo Code Badge */}
                <div className="relative mt-6">
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800/50 border-2 border-dashed border-[#D4820A]/30 rounded-2xl group-hover:border-[#D4820A] transition-colors">
                    <span className="font-mono text-xl font-black tracking-widest text-[#3B2A1A] dark:text-white">
                      {offer.code}
                    </span>
                    <button
                      onClick={() => handleCopy(offer.code)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-700 text-[#D4820A] rounded-xl text-xs font-bold shadow-sm hover:bg-[#D4820A] hover:text-white transition-all"
                    >
                      <AnimatePresence mode="wait">
                        {copiedCode === offer.code ? (
                          <motion.div
                            key="check"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            className="flex items-center gap-1"
                          >
                            <Check size={14} />
                            Copied!
                          </motion.div>
                        ) : (
                          <motion.div
                            key="copy"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            className="flex items-center gap-1"
                          >
                            <Copy size={14} />
                            Copy
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </button>
                  </div>
                </div>
              </div>

              {/* Card Body: Details */}
              <div className="p-8 pt-4 space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
                      {offer.product_id ? (
                        <img 
                          src={offer.image_url || 'https://picsum.photos/seed/product/100/100'} 
                          alt={offer.product_name}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <ShoppingBag className="text-gray-400" size={20} />
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Applies To</span>
                      <span className="font-bold text-gray-700 dark:text-gray-200">
                        {offer.product_id ? offer.product_name : '🛒 All Products'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {offer.min_order > 0 && (
                      <div className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400">
                        <Info size={14} className="text-[#D4820A]" />
                        Min. order ₹{offer.min_order}
                      </div>
                    )}
                    {offer.expiry_date && (
                      <div className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400">
                        <Clock size={14} className="text-[#D4820A]" />
                        Valid till {new Date(offer.expiry_date).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>

                <Link
                  to={offer.product_id ? `/products/${offer.product_id}` : '/products'}
                  className="flex items-center justify-center gap-2 w-full py-4 bg-[#3B2A1A] dark:bg-slate-800 text-white rounded-2xl font-bold hover:bg-[#D4820A] transition-all group/btn"
                >
                  Shop Now
                  <motion.span
                    animate={{ x: [0, 5, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                  >
                    →
                  </motion.span>
                </Link>
              </div>

              {/* Decorative Elements */}
              <div className="absolute top-1/2 -left-3 w-6 h-6 bg-[#FDF6EC] dark:bg-slate-950 rounded-full border border-gray-100 dark:border-slate-800" />
              <div className="absolute top-1/2 -right-3 w-6 h-6 bg-[#FDF6EC] dark:bg-slate-950 rounded-full border border-gray-100 dark:border-slate-800" />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
