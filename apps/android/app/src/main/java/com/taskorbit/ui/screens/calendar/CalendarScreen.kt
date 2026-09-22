package com.taskorbit.ui.screens.calendar

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
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
import java.time.LocalDate
import java.time.format.DateTimeFormatter

@OptIn(ExperimentalMaterial3Api::class)
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
                shape = ShapeTokens.Large
            ) {
                Icon(Icons.Filled.Add, contentDescription = "新建计划")
            }
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            // 模式切换分段按钮
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 4.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                SingleChoiceSegmentedButtonRow(
                    modifier = Modifier.weight(1f)
                ) {
                    val modes = listOf(CalendarMode.DAY to "日", CalendarMode.WEEK to "周", CalendarMode.MONTH to "月")
                    modes.forEachIndexed { index, (m, label) ->
                        SegmentedButton(
                            selected = mode == m,
                            onClick = { viewModel.mode.value = m },
                            shape = SegmentedButtonDefaults.itemShape(index = index, count = modes.size)
                        ) {
                            Text(label)
                        }
                    }
                }

                if (mode == CalendarMode.WEEK) {
                    Spacer(modifier = Modifier.width(8.dp))
                    SingleChoiceSegmentedButtonRow {
                        val subModes = listOf(WeekCalendarMode.PLANS to "计划", WeekCalendarMode.GANTT to "甘特")
                        subModes.forEachIndexed { index, (wm, label) ->
                            SegmentedButton(
                                selected = weekMode == wm,
                                onClick = { viewModel.weekMode.value = wm },
                                shape = SegmentedButtonDefaults.itemShape(index = index, count = subModes.size)
                            ) {
                                Text(label, style = MaterialTheme.typography.labelSmall)
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(4.dp))

            // 主视图渲染
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
                            plans = plansOfDay,
                            onPlanClick = viewModel::openEditPlanForm,
                            onToggleDone = viewModel::togglePlan,
                            onDeletePlan = viewModel::removePlan,
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
    }

    // 新建 / 编辑计划 BottomSheet
    if (isPlanFormOpen) {
        PlanFormBottomSheet(viewModel = viewModel)
    }
}

/**
 * 日视图：垂直 24 小时时间轴与分列计划块
 */
@Composable
private fun DayTimelineView(
    plans: List<DailyPlan>,
    onPlanClick: (DailyPlan) -> Unit,
    onToggleDone: (String, Boolean) -> Unit,
    onDeletePlan: (String) -> Unit,
    getProjectColor: (String?) -> String,
    modifier: Modifier = Modifier
) {
    if (plans.isEmpty()) {
        TaskOrbitEmptyState(
            icon = Icons.Outlined.CalendarMonth,
            title = "今日暂无计划",
            description = "点击右下角按钮添加你的时间安排。",
            modifier = modifier
        )
        return
    }

    val hourHeight = 64.dp
    val (startHour, endHour) = remember(plans) { CalendarModel.visibleHourRange(plans) }
    val layouts = remember(plans) { CalendarModel.layoutPlanColumns(plans) }

    val scrollState = rememberScrollState()

    Box(modifier = modifier.verticalScroll(scrollState)) {
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
                    // 小时背景线
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
            plans.forEach { plan ->
                val startMin = CalendarModel.timeToMinutes(plan.startTime) - startHour * 60
                val endMin = CalendarModel.timeToMinutes(plan.endTime) - startHour * 60
                val durationMin = (endMin - startMin).coerceAtLeast(20)

                val topOffset = (startMin.toFloat() / 60f) * hourHeight.value
                val blockHeight = (durationMin.toFloat() / 60f) * hourHeight.value

                val layout = layouts[plan.id] ?: com.taskorbit.domain.PlanColumnLayout(0, 1)
                val colFraction = 1f / layout.columnCount

                val colorKey = getProjectColor(plan.projectId)
                val accent = PROJECT_COLOR_MAP[colorKey] ?: MaterialTheme.colorScheme.primary

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = topOffset.dp)
                        .height(blockHeight.dp)
                ) {
                    if (layout.column > 0) {
                        Spacer(modifier = Modifier.fillMaxWidth(layout.column * colFraction))
                    }
                    Box(
                        modifier = Modifier
                            .fillMaxWidth(colFraction)
                            .fillMaxHeight()
                            .padding(horizontal = 2.dp)
                            .clip(ShapeTokens.Small)
                            .background(accent.copy(alpha = 0.16f))
                            .border(1.dp, accent.copy(alpha = 0.5f), ShapeTokens.Small)
                            .clickable { onPlanClick(plan) }
                            .padding(6.dp)
                    ) {
                        Column {
                            Text(
                                text = plan.name,
                                style = MaterialTheme.typography.titleSmall,
                                color = MaterialTheme.colorScheme.onSurface,
                                maxLines = 1,
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

            // 当前时间红线指示器
            val now = java.time.LocalTime.now()
            val currentMinutes = now.hour * 60 + now.minute
            val visibleStartMinutes = startHour * 60
            val visibleEndMinutes = (endHour + 1) * 60
            if (currentMinutes in visibleStartMinutes..visibleEndMinutes) {
                val currentOffset = ((currentMinutes - visibleStartMinutes).toFloat() / 60f) * hourHeight.value
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = (currentOffset - 4).dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(8.dp)
                            .clip(ShapeTokens.Full)
                            .background(MaterialTheme.colorScheme.error)
                    )
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(2.dp)
                            .background(MaterialTheme.colorScheme.error)
                    )
                }
            }
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
                                .clickable { onPlanClick(plan) }
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
