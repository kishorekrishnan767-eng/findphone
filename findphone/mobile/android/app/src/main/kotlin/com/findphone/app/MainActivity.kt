package com.findphone.app

import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import android.os.Bundle
import io.flutter.embedding.android.FlutterActivity

class MainActivity : FlutterActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        createSharingChannel()
    }

    /**
     * Channel for the "Sharing location" foreground-service notification. Low importance: always
     * visible in the shade, never makes a sound. The id must match ServiceProtocol.notificationChannelId.
     * Channels persist, so it already exists when the service restarts after a reboot.
     */
    private fun createSharingChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val channel = NotificationChannel(
            "findphone_sharing",
            "Location sharing",
            NotificationManager.IMPORTANCE_LOW,
        ).apply {
            description = "Shown while FindPhone is sharing this phone's location."
            setShowBadge(false)
        }
        getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
    }
}
