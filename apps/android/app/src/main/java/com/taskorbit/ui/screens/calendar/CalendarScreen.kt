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
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
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

    val isPlanFormOpen by viewModel.isPlanFormOpen.collectAsState()

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
            // 主视图内容区域（留出顶部悬浮胶囊空间）
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(top = 46.dp)
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
                                    daysOfWeek = daysOfWeek,
                                    plansOfWeek = plansOfWeek,
                                    onPlanClick = viewModel::openEditPlanForm,
                                    onToggleDone = viewModel::togglePlan,
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
                                anchorDate = anchorDate,
                                selectedDate = selectedDate,
                                monthDays = monthDays,
                                planCounts = monthPlanCounts,
                                plansOfDay = plansOfDay,
                                onSelectDate = viewModel::selectDate,
                                onPlanClick = viewModel::openEditPlanForm,
                                onToggleDone = viewModel::togglePlan,
                                onDeletePlan = viewModel::removePlan,
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
                modifier = Modifier
                    .align(Alignment.TopCenter)
                    .padding(top = 6.dp)
                    .clickable(enabled = !isAppBarExpanded) { isAppBarExpanded = true },
                trailingContent = if (isAppBarExpanded && mode == CalendarMode.WEEK) {
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
                if (!isAppBarExpanded) {
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

    // 新建 / 编辑计划 BottomSheet
    if (isPlanFormOpen) {
        PlanFormBottomSheet(viewModel = viewModel)
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

    val startMin = CalendarModel.timeToMinutes(plan.startTime) - startHour * 60
    val endMin = CalendarModel.timeToMinutes(plan.endTime) - startHour * 60
    val durationMin = (endMin - startMin).coerceAtLeast(15)

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
    val maxStart = maxOf(0, ((1439 - planDurationMin) / 15) * 15)
    val snappedPreviewStartMin = (((rawPreviewStartMin + 7) / 15) * 15).coerceIn(0, maxStart)
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
                            val maxStartSlot = maxOf(0, ((1439 - durMin) / 15) * 15)
                            val targetStartMin = (((rawStartMin + 7) / 15) * 15).coerceIn(0, maxStartSlot)
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

    // 动态小时范围：若是今天，保证当前小时必定包含在视图之内（自动扩展边界，即使在清晨、深夜或不同时区）
    val (startHour, endHour) = remember(plans, isToday, currentTime.hour) {
        CalendarModel.visibleHourRange(
            plans = plans,
            includeHour = if (isToday) currentTime.hour else null
        )
    }
    val layouts = remember(plans) { CalendarModel.layoutPlanColumns(plans) }

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
            for (hour in startHour..endHour) {
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
        }

        // 小时时间文字标注
        Column(
            modifier = Modifier
                .width(54.dp)
                .padding(top = 8.dp)
        ) {
            for (hour in startHour..endHour) {
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
        }

        // 渲染计划色块
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .padding(start = 60.dp, end = 16.dp, top = 16.dp)
        ) {
            if (plans.isEmpty()) {
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
                            text = "今日暂无日程计划，点击右下角按钮添加安排",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            } else {
                plans.forEach { plan ->
                    key(plan.id) {
                        val layout = layouts[plan.id] ?: com.taskorbit.domain.PlanColumnLayout(0, 1)
                        val colorKey = getProjectColor(plan.projectId)
                        val accent = PROJECT_COLOR_MAP[colorKey] ?: MaterialTheme.colorScheme.primary

                        DraggablePlanBlock(
                            plan = plan,
                            startHour = startHour,
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

/**
 * 周视图 - 每日计划（横向 7 列）
 */
@Composable
private fun WeekPlansView(
    daysOfWeek: List<LocalDate>,
    plansOfWeek: Map<LocalDate, List<DailyPlan>>,
    onPlanClick: (DailyPlan) -> Unit,
    onToggleDone: (String, Boolean) -> Unit,
    getProjectColor: (String?) -> String,
    modifier: Modifier = Modifier
) {
    val hScrollState = rememberScrollState()
    val today = LocalDate.now()

    Row(
        modifier = modifier
            .horizontalScroll(hScrollState)
            .padding(bottom = 88.dp)
    ) {
        daysOfWeek.forEach { day ->
            val isToday = day == today
            val plans = plansOfWeek[day] ?: emptyList()

            Column(
                modifier = Modifier
                    .width(130.dp)
                    .fillMaxHeight()
                    .border(
                        width = if (isToday) 2.dp else 0.5.dp,
                        color = if (isToday) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outlineVariant
                    )
            ) {
                // 列头：日期
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(
                            if (isToday) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceContainer
                        )
                        .padding(vertical = 8.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        text = when (day.dayOfWeek) {
                            java.time.DayOfWeek.MONDAY -> "周一"
                            java.time.DayOfWeek.TUESDAY -> "周二"
                            java.time.DayOfWeek.WEDNESDAY -> "周三"
                            java.time.DayOfWeek.THURSDAY -> "周四"
                            java.time.DayOfWeek.FRIDAY -> "周五"
                            java.time.DayOfWeek.SATURDAY -> "周六"
                            java.time.DayOfWeek.SUNDAY -> "周日"
                        },
                        style = MaterialTheme.typography.labelSmall,
                        color = if (isToday) MaterialTheme.colorScheme.onPrimaryContainer else MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Text(
                        text = "${day.dayOfMonth}",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = if (isToday) FontWeight.Bold else FontWeight.Normal,
                        color = if (isToday) MaterialTheme.colorScheme.onPrimaryContainer else MaterialTheme.colorScheme.onSurface
                    )
                }

                // 计划列表
                LazyColumn(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f)
                        .padding(4.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    items(plans, key = { it.id }) { plan ->
                        val colorKey = getProjectColor(plan.projectId)
                        val accent = PROJECT_COLOR_MAP[colorKey] ?: MaterialTheme.colorScheme.primary

                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(ShapeTokens.Small)
                                .background(accent.copy(alpha = 0.16f))
                                .border(1.dp, accent.copy(alpha = 0.4f), ShapeTokens.Small)
                                .bouncyClickable { onPlanClick(plan) }
                                .padding(6.dp)
                        ) {
                            Column {
                                Text(
                                    text = plan.name,
                                    style = MaterialTheme.typography.labelMedium,
                                    color = MaterialTheme.colorScheme.onSurface,
                                    maxLines = 2,
                                    overflow = TextOverflow.Ellipsis,
                                    textDecoration = if (plan.done) TextDecoration.LineThrough else TextDecoration.None
                                )
                                Text(
                                    text = "${plan.startTime}-${plan.endTime}",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
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
 * 月视图：42 天月历网格与下方当日简表
 */
@Composable
private fun MonthCalendarView(
    anchorDate: LocalDate,
    selectedDate: LocalDate,
    monthDays: List<LocalDate>,
    planCounts: Map<String, Int>,
    plansOfDay: List<DailyPlan>,
    onSelectDate: (LocalDate) -> Unit,
    onPlanClick: (DailyPlan) -> Unit,
    onToggleDone: (String, Boolean) -> Unit,
    onDeletePlan: (String) -> Unit,
    getProjectColor: (String?) -> String,
    modifier: Modifier = Modifier
) {
    val today = LocalDate.now()
    val currentMonth = anchorDate.monthValue

    Column(modifier = modifier) {
        // 星期头
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 8.dp, vertical = 6.dp),
            horizontalArrangement = Arrangement.SpaceAround
        ) {
            listOf("一", "二", "三", "四", "五", "六", "日").forEach {
                Text(
                    text = it,
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.weight(1f)
                )
            }
        }

        // 42 天网格
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 8.dp)
        ) {
            val rows = monthDays.chunked(7)
            rows.forEach { week ->
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceAround
                ) {
                    week.forEach { day ->
                        val isCurrentMonth = day.monthValue == currentMonth
                        val isToday = day == today
                        val isSelected = day == selectedDate
                        val dateIso = day.format(DateTimeFormatter.ofPattern("yyyy-MM-dd"))
                        val count = planCounts[dateIso] ?: 0

                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .height(40.dp)
                                .padding(2.dp)
                                .clip(ShapeTokens.Small)
                                .background(
                                    when {
                                        isSelected -> MaterialTheme.colorScheme.primaryContainer
                                        isToday -> MaterialTheme.colorScheme.surfaceContainerHighest
                                        else -> Color.Transparent
                                    }
                                )
                                .clickable { onSelectDate(day) },
                            contentAlignment = Alignment.Center
                        ) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text(
                                    text = "${day.dayOfMonth}",
                                    style = MaterialTheme.typography.bodyMedium,
                                    fontWeight = if (isToday || isSelected) FontWeight.Bold else FontWeight.Normal,
                                    color = when {
                                        isSelected -> MaterialTheme.colorScheme.onPrimaryContainer
                                        !isCurrentMonth -> MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.38f)
                                        else -> MaterialTheme.colorScheme.onSurface
                                    }
                                )
                                if (count > 0) {
                                    Box(
                                        modifier = Modifier
                                            .size(4.dp)
                                            .clip(ShapeTokens.Full)
                                            .background(
                                                if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.secondary
                                            )
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(8.dp))

        // 当日计划列表
        Text(
            text = "${selectedDate.format(DateTimeFormatter.ofPattern("M月d日"))} 计划 (${plansOfDay.size})",
            style = MaterialTheme.typography.titleSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp)
        )

        if (plansOfDay.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "选中的日期没有计划",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f),
                contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 4.dp, bottom = 88.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(plansOfDay, key = { it.id }) { plan ->
                    val colorKey = getProjectColor(plan.projectId)
                    val accent = PROJECT_COLOR_MAP[colorKey] ?: MaterialTheme.colorScheme.primary

                    TaskOrbitCard(
                        modifier = Modifier.fillMaxWidth(),
                        variant = CardVariant.ELEVATED,
                        shape = ShapeTokens.Medium,
                        onClick = { onPlanClick(plan) }
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            TaskOrbitCheckbox(
                                checked = plan.done,
                                onCheckedChange = { done -> onToggleDone(plan.id, done) }
                            )

                            Spacer(modifier = Modifier.width(8.dp))

                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = plan.name,
                                    style = MaterialTheme.typography.titleSmall,
                                    color = MaterialTheme.colorScheme.onSurface,
                                    textDecoration = if (plan.done) TextDecoration.LineThrough else TextDecoration.None
                                )
                                Text(
                                    text = "${plan.startTime} - ${plan.endTime}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }

                            TaskOrbitIconButton(
                                icon = Icons.Outlined.Delete,
                                contentDescription = "删除",
                                onClick = { onDeletePlan(plan.id) },
                                danger = true
                            )
                        }
                    }
                }
            }
        }
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
