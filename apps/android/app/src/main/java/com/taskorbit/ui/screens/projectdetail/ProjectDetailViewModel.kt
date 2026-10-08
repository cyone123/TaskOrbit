package com.taskorbit.ui.screens.projectdetail

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.taskorbit.data.common.DateTimeUtils
import com.taskorbit.data.repository.AppStateRepository
import com.taskorbit.domain.CalendarModel
import com.taskorbit.domain.DailyPlanInput
import com.taskorbit.domain.DailyPlanPatch
import com.taskorbit.domain.ProjectDomain
import com.taskorbit.domain.ProjectInput
import com.taskorbit.domain.TaskDomain
import com.taskorbit.domain.TaskInput
import com.taskorbit.domain.TaskPatch
import com.taskorbit.domain.model.DailyPlan
import com.taskorbit.domain.model.DailyPlanRepeat
import com.taskorbit.domain.model.Priority
import com.taskorbit.domain.model.Project
import com.taskorbit.domain.model.Task
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn

enum class ProjectDetailSection {
    TASKS,
    PLANS,
    STATS
}

data class ProjectMetrics(
    val progress: Int = 0,
    val completedTasks: Int = 0,
    val totalTasks: Int = 0,
    val completedPlans: Int = 0,
    val totalPlans: Int = 0,
    val totalFocusMinutes: Int = 0
)

class ProjectDetailViewModel(
    application: Application,
    private val projectId: String
) : AndroidViewModel(application) {

    class Factory(
        private val application: Application,
        private val projectId: String
    ) : androidx.lifecycle.ViewModelProvider.Factory {
        override fun <T : androidx.lifecycle.ViewModel> create(modelClass: Class<T>): T {
            @Suppress("UNCHECKED_CAST")
            return ProjectDetailViewModel(application, projectId) as T
        }
    }

    private val repository = AppStateRepository.getInstance(application)

    val project: StateFlow<Project?> = repository.state
        .map { state -> state.projects.find { it.id == projectId } }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), null)

    val tasks: StateFlow<List<Task>> = repository.state
        .map { state -> state.tasks.filter { it.projectId == projectId } }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val plans: StateFlow<List<DailyPlan>> = repository.state
        .map { state -> state.dailyPlans.filter { it.projectId == projectId } }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val metrics: StateFlow<ProjectMetrics> = repository.state
        .map { state ->
            val pTasks = state.tasks.filter { it.projectId == projectId }
            val pPlans = state.dailyPlans.filter { it.projectId == projectId }
            val progress = ProjectDomain.calculateProjectProgress(pTasks, pPlans)
            val focusMinutes = state.pomodoroSessions
                .filter { it.projectId == projectId && it.kind == com.taskorbit.domain.model.PomodoroKind.FOCUS }
                .sumOf { it.minutes }

            ProjectMetrics(
                progress = progress,
                completedTasks = pTasks.count { it.done },
                totalTasks = pTasks.size,
                completedPlans = pPlans.count { it.done },
                totalPlans = pPlans.size,
                totalFocusMinutes = focusMinutes
            )
        }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), ProjectMetrics())

    private val _section = MutableStateFlow(ProjectDetailSection.TASKS)
    val section: StateFlow<ProjectDetailSection> = _section.asStateFlow()

    private val _expandedTasks = MutableStateFlow<Set<String>>(emptySet())
    val expandedTasks: StateFlow<Set<String>> = _expandedTasks.asStateFlow()

    // 任务表单状态
    val isTaskFormOpen = MutableStateFlow(false)
    var editingTaskId: String? = null
    val taskName = MutableStateFlow("")
    val taskDescription = MutableStateFlow("")
    val taskStartDate = MutableStateFlow(DateTimeUtils.todayISO())
    val taskEndDate = MutableStateFlow(DateTimeUtils.todayISO())
    val taskPriority = MutableStateFlow(Priority.MEDIUM)
    val taskScheduled = MutableStateFlow(false)
    val taskFormError = MutableStateFlow<String?>(null)

    // 编辑项目表单状态
    val isProjectFormOpen = MutableStateFlow(false)
    val editName = MutableStateFlow("")
    val editDescription = MutableStateFlow("")
    val editColor = MutableStateFlow("violet")
    val editStartDate = MutableStateFlow("")
    val editEndDate = MutableStateFlow("")

    fun setSection(s: ProjectDetailSection) {
        _section.value = s
    }

    fun toggleTaskExpanded(taskId: String) {
        val current = _expandedTasks.value
        _expandedTasks.value = if (taskId in current) current - taskId else current + taskId
    }

    // --- 任务表单 ---

    fun openNewTaskForm() {
        val proj = project.value ?: return
        editingTaskId = null
        taskScheduled.value = false
        taskFormError.value = null
        taskName.value = ""
        taskDescription.value = ""
        taskStartDate.value = if (DateTimeUtils.todayISO() < proj.startDate) proj.startDate else DateTimeUtils.todayISO()
        taskEndDate.value = proj.endDate
        taskPriority.value = Priority.MEDIUM
        isTaskFormOpen.value = true
    }

    fun openEditTaskForm(task: Task) {
        editingTaskId = task.id
        taskScheduled.value = task.startDate != null && task.endDate != null
        taskFormError.value = null
        taskName.value = task.name
        taskDescription.value = task.description
        taskStartDate.value = task.startDate.orEmpty()
        taskEndDate.value = task.endDate.orEmpty()
        taskPriority.value = task.priority
        isTaskFormOpen.value = true
    }

    fun closeTaskForm() {
        isTaskFormOpen.value = false
        editingTaskId = null
    }

    fun submitTask() {
        val name = taskName.value.trim()
        if (name.isEmpty()) return
        val start = if (taskScheduled.value) taskStartDate.value.trim().takeIf { it.isNotEmpty() } else null
        val end = if (taskScheduled.value) taskEndDate.value.trim().takeIf { it.isNotEmpty() } else null
        try {
            if (taskScheduled.value) require(start != null && end != null) { "请填写起止日期。" }
            TaskDomain.validateSchedule(start, end)
        } catch (e: Exception) {
            taskFormError.value = e.message ?: "请填写有效的日期。"
            return
        }

        val id = editingTaskId
        if (id != null) {
            repository.updateTask(
                id = id,
                patch = TaskPatch(
                    name = name,
                    description = taskDescription.value.trim(),
                    startDate = start,
                    endDate = end,
                    clearSchedule = !taskScheduled.value,
                    priority = taskPriority.value
                )
            )
        } else {
            repository.addTask(
                TaskInput(
                    projectId = projectId,
                    name = name,
                    description = taskDescription.value.trim(),
                    startDate = start,
                    endDate = end,
                    priority = taskPriority.value
                )
            )
        }
        closeTaskForm()
    }

    fun toggleTask(id: String, done: Boolean) {
        repository.toggleTask(id, done)
    }

    fun removeTask(id: String) {
        repository.removeTask(id)
    }

    // --- 编辑项目表单 ---

    fun openEditProjectForm() {
        val proj = project.value ?: return
        editName.value = proj.name
        editDescription.value = proj.description
        editColor.value = proj.color
        editStartDate.value = proj.startDate
        editEndDate.value = proj.endDate
        isProjectFormOpen.value = true
    }

    fun closeProjectForm() {
        isProjectFormOpen.value = false
    }

    fun submitProjectEdit() {
        val name = editName.value.trim()
        if (name.isEmpty()) return

        repository.updateProject(
            id = projectId,
            input = ProjectInput(
                name = name,
                description = editDescription.value.trim(),
                color = editColor.value,
                startDate = editStartDate.value,
                endDate = editEndDate.value
            )
        )
        closeProjectForm()
    }

    // --- 每日计划表单与操作 ---

    val isPlanFormOpen = MutableStateFlow(false)
    var editingPlanId: String? = null
    val planName = MutableStateFlow("")
    val planDescription = MutableStateFlow("")
    val planDate = MutableStateFlow(DateTimeUtils.todayISO())
    val planStartTime = MutableStateFlow("09:00")
    val planEndTime = MutableStateFlow("10:00")
    val planTaskId = MutableStateFlow<String?>(null)
    val planRepeat = MutableStateFlow(DailyPlanRepeat.NONE)
    val planRepeatCount = MutableStateFlow("4")

    fun openNewPlanForm(presetTaskId: String? = null) {
        val proj = project.value
        editingPlanId = null
        planName.value = ""
        planDescription.value = ""
        val today = DateTimeUtils.todayISO()
        planDate.value = if (proj != null && today in proj.startDate..proj.endDate) today else proj?.startDate ?: today
        planStartTime.value = "09:00"
        planEndTime.value = "10:00"
        planTaskId.value = presetTaskId
        planRepeat.value = DailyPlanRepeat.NONE
        planRepeatCount.value = "4"
        isPlanFormOpen.value = true
    }

    fun openEditPlanForm(plan: DailyPlan) {
        editingPlanId = plan.id
        planName.value = plan.name
        planDescription.value = plan.description
        planDate.value = plan.date
        planStartTime.value = plan.startTime
        planEndTime.value = plan.endTime
        planTaskId.value = plan.taskId
        planRepeat.value = plan.recurrence.frequency
        planRepeatCount.value = if (plan.recurrence.count > 1) plan.recurrence.count.toString() else "4"
        isPlanFormOpen.value = true
    }

    fun closePlanForm() {
        isPlanFormOpen.value = false
        editingPlanId = null
    }

    fun submitPlan() {
        val name = planName.value.trim()
        if (name.isEmpty()) return

        val count = planRepeatCount.value.toIntOrNull() ?: 1
        val estimatedMinutes = (CalendarModel.timeToMinutes(planEndTime.value) - CalendarModel.timeToMinutes(planStartTime.value)).coerceAtLeast(0)

        val id = editingPlanId
        if (id != null) {
            repository.updatePlan(
                id = id,
                patch = DailyPlanPatch(
                    projectId = projectId,
                    taskId = planTaskId.value,
                    name = name,
                    description = planDescription.value.trim(),
                    date = planDate.value,
                    startTime = planStartTime.value,
                    endTime = planEndTime.value,
                    estimatedMinutes = estimatedMinutes
                )
            )
        } else {
            repository.addPlans(
                DailyPlanInput(
                    projectId = projectId,
                    taskId = planTaskId.value,
                    name = name,
                    description = planDescription.value.trim(),
                    date = planDate.value,
                    startTime = planStartTime.value,
                    endTime = planEndTime.value,
                    estimatedMinutes = estimatedMinutes,
                    repeat = planRepeat.value,
                    repeatCount = if (planRepeat.value == DailyPlanRepeat.NONE) 1 else count
                )
            )
        }
        closePlanForm()
    }

    fun togglePlan(id: String, done: Boolean) {
        repository.togglePlan(id, done)
    }

    fun removePlan(id: String) {
        repository.removePlan(id)
    }
}
