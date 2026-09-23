package com.taskorbit.ui.screens.projects

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
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Archive
import androidx.compose.material.icons.filled.Folder
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.Folder
import androidx.compose.material.icons.outlined.Refresh
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExtendedFloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
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
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.taskorbit.domain.ProjectDomain
import com.taskorbit.domain.model.Project
import com.taskorbit.ui.components.ButtonVariant
import com.taskorbit.ui.components.CardVariant
import com.taskorbit.ui.components.ColorPickerRow
import com.taskorbit.ui.components.TaskOrbitAssistChip
import com.taskorbit.ui.components.TaskOrbitBottomSheet
import com.taskorbit.ui.components.TaskOrbitButton
import com.taskorbit.ui.components.TaskOrbitCard
import com.taskorbit.ui.components.TaskOrbitEmptyState
import com.taskorbit.ui.components.TaskOrbitIconButton
import com.taskorbit.ui.components.TaskOrbitProgressBar
import com.taskorbit.ui.components.TaskOrbitWavyProgressBar
import com.taskorbit.ui.components.TaskOrbitTopAppBar
import com.taskorbit.ui.theme.PROJECT_COLOR_MAP
import com.taskorbit.ui.theme.ShapeTokens

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProjectsScreen(
    onProjectClick: (String) -> Unit,
    viewModel: ProjectsViewModel = viewModel()
) {
    val activeProjects by viewModel.activeProjects.collectAsState()
    val archivedProjects by viewModel.archivedProjects.collectAsState()
    val query by viewModel.query.collectAsState()
    val isFormOpen by viewModel.isFormOpen.collectAsState()

    var projectToDelete by remember { mutableStateOf<Project?>(null) }

    Scaffold(
        topBar = {
            TaskOrbitTopAppBar(
                title = "项目",
                subtitle = "${activeProjects.size} 个进行中",
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                    titleContentColor = MaterialTheme.colorScheme.onSurface
                )
            )
        },
        floatingActionButton = {
            ExtendedFloatingActionButton(
                onClick = viewModel::openCreateForm,
                icon = { Icon(Icons.Filled.Add, contentDescription = null) },
                text = { Text("新建项目") },
                containerColor = MaterialTheme.colorScheme.primaryContainer,
                contentColor = MaterialTheme.colorScheme.onPrimaryContainer,
                shape = ShapeTokens.Large
            )
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            // 搜索框
            OutlinedTextField(
                value = query,
                onValueChange = viewModel::onQueryChange,
                placeholder = { Text("搜索项目…") },
                leadingIcon = {
                    Icon(
                        imageVector = Icons.Filled.Search,
                        contentDescription = "搜索",
                        tint = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                shape = ShapeTokens.Large,
                singleLine = true,
                colors = OutlinedTextFieldDefaults.colors(
                    focusedContainerColor = MaterialTheme.colorScheme.surfaceContainerHigh,
                    unfocusedContainerColor = MaterialTheme.colorScheme.surfaceContainerHigh,
                    focusedBorderColor = MaterialTheme.colorScheme.primary,
                    unfocusedBorderColor = MaterialTheme.colorScheme.outlineVariant
                )
            )

            if (activeProjects.isEmpty() && archivedProjects.isEmpty()) {
                TaskOrbitEmptyState(
                    icon = Icons.Outlined.Folder,
                    title = if (query.isEmpty()) "创建第一个项目" else "没有匹配的项目",
                    description = if (query.isEmpty()) "项目把任务、每日计划和专注记录组织在一起。" else "换一个关键词试试。",
                    modifier = Modifier.fillMaxSize()
                )
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 88.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    // 活跃项目列表
                    items(
                        items = activeProjects,
                        key = { it.id }
                    ) { project ->
                        val progress = viewModel.getProjectProgress(project.id)
                        val taskCount = viewModel.getTaskCount(project.id)
                        val planCount = viewModel.getPlanCount(project.id)
                        val accent = PROJECT_COLOR_MAP[project.color] ?: MaterialTheme.colorScheme.primary

                        ProjectItemCard(
                            project = project,
                            progress = progress,
                            taskCount = taskCount,
                            planCount = planCount,
                            accentColor = accent,
                            onClick = { onProjectClick(project.id) },
                            modifier = Modifier.animateItem()
                        )
                    }

                    // 归档项目列表
                    if (archivedProjects.isNotEmpty()) {
                        item {
                            Spacer(modifier = Modifier.height(16.dp))
                            Text(
                                text = "已归档",
                                style = MaterialTheme.typography.titleSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.padding(vertical = 4.dp)
                            )
                        }

                        items(
                            items = archivedProjects,
                            key = { it.id }
                        ) { project ->
                            ArchivedProjectRow(
                                project = project,
                                onRestore = { viewModel.restoreProject(project.id) },
                                onDelete = { projectToDelete = project },
                                modifier = Modifier.animateItem()
                            )
                        }
                    }
                }
            }
        }
    }

    // 永久删除确认弹窗
    projectToDelete?.let { project ->
        AlertDialog(
            onDismissRequest = { projectToDelete = null },
            title = { Text("永久删除项目") },
            text = { Text("将同时删除「${project.name}」的所有任务和关联计划，且无法撤销。") },
            confirmButton = {
                TextButton(
                    onClick = {
                        viewModel.removeProject(project.id)
                        projectToDelete = null
                    }
                ) {
                    Text("永久删除", color = MaterialTheme.colorScheme.error)
                }
            },
            dismissButton = {
                TextButton(onClick = { projectToDelete = null }) {
                    Text("取消")
                }
            }
        )
    }

    // 新建项目 BottomSheet 表单
    if (isFormOpen) {
        TaskOrbitBottomSheet(
            onDismissRequest = viewModel::closeForm
        ) {
            val name by viewModel.formName.collectAsState()
            val description by viewModel.formDescription.collectAsState()
            val color by viewModel.formColor.collectAsState()
            val startDate by viewModel.formStartDate.collectAsState()
            val endDate by viewModel.formEndDate.collectAsState()

            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 24.dp, vertical = 16.dp)
            ) {
                Text(
                    text = "新建项目",
                    style = MaterialTheme.typography.titleLarge,
                    color = MaterialTheme.colorScheme.onSurface
                )

                Spacer(modifier = Modifier.height(16.dp))

                OutlinedTextField(
                    value = name,
                    onValueChange = { viewModel.formName.value = it },
                    label = { Text("项目名称") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(12.dp))

                OutlinedTextField(
                    value = description,
                    onValueChange = { viewModel.formDescription.value = it },
                    label = { Text("项目描述（可选）") },
                    maxLines = 3,
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(16.dp))

                Text(
                    text = "项目主题色",
                    style = MaterialTheme.typography.labelLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

                ColorPickerRow(
                    selectedColor = color,
                    onColorSelected = { viewModel.formColor.value = it }
                )

                Spacer(modifier = Modifier.height(12.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    OutlinedTextField(
                        value = startDate,
                        onValueChange = { viewModel.formStartDate.value = it },
                        label = { Text("开始日期") },
                        modifier = Modifier.weight(1f)
                    )
                    OutlinedTextField(
                        value = endDate,
                        onValueChange = { viewModel.formEndDate.value = it },
                        label = { Text("结束日期") },
                        modifier = Modifier.weight(1f)
                    )
                }

                Spacer(modifier = Modifier.height(24.dp))

                TaskOrbitButton(
                    text = "创建项目",
                    onClick = viewModel::submitProject,
                    modifier = Modifier.fillMaxWidth(),
                    enabled = name.isNotBlank()
                )

                Spacer(modifier = Modifier.height(16.dp))
            }
        }
    }
}

@Composable
private fun ProjectItemCard(
    project: Project,
    progress: Int,
    taskCount: Int,
    planCount: Int,
    accentColor: androidx.compose.ui.graphics.Color,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    TaskOrbitCard(
        modifier = modifier.fillMaxWidth(),
        variant = CardVariant.ELEVATED,
        shape = ShapeTokens.Large,
        onClick = onClick
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // 项目色彩图标
                Box(
                    modifier = Modifier
                        .size(44.dp)
                        .clip(ShapeTokens.Medium)
                        .background(accentColor.copy(alpha = 0.15f)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Filled.Folder,
                        contentDescription = null,
                        tint = accentColor,
                        modifier = Modifier.size(24.dp)
                    )
                }

                Spacer(modifier = Modifier.width(12.dp))

                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = project.name,
                        style = MaterialTheme.typography.titleMedium,
                        color = MaterialTheme.colorScheme.onSurface,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        text = ProjectDomain.relativeRangeLabel(project.startDate, project.endDate),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }

                Icon(
                    imageVector = Icons.AutoMirrored.Filled.ArrowForward,
                    contentDescription = "查看详情",
                    tint = MaterialTheme.colorScheme.outlineVariant,
                    modifier = Modifier.size(20.dp)
                )
            }

            if (project.description.isNotBlank()) {
                Spacer(modifier = Modifier.height(10.dp))
                Text(
                    text = project.description,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            // 进度信息与进度条
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "$progress% 完成",
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            Spacer(modifier = Modifier.height(6.dp))
            TaskOrbitWavyProgressBar(progress = progress, color = accentColor)

            Spacer(modifier = Modifier.height(12.dp))

            // 统计 Chips
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                TaskOrbitAssistChip(
                    label = "$taskCount 任务",
                    leadingIconColor = accentColor
                )
                TaskOrbitAssistChip(
                    label = "$planCount 计划"
                )
            }
        }
    }
}

@Composable
private fun ArchivedProjectRow(
    project: Project,
    onRestore: () -> Unit,
    onDelete: () -> Unit,
    modifier: Modifier = Modifier
) {
    TaskOrbitCard(
        modifier = modifier.fillMaxWidth(),
        variant = CardVariant.OUTLINED,
        shape = ShapeTokens.Medium
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = Icons.Filled.Archive,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.outline,
                modifier = Modifier.size(20.dp)
            )

            Spacer(modifier = Modifier.width(10.dp))

            Text(
                text = project.name,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurface,
                modifier = Modifier.weight(1f),
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )

            TextButton(onClick = onRestore) {
                Text("恢复", style = MaterialTheme.typography.labelMedium)
            }

            TaskOrbitIconButton(
                icon = Icons.Outlined.Delete,
                contentDescription = "删除",
                onClick = onDelete,
                danger = true
            )
        }
    }
}
