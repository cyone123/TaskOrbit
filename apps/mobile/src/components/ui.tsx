import Ionicons from "@expo/vector-icons/Ionicons";
import type { PropsWithChildren, ReactElement } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppColors, useAppTheme } from "@/constants/theme";
import { useAppStore } from "@/store/app-store";

export function AppScreen({ title, subtitle, leading, action, children }: PropsWithChildren<{
  title: string;
  subtitle?: string;
  leading?: ReactElement | null;
  action?: ReactElement | null;
}>) {
  const colors = useAppColors();
  const { preference } = useAppTheme();
  const { ready, error, notice, clearNotice, updateTheme } = useAppStore();
  const nextTheme = preference === "system" ? "light" : preference === "light" ? "dark" : "system";
  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <SafeAreaView edges={["top", "left", "right"]} style={styles.safe}>
        <View style={styles.header}>
          {leading}
          <View style={styles.headerCopy}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{title}</Text>
            {subtitle ? <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text> : null}
          </View>
          {action}
          <IconButton
            icon={preference === "dark" ? "moon" : preference === "light" ? "sunny" : "contrast"}
            label={`切换主题，当前：${preference === "system" ? "跟随系统" : preference === "light" ? "浅色" : "深色"}`}
            onPress={() => updateTheme(nextTheme)}
          />
        </View>
        {error ? <Banner text={error} danger /> : null}
        {notice ? <Banner text={notice} onClose={clearNotice} /> : null}
        {!ready ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.primary} />
            <Text style={{ color: colors.textMuted }}>正在读取本地数据…</Text>
          </View>
        ) : (
          <>{children as ReactElement | ReactElement[] | null}</>
        )}
      </SafeAreaView>
    </View>
  );
}

export function PageScroll({ children }: PropsWithChildren) {
  return <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>{children}</ScrollView>;
}

export function Banner({ text, danger, onClose }: { text: string; danger?: boolean; onClose?: () => void }) {
  const colors = useAppColors();
  const tint = danger ? "#B3261E" : colors.primary;
  return (
    <Pressable onPress={onClose} style={[styles.banner, { backgroundColor: `${tint}18` }]}>
      <Ionicons name={danger ? "alert-circle" : "checkmark-circle"} size={18} color={tint} />
      <Text style={[styles.bannerText, { color: colors.text }]}>{text}</Text>
      {onClose ? <Ionicons name="close" size={17} color={colors.textMuted} /> : null}
    </Pressable>
  );
}

export function Card({ children, style }: PropsWithChildren<{ style?: object }>) {
  const colors = useAppColors();
  return <View style={[styles.card, { backgroundColor: colors.surfaceContainer, borderColor: colors.border }, style]}>{children}</View>;
}

export function IconButton({ icon, label, onPress, danger }: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress(): void;
  danger?: boolean;
}) {
  const colors = useAppColors();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={[styles.iconButton, { backgroundColor: colors.surfaceContainerHigh }]}>
      <Ionicons name={icon} size={21} color={danger ? colors.danger : colors.primary} />
    </Pressable>
  );
}

export function PrimaryButton({ label, onPress, icon, secondary, disabled }: {
  label: string;
  onPress(): void;
  icon?: keyof typeof Ionicons.glyphMap;
  secondary?: boolean;
  disabled?: boolean;
}) {
  const colors = useAppColors();
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: secondary ? colors.secondarySoft : colors.primary, opacity: disabled ? 0.45 : pressed ? 0.82 : 1 },
      ]}
    >
      {icon ? <Ionicons name={icon} size={18} color={secondary ? colors.onSecondarySoft : colors.onPrimary} /> : null}
      <Text style={[styles.buttonText, { color: secondary ? colors.onSecondarySoft : colors.onPrimary }]}>{label}</Text>
    </Pressable>
  );
}

export function EmptyState({ icon, title, description }: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
}) {
  const colors = useAppColors();
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.primarySoft }]}><Ionicons name={icon} size={30} color={colors.primary} /></View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.emptyDescription, { color: colors.textMuted }]}>{description}</Text>
    </View>
  );
}

export function FormModal({ visible, title, onClose, onSubmit, submitLabel = "保存", children, canSubmit = true }: PropsWithChildren<{
  visible: boolean;
  title: string;
  onClose(): void;
  onSubmit(): void;
  submitLabel?: string;
  canSubmit?: boolean;
}>) {
  const colors = useAppColors();
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <SafeAreaView edges={["bottom"]} style={[styles.modal, { backgroundColor: colors.surface }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{title}</Text>
            <IconButton icon="close" label="关闭" onPress={onClose} />
          </View>
          <ScrollView style={styles.formScroll} contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">{children}</ScrollView>
          <View style={styles.modalFooter}><PrimaryButton label={submitLabel} onPress={onSubmit} disabled={!canSubmit} /></View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

export function Field({ label, value, onChangeText, placeholder, multiline, keyboardType }: {
  label: string;
  value: string;
  onChangeText(value: string): void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: "default" | "number-pad";
}) {
  const colors = useAppColors();
  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.tabInactive}
        multiline={multiline}
        keyboardType={keyboardType}
        style={[styles.field, multiline && styles.multiline, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
      />
    </View>
  );
}

export function ChoiceRow({ label, options, value, onChange }: {
  label: string;
  options: { value: string; label: string; color?: string }[];
  value: string;
  onChange(value: string): void;
}) {
  const colors = useAppColors();
  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{label}</Text>
      <View style={styles.choiceRow}>{options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable key={option.value} onPress={() => onChange(option.value)} style={[styles.choice, { backgroundColor: active ? colors.primarySoft : colors.background, borderColor: active ? colors.primary : colors.border }]}>
            {option.color ? <View style={[styles.colorDot, { backgroundColor: option.color }]} /> : null}
            <Text style={{ color: active ? colors.onPrimarySoft : colors.textMuted, fontWeight: active ? "700" : "500" }}>{option.label}</Text>
          </Pressable>
        );
      })}</View>
    </View>
  );
}

export function SegmentedControl({ options, value, onChange }: {
  options: { value: string; label: string; icon?: keyof typeof Ionicons.glyphMap }[];
  value: string;
  onChange(value: string): void;
}) {
  const colors = useAppColors();
  return (
    <View style={[styles.segmented, { borderColor: colors.outline }]} accessibilityRole="tablist">
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={[
              styles.segment,
              index > 0 && { borderLeftColor: colors.outline, borderLeftWidth: 1 },
              selected && { backgroundColor: colors.secondarySoft },
            ]}
          >
            {selected ? <Ionicons name="checkmark" size={16} color={colors.onSecondarySoft} /> : option.icon ? <Ionicons name={option.icon} size={16} color={colors.textMuted} /> : null}
            <Text style={{ color: selected ? colors.onSecondarySoft : colors.text, fontWeight: selected ? "700" : "500", fontSize: 12 }}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ProgressBar({ value, color }: { value: number; color?: string }) {
  const colors = useAppColors();
  const normalized = Math.min(100, Math.max(0, value));
  return <View style={[styles.progressTrack, { backgroundColor: colors.surfaceVariant }]}><View style={[styles.progressFill, { width: `${normalized}%`, backgroundColor: color ?? colors.primary }]} /></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, safe: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 13, flexDirection: "row", alignItems: "center", gap: 12 },
  headerCopy: { flex: 1 }, title: { fontSize: 30, lineHeight: 37, fontWeight: "800", letterSpacing: -0.6 },
  subtitle: { fontSize: 13, marginTop: 2 }, scroll: { paddingHorizontal: 16, paddingBottom: 30, gap: 12, width: "100%", maxWidth: 720, alignSelf: "center" },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  banner: { marginHorizontal: 16, marginBottom: 10, borderRadius: 14, padding: 12, flexDirection: "row", alignItems: "center", gap: 9 }, bannerText: { flex: 1, fontSize: 13, lineHeight: 18 },
  card: { borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, padding: 16 },
  iconButton: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  button: { minHeight: 48, borderRadius: 15, paddingHorizontal: 18, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 }, buttonText: { fontSize: 15, fontWeight: "800" },
  empty: { paddingVertical: 60, paddingHorizontal: 30, alignItems: "center" }, emptyIcon: { width: 62, height: 62, borderRadius: 21, alignItems: "center", justifyContent: "center", marginBottom: 16 }, emptyTitle: { fontSize: 18, fontWeight: "800" }, emptyDescription: { fontSize: 14, textAlign: "center", lineHeight: 21, marginTop: 7 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "flex-end" }, modal: { height: "92%", maxHeight: "92%", borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  modalHeader: { padding: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, modalTitle: { fontSize: 22, fontWeight: "800" }, formScroll: { flex: 1 }, form: { paddingHorizontal: 20, paddingBottom: 16, gap: 15 }, modalFooter: { padding: 20, paddingTop: 10 },
  fieldWrap: { gap: 7 }, fieldLabel: { fontSize: 12, fontWeight: "700" }, field: { minHeight: 48, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, fontSize: 15 }, multiline: { height: 88, paddingTop: 12, textAlignVertical: "top" },
  choiceRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, choice: { minHeight: 38, paddingHorizontal: 13, borderRadius: 12, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 7 }, colorDot: { width: 10, height: 10, borderRadius: 5 },
  segmented: { minHeight: 48, borderWidth: 1, borderRadius: 24, overflow: "hidden", flexDirection: "row" }, segment: { flex: 1, minHeight: 46, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6, paddingHorizontal: 8 },
  progressTrack: { height: 8, borderRadius: 4, overflow: "hidden" }, progressFill: { height: 8, borderRadius: 4 },
});
