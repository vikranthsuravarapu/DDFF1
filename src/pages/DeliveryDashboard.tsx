import React, { useState, useEffect, useRef } from 'react';
import { Package, MapPin, Phone, Truck, CheckCircle2, Clock, ChevronRight, LogOut, Camera, X, Loader2, Upload, Wallet, TrendingUp, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

export default function DeliveryDashboard() {
  const { user, token, logout } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [earnings, setEarnings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [earningsLoading, setEarningsLoading] = useState(true);
  const [showRecentEarnings, setShowRecentEarnings] = useState(false);
  const [updating, setUpdating] = useState<number | null>(null);
  const [showPodModal, setShowPodModal] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [podImage, setPodImage] = useState<File | null>(null);
  const [podPreview, setPodPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const fetchEarnings = async () => {
    setEarningsLoading(true);
    try {
      const res = await fetch('/api/delivery/earnings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setEarnings(data);
    } catch (e) {
      console.error('Failed to fetch earnings:', e);
    } finally {
      setEarningsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchOrders();
      fetchEarnings();
    }
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
        fetchEarnings();
      }
    } catch (e) {
      console.error('Failed to update status:', e);
    } finally {
      setUpdating(null);
    }
  };

  const handlePodFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPodImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPodPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const submitPod = async () => {
    if (!selectedOrderId || !podImage) return;
    
    setUploading(true);
    const formData = new FormData();
    formData.append('proof', podImage);

    try {
      const res = await fetch(`/api/delivery/orders/${selectedOrderId}/proof`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (res.ok) {
        setShowPodModal(false);
        setSelectedOrderId(null);
        setPodImage(null);
        setPodPreview(null);
        fetchOrders();
        fetchEarnings();
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to upload proof');
      }
    } catch (e) {
      console.error('Failed to upload POD:', e);
      alert('Network error. Please try again.');
    } finally {
      setUploading(false);
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
      {/* Earnings Section */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-black/5 dark:border-white/10 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100 flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
            <span>Your Earnings</span>
          </h2>
          {earningsLoading && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
        </div>

        {earningsLoading && !earnings ? (
          <div className="grid grid-cols-3 gap-3 animate-pulse">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-gray-100 dark:bg-slate-700 rounded-2xl" />
            ))}
          </div>
        ) : earnings ? (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-2xl text-center border border-emerald-100 dark:border-emerald-900/30">
                <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Today</p>
                <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">₹{earnings.today.amount}</p>
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-2xl text-center border border-emerald-100 dark:border-emerald-900/30">
                <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Week</p>
                <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">₹{earnings.week.amount}</p>
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-2xl text-center border border-emerald-100 dark:border-emerald-900/30">
                <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Month</p>
                <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">₹{earnings.month.amount}</p>
              </div>
            </div>

            <div className="flex items-center justify-center space-x-2 text-sm font-bold text-gray-700 dark:text-slate-300">
              <span className="text-xl">🚴</span>
              <span>{earnings.total.count} total deliveries completed</span>
            </div>

            <div className="border-t border-black/5 dark:border-white/5 pt-4">
              <button 
                onClick={() => setShowRecentEarnings(!showRecentEarnings)}
                className="w-full flex items-center justify-between text-sm font-bold text-gray-500 dark:text-slate-400 hover:text-gray-700 transition-colors"
              >
                <span>Recent Earnings</span>
                {showRecentEarnings ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              <AnimatePresence>
                {showRecentEarnings && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-4 space-y-3">
                      {earnings.recent.length === 0 ? (
                        <p className="text-xs text-center text-gray-400 py-4">No recent earnings found.</p>
                      ) : (
                        earnings.recent.map((log: any) => (
                          <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-900/50 rounded-xl border border-black/5 dark:border-white/5">
                            <div className="flex flex-col">
                              <span className="text-[10px] font-bold text-gray-400 uppercase">#DDFF-{log.id.toString().padStart(4, '0')}</span>
                              <span className="text-xs font-bold text-gray-700 dark:text-slate-200">{log.city}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">₹{log.delivery_fee_earned}</span>
                              <p className="text-[10px] text-gray-400">{new Date(log.delivered_at).toLocaleDateString()}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        ) : null}
      </div>

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
                  <div className="flex items-center space-x-2">
                    {order.delivery_slot && (
                      <span className="text-[10px] font-bold px-2 py-1 rounded-lg uppercase bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                        {order.delivery_slot}
                      </span>
                    )}
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-lg uppercase ${
                      order.status === 'delivered' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                      order.status === 'shipped' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                      'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <MapPin className="w-5 h-5 text-[#D4820A] mt-1 flex-shrink-0" />
                    <div>
                      <p className="font-bold text-gray-900 dark:text-slate-100">{order.user_name}</p>
                      <p className="text-sm text-gray-500 dark:text-slate-400 leading-relaxed">
                        {order.house_no}, {order.street}, {order.city}, {order.pincode}
                      </p>
                      <a 
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${order.house_no}, ${order.street}, ${order.city}, ${order.pincode}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-1 text-xs font-bold text-[#D4820A] hover:underline mt-1"
                      >
                        <MapPin className="w-3 h-3" />
                        <span>Open in Maps</span>
                      </a>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Phone className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold text-gray-400">Customer Phone</span>
                      <a href={`tel:${order.phone || order.user_phone}`} className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline">
                        {order.phone || order.user_phone || 'Not provided'}
                      </a>
                    </div>
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
                <a 
                  href={`tel:${order.phone || order.user_phone}`}
                  className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center hover:bg-emerald-200 transition-all"
                  title="Call Customer"
                >
                  <Phone className="w-5 h-5" />
                </a>
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
                    onClick={() => {
                      setSelectedOrderId(order.id);
                      setShowPodModal(true);
                    }}
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

      <AnimatePresence>
        {showPodModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="bg-white dark:bg-slate-800 w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] overflow-hidden shadow-2xl"
            >
              <div className="p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Proof of Delivery</h3>
                  <button 
                    onClick={() => {
                      setShowPodModal(false);
                      setPodImage(null);
                      setPodPreview(null);
                    }}
                    className="p-2 bg-gray-100 dark:bg-slate-700 rounded-full text-gray-500 dark:text-slate-400"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <p className="text-gray-500 dark:text-slate-400">
                  Please capture or upload a photo of the delivered package as proof.
                </p>

                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative aspect-video rounded-3xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden ${
                    podPreview ? 'border-emerald-500' : 'border-gray-200 dark:border-slate-700 hover:border-[#D4820A]'
                  }`}
                >
                  {podPreview ? (
                    <>
                      <img src={podPreview} alt="POD Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <Camera className="w-10 h-10 text-white" />
                      </div>
                    </>
                  ) : (
                    <div className="text-center space-y-3 p-6">
                      <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto">
                        <Camera className="w-8 h-8 text-[#D4820A]" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 dark:text-slate-100">Take a Photo</p>
                        <p className="text-xs text-gray-500 dark:text-slate-400">or tap to upload from gallery</p>
                      </div>
                    </div>
                  )}
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handlePodFileChange}
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                  />
                </div>

                <button
                  onClick={submitPod}
                  disabled={!podImage || uploading}
                  className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold text-lg flex items-center justify-center space-x-3 hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-200 dark:shadow-none"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-6 h-6" />
                      <span>Complete Delivery</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
