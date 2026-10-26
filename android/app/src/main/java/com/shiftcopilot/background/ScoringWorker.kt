package com.shiftcopilot.background

import android.content.Context
import android.content.Intent
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.facebook.react.HeadlessJsTaskService

/**
 * WorkManager fallback: fires every N minutes while shift mode is on and kicks
 * the Headless JS scoring task, even if Android killed the app process.
 */
class ScoringWorker(appContext: Context, params: WorkerParameters) :
    CoroutineWorker(appContext, params) {

    override suspend fun doWork(): Result {
        return try {
            val intent = Intent(applicationContext, ScoringHeadlessTaskService::class.java)
            applicationContext.startService(intent)
            HeadlessJsTaskService.acquireWakeLockNow(applicationContext)
            Result.success()
        } catch (e: Exception) {
            Result.retry()
        }
    }
}
