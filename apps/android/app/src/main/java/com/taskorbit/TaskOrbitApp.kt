package com.taskorbit

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build

class TaskOrbitApp : Application() {

    companion object {
        const val POMODORO_CHANNEL_ID = "pomodoro_timer_channel"
    }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannels()
    }

    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val name = "专注计时器"
            val descriptionText = "显示番茄钟正在运行的常驻通知与完成提醒"
            val importance = NotificationManager.IMPORTANCE_LOW
            val channel = NotificationChannel(POMODORO_CHANNEL_ID, name, importance).apply {
                description = descriptionText
                setShowBadge(false)
            }
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }
}
