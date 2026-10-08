import Ionicons from "@expo/vector-icons/Ionicons";
import { addDays, calculateProjectProgress, relativeRangeLabel, toISODate, todayISO } from "@task-orbit/core";
import { useRouter } from "expo-router";
import { useMemo, useRef, useState } from "react";
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
  const { state, addProject, restoreProject, removeProject, archiveProject, reorderProjects } = useAppStore();
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState(todayISO());
  const [endDate, setEndDate] = useState(toISODate(addDays(new Date(), 30)));
  const [color, setColor] = useState<string>(PROJECT_COLORS[0]);

  // Drag and drop state
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [isOverArchive, setIsOverArchive] = useState(false);
  const [translateY, setTranslateY] = useState(0);

  const touchState = useRef({
    projectId: null as string | null,
    startX: 0,
    startY: 0,
    currentY: 0,
    isDragging: false,
    timer: null as ReturnType<typeof setTimeout> | null,
  });

  const itemLayouts = useRef<Record<string, { y: number; height: number; pageY: number }>>({});
  const archiveLayout = useRef<{ y: number; height: number; pageY: number } | null>(null);
  const cardRefs = useRef<Record<string, View | null>>({});
  const archiveZoneRef = useRef<View | null>(null);

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

  const handleTouchStart = (projectId: string, e: any) => {
    if (touchState.current.isDragging) return;

    const pageX = e.nativeEvent.pageX;
    const pageY = e.nativeEvent.pageY;

    if (touchState.current.timer) {
      clearTimeout(touchState.current.timer);
    }

    touchState.current = {
      projectId,
      startX: pageX,
      startY: pageY,
      currentY: pageY,
      isDragging: false,
      timer: setTimeout(() => {
        touchState.current.isDragging = true;
        setDraggingId(projectId);
        setScrollEnabled(false);
        setTranslateY(0);
        const currentIndex = activeProjects.findIndex((p) => p.id === projectId);
        setHoverIndex(currentIndex);
        setIsOverArchive(false);

        Object.entries(cardRefs.current).forEach(([id, el]) => {
          el?.measureInWindow((x, y, width, height) => {
            itemLayouts.current[id] = { y, height, pageY: y };
          });
        });
        archiveZoneRef.current?.measureInWindow((x, y, width, height) => {
          archiveLayout.current = { y, height, pageY: y };
        });
      }, 250),
    };
  };

  const handleTouchMove = (e: any) => {
    const pageX = e.nativeEvent.pageX;
    const pageY = e.nativeEvent.pageY;
    touchState.current.currentY = pageY;

    if (!touchState.current.isDragging) {
      const dx = Math.abs(pageX - touchState.current.startX);
      const dy = Math.abs(pageY - touchState.current.startY);
      if (dx > 8 || dy > 8) {
        if (touchState.current.timer) {
          clearTimeout(touchState.current.timer);
          touchState.current.timer = null;
        }
      }
      return;
    }

    const dy = pageY - touchState.current.startY;
    setTranslateY(dy);

    const archiveY = archiveLayout.current?.pageY;
    if (archiveY !== undefined && pageY >= archiveY - 30) {
      setIsOverArchive(true);
      setHoverIndex(null);
      return;
    }
    setIsOverArchive(false);

    const fromIndex = activeProjects.findIndex((p) => p.id === touchState.current.projectId);
    let targetIdx = fromIndex;
    for (let i = 0; i < activeProjects.length; i++) {
      const p = activeProjects[i];
      const layout = itemLayouts.current[p.id];
      if (layout) {
        if (pageY >= layout.pageY && pageY <= layout.pageY + layout.height) {
          targetIdx = i;
          break;
        } else if (pageY < layout.pageY && i === 0) {
          targetIdx = 0;
          break;
        } else if (pageY > layout.pageY + layout.height && i === activeProjects.length - 1) {
          targetIdx = activeProjects.length - 1;
          break;
        }
      }
    }
    setHoverIndex(targetIdx);
  };

  const handleTouchEnd = (projectId: string) => {
    if (touchState.current.timer) {
      clearTimeout(touchState.current.timer);
      touchState.current.timer = null;
    }

    if (touchState.current.isDragging) {
      const currentDragId = touchState.current.projectId;

      if (isOverArchive && currentDragId) {
        const proj = activeProjects.find((p) => p.id === currentDragId);
        archiveProject(currentDragId);
        Alert.alert("已归档", `项目「${proj?.name ?? ""}」已归档。`);
      } else if (hoverIndex !== null && currentDragId) {
        const fromIndex = activeProjects.findIndex((p) => p.id === currentDragId);
        if (fromIndex !== -1 && hoverIndex !== fromIndex) {
          const next = [...activeProjects.map((p) => p.id)];
          const [movedId] = next.splice(fromIndex, 1);
          next.splice(hoverIndex, 0, movedId);
          reorderProjects(next);
        }
      }
    } else {
      if (touchState.current.projectId === projectId) {
        router.push({ pathname: "/project/[id]", params: { id: projectId } });
      }
    }

    touchState.current = {
      projectId: null,
      startX: 0,
      startY: 0,
      currentY: 0,
      isDragging: false,
      timer: null,
    };
    setDraggingId(null);
    setTranslateY(0);
    setScrollEnabled(true);
    setHoverIndex(null);
    setIsOverArchive(false);
  };

  const handleTouchCancel = () => {
    if (touchState.current.timer) {
      clearTimeout(touchState.current.timer);
      touchState.current.timer = null;
    }
    touchState.current = {
      projectId: null,
      startX: 0,
      startY: 0,
      currentY: 0,
      isDragging: false,
      timer: null,
    };
    setDraggingId(null);
    setTranslateY(0);
    setScrollEnabled(true);
    setHoverIndex(null);
    setIsOverArchive(false);
  };

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
      <PageScroll scrollEnabled={scrollEnabled}>
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
            const completedTasks = tasks.filter((task) => task.done).length;
            const completedPlans = plans.filter((plan) => plan.done).length;
            const progress = calculateProjectProgress(tasks, plans);
            const accent = PROJECT_COLOR_HEX[project.color] ?? colors.primary;
            const isDragging = draggingId === project.id;
            const currentIndex = activeProjects.findIndex((p) => p.id === project.id);
            const draggingIndex = activeProjects.findIndex((p) => p.id === draggingId);
            const isDropTarget = !isDragging && hoverIndex === currentIndex;

            return (
              <View
                key={project.id}
                ref={(el) => {
                  cardRefs.current[project.id] = el;
                }}
                onLayout={() => {
                  cardRefs.current[project.id]?.measureInWindow((x, y, width, height) => {
                    itemLayouts.current[project.id] = { y, height, pageY: y };
                  });
                }}
                onTouchStart={(e) => handleTouchStart(project.id, e)}
                onTouchMove={handleTouchMove}
                onTouchEnd={() => handleTouchEnd(project.id)}
                onTouchCancel={handleTouchCancel}
                style={[
                  isDragging && {
                    transform: [{ translateY }, { scale: 1.03 }],
                    zIndex: 999,
                    elevation: 8,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: 0.25,
                    shadowRadius: 10,
                    opacity: 0.95,
                  },
                ]}
              >
                {isDropTarget && hoverIndex !== null && hoverIndex < draggingIndex && (
                  <View style={[styles.dropIndicatorLine, { backgroundColor: colors.primary }]} />
                )}
                <Card
                  variant="elevated"
                  style={[
                    styles.projectCard,
                    isDragging && { borderColor: colors.primary, borderWidth: 1.5 },
                  ]}
                >
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
                    <Ionicons
                      name={isDragging ? "reorder-two" : "chevron-forward"}
                      size={20}
                      color={isDragging ? colors.primary : colors.outline}
                    />
                  </View>

                  {project.description ? (
                    <Text style={[styles.description, { color: colors.onSurfaceVariant }]} numberOfLines={2}>
                      {project.description}
                    </Text>
                  ) : null}

                  <View style={styles.progressLabel}>
                    <Text style={[styles.progressText, { color: colors.onSurfaceVariant }]}>
                      {tasks.length > 0 ? `${completedTasks} / ${tasks.length} 个任务完成` : `${completedPlans} / ${plans.length} 个计划完成`}
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
                {isDropTarget && hoverIndex !== null && hoverIndex > draggingIndex && (
                  <View style={[styles.dropIndicatorLine, { backgroundColor: colors.primary }]} />
                )}
              </View>
            );
          })
        )}

        {/* Archive Drop Zone for Dragging - 只有拖动时才显示 */}
        {draggingId !== null && (
          <View
            ref={archiveZoneRef}
            onLayout={() => {
              archiveZoneRef.current?.measureInWindow((x, y, width, height) => {
                archiveLayout.current = { y, height, pageY: y };
              });
            }}
            style={[
              styles.archiveDropZone,
              {
                borderColor: isOverArchive ? colors.primary : colors.outlineVariant,
                backgroundColor: isOverArchive ? colors.primaryContainer : colors.surfaceContainerLow,
              },
              styles.archiveDropZoneVisible,
            ]}
          >
            <Ionicons
              name={isOverArchive ? "archive" : "archive-outline"}
              size={22}
              color={isOverArchive ? colors.onPrimaryContainer : colors.onSurfaceVariant}
            />
            <Text
              style={[
                styles.archiveDropText,
                { color: isOverArchive ? colors.onPrimaryContainer : colors.onSurfaceVariant },
                isOverArchive && { fontWeight: "700" },
              ]}
            >
              {isOverArchive ? "松开以归档项目" : "拖拽到此处归档"}
            </Text>
          </View>
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
  dropIndicatorLine: {
    height: 3,
    borderRadius: 2,
    marginVertical: 4,
  },
  archiveDropZone: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: MD3Shape.medium,
    borderWidth: 1.5,
    borderStyle: "dashed",
    marginTop: 12,
    marginBottom: 8,
  },
  archiveDropZoneVisible: {
    borderStyle: "solid",
    elevation: 2,
  },
  archiveDropText: {
    ...MD3Typography.labelLarge,
    fontWeight: "500",
  },
});
