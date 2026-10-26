package com.shiftcopilot.notifications

import android.app.Notification
import android.content.Context
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import org.json.JSONArray
import org.json.JSONObject

/**
 * Captures notifications posted on THIS device by the Uber driver app, after
 * the user explicitly grants Notification Access in system settings.
 *
 * Notifications are appended to a SharedPreferences-backed queue so nothing is
 * lost while the React Native context is dead; the JS side drains the queue on
 * start and also receives live events via UberNotificationsModule.
 */
class UberNotificationListenerService : NotificationListenerService() {

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        if (sbn.packageName !in WATCHED_PACKAGES) return

        val extras = sbn.notification.extras
        val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString() ?: ""
        val text = (extras.getCharSequence(Notification.EXTRA_BIG_TEXT)
            ?: extras.getCharSequence(Notification.EXTRA_TEXT))?.toString() ?: ""
        if (title.isEmpty() && text.isEmpty()) return

        val item = JSONObject().apply {
            put("pkg", sbn.packageName)
            put("title", title)
            put("text", text)
            put("postedAt", sbn.postTime)
        }

        // Deliver live when JS is running; otherwise queue for the next app start.
        if (!UberNotificationsModule.emitIfAlive(item)) {
            enqueue(applicationContext, item)
        }
    }

    companion object {
        /**
         * Uber driver app package(s). Add regional/alternate builds here if the
         * driver's phone uses one (check with: adb shell pm list packages uber).
         */
        val WATCHED_PACKAGES = setOf(
            "com.ubercab.driver",
        )

        private const val PREFS = "uber_notification_queue"
        private const val KEY = "queue"
        private const val MAX_QUEUE = 500

        @Synchronized
        fun enqueue(context: Context, item: JSONObject) {
            val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            val arr = JSONArray(prefs.getString(KEY, "[]"))
            arr.put(item)
            val trimmed = if (arr.length() > MAX_QUEUE) {
                JSONArray().also { t ->
                    for (i in arr.length() - MAX_QUEUE until arr.length()) t.put(arr.get(i))
                }
            } else arr
            prefs.edit().putString(KEY, trimmed.toString()).apply()
        }

        @Synchronized
        fun drain(context: Context): JSONArray {
            val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            val arr = JSONArray(prefs.getString(KEY, "[]"))
            prefs.edit().putString(KEY, "[]").apply()
            return arr
        }
    }
}
