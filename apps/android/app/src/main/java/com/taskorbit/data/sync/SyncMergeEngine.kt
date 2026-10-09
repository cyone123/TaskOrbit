package com.taskorbit.data.sync

import com.taskorbit.data.common.StateValidator
import com.taskorbit.domain.model.AppState
import com.taskorbit.domain.model.DailyPlan
import com.taskorbit.domain.model.EntityType
import com.taskorbit.domain.model.InboxItem
import com.taskorbit.domain.model.PomodoroSession
import com.taskorbit.domain.model.Project
import com.taskorbit.domain.model.Task
import com.taskorbit.domain.model.Tombstone
import kotlin.math.max

object SyncMergeEngine {

    const val TOMBSTONE_MAX_AGE_MS = 30L * 24 * 60 * 60 * 1000L // 30 days

    fun pruneTombstones(tombstones: List<Tombstone>, now: Long = System.currentTimeMillis()): List<Tombstone> {
        val cutoff = now - TOMBSTONE_MAX_AGE_MS
        val latestById = mutableMapOf<String, Tombstone>()

        for (item in tombstones) {
            if (item.deletedAt < cutoff) continue
            val existing = latestById[item.id]
            if (existing == null || item.deletedAt > existing.deletedAt) {
                latestById[item.id] = item
            }
        }

        return latestById.values.toList()
    }

    private interface Timestamped {
        val id: String
        val updatedAt: Long
    }

    private data class ProjectAdapter(val p: Project) : Timestamped {
        override val id: String get() = p.id
        override val updatedAt: Long get() = p.updatedAt
    }

    private data class TaskAdapter(val t: Task) : Timestamped {
        override val id: String get() = t.id
        override val updatedAt: Long get() = t.updatedAt
    }

    private data class PlanAdapter(val d: DailyPlan) : Timestamped {
        override val id: String get() = d.id
        override val updatedAt: Long get() = d.updatedAt
    }

    private data class InboxAdapter(val i: InboxItem) : Timestamped {
        override val id: String get() = i.id
        override val updatedAt: Long get() = i.updatedAt
    }

    private data class MergeEntityResult<T>(
        val merged: List<T>,
        val revivedIds: Set<String>
    )

    private fun <T> mergeEntities(
        localList: List<T>,
        remoteList: List<T>,
        idSelector: (T) -> String,
        updatedAtSelector: (T) -> Long,
        tombstoneMap: Map<String, Long>
    ): MergeEntityResult<T> {
        val localMap = localList.associateBy(idSelector)
        val remoteMap = remoteList.associateBy(idSelector)
        val allIds = localMap.keys + remoteMap.keys

        val merged = mutableListOf<T>()
        val revivedIds = mutableSetOf<String>()

        for (id in allIds) {
            val local = localMap[id]
            val remote = remoteMap[id]
            val tombstoneDeletedAt = tombstoneMap[id]

            val localUpdated = local?.let(updatedAtSelector) ?: 0L
            val remoteUpdated = remote?.let(updatedAtSelector) ?: 0L
            val maxUpdatedAt = max(localUpdated, remoteUpdated)

            // 若实体已被删除且在此之后未发生新的更新，跳过
            if (tombstoneDeletedAt != null && tombstoneDeletedAt >= maxUpdatedAt) {
                continue
            }

            // 若在此前曾被标记删除，但在删除时间后又有新的修改，视为复活
            if (tombstoneDeletedAt != null && maxUpdatedAt > tombstoneDeletedAt) {
                revivedIds.add(id)
            }

            if (local != null && remote != null) {
                // 最后写入胜出 (LWW)
                merged.add(if (remoteUpdated > localUpdated) remote else local)
            } else if (local != null) {
                merged.add(local)
            } else if (remote != null) {
                merged.add(remote)
            }
        }

        return MergeEntityResult(merged, revivedIds)
    }

    private fun mergeSessions(
        local: List<PomodoroSession>,
        remote: List<PomodoroSession>
    ): List<PomodoroSession> {
        val byId = mutableMapOf<String, PomodoroSession>()
        for (session in local) {
            byId[session.id] = session
        }
        for (session in remote) {
            if (!byId.containsKey(session.id)) {
                byId[session.id] = session
            }
        }
        // 按 startedAt 降序排列
        return byId.values.sortedByDescending { it.startedAt }
    }

    /**
     * 执行三方 / LWW 智能合并：
     * 本地凭据 (webDavSettings)、瞬态状态 (activeTimer)、Vault 配置保持使用本地状态
     */
    fun mergeAppState(
        localState: AppState,
        localTombstones: List<Tombstone>,
        remotePayload: AppState,
        remoteTombstones: List<Tombstone>,
        now: Long = System.currentTimeMillis()
    ): MergeResult {
        // 1. 合并并清理墓碑
        val allTombstones = pruneTombstones(localTombstones + remoteTombstones, now)
        val tombstoneMap = allTombstones.associate { it.id to it.deletedAt }

        // 2. 合并可变业务实体
        val projectsRes = mergeEntities(
            localList = localState.projects,
            remoteList = remotePayload.projects,
            idSelector = { it.id },
            updatedAtSelector = { it.updatedAt },
            tombstoneMap = tombstoneMap
        )

        val tasksRes = mergeEntities(
            localList = localState.tasks,
            remoteList = remotePayload.tasks,
            idSelector = { it.id },
            updatedAtSelector = { it.updatedAt },
            tombstoneMap = tombstoneMap
        )

        val plansRes = mergeEntities(
            localList = localState.dailyPlans,
            remoteList = remotePayload.dailyPlans,
            idSelector = { it.id },
            updatedAtSelector = { it.updatedAt },
            tombstoneMap = tombstoneMap
        )

        val inboxRes = mergeEntities(
            localList = localState.inboxItems,
            remoteList = remotePayload.inboxItems,
            idSelector = { it.id },
            updatedAtSelector = { it.updatedAt },
            tombstoneMap = tombstoneMap
        )

        // 3. 外键引用一致性检查与级联清理
        val projectIds = projectsRes.merged.map { it.id }.toSet()
        val validTasks = mutableListOf<Task>()
        val cascadedTombstones = mutableListOf<Tombstone>()

        for (task in tasksRes.merged) {
            if (projectIds.contains(task.projectId)) {
                validTasks.add(task)
            } else {
                cascadedTombstones.add(
                    Tombstone(id = task.id, type = EntityType.TASK, deletedAt = now)
                )
            }
        }

        val taskIds = validTasks.map { it.id }.toSet()
        val validPlans = mutableListOf<DailyPlan>()

        for (plan in plansRes.merged) {
            var projectId = plan.projectId
            var taskId = plan.taskId

            if (taskId != null && !taskIds.contains(taskId)) {
                taskId = null
            }
            if (projectId != null && !projectIds.contains(projectId)) {
                projectId = null
                taskId = null
            }

            validPlans.add(plan.copy(projectId = projectId, taskId = taskId))
        }

        // 4. 合并只读专注记录
        val mergedSessions = mergeSessions(localState.pomodoroSessions, remotePayload.pomodoroSessions)

        // 5. 整理最终的墓碑列表（排除已复活的 ID）
        val allRevived = projectsRes.revivedIds + tasksRes.revivedIds + plansRes.revivedIds + inboxRes.revivedIds
        val finalTombstones = pruneTombstones(
            (allTombstones + cascadedTombstones).filter { !allRevived.contains(it.id) },
            now
        )

        // 6. 组装合并候选状态
        val candidateState = AppState(
            version = localState.version,
            projects = projectsRes.merged,
            tasks = validTasks,
            dailyPlans = validPlans,
            inboxItems = inboxRes.merged,
            pomodoroSessions = mergedSessions,
            settings = localState.settings,
            vaultSettings = localState.vaultSettings,
            activeTimer = localState.activeTimer,
            webDavSettings = localState.webDavSettings,
            aiSettings = localState.aiSettings
        )

        // 7. 通过完整性校验
        StateValidator.validate(candidateState)

        // 8. 检测相对于本地是否有数据变化
        val hasChanges = candidateState.projects != localState.projects ||
                candidateState.tasks != localState.tasks ||
                candidateState.dailyPlans != localState.dailyPlans ||
                candidateState.inboxItems != localState.inboxItems ||
                candidateState.pomodoroSessions != localState.pomodoroSessions

        return MergeResult(
            mergedState = candidateState,
            mergedTombstones = finalTombstones,
            hasChanges = hasChanges
        )
    }
}
