package com.taskorbit.ui.screens.projectdetail

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.FolderOpen
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.KeyboardArrowUp
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.Edit
import androidx.compose.material.icons.outlined.Folder
import androidx.compose.material.icons.outlined.Timer
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SecondaryTabRow
import androidx.compose.material3.Tab
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.taskorbit.domain.ProjectDomain
import com.taskorbit.domain.model.DailyPlan
import com.taskorbit.domain.model.Priority
import com.taskorbit.domain.model.Task
import com.taskorbit.ui.components.CardVariant
import com.taskorbit.ui.components.ColorPickerRow
import com.taskorbit.ui.components.IconButtonVariant
import com.taskorbit.ui.components.TaskOrbitAssistChip
import com.taskorbit.ui.components.TaskOrbitBottomSheet
import com.taskorbit.ui.components.TaskOrbitButton
import com.taskorbit.ui.components.TaskOrbitCard
import com.taskorbit.ui.components.TaskOrbitCheckbox
import com.taskorbit.ui.components.TaskOrbitEmptyState
import com.taskorbit.ui.components.TaskOrbitIconButton
import com.taskorbit.ui.components.TaskOrbitProgressBar
import com.taskorbit.ui.components.TaskOrbitTopAppBar
import com.taskorbit.ui.theme.PROJECT_COLOR_MAP
import com.taskorbit.ui.theme.ShapeTokens

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProjectDetailScreen(
    onBack: () -> Unit,
    viewModel: ProjectDetailViewModel
) {
    val project by viewModel.project.collectAsState()
    val tasks by viewModel.tasks.collectAsState()
    val plans by viewModel.plans.collectAsState()
    val metrics by viewModel.metrics.collectAsState()
    val section by viewModel.section.collectAsState()
    val expandedTasks by viewModel.expandedTasks.collectAsState()

    val isTaskFormOpen by viewModel.isTaskFormOpen.collectAsState()
    val isProjectFormOpen by viewModel.isProjectFormOpen.collectAsState()

    if (project == null) {
        Scaffold(
            topBar = {
                TaskOrbitTopAppBar(
                    title = "项目详情",
                    navigationIcon = {
                        IconButton(onClick = onBack) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "返回")
                        }
                    }
                )
            }
        ) { padding ->
            TaskOrbitEmptyState(
                icon = Icons.Outlined.Folder,
                title = "项目不存在",
                description = "该项目可能已被删除或归档。",
                modifier = Modifier.padding(padding)
            )
        }
        return
    }

    val currentProject = project!!
    val accent = PROJECT_COLOR_MAP[currentProject.color] ?: MaterialTheme.colorScheme.primary

    Scaffold(
        topBar = {
            TaskOrbitTopAppBar(
                title = currentProject.name,
                subtitle = ProjectDomain.relativeRangeLabel(currentProject.startDate, currentProject.endDate),
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "返回")
                    }
                },
                actions = {
                    IconButton(onClick = viewModel::openEditProjectForm) {
                        Icon(Icons.Filled.Edit, contentDescription = "编辑项目")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                    titleContentColor = MaterialTheme.colorScheme.onSurface
                )
            )
        },
        floatingActionButton = {
            if (section == ProjectDetailSection.TASKS) {
                FloatingActionButton(
                    onClick = viewModel::openNewTaskForm,
                    containerColor = MaterialTheme.colorScheme.primaryContainer,
                    contentColor = MaterialTheme.colorScheme.onPrimaryContainer,
                    shape = ShapeTokens.Large
                ) {
                    Icon(Icons.Filled.Add, contentDescription = "添加任务")
                }
            }
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            // Hero 卡片
            TaskOrbitCard(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                variant = CardVariant.FILLED,
                shape = ShapeTokens.Large
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(MaterialTheme.colorScheme.surfaceContainerHigh)
                        .padding(16.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .size(44.dp)
                                .clip(ShapeTokens.Medium)
                                .background(accent.copy(alpha = 0.18f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Filled.FolderOpen,
                                contentDescription = null,
                                tint = accent,
                                modifier = Modifier.size(24.dp)
                            )
                        }

                        Spacer(modifier = Modifier.width(12.dp))

                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = currentProject.name,
                                style = MaterialTheme.typography.titleLarge,
                                color = MaterialTheme.colorScheme.onSurface,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                            if (currentProject.description.isNotBlank()) {
                                Spacer(modifier = Modifier.height(2.dp))
                                Text(
                                    text = currentProject.description,
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    maxLines = 2,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(14.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(
                            text = "${metrics.completedTasks}/${metrics.totalTasks} 个任务完成",
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Text(
                            text = "${metrics.progress}%",
                            style = MaterialTheme.typography.labelLarge,
                            color = accent
                        )
                    }

                    Spacer(modifier = Modifier.height(6.dp))
                    TaskOrbitProgressBar(progress = metrics.progress, color = accent)
                }
            }

            // Tab 切换
            SecondaryTabRow(
                selectedTabIndex = if (section == ProjectDetailSection.TASKS) 0 else 1,
                modifier = Modifier.fillMaxWidth(),
                containerColor = MaterialTheme.colorScheme.surface
            ) {
                Tab(
                    selected = section == ProjectDetailSection.TASKS,
                    onClick = { viewModel.setSection(ProjectDetailSection.TASKS) },
                    text = { Text("任务列表 (${tasks.size})") }
                )
                Tab(
                    selected = section == ProjectDetailSection.STATS,
                    onClick = { viewModel.setSection(ProjectDetailSection.STATS) },
                    text = { Text("项目概览") }
                )
            }

            // 内容列表
            if (section == ProjectDetailSection.TASKS) {
                if (tasks.isEmpty()) {
                    TaskOrbitEmptyState(
                        icon = Icons.Outlined.Folder,
                        title = "暂无任务",
                        description = "点击右下角按钮为该项目创建第一个任务。",
                        modifier = Modifier.fillMaxSize()
                    )
                } else {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 12.dp, bottom = 88.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        items(tasks, key = { it.id }) { task ->
                            val taskPlans = plans.filter { it.taskId == task.id }
                            val isExpanded = task.id in expandedTasks

                            TaskRowItem(
                                task = task,
                                plans = taskPlans,
                                isExpanded = isExpanded,
                                onToggleDone = { done -> viewModel.toggleTask(task.id, done) },
                                onToggleExpand = { viewModel.toggleTaskExpanded(task.id) },
                                onEdit = { viewModel.openEditTaskForm(task) },
                                onDelete = { viewModel.removeTask(task.id) },
                                modifier = Modifier.animateItem()
                            )
                        }
                    }
                }
            } else {
                // 统计概览
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    MetricStatCard(
                        title = "任务完成率",
                        value = if (metrics.totalTasks > 0) "${(metrics.completedTasks * 100 / metrics.totalTasks)}%" else "0%",
                        subtitle = "${metrics.completedTasks} / ${metrics.totalTasks} 个任务已完成",
                        icon = Icons.Outlined.CheckCircle,
                        color = MaterialTheme.colorScheme.primary
                    )
                    MetricStatCard(
                        title = "计划完成率",
                        value = if (metrics.totalPlans > 0) "${(metrics.completedPlans * 100 / metrics.totalPlans)}%" else "0%",
                        subtitle = "${metrics.completedPlans} / ${metrics.totalPlans} 个计划已完成",
                        icon = Icons.Outlined.CalendarMonth,
                        color = MaterialTheme.colorScheme.secondary
                    )
                    MetricStatCard(
                        title = "累计专注时长",
                        value = "${metrics.totalFocusMinutes} 分钟",
                        subtitle = "该项目记录的番茄钟专注总时间",
                        icon = Icons.Outlined.Timer,
                        color = MaterialTheme.colorScheme.tertiary
                    )
                }
            }
        }
    }

    // 新建 / 编辑任务 BottomSheet
    if (isTaskFormOpen) {
        TaskOrbitBottomSheet(
            onDismissRequest = viewModel::closeTaskForm
        ) {
            val name by viewModel.taskName.collectAsState()
            val description by viewModel.taskDescription.collectAsState()
            val startDate by viewModel.taskStartDate.collectAsState()
            val endDate by viewModel.taskEndDate.collectAsState()
            val priority by viewModel.taskPriority.collectAsState()

            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 24.dp, vertical = 16.dp)
            ) {
                Text(
                    text = if (viewModel.editingTaskId != null) "编辑任务" else "添加任务",
                    style = MaterialTheme.typography.titleLarge
                )

                Spacer(modifier = Modifier.height(16.dp))

                OutlinedTextField(
                    value = name,
                    onValueChange = { viewModel.taskName.value = it },
                    label = { Text("任务名称") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(12.dp))

                OutlinedTextField(
                    value = description,
                    onValueChange = { viewModel.taskDescription.value = it },
                    label = { Text("任务描述（可选）") },
                    maxLines = 3,
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(12.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    OutlinedTextField(
                        value = startDate,
                        onValueChange = { viewModel.taskStartDate.value = it },
                        label = { Text("开始日期") },
                        modifier = Modifier.weight(1f)
                    )
                    OutlinedTextField(
                        value = endDate,
                        onValueChange = { viewModel.taskEndDate.value = it },
                        label = { Text("结束日期") },
                        modifier = Modifier.weight(1f)
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))

                Text("优先级", style = MaterialTheme.typography.labelLarge)
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Priority.entries.forEach { p ->
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.clickable { viewModel.taskPriority.value = p }
                        ) {
                            RadioButton(
                                selected = priority == p,
                                onClick = { viewModel.taskPriority.value = p }
                            )
                            Text(p.label, style = MaterialTheme.typography.bodyMedium)
                        }
                    }
                }

                Spacer(modifier = Modifier.height(24.dp))

                TaskOrbitButton(
                    text = if (viewModel.editingTaskId != null) "保存修改" else "创建任务",
                    onClick = viewModel::submitTask,
                    modifier = Modifier.fillMaxWidth(),
                    enabled = name.isNotBlank()
                )

                Spacer(modifier = Modifier.height(16.dp))
            }
        }
    }

    // 编辑项目 BottomSheet
    if (isProjectFormOpen) {
        TaskOrbitBottomSheet(
            onDismissRequest = viewModel::closeProjectForm
        ) {
            val name by viewModel.editName.collectAsState()
            val description by viewModel.editDescription.collectAsState()
            val color by viewModel.editColor.collectAsState()
            val startDate by viewModel.editStartDate.collectAsState()
            val endDate by viewModel.editEndDate.collectAsState()

            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 24.dp, vertical = 16.dp)
            ) {
                Text("编辑项目信息", style = MaterialTheme.typography.titleLarge)

                Spacer(modifier = Modifier.height(16.dp))

                OutlinedTextField(
                    value = name,
                    onValueChange = { viewModel.editName.value = it },
                    label = { Text("项目名称") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(12.dp))

                OutlinedTextField(
                    value = description,
                    onValueChange = { viewModel.editDescription.value = it },
                    label = { Text("项目描述") },
                    maxLines = 3,
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(16.dp))

                Text("项目主题色", style = MaterialTheme.typography.labelLarge)
                ColorPickerRow(
                    selectedColor = color,
                    onColorSelected = { viewModel.editColor.value = it }
                )

                Spacer(modifier = Modifier.height(12.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    OutlinedTextField(
                        value = startDate,
                        onValueChange = { viewModel.editStartDate.value = it },
                        label = { Text("开始日期") },
                        modifier = Modifier.weight(1f)
                    )
                    OutlinedTextField(
                        value = endDate,
                        onValueChange = { viewModel.editEndDate.value = it },
                        label = { Text("结束日期") },
                        modifier = Modifier.weight(1f)
                    )
                }

                Spacer(modifier = Modifier.height(24.dp))

                TaskOrbitButton(
                    text = "保存项目",
                    onClick = viewModel::submitProjectEdit,
                    modifier = Modifier.fillMaxWidth(),
                    enabled = name.isNotBlank()
                )

                Spacer(modifier = Modifier.height(16.dp))
            }
        }
    }
}

@Composable
private fun TaskRowItem(
    task: Task,
    plans: List<DailyPlan>,
    isExpanded: Boolean,
    onToggleDone: (Boolean) -> Unit,
    onToggleExpand: () -> Unit,
    onEdit: () -> Unit,
    onDelete: () -> Unit,
    modifier: Modifier = Modifier
) {
    val priorityColor = when (task.priority) {
        Priority.HIGH -> MaterialTheme.colorScheme.error
        Priority.MEDIUM -> Color(0xFF8C4F00)
        Priority.LOW -> MaterialTheme.colorScheme.outline
    }

    TaskOrbitCard(
        modifier = modifier.fillMaxWidth(),
        variant = CardVariant.ELEVATED,
        shape = ShapeTokens.Medium
    ) {
        Column(modifier = Modifier.fillMaxWidth().padding(12.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                TaskOrbitCheckbox(
                    checked = task.done,
                    onCheckedChange = onToggleDone
                )

                Spacer(modifier = Modifier.width(8.dp))

                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = task.name,
                        style = MaterialTheme.typography.bodyLarge,
                        color = if (task.done) MaterialTheme.colorScheme.onSurface.copy(alpha = 0.55f) else MaterialTheme.colorScheme.onSurface,
                        textDecoration = if (task.done) TextDecoration.LineThrough else TextDecoration.None,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        TaskOrbitAssistChip(
                            label = task.priority.label,
                            leadingIconColor = priorityColor
                        )
                        Text(
                            text = ProjectDomain.relativeRangeLabel(task.startDate, task.endDate),
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }

                // 关联计划折叠/展开指示
                if (plans.isNotEmpty()) {
                    IconButton(onClick = onToggleExpand) {
                        Icon(
                            imageVector = if (isExpanded) Icons.Filled.KeyboardArrowUp else Icons.Filled.KeyboardArrowDown,
                            contentDescription = "展开计划"
                        )
                    }
                }

                IconButton(onClick = onEdit) {
                    Icon(Icons.Outlined.Edit, contentDescription = "编辑")
                }

                TaskOrbitIconButton(
                    icon = Icons.Outlined.Delete,
                    contentDescription = "删除",
                    onClick = onDelete,
                    danger = true
                )
            }

            // 展开关联的每日计划
            AnimatedVisibility(
                visible = isExpanded,
                enter = fadeIn() + expandVertically(),
                exit = fadeOut() + shrinkVertically()
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(start = 40.dp, top = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Text(
                        text = "关联计划 (${plans.size})",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    plans.forEach { plan ->
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "• ${plan.date} ${plan.startTime}-${plan.endTime}: ${plan.name}",
                                style = MaterialTheme.typography.bodySmall,
                                color = if (plan.done) MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f) else MaterialTheme.colorScheme.onSurface,
                                textDecoration = if (plan.done) TextDecoration.LineThrough else TextDecoration.None,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun MetricStatCard(
    title: String,
    value: String,
    subtitle: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    color: Color
) {
    TaskOrbitCard(
        modifier = Modifier.fillMaxWidth(),
        variant = CardVariant.FILLED,
        shape = ShapeTokens.Large
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .clip(ShapeTokens.Medium)
                    .background(color.copy(alpha = 0.15f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = color,
                    modifier = Modifier.size(26.dp)
                )
            }

            Spacer(modifier = Modifier.width(16.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = title,
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Text(
                    text = value,
                    style = MaterialTheme.typography.headlineMedium,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Text(
                    text = subtitle,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}
