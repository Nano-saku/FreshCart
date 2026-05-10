import { View, Text, StyleSheet } from "react-native";
import {
  CheckCircle2,
  Circle,
  Clock,
  Truck,
  Package,
  XCircle,
} from "lucide-react-native";
import { colors } from "../constants/colors";

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
  const color = STATUS_COLORS[status] || colors.textMuted;

  const sizeStyles = {
    sm: { paddingHorizontal: 8, paddingVertical: 2, fontSize: 10 },
    md: { paddingHorizontal: 12, paddingVertical: 4, fontSize: 11 },
    lg: { paddingHorizontal: 16, paddingVertical: 6, fontSize: 13 },
  };

  const s = sizeStyles[size];

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: color + "15", borderColor: color + "40" },
      ]}
    >
      <Text style={[styles.badgeText, { color, fontSize: s.fontSize }]}>
        {status.replace(/_/g, " ")}
      </Text>
    </View>
  );
}

export function OrderStatusSteps({ status }: { status: string }) {
  const currentStep = STEPS.indexOf(status as (typeof STEPS)[number]);
  const isCancelled = status === "cancelled";

  if (isCancelled) {
    return (
      <View style={styles.stepsContainer}>
        <View style={styles.cancelledContainer}>
          <XCircle size={24} color={colors.error} />
          <Text style={styles.cancelledText}>Order Cancelled</Text>
        </View>
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
                <CheckCircle2
                  size={22}
                  color={colors.primary}
                  fill={colors.primaryLight + "40"}
                />
              ) : active ? (
                <View style={styles.activeDot}>
                  <View style={styles.innerDot} />
                </View>
              ) : (
                <Circle size={22} color={colors.border} />
              )}
              {!isLast && (
                <View
                  style={[
                    styles.line,
                    {
                      backgroundColor: done ? colors.primary : colors.border,
                    },
                  ]}
                />
              )}
            </View>
            <View style={[styles.stepInfo, isLast && { paddingBottom: 0 }]}>
              <Text
                style={[
                  styles.stepLabel,
                  {
                    color: done
                      ? colors.primary
                      : active
                        ? colors.textPrimary
                        : colors.textMuted,
                  },
                ]}
              >
                {STEP_LABELS[step]}
              </Text>
              {active && <Text style={styles.stepTime}>In progress</Text>}
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
    backgroundColor: colors.primaryLight + "30",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.primary,
  },
  innerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
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
    color: colors.primary,
    marginTop: 2,
  },
  cancelledContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 16,
    backgroundColor: colors.error + "10",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.error + "30",
  },
  cancelledText: {
    color: colors.error,
    fontSize: 14,
    fontWeight: "600",
  },
});
