package com.showmeproduct.next

import org.json.JSONArray
import org.json.JSONObject

/** Một việc trong Top 3, đã chuẩn hóa từ API nào cũng được. */
data class TopTask(
    val id: String,
    val title: String,
    /** Hạn chót ISO 8601, null nếu chưa có. */
    val deadline: String?,
    val priority: String,
    val score: Double = 0.0,
    val reason: String = "",
    /** false nếu hạn chót chỉ có ngày, không có giờ cụ thể. */
    val hasTime: Boolean = true,
    /**
     * true nếu API ghi giờ theo kiểu "giờ trần" (ví dụ 9h ghi thành 09:00Z, không đổi múi giờ).
     * Khi đó phải đọc giờ theo UTC để không bị lệch 7 tiếng.
     */
    val floatingTime: Boolean = false,
)

object TopTaskParser {
    /** Đọc JSON mảng từ `GET /tasks/top` của API 3Next (bản trong thư mục backend/). */
    fun parseNext(json: String): List<TopTask> {
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

    /**
     * Đọc JSON từ `GET /tasks?status=open&ranked=true` của API nhóm đã deploy.
     * Danh sách đã được server xếp hạng, nên lấy các việc đầu tiên.
     */
    fun parseTeam(json: String, limit: Int): List<TopTask> {
        val tasks = JSONObject(json).getJSONArray("tasks")
        return (0 until minOf(tasks.length(), limit)).map { i ->
            val t = tasks.getJSONObject(i)
            TopTask(
                id = t.getString("id"),
                title = t.getString("title"),
                deadline = if (t.isNull("due")) null else t.getString("due"),
                priority = t.optString("priority", "medium"),
                hasTime = t.optBoolean("hasTime", false),
                floatingTime = true,
            )
        }
    }

    /** Lưu danh sách đã chuẩn hóa vào cache. */
    fun toJson(tasks: List<TopTask>): String = JSONArray().also { array ->
        tasks.forEach { t ->
            array.put(
                JSONObject()
                    .put("id", t.id)
                    .put("title", t.title)
                    .put("deadline", t.deadline ?: JSONObject.NULL)
                    .put("priority", t.priority)
                    .put("score", t.score)
                    .put("reason", t.reason)
                    .put("hasTime", t.hasTime)
                    .put("floatingTime", t.floatingTime),
            )
        }
    }.toString()

    /** Đọc lại danh sách từ cache do [toJson] tạo ra. */
    fun parseCache(json: String): List<TopTask> {
        val array = JSONArray(json)
        return (0 until array.length()).map { i ->
            val t = array.getJSONObject(i)
            TopTask(
                id = t.getString("id"),
                title = t.getString("title"),
                deadline = if (t.isNull("deadline")) null else t.getString("deadline"),
                priority = t.optString("priority", "medium"),
                score = t.optDouble("score", 0.0),
                reason = t.optString("reason", ""),
                hasTime = t.optBoolean("hasTime", true),
                floatingTime = t.optBoolean("floatingTime", false),
            )
        }
    }

    /** Lấy thông báo lỗi từ phản hồi lỗi của API (`{"message": ...}`), nếu có. */
    fun errorMessage(body: String): String? = try {
        when (val message = JSONObject(body).opt("message")) {
            is JSONArray -> (0 until message.length()).joinToString("; ") { message.getString(it) }
            null -> null
            else -> message.toString()
        }
    } catch (_: Exception) {
        null
    }
}
