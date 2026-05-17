import { create } from "zustand";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "./authStore";
import { logger } from "../lib/logger";

export interface CartItem {
  id: string;
  store_product_id: string;
  store_id: string;
  quantity: number;
  price: number;
  product: {
    name: string;
    unit: string;
    image_url: string | null;
  };
  store_name: string;
}

interface CartState {
  items: CartItem[];
  loading: boolean;
  fetchCart: () => Promise<void>;
  addItem: (storeProductId: string, quantity?: number) => Promise<void>;
  removeItem: (cartItemId: string) => Promise<void>;
  updateQuantity: (cartItemId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  total: () => number;
  hasMultipleStores: () => boolean;
}
const extractFirst = <T>(data: T | T[] | null | undefined): T | undefined => {
  if (!data) return undefined;
  return Array.isArray(data) ? data[0] : data;
};
// Read from authStore — no network round-trip
const getUser = () => useAuthStore.getState().user;

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  loading: false,

  fetchCart: async () => {
    set({ loading: true });
    const user = getUser();
    if (!user) {
      set({ items: [], loading: false });
      return;
    }

    const { data, error } = await supabase
      .from("cart_items")
      .select(`
        id,
        store_product_id,
        store_id,
        quantity,
        store_product:store_products(
          price,
          store:stores(name),
          product:products(name, unit, image_url)
        )
      `)
      .eq("customer_id", user.id);

    if (error) {
      logger.error("Fetch cart error:", error);
      set({ loading: false });
      return;
    }

   const items: CartItem[] = (data ?? []).map((item: any) => {
  const storeProduct = item.store_product;
  const productObj = extractFirst(storeProduct?.product);
  const storeObj = extractFirst(storeProduct?.store);
  
  return {
    id: item.id,
    store_product_id: item.store_product_id,
    store_id: item.store_id,
    quantity: item.quantity,
    price: storeProduct?.price ?? 0,
    product: {
      name: productObj?.name ?? "Unknown",
      unit: productObj?.unit ?? "piece",
      image_url: productObj?.image_url ?? null,
    },
    store_name: storeObj?.name ?? "Unknown Store",
  };
});
set({ items, loading: false });
  },

  addItem: async (storeProductId: string, quantity = 1) => {
    const user = getUser();
    if (!user) return;

    // Optimistic update - update UI immediately
    const existingItem = get().items.find(i => i.store_product_id === storeProductId);
    
    if (existingItem) {
      // Update existing item quantity optimistically
      set(state => ({
        items: state.items.map(item =>
          item.store_product_id === storeProductId
            ? { ...item, quantity: item.quantity + quantity }
            : item
        )
      }));
    } else {
      // For new items, we need to fetch the product details first
      // This is unavoidable, but we only do it once per new product
      const { data: productData } = await supabase
        .from("store_products")
        .select(`
          id,
          price,
          store_id,
          store:stores(name),
          product:products(name, unit, image_url)
        `)
        .eq("id", storeProductId)
        .maybeSingle();

      if (productData) {
        const productObj = extractFirst(productData.product);
  const storeObj = extractFirst(productData.store);
  
  const newItem: CartItem = {
    id: `temp-${Date.now()}`,
    store_product_id: storeProductId,
    store_id: productData.store_id,
    quantity,
    price: productData.price ?? 0,
    product: {
      name: productObj?.name ?? "Unknown",
      unit: productObj?.unit ?? "piece",
      image_url: productObj?.image_url ?? null,
    },
    store_name: storeObj?.name ?? "Unknown Store",
  };
  
  set(state => ({ items: [...state.items, newItem] }));
}
    }

    // Background DB operation - fire and forget
    // Using upsert pattern to handle both insert and update
    const { data: existing } = await supabase
      .from("cart_items")
      .select("id, quantity")
      .eq("customer_id", user.id)
      .eq("store_product_id", storeProductId)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("cart_items")
        .update({ quantity: existing.quantity + quantity })
        .eq("id", existing.id);
    } else {
      await supabase.from("cart_items").insert({
        customer_id: user.id,
        store_product_id: storeProductId,
        quantity,
      });
    }

    // Only refetch if the operation might have failed
    // This keeps the UI snappy while ensuring consistency
    await get().fetchCart();
  },

  removeItem: async (cartItemId: string) => {
    // Optimistic update - remove from UI immediately
    set(state => ({
      items: state.items.filter(item => item.id !== cartItemId)
    }));

    // Background DB operation
    const { error } = await supabase
      .from("cart_items")
      .delete()
      .eq("id", cartItemId);

    // Only refetch if error occurred (to rollback)
    if (error) {
      logger.error("Remove cart item error:", error);
      await get().fetchCart();
    }
  },

  updateQuantity: async (cartItemId: string, quantity: number) => {
    if (quantity <= 0) {
      await get().removeItem(cartItemId);
      return;
    }

    // Optimistic update - update UI immediately
    set(state => ({
      items: state.items.map(item =>
        item.id === cartItemId
          ? { ...item, quantity }
          : item
      )
    }));

    // Background DB operation
    const { error } = await supabase
      .from("cart_items")
      .update({ quantity })
      .eq("id", cartItemId);

    // Only refetch if error occurred (to rollback)
    if (error) {
      logger.error("Update cart quantity error:", error);
      await get().fetchCart();
    }
  },

  clearCart: async () => {
    const user = getUser();
    if (!user) return;
    await supabase.from("cart_items").delete().eq("customer_id", user.id);
    set({ items: [] });
  },

  total: () =>
    get().items.reduce((sum, item) => sum + item.price * item.quantity, 0),

  // Returns true if cart has items from more than one store
  hasMultipleStores: () => {
    const ids = [...new Set(get().items.map((i) => i.store_id).filter(Boolean))];
    return ids.length > 1;
  },
}));