import React, { createContext, useState, useContext, useEffect, useRef, useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { notificationService, NotificationData } from '../services/notificationService';
import { logger } from '../lib/logger';

export interface Notification {
    type?: string; // Changed from union type to string
    orderId?: string;
    status?: string;
    productId?: string;
    stockQty?: number;
    rating?: number;
    promotionId?: string;
    [key: string]: any;
}

interface NotificationContextType {
    unreadCount: number;
    notifications: Notification[];
    sendOrderNotification: (orderId: string, status: string) => Promise<void>;
    sendPromotionNotification: (title: string, body: string, data?: NotificationData) => Promise<void>;
    sendNewOrderNotification: (orderId: string, customerName: string) => Promise<void>;
    sendLowStockNotification: (productId: string, productName: string, stockQty: number) => Promise<void>;
    sendNewReviewNotification: (productId: string, rating: number) => Promise<void>;
    sendAdminNotification: (type: string, title: string, body: string, data?: NotificationData) => Promise<void>;
    markAsRead: (notificationId: string) => void;
    markAllAsRead: () => void;
    clearAll: () => Promise<void>;
    loadNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const NOTIFICATIONS_STORAGE_KEY = '@freshcart_notifications';

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const [unreadCount, setUnreadCount] = useState(0);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const notificationListener = useRef<Notifications.EventSubscription | null>(null);
    const responseListener = useRef<Notifications.EventSubscription | null>(null);

    // Load saved notifications on mount
    useEffect(() => {
        loadNotifications();
        setupNotificationListeners();
        requestPermissions();

        return () => {
            if (notificationListener.current) {
                notificationListener.current.remove();
            }
            if (responseListener.current) {
                responseListener.current.remove();
            }
        };
    }, []);

    const setupNotificationListeners = () => {
        // Handle incoming notifications while app is foregrounded
        notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
            logger.info('Notification received');

            const newNotification: Notification = {
                id: notification.request.identifier,
                title: notification.request.content.title || '',
                body: notification.request.content.body || '',
                data: notification.request.content.data as NotificationData,
                timestamp: new Date(),
                read: false,
            };

            setNotifications(prev => [newNotification, ...prev]);
            setUnreadCount(prev => prev + 1);
            saveNotifications([newNotification, ...notifications]);
        });

        // Handle notification taps
        responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
            logger.info('Notification tapped');

            // Mark as read
            const notificationId = response.notification.request.identifier;
            markAsRead(notificationId);
        });
    };

    const requestPermissions = async () => {
        const granted = await notificationService.requestPermissions();
        logger.info('Notification permissions granted:', granted);
    };

    const saveNotifications = async (notifs: Notification[]) => {
        try {
            await AsyncStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifs));
        } catch (error) {
            logger.error('Error saving notifications:', error);
        }
    };

    const loadNotifications = useCallback(async () => {
        try {
            const stored = await AsyncStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                // Convert timestamps back to Date objects
                const notificationsWithDates = parsed.map((n: any) => ({
                    ...n,
                    timestamp: new Date(n.timestamp),
                }));
                setNotifications(notificationsWithDates);

                const unread = notificationsWithDates.filter((n: Notification) => !n.read).length;
                setUnreadCount(unread);
            }
        } catch (error) {
            logger.error('Error loading notifications:', error);
        }
    }, []);

    // Customer notification: Order status updates
    const sendOrderNotification = async (orderId: string, status: string) => {
        const statusMessages: Record<string, string> = {
            confirmed: 'Your order has been confirmed',
            preparing: 'We are preparing your order',
            out_for_delivery: 'Your order is out for delivery',
            delivered: 'Your order has been delivered',
            cancelled: 'Your order has been cancelled',
        };

        const message = statusMessages[status] || `Order status updated to ${status}`;

        await notificationService.sendLocalNotification(
            'Order Update',
            message,
            { type: 'order_update', orderId, status },
            'orders'
        );

        // Also add to in-app notifications
        const newNotification: Notification = {
            id: `order_${orderId}_${status}_${Date.now()}`,
            title: 'Order Update',
            body: message,
            data: { type: 'order_update', orderId, status },
            timestamp: new Date(),
            read: false,
        };

        setNotifications(prev => [newNotification, ...prev]);
        setUnreadCount(prev => prev + 1);
        saveNotifications([newNotification, ...notifications]);
    };

    // Customer notification: Promotions
    const sendPromotionNotification = async (title: string, body: string, data: NotificationData = {}) => {
        await notificationService.sendLocalNotification(
            title,
            body,
            { type: 'promotion', ...data },
            'promotions'
        );

        const newNotification: Notification = {
            id: `promo_${Date.now()}`,
            title,
            body,
            data: { type: 'promotion', ...data },
            timestamp: new Date(),
            read: false,
        };

        setNotifications(prev => [newNotification, ...prev]);
        setUnreadCount(prev => prev + 1);
        saveNotifications([newNotification, ...notifications]);
    };

    // Seller notification: New order received
    const sendNewOrderNotification = async (orderId: string, customerName: string) => {
        const newNotification: Notification = {
            id: `new_order_${orderId}_${Date.now()}`,
            title: 'New Order Received! 🎉',
            body: `${customerName} placed a new order`,
            data: { type: 'new_order', orderId },
            timestamp: new Date(),
            read: false,
        };

        setNotifications(prev => [newNotification, ...prev]);
        setUnreadCount(prev => prev + 1);
        saveNotifications([newNotification, ...notifications]);
    };

    // Seller notification: Low stock alert
    const sendLowStockNotification = async (productId: string, productName: string, stockQty: number) => {
        const newNotification: Notification = {
            id: `low_stock_${productId}_${Date.now()}`,
            title: 'Low Stock Alert ⚠️',
            body: `${productName} is running low (${stockQty} left)`,
            data: { type: 'low_stock', productId, stockQty },
            timestamp: new Date(),
            read: false,
        };

        setNotifications(prev => [newNotification, ...prev]);
        setUnreadCount(prev => prev + 1);
        saveNotifications([newNotification, ...notifications]);
    };

    // Seller notification: New review received
    const sendNewReviewNotification = async (productId: string, rating: number) => {
        const newNotification: Notification = {
            id: `review_${productId}_${Date.now()}`,
            title: 'New Review Received ⭐',
            body: `Your product received a ${rating}-star review`,
            data: { type: 'review', productId, rating },
            timestamp: new Date(),
            read: false,
        };

        setNotifications(prev => [newNotification, ...prev]);
        setUnreadCount(prev => prev + 1);
        saveNotifications([newNotification, ...notifications]);
    };

    // Admin notification: System alerts
    const sendAdminNotification = async (type: string, title: string, body: string, data: NotificationData = {}) => {
        const newNotification: Notification = {
            id: `${type}_${Date.now()}`,
            title,
            body,
            data: { type, ...data },
            timestamp: new Date(),
            read: false,
        };

        setNotifications(prev => [newNotification, ...prev]);
        setUnreadCount(prev => prev + 1);
        saveNotifications([newNotification, ...notifications]);
    };

    const markAsRead = (notificationId: string) => {
        setNotifications(prev => {
            const updated = prev.map(notif =>
                notif.id === notificationId ? { ...notif, read: true } : notif
            );
            saveNotifications(updated);
            return updated;
        });
        setUnreadCount(prev => Math.max(0, prev - 1));
    };

    const markAllAsRead = () => {
        setNotifications(prev => {
            const updated = prev.map(notif => ({ ...notif, read: true }));
            saveNotifications(updated);
            return updated;
        });
        setUnreadCount(0);
    };

    const clearAll = async () => {
        await notificationService.cancelAllNotifications();
        await AsyncStorage.removeItem(NOTIFICATIONS_STORAGE_KEY);
        setNotifications([]);
        setUnreadCount(0);
    };

    return (
        <NotificationContext.Provider
            value={{
                unreadCount,
                notifications,
                sendOrderNotification,
                sendPromotionNotification,
                sendNewOrderNotification,
                sendLowStockNotification,
                sendNewReviewNotification,
                sendAdminNotification,
                markAsRead,
                markAllAsRead,
                clearAll,
                loadNotifications,
            }}
        >
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotifications() {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
}