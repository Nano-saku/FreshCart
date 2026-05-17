import { StyleSheet, View, ViewProps } from "react-native";
import { useTheme } from "../contexts/ThemeContext";
import { useMemo } from 'react';

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
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

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

const createStyles = (theme: typeof import("../constants/colors").lightTheme) => StyleSheet.create({
  card: {
    borderRadius: 16,
    backgroundColor: theme.surface,
    overflow: "hidden",
  },
  elevated: {
    shadowColor: theme.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  bordered: {
    borderWidth: 1,
    borderColor: theme.border,
  },
  inner: {
    backgroundColor: theme.surface,
  },
});