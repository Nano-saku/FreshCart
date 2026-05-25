import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'new_order' | 'order_status' | 'new_customer' | 'new_store' | 'general';
  read: boolean;
  created_at: string;
}

interface NotificationState {
  notifications: Notification[];
  loading: boolean;
  unreadCount: number;
  activeBannerNotification: Notification | null;
  subscriptionChannel: any | null;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  subscribeToNotifications: (userId: string) => void;
  unsubscribe: () => void;
  clearActiveBanner: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  loading: false,
  unreadCount: 0,
  activeBannerNotification: null,
  subscriptionChannel: null,

  fetchNotifications: async () => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const unread = (data ?? []).filter((n) => !n.read).length;
      set({
        notifications: data ?? [],
        unreadCount: unread,
        loading: false,
      });
    } catch (error) {
      logger.error('Error fetching notifications:', error);
      set({ loading: false });
    }
  },

  markAsRead: async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id);

      if (error) throw error;

      set((state) => {
        const updated = state.notifications.map((n) =>
          n.id === id ? { ...n, read: true } : n
        );
        const unread = updated.filter((n) => !n.read).length;
        return {
          notifications: updated,
          unreadCount: unread,
        };
      });
    } catch (error) {
      logger.error('Error marking notification as read:', error);
    }
  },

  markAllAsRead: async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('read', false);

      if (error) throw error;

      set((state) => {
        const updated = state.notifications.map((n) => ({ ...n, read: true }));
        return {
          notifications: updated,
          unreadCount: 0,
        };
      });
    } catch (error) {
      logger.error('Error marking all notifications as read:', error);
    }
  },

  deleteNotification: async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);

      if (error) throw error;

      set((state) => {
        const updated = state.notifications.filter((n) => n.id !== id);
        const unread = updated.filter((n) => !n.read).length;
        return {
          notifications: updated,
          unreadCount: unread,
        };
      });
    } catch (error) {
      logger.error('Error deleting notification:', error);
    }
  },

  subscribeToNotifications: (userId: string) => {
    // Unsubscribe from any active subscription first
    get().unsubscribe();

    if (!userId) return;

    logger.log('[NotificationStore] Subscribing to notifications for user:', userId);

    const channel = supabase
      .channel(`notifications-user-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          logger.log('[NotificationStore] Received new notification:', payload.new);
          const newNotif = payload.new as Notification;

          set((state) => {
            const updated = [newNotif, ...state.notifications];
            const unread = updated.filter((n) => !n.read).length;
            return {
              notifications: updated,
              unreadCount: unread,
              activeBannerNotification: newNotif, // Trigger in-app banner animation
            };
          });
        }
      )
      .subscribe((status) => {
        logger.log(`[NotificationStore] Realtime channel status: ${status}`);
      });

    set({ subscriptionChannel: channel });
  },

  unsubscribe: () => {
    const channel = get().subscriptionChannel;
    if (channel) {
      logger.log('[NotificationStore] Unsubscribing from realtime channel');
      supabase.removeChannel(channel);
      set({ subscriptionChannel: null });
    }
  },

  clearActiveBanner: () => {
    set({ activeBannerNotification: null });
  },
}));
