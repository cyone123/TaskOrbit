package com.taskorbit.ui.screens.projects

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.taskorbit.data.common.DateTimeUtils
import com.taskorbit.data.repository.AppStateRepository
import com.taskorbit.domain.ProjectDomain
import com.taskorbit.domain.ProjectInput
import com.taskorbit.domain.model.Project
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import java.time.LocalDate

class ProjectsViewModel(application: Application) : AndroidViewModel(application) {

    private val repository = AppStateRepository.getInstance(application)

    private val _query = MutableStateFlow("")
    val query: StateFlow<String> = _query.asStateFlow()

    private val _isFormOpen = MutableStateFlow(false)
    val isFormOpen: StateFlow<Boolean> = _isFormOpen.asStateFlow()

    // 新建项目表单字段
    val formName = MutableStateFlow("")
    val formDescription = MutableStateFlow("")
    val formColor = MutableStateFlow("violet")
    val formStartDate = MutableStateFlow(DateTimeUtils.todayISO())
    val formEndDate = MutableStateFlow(LocalDate.now().plusDays(30).toString())

    val activeProjects: StateFlow<List<Project>> = combine(
        repository.state,
        _query
    ) { state, q ->
        val trimmed = q.trim().lowercase()
        state.projects.filter { project ->
            !project.archived && (trimmed.isEmpty() || project.name.lowercase().contains(trimmed))
        }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val archivedProjects: StateFlow<List<Project>> = repository.state
        .combine(_query) { state, q ->
            val trimmed = q.trim().lowercase()
            state.projects.filter { project ->
                project.archived && (trimmed.isEmpty() || project.name.lowercase().contains(trimmed))
            }
        }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    fun onQueryChange(text: String) {
        _query.value = text
    }

    fun openCreateForm() {
        formName.value = ""
        formDescription.value = ""
        formColor.value = "violet"
        formStartDate.value = DateTimeUtils.todayISO()
        formEndDate.value = LocalDate.now().plusDays(30).toString()
        _isFormOpen.value = true
    }

    fun closeForm() {
        _isFormOpen.value = false
    }

    fun submitProject() {
        val name = formName.value.trim()
        if (name.isEmpty()) return

        val input = ProjectInput(
            name = name,
            description = formDescription.value.trim(),
            color = formColor.value,
            startDate = formStartDate.value,
            endDate = formEndDate.value
        )
        repository.addProject(input)
        closeForm()
    }

    fun archiveProject(id: String) {
        repository.archiveProject(id)
    }

    fun restoreProject(id: String) {
        repository.restoreProject(id)
    }

    fun removeProject(id: String) {
        repository.removeProject(id)
    }

    fun getProjectProgress(projectId: String): Int {
        val state = repository.state.value
        val tasks = state.tasks.filter { it.projectId == projectId }
        val plans = state.dailyPlans.filter { it.projectId == projectId }
        return ProjectDomain.calculateProjectProgress(tasks, plans)
    }

    fun getTaskCount(projectId: String): Int {
        return repository.state.value.tasks.count { it.projectId == projectId }
    }

    fun getPlanCount(projectId: String): Int {
        return repository.state.value.dailyPlans.count { it.projectId == projectId }
    }
}
