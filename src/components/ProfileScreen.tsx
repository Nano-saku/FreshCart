// src/components/ProfileScreen.tsx
// Shared profile screen for all user types (customer, admin, seller)

import { View, Text, ScrollView, TouchableOpacity, Modal, Alert, Switch } from 'react-native';
import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { LinearGradient } from 'expo-linear-gradient';
import { LogOut, User, Shield, ChevronRight, Settings } from 'lucide-react-native';

export default function ProfileScreen() {
  const { 
    user, 
    profile, 
    signOut, 
    softSignOut, 
    biometricEnabled, 
    setBiometricEnabled 
  } = useAuthStore();
  
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [biometricToggle, setBiometricToggle] = useState(biometricEnabled);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    setBiometricToggle(biometricEnabled);
  }, [biometricEnabled]);

  const handleBiometricToggle = async (value: boolean) => {
    try {
      setBiometricToggle(value);
      await setBiometricEnabled(value);
      Alert.alert(
        'Success',
        value 
          ? 'Biometric authentication enabled. You can now use fingerprint to log in.' 
          : 'Biometric authentication disabled.'
      );
    } catch (error) {
      setBiometricToggle(!value);
      Alert.alert('Error', 'Failed to update biometric settings');
    }
  };

  const handleSoftLogout = async () => {
    setShowLogoutModal(false);
    setIsLoggingOut(true);
    
    try {
      await softSignOut();
      // Router will automatically redirect via root layout
    } catch (error) {
      Alert.alert('Error', 'Failed to log out');
      setIsLoggingOut(false);
    }
  };

  const handleFullLogout = async () => {
    setShowLogoutModal(false);
    setIsLoggingOut(true);
    
    try {
      await signOut();
      // Router will automatically redirect via root layout
    } catch (error) {
      Alert.alert('Error', 'Failed to log out');
      setIsLoggingOut(false);
    }
  };

  // Get role-specific badge color
  const getRoleBadgeColor = () => {
    switch (profile?.role) {
      case 'admin':
        return 'bg-purple-500/30 border-purple-500/50';
      case 'seller':
        return 'bg-blue-500/30 border-blue-500/50';
      default:
        return 'bg-green-500/30 border-green-500/50';
    }
  };

  return (
    <LinearGradient
      colors={['#1a4a1a', '#2d7a2d', '#4caf50', '#a8e063']}
      className="flex-1"
    >
      <ScrollView className="flex-1 px-6 pt-16">
        {/* Header */}
        <View className="items-center mb-8">
          <View className="w-24 h-24 rounded-full bg-white/20 items-center justify-center mb-4 border-2 border-white/30">
            <User size={48} color="#fff" />
          </View>
          <Text className="text-2xl font-bold text-white mb-1">
            {profile?.full_name || 'User'}
          </Text>
          <Text className="text-white/70 text-base mb-2">
            {user?.email}
          </Text>
          <View className={`px-4 py-1.5 rounded-full border ${getRoleBadgeColor()}`}>
            <Text className="text-white text-xs font-semibold uppercase tracking-wide">
              {profile?.role || 'Customer'}
            </Text>
          </View>
        </View>

        {/* Security Section */}
        <View className="mb-6">
          <Text className="text-white/60 text-xs font-semibold uppercase mb-3 px-2">
            Security
          </Text>
          
          {/* Biometric Settings */}
          <View className="bg-white/10 rounded-2xl p-4 mb-3 border border-white/20">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3 flex-1">
                <View className="w-10 h-10 rounded-full bg-[#a8e063]/20 items-center justify-center">
                  <Shield size={20} color="#a8e063" />
                </View>
                <View className="flex-1">
                  <Text className="text-white font-semibold text-base">
                    Biometric Login
                  </Text>
                  <Text className="text-white/60 text-sm">
                    Use fingerprint to sign in quickly
                  </Text>
                </View>
              </View>
              <Switch
                value={biometricToggle}
                onValueChange={handleBiometricToggle}
                trackColor={{ false: '#767577', true: '#a8e063' }}
                thumbColor={biometricToggle ? '#2d7a2d' : '#f4f3f4'}
              />
            </View>
          </View>
        </View>

        {/* Account Section */}
        <View className="mb-6">
          <Text className="text-white/60 text-xs font-semibold uppercase mb-3 px-2">
            Account
          </Text>
          
          {/* Logout Button */}
          <TouchableOpacity
            onPress={() => setShowLogoutModal(true)}
            disabled={isLoggingOut}
            className="bg-white/10 rounded-2xl p-4 border border-red-500/30"
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <View className="w-10 h-10 rounded-full bg-red-500/20 items-center justify-center">
                  <LogOut size={20} color="#ef4444" />
                </View>
                <Text className="text-red-400 font-semibold text-base">
                  {isLoggingOut ? 'Logging out...' : 'Log Out'}
                </Text>
              </View>
              {!isLoggingOut && <ChevronRight size={20} color="#ef4444" />}
            </View>
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View className="items-center mt-8 mb-8">
          <Text className="text-white/40 text-xs">
            FreshCart v1.0.0
          </Text>
        </View>
      </ScrollView>

      {/* Logout Modal */}
      <Modal
        visible={showLogoutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View className="flex-1 bg-black/50 items-center justify-center px-6">
          <View className="bg-white rounded-3xl p-6 w-full max-w-sm">
            {/* Modal Header */}
            <View className="items-center mb-4">
              <View className="w-16 h-16 rounded-full bg-orange-100 items-center justify-center mb-3">
                <LogOut size={28} color="#f97316" />
              </View>
              <Text className="text-xl font-bold text-gray-900 mb-2">
                Choose Logout Option
              </Text>
              <Text className="text-gray-600 text-center">
                Would you like to keep biometric access for quick login, or fully log out?
              </Text>
            </View>

            {/* Option 1: Soft Logout (Keep Biometric) - Only show if biometric is enabled */}
            {biometricToggle && (
              <TouchableOpacity
                onPress={handleSoftLogout}
                className="bg-green-500 rounded-xl p-4 mb-3 border-2 border-green-600"
              >
                <View className="flex-row items-center gap-3">
                  <Shield size={22} color="#fff" />
                  <View className="flex-1">
                    <Text className="text-white font-bold text-base">
                      Keep Biometric Access
                    </Text>
                    <Text className="text-white/90 text-sm mt-0.5">
                      Quick login with fingerprint next time
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            )}

            {/* Option 2: Full Logout */}
            <TouchableOpacity
              onPress={handleFullLogout}
              className="bg-red-500 rounded-xl p-4 mb-3 border-2 border-red-600"
            >
              <View className="flex-row items-center gap-3">
                <LogOut size={22} color="#fff" />
                <View className="flex-1">
                  <Text className="text-white font-bold text-base">
                    Full Logout
                  </Text>
                  <Text className="text-white/90 text-sm mt-0.5">
                    Clear all credentials and sessions
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Cancel */}
            <TouchableOpacity
              onPress={() => setShowLogoutModal(false)}
              className="bg-gray-100 rounded-xl p-4"
            >
              <Text className="text-gray-700 font-semibold text-center text-base">
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}