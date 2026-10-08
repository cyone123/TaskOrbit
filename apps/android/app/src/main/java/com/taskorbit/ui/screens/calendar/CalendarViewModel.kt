package com.taskorbit.ui.screens.calendar

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.taskorbit.data.repository.AppStateRepository
import com.taskorbit.domain.CalendarMode
import com.taskorbit.domain.CalendarModel
import com.taskorbit.domain.DailyPlanInput
import com.taskorbit.domain.DailyPlanPatch
import com.taskorbit.domain.WeekCalendarMode
import com.taskorbit.domain.model.DailyPlan
import com.taskorbit.domain.model.DailyPlanRepeat
import com.taskorbit.domain.model.Project
import com.taskorbit.domain.model.Task
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import java.time.LocalDate
import java.time.format.DateTimeFormatter

class CalendarViewModel(application: Application) : AndroidViewModel(application) {

    private val repository = AppStateRepository.getInstance(application)
    private val dateFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd")

    val anchorDate = MutableStateFlow(LocalDate.now())
    val mode = MutableStateFlow(CalendarMode.WEEK)
    val weekMode = MutableStateFlow(WeekCalendarMode.PLANS)
    val selectedDate = MutableStateFlow(LocalDate.now())

    val activeProjects: StateFlow<List<Project>> = repository.state
        .map { state -> state.projects.filter { !it.archived } }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val daysOfWeek: StateFlow<List<LocalDate>> = anchorDate
        .map { CalendarModel.weekDays(it) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), CalendarModel.weekDays(LocalDate.now()))

    val monthDays: StateFlow<List<LocalDate>> = anchorDate
        .map { CalendarModel.monthGridDays(it) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), CalendarModel.monthGridDays(LocalDate.now()))

    val plansOfDay: StateFlow<List<DailyPlan>> = combine(
        repository.state,
        selectedDate
    ) { state, selDate ->
        val iso = selDate.format(dateFormatter)
        state.dailyPlans.filter { it.date == iso }
            .sortedBy { CalendarModel.timeToMinutes(it.startTime) }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val plansOfWeek: StateFlow<Map<LocalDate, List<DailyPlan>>> = combine(
        repository.state,
        daysOfWeek
    ) { state, weekDays ->
        weekDays.associateWith { day ->
            val iso = day.format(dateFormatter)
            state.dailyPlans.filter { it.date == iso }
                .sortedBy { CalendarModel.timeToMinutes(it.startTime) }
        }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyMap())

    val tasksInWeek: StateFlow<List<Task>> = combine(
        repository.state,
        daysOfWeek
    ) { state, weekDays ->
        val startIso = weekDays.first().format(dateFormatter)
        val endIso = weekDays.last().format(dateFormatter)
        state.tasks.filter { it.startDate != null && it.endDate != null && it.endDate >= startIso && it.startDate <= endIso }
            .sortedWith(compareBy<Task> { it.startDate }.thenBy { it.name })
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val monthPlanCounts: StateFlow<Map<String, Int>> = repository.state
        .map { state ->
            val counts = mutableMapOf<String, Int>()
            state.dailyPlans.forEach { plan ->
                counts[plan.date] = (counts[plan.date] ?: 0) + 1
            }
            counts
        }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyMap())

    val tasksByDateInMonth: StateFlow<Map<LocalDate, List<Task>>> = combine(
        repository.state,
        monthDays
    ) { state, days ->
        CalendarModel.tasksByDate(state.tasks, days)
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyMap())

    val tasksInMonth: StateFlow<List<Task>> = combine(
        repository.state,
        monthDays
    ) { state, days ->
        if (days.isEmpty()) emptyList()
        else {
            val startIso = days.first().format(dateFormatter)
            val endIso = days.last().format(dateFormatter)
            state.tasks.filter { it.startDate != null && it.endDate != null && it.endDate >= startIso && it.startDate <= endIso }
        }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val tasksOfDay: StateFlow<List<Task>> = combine(
        repository.state,
        selectedDate
    ) { state, selDate ->
        val iso = selDate.format(dateFormatter)
        state.tasks.filter { it.startDate != null && it.endDate != null && it.startDate <= iso && it.endDate >= iso }
            .sortedWith(compareBy<Task> { it.done }.thenBy { it.startDate })
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    // --- 表单状态 ---
    val isPlanFormOpen = MutableStateFlow(false)
    var editingPlanId: String? = null
    val formName = MutableStateFlow("")
    val formDescription = MutableStateFlow("")
    val formDate = MutableStateFlow(LocalDate.now().format(dateFormatter))
    val formStartTime = MutableStateFlow("09:00")
    val formEndTime = MutableStateFlow("10:00")
    val formProjectId = MutableStateFlow<String?>(null)
    val formTaskId = MutableStateFlow<String?>(null)
    val formRepeat = MutableStateFlow(DailyPlanRepeat.NONE)
    val formRepeatCount = MutableStateFlow("4")

    val tasksForSelectedProject: StateFlow<List<Task>> = combine(
        repository.state,
        formProjectId
    ) { state, pId ->
        if (pId == null) emptyList() else state.tasks.filter { it.projectId == pId && !it.done }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    fun setMode(newMode: CalendarMode) {
        mode.value = newMode
        if (newMode == CalendarMode.DAY) {
            selectedDate.value = anchorDate.value
        }
    }

    fun navigate(direction: Int) {
        val current = anchorDate.value
        val next = when (mode.value) {
            CalendarMode.DAY -> current.plusDays(direction.toLong())
            CalendarMode.WEEK -> current.plusWeeks(direction.toLong())
            CalendarMode.MONTH -> current.plusMonths(direction.toLong())
        }
        anchorDate.value = next
        if (mode.value == CalendarMode.DAY) {
            selectedDate.value = next
        }
    }

    fun goToToday() {
        val today = LocalDate.now()
        anchorDate.value = today
        selectedDate.value = today
    }

    fun selectDate(date: LocalDate) {
        selectedDate.value = date
        anchorDate.value = date
    }

    fun openNewPlanForm(date: LocalDate? = null) {
        val target = date ?: selectedDate.value
        editingPlanId = null
        formName.value = ""
        formDescription.value = ""
        formDate.value = target.format(dateFormatter)
        formStartTime.value = "09:00"
        formEndTime.value = "10:00"
        formProjectId.value = null
        formTaskId.value = null
        formRepeat.value = DailyPlanRepeat.NONE
        formRepeatCount.value = "4"
        isPlanFormOpen.value = true
    }

    fun openEditPlanForm(plan: DailyPlan) {
        editingPlanId = plan.id
        formName.value = plan.name
        formDescription.value = plan.description
        formDate.value = plan.date
        formStartTime.value = plan.startTime
        formEndTime.value = plan.endTime
        formProjectId.value = plan.projectId
        formTaskId.value = plan.taskId
        formRepeat.value = plan.recurrence.frequency
        formRepeatCount.value = if (plan.recurrence.count > 1) plan.recurrence.count.toString() else "4"
        isPlanFormOpen.value = true
    }

    fun closePlanForm() {
        isPlanFormOpen.value = false
        editingPlanId = null
    }

    fun submitPlan() {
        val name = formName.value.trim()
        if (name.isEmpty()) return

        val count = formRepeatCount.value.toIntOrNull() ?: 1
        val estimatedMinutes = CalendarModel.timeToMinutes(formEndTime.value) - CalendarModel.timeToMinutes(formStartTime.value)

        val id = editingPlanId
        if (id != null) {
            repository.updatePlan(
                id = id,
                patch = DailyPlanPatch(
                    projectId = formProjectId.value,
                    taskId = formTaskId.value,
                    name = name,
                    description = formDescription.value.trim(),
                    date = formDate.value,
                    startTime = formStartTime.value,
                    endTime = formEndTime.value,
                    estimatedMinutes = estimatedMinutes
                )
            )
        } else {
            repository.addPlans(
                DailyPlanInput(
                    projectId = formProjectId.value,
                    taskId = formTaskId.value,
                    name = name,
                    description = formDescription.value.trim(),
                    date = formDate.value,
                    startTime = formStartTime.value,
                    endTime = formEndTime.value,
                    estimatedMinutes = estimatedMinutes,
                    repeat = formRepeat.value,
                    repeatCount = if (formRepeat.value == DailyPlanRepeat.NONE) 1 else count
                )
            )
        }
        closePlanForm()
    }

    fun togglePlan(id: String, done: Boolean) {
        repository.togglePlan(id, done)
    }

    fun toggleTask(id: String, done: Boolean) {
        repository.toggleTask(id, done)
    }

    fun reschedulePlan(id: String, newStartTime: String, newEndTime: String, newDate: String? = null) {
        val estimatedMinutes = CalendarModel.timeToMinutes(newEndTime) - CalendarModel.timeToMinutes(newStartTime)
        repository.updatePlan(
            id = id,
            patch = DailyPlanPatch(
                startTime = newStartTime,
                endTime = newEndTime,
                date = newDate,
                estimatedMinutes = estimatedMinutes
            )
        )
    }

    fun removePlan(id: String) {
        repository.removePlan(id)
    }

    fun getProjectColor(projectId: String?): String {
        if (projectId == null) return "violet"
        return repository.state.value.projects.find { it.id == projectId }?.color ?: "violet"
    }

    fun getProjectName(projectId: String?): String? {
        if (projectId == null) return null
        return repository.state.value.projects.find { it.id == projectId }?.name
    }
}
