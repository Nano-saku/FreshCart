import { View, Text, StyleSheet } from "react-native";
import {
  CheckCircle2,
  Circle,
  Clock,
  Truck,
  Package,
  XCircle,
} from "lucide-react-native";
import { useTheme } from "../contexts/ThemeContext";

export const STEPS = [
  "pending",
  "confirmed",
  "preparing",
  "out_for_delivery",
  "delivered",
] as const;
export type OrderStatus = (typeof STEPS)[number] | string;

export const STEP_LABELS: Record<string, string> = {
  pending: "Order placed",
  confirmed: "Order confirmed",
  preparing: "Preparing your order",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
};

export const STATUS_COLORS: Record<string, string> = {
  pending: "#FFC107",
  confirmed: "#2196F3",
  preparing: "#FF9800",
  out_for_delivery: "#4CAF50",
  delivered: "#4CAF50",
  cancelled: "#F44336",
};

interface OrderStatusProps {
  status: string;
  showSteps?: boolean;
  size?: "sm" | "md" | "lg";
}

export function OrderStatusBadge({
  status,
  size = "md",
}: {
  status: string;
  size?: "sm" | "md" | "lg";
}) {
  const { theme } = useTheme();
  const color = STATUS_COLORS[status] || theme.textMuted;

  const sizeStyles = {
    sm: { paddingHorizontal: 8, paddingVertical: 2, fontSize: 10 },
    md: { paddingHorizontal: 12, paddingVertical: 4, fontSize: 11 },
    lg: { paddingHorizontal: 16, paddingVertical: 6, fontSize: 13 },
  };

  const s = sizeStyles[size];

  return (
    <View style={[styles.badge, { borderColor: color + "40", backgroundColor: color + "15" }]}>
      <Text style={[styles.badgeText, { color, fontSize: s.fontSize }]}>
        {status.replace(/_/g, " ")}
      </Text>
    </View>
  );
}

export function OrderStatusSteps({ status }: { status: string }) {
  const { theme } = useTheme();
  const currentStep = STEPS.indexOf(status as (typeof STEPS)[number]);
  const isCancelled = status === "cancelled";

  if (isCancelled) {
    return (
      <View style={styles.cancelledContainer}>
        <XCircle size={20} color={theme.error} />
        <Text style={[styles.cancelledText, { color: theme.error }]}>Order Cancelled</Text>
      </View>
    );
  }

  return (
    <View style={styles.stepsContainer}>
      {STEPS.map((step, i) => {
        const done = i < currentStep;
        const active = i === currentStep;
        const isLast = i === STEPS.length - 1;

        return (
          <View key={step} style={styles.stepRow}>
            <View style={styles.stepCol}>
              {done ? (
                <View style={[styles.activeDot, { borderColor: theme.primary, backgroundColor: theme.primary + "30" }]}>
                  <CheckCircle2 size={12} color={theme.primary} />
                </View>
              ) : active ? (
                <View style={[styles.activeDot, { borderColor: theme.primary, backgroundColor: theme.primary + "30" }]}>
                  <View style={[styles.innerDot, { backgroundColor: theme.primary }]} />
                </View>
              ) : (
                <Circle size={22} color={theme.border} />
              )}
              {!isLast && (
                <View style={[styles.line, { backgroundColor: done ? theme.primary : theme.divider }]} />
              )}
            </View>
            <View style={styles.stepInfo}>
              <Text style={[styles.stepLabel, { color: active ? theme.primary : done ? theme.textPrimary : theme.textMuted }]}>
                {STEP_LABELS[step]}
              </Text>
              {active && (
                <Text style={[styles.stepTime, { color: theme.primary }]}>In progress</Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  badgeText: {
    fontWeight: "600",
    textTransform: "capitalize",
  },
  stepsContainer: {
    paddingVertical: 8,
  },
  stepRow: {
    flexDirection: "row",
    gap: 14,
  },
  stepCol: {
    alignItems: "center",
  },
  line: {
    width: 2,
    flex: 1,
    minHeight: 20,
    marginTop: 2,
  },
  activeDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  innerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  stepInfo: {
    paddingBottom: 20,
    flex: 1,
    justifyContent: "center",
  },
  stepLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  stepTime: {
    fontSize: 11,
    marginTop: 2,
  },
  cancelledContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(239,83,80,0.3)",
    backgroundColor: "rgba(239,83,80,0.1)",
  },
  cancelledText: {
    fontSize: 14,
    fontWeight: "600",
  },
});