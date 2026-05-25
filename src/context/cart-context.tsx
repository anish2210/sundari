"use client";

import {
  createContext, useContext, useEffect, useReducer, useCallback, type ReactNode,
} from "react";

export interface CartItem {
  productId: string;
  slug: string;
  name: string;
  image: string;
  material: string;
  price: number;
  qty: number;
  size?: string;
}

interface CartState {
  items: CartItem[];
  open: boolean;
}

type CartAction =
  | { type: "ADD";    payload: CartItem }
  | { type: "REMOVE"; productId: string; size?: string }
  | { type: "UPDATE"; productId: string; size?: string; qty: number }
  | { type: "CLEAR" }
  | { type: "LOAD";   items: CartItem[] }
  | { type: "SET_OPEN"; open: boolean };

function key(productId: string, size?: string) {
  return size ? `${productId}::${size}` : productId;
}

function reducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "LOAD":
      return { ...state, items: action.items };

    case "ADD": {
      const k    = key(action.payload.productId, action.payload.size);
      const idx  = state.items.findIndex(i => key(i.productId, i.size) === k);
      const items = idx >= 0
        ? state.items.map((item, i) => i === idx ? { ...item, qty: item.qty + action.payload.qty } : item)
        : [...state.items, action.payload];
      return { ...state, items, open: true };
    }

    case "REMOVE": {
      const k = key(action.productId, action.size);
      return { ...state, items: state.items.filter(i => key(i.productId, i.size) !== k) };
    }

    case "UPDATE": {
      const k = key(action.productId, action.size);
      if (action.qty <= 0) {
        return { ...state, items: state.items.filter(i => key(i.productId, i.size) !== k) };
      }
      return { ...state, items: state.items.map(i => key(i.productId, i.size) === k ? { ...i, qty: action.qty } : i) };
    }

    case "CLEAR":
      return { ...state, items: [] };

    case "SET_OPEN":
      return { ...state, open: action.open };

    default:
      return state;
  }
}

interface CartContextValue {
  items: CartItem[];
  count: number;
  subtotal: number;
  open: boolean;
  addItem: (item: CartItem) => void;
  removeItem: (productId: string, size?: string) => void;
  updateQty: (productId: string, size?: string, qty?: number) => void;
  clearCart: () => void;
  setOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = "sundari_cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { items: [], open: false });

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) dispatch({ type: "LOAD", items: JSON.parse(raw) as CartItem[] });
    } catch { /* ignore */ }
  }, []);

  // Persist to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
    } catch { /* ignore */ }
  }, [state.items]);

  const addItem    = useCallback((item: CartItem)                          => dispatch({ type: "ADD", payload: item }), []);
  const removeItem = useCallback((productId: string, size?: string)        => dispatch({ type: "REMOVE", productId, size }), []);
  const updateQty  = useCallback((productId: string, size?: string, qty = 1) => dispatch({ type: "UPDATE", productId, size, qty }), []);
  const clearCart  = useCallback(()                                         => dispatch({ type: "CLEAR" }), []);
  const setOpen    = useCallback((open: boolean)                            => dispatch({ type: "SET_OPEN", open }), []);

  const count    = state.items.reduce((s, i) => s + i.qty, 0);
  const subtotal = state.items.reduce((s, i) => s + i.price * i.qty, 0);

  return (
    <CartContext.Provider value={{ items: state.items, count, subtotal, open: state.open, addItem, removeItem, updateQty, clearCart, setOpen }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
