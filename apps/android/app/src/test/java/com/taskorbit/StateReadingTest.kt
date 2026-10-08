package com.taskorbit

import com.taskorbit.data.common.StateCodec
import com.taskorbit.data.common.UnsupportedDataVersionException
import com.taskorbit.data.persistence.AtomicFilePersistence
import com.taskorbit.data.sync.SyncCoordinator
import com.taskorbit.domain.TransferEngine
import com.taskorbit.domain.model.AppState
import kotlinx.coroutines.runBlocking
import org.junit.Assert.*
import org.junit.Test
import java.nio.file.Files

class StateReadingTest {
    @Test
    fun `local import and sync use identical migrations`() {
        val raw = """{"version":7,"settings":{"focusMinutes":36}}"""
        val local = StateCodec.decode(raw)
        val imported = TransferEngine.parseImportSnapshot(raw)
        val synced = SyncCoordinator.decodeEnvelope("""{
          "format":"task-orbit-webdav-sync","formatVersion":1,"deviceId":"desktop","updatedAt":123,"state":$raw
        }""").state
        assertEquals(local, imported)
        assertEquals(local, synced)
        assertEquals(11, synced.version)
    }

    @Test
    fun `future main file is not classified as corrupt or replaced by backup`() = runBlocking {
        val dir = Files.createTempDirectory("task-orbit-version").toFile()
        try {
            val main = dir.resolve("data.json")
            val backup = dir.resolve("data.json.bak")
            val future = """{"version":12,"tasks":[]}"""
            main.writeText(future)
            backup.writeText("""{"version":7}""")
            val persistence = AtomicFilePersistence(dir, this)
            try {
                persistence.loadState()
                fail("Future version must stop loading")
            } catch (_: UnsupportedDataVersionException) { }
            assertFalse(dir.resolve("data.json.corrupt").exists())
            try {
                persistence.saveImmediately(AppState())
                fail("Writes must be blocked")
            } catch (_: IllegalStateException) { }
            assertEquals(future, main.readText())
            assertEquals("""{"version":7}""", backup.readText())
        } finally { dir.deleteRecursively() }
    }

    @Test(expected = UnsupportedDataVersionException::class)
    fun `future sync state is rejected before merge`() {
        SyncCoordinator.decodeEnvelope("""{"format":"task-orbit-webdav-sync","formatVersion":1,
          "deviceId":"desktop","updatedAt":1,"state":{"version":12}}""")
    }

    @Test(expected = UnsupportedDataVersionException::class)
    fun `future sync envelope is rejected`() {
        SyncCoordinator.decodeEnvelope("""{"format":"task-orbit-webdav-sync","formatVersion":2,
          "deviceId":"desktop","updatedAt":1,"state":{"version":11}}""")
    }

    @Test
    fun `corrupt main file still recovers old backup`() = runBlocking {
        val dir = Files.createTempDirectory("task-orbit-recovery").toFile()
        try {
            dir.resolve("data.json").writeText("invalid")
            dir.resolve("data.json.bak").writeText("""{"version":7,"settings":{"focusMinutes":31}}""")
            val result = AtomicFilePersistence(dir, this).loadState()
            assertTrue(result.recoveredFromBackup)
            assertEquals(31, result.state.settings.focusMinutes)
            assertEquals(11, result.state.version)
        } finally { dir.deleteRecursively() }
    }
}
