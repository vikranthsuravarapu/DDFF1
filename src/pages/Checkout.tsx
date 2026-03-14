import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, CreditCard, Truck, CheckCircle2, MapPin, Search, Navigation, Clock, XCircle, Loader2, Wallet, ChevronRight } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { formatCurrency } from '../utils/format';

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
  const { t } = useLanguage();
  const { items, total, clearCart } = useCart();
  const { user, token, logout, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [useWallet, setUseWallet] = useState(false);

  useEffect(() => {
    refreshUser();
    if (user?.role === 'delivery_boy') {
      navigate('/delivery');
    }
  }, [user, navigate, refreshUser]);

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
  const [deliveryZones, setDeliveryZones] = useState<any[]>([]);
  const [currentZone, setCurrentZone] = useState<any>(null);
  const { userLocation } = useAuth();
  const autocompleteInput = useRef<HTMLInputElement>(null);

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
    paymentMethod: 'cod',
    delivery_slot: ''
  });

  useEffect(() => {
    fetch('/api/delivery-zones')
      .then(res => res.json())
      .then(data => {
        setDeliveryZones(data);
        // Initially set zone based on userLocation or first available
        if (userLocation) {
          const zone = data.find((z: any) => z.name === userLocation);
          if (zone) {
            setCurrentZone(zone);
            // Also update form pincode if it's empty
            setFormData(prev => ({ ...prev, pincode: prev.pincode || zone.pincode }));
          }
        }
      })
      .catch(err => console.error('Failed to fetch delivery zones:', err));
  }, [userLocation]);

  useEffect(() => {
    if (deliveryZones.length > 0) {
      if (formData.pincode && formData.pincode.length === 6) {
        const zone = deliveryZones.find((z: any) => z.pincode === formData.pincode && z.is_active);
        setCurrentZone(zone || null);
      } else if (formData.pincode) {
        setCurrentZone(null);
      }
    }
  }, [formData.pincode, deliveryZones]);

  useEffect(() => {
    if (items.length === 0 && !success) {
      navigate('/');
    }
  }, [items, success, navigate]);

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
      alert(t('geolocation_not_supported'));
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          if (!window.google || !window.google.maps) {
            throw new Error(t('maps_library_not_loaded'));
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
            throw new Error(t('no_results_found'));
          }
        } catch (error: any) {
          console.error('Geocoding error:', error);
          alert(error.message || t('failed_get_location_address'));
        } finally {
          setLocating(false);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        alert(t('failed_get_location'));
        setLocating(false);
      }
    );
  };

  const validate = () => {
    const newErrors: any = {};
    if (!formData.house_no) newErrors.house_no = t('required');
    if (!formData.street) newErrors.street = t('required');
    if (!formData.city) newErrors.city = t('required');
    if (!formData.district) newErrors.district = t('required');
    if (!formData.state) newErrors.state = t('required');
    if (!formData.pincode) newErrors.pincode = t('required');
    else if (!/^\d{6}$/.test(formData.pincode)) newErrors.pincode = t('invalid_pincode_format');
    if (!formData.phone) newErrors.phone = t('required');
    else if (!/^\d{10}$/.test(formData.phone.replace(/\D/g, ''))) newErrors.phone = t('invalid_phone_format');
    
    if (!formData.delivery_slot) newErrors.delivery_slot = t('select_delivery_slot');
    
    if (!currentZone && formData.pincode) {
      newErrors.pincode = t('delivery_not_available');
      setSubmitError(t('pincode_check_error'));
    } else if (currentZone && Number(total) < Number(currentZone.min_order_amount)) {
      newErrors.min_order = `⚠️ ${t('min_order_error_prefix')} ${currentZone.name} ${t('min_order_error_middle')}${currentZone.min_order_amount}. ${t('min_order_error_suffix_prefix')}${currentZone.min_order_amount - total} ${t('min_order_error_suffix_suffix')}`;
      setSubmitError(newErrors.min_order);
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      const firstError = Object.keys(newErrors)[0];
      const element = document.getElementsByName(firstError)[0] || document.querySelector(`[placeholder*="${firstError}"]`);
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return Object.keys(newErrors).length === 0;
  };

  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discount_amount: number } | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    setPromoLoading(true);
    setPromoError(null);
    try {
      const res = await fetch('/api/promo/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          code: promoCode, 
          amount: total,
          items: items.map(i => ({ product_id: i.id, quantity: i.quantity }))
        })
      });
      const data = await res.json();
      if (res.ok) {
        setAppliedPromo({ code: data.code, discount_amount: data.discount_amount });
        setPromoCode('');
      } else {
        setPromoError(data.error || t('invalid_promo'));
      }
    } catch (err) {
      setPromoError(t('failed_validate_promo'));
    } finally {
      setPromoLoading(false);
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoError(null);
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

      const deliveryFee = Number(currentZone?.delivery_fee || 0);
      const discountAmount = Number(appliedPromo?.discount_amount || 0);
      const subtotalWithDelivery = total + deliveryFee - discountAmount;
      
      const walletBalance = user?.wallet_balance || 0;
      const walletAmountUsed = useWallet ? Math.min(walletBalance, subtotalWithDelivery) : 0;
      const finalAmount = Math.max(0, subtotalWithDelivery - walletAmountUsed);

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          items: items.map(i => ({ product_id: i.id, quantity: i.quantity, price: i.price })),
          total_amount: total,
          delivery_fee: deliveryFee,
          discount_amount: discountAmount,
          promo_code: appliedPromo?.code || null,
          wallet_amount_used: walletAmountUsed,
          final_amount: finalAmount,
          payment_method: formData.paymentMethod,
          house_no: formData.house_no,
          street: formData.street,
          landmark: formData.landmark,
          address: formData.address,
          city: formData.city,
          district: formData.district,
          state: formData.state,
          pincode: formData.pincode,
          phone: formData.phone,
          delivery_slot: formData.delivery_slot
        })
      });

      if (res.ok) {
        const data = await res.json();
        
        if (formData.paymentMethod === 'online' && data.razorpayOrderId) {
          const resScript = await loadRazorpayScript();
          if (!resScript) {
            setSubmitError(t('razorpay_sdk_error'));
            setLoading(false);
            return;
          }

          const options = {
            key: data.key,
            amount: data.amount,
            currency: data.currency,
            name: "DDFF",
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
                  refreshUser();
                } else {
                  setSubmitError(t('payment_verification_failed'));
                }
              } catch (err) {
                setSubmitError(t('error_verifying_payment'));
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
        refreshUser();
      } else {
        const data = await res.json();
        if (res.status === 401) {
          setSubmitError(t('session_expired_error'));
        } else {
          setSubmitError(data.error || t('order_failed'));
        }
      }
    } catch (e) {
      console.error('Checkout error:', e);
      setSubmitError(t('order_failed_connection'));
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
          <h2 className="text-3xl font-bold dark:text-white">{t('order_confirmed')}</h2>
          <p className="text-gray-600 dark:text-white">{t('order_confirmed_desc')}</p>
        </div>
        <div className="flex flex-col space-y-3">
          <button onClick={() => navigate('/profile')} className="bg-[#D4820A] text-white py-4 rounded-2xl font-bold">{t('view_my_orders')}</button>
          <button onClick={() => navigate('/')} className="text-[#D4820A] font-bold">{t('continue_shopping')}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-bold dark:text-white">{t('checkout')}</h1>
        <div className="flex items-center space-x-2">
          {mapsError ? (
            <div className="flex items-center space-x-1 text-red-500 text-xs font-bold bg-red-50 dark:bg-red-900/20 px-3 py-1 rounded-full">
              <XCircle className="w-3 h-3" />
              <span>{t('maps_error')}</span>
            </div>
          ) : mapsLoaded ? (
            <div className="flex items-center space-x-1 text-emerald-500 text-xs font-bold bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1 rounded-full">
              <CheckCircle2 className="w-3 h-3" />
              <span>{t('maps_ready')}</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1 text-amber-500 text-xs font-bold bg-amber-50 dark:bg-amber-900/20 px-3 py-1 rounded-full">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>{t('loading_maps')}</span>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div className="space-y-8">
          <section className="space-y-4">
            <div className="flex items-center space-x-2 font-bold text-xl">
              <Truck className="w-6 h-6 text-[#D4820A]" />
              <h2 className="dark:text-white">{t('delivery_address')}</h2>
            </div>
            
            <div className="space-y-6">
              {/* Saved Addresses */}
              {savedAddresses.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold dark:text-white">{t('saved_addresses')}</h3>
                    <button 
                      type="button"
                      onClick={() => setShowSaved(!showSaved)}
                      className="text-[#D4820A] text-xs font-bold hover:underline"
                    >
                      {showSaved ? t('hide') : t('show')}
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
                              {t(addr.label.toLowerCase()) || addr.label}
                            </span>
                            {addr.is_default && (
                              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">{t('default')}</span>
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
                    <span>{showPrevious ? t('hide_previous') : t('select_previous')}</span>
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
                    <span>{t('search_location')}</span>
                  </label>
                  <div className="relative">
                    <input 
                      ref={autocompleteInput}
                      type="text" 
                      className="w-full p-4 pl-12 rounded-2xl border border-black/40 dark:border-white/50 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-gray-600 dark:placeholder:text-slate-300 focus:ring-2 focus:ring-[#D4820A] outline-none transition-colors text-base font-bold"
                      placeholder={mapsError ? t('search_disabled_maps_error') : t('search_placeholder')}
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
                  <span>{locating ? t('locating') : t('use_current_location')}</span>
                </button>
                <p className="text-[10px] text-gray-600 dark:text-white">{t('powered_by_google')}</p>
              </div>

              {mapsError && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl space-y-2">
                  <div className="flex items-center space-x-2 text-red-600 dark:text-red-400 font-bold text-sm">
                    <XCircle className="w-4 h-4" />
                    <span>{t('maps_error_title')}</span>
                  </div>
                  <p className="text-xs text-red-500 dark:text-red-300 leading-relaxed">
                    {t('maps_error_desc')}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <label className="block text-sm font-bold mb-2 dark:text-white">{t('house_flat_no')}</label>
                  <input 
                    name="house_no"
                    type="text"
                    className={`w-full p-4 rounded-2xl border ${errors.house_no ? 'border-red-500' : 'border-black/40 dark:border-white/50'} bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-gray-600 dark:placeholder:text-slate-300 focus:ring-2 focus:ring-[#D4820A] outline-none transition-colors text-base font-bold`}
                    placeholder={t('house_no_placeholder')}
                    value={formData.house_no}
                    onChange={e => {
                      setFormData({...formData, house_no: e.target.value});
                      if (errors.house_no) setErrors({...errors, house_no: undefined});
                    }}
                  />
                  {errors.house_no && <div className="absolute left-0 -bottom-5 text-[10px] text-red-500 font-bold">{errors.house_no}</div>}
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2 dark:text-white">{t('landmark')}</label>
                  <input 
                    type="text"
                    className="w-full p-4 rounded-2xl border border-black/40 dark:border-white/50 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-gray-600 dark:placeholder:text-slate-300 focus:ring-2 focus:ring-[#D4820A] outline-none transition-colors text-base font-bold"
                    placeholder={t('landmark_placeholder')}
                    value={formData.landmark}
                    onChange={e => setFormData({...formData, landmark: e.target.value})}
                  />
                </div>
              </div>

              <div className="relative">
                <label className="block text-sm font-bold mb-2 dark:text-white">{t('address_line')}</label>
                <input 
                  name="street"
                  type="text"
                  className={`w-full p-4 rounded-2xl border ${errors.street ? 'border-red-500' : 'border-black/40 dark:border-white/50'} bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-gray-600 dark:placeholder:text-slate-300 focus:ring-2 focus:ring-[#D4820A] outline-none transition-colors text-base font-bold`}
                  placeholder={t('street_placeholder')}
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
                  <label className="block text-sm font-bold mb-2 dark:text-white">{t('city')}</label>
                  <input 
                    name="city"
                    type="text"
                    className={`w-full p-4 rounded-2xl border ${errors.city ? 'border-red-500' : 'border-black/40 dark:border-white/50'} bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-gray-600 dark:placeholder:text-slate-300 focus:ring-2 focus:ring-[#D4820A] outline-none transition-colors text-base font-bold`}
                    placeholder={t('city')}
                    value={formData.city}
                    onChange={e => {
                      setFormData({...formData, city: e.target.value});
                      if (errors.city) setErrors({...errors, city: undefined});
                    }}
                  />
                  {errors.city && <div className="absolute left-0 -bottom-5 text-[10px] text-red-500 font-bold">{errors.city}</div>}
                </div>
                <div className="relative">
                  <label className="block text-sm font-bold mb-2 dark:text-white">{t('district')}</label>
                  <input 
                    name="district"
                    type="text"
                    className={`w-full p-4 rounded-2xl border ${errors.district ? 'border-red-500' : 'border-black/40 dark:border-white/50'} bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-gray-600 dark:placeholder:text-slate-300 focus:ring-2 focus:ring-[#D4820A] outline-none transition-colors text-base font-bold`}
                    placeholder={t('district')}
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
                  <label className="block text-sm font-bold mb-2 dark:text-white">{t('state')}</label>
                  <input 
                    name="state"
                    type="text"
                    className={`w-full p-4 rounded-2xl border ${errors.state ? 'border-red-500' : 'border-black/40 dark:border-white/50'} bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-gray-600 dark:placeholder:text-slate-300 focus:ring-2 focus:ring-[#D4820A] outline-none transition-colors text-base font-bold`}
                    placeholder={t('state')}
                    value={formData.state}
                    onChange={e => {
                      setFormData({...formData, state: e.target.value});
                      if (errors.state) setErrors({...errors, state: undefined});
                    }}
                  />
                  {errors.state && <div className="absolute left-0 -bottom-5 text-[10px] text-red-500 font-bold">{errors.state}</div>}
                </div>
                <div className="relative">
                  <label className="block text-sm font-bold mb-2 dark:text-white">{t('pincode')}</label>
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
                <label className="block text-sm font-bold mb-2 dark:text-white">{t('mobile_number')}</label>
                <input 
                  name="phone"
                  type="tel"
                  className={`w-full p-4 rounded-2xl border ${errors.phone ? 'border-red-500' : 'border-black/40 dark:border-white/50'} bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-gray-600 dark:placeholder:text-slate-300 focus:ring-2 focus:ring-[#D4820A] outline-none transition-colors text-base font-bold`}
                  placeholder={t('mobile_placeholder')}
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
                  <span className="text-sm font-bold dark:text-white">{t('save_address_future')}</span>
                </label>

                {saveThisAddress && (
                  <div className="flex items-center space-x-2 animate-in fade-in slide-in-from-left-2">
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400">{t('label_as')}</span>
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
                        {t(l.toLowerCase())}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center space-x-2 font-bold text-xl">
              <Clock className="w-6 h-6 text-[#D4820A]" />
              <h2 className="dark:text-white">{t('choose_delivery_slot')}</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, delivery_slot: 'Morning (8am – 12pm)' })}
                className={`p-6 rounded-3xl border-2 text-left transition-all ${
                  formData.delivery_slot === 'Morning (8am – 12pm)'
                    ? 'border-[#D4820A] bg-[#D4820A]/5 ring-4 ring-[#D4820A]/10'
                    : 'border-black/5 dark:border-white/10 bg-white dark:bg-slate-800 hover:border-[#D4820A]/50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">🌅</span>
                  {formData.delivery_slot === 'Morning (8am – 12pm)' && (
                    <CheckCircle2 className="w-5 h-5 text-[#D4820A]" />
                  )}
                </div>
                <h3 className="font-bold text-lg dark:text-white">{t('morning')}</h3>
                <p className="text-sm text-gray-500 dark:text-slate-400">{t('morning_slot')}</p>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, delivery_slot: 'Evening (4pm – 8pm)' })}
                className={`p-6 rounded-3xl border-2 text-left transition-all ${
                  formData.delivery_slot === 'Evening (4pm – 8pm)'
                    ? 'border-[#D4820A] bg-[#D4820A]/5 ring-4 ring-[#D4820A]/10'
                    : 'border-black/5 dark:border-white/10 bg-white dark:bg-slate-800 hover:border-[#D4820A]/50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">🌇</span>
                  {formData.delivery_slot === 'Evening (4pm – 8pm)' && (
                    <CheckCircle2 className="w-5 h-5 text-[#D4820A]" />
                  )}
                </div>
                <h3 className="font-bold text-lg dark:text-white">{t('evening')}</h3>
                <p className="text-sm text-gray-500 dark:text-slate-400">{t('evening_slot')}</p>
              </button>
            </div>
            {errors.delivery_slot && (
              <p className="text-xs text-red-500 font-bold mt-1">{errors.delivery_slot}</p>
            )}
          </section>

          <section className="space-y-4">
            <div className="flex items-center space-x-2 font-bold text-xl">
              <CreditCard className="w-6 h-6 text-[#D4820A]" />
              <h2 className="dark:text-white">{t('payment_method')}</h2>
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
                <span className="font-bold dark:text-white">{t('cod')}</span>
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
                <span className="font-bold dark:text-white">{t('online_payment_razorpay')}</span>
              </label>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-black/10 dark:border-white/20 space-y-6 transition-colors">
            <h2 className="text-2xl font-bold dark:text-white">{t('order_summary')}</h2>
            <div className="space-y-3">
              {items.map(item => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-gray-700 dark:text-white">{item.name} x {item.quantity}</span>
                  <span className="font-bold dark:text-white">{formatCurrency(item.price * item.quantity)}</span>
                </div>
              ))}
              {currentZone && (
                <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
                  <span>{t('delivery_fee_with_zone').replace('{zone}', currentZone.name)}</span>
                  <span className="font-bold">{formatCurrency(currentZone.delivery_fee)}</span>
                </div>
              )}
            </div>

            {/* Wallet Section */}
            {user && (
              <div className="py-4 border-t border-black/10 dark:border-white/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Wallet className="w-5 h-5 text-[#D4820A]" />
                    <h3 className="text-sm font-bold dark:text-white">{t('wallet_balance')}</h3>
                  </div>
                  <span className="text-sm font-bold text-[#D4820A]">{formatCurrency(user.wallet_balance || 0)}</span>
                </div>
                
                {(user.wallet_balance || 0) > 0 ? (
                  <label className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all ${useWallet ? 'border-[#D4820A] bg-[#D4820A]/5' : 'border-black/5 dark:border-white/10 bg-gray-50 dark:bg-slate-900/50'}`}>
                    <div className="flex items-center space-x-3">
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${useWallet ? 'border-[#D4820A] bg-[#D4820A]' : 'border-gray-300 dark:border-slate-600'}`}>
                        {useWallet && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                      </div>
                      <div>
                        <p className="text-sm font-bold dark:text-white">{t('use_wallet_money')}</p>
                        <p className="text-[10px] text-gray-500 dark:text-slate-400">{t('apply_balance_order')}</p>
                      </div>
                    </div>
                    <input 
                      type="checkbox" 
                      className="hidden" 
                      checked={useWallet}
                      onChange={() => setUseWallet(!useWallet)}
                    />
                    {useWallet && (
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                        -{formatCurrency(Math.min(user.wallet_balance || 0, total + Number(currentZone?.delivery_fee || 0) - (appliedPromo?.discount_amount || 0)))}
                      </span>
                    )}
                  </label>
                ) : (
                  <Link to="/profile" className="text-[10px] font-bold text-[#D4820A] hover:underline flex items-center space-x-1">
                    <span>{t('add_money_profile')}</span>
                    <ChevronRight className="w-3 h-3" />
                  </Link>
                )}
              </div>
            )}

            {/* Promo Code Section */}
            <div className="space-y-3 py-4 border-t border-black/10 dark:border-white/20">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold dark:text-white">{t('promo_code')}</h3>
              </div>
              
              {!appliedPromo ? (
                <div className="space-y-2">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                      placeholder={t('enter_promo_code')}
                      className="flex-1 p-3 rounded-xl border border-black/10 dark:border-white/20 bg-gray-50 dark:bg-slate-900 text-sm font-bold outline-none focus:ring-2 focus:ring-[#D4820A] transition-all"
                    />
                    <button
                      type="button"
                      onClick={handleApplyPromo}
                      disabled={promoLoading || !promoCode.trim()}
                      className="px-6 py-3 bg-[#D4820A] text-white rounded-xl font-bold text-sm hover:bg-[#B87008] transition-all disabled:opacity-50"
                    >
                      {promoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : t('apply')}
                    </button>
                  </div>
                  {promoError && (
                    <p className="text-xs text-red-500 font-bold">❌ {promoError}</p>
                  )}
                </div>
              ) : (
                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-3 rounded-xl flex items-center justify-between animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                      {t('promo_applied_text').replace('{code}', appliedPromo.code).replace('{amount}', formatCurrency(appliedPromo.discount_amount))}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemovePromo}
                    className="p-1 hover:bg-emerald-100 dark:hover:bg-emerald-800 rounded-full transition-colors"
                  >
                    <XCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  </button>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-black/10 dark:border-white/20 space-y-2">
              <div className="flex justify-between text-xl font-bold">
                <span className="dark:text-white">{t('total')}</span>
                <div className="text-right">
                  {(appliedPromo || (useWallet && (user?.wallet_balance || 0) > 0)) && (
                    <div className="text-sm text-gray-500 line-through mb-1">
                      {formatCurrency(total + Number(currentZone?.delivery_fee || 0))}
                    </div>
                  )}
                  <div className={`text-[#D4820A] ${(appliedPromo || useWallet) ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
                    {formatCurrency(Math.max(0, total + Number(currentZone?.delivery_fee || 0) - (appliedPromo?.discount_amount || 0) - (useWallet ? Math.min(user?.wallet_balance || 0, total + Number(currentZone?.delivery_fee || 0) - (appliedPromo?.discount_amount || 0)) : 0)))}
                  </div>
                </div>
              </div>
            </div>

            {currentZone && total < currentZone.min_order_amount && (
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-700 dark:text-amber-400 text-xs font-bold">
                ⚠️ {t('min_order_error_prefix')} {currentZone.name} {t('min_order_error_middle')} {currentZone.min_order_amount}. 
                {t('min_order_error_suffix_prefix')} {currentZone.min_order_amount - total} {t('min_order_error_suffix_suffix')}
              </div>
            )}

            {!currentZone && formData.pincode && formData.pincode.length === 6 && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-xs font-bold">
                {t('no_delivery_pincode_prefix')} {formData.pincode} {t('no_delivery_pincode_suffix')}
              </div>
            )}

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
                      {t('logout_now')}
                    </button>
                  )}
                </div>
              </div>
            )}

            <button 
              type="submit"
              disabled={loading || (currentZone && total < currentZone.min_order_amount)}
              className="w-full bg-[#D4820A] text-white py-4 rounded-2xl font-bold text-lg flex items-center justify-center space-x-2 hover:bg-[#B87008] transition-all disabled:opacity-50"
            >
              <ShieldCheck className="w-6 h-6" />
              <span>{loading ? t('placing_order') : t('place_order_securely')}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
