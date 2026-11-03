package com.showmeproduct.next

import org.json.JSONObject
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL

class ApiException(val code: Int, message: String) : IOException(message)

/**
 * Gọi API của 3Next. Dùng HttpURLConnection để không cần thêm thư viện.
 * Phải gọi từ luồng nền, không gọi trên luồng giao diện.
 */
object ApiClient {
    // Server miễn phí trên Render có thể mất 30 đến 60 giây để khởi động lần đầu.
    private const val CONNECT_TIMEOUT_MS = 15_000
    private const val READ_TIMEOUT_MS = 70_000

    /** `GET /tasks/top`, trả về JSON thô để lưu cache. */
    fun fetchTopJson(baseUrl: String, limit: Int = 3): String =
        request("GET", "$baseUrl/tasks/top?limit=$limit")

    fun complete(baseUrl: String, taskId: String) {
        request("POST", "$baseUrl/tasks/$taskId/complete", "{}")
    }

    /** `POST /captures` rồi `POST /captures/{id}/confirm`. Trả về số việc đã lưu. */
    fun captureAndConfirm(baseUrl: String, text: String, voice: Boolean): Int {
        val body = JSONObject().put("text", text).put("source", if (voice) "voice" else "text").toString()
        val capture = JSONObject(request("POST", "$baseUrl/captures", body))
        val confirmed = JSONObject(request("POST", "$baseUrl/captures/${capture.getString("id")}/confirm", "{}"))
        return confirmed.getJSONArray("tasks").length()
    }

    /** Kiểm tra server có sống không, trả về true nếu `/health` trả ok. */
    fun health(baseUrl: String): Boolean =
        JSONObject(request("GET", "$baseUrl/health")).optString("status") == "ok"

    private fun request(method: String, url: String, body: String? = null): String {
        val connection = URL(url).openConnection() as HttpURLConnection
        try {
            connection.requestMethod = method
            connection.connectTimeout = CONNECT_TIMEOUT_MS
            connection.readTimeout = READ_TIMEOUT_MS
            connection.setRequestProperty("Accept", "application/json")
            if (body != null) {
                connection.doOutput = true
                connection.setRequestProperty("Content-Type", "application/json; charset=utf-8")
                connection.outputStream.use { it.write(body.toByteArray(Charsets.UTF_8)) }
            }
            val code = connection.responseCode
            val stream = if (code in 200..299) connection.inputStream else connection.errorStream
            val text = stream?.bufferedReader(Charsets.UTF_8)?.use { it.readText() }.orEmpty()
            if (code !in 200..299) {
                throw ApiException(code, TopTaskParser.errorMessage(text) ?: "Lỗi $code từ máy chủ")
            }
            return text
        } finally {
            connection.disconnect()
        }
    }
}
