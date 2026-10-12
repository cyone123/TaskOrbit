package com.taskorbit.data.common

import com.taskorbit.domain.model.AppState

object StateValidator {
    const val CURRENT_VERSION = com.taskorbit.domain.model.STATE_VERSION

    class ValidationException(message: String) : IllegalArgumentException(message)

    fun validate(state: AppState) {
        if (state.version != CURRENT_VERSION) {
            throw ValidationException("不支持的数据版本: ${state.version}，当前版本应为 $CURRENT_VERSION")
        }
        com.taskorbit.domain.SettingsDomain.validate(state.settings)

        val projectIds = state.projects.map { it.id }.toSet()
        val taskMap = state.tasks.associateBy { it.id }

        // 校验任务引用的项目必须存在
        for (task in state.tasks) {
            if (task.projectId !in projectIds) {
                throw ValidationException("任务「${task.name}」引用了不存在的项目: ${task.projectId}")
            }
        }

        // 校验计划引用的项目和任务
        for (plan in state.dailyPlans) {
            if (plan.projectId != null && plan.projectId !in projectIds) {
                throw ValidationException("计划「${plan.name}」引用了不存在的项目: ${plan.projectId}")
            }
            if (plan.taskId != null) {
                val task = taskMap[plan.taskId]
                    ?: throw ValidationException("计划「${plan.name}」引用了不存在的任务: ${plan.taskId}")
                if (plan.projectId != null && task.projectId != plan.projectId) {
                    throw ValidationException("计划「${plan.name}」所属项目与关联任务所属项目不一致")
                }
            }
        }

        // 校验活动计时器引用
        state.activeTimer?.let { timer ->
            if (timer.projectId != null && timer.projectId !in projectIds) {
                throw ValidationException("计时器引用了不存在的项目: ${timer.projectId}")
            }
            if (timer.taskId != null) {
                val task = taskMap[timer.taskId]
                    ?: throw ValidationException("计时器引用了不存在的任务: ${timer.taskId}")
                if (timer.projectId != null && task.projectId != timer.projectId) {
                    throw ValidationException("计时器关联的任务与项目不匹配")
                }
            }
        }

        // 校验收集箱待办引用的项目
        for (item in state.inboxItems) {
            if (item.projectId != null && item.projectId !in projectIds) {
                throw ValidationException("待办「${item.content.take(10)}」引用了不存在的项目: ${item.projectId}")
            }
        }
    }
}
