package com.taskorbit.data.sync

import com.taskorbit.domain.model.AppState
import com.taskorbit.domain.model.DailyPlan
import com.taskorbit.domain.model.EntityType
import com.taskorbit.domain.model.InboxItem
import com.taskorbit.domain.model.InboxItemKind
import com.taskorbit.domain.model.PomodoroKind
import com.taskorbit.domain.model.PomodoroSession
import com.taskorbit.domain.model.Project
import com.taskorbit.domain.model.Task
import com.taskorbit.domain.model.Tombstone
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class SyncMergeEngineTest {

    @Test
    fun testPruneTombstones() {
        val now = 100_000_000L
        val oldDeletedAt = now - SyncMergeEngine.TOMBSTONE_MAX_AGE_MS - 1000L // 30天前
        val recentDeletedAt = now - 1000L

        val tombstones = listOf(
            Tombstone(id = "old_1", type = EntityType.TASK, deletedAt = oldDeletedAt),
            Tombstone(id = "rec_1", type = EntityType.TASK, deletedAt = recentDeletedAt),
            Tombstone(id = "rec_1", type = EntityType.TASK, deletedAt = recentDeletedAt + 500L) // 更晚的重复项
        )

        val pruned = SyncMergeEngine.pruneTombstones(tombstones, now)
        assertEquals(1, pruned.size)
        assertEquals("rec_1", pruned[0].id)
        assertEquals(recentDeletedAt + 500L, pruned[0].deletedAt)
    }

    @Test
    fun testMergeEntitiesLww() {
        val localProject = Project(
            id = "p1",
            name = "本地较旧名称",
            startDate = "2026-09-01",
            endDate = "2026-09-30",
            createdAt = 1000L,
            updatedAt = 2000L
        )
        val remoteProject = Project(
            id = "p1",
            name = "远端更新名称",
            startDate = "2026-09-01",
            endDate = "2026-09-30",
            createdAt = 1000L,
            updatedAt = 3000L
        )

        val localState = AppState(projects = listOf(localProject))
        val remoteState = AppState(projects = listOf(remoteProject))

        val result = SyncMergeEngine.mergeAppState(
            localState = localState,
            localTombstones = emptyList(),
            remotePayload = remoteState,
            remoteTombstones = emptyList()
        )

        assertTrue(result.hasChanges)
        assertEquals(1, result.mergedState.projects.size)
        assertEquals("远端更新名称", result.mergedState.projects[0].name)
    }

    @Test
    fun testMergeWithTombstoneDeleted() {
        val now = 100_000_000L
        val localTask = Task(
            id = "t1",
            projectId = "p1",
            name = "已在远端删除的任务",
            startDate = "2026-09-01",
            endDate = "2026-09-30",
            createdAt = now - 5000L,
            updatedAt = now - 2000L
        )
        val project = Project(
            id = "p1",
            name = "项目",
            startDate = "2026-09-01",
            endDate = "2026-09-30",
            createdAt = now - 5000L,
            updatedAt = now - 5000L
        )

        val localState = AppState(projects = listOf(project), tasks = listOf(localTask))
        val remoteState = AppState(projects = listOf(project), tasks = emptyList())
        val remoteTombstone = listOf(
            Tombstone(id = "t1", type = EntityType.TASK, deletedAt = now - 1000L) // 删除时间晚于更新时间
        )

        val result = SyncMergeEngine.mergeAppState(
            localState = localState,
            localTombstones = emptyList(),
            remotePayload = remoteState,
            remoteTombstones = remoteTombstone,
            now = now
        )

        assertTrue(result.mergedState.tasks.isEmpty())
        assertEquals(1, result.mergedTombstones.size)
        assertEquals("t1", result.mergedTombstones[0].id)
    }

    @Test
    fun testMergeWithRevival() {
        val now = 100_000_000L
        val localTask = Task(
            id = "t1",
            projectId = "p1",
            name = "在本地被编辑并复活的任务",
            startDate = "2026-09-01",
            endDate = "2026-09-30",
            createdAt = now - 5000L,
            updatedAt = now - 500L // 更新时间晚于删除时间
        )
        val project = Project(
            id = "p1",
            name = "项目",
            startDate = "2026-09-01",
            endDate = "2026-09-30",
            createdAt = now - 5000L,
            updatedAt = now - 5000L
        )

        val localState = AppState(projects = listOf(project), tasks = listOf(localTask))
        val remoteState = AppState(projects = listOf(project), tasks = emptyList())
        val remoteTombstone = listOf(
            Tombstone(id = "t1", type = EntityType.TASK, deletedAt = now - 1000L)
        )

        val result = SyncMergeEngine.mergeAppState(
            localState = localState,
            localTombstones = emptyList(),
            remotePayload = remoteState,
            remoteTombstones = remoteTombstone,
            now = now
        )

        // 任务成功复活并保留
        assertEquals(1, result.mergedState.tasks.size)
        assertEquals("t1", result.mergedState.tasks[0].id)
        // 墓碑中已排除该复活任务
        assertTrue(result.mergedTombstones.isEmpty())
    }

    @Test
    fun testForeignKeyCascadeEnforcement() {
        // 任务与计划关联了项目 p1，但 p1 已被删除
        val task = Task(
            id = "t1",
            projectId = "p1",
            name = "孤儿任务",
            startDate = "2026-09-01",
            endDate = "2026-09-30",
            createdAt = 1000L,
            updatedAt = 1000L
        )
        val plan = DailyPlan(
            id = "dp1",
            name = "计划",
            projectId = "p1",
            taskId = "t1",
            date = "2026-09-22",
            startTime = "09:00",
            endTime = "10:00",
            createdAt = 1000L,
            updatedAt = 1000L
        )

        val localState = AppState(projects = emptyList(), tasks = listOf(task), dailyPlans = listOf(plan))
        val remoteState = AppState(projects = emptyList(), tasks = emptyList(), dailyPlans = emptyList())

        val result = SyncMergeEngine.mergeAppState(
            localState = localState,
            localTombstones = emptyList(),
            remotePayload = remoteState,
            remoteTombstones = emptyList(),
            now = 5000L
        )

        // 任务因为缺少 project 被丢弃并生成级联墓碑
        assertTrue(result.mergedState.tasks.isEmpty())
        assertTrue(result.mergedTombstones.any { it.id == "t1" && it.type == EntityType.TASK })

        // 计划保留，但 projectId 与 taskId 置空
        assertEquals(1, result.mergedState.dailyPlans.size)
        assertNull(result.mergedState.dailyPlans[0].projectId)
        assertNull(result.mergedState.dailyPlans[0].taskId)
    }

    @Test
    fun testMergeSessions() {
        val s1 = PomodoroSession(id = "s1", startedAt = 1000L, endedAt = 2000L, minutes = 25)
        val s2 = PomodoroSession(id = "s2", startedAt = 3000L, endedAt = 4000L, minutes = 25)
        val s2Duplicate = PomodoroSession(id = "s2", startedAt = 3000L, endedAt = 4000L, minutes = 25)

        val localState = AppState(pomodoroSessions = listOf(s1))
        val remoteState = AppState(pomodoroSessions = listOf(s2, s2Duplicate))

        val result = SyncMergeEngine.mergeAppState(
            localState = localState,
            localTombstones = emptyList(),
            remotePayload = remoteState,
            remoteTombstones = emptyList()
        )

        assertEquals(2, result.mergedState.pomodoroSessions.size)
        // 验证降序排列 (s2 startedAt 3000 > s1 startedAt 1000)
        assertEquals("s2", result.mergedState.pomodoroSessions[0].id)
        assertEquals("s1", result.mergedState.pomodoroSessions[1].id)
    }
}
