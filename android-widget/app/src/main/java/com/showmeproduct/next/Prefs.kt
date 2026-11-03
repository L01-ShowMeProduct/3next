package com.showmeproduct.next

import android.content.Context

/** Lưu địa chỉ API và bản Top 3 gần nhất (để widget vẫn hiển thị khi mất mạng). */
class Prefs(context: Context) {
    private val prefs = context.applicationContext.getSharedPreferences("next_widget", Context.MODE_PRIVATE)

    var baseUrl: String
        get() = prefs.getString(KEY_BASE_URL, null) ?: BuildConfig.DEFAULT_API_URL
        set(value) = prefs.edit().putString(KEY_BASE_URL, value.trim().trimEnd('/')).apply()

    /** JSON thô của `GET /tasks/top` lần gần nhất thành công. */
    var cachedTop: String?
        get() = prefs.getString(KEY_CACHE, null)
        set(value) = prefs.edit().putString(KEY_CACHE, value).apply()

    /** Thời điểm (epoch ms) cập nhật thành công gần nhất, 0 nếu chưa có. */
    var cachedAt: Long
        get() = prefs.getLong(KEY_CACHED_AT, 0L)
        set(value) = prefs.edit().putLong(KEY_CACHED_AT, value).apply()

    private companion object {
        const val KEY_BASE_URL = "base_url"
        const val KEY_CACHE = "cached_top"
        const val KEY_CACHED_AT = "cached_at"
    }
}
