import { BlurView } from "expo-blur";
import { StyleSheet, View, ViewProps } from "react-native";

export function GlassCard({ children, style, ...props }: ViewProps) {
  return (
    <BlurView
      intensity={40}
      tint="light"
      style={[styles.card, style]}
      {...props}
    >
      <View style={styles.inner}>{children}</View>
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
    padding: 16,
    backgroundColor: "rgba(255,255,255,0.14)",
  },
});
