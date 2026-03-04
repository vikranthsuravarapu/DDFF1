import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Package, MapPin, Clock, CheckCircle2, XCircle, Truck, Sparkles, Loader2, X } from 'lucide-react';
import { analyzeAdminData } from '../../services/geminiService';
import ReactMarkdown from 'react-markdown';

export default function AdminOrders() {
  const { token } = useAuth();
  const [orders, setOrders] = useState([]);
  const [deliveryBoys, setDeliveryBoys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetchOrders();
    fetchDeliveryBoys();
  }, [statusFilter]);

  const fetchDeliveryBoys = async () => {
    try {
      const res = await fetch('/api/admin/delivery-boys', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setDeliveryBoys(data);
    } catch (e) {
      console.error('Failed to fetch delivery boys:', e);
    }
  };

  const handleAIAnalysis = async () => {
    if (orders.length === 0) return;
    setIsAnalyzing(true);
    const result = await analyzeAdminData(orders, "Customer Orders & Delivery Performance");
    setAiAnalysis(result || "Failed to analyze data.");
    setIsAnalyzing(false);
  };

  const fetchOrders = () => {
    setLoading(true);
    let url = '/api/admin/orders';
    if (statusFilter) url += `?status=${statusFilter}`;
    
    fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      setOrders(data);
      setLoading(false);
    });
  };

  const updateStatus = async (id: number, status: string) => {
    await fetch(`/api/admin/orders/${id}/status`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify({ status })
    });
    fetchOrders();
  };

  const assignDeliveryBoy = async (orderId: number, deliveryBoyId: string) => {
    if (!deliveryBoyId) return;
    await fetch(`/api/admin/orders/${orderId}/assign`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ delivery_boy_id: parseInt(deliveryBoyId) })
    });
    fetchOrders();
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-slate-100">Manage Orders</h1>
        <div className="flex items-center space-x-4">
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="p-3 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#D4820A]/20 transition-colors font-bold"
          >
            <option value="">All Statuses</option>
            <option value="processing">Processing</option>
            <option value="confirmed">Confirmed</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <button 
            onClick={handleAIAnalysis}
            disabled={isAnalyzing}
            className="flex items-center space-x-2 bg-[#D4820A] text-white px-6 py-3 rounded-2xl hover:bg-[#B87008] transition-all disabled:opacity-50 shadow-xl shadow-[#D4820A]/20"
          >
            {isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            <span className="font-bold">AI Order Analysis</span>
          </button>
        </div>
      </div>

      {aiAnalysis && (
        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border-2 border-[#D4820A]/20 shadow-xl relative animate-in fade-in slide-in-from-top-4 transition-colors">
          <button onClick={() => setAiAnalysis(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X className="w-6 h-6" /></button>
          <div className="flex items-center space-x-2 text-[#D4820A] font-bold mb-4">
            <Sparkles className="w-5 h-5" />
            <span>AI Order Insights</span>
          </div>
          <div className="prose prose-sm max-w-none prose-p:text-gray-600 dark:prose-p:text-slate-300 prose-li:text-gray-600 dark:prose-li:text-slate-300">
            <ReactMarkdown>{aiAnalysis}</ReactMarkdown>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-black/5 dark:border-white/10 overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 dark:bg-slate-900/50 text-gray-500 dark:text-white text-sm uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-bold">Order ID</th>
                <th className="px-6 py-4 font-bold">Customer</th>
                <th className="px-6 py-4 font-bold">Amount</th>
                <th className="px-6 py-4 font-bold">Delivery Partner</th>
                <th className="px-6 py-4 font-bold">Status</th>
                <th className="px-6 py-4 font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/5">
              {orders.map((order: any) => (
                <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-bold text-gray-900 dark:text-slate-100">#GR-{order.id.toString().padStart(4, '0')}</span>
                    <p className="text-xs text-gray-400 dark:text-slate-500">{new Date(order.created_at).toLocaleDateString()}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-bold text-gray-900 dark:text-slate-100">{order.user_name}</p>
                    <p className="text-xs text-gray-400 dark:text-slate-500">{order.user_email}</p>
                    <div className="mt-1 flex items-center space-x-1 text-[10px] text-gray-500 dark:text-slate-400">
                      <MapPin className="w-3 h-3" />
                      <span className="truncate max-w-[150px]">
                        {order.house_no}, {order.street}, {order.city}, {order.district}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-bold text-[#D4820A]">₹{order.final_amount}</td>
                  <td className="px-6 py-4">
                    <select
                      value={order.delivery_boy_id || ''}
                      onChange={(e) => assignDeliveryBoy(order.id, e.target.value)}
                      className="text-xs p-2 rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#D4820A]/20 transition-colors"
                    >
                      <option value="">Unassigned</option>
                      {deliveryBoys.map((db: any) => (
                        <option key={db.id} value={db.id}>{db.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-bold px-2 py-1 rounded-lg uppercase ${
                      order.status === 'delivered' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                      order.status === 'processing' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                      order.status === 'cancelled' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                      'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                    }`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => updateStatus(order.id, 'confirmed')}
                        className="p-2 hover:bg-amber-50 dark:hover:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-lg transition-colors"
                        title="Confirm Order"
                      >
                        <CheckCircle2 className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => updateStatus(order.id, 'shipped')}
                        className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg transition-colors"
                        title="Mark Shipped"
                      >
                        <Truck className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => updateStatus(order.id, 'delivered')}
                        className="p-2 hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg transition-colors"
                        title="Mark Delivered"
                      >
                        <CheckCircle2 className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => updateStatus(order.id, 'cancelled')}
                        className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg transition-colors"
                        title="Cancel Order"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
