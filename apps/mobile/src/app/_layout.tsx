import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { useAppTheme } from "@/constants/theme";
import { AppStoreProvider } from "@/store/app-store";

function RootNavigator() {
  const { colors, isDark } = useAppTheme();
  const navigationTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      primary: colors.primary,
      background: colors.background,
      card: colors.surfaceContainer,
      text: colors.text,
      border: colors.border,
      notification: colors.danger,
    },
  };

  return (
    <ThemeProvider value={navigationTheme}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="project/[id]" options={{ animation: "slide_from_right" }} />
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return <AppStoreProvider><RootNavigator /></AppStoreProvider>;
}
