package com.shiftcopilot.background

import android.content.Context
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.util.concurrent.TimeUnit

class ShiftSchedulerModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "ShiftScheduler"

    @ReactMethod
    fun schedule(intervalMinutes: Double) {
        schedule(reactApplicationContext, intervalMinutes.toLong())
        reactApplicationContext
            .getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit().putBoolean(KEY_ON, true).putLong(KEY_INTERVAL, intervalMinutes.toLong()).apply()
    }

    @ReactMethod
    fun cancel() {
        WorkManager.getInstance(reactApplicationContext).cancelUniqueWork(WORK_NAME)
        reactApplicationContext
            .getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit().putBoolean(KEY_ON, false).apply()
    }

    companion object {
        const val WORK_NAME = "scoring_periodic"
        const val PREFS = "shift_scheduler"
        const val KEY_ON = "on"
        const val KEY_INTERVAL = "interval"

        fun schedule(context: Context, intervalMinutes: Long) {
            // WorkManager's minimum periodic interval is 15 minutes.
            val interval = maxOf(15L, intervalMinutes)
            val request = PeriodicWorkRequestBuilder<ScoringWorker>(interval, TimeUnit.MINUTES).build()
            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                WORK_NAME,
                ExistingPeriodicWorkPolicy.UPDATE,
                request,
            )
        }
    }
}
