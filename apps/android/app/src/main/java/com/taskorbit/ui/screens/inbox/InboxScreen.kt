package com.taskorbit.ui.screens.inbox

import androidx.compose.animation.AnimatedVisibility
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowUpward
import androidx.compose.material.icons.filled.CheckBox
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.Inbox
import androidx.compose.material.icons.outlined.Timer
import androidx.compose.material3.ButtonGroup
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.FloatingActionButtonMenu
import androidx.compose.material3.FloatingActionButtonMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.taskorbit.domain.model.InboxItem
import com.taskorbit.domain.model.Project
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
    val pendingCount by viewModel.pendingCount.collectAsState()
    val content by viewModel.content.collectAsState()
    val draftProjectId by viewModel.draftProjectId.collectAsState()
    val statusFilter by viewModel.statusFilter.collectAsState()
    val projectFilter by viewModel.projectFilter.collectAsState()
    val isFocused by viewModel.isFocused.collectAsState()
    val editingItem by viewModel.editingItem.collectAsState()

    var isFabMenuExpanded by remember { mutableStateOf(false) }

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
                    },
                    text = { Text("新建待办") },
                    icon = { Icon(Icons.Filled.CheckBox, contentDescription = null) }
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
                content = content,
                draftProjectId = draftProjectId,
                projects = projects,
                isFocused = isFocused,
                onContentChange = viewModel::onContentChange,
                onDraftProjectChange = viewModel::onDraftProjectChange,
                onFocusChange = viewModel::onFocusChange,
                onSubmit = viewModel::submit,
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

            // 项目分类横向过滤栏
            val relevantProjects = remember(projects, projectCounts, projectFilter) {
                projects.filter { (projectCounts[it.id] ?: 0) > 0 || projectFilter == it.id }
            }
            if (relevantProjects.isNotEmpty() || unassignedCount > 0) {
                LazyRow(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 4.dp),
                    contentPadding = PaddingValues(horizontal = 16.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    item {
                        TaskOrbitFilterChip(
                            selected = projectFilter == "all" || projectFilter == null,
                            onClick = { viewModel.onProjectFilterChange("all") },
                            label = "全部项目"
                        )
                    }
                    item {
                        TaskOrbitFilterChip(
                            selected = projectFilter == "none",
                            onClick = { viewModel.onProjectFilterChange("none") },
                            label = "未关联 $unassignedCount"
                        )
                    }
                    items(
                        items = relevantProjects,
                        key = { it.id }
                    ) { project ->
                        val count = projectCounts[project.id] ?: 0
                        TaskOrbitFilterChip(
                            selected = projectFilter == project.id,
                            onClick = { viewModel.onProjectFilterChange(project.id) },
                            label = "${project.name} $count"
                        )
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
                            onDelete = { viewModel.removeItem(item.id) },
                            modifier = Modifier.animateItem()
                        )
                    }
                }
            }
        }
    }

    // 编辑待办 BottomSheet
    editingItem?.let { item ->
        InboxEditBottomSheet(
            item = item,
            projects = projects,
            onDismiss = { viewModel.dismissEditing() },
            onSave = { newContent, newProjectId ->
                viewModel.saveEditing(item.id, newContent, newProjectId)
            }
        )
    }
}

@Composable
private fun InboxComposerCard(
    content: String,
    draftProjectId: String?,
    projects: List<Project>,
    isFocused: Boolean,
    onContentChange: (String) -> Unit,
    onDraftProjectChange: (String?) -> Unit,
    onFocusChange: (Boolean) -> Unit,
    onSubmit: () -> Unit,
    modifier: Modifier = Modifier
) {
    val isExpanded = isFocused || content.isNotEmpty() || draftProjectId != null

    Column(modifier = modifier) {
        TaskOrbitCard(
            variant = CardVariant.FILLED,
            shape = ShapeTokens.Large,
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(MaterialTheme.colorScheme.surfaceContainerHigh)
                    .padding(horizontal = 14.dp, vertical = 10.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = if (isExpanded) Alignment.Top else Alignment.CenterVertically
                ) {
                    OutlinedTextField(
                        value = content,
                        onValueChange = onContentChange,
                        placeholder = {
                            Text(
                                text = "随手记下待办…（支持多行）",
                                style = MaterialTheme.typography.bodyLarge,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        },
                        modifier = Modifier
                            .weight(1f)
                            .onFocusChanged { onFocusChange(it.isFocused) },
                        singleLine = !isExpanded,
                        minLines = if (isExpanded) 2 else 1,
                        maxLines = if (isExpanded) 5 else 1,
                        keyboardOptions = KeyboardOptions(
                            imeAction = if (isExpanded) ImeAction.Default else ImeAction.Done
                        ),
                        keyboardActions = KeyboardActions(
                            onDone = { onSubmit() }
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
                        onClick = onSubmit,
                        variant = IconButtonVariant.FILLED,
                        enabled = content.isNotBlank()
                    )
                }

                if (isExpanded && projects.isNotEmpty()) {
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
                                label = project.name
                            )
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
                text = "支持记录多行文本，可选择关联项目",
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
    onDelete: () -> Unit,
    modifier: Modifier = Modifier
) {
    val projectColor = project?.let { PROJECT_COLOR_MAP[it.color] ?: MaterialTheme.colorScheme.primary }

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
                Text(
                    text = item.content,
                    style = MaterialTheme.typography.bodyLarge,
                    color = if (item.done) {
                        MaterialTheme.colorScheme.onSurface.copy(alpha = 0.55f)
                    } else {
                        MaterialTheme.colorScheme.onSurface
                    },
                    textDecoration = if (item.done) TextDecoration.LineThrough else TextDecoration.None,
                    maxLines = 6,
                    overflow = TextOverflow.Ellipsis
                )

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

            // 删除操作
            TaskOrbitIconButton(
                icon = Icons.Outlined.Delete,
                contentDescription = "删除待办",
                onClick = onDelete,
                variant = IconButtonVariant.STANDARD,
                danger = true,
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
    onSave: (content: String, projectId: String?) -> Unit
) {
    var editContent by remember(item) { mutableStateOf(item.content) }
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
                value = editContent,
                onValueChange = { editContent = it },
                label = { Text("待办内容") },
                placeholder = { Text("写下待办事项…") },
                modifier = Modifier.fillMaxWidth(),
                minLines = 3,
                maxLines = 8,
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
                    TaskOrbitFilterChip(
                        selected = selectedProjectId == project.id,
                        onClick = { selectedProjectId = project.id },
                        label = project.name
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
                    onClick = { onSave(editContent, selectedProjectId) },
                    variant = ButtonVariant.FILLED,
                    enabled = editContent.isNotBlank()
                )
            }

            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}
