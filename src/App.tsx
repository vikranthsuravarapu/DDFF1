import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { WishlistProvider } from './contexts/WishlistContext';
import Navbar from './components/Navbar';
import AIChatAssistant from './components/AIChatAssistant';
import Home from './pages/Home';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminDashboard from './pages/admin/Dashboard';
import AdminOrders from './pages/admin/Orders';
import AdminProducts from './pages/admin/Products';
import AdminUsers from './pages/admin/Users';
import FarmerProfile from './pages/FarmerProfile';
import OrderDetails from './pages/OrderDetails';
import DeliveryDashboard from './pages/DeliveryDashboard';

function PrivateRoute({ children, adminOnly = false, deliveryOnly = false }: { children: React.ReactNode, adminOnly?: boolean, deliveryOnly?: boolean }) {
  const { isAuthenticated, isAdmin, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (adminOnly && !isAdmin) return <Navigate to="/" />;
  if (deliveryOnly && user?.role !== 'delivery_boy' && !isAdmin) return <Navigate to="/" />;
  return <>{children}</>;
}

function AppRoutes() {
  const [isDarkMode, setIsDarkMode] = React.useState(() => localStorage.getItem('darkMode') === 'true');

  React.useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', isDarkMode.toString());
  }, [isDarkMode]);

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? 'dark bg-slate-950 text-white' : 'bg-[#FDF6EC] text-[#3B2A1A]'}`}>
      <Navbar isDarkMode={isDarkMode} toggleDarkMode={() => setIsDarkMode(!isDarkMode)} />
      <main className="container mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<Products />} />
          <Route path="/products/:id" element={<ProductDetail />} />
          <Route path="/farmer/:id" element={<FarmerProfile />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          <Route path="/checkout" element={<PrivateRoute><Checkout /></PrivateRoute>} />
          <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
          <Route path="/orders/:id" element={<PrivateRoute><OrderDetails /></PrivateRoute>} />
          <Route path="/order-tracking/:id" element={<PrivateRoute><OrderDetails /></PrivateRoute>} />
          <Route path="/delivery" element={<PrivateRoute deliveryOnly><DeliveryDashboard /></PrivateRoute>} />
          
          {/* Admin Routes */}
          <Route path="/admin" element={<PrivateRoute adminOnly><AdminDashboard /></PrivateRoute>} />
          <Route path="/admin/orders" element={<PrivateRoute adminOnly><AdminOrders /></PrivateRoute>} />
          <Route path="/admin/products" element={<PrivateRoute adminOnly><AdminProducts /></PrivateRoute>} />
          <Route path="/admin/users" element={<PrivateRoute adminOnly><AdminUsers /></PrivateRoute>} />
        </Routes>
      </main>
      <AIChatAssistant />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <WishlistProvider>
        <CartProvider>
          <Router>
            <AppRoutes />
          </Router>
        </CartProvider>
      </WishlistProvider>
    </AuthProvider>
  );
}
