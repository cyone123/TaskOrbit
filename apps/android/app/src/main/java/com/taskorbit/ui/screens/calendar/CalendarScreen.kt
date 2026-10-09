package com.taskorbit.ui.screens.calendar

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.animation.expandHorizontally
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.animation.shrinkHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectDragGesturesAfterLongPress
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowLeft
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.Edit
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.material3.Slider
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.ButtonGroup
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.TonalToggleButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.nestedscroll.NestedScrollConnection
import androidx.compose.ui.input.nestedscroll.NestedScrollSource
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.zIndex
import androidx.lifecycle.viewmodel.compose.viewModel
import com.taskorbit.domain.CalendarMode
import com.taskorbit.domain.CalendarModel
import com.taskorbit.domain.WeekCalendarMode
import com.taskorbit.domain.model.DailyPlan
import com.taskorbit.domain.model.DailyPlanRepeat
import com.taskorbit.domain.model.Task
import com.taskorbit.domain.model.Settings
import com.taskorbit.ui.components.CardVariant
import com.taskorbit.ui.components.TaskOrbitBottomSheet
import com.taskorbit.ui.components.TaskOrbitButton
import com.taskorbit.ui.components.TaskOrbitCard
import com.taskorbit.ui.components.TaskOrbitCheckbox
import com.taskorbit.ui.components.TaskOrbitEmptyState
import com.taskorbit.ui.components.TaskOrbitIconButton
import com.taskorbit.ui.components.TaskOrbitTopAppBar
import com.taskorbit.ui.theme.PROJECT_COLOR_MAP
import com.taskorbit.ui.theme.ShapeTokens
import com.taskorbit.ui.theme.bouncyClickable
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlin.math.roundToInt
import java.time.LocalDate
import java.time.LocalTime
import java.time.format.DateTimeFormatter

@OptIn(ExperimentalMaterial3Api::class, ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun CalendarScreen(
    viewModel: CalendarViewModel = viewModel()
) {
    val settings by viewModel.settings.collectAsState()
    val anchorDate by viewModel.anchorDate.collectAsState()
    val mode by viewModel.mode.collectAsState()
    val weekMode by viewModel.weekMode.collectAsState()
    val selectedDate by viewModel.selectedDate.collectAsState()

    val daysOfWeek by viewModel.daysOfWeek.collectAsState()
    val monthDays by viewModel.monthDays.collectAsState()
    val plansOfDay by viewModel.plansOfDay.collectAsState()
    val plansOfWeek by viewModel.plansOfWeek.collectAsState()
    val tasksInWeek by viewModel.tasksInWeek.collectAsState()
    val monthPlanCounts by viewModel.monthPlanCounts.collectAsState()
    val tasksByDateInMonth by viewModel.tasksByDateInMonth.collectAsState()
    val tasksInMonth by viewModel.tasksInMonth.collectAsState()
    val tasksOfDay by viewModel.tasksOfDay.collectAsState()

    val isPlanFormOpen by viewModel.isPlanFormOpen.collectAsState()
    var showSettingsSheet by remember { mutableStateOf(false) }

    // Expressive 浮岛伸缩状态与滚动感知
    var isAppBarExpanded by remember { mutableStateOf(true) }
    val nestedScrollConnection = remember {
        object : NestedScrollConnection {
            override fun onPreScroll(available: Offset, source: NestedScrollSource): Offset {
                val delta = available.y
                if (delta < -8f && isAppBarExpanded) {
                    isAppBarExpanded = false
                } else if (delta > 8f && !isAppBarExpanded) {
                    isAppBarExpanded = true
                }
                return Offset.Zero
            }
        }
    }

    val headingText = remember(mode, anchorDate) {
        when (mode) {
            CalendarMode.DAY -> anchorDate.format(DateTimeFormatter.ofPattern("M月d日 EEEE"))
            CalendarMode.WEEK -> {
                val start = daysOfWeek.first()
                val end = daysOfWeek.last()
                "${start.monthValue}/${start.dayOfMonth} - ${end.monthValue}/${end.dayOfMonth}"
            }
            CalendarMode.MONTH -> anchorDate.format(DateTimeFormatter.ofPattern("yyyy年M月"))
        }
    }

    Scaffold(
        topBar = {
            TaskOrbitTopAppBar(
                title = "日历",
                subtitle = headingText,
                actions = {
                    TextButton(onClick = viewModel::goToToday) {
                        Text("今天", fontWeight = FontWeight.SemiBold)
                    }
                    IconButton(onClick = { viewModel.navigate(-1) }) {
                        Icon(Icons.AutoMirrored.Filled.KeyboardArrowLeft, contentDescription = "上一周期")
                    }
                    IconButton(onClick = { viewModel.navigate(1) }) {
                        Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, contentDescription = "下一周期")
                    }
                    IconButton(onClick = { showSettingsSheet = true }) {
                        Icon(
                            imageVector = Icons.Default.Settings,
                            contentDescription = "日历设置",
                            tint = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                    titleContentColor = MaterialTheme.colorScheme.onSurface
                )
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { viewModel.openNewPlanForm() },
                containerColor = MaterialTheme.colorScheme.primaryContainer,
                contentColor = MaterialTheme.colorScheme.onPrimaryContainer,
                shape = ShapeTokens.Large,
                modifier = Modifier
                    .navigationBarsPadding()
                    .padding(bottom = 76.dp)
            ) {
                Icon(Icons.Filled.Add, contentDescription = "新建计划")
            }
        }
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .nestedScroll(nestedScrollConnection)
        ) {
            // 主视图内容区域（留出顶部悬浮胶囊空间，避免收起状态遮挡顶部日期/时间槽）
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(top = 54.dp)
            ) {
                AnimatedContent(
                    targetState = mode,
                    transitionSpec = {
                        fadeIn(tween(250)) togetherWith fadeOut(tween(150))
                    },
                    label = "calendarModeContent",
                    modifier = Modifier.fillMaxSize()
                ) { targetMode ->
                    when (targetMode) {
                        CalendarMode.DAY -> {
                            DayTimelineView(
                                settings = settings,
                                currentDate = selectedDate,
                                plans = plansOfDay,
                                onPlanClick = viewModel::openEditPlanForm,
                                onToggleDone = viewModel::togglePlan,
                                onDeletePlan = viewModel::removePlan,
                                onReschedulePlan = viewModel::reschedulePlan,
                                getProjectColor = viewModel::getProjectColor,
                                modifier = Modifier.fillMaxSize()
                            )
                        }
                        CalendarMode.WEEK -> {
                            if (weekMode == WeekCalendarMode.PLANS) {
                                WeekPlansView(
                                    settings = settings,
                                    daysOfWeek = daysOfWeek,
                                    plansOfWeek = plansOfWeek,
                                    selectedDate = selectedDate,
                                    onSelectDate = viewModel::selectDate,
                                    onPlanClick = viewModel::openEditPlanForm,
                                    onToggleDone = viewModel::togglePlan,
                                    onReschedulePlan = viewModel::reschedulePlan,
                                    getProjectColor = viewModel::getProjectColor,
                                    modifier = Modifier.fillMaxSize()
                                )
                            } else {
                                WeekGanttView(
                                    daysOfWeek = daysOfWeek,
                                    tasks = tasksInWeek,
                                    getProjectColor = viewModel::getProjectColor,
                                    modifier = Modifier.fillMaxSize()
                                )
                            }
                        }
                        CalendarMode.MONTH -> {
                            MonthCalendarView(
                                settings = settings,
                                plansOfDay = plansOfDay,
                                onPlanClick = viewModel::openEditPlanForm,
                                anchorDate = anchorDate,
                                selectedDate = selectedDate,
                                monthDays = monthDays,
                                tasks = tasksInMonth,
                                tasksOfDay = tasksOfDay,
                                onSelectDate = viewModel::selectDate,
                                onToggleTaskDone = viewModel::toggleTask,
                                getProjectColor = viewModel::getProjectColor,
                                modifier = Modifier.fillMaxSize()
                            )
                        }
                    }
                }
            }

            // Expressive 顶部日历视图切换浮岛 (HorizontalFloatingAppBar)
            com.taskorbit.ui.components.TaskOrbitFloatingAppBar(
                expanded = isAppBarExpanded,
                onClick = { isAppBarExpanded = true },
                modifier = Modifier
                    .align(Alignment.TopCenter)
                    .padding(top = 4.dp),
                trailingContent = if (mode == CalendarMode.WEEK) {
                    {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp),
                            modifier = Modifier.padding(start = 4.dp)
                        ) {
                            Box(
                                modifier = Modifier
                                    .height(18.dp)
                                    .width(1.dp)
                                    .background(MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.6f))
                            )
                            ButtonGroup(
                                horizontalArrangement = Arrangement.spacedBy(2.dp)
                            ) {
                                val subModes = listOf(WeekCalendarMode.PLANS to "计划", WeekCalendarMode.GANTT to "甘特")
                                subModes.forEach { (wm, label) ->
                                    val isSelected = weekMode == wm
                                    TonalToggleButton(
                                        checked = isSelected,
                                        onCheckedChange = { viewModel.weekMode.value = wm },
                                        modifier = Modifier.height(32.dp)
                                    ) {
                                        Text(label, style = MaterialTheme.typography.labelSmall)
                                    }
                                }
                            }
                        }
                    }
                } else null
            ) {
                val motionScheme = MaterialTheme.motionScheme
                val effectsFloatSpec = motionScheme.fastEffectsSpec<Float>()
                val spatialFloatSpec = motionScheme.defaultSpatialSpec<Float>()

                AnimatedContent(
                    targetState = isAppBarExpanded,
                    transitionSpec = {
                        (fadeIn(effectsFloatSpec) + scaleIn(initialScale = 0.88f, animationSpec = spatialFloatSpec))
                            .togetherWith(fadeOut(effectsFloatSpec) + scaleOut(targetScale = 0.88f, animationSpec = spatialFloatSpec))
                    },
                    contentAlignment = Alignment.Center,
                    label = "floatingAppBarContentTransition"
                ) { expandedState ->
                    if (!expandedState) {
                        // 紧凑指示点模式：展示 3 个指示点（高亮当前激活的模式）+ 模式微标签，释放垂直阅读空间
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Outlined.CalendarMonth,
                                contentDescription = "展开视图切换",
                                tint = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.size(16.dp)
                            )
                            val currentModeIndex = when (mode) {
                                CalendarMode.DAY -> 0
                                CalendarMode.WEEK -> 1
                                CalendarMode.MONTH -> 2
                            }
                            Row(
                                horizontalArrangement = Arrangement.spacedBy(4.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                repeat(3) { index ->
                                    val isCurrent = index == currentModeIndex
                                    Box(
                                        modifier = Modifier
                                            .size(if (isCurrent) 8.dp else 5.dp)
                                            .clip(ShapeTokens.Full)
                                            .background(
                                                if (isCurrent) MaterialTheme.colorScheme.primary
                                                else MaterialTheme.colorScheme.outlineVariant
                                            )
                                    )
                                }
                            }
                            Text(
                                text = when (mode) {
                                    CalendarMode.DAY -> "日"
                                    CalendarMode.WEEK -> if (weekMode == WeekCalendarMode.PLANS) "周·计划" else "周·甘特"
                                    CalendarMode.MONTH -> "月"
                                },
                                style = MaterialTheme.typography.labelSmall,
                                fontWeight = FontWeight.Medium,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                        }
                    } else {
                        // 展开态：Expressive 胶囊按钮组
                        ButtonGroup(
                            horizontalArrangement = Arrangement.spacedBy(2.dp)
                        ) {
                            val modes = listOf(CalendarMode.DAY to "日", CalendarMode.WEEK to "周", CalendarMode.MONTH to "月")
                            modes.forEach { (m, label) ->
                                val isSelected = mode == m
                                TonalToggleButton(
                                    checked = isSelected,
                                    onCheckedChange = { viewModel.setMode(m) },
                                    modifier = Modifier.height(32.dp)
                                ) {
                                    Text(label, style = MaterialTheme.typography.labelMedium)
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // 新建 / 编辑计划 BottomSheet
    if (isPlanFormOpen) {
        PlanFormBottomSheet(viewModel = viewModel)
    }

    // 日历显示配置弹层
    if (showSettingsSheet) {
        CalendarSettingsSheet(
            settings = settings,
            onSave = { updatedSettings ->
                viewModel.saveCalendarSettings(updatedSettings)
                showSettingsSheet = false
            },
            onDismiss = { showSettingsSheet = false }
        )
    }
}

/**
 * 动态时间波浪轴（Timeline Wave Cursor）：
 * 表达“时间正在流淌”的设计意图，由左侧脉冲呼吸指示光晕与右侧动态起伏的水平正弦波浪线组合而成。
 */
@Composable
private fun TimelineWaveCursor(
    modifier: Modifier = Modifier,
    color: Color = MaterialTheme.colorScheme.error
) {
    val infiniteTransition = rememberInfiniteTransition(label = "timelineWave")

    // 水平正弦波相位循环（0 到 2π，持续 3200ms）
    val wavePhase by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = (2f * Math.PI).toFloat(),
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 3200, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "wavePhase"
    )

    // 微弱起伏的呼吸振幅（1.8dp ~ 3.2dp，持续 2400ms）
    val breathingAmp by infiniteTransition.animateFloat(
        initialValue = 1.8f,
        targetValue = 3.2f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 2400, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "breathingAmp"
    )

    // 头部脉冲光晕缩放（1.0x ~ 1.45x）
    val haloScale by infiniteTransition.animateFloat(
        initialValue = 1.0f,
        targetValue = 1.45f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 1800, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "haloScale"
    )

    // 头部脉冲光晕透明度呼吸（0.40f ~ 0.08f）
    val haloAlpha by infiniteTransition.animateFloat(
        initialValue = 0.40f,
        targetValue = 0.08f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 1800, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "haloAlpha"
    )

    Row(
        modifier = modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // 左侧指示头：脉冲呼吸光晕 + 实体核心圆点
        Box(
            modifier = Modifier.size(16.dp),
            contentAlignment = Alignment.Center
        ) {
            Box(
                modifier = Modifier
                    .size(14.dp)
                    .graphicsLayer {
                        scaleX = haloScale
                        scaleY = haloScale
                        alpha = haloAlpha
                    }
                    .clip(ShapeTokens.Full)
                    .background(color)
            )
            Box(
                modifier = Modifier
                    .size(7.dp)
                    .clip(ShapeTokens.Full)
                    .background(color)
            )
        }

        // 右侧流淌波浪线：Canvas 实时绘制背景微光导轨与动态正弦波痕迹
        Canvas(
            modifier = Modifier
                .weight(1f)
                .height(16.dp)
                .padding(start = 2.dp)
        ) {
            val width = size.width
            val centerY = size.height / 2f
            val wavelengthPx = 32.dp.toPx()
            val ampPx = breathingAmp.dp.toPx()

            // 柔和的时间基准导轨微光线
            drawLine(
                color = color.copy(alpha = 0.22f),
                start = Offset(0f, centerY),
                end = Offset(width, centerY),
                strokeWidth = 1.dp.toPx()
            )

            // 动态流动的起伏波浪
            val path = Path()
            val startY = centerY + kotlin.math.sin(-wavePhase) * ampPx
            path.moveTo(0f, startY)

            var x = 2f
            val step = 3f
            while (x <= width) {
                val angle = (x / wavelengthPx) * (2f * Math.PI.toFloat()) - wavePhase
                val y = centerY + kotlin.math.sin(angle) * ampPx
                path.lineTo(x, y)
                x += step
            }
            if (x < width + step) {
                val angle = (width / wavelengthPx) * (2f * Math.PI.toFloat()) - wavePhase
                val y = centerY + kotlin.math.sin(angle) * ampPx
                path.lineTo(width, y)
            }

            drawPath(
                path = path,
                brush = Brush.horizontalGradient(
                    colors = listOf(
                        color,
                        color.copy(alpha = 0.9f),
                        color.copy(alpha = 0.45f)
                    )
                ),
                style = Stroke(
                    width = 2.dp.toPx(),
                    cap = StrokeCap.Round,
                    join = StrokeJoin.Round
                )
            )
        }
    }
}

/**
 * 带有果冻弹性吸附（Overshoot Snap）的拖拽时间块：
 * 长按激活拖拽，随手势移动并在释放时应用 MaterialTheme.motionScheme.defaultSpatialSpec()
 * 带轻微果冻回弹吸附至最近的 15 分钟刻度槽位，同步触发日程时间重排。
 */
@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
private fun DraggablePlanBlock(
    plan: DailyPlan,
    startHour: Int,
    endHour: Int,
    hourHeight: Dp,
    layout: com.taskorbit.domain.PlanColumnLayout,
    accent: Color,
    onPlanClick: (DailyPlan) -> Unit,
    onReschedulePlan: (String, String, String) -> Unit,
    modifier: Modifier = Modifier
) {
    val density = LocalDensity.current
    val coroutineScope = rememberCoroutineScope()
    val floatSpringSpec = MaterialTheme.motionScheme.defaultSpatialSpec<Float>()
    val fastEffectsSpec = MaterialTheme.motionScheme.fastEffectsSpec<Dp>()
    val fastSpatialSpec = MaterialTheme.motionScheme.fastSpatialSpec<Float>()

    // 使用 rememberUpdatedState 防止 pointerInput 协程闭包捕获陈旧的参数值
    val currentPlan by rememberUpdatedState(plan)
    val currentOnReschedule by rememberUpdatedState(onReschedulePlan)
    val currentFloatSpringSpec by rememberUpdatedState(floatSpringSpec)

    val origStartMin = CalendarModel.timeToMinutes(plan.startTime)
    val origEndMin = CalendarModel.timeToMinutes(plan.endTime)
    val clampedStartMin = maxOf(origStartMin, startHour * 60)
    val clampedEndMin = minOf(origEndMin, endHour * 60)
    val startMin = clampedStartMin - startHour * 60
    val durationMin = (clampedEndMin - clampedStartMin).coerceAtLeast(15)

    val baseTopOffsetDp = (startMin.toFloat() / 60f) * hourHeight.value
    val blockHeightDp = (durationMin.toFloat() / 60f) * hourHeight.value

    val hourHeightPx = with(density) { hourHeight.toPx() }
    val minutesPerPx = 60f / hourHeightPx

    val animSpringOffset = remember { Animatable(0f) }
    var dragOffsetY by remember { mutableFloatStateOf(0f) }
    var isDragging by remember { mutableStateOf(false) }
    var isSettling by remember { mutableStateOf(false) }

    var settlingTargetTopOffsetDp by remember { mutableFloatStateOf(0f) }
    var settlingStartStr by remember { mutableStateOf("") }
    var settlingEndStr by remember { mutableStateOf("") }

    LaunchedEffect(plan.startTime, plan.endTime) {
        if (!isSettling && !isDragging) {
            dragOffsetY = 0f
            animSpringOffset.snapTo(0f)
        }
    }

    val currentDeltaMin = if (isDragging) {
        (dragOffsetY * minutesPerPx).roundToInt()
    } else 0
    val originalStartTotalMin = CalendarModel.timeToMinutes(plan.startTime)
    val planDurationMin = CalendarModel.timeToMinutes(plan.endTime) - originalStartTotalMin
    val rawPreviewStartMin = originalStartTotalMin + currentDeltaMin
    val minStartSlot = startHour * 60
    val maxStart = maxOf(minStartSlot, ((endHour * 60 - planDurationMin) / 15) * 15)
    val snappedPreviewStartMin = (((rawPreviewStartMin + 7) / 15) * 15).coerceIn(minStartSlot, maxStart)
    val snappedPreviewEndMin = snappedPreviewStartMin + planDurationMin

    val previewStartStr = CalendarModel.minutesToTime(snappedPreviewStartMin)
    val previewEndStr = CalendarModel.minutesToTime(snappedPreviewEndMin)

    val displayStartStr = if (isSettling) settlingStartStr else if (isDragging) previewStartStr else plan.startTime
    val displayEndStr = if (isSettling) settlingEndStr else if (isDragging) previewEndStr else plan.endTime

    val elevation by animateDpAsState(
        targetValue = if (isDragging) 8.dp else 0.dp,
        animationSpec = fastEffectsSpec,
        label = "dragElevation"
    )
    val scale by animateFloatAsState(
        targetValue = if (isDragging) 1.03f else 1f,
        animationSpec = fastSpatialSpec,
        label = "dragScale"
    )
    val borderWidth by animateDpAsState(
        targetValue = if (isDragging) 2.dp else 1.dp,
        animationSpec = fastEffectsSpec,
        label = "dragBorderWidth"
    )
    val surfaceColor by animateColorAsState(
        targetValue = if (isDragging) accent.copy(alpha = 0.28f) else accent.copy(alpha = 0.16f),
        animationSpec = MaterialTheme.motionScheme.fastEffectsSpec(),
        label = "dragSurfaceColor"
    )
    val borderColor by animateColorAsState(
        targetValue = if (isDragging) accent else accent.copy(alpha = 0.5f),
        animationSpec = MaterialTheme.motionScheme.fastEffectsSpec(),
        label = "dragBorderColor"
    )

    val activeTopOffsetDp = if (isSettling) settlingTargetTopOffsetDp else baseTopOffsetDp
    val activeOffsetPx = if (isSettling) animSpringOffset.value else dragOffsetY

    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(top = activeTopOffsetDp.dp)
            .height(blockHeightDp.dp)
            .offset { IntOffset(0, activeOffsetPx.roundToInt()) }
            .zIndex(if (isDragging || isSettling) 10f else 1f)
    ) {
        if (layout.column > 0) {
            Spacer(modifier = Modifier.weight(layout.column.toFloat()))
        }

        Surface(
            modifier = Modifier
                .weight(1f)
                .fillMaxHeight()
                .padding(horizontal = 2.dp)
                .graphicsLayer {
                    scaleX = scale
                    scaleY = scale
                }
                .pointerInput(plan.id) {
                    detectDragGesturesAfterLongPress(
                        onDragStart = {
                            isDragging = true
                            isSettling = false
                            dragOffsetY = 0f
                        },
                        onDrag = { change, dragAmount ->
                            change.consume()
                            dragOffsetY += dragAmount.y
                        },
                        onDragEnd = {
                            val finalDragOffsetY = dragOffsetY
                            val origStartMin = CalendarModel.timeToMinutes(currentPlan.startTime)
                            val origEndMin = CalendarModel.timeToMinutes(currentPlan.endTime)
                            val durMin = (origEndMin - origStartMin).coerceAtLeast(15)
                            val deltaMin = (finalDragOffsetY * minutesPerPx).roundToInt()
                            val rawStartMin = origStartMin + deltaMin
                            val minStartSlot = startHour * 60
                            val maxStartSlot = maxOf(minStartSlot, ((endHour * 60 - durMin) / 15) * 15)
                            val targetStartMin = (((rawStartMin + 7) / 15) * 15).coerceIn(minStartSlot, maxStartSlot)
                            val targetEndMin = targetStartMin + durMin

                            val targetSnapOffsetY = ((targetStartMin - origStartMin).toFloat() / 60f) * hourHeightPx

                            val targetStartStr = CalendarModel.minutesToTime(targetStartMin)
                            val targetEndStr = CalendarModel.minutesToTime(targetEndMin)

                            val targetTopDp = (targetStartMin - startHour * 60).toFloat() / 60f * hourHeight.value
                            val initialSpringOffset = finalDragOffsetY - targetSnapOffsetY

                            settlingTargetTopOffsetDp = targetTopDp
                            settlingStartStr = targetStartStr
                            settlingEndStr = targetEndStr

                            coroutineScope.launch {
                                isSettling = true
                                isDragging = false
                                dragOffsetY = 0f

                                // 立即提交变更到数据层，后台异步持久化与重排，避免等待动画完成后才提交造成停顿
                                if (targetStartStr != currentPlan.startTime || targetEndStr != currentPlan.endTime) {
                                    currentOnReschedule(currentPlan.id, targetStartStr, targetEndStr)
                                }

                                // 果冻超调吸附：从松手位置无缝弹簧落位至槽位中心，基准锚定在目标槽位，彻底消除双重偏移闪烁
                                animSpringOffset.snapTo(initialSpringOffset)
                                animSpringOffset.animateTo(
                                    targetValue = 0f,
                                    animationSpec = currentFloatSpringSpec
                                )

                                isSettling = false
                            }
                        },
                        onDragCancel = {
                            coroutineScope.launch {
                                isSettling = true
                                isDragging = false
                                settlingTargetTopOffsetDp = baseTopOffsetDp
                                animSpringOffset.snapTo(dragOffsetY)
                                dragOffsetY = 0f
                                animSpringOffset.animateTo(0f, animationSpec = currentFloatSpringSpec)
                                isSettling = false
                            }
                        }
                    )
                }
                .clickable(enabled = !isDragging && !isSettling) { onPlanClick(plan) },
            shape = ShapeTokens.Small,
            color = surfaceColor,
            border = BorderStroke(width = borderWidth, color = borderColor),
            shadowElevation = elevation
        ) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 6.dp, vertical = 4.dp)
            ) {
                if (blockHeightDp < 32f) {
                    Row(
                        modifier = Modifier.fillMaxSize(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(
                            text = plan.name,
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurface,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                            modifier = Modifier.weight(1f)
                        )
                        Text(
                            text = if (isDragging || isSettling) "$displayStartStr-$displayEndStr" else plan.startTime,
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                } else {
                    Column(modifier = Modifier.fillMaxSize()) {
                        Text(
                            text = plan.name,
                            style = MaterialTheme.typography.titleSmall,
                            color = MaterialTheme.colorScheme.onSurface,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                            textDecoration = if (plan.done) TextDecoration.LineThrough else TextDecoration.None
                        )
                        Text(
                            text = if (isDragging || isSettling) "$displayStartStr-$displayEndStr" else "${plan.startTime}-${plan.endTime}",
                            style = MaterialTheme.typography.labelSmall,
                            color = if (isDragging || isSettling) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
                            fontWeight = if (isDragging || isSettling) FontWeight.Bold else FontWeight.Normal
                        )
                    }
                }

                // 拖拽过程中在右上角显示实时吸附时间胶囊
                if (isDragging) {
                    Surface(
                        modifier = Modifier
                            .align(Alignment.TopEnd)
                            .padding(2.dp),
                        shape = ShapeTokens.Full,
                        color = MaterialTheme.colorScheme.primary,
                        contentColor = MaterialTheme.colorScheme.onPrimary,
                        shadowElevation = 4.dp
                    ) {
                        Text(
                            text = previewStartStr,
                            style = MaterialTheme.typography.labelSmall,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }
        }

        val trailingCount = layout.columnCount - 1 - layout.column
        if (trailingCount > 0) {
            Spacer(modifier = Modifier.weight(trailingCount.toFloat()))
        }
    }
}

/**
 * 日视图：垂直 24 小时时间轴与分列计划块（支持果冻拖拽调整与流淌波浪指示线）
 */
@Composable
private fun DayTimelineView(
    settings: Settings,
    currentDate: LocalDate,
    plans: List<DailyPlan>,
    onPlanClick: (DailyPlan) -> Unit,
    onToggleDone: (String, Boolean) -> Unit,
    onDeletePlan: (String) -> Unit,
    onReschedulePlan: (String, String, String) -> Unit,
    getProjectColor: (String?) -> String,
    modifier: Modifier = Modifier
) {
    val hourHeight = 64.dp
    val density = LocalDensity.current
    val today = remember { LocalDate.now() }
    val isToday = currentDate == today

    // 每 15 秒更新一次当前时刻，使指示线平滑随时间推进
    var currentTime by remember { mutableStateOf(LocalTime.now()) }
    LaunchedEffect(isToday) {
        if (isToday) {
            while (true) {
                currentTime = LocalTime.now()
                delay(15_000)
            }
        }
    }

    // 按照用户设置严格显示日视图时间范围
    val startHour = settings.dayStartHour
    val endHour = settings.dayEndHour

    val visiblePlans = remember(plans, startHour, endHour) {
        plans.filter { plan ->
            val pStart = CalendarModel.timeToMinutes(plan.startTime)
            val pEnd = CalendarModel.timeToMinutes(plan.endTime)
            pEnd > startHour * 60 && pStart < endHour * 60
        }
    }
    val layouts = remember(visiblePlans) { CalendarModel.layoutPlanColumns(visiblePlans) }

    val scrollState = rememberScrollState()

    // 初始进入或切换至今天时，平滑自动滚动居中当前时间线，避免停留在顶部看不见指示线
    LaunchedEffect(isToday, startHour) {
        if (isToday) {
            val currentMinutes = currentTime.hour * 60 + currentTime.minute
            val visibleStartMinutes = startHour * 60
            val offsetDp = ((currentMinutes - visibleStartMinutes).toFloat() / 60f) * hourHeight.value
            val targetScrollDp = maxOf(0f, offsetDp - 140f)
            val targetScrollPx = with(density) { targetScrollDp.dp.roundToPx() }
            scrollState.animateScrollTo(targetScrollPx)
        }
    }

    Box(modifier = modifier.verticalScroll(scrollState)) {
        // 小时背景线
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(start = 54.dp, end = 16.dp, top = 16.dp, bottom = 88.dp)
        ) {
            for (hour in startHour until endHour) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(hourHeight)
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(1.dp)
                            .background(MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
                    )
                }
            }
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(1.dp)
                    .background(MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
            )
        }

        // 小时时间文字标注
        Column(
            modifier = Modifier
                .width(54.dp)
                .padding(top = 8.dp)
        ) {
            for (hour in startHour until endHour) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(hourHeight),
                    contentAlignment = Alignment.TopCenter
                ) {
                    Text(
                        text = String.format("%02d:00", hour),
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
            Box(
                modifier = Modifier.fillMaxWidth(),
                contentAlignment = Alignment.TopCenter
            ) {
                Text(
                    text = String.format("%02d:00", endHour),
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }

        // 渲染计划色块
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .padding(start = 60.dp, end = 16.dp, top = 16.dp)
        ) {
            if (visiblePlans.isEmpty()) {
                Surface(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 32.dp, end = 16.dp),
                    shape = ShapeTokens.Medium,
                    color = MaterialTheme.colorScheme.surfaceContainerHigh.copy(alpha = 0.7f)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Outlined.CalendarMonth,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(20.dp)
                        )
                        Text(
                            text = if (plans.isEmpty()) "今日暂无日程计划，点击右下角按钮添加安排" else "当前时间段内暂无计划安排",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            } else {
                visiblePlans.forEach { plan ->
                    key(plan.id) {
                        val layout = layouts[plan.id] ?: com.taskorbit.domain.PlanColumnLayout(0, 1)
                        val colorKey = getProjectColor(plan.projectId)
                        val accent = PROJECT_COLOR_MAP[colorKey] ?: MaterialTheme.colorScheme.primary

                        DraggablePlanBlock(
                            plan = plan,
                            startHour = startHour,
                            endHour = endHour,
                            hourHeight = hourHeight,
                            layout = layout,
                            accent = accent,
                            onPlanClick = onPlanClick,
                            onReschedulePlan = onReschedulePlan
                        )
                    }
                }
            }
        }

        // 动态时间波浪轴（Timeline Wave Cursor）
        if (isToday) {
            val currentMinutes = currentTime.hour * 60 + currentTime.minute
            val visibleStartMinutes = startHour * 60
            val visibleEndMinutes = endHour * 60
            if (currentMinutes in visibleStartMinutes..visibleEndMinutes) {
                val currentOffsetDp = ((currentMinutes - visibleStartMinutes).toFloat() / 60f) * hourHeight.value
                TimelineWaveCursor(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(start = 46.dp, end = 16.dp)
                        .offset {
                            IntOffset(
                                x = 0,
                                y = (8f + currentOffsetDp).dp.roundToPx()
                            )
                        }
                        .zIndex(20f),
                    color = MaterialTheme.colorScheme.error
                )
            }
        }
    }
}

/**
 * 周视图 24 小时排期色块（支持跨天横向拖拽与纵向 15 分钟槽位吸附）
 */
@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
private fun DraggableWeekPlanBlock(
    startHour: Int,
    endHour: Int,
    plan: DailyPlan,
    dayIndex: Int,
    daysOfWeek: List<LocalDate>,
    columnWidth: Dp,
    hourHeight: Dp,
    hourGutterWidth: Dp,
    layout: com.taskorbit.domain.PlanColumnLayout,
    accent: Color,
    onPlanClick: (DailyPlan) -> Unit,
    onReschedulePlan: (String, String, String, String?) -> Unit,
    modifier: Modifier = Modifier
) {
    val density = LocalDensity.current
    val coroutineScope = rememberCoroutineScope()
    val floatSpringSpec = MaterialTheme.motionScheme.defaultSpatialSpec<Float>()
    val fastEffectsSpec = MaterialTheme.motionScheme.fastEffectsSpec<Dp>()
    val fastSpatialSpec = MaterialTheme.motionScheme.fastSpatialSpec<Float>()

    val currentPlan by rememberUpdatedState(plan)
    val currentOnReschedule by rememberUpdatedState(onReschedulePlan)
    val currentFloatSpringSpec by rememberUpdatedState(floatSpringSpec)

    val origStartMin = CalendarModel.timeToMinutes(plan.startTime)
    val origEndMin = CalendarModel.timeToMinutes(plan.endTime)
    val clampedStartMin = maxOf(origStartMin, startHour * 60)
    val clampedEndMin = minOf(origEndMin, endHour * 60)
    val startMin = clampedStartMin - startHour * 60
    val durationMin = (clampedEndMin - clampedStartMin).coerceAtLeast(15)

    val baseTopOffsetDp = (startMin.toFloat() / 60f) * hourHeight.value
    val blockHeightDp = (durationMin.toFloat() / 60f) * hourHeight.value

    val subColWidthDp = columnWidth / layout.columnCount
    val baseLeftOffsetDp = hourGutterWidth + (columnWidth * dayIndex) + (subColWidthDp * layout.column)
    val blockWidthDp = (subColWidthDp - 2.dp).coerceAtLeast(8.dp)

    val hourHeightPx = with(density) { hourHeight.toPx() }
    val colWidthPx = with(density) { columnWidth.toPx() }
    val minutesPerPx = 60f / hourHeightPx

    val animSpringOffsetY = remember { Animatable(0f) }
    val animSpringOffsetX = remember { Animatable(0f) }
    var dragOffsetY by remember { mutableFloatStateOf(0f) }
    var dragOffsetX by remember { mutableFloatStateOf(0f) }
    var isDragging by remember { mutableStateOf(false) }
    var isSettling by remember { mutableStateOf(false) }

    var settlingTargetTopDp by remember { mutableFloatStateOf(0f) }
    var settlingTargetLeftDp by remember { mutableFloatStateOf(0f) }
    var settlingStartStr by remember { mutableStateOf("") }
    var settlingEndStr by remember { mutableStateOf("") }
    var settlingDayName by remember { mutableStateOf("") }

    LaunchedEffect(plan.startTime, plan.endTime, plan.date) {
        if (!isSettling && !isDragging) {
            dragOffsetY = 0f
            dragOffsetX = 0f
            animSpringOffsetY.snapTo(0f)
            animSpringOffsetX.snapTo(0f)
        }
    }

    val currentDeltaMin = if (isDragging) (dragOffsetY * minutesPerPx).roundToInt() else 0
    val originalStartTotalMin = CalendarModel.timeToMinutes(plan.startTime)
    val planDurationMin = (CalendarModel.timeToMinutes(plan.endTime) - originalStartTotalMin).coerceAtLeast(15)
    val rawPreviewStartMin = originalStartTotalMin + currentDeltaMin
    val minStartSlot = startHour * 60
    val maxStart = maxOf(minStartSlot, ((endHour * 60 - planDurationMin) / 15) * 15)
    val snappedPreviewStartMin = (((rawPreviewStartMin + 7) / 15) * 15).coerceIn(minStartSlot, maxStart)
    val snappedPreviewEndMin = snappedPreviewStartMin + planDurationMin

    val previewStartStr = CalendarModel.minutesToTime(snappedPreviewStartMin)
    val previewEndStr = CalendarModel.minutesToTime(snappedPreviewEndMin)

    val dayShift = if (isDragging) (dragOffsetX / colWidthPx).roundToInt() else 0
    val targetDayIndex = (dayIndex + dayShift).coerceIn(0, daysOfWeek.size - 1)
    val targetDay = daysOfWeek[targetDayIndex]
    val targetDayName = when (targetDay.dayOfWeek) {
        java.time.DayOfWeek.SUNDAY -> "周日"
        java.time.DayOfWeek.MONDAY -> "周一"
        java.time.DayOfWeek.TUESDAY -> "周二"
        java.time.DayOfWeek.WEDNESDAY -> "周三"
        java.time.DayOfWeek.THURSDAY -> "周四"
        java.time.DayOfWeek.FRIDAY -> "周五"
        java.time.DayOfWeek.SATURDAY -> "周六"
    }

    val displayStartStr = if (isSettling) settlingStartStr else if (isDragging) previewStartStr else plan.startTime
    val displayDayName = if (isSettling) settlingDayName else if (isDragging) targetDayName else ""

    val elevation by animateDpAsState(
        targetValue = if (isDragging) 8.dp else 0.dp,
        animationSpec = fastEffectsSpec,
        label = "weekDragElevation"
    )
    val scale by animateFloatAsState(
        targetValue = if (isDragging) 1.03f else 1f,
        animationSpec = fastSpatialSpec,
        label = "weekDragScale"
    )
    val borderWidth by animateDpAsState(
        targetValue = if (isDragging) 2.dp else 1.dp,
        animationSpec = fastEffectsSpec,
        label = "weekDragBorderWidth"
    )
    val surfaceColor by animateColorAsState(
        targetValue = if (isDragging) accent.copy(alpha = 0.42f) else accent.copy(alpha = 0.22f),
        animationSpec = MaterialTheme.motionScheme.fastEffectsSpec(),
        label = "weekDragSurfaceColor"
    )
    val borderColor by animateColorAsState(
        targetValue = if (isDragging) accent else accent.copy(alpha = 0.55f),
        animationSpec = MaterialTheme.motionScheme.fastEffectsSpec(),
        label = "weekDragBorderColor"
    )

    val activeTopOffsetDp = if (isSettling) settlingTargetTopDp else baseTopOffsetDp
    val activeLeftOffsetDp = if (isSettling) settlingTargetLeftDp else baseLeftOffsetDp.value
    val activeOffsetYPx = if (isSettling) animSpringOffsetY.value else dragOffsetY
    val activeOffsetXPx = if (isSettling) animSpringOffsetX.value else dragOffsetX

    Box(
        modifier = modifier
            .offset(x = activeLeftOffsetDp.dp, y = activeTopOffsetDp.dp)
            .width(blockWidthDp)
            .height(blockHeightDp.dp)
            .offset { IntOffset(activeOffsetXPx.roundToInt(), activeOffsetYPx.roundToInt()) }
            .zIndex(if (isDragging || isSettling) 15f else 1f)
    ) {
        Surface(
            modifier = Modifier
                .fillMaxSize()
                .graphicsLayer {
                    scaleX = scale
                    scaleY = scale
                }
                .pointerInput(plan.id) {
                    detectDragGesturesAfterLongPress(
                        onDragStart = {
                            isDragging = true
                            isSettling = false
                            dragOffsetY = 0f
                            dragOffsetX = 0f
                        },
                        onDrag = { change, dragAmount ->
                            change.consume()
                            dragOffsetY += dragAmount.y
                            dragOffsetX += dragAmount.x
                        },
                        onDragEnd = {
                            val finalDragOffsetY = dragOffsetY
                            val finalDragOffsetX = dragOffsetX
                            val origStartMin = CalendarModel.timeToMinutes(currentPlan.startTime)
                            val origEndMin = CalendarModel.timeToMinutes(currentPlan.endTime)
                            val durMin = (origEndMin - origStartMin).coerceAtLeast(15)

                            val dMin = (finalDragOffsetY * minutesPerPx).roundToInt()
                            val rStartMin = origStartMin + dMin
                            val minStartSlot = startHour * 60
                            val maxStartSlot = maxOf(minStartSlot, ((endHour * 60 - durMin) / 15) * 15)
                            val targetStartMin = (((rStartMin + 7) / 15) * 15).coerceIn(minStartSlot, maxStartSlot)
                            val targetEndMin = targetStartMin + durMin

                            val dShift = (finalDragOffsetX / colWidthPx).roundToInt()
                            val tDayIndex = (dayIndex + dShift).coerceIn(0, daysOfWeek.size - 1)
                            val tDay = daysOfWeek[tDayIndex]
                            val tDayIso = tDay.format(DateTimeFormatter.ofPattern("yyyy-MM-dd"))

                            val targetSnapOffsetY = ((targetStartMin - origStartMin).toFloat() / 60f) * hourHeightPx
                            val targetSnapOffsetX = (tDayIndex - dayIndex) * colWidthPx

                            val targetStartStr = CalendarModel.minutesToTime(targetStartMin)
                            val targetEndStr = CalendarModel.minutesToTime(targetEndMin)

                            val targetTopDp = ((targetStartMin - startHour * 60).toFloat() / 60f) * hourHeight.value
                            val targetLeftDp = (hourGutterWidth + columnWidth * tDayIndex + subColWidthDp * layout.column).value

                            val initialSpringOffsetY = finalDragOffsetY - targetSnapOffsetY
                            val initialSpringOffsetX = finalDragOffsetX - targetSnapOffsetX

                            settlingTargetTopDp = targetTopDp
                            settlingTargetLeftDp = targetLeftDp
                            settlingStartStr = targetStartStr
                            settlingEndStr = targetEndStr
                            settlingDayName = when (tDay.dayOfWeek) {
                                java.time.DayOfWeek.SUNDAY -> "周日"
                                java.time.DayOfWeek.MONDAY -> "周一"
                                java.time.DayOfWeek.TUESDAY -> "周二"
                                java.time.DayOfWeek.WEDNESDAY -> "周三"
                                java.time.DayOfWeek.THURSDAY -> "周四"
                                java.time.DayOfWeek.FRIDAY -> "周五"
                                java.time.DayOfWeek.SATURDAY -> "周六"
                            }

                            coroutineScope.launch {
                                isSettling = true
                                isDragging = false
                                dragOffsetY = 0f
                                dragOffsetX = 0f

                                if (targetStartStr != currentPlan.startTime || targetEndStr != currentPlan.endTime || tDayIso != currentPlan.date) {
                                    currentOnReschedule(currentPlan.id, targetStartStr, targetEndStr, tDayIso)
                                }

                                animSpringOffsetY.snapTo(initialSpringOffsetY)
                                animSpringOffsetX.snapTo(initialSpringOffsetX)

                                launch { animSpringOffsetY.animateTo(0f, currentFloatSpringSpec) }
                                launch { animSpringOffsetX.animateTo(0f, currentFloatSpringSpec) }

                                isSettling = false
                            }
                        },
                        onDragCancel = {
                            coroutineScope.launch {
                                isSettling = true
                                isDragging = false
                                settlingTargetTopDp = baseTopOffsetDp
                                settlingTargetLeftDp = baseLeftOffsetDp.value
                                animSpringOffsetY.snapTo(dragOffsetY)
                                animSpringOffsetX.snapTo(dragOffsetX)
                                dragOffsetY = 0f
                                dragOffsetX = 0f
                                launch { animSpringOffsetY.animateTo(0f, currentFloatSpringSpec) }
                                launch { animSpringOffsetX.animateTo(0f, currentFloatSpringSpec) }
                                isSettling = false
                            }
                        }
                    )
                }
                .clickable(enabled = !isDragging && !isSettling) { onPlanClick(plan) },
            shape = ShapeTokens.Small,
            color = surfaceColor,
            border = BorderStroke(width = borderWidth, color = borderColor),
            shadowElevation = elevation
        ) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 4.dp, vertical = 2.dp)
            ) {
                Column(modifier = Modifier.fillMaxSize()) {
                    Text(
                        text = plan.name,
                        style = TextStyle(fontSize = 11.sp, fontWeight = FontWeight.SemiBold),
                        color = MaterialTheme.colorScheme.onSurface,
                        maxLines = if (blockHeightDp > 36f) 2 else 1,
                        overflow = TextOverflow.Ellipsis,
                        textDecoration = if (plan.done) TextDecoration.LineThrough else TextDecoration.None
                    )
                    if (blockHeightDp >= 30f) {
                        Text(
                            text = if (isDragging || isSettling) displayStartStr else plan.startTime,
                            style = TextStyle(fontSize = 10.sp),
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }

                // 拖拽过程中的实时浮动胶囊
                if (isDragging) {
                    Surface(
                        modifier = Modifier
                            .align(Alignment.TopEnd)
                            .offset(y = (-10).dp),
                        shape = ShapeTokens.Full,
                        color = MaterialTheme.colorScheme.primary,
                        contentColor = MaterialTheme.colorScheme.onPrimary,
                        shadowElevation = 4.dp
                    ) {
                        Text(
                            text = "$displayDayName $displayStartStr",
                            style = TextStyle(fontSize = 9.sp, fontWeight = FontWeight.Bold),
                            modifier = Modifier.padding(horizontal = 5.dp, vertical = 1.dp)
                        )
                    }
                }
            }
        }
    }
}

/**
 * 周视图 - 24 小时 7 列排期网格（支持整点时间标尺与拖拽跨天改期）
 */
@Composable
private fun WeekPlansView(
    settings: Settings,
    daysOfWeek: List<LocalDate>,
    plansOfWeek: Map<LocalDate, List<DailyPlan>>,
    selectedDate: LocalDate,
    onSelectDate: (LocalDate) -> Unit,
    onPlanClick: (DailyPlan) -> Unit,
    onToggleDone: (String, Boolean) -> Unit,
    onReschedulePlan: (String, String, String, String?) -> Unit,
    getProjectColor: (String?) -> String,
    modifier: Modifier = Modifier
) {
    val today = LocalDate.now()
    val hourHeight = 60.dp
    val hourGutterWidth = 38.dp
    val startHour = settings.weekDetailStartHour
    val endHour = settings.weekDetailEndHour
    val totalHeight = hourHeight * (endHour - startHour)
    val density = LocalDensity.current
    val vScrollState = rememberScrollState()

    // 默认平滑滚动至上午 8 点
    LaunchedEffect(startHour) {
        val targetScrollY = with(density) { (hourHeight * (8 - startHour).coerceAtLeast(0)).toPx() }.roundToInt()
        vScrollState.scrollTo(targetScrollY)
    }

    Column(modifier = modifier.fillMaxSize()) {
        // 固定周表头：星期与公历日期
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(MaterialTheme.colorScheme.surface)
                .padding(vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Spacer(modifier = Modifier.width(hourGutterWidth))

            daysOfWeek.forEach { day ->
                val isToday = day == today
                val isSelected = day == selectedDate
                val weekDayName = when (day.dayOfWeek) {
                    java.time.DayOfWeek.SUNDAY -> "日"
                    java.time.DayOfWeek.MONDAY -> "一"
                    java.time.DayOfWeek.TUESDAY -> "二"
                    java.time.DayOfWeek.WEDNESDAY -> "三"
                    java.time.DayOfWeek.THURSDAY -> "四"
                    java.time.DayOfWeek.FRIDAY -> "五"
                    java.time.DayOfWeek.SATURDAY -> "六"
                }

                Column(
                    modifier = Modifier
                        .weight(1f)
                        .clickable { onSelectDate(day) },
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        text = weekDayName,
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(modifier = Modifier.height(2.dp))
                    Box(
                        modifier = Modifier
                            .size(28.dp)
                            .clip(CircleShape)
                            .background(
                                when {
                                    isToday -> MaterialTheme.colorScheme.primary
                                    isSelected -> MaterialTheme.colorScheme.primaryContainer
                                    else -> Color.Transparent
                                }
                            ),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "${day.dayOfMonth}",
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = if (isToday || isSelected) FontWeight.Bold else FontWeight.Normal,
                            color = when {
                                isToday -> MaterialTheme.colorScheme.onPrimary
                                isSelected -> MaterialTheme.colorScheme.onPrimaryContainer
                                else -> MaterialTheme.colorScheme.onSurface
                            }
                        )
                    }
                }
            }
        }

        // 分割线
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(0.8.dp)
                .background(MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f))
        )

        // 24 小时 7 列时间网格
        BoxWithConstraints(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f)
                .verticalScroll(vScrollState)
                .padding(bottom = 88.dp)
        ) {
            val availableWidth = maxWidth - hourGutterWidth
            val columnWidth = availableWidth / 7

            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(totalHeight + 16.dp)
            ) {
                // 1. 小时标尺与整点横向对齐线
                for (h in startHour until endHour) {
                    val topOffset = hourHeight * (h - startHour)

                    // 整点小时标签
                    Box(
                        modifier = Modifier
                            .width(hourGutterWidth)
                            .offset(y = topOffset)
                            .padding(end = 6.dp),
                        contentAlignment = Alignment.TopEnd
                    ) {
                        Text(
                            text = String.format("%02d", h),
                            style = TextStyle(fontSize = 11.sp, fontWeight = FontWeight.Normal),
                            color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f)
                        )
                    }

                    // 整点横向辅助线
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .offset(y = topOffset)
                            .padding(start = hourGutterWidth)
                            .height(0.8.dp)
                            .background(MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.35f))
                    )
                }

                // 底部闭合小时标签与横线
                val bottomOffset = hourHeight * (endHour - startHour)
                Box(
                    modifier = Modifier
                        .width(hourGutterWidth)
                        .offset(y = bottomOffset)
                        .padding(end = 6.dp),
                    contentAlignment = Alignment.TopEnd
                ) {
                    Text(
                        text = String.format("%02d", endHour),
                        style = TextStyle(fontSize = 11.sp, fontWeight = FontWeight.Normal),
                        color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f)
                    )
                }
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .offset(y = bottomOffset)
                        .padding(start = hourGutterWidth)
                        .height(0.8.dp)
                        .background(MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.35f))
                )

                // 2. 7 列纵向微弱分割线
                for (i in 0..6) {
                    val leftOffset = hourGutterWidth + columnWidth * i
                    Box(
                        modifier = Modifier
                            .offset(x = leftOffset)
                            .width(0.8.dp)
                            .height(bottomOffset)
                            .background(MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.15f))
                    )
                }

                // 3. 各天计划卡片（支持拖拽与重叠分列）
                daysOfWeek.forEachIndexed { dayIdx, day ->
                    val dayPlans = (plansOfWeek[day] ?: emptyList()).filter { plan ->
                        val pStart = CalendarModel.timeToMinutes(plan.startTime)
                        val pEnd = CalendarModel.timeToMinutes(plan.endTime)
                        pEnd > startHour * 60 && pStart < endHour * 60
                    }
                    val layouts = CalendarModel.layoutPlanColumns(dayPlans)

                    dayPlans.forEach { plan ->
                        val layout = layouts[plan.id] ?: com.taskorbit.domain.PlanColumnLayout(0, 1)
                        val colorKey = getProjectColor(plan.projectId)
                        val accent = PROJECT_COLOR_MAP[colorKey] ?: MaterialTheme.colorScheme.primary

                        key(plan.id) {
                            DraggableWeekPlanBlock(
                                startHour = startHour,
                                endHour = endHour,
                                plan = plan,
                                dayIndex = dayIdx,
                                daysOfWeek = daysOfWeek,
                                columnWidth = columnWidth,
                                hourHeight = hourHeight,
                                hourGutterWidth = hourGutterWidth,
                                layout = layout,
                                accent = accent,
                                onPlanClick = onPlanClick,
                                onReschedulePlan = onReschedulePlan
                            )
                        }
                    }
                }
            }
        }
    }
}

/**
 * 周视图 - 甘特图模式
 */
@Composable
private fun WeekGanttView(
    daysOfWeek: List<LocalDate>,
    tasks: List<Task>,
    getProjectColor: (String?) -> String,
    modifier: Modifier = Modifier
) {
    if (tasks.isEmpty()) {
        TaskOrbitEmptyState(
            icon = Icons.Outlined.CalendarMonth,
            title = "本周暂无任务",
            description = "本周内没有起止中的项目任务。",
            modifier = modifier
        )
        return
    }

    val today = LocalDate.now()

    Column(modifier = modifier.padding(bottom = 88.dp)) {
        // 顶部日期头
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(MaterialTheme.colorScheme.surfaceContainer)
                .padding(start = 120.dp, end = 16.dp, top = 8.dp, bottom = 8.dp)
        ) {
            daysOfWeek.forEach { day ->
                val isToday = day == today
                Box(
                    modifier = Modifier
                        .weight(1f),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "${day.dayOfMonth}\n${day.dayOfWeek.name.take(2)}",
                        style = MaterialTheme.typography.labelSmall,
                        textAlign = TextAlign.Center,
                        fontWeight = if (isToday) FontWeight.Bold else FontWeight.Normal,
                        color = if (isToday) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }

        // 甘特条列表
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            items(tasks, key = { it.id }) { task ->
                val range = CalendarModel.taskRangeInWeek(task, daysOfWeek)
                val colorKey = getProjectColor(task.projectId)
                val accent = PROJECT_COLOR_MAP[colorKey] ?: MaterialTheme.colorScheme.primary

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // 任务名称
                    Text(
                        text = task.name,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurface,
                        modifier = Modifier.width(112.dp),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )

                    // 甘特横条
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .height(28.dp)
                    ) {
                        if (range != null) {
                            val startFrac = range.first / 7f
                            val widthFrac = (range.second - range.first + 1) / 7f

                            Row(modifier = Modifier.fillMaxSize()) {
                                if (startFrac > 0f) {
                                    Spacer(modifier = Modifier.fillMaxWidth(startFrac))
                                }
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth(widthFrac)
                                        .fillMaxHeight()
                                        .clip(ShapeTokens.Full)
                                        .background(accent.copy(alpha = 0.85f))
                                        .padding(horizontal = 8.dp),
                                    contentAlignment = Alignment.CenterStart
                                ) {
                                    Text(
                                        text = task.name,
                                        style = MaterialTheme.typography.labelSmall,
                                        color = Color.White,
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
    }
}

/**
 * 月视图：42 天月历网格（展示多天连续横幅任务条）与选中日期任务清单联动
 */
@Composable
private fun MonthCalendarView(
    settings: Settings,
    plansOfDay: List<DailyPlan>,
    onPlanClick: (DailyPlan) -> Unit,
    anchorDate: LocalDate,
    selectedDate: LocalDate,
    monthDays: List<LocalDate>,
    tasks: List<Task>,
    tasksOfDay: List<Task>,
    onSelectDate: (LocalDate) -> Unit,
    onToggleTaskDone: (String, Boolean) -> Unit,
    getProjectColor: (String?) -> String,
    modifier: Modifier = Modifier
) {
    val today = LocalDate.now()
    val currentMonth = anchorDate.monthValue
    val scrollState = key(anchorDate) { rememberScrollState() }

    Column(
        modifier = modifier.verticalScroll(scrollState)
    ) {
        // 星期头：日 一 二 三 四 五 六
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 4.dp, vertical = 6.dp),
            horizontalArrangement = Arrangement.SpaceAround
        ) {
            listOf("日", "一", "二", "三", "四", "五", "六").forEach {
                Text(
                    text = it,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.weight(1f)
                )
            }
        }

        // 42 天网格（按周分行呈现连续跨天横条）
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 4.dp)
        ) {
            val rows = monthDays.chunked(7)
            val dateHeaderHeight = 24.dp
            val slotHeight = 13.dp
            val slotGap = 2.dp
            val slotTopBase = 25.dp
            val weekRowHeight = slotTopBase + (slotHeight + slotGap) * settings.monthMaxTaskTracks + slotGap

            rows.forEach { weekDays ->
                val spanningLayout = CalendarModel.layoutSpanningTasksInWeek(tasks, weekDays, maxVisibleSlots = settings.monthMaxTaskTracks)

                BoxWithConstraints(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(weekRowHeight)
                ) {
                    val columnWidth = maxWidth / 7f

                    // 1. 底层：7 天日期单元格（背景、公历日标头、选中态与点击响应）
                    Row(
                        modifier = Modifier.fillMaxSize(),
                        horizontalArrangement = Arrangement.SpaceAround
                    ) {
                        weekDays.forEach { day ->
                            val isCurrentMonth = day.monthValue == currentMonth
                            val isToday = day == today
                            val isSelected = day == selectedDate

                            Box(
                                modifier = Modifier
                                    .weight(1f)
                                    .fillMaxHeight()
                                    .padding(1.dp)
                                    .clip(ShapeTokens.Small)
                                    .background(
                                        when {
                                            isSelected && !isToday -> MaterialTheme.colorScheme.surfaceContainerHigh
                                            isSelected && isToday -> MaterialTheme.colorScheme.surfaceContainerHighest
                                            else -> Color.Transparent
                                        }
                                    )
                                    .then(
                                        if (isSelected) {
                                            Modifier.border(
                                                width = 1.dp,
                                                color = MaterialTheme.colorScheme.primary.copy(alpha = 0.8f),
                                                shape = ShapeTokens.Small
                                            )
                                        } else Modifier
                                    )
                                    .clickable { onSelectDate(day) },
                                contentAlignment = Alignment.TopCenter
                            ) {
                                // 日期标头
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .height(dateHeaderHeight),
                                    contentAlignment = Alignment.Center
                                ) {
                                    if (isToday) {
                                        Box(
                                            modifier = Modifier
                                                .size(22.dp)
                                                .clip(CircleShape)
                                                .background(MaterialTheme.colorScheme.primary),
                                            contentAlignment = Alignment.Center
                                        ) {
                                            Text(
                                                text = "${day.dayOfMonth}",
                                                style = TextStyle(fontSize = 11.sp, fontWeight = FontWeight.Bold),
                                                color = MaterialTheme.colorScheme.onPrimary
                                            )
                                        }
                                    } else {
                                        Text(
                                            text = "${day.dayOfMonth}",
                                            style = TextStyle(
                                                fontSize = 11.sp,
                                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                                            ),
                                            color = when {
                                                !isCurrentMonth -> MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.38f)
                                                else -> MaterialTheme.colorScheme.onSurface
                                            }
                                        )
                                    }
                                }
                            }
                        }
                    }

                    // 2. 顶层：跨天连续横幅条（Spanning Task Bars）
                    spanningLayout.visibleSegments.forEach { segment ->
                        val startCol = segment.startCol
                        val endCol = segment.endCol
                        val span = endCol - startCol + 1

                        val startMargin = if (segment.isStart) 2.dp else 0.dp
                        val endMargin = if (segment.isEnd) 2.dp else 0.dp

                        val left = columnWidth * startCol + startMargin
                        val width = columnWidth * span - startMargin - endMargin
                        val top = slotTopBase + (slotHeight + slotGap) * segment.slot

                        val barShape = RoundedCornerShape(
                            topStart = if (segment.isStart) 3.dp else 0.dp,
                            bottomStart = if (segment.isStart) 3.dp else 0.dp,
                            topEnd = if (segment.isEnd) 3.dp else 0.dp,
                            bottomEnd = if (segment.isEnd) 3.dp else 0.dp
                        )

                        val colorKey = getProjectColor(segment.task.projectId)
                        val accent = PROJECT_COLOR_MAP[colorKey] ?: MaterialTheme.colorScheme.primary
                        val barColor = accent.copy(alpha = if (segment.task.done) 0.35f else 0.88f)

                        Box(
                            modifier = Modifier
                                .offset(x = left, y = top)
                                .width(width)
                                .height(slotHeight)
                                .clip(barShape)
                                .background(barColor)
                                .clickable { onSelectDate(weekDays[startCol]) }
                                .padding(horizontal = 3.dp),
                            contentAlignment = Alignment.CenterStart
                        ) {
                            Text(
                                text = segment.task.name,
                                style = TextStyle(fontSize = 8.5.sp, fontWeight = FontWeight.SemiBold),
                                color = Color.White,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                                textDecoration = if (segment.task.done) TextDecoration.LineThrough else TextDecoration.None
                            )
                        }
                    }

                    // 3. 溢出指示胶囊（+N）
                    spanningLayout.overflowPerCol.forEach { (col, overflowCount) ->
                        val left = columnWidth * col + 2.dp
                        val width = columnWidth - 4.dp
                        val top = slotTopBase + (slotHeight + slotGap) * (settings.monthMaxTaskTracks - 1)

                        Box(
                            modifier = Modifier
                                .offset(x = left, y = top)
                                .width(width)
                                .height(slotHeight)
                                .clip(RoundedCornerShape(3.dp))
                                .background(MaterialTheme.colorScheme.surfaceContainerHighest)
                                .clickable { onSelectDate(weekDays[col]) },
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = "+$overflowCount",
                                style = TextStyle(fontSize = 8.sp, fontWeight = FontWeight.Bold),
                                color = MaterialTheme.colorScheme.primary,
                                maxLines = 1
                            )
                        }
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(8.dp))

        Text("每日计划 (${plansOfDay.size})", style = MaterialTheme.typography.titleSmall)
        plansOfDay.sortedBy { it.startTime }.take(settings.monthMaxDailyPlans).forEach { plan ->
            TaskOrbitButton("${plan.startTime} ${plan.name}", onClick = { onPlanClick(plan) }, variant = com.taskorbit.ui.components.ButtonVariant.TEXT)
        }
        if (plansOfDay.size > settings.monthMaxDailyPlans) {
            Text("还有 ${plansOfDay.size - settings.monthMaxDailyPlans} 个计划，可在日视图查看", style = MaterialTheme.typography.bodySmall)
        }
        // 选中日期的任务清单
        Text(
            text = "${selectedDate.format(DateTimeFormatter.ofPattern("M月d日"))} 任务 (${tasksOfDay.size})",
            style = MaterialTheme.typography.titleSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp)
        )

        if (tasksOfDay.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 36.dp),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "选中的日期没有排期任务",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        } else {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 4.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                tasksOfDay.forEach { task ->
                    val colorKey = getProjectColor(task.projectId)
                    val accent = PROJECT_COLOR_MAP[colorKey] ?: MaterialTheme.colorScheme.primary

                    TaskOrbitCard(
                        modifier = Modifier.fillMaxWidth(),
                        variant = CardVariant.OUTLINED,
                        shape = ShapeTokens.Medium
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            TaskOrbitCheckbox(
                                checked = task.done,
                                onCheckedChange = { done -> onToggleTaskDone(task.id, done) }
                            )

                            Spacer(modifier = Modifier.width(8.dp))

                            Box(
                                modifier = Modifier
                                    .size(8.dp)
                                    .clip(CircleShape)
                                    .background(accent)
                            )

                            Spacer(modifier = Modifier.width(8.dp))

                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = task.name,
                                    style = MaterialTheme.typography.titleSmall,
                                    color = MaterialTheme.colorScheme.onSurface,
                                    textDecoration = if (task.done) TextDecoration.LineThrough else TextDecoration.None
                                )
                                Text(
                                    text = "${task.startDate} ~ ${task.endDate}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                    }
                }
            }
        }

        // 底部安全留白，避免浮动底栏与 FAB 遮挡内容
        Spacer(modifier = Modifier.height(96.dp))
    }
}

/**
 * 新建 / 编辑计划 BottomSheet 表单
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun PlanFormBottomSheet(
    viewModel: CalendarViewModel
) {
    TaskOrbitBottomSheet(
        onDismissRequest = viewModel::closePlanForm
    ) {
        val name by viewModel.formName.collectAsState()
        val description by viewModel.formDescription.collectAsState()
        val date by viewModel.formDate.collectAsState()
        val startTime by viewModel.formStartTime.collectAsState()
        val endTime by viewModel.formEndTime.collectAsState()
        val projectId by viewModel.formProjectId.collectAsState()
        val taskId by viewModel.formTaskId.collectAsState()
        val repeat by viewModel.formRepeat.collectAsState()
        val repeatCount by viewModel.formRepeatCount.collectAsState()

        val projects by viewModel.activeProjects.collectAsState()
        val tasks by viewModel.tasksForSelectedProject.collectAsState()

        var projectDropdownExpanded by remember { mutableStateOf(false) }
        var taskDropdownExpanded by remember { mutableStateOf(false) }

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp, vertical = 16.dp)
        ) {
            Text(
                text = if (viewModel.editingPlanId != null) "编辑计划" else "添加计划",
                style = MaterialTheme.typography.titleLarge
            )

            Spacer(modifier = Modifier.height(16.dp))

            OutlinedTextField(
                value = name,
                onValueChange = { viewModel.formName.value = it },
                label = { Text("计划名称") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(12.dp))

            OutlinedTextField(
                value = description,
                onValueChange = { viewModel.formDescription.value = it },
                label = { Text("描述（可选）") },
                maxLines = 2,
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(12.dp))

            // 日期与起止时间
            OutlinedTextField(
                value = date,
                onValueChange = { viewModel.formDate.value = it },
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
                    onValueChange = { viewModel.formStartTime.value = it },
                    label = { Text("开始时间 (HH:mm)") },
                    singleLine = true,
                    modifier = Modifier.weight(1f)
                )
                OutlinedTextField(
                    value = endTime,
                    onValueChange = { viewModel.formEndTime.value = it },
                    label = { Text("结束时间 (HH:mm)") },
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
                OutlinedTextField(
                    value = projects.find { it.id == projectId }?.name ?: "不关联项目（独立计划）",
                    onValueChange = {},
                    readOnly = true,
                    label = { Text("关联项目") },
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
                        text = { Text("不关联项目（独立计划）") },
                        onClick = {
                            viewModel.formProjectId.value = null
                            viewModel.formTaskId.value = null
                            projectDropdownExpanded = false
                        }
                    )
                    projects.forEach { proj ->
                        DropdownMenuItem(
                            text = { Text(proj.name) },
                            onClick = {
                                viewModel.formProjectId.value = proj.id
                                viewModel.formTaskId.value = null
                                projectDropdownExpanded = false
                            }
                        )
                    }
                }
            }

            // 关联任务选择（当选择了项目时）
            if (projectId != null && tasks.isNotEmpty()) {
                Spacer(modifier = Modifier.height(12.dp))
                ExposedDropdownMenuBox(
                    expanded = taskDropdownExpanded,
                    onExpandedChange = { taskDropdownExpanded = !taskDropdownExpanded },
                    modifier = Modifier.fillMaxWidth()
                ) {
                    OutlinedTextField(
                        value = tasks.find { it.id == taskId }?.name ?: "不关联具体任务",
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
                            text = { Text("不关联具体任务") },
                            onClick = {
                                viewModel.formTaskId.value = null
                                taskDropdownExpanded = false
                            }
                        )
                        tasks.forEach { t ->
                            DropdownMenuItem(
                                text = { Text(t.name) },
                                onClick = {
                                    viewModel.formTaskId.value = t.id
                                    taskDropdownExpanded = false
                                }
                            )
                        }
                    }
                }
            }

            // 重复规则（仅新建计划时可用）
            if (viewModel.editingPlanId == null) {
                Spacer(modifier = Modifier.height(16.dp))
                Text("重复规则", style = MaterialTheme.typography.labelLarge)
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    DailyPlanRepeat.entries.forEach { r ->
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.clickable { viewModel.formRepeat.value = r }
                        ) {
                            RadioButton(
                                selected = repeat == r,
                                onClick = { viewModel.formRepeat.value = r }
                            )
                            Text(r.label, style = MaterialTheme.typography.bodySmall)
                        }
                    }
                }

                if (repeat != DailyPlanRepeat.NONE) {
                    Spacer(modifier = Modifier.height(8.dp))
                    OutlinedTextField(
                        value = repeatCount,
                        onValueChange = { viewModel.formRepeatCount.value = it },
                        label = { Text("重复生成次数 (2 - 365)") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
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

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CalendarSettingsSheet(
    settings: Settings,
    onSave: (Settings) -> Unit,
    onDismiss: () -> Unit
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    var dayStartHour by remember { mutableIntStateOf(settings.dayStartHour) }
    var dayEndHour by remember { mutableIntStateOf(settings.dayEndHour) }
    var weekDetailStartHour by remember { mutableIntStateOf(settings.weekDetailStartHour) }
    var weekDetailEndHour by remember { mutableIntStateOf(settings.weekDetailEndHour) }

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
                .verticalScroll(rememberScrollState())
        ) {
            Text(
                text = "日历显示设置",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )

            Spacer(modifier = Modifier.height(16.dp))

            Text(
                text = "日视图时间范围",
                style = MaterialTheme.typography.labelLarge,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.primary
            )
            Spacer(modifier = Modifier.height(4.dp))

            CalendarSliderRow(
                label = "开始时间",
                value = dayStartHour,
                range = 0..23,
                formatValue = { String.format("%02d:00", it) },
                onValueChange = { newStart ->
                    dayStartHour = newStart
                    if (dayEndHour <= newStart) {
                        dayEndHour = (newStart + 1).coerceAtMost(24)
                    }
                }
            )

            CalendarSliderRow(
                label = "结束时间",
                value = dayEndHour,
                range = 1..24,
                formatValue = { String.format("%02d:00", it) },
                onValueChange = { newEnd ->
                    dayEndHour = newEnd
                    if (dayStartHour >= newEnd) {
                        dayStartHour = (newEnd - 1).coerceAtLeast(0)
                    }
                }
            )

            Spacer(modifier = Modifier.height(12.dp))

            Text(
                text = "周视图时间范围",
                style = MaterialTheme.typography.labelLarge,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.primary
            )
            Spacer(modifier = Modifier.height(4.dp))

            CalendarSliderRow(
                label = "开始时间",
                value = weekDetailStartHour,
                range = 0..23,
                formatValue = { String.format("%02d:00", it) },
                onValueChange = { newStart ->
                    weekDetailStartHour = newStart
                    if (weekDetailEndHour <= newStart) {
                        weekDetailEndHour = (newStart + 1).coerceAtMost(24)
                    }
                }
            )

            CalendarSliderRow(
                label = "结束时间",
                value = weekDetailEndHour,
                range = 1..24,
                formatValue = { String.format("%02d:00", it) },
                onValueChange = { newEnd ->
                    weekDetailEndHour = newEnd
                    if (weekDetailStartHour >= newEnd) {
                        weekDetailStartHour = (newEnd - 1).coerceAtLeast(0)
                    }
                }
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
                        val updated = settings.copy(
                            dayStartHour = dayStartHour,
                            dayEndHour = dayEndHour,
                            weekDetailStartHour = weekDetailStartHour,
                            weekDetailEndHour = weekDetailEndHour
                        )
                        onSave(updated)
                    },
                    modifier = Modifier.weight(1f)
                )
            }
        }
    }
}

@Composable
fun CalendarSliderRow(
    label: String,
    value: Int,
    range: IntRange,
    formatValue: (Int) -> String,
    onValueChange: (Int) -> Unit
) {
    Column(modifier = Modifier.padding(vertical = 4.dp)) {
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
                text = formatValue(value),
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

