import Ionicons from "@expo/vector-icons/Ionicons";
import { addDays, relativeRangeLabel, toISODate, todayISO } from "@task-orbit/core";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { AppScreen, Card, ChoiceRow, EmptyState, Field, FormModal, IconButton, PageScroll, ProgressBar } from "@/components/ui";
import { useAppColors } from "@/constants/theme";
import { PROJECT_COLORS, PROJECT_COLOR_HEX, useAppStore } from "@/store/app-store";

export default function ProjectsScreen() {
  const colors = useAppColors();
  const router = useRouter();
  const { state, addProject, restoreProject, removeProject } = useAppStore();
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState(todayISO());
  const [endDate, setEndDate] = useState(toISODate(addDays(new Date(), 30)));
  const [color, setColor] = useState<string>(PROJECT_COLORS[0]);

  const activeProjects = useMemo(() => state.projects.filter((project) => !project.archived && project.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())), [query, state.projects]);
  const archivedProjects = state.projects.filter((project) => project.archived);

  const reset = () => {
    setFormOpen(false); setName(""); setDescription(""); setStartDate(todayISO()); setEndDate(toISODate(addDays(new Date(), 30))); setColor(PROJECT_COLORS[0]);
  };
  const openCreate = () => { reset(); setFormOpen(true); };
  const submit = () => {
    if (!name.trim()) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate) || endDate < startDate) {
      Alert.alert("日期无效", "请使用 YYYY-MM-DD，且结束日期不能早于开始日期。"); return;
    }
    const input = { name: name.trim(), description: description.trim(), color, startDate, endDate };
    addProject(input);
    reset();
  };

  return (
    <AppScreen title="项目" subtitle={`${activeProjects.length} 个进行中`} action={<IconButton icon="add" label="新建项目" onPress={openCreate} />}>
      <View style={[styles.search, { backgroundColor: colors.surfaceContainerHigh }]}>
        <Ionicons name="search" size={20} color={colors.textMuted} />
        <TextInput value={query} onChangeText={setQuery} placeholder="搜索项目" placeholderTextColor={colors.outline} style={[styles.searchInput, { color: colors.text }]} />
        {query ? <Pressable onPress={() => setQuery("")} accessibilityLabel="清除搜索"><Ionicons name="close-circle" size={19} color={colors.outline} /></Pressable> : null}
      </View>
      <PageScroll>
        {activeProjects.length === 0 ? <EmptyState icon="folder-open-outline" title={query ? "没有匹配的项目" : "创建第一个项目"} description={query ? "换一个关键词试试。" : "项目把任务、每日计划和专注记录组织在一起。"} /> : activeProjects.map((project) => {
          const tasks = state.tasks.filter((task) => task.projectId === project.id);
          const plans = state.dailyPlans.filter((plan) => plan.projectId === project.id);
          const completed = tasks.filter((task) => task.done).length;
          const progress = tasks.length ? Math.round(completed / tasks.length * 100) : 0;
          const accent = PROJECT_COLOR_HEX[project.color] ?? colors.primary;
          return (
            <Pressable key={project.id} accessibilityRole="button" accessibilityLabel={`打开项目 ${project.name}`} onPress={() => router.push({ pathname: "/project/[id]", params: { id: project.id } })}>
              {({ pressed }) => (
                <Card style={[styles.projectCard, { opacity: pressed ? 0.82 : 1 }]}>
                  <View style={styles.projectTop}>
                    <View style={[styles.projectIcon, { backgroundColor: `${accent}22` }]}><Ionicons name="folder" size={25} color={accent} /></View>
                    <View style={styles.projectCopy}>
                      <Text style={[styles.projectName, { color: colors.text }]} numberOfLines={1}>{project.name}</Text>
                      <Text style={[styles.projectMeta, { color: colors.textMuted }]}>{relativeRangeLabel(project.startDate, project.endDate)}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={21} color={colors.outline} />
                  </View>
                  {project.description ? <Text style={[styles.description, { color: colors.textMuted }]} numberOfLines={2}>{project.description}</Text> : null}
                  <View style={styles.progressLabel}><Text style={[styles.progressText, { color: colors.textMuted }]}>{completed} / {tasks.length} 个任务完成</Text><Text style={[styles.progressValue, { color: accent }]}>{progress}%</Text></View>
                  <ProgressBar value={progress} color={accent} />
                  <View style={styles.projectFooter}><View style={[styles.infoChip, { backgroundColor: colors.secondarySoft }]}><Ionicons name="checkmark-done-outline" size={15} color={colors.onSecondarySoft} /><Text style={{ color: colors.onSecondarySoft, fontSize: 11, fontWeight: "700" }}>{tasks.length} 任务</Text></View><View style={[styles.infoChip, { backgroundColor: colors.secondarySoft }]}><Ionicons name="calendar-outline" size={15} color={colors.onSecondarySoft} /><Text style={{ color: colors.onSecondarySoft, fontSize: 11, fontWeight: "700" }}>{plans.length} 计划</Text></View></View>
                </Card>
              )}
            </Pressable>
          );
        })}
        {archivedProjects.length ? <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>已归档</Text> : null}
        {archivedProjects.map((project) => (
          <Card key={project.id} style={styles.archivedCard}>
            <Ionicons name="archive" size={20} color={colors.outline} />
            <Text style={[styles.archivedName, { color: colors.text }]}>{project.name}</Text>
            <Pressable onPress={() => restoreProject(project.id)} style={styles.textAction}><Text style={{ color: colors.primary, fontWeight: "700", fontSize: 12 }}>恢复</Text></Pressable>
            <Pressable onPress={() => Alert.alert("永久删除", `将同时删除「${project.name}」的任务和计划，且无法撤销。`, [{ text: "取消", style: "cancel" }, { text: "永久删除", style: "destructive", onPress: () => removeProject(project.id) }])} style={styles.textAction}><Ionicons name="trash-outline" size={19} color={colors.danger} /></Pressable>
          </Card>
        ))}
      </PageScroll>
      <FormModal visible={formOpen} title="新建项目" onClose={reset} onSubmit={submit} canSubmit={Boolean(name.trim())}>
        <Field label="项目名称" value={name} onChangeText={setName} placeholder="例如：移动端发布" />
        <Field label="说明（可选）" value={description} onChangeText={setDescription} placeholder="补充目标或验收标准" multiline />
        <View style={styles.dateFields}><View style={styles.flex}><Field label="开始日期" value={startDate} onChangeText={setStartDate} placeholder="YYYY-MM-DD" /></View><View style={styles.flex}><Field label="结束日期" value={endDate} onChangeText={setEndDate} placeholder="YYYY-MM-DD" /></View></View>
        <ChoiceRow label="项目颜色" value={color} onChange={setColor} options={PROJECT_COLORS.map((item) => ({ value: item, label: item, color: PROJECT_COLOR_HEX[item] }))} />
      </FormModal>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  search: { height: 52, borderRadius: 28, marginHorizontal: 16, marginBottom: 13, paddingHorizontal: 17, flexDirection: "row", alignItems: "center", gap: 10 }, searchInput: { flex: 1, height: "100%", fontSize: 15 },
  projectCard: { padding: 16, borderRadius: 24 }, projectTop: { flexDirection: "row", alignItems: "center", gap: 11 }, projectIcon: { width: 50, height: 50, borderRadius: 16, alignItems: "center", justifyContent: "center" }, projectCopy: { flex: 1 }, projectName: { fontSize: 18, fontWeight: "800" }, projectMeta: { fontSize: 11, marginTop: 4 }, description: { fontSize: 13, lineHeight: 19, marginTop: 13 },
  progressLabel: { flexDirection: "row", justifyContent: "space-between", marginTop: 16, marginBottom: 7 }, progressText: { fontSize: 11 }, progressValue: { fontSize: 12, fontWeight: "800" }, projectFooter: { flexDirection: "row", gap: 8, marginTop: 13 }, infoChip: { minHeight: 32, borderRadius: 16, paddingHorizontal: 11, flexDirection: "row", alignItems: "center", gap: 5 },
  sectionLabel: { fontSize: 12, fontWeight: "800", marginTop: 8, marginLeft: 4, letterSpacing: 0.8 }, archivedCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 13 }, archivedName: { flex: 1, fontSize: 14, fontWeight: "700" }, textAction: { minWidth: 42, minHeight: 42, alignItems: "center", justifyContent: "center" }, dateFields: { flexDirection: "row", gap: 10 }, flex: { flex: 1 },
});
