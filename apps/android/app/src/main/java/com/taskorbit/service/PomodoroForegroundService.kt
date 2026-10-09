package com.taskorbit.service

import android.app.Notification
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import androidx.core.app.NotificationCompat
import com.taskorbit.MainActivity
import com.taskorbit.R
import com.taskorbit.TaskOrbitApp
import com.taskorbit.data.repository.AppStateRepository
import com.taskorbit.domain.model.ActiveTimer
import com.taskorbit.domain.model.PomodoroKind
import com.taskorbit.domain.model.PomodoroLink
import com.taskorbit.domain.model.TimerStatus
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

class PomodoroForegroundService : Service() {

    companion object {
        const val NOTIFICATION_ID = 1001
        const val COMPLETE_NOTIFICATION_ID = 1002

        const val ACTION_START = "com.taskorbit.action.START_TIMER"
        const val ACTION_PAUSE = "com.taskorbit.action.PAUSE_TIMER"
        const val ACTION_RESUME = "com.taskorbit.action.RESUME_TIMER"
        const val ACTION_SKIP = "com.taskorbit.action.SKIP_TIMER"
        const val ACTION_STOP = "com.taskorbit.action.STOP_TIMER"

        fun startService(context: Context) {
            val intent = Intent(context, PomodoroForegroundService::class.java).apply {
                action = ACTION_START
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun stopService(context: Context) {
            val intent = Intent(context, PomodoroForegroundService::class.java).apply {
                action = ACTION_STOP
            }
            context.startService(intent)
        }
    }

    private val serviceScope = CoroutineScope(Dispatchers.Main + Job())
    private var tickerJob: Job? = null
    private lateinit var repository: AppStateRepository
    private lateinit var notificationManager: NotificationManager

    override fun onCreate() {
        super.onCreate()
        repository = AppStateRepository.getInstance(application)
        notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_PAUSE -> repository.pausePomodoro()
            ACTION_RESUME -> {
                val current = repository.state.value.activeTimer
                repository.startPomodoro(
                    PomodoroLink(
                        projectId = current?.projectId,
                        taskId = current?.taskId,
                        dailyPlanId = current?.dailyPlanId
                    )
                )
            }
            ACTION_SKIP -> repository.skipPomodoro()
            ACTION_STOP -> {
                repository.resetPomodoro()
                stopForegroundInternal()
                stopSelf()
                return START_NOT_STICKY
            }
        }

        startForegroundWithNotification()
        observeTimerState()

        return START_STICKY
    }

    private fun startForegroundWithNotification() {
        val initialNotification = buildNotification(repository.state.value.activeTimer)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            startForeground(
                NOTIFICATION_ID,
                initialNotification,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE
            )
        } else {
            startForeground(NOTIFICATION_ID, initialNotification)
        }
    }

    private fun observeTimerState() {
        tickerJob?.cancel()
        tickerJob = serviceScope.launch {
            repository.state.collectLatest { state ->
                val timer = state.activeTimer
                if (timer == null || timer.status != TimerStatus.RUNNING) {
                    if (timer?.status == TimerStatus.PAUSED) {
                        // 处于暂停状态，更新通知展示暂停，但不轮询
                        notificationManager.notify(NOTIFICATION_ID, buildNotification(timer))
                    } else {
                        // 计时器已重置或不存在，退出前台服务
                        stopForegroundInternal()
                        stopSelf()
                    }
                    return@collectLatest
                }

                // 计时器处于 RUNNING 状态，每秒更新通知并对账
                while (isActive) {
                    val now = System.currentTimeMillis()
                    if (timer.endAt != null && timer.endAt <= now) {
                        // 阶段到期，执行对账并触发提醒
                        val prevPhase = timer.phase
                        repository.reconcileTimer()
                        vibrateAlert()
                        sendCompletionNotification(prevPhase)
                        break // 对账后 state flow 会发射新状态，重新进入 collectLatest
                    } else {
                        notificationManager.notify(NOTIFICATION_ID, buildNotification(timer))
                    }
                    delay(1000L)
                }
            }
        }
    }

    private fun buildNotification(timer: ActiveTimer?): Notification {
        val title = when (timer?.phase) {
            PomodoroKind.FOCUS -> "专注中"
            PomodoroKind.SHORT_BREAK -> "休息时间"
            PomodoroKind.LONG_BREAK -> "长休息时间"
            null -> "番茄钟"
        }

        val remainingMs = if (timer?.status == TimerStatus.RUNNING && timer.endAt != null) {
            maxOf(0L, timer.endAt - System.currentTimeMillis())
        } else {
            timer?.remainingMs ?: 0L
        }

        val totalSeconds = (remainingMs + 999) / 1000
        val minutes = totalSeconds / 60
        val seconds = totalSeconds % 60
        val timeString = String.format("%02d:%02d", minutes, seconds)

        val state = repository.state.value
        val taskName = timer?.taskId?.let { tid -> state.tasks.find { it.id == tid }?.name }
        val projectName = timer?.projectId?.let { pid -> state.projects.find { it.id == pid }?.name }
        val targetDesc = when {
            taskName != null -> "任务：$taskName"
            projectName != null -> "项目：$projectName"
            else -> "保持专注，创造心流"
        }

        val contentText = "$timeString · $targetDesc"

        // 点击打开主界面
        val contentIntent = PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
            },
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val builder = NotificationCompat.Builder(this, TaskOrbitApp.POMODORO_CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(title)
            .setContentText(contentText)
            .setContentIntent(contentIntent)
            .setOngoing(timer?.status == TimerStatus.RUNNING)
            .setOnlyAlertOnce(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)

        // 添加快捷操作
        if (timer?.status == TimerStatus.RUNNING) {
            val pauseIntent = PendingIntent.getService(
                this,
                1,
                Intent(this, PomodoroForegroundService::class.java).apply { action = ACTION_PAUSE },
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            builder.addAction(android.R.drawable.ic_media_pause, "暂停", pauseIntent)
        } else if (timer?.status == TimerStatus.PAUSED) {
            val resumeIntent = PendingIntent.getService(
                this,
                2,
                Intent(this, PomodoroForegroundService::class.java).apply { action = ACTION_RESUME },
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            builder.addAction(android.R.drawable.ic_media_play, "继续", resumeIntent)
        }

        val skipIntent = PendingIntent.getService(
            this,
            3,
            Intent(this, PomodoroForegroundService::class.java).apply { action = ACTION_SKIP },
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        builder.addAction(android.R.drawable.ic_media_next, "跳过", skipIntent)

        return builder.build()
    }

    private fun sendCompletionNotification(completedPhase: PomodoroKind) {
        val title = if (completedPhase == PomodoroKind.FOCUS) "🎉 专注完成！" else "⏰ 休息结束！"
        val message = if (completedPhase == PomodoroKind.FOCUS) "太棒了，完成了一个番茄钟，休息一下吧。" else "精力充沛，准备好开始新的专注了吗？"

        val contentIntent = PendingIntent.getActivity(
            this,
            4,
            Intent(this, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
            },
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(this, TaskOrbitApp.POMODORO_CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(title)
            .setContentText(message)
            .setContentIntent(contentIntent)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setDefaults(NotificationCompat.DEFAULT_ALL)
            .build()

        notificationManager.notify(COMPLETE_NOTIFICATION_ID, notification)
    }

    private fun vibrateAlert() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val vibratorManager = getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager
                vibratorManager?.defaultVibrator?.vibrate(
                    VibrationEffect.createWaveform(longArrayOf(0, 300, 200, 300), -1)
                )
            } else {
                @Suppress("DEPRECATION")
                val vibrator = getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator?.vibrate(
                        VibrationEffect.createWaveform(longArrayOf(0, 300, 200, 300), -1)
                    )
                } else {
                    @Suppress("DEPRECATION")
                    vibrator?.vibrate(longArrayOf(0, 300, 200, 300), -1)
                }
            }
        } catch (_: Exception) {}
    }

    private fun stopForegroundInternal() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            stopForeground(STOP_FOREGROUND_REMOVE)
        } else {
            @Suppress("DEPRECATION")
            stopForeground(true)
        }
    }

    override fun onDestroy() {
        serviceScope.cancel()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
