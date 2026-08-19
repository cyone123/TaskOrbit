import Ionicons from "@expo/vector-icons/Ionicons";
import { File, Paths } from "expo-file-system";
import * as DocumentPicker from "expo-document-picker";
import * as Sharing from "expo-sharing";
import { useMemo, useState } from "react";
import { Alert, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { AppScreen, Card, ChoiceRow, IconButton, PageScroll, PrimaryButton } from "@/components/ui";
import { useAppColors, useAppTheme } from "@/constants/theme";
import { PROJECT_COLOR_HEX, useAppStore } from "@/store/app-store";

export default function StatsScreen() {
  const colors = useAppColors();
  const { preference } = useAppTheme();
  const { state, exportSnapshot, importSnapshot, updateTheme } = useAppStore();
  const [busy, setBusy] = useState(false);
  const focusSessions = state.pomodoroSessions.filter((session) => session.kind === "focus");
  const totalMinutes = focusSessions.reduce((sum, session) => sum + session.minutes, 0);
  const today = new Date();
  const todayMinutes = focusSessions.filter((session) => {
    const date = new Date(session.endedAt);
    return date.toDateString() === today.toDateString();
  }).reduce((sum, session) => sum + session.minutes, 0);
  const distribution = useMemo(() => state.projects.map((project) => ({
    project,
    minutes: focusSessions.filter((session) => session.projectId === project.id).reduce((sum, session) => sum + session.minutes, 0),
  })).filter((item) => item.minutes > 0).sort((a, b) => b.minutes - a.minutes), [focusSessions, state.projects]);
  const maxMinutes = Math.max(1, ...distribution.map((item) => item.minutes));

  const handleExport = async () => {
    setBusy(true);
    try {
      const content = exportSnapshot();
      const filename = `task-orbit-${new Date().toISOString().slice(0, 10)}.json`;
      if (Platform.OS === "web") {
        const url = URL.createObjectURL(new Blob([content], { type: "application/json" }));
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = filename;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1_000);
      } else {
        const file = new File(Paths.cache, filename);
        file.create({ overwrite: true });
        file.write(content);
        await Sharing.shareAsync(file.uri, { mimeType: "application/json", dialogTitle: "导出 Task Orbit 数据", UTI: "public.json" });
      }
    } catch (error) {
      Alert.alert("导出失败", error instanceof Error ? error.message : String(error));
    } finally { setBusy(false); }
  };

  const handleImport = async () => {
    setBusy(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: "application/json", copyToCacheDirectory: true, base64: true });
      if (result.canceled) return;
      const asset = result.assets[0];
      const raw = asset.file ? await asset.file.text() : asset.base64 ? decodeBase64(asset.base64) : await new File(asset.uri).text();
      const confirmation = "导入会替换当前数据，现有数据会保留为本地备份。是否继续？";
      if (Platform.OS === "web") {
        if (globalThis.confirm(confirmation)) await importSnapshot(raw);
        return;
      }
      Alert.alert("导入并替换", confirmation, [
        { text: "取消", style: "cancel" },
        { text: "继续导入", style: "destructive", onPress: () => void importSnapshot(raw).catch((error) => Alert.alert("导入失败", error instanceof Error ? error.message : String(error))) },
      ]);
    } catch (error) {
      Alert.alert("导入失败", error instanceof Error ? error.message : String(error));
    } finally { setBusy(false); }
  };

  return (
    <AppScreen title="统计" subtitle="回顾投入，调整节奏" action={<IconButton icon="share-outline" label="导出数据" onPress={() => void handleExport()} />}>
      <PageScroll>
        <View style={styles.metrics}>
          <Card style={styles.metricCard}><Ionicons name="today-outline" size={22} color={colors.primary} /><Text style={[styles.metricValue, { color: colors.text }]}>{todayMinutes}</Text><Text style={[styles.metricLabel, { color: colors.textMuted }]}>今日分钟</Text></Card>
          <Card style={styles.metricCard}><Ionicons name="timer-outline" size={22} color={colors.success} /><Text style={[styles.metricValue, { color: colors.text }]}>{focusSessions.length}</Text><Text style={[styles.metricLabel, { color: colors.textMuted }]}>累计番茄</Text></Card>
          <Card style={styles.metricCard}><Ionicons name="hourglass-outline" size={22} color={colors.warning} /><Text style={[styles.metricValue, { color: colors.text }]}>{formatHours(totalMinutes)}</Text><Text style={[styles.metricLabel, { color: colors.textMuted }]}>专注时长</Text></Card>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>项目投入</Text>
        <Card>
          {distribution.length === 0 ? <View style={styles.noData}><Ionicons name="bar-chart-outline" size={28} color={colors.tabInactive} /><Text style={{ color: colors.textMuted }}>完成第一轮专注后，这里会显示投入分布。</Text></View> : distribution.map(({ project, minutes }) => {
            const accent = PROJECT_COLOR_HEX[project.color] ?? colors.primary;
            return <View key={project.id} style={styles.barRow}><View style={styles.barHeading}><Text style={[styles.barName, { color: colors.text }]}>{project.name}</Text><Text style={[styles.barValue, { color: colors.textMuted }]}>{minutes} 分钟</Text></View><View style={[styles.track, { backgroundColor: colors.surfaceVariant }]}><View style={[styles.bar, { width: `${(minutes / maxMinutes) * 100}%`, backgroundColor: accent }]} /></View></View>;
          })}
        </Card>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>数据管理</Text>
        <Card style={styles.themeCard}>
          <View style={[styles.dataIcon, { backgroundColor: colors.secondarySoft }]}><Ionicons name="color-palette-outline" size={24} color={colors.onSecondarySoft} /></View>
          <View style={styles.dataCopy}><Text style={[styles.dataTitle, { color: colors.text }]}>外观</Text><Text style={[styles.dataDescription, { color: colors.textMuted }]}>主题偏好保存在本地，并应用到全部移动端页面。</Text></View>
          <ChoiceRow label="颜色主题" value={preference} onChange={(value) => updateTheme(value as "system" | "light" | "dark")} options={[{ value: "system", label: "跟随系统" }, { value: "light", label: "浅色" }, { value: "dark", label: "深色" }]} />
        </Card>
        <Card style={styles.dataCard}>
          <View style={[styles.dataIcon, { backgroundColor: colors.primarySoft }]}><Ionicons name="shield-checkmark-outline" size={24} color={colors.primary} /></View>
          <View style={styles.dataCopy}><Text style={[styles.dataTitle, { color: colors.text }]}>本地优先</Text><Text style={[styles.dataDescription, { color: colors.textMuted }]}>数据仅保存在此设备；JSON 快照可与桌面端互相导入。运行中的计时器不会进入导出文件。</Text></View>
          <View style={styles.dataActions}><View style={styles.flex}><PrimaryButton label={busy ? "处理中…" : "导出"} icon="share-outline" onPress={() => void handleExport()} disabled={busy} secondary /></View><View style={styles.flex}><PrimaryButton label="导入" icon="download-outline" onPress={() => void handleImport()} disabled={busy} secondary /></View></View>
        </Card>
        <Text style={[styles.vaultNote, { color: colors.textMuted }]}>Obsidian Vault 集成按计划暂缓，移动端不会读取或修改 Vault 路径。</Text>
      </PageScroll>
    </AppScreen>
  );
}

function formatHours(minutes: number): string { return minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h`; }
function decodeBase64(value: string): string {
  if (typeof atob === "function") return decodeURIComponent(Array.from(atob(value), (char) => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`).join(""));
  throw new Error("当前环境无法读取所选文件。");
}

const styles = StyleSheet.create({
  metrics: { flexDirection: "row", gap: 9 }, metricCard: { flex: 1, minWidth: 0, padding: 13 }, metricValue: { fontSize: 25, fontWeight: "800", marginTop: 12 }, metricLabel: { fontSize: 10, marginTop: 2 }, sectionTitle: { fontSize: 17, fontWeight: "800", marginTop: 6, marginLeft: 4 },
  noData: { paddingVertical: 28, alignItems: "center", gap: 10 }, barRow: { marginBottom: 17 }, barHeading: { flexDirection: "row", justifyContent: "space-between", marginBottom: 7 }, barName: { fontSize: 13, fontWeight: "700" }, barValue: { fontSize: 11 }, track: { height: 8, borderRadius: 4, overflow: "hidden" }, bar: { height: 8, borderRadius: 4 },
  themeCard: { gap: 13 }, dataCard: { gap: 13 }, dataIcon: { width: 48, height: 48, borderRadius: 15, alignItems: "center", justifyContent: "center" }, dataCopy: { gap: 4 }, dataTitle: { fontSize: 16, fontWeight: "800" }, dataDescription: { fontSize: 12, lineHeight: 18 }, dataActions: { flexDirection: "row", gap: 10 }, flex: { flex: 1 }, vaultNote: { fontSize: 11, lineHeight: 17, textAlign: "center", paddingHorizontal: 16 },
});
