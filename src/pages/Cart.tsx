import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Plus, Minus, ArrowRight, ShoppingBag, Sparkles, Loader2, X, AlertCircle } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { getMealPlan } from '../services/geminiService';
import { formatCurrency } from '../utils/format';
import ReactMarkdown from 'react-markdown';

export default function Cart() {
  const { t } = useLanguage();
  const { items, updateQuantity, removeItem, total, itemCount } = useCart();
  const { user, userLocation } = useAuth();
  const navigate = useNavigate();
  const [mealPlan, setMealPlan] = useState<string | null>(null);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [currentZone, setCurrentZone] = useState<any>(null);

  useEffect(() => {
    if (userLocation) {
      fetch('/api/delivery-zones')
        .then(res => res.json())
        .then(zones => {
          const zone = zones.find((z: any) => 
            z.name.toLowerCase() === userLocation.toLowerCase() ||
            z.pincode === userLocation
          );
          setCurrentZone(zone || null);
        })
        .catch(err => console.error('Error fetching zones in Cart:', err));
    }
  }, [userLocation]);

  const isBelowMinimum = currentZone && total < currentZone.min_order_amount;

  useEffect(() => {
    if (user?.role === 'delivery_boy') {
      navigate('/delivery');
    }
  }, [user, navigate]);

  const handleGenerateMealPlan = async () => {
    if (items.length === 0) return;
    setIsGeneratingPlan(true);
    const itemNames = items.map(i => i.name);
    const result = await getMealPlan(itemNames);
    setMealPlan(result || "Failed to generate meal plan.");
    setIsGeneratingPlan(false);
  };

  if (itemCount === 0) {
    return (
      <div className="text-center py-20 space-y-6">
        <div className="bg-[#F0E6D3] dark:bg-slate-800 w-32 h-32 rounded-full flex items-center justify-center mx-auto transition-colors">
          <ShoppingBag className="w-16 h-16 text-[#D4820A]" />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">{t('empty_cart')}</h2>
          <p className="text-gray-500 dark:text-slate-300">{t('start_shopping_desc')}</p>
        </div>
        <Link to="/products" className="inline-block bg-[#D4820A] text-white px-8 py-4 rounded-full font-bold hover:bg-[#B87008] transition-all">
          {t('start_shopping')}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white">{t('shopping_cart')}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Items List */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <div key={item.id} className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-black/5 dark:border-white/10 flex items-center space-x-4 transition-colors">
              <div className="w-24 h-24 bg-[#F0E6D3] dark:bg-slate-700 rounded-xl overflow-hidden flex-shrink-0 transition-colors">
                <img 
                  src={item.image_url || `https://picsum.photos/seed/${item.id}/200/200`} 
                  alt={item.name} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              
              <div className="flex-grow">
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">{item.name}</h3>
                <p className="text-gray-500 dark:text-slate-300 text-sm">{item.unit}</p>
                <div className="mt-2 flex items-center space-x-4">
                  <div className="flex items-center border border-black/10 dark:border-white/10 rounded-xl p-1 bg-white dark:bg-slate-700 transition-colors">
                    <button onClick={() => updateQuantity(item.id, -1)} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-600 rounded-lg text-gray-900 dark:text-slate-100"><Minus className="w-4 h-4" /></button>
                    <span className="w-8 text-center font-bold text-gray-900 dark:text-white">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, 1)} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-600 rounded-lg text-gray-900 dark:text-slate-100"><Plus className="w-4 h-4" /></button>
                  </div>
                  <span className="font-bold text-[#D4820A]">{formatCurrency(item.price * item.quantity)}</span>
                </div>
              </div>

              <button 
                onClick={() => removeItem(item.id)}
                className="p-3 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-black/5 dark:border-white/10 space-y-6 shadow-sm transition-colors">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('order_summary')}</h2>
            
            <div className="space-y-4 text-gray-600 dark:text-slate-300">
              <div className="flex justify-between">
                <span>{t('subtotal')}</span>
                <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(total)}</span>
              </div>
              <div className="flex justify-between">
                <span>{t('delivery')}</span>
                <span className={currentZone?.delivery_fee > 0 ? "font-bold text-gray-900 dark:text-white" : "text-green-600 dark:text-green-400 font-bold"}>
                  {currentZone ? (currentZone.delivery_fee > 0 ? formatCurrency(currentZone.delivery_fee) : t('free')) : t('free')}
                </span>
              </div>
              <div className="pt-4 border-t border-black/5 dark:border-white/10 flex justify-between text-xl">
                <span className="font-bold text-gray-900 dark:text-white">{t('total')}</span>
                <span className="font-bold text-[#D4820A]">{formatCurrency(total + (currentZone?.delivery_fee || 0))}</span>
              </div>
            </div>

            {isBelowMinimum && (
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm font-bold text-amber-700 dark:text-amber-300">
                  ⚠️ Minimum order for delivery to {currentZone.name} is ₹{currentZone.min_order_amount}. 
                  Add ₹{currentZone.min_order_amount - total} more to proceed.
                </p>
              </div>
            )}

            <button 
              onClick={() => !isBelowMinimum && navigate('/checkout')}
              disabled={isBelowMinimum}
              className={`w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center space-x-2 transition-all shadow-xl ${
                isBelowMinimum 
                  ? 'bg-gray-200 dark:bg-slate-700 text-gray-400 dark:text-slate-500 cursor-not-allowed shadow-none' 
                  : 'bg-[#D4820A] text-white hover:bg-[#B87008] shadow-[#D4820A]/20'
              }`}
            >
              <span>{t('proceed_checkout')}</span>
              {!isBelowMinimum && <ArrowRight className="w-5 h-5" />}
            </button>
          </div>

          {/* AI Meal Planner */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-black/5 dark:border-white/10 space-y-4 shadow-sm transition-colors">
            {!mealPlan ? (
              <button 
                onClick={handleGenerateMealPlan}
                disabled={isGeneratingPlan}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center space-x-2 hover:shadow-lg transition-all disabled:opacity-50"
              >
                {isGeneratingPlan ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>{t('planning_meal')}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>{t('ai_meal_planner')}</span>
                  </>
                )}
              </button>
            ) : (
              <div className="space-y-4 relative">
                <button onClick={() => setMealPlan(null)} className="absolute -top-2 -right-2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X className="w-5 h-5" /></button>
                <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400 font-bold">
                  <Sparkles className="w-5 h-5" />
                  <span>{t('village_meal_plan')}</span>
                </div>
                <div className="prose prose-sm max-w-none prose-p:text-gray-600 dark:prose-p:text-gray-300 prose-li:text-gray-600 dark:prose-li:text-gray-300 bg-emerald-50/50 dark:bg-emerald-900/20 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-800/30 transition-colors">
                  <ReactMarkdown>{mealPlan}</ReactMarkdown>
                </div>
              </div>
            )}
            <p className="text-[10px] text-gray-400 dark:text-slate-400 text-center italic">
              {t('ai_meal_desc')}
            </p>
          </div>

          <div className="bg-[#D4820A]/10 dark:bg-[#D4820A]/5 p-6 rounded-2xl border border-[#D4820A]/20 dark:border-[#D4820A]/10 transition-colors">
            <p className="text-[#D4820A] font-medium text-sm text-center">
              🎉 {t('free_delivery_week')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
