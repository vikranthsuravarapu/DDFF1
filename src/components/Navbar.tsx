import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, User, LogOut, Menu, X, Sun, Moon, MapPin, Tag, Smartphone, Share, Wallet } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useLanguage } from '../contexts/LanguageContext';

export default function Navbar({ isDarkMode, toggleDarkMode }: { isDarkMode: boolean, toggleDarkMode: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const { isAuthenticated, isAdmin, logout, user, userLocation, setIsLocationModalOpen } = useAuth();
  const { itemCount } = useCart();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [showIosTooltip, setShowIosTooltip] = useState(false);

  useEffect(() => {
    const isInstalled = localStorage.getItem('pwa-installed') === 'true';
    if (isInstalled) return;

    // Check if it's iOS
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

    if (isIos && !isStandalone) {
      const hasDismissedIos = localStorage.getItem('pwa-ios-dismissed') === 'true';
      if (!hasDismissedIos) {
        setShowIosTooltip(true);
      }
    }

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallButton(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', () => {
      localStorage.setItem('pwa-installed', 'true');
      setShowInstallButton(false);
    });

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      localStorage.setItem('pwa-installed', 'true');
      setShowInstallButton(false);
    }
    setDeferredPrompt(null);
  };

  const dismissIosTooltip = () => {
    localStorage.setItem('pwa-ios-dismissed', 'true');
    setShowIosTooltip(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const LanguageToggle = () => (
    <div className="flex items-center bg-white/10 rounded-full p-1 border border-white/10">
      <button
        onClick={() => setLanguage('en')}
        className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${
          language === 'en' ? 'bg-[#D4820A] text-white shadow-lg' : 'text-gray-400 hover:text-white'
        }`}
      >
        EN
      </button>
      <button
        onClick={() => setLanguage('te')}
        className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${
          language === 'te' ? 'bg-[#D4820A] text-white shadow-lg' : 'text-gray-400 hover:text-white'
        }`}
      >
        తె
      </button>
    </div>
  );

  return (
    <nav className="bg-[#3B2A1A] text-white sticky top-0 z-50 shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center space-x-2">
            <img src="/logo.svg" alt="DDFF Logo" className="w-10 h-10" />
            <span className="text-xl font-bold tracking-tight">DDFF</span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-6">
            {isAuthenticated && userLocation && user?.role !== 'delivery_boy' && (
              <button 
                onClick={() => setIsLocationModalOpen(true)}
                className="flex items-center space-x-2 text-[#D4820A] bg-white/5 px-4 py-2 rounded-full border border-white/10 hover:bg-white/10 transition-all group"
              >
                <MapPin className="w-4 h-4 group-hover:scale-110 transition-transform" />
                <div className="flex flex-col items-start leading-none">
                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Delivering to</span>
                  <span className="text-sm font-bold uppercase tracking-wider">{userLocation}</span>
                </div>
              </button>
            )}
            {user?.role !== 'delivery_boy' && (
              <>
                <Link to="/products" className="hover:text-[#D4820A] transition-colors">{t('store')}</Link>
                <Link to="/offers" className="hover:text-[#D4820A] transition-colors flex items-center gap-1">
                  <Tag className="w-4 h-4" />
                  {t('offers')}
                </Link>
              </>
            )}
            {isAdmin && (
              <div className="flex items-center space-x-4 border-l border-white/10 pl-4">
                <Link to="/admin" className="text-[#D4820A] font-semibold hover:text-white transition-colors">{t('admin')}</Link>
              </div>
            )}
            {user?.role === 'delivery_boy' && <Link to="/delivery" className="text-emerald-400 font-semibold">{t('delivery')}</Link>}
            
            <div className="flex items-center space-x-4">
              <LanguageToggle />
              <button 
                onClick={toggleDarkMode}
                className="p-2 hover:bg-white/10 rounded-full transition-colors text-[#D4820A]"
              >
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

              {user?.role !== 'delivery_boy' && (
                <div className="flex items-center space-x-4">
                  <Link to="/profile?tab=wallet" className="flex items-center space-x-1 text-[#D4820A] bg-white/5 px-3 py-1.5 rounded-full border border-white/10 hover:bg-white/10 transition-all">
                    <Wallet className="w-4 h-4" />
                    <span className="text-xs font-bold">{user?.wallet_balance ? `₹${user.wallet_balance}` : '₹0'}</span>
                  </Link>
                  <Link to="/cart" className="relative p-2 hover:bg-white/10 rounded-full transition-colors">
                    <ShoppingCart className="w-6 h-6" />
                    {itemCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-[#D4820A] text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-[#3B2A1A]">
                        {itemCount}
                      </span>
                    )}
                  </Link>
                </div>
              )}
              
              {isAuthenticated ? (
                <div className="flex items-center space-x-4">
                  {user?.role !== 'delivery_boy' && (
                    <Link to="/profile" className="flex items-center space-x-2 hover:text-[#D4820A]">
                      <User className="w-5 h-5" />
                      <span className="text-sm font-medium">{user?.name}</span>
                    </Link>
                  )}
                  <button onClick={handleLogout} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <Link to="/login" className="bg-[#D4820A] px-6 py-2 rounded-full font-semibold hover:bg-[#B87008] transition-colors">
                  {t('login')}
                </Link>
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center space-x-4 md:hidden">
            <LanguageToggle />
            <button className="p-2" onClick={() => setIsOpen(!isOpen)}>
              {isOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-[#4A3624] px-4 py-4 space-y-4 border-t border-white/10">
          {isAuthenticated && userLocation && user?.role !== 'delivery_boy' && (
            <div className="space-y-2">
              <button 
                onClick={() => {
                  setIsLocationModalOpen(true);
                  setIsOpen(false);
                }}
                className="w-full flex items-center justify-between text-[#D4820A] py-3 border-b border-white/5 group"
              >
                <div className="flex items-center space-x-3">
                  <MapPin className="w-5 h-5" />
                  <div className="flex flex-col items-start leading-none">
                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Delivering to</span>
                    <span className="text-sm font-bold uppercase tracking-wider">{userLocation}</span>
                  </div>
                </div>
                <span className="text-xs font-bold uppercase tracking-widest bg-white/10 px-2 py-1 rounded">Change</span>
              </button>
            </div>
          )}
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
          {user?.role !== 'delivery_boy' && (
            <>
              <Link to="/products" className="block py-2" onClick={() => setIsOpen(false)}>{t('store')}</Link>
              <Link to="/offers" className="block py-2 text-[#D4820A] font-bold" onClick={() => setIsOpen(false)}>🏷️ {t('offers')}</Link>
            </>
          )}
          {isAdmin && (
            <div className="py-2 space-y-2 border-b border-white/5">
              <Link to="/admin" className="block text-[#D4820A] font-bold" onClick={() => setIsOpen(false)}>{t('admin')}</Link>
            </div>
          )}
          {user?.role === 'delivery_boy' && <Link to="/delivery" className="block py-2 text-emerald-400 font-semibold" onClick={() => setIsOpen(false)}>{t('delivery')}</Link>}
          {user?.role !== 'delivery_boy' && (
            <Link to="/cart" className="block py-2" onClick={() => setIsOpen(false)}>{t('cart')} ({itemCount})</Link>
          )}
          {isAuthenticated ? (
            <>
              {user?.role !== 'delivery_boy' && (
                <Link to="/profile" className="block py-2" onClick={() => setIsOpen(false)}>{t('profile')}</Link>
              )}
              <button onClick={handleLogout} className="block w-full text-left py-2">{t('logout')}</button>
            </>
          ) : (
            <Link to="/login" className="block py-2 text-[#D4820A]" onClick={() => setIsOpen(false)}>{t('login')}</Link>
          )}
        </div>
      )}
      {/* iOS Tooltip */}
      {showIosTooltip && (
        <div className="fixed bottom-20 left-4 right-4 z-[100] bg-white text-slate-900 p-4 rounded-2xl shadow-2xl border border-emerald-100 flex items-start space-x-3 animate-in fade-in slide-in-from-bottom-4">
          <div className="bg-emerald-100 p-2 rounded-xl text-emerald-600">
            <Smartphone className="w-6 h-6" />
          </div>
          <div className="flex-grow">
            <h4 className="font-bold text-sm">Install DDFF</h4>
            <p className="text-xs text-slate-600 mt-1">
              Tap <Share className="w-3 h-3 inline mx-1" /> Share then <span className="font-bold">"Add to Home Screen"</span> to install on your iPhone.
            </p>
          </div>
          <button onClick={dismissIosTooltip} className="p-1 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
      )}
    </nav>
  );
}
