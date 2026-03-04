import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, CreditCard, Truck, CheckCircle2, MapPin, Search, Navigation, Clock, XCircle, Loader2 } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';

declare global {
  interface Window {
    google: any;
    Razorpay: any;
  }
}

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export default function Checkout() {
  const { items, total, clearCart } = useCart();
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [mapsLoaded, setMapsLoaded] = useState(false);
  const [mapsError, setMapsError] = useState(false);
  const [errors, setErrors] = useState<any>({});
  const [previousAddresses, setPreviousAddresses] = useState<any[]>([]);
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [showPrevious, setShowPrevious] = useState(false);
  const [showSaved, setShowSaved] = useState(true);
  const [saveThisAddress, setSaveThisAddress] = useState(false);
  const [addressLabel, setAddressLabel] = useState('Home');
  const autocompleteInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (items.length === 0 && !success) {
      navigate('/');
    }
  }, [items, success, navigate]);
  
  const [formData, setFormData] = useState({
    house_no: '',
    street: '',
    landmark: '',
    address: '',
    city: '',
    district: '',
    state: '',
    pincode: '',
    phone: user?.phone || '',
    paymentMethod: 'cod'
  });

  useEffect(() => {
    let autocomplete: any = null;
    let retryCount = 0;
    const maxRetries = 10;

    const initAutocomplete = () => {
      if (window.google && window.google.maps && window.google.maps.places && autocompleteInput.current) {
        console.log('Initializing Google Maps Autocomplete...');
        setMapsLoaded(true);
        autocomplete = new window.google.maps.places.Autocomplete(autocompleteInput.current, {
          componentRestrictions: { country: 'in' },
          fields: ['address_components', 'formatted_address', 'geometry'],
        });

        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          console.log('Place selected:', place);
          if (!place.address_components) {
            console.warn('No address components found for the selected place.');
            return;
          }
          fillAddressFromComponents(place.address_components, place.formatted_address);
        });
      } else {
        if (retryCount < maxRetries) {
          retryCount++;
          console.log(`Retrying Autocomplete initialization (${retryCount}/${maxRetries})...`);
          setTimeout(initAutocomplete, 1000);
        } else {
          if (!window.google) {
            console.error('Google Maps SDK failed to load after multiple retries.');
            setMapsError(true);
          } else if (!autocompleteInput.current) {
            console.error('Autocomplete input ref is not available.');
          }
        }
      }
    };

    const handleAuthFailure = () => {
      console.error('Google Maps Auth Failure detected in Checkout component');
      setMapsError(true);
    };

    window.addEventListener('google-maps-auth-failure', handleAuthFailure);

    const timer = setTimeout(initAutocomplete, 500);

    // Fetch previous addresses
    if (token) {
      fetch('/api/user/previous-addresses', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => setPreviousAddresses(Array.isArray(data) ? data : []))
      .catch(err => console.error('Failed to fetch previous addresses:', err));

      fetch('/api/user/saved-addresses', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        const addresses = Array.isArray(data) ? data : [];
        setSavedAddresses(addresses);
        // Auto-select default address if available and form is empty
        const defaultAddr = addresses.find((a: any) => a.is_default);
        if (defaultAddr) {
          selectPreviousAddress(defaultAddr);
        }
      })
      .catch(err => console.error('Failed to fetch saved addresses:', err));
    }

    return () => {
      clearTimeout(timer);
      window.removeEventListener('google-maps-auth-failure', handleAuthFailure);
      if (autocomplete) {
        window.google?.maps?.event?.clearInstanceListeners(autocomplete);
      }
    };
  }, [token]);

  const selectPreviousAddress = (addr: any) => {
    setFormData(prev => ({
      ...prev,
      house_no: addr.house_no || '',
      street: addr.street || '',
      landmark: addr.landmark || '',
      address: addr.address || '',
      city: addr.city || '',
      district: addr.district || '',
      state: addr.state || '',
      pincode: addr.pincode || '',
      phone: addr.phone || prev.phone
    }));
    setShowPrevious(false);
  };

  const fillAddressFromComponents = (components: any[], formattedAddress?: string) => {
    let city = '';
    let state = '';
    let pincode = '';
    let street = '';
    let district = '';

    for (const component of components) {
      const types = component.types;
      if (types.includes('locality')) {
        city = component.long_name;
      } else if (types.includes('administrative_area_level_1')) {
        state = component.long_name;
      } else if (types.includes('administrative_area_level_2')) {
        district = component.long_name;
      } else if (types.includes('postal_code')) {
        pincode = component.long_name;
      } else if (types.includes('route') || types.includes('sublocality') || types.includes('neighborhood')) {
        street += (street ? ', ' : '') + component.long_name;
      }
    }

    setFormData(prev => ({
      ...prev,
      address: formattedAddress || prev.address,
      city,
      district,
      state,
      pincode,
      street
    }));
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          if (!window.google || !window.google.maps) {
            throw new Error('Google Maps library not loaded');
          }
          const geocoder = new window.google.maps.Geocoder();
          const response = await geocoder.geocode({
            location: { lat: latitude, lng: longitude }
          });

          if (response && response.results && response.results[0]) {
            fillAddressFromComponents(
              response.results[0].address_components,
              response.results[0].formatted_address
            );
          } else {
            throw new Error('No results found for this location');
          }
        } catch (error: any) {
          console.error('Geocoding error:', error);
          alert(error.message || 'Failed to get address from location');
        } finally {
          setLocating(false);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        alert('Failed to get your location. Please check permissions.');
        setLocating(false);
      }
    );
  };

  const validate = () => {
    const newErrors: any = {};
    if (!formData.house_no) newErrors.house_no = 'Required';
    if (!formData.street) newErrors.street = 'Required';
    if (!formData.city) newErrors.city = 'Required';
    if (!formData.district) newErrors.district = 'Required';
    if (!formData.state) newErrors.state = 'Required';
    if (!formData.pincode) newErrors.pincode = 'Required';
    else if (!/^\d{6}$/.test(formData.pincode)) newErrors.pincode = 'Invalid Pincode';
    if (!formData.phone) newErrors.phone = 'Required';
    else if (!/^\d{10}$/.test(formData.phone.replace(/\D/g, ''))) newErrors.phone = 'Invalid Phone Number';
    
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      const firstError = Object.keys(newErrors)[0];
      const element = document.getElementsByName(firstError)[0] || document.querySelector(`[placeholder*="${firstError}"]`);
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!validate()) return;
    setLoading(true);

    try {
      // Save address if requested
      if (saveThisAddress) {
        await fetch('/api/user/saved-addresses', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            label: addressLabel,
            house_no: formData.house_no,
            street: formData.street,
            landmark: formData.landmark,
            address: formData.address,
            city: formData.city,
            district: formData.district,
            state: formData.state,
            pincode: formData.pincode,
            phone: formData.phone,
            is_default: false
          })
        });
      }

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          items: items.map(i => ({ product_id: i.id, quantity: i.quantity, price: i.price })),
          total_amount: total,
          final_amount: total,
          payment_method: formData.paymentMethod,
          house_no: formData.house_no,
          street: formData.street,
          landmark: formData.landmark,
          address: formData.address,
          city: formData.city,
          district: formData.district,
          state: formData.state,
          pincode: formData.pincode,
          phone: formData.phone
        })
      });

      if (res.ok) {
        const data = await res.json();
        
        if (formData.paymentMethod === 'online' && data.razorpayOrderId) {
          const resScript = await loadRazorpayScript();
          if (!resScript) {
            setSubmitError('Razorpay SDK failed to load. Are you online?');
            setLoading(false);
            return;
          }

          const options = {
            key: data.key,
            amount: data.amount,
            currency: data.currency,
            name: "DDFF - Grama Ruchulu",
            description: "Village Fresh Products",
            order_id: data.razorpayOrderId,
            handler: async (response: any) => {
              try {
                const verifyRes = await fetch('/api/payments/verify', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                  },
                  body: JSON.stringify({
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_signature: response.razorpay_signature,
                    order_id: data.orderId
                  })
                });
                
                if (verifyRes.ok) {
                  setSuccess(true);
                  clearCart();
                } else {
                  setSubmitError('Payment verification failed. Please contact support.');
                }
              } catch (err) {
                setSubmitError('Error verifying payment.');
              }
            },
            prefill: {
              name: user?.name,
              email: user?.email,
              contact: formData.phone
            },
            theme: {
              color: "#D4820A"
            }
          };

          const rzp = new window.Razorpay(options);
          rzp.open();
          setLoading(false);
          return;
        }

        setSuccess(true);
        clearCart();
      } else {
        const data = await res.json();
        if (res.status === 401) {
          setSubmitError('Your session is invalid or has expired. Please logout and login again to continue.');
        } else {
          setSubmitError(data.error || 'Order failed. Please try again.');
        }
      }
    } catch (e) {
      console.error('Checkout error:', e);
      setSubmitError('Order failed. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-md mx-auto text-center py-20 space-y-6">
        <div className="bg-green-100 dark:bg-green-900/20 w-24 h-24 rounded-full flex items-center justify-center mx-auto transition-colors">
          <CheckCircle2 className="w-16 h-16 text-green-600 dark:text-green-400" />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-bold dark:text-white">Order Confirmed!</h2>
          <p className="text-gray-600 dark:text-white">Your village fresh products are on their way. Expected delivery in 2-3 days.</p>
        </div>
        <div className="flex flex-col space-y-3">
          <button onClick={() => navigate('/profile')} className="bg-[#D4820A] text-white py-4 rounded-2xl font-bold">View My Orders</button>
          <button onClick={() => navigate('/')} className="text-[#D4820A] font-bold">Continue Shopping</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-bold dark:text-white">Checkout</h1>
        <div className="flex items-center space-x-2">
          {mapsError ? (
            <div className="flex items-center space-x-1 text-red-500 text-xs font-bold bg-red-50 dark:bg-red-900/20 px-3 py-1 rounded-full">
              <XCircle className="w-3 h-3" />
              <span>Maps Error</span>
            </div>
          ) : mapsLoaded ? (
            <div className="flex items-center space-x-1 text-emerald-500 text-xs font-bold bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1 rounded-full">
              <CheckCircle2 className="w-3 h-3" />
              <span>Maps Ready</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1 text-amber-500 text-xs font-bold bg-amber-50 dark:bg-amber-900/20 px-3 py-1 rounded-full">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Loading Maps...</span>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div className="space-y-8">
          <section className="space-y-4">
            <div className="flex items-center space-x-2 font-bold text-xl">
              <Truck className="w-6 h-6 text-[#D4820A]" />
              <h2 className="dark:text-white">Delivery Address</h2>
            </div>
            
            <div className="space-y-6">
              {/* Saved Addresses */}
              {savedAddresses.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold dark:text-white">Saved Addresses</h3>
                    <button 
                      type="button"
                      onClick={() => setShowSaved(!showSaved)}
                      className="text-[#D4820A] text-xs font-bold hover:underline"
                    >
                      {showSaved ? 'Hide' : 'Show'}
                    </button>
                  </div>

                  {showSaved && (
                    <div className="grid grid-cols-1 gap-3 animate-in fade-in slide-in-from-top-2">
                      {savedAddresses.map((addr) => (
                        <button
                          key={addr.id}
                          type="button"
                          onClick={() => selectPreviousAddress(addr)}
                          className={`text-left p-4 rounded-2xl border transition-all group relative ${
                            formData.house_no === addr.house_no && formData.pincode === addr.pincode
                            ? 'border-[#D4820A] bg-[#D4820A]/5' 
                            : 'border-black/5 dark:border-white/10 bg-white dark:bg-slate-800 hover:border-[#D4820A]'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded text-gray-600 dark:text-gray-300">
                              {addr.label}
                            </span>
                            {addr.is_default && (
                              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Default</span>
                            )}
                          </div>
                          <p className="font-bold text-sm dark:text-white group-hover:text-[#D4820A]">
                            {addr.house_no}, {addr.street}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-white truncate">
                            {addr.city}, {addr.district}, {addr.state} - {addr.pincode}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Previous Addresses */}
              {previousAddresses.length > 0 && (
                <div className="space-y-3">
                  <button 
                    type="button"
                    onClick={() => setShowPrevious(!showPrevious)}
                    className="flex items-center space-x-2 text-[#D4820A] font-bold text-sm hover:underline"
                  >
                    <Clock className="w-4 h-4" />
                    <span>{showPrevious ? 'Hide Previous Addresses' : 'Select from Previous Addresses'}</span>
                  </button>

                  {showPrevious && (
                    <div className="grid grid-cols-1 gap-3 animate-in fade-in slide-in-from-top-2">
                      {previousAddresses.map((addr, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => selectPreviousAddress(addr)}
                          className="text-left p-4 rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-slate-800 hover:border-[#D4820A] hover:bg-[#D4820A]/5 transition-all group"
                        >
                          <p className="font-bold text-sm dark:text-white group-hover:text-[#D4820A]">
                            {addr.house_no}, {addr.street}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-white truncate">
                            {addr.city}, {addr.district}, {addr.state} - {addr.pincode}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Google Maps Search & Current Location */}
              <div className={`space-y-4 ${mapsError ? 'opacity-50 pointer-events-none' : ''}`}>
                <div>
                  <label className="block text-sm font-bold mb-2 flex items-center space-x-2 dark:text-white">
                    <Search className="w-4 h-4 text-[#D4820A]" />
                    <span>Search your location</span>
                  </label>
                  <div className="relative">
                    <input 
                      ref={autocompleteInput}
                      type="text" 
                      className="w-full p-4 pl-12 rounded-2xl border border-black/40 dark:border-white/50 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-gray-600 dark:placeholder:text-slate-300 focus:ring-2 focus:ring-[#D4820A] outline-none transition-colors text-base font-bold"
                      placeholder={mapsError ? "Search disabled due to Maps error" : "Search for area, street or apartment..."}
                      disabled={mapsError}
                    />
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-slate-400 w-5 h-5" />
                  </div>
                </div>

                <button 
                  type="button"
                  onClick={handleUseCurrentLocation}
                  disabled={locating || mapsError}
                  className="flex items-center space-x-2 text-[#D4820A] font-bold text-sm hover:underline disabled:opacity-50"
                >
                  <Navigation className={`w-4 h-4 ${locating ? 'animate-spin' : ''}`} />
                  <span>{locating ? 'Locating...' : 'Use Current Location'}</span>
                </button>
                <p className="text-[10px] text-gray-600 dark:text-white">Powered by Google Maps</p>
              </div>

              {mapsError && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl space-y-2">
                  <div className="flex items-center space-x-2 text-red-600 dark:text-red-400 font-bold text-sm">
                    <XCircle className="w-4 h-4" />
                    <span>Google Maps Error</span>
                  </div>
                  <p className="text-xs text-red-500 dark:text-red-300 leading-relaxed">
                    The location search feature is currently unavailable. This is likely due to an invalid API key or billing issues. 
                    <strong className="block mt-1">Please enter your address manually below.</strong>
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <label className="block text-sm font-bold mb-2 dark:text-white">House / Flat No.</label>
                  <input 
                    name="house_no"
                    type="text"
                    className={`w-full p-4 rounded-2xl border ${errors.house_no ? 'border-red-500' : 'border-black/40 dark:border-white/50'} bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-gray-600 dark:placeholder:text-slate-300 focus:ring-2 focus:ring-[#D4820A] outline-none transition-colors text-base font-bold`}
                    placeholder="e.g. 101, Block A"
                    value={formData.house_no}
                    onChange={e => {
                      setFormData({...formData, house_no: e.target.value});
                      if (errors.house_no) setErrors({...errors, house_no: undefined});
                    }}
                  />
                  {errors.house_no && <div className="absolute left-0 -bottom-5 text-[10px] text-red-500 font-bold">{errors.house_no}</div>}
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2 dark:text-white">Landmark</label>
                  <input 
                    type="text"
                    className="w-full p-4 rounded-2xl border border-black/40 dark:border-white/50 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-gray-600 dark:placeholder:text-slate-300 focus:ring-2 focus:ring-[#D4820A] outline-none transition-colors text-base font-bold"
                    placeholder="e.g. Near Temple"
                    value={formData.landmark}
                    onChange={e => setFormData({...formData, landmark: e.target.value})}
                  />
                </div>
              </div>

              <div className="relative">
                <label className="block text-sm font-bold mb-2 dark:text-white">Address Line</label>
                <input 
                  name="street"
                  type="text"
                  className={`w-full p-4 rounded-2xl border ${errors.street ? 'border-red-500' : 'border-black/40 dark:border-white/50'} bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-gray-600 dark:placeholder:text-slate-300 focus:ring-2 focus:ring-[#D4820A] outline-none transition-colors text-base font-bold`}
                  placeholder="Street name or locality"
                  value={formData.street}
                  onChange={e => {
                    setFormData({...formData, street: e.target.value});
                    if (errors.street) setErrors({...errors, street: undefined});
                  }}
                />
                {errors.street && <div className="absolute left-0 -bottom-5 text-[10px] text-red-500 font-bold">{errors.street}</div>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <label className="block text-sm font-bold mb-2 dark:text-white">City</label>
                  <input 
                    name="city"
                    type="text"
                    className={`w-full p-4 rounded-2xl border ${errors.city ? 'border-red-500' : 'border-black/40 dark:border-white/50'} bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-gray-600 dark:placeholder:text-slate-300 focus:ring-2 focus:ring-[#D4820A] outline-none transition-colors text-base font-bold`}
                    placeholder="City"
                    value={formData.city}
                    onChange={e => {
                      setFormData({...formData, city: e.target.value});
                      if (errors.city) setErrors({...errors, city: undefined});
                    }}
                  />
                  {errors.city && <div className="absolute left-0 -bottom-5 text-[10px] text-red-500 font-bold">{errors.city}</div>}
                </div>
                <div className="relative">
                  <label className="block text-sm font-bold mb-2 dark:text-white">District</label>
                  <input 
                    name="district"
                    type="text"
                    className={`w-full p-4 rounded-2xl border ${errors.district ? 'border-red-500' : 'border-black/40 dark:border-white/50'} bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-gray-600 dark:placeholder:text-slate-300 focus:ring-2 focus:ring-[#D4820A] outline-none transition-colors text-base font-bold`}
                    placeholder="District"
                    value={formData.district}
                    onChange={e => {
                      setFormData({...formData, district: e.target.value});
                      if (errors.district) setErrors({...errors, district: undefined});
                    }}
                  />
                  {errors.district && <div className="absolute left-0 -bottom-5 text-[10px] text-red-500 font-bold">{errors.district}</div>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <label className="block text-sm font-bold mb-2 dark:text-white">State</label>
                  <input 
                    name="state"
                    type="text"
                    className={`w-full p-4 rounded-2xl border ${errors.state ? 'border-red-500' : 'border-black/40 dark:border-white/50'} bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-gray-600 dark:placeholder:text-slate-300 focus:ring-2 focus:ring-[#D4820A] outline-none transition-colors text-base font-bold`}
                    placeholder="State"
                    value={formData.state}
                    onChange={e => {
                      setFormData({...formData, state: e.target.value});
                      if (errors.state) setErrors({...errors, state: undefined});
                    }}
                  />
                  {errors.state && <div className="absolute left-0 -bottom-5 text-[10px] text-red-500 font-bold">{errors.state}</div>}
                </div>
                <div className="relative">
                  <label className="block text-sm font-bold mb-2 dark:text-white">Pincode</label>
                  <input 
                    name="pincode"
                    type="text"
                    className={`w-full p-4 rounded-2xl border ${errors.pincode ? 'border-red-500' : 'border-black/40 dark:border-white/50'} bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-gray-600 dark:placeholder:text-slate-300 focus:ring-2 focus:ring-[#D4820A] outline-none transition-colors text-base font-bold`}
                    placeholder="522XXX"
                    value={formData.pincode}
                    onChange={e => {
                      setFormData({...formData, pincode: e.target.value});
                      if (errors.pincode) setErrors({...errors, pincode: undefined});
                    }}
                  />
                  {errors.pincode && <div className="absolute left-0 -bottom-5 text-[10px] text-red-500 font-bold">{errors.pincode}</div>}
                </div>
              </div>

              <div className="relative">
                <label className="block text-sm font-bold mb-2 dark:text-white">Mobile Number</label>
                <input 
                  name="phone"
                  type="tel"
                  className={`w-full p-4 rounded-2xl border ${errors.phone ? 'border-red-500' : 'border-black/40 dark:border-white/50'} bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-gray-600 dark:placeholder:text-slate-300 focus:ring-2 focus:ring-[#D4820A] outline-none transition-colors text-base font-bold`}
                  placeholder="10-digit mobile number"
                  value={formData.phone}
                  onChange={e => {
                    setFormData({...formData, phone: e.target.value});
                    if (errors.phone) setErrors({...errors, phone: undefined});
                  }}
                />
                {errors.phone && <div className="absolute left-0 -bottom-5 text-[10px] text-red-500 font-bold">{errors.phone}</div>}
              </div>

              {/* Save Address Option */}
              <div className="p-4 bg-gray-50 dark:bg-slate-800/50 rounded-2xl border border-black/5 dark:border-white/5 space-y-4">
                <label className="flex items-center space-x-3 cursor-pointer group">
                  <div className="relative flex items-center">
                    <input 
                      type="checkbox" 
                      className="peer h-5 w-5 cursor-pointer appearance-none rounded border border-slate-300 dark:border-slate-600 checked:border-[#D4820A] checked:bg-[#D4820A] transition-all"
                      checked={saveThisAddress}
                      onChange={e => setSaveThisAddress(e.target.checked)}
                    />
                    <CheckCircle2 className="absolute left-0.5 top-0.5 h-4 w-4 text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                  </div>
                  <span className="text-sm font-bold dark:text-white">Save this address for future use</span>
                </label>

                {saveThisAddress && (
                  <div className="flex items-center space-x-2 animate-in fade-in slide-in-from-left-2">
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400">Label as:</span>
                    {['Home', 'Work', 'Other'].map(l => (
                      <button
                        key={l}
                        type="button"
                        onClick={() => setAddressLabel(l)}
                        className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                          addressLabel === l 
                          ? 'bg-[#D4820A] text-white' 
                          : 'bg-white dark:bg-slate-700 text-gray-600 dark:text-gray-300 border border-black/10 dark:border-white/10'
                        }`}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center space-x-2 font-bold text-xl">
              <CreditCard className="w-6 h-6 text-[#D4820A]" />
              <h2 className="dark:text-white">Payment Method</h2>
            </div>
            <div className="space-y-3">
              <label className={`flex items-center p-4 rounded-2xl border cursor-pointer transition-all ${formData.paymentMethod === 'cod' ? 'border-[#D4820A] bg-[#D4820A]/5' : 'border-black/10 dark:border-white/20 dark:bg-slate-800'}`}>
                <input 
                  type="radio" 
                  name="payment" 
                  className="hidden" 
                  checked={formData.paymentMethod === 'cod'}
                  onChange={() => setFormData({...formData, paymentMethod: 'cod'})}
                />
                <div className={`w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center ${formData.paymentMethod === 'cod' ? 'border-[#D4820A]' : 'border-gray-300 dark:border-slate-500'}`}>
                  {formData.paymentMethod === 'cod' && <div className="w-2.5 h-2.5 bg-[#D4820A] rounded-full" />}
                </div>
                <span className="font-bold dark:text-white">Cash on Delivery</span>
              </label>
              <label className={`flex items-center p-4 rounded-2xl border cursor-pointer transition-all ${formData.paymentMethod === 'online' ? 'border-[#D4820A] bg-[#D4820A]/5' : 'border-black/10 dark:border-white/20 dark:bg-slate-800'}`}>
                <input 
                  type="radio" 
                  name="payment" 
                  className="hidden" 
                  checked={formData.paymentMethod === 'online'}
                  onChange={() => setFormData({...formData, paymentMethod: 'online'})}
                />
                <div className={`w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center ${formData.paymentMethod === 'online' ? 'border-[#D4820A]' : 'border-gray-300 dark:border-slate-500'}`}>
                  {formData.paymentMethod === 'online' && <div className="w-2.5 h-2.5 bg-[#D4820A] rounded-full" />}
                </div>
                <span className="font-bold dark:text-white">Online Payment (Razorpay)</span>
              </label>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-black/10 dark:border-white/20 space-y-6 transition-colors">
            <h2 className="text-2xl font-bold dark:text-white">Order Summary</h2>
            <div className="space-y-3">
              {items.map(item => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-gray-700 dark:text-white">{item.name} x {item.quantity}</span>
                  <span className="font-bold dark:text-white">₹{item.price * item.quantity}</span>
                </div>
              ))}
            </div>
            <div className="pt-4 border-t border-black/10 dark:border-white/20 flex justify-between text-xl font-bold">
              <span className="dark:text-white">Total</span>
              <span className="text-[#D4820A]">₹{total}</span>
            </div>

            {submitError && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl text-red-600 dark:text-red-400 text-sm font-bold animate-in fade-in slide-in-from-top-2">
                <div className="flex flex-col gap-2">
                  <span>{submitError}</span>
                  {submitError.includes('session') && (
                    <button 
                      onClick={() => {
                        logout();
                        navigate('/login');
                      }}
                      className="text-left underline hover:text-red-700"
                    >
                      Logout now
                    </button>
                  )}
                </div>
              </div>
            )}

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-[#D4820A] text-white py-4 rounded-2xl font-bold text-lg flex items-center justify-center space-x-2 hover:bg-[#B87008] transition-all disabled:opacity-50"
            >
              <ShieldCheck className="w-6 h-6" />
              <span>{loading ? 'Placing Order...' : 'Place Order Securely'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
