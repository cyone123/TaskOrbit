import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router";
import { Platform } from "react-native";

import { useAppColors } from "@/constants/theme";

export default function TabsLayout() {
  const colors = useAppColors();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarHideOnKeyboard: true,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
        tabBarStyle: {
          backgroundColor: colors.surfaceContainer,
          borderTopColor: colors.surfaceContainer,
          paddingTop: 5,
          ...Platform.select({
            web: {
              height: 66,
              paddingBottom: 7,
            },
          }),
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "收件箱",
          tabBarAccessibilityLabel: "收件箱",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="file-tray-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="projects"
        options={{
          title: "项目",
          tabBarAccessibilityLabel: "项目",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="folder-open-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: "日历",
          tabBarAccessibilityLabel: "日历",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="pomodoro"
        options={{
          title: "番茄钟",
          tabBarAccessibilityLabel: "番茄钟",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="timer-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: "统计",
          tabBarAccessibilityLabel: "统计",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bar-chart-outline" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
