import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Package, MapPin, Clock, ChevronRight, User as UserIcon, X, Truck, Edit, Save, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Profile() {
  const { user, token, login } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [wishlistLoading, setWishlistLoading] = useState(true);
  const [addressesLoading, setAddressesLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'orders' | 'wishlist' | 'addresses'>('orders');
  
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

  useEffect(() => {
    if (token) {
      fetchOrders();
      fetchWishlist();
      fetchAddresses();
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
      }
    } catch (err) {
      console.error('Failed to save address:', err);
    }
  };

  const handleDeleteAddress = async (id: number) => {
    if (!confirm('Are you sure you want to delete this address?')) return;
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
            <button 
              onClick={() => {
                setEditFormData({ name: user?.name || '', phone: user?.phone || '' });
                setShowEditModal(true);
              }}
              className="text-xs font-bold text-gray-400 hover:text-[#D4820A] flex items-center space-x-1 transition-colors"
            >
              <Edit className="w-3 h-3" />
              <span>Edit Profile</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-black/5 dark:border-white/10 transition-all hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-white/5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-500 dark:text-white font-medium">Total Orders</p>
            <Package className="w-4 h-4 text-[#D4820A]" />
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-slate-100">{orders.length}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-black/5 dark:border-white/10 transition-all hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-white/5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-500 dark:text-white font-medium">Total Spent</p>
            <span className="text-[#D4820A] font-bold">₹</span>
          </div>
          <p className="text-3xl font-bold text-[#D4820A]">₹{orders.reduce((acc: number, o: any) => acc + o.final_amount, 0)}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-black/5 dark:border-white/10 transition-all hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-white/5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-500 dark:text-white font-medium">Wishlist Items</p>
            <span className="text-red-500">❤️</span>
          </div>
          <p className="text-3xl font-bold text-red-500">{wishlist.length}</p>
        </div>
      </div>
      
      <div className="flex border-b border-black/5 dark:border-white/10">
        <button 
          onClick={() => setActiveTab('orders')}
          className={`px-8 py-4 font-bold transition-all border-b-2 ${activeTab === 'orders' ? 'border-[#D4820A] text-[#D4820A]' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
        >
          My Orders
        </button>
        <button 
          onClick={() => setActiveTab('wishlist')}
          className={`px-8 py-4 font-bold transition-all border-b-2 ${activeTab === 'wishlist' ? 'border-[#D4820A] text-[#D4820A]' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
        >
          Wishlist
        </button>
        <button 
          onClick={() => setActiveTab('addresses')}
          className={`px-8 py-4 font-bold transition-all border-b-2 ${activeTab === 'addresses' ? 'border-[#D4820A] text-[#D4820A]' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
        >
          Addresses
        </button>
      </div>

      {activeTab === 'orders' ? (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Order History</h2>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="relative w-full sm:w-64">
                <input 
                  type="text"
                  placeholder="Search by ID, date or status..."
                  className="w-full p-2 pl-3 pr-10 rounded-xl border border-black/5 dark:border-white/10 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#D4820A]/20"
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
                <span className="text-sm text-gray-500 dark:text-slate-300 whitespace-nowrap">Status:</span>
                <select 
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full sm:w-auto p-2 rounded-xl border border-black/5 dark:border-white/10 bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#D4820A]/20"
                >
                  <option value="">All Orders</option>
                  <option value="processing">Processing</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
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
                <button 
                  key={order.id} 
                  onClick={() => fetchOrderDetails(order.id)}
                  className="w-full text-left bg-white dark:bg-slate-800 p-6 rounded-2xl border border-black/5 dark:border-white/10 hover:shadow-md transition-all group"
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
                            {order.status}
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
                    
                    <div className="flex items-center justify-between md:justify-end gap-8">
                      <div className="text-right">
                        <p className="text-sm text-gray-500 dark:text-slate-300">Total Amount</p>
                        <p className="text-xl font-bold text-[#D4820A]">₹{order.final_amount}</p>
                      </div>
                      <ChevronRight className="w-6 h-6 text-gray-300 dark:text-slate-600 group-hover:text-[#D4820A] transition-colors" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 p-12 rounded-3xl border border-black/5 dark:border-white/10 text-center space-y-4 transition-colors">
              <Package className="w-12 h-12 text-gray-300 dark:text-slate-600 mx-auto" />
              <p className="text-gray-500 dark:text-slate-300 font-medium">No orders found with this status.</p>
              <Link to="/products" className="inline-block text-[#D4820A] font-bold">Start Shopping</Link>
            </div>
          )}
        </div>
      ) : activeTab === 'wishlist' ? (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">My Wishlist</h2>
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
                    <p className="text-sm text-[#D4820A]">By {product.farmer_name}</p>
                    <p className="text-lg font-bold mt-1 text-gray-900 dark:text-slate-100">₹{product.price}</p>
                    <div className="flex items-center space-x-3 mt-2">
                      <Link to={`/products/${product.id}`} className="text-xs font-bold text-blue-600 hover:underline">View Details</Link>
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
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 p-12 rounded-3xl border border-black/5 dark:border-white/10 text-center space-y-4 transition-colors">
              <div className="text-5xl">❤️</div>
              <p className="text-gray-500 dark:text-slate-300 font-medium">Your wishlist is empty.</p>
              <Link to="/products" className="inline-block text-[#D4820A] font-bold">Explore Products</Link>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Saved Addresses</h2>
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
              <span>+ Add New Address</span>
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
                        {addr.label}
                      </span>
                      {addr.is_default && (
                        <span className="text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">Default</span>
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
                      Set as Default
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 p-12 rounded-3xl border border-black/5 dark:border-white/10 text-center space-y-4 transition-colors">
              <MapPin className="w-12 h-12 text-gray-300 dark:text-slate-600 mx-auto" />
              <p className="text-gray-500 dark:text-slate-300 font-medium">You haven't saved any addresses yet.</p>
            </div>
          )}
        </div>
      )}

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md p-8 space-y-6 animate-in zoom-in-95 transition-colors">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Edit Profile</h3>
              <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors">
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>
            
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-700 dark:text-white">Full Name</label>
                <input 
                  type="text"
                  required
                  className="w-full p-4 rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#D4820A]/20 transition-colors"
                  value={editFormData.name}
                  onChange={e => setEditFormData({...editFormData, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-700 dark:text-white">Mobile Number</label>
                <input 
                  type="tel"
                  className="w-full p-4 rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#D4820A]/20 transition-colors"
                  placeholder="10-digit mobile number"
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
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isUpdatingProfile}
                  className="flex-1 bg-[#D4820A] text-white px-6 py-4 rounded-2xl font-bold hover:bg-[#B87008] transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  {isUpdatingProfile ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  <span>Save Changes</span>
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
                {editingAddress ? 'Edit Address' : 'Add New Address'}
              </h3>
              <button onClick={() => setShowAddressModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors">
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>
            
            <form onSubmit={handleSaveAddress} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-700 dark:text-white">Label</label>
                  <select 
                    className="w-full p-4 rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#D4820A]/20 transition-colors"
                    value={addressFormData.label}
                    onChange={e => setAddressFormData({...addressFormData, label: e.target.value})}
                  >
                    <option value="Home">Home</option>
                    <option value="Work">Work</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-700 dark:text-white">Mobile Number</label>
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
                  <label className="block text-sm font-bold text-gray-700 dark:text-white">House/Flat No.</label>
                  <input 
                    type="text"
                    required
                    className="w-full p-4 rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#D4820A]/20 transition-colors"
                    value={addressFormData.house_no}
                    onChange={e => setAddressFormData({...addressFormData, house_no: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-700 dark:text-white">Landmark</label>
                  <input 
                    type="text"
                    className="w-full p-4 rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#D4820A]/20 transition-colors"
                    value={addressFormData.landmark}
                    onChange={e => setAddressFormData({...addressFormData, landmark: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-700 dark:text-white">Street/Locality</label>
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
                  <label className="block text-sm font-bold text-gray-700 dark:text-white">City</label>
                  <input 
                    type="text"
                    required
                    className="w-full p-4 rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#D4820A]/20 transition-colors"
                    value={addressFormData.city}
                    onChange={e => setAddressFormData({...addressFormData, city: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-700 dark:text-white">District</label>
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
                  <label className="block text-sm font-bold text-gray-700 dark:text-white">State</label>
                  <input 
                    type="text"
                    required
                    className="w-full p-4 rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#D4820A]/20 transition-colors"
                    value={addressFormData.state}
                    onChange={e => setAddressFormData({...addressFormData, state: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-700 dark:text-white">Pincode</label>
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
                <span className="text-sm font-bold dark:text-white">Set as default address</span>
              </label>
              
              <div className="flex space-x-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowAddressModal(false)}
                  className="flex-1 px-6 py-4 rounded-2xl font-bold text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 bg-[#D4820A] text-white px-6 py-4 rounded-2xl font-bold hover:bg-[#B87008] transition-all flex items-center justify-center space-x-2"
                >
                  <Save className="w-5 h-5" />
                  <span>{editingAddress ? 'Update Address' : 'Save Address'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
