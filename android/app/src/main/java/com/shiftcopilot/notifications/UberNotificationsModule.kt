package com.shiftcopilot.notifications

import android.content.Intent
import android.provider.Settings
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import org.json.JSONObject

class UberNotificationsModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    init {
        instance = this
    }

    override fun getName() = "UberNotifications"

    @ReactMethod
    fun isPermissionGranted(promise: Promise) {
        val enabled = Settings.Secure.getString(
            reactApplicationContext.contentResolver,
            "enabled_notification_listeners"
        ) ?: ""
        promise.resolve(enabled.contains(reactApplicationContext.packageName))
    }

    @ReactMethod
    fun openNotificationAccessSettings() {
        val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        reactApplicationContext.startActivity(intent)
    }

    @ReactMethod
    fun drainQueue(promise: Promise) {
        val arr = UberNotificationListenerService.drain(reactApplicationContext)
        val list = Arguments.createArray()
        for (i in 0 until arr.length()) {
            list.pushMap(toMap(arr.getJSONObject(i)))
        }
        promise.resolve(list)
    }

    // Required for NativeEventEmitter — no-ops.
    @ReactMethod fun addListener(eventName: String) {}
    @ReactMethod fun removeListeners(count: Int) {}

    companion object {
        @Volatile private var instance: UberNotificationsModule? = null

        private fun toMap(o: JSONObject): WritableMap = Arguments.createMap().apply {
            putString("pkg", o.optString("pkg"))
            putString("title", o.optString("title"))
            putString("text", o.optString("text"))
            putDouble("postedAt", o.optLong("postedAt").toDouble())
        }

        /**
         * Push a live event to JS if the React context is up. Returns true when
         * delivered — the caller only queues the item when this returns false,
         * so each notification is processed exactly once.
         */
        fun emitIfAlive(item: JSONObject): Boolean {
            val mod = instance ?: return false
            val ctx = mod.reactApplicationContext
            if (!ctx.hasActiveReactInstance()) return false
            ctx.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit("UberNotification", toMap(item))
            return true
        }
    }
}
