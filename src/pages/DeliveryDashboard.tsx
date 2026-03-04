import React, { useState, useEffect } from 'react';
import { Package, MapPin, Phone, Truck, CheckCircle2, Clock, ChevronRight, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function DeliveryDashboard() {
  const { user, token, logout } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);
  const navigate = useNavigate();

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/delivery/orders', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setOrders(data);
    } catch (e) {
      console.error('Failed to fetch orders:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchOrders();
  }, [token]);

  const updateStatus = async (orderId: number, status: string) => {
    setUpdating(orderId);
    try {
      const res = await fetch(`/api/delivery/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        fetchOrders();
      }
    } catch (e) {
      console.error('Failed to update status:', e);
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-md mx-auto py-12 space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-48 bg-white dark:bg-slate-800 rounded-3xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-8 pb-20">
      <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-6 rounded-3xl border border-black/5 dark:border-white/10 shadow-sm">
        <div className="flex items-center space-x-4">
          <div className="bg-[#D4820A] w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl">
            {user?.name[0]}
          </div>
          <div>
            <h1 className="font-bold text-gray-900 dark:text-slate-100">{user?.name}</h1>
            <p className="text-xs text-gray-500 dark:text-slate-400 uppercase font-bold tracking-wider">Delivery Partner</p>
          </div>
        </div>
        <button onClick={() => { logout(); navigate('/login'); }} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
          <LogOut className="w-6 h-6" />
        </button>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100 px-2 flex items-center space-x-2">
          <Truck className="w-5 h-5 text-[#D4820A]" />
          <span>Assigned Tasks ({orders.length})</span>
        </h2>

        {orders.length === 0 ? (
          <div className="text-center py-20 space-y-4 bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-gray-200 dark:border-slate-700">
            <Package className="w-12 h-12 text-gray-300 dark:text-slate-600 mx-auto" />
            <p className="text-gray-500 dark:text-slate-400">No orders assigned to you yet.</p>
          </div>
        ) : (
          orders.map((order) => (
            <div key={order.id} className="bg-white dark:bg-slate-800 rounded-3xl border border-black/5 dark:border-white/10 shadow-sm overflow-hidden transition-all">
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">#DDFF-{order.id.toString().padStart(4, '0')}</span>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-lg uppercase ${
                    order.status === 'delivered' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                    order.status === 'shipped' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                  }`}>
                    {order.status}
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <MapPin className="w-5 h-5 text-[#D4820A] mt-1 flex-shrink-0" />
                    <div>
                      <p className="font-bold text-gray-900 dark:text-slate-100">{order.user_name}</p>
                      <p className="text-sm text-gray-500 dark:text-slate-400 leading-relaxed">
                        {order.house_no}, {order.street}, {order.city}, {order.pincode}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Phone className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                    <a href={`tel:${order.user_phone}`} className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline">
                      {order.user_phone}
                    </a>
                  </div>
                </div>

                <div className="pt-4 border-t border-black/5 dark:border-white/5 flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-gray-500 dark:text-slate-400 text-xs">
                    <Clock className="w-4 h-4" />
                    <span>{new Date(order.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="font-bold text-gray-900 dark:text-slate-100">₹{order.final_amount}</p>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-slate-900/50 p-4 flex gap-3">
                {order.status === 'confirmed' && (
                  <button 
                    onClick={() => updateStatus(order.id, 'shipped')}
                    disabled={updating === order.id}
                    className="flex-grow bg-[#D4820A] text-white py-3 rounded-2xl font-bold text-sm flex items-center justify-center space-x-2 hover:bg-[#B87008] transition-all disabled:opacity-50"
                  >
                    <Truck className="w-4 h-4" />
                    <span>Mark as Shipped</span>
                  </button>
                )}
                {order.status === 'shipped' && (
                  <button 
                    onClick={() => updateStatus(order.id, 'delivered')}
                    disabled={updating === order.id}
                    className="flex-grow bg-emerald-600 text-white py-3 rounded-2xl font-bold text-sm flex items-center justify-center space-x-2 hover:bg-emerald-700 transition-all disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Mark as Delivered</span>
                  </button>
                )}
                {order.status === 'delivered' && (
                  <div className="flex-grow text-center py-3 text-emerald-600 dark:text-emerald-400 font-bold text-sm flex items-center justify-center space-x-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Order Delivered</span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
