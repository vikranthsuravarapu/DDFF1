import { useState, useEffect } from 'react';
import { RefreshCw, Search, User, Package, Calendar, Clock, MapPin, CheckCircle2, XCircle, Trash2, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency } from '../../utils/format';

export default function Subscriptions() {
  const { token, apiFetch } = useAuth();
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchSubscriptions = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/admin/subscriptions');
      const data = await res.json();
      setSubscriptions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch subscriptions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, [token]);

  const handleToggleStatus = async (id: number, currentStatus: boolean) => {
    try {
      const res = await apiFetch(`/api/subscriptions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentStatus })
      });
      if (res.ok) {
        setSubscriptions(prev => prev.map(s => s.id === id ? { ...s, is_active: !currentStatus } : s));
      }
    } catch (err) {
      console.error('Failed to toggle subscription status:', err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this subscription?')) return;
    try {
      const res = await apiFetch(`/api/subscriptions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSubscriptions(prev => prev.filter(s => s.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete subscription:', err);
    }
  };

  const filteredSubscriptions = subscriptions.filter(sub => 
    sub.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sub.product_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sub.user_email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-slate-100">Manage Subscriptions</h1>
          <p className="text-gray-500 dark:text-slate-400 mt-1">Monitor and manage all recurring orders across the platform</p>
        </div>
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input 
            type="text"
            placeholder="Search by user or product..."
            className="w-full pl-10 pr-4 py-3 rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#D4820A]/20 transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-48 bg-white dark:bg-slate-800 rounded-3xl animate-pulse" />)}
        </div>
      ) : filteredSubscriptions.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSubscriptions.map((sub) => (
            <div key={sub.id} className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-black/5 dark:border-white/10 shadow-sm space-y-4 hover:shadow-md transition-all relative overflow-hidden group">
              <div className={`absolute top-0 right-0 px-4 py-1 rounded-bl-2xl text-[10px] font-bold uppercase tracking-widest ${sub.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                {sub.is_active ? 'Active' : 'Paused'}
              </div>

              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gray-100 dark:bg-slate-700">
                  <img src={sub.image_url} alt={sub.product_name} className="w-full h-full object-cover" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white line-clamp-1">{sub.product_name}</h3>
                  <div className="flex items-center text-xs text-gray-500 dark:text-slate-400 mt-1">
                    <User className="w-3 h-3 mr-1" />
                    <span>{sub.user_name}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 py-4 border-y border-black/5 dark:border-white/5">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Frequency</p>
                  <div className="flex items-center text-sm font-bold text-gray-700 dark:text-slate-200">
                    <RefreshCw className="w-3 h-3 mr-1 text-[#D4820A]" />
                    <span className="capitalize">{sub.frequency}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Quantity</p>
                  <div className="flex items-center text-sm font-bold text-gray-700 dark:text-slate-200">
                    <Package className="w-3 h-3 mr-1 text-[#D4820A]" />
                    <span>{sub.quantity} {sub.unit}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Next Delivery</p>
                  <div className="flex items-center text-sm font-bold text-gray-700 dark:text-slate-200">
                    <Calendar className="w-3 h-3 mr-1 text-[#D4820A]" />
                    <span>{new Date(sub.next_delivery_date).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Slot</p>
                  <div className="flex items-center text-sm font-bold text-gray-700 dark:text-slate-200">
                    <Clock className="w-3 h-3 mr-1 text-[#D4820A]" />
                    <span className="truncate">{sub.delivery_slot}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button 
                  onClick={() => handleToggleStatus(sub.id, sub.is_active)}
                  className={`flex-grow py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2 ${sub.is_active ? 'bg-amber-50 text-amber-600 hover:bg-amber-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}
                >
                  {sub.is_active ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>{sub.is_active ? 'Pause' : 'Activate'}</span>
                </button>
                <button 
                  onClick={() => handleDelete(sub.id)}
                  className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 p-12 rounded-3xl border border-black/5 dark:border-white/10 text-center space-y-4">
          <RefreshCw className="w-12 h-12 text-gray-300 mx-auto" />
          <p className="text-gray-500 dark:text-slate-400 font-medium">No subscriptions found matching your search.</p>
        </div>
      )}
    </div>
  );
}
