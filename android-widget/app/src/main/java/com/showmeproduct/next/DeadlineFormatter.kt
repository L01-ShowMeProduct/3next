package com.showmeproduct.next

import java.time.Instant
import java.time.LocalDateTime
import java.time.ZoneOffset
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit

/** Biến hạn chót ISO 8601 thành chữ ngắn tiếng Việt để hiển thị trên widget. */
object DeadlineFormatter {
    private val DAY_NAMES = listOf("Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Chủ nhật")
    private val TIME = DateTimeFormatter.ofPattern("HH:mm")
    private val DATE = DateTimeFormatter.ofPattern("dd/MM")

    /**
     * @param hasTime false nếu hạn chót chỉ có ngày: khi đó không hiện giờ.
     * @param floatingTime true nếu API ghi giờ theo kiểu "giờ trần" (đọc theo UTC, không đổi múi giờ).
     */
    fun format(
        iso: String?,
        now: ZonedDateTime = ZonedDateTime.now(),
        hasTime: Boolean = true,
        floatingTime: Boolean = false,
    ): String {
        if (iso.isNullOrEmpty()) return "Chưa có hạn"
        val deadline: LocalDateTime = try {
            val instant = Instant.parse(iso)
            if (floatingTime) LocalDateTime.ofInstant(instant, ZoneOffset.UTC)
            else instant.atZone(now.zone).toLocalDateTime()
        } catch (_: Exception) {
            return "Chưa có hạn"
        }
        val nowLocal = now.toLocalDateTime()

        val overdue = if (hasTime) deadline.isBefore(nowLocal) else deadline.toLocalDate().isBefore(nowLocal.toLocalDate())
        if (overdue) return "Quá hạn ${deadline.format(DATE)}"

        val suffix = if (hasTime) " ${deadline.format(TIME)}" else ""
        val days = ChronoUnit.DAYS.between(nowLocal.toLocalDate(), deadline.toLocalDate())
        return when {
            days == 0L -> "Hôm nay$suffix"
            days == 1L -> "Ngày mai$suffix"
            days in 2..6 -> "${DAY_NAMES[deadline.dayOfWeek.value - 1]}$suffix"
            else -> "${deadline.format(DATE)}$suffix"
        }
    }
}
