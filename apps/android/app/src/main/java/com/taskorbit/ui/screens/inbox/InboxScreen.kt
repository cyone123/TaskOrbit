package com.taskorbit.ui.screens.inbox

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.tween
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
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowUpward
import androidx.compose.material.icons.filled.CheckBox
import androidx.compose.material.icons.outlined.CheckBox
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.Description
import androidx.compose.material.icons.outlined.Inbox
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
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

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun InboxScreen(
    viewModel: InboxViewModel = viewModel()
) {
    val items by viewModel.inboxItems.collectAsState()
    val pendingCount by viewModel.pendingCount.collectAsState()
    val content by viewModel.content.collectAsState()
    val kind by viewModel.kind.collectAsState()
    val isFocused by viewModel.isFocused.collectAsState()

    val isNoteExpanded = kind == InboxItemKind.NOTE && isFocused

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

            // 列表区域
            if (items.isEmpty()) {
                TaskOrbitEmptyState(
                    icon = Icons.Outlined.Inbox,
                    title = "收件箱是空的",
                    description = "把脑海里的事先记下来，之后再慢慢整理。",
                    modifier = Modifier.fillMaxSize()
                )
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    items(
                        items = items,
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
