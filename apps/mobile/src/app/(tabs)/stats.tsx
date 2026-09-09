import Ionicons from "@expo/vector-icons/Ionicons";
import { File, Paths } from "expo-file-system";
import * as DocumentPicker from "expo-document-picker";
import * as Sharing from "expo-sharing";
import { useMemo, useState } from "react";
import { Alert, Platform, Pressable, StyleSheet, Switch, Text, View } from "react-native";

import { AppScreen, Card, ChoiceRow, Field, FilledButton, FormModal, IconButton, PageScroll, TonalButton } from "@/components/ui";
import { MD3Shape, MD3Typography, useAppColors, useAppTheme } from "@/constants/theme";
import { PROJECT_COLOR_HEX, useAppStore } from "@/store/app-store";

export default function StatsScreen() {
  const colors = useAppColors();
  const { preference } = useAppTheme();
  const {
    state,
    exportSnapshot,
    importSnapshot,
    updateTheme,
    syncStatus,
    lastSyncAt,
    syncErrorMessage,
    syncNow,
    testWebDavConnection,
    updateWebDavSettings,
  } = useAppStore();
  const [busy, setBusy] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const webDav = state.webDavSettings;
  const [serverUrl, setServerUrl] = useState(webDav.serverUrl);
  const [username, setUsername] = useState(webDav.username);
  const [password, setPassword] = useState(webDav.password);
  const [remoteDir, setRemoteDir] = useState(webDav.remoteDir);
  const [enabled, setEnabled] = useState(webDav.enabled);
  const [autoSync, setAutoSync] = useState(webDav.autoSync);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const openSettingsModal = () => {
    setServerUrl(webDav.serverUrl);
    setUsername(webDav.username);
    setPassword(webDav.password);
    setRemoteDir(webDav.remoteDir);
    setEnabled(webDav.enabled);
    setAutoSync(webDav.autoSync);
    setModalOpen(true);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      const res = await testWebDavConnection({
        ...webDav,
        serverUrl,
        username,
        password,
        remoteDir,
        enabled,
        autoSync,
      });
      Alert.alert(res.success ? "测试成功" : "测试失败", res.message);
    } catch (e) {
      Alert.alert("测试异常", e instanceof Error ? e.message : String(e));
    } finally {
      setTesting(false);
    }
  };

  const handleSaveSettings = () => {
    updateWebDavSettings({
      serverUrl,
      username,
      password,
      remoteDir,
      enabled,
      autoSync,
    });
    setModalOpen(false);
    Alert.alert("已保存", "WebDAV 配置已更新");
  };

  const handleSyncPress = async () => {
    setSyncing(true);
    try {
      const res = await syncNow();
      if (res.success) {
        Alert.alert("同步完成", res.hasChanges ? "已与云端完成双向合并" : "数据已是最新");
      } else {
        Alert.alert("同步未完成", res.message ?? "未知原因");
      }
    } catch (e) {
      Alert.alert("同步失败", e instanceof Error ? e.message : String(e));
    } finally {
      setSyncing(false);
    }
  };
  const focusSessions = state.pomodoroSessions.filter((session) => session.kind === "focus");
  const totalMinutes = focusSessions.reduce((sum, session) => sum + session.minutes, 0);
  const today = new Date();
  const todayMinutes = focusSessions
    .filter((session) => {
      const date = new Date(session.endedAt);
      return date.toDateString() === today.toDateString();
    })
    .reduce((sum, session) => sum + session.minutes, 0);

  const distribution = useMemo(
    () =>
      state.projects
        .map((project) => ({
          project,
          minutes: focusSessions
            .filter((session) => session.projectId === project.id)
            .reduce((sum, session) => sum + session.minutes, 0),
        }))
        .filter((item) => item.minutes > 0)
        .sort((a, b) => b.minutes - a.minutes),
    [focusSessions, state.projects],
  );
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
        await Sharing.shareAsync(file.uri, {
          mimeType: "application/json",
          dialogTitle: "导出 Task Orbit 数据",
          UTI: "public.json",
        });
      }
    } catch (error) {
      Alert.alert("导出失败", error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  const handleImport = async () => {
    setBusy(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/json",
        copyToCacheDirectory: true,
        base64: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      const raw = asset.file
        ? await asset.file.text()
        : asset.base64
        ? decodeBase64(asset.base64)
        : await new File(asset.uri).text();
      const confirmation = "导入会替换当前数据，现有数据会保留为本地备份。是否继续？";
      if (Platform.OS === "web") {
        if (globalThis.confirm(confirmation)) await importSnapshot(raw);
        return;
      }
      Alert.alert("导入并替换", confirmation, [
        { text: "取消", style: "cancel" },
        {
          text: "继续导入",
          style: "destructive",
          onPress: () =>
            void importSnapshot(raw).catch((error) =>
              Alert.alert("导入失败", error instanceof Error ? error.message : String(error)),
            ),
        },
      ]);
    } catch (error) {
      Alert.alert("导入失败", error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppScreen
      title="统计"
      subtitle="回顾投入，调整节奏"
      action={<IconButton icon="share-outline" label="导出数据" onPress={() => void handleExport()} variant="tonal" />}
    >
      <PageScroll>
        <View style={styles.metrics}>
          <Card variant="elevated" style={styles.metricCard}>
            <View style={[styles.metricIconWrap, { backgroundColor: colors.primaryContainer }]}>
              <Ionicons name="today-outline" size={20} color={colors.onPrimaryContainer} />
            </View>
            <Text style={[styles.metricValue, { color: colors.onSurface }]}>{todayMinutes}</Text>
            <Text style={[styles.metricLabel, { color: colors.onSurfaceVariant }]}>今日分钟</Text>
          </Card>
          <Card variant="elevated" style={styles.metricCard}>
            <View style={[styles.metricIconWrap, { backgroundColor: colors.successContainer }]}>
              <Ionicons name="timer-outline" size={20} color={colors.onSuccessContainer} />
            </View>
            <Text style={[styles.metricValue, { color: colors.onSurface }]}>{focusSessions.length}</Text>
            <Text style={[styles.metricLabel, { color: colors.onSurfaceVariant }]}>累计番茄</Text>
          </Card>
          <Card variant="elevated" style={styles.metricCard}>
            <View style={[styles.metricIconWrap, { backgroundColor: colors.warningContainer }]}>
              <Ionicons name="hourglass-outline" size={20} color={colors.onWarningContainer} />
            </View>
            <Text style={[styles.metricValue, { color: colors.onSurface }]}>{formatHours(totalMinutes)}</Text>
            <Text style={[styles.metricLabel, { color: colors.onSurfaceVariant }]}>专注时长</Text>
          </Card>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>项目投入</Text>
        <Card variant="elevated">
          {distribution.length === 0 ? (
            <View style={styles.noData}>
              <Ionicons name="bar-chart-outline" size={32} color={colors.onSurfaceVariant} />
              <Text style={{ ...MD3Typography.bodyMedium, color: colors.onSurfaceVariant }}>
                完成第一轮专注后，这里会显示投入分布。
              </Text>
            </View>
          ) : (
            distribution.map(({ project, minutes }) => {
              const accent = PROJECT_COLOR_HEX[project.color] ?? colors.primary;
              return (
                <View key={project.id} style={styles.barRow}>
                  <View style={styles.barHeading}>
                    <Text style={[styles.barName, { color: colors.onSurface }]}>{project.name}</Text>
                    <Text style={[styles.barValue, { color: colors.onSurfaceVariant }]}>{minutes} 分钟</Text>
                  </View>
                  <View style={[styles.track, { backgroundColor: colors.surfaceContainerHighest }]}>
                    <View style={[styles.bar, { width: `${(minutes / maxMinutes) * 100}%`, backgroundColor: accent }]} />
                  </View>
                </View>
              );
            })
          )}
        </Card>

        <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>数据管理</Text>
        <Card variant="elevated" style={styles.themeCard}>
          <View style={[styles.dataIcon, { backgroundColor: colors.secondaryContainer }]}>
            <Ionicons name="color-palette-outline" size={24} color={colors.onSecondaryContainer} />
          </View>
          <View style={styles.dataCopy}>
            <Text style={[styles.dataTitle, { color: colors.onSurface }]}>外观</Text>
            <Text style={[styles.dataDescription, { color: colors.onSurfaceVariant }]}>
              主题偏好保存在本地，并应用到全部移动端页面。
            </Text>
          </View>
          <ChoiceRow
            label="颜色主题"
            value={preference}
            onChange={(value) => updateTheme(value as "system" | "light" | "dark")}
            options={[
              { value: "system", label: "跟随系统" },
              { value: "light", label: "浅色" },
              { value: "dark", label: "深色" },
            ]}
          />
        </Card>

        <Card variant="elevated" style={styles.dataCard}>
          <View style={[styles.dataIcon, { backgroundColor: colors.primaryContainer }]}>
            <Ionicons name="shield-checkmark-outline" size={24} color={colors.onPrimaryContainer} />
          </View>
          <View style={styles.dataCopy}>
            <Text style={[styles.dataTitle, { color: colors.onSurface }]}>本地优先</Text>
            <Text style={[styles.dataDescription, { color: colors.onSurfaceVariant }]}>
              数据仅保存在此设备；JSON 快照可与桌面端互相导入。运行中的计时器不会进入导出文件。
            </Text>
          </View>
          <View style={styles.dataActions}>
            <View style={styles.flex}>
              <TonalButton
                label={busy ? "处理中…" : "导出"}
                icon="share-outline"
                onPress={() => void handleExport()}
                disabled={busy}
              />
            </View>
            <View style={styles.flex}>
              <TonalButton
                label="导入"
                icon="download-outline"
                onPress={() => void handleImport()}
                disabled={busy}
              />
            </View>
          </View>
        </Card>

        <Card variant="elevated" style={styles.dataCard}>
          <View style={[styles.dataIcon, { backgroundColor: colors.secondaryContainer }]}>
            <Ionicons name="cloud-done-outline" size={24} color={colors.onSecondaryContainer} />
          </View>
          <View style={styles.dataCopy}>
            <Text style={[styles.dataTitle, { color: colors.onSurface }]}>WebDAV 云同步</Text>
            <Text style={[styles.dataDescription, { color: colors.onSurfaceVariant }]}>
              {webDav.enabled
                ? `状态：${syncStatus === "syncing" ? "正在同步…" : lastSyncAt ? `已同步 (${formatLastSyncTime(lastSyncAt)})` : "等待首次同步"}${syncErrorMessage ? `\n异常：${syncErrorMessage}` : ""}`
                : "未启用。可配置自建或公共 WebDAV 服务器进行跨设备双向同步。"}
            </Text>
          </View>
          <View style={styles.dataActions}>
            <View style={styles.flex}>
              <TonalButton
                label={syncing ? "同步中…" : "立即同步"}
                icon="sync-outline"
                onPress={() => void handleSyncPress()}
                disabled={syncing || !webDav.serverUrl.trim()}
              />
            </View>
            <View style={styles.flex}>
              <TonalButton
                label="设置"
                icon="settings-outline"
                onPress={openSettingsModal}
                disabled={syncing}
              />
            </View>
          </View>
        </Card>

        <Text style={[styles.vaultNote, { color: colors.onSurfaceVariant }]}>
          Obsidian Vault 集成按计划暂缓，移动端不会读取或修改 Vault 路径。
        </Text>
      </PageScroll>

      <FormModal
        visible={modalOpen}
        title="WebDAV 云同步设置"
        onClose={() => setModalOpen(false)}
        onSubmit={handleSaveSettings}
        submitLabel="保存配置"
      >
        <View style={styles.switchRow}>
          <Text style={[styles.switchLabel, { color: colors.onSurface }]}>启用 WebDAV 同步</Text>
          <Switch value={enabled} onValueChange={setEnabled} />
        </View>

        <Field
          label="服务器地址"
          placeholder="https://dav.example.com/webdav/"
          value={serverUrl}
          onChangeText={setServerUrl}
          autoCapitalize="none"
        />

        <Field
          label="用户名"
          placeholder="WebDAV 账户"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />

        <Field
          label="密码 / 应用令牌"
          placeholder="WebDAV 密码"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <Field
          label="远端目录"
          placeholder="/taskorbit"
          value={remoteDir}
          onChangeText={setRemoteDir}
          autoCapitalize="none"
        />

        <View style={styles.switchRow}>
          <Text style={[styles.switchLabel, { color: colors.onSurface }]}>自动静默同步（启动 / 切前台）</Text>
          <Switch value={autoSync} onValueChange={setAutoSync} />
        </View>

        <View style={{ marginTop: 8 }}>
          <TonalButton
            label={testing ? "测试中…" : "测试连接"}
            icon="checkmark-circle-outline"
            onPress={() => void handleTestConnection()}
            disabled={testing || !serverUrl.trim()}
          />
        </View>
      </FormModal>
    </AppScreen>
  );
}

function formatLastSyncTime(timestamp: number | null): string {
  if (!timestamp) return "从未同步";
  const date = new Date(timestamp);
  const now = new Date();
  const diffMin = Math.floor((now.getTime() - date.getTime()) / 60_000);
  if (diffMin < 1) return "刚刚";
  if (diffMin < 60) return `${diffMin}分钟前`;
  return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
}

function formatHours(minutes: number): string {
  return minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h`;
}

function decodeBase64(value: string): string {
  if (typeof atob === "function") {
    return decodeURIComponent(
      Array.from(atob(value), (char) => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`).join(""),
    );
  }
  throw new Error("当前环境无法读取所选文件。");
}

const styles = StyleSheet.create({
  metrics: { flexDirection: "row", gap: 10 },
  metricCard: { flex: 1, minWidth: 0, padding: 14, borderRadius: MD3Shape.medium },
  metricIconWrap: {
    width: 36,
    height: 36,
    borderRadius: MD3Shape.small,
    alignItems: "center",
    justifyContent: "center",
  },
  metricValue: { ...MD3Typography.headlineSmall, fontWeight: "600", marginTop: 10 },
  metricLabel: { ...MD3Typography.labelSmall, marginTop: 2 },
  sectionTitle: { ...MD3Typography.titleMedium, fontWeight: "600", marginTop: 10, marginLeft: 4 },
  noData: { paddingVertical: 28, alignItems: "center", gap: 10 },
  barRow: { marginBottom: 14 },
  barHeading: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  barName: { ...MD3Typography.titleSmall, fontWeight: "600" },
  barValue: { ...MD3Typography.bodySmall },
  track: { height: 6, borderRadius: 3, overflow: "hidden" },
  bar: { height: 6, borderRadius: 3 },
  themeCard: { gap: 12, borderRadius: MD3Shape.large },
  dataCard: { gap: 12, borderRadius: MD3Shape.large },
  dataIcon: {
    width: 44,
    height: 44,
    borderRadius: MD3Shape.medium,
    alignItems: "center",
    justifyContent: "center",
  },
  dataCopy: { gap: 4 },
  dataTitle: { ...MD3Typography.titleMedium, fontWeight: "600" },
  dataDescription: { ...MD3Typography.bodySmall, lineHeight: 18 },
  dataActions: { flexDirection: "row", gap: 10 },
  flex: { flex: 1 },
  vaultNote: { ...MD3Typography.bodySmall, fontSize: 11, lineHeight: 16, textAlign: "center", paddingHorizontal: 16, marginTop: 8 },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  switchLabel: {
    ...MD3Typography.bodyMedium,
    fontWeight: "500",
  },
});
