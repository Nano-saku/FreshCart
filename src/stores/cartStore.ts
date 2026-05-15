import { create } from "zustand";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "./authStore";

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
      console.error("Fetch cart error:", error);
      set({ loading: false });
      return;
    }

    const items: CartItem[] = (data ?? []).map((item: any) => ({
      id: item.id,
      store_product_id: item.store_product_id,
      store_id: item.store_id,
      quantity: item.quantity,
      price: item.store_product?.price ?? 0,
      product: {
        name: item.store_product?.product?.name ?? "Unknown",
        unit: item.store_product?.product?.unit ?? "piece",
        image_url: item.store_product?.product?.image_url ?? null,
      },
      store_name: item.store_product?.store?.name ?? "Unknown Store",
    }));

    set({ items, loading: false });
  },

  addItem: async (storeProductId: string, quantity = 1) => {
    const user = getUser();
    if (!user) return;

    // Check if already in cart
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
      // store_id is auto-set by DB trigger (trg_set_cart_item_store)
      await supabase.from("cart_items").insert({
        customer_id: user.id,
        store_product_id: storeProductId,
        quantity,
      });
    }

    await get().fetchCart();
  },

  removeItem: async (cartItemId: string) => {
    await supabase.from("cart_items").delete().eq("id", cartItemId);
    await get().fetchCart();
  },

  updateQuantity: async (cartItemId: string, quantity: number) => {
    if (quantity <= 0) {
      await get().removeItem(cartItemId);
      return;
    }
    await supabase.from("cart_items").update({ quantity }).eq("id", cartItemId);
    await get().fetchCart();
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