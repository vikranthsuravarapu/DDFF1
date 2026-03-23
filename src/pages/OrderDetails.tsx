import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Package, CheckCircle2, Truck, Home, MapPin, Clock, ChevronRight, ShieldCheck, RefreshCw, Loader2, Eye, X, Wallet, Building2, MessageCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { formatCurrency } from '../utils/format';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../contexts/LanguageContext';

export default function OrderDetails() {
  const { t } = useLanguage();
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, user, isAdmin, apiFetch } = useAuth();
  const { addItem, setNotification } = useCart();
  const [order, setOrder] = useState<any>(null);
  const [tracking, setTracking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isRepeating, setIsRepeating] = useState(false);
  const [showProofModal, setShowProofModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelStep, setCancelStep] = useState(1);
  const [cancellationReason, setCancellationReason] = useState('');
  const [refundMethod, setRefundMethod] = useState<'wallet' | 'bank' | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<{ message: string; support: boolean } | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [orderRes, trackingRes] = await Promise.all([
        apiFetch(`/api/orders/${id}`),
        apiFetch(`/api/orders/${id}/tracking`)
      ]);

      const orderData = await orderRes.json();
      const trackingData = await trackingRes.json();

      setOrder(orderData);
      setTracking(trackingData);
    } catch (e) {
      console.error('Error fetching order details:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async () => {
    if (isCancelling || !order) return;
    setIsCancelling(true);
    setCancelError(null);
    try {
      const res = await apiFetch(`/api/orders/${id}/cancel`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          cancellation_reason: cancellationReason,
          refund_method: refundMethod
        })
      });
      const data = await res.json();
      if (data.success) {
        setNotification(`✅ ${t('cancel_success')}`);
        setShowCancelModal(false);
        setCancelStep(1);
        setCancellationReason('');
        setRefundMethod(null);
        fetchData(); // Refresh order status
      } else {
        setCancelError({ 
          message: t(data.error) || t('cancel_failed'),
          support: !!data.support_message
        });
      }
    } catch (err) {
      console.error('Failed to cancel order:', err);
      setCancelError({ 
        message: t('cancel_error'),
        support: false
      });
    } finally {
      setIsCancelling(false);
    }
  };

  const handleRepeatOrder = async () => {
    if (isRepeating || !order) return;
    
    setIsRepeating(true);
    try {
      if (!order.items || order.items.length === 0) {
        setNotification(t('no_items_found'));
        return;
      }

      const productsRes = await apiFetch('/api/products');
      const allProducts = await productsRes.json();

      let addedCount = 0;
      let warnings: string[] = [];

      for (const item of order.items) {
        const currentProduct = allProducts.find((p: any) => p.id === item.product_id);
        
        if (currentProduct && currentProduct.stock > 0) {
          const isActiveSale = currentProduct.sale_price !== null && currentProduct.sale_ends_at && new Date(currentProduct.sale_ends_at) > new Date();
          const displayPrice = isActiveSale ? currentProduct.sale_price : currentProduct.price;
          
          const qtyToAdd = Math.min(item.quantity, currentProduct.stock);
          addItem({ ...currentProduct, price: displayPrice }, qtyToAdd);
          addedCount++;
        } else {
          warnings.push(`⚠️ ${item.name} ${t('unavailable_warning')}`);
        }
      }

      if (warnings.length > 0) {
        warnings.forEach((w, index) => {
          setTimeout(() => setNotification(w), index * 2000);
        });
        
        if (addedCount > 0) {
          setTimeout(() => {
            setNotification(`✅ ${t('items_added')}`);
            navigate('/products');
          }, warnings.length * 2000);
        }
      } else if (addedCount > 0) {
        setNotification(`✅ ${t('items_added')}`);
        navigate('/products');
      }
    } catch (err) {
      console.error('Failed to repeat order:', err);
      setNotification(`❌ ${t('repeat_failed')}`);
    } finally {
      setIsRepeating(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'delivery_boy') {
      navigate('/delivery');
    }
  }, [user, navigate]);

  useEffect(() => {
    if (id && token) {
      fetchData();
    }
  }, [id, token]);

  const isCancellable = order && (order.status === 'processing' || order.status === 'confirmed') && 
    (new Date().getTime() - new Date(order.created_at).getTime()) < 30 * 60 * 1000;

  if (loading) return (
    <div className="max-w-4xl mx-auto space-y-8 animate-pulse">
      <div className="h-8 w-48 bg-gray-200 dark:bg-slate-800 rounded-xl" />
      <div className="h-64 bg-white dark:bg-slate-800 rounded-3xl" />
      <div className="h-96 bg-white dark:bg-slate-800 rounded-3xl" />
    </div>
  );

  if (!order || !tracking) return (
      <div className="text-center py-20 space-y-4">
        <Package className="w-16 h-16 text-gray-300 dark:text-slate-600 mx-auto" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">{t('order_not_found')}</h2>
        <p className="text-gray-500 dark:text-slate-300">{t('order_not_found_desc')}</p>
        <Link to="/profile" className="inline-block text-[#D4820A] font-bold hover:underline">{t('back_to_orders')}</Link>
      </div>
  );

  const getEstimatedDelivery = () => {
    if (order.status === 'delivered') {
      const deliveredStep = tracking.steps.find((s: any) => s.status === 'delivered');
      return deliveredStep?.date ? `${t('status_delivered')} ${t('credited_on').toLowerCase()} ${new Date(deliveredStep.date).toLocaleDateString()}` : t('status_delivered');
    }
    if (order.status === 'cancelled') return t('status_cancelled');

    const now = new Date();
    let minDays = 3;
    let maxDays = 5;

    if (order.status === 'confirmed') {
      minDays = 2;
      maxDays = 4;
    } else if (order.status === 'shipped') {
      minDays = 1;
      maxDays = 2;
    }

    const minDate = new Date(now);
    minDate.setDate(minDate.getDate() + minDays);
    const maxDate = new Date(now);
    maxDate.setDate(maxDate.getDate() + maxDays);

    return `${minDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - ${maxDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="flex items-center space-x-2 text-gray-600 dark:text-slate-300 hover:text-[#D4820A] transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span>{t('back_to_orders')}</span>
        </button>
        <div className="flex items-center space-x-2">
          <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
            order.status === 'delivered' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
            order.status === 'processing' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
            order.status === 'cancelled' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
            'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
          }`}>
            {t(`status_${order.status}`)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Order Header */}
          <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-black/5 dark:border-white/10 shadow-sm transition-colors">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div>
                <div className="flex items-center space-x-4">
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">{t('order_details')}</h1>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleRepeatOrder}
                      disabled={isRepeating}
                      className="flex items-center space-x-2 bg-[#D4820A]/10 text-[#D4820A] px-4 py-1.5 rounded-full text-xs font-bold hover:bg-[#D4820A] hover:text-white transition-all disabled:opacity-50"
                    >
                      {isRepeating ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3 h-3" />
                      )}
                      <span>{t('order_again')}</span>
                    </button>
                    {(order.status === 'delivered' || order.status === 'confirmed') && (
                      <button
                        onClick={() => window.open(`/api/orders/${id}/invoice?token=${token}`, '_blank')}
                        className="flex items-center space-x-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-4 py-1.5 rounded-full text-xs font-bold hover:bg-blue-100 transition-all"
                      >
                        <span>📄 {t('download_invoice')}</span>
                      </button>
                    )}
                    {isCancellable && (
                      <button
                        onClick={() => setShowCancelModal(true)}
                        className="flex items-center space-x-2 border border-red-500/30 text-red-500 px-4 py-1.5 rounded-full text-xs font-bold hover:bg-red-500 hover:text-white transition-all"
                      >
                        <X className="w-3 h-3" />
                        <span>{t('cancel_order')}</span>
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-gray-500 dark:text-slate-300">#DDFF-{order.id.toString().padStart(4, '0')} • {new Date(order.created_at).toLocaleDateString()}</p>
              </div>
              <div className="text-left md:text-right">
                <p className="text-sm text-gray-500 dark:text-slate-300 font-medium">{t('estimated_delivery')}</p>
                <div className="flex items-center md:justify-end space-x-2 text-[#D4820A] font-bold">
                  <Clock className="w-4 h-4" />
                  <span>{getEstimatedDelivery()}</span>
                </div>
                {order.delivery_slot && (
                  <div className="mt-2 text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center md:justify-end space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>{t('slot')}: {order.delivery_slot}</span>
                  </div>
                )}
                {isAdmin && order.proof_of_delivery_image && (
                  <div className="mt-4 flex md:justify-end">
                    <button 
                      onClick={() => setShowProofModal(true)}
                      className="flex items-center space-x-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-4 py-2 rounded-xl text-xs font-bold hover:bg-emerald-200 transition-all"
                    >
                      <Eye className="w-4 h-4" />
                      <span>{t('view_proof')}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Tracking Steps */}
            <div className="relative py-4">
              {order.refund_status && (
                <div className="mb-8 p-4 rounded-2xl border transition-colors flex items-center space-x-4 bg-opacity-10 dark:bg-opacity-20 shadow-sm">
                  {order.refund_status === 'processed' && order.refund_method === 'wallet' && (
                    <div className="flex items-center space-x-4 w-full">
                      <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
                        <Wallet className="w-6 h-6 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-green-700 dark:text-green-400">✅ {formatCurrency(order.refund_amount || order.final_amount)} {t('refunded_instantly')}</p>
                        <p className="text-xs text-green-600/70 dark:text-green-400/70">{t('credited_on')} {new Date(order.refunded_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  )}
                  {order.refund_status === 'pending' && order.refund_method === 'bank' && (
                    <div className="flex items-center space-x-4 w-full">
                      <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-amber-700 dark:text-amber-400">🕐 {t('bank_refund_processing')} ({formatCurrency(order.refund_amount || order.final_amount)})</p>
                        <p className="text-xs text-amber-600/70 dark:text-amber-400/70">{t('reflects_days')} • {t('refund_id')}: {order.refund_id}</p>
                      </div>
                    </div>
                  )}
                  {order.refund_status === 'failed' && (
                    <div className="flex items-center space-x-4 w-full">
                      <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center">
                        <X className="w-6 h-6 text-red-600 dark:text-red-400" />
                      </div>
                      <div className="flex-1 flex items-center justify-between">
                        <div>
                          <p className="font-bold text-red-700 dark:text-red-400">❌ {t('refund_failed')}</p>
                          <p className="text-xs text-red-600/70 dark:text-red-400/70">{t('refund_support')}</p>
                        </div>
                        <a 
                          href={`https://wa.me/${import.meta.env.VITE_SUPPORT_WHATSAPP}?text=Hi, I need help with a failed refund for Order #DDFF-${order.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-green-500 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 hover:bg-green-600 transition-colors"
                        >
                          <MessageCircle className="w-4 h-4" />
                          <span>{t('support')}</span>
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              )}
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-100 dark:bg-slate-700 transition-colors" />
              <div className="space-y-10 relative">
                {tracking.steps.map((step: any, i: number) => (
                  <div key={i} className="flex items-start space-x-6">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center z-10 transition-colors ${
                      step.completed ? 'bg-[#D4820A] text-white shadow-lg shadow-[#D4820A]/20' : 'bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-slate-500'
                    }`}>
                      {step.status === 'processing' && <Clock className="w-5 h-5" />}
                      {step.status === 'confirmed' && <Package className="w-5 h-5" />}
                      {step.status === 'shipped' && <Truck className="w-5 h-5" />}
                      {step.status === 'delivered' && <Home className="w-5 h-5" />}
                    </div>
                    <div className="pt-1">
                      <h3 className={`font-bold ${step.completed ? 'text-gray-900 dark:text-slate-100' : 'text-gray-400 dark:text-slate-500'}`}>
                        {t(`status_${step.status}`)}
                      </h3>
                      {step.date && (
                        <p className="text-xs text-gray-500 dark:text-slate-300">
                          {new Date(step.date).toLocaleDateString()} • {new Date(step.date).toLocaleTimeString()}
                        </p>
                      )}
                      {!step.date && step.completed && (
                        <p className="text-xs text-gray-500 dark:text-slate-300">{t('completed')}</p>
                      )}
                      {!step.completed && (
                        <p className="text-xs text-gray-400 dark:text-slate-500 italic">{t('pending')}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-black/5 dark:border-white/10 shadow-sm transition-colors">
            <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-6">{t('order_items')}</h2>
            <div className="space-y-4">
              {order.items.map((item: any) => (
                <div key={item.id} className="flex items-center justify-between p-4 rounded-2xl border border-black/5 dark:border-white/5 bg-gray-50 dark:bg-slate-900/50 transition-colors">
                  <div className="flex items-center space-x-4">
                    <img src={item.image_url} alt={item.name} className="w-16 h-16 rounded-xl object-cover" />
                    <div>
                      <p className="font-bold text-gray-900 dark:text-slate-100">{item.name}</p>
                      <p className="text-sm text-gray-500 dark:text-slate-300">{item.quantity} {item.unit} x {formatCurrency(item.price)}</p>
                    </div>
                  </div>
                  <p className="font-bold text-gray-900 dark:text-slate-100">{formatCurrency(item.quantity * item.price)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          {/* Summary Card */}
          <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-black/5 dark:border-white/10 shadow-sm transition-colors">
            <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-6">{t('payment_summary')}</h2>
            <div className="space-y-4">
              <div className="flex justify-between text-gray-600 dark:text-slate-300">
                <span>{t('subtotal')}</span>
                <span className="font-medium">{formatCurrency(order.total_amount)}</span>
              </div>
              <div className="flex justify-between text-gray-600 dark:text-slate-300">
                <span>{t('discount')}</span>
                <span className="text-green-600 dark:text-green-400 font-medium">-{formatCurrency(order.discount_amount)}</span>
              </div>
              <div className="flex justify-between text-gray-600 dark:text-slate-300">
                <span>{t('delivery')}</span>
                <span className={Number(order.delivery_fee) > 0 ? "font-medium" : "text-green-600 dark:text-green-400 font-medium"}>
                  {Number(order.delivery_fee) > 0 ? formatCurrency(order.delivery_fee) : t('free')}
                </span>
              </div>
              {order.promo_code && (
                <div className="flex justify-between text-xs text-gray-500 dark:text-slate-400 italic">
                  <span>{t('promo_code')}</span>
                  <span>{order.promo_code}</span>
                </div>
              )}
              <div className="pt-4 border-t border-black/10 dark:border-white/10 flex justify-between items-center">
                <span className="font-bold text-gray-900 dark:text-slate-100">{t('total')}</span>
                <span className="text-2xl font-bold text-[#D4820A]">{formatCurrency(order.final_amount)}</span>
              </div>
              <div className="mt-4 p-3 bg-gray-50 dark:bg-slate-900/50 rounded-xl text-center">
                <p className="text-xs text-gray-500 dark:text-slate-300 uppercase font-bold mb-1">{t('payment_method')}</p>
                <p className="font-bold text-gray-900 dark:text-slate-100 uppercase">{t(order.payment_method) === order.payment_method ? (order.payment_method === 'cod' ? t('cod') : t('online_payment')) : t(order.payment_method)}</p>
              </div>
            </div>
          </div>

          {/* Delivery Address */}
          <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-black/5 dark:border-white/10 shadow-sm transition-colors">
            <div className="flex items-center space-x-2 text-gray-900 dark:text-slate-100 font-bold mb-4">
              <MapPin className="w-5 h-5 text-[#D4820A]" />
              <h2>{t('delivery_address')}</h2>
            </div>
            <div className="text-gray-600 dark:text-slate-300 text-sm leading-relaxed">
              <p className="font-bold text-gray-900 dark:text-slate-100 mb-1">{order.user_name}</p>
              <p>{order.house_no}, {order.street}</p>
              {order.landmark && <p>{t('landmark')} {order.landmark}</p>}
              <p>{order.city}, {order.district}</p>
              <p>{order.state} - {order.pincode}</p>
            </div>
          </div>

          {/* Help Card */}
          <div className="bg-[#FDF6EC] dark:bg-slate-900/50 p-6 rounded-3xl border border-[#D4820A]/20 transition-colors">
            <div className="flex items-center space-x-3 text-[#D4820A] font-bold mb-2">
              <ShieldCheck className="w-5 h-5" />
              <span>{t('gr_promise')}</span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
              {t('gr_promise_desc')}
            </p>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showProofModal && order.proof_of_delivery_image && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative bg-white dark:bg-slate-800 p-2 rounded-[2.5rem] max-w-2xl w-full overflow-hidden shadow-2xl"
            >
              <button 
                onClick={() => setShowProofModal(false)}
                className="absolute top-6 right-6 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full z-10 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
              <div className="p-6 space-y-4">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
                    <ShieldCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100">{t('proof_of_delivery')}</h3>
                    <p className="text-xs text-gray-500 dark:text-slate-400 uppercase font-bold tracking-wider">Order #DDFF-{order.id}</p>
                  </div>
                </div>
                <div className="aspect-video rounded-3xl overflow-hidden bg-gray-100 dark:bg-slate-900">
                  <img 
                    src={order.proof_of_delivery_image} 
                    alt={t('proof_of_delivery')} 
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-slate-400">
                    <Clock className="w-4 h-4" />
                    <span>{t('status_delivered')} {t('credited_on').toLowerCase()} {new Date(order.created_at).toLocaleDateString()}</span>
                  </div>
                  <a 
                    href={order.proof_of_delivery_image} 
                    download={`POD-${order.id}.jpg`}
                    className="text-[#D4820A] font-bold text-sm hover:underline"
                  >
                    {t('download_image')}
                  </a>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {showCancelModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] max-w-md w-full shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                  {cancelStep === 1 ? t('cancel_order') + '?' : cancelStep === 2 ? t('refund_method') : t('confirm_cancellation')}
                </h3>
                <div className="flex space-x-1">
                  {[1, 2, 3].map(s => (
                    ((order.payment_method === 'online' && Number(order.final_amount) > 0) || s !== 2) && (
                      <div key={s} className={`h-1.5 rounded-full transition-all ${cancelStep === s ? 'w-6 bg-[#D4820A]' : 'w-2 bg-gray-200 dark:bg-slate-700'}`} />
                    )
                  ))}
                </div>
              </div>

              {cancelError && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-2xl">
                  <p className="text-sm text-red-600 dark:text-red-400 font-medium">{cancelError.message}</p>
                  {cancelError.support && (
                    <a 
                      href={`https://wa.me/${import.meta.env.VITE_SUPPORT_WHATSAPP}?text=Hi, I need help with cancelling Order #DDFF-${order.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 w-full bg-green-500 text-white py-2 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 hover:bg-green-600 transition-colors"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>{t('contact_support')}</span>
                    </a>
                  )}
                </div>
              )}

              {cancelStep === 1 && (
                <div className="space-y-6">
                  <p className="text-gray-500 dark:text-slate-400">{t('referral_desc')}</p>
                  <div className="space-y-4">
                    <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider">{t('cancellation_reason')}</label>
                    <select 
                      value={cancellationReason}
                      onChange={(e) => setCancellationReason(e.target.value)}
                      className="w-full bg-gray-50 dark:bg-slate-900 border border-black/5 dark:border-white/10 rounded-2xl px-4 py-3 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-[#D4820A] transition-all"
                    >
                      <option value="">{t('select_reason')}</option>
                      <option value="Changed my mind">{t('reason_mind')}</option>
                      <option value="Ordered by mistake">{t('reason_mistake')}</option>
                      <option value="Delivery time too long">{t('reason_long')}</option>
                      <option value="Found a better price">{t('reason_price')}</option>
                      <option value="Other">{t('reason_other')}</option>
                    </select>
                  </div>
                  <button
                    disabled={!cancellationReason}
                    onClick={() => {
                      if (order.payment_method === 'online' && Number(order.final_amount) > 0) {
                        setCancelStep(2);
                      } else {
                        // If COD or online with 0 final amount (full wallet payment)
                        // we skip step 2 as refund is automatic to wallet if any
                        setCancelStep(3);
                        if (order.wallet_amount_used > 0) {
                          setRefundMethod('wallet');
                        }
                      }
                    }}
                    className="w-full bg-[#D4820A] text-white py-4 rounded-2xl font-bold hover:bg-[#B46E08] transition-all disabled:opacity-50"
                  >
                    {t('next')} →
                  </button>
                </div>
              )}

              {cancelStep === 2 && (
                <div className="space-y-6">
                  <p className="text-gray-500 dark:text-slate-400">{t('refund_method')} <span className="font-bold text-gray-900 dark:text-slate-100">{formatCurrency(order.final_amount)}</span>.</p>
                  <div className="grid grid-cols-1 gap-4">
                    <button
                      onClick={() => setRefundMethod('wallet')}
                      className={`p-4 rounded-2xl border-2 text-left transition-all ${refundMethod === 'wallet' ? 'border-[#D4820A] bg-[#D4820A]/5' : 'border-black/5 dark:border-white/10'}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
                          <Wallet className="w-6 h-6 text-green-600 dark:text-green-400" />
                        </div>
                        <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">⚡ {t('instant')}</span>
                      </div>
                      <h4 className="font-bold text-gray-900 dark:text-slate-100">{t('instant_wallet')}</h4>
                      <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">{t('instant_wallet_desc')}</p>
                    </button>

                    <button
                      onClick={() => setRefundMethod('bank')}
                      className={`p-4 rounded-2xl border-2 text-left transition-all ${refundMethod === 'bank' ? 'border-[#D4820A] bg-[#D4820A]/5' : 'border-black/5 dark:border-white/10'}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
                          <Building2 className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                        </div>
                        <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">🕐 5-7 {t('days')}</span>
                      </div>
                      <h4 className="font-bold text-gray-900 dark:text-slate-100">{t('bank_refund')}</h4>
                      <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">{t('bank_refund_desc')}</p>
                    </button>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setCancelStep(1)}
                      className="flex-1 bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-slate-100 py-4 rounded-2xl font-bold hover:bg-gray-200 transition-all"
                    >
                      {t('back')}
                    </button>
                    <button
                      disabled={!refundMethod}
                      onClick={() => setCancelStep(3)}
                      className="flex-[2] bg-[#D4820A] text-white py-4 rounded-2xl font-bold hover:bg-[#B46E08] transition-all disabled:opacity-50"
                    >
                      {t('next')} →
                    </button>
                  </div>
                </div>
              )}

              {cancelStep === 3 && (
                <div className="space-y-6">
                  <div className="p-6 bg-gray-50 dark:bg-slate-900/50 rounded-3xl border border-black/5 dark:border-white/5">
                    <p className="text-sm text-gray-500 dark:text-slate-400 mb-1 uppercase font-bold tracking-wider">{t('cancel_order')}</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-4">#DDFF-{order.id.toString().padStart(4, '0')}</p>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500 dark:text-slate-400">{t('description')}:</span>
                        <span className="font-bold text-gray-900 dark:text-slate-100">{t(cancellationReason) || cancellationReason}</span>
                      </div>
                      {order.payment_method === 'online' && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500 dark:text-slate-400">{t('refund_method')}:</span>
                          <span className="font-bold text-gray-900 dark:text-slate-100 capitalize">{t(refundMethod) || refundMethod}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm pt-3 border-t border-black/5 dark:border-white/5">
                        <span className="text-gray-500 dark:text-slate-400">{t('refund_amount')}:</span>
                        <span className="font-bold text-[#D4820A]">{formatCurrency(Number(order.final_amount) + Number(order.wallet_amount_used))}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <button
                      onClick={handleCancelOrder}
                      disabled={isCancelling}
                      className="w-full bg-red-500 text-white py-4 rounded-2xl font-bold hover:bg-red-600 transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
                    >
                      {isCancelling ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                      <span>{t('confirm_cancellation')}</span>
                    </button>
                    <button
                      onClick={() => setCancelStep(order.payment_method === 'online' ? 2 : 1)}
                      className="w-full bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-slate-100 py-4 rounded-2xl font-bold hover:bg-gray-200 transition-all"
                    >
                      {t('go_back')}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
