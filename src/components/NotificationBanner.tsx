import React, { useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Pressable, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNotificationStore } from '../stores/notificationStore';
import { useTheme } from '../contexts/ThemeContext';
import { ShoppingBag, Package, User, Store, Bell, X } from 'lucide-react-native';
import { router } from 'expo-router';

const { width } = Dimensions.get('window');

const TYPE_CONFIG = {
  new_order: { icon: ShoppingBag, color: '#52B788' },
  order_status: { icon: Package, color: '#4361EE' },
  new_customer: { icon: User, color: '#F77F00' },
  new_store: { icon: Store, color: '#7B2D8B' },
  general: { icon: Bell, color: '#52B788' },
};

export function NotificationBanner() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { activeBannerNotification, clearActiveBanner } = useNotificationStore();

  const translateY = useSharedValue(-200);

  useEffect(() => {
    if (activeBannerNotification) {
      // Slide down
      translateY.value = withSpring(insets.top + 10, {
        damping: 15,
        stiffness: 100,
      });

      // Auto-dismiss after 4 seconds
      const timer = setTimeout(() => {
        dismissBanner();
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [activeBannerNotification]);

  const dismissBanner = () => {
    translateY.value = withTiming(-200, { duration: 300 }, (isFinished) => {
      if (isFinished) {
        runOnJS(clearActiveBanner)();
      }
    });
  };

  const handlePress = () => {
    dismissBanner();
    router.push('/profile/notifications');
  };

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  if (!activeBannerNotification) return null;

  const config = TYPE_CONFIG[activeBannerNotification.type] ?? TYPE_CONFIG.general;
  const Icon = config.icon;

  return (
    <Animated.View style={[styles.bannerContainer, animatedStyle]}>
      <Pressable onPress={handlePress} style={[styles.banner, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={[styles.iconBox, { backgroundColor: config.color + '15' }]}>
          <Icon size={22} color={config.color} />
        </View>

        <View style={styles.content}>
          <Text style={[styles.title, { color: theme.textPrimary }]} numberOfLines={1}>
            {activeBannerNotification.title}
          </Text>
          <Text style={[styles.message, { color: theme.textSecondary }]} numberOfLines={2}>
            {activeBannerNotification.message}
          </Text>
        </View>

        <TouchableOpacity onPress={dismissBanner} style={styles.closeBtn}>
          <X size={18} color={theme.textMuted} />
        </TouchableOpacity>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bannerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
    paddingHorizontal: 16,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: 480,
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    shadowColor: 'rgba(0, 0, 0, 0.15)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 8,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
    gap: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
  },
  message: {
    fontSize: 12,
    lineHeight: 16,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
