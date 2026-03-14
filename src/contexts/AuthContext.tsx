import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  phone?: string;
  wallet_balance?: number;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  userLocation: string | null;
  isLocationModalOpen: boolean;
  isDeliveryAvailable: boolean;
  isCheckingDelivery: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  setUserLocation: (location: string) => void;
  setIsLocationModalOpen: (isOpen: boolean) => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [userLocation, setUserLocationState] = useState<string | null>(null);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isDeliveryAvailable, setIsDeliveryAvailable] = useState(true);
  const [isCheckingDelivery, setIsCheckingDelivery] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let isMounted = true;

    const checkDeliveryAvailability = async () => {
      if (!userLocation) {
        setIsDeliveryAvailable(false);
        return;
      }

      setIsCheckingDelivery(true);
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      try {
        const response = await fetch('/api/delivery-zones', { signal: controller.signal });
        
        if (isMounted && response.ok) {
          const zones = await response.json();
          const isAvailable = Array.isArray(zones) && zones.some((zone: any) => 
            zone.name.toLowerCase() === userLocation.toLowerCase() ||
            zone.pincode === userLocation
          );
          setIsDeliveryAvailable(isAvailable);
        }
      } catch (error: any) {
        if (error.name === 'AbortError') return;
        console.error('Error checking delivery availability:', error);
        if (isMounted) setIsDeliveryAvailable(true);
      } finally {
        clearTimeout(timeoutId);
        if (isMounted) setIsCheckingDelivery(false);
      }
    };

    checkDeliveryAvailability();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [userLocation]);

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    const savedLocation = localStorage.getItem('userLocation');
    
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    
    if (savedLocation) {
      setUserLocationState(savedLocation);
    } else {
      // If no location, show modal even for guests
      setIsLocationModalOpen(true);
    }

    // Listen for OAuth success from popup
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        const { token, user } = event.data;
        login(token, user);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    
    // Check if location exists, if not show modal
    const savedLocation = localStorage.getItem('userLocation');
    if (!savedLocation) {
      setIsLocationModalOpen(true);
    }
  };

  const refreshUser = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/user/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const updatedUser = await res.json();
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
    } catch (err) {
      console.error('Failed to refresh user profile:', err);
    }
  };

  const setUserLocation = (location: string) => {
    setUserLocationState(location);
    localStorage.setItem('userLocation', location);
    setIsLocationModalOpen(false);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setUserLocationState(null);
    setIsLocationModalOpen(false);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userLocation');
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      userLocation,
      isLocationModalOpen,
      isDeliveryAvailable,
      isCheckingDelivery,
      login, 
      logout, 
      setUserLocation,
      setIsLocationModalOpen,
      refreshUser,
      isAuthenticated: !!token,
      isAdmin: user?.role === 'admin'
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
