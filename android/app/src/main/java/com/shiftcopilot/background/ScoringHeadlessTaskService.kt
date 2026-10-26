package com.shiftcopilot.background

import android.content.Intent
import com.facebook.react.HeadlessJsTaskService
import com.facebook.react.bridge.Arguments
import com.facebook.react.jstasks.HeadlessJsTaskConfig

/** Runs the JS 'ScoringTask' (registered in index.js) with no UI. */
class ScoringHeadlessTaskService : HeadlessJsTaskService() {
    override fun getTaskConfig(intent: Intent?): HeadlessJsTaskConfig {
        return HeadlessJsTaskConfig(
            "ScoringTask",
            Arguments.createMap(),
            60_000, // timeout ms
            true,   // allowed in foreground too
        )
    }
}
