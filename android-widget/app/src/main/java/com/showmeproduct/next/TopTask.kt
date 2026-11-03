package com.showmeproduct.next

import org.json.JSONArray
import org.json.JSONObject

/** Một việc trong Top 3, đúng với phản hồi của `GET /tasks/top`. */
data class TopTask(
    val id: String,
    val title: String,
    val deadline: String?,
    val priority: String,
    val score: Double,
    val reason: String,
)

object TopTaskParser {
    /** Đọc JSON mảng từ `GET /tasks/top`. */
    fun parse(json: String): List<TopTask> {
        val array = JSONArray(json)
        return (0 until array.length()).map { i ->
            val item = array.getJSONObject(i)
            val task = item.getJSONObject("task")
            TopTask(
                id = task.getString("id"),
                title = task.getString("title"),
                deadline = task.optString("deadline").takeIf { it.isNotEmpty() && it != "null" },
                priority = task.optString("priority", "medium"),
                score = item.optDouble("score", 0.0),
                reason = item.optString("reason", ""),
            )
        }
    }

    /** Lấy thông báo lỗi từ phản hồi lỗi của API (`{"message": ...}`), nếu có. */
    fun errorMessage(body: String): String? = try {
        val message = JSONObject(body).opt("message")
        when (message) {
            is JSONArray -> (0 until message.length()).joinToString("; ") { message.getString(it) }
            null -> null
            else -> message.toString()
        }
    } catch (_: Exception) {
        null
    }
}
