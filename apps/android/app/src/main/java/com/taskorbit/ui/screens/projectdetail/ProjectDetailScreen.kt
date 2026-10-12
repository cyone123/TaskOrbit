package com.taskorbit.ui.screens.projectdetail

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.CheckBox
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.FolderOpen
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.KeyboardArrowUp
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.CalendarToday
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.Edit
import androidx.compose.material.icons.outlined.Folder
import androidx.compose.material.icons.outlined.Repeat
import androidx.compose.material.icons.outlined.Schedule
import androidx.compose.material.icons.outlined.TaskAlt
import androidx.compose.material.icons.outlined.Timer
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.FloatingActionButtonMenu
import androidx.compose.material3.FloatingActionButtonMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SecondaryTabRow
import androidx.compose.material3.Tab
import androidx.compose.material3.Text
import androidx.compose.material3.ToggleFloatingActionButton
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.taskorbit.domain.CalendarModel
import com.taskorbit.domain.ProjectDomain
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.ui.text.font.FontFamily
import com.taskorbit.domain.model.DailyPlan
import com.taskorbit.domain.model.DailyPlanRepeat
import com.taskorbit.domain.model.Priority
import com.taskorbit.domain.model.Task
import com.taskorbit.ui.components.CardVariant
import com.taskorbit.ui.components.ColorPickerRow
import com.taskorbit.ui.components.TaskOrbitAssistChip
import com.taskorbit.ui.components.TaskOrbitBottomSheet
import com.taskorbit.ui.components.TaskOrbitButton
import com.taskorbit.ui.components.TaskOrbitCard
import com.taskorbit.ui.components.TaskOrbitCheckbox
import com.taskorbit.ui.components.TaskOrbitEmptyState
import com.taskorbit.ui.components.TaskOrbitFilterChip
import com.taskorbit.ui.components.TaskOrbitIconButton
import com.taskorbit.ui.components.TaskOrbitProgressBar
import com.taskorbit.ui.components.TaskOrbitTopAppBar
import com.taskorbit.ui.components.TaskOrbitWavyProgressBar
import com.taskorbit.ui.theme.PROJECT_COLOR_MAP
import com.taskorbit.ui.theme.ShapeTokens
import com.taskorbit.ui.theme.isPresetProjectColor
import com.taskorbit.ui.theme.resolveProjectColor
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit

@OptIn(ExperimentalMaterial3Api::class, ExperimentalMaterial3ExpressiveApi::class)
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
    val isPlanFormOpen by viewModel.isPlanFormOpen.collectAsState()

    var isFabMenuExpanded by remember { mutableStateOf(false) }

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
    val accent = resolveProjectColor(currentProject.color, MaterialTheme.colorScheme.primary)

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
            FloatingActionButtonMenu(
                modifier = Modifier.navigationBarsPadding(),
                expanded = isFabMenuExpanded,
                button = {
                    ToggleFloatingActionButton(
                        checked = isFabMenuExpanded,
                        onCheckedChange = { isFabMenuExpanded = it }
                    ) {
                        val rotation by animateFloatAsState(
                            targetValue = if (isFabMenuExpanded) 45f else 0f,
                            animationSpec = spring(
                                dampingRatio = Spring.DampingRatioMediumBouncy,
                                stiffness = Spring.StiffnessMedium
                            ),
                            label = "fabRotation"
                        )
                        Icon(
                            imageVector = Icons.Default.Add,
                            contentDescription = if (isFabMenuExpanded) "关闭菜单" else "新建操作",
                            modifier = Modifier.rotate(rotation)
                        )
                    }
                },
                horizontalAlignment = Alignment.End
            ) {
                FloatingActionButtonMenuItem(
                    onClick = {
                        isFabMenuExpanded = false
                        viewModel.openNewTaskForm()
                    },
                    text = { Text("添加任务") },
                    icon = { Icon(Icons.Filled.CheckBox, contentDescription = null) }
                )
                FloatingActionButtonMenuItem(
                    onClick = {
                        isFabMenuExpanded = false
                        viewModel.openNewPlanForm()
                    },
                    text = { Text("添加每日计划") },
                    icon = { Icon(Icons.Outlined.CalendarMonth, contentDescription = null) }
                )
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
                    TaskOrbitWavyProgressBar(progress = metrics.progress, color = accent)
                }
            }

            // Tab 切换
            SecondaryTabRow(
                selectedTabIndex = when (section) {
                    ProjectDetailSection.TASKS -> 0
                    ProjectDetailSection.PLANS -> 1
                    ProjectDetailSection.STATS -> 2
                },
                modifier = Modifier.fillMaxWidth(),
                containerColor = MaterialTheme.colorScheme.surface
            ) {
                Tab(
                    selected = section == ProjectDetailSection.TASKS,
                    onClick = {
                        isFabMenuExpanded = false
                        viewModel.setSection(ProjectDetailSection.TASKS)
                    },
                    text = { Text("任务列表 (${tasks.size})") }
                )
                Tab(
                    selected = section == ProjectDetailSection.PLANS,
                    onClick = {
                        isFabMenuExpanded = false
                        viewModel.setSection(ProjectDetailSection.PLANS)
                    },
                    text = { Text("每日计划 (${plans.size})") }
                )
                Tab(
                    selected = section == ProjectDetailSection.STATS,
                    onClick = {
                        isFabMenuExpanded = false
                        viewModel.setSection(ProjectDetailSection.STATS)
                    },
                    text = { Text("项目概览") }
                )
            }

            // 内容列表
            when (section) {
                ProjectDetailSection.TASKS -> {
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
                                    onAddPlan = { viewModel.openNewPlanForm(presetTaskId = task.id) },
                                    onTogglePlanDone = viewModel::togglePlan,
                                    onEditPlan = viewModel::openEditPlanForm,
                                    onDeletePlan = viewModel::removePlan,
                                    modifier = Modifier.animateItem()
                                )
                            }
                        }
                    }
                }
                ProjectDetailSection.PLANS -> {
                    if (plans.isEmpty()) {
                        TaskOrbitEmptyState(
                            icon = Icons.Outlined.CalendarMonth,
                            title = "暂无每日计划",
                            description = "点击右下角按钮为该项目创建每日计划。",
                            modifier = Modifier.fillMaxSize()
                        )
                    } else {
                        val plansByDate = remember(plans) {
                            plans.sortedWith(compareBy<DailyPlan> { it.date }.thenBy { it.startTime })
                                .groupBy { it.date }
                        }
                        LazyColumn(
                            modifier = Modifier.fillMaxSize(),
                            contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 12.dp, bottom = 88.dp),
                            verticalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            plansByDate.forEach { (date, datePlans) ->
                                item(key = "header_$date") {
                                    PlanDateHeader(
                                        date = date,
                                        totalCount = datePlans.size,
                                        completedCount = datePlans.count { it.done },
                                        modifier = Modifier.padding(top = 6.dp, bottom = 2.dp)
                                    )
                                }
                                items(datePlans, key = { it.id }) { plan ->
                                    val linkedTask = tasks.find { it.id == plan.taskId }
                                    ProjectPlanCard(
                                        plan = plan,
                                        linkedTaskName = linkedTask?.name,
                                        onToggleDone = { done -> viewModel.togglePlan(plan.id, done) },
                                        onEdit = { viewModel.openEditPlanForm(plan) },
                                        onDelete = { viewModel.removePlan(plan.id) },
                                        modifier = Modifier.animateItem()
                                    )
                                }
                            }
                        }
                    }
                }
                ProjectDetailSection.STATS -> {
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
            val scheduled by viewModel.taskScheduled.collectAsState()
            val formError by viewModel.taskFormError.collectAsState()

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

                Row(verticalAlignment = Alignment.CenterVertically) {
                    TaskOrbitCheckbox(checked = scheduled, onCheckedChange = { viewModel.taskScheduled.value = it })
                    Text("安排任务日期", style = MaterialTheme.typography.bodyLarge)
                }
                if (scheduled) Row(
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

                formError?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall) }

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
                    .verticalScroll(rememberScrollState())
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

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("项目主题色", style = MaterialTheme.typography.labelLarge)
                    if (!isPresetProjectColor(color)) {
                        Text(
                            text = color.uppercase(),
                            style = MaterialTheme.typography.labelMedium.copy(fontFamily = FontFamily.Monospace),
                            color = MaterialTheme.colorScheme.primary
                        )
                    }
                }
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
    // 新建 / 编辑每日计划 BottomSheet
    if (isPlanFormOpen) {
        PlanFormBottomSheet(viewModel = viewModel)
    }
}

@OptIn(ExperimentalMaterial3Api::class, ExperimentalMaterial3ExpressiveApi::class)
@Composable
private fun TaskRowItem(
    task: Task,
    plans: List<DailyPlan>,
    isExpanded: Boolean,
    onToggleDone: (Boolean) -> Unit,
    onToggleExpand: () -> Unit,
    onEdit: () -> Unit,
    onDelete: () -> Unit,
    onAddPlan: () -> Unit,
    onTogglePlanDone: (String, Boolean) -> Unit,
    onEditPlan: (DailyPlan) -> Unit,
    onDeletePlan: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    val priorityColor = when (task.priority) {
        Priority.HIGH -> MaterialTheme.colorScheme.error
        Priority.MEDIUM -> Color(0xFFD97706)
        Priority.LOW -> MaterialTheme.colorScheme.outline
    }

    TaskOrbitCard(
        modifier = modifier.fillMaxWidth(),
        variant = CardVariant.FILLED,
        shape = ShapeTokens.Large
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.Top
            ) {
                TaskOrbitCheckbox(
                    checked = task.done,
                    onCheckedChange = onToggleDone,
                    modifier = Modifier.padding(top = 2.dp)
                )

                Spacer(modifier = Modifier.width(10.dp))

                Column(modifier = Modifier.weight(1f)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = task.name,
                            style = MaterialTheme.typography.titleMedium,
                            color = if (task.done) MaterialTheme.colorScheme.onSurface.copy(alpha = 0.55f) else MaterialTheme.colorScheme.onSurface,
                            textDecoration = if (task.done) TextDecoration.LineThrough else TextDecoration.None,
                            maxLines = 2,
                            overflow = TextOverflow.Ellipsis,
                            modifier = Modifier.weight(1f)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        TaskOrbitAssistChip(
                            label = task.priority.label,
                            leadingIconColor = priorityColor
                        )
                    }

                    if (task.description.isNotBlank()) {
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = task.description,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            maxLines = 2,
                            overflow = TextOverflow.Ellipsis
                        )
                    }

                    Spacer(modifier = Modifier.height(6.dp))

                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Outlined.CalendarToday,
                                contentDescription = null,
                                modifier = Modifier.size(13.dp),
                                tint = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Text(
                                text = if (task.startDate == null || task.endDate == null) "未排期"
                                    else ProjectDomain.relativeRangeLabel(task.startDate, task.endDate),
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }

                        if (plans.isNotEmpty()) {
                            val completedCount = plans.count { it.done }
                            Box(
                                modifier = Modifier
                                    .clip(ShapeTokens.Full)
                                    .background(
                                        if (completedCount == plans.size) MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.6f)
                                        else MaterialTheme.colorScheme.surfaceContainerHighest
                                    )
                                    .padding(horizontal = 6.dp, vertical = 2.dp)
                            ) {
                                Text(
                                    text = "$completedCount/${plans.size} 计划",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = if (completedCount == plans.size) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.width(4.dp))

                IconButton(onClick = onEdit, modifier = Modifier.size(36.dp)) {
                    Icon(
                        Icons.Outlined.Edit,
                        contentDescription = "编辑任务",
                        modifier = Modifier.size(18.dp),
                        tint = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }

                TaskOrbitIconButton(
                    icon = Icons.Outlined.Delete,
                    contentDescription = "删除任务",
                    onClick = onDelete,
                    danger = true,
                    modifier = Modifier.size(36.dp)
                )
            }

            // 任务底部的关联计划栏与快捷添加计划按钮
            Spacer(modifier = Modifier.height(10.dp))
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(ShapeTokens.Medium)
                    .background(MaterialTheme.colorScheme.surfaceContainerHigh.copy(alpha = 0.5f))
                    .padding(horizontal = 10.dp, vertical = 6.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                if (plans.isNotEmpty()) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier
                            .clip(ShapeTokens.Small)
                            .clickable(onClick = onToggleExpand)
                            .padding(vertical = 2.dp, horizontal = 4.dp)
                    ) {
                        Icon(
                            imageVector = if (isExpanded) Icons.Filled.KeyboardArrowUp else Icons.Filled.KeyboardArrowDown,
                            contentDescription = if (isExpanded) "收起计划" else "展开计划",
                            modifier = Modifier.size(18.dp),
                            tint = MaterialTheme.colorScheme.primary
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = if (isExpanded) "收起计划 (${plans.size})" else "展开关联计划 (${plans.size})",
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.primary
                        )
                    }
                } else {
                    Text(
                        text = "暂无关联计划",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f)
                    )
                }

                // 快捷为该任务添加计划
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier
                        .clip(ShapeTokens.Small)
                        .clickable(onClick = onAddPlan)
                        .padding(vertical = 2.dp, horizontal = 6.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Add,
                        contentDescription = "添加计划",
                        modifier = Modifier.size(15.dp),
                        tint = MaterialTheme.colorScheme.primary
                    )
                    Spacer(modifier = Modifier.width(3.dp))
                    Text(
                        text = "添加计划",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.primary
                    )
                }
            }

            // 展开的计划列表
            AnimatedVisibility(
                visible = isExpanded && plans.isNotEmpty(),
                enter = fadeIn() + expandVertically(),
                exit = fadeOut() + shrinkVertically()
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 10.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    plans.forEach { plan ->
                        ProjectPlanItem(
                            plan = plan,
                            onToggleDone = { done -> onTogglePlanDone(plan.id, done) },
                            onEdit = { onEditPlan(plan) },
                            onDelete = { onDeletePlan(plan.id) }
                        )
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
private fun ProjectPlanItem(
    plan: DailyPlan,
    onToggleDone: (Boolean) -> Unit,
    onEdit: () -> Unit,
    onDelete: () -> Unit,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .clip(ShapeTokens.Medium)
            .background(
                if (plan.done) MaterialTheme.colorScheme.surfaceContainerLow.copy(alpha = 0.6f)
                else MaterialTheme.colorScheme.surfaceContainerHigh
            )
            .padding(horizontal = 10.dp, vertical = 8.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            TaskOrbitCheckbox(
                checked = plan.done,
                onCheckedChange = onToggleDone
            )

            Spacer(modifier = Modifier.width(8.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = plan.name,
                    style = MaterialTheme.typography.bodyMedium,
                    color = if (plan.done) MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f) else MaterialTheme.colorScheme.onSurface,
                    textDecoration = if (plan.done) TextDecoration.LineThrough else TextDecoration.None,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )

                if (plan.description.isNotBlank()) {
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        text = plan.description,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.8f),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }

                Spacer(modifier = Modifier.height(4.dp))

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    // 时间
                    Box(
                        modifier = Modifier
                            .clip(ShapeTokens.ExtraSmall)
                            .background(MaterialTheme.colorScheme.surfaceContainerHighest)
                            .padding(horizontal = 5.dp, vertical = 2.dp)
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(3.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Outlined.Schedule,
                                contentDescription = null,
                                modifier = Modifier.size(11.dp),
                                tint = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Text(
                                text = "${plan.startTime}-${plan.endTime}",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }

                    // 日期
                    Box(
                        modifier = Modifier
                            .clip(ShapeTokens.ExtraSmall)
                            .background(MaterialTheme.colorScheme.surfaceContainerHighest)
                            .padding(horizontal = 5.dp, vertical = 2.dp)
                    ) {
                        Text(
                            text = formatShortPlanDate(plan.date),
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }

                    // 重复标识
                    if (plan.recurrence.frequency != DailyPlanRepeat.NONE) {
                        Box(
                            modifier = Modifier
                                .clip(ShapeTokens.ExtraSmall)
                                .background(MaterialTheme.colorScheme.tertiaryContainer.copy(alpha = 0.5f))
                                .padding(horizontal = 5.dp, vertical = 2.dp)
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(2.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Outlined.Repeat,
                                    contentDescription = null,
                                    modifier = Modifier.size(11.dp),
                                    tint = MaterialTheme.colorScheme.onTertiaryContainer
                                )
                                Text(
                                    text = plan.recurrence.frequency.label,
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.onTertiaryContainer
                                )
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.width(4.dp))

            IconButton(
                onClick = onEdit,
                modifier = Modifier.size(28.dp)
            ) {
                Icon(
                    imageVector = Icons.Outlined.Edit,
                    contentDescription = "编辑计划",
                    modifier = Modifier.size(15.dp),
                    tint = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            IconButton(
                onClick = onDelete,
                modifier = Modifier.size(28.dp)
            ) {
                Icon(
                    imageVector = Icons.Outlined.Delete,
                    contentDescription = "删除计划",
                    modifier = Modifier.size(15.dp),
                    tint = MaterialTheme.colorScheme.error.copy(alpha = 0.8f)
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
private fun ProjectPlanCard(
    plan: DailyPlan,
    linkedTaskName: String?,
    onToggleDone: (Boolean) -> Unit,
    onEdit: () -> Unit,
    onDelete: () -> Unit,
    modifier: Modifier = Modifier
) {
    val durationMinutes = calculateDurationMinutes(plan.startTime, plan.endTime)

    TaskOrbitCard(
        modifier = modifier.fillMaxWidth(),
        variant = CardVariant.FILLED,
        shape = ShapeTokens.Large
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            verticalAlignment = Alignment.Top
        ) {
            TaskOrbitCheckbox(
                checked = plan.done,
                onCheckedChange = onToggleDone,
                modifier = Modifier.padding(top = 2.dp)
            )

            Spacer(modifier = Modifier.width(10.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = plan.name,
                    style = MaterialTheme.typography.titleMedium,
                    color = if (plan.done) MaterialTheme.colorScheme.onSurface.copy(alpha = 0.55f) else MaterialTheme.colorScheme.onSurface,
                    textDecoration = if (plan.done) TextDecoration.LineThrough else TextDecoration.None,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )

                if (plan.description.isNotBlank()) {
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = plan.description,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                }

                Spacer(modifier = Modifier.height(8.dp))

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    // 时间与时长
                    Box(
                        modifier = Modifier
                            .clip(ShapeTokens.Small)
                            .background(MaterialTheme.colorScheme.surfaceContainerHighest)
                            .padding(horizontal = 8.dp, vertical = 4.dp)
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Outlined.Schedule,
                                contentDescription = null,
                                modifier = Modifier.size(13.dp),
                                tint = MaterialTheme.colorScheme.primary
                            )
                            Text(
                                text = "${plan.startTime} - ${plan.endTime}" + if (durationMinutes > 0) " (${durationMinutes}分)" else "",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                        }
                    }

                    // 关联任务
                    Box(
                        modifier = Modifier
                            .clip(ShapeTokens.Small)
                            .background(
                                if (linkedTaskName != null) MaterialTheme.colorScheme.secondaryContainer.copy(alpha = 0.5f)
                                else MaterialTheme.colorScheme.surfaceContainerHigh
                            )
                            .padding(horizontal = 8.dp, vertical = 4.dp)
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Icon(
                                imageVector = if (linkedTaskName != null) Icons.Outlined.TaskAlt else Icons.Outlined.Folder,
                                contentDescription = null,
                                modifier = Modifier.size(13.dp),
                                tint = if (linkedTaskName != null) MaterialTheme.colorScheme.secondary else MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Text(
                                text = linkedTaskName ?: "项目独立计划",
                                style = MaterialTheme.typography.labelSmall,
                                color = if (linkedTaskName != null) MaterialTheme.colorScheme.onSecondaryContainer else MaterialTheme.colorScheme.onSurfaceVariant,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                    }

                    // 重复标识
                    if (plan.recurrence.frequency != DailyPlanRepeat.NONE) {
                        Box(
                            modifier = Modifier
                                .clip(ShapeTokens.Small)
                                .background(MaterialTheme.colorScheme.tertiaryContainer.copy(alpha = 0.5f))
                                .padding(horizontal = 8.dp, vertical = 4.dp)
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(4.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Outlined.Repeat,
                                    contentDescription = null,
                                    modifier = Modifier.size(13.dp),
                                    tint = MaterialTheme.colorScheme.onTertiaryContainer
                                )
                                Text(
                                    text = plan.recurrence.frequency.label,
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.onTertiaryContainer
                                )
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.width(6.dp))

            IconButton(onClick = onEdit, modifier = Modifier.size(36.dp)) {
                Icon(
                    Icons.Outlined.Edit,
                    contentDescription = "编辑计划",
                    modifier = Modifier.size(18.dp),
                    tint = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            TaskOrbitIconButton(
                icon = Icons.Outlined.Delete,
                contentDescription = "删除计划",
                onClick = onDelete,
                danger = true,
                modifier = Modifier.size(36.dp)
            )
        }
    }
}

@Composable
private fun PlanDateHeader(
    date: String,
    totalCount: Int,
    completedCount: Int,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Icon(
                imageVector = Icons.Outlined.CalendarMonth,
                contentDescription = null,
                modifier = Modifier.size(18.dp),
                tint = MaterialTheme.colorScheme.primary
            )
            Text(
                text = formatRelativeDate(date),
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onSurface
            )
        }

        Box(
            modifier = Modifier
                .clip(ShapeTokens.Full)
                .background(MaterialTheme.colorScheme.surfaceContainerHighest)
                .padding(horizontal = 8.dp, vertical = 2.dp)
        ) {
            Text(
                text = "$completedCount/$totalCount 完成",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun PlanFormBottomSheet(
    viewModel: ProjectDetailViewModel
) {
    TaskOrbitBottomSheet(
        onDismissRequest = viewModel::closePlanForm
    ) {
        val name by viewModel.planName.collectAsState()
        val description by viewModel.planDescription.collectAsState()
        val date by viewModel.planDate.collectAsState()
        val startTime by viewModel.planStartTime.collectAsState()
        val endTime by viewModel.planEndTime.collectAsState()
        val selectedTaskId by viewModel.planTaskId.collectAsState()
        val repeat by viewModel.planRepeat.collectAsState()
        val repeatCount by viewModel.planRepeatCount.collectAsState()

        val tasks by viewModel.tasks.collectAsState()

        val durationMinutes = calculateDurationMinutes(startTime, endTime)

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp, vertical = 16.dp)
        ) {
            Text(
                text = if (viewModel.editingPlanId != null) "编辑每日计划" else "添加每日计划",
                style = MaterialTheme.typography.titleLarge
            )

            Spacer(modifier = Modifier.height(16.dp))

            OutlinedTextField(
                value = name,
                onValueChange = { viewModel.planName.value = it },
                label = { Text("计划名称") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(12.dp))

            OutlinedTextField(
                value = description,
                onValueChange = { viewModel.planDescription.value = it },
                label = { Text("计划描述（可选）") },
                maxLines = 2,
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(14.dp))

            // 关联任务选择
            Text(
                text = "关联任务（可选）",
                style = MaterialTheme.typography.labelLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(modifier = Modifier.height(6.dp))

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                TaskOrbitFilterChip(
                    selected = selectedTaskId == null,
                    onClick = { viewModel.planTaskId.value = null },
                    label = "无关联任务 (项目通用)"
                )
                tasks.forEach { task ->
                    TaskOrbitFilterChip(
                        selected = selectedTaskId == task.id,
                        onClick = { viewModel.planTaskId.value = task.id },
                        label = task.name
                    )
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // 日期输入
            OutlinedTextField(
                value = date,
                onValueChange = { viewModel.planDate.value = it },
                label = { Text("计划日期 (YYYY-MM-DD)") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(12.dp))

            // 开始时间与结束时间
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                OutlinedTextField(
                    value = startTime,
                    onValueChange = { viewModel.planStartTime.value = it },
                    label = { Text("开始时间 (HH:mm)") },
                    singleLine = true,
                    modifier = Modifier.weight(1f)
                )
                OutlinedTextField(
                    value = endTime,
                    onValueChange = { viewModel.planEndTime.value = it },
                    label = { Text("结束时间 (HH:mm)") },
                    singleLine = true,
                    modifier = Modifier.weight(1f)
                )
            }

            if (durationMinutes > 0) {
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "预计耗时: $durationMinutes 分钟",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.primary
                )
            }

            Spacer(modifier = Modifier.height(14.dp))

            // 重复规则
            Text(
                text = "重复设置",
                style = MaterialTheme.typography.labelLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(modifier = Modifier.height(6.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                DailyPlanRepeat.entries.forEach { r ->
                    TaskOrbitFilterChip(
                        selected = repeat == r,
                        onClick = { viewModel.planRepeat.value = r },
                        label = r.label,
                        modifier = Modifier.weight(1f)
                    )
                }
            }

            if (repeat != DailyPlanRepeat.NONE) {
                Spacer(modifier = Modifier.height(10.dp))
                OutlinedTextField(
                    value = repeatCount,
                    onValueChange = { viewModel.planRepeatCount.value = it },
                    label = { Text("重复次数") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
            }

            Spacer(modifier = Modifier.height(24.dp))

            TaskOrbitButton(
                text = if (viewModel.editingPlanId != null) "保存修改" else "创建计划",
                onClick = viewModel::submitPlan,
                modifier = Modifier.fillMaxWidth(),
                enabled = name.isNotBlank()
            )

            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}

private fun formatRelativeDate(isoDate: String): String {
    return try {
        val date = LocalDate.parse(isoDate)
        val today = LocalDate.now()
        val daysBetween = ChronoUnit.DAYS.between(today, date)
        when (daysBetween) {
            0L -> "今天 · ${date.format(DateTimeFormatter.ofPattern("M月d日"))}"
            1L -> "明天 · ${date.format(DateTimeFormatter.ofPattern("M月d日"))}"
            -1L -> "昨天 · ${date.format(DateTimeFormatter.ofPattern("M月d日"))}"
            in 2L..6L -> date.format(DateTimeFormatter.ofPattern("M月d日 EEEE"))
            else -> date.format(DateTimeFormatter.ofPattern("yyyy年M月d日"))
        }
    } catch (_: Exception) {
        isoDate
    }
}

private fun formatShortPlanDate(isoDate: String): String {
    return try {
        val date = LocalDate.parse(isoDate)
        val today = LocalDate.now()
        val daysBetween = ChronoUnit.DAYS.between(today, date)
        when (daysBetween) {
            0L -> "今天"
            1L -> "明天"
            -1L -> "昨天"
            else -> date.format(DateTimeFormatter.ofPattern("M/d"))
        }
    } catch (_: Exception) {
        isoDate
    }
}

private fun calculateDurationMinutes(startTime: String, endTime: String): Int {
    val startMin = CalendarModel.timeToMinutes(startTime)
    val endMin = CalendarModel.timeToMinutes(endTime)
    return (endMin - startMin).coerceAtLeast(0)
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
