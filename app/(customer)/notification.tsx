import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, SafeAreaView } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useNotifications, Notification } from '../../src/contexts/NotificationContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { lightTheme, darkTheme } from '../../src/constants/colors';

export default function NotificationsScreen() {
    const { notifications, markAsRead, markAllAsRead, clearAll } = useNotifications();
    const { theme, isDark } = useTheme();
    const router = useRouter();

    const formatTime = (timestamp: Date) => {
        const now = new Date();
        const diff = now.getTime() - timestamp.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return timestamp.toLocaleDateString();
    };

    const getNotificationIcon = (type?: string) => {
        switch (type) {
            case 'order_update':
                return 'cube-outline';
            case 'promotion':
                return 'pricetag-outline';
            case 'chat':
                return 'chatbubble-outline';
            default:
                return 'notifications-outline';
        }
    };

    const getNotificationColor = (type?: string) => {
        switch (type) {
            case 'order_update':
                return theme.primary;
            case 'promotion':
                return '#FF9800';
            case 'chat':
                return '#4CAF50';
            default:
                return '#666';
        }
    };

    const handleNotificationPress = (notification: Notification) => {
        markAsRead(notification.id);

        // Navigate based on notification type
        if (notification.data?.type === 'order_update' && notification.data?.orderId) {
            router.push(`/customer/order/${notification.data.orderId}`);
        }
        // Add other navigation logic for promotions, chat, etc. later
    };

    const renderNotification = ({ item }: { item: Notification }) => (
        <TouchableOpacity
            style={[
                styles.notificationItem,
                { backgroundColor: theme.card, borderBottomColor: theme.border },
                !item.read && { backgroundColor: isDark ? '#1a1a2e' : '#f0f4ff' }
            ]}
            onPress={() => handleNotificationPress(item)}
            activeOpacity={0.7}
        >
            <View style={[styles.iconContainer, { backgroundColor: getNotificationColor(item.data?.type) + '20' }]}>
                <Ionicons
                    name={getNotificationIcon(item.data?.type)}
                    size={24}
                    color={getNotificationColor(item.data?.type)}
                />
            </View>
            <View style={styles.contentContainer}>
                <Text style={[styles.title, { color: theme.textPrimary }, !item.read && styles.unreadText]}>
                    {item.title}
                </Text>
                <Text style={[styles.body, { color: theme.textSecondary }]}>{item.body}</Text>
                <Text style={[styles.time, { color: theme.textMuted }]}>{formatTime(item.timestamp)}</Text>
            </View>
            {!item.read && <View style={styles.unreadDot} />}
        </TouchableOpacity>
    );

    const renderEmptyState = () => (
        <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={64} color={theme.textMuted} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                No notifications yet
            </Text>
            <Text style={[styles.emptySubtext, { color: theme.textMuted }]}>
                We'll notify you about your orders and promotions
            </Text>
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <Stack.Screen
                options={{
                    title: 'Notifications',
                    headerStyle: { backgroundColor: theme.card },
                    headerTintColor: theme.textPrimary,
                    headerRight: () => (
                        <View style={styles.headerActions}>
                            {notifications.length > 0 && (
                                <>
                                    <TouchableOpacity onPress={markAllAsRead} style={styles.headerButton}>
                                        <Text style={[styles.headerButtonText, { color: theme.primary }]}>
                                            Read all
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={clearAll} style={styles.headerButton}>
                                        <Text style={[styles.headerButtonText, { color: '#FF3B30' }]}>
                                            Clear
                                        </Text>
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>
                    ),
                }}
            />

            <FlatList
                data={notifications}
                renderItem={renderNotification}
                keyExtractor={(item) => item.id}
                ListEmptyComponent={renderEmptyState}
                contentContainerStyle={notifications.length === 0 ? styles.emptyList : undefined}
                refreshControl={
                    <RefreshControl refreshing={false} onRefresh={() => { }} />
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    headerButton: {
        paddingHorizontal: 4,
    },
    headerButtonText: {
        fontSize: 14,
        fontWeight: '500',
    },
    notificationItem: {
        flexDirection: 'row',
        padding: 16,
        borderBottomWidth: 1,
        alignItems: 'center',
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    contentContainer: {
        flex: 1,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    unreadText: {
        fontWeight: '700',
    },
    body: {
        fontSize: 14,
        marginBottom: 4,
        lineHeight: 20,
    },
    time: {
        fontSize: 12,
    },
    unreadDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#007AFF',
        marginLeft: 8,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    emptyList: {
        flex: 1,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        marginTop: 16,
    },
    emptySubtext: {
        fontSize: 14,
        textAlign: 'center',
        marginTop: 8,
        lineHeight: 20,
    },
});