import { useState, useEffect, ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { CartProvider } from './contexts/CartContext';
import { WishlistProvider } from './contexts/WishlistContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import GlobalCart from './components/GlobalCart';
import AIChatAssistant from './components/AIChatAssistant';
import WhatsAppSupport from './components/WhatsAppSupport';
import LocationSelectionModal from './components/LocationSelectionModal';
import ErrorBoundary from './components/ErrorBoundary';
import Home from './pages/Home';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyEmail from './pages/VerifyEmail';
import DeliveryLogin from './pages/DeliveryLogin';
import AdminDashboard from './pages/admin/Dashboard';
import AdminOrders from './pages/admin/Orders';
import AdminProducts from './pages/admin/Products';
import AdminUsers from './pages/admin/Users';
import AdminFarmers from './pages/admin/Farmers';
import AdminDeliveryZones from './pages/admin/DeliveryZones';
import AdminDeliveryStaff from './pages/admin/DeliveryStaff';
import AdminPromoCodes from './pages/admin/PromoCodes';
import AdminAuditLogs from './pages/admin/AuditLogs';
import AdminBundles from './pages/admin/Bundles';
import AdminSubscriptions from './pages/admin/Subscriptions';
import FarmerProfile from './pages/FarmerProfile';
import OrderDetails from './pages/OrderDetails';
import DeliveryDashboard from './pages/DeliveryDashboard';
import Offers from './pages/Offers';
import About from './pages/About';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import Refund from './pages/Refund';
import NotFound from './pages/NotFound';

function PrivateRoute({ children, adminOnly = false, deliveryOnly = false }: { children: ReactNode, adminOnly?: boolean, deliveryOnly?: boolean }) {
  const { isAuthenticated, isAdmin, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (adminOnly && !isAdmin) return <Navigate to="/" />;
  if (deliveryOnly && user?.role !== 'delivery_boy' && !isAdmin) return <Navigate to="/" />;
  return <>{children}</>;
}

function AppRoutes() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved === null ? true : saved === 'true';
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', isDarkMode.toString());
  }, [isDarkMode]);

  const { user } = useAuth();
  const isDeliveryBoy = user?.role === 'delivery_boy';

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${isDarkMode ? 'dark bg-slate-950 text-white' : 'bg-[#FDF6EC] text-[#3B2A1A]'}`}>
      <Navbar isDarkMode={isDarkMode} toggleDarkMode={() => setIsDarkMode(!isDarkMode)} />
      <main className="flex-grow container mx-auto px-2 sm:px-4 py-4 sm:py-8">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<Products />} />
          <Route path="/offers" element={<Offers />} />
          <Route path="/products/:id" element={<ProductDetail />} />
          <Route path="/farmer/:id" element={<FarmerProfile />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/login" element={<Login />} />
          <Route path="/delivery-login" element={<DeliveryLogin />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          
          <Route path="/checkout" element={<PrivateRoute><Checkout /></PrivateRoute>} />
          <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
          <Route path="/orders/:id" element={<PrivateRoute><OrderDetails /></PrivateRoute>} />
          <Route path="/order-tracking/:id" element={<PrivateRoute><OrderDetails /></PrivateRoute>} />
          <Route path="/delivery" element={<PrivateRoute deliveryOnly><DeliveryDashboard /></PrivateRoute>} />
          
          {/* Static Pages */}
          <Route path="/about" element={<About />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/refund" element={<Refund />} />

          {/* Admin Routes */}
          <Route path="/admin" element={<PrivateRoute adminOnly><AdminDashboard /></PrivateRoute>} />
          <Route path="/admin/orders" element={<PrivateRoute adminOnly><AdminOrders /></PrivateRoute>} />
          <Route path="/admin/products" element={<PrivateRoute adminOnly><AdminProducts /></PrivateRoute>} />
          <Route path="/admin/users" element={<PrivateRoute adminOnly><AdminUsers /></PrivateRoute>} />
          <Route path="/admin/farmers" element={<PrivateRoute adminOnly><AdminFarmers /></PrivateRoute>} />
          <Route path="/admin/delivery-staff" element={<PrivateRoute adminOnly><AdminDeliveryStaff /></PrivateRoute>} />
          <Route path="/admin/delivery-zones" element={<PrivateRoute adminOnly><AdminDeliveryZones /></PrivateRoute>} />
          <Route path="/admin/promo-codes" element={<PrivateRoute adminOnly><AdminPromoCodes /></PrivateRoute>} />
          <Route path="/admin/audit-logs" element={<PrivateRoute adminOnly><AdminAuditLogs /></PrivateRoute>} />
          <Route path="/admin/bundles" element={<PrivateRoute adminOnly><AdminBundles /></PrivateRoute>} />
          <Route path="/admin/subscriptions" element={<PrivateRoute adminOnly><AdminSubscriptions /></PrivateRoute>} />

          {/* 404 Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      
      {!isDeliveryBoy && <Footer />}

      {!isDeliveryBoy && (
        <>
          <GlobalCart />
          <AIChatAssistant />
          <WhatsAppSupport />
          <LocationSelectionModal />
        </>
      )}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <LanguageProvider>
          <WishlistProvider>
            <CartProvider>
              <Router>
                <AppRoutes />
              </Router>
            </CartProvider>
          </WishlistProvider>
        </LanguageProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
