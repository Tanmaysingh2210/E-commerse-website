import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { cartAPI } from '../api/index';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { user } = useAuth();
  const [cart, setCart]         = useState(null);
  const [cartLoading, setCartLoading] = useState(false);

  // ── Fetch cart when user logs in ──────────────────────────────────────────
  useEffect(() => {
    if (user) fetchCart();
    else setCart(null);
  }, [user]);

  const fetchCart = useCallback(async () => {
    try {
      setCartLoading(true);
      const { data } = await cartAPI.get();
      setCart(data.cart);
    } catch {}
    finally { setCartLoading(false); }
  }, []);

  const addToCart = useCallback(async (productId, quantity = 1, size, color) => {
    try {
      const { data } = await cartAPI.add({ productId, quantity, size, color });
      setCart(data.cart);
      toast.success('Added to cart!');
    } catch (err) {
      throw err;
    }
  }, []);

  const updateItem = useCallback(async (itemId, quantity) => {
    try {
      const { data } = await cartAPI.update(itemId, { quantity });
      setCart(data.cart);
    } catch (err) { throw err; }
  }, []);

  const removeItem = useCallback(async (itemId) => {
    try {
      const { data } = await cartAPI.remove(itemId);
      setCart(data.cart);
      toast.success('Item removed.');
    } catch (err) { throw err; }
  }, []);

  const clearCart = useCallback(async () => {
    try {
      await cartAPI.clear();
      setCart((prev) => ({ ...prev, items: [], appliedCoupon: null }));
    } catch {}
  }, []);

  const applyCoupon = useCallback(async (code) => {
    const { data } = await cartAPI.applyCoupon(code);
    setCart((prev) => ({ ...prev, appliedCoupon: data.coupon }));
    toast.success(data.message);
    return data;
  }, []);

  const removeCoupon = useCallback(async () => {
    await cartAPI.removeCoupon();
    setCart((prev) => ({ ...prev, appliedCoupon: null }));
    toast.success('Coupon removed.');
  }, []);

  const itemCount = cart?.items?.reduce((sum, i) => sum + i.quantity, 0) ?? 0;
  const subtotal  = cart?.items?.reduce((sum, i) => sum + i.price * i.quantity, 0) ?? 0;

  return (
    <CartContext.Provider value={{
      cart, cartLoading, itemCount, subtotal,
      fetchCart, addToCart, updateItem, removeItem, clearCart,
      applyCoupon, removeCoupon,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
};