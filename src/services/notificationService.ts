import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { logger } from '../lib/logger';

// Configure notification handler
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

export interface NotificationData {
    type?: string; // Changed from union type to string
    orderId?: string;
    status?: string;
    productId?: string;
    stockQty?: number;
    rating?: number;
    [key: string]: any;
}

export const notificationService = {
    // Request permissions
    async requestPermissions(): Promise<boolean> {
        if (!Device.isDevice) {
            logger.warn('Must use physical device for Push Notifications');
            return false;
        }

        try {
            // Use type assertion to work around TypeScript issues
            const { status } = await Notifications.getPermissionsAsync() as { status: string };

            if (status !== 'granted') {
                const { status: newStatus } = await Notifications.requestPermissionsAsync() as { status: string };
                if (newStatus !== 'granted') {
                    logger.warn('Failed to get notification permissions');
                    return false;
                }
            }

            // Set up Android notification channel
            if (Platform.OS === 'android') {
                await Notifications.setNotificationChannelAsync('default', {
                    name: 'default',
                    importance: Notifications.AndroidImportance.MAX,
                    vibrationPattern: [0, 250, 250, 250],
                    lightColor: '#FF231F7C',
                });

                // Create order updates channel
                await Notifications.setNotificationChannelAsync('orders', {
                    name: 'Order Updates',
                    importance: Notifications.AndroidImportance.HIGH,
                    vibrationPattern: [0, 250, 250, 250],
                    lightColor: '#4CAF50',
                });

                // Create promotions channel
                await Notifications.setNotificationChannelAsync('promotions', {
                    name: 'Promotions',
                    importance: Notifications.AndroidImportance.DEFAULT,
                    vibrationPattern: [0, 100, 100, 100],
                    lightColor: '#FF9800',
                });
            }

            return true;
        } catch (error) {
            logger.error('Error requesting notification permissions:', error);
            return false;
        }
    },

    // Send local notification
    async sendLocalNotification(
        title: string,
        body: string,
        data: NotificationData = {},
        channelId: string = 'default'
    ): Promise<string | undefined> {
        const hasPermission = await this.requestPermissions();
        if (!hasPermission) return;

        try {
            const notificationId = await Notifications.scheduleNotificationAsync({
                content: {
                    title,
                    body,
                    data: { ...data, timestamp: new Date().toISOString() },
                    sound: true,
                    badge: 1,
                },
                trigger: null, // null means show immediately
            });

            return notificationId;
        } catch (error) {
            logger.error('Error sending notification:', error);
        }
    },

    // Schedule notification for future
    async scheduleNotification(
        title: string,
        body: string,
        trigger: Notifications.NotificationTriggerInput,
        data: NotificationData = {}
    ): Promise<string | undefined> {
        const hasPermission = await this.requestPermissions();
        if (!hasPermission) return;

        try {
            const notificationId = await Notifications.scheduleNotificationAsync({
                content: {
                    title,
                    body,
                    data,
                    badge: 1,
                },
                trigger,
            });

            return notificationId;
        } catch (error) {
            logger.error('Error scheduling notification:', error);
        }
    },

    // Cancel specific notification
    async cancelNotification(notificationId: string): Promise<void> {
        await Notifications.cancelScheduledNotificationAsync(notificationId);
    },

    // Cancel all notifications
    async cancelAllNotifications(): Promise<void> {
        await Notifications.cancelAllScheduledNotificationsAsync();
    },

    // Set badge count
    async setBadgeCount(count: number): Promise<void> {
        await Notifications.setBadgeCountAsync(count);
    },

    // Get badge count
    async getBadgeCount(): Promise<number> {
        return await Notifications.getBadgeCountAsync();
    },

    // Get all scheduled notifications
    async getScheduledNotifications() {
        return await Notifications.getAllScheduledNotificationsAsync();
    },
};