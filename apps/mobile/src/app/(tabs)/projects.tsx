import Ionicons from "@expo/vector-icons/Ionicons";
import { addDays, relativeRangeLabel, toISODate, todayISO } from "@task-orbit/core";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import {
  AppScreen,
  AssistChip,
  Card,
  ChoiceRow,
  EmptyState,
  ExtendedFAB,
  Field,
  FormModal,
  PageScroll,
  ProgressBar,
  SearchField,
} from "@/components/ui";
import { MD3Shape, MD3Typography, useAppColors } from "@/constants/theme";
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

  const activeProjects = useMemo(
    () =>
      state.projects.filter(
        (project) =>
          !project.archived &&
          project.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
      ),
    [query, state.projects],
  );
  const archivedProjects = state.projects.filter((project) => project.archived);

  const reset = () => {
    setFormOpen(false);
    setName("");
    setDescription("");
    setStartDate(todayISO());
    setEndDate(toISODate(addDays(new Date(), 30)));
    setColor(PROJECT_COLORS[0]);
  };
  const openCreate = () => {
    reset();
    setFormOpen(true);
  };
  const submit = () => {
    if (!name.trim()) return;
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(startDate) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(endDate) ||
      endDate < startDate
    ) {
      Alert.alert("日期无效", "请使用 YYYY-MM-DD，且结束日期不能早于开始日期。");
      return;
    }
    const input = { name: name.trim(), description: description.trim(), color, startDate, endDate };
    addProject(input);
    reset();
  };

  return (
    <AppScreen
      title="项目"
      subtitle={`${activeProjects.length} 个进行中`}
    >
      <SearchField value={query} onChangeText={setQuery} placeholder="搜索项目" />
      <PageScroll>
        {activeProjects.length === 0 ? (
          <EmptyState
            icon="folder-open-outline"
            title={query ? "没有匹配的项目" : "创建第一个项目"}
            description={
              query
                ? "换一个关键词试试。"
                : "项目把任务、每日计划和专注记录组织在一起。"
            }
          />
        ) : (
          activeProjects.map((project) => {
            const tasks = state.tasks.filter((task) => task.projectId === project.id);
            const plans = state.dailyPlans.filter((plan) => plan.projectId === project.id);
            const completed = tasks.filter((task) => task.done).length;
            const progress = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;
            const accent = PROJECT_COLOR_HEX[project.color] ?? colors.primary;

            return (
              <Pressable
                key={project.id}
                accessibilityRole="button"
                accessibilityLabel={`打开项目 ${project.name}`}
                onPress={() =>
                  router.push({ pathname: "/project/[id]", params: { id: project.id } })
                }
              >
                {({ pressed }) => (
                  <Card variant="elevated" style={[styles.projectCard, { opacity: pressed ? 0.88 : 1 }]}>
                    <View style={styles.projectTop}>
                      <View style={[styles.projectIcon, { backgroundColor: `${accent}20` }]}>
                        <Ionicons name="folder" size={24} color={accent} />
                      </View>
                      <View style={styles.projectCopy}>
                        <Text style={[styles.projectName, { color: colors.onSurface }]} numberOfLines={1}>
                          {project.name}
                        </Text>
                        <Text style={[styles.projectMeta, { color: colors.onSurfaceVariant }]}>
                          {relativeRangeLabel(project.startDate, project.endDate)}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color={colors.outline} />
                    </View>

                    {project.description ? (
                      <Text style={[styles.description, { color: colors.onSurfaceVariant }]} numberOfLines={2}>
                        {project.description}
                      </Text>
                    ) : null}

                    <View style={styles.progressLabel}>
                      <Text style={[styles.progressText, { color: colors.onSurfaceVariant }]}>
                        {completed} / {tasks.length} 个任务完成
                      </Text>
                      <Text style={[styles.progressValue, { color: accent }]}>{progress}%</Text>
                    </View>
                    <ProgressBar value={progress} color={accent} />

                    <View style={styles.projectFooter}>
                      <AssistChip
                        icon="checkmark-done"
                        label={`${tasks.length} 任务`}
                        color={accent}
                      />
                      <AssistChip
                        icon="calendar"
                        label={`${plans.length} 计划`}
                      />
                    </View>
                  </Card>
                )}
              </Pressable>
            );
          })
        )}

        {archivedProjects.length ? (
          <Text style={[styles.sectionLabel, { color: colors.onSurfaceVariant }]}>已归档</Text>
        ) : null}
        {archivedProjects.map((project) => (
          <Card key={project.id} variant="outlined" style={styles.archivedCard}>
            <Ionicons name="archive-outline" size={20} color={colors.outline} />
            <Text style={[styles.archivedName, { color: colors.onSurface }]}>{project.name}</Text>
            <Pressable onPress={() => restoreProject(project.id)} style={styles.textAction}>
              <Text style={{ color: colors.primary, fontWeight: "600", fontSize: 13 }}>恢复</Text>
            </Pressable>
            <Pressable
              onPress={() =>
                Alert.alert(
                  "永久删除",
                  `将同时删除「${project.name}」的任务和计划，且无法撤销。`,
                  [
                    { text: "取消", style: "cancel" },
                    {
                      text: "永久删除",
                      style: "destructive",
                      onPress: () => removeProject(project.id),
                    },
                  ],
                )
              }
              style={styles.textAction}
            >
              <Ionicons name="trash-outline" size={19} color={colors.error} />
            </Pressable>
          </Card>
        ))}
      </PageScroll>

      <ExtendedFAB
        icon="add"
        label="新建项目"
        onPress={openCreate}
      />

      <FormModal
        visible={formOpen}
        title="新建项目"
        onClose={reset}
        onSubmit={submit}
        canSubmit={Boolean(name.trim())}
      >
        <Field label="项目名称" value={name} onChangeText={setName} placeholder="例如：移动端发布" />
        <Field
          label="说明（可选）"
          value={description}
          onChangeText={setDescription}
          placeholder="补充目标或验收标准"
          multiline
        />
        <View style={styles.dateFields}>
          <View style={styles.flex}>
            <Field label="开始日期" value={startDate} onChangeText={setStartDate} placeholder="YYYY-MM-DD" />
          </View>
          <View style={styles.flex}>
            <Field label="结束日期" value={endDate} onChangeText={setEndDate} placeholder="YYYY-MM-DD" />
          </View>
        </View>
        <ChoiceRow
          label="项目颜色"
          value={color}
          onChange={setColor}
          options={PROJECT_COLORS.map((item) => ({
            value: item,
            label: item,
            color: PROJECT_COLOR_HEX[item],
          }))}
        />
      </FormModal>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  projectCard: {
    padding: 16,
    borderRadius: MD3Shape.large,
  },
  projectTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  projectIcon: {
    width: 48,
    height: 48,
    borderRadius: MD3Shape.medium,
    alignItems: "center",
    justifyContent: "center",
  },
  projectCopy: { flex: 1 },
  projectName: { ...MD3Typography.titleMedium, fontWeight: "600" },
  projectMeta: { ...MD3Typography.bodySmall, marginTop: 2 },
  description: { ...MD3Typography.bodyMedium, lineHeight: 20, marginTop: 12 },
  progressLabel: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
    marginBottom: 6,
  },
  progressText: { ...MD3Typography.bodySmall },
  progressValue: { ...MD3Typography.labelMedium, fontWeight: "600" },
  projectFooter: { flexDirection: "row", gap: 8, marginTop: 14 },
  sectionLabel: {
    ...MD3Typography.labelLarge,
    fontWeight: "600",
    marginTop: 12,
    marginLeft: 4,
    letterSpacing: 0.2,
  },
  archivedCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: MD3Shape.medium,
  },
  archivedName: { flex: 1, ...MD3Typography.titleSmall },
  textAction: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  dateFields: { flexDirection: "row", gap: 10 },
  flex: { flex: 1 },
});
