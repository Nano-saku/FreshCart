import { StyleSheet, View, ViewProps } from "react-native";
import { colors } from "../constants/colors";

interface ThemeCardProps extends ViewProps {
  padding?: number;
  elevated?: boolean;
  bordered?: boolean;
}

export function ThemeCard({
  children,
  style,
  padding = 16,
  elevated = true,
  bordered = false,
  ...props
}: ThemeCardProps) {
  return (
    <View
      style={[
        styles.card,
        elevated && styles.elevated,
        bordered && styles.bordered,
        style,
      ]}
      {...props}
    >
      <View style={[styles.inner, { padding }]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    backgroundColor: colors.surface,
    overflow: "hidden",
  },
  elevated: {
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  bordered: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  inner: {
    backgroundColor: colors.surface,
  },
});
