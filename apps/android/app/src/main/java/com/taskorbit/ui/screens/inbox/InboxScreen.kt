package com.taskorbit.ui.screens.inbox

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
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
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowUpward
import androidx.compose.material.icons.filled.CheckBox
import androidx.compose.material.icons.outlined.CheckBox
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.Description
import androidx.compose.material.icons.outlined.Inbox
import androidx.compose.material.icons.outlined.Timer
import androidx.compose.material3.ButtonGroup
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.FloatingActionButtonMenu
import androidx.compose.material3.FloatingActionButtonMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
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
import com.taskorbit.domain.model.InboxItemKind
import com.taskorbit.ui.components.CardVariant
import com.taskorbit.ui.components.IconButtonVariant
import com.taskorbit.ui.components.TaskOrbitAssistChip
import com.taskorbit.ui.components.TaskOrbitCard
import com.taskorbit.ui.components.TaskOrbitCheckbox
import com.taskorbit.ui.components.TaskOrbitEmptyState
import com.taskorbit.ui.components.TaskOrbitIconButton
import com.taskorbit.ui.components.TaskOrbitTopAppBar
import com.taskorbit.ui.theme.MotionTokens
import com.taskorbit.ui.theme.ShapeTokens
import com.taskorbit.ui.theme.SuccessDark
import com.taskorbit.ui.theme.SuccessLight

enum class InboxFilter(val label: String) {
    ALL("全部"),
    TODO("待办"),
    DONE("已完成"),
    NOTE("备忘")
}

@OptIn(ExperimentalMaterial3Api::class, ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun InboxScreen(
    onNavigateToPomodoro: (() -> Unit)? = null,
    viewModel: InboxViewModel = viewModel()
) {
    val items by viewModel.inboxItems.collectAsState()
    val pendingCount by viewModel.pendingCount.collectAsState()
    val content by viewModel.content.collectAsState()
    val kind by viewModel.kind.collectAsState()
    val isFocused by viewModel.isFocused.collectAsState()

    var selectedFilter by remember { mutableStateOf(InboxFilter.ALL) }
    var isFabMenuExpanded by remember { mutableStateOf(false) }

    val isNoteExpanded = kind == InboxItemKind.NOTE && isFocused

    val filteredItems = remember(items, selectedFilter) {
        when (selectedFilter) {
            InboxFilter.ALL -> items
            InboxFilter.TODO -> items.filter { it.kind == InboxItemKind.TODO && !it.done }
            InboxFilter.DONE -> items.filter { it.done }
            InboxFilter.NOTE -> items.filter { it.kind == InboxItemKind.NOTE }
        }
    }

    Scaffold(
        topBar = {
            TaskOrbitTopAppBar(
                title = "收件箱",
                subtitle = "${pendingCount} 条待整理",
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
                        if (kind != InboxItemKind.TODO) viewModel.toggleKind()
                        viewModel.onFocusChange(true)
                    },
                    text = { Text("新建待办") },
                    icon = { Icon(Icons.Filled.CheckBox, contentDescription = null) }
                )
                FloatingActionButtonMenuItem(
                    onClick = {
                        isFabMenuExpanded = false
                        if (kind != InboxItemKind.NOTE) viewModel.toggleKind()
                        viewModel.onFocusChange(true)
                    },
                    text = { Text("记录备忘") },
                    icon = { Icon(Icons.Outlined.Description, contentDescription = null) }
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
                kind = kind,
                isFocused = isFocused,
                isNoteExpanded = isNoteExpanded,
                onContentChange = viewModel::onContentChange,
                onFocusChange = viewModel::onFocusChange,
                onToggleKind = viewModel::toggleKind,
                onSubmit = viewModel::submit,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp)
            )

            // Expressive 分类过滤胶囊
            ButtonGroup(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 4.dp),
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                InboxFilter.entries.forEach { filter ->
                    val count = when (filter) {
                        InboxFilter.ALL -> items.size
                        InboxFilter.TODO -> items.count { it.kind == InboxItemKind.TODO && !it.done }
                        InboxFilter.DONE -> items.count { it.done }
                        InboxFilter.NOTE -> items.count { it.kind == InboxItemKind.NOTE }
                    }
                    TonalToggleButton(
                        checked = selectedFilter == filter,
                        onCheckedChange = { selectedFilter = filter },
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

            Spacer(modifier = Modifier.height(4.dp))

            // 列表区域
            if (filteredItems.isEmpty()) {
                val emptyDesc = when (selectedFilter) {
                    InboxFilter.ALL -> "把脑海里的事先记下来，之后再慢慢整理。"
                    InboxFilter.TODO -> "目前没有未完成的待办事项，太棒了！"
                    InboxFilter.DONE -> "暂无已完成项，继续加油。"
                    InboxFilter.NOTE -> "暂无记录的备忘笔记。"
                }
                TaskOrbitEmptyState(
                    icon = Icons.Outlined.Inbox,
                    title = "暂无内容",
                    description = emptyDesc,
                    modifier = Modifier.fillMaxSize()
                )
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(
                        start = 16.dp,
                        top = 8.dp,
                        end = 16.dp,
                        bottom = 110.dp // 给悬浮底栏和 FAB 预留底部充足滑动空间
                    ),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    items(
                        items = filteredItems,
                        key = { it.id }
                    ) { item ->
                        InboxItemRow(
                            item = item,
                            onToggleDone = { done -> viewModel.toggleDone(item.id, done) },
                            onDelete = { viewModel.removeItem(item.id) },
                            modifier = Modifier.animateItem()
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun InboxComposerCard(
    content: String,
    kind: InboxItemKind,
    isFocused: Boolean,
    isNoteExpanded: Boolean,
    onContentChange: (String) -> Unit,
    onFocusChange: (Boolean) -> Unit,
    onToggleKind: () -> Unit,
    onSubmit: () -> Unit,
    modifier: Modifier = Modifier
) {
    val borderColor by animateColorAsState(
        targetValue = if (isFocused) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outlineVariant,
        animationSpec = tween(durationMillis = MotionTokens.DurationShort3),
        label = "composerBorder"
    )

    Column(modifier = modifier) {
        TaskOrbitCard(
            variant = CardVariant.FILLED,
            shape = ShapeTokens.Large,
            modifier = Modifier.fillMaxWidth()
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(MaterialTheme.colorScheme.surfaceContainerHigh)
                    .padding(horizontal = 12.dp, vertical = 8.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = if (isNoteExpanded) Alignment.Top else Alignment.CenterVertically
                ) {
                    // 切换待办 / 备忘 图标按钮
                    IconButton(
                        onClick = onToggleKind,
                        modifier = Modifier.size(40.dp)
                    ) {
                        Icon(
                            imageVector = if (kind == InboxItemKind.TODO) Icons.Filled.CheckBox else Icons.Outlined.Description,
                            contentDescription = "切换记录类型",
                            tint = MaterialTheme.colorScheme.primary
                        )
                    }

                    Spacer(modifier = Modifier.width(8.dp))

                    // 输入框
                    OutlinedTextField(
                        value = content,
                        onValueChange = onContentChange,
                        placeholder = {
                            Text(
                                text = if (kind == InboxItemKind.TODO) "快速添加待办…" else "记录一条备忘…",
                                style = MaterialTheme.typography.bodyLarge,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        },
                        modifier = Modifier
                            .weight(1f)
                            .onFocusChanged { onFocusChange(it.isFocused) },
                        singleLine = !isNoteExpanded,
                        minLines = if (isNoteExpanded) 3 else 1,
                        maxLines = if (isNoteExpanded) 6 else 1,
                        keyboardOptions = KeyboardOptions(
                            imeAction = if (kind == InboxItemKind.TODO) ImeAction.Done else ImeAction.Default
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

                    // 提交按钮
                    TaskOrbitIconButton(
                        icon = Icons.Filled.ArrowUpward,
                        contentDescription = "添加",
                        onClick = onSubmit,
                        variant = IconButtonVariant.FILLED,
                        enabled = content.isNotBlank()
                    )
                }
            }
        }

        AnimatedVisibility(
            visible = !isNoteExpanded,
            enter = fadeIn() + expandVertically(),
            exit = fadeOut() + shrinkVertically()
        ) {
            Text(
                text = "点击左侧图标切换待办 / 备忘",
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
    onToggleDone: (Boolean) -> Unit,
    onDelete: () -> Unit,
    modifier: Modifier = Modifier
) {
    TaskOrbitCard(
        modifier = modifier.fillMaxWidth(),
        variant = CardVariant.ELEVATED,
        shape = ShapeTokens.Medium
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // 左侧状态指示或勾选框
            if (item.kind == InboxItemKind.TODO) {
                TaskOrbitCheckbox(
                    checked = item.done,
                    onCheckedChange = onToggleDone
                )
            } else {
                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .clip(ShapeTokens.Small)
                        .background(MaterialTheme.colorScheme.secondaryContainer),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Outlined.Description,
                        contentDescription = "备忘",
                        tint = MaterialTheme.colorScheme.onSecondaryContainer,
                        modifier = Modifier.size(20.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.width(12.dp))

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
                    maxLines = 4,
                    overflow = TextOverflow.Ellipsis
                )

                Spacer(modifier = Modifier.height(6.dp))

                Row(
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    val label = when {
                        item.kind == InboxItemKind.NOTE -> "备忘"
                        item.done -> "已完成"
                        else -> "待办"
                    }
                    val isDark = MaterialTheme.colorScheme.surface.red < 0.5f
                    val successColor = if (isDark) SuccessDark else SuccessLight

                    TaskOrbitAssistChip(
                        label = label,
                        leadingIconColor = if (item.done) successColor else null
                    )
                }
            }

            Spacer(modifier = Modifier.width(8.dp))

            // 删除操作
            TaskOrbitIconButton(
                icon = Icons.Outlined.Delete,
                contentDescription = "删除",
                onClick = onDelete,
                variant = IconButtonVariant.STANDARD,
                danger = true
            )
        }
    }
}
