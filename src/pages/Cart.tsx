import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Plus, Minus, ArrowRight, ShoppingBag, Sparkles, Loader2, X } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { getMealPlan } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';

export default function Cart() {
  const { items, updateQuantity, removeItem, total, itemCount } = useCart();
  const navigate = useNavigate();
  const [mealPlan, setMealPlan] = useState<string | null>(null);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);

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
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Your cart is empty</h2>
          <p className="text-gray-500 dark:text-slate-300">Looks like you haven't added anything yet.</p>
        </div>
        <Link to="/products" className="inline-block bg-[#D4820A] text-white px-8 py-4 rounded-full font-bold hover:bg-[#B87008] transition-all">
          Start Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Shopping Cart</h1>

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
                  <span className="font-bold text-[#D4820A]">₹{item.price * item.quantity}</span>
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
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Order Summary</h2>
            
            <div className="space-y-4 text-gray-600 dark:text-slate-300">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-bold text-gray-900 dark:text-white">₹{total}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery</span>
                <span className="text-green-600 dark:text-green-400 font-bold">FREE</span>
              </div>
              <div className="pt-4 border-t border-black/5 dark:border-white/10 flex justify-between text-xl">
                <span className="font-bold text-gray-900 dark:text-white">Total</span>
                <span className="font-bold text-[#D4820A]">₹{total}</span>
              </div>
            </div>

            <button 
              onClick={() => navigate('/checkout')}
              className="w-full bg-[#D4820A] text-white py-4 rounded-2xl font-bold text-lg flex items-center justify-center space-x-2 hover:bg-[#B87008] transition-all shadow-xl shadow-[#D4820A]/20"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-5 h-5" />
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
                    <span>Planning your meal...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>AI Smart Meal Planner</span>
                  </>
                )}
              </button>
            ) : (
              <div className="space-y-4 relative">
                <button onClick={() => setMealPlan(null)} className="absolute -top-2 -right-2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X className="w-5 h-5" /></button>
                <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400 font-bold">
                  <Sparkles className="w-5 h-5" />
                  <span>Your Village Meal Plan</span>
                </div>
                <div className="prose prose-sm max-w-none prose-p:text-gray-600 dark:prose-p:text-gray-300 prose-li:text-gray-600 dark:prose-li:text-gray-300 bg-emerald-50/50 dark:bg-emerald-900/20 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-800/30 transition-colors">
                  <ReactMarkdown>{mealPlan}</ReactMarkdown>
                </div>
              </div>
            )}
            <p className="text-[10px] text-gray-400 dark:text-slate-400 text-center italic">
              AI suggests meals based on items in your cart.
            </p>
          </div>

          <div className="bg-[#D4820A]/10 dark:bg-[#D4820A]/5 p-6 rounded-2xl border border-[#D4820A]/20 dark:border-[#D4820A]/10 transition-colors">
            <p className="text-[#D4820A] font-medium text-sm text-center">
              🎉 Free delivery on all orders this week!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
