package com.taskorbit.ui.screens.pomodoro

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
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
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.FormatListBulleted
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.SkipNext
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material.icons.outlined.Folder
import androidx.compose.material.icons.outlined.Timer
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.CircularWavyProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.WavyProgressIndicatorDefaults
import androidx.compose.material3.FilledIconButton
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.FilledTonalIconButton
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.FloatingActionButtonDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.IconButtonDefaults
import androidx.compose.material3.LargeFloatingActionButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedIconButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Slider
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.taskorbit.domain.TimerEngine
import com.taskorbit.domain.model.ActiveTimer
import com.taskorbit.domain.model.DailyPlan
import com.taskorbit.domain.model.PomodoroKind
import com.taskorbit.domain.model.Project
import com.taskorbit.domain.model.Settings
import com.taskorbit.domain.model.Task
import com.taskorbit.domain.model.TimerStatus
import com.taskorbit.ui.components.CardVariant
import com.taskorbit.ui.components.TaskOrbitButton
import com.taskorbit.ui.components.TaskOrbitCard
import com.taskorbit.ui.theme.bouncyPress
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

@OptIn(ExperimentalMaterial3Api::class, ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun PomodoroScreen(
    viewModel: PomodoroViewModel = viewModel()
) {
    val activeTimer by viewModel.activeTimer.collectAsState()
    val settings by viewModel.settings.collectAsState()
    val projects by viewModel.projects.collectAsState()
    val tasks by viewModel.tasks.collectAsState()
    val selectedProjectId by viewModel.selectedProjectId.collectAsState()
    val selectedTaskId by viewModel.selectedTaskId.collectAsState()
    val displayRemainingMs by viewModel.displayRemainingMs.collectAsState()
    val todayStats by viewModel.todayStats.collectAsState()

    var showSettingsSheet by remember { mutableStateOf(false) }
    var showLinkSheet by remember { mutableStateOf(false) }

    val currentPhase = activeTimer?.phase ?: PomodoroKind.FOCUS
    val isRunning = activeTimer?.status == TimerStatus.RUNNING

    // 动态主题色彩配对
    val phaseColor = when (currentPhase) {
        PomodoroKind.FOCUS -> MaterialTheme.colorScheme.primary
        PomodoroKind.SHORT_BREAK -> MaterialTheme.colorScheme.secondary
        PomodoroKind.LONG_BREAK -> MaterialTheme.colorScheme.tertiary
    }
    val phaseContainerColor = when (currentPhase) {
        PomodoroKind.FOCUS -> MaterialTheme.colorScheme.primaryContainer
        PomodoroKind.SHORT_BREAK -> MaterialTheme.colorScheme.secondaryContainer
        PomodoroKind.LONG_BREAK -> MaterialTheme.colorScheme.tertiaryContainer
    }
    val onPhaseContainerColor = when (currentPhase) {
        PomodoroKind.FOCUS -> MaterialTheme.colorScheme.onPrimaryContainer
        PomodoroKind.SHORT_BREAK -> MaterialTheme.colorScheme.onSecondaryContainer
        PomodoroKind.LONG_BREAK -> MaterialTheme.colorScheme.onTertiaryContainer
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = "番茄钟",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold
                    )
                },
                actions = {
                    IconButton(onClick = { showSettingsSheet = true }) {
                        Icon(
                            imageVector = Icons.Default.Settings,
                            contentDescription = "番茄钟设置",
                            tint = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            )
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .verticalScroll(rememberScrollState()),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(modifier = Modifier.height(8.dp))

            // 1. 阶段选择与指示条
            PhaseSelector(
                currentPhase = currentPhase,
                focusCount = activeTimer?.focusCount ?: 0,
                activeColor = phaseColor,
                activeContainer = phaseContainerColor,
                onActiveContainer = onPhaseContainerColor
            )

            Spacer(modifier = Modifier.height(28.dp))

            // 2. 沉浸式环形倒计时进度器
            val totalDurationMs = activeTimer?.durationMs
                ?: TimerEngine.durationForPhase(settings, currentPhase)
            val progressFraction = if (totalDurationMs > 0) {
                (displayRemainingMs.toFloat() / totalDurationMs).coerceIn(0f, 1f)
            } else 1f

            TimerCountdownRing(
                remainingMs = displayRemainingMs,
                progress = progressFraction,
                color = phaseColor,
                isRunning = isRunning,
                timerStatus = activeTimer?.status ?: TimerStatus.PAUSED,
                phase = currentPhase
            )

            Spacer(modifier = Modifier.height(24.dp))

            // 3. 关联目标卡片
            TargetLinkCard(
                projects = projects,
                tasks = tasks,
                selectedProjectId = selectedProjectId,
                selectedTaskId = selectedTaskId,
                onClick = { showLinkSheet = true }
            )

            Spacer(modifier = Modifier.height(28.dp))

            // 4. 主控操作按钮组
            TimerControlButtons(
                isRunning = isRunning,
                timer = activeTimer,
                activeColor = phaseColor,
                onStart = { viewModel.start() },
                onPause = { viewModel.pause() },
                onSkip = { viewModel.skip() },
                onReset = { viewModel.reset() }
            )

            Spacer(modifier = Modifier.height(36.dp))

            // 5. 今日专注统计卡片
            TodayFocusCard(
                stats = todayStats,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp)
            )

            Spacer(modifier = Modifier.height(32.dp))
        }
    }

    // 关联目标选择弹层
    if (showLinkSheet) {
        TargetLinkSheet(
            projects = projects,
            tasks = tasks,
            selectedProjectId = selectedProjectId,
            selectedTaskId = selectedTaskId,
            onSelectProject = { viewModel.selectProject(it) },
            onSelectTask = { viewModel.selectTask(it) },
            onDismiss = { showLinkSheet = false }
        )
    }

    // 番茄钟配置弹层
    if (showSettingsSheet) {
        PomodoroSettingsSheet(
            settings = settings,
            onSave = { focus, shortBreak, longBreak, interval ->
                viewModel.updateSettings(
                    focusMinutes = focus,
                    shortBreakMinutes = shortBreak,
                    longBreakMinutes = longBreak,
                    longBreakInterval = interval
                )
                showSettingsSheet = false
            },
            onDismiss = { showSettingsSheet = false }
        )
    }
}

@Composable
fun PhaseSelector(
    currentPhase: PomodoroKind,
    focusCount: Int,
    activeColor: Color,
    activeContainer: Color,
    onActiveContainer: Color
) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Row(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            PhaseChip(
                title = "专注",
                selected = currentPhase == PomodoroKind.FOCUS,
                activeContainer = activeContainer,
                onActiveContainer = onActiveContainer
            )
            PhaseChip(
                title = "短休息",
                selected = currentPhase == PomodoroKind.SHORT_BREAK,
                activeContainer = activeContainer,
                onActiveContainer = onActiveContainer
            )
            PhaseChip(
                title = "长休息",
                selected = currentPhase == PomodoroKind.LONG_BREAK,
                activeContainer = activeContainer,
                onActiveContainer = onActiveContainer
            )
        }

        Spacer(modifier = Modifier.height(8.dp))

        Text(
            text = if (focusCount > 0) "今日已完成 $focusCount 个番茄" else "准备开始专注",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

@Composable
fun PhaseChip(
    title: String,
    selected: Boolean,
    activeContainer: Color,
    onActiveContainer: Color
) {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(20.dp))
            .background(if (selected) activeContainer else MaterialTheme.colorScheme.surfaceContainerHighest.copy(alpha = 0.5f))
            .padding(horizontal = 16.dp, vertical = 8.dp),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = title,
            style = MaterialTheme.typography.labelLarge,
            fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium,
            color = if (selected) onActiveContainer else MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun TimerCountdownRing(
    remainingMs: Long,
    progress: Float,
    color: Color,
    isRunning: Boolean,
    timerStatus: TimerStatus,
    phase: PomodoroKind
) {
    val animatedProgress by animateFloatAsState(
        targetValue = progress,
        animationSpec = tween(durationMillis = 300, easing = FastOutSlowInEasing),
        label = "progress"
    )

    // 波浪振幅控制：运行状态下波浪全幅生动流动，暂停或就绪时收敛为平缓微波
    val targetWaveAmplitude = if (isRunning) 1.0f else 0.35f
    val animatedWaveAmplitude by animateFloatAsState(
        targetValue = targetWaveAmplitude,
        animationSpec = tween(durationMillis = 500, easing = FastOutSlowInEasing),
        label = "waveAmplitude"
    )

    // 呼吸律动光晕动效
    val infiniteTransition = rememberInfiniteTransition(label = "breathing")
    val pulseScale by infiniteTransition.animateFloat(
        initialValue = 1.0f,
        targetValue = if (isRunning) 1.025f else 1.0f,
        animationSpec = infiniteRepeatable(
            animation = tween(2000, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulse"
    )
    val glowAlpha by infiniteTransition.animateFloat(
        initialValue = 0.08f,
        targetValue = if (isRunning) 0.22f else 0.08f,
        animationSpec = infiniteRepeatable(
            animation = tween(2000, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "glow"
    )

    val totalSeconds = (remainingMs + 999) / 1000
    val minutes = totalSeconds / 60
    val seconds = totalSeconds % 60
    val timeText = String.format("%02d:%02d", minutes, seconds)

    val statusText = when {
        isRunning -> when (phase) {
            PomodoroKind.FOCUS -> "保持心流，专注当下"
            PomodoroKind.SHORT_BREAK -> "伸展放松，喝口水"
            PomodoroKind.LONG_BREAK -> "充分休息，重蓄能量"
        }
        timerStatus == TimerStatus.PAUSED && remainingMs > 0 -> "已暂停"
        else -> "准备就绪"
    }

    val trackColor = MaterialTheme.colorScheme.surfaceContainerHighest
    val strokeWidthPx = with(LocalDensity.current) { 12.dp.toPx() }
    val ringStroke = remember(strokeWidthPx) {
        Stroke(width = strokeWidthPx, cap = StrokeCap.Round)
    }

    Box(
        modifier = Modifier
            .size(280.dp)
            .scale(pulseScale),
        contentAlignment = Alignment.Center
    ) {
        // 1. 发光背景光晕
        if (isRunning) {
            Canvas(modifier = Modifier.fillMaxSize()) {
                val diameter = size.minDimension - strokeWidthPx
                drawCircle(
                    color = color.copy(alpha = glowAlpha),
                    radius = (diameter + strokeWidthPx * 2) / 2f,
                    center = center
                )
            }
        }

        // 2. 官方实验性 Material 3 Expressive 波浪环形进度条
        CircularWavyProgressIndicator(
            progress = { animatedProgress },
            modifier = Modifier.fillMaxSize(),
            color = color,
            trackColor = trackColor,
            stroke = ringStroke,
            trackStroke = ringStroke,
            gapSize = 6.dp,
            wavelength = 36.dp,
            amplitude = { p ->
                val edgeTaper = when {
                    p < 0.02f -> (p / 0.02f)
                    p > 0.99f -> ((1f - p) / 0.01f).coerceIn(0f, 1f)
                    else -> 1f
                }
                edgeTaper * animatedWaveAmplitude
            }
        )

        // 3. 倒计时核心文本
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Text(
                text = timeText,
                style = MaterialTheme.typography.displayLarge.copy(
                    fontSize = 58.sp,
                    fontFamily = FontFamily.Monospace,
                    fontWeight = FontWeight.Medium
                ),
                color = MaterialTheme.colorScheme.onSurface,
                letterSpacing = (-1).sp
            )

            Spacer(modifier = Modifier.height(4.dp))

            Text(
                text = statusText,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
fun TargetLinkCard(
    projects: List<Project>,
    tasks: List<Task>,
    selectedProjectId: String?,
    selectedTaskId: String?,
    onClick: () -> Unit
) {
    val project = projects.find { it.id == selectedProjectId }
    val task = tasks.find { it.id == selectedTaskId }

    TaskOrbitCard(
        modifier = Modifier
            .padding(horizontal = 24.dp)
            .fillMaxWidth(),
        variant = CardVariant.FILLED,
        shape = RoundedCornerShape(16.dp),
        onClick = onClick
    ) {
        Row(
            modifier = Modifier
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Icon(
                imageVector = if (task != null) Icons.Default.FormatListBulleted else Icons.Outlined.Folder,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary,
                modifier = Modifier.size(20.dp)
            )

            Column(modifier = Modifier.weight(1f)) {
                if (task != null) {
                    Text(
                        text = task.name,
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.onSurface,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    if (project != null) {
                        Text(
                            text = "所属项目：${project.name}",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                } else if (project != null) {
                    Text(
                        text = project.name,
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.onSurface,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Text(
                        text = "未关联具体任务",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                } else {
                    Text(
                        text = "关联专注目标（项目或任务）",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            Icon(
                imageVector = Icons.Default.ChevronRight,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f),
                modifier = Modifier.size(18.dp)
            )
        }
    }
}

@Composable
fun TimerControlButtons(
    isRunning: Boolean,
    timer: ActiveTimer?,
    activeColor: Color,
    onStart: () -> Unit,
    onPause: () -> Unit,
    onSkip: () -> Unit,
    onReset: () -> Unit
) {
    Row(
        horizontalArrangement = Arrangement.spacedBy(24.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // 重置按钮
        FilledTonalIconButton(
            onClick = onReset,
            modifier = Modifier.size(48.dp).bouncyPress(),
            colors = IconButtonDefaults.filledTonalIconButtonColors(
                containerColor = MaterialTheme.colorScheme.surfaceContainerHigh
            )
        ) {
            Icon(
                imageVector = Icons.Default.Refresh,
                contentDescription = "重置",
                tint = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }

        // 主操作按钮：大号 FAB
        LargeFloatingActionButton(
            onClick = {
                if (isRunning) onPause() else onStart()
            },
            containerColor = activeColor,
            contentColor = MaterialTheme.colorScheme.surface,
            shape = CircleShape,
            modifier = Modifier.size(76.dp).bouncyPress()
        ) {
            AnimatedContent(
                targetState = isRunning,
                transitionSpec = { fadeIn() togetherWith fadeOut() },
                label = "playPause"
            ) { running ->
                Icon(
                    imageVector = if (running) Icons.Default.Pause else Icons.Default.PlayArrow,
                    contentDescription = if (running) "暂停" else "开始",
                    modifier = Modifier.size(36.dp)
                )
            }
        }

        // 跳过阶段按钮
        FilledTonalIconButton(
            onClick = onSkip,
            modifier = Modifier.size(48.dp).bouncyPress(),
            colors = IconButtonDefaults.filledTonalIconButtonColors(
                containerColor = MaterialTheme.colorScheme.surfaceContainerHigh
            )
        ) {
            Icon(
                imageVector = Icons.Default.SkipNext,
                contentDescription = "跳过当前阶段",
                tint = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
fun TodayFocusCard(
    stats: TodayFocusStats,
    modifier: Modifier = Modifier
) {
    TaskOrbitCard(
        modifier = modifier,
        variant = CardVariant.FILLED,
        shape = RoundedCornerShape(20.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(20.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "今日专注概览",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Icon(
                    imageVector = Icons.Outlined.Timer,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.size(20.dp)
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceAround
            ) {
                StatItem(
                    label = "完成番茄",
                    value = "${stats.completedCount}",
                    unit = "个"
                )
                StatItem(
                    label = "累计时长",
                    value = "${stats.totalMinutes}",
                    unit = "分钟"
                )
            }

            if (stats.sessions.isNotEmpty()) {
                Spacer(modifier = Modifier.height(16.dp))
                HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
                Spacer(modifier = Modifier.height(12.dp))

                Text(
                    text = "最近完成记录",
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(modifier = Modifier.height(8.dp))

                val recentSessions = stats.sessions.take(3)
                recentSessions.forEach { session ->
                    val timeStr = Instant.ofEpochMilli(session.endedAt)
                        .atZone(ZoneId.systemDefault())
                        .format(DateTimeFormatter.ofPattern("HH:mm"))

                    val targetTitle = session.taskNameSnapshot
                        ?: session.projectNameSnapshot
                        ?: "专注"

                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 4.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Outlined.CheckCircle,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.size(16.dp)
                            )
                            Text(
                                text = targetTitle,
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurface,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                        Text(
                            text = "$timeStr · ${session.minutes}m",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun StatItem(
    label: String,
    value: String,
    unit: String
) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Row(verticalAlignment = Alignment.Bottom) {
            Text(
                text = value,
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary
            )
            Spacer(modifier = Modifier.width(4.dp))
            Text(
                text = unit,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(bottom = 4.dp)
            )
        }
        Text(
            text = label,
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TargetLinkSheet(
    projects: List<Project>,
    tasks: List<Task>,
    selectedProjectId: String?,
    selectedTaskId: String?,
    onSelectProject: (String?) -> Unit,
    onSelectTask: (String?) -> Unit,
    onDismiss: () -> Unit
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = MaterialTheme.colorScheme.surfaceContainerLow
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp)
                .padding(bottom = 32.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "选择专注目标",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                TextButton(
                    onClick = {
                        onSelectProject(null)
                        onSelectTask(null)
                        onDismiss()
                    }
                ) {
                    Text("清除关联")
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // 任务列表
            Text(
                text = "活跃任务",
                style = MaterialTheme.typography.labelLarge,
                color = MaterialTheme.colorScheme.primary,
                fontWeight = FontWeight.Bold
            )
            Spacer(modifier = Modifier.height(8.dp))

            if (tasks.isEmpty()) {
                Text(
                    text = "暂无未完成的任务",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(vertical = 8.dp)
                )
            } else {
                tasks.take(8).forEach { task ->
                    val isSelected = task.id == selectedTaskId
                    val project = projects.find { it.id == task.projectId }

                    Surface(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(12.dp))
                            .clickable {
                                onSelectTask(task.id)
                                onDismiss()
                            }
                            .padding(vertical = 4.dp),
                        color = if (isSelected) MaterialTheme.colorScheme.primaryContainer else Color.Transparent,
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.FormatListBulleted,
                                contentDescription = null,
                                tint = if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.size(18.dp)
                            )
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = task.name,
                                    style = MaterialTheme.typography.bodyMedium,
                                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                                    color = if (isSelected) MaterialTheme.colorScheme.onPrimaryContainer else MaterialTheme.colorScheme.onSurface
                                )
                                if (project != null) {
                                    Text(
                                        text = project.name,
                                        style = MaterialTheme.typography.labelSmall,
                                        color = if (isSelected) MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.8f) else MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                            }
                            if (isSelected) {
                                Icon(
                                    imageVector = Icons.Default.Check,
                                    contentDescription = null,
                                    tint = MaterialTheme.colorScheme.primary,
                                    modifier = Modifier.size(18.dp)
                                )
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // 项目列表
            Text(
                text = "活跃项目",
                style = MaterialTheme.typography.labelLarge,
                color = MaterialTheme.colorScheme.primary,
                fontWeight = FontWeight.Bold
            )
            Spacer(modifier = Modifier.height(8.dp))

            projects.take(6).forEach { project ->
                val isSelected = project.id == selectedProjectId && selectedTaskId == null
                Surface(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .clickable {
                            onSelectProject(project.id)
                            onDismiss()
                        }
                        .padding(vertical = 4.dp),
                    color = if (isSelected) MaterialTheme.colorScheme.primaryContainer else Color.Transparent,
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Outlined.Folder,
                            contentDescription = null,
                            tint = if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.size(18.dp)
                        )
                        Text(
                            text = project.name,
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                            color = if (isSelected) MaterialTheme.colorScheme.onPrimaryContainer else MaterialTheme.colorScheme.onSurface,
                            modifier = Modifier.weight(1f)
                        )
                        if (isSelected) {
                            Icon(
                                imageVector = Icons.Default.Check,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.size(18.dp)
                            )
                        }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PomodoroSettingsSheet(
    settings: Settings,
    onSave: (focus: Int, shortBreak: Int, longBreak: Int, interval: Int) -> Unit,
    onDismiss: () -> Unit
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    var focusMinutes by remember { mutableIntStateOf(settings.focusMinutes) }
    var shortBreakMinutes by remember { mutableIntStateOf(settings.shortBreakMinutes) }
    var longBreakMinutes by remember { mutableIntStateOf(settings.longBreakMinutes) }
    var longBreakInterval by remember { mutableIntStateOf(settings.longBreakInterval) }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = MaterialTheme.colorScheme.surfaceContainerLow
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp)
                .padding(bottom = 36.dp)
        ) {
            Text(
                text = "番茄钟设置",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )

            Spacer(modifier = Modifier.height(20.dp))

            DurationSliderRow(
                label = "专注时长",
                value = focusMinutes,
                range = 5..60,
                unit = "分钟",
                onValueChange = { focusMinutes = it }
            )

            DurationSliderRow(
                label = "短休息",
                value = shortBreakMinutes,
                range = 1..20,
                unit = "分钟",
                onValueChange = { shortBreakMinutes = it }
            )

            DurationSliderRow(
                label = "长休息",
                value = longBreakMinutes,
                range = 5..45,
                unit = "分钟",
                onValueChange = { longBreakMinutes = it }
            )

            DurationSliderRow(
                label = "长休间隔",
                value = longBreakInterval,
                range = 2..8,
                unit = "个番茄",
                onValueChange = { longBreakInterval = it }
            )

            Spacer(modifier = Modifier.height(24.dp))

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

                TaskOrbitButton(
                    text = "保存",
                    onClick = {
                        onSave(focusMinutes, shortBreakMinutes, longBreakMinutes, longBreakInterval)
                    },
                    modifier = Modifier.weight(1f)
                )
            }
        }
    }
}

@Composable
fun DurationSliderRow(
    label: String,
    value: Int,
    range: IntRange,
    unit: String,
    onValueChange: (Int) -> Unit
) {
    Column(modifier = Modifier.padding(vertical = 8.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = label,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurface
            )
            Text(
                text = "$value $unit",
                style = MaterialTheme.typography.labelLarge,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary
            )
        }

        Slider(
            value = value.toFloat(),
            onValueChange = { onValueChange(it.toInt()) },
            valueRange = range.first.toFloat()..range.last.toFloat(),
            steps = (range.last - range.first) - 1
        )
    }
}
