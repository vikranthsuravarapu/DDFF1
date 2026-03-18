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
  refreshToken: string | null;
  userLocation: string | null;
  isLocationModalOpen: boolean;
  isDeliveryAvailable: boolean;
  isCheckingDelivery: boolean;
  login: (token: string, refreshToken: string, user: User) => void;
  logout: () => void;
  setUserLocation: (location: string) => void;
  setIsLocationModalOpen: (isOpen: boolean) => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
  refreshUser: () => Promise<void>;
  apiFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
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
    const savedRefreshToken = localStorage.getItem('refreshToken');
    const savedUser = localStorage.getItem('user');
    const savedLocation = localStorage.getItem('userLocation');
    
    if (savedToken && savedUser) {
      setToken(savedToken);
      setRefreshToken(savedRefreshToken);
      setUser(JSON.parse(savedUser));

      // Check if token is expired or near expiration
      try {
        const payload = JSON.parse(atob(savedToken.split('.')[1]));
        const exp = payload.exp * 1000;
        if (Date.now() >= exp - 60000) { // Expired or expires in < 1 minute
          // Trigger a refresh call immediately
          apiFetch('/api/user/profile'); 
        }
      } catch (e) {
        console.error('Failed to parse token:', e);
      }
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
        const { token, refreshToken, user } = event.data;
        login(token, refreshToken, user);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Proactive token refresh
  useEffect(() => {
    if (!token || !refreshToken) return;

    const interval = setInterval(() => {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const exp = payload.exp * 1000;
        // If token expires in less than 5 minutes, refresh it
        if (Date.now() >= exp - 300000) {
          apiFetch('/api/user/profile');
        }
      } catch (e) {
        console.error('Proactive refresh check failed:', e);
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [token, refreshToken]);

  const login = (newToken: string, newRefreshToken: string, newUser: User) => {
    setToken(newToken);
    setRefreshToken(newRefreshToken);
    setUser(newUser);
    localStorage.setItem('token', newToken);
    localStorage.setItem('refreshToken', newRefreshToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    
    // Check if location exists, if not show modal
    const savedLocation = localStorage.getItem('userLocation');
    if (!savedLocation) {
      setIsLocationModalOpen(true);
    }
  };

  const refreshPromise = React.useRef<Promise<string | null> | null>(null);

  const apiFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
    const getHeaders = (t: string | null) => ({
      ...(options.headers || {}),
      ...(t ? { 'Authorization': `Bearer ${t}` } : {})
    });

    let response = await fetch(url, { ...options, headers: getHeaders(token) });

    if (response.status === 401 && refreshToken) {
      try {
        // If there's already a refresh in progress, wait for it
        if (!refreshPromise.current) {
          refreshPromise.current = (async () => {
            try {
              const refreshRes = await fetch('/api/auth/refresh', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken })
              });

              if (refreshRes.ok) {
                const { token: newToken } = await refreshRes.json();
                setToken(newToken);
                localStorage.setItem('token', newToken);
                return newToken;
              } else {
                logout();
                window.location.href = '/login';
                return null;
              }
            } catch (err) {
              console.error('Token refresh failed:', err);
              logout();
              window.location.href = '/login';
              return null;
            } finally {
              refreshPromise.current = null;
            }
          })();
        }

        const newToken = await refreshPromise.current;
        if (newToken) {
          // Retry original request with the new token
          response = await fetch(url, { ...options, headers: getHeaders(newToken) });
        }
      } catch (err) {
        console.error('Error during token refresh/retry:', err);
      }
    }

    return response;
  };

  const refreshUser = async () => {
    if (!token) return;
    try {
      const res = await apiFetch('/api/user/profile');
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

  const logout = async () => {
    if (token && refreshToken) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ refreshToken })
        });
      } catch (err) {
        console.error('Logout API call failed:', err);
      }
    }
    setToken(null);
    setRefreshToken(null);
    setUser(null);
    setUserLocationState(null);
    setIsLocationModalOpen(false);
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('userLocation');
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      refreshToken,
      userLocation,
      isLocationModalOpen,
      isDeliveryAvailable,
      isCheckingDelivery,
      login, 
      logout, 
      setUserLocation,
      setIsLocationModalOpen,
      refreshUser,
      apiFetch,
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
