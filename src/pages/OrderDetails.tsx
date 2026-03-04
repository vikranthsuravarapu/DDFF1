import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Package, CheckCircle2, Truck, Home, MapPin, Clock, ChevronRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function OrderDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [order, setOrder] = useState<any>(null);
  const [tracking, setTracking] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [orderRes, trackingRes] = await Promise.all([
          fetch(`/api/orders/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch(`/api/orders/${id}/tracking`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
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

    if (id && token) {
      fetchData();
    }
  }, [id, token]);

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
        <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Order Not Found</h2>
        <p className="text-gray-500 dark:text-slate-300">We couldn't find the order you're looking for.</p>
        <Link to="/profile" className="inline-block text-[#D4820A] font-bold hover:underline">Back to My Orders</Link>
      </div>
  );

  const getEstimatedDelivery = () => {
    if (order.status === 'delivered') {
      const deliveredStep = tracking.steps.find((s: any) => s.status === 'delivered');
      return deliveredStep?.date ? `Delivered on ${new Date(deliveredStep.date).toLocaleDateString()}` : 'Delivered';
    }
    if (order.status === 'cancelled') return 'Order Cancelled';

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
          <span>Back to Orders</span>
        </button>
        <div className="flex items-center space-x-2">
          <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
            order.status === 'delivered' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
            order.status === 'processing' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
            order.status === 'cancelled' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
            'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
          }`}>
            {order.status}
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
                <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Order Details</h1>
                <p className="text-gray-500 dark:text-slate-300">#DDFF-{order.id.toString().padStart(4, '0')} • {new Date(order.created_at).toLocaleDateString()}</p>
              </div>
              <div className="text-left md:text-right">
                <p className="text-sm text-gray-500 dark:text-slate-300 font-medium">Estimated Delivery</p>
                <div className="flex items-center md:justify-end space-x-2 text-[#D4820A] font-bold">
                  <Clock className="w-4 h-4" />
                  <span>{getEstimatedDelivery()}</span>
                </div>
              </div>
            </div>

            {/* Tracking Steps */}
            <div className="relative py-4">
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
                        {step.label}
                      </h3>
                      {step.date && (
                        <p className="text-xs text-gray-500 dark:text-slate-300">
                          {new Date(step.date).toLocaleDateString()} • {new Date(step.date).toLocaleTimeString()}
                        </p>
                      )}
                      {!step.date && step.completed && (
                        <p className="text-xs text-gray-500 dark:text-slate-300">Completed</p>
                      )}
                      {!step.completed && (
                        <p className="text-xs text-gray-400 dark:text-slate-500 italic">Pending...</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-black/5 dark:border-white/10 shadow-sm transition-colors">
            <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-6">Order Items</h2>
            <div className="space-y-4">
              {order.items.map((item: any) => (
                <div key={item.id} className="flex items-center justify-between p-4 rounded-2xl border border-black/5 dark:border-white/5 bg-gray-50 dark:bg-slate-900/50 transition-colors">
                  <div className="flex items-center space-x-4">
                    <img src={item.image_url} alt={item.name} className="w-16 h-16 rounded-xl object-cover" />
                    <div>
                      <p className="font-bold text-gray-900 dark:text-slate-100">{item.name}</p>
                      <p className="text-sm text-gray-500 dark:text-slate-300">{item.quantity} {item.unit} x ₹{item.price}</p>
                    </div>
                  </div>
                  <p className="font-bold text-gray-900 dark:text-slate-100">₹{item.quantity * item.price}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          {/* Summary Card */}
          <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-black/5 dark:border-white/10 shadow-sm transition-colors">
            <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-6">Payment Summary</h2>
            <div className="space-y-4">
              <div className="flex justify-between text-gray-600 dark:text-slate-300">
                <span>Subtotal</span>
                <span className="font-medium">₹{order.total_amount}</span>
              </div>
              <div className="flex justify-between text-gray-600 dark:text-slate-300">
                <span>Discount</span>
                <span className="text-green-600 dark:text-green-400 font-medium">-₹{order.discount_amount}</span>
              </div>
              <div className="flex justify-between text-gray-600 dark:text-slate-300">
                <span>Delivery</span>
                <span className="text-green-600 dark:text-green-400 font-medium">FREE</span>
              </div>
              <div className="pt-4 border-t border-black/10 dark:border-white/10 flex justify-between items-center">
                <span className="font-bold text-gray-900 dark:text-slate-100">Total</span>
                <span className="text-2xl font-bold text-[#D4820A]">₹{order.final_amount}</span>
              </div>
              <div className="mt-4 p-3 bg-gray-50 dark:bg-slate-900/50 rounded-xl text-center">
                <p className="text-xs text-gray-500 dark:text-slate-300 uppercase font-bold mb-1">Payment Method</p>
                <p className="font-bold text-gray-900 dark:text-slate-100 uppercase">{order.payment_method}</p>
              </div>
            </div>
          </div>

          {/* Delivery Address */}
          <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-black/5 dark:border-white/10 shadow-sm transition-colors">
            <div className="flex items-center space-x-2 text-gray-900 dark:text-slate-100 font-bold mb-4">
              <MapPin className="w-5 h-5 text-[#D4820A]" />
              <h2>Delivery Address</h2>
            </div>
            <div className="text-gray-600 dark:text-slate-300 text-sm leading-relaxed">
              <p className="font-bold text-gray-900 dark:text-slate-100 mb-1">{order.user_name}</p>
              <p>{order.house_no}, {order.street}</p>
              {order.landmark && <p>Near {order.landmark}</p>}
              <p>{order.city}, {order.district}</p>
              <p>{order.state} - {order.pincode}</p>
            </div>
          </div>

          {/* Help Card */}
          <div className="bg-[#FDF6EC] dark:bg-slate-900/50 p-6 rounded-3xl border border-[#D4820A]/20 transition-colors">
            <div className="flex items-center space-x-3 text-[#D4820A] font-bold mb-2">
              <ShieldCheck className="w-5 h-5" />
              <span>Grama Ruchulu Promise</span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
              Your order is handled with care by our farmers and delivered fresh to your doorstep. Need help? Contact our support.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
