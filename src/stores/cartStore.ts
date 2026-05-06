import { create } from "zustand";
import { supabase } from "../lib/supabase";

interface CartItem {
  id: string;
  store_product_id: string;
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
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  loading: false,

  fetchCart: async () => {
    set({ loading: true });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      set({ items: [], loading: false });
      return;
    }

    const { data, error } = await supabase
        .from("cart_items")
      .select(`id, store_product_id, quantity, store_product:store_products(price, store:stores(name), product:products(name, unit, image_url))`)
      .eq("customer_id", user.id);

    if (error) {
      console.error("Fetch cart error:", error);
      set({ loading: false });
      return;
    }

    const items = (data || []).map((item: any) => ({
      id: item.id,
      store_product_id: item.store_product_id,
      quantity: item.quantity,
      price: item.store_product?.price || 0,
      product: {
        name: item.store_product?.product?.name || "Unknown",
        unit: item.store_product?.product?.unit || "piece",
        image_url: item.store_product?.product?.image_url,
      },
      store_name: item.store_product?.store?.name || "Unknown Store",
    }));

    set({ items, loading: false });
  },

  addItem: async (storeProductId: string, quantity = 1) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Check if item already in cart
    const { data: existing } = await supabase
      .from("cart_items")
      .select("id, quantity")
      .eq("customer_id", user.id)
      .eq("store_product_id", storeProductId)
      .single();

    if (existing) {
      const { error } = await supabase
        .from("cart_items")
        .update({ quantity: existing.quantity + quantity })
        .eq("id", existing.id);
      if (error) console.error("Update cart error:", error);
    } else {
      const { error } = await supabase
        .from("cart_items")
        .insert({
          customer_id: user.id,
          store_product_id: storeProductId,
          quantity,
        });
      if (error) console.error("Insert cart error:", error);
    }

    await get().fetchCart();
  },

  removeItem: async (cartItemId: string) => {
    const { error } = await supabase
      .from("cart_items")
      .delete()
      .eq("id", cartItemId);
    if (error) console.error("Remove cart error:", error);
    await get().fetchCart();
  },

  updateQuantity: async (cartItemId: string, quantity: number) => {
    if (quantity <= 0) {
      await get().removeItem(cartItemId);
      return;
    }
    const { error } = await supabase
      .from("cart_items")
      .update({ quantity })
      .eq("id", cartItemId);
    if (error) console.error("Update quantity error:", error);
    await get().fetchCart();
  },

  clearCart: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from("cart_items")
      .delete()
      .eq("customer_id", user.id);
    if (error) console.error("Clear cart error:", error);
    set({ items: [] });
  },

  total: () => {
    return get().items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  },
}));