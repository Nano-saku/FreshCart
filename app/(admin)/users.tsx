import { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Modal,
  TextInput,
} from "react-native";
import { AppScreen } from "../../src/components/AppScreen";
import { BlurView } from "expo-blur";
import { supabase } from "../../src/lib/supabase";
import { colors } from "../../src/constants/colors";
import { useTheme } from "../../src/contexts/ThemeContext";
import { logger } from "../../src/lib/logger";
import { useMemo } from 'react';
import * as LocalAuthentication from "expo-local-authentication";
import {
  User,
  Shield,
  Phone,
  Ban,
  Trash2,
  Pencil,
  X,
  Check,
  ChevronRight,
} from "lucide-react-native";

interface Profile {
  id: string;
  full_name: string;
  phone: string;
  role: string;
  email?: string;
  email_verified?: boolean;
  created_at?: string;
}

export default function AdminUsersScreen() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editRole, setEditRole] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_all_profiles');

      if (error) {
        logger.error("Error fetching users:", error);
        Alert.alert("Error", "Failed to load users");
      } else {
        setUsers(data ?? []);
      }
    } catch (error) {
      logger.error("Error fetching users:", error);
      Alert.alert("Error", "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openUserActions = (user: Profile) => {
    setSelectedUser(user);
    setEditRole(user.role);
    setModalVisible(true);
  };

  const updateUserRole = async () => {
    if (!selectedUser || !editRole) return;

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ role: editRole })
        .eq("id", selectedUser.id);

      if (error) throw error;

      Alert.alert("Success", `Role updated to ${editRole}`);
      setModalVisible(false);
      fetchUsers();
    } catch (error: any) {
      logger.error("Update role error:", error);
      Alert.alert("Error", error.message || "Failed to update role");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateRoleWithBiometric = async () => {
    if (editRole === selectedUser?.role) return;

    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (hasHardware && isEnrolled) {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: "Verify your identity to change user role",
          fallbackLabel: "Use passcode",
          disableDeviceFallback: false,
        });

        if (!result.success) {
          Alert.alert("Verification Failed", "Could not verify your identity.");
          return;
        }
      }

      updateUserRole();
    } catch (error) {
      logger.error("Biometric error:", error);
      Alert.alert("Error", "Biometric verification failed.");
    }
  };

  const banUser = async () => {
    if (!selectedUser) return;

    setActionLoading(true);
    try {
      const { error: banError } = await supabase
        .from("profiles")
        .update({ role: "banned" })
        .eq("id", selectedUser.id);

      if (banError) throw banError;

      Alert.alert("Success", "User has been banned");
      setModalVisible(false);
      fetchUsers();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to ban user");
    } finally {
      setActionLoading(false);
    }
  };

  const handleBanWithBiometric = async () => {
    if (!selectedUser) return;

    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (hasHardware && isEnrolled) {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: "Verify your identity to ban user",
          fallbackLabel: "Use passcode",
          disableDeviceFallback: false,
        });

        if (!result.success) {
          Alert.alert("Verification Failed", "Could not verify your identity.");
          return;
        }
      }

      banUser();
    } catch (error) {
      logger.error("Biometric error:", error);
      Alert.alert("Error", "Biometric verification failed.");
    }
  };

  const deleteUser = async () => {
    if (!selectedUser) return;

    setActionLoading(true);
    try {
      const { error: banError } = await supabase
        .from("profiles")
        .update({ role: "banned" })
        .eq("id", selectedUser.id);

      if (banError) throw banError;

      await supabase
        .from("cart_items")
        .delete()
        .eq("customer_id", selectedUser.id);
      await supabase
        .from("reviews")
        .delete()
        .eq("customer_id", selectedUser.id);

      const { error: profileError } = await supabase
        .from("profiles")
        .delete()
        .eq("id", selectedUser.id);

      if (profileError) throw profileError;

      Alert.alert(
        "User Removed",
        "Profile deleted and user banned. Their auth account is disabled. To fully purge from Auth, use the Supabase dashboard.",
      );
      setModalVisible(false);
      fetchUsers();
    } catch (error: any) {
      logger.error("Delete user error:", error);
      Alert.alert("Error", error.message || "Failed to delete user");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteWithBiometric = async () => {
    if (!selectedUser) return;

    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (hasHardware && isEnrolled) {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: "Verify your identity to delete user",
          fallbackLabel: "Use passcode",
          disableDeviceFallback: false,
        });

        if (!result.success) {
          Alert.alert("Verification Failed", "Could not verify your identity.");
          return;
        }
      }

      deleteUser();
    } catch (error) {
      logger.error("Biometric error:", error);
      Alert.alert("Error", "Biometric verification failed.");
    }
  };

  const getRoleColor = (role?: string) => {
    switch (role) {
      case "admin":
        return "#EF4444";
      case "seller":
        return "#F59E0B";
      case "banned":
        return "#6B7280";
      default:
        return theme.accent;
    }
  };

  return (
    <AppScreen>
      <View style={styles.header}>
        <Text style={styles.title}>Users</Text>
        <Text style={styles.subtitle}>{users.length} total users</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={theme.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 100 }}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => openUserActions(item)}>
              <View style={styles.card}>
                <View style={styles.cardInner}>
                  <View style={styles.avatarPlaceholder}>
                    <User size={24} color={theme.accent} />
                  </View>

                  <View style={{ flex: 1 }}>
                    <View style={styles.nameRow}>
                      <Text style={styles.userName}>
                        {item.full_name || "Unknown User"}
                      </Text>
                      <View
                        style={[
                          styles.roleBadge,
                          { backgroundColor: getRoleColor(item.role) + "20" },
                        ]}
                      >
                        <Text
                          style={[
                            styles.roleText,
                            { color: getRoleColor(item.role) },
                          ]}
                        >
                          {item.role?.toUpperCase() || "USER"}
                        </Text>
                      </View>
                    </View>

                    {item.email && (
                      <Text style={styles.meta}>{item.email}</Text>
                    )}

                    <View style={styles.infoRow}>
                      <Shield size={14} color={theme.textMuted} />
                      <Text style={styles.infoText}>{item.role}</Text>

                      {item.phone && (
                        <>
                          <Text style={styles.dot}>•</Text>
                          <Phone size={14} color={theme.textMuted} />
                          <Text style={styles.infoText}>{item.phone}</Text>
                        </>
                      )}

                      <Text style={styles.dot}>•</Text>
                      <Text style={styles.infoText}>
                        {item.email_verified ? "✓ Verified" : "○ Unverified"}
                      </Text>
                    </View>

                    {item.created_at && (
                      <Text style={styles.dateText}>
                        Joined {new Date(item.created_at).toLocaleDateString()}
                      </Text>
                    )}
                  </View>

                  <ChevronRight size={20} color={theme.textMuted} />
                </View>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No users found.</Text>
          }
        />
      )}

      {/* User Actions Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalInner}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Manage User</Text>
                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  style={styles.closeBtn}
                >
                  <X size={24} color={theme.textPrimary} />
                </TouchableOpacity>
              </View>

              {selectedUser && (
                <>
                  <View style={styles.userInfo}>
                    <Text style={styles.userNameLarge}>
                      {selectedUser.full_name || "Unknown"}
                    </Text>
                    <Text style={styles.userEmail}>{selectedUser.email}</Text>
                    <Text style={styles.userId}>
                      ID: {selectedUser.id.slice(0, 8)}...
                    </Text>
                  </View>

                  <Text style={styles.label}>Change Role</Text>
                  <View style={styles.roleSelector}>
                    {["customer", "seller", "admin"].map((role) => (
                      <TouchableOpacity
                        key={role}
                        style={[
                          styles.roleChip,
                          editRole === role && styles.roleChipActive,
                        ]}
                        onPress={() => setEditRole(role)}
                      >
                        <Text
                          style={[
                            styles.roleChipText,
                            editRole === role && styles.roleChipTextActive,
                          ]}
                        >
                          {role.toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <TouchableOpacity
                    style={[styles.actionBtn, styles.saveRoleBtn]}
                    onPress={handleUpdateRoleWithBiometric}
                    disabled={actionLoading || editRole === selectedUser.role}
                  >
                    {actionLoading ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <Check size={18} color="#fff" />
                        <Text style={styles.actionBtnText}>Update Role</Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  <View style={styles.divider} />

                  <TouchableOpacity
                    style={[styles.actionBtn, styles.banBtn]}
                    onPress={() => {
                      if (!selectedUser) return;
                      Alert.alert(
                        "Ban User",
                        `Are you sure you want to ban ${selectedUser.full_name || "this user"}?`,
                        [
                          { text: "Cancel", style: "cancel" },
                          { text: "Ban", style: "destructive", onPress: handleBanWithBiometric },
                        ],
                      );
                    }}
                    disabled={actionLoading}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <Ban size={18} color="#fff" />
                      <Text style={styles.actionBtnText}>Ban User</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, styles.deleteBtn]}
                    onPress={() => {
                      if (!selectedUser) return;
                      Alert.alert(
                        "Delete User",
                        `This will ban and remove ${selectedUser.full_name || "this user"}'s profile data. To fully delete their auth account, use the Supabase dashboard.`,
                        [
                          { text: "Cancel", style: "cancel" },
                          { text: "Delete", style: "destructive", onPress: handleDeleteWithBiometric },
                        ],
                      );
                    }}
                    disabled={actionLoading}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <Trash2 size={18} color="#fff" />
                      <Text style={styles.actionBtnText}>Delete User</Text>
                    </View>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </AppScreen>
  );
}

const createStyles = (theme: typeof import("../../src/constants/colors").lightTheme) => StyleSheet.create({
  header: {
    padding: 20,
    paddingBottom: 8,
  },
  title: {
    color: theme.textPrimary,
    fontSize: 24,
    fontWeight: "700",
  },
  subtitle: {
    color: theme.textMuted,
    fontSize: 14,
    marginTop: 4,
  },
  card: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: theme.border,
  },
  cardInner: {
    backgroundColor: theme.surface,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.surfaceVariant,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.border,
  },
  nameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  userName: {
    color: theme.textPrimary,
    fontWeight: "600",
    fontSize: 16,
    flex: 1,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 11,
    fontWeight: "700",
  },
  meta: {
    color: theme.textMuted,
    fontSize: 13,
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  infoText: {
    color: theme.textMuted,
    fontSize: 13,
    textTransform: "capitalize",
  },
  dot: {
    color: theme.textMuted,
    fontSize: 13,
    marginHorizontal: 4,
  },
  dateText: {
    color: theme.textMuted,
    fontSize: 11,
    marginTop: 4,
  },
  emptyText: {
    color: theme.textMuted,
    textAlign: "center",
    marginTop: 40,
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  modalCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
    maxHeight: "85%",
  },
  modalInner: {
    backgroundColor: theme.surface,
    padding: 24,
    gap: 4,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    color: theme.textPrimary,
    fontSize: 20,
    fontWeight: "700",
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.surfaceVariant,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.border,
  },
  userInfo: {
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  userNameLarge: {
    color: theme.textPrimary,
    fontSize: 18,
    fontWeight: "700",
  },
  userEmail: {
    color: theme.textSecondary,
    fontSize: 14,
    marginTop: 4,
  },
  userId: {
    color: theme.textMuted,
    fontSize: 12,
    marginTop: 4,
    opacity: 0.8,
  },
  label: {
    color: theme.textMuted,
    fontSize: 13,
    marginBottom: 10,
    marginTop: 8,
  },
  roleSelector: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  roleChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: theme.surfaceVariant,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: "center",
  },
  roleChipActive: {
    backgroundColor: theme.primary,
    borderColor: theme.accent,
  },
  roleChipText: {
    color: theme.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  roleChipTextActive: {
    color: theme.surface,
    fontWeight: "700",
  },
  actionBtn: {
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 8,
  },
  actionBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  saveRoleBtn: {
    backgroundColor: theme.primary,
  },
  divider: {
    height: 1,
    backgroundColor: theme.border,
    marginVertical: 16,
  },
  banBtn: {
    backgroundColor: "rgba(245,158,11,0.8)",
  },
  deleteBtn: {
    backgroundColor: "#ef5350",
  },
});