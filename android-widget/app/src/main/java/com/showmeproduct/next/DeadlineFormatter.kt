package com.showmeproduct.next

import java.time.Instant
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit

/** Biến hạn chót ISO 8601 thành chữ ngắn tiếng Việt để hiển thị trên widget. */
object DeadlineFormatter {
    private val DAY_NAMES = listOf("Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Chủ nhật")
    private val TIME = DateTimeFormatter.ofPattern("HH:mm")
    private val DATE = DateTimeFormatter.ofPattern("dd/MM")

    fun format(iso: String?, now: ZonedDateTime = ZonedDateTime.now()): String {
        if (iso.isNullOrEmpty()) return "Chưa có hạn"
        val deadline = try {
            Instant.parse(iso).atZone(now.zone)
        } catch (_: Exception) {
            return "Chưa có hạn"
        }
        val time = deadline.format(TIME)
        if (deadline.isBefore(now)) return "Quá hạn ${deadline.format(DATE)}"
        val days = ChronoUnit.DAYS.between(now.toLocalDate(), deadline.toLocalDate())
        return when {
            days == 0L -> "Hôm nay $time"
            days == 1L -> "Ngày mai $time"
            days in 2..6 -> "${DAY_NAMES[deadline.dayOfWeek.value - 1]} $time"
            else -> "${deadline.format(DATE)} $time"
        }
    }
}
