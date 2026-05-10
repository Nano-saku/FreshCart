import { SafeAreaView } from "react-native-safe-area-context";
import { View, StyleSheet, StatusBar } from "react-native";
import { colors } from "../constants/colors";

interface AppScreenProps {
  children: React.ReactNode;
  noPadding?: boolean;
}

export function AppScreen({ children, noPadding = false }: AppScreenProps) {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <SafeAreaView style={[styles.safeArea, noPadding && { padding: 0 }]}>
        {children}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeArea: {
    flex: 1,
    padding: 16,
  },
});
