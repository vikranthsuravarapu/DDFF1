import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Package, MapPin, Clock, ChevronRight, User as UserIcon, X, Truck, Edit, Save, Loader2, RefreshCw, Wallet, Search, Heart } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useLanguage } from '../contexts/LanguageContext';
import { formatCurrency } from '../utils/format';

export default function Profile() {
  const { user, token, login, userLocation, setIsLocationModalOpen, refreshUser } = useAuth();
  const { addItem, setNotification } = useCart();
  const { t } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.role === 'delivery_boy') {
      navigate('/delivery');
    }
  }, [user, navigate]);
  const [orders, setOrders] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [wishlistLoading, setWishlistLoading] = useState(true);
  const [addressesLoading, setAddressesLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'orders' | 'wishlist' | 'addresses' | 'wallet'>('orders');
  const [walletTransactions, setWalletTransactions] = useState([]);
  const [walletLoading, setWalletLoading] = useState(true);
  const [referralData, setReferralData] = useState<{referral_code: string, successful_referrals: number} | null>(null);
  const [referralLoading, setReferralLoading] = useState(true);
  
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || ''
  });
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState<any>(null);
  const [addressFormData, setAddressFormData] = useState({
    label: 'Home',
    house_no: '',
    street: '',
    landmark: '',
    address: '',
    city: '',
    district: '',
    state: '',
    pincode: '',
    phone: user?.phone || '',
    is_default: false
  });
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [deliveryZones, setDeliveryZones] = useState<any[]>([]);

  const fetchOrders = async () => {
    setLoading(true);
    let url = '/api/orders';
    if (statusFilter) url += `?status=${statusFilter}`;
    
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    setOrders(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  const fetchWishlist = async () => {
    setWishlistLoading(true);
    const res = await fetch('/api/wishlist', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    setWishlist(Array.isArray(data) ? data : []);
    setWishlistLoading(false);
  };

  const fetchAddresses = async () => {
    setAddressesLoading(true);
    const res = await fetch('/api/user/saved-addresses', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    setAddresses(Array.isArray(data) ? data : []);
    setAddressesLoading(false);
  };

  const fetchWalletTransactions = async () => {
    setWalletLoading(true);
    const res = await fetch('/api/wallet/transactions', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    setWalletTransactions(Array.isArray(data) ? data : []);
    setWalletLoading(false);
  };

  const fetchReferralData = async () => {
    setReferralLoading(true);
    try {
      const res = await fetch('/api/referrals/my-code', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setReferralData(data);
    } catch (err) {
      console.error('Failed to fetch referral data:', err);
    } finally {
      setReferralLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      refreshUser();
      fetchOrders();
      fetchWishlist();
      fetchAddresses();
      fetchWalletTransactions();
      fetchReferralData();
      
      fetch('/api/delivery-zones')
        .then(res => res.json())
        .then(data => setDeliveryZones(data))
        .catch(err => console.error('Failed to fetch delivery zones:', err));
    }
  }, [token, statusFilter]);

  const fetchOrderDetails = async (orderId: number) => {
    navigate(`/orders/${orderId}`);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingProfile(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editFormData)
      });
      if (res.ok) {
        const data = await res.json();
        login(token!, data.user);
        setShowEditModal(false);
      }
    } catch (err) {
      console.error('Failed to update profile:', err);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate delivery zone
    const zone = deliveryZones.find((z: any) => z.pincode === addressFormData.pincode && z.is_active);
    if (!zone) {
      alert(t('pincode_not_delivered'));
      return;
    }

    const method = editingAddress ? 'PUT' : 'POST';
    const url = editingAddress ? `/api/user/saved-addresses/${editingAddress.id}` : '/api/user/saved-addresses';
    
    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(addressFormData)
      });
      if (res.ok) {
        fetchAddresses();
        setShowAddressModal(false);
        setEditingAddress(null);
      } else {
        const data = await res.json();
        alert(data.error || t('failed_save_address'));
      }
    } catch (err) {
      console.error('Failed to save address:', err);
    }
  };

  const handleDeleteAddress = async (id: number) => {
    if (!confirm(t('delete_address_confirm'))) return;
    try {
      const res = await fetch(`/api/user/saved-addresses/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchAddresses();
    } catch (err) {
      console.error('Failed to delete address:', err);
    }
  };

  const handleSetDefaultAddress = async (id: number) => {
    try {
      const res = await fetch(`/api/user/saved-addresses/${id}/default`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchAddresses();
    } catch (err) {
      console.error('Failed to set default address:', err);
    }
  };

  const [isRepeating, setIsRepeating] = useState<number | null>(null);

  const handleRepeatOrder = async (e: React.MouseEvent, orderId: number) => {
    e.stopPropagation();
    if (isRepeating) return;
    
    setIsRepeating(orderId);
    try {
      const orderRes = await fetch(`/api/orders/${orderId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const orderData = await orderRes.json();
      
      if (!orderData.items || orderData.items.length === 0) {
        setNotification(t('no_items_order'));
        return;
      }

      const productsRes = await fetch('/api/products');
      const allProducts = await productsRes.json();

      let addedCount = 0;
      let warnings: string[] = [];

      for (const item of orderData.items) {
        const currentProduct = allProducts.find((p: any) => p.id === item.product_id);
        
        if (currentProduct && currentProduct.stock > 0) {
          // Add only what's available
          const qtyToAdd = Math.min(item.quantity, currentProduct.stock);
          addItem(currentProduct, qtyToAdd);
          addedCount++;
          
          if (qtyToAdd < item.quantity) {
            warnings.push(`⚠️ Only ${qtyToAdd} units of ${item.name} were available and added.`);
          }
        } else {
          warnings.push(`⚠️ ${item.name} is currently out of stock and was not added.`);
        }
      }

      if (warnings.length > 0) {
        // Show warnings sequentially
        warnings.forEach((w, index) => {
          setTimeout(() => setNotification(w), index * 2000);
        });
        
        if (addedCount > 0) {
          setTimeout(() => {
            setNotification(t('items_added_cart'));
            navigate('/products');
          }, warnings.length * 2000);
        }
      } else if (addedCount > 0) {
        setNotification(t('items_added_cart'));
        navigate('/products');
      }
    } catch (err) {
      console.error('Failed to repeat order:', err);
      setNotification(t('failed_repeat_order'));
    } finally {
      setIsRepeating(null);
    }
  };

  const filteredOrders = orders.filter((order: any) => {
    const searchLower = orderSearchQuery.toLowerCase();
    const orderIdStr = `#DDFF-${order.id.toString().padStart(4, '0')}`.toLowerCase();
    const dateStr = new Date(order.created_at).toLocaleDateString().toLowerCase();
    const statusStr = order.status.toLowerCase();

    return orderIdStr.includes(searchLower) || 
           dateStr.includes(searchLower) || 
           statusStr.includes(searchLower) ||
           order.id.toString().includes(searchLower);
  });

  return (
    <div className="max-w-4xl mx-auto space-y-12">
      {/* Profile Header */}
      <div className="flex items-center space-x-6 bg-white dark:bg-slate-800 p-8 rounded-3xl border border-black/5 dark:border-white/10 transition-colors">
        <div className="bg-[#D4820A] w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl font-bold">
          {user?.name[0]}
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">{user?.name}</h1>
          <p className="text-gray-500 dark:text-slate-300">{user?.email}</p>
          {user?.phone && <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{user.phone}</p>}
          <div className="flex items-center space-x-3 mt-2">
            <span className="inline-block bg-[#D4820A]/10 text-[#D4820A] px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
              {user?.role}
            </span>
            <div className="flex items-center text-[#D4820A] text-sm font-bold">
              <Wallet className="w-4 h-4 mr-1" />
              {formatCurrency(user?.wallet_balance || 0)}
            </div>
            <button 
              onClick={() => {
                setEditFormData({ name: user?.name || '', phone: user?.phone || '' });
                setShowEditModal(true);
              }}
              className="text-xs font-bold text-gray-400 hover:text-[#D4820A] flex items-center space-x-1 transition-colors"
            >
              <Edit className="w-3 h-3" />
              <span>{t('edit_profile')}</span>
            </button>
          </div>
          
          {userLocation && (
            <div className="mt-4 pt-4 border-t border-black/5 dark:border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-gray-600 dark:text-slate-300">
                  <MapPin className="w-4 h-4 text-[#D4820A]" />
                  <span className="text-sm font-medium">{t('delivering_to')}: <span className="font-bold text-gray-900 dark:text-white uppercase tracking-wider">{userLocation}</span></span>
                </div>
                <button 
                  onClick={() => setIsLocationModalOpen(true)}
                  className="text-xs font-bold text-[#D4820A] hover:underline"
                >
                  {t('change_location')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-black/5 dark:border-white/10 transition-all hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-white/5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-500 dark:text-white font-medium">{t('total_orders')}</p>
            <Package className="w-4 h-4 text-[#D4820A]" />
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-slate-100">{orders.length}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-black/5 dark:border-white/10 transition-all hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-white/5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-500 dark:text-white font-medium">{t('total_spent')}</p>
            <span className="text-[#D4820A] font-bold">₹</span>
          </div>
          <p className="text-3xl font-bold text-[#D4820A]">
            {formatCurrency(orders.reduce((acc: number, o: any) => acc + Number(o.final_amount || 0), 0))}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-black/5 dark:border-white/10 transition-all hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-white/5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-500 dark:text-white font-medium">{t('wishlist_items')}</p>
            <span className="text-red-500">❤️</span>
          </div>
          <p className="text-3xl font-bold text-red-500">{wishlist.length}</p>
        </div>
      </div>

      {/* Refer & Earn Section */}
      <div className="bg-gradient-to-br from-[#D4820A]/5 to-[#D4820A]/10 dark:from-[#D4820A]/10 dark:to-[#D4820A]/20 p-8 rounded-3xl border border-[#D4820A]/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Package className="w-32 h-32 rotate-12" />
        </div>
        
        <div className="relative z-10 space-y-6">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">🎁</span>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('refer_earn')}</h2>
          </div>
          
          <p className="text-gray-600 dark:text-slate-300 max-w-lg">
            {t('referral_desc')}
          </p>

          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="w-full md:w-auto">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">{t('your_referral_code')}</p>
              <div className="flex items-center space-x-3">
                <div className="px-6 py-3 bg-white dark:bg-slate-900 border-2 border-dashed border-[#D4820A] rounded-2xl font-mono text-2xl font-bold text-[#D4820A] tracking-widest">
                  {referralLoading ? '...' : referralData?.referral_code || 'N/A'}
                </div>
                <button 
                  onClick={() => {
                    if (referralData?.referral_code) {
                      navigator.clipboard.writeText(referralData.referral_code);
                      setNotification(t('referral_code_copied'));
                    }
                  }}
                  className="p-3 bg-white dark:bg-slate-800 border border-black/5 dark:border-white/10 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
                  title={t('copy_code')}
                >
                  <Save className="w-5 h-5 text-[#D4820A]" />
                </button>
              </div>
            </div>

            <div className="flex-grow flex flex-col sm:flex-row gap-3 w-full">
              <button 
                onClick={() => {
                  const text = `${t('referral_whatsapp_text')} ${referralData?.referral_code}`;
                  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                }}
                className="flex-1 bg-[#25D366] text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center space-x-2 hover:opacity-90 transition-all shadow-lg shadow-[#25D366]/20"
              >
                <span className="text-xl">📱</span>
                <span>{t('share_whatsapp')}</span>
              </button>
              
              <div className="bg-white/50 dark:bg-black/20 px-6 py-3 rounded-2xl border border-black/5 dark:border-white/5 flex flex-col justify-center min-w-[140px]">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-tight">{t('successful_referrals')}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{referralLoading ? '...' : referralData?.successful_referrals || 0}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex border-b border-black/5 dark:border-white/10 overflow-x-auto no-scrollbar">
        <button 
          onClick={() => setActiveTab('wallet')}
          className={`px-6 py-4 font-bold transition-all border-b-2 whitespace-nowrap flex items-center space-x-2 ${activeTab === 'wallet' ? 'border-[#D4820A] text-[#D4820A]' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
        >
          <Wallet className="w-4 h-4" />
          <span>{t('wallet')}</span>
        </button>
        <button 
          onClick={() => setActiveTab('orders')}
          className={`px-6 py-4 font-bold transition-all border-b-2 whitespace-nowrap flex items-center space-x-2 ${activeTab === 'orders' ? 'border-[#D4820A] text-[#D4820A]' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
        >
          <Package className="w-4 h-4" />
          <span>{t('my_orders')}</span>
        </button>
        <button 
          onClick={() => setActiveTab('wishlist')}
          className={`px-6 py-4 font-bold transition-all border-b-2 whitespace-nowrap flex items-center space-x-2 ${activeTab === 'wishlist' ? 'border-[#D4820A] text-[#D4820A]' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
        >
          <Heart className="w-4 h-4 text-red-500" />
          <span>{t('wishlist')}</span>
        </button>
        <button 
          onClick={() => setActiveTab('addresses')}
          className={`px-6 py-4 font-bold transition-all border-b-2 whitespace-nowrap flex items-center space-x-2 ${activeTab === 'addresses' ? 'border-[#D4820A] text-[#D4820A]' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
        >
          <MapPin className="w-4 h-4" />
          <span>{t('addresses')}</span>
        </button>
      </div>

      {activeTab === 'wallet' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-black/5 dark:border-white/10">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-4">
                <div className="bg-[#D4820A]/10 p-4 rounded-2xl text-[#D4820A]">
                  <Wallet className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold dark:text-white">{t('wallet_balance')}</h2>
                  <p className="text-gray-500 dark:text-slate-400">{t('manage_credits')}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-4xl font-bold text-[#D4820A]">{formatCurrency(user?.wallet_balance || 0)}</p>
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{t('available_balance')}</p>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-bold dark:text-white">{t('recent_transactions')}</h3>
              {walletLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-50 dark:bg-slate-900/50 rounded-xl animate-pulse" />)}
                </div>
              ) : walletTransactions.length > 0 ? (
                <div className="overflow-hidden rounded-2xl border border-black/5 dark:border-white/10">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-slate-900/50">
                        <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">{t('date')}</th>
                        <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">{t('description')}</th>
                        <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">{t('type')}</th>
                        <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400 text-right">{t('amount')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5 dark:divide-white/10">
                      {walletTransactions.map((tx: any) => (
                        <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-slate-900/30 transition-colors">
                          <td className="p-4 text-sm dark:text-white">{new Date(tx.created_at).toLocaleDateString()}</td>
                          <td className="p-4 text-sm dark:text-white">{tx.description}</td>
                          <td className="p-4">
                            <span className={`text-[10px] font-bold px-2 py-1 rounded-lg uppercase ${
                              tx.type === 'credit' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                            }`}>
                              {tx.type}
                            </span>
                          </td>
                          <td className={`p-4 text-sm font-bold text-right ${tx.type === 'credit' ? 'text-emerald-600' : 'text-red-600'}`}>
                            {tx.type === 'credit' ? '+' : '-'}{formatCurrency(tx.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-black/10 dark:border-white/20">
                  <Wallet className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-slate-400">{t('no_transactions')}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">{t('order_history')}</h2>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="text"
                  placeholder={t('search_orders')}
                  className="w-full p-2 pl-10 pr-10 rounded-xl border border-black/5 dark:border-white/10 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#D4820A]/20"
                  value={orderSearchQuery}
                  onChange={(e) => setOrderSearchQuery(e.target.value)}
                />
                {orderSearchQuery && (
                  <button 
                    onClick={() => setOrderSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors"
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                )}
              </div>
              <div className="flex items-center space-x-3 w-full sm:w-auto">
                <span className="text-sm text-gray-500 dark:text-slate-300 whitespace-nowrap">{t('status')}:</span>
                <select 
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full sm:w-auto p-2 rounded-xl border border-black/5 dark:border-white/10 bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#D4820A]/20"
                >
                  <option value="">{t('all_orders')}</option>
                  <option value="processing">{t('status_processing')}</option>
                  <option value="confirmed">{t('status_confirmed')}</option>
                  <option value="shipped">{t('status_shipped')}</option>
                  <option value="delivered">{t('status_delivered')}</option>
                  <option value="cancelled">{t('status_cancelled')}</option>
                </select>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2].map(i => <div key={i} className="h-32 bg-white dark:bg-slate-800 rounded-2xl animate-pulse transition-colors" />)}
            </div>
          ) : filteredOrders.length > 0 ? (
            <div className="space-y-4">
              {filteredOrders.map((order: any) => (
                <div 
                  key={order.id} 
                  onClick={() => fetchOrderDetails(order.id)}
                  className="w-full text-left bg-white dark:bg-slate-800 p-6 rounded-2xl border border-black/5 dark:border-white/10 hover:shadow-md transition-all group cursor-pointer"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center space-x-4">
                      <div className="bg-[#F0E6D3] dark:bg-slate-700 p-3 rounded-xl text-[#D4820A] transition-colors">
                        <Package className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-lg text-gray-900 dark:text-slate-100">Order #DDFF-{order.id.toString().padStart(4, '0')}</span>
                          <span className={`text-xs font-bold px-2 py-1 rounded-lg uppercase ${
                            order.status === 'delivered' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                            order.status === 'processing' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                            order.status === 'cancelled' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                            'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                          }`}>
                            {t(`status_${order.status}`)}
                          </span>
                        </div>
                        <div className="flex items-center space-x-3 text-sm text-gray-500 dark:text-slate-300 mt-1">
                          <div className="flex items-center space-x-1">
                            <Clock className="w-4 h-4" />
                            <span>{new Date(order.created_at).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <MapPin className="w-4 h-4" />
                            <span>{order.city}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row items-center justify-between md:justify-end gap-4 md:gap-8">
                      <div className="text-right">
                        <p className="text-sm text-gray-500 dark:text-slate-300">{t('total_amount')}</p>
                        <p className="text-xl font-bold text-[#D4820A]">{formatCurrency(order.final_amount)}</p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={(e) => handleRepeatOrder(e, order.id)}
                          disabled={isRepeating === order.id}
                          className="flex items-center space-x-2 bg-[#D4820A]/10 text-[#D4820A] px-4 py-2 rounded-xl text-sm font-bold hover:bg-[#D4820A] hover:text-white transition-all disabled:opacity-50"
                        >
                          {isRepeating === order.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <RefreshCw className="w-4 h-4" />
                          )}
                          <span>{t('order_again')}</span>
                        </button>
                        <ChevronRight className="w-6 h-6 text-gray-300 dark:text-slate-600 group-hover:text-[#D4820A] transition-colors" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 p-12 rounded-3xl border border-black/5 dark:border-white/10 text-center space-y-4 transition-colors">
              <Package className="w-12 h-12 text-gray-300 dark:text-slate-600 mx-auto" />
              <p className="text-gray-500 dark:text-slate-300 font-medium">{t('no_orders_found')}</p>
              <Link to="/products" className="inline-block text-[#D4820A] font-bold">{t('start_shopping')}</Link>
            </div>
          )}
        </div>
      )}

      {activeTab === 'wishlist' && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">{t('my_wishlist')}</h2>
          {wishlistLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2].map(i => <div key={i} className="h-48 bg-white dark:bg-slate-800 rounded-2xl animate-pulse transition-colors" />)}
            </div>
          ) : wishlist.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {wishlist.map((product: any) => (
                <div key={product.id} className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-black/5 dark:border-white/10 flex items-center space-x-4 transition-colors">
                  <img src={product.image_url} alt={product.name} className="w-24 h-24 rounded-xl object-cover" />
                  <div className="flex-grow">
                    <h3 className="font-bold text-gray-900 dark:text-slate-100">{product.name}</h3>
                    <p className="text-sm text-[#D4820A]">{t('by')} {product.farmer_name}</p>
                    <p className="text-lg font-bold mt-1 text-gray-900 dark:text-slate-100">{formatCurrency(product.price)}</p>
                    <div className="flex items-center space-x-3 mt-2">
                      <Link to={`/products/${product.id}`} className="text-xs font-bold text-blue-600 hover:underline">{t('view_details')}</Link>
                      <button 
                        onClick={async () => {
                          await fetch(`/api/wishlist/${product.id}`, {
                            method: 'DELETE',
                            headers: { 'Authorization': `Bearer ${token}` }
                          });
                          fetchWishlist();
                        }}
                        className="text-xs font-bold text-red-500 hover:underline"
                      >
                        {t('remove')}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 p-12 rounded-3xl border border-black/5 dark:border-white/10 text-center space-y-4 transition-colors">
              <div className="text-5xl">❤️</div>
              <p className="text-gray-500 dark:text-slate-300 font-medium">{t('wishlist_empty')}</p>
              <Link to="/products" className="inline-block text-[#D4820A] font-bold">{t('explore_products')}</Link>
            </div>
          )}
        </div>
      )}

      {activeTab === 'addresses' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">{t('saved_addresses')}</h2>
            <button 
              onClick={() => {
                setEditingAddress(null);
                setAddressFormData({
                  label: 'Home',
                  house_no: '',
                  street: '',
                  landmark: '',
                  address: '',
                  city: '',
                  district: '',
                  state: '',
                  pincode: '',
                  phone: user?.phone || '',
                  is_default: addresses.length === 0
                });
                setShowAddressModal(true);
              }}
              className="bg-[#D4820A] text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-[#B87008] transition-all flex items-center space-x-2"
            >
              <span>{t('add_new_address')}</span>
            </button>
          </div>

          {addressesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2].map(i => <div key={i} className="h-40 bg-white dark:bg-slate-800 rounded-2xl animate-pulse transition-colors" />)}
            </div>
          ) : addresses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {addresses.map((addr: any) => (
                <div key={addr.id} className={`bg-white dark:bg-slate-800 p-6 rounded-2xl border transition-all ${addr.is_default ? 'border-[#D4820A] ring-1 ring-[#D4820A]/20' : 'border-black/5 dark:border-white/10'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <span className="bg-[#D4820A]/10 text-[#D4820A] px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                        {t(addr.label.toLowerCase())}
                      </span>
                      {addr.is_default && (
                        <span className="text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">{t('default')}</span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => {
                          setEditingAddress(addr);
                          setAddressFormData({ ...addr });
                          setShowAddressModal(true);
                        }}
                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors text-gray-400 hover:text-blue-600"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteAddress(addr.id)}
                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors text-gray-400 hover:text-red-500"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-gray-900 dark:text-slate-100">{addr.house_no}, {addr.street}</p>
                    <p className="text-sm text-gray-500 dark:text-slate-300">{addr.landmark && `${addr.landmark}, `}{addr.city}, {addr.district}</p>
                    <p className="text-sm text-gray-500 dark:text-slate-300">{addr.state} - {addr.pincode}</p>
                    <p className="text-sm font-bold text-gray-700 dark:text-slate-200 mt-2 flex items-center space-x-1">
                      <span>📞</span>
                      <span>{addr.phone}</span>
                    </p>
                  </div>
                  {!addr.is_default && (
                    <button 
                      onClick={() => handleSetDefaultAddress(addr.id)}
                      className="mt-4 text-xs font-bold text-[#D4820A] hover:underline"
                    >
                      {t('set_default')}
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 p-12 rounded-3xl border border-black/5 dark:border-white/10 text-center space-y-4 transition-colors">
              <MapPin className="w-12 h-12 text-gray-300 dark:text-slate-600 mx-auto" />
              <p className="text-gray-500 dark:text-slate-300 font-medium">{t('no_addresses')}</p>
            </div>
          )}
        </div>
      )}

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md p-8 space-y-6 animate-in zoom-in-95 transition-colors">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-slate-100">{t('edit_profile')}</h3>
              <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors">
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>
            
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-700 dark:text-white">{t('full_name')}</label>
                <input 
                  type="text"
                  required
                  className="w-full p-4 rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#D4820A]/20 transition-colors"
                  value={editFormData.name}
                  onChange={e => setEditFormData({...editFormData, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-700 dark:text-white">{t('mobile_number')}</label>
                <input 
                  type="tel"
                  className="w-full p-4 rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#D4820A]/20 transition-colors"
                  placeholder={t('mobile_placeholder')}
                  value={editFormData.phone}
                  onChange={e => setEditFormData({...editFormData, phone: e.target.value})}
                />
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-6 py-4 rounded-2xl font-bold text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all"
                >
                  {t('cancel')}
                </button>
                <button 
                  type="submit"
                  disabled={isUpdatingProfile}
                  className="flex-1 bg-[#D4820A] text-white px-6 py-4 rounded-2xl font-bold hover:bg-[#B87008] transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  {isUpdatingProfile ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  <span>{t('save_changes')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Address Modal */}
      {showAddressModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-lg p-8 space-y-6 animate-in zoom-in-95 transition-colors overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                {editingAddress ? t('edit_address') : t('add_new_address')}
              </h3>
              <button onClick={() => setShowAddressModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors">
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>
            
            <form onSubmit={handleSaveAddress} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-700 dark:text-white">{t('label')}</label>
                  <select 
                    className="w-full p-4 rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#D4820A]/20 transition-colors"
                    value={addressFormData.label}
                    onChange={e => setAddressFormData({...addressFormData, label: e.target.value})}
                  >
                    <option value="Home">{t('home')}</option>
                    <option value="Work">{t('work')}</option>
                    <option value="Other">{t('other')}</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-700 dark:text-white">{t('mobile_number')}</label>
                  <input 
                    type="tel"
                    required
                    className="w-full p-4 rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#D4820A]/20 transition-colors"
                    value={addressFormData.phone}
                    onChange={e => setAddressFormData({...addressFormData, phone: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-700 dark:text-white">{t('house_no')}</label>
                  <input 
                    type="text"
                    required
                    className="w-full p-4 rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#D4820A]/20 transition-colors"
                    value={addressFormData.house_no}
                    onChange={e => setAddressFormData({...addressFormData, house_no: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-700 dark:text-white">{t('landmark')}</label>
                  <input 
                    type="text"
                    className="w-full p-4 rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#D4820A]/20 transition-colors"
                    value={addressFormData.landmark}
                    onChange={e => setAddressFormData({...addressFormData, landmark: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-700 dark:text-white">{t('street_locality')}</label>
                <input 
                  type="text"
                  required
                  className="w-full p-4 rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#D4820A]/20 transition-colors"
                  value={addressFormData.street}
                  onChange={e => setAddressFormData({...addressFormData, street: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-700 dark:text-white">{t('city')}</label>
                  <input 
                    type="text"
                    required
                    className="w-full p-4 rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#D4820A]/20 transition-colors"
                    value={addressFormData.city}
                    onChange={e => setAddressFormData({...addressFormData, city: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-700 dark:text-white">{t('district')}</label>
                  <input 
                    type="text"
                    required
                    className="w-full p-4 rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#D4820A]/20 transition-colors"
                    value={addressFormData.district}
                    onChange={e => setAddressFormData({...addressFormData, district: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-700 dark:text-white">{t('state')}</label>
                  <input 
                    type="text"
                    required
                    className="w-full p-4 rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#D4820A]/20 transition-colors"
                    value={addressFormData.state}
                    onChange={e => setAddressFormData({...addressFormData, state: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-700 dark:text-white">{t('pincode')}</label>
                  <input 
                    type="text"
                    required
                    className="w-full p-4 rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#D4820A]/20 transition-colors"
                    value={addressFormData.pincode}
                    onChange={e => setAddressFormData({...addressFormData, pincode: e.target.value})}
                  />
                </div>
              </div>

              <label className="flex items-center space-x-3 cursor-pointer group pt-2">
                <div className="relative flex items-center">
                  <input 
                    type="checkbox" 
                    className="peer h-5 w-5 cursor-pointer appearance-none rounded border border-slate-300 dark:border-slate-600 checked:border-[#D4820A] checked:bg-[#D4820A] transition-all"
                    checked={addressFormData.is_default}
                    onChange={e => setAddressFormData({...addressFormData, is_default: e.target.checked})}
                  />
                  <Package className="absolute left-0.5 top-0.5 h-4 w-4 text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                </div>
                <span className="text-sm font-bold dark:text-white">{t('set_default_address')}</span>
              </label>
              
              <div className="flex space-x-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowAddressModal(false)}
                  className="flex-1 px-6 py-4 rounded-2xl font-bold text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all"
                >
                  {t('cancel')}
                </button>
                <button 
                  type="submit"
                  className="flex-1 bg-[#D4820A] text-white px-6 py-4 rounded-2xl font-bold hover:bg-[#B87008] transition-all flex items-center justify-center space-x-2"
                >
                  <Save className="w-5 h-5" />
                  <span>{editingAddress ? t('update_address') : t('save_address')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
