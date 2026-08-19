import Ionicons from "@expo/vector-icons/Ionicons";
import { addDays, toISODate, todayISO, type Priority } from "@task-orbit/core";
import { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { AppScreen, Card, ChoiceRow, EmptyState, Field, FormModal, IconButton, PageScroll } from "@/components/ui";
import { useAppColors } from "@/constants/theme";
import { PRIORITY_LABEL, PROJECT_COLORS, PROJECT_COLOR_HEX, useAppStore } from "@/store/app-store";

type ModalMode = "project" | "task" | "editProject" | "editTask" | null;

export default function ProjectsScreen() {
  const colors = useAppColors();
  const { state, addProject, updateProject, archiveProject, restoreProject, removeProject, addTask, updateTask, toggleTask, removeTask } = useAppStore();
  const [mode, setMode] = useState<ModalMode>(null);
  const [projectId, setProjectId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState(todayISO());
  const [endDate, setEndDate] = useState(toISODate(addDays(new Date(), 30)));
  const [color, setColor] = useState<string>(PROJECT_COLORS[0]);
  const [priority, setPriority] = useState<Priority>("medium");
  const [editingId, setEditingId] = useState("");
  const projects = useMemo(() => state.projects.filter((project) => !project.archived), [state.projects]);

  const reset = () => {
    setMode(null); setName(""); setDescription(""); setProjectId(""); setEditingId(""); setStartDate(todayISO()); setEndDate(toISODate(addDays(new Date(), 30))); setPriority("medium");
  };
  const openTask = (id: string) => { setProjectId(id); setMode("task"); };
  const editProject = (id: string) => {
    const project = state.projects.find((item) => item.id === id); if (!project) return;
    setEditingId(id); setName(project.name); setDescription(project.description); setStartDate(project.startDate); setEndDate(project.endDate); setColor(project.color); setMode("editProject");
  };
  const editTask = (id: string) => {
    const task = state.tasks.find((item) => item.id === id); if (!task) return;
    setEditingId(id); setProjectId(task.projectId); setName(task.name); setDescription(task.description); setStartDate(task.startDate); setEndDate(task.endDate); setPriority(task.priority); setMode("editTask");
  };
  const submit = () => {
    if (!name.trim()) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate) || endDate < startDate) {
      Alert.alert("日期无效", "请使用 YYYY-MM-DD，且结束日期不能早于开始日期。"); return;
    }
    if (mode === "project") addProject({ name: name.trim(), description: description.trim(), color, startDate, endDate });
    if (mode === "editProject") updateProject(editingId, { name: name.trim(), description: description.trim(), color, startDate, endDate });
    if (mode === "task") addTask({ projectId, name: name.trim(), description: description.trim(), startDate, endDate, priority });
    if (mode === "editTask") updateTask(editingId, { name: name.trim(), description: description.trim(), startDate, endDate, priority });
    reset();
  };

  return (
    <AppScreen title="项目" subtitle={`${projects.length} 个进行中`} action={<IconButton icon="add" label="新建项目" onPress={() => setMode("project")} />}>
      <PageScroll>
        {projects.length === 0 ? <EmptyState icon="folder-open-outline" title="创建第一个项目" description="项目把相关任务和日程放在同一个上下文里。" /> : projects.map((project) => {
          const tasks = state.tasks.filter((task) => task.projectId === project.id);
          const completed = tasks.filter((task) => task.done).length;
          const accent = PROJECT_COLOR_HEX[project.color] ?? colors.primary;
          return (
            <Card key={project.id} style={styles.projectCard}>
              <View style={styles.projectTop}>
                <View style={[styles.projectIcon, { backgroundColor: `${accent}1F` }]}><Ionicons name="folder" size={23} color={accent} /></View>
                <View style={styles.projectCopy}>
                  <Text style={[styles.projectName, { color: colors.text }]}>{project.name}</Text>
                  <Text style={[styles.projectMeta, { color: colors.textMuted }]}>{completed}/{tasks.length} 个任务 · {project.endDate}</Text>
                </View>
                <IconButton icon="create-outline" label="编辑项目" onPress={() => editProject(project.id)} />
                <IconButton icon="add" label="添加任务" onPress={() => openTask(project.id)} />
              </View>
              {project.description ? <Text style={[styles.description, { color: colors.textMuted }]}>{project.description}</Text> : null}
              <View style={[styles.progressTrack, { backgroundColor: colors.surfaceVariant }]}><View style={[styles.progress, { backgroundColor: accent, width: `${tasks.length ? (completed / tasks.length) * 100 : 0}%` }]} /></View>
              <View style={styles.tasks}>
                {tasks.length === 0 ? <Text style={[styles.noTask, { color: colors.textMuted }]}>还没有任务，点击右上角 + 添加</Text> : tasks.map((task) => (
                  <View key={task.id} style={[styles.task, { borderTopColor: colors.border }]}>
                    <Pressable onPress={() => toggleTask(task.id, !task.done)} accessibilityRole="checkbox"><Ionicons name={task.done ? "checkmark-circle" : "ellipse-outline"} size={22} color={task.done ? colors.success : accent} /></Pressable>
                    <View style={styles.taskCopy}>
                      <Text style={[styles.taskName, { color: colors.text, opacity: task.done ? 0.5 : 1, textDecorationLine: task.done ? "line-through" : "none" }]}>{task.name}</Text>
                      <Text style={[styles.taskMeta, { color: colors.textMuted }]}>{PRIORITY_LABEL[task.priority]}优先级 · {task.endDate}</Text>
                    </View>
                    <Pressable onPress={() => editTask(task.id)} accessibilityLabel="编辑任务"><Ionicons name="create-outline" size={18} color={colors.tabInactive} /></Pressable>
                    <Pressable onPress={() => Alert.alert("删除任务", `确定删除「${task.name}」及关联日程？`, [{ text: "取消", style: "cancel" }, { text: "删除", style: "destructive", onPress: () => removeTask(task.id) }])} accessibilityLabel="删除任务"><Ionicons name="trash-outline" size={18} color={colors.tabInactive} /></Pressable>
                  </View>
                ))}
              </View>
              <Pressable onPress={() => Alert.alert("归档项目", `归档「${project.name}」？数据仍会保留。`, [{ text: "取消", style: "cancel" }, { text: "归档", onPress: () => archiveProject(project.id) }])} style={styles.archive}><Ionicons name="archive-outline" size={16} color={colors.textMuted} /><Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: "600" }}>归档项目</Text></Pressable>
            </Card>
          );
        })}
        {state.projects.some((project) => project.archived) ? <Text style={[styles.archivedTitle, { color: colors.textMuted }]}>已归档</Text> : null}
        {state.projects.filter((project) => project.archived).map((project) => (
          <Card key={project.id} style={styles.archivedCard}>
            <Ionicons name="archive" size={20} color={colors.tabInactive} />
            <Text style={[styles.archivedName, { color: colors.text }]}>{project.name}</Text>
            <Pressable onPress={() => restoreProject(project.id)}><Text style={{ color: colors.primary, fontWeight: "700", fontSize: 12 }}>恢复</Text></Pressable>
            <Pressable onPress={() => Alert.alert("永久删除", `将同时删除「${project.name}」的任务和日程，且无法撤销。`, [{ text: "取消", style: "cancel" }, { text: "永久删除", style: "destructive", onPress: () => removeProject(project.id) }])}><Ionicons name="trash-outline" size={19} color={colors.danger} /></Pressable>
          </Card>
        ))}
      </PageScroll>
      <FormModal visible={mode !== null} title={mode === "project" ? "新建项目" : mode === "editProject" ? "编辑项目" : mode === "editTask" ? "编辑任务" : "添加任务"} onClose={reset} onSubmit={submit} canSubmit={Boolean(name.trim())}>
        <Field label={mode === "project" || mode === "editProject" ? "项目名称" : "任务名称"} value={name} onChangeText={setName} placeholder="例如：移动端发布" />
        <Field label="说明（可选）" value={description} onChangeText={setDescription} placeholder="补充目标或验收标准" multiline />
        <View style={styles.dateFields}><View style={styles.flex}><Field label="开始日期" value={startDate} onChangeText={setStartDate} placeholder="YYYY-MM-DD" /></View><View style={styles.flex}><Field label="结束日期" value={endDate} onChangeText={setEndDate} placeholder="YYYY-MM-DD" /></View></View>
        {mode === "project" || mode === "editProject" ? <ChoiceRow label="颜色" value={color} onChange={setColor} options={PROJECT_COLORS.map((item) => ({ value: item, label: item, color: PROJECT_COLOR_HEX[item] }))} /> : <ChoiceRow label="优先级" value={priority} onChange={(value) => setPriority(value as Priority)} options={[{ value: "low", label: "低" }, { value: "medium", label: "中" }, { value: "high", label: "高" }]} />}
      </FormModal>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  projectCard: { padding: 16 }, projectTop: { flexDirection: "row", alignItems: "center", gap: 11 }, projectIcon: { width: 46, height: 46, borderRadius: 15, alignItems: "center", justifyContent: "center" }, projectCopy: { flex: 1 }, projectName: { fontSize: 17, fontWeight: "800" }, projectMeta: { fontSize: 11, marginTop: 4 }, description: { fontSize: 13, lineHeight: 19, marginTop: 12 },
  progressTrack: { height: 5, borderRadius: 3, overflow: "hidden", marginTop: 14 }, progress: { height: 5, borderRadius: 3 }, tasks: { marginTop: 9 }, noTask: { fontSize: 12, paddingVertical: 13, textAlign: "center" }, task: { minHeight: 55, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: "row", alignItems: "center", gap: 10 }, taskCopy: { flex: 1 }, taskName: { fontSize: 14, fontWeight: "600" }, taskMeta: { fontSize: 10, marginTop: 3 }, archive: { alignSelf: "flex-end", flexDirection: "row", gap: 6, alignItems: "center", paddingTop: 10, paddingHorizontal: 4 }, dateFields: { flexDirection: "row", gap: 10 }, flex: { flex: 1 },
  archivedTitle: { fontSize: 12, fontWeight: "800", marginTop: 8, marginLeft: 4, textTransform: "uppercase", letterSpacing: 1 }, archivedCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 13 }, archivedName: { flex: 1, fontSize: 14, fontWeight: "700" },
});
