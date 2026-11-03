package com.showmeproduct.next

import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.IOException
import java.util.concurrent.TimeUnit

class ApiException(val code: Int, message: String) : IOException(message)

/**
 * Gọi HTTP chung cho mọi API. Phải gọi từ luồng nền, không gọi trên luồng giao diện.
 * Dùng OkHttp vì HttpURLConnection của Android không hỗ trợ phương thức PATCH.
 */
object ApiClient {
    private val JSON = "application/json; charset=utf-8".toMediaType()

    // Server miễn phí trên Render có thể mất 30 đến 60 giây để khởi động lần đầu.
    private val client: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(70, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .callTimeout(90, TimeUnit.SECONDS)
        .build()

    fun request(method: String, url: String, body: String? = null): String {
        val needsBody = method == "POST" || method == "PATCH" || method == "PUT"
        val requestBody = when {
            body != null -> body.toRequestBody(JSON)
            needsBody -> "".toRequestBody(JSON)
            else -> null
        }
        val request = Request.Builder()
            .url(url)
            .header("Accept", "application/json")
            .method(method, requestBody)
            .build()
        client.newCall(request).execute().use { response ->
            val text = response.body?.string().orEmpty()
            if (!response.isSuccessful) {
                throw ApiException(response.code, TopTaskParser.errorMessage(text) ?: "Lỗi ${response.code} từ máy chủ")
            }
            return text
        }
    }
}
