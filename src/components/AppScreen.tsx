import { SafeAreaView } from "react-native-safe-area-context";
import { View, StyleSheet, StatusBar } from "react-native";
import { useTheme } from "../contexts/ThemeContext";

interface AppScreenProps {
  children: React.ReactNode;
  noPadding?: boolean;
}

export function AppScreen({ children, noPadding = false }: AppScreenProps) {
  const { theme, isDark } = useTheme();
  
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar 
        barStyle={isDark ? "light-content" : "dark-content"} 
        backgroundColor={theme.background} 
      />
      <SafeAreaView style={[styles.safeArea, noPadding && { padding: 0 }]}>
        {children}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    padding: 16,
  },
});
