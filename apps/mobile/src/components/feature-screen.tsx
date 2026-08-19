import Ionicons from "@expo/vector-icons/Ionicons";
import { STATE_VERSION } from "@task-orbit/core";
import type { ComponentProps } from "react";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppColors } from "@/constants/theme";

type IoniconName = ComponentProps<typeof Ionicons>["name"];

export interface FeatureItem {
  icon: IoniconName;
  title: string;
  description: string;
}

interface FeatureScreenProps {
  icon: IoniconName;
  eyebrow: string;
  title: string;
  description: string;
  accent: string;
  items: FeatureItem[];
}

export function FeatureScreen({
  icon,
  eyebrow,
  title,
  description,
  accent,
  items,
}: FeatureScreenProps) {
  const colors = useAppColors();

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <SafeAreaView edges={["top", "left", "right"]} style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.brandRow}>
            <View style={[styles.orbitMark, { borderColor: colors.primary }]}>
              <View style={[styles.orbitDot, { backgroundColor: colors.primary }]} />
            </View>
            <Text style={[styles.brand, { color: colors.text }]}>Task Orbit</Text>
            <View style={[styles.coreBadge, { backgroundColor: colors.primarySoft }]}>
              <Text style={[styles.coreBadgeText, { color: colors.onPrimarySoft }]}>
                Core v{STATE_VERSION}
              </Text>
            </View>
          </View>

          <View style={[styles.hero, { backgroundColor: colors.surface }]}>
            <View style={[styles.heroIcon, { backgroundColor: `${accent}1F` }]}>
              <Ionicons name={icon} size={30} color={accent} />
            </View>
            <Text style={[styles.eyebrow, { color: accent }]}>{eyebrow}</Text>
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
            <Text style={[styles.description, { color: colors.textMuted }]}>
              {description}
            </Text>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>移动端规划</Text>
            <Text style={[styles.sectionMeta, { color: colors.textMuted }]}>阶段 2</Text>
          </View>

          <View style={styles.itemList}>
            {items.map((item) => (
              <View
                key={item.title}
                style={[
                  styles.item,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={[styles.itemIcon, { backgroundColor: colors.surfaceVariant }]}>
                  <Ionicons name={item.icon} size={21} color={accent} />
                </View>
                <View style={styles.itemCopy}>
                  <Text style={[styles.itemTitle, { color: colors.text }]}>{item.title}</Text>
                  <Text style={[styles.itemDescription, { color: colors.textMuted }]}>
                    {item.description}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.tabInactive} />
              </View>
            ))}
          </View>

          <View style={[styles.notice, { backgroundColor: colors.primarySoft }]}>
            <Ionicons name="checkmark-circle" size={20} color={colors.onPrimarySoft} />
            <Text style={[styles.noticeText, { color: colors.onPrimarySoft }]}>
              Expo Router 页面与共享核心已连接，业务交互将在后续阶段接入。
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
    gap: 18,
  },
  brandRow: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  orbitMark: {
    width: 27,
    height: 27,
    borderWidth: 2,
    borderRadius: 14,
    alignItems: "flex-end",
    justifyContent: "flex-start",
    transform: [{ rotate: "-18deg" }],
  },
  orbitDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginTop: -3,
    marginRight: 2,
  },
  brand: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  coreBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  coreBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  hero: {
    borderRadius: 28,
    padding: 24,
    alignItems: "flex-start",
    ...Platform.select({
      web: {
        boxShadow: "0 8px 24px rgba(0, 0, 0, 0.06)",
      },
      default: {
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.06,
        shadowRadius: 24,
        elevation: 2,
      },
    }),
  },
  heroIcon: {
    width: 58,
    height: 58,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 22,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginBottom: 7,
  },
  title: {
    fontSize: 32,
    lineHeight: 39,
    fontWeight: "800",
    letterSpacing: -0.7,
  },
  description: {
    marginTop: 12,
    fontSize: 15,
    lineHeight: 23,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  sectionMeta: {
    fontSize: 12,
    fontWeight: "600",
  },
  itemList: {
    gap: 10,
  },
  item: {
    minHeight: 78,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 20,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
  },
  itemIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  itemCopy: {
    flex: 1,
    gap: 3,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  itemDescription: {
    fontSize: 13,
    lineHeight: 19,
  },
  notice: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "600",
  },
});
