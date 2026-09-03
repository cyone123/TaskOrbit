import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router";
import { useEffect, useRef } from "react";
import { Animated, Platform, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MD3Duration, MD3Easing, MD3Spring, MD3Typography, useAppColors } from "@/constants/theme";

function NavIcon({
  nameFilled,
  nameOutline,
  focused,
}: {
  nameFilled: keyof typeof Ionicons.glyphMap;
  nameOutline: keyof typeof Ionicons.glyphMap;
  focused: boolean;
}) {
  const colors = useAppColors();
  const scaleAnim = useRef(new Animated.Value(focused ? 1 : 0.6)).current;
  const opacityAnim = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    if (focused) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: MD3Spring.pop.tension,
          friction: MD3Spring.pop.friction,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: MD3Duration.short3,
          easing: MD3Easing.standardDecelerate,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0.6,
          duration: MD3Duration.short2,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: MD3Duration.short2,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [focused]);

  return (
    <View style={styles.iconContainer}>
      <Animated.View
        style={[
          styles.indicator,
          {
            backgroundColor: colors.secondaryContainer,
            opacity: opacityAnim,
            transform: [{ scaleX: scaleAnim }],
          },
        ]}
      />
      <Ionicons
        name={focused ? nameFilled : nameOutline}
        size={22}
        color={focused ? colors.onSecondaryContainer : colors.onSurfaceVariant}
      />
    </View>
  );
}

function NavLabel({ title, focused }: { title: string; focused: boolean }) {
  const colors = useAppColors();
  return (
    <Text
      numberOfLines={1}
      style={[
        styles.label,
        {
          color: focused ? colors.onSurface : colors.onSurfaceVariant,
          fontWeight: focused ? "600" : "500",
        },
      ]}
    >
      {title}
    </Text>
  );
}

export default function TabsLayout() {
  const colors = useAppColors();
  const insets = useSafeAreaInsets();

  const barHeight = Platform.select({
    ios: 74 + insets.bottom,
    android: 80,
    default: 80,
  });

  const paddingBottom = Platform.select({
    ios: Math.max(16, insets.bottom + 6),
    android: 10,
    default: 10,
  });

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: colors.surfaceContainer,
          borderTopWidth: 0,
          borderTopColor: "transparent",
          height: barHeight,
          paddingTop: 8,
          paddingBottom,
          elevation: 0,
          shadowOpacity: 0,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "收件箱",
          tabBarAccessibilityLabel: "收件箱",
          tabBarLabel: ({ focused }) => <NavLabel title="收件箱" focused={focused} />,
          tabBarIcon: ({ focused }) => (
            <NavIcon nameFilled="file-tray" nameOutline="file-tray-outline" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="projects"
        options={{
          title: "项目",
          tabBarAccessibilityLabel: "项目",
          tabBarLabel: ({ focused }) => <NavLabel title="项目" focused={focused} />,
          tabBarIcon: ({ focused }) => (
            <NavIcon nameFilled="folder-open" nameOutline="folder-open-outline" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: "日历",
          tabBarAccessibilityLabel: "日历",
          tabBarLabel: ({ focused }) => <NavLabel title="日历" focused={focused} />,
          tabBarIcon: ({ focused }) => (
            <NavIcon nameFilled="calendar" nameOutline="calendar-outline" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="pomodoro"
        options={{
          title: "番茄钟",
          tabBarAccessibilityLabel: "番茄钟",
          tabBarLabel: ({ focused }) => <NavLabel title="番茄钟" focused={focused} />,
          tabBarIcon: ({ focused }) => (
            <NavIcon nameFilled="timer" nameOutline="timer-outline" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: "统计",
          tabBarAccessibilityLabel: "统计",
          tabBarLabel: ({ focused }) => <NavLabel title="统计" focused={focused} />,
          tabBarIcon: ({ focused }) => (
            <NavIcon nameFilled="bar-chart" nameOutline="bar-chart-outline" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    width: 64,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  indicator: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
  },
  label: {
    ...MD3Typography.labelMedium,
    fontSize: 12,
    marginTop: 3,
  },
});
