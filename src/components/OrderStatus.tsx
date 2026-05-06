import { View, Text, StyleSheet } from "react-native";
import { CheckCircle2, Circle, Clock, Truck, Package, XCircle } from "lucide-react-native";
import { colors } from "../constants/colors";

export const STEPS = [
  "pending",
  "confirmed",
  "preparing",
  "out_for_delivery",
  "delivered",
] as const;
export type OrderStatus = typeof STEPS[number] | string;

export const STEP_LABELS: Record<string, string> = {
  pending: "Order placed",
  confirmed: "Order confirmed",
  preparing: "Preparing your order",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
};

export const STATUS_COLORS: Record<string, string> = {
  pending: "#ffeb3b",
  confirmed: "#64b5f6",
  preparing: "#ffa726",
  out_for_delivery: "#a8e063",
  delivered: "#4caf50",
  cancelled: "#ef5350",
};

interface OrderStatusProps {
  status: string;
  showSteps?: boolean;
  size?: "sm" | "md" | "lg";
}

export function OrderStatusBadge({ status, size = "md" }: { status: string; size?: "sm" | "md" | "lg" }) {
  const color = STATUS_COLORS[status] || colors.textMuted;

  const sizeStyles = {
    sm: { paddingHorizontal: 8, paddingVertical: 2, fontSize: 10 },
    md: { paddingHorizontal: 12, paddingVertical: 4, fontSize: 11 },
    lg: { paddingHorizontal: 16, paddingVertical: 6, fontSize: 13 },
  };

  const s = sizeStyles[size];

  return (
    <View style={[styles.badge, { backgroundColor: color + "22", borderColor: color + "55" }]}>
      <Text style={[styles.badgeText, { color, fontSize: s.fontSize }]}>
        {status.replace(/_/g, " ")}
      </Text>
    </View>
  );
}

export function OrderStatusSteps({ status }: { status: string }) {
  const currentStep = STEPS.indexOf(status as typeof STEPS[number]);  // cast string to literal for index lookup
  const isCancelled = status === "cancelled";

  if (isCancelled) {
    return (
      <View style={styles.stepsContainer}>
        <View style={styles.cancelledContainer}>
          <XCircle size={24} color="#ef5350" />
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
                  color={colors.accent}
                  fill={colors.primary}
                />
              ) : active ? (
                <View style={styles.activeDot}>
                  <View style={styles.innerDot} />
                </View>
              ) : (
                <Circle size={22} color="rgba(255,255,255,0.25)" />
              )}
              {!isLast && (
                <View
                  style={[
                    styles.line,
                    {
                      backgroundColor: done
                        ? "rgba(168,224,99,0.5)"
                        : "rgba(255,255,255,0.12)",
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
                      ? colors.accent
                      : active
                        ? "#fff"
                        : "rgba(255,255,255,0.35)",
                  },
                ]}
              >
                {STEP_LABELS[step]}
              </Text>
              {active && (
                <Text style={styles.stepTime}>In progress</Text>
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
    backgroundColor: "rgba(255,255,255,0.85)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(168,224,99,0.5)",
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
    color: colors.accent,
    marginTop: 2,
  },
  cancelledContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 16,
    backgroundColor: "rgba(239,83,80,0.1)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(239,83,80,0.3)",
  },
  cancelledText: {
    color: "#ef5350",
    fontSize: 14,
    fontWeight: "600",
  },
});