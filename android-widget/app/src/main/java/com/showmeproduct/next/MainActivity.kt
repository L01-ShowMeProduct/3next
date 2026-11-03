package com.showmeproduct.next

import android.app.Activity
import android.appwidget.AppWidgetManager
import android.content.ActivityNotFoundException
import android.content.ComponentName
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.speech.RecognizerIntent
import android.view.View
import android.view.WindowInsets
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import java.util.Locale
import java.util.concurrent.Executors

/**
 * Màn hình cấu hình và demo: đặt địa chỉ API, ghi nhanh một câu (gõ hoặc nói),
 * xem Top 3 và thêm widget vào màn hình chính.
 */
class MainActivity : Activity() {
    private val io = Executors.newSingleThreadExecutor()
    private lateinit var prefs: Prefs

    private lateinit var serverUrl: EditText
    private lateinit var serverStatus: TextView
    private lateinit var captureText: EditText
    private lateinit var captureStatus: TextView
    private lateinit var topList: TextView

    /** Ghi nhận lần nhập hiện tại đến từ giọng nói hay bàn phím. */
    private var fromVoice = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        prefs = Prefs(this)
        applySystemBarInsets()

        serverUrl = findViewById(R.id.server_url)
        serverStatus = findViewById(R.id.server_status)
        captureText = findViewById(R.id.capture_text)
        captureStatus = findViewById(R.id.capture_status)
        topList = findViewById(R.id.top_list)
        serverUrl.setText(prefs.baseUrl)

        findViewById<Button>(R.id.btn_save).setOnClickListener { saveAndTestServer() }
        findViewById<Button>(R.id.btn_capture).setOnClickListener { capture() }
        findViewById<Button>(R.id.btn_voice).setOnClickListener { startVoice() }
        findViewById<Button>(R.id.btn_refresh).setOnClickListener { loadTop() }
        findViewById<Button>(R.id.btn_add_widget).setOnClickListener { pinWidget() }

        showCachedTop()
    }

    override fun onResume() {
        super.onResume()
        loadTop()
    }

    /** Android 15 trở lên vẽ app tràn viền, cần chừa chỗ cho thanh trạng thái và thanh điều hướng. */
    @Suppress("DEPRECATION")
    private fun applySystemBarInsets() {
        findViewById<View>(R.id.root).setOnApplyWindowInsetsListener { view, insets ->
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                val bars = insets.getInsets(WindowInsets.Type.systemBars() or WindowInsets.Type.ime())
                view.setPadding(bars.left, bars.top, bars.right, bars.bottom)
            } else {
                view.setPadding(
                    insets.systemWindowInsetLeft, insets.systemWindowInsetTop,
                    insets.systemWindowInsetRight, insets.systemWindowInsetBottom,
                )
            }
            insets
        }
    }

    override fun onDestroy() {
        io.shutdown()
        super.onDestroy()
    }

    private fun saveAndTestServer() {
        val url = serverUrl.text.toString().trim()
        if (url.isEmpty()) return
        serverStatus.setText(R.string.msg_loading)
        io.execute {
            val result = runCatching { Api.testConnection(url.trimEnd('/')) }
            runOnUiThread {
                result.onSuccess { kind ->
                    prefs.baseUrl = url
                    serverStatus.text = getString(R.string.msg_saved_ok, kind)
                    Top3Widget.requestRefresh(this)
                    loadTop()
                }.onFailure {
                    serverStatus.text = getString(R.string.msg_connect_failed, it.message ?: "máy chủ không trả lời đúng")
                }
            }
        }
    }

    private fun capture() {
        val text = captureText.text.toString().trim()
        if (text.isEmpty()) {
            captureStatus.setText(R.string.msg_enter_text)
            return
        }
        captureStatus.setText(R.string.msg_loading)
        val voice = fromVoice
        io.execute {
            val result = runCatching { Api.captureAndConfirm(prefs, text, voice) }
            runOnUiThread {
                result.onSuccess { count ->
                    captureStatus.text = getString(R.string.msg_captured, count)
                    captureText.text.clear()
                    fromVoice = false
                    Top3Widget.requestRefresh(this)
                    loadTop()
                }.onFailure {
                    captureStatus.text = getString(R.string.msg_capture_failed, it.message ?: "lỗi không rõ")
                }
            }
        }
    }

    @Suppress("DEPRECATION")
    private fun startVoice() {
        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH)
            .putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            .putExtra(RecognizerIntent.EXTRA_LANGUAGE, Locale.forLanguageTag("vi-VN").toLanguageTag())
        try {
            startActivityForResult(intent, REQUEST_VOICE)
        } catch (_: ActivityNotFoundException) {
            captureStatus.setText(R.string.msg_voice_unavailable)
        }
    }

    @Suppress("DEPRECATION", "OVERRIDE_DEPRECATION")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == REQUEST_VOICE && resultCode == RESULT_OK) {
            val spoken = data?.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS)?.firstOrNull()
            if (!spoken.isNullOrBlank()) {
                captureText.setText(spoken)
                captureText.setSelection(spoken.length)
                fromVoice = true
            }
        }
    }

    private fun showCachedTop() {
        val tasks = prefs.cachedTop?.let { runCatching { TopTaskParser.parseCache(it) }.getOrNull() }
        topList.text = if (tasks == null) getString(R.string.msg_loading) else formatTop(tasks)
    }

    private fun loadTop() {
        io.execute {
            val result = runCatching {
                val tasks = Api.top(prefs, 3)
                prefs.cachedTop = TopTaskParser.toJson(tasks)
                prefs.cachedAt = System.currentTimeMillis()
                tasks
            }
            runOnUiThread {
                result.onSuccess { topList.text = formatTop(it) }
                    .onFailure { topList.text = getString(R.string.msg_connect_failed, it.message ?: "lỗi không rõ") }
            }
        }
    }

    private fun formatTop(tasks: List<TopTask>): String =
        if (tasks.isEmpty()) {
            getString(R.string.msg_top_empty)
        } else {
            tasks.mapIndexed { i, t ->
                val due = DeadlineFormatter.format(t.deadline, hasTime = t.hasTime, floatingTime = t.floatingTime)
                "${i + 1}. ${t.title}\n    $due"
            }.joinToString("\n")
        }

    private fun pinWidget() {
        val manager = getSystemService(AppWidgetManager::class.java)
        if (manager != null && manager.isRequestPinAppWidgetSupported) {
            manager.requestPinAppWidget(ComponentName(this, Top3Widget::class.java), null, null)
            captureStatus.setText(R.string.msg_widget_pin_requested)
        } else {
            captureStatus.setText(R.string.msg_widget_pin_unsupported)
        }
    }

    private companion object {
        const val REQUEST_VOICE = 1001
    }
}
