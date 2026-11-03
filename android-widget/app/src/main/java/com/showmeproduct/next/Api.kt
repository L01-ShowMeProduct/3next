package com.showmeproduct.next

import org.json.JSONArray
import org.json.JSONObject

/** Các thao tác widget cần, độc lập với cách từng API đặt tên endpoint. */
interface Backend {
    /** Các việc nên làm tiếp, đã xếp hạng. */
    fun top(baseUrl: String, limit: Int): List<TopTask>

    fun complete(baseUrl: String, taskId: String)

    /** Gửi một câu, tách và lưu luôn. Trả về số việc đã lưu. */
    fun captureAndConfirm(baseUrl: String, text: String, voice: Boolean): Int
}

/** API 3Next trong thư mục `backend/` của repo: có sẵn `GET /tasks/top`. */
object NextBackend : Backend {
    override fun top(baseUrl: String, limit: Int): List<TopTask> =
        TopTaskParser.parseNext(ApiClient.request("GET", "$baseUrl/tasks/top?limit=$limit"))

    override fun complete(baseUrl: String, taskId: String) {
        ApiClient.request("POST", "$baseUrl/tasks/$taskId/complete", "{}")
    }

    override fun captureAndConfirm(baseUrl: String, text: String, voice: Boolean): Int {
        val body = JSONObject().put("text", text).put("source", if (voice) "voice" else "text").toString()
        val capture = JSONObject(ApiClient.request("POST", "$baseUrl/captures", body))
        val confirmed = JSONObject(ApiClient.request("POST", "$baseUrl/captures/${capture.getString("id")}/confirm", "{}"))
        return confirmed.getJSONArray("tasks").length()
    }
}

/**
 * API nhóm đã deploy (Swagger ở `/api`): lấy Top 3 bằng `GET /tasks?status=open&ranked=true`,
 * hoàn thành bằng `PATCH /tasks/{id}/status`, ghi nhanh qua capture, parse, confirm.
 */
object TeamBackend : Backend {
    override fun top(baseUrl: String, limit: Int): List<TopTask> =
        TopTaskParser.parseTeam(ApiClient.request("GET", "$baseUrl/tasks?status=open&ranked=true"), limit)

    override fun complete(baseUrl: String, taskId: String) {
        ApiClient.request("PATCH", "$baseUrl/tasks/$taskId/status", """{"status":"done"}""")
    }

    override fun captureAndConfirm(baseUrl: String, text: String, voice: Boolean): Int {
        val create = JSONObject().put("text", text).put("mode", if (voice) "voice" else "text").toString()
        val captureId = JSONObject(ApiClient.request("POST", "$baseUrl/captures", create)).getString("id")

        val parsed = JSONObject(ApiClient.request("POST", "$baseUrl/captures/$captureId/parse", """{"engine":"local"}"""))
        val drafts: JSONArray = parsed.optJSONArray("drafts") ?: JSONArray()
        if (drafts.length() == 0) {
            // Capture còn lại ở trạng thái nháp, xóa đi để không để rác trên server.
            runCatching { ApiClient.request("DELETE", "$baseUrl/captures/$captureId") }
            throw ApiException(422, "Không tách được việc nào từ nội dung này")
        }
        val ids = JSONArray().also { arr -> (0 until drafts.length()).forEach { arr.put(drafts.getJSONObject(it).getString("id")) } }

        val confirmed = JSONObject(
            ApiClient.request("POST", "$baseUrl/captures/$captureId/confirm", JSONObject().put("selectedIds", ids).toString()),
        )
        return confirmed.optInt("created", ids.length())
    }
}

/**
 * Chọn đúng cách gọi theo địa chỉ máy chủ. API 3Next trong repo có `GET /health`,
 * API nhóm đã deploy thì không có, nên dựa vào đó để nhận biết. Kết quả được nhớ theo địa chỉ.
 */
object Api {
    private const val KIND_NEXT = "next"
    private const val KIND_TEAM = "team"

    fun top(prefs: Prefs, limit: Int = 3): List<TopTask> = backend(prefs).top(prefs.baseUrl, limit)

    fun complete(prefs: Prefs, taskId: String) = backend(prefs).complete(prefs.baseUrl, taskId)

    fun captureAndConfirm(prefs: Prefs, text: String, voice: Boolean): Int =
        backend(prefs).captureAndConfirm(prefs.baseUrl, text, voice)

    /** Thử kết nối tới [baseUrl], trả về tên loại API nhận biết được. Ném lỗi nếu không kết nối được. */
    fun testConnection(baseUrl: String): String {
        val kind = detect(baseUrl)
        // Gọi thử một lần để chắc chắn đọc được dữ liệu.
        pick(kind).top(baseUrl, 1)
        return if (kind == KIND_NEXT) "API 3Next" else "API nhóm"
    }

    private fun backend(prefs: Prefs): Backend {
        val known = prefs.detectedKind
        if (known != null) return pick(known)
        val kind = detect(prefs.baseUrl)
        prefs.detectedKind = kind
        return pick(kind)
    }

    private fun pick(kind: String): Backend = if (kind == KIND_NEXT) NextBackend else TeamBackend

    private fun detect(baseUrl: String): String = try {
        val health = JSONObject(ApiClient.request("GET", "$baseUrl/health"))
        if (health.optString("service") == "3next-backend") KIND_NEXT else KIND_TEAM
    } catch (e: ApiException) {
        if (e.code == 404) KIND_TEAM else throw e
    }
}
