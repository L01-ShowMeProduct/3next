package com.showmeproduct.next

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.ZoneId
import java.time.ZonedDateTime

class ParsingTest {
    // API 3Next trong thư mục backend/: GET /tasks/top
    private val nextSample = """
        [
          {"task":{"id":"a1","title":"Họp nhóm","deadline":"2026-11-04T02:00:00.000Z","priority":"high",
                   "status":"todo","captureId":null,"createdAt":"x","updatedAt":"x","completedAt":null},
           "score":84.5,"reason":"Xếp trước vì deadline còn khoảng 19 giờ, mức ưu tiên cao."},
          {"task":{"id":"b2","title":"Mua sách","deadline":null,"priority":"low",
                   "status":"todo","captureId":null,"createdAt":"x","updatedAt":"x","completedAt":null},
           "score":5.0,"reason":"Xếp trước vì chưa có deadline, mức ưu tiên thấp."}
        ]
    """.trimIndent()

    // API nhóm đã deploy: GET /tasks?status=open&ranked=true (dữ liệu lấy từ server thật)
    private val teamSample = """
        {"tasks":[
          {"id":"e5b6fd21","title":"Nộp báo cáo nhóm","due":"2026-11-10T23:59:00.000Z","hasTime":false,
           "priority":"high","minutes":60,"status":"open","createdAt":"2026-11-03T07:46:39.984Z",
           "completedAt":null,"sourceId":"a677913e","manualOrder":null},
          {"id":"47957a8d","title":"Họp nhóm","due":"2026-11-04T09:00:00.000Z","hasTime":true,
           "priority":"medium","minutes":null,"status":"open","createdAt":"2026-11-03T07:46:57.845Z",
           "completedAt":null,"sourceId":"172112db","manualOrder":null},
          {"id":"3c","title":"Việc không hạn","due":null,"hasTime":false,"priority":"low","minutes":null,
           "status":"open","createdAt":"x","completedAt":null,"sourceId":null,"manualOrder":null},
          {"id":"4d","title":"Việc thứ tư","due":null,"hasTime":false,"priority":"low","minutes":null,
           "status":"open","createdAt":"x","completedAt":null,"sourceId":null,"manualOrder":null}
        ],"total":4}
    """.trimIndent()

    @Test
    fun parsesNextApiTopTasks() {
        val tasks = TopTaskParser.parseNext(nextSample)
        assertEquals(2, tasks.size)
        assertEquals("Họp nhóm", tasks[0].title)
        assertEquals("high", tasks[0].priority)
        assertEquals(84.5, tasks[0].score, 0.001)
        assertNull(tasks[1].deadline)
        assertFalse(tasks[0].floatingTime)
    }

    @Test
    fun parsesTeamApiAndKeepsOnlyTopN() {
        val tasks = TopTaskParser.parseTeam(teamSample, 3)
        assertEquals(3, tasks.size)
        assertEquals("Nộp báo cáo nhóm", tasks[0].title)
        assertFalse(tasks[0].hasTime)
        assertTrue(tasks[1].hasTime)
        assertNull(tasks[2].deadline)
        assertTrue(tasks.all { it.floatingTime })
    }

    @Test
    fun parsesEmptyLists() {
        assertTrue(TopTaskParser.parseNext("[]").isEmpty())
        assertTrue(TopTaskParser.parseTeam("""{"tasks":[],"total":0}""", 3).isEmpty())
    }

    @Test
    fun cacheRoundTripKeepsAllFields() {
        val original = TopTaskParser.parseTeam(teamSample, 3)
        val restored = TopTaskParser.parseCache(TopTaskParser.toJson(original))
        assertEquals(original, restored)
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
    fun formatsDeadlinesInLocalTime() {
        assertEquals("Chưa có hạn", DeadlineFormatter.format(null, now))
        assertEquals("Hôm nay 20:00", DeadlineFormatter.format("2026-11-03T13:00:00.000Z", now))
        assertEquals("Ngày mai 09:00", DeadlineFormatter.format("2026-11-04T02:00:00.000Z", now))
        assertEquals("Thứ Sáu 23:59", DeadlineFormatter.format("2026-11-06T16:59:00.000Z", now))
        assertEquals("20/11 23:59", DeadlineFormatter.format("2026-11-20T16:59:00.000Z", now))
        assertEquals("Quá hạn 02/11", DeadlineFormatter.format("2026-11-02T10:00:00.000Z", now))
    }

    @Test
    fun floatingTimeIsReadAsWrittenNotShiftedByTimeZone() {
        // API nhóm ghi "9h ngày mai" thành 09:00Z. Phải hiện 09:00, không phải 16:00.
        assertEquals("Ngày mai 09:00", DeadlineFormatter.format("2026-11-04T09:00:00.000Z", now, floatingTime = true))
        // Hạn chỉ có ngày (23:59Z) không được nhảy sang ngày hôm sau.
        assertEquals("Thứ Sáu", DeadlineFormatter.format("2026-11-06T23:59:00.000Z", now, hasTime = false, floatingTime = true))
        assertEquals("Hôm nay", DeadlineFormatter.format("2026-11-03T23:59:00.000Z", now, hasTime = false, floatingTime = true))
        assertEquals("Quá hạn 02/11", DeadlineFormatter.format("2026-11-02T23:59:00.000Z", now, hasTime = false, floatingTime = true))
    }
}
