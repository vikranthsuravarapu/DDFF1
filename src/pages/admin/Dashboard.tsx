import { useState, useEffect } from 'react';
import { BarChart3, Package, Users, AlertTriangle, TrendingUp, ShoppingBag, ChevronRight, Sparkles, Loader2, X, UserPlus, MapPin, Bike, Tag } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { analyzeAdminData } from '../../services/geminiService';
import { formatCurrency } from '../../utils/format';
import ReactMarkdown from 'react-markdown';

export default function AdminDashboard() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    fetch('/api/admin/stats', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(setStats);
  }, [token]);

  const handleAIAnalysis = async () => {
    if (!stats) return;
    setIsAnalyzing(true);
    const result = await analyzeAdminData(stats, "Overall Business Performance & Stats");
    setAiAnalysis(result || "Failed to analyze data.");
    setIsAnalyzing(false);
  };

  if (!stats) return <div className="animate-pulse h-96 bg-white dark:bg-slate-800 rounded-3xl transition-colors" />;

  const cards = [
    { title: 'Total Sales', value: formatCurrency(stats.totalSales), icon: TrendingUp, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20', emoji: '💰', path: '/admin/orders' },
    { title: 'Total Orders', value: stats.orderCount, icon: ShoppingBag, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20', emoji: '📦', path: '/admin/orders' },
    { title: 'Customers', value: stats.userCount, icon: Users, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20', emoji: '👥', path: '/admin/users' },
    { title: 'Delivery Staff', value: stats.deliveryBoyCount || 0, icon: Bike, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20', emoji: '🛵', path: '/admin/delivery-staff' },
    { title: 'Farmers', value: stats.farmerCount || 0, icon: UserPlus, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20', emoji: '👨‍🌾', path: '/admin/farmers' },
    { title: 'Low Stock', value: stats.lowStock, icon: AlertTriangle, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20', emoji: '⚠️', path: '/admin/products?filter=low-stock' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-slate-100">Admin Dashboard</h1>
        <div className="flex items-center space-x-4">
          <button 
            onClick={handleAIAnalysis}
            disabled={isAnalyzing}
            className="flex items-center space-x-2 bg-black dark:bg-slate-700 text-white px-4 py-2 rounded-xl hover:bg-gray-800 dark:hover:bg-slate-600 transition-all disabled:opacity-50 shadow-lg"
          >
            {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-yellow-400" />}
            <span>AI Business Insights</span>
          </button>
          <div className="bg-white dark:bg-slate-800 px-4 py-2 rounded-xl border border-black/5 dark:border-white/10 text-sm font-medium text-gray-500 dark:text-gray-400 transition-colors">
            Last updated: {new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>

      {aiAnalysis && (
        <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-8 rounded-3xl shadow-2xl relative overflow-hidden animate-in fade-in slide-in-from-top-4">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Sparkles className="w-32 h-32" />
          </div>
          <button onClick={() => setAiAnalysis(null)} className="absolute top-4 right-4 text-white/50 hover:text-white"><X className="w-6 h-6" /></button>
          <div className="relative z-10 space-y-4">
            <div className="flex items-center space-x-2 text-indigo-300 font-bold uppercase tracking-widest text-xs">
              <Sparkles className="w-4 h-4" />
              <span>AI Strategic Analysis</span>
            </div>
            <div className="prose prose-invert prose-sm max-w-none">
              <ReactMarkdown>{aiAnalysis}</ReactMarkdown>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {cards.map((card, i) => (
          <Link 
            key={i} 
            to={card.path}
            className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-black/5 dark:border-white/10 shadow-sm space-y-4 hover:shadow-md transition-all block relative overflow-hidden group active:scale-95"
          >
            <div className="absolute -right-2 -top-2 opacity-10 text-6xl rotate-12 group-hover:scale-110 transition-transform">
              {card.emoji}
            </div>
            <div className={`${card.bg} ${card.color} w-12 h-12 rounded-2xl flex items-center justify-center relative z-10`}>
              <card.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-gray-500 dark:text-slate-400 font-medium">{card.title}</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-slate-100">{card.value}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-black/5 dark:border-white/10 space-y-6 transition-colors">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Recent Activity</h2>
            <Link to="/admin/orders" className="text-[#D4820A] text-sm font-bold flex items-center">
              View All <ChevronRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center justify-between py-4 border-b border-black/5 dark:border-white/5 last:border-0">
                <div className="flex items-center space-x-4">
                  <div className="bg-gray-100 dark:bg-slate-700 w-10 h-10 rounded-full flex items-center justify-center transition-colors">
                    <ShoppingBag className="w-5 h-5 text-gray-400 dark:text-gray-300" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 dark:text-slate-100">New order received</p>
                    <p className="text-sm text-gray-500 dark:text-slate-400">Processing • Just now</p>
                  </div>
                </div>
                <span className="text-sm font-bold text-[#D4820A]">₹...</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-black/5 dark:border-white/10 space-y-6 transition-colors">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            <Link 
              to="/admin/products"
              className="p-6 rounded-2xl border border-black/10 dark:border-white/10 hover:border-[#D4820A] hover:bg-[#D4820A]/5 transition-all text-left space-y-2 group relative overflow-hidden"
            >
              <div className="absolute -right-2 -top-2 opacity-5 text-6xl group-hover:scale-110 transition-transform">🌾</div>
              <Package className="w-6 h-6 text-[#D4820A] group-hover:scale-110 transition-transform relative z-10" />
              <p className="font-bold text-gray-900 dark:text-slate-100 relative z-10">Manage Products</p>
              <p className="text-xs text-gray-500 dark:text-slate-400 relative z-10">Add, edit or remove items</p>
            </Link>
            <Link 
              to="/admin/orders"
              className="p-6 rounded-2xl border border-black/10 dark:border-white/10 hover:border-[#D4820A] hover:bg-[#D4820A]/5 transition-all text-left space-y-2 group relative overflow-hidden"
            >
              <div className="absolute -right-2 -top-2 opacity-5 text-6xl group-hover:scale-110 transition-transform">📦</div>
              <ShoppingBag className="w-6 h-6 text-[#D4820A] group-hover:scale-110 transition-transform relative z-10" />
              <p className="font-bold text-gray-900 dark:text-slate-100 relative z-10">Manage Orders</p>
              <p className="text-xs text-gray-500 dark:text-slate-400 relative z-10">Update status & tracking</p>
            </Link>
            <Link 
              to="/admin/farmers"
              className="p-6 rounded-2xl border border-black/10 dark:border-white/10 hover:border-[#D4820A] hover:bg-[#D4820A]/5 transition-all text-left space-y-2 group relative overflow-hidden"
            >
              <div className="absolute -right-2 -top-2 opacity-5 text-6xl group-hover:scale-110 transition-transform">👨‍🌾</div>
              <UserPlus className="w-6 h-6 text-[#D4820A] group-hover:scale-110 transition-transform relative z-10" />
              <p className="font-bold text-gray-900 dark:text-slate-100 relative z-10">Manage Farmers</p>
              <p className="text-xs text-gray-500 dark:text-slate-400 relative z-10">Add or edit farmer profiles</p>
            </Link>
            <Link 
              to="/admin/delivery-staff"
              className="p-6 rounded-2xl border border-black/10 dark:border-white/10 hover:border-[#D4820A] hover:bg-[#D4820A]/5 transition-all text-left space-y-2 group relative overflow-hidden"
            >
              <div className="absolute -right-2 -top-2 opacity-5 text-6xl group-hover:scale-110 transition-transform">🛵</div>
              <Bike className="w-6 h-6 text-[#D4820A] group-hover:scale-110 transition-transform relative z-10" />
              <p className="font-bold text-gray-900 dark:text-slate-100 relative z-10">Delivery Staff</p>
              <p className="text-xs text-gray-500 dark:text-slate-400 relative z-10">Manage staff & accounts</p>
            </Link>
            <Link 
              to="/admin/delivery-zones"
              className="p-6 rounded-2xl border border-black/10 dark:border-white/10 hover:border-[#D4820A] hover:bg-[#D4820A]/5 transition-all text-left space-y-2 group relative overflow-hidden"
            >
              <div className="absolute -right-2 -top-2 opacity-5 text-6xl group-hover:scale-110 transition-transform">📍</div>
              <MapPin className="w-6 h-6 text-[#D4820A] group-hover:scale-110 transition-transform relative z-10" />
              <p className="font-bold text-gray-900 dark:text-slate-100 relative z-10">Delivery Zones</p>
              <p className="text-xs text-gray-500 dark:text-slate-400 relative z-10">Manage villages & fees</p>
            </Link>
            <Link 
              to="/admin/promo-codes"
              className="p-6 rounded-2xl border border-black/10 dark:border-white/10 hover:border-[#D4820A] hover:bg-[#D4820A]/5 transition-all text-left space-y-2 group relative overflow-hidden"
            >
              <div className="absolute -right-2 -top-2 opacity-5 text-6xl group-hover:scale-110 transition-transform">🏷️</div>
              <Tag className="w-6 h-6 text-[#D4820A] group-hover:scale-110 transition-transform relative z-10" />
              <p className="font-bold text-gray-900 dark:text-slate-100 relative z-10">Promo Codes</p>
              <p className="text-xs text-gray-500 dark:text-slate-400 relative z-10">Create & manage offers</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
