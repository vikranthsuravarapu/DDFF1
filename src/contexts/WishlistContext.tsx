import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

interface WishlistContextType {
  wishlistItems: any[];
  isInWishlist: (productId: number) => boolean;
  toggleWishlist: (product: any) => Promise<void>;
  loading: boolean;
  refreshWishlist: () => Promise<void>;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export const WishlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [wishlistItems, setWishlistItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { isAuthenticated, apiFetch } = useAuth();

  const refreshWishlist = async () => {
    if (!isAuthenticated) {
      setWishlistItems([]);
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch('/api/wishlist');
      if (res.ok) {
        const data = await res.json();
        setWishlistItems(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching wishlist:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshWishlist();
  }, [isAuthenticated]);

  const isInWishlist = (productId: number) => {
    return wishlistItems.some(item => item.id === productId);
  };

  const toggleWishlist = async (product: any) => {
    if (!isAuthenticated) return;

    const isCurrentlyIn = isInWishlist(product.id);
    const method = isCurrentlyIn ? 'DELETE' : 'POST';

    try {
      const res = await apiFetch(`/api/wishlist/${product.id}`, {
        method
      });

      if (res.ok) {
        if (isCurrentlyIn) {
          setWishlistItems(prev => prev.filter(item => item.id !== product.id));
        } else {
          setWishlistItems(prev => [...prev, product]);
        }
      }
    } catch (error) {
      console.error('Error toggling wishlist:', error);
    }
  };

  return (
    <WishlistContext.Provider value={{ wishlistItems, isInWishlist, toggleWishlist, loading, refreshWishlist }}>
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (context === undefined) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};
