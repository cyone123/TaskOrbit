package com.taskorbit.ui.screens.stats

import android.content.Intent
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import com.taskorbit.ui.components.CardVariant
import com.taskorbit.ui.components.TaskOrbitCard
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material.icons.outlined.BarChart
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material.icons.outlined.CloudDone
import androidx.compose.material.icons.outlined.ColorLens
import androidx.compose.material.icons.outlined.DeleteForever
import androidx.compose.material.icons.outlined.Download
import androidx.compose.material.icons.outlined.ErrorOutline
import androidx.compose.material.icons.outlined.HourglassEmpty
import androidx.compose.material.icons.outlined.Security
import androidx.compose.material.icons.outlined.Share
import androidx.compose.material.icons.outlined.Sync
import androidx.compose.material.icons.outlined.TaskAlt
import androidx.compose.material.icons.outlined.Today
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.taskorbit.domain.OverviewStats
import com.taskorbit.domain.ProjectTimeDistribution
import com.taskorbit.domain.StatsEngine
import com.taskorbit.ui.theme.PROJECT_COLOR_MAP
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StatsScreen(
    viewModel: StatsViewModel = viewModel()
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    val snackbarHostState = remember { SnackbarHostState() }

    val overview by viewModel.overviewStats.collectAsState()
    val themePreference by viewModel.themePreference.collectAsState()
    val webDavSettings by viewModel.webDavSettings.collectAsState()
    val syncStatus by viewModel.syncStatus.collectAsState()
    val lastSyncAt by viewModel.lastSyncAt.collectAsState()
    val syncErrorMessage by viewModel.syncErrorMessage.collectAsState()
    val isBusy by viewModel.isBusy.collectAsState()

    var showResetConfirmDialog by remember { mutableStateOf(false) }
    var pendingImportUri by remember { mutableStateOf<Uri?>(null) }
    var showImportConfirmDialog by remember { mutableStateOf(false) }
    var showWebDavSheet by remember { mutableStateOf(false) }

    // 处理来自 ViewModel 的 Toast / Snackbar 事件
    LaunchedEffect(Unit) {
        viewModel.events.collect { event ->
            when (event) {
                is StatsUiEvent.Success -> snackbarHostState.showSnackbar(event.message)
                is StatsUiEvent.Error -> snackbarHostState.showSnackbar(event.message)
            }
        }
    }

    // 系统文件选择器（读取 JSON 备份）
    val filePickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        if (uri != null) {
            pendingImportUri = uri
            showImportConfirmDialog = true
        }
    }

    // 发起导出与分享
    val onExportClick: () -> Unit = {
        coroutineScope.launch {
            val uri = viewModel.prepareExportFile()
            if (uri != null) {
                val sendIntent = Intent(Intent.ACTION_SEND).apply {
                    type = "application/json"
                    putExtra(Intent.EXTRA_STREAM, uri)
                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                }
                val chooser = Intent.createChooser(sendIntent, "导出并备份 Task Orbit 数据")
                context.startActivity(chooser)
            }
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = "统计与数据",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold
                    )
                },
                actions = {
                    IconButton(
                        onClick = onExportClick,
                        enabled = !isBusy
                    ) {
                        Icon(
                            imageVector = Icons.Outlined.Share,
                            contentDescription = "导出数据",
                            tint = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            )
        },
        snackbarHost = { SnackbarHost(hostState = snackbarHostState) }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Spacer(modifier = Modifier.height(4.dp))

            // 1. 核心指标卡片组
            MetricsGrid(overview = overview)

            // 2. 项目投入分布
            ProjectDistributionSection(distribution = overview.projectDistribution)

            // 3. 外观与主题
            ThemeCard(
                currentPreference = themePreference,
                onThemeSelect = { viewModel.updateTheme(it) }
            )

            // 4. 本地优先与数据备份
            LocalFirstCard(
                isBusy = isBusy,
                onExport = onExportClick,
                onImport = { filePickerLauncher.launch("application/json") }
            )

            // 5. WebDAV 云同步概览
            WebDavCard(
                settings = webDavSettings,
                syncStatus = syncStatus,
                lastSyncAt = lastSyncAt,
                syncErrorMessage = syncErrorMessage,
                isBusy = isBusy,
                onSyncClick = { viewModel.syncNow() },
                onSettingsClick = { showWebDavSheet = true }
            )

            // 6. 危险操作区
            DangerZoneCard(
                onResetClick = { showResetConfirmDialog = true }
            )

            Spacer(modifier = Modifier.height(32.dp))
        }
    }

    // 导入确认弹窗
    if (showImportConfirmDialog) {
        AlertDialog(
            onDismissRequest = {
                showImportConfirmDialog = false
                pendingImportUri = null
            },
            title = { Text("导入并替换数据") },
            text = { Text("导入新快照将完全替换当前工作区的数据（现有数据将自动保留本地 .bak 备份）。确定要继续吗？") },
            confirmButton = {
                TextButton(
                    onClick = {
                        showImportConfirmDialog = false
                        pendingImportUri?.let { viewModel.importFromUri(it) }
                        pendingImportUri = null
                    }
                ) {
                    Text("继续导入", color = MaterialTheme.colorScheme.error)
                }
            },
            dismissButton = {
                TextButton(
                    onClick = {
                        showImportConfirmDialog = false
                        pendingImportUri = null
                    }
                ) {
                    Text("取消")
                }
            }
        )
    }

    // 重置确认弹窗
    if (showResetConfirmDialog) {
        AlertDialog(
            onDismissRequest = { showResetConfirmDialog = false },
            title = { Text("重置所有数据") },
            text = { Text("此操作将清空所有项目、任务、每日计划与专注记录，恢复至出厂初始状态。现有数据将保留为本地备份。确定要重置吗？") },
            confirmButton = {
                TextButton(
                    onClick = {
                        showResetConfirmDialog = false
                        viewModel.resetData()
                    }
                ) {
                    Text("确定重置", color = MaterialTheme.colorScheme.error)
                }
            },
            dismissButton = {
                TextButton(onClick = { showResetConfirmDialog = false }) {
                    Text("取消")
                }
            }
        )
    }

    // WebDAV 配置弹层
    if (showWebDavSheet) {
        WebDavSettingsSheet(
            settings = webDavSettings,
            onSave = { newSettings ->
                viewModel.updateWebDavSettings(newSettings)
                showWebDavSheet = false
            },
            onTestConnection = { settings ->
                viewModel.testWebDavConnection(settings)
            },
            onDismiss = { showWebDavSheet = false }
        )
    }
}

@Composable
fun MetricsGrid(overview: OverviewStats) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            MetricCard(
                modifier = Modifier.weight(1f),
                icon = Icons.Outlined.Today,
                iconContainerColor = MaterialTheme.colorScheme.primaryContainer,
                iconColor = MaterialTheme.colorScheme.onPrimaryContainer,
                value = "${overview.todayMinutes}",
                unit = "m",
                label = "今日专注"
            )
            MetricCard(
                modifier = Modifier.weight(1f),
                icon = Icons.Outlined.HourglassEmpty,
                iconContainerColor = MaterialTheme.colorScheme.secondaryContainer,
                iconColor = MaterialTheme.colorScheme.onSecondaryContainer,
                value = "${overview.totalFocusCount}",
                unit = "个",
                label = "累计番茄"
            )
        }

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            MetricCard(
                modifier = Modifier.weight(1f),
                icon = Icons.Outlined.BarChart,
                iconContainerColor = MaterialTheme.colorScheme.tertiaryContainer,
                iconColor = MaterialTheme.colorScheme.onTertiaryContainer,
                value = StatsEngine.formatDuration(overview.totalMinutes),
                unit = "",
                label = "专注总时长"
            )
            MetricCard(
                modifier = Modifier.weight(1f),
                icon = Icons.Outlined.TaskAlt,
                iconContainerColor = MaterialTheme.colorScheme.surfaceContainerHighest,
                iconColor = MaterialTheme.colorScheme.primary,
                value = "${(overview.taskCompletionRate * 100).toInt()}%",
                unit = "(${overview.completedTasks}/${overview.totalTasks})",
                label = "任务完成率"
            )
        }
    }
}

@Composable
fun MetricCard(
    modifier: Modifier = Modifier,
    icon: ImageVector,
    iconContainerColor: Color,
    iconColor: Color,
    value: String,
    unit: String,
    label: String
) {
    TaskOrbitCard(
        modifier = modifier,
        variant = CardVariant.FILLED,
        shape = RoundedCornerShape(16.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(36.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .background(iconContainerColor),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = iconColor,
                    modifier = Modifier.size(20.dp)
                )
            }

            Spacer(modifier = Modifier.height(10.dp))

            Row(verticalAlignment = Alignment.Bottom) {
                Text(
                    text = value,
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface
                )
                if (unit.isNotEmpty()) {
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = unit,
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(bottom = 2.dp)
                    )
                }
            }

            Text(
                text = label,
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
fun ProjectDistributionSection(distribution: List<ProjectTimeDistribution>) {
    Column {
        Text(
            text = "项目投入分布",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(start = 4.dp, bottom = 8.dp)
        )

        TaskOrbitCard(
            modifier = Modifier.fillMaxWidth(),
            variant = CardVariant.FILLED,
            shape = RoundedCornerShape(18.dp)
        ) {
            if (distribution.isEmpty()) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(32.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(
                        imageVector = Icons.Outlined.BarChart,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f),
                        modifier = Modifier.size(36.dp)
                    )
                    Text(
                        text = "完成第一轮专注后，这里会显示投入分布",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        textAlign = TextAlign.Center
                    )
                }
            } else {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    distribution.forEach { item ->
                        val barColor = PROJECT_COLOR_MAP[item.projectColor] ?: MaterialTheme.colorScheme.primary
                        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = item.projectName,
                                    style = MaterialTheme.typography.bodyMedium,
                                    fontWeight = FontWeight.SemiBold,
                                    color = MaterialTheme.colorScheme.onSurface,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis,
                                    modifier = Modifier.weight(1f)
                                )
                                Text(
                                    text = "${item.minutes} 分钟 · ${(item.percentage * 100).toInt()}%",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }

                            // 投入横向进度条（带加载展开动效）
                            val animatedRatio by animateFloatAsState(
                                targetValue = item.relativeBarRatio,
                                animationSpec = tween(durationMillis = 500, easing = FastOutSlowInEasing),
                                label = "barRatio"
                            )

                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(8.dp)
                                    .clip(RoundedCornerShape(4.dp))
                                    .background(MaterialTheme.colorScheme.surfaceContainerHighest)
                            ) {
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth(animatedRatio)
                                        .height(8.dp)
                                        .clip(RoundedCornerShape(4.dp))
                                        .background(barColor)
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ThemeCard(
    currentPreference: String,
    onThemeSelect: (String) -> Unit
) {
    TaskOrbitCard(
        modifier = Modifier.fillMaxWidth(),
        variant = CardVariant.FILLED,
        shape = RoundedCornerShape(18.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(MaterialTheme.colorScheme.secondaryContainer),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Outlined.ColorLens,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onSecondaryContainer,
                        modifier = Modifier.size(22.dp)
                    )
                }
                Column {
                    Text(
                        text = "外观与主题",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "主题偏好保存在本地，支持跟随系统或手动切换",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            val options = listOf("system" to "跟随系统", "light" to "浅色", "dark" to "深色")
            val selectedIndex = options.indexOfFirst { it.first == currentPreference }.coerceAtLeast(0)

            SingleChoiceSegmentedButtonRow(modifier = Modifier.fillMaxWidth()) {
                options.forEachIndexed { index, (value, label) ->
                    SegmentedButton(
                        selected = index == selectedIndex,
                        onClick = { onThemeSelect(value) },
                        shape = SegmentedButtonDefaults.itemShape(index = index, count = options.size)
                    ) {
                        Text(label, style = MaterialTheme.typography.labelMedium)
                    }
                }
            }
        }
    }
}

@Composable
fun LocalFirstCard(
    isBusy: Boolean,
    onExport: () -> Unit,
    onImport: () -> Unit
) {
    TaskOrbitCard(
        modifier = Modifier.fillMaxWidth(),
        variant = CardVariant.FILLED,
        shape = RoundedCornerShape(18.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(MaterialTheme.colorScheme.primaryContainer),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Outlined.Security,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onPrimaryContainer,
                        modifier = Modifier.size(22.dp)
                    )
                }
                Column {
                    Text(
                        text = "本地优先与备份",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "数据保存在设备本地；JSON 快照可与桌面端及移动端双向互通",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                FilledTonalButton(
                    onClick = onExport,
                    enabled = !isBusy,
                    modifier = Modifier.weight(1f)
                ) {
                    Icon(
                        imageVector = Icons.Outlined.Share,
                        contentDescription = null,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("导出备份")
                }

                FilledTonalButton(
                    onClick = onImport,
                    enabled = !isBusy,
                    modifier = Modifier.weight(1f)
                ) {
                    Icon(
                        imageVector = Icons.Outlined.Download,
                        contentDescription = null,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("导入快照")
                }
            }
        }
    }
}

@Composable
fun WebDavCard(
    settings: com.taskorbit.domain.model.WebDavSettings,
    syncStatus: com.taskorbit.data.sync.SyncStatus,
    lastSyncAt: Long?,
    syncErrorMessage: String?,
    isBusy: Boolean,
    onSyncClick: () -> Unit,
    onSettingsClick: () -> Unit
) {
    TaskOrbitCard(
        modifier = Modifier.fillMaxWidth(),
        variant = CardVariant.FILLED,
        shape = RoundedCornerShape(18.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(MaterialTheme.colorScheme.secondaryContainer),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Outlined.CloudDone,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onSecondaryContainer,
                        modifier = Modifier.size(22.dp)
                    )
                }
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "WebDAV 云同步",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold
                    )
                    val statusDesc = when {
                        !settings.enabled -> "未启用。可配置自建或公共 WebDAV 服务器进行跨设备双向同步。"
                        syncStatus == com.taskorbit.data.sync.SyncStatus.SYNCING -> "正在与云端双向同步中…"
                        syncStatus == com.taskorbit.data.sync.SyncStatus.ERROR -> "同步异常：$syncErrorMessage"
                        lastSyncAt != null -> "已同步 (${formatLastSyncTime(lastSyncAt)})"
                        else -> "已配置，等待首次同步"
                    }
                    Text(
                        text = statusDesc,
                        style = MaterialTheme.typography.bodySmall,
                        color = if (syncStatus == com.taskorbit.data.sync.SyncStatus.ERROR) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                FilledTonalButton(
                    onClick = onSyncClick,
                    enabled = settings.enabled && !isBusy && syncStatus != com.taskorbit.data.sync.SyncStatus.SYNCING,
                    modifier = Modifier.weight(1f)
                ) {
                    if (syncStatus == com.taskorbit.data.sync.SyncStatus.SYNCING) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(16.dp),
                            strokeWidth = 2.dp,
                            color = MaterialTheme.colorScheme.primary
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("同步中…")
                    } else {
                        Icon(
                            imageVector = Icons.Outlined.Sync,
                            contentDescription = null,
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("立即同步")
                    }
                }

                OutlinedButton(
                    onClick = onSettingsClick,
                    modifier = Modifier.weight(1f)
                ) {
                    Text("配置云同步")
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WebDavSettingsSheet(
    settings: com.taskorbit.domain.model.WebDavSettings,
    onSave: (com.taskorbit.domain.model.WebDavSettings) -> Unit,
    onTestConnection: suspend (com.taskorbit.domain.model.WebDavSettings) -> com.taskorbit.data.sync.WebDavConnectionTestResult,
    onDismiss: () -> Unit
) {
    val sheetState = androidx.compose.material3.rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val coroutineScope = rememberCoroutineScope()

    var enabled by remember { mutableStateOf(settings.enabled) }
    var serverUrl by remember { mutableStateOf(settings.serverUrl) }
    var username by remember { mutableStateOf(settings.username) }
    var password by remember { mutableStateOf(settings.password) }
    var remoteDir by remember { mutableStateOf(settings.remoteDir) }
    var autoSync by remember { mutableStateOf(settings.autoSync) }

    var passwordVisible by remember { mutableStateOf(false) }
    var testResult by remember { mutableStateOf<com.taskorbit.data.sync.WebDavConnectionTestResult?>(null) }
    var isTesting by remember { mutableStateOf(false) }

    androidx.compose.material3.ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = MaterialTheme.colorScheme.surfaceContainerLow
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp)
                .padding(bottom = 36.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            Text(
                text = "WebDAV 云同步配置",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )

            // 启用开关
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text("启用 WebDAV 双向同步", style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold)
                    Text("开启后将自动同步任务、计划与专注记录", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                androidx.compose.material3.Switch(
                    checked = enabled,
                    onCheckedChange = { enabled = it }
                )
            }

            androidx.compose.material3.OutlinedTextField(
                value = serverUrl,
                onValueChange = { serverUrl = it },
                label = { Text("服务器地址") },
                placeholder = { Text("https://dav.example.com/webdav/") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp)
            )

            androidx.compose.material3.OutlinedTextField(
                value = username,
                onValueChange = { username = it },
                label = { Text("用户名 / 账户") },
                placeholder = { Text("WebDAV 账户名") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp)
            )

            androidx.compose.material3.OutlinedTextField(
                value = password,
                onValueChange = { password = it },
                label = { Text("密码 / 应用令牌") },
                placeholder = { Text("WebDAV 密码") },
                singleLine = true,
                visualTransformation = if (passwordVisible) androidx.compose.ui.text.input.VisualTransformation.None else androidx.compose.ui.text.input.PasswordVisualTransformation(),
                trailingIcon = {
                    IconButton(onClick = { passwordVisible = !passwordVisible }) {
                        Icon(
                            imageVector = if (passwordVisible) Icons.Filled.Visibility else Icons.Filled.VisibilityOff,
                            contentDescription = if (passwordVisible) "隐藏密码" else "显示密码"
                        )
                    }
                },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp)
            )

            androidx.compose.material3.OutlinedTextField(
                value = remoteDir,
                onValueChange = { remoteDir = it },
                label = { Text("远端存储目录") },
                placeholder = { Text("/taskorbit") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp)
            )

            // 自动静默同步开关
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text("自动静默同步", style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold)
                    Text("在应用启动或唤醒时自动在后台执行一次同步", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                androidx.compose.material3.Switch(
                    checked = autoSync,
                    onCheckedChange = { autoSync = it }
                )
            }

            // 测试连接反馈
            testResult?.let { res ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(8.dp))
                        .background(if (res.success) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.errorContainer)
                        .padding(10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(
                        imageVector = if (res.success) Icons.Outlined.CheckCircle else Icons.Outlined.ErrorOutline,
                        contentDescription = null,
                        tint = if (res.success) MaterialTheme.colorScheme.onPrimaryContainer else MaterialTheme.colorScheme.onErrorContainer,
                        modifier = Modifier.size(18.dp)
                    )
                    Text(
                        text = res.message,
                        style = MaterialTheme.typography.bodySmall,
                        color = if (res.success) MaterialTheme.colorScheme.onPrimaryContainer else MaterialTheme.colorScheme.onErrorContainer
                    )
                }
            }

            // 测试连接按钮
            OutlinedButton(
                onClick = {
                    val candidate = com.taskorbit.domain.model.WebDavSettings(
                        serverUrl = serverUrl,
                        username = username,
                        password = password,
                        remoteDir = remoteDir,
                        enabled = enabled,
                        autoSync = autoSync
                    )
                    coroutineScope.launch {
                        isTesting = true
                        testResult = onTestConnection(candidate)
                        isTesting = false
                    }
                },
                enabled = !isTesting && serverUrl.trim().isNotEmpty(),
                modifier = Modifier.fillMaxWidth()
            ) {
                if (isTesting) {
                    CircularProgressIndicator(modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("正在测试连接…")
                } else {
                    Text("测试连接")
                }
            }

            Spacer(modifier = Modifier.height(4.dp))

            // 保存与取消
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                TextButton(
                    onClick = onDismiss,
                    modifier = Modifier.weight(1f)
                ) {
                    Text("取消")
                }

                FilledTonalButton(
                    onClick = {
                        onSave(
                            com.taskorbit.domain.model.WebDavSettings(
                                serverUrl = serverUrl,
                                username = username,
                                password = password,
                                remoteDir = remoteDir,
                                enabled = enabled,
                                autoSync = autoSync
                            )
                        )
                    },
                    modifier = Modifier.weight(1f)
                ) {
                    Text("保存配置")
                }
            }
        }
    }
}

fun formatLastSyncTime(timestamp: Long): String {
    val now = System.currentTimeMillis()
    val diffMin = (now - timestamp) / 60_000L
    return when {
        diffMin < 1L -> "刚刚"
        diffMin < 60L -> "${diffMin}分钟前"
        else -> {
            val date = java.time.Instant.ofEpochMilli(timestamp)
                .atZone(java.time.ZoneId.systemDefault())
            date.format(java.time.format.DateTimeFormatter.ofPattern("M/d HH:mm"))
        }
    }
}

@Composable
fun DangerZoneCard(onResetClick: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.2f)
        ),
        shape = RoundedCornerShape(18.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "重置所有数据",
                    style = MaterialTheme.typography.titleSmall,
                    color = MaterialTheme.colorScheme.error,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "清空所有任务与记录，恢复出厂默认",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            OutlinedButton(
                onClick = onResetClick,
                colors = androidx.compose.material3.ButtonDefaults.outlinedButtonColors(
                    contentColor = MaterialTheme.colorScheme.error
                )
            ) {
                Icon(
                    imageVector = Icons.Outlined.DeleteForever,
                    contentDescription = null,
                    modifier = Modifier.size(18.dp)
                )
                Spacer(modifier = Modifier.width(4.dp))
                Text("重置")
            }
        }
    }
}
