package com.showmeproduct.next

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.ZoneId
import java.time.ZonedDateTime

class ParsingTest {
    private val sample = """
        [
          {"task":{"id":"a1","title":"Họp nhóm","deadline":"2026-11-04T02:00:00.000Z","priority":"high",
                   "status":"todo","captureId":null,"createdAt":"x","updatedAt":"x","completedAt":null},
           "score":84.5,"reason":"Xếp trước vì deadline còn khoảng 19 giờ, mức ưu tiên cao."},
          {"task":{"id":"b2","title":"Mua sách","deadline":null,"priority":"low",
                   "status":"todo","captureId":null,"createdAt":"x","updatedAt":"x","completedAt":null},
           "score":5.0,"reason":"Xếp trước vì chưa có deadline, mức ưu tiên thấp."}
        ]
    """.trimIndent()

    @Test
    fun parsesTopTasks() {
        val tasks = TopTaskParser.parse(sample)
        assertEquals(2, tasks.size)
        assertEquals("Họp nhóm", tasks[0].title)
        assertEquals("high", tasks[0].priority)
        assertEquals(84.5, tasks[0].score, 0.001)
        assertNull(tasks[1].deadline)
    }

    @Test
    fun parsesEmptyList() {
        assertTrue(TopTaskParser.parse("[]").isEmpty())
    }

    @Test
    fun readsErrorMessage() {
        assertEquals("Không tìm thấy task", TopTaskParser.errorMessage("""{"message":"Không tìm thấy task","statusCode":404}"""))
        assertEquals("a; b", TopTaskParser.errorMessage("""{"message":["a","b"]}"""))
        assertNull(TopTaskParser.errorMessage("not json"))
    }

    // Thứ Ba 3/11/2026, 14:00 giờ Việt Nam
    private val now = ZonedDateTime.of(2026, 11, 3, 14, 0, 0, 0, ZoneId.of("Asia/Ho_Chi_Minh"))

    @Test
    fun formatsDeadlines() {
        assertEquals("Chưa có hạn", DeadlineFormatter.format(null, now))
        assertEquals("Hôm nay 20:00", DeadlineFormatter.format("2026-11-03T13:00:00.000Z", now))
        assertEquals("Ngày mai 09:00", DeadlineFormatter.format("2026-11-04T02:00:00.000Z", now))
        assertEquals("Thứ Sáu 23:59", DeadlineFormatter.format("2026-11-06T16:59:00.000Z", now))
        assertEquals("20/11 23:59", DeadlineFormatter.format("2026-11-20T16:59:00.000Z", now))
        assertEquals("Quá hạn 02/11", DeadlineFormatter.format("2026-11-02T10:00:00.000Z", now))
    }
}
