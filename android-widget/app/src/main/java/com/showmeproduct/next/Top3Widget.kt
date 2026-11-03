package com.showmeproduct.next

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.widget.RemoteViews
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Widget màn hình chính hiển thị 3 việc nên làm tiếp theo.
 * - Bấm nút tròn bên phải một việc để đánh dấu hoàn thành.
 * - Bấm nút làm mới ở góc để tải lại. Tự cập nhật theo chu kỳ trong `top3_widget_info.xml`.
 * - Bấm vào nội dung để mở app.
 * Khi mất mạng, widget vẫn hiện danh sách lần cập nhật gần nhất.
 */
class Top3Widget : AppWidgetProvider() {

    override fun onReceive(context: Context, intent: Intent) {
        when (intent.action) {
            ACTION_REFRESH, ACTION_COMPLETE, AppWidgetManager.ACTION_APPWIDGET_UPDATE -> {
                val pending = goAsync()
                val appContext = context.applicationContext
                val taskId = intent.getStringExtra(EXTRA_TASK_ID)
                val isComplete = intent.action == ACTION_COMPLETE
                Thread {
                    try {
                        if (isComplete && taskId != null) completeAndRefresh(appContext, taskId) else refresh(appContext)
                    } finally {
                        pending.finish()
                    }
                }.start()
            }
            else -> super.onReceive(context, intent)
        }
    }

    override fun onAppWidgetOptionsChanged(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int,
        newOptions: android.os.Bundle,
    ) {
        renderCached(context.applicationContext, Status.UPDATED)
    }

    private enum class Status { LOADING, UPDATED, OFFLINE }

    companion object {
        const val ACTION_REFRESH = "com.showmeproduct.next.ACTION_REFRESH"
        const val ACTION_COMPLETE = "com.showmeproduct.next.ACTION_COMPLETE"
        const val EXTRA_TASK_ID = "task_id"

        private const val SLOTS = 3
        private val ROW_IDS = intArrayOf(R.id.row1, R.id.row2, R.id.row3)
        private val BAR_IDS = intArrayOf(R.id.bar1, R.id.bar2, R.id.bar3)
        private val TITLE_IDS = intArrayOf(R.id.title1, R.id.title2, R.id.title3)
        private val SUB_IDS = intArrayOf(R.id.sub1, R.id.sub2, R.id.sub3)
        private val DONE_IDS = intArrayOf(R.id.done1, R.id.done2, R.id.done3)

        /** Gọi từ app để yêu cầu widget tải lại ngay. */
        fun requestRefresh(context: Context) {
            context.sendBroadcast(
                Intent(context, Top3Widget::class.java).setAction(ACTION_REFRESH),
            )
        }

        private fun refresh(context: Context) {
            val prefs = Prefs(context)
            renderCached(context, Status.LOADING)
            try {
                val tasks = Api.top(prefs, SLOTS)
                prefs.cachedTop = TopTaskParser.toJson(tasks)
                prefs.cachedAt = System.currentTimeMillis()
                renderCached(context, Status.UPDATED)
            } catch (_: Exception) {
                renderCached(context, Status.OFFLINE)
            }
        }

        private fun completeAndRefresh(context: Context, taskId: String) {
            val prefs = Prefs(context)
            // Ẩn việc vừa bấm ngay lập tức để người dùng thấy phản hồi, rồi mới gọi API.
            prefs.cachedTop?.let { json ->
                runCatching {
                    val remaining = TopTaskParser.parseCache(json).filterNot { it.id == taskId }
                    renderTasks(context, remaining, Status.LOADING, prefs.cachedAt)
                }
            }
            try {
                Api.complete(prefs, taskId)
            } catch (_: Exception) {
                renderCached(context, Status.OFFLINE)
                return
            }
            refresh(context)
        }

        private fun renderCached(context: Context, status: Status) {
            val prefs = Prefs(context)
            val tasks = prefs.cachedTop?.let { runCatching { TopTaskParser.parseCache(it) }.getOrNull() }
            renderTasks(context, tasks, status, prefs.cachedAt)
        }

        private fun renderTasks(context: Context, tasks: List<TopTask>?, status: Status, cachedAt: Long) {
            val manager = AppWidgetManager.getInstance(context)
            val ids = manager.getAppWidgetIds(ComponentName(context, Top3Widget::class.java))
            if (ids.isEmpty()) return

            val views = RemoteViews(context.packageName, R.layout.widget_top3)
            views.setTextViewText(R.id.status, statusText(context, status, cachedAt, tasks != null))
            views.setOnClickPendingIntent(R.id.btn_refresh, refreshIntent(context))
            views.setOnClickPendingIntent(R.id.widget_root, openAppIntent(context))

            val shown = tasks?.take(SLOTS).orEmpty()
            for (i in 0 until SLOTS) {
                val task = shown.getOrNull(i)
                if (task == null) {
                    views.setViewVisibility(ROW_IDS[i], android.view.View.GONE)
                    continue
                }
                views.setViewVisibility(ROW_IDS[i], android.view.View.VISIBLE)
                views.setTextViewText(TITLE_IDS[i], task.title)
                views.setTextViewText(
                    SUB_IDS[i],
                    DeadlineFormatter.format(task.deadline, hasTime = task.hasTime, floatingTime = task.floatingTime),
                )
                views.setInt(BAR_IDS[i], "setBackgroundColor", priorityColor(context, task.priority))
                views.setOnClickPendingIntent(DONE_IDS[i], completeIntent(context, task.id))
                views.setOnClickPendingIntent(TITLE_IDS[i], openAppIntent(context))
            }

            val empty = tasks != null && shown.isEmpty()
            views.setViewVisibility(R.id.empty, if (tasks == null || empty) android.view.View.VISIBLE else android.view.View.GONE)
            views.setTextViewText(
                R.id.empty,
                context.getString(if (empty) R.string.widget_empty else R.string.widget_no_data),
            )
            manager.updateAppWidget(ids, views)
        }

        private fun statusText(context: Context, status: Status, cachedAt: Long, hasData: Boolean): String = when (status) {
            Status.LOADING -> context.getString(R.string.widget_loading)
            Status.OFFLINE -> context.getString(
                if (hasData) R.string.widget_offline_cached else R.string.widget_offline,
            )
            Status.UPDATED -> context.getString(
                R.string.widget_updated_at,
                SimpleDateFormat("HH:mm", Locale.getDefault()).format(Date(if (cachedAt > 0) cachedAt else System.currentTimeMillis())),
            )
        }

        private fun priorityColor(context: Context, priority: String): Int = try {
            context.getColor(
                when (priority) {
                    "high" -> R.color.priority_high
                    "low" -> R.color.priority_low
                    else -> R.color.priority_medium
                },
            )
        } catch (_: Exception) {
            Color.GRAY
        }

        private fun refreshIntent(context: Context): PendingIntent {
            val intent = Intent(context, Top3Widget::class.java).setAction(ACTION_REFRESH)
            return PendingIntent.getBroadcast(context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        }

        private fun completeIntent(context: Context, taskId: String): PendingIntent {
            val intent = Intent(context, Top3Widget::class.java)
                .setAction(ACTION_COMPLETE)
                .setData(Uri.parse("next://complete/$taskId")) // để mỗi việc có PendingIntent riêng
                .putExtra(EXTRA_TASK_ID, taskId)
            return PendingIntent.getBroadcast(context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        }

        private fun openAppIntent(context: Context): PendingIntent {
            val intent = Intent(context, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            return PendingIntent.getActivity(context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        }
    }
}
