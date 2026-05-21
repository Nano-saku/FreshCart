import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNotifications } from '../contexts/NotificationContext';

export function useOrderNotifications(storeId?: string) {
    const { sendOrderNotification, sendNewOrderNotification } = useNotifications();

    useEffect(() => {
        if (!storeId) return;

        // Subscribe to new orders for seller
        const orderSubscription = supabase
            .channel(`orders-${storeId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'orders',
                    filter: `store_id=eq.${storeId}`,
                },
                async (payload) => {
                    const newOrder = payload.new;

                    // Get customer name
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('full_name')
                        .eq('id', newOrder.customer_id)
                        .single();

                    const customerName = profile?.full_name || 'A customer';

                    // Send notification
                    await sendNewOrderNotification(newOrder.id, customerName);
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'orders',
                    filter: `store_id=eq.${storeId}`,
                },
                async (payload) => {
                    const updatedOrder = payload.new;
                    const oldOrder = payload.old;

                    // Only notify if status changed
                    if (updatedOrder.status !== oldOrder.status) {
                        await sendOrderNotification(updatedOrder.id, updatedOrder.status);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(orderSubscription);
        };
    }, [storeId]);
}