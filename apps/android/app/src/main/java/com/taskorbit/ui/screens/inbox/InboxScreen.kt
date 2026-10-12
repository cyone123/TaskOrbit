package com.taskorbit.ui.screens.inbox

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateContentSize
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
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
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.clickable
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.Assignment
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowUpward
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.CheckBox
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.outlined.CalendarToday
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.Folder
import androidx.compose.material.icons.outlined.Inbox
import androidx.compose.material.icons.outlined.Timer
import androidx.compose.material.icons.outlined.Tune
import androidx.compose.material3.ButtonGroup
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.FloatingActionButtonMenu
import androidx.compose.material3.FloatingActionButtonMenuItem
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.ToggleFloatingActionButton
import androidx.compose.material3.TonalToggleButton
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.taskorbit.domain.model.InboxItem
import com.taskorbit.domain.model.Priority
import com.taskorbit.domain.model.Project
import com.taskorbit.domain.model.Task
import kotlinx.coroutines.launch
import com.taskorbit.ui.components.ButtonVariant
import com.taskorbit.ui.components.CardVariant
import com.taskorbit.ui.components.IconButtonVariant
import com.taskorbit.ui.components.TaskOrbitBottomSheet
import com.taskorbit.ui.components.TaskOrbitButton
import com.taskorbit.ui.components.TaskOrbitCard
import com.taskorbit.ui.components.TaskOrbitCheckbox
import com.taskorbit.ui.components.TaskOrbitEmptyState
import com.taskorbit.ui.components.TaskOrbitFilterChip
import com.taskorbit.ui.components.TaskOrbitIconButton
import com.taskorbit.ui.components.TaskOrbitTopAppBar
import com.taskorbit.ui.theme.PROJECT_COLOR_MAP
import com.taskorbit.ui.theme.ShapeTokens
import com.taskorbit.ui.theme.bouncyClickable
import com.taskorbit.ui.theme.resolveProjectColor
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

private fun formatItemDate(timestamp: Long): String {
    val date = Date(timestamp)
    val cal = Calendar.getInstance()
    val todayYear = cal.get(Calendar.YEAR)
    val todayDay = cal.get(Calendar.DAY_OF_YEAR)

    cal.time = date
    val itemYear = cal.get(Calendar.YEAR)
    val itemDay = cal.get(Calendar.DAY_OF_YEAR)

    return when {
        todayYear == itemYear && todayDay == itemDay -> "今天"
        todayYear == itemYear && todayDay - itemDay == 1 -> "昨天"
        todayYear == itemYear -> SimpleDateFormat("M月d日", Locale.CHINA).format(date)
        else -> SimpleDateFormat("yyyy年M月d日", Locale.CHINA).format(date)
    }
}

@OptIn(ExperimentalMaterial3Api::class, ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun InboxScreen(
    onNavigateToPomodoro: (() -> Unit)? = null,
    viewModel: InboxViewModel = viewModel()
) {
    val items by viewModel.inboxItems.collectAsState()
    val projects by viewModel.projects.collectAsState()
    val tasks by viewModel.tasks.collectAsState()
    val pendingCount by viewModel.pendingCount.collectAsState()
    val title by viewModel.title.collectAsState()
    val description by viewModel.description.collectAsState()
    val draftProjectId by viewModel.draftProjectId.collectAsState()
    val statusFilter by viewModel.statusFilter.collectAsState()
    val projectFilter by viewModel.projectFilter.collectAsState()
    val isFocused by viewModel.isFocused.collectAsState()
    val editingItem by viewModel.editingItem.collectAsState()

    val snackbarHostState = remember { SnackbarHostState() }
    val coroutineScope = rememberCoroutineScope()
    var actionTargetItem by remember { mutableStateOf<InboxItem?>(null) }
    var convertToTaskItem by remember { mutableStateOf<InboxItem?>(null) }
    var convertToPlanItem by remember { mutableStateOf<InboxItem?>(null) }

    val titleFocusRequester = remember { FocusRequester() }
    var isFabMenuExpanded by remember { mutableStateOf(false) }
    var showProjectFilterSheet by remember { mutableStateOf(false) }

    val filteredItems = remember(items, statusFilter, projectFilter) {
        items.filter { item ->
            val statusMatch = when (statusFilter) {
                InboxStatusFilter.ALL -> true
                InboxStatusFilter.PENDING -> !item.done
                InboxStatusFilter.DONE -> item.done
            }
            val projectMatch = when (projectFilter) {
                "all", null -> true
                "none" -> item.projectId == null
                else -> item.projectId == projectFilter
            }
            statusMatch && projectMatch
        }
    }

    val projectCounts = remember(items) {
        items.groupBy { it.projectId }.mapValues { it.value.size }
    }
    val unassignedCount = remember(items) { items.count { it.projectId == null } }

    Scaffold(
        topBar = {
            TaskOrbitTopAppBar(
                title = "收件箱",
                subtitle = "${pendingCount} 条待处理",
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                    titleContentColor = MaterialTheme.colorScheme.onSurface
                )
            )
        },
        snackbarHost = { SnackbarHost(hostState = snackbarHostState) },
        floatingActionButton = {
            FloatingActionButtonMenu(
                modifier = Modifier
                    .navigationBarsPadding()
                    .padding(bottom = 76.dp),
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
                        viewModel.onFocusChange(true)
                        runCatching { titleFocusRequester.requestFocus() }
                    },
                    text = { Text("新建待办") },
                    icon = { Icon(Icons.Filled.CheckBox, contentDescription = null) }
                )
                FloatingActionButtonMenuItem(
                    onClick = {
                        isFabMenuExpanded = false
                        showProjectFilterSheet = true
                    },
                    text = { Text("项目筛选") },
                    icon = { Icon(Icons.Outlined.Tune, contentDescription = null) }
                )
                FloatingActionButtonMenuItem(
                    onClick = {
                        isFabMenuExpanded = false
                        onNavigateToPomodoro?.invoke()
                    },
                    text = { Text("开启专注") },
                    icon = { Icon(Icons.Outlined.Timer, contentDescription = null) }
                )
            }
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            // 快速记录输入卡片
            InboxComposerCard(
                title = title,
                description = description,
                draftProjectId = draftProjectId,
                projects = projects,
                isFocused = isFocused,
                onTitleChange = viewModel::onTitleChange,
                onDescriptionChange = viewModel::onDescriptionChange,
                onDraftProjectChange = viewModel::onDraftProjectChange,
                onFocusChange = viewModel::onFocusChange,
                onSubmit = viewModel::submit,
                titleFocusRequester = titleFocusRequester,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp)
            )

            // 状态过滤按键组
            ButtonGroup(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 4.dp),
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                InboxStatusFilter.entries.forEach { filter ->
                    val count = when (filter) {
                        InboxStatusFilter.ALL -> items.size
                        InboxStatusFilter.PENDING -> items.count { !it.done }
                        InboxStatusFilter.DONE -> items.count { it.done }
                    }
                    TonalToggleButton(
                        checked = statusFilter == filter,
                        onCheckedChange = { viewModel.onStatusFilterChange(filter) },
                        modifier = Modifier.weight(1f)
                    ) {
                        Text(
                            text = "${filter.label} $count",
                            style = MaterialTheme.typography.labelSmall,
                            maxLines = 1
                        )
                    }
                }
            }

            // 当应用了项目筛选时，展示当前筛选项目徽标及清除按钮
            if (projectFilter != "all" && projectFilter != null) {
                val filterProjectName = remember(projectFilter, projects) {
                    if (projectFilter == "none") "未关联项目"
                    else projects.find { it.id == projectFilter }?.name ?: "已选项目"
                }
                val primaryColor = MaterialTheme.colorScheme.primary
                val filterColor = remember(projectFilter, projects, primaryColor) {
                    if (projectFilter == "none") primaryColor
                    else {
                        val p = projects.find { it.id == projectFilter }
                        p?.let { resolveProjectColor(it.color, primaryColor) } ?: primaryColor
                    }
                }
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 4.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Surface(
                        shape = CircleShape,
                        color = filterColor.copy(alpha = 0.12f),
                        border = BorderStroke(1.dp, filterColor.copy(alpha = 0.35f))
                    ) {
                        Row(
                            modifier = Modifier.padding(start = 10.dp, end = 4.dp, top = 2.dp, bottom = 2.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(8.dp)
                                    .clip(CircleShape)
                                    .background(filterColor)
                            )
                            Text(
                                text = "项目: $filterProjectName",
                                style = MaterialTheme.typography.labelMedium,
                                color = filterColor
                            )
                            IconButton(
                                onClick = { viewModel.onProjectFilterChange("all") },
                                modifier = Modifier.size(24.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Close,
                                    contentDescription = "清除项目筛选",
                                    tint = filterColor,
                                    modifier = Modifier.size(16.dp)
                                )
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(4.dp))

            // 列表区域
            if (filteredItems.isEmpty()) {
                val emptyDesc = when {
                    items.isEmpty() -> "把脑海里的事先记下来，之后再慢慢整理。"
                    statusFilter == InboxStatusFilter.PENDING -> "目前没有未完成的待办事项，太棒了！"
                    statusFilter == InboxStatusFilter.DONE -> "暂无已完成项，继续加油。"
                    else -> "没有符合当前筛选条件的待办事项。"
                }
                TaskOrbitEmptyState(
                    icon = Icons.Outlined.Inbox,
                    title = "暂无内容",
                    description = emptyDesc,
                    modifier = Modifier.fillMaxSize()
                )
            } else {
                val projectMap = remember(projects) { projects.associateBy { it.id } }
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(
                        start = 16.dp,
                        top = 8.dp,
                        end = 16.dp,
                        bottom = 110.dp
                    ),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    items(
                        items = filteredItems,
                        key = { it.id }
                    ) { item ->
                        InboxItemRow(
                            item = item,
                            project = item.projectId?.let { projectMap[it] },
                            onToggleDone = { done -> viewModel.toggleDone(item.id, done) },
                            onClick = { viewModel.startEditing(item) },
                            onMoreActions = { actionTargetItem = item },
                            modifier = Modifier.animateItem()
                        )
                    }
                }
            }
        }
    }

    // 项目筛选 BottomSheet
    if (showProjectFilterSheet) {
        InboxProjectFilterBottomSheet(
            projects = projects,
            projectCounts = projectCounts,
            unassignedCount = unassignedCount,
            selectedProjectFilter = projectFilter,
            onDismiss = { showProjectFilterSheet = false },
            onSelect = { selected ->
                viewModel.onProjectFilterChange(selected)
            }
        )
    }

    // 编辑待办 BottomSheet
    editingItem?.let { item ->
        InboxEditBottomSheet(
            item = item,
            projects = projects,
            onDismiss = { viewModel.dismissEditing() },
            onSave = { newTitle, newDescription, newProjectId ->
                viewModel.saveEditing(item.id, newTitle, newDescription, newProjectId)
            }
        )
    }

    // 更多操作 BottomSheet
    actionTargetItem?.let { item ->
        InboxItemActionsBottomSheet(
            item = item,
            onDismiss = { actionTargetItem = null },
            onConvertToTask = {
                actionTargetItem = null
                convertToTaskItem = item
            },
            onConvertToPlan = {
                actionTargetItem = null
                convertToPlanItem = item
            },
            onDelete = {
                actionTargetItem = null
                viewModel.removeItem(item.id)
                coroutineScope.launch {
                    snackbarHostState.showSnackbar("待办已删除")
                }
            }
        )
    }

    // 转为任务 BottomSheet
    convertToTaskItem?.let { item ->
        InboxConvertToTaskBottomSheet(
            item = item,
            projects = projects,
            onDismiss = { convertToTaskItem = null },
            onConvert = { projectId, name, description, startDate, endDate, priority ->
                viewModel.convertToTask(
                    inboxItemId = item.id,
                    projectId = projectId,
                    name = name,
                    description = description,
                    startDate = startDate,
                    endDate = endDate,
                    priority = priority
                )
                convertToTaskItem = null
                coroutineScope.launch {
                    snackbarHostState.showSnackbar("已将待办转为任务「$name」")
                }
            }
        )
    }

    // 转为每日计划 BottomSheet
    convertToPlanItem?.let { item ->
        InboxConvertToDailyPlanBottomSheet(
            item = item,
            projects = projects,
            tasks = tasks,
            onDismiss = { convertToPlanItem = null },
            onConvert = { projectId, taskId, name, description, date, startTime, endTime ->
                viewModel.convertToDailyPlan(
                    inboxItemId = item.id,
                    projectId = projectId,
                    taskId = taskId,
                    name = name,
                    description = description,
                    date = date,
                    startTime = startTime,
                    endTime = endTime
                )
                convertToPlanItem = null
                coroutineScope.launch {
                    snackbarHostState.showSnackbar("已将待办转为每日计划「$name」")
                }
            }
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun InboxProjectFilterBottomSheet(
    projects: List<Project>,
    projectCounts: Map<String?, Int>,
    unassignedCount: Int,
    selectedProjectFilter: String?,
    onDismiss: () -> Unit,
    onSelect: (String) -> Unit
) {
    TaskOrbitBottomSheet(
        onDismissRequest = onDismiss
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 8.dp)
        ) {
            Text(
                text = "按项目筛选",
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.onSurface
            )

            Spacer(modifier = Modifier.height(16.dp))

            ProjectFilterOptionItem(
                title = "全部项目",
                count = null,
                color = null,
                isSelected = selectedProjectFilter == "all" || selectedProjectFilter == null,
                onClick = {
                    onSelect("all")
                    onDismiss()
                }
            )

            ProjectFilterOptionItem(
                title = "未关联项目",
                count = unassignedCount,
                color = null,
                isSelected = selectedProjectFilter == "none",
                onClick = {
                    onSelect("none")
                    onDismiss()
                }
            )

            if (projects.isNotEmpty()) {
                Spacer(modifier = Modifier.height(8.dp))
                HorizontalDivider(
                    color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f),
                    modifier = Modifier.padding(vertical = 4.dp)
                )
                Spacer(modifier = Modifier.height(8.dp))

                projects.forEach { project ->
                    val count = projectCounts[project.id] ?: 0
                    val color = resolveProjectColor(project.color, MaterialTheme.colorScheme.primary)
                    ProjectFilterOptionItem(
                        title = project.name,
                        count = count,
                        color = color,
                        isSelected = selectedProjectFilter == project.id,
                        onClick = {
                            onSelect(project.id)
                            onDismiss()
                        }
                    )
                }
            }

            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}

@Composable
private fun ProjectFilterOptionItem(
    title: String,
    count: Int?,
    color: Color?,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .bouncyClickable(onClick = onClick),
        shape = ShapeTokens.Medium,
        color = if (isSelected) MaterialTheme.colorScheme.secondaryContainer else Color.Transparent
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 14.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            if (color != null) {
                Box(
                    modifier = Modifier
                        .size(10.dp)
                        .clip(CircleShape)
                        .background(color)
                )
                Spacer(modifier = Modifier.width(12.dp))
            } else {
                Icon(
                    imageVector = Icons.Outlined.Folder,
                    contentDescription = null,
                    tint = if (isSelected) MaterialTheme.colorScheme.onSecondaryContainer else MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.size(18.dp)
                )
                Spacer(modifier = Modifier.width(12.dp))
            }

            Text(
                text = title,
                style = MaterialTheme.typography.bodyLarge,
                color = if (isSelected) MaterialTheme.colorScheme.onSecondaryContainer else MaterialTheme.colorScheme.onSurface,
                modifier = Modifier.weight(1f)
            )

            if (count != null) {
                Text(
                    text = "$count 条",
                    style = MaterialTheme.typography.labelMedium,
                    color = if (isSelected) MaterialTheme.colorScheme.onSecondaryContainer else MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            if (isSelected) {
                Spacer(modifier = Modifier.width(8.dp))
                Icon(
                    imageVector = Icons.Default.Check,
                    contentDescription = "已选中",
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.size(20.dp)
                )
            }
        }
    }
}

@Composable
private fun InboxComposerCard(
    title: String,
    description: String,
    draftProjectId: String?,
    projects: List<Project>,
    isFocused: Boolean,
    onTitleChange: (String) -> Unit,
    onDescriptionChange: (String) -> Unit,
    onDraftProjectChange: (String?) -> Unit,
    onFocusChange: (Boolean) -> Unit,
    onSubmit: () -> Unit,
    modifier: Modifier = Modifier,
    titleFocusRequester: FocusRequester? = null
) {
    var isTitleFocused by remember { mutableStateOf(false) }
    var isDescriptionFocused by remember { mutableStateOf(false) }
    val descriptionFocusRequester = remember { FocusRequester() }
    val focusManager = LocalFocusManager.current

    val isExpanded = isFocused || isTitleFocused || isDescriptionFocused || title.isNotEmpty() || description.isNotEmpty() || draftProjectId != null

    val handleDone = {
        if (title.isNotBlank()) {
            onSubmit()
            focusManager.clearFocus()
        }
    }

    Column(modifier = modifier) {
        TaskOrbitCard(
            variant = CardVariant.FILLED,
            shape = ShapeTokens.Large,
            modifier = Modifier
                .fillMaxWidth()
                .animateContentSize(
                    animationSpec = spring(
                        dampingRatio = Spring.DampingRatioNoBouncy,
                        stiffness = Spring.StiffnessMediumLow
                    )
                )
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(MaterialTheme.colorScheme.surfaceContainerHigh)
                    .padding(horizontal = 14.dp, vertical = 10.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    val titleModifier = Modifier
                        .weight(1f)
                        .then(
                            if (titleFocusRequester != null) Modifier.focusRequester(titleFocusRequester) else Modifier
                        )
                        .onFocusChanged { state ->
                            if (isTitleFocused != state.isFocused) {
                                isTitleFocused = state.isFocused
                                onFocusChange(state.isFocused || isDescriptionFocused)
                            }
                        }

                    OutlinedTextField(
                        value = title,
                        onValueChange = onTitleChange,
                        placeholder = {
                            Text(
                                text = "想做什么？",
                                style = MaterialTheme.typography.bodyLarge,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        },
                        modifier = titleModifier,
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(
                            imeAction = ImeAction.Next
                        ),
                        keyboardActions = KeyboardActions(
                            onNext = {
                                runCatching { descriptionFocusRequester.requestFocus() }
                            }
                        ),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = Color.Transparent,
                            unfocusedBorderColor = Color.Transparent,
                            focusedContainerColor = Color.Transparent,
                            unfocusedContainerColor = Color.Transparent
                        )
                    )

                    Spacer(modifier = Modifier.width(8.dp))

                    TaskOrbitIconButton(
                        icon = Icons.Filled.ArrowUpward,
                        contentDescription = "添加待办",
                        onClick = handleDone,
                        variant = IconButtonVariant.FILLED,
                        enabled = title.isNotBlank()
                    )
                }

                AnimatedVisibility(
                    visible = isExpanded,
                    enter = fadeIn() + expandVertically(),
                    exit = fadeOut() + shrinkVertically()
                ) {
                    Column(modifier = Modifier.fillMaxWidth()) {
                        Spacer(modifier = Modifier.height(6.dp))
                        OutlinedTextField(
                            value = description,
                            onValueChange = onDescriptionChange,
                            placeholder = {
                                Text(
                                    text = "添加详细描述（可选）…",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            },
                            modifier = Modifier
                                .fillMaxWidth()
                                .focusRequester(descriptionFocusRequester)
                                .onFocusChanged { state ->
                                    if (isDescriptionFocused != state.isFocused) {
                                        isDescriptionFocused = state.isFocused
                                        onFocusChange(isTitleFocused || state.isFocused)
                                    }
                                },
                            minLines = 2,
                            maxLines = 4,
                            keyboardOptions = KeyboardOptions(
                                imeAction = ImeAction.Default
                            ),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = Color.Transparent,
                                unfocusedBorderColor = Color.Transparent,
                                focusedContainerColor = Color.Transparent,
                                unfocusedContainerColor = Color.Transparent
                            )
                        )

                        if (projects.isNotEmpty()) {
                            Spacer(modifier = Modifier.height(8.dp))
                            LazyRow(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(6.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                item {
                                    TaskOrbitFilterChip(
                                        selected = draftProjectId == null,
                                        onClick = { onDraftProjectChange(null) },
                                        label = "无关联项目"
                                    )
                                }
                                items(
                                    items = projects,
                                    key = { it.id }
                                ) { project ->
                                    TaskOrbitFilterChip(
                                        selected = draftProjectId == project.id,
                                        onClick = { onDraftProjectChange(project.id) },
                                        label = project.name,
                                        leadingDotColor = resolveProjectColor(project.color, MaterialTheme.colorScheme.primary)
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }

        AnimatedVisibility(
            visible = !isExpanded,
            enter = fadeIn() + expandVertically(),
            exit = fadeOut() + shrinkVertically()
        ) {
            Text(
                text = "输入标题与可选描述，可选择关联项目",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(start = 16.dp, top = 4.dp)
            )
        }
    }
}

@Composable
private fun InboxItemRow(
    item: InboxItem,
    project: Project?,
    onToggleDone: (Boolean) -> Unit,
    onClick: () -> Unit,
    onMoreActions: () -> Unit,
    modifier: Modifier = Modifier
) {
    val projectColor = project?.let { resolveProjectColor(it.color, MaterialTheme.colorScheme.primary) }

    TaskOrbitCard(
        modifier = modifier
            .fillMaxWidth()
            .bouncyClickable(onClick = onClick),
        variant = CardVariant.ELEVATED,
        shape = ShapeTokens.Medium
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 12.dp),
            verticalAlignment = Alignment.Top
        ) {
            // 左侧勾选框
            TaskOrbitCheckbox(
                checked = item.done,
                onCheckedChange = onToggleDone,
                modifier = Modifier.padding(top = 2.dp)
            )

            Spacer(modifier = Modifier.width(10.dp))

            // 中间文本与标签
            Column(
                modifier = Modifier.weight(1f)
            ) {
                val itemTitle = item.title.ifEmpty { item.content }
                Text(
                    text = itemTitle,
                    style = MaterialTheme.typography.bodyLarge,
                    color = if (item.done) {
                        MaterialTheme.colorScheme.onSurface.copy(alpha = 0.55f)
                    } else {
                        MaterialTheme.colorScheme.onSurface
                    },
                    textDecoration = if (item.done) TextDecoration.LineThrough else TextDecoration.None,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )

                if (item.description.isNotBlank()) {
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        text = item.description,
                        style = MaterialTheme.typography.bodySmall,
                        color = if (item.done) {
                            MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f)
                        } else {
                            MaterialTheme.colorScheme.onSurfaceVariant
                        },
                        maxLines = 3,
                        overflow = TextOverflow.Ellipsis
                    )
                }

                Spacer(modifier = Modifier.height(6.dp))

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    if (project != null && projectColor != null) {
                        Surface(
                            shape = CircleShape,
                            color = projectColor.copy(alpha = 0.12f),
                            border = BorderStroke(1.dp, projectColor.copy(alpha = 0.35f))
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(4.dp)
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(6.dp)
                                        .clip(CircleShape)
                                        .background(projectColor)
                                )
                                Text(
                                    text = project.name,
                                    style = MaterialTheme.typography.labelSmall,
                                    color = projectColor
                                )
                            }
                        }
                    }

                    Text(
                        text = formatItemDate(item.updatedAt),
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            Spacer(modifier = Modifier.width(6.dp))

            // 更多操作
            TaskOrbitIconButton(
                icon = Icons.Default.MoreVert,
                contentDescription = "更多操作",
                onClick = onMoreActions,
                variant = IconButtonVariant.STANDARD,
                modifier = Modifier.padding(top = 2.dp)
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun InboxEditBottomSheet(
    item: InboxItem,
    projects: List<Project>,
    onDismiss: () -> Unit,
    onSave: (title: String, description: String, projectId: String?) -> Unit
) {
    var editTitle by remember(item) { mutableStateOf(item.title.ifEmpty { item.content }) }
    var editDescription by remember(item) { mutableStateOf(item.description) }
    var selectedProjectId by remember(item) { mutableStateOf(item.projectId) }

    TaskOrbitBottomSheet(
        onDismissRequest = onDismiss
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 8.dp)
        ) {
            Text(
                text = "编辑待办",
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.onSurface
            )

            Spacer(modifier = Modifier.height(16.dp))

            OutlinedTextField(
                value = editTitle,
                onValueChange = { editTitle = it },
                label = { Text("待办标题") },
                placeholder = { Text("写下待办标题…") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                shape = ShapeTokens.Medium
            )

            Spacer(modifier = Modifier.height(12.dp))

            OutlinedTextField(
                value = editDescription,
                onValueChange = { editDescription = it },
                label = { Text("待办描述（可选）") },
                placeholder = { Text("添加详细描述…") },
                modifier = Modifier.fillMaxWidth(),
                minLines = 3,
                maxLines = 6,
                shape = ShapeTokens.Medium
            )

            Spacer(modifier = Modifier.height(16.dp))

            Text(
                text = "关联项目",
                style = MaterialTheme.typography.labelLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            Spacer(modifier = Modifier.height(8.dp))

            LazyRow(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                item {
                    TaskOrbitFilterChip(
                        selected = selectedProjectId == null,
                        onClick = { selectedProjectId = null },
                        label = "不关联项目"
                    )
                }
                items(
                    items = projects,
                    key = { it.id }
                ) { project ->
                    val projColor = resolveProjectColor(project.color, MaterialTheme.colorScheme.primary)
                    TaskOrbitFilterChip(
                        selected = selectedProjectId == project.id,
                        onClick = { selectedProjectId = project.id },
                        label = project.name,
                        leadingDotColor = projColor
                    )
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.End,
                verticalAlignment = Alignment.CenterVertically
            ) {
                TaskOrbitButton(
                    text = "取消",
                    onClick = onDismiss,
                    variant = ButtonVariant.TEXT
                )
                Spacer(modifier = Modifier.width(8.dp))
                TaskOrbitButton(
                    text = "保存",
                    onClick = { onSave(editTitle, editDescription, selectedProjectId) },
                    variant = ButtonVariant.FILLED,
                    enabled = editTitle.isNotBlank()
                )
            }

            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun InboxItemActionsBottomSheet(
    item: InboxItem,
    onDismiss: () -> Unit,
    onConvertToTask: () -> Unit,
    onConvertToPlan: () -> Unit,
    onDelete: () -> Unit
) {
    TaskOrbitBottomSheet(
        onDismissRequest = onDismiss
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 8.dp)
        ) {
            val title = item.title.ifEmpty { item.content }
            Text(
                text = title,
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.onSurface,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )

            Spacer(modifier = Modifier.height(16.dp))

            // 转为任务
            ActionOptionRow(
                icon = Icons.AutoMirrored.Outlined.Assignment,
                title = "转为任务",
                subtitle = "归入具体项目并设置排期",
                onClick = onConvertToTask
            )

            Spacer(modifier = Modifier.height(4.dp))

            // 每日计划
            ActionOptionRow(
                icon = Icons.Outlined.CalendarToday,
                title = "每日计划",
                subtitle = "安排到今日或指定日程时间段",
                onClick = onConvertToPlan
            )

            Spacer(modifier = Modifier.height(8.dp))
            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
            Spacer(modifier = Modifier.height(8.dp))

            // 删除
            ActionOptionRow(
                icon = Icons.Outlined.Delete,
                title = "删除待办",
                subtitle = null,
                danger = true,
                onClick = onDelete
            )

            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}

@Composable
private fun ActionOptionRow(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    title: String,
    subtitle: String?,
    danger: Boolean = false,
    onClick: () -> Unit
) {
    val contentColor = if (danger) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurface
    val iconColor = if (danger) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurfaceVariant
    val containerColor = if (danger) MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.25f) else Color.Transparent

    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .clip(ShapeTokens.Medium)
            .bouncyClickable(onClick = onClick),
        shape = ShapeTokens.Medium,
        color = containerColor
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = iconColor,
                modifier = Modifier.size(22.dp)
            )
            Spacer(modifier = Modifier.width(16.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = title,
                    style = MaterialTheme.typography.bodyLarge,
                    color = contentColor
                )
                if (subtitle != null) {
                    Text(
                        text = subtitle,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun InboxConvertToTaskBottomSheet(
    item: InboxItem,
    projects: List<Project>,
    onDismiss: () -> Unit,
    onConvert: (
        projectId: String,
        name: String,
        description: String,
        startDate: String?,
        endDate: String?,
        priority: Priority
    ) -> Unit
) {
    var selectedProjectId by remember(item, projects) {
        val initialId = if (item.projectId != null && projects.any { it.id == item.projectId }) {
            item.projectId
        } else {
            projects.firstOrNull()?.id
        }
        mutableStateOf(initialId)
    }
    var projectDropdownExpanded by remember { mutableStateOf(false) }
    var taskName by remember(item) { mutableStateOf(item.title.ifEmpty { item.content }) }
    var taskDescription by remember(item) { mutableStateOf(item.description) }
    var priority by remember { mutableStateOf(Priority.MEDIUM) }
    var scheduled by remember { mutableStateOf(false) }

    val todayStr = remember {
        SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
    }
    val defaultEndStr = remember {
        val cal = Calendar.getInstance()
        cal.add(Calendar.DAY_OF_YEAR, 7)
        SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(cal.time)
    }
    var startDate by remember { mutableStateOf(todayStr) }
    var endDate by remember { mutableStateOf(defaultEndStr) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    TaskOrbitBottomSheet(
        onDismissRequest = onDismiss
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp, vertical = 16.dp)
        ) {
            Text("转为任务", style = MaterialTheme.typography.titleLarge)

            Spacer(modifier = Modifier.height(16.dp))

            if (projects.isEmpty()) {
                Text(
                    text = "暂无可用项目，请先创建项目后再转为任务。",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.error
                )
                Spacer(modifier = Modifier.height(16.dp))
                TaskOrbitButton(
                    text = "知道了",
                    onClick = onDismiss,
                    modifier = Modifier.fillMaxWidth()
                )
            } else {
                ExposedDropdownMenuBox(
                    expanded = projectDropdownExpanded,
                    onExpandedChange = { projectDropdownExpanded = !projectDropdownExpanded },
                    modifier = Modifier.fillMaxWidth()
                ) {
                    val currentProject = projects.find { it.id == selectedProjectId }
                    val currentProjectColor = currentProject?.let { resolveProjectColor(it.color, MaterialTheme.colorScheme.primary) }
                    OutlinedTextField(
                        value = currentProject?.name ?: "请选择项目",
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("所属项目") },
                        leadingIcon = if (currentProjectColor != null) {
                            {
                                Box(
                                    modifier = Modifier
                                        .size(10.dp)
                                        .clip(CircleShape)
                                        .background(currentProjectColor)
                                )
                            }
                        } else null,
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = projectDropdownExpanded) },
                        modifier = Modifier
                            .fillMaxWidth()
                            .menuAnchor()
                    )
                    ExposedDropdownMenu(
                        expanded = projectDropdownExpanded,
                        onDismissRequest = { projectDropdownExpanded = false }
                    ) {
                        projects.forEach { proj ->
                            val projColor = resolveProjectColor(proj.color, MaterialTheme.colorScheme.primary)
                            DropdownMenuItem(
                                leadingIcon = {
                                    Box(
                                        modifier = Modifier
                                            .size(10.dp)
                                            .clip(CircleShape)
                                            .background(projColor)
                                    )
                                },
                                text = { Text(proj.name) },
                                onClick = {
                                    selectedProjectId = proj.id
                                    projectDropdownExpanded = false
                                }
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                OutlinedTextField(
                    value = taskName,
                    onValueChange = {
                        taskName = it
                        errorMessage = null
                    },
                    label = { Text("任务名称") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(12.dp))

                OutlinedTextField(
                    value = taskDescription,
                    onValueChange = { taskDescription = it },
                    label = { Text("任务描述（可选）") },
                    maxLines = 3,
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(12.dp))

                Row(verticalAlignment = Alignment.CenterVertically) {
                    TaskOrbitCheckbox(checked = scheduled, onCheckedChange = { scheduled = it })
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("安排任务日期", style = MaterialTheme.typography.bodyMedium)
                }

                if (scheduled) {
                    Spacer(modifier = Modifier.height(8.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        OutlinedTextField(
                            value = startDate,
                            onValueChange = { startDate = it },
                            label = { Text("开始日期") },
                            singleLine = true,
                            modifier = Modifier.weight(1f)
                        )
                        OutlinedTextField(
                            value = endDate,
                            onValueChange = { endDate = it },
                            label = { Text("结束日期") },
                            singleLine = true,
                            modifier = Modifier.weight(1f)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                Text("优先级", style = MaterialTheme.typography.labelLarge)
                Spacer(modifier = Modifier.height(4.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Priority.entries.forEach { p ->
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.bouncyClickable { priority = p }
                        ) {
                            RadioButton(
                                selected = priority == p,
                                onClick = { priority = p }
                            )
                            Text(p.label, style = MaterialTheme.typography.bodyMedium)
                        }
                    }
                }

                errorMessage?.let {
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
                }

                Spacer(modifier = Modifier.height(24.dp))

                TaskOrbitButton(
                    text = "转为任务",
                    onClick = {
                        val trimmedName = taskName.trim()
                        val projId = selectedProjectId
                        if (trimmedName.isEmpty()) {
                            errorMessage = "任务名称不能为空"
                            return@TaskOrbitButton
                        }
                        if (projId == null) {
                            errorMessage = "请选择所属项目"
                            return@TaskOrbitButton
                        }
                        if (scheduled && endDate < startDate) {
                            errorMessage = "结束日期不能早于开始日期"
                            return@TaskOrbitButton
                        }
                        onConvert(
                            projId,
                            trimmedName,
                            taskDescription.trim(),
                            if (scheduled) startDate else null,
                            if (scheduled) endDate else null,
                            priority
                        )
                    },
                    modifier = Modifier.fillMaxWidth(),
                    enabled = taskName.isNotBlank() && selectedProjectId != null
                )

                Spacer(modifier = Modifier.height(16.dp))
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun InboxConvertToDailyPlanBottomSheet(
    item: InboxItem,
    projects: List<Project>,
    tasks: List<Task>,
    onDismiss: () -> Unit,
    onConvert: (
        projectId: String?,
        taskId: String?,
        name: String,
        description: String,
        date: String,
        startTime: String,
        endTime: String
    ) -> Unit
) {
    var planName by remember(item) { mutableStateOf(item.title.ifEmpty { item.content }) }
    var planDescription by remember(item) { mutableStateOf(item.description) }
    var selectedProjectId by remember(item, projects) {
        val initialId = if (item.projectId != null && projects.any { it.id == item.projectId }) {
            item.projectId
        } else {
            null
        }
        mutableStateOf(initialId)
    }
    var selectedTaskId by remember { mutableStateOf<String?>(null) }

    val todayStr = remember {
        SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
    }
    var planDate by remember { mutableStateOf(todayStr) }
    var startTime by remember { mutableStateOf("09:00") }
    var endTime by remember { mutableStateOf("10:00") }

    var projectDropdownExpanded by remember { mutableStateOf(false) }
    var taskDropdownExpanded by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    val tasksOfSelectedProject = remember(selectedProjectId, tasks) {
        if (selectedProjectId == null) emptyList()
        else tasks.filter { it.projectId == selectedProjectId }
    }

    TaskOrbitBottomSheet(
        onDismissRequest = onDismiss
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp, vertical = 16.dp)
        ) {
            Text("转为每日计划", style = MaterialTheme.typography.titleLarge)

            Spacer(modifier = Modifier.height(16.dp))

            OutlinedTextField(
                value = planName,
                onValueChange = {
                    planName = it
                    errorMessage = null
                },
                label = { Text("计划名称") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(12.dp))

            OutlinedTextField(
                value = planDescription,
                onValueChange = { planDescription = it },
                label = { Text("计划说明（可选）") },
                maxLines = 2,
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(12.dp))

            OutlinedTextField(
                value = planDate,
                onValueChange = { planDate = it },
                label = { Text("日期 (YYYY-MM-DD)") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(12.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                OutlinedTextField(
                    value = startTime,
                    onValueChange = { startTime = it },
                    label = { Text("开始时间") },
                    singleLine = true,
                    modifier = Modifier.weight(1f)
                )
                OutlinedTextField(
                    value = endTime,
                    onValueChange = { endTime = it },
                    label = { Text("结束时间") },
                    singleLine = true,
                    modifier = Modifier.weight(1f)
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            // 关联项目选择
            ExposedDropdownMenuBox(
                expanded = projectDropdownExpanded,
                onExpandedChange = { projectDropdownExpanded = !projectDropdownExpanded },
                modifier = Modifier.fillMaxWidth()
            ) {
                val currentProject = projects.find { it.id == selectedProjectId }
                val currentProjectColor = currentProject?.let { resolveProjectColor(it.color, MaterialTheme.colorScheme.primary) }
                OutlinedTextField(
                    value = currentProject?.name ?: "无项目（独立计划）",
                    onValueChange = {},
                    readOnly = true,
                    label = { Text("关联项目") },
                    leadingIcon = if (currentProjectColor != null) {
                        {
                            Box(
                                modifier = Modifier
                                    .size(10.dp)
                                    .clip(CircleShape)
                                    .background(currentProjectColor)
                            )
                        }
                    } else null,
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = projectDropdownExpanded) },
                    modifier = Modifier
                        .fillMaxWidth()
                        .menuAnchor()
                )
                ExposedDropdownMenu(
                    expanded = projectDropdownExpanded,
                    onDismissRequest = { projectDropdownExpanded = false }
                ) {
                    DropdownMenuItem(
                        text = { Text("无项目（独立计划）") },
                        onClick = {
                            selectedProjectId = null
                            selectedTaskId = null
                            projectDropdownExpanded = false
                        }
                    )
                    projects.forEach { proj ->
                        val projColor = resolveProjectColor(proj.color, MaterialTheme.colorScheme.primary)
                        DropdownMenuItem(
                            leadingIcon = {
                                Box(
                                    modifier = Modifier
                                        .size(10.dp)
                                        .clip(CircleShape)
                                        .background(projColor)
                                )
                            },
                            text = { Text(proj.name) },
                            onClick = {
                                selectedProjectId = proj.id
                                selectedTaskId = null
                                projectDropdownExpanded = false
                            }
                        )
                    }
                }
            }

            // 关联任务选择（当选择了项目时）
            if (selectedProjectId != null && tasksOfSelectedProject.isNotEmpty()) {
                Spacer(modifier = Modifier.height(12.dp))
                ExposedDropdownMenuBox(
                    expanded = taskDropdownExpanded,
                    onExpandedChange = { taskDropdownExpanded = !taskDropdownExpanded },
                    modifier = Modifier.fillMaxWidth()
                ) {
                    val currentTask = tasksOfSelectedProject.find { it.id == selectedTaskId }
                    OutlinedTextField(
                        value = currentTask?.name ?: "无任务（独立）",
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("关联任务") },
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = taskDropdownExpanded) },
                        modifier = Modifier
                            .fillMaxWidth()
                            .menuAnchor()
                    )
                    ExposedDropdownMenu(
                        expanded = taskDropdownExpanded,
                        onDismissRequest = { taskDropdownExpanded = false }
                    ) {
                        DropdownMenuItem(
                            text = { Text("无任务（独立）") },
                            onClick = {
                                selectedTaskId = null
                                taskDropdownExpanded = false
                            }
                        )
                        tasksOfSelectedProject.forEach { task ->
                            DropdownMenuItem(
                                text = { Text(task.name) },
                                onClick = {
                                    selectedTaskId = task.id
                                    taskDropdownExpanded = false
                                }
                            )
                        }
                    }
                }
            }

            errorMessage?.let {
                Spacer(modifier = Modifier.height(8.dp))
                Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
            }

            Spacer(modifier = Modifier.height(24.dp))

            TaskOrbitButton(
                text = "转为每日计划",
                onClick = {
                    val trimmedName = planName.trim()
                    if (trimmedName.isEmpty()) {
                        errorMessage = "计划名称不能为空"
                        return@TaskOrbitButton
                    }
                    if (endTime <= startTime) {
                        errorMessage = "结束时间必须晚于开始时间"
                        return@TaskOrbitButton
                    }
                    onConvert(
                        selectedProjectId,
                        selectedTaskId,
                        trimmedName,
                        planDescription.trim(),
                        planDate,
                        startTime,
                        endTime
                    )
                },
                modifier = Modifier.fillMaxWidth(),
                enabled = planName.isNotBlank()
            )

            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}
