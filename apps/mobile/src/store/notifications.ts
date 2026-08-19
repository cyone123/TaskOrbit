import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ActiveTimer } from "@task-orbit/core";
import { Platform } from "react-native";

const NOTIFICATION_KEY = "task-orbit.mobile.timer-notification";
const CHANNEL_ID = "pomodoro";

function phaseCompletionCopy(phase: ActiveTimer["phase"]) {
  if (phase === "focus") {
    return { title: "专注完成", body: "做得好，休息一下再继续。" };
  }
  return { title: "休息结束", body: "状态恢复了，开始下一轮专注吧。" };
}

async function notificationsModule() {
  return import("expo-notifications");
}

export async function configureNotifications(): Promise<void> {
  if (Platform.OS === "web") return;
  const Notifications = await notificationsModule();
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: "番茄钟",
      importance: Notifications.AndroidImportance.HIGH,
      sound: "default",
      vibrationPattern: [0, 250, 150, 250],
    });
  }
}

export async function cancelTimerNotification(): Promise<void> {
  if (Platform.OS === "web") return;
  const identifier = await AsyncStorage.getItem(NOTIFICATION_KEY);
  if (!identifier) return;
  const Notifications = await notificationsModule();
  await Notifications.cancelScheduledNotificationAsync(identifier).catch(() => undefined);
  await AsyncStorage.removeItem(NOTIFICATION_KEY);
}

export async function scheduleTimerNotification(timer: ActiveTimer): Promise<boolean> {
  if (Platform.OS === "web" || timer.status !== "running" || timer.endAt === null) return false;
  const Notifications = await notificationsModule();
  const permission = await Notifications.getPermissionsAsync();
  const resolved = permission.granted ? permission : await Notifications.requestPermissionsAsync();
  if (!resolved.granted) return false;

  await cancelTimerNotification();
  const copy = phaseCompletionCopy(timer.phase);
  const identifier = await Notifications.scheduleNotificationAsync({
    content: { ...copy, sound: "default", data: { route: "/pomodoro" } },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: timer.endAt,
      channelId: Platform.OS === "android" ? CHANNEL_ID : undefined,
    },
  });
  await AsyncStorage.setItem(NOTIFICATION_KEY, identifier);
  return true;
}
