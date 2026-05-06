import { BlurView } from "expo-blur";
import { StyleSheet, View, ViewProps } from "react-native";

interface GlassCardProps extends ViewProps {
  intensity?: number;
  padding?: number;
}

export function GlassCard({
  children,
  style,
  intensity = 40,
  padding = 16,
  ...props
}: GlassCardProps) {
  return (
    <BlurView
      intensity={intensity}
      tint="light"
      style={[styles.card, style]}
      {...props}
    >
      <View style={[styles.inner, { padding }]}>{children}</View>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
  },
  inner: {
    backgroundColor: "rgba(255,255,255,0.14)",
  },
});
