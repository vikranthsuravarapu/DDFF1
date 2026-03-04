import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, User, LogOut, Menu, X, Leaf, Sun, Moon } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';

export default function Navbar({ isDarkMode, toggleDarkMode }: { isDarkMode: boolean, toggleDarkMode: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const { isAuthenticated, isAdmin, logout, user } = useAuth();
  const { itemCount } = useCart();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="bg-[#3B2A1A] text-white sticky top-0 z-50 shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center space-x-2">
            <Leaf className="text-[#D4820A] w-8 h-8" />
            <span className="text-xl font-bold tracking-tight">DDFF</span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/products" className="hover:text-[#D4820A] transition-colors">Store</Link>
            {isAdmin && <Link to="/admin" className="text-[#D4820A] font-semibold">Admin Panel</Link>}
            {user?.role === 'delivery_boy' && <Link to="/delivery" className="text-emerald-400 font-semibold">Delivery Dashboard</Link>}
            
            <div className="flex items-center space-x-4">
              <button 
                onClick={toggleDarkMode}
                className="p-2 hover:bg-white/10 rounded-full transition-colors text-[#D4820A]"
                title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

              <Link to="/cart" className="relative p-2 hover:bg-white/10 rounded-full transition-colors">
                <ShoppingCart className="w-6 h-6" />
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#D4820A] text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-[#3B2A1A]">
                    {itemCount}
                  </span>
                )}
              </Link>
              
              {isAuthenticated ? (
                <div className="flex items-center space-x-4">
                  <Link to="/profile" className="flex items-center space-x-2 hover:text-[#D4820A]">
                    <User className="w-5 h-5" />
                    <span className="text-sm font-medium">{user?.name}</span>
                  </Link>
                  <button onClick={handleLogout} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <Link to="/login" className="bg-[#D4820A] px-6 py-2 rounded-full font-semibold hover:bg-[#B87008] transition-colors">
                  Login
                </Link>
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button className="md:hidden p-2" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-[#4A3624] px-4 py-4 space-y-4 border-t border-white/10">
          <div className="flex items-center justify-between py-2 border-b border-white/5">
            <span className="text-sm font-medium">Appearance</span>
            <button 
              onClick={toggleDarkMode}
              className="flex items-center space-x-2 text-[#D4820A] font-bold"
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
            </button>
          </div>
          <Link to="/products" className="block py-2" onClick={() => setIsOpen(false)}>Store</Link>
          {isAdmin && <Link to="/admin" className="block py-2 text-[#D4820A]" onClick={() => setIsOpen(false)}>Admin Panel</Link>}
          {user?.role === 'delivery_boy' && <Link to="/delivery" className="block py-2 text-emerald-400 font-semibold" onClick={() => setIsOpen(false)}>Delivery Dashboard</Link>}
          <Link to="/cart" className="block py-2" onClick={() => setIsOpen(false)}>Cart ({itemCount})</Link>
          {isAuthenticated ? (
            <>
              <Link to="/profile" className="block py-2" onClick={() => setIsOpen(false)}>Profile</Link>
              <button onClick={handleLogout} className="block w-full text-left py-2">Logout</button>
            </>
          ) : (
            <Link to="/login" className="block py-2 text-[#D4820A]" onClick={() => setIsOpen(false)}>Login</Link>
          )}
        </div>
      )}
    </nav>
  );
}
