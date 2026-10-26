package com.shiftcopilot.background

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** Re-arms the periodic scoring worker after a reboot if shift mode was on. */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_BOOT_COMPLETED) return
        val prefs = context.getSharedPreferences(ShiftSchedulerModule.PREFS, Context.MODE_PRIVATE)
        if (prefs.getBoolean(ShiftSchedulerModule.KEY_ON, false)) {
            val interval = prefs.getLong(ShiftSchedulerModule.KEY_INTERVAL, 30)
            ShiftSchedulerModule.schedule(context, interval)
        }
    }
}
